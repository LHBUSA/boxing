// node-postgres implementation of the boxing store (local scripts and tests).
// Workers use shared/store/postgrest.mjs, which calls the same SQL functions.

const one = async (client, sql, params) => (await client.query(sql, params)).rows[0];

export function pgStore(client) {
  return {
    async candidates({ keys = [], searchName = null, dob = null, namespace = null, externalId = null, scope = null, limit = 40 }) {
      return (await one(client, 'select public.boxing_identity_candidates($1, $2, $3, $4, $5, $6, $7) as r',
        [keys, searchName, dob, namespace, externalId, scope, limit])).r;
    },
    async applyDecision(payload) {
      return (await one(client, 'select public.boxing_apply_identity_decision($1) as r', [payload])).r;
    },
    async resolveReview({ itemId, kind, fighterId = null, note, actor, index = {} }) {
      return (await one(client, 'select public.boxing_resolve_identity_review($1, $2, $3, $4, $5, $6) as r',
        [itemId, kind, fighterId, note, actor, index])).r;
    },
    async getFighter(ref) {
      return (await one(client, 'select public.boxing_get_fighter($1) as r', [ref])).r;
    },
    async listUnresolved({ limit = 100, sourceKey = null } = {}) {
      return (await one(client, 'select public.boxing_list_unresolved_identities($1, $2) as r', [limit, sourceKey])).r;
    },
    async coverage() {
      return (await client.query('select * from public.boxing_identity_coverage()')).rows;
    },
    // --- odds / news
    async recordObservation(p) {
      return (await one(client, 'select public.boxing_record_observation($1) as r', [p])).r;
    },
    async boutsInWindow(from, to) {
      return (await one(client, 'select public.boxing_market_bouts_in_window($1, $2) as r', [from, to])).r;
    },
    async boutsForProviderEvents(namespace, ids) {
      return (await one(client, 'select public.boxing_bouts_for_provider_events($1, $2) as r', [namespace, ids])).r;
    },
    async mapProviderEvent(p) {
      return (await one(client, 'select public.boxing_map_provider_event($1) as r', [p])).r;
    },
    async recordMarketUnmatched(p) {
      return (await one(client, 'select public.boxing_record_market_unmatched($1) as r', [p])).r;
    },
    async ingestMarketSnapshot(p) {
      return (await one(client, 'select public.boxing_ingest_market_snapshot($1) as r', [p])).r;
    },
    async tickHistory(boutId, marketKey, since) {
      return (await one(client, 'select public.boxing_market_tick_history($1, $2, $3) as r', [boutId, marketKey, since])).r;
    },
    async emitNewsEvent(p) {
      return (await one(client, 'select public.boxing_emit_news_event($1) as r', [p])).r;
    },
    async recentNewsEvents(eventType, boutId, since) {
      return (await one(client, 'select public.boxing_recent_news_events($1, $2, $3) as r', [eventType, boutId, since])).r;
    },
    async selectionPrices(boutId) {
      return (await client.query('select * from public.boxing_market_selection_prices where bout_id = $1 order by market_key, bookmaker, selection_key', [boutId])).rows;
    },
    async consensus(boutId) {
      return (await client.query('select * from public.boxing_market_consensus where bout_id = $1 order by market_key, selection_key', [boutId])).rows;
    },
    // --- titles / rankings
    async ensureTitle({ organizationSlug, weightClassKey, gender, tier, sourceNativeLabel = null }) {
      return (await one(client, 'select public.boxing_ensure_title($1, $2, $3, $4, $5) as r',
        [organizationSlug, weightClassKey, gender, tier, sourceNativeLabel])).r;
    },
    async recordTitleEvent(p) {
      return (await one(client, 'select public.boxing_record_title_event($1) as r', [p])).r;
    },
    async titleSummary(titleId) {
      return (await one(client, 'select public.boxing_title_summary($1) as r', [titleId])).r;
    },
    async titleEventById(id) {
      return one(client, 'select * from public.boxing_title_events where id = $1', [id]);
    },
    async titleReigns(titleId) {
      return (await client.query('select * from public.boxing_title_reigns_derived($1) order by started_on', [titleId])).rows;
    },
    async titleMapFacts(weightClassKey, gender, asOf) {
      return (await one(client, 'select public.boxing_title_map_facts($1, $2, $3) as r', [weightClassKey, gender, asOf])).r;
    },
    async importRankingSnapshot(p) {
      return (await one(client, 'select public.boxing_import_ranking_snapshot($1) as r', [p])).r;
    },
    async rankingEntries(snapshotId) {
      return (await one(client, 'select public.boxing_ranking_entries_json($1) as r', [snapshotId])).r;
    },
    async rankingSnapshotAsOf(orgSlug, weightClassKey, gender, asOf) {
      return (await one(client, 'select public.boxing_ranking_as_of_json($1, $2, $3, $4) as r', [orgSlug, weightClassKey, gender, asOf])).r;
    },
    // --- events / outcomes
    async upsertEvent(p) {
      return (await one(client, "select public.boxing_upsert_event($1) as r", [p])).r;
    },
    async cardState(p) {
      return (await one(client, "select public.boxing_card_state($1) as r", [p])).r;
    },
    async addBout(p) {
      return (await one(client, "select public.boxing_add_bout($1) as r", [p])).r;
    },
    async applyCardChange(p) {
      return (await one(client, "select public.boxing_apply_card_change($1) as r", [p])).r;
    },
    async applyOfficialDecision(p) {
      return (await one(client, "select public.boxing_apply_official_decision($1) as r", [p])).r;
    },
    async ensureCommission(p) {
      return (await one(client, "select public.boxing_ensure_commission($1) as r", [p])).r;
    },
    async ensureVenue(p) {
      return (await one(client, "select public.boxing_ensure_venue($1) as r", [p])).r;
    },
    async ensureOrganization(p) {
      return (await one(client, "select public.boxing_ensure_organization($1) as r", [p])).r;
    },
    async recordResult(p) {
      return (await one(client, "select public.boxing_record_result($1) as r", [p])).r;
    },
    async recordScorecard(p) {
      return (await one(client, "select public.boxing_record_scorecard($1) as r", [p])).r;
    },
    async recordWeighIn(p) {
      return (await one(client, "select public.boxing_record_weigh_in($1) as r", [p])).r;
    },
    async recordRegulatoryAction(p) {
      return (await one(client, "select public.boxing_record_regulatory_action($1) as r", [p])).r;
    },
    async recordPointDeduction(p) {
      return (await one(client, "select public.boxing_record_point_deduction($1) as r", [p])).r;
    },
    async boutOutcomeState(p) {
      return (await one(client, "select public.boxing_bout_outcome_state($1) as r", [p])).r;
    },
    async officialCandidates(keys, namespace, externalId) {
      return (await one(client, "select public.boxing_official_candidates($1, $2, $3) as r", [keys, namespace, externalId])).r;
    },
    // --- newsroom
    async newsContext(p) {
      return (await one(client, "select public.boxing_news_context($1) as r", [p])).r;
    },
    async storeArticle(p) {
      return (await one(client, "select public.boxing_store_article($1) as r", [p])).r;
    },
    async pendingNewsEvents(p) {
      return (await one(client, "select public.boxing_news_events_pending($1) as r", [p])).r;
    },
    async wire(p) {
      return (await one(client, "select public.boxing_wire($1) as r", [p])).r;
    },
    async setNewsEventState(id, state) {
      await client.query("select public.boxing_set_news_event_state($1, $2)", [id, state]);
    },
    async reviewArticle(id, decision, actor, note) {
      return (await one(client, "select public.boxing_review_article($1, $2, $3, $4) as r", [id, decision, actor, note])).r;
    },
    async publishArticle(id) {
      return (await one(client, "select public.boxing_publish_article($1) as r", [id])).r;
    },
    async source(sourceKey) {
      return one(client, 'select id, source_key, enabled, access_mode, rights_state, persistence_allowed from public.boxing_sources where source_key = $1', [sourceKey]);
    },
    async startRun({ worker, sourceKey, adapterVersion }) {
      return (await one(client,
        `insert into public.boxing_ingest_runs (worker, adapter_version, source_id)
         values ($1, $2, (select id from public.boxing_sources where source_key = $3)) returning id`,
        [worker, adapterVersion, sourceKey])).id;
    },
    async finishRun(id, { status, metrics, observed = 0, canonicalWrites = 0, reviewItems = 0, errors = 0, assertions = {} }) {
      await client.query(
        `update public.boxing_ingest_runs set finished_at = now(), status = $2, metrics = $3, observed_count = $4,
           canonical_writes = $5, review_items = $6, error_count = $7, assertions = $8,
           duplicates_skipped = coalesce(($3::jsonb ->> 'duplicate_observations')::int, 0)
         where id = $1`,
        [id, status, metrics, observed, canonicalWrites, reviewItems, errors, assertions]);
    },
  };
}
