// Forward odds capture acceptance (issue #4, staging activation) against a
// real database. The provider is faked: every event, name and price below is
// synthetic, and the fake key never leaves this process.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { ingestIdentity } from '../../shared/identity/pipeline.mjs';
import { runCapture } from '../../shared/odds/capture.mjs';

const KEY = 'fakekey'.padEnd(32, 'x');
const H = 3600_000;
const NOW = Date.now();
const at = (h) => new Date(NOW + h * H).toISOString();
const ENV = { ODDS_CAPTURE_ENABLED: 'true', ODDS_API_KEY: KEY, ODDS_REGION_PLAN: 'us=h2h,totals;uk=h2h', ODDS_MIN_REMAINING: '1000' };

let db;
let store;
const F = {};
let boutId;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const count = async (table, where = 'true', params = []) => Number((await one(`select count(*)::int n from public.${table} where ${where}`, params)).n);

// Synthetic provider state per capture moment.
const E1 = { id: 'syn-evt-matched', commence_time: at(24 * 5), home_team: 'Dmitri Volkov', away_team: 'Jonas Berg' };
const E2 = { id: 'syn-evt-unmatched', commence_time: at(24 * 6), home_team: 'Ghost Fighter One', away_team: 'Ghost Fighter Two' };
const E3 = { id: 'syn-evt-started', commence_time: at(-2), home_team: 'Past Name A', away_team: 'Past Name B' };
const h2h = (key, ts, a, b, [na, nb]) => ({ key, title: key, last_update: ts, markets: [{ key: 'h2h', last_update: ts, outcomes: [{ name: na, price: a }, { name: nb, price: b }] }] });

function providerState(moment) {
  // moment: { ts, e1: [a, b], e3?: [a, b] | null, includeE3 }
  const us = [
    { ...E1, sport_key: 'boxing_boxing', bookmakers: [h2h('synbook_a', moment.ts, ...moment.e1, [E1.home_team, E1.away_team]), h2h('synbook_b', moment.ts, moment.e1[0] + 5, moment.e1[1] - 5, [E1.home_team, E1.away_team])] },
    { ...E2, sport_key: 'boxing_boxing', bookmakers: [{ key: 'synbook_a', title: 'synbook_a', last_update: moment.ts2 ?? moment.ts, markets: [
      { key: 'h2h', last_update: moment.ts2 ?? moment.ts, outcomes: [{ name: E2.home_team, price: 200 }, { name: E2.away_team, price: -250 }, { name: 'Draw', price: 2500 }] },
      { key: 'totals', last_update: moment.ts2 ?? moment.ts, outcomes: [{ name: 'Over', price: -120, point: 9.5 }, { name: 'Under', price: 100, point: 9.5 }] },
      { key: 'h2h_lay', last_update: moment.ts2 ?? moment.ts, outcomes: [{ name: E2.home_team, price: 210 }, { name: E2.away_team, price: -240 }] },
    ] }] },
  ];
  if (moment.e3) us.push({ ...E3, sport_key: 'boxing_boxing', bookmakers: [h2h('synbook_a', moment.e3ts ?? moment.ts, ...moment.e3, [E3.home_team, E3.away_team])] });
  const uk = [{ ...E1, sport_key: 'boxing_boxing', bookmakers: [h2h('synbook_uk', moment.ts, moment.e1[0] - 5, moment.e1[1] + 5, [E1.home_team, E1.away_team])] }];
  return { us, uk };
}

function fakeProvider(moment, log = []) {
  const state = providerState(moment);
  return async (url) => {
    const u = new URL(url);
    log.push(u.pathname + '?' + [...u.searchParams].filter(([k]) => k !== 'apiKey').map(([k, v]) => `${k}=${v}`).join('&'));
    if (u.pathname.endsWith('/sports/')) {
      return new Response(JSON.stringify([{ key: 'boxing_boxing', active: true }]), { status: 200, headers: { 'x-requests-remaining': '90000', 'x-requests-used': '10000', 'x-requests-last': '0' } });
    }
    const region = u.searchParams.get('regions');
    const markets = u.searchParams.get('markets').split(',');
    return new Response(JSON.stringify(state[region]), { status: 200, headers: { 'x-requests-remaining': '89990', 'x-requests-used': '10010', 'x-requests-last': String(markets.length) } });
  };
}

const capture = (moment, opts = {}) => runCapture(store, ENV, { fetchImpl: fakeProvider(moment, opts.log), now: moment.now, force: true });

// Capture timeline (hours relative to NOW)
const A = { now: at(-40), ts: at(-40), e1: [-145, 125], e3: [-110, -110] };
const B = { now: at(-20), ts: at(-40), e1: [-145, 125], e3: [-110, -110] };          // identical provider state, re-delivered later
const C = { now: at(-1), ts: at(-1), e1: [-260, 210], e3: [-300, 240], e3ts: at(-1) };  // real moves; E3 is now in play
const D = { now: at(0), ts: at(-1), ts2: at(0), e1: [-260, 210], e3: [-300, 240], e3ts: at(-1) };

before(async () => {
  db = await freshDatabase('odds_forward');
  store = pgStore(db.client);
  await testSource(db.client, 'odds_fixture_registry');
  for (const [k, n, d] of [['volkov', 'Dmitri Volkov', '1990-03-15'], ['berg', 'Jonas Berg', '1994-10-10']]) {
    const { result } = await ingestIdentity(store, { sourceKey: 'odds_fixture_registry', accessMode: 'approved_ingest', namespace: 'odds_fixture_registry',
      record: { external_id: k, display_name: n, dob: d }, payload: { k, n, d } });
    F[k] = result.fighter_id;
  }
  const src = await one(`select id from public.boxing_sources where source_key = 'odds_fixture_registry'`);
  const evt = await one(`insert into public.boxing_events (source_id, name, event_date, start_at, status) values ($1, 'Synthetic Forward Card', $2::timestamptz::date, $2, 'scheduled') returning id`, [src.id, E1.commence_time]);
  boutId = (await one(`insert into public.boxing_bouts (event_id, source_id, status, scheduled_rounds) values ($1, $2, 'scheduled', 12) returning id`, [evt.id, src.id])).id;
  await q(`insert into public.boxing_bout_participants (bout_id, fighter_id, side) values ($1, $2, 'a'), ($1, $3, 'b')`, [boutId, F.volkov, F.berg]);
});
after(async () => { await db?.close(); });

test('3. the source rights gate is checked before any provider call; 2. only a verified local/allow-listed target captures', async () => {
  await q(`update public.boxing_sources set enabled = false where source_key = 'the_odds_api'`);
  const log = [];
  const r = await capture(A, { log });
  assert.equal(r.status, 'blocked');
  assert.match(r.assertions.source_policy, /enabled=false/);
  assert.deepEqual(log, [], 'no provider request while unapproved');
  await q(`update public.boxing_sources set enabled = true where source_key = 'the_odds_api'`);

  const remote = pgStore({ connectionParameters: { host: 'db.tkmlnhmylqnttmnsnief.supabase.co' } });
  const refused = await runCapture(remote, ENV, { fetchImpl: fakeProvider(A, log), now: A.now, force: true });
  assert.equal(refused.status, 'blocked');
  assert.match(refused.assertions.write_target, /no verified/);
  assert.deepEqual(log, []);
});

test('4 + 5. raw observations and provider history survive unmatched resolution; names never create boxers', async () => {
  const fightersBefore = await count('boxing_fighters');
  const log = [];
  const r = await capture(A, { log });
  assert.equal(r.status, 'partial');
  assert.deepEqual(log.filter((l) => l.includes('/odds/')).map((l) => l.replace(/.*regions=([a-z0-9]+)&markets=([a-z0-9_,]+).*/, '$1:$2')), ['us:h2h,totals', 'uk:h2h']);
  assert.equal(r.metrics.credits_spent, 3);
  assert.equal(r.metrics.events_matched, 2, 'E1 matched in both regions');
  assert.equal(r.metrics.events_unmatched, 2, 'E2 and E3 unmatched');

  assert.equal(await count('boxing_source_observations', `source_id = (select id from public.boxing_sources where source_key = 'the_odds_api')`), 2);
  assert.equal(await count('boxing_provider_events'), 3);
  assert.equal(await count('boxing_provider_participants'), 6);
  const unmatched = await q(`select provider_event_id, reason, home_name, away_name, observation_id is not null as has_obs from public.boxing_market_unmatched order by provider_event_id`);
  assert.deepEqual(unmatched.map((u) => [u.provider_event_id, u.reason, u.has_obs]),
    [['syn-evt-started', 'no_candidate_bout_in_window', true], ['syn-evt-unmatched', 'participants_not_found', true]]);
  // every returned market is preserved at provider level, including ones the canonical normalizer does not support
  const e2 = await q(`select s.provider_market_key, s.outcome_name, q.point, q.price_american, s.region
    from public.boxing_provider_quote_series s join public.boxing_provider_quotes q on q.series_id = s.id
    where s.provider_event_id = 'syn-evt-unmatched' order by 1, 2`);
  assert.deepEqual(e2.map((x) => [x.provider_market_key, x.outcome_name, x.point == null ? null : Number(x.point), x.price_american]), [
    ['h2h', 'Draw', null, 2500], ['h2h', 'Ghost Fighter One', null, 200], ['h2h', 'Ghost Fighter Two', null, -250],
    ['h2h_lay', 'Ghost Fighter One', null, 210], ['h2h_lay', 'Ghost Fighter Two', null, -240],
    ['totals', 'Over', 9.5, -120], ['totals', 'Under', 9.5, 100]]);
  assert.ok(e2.every((x) => x.region === 'us'));
  const quote = await one(`select q.observation_id, q.captured_at, q.provider_last_update, q.commence_time, q.ingest_run_id from public.boxing_provider_quotes q
    join public.boxing_provider_quote_series s on s.id = q.series_id where s.provider_event_id = 'syn-evt-unmatched' limit 1`);
  assert.ok(quote.observation_id && quote.ingest_run_id && quote.captured_at && quote.provider_last_update && quote.commence_time);

  assert.equal(await count('boxing_fighters'), fightersBefore, 'provider names created no canonical fighter');
  assert.equal(await count('boxing_fighter_identities', `namespace like 'the_odds_api%'`), 0);
  const resolution = await q(`select participant_name, resolution_state from public.boxing_provider_participant_resolution order by 1`);
  assert.ok(resolution.every((p) => p.resolution_state === 'unresolved'), 'even matched-bout names are not written as fighter identities');

  const captures = await q(`select endpoint, region, http_status, credits_cost, observation_id is not null as has_obs from public.boxing_provider_captures order by requested_at, endpoint desc`);
  assert.deepEqual(captures.map((c) => [c.endpoint, c.region, c.credits_cost, c.has_obs]), [['sports', null, 0, false], ['odds', 'us', 2, true], ['odds', 'uk', 1, true]]);
});

test('6 + 7. identical provider state re-delivered creates no ticks or quotes but is traceable; ticks and quotes are append-only', async () => {
  const ticks = await count('boxing_market_ticks');
  const quotes = await count('boxing_provider_quotes');
  const captures = await count('boxing_provider_captures');
  const r = await capture(B);
  assert.equal(r.metrics.ticks_inserted, 0);
  assert.equal(r.metrics.quotes_inserted, 0);
  assert.ok(r.metrics.quotes_unchanged > 0);
  assert.equal(await count('boxing_market_ticks'), ticks);
  assert.equal(await count('boxing_provider_quotes'), quotes);
  assert.equal(await count('boxing_provider_captures'), captures + 3, 'every call is logged');
  const dup = await q(`select observation_duplicate from public.boxing_provider_captures where ingest_run_id = $1 and endpoint = 'odds'`, [r.runId]);
  assert.deepEqual(dup.map((d) => d.observation_duplicate), [true, true], 'identical payloads point at the existing raw observation');
  const seen = await one(`select last_seen_at from public.boxing_provider_quote_series where provider_event_id = 'syn-evt-unmatched' limit 1`);
  assert.equal(new Date(seen.last_seen_at).toISOString(), B.now, 're-confirmation moves last_seen_at only');

  await expectPgError(() => q(`update public.boxing_market_ticks set american_odds = 100`), { code: 'BX001' });
  await expectPgError(() => q(`delete from public.boxing_provider_quotes`), { code: 'BX001' });
  await expectPgError(() => q(`update public.boxing_provider_captures set credits_cost = 0`), { code: 'BX001' });
  await expectPgError(() => q(`update public.boxing_provider_events set home_name = 'x'`), { code: 'BX002' });
});

test('9. stale detection: a series not re-confirmed within its window is stale and has no current price', async () => {
  const rows = await q(`select provider_event_id, freshness, current_american, latest_american, age_seconds from public.boxing_provider_quote_prices
    where bookmaker_key = 'synbook_a' and provider_market_key = 'h2h' and outcome_name in ('Ghost Fighter One', 'Dmitri Volkov') order by 1`);
  // last seen 20h ago; fight in 5-6 days -> 12h freshness window
  assert.deepEqual(rows.map((x) => [x.provider_event_id, x.freshness, x.current_american]), [['syn-evt-matched', 'stale', null], ['syn-evt-unmatched', 'stale', null]]);
  assert.ok(rows.every((x) => x.latest_american != null && x.age_seconds >= 20 * 3600 - 60));
  const canon = await q(`select freshness, current_american from public.boxing_market_selection_prices where bout_id = $1 and bookmaker = 'synbook_a' and selection_key = 'fighter_a'`, [boutId]);
  assert.deepEqual(canon, [{ freshness: 'stale', current_american: null }]);
});

test('8 + 10 + 11. new prices create ticks; opening/current/closing; MARKET_MOVED is factual and deduplicated', async () => {
  const r = await capture(C);
  assert.ok(r.metrics.ticks_inserted >= 6, 'E1 moved at three books (both sides)');
  assert.ok(r.metrics.quotes_inserted >= 8);
  assert.equal(r.metrics.market_moved_emitted, 2, 'both corners moved >= 4 points across the same books');

  const d = await capture(D);
  assert.equal(d.metrics.ticks_inserted, 0);
  assert.equal(d.metrics.market_moved_emitted, 0, 're-observing the same move emits nothing');
  assert.equal(await count('boxing_news_events', `event_type = 'MARKET_MOVED'`), 2);

  const ev = await one(`select payload, sources, dedupe_key from public.boxing_news_events where event_type = 'MARKET_MOVED' and payload #>> '{facts,selection_key}' = 'fighter_a'`);
  const f = ev.payload.facts;
  assert.equal(f.cause, null);
  assert.equal(f.causal_claim_allowed, false);
  assert.equal(f.direction, 'shortened');
  assert.deepEqual(f.bookmakers.map((b) => b.bookmaker).sort(), ['synbook_a', 'synbook_b', 'synbook_uk']);
  assert.ok(f.bookmakers.every((b) => b.previous_american != null && b.new_american != null && b.previous_observed_at && b.new_observed_at));
  assert.ok(Math.abs(f.move_probability_points) >= 0.04);
  assert.ok(!/sharp|steam|insider|smart money|because|due to/i.test(JSON.stringify(ev.payload)), 'no causal language');
  assert.match(ev.sources[0].external_key, /^ticks:/);

  // canonical opening / latest / current
  const vol = await one(`select opening_american, latest_american, current_american, freshness, american_change from public.boxing_market_selection_prices
    where bout_id = $1 and bookmaker = 'synbook_a' and selection_key = 'fighter_a' and market_key = 'moneyline|fight|-|pre'`, [boutId]);
  assert.deepEqual(vol, { opening_american: -145, latest_american: -260, current_american: -260, freshness: 'fresh', american_change: -115 });

  // provider-level opening / closing / latest for the started, unmatched event
  const e3 = await one(`select opening_american, closing_american, closing_at, latest_american, latest_is_live, freshness from public.boxing_provider_quote_prices
    where provider_event_id = 'syn-evt-started' and outcome_name = 'Past Name A'`);
  assert.equal(e3.opening_american, -110);
  assert.equal(e3.closing_american, -110, 'closing = last pre-start price');
  assert.equal(e3.latest_american, -300);
  assert.equal(e3.latest_is_live, true);
  assert.ok(new Date(e3.closing_at) < new Date(E3.commence_time));

  // provider consensus and dispersion keep individual books
  const cons = await one(`select bookmaker_count, min_american, max_american, implied_dispersion, consensus_implied from public.boxing_provider_event_consensus
    where provider_event_id = 'syn-evt-matched' and provider_market_key = 'h2h' and outcome_name = 'Dmitri Volkov'`);
  assert.deepEqual([cons.bookmaker_count, cons.min_american, cons.max_american], ['3', -265, -255]);
  assert.ok(Number(cons.implied_dispersion) > 0 && Number(cons.consensus_implied) > 0.7);
  assert.equal(await count('boxing_provider_quote_series', `provider_event_id = 'syn-evt-matched' and provider_market_key = 'h2h'`), 6, 'per-book series retained');
});

test('1. the provider key never reaches the database; 12. gateway SQL never reads raw provider tables', async () => {
  const tables = ['boxing_ingest_runs', 'boxing_provider_captures', 'boxing_source_observations', 'boxing_market_unmatched', 'boxing_provider_quotes', 'boxing_news_events'];
  for (const t of tables) {
    const hit = await one(`select count(*)::int n from public.${t} x where to_jsonb(x)::text like '%' || $1 || '%'`, [KEY]);
    assert.equal(hit.n, 0, `${t} contains the key`);
  }
  const defs = await q(`select p.proname, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'boxing_gateway_%'`);
  assert.ok(defs.length >= 5);
  for (const d of defs) {
    assert.doesNotMatch(d.def, /boxing_provider_|boxing_source_observations|raw_price|boxing_market_ticks\b/, `${d.proname} reads raw market tables`);
  }
  const { createWorker } = await import('../../workers/boxing-gateway/src/index.mjs');
  const worker = createWorker({ makeStore: () => store });
  const token = 'z'.repeat(40);
  const res = await worker.fetch(new Request(`https://g.internal/internal/v1/bouts/${boutId}/odds-summary`, { headers: { authorization: `Bearer ${token}` } }), { BOXING_INTERNAL_TOKEN: token });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.data.selections.length >= 6);
  assert.ok(body.data.best_prices.some((b) => b.selection_key === 'fighter_a' && b.best_american === -255));
  assert.doesNotMatch(JSON.stringify(body), /syn-evt|raw_price|observation|tick_count|"provider"/);
});

test('coverage summary reports ledger, canonical and unmatched counts', async () => {
  const c = await store.providerCoverage();
  assert.equal(c.provider_events, 3);
  assert.equal(c.events_mapped_to_bouts, 1);
  assert.equal(c.participants_unresolved, 6);
  assert.deepEqual(c.bookmakers_by_region, { uk: 1, us: 2 });
  assert.equal(c.market_moved_events, 2);
  assert.ok(c.credits_spent >= 12);
  const s = await store.oddsScheduleState(new Date().toISOString());
  assert.ok(s.last_capture_at);
  assert.ok(s.next_commence_times.some((x) => x.events >= 1));
});
