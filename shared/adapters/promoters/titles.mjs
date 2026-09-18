// Title stakes exactly as a promoter announces them, resolved only when the announcement is unambiguous.
//
// Rules:
//   * a canonical title needs an organization we model (WBC, WBA, IBF, WBO) AND a tier we model AND a division;
//     anything else is kept verbatim as unresolved, never invented and never dropped silently
//   * "British", "Commonwealth", "European" and the like are real titles with no canonical organization in our graph
//     yet, so they stay unresolved with their exact wording
//   * an eliminator is not a title at stake
//   * nothing is inferred from branding, imagery or an event name

const ORGS = { wbc: "wbc", wba: "wba", ibf: "ibf", wbo: "wbo" };
// the tier vocabulary boxing_titles accepts
const WORLD_TIERS = { interim: "interim", super: "super", regular: "regular", silver: "silver", gold: "gold", diamond: "diamond", franchise: "franchise" };
// secondary lanes a body runs that are NOT its world title; we model them as regional
const SECONDARY = /\b(international|intercontinental|continental|inter-?continental|latino|nabf|nabo|naba|usba|youth)\b/i;
const ELIMINATOR = /\b(eliminator|final eliminator)\b/i;

const DIVISIONS = [
  ["super lightweight", "super_lightweight"], ["junior welterweight", "super_lightweight"], ["light welterweight", "super_lightweight"],
  ["super welterweight", "super_welterweight"], ["junior middleweight", "super_welterweight"], ["light middleweight", "super_welterweight"],
  ["super middleweight", "super_middleweight"], ["super featherweight", "super_featherweight"], ["junior featherweight", "super_bantamweight"],
  ["super bantamweight", "super_bantamweight"], ["super flyweight", "super_flyweight"], ["junior flyweight", "light_flyweight"],
  ["light flyweight", "light_flyweight"], ["light heavyweight", "light_heavyweight"], ["cruiserweight", "cruiserweight"],
  ["bridgerweight", "bridgerweight"], ["heavyweight", "heavyweight"], ["middleweight", "middleweight"], ["welterweight", "welterweight"],
  ["lightweight", "lightweight"], ["featherweight", "featherweight"], ["bantamweight", "bantamweight"], ["flyweight", "flyweight"],
  ["minimumweight", "minimumweight"], ["strawweight", "minimumweight"], ["atomweight", "atomweight"],
];

// longest label first so "super welterweight" never matches as "welterweight"
export function divisionFromText(s) {
  const t = (s ?? "").toLowerCase();
  let best = null;
  for (const [label, key] of DIVISIONS) if (t.includes(label) && (!best || label.length > best[0].length)) best = [label, key];
  return best?.[1] ?? null;
}

// "British, Commonwealth, WBA International & IBF Intercontinental Cruiserweight Titles"
// -> titles: [] (none is a world title we model), unresolved: 4 entries with their exact wording
export function parseTitleLine(line) {
  const raw = (line ?? "").trim();
  if (!raw) return { titles: [], unresolved: [], division: null, eliminator: false, as_announced: null };
  const division = divisionFromText(raw);
  const eliminator = ELIMINATOR.test(raw);
  const titles = [];
  const unresolved = [];
  // split on separators that join several belts in one announcement
  const parts = raw.split(/\s*(?:,|&|\band\b|\+)\s*/i).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const orgKey = Object.keys(ORGS).find((o) => new RegExp(`\\b${o}\\b`, "i").test(part));
    if (eliminator) { unresolved.push({ source_native_label: part, reason: "eliminator: no title is at stake" }); continue; }
    if (!orgKey) { unresolved.push({ source_native_label: part, reason: "no organization we model" }); continue; }
    if (SECONDARY.test(part)) { unresolved.push({ source_native_label: part, reason: "secondary regional belt, not a world title lane we model" }); continue; }
    const tier = Object.keys(WORLD_TIERS).find((t) => new RegExp(`\\b${t}\\b`, "i").test(part)) ?? (/\b(world|champion|title)\b/i.test(part) ? "world" : null);
    const div = divisionFromText(part) ?? division;
    if (!tier || !div) { unresolved.push({ source_native_label: part, reason: !tier ? "tier not stated" : "division not stated" }); continue; }
    titles.push({ organization_slug: ORGS[orgKey], tier: WORLD_TIERS[tier] ?? "world", source_native_label: part, weight_class_key: div });
  }
  return { titles, unresolved, division, eliminator, as_announced: raw };
}

// "in a 12-round main event" -> 12 ; "in an eight or 10-round bout" -> null (the source has not decided)
const WORDS = { four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
export function roundsFromText(s) {
  const t = (s ?? "").toLowerCase();
  const candidates = new Set();
  for (const m of t.matchAll(/\b(\d{1,2}|four|five|six|seven|eight|nine|ten|eleven|twelve)[-\s]round\b/g)) {
    const n = WORDS[m[1]] ?? Number(m[1]);
    if (n >= 1 && n <= 15) candidates.add(n);
  }
  // "an eight or 10-round" announces two possibilities: the distance is not set
  if (/\b(\d{1,2}|four|six|eight|ten|twelve)\s+or\s+(\d{1,2}|four|six|eight|ten|twelve)[-\s]round\b/.test(t)) return null;
  return candidates.size === 1 ? [...candidates][0] : null;
}
