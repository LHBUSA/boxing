#!/usr/bin/env node
// Regenerates contracts/boxing-gateway.v1.json from the gateway route table.
//   node scripts/gen-gateway-contract.mjs
// workers/boxing-gateway/src/index.test.mjs fails if the file is stale.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contractDocument } from '../workers/boxing-gateway/src/routes.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'contracts', 'boxing-gateway.v1.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(contractDocument(), null, 2)}\n`);
console.log(`wrote ${out}`);
