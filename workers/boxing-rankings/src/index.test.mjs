import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from './index.mjs';
import { rankingAdapters } from '../../../shared/adapters/rankings/registry.mjs';

const TOKEN = 'r'.repeat(40);
const env = { BOXING_INTERNAL_TOKEN: TOKEN };
const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };

test('WBC has no collector (not licensed); WBA, IBF and WBO are approved collectors', async () => {
  assert.equal(rankingAdapters.wbc.state, 'approved_no_collector');
  await assert.rejects(() => rankingAdapters.wbc.fetchDocuments(), /adapter_disabled/);
  assert.deepEqual(['wba', 'ibf', 'wbo'].map((b) => rankingAdapters[b].state), ['approved', 'approved', 'approved']);
});

test('scheduled collection is off by default; when on it collects WBA, WBO, IBF and records WBC as blocked', async () => {
  const runs = [];
  const collected = [];
  const store = { startRun: async (r) => { runs.push(['start', r.sourceKey]); return 'run'; }, finishRun: async (id, r) => runs.push(['finish', r.status]) };
  const collect = async (s, e, o) => { collected.push([o.body, o.mode, o.provenance?.trigger_type]); return { status: 'ok' }; };
  const worker = createWorker({ makeStore: () => store, collect });
  await worker.scheduled({ scheduledTime: Date.parse('2026-09-20T14:25:00Z'), cron: '25 14 20 * *' }, { ...env });
  assert.deepEqual([runs.length, collected.length], [0, 0]);
  await worker.scheduled({ scheduledTime: Date.parse('2026-09-20T14:25:00Z'), cron: '25 14 20 * *' }, { ...env, TITLES_INGEST_ENABLED: 'true' });
  assert.deepEqual(collected, [['wba', 'current', 'scheduled'], ['wbo', 'current', 'scheduled'], ['ibf', 'current', 'scheduled']]);
  assert.deepEqual(runs, [['start', 'wbc_official'], ['finish', 'blocked']]);
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
