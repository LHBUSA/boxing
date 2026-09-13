import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorker, readOnlyStore } from './index.mjs';
import { READ_METHODS, ROUTES, contractDocument } from './routes.mjs';

const TOKEN = 'g'.repeat(40);
const env = { BOXING_INTERNAL_TOKEN: TOKEN };
const auth = { authorization: `Bearer ${TOKEN}` };
const ID = '11111111-2222-4333-8444-555555555555';
const req = (path, init = {}) => new Request(`https://g.internal${path}`, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });

// A store where every write method would record a call.
function fakeStore() {
  const calls = [];
  const reads = {
    getFighter: async (ref) => ({ fighter: { id: ID, public_id: 'pbe_boxer_x' }, requested: ref }),
    fighterDnaLatest: async () => [{ metric_key: 'results.win_rate', status: 'available', value_number: 0.6, sample_size: 10 }],
    cardState: async (id) => ({ event_id: id, bouts: [] }),
    gatewayBout: async (id) => ({ bout_id: id }),
    gatewayMatchup: async (id, limit) => ({ bout: { bout_id: id }, snapshots: [], model_outputs: [], limit }),
    gatewayOddsSummary: async (id) => ({ bout_id: id, consensus: [], selections: [], fair_prices: [] }),
    gatewayModels: async () => [{ model_key: 'pbe_bout_winner', status: 'untrained' }],
    titleSummary: async (id) => ({ id }),
    titleReigns: async () => [],
    titleMapFacts: async (wc, g, d) => ({ weight_class_key: wc, gender_scope: g, as_of: d, titles: [], rankings: [], recent_title_events: [] }),
    rankingSnapshotAsOf: async () => null,
    gatewayOfficial: async (id) => ({ official: { id } }),
    officialDnaLatest: async () => [{ metric_key: 'judge.bouts_scored', category: 'judge' }, { metric_key: 'referee.bouts_refereed', category: 'referee' }],
  };
  const writes = Object.fromEntries(['recordResult', 'writeMetricSnapshots', 'ingestMarketSnapshot', 'applyDecision', 'publishArticle']
    .map((m) => [m, async () => { calls.push(m); }]));
  return { store: { ...reads, ...writes }, calls };
}

test('contract file is generated from the route table and is current', () => {
  const onDisk = JSON.parse(readFileSync(new URL('../../../contracts/boxing-gateway.v1.json', import.meta.url), 'utf8'));
  assert.deepEqual(onDisk, contractDocument(), 'run: node scripts/gen-gateway-contract.mjs');
  const required = ['/internal/v1/fighters/:ref', '/internal/v1/fighters/:ref/dna', '/internal/v1/events/:id', '/internal/v1/bouts/:id',
    '/internal/v1/bouts/:id/matchup', '/internal/v1/bouts/:id/odds-summary', '/internal/v1/titles/:id', '/internal/v1/title-map',
    '/internal/v1/rankings', '/internal/v1/officials/:id', '/internal/v1/officials/:id/dna', '/internal/v1/models'];
  assert.deepEqual(ROUTES.map((r) => r.path).sort(), required.sort());
  assert.ok(onDisk.routes.every((r) => r.method === 'GET'));
});

test('auth is required; non-GET is refused; unknown routes 404', async () => {
  const { store, calls } = fakeStore();
  const w = createWorker({ makeStore: () => store });
  assert.equal((await w.fetch(new Request(`https://g.internal/internal/v1/bouts/${ID}`), env)).status, 401);
  assert.equal((await w.fetch(req(`/internal/v1/bouts/${ID}`), { BOXING_INTERNAL_TOKEN: 'short' })).status, 401);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const res = await w.fetch(req(`/internal/v1/bouts/${ID}`, { method }), env);
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'GET');
  }
  assert.equal((await w.fetch(req('/internal/v1/nope'), env)).status, 404);
  assert.equal((await w.fetch(new Request('https://g.internal/health'), env)).status, 200);
  assert.deepEqual(calls, []);
});

test('route handlers can reach only read methods', async () => {
  const { store, calls } = fakeStore();
  const view = readOnlyStore(store);
  assert.deepEqual(Object.keys(view).sort(), [...READ_METHODS].sort());
  assert.equal(view.recordResult, undefined);
  assert.ok(Object.isFrozen(view));
  const w = createWorker({ makeStore: () => store });
  const paths = [`/internal/v1/fighters/${ID}`, '/internal/v1/fighters/pbe_boxer_abc/dna', '/internal/v1/fighters/boxrec:12345', `/internal/v1/events/${ID}`,
    `/internal/v1/bouts/${ID}`, `/internal/v1/bouts/${ID}/matchup?limit=3`, `/internal/v1/bouts/${ID}/odds-summary`, `/internal/v1/titles/${ID}`,
    '/internal/v1/title-map?weight_class=welterweight&as_of=2026-09-01', '/internal/v1/rankings?organization=wbc&weight_class=welterweight&as_of=2026-09-01',
    `/internal/v1/officials/${ID}`, `/internal/v1/officials/${ID}/dna`, '/internal/v1/models', '/internal/v1/contract'];
  for (const p of paths) {
    const res = await w.fetch(req(p), env);
    assert.equal(res.status, 200, p);
    const body = await res.json();
    if (p !== '/internal/v1/contract') {
      assert.equal(body.api_version, 'boxing-gateway@1');
      assert.ok(body.generated_at && body.data, p);
    }
  }
  assert.deepEqual(calls, [], 'no write method was ever called');
});

test('inputs are validated before the store is touched; missing records are 404', async () => {
  let touched = 0;
  const store = new Proxy({}, { get: () => async () => { touched++; return null; } });
  const w = createWorker({ makeStore: () => store });
  for (const p of ['/internal/v1/bouts/not-a-uuid', '/internal/v1/bouts/' + ID + '/matchup?limit=500', '/internal/v1/title-map',
    '/internal/v1/title-map?weight_class=welterweight&as_of=09-01-2026', '/internal/v1/rankings?organization=wbc',
    '/internal/v1/rankings?organization=wbc&weight_class=welterweight&gender=x', '/internal/v1/fighters/Canelo%20Alvarez']) {
    assert.equal((await w.fetch(req(p), env)).status, 400, p);
  }
  assert.equal(touched, 0, 'display names are never used to look up a fighter');
  assert.equal((await w.fetch(req(`/internal/v1/bouts/${ID}`), env)).status, 404);
});

test('official DNA splits judge and referee metrics and carries a neutral note', async () => {
  const { store } = fakeStore();
  const w = createWorker({ makeStore: () => store });
  const body = await (await w.fetch(req(`/internal/v1/officials/${ID}/dna`), env)).json();
  assert.equal(body.data.judge.length, 1);
  assert.equal(body.data.referee.length, 1);
  assert.doesNotMatch(JSON.stringify(body), /corrupt|biased|bad judge|robbery|rigged/i);
});

test('store errors do not leak details', async () => {
  const w = createWorker({ makeStore: () => ({ gatewayBout: async () => { throw Object.assign(new Error('postgrest failed: key=abc'), { code: 'PGRST' }); } }) });
  const res = await w.fetch(req(`/internal/v1/bouts/${ID}`), env);
  assert.equal(res.status, 500);
  assert.doesNotMatch(await res.text(), /key=abc/);
});
