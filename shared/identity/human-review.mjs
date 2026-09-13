// Human identity review workbench on top of the career-graph evidence report.
//
//   proposeReviewBatch  -> ranked, fully evidenced proposals for a small batch;
//                          NOTHING is written. Recommendations are advice to a
//                          person, never decisions: the resolver's Tier A/B
//                          standards are unchanged and nothing outside them is
//                          applied automatically.
//   applyApprovedBatch  -> records ONLY the entries a named human reviewer marked
//                          approved, as new append-only decision rows (reviewer,
//                          reviewed_at, batch, note, evidence shown, latest seq seen).
//
// Danger cases are flagged, never resolved by rule: same name held by more than
// one canonical boxer, same surname + same city with a different given name
// (siblings, twins, cousins), generational suffixes, given-name variants.

import { contentHash } from '../canonical.mjs';
import { assignBoutIds } from '../adapters/commissions/contract.mjs';
import { assertMinimized } from '../adapters/commissions/minimize.mjs';
import { COMMISSION_NAMESPACES, divisionFacts } from '../commissions/apply.mjs';
import { cityLevelHometown } from './graph.mjs';
import { normalizedAlias, parseName } from './normalize.mjs';
import { buildIndex, toIdentity } from './pipeline.mjs';

export const REVIEW_WORKBENCH_VERSION = 'boxing-identity-review-workbench@1.0.0';
export const COMMISSION_SOURCES = ['nsac_nevada', 'florida_athletic_commission', 'nj_sacb'];
const STATE_OF = { nsac_nevada: 'NV', florida_athletic_commission: 'FL', nj_sacb: 'NJ' };
const EXACT_FORMS = new Set(['exact', 'reordered', 'joined']);

// Parsed-document bouts per commission, with source bout ids normalized as the re-apply does.
export async function storedBouts(store, sourceKey) {
  const out = [];
  for (let offset = 0; ; offset += 8) {
    const page = await store.commissionParsedDocuments(sourceKey, offset, 8);
    for (const d of page) {
      const events = new Map((d.events ?? []).map((e) => [e.source_event_id, e]));
      for (const b of assignBoutIds((d.bouts ?? []).map((x) => ({ ...x })))) out.push({ bout: b, event: events.get(b.source_event_id) ?? null, doc_key: d.doc_key });
    }
    if (page.length < 8) break;
  }
  return out;
}

// Blocked = a bout on a stored official sheet with no canonical bout (at least one corner unresolved).
export async function blockedBoutsByState(store) {
  const out = {};
  for (const sourceKey of COMMISSION_SOURCES) {
    const bouts = await storedBouts(store, sourceKey);
    const ids = bouts.map((x) => x.bout.source_bout_id);
    const mapped = ids.length ? await store.boutsForProviderEvents(`${COMMISSION_NAMESPACES[sourceKey]}.bout`, ids) : {};
    const linked = ids.filter((id) => mapped[id]).length;
    out[STATE_OF[sourceKey]] = { on_official_sheets: ids.length, canonical: linked, blocked: ids.length - linked };
  }
  return out;
}

const surnameOf = (name) => parseName(name).last;
const givenOf = (name) => parseName(name).given;

export function dangerFlags({ observedName, observedHometown, candidate, nameIndex }) {
  const flags = [];
  const norm = normalizedAlias(observedName);
  const sameName = nameIndex.filter((f) => normalizedAlias(f.display_name) === norm);
  if (sameName.length > 1) flags.push({ kind: 'same_name_multiple_canonical_boxers', detail: sameName.map((f) => f.display_name).join(' / ') });
  const obs = parseName(observedName);
  if (obs.suffix || (candidate && parseName(candidate.display_name).suffix)) flags.push({ kind: 'generational_suffix', detail: [observedName, candidate?.display_name].filter(Boolean).join(' vs ') });
  const city = cityLevelHometown(observedHometown);
  const surname = surnameOf(observedName);
  if (surname) {
    const relatives = nameIndex.filter((f) => f.id !== candidate?.fighter_id && surnameOf(f.display_name) === surname
      && givenOf(f.display_name) !== obs.given && (!city || (f.hometowns ?? []).map(cityLevelHometown).includes(city)));
    if (relatives.length) flags.push({ kind: city ? 'same_surname_same_city_different_given_name' : 'same_surname_different_given_name', detail: relatives.map((f) => f.display_name).slice(0, 6).join(' / ') });
  }
  if (candidate && !EXACT_FORMS.has(candidate.name_level)) flags.push({ kind: 'name_not_exact_form', detail: `${observedName} ~ ${candidate.display_name} (${candidate.name_level})` });
  if (candidate?.reasons_against?.includes('given_name_differs')) flags.push({ kind: 'given_name_differs', detail: `${observedName} vs ${candidate.display_name}` });
  return flags;
}

// Advice only. "match" is offered only where the ONLY gap to Tier B is missing evidence
// (never a contradiction), and no danger flag exists.
export function recommend({ appearance, top, plausible, flags }) {
  const against = top?.reasons_against ?? [];
  const hard = top?.tier === 'D';
  const contradictions = against.filter((a) => !/neutral/.test(a));
  if (!top) return { recommendation: 'distinct_or_hold', why: 'no name-similar canonical boxer' };
  if (plausible.length > 1) return { recommendation: 'hold', why: `${plausible.length} plausible candidates: needs independent evidence` };
  if (hard) return { recommendation: 'distinct', why: `hard contradiction: ${contradictions.join('; ')}` };
  if (flags.length) return { recommendation: 'hold', why: `danger case: ${flags.map((f) => f.kind).join(', ')}` };
  const families = new Set((top.reasons_for ?? []).map((r) => r.split(':')[0].replace(/^weight_.*/, 'weight')));
  const hasWeight = [...families].some((f) => f === 'weight');
  const cont = ['same_commission', 'same_venue', 'rematch_of_recorded_opponent'].some((f) => families.has(f));
  const cityConflict = against.some((a) => a.startsWith('hometown_different_city'));
  const dateSoft = against.some((a) => /^fought_\d{4}-\d{2}-\d{2}$/.test(a));
  const weightConflict = against.some((a) => a.startsWith('weight_') && !/neutral/.test(a));
  if (EXACT_FORMS.has(top.name_level) && hasWeight && cont && !cityConflict && !weightConflict && !dateSoft) {
    return { recommendation: 'match', why: 'exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)' };
  }
  if (EXACT_FORMS.has(top.name_level) && hasWeight && cont && dateSoft && !cityConflict && !weightConflict) {
    return { recommendation: 'match_with_caveat', why: 'everything agrees except a bout within 13 days (weekly team-league cards); a reviewer must confirm the schedule' };
  }
  if (cityConflict || weightConflict) return { recommendation: 'hold', why: `contradiction: ${contradictions.join('; ')}` };
  return { recommendation: 'hold', why: 'not enough independent evidence' };
}

// report: buildIdentityReviewReport output; returns proposals for every pending appearance, ranked
export async function proposeReviewBatch(store, report, { batchId, size = 10, now = new Date().toISOString() } = {}) {
  const nameIndex = await store.fighterNameIndex();
  const blocked = await blockedBoutsByState(store);
  const boutsBySource = new Map();
  for (const s of COMMISSION_SOURCES) boutsBySource.set(s, new Map((await storedBouts(store, s)).map((x) => [x.bout.source_bout_id, x])));
  const entries = [];
  for (const item of report.items) {
    const ns = `${COMMISSION_NAMESPACES[item.source_key]}.fighter`;
    const keys = item.appearances.map((a) => `${a.bout}|${a.side}`);
    const latest = await store.appearanceLatest(ns, keys);
    for (const a of item.appearances) {
      if (!a.context) continue;
      const stored = boutsBySource.get(item.source_key)?.get(a.bout);
      const ctx = a.context;
      const plausible = (a.candidates ?? []).filter((c) => c.tier && c.tier !== 'D');
      const top = [...plausible].sort((x, y) => (y.confidence ?? 0) - (x.confidence ?? 0))[0] ?? (a.candidates ?? []).find((c) => c.tier) ?? null;
      const flags = dangerFlags({ observedName: stored?.bout?.[`fighter_${a.side}`]?.display_name ?? item.raw_name, observedHometown: ctx.stated_hometown, candidate: top, nameIndex });
      const rec = recommend({ appearance: a, top, plausible, flags });
      const bound = latest[`${a.bout}|${a.side}`];
      if (bound && ['matched', 'created'].includes(bound.decision)) continue;
      const contract = divisionFacts(stored?.bout?.division_raw);
      entries.push({
        entry_id: `${batchId}:${item.source_key}:${a.bout}|${a.side}`,
        review_item_id: item.review_item_id, source_key: item.source_key, state: STATE_OF[item.source_key],
        appearance: { namespace: ns, bout_external_id: a.bout, side: a.side, printed_name: stored?.bout?.[`fighter_${a.side}`]?.source_name ?? item.raw_name,
          display_name: stored?.bout?.[`fighter_${a.side}`]?.display_name ?? item.raw_name, document: ctx.document, latest_decision_seq: bound?.seq ?? null },
        unlocks_bout_now: Boolean(ctx.opponent_fighter_id),
        evidence: {
          normalized_name: { observed: normalizedAlias(item.raw_name), candidate: top ? normalizedAlias(top.display_name) : null, name_level: top?.name_level ?? null },
          city_hometown: { observed: ctx.stated_hometown, observed_city_level: cityLevelHometown(ctx.stated_hometown), candidate: top?.hometowns ?? [],
            candidate_city_level: (top?.hometowns ?? []).map(cityLevelHometown).filter(Boolean) },
          weight: { official_lb: ctx.weight_lb, contracted_lb: contract.contracted_weight_lb ?? null, division_printed: stored?.bout?.division_raw ?? null,
            candidate_weights: top?.weights_lb ?? [] },
          commission: ctx.commission, venue: ctx.venue, event: ctx.event, event_date: ctx.event_date, opponent: ctx.opponent,
          relationship: (top?.reasons_for ?? []).filter((r) => /rematch|same_fight|same_venue|same_commission/.test(r)),
          candidate_record: top?.prior_opponents ?? [],
          contradictions: top?.reasons_against ?? [],
          competing_candidates: (a.candidates ?? []).filter((c) => c.fighter_id !== top?.fighter_id && c.tier)
            .map((c) => ({ fighter_id: c.fighter_id, display_name: c.display_name, tier: c.tier, confidence: c.confidence, against: c.reasons_against })),
          confidence: top?.confidence ?? null,
          resolver_stop_reason: a.proposal?.reason ?? null,
        },
        proposed_boxer: top ? { fighter_id: top.fighter_id, display_name: top.display_name, tier_by_resolver: top.tier } : null,
        danger: flags,
        recommendation: rec.recommendation, recommendation_why: rec.why,
        // filled in by the human reviewer before apply: approve_match | approve_distinct | hold | reject_candidate
        reviewer_decision: null, reviewer_note: null,
      });
    }
  }
  const rank = (e) => (e.unlocks_bout_now ? 0 : 10) + ({ match: 0, match_with_caveat: 2, distinct: 3, hold: 5, distinct_or_hold: 6 }[e.recommendation] ?? 9) + (e.danger.length ? 4 : 0);
  entries.sort((x, y) => rank(x) - rank(y) || String(x.evidence.event_date).localeCompare(String(y.evidence.event_date)) || x.entry_id.localeCompare(y.entry_id));
  const batch = entries.slice(0, size);
  const summary = {
    pending_items: report.summary.pending_items, pending_appearances: entries.length,
    unlock_now: entries.filter((e) => e.unlocks_bout_now).length,
    recommendations: entries.reduce((m, e) => ({ ...m, [e.recommendation]: (m[e.recommendation] ?? 0) + 1 }), {}),
    danger_cases: entries.filter((e) => e.danger.length).length,
    blocked_bouts: blocked,
  };
  return assertMinimized({ workbench_version: REVIEW_WORKBENCH_VERSION, batch_id: batchId, generated_at: now, summary, batch, remaining: entries.slice(size).map((e) => ({
    entry_id: e.entry_id, name: e.appearance.display_name, state: e.state, event_date: e.evidence.event_date, unlocks_bout_now: e.unlocks_bout_now,
    recommendation: e.recommendation, danger: e.danger.map((d) => d.kind) })) });
}

export function batchMarkdown(p) {
  const L = [`# Identity review batch ${p.batch_id}`, '', `Generated ${p.generated_at} by ${p.workbench_version}. **Nothing has been applied.** Each entry needs a named human reviewer's decision and note.`, '',
    '```', JSON.stringify(p.summary, null, 1), '```', ''];
  const dangers = p.batch.filter((e) => e.danger.length);
  L.push('## Sibling / twin / same-name danger cases in this batch', '');
  L.push(dangers.length ? dangers.map((e) => `- **${e.appearance.display_name}** (${e.state}, ${e.evidence.event_date}): ${e.danger.map((d) => `${d.kind} [${d.detail}]`).join('; ')}`).join('\n') : '- none', '');
  for (const e of p.batch) {
    const ev = e.evidence;
    L.push(`## ${e.entry_id}`, '',
      `| | |`, `|---|---|`,
      `| Source appearance | "${e.appearance.printed_name}" (${e.state}), corner ${e.appearance.side}, ${ev.event_date}, ${ev.event ?? ''}; document \`${e.appearance.document}\` |`,
      `| Proposed canonical boxer | ${e.proposed_boxer ? `${e.proposed_boxer.display_name} (\`${e.proposed_boxer.fighter_id}\`, resolver tier ${e.proposed_boxer.tier_by_resolver})` : 'none'} |`,
      `| Normalized name | ${ev.normalized_name.observed} ~ ${ev.normalized_name.candidate ?? '-'} (${ev.normalized_name.name_level ?? '-'}) |`,
      `| City-level hometown | observed: ${ev.city_hometown.observed ?? '-'} (${ev.city_hometown.observed_city_level ?? 'not city-level'}); candidate: ${ev.city_hometown.candidate.join(' / ') || '-'} |`,
      `| Official / contracted weight | ${ev.weight.official_lb ?? '-'} lb / ${ev.weight.contracted_lb ?? '-'}${ev.weight.division_printed ? ` (${ev.weight.division_printed})` : ''}; candidate weights: ${ev.weight.candidate_weights.map((w) => `${w.weight_lb} (${w.date})`).join(', ') || '-'} |`,
      `| Commission / venue | ${ev.commission ?? '-'} / ${ev.venue ?? '-'} |`,
      `| Opponent | ${ev.opponent}${e.unlocks_bout_now ? ' (already resolved: approving unlocks this bout)' : ' (unresolved: the bout needs both corners)'} |`,
      `| Relationship evidence | ${ev.relationship.join(', ') || '-'} |`,
      `| Candidate record | ${ev.candidate_record.map((r) => `${r.date} vs ${r.opponent}${r.result ? ` (${r.result})` : ''}`).join('; ') || '-'} |`,
      `| Contradictions | ${ev.contradictions.join(', ') || 'none'} |`,
      `| Competing candidates | ${ev.competing_candidates.map((c) => `${c.display_name} [${c.tier}, ${c.confidence}]`).join('; ') || 'none'} |`,
      `| Confidence | ${ev.confidence ?? '-'} |`,
      `| Why the resolver stopped | ${ev.resolver_stop_reason} |`,
      `| Danger flags | ${e.danger.map((d) => d.kind).join(', ') || 'none'} |`,
      `| **Workbench recommendation (advice only)** | **${e.recommendation}**: ${e.recommendation_why} |`, '');
  }
  return L.join('\n');
}

const REVIEWER_DECISIONS = new Set(['approve_match', 'approve_distinct', 'hold', 'reject_candidate']);

// Records the human decisions in an approved batch file. Every recorded entry needs
// reviewer_decision and a reviewer_note; the reviewer identity is passed explicitly.
export async function applyApprovedBatch(store, batch, { reviewer, reviewedAt = new Date().toISOString() } = {}) {
  if (!reviewer || /(resolver|claude|gpt|openai|anthropic|\bbot\b|automat|script|system)/i.test(reviewer)) {
    throw new Error('a named human reviewer is required');
  }
  const results = [];
  for (const e of batch.batch) {
    if (!e.reviewer_decision) { results.push({ entry_id: e.entry_id, status: 'not_reviewed' }); continue; }
    if (!REVIEWER_DECISIONS.has(e.reviewer_decision)) throw new Error(`${e.entry_id}: unknown reviewer_decision ${e.reviewer_decision}`);
    if (!e.reviewer_note || e.reviewer_note.trim().length < 20) throw new Error(`${e.entry_id}: reviewer_note (20+ characters) is required`);
    if (e.reviewer_decision === 'approve_match' && !e.proposed_boxer?.fighter_id) throw new Error(`${e.entry_id}: no proposed boxer to match`);
    const decision = { approve_match: 'matched', approve_distinct: 'created', hold: 'review', reject_candidate: 'review' }[e.reviewer_decision];
    const evidence = { shown_to_reviewer: e.evidence, danger: e.danger, workbench_recommendation: { recommendation: e.recommendation, why: e.recommendation_why },
      reviewer_decision: e.reviewer_decision, rejected_candidate: e.reviewer_decision === 'reject_candidate' ? e.proposed_boxer : null, workbench_version: batch.workbench_version };
    const r = await store.recordAppearanceDecision({
      source_key: e.source_key, namespace: e.appearance.namespace, bout_external_id: e.appearance.bout_external_id, side: e.appearance.side,
      observed_name: e.appearance.display_name, hometown: e.evidence.city_hometown.observed ?? null, decision, tier: 'C',
      fighter_id: decision === 'matched' ? e.proposed_boxer.fighter_id : null, confidence: 100, evidence, evidence_hash: await contentHash(evidence),
      resolver_version: `human-review:${batch.workbench_version}`, decided_by: `reviewer:${reviewer}`, reviewer, reviewed_at: reviewedAt,
      review_note: e.reviewer_note, review_batch: batch.batch_id, supersedes_seq: e.appearance.latest_decision_seq,
      index: buildIndex(toIdentity({ display_name: e.appearance.display_name }, e.appearance.namespace), { evidence: { nameLevel: 'exact' } }),
    });
    results.push({ entry_id: e.entry_id, status: r.status, decision, decision_seq: r.decision_seq, review_items_closed: r.review_items_closed });
  }
  return results;
}
