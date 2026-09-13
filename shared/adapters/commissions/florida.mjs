// Florida Athletic Commission adapter (official source: www2.myfloridalicense.com, DBPR).
//
// Sources (reviewed 2026-09-13; docs/BOXING_SOURCE_ACQUISITION.md):
//   * upcoming professional events  /athletic-commission/commission-upcoming-events-professional/
//     rows: date | weekday | city | type (Box | MMA ...) | promoter
//   * professional event results     /athletic-commission/commission-event-results-professional/
//     links to "..._results_without_med.pdf" match-result sheets (no sport label on the listing)
//
// The commission also regulates MMA, kickboxing, bare-knuckle, Karate Combat,
// so a listing row or a document is NOT boxing because it is on the page:
//   * upcoming rows: type must be "Box" AND the promoter/row must not be a
//     bare-knuckle or other non-boxing brand (BKFC is listed as "Box")
//   * result documents: header "Event Type" must classify as boxing AND each
//     bout's Sport cell must be boxing; everything else is rejected.
// DOB and Federal ID columns and the Ringside Physicians header block are
// dropped by position before anything leaves the parser. Medical data is never read.

import { SPORT, assignBoutIds, classifySportLabel, displayName, finalizeParsed, slug } from './contract.mjs';
import { lines } from './pdf.mjs';
import { scrubText } from './minimize.mjs';

export const FLORIDA = Object.freeze({
  key: 'florida',
  sourceKey: 'florida_athletic_commission',
  version: 'florida-athletic-commission@1.0.1',
  jurisdiction: { code: 'US-FL', name: 'Florida' },
  commission: { slug: 'fl-athletic-commission', name: 'Florida Athletic Commission', jurisdiction: 'Florida', country_code: 'US' },
  base: 'https://www2.myfloridalicense.com',
  upcomingUrl: 'https://www2.myfloridalicense.com/athletic-commission/commission-upcoming-events-professional/',
  resultsUrl: 'https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/',
  remote: { enabled: true, reason: 'official public listings and result sheets; robots.txt allows /athletic-commission/ and /pro/sbc/documents/ (rights review 2026-09-13)' },
});

const pad = (n) => String(n).padStart(2, '0');
const NON_BOXING_BRANDS = /\b(bkfc|bare[\s-]*knuckle|knuckle|karate combat|power ?slap|slap fighting|kickbox\w*|muay thai|mma|pfl|ufc|cffc|combat collective)\b/i;
// file names use _ and - between words; \b would not split "Synthetic_MMA"
const brandText = (s) => String(s ?? '').replace(/[_-]+/g, ' ');

export function floridaEventKey(date, city, promoter) {
  return `${date}|${slug(String(city ?? '').split(',')[0]) || 'unknown'}|${slug(promoter).split('-').slice(0, 3).join('-') || 'unknown'}`;
}

// ---------------------------------------------------------------------------
// upcoming listing
// ---------------------------------------------------------------------------

export function parseUpcoming(html, { capturedAt = new Date().toISOString() } = {}) {
  const text = String(html).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' | ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '-').replace(/\s+/g, ' ');
  const cells = text.split('|').map((c) => c.trim()).filter(Boolean);
  const events = [];
  const rejected = [];
  for (let i = 0; i + 4 < cells.length; i++) {
    const m = cells[i].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m || !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(cells[i + 1])) continue;
    const [date, , city, type, promoter] = [`${m[3]}-${m[1]}-${m[2]}`, cells[i + 1], cells[i + 2], cells[i + 3], cells[i + 4]];
    const typeSport = /^box$/i.test(type) ? SPORT.BOXING : classifySportLabel(type);
    const brandSport = NON_BOXING_BRANDS.test(brandText(promoter)) ? classifySportLabel(brandText(promoter)) : null;
    if (typeSport !== SPORT.BOXING || (brandSport && brandSport !== SPORT.BOXING)) {
      rejected.push({ reason: `not_professional_boxing:${brandSport && brandSport !== SPORT.BOXING ? brandSport : typeSport}`, detail: { date, city, type, promoter } });
      i += 4;
      continue;
    }
    events.push({
      source_key: FLORIDA.sourceKey, jurisdiction: FLORIDA.jurisdiction.code, source_event_id: floridaEventKey(date, city, promoter),
      event_date: date, start_at: null, venue: { name: null, city: city.split(',')[0].trim(), region: 'FL', country_code: 'US' }, promoters: [promoter],
      event_type_raw: type, sport: SPORT.BOXING, professional: true, status: 'scheduled', broadcast: null, source_url: FLORIDA.upcomingUrl,
      document_key: 'fl-upcoming:professional', source_revision: null, captured_at: capturedAt,
    });
    i += 4;
  }
  return { events, rejected };
}

// ---------------------------------------------------------------------------
// results listing
// ---------------------------------------------------------------------------

export function parseResultsListing(html) {
  const refs = [];
  const seen = new Set();
  for (const m of String(html).matchAll(/<a[^>]+href="([^"]*\/pro\/sbc\/documents\/([^"]+\.pdf))"[^>]*>(.*?)<\/a>/gis)) {
    const url = m[1].replace(/&amp;/g, '&');
    if (seen.has(url)) continue;
    seen.add(url);
    const file = decodeURIComponent(m[2]).replace(/&amp;/g, '&');
    const label = m[3].replace(/<[^>]+>/g, '').replace(/&#8211;|&ndash;/g, '-').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const d = file.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    const year = d ? (d[3].length === 2 ? `20${d[3]}` : d[3]) : null;
    refs.push({
      doc_key: `fl-results:${file.replace(/\.pdf$/i, '')}`, url: new URL(url, FLORIDA.base).toString(), kind: 'results',
      // the listing has no sport label; a non-boxing brand in the file name is a hint only, the document decides
      sport_hint: NON_BOXING_BRANDS.test(brandText(`${file} ${label}`)) ? classifySportLabel(brandText(`${file} ${label}`)) : SPORT.UNKNOWN,
      event_date: d ? `${year}-${pad(d[1])}-${pad(d[2])}` : null, title: label || file,
    });
  }
  return refs;
}

// ---------------------------------------------------------------------------
// match-result sheet
// ---------------------------------------------------------------------------

function headerOf(page) {
  const top = page.items.find((i) => i.s === 'Bout')?.y ?? 0;
  const byText = (re) => page.items.find((i) => i.y > top && re.test(i.s))?.s ?? null;
  const date = byText(/^Event Date:/)?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const venue = byText(/^Location \/ Venue:/)?.replace(/^Location \/ Venue:\s*/, '') ?? null;
  const [cityState, ...venueParts] = venue ? venue.split(' / ') : [];
  return {
    event_date: date ? `${date[3]}-${pad(date[1])}-${pad(date[2])}` : null,
    event_type_raw: byText(/^Event Type:/)?.replace(/^Event Type:\s*/, '').replace(/\s*-\s*/g, '-').trim() ?? null,
    promoter: byText(/^Promoter:/)?.replace(/^Promoter:\s*/, '').trim() ?? null,
    city: cityState ? cityState.split(',')[0].trim() : null,
    region: cityState?.split(',')[1]?.trim() ?? null,
    venue_name: venueParts.join(' / ').trim() || null,
  };
}

function bounds(page) {
  const h = (s) => page.items.find((i) => i.s === s)?.x;
  const need = { corner: h('Corner'), sport: h('Sport'), name: h('Participant Name'), home: h('Hometown'), dob: h('DOB'), weight: h('Weight'), schd: h('Schd'),
    result: h('Result'), decision: h('Decision'), round: h('Round &'), officials: h('Officials'), notes: h('Notes'), susp: h('Suspension') };
  if (Object.values(need).some((v) => v == null)) return null;
  return {
    headerY: page.items.find((i) => i.s === 'Bout').y,
    cols: [
      ['bout', -Infinity, need.corner - 4], ['corner', need.corner - 4, need.sport - 6], ['sport', need.sport - 6, need.name - 47],
      ['name', need.name - 47, need.home - 8], ['hometown', need.home - 8, need.dob - 12], ['private', need.dob - 12, need.weight - 24],
      ['note', need.weight - 24, need.weight - 3], ['weight', need.weight - 3, need.schd + 2], ['rounds', need.schd + 2, need.result - 1],
      ['result', need.result - 1, need.decision - 12], ['decision', need.decision - 12, need.round - 2], ['round_time', need.round - 2, need.officials - 60],
      ['officials', need.officials - 60, need.notes - 8], ['notes', need.notes - 8, need.susp - 6], ['suspension', need.susp - 6, Infinity],
    ],
  };
}

const colOf = (b, x) => b.cols.find(([, lo, hi]) => x >= lo && x < hi)?.[0] ?? null;
const join = (items) => lines(items, { tolerance: 3 }).map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();

export function parseFloridaDecision(decisionRaw, roundRaw) {
  const d = String(decisionRaw ?? '').toLowerCase();
  const rt = String(roundRaw ?? '').match(/(?:rnd|round|rd)\.?\s*(\d{1,2})(?:\s*(?:at|@)\s*(\d{1,2}):(\d{2}))?/i);
  const round = rt ? Number(rt[1]) : null;
  const time = rt && rt[2] ? Number(rt[2]) * 60 + Number(rt[3]) : null;
  if (/no contest/.test(d)) return { method: 'NO_CONTEST', decision_type: null, round, time_sec: time };
  if (/disqualif|\bdq\b/.test(d)) return { method: 'DQ', decision_type: null, round, time_sec: time };
  if (/technical decision/.test(d)) return { method: 'TECHNICAL_DECISION', decision_type: (d.match(/unanimous|majority|split/) ?? [null])[0], round, time_sec: time };
  if (/decision|draw/.test(d)) return { method: 'DECISION', decision_type: (d.match(/unanimous|majority|split/) ?? [null])[0], round: null, time_sec: null };
  if (/technical knockout|\btko\b/.test(d)) return { method: 'TKO', decision_type: null, round, time_sec: time };
  if (/retire|\brtd\b|corner stoppage/.test(d)) return { method: 'RTD', decision_type: null, round, time_sec: time };
  if (/knockout|\bko\b/.test(d)) return { method: 'KO', decision_type: null, round, time_sec: time };
  return null;
}

export function parseFloridaResults(ref, pages, { capturedAt = new Date().toISOString(), upcomingEvents = [], sourceRevision = null } = {}) {
  const base = { doc_key: ref.doc_key, kind: 'results', events: [], bouts: [], rejected: [] };
  const header = pages[0] ? headerOf(pages[0]) : {};
  const eventSport = header.event_type_raw ? classifySportLabel(header.event_type_raw) : SPORT.UNKNOWN;
  const minimized = { header: { ...header }, pages: [] };
  if (eventSport !== SPORT.BOXING) {
    return finalizeParsed({ ...base, minimized: { header: { event_type_raw: header.event_type_raw ?? null, event_date: header.event_date ?? null } },
      classification: { sport: eventSport, professional: true, accepted: false, reason: `event type "${header.event_type_raw}" is not boxing` } });
  }
  if (!header.event_date) return finalizeParsed({ ...base, minimized, classification: { sport: SPORT.BOXING, professional: true, accepted: false, reason: 'no event date' } });

  const sameDay = upcomingEvents.filter((e) => e.event_date === header.event_date && slug(e.venue?.city) === slug(header.city));
  const sourceEventId = sameDay.length === 1 ? sameDay[0].source_event_id : floridaEventKey(header.event_date, header.city, header.promoter);
  base.events.push({
    source_key: FLORIDA.sourceKey, jurisdiction: FLORIDA.jurisdiction.code, source_event_id: sourceEventId, event_date: header.event_date, start_at: null,
    venue: { name: header.venue_name, city: header.city, region: header.region ?? 'FL', country_code: 'US' }, promoters: header.promoter ? [header.promoter] : [],
    event_type_raw: header.event_type_raw, sport: SPORT.BOXING, professional: true, status: 'complete', broadcast: null, source_url: ref.url,
    document_key: ref.doc_key, source_revision: sourceRevision, captured_at: capturedAt,
  });

  let order = 0;
  for (const page of pages) {
    const b = bounds(page);
    if (!b) continue;
    const body = page.items.filter((i) => i.y < b.headerY - 8).map((i) => ({ ...i, col: colOf(b, i.x) })).filter((i) => i.col && i.col !== 'private');
    minimized.pages.push({ page: page.page, items: body.map(({ col, ...i }) => ({ ...i, s: scrubText(i.s) })).filter((i) => i.s) });
    const anchors = body.filter((i) => i.col === 'bout' && /^\d{1,3}$/.test(i.s)).sort((x, y) => y.y - x.y);
    anchors.forEach((anchor, k) => {
      const top = anchor.y + 10;
      const bottom = anchors[k + 1] ? anchors[k + 1].y + 10 : -Infinity;
      const block = body.filter((i) => i.y <= top && i.y > bottom);
      const blue = block.find((i) => i.col === 'corner' && /^blue$/i.test(i.s));
      const red = block.find((i) => i.col === 'corner' && /^red$/i.test(i.s));
      order += 1;
      if (!blue || !red) { base.rejected.push({ reason: 'layout_uncertain', detail: { page: page.page, bout: anchor.s } }); return; }
      const nearest = (i) => (Math.abs(i.y - blue.y) <= Math.abs(i.y - red.y) ? 'a' : 'b');
      const corner = (side, row) => {
        const own = (col) => block.filter((i) => i.col === col && nearest(i) === side);
        const weight = Number(own('weight').map((i) => i.s).find((s) => /^\d+(\.\d+)?$/.test(s)));
        const suspension = join(own('suspension')) || null;
        const days = suspension?.match(/(\d{1,3})\s*days?/i);
        return {
          source_name: join(own('name')), hometown: join(own('hometown')) || null, weight_lb: Number.isFinite(weight) ? weight : null, corner: row,
          result_raw: join(own('result')) || null, note_raw: join(own('note')) || null,
          suspension: suspension ? { raw: suspension, duration_days: days ? Number(days[1]) : null, indefinite: /indefinite/i.test(suspension) } : null,
        };
      };
      const A = corner('a', 'blue');
      const B = corner('b', 'red');
      const sportRaw = join(block.filter((i) => i.col === 'sport'));
      const sport = classifySportLabel(sportRaw);
      if (sport !== SPORT.BOXING) { base.rejected.push({ reason: `bout_sport_not_boxing:${sport}`, detail: { page: page.page, bout: anchor.s, sport_raw: sportRaw } }); return; }
      if (!A.source_name || !B.source_name) { base.rejected.push({ reason: 'missing_contestant', detail: { page: page.page, bout: anchor.s } }); return; }
      const decisionRaw = join(block.filter((i) => i.col === 'decision'));
      const roundRaw = join(block.filter((i) => i.col === 'round_time'));
      const officialsRaw = join(block.filter((i) => i.col === 'officials'));
      const parsedDecision = parseFloridaDecision(decisionRaw, roundRaw);
      const res = (r) => (/^win/i.test(r ?? '') ? 'win' : /^loss|^lose/i.test(r ?? '') ? 'loss' : /^draw/i.test(r ?? '') ? 'draw' : /^nc|no contest/i.test(r ?? '') ? 'nc' : null);
      const ra = res(A.result_raw); const rb = res(B.result_raw);
      let result = null;
      if (parsedDecision) {
        const winnerSide = ra === 'win' && rb !== 'win' ? 'a' : rb === 'win' && ra !== 'win' ? 'b' : null;
        const draw = /draw/i.test(decisionRaw) || (ra === 'draw' || rb === 'draw');
        const nc = parsedDecision.method === 'NO_CONTEST' || ra === 'nc' || rb === 'nc';
        const outcome = nc ? 'no_contest' : draw ? 'draw' : winnerSide ? 'win' : null;
        result = outcome ? { outcome, winner_side: outcome === 'win' ? winnerSide : null, ...parsedDecision, method: nc ? 'NO_CONTEST' : parsedDecision.method, result_raw: `${decisionRaw}${roundRaw ? ` | ${roundRaw}` : ''}`, resolved: true }
          : { outcome: null, winner_side: null, ...parsedDecision, result_raw: decisionRaw, resolved: false };
      }
      const judges = (officialsRaw.match(/Judges?:\s*([^;]+)/i)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        .reduce((acc, part) => { if (/^(jr|sr)\.?$/i.test(part) && acc.length) acc[acc.length - 1] += `, ${part}`; else acc.push(part); return acc; }, [])
        .map((name, i) => ({ slot: i + 1, name, source_name: name, a_total: null, b_total: null }));
      const referee = officialsRaw.match(/Referee:\s*(.+?)(?:;|$)/i)?.[1]?.trim() ?? null;
      const rounds = Number(block.filter((i) => i.col === 'rounds').map((i) => i.s).find((s) => /^\d{1,2}$/.test(s)));
      const fa = { source_name: A.source_name, display_name: displayName(A.source_name), hometown: A.hometown === 'TBD' ? null : A.hometown, weight_lb: A.weight_lb, corner: 'blue' };
      const fb = { source_name: B.source_name, display_name: displayName(B.source_name), hometown: B.hometown === 'TBD' ? null : B.hometown, weight_lb: B.weight_lb, corner: 'red' };
      base.bouts.push({
        source_key: FLORIDA.sourceKey, source_event_id: sourceEventId,
        source_bout_id: null, bout_order: Number(anchor.s) || order, sport: SPORT.BOXING, professional: true,
        fighter_a: fa, fighter_b: fb, scheduled_rounds: Number.isInteger(rounds) ? rounds : null, result,
        judges: judges.filter((j) => !/^[,;]*$/.test(j.name)), score_order_raw: null, referee, deductions: [], title_remarks: [],
        notes_raw: join(block.filter((i) => i.col === 'notes')) || null,
        suspensions: [['a', A], ['b', B]].filter(([, c]) => c.suspension).map(([side, c]) => ({ side, ...c.suspension })),
        debut: { a: /debut/i.test(A.note_raw ?? ''), b: /debut/i.test(B.note_raw ?? '') },
        source_url: ref.url, source_revision: sourceRevision, provenance: { document_key: ref.doc_key, page: page.page, bout_number: anchor.s },
      });
    });
  }
  assignBoutIds(base.bouts);
  return finalizeParsed({ ...base, minimized, classification: { sport: SPORT.BOXING, professional: true, accepted: true, reason: 'event type and bout sport are boxing' } });
}
