// One scheduled odds capture. Every gate fails closed.
//
//   1. ODDS_CAPTURE_ENABLED must be "true"
//   2. the store must carry a verified write target (boxing allow-list only)
//   3. source row the_odds_api must be enabled + approved + persistence_allowed
//      with a recorded rights review
//   4. ODDS_API_KEY must be present (never logged)
//   5. cost of the region plan <= ODDS_MAX_RUN_COST
//   6. adaptive cadence (shared/odds/cadence.mjs) says a capture is due and the
//      daily budget is not exhausted (skipped when options.force)
//   7. unmetered preflight: sport listed + active, remaining credits >= floor
//   8. one call per region (cost = markets), each:
//        raw observation -> provider ledger (all events, names, quotes)
//        -> canonical resolution attempt -> ticks OR unmatched queue
//        -> capture log row (credits, status, observation reference)
//   9. MARKET_MOVED detection for matched bouts
//
// Never user-driven: callers are the cron trigger, an authenticated operator
// route and the guarded operator script.

import { contentHash } from '../canonical.mjs';
import { configHash } from '../provenance.mjs';
import {
  ADAPTER_VERSION, PROVIDER_SLUG, SOURCE_KEY, SPORT_KEY, fetchOdds, preflight, providerQuoteEvents,
} from '../adapters/odds/the-odds-api.mjs';
import { cadenceConfig, decideCadence, parseRegionPlan, planCost } from './cadence.mjs';
import { detectAndEmitMoves, ingestOddsPayload } from './ingest.mjs';

const redact = (value, key) => {
  let s = String(value ?? '');
  if (key) s = s.replaceAll(key, '<redacted>').replaceAll(encodeURIComponent(key), '<redacted>');
  return s.replace(/apiKey=[^&\s"']+/g, 'apiKey=<redacted>').slice(0, 300);
};

export function sourceApproval(src) {
  if (!src) return 'the_odds_api is not registered';
  const problems = [];
  if (!src.enabled) problems.push('enabled=false');
  if (src.access_mode !== 'approved_ingest') problems.push(`access_mode=${src.access_mode}`);
  if (!['approved', 'internal'].includes(src.rights_state)) problems.push(`rights_state=${src.rights_state}`);
  if (!src.persistence_allowed) problems.push('persistence_allowed=false');
  if (!src.latest_rights_review_id) problems.push('no rights review recorded');
  return problems.length ? `the_odds_api not approved (${problems.join(', ')})` : null;
}

// provenance: { trigger_type, worker_name, worker_version, deployment_id,
// invocation_id, scheduled_for, cron, runtime } (shared/provenance.mjs).
// Without it the run is recorded as trigger 'unknown'.
export async function runCapture(store, env, { fetchImpl = fetch, now = new Date().toISOString(), force = false, provenance = null } = {}) {
  if (!store?.writeTarget?.verified) return { status: 'blocked', assertions: { write_target: 'store has no verified boxing write target' } };

  const plan = parseRegionPlan(env);
  const cost = planCost(plan);
  const maxCost = Number(env.ODDS_MAX_RUN_COST ?? env.ODDS_MAX_CALL_COST ?? 8);
  const minRemaining = Number(env.ODDS_MIN_REMAINING ?? 20000);
  const cfgHash = await configHash({ adapter: ADAPTER_VERSION, enabled: env.ODDS_CAPTURE_ENABLED ?? null, plan, maxCost, minRemaining,
    monthly: env.ODDS_MONTHLY_BUDGET ?? null, daily: env.ODDS_DAILY_BUDGET ?? null, target: store.writeTarget.ref ?? store.writeTarget.kind });
  const prov = provenance ? { ...provenance, source_version: ADAPTER_VERSION, config_hash: cfgHash } : null;
  const startedAt = new Date().toISOString();
  const done = async (result) => {
    if (prov?.invocation_id && typeof store.recordWorkerInvocation === 'function') {
      const outcome = { not_due: 'not_due', disabled: 'disabled', blocked: 'blocked', failed: 'failed' }[result.status] ?? 'ran';
      await store.recordWorkerInvocation({ worker: 'boxing-odds', worker_name: prov.worker_name, worker_version: prov.worker_version,
        deployment_id: prov.deployment_id, invocation_id: prov.invocation_id, trigger_type: prov.trigger_type, cron: prov.cron ?? null,
        scheduled_for: prov.scheduled_for, runtime: prov.runtime, started_at: startedAt, outcome, ingest_run_id: result.runId ?? null,
        config_hash: cfgHash, detail: { status: result.status, tier: result.decision?.tier ?? result.metrics?.decision?.tier ?? null,
          reason: result.decision?.reason ?? result.reason ?? null, credits: result.metrics?.credits_spent ?? 0 } })
        .catch((err) => { result.invocation_record_error = String(err?.message ?? err).slice(0, 200); });
    }
    return result;
  };
  if (env.ODDS_CAPTURE_ENABLED !== 'true') return done({ status: 'disabled', reason: 'ODDS_CAPTURE_ENABLED is not "true"' });

  const src = await store.source(SOURCE_KEY);
  const refusal = sourceApproval(src);
  if (refusal) return done(await recordBlocked(store, { source_policy: refusal }, {}, prov));
  if (!env.ODDS_API_KEY) return done(await recordBlocked(store, { credential: 'ODDS_API_KEY not configured' }, {}, prov));
  if (!plan.length || cost > maxCost) return done(await recordBlocked(store, { cost: `region plan costs ${cost} credits, exceeds ODDS_MAX_RUN_COST ${maxCost}` }, {}, prov));

  const config = cadenceConfig(env);
  const decision = decideCadence({ now, state: await store.oddsScheduleState(now), runCost: cost, config });
  if (!force && !decision.due) {
    if (decision.reason === 'daily_budget_reached') return done(await recordBlocked(store, { budget: `daily budget ${config.dailyBudget} reached` }, { decision }, prov));
    return done({ status: 'not_due', decision });
  }

  const runId = await store.startRun({ worker: 'boxing-odds', sourceKey: SOURCE_KEY, adapterVersion: ADAPTER_VERSION, provenance: prov });
  const metrics = {
    target: store.writeTarget.kind === 'supabase' ? store.writeTarget.ref : store.writeTarget.kind,
    decision, forced: force, plan, planned_cost: cost, credits_spent: 0, quota: null, calls: [],
    provider_events: 0, provider_events_new: 0, participants_new: 0, quotes_inserted: 0, quotes_unchanged: 0, quotes_rejected: 0,
    events_matched: 0, events_unmatched: 0, unmatched_reasons: {}, ticks_inserted: 0, ticks_unchanged: 0,
    unsupported_markets: 0, rejected_markets: 0, market_moved_emitted: 0, market_moved_suppressed: {},
  };
  const finish = async (status, assertions = {}) => {
    await store.finishRun(runId, { status, metrics, observed: metrics.provider_events, canonicalWrites: metrics.ticks_inserted,
      reviewItems: metrics.events_unmatched, errors: status === 'failed' ? 1 : metrics.calls.filter((c) => c.error).length, assertions });
    return done({ runId, status, metrics, assertions });
  };

  const pre = await preflight({ apiKey: env.ODDS_API_KEY, fetchImpl, minRemaining })
    .catch((err) => ({ ok: false, reason: redact(err?.message, env.ODDS_API_KEY), quota: null }));
  await store.recordProviderCapture({ provider_slug: PROVIDER_SLUG, ingest_run_id: runId, endpoint: 'sports', requested_at: now,
    http_status: pre.ok ? 200 : 0, credits_cost: 0, credits_used: pre.quota?.used ?? null, credits_remaining: pre.quota?.remaining ?? null,
    error: pre.ok ? null : pre.reason });
  metrics.quota = pre.quota ?? null;
  if (!pre.ok) return finish('blocked', { preflight: pre.reason });

  const matchedAll = [];
  for (const { region, markets } of plan) {
    const requestedAt = new Date().toISOString();
    const call = { region, markets };
    try {
      const { payload, quota, httpStatus } = await fetchOdds({ apiKey: env.ODDS_API_KEY, fetchImpl, regions: [region], markets });
      call.credits = quota.last_cost;
      metrics.credits_spent += Number(quota.last_cost ?? 0);
      metrics.quota = quota;
      const obs = await store.recordObservation({
        source_key: SOURCE_KEY, ingest_run_id: runId, entity_type: 'odds_snapshot', external_key: `${SPORT_KEY}|${region}|${markets.join(',')}`,
        payload, content_hash: await contentHash(payload), parser_version: ADAPTER_VERSION, source_published_at: now,
      });
      const ledgerRows = providerQuoteEvents(payload);
      const ledger = await store.ingestProviderQuotes({ provider_slug: PROVIDER_SLUG, observation_id: obs.id, ingest_run_id: runId,
        captured_at: now, region, events: ledgerRows.events });
      metrics.provider_events += ledger.events;
      metrics.provider_events_new += ledger.events_new;
      metrics.participants_new += ledger.participants_new;
      metrics.quotes_inserted += ledger.quotes_inserted;
      metrics.quotes_unchanged += ledger.quotes_unchanged;
      metrics.quotes_rejected += ledgerRows.rejected;

      const canon = await ingestOddsPayload(store, { payload, capturedAt: now, runId, region, quota, observation: obs });
      for (const k of ['events_matched', 'events_unmatched', 'ticks_inserted', 'ticks_unchanged', 'unsupported_markets', 'rejected_markets']) metrics[k] += canon.metrics[k];
      for (const [k, v] of Object.entries(canon.metrics.unmatched_reasons)) metrics.unmatched_reasons[k] = (metrics.unmatched_reasons[k] ?? 0) + v;
      for (const m of canon.matched) if (!matchedAll.some((x) => x.bout_id === m.bout_id)) matchedAll.push(m);

      Object.assign(call, { http_status: httpStatus, events: payload.length, observation_id: obs.id, observation_duplicate: obs.duplicate, quotes_inserted: ledger.quotes_inserted });
      await store.recordProviderCapture({ provider_slug: PROVIDER_SLUG, ingest_run_id: runId, endpoint: 'odds', region, markets, requested_at: requestedAt,
        http_status: httpStatus, credits_cost: quota.last_cost, credits_used: quota.used, credits_remaining: quota.remaining, events_returned: payload.length,
        observation_id: obs.id, observation_duplicate: obs.duplicate, quotes_inserted: ledger.quotes_inserted, quotes_unchanged: ledger.quotes_unchanged });
    } catch (err) {
      call.error = redact(err?.message ?? err, env.ODDS_API_KEY);
      if (err?.quota?.last_cost) metrics.credits_spent += Number(err.quota.last_cost);
      await store.recordProviderCapture({ provider_slug: PROVIDER_SLUG, ingest_run_id: runId, endpoint: 'odds', region, markets, requested_at: requestedAt,
        http_status: err?.httpStatus ?? 0, credits_cost: err?.quota?.last_cost ?? null, credits_used: err?.quota?.used ?? null,
        credits_remaining: err?.quota?.remaining ?? null, error: call.error }).catch(() => {});
    }
    metrics.calls.push(call);
  }

  const moves = await detectAndEmitMoves(store, { matched: matchedAll, now });
  metrics.market_moved_emitted = moves.emitted.length;
  metrics.market_moved_suppressed = moves.suppressed;
  const failedCalls = metrics.calls.filter((c) => c.error).length;
  if (failedCalls === plan.length) return finish('failed', { error: metrics.calls.map((c) => c.error).join(' | ').slice(0, 300) });
  return finish(failedCalls || metrics.events_unmatched ? 'partial' : 'ok');
}

async function recordBlocked(store, assertions, extra = {}, provenance = null) {
  const runId = await store.startRun({ worker: 'boxing-odds', sourceKey: SOURCE_KEY, adapterVersion: ADAPTER_VERSION, provenance });
  await store.finishRun(runId, { status: 'blocked', metrics: extra, observed: 0, canonicalWrites: 0, reviewItems: 0, errors: 0, assertions });
  return { runId, status: 'blocked', assertions, ...extra };
}
