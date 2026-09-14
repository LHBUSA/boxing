// boxing-commissions — official athletic-commission ingestion.
//
// scheduled(): once a day, forward mode, sequentially: nevada, florida,
//              new_jersey, missouri, pennsylvania, tennessee (texas is reference_only: never fetched). Each adapter
//              is its own ingest run with scheduled provenance.
// Routes (Bearer BOXING_INTERNAL_TOKEN):
//   POST /internal/v1/commissions/:adapter/run?mode=forward|backfill&year=2026  operator run (manual provenance)
//   GET  /internal/v1/commissions/coverage
//
// Gates: COMMISSION_INGEST_ENABLED="true", boxing write-target allow-list,
// adapter remote gate (rights/robots), source row approved with a review.

import { guardedPostgrestStore } from '../../../shared/store/target-guard.mjs';
import { COMMISSION_ADAPTERS, runCommissionIngest } from '../../../shared/commissions/run.mjs';
import { manualProvenance, scheduledProvenance } from '../../../shared/provenance.mjs';

export const SCHEDULED_ADAPTERS = Object.freeze(['nevada', 'florida', 'new_jersey', 'missouri', 'pennsylvania', 'tennessee']);

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
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

export function createWorker({ makeStore = (env) => guardedPostgrestStore(env), fetchImpl } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === '/health') return json({ ok: true, service: 'boxing-commissions' });
      if (!url.pathname.startsWith('/internal/')) return json({ error: 'not_found' }, 404);
      if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
      let store;
      try { store = makeStore(env); } catch (err) { return json({ error: err?.code === 'write_target_refused' ? 'write_target_refused' : 'store_not_configured' }, 503); }
      try {
        if (url.pathname === '/internal/v1/commissions/coverage' && request.method === 'GET') return json(await store.commissionCoverage());
        const m = url.pathname.match(/^\/internal\/v1\/commissions\/([a-z_]+)\/run$/);
        if (m && request.method === 'POST') {
          if (!COMMISSION_ADAPTERS[m[1]]) return json({ error: 'unknown_adapter' }, 404);
          const mode = url.searchParams.get('mode') === 'backfill' ? 'backfill' : 'forward';
          const year = Number(url.searchParams.get('year'));
          const out = await runCommissionIngest(store, env, { adapterKey: m[1], fetchImpl: fetchImpl ?? fetch, mode, years: Number.isInteger(year) && year > 2000 ? [year] : null,
            provenance: { ...manualProvenance({ workerName: env.BOXING_WORKER_NAME ?? 'boxing-commissions', runtime: 'cloudflare-workers', trigger: mode === 'backfill' ? 'backfill' : 'manual' }),
              worker_version: env.CF_VERSION_METADATA?.id ?? null } });
          return json(out, ['disabled', 'blocked'].includes(out.status) ? 409 : 200);
        }
        return json({ error: 'not_found' }, 404);
      } catch (err) {
        return json({ error: 'internal_error', detail: String(err?.message ?? err).slice(0, 200) }, 500);
      }
    },
    async scheduled(controller, env, ctx) {
      let store;
      try { store = makeStore(env); } catch (err) { console.log(`boxing-commissions: skipped (${err?.code ?? 'store_not_configured'})`); return; }
      const base = scheduledProvenance(controller, env, { workerName: 'boxing-commissions' });
      ctx.waitUntil((async () => {
        for (const adapterKey of SCHEDULED_ADAPTERS) {
          const r = await runCommissionIngest(store, env, { adapterKey, fetchImpl: fetchImpl ?? fetch, mode: 'forward', provenance: base })
            .catch((err) => ({ status: 'error', error: String(err?.message ?? err).slice(0, 200) }));
          console.log(JSON.stringify({ adapter: adapterKey, status: r.status, run: r.runId ?? null, changed: r.metrics?.documents_changed ?? null }));
        }
      })());
    },
  };
}

export default createWorker();
