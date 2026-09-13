// One scheduled odds capture. Every gate fails closed and is recorded.
//
//   1. ODDS_CAPTURE_ENABLED must be "true"
//   2. source row the_odds_api must be enabled + approved + persistence_allowed
//   3. ODDS_API_KEY must be present (never logged)
//   4. unmetered preflight: sport listed + active, remaining credits >= floor
//   5. ONE bulk call (cost = regions x markets), ingest, MARKET_MOVED detection
//
// Never user-driven: callers are the cron trigger and an authenticated
// operator route. There is no per-request refresh path.

import { fetchOdds, preflight, SOURCE_KEY, ADAPTER_VERSION } from '../adapters/odds/the-odds-api.mjs';
import { detectAndEmitMoves, ingestOddsPayload } from './ingest.mjs';

export async function runCapture(store, env, { fetchImpl = fetch, now = new Date().toISOString() } = {}) {
  const regions = (env.ODDS_REGIONS ?? 'us').split(',').map((r) => r.trim()).filter(Boolean);
  const markets = (env.ODDS_MARKETS ?? 'h2h').split(',').map((m) => m.trim()).filter(Boolean);
  const minRemaining = Number(env.ODDS_MIN_REMAINING ?? 5000);
  const maxCost = Number(env.ODDS_MAX_CALL_COST ?? 4);

  if (env.ODDS_CAPTURE_ENABLED !== 'true') return { status: 'disabled', reason: 'ODDS_CAPTURE_ENABLED is not "true"' };

  const runId = await store.startRun({ worker: 'boxing-odds', sourceKey: SOURCE_KEY, adapterVersion: ADAPTER_VERSION });
  const finish = async (status, metrics, assertions = {}) => {
    await store.finishRun(runId, { status, metrics, observed: metrics?.provider_events ?? 0, canonicalWrites: metrics?.ticks_inserted ?? 0,
      reviewItems: metrics?.events_unmatched ?? 0, errors: status === 'failed' ? 1 : 0, assertions });
    return { runId, status, metrics, assertions };
  };

  const src = await store.source(SOURCE_KEY);
  if (!src?.enabled || !src.persistence_allowed || src.access_mode !== 'approved_ingest') {
    return finish('blocked', {}, { source_policy: `the_odds_api not approved (enabled=${src?.enabled}, access_mode=${src?.access_mode})` });
  }
  if (!env.ODDS_API_KEY) return finish('blocked', {}, { credential: 'ODDS_API_KEY not configured' });
  if (regions.length * markets.length > maxCost) {
    return finish('blocked', {}, { cost: `regions x markets = ${regions.length * markets.length} exceeds ODDS_MAX_CALL_COST ${maxCost}` });
  }

  const pre = await preflight({ apiKey: env.ODDS_API_KEY, fetchImpl, minRemaining });
  if (!pre.ok) return finish('blocked', { quota: pre.quota }, { preflight: pre.reason });

  try {
    const { payload, quota } = await fetchOdds({ apiKey: env.ODDS_API_KEY, fetchImpl, regions, markets });
    const { metrics, matched } = await ingestOddsPayload(store, { payload, capturedAt: now, runId, region: regions.join(','), quota });
    const moves = await detectAndEmitMoves(store, { matched, now });
    metrics.market_moved_emitted = moves.emitted.length;
    metrics.market_moved_suppressed = moves.suppressed;
    return finish(metrics.events_unmatched ? 'partial' : 'ok', metrics);
  } catch (err) {
    const message = String(err?.message ?? err).replaceAll(env.ODDS_API_KEY, '<redacted>').slice(0, 300);
    return finish('failed', { quota: err?.quota ?? null }, { error: message });
  }
}
