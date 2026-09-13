#!/usr/bin/env node
// One guarded boxing odds capture from an operator machine, through the SAME
// code path as the boxing-odds Worker (guardedPostgrestStore + runCapture).
//
//   Run via scripts/staging/capture-odds.ps1, which verifies the staging
//   project and injects credentials into this process only.
//
//   node scripts/odds/capture-once.mjs [--force] [--coverage-only]
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOXING_ENVIRONMENT,
// BOXING_SUPABASE_REF, ODDS_API_KEY (unless --coverage-only). Plan and budget
// vars default to workers/boxing-odds/wrangler.toml [env.staging].
// Prints metrics only; never prints credentials.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { manualProvenance } from '../../shared/provenance.mjs';
import { runCapture } from '../../shared/odds/capture.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const args = new Set(process.argv.slice(2));
const toml = readFileSync(new URL('../../workers/boxing-odds/wrangler.toml', import.meta.url), 'utf8');
const stagingVars = Object.fromEntries([...toml.slice(toml.search(/^\[env\.staging\.vars\]$/m)).split(/\n\[/)[0].matchAll(/^([A-Z_]+) = "([^"]*)"$/gm)].map((m) => [m[1], m[2]]));
const env = { ...stagingVars, ...process.env };

const store = guardedPostgrestStore(env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);

if (!args.has('--coverage-only')) {
  let sha = null;
  try { sha = execSync('git rev-parse HEAD', { cwd: new URL('../..', import.meta.url) }).toString().trim(); } catch { /* not a checkout */ }
  const provenance = manualProvenance({ workerName: 'scripts/staging/capture-odds.ps1', workerVersion: sha ? `git:${sha}` : null, runtime: `node ${process.version}` });
  const r = await runCapture(store, env, { force: args.has('--force'), provenance });
  const key = env.ODDS_API_KEY;
  const out = JSON.stringify({ status: r.status, runId: r.runId ?? null, decision: r.decision ?? r.metrics?.decision ?? null, assertions: r.assertions ?? null, metrics: r.metrics ?? null }, null, 1);
  console.log(key ? out.replaceAll(key, '<redacted>') : out);
}
console.log(JSON.stringify({ coverage: await store.providerCoverage() }, null, 1));
