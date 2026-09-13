// Issue #10 regressions against a real database: legitimate Team Boxing League repeat
// pairings, preserved parser-correction history, the May 1 second meetings (batch 002
// shape), and a true duplicate canonical bout. Documents are synthetic fixtures built
// with the names from the official Florida sheets; no real document is committed.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCommissionParsed } from '../../shared/commissions/apply.mjs';
import { reapplyStoredDocuments } from '../../shared/commissions/run.mjs';
import { FLORIDA, parseFloridaResults, parseResultsListing } from '../../shared/adapters/commissions/florida.mjs';
import { classifyCandidateBouts, historyLine } from '../../shared/identity/bout-history.mjs';
import { applyApprovedBatch, batchFromDryRun, dangerFlags, simulateResolverOnBlockedBouts } from '../../shared/identity/human-review.mjs';
import { contentHash } from '../../shared/canonical.mjs';
import { manualProvenance } from '../../shared/provenance.mjs';
import { floridaPages } from '../fixtures/commissions/synthetic.mjs';

const DOCS = 'https://www2.myfloridalicense.com/pro/sbc/documents/';
const officials = ['Judges: Juan Uno, Jo Dos, Jay Tres;', 'Referee: Ref Floridian'];
const fight = (n, a, b, winner) => ({ n, sport: ['Boxing'], rds: 3, decision: ['Unanimous', 'Decision'], officials,
  a: { ...a, result: winner === 'a' ? 'Win' : null }, b: { ...b, result: winner === 'b' ? 'Win' : null } });
const listingFor = (file, label) => parseResultsListing(`<a href="${DOCS}${file}.pdf">${label}</a>`)[0];
const stored = async (store, file, label, pages) => {
  // register the parse as the stored observation the re-apply and dry run read
  const ref = listingFor(file, label);
  const parsed = parseFloridaResults(ref, pages, { capturedAt: '2026-09-13T12:00:00Z' });
  await store.recordObservation({ source_key: FLORIDA.sourceKey, entity_type: 'commission_results_document', external_key: ref.doc_key, source_url: ref.url,
    content_hash: await contentHash({ file, v: FLORIDA.version }), parser_version: FLORIDA.version, source_published_at: '2026-09-13T12:00:00Z',
    payload: { doc_key: ref.doc_key, url: ref.url, events: parsed.events, bouts: parsed.bouts } });
  return { ref, parsed };
};
const idOf = async (db, name) => (await db.client.query('select id from public.boxing_fighters where display_name = $1', [name])).rows[0]?.id;

// ---------------------------------------------------------------------------------------------
// 1. June 26: three repeat pairings, two of them with preserved parser-correction history
// ---------------------------------------------------------------------------------------------
let june;
before(async () => {
  june = { db: await freshDatabase('repeat_pairings_june') };
  june.store = pgStore(june.db.client);
});
after(async () => { await june?.db?.close(); await may?.db?.close(); });

const JUNE_FILE = '06-26-2026-Team_Boxing_League-results_without_med';
const JUNE_BOUTS = [
  fight(3, { name: 'Shelby Cannon', home: 'Tampa, FL', weight: 129.4 }, { name: 'Samantha Ginithan', home: 'Las Cruces, NM', weight: 129.4 }, 'a'),
  fight(11, { name: 'Suzana Rodriguez Griffin', home: 'Miami, FL', weight: 146 }, { name: 'Sofia Viretti', home: 'Argentina', weight: 146 }, 'a'),
  fight(13, { name: 'Juan Barajas', home: 'Orlando, FL', weight: 172 }, { name: 'Yusmel Alejandro Ruiz', home: 'Cuba', weight: 172.4 }, 'b'),
  fight(20, { name: 'Suzana Rodriguez Griffin', home: 'Miami, FL', weight: 146 }, { name: 'Sofia Viretti', home: 'Argentina', weight: 146 }, 'b'),
  fight(21, { name: 'Juan Barajas', home: 'Orlando, FL', weight: 172 }, { name: 'Yusmel Alejandro Ruiz', home: 'Cuba', weight: 172.4 }, 'b'),
  fight(23, { name: 'Shelby Cannon', home: 'Tampa, FL', weight: 129.4 }, { name: 'Samantha Ginithan', home: 'Las Cruces, NM', weight: 129.4 }, 'b'),
];

test('June 26 repeat pairings stay distinct bouts with |2 ids and sheet orders; parser corrections are preserved apart from the current result', async () => {
  const { store, db } = june;
  const pages = floridaPages({ date: '06/26/2026', promoter: 'Team Boxing League', venue: 'Fort Lauderdale, FL / FTL War Memorial', bouts: JUNE_BOUTS });
  const { parsed } = await stored(store, JUNE_FILE, 'June 26, 2026 – Team Boxing League – Fort Lauderdale', pages);
  // parser 1.0.0 behaviour: both meetings of each pairing shared one source bout id
  const legacy = structuredClone(parsed);
  for (const b of legacy.bouts) b.source_bout_id = b.source_bout_id.replace(/\|2$/, '');
  await applyCommissionParsed(store, FLORIDA, legacy, { now: '2026-09-13T12:00:00Z' });
  // parser 1.0.1: distinct ids; the re-parse restores meeting 1 with an explicit reason
  await applyCommissionParsed(store, FLORIDA, parsed, { now: '2026-09-13T13:00:00Z', changeReason: 'reparsed_with_florida-athletic-commission@1.0.1' });

  const cases = [
    ['Yusmel Alejandro Ruiz', 'Juan Barajas', [[13, 1, 'win'], [21, 2, 'win']]],
    ['Sofia Viretti', 'Suzana Rodriguez Griffin', [[11, 1, 'loss'], [20, 2, 'win']]],
    ['Samantha Ginithan', 'Shelby Cannon', [[3, 1, 'loss'], [23, 2, 'win']]],
  ];
  for (const [boxer, opponent, expected] of cases) {
    const [ctx] = await store.identityGraphContext([await idOf(db, boxer)]);
    const history = classifyCandidateBouts(ctx.bouts).filter((h) => h.opponent === opponent);
    assert.equal(history.length, 2, `${boxer}: two canonical bouts vs ${opponent}`);
    assert.deepEqual(history.map((h) => [h.bout_order, h.repeat_index, h.current_result.result]), expected, `${boxer}: order, repeat index, current result`);
    assert.ok(history.every((h) => h.pairing === 'repeat_pairing'), `${boxer}: repeat pairing, not a duplicate`);
    assert.ok(history[1].source_bout_ids[0].endsWith('|2') && !history[0].source_bout_ids[0].endsWith('|2'));
    assert.match(historyLine(history[1]), /\|2 \[repeat_pairing: meeting 2 of 2 on the same card\]/);
    assert.deepEqual(dangerFlags({ observedName: boxer, observedHometown: null, candidate: { fighter_id: ctx.id, display_name: boxer, name_level: 'exact', hometowns: [], bout_history: history }, nameIndex: [] })
      .filter((f) => f.kind === 'candidate_record_has_possible_duplicate_bout'), [], `${boxer}: no duplicate danger for a repeat pairing`);
  }

  // preserved parser correction vs current canonical result
  const [sofia] = await store.identityGraphContext([await idOf(db, 'Sofia Viretti')]);
  const meeting1 = classifyCandidateBouts(sofia.bouts).find((h) => h.bout_order === 11);
  assert.deepEqual([meeting1.current_result.revision, meeting1.current_result.result, meeting1.current_result.is_parser_correction], [3, 'loss', true]);
  assert.deepEqual(meeting1.preserved_history.map((p) => [p.revision, p.result, p.kind]),
    [[1, 'loss', 'superseded_by_parser_correction'], [2, 'win', 'superseded_by_parser_correction']], 'the false revision stays, labelled');
  const [yusmel] = await store.identityGraphContext([await idOf(db, 'Yusmel Alejandro Ruiz')]);
  assert.ok(classifyCandidateBouts(yusmel.bouts).every((h) => h.current_result.result === 'win'), 'Ruiz won both meetings');
  assert.deepEqual(await store.possibleDuplicateBouts(), [], 'legitimate repeat pairings are never reported as duplicates');
});

test('a true duplicate canonical bout remains distinguishable from a legitimate repeat pairing', async () => {
  const { store, db } = june;
  const other = await testSource(db.client, 'duplicate_fixture_commission', { source_kind: 'commission' });
  const sofiaId = await idOf(db, 'Sofia Viretti');
  const griffinId = await idOf(db, 'Suzana Rodriguez Griffin');
  // the same June 26 meeting recorded a second time on a separate event row with no source bout identity
  const ev = await store.upsertEvent({ source_key: other.source_key, namespace: 'dup-fixture.event', external_id: 'dup-2026-06-26', name: 'Duplicate Row',
    event_date: '2026-06-26', status: 'complete' });
  await store.addBout({ source_key: other.source_key, event_id: ev.event_id, fighter_a_id: griffinId, fighter_b_id: sofiaId, status: 'complete', bout_order: 11 });
  const [ctx] = await store.identityGraphContext([sofiaId]);
  const history = classifyCandidateBouts(ctx.bouts).filter((h) => h.opponent === 'Suzana Rodriguez Griffin');
  assert.equal(history.length, 3, 'two legitimate meetings plus the duplicate row');
  const duplicate = history.find((h) => h.source_bout_ids.length === 0);
  assert.equal(duplicate.pairing, 'possible_duplicate_canonical_bout');
  assert.match(duplicate.pairing_detail, /different event row/);
  const meeting2 = history.find((h) => h.repeat_index === 2);
  assert.equal(meeting2.pairing, 'possible_duplicate_canonical_bout', 'a meeting that has a duplicate row alongside it is surfaced, not hidden');
  const flags = dangerFlags({ observedName: 'Sofia Viretti', observedHometown: null,
    candidate: { fighter_id: sofiaId, display_name: 'Sofia Viretti', name_level: 'exact', hometowns: [], bout_history: history }, nameIndex: [] });
  assert.ok(flags.some((f) => f.kind === 'candidate_record_has_possible_duplicate_bout'), 'duplicate surfaced as danger evidence');
  const dups = await store.possibleDuplicateBouts();
  assert.equal(dups.length, 2, 'the duplicate row pairs with each legitimate meeting');
  assert.ok(dups.every((d) => d.reason === 'same_pair_different_event_rows_within_a_day'));
  const repeatIds = history.filter((h) => h.source_bout_ids.length).map((h) => h.bout_id);
  assert.ok(!dups.some((d) => repeatIds.includes(d.bout_a) && repeatIds.includes(d.bout_b)), 'the two legitimate meetings are not a duplicate of each other');
  // the repeat pairing alone (without the duplicate row) is not a danger: asserted in the previous test
});

// ---------------------------------------------------------------------------------------------
// 2. May 1: second meetings (batch 002 shape) after a human bound the first meetings
// ---------------------------------------------------------------------------------------------
let may;
test('May 1 second meetings: resolver proposes Tier A repeat_pairing_identity_continuity (not same fight); nothing is applied without a human', async () => {
  may = { db: await freshDatabase('repeat_pairings_may') };
  const { db } = may;
  const store = may.store = pgStore(db.client);
  const prov = manualProvenance({ workerName: 'tests/db/15', runtime: 'node test', trigger: 'backfill' });
  // earlier cards create the boxers; country-level hometowns keep the May 1 appearances in review
  const march = await stored(store, '03-07-2026-Graph_March-results_without_med', 'March 7, 2026 – Graph March – Orlando', floridaPages({
    date: '03/07/2026', promoter: 'Graph March', venue: 'Orlando, FL / Hall', bouts: [
      fight(1, { name: 'Sofia Viretti', home: 'Argentina', weight: 147 }, { name: 'Early Opponent', home: 'Orlando, FL', weight: 147 }, 'a'),
      fight(2, { name: 'Esteuri Suero', home: 'Dominican Republic', weight: 151 }, { name: 'Other Early', home: 'Orlando, FL', weight: 151 }, 'a')] }));
  await applyCommissionParsed(store, FLORIDA, march.parsed, { now: '2026-09-13T12:00:00Z' });
  const MAY = floridaPages({ date: '05/01/2026', promoter: 'Team Boxing League', venue: 'Fort Lauderdale, FL / War Memorial Auditorium', bouts: [
    fight(12, { name: 'Ariele Davis', home: 'Miami, FL', weight: 146 }, { name: 'Sofia Viretti', home: 'Argentina', weight: 145.8 }, 'a'),
    fight(14, { name: 'Doctress Robinson', home: 'Tampa, FL', weight: 151 }, { name: 'Esteuri Suero', home: 'Dominican Republic', weight: 151.6 }, 'b'),
    fight(20, { name: 'Ariele Davis', home: 'Miami, FL', weight: 146 }, { name: 'Sofia Viretti', home: 'Argentina', weight: 146 }, 'b'),
    fight(22, { name: 'Doctress Robinson', home: 'Tampa, FL', weight: 151 }, { name: 'Esteuri Suero', home: 'Dominican Republic', weight: 151 }, 'b')] });
  const mayDoc = await stored(store, '05-01-2026-Team_Boxing_League-results_without_med', 'May 1, 2026 – Team Boxing League – Fort Lauderdale', MAY);
  await applyCommissionParsed(store, FLORIDA, mayDoc.parsed, { now: '2026-09-13T12:10:00Z' });
  const count = async (sql) => Number((await db.client.query(`select count(*)::int n from public.${sql}`)).rows[0].n);
  assert.equal(await count(`boxing_bouts b join public.boxing_events e on e.id = b.event_id where e.event_date = '2026-05-01'`), 0, 'all four May 1 bouts blocked');

  // a named human approves the FIRST meetings only (batch 001 shape)
  for (const name of ['Sofia Viretti', 'Esteuri Suero']) {
    const b = mayDoc.parsed.bouts.find((x) => x.fighter_b.display_name === name && !x.source_bout_id.endsWith('|2'));
    const latest = (await store.appearanceLatest('fl-athletic-commission.fighter', [`${b.source_bout_id}|b`]))[`${b.source_bout_id}|b`];
    await store.recordAppearanceDecision({ source_key: FLORIDA.sourceKey, namespace: 'fl-athletic-commission.fighter', bout_external_id: b.source_bout_id, side: 'b',
      observed_name: name, decision: 'matched', tier: 'C', fighter_id: await idOf(db, name), confidence: 100, evidence: { fixture: true }, evidence_hash: `h-${name}`,
      resolver_version: 'human-review:test', decided_by: 'reviewer:Test Reviewer', reviewer: 'Test Reviewer', review_note: 'fixture approval of the first meeting only',
      review_batch: 'fixture-001', supersedes_seq: latest?.seq ?? null });
  }
  const seqBefore = Number((await db.client.query('select max(seq) m from public.boxing_identity_appearance_decisions')).rows[0].m);
  await reapplyStoredDocuments(store, { adapterKey: 'florida', provenance: prov, graphResolve: false, docKeys: [mayDoc.ref.doc_key] });
  assert.equal(await count(`boxing_bouts b join public.boxing_events e on e.id = b.event_id where e.event_date = '2026-05-01'`), 2, 'exactly the two approved first meetings');
  assert.equal(await count(`boxing_identity_appearance_decisions where seq > ${seqBefore}`), 0, 'no automatic decision');

  // the resolver's proposals for the second meetings, read-only
  const dry = await simulateResolverOnBlockedBouts(store, { batchId: 'fixture-002' });
  const second = (name) => dry.proposals.find((p) => p.name === name);
  for (const name of ['Sofia Viretti', 'Esteuri Suero']) {
    const p = second(name);
    assert.ok(p, `${name} second meeting proposed`);
    assert.ok(p.appearance_key.endsWith('|2|b'));
    assert.deepEqual([p.would.tier, p.would.confidence, p.would.reason], ['A', 98, 'repeat_pairing_identity_continuity']);
    assert.ok(p.evidence_for.includes('repeat_pairing_identity_continuity') && !p.evidence_for.includes('same_fight_already_on_record'));
    assert.equal(p.appearance_bout.repeat_index, 2);
    assert.equal(p.bout_would_be_created, true);
    const firstMeeting = p.candidate_record.find((h) => h.date === '2026-05-01');
    assert.equal(firstMeeting.repeat_index, 1, 'candidate record shows the FIRST meeting as a different bout');
    assert.deepEqual(p.competing, []);
    assert.deepEqual(p.evidence_against, []);
  }
  assert.equal(await count(`boxing_identity_appearance_decisions where seq > ${seqBefore}`), 0, 'dry run records nothing');

  const batch = await batchFromDryRun(store, dry, { batchId: 'fixture-002' });
  assert.equal(batch.batch.length, 2);
  assert.ok(batch.batch.every((e) => e.reviewer_decision === null && e.reviewer_note === null), 'no reviewer consent is manufactured');
  assert.ok(batch.batch.every((e) => e.evidence.resolver_reason === 'repeat_pairing_identity_continuity' && e.evidence.appearance_bout.repeat_index === 2));
  assert.equal(await count(`boxing_bouts b join public.boxing_events e on e.id = b.event_id where e.event_date = '2026-05-01'`), 2, 'still two bouts: nothing applied');

  // a named human approves ONE entry: it materializes; re-submitting it once its bout exists is refused as stale
  const sofia = batch.batch.find((e) => e.appearance.display_name === 'Sofia Viretti');
  const approved = { ...batch, batch: [{ ...sofia, reviewer_decision: 'approve_match', reviewer_note: 'fixture approval of the second meeting (repeat pairing)' }] };
  const first = await applyApprovedBatch(store, approved, { reviewer: 'Test Reviewer' });
  assert.equal(first[0].status, 'recorded');
  await reapplyStoredDocuments(store, { adapterKey: 'florida', provenance: prov, graphResolve: false, docKeys: [mayDoc.ref.doc_key] });
  assert.equal(await count(`boxing_bouts b join public.boxing_events e on e.id = b.event_id where e.event_date = '2026-05-01'`), 3, 'exactly the approved second meeting added');
  const human = (await db.client.query(`select seq, evidence #>> '{shown_to_reviewer,resolver_reason}' reason from public.boxing_identity_appearance_decisions where appearance_key = $1 order by seq desc limit 1`, [`${sofia.appearance.bout_external_id}|b`])).rows[0];
  assert.equal(human.reason, 'repeat_pairing_identity_continuity', 'the repeat-pairing evidence is preserved on the human row');
  const rowsBefore = await count('boxing_identity_appearance_decisions');
  const again = await applyApprovedBatch(store, { ...approved, batch: [{ ...approved.batch[0], appearance: { ...approved.batch[0].appearance, latest_decision_seq: Number(human.seq) } }] }, { reviewer: 'Test Reviewer' });
  assert.equal(again[0].status, 'refused_bout_already_canonical');
  assert.equal(await count('boxing_identity_appearance_decisions'), rowsBefore, 'nothing written for a stale approval');
});
