#!/usr/bin/env node
// One guarded commission ingestion run from an operator machine, through the
// SAME code path as the boxing-commissions Worker (guardedPostgrestStore +
// runCommissionIngest). Run via scripts/staging/commissions-ingest.ps1.
//
//   node scripts/commissions/ingest-once.mjs <nevada|florida|new_jersey> [--backfill --year=2026] [--replay-odds] [--coverage-only]
//
// Prints metrics only; never prints credentials.

import { execSync } from 'node:child_process';
import { runCommissionIngest } from '../../shared/commissions/run.mjs';
import { reprocessStoredOdds } from '../../shared/odds/replay.mjs';
import { manualProvenance } from '../../shared/provenance.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const args = process.argv.slice(2);
const adapterKey = args.find((a) => !a.startsWith('--'));
const backfill = args.includes('--backfill');
const year = Number((args.find((a) => a.startsWith('--year=')) ?? '').split('=')[1]) || null;
const env = { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '2000', COMMISSION_MAX_DOCUMENTS: '80', ...process.env };

const store = guardedPostgrestStore(env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
let sha = null;
try { sha = execSync('git rev-parse HEAD', { cwd: new URL('../..', import.meta.url) }).toString().trim(); } catch { /* not a checkout */ }
const provenance = (trigger) => manualProvenance({ workerName: 'scripts/staging/commissions-ingest.ps1', workerVersion: sha ? `git:${sha}` : null, runtime: `node ${process.version}`, trigger });

if (adapterKey && !args.includes('--coverage-only')) {
  const r = await runCommissionIngest(store, env, { adapterKey, mode: backfill ? 'backfill' : 'forward', years: year ? [year] : null, provenance: provenance(backfill ? 'backfill' : 'manual') });
  const { review_items: reviewItems, ...apply } = r.metrics?.apply ?? {};
  console.log(JSON.stringify({ adapter: adapterKey, status: r.status, runId: r.runId ?? null, assertions: r.assertions ?? null,
    metrics: r.metrics ? { ...r.metrics, apply: { ...apply, review_items: reviewItems?.length ?? 0 } } : null }, null, 1));
}
if (args.includes('--replay-odds')) {
  const r = await reprocessStoredOdds(store, { provenance: provenance('backfill'), limit: 1000 });
  console.log(JSON.stringify({ replay: r.status, runId: r.runId, metrics: r.metrics }, null, 1));
}
console.log(JSON.stringify({ commission_coverage: await store.commissionCoverage(), revisions: await store.commissionRevisionSummary(), odds_coverage: await store.providerCoverage() }, null, 1));
