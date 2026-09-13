// Phase 2 site contract (migration 0022) against a real database: Scorecard
// Center, officials, market index, promoters as listed, the event timeline and
// the video registry gate. Synthetic official documents only.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runCommissionIngest } from '../../shared/commissions/run.mjs';
import { manualProvenance } from '../../shared/provenance.mjs';
import { SITE_FORBIDDEN_KEYS } from '../../workers/boxing-gateway/src/routes.mjs';
import {
  FLORIDA_BOUTS, FLORIDA_RESULTS_HTML, FLORIDA_UPCOMING_HTML, NEVADA_BOUTS, NEVADA_INDEX_HTML, decodePages, encodePages, floridaPages, nevadaCalendarIcs, nevadaPages,
} from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
let worker;
const TOKEN = 'p'.repeat(40);
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const site = new Map();
const fakeFetch = async (url) => (site.has(String(url)) ? new Response(site.get(String(url)), { status: 200 }) : new Response('nf', { status: 404 }));
const get = async (path) => {
  const res = await worker.fetch(new Request(`https://g.internal${path}`, { headers: { authorization: `Bearer ${TOKEN}` } }), { BOXING_INTERNAL_TOKEN: TOKEN });
  const text = await res.text();
  return { status: res.status, text, body: JSON.parse(text) };
};
const ref = (publicId) => publicId.slice(-32).slice(0, 12);
function forbidden(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => forbidden(v, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { if (SITE_FORBIDDEN_KEYS.includes(k)) out.push(k); forbidden(v, out); }
  return out;
}
function assertPrivate(res, label) {
  assert.deepEqual(forbidden(res.body), [], `${label}: forbidden keys`);
  assert.doesNotMatch(res.text, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, `${label}: internal uuid`);
  assert.doesNotMatch(res.text, /[A-Z]{2}-?[0-9]{5,8}|01\/02\/1990|Miami, FL|Las Vegas, NV"/, `${label}: private identifiers or hometowns`);
  assert.doesNotMatch(res.text, /robbery|corrupt|biased|bad judg|early stopper|fighter-friendly/i, `${label}: qualitative labels`);
}

before(async () => {
  db = await freshDatabase('site_phase2');
  store = pgStore(db.client);
  const { createWorker } = await import('../../workers/boxing-gateway/src/index.mjs');
  worker = createWorker({ makeStore: () => store });
  site.set('https://calendar.google.com/calendar/ical/kmvuar97kvumm2l7t9m6t4rpr0%40group.calendar.google.com/public/basic.ics', nevadaCalendarIcs([
    { uid: 'nv-1', dtstart: '20260906T030000Z', summary: 'PRO Boxing Event', location: 'Synthetic Garden Arena, 1 Synthetic Blvd, Las Vegas, NV 89109, USA', description: 'Synthetic Promotions will promote a professional boxing event.' },
  ]));
  site.set('https://boxing.nv.gov/results/2026_Results/', NEVADA_INDEX_HTML);
  site.set('https://boxing.nv.gov/uploadedFiles/boxingnvgov/content/results/2026_Results/09-05-26_Boxing_REDACTED.pdf', encodePages(nevadaPages({ bouts: NEVADA_BOUTS })));
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-upcoming-events-professional/', FLORIDA_UPCOMING_HTML);
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/', FLORIDA_RESULTS_HTML);
  site.set('https://www2.myfloridalicense.com/pro/sbc/documents/09-05-2026-Synthetic_Sunshine-Results_without_med.pdf', encodePages(floridaPages({ bouts: FLORIDA_BOUTS })));
  for (const adapterKey of ['nevada', 'florida']) {
    const r = await runCommissionIngest(store, { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' }, {
      adapterKey, fetchImpl: fakeFetch, now: '2026-09-13T12:00:00Z', extract: decodePages, mode: 'backfill', years: [2026],
      provenance: manualProvenance({ workerName: 'tests/db/17', runtime: 'node test', trigger: 'backfill' }) });
    assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  }
});
after(async () => { await db?.close(); });

test('Scorecard Center: decisions with official cards, oriented to corners, with spread and provenance', async () => {
  const list = await get('/internal/v1/site/scorecards?sort=spread');
  assert.equal(list.status, 200);
  assertPrivate(list, 'scorecards');
  const d = list.body.data;
  assert.equal(d.counts.all, 2, 'the unanimous decision and the majority draw carry cards');
  assert.equal(d.counts.draw, 1);
  const ud = d.rows.find((r) => r.kind === 'unanimous');
  assert.deepEqual(ud.scorecards.map((c) => [c.a_total, c.b_total]).sort(), [[110, 118], [111, 117], [112, 116]]);
  assert.equal(ud.spread, 4, 'widest margin minus narrowest (-8 vs -4)');
  assert.ok(ud.scorecards.every((c) => c.judge_public_id?.startsWith('pbe_boxofficial_')));
  const detail = await get(`/internal/v1/site/scorecards/${ref(ud.public_id)}`);
  assertPrivate(detail, 'scorecard');
  assert.equal(detail.body.data.judges.length, 3);
  assert.ok(detail.body.data.card_provenance.source_url.startsWith('https://boxing.nv.gov/'));
  assert.ok(detail.body.data.judges.every((j) => j.dna.every((m) => m.status !== 'available' || m.value !== undefined)));
  const filtered = await get('/internal/v1/site/scorecards?decision=split');
  assert.equal(filtered.body.data.total, 0);
});

test('officials: judge and referee universes, descriptive DNA with samples, assignments with the full panel', async () => {
  const judges = await get('/internal/v1/site/officials?role=judge');
  assertPrivate(judges, 'judges');
  assert.ok(judges.body.data.universe >= 3);
  const refs = await get('/internal/v1/site/officials?role=referee');
  assertPrivate(refs, 'referees');
  const refRow = refs.body.data.rows.find((r) => r.name === 'Robert Refone');
  assert.equal(refRow.assignments, 2);
  const profile = await get(`/internal/v1/site/officials/${ref(refRow.public_id)}`);
  assertPrivate(profile, 'official');
  const p = profile.body.data;
  assert.deepEqual(p.roles, { referee: 2 });
  assert.equal(p.refereed.length, 2);
  assert.equal(p.judged.length, 0);
  assert.ok(p.refereed.every((b) => b.referee_public_id === refRow.public_id));
  assert.equal((await get('/internal/v1/site/officials/000000000000')).status, 404);
});

test('market index: honest counts and no price, bookmaker or provider identifier', async () => {
  const m = await get('/internal/v1/site/market-index');
  assert.equal(m.status, 200);
  assertPrivate(m, 'market-index');
  assert.equal(m.body.data.captured_upcoming_events, 0);
  assert.deepEqual(m.body.data.matched, []);
  assert.doesNotMatch(m.text, /american|bookmaker|provider_event_id|quote/i);
});

test('promoters as listed on official sheets; no affiliation inferred', async () => {
  const list = await get('/internal/v1/site/promoters');
  assertPrivate(list, 'promoters');
  const row = list.body.data.rows.find((r) => r.name === 'Synthetic Sunshine Promotions');
  assert.ok(row && row.cards === 1);
  const detail = await get(`/internal/v1/site/promoters/${row.key}`);
  assertPrivate(detail, 'promoter');
  assert.deepEqual(detail.body.data.names, ['Synthetic Sunshine Promotions']);
  assert.ok(detail.body.data.fighters.every((f) => f.appearances >= 1 && !('affiliation' in f) && !('signed' in f)));
  assert.equal((await get('/internal/v1/site/promoters/top-rank')).status, 404, 'a famous name is not an entity unless an official sheet lists it');
});

test('video registry: a channel cannot be enabled without verified identity and an approved named review; only enabled published videos surface', async () => {
  await expectPgError(() => q(`insert into public.boxing_video_channels (channel_id, name, source_class, identity_state, rights_state, enabled)
    values ('UC0123456789abcdefghijkl', 'Synthetic Promotions', 'promoter_official', 'verified', 'review_required', true)`), { code: '23514' });
  await q(`insert into public.boxing_video_channels (channel_id, name, source_class, identity_state, rights_state, enabled)
    values ('UC0123456789abcdefghijkl', 'Synthetic Promotions', 'promoter_official', 'verified', 'review_required', false)`);
  const ev = await one(`select e.id, e.public_id from public.boxing_events e where e.status = 'complete' and exists (select 1 from public.boxing_bouts b where b.event_id = e.id) limit 1`);
  const v = await one(`insert into public.boxing_videos (provider_video_id, channel_id, title, published_at, video_type, link_status, resolver_confidence, embeddable)
    values ('abcdefghijk', 'UC0123456789abcdefghijkl', 'Final Press Conference', '2026-09-03T00:00:00Z', 'press_conference', 'published', 'medium', true) returning id`);
  await q(`insert into public.boxing_video_links (video_id, entity_type, event_id, method, confidence) values ($1, 'event', $2, 'venue_named_in_title', 'medium')`, [v.id, ev.id]);
  let desk = await get('/internal/v1/site/videos');
  assert.equal(desk.body.data.published, 0, 'a review_required channel publishes nothing');
  let evRes = await get(`/internal/v1/site/events/${ref(ev.public_id)}`);
  assert.deepEqual(evRes.body.data.timeline.videos, []);

  await q(`update public.boxing_video_channels set rights_state = 'approved', reviewed_by = 'Test Reviewer', reviewed_at = now(), enabled = true where channel_id = 'UC0123456789abcdefghijkl'`);
  desk = await get('/internal/v1/site/videos');
  assertPrivate(desk, 'videos');
  assert.equal(desk.body.data.published, 1);
  assert.equal(desk.body.data.videos[0].provider_video_id, 'abcdefghijk');
  assert.equal(desk.body.data.videos[0].event.public_id, ev.public_id);
  evRes = await get(`/internal/v1/site/events/${ref(ev.public_id)}`);
  assertPrivate(evRes, 'event timeline');
  const t = evRes.body.data.timeline;
  assert.equal(t.videos.length, 1);
  assert.equal(t.listed.on_record, true);
  assert.equal(t.listed.recorded_at, null, 'a capture after the card is not reported as chronology');
  assert.ok(t.results.official >= 1);
  assert.ok(desk.body.data.channels.every((c) => !('channel_id' in c) && !('reviewed_by' in c)));
});
