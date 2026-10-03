#!/usr/bin/env node
// Rebuild International Boxing Hall of Fame inductions from the COMMITTED, reviewed dataset (no web request).
//
//   node scripts/history/ibhof-load.mjs --out=<dir> [--batch=100]
//
// data/history/ibhof-inductions.json was produced by ibhof-wikidata.mjs from Wikidata (CC0; source 'wikidata',
// approved_ingest). Its sha256 is checked before anything is generated, so only the reviewed rows load. Rows the
// dataset lists under 'issues' (no year, several categories, several years) were never inductions in it and stay
// held. Writes ibhof-batch-NNN.sql files (idempotent, one transaction each) for scripts/staging/ibhof-apply.ps1.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildIbhofSql } from './ibhof-sql.mjs';

const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const out = arg('out');
const size = Number(arg('batch') ?? 100);
const dataset = JSON.parse(readFileSync(new URL('../../data/history/ibhof-inductions.json', import.meta.url), 'utf8'));
const sha = createHash('sha256').update(JSON.stringify(dataset.rows)).digest('hex');
if (sha !== dataset.sha256) throw new Error(`dataset sha256 mismatch: file says ${dataset.sha256}, rows hash to ${sha}`);
if (dataset.rows.length !== dataset.inductions) throw new Error(`dataset says ${dataset.inductions} inductions, has ${dataset.rows.length} rows`);
mkdirSync(out, { recursive: true });
let n = 0;
for (let i = 0; i < dataset.rows.length; i += size) {
  n += 1;
  writeFileSync(join(out, `ibhof-batch-${String(n).padStart(3, '0')}.sql`), `${buildIbhofSql(dataset.rows.slice(i, i + size)).join('\n')}\n`);
}
console.log(JSON.stringify({ source: 'wikidata (CC0), committed dataset', retrieved_at: dataset.retrieved_at, sha256: sha, inductions: dataset.rows.length,
  held_issues: dataset.issues.length, batches: n, by_category: dataset.by_category, years: dataset.years }, null, 1));
