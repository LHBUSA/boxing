// boxing-news — fact-driven Boxing Wire (internal). NOT DEPLOYED.
//
// scheduled(): NEWSROOM_ENABLED="true" -> process pending structured news
//              events into fact blocks + validated articles. Publishing
//              approved articles automatically additionally requires
//              NEWS_AUTOPUBLISH_ENABLED="true" (default false).
// Routes (Bearer BOXING_INTERNAL_TOKEN):
//   POST /internal/v1/news/process              process pending events now
//   POST /internal/v1/articles/:id/review       { decision: approved|rejected, actor, note }
//   POST /internal/v1/articles/:id/publish      only succeeds for approved + validated articles
//   GET  /internal/v1/wire?limit=               published articles (no fact blocks exposed)

import { postgrestStore } from '../../../shared/store/postgrest.mjs';
import { processPending } from '../../../shared/news/pipeline.mjs';

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

export async function runNewsroom(store, env, { limit = 25 } = {}) {
  if (env.NEWSROOM_ENABLED !== 'true') return { status: 'disabled' };
  const processed = await processPending(store, { limit });
  const published = [];
  if (env.NEWS_AUTOPUBLISH_ENABLED === 'true') {
    for (const r of processed) {
      if (r.status === 'created' && r.state === 'approved') published.push((await store.publishArticle(r.article_id)).article_id);
    }
  }
  return {
    status: 'ok',
    processed: processed.map(({ block, ...rest }) => ({ ...rest, validation: rest.validation ? { ok: rest.validation.ok, problems: rest.validation.problems } : null })),
    published,
  };
}

export function createWorker({ makeStore = (env) => postgrestStore({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY }) } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === '/health') return json({ ok: true, service: 'boxing-news' });
      if (!url.pathname.startsWith('/internal/')) return json({ error: 'not_found' }, 404);
      if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
      let store;
      try { store = makeStore(env); } catch { return json({ error: 'store_not_configured' }, 503); }
      try {
        if (url.pathname === '/internal/v1/wire' && request.method === 'GET') {
          return json(await store.wire(Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200)));
        }
        if (url.pathname === '/internal/v1/news/process' && request.method === 'POST') {
          const out = await runNewsroom(store, env);
          return json(out, out.status === 'disabled' ? 409 : 200);
        }
        const m = url.pathname.match(/^\/internal\/v1\/articles\/([^/]+)\/(review|publish)$/);
        if (m && request.method === 'POST') {
          if (!UUID.test(m[1])) return json({ error: 'bad_article_id' }, 400);
          if (m[2] === 'publish') return json(await store.publishArticle(m[1]));
          const body = await request.json().catch(() => null);
          if (!body?.decision || !body?.actor) return json({ error: 'bad_request', detail: 'decision and actor are required' }, 400);
          return json(await store.reviewArticle(m[1], body.decision, body.actor, body.note ?? null));
        }
        return json({ error: 'not_found' }, 404);
      } catch (err) {
        return json({ error: 'internal_error', code: err?.code ?? null, detail: String(err?.message ?? err).slice(0, 300) }, err?.code?.startsWith?.('BX') ? 422 : 500);
      }
    },
    async scheduled(controller, env, ctx) {
      let store;
      try { store = makeStore(env); } catch { return; }
      ctx.waitUntil(runNewsroom(store, env).then((r) => console.log(JSON.stringify({ newsroom: r.status, processed: r.processed?.length ?? 0, published: r.published?.length ?? 0 }))));
    },
  };
}

export default createWorker();
