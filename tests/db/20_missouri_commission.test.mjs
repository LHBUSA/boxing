// Missouri Office of Athletics ingestion against a real database, plus the empty-index guard for every commission.
// The official site is faked; every document is synthetic (tests/fixtures/commissions).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runCommissionIngest } from '../../shared/commissions/run.mjs';
import { MISSOURI_BOUTS, MISSOURI_INDEX_HTML, decodePages, encodePages, missouriPages } from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const count = async (sql) => Number((await q(`select count(*)::int n from public.${sql}`))[0].n);
const ENV = { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' };
const NOW = '2026-09-14T12:00:00Z';
const site = new Map();
const fakeFetch = async (url) => (site.has(String(url))
  ? new Response(site.get(String(url)), { status: 200, headers: { 'last-modified': 'Mon, 07 Sep 2026 00:00:00 GMT' } })
  : new Response('not found', { status: 404 }));
const ingest = (adapterKey, opts = {}) => runCommissionIngest(store, ENV, { adapterKey, fetchImpl: fakeFetch, now: NOW, extract: decodePages, mode: 'backfill', years: [2026], ...opts });
const MO_DOC = 'https://pr.mo.gov/boards/athletics/boxingresults/2026-09-05%20BOXAKICKRES%20Synthetic%20City%20Synthetic%20Boxing.pdf';

before(async () => {
  db = await freshDatabase('missouri');
  store = pgStore(db.client);
  site.set('https://pr.mo.gov/athletics-boxingresults.asp', MISSOURI_INDEX_HTML);
  site.set(MO_DOC, encodePages(missouriPages({ bouts: MISSOURI_BOUTS })));
});
after(async () => { await db?.close(); });

test('Missouri source is approved with a recorded rights review; nothing else is enabled by the migration', async () => {
  const [src] = await q(`select s.enabled, s.access_mode, s.rights_state, s.redistribution_allowed, r.decision from public.boxing_sources s
    join public.boxing_source_rights_reviews r on r.id = s.latest_rights_review_id where s.source_key = 'mo_office_of_athletics'`);
  assert.deepEqual(src, { enabled: true, access_mode: 'approved_ingest', rights_state: 'approved', redistribution_allowed: false, decision: 'approved_with_restrictions' });
});

test('Missouri: professional boxing bouts, results, referees and judges; kickboxing sheets never fetched; no private data stored', async () => {
  const r = await ingest('missouri');
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  assert.equal(r.metrics.documents_listed, 3);
  assert.equal(r.metrics.documents_skipped, 2, 'kickboxing-only files are skipped at the index');
  assert.deepEqual(r.metrics.rejected_reasons, { 'listing_not_boxing:kickboxing': 2, 'bout_sport_not_boxing:kickboxing': 1, exhibition_bout: 1 });
  assert.equal(r.metrics.documents_fetched, 1);
  assert.equal(r.metrics.documents_changed, 1);
  const bouts = await q(`select b.bout_order, fa.display_name a, fb.display_name b from public.boxing_bouts b
    join public.boxing_bout_participants pa on pa.bout_id = b.id and pa.side = 'a' join public.boxing_fighters fa on fa.id = pa.fighter_id
    join public.boxing_bout_participants pb on pb.bout_id = b.id and pb.side = 'b' join public.boxing_fighters fb on fb.id = pb.fighter_id
    join public.boxing_sources s on s.id = b.source_id where s.source_key = 'mo_office_of_athletics' order by b.bout_order`);
  assert.deepEqual(bouts.map((b) => [b.bout_order, b.a, b.b]), [[2, 'Alpha Synthetic', 'Bravo Synthetic'], [3, 'Charlie Synthetic', 'Delta Synthetic']]);
  const results = await q(`select r.outcome, r.method, r.decision_type, r.round from public.boxing_bout_results_current r join public.boxing_sources s on s.id = r.source_id
    where s.source_key = 'mo_office_of_athletics' order by r.method`);
  assert.deepEqual(results.map((x) => [x.outcome, x.method, x.decision_type, x.round]), [['win', 'DECISION', 'split', null], ['win', 'TKO', null, 4]]);
  const officials = await q(`select b.bout_order, o.display_name, bo.role, bo.slot from public.boxing_bout_officials bo join public.boxing_officials o on o.id = bo.official_id
    join public.boxing_bouts b on b.id = bo.bout_id join public.boxing_sources s on s.id = b.source_id where s.source_key = 'mo_office_of_athletics' order by b.bout_order, bo.role desc, bo.slot`);
  const byBout = (n) => officials.filter((o) => o.bout_order === n).map((o) => `${o.role}:${o.display_name}`);
  assert.deepEqual(byBout(2), ['referee:Ray Reftwo', 'judge:Jan Alpha', 'judge:Joe Bravo', 'judge:Kim Charlie']);
  assert.deepEqual(byBout(3), ['referee:Rex Refone', 'judge:Jan Alpha', 'judge:Joe Bravo', 'judge:Kim Charlie']);
  assert.equal(await count(`boxing_scorecards s join public.boxing_bouts b on b.id = s.bout_id join public.boxing_sources x on x.id = b.source_id where x.source_key = 'mo_office_of_athletics'`), 0,
    'totals the sheet does not tie to judges are never written as judge scorecards');
  assert.equal(await count(`boxing_events e join public.boxing_sources s on s.id = e.source_id where s.source_key = 'mo_office_of_athletics' and e.event_date = '2026-09-05'`), 1);
  const dump = JSON.stringify(await q(`select payload from public.boxing_source_observations o join public.boxing_sources s on s.id = o.source_id where s.source_key = 'mo_office_of_athletics'`));
  for (const s of ['123456', '1/1/95', 'Concussion', 'Cut Over Eye', 'Dr. Syn Thetic', 'Kick Syntheticone']) assert.ok(!dump.includes(s), `${s} stored`);
});

test('an official index that lists no result document is a partial run, never a quiet success', async () => {
  site.set('https://pr.mo.gov/athletics-boxingresults.asp', '<html><body>Temporarily unavailable</body></html>');
  const r = await ingest('missouri', { mode: 'forward', years: null });
  assert.equal(r.status, 'partial');
  assert.deepEqual(r.metrics.empty_indexes, ['mo-results:index']);
  site.set('https://pr.mo.gov/athletics-boxingresults.asp', MISSOURI_INDEX_HTML);
});
