// Price conversions. American odds are integers with |x| >= 100; decimal odds
// are > 1. Implied probability here is the RAW (vigged) probability of one
// price; de-vigging is a separate, explicit step.

export class PriceError extends Error {}

export function assertAmerican(american) {
  const n = Number(american);
  if (!Number.isInteger(n) || (n > -100 && n < 100)) throw new PriceError(`invalid american odds: ${american}`);
  return n;
}

export function assertDecimal(decimal) {
  const n = Number(decimal);
  if (!Number.isFinite(n) || n <= 1) throw new PriceError(`invalid decimal odds: ${decimal}`);
  return n;
}

const round = (x, dp) => Math.round(x * 10 ** dp) / 10 ** dp;

export function americanToDecimal(american) {
  const a = assertAmerican(american);
  return round(a > 0 ? 1 + a / 100 : 1 + 100 / -a, 6);
}

// Rounds to the nearest integer American price. Decimal 2.0 -> +100.
export function decimalToAmerican(decimal) {
  const d = assertDecimal(decimal);
  if (d >= 2) return Math.round((d - 1) * 100);
  return -Math.round(100 / (d - 1));
}

export function impliedFromDecimal(decimal) {
  return round(1 / assertDecimal(decimal), 8);
}

export function impliedFromAmerican(american) {
  const a = assertAmerican(american);
  return round(a > 0 ? 100 / (a + 100) : -a / (-a + 100), 8);
}

export function probabilityToAmerican(p) {
  const x = Number(p);
  if (!(x > 0 && x < 1)) throw new PriceError(`invalid probability: ${p}`);
  return x >= 0.5 ? -Math.round((100 * x) / (1 - x)) : Math.round((100 * (1 - x)) / x);
}

// Normalizes whatever the provider supplied into all three representations.
// The provider's own format stays authoritative; derived values are computed
// from it, never the other way round.
export function normalizePrice({ american = null, decimal = null }) {
  if (american != null) {
    const a = assertAmerican(american);
    return { american: a, decimal: americanToDecimal(a), implied: impliedFromAmerican(a), source_format: 'american' };
  }
  if (decimal != null) {
    const d = assertDecimal(decimal);
    return { american: decimalToAmerican(d), decimal: round(d, 6), implied: impliedFromDecimal(d), source_format: 'decimal' };
  }
  throw new PriceError('price missing');
}

// Proportional de-vig across a COMPLETE set of mutually exclusive outcomes.
// Returns null unless every outcome has a price: never de-vig a partial market.
export function devig(implieds) {
  if (!Array.isArray(implieds) || implieds.length < 2 || implieds.some((p) => !(p > 0 && p < 1))) return null;
  const overround = implieds.reduce((a, b) => a + b, 0);
  return { method: 'proportional', overround: round(overround, 8), fair: implieds.map((p) => round(p / overround, 8)) };
}

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}
