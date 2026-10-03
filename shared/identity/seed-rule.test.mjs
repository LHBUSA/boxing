import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSeed, nameAgreement, printedCountries, divisionIndex, nearName } from './seed-rule.mjs';

const subject = (over = {}) => ({ person_key: 'aaronmckenna', names_as_printed: ['Aaron McKenna'], countries_as_printed: ['IRL'],
  divisions: ['middleweight'], status_date: '2026-09-30', entries: [{ body: 'wbo', cluster_key: 'name:aaron mckenna', printed: 'Aaron McKenna', country: 'IRL' }], ...over });
const cand = (over = {}) => ({ qid: 'Q1', label: 'Aaron McKenna', names: [], citizenship_iso3: ['IRL'], sport_country_iso3: [],
  dobs: [{ date: '1999-09-15', precision: 'day' }], deceased: false, competition_classes: [], revision: 7, ...over });

test('name, country, single DOB at a fighting age and alive: AUTO_SEEDED with every check recorded', () => {
  const d = decideSeed(subject(), [cand()]);
  assert.equal(d.decision, 'AUTO_SEEDED');
  assert.equal(d.wikidata_qid, 'Q1');
  assert.deepEqual(Object.keys(d.evidence.checks).sort(), ['alive', 'country', 'division', 'dob', 'era', 'name', 'sanctioning_bodies']);
  assert.equal(d.evidence.checks.country.result, 'agrees');
});

test('a name-only match is never enough: no printed country, or a country mismatch, is REVIEW', () => {
  assert.equal(decideSeed(subject({ countries_as_printed: [] }), [cand()]).decision, 'REVIEW_REQUIRED');
  const m = decideSeed(subject({ countries_as_printed: ['MEX'] }), [cand()]);
  assert.equal(m.decision, 'REVIEW_REQUIRED');
  assert.deepEqual(m.reasons, ['country_mismatch_needs_more_evidence']);
});

test('conflicting DOBs are a hard hold; no DOB leaves the era unverifiable', () => {
  const c = decideSeed(subject(), [cand({ dobs: [{ date: '1999-09-15', precision: 'day' }, { date: '1998-09-15', precision: 'day' }] })]);
  assert.ok(c.reasons.includes('dob_conflict_hard_hold'));
  assert.equal(decideSeed(subject(), [cand({ dobs: [] })]).reasons[0], 'no_dob_era_unverifiable');
});

test('a deceased or out-of-era namesake is never seeded as a current champion', () => {
  assert.ok(decideSeed(subject(), [cand({ deceased: true })]).reasons.includes('recorded_deceased'));
  assert.ok(decideSeed(subject(), [cand({ dobs: [{ date: '1950-01-01', precision: 'day' }] })]).reasons.includes('age_implausible_for_current_champion'));
});

test('two plausible candidates HOLD; country separates them only when exactly one agrees', () => {
  const two = decideSeed(subject(), [cand(), cand({ qid: 'Q2' })]);
  assert.equal(two.decision, 'REVIEW_REQUIRED');
  assert.deepEqual(two.reasons, ['several_plausible_wikidata_candidates']);
  const sep = decideSeed(subject(), [cand(), cand({ qid: 'Q2', citizenship_iso3: ['USA'] })]);
  assert.equal(sep.decision, 'AUTO_SEEDED');
  assert.equal(sep.wikidata_qid, 'Q1');
});

test('no name-agreeing human boxer is NO_CANDIDATE; Wikidata never supplies a record', () => {
  const d = decideSeed(subject(), [cand({ label: 'Someone Else' })]);
  assert.equal(d.decision, 'NO_CANDIDATE');
  const s = decideSeed(subject(), [cand()]);
  for (const k of ['wins', 'losses', 'record', 'title', 'ranking', 'pro_debut']) assert.equal(JSON.stringify(s).includes(`"${k}"`), false, k);
});

test('name agreement folds case, accents, apostrophe variants, middle initials and token order', () => {
  assert.equal(nameAgreement("O'SHAQUIE FOSTER", 'O’Shaquie Foster'), 'exact');
  assert.equal(nameAgreement('ABRAHAM R PEREZ', 'Abraham Pérez'), 'initial_dropped');
  assert.equal(nameAgreement('INOUE NAOYA', 'Naoya Inoue'), 'token_order');
  assert.equal(nameAgreement('MICHAL CIESLAK', 'Michał Cieślak'), 'exact');
  assert.equal(nameAgreement('ISAAC CRUZ JR', 'Isaac Cruz'), 'suffix_dropped');
  assert.equal(nameAgreement('Cruz Jr', 'Cruz'), null, 'a suffix never reduces a name to one token');
  assert.equal(nameAgreement('Ryan Garcia', 'Ryan Garner'), null);
});

test('the canonical name is the Wikidata name that agreed, not a non-agreeing label', () => {
  const d = decideSeed(subject({ names_as_printed: ['KENSHIRO TERAJI'], countries_as_printed: ['JPN'] }),
    [cand({ label: 'Ken Shiro', names: ['Kenshiro Teraji'], citizenship_iso3: ['JPN'] })]);
  assert.equal(d.decision, 'AUTO_SEEDED');
  assert.equal(d.canonical_name, 'Kenshiro Teraji');
});

test('Wikidata with no country at all is not a mismatch, but it still cannot corroborate: REVIEW', () => {
  const d = decideSeed(subject(), [cand({ citizenship_iso3: [], sport_country_iso3: [] })]);
  assert.deepEqual(d.reasons, ['no_wikidata_country_to_corroborate']);
  assert.equal(d.evidence.checks.country.result, 'wikidata_has_no_country');
});

test('printed countries normalise per body and keep what they cannot read', () => {
  assert.deepEqual(printedCountries(['US/MEXICO', 'United States', 'ENG']).codes, ['GBR', 'MEX', 'USA']);
  assert.deepEqual(printedCountries(['Atlantis']).unknown, ['Atlantis']);
});

test('a Wikidata competition class two or more divisions away from every printed division is REVIEW', () => {
  assert.equal(divisionIndex("men's light middleweight"), divisionIndex('super_welterweight'));
  assert.equal(decideSeed(subject(), [cand({ competition_classes: ['super middleweight'] })]).decision, 'AUTO_SEEDED');
  assert.ok(decideSeed(subject(), [cand({ competition_classes: ['heavyweight'] })]).reasons.includes('division_contradicts_wikidata_class'));
});

test('1.1.0: an existing fighter with the same first and last name (middle name or suffix aside) makes the subject REVIEW', () => {
  const lopez = subject({ names_as_printed: ['TEOFIMO LOPEZ'], countries_as_printed: ['USA'] });
  const c = cand({ label: 'Teófimo López', citizenship_iso3: ['USA'] });
  assert.equal(decideSeed(lopez, [c]).decision, 'AUTO_SEEDED');
  const d = decideSeed(lopez, [c], { existing: [{ id: 'f1', display_name: 'Teofimo Andres Lopez' }] });
  assert.equal(d.decision, 'POSSIBLE_EXISTING_FIGHTER');
  assert.deepEqual(d.reasons, ['existing_fighter_may_be_same_person']);
  assert.equal(decideSeed(subject({ names_as_printed: ['Bruce Carrington'], countries_as_printed: ['USA'] }), [cand({ label: 'Bruce Carrington', citizenship_iso3: ['USA'] })],
    { existing: [{ id: 'f2', display_name: 'Bruce Carrington Jr.' }] }).decision, 'POSSIBLE_EXISTING_FIGHTER');
  assert.equal(decideSeed(subject(), [cand()], { existing: [{ id: 'f3', display_name: 'Aaron Smith' }] }).decision, 'AUTO_SEEDED', 'a shared first name alone is not a match');
});

test('1.2.0: near spellings are candidates for review, never automatic; common distinct names are not flagged', () => {
  assert.equal(nearName('Dmitrii Bivol', 'Dmitry Bivol'), true);
  assert.equal(nearName('DANIEL BUBOIS', 'Daniel Dubois'), true);
  assert.equal(nearName('Ricardo Sandoval', 'Ricardo Rafael Sandoval'), true);
  assert.equal(nearName('Jesse Rodriguez', 'Jose Rodriguez'), false);
  assert.equal(nearName('Callum Smith', 'Chicago Smith'), false);
  const d = decideSeed(subject({ names_as_printed: ['Dmitrii Bivol'], countries_as_printed: ['RUS'] }), [], { existing: [{ id: 'b', display_name: 'Dmitry Bivol' }] });
  assert.equal(d.decision, 'POSSIBLE_EXISTING_FIGHTER');
  assert.equal(d.evidence.existing_fighters[0].match, 'near_spelling');
});

test('1.2.0: an entry that already resolves is EXISTING_LINK; entries resolving to two fighters are REVIEW', () => {
  const linked = subject({ entries: [{ body: 'wbo', cluster_key: 'a', printed: 'Aaron McKenna', linked_fighter_id: 'F1' }, { body: 'ibf', cluster_key: 'b', printed: 'Aaron McKenna' }] });
  const d = decideSeed(linked, [cand()]);
  assert.equal(d.decision, 'EXISTING_LINK');
  assert.equal(d.evidence.fighter_id, 'F1');
  assert.equal(d.evidence.unlinked_entries.length, 1, 'the unlinked entry is listed, not linked');
  const split = subject({ entries: [{ body: 'wbo', printed: 'Aaron McKenna', linked_fighter_id: 'F1' }, { body: 'ibf', printed: 'Aaron McKenna', linked_fighter_id: 'F2' }] });
  assert.deepEqual(decideSeed(split, [cand()]).reasons, ['entries_resolve_to_different_fighters']);
});
