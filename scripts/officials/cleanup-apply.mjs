#!/usr/bin/env node
// Applies ONLY Category A (deterministic parser-artifact) official canonicalizations to Boxing STAGING.
// Run through scripts/staging/officials-cleanup.ps1 -ApplyCategoryA -Actor "<name>" (verifies the project).
//
//   node scripts/officials/cleanup-apply.mjs --actor="<name>" --confirm-staging [--out=<dir>]
//
// The plan is recomputed from live evidence (no simulated parses, no file input), so nothing stale or
// hand-edited can be applied. Each item goes through boxing_apply_official_canonicalization, which
// re-verifies the evidence in the database. B, C and D are never applied; they are written as a review batch.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCleanupPlan } from '../../shared/identity/official-cleanup.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const actor = (arg('actor') ?? '').trim();
if (!actor || !process.argv.includes('--confirm-staging')) {
  console.error('usage: cleanup-apply.mjs --actor="<name>" --confirm-staging [--out=<dir>]');
  process.exit(2);
}
const out = arg('out') ?? '.';
const store = guardedPostgrestStore(process.env);
if (store.writeTarget.environment !== 'staging') throw new Error(`refusing non-staging target ${store.writeTarget.ref}`);
console.error(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);

const before = await store.officialCleanupEvidence();
const plan = buildCleanupPlan(before);
const applied = [];
for (const item of plan.A) {
  try {
    applied.push({ candidate: item.candidate_a.name, corrected: item.corrected_name, result: await store.applyOfficialCanonicalization({ ...item.apply, actor }) });
  } catch (err) {
    applied.push({ candidate: item.candidate_a.name, corrected: item.corrected_name, error: String(err.message).slice(0, 300) });
  }
}
const after = await store.officialCleanupEvidence();
const afterPlan = buildCleanupPlan(after);
const review = { tool_version: plan.tool_version, generated_at: new Date().toISOString(), note: 'Human review required. Nothing here is applied automatically.',
  B: afterPlan.B, C: afterPlan.C, A_pending: afterPlan.A_pending, review_queue: afterPlan.review_queue };
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'officials-cleanup-applied.json'), `${JSON.stringify({ actor, applied, totals_before: before.totals, totals_after: after.totals, summary_before: plan.summary, summary_after: afterPlan.summary }, null, 1)}\n`);
writeFileSync(join(out, 'officials-review-batch.json'), `${JSON.stringify(review, null, 1)}\n`);
console.log(JSON.stringify({ applied, totals_before: before.totals, totals_after: after.totals, summary_before: plan.summary, summary_after: afterPlan.summary }, null, 1));
if (applied.some((a) => a.error)) process.exit(1);
