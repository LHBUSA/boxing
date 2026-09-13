// boxing-identity — canonical boxer identity service (internal only).
//
// Routes (all require Authorization: Bearer <BOXING_INTERNAL_TOKEN>):
//   POST /internal/v1/identity/resolve     { source_key, namespace, record, scope?, persist? }
//   GET  /internal/v1/fighters/:ref        uuid | pbe_boxer_* | namespace:external_id
//   GET  /internal/v1/fighters/:ref/identities
//   GET  /internal/v1/fighters/:ref/aliases
//   GET  /internal/v1/identity/unresolved?limit=&source_key=
//   GET  /internal/v1/identity/coverage
//   POST /internal/v1/identity/seed        { adapter, limit?, max_pages? }   (IDENTITY_SEED_ENABLED must be "true")
//
// No public routes, no cron. Collection is off unless IDENTITY_SEED_ENABLED
// is "true" AND the source row is approved (checked again at run time).

import { postgrestStore } from '../../../shared/store/postgrest.mjs';
import { ingestIdentity, resolveOnly } from '../../../shared/identity/pipeline.mjs';
import { runSeed } from '../../../shared/identity/seed.mjs';
import { identityAdapters } from '../../../shared/adapters/identity/registry.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function constantTimeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function authorized(request, env) {
  const token = env.BOXING_INTERNAL_TOKEN;
  if (!token || token.length < 32) return false; // fail closed when unconfigured
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') && constantTimeEqual(header.slice(7), token);
}

export function createHandler({ makeStore = (env) => postgrestStore({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY }), adapters = identityAdapters, fetchImpl } = {}) {
  return async function handle(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'boxing-identity' });
    if (!url.pathname.startsWith('/internal/')) return json({ error: 'not_found' }, 404);
    if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

    let store;
    try {
      store = makeStore(env);
    } catch (err) {
      return json({ error: 'store_not_configured' }, 503);
    }

    try {
      const m = url.pathname.match(/^\/internal\/v1\/fighters\/([^/]+)(?:\/(identities|aliases))?$/);
      if (m && request.method === 'GET') {
        const fighter = await store.getFighter(decodeURIComponent(m[1]));
        if (!fighter) return json({ error: 'fighter_not_found' }, 404);
        if (m[2]) return json({ fighter_id: fighter.fighter.id, [m[2]]: fighter[m[2]] });
        return json(fighter);
      }

      if (url.pathname === '/internal/v1/identity/unresolved' && request.method === 'GET') {
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 100) || 100, 1000);
        return json(await store.listUnresolved({ limit, sourceKey: url.searchParams.get('source_key') }));
      }

      if (url.pathname === '/internal/v1/identity/coverage' && request.method === 'GET') {
        return json(await store.coverage());
      }

      if (url.pathname === '/internal/v1/identity/resolve' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body?.source_key || !body?.namespace || !body?.record) {
          return json({ error: 'bad_request', detail: 'source_key, namespace and record are required' }, 400);
        }
        if (body.persist) {
          const src = await store.source(body.source_key);
          if (!src) return json({ error: 'source_not_registered' }, 422);
          const out = await ingestIdentity(store, {
            sourceKey: body.source_key, accessMode: src.access_mode, namespace: body.namespace,
            record: body.record, payload: body.payload ?? body.record, sourceUrl: body.source_url ?? null,
          });
          return json({ decision: out.decision, result: out.result });
        }
        const { decision } = await resolveOnly(store, body.record, { namespace: body.namespace, scope: body.scope ?? null, allowCreate: false });
        return json({ decision, persisted: false });
      }

      if (url.pathname === '/internal/v1/identity/seed' && request.method === 'POST') {
        if (env.IDENTITY_SEED_ENABLED !== 'true') return json({ error: 'seed_disabled', detail: 'IDENTITY_SEED_ENABLED is not "true"' }, 403);
        const body = await request.json().catch(() => ({}));
        const adapter = adapters[body?.adapter];
        if (!adapter) return json({ error: 'unknown_adapter' }, 400);
        const out = await runSeed(store, adapter, {
          fetchImpl: fetchImpl ?? fetch,
          limit: Math.min(Number(body.limit ?? 200) || 200, 500),
          maxPages: Math.min(Number(body.max_pages ?? 1) || 1, 20),
        });
        return json(out, out.status === 'blocked' ? 409 : 200);
      }

      return json({ error: 'not_found' }, 404);
    } catch (err) {
      // store errors carry status/code only; never echo request headers
      return json({ error: 'internal_error', detail: String(err?.message ?? err).slice(0, 300) }, 500);
    }
  };
}

const handle = createHandler();
export default { fetch: (request, env) => handle(request, env) };
