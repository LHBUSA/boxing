// boxing-gateway — read-only internal API over Boxing Core.
// Top-level environment: NOT DEPLOYED. [env.staging] -> boxing-gateway-staging,
// read by the Boxing frontend's server (never the browser) with a bearer token.
// No writes, no collection, no cron. The store is built only for a verified
// boxing Supabase target (shared/store/target-guard.mjs allow-list: staging).
// Routes and guarantees: workers/boxing-gateway/src/routes.mjs and
// contracts/boxing-gateway.v1.json.

import { guardedPostgrestStore } from '../../../shared/store/target-guard.mjs';
import { API_VERSION, BadRequest, READ_METHODS, contractDocument, matchRoute } from './routes.mjs';

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
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

// Only the read methods are reachable from a route handler.
export function readOnlyStore(store) {
  const view = {};
  for (const m of READ_METHODS) {
    if (typeof store[m] === 'function') view[m] = (...args) => store[m](...args);
  }
  return Object.freeze(view);
}

export function createWorker({ makeStore = (env) => guardedPostgrestStore(env) } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === '/health') return json({ ok: true, service: 'boxing-gateway', api_version: API_VERSION });
      if (!url.pathname.startsWith('/internal/')) return json({ error: 'not_found' }, 404);
      if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
      if (request.method !== 'GET') return json({ error: 'method_not_allowed', detail: 'boxing-gateway is read-only' }, 405, { allow: 'GET' });
      if (url.pathname === '/internal/v1/contract') return json(contractDocument());
      const hit = matchRoute(url.pathname);
      if (!hit) return json({ error: 'not_found' }, 404);
      let store;
      try { store = readOnlyStore(makeStore(env)); } catch { return json({ error: 'store_not_configured' }, 503); }
      try {
        const data = await hit.route.handler(store, hit.params, url.searchParams);
        if (data == null) return json({ error: 'not_found' }, 404);
        return json({ api_version: API_VERSION, generated_at: new Date().toISOString(), data });
      } catch (err) {
        if (err instanceof BadRequest) return json({ error: 'bad_request', detail: err.message }, 400);
        return json({ error: 'internal_error', code: err?.code ?? null }, 500);
      }
    },
  };
}

export default createWorker();
