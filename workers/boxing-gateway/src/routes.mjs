// boxing-gateway route table: the single source for the Worker and for
// contracts/boxing-gateway.v1.json (a test keeps the two identical).
// Every route is GET and reads through READ_METHODS only.

import { buildTitleMap } from '../../../shared/titles/title-map.mjs';

export const API_VERSION = 'boxing-gateway@1';

export const READ_METHODS = Object.freeze([
  'getFighter', 'fighterDnaLatest', 'cardState', 'gatewayBout', 'gatewayMatchup', 'gatewayOddsSummary', 'gatewayModels',
  'titleSummary', 'titleReigns', 'titleMapFacts', 'rankingSnapshotAsOf', 'gatewayOfficial', 'officialDnaLatest',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9_]{2,40}$/;
const FIGHTER_REF = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|pbe_boxer_[A-Za-z0-9_]{1,40}|[a-z0-9_]{2,40}:[^/\s]{1,120})$/;

export class BadRequest extends Error {}
const need = (ok, detail) => { if (!ok) throw new BadRequest(detail); };
const today = () => new Date().toISOString().slice(0, 10);
const gender = (q) => { const g = q.get('gender') ?? 'male'; need(['male', 'female'].includes(g), 'gender must be male or female'); return g; };
const asOf = (q) => { const d = q.get('as_of') ?? today(); need(DATE.test(d), 'as_of must be YYYY-MM-DD'); return d; };

const DERIVED = 'PropBetEdge-derived';
const OFFICIAL_NOTE = 'Descriptive statistics computed from stored official records, each with its sample size. They describe past assignments only.';

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
    path: '/internal/v1/bouts/:id/odds-summary', summary: 'Stored market consensus, per-book selection prices with freshness, and fair prices from trained models (empty while untrained).',
    params: { id: 'uuid' },
    handler: async (s, { id }) => { need(UUID.test(id), 'bad bout id'); return s.gatewayOddsSummary(id); },
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
  ],
  read_methods: [...READ_METHODS],
  routes: ROUTES.map(({ path, summary, params = {}, query = {} }) => ({ method: 'GET', path, summary, params, query })),
});
