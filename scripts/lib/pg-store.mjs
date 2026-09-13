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
