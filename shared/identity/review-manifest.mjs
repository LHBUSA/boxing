// Review manifest: the pending identity review work ordered by what one human review can unlock.
//
// Input: a workbench proposal (proposeReviewBatch with every pending appearance). Output: one row per held identity
// (review item = one source + one printed name), its held appearances, the canonical bouts that approving or
// distinguishing it would unlock, the evidence for and against the proposed canonical boxer, and an evidence class:
//   A  very strong: every appearance is an exact-form name with official-weight agreement and commission/venue/opponent
//      continuity, no contradiction, no danger flag (the workbench's own "match" advice) - still needs a human approval
//   B  plausible but ambiguous: some independent support (weight or continuity) but a caveat, a danger flag, or
//      appearances that disagree
//   C  likely a different boxer: a hard contradiction (same-date bout elsewhere, candidate is the opponent, debut after
//      a recorded bout) or an incompatible official weight on every contradicted appearance
//   D  insufficient evidence: the name is the only link (no weight or continuity support) - leave held
// The class ranks and explains; it decides nothing. A name alone never reaches A or B. No decision field is filled in.

import { assertMinimized } from '../adapters/commissions/minimize.mjs';

export const REVIEW_MANIFEST_VERSION = 'boxing-identity-review-manifest@1.0.0';
const EXACT_FORMS = new Set(['exact', 'reordered', 'joined']);
const HARD = /^(candidate_is_the_opponent|fought_\d{4}-\d{2}-\d{2}_at_other_event|sheet_marks_debut_but_candidate_has_earlier_bout)$/;
const CLASS_ORDER = { A: 0, B: 1, C: 2, D: 3 };

const supportFamilies = (reasons = []) => new Set(reasons.map((r) => (r.startsWith('weight_') ? 'weight'
  : r.startsWith('same_commission') ? 'commission' : r === 'same_venue' ? 'venue' : r === 'rematch_of_recorded_opponent' ? 'opponent'
    : r.startsWith('hometown_same_city') ? 'hometown' : null)).filter(Boolean));

export function appearanceClass(e) {
  const top = (e.evidence.candidates ?? []).find((c) => c.fighter_id === e.proposed_boxer?.fighter_id) ?? null;
  const against = e.evidence.contradictions ?? [];
  const hard = against.filter((a) => HARD.test(a));
  const weightIncompatible = against.some((a) => /^weight_\d/.test(a));
  if (!top) return { cls: 'D', why: 'no canonical candidate: approving distinct would create a boxer from the name and weight alone' };
  if (e.recommendation === 'distinct' || hard.length) return { cls: 'C', why: `hard contradiction: ${hard.join(', ') || against.join(', ')}` };
  if (e.recommendation === 'match' && !e.danger.length) return { cls: 'A', why: e.recommendation_why };
  const families = supportFamilies(top.for);
  const exact = EXACT_FORMS.has(top.name_level);
  if (weightIncompatible && !families.has('commission') && !families.has('opponent')) return { cls: 'C', why: `official weight incompatible with the candidate's record: ${against.filter((a) => /^weight_\d/.test(a)).join(', ')}` };
  // B needs two independent families beside the name: one family alone (the same commission, which every Tennessee
  // candidate shares, or a weight within a few pounds) is not independent evidence of the same person
  if (exact && families.size >= 2) {
    const caveats = [...e.danger.map((d) => d.kind), ...against.filter((a) => !/neutral/.test(a))];
    return { cls: 'B', why: `support: ${[...families].join(', ')}; caveats: ${caveats.join(', ') || 'workbench advice ' + e.recommendation}` };
  }
  if (exact && families.size === 1) return { cls: 'D', why: `the printed name plus one family only (${[...families][0]}): not independent evidence` };
  return { cls: 'D', why: exact ? 'the printed name is the only link (no official-weight, commission, venue or opponent support)' : `name form ${top.name_level} only` };
}

function identityClass(classes) {
  const set = new Set(classes);
  if (set.size === 1) return classes[0];
  if (set.has('C') && (set.has('A') || set.has('B'))) return 'B';
  if (set.has('A') || set.has('B')) return 'B';
  return set.has('C') ? 'C' : 'D';
}

const tally = (xs) => Object.entries(xs.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => (n > 1 ? `${k} (x${n})` : k));

// proposal: proposeReviewBatch output with every pending appearance in proposal.batch
// batch003: optional earlier batch file; entries already proposed there are marked
export function buildReviewManifest(proposal, { sources = null, batchFiles = {}, now = new Date().toISOString() } = {}) {
  const entries = proposal.batch.filter((e) => !sources || sources.includes(e.source_key));
  const heldKey = (e) => `${e.source_key}|${e.appearance.bout_external_id}|${e.appearance.side}`;
  const itemOfAppearance = new Map(entries.map((e) => [heldKey(e), e]));
  const inBatch = Object.fromEntries(Object.entries(batchFiles).map(([name, b]) => [name, new Set((b.batch ?? []).map((x) => `${x.source_key}|${x.appearance.bout_external_id}|${x.appearance.side}`))]));
  const byItem = new Map();
  for (const e of entries) byItem.set(e.review_item_id, [...(byItem.get(e.review_item_id) ?? []), e]);
  const groupsByMember = new Map((proposal.groups ?? []).flatMap((g) => g.members.map((m) => [m, g.group_id])));

  const rows = [];
  for (const [itemId, apps] of byItem) {
    const first = apps[0];
    const perApp = apps.map((e) => {
      const other = e.appearance.side === 'a' ? 'b' : 'a';
      const opponentHeld = itemOfAppearance.get(`${e.source_key}|${e.appearance.bout_external_id}|${other}`) ?? null;
      const c = appearanceClass(e);
      return {
        entry_id: e.entry_id, event_date: e.evidence.event_date, event: e.evidence.event, document: e.appearance.document, source_url: e.evidence.source_url,
        printed_name: e.appearance.printed_name, side: e.appearance.side, weight_lb: e.evidence.weight.official_lb, stated_place: e.evidence.city_hometown.observed,
        opponent: e.evidence.opponent,
        unlocks: e.unlocks_bout_now ? 'bout_now' : opponentHeld ? `needs:${opponentHeld.appearance.display_name}` : 'needs_other_corner',
        opponent_review_item_id: opponentHeld?.review_item_id ?? null,
        resolver: { tier: e.evidence.held_reason?.resolver_tier ?? null, reason: e.evidence.held_reason?.resolver ?? null, queue_reason: e.evidence.held_reason?.queue_reason ?? null },
        class: c.cls, class_why: c.why, workbench_advice: e.recommendation, danger: e.danger.map((d) => d.kind),
        group_id: groupsByMember.get(e.entry_id) ?? null,
        in_batches: Object.entries(inBatch).filter(([, s]) => s.has(heldKey(e))).map(([n]) => n),
      };
    });
    const cands = new Map();
    for (const e of apps) for (const c of e.evidence.candidates ?? []) if (!cands.has(c.fighter_id)) cands.set(c.fighter_id, c);
    const proposedIds = [...new Set(apps.map((e) => e.proposed_boxer?.fighter_id).filter(Boolean))];
    const proposed = proposedIds.map((id) => cands.get(id)).filter(Boolean);
    const cls = identityClass(perApp.map((a) => a.class));
    const unlockedNow = new Set(perApp.filter((a) => a.unlocks === 'bout_now').map((a) => a.entry_id)).size;
    const jointWith = [...new Set(perApp.filter((a) => a.opponent_review_item_id).map((a) => a.opponent_review_item_id))];
    const groups = [...new Set(perApp.map((a) => a.group_id).filter(Boolean))];
    rows.push({
      review_item_id: itemId, source_key: first.source_key, commission: first.evidence.commission ?? first.state, state: first.state, printed_name: first.appearance.display_name,
      class: cls,
      held_appearances: apps.length,
      decisions_required: groups.length ? groups.length + perApp.filter((a) => !a.group_id).length : apps.length,
      bouts_unlocked_by_this_identity_alone: unlockedNow,
      bouts_unlocked_with_other_held_identities: perApp.filter((a) => a.opponent_review_item_id).length,
      other_held_identities_in_those_bouts: jointWith.length,
      proposed_canonical_boxer: proposed.map((c) => ({ fighter_id: c.fighter_id, display_name: c.display_name, identity_state: c.identity_state, aliases: c.aliases,
        verified_prior_bouts: c.verified_bouts, hometowns: c.hometowns, jurisdictions: c.jurisdictions, resolver_tier: c.tier, confidence: c.confidence, name_level: c.name_level })),
      competing_candidates: [...cands.values()].filter((c) => !proposedIds.includes(c.fighter_id)).map((c) => `${c.display_name} [${c.tier ?? '-'}]`),
      place_evidence: [...new Set(perApp.map((a) => a.stated_place).filter(Boolean))],
      weights_lb: perApp.map((a) => a.weight_lb).filter((w) => w != null),
      evidence_for: tally(apps.flatMap((e) => (e.evidence.candidates ?? []).find((c) => c.fighter_id === e.proposed_boxer?.fighter_id)?.for ?? [])),
      evidence_against: tally([...apps.flatMap((e) => (e.evidence.contradictions ?? []).filter((x) => !/neutral/.test(x))), ...apps.flatMap((e) => e.danger.map((d) => `danger:${d.kind}`)),
        ...(apps.every((e) => !e.evidence.city_hometown.observed) ? ['no place printed on the sheet (cannot compare hometowns)'] : []),
        ...(proposed.some((c) => !c.verified_bouts) ? ['proposed boxer has no verified bout (created from another held-name appearance)'] : [])]),
      uncertainty: tally(apps.flatMap((e) => (e.evidence.contradictions ?? []).filter((x) => /neutral/.test(x)))),
      class_reasons: tally(perApp.map((a) => `${a.class}: ${a.class_why}`)),
      appearances: perApp,
      reviewer_decision: null, reviewer_note: null,
    });
  }
  rows.sort((x, y) => y.bouts_unlocked_by_this_identity_alone - x.bouts_unlocked_by_this_identity_alone
    || CLASS_ORDER[x.class] - CLASS_ORDER[y.class] || y.held_appearances - x.held_appearances || x.printed_name.localeCompare(y.printed_name));
  rows.forEach((r, i) => { r.rank = i + 1; });
  const sum = (xs, f) => xs.reduce((n, x) => n + f(x), 0);
  const bySource = {};
  for (const r of rows) {
    const s = (bySource[r.source_key] ??= { identities: 0, held_appearances: 0, decisions_required: 0, groups: 0, classes: { A: 0, B: 0, C: 0, D: 0 }, bouts_unlockable_now: 0 });
    s.identities += 1; s.held_appearances += r.held_appearances; s.decisions_required += r.decisions_required; s.classes[r.class] += 1; s.bouts_unlockable_now += r.bouts_unlocked_by_this_identity_alone;
  }
  for (const g of proposal.groups ?? []) if (bySource[g.source_key]) bySource[g.source_key].groups += 1;
  return assertMinimized({
    manifest_version: REVIEW_MANIFEST_VERSION, workbench_version: proposal.workbench_version, generated_at: now, sources,
    note: 'Advice for a named human reviewer. Nothing here is a decision; classes rank evidence, they never approve. Decisions are recorded only through identity-review.ps1 -Apply with -Reviewer.',
    summary: {
      identities: rows.length, held_appearances: sum(rows, (r) => r.held_appearances), decisions_required: sum(rows, (r) => r.decisions_required),
      grouped_identities: (proposal.groups ?? []).length,
      classes: rows.reduce((m, r) => ({ ...m, [r.class]: (m[r.class] ?? 0) + 1 }), {}),
      bouts_unlockable_by_single_identity: sum(rows, (r) => r.bouts_unlocked_by_this_identity_alone),
      by_source: bySource,
    },
    identities: rows,
  });
}

export function manifestMarkdown(m, { top = 25 } = {}) {
  const L = [`# Identity review manifest (${m.generated_at})`, '', `${m.manifest_version} over ${m.workbench_version}. ${m.note}`, '', '```', JSON.stringify(m.summary, null, 1), '```', '',
    `## Top ${top} by bouts one identity review unlocks`, '',
    '| # | Class | Printed name | Commission | Held appearances | Bouts unlocked alone | With other held identities | Proposed canonical boxer | Prior verified bouts | Resolver reason |',
    '|---:|:---:|---|---|---:|---:|---:|---|---:|---|'];
  for (const r of m.identities.slice(0, top)) {
    const p = r.proposed_canonical_boxer[0];
    L.push(`| ${r.rank} | ${r.class} | ${r.printed_name} | ${r.state} | ${r.held_appearances} | ${r.bouts_unlocked_by_this_identity_alone} | ${r.bouts_unlocked_with_other_held_identities} | ${p ? `${p.display_name} (${p.identity_state})` : 'none'} | ${p?.verified_prior_bouts ?? '-'} | ${tally(r.appearances.map((a) => a.resolver.reason ?? a.resolver.queue_reason)).join('; ')} |`);
  }
  for (const cls of ['A', 'B', 'C', 'D']) {
    const rows = m.identities.filter((r) => r.class === cls);
    L.push('', `## Class ${cls} (${rows.length})`, '');
    for (const r of rows.slice(0, cls === 'D' ? 40 : rows.length)) {
      const p = r.proposed_canonical_boxer[0];
      L.push(`### #${r.rank} ${r.printed_name} (${r.state})`, '',
        `- Proposed canonical boxer: ${p ? `${p.display_name} \`${p.fighter_id}\`; aliases: ${p.aliases.join(', ') || '-'}; verified prior bouts: ${p.verified_prior_bouts}; hometowns: ${p.hometowns.join(' / ') || '-'}; commissions: ${p.jurisdictions.join(', ') || '-'}` : 'none'}`,
        `- Competing candidates: ${r.competing_candidates.join('; ') || 'none'}`,
        `- Unlocks: ${r.bouts_unlocked_by_this_identity_alone} bout(s) alone; ${r.bouts_unlocked_with_other_held_identities} more only together with ${r.other_held_identities_in_those_bouts} other held identit${r.other_held_identities_in_those_bouts === 1 ? 'y' : 'ies'}; decisions required: ${r.decisions_required}`,
        `- Place evidence: ${r.place_evidence.join(' / ') || 'none printed'}; official weights: ${r.weights_lb.join(', ') || '-'}`,
        `- Evidence FOR: ${r.evidence_for.join(', ') || 'none beyond the name'}`,
        `- Evidence AGAINST: ${r.evidence_against.join(', ') || 'none'}`,
        `- Uncertainty: ${r.uncertainty.join(', ') || '-'}`,
        `- Class reasons: ${r.class_reasons.join(' | ')}`,
        '', '| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |', '|---|---|---:|---|---|---|:---:|---|',
        ...r.appearances.map((a) => `| ${a.event_date} ${a.event ?? ''} (corner ${a.side}) | ${a.source_url ? `[${a.document}](${a.source_url})` : a.document} | ${a.weight_lb ?? '-'} | ${a.opponent} | ${a.unlocks} | ${a.resolver.tier ?? '-'} ${a.resolver.reason ?? a.resolver.queue_reason ?? ''} | ${a.class} | ${a.in_batches.join(', ') || '-'} |`), '');
    }
    if (cls === 'D' && rows.length > 40) L.push(`(${rows.length - 40} more class D identities in the JSON manifest)`, '');
  }
  return L.join('\n');
}
