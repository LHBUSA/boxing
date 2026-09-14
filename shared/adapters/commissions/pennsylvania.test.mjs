import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPORT } from './contract.mjs';
import { findSensitive } from './minimize.mjs';
import { cityFromTitle, parsePennsylvaniaIndex, parsePennsylvaniaResult, parsePennsylvaniaResults, pennsylvaniaName } from './pennsylvania.mjs';
import { PENNSYLVANIA_BOUTS, PENNSYLVANIA_INDEX_HTML, pennsylvaniaPages } from '../../../tests/fixtures/commissions/synthetic.mjs';

const ref = { doc_key: 'pa-results:2026:09-05-26 box synthetic - synthetic arena - phila. pa - results', url: 'https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/x.pdf', city: 'Philadelphia' };

test('Pennsylvania index: official documents with date, city and sport hint from the file name', () => {
  const refs = parsePennsylvaniaIndex(PENNSYLVANIA_INDEX_HTML);
  assert.deepEqual(refs.map((r) => [r.event_date, r.sport_hint, r.city]), [
    ['2026-09-05', SPORT.BOXING, 'Philadelphia'], ['2026-09-06', SPORT.MMA, 'Philadelphia'], ['2026-09-07', SPORT.KICKBOXING, 'Allentown'], ['2024-01-12', SPORT.BOXING, null],
  ]);
  assert.ok(refs.every((r) => r.url.startsWith('https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/')));
  assert.equal(cityFromTitle('06-13-26 box walton - first district plaza - phila., pa - results.pdf'), 'Philadelphia');
  assert.equal(cityFromTitle('05-22-26 box rivera - live casino - phila pa - results.pdf'), 'Philadelphia');
  assert.equal(pennsylvaniaName('SMITH JR., JOHN'), 'JOHN SMITH JR.');
});

test('Pennsylvania sheet: bouts, results, referees by marker, three judges; birth dates, fed ids and medical remarks dropped', () => {
  const r = parsePennsylvaniaResults(ref, pennsylvaniaPages({ bouts: PENNSYLVANIA_BOUTS }), { capturedAt: '2026-09-14T00:00:00Z' });
  assert.equal(r.classification.accepted, true);
  assert.deepEqual(r.problems, []);
  assert.equal(r.events[0].source_event_id, '2026-09-05|philadelphia|synthetic-arena');
  assert.deepEqual(r.events[0].promoters, ['Pat Synthetic']);
  assert.equal(r.events[0].venue.name, 'Synthetic Arena');
  const [ud, ko, draw] = r.bouts;
  assert.deepEqual([ud.fighter_a.display_name, ud.fighter_b.display_name, ud.scheduled_rounds], ['Synth Alpha', 'Synth Bravo', 4]);
  assert.deepEqual([ud.result.outcome, ud.result.winner_side, ud.result.method, ud.result.decision_type, ud.result.round], ['win', 'a', 'DECISION', 'unanimous', null]);
  assert.deepEqual([ko.result.winner_side, ko.result.method, ko.result.round, ko.result.time_sec], ['b', 'KO', 1, 81]);
  assert.equal(ko.fighter_b.display_name, "Synth O'Delta Jr.");
  assert.deepEqual([draw.result.outcome, draw.result.method, draw.result.decision_type], ['draw', 'DECISION', 'majority']);
  assert.deepEqual(r.bouts.map((b) => b.referee), ['Rex Refone', 'Ray Reftwo', 'Rex Refone']);
  assert.deepEqual(ud.judges.map((j) => [j.slot, j.name]), [[1, 'Jan Alpha'], [2, 'Joe Bravo'], [3, 'Kim Charlie']]);
  assert.deepEqual(ko.suspensions, [{ side: 'a', duration_days: null, indefinite: true, raw: 'indefinite' }]);
  assert.deepEqual(draw.suspensions, [{ side: 'b', duration_days: 45, indefinite: false, raw: '45 days' }]);
  const serialized = JSON.stringify(r);
  for (const s of ['1/1/1995', 'PA-123456', 'NJ-654321', 'ORTHO', 'LEFT EYE', 'DOC, SYN', 'KEEPER', '555-0101', 'Harrisburg']) assert.ok(!serialized.includes(s), `${s} must not leave the parser`);
  assert.deepEqual(findSensitive({ events: r.events, bouts: r.bouts, minimized: r.minimized }), []);
});

test('Pennsylvania: judges are not assigned unless exactly three are listed; an unknown marker assigns no referee', () => {
  const four = parsePennsylvaniaResults(ref, pennsylvaniaPages({ bouts: PENNSYLVANIA_BOUTS, judges: ['ALPHA, JAN', 'BRAVO, JOE', 'CHARLIE, KIM', 'DELTA, DEE'] }));
  assert.ok(four.bouts.every((b) => b.judges.length === 0));
  assert.equal(four.bouts[0].officials_assignment.judges, 'listed_4_not_assigned');
  const unknown = parsePennsylvaniaResults(ref, pennsylvaniaPages({ bouts: [{ ...PENNSYLVANIA_BOUTS[0], marker: 'NOBODY' }] }));
  assert.equal(unknown.bouts[0].referee, null);
});

test('Pennsylvania: non-boxing and team-league sheets are rejected; result codes parse', () => {
  const mma = parsePennsylvaniaResults(ref, pennsylvaniaPages({ event: 'MIXED MARTIAL ARTS', bouts: PENNSYLVANIA_BOUTS }));
  assert.equal(mma.classification.accepted, false);
  assert.deepEqual(mma.bouts, []);
  const tbl = parsePennsylvaniaResults(ref, [{ page: 1, width: 792, height: 612, items: [{ s: 'event name', x: 35, y: 536, w: 40 }, { s: 'TBL-pro', x: 684, y: 486, w: 30 }] }]);
  assert.equal(tbl.classification.reason, 'team_league_format_not_supported');
  assert.deepEqual(parsePennsylvaniaResult('W SPL 8RD'), { side_outcome: 'win', method: 'DECISION', decision_type: 'split', round: 8, raw: 'W SPL 8RD' });
  assert.equal(parsePennsylvaniaResult('L TKO 2RD').method, 'TKO');
});
