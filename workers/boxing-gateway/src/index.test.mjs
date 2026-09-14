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
    siteHome: async (d) => ({ today: d, upcoming: [], recent: [] }),
    siteEvents: async (scope) => ({ scope, total: 0, rows: [] }),
    siteEvent: async (ref) => ({ event: { public_id: `pbe_boxevent_${ref}` }, bouts: [] }),
    siteBout: async (ref) => ({ internal_bout_id: ID, bout: { public_id: `pbe_boxbout_${ref}`, market_matched: true }, corners: {} }),
    siteFighters: async (q) => ({ q, total: 0, rows: [] }),
    siteFighter: async (ref) => ({ fighter: { public_id: `pbe_boxer_${ref}` } }),
    siteTitleBoard: async () => ({ divisions: [], organizations: [] }),
    siteRankingBoard: async () => ({ divisions: [], organizations: [], snapshots: [] }),
    siteTitleLanes: async (wc) => ({ division: { class_key: wc }, lanes: [
      { body: 'wbc', state: 'not_licensed', note: 'Source not licensed', documents: [], conflicts_within_body: [], claims_by_other_bodies: [{ by: 'wba', says: 'X', native_text: 'X' }] },
      { body: 'wba', state: 'current', documents: [{ document_kind: 'wba_ranking', belts: [{ holder: { name: 'A', fighter: 'pbe_boxer_a', fighter_id: ID } }] }], conflicts_within_body: [], claims_by_other_bodies: [] }],
      derived: { status: 'not_derivable' } }),
    siteBodyRankings: async (org) => (org === 'wbc' ? { organization: org, state: 'not_licensed' }
      : { organization: org, state: 'current', snapshot: { snapshot_id: ID, entries: [{ fighter_id: ID, public_id: 'pbe_boxer_a', metadata: { not_rated: true } }] } }),
    siteCoverage: async () => ({ bouts: 0 }),
    siteScorecards: async () => ({ total: 0, rows: [] }),
    siteScorecard: async (ref) => ({ bout: { public_id: `pbe_boxbout_${ref}` } }),
    siteOfficials: async (role) => ({ role, total: 0, rows: [] }),
    siteOfficial: async (ref) => ({ official: { public_id: `pbe_boxofficial_${ref}` } }),
    siteMarketIndex: async () => ({ captured_upcoming_events: 42, matched: [{ public_id: 'pbe_boxbout_x', a: { name: 'A' }, best_american: -150, bookmaker: 'draftkings' }], provider_event_ids: ['abc'], quotes: [] }),
    siteVideos: async () => ({ channels: [], videos: [] }),
    sitePromoters: async () => ({ rows: [] }),
    sitePromoter: async (key) => ({ key }),
    siteFighterContext: async (ref) => ({ public_id: `pbe_boxer_${ref}` }),
    siteBoutContext: async (ref) => ({ public_id: `pbe_boxbout_${ref}` }),
    siteHallOfFame: async () => ({ rows: [] }),
    siteHistory: async () => ({ decades: [] }),
    siteWire: async () => [],
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
    '/internal/v1/rankings', '/internal/v1/officials/:id', '/internal/v1/officials/:id/dna', '/internal/v1/models',
    '/internal/v1/site/home', '/internal/v1/site/events', '/internal/v1/site/events/:ref', '/internal/v1/site/bouts/:ref', '/internal/v1/site/fighters',
    '/internal/v1/site/fighters/:ref', '/internal/v1/site/titles', '/internal/v1/site/rankings', '/internal/v1/site/coverage',
    '/internal/v1/site/scorecards', '/internal/v1/site/scorecards/:ref', '/internal/v1/site/officials', '/internal/v1/site/officials/:ref',
    '/internal/v1/site/market-index', '/internal/v1/site/videos', '/internal/v1/site/promoters', '/internal/v1/site/promoters/:key',
    '/internal/v1/site/fighters/:ref/context', '/internal/v1/site/bouts/:ref/context', '/internal/v1/site/hall-of-fame', '/internal/v1/site/eras', '/internal/v1/site/wire'];
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
    `/internal/v1/officials/${ID}`, `/internal/v1/officials/${ID}/dna`, '/internal/v1/models', '/internal/v1/contract',
    '/internal/v1/site/home?today=2026-09-13', '/internal/v1/site/events?scope=upcoming&commission=nsac&limit=5', '/internal/v1/site/events/0123456789ab',
    '/internal/v1/site/bouts/0123456789ab', '/internal/v1/site/fighters?q=ruiz', '/internal/v1/site/fighters/0123456789abcdef',
    '/internal/v1/site/titles?weight_class=welterweight', '/internal/v1/site/rankings?organization=wbc&weight_class=welterweight', '/internal/v1/site/coverage',
    '/internal/v1/site/scorecards?decision=split&sort=spread', '/internal/v1/site/scorecards/0123456789ab', '/internal/v1/site/officials?role=judge&q=cheek',
    '/internal/v1/site/officials/0123456789ab', '/internal/v1/site/market-index', '/internal/v1/site/videos?type=weigh_in', '/internal/v1/site/promoters',
    '/internal/v1/site/promoters/matchroom-boxing-promotions', '/internal/v1/site/fighters/0123456789ab/context', '/internal/v1/site/bouts/0123456789ab/context',
    "/internal/v1/site/hall-of-fame?category=Men's%20Modern%20Boxers&year=2020", '/internal/v1/site/eras', '/internal/v1/site/wire?limit=10'];
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
    '/internal/v1/rankings?organization=wbc&weight_class=welterweight&gender=x', '/internal/v1/fighters/Canelo%20Alvarez',
    '/internal/v1/site/fighters/andy-ruiz', '/internal/v1/site/bouts/pbe_boxbout_0123456789ab', '/internal/v1/site/events?scope=everything',
    '/internal/v1/site/events?limit=1000', '/internal/v1/site/fighters?q=x', '/internal/v1/site/home?today=13-09-2026', '/internal/v1/site/titles?weight_class=Welter%20weight',
    '/internal/v1/site/scorecards?decision=robbery', '/internal/v1/site/scorecards?sort=controversy', '/internal/v1/site/officials', '/internal/v1/site/officials?role=promoter',
    '/internal/v1/site/videos?type=leak', '/internal/v1/site/promoters/Top%20Rank', '/internal/v1/site/officials/eric-cheek']) {
    assert.equal((await w.fetch(req(p), env)).status, 400, p);
  }
  assert.equal(touched, 0, 'display names are never used to look up a fighter');
  assert.equal((await w.fetch(req(`/internal/v1/bouts/${ID}`), env)).status, 404);
});

test('site titles carry the four lanes and site rankings carry body-native rankings, internal ids stripped', async () => {
  const { store } = fakeStore();
  const w = createWorker({ makeStore: () => store });
  const titles = (await (await w.fetch(req('/internal/v1/site/titles?weight_class=welterweight'), env)).json()).data;
  assert.equal(titles.lanes.lanes[0].state, 'not_licensed');
  assert.equal(titles.lanes.lanes[0].claims_by_other_bodies[0].by, 'wba');
  assert.equal(titles.lanes.derived.status, 'not_derivable');
  assert.equal(titles.lanes.lanes[1].documents[0].belts[0].holder.fighter, 'pbe_boxer_a');
  assert.ok(!JSON.stringify(titles).includes(ID), 'no canonical uuid reaches the site payload');
  const none = (await (await w.fetch(req('/internal/v1/site/titles'), env)).json()).data;
  assert.equal(none.lanes, null);
  const wbc = (await (await w.fetch(req('/internal/v1/site/rankings?organization=wbc&weight_class=welterweight'), env)).json()).data;
  assert.deepEqual(wbc.body, { organization: 'wbc', state: 'not_licensed' });
  const ibf = (await (await w.fetch(req('/internal/v1/site/rankings?organization=ibf&weight_class=welterweight'), env)).json()).data;
  assert.equal(ibf.body.snapshot.entries[0].metadata.not_rated, true);
  assert.ok(!JSON.stringify(ibf).includes(ID));
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

// ---------------------------------------------------------------------------
// Market data rights: The Odds API data may be displayed and summarized
// first-party but never redistributed as a raw feed.
// ---------------------------------------------------------------------------

test('rights: no route can serve bulk, raw, historical or downloadable market data', async () => {
  const { FORBIDDEN_ROUTE_TERMS, RAW_MARKET_STORE_METHODS, MARKET_DATA_RIGHTS } = await import('./routes.mjs');
  for (const r of ROUTES) {
    for (const term of FORBIDDEN_ROUTE_TERMS) assert.ok(!r.path.toLowerCase().includes(term), `${r.path} contains "${term}"`);
  }
  for (const m of RAW_MARKET_STORE_METHODS) assert.ok(!READ_METHODS.includes(m), `gateway must not reach ${m}`);
  const oddsRoutes = ROUTES.filter((r) => /odds|market|price/i.test(r.path + r.summary));
  assert.deepEqual(oddsRoutes.map((r) => r.path), ['/internal/v1/bouts/:id/odds-summary', '/internal/v1/site/bouts/:ref', '/internal/v1/site/market-index'], 'market prices are only served per bout');
  assert.ok(oddsRoutes.filter((r) => r.path !== '/internal/v1/site/market-index').every((r) => /\/bouts\/:(id|ref)(\/|$)/.test(r.path)), 'every price-bearing route addresses exactly one bout');
  assert.ok(Object.keys(oddsRoutes[0].query ?? {}).length === 0, 'no paging/limit/range parameters on market data');
  assert.deepEqual(contractDocument().market_data_rights, MARKET_DATA_RIGHTS);
});

test('rights: odds-summary whitelists summarized fields even if storage returns raw ones', async () => {
  const store = {
    gatewayOddsSummary: async (id) => ({
      bout_id: id,
      raw_payload: [{ bookmakers: [] }],
      ticks: [{ id: 1, american_odds: -150 }],
      consensus: [{ market_key: 'moneyline|fight|-|pre', selection_key: 'fighter_a', consensus_implied: 0.6, bookmaker_count: 3, raw_price: { price: -150 }, observation_id: 'obs' }],
      selections: [
        { market_key: 'moneyline|fight|-|pre', bookmaker: 'book1', selection_key: 'fighter_a', current_american: -150, opening_american: -130, freshness: 'fresh',
          latest_at: '2026-09-13T10:00:00Z', provider: 'the_odds_api', provider_event_id: 'evt-secret', raw_price: { price: -150 }, tick_count: 40, observation_id: 'obs-1' },
        { market_key: 'moneyline|fight|-|pre', bookmaker: 'book2', selection_key: 'fighter_a', current_american: -140, freshness: 'fresh', latest_at: '2026-09-13T10:01:00Z' },
        { market_key: 'moneyline|fight|-|pre', bookmaker: 'book3', selection_key: 'fighter_a', current_american: null, freshness: 'stale' },
      ],
      fair_prices: [],
    }),
  };
  const w = createWorker({ makeStore: () => store });
  const body = await (await w.fetch(req(`/internal/v1/bouts/${ID}/odds-summary`), env)).json();
  const text = JSON.stringify(body);
  for (const leaked of ['raw_payload', 'ticks', 'raw_price', 'observation', 'provider_event_id', 'evt-secret', 'tick_count', '"provider"']) {
    assert.ok(!text.includes(leaked), `leaked ${leaked}`);
  }
  assert.deepEqual(body.data.best_prices, [{ market_key: 'moneyline|fight|-|pre', selection_key: 'fighter_a', best_american: -140, bookmaker: 'book2', latest_at: '2026-09-13T10:01:00Z' }]);
  assert.equal(body.data.selections[0].opening_american, -130);
  assert.match(body.data.rights.prohibited, /raw redistribution/);
});

test('site bout strips the internal bout id and attaches only the summarized one-bout market', async () => {
  const { store } = fakeStore();
  const w = createWorker({ makeStore: () => store });
  const body = await (await w.fetch(req('/internal/v1/site/bouts/0123456789ab'), env)).json();
  assert.equal(body.data.internal_bout_id, undefined);
  assert.ok(!JSON.stringify(body).includes(ID), 'no internal uuid in the site payload');
  assert.ok(body.data.market && Array.isArray(body.data.market.consensus) && body.data.market.rights);
  assert.equal(body.data.market.bout_id, undefined);
});

test('site title maps and ranking snapshots keep public ids only', async () => {
  const { stripInternalIds } = await import('./routes.mjs');
  const out = stripInternalIds({ organizations: [{ organization_slug: 'wbc', belts: [{ title_id: ID, public_id: 'pbe_boxtitle_x', holder: { fighter_id: ID, public_id: 'pbe_boxer_y', display_name: 'A' } }] }],
    entries: [{ rank: 1, fighter_id: ID, public_id: 'pbe_boxer_z' }], snapshot_id: ID, id: ID });
  assert.ok(!JSON.stringify(out).includes(ID));
  assert.equal(out.organizations[0].belts[0].holder.public_id, 'pbe_boxer_y');
  assert.equal(out.entries[0].public_id, 'pbe_boxer_z');
});

test('site market index is a whitelisted index: no prices, bookmakers or provider ids pass through', async () => {
  const { store } = fakeStore();
  const w = createWorker({ makeStore: () => store });
  const body = await (await w.fetch(req('/internal/v1/site/market-index'), env)).json();
  assert.equal(body.data.captured_upcoming_events, 42);
  assert.equal(body.data.provider_event_ids, undefined);
  assert.equal(body.data.quotes, undefined);
  assert.doesNotMatch(JSON.stringify(body), /american|bookmaker|draftkings|provider_event/);
  assert.equal(body.data.matched[0].public_id, 'pbe_boxbout_x');
});
