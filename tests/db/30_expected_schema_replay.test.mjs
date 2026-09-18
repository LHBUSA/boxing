// The staging verifier's expected schema must be a replay of the migrations a database has ACTUALLY applied, never of the
// whole repo chain — otherwise every deliberately unapplied migration reads as staging drift, and approving a migration
// would require that migration to have been applied already (the circular gate hit on 2026-09-18).
//
// This proves the mechanism scripts/staging/expected-tables.mjs provides: replaying a prefix of the chain yields exactly
// the tables that prefix creates, replaying the full chain yields the later tables too, and a drifted ledger fails closed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../scripts/staging/expected-tables.mjs', import.meta.url));
const VERSIONS = [
  '20260912000001', '20260912000002', '20260912000003', '20260912000004', '20260912000005', '20260912000006',
  '20260912000007', '20260912000008', '20260913000009', '20260913000010', '20260913000011', '20260913000012',
  '20260913000013', '20260913000014', '20260913000015', '20260913000016', '20260913000017', '20260913000018',
  '20260913000019', '20260913000020', '20260913000021', '20260913000022', '20260913000023', '20260914000024',
  '20260914000025', '20260914000026', '20260914000027', '20260914000028', '20260914000029', '20260914000030',
  '20260914000031', '20260914000032', '20260914000033', '20260914000034', '20260914000035', '20260914000036',
  '20260914000037', '20260914000038', '20260914000039', '20260914000040', '20260914000041',
];
const LATER = ['boxing_jurisdictions', 'boxing_result_classes', 'boxing_runtime_flags', 'boxing_scope_consumers',
  'boxing_source_capabilities', 'boxing_weight_class_definitions'];

const run = (args) => JSON.parse(execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', maxBuffer: 1 << 24 }));
const fails = (args) => {
  try {
    execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    return { status: err.status, stderr: String(err.stderr) };
  }
  throw new Error('expected the replay to fail');
};

test('replaying only the applied prefix yields exactly that schema; the repo head is reported separately', () => {
  const applied = run([`--versions=${VERSIONS.join(',')}`]);
  assert.deepEqual(applied.versions, VERSIONS);
  assert.ok(applied.tables.length >= 100, `${applied.tables.length} tables`);
  for (const t of LATER) assert.ok(!applied.tables.includes(t), `${t} belongs to a later migration and must not be expected`);
  assert.ok(applied.head > VERSIONS.at(-1), 'the repo head is ahead of the applied set, which is a normal pre-rollout state');
});

test('replaying the whole chain adds the later tables, so the same verifier advances automatically once they are applied', () => {
  const full = run([]);
  for (const t of LATER) assert.ok(full.tables.includes(t), t);
  assert.equal(full.versions.at(-1), full.head);
});

test('ledger drift fails closed: an unknown version, or a skipped earlier migration', () => {
  const unknown = fails([`--versions=${VERSIONS.join(',')},29990101000099`]);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /absent from the repository/);
  const skipped = fails([`--versions=${VERSIONS.filter((v) => v !== '20260913000009').join(',')}`]);
  assert.equal(skipped.status, 2);
  assert.match(skipped.stderr, /not a prefix of the repo chain|skipped earlier migration/);
});
