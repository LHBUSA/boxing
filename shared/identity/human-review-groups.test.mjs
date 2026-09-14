import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyApprovedBatch, groupEntries } from './human-review.mjs';

const entry = (id, over = {}) => {
  const e = {
    entry_id: id, source_key: 'pa_state_athletic_commission', state: 'PA',
    appearance: { namespace: 'pa-state-athletic-commission.fighter', bout_external_id: `bout-${id}`, side: 'a', printed_name: 'Synth Alpha', display_name: 'Synth Alpha', document: 'doc', latest_decision_seq: null },
    evidence: { event_date: '2026-01-01', city_hometown: { observed: 'PA', observed_city_level: null, candidate: [] }, weight: { official_lb: 147 }, competing_candidates: [], contradictions: [] },
    proposed_boxer: null, danger: [], recommendation: 'distinct_or_hold', recommendation_why: 'no name-similar canonical boxer', reviewer_decision: null, reviewer_note: null,
  };
  return { ...e, ...over, appearance: { ...e.appearance, ...over.appearance }, evidence: { ...e.evidence, ...over.evidence } };
};

test('grouping: exact normalized name + same stated place + same proposal + distinct dates + consistent weights', () => {
  const groups = groupEntries([
    entry('1', { evidence: { event_date: '2026-01-10', weight: { official_lb: 146 } } }),
    entry('2', { evidence: { event_date: '2026-03-07', weight: { official_lb: 150 } } }),
    entry('3', { evidence: { event_date: '2026-05-01', weight: { official_lb: 151 } } }),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].members, ['1', '2', '3']);
  assert.match(groups[0].basis, /distinct dates/);
});

test('grouping never joins people the evidence separates', () => {
  const none = (entries, why) => assert.equal(groupEntries(entries).length, 0, why);
  none([entry('1'), entry('2', { appearance: { display_name: 'Synth Alphonso' } })], 'similar but different names');
  none([entry('1', { evidence: { event_date: '2026-01-10' } }), entry('2', { evidence: { event_date: '2026-01-10' } })], 'same date: two people');
  none([entry('1', { evidence: { event_date: '2026-01-10' } }), entry('2', { evidence: { event_date: '2026-02-10', city_hometown: { observed: 'NJ', observed_city_level: null, candidate: [] } } })], 'different stated place');
  none([entry('1', { evidence: { event_date: '2026-01-10', weight: { official_lb: 126 } } }), entry('2', { evidence: { event_date: '2026-02-10', weight: { official_lb: 160 } } })], 'weights too far apart');
  none([entry('1', { evidence: { event_date: '2026-01-10' } }), entry('2', { evidence: { event_date: '2026-02-10' }, danger: [{ kind: 'same_name_multiple_canonical_boxers', detail: 'x' }] })], 'namesake flag');
  none([entry('1', { evidence: { event_date: '2026-01-10' } }), entry('2', { evidence: { event_date: '2026-02-10' }, proposed_boxer: { fighter_id: 'f1', display_name: 'Synth Alpha' } })], 'different proposals');
  none([entry('1', { evidence: { event_date: '2026-01-10', city_hometown: { observed: null, candidate: [] } } }), entry('2', { evidence: { event_date: '2026-02-10', city_hometown: { observed: null, candidate: [] } } })], 'no stated place');
});

function fakeStore() {
  const calls = [];
  let n = 0;
  return {
    calls,
    boutsForProviderEvents: async () => ({}),
    recordAppearanceDecision: async (p) => { calls.push(p); n += 1; return { status: 'recorded', decision_seq: n, fighter_id: p.decision === 'created' ? 'new-boxer-1' : p.fighter_id, review_items_closed: [] }; },
  };
}

test('a group decided distinct creates ONE boxer: the earliest appearance creates it, later members match it, every row audited', async () => {
  const members = [entry('1', { evidence: { event_date: '2026-01-10' } }), entry('2', { evidence: { event_date: '2026-03-07' } })];
  const [g] = groupEntries(members);
  const batch = { batch_id: 'T', workbench_version: 'v', batch: [members[1], members[0]], groups: [{ ...g, reviewer_decision: 'approve_distinct', reviewer_note: 'Same boxer on two Philadelphia cards; no other candidate exists.' }] };
  const store = fakeStore();
  const results = await applyApprovedBatch(store, batch, { reviewer: 'Pat Reviewer' });
  assert.deepEqual(store.calls.map((c) => [c.bout_external_id, c.decision, c.fighter_id]), [['bout-1', 'created', null], ['bout-2', 'matched', 'new-boxer-1']]);
  assert.ok(store.calls.every((c) => c.reviewer === 'Pat Reviewer' && c.review_note.length >= 20 && c.evidence.group.group_id === g.group_id));
  assert.equal(store.calls[1].evidence.group.matched_to_boxer_created_by_this_group, 'new-boxer-1');
  assert.ok(results.every((r) => r.group_id === g.group_id));
});

test('group apply refuses conflicting or unsafe input; automated reviewer names are refused', async () => {
  const members = [entry('1', { evidence: { event_date: '2026-01-10' } }), entry('2', { evidence: { event_date: '2026-03-07' } })];
  const [g] = groupEntries(members);
  const conflicting = { batch_id: 'T', workbench_version: 'v', batch: [{ ...members[0], reviewer_decision: 'hold', reviewer_note: 'individually decided member note' }, members[1]],
    groups: [{ ...g, reviewer_decision: 'approve_distinct', reviewer_note: 'group decision note long enough' }] };
  await assert.rejects(() => applyApprovedBatch(fakeStore(), conflicting, { reviewer: 'Pat Reviewer' }), /decide the group OR its entries/);
  const noNote = { batch_id: 'T', workbench_version: 'v', batch: members, groups: [{ ...g, reviewer_decision: 'approve_distinct', reviewer_note: 'short' }] };
  await assert.rejects(() => applyApprovedBatch(fakeStore(), noNote, { reviewer: 'Pat Reviewer' }), /20\+ characters/);
  await assert.rejects(() => applyApprovedBatch(fakeStore(), { ...noNote, groups: [] }, { reviewer: 'claude-review-bot' }), /named human reviewer/);
  const undecided = await applyApprovedBatch(fakeStore(), { batch_id: 'T', workbench_version: 'v', batch: members, groups: [g] }, { reviewer: 'Pat Reviewer' });
  assert.ok(undecided.every((r) => r.status === 'not_reviewed'), 'nothing is recorded without a human decision');
});
