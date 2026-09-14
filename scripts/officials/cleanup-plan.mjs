#!/usr/bin/env node
// READ-ONLY officials cleanup plan. Never writes to any database.
//
//   node scripts/officials/cleanup-plan.mjs --evidence=<evidence.json> [--simulate-parse] [--out=<dir>]
//
// --evidence        output of scripts/officials/cleanup-evidence.sql (scripts/staging/officials-cleanup.ps1 -Evidence)
// --simulate-parse  re-fetch the SAME official Nevada / New Jersey result PDFs listed in the evidence (one request at a
//                   time, 2 s apart, identifying User-Agent) and parse them with the CURRENT parsers in memory, to show
//                   exactly what a corrected parse would name, and what the correction-aware ingest would do per slot
//                   (keep / hold / resolve). Simulated parses can never make a candidate applicable (A_pending only).
//
// Writes <out>/officials-cleanup-plan.json and <out>/officials-cleanup-plan.md.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCleanupPlan } from '../../shared/identity/official-cleanup.mjs';
import { activeOccupant, slotContinuity } from '../../shared/events/officials.mjs';
import { NEVADA, parseCalendar, parseNevadaResults } from '../../shared/adapters/commissions/nevada.mjs';
import { NEW_JERSEY, parseNjResults, parseNjSchedule } from '../../shared/adapters/commissions/new-jersey.mjs';
import { SPORT } from '../../shared/adapters/commissions/contract.mjs';
import { extractPositionedText } from '../../shared/adapters/commissions/pdf.mjs';
import { USER_AGENT } from '../../shared/commissions/run.mjs';

const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const flag = (k) => process.argv.includes(`--${k}`);
const evidencePath = arg('evidence');
if (!evidencePath) { console.error('usage: cleanup-plan.mjs --evidence=<file> [--simulate-parse] [--out=<dir>]'); process.exit(2); }
const out = arg('out') ?? '.';
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const now = new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, binary) {
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) throw new Error(`http_${res.status} ${url}`);
  return binary ? new Uint8Array(await res.arrayBuffer()) : res.text();
}

const toParse = (docKey, adapter, parsed) => ({
  doc_key: docKey, source_key: adapter.sourceKey, parser_version: adapter.version, observed_at: now, simulated: true,
  header_officials: parsed.minimized?.officials ?? null,
  promoters: (parsed.events ?? []).map((e) => e.promoters ?? []),
  bouts: (parsed.bouts ?? []).map((b) => ({ source_bout_id: b.source_bout_id, referee: b.referee ?? null, judges: (b.judges ?? []).map((j) => ({ slot: j.slot, name: j.name ?? null, source_name: j.source_name ?? null })) })),
});

const simulated = [];
const simulationErrors = [];
if (flag('simulate-parse')) {
  const latestByDoc = new Map();
  for (const p of evidence.parses ?? []) latestByDoc.set(p.doc_key, p);
  const docs = [...latestByDoc.values()].filter((p) => ['nsac_nevada', 'nj_sacb'].includes(p.source_key) && p.source_url);
  const calendar = docs.some((d) => d.source_key === 'nsac_nevada') ? parseCalendar(await get(NEVADA.calendarUrl), { now, capturedAt: now }).events : [];
  const nj = docs.some((d) => d.source_key === 'nj_sacb') ? parseNjSchedule(await get(NEW_JERSEY.scheduleUrl), { capturedAt: now }) : null;
  for (const [i, d] of docs.entries()) {
    if (i > 0) await sleep(2000);
    try {
      const pages = await extractPositionedText(await get(d.source_url, true));
      if (d.source_key === 'nsac_nevada') {
        const file = decodeURIComponent(d.source_url.split('/').pop());
        const ref = { doc_key: d.doc_key, url: d.source_url, title: file, sport_hint: SPORT.BOXING };
        simulated.push(toParse(d.doc_key, NEVADA, parseNevadaResults(ref, pages, { capturedAt: now, calendarEvents: calendar })));
      } else {
        const ref = nj.documents.find((x) => x.doc_key === d.doc_key) ?? { doc_key: d.doc_key, url: d.source_url };
        simulated.push(toParse(d.doc_key, NEW_JERSEY, parseNjResults(ref, pages, { capturedAt: now, scheduleEvents: nj.events })));
      }
      console.error(`simulated ${d.doc_key}`);
    } catch (err) {
      simulationErrors.push({ doc_key: d.doc_key, error: String(err.message).slice(0, 200) });
    }
  }
}

const plan = buildCleanupPlan(evidence, { simulatedParses: simulated, now });
plan.simulation_errors = simulationErrors;

// What the stored parse -> corrected parse changes per document, and what the correction-aware ingest does per slot.
const occupants = new Map();
for (const o of evidence.officials ?? []) {
  for (const a of o.assignments ?? []) {
    for (const id of a.source_bout_ids ?? []) {
      if (!occupants.has(id)) occupants.set(id, { officials: [] });
      occupants.get(id).officials.push({ official_id: o.id, display_name: o.display_name, role: a.role, slot: a.slot, state: a.state });
    }
  }
}
plan.simulated_changes = [];
for (const s of simulated) {
  const stored = [...(evidence.parses ?? [])].filter((p) => p.doc_key === s.doc_key).sort((x, y) => String(x.observed_at).localeCompare(String(y.observed_at))).pop();
  const storedBouts = new Map((stored?.bouts ?? []).map((b) => [b.source_bout_id, b]));
  const doc = { doc_key: s.doc_key, stored_parser_version: stored?.parser_version ?? null, simulated_parser_version: s.parser_version,
    promoters_before: stored?.promoters ?? [], promoters_after: s.promoters, bouts_missing_from_simulation: 0, bouts_new_in_simulation: 0, official_changes: [] };
  for (const b of s.bouts) {
    const before = storedBouts.get(b.source_bout_id);
    if (!before) { doc.bouts_new_in_simulation += 1; continue; }
    const stateBout = occupants.get(b.source_bout_id) ?? null;
    const slots = [{ role: 'referee', slot: null, after: b.referee, before: before.referee },
      ...b.judges.map((j) => ({ role: 'judge', slot: j.slot, after: j.name, before: (before.judges ?? []).find((x) => Number(x.slot) === Number(j.slot))?.name ?? null }))];
    for (const x of slots) {
      if (!x.after || x.after === x.before) continue;
      const occupant = activeOccupant(stateBout, { role: x.role, slot: x.slot });
      const ingest = slotContinuity({ display_name: x.after }, occupant);
      doc.official_changes.push({ source_bout_id: b.source_bout_id, role: x.role, slot: x.slot, stored_name: x.before, corrected_name: x.after,
        current_official: occupant?.display_name ?? null, ingest_action: ingest.action, ingest_reason: ingest.reason ?? 'no active official in this slot: normal resolver' });
    }
  }
  doc.bouts_missing_from_simulation = [...storedBouts.keys()].filter((k) => !s.bouts.some((b) => b.source_bout_id === k)).length;
  plan.simulated_changes.push(doc);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'officials-cleanup-plan.json'), `${JSON.stringify(plan, null, 1)}\n`);

const md = [];
const cell = (v) => String(v ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
md.push('# Officials cleanup plan (READ ONLY)', '', `Generated ${plan.generated_at} by ${plan.tool_version}. Evidence ${plan.evidence_generated_at}. Simulated documents: ${plan.simulated_documents}.`, '');
md.push('## Summary', '', '| key | value |', '|---|---|', ...Object.entries(plan.summary).map(([k, v]) => `| ${k} | ${v} |`), '');
md.push('## Staging totals', '', '| key | value |', '|---|---|', ...Object.entries(plan.totals).map(([k, v]) => `| ${k} | ${v} |`), '');
const section = (title, rows) => {
  md.push(`## ${title} (${rows.length})`, '');
  if (!rows.length) { md.push('None.', ''); return; }
  md.push('| class | candidate A | candidate B | roles | commissions | assignments A / B | scorecards A / B | reason / relation |', '|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    md.push(`| ${r.classification} | ${cell(r.candidate_a?.name)} | ${cell(r.candidate_b?.name ?? (r.corrected_name ? `(rename to ${r.corrected_name})` : ''))} | ${cell([...new Set([...(r.candidate_a?.roles ?? []), ...(r.candidate_b?.roles ?? [])])].join(', '))} | ${cell([...new Set([...(r.candidate_a?.commissions ?? []), ...(r.candidate_b?.commissions ?? [])])].join(', '))} | ${r.candidate_a?.assignments_active ?? ''} / ${r.candidate_b?.assignments_active ?? '-'} | ${r.candidate_a?.scorecards ?? ''} / ${r.candidate_b?.scorecards ?? '-'} | ${cell(r.reason ?? r.relation)} |`);
  }
  md.push('');
  for (const r of rows.filter((x) => x.continuity)) {
    md.push(`### ${r.candidate_a.name} -> ${r.corrected_name}`, '', `Source documents: ${r.source_documents.map((d) => `${d.doc_key} [${d.parser_versions.join(', ')}]`).join('; ')}`, '');
    md.push('| event | bout | role | slot | scorecards (slot) | document | stored name (parser) | corrected name (parser) | status |', '|---|---|---|---|---|---|---|---|---|');
    for (const c of r.continuity) md.push(`| ${cell(c.event_date)} ${cell(c.event_name)} | ${cell(c.bout_id)} | ${c.role} | ${c.slot ?? ''} | ${c.scorecards} (${c.scorecard_slot ?? '-'}) | ${cell(c.doc_key)} | ${cell(c.old_name)} (${cell(c.old_parser_version)}) | ${cell(c.new_name)} (${cell(c.new_parser_version)}${c.simulated ? ', simulated' : ''}) | ${c.status} |`);
    if (r.would_change) md.push('', `Would change: ${Object.entries(r.would_change).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    md.push('');
  }
  for (const r of rows.filter((x) => Array.isArray(x.evidence))) {
    md.push(`### ${r.candidate_a.name} / ${r.candidate_b?.name ?? '(no full-name candidate)'} (${r.reason})`, '');
    for (const e of r.evidence) md.push(`- ${e.event_date} bout ${e.bout_id} ${e.role} slot ${e.slot ?? '-'}, scorecards ${e.scorecards}: ${e.documents.map((d) => `${d.doc_key}: ${d.names.map((n) => `"${n.name}" (${n.parser_version}${n.simulated ? ', simulated' : ''})`).join(' -> ')}; header lists ${d.header_lists.join(', ') || 'no full name with this surname'}`).join(' | ')}`);
    md.push('');
  }
};
section('Category A: deterministic parser artifacts (apply-ready, stored evidence)', plan.A);
section('A pending: deterministic once a scheduled run stores the corrected parse', plan.A_pending);
section('Category B: probable same official (human review)', plan.B);
section('Category C: ambiguous (human review; surname alone never merges)', plan.C);
section('Category D: distinct (untouched)', plan.D);
md.push(`## Pending official review queue (${plan.review_queue.length})`, '', '| raw name | commission | queue reason | candidates | classification | note |', '|---|---|---|---|---|---|');
for (const r of plan.review_queue) md.push(`| ${cell(r.raw_name)} | ${cell(r.commission)} | ${cell(r.queue_reason)} | ${cell(r.candidates.map((c) => c.display_name).join(', '))} | ${r.classification} | ${cell(r.reason)} |`);
md.push('', '## Parser artifacts still in the newest parse of each document', '', `Promoter fragments: ${plan.parser_artifacts_in_latest_parses.promoter_fragments.length}; official names: ${plan.parser_artifacts_in_latest_parses.official_names.length}`, '');
for (const a of [...plan.parser_artifacts_in_latest_parses.promoter_fragments, ...plan.parser_artifacts_in_latest_parses.official_names]) md.push(`- ${a.doc_key} (${a.parser_version}${a.simulated ? ', simulated' : ''}): "${a.name}"`);
if (plan.simulated_changes.length) {
  md.push('', '## Simulated corrected parse vs stored parse', '');
  for (const d of plan.simulated_changes) {
    const promo = JSON.stringify(d.promoters_before) !== JSON.stringify(d.promoters_after) ? ` promoters ${JSON.stringify(d.promoters_before)} -> ${JSON.stringify(d.promoters_after)}.` : '';
    md.push(`### ${d.doc_key}`, '', `${d.stored_parser_version} -> ${d.simulated_parser_version}.${promo} Bouts missing from simulation: ${d.bouts_missing_from_simulation}; new: ${d.bouts_new_in_simulation}.`, '');
    if (d.official_changes.length) {
      md.push('| bout | role | slot | stored name | corrected name | current official | ingest action |', '|---|---|---|---|---|---|---|');
      for (const c of d.official_changes) md.push(`| ${cell(c.source_bout_id)} | ${c.role} | ${c.slot ?? ''} | ${cell(c.stored_name)} | ${cell(c.corrected_name)} | ${cell(c.current_official)} | ${c.ingest_action}: ${cell(c.ingest_reason)} |`);
      md.push('');
    }
  }
}
if (simulationErrors.length) md.push('', '## Simulation errors', '', ...simulationErrors.map((e) => `- ${e.doc_key}: ${e.error}`));
writeFileSync(join(out, 'officials-cleanup-plan.md'), `${md.join('\n')}\n`);
console.log(JSON.stringify({ out, summary: plan.summary, simulated: simulated.length, simulation_errors: simulationErrors.length }, null, 1));
