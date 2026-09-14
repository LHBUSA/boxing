// Pennsylvania State Athletic Commission adapter (official source: www.pa.gov, Department of State).
//
// Source (reviewed 2026-09-14; docs/sources/commissions.json):
//   results index  https://www.pa.gov/agencies/dos/programs/state-athletic/results
//     one PDF per event under /content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/<year>/,
//     file name "MM-DD-YY <sport> <promoter> - <venue> - <city> pa - results.pdf"; sport codes: box, mma, k-bx,
//     muay thai, bkfc. robots.txt disallows only /form/ksca-form/.
//
// Standard result sheet (Microsoft Reporting Services "BoxResults", one header per page):
//   header  Promoter | Location | Date | Referees (numbered list) | Event: BOXING, and a right-hand block of
//           Commissioner / Physician / Timekeeper / Judges values aligned to their labels
//   table   Sch Rounds + Contestant (first row of a bout) | Result ("W UNA 4RD") | State | Weight | Birth Date |
//           Fed Id | Remarks; the second contestant row follows, and a referee marker (the referee's list number or
//           surname) sits in the left margin between the two rows.
// Kept: event date, venue, promoter as listed, city from the official file name; per bout: contestants as listed
// ("LAST, FIRST" shown as "First Last"), state/country, weight, scheduled rounds, result, method, round, time,
// decision type, the referee named by the bout's marker, suspension duration only.
// Dropped by column position before anything leaves the parser: Birth Date, Fed Id. Never read: Physician,
// Timekeeper, Commissioner, the commission's address/phone block, remark text beyond time and suspension length.
// Judges are listed for the whole event without a per-bout assignment; they are assigned to bouts only when exactly
// three judges are listed. Judges' totals are not printed on this sheet.
// Team Boxing League sheets (a different generator: one-round team bouts, "TBL-pro") are rejected until a reviewed
// parser exists. MMA, kickboxing, muay thai and bare-knuckle documents are rejected.

import { SPORT, assignBoutIds, classifySportLabel, displayName, finalizeParsed, slug } from './contract.mjs';
import { lines } from './pdf.mjs';

export const PENNSYLVANIA = Object.freeze({
  key: 'pennsylvania',
  sourceKey: 'pa_state_athletic_commission',
  version: 'pa-sac@1.0.0',
  jurisdiction: { code: 'US-PA', name: 'Pennsylvania' },
  commission: { slug: 'pa-state-athletic-commission', name: 'Pennsylvania State Athletic Commission', jurisdiction: 'Pennsylvania', country_code: 'US' },
  base: 'https://www.pa.gov',
  resultsUrl: 'https://www.pa.gov/agencies/dos/programs/state-athletic/results',
  remote: { enabled: true, reason: 'official public results index and result PDFs; robots.txt disallows only /form/ksca-form/ (rights review 2026-09-14)' },
});

const pad = (n) => String(n).padStart(2, '0');
const CITY_ALIASES = { phila: 'Philadelphia', 'phila.': 'Philadelphia', philadelphia: 'Philadelphia', kop: 'King of Prussia' };
const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s'-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

// ---------------------------------------------------------------------------
// results index
// ---------------------------------------------------------------------------

export function pennsylvaniaSportHint(file) {
  const f = String(file).toLowerCase();
  const code = f.replace(/^\d{1,2}-\d{1,2}-\d{2,4}\s*-?\s*/, '');
  if (/\b(bkfc|bare[\s-]*knuckle)\b/.test(code)) return SPORT.BARE_KNUCKLE;
  if (/\bk-?bx\b|kickbox/.test(code)) return SPORT.KICKBOXING;
  if (/\bmuay\b/.test(code)) return SPORT.MUAY_THAI;
  if (/\bmma\b/.test(code)) return SPORT.MMA;
  // team league cards (tcl, tbl) are boxing documents; the document decides whether its format is supported
  if (/\b(box|boxing|tcl|tbl)\b/.test(code.replace(/[_-]+/g, ' '))) return SPORT.BOXING;
  return SPORT.UNKNOWN;
}

// City from the official file name: the segment before a trailing " pa" ("phila. pa", "chester pa", "phila., pa").
export function cityFromTitle(file) {
  const parts = String(file).replace(/\.pdf$/i, '').split(/\s+-\s*|\s*-\s+/).map((p) => p.trim()).filter(Boolean);
  for (const p of parts.reverse()) {
    const m = p.match(/^(.*?)[.,]*\s*,?\s*pa\.?(?:\s+results.*)?$/i);
    if (m && m[1] && !/^results/i.test(m[1])) {
      const raw = m[1].replace(/[.,]+$/, '').trim();
      const key = raw.toLowerCase();
      if (/\d/.test(raw)) continue;
      return CITY_ALIASES[key] ?? CITY_ALIASES[`${key}.`] ?? titleCase(raw);
    }
  }
  return null;
}

export function parsePennsylvaniaIndex(html) {
  const refs = [];
  const seen = new Set();
  for (const m of String(html).matchAll(/href="([^"]*\/state-athletics\/results\/(\d{4})\/([^"]+\.pdf))"/gi)) {
    const url = new URL(m[1].replace(/&amp;/g, '&'), PENNSYLVANIA.base).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    const file = decodeURIComponent(m[3]).replace(/\s+/g, ' ').trim();
    // "08-29-26 box ..." (2025-2026) or "2024-01-12-Boxing-Results" (2024)
    const d = file.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})\b/);
    const iso = file.match(/^(\d{4})-(\d{2})-(\d{2})\b/);
    const year = d ? (d[3].length === 2 ? `20${d[3]}` : d[3]) : null;
    refs.push({
      doc_key: `pa-results:${m[2]}:${file.replace(/\.pdf$/i, '')}`, url, kind: 'results', sport_hint: pennsylvaniaSportHint(iso ? file.slice(11) : file),
      event_date: iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : d ? `${year}-${pad(d[1])}-${pad(d[2])}` : null, title: file, listing_year: Number(m[2]), city: cityFromTitle(file),
    });
  }
  return refs;
}

// ---------------------------------------------------------------------------
// result sheet
// ---------------------------------------------------------------------------

// "DAVIS, SANJAY" -> "SANJAY DAVIS"; "SMITH JR., JOHN" -> "JOHN SMITH JR."
export function pennsylvaniaName(raw) {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^([^,]+),\s*(.+)$/);
  if (!m) return s;
  const last = m[1].trim();
  const suffix = last.match(/\s+(JR\.?|SR\.?|II|III|IV)$/i);
  const lastName = suffix ? last.slice(0, suffix.index).trim() : last;
  return `${m[2].trim()} ${lastName}${suffix ? ` ${suffix[1]}` : ''}`.trim();
}

// value -> the label with the smallest y at or above it (labels sit up to 4 units below their first value)
const roleOf = (labels, item) => labels.filter((l) => l.y >= item.y - 4).sort((a, b) => a.y - b.y)[0]?.role ?? null;

function header(page) {
  const find = (re) => page.items.find((i) => re.test(i.s));
  const tableTop = page.items.find((i) => /^Rounds Contestants$|^Rounds$/.test(i.s))?.y ?? 340;
  const leftLabels = [['Promoter:', 'promoter'], ['Location:', 'location'], ['Date:', 'date'], ['Referees:', 'referees'], ['Event:', 'event']]
    .map(([t, role]) => ({ role, y: page.items.find((i) => i.s === t && i.x < 130)?.y })).filter((l) => l.y != null);
  const rightLabels = [['Commissioner:', 'commissioner'], ['Physician:', 'physician'], ['Timekeeper:', 'timekeeper'], ['Judges:', 'judges']]
    .map(([t, role]) => ({ role, y: page.items.find((i) => i.s === t && i.x > 450)?.y })).filter((l) => l.y != null);
  const left = page.items.filter((i) => i.x >= 130 && i.x < 300 && i.y > tableTop + 20 && i.y < 500);
  const right = page.items.filter((i) => i.x >= 550 && i.y > tableTop + 20 && i.y < 500);
  const leftOf = (role) => left.filter((i) => roleOf(leftLabels, i) === role).sort((a, b) => b.y - a.y || a.x - b.x);
  const referees = [];
  for (const it of leftOf('referees')) {
    if (/^\d{1,2}$/.test(it.s)) { const prev = referees.find((r) => Math.abs(r.y - it.y) <= 6); if (prev) prev.number = Number(it.s); continue; }
    referees.push({ name: displayName(pennsylvaniaName(it.s)), surname: it.s.split(',')[0].trim().toUpperCase(), y: it.y, number: null });
  }
  referees.forEach((r, i) => { r.number ??= i + 1; });
  const dateRaw = leftOf('date').map((i) => i.s).find((s) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s));
  const dm = dateRaw?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return {
    title: [find(/DEPARTMENT OF STATE/i)?.s, find(/STATE ATHLETIC COMMISSION/i)?.s].filter(Boolean).join(' '),
    promoter: leftOf('promoter').map((i) => i.s).join(' ').trim() || null,
    location: leftOf('location').map((i) => i.s).join(' ').trim() || null,
    event_date: dm ? `${dm[3]}-${pad(dm[1])}-${pad(dm[2])}` : null,
    event_type_raw: leftOf('event').map((i) => i.s).join(' ').trim() || null,
    referees,
    judges: right.filter((i) => roleOf(rightLabels, i) === 'judges').sort((a, b) => b.y - a.y).map((i) => displayName(pennsylvaniaName(i.s))).filter((n) => /[A-Za-z]/.test(n)),
  };
}

function columns(page) {
  const h = (re) => page.items.find((i) => re.test(i.s));
  const contestants = h(/^Rounds Contestants$|^Contestants$/);
  const result = h(/^Result$/); const state = h(/^State$/); const weight = h(/^Weight$/); const dob = h(/^Birth Date$/); const fed = h(/^Fed Id$/); const remarks = h(/^Remarks$/);
  if (!contestants || !result || !state || !weight || !dob || !fed || !remarks) return null;
  return {
    headerY: contestants.y,
    cols: [
      ['margin', -Infinity, 75], ['contestant', 75, result.x - 30], ['result', result.x - 30, state.x - 12], ['state', state.x - 12, weight.x - 1],
      ['weight', weight.x - 1, dob.x - 18], ['private', dob.x - 18, remarks.x - 9], ['remarks', remarks.x - 9, Infinity],
    ],
  };
}
const colOf = (layout, x) => layout.cols.find(([, lo, hi]) => x >= lo && x < hi)?.[0] ?? null;

const METHOD = { UNA: ['DECISION', 'unanimous'], SPL: ['DECISION', 'split'], MAJ: ['DECISION', 'majority'], KO: ['KO', null], TKO: ['TKO', null], DQ: ['DQ', null],
  RTD: ['RTD', null], RET: ['RTD', null], TD: ['TECHNICAL_DECISION', null], NC: ['NO_CONTEST', null], DRAW: ['DECISION', null] };

export function parsePennsylvaniaResult(raw) {
  const m = String(raw ?? '').trim().match(/^(W|L|D|NC|ND)\b\s*([A-Za-z]+)?\s*(?:(\d{1,2})\s*RD)?/i);
  if (!m) return null;
  const outcome = { W: 'win', L: 'loss', D: 'draw', NC: 'nc', ND: 'nc' }[m[1].toUpperCase()];
  const code = (m[2] ?? '').toUpperCase();
  const [method, decisionType] = METHOD[code] ?? (outcome === 'nc' ? ['NO_CONTEST', null] : [null, null]);
  return { side_outcome: outcome, method, decision_type: decisionType, round: m[3] ? Number(m[3]) : null, raw: String(raw).trim() };
}

const timeOf = (text) => {
  const m = String(text ?? '').match(/(?:^|\s)(\d{0,2}):(\d{2})\b/);
  if (!m) return null;
  const s = Number(m[1] || 0) * 60 + Number(m[2]);
  return s > 0 && s <= 300 ? s : null;
};
const suspensionOf = (text) => {
  const s = String(text ?? '');
  const d = s.match(/(\d{1,3})\s*days?\b/i);
  // "IND SUSP" is an indefinite suspension; the reason text after it is never kept
  const indefinite = /\bindefinite\b|\bind\.?\s*susp/i.test(s);
  if (!d && !indefinite) return null;
  return { duration_days: d ? Number(d[1]) : null, indefinite, raw: d ? `${d[1]} days` : 'indefinite' };
};

export function parsePennsylvaniaResults(ref, pages, { capturedAt = new Date().toISOString(), sourceRevision = null } = {}) {
  const base = { doc_key: ref.doc_key, kind: 'results', events: [], bouts: [], rejected: [] };
  const allText = pages.flatMap((p) => p.items.map((i) => i.s)).join(' ');
  if (/\bTBL-pro\b|\bevent name\b/i.test(allText) && !pages.some((p) => columns(p))) {
    return finalizeParsed({ ...base, minimized: { header: { title: ref.title ?? null } },
      classification: { sport: SPORT.BOXING, professional: true, accepted: false, reason: 'team_league_format_not_supported' } });
  }
  const h = pages[0] ? header(pages[0]) : null;
  const eventSport = h?.event_type_raw ? classifySportLabel(h.event_type_raw) : SPORT.UNKNOWN;
  if (!h || eventSport !== SPORT.BOXING || !/STATE ATHLETIC COMMISSION/i.test(h.title)) {
    return finalizeParsed({ ...base, minimized: { header: { event_type_raw: h?.event_type_raw ?? null, event_date: h?.event_date ?? null } },
      classification: { sport: eventSport, professional: true, accepted: false, reason: `event "${h?.event_type_raw ?? ''}" is not a boxing result sheet` } });
  }
  if (!h.event_date) return finalizeParsed({ ...base, minimized: { header: { event_type_raw: h.event_type_raw } }, classification: { sport: SPORT.BOXING, professional: true, accepted: false, reason: 'no event date' } });

  const city = ref.city ?? null;
  // "2300 Arena-Philadelphia", "PASQUERILLA CENTER- JOHNSTOWN": the city suffix is not part of the venue name
  const cityWords = [city, 'Philadelphia', 'Phila'].filter(Boolean).map((c) => c.toLowerCase());
  const venueParts = (h.location ?? '').split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  while (venueParts.length > 1 && cityWords.includes(venueParts.at(-1).toLowerCase().replace(/\.$/, ''))) venueParts.pop();
  const venue = venueParts.length ? displayName(venueParts.join(' - ')) : null;
  const sourceEventId = `${h.event_date}|${slug(city) || 'pa'}|${slug(venue) || 'unknown'}`;
  const threeJudges = h.judges.length === 3 ? h.judges : null;
  let order = 0;
  for (const page of pages) {
    const layout = columns(page);
    if (!layout) continue;
    const body = page.items.filter((i) => i.y < layout.headerY - 4).map((i) => ({ ...i, col: colOf(layout, i.x) })).filter((i) => i.col && i.col !== 'private');
    const rows = lines(body, { tolerance: 2 });
    const cell = (row, col) => row.items.filter((i) => i.col === col).map((i) => i.s).join(' ').trim();
    const contestantRows = rows.filter((r) => cell(r, 'contestant'));
    for (let k = 0; k < contestantRows.length; k++) {
      const A = contestantRows[k];
      const head = cell(A, 'contestant').match(/^(\d{1,2})\s+(.+)$/);
      if (!head) continue;
      const B = contestantRows[k + 1];
      order += 1;
      if (!B || /^\d{1,2}\s/.test(cell(B, 'contestant'))) { base.rejected.push({ reason: 'missing_contestant', detail: { page: page.page, order } }); continue; }
      k += 1;
      // the marker sits between the two contestant rows or just under the second, never under the next bout's first row
      const nextTop = contestantRows[k + 1]?.y ?? -Infinity;
      const marker = body.filter((i) => i.col === 'margin' && i.y <= A.y + 1 && i.y >= B.y - 9 && i.y > nextTop + 3).map((i) => i.s.trim()).find(Boolean) ?? null;
      const referee = marker == null ? null
        : /^\d{1,2}$/.test(marker) ? (h.referees.find((r) => r.number === Number(marker))?.name ?? null)
          : (h.referees.filter((r) => r.surname === marker.toUpperCase()).length === 1 ? h.referees.find((r) => r.surname === marker.toUpperCase()).name : null);
      const side = (row, name) => {
        const w = Number(cell(row, 'weight'));
        return { source_name: name, display: displayName(pennsylvaniaName(name)), state: cell(row, 'state') || null, weight_lb: Number.isFinite(w) && w > 0 ? w : null,
          result: parsePennsylvaniaResult(cell(row, 'result')), remarks: cell(row, 'remarks') };
      };
      const a = side(A, head[2].trim());
      const b = side(B, cell(B, 'contestant'));
      const ra = a.result?.side_outcome; const rb = b.result?.side_outcome;
      const winnerSide = ra === 'win' && rb === 'loss' ? 'a' : rb === 'win' && ra === 'loss' ? 'b' : null;
      const draw = ra === 'draw' && rb === 'draw';
      const nc = ra === 'nc' || rb === 'nc';
      const r = (winnerSide === 'b' ? b.result : a.result) ?? b.result;
      const method = nc ? 'NO_CONTEST' : r?.method ?? null;
      const decision = method === 'DECISION' || method === 'TECHNICAL_DECISION';
      const outcome = nc ? 'no_contest' : draw ? 'draw' : winnerSide ? 'win' : null;
      const rounds = Number(head[1]);
      const result = r ? {
        outcome, winner_side: outcome === 'win' ? winnerSide : null, method, decision_type: decision ? r.decision_type : null,
        round: method && !decision ? r.round : null, time_sec: method && !decision ? timeOf(`${a.remarks} ${b.remarks}`) : null,
        result_raw: `${a.result?.raw ?? ''} / ${b.result?.raw ?? ''}`.trim(), resolved: Boolean(outcome && method),
      } : null;
      base.bouts.push({
        source_key: PENNSYLVANIA.sourceKey, source_event_id: sourceEventId, source_bout_id: null, bout_order: order, sport: SPORT.BOXING, professional: true,
        fighter_a: { source_name: a.source_name, display_name: a.display, hometown: a.state, weight_lb: a.weight_lb, corner: null },
        fighter_b: { source_name: b.source_name, display_name: b.display, hometown: b.state, weight_lb: b.weight_lb, corner: null },
        scheduled_rounds: Number.isInteger(rounds) && rounds > 0 ? rounds : null, result,
        referee, judges: threeJudges ? threeJudges.map((name, i) => ({ slot: i + 1, name, source_name: name, a_total: null, b_total: null })) : [],
        score_order_raw: null, officials_assignment: { referee: marker == null ? 'no_marker' : referee ? 'marker' : 'marker_unresolved', judges: threeJudges ? 'three_listed' : `listed_${h.judges.length}_not_assigned` },
        deductions: [], title_remarks: [],
        suspensions: [['a', a], ['b', b]].map(([s, c]) => [s, suspensionOf(c.remarks)]).filter(([, x]) => x).map(([s, x]) => ({ side: s, ...x })),
        debut: { a: null, b: null }, source_url: ref.url, source_revision: sourceRevision, provenance: { document_key: ref.doc_key, page: page.page, bout_number: order },
      });
    }
  }
  if (!base.bouts.length) return finalizeParsed({ ...base, minimized: { header: { event_type_raw: h.event_type_raw, event_date: h.event_date } }, classification: { sport: SPORT.BOXING, professional: true, accepted: false, reason: 'no bout rows' } });
  base.events.push({
    source_key: PENNSYLVANIA.sourceKey, jurisdiction: PENNSYLVANIA.jurisdiction.code, source_event_id: sourceEventId, event_date: h.event_date, start_at: null,
    venue: { name: venue, city, region: 'PA', country_code: 'US' }, promoters: h.promoter ? [displayName(pennsylvaniaName(h.promoter))] : [],
    event_type_raw: h.event_type_raw, sport: SPORT.BOXING, professional: true, status: 'complete', broadcast: null, source_url: ref.url,
    document_key: ref.doc_key, source_revision: sourceRevision, captured_at: capturedAt,
  });
  assignBoutIds(base.bouts);
  const minimized = { header: { event_date: h.event_date, event_type_raw: h.event_type_raw, promoter: h.promoter, location: h.location, referees: h.referees.map((x) => x.name), judges: h.judges },
    bouts: base.bouts.map((x) => ({ order: x.bout_order, a: x.fighter_a.source_name, b: x.fighter_b.source_name, rounds: x.scheduled_rounds, result: x.result?.result_raw ?? null, referee: x.referee })) };
  return finalizeParsed({ ...base, minimized, classification: { sport: SPORT.BOXING, professional: true, accepted: true, reason: 'Event: BOXING standard result sheet' } });
}
