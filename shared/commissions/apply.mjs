// Commission observations -> Boxing Core, through the existing canonical
// write paths (applyCardDocument, recordResult, recordScorecards,
// recordWeighIn, recordRegulatoryAction). Nothing here writes a canonical
// table directly, and nothing here decides identity: every participant goes
// through the identity resolver (new boxer / match / review queue).

import { contentHash } from '../canonical.mjs';
import { applyCardDocument } from '../events/card.mjs';
import { recordRegulatoryAction, recordResult, recordScorecards, recordWeighIn } from '../events/outcomes.mjs';
import { assertMinimized } from '../adapters/commissions/minimize.mjs';

export const COMMISSION_NAMESPACES = Object.freeze({ nsac_nevada: 'nsac', florida_athletic_commission: 'fl-athletic-commission', nj_sacb: 'nj-sacb', tdlr_texas: 'tdlr' });

const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// Plain-text event name (newsroom entity names allow letters, spaces, . ' ’ -).
// The date is a separate field; digits and symbols from venue/promoter names
// are spelled out or dropped from the DISPLAY name only.
const nameSafe = (s) => String(s ?? '').replace(/&/g, ' and ').replace(/\//g, ' and ').replace(/[‘`]/g, '’')
  .replace(/[^\p{L}\p{M}'’. -]+/gu, ' ').replace(/\s+/g, ' ').trim();
export function eventName(ev, adapter) {
  const where = nameSafe(ev.venue?.name ?? ev.venue?.city ?? adapter.jurisdiction.name);
  const who = ev.promoters?.length ? ev.promoters.map(nameSafe).filter(Boolean).join(' and ') : `${nameSafe(adapter.commission.name)} professional boxing`;
  return `${who || 'Professional boxing'} at ${where || nameSafe(adapter.jurisdiction.name)}`.slice(0, 80).trim();
}

export function cardDocumentFor(adapter, ev, bouts) {
  const namespace = COMMISSION_NAMESPACES[adapter.sourceKey];
  const doc = {
    source_key: adapter.sourceKey, namespace, external_id: ev.source_event_id, name: eventName(ev, adapter), event_date: ev.event_date,
    start_at: ev.start_at ?? null, status: ev.status ?? 'scheduled', source_url: ev.source_url,
    commission: { ...adapter.commission },
    // the commission's own result sheet is the authoritative record of its ring officials
    officials_authority: 'commission',
    ...(ev.venue?.name ? { venue: { name: ev.venue.name, city: ev.venue.city ?? null, region: ev.venue.region ?? null, country_code: ev.venue.country_code ?? 'US' } } : {}),
    bouts: bouts.map((b) => ({
      external_id: b.source_bout_id, bout_order: b.bout_order ?? null, scheduled_rounds: b.scheduled_rounds ?? null,
      status: b.result?.resolved ? 'complete' : ev.status === 'cancelled' ? 'cancelled' : 'scheduled',
      fighter_a: { display_name: b.fighter_a.display_name, hometown: b.fighter_a.hometown ?? null },
      fighter_b: { display_name: b.fighter_b.display_name, hometown: b.fighter_b.hometown ?? null },
      ...((b.referee || b.judges?.some((j) => j.name))
        ? { officials: [...(b.referee ? [{ role: 'referee', display_name: b.referee }] : []),
            ...(b.judges ?? []).filter((j) => j.name).map((j) => ({ role: 'judge', slot: j.slot, display_name: j.name }))], officials_complete: true }
        : {}),
    })),
  };
  return assertMinimized(doc);
}

// parsed: ParsedDocument (contract.mjs). Returns counts + review items.
export async function applyCommissionParsed(store, adapter, parsed, { now = new Date().toISOString(), changeReason = null } = {}) {
  const summary = { events: 0, events_created: 0, bouts_in_documents: parsed.bouts.length, bouts_linked: 0, results_created: 0, results_revised: 0, results_duplicate: 0,
    scorecards_written: 0, weigh_ins: 0, suspensions: 0, identity_unresolved: 0, review_items: [], news: {}, skipped: [] };
  const countNews = (n) => { if (n?.inserted) summary.news[n.event_type] = (summary.news[n.event_type] ?? 0) + 1; };
  const namespace = COMMISSION_NAMESPACES[adapter.sourceKey];

  for (const ev of parsed.events) {
    const bouts = parsed.bouts.filter((b) => b.source_event_id === ev.source_event_id);
    const card = await applyCardDocument(store, cardDocumentFor(adapter, ev, bouts), { now });
    if (card.status !== 'applied') { summary.skipped.push({ event: ev.source_event_id, reason: 'card_rejected', problems: card.problems }); continue; }
    summary.events += 1;
    if (card.event_created) summary.events_created += 1;
    for (const n of card.news ?? []) countNews(n);
    summary.identity_unresolved += card.unresolved?.length ?? 0;
    for (const u of card.unresolved ?? []) if (u.review_item_id) summary.review_items.push(u.review_item_id);
    if (!bouts.length) continue;

    const ids = await store.boutsForProviderEvents(`${namespace}.bout`, bouts.map((b) => b.source_bout_id));
    const officialsByBout = new Map(((await store.cardState(card.event_id)).bouts ?? []).map((b) => [b.bout_id, b.officials ?? []]));
    for (const b of bouts) {
      const boutId = ids[b.source_bout_id];
      if (!boutId) { summary.skipped.push({ bout: b.source_bout_id, reason: 'bout_not_created_identity_unresolved' }); continue; }
      summary.bouts_linked += 1;
      const state = await store.boutOutcomeState(boutId);
      const fighter = Object.fromEntries(state.participants.map((p) => [p.side, p.fighter_id]));

      if (b.result?.resolved) {
        const r = await recordResult(store, {
          bout_id: boutId, source_key: adapter.sourceKey, source_url: b.source_url, outcome: b.result.outcome,
          winner_id: b.result.outcome === 'win' ? fighter[b.result.winner_side] ?? null : null, method: b.result.method, method_raw: b.result.result_raw,
          decision_type: b.result.decision_type ?? null, round: b.result.round ?? null, time_sec: b.result.time_sec ?? null, result_state: 'official',
          change_reason: changeReason,
          observation: { entity_type: 'commission_bout_result', external_key: `${namespace}:${b.source_bout_id}`, source_url: b.source_url,
            payload: assertMinimized({ bout: b, document_key: b.provenance?.document_key ?? null, source_revision: b.source_revision ?? null }),
            content_hash: await contentHash({ result: b.result, judges: b.judges, rev: b.source_revision ?? null }) },
        }, { now });
        if (r.status === 'created') summary.results_created += 1;
        else if (r.status === 'revised') summary.results_revised += 1;
        else summary.results_duplicate += 1;
        countNews(r.news);
      }

      const officials = officialsByBout.get(boutId) ?? [];
      const cards = (b.judges ?? []).filter((j) => j.a_total != null && j.b_total != null).map((j) => {
        const o = officials.find((x) => x.role === 'judge' && (x.slot === j.slot || x.display_name === j.name));
        return o ? { judge_id: o.official_id, slot: j.slot, a_total: j.a_total, b_total: j.b_total, rounds: [], score_basis: 'unknown' } : null;
      });
      const deductions = (b.deductions ?? []).filter((d) => d.side && fighter[d.side]).map((d) => ({ fighter_id: fighter[d.side], round: d.round, points: d.points,
        reason_public: d.reason_raw ? String(d.reason_raw).slice(0, 280) : null }));
      if (cards.length && cards.every(Boolean)) {
        const s = await recordScorecards(store, { bout_id: boutId, source_key: adapter.sourceKey, source_url: b.source_url, cards, deductions }, { now });
        summary.scorecards_written += s.written.filter((w) => w.status !== 'duplicate').length;
        countNews(s.news);
      } else if (deductions.length && /^https:/.test(b.source_url)) {
        const referee = officials.find((x) => x.role === 'referee');
        for (const d of deductions) await store.recordPointDeduction({ ...d, bout_id: boutId, source_key: adapter.sourceKey, source_url: b.source_url, referee_official_id: referee?.official_id ?? null });
      }

      for (const side of ['a', 'b']) {
        const w = b[`fighter_${side}`]?.weight_lb;
        if (w == null || !fighter[side] || !/^https:/.test(b.source_url)) continue;
        const r = await recordWeighIn(store, { bout_id: boutId, fighter_id: fighter[side], source_key: adapter.sourceKey, source_url: b.source_url,
          weigh_in_kind: 'official', attempt_no: 1, official_weight_lb: w, source_unit: 'lb', source_weight_raw: String(w), verification_state: 'verified' }, { now });
        if (r.status !== 'duplicate') summary.weigh_ins += 1;
        countNews(r.news);
      }

      for (const s of b.suspensions ?? []) {
        if (!fighter[s.side] || !/^https:/.test(b.source_url)) continue;
        const to = s.duration_days != null ? addDays(ev.event_date, s.duration_days) : null;
        const r = await recordRegulatoryAction(store, { source_key: adapter.sourceKey, action_key: `${b.source_bout_id}|${s.side}|suspension`, action_type: 'suspension',
          status: to && to < now.slice(0, 10) ? 'expired' : 'active', fighter_id: fighter[s.side], bout_id: boutId, commission_slug: adapter.commission.slug,
          effective_from: ev.event_date, effective_to: to, reason_public: null, source_url: b.source_url }, { now });
        if (r.status !== 'duplicate') summary.suspensions += 1;
        countNews(r.news);
      }
    }
  }
  return summary;
}
