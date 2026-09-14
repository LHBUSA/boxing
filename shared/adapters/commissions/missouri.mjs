// Missouri Office of Athletics adapter (official source: pr.mo.gov, Division of Professional Registration).
//
// Source (reviewed 2026-09-14; docs/sources/commissions.json):
//   results index  https://pr.mo.gov/athletics-boxingresults.asp
//     static table: <a href='boards/athletics/boxingresults/YYYY-MM-DD CODES City Promoter.pdf'> | last modified
//     CODES name the sports on the sheet (BOXRES, BOXAKICKRES, KICKRES, AKICKRES, MUAYTHAIRES ...).
//   robots.txt disallows /data, /downloadables, /vault ... but not /boards (the "/boards" line is commented out).
//   The site serves only its leaf TLS certificate; clients must complete the chain from system roots.
//
// Result sheet ("MISSOURI PROFESSIONAL BOXING [AND ...] SHOW RESULTS", Word export, one table):
//   header: PROMOTER, ANNOUNCER, TIMEKEEPER, DOCTOR, EXECUTIVE DIRECTOR, EVENT #, DATE, LOCATION, ATTENDANCE, CITY,
//           INSPECTORS; REFEREE and JUDGE rows with a BOUTS column listing the bouts each official worked.
//   table:  BOUT | AGE | NAME | FROM | WGT | FED ID | RDS | DOB | RECORD | RSLT | COMMENTS
//           a section label row (PROFESSIONAL BOXING / AMATEUR KICKBOXING / ... EXHIBITION) above every contestant row;
//           the first contestant row of a bout carries BOUT and RDS, the second follows it.
//
// Kept: event date, venue, city, event number, promoter as listed; per professional boxing bout: contestants as
// listed, hometown, weight, scheduled rounds, result, method, round, time, decision type, suspension DURATION only;
// referee and judges only when the BOUTS column (or a single named official) assigns them without ambiguity.
// Dropped by column position before anything leaves the parser: AGE, FED ID, DOB, RECORD. Never read: doctor,
// announcer, timekeeper, inspectors, executive director, attendance, office address and phone, comment text
// (suspension reasons can be medical). Judges' totals are printed per bout in an order that the sheet does not tie
// to judge names, so no total is attributed to a judge; the unattributed totals stay in the bout observation only.
// Kickboxing, muay thai, amateur and exhibition bouts are rejected.

import { SPORT, assignBoutIds, displayName, finalizeParsed, slug } from './contract.mjs';
import { lines } from './pdf.mjs';

export const MISSOURI = Object.freeze({
  key: 'missouri',
  sourceKey: 'mo_office_of_athletics',
  version: 'mo-athletics@1.0.0',
  jurisdiction: { code: 'US-MO', name: 'Missouri' },
  commission: { slug: 'mo-office-of-athletics', name: 'Missouri Office of Athletics', jurisdiction: 'Missouri', country_code: 'US' },
  base: 'https://pr.mo.gov/',
  resultsUrl: 'https://pr.mo.gov/athletics-boxingresults.asp',
  remote: { enabled: true, reason: 'official public results index and result PDFs; robots.txt does not disallow /boards/ (rights review 2026-09-14)' },
});

const pad = (n) => String(n).padStart(2, '0');
const decodeHtml = (s) => String(s).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// results index
// ---------------------------------------------------------------------------

// Sport hint from the file name codes. KICKBOXRES starts with KICK, so only codes STARTING with BOX/PROBOX count.
export function missouriSportHint(label) {
  const codes = String(label).replace(/^\s*\d{4}-\d{2}-\d{2}\s+/, '').split(/\s+/).filter((t) => /^[A-Z]{3,}$/.test(t) && /RES$|^BOX$|^AKICK$|^AMUAY$|^KICK$|^THAI$/.test(t));
  if (codes.some((t) => /^(PRO)?BOX/.test(t))) return SPORT.BOXING;
  if (codes.some((t) => /MUAY/.test(t))) return SPORT.MUAY_THAI;
  if (codes.some((t) => /KICK/.test(t))) return SPORT.KICKBOXING;
  return SPORT.UNKNOWN;
}

export function parseMissouriIndex(html) {
  const refs = [];
  const seen = new Set();
  for (const m of String(html).matchAll(/<a[^>]+href=['"]((?:https:\/\/pr\.mo\.gov\/)?boards\/athletics\/boxingresults\/([^'"]+\.pdf))['"][^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    const url = new URL(m[1].replace(/&amp;/g, '&'), MISSOURI.base).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    const file = decodeURIComponent(m[2]).replace(/\.pdf$/i, '');
    const label = decodeHtml(m[3]) || file;
    const d = file.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const modified = decodeHtml(m[4]).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    refs.push({
      doc_key: `mo-results:${file.replace(/\s+/g, ' ').trim()}`, url, kind: 'results', sport_hint: missouriSportHint(label),
      event_date: d ? `${d[1]}-${d[2]}-${d[3]}` : null, title: label, listed_modified: modified ? `${modified[3]}-${pad(modified[1])}-${pad(modified[2])}` : null,
    });
  }
  return refs;
}

// ---------------------------------------------------------------------------
// officials' BOUTS column
// ---------------------------------------------------------------------------

// "13579", "1 3 4 6", "3579 10 11", "12468 12", "1 – 12": every reading of each token as bout numbers 1..n.
function tokenReadings(token, n) {
  if (!/^\d+$/.test(token)) return [];
  const out = [];
  const walk = (rest, acc) => {
    if (!rest) { out.push(acc); return; }
    const one = Number(rest[0]);
    if (one >= 1 && one <= n) walk(rest.slice(1), [...acc, one]);
    if (rest.length >= 2 && rest[0] !== '0') {
      const two = Number(rest.slice(0, 2));
      if (two >= 10 && two <= n) walk(rest.slice(2), [...acc, two]);
    }
  };
  walk(token, []);
  return out;
}

export function boutListReadings(raw, n) {
  const text = String(raw ?? '').replace(/[–—]/g, '-').replace(/\s*-\s*/g, '-').trim();
  if (!text) return [];
  let readings = [[]];
  for (const token of text.split(/[\s,]+/).filter(Boolean)) {
    const range = token.match(/^(\d{1,2})-(\d{1,2})$/);
    const options = range
      ? (Number(range[1]) >= 1 && Number(range[2]) <= n && Number(range[1]) <= Number(range[2]) ? [Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, i) => Number(range[1]) + i)] : [])
      : tokenReadings(token, n);
    if (!options.length) return [];
    readings = readings.flatMap((r) => options.map((o) => [...r, ...o]));
    if (readings.length > 256) return [];
  }
  return readings.filter((r) => new Set(r).size === r.length).map((r) => [...r].sort((a, b) => a - b));
}

// Referees: exactly one assignment per bout. One named referee without a list works every bout; otherwise the
// lists must have exactly one reading that partitions bouts 1..n. Anything else assigns nobody.
export function assignReferees(referees, boutNumbers) {
  const n = Math.max(0, ...boutNumbers);
  const map = new Map();
  const named = referees.filter((r) => r.name);
  if (!named.length) return { map, reason: 'no_referee_named' };
  if (named.length === 1 && !named[0].bouts) { for (const b of boutNumbers) map.set(b, named[0].name); return { map, reason: 'single_referee' }; }
  if (named.some((r) => !r.bouts)) return { map, reason: 'referee_without_bout_list' };
  const options = named.map((r) => boutListReadings(r.bouts, n));
  const solutions = [];
  const walk = (i, used, pick) => {
    if (solutions.length > 1) return;
    if (i === options.length) { if (boutNumbers.every((b) => used.has(b)) && used.size === boutNumbers.length) solutions.push(pick); return; }
    for (const o of options[i]) {
      if (o.some((b) => used.has(b) || !boutNumbers.includes(b))) continue;
      walk(i + 1, new Set([...used, ...o]), [...pick, o]);
    }
  };
  walk(0, new Set(), []);
  if (solutions.length !== 1) return { map, reason: solutions.length ? 'referee_lists_ambiguous' : 'referee_lists_do_not_partition_bouts' };
  solutions[0].forEach((list, i) => { for (const b of list) map.set(b, named[i].name); });
  return { map, reason: 'bout_lists' };
}

// Judges: each judge's list must have exactly one reading; no list = every bout. A bout gets its judges in header order.
export function assignJudges(judges, boutNumbers) {
  const n = Math.max(0, ...boutNumbers);
  const map = new Map(boutNumbers.map((b) => [b, []]));
  const named = judges.filter((j) => j.name);
  for (const j of named) {
    let list = boutNumbers;
    if (j.bouts) {
      const readings = boutListReadings(j.bouts, n);
      if (readings.length !== 1) return { map: new Map(boutNumbers.map((b) => [b, []])), reason: 'judge_list_ambiguous' };
      list = readings[0];
    }
    for (const b of list) map.get(b)?.push(j.name);
  }
  return { map, reason: named.length ? 'ok' : 'no_judge_named' };
}

// ---------------------------------------------------------------------------
// result sheet
// ---------------------------------------------------------------------------

function header(page) {
  const at = (label) => page.items.find((i) => i.s.trim().toUpperCase() === label);
  const rightOf = (label, maxDx = 260) => {
    const l = at(label);
    if (!l) return null;
    return page.items.filter((i) => Math.abs(i.y - l.y) <= 2 && i.x > l.x + 20 && i.x < l.x + maxDx && !/^(REFEREE|JUDGE)$/.test(i.s)).sort((a, b) => a.x - b.x)[0]?.s ?? null;
  };
  const below = (label) => {
    const l = at(label);
    if (!l) return null;
    return page.items.filter((i) => i.y < l.y - 4 && i.y > l.y - 16 && Math.abs(i.x - l.x) <= 60).sort((a, b) => b.y - a.y || a.x - b.x)[0]?.s ?? null;
  };
  const title = page.items.filter((i) => /SHOW RESULTS/i.test(i.s)).map((i) => i.s).join(' ');
  const dateItem = at('DATE');
  const date = dateItem ? page.items.find((i) => i.y < dateItem.y - 4 && i.y > dateItem.y - 16 && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(i.s))?.s : null;
  const dm = date?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  const year = dm ? (dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : null;
  const cityRaw = page.items.find((i) => /^CITY:/i.test(i.s))?.s.replace(/^CITY:\s*/i, '') ?? null;
  const officials = (role) => page.items.filter((i) => i.s.trim().toUpperCase() === role).sort((a, b) => b.y - a.y).map((r) => {
    const row = page.items.filter((i) => Math.abs(i.y - r.y) <= 2 && i.x > r.x);
    const name = row.filter((i) => i.x < r.x + 170).map((i) => i.s).join(' ').trim() || null;
    const bouts = row.filter((i) => i.x >= r.x + 170).map((i) => i.s).join(' ').trim() || null;
    return { name, bouts };
  });
  return {
    title,
    event_date: dm ? `${year}-${pad(dm[1])}-${pad(dm[2])}` : null,
    venue: below('LOCATION'),
    city: cityRaw ? cityRaw.split(',')[0].trim() : null,
    region: cityRaw?.split(',')[1]?.trim() || null,
    promoter: rightOf('PROMOTER'),
    event_number: rightOf('EVENT #', 200),
    referees: officials('REFEREE'),
    judges: officials('JUDGE'),
  };
}

function columns(page) {
  const h = (s) => page.items.find((i) => i.s === s)?.x;
  const need = { bout: h('BOUT'), age: h('AGE'), name: h('NAME'), from: h('FROM'), wgt: h('WGT'), fed: h('FED ID'), rds: h('RDS'), dob: h('DOB'), rec: h('RECORD'), rslt: h('RSLT'), com: h('COMMENTS') };
  if (Object.values(need).some((v) => v == null)) return null;
  const headerY = page.items.find((i) => i.s === 'BOUT' && Math.abs(i.x - need.bout) < 1 && page.items.some((j) => j.s === 'NAME' && Math.abs(j.y - i.y) <= 2)).y;
  return {
    headerY,
    cols: [
      ['label_or_bout', -Infinity, need.age - 6], ['private', need.age - 6, need.name - 43], ['name', need.name - 43, need.from - 41],
      ['from', need.from - 41, need.wgt - 13], ['weight', need.wgt - 13, need.fed - 22], ['private', need.fed - 22, need.rds - 15],
      ['rounds', need.rds - 15, need.dob - 23], ['private', need.dob - 23, need.rslt - 15], ['result', need.rslt - 15, need.com - 81], ['comments', need.com - 81, Infinity],
    ],
  };
}
const colOf = (layout, x) => layout.cols.find(([, lo, hi]) => x >= lo && x < hi)?.[0] ?? null;

export function parseMissouriMethod(winnerComment, loserComment) {
  const c = String(winnerComment ?? '').replace(/\s+/g, ' ').trim();
  const lc = c.toLowerCase();
  const rt = c.match(/(\d{0,2}):(\d{2})\s*of the\s*(\d{1,2})/i) ?? c.match(/of the\s*(\d{1,2})/i);
  const round = rt ? Number(rt.length === 4 ? rt[3] : rt[1]) : null;
  // "0:00 of the 2nd" marks a stoppage between rounds: no elapsed time is stated
  const seconds = rt && rt.length === 4 ? Number(rt[1] || 0) * 60 + Number(rt[2]) : null;
  const time = seconds ? seconds : null;
  const decisionType = (lc.match(/\b(unanimous|majority|split)\b/) ?? [null])[0];
  let method = null;
  if (/no contest/.test(lc)) method = 'NO_CONTEST';
  else if (/disqualif|\bdq\b/.test(lc)) method = 'DQ';
  else if (/technical decision|\btd\b/.test(lc)) method = 'TECHNICAL_DECISION';
  else if (/\bdec(ision)?\b|\bdraw\b/.test(lc)) method = 'DECISION';
  else if (/\btko\b|technical knockout/.test(lc)) method = 'TKO';
  else if (/\brtd\b|retire/.test(lc)) method = 'RTD';
  else if (/\bko\b|knockout/.test(lc)) method = 'KO';
  // suspension phrases share the comment cell ("36 39 36, 30 Days Suspension ..."): removed before reading totals
  const scores = (s) => (String(s ?? '').replace(/\d{1,3}\s*days?\b.*$/i, ' ').replace(/indefinite.*$/i, ' ').replace(/,/g, ' ')
    .match(/(?:^|\s)(\d{2}(?:\.\d)?)(?=\s|$)/g) ?? []).map((x) => Number(x));
  const winnerScores = scores(c.replace(/(\d{0,2}):(\d{2})/g, ' ').replace(/of the\s*\d{1,2}/gi, ' '));
  const loserScores = scores(loserComment);
  const totals = winnerScores.length && winnerScores.length === loserScores.length ? winnerScores.map((w, i) => [w, loserScores[i]]) : null;
  return method ? { method, decision_type: method === 'DECISION' || method === 'TECHNICAL_DECISION' ? decisionType : null, round: method === 'DECISION' ? null : round, time_sec: method === 'DECISION' ? null : time, totals } : null;
}

const suspensionOf = (comment) => {
  const s = String(comment ?? '');
  const days = s.match(/(\d{1,3})\s*days?\b/i);
  const indefinite = /\bindefinite\b/i.test(s);
  if (!days && !indefinite) return null;
  // duration only: the comment text itself is never kept (reasons can be medical)
  return { duration_days: days ? Number(days[1]) : null, indefinite, raw: days ? `${days[1]} days` : 'indefinite' };
};

export function classifyMissouriSection(label) {
  const t = String(label ?? '').toUpperCase().replace(/AMATEIR/g, 'AMATEUR').replace(/\s+/g, ' ').trim();
  if (!t) return { sport: SPORT.UNKNOWN, accepted: false, reason: 'no_section_label' };
  if (/KICK/.test(t)) return { sport: SPORT.KICKBOXING, accepted: false, reason: 'bout_sport_not_boxing:kickboxing' };
  if (/MUAY/.test(t)) return { sport: SPORT.MUAY_THAI, accepted: false, reason: 'bout_sport_not_boxing:muay_thai' };
  if (/MMA|MIXED/.test(t)) return { sport: SPORT.MMA, accepted: false, reason: 'bout_sport_not_boxing:mma' };
  if (!/BOXING/.test(t)) return { sport: SPORT.OTHER, accepted: false, reason: 'bout_sport_not_boxing:other' };
  if (/AMATEUR/.test(t)) return { sport: SPORT.BOXING, accepted: false, reason: 'amateur_bout' };
  if (/EXHIBITION/.test(t)) return { sport: SPORT.BOXING, accepted: false, reason: 'exhibition_bout' };
  if (/PROFESSIONAL/.test(t)) return { sport: SPORT.BOXING, accepted: true, reason: 'professional boxing' };
  return { sport: SPORT.BOXING, accepted: false, reason: 'boxing_level_not_stated' };
}

export function parseMissouriResults(ref, pages, { capturedAt = new Date().toISOString(), sourceRevision = null } = {}) {
  const base = { doc_key: ref.doc_key, kind: 'results', events: [], bouts: [], rejected: [] };
  const h = pages[0] ? header(pages[0]) : null;
  const titleOk = h && /PROFESSIONAL BOXING/i.test(h.title);
  const minimizedHeader = h ? { title: h.title, event_date: h.event_date, venue: h.venue, city: h.city, region: h.region, promoter: h.promoter, event_number: h.event_number } : {};
  if (!titleOk) {
    return finalizeParsed({ ...base, minimized: { header: { title: h?.title ?? null, event_date: h?.event_date ?? null } },
      classification: { sport: /KICK/i.test(h?.title ?? '') ? SPORT.KICKBOXING : /MUAY/i.test(h?.title ?? '') ? SPORT.MUAY_THAI : SPORT.UNKNOWN, professional: null, accepted: false, reason: `sheet title "${h?.title ?? ''}" has no professional boxing` } });
  }
  if (!h.event_date) return finalizeParsed({ ...base, minimized: { header: minimizedHeader }, classification: { sport: SPORT.BOXING, professional: true, accepted: false, reason: 'no event date' } });

  const sourceEventId = `${h.event_date}|${slug(h.city) || 'unknown'}|${h.event_number ? `event-${slug(h.event_number)}` : slug(h.venue) || 'unknown'}`;
  const layout0 = columns(pages[0]);
  // reading order across pages: every row of every page, top to bottom, with its page index
  const rows = [];
  let layout = layout0;
  for (const page of pages) {
    layout = columns(page) ?? layout;
    if (!layout) continue;
    const top = page === pages[0] || columns(page) ? layout.headerY - 4 : Infinity;
    const body = page.items.filter((i) => i.y < top);
    for (const l of lines(body, { tolerance: 2 })) {
      const cells = {};
      for (const i of l.items) {
        const col = colOf(layout, i.x);
        if (!col || col === 'private') continue;
        (cells[col] ??= []).push(i);
      }
      // superscript ordinals (1 st, 2 nd) sit 3 units above their line: fold into the comment of the next line below
      rows.push({ page: page.page, y: l.y, cells, text: (k) => (cells[k] ?? []).map((i) => i.s).join(' ').trim() });
    }
  }
  const isLabel = (r) => r.text('label_or_bout') && !/^\d{1,3}$/.test(r.text('label_or_bout')) && !r.text('name');
  const isContestant = (r) => Boolean(r.text('name'));

  const boutRows = [];
  for (let k = 0; k < rows.length; k++) {
    const r = rows[k];
    // the first contestant row of a bout carries BOUT and RDS; a stray number without RDS is not a bout anchor
    if (!isContestant(r) || !/^\d{1,3}$/.test(r.text('label_or_bout')) || !/^\d{1,2}$/.test(r.text('rounds'))) continue;
    const next = rows.slice(k + 1).find(isContestant);
    const label = [...rows.slice(0, k)].reverse().find((x) => isLabel(x) || isContestant(x));
    boutRows.push({ number: Number(r.text('label_or_bout')), a: r, b: next && !/^\d{1,2}$/.test(next.text('rounds')) ? next : null, label: label && isLabel(label) ? label.text('label_or_bout') : null });
  }
  const numbers = boutRows.map((b) => b.number);
  const refs = assignReferees(h.referees, numbers);
  const judges = assignJudges(h.judges, numbers);

  // a boxing-only sheet ("MISSOURI PROFESSIONAL BOXING SHOW RESULTS") prints no section labels
  const boxingOnlySheet = /PROFESSIONAL BOXING SHOW RESULTS/i.test(h.title) && !/KICK|MUAY|AMATEUR|EXHIBITION|MMA|MIXED/i.test(h.title);
  for (const br of boutRows) {
    const section = classifyMissouriSection(br.label ?? (boxingOnlySheet ? 'PROFESSIONAL BOXING' : null));
    if (!section.accepted) { base.rejected.push({ reason: section.reason, detail: { bout: br.number, section_raw: br.label } }); continue; }
    if (!br.b) { base.rejected.push({ reason: 'missing_contestant', detail: { bout: br.number } }); continue; }
    const side = (row) => {
      const weight = Number(row.text('weight'));
      const comment = row.text('comments');
      return { source_name: row.text('name'), hometown: row.text('from') || null, weight_lb: Number.isFinite(weight) && weight > 0 ? weight : null, result_raw: row.text('result') || null, comment };
    };
    const A = side(br.a);
    const B = side(br.b);
    if (!A.source_name || !B.source_name) { base.rejected.push({ reason: 'missing_contestant', detail: { bout: br.number } }); continue; }
    const res = (r) => (/^won/i.test(r ?? '') ? 'win' : /^lost/i.test(r ?? '') ? 'loss' : /^draw/i.test(r ?? '') ? 'draw' : /^(nc|no contest)/i.test(r ?? '') ? 'nc' : null);
    const ra = res(A.result_raw);
    const rb = res(B.result_raw);
    const winnerSide = ra === 'win' && rb === 'loss' ? 'a' : rb === 'win' && ra === 'loss' ? 'b' : null;
    const draw = ra === 'draw' && rb === 'draw';
    const methodSource = winnerSide === 'b' ? [B.comment, A.comment] : [A.comment, B.comment];
    const parsed = parseMissouriMethod(...methodSource);
    let result = null;
    if (parsed) {
      const nc = parsed.method === 'NO_CONTEST' || ra === 'nc' || rb === 'nc';
      const outcome = nc ? 'no_contest' : draw ? 'draw' : winnerSide ? 'win' : null;
      const { totals, ...rest } = parsed;
      result = outcome ? { outcome, winner_side: outcome === 'win' ? winnerSide : null, ...rest, method: nc ? 'NO_CONTEST' : rest.method, result_raw: `${winnerSide === 'b' ? B.result_raw : A.result_raw} ${rest.method}`.trim(), resolved: true }
        : { outcome: null, winner_side: null, ...rest, result_raw: `${A.result_raw ?? ''} / ${B.result_raw ?? ''}`, resolved: false };
    } else if (ra || rb) {
      result = { outcome: null, winner_side: null, method: null, decision_type: null, round: null, time_sec: null, result_raw: `${A.result_raw ?? ''} / ${B.result_raw ?? ''}`, resolved: false };
    }
    const totals = parsed?.totals ?? null;
    const rounds = Number(br.a.text('rounds'));
    const boutJudges = (judges.map.get(br.number) ?? []).map((name, i) => ({ slot: i + 1, name, source_name: name, a_total: null, b_total: null }));
    base.bouts.push({
      source_key: MISSOURI.sourceKey, source_event_id: sourceEventId, source_bout_id: null, bout_order: br.number, sport: SPORT.BOXING, professional: true,
      fighter_a: { source_name: A.source_name, display_name: displayName(A.source_name), hometown: A.hometown, weight_lb: A.weight_lb, corner: null },
      fighter_b: { source_name: B.source_name, display_name: displayName(B.source_name), hometown: B.hometown, weight_lb: B.weight_lb, corner: null },
      scheduled_rounds: Number.isInteger(rounds) && rounds > 0 ? rounds : null, result,
      referee: refs.map.get(br.number) ?? null, judges: boutJudges, score_order_raw: null,
      // printed per bout in an order the sheet does not tie to judge names: never attributed to a judge
      score_totals_unattributed: totals ? totals.map(([w, l]) => (winnerSide === 'b' ? { a: l, b: w } : { a: w, b: l })) : null,
      officials_assignment: { referee: refs.reason, judges: judges.reason },
      deductions: [], title_remarks: [],
      suspensions: [['a', A], ['b', B]].map(([s, c]) => [s, suspensionOf(c.comment)]).filter(([, x]) => x).map(([s, x]) => ({ side: s, ...x })),
      debut: { a: null, b: null },
      source_url: ref.url, source_revision: sourceRevision, provenance: { document_key: ref.doc_key, page: br.a.page, bout_number: br.number },
    });
  }
  if (!base.bouts.length) {
    return finalizeParsed({ ...base, minimized: { header: minimizedHeader }, classification: { sport: SPORT.BOXING, professional: true, accepted: false, reason: 'no professional boxing bout on the sheet' } });
  }
  base.events.push({
    source_key: MISSOURI.sourceKey, jurisdiction: MISSOURI.jurisdiction.code, source_event_id: sourceEventId, event_date: h.event_date, start_at: null,
    venue: { name: h.venue, city: h.city, region: h.region ?? 'MO', country_code: 'US' }, promoters: h.promoter ? [h.promoter] : [],
    event_type_raw: h.title, sport: SPORT.BOXING, professional: true, status: 'complete', broadcast: null, source_url: ref.url,
    document_key: ref.doc_key, source_revision: sourceRevision, captured_at: capturedAt,
  });
  assignBoutIds(base.bouts);
  const minimized = { header: { ...minimizedHeader, referees: h.referees.filter((r) => r.name).map((r) => r.name), judges: h.judges.filter((j) => j.name).map((j) => j.name) },
    bouts: base.bouts.map((b) => ({ bout: b.bout_order, a: b.fighter_a.source_name, b: b.fighter_b.source_name, rounds: b.scheduled_rounds, result: b.result?.result_raw ?? null })) };
  return finalizeParsed({ ...base, minimized, classification: { sport: SPORT.BOXING, professional: true, accepted: true, reason: 'sheet title and bout sections are professional boxing' } });
}
