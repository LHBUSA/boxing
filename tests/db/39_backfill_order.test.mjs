// Capped commission backfill ordering (2026-10-03). When a year lists more documents than the per-run cap, a pass
// must reach documents the current parser has not yet processed, instead of spending the cap on the same first,
// already current, documents every time (Florida 2024: 98 listed, 80 per pass, the last 18 never reached).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runCommissionIngest } from '../../shared/commissions/run.mjs';
import { FLORIDA_BOUTS, FLORIDA_UPCOMING_HTML, decodePages, encodePages, floridaPages } from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const ENV = { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' };
const DOCS = 'https://www2.myfloridalicense.com/pro/sbc/documents/';
const DATES = ['09-05', '09-12', '09-19'];
const docUrl = (d) => `${DOCS}${d}-2026-Synthetic_Sunshine-Results_without_med.pdf`;
const site = new Map();
let requested = [];
const fakeFetch = async (url) => {
  requested.push(String(url));
  return site.has(String(url)) ? new Response(site.get(String(url)), { status: 200 }) : new Response('not found', { status: 404 });
};
const ingest = (now) => runCommissionIngest(store, ENV, { adapterKey: 'florida', fetchImpl: fakeFetch, now, extract: decodePages,
  mode: 'backfill', years: [2026], maxDocuments: 2 });
const pdfOrder = () => requested.filter((u) => u.endsWith('.pdf')).map((u) => DATES.find((d) => u.includes(`/${d}-`)));
const processed = async () => (await q(`select d.doc_key from public.boxing_source_documents d join public.boxing_sources s on s.id = d.source_id
  where s.source_key = 'florida_athletic_commission' and d.kind = 'results' and d.current_revision > 0 order by 1`)).length;

before(async () => {
  db = await freshDatabase('backfill_order');
  store = pgStore(db.client);
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-upcoming-events-professional/', FLORIDA_UPCOMING_HTML);
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/',
    DATES.map((d) => `<a href="${docUrl(d)}">September ${Number(d.slice(3))}, 2026 – Synthetic Sunshine – Tampa</a>`).join('\n'));
  for (const d of DATES) site.set(docUrl(d), encodePages(floridaPages({ date: `${d.replace('-', '/')}/2026`, bouts: FLORIDA_BOUTS })));
});
after(async () => { await db?.close(); });

test('a capped backfill pass reaches the documents not yet processed, then re-checks current ones within the cap', async () => {
  requested = [];
  const first = await ingest('2026-10-01T12:00:00Z');
  assert.equal(first.metrics.documents_listed, 3);
  assert.equal(first.metrics.documents_fetched, 2, 'the cap holds');
  assert.equal(await processed(), 2);
  const firstPair = pdfOrder();

  requested = [];
  const second = await ingest('2026-10-01T13:00:00Z');
  assert.equal(second.metrics.documents_fetched, 2, 'the cap still holds');
  const missing = DATES.find((d) => !firstPair.includes(d));
  assert.equal(pdfOrder()[0], missing, 'the unprocessed document is fetched first');
  assert.equal(await processed(), 3, 'every listed document is processed after two capped passes');
  assert.equal(second.metrics.documents_changed, 1, 'only the new document changed; the re-checked one was unchanged');
});
