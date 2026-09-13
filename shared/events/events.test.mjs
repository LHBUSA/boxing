import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkResultAgainstCards, classifyDecision, validateScorecard } from './decisions.mjs';
import { assessWeighIn, isCatchweight, kgToLb, normalizeWeight, stoneToLb, weighInNewsType } from './weighins.mjs';
import { diffCard, validateCardDocument } from './card.mjs';

const cards = (...pairs) => pairs.map(([a, b]) => ({ a_total: a, b_total: b }));

test('decision classification: unanimous, split, majority, draws, referee', () => {
  assert.deepEqual(classifyDecision(cards([118, 110], [117, 111], [116, 112])).decision_type, 'unanimous');
  assert.deepEqual(pick(classifyDecision(cards([115, 113], [113, 115], [116, 112]))), { outcome: 'win', winner_side: 'a', decision_type: 'split' });
  assert.deepEqual(pick(classifyDecision(cards([114, 114], [115, 113], [116, 112]))), { outcome: 'win', winner_side: 'a', decision_type: 'majority' });
  assert.deepEqual(pick(classifyDecision(cards([112, 116], [111, 117], [114, 114]))), { outcome: 'win', winner_side: 'b', decision_type: 'majority' });
  assert.deepEqual(pick(classifyDecision(cards([114, 114], [114, 114], [115, 113]))), { outcome: 'draw', winner_side: null, decision_type: 'majority' });
  assert.deepEqual(pick(classifyDecision(cards([115, 113], [113, 115], [114, 114]))), { outcome: 'draw', winner_side: null, decision_type: 'split' });
  assert.deepEqual(pick(classifyDecision(cards([114, 114], [114, 114], [114, 114]))), { outcome: 'draw', winner_side: null, decision_type: 'unanimous' });
  assert.deepEqual(pick(classifyDecision(cards([79, 78]))), { outcome: 'win', winner_side: 'a', decision_type: 'referee' });
  assert.equal(classifyDecision(cards([114, null])), null);
});
const pick = (c) => ({ outcome: c.outcome, winner_side: c.winner_side, decision_type: c.decision_type });

test('scorecard validation: sums, ranges, 10-point must, technical decisions', () => {
  const rounds = Array.from({ length: 12 }, (_, i) => ({ round: i + 1, a: i < 7 ? 10 : 9, b: i < 7 ? 9 : 10 }));
  assert.deepEqual(validateScorecard({ a_total: 115, b_total: 113, rounds }, { scheduledRounds: 12 }), []);
  assert.ok(validateScorecard({ a_total: 116, b_total: 113, rounds }, { scheduledRounds: 12 }).some((p) => /do not equal/.test(p)));
  assert.ok(validateScorecard({ a_total: 9, b_total: 9, rounds: [{ round: 1, a: 9, b: 9 }] }, {}).some((p) => /no 10 awarded/.test(p)));
  assert.deepEqual(validateScorecard({ a_total: 9, b_total: 9, rounds: [{ round: 1, a: 9, b: 9, deduction: true }] }, {}), []);
  const td = rounds.slice(0, 5).map((r) => ({ ...r, a: 10, b: 9 }));
  assert.deepEqual(validateScorecard({ a_total: 50, b_total: 45, rounds: td }, { scheduledRounds: 12, stoppedRound: 5 }), []);
  assert.ok(validateScorecard({ a_total: 50, b_total: 45, rounds: td }, { scheduledRounds: 12 }).some((p) => /expected 12/.test(p)));
});

test('result vs cards: disagreement is reported, never silently fixed', () => {
  const c = cards([115, 113], [113, 115], [116, 112]);
  assert.deepEqual(checkResultAgainstCards({ outcome: 'win', winner_side: 'a', method: 'DECISION', decision_type: 'split' }, c), []);
  assert.ok(checkResultAgainstCards({ outcome: 'win', winner_side: 'b', method: 'DECISION', decision_type: 'split' }, c).length > 0);
  assert.ok(checkResultAgainstCards({ outcome: 'win', winner_side: 'a', method: 'DECISION', decision_type: 'unanimous' }, c).length > 0);
  assert.deepEqual(checkResultAgainstCards({ outcome: 'win', winner_side: 'b', method: 'DQ' }, c), [], 'cards are irrelevant to a DQ');
});

test('weights: units, stone, misses against the contracted limit, catchweights', () => {
  assert.equal(kgToLb(66.7), 147.05);
  assert.equal(stoneToLb('10st 7lb'), 147);
  assert.equal(stoneToLb('10 st 6.5 lb'), 146.5);
  assert.deepEqual(normalizeWeight({ value: '10st 7lb', unit: 'stone_lb' }).lb, 147);
  assert.deepEqual(assessWeighIn({ officialLb: 148.2, contractedLb: 147 }), { status: 'missed_weight', miss_lb: 1.2 });
  assert.deepEqual(assessWeighIn({ officialLb: 141.8, contractedLb: 142 }), { status: 'made_weight', miss_lb: 0 });
  assert.deepEqual(assessWeighIn({ officialLb: null, contractedLb: 142 }), { status: 'recorded', miss_lb: null });
  assert.equal(isCatchweight(142, 140), true);
  assert.equal(isCatchweight(147, 147), false);
  assert.equal(isCatchweight(null, 147), null);
});

test('WEIGHT_MISSED only for a verified official miss', () => {
  assert.equal(weighInNewsType({ weigh_in_kind: 'official', verification_state: 'verified', status: 'missed_weight' }), 'WEIGHT_MISSED');
  assert.equal(weighInNewsType({ weigh_in_kind: 'official', verification_state: 'reported', status: 'missed_weight' }), 'WEIGH_IN_RESULT');
  assert.equal(weighInNewsType({ weigh_in_kind: 'official', verification_state: 'unverified', status: 'missed_weight' }), null);
  assert.equal(weighInNewsType({ weigh_in_kind: 'rehydration_check', verification_state: 'verified', status: 'missed_weight' }), 'WEIGH_IN_RESULT');
  assert.equal(weighInNewsType({ weigh_in_kind: 'ceremonial', verification_state: 'verified', status: 'recorded' }), null);
});

test('card diff: absence is not cancellation; replacement needs an external id', () => {
  const state = {
    existed: true, event_date: '2026-11-07', start_at: null, status: 'scheduled', venue_id: 'v1', commission_id: 'c1', organizations: [],
    bouts: [
      { bout_id: 'B1', external_ids: ['promo.bout:b1'], status: 'scheduled', participants: [{ fighter_id: 'x', side: 'a', status: 'scheduled' }, { fighter_id: 'y', side: 'b', status: 'scheduled' }], titles: [], officials: [] },
      { bout_id: 'B2', external_ids: ['promo.bout:b2'], status: 'scheduled', participants: [{ fighter_id: 'p', side: 'a', status: 'scheduled' }, { fighter_id: 'q', side: 'b', status: 'scheduled' }], titles: [], officials: [] },
    ],
  };
  const doc = { namespace: 'promo', event_date: '2026-11-07', bouts: [{ external_id: 'b1', resolved: { a: 'x', b: 'z' } }] };
  const { changes } = diffCard(state, doc);
  assert.deepEqual(changes.map((c) => c.change_type), ['opponent_replaced']);
  assert.deepEqual(changes[0].before_state.fighter_id, 'y');
  assert.deepEqual(changes[0].after_state, { fighter_id: 'z', side: 'b' });

  const noExt = diffCard(state, { namespace: 'promo', event_date: '2026-11-07', bouts: [{ resolved: { a: 'x', b: 'z' } }] });
  assert.equal(noExt.changes[0].change_type, 'bout_added');
  assert.equal(noExt.review[0].reason, 'possible_replacement_without_external_id');

  const swapped = diffCard(state, { namespace: 'promo', event_date: '2026-11-07', bouts: [{ external_id: 'b2', resolved: { a: 'q', b: 'p' } }] });
  assert.deepEqual(swapped.changes, [], 'listing the corners in the other order is not a change');
  assert.ok(validateCardDocument({ source_key: 's', namespace: 'n', external_id: 'e', name: 'x', bouts: [{ fighter_a: { display_name: 'A' } }] }).length > 0);
});

test('card diff: only an explicit contradiction clears a weight class; an omitted class never does', () => {
  const state = {
    existed: true, event_date: '2026-11-07', start_at: null, status: 'scheduled', venue_id: 'v1', commission_id: 'c1', organizations: [],
    bouts: [{ bout_id: 'B1', external_ids: ['sheet.bout:b1'], status: 'complete', weight_class_key: 'middleweight', contracted_weight_lb: null,
      participants: [{ fighter_id: 'x', side: 'a', status: 'scheduled' }, { fighter_id: 'y', side: 'b', status: 'scheduled' }], titles: [], officials: [] }],
  };
  const bout = (extra) => ({ namespace: 'sheet', event_date: '2026-11-07', bouts: [{ external_id: 'b1', resolved: { a: 'x', b: 'y' }, ...extra }] });
  assert.deepEqual(diffCard(state, bout({})).changes, [], 'no class in the document: nothing removed');
  const fixed = diffCard(state, bout({ contracted_weight_lb: 165, weight_class_contradicted: true })).changes;
  assert.deepEqual(fixed.map((c) => [c.change_type, c.change_type === 'weight_class_changed' ? c.after_state.weight_class_key : c.after_state.contracted_weight_lb]), [['contracted_weight_changed', 165], ['weight_class_changed', null]]);
});
