#!/usr/bin/env node
// Read-only remap for replaying committed human identity decisions onto a rebuilt Boxing database.
//
//   node scripts/identity/replay-remap.mjs --file=<batch.json> --from=<label> --out=<remap.json>
//
// A decision names the reviewed boxer by the OLD database's fighter id. This finds the same boxer here only through
// the official source bouts the reviewer saw: the candidate's bouts in the batch evidence (exact source bout ids when
// recorded; otherwise the commission source key "<date>|<city>|<promoter>|<slug a>|<slug b>[|n]" on that date with the
// candidate's and the opponent's printed-name slugs). The candidate's corner comes from the slug position in the key.
// A remap is written only when every located bout gives the SAME fighter here and at least one bout is located.
// Anything else stays unmapped, and the replay holds that decision. Nothing is written to the database.

import { writeFileSync, readFileSync } from 'node:fs';
import { slug } from '../../shared/adapters/commissions/contract.mjs';
import { assertBoxingWriteTarget } from '../../shared/store/target-guard.mjs';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? '').slice(k.length + 3) || null;
const target = assertBoxingWriteTarget(process.env);
const base = `${process.env.SUPABASE_URL}/rest/v1`;
const headers = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
const get = async (path) => {
  const r = await fetch(`${base}/${path}`, { headers });
  if (!r.ok) throw new Error(`GET ${path.split('?')[0]} ${r.status}`);
  return r.json();
};
const enc = encodeURIComponent;

const batch = JSON.parse(readFileSync(arg('file'), 'utf8'));
const decided = batch.batch.filter((e) => e.reviewer_decision);
const out = { from: arg('from'), target: target.ref, batch_id: batch.batch_id, fighterMap: {}, remapBasis: {}, seqs: {}, held: [] };

async function cornerFighter(ns, key, candidateSlug) {
  const segs = key.split('|');
  const side = segs[3] === candidateSlug ? 'a' : segs[4] === candidateSlug ? 'b' : null;
  if (!side) return null;
  const ids = await get(`boxing_bout_identities?namespace=eq.${enc(ns)}&external_id=eq.${enc(key)}&select=bout_id`);
  if (ids.length !== 1) return null;
  const p = await get(`boxing_bout_participants?bout_id=eq.${ids[0].bout_id}&side=eq.${side}&select=fighter_id`);
  return p.length === 1 && p[0].fighter_id ? { key, side, fighter_id: p[0].fighter_id } : null;
}

for (const e of decided) {
  const ns = e.appearance.namespace;
  const boutNs = ns.replace(/\.fighter$/, '.bout');
  // the appearance being decided: its latest decision on THIS database (the replay supersedes exactly that)
  const latest = await get(`boxing_identity_appearance_decisions?namespace=eq.${enc(ns)}&bout_external_id=eq.${enc(e.appearance.bout_external_id)}&side=eq.${e.appearance.side}&select=seq&order=seq.desc&limit=1`);
  out.seqs[e.entry_id] = latest[0]?.seq ?? null;
  if (e.reviewer_decision !== 'approve_match') continue;
  const old = e.proposed_boxer?.fighter_id;
  const candSlug = slug(e.proposed_boxer?.display_name);
  const located = [];
  for (const c of e.evidence?.candidate_record ?? []) {
    let keys = c.source_bout_ids ?? null;
    if (!keys?.length) {
      const rows = await get(`boxing_bout_identities?namespace=eq.${enc(boutNs)}&external_id=like.${enc(`${c.date}|*`)}&select=external_id`);
      const opp = slug(c.opponent);
      keys = rows.map((r) => r.external_id).filter((k) => { const s = k.split('|'); return new Set([s[3], s[4]]).has(candSlug) && new Set([s[3], s[4]]).has(opp); });
    }
    for (const k of keys) { const hit = await cornerFighter(boutNs, k, candSlug); if (hit) located.push(hit); }
  }
  const fighters = [...new Set(located.map((x) => x.fighter_id))];
  if (fighters.length === 1) {
    out.fighterMap[old] = fighters[0];
    out.remapBasis[old] = { rule: 'same official source bout(s) the reviewer saw; candidate corner from the source key', located };
  } else {
    out.held.push({ entry_id: e.entry_id, original_fighter_id: old, reason: fighters.length ? 'located bouts give different fighters' : 'no reviewed source bout located', located });
  }
}
writeFileSync(arg('out'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ target: out.target, decided: decided.length, mapped: Object.keys(out.fighterMap).length, held: out.held.length,
  appearances_with_seq: Object.values(out.seqs).filter((s) => s != null).length }, null, 1));
