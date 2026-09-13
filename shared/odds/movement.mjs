// MARKET_MOVED detection from tick history. Pure.
//
// Consensus at time t = median raw implied probability across bookmakers,
// using each book's latest price at or before t. A move is measured over the
// SAME set of books at both ends, so a book joining or leaving the market can
// never manufacture movement.
//
// Anti-spam:
//   * threshold: |move| >= minMove (probability points) and >= minBooks books
//   * dedupe key = bout|market|selection|origin band|destination band, so the
//     same move observed again produces the same key (DB drops it), while a
//     genuinely new move into the same band from elsewhere does not
//   * cooldown: within cooldownHours of the last event for this selection, a
//     new event needs a further move of reemitMove from that event's price
//
// The event never asserts a cause: facts.cause is null and
// causal_claim_allowed is false unless a sourced cause is attached upstream.

import { devig, median, probabilityToAmerican } from './price.mjs';
import { dedupeKey } from '../canonical.mjs';

export const DEFAULT_MOVE_CONFIG = {
  windowHours: 24,
  minMove: 0.04,
  minBooks: 2,
  cooldownHours: 6,
  reemitMove: 0.04,
};

const observedMs = (t) => Date.parse(t.observed_at);

export function pricesAt(ticks, selectionKey, atMs) {
  const byBook = new Map();
  for (const t of ticks) {
    if (t.selection_key !== selectionKey || t.status !== 'open' || t.implied == null) continue;
    if (observedMs(t) > atMs) continue;
    const prev = byBook.get(t.bookmaker);
    if (!prev || observedMs(t) >= observedMs(prev)) byBook.set(t.bookmaker, t);
  }
  return byBook;
}

export function evaluateMarketMove({ boutId, marketKey, selectionKey, ticks, now, lastEvent = null, config = DEFAULT_MOVE_CONFIG, provider }) {
  const nowMs = +new Date(now);
  const fromMs = nowMs - config.windowHours * 3600_000;
  const before = pricesAt(ticks, selectionKey, fromMs);
  const after = pricesAt(ticks, selectionKey, nowMs);
  const books = [...after.keys()].filter((b) => before.has(b)).sort();
  if (books.length < config.minBooks) return { emit: false, reason: 'insufficient_books', books: books.length };

  const thenMedian = median(books.map((b) => Number(before.get(b).implied)));
  const nowMedian = median(books.map((b) => Number(after.get(b).implied)));
  const move = nowMedian - thenMedian;
  if (Math.abs(move) < config.minMove) return { emit: false, reason: 'below_threshold', move };

  if (lastEvent && nowMs - Date.parse(lastEvent.detected_at) < config.cooldownHours * 3600_000) {
    const lastImplied = Number(lastEvent.payload?.facts?.new_consensus_implied);
    if (Number.isFinite(lastImplied) && Math.abs(nowMedian - lastImplied) < config.reemitMove) {
      return { emit: false, reason: 'cooldown', move };
    }
  }

  const direction = move > 0 ? 'shortened' : 'drifted';
  const band = Math.floor(nowMedian / config.minMove);
  const fromBand = Math.floor(thenMedian / config.minMove);
  const nowImplieds = books.map((b) => Number(after.get(b).implied));
  return {
    emit: true,
    direction,
    band,
    dedupeParts: [boutId, marketKey, selectionKey, fromBand, band],
    facts: {
      bout_id: boutId,
      market_key: marketKey,
      selection_key: selectionKey,
      previous_consensus_implied: round(thenMedian),
      new_consensus_implied: round(nowMedian),
      previous_consensus_american: probabilityToAmerican(thenMedian),
      new_consensus_american: probabilityToAmerican(nowMedian),
      move_probability_points: round(move),
      direction,
      window: { from: new Date(fromMs).toISOString(), to: new Date(nowMs).toISOString() },
      bookmakers: books.map((b) => ({
        bookmaker: b,
        previous_american: before.get(b).american,
        previous_observed_at: before.get(b).observed_at,
        new_american: after.get(b).american,
        new_observed_at: after.get(b).observed_at,
      })),
      books_participating: books.length,
      dispersion_implied: round(Math.max(...nowImplieds) - Math.min(...nowImplieds)),
      price_basis: 'raw implied probability (includes bookmaker margin)',
      cause: null,
      causal_claim_allowed: false,
    },
    tickIds: books.flatMap((b) => [before.get(b).tick_id, after.get(b).tick_id]),
    provider,
  };
}

const round = (x) => Math.round(x * 1e6) / 1e6;

export async function buildMarketMovedEvent(evaluation, { sourceKey, detectedAt, fighterIds = [] }) {
  return {
    contract_version: '1.1.0',
    event_type: 'MARKET_MOVED',
    dedupe_key: await dedupeKey('market_moved', ...evaluation.dedupeParts),
    bout_id: evaluation.facts.bout_id,
    fighter_ids: fighterIds,
    source_key: sourceKey,
    occurred_at: evaluation.facts.window.to,
    detected_at: detectedAt,
    confidence: 100,
    payload: { facts: evaluation.facts, derived: null },
    sources: [{ source_key: sourceKey, observed_at: evaluation.facts.window.to, external_key: `ticks:${evaluation.tickIds.join(',')}` }],
    requires_human_review: false,
  };
}

// Fair (de-vigged) consensus only when every outcome of the market is priced.
export function fairConsensus(consensusBySelection) {
  const keys = Object.keys(consensusBySelection);
  const d = devig(keys.map((k) => consensusBySelection[k]));
  return d ? Object.fromEntries(keys.map((k, i) => [k, d.fair[i]])) : null;
}
