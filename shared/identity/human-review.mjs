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
import { cityLevelHometown, resolveAppearance } from './graph.mjs';
import { loadGraphCandidates } from './appearance.mjs';
import { normalizedAlias, parseName } from './normalize.mjs';
import { buildIndex, toIdentity } from './pipeline.mjs';
import { classifyCandidateBouts, historyLine } from './bout-history.mjs';

export const REVIEW_WORKBENCH_VERSION = 'boxing-identity-review-workbench@1.1.0';
export const COMMISSION_SOURCES = ['nsac_nevada', 'florida_athletic_commission', 'nj_sacb', 'mo_office_of_athletics', 'pa_state_athletic_commission', 'tn_athletic_commission'];
const STATE_OF = { nsac_nevada: 'NV', florida_athletic_commission: 'FL', nj_sacb: 'NJ', mo_office_of_athletics: 'MO', pa_state_athletic_commission: 'PA', tn_athletic_commission: 'TN' };
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

// Place consistency between stated hometowns of different granularity ("Puebla, MX" vs "Mexico" agree;
// "West Palm Beach, FL" vs "Colombia" do not). Advice only; the resolver never uses this.
const PLACE_ALIASES = {
  al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas', ca: 'california', co: 'colorado', ct: 'connecticut', de: 'delaware', dc: 'district of columbia',
  fl: 'florida', ga: 'georgia', hi: 'hawaii', id: 'idaho', il: 'illinois', in: 'indiana', ia: 'iowa', ks: 'kansas', ky: 'kentucky', la: 'louisiana', me: 'maine',
  md: 'maryland', ma: 'massachusetts', mi: 'michigan', mn: 'minnesota', ms: 'mississippi', mo: 'missouri', mt: 'montana', ne: 'nebraska', nv: 'nevada',
  nh: 'new hampshire', nj: 'new jersey', nm: 'new mexico', ny: 'new york', nc: 'north carolina', nd: 'north dakota', oh: 'ohio', ok: 'oklahoma', or: 'oregon',
  pa: 'pennsylvania', ri: 'rhode island', sc: 'south carolina', sd: 'south dakota', tn: 'tennessee', tx: 'texas', ut: 'utah', vt: 'vermont', va: 'virginia',
  wa: 'washington', wv: 'west virginia', wi: 'wisconsin', wy: 'wyoming', pr: 'puerto rico', mx: 'mexico', dr: 'dominican republic', usa: 'united states', us: 'united states',
};
const US_STATES = new Set(Object.values(PLACE_ALIASES).filter((v) => !['puerto rico', 'mexico', 'dominican republic', 'united states'].includes(v)));
const regionOf = (h) => {
  if (!h) return null;
  const parts = String(h).split(',').map((x) => normalizedAlias(x.replace(/\./g, ''))).filter(Boolean);
  const last = parts.at(-1);
  return last ? (PLACE_ALIASES[last] ?? last) : null;
};
export function placeConsistency(observed, candidateHometowns = []) {
  const o = regionOf(observed);
  const c = [...new Set(candidateHometowns.map(regionOf).filter(Boolean))];
  if (!o || !c.length) return { status: 'unknown', observed_region: o, candidate_regions: c };
  const same = c.includes(o) || (c.includes('united states') && US_STATES.has(o)) || (o === 'united states' && c.some((x) => US_STATES.has(x)));
  return { status: same ? 'consistent' : 'mismatch', observed_region: o, candidate_regions: c };
}

const surnameOf = (name) => parseName(name).last;
export function similarNamed(name, excludeId, nameIndex) {
  const o = parseName(name);
  return nameIndex.filter((f) => f.id !== excludeId && normalizedAlias(f.display_name) !== normalizedAlias(name)).filter((f) => {
    const c = parseName(f.display_name);
    return c.given && c.given === o.given && c.core.slice(1).some((t) => o.core.slice(1).includes(t));
  }).map((f) => `${f.display_name}${(f.hometowns ?? []).length ? ` (${f.hometowns.join(' / ')})` : ''}`).slice(0, 6);
}
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
    // relatives: same surname, different given name, and the same stated place (city when the sheet gives
    // one; otherwise the same region/country text). A common surname elsewhere is not a danger by itself.
    const region = observedHometown ? normalizedAlias(observedHometown) : null;
    const samePlace = (f) => (city ? (f.hometowns ?? []).map(cityLevelHometown).includes(city) : region && (f.hometowns ?? []).some((h) => normalizedAlias(h) === region));
    const relatives = nameIndex.filter((f) => f.id !== candidate?.fighter_id && surnameOf(f.display_name) === surname && givenOf(f.display_name) !== obs.given && samePlace(f));
    if (relatives.length) flags.push({ kind: city ? 'same_surname_same_city_different_given_name' : 'same_surname_same_region_different_given_name', detail: relatives.map((f) => f.display_name).slice(0, 6).join(' / ') });
  }
  if (candidate && !EXACT_FORMS.has(candidate.name_level)) flags.push({ kind: 'name_not_exact_form', detail: `${observedName} ~ ${candidate.display_name} (${candidate.name_level})` });
  if (candidate?.reasons_against?.includes('given_name_differs')) flags.push({ kind: 'given_name_differs', detail: `${observedName} vs ${candidate.display_name}` });
  const duplicates = (candidate?.bout_history ?? []).filter((h) => h.pairing === 'possible_duplicate_canonical_bout');
  if (duplicates.length) flags.push({ kind: 'candidate_record_has_possible_duplicate_bout', detail: duplicates.map((h) => `${h.date} vs ${h.opponent}: ${h.pairing_detail}`).join('; ') });
  if (surname) {
    const sharing = nameIndex.filter((f) => surnameOf(f.display_name) === surname).length;
    if (sharing >= 5) flags.push({ kind: 'common_surname', detail: `${sharing} canonical boxers share the surname "${surname}"` });
  }
  if (candidate) {
    const place = placeConsistency(observedHometown, candidate.hometowns ?? []);
    if (place.status === 'mismatch') flags.push({ kind: 'stated_place_mismatch', detail: `${observedHometown} (${place.observed_region}) vs ${place.candidate_regions.join(' / ')}` });
  }
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

// ---------------------------------------------------------------------------------------------------------------------
// Grouped review: several held appearances of ONE unresolved identity reviewed with one decision.
// A group forms only when every member shares the source, the exact normalized printed name and a stated place
// (city-level hometown, or the identical hometown text), proposes the same canonical boxer (or none), has no
// competing candidate and no danger flag that separates people (namesakes, relatives, suffixes, place mismatch),
// no two members fight on the same date, and official weights move by at most max(8 lb, 5%) between consecutive
// appearances. Similar names alone never group.
// ---------------------------------------------------------------------------------------------------------------------
const SEPARATING_FLAGS = new Set(['same_name_multiple_canonical_boxers', 'same_surname_same_city_different_given_name', 'same_surname_same_region_different_given_name',
  'generational_suffix', 'stated_place_mismatch', 'given_name_differs', 'name_not_exact_form']);
const placeKey = (e) => e.evidence.city_hometown.observed_city_level ?? (e.evidence.city_hometown.observed ? `text:${normalizedAlias(e.evidence.city_hometown.observed)}` : null);
export function groupEntries(entries) {
  const buckets = new Map();
  for (const e of entries) {
    const place = placeKey(e);
    if (!place) continue;
    if (e.danger.some((d) => SEPARATING_FLAGS.has(d.kind)) || (e.evidence.competing_candidates ?? []).length) continue;
    const key = [e.source_key, normalizedAlias(e.appearance.display_name), place, e.proposed_boxer?.fighter_id ?? 'none'].join('|');
    buckets.set(key, [...(buckets.get(key) ?? []), e]);
  }
  const groups = [];
  for (const [key, members] of buckets) {
    if (members.length < 2) continue;
    const byDate = [...members].sort((x, y) => String(x.evidence.event_date).localeCompare(String(y.evidence.event_date)) || x.entry_id.localeCompare(y.entry_id));
    const dates = byDate.map((m) => m.evidence.event_date);
    if (dates.some((d) => !d) || new Set(dates).size !== dates.length) continue;
    const weights = byDate.map((m) => m.evidence.weight.official_lb).filter((w) => w != null);
    const weightsOk = weights.every((w, i) => i === 0 || Math.abs(w - weights[i - 1]) <= Math.max(8, weights[i - 1] * 0.05));
    if (!weightsOk) continue;
    groups.push({
      group_id: `G:${key}`, source_key: byDate[0].source_key, state: byDate[0].state, display_name: byDate[0].appearance.display_name,
      stated_place: byDate[0].evidence.city_hometown.observed, proposed_boxer: byDate[0].proposed_boxer,
      members: byDate.map((m) => m.entry_id),
      basis: `same source, exact normalized name, same stated place, ${byDate[0].proposed_boxer ? 'same proposed boxer' : 'no canonical candidate'}, no competing candidate or separating danger flag, distinct dates (${dates.join(', ')}), weights ${weights.join(' -> ') || 'not printed'}`,
      // filled in by the human reviewer: approve_match | approve_distinct (one new boxer for all members) | hold | reject_candidate
      reviewer_decision: null, reviewer_note: null,
    });
  }
  return groups;
}

// report: buildIdentityReviewReport output; returns proposals for every pending appearance, ranked
// sources: optional commission source keys to review (e.g. Missouri and Pennsylvania only)
export async function proposeReviewBatch(store, report, { batchId, size = 10, now = new Date().toISOString(), sources = null } = {}) {
  const nameIndex = await store.fighterNameIndex();
  const blocked = await blockedBoutsByState(store);
  const boutsBySource = new Map();
  for (const s of COMMISSION_SOURCES) boutsBySource.set(s, new Map((await storedBouts(store, s)).map((x) => [x.bout.source_bout_id, x])));
  const entries = [];
  for (const item of report.items) {
    if (sources && !sources.includes(item.source_key)) continue;
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
          source_url: stored?.bout?.source_url ?? null, jurisdiction: ctx.jurisdiction ?? STATE_OF[item.source_key],
          // why it waits: the queue reason and the resolver's own stop reason, verbatim
          held_reason: { queue_reason: item.review_reason, resolver: a.proposal?.reason ?? null, resolver_tier: a.proposal?.tier ?? null },
          birthdate_policy: { note: 'not collected: dates of birth are never stored (data minimization policy)' },
          weight_class: contract.weight_class_key ?? null,
          candidates: (a.candidates ?? []).map((c) => ({ fighter_id: c.fighter_id, display_name: c.display_name, identity_state: c.identity_state, tier: c.tier, confidence: c.confidence,
            name_level: c.name_level, aliases: c.aliases ?? [], hometowns: c.hometowns ?? [], jurisdictions: c.jurisdictions ?? [], verified_bouts: (c.bout_history ?? []).length,
            for: c.reasons_for ?? [], against: c.reasons_against ?? [] })),
          normalized_name: { observed: normalizedAlias(item.raw_name), candidate: top ? normalizedAlias(top.display_name) : null, name_level: top?.name_level ?? null },
          city_hometown: { observed: ctx.stated_hometown, observed_city_level: cityLevelHometown(ctx.stated_hometown), candidate: top?.hometowns ?? [],
            candidate_city_level: (top?.hometowns ?? []).map(cityLevelHometown).filter(Boolean) },
          weight: { official_lb: ctx.weight_lb, contracted_lb: contract.contracted_weight_lb ?? null, division_printed: stored?.bout?.division_raw ?? null,
            candidate_weights: top?.weights_lb ?? [] },
          commission: ctx.commission, venue: ctx.venue, event: ctx.event, event_date: ctx.event_date, opponent: ctx.opponent,
          relationship: (top?.reasons_for ?? []).filter((r) => /rematch|same_fight|same_venue|same_commission/.test(r)),
          candidate_record: top?.bout_history ?? [],
          appearance_bout: { source_bout_id: a.bout, repeat_index: ctx.repeat_index ?? 1, bout_order: ctx.bout_order ?? null },
          contradictions: top?.reasons_against ?? [],
          // other canonical boxers sharing the given name and at least one more name token (double surnames,
          // cousins, namesakes): shown to the reviewer, never used to decide
          similar_named_other_boxers: similarNamed(stored?.bout?.[`fighter_${a.side}`]?.display_name ?? item.raw_name, top?.fighter_id, nameIndex),
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
  // a batch never splits a group: when a member is selected, every member comes along
  const allGroups = groupEntries(entries);
  const groupOf = new Map(allGroups.flatMap((g) => g.members.map((m) => [m, g])));
  const selected = new Set();
  for (const e of entries) {
    if (selected.size >= size) break;
    for (const id of groupOf.get(e.entry_id)?.members ?? [e.entry_id]) selected.add(id);
  }
  const batch = entries.filter((e) => selected.has(e.entry_id)).map((e) => ({ ...e, group_id: groupOf.get(e.entry_id)?.group_id ?? null }));
  const groups = allGroups.filter((g) => g.members.every((m) => selected.has(m)));
  const summary = {
    groups_in_batch: groups.length, grouped_entries_in_batch: groups.reduce((n, g) => n + g.members.length, 0), groupable_identities_in_queue: allGroups.length,
    pending_items: report.summary.pending_items, pending_appearances: entries.length,
    unlock_now: entries.filter((e) => e.unlocks_bout_now).length,
    recommendations: entries.reduce((m, e) => ({ ...m, [e.recommendation]: (m[e.recommendation] ?? 0) + 1 }), {}),
    danger_cases: entries.filter((e) => e.danger.length).length,
    blocked_bouts: blocked,
  };
  return assertMinimized({ workbench_version: REVIEW_WORKBENCH_VERSION, batch_id: batchId, generated_at: now, sources, summary, groups, batch, remaining: entries.filter((e) => !selected.has(e.entry_id)).map((e) => ({
    entry_id: e.entry_id, name: e.appearance.display_name, state: e.state, event_date: e.evidence.event_date, unlocks_bout_now: e.unlocks_bout_now,
    recommendation: e.recommendation, danger: e.danger.map((d) => d.kind) })) });
}

export function batchMarkdown(p) {
  const L = [`# Identity review batch ${p.batch_id}`, '', `Generated ${p.generated_at} by ${p.workbench_version}. **Nothing has been applied.** Each entry needs a named human reviewer's decision and note.`, '',
    '```', JSON.stringify(p.summary, null, 1), '```', ''];
  L.push('## Grouped identities (one decision covers every member)', '');
  L.push((p.groups ?? []).length ? p.groups.map((g) => `- **${g.display_name}** (${g.state}, ${g.stated_place ?? '-'}) -> ${g.proposed_boxer ? `proposed ${g.proposed_boxer.display_name}` : 'no canonical candidate'}; ${g.members.length} appearances. Basis: ${g.basis}`).join('\n') : '- none', '');
  const dangers = p.batch.filter((e) => e.danger.length);
  L.push('## Sibling / twin / same-name danger cases in this batch', '');
  L.push(dangers.length ? dangers.map((e) => `- **${e.appearance.display_name}** (${e.state}, ${e.evidence.event_date}): ${e.danger.map((d) => `${d.kind} [${d.detail}]`).join('; ')}`).join('\n') : '- none', '');
  for (const e of p.batch) {
    const ev = e.evidence;
    L.push(`## ${e.entry_id}`, '',
      `| | |`, `|---|---|`,
      `| Source appearance | "${e.appearance.printed_name}" (${e.state}), corner ${e.appearance.side}, ${ev.event_date}, ${ev.event ?? ''}; document \`${e.appearance.document}\`${ev.source_url ? ` ([official document](${ev.source_url}))` : ''} |`,
      ...(e.group_id ? [`| Group | \`${e.group_id}\` (decided once for all members) |`] : []),
      ...(ev.held_reason ? [`| Why held | queue: ${ev.held_reason.queue_reason ?? '-'}; resolver: ${ev.held_reason.resolver ?? '-'} |`] : []),
      ...(ev.candidates ? [`| All candidates | ${ev.candidates.map((c) => `${c.display_name} [${c.tier ?? '-'}, ${c.confidence ?? '-'}; ${c.verified_bouts} bouts; aliases: ${c.aliases.join(', ') || '-'}]`).join('<br>') || 'none'} |`] : []),
      ...(ev.weight_class !== undefined ? [`| Weight class / DOB | ${ev.weight_class ?? 'not derivable from the sheet'} / ${ev.birthdate_policy?.note ?? '-'} |`] : []),
      `| Proposed canonical boxer | ${e.proposed_boxer ? `${e.proposed_boxer.display_name} (\`${e.proposed_boxer.fighter_id}\`, resolver tier ${e.proposed_boxer.tier_by_resolver})` : 'none'} |`,
      `| Normalized name | ${ev.normalized_name.observed} ~ ${ev.normalized_name.candidate ?? '-'} (${ev.normalized_name.name_level ?? '-'}) |`,
      `| City-level hometown | observed: ${ev.city_hometown.observed ?? '-'} (${ev.city_hometown.observed_city_level ?? 'not city-level'}); candidate: ${ev.city_hometown.candidate.join(' / ') || '-'} |`,
      `| Official / contracted weight | ${ev.weight.official_lb ?? '-'} lb / ${ev.weight.contracted_lb ?? '-'}${ev.weight.division_printed ? ` (${ev.weight.division_printed})` : ''}; candidate weights: ${ev.weight.candidate_weights.map((w) => `${w.weight_lb} (${w.date})`).join(', ') || '-'} |`,
      `| Commission / venue | ${ev.commission ?? '-'} / ${ev.venue ?? '-'} |`,
      `| Opponent | ${ev.opponent}${e.unlocks_bout_now ? ' (already resolved: approving unlocks this bout)' : ' (unresolved: the bout needs both corners)'} |`,
      `| Relationship evidence | ${ev.relationship.join(', ') || '-'} |`,
      `| This appearance | source bout \`${ev.appearance_bout?.source_bout_id ?? '-'}\`, repeat index ${ev.appearance_bout?.repeat_index ?? 1}, sheet order ${ev.appearance_bout?.bout_order ?? '?'} |`,
      `| Candidate record | ${ev.candidate_record.map(historyLine).join('<br>') || '-'} |`,
      `| Contradictions | ${ev.contradictions.join(', ') || 'none'} |`,
      `| Similar-named other boxers | ${ev.similar_named_other_boxers.join('; ') || 'none'} |`,
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
  // group decisions expand onto their members; a member may not also carry its own decision
  const entryById = new Map(batch.batch.map((e) => [e.entry_id, e]));
  const groupCreated = new Map();
  const groupContext = new Map();
  for (const g of batch.groups ?? []) {
    if (!g.reviewer_decision) continue;
    if (!REVIEWER_DECISIONS.has(g.reviewer_decision)) throw new Error(`${g.group_id}: unknown reviewer_decision ${g.reviewer_decision}`);
    if (!g.reviewer_note || g.reviewer_note.trim().length < 20) throw new Error(`${g.group_id}: reviewer_note (20+ characters) is required`);
    const members = g.members.map((id) => entryById.get(id));
    if (members.some((m) => !m)) throw new Error(`${g.group_id}: a member is missing from the batch`);
    if (members.some((m) => m.reviewer_decision)) throw new Error(`${g.group_id}: a member also carries its own decision; decide the group OR its entries`);
    if (members.some((m) => (m.proposed_boxer?.fighter_id ?? null) !== (g.proposed_boxer?.fighter_id ?? null))) throw new Error(`${g.group_id}: members propose different boxers`);
    for (const m of members) groupContext.set(m.entry_id, g);
  }
  const ordered = [...batch.batch].sort((x, y) => {
    const gx = groupContext.get(x.entry_id); const gy = groupContext.get(y.entry_id);
    return (gx && gy && gx === gy) ? gx.members.indexOf(x.entry_id) - gx.members.indexOf(y.entry_id) : 0;
  });
  for (const e0 of ordered) {
    const g = groupContext.get(e0.entry_id);
    const e = g ? { ...e0, reviewer_decision: g.reviewer_decision, reviewer_note: g.reviewer_note } : e0;
    if (!e.reviewer_decision) { results.push({ entry_id: e.entry_id, status: 'not_reviewed' }); continue; }
    if (!REVIEWER_DECISIONS.has(e.reviewer_decision)) throw new Error(`${e.entry_id}: unknown reviewer_decision ${e.reviewer_decision}`);
    if (!e.reviewer_note || e.reviewer_note.trim().length < 20) throw new Error(`${e.entry_id}: reviewer_note (20+ characters) is required`);
    if (e.reviewer_decision === 'approve_match' && !e.proposed_boxer?.fighter_id) throw new Error(`${e.entry_id}: no proposed boxer to match`);
    let decision = { approve_match: 'matched', approve_distinct: 'created', hold: 'review', reject_candidate: 'review' }[e.reviewer_decision];
    // one new boxer per group: the earliest member creates it, later members are matched to it
    let groupFighter = null;
    if (g && decision === 'created' && groupCreated.has(g.group_id)) { decision = 'matched'; groupFighter = groupCreated.get(g.group_id); }
    // the reviewed evidence described a BLOCKED bout; if that bout became canonical since, the evidence is stale
    if (decision !== 'review') {
      const boutNs = e.appearance.namespace.replace(/\.fighter$/, '.bout');
      const existing = (await store.boutsForProviderEvents(boutNs, [e.appearance.bout_external_id]))[e.appearance.bout_external_id];
      if (existing) { results.push({ entry_id: e.entry_id, status: 'refused_bout_already_canonical', bout_id: existing }); continue; }
    }
    const evidence = { shown_to_reviewer: e.evidence, danger: e.danger, workbench_recommendation: { recommendation: e.recommendation, why: e.recommendation_why },
      reviewer_decision: e.reviewer_decision, rejected_candidate: e.reviewer_decision === 'reject_candidate' ? e.proposed_boxer : null, workbench_version: batch.workbench_version,
      ...(g ? { group: { group_id: g.group_id, members: g.members, basis: g.basis, ...(groupFighter ? { matched_to_boxer_created_by_this_group: groupFighter } : {}) } } : {}) };
    const r = await store.recordAppearanceDecision({
      source_key: e.source_key, namespace: e.appearance.namespace, bout_external_id: e.appearance.bout_external_id, side: e.appearance.side,
      observed_name: e.appearance.display_name, hometown: e.evidence.city_hometown.observed ?? null, decision, tier: 'C',
      fighter_id: decision === 'matched' ? (groupFighter ?? e.proposed_boxer.fighter_id) : null, confidence: 100, evidence, evidence_hash: await contentHash(evidence),
      resolver_version: `human-review:${batch.workbench_version}`, decided_by: `reviewer:${reviewer}`, reviewer, reviewed_at: reviewedAt,
      review_note: e.reviewer_note, review_batch: batch.batch_id, supersedes_seq: e.appearance.latest_decision_seq,
      index: buildIndex(toIdentity({ display_name: e.appearance.display_name }, e.appearance.namespace), { evidence: { nameLevel: 'exact' } }),
    });
    if (g && decision === 'created' && r.fighter_id) groupCreated.set(g.group_id, r.fighter_id);
    results.push({ entry_id: e.entry_id, status: r.status, decision, decision_seq: r.decision_seq, review_items_closed: r.review_items_closed, ...(g ? { group_id: g.group_id } : {}) });
  }
  return results;
}

// What the automatic graph resolver WOULD do now, simulated over the BLOCKED official bouts
// (stored sheet bouts with no canonical bout). Read-only; nothing is recorded.
//   * a bout that already exists is not blocked and is never listed
//   * a corner counts as resolved exactly as card application resolves it: a recorded
//     appearance binding, the name resolver's automatic outcome, or the same name + stated
//     hometown already resolved on the same card document (repeat pairings)
//   * only still-unresolved corners go to the unchanged graph resolver
export async function simulateResolverOnBlockedBouts(store, { batchId, now = new Date().toISOString() } = {}) {
  const proposals = [];
  const blockedBouts = [];
  for (const sourceKey of COMMISSION_SOURCES) {
    const ns = COMMISSION_NAMESPACES[sourceKey];
    const stored = await storedBouts(store, sourceKey);
    const ids = stored.map((x) => x.bout.source_bout_id);
    const mapped = ids.length ? await store.boutsForProviderEvents(`${ns}.bout`, ids) : {};
    const blocked = stored.filter((x) => !mapped[x.bout.source_bout_id]);
    if (!blocked.length) continue;
    const byDoc = new Map();
    for (const x of stored) byDoc.set(x.doc_key, [...(byDoc.get(x.doc_key) ?? []), x]);
    const docKeysNeeded = [...new Set(blocked.map((x) => x.doc_key))];
    const cornerFighters = {};
    const bindings = {};
    for (const docKey of docKeysNeeded) {
      const bouts = byDoc.get(docKey).map((x) => x.bout.source_bout_id);
      Object.assign(cornerFighters, await store.sourceCornerFighters(sourceKey, `${ns}.fighter`, bouts));
      Object.assign(bindings, await store.appearanceBindings(`${ns}.fighter`, bouts.flatMap((id) => [`${id}|a`, `${id}|b`])));
    }
    const eventIds = await store.sourceEventIds(`${ns}.event`, [...new Set(blocked.map((x) => x.bout.source_event_id))]);
    for (const x of blocked) {
      const b = x.bout;
      const card = byDoc.get(x.doc_key);
      // mirrors card application exactly: a recorded binding resolves its own corner only; the
      // same-card name+hometown cache is fed by name-resolver outcomes on EARLIER bouts of the card
      // (a binding does not feed it)
      const position = card.findIndex((y) => y.bout.source_bout_id === b.source_bout_id);
      const sameCardResolved = (f) => {
        if (!f?.hometown) return null;
        const key = `${normalizedAlias(f.display_name)}|${normalizedAlias(f.hometown)}`;
        for (const y of card.slice(0, position)) {
          for (const s of ['a', 'b']) {
            const g = y.bout[`fighter_${s}`];
            const k = `${y.bout.source_bout_id}|${s}`;
            const id = bindings[k] ? null : cornerFighters[k];
            if (id && g?.hometown && `${normalizedAlias(g.display_name)}|${normalizedAlias(g.hometown)}` === key) return id;
          }
        }
        return null;
      };
      const corner = {};
      for (const s of ['a', 'b']) {
        const f = b[`fighter_${s}`];
        const k = `${b.source_bout_id}|${s}`;
        const bound = bindings[k]?.fighter_id ?? null;
        const automatic = bound ? null : cornerFighters[k] ?? null;
        const cached = bound || automatic ? null : sameCardResolved(f);
        corner[s] = { fighter_id: bound ?? automatic ?? cached, via: bound ? 'recorded_binding' : automatic ? 'name_resolver_outcome' : cached ? 'same_card_name_and_hometown' : null, name: f.display_name };
      }
      const ev = eventIds[b.source_event_id] ?? null;
      const sides = [];
      for (const s of ['a', 'b']) {
        if (corner[s].fighter_id) continue;
        const other = s === 'a' ? 'b' : 'a';
        const f = b[`fighter_${s}`];
        const app = { namespace: `${ns}.fighter`, bout_external_id: b.source_bout_id, bout_order: b.bout_order ?? null, display_name: f.display_name, hometown: f.hometown ?? null, weight_lb: f.weight_lb ?? null, debut: b.debut?.[s] ?? null,
          event: { event_id: ev?.event_id ?? null, date: x.event?.event_date ?? null, commission: ev?.commission ?? null, venue_id: ev?.venue_id ?? null },
          opponent: { display_name: b[`fighter_${other}`].display_name, fighter_id: corner[other].fighter_id } };
        const candidates = await loadGraphCandidates(store, f.display_name, `${ns}.fighter`);
        const r = resolveAppearance(app, candidates, { allowCreate: true });
        const top = r.candidates?.find((c) => c.fighter_id === r.fighter_id) ?? r.candidates?.[0] ?? null;
        sides.push({ side: s, would: r.decision, tier: r.tier ?? null });
        if (['matched', 'created'].includes(r.decision)) {
          proposals.push({
            source_key: sourceKey, state: STATE_OF[sourceKey], document: x.doc_key, appearance_key: `${b.source_bout_id}|${s}`, bout_external_id: b.source_bout_id, side: s,
            name: f.display_name, event_date: app.event.date, event: ev?.name ?? null, venue: ev?.venue ?? null, commission: app.event.commission,
            opponent: app.opponent.display_name, opponent_resolved_via: corner[other].via,
            stated_hometown: app.hometown, weight_lb: app.weight_lb,
            would: { decision: r.decision, tier: r.tier, confidence: r.confidence, reason: r.reason, fighter_id: r.fighter_id ?? null, display_name: r.decision === 'created' ? null : top?.display_name ?? null },
            evidence_for: top?.support ?? [], evidence_against: top?.against ?? [], families: top?.families ?? [],
            competing: (r.candidates ?? []).filter((c) => c.fighter_id !== r.fighter_id && c.tier).map((c) => `${c.display_name} [${c.tier}]`),
            appearance_bout: { source_bout_id: b.source_bout_id, repeat_index: Number((String(b.source_bout_id).match(/\|(\d+)$/) ?? [])[1] ?? 1), bout_order: b.bout_order ?? null },
            candidate_record: classifyCandidateBouts(candidates.find((c) => c.id === r.fighter_id)?.bouts ?? []),
          });
        }
      }
      blockedBouts.push({ source_key: sourceKey, bout_external_id: b.source_bout_id, corner, sides });
    }
  }
  return summarizeDryRun({ batchId, now, proposals, blockedBouts });
}

// Pure: which blocked bouts would become canonical if every proposal were applied.
export function summarizeDryRun({ batchId, now, proposals, blockedBouts }) {
  const proposed = new Set(proposals.map((p) => p.appearance_key));
  const wouldCreate = [];
  for (const bb of blockedBouts) {
    const ok = ['a', 'b'].every((s) => bb.corner[s].fighter_id || proposed.has(`${bb.bout_external_id}|${s}`));
    if (ok) wouldCreate.push(`${bb.source_key}:${bb.bout_external_id}`);
  }
  const creates = new Set(wouldCreate);
  for (const p of proposals) {
    p.bout_would_be_created = creates.has(`${p.source_key}:${p.bout_external_id}`);
    const otherKey = `${p.bout_external_id}|${p.side === 'a' ? 'b' : 'a'}`;
    p.depends_on_other_proposal = proposed.has(otherKey) ? otherKey : null;
  }
  const count = (list, f) => list.reduce((m, x) => ({ ...m, [f(x)]: (m[f(x)] ?? 0) + 1 }), {});
  return assertMinimized({
    dry_run: true, applied: false, batch_id: batchId, generated_at: now,
    summary: {
      blocked_bouts_examined: blockedBouts.length,
      appearances_that_would_bind: proposals.length, by_tier: count(proposals, (p) => `${p.would.tier}:${p.would.decision}`), by_state: count(proposals, (p) => p.state),
      bouts_that_would_be_created: creates.size, bouts_by_state: count([...creates], (k) => STATE_OF[k.split(':')[0]]),
    },
    proposals: proposals.sort((x, y) => String(x.event_date).localeCompare(String(y.event_date)) || x.appearance_key.localeCompare(y.appearance_key)),
    bouts_that_would_be_created: blockedBouts.filter((bb) => creates.has(`${bb.source_key}:${bb.bout_external_id}`)).map((bb) => ({
      source_key: bb.source_key, bout_external_id: bb.bout_external_id,
      corners: Object.fromEntries(['a', 'b'].map((s) => [s, { name: bb.corner[s].name, fighter_id: bb.corner[s].fighter_id, via: bb.corner[s].via ?? (proposed.has(`${bb.bout_external_id}|${s}`) ? 'proposed_in_this_dry_run' : null) }])),
    })),
  });
}

export function dryRunMarkdown(d) {
  const L = [`# Resolver dry run ${d.batch_id} (NOT applied)`, '',
    `Generated ${d.generated_at}. Decisions the unchanged Tier A/B/D graph resolver WOULD make now on blocked official bouts. Nothing was recorded; review them as a batch.`, '',
    '```', JSON.stringify(d.summary, null, 1), '```', ''];
  for (const p of d.proposals) {
    L.push(`## ${p.name}: ${p.state} ${p.event_date} vs ${p.opponent}`, '', '| | |', '|---|---|',
      `| Appearance | \`${p.appearance_key}\` (${p.event ?? ''}; ${p.venue ?? '-'}); document \`${p.document}\` |`,
      `| Would | **Tier ${p.would.tier} ${p.would.decision}** -> ${p.would.display_name ?? 'new boxer'} (\`${p.would.fighter_id ?? '-'}\`), confidence ${p.would.confidence} |`,
      `| Resolver reason | ${p.would.reason} |`,
      `| Stated hometown / official weight | ${p.stated_hometown ?? '-'} / ${p.weight_lb ?? '-'} lb |`,
      `| Evidence for | ${p.evidence_for.join(', ') || '-'} |`,
      `| Evidence against | ${p.evidence_against.join(', ') || 'none'} |`,
      `| This appearance | source bout \`${p.appearance_bout.source_bout_id}\`, repeat index ${p.appearance_bout.repeat_index}, sheet order ${p.appearance_bout.bout_order ?? '?'} |`,
      `| Candidate record | ${p.candidate_record.map(historyLine).join('<br>') || '-'} |`,
      `| Competing candidates | ${p.competing.join('; ') || 'none'} |`,
      `| Opponent | ${p.opponent} (${p.opponent_resolved_via ? `resolved: ${p.opponent_resolved_via}` : p.depends_on_other_proposal ? 'also proposed in this dry run' : 'unresolved'}) |`,
      `| Bout impact | ${p.bout_would_be_created ? 'the official bout would be created' : 'no bout (the other corner stays unresolved)'} |`, '');
  }
  return L.join('\n');
}

// Turns resolver dry-run proposals into a human review batch (same entry shape as
// proposeReviewBatch, so applyApprovedBatch records it). Nothing is decided: every
// entry starts with reviewer_decision null.
export async function batchFromDryRun(store, dry, { batchId, now = new Date().toISOString() } = {}) {
  const nameIndex = await store.fighterNameIndex();
  const entries = [];
  for (const p of dry.proposals) {
    if (p.would.decision !== 'matched') continue;
    const ns = `${COMMISSION_NAMESPACES[p.source_key]}.fighter`;
    const latest = (await store.appearanceLatest(ns, [p.appearance_key]))[p.appearance_key] ?? null;
    const candidate = { fighter_id: p.would.fighter_id, display_name: p.would.display_name, name_level: p.evidence_for.find((x) => x.startsWith('name_'))?.slice(5) ?? null,
      hometowns: [], reasons_against: p.evidence_against, bout_history: p.candidate_record };
    const flags = dangerFlags({ observedName: p.name, observedHometown: p.stated_hometown, candidate, nameIndex })
      .filter((f) => f.kind !== 'stated_place_mismatch' || p.evidence_for.some((x) => x.startsWith('hometown_')));
    entries.push({
      entry_id: `${batchId}:${p.source_key}:${p.appearance_key}`, review_item_id: null, source_key: p.source_key, state: p.state,
      appearance: { namespace: ns, bout_external_id: p.bout_external_id, side: p.side, printed_name: p.name, display_name: p.name, document: p.document,
        latest_decision_seq: latest?.seq ?? null },
      unlocks_bout_now: p.bout_would_be_created,
      evidence: {
        normalized_name: { observed: normalizedAlias(p.name), candidate: p.would.display_name ? normalizedAlias(p.would.display_name) : null, name_level: candidate.name_level },
        city_hometown: { observed: p.stated_hometown, observed_city_level: cityLevelHometown(p.stated_hometown), candidate: [], candidate_city_level: [] },
        weight: { official_lb: p.weight_lb, contracted_lb: null, division_printed: null, candidate_weights: [] },
        commission: p.commission, venue: p.venue, event: p.event, event_date: p.event_date, opponent: p.opponent,
        opponent_resolved_via: p.opponent_resolved_via, appearance_bout: p.appearance_bout,
        relationship: p.evidence_for.filter((r) => /repeat_pairing|same_fight|rematch|same_venue|same_commission/.test(r)),
        candidate_record: p.candidate_record, contradictions: p.evidence_against, competing_candidates: p.competing,
        similar_named_other_boxers: similarNamed(p.name, p.would.fighter_id, nameIndex),
        confidence: p.would.confidence, resolver_tier: p.would.tier, resolver_reason: p.would.reason, resolver_stop_reason: null,
      },
      proposed_boxer: { fighter_id: p.would.fighter_id, display_name: p.would.display_name, tier_by_resolver: p.would.tier },
      danger: flags,
      recommendation: flags.length ? 'hold' : 'match', recommendation_why: flags.length ? `danger case: ${flags.map((f) => f.kind).join(', ')}` : `resolver ${p.would.tier} ${p.would.reason}; no competing candidate or contradiction`,
      reviewer_decision: null, reviewer_note: null,
    });
  }
  return assertMinimized({ workbench_version: REVIEW_WORKBENCH_VERSION, batch_id: batchId, generated_at: now, source: `resolver dry run ${dry.batch_id} (${dry.generated_at})`,
    summary: { entries: entries.length, bouts_that_would_be_created: dry.summary.bouts_that_would_be_created, danger_cases: entries.filter((e) => e.danger.length).length },
    batch: entries, remaining: [] });
}
