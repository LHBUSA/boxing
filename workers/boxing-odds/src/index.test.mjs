import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from './index.mjs';
import { runCapture } from '../../../shared/odds/capture.mjs';

const TOKEN = 't'.repeat(40);
const KEY = 'k'.repeat(32);

function fakeStore({ source = { enabled: true, access_mode: 'approved_ingest', persistence_allowed: true } } = {}) {
  const runs = [];
  return {
    runs,
    source: async () => source,
    startRun: async () => 'run-1',
    finishRun: async (id, r) => { runs.push(r); },
    selectionPrices: async () => [{ selection_key: 'fighter_a', freshness: 'stale', current_american: null }],
    consensus: async () => [],
  };
}

const neverFetch = async () => { throw new Error('network must not be touched'); };

test('capture is disabled by default and touches nothing', async () => {
  const store = fakeStore();
  const r = await runCapture(store, { ODDS_API_KEY: KEY }, { fetchImpl: neverFetch });
  assert.equal(r.status, 'disabled');
  assert.equal(store.runs.length, 0);
});

test('capture is blocked (and recorded) while the provider source is unapproved', async () => {
  const store = fakeStore({ source: { enabled: false, access_mode: 'review_required', persistence_allowed: false } });
  const r = await runCapture(store, { ODDS_CAPTURE_ENABLED: 'true', ODDS_API_KEY: KEY }, { fetchImpl: neverFetch });
  assert.equal(r.status, 'blocked');
  assert.match(r.assertions.source_policy, /not approved/);
  assert.equal(store.runs[0].status, 'blocked');
});

test('capture is blocked without a key, over the cost cap, or when preflight fails', async () => {
  const on = { ODDS_CAPTURE_ENABLED: 'true' };
  assert.equal((await runCapture(fakeStore(), on, { fetchImpl: neverFetch })).assertions.credential, 'ODDS_API_KEY not configured');
  const costly = await runCapture(fakeStore(), { ...on, ODDS_API_KEY: KEY, ODDS_REGIONS: 'us,uk,eu', ODDS_MARKETS: 'h2h,totals' }, { fetchImpl: neverFetch });
  assert.match(costly.assertions.cost, /exceeds/);
  const lowQuota = async () => new Response(JSON.stringify([{ key: 'boxing_boxing', active: true }]), { status: 200, headers: { 'x-requests-remaining': '10', 'x-requests-used': '99990' } });
  const r = await runCapture(fakeStore(), { ...on, ODDS_API_KEY: KEY }, { fetchImpl: lowQuota });
  assert.equal(r.assertions.preflight, 'quota_below_floor');
  const inactive = async () => new Response(JSON.stringify([{ key: 'boxing_boxing', active: false }]), { status: 200 });
  assert.equal((await runCapture(fakeStore(), { ...on, ODDS_API_KEY: KEY }, { fetchImpl: inactive })).assertions.preflight, 'sport_inactive');
});

test('provider errors never leak the api key', async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    if (calls === 1) return new Response(JSON.stringify([{ key: 'boxing_boxing', active: true }]), { status: 200, headers: { 'x-requests-remaining': '90000' } });
    throw new Error(`connect failed for ${url}`);
  };
  const store = fakeStore();
  const r = await runCapture(store, { ODDS_CAPTURE_ENABLED: 'true', ODDS_API_KEY: KEY }, { fetchImpl });
  assert.equal(r.status, 'failed');
  assert.ok(!JSON.stringify(r).includes(KEY));
  assert.ok(!JSON.stringify(store.runs).includes(KEY));
});

test('internal routes require the token; prices are served from storage with freshness', async () => {
  const worker = createWorker({ makeStore: () => fakeStore(), fetchImpl: neverFetch });
  const env = { BOXING_INTERNAL_TOKEN: TOKEN };
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal((await worker.fetch(new Request(`https://odds.internal/internal/v1/odds/bouts/${id}/prices`), env)).status, 401);
  const ok = await worker.fetch(new Request(`https://odds.internal/internal/v1/odds/bouts/${id}/prices`, { headers: { authorization: `Bearer ${TOKEN}` } }), env);
  const body = await ok.json();
  assert.equal(body.rows[0].freshness, 'stale');
  assert.equal(body.rows[0].current_american, null);
  const cap = await worker.fetch(new Request('https://odds.internal/internal/v1/odds/capture', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } }), env);
  assert.equal(cap.status, 409, 'capture route obeys the same disabled gate');
});
