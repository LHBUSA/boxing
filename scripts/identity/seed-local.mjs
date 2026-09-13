#!/usr/bin/env node
// Runs an identity seed into a LOCAL database (never remote).
//   node scripts/identity/seed-local.mjs --db boxing_seed --adapter wikidata --limit 500 --pages 2 [--born-from 1975]
//   node scripts/identity/seed-local.mjs --db boxing_seed --adapter wikidata --replay tmp/wikidata-page.json
// --save <file> stores the fetched page(s) so matching can be replayed without refetching.

import pg from 'pg';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { adminUrl } from '../../tests/helpers/db.mjs';
import { pgStore } from '../lib/pg-store.mjs';
import { identityAdapters } from '../../shared/adapters/identity/registry.mjs';
import { runSeed } from '../../shared/identity/seed.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]);
  return acc;
}, []));

if (!args.db || !/^[a-z][a-z0-9_]{2,40}$/.test(args.db)) {
  console.error('usage: --db <local_database> --adapter wikidata [--limit N] [--pages N] [--save file] [--replay file]');
  process.exit(2);
}
const adapter = identityAdapters[args.adapter ?? 'wikidata'];
if (!adapter) throw new Error(`unknown adapter ${args.adapter}`);

const url = adminUrl();
url.pathname = `/${args.db}`;
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
client.on('notice', () => {});

const saved = [];
let fetchImpl = async (input, init) => {
  const res = await fetch(input, init);
  if (args.save) {
    const body = await res.clone().json().catch(() => null);
    if (body) saved.push(body);
  }
  return res;
};
if (args.replay) {
  const pages = JSON.parse(readFileSync(args.replay, 'utf8'));
  let i = 0;
  fetchImpl = async () => new Response(JSON.stringify(pages[i++] ?? { head: { vars: ['item'] }, results: { bindings: [] } }), { status: 200 });
}

const started = Date.now();
const out = await runSeed(pgStore(client), adapter, {
  fetchImpl,
  limit: Number(args.limit ?? 200),
  maxPages: Number(args.pages ?? 1),
  bornFrom: Number(args['born-from'] ?? 1975),
  worker: 'seed-local',
  log: (m) => console.log(m),
});
if (args.save && saved.length) {
  mkdirSync(dirname(args.save), { recursive: true });
  writeFileSync(args.save, JSON.stringify(saved));
}
const fighters = (await client.query('select count(*)::int n from public.boxing_fighters')).rows[0].n;
const pending = (await client.query(`select reason, count(*)::int n from public.boxing_identity_review_queue where status = 'pending' group by 1 order by 2 desc`)).rows;
console.log(JSON.stringify({ ...out, seconds: Math.round((Date.now() - started) / 1000), canonical_fighters_in_db: fighters, pending_review_by_reason: pending }, null, 2));
await client.end();
