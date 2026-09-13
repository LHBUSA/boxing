// Shared helpers for derived intelligence. Pure.

export const ENGINE_VERSION = 'boxing-intel-engine@1.0.0';
export const STOPPAGE_METHODS = new Set(['KO', 'TKO', 'RTD']);
export const DECISION_METHODS = new Set(['DECISION', 'TECHNICAL_DECISION']);
const DAY_MS = 86_400_000;

export const round4 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10_000) / 10_000);
export const days = (from, to) => Math.floor((+new Date(to) - +new Date(from)) / DAY_MS);

// Metric results. A value exists ONLY when status is 'available'.
export const available = (value, sampleSize, context = {}) => ({ status: 'available', value, sample_size: sampleSize, sample_context: context });
export const insufficient = (sampleSize, needed, context = {}) => ({ status: 'insufficient_sample', value: null, sample_size: sampleSize, sample_context: { minimum_required: needed, ...context } });
export const sourceUnavailable = (reason, context = {}) => ({ status: 'source_unavailable', value: null, sample_size: 0, sample_context: { reason, ...context } });
export const notApplicable = (reason, sampleSize = 0) => ({ status: 'not_applicable', value: null, sample_size: sampleSize, sample_context: { reason } });

export function rate(numerator, denominator, minimum, context = {}) {
  if (denominator < minimum) return insufficient(denominator, minimum, context);
  return available(round4(numerator / denominator), denominator, { numerator, denominator, ...context });
}

// The subject's view of one bout. Nothing is guessed: unknown stays null.
export function boutView(b, meId) {
  const r = b.result ?? null;
  const known = Boolean(r && r.outcome && r.outcome !== 'unknown');
  const outcome = !known ? null : r.outcome === 'win' ? (r.winner_id === meId ? 'win' : 'loss') : r.outcome;
  const method = r?.method ?? null;
  const roundSeconds = (b.round_minutes ?? null) ? b.round_minutes * 60 : null;
  let roundsCompleted = null;
  let partialUnknown = false;
  if (method === 'DECISION' && b.scheduled_rounds) roundsCompleted = b.scheduled_rounds;
  else if (r?.round) {
    roundsCompleted = r.round - 1;
    if (r.time_sec != null && roundSeconds) roundsCompleted += Math.min(r.time_sec / roundSeconds, 1);
    else partialUnknown = true;
  }
  return {
    ...b,
    known,
    outcome,
    decided: ['win', 'loss', 'draw'].includes(outcome),
    method,
    stoppageWin: outcome === 'win' && STOPPAGE_METHODS.has(method),
    stoppageLoss: outcome === 'loss' && STOPPAGE_METHODS.has(method),
    decisionWin: outcome === 'win' && DECISION_METHODS.has(method),
    distance: method === 'DECISION',
    finishRound: r?.round ?? null,
    roundsCompleted,
    partialUnknown,
    scheduledBeyond8: (b.scheduled_rounds ?? 0) > 8,
  };
}

// Opponent quality entering a bout (formula pbe_opponent_quality@1):
//   q = 0.5 * win_pct_entering + 0.5 * min(prior_bouts, 30) / 30
// using the opponent's SOURCED record at bout time when present, else the
// PropBetEdge graph record from bouts before that bout (results known at the
// cutoff). A debutant scores 0. Never uses rankings or anything after the
// bout, so it cannot be circular or leak the future.
export function opponentQuality(b) {
  const op = b.opponent;
  if (!op) return null;
  const sourced = op.record_entering_sourced;
  const graph = op.record_entering_graph;
  const rec = sourced ?? graph;
  if (!rec) return null;
  const bouts = sourced ? Number(sourced.wins) + Number(sourced.losses) + Number(sourced.draws ?? 0) : Number(graph.bouts);
  const decided = Number(rec.wins) + Number(rec.losses) + Number(rec.draws ?? 0);
  const winPct = decided > 0 ? Number(rec.wins) / decided : 0;
  return { q: 0.5 * winPct + 0.5 * Math.min(bouts, 30) / 30, winPct, bouts, basis: sourced ? 'sourced' : 'graph' };
}
