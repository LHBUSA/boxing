// Commission title remarks -> world-title lineages at stake in a bout. Pure.
//
// Nevada and New Jersey result sheets print a free-text remark per bout, e.g. "Benavidez wins WBA Super & WBO Cruiserweight
// Titles", "Blancas wins Vacant US WBC Super Middleweight Title", "IBF North American Championship Title". A remark is the
// commission's own statement that a belt was on the line; it is mapped to a lineage only when it is unambiguous:
//   * an organization token (WBC, WBA, IBF, WBO) is printed;
//   * nothing marks a regional, secondary or women's belt (US, NABF, Latino, Continental, Silver, Youth, Intercontinental,
//     Global, International, ...) - any such word skips the whole remark, never guessed per organization;
//   * WBA needs "Super" (super) or "World"/"Regular" (regular); a bare "WBA" is two possible lineages and is skipped;
//   * "Interim" with exactly one organization is that organization's interim belt; with several it is skipped;
//   * "Undisputed" / "Unified" wording contributes nothing beyond the organizations it names.
// Everything else is left to review, and the remark itself stays in the stored observation.

const ORG = /\b(WBC|WBA|IBF|WBO)\b/g;
const SECONDARY = /\b(US|USA|USBA|USNBC|NABF|NABO|NABA|North\s+American|Latino|Latin|Hispanic|Continental|Americas?|Intercontinental|Inter-?Continental|International|Int'?l|INTL|Global|Youth|Silver|Gold|Diamond|Eternal|Emeritus|Franchise|Asia|Asian|Oriental|Pacific|Mediterranean|Baltic|Francophone|Fecarbox|Fedecentro|Fedelatin|Fedebol|Feconsur|European?|EBU|Commonwealth|African?|Oceania|Austral-?asian|Eurasia|Regional|Women'?s?|Female|Ladies|Legacy|Eliminator|Elimination|Final\s+Eliminator|State|National)\b/i;
const WBA_SUPER = /\bWBA\s+(?:&\s*)?Super\b(?!\s*(?:middle|welter|light|feather|bantam|fly))/i;
const WBA_REGULAR = /\bWBA\s+(?:World|Regular)\b/i;

export function parseTitleRemark(remark) {
  const text = String(remark ?? '').replace(/\s+/g, ' ').trim();
  const orgs = [...new Set([...text.toUpperCase().matchAll(ORG)].map((m) => m[1].toLowerCase()))];
  if (!orgs.length) return { remark: text, titles: [], skipped: 'no_sanctioning_body' };
  if (SECONDARY.test(text)) return { remark: text, titles: [], skipped: 'regional_or_secondary_wording' };
  const interim = /\binterim\b/i.test(text);
  if (interim && orgs.length > 1) return { remark: text, titles: [], skipped: 'interim_with_several_bodies' };
  const titles = [];
  const skipped = [];
  for (const org of orgs) {
    let tier = interim ? 'interim' : org === 'wba' ? null : 'world';
    if (org === 'wba' && !interim) tier = WBA_SUPER.test(text) ? 'super' : WBA_REGULAR.test(text) ? 'regular' : null;
    if (!tier) { skipped.push(`${org}:lineage_not_stated`); continue; }
    titles.push({ organization_slug: org, tier, source_native_label: text });
  }
  return { remark: text, titles, skipped: skipped.length ? skipped.join(',') : null };
}

// all remarks of a bout -> the distinct lineages (organization + tier) any remark states unambiguously
export function titlesFromRemarks(remarks) {
  const out = new Map();
  for (const r of remarks ?? []) for (const t of parseTitleRemark(r).titles) if (!out.has(`${t.organization_slug}:${t.tier}`)) out.set(`${t.organization_slug}:${t.tier}`, t);
  return [...out.values()];
}
