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
