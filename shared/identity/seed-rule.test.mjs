import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSeed, nameAgreement, printedCountries, divisionIndex } from './seed-rule.mjs';

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
