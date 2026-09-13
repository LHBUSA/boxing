import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from './index.mjs';
import { rankingAdapters } from '../../../shared/adapters/rankings/registry.mjs';

const TOKEN = 'r'.repeat(40);
const env = { BOXING_INTERNAL_TOKEN: TOKEN };
const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };

test('all sanctioning-body adapters are disabled and never fetch', async () => {
  for (const a of Object.values(rankingAdapters)) {
    assert.match(a.disabled, /review_required/);
    await assert.rejects(() => a.fetchDocuments(), /adapter_disabled/);
  }
});

test('scheduled autopilot is off by default and records blocked runs when switched on', async () => {
  const runs = [];
  const store = { startRun: async (r) => { runs.push(['start', r.sourceKey]); return 'run'; }, finishRun: async (id, r) => runs.push(['finish', r.status]) };
  const worker = createWorker({ makeStore: () => store });
  await worker.scheduled({}, { ...env });
  assert.equal(runs.length, 0);
  await worker.scheduled({}, { ...env, RANKINGS_AUTOPILOT_ENABLED: 'true' });
  assert.equal(runs.filter(([k, s]) => k === 'finish' && s === 'blocked').length, 4);
});

test('title map route validates input and returns the derived map', async () => {
  const facts = { weight_class_key: 'welterweight', gender_scope: 'male', as_of: '2026-09-01', titles: [], rankings: [], recent_title_events: [] };
  const worker = createWorker({ makeStore: () => ({ titleMapFacts: async () => facts }) });
  assert.equal((await worker.fetch(new Request('https://r.internal/internal/v1/title-map?weight_class=welterweight'), env)).status, 401);
  assert.equal((await worker.fetch(new Request('https://r.internal/internal/v1/title-map?weight_class=welterweight&as_of=bad', { headers: auth }), env)).status, 400);
  const res = await worker.fetch(new Request('https://r.internal/internal/v1/title-map?weight_class=welterweight&as_of=2026-09-01', { headers: auth }), env);
  const body = await res.json();
  assert.equal(body.derived.version, 'pbe_undisputed@1');
});

test('invalid ranking documents are rejected before touching storage', async () => {
  let touched = false;
  const worker = createWorker({ makeStore: () => new Proxy({}, { get: () => async () => { touched = true; } }) });
  const res = await worker.fetch(new Request('https://r.internal/internal/v1/rankings/documents', { method: 'POST', headers: auth, body: JSON.stringify({ organization_slug: 'wbc' }) }), env);
  assert.equal(res.status, 422);
  assert.equal(touched, false);
});
