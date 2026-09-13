import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cityLevelHometown, evaluateCandidate, resolveAppearance } from './graph.mjs';

const EV = { event_id: 'ev-new', date: '2026-06-20', commission: 'fl-athletic-commission', venue_id: 'venue-miami' };
const app = (over = {}) => ({ display_name: 'Luis Ortiz', hometown: 'Miami, FL', weight_lb: 140.2, debut: false, event: EV, opponent: { display_name: 'Nate Other', fighter_id: 'opp-1' }, ...over });
const bout = (over = {}) => ({ bout_id: 'b1', event_id: 'ev-old', date: '2026-03-14', status: 'complete', commission: 'fl-athletic-commission', venue_id: 'venue-tampa', opponent_id: 'opp-9', weight_lb: 139.6, ...over });
const cand = (over = {}) => ({ id: 'f-1', display_name: 'Luis Ortiz', aliases: [], identities: [], hometowns: ['Miami, FL'], bouts: [bout()], ...over });

test('city-level hometown only: a country or state is never decisive', () => {
  assert.equal(cityLevelHometown('Miami, FL'), 'miami, fl');
  assert.equal(cityLevelHometown('Cuba'), null);
  assert.equal(cityLevelHometown('Pennsylvania'), null);
});

test('Tier B: exact name + same city + compatible weight + same commission, sole candidate, no contradiction', () => {
  const r = resolveAppearance(app(), [cand()]);
  assert.equal(r.decision, 'matched');
  assert.equal(r.tier, 'B');
  assert.equal(r.fighter_id, 'f-1');
  assert.deepEqual(r.candidates[0].families, ['hometown', 'jurisdiction', 'weight']);
});

test('same-name fighters never auto-merge: two plausible candidates stay in review', () => {
  const r = resolveAppearance(app(), [cand(), cand({ id: 'f-2', hometowns: ['Miami, FL'] })]);
  assert.equal(r.decision, 'review');
  assert.equal(r.tier, 'C');
  assert.equal(r.reason, 'more_than_one_plausible_candidate');
});

test('one weak clue cannot auto-resolve: exact name + same city alone is review', () => {
  const r = resolveAppearance(app({ weight_lb: null }), [cand()]);
  assert.equal(r.decision, 'review');
  assert.match(r.reason, /insufficient_graph_evidence/);
  const regionOnly = resolveAppearance(app({ hometown: 'Cuba' }), [cand({ hometowns: ['Cuba'] })]);
  assert.equal(regionOnly.decision, 'review', 'a country-level hometown is not a support family');
});

test('impossible dates reject the merge (Tier D); the only candidate excluded -> a distinct boxer when the source may create', () => {
  const elsewhere = cand({ bouts: [bout({ event_id: 'ev-vegas', date: '2026-06-20', commission: 'nsac', venue_id: 'venue-vegas' })] });
  const e = evaluateCandidate(app(), elsewhere);
  assert.equal(e.tier, 'D');
  assert.ok(e.hard.includes('simultaneous_event_elsewhere'));
  assert.equal(resolveAppearance(app(), [elsewhere], { allowCreate: true }).decision, 'created');
  assert.equal(resolveAppearance(app(), [elsewhere], { allowCreate: false }).decision, 'review');
  // same date at the same place on another event row is a possible duplicate event: review, never a conflict
  const dup = evaluateCandidate(app(), cand({ bouts: [bout({ event_id: 'ev-dup', date: '2026-06-20', venue_id: 'venue-miami' })] }));
  assert.equal(dup.tier, 'C');
  assert.ok(dup.soft.includes('possible_duplicate_event'));
});

test('contradictions block auto-resolution: weight incompatible, fought 10 days earlier, different city, given name differs', () => {
  assert.equal(resolveAppearance(app({ weight_lb: 200 }), [cand()]).decision, 'review');
  assert.equal(resolveAppearance(app(), [cand({ bouts: [bout(), bout({ bout_id: 'b2', event_id: 'ev-x', date: '2026-06-10' })] })]).decision, 'review');
  assert.equal(resolveAppearance(app({ hometown: 'Orlando, FL' }), [cand()]).decision, 'review');
  const variant = resolveAppearance(app({ display_name: 'Luiz Ortiz' }), [cand()]);
  assert.notEqual(variant.decision, 'matched');
});

test('a commission debut after a recorded bout, or the candidate being the opponent, is a hard conflict', () => {
  assert.ok(evaluateCandidate(app({ debut: true }), cand()).hard.includes('debut_after_recorded_bout'));
  assert.ok(evaluateCandidate(app({ opponent: { display_name: 'Luis Ortiz', fighter_id: 'f-1' } }), cand()).hard.includes('candidate_is_the_opponent'));
});

test('Tier A: the same fight is already on the candidate record (another official document)', () => {
  const r = resolveAppearance(app({ hometown: null, weight_lb: null }), [cand({ bouts: [bout({ event_id: 'ev-other-doc', date: '2026-06-20', opponent_id: 'opp-1', venue_id: 'venue-miami' })] })]);
  assert.equal(r.decision, 'matched');
  assert.equal(r.tier, 'A');
});

test('no name-similar candidate: not the graph resolver decision', () => {
  assert.equal(resolveAppearance(app(), [cand({ display_name: 'Someone Else' })]).decision, 'none');
});
