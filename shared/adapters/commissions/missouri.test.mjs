import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPORT } from './contract.mjs';
import { findSensitive } from './minimize.mjs';
import { assignJudges, assignReferees, boutListReadings, classifyMissouriSection, missouriSportHint, parseMissouriIndex, parseMissouriMethod, parseMissouriResults } from './missouri.mjs';
import { MISSOURI_BOUTS, MISSOURI_INDEX_HTML, missouriPages } from '../../../tests/fixtures/commissions/synthetic.mjs';

const ref = { doc_key: 'mo-results:2026-09-05 BOXAKICKRES Synthetic City Synthetic Boxing', url: 'https://pr.mo.gov/boards/athletics/boxingresults/2026-09-05%20BOXAKICKRES.pdf' };

test('Missouri index: official result documents with date, last-modified and a sport hint from the file codes', () => {
  const refs = parseMissouriIndex(MISSOURI_INDEX_HTML);
  assert.equal(refs.length, 3);
  assert.deepEqual(refs.map((r) => r.sport_hint), [SPORT.BOXING, SPORT.KICKBOXING, SPORT.KICKBOXING]);
  assert.equal(refs[0].event_date, '2026-09-05');
  assert.equal(refs[0].listed_modified, '2026-09-07');
  assert.ok(refs.every((r) => r.url.startsWith('https://pr.mo.gov/boards/athletics/boxingresults/')));
  assert.equal(missouriSportHint('2025-12-13 BOX AKICK AMUAY THAI RES St. Ann'), SPORT.BOXING);
});

test('Missouri sheet: professional boxing bouts kept; kickboxing and exhibition rejected; private columns and comment text dropped', () => {
  const r = parseMissouriResults(ref, missouriPages({ bouts: MISSOURI_BOUTS }), { capturedAt: '2026-09-14T00:00:00Z' });
  assert.equal(r.classification.accepted, true);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.rejected.map((x) => x.reason).sort(), ['bout_sport_not_boxing:kickboxing', 'exhibition_bout']);
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].source_event_id, '2026-09-05|synthetic-city|event-26-999');
  assert.deepEqual(r.events[0].promoters, ['Synthetic Boxing Promotions']);
  assert.equal(r.events[0].venue.name, 'Synthetic Hall');
  const [split, tko] = r.bouts;
  assert.equal(split.bout_order, 2);
  assert.deepEqual([split.result.outcome, split.result.winner_side, split.result.method, split.result.decision_type], ['win', 'b', 'DECISION', 'split']);
  assert.deepEqual(split.score_totals_unattributed, [{ a: 36, b: 40 }, { a: 39, b: 37 }, { a: 37, b: 39 }]);
  assert.ok(split.judges.every((j) => j.a_total == null && j.b_total == null), 'no total is attributed to a named judge');
  assert.deepEqual([tko.result.method, tko.result.round, tko.result.time_sec, tko.scheduled_rounds], ['TKO', 4, 116, 6]);
  assert.deepEqual(tko.suspensions, [{ side: 'b', duration_days: null, indefinite: true, raw: 'indefinite' }]);
  assert.deepEqual(split.suspensions, [{ side: 'a', duration_days: 30, indefinite: false, raw: '30 days' }]);
  const serialized = JSON.stringify(r);
  for (const s of ['123456', '1/1/95', '3-1', 'Concussion', 'Cut Over Eye', 'No Skills', 'Dr. Syn Thetic', 'Ann Ouncer', 'In Spector', '555-0100', 'Ex Director']) {
    assert.ok(!serialized.includes(s), `${s} must not leave the parser`);
  }
  assert.deepEqual(findSensitive({ events: r.events, bouts: r.bouts, minimized: r.minimized }), []);
});

test('Missouri officials: referees only from an unambiguous partition of the bouts; judges without a list work every bout', () => {
  const r = parseMissouriResults(ref, missouriPages({ bouts: MISSOURI_BOUTS }));
  assert.deepEqual(r.bouts.map((b) => b.referee), ['Ray Reftwo', 'Rex Refone']);
  assert.deepEqual(r.bouts[0].judges.map((j) => [j.slot, j.name]), [[1, 'Jan Alpha'], [2, 'Joe Bravo'], [3, 'Kim Charlie']]);
  const overlapping = parseMissouriResults(ref, missouriPages({ bouts: MISSOURI_BOUTS, referees: [['Rex Refone', '1 2 3'], ['Ray Reftwo', '3 4']] }));
  assert.deepEqual(overlapping.bouts.map((b) => b.referee), [null, null]);
  assert.equal(overlapping.bouts[0].officials_assignment.referee, 'referee_lists_do_not_partition_bouts');
  const single = parseMissouriResults(ref, missouriPages({ bouts: MISSOURI_BOUTS, referees: [['Rex Refone', '']] }));
  assert.deepEqual(single.bouts.map((b) => b.referee), ['Rex Refone', 'Rex Refone']);
  assert.deepEqual(boutListReadings('13579', 9), [[1, 3, 5, 7, 9]]);
  assert.deepEqual(boutListReadings('1 – 12', 12), [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]]);
  assert.equal(boutListReadings('12', 12).length, 2, '"12" is bout 12 or bouts 1 and 2');
  assert.equal(assignReferees([{ name: 'A', bouts: '12' }, { name: 'B', bouts: '3' }], [1, 2, 3]).map.get(1), 'A', 'only the reading that partitions the card is used');
  const twelve = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  assert.equal(assignReferees([{ name: 'A', bouts: '1 2' }, { name: 'B', bouts: '3 4 5 6 7 8 9 10 11 12' }], twelve).map.get(12), 'B', 'the other list fixes the reading');
  assert.equal(assignReferees([{ name: 'A', bouts: '12' }, { name: 'B', bouts: '3 4 5 6 7 8 9 10 11 12' }], twelve).reason, 'referee_lists_ambiguous', 'two partitions: nobody assigned');
  assert.equal(assignReferees([{ name: 'A', bouts: '12' }, { name: 'B', bouts: '3 4 5 6 7 8 9 10 11' }], twelve).map.size, 0, 'no reading covers the whole card');
  assert.equal(assignJudges([{ name: 'J', bouts: '12' }], [1, 2, 12]).reason, 'judge_list_ambiguous');
});

test('Missouri: a boxing-only sheet without section labels is professional boxing; a kickboxing sheet is rejected', () => {
  const plain = MISSOURI_BOUTS.slice(1, 3).map((b) => ({ ...b, section: null }));
  const r = parseMissouriResults(ref, missouriPages({ title: 'MISSOURI PROFESSIONAL BOXING SHOW RESULTS', bouts: plain }));
  assert.equal(r.bouts.length, 2);
  const kick = parseMissouriResults(ref, missouriPages({ title: 'MISSOURI AMATEUR KICKBOXING SHOW RESULTS', bouts: [MISSOURI_BOUTS[0]] }));
  assert.equal(kick.classification.accepted, false);
  assert.equal(kick.classification.sport, SPORT.KICKBOXING);
  assert.deepEqual(kick.bouts, []);
  assert.equal(classifyMissouriSection('AMATEIR KICKBOXING').reason, 'bout_sport_not_boxing:kickboxing');
  assert.equal(classifyMissouriSection('Professional Boxing').accepted, true);
});

test('Missouri method: stoppage round and time, decision totals paired, suspension text never read as totals', () => {
  assert.deepEqual(parseMissouriMethod('By KO :46 of the 1 st round', null), { method: 'KO', decision_type: null, round: 1, time_sec: 46, totals: null });
  assert.equal(parseMissouriMethod('By TKO 0:00 of the 2 nd round', null).time_sec, null);
  assert.deepEqual(parseMissouriMethod('Majority Draw 38 36 38', '38 40 38').totals, [[38, 38], [36, 40], [38, 38]]);
  assert.deepEqual(parseMissouriMethod('By Split Decision 40 37 40', '36 39 36, 30 Days Suspension').totals, [[40, 36], [37, 39], [40, 36]]);
});
