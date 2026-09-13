// Re-resolves STORED odds observations against Boxing Core after new canonical
// events/bouts exist (e.g. from commission ingestion). No provider request is
// made and no credit is spent.
//
// History is not rewritten: ticks keep the ORIGINAL captured_at and provider
// timestamps from the stored payload, while recorded_at (DB default) shows
// when the row was written; new provider-event -> bout mappings record
// resolved_at, resolver_version and the replay run. Replays do not re-count
// the unmatched queue and do not emit MARKET_MOVED for past windows.

import { ADAPTER_VERSION, SOURCE_KEY } from '../adapters/odds/the-odds-api.mjs';
import { ingestOddsPayload } from './ingest.mjs';

export async function reprocessStoredOdds(store, { since = null, limit = 200, provenance = null } = {}) {
  if (!store?.writeTarget?.verified) return { status: 'blocked', assertions: { write_target: 'store has no verified boxing write target' } };
  const observations = await store.oddsObservationsForReplay(since, limit);
  const runId = await store.startRun({ worker: 'boxing-odds-replay', sourceKey: SOURCE_KEY, adapterVersion: ADAPTER_VERSION,
    provenance: provenance ? { ...provenance, source_version: ADAPTER_VERSION } : { trigger_type: 'backfill' } });
  const metrics = { observations: observations.length, provider_events: 0, events_matched: 0, events_unmatched: 0, ticks_inserted: 0, ticks_unchanged: 0, newly_linked_events: [] };
  const linkedBefore = new Set(Object.keys(await store.boutsForProviderEvents('the_odds_api.event', [...new Set(observations.flatMap((o) => (Array.isArray(o.payload) ? o.payload : []).map((e) => String(e.id))))])));
  for (const o of observations) {
    if (!Array.isArray(o.payload)) continue;
    const region = String(o.external_key ?? '').split('|')[1] ?? 'unknown';
    const r = await ingestOddsPayload(store, { payload: o.payload, capturedAt: o.captured_at, runId, region, observation: { id: o.id, duplicate: true }, replay: true });
    for (const k of ['provider_events', 'events_matched', 'events_unmatched', 'ticks_inserted', 'ticks_unchanged']) metrics[k] += r.metrics[k];
    for (const m of r.matched) if (!linkedBefore.has(m.provider_event_id) && !metrics.newly_linked_events.includes(m.provider_event_id)) metrics.newly_linked_events.push(m.provider_event_id);
  }
  await store.finishRun(runId, { status: 'ok', metrics, observed: metrics.provider_events, canonicalWrites: metrics.ticks_inserted, reviewItems: 0, errors: 0 });
  return { runId, status: 'ok', metrics };
}
