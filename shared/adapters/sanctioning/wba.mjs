// WBA dry-run parser: https://www.wbaboxing.com/wba-ranking and /current-wba-champions (server-rendered HTML).
// Pure functions over HTML text; no fetch, no storage. Commented-out markup is not published content and is removed
// first (the ranking page carries a "CHAMPION IN RECESS" row inside an HTML comment).

import { countryCode, designationOf, divisionOf, VACANT_WORDS } from './vocabulary.mjs';

const decode = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#8217;|&#039;/g, "'").replace(/\s+/g, ' ').trim();
const uncomment = (html) => String(html).replace(/<!--[\s\S]*?-->/g, '');
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// "August 31st, 2026" -> 2026-08-31
export function wbaDate(text) {
  const m = String(text ?? '').match(/\b([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toUpperCase()) + 1;
  return month ? `${m[3]}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

export function parseWbaRankingPage(html) {
  const page = uncomment(html);
  const asOf = decode(page.match(/Ranking\s+as of\s*([A-Z]+\s+\d{4})/i)?.[1] ?? '') || null;
  const published = wbaDate(decode(page.match(/Download WBA Rankings[\s\S]{0,400}?([A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})/)?.[1] ?? ''));
  const divisions = [];
  const heads = [...page.matchAll(/<div class="col-12 col-sm-6 hidden-xs text-left">\s*<a[^>]*href="#(division\d+)"[\s\S]*?<span>([\s\S]*?)<\/span>\s*<\/a>\s*<\/div>\s*<div class="col-12 col-sm-6 hidden-xs">\s*<span class="text-center">([\s\S]*?)<\/span>/g)];
  for (const h of heads) {
    const [, anchor, labelHtml, limitHtml] = h;
    const start = page.indexOf(`<div class="collapse" id="${anchor}">`);
    if (start < 0) continue;
    const next = page.indexOf('<div class="collapse" id="division', start + 30);
    const block = page.slice(start, next < 0 ? undefined : next);
    const tables = [...block.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)].map((t) => t[1]);
    const label = decode(labelHtml);
    const champions = [];
    for (const row of [...(tables[0] ?? '').matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((r) => r[1])) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
      if (cells.length < 3) continue;
      const nameHtml = cells[1];
      const name = decode(nameHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? nameHtml.replace(/<span[\s\S]*$/, ''));
      const lines = cells[2].split(/<br\s*\/?>/i).map(decode).filter(Boolean);
      const own = lines.filter((l) => /^WBA\b|^CHAMPION IN RECESS$/i.test(l));
      champions.push({
        source_name: VACANT_WORDS.test(name) ? null : name, vacant: VACANT_WORDS.test(name),
        country: decode(nameHtml.match(/<span[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '') || null,
        wba_id: nameHtml.match(/wba-boxer-profile\/\?id=(\d+)/)?.[1] ?? null,
        designations: own.map((l) => designationOf('wba', l)),
        // "WBO-IBF CHAMPION" on the WBA page is the WBA's statement about other bodies, not a WBA title
        claims_about_other_bodies: lines.filter((l) => !own.includes(l)).flatMap((l) => (l.match(/^([A-Z-]+)\s+CHAMPION$/)?.[1] ?? '').split('-').filter(Boolean)
          .map((org) => ({ about: org.toLowerCase(), native_text: l }))),
      });
    }
    const rankTable = tables[1] ?? '';
    const other = rankTable.match(/class="otherorgs[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? '';
    const otherBodies = [...other.matchAll(/<span>\s*(WBC|IBF|WBO)\s*<\/span>\s*<span>([\s\S]*?)<\/span>/g)]
      .map((m) => ({ about: m[1].toLowerCase(), source_name: VACANT_WORDS.test(decode(m[2])) ? null : decode(m[2]), vacant: VACANT_WORDS.test(decode(m[2])), native_text: `${m[1]} ${decode(m[2])}` }));
    const entries = [];
    for (const row of [...rankTable.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((r) => r[1])) {
      if (/otherorgs/.test(row)) continue;
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
      // an unfilled position is printed as one wide cell: "1 | NOT RATED" or, on older lists, "1 | OFFICIAL CHALLENGER VACANT"
      // (colspan=3). Kept as an unfilled slot with the words as printed; any other wide-cell text is not read.
      if (cells.length === 2 && /^\d+$/.test(decode(cells[0])) && /^not\s+rated$|\bvacant\b/i.test(decode(cells[1]))) {
        entries.push({ position: Number(decode(cells[0])), rank_label: decode(cells[0]), source_name: null, not_rated: true, slot_text: decode(cells[1]), wba_id: null, regional_label: null, country: null });
        continue;
      }
      if (cells.length < 4 || !/^\d+$/.test(decode(cells[0]))) continue;
      entries.push({ position: Number(decode(cells[0])), rank_label: decode(cells[0]), source_name: decode(cells[1]) || null,
        wba_id: cells[1].match(/wba-boxer-profile\/\?id=(\d+)/)?.[1] ?? null, regional_label: decode(cells[2]) || null, country: countryCode(decode(cells[3])) ?? (decode(cells[3]) || null) });
    }
    divisions.push({ division: { ...divisionOf('wba', label), limit_text: decode(limitHtml) }, champions, claims_about_other_bodies: otherBodies, entries });
  }
  return { body: 'wba', document: 'ranking', as_of_label: asOf, published_on: published, divisions };
}

// /current-wba-champions: world tab rows "division | NAME / Country | record | designation"
export function parseWbaChampionsPage(html) {
  const page = uncomment(html);
  // the WORLD tab is rendered first; a division name seen a second time starts the next tab (female, regional)
  const text = page.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|td)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && l !== '|');
  const DIVISION_LINE = /^(atomweight|minimumweight|light flyweight|flyweight|super flyweight|bantamweight|super bantamweight|featherweight|super featherweight|lightweight|super lightweight|welterweight|super welterweight|middleweight|super middleweight|light heavyweight|cruiserweight|bridgerweight|heavyweight)$/i;
  const tabs = text.indexOf('IBEROAMERICAN & MEDITERRANEAN');
  const startAt = text.findIndex((l, i) => i > tabs && DIVISION_LINE.test(l));
  const rows = [];
  const seen = new Set();
  let division = null;
  for (let i = startAt; i >= 0 && i < text.length; i++) {
    const l = text[i];
    if (DIVISION_LINE.test(l)) {
      if (seen.has(l.toLowerCase())) break;
      seen.add(l.toLowerCase());
      division = l; continue;
    }
    if (!division) continue;
    const rec = text[i + 2]?.match(/^(\d+-\d+-\d+)/);
    const des = text[i + 3];
    if (rec && des && /^(WBA|Interim WBA|Champion in recess)/i.test(des)) {
      rows.push({ division: divisionOf('wba', division.toUpperCase()), source_name: l, country: text[i + 1], record_as_printed: rec[1], designation: designationOf('wba', des) });
      i += 3;
    } else if (VACANT_WORDS.test(l) && text[i + 1] && /^(WBA|Interim WBA)/i.test(text[i + 1])) {
      rows.push({ division: divisionOf('wba', division.toUpperCase()), source_name: null, vacant: true, designation: designationOf('wba', text[i + 1]) });
      i += 1;
    }
  }
  return { body: 'wba', document: 'champions', rows };
}
