#!/usr/bin/env node
// Wikidata identity + sourced biography facts for fighters whose identity was PROVEN by
// scripts/media/portrait-discovery.mjs (a Wikidata boxer item whose Wikipedia record table names one of our
// verified opponents on the date of our verified bout). Emits idempotent SQL for Boxing STAGING; runs nothing.
//
//   node scripts/identity/wikidata-enrich.mjs --candidates=<portrait-candidates.json> --out=<file.sql>
//
// Writes (append-only tables, on conflict do nothing):
//   boxing_source_observations  entity_type 'wikidata_entity' (the claims used, with the entity revision)
//   boxing_fighter_identities   namespace 'wikidata.item' (QID) and 'wikipedia.<lang>' (article title), verified, with evidence
//   boxing_fighter_attribute_claims  dob (day precision only), sex, nationality (ISO 3166-1 alpha-2 via P297), height_cm
// Canonical fighter columns are NOT changed: these stay sourced claims until a promotion rule decides.
// Reach is not taken from Wikidata (no dedicated property verified).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const UA = 'PropBetEdge-Boxing-media-research/1.0 (https://propbetedge.ai; editorial identification; low rate)';
const candidates = JSON.parse(readFileSync(arg('candidates'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lit = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const jl = (o) => `${lit(JSON.stringify(o))}::jsonb`;
const hash = (s) => createHash('sha256').update(s).digest('hex');

async function getJson(url) {
  await sleep(400);
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  return res.ok ? res.json() : null;
}

const proven = candidates.results.filter((r) => r.identity?.qid);
const ids = proven.map((r) => r.identity.qid);
const entities = {};
for (let i = 0; i < ids.length; i += 40) {
  const r = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|info|sitelinks&ids=${ids.slice(i, i + 40).join('|')}`);
  Object.assign(entities, r?.entities ?? {});
}
const countryIds = new Set();
const value = (e, p) => (e.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated').map((c) => c.mainsnak?.datavalue?.value).filter(Boolean);
for (const e of Object.values(entities)) for (const v of value(e, 'P27')) countryIds.add(v.id);
const iso = {};
const countries = [...countryIds];
for (let i = 0; i < countries.length; i += 40) {
  const r = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${countries.slice(i, i + 40).join('|')}`);
  for (const [id, c] of Object.entries(r?.entities ?? {})) { const code = value(c, 'P297')[0]; if (code) iso[id] = code; }
}

const sql = [];
const summary = { fighters: 0, identities: 0, claims: { dob: 0, sex: 0, nationality: 0, height_cm: 0 } };
for (const r of proven) {
  const e = entities[r.identity.qid];
  if (!e) continue;
  summary.fighters += 1;
  const facts = {};
  const dob = value(e, 'P569').find((t) => t.precision === 11);
  if (dob) facts.dob = dob.time.replace(/^\+/, '').slice(0, 10);
  const sex = value(e, 'P21')[0]?.id;
  if (sex === 'Q6581097') facts.sex = 'male'; else if (sex === 'Q6581072') facts.sex = 'female';
  const nat = value(e, 'P27').map((v) => iso[v.id]).filter(Boolean);
  if (nat.length) facts.nationality = [...new Set(nat)];
  const h = value(e, 'P2048').find((q) => /Q11573|Q174728|Q218593/.test(q.unit ?? ''));
  if (h) { const amt = Number(h.amount); facts.height_cm = Math.round((/Q11573/.test(h.unit) ? amt * 100 : /Q174728/.test(h.unit) ? amt : amt * 2.54) * 10) / 10; }
  const evidence = { rule: 'wikidata_boxer_item_with_wikipedia_record_row_of_our_bout@1', qid: r.identity.qid, wiki: r.identity.wiki, title: r.identity.title, bout_date: r.identity.bout_date, opponent: r.identity.opponent, row_excerpt: r.identity.row_excerpt };
  const payload = { qid: e.id, lastrevid: e.lastrevid, modified: e.modified, facts, sitelinks: Object.fromEntries(Object.entries(e.sitelinks ?? {}).filter(([k]) => /^(en|es)wiki$/.test(k)).map(([k, v]) => [k, v.title])) };
  const fighter = `(select public.boxing_canonical_fighter_id(id) from public.boxing_fighters where public_id = ${lit(r.public_id)})`;
  sql.push(`-- ${r.name} -> ${e.id}`);
  sql.push(`insert into public.boxing_source_observations (source_id, entity_type, external_key, source_url, payload, content_hash, parser_version)
select s.id, 'wikidata_entity', ${lit(e.id)}, ${lit(`https://www.wikidata.org/wiki/${e.id}`)}, ${jl(payload)}, ${lit(hash(`${e.id}|${e.lastrevid}`))}, 'wikidata-enrich@1'
from public.boxing_sources s where s.source_key = 'wikidata' on conflict do nothing;`);
  sql.push(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, external_url, source_display_name, verification_state, confidence, evidence)
select ${fighter}, s.id, 'wikidata.item', ${lit(e.id)}, ${lit(`https://www.wikidata.org/wiki/${e.id}`)}, ${lit(r.identity.label)}, 'verified', 95, ${jl(evidence)}
from public.boxing_sources s where s.source_key = 'wikidata' and ${fighter} is not null
  and not exists (select 1 from public.boxing_fighter_identities i where i.namespace = 'wikidata.item' and i.external_id = ${lit(e.id)} and i.verification_state <> 'rejected');`);
  summary.identities += 1;
  if (r.identity.title) {
    const ns = `wikipedia.${r.identity.wiki.slice(0, 2)}`;
    sql.push(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, external_url, source_display_name, verification_state, confidence, evidence)
select ${fighter}, s.id, ${lit(ns)}, ${lit(r.identity.title)}, ${lit(r.identity.url)}, ${lit(r.identity.title)}, 'verified', 95, ${jl(evidence)}
from public.boxing_sources s where s.source_key = 'wikidata' and ${fighter} is not null
  and not exists (select 1 from public.boxing_fighter_identities i where i.namespace = ${lit(ns)} and i.external_id = ${lit(r.identity.title)} and i.verification_state <> 'rejected');`);
  }
  for (const [attribute, v] of Object.entries(facts)) {
    summary.claims[attribute] += 1;
    sql.push(`insert into public.boxing_fighter_attribute_claims (fighter_id, attribute, value, source_id, observation_id, claim_hash)
select ${fighter}, ${lit(attribute)}, ${jl(v)}, s.id, (select o.id from public.boxing_source_observations o where o.source_id = s.id and o.content_hash = ${lit(hash(`${e.id}|${e.lastrevid}`))} limit 1), ${lit(hash(`wikidata|${r.public_id}|${attribute}|${JSON.stringify(v)}`))}
from public.boxing_sources s where s.source_key = 'wikidata' and ${fighter} is not null on conflict (claim_hash) do nothing;`);
  }
}
writeFileSync(arg('out'), `begin;\n${sql.join('\n')}\ncommit;\n`);
console.log(JSON.stringify(summary, null, 1));
