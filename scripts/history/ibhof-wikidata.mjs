#!/usr/bin/env node
// International Boxing Hall of Fame inductions from Wikidata (CC0; source 'wikidata', approved_ingest).
// READ ONLY against the web; writes a dataset JSON + an idempotent SQL file for Boxing STAGING (needs migration 0025).
//
//   node scripts/history/ibhof-wikidata.mjs --out=<dir> [--verify-sample=25]
//
// Facts taken: person (Wikidata QID, label), induction year (P166 = Q572227 qualifier P585, or P580), IBHOF id
// (P4474), and the category as the institution's OWN label derived from the IBHOF id prefix (formatter URL
// http://www.ibhof.com/pages/about/inductees/<id>.html). No biography prose, no Hall photography.
// --verify-sample fetches that many ibhof.com profile pages (plain http; robots allows; one request per 3 s) and checks
// the "Induction: YYYY" field against Wikidata; mismatches are reported, never overwritten.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const out = arg('out');
const sample = Number(arg('verify-sample') ?? 0);
const UA = 'PropBetEdge-Boxing-history-research/1.0 (https://propbetedge.ai; facts with provenance; low rate)';
const HALL_QID = 'Q572227';
// ibhof.com category page slug -> the institution's own inductee-index label
export const IBHOF_CATEGORY = {
  modern: { label: "Men's Modern Boxers", key: 'modern' },
  women_modern: { label: "Women's Modern Boxers", key: 'womens' },
  oldtimer: { label: "Men's Old-Timer Boxers", key: 'old_timer' },
  women_trailblazer: { label: "Women's Trailblazer Boxers", key: 'womens' },
  pioneer: { label: 'Pioneer', key: 'pioneer' },
  nonparticipant: { label: 'Non-Participant', key: 'non_participant' },
  observer: { label: 'Observer', key: 'observer' },
};

const query = `SELECT ?person ?personLabel ?year ?start ?ibhof ?dob ?image ?enwiki WHERE {
  ?person p:P166 ?st . ?st ps:P166 wd:${HALL_QID} .
  OPTIONAL { ?st pq:P585 ?year . } OPTIONAL { ?st pq:P580 ?start . }
  OPTIONAL { ?person wdt:P4474 ?ibhof . } OPTIONAL { ?person wdt:P569 ?dob . } OPTIONAL { ?person wdt:P18 ?image . }
  OPTIONAL { ?enwiki schema:about ?person ; schema:isPartOf <https://en.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,es,fr,de,ja,pt,it". }
}`;
const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { 'user-agent': UA, accept: 'application/sparql-results+json' } });
if (!res.ok) { console.error(`WDQS http ${res.status}`); process.exit(1); }
const rows = (await res.json()).results.bindings;
const people = new Map();
for (const b of rows) {
  const qid = b.person.value.split('/').pop();
  const p = people.get(qid) ?? { qid, label: b.personLabel?.value ?? qid, years: new Set(), ibhof_ids: new Set(), dob: null, images: new Set(), enwiki: null };
  const y = (b.year?.value ?? b.start?.value ?? '').slice(0, 4);
  if (/^\d{4}$/.test(y)) p.years.add(Number(y));
  if (b.ibhof) p.ibhof_ids.add(b.ibhof.value);
  if (b.dob) p.dob = b.dob.value.slice(0, 10);
  if (b.image) p.images.add(decodeURIComponent(b.image.value.split('/').pop()));
  if (b.enwiki) p.enwiki = b.enwiki.value;
  people.set(qid, p);
}
const inductions = [];
const issues = [];
for (const p of people.values()) {
  const ids = [...p.ibhof_ids];
  const cats = [...new Set(ids.map((id) => id.split('/')[0]).filter((c) => IBHOF_CATEGORY[c]))];
  if (!p.years.size) { issues.push({ qid: p.qid, label: p.label, issue: 'no_induction_year' }); continue; }
  if (cats.length !== 1) { issues.push({ qid: p.qid, label: p.label, issue: cats.length ? 'multiple_categories' : 'no_ibhof_id_category', ibhof_ids: ids }); continue; }
  if (p.years.size > 1) { issues.push({ qid: p.qid, label: p.label, issue: 'multiple_induction_years', years: [...p.years] }); continue; }
  const cat = IBHOF_CATEGORY[cats[0]];
  const id = ids.find((x) => x.startsWith(`${cats[0]}/`));
  inductions.push({ qid: p.qid, label: p.label, induction_year: [...p.years][0], category_source_label: cat.label, category_key: cat.key, ibhof_id: id,
    source_url: `https://www.wikidata.org/wiki/${p.qid}`, ibhof_url: `http://www.ibhof.com/pages/about/inductees/${id}.html`, dob: p.dob, enwiki: p.enwiki, p18: [...p.images] });
}

const verification = [];
for (const r of inductions.slice().sort(() => 0.5 - Math.random()).slice(0, sample)) {
  await new Promise((s) => setTimeout(s, 3000));
  try {
    const page = await (await fetch(r.ibhof_url, { headers: { 'user-agent': UA } })).text();
    const y = page.replace(/<[^>]+>/g, ' ').match(/Induction:\s*(\d{4})/)?.[1] ?? null;
    verification.push({ qid: r.qid, label: r.label, wikidata_year: r.induction_year, ibhof_year: y ? Number(y) : null, match: Number(y) === r.induction_year });
  } catch (err) { verification.push({ qid: r.qid, label: r.label, error: String(err.message).slice(0, 80) }); }
}

const lit = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const norm = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sql = [`begin;
insert into public.boxing_organizations (slug, name, short_name, organization_kind, country_code, website_url, source_url)
select 'international-boxing-hall-of-fame', 'International Boxing Hall of Fame', 'IBHOF', 'hall_of_fame', 'US', 'http://www.ibhof.com/', 'https://www.wikidata.org/wiki/${HALL_QID}'
where not exists (select 1 from public.boxing_organizations where slug = 'international-boxing-hall-of-fame');
insert into public.boxing_organization_facts (organization_id, attribute, value_text, source_id, source_url)
select o.id, 'wikidata_qid', '${HALL_QID}', s.id, 'https://www.wikidata.org/wiki/${HALL_QID}'
from public.boxing_organizations o, public.boxing_sources s where o.slug = 'international-boxing-hall-of-fame' and s.source_key = 'wikidata'
  and not exists (select 1 from public.boxing_organization_facts f where f.organization_id = o.id and f.attribute = 'wikidata_qid');`];
for (const r of inductions) {
  const evidence = `Wikidata ${r.qid} award received (P166) International Boxing Hall of Fame (${HALL_QID}) point in time ${r.induction_year}; IBHOF id ${r.ibhof_id}.`;
  sql.push(`-- ${r.label}
with existing as (select pi.person_id as id from public.boxing_person_identities pi where pi.namespace = 'wikidata.item' and pi.external_id = ${lit(r.qid)} and pi.verification_state <> 'rejected' limit 1),
new_person as (
  insert into public.boxing_persons (display_name, normalized_name, fighter_id, identity_state)
  select ${lit(r.label)}, ${lit(norm(r.label))},
    (select public.boxing_canonical_fighter_id(fi.fighter_id) from public.boxing_fighter_identities fi where fi.namespace = 'wikidata.item' and fi.external_id = ${lit(r.qid)} and fi.verification_state <> 'rejected' limit 1), 'verified'
  where not exists (select 1 from existing) returning id),
new_identity as (
  insert into public.boxing_person_identities (person_id, source_id, namespace, external_id, external_url, verification_state, evidence)
  select np.id, s.id, 'wikidata.item', ${lit(r.qid)}, ${lit(r.source_url)}, 'verified', ${lit(`Wikidata item ${r.qid} (${r.label}) with IBHOF id ${r.ibhof_id}.`)}
  from new_person np, public.boxing_sources s where s.source_key = 'wikidata' returning person_id),
pid as (select id from existing union all select id from new_person)
insert into public.boxing_hall_inductions (institution_id, person_id, induction_year, category_source_label, category_key, source_id, source_url, evidence)
select o.id, (select id from pid limit 1), ${r.induction_year}, ${lit(r.category_source_label)}, ${lit(r.category_key)}, s.id, ${lit(r.source_url)}, ${lit(evidence)}
from public.boxing_organizations o, public.boxing_sources s
where o.slug = 'international-boxing-hall-of-fame' and s.source_key = 'wikidata'
on conflict do nothing;`);
  // a person first stored before a label existed in the requested languages keeps its QID as a name: repair it
  if (!/^Q\d+$/.test(r.label)) {
    sql.push(`update public.boxing_persons p set display_name = ${lit(r.label)}, normalized_name = ${lit(norm(r.label))}
from public.boxing_person_identities i where i.person_id = p.id and i.namespace = 'wikidata.item' and i.external_id = ${lit(r.qid)} and p.display_name ~ '^Q[0-9]+$';`);
  }
}
sql.push('commit;');
mkdirSync(out, { recursive: true });
const byCat = inductions.reduce((m, r) => ({ ...m, [r.category_source_label]: (m[r.category_source_label] ?? 0) + 1 }), {});
const years = inductions.map((r) => r.induction_year);
const dataset = { institution: { name: 'International Boxing Hall of Fame', wikidata_qid: HALL_QID, website: 'http://www.ibhof.com/' }, retrieved_at: new Date().toISOString(),
  wikidata_people: people.size, inductions: inductions.length, by_category: byCat, years: { first: Math.min(...years), last: Math.max(...years), distinct: new Set(years).size },
  with_p18: inductions.filter((r) => r.p18.length).length, issues, verification, rows: inductions, sha256: createHash('sha256').update(JSON.stringify(inductions)).digest('hex') };
writeFileSync(join(out, 'ibhof-inductions.json'), `${JSON.stringify(dataset, null, 1)}\n`);
writeFileSync(join(out, 'ibhof-inductions.sql'), `${sql.join('\n')}\n`);
console.log(JSON.stringify({ ...dataset, rows: undefined, issues: issues.length, verification: { checked: verification.length, matches: verification.filter((v) => v.match).length, mismatches: verification.filter((v) => v.match === false) } }, null, 1));
