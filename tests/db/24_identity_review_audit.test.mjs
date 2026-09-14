// Human identity review is auditable end to end, on Tennessee-shaped sheets (a printed name and a weight, no place):
// an approval, a hold and a rejected candidate each leave a named, timestamped, evidenced row; source observations and
// aliases are never rewritten; re-applying the stored sheet is deterministic; every decision traces to its document.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { reapplyStoredDocuments, runCommissionIngest } from '../../shared/commissions/run.mjs';
import { buildIdentityReviewReport } from '../../shared/identity/review-assist.mjs';
import { applyApprovedBatch, proposeReviewBatch } from '../../shared/identity/human-review.mjs';
import { decodePages, encodePages, tennesseePages } from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const ENV = { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' };
const DOCS = 'https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/';
const site = new Map();
const fakeFetch = async (url) => (site.has(String(url)) ? new Response(site.get(String(url)), { status: 200 }) : new Response('not found', { status: 404 }));
const row = (date, type, name, file) => `</tr><tr><td>${date}</td>\n<td>${type}</td>\n<td>Nashville</td>\n<td>${name}</td>\n<td><a href="/content/dam/tn/commerce/documents/regboards/athletic/results/2026/${file}.pdf">Results</a></td>\n`;
const ud = (n, a, b, wa, wb) => ({ n, rds: 4, a: { name: a, weight: wa }, b: { name: b, weight: wb }, winner: 'a',
  method: ['UNANIMOUS DECISION', 'REF: Rex Refone', 'Jan Alpha 40-36', 'Joe Bravo 39-37', 'Kim Charlie 39-37'] });
const cards = {
  'AUDIT-ONE_6-6': { date: '06 / 06 / 2026', bouts: [ud(1, 'Synth Alpha', 'Synth Bravo', 146, 147), ud(2, 'Synth Charlie', 'Synth Delta', 160, 159)] },
  // the same printed names a month later: no place is printed, so the resolver holds every repeat for a person
  'AUDIT-TWO_7-11': { date: '07 / 11 / 2026', bouts: [ud(1, 'Synth Alpha', 'Synth Victor', 147, 147), ud(2, 'Synth Bravo', 'Synth Whiskey', 148, 148), ud(3, 'Synth Charlie', 'Synth Xray', 190, 189)] },
  'AUDIT-THREE_8-15': { date: '08 / 15 / 2026', bouts: [ud(1, 'Synth Alpha', 'Synth Yankee', 146, 146)] },
};
const ingest = (now) => runCommissionIngest(store, ENV, { adapterKey: 'tennessee', fetchImpl: fakeFetch, now, extract: decodePages, mode: 'backfill', years: [2026] });
const setIndex = (files) => site.set('https://www.tn.gov/commerce/regboards/athletic/events.html', `<table><tbody><tr><th>Date</th>${files.map((f) => row(cards[f].date.replace(/ /g, '').replace(/^0|\/0/g, (m) => m.replace('0', '')), 'Pro Boxing', 'Audit', f)).join('')}</tr></tbody></table>`);

before(async () => {
  db = await freshDatabase('identity_review_audit');
  store = pgStore(db.client);
  for (const [f, c] of Object.entries(cards)) site.set(`${DOCS}${f}.pdf`, encodePages(tennesseePages({ date: c.date, venue: 'AUDIT HALL', bouts: c.bouts })));
  setIndex(['AUDIT-ONE_6-6', 'AUDIT-TWO_7-11']);
  await ingest('2026-07-12T12:00:00Z');
});
after(async () => { await db?.close(); });

const observationsSnapshot = async () => new Map((await q(`select o.id, md5(o.payload::text) h, o.content_hash, o.observed_at from public.boxing_source_observations o
  join public.boxing_sources s on s.id = o.source_id where s.source_key = 'tn_athletic_commission'`)).map((r) => [r.id, `${r.h}|${r.content_hash}|${r.observed_at.toISOString()}`]));
const decisionsFor = (name, docFile) => q(`select d.* from public.boxing_identity_appearance_decisions d where d.observed_name = $1 and d.bout_external_id like $2 order by d.seq`, [name, `${docFile}%`]);

test('approve, hold and reject: named, timestamped, evidenced rows; observations and aliases untouched; deterministic re-apply; traceable to the document', async () => {
  const report = await buildIdentityReviewReport(store, { sourceKeys: ['tn_athletic_commission'] });
  const proposal = await proposeReviewBatch(store, report, { batchId: 'audit-001', size: 50, sources: ['tn_athletic_commission'] });
  const held = (name) => proposal.batch.find((e) => e.appearance.display_name === name && e.evidence.event_date === '2026-07-11');
  const [alpha, bravo, charlie] = ['Synth Alpha', 'Synth Bravo', 'Synth Charlie'].map(held);
  assert.ok(alpha && bravo && charlie, 'the three repeat appearances wait for review');
  // advice only: weight + venue continuity is offered as a match; a 30 lb jump is a contradiction and never is
  assert.equal(alpha.recommendation, 'match');
  assert.notEqual(charlie.recommendation, 'match');
  assert.ok(charlie.evidence.contradictions.some((c) => c.startsWith('weight_')));
  assert.ok([alpha, bravo, charlie].every((e) => e.reviewer_decision === null), 'the workbench fills in no decision');
  const alphaFighter = alpha.proposed_boxer.fighter_id;
  const charlieCandidate = charlie.proposed_boxer.fighter_id;

  const observationsBefore = await observationsSnapshot();
  const aliasesBefore = await q(`select id, fighter_id, alias, normalized, kind, verification_state from public.boxing_fighter_aliases where fighter_id = $1 order by id`, [alphaFighter]);
  const boutsBefore = Number((await one(`select count(*)::int n from public.boxing_bouts`)).n);

  const decided = {
    ...proposal,
    batch: [
      { ...alpha, reviewer_decision: 'approve_match', reviewer_note: 'Same boxer: same commission and venue, 146 then 147 lb a month apart.' },
      { ...bravo, reviewer_decision: 'hold', reviewer_note: 'Weights agree but nothing else links the two sheets. Leave held.' },
      { ...charlie, reviewer_decision: 'reject_candidate', reviewer_note: '160 lb in June vs 190 lb in July: not the same Synth Charlie.' },
    ],
  };
  const results = await applyApprovedBatch(store, decided, { reviewer: 'Pat Reviewer', reviewedAt: '2026-09-14T10:00:00Z' });
  assert.deepEqual(results.map((r) => [r.status, r.decision]), [['recorded', 'matched'], ['recorded', 'review'], ['recorded', 'review']]);

  // 1. reviewer identity, timestamp, batch, note and the evidence that was shown
  for (const [name, reviewerDecision] of [['Synth Alpha', 'approve_match'], ['Synth Bravo', 'hold'], ['Synth Charlie', 'reject_candidate']]) {
    const rows = await decisionsFor(name, '2026-07-11');
    const human = rows.filter((r) => r.decided_by !== 'resolver');
    assert.equal(human.length, 1, `${name}: one human row`);
    const h = human[0];
    assert.deepEqual([h.reviewer, h.decided_by, new Date(h.reviewed_at).toISOString(), h.review_batch], ['Pat Reviewer', 'reviewer:Pat Reviewer', '2026-09-14T10:00:00.000Z', 'audit-001']);
    assert.ok(h.review_note.length >= 20 && h.evidence.reviewer_decision === reviewerDecision && h.evidence_hash.length === 64);
    assert.equal(h.evidence.shown_to_reviewer.source_url, `${DOCS}AUDIT-TWO_7-11.pdf`, `${name}: the evidence names the exact official document`);
    // the resolver's earlier review row is kept, and the human row points at it
    const resolverRow = rows.find((r) => r.decided_by === 'resolver' && r.seq < h.seq);
    assert.ok(resolverRow && String(h.supersedes_seq) === String(resolverRow.seq), `${name}: supersedes the row the reviewer saw`);
  }
  const charlieRow = (await decisionsFor('Synth Charlie', '2026-07-11')).find((r) => r.decided_by !== 'resolver');
  assert.equal(charlieRow.evidence.rejected_candidate.fighter_id, charlieCandidate, 'the rejected candidate is recorded');
  assert.equal(charlieRow.fighter_id, null);

  // 2. hold and reject leave the identity held: queue items still pending, no fighter created, their bouts still blocked
  const pending = await q(`select raw_name, status from public.boxing_identity_review_queue where namespace = 'tn-athletic-commission.fighter' order by raw_name`);
  assert.deepEqual(pending.filter((p) => ['Synth Bravo', 'Synth Charlie'].includes(p.raw_name)).map((p) => p.status), ['pending', 'pending']);

  // 3. appearance history: the source observations are unchanged (no row rewritten, none removed)
  const observationsAfterDecision = await observationsSnapshot();
  for (const [id, sig] of observationsBefore) assert.equal(observationsAfterDecision.get(id), sig, `observation ${id} unchanged`);
  await assert.rejects(q(`update public.boxing_source_observations set payload = '{}'::jsonb where id = $1`, [[...observationsBefore.keys()][0]]), /append-only|not allowed|immutable/i);
  await assert.rejects(q(`update public.boxing_identity_appearance_decisions set reviewer = 'Someone Else' where reviewer = 'Pat Reviewer'`), /append-only|not allowed|immutable/i);
  await assert.rejects(q(`delete from public.boxing_identity_appearance_decisions where reviewer = 'Pat Reviewer'`), /append-only|not allowed|immutable/i);

  // 4. materialize exactly the reviewed binding; aliases only grow; then the same re-apply again changes nothing
  const secondDoc = 'tn-results:2026/AUDIT-TWO_7-11';
  const seqBefore = Number((await one(`select max(seq) m from public.boxing_identity_appearance_decisions`)).m);
  const r1 = await reapplyStoredDocuments(store, { adapterKey: 'tennessee', now: '2026-09-14T11:00:00Z', graphResolve: false, docKeys: [secondDoc] });
  assert.equal(r1.status, 'ok');
  assert.equal(Number((await one(`select count(*)::int n from public.boxing_bouts`)).n), boutsBefore + 1, 'only the approved appearance unlocks a bout');
  const alphaBout = await one(`select b.id, b.public_id from public.boxing_bouts b join public.boxing_bout_identities i on i.bout_id = b.id
    where i.namespace = 'tn-athletic-commission.bout' and i.external_id = $1`, [alpha.appearance.bout_external_id]);
  assert.ok(alphaBout, 'the approved appearance is now a canonical bout');
  const corner = await one(`select fighter_id from public.boxing_bout_participants where bout_id = $1 and side = 'a'`, [alphaBout.id]);
  assert.equal(corner.fighter_id, alphaFighter, 'bound to the approved boxer, not a new one');
  const aliasesAfter = await q(`select id, fighter_id, alias, normalized, kind, verification_state from public.boxing_fighter_aliases where fighter_id = $1 order by id`, [alphaFighter]);
  for (const a of aliasesBefore) assert.deepEqual(aliasesAfter.find((x) => x.id === a.id), a, 'existing aliases are kept as they were');
  assert.equal(Number((await one(`select count(*)::int n from public.boxing_identity_appearance_decisions where seq > $1`, [seqBefore])).n), 0, 'the re-apply records no decision');
  const boutsAfterFirst = Number((await one(`select count(*)::int n from public.boxing_bouts`)).n);
  const r2 = await reapplyStoredDocuments(store, { adapterKey: 'tennessee', now: '2026-09-14T11:05:00Z', graphResolve: false, docKeys: [secondDoc] });
  assert.equal(r2.passes[0].bouts_linked, r1.passes[0].bouts_linked, 'deterministic');
  assert.equal(Number((await one(`select count(*)::int n from public.boxing_bouts`)).n), boutsAfterFirst, 'idempotent: no duplicate bout');
  const observationsAfterReapply = await observationsSnapshot();
  for (const [id, sig] of observationsBefore) assert.equal(observationsAfterReapply.get(id), sig, `observation ${id} still unchanged after re-apply`);

  // 5. audit trail back to the exact commission document, from the canonical bout
  const trail = await one(`select d.reviewer, d.review_batch, d.bout_external_id, o.external_key doc_key, o.source_url, rev.revision, rev.sha256
    from public.boxing_bout_identities i
    join public.boxing_identity_appearance_decisions d on d.namespace = 'tn-athletic-commission.fighter' and d.appearance_key = i.external_id || '|a' and d.decided_by <> 'resolver'
    join public.boxing_source_observations o on o.entity_type = 'commission_results_document' and o.payload -> 'bouts' @> jsonb_build_array(jsonb_build_object('source_bout_id', i.external_id))
    join public.boxing_source_documents doc on doc.doc_key = o.external_key
    join public.boxing_source_document_revisions rev on rev.document_id = doc.id and rev.observation_id = o.id
    where i.bout_id = $1`, [alphaBout.id]);
  assert.deepEqual([trail.reviewer, trail.review_batch, trail.doc_key, trail.source_url, trail.revision], ['Pat Reviewer', 'audit-001', secondDoc, `${DOCS}AUDIT-TWO_7-11.pdf`, 1]);
  assert.match(trail.sha256, /^[0-9a-f]{64}$/, 'down to the document revision hash');

  // 6. a later appearance of the same printed name is not bound by the earlier human decision alone
  setIndex(['AUDIT-ONE_6-6', 'AUDIT-TWO_7-11', 'AUDIT-THREE_8-15']);
  await ingest('2026-08-16T12:00:00Z');
  const later = await decisionsFor('Synth Alpha', '2026-08-15');
  assert.ok(later.length && later.every((d) => d.decided_by === 'resolver' && d.decision === 'review'), 'the August appearance waits for its own review');
  const again = await proposeReviewBatch(store, await buildIdentityReviewReport(store, { sourceKeys: ['tn_athletic_commission'] }), { batchId: 'audit-002', size: 50, sources: ['tn_athletic_commission'] });
  const august = again.batch.find((e) => e.appearance.display_name === 'Synth Alpha' && e.evidence.event_date === '2026-08-15');
  const shown = august.evidence.candidates.find((c) => c.fighter_id === alphaFighter);
  assert.equal(shown.verified_bouts, 2, 'the approved bout now counts in the evidence the next reviewer sees');
});
