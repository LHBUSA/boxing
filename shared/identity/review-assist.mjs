// Identity-review assistant: for every pending review item, assemble the
// evidence a reviewer (or the graph resolver) needs, from stored official
// observations and the canonical career graph. Read-only; no refetching.
//
// Never included: DOB, federal/source private identifiers, medical data,
// sportsbook names.

import { assignBoutIds } from '../adapters/commissions/contract.mjs';
import { assertMinimized } from '../adapters/commissions/minimize.mjs';
import { COMMISSION_NAMESPACES } from '../commissions/apply.mjs';
import { loadGraphCandidates } from './appearance.mjs';
import { resolveAppearance } from './graph.mjs';
import { normalizedAlias } from './normalize.mjs';
import { classifyCandidateBouts } from './bout-history.mjs';

async function storedBoutIndex(store, sourceKey) {
  const index = new Map();
  for (let offset = 0; ; offset += 8) {
    const page = await store.commissionParsedDocuments(sourceKey, offset, 8);
    for (const d of page) {
      const events = new Map((d.events ?? []).map((e) => [e.source_event_id, e]));
      for (const b of assignBoutIds((d.bouts ?? []).map((x) => ({ ...x })))) index.set(b.source_bout_id, { bout: b, event: events.get(b.source_event_id) ?? null, doc_key: d.doc_key });
    }
    if (page.length < 8) break;
  }
  return index;
}

// Returns { generated_at, items: [...], summary }
export async function buildIdentityReviewReport(store, { sourceKeys = ['nsac_nevada', 'florida_athletic_commission', 'nj_sacb'], now = new Date().toISOString() } = {}) {
  const backlog = await store.identityReviewBacklog(sourceKeys);
  const indexes = new Map();
  const items = [];
  const summary = { pending_items: backlog.length, appearances: 0, appearances_without_stored_context: 0, projected: {}, items_projected: {} };
  for (const item of backlog) {
    if (!indexes.has(item.source_key)) indexes.set(item.source_key, await storedBoutIndex(store, item.source_key));
    const idx = indexes.get(item.source_key);
    const namespace = `${COMMISSION_NAMESPACES[item.source_key]}`;
    const appearances = [];
    for (const a of item.appearances) {
      summary.appearances += 1;
      const ctx = idx.get(a.bout);
      if (!ctx) { summary.appearances_without_stored_context += 1; appearances.push({ bout: a.bout, side: a.side, context: null, note: 'no stored parse carries this bout id' }); continue; }
      const other = a.side === 'a' ? 'b' : 'a';
      const corners = await store.sourceCornerFighters(item.source_key, `${namespace}.fighter`, [a.bout]);
      const events = ctx.event ? await store.sourceEventIds(`${namespace}.event`, [ctx.event.source_event_id]) : {};
      const ev = ctx.event ? events[ctx.event.source_event_id] ?? null : null;
      const fighter = ctx.bout[`fighter_${a.side}`];
      const app = {
        namespace: `${namespace}.fighter`, bout_external_id: a.bout, bout_order: ctx.bout.bout_order ?? null,
        display_name: fighter.display_name, hometown: fighter.hometown ?? null, weight_lb: fighter.weight_lb ?? null, debut: ctx.bout.debut?.[a.side] ?? null,
        event: { event_id: ev?.event_id ?? null, date: ctx.event?.event_date ?? null, commission: ev?.commission ?? null, venue_id: ev?.venue_id ?? null },
        opponent: { display_name: ctx.bout[`fighter_${other}`].display_name, fighter_id: corners[`${a.bout}|${other}`] ?? null },
      };
      const candidates = await loadGraphCandidates(store, fighter.display_name, `${namespace}.fighter`);
      const proposal = resolveAppearance(app, candidates, { allowCreate: true });
      const key = `${proposal.tier ?? '-'}:${proposal.decision}`;
      summary.projected[key] = (summary.projected[key] ?? 0) + 1;
      appearances.push({
        bout: a.bout, side: a.side, bound_fighter_id: corners[`${a.bout}|${a.side}`] ?? null,
        context: { event_date: app.event.date, event: ev?.name ?? null, venue: ev?.venue ?? ctx.event?.venue?.name ?? null, commission: app.event.commission,
          jurisdiction: ctx.event?.jurisdiction?.name ?? ctx.event?.jurisdiction ?? null, opponent: app.opponent.display_name, opponent_fighter_id: app.opponent.fighter_id,
          weight_lb: app.weight_lb, stated_hometown: app.hometown, debut: app.debut, document: ctx.doc_key,
          bout_order: ctx.bout.bout_order ?? null, repeat_index: Number((String(a.bout).match(/\|(\d+)$/) ?? [])[1] ?? 1) },
        candidates: candidates.map((c) => {
          const e = proposal.candidates?.find((x) => x.fighter_id === c.id);
          return {
            fighter_id: c.id, display_name: c.display_name, identity_state: c.identity_state,
            aliases: (c.aliases ?? []).map((x) => `${x.alias} (${x.kind}, ${x.verification_state})`),
            approved_source_identities: (c.identities ?? []).map((i) => `${i.source_key}:${i.namespace}`),
            hometowns: c.hometowns ?? [],
            prior_opponents: (c.bouts ?? []).map((b) => ({ date: b.date, opponent: b.opponent_name, result: b.result ?? null })),
            // issue #10: source/canonical bout identity, repeat index, sheet order, current result, preserved revisions
            bout_history: classifyCandidateBouts(c.bouts ?? []),
            weights_lb: (c.bouts ?? []).filter((b) => b.weight_lb != null).map((b) => ({ date: b.date, weight_lb: b.weight_lb, class: b.weight_class ?? null })),
            jurisdictions: [...new Set((c.bouts ?? []).map((b) => b.commission).filter(Boolean))],
            tier: e?.tier ?? null, confidence: e?.confidence ?? null, name_level: e?.name_level ?? null, reasons_for: e?.support ?? [], reasons_against: e?.against ?? [],
          };
        }),
        proposal: { decision: proposal.decision, tier: proposal.tier ?? null, reason: proposal.reason, fighter_id: proposal.fighter_id ?? null, confidence: proposal.confidence ?? null },
      });
    }
    const decisions = appearances.map((x) => x.proposal?.decision ?? 'no_context');
    const itemProjection = decisions.every((d) => d === 'matched') ? 'all_matched'
      : decisions.every((d) => ['matched', 'created'].includes(d)) ? 'all_bound' : decisions.some((d) => ['matched', 'created'].includes(d)) ? 'partly_bound' : 'still_review';
    summary.items_projected[itemProjection] = (summary.items_projected[itemProjection] ?? 0) + 1;
    items.push({ review_item_id: item.id, source_key: item.source_key, raw_name: item.raw_name, normalized_name: normalizedAlias(item.raw_name),
      review_reason: item.reason, queued_at: item.created_at, projection: itemProjection, appearances });
  }
  return assertMinimized({ generated_at: now, summary, items });
}

export function reportMarkdown(report) {
  const lines = [`# Identity review evidence (${report.generated_at})`, '', '```', JSON.stringify(report.summary, null, 1), '```', ''];
  for (const it of report.items) {
    lines.push(`## ${it.raw_name} (${it.source_key}, ${it.review_reason}) -> ${it.projection}`);
    for (const a of it.appearances) {
      const c = a.context;
      lines.push(c ? `- ${c.event_date} ${c.event ?? ''} vs ${c.opponent}; ${c.weight_lb ?? '?'} lb; hometown ${c.stated_hometown ?? '?'}${c.debut ? '; DEBUT' : ''}: **${a.proposal.tier ?? '-'} ${a.proposal.decision}** (${a.proposal.reason})` : `- ${a.bout}|${a.side}: no stored context`);
      for (const k of a.candidates ?? []) {
        lines.push(`  - candidate ${k.display_name} [${k.tier ?? '-'}, ${k.confidence ?? '-'}] bouts: ${k.prior_opponents.map((p) => `${p.date} vs ${p.opponent}`).join('; ') || 'none'}; weights: ${k.weights_lb.map((w) => w.weight_lb).join(', ') || '-'}; hometowns: ${k.hometowns.join(' / ') || '-'}`);
        lines.push(`    - for: ${k.reasons_for.join(', ') || '-'}`);
        lines.push(`    - against: ${k.reasons_against.join(', ') || '-'}`);
      }
    }
  }
  return lines.join('\n');
}
