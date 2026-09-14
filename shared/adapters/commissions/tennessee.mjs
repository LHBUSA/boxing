// Tennessee Athletic Commission adapter (official source: www.tn.gov, Department of Commerce & Insurance).
//
// Source (reviewed 2026-09-14; supabase/migrations/20260914000032_boxing_tennessee_commission.sql, docs/sources/commissions.json):
//   current year  https://www.tn.gov/commerce/regboards/athletic/events.html
//   archive       https://www.tn.gov/commerce/regboards/athletic/events/archive.html (2020-2025)
//   static tables: Date | Event Type | Location | Event Name/Venue | Results (one or more PDF links, sometimes labelled
//   "Boxing" / "Kickboxing"). robots.txt: "User-agent: * Allow: /". The Commission does not regulate amateur bouts.
//
// Result document: the Commission's "BOXING MATCH RESULTS" form, flattened. The same form is stored upright (612x792)
// or as a landscape page with /Rotate 90 (792x612); device-space extraction (pdf-device.mjs) normalizes both, and
// x is scaled to the upright width. Scanned image-only documents carry no text and are rejected as such.
//   header  CITY, STATE/PROVINCE, EVENT NAME, DATE, VENUE, PROMOTER; JUDGE(s) and REFEREE(s) as numbered lists
//   table   BOUT # | RDS. | STATUS (Pro/Am radio) | FIGHTER NAME (two rows per bout) | FED ID AND/OR DOB | WEIGHT |
//           WINNER (radio per fighter row) | RD. | TIME | METHOD (method, "REF: name", judge score lines) | SUSPENSIONS
// The WINNER and STATUS choices exist only as drawn radio marks: the selected radio carries a small filled inner dot.
//
// Kept: event date, city, venue, event name, promoter as listed; per professional bout: contestants as listed,
// weight, scheduled rounds, winner (from the WINNER mark), method, round, time, decision type, the referee named on
// the bout's REF line, judges whose score lines name a listed judge, suspension duration only.
// Dropped by column before anything leaves the parser: FED ID AND/OR DOB. Never read: executive director, office
// address/phone/email, inspectors, ringside doctors, announcer, timekeeper, matchmaker, suspension origin text.
// Judges' totals are attached to fighters only when the marked winner and the written decision type fix the order of
// the printed numbers (see scoreOrder); otherwise the lines are kept for review and never published.
// Rejected: amateur or unmarked-status bouts, bare-knuckle / kickboxing / MMA / multi-sport forms, image-only and OCR
// scans, layouts that do not match the form. Bouts whose WINNER marks are missing or ambiguous record no outcome.

import { SPORT, assignBoutIds, classifySportLabel, displayName, finalizeParsed, slug } from './contract.mjs';
import { lines } from './pdf.mjs';
import { extractDeviceText } from './pdf-device.mjs';

export const TENNESSEE = Object.freeze({
  key: 'tennessee',
  sourceKey: 'tn_athletic_commission',
  version: 'tn-athletic@1.0.0',
  jurisdiction: { code: 'US-TN', name: 'Tennessee' },
  commission: { slug: 'tn-athletic-commission', name: 'Tennessee Athletic Commission', jurisdiction: 'Tennessee', country_code: 'US' },
  base: 'https://www.tn.gov',
  resultsUrl: 'https://www.tn.gov/commerce/regboards/athletic/events.html',
  archiveUrl: 'https://www.tn.gov/commerce/regboards/athletic/events/archive.html',
  remote: { enabled: true, reason: 'official public event results pages and result PDFs; robots.txt allows all (rights review 2026-09-14)' },
  // result forms need drawn radio marks: the run uses this extractor instead of the plain text extractor
  extractDocument: extractDeviceText,
});

const pad = (n) => String(n).padStart(2, '0');
const decode = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// index pages
// ---------------------------------------------------------------------------

export function tennesseeLinkSport(eventType, label) {
  const t = String(eventType ?? '').toLowerCase();
  const l = String(label ?? '').toLowerCase();
  if (/bare|knuckle/.test(l)) return { sport: SPORT.BARE_KNUCKLE, professional: null };
  if (/kick/.test(l)) return { sport: SPORT.KICKBOXING, professional: null };
  if (/mma/.test(l)) return { sport: SPORT.MMA, professional: null };
  const professional = /\bpro\b|all pro/.test(t);
  if (/box/.test(l)) return { sport: SPORT.BOXING, professional };
  if (/bare|knuckle|bkfc/.test(t)) return { sport: SPORT.BARE_KNUCKLE, professional };
  if (/kick/.test(t)) return { sport: SPORT.KICKBOXING, professional };
  if (/mma/.test(t) && !/box/.test(t)) return { sport: SPORT.MMA, professional };
  if (/box/.test(t)) return { sport: SPORT.BOXING, professional };
  return { sport: SPORT.UNKNOWN, professional };
}

const RESULTS_PREFIX = 'https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/';
const LINK_RE = /<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
const resultUrl = (href) => { const url = new URL(href.replace(/&amp;/g, '&'), TENNESSEE.base).toString(); return url.startsWith(RESULTS_PREFIX) ? url : null; };

// Every distinct result-PDF link on an index page, whatever row it sits in: the run compares this with the parsed refs so
// a link the row parser cannot place is reported, never silently dropped.
export function tennesseeResultLinks(html) {
  return [...new Set([...String(html).matchAll(LINK_RE)].map((l) => resultUrl(l[1])).filter(Boolean))];
}

// Rows are read cell by cell: cells may carry markup (`Pro Boxing<br />`), and a row whose date is not a valid m/d/yyyy
// (the archive lists "2/7/202") keeps its links with event_date null and the raw text; the sheet supplies the date and
// the document's URL folder supplies the year for backfill selection.
export function parseTennesseeIndex(html) {
  const refs = [];
  const seen = new Set();
  for (const row of String(html).split(/<tr[\s>]/i).slice(1)) {
    const cells = [...row.split(/<\/tr>/i)[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1]);
    if (cells.length < 5) continue;
    const dateRaw = decode(cells[0]);
    const d = dateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const eventType = decode(cells[1]);
    for (const l of cells[4].matchAll(LINK_RE)) {
      const url = resultUrl(l[1]);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const label = decode(l[2]);
      const sport = tennesseeLinkSport(eventType, label);
      const path = url.slice(RESULTS_PREFIX.length);
      refs.push({
        doc_key: `tn-results:${path.replace(/\.pdf$/i, '')}`, url, kind: 'results',
        sport_hint: sport.sport, professional_hint: sport.professional, event_date: d ? `${d[3]}-${pad(d[1])}-${pad(d[2])}` : null,
        ...(d ? {} : { index_date_raw: dateRaw }), url_year: Number(path.match(/^(\d{4})\//)?.[1]) || null,
        event_type_raw: eventType, city: decode(cells[2]) || null, listed_name: decode(cells[3]) || null, link_label: label, title: `${dateRaw} ${eventType} ${decode(cells[3])}`,
      });
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// result form
// ---------------------------------------------------------------------------

// Column bounds in UPRIGHT form units (612 wide); a rotated page is scaled by width/612.
const COLS = [['bout', 0, 40], ['rds', 40, 62], ['status', 62, 98], ['name', 98, 170], ['private', 170, 232], ['weight', 232, 262],
  ['winner', 262, 300], ['rd', 300, 318], ['time', 318, 340], ['method', 340, 440], ['susp', 440, 1000]];
const HEADER_LABELS = [['STATUS', 66], ['FIGHTER NAME', 106], ['WEIGHT', 233], ['WINNER', 267], ['METHOD', 375], ['SUSPENSIONS', 494]];
const colOf = (x) => COLS.find(([, lo, hi]) => x >= lo && x < hi)?.[0] ?? null;

// Some 2021-2024 sheets embed a subset font whose text map is off by 0x1F ("5,0" is TKO, "\u0012\u0013\u0014\u000f\u0013" is
// 123.2). A shifted item is decoded only when the result is plain printable text: an item with control characters (never
// real text), or a METHOD cell whose decoding is exactly a result word. Decoded items are flagged for provenance.
const METHOD_WORDS = /^(T?KO|RTD|DQ|DRAW|NO CONTEST|UNANIMOUS|SPLIT|MAJORITY|DECISION|(UNANIMOUS|SPLIT|MAJORITY|TECHNICAL) (DECISION|DRAW))$/;
export function decodeShiftedText(s, { methodCell = false } = {}) {
  const shifted = [...s].map((c) => String.fromCharCode(c.charCodeAt(0) + 0x1f)).join('').replace(/\s+/g, ' ').trim();
  if (/[\u0001-\u001f]/.test(s)) return /^[\x20-\x7e]+$/.test(shifted) ? shifted : null;
  return methodCell && METHOD_WORDS.test(shifted) ? shifted : null;
}

function normalize(page) {
  const k = page.width / 612;
  const items = page.items.map((i) => {
    const x = i.x / k;
    const decoded = decodeShiftedText(i.s, { methodCell: x >= 340 && x < 440 });
    return decoded ? { ...i, x, s: decoded, decoded: true } : { ...i, x, s: i.s.replace(/[\u0000-\u001f]/g, '') };
  }).filter((i) => i.s);
  return { ...page, items, marks: (page.marks ?? []).map((m) => ({ ...m, x: m.x / k })) };
}

export function formLayout(page) {
  const headerY = page.items.find((i) => /^BOUT #/.test(i.s) && i.x < 40)?.y ?? page.items.find((i) => i.s === 'FIGHTER NAME')?.y ?? null;
  if (headerY == null) return null;
  const ok = HEADER_LABELS.every(([label, x]) => page.items.some((i) => i.s.replace(/\s+/g, ' ').startsWith(label) && Math.abs(i.x - x) <= 15 && Math.abs(i.y - headerY) <= 3));
  return ok ? { headerY } : null;
}

function headerFields(page) {
  const rows = lines(page.items, { tolerance: 3 });
  const valueRightOf = (label, stopX = 470) => {
    const l = page.items.find((i) => i.s.replace(/\s+/g, ' ').trim().toUpperCase() === label);
    if (!l) return null;
    const row = rows.find((r) => Math.abs(r.y - l.y) <= 3);
    const vals = (row?.items ?? []).filter((i) => i.x > l.x + 20 && i.x < (l.x < 400 ? stopX : 612));
    return vals.map((i) => i.s).join(' ').replace(/\s*\/\s*/g, '/').trim() || null;
  };
  const numbered = (label) => {
    const l = page.items.find((i) => i.s.replace(/\s+/g, ' ').trim().toUpperCase() === label);
    if (!l) return [];
    const out = [];
    const idx = rows.findIndex((r) => Math.abs(r.y - l.y) <= 3);
    for (const r of [rows[idx], rows[idx + 1]].filter(Boolean)) {
      const its = r.items.filter((i) => i.x > l.x + 30 && i.x < 600).sort((a, b) => a.x - b.x);
      if (r !== rows[idx] && !/^[4-6]\.$/.test(its[0]?.s ?? '')) break;
      let slot = null;
      for (const i of its) {
        const num = i.s.match(/^([1-9])\.\s*(.*)$/);
        if (num) { slot = { n: Number(num[1]), name: num[2].trim() }; out.push(slot); } else if (slot) slot.name = `${slot.name} ${i.s}`.trim();
      }
    }
    return out.filter((s) => s.name).map((s) => ({ slot: s.n, name: displayName(s.name) }));
  };
  const title = page.items.filter((i) => i.y > page.items.reduce((m, x) => Math.max(m, x.y), 0) - 40 && /RESULTS|BOXING|KNUCKLE|KICK|MMA|grappling/i.test(i.s) && !/circled/i.test(i.s)).map((i) => i.s).join(' ');
  const date = valueRightOf('DATE:', 612)?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return {
    title, city: valueRightOf('CITY :'), state: valueRightOf('STATE/PROVINCE :'), event_name: valueRightOf('EVENT NAME :'),
    event_date: date ? `${date[3]}-${pad(date[1])}-${pad(date[2])}` : null, venue: valueRightOf('VENUE :', 612), promoter: valueRightOf('PROMOTER :', 612),
    judges: numbered('JUDGE(S):'), referees: numbered('REFEREE(S):'),
  };
}

export function parseTennesseeTime(raw) {
  const m = String(raw ?? '').trim().match(/^(\d{0,2})[.:](\d{2})$/);
  if (!m) return null;
  const s = Number(m[1] || 0) * 60 + Number(m[2]);
  return s > 0 && s <= 300 && Number(m[2]) < 60 ? s : null;
}

export function parseTennesseeMethod(text) {
  const t = String(text ?? '').toLowerCase();
  const decisionType = (t.replace(/\bspilt\b/g, 'split').match(/\b(unanimous|majority|split)\b/) ?? [null])[0];
  if (/no contest|\bnc\b/.test(t)) return { method: 'NO_CONTEST', decision_type: null };
  if (/disqualif|\bdq\b/.test(t)) return { method: 'DQ', decision_type: null };
  if (/technical decision|\btd\b/.test(t)) return { method: 'TECHNICAL_DECISION', decision_type: decisionType };
  if (/\bdraw\b/.test(t)) return { method: 'DECISION', decision_type: decisionType, draw: true };
  if (/decis|decison|decsion/.test(t)) return { method: 'DECISION', decision_type: decisionType };
  if (/\btko\b|technical knock/.test(t)) return { method: 'TKO', decision_type: null };
  if (/\brtd\b|retire/.test(t)) return { method: 'RTD', decision_type: null };
  if (/\bko\b|knock ?out/.test(t)) return { method: 'KO', decision_type: null };
  // "UNANIMOUS" written alone in the cell is a unanimous decision
  if (decisionType) return { method: 'DECISION', decision_type: decisionType };
  return null;
}

// Judges' totals are printed "<judge> x-y" with no fighter label. A bout's lines are read in one order: either the first
// number is fighter A's ("a_first") or fighter B's ("b_first"). An order is accepted only when, under it, the cards
// agree with BOTH published facts, the marked winner and the written decision type: unanimous = every card for the
// winner; majority = the rest for the winner with at least one level card; split = the winner takes more cards than the
// loser, who takes at least one; no type written = no card for the loser. Otherwise (no winner, draw, a line that
// contradicts the decision) the totals stay unattributed. Both orders can never fit the same facts.
export function scoreOrder(cards, winnerSide, decisionType = null) {
  if (!winnerSide || !cards.length) return null;
  const level = cards.filter((c) => c.first === c.second).length;
  const fits = (firstIsA) => {
    const forWinner = cards.filter((c) => c.first !== c.second && ((c.first > c.second) === firstIsA) === (winnerSide === 'a')).length;
    const forLoser = cards.length - level - forWinner;
    if (decisionType === 'unanimous') return forLoser === 0 && level === 0 && forWinner > 0;
    if (decisionType === 'majority') return forLoser === 0 && level > 0 && forWinner > 0;
    if (decisionType === 'split') return forLoser > 0 && forWinner > forLoser;
    return forLoser === 0 && forWinner > 0;
  };
  const a = fits(true);
  const b = fits(false);
  return a && !b ? 'a_first' : b && !a ? 'b_first' : null;
}

// SUSPENSIONS holds a day count plus origin text ("30 | MANDATORY - TKO", "60 | OR CLEARED BY PHYSICIAN"). Only the
// counts are read; the first listed (top) count is the duration, and every listed count is kept in raw.
// The count sub-column (x < 470) is read first; "30 Days by Commission" in the text sub-column repeats it and is only
// read when no count was written.
const suspensionDays = (items) => {
  const countOf = (i) => i.s.match(/^(\d{1,3})(?:\s*days?\b.*)?$/i)?.[1];
  const counted = items.filter((i) => i.x < 470 && countOf(i));
  const days = (counted.length ? counted : items).map(countOf).filter(Boolean).map(Number).filter((d) => d > 0 && d <= 365);
  const indefinite = items.some((i) => /\bindefinite\b/i.test(i.s));
  if (!days.length && !indefinite) return null;
  return { duration_days: days[0] ?? null, indefinite, raw: days.length ? days.map((d) => `${d} days`).join('; ') : 'indefinite' };
};

export function parseTennesseeResults(ref, rawPages, { capturedAt = new Date().toISOString(), sourceRevision = null } = {}) {
  const base = { doc_key: ref.doc_key, kind: 'results', events: [], bouts: [], rejected: [] };
  const pages = rawPages.map(normalize);
  if (!pages.length || pages.every((p) => !p.items.length)) {
    return finalizeParsed({ ...base, minimized: { header: null }, classification: { sport: SPORT.UNKNOWN, professional: null, accepted: false, reason: 'image_only_document: no text layer (scanned sheet)' } });
  }
  // an OCR'd scan has a text layer, but its table rules and radio rings come through as glyph noise ("I", "r-", "(i'",
  // "[!]"): nothing on it (bout numbers, selections, scores) is trusted
  const noise = pages.flatMap((p) => p.items).filter((i) => /^(?:[I|!~\[\]]{1,3}|r-?|\(i'|\[\w{1,2}\]?)$/.test(i.s)).length;
  if (noise >= 12) {
    return finalizeParsed({ ...base, minimized: { header: null }, classification: { sport: SPORT.UNKNOWN, professional: null, accepted: false, reason: `ocr_scan_quarantined: ${noise} glyph-noise items (scanned sheet with an OCR text layer)` } });
  }
  const h = headerFields(pages[0]);
  // the form title names the sport ("BOXING MATCH RESULTS", "BOXING  Team Combat League: ...", "BARE-KNUCKLE ...",
  // "KICKBOXING"); the multi-sport form "(boxing, kickboxing, grappling, etc)" does not say which sport a bout was, so it
  // is refused. A title without a sport word ("TEAM COMBAT LEAGUE RESULTS") falls back to the Commission's index label.
  const formSport = /KNUCKLE/i.test(h.title) ? SPORT.BARE_KNUCKLE : /grappling/i.test(h.title) ? SPORT.OTHER : /KICK/i.test(h.title) ? SPORT.KICKBOXING
    : /\bMMA\b|MIXED/i.test(h.title) ? SPORT.MMA : /\bBOXING\b/i.test(h.title) ? SPORT.BOXING
      : /RESULTS/i.test(h.title) && ref.sport_hint === SPORT.BOXING && ref.professional_hint ? SPORT.BOXING : SPORT.UNKNOWN;
  const nameSport = [h.event_name, h.promoter].map(classifySportLabel).find((s) => [SPORT.BARE_KNUCKLE, SPORT.KICKBOXING, SPORT.MMA, SPORT.POWER_SLAP].includes(s));
  const sport = nameSport ?? formSport;
  if (sport !== SPORT.BOXING) {
    return finalizeParsed({ ...base, minimized: { header: { title: h.title, event_name: h.event_name, event_date: h.event_date } },
      classification: { sport, professional: null, accepted: false, reason: `form "${h.title}" / event "${h.event_name ?? ''}" is not boxing` } });
  }
  if (!formLayout(pages[0])) {
    return finalizeParsed({ ...base, minimized: { header: { title: h.title, event_date: h.event_date } }, classification: { sport, professional: null, accepted: false, reason: 'unsupported_layout: table header does not match the result form' } });
  }
  const eventDate = h.event_date ?? ref.event_date ?? null;
  if (!eventDate) return finalizeParsed({ ...base, minimized: { header: { title: h.title } }, classification: { sport, professional: true, accepted: false, reason: 'no event date' } });
  if (ref.event_date && h.event_date && ref.event_date !== h.event_date) base.rejected.push({ reason: 'index_date_differs_from_sheet', detail: { index: ref.event_date, sheet: h.event_date } });

  const city = h.city ? displayName(h.city) : ref.city ?? null;
  const venue = h.venue ? displayName(h.venue) : null;
  const sourceEventId = `${eventDate}|${slug(city) || 'tn'}|${slug(venue) || slug(h.event_name) || 'unknown'}`;
  const judgeByName = new Map(h.judges.map((j) => [slug(j.name), j]));
  const refereeNames = new Map(h.referees.map((r) => [slug(r.name), r.name]));

  let order = 0;
  for (const page of pages) {
    const layout = formLayout(page);
    if (!layout) continue;
    const body = page.items.filter((i) => i.y < layout.headerY - 4).map((i) => ({ ...i, col: colOf(i.x) })).filter((i) => i.col && i.col !== 'private');
    const marks = (page.marks ?? []).filter((m) => m.y < layout.headerY - 4);
    const rows = lines(body, { tolerance: 2 });
    const anchors = rows.filter((r) => r.items.some((i) => i.col === 'bout' && /^\d{1,2}$/.test(i.s)) && r.items.some((i) => i.col === 'rds' && /^\d{1,2}$/.test(i.s)));
    const nameRows = rows.filter((r) => r.items.some((i) => i.col === 'name'));
    anchors.forEach((anchor, k) => {
      const upper = k > 0 ? (anchors[k - 1].y + anchor.y) / 2 : layout.headerY;
      const lower = anchors[k + 1] ? (anchor.y + anchors[k + 1].y) / 2 : -Infinity;
      const A = nameRows.filter((r) => r.y > anchor.y && r.y <= anchor.y + 20 && r.y < upper).sort((x, y) => x.y - y.y)[0];
      const B = nameRows.filter((r) => r.y < anchor.y && r.y >= anchor.y - 26 && r.y > lower).sort((x, y) => y.y - x.y)[0];
      const boutNo = Number(anchor.items.find((i) => i.col === 'bout').s);
      order += 1;
      if (!A || !B) { base.rejected.push({ reason: 'missing_contestant', detail: { page: page.page, bout: boutNo } }); return; }
      const band = body.filter((i) => i.y < upper && i.y > lower);
      const bandMarks = marks.filter((m) => m.y < upper && m.y > lower);
      const nameOf = (r) => r.items.filter((i) => i.col === 'name').map((i) => i.s).join(' ').trim();
      const weightOf = (r) => { const w = Number(band.filter((i) => i.col === 'weight' && Math.abs(i.y - r.y) <= 3).map((i) => i.s)[0]); return Number.isFinite(w) && w > 0 ? w : null; };
      // STATUS: a professional bout has its mark beside "Pro"
      const statusTexts = band.filter((i) => i.col === 'status' && /^(Pro|Am)$/i.test(i.s));
      const statusMark = bandMarks.filter((m) => colOf(m.x) === 'status');
      const statusOf = statusMark.map((m) => statusTexts.sort((x, y) => Math.abs(x.y - m.y) - Math.abs(y.y - m.y))[0]).filter((t) => t && Math.abs(t.y - statusMark[0].y) <= 6);
      const status = statusOf.length === 1 ? statusOf[0].s.toLowerCase() : statusOf.length ? 'ambiguous' : 'unmarked';
      if (status !== 'pro') { base.rejected.push({ reason: status === 'am' ? 'amateur_bout' : `status_${status}`, detail: { page: page.page, bout: boutNo } }); return; }
      // WINNER: exactly one mark next to one fighter row
      const winMarks = bandMarks.filter((m) => colOf(m.x) === 'winner');
      // each fighter's WINNER radio sits inside that fighter's two-line block (Pro/Am line or name line): a mark counts
      // for the row it is clearly nearer to (within 10 points, and at least 10 points nearer than the other row)
      const sideOf = (m) => { const da = Math.abs(m.y - A.y); const db = Math.abs(m.y - B.y);
        return da <= 10 && db >= da + 10 ? 'a' : db <= 10 && da >= db + 10 ? 'b' : '?'; };
      const sides = [...new Set(winMarks.map(sideOf))];
      const winnerSide = sides.length === 1 && sides[0] !== '?' ? sides[0] : null;
      const winnerNote = !winMarks.length ? 'no_winner_marked' : winnerSide ? 'marked' : 'ambiguous_winner_marks';
      // one text run per METHOD line: pieces that touch are one token ("Troyce Stamey 34-4" + "0" is 34-40)
      const kw = page.width / 612;
      const methodItems = lines(band.filter((i) => i.col === 'method'), { tolerance: 2 }).map((r) => r.items.sort((x, y) => x.x - y.x).reduce((acc, i) => {
        if (!acc) return { ...i, end: i.x + i.w / kw };
        return { ...acc, s: i.x - acc.end < 2.5 ? `${acc.s}${i.s}` : `${acc.s} ${i.s}`, end: i.x + i.w / kw, decoded: acc.decoded || i.decoded };
      }, null)).sort((x, y) => y.y - x.y);
      const methodText = methodItems.map((i) => i.s).join(' ');
      const parsed = parseTennesseeMethod(methodItems.filter((i) => !/^REF(EREE)?\b/i.test(i.s) && !/\d+(\.\d)?\s*-\s*\d+(\.\d)?\s*$/.test(i.s)).map((i) => i.s).join(' ')) ?? parseTennesseeMethod(methodText);
      const refLine = methodItems.map((i) => i.s.match(/^REF(?:EREE)?\s*:?\s+(.+)$/i)?.[1]).find(Boolean) ?? null;
      const referee = refLine ? (refereeNames.get(slug(refLine)) ?? displayName(refLine)) : h.referees.length === 1 ? h.referees[0].name : null;
      const cards = methodItems.map((i) => i.s.replace(/^judges?\s*:\s*/i, '').match(/^(.+?)\s+(\d{1,3}(?:\.\d)?)\s*-\s*(\d{1,3}(?:\.\d)?)$/)).filter(Boolean)
        .map((m) => { const name = m[1].replace(/[\s:\u2013-]+$/, '').trim(); return { judge: displayName(name), key: slug(name), first: Number(m[2]), second: Number(m[3]) }; })
        .filter((c) => !/^ref/i.test(c.judge));
      const rd = Number(band.find((i) => i.col === 'rd' && /^\d{1,2}$/.test(i.s))?.s);
      const time = parseTennesseeTime(band.find((i) => i.col === 'time')?.s);
      const draw = Boolean(parsed?.draw);
      let result = null;
      if (parsed) {
        const nc = parsed.method === 'NO_CONTEST';
        const outcome = nc ? 'no_contest' : draw ? 'draw' : winnerSide ? 'win' : null;
        const decision = parsed.method === 'DECISION' || parsed.method === 'TECHNICAL_DECISION';
        result = { outcome, winner_side: outcome === 'win' ? winnerSide : null, method: parsed.method, decision_type: parsed.decision_type,
          round: decision ? null : (Number.isInteger(rd) && rd > 0 ? rd : null), time_sec: decision ? null : time,
          result_raw: `${methodItems.filter((i) => !/\d-\d/.test(i.s)).map((i) => i.s).join(' ')} | winner mark: ${winnerNote}`.slice(0, 200), resolved: Boolean(outcome) };
        if (!outcome) base.rejected.push({ reason: winnerNote === 'ambiguous_winner_marks' ? 'ambiguous_winner_marks' : 'no_winner_marked', detail: { page: page.page, bout: boutNo } });
      } else {
        base.rejected.push({ reason: methodItems.length ? 'method_unreadable' : 'no_method', detail: { page: page.page, bout: boutNo } });
      }
      const decided = result?.outcome === 'win' && ['DECISION', 'TECHNICAL_DECISION'].includes(result.method);
      const fitted = decided ? scoreOrder(cards, winnerSide, result.decision_type) : null;
      // The form's score lines are written fighter A first (every reviewed sheet but one, 2026-09-14). Lines that only fit the
      // marked winner when read B first mean the WINNER mark or the lines are wrong: the outcome is held, nothing attributed.
      if (fitted === 'b_first') {
        result = { ...result, outcome: null, winner_side: null, resolved: false, result_raw: `${result.result_raw} | score lines contradict the winner mark`.slice(0, 240) };
        base.rejected.push({ reason: 'winner_mark_contradicts_score_lines', detail: { page: page.page, bout: boutNo } });
      }
      const order_ = fitted === 'a_first' ? 'a_first' : null;
      // all or nothing: a bout whose order is not fixed (a draw included) gets no judge totals, not just its level cards
      const inOrder = (c) => (order_ === 'a_first' ? [c.first, c.second] : [null, null]);
      const judges = cards.filter((c) => judgeByName.has(c.key)).map((c) => {
        const j = judgeByName.get(c.key);
        const [a, b] = inOrder(c);
        return { slot: j.slot, name: j.name, source_name: c.judge, a_total: a, b_total: b };
      });
      const suspOf = (r) => suspensionDays(band.filter((i) => i.col === 'susp' && Math.abs(i.y - r.y) < Math.abs(i.y - (r === A ? B.y : A.y))).sort((x, y) => y.y - x.y));
      const rounds = Number(anchor.items.find((i) => i.col === 'rds').s);
      base.bouts.push({
        source_key: TENNESSEE.sourceKey, source_event_id: sourceEventId, source_bout_id: null, bout_order: boutNo || order, sport: SPORT.BOXING, professional: true,
        fighter_a: { source_name: nameOf(A), display_name: displayName(nameOf(A)), hometown: null, weight_lb: weightOf(A), corner: null },
        fighter_b: { source_name: nameOf(B), display_name: displayName(nameOf(B)), hometown: null, weight_lb: weightOf(B), corner: null },
        scheduled_rounds: Number.isInteger(rounds) && rounds > 0 ? rounds : null, result,
        referee, judges, score_order_raw: fitted === 'b_first' ? 'conflict_b_first' : order_,
        // totals whose fighter order is known but whose line names no listed judge are published as totals only; lines whose
        // order is not fixed are kept as printed for review and never published
        score_totals_unattributed: order_ && judges.length < cards.length ? cards.map((c) => { const [a, b] = inOrder(c); return { a, b }; }) : null,
        score_lines_unresolved: cards.length && !order_ && cards.some((c) => c.first !== c.second) ? cards.map((c) => ({ judge: c.judge, first: c.first, second: c.second })) : null,
        officials_assignment: { referee: refLine ? 'ref_line' : referee ? 'single_listed_referee' : 'none', judges: cards.length ? `score_lines_${judges.length}_of_${cards.length}_listed` : 'none' },
        deductions: [], title_remarks: [],
        suspensions: [['a', A], ['b', B]].map(([s, r]) => [s, suspOf(r)]).filter(([, x]) => x).map(([s, x]) => ({ side: s, ...x })),
        debut: { a: null, b: null }, source_url: ref.url, source_revision: sourceRevision, provenance: { document_key: ref.doc_key, page: page.page, bout_number: boutNo, ...(band.some((i) => i.decoded) ? { text_decoding: 'glyph_offset_0x1f' } : {}) },
      });
    });
  }
  if (!base.bouts.length) {
    // an OCR'd scan keeps the words but not the drawn radio selections: STATUS and WINNER cannot be read from it
    const drawn = pages.some((p) => formLayout(p) && p.marks.length);
    return finalizeParsed({ ...base, minimized: { header: { title: h.title, event_date: eventDate } },
      classification: { sport, professional: true, accepted: false, reason: drawn ? 'no professional boxing bout on the form' : 'radio_marks_unreadable: scanned sheet without drawn selections (quarantined)' } });
  }
  const promoter = h.promoter ? displayName(h.promoter) : null;
  base.events.push({
    source_key: TENNESSEE.sourceKey, jurisdiction: TENNESSEE.jurisdiction.code, source_event_id: sourceEventId, event_date: eventDate, start_at: null,
    venue: { name: venue, city, region: 'TN', country_code: 'US' }, promoters: promoter ? [promoter] : [],
    event_type_raw: ref.event_type_raw ?? h.title, sport: SPORT.BOXING, professional: true, status: 'complete', broadcast: null, source_url: ref.url,
    document_key: ref.doc_key, source_revision: sourceRevision, captured_at: capturedAt,
  });
  assignBoutIds(base.bouts);
  const minimized = { header: { event_name: h.event_name, event_date: eventDate, city, venue, promoter, judges: h.judges.map((j) => j.name), referees: h.referees.map((r) => r.name) },
    bouts: base.bouts.map((b) => ({ bout: b.bout_order, a: b.fighter_a.source_name, b: b.fighter_b.source_name, rounds: b.scheduled_rounds, result: b.result?.result_raw ?? null })) };
  return finalizeParsed({ ...base, minimized, classification: { sport: SPORT.BOXING, professional: true, accepted: true, reason: 'Tennessee boxing match results form' } });
}
