import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { artifactCorrection, buildCleanupPlan, isSurnameOnly } from './official-cleanup.mjs';
import { activeOccupant, slotContinuity } from '../events/officials.mjs';
import { splitOfficialNames } from '../adapters/commissions/nevada.mjs';
import { parseSuperseded } from '../commissions/run.mjs';
import { NEVADA } from '../adapters/commissions/nevada.mjs';
import { NEW_JERSEY } from '../adapters/commissions/new-jersey.mjs';
import { FLORIDA } from '../adapters/commissions/florida.mjs';

test('parser artifact correction is exactly "leading non-letters removed"', () => {
  assert.equal(artifactCorrection('& Cory Santos'), 'Cory Santos');
  assert.equal(artifactCorrection('  &  Steve Weisfeld'), 'Steve Weisfeld');
  assert.equal(artifactCorrection('Cory Santos'), null);
  assert.equal(artifactCorrection('Cheek'), null, 'a surname is not an artifact');
  assert.equal(artifactCorrection('&'), null);
  assert.equal(isSurnameOnly('Cheek'), true);
  assert.equal(isSurnameOnly('Eric Cheek'), false);
});

test('Nevada header officials: "&" separates names; suffixes stay attached', () => {
  assert.deepEqual(splitOfficialNames(' Robert Byrd, Tim Cheatham, Chris Migliore, & Cory Santos'), ['Robert Byrd', 'Tim Cheatham', 'Chris Migliore', 'Cory Santos']);
  assert.deepEqual(splitOfficialNames('Chris Migliore & Ricardo Ocasio'), ['Chris Migliore', 'Ricardo Ocasio']);
  assert.deepEqual(splitOfficialNames('Richard Green, Jr., Ann Lee.'), ['Richard Green, Jr.', 'Ann Lee']);
});

test('slot continuity: same normalized name keeps the occupant, a different name holds, an empty slot resolves', () => {
  const bout = { officials: [
    { official_id: 'o1', display_name: '& Cory Santos', role: 'judge', slot: 2, state: 'worked' },
    { official_id: 'o2', display_name: 'Cheek', role: 'judge', slot: 1, state: 'assigned' },
    { official_id: 'o3', display_name: 'Old Judge', role: 'judge', slot: 3, state: 'replaced' },
    { official_id: 'o4', display_name: 'Robert Refone', role: 'referee', slot: null, state: 'assigned' },
  ] };
  assert.deepEqual(slotContinuity({ display_name: 'Cory Santos' }, activeOccupant(bout, { role: 'judge', slot: 2 })), { action: 'keep', reason: 'same_name_after_normalization', official_id: 'o1' });
  assert.equal(slotContinuity({ display_name: 'Eric Cheek' }, activeOccupant(bout, { role: 'judge', slot: 1 })).action, 'hold');
  assert.equal(slotContinuity({ display_name: 'New Judge' }, activeOccupant(bout, { role: 'judge', slot: 3 })).action, 'resolve', 'a replaced assignment is not an occupant');
  assert.equal(slotContinuity({ display_name: 'Robert Refone' }, activeOccupant(bout, { role: 'referee', slot: null })).action, 'keep');
  assert.equal(slotContinuity({ display_name: 'Anyone' }, activeOccupant(null, { role: 'judge', slot: 1 })).action, 'resolve');
});

test('only declared superseded parser versions are re-parsed by forward runs', () => {
  assert.equal(parseSuperseded(NEVADA, { current_revision: 1, parser_version: 'nsac-nevada@1.0.0' }), true);
  assert.equal(parseSuperseded(NEVADA, { current_revision: 1, parser_version: null }), true, 'pre-version revision');
  assert.equal(parseSuperseded(NEVADA, { current_revision: 1, parser_version: NEVADA.version }), false);
  assert.equal(parseSuperseded(NEW_JERSEY, { current_revision: 2, parser_version: 'nj-sacb@1.1.0' }), true);
  assert.equal(parseSuperseded(FLORIDA, { current_revision: 1, parser_version: 'florida-athletic-commission@1.0.0' }), false, 'Florida declares nothing: untouched');
  assert.equal(parseSuperseded(NEVADA, null), false);
});

const official = (id, name, assignments, type = 'judge') => ({ id, public_id: `pbe_${id}`, display_name: name, normalized_name: name.replace(/^[^A-Za-z]+/, '').toLowerCase(), official_type: type, identity_state: 'source_native', merged_into_id: null, assignments });
const asg = (bout, slot, extra = {}) => ({ bout_id: bout, role: 'judge', slot, state: 'worked', event_date: '2026-01-23', event_name: 'Card', commission: 'nsac', source_bout_ids: [`sb-${bout}`], scorecards: 1, scorecards_current: 1, scorecard_slot: slot, ...extra });
const parse = (version, at, names, extra = {}) => ({ doc_key: 'nv-doc', source_key: 'nsac_nevada', parser_version: version, observed_at: at, bouts: Object.entries(names).map(([bout, judges]) => ({ source_bout_id: `sb-${bout}`, referee: null, judges: judges.map((n, i) => ({ slot: i + 1, name: n })) })), ...extra });

test('plan: stored corrected parse at the same bout/slot makes the artifact Category A; simulated only is A_pending', () => {
  const evidence = {
    officials: [official('s', '& Cory Santos', [asg('b1', 2)]), official('a', 'Jane Alpha', [asg('b1', 1)])],
    parses: [parse('nsac-nevada@1.0.0', '2026-09-13T14:00:00Z', { b1: ['Jane Alpha', '& Cory Santos'] })],
  };
  const pending = buildCleanupPlan(evidence, { simulatedParses: [parse('nsac-nevada@1.0.2', 'x', { b1: ['Jane Alpha', 'Cory Santos'] })] });
  assert.equal(pending.A.length, 0);
  assert.equal(pending.A_pending.length, 1);
  const stored = buildCleanupPlan({ ...evidence, parses: [...evidence.parses, parse('nsac-nevada@1.0.2', '2026-09-14T11:40:00Z', { b1: ['Jane Alpha', 'Cory Santos'] })] });
  assert.equal(stored.A.length, 1);
  assert.equal(stored.A[0].apply.action, 'rename_parser_artifact');
  assert.equal(stored.A[0].apply.after_display_name, 'Cory Santos');
  assert.deepEqual(stored.A[0].apply.evidence.continuity.map((c) => [c.bout_id, c.slot, c.old_name, c.new_name]), [['b1', 2, '& Cory Santos', 'Cory Santos']]);
  // a later parse naming someone else blocks it (B), and a scorecard in another slot blocks it
  const contradicted = buildCleanupPlan({ ...evidence, parses: [...evidence.parses, parse('nsac-nevada@1.0.2', '2026-09-14T11:40:00Z', { b1: ['Jane Alpha', 'Kim Charlie'] })] });
  assert.equal(contradicted.A.length, 0);
  assert.match(contradicted.B[0].reason, /contradiction/);
  const slotMismatch = buildCleanupPlan({ ...evidence, officials: [official('s', '& Cory Santos', [asg('b1', 2, { scorecard_slot: 3 })])], parses: stored.parses ?? [...evidence.parses, parse('nsac-nevada@1.0.2', '2026-09-14T11:40:00Z', { b1: ['Jane Alpha', 'Cory Santos'] })] });
  assert.equal(slotMismatch.A.length, 0);
});

test('plan: an artifact with a separate corrected-name official is a merge; two such officials are ambiguous', () => {
  const parses = [parse('nsac-nevada@1.0.0', '2026-09-13T14:00:00Z', { b1: ['& Ann Echo'] }), parse('nsac-nevada@1.0.2', '2026-09-14T11:40:00Z', { b1: ['Ann Echo'] })];
  const merge = buildCleanupPlan({ officials: [official('x', '& Ann Echo', [asg('b1', 1)]), official('y', 'Ann Echo', [asg('b9', 1)])], parses });
  assert.equal(merge.A[0].apply.action, 'merge_parser_artifact');
  assert.equal(merge.A[0].apply.official_id, 'y');
  assert.equal(merge.A[0].apply.from_official_id, 'x');
  const shared = buildCleanupPlan({ officials: [official('x', '& Ann Echo', [asg('b1', 1)]), official('y', 'Ann Echo', [asg('b1', 2)])], parses });
  assert.equal(shared.A.length, 0, 'both active on the same bout: never merged');
  const twoTwins = buildCleanupPlan({ officials: [official('x', '& Ann Echo', [asg('b1', 1)]), official('y', 'Ann Echo', [asg('b8', 1)]), official('z', 'Ann Echo', [asg('b9', 1)])], parses });
  assert.equal(twoTwins.A.length, 0);
  assert.equal(twoTwins.C[0].reason, 'more_than_one_official_carries_the_corrected_name');
});

test('plan: surname-only is C, name variants are B, different people sharing a surname are D', () => {
  const plan = buildCleanupPlan({ officials: [
    official('c', 'Cheek', [asg('b1', 1)]), official('e', 'Eric Cheek', [asg('b2', 1)]), official('m', 'Mark Cheek', [asg('b3', 1)]),
    official('s1', 'Steve Weisfeld', [asg('b4', 1)]), official('s2', 'Steven Weisfeld', [asg('b5', 1)]),
    official('t1', 'Daniel Torres', [asg('b6', 1)]), official('t2', 'Prof. Daniel Torres', [asg('b7', 1)]),
  ], parses: [] });
  assert.deepEqual(plan.C.map((x) => [x.candidate_a.name, x.candidate_b.name]).sort(), [['Cheek', 'Eric Cheek'], ['Cheek', 'Mark Cheek']]);
  assert.ok(plan.B.some((x) => [x.candidate_a.name, x.candidate_b.name].sort().join() === 'Steve Weisfeld,Steven Weisfeld'));
  assert.ok(plan.B.some((x) => x.reason === 'name_variant:token_containment'));
  assert.deepEqual(plan.D.map((x) => [x.candidate_a.name, x.candidate_b.name].sort().join()), ['Eric Cheek,Mark Cheek']);
  assert.equal(plan.A.length, 0);
});

test('the planner evidence SQL file matches the migration function body', () => {
  const norm = (s) => s.replace(/--[^\n]*\n/g, '\n').replace(/\s+/g, ' ').trim().replace(/;$/, '');
  const migration = readFileSync(new URL('../../supabase/migrations/20260914000024_boxing_official_canonicalization.sql', import.meta.url), 'utf8');
  const start = migration.indexOf('create or replace function public.boxing_official_cleanup_evidence()');
  const body = migration.slice(migration.indexOf('$$', start) + 2, migration.indexOf('$$;', start));
  const file = readFileSync(new URL('../../scripts/officials/cleanup-evidence.sql', import.meta.url), 'utf8');
  assert.equal(norm(file), norm(body));
});
