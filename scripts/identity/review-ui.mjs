#!/usr/bin/env node
// Local identity review UI for ONE batch file produced by `identity-review.ps1 -Propose`.
//
//   node scripts/identity/review-ui.mjs <batch.json> [--port=4717]
//
// Shows every group and entry with its evidence (source document, candidates, aliases, hometowns, weights, opponent,
// event, jurisdiction, resolver reason, danger flags, workbench advice) and lets a person set a decision and a note.
// "Save" writes ONLY reviewer_decision / reviewer_note into the batch file. It never talks to a database: applying
// stays `identity-review.ps1 -Apply <batch.json> -Reviewer "<human name>"`, where the database records a named
// reviewer and refuses automated names.
//
// Local only: binds 127.0.0.1, refuses other Host headers (DNS rebinding) and requires the per-run token for saves.

import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '');
const port = Number(process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] ?? 4717);
const token = randomBytes(18).toString('hex');
const DECISIONS = ['', 'approve_match', 'approve_distinct', 'hold', 'reject_candidate'];
const load = () => JSON.parse(readFileSync(file, 'utf8'));
load();

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Identity review</title>
<style>
:root{--ink:#110e0b;--paper:#f6f2ea;--dim:rgba(246,242,234,.68);--gold:#d4af37;--line:rgba(246,242,234,.14);--red:#e2574c;--card:#1a1612}
*{box-sizing:border-box}body{margin:0;background:var(--ink);color:var(--paper);font:14px/1.45 system-ui,sans-serif;padding:0 16px 80px}
header{position:sticky;top:0;background:var(--ink);padding:14px 0;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap;z-index:2}
h1{font-size:18px;margin:0}h2{font-size:15px;margin:0 0 6px}.dim{color:var(--dim)}.gold{color:var(--gold)}.bad{color:var(--red)}
button{background:var(--gold);color:var(--ink);border:0;border-radius:999px;padding:8px 16px;font-weight:700;cursor:pointer}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}
.group{border-color:rgba(212,175,55,.5)}table{border-collapse:collapse;width:100%;table-layout:fixed}td{border-top:1px solid var(--line);padding:5px 6px;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}
td:first-child{color:var(--dim);width:190px}.decide{display:grid;grid-template-columns:220px 1fr;gap:8px;margin-top:10px}
select,textarea{width:100%;background:#0b0907;color:var(--paper);border:1px solid var(--line);border-radius:8px;padding:6px}
textarea{min-height:56px}.tag{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:1px 8px;margin:2px 4px 2px 0;font-size:12px}
@media(max-width:700px){td:first-child{width:34%}.decide{grid-template-columns:1fr}}
</style></head><body>
<header><h1>Identity review</h1><span class="dim" id="meta"></span><span style="flex:1"></span><span id="status" class="dim"></span><button id="save">Save decisions to file</button></header>
<p class="dim">Decisions are advice-free: the workbench recommendation is shown, nothing is pre-filled. A note of 20+ characters is required for any decision. Applying is a separate step with a named reviewer.</p>
<div id="groups"></div><div id="entries"></div>
<script>
const TOKEN = ${JSON.stringify(token)};
const DECISIONS = ${JSON.stringify(DECISIONS)};
const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else n.setAttribute(k, v); } for (const c of kids) n.append(c instanceof Node ? c : document.createTextNode(c == null ? '' : String(c))); return n; };
const row = (k, v) => el('tr', {}, el('td', {}, k), el('td', {}, v));
const list = (xs) => (xs && xs.length ? xs.join(' · ') : '—');
function decideBox(obj, key) {
  const sel = el('select', { 'data-key': key }); for (const d of DECISIONS) { const o = el('option', { value: d }, d || '(no decision)'); if ((obj.reviewer_decision || '') === d) o.selected = true; sel.append(o); }
  const note = el('textarea', { 'data-note': key, placeholder: 'Reviewer note: the actual reason (20+ characters)' }); note.value = obj.reviewer_note || '';
  return el('div', { class: 'decide' }, sel, note);
}
function entryCard(e, inGroup) {
  const ev = e.evidence;
  const t = el('table');
  t.append(row('Printed name', e.appearance.printed_name + ' (corner ' + e.appearance.side + ')'));
  t.append(row('Normalized name', ev.normalized_name.observed + ' ~ ' + (ev.normalized_name.candidate || '—') + ' (' + (ev.normalized_name.name_level || '—') + ')'));
  t.append(row('Event', (ev.event || '—') + ' · ' + ev.event_date + ' · ' + (ev.venue || '—')));
  t.append(row('Jurisdiction / commission', (ev.jurisdiction || e.state) + ' / ' + (ev.commission || '—')));
  const doc = el('span', {}, e.appearance.document + ' '); if (ev.source_url) doc.append(el('a', { href: ev.source_url, target: '_blank', rel: 'noopener noreferrer', class: 'gold' }, 'official document'));
  t.append(row('Source document', doc));
  t.append(row('Opponent', ev.opponent + (e.unlocks_bout_now ? ' (resolved: a decision unlocks this bout)' : ' (unresolved)')));
  t.append(row('Stated hometown', (ev.city_hometown.observed || '—') + ' · candidate: ' + list(ev.city_hometown.candidate)));
  t.append(row('Weight / class', (ev.weight.official_lb ?? '—') + ' lb · ' + (ev.weight_class || ev.weight.division_printed || '—') + ' · candidate weights: ' + list((ev.weight.candidate_weights || []).map((w) => w.weight_lb + ' (' + w.date + ')'))));
  t.append(row('DOB', ev.birthdate_policy ? ev.birthdate_policy.note : 'not collected'));
  const cands = el('div'); for (const c of (ev.candidates || [])) cands.append(el('div', {}, c.display_name + ' [' + (c.tier || '—') + ', ' + (c.confidence ?? '—') + '; ' + c.verified_bouts + ' bouts; aliases: ' + list(c.aliases) + '; hometowns: ' + list(c.hometowns) + '; for: ' + list(c.for) + '; against: ' + list(c.against) + ']'));
  t.append(row('Candidates', (ev.candidates || []).length ? cands : 'none'));
  t.append(row('Proposed boxer', e.proposed_boxer ? e.proposed_boxer.display_name + ' (resolver tier ' + e.proposed_boxer.tier_by_resolver + ')' : 'none'));
  t.append(row('Confidence / why held', (ev.confidence ?? '—') + ' · ' + (ev.held_reason ? (ev.held_reason.queue_reason + '; ' + ev.held_reason.resolver) : ev.resolver_stop_reason)));
  t.append(row('Contradictions', list(ev.contradictions)));
  const danger = el('span', { class: e.danger.length ? 'bad' : '' }, e.danger.length ? e.danger.map((d) => d.kind + ' [' + d.detail + ']').join('; ') : 'none');
  t.append(row('Danger flags', danger));
  t.append(row('Workbench advice', e.recommendation + ': ' + e.recommendation_why));
  const card = el('div', { class: 'card' }, el('h2', {}, e.appearance.display_name + ' · ' + e.state + ' · ' + ev.event_date), t);
  if (!inGroup) card.append(decideBox(e, 'entry:' + e.entry_id)); else card.append(el('p', { class: 'dim' }, 'Decided with its group.'));
  return card;
}
async function render() {
  const b = await (await fetch('/batch', { headers: { 'x-review-token': TOKEN } })).json();
  document.getElementById('meta').textContent = 'batch ' + b.batch_id + ' · ' + b.batch.length + ' entries · ' + (b.groups || []).length + ' groups · ' + b.workbench_version;
  const inGroup = new Set((b.groups || []).flatMap((g) => g.members));
  const G = document.getElementById('groups'); G.textContent = '';
  for (const g of (b.groups || [])) {
    const card = el('div', { class: 'card group' }, el('h2', { class: 'gold' }, 'Group: ' + g.display_name + ' · ' + g.state + ' · ' + g.members.length + ' appearances'),
      el('p', { class: 'dim' }, 'Basis: ' + g.basis), el('p', {}, 'Proposed: ' + (g.proposed_boxer ? g.proposed_boxer.display_name : 'no canonical candidate (approve_distinct creates ONE new boxer for all members)')));
    card.append(decideBox(g, 'group:' + g.group_id));
    for (const id of g.members) { const e = b.batch.find((x) => x.entry_id === id); if (e) card.append(entryCard(e, true)); }
    G.append(card);
  }
  const E = document.getElementById('entries'); E.textContent = '';
  for (const e of b.batch.filter((x) => !inGroup.has(x.entry_id))) E.append(entryCard(e, false));
}
document.getElementById('save').onclick = async () => {
  const decisions = {};
  for (const s of document.querySelectorAll('select[data-key]')) decisions[s.dataset.key] = { decision: s.value, note: document.querySelector('textarea[data-note="' + CSS.escape(s.dataset.key) + '"]').value };
  const r = await fetch('/save', { method: 'POST', headers: { 'content-type': 'application/json', 'x-review-token': TOKEN }, body: JSON.stringify(decisions) });
  const j = await r.json(); document.getElementById('status').textContent = r.ok ? 'saved: ' + j.decided + ' decided' : 'not saved: ' + (j.error || r.status);
};
render();
</script></body></html>`;

const send = (res, status, body, type = 'application/json') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(body); };
createServer((req, res) => {
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host ?? '')) return send(res, 421, JSON.stringify({ error: 'local only' }));
  if (req.method === 'GET' && req.url === '/') return send(res, 200, page, 'text/html; charset=utf-8');
  if (req.headers['x-review-token'] !== token) return send(res, 403, JSON.stringify({ error: 'token' }));
  if (req.method === 'GET' && req.url === '/batch') return send(res, 200, readFileSync(file, 'utf8'));
  if (req.method === 'POST' && req.url === '/save') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => {
      try {
        const decisions = JSON.parse(raw);
        const batch = load();
        let decided = 0;
        const apply = (obj, key) => {
          const d = decisions[key];
          if (!d) return;
          if (!DECISIONS.includes(d.decision)) throw new Error(`unknown decision for ${key}`);
          const note = String(d.note ?? '').slice(0, 2000);
          if (d.decision && note.trim().length < 20) throw new Error(`${key}: a note of 20+ characters is required`);
          obj.reviewer_decision = d.decision || null;
          obj.reviewer_note = d.decision ? note : (note || null);
          if (d.decision) decided += 1;
        };
        for (const g of batch.groups ?? []) apply(g, `group:${g.group_id}`);
        for (const e of batch.batch) apply(e, `entry:${e.entry_id}`);
        writeFileSync(`${file}.tmp`, JSON.stringify(batch, null, 1));
        renameSync(`${file}.tmp`, file);
        send(res, 200, JSON.stringify({ decided }));
      } catch (err) { send(res, 400, JSON.stringify({ error: String(err.message).slice(0, 200) })); }
    });
    return;
  }
  send(res, 404, JSON.stringify({ error: 'not found' }));
}).listen(port, '127.0.0.1', () => console.log(`identity review UI: http://127.0.0.1:${port}/  (batch ${file}; saves decisions to that file only)`));
