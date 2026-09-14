#!/usr/bin/env node
// Fill the printed-name map for stored sanctioning-body entries, refresh identity review candidates, print the summary.
// Same guarded store as the collectors; run via scripts/staging/titles-identity.ps1. Decides and matches nothing.

import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';
import { refreshIdentityCandidates } from '../../shared/titles/identity-candidates.mjs';

const store = guardedPostgrestStore(process.env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
const batch = Number((process.argv.find((a) => a.startsWith('--batch=')) ?? '--batch=2000').slice(8));
const r = await refreshIdentityCandidates(store, { batch });
console.log(JSON.stringify(r, null, 1));
