import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrintedRecord } from './printed-record.mjs';

const counts = (r) => r && [r.parse_state, r.wins, r.losses, r.draws, r.no_contests, r.ko_wins];

test('only explicitly printed components are parsed; a missing draw or NC component is null, never 0', () => {
  assert.deepEqual(counts(parsePrintedRecord('18-9')), ['parsed', 18, 9, null, null, null]);
  assert.deepEqual(counts(parsePrintedRecord('13-7-1')), ['parsed', 13, 7, 1, null, null]);
  assert.deepEqual(counts(parsePrintedRecord('9-1-2-1')), ['parsed', 9, 1, 2, 1, null]);
  assert.deepEqual(counts(parsePrintedRecord('0-0')), ['parsed', 0, 0, null, null, null]);
  assert.deepEqual(counts(parsePrintedRecord('38-33-1')), ['parsed', 38, 33, 1, null, null]);
});

test('KO totals only when printed; the raw text is always kept', () => {
  assert.deepEqual(counts(parsePrintedRecord('12-3-1 (8 KO)')), ['parsed', 12, 3, 1, null, 8]);
  assert.deepEqual(counts(parsePrintedRecord('12-3, 8 KOs')), ['parsed', 12, 3, null, null, 8]);
  assert.equal(parsePrintedRecord('  12-3-1  (8 KO) ').raw, '12-3-1 (8 KO)');
});

test('blank is no claim; malformed or ambiguous text is held with every count null', () => {
  assert.equal(parsePrintedRecord(''), null);
  assert.equal(parsePrintedRecord(null), null);
  for (const raw of ['Debut', 'N/A', '12/03/1990', '1-2-3-4-5', '12 - 3 KO', '5-1 (9 KO)']) {
    const r = parsePrintedRecord(raw);
    assert.equal(r.parse_state, 'held', raw);
    assert.deepEqual([r.wins, r.losses, r.draws, r.no_contests, r.ko_wins], [null, null, null, null, null], raw);
    assert.equal(r.raw, raw.trim());
  }
});
