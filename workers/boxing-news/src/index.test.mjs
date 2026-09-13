import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker, runNewsroom } from './index.mjs';

const TOKEN = 'n'.repeat(40);
const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };

test('newsroom is disabled by default; autopublish is a second, separate switch', async () => {
  const calls = [];
  const store = {
    pendingNewsEvents: async () => [],
    publishArticle: async (id) => { calls.push(id); return { article_id: id }; },
  };
  assert.equal((await runNewsroom(store, {})).status, 'disabled');
  const on = await runNewsroom(store, { NEWSROOM_ENABLED: 'true' });
  assert.equal(on.status, 'ok');
  assert.deepEqual(on.published, []);
  assert.equal(calls.length, 0);
});

test('review requires decision and actor; wire needs auth', async () => {
  const w = createWorker({ makeStore: () => ({ wire: async () => [{ id: 'a' }], reviewArticle: async () => ({ ok: true }) }) });
  const env = { BOXING_INTERNAL_TOKEN: TOKEN };
  assert.equal((await w.fetch(new Request('https://n.internal/internal/v1/wire'), env)).status, 401);
  assert.equal((await w.fetch(new Request('https://n.internal/internal/v1/wire', { headers: auth }), env)).status, 200);
  const id = '11111111-1111-4111-8111-111111111111';
  const bad = await w.fetch(new Request(`https://n.internal/internal/v1/articles/${id}/review`, { method: 'POST', headers: auth, body: JSON.stringify({ decision: 'approved' }) }), env);
  assert.equal(bad.status, 400);
});
