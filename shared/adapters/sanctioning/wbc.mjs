// WBC parsers (owner authorization 2026-09-15): pure functions over already-fetched public documents.
//
// 1. Main ratings page https://wbcboxing.com/main-ratings-es/ : "CAMPEONES DEL MUNDO" grid (men's grid first), one card
//    per division with the champion's name (or "Vacant") and the Spanish division, plus the link to the month's male
//    ratings PDF (https://wbcboxing.com/mailing/<year>/WBC_RATINGS_<MONTH>_<year>.pdf, "DESCARGAR RATINGS").
// 2. Ratings PDF, one page per division. Its text layer comes out of reading order, so the page is rebuilt from item
//    positions (unpdf getTextContent): the header "HEAVYWEIGHT (+224 - +101.605)", a title block above "Contenders:"
//    ("CHAMPION: NAME (COUNTRY)", "INTERIM CHAMPION:", "CHAMPION IN RECESS:", "WBC SILVER CHAMPION:", "WBC INT. CHAMPION:",
//    "WON TITLE:", "LAST DEFENCE:", "LAST COMPULSORY:", and the WBC's lines about other bodies "IBF CHAMPION:" /
//    "WBO CHAMPION:"), then rank numbers 1..40 in a narrow left column paired by vertical position with names
//    "Name (Country) TAG" in the next column. A right-hand column (continental/affiliated champions, the NA list) is
//    not part of the WBC world title or ranking and is not read.

import { designationOf, divisionOf, VACANT_WORDS } from './vocabulary.mjs';

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const decode = (s) => String(s ?? '').replace(/&#0?39;|&#8217;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const longDate = (s) => {
  const m = String(s ?? '').match(/\b([A-Za-z]+)\s*(\d{1,2}),?\s*(\d{4})\b/);
  const mo = m ? MONTHS.indexOf(m[1].toUpperCase()) + 1 : 0;
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
};

// "Rico Verhoeven (Netherlands) *CBP/P" -> name, country as printed, tag as printed
export function wbcPerson(text) {
  const t = decode(text);
  const m = t.match(/^(.*?)\s*\(([^()]*)\)\s*(.*)$/);
  if (!m) return { source_name: t || null, country_label: null, tag: null };
  return { source_name: m[1].trim() || null, country_label: m[2].trim() || null, tag: m[3].trim() || null };
}

const OTHER_BODY = /^(WBA|IBF|WBO)\s+CHAMPION$/;
const RIGHT_COLUMN_X = 390;

// pages: [{ items: [{ s, x, y }] }] with y growing upwards (PDF user space)
export function parseWbcRatingsPages(pages) {
  const all = pages.flatMap((p) => p.items);
  const label = all.map((i) => fold(i.s)).find((s) => /^RATINGS AS OF [A-Z]+ \d{4}/i.test(s));
  const lm = label?.match(/^RATINGS AS OF ([A-Z]+) (\d{4})/i);
  const month = lm && MONTHS.includes(lm[1].toUpperCase()) ? `${lm[2]}-${String(MONTHS.indexOf(lm[1].toUpperCase()) + 1).padStart(2, '0')}` : null;
  const divisions = [];
  for (const [n, page] of pages.entries()) {
    // f: accent-folded text for matching labels ("WBO CHAMPÌON" is printed); s: the text as printed, kept for names
    const items = page.items.map((i) => ({ ...i, s: decode(i.s), f: fold(i.s) })).filter((i) => i.s);
    const header = items.find((i) => /^[A-Z .]+?\.?-?\s*\(\s*\+?[\d.]+\s*-\s*\+?[\d.]+\s*\)$/.test(i.f));
    const contenders = items.find((i) => /^Contenders:?$/i.test(i.f));
    if (!header || !contenders) continue;
    const native = header.s.replace(/\s*\(.*$/, '').replace(/[.\s-]+$/, '').trim();
    const d = { page: n + 1, division: { ...divisionOf('wbc', native), native_label: native, limit_text: header.s.slice(header.s.indexOf('(')) },
      champions: [], claims_about_other_bodies: [], entries: [], problems: [], printed: {} };

    // title block: left column, above "Contenders:"
    for (const it of items.filter((i) => i.y > contenders.y && i.x < RIGHT_COLUMN_X && i !== header && i.s.includes(':')).sort((a, b) => b.y - a.y)) {
      const idx = it.s.indexOf(':');
      const key = fold(it.s.slice(0, idx)).toUpperCase();
      const value = it.s.slice(idx + 1).trim();
      if (/^(WON TITLE|LAST DEFEN[CS]E|LAST COMPULSORY)$/.test(key)) { d.printed[key.replace('DEFENSE', 'DEFENCE')] = value || null; continue; }
      if (OTHER_BODY.test(key)) {
        const p = wbcPerson(value);
        d.claims_about_other_bodies.push({ about: key.split(' ')[0].toLowerCase(), source_name: VACANT_WORDS.test(value) ? null : p.source_name, vacant: VACANT_WORDS.test(value), blank: !value, native_text: it.s });
        continue;
      }
      if (!/CHAMPION/.test(key)) continue;
      const p = wbcPerson(value);
      const vacant = VACANT_WORDS.test(value);
      // a WBC title line with no name printed: its silver / international lines say nothing and are skipped; a blank
      // CHAMPION line is kept as "not stated" (never read as vacant)
      if (!value && key !== 'CHAMPION') continue;
      d.champions.push({ designation: designationOf('wbc', key), native_line: it.s, source_name: vacant || !value ? null : p.source_name, country: p.country_label,
        tag: p.tag, vacant, holder_unknown: !value, y: it.y });
    }
    // WON TITLE / LAST DEFENCE belong to the one full champion line; with several champions they are not attached
    const full = d.champions.filter((c) => c.designation.native?.toUpperCase() === 'CHAMPION');
    if (full.length === 1 && full[0].source_name) {
      full[0].won_title_on = longDate(d.printed['WON TITLE']);
      full[0].last_defence_on = longDate(d.printed['LAST DEFENCE']);
    }

    // ranking: rank numbers sit left of the name column; name-column items on one printed row (a tag can be a separate
    // item, e.g. "Emiliano Vargas (US)" + "USWBC") are joined. A row that starts far right of the name column is not a
    // ranking row (the September 2026 file carries stray "WBO CHAMPION: ..." text there). A number with no name row is a
    // position the WBC left blank.
    const numbers = items.filter((i) => i.y < contenders.y && i.x < 72 && /^\d{1,2}$/.test(i.s)).sort((a, b) => b.y - a.y);
    const cells = items.filter((i) => i.y < contenders.y && i.x >= 72 && i.x < RIGHT_COLUMN_X && !/^(www\.|Note:|↑)/i.test(i.s) && !/^\d+$/.test(i.s)).sort((a, b) => b.y - a.y || a.x - b.x);
    const rows = [];
    for (const c of cells) {
      const row = rows.find((r) => Math.abs(r.y - c.y) <= 3);
      if (row) row.parts.push(c); else rows.push({ y: c.y, parts: [c] });
    }
    for (const r of rows) { r.parts.sort((a, b) => a.x - b.x); r.x = r.parts[0].x; r.text = r.parts.map((q) => q.s).join(' '); }
    const nameRows = rows.filter((r) => r.x <= 100);
    const used = new Set();
    for (const [k, num] of numbers.entries()) {
      if (Number(num.s) !== k + 1) { d.problems.push(`rank numbers out of order at ${num.s}`); break; }
      const row = nameRows.filter((r) => !used.has(r) && Math.abs(r.y - num.y) <= 5).sort((a, b) => Math.abs(a.y - num.y) - Math.abs(b.y - num.y))[0];
      if (!row) { d.entries.push({ position: k + 1, rank_label: num.s, source_name: null, not_rated: true, printed_blank: true }); continue; }
      used.add(row);
      const p = wbcPerson(row.text);
      d.entries.push({ position: k + 1, rank_label: num.s, source_name: p.source_name, country: p.country_label, country_label: p.country_label, regional_label: p.tag });
    }
    const unplaced = nameRows.filter((r) => !used.has(r));
    if (unplaced.length) d.problems.push(`${unplaced.length} name rows without a rank number (${unplaced.slice(0, 2).map((r) => r.text).join('; ')})`);
    if (!numbers.length) d.problems.push('no rank numbers');
    divisions.push(d);
  }
  return { body: 'wbc', document: 'ratings', as_of_label: lm ? `${lm[1].toUpperCase()} ${lm[2]}` : null, month, divisions };
}

// the men's "CAMPEONES DEL MUNDO" grid on the main ratings page
export function parseWbcChampionsPage(html) {
  const page = String(html);
  const start = page.indexOf('data-alias="champions-man-es"');
  const end = start >= 0 ? page.indexOf('</article>', page.indexOf('<ul', start)) : -1;
  const grid = start >= 0 ? page.slice(start, end > start ? end : undefined) : '';
  const cards = [];
  for (const li of grid.matchAll(/<li\b[^>]*class="[^"]*filter-([a-z0-9-]+)[^"]*"[^>]*>([\s\S]*?)<\/li>/g)) {
    const name = decode(li[2].match(/class="eg-tyler-element-3[^"]*"[^>]*>([\s\S]*?)<\/a>/)?.[1]?.replace(/<[^>]+>/g, ''));
    const division = decode(li[2].match(/rel="category tag">([\s\S]*?)<\/a>/)?.[1]);
    const profile = li[2].match(/href="(https:\/\/wbcboxing\.com\/en\/[a-z0-9-]+\/)"/)?.[1] ?? null;
    if (!division) continue;
    cards.push({ division: { ...divisionOf('wbc', division), native_label: division }, source_name: VACANT_WORDS.test(name) ? null : name || null, vacant: VACANT_WORDS.test(name),
      designation: designationOf('wbc', 'CAMPEONES DEL MUNDO'), division_page: profile });
  }
  return { body: 'wbc', document: 'champions', cards };
}

// the month's men's ratings PDF linked from the page (exactly one), never a guessed file name
export function wbcRatingsLinks(html) {
  return [...new Set([...String(html).matchAll(/href="(https:\/\/wbcboxing\.com\/mailing\/[^"]+\.pdf)"/gi)].map((m) => m[1])
    .filter((u) => /rating/i.test(u) && !/female|femenil/i.test(u)))];
}
