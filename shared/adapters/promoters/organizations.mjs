// Canonical promotion and broadcaster identities for announced cards.
//
// A promoter or broadcaster becomes an event relationship only when a source STATES it for that card (the promoter's own
// event page, or a sanctioning body's event page "Promoter: ..."). Names are matched to one canonical slug per
// organization so "Matchroom", "Matchroom Boxing" and "Matchroom Sport" are one promotion, never three. An unknown name
// keeps its own slug (an honest new organization), it is never guessed onto a known one.

const PROMOTERS = [
  ['matchroom', 'Matchroom Boxing', [/^matchroom( boxing| sport)?$/i]],
  ['pbc', 'Premier Boxing Champions', [/^(premier boxing champions|pbc)$/i]],
  ['tgb-promotions', 'TGB Promotions', [/^tgb( promotions)?$/i]],
  ['top-rank', 'Top Rank', [/^top rank( boxing| inc\.?)?$/i]],
  ['queensberry', 'Queensberry Promotions', [/^queensberry( promotions)?$/i]],
  ['golden-boy', 'Golden Boy Promotions', [/^golden boy( promotions)?$/i]],
  ['most-valuable-promotions', 'Most Valuable Promotions', [/^(most valuable promotions|mvp)$/i]],
  ['boxxer', 'BOXXER', [/^boxxer$/i]],
  ['salita-promotions', 'Salita Promotions', [/^salita( promotions)?$/i]],
  ['sela', 'Sela', [/^sela( promotions)?$/i]],
  ['zuffa-boxing', 'Zuffa Boxing', [/^zuffa boxing$/i, /^tko( productions)?$/i]],
  ['mf-pro', 'Misfits Boxing / MF Pro', [/^(misfits( boxing)?|mf pro)$/i]],
];
const BROADCASTERS = [
  ['dazn', 'DAZN', [/^dazn$/i]],
  ['tnt-sports', 'TNT Sports', [/^tnt( sports)?$/i]],
  ['espn', 'ESPN', [/^espn\+?$/i]],
  ['prime-video', 'Prime Video', [/^(amazon )?prime( video)?$/i]],
  ['netflix', 'Netflix', [/^netflix$/i]],
  ['sky-sports', 'Sky Sports', [/^sky sports$/i]],
  ['paramount-plus', 'Paramount+', [/^paramount\+?$/i]],
];

const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function canonical(list, name) {
  const n = String(name ?? '').trim();
  if (!n) return null;
  for (const [slug, display, patterns] of list) if (patterns.some((re) => re.test(n))) return { slug, name: display };
  return { slug: slugify(n), name: n };
}

export const canonicalPromoter = (name) => canonical(PROMOTERS, name);
export const canonicalBroadcaster = (name) => canonical(BROADCASTERS, name);

// "DAZN & TNT" -> two broadcasters; "DAZN" -> one
export function splitBroadcasters(published) {
  return String(published ?? '').split(/\s*(?:&|\band\b|\/|,|\+(?=\s))\s*/i).map((s) => s.trim()).filter(Boolean);
}

// observation -> card-document organizations (only what the source stated)
export function cardOrganizations(obs) {
  const out = [];
  const seen = new Set();
  const push = (c, kind, role) => {
    if (!c?.slug || seen.has(`${c.slug}|${role}`)) return;
    seen.add(`${c.slug}|${role}`);
    out.push({ slug: c.slug, name: c.name, kind, role });
  };
  for (const p of [].concat(obs.promoter_as_published ?? obs.promoter ?? [])) push(canonicalPromoter(p), 'promoter', 'promoter');
  for (const b of splitBroadcasters(obs.broadcaster)) push(canonicalBroadcaster(b), 'broadcaster', 'broadcaster');
  return out;
}
