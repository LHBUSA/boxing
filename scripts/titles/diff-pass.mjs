#!/usr/bin/env node
// Chronological title-status diff/proposal pass on the guarded store (staging). Run via scripts/staging/titles-diff-pass.ps1.
//   node scripts/titles/diff-pass.mjs [wba,wbo,ibf] [--batch=40] [--max-batches=N]
// Records diffs and proposals only; creates no title event.

import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';
import { runChronologicalDiffs } from '../../shared/titles/chronological-diffs.mjs';

const args = process.argv.slice(2);
const arg = (k) => (args.find((a) => a.startsWith(`--${k}=`)) ?? '').slice(k.length + 3) || null;
const bodies = (args.find((a) => !a.startsWith('--')) ?? 'ibf,wba,wbo').split(',');
const store = guardedPostgrestStore(process.env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
const r = await runChronologicalDiffs(store, { bodies, batch: Number(arg('batch') ?? 40), maxBatches: Number(arg('max-batches') ?? 100000), log: console.log });
console.log(JSON.stringify({ pass: r, summary: await store.titleProposalSummary() }, null, 1));
