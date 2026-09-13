#!/usr/bin/env node
// Identity-graph operations against the guarded Boxing store (staging only via
// scripts/staging/identity-graph.ps1). Same code paths as the Worker.
//
//   node scripts/identity/graph-once.mjs summary
//   node scripts/identity/graph-once.mjs report --out=<dir>          (read-only evidence report, dry-run projection)
//   node scripts/identity/graph-once.mjs reapply nevada florida     (re-apply stored parses; no refetch)
//
// Prints metrics only; never prints credentials. Report files contain boxer
// names and official facts only (no DOB, no private identifiers).

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { reapplyStoredDocuments } from '../../shared/commissions/run.mjs';
import { buildIdentityReviewReport, reportMarkdown } from '../../shared/identity/review-assist.mjs';
import { manualProvenance } from '../../shared/provenance.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const [command, ...rest] = process.argv.slice(2);
const store = guardedPostgrestStore(process.env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
let sha = null;
try { sha = execSync('git rev-parse HEAD', { cwd: new URL('../..', import.meta.url) }).toString().trim(); } catch { /* not a checkout */ }

const counts = async () => ({ tiers: await store.identityTierSummary(), commission_coverage: await store.commissionCoverage() });

if (command === 'summary') {
  console.log(JSON.stringify(await counts(), null, 1));
} else if (command === 'report') {
  const out = (rest.find((a) => a.startsWith('--out=')) ?? '').split('=')[1];
  const report = await buildIdentityReviewReport(store);
  console.log(JSON.stringify(report.summary, null, 1));
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'identity-review-report.json'), JSON.stringify(report, null, 1));
    writeFileSync(join(out, 'identity-review-report.md'), reportMarkdown(report));
    console.log(`wrote ${join(out, 'identity-review-report.{json,md}')}`);
  }
} else if (command === 'reapply') {
  const before = await counts();
  const results = {};
  for (const adapterKey of rest.filter((a) => !a.startsWith('--'))) {
    const provenance = manualProvenance({ workerName: 'scripts/staging/identity-graph.ps1', workerVersion: sha ? `git:${sha}` : null, runtime: `node ${process.version}`, trigger: 'backfill' });
    const r = await reapplyStoredDocuments(store, { adapterKey, provenance });
    results[adapterKey] = { status: r.status, runId: r.runId, documents: r.documents, passes: r.passes };
    console.log(JSON.stringify({ adapter: adapterKey, ...results[adapterKey] }, null, 1));
  }
  console.log(JSON.stringify({ before, after: await counts() }, null, 1));
} else {
  console.error('usage: graph-once.mjs summary | report [--out=dir] | reapply <adapter...>');
  process.exit(2);
}
