import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffRankings } from './diff.mjs';
import { parseDivisionLabel, validateRankingDocument } from './import.mjs';
import { buildTitleMap } from '../titles/title-map.mjs';

test('source-native division labels map to canonical divisions and gender', () => {
  assert.deepEqual(parseDivisionLabel('Super Welterweight (154 lbs)'), { weight_class_key: 'super_welterweight', gender: null });
  assert.deepEqual(parseDivisionLabel('Junior Middleweight'), { weight_class_key: 'super_welterweight', gender: null });
  assert.deepEqual(parseDivisionLabel("Women's Light Flyweight"), { weight_class_key: 'light_flyweight', gender: 'female' });
  assert.deepEqual(parseDivisionLabel('Light Heavyweight'), { weight_class_key: 'light_heavyweight', gender: null });
  assert.deepEqual(parseDivisionLabel('Jr. Welterweight'), { weight_class_key: 'super_lightweight', gender: null });
  assert.deepEqual(parseDivisionLabel('Bridgerweight'), { weight_class_key: 'bridgerweight', gender: null });
  assert.deepEqual(parseDivisionLabel('Catchweight'), { weight_class_key: null, gender: null });
});

test('ranking documents are validated; mandatory is never inferred', () => {
  const ok = { source_key: 's', organization_slug: 'wbc', division_label: 'Welterweight', published_on: '2026-09-01',
    entries: [{ position: 1, rank_label: 'C', source_name: 'A', is_champion: true }, { position: 2, rank_label: '1', is_vacant: true }] };
  assert.deepEqual(validateRankingDocument(ok), []);
  const bad = { ...ok, entries: [{ position: 1, source_name: 'A', mandatory: 'yes' }, { position: 1, is_vacant: true, source_name: 'B' }] };
  const problems = validateRankingDocument(bad);
  assert.ok(problems.some((p) => /mandatory must be boolean/.test(p)));
  assert.ok(problems.some((p) => /duplicate position/.test(p)));
  assert.ok(problems.some((p) => /vacant entry cannot name/.test(p)));
});

const e = (position, rank_label, fighter_id, extra = {}) => ({
  position, rank_label, rank: /^\d+$/.test(rank_label) ? Number(rank_label) : null, fighter_id, source_name: fighter_id ? `Name ${fighter_id}` : extra.source_name, ...extra,
});

test('ranking diff: up, down, new, removed, champion change, designation, mandatory', () => {
  const prev = { entries: [e(1, 'C', 'champ', { is_champion: true }), e(2, '1', 'x'), e(3, '2', 'y', { mandatory: false }), e(4, '3', 'z')] };
  const next = { entries: [e(1, 'C', 'x', { is_champion: true }), e(2, '1', 'y', { mandatory: true, designation: 'Mandatory' }), e(3, '2', 'new'), e(4, '3', 'champ')] };
  const types = diffRankings(prev, next).map((c) => `${c.type}:${c.fighter_id ?? ''}`);
  assert.deepEqual(types, [
    'champion_changed:', 'became_champion:x', 'no_longer_champion:champ', 'moved_up:y', 'new_entrant:new', 'removed:z',
    'designation_changed:y', 'mandatory_changed:y',
  ]);
});

test('ranking diff: vacant champion slot and unresolved identities', () => {
  const prev = { entries: [e(1, 'C', 'champ', { is_champion: true }), e(2, '1', null, { source_name: 'Unmatched Person' })] };
  const next = { entries: [{ position: 1, rank_label: 'C', is_vacant: true }, e(2, '1', 'champ'), e(3, '2', null, { source_name: 'Unmatched  person' })] };
  const changes = diffRankings(prev, next);
  assert.ok(changes.some((c) => c.type === 'title_vacant_in_ranking'));
  assert.ok(!changes.some((c) => c.source_name?.startsWith('Unmatched') && c.type === 'new_entrant'), 'unresolved entries match on normalized name');
  const moved = changes.find((c) => c.fighter_id === 'champ');
  assert.equal(moved.type, 'no_longer_champion');
  const unresolved = diffRankings({ entries: [] }, { entries: [e(1, '1', null, { source_name: 'Someone New' })] });
  assert.equal(unresolved[0].identity_unresolved, true);
});

test('title map: primary champion by priority, overlapping WBA belts, undisputed vs unified are derived', () => {
  const holder = (id) => ({ fighter_id: id, display_name: id });
  const facts = {
    weight_class_key: 'heavyweight', gender_scope: 'male', as_of: '2026-09-01',
    titles: [
      { title_id: 't1', organization_slug: 'wbc', tier: 'world', counts_toward_undisputed: true, org_priority: 10, holder: holder('king') },
      { title_id: 't2', organization_slug: 'wba', tier: 'super', counts_toward_undisputed: true, org_priority: 5, holder: holder('king') },
      { title_id: 't3', organization_slug: 'wba', tier: 'regular', counts_toward_undisputed: true, org_priority: 20, holder: holder('other') },
      { title_id: 't4', organization_slug: 'wba', tier: 'interim', counts_toward_undisputed: false, holder: holder('third') },
      { title_id: 't5', organization_slug: 'ibf', tier: 'world', counts_toward_undisputed: true, org_priority: 10, holder: holder('king') },
      { title_id: 't6', organization_slug: 'wbo', tier: 'world', counts_toward_undisputed: true, org_priority: 10, holder: holder('king') },
      { title_id: 't7', organization_slug: 'wbc', tier: 'interim', counts_toward_undisputed: false, holder: null, last_change: { effective_on: '2026-05-01' } },
    ],
  };
  const map = buildTitleMap(facts);
  assert.equal(map.derived.undisputed_champion.fighter_id, 'king');
  assert.equal(map.derived.label, 'PropBetEdge-derived');
  const wba = map.organizations.find((o) => o.organization_slug === 'wba');
  assert.equal(wba.primary_champion.tier, 'super');
  assert.equal(wba.overlapping_champions.length, 3);
  assert.deepEqual(map.organizations.find((o) => o.organization_slug === 'wbc').vacancies, [{ title_id: 't7', tier: 'interim', since: '2026-05-01' }]);

  facts.titles = facts.titles.map((t) => (t.title_id === 't6' ? { ...t, holder: null } : t));
  const after = buildTitleMap(facts);
  assert.equal(after.derived.undisputed_champion, null);
  assert.equal(after.derived.unification[0].state, 'unified');
  assert.equal(after.derived.unification[0].organizations.length, 3);
});
