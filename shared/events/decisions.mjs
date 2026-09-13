// Scorecard validation and decision classification. Pure.
//
// Classification only describes what the stored cards say. It never replaces
// the commission's official result; checkResultAgainstCards() reports a
// disagreement for review instead of "fixing" either side.

// cards: [{ a_total, b_total }]
export function classifyDecision(cards) {
  const n = cards.length;
  if (!n) return null;
  let a = 0;
  let b = 0;
  let d = 0;
  for (const c of cards) {
    if (c.a_total == null || c.b_total == null) return null; // Number(null) is 0: never score a missing total
    const x = Number(c.a_total);
    const y = Number(c.b_total);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x > y) a++;
    else if (y > x) b++;
    else d++;
  }
  if (n === 1) {
    return d ? { outcome: 'draw', winner_side: null, decision_type: 'referee' } : { outcome: 'win', winner_side: a ? 'a' : 'b', decision_type: 'referee' };
  }
  const half = n / 2;
  if (a > half || b > half) {
    const [winner, wins, loserWins] = a > b ? ['a', a, b] : ['b', b, a];
    const type = wins === n ? 'unanimous' : loserWins === 0 ? 'majority' : 'split';
    return { outcome: 'win', winner_side: winner, decision_type: type, cards: { a, b, draw: d } };
  }
  const type = d === n ? 'unanimous' : d > half ? 'majority' : 'split';
  return { outcome: 'draw', winner_side: null, decision_type: type, cards: { a, b, draw: d } };
}

// card: { a_total, b_total, rounds: [{ round, a, b }] }, bout: { scheduled_rounds }
// stoppedRound: for technical decisions, the round cards run to.
export function validateScorecard(card, { scheduledRounds = null, stoppedRound = null } = {}) {
  const problems = [];
  const rounds = card.rounds ?? [];
  const seen = new Set();
  for (const r of rounds) {
    if (!Number.isInteger(r.round) || r.round < 1) problems.push(`invalid round number ${r.round}`);
    if (seen.has(r.round)) problems.push(`duplicate round ${r.round}`);
    seen.add(r.round);
    if (scheduledRounds && r.round > scheduledRounds) problems.push(`round ${r.round} beyond scheduled ${scheduledRounds}`);
    for (const side of ['a', 'b']) {
      const v = Number(r[side]);
      if (!Number.isFinite(v) || v < 0 || v > 10) problems.push(`round ${r.round} ${side} points out of range: ${r[side]}`);
    }
    // 10-point must: somebody scores 10 unless deductions brought it below
    if (Math.max(Number(r.a), Number(r.b)) < 10 && !r.deduction) problems.push(`round ${r.round}: no 10 awarded and no deduction recorded`);
  }
  const expected = stoppedRound ?? scheduledRounds;
  if (expected && rounds.length && rounds.length !== expected) problems.push(`card has ${rounds.length} rounds, expected ${expected}`);
  if (rounds.length && card.a_total != null && card.b_total != null) {
    const sa = rounds.reduce((s, r) => s + Number(r.a), 0);
    const sb = rounds.reduce((s, r) => s + Number(r.b), 0);
    if (Math.abs(sa - Number(card.a_total)) > 1e-9 || Math.abs(sb - Number(card.b_total)) > 1e-9) {
      problems.push(`round sums ${sa}-${sb} do not equal totals ${card.a_total}-${card.b_total}`);
    }
  }
  return problems;
}

// result: { outcome, winner_side, method, decision_type }
export function checkResultAgainstCards(result, cards) {
  if (!['DECISION', 'TECHNICAL_DECISION'].includes(result.method) || !cards.length) return [];
  const c = classifyDecision(cards);
  if (!c) return ['cards incomplete'];
  const problems = [];
  if (c.outcome !== result.outcome) problems.push(`cards say ${c.outcome}, result says ${result.outcome}`);
  if (c.outcome === 'win' && result.winner_side && c.winner_side !== result.winner_side) problems.push(`cards favour side ${c.winner_side}, result names side ${result.winner_side}`);
  if (result.decision_type && c.decision_type !== result.decision_type) problems.push(`cards are ${c.decision_type}, result says ${result.decision_type}`);
  return problems;
}
