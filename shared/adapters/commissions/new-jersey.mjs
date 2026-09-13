// New Jersey State Athletic Control Board adapter (official source: njoag.gov).
//
// Source (reviewed 2026-09-13): Event Schedule & Results page
//   https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/
// Each entry: date | RESULTS link or CANCELED | (event type) | promoter |
// promoter contact person | venue | city.
//
// Only "(pro boxing)" / "(pro/am boxing)" entries become boxing events;
// "(pro boxing bare knuckle)", kickboxing and MMA entries are rejected.
// The promoter contact person's name is not stored. Result PDF parsing is not
// built yet: result documents are registered (status parser_pending), not parsed.
// Links on SACB pages to third-party record keepers (e.g. BoxRec) are never
// followed and never become sources.

import { SPORT, classifySportLabel, finalizeParsed, slug } from './contract.mjs';

export const NEW_JERSEY = Object.freeze({
  key: 'new_jersey',
  sourceKey: 'nj_sacb',
  version: 'nj-sacb@1.0.0',
  jurisdiction: { code: 'US-NJ', name: 'New Jersey' },
  commission: { slug: 'nj-sacb', name: 'New Jersey State Athletic Control Board', jurisdiction: 'New Jersey', country_code: 'US' },
  scheduleUrl: 'https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/',
  remote: { enabled: true, reason: 'official public schedule & results page; robots.txt allows (rights review 2026-09-13)' },
  resultsParser: null,
});

const OFFICIAL_HOSTS = new Set(['www.njoag.gov', 'njoag.gov', 'nj.gov', 'www.nj.gov']);

export function isOfficialNjUrl(url) {
  try { return OFFICIAL_HOSTS.has(new URL(url, NEW_JERSEY.scheduleUrl).hostname); } catch { return false; }
}

const decode = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function parseNjSchedule(html, { capturedAt = new Date().toISOString() } = {}) {
  const events = [];
  const rejected = [];
  const documents = [];
  const year = (String(html).match(/<h3>(\d{4})<\/h3>/) ?? [])[1] ?? null;
  for (const m of String(html).matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const inner = m[1];
    const dm = decode(inner).match(/^(\d{2})\.(\d{2})\.(\d{2})\b/);
    if (!dm) continue;
    const date = `20${dm[3]}-${dm[1]}-${dm[2]}`;
    const link = inner.match(/<a[^>]+href="([^"]+)"[^>]*>\s*RESULTS\s*<\/a>/i)?.[1] ?? null;
    const cancelled = /CANCELED|CANCELLED/i.test(decode(inner).split('(')[0]);
    const parts = inner.split(/<br\s*\/?>/i).map(decode).filter(Boolean);
    const typeIdx = parts.findIndex((p) => /^\(.*\)$/.test(p));
    const typeRaw = typeIdx >= 0 ? parts[typeIdx].slice(1, -1) : null;
    const after = typeIdx >= 0 ? parts.slice(typeIdx + 1) : [];
    // after type: promoter, contact person (not stored), venue, city
    const [promoter, , venueName, city] = after;
    const sport = classifySportLabel(typeRaw);
    const professional = /\bpro\b/i.test(typeRaw ?? '');
    const detail = { date, type: typeRaw, promoter: promoter ?? null };
    if (sport !== SPORT.BOXING || !professional) { rejected.push({ reason: `not_professional_boxing:${sport}`, detail }); continue; }
    const sourceEventId = `${date}|${slug(venueName) || 'unknown'}|${slug(city) || 'unknown'}`;
    const officialLink = link && isOfficialNjUrl(link) ? new URL(link, NEW_JERSEY.scheduleUrl).toString() : null;
    if (link && !officialLink) rejected.push({ reason: 'third_party_link_ignored', detail: { ...detail, host: (() => { try { return new URL(link).hostname; } catch { return null; } })() } });
    events.push({
      source_key: NEW_JERSEY.sourceKey, jurisdiction: NEW_JERSEY.jurisdiction.code, source_event_id: sourceEventId, event_date: date, start_at: null,
      venue: venueName ? { name: venueName, city: city ?? null, region: 'NJ', country_code: 'US' } : null, promoters: promoter ? [promoter] : [],
      event_type_raw: typeRaw, sport, professional: true, amateur_bouts_on_card: /pro\/am/i.test(typeRaw ?? ''),
      status: cancelled ? 'cancelled' : officialLink ? 'complete' : 'scheduled', broadcast: null, source_url: NEW_JERSEY.scheduleUrl,
      document_key: 'nj-schedule', source_revision: year, captured_at: capturedAt, results_document_url: officialLink,
    });
    if (officialLink) documents.push({ doc_key: `nj-results:${officialLink.split('/').pop().replace(/\.pdf$/i, '')}`, url: officialLink, kind: 'results', sport_hint: sport, event_date: date, source_event_id: sourceEventId });
  }
  return finalizeParsed({ doc_key: 'nj-schedule', kind: 'schedule', events, bouts: [], rejected, documents, minimized: { year, entries: events.length },
    classification: { sport: SPORT.BOXING, professional: true, accepted: events.length > 0, reason: 'schedule page' } });
}
