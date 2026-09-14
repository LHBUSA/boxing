#!/usr/bin/env node
// Human identity review batches against the guarded Boxing store (staging via
// scripts/staging/identity-review.ps1).
//
//   node scripts/identity/review-once.mjs propose --batch=001 --size=10 --out=<dir>   (read-only)
//   node scripts/identity/review-once.mjs apply --file=<batch.json> --reviewer=<human name>
//   node scripts/identity/review-once.mjs dryrun --batch=002 --out=<dir>                  (read-only resolver projection)
//   node scripts/identity/review-once.mjs metrics                                      (read-only + stored-odds replay)
//
// apply records ONLY entries with reviewer_decision + reviewer_note filled in by the
// named human, then re-applies stored official parses (no refetch).

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { reapplyStoredDocuments } from '../../shared/commissions/run.mjs';
import { applyApprovedBatch, batchFromDryRun, batchMarkdown, blockedBoutsByState, dryRunMarkdown, proposeReviewBatch, simulateResolverOnBlockedBouts } from '../../shared/identity/human-review.mjs';
import { buildIdentityReviewReport } from '../../shared/identity/review-assist.mjs';
import { reprocessStoredOdds } from '../../shared/odds/replay.mjs';
import { manualProvenance } from '../../shared/provenance.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const [command, ...rest] = process.argv.slice(2);
const arg = (k) => (rest.find((a) => a.startsWith(`--${k}=`)) ?? '').slice(k.length + 3) || null;
const store = guardedPostgrestStore(process.env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
let sha = null;
try { sha = execSync('git rev-parse HEAD', { cwd: new URL('../..', import.meta.url) }).toString().trim(); } catch { /* not a checkout */ }
const prov = () => manualProvenance({ workerName: 'scripts/staging/identity-review.ps1', workerVersion: sha ? `git:${sha}` : null, runtime: `node ${process.version}`, trigger: 'backfill' });
const ADAPTER_OF = { nsac_nevada: 'nevada', florida_athletic_commission: 'florida', nj_sacb: 'new_jersey', mo_office_of_athletics: 'missouri', pa_state_athletic_commission: 'pennsylvania' };

async function metrics() {
  const replay = await reprocessStoredOdds(store, { provenance: prov(), limit: 1000 });
  return {
    review: await store.identityTierSummary(),
    blocked_bouts: await blockedBoutsByState(store),
    commission_bouts: (await store.commissionCoverage()).bouts,
    stored_odds_replay: { status: replay.status, observations: replay.metrics?.observations, provider_event_rows: replay.metrics?.provider_events,
      events_matched: replay.metrics?.events_matched, events_unmatched: replay.metrics?.events_unmatched,
      newly_linked_events: replay.metrics?.newly_linked_events ?? [], unmatched_reasons: replay.metrics?.unmatched_reasons ?? {} },
  };
}

if (command === 'propose') {
  const batchId = arg('batch') ?? '001';
  const out = arg('out');
  const report = await buildIdentityReviewReport(store);
  const proposal = await proposeReviewBatch(store, report, { batchId, size: Number(arg('size') ?? 10) });
  console.log(JSON.stringify(proposal.summary, null, 1));
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `identity-review-batch-${batchId}.json`), JSON.stringify(proposal, null, 1));
    writeFileSync(join(out, `identity-review-batch-${batchId}.md`), batchMarkdown(proposal));
    console.log(`wrote ${join(out, `identity-review-batch-${batchId}`)}.{json,md}`);
  }
} else if (command === 'apply') {
  const batch = JSON.parse(readFileSync(arg('file'), 'utf8'));
  const results = await applyApprovedBatch(store, batch, { reviewer: arg('reviewer') });
  console.log(JSON.stringify({ applied: results }, null, 1));
  // a human batch materializes exactly its reviewed bindings: only the documents that carry them,
  // and the graph resolver makes no new decision (its proposals are reviewed as the next batch)
  const reviewed = batch.batch.filter((e) => e.reviewer_decision);
  const adapters = [...new Set(reviewed.map((e) => ADAPTER_OF[e.source_key]))];
  for (const adapterKey of adapters) {
    const docKeys = [...new Set(reviewed.filter((e) => ADAPTER_OF[e.source_key] === adapterKey).map((e) => e.appearance.document))];
    const r = await reapplyStoredDocuments(store, { adapterKey, provenance: prov(), graphResolve: false, docKeys });
    console.log(JSON.stringify({ reapply: adapterKey, graph_resolve: false, documents: docKeys, status: r.status, run: r.runId,
      passes: r.passes.map((p) => ({ pass: p.pass, bouts_linked: p.bouts_linked, results_created: p.results_created, graph_decisions: p.graph_decisions })) }));
  }
  console.log(JSON.stringify({ after: await metrics() }, null, 1));
} else if (command === 'dryrun') {
  const batchId = arg('batch') ?? 'dry-run';
  const out = arg('out');
  const dry = await simulateResolverOnBlockedBouts(store, { batchId });
  console.log(JSON.stringify(dry.summary, null, 1));
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `resolver-dry-run-${batchId}.json`), JSON.stringify(dry, null, 1));
    writeFileSync(join(out, `resolver-dry-run-${batchId}.md`), dryRunMarkdown(dry));
    // the same proposals as a human review batch (no decision filled in)
    const batch = await batchFromDryRun(store, dry, { batchId });
    writeFileSync(join(out, `identity-review-batch-${batchId}.json`), JSON.stringify(batch, null, 1));
    writeFileSync(join(out, `identity-review-batch-${batchId}.md`), batchMarkdown(batch));
    console.log(`wrote ${join(out, `resolver-dry-run-${batchId}`)}.{json,md}`);
  }
} else if (command === 'metrics') {
  console.log(JSON.stringify(await metrics(), null, 1));
} else {
  console.error('usage: review-once.mjs propose|apply|metrics');
  process.exit(2);
}
