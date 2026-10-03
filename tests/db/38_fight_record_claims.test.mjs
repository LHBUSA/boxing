// Fight Record V1 (migration 0053): sourced record claims are kept apart from the reconstructed bout ledger.
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
const ENV = { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' };
const site = new Map();
const fakeFetch = async (url) => (site.has(String(url)) ? new Response(site.get(String(url)), { status: 200 }) : new Response('not found', { status: 404 }));
const ingest = (opts = {}) => runCommissionIngest(store, ENV, { adapterKey: 'missouri', fetchImpl: fakeFetch, now: '2026-09-14T12:00:00Z', extract: decodePages, mode: 'backfill', years: [2026], ...opts });
const MO_DOC = 'https://pr.mo.gov/boards/athletics/boxingresults/2026-09-05%20BOXAKICKRES%20Synthetic%20City%20Synthetic%20Boxing.pdf';
const fighter = async (name) => (await q(`select id from public.boxing_fighters where display_name = $1`, [name]))[0].id;
const claim = (over) => q(`select public.boxing_record_fighter_record_claim($1) r`, [{ record_type: 'RECORD_ENTERING', source_key: 'mo_office_of_athletics',
  source_url: MO_DOC, parse_state: 'parsed', parser_version: 'test', ...over }]).then((x) => x[0].r);
const recon = async (id) => (await q(`select public.boxing_fighter_record_reconciliation($1) r`, [id]))[0].r;

before(async () => {
  db = await freshDatabase('fight_record');
  store = pgStore(db.client);
  site.set('https://pr.mo.gov/athletics-boxingresults.asp', MISSOURI_INDEX_HTML);
  site.set(MO_DOC, encodePages(missouriPages({ bouts: MISSOURI_BOUTS })));
});
after(async () => { await db?.close(); });

test('Missouri RECORD becomes a record-ENTERING claim per contestant; a rerun writes nothing; AGE/DOB/FED ID never stored', async () => {
  const r = await ingest();
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  const rows = await q(`select c.raw_record, c.wins, c.losses, c.draws, c.no_contests, c.parse_state, c.effective_as_of::text d, c.record_type, s.source_key
    from public.boxing_fighter_record_claims c join public.boxing_sources s on s.id = c.source_id order by c.source_external_id`);
  assert.equal(rows.length, 4, 'two professional bouts x two corners');
  for (const x of rows) assert.deepEqual([x.raw_record, x.wins, x.losses, x.draws, x.no_contests, x.parse_state, x.d, x.record_type, x.source_key],
    ['3-1', 3, 1, null, null, 'parsed', '2026-09-05', 'RECORD_ENTERING', 'mo_office_of_athletics']);
  const again = await ingest({ force: true });
  assert.equal(again.status, 'ok');
  assert.equal(Number((await q(`select count(*) n from public.boxing_fighter_record_claims`))[0].n), 4, 'rerun / reparse is idempotent');
  const dump = JSON.stringify(await q(`select to_jsonb(c) j from public.boxing_fighter_record_claims c`));
  for (const s of ['123456', '1/1/95']) assert.ok(!dump.includes(s), `${s} (FED ID / DOB) is never stored`);
});

test('claims are append-only; the lane is strict: an undeclared source is refused', async () => {
  await assert.rejects(q(`update public.boxing_fighter_record_claims set wins = 99`), /append|immutable|BX00/i);
  const alpha = await fighter('Alpha Synthetic');
  const same = { fighter_id: alpha, source_external_id: 'mo:same:a', effective_as_of: '2026-08-01', raw_record: '2-1', wins: 2, losses: 1 };
  assert.deepEqual([(await claim(same)).status, (await claim(same)).status], ['created', 'duplicate'], 'the same printed appearance is stored once');
  await assert.rejects(claim({ fighter_id: alpha, source_key: 'nsac_nevada', source_url: 'https://boxing.nv.gov/x.pdf', source_external_id: 'nv:x:a',
    effective_as_of: '2026-09-01', raw_record: '1-0', wins: 1, losses: 0 }), /lane_not_rights_approved: record_entering is not_declared/);
  await assert.rejects(claim({ fighter_id: alpha, source_external_id: 'mo:bad', effective_as_of: '2026-09-01', raw_record: 'Debut', parse_state: 'held', wins: 1, losses: 0 }),
    /check/i, 'a held claim carries no counts');
});

test('current record follows EFFECTIVE chronology: a 2019 sheet ingested today never becomes current', async () => {
  const delta = await fighter('Delta Synthetic');
  assert.equal((await claim({ fighter_id: delta, source_external_id: 'mo:2019:x', effective_as_of: '2019-06-01', raw_record: '0-0', wins: 0, losses: 0 })).status, 'created');
  const cur = (await q(`select public.boxing_fighter_current_record($1) r`, [delta]))[0].r;
  assert.deepEqual([cur.raw_record, cur.effective_as_of], ['3-1', '2026-09-05']);
});

test('reconciliation: PARTIAL (source ahead of the ledger), COMPLETE, CONFLICT, UNKNOWN; no bout is ever created', async () => {
  const boutsBefore = Number((await q(`select count(*) n from public.boxing_bouts`))[0].n);
  const alpha = await recon(await fighter('Alpha Synthetic'));
  assert.equal(alpha.classification, 'PARTIAL');
  assert.deepEqual(alpha.graph_before_claim, { wins: 0, losses: 0, draws: 0, no_contests: 0 });
  assert.deepEqual(alpha.missing_before_claim, { wins: 3, losses: 1, draws: null }, 'the gap is reported, never filled');
  assert.equal(alpha.graph_after_claim_bout.label, 'pbe_derived', 'a post-fight record is derived and labelled, never a source claim');
  assert.equal(alpha.sourced_record.raw_record, '3-1');

  // the winner of the 2026-09-05 bout, printed 1-0 entering a later bout: the ledger accounts for every decision
  const [winner] = await q(`select public.boxing_canonical_fighter_id(r.winner_id) id from public.boxing_bout_results_current r join public.boxing_bouts b on b.id = r.bout_id where b.bout_order = 2`);
  await claim({ fighter_id: winner.id, source_external_id: 'mo:later:w', effective_as_of: '2026-10-01', raw_record: '1-0', wins: 1, losses: 0 });
  assert.equal((await recon(winner.id)).classification, 'COMPLETE');

  // a source record smaller than the decisions already in the ledger contradicts it
  const charlie = await fighter('Charlie Synthetic');
  await claim({ fighter_id: charlie, source_external_id: 'mo:later:c', effective_as_of: '2026-10-01', raw_record: '0-0', wins: 0, losses: 0 });
  assert.equal((await recon(charlie)).classification, 'CONFLICT');

  const [lonely] = await q(`insert into public.boxing_fighters (display_name, normalized_name, identity_state) values ('Nobody Claimed', 'nobody claimed', 'verified') returning id`);
  assert.equal((await recon(lonely.id)).classification, 'UNKNOWN');
  assert.equal(Number((await q(`select count(*) n from public.boxing_bouts`))[0].n), boutsBefore, 'reconciliation never creates a bout');
});

test('Florida "Pro Debut" (migration 0054): 0-0-0-0 with its own basis; Florida may write nothing else; debut after a verified bout is CONFLICT', async () => {
  const FL = 'https://www2.myfloridalicense.com/pro/sbc/documents/10-01-2026-Synthetic-results_without_med.pdf';
  const flClaim = (over) => claim({ source_key: 'florida_athletic_commission', source_url: FL, claim_basis: 'explicit_pro_debut_marker', raw_record: 'Pro Debut',
    wins: 0, losses: 0, draws: 0, no_contests: 0, ...over });
  const [newcomer] = await q(`insert into public.boxing_fighters (display_name, normalized_name, identity_state) values ('Fresh Debutant', 'fresh debutant', 'verified') returning id`);
  const debut = { fighter_id: newcomer.id, source_external_id: 'fl:2026-10-01:1:a', effective_as_of: '2026-10-01' };
  assert.deepEqual([(await flClaim(debut)).status, (await flClaim(debut)).status], ['created', 'duplicate'], 'rerun is idempotent');
  const [row] = await q(`select raw_record, claim_basis, wins, losses, draws, no_contests from public.boxing_fighter_record_claims where source_external_id = 'fl:2026-10-01:1:a'`);
  assert.deepEqual(row, { raw_record: 'Pro Debut', claim_basis: 'explicit_pro_debut_marker', wins: 0, losses: 0, draws: 0, no_contests: 0 }, 'raw "Pro Debut" preserved; never printed as "0-0"');
  assert.equal((await recon(newcomer.id)).classification, 'COMPLETE', 'nothing before a debut is missing');

  await assert.rejects(flClaim({ fighter_id: newcomer.id, source_external_id: 'fl:x:n', effective_as_of: '2026-10-02', claim_basis: 'printed_record', raw_record: '1-0', wins: 1, losses: 0, draws: null, no_contests: null }),
    /lane_not_rights_approved: record_entering is basis_not_permitted for source florida_athletic_commission/, 'Florida prints no numeric record');
  await assert.rejects(flClaim({ fighter_id: newcomer.id, source_external_id: 'fl:x:bad', effective_as_of: '2026-10-02', wins: 1 }), /check/i, 'a Pro Debut claim is 0-0-0-0 or nothing');

  // Florida says "Pro Debut" on 2026-10-01, but the ledger already holds this boxer's 2026-09-05 professional bout
  const alphaId = await fighter('Bravo Synthetic');
  const boutsBefore = Number((await q(`select count(*) n from public.boxing_bouts`))[0].n);
  await flClaim({ fighter_id: alphaId, source_external_id: 'fl:2026-10-01:2:a', effective_as_of: '2026-10-01' });
  const r = await recon(alphaId);
  assert.equal(r.classification, 'CONFLICT');
  assert.equal(r.sourced_record.claim_basis, 'explicit_pro_debut_marker');
  assert.equal(Number((await q(`select count(*) n from public.boxing_bouts`))[0].n), boutsBefore, 'the earlier verified bout is never removed');
  assert.ok((await q(`select 1 from public.boxing_fighter_record_claims where source_external_id = 'fl:2026-10-01:2:a'`)).length, 'and the debut claim is kept beside it');
});
