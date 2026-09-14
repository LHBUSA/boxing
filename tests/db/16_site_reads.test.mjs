// Site read contract (migration 0020) against a real database: synthetic
// official commission documents are ingested, then every /internal/v1/site/*
// route is exercised through the gateway Worker.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runCommissionIngest } from '../../shared/commissions/run.mjs';
import { manualProvenance } from '../../shared/provenance.mjs';
import { SITE_FORBIDDEN_KEYS } from '../../workers/boxing-gateway/src/routes.mjs';
import {
  FLORIDA_BOUTS, FLORIDA_RESULTS_HTML, FLORIDA_UPCOMING_HTML, NEVADA_BOUTS, NEVADA_INDEX_HTML, NJ_BOUTS, NJ_SCHEDULE_HTML,
  decodePages, encodePages, floridaPages, nevadaCalendarIcs, nevadaPages, njResultPages,
} from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
let worker;
const TOKEN = 's'.repeat(40);
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const NOW = '2026-09-13T12:00:00Z';
const site = new Map();
const fakeFetch = async (url) => (site.has(String(url))
  ? new Response(site.get(String(url)), { status: 200, headers: { 'last-modified': 'Mon, 07 Sep 2026 00:00:00 GMT' } })
  : new Response('not found', { status: 404 }));
const NV_BASE = 'https://boxing.nv.gov/uploadedFiles/boxingnvgov/content/results/2026_Results/';

const get = async (path) => {
  const res = await worker.fetch(new Request(`https://g.internal${path}`, { headers: { authorization: `Bearer ${TOKEN}` } }), { BOXING_INTERNAL_TOKEN: TOKEN });
  const text = await res.text();
  return { status: res.status, text, body: JSON.parse(text) };
};
const ref = (publicId) => publicId.slice(-32).slice(0, 12);

function forbiddenKeys(value, path = '$', out = []) {
  if (Array.isArray(value)) value.forEach((v, i) => forbiddenKeys(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (SITE_FORBIDDEN_KEYS.includes(k)) out.push(`${path}.${k}`);
      forbiddenKeys(v, `${path}.${k}`, out);
    }
  }
  return out;
}
const HOMETOWNS = [...FLORIDA_BOUTS.flatMap((b) => [b.a.home, b.b.home])];
function assertPrivate(res, label) {
  assert.deepEqual(forbiddenKeys(res.body), [], `${label}: forbidden keys`);
  assert.doesNotMatch(res.text, /[A-Z]{2}-?[0-9]{5,8}/, `${label}: federal id pattern`);
  assert.doesNotMatch(res.text, /01\/02\/1990|1990-01-02|doc synthetic|ringside physician/i, `${label}: DOB or medical detail`);
  for (const h of HOMETOWNS) assert.ok(!res.text.includes(`"${h}"`), `${label}: stated hometown ${h}`);
  assert.doesNotMatch(res.text, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, `${label}: internal uuid`);
}
const factChecksum = async () => (await one(`select md5(string_agg(t, '|' order by t)) h from (
  select 'b' || count(*) t from public.boxing_bouts union all select 'r' || count(*) from public.boxing_bout_results
  union all select 'f' || count(*) from public.boxing_fighters union all select 'e' || count(*) from public.boxing_events
  union all select 's' || count(*) from public.boxing_scorecards union all select 'n' || count(*) from public.boxing_news_events) x`)).h;

before(async () => {
  db = await freshDatabase('site_reads');
  store = pgStore(db.client);
  const { createWorker } = await import('../../workers/boxing-gateway/src/index.mjs');
  worker = createWorker({ makeStore: () => store });
  site.set('https://calendar.google.com/calendar/ical/kmvuar97kvumm2l7t9m6t4rpr0%40group.calendar.google.com/public/basic.ics', nevadaCalendarIcs([
    { uid: 'nv-1', dtstart: '20260906T030000Z', summary: 'PRO Boxing Event', location: 'Synthetic Garden Arena, 1 Synthetic Blvd, Las Vegas, NV 89109, USA', description: 'Synthetic Promotions will promote a professional boxing event.' },
    { uid: 'nv-2', dtstart: '20260926T030000Z', summary: 'PRO Boxing Event', location: 'Synthetic Palace, 2 Synthetic Blvd, Las Vegas, NV 89109, USA', description: 'Future Promotions will promote a professional boxing event.' },
  ]));
  site.set('https://boxing.nv.gov/results/2026_Results/', NEVADA_INDEX_HTML);
  site.set(`${NV_BASE}09-05-26_Boxing_REDACTED.pdf`, encodePages(nevadaPages({ bouts: NEVADA_BOUTS })));
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-upcoming-events-professional/', FLORIDA_UPCOMING_HTML);
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/', FLORIDA_RESULTS_HTML);
  site.set('https://www2.myfloridalicense.com/pro/sbc/documents/09-05-2026-Synthetic_Sunshine-Results_without_med.pdf', encodePages(floridaPages({ bouts: FLORIDA_BOUTS })));
  site.set('https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/', NJ_SCHEDULE_HTML);
  site.set('https://nj.gov/oag/sacb/results/2026-0904_Synthetic_Pro_Boxing.pdf', encodePages(njResultPages({ venueLine: 'Synthetic Center, Newark, NJ', bouts: NJ_BOUTS })));
  for (const adapterKey of ['nevada', 'florida', 'new_jersey']) {
    const r = await runCommissionIngest(store, { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' }, {
      adapterKey, fetchImpl: fakeFetch, now: NOW, extract: decodePages, mode: 'backfill', years: [2026],
      provenance: manualProvenance({ workerName: 'tests/db/16', runtime: 'node test', trigger: 'backfill' }) });
    assert.equal(r.status, 'ok', `${adapterKey}: ${JSON.stringify(r.metrics)}`);
  }
});
after(async () => { await db?.close(); });

test('home: upcoming and recent cards, real results, coverage that matches the tables; nothing private', async () => {
  const before = await factChecksum();
  const res = await get('/internal/v1/site/home?today=2026-09-13');
  assert.equal(res.status, 200);
  const d = res.body.data;
  assertPrivate(res, 'home');
  assert.ok(d.upcoming.length >= 1 && d.upcoming.every((e) => e.date >= '2026-09-12' && e.status !== 'complete'));
  assert.ok(d.upcoming.every((e) => e.bout_count === 0 && e.sheet_filed === false && e.awaiting_verification === null), 'future cards have no filed sheet yet');
  assert.ok(d.recent.length >= 2 && d.recent.every((e) => e.status === 'complete'));
  const bouts = Number((await one('select count(*) n from public.boxing_bouts where status is distinct from \'cancelled\'')).n);
  assert.equal(d.coverage.bouts, bouts);
  assert.equal(d.coverage.official_results, Number((await one('select count(*) n from public.boxing_bout_results_current')).n));
  assert.equal(d.coverage.title_records, 0);
  assert.equal(d.coverage.matched_market_bouts, 0);
  assert.ok(d.latest_results.every((b) => b.result && b.event?.public_id));
  assert.equal(await factChecksum(), before, 'site reads change no facts');
});

test('event: official sheet order, sheet promoters and corners, awaiting-verification count', async () => {
  const fl = await one(`select e.public_id from public.boxing_events e join public.boxing_sources s on s.id = e.source_id
    where s.source_key = 'florida_athletic_commission' and e.status = 'complete' limit 1`);
  const res = await get(`/internal/v1/site/events/${ref(fl.public_id)}`);
  assert.equal(res.status, 200);
  assertPrivate(res, 'event');
  const { event, bouts } = res.body.data;
  assert.deepEqual(event.promoters, ['Synthetic Sunshine Promotions'], 'promoter as listed on the official sheet');
  assert.equal(event.sheet_filed, true);
  assert.equal(event.commission.slug, 'fl-athletic-commission');
  assert.deepEqual(bouts.map((b) => b.order), [...bouts.map((b) => b.order)].sort((x, y) => x - y));
  assert.ok(bouts.every((b) => b.a.corner === 'blue' && b.b.corner === 'red'), 'corners come from the sheet');
  const sheetPro = FLORIDA_BOUTS.filter((b) => b.sport.join(' ') === 'Boxing').length;
  assert.equal(event.bout_count + event.awaiting_verification, sheetPro, 'every professional sheet bout is either canonical or awaiting verification');
  const all = await get('/internal/v1/site/events?scope=results&commission=fl-athletic-commission&limit=5');
  assert.ok(all.body.data.rows.some((r) => r.public_id === fl.public_id));
  assert.ok(all.body.data.rows.every((r) => r.commission.slug === 'fl-athletic-commission'));
  assert.equal((await get('/internal/v1/site/events/000000000000')).status, 404);
});

test('bout: record entering excludes the bout itself; result revisions; market is absent until matched', async () => {
  const b = await one(`select b.public_id from public.boxing_bouts b join public.boxing_bout_results_current r on r.bout_id = b.id order by b.bout_order limit 1`);
  const res = await get(`/internal/v1/site/bouts/${ref(b.public_id)}`);
  assert.equal(res.status, 200);
  assertPrivate(res, 'bout');
  const d = res.body.data;
  assert.equal(d.internal_bout_id, undefined);
  assert.equal(d.market, null);
  assert.equal(d.bout.market_matched, false);
  for (const side of ['a', 'b']) {
    const c = d.corners[side];
    assert.ok(c.fighter.public_id && c.fighter.name);
    assert.equal(c.entering.bouts, 0, 'a first verified bout enters with no verified history');
    assert.equal(c.record_all.bouts >= 1, true);
    assert.ok(Array.isArray(c.dna));
  }
  assert.ok(d.result_history.length >= 1 && d.result_history.at(-1).revision === d.bout.result.revision);
});

test('fighter: verified record equals its bout list; search; merged refs redirect; bad refs 404', async () => {
  const f = await one(`select f.public_id, f.display_name from public.boxing_fighters f
    join public.boxing_bout_participants p on p.fighter_id = f.id group by f.id order by count(*) desc, f.display_name limit 1`);
  const res = await get(`/internal/v1/site/fighters/${ref(f.public_id)}`);
  assert.equal(res.status, 200);
  assertPrivate(res, 'fighter');
  const d = res.body.data;
  const completed = d.bouts.filter((x) => x.event_complete);
  assert.equal(d.record.bouts, completed.length);
  assert.equal(d.record.wins, completed.filter((x) => x.result === 'W').length);
  assert.equal(d.record.losses, completed.filter((x) => x.result === 'L').length);
  assert.ok(d.bouts.every((x) => x.opponent.public_id && x.event.public_id));
  const list = await get(`/internal/v1/site/fighters?q=${encodeURIComponent(f.display_name.split(' ')[0])}`);
  assert.ok(list.body.data.rows.some((r) => r.public_id === f.public_id));
  assertPrivate(list, 'fighters');

  const [keep, dup] = await q(`select f.id, f.public_id from public.boxing_fighters f join public.boxing_bout_participants p on p.fighter_id = f.id group by f.id order by f.id limit 2`);
  await db.client.query('update public.boxing_fighters set merged_into_id = $1 where id = $2', [keep.id, dup.id]).catch(() => null);
  const merged = (await one('select merged_into_id from public.boxing_fighters where id = $1', [dup.id])).merged_into_id;
  if (merged) {
    const r = await get(`/internal/v1/site/fighters/${ref(dup.public_id)}`);
    assert.equal(r.body.data.redirect_public_id, keep.public_id);
  }
  assert.equal((await get('/internal/v1/site/fighters/abc')).status, 400);
});

test('titles and rankings boards: sanctioning bodies with source state; no invented champions or ranks', async () => {
  const t = await get('/internal/v1/site/titles?weight_class=welterweight');
  assert.equal(t.status, 200);
  assertPrivate(t, 'titles');
  assert.ok(t.body.data.board.divisions.length >= 17);
  assert.deepEqual(t.body.data.board.organizations.map((o) => o.short_name).sort(), ['IBF', 'WBA', 'WBC', 'WBO']);
  assert.ok(t.body.data.board.organizations.every((o) => o.title_records === 0));
  const r = await get('/internal/v1/site/rankings?organization=wbc&weight_class=welterweight');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.snapshot, null, 'no ranking snapshot is invented');
  assert.deepEqual(r.body.data.board.snapshots, []);
  const c = await get('/internal/v1/site/coverage?today=2026-09-13');
  assertPrivate(c, 'coverage');
  assert.ok(c.body.data.commissions.length === 3);
});

test('site OS reads: fighter/bout context, Hall of Fame, eras and wire stay private and never invent affiliation', async () => {
  const f = await one(`select f.id, f.public_id, f.display_name from public.boxing_fighters f join public.boxing_bout_participants p on p.fighter_id = f.id
    group by f.id order by count(*) desc, f.display_name limit 1`);
  const wikidata = await one("select id from public.boxing_sources where source_key = 'wikidata'");
  await q(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, external_url, verification_state, confidence, evidence)
    values ($1, $2, 'wikidata.item', 'Q999001', 'https://www.wikidata.org/wiki/Q999001', 'verified', 95, '{"rule":"test"}')`, [f.id, wikidata.id]);
  await q(`insert into public.boxing_fighter_attribute_claims (fighter_id, attribute, value, source_id, claim_hash) values
    ($1, 'dob', '"1990-01-01"', $2, 'site-os-dob'), ($1, 'height_cm', '180', $2, 'site-os-height'), ($1, 'nationality', '["US"]', $2, 'site-os-nat')`, [f.id, wikidata.id]);
  const hall = await one("insert into public.boxing_organizations (slug, name, organization_kind) values ('synthetic-hall', 'Synthetic Hall of Fame', 'hall_of_fame') returning id");
  const person = await one("insert into public.boxing_persons (display_name, normalized_name, fighter_id, identity_state) values ($1, 'x', $2, 'verified') returning id", [f.display_name, f.id]);
  await q(`insert into public.boxing_hall_inductions (institution_id, person_id, induction_year, category_source_label, source_id, source_url, evidence)
    values ($1, $2, 2024, 'Men''s Modern Boxers', $3, 'https://www.wikidata.org/wiki/Q999001', 'Synthetic induction record for the site test.')`, [hall.id, person.id, wikidata.id]);

  const ctx = await get(`/internal/v1/site/fighters/${ref(f.public_id)}/context`);
  assert.equal(ctx.status, 200);
  assertPrivate(ctx, 'fighter context');
  const c = ctx.body.data;
  assert.equal(c.sourced_bio.source, 'Wikidata');
  assert.equal(c.sourced_bio.wikidata_qid, 'Q999001');
  assert.ok(c.sourced_bio.age_years >= 36, 'age is derived; the date itself is never served');
  assert.equal(Number(c.sourced_bio.height_cm), 180);
  assert.deepEqual(c.hall_of_fame.map((h) => [h.institution, h.year, h.category]), [['Synthetic Hall of Fame', 2024, "Men's Modern Boxers"]]);
  assert.ok(Array.isArray(c.promoter_appearances) && c.promoter_appearances.every((p) => p.cards >= 1 && !('signed' in p) && !('affiliation' in p)));
  assert.doesNotMatch(ctx.text, /1990-01-01/);

  const b = await one(`select b.public_id from public.boxing_bouts b join public.boxing_bout_participants p on p.bout_id = b.id where p.fighter_id = $1 limit 1`, [f.id]);
  const bc = await get(`/internal/v1/site/bouts/${ref(b.public_id)}/context`);
  assert.equal(bc.status, 200);
  assertPrivate(bc, 'bout context');
  assert.ok(Array.isArray(bc.body.data.previous_meetings));
  assert.ok(bc.body.data.officials.every((o) => o.public_id && ['referee', 'judge'].includes(o.role)));

  const h = await get("/internal/v1/site/hall-of-fame?category=Men's%20Modern%20Boxers");
  assert.equal(h.status, 200);
  assertPrivate(h, 'hall of fame');
  assert.equal(h.body.data.total, 1);
  assert.equal(h.body.data.rows[0].fighter_public_id, f.public_id);
  assert.equal(h.body.data.institutions[0].name, 'Synthetic Hall of Fame');

  const eras = await get('/internal/v1/site/eras');
  assertPrivate(eras, 'eras');
  assert.ok(eras.body.data.decades.some((d) => d.decade === 2020 && d.verified_bouts > 0 && d.hall_inductions === 1));

  const wire = await get('/internal/v1/site/wire?limit=20');
  assert.equal(wire.status, 200);
  assertPrivate(wire, 'wire');
  assert.ok(wire.body.data.length > 0 && wire.body.data.every((w) => w.kind && w.event?.public_id));
  assert.equal((await get('/internal/v1/site/hall-of-fame?year=abc')).status, 400);
});
