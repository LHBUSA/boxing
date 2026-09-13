import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCandidateBouts, describeResultHistory, historyLine } from './bout-history.mjs';

const sid = (id) => [{ namespace: 'fl-athletic-commission.bout', external_id: id, repeat_index: Number((id.match(/\|(\d+)$/) ?? [])[1] ?? 1) }];

test('preserved parser correction is separated from the current canonical result', () => {
  const h = describeResultHistory([
    { revision: 1, result: 'loss', method: 'DECISION', change_reason: null },
    { revision: 2, result: 'win', method: 'DECISION', change_reason: null },
    { revision: 3, result: 'loss', method: 'DECISION', change_reason: 'reparsed_with_florida-athletic-commission@1.0.1' },
  ]);
  assert.deepEqual(h.current, { revision: 3, result: 'loss', method: 'DECISION', change_reason: 'reparsed_with_florida-athletic-commission@1.0.1', is_parser_correction: true });
  assert.deepEqual(h.preserved_history.map((p) => [p.revision, p.result, p.kind, p.corrected_by_revision]),
    [[1, 'loss', 'superseded_by_parser_correction', 3], [2, 'win', 'superseded_by_parser_correction', 3]]);
  assert.equal(describeResultHistory([{ revision: 1, result: 'win' }, { revision: 2, result: 'loss', change_reason: null }]).preserved_history[0].kind, 'superseded_by_later_official_revision');
});

test('repeat pairing vs possible duplicate canonical bout', () => {
  const base = { event_id: 'ev-0626', date: '2026-06-26', opponent_id: 'griffin', opponent_name: 'Suzana Rodriguez Griffin' };
  const repeat = classifyCandidateBouts([
    { ...base, bout_id: 'm1', bout_order: 11, source_bout_ids: sid('2026-06-26|tbl|suzana-rodriguez-griffin|sofia-viretti'), result_revisions: [{ revision: 3, result: 'loss', change_reason: 'reparsed_with_x' }] },
    { ...base, bout_id: 'm2', bout_order: 20, source_bout_ids: sid('2026-06-26|tbl|suzana-rodriguez-griffin|sofia-viretti|2'), result_revisions: [{ revision: 1, result: 'win' }] },
  ]);
  assert.deepEqual(repeat.map((h) => [h.pairing, h.pairing_detail, h.repeat_index, h.bout_order]),
    [['repeat_pairing', 'meeting 1 of 2 on the same card', 1, 11], ['repeat_pairing', 'meeting 2 of 2 on the same card', 2, 20]]);
  assert.match(historyLine(repeat[1]), /order 20 \|2 \[repeat_pairing: meeting 2 of 2/);
  const duplicate = classifyCandidateBouts([
    { ...base, bout_id: 'd1', bout_order: 11, source_bout_ids: sid('2026-06-26|tbl|suzana-rodriguez-griffin|sofia-viretti') },
    { ...base, bout_id: 'd2', event_id: 'ev-other-row', bout_order: null, source_bout_ids: [] },
  ]);
  assert.ok(duplicate.every((h) => h.pairing === 'possible_duplicate_canonical_bout'));
  const sameRowSameOrder = classifyCandidateBouts([{ ...base, bout_id: 'x1', bout_order: 5, source_bout_ids: [] }, { ...base, bout_id: 'x2', bout_order: 5, source_bout_ids: [] }]);
  assert.ok(sameRowSameOrder.every((h) => h.pairing === 'possible_duplicate_canonical_bout'));
});
