import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appearanceClass, buildReviewManifest, manifestMarkdown } from './review-manifest.mjs';

const cand = (over = {}) => ({ fighter_id: 'f-rydell', display_name: 'Synth Rydell', identity_state: 'unverified', tier: 'C', confidence: 60, name_level: 'exact',
  aliases: [], hometowns: [], jurisdictions: ['tn-athletic-commission'], verified_bouts: 2, for: ['name_exact'], against: [], ...over });
const entry = (id, over = {}) => {
  const c = over.candidate === null ? null : cand(over.candidate);
  const e = {
    entry_id: `M:tn_athletic_commission:bout-${id}|${over.side ?? 'a'}`, review_item_id: over.item ?? 'item-rydell', source_key: 'tn_athletic_commission', state: 'TN',
    appearance: { namespace: 'tn-athletic-commission.fighter', bout_external_id: `bout-${id}`, side: over.side ?? 'a', printed_name: over.name ?? 'Synth Rydell', display_name: over.name ?? 'Synth Rydell', document: `tn-results:2025/DOC-${id}` },
    unlocks_bout_now: over.unlocks ?? false,
    evidence: { event_date: over.date ?? `2025-0${id}-01`, event: 'Synth Card', source_url: `https://www.tn.gov/x-${id}.pdf`, commission: 'tn-athletic-commission', opponent: over.opponent ?? 'Synth Opponent',
      held_reason: { queue_reason: 'insufficient_evidence', resolver: 'insufficient_evidence', resolver_tier: 'C' }, weight: { official_lb: over.weight ?? 200 },
      city_hometown: { observed: null, observed_city_level: null, candidate: [] }, candidates: c ? [c] : [], contradictions: over.against ?? [] },
    proposed_boxer: c ? { fighter_id: c.fighter_id, display_name: c.display_name, tier_by_resolver: c.tier } : null,
    danger: over.danger ?? [], recommendation: over.recommendation ?? 'hold', recommendation_why: 'not enough independent evidence', reviewer_decision: null, reviewer_note: null,
  };
  return e;
};

test('a name alone never reaches A or B; support and contradictions set the class', () => {
  assert.equal(appearanceClass(entry('1')).cls, 'D', 'exact name only');
  assert.equal(appearanceClass(entry('1', { candidate: null, recommendation: 'distinct_or_hold' })).cls, 'D', 'no candidate');
  assert.equal(appearanceClass(entry('1', { recommendation: 'match', candidate: { for: ['name_exact', 'weight_200_vs_198_on_2025-01-01', 'same_commission:tn-athletic-commission'] } })).cls, 'A');
  assert.equal(appearanceClass(entry('1', { recommendation: 'match', danger: [{ kind: 'common_surname' }], candidate: { for: ['name_exact', 'weight_200_vs_198_on_2025-01-01', 'same_commission:tn-athletic-commission'] } })).cls, 'B', 'a danger flag keeps it out of A');
  assert.equal(appearanceClass(entry('1', { candidate: { for: ['name_exact', 'same_commission:tn-athletic-commission'] } })).cls, 'D', 'name + the shared commission is not independent evidence');
  assert.equal(appearanceClass(entry('1', { candidate: { for: ['name_exact', 'weight_200_vs_198_on_2025-01-01'] } })).cls, 'D', 'name + a close weight alone is not enough');
  assert.equal(appearanceClass(entry('1', { against: ['fought_2025-01-01_at_other_event'] })).cls, 'C', 'same-date bout elsewhere');
  assert.equal(appearanceClass(entry('1', { against: ['weight_260_vs_150_on_2025-01-01'] })).cls, 'C', 'incompatible weight without continuity');
  assert.equal(appearanceClass(entry('1', { candidate: { name_level: 'initial', for: ['weight_200_vs_198_on_2025-01-01'] } })).cls, 'D', 'weight with a non-exact name form is not enough');
});

test('manifest ranks identities by bouts one review unlocks, counts joint unlocks, and decides nothing', () => {
  const proposal = { workbench_version: 'w', groups: [], batch: [
    entry('1', { unlocks: true, recommendation: 'match', candidate: { for: ['name_exact', 'weight_200_vs_198_on_2025-01-01', 'same_commission:tn-athletic-commission'] } }),
    entry('2', { unlocks: true, date: '2025-02-01', recommendation: 'match', candidate: { for: ['name_exact', 'weight_201_vs_200_on_2025-01-01', 'same_commission:tn-athletic-commission'] } }),
    entry('3', { date: '2025-03-01' }),
    // bout 3's other corner is held too: approving Rydell alone does not create it
    entry('3', { side: 'b', item: 'item-other', name: 'Synth Other', candidate: null, recommendation: 'distinct_or_hold' }),
  ] };
  const m = buildReviewManifest(proposal, { batchFiles: { '003': { batch: [proposal.batch[0]] } }, now: '2026-09-14T00:00:00Z' });
  const [rydell, other] = m.identities;
  assert.deepEqual([rydell.printed_name, rydell.rank, rydell.class, rydell.held_appearances, rydell.bouts_unlocked_by_this_identity_alone, rydell.bouts_unlocked_with_other_held_identities],
    ['Synth Rydell', 1, 'B', 3, 2, 1], 'appearances disagree (A, A, D): the identity is ambiguous, not A');
  assert.equal(rydell.decisions_required, 3, 'no stated place: no group, one decision per appearance');
  assert.deepEqual(rydell.appearances.map((a) => a.unlocks), ['bout_now', 'bout_now', 'needs:Synth Other']);
  assert.deepEqual(rydell.appearances.map((a) => a.in_batches), [['003'], [], []]);
  assert.ok(rydell.evidence_against.includes('no place printed on the sheet (cannot compare hometowns)'));
  assert.deepEqual([other.class, other.bouts_unlocked_by_this_identity_alone], ['D', 0]);
  assert.ok(m.identities.every((r) => r.reviewer_decision === null && r.reviewer_note === null));
  assert.deepEqual(m.summary.classes, { B: 1, D: 1 });
  assert.match(manifestMarkdown(m), /Top 25 by bouts one identity review unlocks/);
});
