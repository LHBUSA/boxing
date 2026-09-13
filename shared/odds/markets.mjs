// Canonical boxing market types and selection keys.
//
// Selection keys are relative to the CANONICAL bout sides (a/b from
// boxing_bout_participants), never to a provider's home/away order, so a
// provider that flips corners cannot flip our history.

export const MARKET_TYPES = {
  moneyline: { selections: ['fighter_a', 'fighter_b'], line: false },
  moneyline_3way: { selections: ['fighter_a', 'fighter_b', 'draw'], line: false },
  draw: { selections: ['yes', 'no'], line: false },
  goes_distance: { selections: ['yes', 'no'], line: false },
  total_rounds: { selections: ['over', 'under'], line: true },
  method_of_victory: { pattern: /^(fighter_a|fighter_b):(ko_tko|decision|dq|technical_decision)$|^draw$/, line: false },
  win_by_ko_tko: { selections: ['fighter_a', 'fighter_b'], line: false },
  win_by_decision: { selections: ['fighter_a', 'fighter_b'], line: false },
  exact_round: { pattern: /^(fighter_a|fighter_b):r([1-9]|[1-3][0-9]|4[0-5])$|^decision$|^draw$/, line: false },
  round_group: { pattern: /^(fighter_a|fighter_b):r([1-9]|[1-3][0-9]|4[0-5])-([1-9]|[1-3][0-9]|4[0-5])$|^decision$|^draw$/, line: false },
  other: { pattern: /^[a-z0-9_:.-]{1,60}$/, line: false },
};

export function validSelection(marketType, selectionKey) {
  const def = MARKET_TYPES[marketType];
  if (!def) return false;
  return def.selections ? def.selections.includes(selectionKey) : def.pattern.test(selectionKey);
}

// Deterministic natural key for boxing_markets.market_key.
export function marketKey({ marketType, period = 'fight', line = null, isLive = false }) {
  if (!MARKET_TYPES[marketType]) throw new Error(`unknown market type ${marketType}`);
  if (MARKET_TYPES[marketType].line && (line == null || !Number.isFinite(Number(line)))) {
    throw new Error(`${marketType} requires a line`);
  }
  const l = line == null ? '-' : Number(line).toFixed(2);
  return `${marketType}|${period}|${l}|${isLive ? 'live' : 'pre'}`;
}
