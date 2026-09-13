// Seed run for one identity adapter. Fail-closed: checks the live source row
// before fetching anything, records a run row either way, stops on schema
// drift instead of writing guesses.

import { ingestIdentity, summarize } from './pipeline.mjs';

export async function runSeed(store, adapter, { fetchImpl = fetch, limit = 200, maxPages = 1, bornFrom = 1975, worker = 'boxing-identity', log = () => {} } = {}) {
  const src = await store.source(adapter.sourceKey);
  const allowed = src && src.enabled && src.persistence_allowed && ['approved_ingest', 'identity_only'].includes(src.access_mode);
  const runId = await store.startRun({ worker, sourceKey: adapter.sourceKey, adapterVersion: adapter.version });

  if (adapter.disabled || !allowed) {
    const why = adapter.disabled ?? `source ${adapter.sourceKey} not approved (enabled=${src?.enabled}, access_mode=${src?.access_mode}, persistence_allowed=${src?.persistence_allowed})`;
    await store.finishRun(runId, { status: 'blocked', metrics: { blocked: why }, assertions: { source_policy: why } });
    return { runId, status: 'blocked', reason: why, metrics: null };
  }

  const results = [];
  const rejected = [];
  let cursor = null;
  let status = 'ok';
  let error = null;
  try {
    for (let page = 0; page < maxPages; page++) {
      const { records, rejected: bad, lastQid, rowCount } = await adapter.fetchPage({ fetchImpl, limit, afterQid: cursor, bornFrom });
      rejected.push(...bad);
      for (const { record, payload } of records) {
        results.push(await ingestIdentity(store, {
          sourceKey: adapter.sourceKey,
          accessMode: src.access_mode,
          namespace: adapter.namespace,
          record,
          payload,
          sourceUrl: adapter.sourceUrl(record),
          runId,
          parserVersion: adapter.version,
          omit: adapter.omitFromHash,
        }));
      }
      log(`page ${page + 1}: ${records.length} records, ${bad.length} rejected`);
      // page size is measured in raw rows (one QID can span several rows)
      if (!lastQid || (rowCount ?? records.length + bad.length) < limit) break;
      cursor = lastQid;
    }
  } catch (err) {
    status = results.length ? 'partial' : 'failed';
    error = String(err?.message ?? err).slice(0, 300);
  }

  const metrics = summarize(results);
  metrics.identities_rejected += rejected.length;
  metrics.adapter_rejections = rejected.reduce((acc, r) => ({ ...acc, [r.reason]: (acc[r.reason] ?? 0) + 1 }), {});
  await store.finishRun(runId, {
    status,
    metrics,
    observed: results.length + rejected.length,
    canonicalWrites: metrics.canonical_fighters_created + metrics.identities_matched,
    reviewItems: metrics.identities_unresolved,
    errors: error ? 1 : 0,
    assertions: error ? { fetch: error } : {},
  });
  return { runId, status, error, metrics };
}
