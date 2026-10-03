#!/usr/bin/env node
// P0 identity seed runner. Reads seed subjects (scripts/identity/p0-seed-subjects.sql output), looks each boxer up on
// Wikidata (serial, throttled, read-only), applies shared/identity/seed-rule.mjs, and writes:
//   --out=<dir>/decisions.json   every subject with its decision, reasons and exact evidence
//   --out=<dir>/report.md        AUTO_SEEDED / REVIEW_REQUIRED / NO_CANDIDATE for owner review
//   --out=<dir>/apply.sql        one public.boxing_apply_identity_seed(...) call per subject (idempotent)
// Runs nothing against the database. --fighters=<json [{id, display_name}]> lists the fighters PropBetEdge already holds
// (rule 1.1.0 sends a subject that may be one of them to REVIEW instead of seeding a second row).
//
//   node scripts/identity/p0-seed.mjs --subjects=<subjects.json> --batch=p0-champions-seed-01 --out=<dir>

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { decideSeed, RULE_VERSION, nameAgreement, printedCountries, dropSuffix } from '../../shared/identity/seed-rule.mjs';
import { buildIndex } from '../../shared/identity/pipeline.mjs';

const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const UA = 'PropBetEdge-Boxing-Identity/0.2 (+https://github.com/LHBUSA/boxing; identity seed; low rate)';
const API = 'https://www.wikidata.org/w/api.php';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOXER = 'Q11338576';
const BOXING = 'Q32112';

// responses are cached on disk (--cache=<file>), so a rerun after a rule change asks Wikidata only for what is new
let requests = 0;
const cachePath = process.argv.slice(2).find((a) => a.startsWith('--cache='))?.slice(8) ?? null;
const cache = cachePath && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
const saveCache = () => { if (cachePath) writeFileSync(cachePath, JSON.stringify(cache)); };
async function getJson(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', maxlag: '5', ...params })}`;
  if (cache[url]) return cache[url];
  let last = '';
  // maxlag=5 is respected, not removed: while Wikidata replication lag is high the runner waits (up to ~30 min a request)
  for (let attempt = 0; attempt < 32; attempt += 1) {
    await sleep(attempt === 0 ? 700 : Math.min(60000, 5000 * 2 ** attempt));
    requests += 1;
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    if (res.status === 429 || res.status === 503) {
      last = `http ${res.status}`;
      const wait = Number(res.headers.get('retry-after'));
      if (wait > 0) await sleep(Math.min(120, wait) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`wikidata ${res.status} ${params.action}`);
    const j = await res.json();
    if (j.error?.code === 'maxlag') { last = `maxlag ${j.error.lag ?? ''}`; continue; }
    cache[url] = j;
    if (requests % 20 === 0) saveCache();
    return j;
  }
  saveCache();
  throw new Error(`wikidata unavailable after retries (${params.action}; last ${last})`);
}

const subjects = JSON.parse(readFileSync(arg('subjects'), 'utf8').replace(/^﻿/, ''));
const batch = arg('batch') ?? 'p0-champions-seed-01';
const existing = arg('fighters') ? JSON.parse(readFileSync(arg('fighters'), 'utf8').replace(/^\uFEFF/, '')).map((f) => ({ id: f.id, display_name: f.display_name })) : [];
const outDir = arg('out');
mkdirSync(outDir, { recursive: true });

const title = (s) => String(s).toLowerCase().replace(/(^|[\s'’-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const latin = (s) => /^[\p{Script=Latin}\s.'’-]+$/u.test(s);
const claimIds = (e, p) => (e.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated').map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const claimVals = (e, p) => (e.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated').map((c) => c.mainsnak?.datavalue?.value).filter(Boolean);
const PRECISION = { 11: 'day', 10: 'month', 9: 'year' };

async function searchQids(name) {
  const qids = new Set();
  for (const stmt of [`haswbstatement:P106=${BOXER}`, `haswbstatement:P641=${BOXING}`]) {
    const r = await getJson({ action: 'query', list: 'search', srlimit: '10', srsearch: `${name} ${stmt}` });
    for (const h of r.query?.search ?? []) qids.add(h.title);
  }
  const w = await getJson({ action: 'wbsearchentities', language: 'en', uselang: 'en', type: 'item', limit: '10', search: name });
  for (const h of w.search ?? []) qids.add(h.id);
  return qids;
}

async function entities(ids, props) {
  const out = {};
  const list = [...ids];
  for (let i = 0; i < list.length; i += 40) {
    const r = await getJson({ action: 'wbgetentities', props, ids: list.slice(i, i + 40).join('|') });
    Object.assign(out, r.entities ?? {});
  }
  return out;
}

// 1. search every printed spelling (and its initial-free form), collect candidate items
const subjectQids = new Map();
const allQids = new Set();
for (const s of subjects) {
  const variants = new Set();
  for (const n of s.names_as_printed) {
    variants.add(title(n));
    const noInitials = title(n).split(/\s+/).filter((t) => t.replace(/[^a-z]/gi, '').length > 1).join(' ');
    if (noInitials) variants.add(noInitials);
    const noSuffix = title(dropSuffix(n));
    if (noSuffix.split(' ').length >= 2) variants.add(noSuffix);
  }
  const q = new Set();
  for (const v of variants) for (const id of await searchQids(v)) q.add(id);
  subjectQids.set(s.person_key, q);
  for (const id of q) allQids.add(id);
  process.stderr.write(`searched ${s.person_key}: ${q.size}\n`);
}

// 2. fetch items; keep human boxers (P31 human, and occupation boxer or sport boxing)
const items = await entities(allQids, 'claims|labels|aliases|info');
const boxers = Object.fromEntries(Object.entries(items).filter(([, e]) => claimIds(e, 'P31').includes('Q5')
  && (claimIds(e, 'P106').includes(BOXER) || claimIds(e, 'P641').includes(BOXING))));
const refIds = new Set();
for (const e of Object.values(boxers)) for (const p of ['P27', 'P1532', 'P2094']) for (const id of claimIds(e, p)) refIds.add(id);
const refs = await entities(refIds, 'claims|labels');
const iso3 = (id) => claimVals(refs[id] ?? {}, 'P298')[0] ?? null;
const iso2 = (id) => claimVals(refs[id] ?? {}, 'P297')[0] ?? null;
const enLabel = (e) => e?.labels?.en?.value ?? Object.values(e?.labels ?? {}).find((l) => latin(l.value))?.value ?? null;

const candidateOf = (qid) => {
  const e = boxers[qid];
  const names = [...new Set([...Object.values(e.labels ?? {}).map((l) => l.value), ...Object.values(e.aliases ?? {}).flat().map((a) => a.value)].filter(latin))];
  return {
    qid, label: enLabel(e), names,
    citizenship_iso3: claimIds(e, 'P27').map(iso3).filter(Boolean),
    citizenship_iso2: claimIds(e, 'P27').map(iso2).filter(Boolean),
    sport_country_iso3: claimIds(e, 'P1532').map(iso3).filter(Boolean),
    dobs: claimVals(e, 'P569').filter((t) => PRECISION[t.precision]).map((t) => ({ date: t.time.replace(/^\+/, '').slice(0, PRECISION[t.precision] === 'day' ? 10 : PRECISION[t.precision] === 'month' ? 7 : 4).padEnd(10, '-01').replace(/-$/, ''), precision: PRECISION[t.precision] }))
      .map((d) => ({ ...d, date: d.precision === 'year' ? `${d.date.slice(0, 4)}-01-01` : d.precision === 'month' ? `${d.date.slice(0, 7)}-01` : d.date })),
    deceased: (e.claims?.P570 ?? []).some((c) => c.rank !== 'deprecated'),
    competition_classes: claimIds(e, 'P2094').map((id) => enLabel(refs[id])).filter(Boolean),
    sex: claimIds(e, 'P21')[0] ?? null,
    revision: e.lastrevid ?? null,
  };
};

// 3. decide each subject and build its idempotent apply call
const lit = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const decisions = [];
const sql = [`-- ${RULE_VERSION} batch ${batch}: generated ${new Date().toISOString()}. Each call is idempotent on (rule_version, subject_key).`];
for (const s of subjects) {
  const candidates = [...(subjectQids.get(s.person_key) ?? [])].filter((q) => boxers[q]).map(candidateOf);
  const d = decideSeed(s, candidates, { existing });
  const chosen = d.wikidata_qid ? candidates.find((c) => c.qid === d.wikidata_qid) : null;
  // aliases: the Wikidata label/aliases that agree with a printed name, plus every printed spelling as printed
  const aliases = [];
  if (chosen) for (const n of chosen.names) if (s.names_as_printed.some((p) => nameAgreement(p, n))) aliases.push({ name: n, source: 'wikidata' });
  for (const p of s.names_as_printed) aliases.push({ name: p, source: 'sanctioning_body' });
  const row = {
    rule_version: RULE_VERSION, batch, subject_key: s.person_key, decision: d.decision, reasons: d.reasons,
    wikidata_qid: d.wikidata_qid ?? null, canonical_name: d.canonical_name ?? null, aliases,
    nationality_evidence: { printed: s.countries_as_printed ?? [], printed_iso3: printedCountries(s.countries_as_printed).codes,
      wikidata_citizenship_iso3: chosen?.citizenship_iso3 ?? [], wikidata_citizenship_iso2: chosen?.citizenship_iso2 ?? [],
      wikidata_sport_country_iso3: chosen?.sport_country_iso3 ?? [] },
    dob: d.dob ?? null, dob_precision: d.dob_precision ?? null,
    division_evidence: { printed: s.divisions, wikidata_competition_class: chosen?.competition_classes ?? [] },
    source_claims: s.entries,
    identity_sources: chosen ? [{ source: 'wikidata', qid: chosen.qid, url: `https://www.wikidata.org/wiki/${chosen.qid}`, revision: chosen.revision, license: 'CC0' }] : [],
    creation_basis: d.decision === 'AUTO_SEEDED' ? 'wikidata_identity_corroborated_by_sanctioning_body' : 'none',
    evidence: d.evidence, candidates: d.candidates ?? [],
  };
  if (chosen) {
    const idx = buildIndex({ display_name: chosen.label, names: aliases.map((a) => ({ text: a.name, kind: 'name' })) });
    row.index = idx;
  }
  decisions.push(row);
  sql.push(`select public.boxing_apply_identity_seed(${lit(JSON.stringify(row))}::jsonb);`);
}

// subjects that may be the same person as another subject (a transliteration or a body's typo): listed for a human,
// never linked by the rule, so an accepted fighter in one lane never validates a questionable entry in another
const dist = (a, b) => {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) m[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
};
for (const d of decisions) {
  const mine = subjects.find((s) => s.person_key === d.subject_key);
  d.possible_same_person_as = decisions.filter((o) => o !== d).filter((o) => {
    const theirs = subjects.find((s) => s.person_key === o.subject_key);
    const shareDivision = theirs.divisions.some((x) => mine.divisions.includes(x));
    const close = dist(d.subject_key, o.subject_key) <= 2 || d.subject_key.includes(o.subject_key) || o.subject_key.includes(d.subject_key)
      || (d.wikidata_qid && d.wikidata_qid === o.wikidata_qid);
    return shareDivision && close;
  }).map((o) => ({ subject_key: o.subject_key, decision: o.decision, wikidata_qid: o.wikidata_qid }));
}

writeFileSync(join(outDir, 'decisions.json'), JSON.stringify({ rule_version: RULE_VERSION, batch, generated_at: new Date().toISOString(), wikidata_requests: requests, decisions }, null, 2));
saveCache();
writeFileSync(join(outDir, 'apply.sql'), `${sql.join('\n')}\n`);

const group = (k) => decisions.filter((d) => d.decision === k);
const line = (d) => {
  const c = d.evidence?.checks ?? {};
  const bodies = d.source_claims.map((e) => `${e.body.toUpperCase()} ${e.division}`).join(', ');
  const ev = c.name ? `name ${c.name.level} ("${c.name.printed}" = "${c.name.wikidata}"); country ${c.country?.result} (${(c.country?.printed ?? []).join('/') || '-'} vs ${[...(c.country?.citizenship ?? []), ...(c.country?.sport_country ?? [])].join('/') || '-'}); dob ${c.dob?.result}${c.dob?.value ? ` ${c.dob.value}` : ''}; era ${c.era ? `${c.era.result} (age ${c.era.age_on_status_date})` : '-'}; division ${c.division?.result}; ${c.alive?.result}` : '';
  const same = (d.possible_same_person_as ?? []).length ? `; POSSIBLY SAME PERSON AS ${d.possible_same_person_as.map((o) => `${o.subject_key} (${o.decision}${o.wikidata_qid ? ` ${o.wikidata_qid}` : ''})`).join(', ')}` : '';
  return `| ${d.source_claims.map((e) => e.printed).filter((v, i, a) => a.indexOf(v) === i).join(' / ')} | ${bodies} | ${d.wikidata_qid ? `[${d.wikidata_qid}](https://www.wikidata.org/wiki/${d.wikidata_qid}) ${d.canonical_name}` : '-'} | ${d.reasons.join(', ') || '-'}${same} | ${ev} |`;
};
const md = [`# P0 champion identity seed: ${batch}`, '', `Rule \`${RULE_VERSION}\`. Wikidata establishes a person only, never a record, title, ranking or bout.`, '',
  `AUTO_SEEDED ${group('AUTO_SEEDED').length} | REVIEW_REQUIRED ${group('REVIEW_REQUIRED').length} | NO_CANDIDATE ${group('NO_CANDIDATE').length} | Wikidata requests ${requests}`, ''];
for (const k of ['AUTO_SEEDED', 'REVIEW_REQUIRED', 'NO_CANDIDATE']) {
  md.push(`## ${k} (${group(k).length})`, '', '| Printed | Bodies | Wikidata | Reasons | Evidence |', '|---|---|---|---|---|', ...group(k).map(line), '');
}
writeFileSync(join(outDir, 'report.md'), md.join('\n'));
console.log(JSON.stringify({ subjects: subjects.length, auto_seeded: group('AUTO_SEEDED').length, review_required: group('REVIEW_REQUIRED').length, no_candidate: group('NO_CANDIDATE').length, wikidata_requests: requests }));
