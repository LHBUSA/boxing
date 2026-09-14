#!/usr/bin/env node
// Renders a coverage JSON (scripts/coverage-audit/coverage-baseline.sql) as Markdown. Exact counts only.
//
//   node scripts/coverage-audit/render-baseline.mjs <coverage.json> <out.md> [--portraits=scripts/media/portraits.json] [--channels=scripts/videos/channels.json]

import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const c = JSON.parse(readFileSync(input, 'utf8'));
const md = [];
const cell = (v) => (v == null ? '—' : typeof v === 'object' ? (Array.isArray(v) ? `${v.length} items` : Object.entries(v).map(([k, x]) => `${k}: ${typeof x === 'object' ? JSON.stringify(x) : x}`).join('; ')) : String(v)).replace(/\|/g, '/');
const section = (title, obj, skip = []) => {
  md.push(`## ${title}`, '', '| metric | value |', '|---|---|');
  for (const [k, v] of Object.entries(obj ?? {})) if (!skip.includes(k)) md.push(`| ${k} | ${cell(v)} |`);
  md.push('');
};

md.push(`# Boxing coverage baseline`, '', `Generated ${c.generated_at} from Boxing STAGING (\`wpaxofilvbsjyrxrwjhg\`), read only, by \`scripts/coverage-audit/coverage-baseline.sql\`.`,
  'Every value is a stored-row count. "Canonical" excludes merged rows. Nothing is estimated.', '');
section('Fighters', c.fighters);
section('Bouts', c.bouts);
section('Events', c.events);
section('Venues', c.venues);
section('Promotions', c.promotions, ['promotion_sources']);
md.push('| promotion source | access mode | rights state | enabled |', '|---|---|---|---|', ...(c.promotions?.promotion_sources ?? []).map((s) => `| ${s.source_key} | ${s.access_mode} | ${s.rights_state} | ${s.enabled} |`), '');
section('Titles and rankings', c.titles, ['sanctioning_sources']);
md.push('| sanctioning source | access mode | rights state | enabled |', '|---|---|---|---|', ...(c.titles?.sanctioning_sources ?? []).map((s) => `| ${s.source_key} | ${s.access_mode} | ${s.rights_state} | ${s.enabled} |`), '');
section('Officials', c.officials);
section('Weigh-ins', c.weigh_ins);
section('Media', c.media);
if (arg('portraits')) {
  const p = JSON.parse(readFileSync(arg('portraits'), 'utf8'));
  md.push('### Portrait registry (scripts/media/portraits.json)', '', `approved ${p.approved?.length ?? 0}, held for owner review ${p.held_for_owner_review?.length ?? 0}, rejected ${p.rejected?.length ?? 0}`, '');
}
if (arg('channels')) {
  const ch = JSON.parse(readFileSync(arg('channels'), 'utf8'));
  const list = ch.channels ?? ch;
  md.push('### Video channel registry (scripts/videos/channels.json)', '', `${list.length} channels`, '');
}
section('Odds', c.odds);
section('News events', c.news);
section('History', c.history);
md.push('## Sources', '', '| source | kind | access mode | rights | enabled | documents | observations | last run | last ok | scheduled runs |', '|---|---|---|---|---|---|---|---|---|---|',
  ...(c.sources?.registry ?? []).map((s) => `| ${s.source_key} | ${s.kind} | ${s.access_mode} | ${s.rights_state} | ${s.enabled} | ${s.documents} | ${s.observations} | ${s.last_run_status ?? '—'} ${s.last_run_at ?? ''} | ${s.last_ok_at ?? '—'} | ${s.scheduled_runs} |`), '');
md.push('| source | parser version | status | documents |', '|---|---|---|---|', ...(c.sources?.documents_by_source_and_parser ?? []).map((d) => `| ${d.source_key} | ${d.parser_version ?? '—'} | ${d.status} | ${d.documents} |`), '');
md.push(`Worker invocations by trigger: ${cell(c.sources?.worker_invocations_by_trigger)}`, '');
writeFileSync(output, `${md.join('\n')}\n`);
console.log(`wrote ${output}`);
