// Nevada State Athletic Commission adapter (official source: boxing.nv.gov).
//
// Sources (reviewed 2026-09-13; docs/BOXING_SOURCE_ACQUISITION.md):
//   * results index  https://boxing.nv.gov/results/<YYYY>_Results/  — separate
//     Boxing / MMA / PowerSlap PDFs ("..._Boxing_REDACTED.pdf")
//   * professional calendar: the commission's public Google Calendar feed
//     embedded at https://boxing.nv.gov/schedule/Professional_Calendar/
//     (SUMMARY "PRO Boxing Event" | "PRO MMA Event" | "PowerSlap Event" ...)
//
// Only professional BOXING enters Boxing Core. A results document is accepted
// only when BOTH its filename marks it Boxing AND its own title reads
// "BOXING SHOW RESULTS" (the PowerSlap PDFs are titled "MIXED MARTIAL ARTS").
// Federal ID column items are dropped by position; Telephone and Ringside
// Doctors header lines are dropped; every string is scrubbed.

import { SPORT, assignBoutIds, classifySportLabel, displayName, finalizeParsed, slug } from './contract.mjs';
import { lines } from './pdf.mjs';
import { scrubText } from './minimize.mjs';

export const NEVADA = Object.freeze({
  key: 'nevada',
  sourceKey: 'nsac_nevada',
  version: 'nsac-nevada@1.0.2',
  // stored parses re-parsed by forward runs: 1.0.0/1.0.1 split "d/b/a" promoters and kept "& Name" officials
  supersedesParserVersions: [null, 'nsac-nevada@1.0.0', 'nsac-nevada@1.0.1'],
  jurisdiction: { code: 'US-NV', name: 'Nevada' },
  commission: { slug: 'nsac', name: 'Nevada State Athletic Commission', jurisdiction: 'Nevada', country_code: 'US' },
  base: 'https://boxing.nv.gov',
  calendarUrl: 'https://calendar.google.com/calendar/ical/kmvuar97kvumm2l7t9m6t4rpr0%40group.calendar.google.com/public/basic.ics',
  remote: { enabled: true, reason: 'official public results and calendar; robots.txt allows /results/ and /uploadedFiles/ (rights review 2026-09-13)' },
});

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const pad = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------------------
// discovery
// ---------------------------------------------------------------------------

export function resultsIndexUrl(year) { return `${NEVADA.base}/results/${year}_Results/`; }

export function sportFromNevadaFilename(file) {
  const f = file.toLowerCase();
  if (/(^|[_\s-])slap([_\s.-]|$)|powerslap/.test(f)) return SPORT.POWER_SLAP;
  if (/(^|[_\s-])mma([_\s.-]|$)/.test(f)) return SPORT.MMA;
  if (/(^|[_\s-])kick/.test(f)) return SPORT.KICKBOXING;
  if (/(^|[_\s-])boxing([_\s.-]|$)/.test(f)) return SPORT.BOXING;
  return SPORT.UNKNOWN;
}

export function parseResultsIndex(html, { year }) {
  const refs = [];
  const seen = new Set();
  for (const m of String(html).matchAll(/href="([^"]*\/results\/(\d{4})_Results\/([^"]+\.pdf))"/gi)) {
    const path = m[1].replace(/&amp;/g, '&');
    const file = decodeURIComponent(m[3]);
    if (seen.has(path)) continue;
    seen.add(path);
    const d = file.match(/^(\d{1,2})-(\d{1,2})-(\d{2})/);
    refs.push({
      doc_key: `nv-results:${m[2]}:${file.replace(/\.pdf$/i, '')}`,
      url: new URL(path, NEVADA.base).toString(),
      kind: 'results',
      sport_hint: sportFromNevadaFilename(file),
      event_date: d ? `20${d[3]}-${pad(d[1])}-${pad(d[2])}` : null,
      title: file,
      year: Number(m[2] ?? year),
    });
  }
  return refs;
}

// iCal (RFC 5545) — only the fields we use; HTML stripped from DESCRIPTION.
export function parseIcal(text) {
  const unfolded = String(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  return unfolded.split('BEGIN:VEVENT').slice(1).map((block) => {
    const body = block.split('END:VEVENT')[0];
    const get = (k) => {
      const m = body.match(new RegExp(`^${k}((?:;[^:\\r\\n]*)?):(.*)$`, 'm'));
      return m ? { params: m[1], value: m[2].trim().replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ') } : null;
    };
    return {
      uid: get('UID')?.value ?? null, dtstart: get('DTSTART'), summary: get('SUMMARY')?.value ?? '',
      location: get('LOCATION')?.value ?? '', description: (get('DESCRIPTION')?.value ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim(),
      status: get('STATUS')?.value ?? null, last_modified: get('LAST-MODIFIED')?.value ?? null,
    };
  });
}

function icalInstant(dt) {
  if (!dt) return { start_at: null, local_date: null };
  const v = dt.value;
  if (/^\d{8}$/.test(v)) return { start_at: null, local_date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return { start_at: null, local_date: null };
  if (m[7] === 'Z') {
    const start = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
    const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(start);
    return { start_at: start.toISOString(), local_date: local };
  }
  // floating/TZID local time: date is exact, instant is not asserted
  return { start_at: null, local_date: `${m[1]}-${m[2]}-${m[3]}` };
}

// Venue: first LOCATION segment; city: the segment before "NV 89xxx". Street
// addresses are never kept.
export function nevadaVenue(location) {
  const parts = String(location ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length || /^tbd$/i.test(parts[0])) return null;
  const stateIdx = parts.findIndex((p) => /^NV\b/.test(p));
  const city = stateIdx > 0 ? parts[stateIdx - 1] : parts.length === 2 ? parts[1] : null;
  return { name: parts[0], city: city && !/\d/.test(city) ? city : null, region: 'NV', country_code: 'US' };
}

export function promotersFromDescription(desc) {
  const m = String(desc ?? '').match(/^(.*?)\s+will\s+(?:co-)?promote/i);
  if (!m) return [];
  return m[1].split(/\s+(?:and|&)\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
}

// Results-sheet "Promoters:" line. Promoters are separated by "I", "|" or "/", but a
// "d/b/a" (doing business as) belongs to one promoter and is never a separator.
export function splitPromoters(raw) {
  const DBA = '~dba~';
  return String(raw ?? '').replace(/\bd\s*\/\s*b\s*\/\s*a\b\.?/gi, DBA)
    .split(/\s+[I|]\s+|\s*\/\s*/)
    .map((x) => x.replaceAll(DBA, 'd/b/a').replace(/[|\s]+$/, '').trim()).filter(Boolean);
}

// Header officials list ("Judges: A, B, C & D", "Referees: A & B"). "&" separates names
// exactly like a comma (nsac-nevada@1.0.0 kept "& Cory Santos" as a name); a generational
// suffix after a comma stays with its name.
export function splitOfficialNames(raw) {
  return String(raw ?? '').split(/\s*,\s*(?:&\s*)?|\s+&\s+/)
    .map((x) => x.trim().replace(/^&\s*/, '').replace(/,$/, '').replace(/(?<!\b(?:jr|sr))\.$/i, '').trim()).filter(Boolean)
    .reduce((acc, part) => { if (/^(jr|sr|ii|iii|iv)\.?$/i.test(part) && acc.length) acc[acc.length - 1] += `, ${part}`; else acc.push(part); return acc; }, []);
}

export function venueKey(name) {
  const stop = new Set(['the', 'at', 'of', 'las', 'vegas', 'reno', 'hotel', 'casino', 'resort', 'arena', 'center', 'centre', 'events', 'event', 'a', 'caesars', 'rewards', 'destination', 'collection', 'by', 'curio', 'hilton']);
  return slug(name).split('-').filter((t) => t && !stop.has(t));
}

export function parseCalendar(text, { now = new Date().toISOString(), capturedAt = now } = {}) {
  const events = [];
  const rejected = [];
  for (const e of parseIcal(text)) {
    const sport = classifySportLabel(e.summary);
    const { start_at: startAt, local_date: localDate } = icalInstant(e.dtstart);
    if (!localDate) { rejected.push({ reason: 'no_date', detail: { uid: e.uid } }); continue; }
    const professional = /\bpro\b/i.test(e.summary) && !/\bam(ateur)?\b/i.test(e.summary.replace(/pro\/am/i, 'am'));
    if (sport !== SPORT.BOXING || !professional) { rejected.push({ reason: `not_professional_boxing:${sport}`, detail: { uid: e.uid, summary: e.summary, date: localDate } }); continue; }
    const venue = nevadaVenue(e.location);
    events.push({
      source_key: NEVADA.sourceKey, jurisdiction: NEVADA.jurisdiction.code,
      source_event_id: `${localDate}|${venue ? venueKey(venue.name).join('-') || slug(venue.name) : 'tbd'}`,
      calendar_uid: e.uid, event_date: localDate, start_at: startAt, venue, promoters: promotersFromDescription(e.description),
      event_type_raw: e.summary, sport, professional: true, status: /cancel/i.test(`${e.status} ${e.summary}`) ? 'cancelled' : 'scheduled',
      broadcast: null, source_url: 'https://boxing.nv.gov/schedule/Professional_Calendar/', document_key: 'nv-calendar:professional',
      source_revision: e.last_modified, captured_at: capturedAt, description_raw: scrubText(e.description).slice(0, 300),
    });
  }
  return { events, rejected };
}

// ---------------------------------------------------------------------------
// results document
// ---------------------------------------------------------------------------

const DROP_HEADER = /^(telephone|ringside|physicians?|doctors?|medical|commission members|chairman|executive director|timekeepers|ring announcer|matchmakers|inspectors?)/i;
const nameTokens = (s) => slug(s).split('-').filter(Boolean);
const containsAll = (hay, needle) => needle.length > 0 && needle.every((t) => hay.includes(t));

function headerFields(page) {
  const tableTop = page.items.find((x) => x.s === 'Contestants')?.y ?? 0;
  const dateItem = page.items.find((x) => /^DATE:/.test(x.s));
  // right-hand header block only; the left block is commission members + phone
  const blockX = dateItem ? dateItem.x - 5 : 290;
  const ls = lines(page.items.filter((i) => i.y > tableTop + 8 && (i.x >= blockX || /SHOW RESULTS/.test(i.s))), { tolerance: 5 });
  const text = ls.map((l) => l.text);
  const all = text.join('\n');
  const title = text.find((t) => /SHOW RESULTS/.test(t)) ?? '';
  const dm = all.match(/DATE:\s*([A-Za-z]+)\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s*,?\s*(\d{4})/);
  const loc = all.match(/LOCATION:\s*([^\n]+)/);
  const list = (label) => {
    const i = text.findIndex((t) => t.startsWith(`${label}:`));
    if (i < 0) return [];
    let v = text[i].slice(label.length + 1);
    for (let j = i + 1; j < text.length && !/^[A-Z][A-Za-z ]+:/.test(text[j]); j++) v += ` ${text[j]}`;
    return splitOfficialNames(v.split(/\s+[I|]\s+[A-Z][A-Za-z ]+:/)[0].replace(/\s*\|\s*$/, ''));
  };
  const promoters = splitPromoters(all.match(/Promoters?:\s*([^\n]+?)(?:\s+Matchmakers?:.*)?(?:\n|$)/)?.[1]);
  const month = dm ? MONTHS[dm[1].toLowerCase()] : null;
  return {
    title,
    event_date: dm && month ? `${dm[3]}-${pad(month)}-${pad(dm[2])}` : null,
    location_raw: loc ? loc[1].trim() : null,
    referees: [...list('Referees'), ...list('Visiting Referee'), ...list('Visiting Referees')],
    judges: [...list('Judges'), ...list('Visiting Judges')],
    promoters,
    // header lines are kept only when they carry no medical/contact wording at all
    kept_header_lines: text.filter((t) => !DROP_HEADER.test(t) && !/physician|doctor|medical|telephone|phone|fax/i.test(t)).map(scrubText),
  };
}

function columnBounds(page) {
  const h = (label) => page.items.find((i) => i.s === label);
  const c = h('Contestants'); const r = h('Results'); const f = h('Federal ID'); const d = h('Rds'); const w = h('Weight'); const k = h('Remarks');
  if (!c || !r || !f || !d || !w || !k) return null;
  return { headerY: c.y, contestants: (c.x + r.x) / 2, fedLo: f.x - 12, rdsLo: d.x - 8, weightLo: w.x - 30, remarksLo: k.x - 75 };
}

const column = (b, x) => (x < b.contestants ? 'contestants' : x < b.fedLo ? 'results' : x < b.rdsLo ? 'federal_id' : x < b.weightLo ? 'rds' : x < b.remarksLo ? 'weight' : 'remarks');

export function parseResultLine(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  let m = t.match(/^(.+?)\s+won by\s+(unanimous|majority|split)\s+(technical\s+)?decision/i);
  if (m) return { outcome: 'win', winner_text: m[1], method: m[3] ? 'TECHNICAL_DECISION' : 'DECISION', decision_type: m[2].toLowerCase(), round: null, time_sec: null };
  m = t.match(/^(.+?)\s+won by\s+(technical\s+)?decision/i);
  if (m) return { outcome: 'win', winner_text: m[1], method: m[2] ? 'TECHNICAL_DECISION' : 'DECISION', decision_type: null, round: null, time_sec: null };
  m = t.match(/^(.+?)\s+won by\s+(TKO|KO|RTD|DQ|disqualification|retirement)\b(?:\s*\(?(\d{1,2}):(\d{2})\)?)?(?:\s*(?:of|in|at)?\s*(?:the\s+)?(?:end of\s+)?(?:round|rd\.?)\s*(\d{1,2}))?/i);
  if (m) {
    const kind = m[2].toUpperCase();
    const method = kind.startsWith('DISQ') ? 'DQ' : kind === 'RETIREMENT' ? 'RTD' : kind;
    return { outcome: 'win', winner_text: m[1], method, decision_type: null, round: m[5] ? Number(m[5]) : null, time_sec: m[3] ? Number(m[3]) * 60 + Number(m[4]) : null };
  }
  m = t.match(/^(unanimous|majority|split)?\s*(technical\s+)?draw/i);
  if (m) return { outcome: 'draw', winner_text: null, method: m[2] ? 'TECHNICAL_DECISION' : 'DECISION', decision_type: m[1] ? m[1].toLowerCase() : null, round: null, time_sec: null };
  if (/no contest/i.test(t)) {
    const r = t.match(/(?:round|rd\.?)\s*(\d{1,2})/i);
    return { outcome: 'no_contest', winner_text: null, method: 'NO_CONTEST', decision_type: null, round: r ? Number(r[1]) : null, time_sec: null };
  }
  return null;
}

function sideByName(text, a, b) {
  const t = nameTokens(text).filter((x) => x.length > 1);
  const inA = containsAll(nameTokens(a), t);
  const inB = containsAll(nameTokens(b), t);
  return inA && !inB ? 'a' : inB && !inA ? 'b' : null;
}

function resolveJudge(short, fullNames) {
  const key = slug(short).replace(/-/g, '');
  const hits = fullNames.filter((f) => slug(f).replace(/-/g, '').endsWith(key));
  return hits.length === 1 ? hits[0] : null;
}

function parseBoutBlock(items, bounds, header, ctx) {
  const cols = { contestants: [], results: [], rds: [], weight: [], remarks: [] };
  for (const it of items) {
    const c = column(bounds, it.x);
    if (c === 'federal_id') continue; // dropped: never leaves the parser
    cols[c].push({ ...it, s: scrubText(it.s) });
  }
  const vs = cols.contestants.find((i) => /vs\./i.test(i.s));
  if (!vs) return { problem: 'no_vs_line' };
  const side = (above) => {
    const ls = lines(cols.contestants.filter((i) => i !== vs && (above ? i.y > vs.y : i.y < vs.y)), { tolerance: 2 });
    if (!ls.length) return null;
    let hometown = null;
    const last = ls[ls.length - 1].text;
    if (ls.length > 1 && (/,/.test(last) || /[a-z]/.test(last))) { hometown = last; ls.pop(); }
    return { source_name: ls.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim(), hometown, top: ls[0].y };
  };
  const A = side(true);
  const B = side(false);
  if (!A?.source_name || !B?.source_name) return { problem: 'missing_contestant' };

  const rl = lines(cols.results, { tolerance: 2 }).map((l) => l.text).filter((t) => !/^PAGE\s+\d|RESULTS OF\s+[A-Z]/i.test(t));
  // "won by TKO at the end of round" + "5" on the next visual line
  for (let i = 0; i < rl.length - 1; i++) if (/\b(round|rd\.?)$/i.test(rl[i]) && /^\d{1,2}\b/.test(rl[i + 1])) { rl[i] = `${rl[i]} ${rl[i + 1]}`; rl.splice(i + 1, 1); }
  const resultIdx = rl.findIndex((t) => parseResultLine(t));
  const parsedResult = resultIdx >= 0 ? parseResultLine(rl[resultIdx]) : null;
  const orderLine = rl.find((t) => /^[A-ZÀ-Þ'. -]+\s+[–-]\s+[A-ZÀ-Þ'. -]+$/.test(t)) ?? null;
  const scoresIdx = rl.findIndex((t) => /^\d{1,3}\s*-\s*\d{1,3}(\s*;\s*\d{1,3}\s*-\s*\d{1,3})*$/.test(t));
  const judgesLine = scoresIdx >= 0 ? rl.slice(scoresIdx + 1).find((t) => !t.startsWith('*') && /^[A-Z][A-Za-z'. -]+(,\s*[A-Z][A-Za-z'. -]+)+$/.test(t)) ?? null : null;
  const titleRemarks = [];
  for (const t of rl) {
    if (t.startsWith('*')) titleRemarks.push(t.replace(/^\*+\s*/, ''));
    else if (titleRemarks.length && t !== judgesLine && t !== orderLine && !parseResultLine(t) && !/^\d/.test(t)) titleRemarks[titleRemarks.length - 1] += ` ${t}`;
  }

  let result = null;
  if (parsedResult) {
    const winnerSide = parsedResult.outcome === 'win' ? sideByName(parsedResult.winner_text, A.source_name, B.source_name) : null;
    result = { ...parsedResult, winner_side: winnerSide, result_raw: rl[resultIdx], resolved: parsedResult.outcome !== 'win' || winnerSide != null };
    delete result.winner_text;
  }

  let judges = [];
  if (scoresIdx >= 0 && orderLine) {
    const [left] = orderLine.split(/\s+[–-]\s+/);
    const leftSide = sideByName(left, A.source_name, B.source_name);
    const pairs = rl[scoresIdx].split(';').map((p) => p.trim().split(/\s*-\s*/).map(Number));
    const names = judgesLine ? judgesLine.split(',').map((s) => s.trim()) : [];
    if (leftSide && pairs.every((p) => p.length === 2 && p.every(Number.isFinite))) {
      judges = pairs.map(([x, y], i) => ({
        slot: i + 1,
        source_name: names[i] ?? null,
        name: names[i] ? resolveJudge(names[i], header.judges) ?? names[i] : null,
        a_total: leftSide === 'a' ? x : y,
        b_total: leftSide === 'a' ? y : x,
      }));
    }
  }

  const rounds = cols.rds.map((i) => Number(i.s)).find((n) => Number.isInteger(n)) ?? null;
  const weights = cols.weight.map((i) => ({ v: Number(i.s), y: i.y })).filter((w) => Number.isFinite(w.v));
  const weightFor = (s) => {
    const w = weights.filter((x) => Math.abs(x.y - s.top) === Math.min(...weights.map((z) => Math.abs(z.y - s.top))))[0];
    return w && Math.abs(w.y - s.top) <= 8 ? w.v : null;
  };
  const remarks = lines(cols.remarks, { tolerance: 2 }).map((l) => l.text);
  const referee = remarks.map((t) => t.match(/^Referee:\s*(.+)$/i)?.[1]).find(Boolean) ?? null;
  const deductions = remarks.map((t) => t.match(/^(.+?)\s*[–-]\s*(\d+)\s*points?\s*(?:for\s+(.+?))?\s*[–-]\s*R(?:ound|d\.?)?\s*(\d{1,2})$/i)).filter(Boolean)
    .map((m) => ({ side: sideByName(m[1], A.source_name, B.source_name), points: Number(m[2]), round: Number(m[4]), reason_raw: m[3] ?? null, raw: m[0] }));

  return {
    fighter_a: { source_name: A.source_name, display_name: displayName(A.source_name), hometown: A.hometown, weight_lb: weightFor(A) },
    fighter_b: { source_name: B.source_name, display_name: displayName(B.source_name), hometown: B.hometown, weight_lb: weightFor(B) },
    scheduled_rounds: rounds, result, judges, score_order_raw: orderLine, referee, deductions, title_remarks: titleRemarks,
    other_remarks: remarks.filter((t) => !/^Referee:/i.test(t) && !deductions.some((d) => d.raw === t)),
  };
}

// pages: extractPositionedText() output. ref: DocumentRef. ctx.calendarEvents:
// parseCalendar().events (links the results document to the scheduled event).
export function parseNevadaResults(ref, pages, { capturedAt = new Date().toISOString(), calendarEvents = [], sourceRevision = null } = {}) {
  const base = { doc_key: ref.doc_key, kind: 'results', events: [], bouts: [], rejected: [] };
  const hintSport = ref.sport_hint ?? sportFromNevadaFilename(ref.title ?? ref.url);
  const header = pages[0] ? headerFields(pages[0]) : { title: '' };
  const titleSport = /BOXING SHOW RESULTS/.test(header.title) ? SPORT.BOXING : /MIXED MARTIAL ARTS/.test(header.title) ? SPORT.MMA : classifySportLabel(header.title);
  const minimized = {
    title: header.title, event_date: header.event_date ?? null, location_raw: header.location_raw ?? null, promoters: header.promoters ?? [],
    officials: { referees: header.referees ?? [], judges: header.judges ?? [] }, header_lines: header.kept_header_lines ?? [],
    pages: [],
  };
  if (hintSport !== SPORT.BOXING || titleSport !== SPORT.BOXING) {
    return finalizeParsed({ ...base, minimized: { title: header.title }, classification: { sport: hintSport !== SPORT.BOXING ? hintSport : titleSport, professional: null, accepted: false,
      reason: `not boxing (filename=${hintSport}, title=${titleSport})` } });
  }
  if (!header.event_date) return finalizeParsed({ ...base, minimized, classification: { sport: SPORT.BOXING, professional: true, accepted: false, reason: 'no event date in document' } });

  const venueName = header.location_raw ? header.location_raw.split(',').slice(0, -1).join(',').trim() || header.location_raw : null;
  const venue = venueName ? { name: venueName, city: header.location_raw.split(',').at(-1).trim(), region: 'NV', country_code: 'US' } : null;
  // link to the calendar event: unique boxing event that date, else best unique venue overlap
  const sameDay = calendarEvents.filter((e) => e.event_date === header.event_date);
  let linked = sameDay.length === 1 ? sameDay[0] : null;
  if (!linked && sameDay.length > 1 && venue) {
    const k = venueKey(venue.name);
    const scored = sameDay.map((e) => ({ e, s: venueKey(e.venue?.name ?? '').filter((t) => k.includes(t)).length })).sort((x, y) => y.s - x.s);
    if (scored[0].s > 0 && scored[0].s > (scored[1]?.s ?? 0)) linked = scored[0].e;
  }
  const sourceEventId = linked?.source_event_id ?? `${header.event_date}|${venue ? venueKey(venue.name).join('-') || slug(venue.name) : 'unknown'}`;
  base.events.push({
    source_key: NEVADA.sourceKey, jurisdiction: NEVADA.jurisdiction.code, source_event_id: sourceEventId, calendar_uid: linked?.calendar_uid ?? null,
    event_date: header.event_date, start_at: linked?.start_at ?? null, venue: venue ?? linked?.venue ?? null,
    promoters: header.promoters.length ? header.promoters : linked?.promoters ?? [], event_type_raw: header.title, sport: SPORT.BOXING, professional: true,
    status: 'complete', broadcast: null, source_url: ref.url, document_key: ref.doc_key, source_revision: sourceRevision, captured_at: capturedAt,
    officials: { referees: header.referees, judges: header.judges },
  });

  let order = 0;
  for (const page of pages) {
    const bounds = columnBounds(page);
    if (!bounds) continue;
    const body = page.items.filter((i) => i.y < bounds.headerY - 5);
    const keptItems = body.filter((i) => column(bounds, i.x) !== 'federal_id').map((i) => ({ ...i, s: scrubText(i.s) })).filter((i) => i.s);
    minimized.pages.push({ page: page.page, items: keptItems });
    const anchors = body.filter((i) => column(bounds, i.x) === 'rds' && /^\d{1,2}$/.test(i.s.trim())).map((i) => i.y).sort((a, b) => b - a);
    const vsCount = body.filter((i) => column(bounds, i.x) === 'contestants' && /vs\./i.test(i.s)).length;
    if (anchors.length !== vsCount) {
      base.rejected.push({ reason: 'layout_uncertain', detail: { page: page.page, round_anchors: anchors.length, vs_lines: vsCount } });
      continue;
    }
    anchors.forEach((top, k) => {
      const bottom = anchors[k + 1] ?? -Infinity;
      const block = body.filter((i) => i.y <= top + 4 && i.y > bottom + 4);
      const parsed = parseBoutBlock(block, bounds, header);
      order += 1;
      if (parsed.problem) { base.rejected.push({ reason: parsed.problem, detail: { page: page.page, order } }); return; }
      base.bouts.push({
        source_key: NEVADA.sourceKey, source_event_id: sourceEventId,
        source_bout_id: null,
        bout_order: order, sport: SPORT.BOXING, professional: true, source_url: ref.url, source_revision: sourceRevision, ...parsed,
        provenance: { document_key: ref.doc_key, page: page.page },
      });
    });
  }
  assignBoutIds(base.bouts);
  return finalizeParsed({ ...base, minimized, classification: { sport: SPORT.BOXING, professional: true, accepted: true, reason: 'filename and title are boxing' } });
}
