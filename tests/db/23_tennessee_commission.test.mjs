// Tennessee Athletic Commission ingestion against a real database. The official site is faked; every document is
// synthetic device-space pages (tests/fixtures/commissions).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runCommissionIngest } from '../../shared/commissions/run.mjs';
import { TENNESSEE_ARCHIVE_HTML, TENNESSEE_BOUTS, TENNESSEE_EVENTS_HTML, TENNESSEE_ROTATED_BOUTS, decodePages, encodePages, tennesseePages } from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const ENV = { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' };
const site = new Map();
const fetched = [];
const fakeFetch = async (url) => {
  fetched.push(String(url));
  return site.has(String(url)) ? new Response(site.get(String(url)), { status: 200 }) : new Response('not found', { status: 404 });
};
const DOCS = 'https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/';
const TN = `s.source_key = 'tn_athletic_commission'`;

before(async () => {
  db = await freshDatabase('tennessee');
  store = pgStore(db.client);
  site.set('https://www.tn.gov/commerce/regboards/athletic/events.html', TENNESSEE_EVENTS_HTML);
  site.set('https://www.tn.gov/commerce/regboards/athletic/events/archive.html', TENNESSEE_ARCHIVE_HTML);
  site.set(`${DOCS}2026/SYNTHETIC-BOXING_9-5.pdf`, encodePages(tennesseePages({ bouts: TENNESSEE_BOUTS })));
  site.set(`${DOCS}2026/SYNTHETIC_9-12_Boxing.pdf`, encodePages(tennesseePages({ rotate: true, city: 'KNOXVILLE', date: '09 / 12 / 2026', venue: 'SYNTHETIC ARENA', bouts: TENNESSEE_ROTATED_BOUTS })));
  site.set(`${DOCS}2026/SYNTHETIC-SCAN_9-13.pdf`, encodePages([{ page: 1, width: 612, height: 792, rotate: 0, items: [], marks: [] }]));
  site.set(`${DOCS}2025/SYNTHETIC-ARCHIVE_12-20.pdf`, encodePages(tennesseePages({ date: '12 / 20 / 2025', venue: 'SYNTHETIC ARCHIVE HALL',
    bouts: [{ ...TENNESSEE_BOUTS[0], a: { name: 'Synth Oscar', weight: 140 }, b: { name: 'Synth Papa', weight: 141 } }] })));
  site.set(`${DOCS}2025/SYNTHETIC-MARKUP_12-6.pdf`, encodePages(tennesseePages({ city: 'MEMPHIS', date: '12 / 06 / 2025', venue: 'SYNTHETIC MARKUP HALL',
    bouts: [{ ...TENNESSEE_BOUTS[1], a: { name: 'Synth Quebec', weight: 150 }, b: { name: 'Synth Romeo', weight: 151 } }] })));
  site.set(`${DOCS}2025/SYNTHETIC-TYPO_11-2.pdf`, encodePages(tennesseePages({ date: '11 / 02 / 2025', venue: 'SYNTHETIC TYPO HALL',
    bouts: [{ ...TENNESSEE_BOUTS[1], a: { name: 'Synth Sierra', weight: 160 }, b: { name: 'Synth Tango', weight: 161 } }] })));
});
after(async () => { await db?.close(); });

test('Tennessee: approved source; boxing forms ingested with marked winners, referees, attributed scorecards; other sports, scans and private data refused', async () => {
  const [src] = await q(`select s.enabled, s.access_mode, s.rights_state, s.redistribution_allowed, r.decision from public.boxing_sources s
    join public.boxing_source_rights_reviews r on r.id = s.latest_rights_review_id where ${TN}`);
  assert.deepEqual(src, { enabled: true, access_mode: 'approved_ingest', rights_state: 'approved', redistribution_allowed: false, decision: 'approved_with_restrictions' });

  const r = await runCommissionIngest(store, ENV, { adapterKey: 'tennessee', fetchImpl: fakeFetch, now: '2026-09-14T12:00:00Z', extract: decodePages, mode: 'backfill', years: [2026] });
  assert.equal(r.metrics.documents_listed, 5);
  assert.equal(r.metrics.documents_skipped, 2, 'the MMA and bare-knuckle links are skipped at the index');
  assert.equal(r.metrics.documents_fetched, 3);
  assert.equal(r.metrics.documents_rejected, 1, 'the image-only scan');
  assert.ok(!fetched.some((u) => /MMA|Bare-Knuckle|archive/.test(u)), 'non-boxing documents and the archive (no earlier year requested) are never fetched');
  assert.deepEqual(Object.fromEntries(Object.entries(r.metrics.rejected_reasons).filter(([k]) => !k.startsWith('listing_'))),
    { amateur_bout: 1, ambiguous_winner_marks: 1, winner_mark_contradicts_score_lines: 1, 'document:unknown': 1 });

  const results = await q(`select b.bout_order, e.event_date::text d, r.outcome, r.method, r.decision_type, r.round from public.boxing_bout_results_current r
    join public.boxing_bouts b on b.id = r.bout_id join public.boxing_events e on e.id = b.event_id join public.boxing_sources s on s.id = r.source_id where ${TN} order by e.event_date, b.bout_order`);
  assert.deepEqual(results.map((x) => [x.d, x.bout_order, x.outcome, x.method, x.decision_type, x.round]), [
    ['2026-09-05', 1, 'win', 'DECISION', 'unanimous', null], ['2026-09-05', 2, 'win', 'TKO', null, 2], ['2026-09-05', 3, 'win', 'DECISION', 'split', null],
    ['2026-09-05', 5, 'draw', 'DECISION', 'majority', null], ['2026-09-12', 1, 'win', 'KO', null, 1],
  ], 'no result for the ambiguous-mark bout or the bout whose lines contradict its mark');

  const cards = await q(`select b.bout_order, o.display_name, c.fighter_a_total::int a_total, c.fighter_b_total::int b_total from public.boxing_scorecards_current c join public.boxing_officials o on o.id = c.judge_id
    join public.boxing_bouts b on b.id = c.bout_id join public.boxing_sources s on s.id = b.source_id where ${TN} order by b.bout_order, o.display_name`);
  assert.deepEqual(cards.map((c) => [c.bout_order, c.display_name, c.a_total, c.b_total]), [
    [1, 'Jan Alpha', 40, 36], [1, 'Joe Bravo', 39, 37], [1, 'Kim Charlie', 39, 37],
    [3, 'Jan Alpha', 58, 56], [3, 'Joe Bravo', 56, 58], [3, 'Lou Delta', 55, 59],
  ], 'totals only where the winner mark and decision type fix the order; the draw writes none');

  const refs = await q(`select e.event_date::text d, b.bout_order, o.display_name from public.boxing_bout_officials bo join public.boxing_officials o on o.id = bo.official_id
    join public.boxing_bouts b on b.id = bo.bout_id join public.boxing_events e on e.id = b.event_id join public.boxing_sources s on s.id = b.source_id
    where ${TN} and bo.role = 'referee' order by e.event_date, b.bout_order`);
  assert.deepEqual(refs.map((x) => [x.d, x.bout_order, x.display_name]), [
    ['2026-09-05', 1, 'Rex Refone'], ['2026-09-05', 2, 'Ray Reftwo'], ['2026-09-05', 3, 'Rex Refone'], ['2026-09-05', 5, 'Ray Reftwo'], ['2026-09-05', 6, 'Rex Refone'], ['2026-09-12', 1, 'Rex Refone'],
  ]);

  const [susp] = await q(`select x.effective_from::date::text f, x.effective_to::date::text t, x.reason_public from public.boxing_regulatory_actions x
    join public.boxing_bouts b on b.id = x.bout_id join public.boxing_sources s on s.id = x.source_id where ${TN} and b.bout_order = 2`);
  assert.deepEqual(susp, { f: '2026-09-05', t: '2026-10-05', reason_public: null });

  const dump = JSON.stringify(await q(`select o.payload from public.boxing_source_observations o join public.boxing_sources s on s.id = o.source_id where ${TN}`));
  for (const s of ['1/1/1995', 'TN 1234567', 'OPHTHALMOLOGIST', 'by Dr', 'Syn Physician', 'Ina Inspector', 'Tim Keeper', 'synthetic@example.test', '555 0100']) {
    assert.ok(!dump.includes(s), `${s} stored`);
  }
});

test('Tennessee forward run in January reads the archive page too, so December cards are not missed', async () => {
  fetched.length = 0;
  const r = await runCommissionIngest(store, ENV, { adapterKey: 'tennessee', fetchImpl: fakeFetch, now: '2026-01-10T12:00:00Z', extract: decodePages, mode: 'forward' });
  assert.ok(fetched.includes('https://www.tn.gov/commerce/regboards/athletic/events/archive.html'), JSON.stringify({ fetched, metrics: r.metrics }));
  assert.ok(fetched.includes(`${DOCS}2025/SYNTHETIC-ARCHIVE_12-20.pdf`), JSON.stringify({ fetched, metrics: r.metrics }));
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  const events = await q(`select e.event_date::text d from public.boxing_events e join public.boxing_sources s on s.id = e.source_id where ${TN} and e.event_date < '2026-01-01' order by 1`);
  assert.deepEqual(events.map((e) => e.d), ['2025-11-02', '2025-12-06', '2025-12-20'], 'the markup row and the mistyped-date row are fetched too (the sheet supplies the date)');
  assert.equal(r.metrics.index_dates_unreadable, 1);
  assert.equal(r.metrics.index_links_unplaced, undefined);
});
