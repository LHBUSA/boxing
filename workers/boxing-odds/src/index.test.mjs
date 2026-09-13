import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorker } from './index.mjs';
import { runCapture } from '../../../shared/odds/capture.mjs';
import { assertBoxingWriteTarget, guardedPostgrestStore } from '../../../shared/store/target-guard.mjs';
import { decideCadence, parseRegionPlan, planCost, tierFor } from '../../../shared/odds/cadence.mjs';

const TOKEN = 't'.repeat(40);
const KEY = 'k'.repeat(32);
const APPROVED = { enabled: true, access_mode: 'approved_ingest', rights_state: 'approved', persistence_allowed: true, latest_rights_review_id: 'r-1' };
const STAGING = { SUPABASE_URL: 'https://wpaxofilvbsjyrxrwjhg.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's', BOXING_ENVIRONMENT: 'staging', BOXING_SUPABASE_REF: 'wpaxofilvbsjyrxrwjhg' };
const ON = { ODDS_CAPTURE_ENABLED: 'true', ODDS_API_KEY: KEY, ODDS_REGION_PLAN: 'us=h2h' };

function fakeStore({ source = APPROVED, state = { last_capture_at: null, credits_24h: 0, credits_30d: 0, next_commence_times: [] }, verified = true } = {}) {
  const runs = [];
  const captures = [];
  const writes = [];
  return {
    runs, captures, writes,
    writeTarget: { verified, kind: 'test' },
    source: async () => source,
    oddsScheduleState: async () => state,
    startRun: async () => 'run-1',
    finishRun: async (id, r) => { runs.push(r); },
    recordProviderCapture: async (p) => { captures.push(p); return { id: 'c' }; },
    recordObservation: async (p) => { writes.push(['observation', p]); return { id: 'obs-1', duplicate: false }; },
    ingestProviderQuotes: async (p) => { writes.push(['ledger', p]); return { events: p.events.length, events_new: p.events.length, participants_new: 0, series_new: 0, quotes_inserted: 1, quotes_unchanged: 0 }; },
    boutsInWindow: async () => [],
    boutsForProviderEvents: async () => ({}),
    candidates: async () => ({ candidates: [] }),
    recordMarketUnmatched: async (p) => { writes.push(['unmatched', p]); return { id: 'u' }; },
    selectionPrices: async () => [{ selection_key: 'fighter_a', freshness: 'stale', current_american: null }],
    consensus: async () => [],
  };
}

const neverFetch = async () => { throw new Error('network must not be touched'); };
const sportsOk = (remaining = '90000') => new Response(JSON.stringify([{ key: 'boxing_boxing', active: true }]), { status: 200, headers: { 'x-requests-remaining': remaining, 'x-requests-used': '10000', 'x-requests-last': '0' } });
const oddsBody = [{ id: 'evt-1', sport_key: 'boxing_boxing', commence_time: '2026-09-19T20:00:00Z', home_team: 'Unknown Name A', away_team: 'Unknown Name B',
  bookmakers: [{ key: 'book1', title: 'Book 1', last_update: '2026-09-13T10:00:00Z', markets: [{ key: 'h2h', last_update: '2026-09-13T10:00:00Z', outcomes: [{ name: 'Unknown Name A', price: -150 }, { name: 'Unknown Name B', price: 130 }] }] }] }];

test('capture is disabled by default and touches nothing', async () => {
  const store = fakeStore();
  const r = await runCapture(store, { ODDS_API_KEY: KEY }, { fetchImpl: neverFetch });
  assert.equal(r.status, 'disabled');
  assert.equal(store.runs.length, 0);
});

test('write target: only the boxing staging project is accepted', () => {
  assert.deepEqual(assertBoxingWriteTarget(STAGING), { ref: 'wpaxofilvbsjyrxrwjhg', projectName: 'propbetedge-boxing-staging', environment: 'staging' });
  const refuse = (env, re) => assert.throws(() => assertBoxingWriteTarget(env), re);
  refuse({ ...STAGING, SUPABASE_URL: 'https://tkmlnhmylqnttmnsnief.supabase.co', BOXING_SUPABASE_REF: 'tkmlnhmylqnttmnsnief' }, /NFL \+ UFC production/);
  refuse({ ...STAGING, SUPABASE_URL: 'https://rlfyavnhbngwbldebrid.supabase.co', BOXING_SUPABASE_REF: 'rlfyavnhbngwbldebrid' }, /MLB \+ PropTech production/);
  refuse({ ...STAGING, SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', BOXING_SUPABASE_REF: 'abcdefghijklmnopqrst' }, /not on the boxing write allow-list/);
  refuse({ ...STAGING, BOXING_ENVIRONMENT: 'production' }, /BOXING_ENVIRONMENT/);
  refuse({ ...STAGING, BOXING_SUPABASE_REF: undefined }, /BOXING_SUPABASE_REF/);
  refuse({ ...STAGING, SUPABASE_URL: 'http://wpaxofilvbsjyrxrwjhg.supabase.co' }, /https/);
  refuse({ ...STAGING, SUPABASE_URL: 'https://wpaxofilvbsjyrxrwjhg.supabase.co.evil.example' }, /https:\/\/<ref>/);
  refuse({}, /SUPABASE_URL/);
  assert.equal(guardedPostgrestStore(STAGING, { fetchImpl: neverFetch }).writeTarget.ref, 'wpaxofilvbsjyrxrwjhg');
});

test('a store without a verified write target never captures', async () => {
  const store = fakeStore({ verified: false });
  const r = await runCapture(store, ON, { fetchImpl: neverFetch });
  assert.equal(r.status, 'blocked');
  assert.match(r.assertions.write_target, /no verified/);
  assert.equal(store.runs.length, 0);
});

test('the worker refuses to build a store for a non-boxing Supabase target', async () => {
  const worker = createWorker({ fetchImpl: neverFetch });
  const env = { ...ON, ...STAGING, BOXING_INTERNAL_TOKEN: TOKEN, SUPABASE_URL: 'https://tkmlnhmylqnttmnsnief.supabase.co', BOXING_SUPABASE_REF: 'tkmlnhmylqnttmnsnief' };
  const res = await worker.fetch(new Request('https://odds.internal/internal/v1/odds/capture?force=true', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } }), env);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'write_target_refused');
  const logs = [];
  const orig = console.log;
  console.log = (m) => logs.push(m);
  try { await worker.scheduled({}, env, { waitUntil: () => {} }); } finally { console.log = orig; }
  assert.match(logs.join('\n'), /capture skipped \(write_target_refused\)/);
});

test('capture is blocked (and recorded) while the provider source is unapproved or unreviewed', async () => {
  for (const source of [{ ...APPROVED, enabled: false }, { ...APPROVED, access_mode: 'review_required' }, { ...APPROVED, latest_rights_review_id: null }, null]) {
    const store = fakeStore({ source });
    const r = await runCapture(store, ON, { fetchImpl: neverFetch });
    assert.equal(r.status, 'blocked');
    assert.match(r.assertions.source_policy, /not (approved|registered)/);
    assert.equal(store.runs[0].status, 'blocked');
  }
});

test('capture is blocked without a key, over the cost cap, or when preflight fails', async () => {
  assert.equal((await runCapture(fakeStore(), { ...ON, ODDS_API_KEY: '' }, { fetchImpl: neverFetch })).assertions.credential, 'ODDS_API_KEY not configured');
  const costly = await runCapture(fakeStore(), { ...ON, ODDS_REGION_PLAN: 'us=h2h,totals;uk=h2h,totals;eu=h2h,totals;au=h2h,totals;us2=h2h', ODDS_MAX_RUN_COST: '8' }, { fetchImpl: neverFetch });
  assert.match(costly.assertions.cost, /exceeds/);
  const r = await runCapture(fakeStore(), ON, { fetchImpl: async () => sportsOk('10') });
  assert.equal(r.assertions.preflight, 'quota_below_floor');
  const inactive = async () => new Response(JSON.stringify([{ key: 'boxing_boxing', active: false }]), { status: 200 });
  assert.equal((await runCapture(fakeStore(), ON, { fetchImpl: inactive })).assertions.preflight, 'sport_inactive');
});

test('cadence: not due inside the interval (no provider call); daily budget blocks; force overrides cadence only', async () => {
  const now = '2026-09-13T12:00:00Z';
  const recent = { last_capture_at: '2026-09-13T11:00:00Z', credits_24h: 20, credits_30d: 100, next_commence_times: [{ commence_time: '2026-09-25T20:00:00Z' }] };
  const store = fakeStore({ state: recent });
  const r = await runCapture(store, ON, { fetchImpl: neverFetch, now });
  assert.equal(r.status, 'not_due');
  assert.equal(r.decision.tier, 'far');
  assert.equal(store.runs.length, 0);
  const broke = await runCapture(fakeStore({ state: { ...recent, credits_24h: 600 } }), ON, { fetchImpl: neverFetch, now, force: false });
  assert.equal(broke.status, 'blocked');
  assert.match(broke.assertions.budget, /daily budget/);
  const unapproved = await runCapture(fakeStore({ state: recent, source: { ...APPROVED, enabled: false } }), ON, { fetchImpl: neverFetch, now, force: true });
  assert.equal(unapproved.status, 'blocked', 'force never bypasses rights');
});

test('cadence tiers and budget fallback', () => {
  const now = Date.parse('2026-09-19T18:00:00Z');
  const at = (h) => ({ commence_time: new Date(now + h * 3600_000).toISOString() });
  assert.equal(tierFor(now, [at(2)]), 'live_window');
  assert.equal(tierFor(now, [at(-1.5)]), 'live_window');
  assert.equal(tierFor(now, [at(10)]), 'fight_day');
  assert.equal(tierFor(now, [at(72)]), 'fight_week');
  assert.equal(tierFor(now, [at(24 * 30)]), 'far');
  assert.equal(tierFor(now, [{ ...at(1), placeholder_suspect: true }]), 'far', 'placeholder dates never drive cadence');
  assert.equal(tierFor(now, []), 'far');
  const d = decideCadence({ now, runCost: 6, state: { last_capture_at: new Date(now - 16 * 60_000).toISOString(), credits_24h: 0, credits_30d: 0, next_commence_times: [at(1)] } });
  assert.deepEqual([d.due, d.tier, d.intervalMinutes], [true, 'live_window', 15]);
  const over = decideCadence({ now, runCost: 6, state: { last_capture_at: new Date(now - 16 * 60_000).toISOString(), credits_24h: 0, credits_30d: 7998, next_commence_times: [at(1)] } });
  assert.deepEqual([over.due, over.tier, over.budgetFallback], [false, 'far', true]);
  assert.deepEqual(parseRegionPlan({ ODDS_REGION_PLAN: 'us=h2h,totals;uk=h2h' }), [{ region: 'us', markets: ['h2h', 'totals'] }, { region: 'uk', markets: ['h2h'] }]);
  assert.equal(planCost(parseRegionPlan({ ODDS_REGION_PLAN: 'us=h2h,totals;us2=h2h;uk=h2h;eu=h2h;au=h2h' })), 6);
});

test('staging wrangler config: staging-only writes, default environment off', () => {
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const split = toml.search(/^\[env\.staging\]$/m);
  const top = toml.slice(0, split);
  assert.match(top, /ODDS_CAPTURE_ENABLED = "false"/);
  assert.match(top, /crons = \[\]/);
  const staging = toml.slice(split);
  assert.match(staging, /name = "boxing-odds-staging"/);
  assert.match(staging, /BOXING_SUPABASE_REF = "wpaxofilvbsjyrxrwjhg"/);
  assert.match(staging, /BOXING_ENVIRONMENT = "staging"/);
  assert.doesNotMatch(toml, /tkmlnhmylqnttmnsnief|rlfyavnhbngwbldebrid/);
  assert.doesNotMatch(toml, /^\s*routes?\s*=/m);
});

test('raw observation and provider ledger are written before canonical matching; unmatched events are queued, not dropped', async () => {
  const store = fakeStore();
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    if (String(url).includes('/sports/?')) return sportsOk();
    return new Response(JSON.stringify(oddsBody), { status: 200, headers: { 'x-requests-remaining': '89999', 'x-requests-used': '10001', 'x-requests-last': '1' } });
  };
  const r = await runCapture(store, ON, { fetchImpl, now: '2026-09-13T10:05:00Z' });
  assert.equal(r.status, 'partial');
  assert.deepEqual(store.writes.map(([k]) => k), ['observation', 'ledger', 'unmatched']);
  assert.equal(store.writes[1][1].events[0].quotes.length, 2);
  assert.equal(store.writes[2][1].reason, 'no_candidate_bout_in_window');
  assert.equal(r.metrics.credits_spent, 1);
  assert.deepEqual(store.captures.map((c) => [c.endpoint, c.http_status, c.credits_cost]), [['sports', 200, 0], ['odds', 200, 1]]);
  assert.equal(calls, 2);
});

test('provider errors never leak the api key', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('/sports/?')) return sportsOk();
    throw new Error(`connect failed for ${url}`);
  };
  const store = fakeStore();
  const r = await runCapture(store, ON, { fetchImpl });
  assert.equal(r.status, 'failed');
  for (const blob of [JSON.stringify(r), JSON.stringify(store.runs), JSON.stringify(store.captures)]) {
    assert.ok(!blob.includes(KEY));
  }
  assert.match(store.captures.at(-1).error, /apiKey=<redacted>/);
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
