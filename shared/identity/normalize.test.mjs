import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldText, nameKeys, parseName, similarity, skeleton } from './normalize.mjs';
import { compareDob, compareNames } from './evidence.mjs';

test('source-native name is preserved verbatim', () => {
  const raw = '  Julio César Chávez Jr. ';
  assert.equal(parseName(raw).raw, raw);
});

test('diacritics, apostrophes, hyphens and whitespace', () => {
  assert.equal(parseName('José  Núñez').full, 'jose nunez');
  assert.equal(parseName("Seán O'Brien").full, 'sean obrien');
  assert.deepEqual(parseName('Anna Smith-Jones').core, ['anna', 'smith', 'jones']);
  assert.equal(parseName('Anna Smith-Jones').joined, parseName('Anna SmithJones').joined);
  assert.equal(parseName('Łukasz Różański').full, 'lukasz rozanski');
});

test('suffixes are separated and never lost', () => {
  assert.equal(parseName('Rafael Mendoza Jr.').suffix, 'jr');
  assert.equal(parseName('Rafael Mendoza, Jr.').suffix, 'jr');
  assert.equal(parseName('Robert Lee III').suffix, 'iii');
  assert.equal(parseName('Rafael Mendoza Jr.').full, 'rafael mendoza');
});

test('quoted and parenthesised nicknames are extracted', () => {
  const p = parseName('Emmanuel "The Hammer" Okafor');
  assert.deepEqual(p.nicknames, ['The Hammer']);
  assert.equal(p.full, 'emmanuel okafor');
  assert.deepEqual(parseName('Kofi Boateng (Iron)').nicknames, ['Iron']);
});

test('particles are optional for matching but kept in tokens', () => {
  const p = parseName('Oscar De La Torre');
  assert.deepEqual(p.core, ['oscar', 'torre']);
  assert.deepEqual(p.tokens, ['oscar', 'de', 'la', 'torre']);
});

test('comma-reordered names', () => {
  assert.equal(parseName('Núñez, José Ramón').full, 'jose ramon nunez');
  assert.equal(parseName('Núñez, José Ramón').reorderedFromComma, true);
});

test('cyrillic transliteration and skeleton variants', () => {
  assert.equal(foldText('Олександр Гвозденко'), 'oleksandr gvozdenko');
  for (const [a, b] of [['oleksandr', 'alexander'], ['hvozdyk', 'gvozdik'], ['mykhailo', 'mikhail'], ['kowalski', 'kovalski'], ['petroff', 'petrov'], ['yevgeny', 'evgenii']]) {
    assert.equal(skeleton(a), skeleton(b), `${a} ~ ${b}`);
  }
  assert.notEqual(skeleton('smith'), skeleton('jones'));
});

test('non-Latin scripts without a romanization stay intact', () => {
  assert.equal(parseName('井上 尚弥').script, 'other');
  assert.deepEqual(parseName('井上 尚弥').core, ['井上', '尚弥']);
});

test('name comparison levels', () => {
  assert.equal(compareNames('Naoya Inoue', 'Inoue Naoya').level, 'reordered');
  assert.equal(compareNames('Carlos Gutierrez', 'Carlos Andrés Gutiérrez Salazar').level, 'containment');
  assert.equal(compareNames('J. Smith', 'John Smith').level, 'initial');
  assert.equal(compareNames('Rafael Mendoza', 'Rafael Mendoza Jr.').level, 'containment');
  assert.deepEqual(compareNames('Rafael Mendoza Sr.', 'Rafael Mendoza Jr.').flags, ['suffix_conflict']);
  assert.equal(compareNames('Oscar Delatorre', 'Oscar De La Torre').level, 'joined');
  assert.equal(compareNames('Oscar Torres', 'Oscar De La Torre').level, 'fuzzy');
  assert.equal(compareNames('Oscar De-La-Torre', 'Oscar De La Torre').level, 'exact');
  // sibling/twin signatures: differing given or middle names are flagged
  assert.deepEqual(compareNames('Gary Antuanne Russell', 'Gary Antonio Russell').flags, ['given_name_differs']);
  assert.deepEqual(compareNames('Darian Vance', 'Dorian Vance').flags, ['given_name_differs']);
  assert.deepEqual(compareNames('Tomasz Wieczorkek', 'Tomasz Wieczorek').flags, [], 'surname typo is not a sibling signature');
});

test('DOB comparison distinguishes typos from different people', () => {
  assert.equal(compareDob('1996-07-14', '1996-07-14'), 'exact');
  assert.equal(compareDob('1996-07-15', '1996-07-14'), 'typo_like');
  assert.equal(compareDob('1996-04-07', '1996-07-04'), 'typo_like');
  assert.equal(compareDob('1986-07-14', '1996-07-14'), 'typo_like');
  assert.equal(compareDob('1988-11-20', '1994-02-03'), 'conflict');
  assert.equal(compareDob('1994', '1994-02-03', { observedPrecision: 'year' }), 'year_match');
});

test('index and lookup keys agree', () => {
  const indexed = new Set(nameKeys('Carlos Andrés Gutiérrez Salazar'));
  assert.ok(nameKeys('Carlos Gutierrez', { lookup: true }).some((k) => indexed.has(k)));
  const nick = new Set(nameKeys('The Hammer', { kind: 'nickname' }));
  assert.ok(nameKeys('The Hammer', { lookup: true }).some((k) => nick.has(k)));
  assert.ok(similarity('tomasz wieczorkek', 'tomasz wieczorek') > 0.9);
});
