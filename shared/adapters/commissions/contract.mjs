// Jurisdiction-independent commission adapter contract.
//
// Every commission adapter (nevada.mjs, florida.mjs, new-jersey.mjs, texas.mjs)
// implements:
//
//   {
//     key, sourceKey, version,
//     jurisdiction: { code: 'US-NV', name },
//     commission: { slug, name, jurisdiction, country_code },
//     remote: { enabled: boolean, reason },          // automation gate (rights/robots)
//     discover({ fetchText, now }) -> DocumentRef[]  // listing pages / feeds
//     parse(ref, content) -> ParsedDocument          // content: { text } | { pages }
//   }
//
// DocumentRef   { doc_key, url, kind: 'results'|'schedule', sport_hint, event_date?, title? }
// ParsedDocument {
//   doc_key, kind, classification: { sport, professional, accepted, reason },
//   events: EventObservation[], bouts: BoutObservation[], rejected: [{ reason, detail }],
//   minimized: <persistable source-native representation, no sensitive columns>
// }
//
// Observations carry ONLY what the source states. Missing is null, never guessed.

import { assertMinimized } from './minimize.mjs';

export const SPORT = Object.freeze({
  BOXING: 'boxing', MMA: 'mma', POWER_SLAP: 'power_slap', BARE_KNUCKLE: 'bare_knuckle', KICKBOXING: 'kickboxing',
  MUAY_THAI: 'muay_thai', KARATE_COMBAT: 'karate_combat', OTHER: 'other', UNKNOWN: 'unknown',
});

// Normalizes a source-native sport label. Bare-knuckle, slap, kick and MMA
// labels are checked BEFORE plain "box", because "Bare Knuckle Boxing" and
// "Kickboxing" contain the word.
export function classifySportLabel(label) {
  const t = String(label ?? '').toLowerCase().replace(/[^a-z/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return SPORT.UNKNOWN;
  if (/\bbare\b|\bknuckle\b|\bbkfc\b/.test(t)) return SPORT.BARE_KNUCKLE;
  if (/\bslap\b|powerslap/.test(t)) return SPORT.POWER_SLAP;
  if (/kick ?box|\bkb\b/.test(t)) return SPORT.KICKBOXING;
  if (/muay/.test(t)) return SPORT.MUAY_THAI;
  if (/karate/.test(t)) return SPORT.KARATE_COMBAT;
  if (/\bmma\b|mixed martial|\bamma\b/.test(t)) return SPORT.MMA;
  if (/combination|combo/.test(t)) return SPORT.OTHER;
  if (/\bbox(ing)?\b|\bbxg\b/.test(t)) return SPORT.BOXING;
  return SPORT.OTHER;
}

export function isAmateurLabel(label) {
  return /\bam(ateur)?\b|\bamma\b|pro\/am/i.test(String(label ?? '')) && !/^pro\b(?!\/am)/i.test(String(label ?? '').trim());
}

const req = (o, keys, where) => keys.filter((k) => o?.[k] == null || o[k] === '').map((k) => `${where}: missing ${k}`);

export function validateEventObservation(e) {
  const p = req(e, ['source_key', 'jurisdiction', 'source_event_id', 'event_date', 'sport', 'source_url', 'captured_at'], 'event');
  if (e?.event_date && !/^\d{4}-\d{2}-\d{2}$/.test(e.event_date)) p.push('event: event_date must be YYYY-MM-DD');
  if (e?.sport && !Object.values(SPORT).includes(e.sport)) p.push(`event: unknown sport ${e.sport}`);
  return p;
}

export function validateBoutObservation(b) {
  const p = req(b, ['source_key', 'source_event_id', 'source_bout_id', 'sport', 'source_url'], 'bout');
  for (const side of ['a', 'b']) {
    if (!b?.[`fighter_${side}`]?.display_name) p.push(`bout ${b?.source_bout_id}: fighter_${side}.display_name missing`);
  }
  if (b?.scheduled_rounds != null && !(Number.isInteger(b.scheduled_rounds) && b.scheduled_rounds >= 1 && b.scheduled_rounds <= 45)) p.push(`bout ${b.source_bout_id}: scheduled_rounds out of range`);
  return p;
}

// Event:
//   { source_key, jurisdiction, source_event_id, event_date, start_at?, venue?: {name, city, region, country_code},
//     promoters: [], event_type_raw, sport, professional, status?, broadcast?, source_url, document_key?,
//     source_revision?, captured_at, observation_id? }
// Bout:
//   { source_key, source_event_id, source_bout_id, bout_order?, sport, professional,
//     fighter_a: { display_name, source_name, hometown?, weight_lb?, corner? }, fighter_b: {...},
//     scheduled_rounds?, result?: { outcome, winner_side, method, method_raw, decision_type, round, time_sec, result_raw },
//     referee?: name, judges?: [{ name, source_name, a_total, b_total, slot }], score_order_raw?,
//     deductions?: [{ side, points, round, reason_raw }], title_remarks?: [text], suspensions?: [{ side, duration_days, raw }],
//     source_url, source_revision?, provenance?: {...} }
export function finalizeParsed(parsed) {
  const problems = [...parsed.events.flatMap(validateEventObservation), ...parsed.bouts.flatMap(validateBoutObservation)];
  assertMinimized({ events: parsed.events, bouts: parsed.bouts, minimized: parsed.minimized });
  return { ...parsed, problems };
}

// Title-cases an ALL-CAPS legal name for display, keeping the source form.
export function displayName(sourceName) {
  const s = String(sourceName ?? '').replace(/[‘`]/g, '’').replace(/\s+/g, ' ').trim();
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s'‘’"“(-])([a-zÀ-ɏ])/g, (m, p, c) => p + c.toUpperCase())
    .replace(/\b(Jr|Sr)\b\.?/g, '$1.').replace(/\b(Ii|Iii|Iv)\b/g, (m) => m.toUpperCase()).replace(/\bMc([a-z])/g, (m, c) => `Mc${c.toUpperCase()}`);
}

// Source-native bout ids. The same two boxers can meet more than once on one
// card (e.g. team-league formats): the first meeting keeps
// "<event>|<a>|<b>", later meetings in document order get "|2", "|3" ...
export function assignBoutIds(bouts, sourceEventIdOf = (b) => b.source_event_id) {
  const seen = new Map();
  for (const b of bouts) {
    const a = slug(b.fighter_a.source_name);
    const c = slug(b.fighter_b.source_name);
    const key = `${sourceEventIdOf(b)}|${[a, c].sort().join('|')}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    b.source_bout_id = `${sourceEventIdOf(b)}|${a}|${c}${n > 1 ? `|${n}` : ''}`;
    if (n > 1) b.repeat_pairing_index = n;
  }
  return bouts;
}

export const slug = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
