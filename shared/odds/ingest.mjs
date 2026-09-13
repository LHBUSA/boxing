// Odds snapshot ingest: raw payload -> observation -> event/bout matching ->
// normalized markets -> append-only ticks -> unmatched queue -> run metrics.
// Runtime-agnostic (pg store locally, PostgREST store in Workers).

import { contentHash } from '../canonical.mjs';
import { MATCHER_VERSION, matchEvent, providerNameKey } from './match.mjs';
import {
  ADAPTER_VERSION, EVENT_NAMESPACE, PROVIDER_SLUG, SOURCE_KEY, SPORT_KEY, normalizeEvent, validatePayload,
} from '../adapters/odds/the-odds-api.mjs';
import { DEFAULT_MOVE_CONFIG, buildMarketMovedEvent, evaluateMarketMove } from './movement.mjs';

// replay: re-resolution of a stored observation (no provider call). The unmatched
// queue is not re-counted and new mappings record resolver version + run.
export async function ingestOddsPayload(store, { payload, capturedAt = new Date().toISOString(), runId = null, region = 'us', quota = null, observation = null, replay = false }) {
  validatePayload(payload);
  const metrics = {
    provider_events: payload.length,
    events_matched: 0,
    events_unmatched: 0,
    unmatched_reasons: {},
    markets_normalized: 0,
    ticks_inserted: 0,
    ticks_unchanged: 0,
    unsupported_markets: 0,
    rejected_markets: 0,
    raw_observation_duplicate: false,
    quota,
  };

  // the capture pipeline records the raw observation first and passes it in
  const obs = observation ?? await store.recordObservation({
    source_key: SOURCE_KEY,
    ingest_run_id: runId,
    entity_type: 'odds_snapshot',
    external_key: SPORT_KEY,
    payload,
    content_hash: await contentHash(payload),
    parser_version: ADAPTER_VERSION,
    source_published_at: capturedAt,
  });
  metrics.raw_observation_duplicate = obs.duplicate;

  if (!payload.length) return { metrics, matched: [] };

  const times = payload.map((e) => Date.parse(e.commence_time)).filter(Number.isFinite);
  const from = new Date(Math.min(...times) - 3 * 86_400_000).toISOString();
  const to = new Date(Math.max(...times) + 3 * 86_400_000).toISOString();
  const bouts = await store.boutsInWindow(from, to, replay);
  const participantIds = [...new Set(bouts.flatMap((b) => b.participants.map((p) => p.fighter_id)))];
  const { candidates } = participantIds.length ? await store.candidates({ scope: participantIds }) : { candidates: [] };
  const candidatesById = new Map(candidates.map((c) => [c.id, c]));
  const mapped = await store.boutsForProviderEvents(EVENT_NAMESPACE, payload.map((e) => String(e.id)));
  const names = [...new Set(payload.flatMap((e) => [e.home_team, e.away_team]).filter(Boolean).map(providerNameKey))];
  const providerIdentities = store.providerParticipantIdentityMap && names.length
    ? new Map(Object.entries(await store.providerParticipantIdentityMap(PROVIDER_SLUG, names))) : new Map();
  metrics.provider_identities_verified = 0;

  const matched = [];
  for (const event of payload) {
    const m = matchEvent(event, { bouts, candidatesById, mappedBoutId: mapped[event.id] ?? null, providerIdentities });
    if (!m.matched) {
      metrics.events_unmatched++;
      metrics.unmatched_reasons[m.reason] = (metrics.unmatched_reasons[m.reason] ?? 0) + 1;
      if (replay) continue;
      await store.recordMarketUnmatched({
        provider_slug: PROVIDER_SLUG, provider_event_id: String(event.id), reason: m.reason, detail: m.detail ?? {},
        home_name: event.home_team, away_name: event.away_team, commence_time: event.commence_time, observation_id: obs.id,
      });
      continue;
    }
    if (m.method !== 'existing_mapping') {
      const map = await store.mapProviderEvent({
        namespace: EVENT_NAMESPACE, provider_event_id: String(event.id), bout_id: m.bout_id, source_key: SOURCE_KEY,
        verification_state: 'probable', confidence: 90, evidence: { method: m.method, ...m.evidence, ...(replay ? { replayed_from_observation: obs.id, original_captured_at: capturedAt } : {}) },
        resolver_version: MATCHER_VERSION, resolution_run_id: runId,
      });
      if (map.status === 'conflict') {
        metrics.events_unmatched++;
        metrics.unmatched_reasons.mapping_conflict = (metrics.unmatched_reasons.mapping_conflict ?? 0) + 1;
        await store.recordMarketUnmatched({
          provider_slug: PROVIDER_SLUG, provider_event_id: String(event.id), reason: 'mapping_conflict',
          detail: { resolved_bout_id: m.bout_id, mapped_bout_id: map.mapped_bout_id },
          home_name: event.home_team, away_name: event.away_team, commence_time: event.commence_time, observation_id: obs.id,
        });
        continue;
      }
    }
    // both names resolved to the two corners of one canonical bout: the provider's
    // participant names are now verified identities (evidence, never a source of boxers)
    if (store.recordProviderParticipantIdentity) {
      for (const side of ['home', 'away']) {
        const ev = m.evidence?.[side];
        if (!ev?.fighter_id || ev.level === 'provider_identity_verified') continue;
        const r = await store.recordProviderParticipantIdentity({
          provider_slug: PROVIDER_SLUG, participant_name: ev.name, normalized_name: providerNameKey(ev.name), fighter_id: ev.fighter_id,
          bout_id: m.bout_id, provider_event_id: String(event.id), resolver_version: MATCHER_VERSION, ingest_run_id: runId,
          evidence: { method: m.method, name_level: ev.level, side: ev.side, captured_at: capturedAt, replay },
        });
        if (r.status === 'verified') metrics.provider_identities_verified += 1;
      }
    }
    const norm = normalizeEvent(event, { sides: m.sides, fighters: m.fighters, region });
    metrics.unsupported_markets += norm.unsupported.length;
    metrics.rejected_markets += norm.rejected.length;
    const r = await store.ingestMarketSnapshot({
      provider_slug: PROVIDER_SLUG, bout_id: m.bout_id, provider_event_id: String(event.id), commence_time: event.commence_time,
      captured_at: capturedAt, observation_id: obs.id, ingest_run_id: runId, bookmakers: norm.bookmakers,
    });
    metrics.events_matched++;
    metrics.markets_normalized += r.markets;
    metrics.ticks_inserted += r.ticks_inserted;
    metrics.ticks_unchanged += r.ticks_unchanged;
    matched.push({ provider_event_id: String(event.id), bout_id: m.bout_id, fighters: m.fighters, rejected: norm.rejected });
  }
  return { metrics, matched, observation_id: obs.id };
}

// Evaluates MARKET_MOVED for matched bouts' prematch moneylines and emits
// deduplicated news events.
export async function detectAndEmitMoves(store, { matched, now = new Date().toISOString(), config = DEFAULT_MOVE_CONFIG }) {
  const emitted = [];
  const suppressed = {};
  for (const { bout_id: boutId, fighters } of matched) {
    for (const mk of ['moneyline|fight|-|pre', 'moneyline_3way|fight|-|pre']) {
      const since = new Date(Date.parse(now) - config.windowHours * 3600_000).toISOString();
      const ticks = await store.tickHistory(boutId, mk, since);
      if (!ticks.length) continue;
      const recent = await store.recentNewsEvents('MARKET_MOVED', boutId, new Date(Date.parse(now) - config.cooldownHours * 3600_000).toISOString());
      for (const selectionKey of ['fighter_a', 'fighter_b']) {
        const lastEvent = recent.find((e) => e.payload?.facts?.market_key === mk && e.payload?.facts?.selection_key === selectionKey) ?? null;
        const ev = evaluateMarketMove({ boutId, marketKey: mk, selectionKey, ticks, now, lastEvent, config, provider: PROVIDER_SLUG });
        if (!ev.emit) {
          suppressed[ev.reason] = (suppressed[ev.reason] ?? 0) + 1;
          continue;
        }
        const side = selectionKey.slice(-1);
        const event = await buildMarketMovedEvent(ev, { sourceKey: SOURCE_KEY, detectedAt: now, fighterIds: [fighters[side]] });
        const r = await store.emitNewsEvent(event);
        if (r.inserted) emitted.push({ id: r.id, dedupe_key: event.dedupe_key, facts: ev.facts });
        else suppressed.duplicate = (suppressed.duplicate ?? 0) + 1;
      }
    }
  }
  return { emitted, suppressed };
}
