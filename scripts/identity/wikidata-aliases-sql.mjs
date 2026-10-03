#!/usr/bin/env node
// Emits idempotent SQL recording the labels and aliases of verified Wikidata items into
// public.boxing_fighter_wikidata_aliases (migration 0058), from the p0-seed runner's response cache (no new requests).
// Latin-script names only: the merge guard's alias route compares folded Latin name tokens.
//
//   node scripts/identity/wikidata-aliases-sql.mjs --cache=<p0-wikidata-cache.json> --qids=<json array> --out=<file.sql>

import { readFileSync, writeFileSync } from 'node:fs';

const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const cache = JSON.parse(readFileSync(arg('cache'), 'utf8'));
const wanted = new Set(JSON.parse(readFileSync(arg('qids'), 'utf8').replace(/^﻿/, '')));
const latin = (s) => /^[\p{Script=Latin}\s.'’-]+$/u.test(s);
const lit = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

const entities = {};
for (const r of Object.values(cache)) for (const [id, e] of Object.entries(r?.entities ?? {})) {
  if (wanted.has(id) && (!entities[id] || (e.lastrevid ?? 0) > (entities[id].lastrevid ?? 0))) entities[id] = e;
}
const rows = [];
for (const [qid, e] of Object.entries(entities)) {
  for (const l of Object.values(e.labels ?? {})) if (latin(l.value)) rows.push([qid, l.value, l.language, 'label', e.lastrevid]);
  for (const list of Object.values(e.aliases ?? {})) for (const a of list) if (latin(a.value)) rows.push([qid, a.value, a.language, 'alias', e.lastrevid]);
}
const sql = rows.length === 0 ? '-- no rows\n' : `insert into public.boxing_fighter_wikidata_aliases (qid, alias, language, kind, entity_revision) values
${rows.map((r) => `  (${lit(r[0])}, ${lit(r[1])}, ${lit(r[2])}, ${lit(r[3])}, ${r[4] ?? 'null'})`).join(',\n')}
on conflict (qid, alias, language) do nothing;
`;
writeFileSync(arg('out'), sql);
console.log(JSON.stringify({ qids_wanted: wanted.size, qids_in_cache: Object.keys(entities).length, rows: rows.length, missing: [...wanted].filter((q) => !entities[q]) }));
