// WBO dry-run parsers: the male world ratings PDF (dompdf, text layer) linked from https://wboboxing.com/rankings/, and
// the male champions page https://wboboxing.com/male-champions/. Pure functions over extracted text / HTML.
//
// Ratings PDF layout per division: label, limits, "N. Name (Regional)? (CCC)" x15, "** Name ..." regional champions
// outside the numbered list, then the WBO's lines about the other bodies ("NAME WBA", "VACANT IBF", " IBF" = blank),
// then "CHAMPIONS" and the WBO champion(s) ("NAME (Interim) (CCC)", "NAME (Sup. Champion) (CCC)").

import { DIVISIONS, countryCode, designationOf, divisionOf, VACANT_WORDS } from './vocabulary.mjs';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function longDate(text) {
  const m = String(text ?? '').match(/\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/);
  const mo = m ? MONTHS.indexOf(m[1].toLowerCase()) + 1 : 0;
  return mo ? `${m[3]}-${String(mo).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

const LABELS = new Set(Object.keys(DIVISIONS.wbo));
const trailing = (s) => {
  let name = s.trim();
  const country = countryCode(name);
  if (country) name = name.replace(/\s*\([A-Z]{3}\)\s*$/, '');
  const notes = [];
  for (let m = name.match(/\s*\(([^()]+)\)\s*$/); m; m = name.match(/\s*\(([^()]+)\)\s*$/)) { notes.unshift(m[1].trim()); name = name.slice(0, m.index).trim(); }
  return { name, country, notes };
};

export function parseWboRatingsText(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && !/^=+PAGE=+$/.test(l));
  const asOf = longDate(lines.find((l) => /^As of /i.test(l)));
  const divisions = [];
  let cur = null;
  let mode = null;
  for (const [n, line] of lines.entries()) {
    // a division starts at its label, which is always followed by its limits line; an unknown label still opens a
    // division (weight_class_key null, flagged) so its lines are never merged into the previous division
    if (LABELS.has(line) || (/^[A-Z][A-Z .-]+$/.test(line) && /^\(.*lbs\)/i.test(lines[n + 1] ?? ''))) { cur = { division: { ...divisionOf('wbo', line), limit_text: null }, entries: [], outside_numbered_list: [], claims_about_other_bodies: [], champions: [] }; divisions.push(cur); mode = 'limits'; continue; }
    if (!cur) continue;
    if (mode === 'limits' && /^\(.*lbs/i.test(line)) { cur.division.limit_text = line; mode = 'ratings'; continue; }
    const rank = line.match(/^(\d{1,2})\.\s+(.+)$/);
    if (rank && mode !== 'champions') {
      const t = trailing(rank[2]);
      cur.entries.push({ position: Number(rank[1]), rank_label: rank[1], source_name: t.name, country: t.country, regional_label: t.notes.join(' ') || null });
      continue;
    }
    const star = line.match(/^\*\*\s+(.+)$/);
    if (star && mode !== 'champions') { const t = trailing(star[1]); cur.outside_numbered_list.push({ rank_label: '**', source_name: t.name, country: t.country, regional_label: t.notes.join(' ') || null }); continue; }
    if (line === 'CHAMPIONS') { mode = 'champions'; continue; }
    const other = line.match(/^(.*?)\s*\b(WBA|IBF|WBC)$/);
    if (other && mode !== 'champions') {
      const raw = other[1].replace(/\s*\((WBA|IBF|WBC)\)\s*$/, '').trim();
      cur.claims_about_other_bodies.push({ about: other[2].toLowerCase(), source_name: raw && !VACANT_WORDS.test(raw) ? raw : null, vacant: VACANT_WORDS.test(raw), blank: !raw, native_text: line });
      continue;
    }
    if (mode === 'champions') {
      const t = trailing(line);
      const label = t.notes.find((n) => /interim|sup\.?\s*champion|super champion/i.test(n)) ?? 'CHAMPION';
      cur.champions.push({ source_name: VACANT_WORDS.test(t.name) ? null : t.name, vacant: VACANT_WORDS.test(t.name), country: t.country, designation: designationOf('wbo', label), notes: t.notes });
    }
  }
  return { body: 'wbo', document: 'ratings', as_of: asOf, divisions };
}

// male champions page: each card is "[INTERIM]", "<limit> LBS" (none for heavyweight), the division, the name (split over
// several elements), "Fighter Profile", then "Last WBO Title Defense:", "Next Mandatory:", "WBO History:",
// "Champion since:", "Previous champion:", "Number of Defenses:". Record/country lines after a card are unreliable
// (they line up with the next card) and are not read.
export function parseWboChampionsPage(html) {
  const lines = String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|td|span|a)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#8217;|&#8242;/g, "'").replace(/&amp;/g, '&')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const cards = [];
  for (let i = 0; i < lines.length; i++) {
    const label = lines[i].replace(/^\d+ LBS /, '');
    if (!LABELS.has(label)) continue;
    const profile = lines.indexOf('Fighter Profile', i + 1);
    if (profile < 0 || profile - i > 6) continue;
    const end = lines.findIndex((l, k) => k > profile && l.startsWith('Number of Defenses:'));
    if (end < 0) continue;
    const card = lines.slice(profile, end + 1);
    const field = (name) => card.find((l) => l.startsWith(`${name}:`))?.slice(name.length + 1).trim() || null;
    const before = lines[i - 1] === 'INTERIM' || (/^\d+ LBS$/.test(lines[i - 1]) && lines[i - 2] === 'INTERIM');
    cards.push({
      division: divisionOf('wbo', label), source_name: lines.slice(i + 1, profile).join(' '),
      designation: designationOf('wbo', before ? 'INTERIM CHAMPION' : 'CHAMPION'),
      champion_since_on: longDate(field('Champion since')), champion_since_as_printed: field('Champion since'),
      previous_champion_as_printed: field('Previous champion'), last_defense_on: longDate(field('Last WBO Title Defense')),
      next_mandatory_as_printed: field('Next Mandatory'), defenses_as_printed: field('Number of Defenses'),
    });
    i = end;
  }
  return { body: 'wbo', document: 'champions', cards };
}

// Monthly history: POST /rankings/ (req_ORG=World Boxing Organization, req_year, req_month, req_category=ALL,
// req_genre=M) answers an HTML page "WORLD BOXING ORGANIZATION MALE RANKING <MONTH> <YEAR>" with one table per division:
// a "title-weight" header, rows "CHAMPION | name | country", "Interim | ...", "<n> | name (regional) | country",
// "** | ...", then two-cell rows "WBA | NAME" (the WBO's statement about other bodies).
export function parseWboHistoryHtml(html) {
  const page = String(html);
  const heading = page.match(/<h1>\s*WORLD BOXING ORGANIZATION MALE RANKING\s+([A-Z]+)\s+(\d{4})\s*<\/h1>/i);
  const month = heading ? MONTHS.indexOf(heading[1].toLowerCase()) + 1 : 0;
  const cell = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#8217;/g, "'").replace(/\s+/g, ' ').trim();
  const divisions = [];
  for (const t of [...page.matchAll(/<table class="(ranking[^"]*)"[^>]*>([\s\S]*?)<\/table>/g)].map((m) => [m[0], m[2], m[1]])) {
    const head = cell(t[1].match(/class="title-weight[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? '');
    const label = head.replace(/\s*\(.*$/, '').trim();
    // the "other-org" table after a division carries the WBO's lines about the other bodies for that division
    const d = /other-org/.test(t[2]) && divisions.length ? divisions.at(-1)
      : { division: { ...divisionOf('wbo', label), limit_text: head.slice(label.length).trim() || null }, entries: [], outside_numbered_list: [], claims_about_other_bodies: [], champions: [] };
    for (const r of t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => cell(c[1]));
      if (cells.length === 3 && cells[0] !== 'Title') {
        const t2 = trailing(`${cells[1]}${cells[2] ? ` (${cells[2]})` : ''}`);
        if (/^\d{1,2}$/.test(cells[0])) d.entries.push({ position: Number(cells[0]), rank_label: cells[0], source_name: t2.name, country: t2.country, regional_label: t2.notes.join(' ') || null });
        else if (cells[0] === '**') d.outside_numbered_list.push({ rank_label: '**', source_name: t2.name, country: t2.country, regional_label: t2.notes.join(' ') || null });
        else d.champions.push({ source_name: VACANT_WORDS.test(t2.name) ? null : t2.name, vacant: VACANT_WORDS.test(t2.name), country: t2.country, designation: designationOf('wbo', cells[0]), notes: t2.notes });
      } else if (cells.length === 2 && /^(WBA|IBF|WBC)$/.test(cells[0])) {
        const name = cells[1].replace(/\s*\((WBA|IBF|WBC)\)\s*$/, '').trim();
        d.claims_about_other_bodies.push({ about: cells[0].toLowerCase(), source_name: name && !VACANT_WORDS.test(name) ? name : null, vacant: VACANT_WORDS.test(name), blank: !name, native_text: `${cells[0]} ${cells[1]}`.trim() });
      }
    }
    if (label && !/other-org/.test(t[2])) divisions.push(d);
  }
  return { body: 'wbo', document: 'ratings_history', as_of_label: heading ? `${heading[1].toUpperCase()} ${heading[2]}` : null,
    month: month ? `${heading[2]}-${String(month).padStart(2, '0')}` : null, divisions };
}
