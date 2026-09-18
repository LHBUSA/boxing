#!/usr/bin/env node
// Prints (JSON) the boxing_* tables that a GIVEN SET of migration versions produces on a fresh LOCAL database.
//
//   node expected-tables.mjs --versions=20260912000001,20260912000002,...   # replay exactly these, in order
//   node expected-tables.mjs                                                # replay the whole repo chain
//
// The staging verifier passes the versions recorded in staging's own migration ledger, so "expected schema" means
// "the schema the migrations applied to that database produce" — never "the schema the repo would produce today". A
// migration that is committed but deliberately not applied is a pending rollout, not drift.
//
// Exit codes: 2 = migration ledger drift (unknown version, out of order, or a skipped earlier migration),
//             3 = the local replay of that set failed.
//
// Output: { head, versions, files, tables }.

import { freshDatabase, applyMigrations, migrationFiles } from '../../tests/helpers/db.mjs';

const arg = process.argv.find((a) => a.startsWith('--versions='));
const requested = arg ? arg.slice('--versions='.length).split(',').map((v) => v.trim()).filter(Boolean) : null;

const repo = migrationFiles().map((f) => ({ version: f.split(/[\\/]/).pop().slice(0, 14), file: f }));
const byVersion = new Map(repo.map((r) => [r.version, r.file]));

let files;
if (requested) {
  const missing = requested.filter((v) => !byVersion.has(v));
  if (missing.length) {
    console.error(`migration ledger drift: version(s) recorded on the target but absent from the repository: ${missing.join(', ')}`);
    process.exit(2);
  }
  const ordered = [...requested].sort();
  // the applied set must be a prefix of the repo chain: a gap means an earlier migration was skipped on that database
  const expectedPrefix = repo.slice(0, ordered.length).map((r) => r.version);
  if (expectedPrefix.join(',') !== ordered.join(',')) {
    const skipped = expectedPrefix.filter((v) => !ordered.includes(v));
    console.error(`migration ledger drift: the applied set is not a prefix of the repo chain; skipped earlier migration(s): ${skipped.join(', ') || 'none — order mismatch'}`);
    process.exit(2);
  }
  files = ordered.map((v) => byVersion.get(v));
} else {
  files = repo.map((r) => r.file);
}

const db = await freshDatabase('staging_expected', { migrate: false });
let tables;
try {
  await applyMigrations(db.client, files);
  const { rows } = await db.client.query(
    "select tablename from pg_tables where schemaname = 'public' and tablename like 'boxing\\_%' order by 1");
  tables = rows.map((r) => r.tablename);
} catch (err) {
  console.error(`local replay of the applied migration set failed: ${err.message}`);
  await db.close();
  process.exit(3);
}
await db.close();
console.log(JSON.stringify({
  head: repo.at(-1)?.version ?? null,
  versions: files.map((f) => f.split(/[\\/]/).pop().slice(0, 14)),
  files: files.map((f) => f.split(/[\\/]/).pop()),
  tables,
}));
