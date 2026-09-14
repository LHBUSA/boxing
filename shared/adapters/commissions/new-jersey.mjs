// New Jersey State Athletic Control Board adapter (official sources: njoag.gov, nj.gov/oag/sacb).
//
// Source (reviewed 2026-09-13): Event Schedule & Results page
//   https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/
// Each entry: date | RESULTS link or CANCELED | (event type) | promoter |
// promoter contact person | venue | city.
//
// Only "(pro boxing)" / "(pro/am boxing)" entries become boxing events;
// "(pro boxing bare knuckle)", kickboxing and MMA entries are rejected.
// The promoter contact person's name is not stored. Links on SACB pages to
// third-party record keepers (e.g. BoxRec) are never followed and never become
// sources.
//
// Result documents ("Show Results - Pro Boxing", parser nj-sacb-results@1.0.0)
// are line-based: header (title, date, venue, promoter) then one block per bout:
//   Bout #N - R Rounds - Division (lbs) [*title remark]
//   Name - ID# ST NNNNNN          <- the federal ID is never read past "ID#"
//   City, ST - 146.8 lbs.
//   VS
//   Name - ID# ...
//   City, ST - 146.6 lbs.
//   Name - Winner Unanimous Decision | TKO-3 0:48 | No Decision Round 3 3:00 (...)
//   Name - Suspension - 30 Days (15 Days No Contact) [reason]   <- duration only
//   Referee: X  Timekeeper: Y
//   Judges: A (60-53), B (59-54), C (60-53)
// Only facts matched by those patterns are kept. NOTE paragraphs (injury and
// hospital narratives), suspension reasons and no-contact periods, the officials
// page (physicians, inspectors) and every unmatched line are dropped.

import { SPORT, assignBoutIds, classifySportLabel, displayName, finalizeParsed, isAmateurLabel, slug } from './contract.mjs';
import { lines } from './pdf.mjs';
import { normalizedAlias } from '../../identity/normalize.mjs';

export const NEW_JERSEY = Object.freeze({
  key: 'new_jersey',
  sourceKey: 'nj_sacb',
  version: 'nj-sacb@1.1.1',
  // stored parses re-parsed by forward runs: 1.1.0 kept "& Name" judges and split "Jr. (57-57)"
  supersedesParserVersions: ['nj-sacb@1.1.0'],
  jurisdiction: { code: 'US-NJ', name: 'New Jersey' },
  commission: { slug: 'nj-sacb', name: 'New Jersey State Athletic Control Board', jurisdiction: 'New Jersey', country_code: 'US' },
  scheduleUrl: 'https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/',
  remote: { enabled: true, reason: 'official public schedule & results page; robots.txt allows /wp-content/uploads and /oag/sacb/results (rights review 2026-09-13)' },
  resultsParser: 'nj-sacb-results@1.0.0',
});

const OFFICIAL_HOSTS = new Set(['www.njoag.gov', 'njoag.gov', 'nj.gov', 'www.nj.gov']);

export function isOfficialNjUrl(url) {
  try {
    const u = new URL(url, NEW_JERSEY.scheduleUrl);
    // nj.gov robots.txt disallows /oag/secure-pdf/
    return OFFICIAL_HOSTS.has(u.hostname) && !u.pathname.startsWith('/oag/secure-pdf/');
  } catch { return false; }
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

// ---------------------------------------------------------------------------
// result documents
// ---------------------------------------------------------------------------

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const clean = (s) => String(s ?? '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const WEIGHT_LINE = /^(.*?)\s*-\s*(\d{2,3}(?:\.\d+)?)\s*lbs?\.?\s*$/i;

// "TKO-3 0:48", "Unanimous Decision", "KO-1 2:05", "RTD-4", "DQ-6", "Technical Decision-5 1:10"
export function parseNjMethod(raw) {
  const s = clean(raw);
  const stop = s.match(/\b(TKO|KO|RTD|DQ|TD)\s*-\s*(\d{1,2})\b/i);
  const clock = s.match(/\b(\d{1,2}):(\d{2})\b/);
  const round = stop ? Number(stop[2]) : (s.match(/\bround\s+(\d{1,2})\b/i) ? Number(s.match(/\bround\s+(\d{1,2})\b/i)[1]) : null);
  const time = clock ? Number(clock[1]) * 60 + Number(clock[2]) : null;
  const type = (s.toLowerCase().match(/unanimous|majority|split/) ?? [null])[0];
  if (/technical decision|\bTD\b/i.test(s)) return { method: 'TECHNICAL_DECISION', decision_type: type, round, time_sec: time };
  if (/decision/i.test(s)) return { method: 'DECISION', decision_type: type, round: null, time_sec: null };
  if (/disqualif|\bDQ\b/i.test(s)) return { method: 'DQ', decision_type: null, round, time_sec: time };
  if (/\bTKO\b|technical knockout/i.test(s)) return { method: 'TKO', decision_type: null, round, time_sec: time };
  if (/\bRTD\b|retire/i.test(s)) return { method: 'RTD', decision_type: null, round, time_sec: time };
  if (/\bKO\b|knockout/i.test(s)) return { method: 'KO', decision_type: null, round, time_sec: time };
  return null;
}

export function judgesOf(text) {
  const body = clean(text).replace(/^judges?:\s*/i, '');
  // "A (60-53), B (59-54) & C (60-53)" and "A, B, & C": "&" separates judges too.
  const parts = body.split(/\s*,\s*(?:&|and\s)?\s*|\s+&\s+/i).map((x) => x.trim()).filter(Boolean)
    .reduce((acc, part) => { if (/^(jr|sr|ii|iii|iv)\.?(\s*\(\d{1,3}\s*-\s*\d{1,3}\))?$/i.test(part) && acc.length) acc[acc.length - 1] += `, ${part}`; else acc.push(part); return acc; }, []);
  return parts.map((p, i) => {
    const m = p.match(/^(.*?)\s*\((\d{1,3})\s*-\s*(\d{1,3})\)\s*$/);
    const name = (m ? m[1] : p).trim();
    return { slot: i + 1, name, source_name: name, a_total: m ? Number(m[2]) : null, b_total: m ? Number(m[3]) : null };
  }).filter((j) => /[a-z]/i.test(j.name));
}

const nameOf = (line) => clean(line).split(/\s*-?\s*ID\s*#/i)[0].replace(/\s*-\s*$/, '').replace(/([“"])\s+/g, '$1').replace(/\s+([”"])/g, '$1').trim();

function header(allLines) {
  const title = allLines.find((l) => /show results?/i.test(l.text))?.text ?? null;
  const dateIdx = allLines.findIndex((l) => new RegExp(`^(${MONTHS.join('|')})\\s+\\d{1,2},\\s*\\d{4}$`, 'i').test(clean(l.text)));
  let eventDate = null;
  if (dateIdx >= 0) {
    const [, mon, day, yr] = clean(allLines[dateIdx].text).match(/^(\w+)\s+(\d{1,2}),\s*(\d{4})$/);
    eventDate = `${yr}-${String(MONTHS.indexOf(mon.toLowerCase()) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  let venue = null;
  const venueLine = dateIdx >= 0 ? clean(allLines[dateIdx + 1]?.text) : '';
  if (venueLine && !/^promoter\b|^bout #/i.test(venueLine)) {
    const parts = venueLine.split(',').map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 3) venue = { name: parts.slice(0, -2).join(', '), city: parts.at(-2), region: parts.at(-1), country_code: 'US' };
    else if (parts.length === 2) venue = { name: parts[0], city: parts[1], region: 'NJ', country_code: 'US' };
  }
  const promoter = allLines.map((l) => clean(l.text).match(/^promoter\s*-\s*(.+)$/i)?.[1]).find(Boolean) ?? null;
  return { title, event_date: eventDate, venue, promoter };
}

export function parseNjResults(ref, pages, { capturedAt = new Date().toISOString(), scheduleEvents = [], sourceRevision = null } = {}) {
  const base = { doc_key: ref.doc_key, kind: 'results', events: [], bouts: [], rejected: [] };
  const allLines = [];
  for (const p of pages) {
    for (const l of lines(p.items, { tolerance: 2 })) {
      const text = clean(l.text);
      // the officials page lists physicians and inspectors: nothing after it is read
      if (/^officials$/i.test(text)) break;
      allLines.push({ page: p.page, text });
    }
  }
  const h = header(allLines);
  const sport = classifySportLabel(h.title);
  const minimizedHeader = { title: h.title, event_date: h.event_date, venue: h.venue, promoter: h.promoter };
  if (sport !== SPORT.BOXING) {
    return finalizeParsed({ ...base, minimized: { header: { title: h.title, event_date: h.event_date } },
      classification: { sport, professional: true, accepted: false, reason: `document title "${h.title}" is not boxing` } });
  }
  if (!h.event_date) return finalizeParsed({ ...base, minimized: { header: minimizedHeader }, classification: { sport, professional: true, accepted: false, reason: 'no event date' } });

  const scheduled = scheduleEvents.filter((e) => e.event_date === h.event_date && (!h.venue?.city || slug(e.venue?.city) === slug(h.venue.city)));
  const sourceEventId = ref.source_event_id ?? (scheduled.length === 1 ? scheduled[0].source_event_id : `${h.event_date}|${slug(h.venue?.name) || 'unknown'}|${slug(h.venue?.city) || 'unknown'}`);
  base.events.push({
    source_key: NEW_JERSEY.sourceKey, jurisdiction: NEW_JERSEY.jurisdiction.code, source_event_id: sourceEventId, event_date: h.event_date, start_at: null,
    venue: h.venue, promoters: h.promoter ? [h.promoter] : [], event_type_raw: h.title, sport: SPORT.BOXING, professional: true, status: 'complete',
    broadcast: null, source_url: ref.url, document_key: ref.doc_key, source_revision: sourceRevision, captured_at: capturedAt,
  });

  // split into bout blocks
  const blocks = [];
  for (const l of allLines) {
    if (/^bout\s*#\s*\d+/i.test(l.text)) blocks.push([l]);
    else if (/^note\s*:/i.test(l.text)) blocks.at(-1)?.push({ ...l, note: true });
    else if (blocks.length) blocks.at(-1).push(l);
  }

  for (const block of blocks) {
    const head = block[0].text;
    const hm = head.match(/^bout\s*#\s*(\d+)\s*-?\s*(\d{1,2})\s*rounds?\s*-?\s*(.*)$/i);
    const order = Number(head.match(/#\s*(\d+)/)[1]);
    if (isAmateurLabel(head)) { base.rejected.push({ reason: 'amateur_bout', detail: { bout: order } }); continue; }
    const rest = hm ? hm[3] : '';
    const [divisionRaw, ...titleParts] = rest.split('*');
    // after a NOTE line every following line is narrative until the block ends
    const body = [];
    for (const l of block.slice(1)) { if (l.note) break; body.push(l.text); }
    const vs = body.findIndex((t) => /^vs\.?$/i.test(t));
    if (vs < 2) { base.rejected.push({ reason: 'layout_uncertain', detail: { bout: order } }); continue; }
    const aNameIdx = body.slice(0, vs).findIndex((t) => /ID\s*#/i.test(t));
    const bNameIdx = body.slice(vs + 1).findIndex((t) => /ID\s*#/i.test(t));
    const aHome = body[aNameIdx + 1]?.match(WEIGHT_LINE);
    const bHome = bNameIdx >= 0 ? body[vs + 1 + bNameIdx + 1]?.match(WEIGHT_LINE) : null;
    if (aNameIdx < 0 || bNameIdx < 0 || !aHome || !bHome) { base.rejected.push({ reason: 'layout_uncertain', detail: { bout: order } }); continue; }
    const A = { source_name: nameOf(body[aNameIdx]), hometown: aHome[1] || null, weight_lb: Number(aHome[2]) };
    const B = { source_name: nameOf(body[vs + 1 + bNameIdx]), hometown: bHome[1] || null, weight_lb: Number(bHome[2]) };
    if (!A.source_name || !B.source_name) { base.rejected.push({ reason: 'missing_contestant', detail: { bout: order } }); continue; }
    const tail = body.slice(vs + 1 + bNameIdx + 2);
    const sideOf = (name) => {
      const n = normalizedAlias(name);
      const hits = [['a', A], ['b', B]].filter(([, c]) => normalizedAlias(c.source_name) === n);
      return hits.length === 1 ? hits[0][0] : null;
    };

    let result = null;
    const suspensions = [];
    let referee = null;
    let judges = [];
    for (const t of tail) {
      let m;
      if ((m = t.match(/^(.+?)\s*-\s*winner\s+(.+)$/i))) {
        const method = parseNjMethod(m[2]);
        const side = sideOf(m[1]);
        result = method && side ? { outcome: 'win', winner_side: side, ...method, result_raw: clean(`Winner ${m[2]}`).replace(/\s*\(.*$/, ''), resolved: true }
          : { outcome: null, winner_side: null, ...(method ?? { method: null }), result_raw: clean(`Winner ${m[2]}`).replace(/\s*\(.*$/, ''), resolved: false, unresolved_reason: side ? 'method_unreadable' : 'winner_name_not_exactly_one_corner' };
      } else if ((m = t.match(/^(?:(unanimous|majority|split)\s+)?(technical\s+)?draw\b(.*)$/i))) {
        const method = parseNjMethod(t) ?? { method: m[2] ? 'TECHNICAL_DECISION' : 'DECISION', decision_type: m[1]?.toLowerCase() ?? null, round: null, time_sec: null };
        result = { outcome: m[2] ? 'technical_draw' : 'draw', winner_side: null, ...method, decision_type: m[1]?.toLowerCase() ?? method.decision_type, result_raw: clean(t).replace(/\s*\(.*$/, ''), resolved: true };
      } else if ((m = t.match(/^no (decision|contest)\b(.*)$/i))) {
        const round = t.match(/\bround\s+(\d{1,2})\b/i);
        const clock = t.match(/\b(\d{1,2}):(\d{2})\b/);
        result = { outcome: 'no_contest', winner_side: null, method: 'NO_CONTEST', decision_type: null, round: round ? Number(round[1]) : null,
          time_sec: clock ? Number(clock[1]) * 60 + Number(clock[2]) : null, result_raw: clean(t).replace(/\s*\(.*$/, ''), resolved: true };
      } else if ((m = t.match(/^(.+?)\s*-\s*suspension\b(.*)$/i))) {
        const side = sideOf(m[1]);
        const days = m[2].match(/(\d{1,3})\s*days?/i);
        const indefinite = /indefinite/i.test(m[2].split('(')[0]);
        // duration only: no-contact periods and reasons are medical detail
        if (side && (days || indefinite)) suspensions.push({ side, duration_days: indefinite ? null : Number(days[1]), indefinite, raw: indefinite ? 'Indefinite' : `${Number(days[1])} Days` });
      } else if ((m = t.match(/^referee:\s*(.+?)(?:\s+timekeeper:.*)?$/i))) {
        referee = m[1].trim();
      } else if (/^judges?:/i.test(t)) {
        judges = judgesOf(t);
      }
    }
    // score order: accepted as fighter_a-fighter_b only when the cards agree with the official decision
    let scoreOrder = null;
    const scored = judges.filter((j) => j.a_total != null && j.b_total != null);
    if (scored.length && result?.resolved && result.outcome === 'win' && result.method === 'DECISION') {
      const forWinner = scored.filter((j) => (result.winner_side === 'a' ? j.a_total > j.b_total : j.b_total > j.a_total)).length;
      if (forWinner * 2 > scored.length) scoreOrder = 'fighter_a-fighter_b (consistent with decision)';
    }
    if (!scoreOrder) judges = judges.map((j) => ({ ...j, a_total: null, b_total: null }));

    base.bouts.push({
      source_key: NEW_JERSEY.sourceKey, source_event_id: sourceEventId, source_bout_id: null, bout_order: order, sport: SPORT.BOXING, professional: true,
      fighter_a: { source_name: A.source_name, display_name: displayName(A.source_name), hometown: A.hometown, weight_lb: A.weight_lb, corner: null },
      fighter_b: { source_name: B.source_name, display_name: displayName(B.source_name), hometown: B.hometown, weight_lb: B.weight_lb, corner: null },
      scheduled_rounds: hm ? Number(hm[2]) : null, division_raw: clean(divisionRaw) || null, result, referee, judges, score_order_raw: scoreOrder,
      deductions: [], title_remarks: titleParts.length ? [clean(titleParts.join('*'))] : [], suspensions, debut: { a: null, b: null },
      source_url: ref.url, source_revision: sourceRevision, provenance: { document_key: ref.doc_key, page: block[0].page, bout_number: String(order) },
    });
  }
  assignBoutIds(base.bouts);
  return finalizeParsed({ ...base, minimized: { header: minimizedHeader, bouts: base.bouts.length },
    classification: { sport: SPORT.BOXING, professional: true, accepted: base.bouts.length > 0, reason: base.bouts.length ? 'title is pro boxing; bouts parsed' : 'no bout parsed' } });
}
