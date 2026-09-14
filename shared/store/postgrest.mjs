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
    boutsInWindow: (from, to, includeCompleted = false) => rpc('boxing_market_bouts_in_window', { p_from: from, p_to: to, p_include_completed: includeCompleted }),
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
    importTitleStatusSnapshot: (p) => rpc('boxing_import_title_status_snapshot', { p }),
    recordTitleAnalysis: (p) => rpc('boxing_record_title_analysis', { p }),
    holdOrgIdentity: (p) => rpc('boxing_hold_org_identity', { p }),
    orgIdentityUnmappedNames: (orgSlug, limit) => rpc('boxing_org_identity_unmapped_names', { p_org_slug: orgSlug, p_limit: limit }),
    recordOrgIdentityNames: (p) => rpc('boxing_record_org_identity_names', { p }),
    refreshOrgIdentityCandidates: ({ full = false } = {}) => rpc('boxing_refresh_org_identity_candidates_v2', { p_full: full }),
    orgIdentityReviewSummary: () => rpc('boxing_org_identity_review_summary', {}),
    derivedUnification: (weightClassKey, gender) => rpc('boxing_derived_unification', { p_weight_class_key: weightClassKey, p_gender: gender }),
    titleSnapshotJson: (id) => rpc('boxing_title_snapshot_json', { p_snapshot: id }),
    latestTitleSnapshot: (orgSlug, weightClassKey, gender, kind, onOrBefore = null, exclude = null) =>
      rpc('boxing_latest_title_snapshot', { p_org_slug: orgSlug, p_weight_class_key: weightClassKey, p_gender: gender, p_kind: kind, p_on_or_before: onOrBefore, p_exclude: exclude }),
    orgIdentityResolution: (orgSlug, normalizedName, country, orgBoxerId) =>
      rpc('boxing_org_identity_resolution', { p_org_slug: orgSlug, p_normalized_name: normalizedName, p_country: country, p_org_boxer_id: orgBoxerId }),
    backfillCheckpoint: (sourceKey, jobKey, { cursor = null, completed = null, failure = null } = {}) =>
      rpc('boxing_backfill_checkpoint', { p_source_key: sourceKey, p_job_key: jobKey, p_cursor: cursor, p_completed: completed, p_failure: failure }),
    siteTitleLanes: (weightClassKey, gender) => rpc('boxing_site_title_lanes', { p_weight_class_key: weightClassKey, p_gender: gender }),
    siteBodyRankings: (orgSlug, weightClassKey, gender, asOf) => rpc('boxing_site_body_rankings', { p_org_slug: orgSlug, p_weight_class_key: weightClassKey, p_gender: gender, p_as_of: asOf }),
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
    officialCleanupEvidence: () => rpc("boxing_official_cleanup_evidence", {}),
    applyOfficialCanonicalization: (p) => rpc("boxing_apply_official_canonicalization", { p: p }),
    officialCandidates: (keys, namespace, externalId) => rpc("boxing_official_candidates", { p_keys: keys, p_namespace: namespace, p_external_id: externalId }),
    // --- newsroom
    newsContext: (p) => rpc("boxing_news_context", { p_news_event: p }),
    storeArticle: (p) => rpc("boxing_store_article", { p: p }),
    pendingNewsEvents: (p) => rpc("boxing_news_events_pending", { p_limit: p }),
    wire: (p) => rpc("boxing_wire", { p_limit: p }),
    setNewsEventState: (id, state) => rpc("boxing_set_news_event_state", { p_id: id, p_state: state }),
    reviewArticle: (id, decision, actor, note) => rpc("boxing_review_article", { p_article: id, p_decision: decision, p_actor: actor, p_note: note }),
    publishArticle: (id) => rpc("boxing_publish_article", { p_article: id }),
    // --- intelligence
    registerMetricDefinition: (p) => rpc("boxing_register_metric_definition", { p: p }),
    writeMetricSnapshots: (p) => rpc("boxing_write_metric_snapshots", { p: p }),
    writeMatchupSnapshot: (p) => rpc("boxing_write_matchup_snapshot", { p: p }),
    matchupInputs: (p) => rpc("boxing_matchup_inputs", { p_bout: p }),
    fighterDnaLatest: (p) => rpc("boxing_fighter_dna_latest", { p_fighter: p }),
    officialDnaLatest: (p) => rpc("boxing_official_dna_latest", { p_official: p }),
    fighterHistoryAsOf: (id, cutoff) => rpc("boxing_fighter_history_as_of", { p_fighter: id, p_cutoff: cutoff }),
    officialHistoryAsOf: (id, cutoff) => rpc("boxing_official_history_as_of", { p_official: id, p_cutoff: cutoff }),
    startIntelRun: (kind, engine, cutoff) => rpc("boxing_start_intel_run", { p_kind: kind, p_engine: engine, p_cutoff: cutoff }),
    finishIntelRun: (id, status, subjects, written, metrics) => rpc("boxing_finish_intel_run", { p_run: id, p_status: status, p_subjects: subjects, p_written: written, p_metrics: metrics }),
    // --- provider market ledger
    ingestProviderQuotes: (p) => rpc('boxing_ingest_provider_quotes', { p }),
    recordProviderCapture: (p) => rpc('boxing_record_provider_capture', { p }),
    oddsScheduleState: (now) => rpc('boxing_odds_schedule_state', { p_now: now }),
    providerCoverage: () => rpc('boxing_provider_coverage', {}),
    // --- commission documents / replay
    recordDocumentFetch: (p) => rpc('boxing_record_document_fetch', { p }),
    documentState: (sourceKey, docKeys) => rpc('boxing_source_document_state', { p_source_key: sourceKey, p_doc_keys: docKeys }),
    oddsObservationsForReplay: (since = null, limit = 200) => rpc('boxing_odds_observations_for_replay', { p_since: since, p_limit: limit }),
    commissionCoverage: () => rpc('boxing_commission_coverage', {}),
    commissionRevisionSummary: () => rpc('boxing_commission_revision_summary', {}),
    // --- identity graph
    appearanceBindings: (namespace, keys) => rpc('boxing_appearance_bindings', { p_namespace: namespace, p_keys: keys }),
    identityGraphContext: (ids) => rpc('boxing_identity_graph_context', { p_ids: ids }),
    recordAppearanceDecision: (p) => rpc('boxing_record_appearance_decision', { p }),
    identityReviewBacklog: (sourceKeys = null) => rpc('boxing_identity_review_backlog', { p_source_keys: sourceKeys }),
    commissionParsedDocuments: (sourceKey, offset = 0, limit = 10) => rpc('boxing_commission_parsed_documents', { p_source_key: sourceKey, p_offset: offset, p_limit: limit }),
    sourceCornerFighters: (sourceKey, namespace, bouts) => rpc('boxing_source_corner_fighters', { p_source_key: sourceKey, p_namespace: namespace, p_bouts: bouts }),
    sourceEventIds: (namespace, externalIds) => rpc('boxing_source_event_ids', { p_namespace: namespace, p_external_ids: externalIds }),
    recordProviderParticipantIdentity: (p) => rpc('boxing_record_provider_participant_identity', { p }),
    providerParticipantIdentityMap: (providerSlug, names) => rpc('boxing_provider_participant_identity_map', { p_provider_slug: providerSlug, p_names: names }),
    eventCrossSourceCandidates: (p) => rpc('boxing_event_cross_source_candidates', { p }),
    attachEventIdentity: (p) => rpc('boxing_attach_event_identity', { p }),
    eventOwner: (eventId) => rpc('boxing_event_owner', { p_event: eventId }),
    appearanceLatest: (namespace, keys) => rpc('boxing_appearance_latest', { p_namespace: namespace, p_keys: keys }),
    fighterNameIndex: () => rpc('boxing_fighter_name_index', {}),
    possibleDuplicateBouts: (limit = 100) => rpc('boxing_possible_duplicate_bouts', { p_limit: limit }),
    identityTierSummary: () => rpc('boxing_identity_tier_summary', {}),
    // --- read-only gateway
    gatewayBout: (id) => rpc('boxing_gateway_bout', { p_bout: id }),
    gatewayOfficial: (id) => rpc('boxing_gateway_official', { p_official: id }),
    gatewayMatchup: (id, limit) => rpc('boxing_gateway_matchup', { p_bout: id, p_limit: limit }),
    gatewayModels: () => rpc('boxing_gateway_models', {}),
    gatewayOddsSummary: (id) => rpc('boxing_gateway_odds_summary', { p_bout: id }),
    // --- site read contract (migration 0020): fixed-field projections for the consumer frontend
    siteHome: (today) => rpc('boxing_site_home', { p_today: today }),
    siteEvents: (scope, commission, limit, offset, today) => rpc('boxing_site_events', { p_scope: scope, p_commission: commission, p_limit: limit, p_offset: offset, p_today: today }),
    siteEvent: (ref) => rpc('boxing_site_event', { p_ref: ref }),
    siteBout: (ref) => rpc('boxing_site_bout', { p_ref: ref }),
    siteFighters: (q, limit, offset) => rpc('boxing_site_fighters', { p_q: q, p_limit: limit, p_offset: offset }),
    siteFighter: (ref) => rpc('boxing_site_fighter', { p_ref: ref }),
    siteFighterContext: (ref) => rpc('boxing_site_fighter_context', { p_ref: ref }),
    siteBoutContext: (ref) => rpc('boxing_site_bout_context', { p_ref: ref }),
    siteHallOfFame: (category, year, limit, offset) => rpc('boxing_site_hall_of_fame', { p_category: category, p_year: year, p_limit: limit, p_offset: offset }),
    siteHistory: () => rpc('boxing_site_history', {}),
    siteWire: (limit) => rpc('boxing_site_wire', { p_limit: limit }),
    siteTitleBoard: () => rpc('boxing_site_title_board', {}),
    siteRankingBoard: () => rpc('boxing_site_ranking_board', {}),
    siteCoverage: (today) => rpc('boxing_site_coverage', { p_today: today }),
    siteScorecards: (decision, commission, sort, limit, offset) => rpc('boxing_site_scorecards', { p_decision: decision, p_commission: commission, p_sort: sort, p_limit: limit, p_offset: offset }),
    siteScorecard: (ref) => rpc('boxing_site_scorecard', { p_ref: ref }),
    siteOfficials: (role, q, limit, offset) => rpc('boxing_site_officials', { p_role: role, p_q: q, p_limit: limit, p_offset: offset }),
    siteOfficial: (ref) => rpc('boxing_site_official', { p_ref: ref }),
    siteMarketIndex: (today) => rpc('boxing_site_market_index', { p_today: today }),
    siteVideos: (type, limit) => rpc('boxing_site_videos', { p_type: type, p_limit: limit }),
    sitePromoters: () => rpc('boxing_site_promoters', {}),
    sitePromoter: (key) => rpc('boxing_site_promoter', { p_key: key }),
    async source(sourceKey) {
      const rows = await call(
        `boxing_sources?select=id,source_key,enabled,access_mode,rights_state,persistence_allowed,derivative_allowed,display_allowed,redistribution_allowed,latest_rights_review_id&source_key=eq.${encodeURIComponent(sourceKey)}`,
        { method: 'GET' });
      return rows?.[0] ?? null;
    },
    recordWorkerInvocation: (p) => rpc('boxing_record_worker_invocation', { p }),
    schedulerEvidence: (worker, since) => rpc('boxing_scheduler_evidence', { p_worker: worker, p_since: since }),
    async startRun({ worker, sourceKey, adapterVersion, provenance = null }) {
      const src = await this.source(sourceKey);
      const p = provenance ?? {};
      const rows = await call('boxing_ingest_runs', {
        body: {
          worker, adapter_version: adapterVersion, source_id: src?.id ?? null, trigger_type: p.trigger_type ?? 'unknown',
          worker_name: p.worker_name ?? null, worker_version: p.worker_version ?? null, deployment_id: p.deployment_id ?? null,
          invocation_id: p.invocation_id ?? null, scheduled_for: p.scheduled_for ?? null, runtime: p.runtime ?? null,
          source_version: p.source_version ?? adapterVersion ?? null, config_hash: p.config_hash ?? null,
        },
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
