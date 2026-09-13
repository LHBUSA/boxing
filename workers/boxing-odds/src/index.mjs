// boxing-odds — scheduled boxing market capture + derived price reads.
//
// scheduled(): runCapture() — fails closed unless ODDS_CAPTURE_ENABLED="true",
//              the the_odds_api source row is approved, the key is set and the
//              unmetered preflight passes.
// Internal routes (Bearer BOXING_INTERNAL_TOKEN):
//   GET  /internal/v1/odds/bouts/:boutId/prices     per-book derived prices + freshness
//   GET  /internal/v1/odds/bouts/:boutId/consensus  cross-book consensus / dispersion
//   POST /internal/v1/odds/capture                   operator-triggered capture (same gates)
//
// There is deliberately no user-facing refresh: prices are served from what the
// schedule captured, labelled with their age.

import { postgrestStore } from '../../../shared/store/postgrest.mjs';
import { runCapture } from '../../../shared/odds/capture.mjs';

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function createWorker({ makeStore = (env) => postgrestStore({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY }), fetchImpl } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === '/health') return json({ ok: true, service: 'boxing-odds' });
      if (!url.pathname.startsWith('/internal/')) return json({ error: 'not_found' }, 404);
      if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
      let store;
      try { store = makeStore(env); } catch { return json({ error: 'store_not_configured' }, 503); }
      try {
        const m = url.pathname.match(/^\/internal\/v1\/odds\/bouts\/([^/]+)\/(prices|consensus)$/);
        if (m && request.method === 'GET') {
          if (!UUID.test(m[1])) return json({ error: 'bad_bout_id' }, 400);
          const rows = m[2] === 'prices' ? await store.selectionPrices(m[1]) : await store.consensus(m[1]);
          return json({ bout_id: m[1], generated_at: new Date().toISOString(), rows });
        }
        if (url.pathname === '/internal/v1/odds/capture' && request.method === 'POST') {
          const out = await runCapture(store, env, { fetchImpl: fetchImpl ?? fetch });
          return json(out, ['disabled', 'blocked'].includes(out.status) ? 409 : 200);
        }
        return json({ error: 'not_found' }, 404);
      } catch (err) {
        return json({ error: 'internal_error', detail: String(err?.message ?? err).slice(0, 300) }, 500);
      }
    },
    async scheduled(controller, env, ctx) {
      let store;
      try { store = makeStore(env); } catch { console.log('boxing-odds: store not configured; capture skipped'); return; }
      ctx.waitUntil(runCapture(store, env, { fetchImpl: fetchImpl ?? fetch }).then((r) => console.log(JSON.stringify({ capture: r.status, run: r.runId ?? null }))));
    },
  };
}

export default createWorker();
