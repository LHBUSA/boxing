// boxing-gateway route table: the single source for the Worker and for
// contracts/boxing-gateway.v1.json (a test keeps the two identical).
// Every route is GET and reads through READ_METHODS only.

import { buildTitleMap } from '../../../shared/titles/title-map.mjs';

export const API_VERSION = 'boxing-gateway@1';

export const READ_METHODS = Object.freeze([
  'getFighter', 'fighterDnaLatest', 'cardState', 'gatewayBout', 'gatewayMatchup', 'gatewayOddsSummary', 'gatewayModels',
  'titleSummary', 'titleReigns', 'titleMapFacts', 'rankingSnapshotAsOf', 'gatewayOfficial', 'officialDnaLatest',
  'siteHome', 'siteEvents', 'siteEvent', 'siteBout', 'siteFighters', 'siteFighter', 'siteTitleBoard', 'siteRankingBoard', 'siteTitleLanes', 'siteBodyRankings', 'truthIndex', 'truthEvent', 'truthBout', 'siteCoverage',
  'siteScorecards', 'siteScorecard', 'siteOfficials', 'siteOfficial', 'siteMarketIndex', 'siteVideos', 'sitePromoters', 'sitePromoter',
  'siteFighterContext', 'siteBoutContext', 'siteHallOfFame', 'siteHistory', 'siteWire',
  'archiveIndex', 'archiveCard', 'archiveDivision', 'archiveMeetings', 'fighterPassport', 'sourceRegistry',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9_]{2,40}$/;
const SITE_REF = /^[0-9a-f]{12,32}$/;
const SITE_SCOPES = ['upcoming', 'results', 'all'];
const DECISIONS = ['unanimous', 'split', 'majority', 'draw'];
const VIDEO_TYPES = ['announcement', 'trailer_promo', 'grand_arrival', 'media_day', 'open_workout', 'media_workout', 'press_conference', 'interview', 'faceoff', 'weigh_in',
  'ceremonial_weigh_in', 'fight_preview', 'full_fight', 'replay', 'highlights', 'knockout', 'post_fight_interview', 'post_fight_press_conference', 'analysis', 'documentary_feature', 'other'];
const PROMOTER_KEY = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
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

// Market index: counts and matched canonical bouts only. Whitelisted so no
// price, bookmaker or provider identifier can ride along if the SQL grows.
const MARKET_INDEX_FIELDS = ['captured_upcoming_events', 'captured_events_total', 'next_captured_start', 'captured_by_week', 'unmatched_open',
  'unmatched_reasons', 'last_capture_at', 'captures_last_7_days'];
const MATCHED_BOUT_FIELDS = ['public_id', 'order', 'status', 'scheduled_rounds', 'weight', 'a', 'b', 'result', 'titles', 'market_matched', 'event', 'starts_at'];
export function siteMarketIndex(index) {
  if (!index) return null;
  return { ...pick(index, MARKET_INDEX_FIELDS), matched: (index.matched ?? []).map((m) => pick(m, MATCHED_BOUT_FIELDS)) };
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
    path: '/internal/v1/site/truth', summary: 'Event truth index (investigator): graph counts, change-ledger counts by type, graph assertions, recent events.',
    query: { limit: '1..200 recent events, default 60' },
    handler: async (s, _p, q) => s.truthIndex(intIn(q, 'limit', 60, 1, 200)),
  },
  {
    path: '/internal/v1/site/truth/events/:ref', summary: 'Event truth (investigator): event, source identities, organizations, every bout with corners (including replaced), current result and counts, card history, change ledger; each lane with its source.',
    params: { ref: 'hex suffix of the event public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad event ref'); return s.truthEvent(ref); },
  },
  {
    path: '/internal/v1/site/truth/bouts/:ref', summary: 'Bout truth (investigator): corners with source identities and appearance decisions, titles and each sanctioning body’s own statement, every result and scorecard revision, officials, weigh-ins, regulatory actions, card history, change ledger, news; each lane with its source.',
    params: { ref: 'hex suffix of the bout public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad bout ref'); return s.truthBout(ref); },
  },
  {
    path: '/internal/v1/site/archive', summary: 'Global boxing history index: rule versions, the result-class ontology, archive assertions, registered jurisdictions, registry counts and what is on record.',
    handler: async (s) => s.archiveIndex(),
  },
  {
    path: '/internal/v1/site/archive/sources', summary: 'Source and provenance registry: per source, the rights review, every data lane with availability, rights scope, jurisdiction, coverage, acquisition, cadence, completeness and confidence, plus stored coverage and parser lineage.',
    query: { source_key: 'one registered source key (optional)' },
    handler: async (s, _p, q) => {
      const key = q.get('source_key');
      need(key == null || SLUG.test(key), 'bad source_key');
      return s.sourceRegistry(key ?? null);
    },
  },
  {
    path: '/internal/v1/site/archive/cards/:ref', summary: 'Historical card: the event, venue and commission with jurisdiction, every bout in sheet order with corners, weights against the class limit in force, the classified result with the source text kept, judges'
      + ' cards checked against the stated decision, officials, deductions, knockdown lane state, titles linked and as printed, provenance per lane, and PropBetEdge-derived card statistics.',
    params: { ref: 'hex suffix of the event public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad event ref'); return s.archiveCard(ref); },
  },
  {
    path: '/internal/v1/site/archive/divisions/:key', summary: 'Division history: class definitions with their basis, each body’s native labels, each body’s own month-by-month statements collapsed into runs, title bouts on record and bouts by year.',
    params: { key: 'weight class key (e.g. super_welterweight)' },
    query: { gender: 'male | female, default male', from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' },
    handler: async (s, { key }, q) => {
      need(SLUG.test(key), 'bad weight class key');
      const from = q.get('from');
      const to = q.get('to');
      need(from == null || DATE.test(from), 'from must be YYYY-MM-DD');
      need(to == null || DATE.test(to), 'to must be YYYY-MM-DD');
      return s.archiveDivision(key, gender(q), from ?? null, to ?? null);
    },
  },
  {
    path: '/internal/v1/site/archive/meetings/:a/:b', summary: 'Two fighters: every meeting on record and their common opponents with each result, joined by canonical id only.',
    params: { a: 'hex suffix of a fighter public id (12..32)', b: 'hex suffix of a fighter public id (12..32)' },
    handler: async (s, { a, b }) => { need(SITE_REF.test(a) && SITE_REF.test(b), 'bad fighter ref'); return s.archiveMeetings(a, b); },
  },
  {
    path: '/internal/v1/site/passport/:ref', summary: 'Fighter passport: canonical id, every name with its kind and source, source ids, sourced attributes, the record derived from bouts on record (with its coverage basis), bouts, divisions, titles, opponents, officials faced and geography; as-of reconstruction supported.',
    params: { ref: 'hex suffix of the fighter public id (12..32)' },
    query: { as_of: 'YYYY-MM-DD: reconstruct the passport as it stood before this date' },
    handler: async (s, { ref }, q) => {
      need(SITE_REF.test(ref), 'bad fighter ref');
      const d = q.get('as_of');
      need(d == null || DATE.test(d), 'as_of must be YYYY-MM-DD');
      return s.fighterPassport(ref, d ?? null);
    },
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
    path: '/internal/v1/site/titles', summary: 'Site Title Map: divisions, sanctioning bodies with source review state, the division title map, and the four body lanes (WBC | WBA | IBF | WBO: each body document with freshness, intra-body conflicts, claims made by other bodies kept apart, derived undisputed state) when a division is requested.',
    query: { weight_class: 'class key (optional)', gender: 'male | female', as_of: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => {
      const wc = q.get('weight_class');
      need(wc == null || SLUG.test(wc), 'bad weight_class');
      const board = await s.siteTitleBoard();
      if (!wc) return { board, map: null, lanes: null };
      const [facts, lanes] = await Promise.all([s.titleMapFacts(wc, gender(q), asOf(q)), s.siteTitleLanes(wc, gender(q))]);
      return { board, map: stripInternalIds(buildTitleMap(facts)), lanes: stripInternalIds(lanes) };
    },
  },
  {
    path: '/internal/v1/site/rankings', summary: 'Site rankings: sanctioning bodies with source review state, stored snapshot index, and one body-native ranking (licence state, champions listed above the numbered list, source record, previous snapshot, history) when requested.',
    query: { organization: 'slug (optional)', weight_class: 'class key (optional)', gender: 'male | female', as_of: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => {
      const org = q.get('organization');
      const wc = q.get('weight_class');
      need((org == null || SLUG.test(org)) && (wc == null || SLUG.test(wc)), 'bad organization or weight_class');
      const board = await s.siteRankingBoard();
      if (!(org && wc)) return { board, snapshot: null, body: null };
      const [snapshot, body] = await Promise.all([s.rankingSnapshotAsOf(org, wc, gender(q), asOf(q)), s.siteBodyRankings(org, wc, gender(q), asOf(q))]);
      return { board, snapshot: stripInternalIds(snapshot), body: stripInternalIds(body) };
    },
  },
  {
    path: '/internal/v1/site/scorecards', summary: 'Scorecard Center: decisions with official judges\' cards, filterable by decision type and commission, sortable by card spread.',
    query: { decision: 'unanimous | split | majority | draw', commission: 'commission slug', sort: 'recent | spread', limit: '1..100, default 40', offset: '0..10000' },
    handler: async (s, _p, q) => {
      const decision = q.get('decision');
      need(decision == null || DECISIONS.includes(decision), 'decision must be unanimous, split, majority or draw');
      const commission = q.get('commission');
      need(commission == null || /^[a-z0-9-]{2,40}$/.test(commission), 'bad commission slug');
      const sort = q.get('sort') ?? 'recent';
      need(['recent', 'spread'].includes(sort), 'sort must be recent or spread');
      return s.siteScorecards(decision, commission, sort, intIn(q, 'limit', 40, 1, 100), intIn(q, 'offset', 0, 0, 10000));
    },
  },
  {
    path: '/internal/v1/site/scorecards/:ref', summary: 'One decision: judges\' cards (and round cards when published), spread, deductions, result revisions, card provenance, judges\' sample context.',
    params: { ref: 'hex suffix of the bout public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad bout ref'); return s.siteScorecard(ref); },
  },
  {
    path: '/internal/v1/site/officials', summary: 'Judge or referee directory with assignments, cards and headline descriptive metrics (with samples).',
    query: { role: 'judge | referee (required)', q: 'name search (2..60 chars)', limit: '1..120, default 60', offset: '0..10000' },
    handler: async (s, _p, q) => {
      const role = q.get('role');
      need(['judge', 'referee'].includes(role), 'role must be judge or referee');
      const term = q.get('q');
      need(term == null || (term.length >= 2 && term.length <= 60), 'q must be 2..60 characters');
      return s.siteOfficials(role, term, intIn(q, 'limit', 60, 1, 120), intIn(q, 'offset', 0, 0, 10000));
    },
  },
  {
    path: '/internal/v1/site/officials/:ref', summary: 'Official profile: roles, jurisdictions, Judge/Referee DNA with samples, assignments with the full panel and results.',
    params: { ref: 'hex suffix of the official public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad official ref'); return s.siteOfficial(ref); },
  },
  {
    path: '/internal/v1/site/market-index', summary: 'Odds Terminal index: capture coverage counts and the canonical bouts that have a verified market match. No prices; prices come from the one-bout summary.',
    query: { today: 'YYYY-MM-DD' },
    handler: async (s, _p, q) => { const d = q.get('today') ?? today(); need(DATE.test(d), 'today must be YYYY-MM-DD'); return siteMarketIndex(await s.siteMarketIndex(d)); },
  },
  {
    path: '/internal/v1/site/videos', summary: 'Official Video Desk: channel registry states and published videos from enabled, verified, rights-approved channels.',
    query: { type: 'video type', limit: '1..60, default 24' },
    handler: async (s, _p, q) => {
      const type = q.get('type');
      need(type == null || VIDEO_TYPES.includes(type), 'bad video type');
      return s.siteVideos(type, intIn(q, 'limit', 24, 1, 60));
    },
  },
  {
    path: '/internal/v1/site/promoters', summary: 'Promoters exactly as listed on official commission sheets (not canonical entities; no inferred affiliation).',
    handler: async (s) => s.sitePromoters(),
  },
  {
    path: '/internal/v1/site/promoters/:key', summary: 'One listed promoter: its sheet cards, co-listed promoters, venues and fighters appearing on those cards.',
    params: { key: 'normalized promoter listing key' },
    handler: async (s, { key }) => { need(PROMOTER_KEY.test(key), 'bad promoter key'); return s.sitePromoter(key); },
  },
  {
    path: '/internal/v1/site/fighters/:ref/context', summary: 'Fighter context: sourced biography (age from an identity-proven Wikidata date of birth, nationality, height), Wikidata/Wikipedia links, Hall of Fame inductions, promoter appearances (cards listing a promoter; not affiliation).',
    params: { ref: 'hex suffix of the fighter public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad fighter ref'); return s.siteFighterContext(ref); },
  },
  {
    path: '/internal/v1/site/bouts/:ref/context', summary: 'Bout context: both corners sourced tale of the tape, previous meetings on record, assigned officials with DNA samples.',
    params: { ref: 'hex suffix of the bout public id (12..32)' },
    handler: async (s, { ref }) => { need(SITE_REF.test(ref), 'bad bout ref'); return s.siteBoutContext(ref); },
  },
  {
    path: '/internal/v1/site/hall-of-fame', summary: 'Hall of Fame: recognized institutions and their source-native induction records (never a PropBetEdge Hall).',
    query: { category: 'institution category label', year: 'induction year', limit: '1..600', offset: '>=0' },
    handler: async (s, _p, q) => {
      const year = q.get('year') ? Number(q.get('year')) : null;
      need(year == null || (Number.isInteger(year) && year > 1900 && year < 2100), 'bad year');
      const category = q.get('category');
      need(category == null || (category.length <= 80 && /^[A-Za-z' -]+$/.test(category)), 'bad category');
      return s.siteHallOfFame(category, year, intIn(q, 'limit', 120, 1, 600), intIn(q, 'offset', 0, 0, 100000));
    },
  },
  {
    path: '/internal/v1/site/eras', summary: 'History by decade: verified cards and bouts on record, Hall of Fame classes, title reigns on record.',
    handler: async (s) => s.siteHistory(),
  },
  {
    path: '/internal/v1/site/wire', summary: 'Verified record wire: official results, posted scorecards, missed weight, recent card changes.',
    query: { limit: '1..120' },
    handler: async (s, _p, q) => s.siteWire(intIn(q, 'limit', 40, 1, 120)),
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
