#!/usr/bin/env node
// One guarded promoter card collection run, through the SAME code path the dry run exercises.
// Run via scripts/staging/promoter-collect.ps1, which verifies the target project and supplies the key.
//
//   node scripts/promoters/collect-once.mjs [--apply] [--sources=promoter_pbc,promoter_matchroom] [--window=21] [--out=file.json]
//
// Without --apply it is a dry run: it fetches, parses, resolves identities, exercises the rights lane and prints the
// write plan while writing nothing. With --apply it canonicalizes the announced cards through applyCardDocument, where
// migration 0045's lane gate refuses anything outside the schedule lane.

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const args = process.argv.slice(2);
const arg = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const apply = args.includes('--apply');
const store = guardedPostgrestStore(process.env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
let sha = null;
try { sha = execSync('git rev-parse HEAD', { cwd: new URL('../..', import.meta.url) }).toString().trim(); } catch { /* not a checkout */ }

const receipt = await collectPromoterCards(store, {
  sources: (arg('sources') ?? 'promoter_pbc,promoter_matchroom').split(',').filter(Boolean),
  dryRun: !apply,
  windowDays: Number(arg('window') ?? 21),
  maxEvents: Number(arg('max') ?? 6),
  now: new Date().toISOString(),
});
receipt.code_version = sha ? `git:${sha}` : null;
receipt.target = { project: store.writeTarget.projectName, ref: store.writeTarget.ref, environment: store.writeTarget.environment };

for (const s of receipt.sources) {
  console.log(`\n=== ${s.source_key} (${s.parser_version}) discovered=${s.discovered ?? 0}${s.error ? ` ERROR ${s.error}` : ''}`);
  for (const e of s.events) {
    if (e.skipped || e.error) { console.log(`  - ${e.url}: ${e.skipped ?? e.error}`); continue; }
    console.log(`  * ${e.date} ${e.event_name} — ${e.venue ?? 'venue not stated'}${e.city ? `, ${e.city}` : ''} | ${e.broadcaster ?? 'no broadcaster'} | ${e.announced_bouts} bouts | ${e.plan.event.action}`);
    if (e.applied) console.log(`    applied: ${e.applied.status} changes=[${e.applied.changes.join(', ')}] unresolved=${e.applied.unresolved} lane_refusals=${e.applied.lane_refusals.length}`);
    if (e.parser_problems.length) console.log(`    refused: ${e.parser_problems.join(' ; ')}`);
  }
}
const out = arg('out');
if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, `${JSON.stringify(receipt, null, 1)}\n`); console.log(`\nwrote ${out}`); }
console.log(`\n${apply ? 'APPLIED to the verified target above.' : 'DRY RUN: nothing was written.'}`);
