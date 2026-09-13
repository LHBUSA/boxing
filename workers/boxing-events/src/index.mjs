// boxing-events — forward capture of cards and official outcomes (internal). NOT DEPLOYED.
//
// Routes (Bearer BOXING_INTERNAL_TOKEN):
//   POST /internal/v1/cards                 card document -> event/bouts/participants/titles/officials + card change log + news
//   POST /internal/v1/bouts/:id/weigh-ins   weigh-in (verified/reported/unverified) -> WEIGH_IN_RESULT / WEIGHT_MISSED
//   POST /internal/v1/bouts/:id/scorecards  cards (+ deductions) -> SCORECARD_POSTED
//   POST /internal/v1/bouts/:id/result      official result revision -> RESULT_OFFICIAL / RESULT_OVERTURNED
//   POST /internal/v1/regulatory-actions    public commission action -> SUSPENSION_POSTED
//   GET  /internal/v1/events/:id/card       current card state (all participants incl. replaced)
//
// Sources: every document names an approved source_key; the database refuses
// raw observations from sources that are not enabled/approved. No commission,
// promoter or broadcaster collection is enabled yet.

import { postgrestStore } from '../../../shared/store/postgrest.mjs';
import { applyCardDocument } from '../../../shared/events/card.mjs';
import { recordRegulatoryAction, recordResult, recordScorecards, recordWeighIn } from '../../../shared/events/outcomes.mjs';

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

export function createWorker({ makeStore = (env) => postgrestStore({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY }) } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname === '/health') return json({ ok: true, service: 'boxing-events' });
      if (!url.pathname.startsWith('/internal/')) return json({ error: 'not_found' }, 404);
      if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
      let store;
      try { store = makeStore(env); } catch { return json({ error: 'store_not_configured' }, 503); }
      try {
        const card = url.pathname.match(/^\/internal\/v1\/events\/([^/]+)\/card$/);
        if (card && request.method === 'GET') {
          if (!UUID.test(card[1])) return json({ error: 'bad_event_id' }, 400);
          return json(await store.cardState(card[1]));
        }
        if (request.method !== 'POST') return json({ error: 'not_found' }, 404);
        const body = await request.json().catch(() => null);
        if (!body) return json({ error: 'bad_request' }, 400);
        if (url.pathname === '/internal/v1/cards') {
          const out = await applyCardDocument(store, body);
          return json(out, out.status === 'rejected' ? 422 : 200);
        }
        if (url.pathname === '/internal/v1/regulatory-actions') return json(await recordRegulatoryAction(store, body));
        const m = url.pathname.match(/^\/internal\/v1\/bouts\/([^/]+)\/(weigh-ins|scorecards|result)$/);
        if (m) {
          if (!UUID.test(m[1])) return json({ error: 'bad_bout_id' }, 400);
          const input = { ...body, bout_id: m[1] };
          if (m[2] === 'weigh-ins') return json(await recordWeighIn(store, input));
          if (m[2] === 'scorecards') return json(await recordScorecards(store, input));
          return json(await recordResult(store, input));
        }
        return json({ error: 'not_found' }, 404);
      } catch (err) {
        return json({ error: 'internal_error', code: err?.code ?? null, detail: String(err?.message ?? err).slice(0, 300) }, err?.code?.startsWith?.('BX') ? 422 : 500);
      }
    },
  };
}

export default createWorker();
