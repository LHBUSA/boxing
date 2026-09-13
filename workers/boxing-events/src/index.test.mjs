import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from './index.mjs';

const TOKEN = 'e'.repeat(40);
const env = { BOXING_INTERNAL_TOKEN: TOKEN };
const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };
const untouchable = () => new Proxy({}, { get: () => async () => { throw new Error('store must not be called'); } });

test('auth is required and invalid card documents never reach storage', async () => {
  const w = createWorker({ makeStore: untouchable });
  assert.equal((await w.fetch(new Request('https://e.internal/internal/v1/cards', { method: 'POST', body: '{}' }), env)).status, 401);
  const res = await w.fetch(new Request('https://e.internal/internal/v1/cards', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'x', bouts: [] }) }), env);
  assert.equal(res.status, 422);
  assert.ok((await res.json()).problems.length > 0);
});

test('bout routes validate ids and database guard errors surface as 422', async () => {
  const w = createWorker({ makeStore: () => ({
    boutOutcomeState: async () => { throw Object.assign(new Error('participant_not_active'), { code: 'BX080' }); },
  }) });
  assert.equal((await w.fetch(new Request('https://e.internal/internal/v1/bouts/not-a-uuid/result', { method: 'POST', headers: auth, body: '{}' }), env)).status, 400);
  const res = await w.fetch(new Request('https://e.internal/internal/v1/bouts/11111111-1111-4111-8111-111111111111/result', { method: 'POST', headers: auth, body: '{"outcome":"win"}' }), env);
  assert.equal(res.status, 422);
  assert.equal((await res.json()).code, 'BX080');
});
