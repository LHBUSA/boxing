// Official Video Desk: conservative entity resolution. Pure.
//
// Links a video to an event, bout and fighters only when the title names them
// unambiguously inside a +-45 day window of cards on verified record. Anything
// with two or more candidates becomes a review reason and is NOT attached.
// Sportsbook strings are never an input.

const DAY = 86_400_000;
export const WINDOW_DAYS = 45;
const STOP_SURNAMES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'de', 'la', 'del', 'los', 'las', 'van', 'von', 'boxing', 'promotions', 'fight', 'night', 'live', 'full', 'card', 'main', 'event']);

export const norm = (s) => String(s ?? '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[“”"'’‘]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const tokens = (s) => norm(s).split(' ').filter(Boolean);
const surname = (name) => {
  const t = tokens(name.replace(/[“"][^”"]*[”"]/g, ' ')).filter((x) => !STOP_SURNAMES.has(x));
  return t.length >= 2 ? t[t.length - 1] : null;
};
const containsPhrase = (haystack, phrase) => {
  const p = norm(phrase);
  return p.length > 0 && ` ${haystack} `.includes(` ${p} `);
};

/**
 * @param video   { title, published_at }
 * @param context { events: [{ id, date, venue_name, bouts: [{ id, fighters: [{ id, name }] }] }] }
 */
export function resolveVideo(video, context) {
  const title = norm(video.title);
  const published = Date.parse(video.published_at ?? '');
  const inWindow = (context.events ?? []).filter((e) => Number.isFinite(published) && Math.abs(Date.parse(`${e.date}T12:00:00Z`) - published) <= WINDOW_DAYS * DAY);
  const review = [];
  const method = {};

  // Bout: both corners' surnames (or full names) in the title, within the window.
  const boutHits = [];
  for (const e of inWindow) {
    for (const b of e.bouts ?? []) {
      if ((b.fighters ?? []).length !== 2) continue;
      const ok = b.fighters.every((f) => containsPhrase(title, f.name) || (surname(f.name)?.length >= 4 && containsPhrase(title, surname(f.name))));
      if (ok) boutHits.push({ event: e, bout: b });
    }
  }
  let event = null;
  let bout = null;
  if (boutHits.length === 1) {
    ({ event, bout } = boutHits[0]);
    method.bout = 'both_corners_named_in_title';
  } else if (boutHits.length > 1) {
    review.push({ reason: 'ambiguous_bout', candidates: boutHits.map((h) => h.bout.id) });
  }

  // Event by venue name when no bout decided it.
  if (!event && !review.length) {
    const venueHits = inWindow.filter((e) => e.venue_name && norm(e.venue_name).split(' ').length >= 2 && containsPhrase(title, e.venue_name));
    if (venueHits.length === 1) { event = venueHits[0]; method.event = 'venue_named_in_title'; }
    else if (venueHits.length > 1) review.push({ reason: 'multiple_events', candidates: venueHits.map((e) => e.id) });
  }
  if (event && !method.event) method.event = 'via_bout';

  // Fighters: full names only (multi-token), exactly one boxer carrying the name in scope.
  const scope = event ? event.bouts ?? [] : inWindow.flatMap((e) => e.bouts ?? []);
  const byName = new Map();
  for (const b of scope) for (const f of b.fighters ?? []) {
    if (tokens(f.name).length < 2 || !containsPhrase(title, f.name)) continue;
    const k = norm(f.name);
    if (!byName.has(k)) byName.set(k, new Set());
    byName.get(k).add(f.id);
  }
  const fighters = [];
  for (const [name, ids] of byName) {
    if (ids.size === 1) fighters.push([...ids][0]);
    else review.push({ reason: 'ambiguous_fighter_name', name, candidates: [...ids] });
  }
  if (bout) for (const f of bout.fighters) if (!fighters.includes(f.id)) fighters.push(f.id);

  const confidence = event && bout ? 'high' : event || fighters.length ? 'medium' : 'none';
  return {
    event_id: event?.id ?? null,
    bout_id: bout?.id ?? null,
    fighter_ids: fighters,
    confidence,
    link_status: review.length ? 'review' : confidence === 'none' ? 'review' : 'published',
    review_reason: review[0]?.reason ?? (confidence === 'none' ? 'no_entity_named' : null),
    review,
    method,
  };
}
