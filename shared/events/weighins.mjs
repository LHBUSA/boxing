// Weigh-in arithmetic. Pure. The source-native reading is always kept next to
// the normalized pounds value.

export const KG_PER_LB = 0.45359237;

export const lbToKg = (lb) => Math.round((Number(lb) * KG_PER_LB) * 1000) / 1000;
export const kgToLb = (kg) => Math.round((Number(kg) / KG_PER_LB) * 100) / 100;

// "10st 7lb" / "10 st 7.5 lb" -> pounds
export function stoneToLb(raw) {
  const m = /^\s*(\d+)\s*st(?:one)?s?\s*(?:(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?))?\s*$/i.exec(String(raw));
  if (!m) throw new Error(`unparseable stone weight: ${raw}`);
  return Number(m[1]) * 14 + Number(m[2] ?? 0);
}

export function normalizeWeight({ value, unit }) {
  if (unit === 'lb') return { lb: Number(value), kg: lbToKg(value), unit, raw: String(value) };
  if (unit === 'kg') return { lb: kgToLb(value), kg: Number(value), unit, raw: String(value) };
  if (unit === 'stone_lb') { const lb = stoneToLb(value); return { lb, kg: lbToKg(lb), unit, raw: String(value) }; }
  throw new Error(`unknown weight unit ${unit}`);
}

// Miss is measured against the CONTRACTED limit for this bout, never the
// division's nominal limit (catchweights exist).
export function assessWeighIn({ officialLb, contractedLb }) {
  if (officialLb == null || contractedLb == null) return { status: 'recorded', miss_lb: null };
  const diff = Math.round((Number(officialLb) - Number(contractedLb)) * 100) / 100;
  return diff > 0 ? { status: 'missed_weight', miss_lb: diff } : { status: 'made_weight', miss_lb: 0 };
}

export function isCatchweight(contractedLb, divisionLimitLb) {
  if (contractedLb == null || divisionLimitLb == null) return null;
  return Number(contractedLb) !== Number(divisionLimitLb);
}

// WEIGHT_MISSED only for a VERIFIED official weigh-in whose final attempt is
// over the contracted limit. Reported/unverified misses, rehydration checks
// and ceremonial weigh-ins produce WEIGH_IN_RESULT at most.
export function weighInNewsType({ weigh_in_kind: kind, verification_state: verification, status }) {
  if (kind === 'official' && verification === 'verified' && status === 'missed_weight') return 'WEIGHT_MISSED';
  if (['verified', 'reported'].includes(verification) && kind !== 'ceremonial') return 'WEIGH_IN_RESULT';
  return null;
}
