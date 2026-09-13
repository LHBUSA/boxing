// Fair (no-margin) prices from model probabilities. Pure. The database
// re-checks the same arithmetic on boxing_model_outputs.

import { probabilityToAmerican } from '../odds/price.mjs';

export function fairOdds(probability) {
  const p = Number(probability);
  if (!(p > 0 && p < 1)) throw new Error(`probability must be strictly between 0 and 1: ${probability}`);
  const rounded = Math.round(p * 1e8) / 1e8;
  return { probability: rounded, fair_decimal: Math.round((1 / rounded) * 1e6) / 1e6, fair_american: probabilityToAmerican(rounded) };
}

// A complete set of mutually exclusive outcomes must sum to 1 (within 1e-6).
export function fairMarket(probabilities) {
  const entries = Object.entries(probabilities);
  if (entries.length < 2) throw new Error('a market needs at least two outcomes');
  const total = entries.reduce((s, [, p]) => s + Number(p), 0);
  if (Math.abs(total - 1) > 1e-6) throw new Error(`probabilities must sum to 1, got ${total}`);
  return Object.fromEntries(entries.map(([k, p]) => [k, fairOdds(p)]));
}
