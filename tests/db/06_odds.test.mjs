// Issue #4 acceptance against a real database. All fighters, events and
// prices are synthetic.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { ingestIdentity } from '../../shared/identity/pipeline.mjs';
import { detectAndEmitMoves, ingestOddsPayload } from '../../shared/odds/ingest.mjs';
import { freshness } from '../../shared/odds/freshness.mjs';

let db;
let store;
const F = {};
const B = {};
const hoursFromNow = (h) => new Date(Date.now() + h * 3600_000).toISOString();

async function boxer(key, name, dob) {
  const { result } = await ingestIdentity(store, {
    sourceKey: 'odds_fixture_registry', accessMode: 'approved_ingest', namespace: 'odds_fixture_registry',
    record: { external_id: key, display_name: name, dob }, payload: { key, name, dob },
  });
  F[key] = result.fighter_id;
}

async function card(name, startsAt, pairs) {
  const src = (await db.client.query(`select id from public.boxing_sources where source_key = 'odds_fixture_registry'`)).rows[0];
  const evt = (await db.client.query(
    `insert into public.boxing_events (source_id, name, event_date, start_at, status) values ($1, $2, $3::timestamptz::date, $3, 'scheduled') returning id`,
    [src.id, name, startsAt])).rows[0];
  for (const [key, a, b] of pairs) {
    const bt = (await db.client.query(
      `insert into public.boxing_bouts (event_id, source_id, status, scheduled_rounds) values ($1, $2, 'scheduled', 12) returning id`, [evt.id, src.id])).rows[0];
    await db.client.query(
      `insert into public.boxing_bout_participants (bout_id, fighter_id, side) values ($1, $2, 'a'), ($1, $3, 'b')`, [bt.id, F[a], F[b]]);
    B[key] = bt.id;
  }
}

const h2h = (book, ts, prices, extra = []) => ({
  key: book, title: book, last_update: ts,
  markets: [{ key: 'h2h', last_update: ts, outcomes: [...Object.entries(prices).map(([name, price]) => ({ name, price })), ...extra] }, ...[]],
});

before(async () => {
  db = await freshDatabase('odds');
  store = pgStore(db.client);
  await testSource(db.client, 'odds_fixture_registry');
  for (const [k, n, d] of [
    ['volkov', 'Dmitri Volkov', '1990-03-15'], ['berg', 'Jonas Berg', '1994-10-10'], ['okafor', 'Emmanuel Okafor', '1991-01-25'],
    ['nunez', 'José Ramón Núñez', '1997-10-02'], ['dan', 'Daniel Volkov', '1998-04-22'], ['stone', 'Aaron Stone', '1992-02-02'],
    ['hale', 'Marcus Hale', '1993-07-07'], ['quinn', 'Rory Quinn', '1995-05-05'],
  ]) await boxer(k, n, d);
  const fightNight = hoursFromNow(24 * 5);
  await card('Synthetic Card One', fightNight, [['berg_volkov', 'berg', 'volkov'], ['okafor_nunez', 'okafor', 'nunez'], ['volkov_bros', 'dan', 'stone']]);
  await card('Synthetic Card Started', hoursFromNow(-1), [['hale_quinn', 'hale', 'quinn']]);
});
after(async () => { await db?.close(); });

test('collection is blocked in the database while the provider source is not approved', async () => {
  const src = (await db.client.query(`select enabled, access_mode, rights_state from public.boxing_sources where source_key = 'the_odds_api'`)).rows[0];
  assert.deepEqual(src, { enabled: false, access_mode: 'review_required', rights_state: 'unknown' });
  await expectPgError(() => ingestOddsPayload(store, { payload: [] }), { code: 'BX010', match: /source_not_ingestable: the_odds_api/ });
  // approve ONLY inside this disposable test database
  await db.client.query(`update public.boxing_sources set access_mode = 'approved_ingest', rights_state = 'approved',
    persistence_allowed = true, reviewed_at = now(), reviewed_by = 'test harness (disposable db)', enabled = true
    where source_key = 'the_odds_api'`);
});

const T0 = hoursFromNow(-20);
const T1 = hoursFromNow(-2);
const T2 = hoursFromNow(-1);
// fixed once: a payload that is re-delivered must be byte-identical
const COMMENCE = hoursFromNow(24 * 5 + 1);
const commence = () => COMMENCE;

// evt-on is only delivered at T0, so its last confirmation stays 20h old.
const payloadAt = (ts, { volkovPrice = -150 } = {}) => [
  { id: 'evt-bv', sport_key: 'boxing_boxing', commence_time: commence(), home_team: 'D. Volkov', away_team: 'Berg',
    bookmakers: [h2h('book_one', ts, { 'D. Volkov': volkovPrice, Berg: 130 }), h2h('book_two', ts, { 'D. Volkov': -140, Berg: 120 })] },
  ...(ts === T0 ? [{ id: 'evt-on', sport_key: 'boxing_boxing', commence_time: commence(), home_team: 'Jose Ramon Nunez', away_team: 'Emmanuel Okafor',
    bookmakers: [h2h('book_one', ts, { 'Jose Ramon Nunez': 250, 'Emmanuel Okafor': -300 }, [{ name: 'Draw', price: 2500 }])] }] : []),
  { id: 'evt-unknown', sport_key: 'boxing_boxing', commence_time: commence(), home_team: 'Nobody Known', away_team: 'Also Unknown', bookmakers: [] },
  { id: 'evt-cross', sport_key: 'boxing_boxing', commence_time: commence(), home_team: 'Dmitri Volkov', away_team: 'Emmanuel Okafor',
    bookmakers: [h2h('book_one', ts, { 'Dmitri Volkov': -110, 'Emmanuel Okafor': -110 })] },
];

const ticks = async () => (await db.client.query(`select count(*)::int n from public.boxing_market_ticks`)).rows[0].n;

test('first capture: matched events produce ticks; unknown and cross-card events fail closed', async () => {
  const { metrics } = await ingestOddsPayload(store, { payload: payloadAt(T0), capturedAt: T0 });
  assert.equal(metrics.events_matched, 2);
  assert.equal(metrics.events_unmatched, 2);
  assert.deepEqual(metrics.unmatched_reasons, { participants_not_found: 1, no_bout_with_both_fighters: 1 });
  assert.equal(metrics.ticks_inserted, 2 * 2 + 3);
  const u = (await db.client.query(`select provider_event_id, reason from public.boxing_market_unmatched order by 1`)).rows;
  assert.deepEqual(u.map((r) => r.provider_event_id), ['evt-cross', 'evt-unknown']);
  const mapped = (await db.client.query(`select external_id, bout_id from public.boxing_bout_identities order by 1`)).rows;
  assert.deepEqual(mapped, [{ external_id: 'evt-bv', bout_id: B.berg_volkov }, { external_id: 'evt-on', bout_id: B.okafor_nunez }]);
  const draw = (await db.client.query(`select m.market_type, s.fighter_id from public.boxing_market_selections s join public.boxing_markets m on m.id = s.market_id where s.selection_key = 'draw'`)).rows;
  assert.deepEqual(draw, [{ market_type: 'moneyline_3way', fighter_id: null }]);
});

test('repeat provider payload is idempotent', async () => {
  const before = await ticks();
  const { metrics } = await ingestOddsPayload(store, { payload: payloadAt(T0), capturedAt: T0 });
  assert.equal(metrics.raw_observation_duplicate, true);
  assert.equal(metrics.ticks_inserted, 0);
  assert.equal(await ticks(), before);
  const seen = (await db.client.query(`select max(seen_count) n from public.boxing_market_unmatched`)).rows[0].n;
  assert.equal(seen, 2, 'unmatched is re-counted, not duplicated');
});

test('a new price creates a new tick and previous ticks remain unchanged', async () => {
  const snapshot = async () => (await db.client.query(`select id, american_odds, provider_timestamp from public.boxing_market_ticks order by id`)).rows;
  const beforeRows = await snapshot();
  const { metrics } = await ingestOddsPayload(store, { payload: payloadAt(T1, { volkovPrice: -200 }), capturedAt: T1 });
  assert.equal(metrics.ticks_inserted, 1, 'only book_one Volkov changed');
  const afterRows = await snapshot();
  assert.deepEqual(afterRows.slice(0, beforeRows.length), beforeRows);
  // A -> B -> A: the reversion is a real tick
  const r = await ingestOddsPayload(store, { payload: payloadAt(T2, { volkovPrice: -150 }), capturedAt: T2 });
  assert.equal(r.metrics.ticks_inserted, 1);
});

test('opening / latest / change / freshness derivations; stale never shown as current', async () => {
  const rows = await store.selectionPrices(B.berg_volkov);
  const v1 = rows.find((r) => r.bookmaker === 'book_one' && r.selection_key === 'fighter_b');
  assert.equal(v1.opening_american, -150);
  assert.equal(v1.latest_american, -150);
  assert.equal(Number(v1.tick_count), 3);
  assert.equal(v1.freshness, 'fresh');
  assert.equal(v1.current_american, -150);
  assert.equal(v1.closing_american, null, 'no closing price before the fight starts');
  assert.equal(v1.fighter_id, F.volkov);

  const on = await store.selectionPrices(B.okafor_nunez);
  const okafor = on.find((r) => r.selection_key === 'fighter_a');
  assert.equal(okafor.freshness, 'stale', 'last confirmed 20h ago, fight in 5 days (12h window)');
  assert.equal(okafor.latest_american, -300);
  assert.equal(okafor.current_american, null, 'stale price is not presented as current');
});

test('closing price is the last pre-fight tick; live ticks are separate markets', async () => {
  const started = hoursFromNow(-1);
  const pre1 = hoursFromNow(-5);
  const pre2 = hoursFromNow(-2);
  const live = hoursFromNow(-0.5);
  const ev = (ts) => [{ id: 'evt-hq', sport_key: 'boxing_boxing', commence_time: started, home_team: 'Marcus Hale', away_team: 'Rory Quinn',
    bookmakers: [h2h('book_one', ts, { 'Marcus Hale': ts === pre1 ? -120 : ts === pre2 ? -135 : -400, 'Rory Quinn': 100 })] }];
  for (const ts of [pre1, pre2, live]) await ingestOddsPayload(store, { payload: ev(ts), capturedAt: ts });
  const rows = await store.selectionPrices(B.hale_quinn);
  const pre = rows.find((r) => r.market_key === 'moneyline|fight|-|pre' && r.selection_key === 'fighter_a');
  const inPlay = rows.find((r) => r.market_key === 'moneyline|fight|-|live' && r.selection_key === 'fighter_a');
  assert.equal(pre.opening_american, -120);
  assert.equal(pre.closing_american, -135);
  assert.equal(pre.freshness, 'closed');
  assert.equal(pre.current_american, null);
  assert.equal(inPlay.latest_american, -400);
  assert.equal(inPlay.freshness, 'stale', 'live price 30 min old is stale (2 min window)');
});

test('bookmaker disagreement: consensus, min/max and dispersion over fresh books only', async () => {
  const c = await store.consensus(B.berg_volkov);
  const volkov = c.find((r) => r.market_key === 'moneyline|fight|-|pre' && r.selection_key === 'fighter_b');
  assert.equal(Number(volkov.bookmaker_count), 2);
  assert.equal(volkov.min_american, -150);
  assert.equal(volkov.max_american, -140);
  assert.equal(Number(volkov.implied_dispersion).toFixed(6), (0.6 - 140 / 240).toFixed(6));
  assert.equal(Number(volkov.consensus_implied).toFixed(6), ((0.6 + 140 / 240) / 2).toFixed(6));
});

test('event/bout mappings do not cross-wire when the provider reuses an event id', async () => {
  const before = await ticks();
  const reused = [{ id: 'evt-bv', sport_key: 'boxing_boxing', commence_time: commence(), home_team: 'Dmitri Volkov', away_team: 'Aaron Stone',
    bookmakers: [h2h('book_one', T2, { 'Dmitri Volkov': -500, 'Aaron Stone': 350 })] }];
  const { metrics } = await ingestOddsPayload(store, { payload: reused, capturedAt: T2 });
  assert.equal(metrics.events_matched, 0);
  assert.deepEqual(metrics.unmatched_reasons, { mapped_bout_participant_mismatch: 1 });
  assert.equal(await ticks(), before);
});

test('participant ambiguity inside a bout fails closed', async () => {
  const before = await ticks();
  // bout "Daniel Volkov vs Aaron Stone": provider gives an initial that fits no corner uniquely
  const amb = [{ id: 'evt-amb', sport_key: 'boxing_boxing', commence_time: commence(), home_team: 'Volkov', away_team: 'A. Volkov',
    bookmakers: [h2h('book_one', T2, { Volkov: -150, 'A. Volkov': 130 })] }];
  const { metrics } = await ingestOddsPayload(store, { payload: amb, capturedAt: T2 });
  assert.equal(metrics.events_matched, 0);
  assert.equal(await ticks(), before);
});

test('a selection cannot point at a fighter outside its bout', async () => {
  const m = (await db.client.query(`select id from public.boxing_markets where bout_id = $1 limit 1`, [B.berg_volkov])).rows[0];
  await expectPgError(() => db.client.query(
    `insert into public.boxing_market_selections (market_id, selection_key, fighter_id) values ($1, 'fighter_x', $2)`, [m.id, F.okafor]),
  { code: 'BX050' });
});

test('SQL freshness matches the JS implementation', async () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const cases = [];
  for (const lastH of [0.01, 0.1, 0.4, 1, 2.5, 11, 13, 30, 40]) {
    for (const startH of [-2, 1, 2.9, 20, 30, 150, 200, null]) {
      for (const isLive of [false, true]) {
        cases.push({ lastSeenAt: new Date(+now - lastH * 3600_000).toISOString(), startsAt: startH == null ? null : new Date(+now + startH * 3600_000).toISOString(), isLive });
      }
    }
  }
  const { rows } = await db.client.query(
    `select public.boxing_market_freshness((c.v ->> 'l')::timestamptz, (c.v ->> 's')::timestamptz, (c.v ->> 'live')::boolean, $2::timestamptz) f
     from jsonb_array_elements($1::jsonb) with ordinality as c(v, ord) order by c.ord`,
    [JSON.stringify(cases.map((c) => ({ l: c.lastSeenAt, s: c.startsAt, live: c.isLive }))), now.toISOString()]);
  assert.deepEqual(rows.map((r) => r.f), cases.map((c) => freshness({ ...c, now })));
});

test('MARKET_MOVED is thresholded, carries its facts and is not duplicated', async () => {
  // two books move Volkov from about -145 (last price before the 24h window
  // opened) to about -260 inside it
  const t0 = hoursFromNow(-25);
  const t1 = hoursFromNow(-0.5);
  const mv = (ts, p1, p2) => [{ id: 'evt-mv', sport_key: 'boxing_boxing', commence_time: commence(), home_team: 'Daniel Volkov', away_team: 'Aaron Stone',
    bookmakers: [h2h('book_one', ts, { 'Daniel Volkov': p1, 'Aaron Stone': 120 }), h2h('book_two', ts, { 'Daniel Volkov': p2, 'Aaron Stone': 115 })] }];
  await ingestOddsPayload(store, { payload: mv(t0, -145, -140), capturedAt: t0 });
  const { matched } = await ingestOddsPayload(store, { payload: mv(t1, -260, -250), capturedAt: t1 });
  const now = new Date().toISOString();
  const first = await detectAndEmitMoves(store, { matched, now });
  assert.equal(first.emitted.length, 1);
  const facts = first.emitted[0].facts;
  assert.equal(facts.selection_key, 'fighter_a');
  assert.equal(facts.books_participating, 2);
  assert.equal(facts.cause, null);
  const row = (await db.client.query(`select event_type, bout_id, fighter_ids, sources, state from public.boxing_news_events where id = $1`, [first.emitted[0].id])).rows[0];
  assert.equal(row.event_type, 'MARKET_MOVED');
  assert.equal(row.bout_id, B.volkov_bros);
  assert.deepEqual(row.fighter_ids, [F.dan]);
  assert.equal(row.sources[0].source_key, 'the_odds_api');

  const second = await detectAndEmitMoves(store, { matched, now });
  assert.equal(second.emitted.length, 0, 'same market state -> no new event');
  const n = (await db.client.query(`select count(*)::int n from public.boxing_news_events where event_type = 'MARKET_MOVED'`)).rows[0].n;
  assert.equal(n, 1);
});
