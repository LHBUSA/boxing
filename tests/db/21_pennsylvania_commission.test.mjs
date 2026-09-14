// Pennsylvania State Athletic Commission ingestion against a real database. The official site is faked; every
// document is synthetic (tests/fixtures/commissions).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runCommissionIngest } from '../../shared/commissions/run.mjs';
import { PENNSYLVANIA_BOUTS, PENNSYLVANIA_INDEX_HTML, decodePages, encodePages, pennsylvaniaPages } from '../fixtures/commissions/synthetic.mjs';

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
const BASE = 'https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/';

before(async () => {
  db = await freshDatabase('pennsylvania');
  store = pgStore(db.client);
  site.set('https://www.pa.gov/agencies/dos/programs/state-athletic/results', PENNSYLVANIA_INDEX_HTML);
  site.set(`${BASE}09-05-26%20box%20synthetic%20-%20synthetic%20arena%20-%20phila.%20pa%20-%20results.pdf`, encodePages(pennsylvaniaPages({ bouts: PENNSYLVANIA_BOUTS })));
});
after(async () => { await db?.close(); });

test('Pennsylvania: approved source; boxing sheet ingested with referees by marker and judges; MMA and kickboxing never fetched', async () => {
  const [src] = await q(`select enabled, access_mode, rights_state, redistribution_allowed from public.boxing_sources where source_key = 'pa_state_athletic_commission'`);
  assert.deepEqual(src, { enabled: true, access_mode: 'approved_ingest', rights_state: 'approved', redistribution_allowed: false });
  const r = await runCommissionIngest(store, ENV, { adapterKey: 'pennsylvania', fetchImpl: fakeFetch, now: '2026-09-14T12:00:00Z', extract: decodePages, mode: 'backfill', years: [2026] });
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  assert.equal(r.metrics.documents_fetched, 1);
  assert.ok(!fetched.some((u) => /mma|k-bx/.test(u)), 'non-boxing documents are skipped at the index');
  const results = await q(`select r.outcome, r.method, r.decision_type from public.boxing_bout_results_current r join public.boxing_sources s on s.id = r.source_id
    where s.source_key = 'pa_state_athletic_commission' order by r.method, r.outcome`);
  assert.deepEqual(results.map((x) => [x.outcome, x.method, x.decision_type]), [['draw', 'DECISION', 'majority'], ['win', 'DECISION', 'unanimous'], ['win', 'KO', null]]);
  const refs = await q(`select b.bout_order, o.display_name from public.boxing_bout_officials bo join public.boxing_officials o on o.id = bo.official_id
    join public.boxing_bouts b on b.id = bo.bout_id join public.boxing_sources s on s.id = b.source_id where s.source_key = 'pa_state_athletic_commission' and bo.role = 'referee' order by b.bout_order`);
  assert.deepEqual(refs.map((x) => x.display_name), ['Rex Refone', 'Ray Reftwo', 'Rex Refone']);
  const judges = await q(`select count(*)::int n from public.boxing_bout_officials bo join public.boxing_bouts b on b.id = bo.bout_id join public.boxing_sources s on s.id = b.source_id
    where s.source_key = 'pa_state_athletic_commission' and bo.role = 'judge'`);
  assert.equal(judges[0].n, 9);
  const dump = JSON.stringify(await q(`select payload from public.boxing_source_observations o join public.boxing_sources s on s.id = o.source_id where s.source_key = 'pa_state_athletic_commission'`));
  for (const s of ['1/1/1995', 'PA-123456', 'ORTHO', 'LEFT EYE', 'DOC, SYN']) assert.ok(!dump.includes(s), `${s} stored`);
});
