import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from './index.mjs';
import { parseBindings } from '../../../shared/adapters/identity/wikidata.mjs';
import { runSeed } from '../../../shared/identity/seed.mjs';
import { identityAdapters } from '../../../shared/adapters/identity/registry.mjs';

const TOKEN = 'x'.repeat(40);
const env = { BOXING_INTERNAL_TOKEN: TOKEN, IDENTITY_SEED_ENABLED: 'false' };

function fakeStore(overrides = {}) {
  const calls = [];
  return {
    calls,
    getFighter: async (ref) => (ref === 'missing' ? null : { fighter: { id: 'f1', display_name: 'Test' }, identities: [{ namespace: 'a' }], aliases: [] }),
    listUnresolved: async () => [{ id: 'q1' }],
    coverage: async () => [{ source_key: 'wikidata' }],
    candidates: async () => ({ mapped: null, candidates: [] }),
    source: async () => ({ enabled: true, access_mode: 'approved_ingest', persistence_allowed: true }),
    startRun: async (a) => { calls.push(['startRun', a]); return 'run-1'; },
    finishRun: async (id, a) => { calls.push(['finishRun', a]); },
    ...overrides,
  };
}

const req = (path, { method = 'GET', token = TOKEN, body } = {}) => new Request(`https://identity.internal${path}`, {
  method,
  headers: token ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' } : {},
  body: body ? JSON.stringify(body) : undefined,
});

test('internal routes require the bearer token and fail closed when it is unset', async () => {
  const handle = createHandler({ makeStore: () => fakeStore() });
  assert.equal((await handle(req('/internal/v1/identity/coverage', { token: null }), env)).status, 401);
  assert.equal((await handle(req('/internal/v1/identity/coverage', { token: 'wrong' }), env)).status, 401);
  assert.equal((await handle(req('/internal/v1/identity/coverage'), { ...env, BOXING_INTERNAL_TOKEN: '' })).status, 401);
  assert.equal((await handle(req('/internal/v1/identity/coverage'), env)).status, 200);
});

test('fighter, identities, aliases and unresolved lookups', async () => {
  const handle = createHandler({ makeStore: () => fakeStore() });
  assert.equal((await (await handle(req('/internal/v1/fighters/pbe_boxer_abc'), env)).json()).fighter.id, 'f1');
  assert.deepEqual(await (await handle(req('/internal/v1/fighters/pbe_boxer_abc/identities'), env)).json(), { fighter_id: 'f1', identities: [{ namespace: 'a' }] });
  assert.equal((await handle(req('/internal/v1/fighters/missing'), env)).status, 404);
  assert.deepEqual(await (await handle(req('/internal/v1/identity/unresolved?limit=5'), env)).json(), [{ id: 'q1' }]);
});

test('resolve without persist never writes', async () => {
  let applied = false;
  const handle = createHandler({ makeStore: () => fakeStore({ applyDecision: async () => { applied = true; } }) });
  const res = await handle(req('/internal/v1/identity/resolve', { method: 'POST', body: { source_key: 's', namespace: 'n', record: { display_name: 'Nobody Known' } } }), env);
  const body = await res.json();
  assert.equal(body.persisted, false);
  assert.equal(body.decision.outcome, 'unresolved');
  assert.equal(applied, false);
});

test('seeding is refused unless IDENTITY_SEED_ENABLED is "true"', async () => {
  let fetched = false;
  const handle = createHandler({ makeStore: () => fakeStore(), fetchImpl: async () => { fetched = true; } });
  const res = await handle(req('/internal/v1/identity/seed', { method: 'POST', body: { adapter: 'wikidata' } }), env);
  assert.equal(res.status, 403);
  assert.equal(fetched, false);
});

test('seed run is blocked (and records a blocked run) for unapproved sources and disabled adapters', async () => {
  let fetched = false;
  const fetchImpl = async () => { fetched = true; };
  const unapproved = fakeStore({ source: async () => ({ enabled: false, access_mode: 'review_required', persistence_allowed: false }) });
  const r1 = await runSeed(unapproved, identityAdapters.wikidata, { fetchImpl });
  assert.equal(r1.status, 'blocked');
  const r2 = await runSeed(fakeStore(), identityAdapters.boxrec, { fetchImpl });
  assert.equal(r2.status, 'blocked');
  assert.match(r2.reason, /review_required/);
  assert.equal(fetched, false, 'no network call for a blocked source');
  assert.ok(unapproved.calls.some(([k, a]) => k === 'finishRun' && a.status === 'blocked'));
});

test('wikidata parser: synthetic bindings -> records; conflicting DOBs and bad rows are held back', () => {
  // SYNTHETIC response in WDQS shape. The QIDs and people are invented.
  const json = {
    head: { vars: ['item', 'label', 'dob', 'dobPrecision', 'sex', 'boxrec', 'isos', 'aliases', 'nativeNames'] },
    results: {
      bindings: [
        { item: { value: 'http://www.wikidata.org/entity/Q900000001' }, label: { value: 'Test Boxer One' },
          dob: { value: '1995-03-04T00:00:00Z' }, dobPrecision: { value: '11' }, sex: { value: 'http://www.wikidata.org/entity/Q6581097' },
          boxrec: { value: '999001' }, isos: { value: 'GB|IE' }, aliases: { value: 'T. B. One|The Test' }, nativeNames: { value: '' } },
        { item: { value: 'http://www.wikidata.org/entity/Q900000002' }, label: { value: 'Test Boxer Two' },
          dob: { value: '1990-01-01T00:00:00Z' }, dobPrecision: { value: '9' }, isos: { value: 'UA' }, nativeNames: { value: 'Тест Боксер' } },
        { item: { value: 'http://www.wikidata.org/entity/Q900000003' }, label: { value: 'Test Boxer Three' },
          dob: { value: '1992-05-05T00:00:00Z' }, dobPrecision: { value: '11' } },
        { item: { value: 'http://www.wikidata.org/entity/Q900000003' }, label: { value: 'Test Boxer Three' },
          dob: { value: '1993-05-05T00:00:00Z' }, dobPrecision: { value: '11' } },
        { item: { value: 'http://www.wikidata.org/entity/Q900000004' } },
      ],
    },
  };
  const { records, rejected } = parseBindings(json);
  assert.equal(records.length, 2);
  const one = records[0];
  assert.deepEqual(one.record.nationality, ['GB', 'IE']);
  assert.equal(one.record.dob, '1995-03-04');
  assert.equal(one.record.sex, 'male');
  assert.equal(one.payload.boxrec_id_claimed_by_wikidata, '999001');
  assert.equal(records[1].record.dob, null, 'year-precision DOB is not promoted to a full date');
  assert.deepEqual(records[1].record.names, [{ text: 'Тест Боксер', kind: 'name' }]);
  assert.deepEqual(rejected.map((r) => r.reason).sort(), ['conflicting_dob_statements', 'no_english_label']);
});
