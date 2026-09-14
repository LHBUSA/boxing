#!/usr/bin/env node
// One guarded sanctioning-body collection from an operator machine, through the SAME code path as the boxing-rankings
// Worker (guardedPostgrestStore + runSanctioningCollection). Run via scripts/staging/titles-collect.ps1.
//
//   node scripts/titles/collect-once.mjs <wba|ibf|wbo>                               current documents
//   node scripts/titles/collect-once.mjs ibf --backfill                               2005-2026 history (checkpointed)
//   node scripts/titles/collect-once.mjs <wba|wbo> --backfill --from=2000-01 --to=2026-08 [--max-requests=N]
//
// WBC has no collector (not licensed). Prints metrics only; never prints credentials.

import { execSync } from 'node:child_process';
import { manualProvenance } from '../../shared/provenance.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';
import { monthsBetween, runSanctioningCollection } from '../../shared/titles/sanctioning-ingest.mjs';

const args = process.argv.slice(2);
const body = args.find((a) => !a.startsWith('--'));
const arg = (k) => (args.find((a) => a.startsWith(`--${k}=`)) ?? '').slice(k.length + 3) || null;
const backfill = args.includes('--backfill');
const ym = (s) => { const [y, m] = String(s).split('-').map(Number); return { y, m }; };
const env = { TITLES_INGEST_ENABLED: 'true', ...process.env };
const store = guardedPostgrestStore(env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
let sha = null;
try { sha = execSync('git rev-parse HEAD', { cwd: new URL('../..', import.meta.url) }).toString().trim(); } catch { /* not a checkout */ }
const provenance = manualProvenance({ workerName: 'scripts/staging/titles-collect.ps1', workerVersion: sha ? `git:${sha}` : null, runtime: `node ${process.version}`, trigger: backfill ? 'backfill' : 'manual' });
const months = backfill && body !== 'ibf' ? monthsBetween(ym(arg('from') ?? '2000-01'), ym(arg('to') ?? '2026-08')).reverse() : null;
const r = await runSanctioningCollection(store, env, { body, mode: backfill ? 'backfill' : 'current', months, maxRequests: arg('max-requests') ? Number(arg('max-requests')) : null, provenance });
const { months: captured, ...rest } = r.metrics ?? {};
console.log(JSON.stringify({ body, status: r.status, runId: r.runId ?? null, reason: r.reason ?? null, metrics: { ...rest, months_captured: captured ? Object.keys(captured).length : 0,
  first_month: captured ? Object.keys(captured).sort()[0] : null, last_month: captured ? Object.keys(captured).sort().at(-1) : null } }, null, 1));
