// boxing-gateway route table: the single source for the Worker and for
// contracts/boxing-gateway.v1.json (a test keeps the two identical).
// Every route is GET and reads through READ_METHODS only.

import { buildTitleMap } from '../../../shared/titles/title-map.mjs';

export const API_VERSION = 'boxing-gateway@1';

export const READ_METHODS = Object.freeze([
  'getFighter', 'fighterDnaLatest', 'cardState', 'gatewayBout', 'gatewayMatchup', 'gatewayOddsSummary', 'gatewayModels',
  'titleSummary', 'titleReigns', 'titleMapFacts', 'rankingSnapshotAsOf', 'gatewayOfficial', 'officialDnaLatest',
  'siteHome', 'siteEvents', 'siteEvent', 'siteBout', 'siteFighters', 'siteFighter', 'siteTitleBoard', 'siteRankingBoard', 'siteCoverage',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9_]{2,40}$/;
const SITE_REF = /^[0-9a-f]{12,32}$/;
const SITE_SCOPES = ['upcoming', 'results', 'all'];
const intIn = (q, key, def, min, max) => {
  const n = Number(q.get(key) ?? def);
  need(Number.isInteger(n) && n >= min && n <= max, `${key} must be ${min}..${max}`);
  return n;
};
const FIGHTER_REF = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|pbe_boxer_[A-Za-z0-9_]{1,40}|[a-z0-9_]{2,40}:[^/\s]{1,120})$/;

export class BadRequest extends Error {}
const need = (ok, detail) => { if (!ok) throw new BadRequest(detail); };
const today = () => new Date().toISOString().slice(0, 10);
const gender = (q) => { const g = q.get('gender') ?? 'male'; need(['male', 'female'].includes(g), 'gender must be male or female'); return g; };
const asOf = (q) => { const d = q.get('as_of') ?? today(); need(DATE.test(d), 'as_of must be YYYY-MM-DD'); return d; };

const DERIVED = 'PropBetEdge-derived';
const OFFICIAL_NOTE = 'Descriptive statistics computed from stored official records, each with its sample size. They describe past assignments only.';

// ---------------------------------------------------------------------------
// Market data rights boundary. The Odds API permits first-party display and
// derived values but prohibits redistributing its data as a raw feed/API. The
// gateway therefore serves ONE bout at a time, whitelists summarized fields,
// and never exposes tick history, raw prices, provider payloads or provider
// event ids. Enforced by workers/boxing-gateway/src/index.test.mjs.
// ---------------------------------------------------------------------------
export const MARKET_DATA_RIGHTS = Object.freeze({
  sources: ['the_odds_api'],
  permitted: 'first-party summarized display and PropBetEdge-derived values, one bout per request',
  prohibited: 'raw redistribution: bulk/list endpoints, tick history, raw payloads, downloadable files, passthrough of provider feeds',
});
export const FORBIDDEN_ROUTE_TERMS = Object.freeze(['tick', 'raw', 'export', 'download', 'dump', 'bulk', 'feed', 'quotes', 'observation', 'history', 'provider', 'passthrough', 'csv']);
export const RAW_MARKET_STORE_METHODS = Object.freeze(['tickHistory', 'selectionPrices', 'consensus', 'recordObservation', 'ingestProviderQuotes',
  'recordProviderCapture', 'providerCoverage', 'oddsScheduleState', 'ingestMarketSnapshot']);

const pick = (row, keys) => Object.fromEntries(keys.filter((k) => k in (row ?? {})).map((k) => [k, row[k]]));
const SELECTION_FIELDS = ['market_key', 'market_type', 'line', 'is_live', 'bookmaker', 'selection_key', 'fighter_id', 'opening_american', 'opening_at',
  'current_american', 'current_implied', 'latest_at', 'closing_american', 'closing_at', 'freshness'];
const CONSENSUS_FIELDS = ['market_type', 'market_key', 'selection_key', 'bookmaker_count', 'stale_bookmaker_count', 'min_american', 'max_american',
  'min_implied', 'max_implied', 'implied_dispersion', 'consensus_implied', 'newest_price_at'];
const FAIR_FIELDS = ['model_key', 'model_version', 'selection_key', 'probability', 'fair_decimal', 'fair_american', 'input_cutoff', 'generated_at'];

export function summarizeOdds(summary) {
  if (!summary) return null;
  const selections = (summary.selections ?? []).map((r) => pick(r, SELECTION_FIELDS));
  const best = new Map();
  for (const r of selections) {
    if (r.current_american == null) continue;
    const k = `${r.market_key}|${r.selection_key}`;
    if (!best.has(k) || r.current_american > best.get(k).best_american) {
      best.set(k, { market_key: r.market_key, selection_key: r.selection_key, best_american: r.current_american, bookmaker: r.bookmaker, latest_at: r.latest_at });
    }
  }
  return {
    bout_id: summary.bout_id,
    rights: { ...MARKET_DATA_RIGHTS, attribution: 'Prices: bookmaker odds via The Odds API (attribution not required by provider terms).' },
    consensus: (summary.consensus ?? []).map((r) => pick(r, CONSENSUS_FIELDS)),
    best_prices: [...best.values()],
    selections,
    fair_prices: (summary.fair_prices ?? []).map((r) => pick(r, FAIR_FIELDS)),
  };
}

// ---------------------------------------------------------------------------
// Site read contract (consumer frontend). Fixed-field projections built in SQL
// (migration 0020); refs are the hex suffix of a public id. Payloads never carry
// DOB, hometowns, identity evidence, reviewer names, provider ids or prices;
// market prices appear only through the one-bout summary below.
// ---------------------------------------------------------------------------
export const SITE_FORBIDDEN_KEYS = Object.freeze(['dob', 'hometown', 'evidence', 'reviewer', 'reviewed_by', 'decided_by', 'review_batch', 'raw_dob',
  'federal_id', 'license_number', 'medical', 'suspensions', 'source_record', 'payload', 'external_id', 'provider_event_id', 'internal_bout_id', 'candidates']);

// Title maps and ranking snapshots are shared with the internal routes, which
// carry canonical uuids; site payloads keep only public ids.
export function stripInternalIds(value) {
  if (Array.isArray(value)) return value.map(stripInternalIds);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([k]) => k === 'public_id' || !(k === 'id' || k.endsWith('_id')))
    .map(([k, v]) => [k, stripInternalIds(v)]));
}

async function siteBout(s, ref) {
  const data = await s.siteBout(ref);
  if (!data) return null;
  const { internal_bout_id: boutId, ...rest } = data;
  const market = rest.bout?.market_matched && boutId ? summarizeOdds(await s.gatewayOddsSummary(boutId)) : null;
  if (market) delete market.bout_id;
  return { ...rest, market };
}

const SITE_ROUTES = [
  {
    path: '/internal/v1/site/home', summary: 'Site home: upcoming and recent cards, latest results, scorecard watch, one Fight DNA feature, coverage.',
    query: { today: 'YYYY-MM-DD (default today, UTC)' },
    handler: async (s, _p, q) => { const d = q.get('today') ?? today(); need(DATE.test(d), 'today must be YYYY-MM-DD'); return s.siteHome(d); },
  },
  {
    path: '/internal/v1/site/events', summary: 'Site event directory page (upcoming | results | all), optional commission filter.',
    query: { scope: 'upcoming | results | all', commission: 'commission slug', limit: '1..100, default 40', offset: '0..10000', today: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => {
      const scope = q.get('scope') ?? 'all';
      need(SITE_SCOPES.includes(scope), 'scope must be upcoming, results or all');
      const commission = q.get('commission');
      need(commission == null || /^[a-z0-9-]{2,40}$/.test(commission), 'bad commission slug');
      const d = q.get('today') ?? today();
      need(DATE.test(d), 'today must be YYYY-MM-DD');
      return s.siteEvents(scope, commission, intIn(q, 'limit', 40, 1, 100), intIn(q, 'offset', 0, 0, 10000), d);
    },
  },
  {
    path: '/internal/v1/site/events/:ref', summary: 'Site event: summary, card in official sheet order, card-change counts, same-weekend cards.',
    params: { ref: 'hex suffix of the event public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad event ref'); return s.siteEvent(ref); },
  },
  {
    path: '/internal/v1/site/bouts/:ref', summary: 'Site bout: corners with verified record entering and current Fight DNA, result revisions, scorecards, card, and the one-bout market summary when matched.',
    params: { ref: 'hex suffix of the bout public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad bout ref'); return siteBout(s, ref); },
  },
  {
    path: '/internal/v1/site/fighters', summary: 'Site fighter directory page with verified records; optional name search.',
    query: { q: 'name search (2..60 chars)', limit: '1..100, default 50', offset: '0..10000' },
    handler: async (s, _p, q) => {
      const term = q.get('q');
      need(term == null || (term.length >= 2 && term.length <= 60), 'q must be 2..60 characters');
      return s.siteFighters(term, intIn(q, 'limit', 50, 1, 100), intIn(q, 'offset', 0, 0, 10000));
    },
  },
  {
    path: '/internal/v1/site/fighters/:ref', summary: 'Site fighter dossier: verified record, verified bouts, current Fight DNA (or a redirect for merged records).',
    params: { ref: 'hex suffix of the fighter public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad fighter ref'); return s.siteFighter(ref); },
  },
  {
    path: '/internal/v1/site/titles', summary: 'Site Title Map: divisions, sanctioning bodies with source review state, and the division title map when requested.',
    query: { weight_class: 'class key (optional)', gender: 'male | female', as_of: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => {
      const wc = q.get('weight_class');
      need(wc == null || SLUG.test(wc), 'bad weight_class');
      const board = await s.siteTitleBoard();
      return { board, map: wc ? stripInternalIds(buildTitleMap(await s.titleMapFacts(wc, gender(q), asOf(q)))) : null };
    },
  },
  {
    path: '/internal/v1/site/rankings', summary: 'Site rankings: sanctioning bodies with source review state, stored snapshot index, and one snapshot when requested.',
    query: { organization: 'slug (optional)', weight_class: 'class key (optional)', gender: 'male | female', as_of: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => {
      const org = q.get('organization');
      const wc = q.get('weight_class');
      need((org == null || SLUG.test(org)) && (wc == null || SLUG.test(wc)), 'bad organization or weight_class');
      const board = await s.siteRankingBoard();
      const snapshot = org && wc ? stripInternalIds(await s.rankingSnapshotAsOf(org, wc, gender(q), asOf(q))) : null;
      return { board, snapshot };
    },
  },
  {
    path: '/internal/v1/site/coverage', summary: 'Site coverage counts: what is on verified record and what is still pending.',
    query: { today: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => { const d = q.get('today') ?? today(); need(DATE.test(d), 'today must be YYYY-MM-DD'); return s.siteCoverage(d); },
  },
];

export const ROUTES = [
  {
    path: '/internal/v1/fighters/:ref', summary: 'Canonical fighter: profile, identities, aliases, attribute claims.',
    params: { ref: 'uuid | pbe_boxer_* public id | namespace:external_id' },
    handler: async (s, { ref }) => { need(FIGHTER_REF.test(ref), 'bad fighter ref'); return s.getFighter(ref); },
  },
  {
    path: '/internal/v1/fighters/:ref/dna', summary: 'Latest Fight DNA snapshot per metric key and version (canonical fighter).',
    params: { ref: 'uuid | pbe_boxer_* public id | namespace:external_id' },
    handler: async (s, { ref }) => {
      need(FIGHTER_REF.test(ref), 'bad fighter ref');
      const f = await s.getFighter(ref);
      if (!f?.fighter) return null;
      return { fighter_id: f.fighter.id, public_id: f.fighter.public_id, label: DERIVED, metrics: await s.fighterDnaLatest(f.fighter.id) };
    },
  },
  {
    path: '/internal/v1/events/:id', summary: 'Event with its card: bouts, participants, titles and officials.',
    params: { id: 'uuid' },
    handler: async (s, { id }) => { need(UUID.test(id), 'bad event id'); return s.cardState(id); },
  },
  {
    path: '/internal/v1/bouts/:id', summary: 'Bout: event, corners (canonical ids), titles, current result, current scorecards, officials, weigh-ins.',
    params: { id: 'uuid' },
    handler: async (s, { id }) => { need(UUID.test(id), 'bad bout id'); return s.gatewayBout(id); },
  },
  {
    path: '/internal/v1/bouts/:id/matchup', summary: 'Immutable point-in-time matchup snapshots (newest cutoff first) and any registered model outputs.',
    params: { id: 'uuid' }, query: { limit: '1..50, default 5' },
    handler: async (s, { id }, q) => {
      need(UUID.test(id), 'bad bout id');
      const limit = Number(q.get('limit') ?? 5);
      need(Number.isInteger(limit) && limit >= 1 && limit <= 50, 'limit must be 1..50');
      const [m, models] = await Promise.all([s.gatewayMatchup(id, limit), s.gatewayModels()]);
      return m && { ...m, models };
    },
  },
  {
    path: '/internal/v1/bouts/:id/odds-summary', summary: 'One bout: summarized current prices per book with freshness, best price, opening/current comparison, consensus/dispersion, and fair prices from trained models (empty while untrained). Never raw provider ticks or payloads.',
    params: { id: 'uuid' },
    handler: async (s, { id }) => { need(UUID.test(id), 'bad bout id'); return summarizeOdds(await s.gatewayOddsSummary(id)); },
  },
  {
    path: '/internal/v1/titles/:id', summary: 'Title and its derived reign history.',
    params: { id: 'uuid' },
    handler: async (s, { id }) => {
      need(UUID.test(id), 'bad title id');
      const t = await s.titleSummary(id);
      return t && { title: t, reigns: await s.titleReigns(id) };
    },
  },
  {
    path: '/internal/v1/title-map', summary: 'Division title map as of a date (holders, undisputed status, rankings).',
    query: { weight_class: 'class key (required)', gender: 'male | female', as_of: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => {
      const wc = q.get('weight_class');
      need(wc && SLUG.test(wc), 'weight_class is required');
      return buildTitleMap(await s.titleMapFacts(wc, gender(q), asOf(q)));
    },
  },
  {
    path: '/internal/v1/rankings', summary: 'Ranking entries of the snapshot in force on a date.',
    query: { organization: 'slug (required)', weight_class: 'class key (required)', gender: 'male | female', as_of: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => {
      const org = q.get('organization');
      const wc = q.get('weight_class');
      need(org && SLUG.test(org) && wc && SLUG.test(wc), 'organization and weight_class are required');
      const g = gender(q);
      const d = asOf(q);
      return { organization: org, weight_class: wc, gender: g, as_of: d, snapshot: await s.rankingSnapshotAsOf(org, wc, g, d) };
    },
  },
  {
    path: '/internal/v1/officials/:id', summary: 'Official (canonical): profile, assignment counts, recent assignments.',
    params: { id: 'uuid' },
    handler: async (s, { id }) => { need(UUID.test(id), 'bad official id'); return s.gatewayOfficial(id); },
  },
  {
    path: '/internal/v1/officials/:id/dna', summary: 'Judge DNA and Referee DNA: descriptive, with sample sizes; small samples are null.',
    params: { id: 'uuid' },
    handler: async (s, { id }) => {
      need(UUID.test(id), 'bad official id');
      const o = await s.gatewayOfficial(id);
      if (!o) return null;
      const metrics = await s.officialDnaLatest(o.official.id);
      return {
        official_id: o.official.id, label: DERIVED, note: OFFICIAL_NOTE,
        judge: metrics.filter((m) => m.category === 'judge'), referee: metrics.filter((m) => m.category === 'referee'),
      };
    },
  },
  {
    path: '/internal/v1/models', summary: 'Model registry: versions, feature versions, training cutoffs, status (untrained models publish nothing).',
    handler: async (s) => s.gatewayModels(),
  },
  ...SITE_ROUTES,
];

export function matchRoute(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  for (const route of ROUTES) {
    const rp = route.path.split('/').filter(Boolean);
    if (rp.length !== parts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < rp.length && ok; i++) {
      if (rp[i].startsWith(':')) {
        try { params[rp[i].slice(1)] = decodeURIComponent(parts[i]); } catch { ok = false; }
      } else ok = rp[i] === parts[i];
    }
    if (ok) return { route, params };
  }
  return null;
}

export const contractDocument = () => ({
  api_version: API_VERSION,
  auth: 'Authorization: Bearer <BOXING_INTERNAL_TOKEN> (>= 32 chars) on every /internal route',
  methods: ['GET'],
  envelope: { api_version: 'string', generated_at: 'ISO-8601 timestamp', data: 'route payload' },
  errors: { 400: 'bad_request', 401: 'unauthorized', 404: 'not_found', 405: 'method_not_allowed (read-only)', 503: 'store_not_configured', 500: 'internal_error' },
  guarantees: [
    'read-only: the Worker can reach only the store methods listed in read_methods',
    'fighter and official ids in payloads are canonical (merged records resolve to the survivor)',
    'derived values are labelled PropBetEdge-derived, carry metric versions and sample sizes, and are null unless status is available',
    'matchup snapshots are immutable and never contain information from after their input_cutoff',
    'fair prices appear only from a trained or validated registered model',
    'market data: summarized, one bout per request, whitelisted fields; no tick history, raw payloads, provider ids, bulk lists or downloads (The Odds API prohibits raw redistribution)',
    'site routes are fixed-field projections: no DOB, stated hometowns, identity evidence, reviewer names, provider ids or prices outside the one-bout market summary',
  ],
  site_forbidden_keys: [...SITE_FORBIDDEN_KEYS],
  market_data_rights: MARKET_DATA_RIGHTS,
  read_methods: [...READ_METHODS],
  routes: ROUTES.map(({ path, summary, params = {}, query = {} }) => ({ method: 'GET', path, summary, params, query })),
});
