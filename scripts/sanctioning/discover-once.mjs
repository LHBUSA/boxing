#!/usr/bin/env node
// One sanctioning-schedule discovery run. Run via scripts/staging/sanctioning-discover.ps1 (verifies the target, supplies
// the key). Without --apply nothing is written; with --apply only discovery candidates are recorded.
//
//   node scripts/sanctioning/discover-once.mjs [--apply] [--window=120] [--out=file.json]

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { discoverSanctioningSchedules } from '../../shared/sanctioning/discover.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const args = process.argv.slice(2);
const arg = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const apply = args.includes('--apply');
const store = guardedPostgrestStore(process.env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
const receipt = await discoverSanctioningSchedules(store, { dryRun: !apply, windowDays: Number(arg('window') ?? 120) });
for (const s of receipt.sources) {
  console.log(`=== ${s.source_key} (${s.parser_version}) listed=${s.listed}${s.error ? ` ERROR ${s.error}` : ''}`);
  for (const c of s.candidates) console.log(`  * ${c.probable_date} ${c.discovered_name} — ${c.probable_city ?? '?'} | promoter ${c.probable_promoter ?? '-'} | ${c.recorded ? (c.recorded.error ?? c.recorded.state) : 'dry run'}`);
}
console.log(JSON.stringify(receipt.summary));
const out = arg('out');
if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(receipt, null, 2)); console.log(`wrote ${out}`); }
