import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTitleRemark, titlesFromRemarks } from './title-remarks.mjs';

test('commission title remarks map to world lineages only when unambiguous', () => {
  const t = (s) => parseTitleRemark(s).titles.map((x) => `${x.organization_slug}:${x.tier}`);
  assert.deepEqual(t('Benavidez wins WBA Super & WBO Cruiserweight Titles'), ['wba:super', 'wbo:world']);
  assert.deepEqual(t('Synth retains WBC Super Middleweight Title'), ['wbc:world'], '"Super Middleweight" is the division, not the WBA super lineage');
  assert.deepEqual(t('Synth wins Vacant IBF Welterweight Title'), ['ibf:world']);
  assert.deepEqual(t('Synth wins WBO Interim Lightweight Title'), ['wbo:interim']);
  assert.deepEqual(t('Synth wins WBA World Lightweight Title'), ['wba:regular']);
  for (const regional of ['Blancas wins Vacant US WBC Super Middleweight Title', 'Chaves retains WBO Latino Lightweight Title', 'IBF North American Championship Title',
    'WBA Continental Americas/WBO Global Championship Title', 'Synth wins WBC Silver Title', 'Synth wins WBC Youth Title', 'WBO Intercontinental Title',
    "Synth wins WBC Women's Title", 'IBF Title Eliminator']) {
    assert.deepEqual(t(regional), [], regional);
  }
  assert.deepEqual(t('Synth wins WBA Lightweight Title'), [], 'a bare WBA is two possible lineages');
  assert.equal(parseTitleRemark('Synth wins WBA Lightweight Title').skipped, 'wba:lineage_not_stated');
  assert.deepEqual(t('Synth wins WBA Interim & WBO Titles'), [], 'interim with several bodies is not guessed');
  assert.deepEqual(t('Two wins Synthetic Welterweight Title'), []);
  assert.deepEqual(t('Synth is Undisputed WBC WBO IBF Champion'), ['wbc:world', 'wbo:world', 'ibf:world'], 'undisputed wording adds nothing beyond the bodies named');
  assert.deepEqual(titlesFromRemarks(['Synth wins WBC Title', 'Synth wins WBC Title']).length, 1);
});
