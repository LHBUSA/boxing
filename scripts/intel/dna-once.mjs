#!/usr/bin/env node
// Fight DNA / Judge-Referee DNA derivation for the given subjects through the
// guarded Boxing store (staging via scripts/staging/fight-dna.ps1).
//
//   node scripts/intel/dna-once.mjs <subjects.json> [--cutoff=ISO]
//     subjects.json: { "fighters": [uuid...], "officials": [uuid...] }
//
// Writes only derived snapshot tables. Punch, jab, power-punch and knockdown
// metrics stay source_unavailable without an approved stats source.

import { readFileSync } from 'node:fs';
import { registerDefinitions, runFighterDna, computeOfficialDna } from '../../shared/intel/engine.mjs';
import { ENGINE_VERSION } from '../../shared/intel/common.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const [file, ...rest] = process.argv.slice(2);
const cutoff = (rest.find((a) => a.startsWith('--cutoff=')) ?? '').split('=')[1] || new Date().toISOString();
const subjects = JSON.parse(readFileSync(file, 'utf8'));
const store = guardedPostgrestStore(process.env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
console.log(JSON.stringify({ definitions: await registerDefinitions(store) }));

const chunk = 50;
let fighterWritten = 0;
for (let i = 0; i < subjects.fighters.length; i += chunk) {
  const r = await runFighterDna(store, subjects.fighters.slice(i, i + chunk), cutoff);
  fighterWritten += r.written;
}
const officialRun = await store.startIntelRun('official_dna', ENGINE_VERSION, cutoff);
let officialWritten = 0;
for (const id of subjects.officials ?? []) officialWritten += (await computeOfficialDna(store, id, cutoff, { runId: officialRun })).written;
await store.finishIntelRun(officialRun, 'ok', (subjects.officials ?? []).length, officialWritten, {});
console.log(JSON.stringify({ cutoff, fighters: subjects.fighters.length, fighter_rows_written: fighterWritten, officials: (subjects.officials ?? []).length, official_rows_written: officialWritten }));
