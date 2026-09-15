// Source-native vocabulary of the four major sanctioning bodies, as each publishes it (checked 2026-09-14).
//
// Nothing here makes the bodies equivalent. A designation maps to a lineage tier of THAT body's belt (WBA Super and
// WBA World are two WBA lineages; a WBO "Super Champion" is the WBO world champion with an honorific) and to a holder
// status. A label not listed here is kept verbatim with tier null and flagged for review; it is never guessed.

export const BODIES = Object.freeze(['wbc', 'wba', 'ibf', 'wbo']);

// canonical weight-class keys are the ones shared/rankings/import.mjs parses; limits stay per body
export const DIVISIONS = Object.freeze({
  wba: {
    HEAVYWEIGHT: 'heavyweight', BRIDGERWEIGHT: 'bridgerweight', CRUISERWEIGHT: 'cruiserweight', 'LIGHT HEAVYWEIGHT': 'light_heavyweight',
    'SUPER MIDDLEWEIGHT': 'super_middleweight', MIDDLEWEIGHT: 'middleweight', 'SUPER WELTERWEIGHT': 'super_welterweight', WELTERWEIGHT: 'welterweight',
    'SUPER LIGHTWEIGHT': 'super_lightweight', LIGHTWEIGHT: 'lightweight', 'SUPER FEATHERWEIGHT': 'super_featherweight', FEATHERWEIGHT: 'featherweight',
    'SUPER BANTAMWEIGHT': 'super_bantamweight', BANTAMWEIGHT: 'bantamweight', 'SUPER FLYWEIGHT': 'super_flyweight', FLYWEIGHT: 'flyweight',
    'LIGHT FLYWEIGHT': 'light_flyweight', MINIMUMWEIGHT: 'minimumweight',
    // owner-approved 2026-09-14: WBA wording on its own lists for the same canonical division ("UNKNOWN" stays unmapped)
    MINIMUM: 'minimumweight', 'MINI FLYWEIGHT': 'minimumweight',
  },
  ibf: {
    heavyweight: 'heavyweight', cruiserweight: 'cruiserweight', 'light-heavyweight': 'light_heavyweight', 'super-middleweight': 'super_middleweight',
    middleweight: 'middleweight', 'jr-middleweight': 'super_welterweight', welterweight: 'welterweight', 'jr-welterweight': 'super_lightweight',
    lightweight: 'lightweight', 'jr-lightweight': 'super_featherweight', featherweight: 'featherweight', 'jr-featherweight': 'super_bantamweight',
    bantamweight: 'bantamweight', 'jr-bantamweight': 'super_flyweight', flyweight: 'flyweight', 'jr-flyweight': 'light_flyweight', 'mini-flyweight': 'minimumweight',
  },
  wbo: {
    HEAVYWEIGHT: 'heavyweight', 'JR. HEAVYWEIGHT': 'cruiserweight', 'LT. HEAVYWEIGHT': 'light_heavyweight', 'SUP. MIDDLEWEIGHT': 'super_middleweight',
    MIDDLEWEIGHT: 'middleweight', 'JR. MIDDLEWEIGHT': 'super_welterweight', WELTERWEIGHT: 'welterweight', 'JR. WELTERWEIGHT': 'super_lightweight',
    LIGHTWEIGHT: 'lightweight', 'JR. LIGHTWEIGHT': 'super_featherweight', FEATHERWEIGHT: 'featherweight', 'JR. FEATHERWEIGHT': 'super_bantamweight',
    BANTAMWEIGHT: 'bantamweight', 'JR. BANTAMWEIGHT': 'super_flyweight', FLYWEIGHT: 'flyweight', 'JR. FLYWEIGHT': 'light_flyweight', 'MINI-FLYWEIGHT': 'minimumweight', MINIMUMWEIGHT: 'minimumweight',
  },
  // WBC ratings PDF division headers as printed (September 2026), and the Spanish division names on its champions grid
  wbc: {
    HEAVYWEIGHT: 'heavyweight', BRIDGERWEIGHT: 'bridgerweight', CRUISERWEIGHT: 'cruiserweight', 'LT. HEAVYWEIGHT': 'light_heavyweight',
    SUPERMIDDLEWEIGHT: 'super_middleweight', MIDDLEWEIGHT: 'middleweight', SUPERWELTERWEIGHT: 'super_welterweight', WELTERWEIGHT: 'welterweight',
    SUPERLIGHTWEIGHT: 'super_lightweight', LIGHTWEIGHT: 'lightweight', SUPERFEATHERWEIGHT: 'super_featherweight', FEATHERWEIGHT: 'featherweight',
    SUPERBANTAMWEIGHT: 'super_bantamweight', BANTAMWEIGHT: 'bantamweight', SUPERFLYWEIGHT: 'super_flyweight', FLYWEIGHT: 'flyweight',
    'LT. FLYWEIGHT': 'light_flyweight', STRAWWEIGHT: 'minimumweight',
    Completo: 'heavyweight', bridger: 'bridgerweight', Crucero: 'cruiserweight', Semicompleto: 'light_heavyweight', Supermedio: 'super_middleweight',
    Medio: 'middleweight', Superwelter: 'super_welterweight', Welter: 'welterweight', Superligero: 'super_lightweight', Ligero: 'lightweight',
    Superpluma: 'super_featherweight', Pluma: 'featherweight', Supergallo: 'super_bantamweight', Gallo: 'bantamweight', Supermosca: 'super_flyweight',
    Mosca: 'flyweight', Minimosca: 'light_flyweight', Paja: 'minimumweight',
  },
});

// designation -> { tier: lineage of that body's belt, status: holder status, honorific? }
const D = (tier, status = 'champion', extra = {}) => ({ tier, status, ...extra });
export const DESIGNATIONS = Object.freeze({
  wba: {
    'WBA SUPER CHAMPION': D('super'), 'WBA SUPER WORLD': D('super'),
    'WBA WORLD CHAMPION': D('regular'), 'WBA WORLD': D('regular'),
    'WBA INTERIM CHAMPION': D('interim'), 'INTERIM WBA': D('interim'),
    'WBA GOLD': D('gold'), 'WBA GOLD CHAMPION': D('gold'),
    // the WBA does not say which of its belts a champion in recess would return to
    'CHAMPION IN RECESS': D(null, 'in_recess'),
  },
  ibf: { CHAMPION: D('world'), 'INTERIM CHAMPION': D('interim') },
  wbo: {
    CHAMPION: D('world'), INTERIM: D('interim'), 'INTERIM CHAMPION': D('interim'),
    // a WBO world champion carrying the WBO "Super Champion" honorific: same lineage, not a separate belt
    'SUP. CHAMPION': D('world', 'champion', { honorific: 'super_champion' }), 'SUPER CHAMPION': D('world', 'champion', { honorific: 'super_champion' }),
  },
  // WBC ratings PDF title lines as printed (September 2026 document): CHAMPION, INTERIM CHAMPION, CHAMPION IN RECESS,
  // WBC SILVER CHAMPION, WBC INT. CHAMPION. FRANCHISE CHAMPION and EMERITUS CHAMPION are known WBC labels not seen in a
  // stored document yet. "CAMPEONES DEL MUNDO" is the champions grid heading on the main ratings page. Never mapped onto
  // another body's vocabulary.
  wbc: {
    CHAMPION: D('world'), 'INTERIM CHAMPION': D('interim'), 'CHAMPION IN RECESS': D(null, 'in_recess'), 'FRANCHISE CHAMPION': D('franchise'),
    'EMERITUS CHAMPION': D('emeritus'), 'WBC SILVER CHAMPION': D('silver'), 'WBC INT. CHAMPION': D('international'), 'CAMPEONES DEL MUNDO': D('world'),
  },
});

export const VACANT_WORDS = /^(TITLE\s+)?VACANT$/i;

// WBA wording such as "WBA UNDISPUTED CHAMPION", "WBA UNIFIED CHAMPION", "WBA -WBC UNIFIED CHAMPION" (owner decision
// 2026-09-14): source-native status text, never a lineage and never proof of PropBetEdge unified/undisputed. It is kept as
// the honorific of a lineage the same champion row names independently; alone it stays an unresolved designation.
export const WBA_STATUS_PHRASE = /\b(UNIFIED|UNDISPUTED)\b/i;

export function designationOf(body, label) {
  const key = String(label ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  const d = DESIGNATIONS[body]?.[key];
  return d ? { native: label.trim(), ...d, known: true } : { native: String(label ?? '').trim(), tier: null, status: 'unknown', known: false };
}

export function divisionOf(body, label) {
  const raw = String(label ?? '').trim();
  const table = DIVISIONS[body] ?? {};
  const bare = raw.replace(/\(.*$/, '').replace(/\s+/g, ' ').trim();
  const key = table[bare] ?? table[bare.toUpperCase()] ?? table[bare.toLowerCase()] ?? null;
  return { native_label: raw, weight_class_key: key, known: Boolean(key) };
}

// "Frank Sanchez,Cuba (CUB)" / "RUS" / "(GBR)" -> ISO-like country code as printed
export const countryCode = (s) => (String(s ?? '').match(/\(([A-Z]{3})\)\s*$/)?.[1] ?? (/^[A-Z]{3}$/.test(String(s ?? '').trim()) ? String(s).trim() : null));
