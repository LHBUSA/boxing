import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dangerFlags, placeConsistency, recommend, similarNamed, summarizeDryRun } from './human-review.mjs';

test('stated places of different granularity: consistent vs mismatch', () => {
  assert.equal(placeConsistency('Puebla, MX', ['Mexico']).status, 'consistent');
  assert.equal(placeConsistency('Miami, FL', ['USA']).status, 'consistent');
  assert.equal(placeConsistency('West Palm Beach, FL.', ['Colombia']).status, 'mismatch');
  assert.equal(placeConsistency(null, ['Cuba']).status, 'unknown');
});

test('danger flags: same name held twice, relatives in the same city, suffixes, common surnames, place mismatch', () => {
  const idx = [
    { id: '1', display_name: 'Zahir Abdus Salaam', hometowns: ['Philadelphia, PA'] },
    { id: '2', display_name: 'Muadh Abdus Salaam', hometowns: ['Philadelphia, PA'] },
    { id: '3', display_name: 'Ray Twin', hometowns: ['Tampa, FL'] }, { id: '4', display_name: 'Ray Twin', hometowns: ['Tampa, FL'] },
    ...['A', 'B', 'C', 'D', 'E'].map((g, i) => ({ id: `g${i}`, display_name: `${g}ndy Garcia`, hometowns: ['Florida'] })),
  ];
  const kinds = (f) => f.map((x) => x.kind);
  assert.ok(kinds(dangerFlags({ observedName: 'Mudah Abdus Salaam', observedHometown: 'Philadelphia, PA', candidate: { fighter_id: '2', display_name: 'Muadh Abdus Salaam', name_level: 'transliteration', hometowns: ['Philadelphia, PA'] }, nameIndex: idx }))
    .includes('same_surname_same_city_different_given_name'));
  assert.ok(kinds(dangerFlags({ observedName: 'Ray Twin', observedHometown: 'Tampa, FL', candidate: { fighter_id: '3', display_name: 'Ray Twin', name_level: 'exact', hometowns: ['Tampa, FL'] }, nameIndex: idx }))
    .includes('same_name_multiple_canonical_boxers'));
  assert.ok(kinds(dangerFlags({ observedName: 'Julio Sanchez III', observedHometown: 'Pleasantville, NJ', candidate: { fighter_id: 'x', display_name: 'Julio Sanchez', name_level: 'containment', hometowns: [] }, nameIndex: idx }))
    .includes('generational_suffix'));
  assert.ok(kinds(dangerFlags({ observedName: 'John Garcia', observedHometown: 'Florida', candidate: { fighter_id: 'y', display_name: 'John Garcia', name_level: 'exact', hometowns: ['Florida'] }, nameIndex: idx }))
    .includes('common_surname'));
  assert.ok(kinds(dangerFlags({ observedName: 'Jose Cortes', observedHometown: 'West Palm Beach, FL.', candidate: { fighter_id: 'z', display_name: 'Jose Cortes', name_level: 'exact', hometowns: ['Colombia'] }, nameIndex: idx }))
    .includes('stated_place_mismatch'));
});

test('recommendations are advice: any danger flag or contradiction holds; a match needs weight + continuity with no contradiction', () => {
  const top = { fighter_id: 'f', display_name: 'Tristan Gallichan', name_level: 'exact', tier: 'C', confidence: 78,
    reasons_for: ['name_exact', 'weight_141.8_vs_145.2_on_2026-04-10', 'same_commission:fl-athletic-commission'], reasons_against: [] };
  assert.equal(recommend({ top, plausible: [top], flags: [] }).recommendation, 'match');
  assert.equal(recommend({ top, plausible: [top], flags: [{ kind: 'common_surname' }] }).recommendation, 'hold');
  assert.equal(recommend({ top: { ...top, reasons_against: ['hometown_different_city:x vs y'] }, plausible: [top], flags: [] }).recommendation, 'hold');
  assert.equal(recommend({ top, plausible: [top, { ...top, fighter_id: 'g' }], flags: [] }).recommendation, 'hold');
  assert.equal(recommend({ top: { ...top, tier: 'D', reasons_against: ['fought_2026-06-20_at_other_event'] }, plausible: [], flags: [] }).recommendation, 'distinct');
});

test('similar-named other boxers are surfaced (double surnames, namesakes)', () => {
  const idx = [{ id: 'a', display_name: 'Jose A Valenzuela Gastelum', hometowns: ['Renton, WA'] }, { id: 'b', display_name: 'Jose Valenzuela Alvarado', hometowns: ['Mexico'] }, { id: 'c', display_name: 'Maria Valenzuela', hometowns: [] }];
  assert.deepEqual(similarNamed('Jose Valenzuela Alvarado', 'b', idx), ['Jose A Valenzuela Gastelum (Renton, WA)']);
});

test('dry-run bout impact: a blocked bout is created only when both corners are resolved or proposed', () => {
  const corner = (id) => ({ fighter_id: id, via: id ? 'recorded' : null, name: 'x' });
  const blockedBouts = [
    { source_key: 'florida_athletic_commission', bout_external_id: 'b1', corner: { a: corner('f-opp'), b: corner(null) } },
    { source_key: 'florida_athletic_commission', bout_external_id: 'b2', corner: { a: corner(null), b: corner(null) } },
    { source_key: 'florida_athletic_commission', bout_external_id: 'b3', corner: { a: corner(null), b: corner(null) } },
  ];
  const prop = (bout, side, tier = 'B') => ({ source_key: 'florida_athletic_commission', state: 'FL', appearance_key: `${bout}|${side}`, bout_external_id: bout, side,
    event_date: '2026-06-01', would: { decision: 'matched', tier }, evidence_for: [], evidence_against: [], competing: [], candidate_record: [] });
  const d = summarizeDryRun({ batchId: 't', now: 'n', blockedBouts, proposals: [prop('b1', 'b'), prop('b2', 'a'), prop('b2', 'b', 'A'), prop('b3', 'a')] });
  assert.equal(d.applied, false);
  assert.equal(d.summary.appearances_that_would_bind, 4);
  assert.equal(d.summary.bouts_that_would_be_created, 2, 'b1 (opponent resolved) and b2 (both proposed); b3 still needs a corner');
  assert.equal(d.proposals.find((p) => p.appearance_key === 'b2|a').depends_on_other_proposal, 'b2|b');
  assert.equal(d.proposals.find((p) => p.appearance_key === 'b3|a').bout_would_be_created, false);
});
