// boxing-rankings — title graph + ranking snapshots + sanctioning-body collection (internal only).
//
// Routes (Bearer BOXING_INTERNAL_TOKEN):
//   POST /internal/v1/rankings/documents   ranking document -> snapshot/revision + RANKING_CHANGED
//   POST /internal/v1/titles/events        title event -> derived reigns + TITLE_* news event
//   POST /internal/v1/titles/lineages      { organization_slug, weight_class_key, gender, tier, source_native_label }
//   GET  /internal/v1/title-map?weight_class=&gender=&as_of=
//
// scheduled(): TITLES_INGEST_ENABLED must be "true". Collects the current WBA, WBO and IBF documents (owner approvals
// 2026-09-14) through runSanctioningCollection, one body after another; records a blocked run for the WBC (not licensed).

import { guardedPostgrestStore } from '../../../shared/store/target-guard.mjs';
import { runSanctioningCollection } from '../../../shared/titles/sanctioning-ingest.mjs';
import { scheduledProvenance } from '../../../shared/provenance.mjs';
import { importRankingDocument } from '../../../shared/rankings/import.mjs';
import { recordTitleEvent } from '../../../shared/titles/events.mjs';
import { buildTitleMap } from '../../../shared/titles/title-map.mjs';
import { COLLECTED_BODIES, rankingAdapters } from '../../../shared/adapters/rankings/registry.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function constantTimeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
const authorized = (request, env) => {
  const token = env.BOXING_INTERNAL_TOKEN;
  const header = request.headers.get('authorization') ?? '';
  return Boolean(token && token.length >= 32 && header.startsWith('Bearer ') && constantTimeEqual(header.slice(7), token));
};

export function createWorker({ makeStore = (env) => guardedPostgrestStore(env), adapters = rankingAdapters, fetchImpl = fetch, collect = runSanctioningCollection } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === '/health') return json({ ok: true, service: 'boxing-rankings' });
      if (!url.pathname.startsWith('/internal/')) return json({ error: 'not_found' }, 404);
      if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
      let store;
      try { store = makeStore(env); } catch { return json({ error: 'store_not_configured' }, 503); }
      try {
        if (url.pathname === '/internal/v1/title-map' && request.method === 'GET') {
          const wc = url.searchParams.get('weight_class');
          const gender = url.searchParams.get('gender') ?? 'male';
          const asOf = url.searchParams.get('as_of') ?? new Date().toISOString().slice(0, 10);
          if (!wc || !/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !['male', 'female'].includes(gender)) return json({ error: 'bad_request' }, 400);
          return json(buildTitleMap(await store.titleMapFacts(wc, gender, asOf)));
        }
        const body = request.method === 'POST' ? await request.json().catch(() => null) : null;
        if (url.pathname === '/internal/v1/rankings/documents' && request.method === 'POST') {
          if (!body) return json({ error: 'bad_request' }, 400);
          const out = await importRankingDocument(store, body);
          return json(out, out.status === 'rejected' ? 422 : 200);
        }
        if (url.pathname === '/internal/v1/titles/events' && request.method === 'POST') {
          if (!body?.title_id || !body?.event_type || !body?.effective_on || !body?.source_key) return json({ error: 'bad_request' }, 400);
          return json(await recordTitleEvent(store, body));
        }
        if (url.pathname === '/internal/v1/titles/lineages' && request.method === 'POST') {
          if (!body?.organization_slug || !body?.weight_class_key || !body?.gender || !body?.tier) return json({ error: 'bad_request' }, 400);
          const id = await store.ensureTitle({ organizationSlug: body.organization_slug, weightClassKey: body.weight_class_key,
            gender: body.gender, tier: body.tier, sourceNativeLabel: body.source_native_label ?? null });
          return json({ title_id: id });
        }
        return json({ error: 'not_found' }, 404);
      } catch (err) {
        return json({ error: 'internal_error', detail: String(err?.message ?? err).slice(0, 300) }, 500);
      }
    },
    async scheduled(controller, env) {
      if (env.TITLES_INGEST_ENABLED !== 'true') return;
      let store;
      try { store = makeStore(env); } catch (err) { console.log(`boxing-rankings: skipped (${err?.code ?? 'store_not_configured'})`); return; }
      const results = {};
      for (const body of COLLECTED_BODIES) {
        const provenance = scheduledProvenance(controller, env, { workerName: 'boxing-rankings' });
        const r = await collect(store, env, { body, mode: 'current', fetchImpl, provenance });
        results[body] = r.status;
      }
      for (const adapter of Object.values(adapters).filter((a) => a.state === 'not_licensed')) {
        const runId = await store.startRun({ worker: 'boxing-rankings', sourceKey: adapter.sourceKey, adapterVersion: `${adapter.key}@not_licensed` });
        await store.finishRun(runId, { status: 'blocked', metrics: {}, assertions: { source_policy: adapter.disabled } });
        results[adapter.key] = 'blocked';
      }
      console.log(`boxing-rankings: ${JSON.stringify(results)}`);
    },
  };
}

export default createWorker();
