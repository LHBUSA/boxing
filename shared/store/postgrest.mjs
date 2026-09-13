// PostgREST implementation of the boxing store for Cloudflare Workers.
// Same method names and SQL functions as scripts/lib/pg-store.mjs.
//
// Security: the service-role key is sent only in request headers. Errors carry
// the HTTP status and PostgREST's error code/message, never request headers.

export class StoreError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'StoreError';
    this.status = status;
    this.code = code;
  }
}

export function postgrestStore({ url, serviceKey, fetchImpl = fetch }) {
  if (!url || !serviceKey) throw new StoreError('store_not_configured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  const base = url.replace(/\/+$/, '');
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  async function call(path, { method = 'POST', body, prefer } = {}) {
    const res = await fetchImpl(`${base}/rest/v1/${path}`, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
    if (!res.ok) {
      throw new StoreError(`postgrest ${method} ${path.split('?')[0]} failed: ${json?.message ?? res.statusText}`,
        { status: res.status, code: json?.code });
    }
    return json;
  }
  const rpc = (fn, args) => call(`rpc/${fn}`, { body: args });

  return {
    candidates: ({ keys = [], searchName = null, dob = null, namespace = null, externalId = null, scope = null, limit = 40 }) =>
      rpc('boxing_identity_candidates', {
        p_keys: keys, p_search_name: searchName, p_dob: dob, p_namespace: namespace,
        p_external_id: externalId, p_scope: scope, p_limit: limit,
      }),
    applyDecision: (payload) => rpc('boxing_apply_identity_decision', { p: payload }),
    resolveReview: ({ itemId, kind, fighterId = null, note, actor, index = {} }) =>
      rpc('boxing_resolve_identity_review', { p_item: itemId, p_kind: kind, p_fighter: fighterId, p_note: note, p_actor: actor, p_index: index }),
    getFighter: (ref) => rpc('boxing_get_fighter', { p_ref: ref }),
    listUnresolved: ({ limit = 100, sourceKey = null } = {}) =>
      rpc('boxing_list_unresolved_identities', { p_limit: limit, p_source_key: sourceKey }),
    coverage: () => rpc('boxing_identity_coverage', {}),
    // --- odds / news
    recordObservation: (p) => rpc('boxing_record_observation', { p }),
    boutsInWindow: (from, to) => rpc('boxing_market_bouts_in_window', { p_from: from, p_to: to }),
    boutsForProviderEvents: (namespace, ids) => rpc('boxing_bouts_for_provider_events', { p_namespace: namespace, p_event_ids: ids }),
    mapProviderEvent: (p) => rpc('boxing_map_provider_event', { p }),
    recordMarketUnmatched: (p) => rpc('boxing_record_market_unmatched', { p }),
    ingestMarketSnapshot: (p) => rpc('boxing_ingest_market_snapshot', { p }),
    tickHistory: (boutId, marketKey, since) => rpc('boxing_market_tick_history', { p_bout: boutId, p_market_key: marketKey, p_since: since }),
    emitNewsEvent: (p) => rpc('boxing_emit_news_event', { p }),
    recentNewsEvents: (eventType, boutId, since) => rpc('boxing_recent_news_events', { p_event_type: eventType, p_bout: boutId, p_since: since }),
    selectionPrices: (boutId) => call(`boxing_market_selection_prices?bout_id=eq.${boutId}&order=market_key,bookmaker,selection_key`, { method: 'GET' }),
    consensus: (boutId) => call(`boxing_market_consensus?bout_id=eq.${boutId}&order=market_key,selection_key`, { method: 'GET' }),
    // --- titles / rankings
    ensureTitle: ({ organizationSlug, weightClassKey, gender, tier, sourceNativeLabel = null }) =>
      rpc('boxing_ensure_title', { p_org_slug: organizationSlug, p_weight_class_key: weightClassKey, p_gender: gender, p_tier: tier, p_source_native_label: sourceNativeLabel }),
    recordTitleEvent: (p) => rpc('boxing_record_title_event', { p }),
    titleSummary: (titleId) => rpc('boxing_title_summary', { p_title: titleId }),
    async titleEventById(id) {
      const rows = await call(`boxing_title_events?id=eq.${encodeURIComponent(id)}`, { method: 'GET' });
      return rows?.[0] ?? null;
    },
    titleReigns: (titleId) => rpc('boxing_title_reigns_derived', { p_title: titleId }),
    titleMapFacts: (weightClassKey, gender, asOf) => rpc('boxing_title_map_facts', { p_weight_class_key: weightClassKey, p_gender: gender, p_as_of: asOf }),
    importRankingSnapshot: (p) => rpc('boxing_import_ranking_snapshot', { p }),
    rankingEntries: (snapshotId) => rpc('boxing_ranking_entries_json', { p_snapshot: snapshotId }),
    rankingSnapshotAsOf: (orgSlug, weightClassKey, gender, asOf) =>
      rpc('boxing_ranking_as_of_json', { p_org_slug: orgSlug, p_weight_class_key: weightClassKey, p_gender: gender, p_as_of: asOf }),
    // --- events / outcomes
    upsertEvent: (p) => rpc("boxing_upsert_event", { p: p }),
    cardState: (p) => rpc("boxing_card_state", { p_event: p }),
    addBout: (p) => rpc("boxing_add_bout", { p: p }),
    applyCardChange: (p) => rpc("boxing_apply_card_change", { p: p }),
    applyOfficialDecision: (p) => rpc("boxing_apply_official_decision", { p: p }),
    ensureCommission: (p) => rpc("boxing_ensure_commission", { p: p }),
    ensureVenue: (p) => rpc("boxing_ensure_venue", { p: p }),
    ensureOrganization: (p) => rpc("boxing_ensure_organization", { p: p }),
    recordResult: (p) => rpc("boxing_record_result", { p: p }),
    recordScorecard: (p) => rpc("boxing_record_scorecard", { p: p }),
    recordWeighIn: (p) => rpc("boxing_record_weigh_in", { p: p }),
    recordRegulatoryAction: (p) => rpc("boxing_record_regulatory_action", { p: p }),
    recordPointDeduction: (p) => rpc("boxing_record_point_deduction", { p: p }),
    boutOutcomeState: (p) => rpc("boxing_bout_outcome_state", { p_bout: p }),
    officialCandidates: (keys, namespace, externalId) => rpc("boxing_official_candidates", { p_keys: keys, p_namespace: namespace, p_external_id: externalId }),
    async source(sourceKey) {
      const rows = await call(
        `boxing_sources?select=id,source_key,enabled,access_mode,rights_state,persistence_allowed&source_key=eq.${encodeURIComponent(sourceKey)}`,
        { method: 'GET' });
      return rows?.[0] ?? null;
    },
    async startRun({ worker, sourceKey, adapterVersion }) {
      const src = await this.source(sourceKey);
      const rows = await call('boxing_ingest_runs', {
        body: { worker, adapter_version: adapterVersion, source_id: src?.id ?? null },
        prefer: 'return=representation',
      });
      return rows[0].id;
    },
    async finishRun(id, { status, metrics, observed = 0, canonicalWrites = 0, reviewItems = 0, errors = 0, assertions = {} }) {
      await call(`boxing_ingest_runs?id=eq.${id}`, {
        method: 'PATCH',
        body: {
          finished_at: new Date().toISOString(), status, metrics, observed_count: observed,
          canonical_writes: canonicalWrites, review_items: reviewItems, error_count: errors, assertions,
          duplicates_skipped: metrics?.duplicate_observations ?? 0,
        },
      });
    },
  };
}
