// Officials cleanup planner (pure). Input: the read-only evidence of
// public.boxing_official_cleanup_evidence() (scripts/officials/cleanup-evidence.sql), optionally
// with simulated parses of the same official documents by the current parsers. Output: a plan that
// sorts every duplicate / malformed-official candidate into
//
//   A  deterministic parser artifact — "& Cory Santos" where a corrected parse of the SAME stored
//      document names "Cory Santos" at the same bout, role and judge slot (scorecard slot agrees),
//      the correction is exactly the known bug (leading "& " removed) and nothing contradicts it.
//      Only A is ever applied, and only with STORED (not simulated) corrected parses: the database
//      re-verifies the evidence (boxing_apply_official_canonicalization).
//   B  probable same official (strong but not a parser artifact, e.g. "Steve"/"Steven Weisfeld") — review
//   C  ambiguous (a surname alone, e.g. "Cheek" / "Eric Cheek") — review, never merged on surname
//   D  distinct (different officials who share a surname) — left untouched
//
// Nothing here writes. A rename keeps every row where it is; a merge re-points nothing (reads resolve
// merged officials through boxing_canonical_official_id).

import { compareNames } from './evidence.mjs';
import { nameKeys, normalizedAlias, parseName } from './normalize.mjs';

export const OFFICIAL_CLEANUP_VERSION = 'boxing-official-cleanup@1.0.0';
const ACTIVE = new Set(['assigned', 'worked']);

// "& Cory Santos" -> "Cory Santos". The artifact is leading non-letter characters and nothing else
// (same rule as the database: regexp_replace(name, '^[^[:alpha:]]+', '')).
export function artifactCorrection(name) {
  const raw = String(name ?? '').trim();
  const fixed = raw.replace(/^[^\p{L}]+/u, '').trim();
  return fixed && fixed !== raw ? fixed : null;
}

// One name token after normalization ("Cheek").
export function isSurnameOnly(name) {
  return parseName(name).core.length === 1;
}

function lastToken(name) {
  const core = parseName(name).core;
  return core.length ? core[core.length - 1] : null;
}

// "Steve"/"Steven", "Max De Luca"/"Max DeLuca", "Patrica"/"Patricia": a spelling variant of a full name.
function variantLevel(a, b) {
  const pa = parseName(a);
  const pb = parseName(b);
  if (pa.core.length < 2 || pb.core.length < 2) return null;
  const level = compareNames(a, b).level;
  if (level !== 'none') return level;
  if (pa.joined === pb.joined) return 'joined';
  const [fa, la] = [pa.core[0], pa.core[pa.core.length - 1]];
  const [fb, lb] = [pb.core[0], pb.core[pb.core.length - 1]];
  if (la === lb && fa !== fb && (fa.startsWith(fb) || fb.startsWith(fa))) return 'first_name_variant';
  if (fa === fb && la === lb) return 'middle_name_variant';
  const oneEdit = (x, y) => {
    if (Math.abs(x.length - y.length) > 1 || x === y) return false;
    let i = 0; while (i < Math.min(x.length, y.length) && x[i] === y[i]) i++;
    return x.slice(i + (x.length >= y.length ? 1 : 0)) === y.slice(i + (y.length >= x.length ? 1 : 0));
  };
  if (pa.core.length === pb.core.length && pa.core.every((t, i) => t === pb.core[i] || oneEdit(t, pb.core[i]))) return 'one_letter_spelling';
  // "Prof. Daniel Torres" / "Daniel Torres": every token of the shorter name, surname included, is in the longer
  const [small, large] = pa.core.length <= pb.core.length ? [pa, pb] : [pb, pa];
  if (la === lb && small.core.length >= 2 && small.core.every((t) => large.core.includes(t))) return 'token_containment';
  // "James (Ged) O'Connor" / "Ged O'Connor": a stated nickname used as the first name
  const nick = (x) => (x.nicknames ?? []).map((n) => parseName(n).core.join(' '));
  if (la === lb && (nick(pa).includes(fb) || nick(pb).includes(fa))) return 'nickname_as_first_name';
  return null;
}

function indexParses(parses) {
  const byDoc = new Map();
  for (const p of parses ?? []) {
    const bouts = new Map();
    for (const b of p.bouts ?? []) {
      bouts.set(b.source_bout_id, { referee: b.referee ?? null, judges: new Map((b.judges ?? []).map((j) => [Number(j.slot), j.name ?? null])) });
    }
    const rec = { ...p, bouts };
    if (!byDoc.has(p.doc_key)) byDoc.set(p.doc_key, []);
    byDoc.get(p.doc_key).push(rec);
  }
  for (const list of byDoc.values()) list.sort((x, y) => (x.simulated === y.simulated ? String(x.observed_at).localeCompare(String(y.observed_at)) : x.simulated ? 1 : -1));
  return byDoc;
}

function nameAt(parse, sourceBoutIds, role, slot) {
  for (const id of sourceBoutIds ?? []) {
    const b = parse.bouts.get(id);
    if (!b) continue;
    return role === 'referee' ? b.referee : b.judges.get(Number(slot)) ?? null;
  }
  return undefined; // this parse does not contain the bout
}

// Continuity of one active assignment of an artifact-named official across parses of its document.
export function assignmentContinuity(official, corrected, a, byDoc) {
  const base = { bout_id: a.bout_id, role: a.role, slot: a.slot ?? null, event_date: a.event_date, event_name: a.event_name, commission: a.commission,
    scorecards: a.scorecards ?? 0, scorecard_slot: a.scorecard_slot ?? null };
  if (a.role === 'judge' && a.scorecard_slot != null && a.slot != null && Number(a.scorecard_slot) !== Number(a.slot)) return { ...base, status: 'scorecard_slot_mismatch' };
  for (const [docKey, list] of byDoc) {
    const named = list.map((p) => ({ p, name: nameAt(p, a.source_bout_ids, a.role, a.slot) })).filter((x) => x.name !== undefined);
    if (!named.length) continue;
    const old = [...named].reverse().find((x) => !x.p.simulated && x.name === official.display_name);
    const latest = named[named.length - 1];
    const detail = { ...base, doc_key: docKey, old_name: old?.name ?? null, old_parser_version: old?.p.parser_version ?? null,
      new_name: latest.name, new_parser_version: latest.p.parser_version, simulated: Boolean(latest.p.simulated) };
    if (!old) return { ...detail, status: latest.name === corrected ? 'document_names_the_corrected_name' : 'artifact_not_in_stored_parse' };
    if (latest === old || latest.p.parser_version === old.p.parser_version) return { ...detail, status: 'no_corrected_parse' };
    if (latest.name === corrected) return { ...detail, status: latest.p.simulated ? 'continuity_simulated' : 'continuity' };
    return { ...detail, status: 'contradiction' };
  }
  return { ...base, status: 'bout_not_in_any_parse' };
}

function officialSummary(o) {
  const active = (o.assignments ?? []).filter((a) => ACTIVE.has(a.state));
  return {
    id: o.id, public_id: o.public_id, name: o.display_name, type: o.official_type, identity_state: o.identity_state,
    roles: [...new Set(active.map((a) => a.role))], commissions: [...new Set(active.map((a) => a.commission).filter(Boolean))],
    assignments_active: active.length, assignments_total: (o.assignments ?? []).length,
    scorecards: (o.assignments ?? []).reduce((n, a) => n + Number(a.scorecards ?? 0), 0),
    judge_slots: active.filter((a) => a.role === 'judge').map((a) => ({ bout_id: a.bout_id, slot: a.slot, event_date: a.event_date })),
    events: [...new Set(active.map((a) => `${a.event_date} ${a.event_name}`))],
  };
}

function docsOf(o, byDoc) {
  const ids = new Set((o.assignments ?? []).flatMap((a) => a.source_bout_ids ?? []));
  const out = [];
  for (const [docKey, list] of byDoc) {
    if (list.some((p) => [...p.bouts.keys()].some((k) => ids.has(k)))) out.push({ doc_key: docKey, parser_versions: [...new Set(list.map((p) => `${p.parser_version}${p.simulated ? ' (simulated)' : ''}`))] });
  }
  return out;
}

export function buildCleanupPlan(evidence, { simulatedParses = [], now = new Date().toISOString() } = {}) {
  const officials = (evidence.officials ?? []).filter((o) => !o.merged_into_id);
  const byDoc = indexParses([...(evidence.parses ?? []), ...simulatedParses.map((p) => ({ ...p, simulated: true }))]);
  const plan = { tool_version: OFFICIAL_CLEANUP_VERSION, generated_at: now, evidence_generated_at: evidence.generated_at ?? null,
    simulated_documents: simulatedParses.length, totals: evidence.totals ?? {}, A: [], A_pending: [], B: [], C: [], D: [], review_queue: [] };
  const seenPairs = new Set();
  const pairKey = (x, y) => [x, y].sort().join('|');

  // ---- A / A_pending / B: officials whose name is a parser artifact
  for (const o of officials) {
    const corrected = artifactCorrection(o.display_name);
    if (!corrected) continue;
    const twins = officials.filter((t) => t.id !== o.id && t.official_type === o.official_type && t.normalized_name === normalizedAlias(corrected));
    const items = (o.assignments ?? []).filter((a) => ACTIVE.has(a.state)).map((a) => assignmentContinuity(o, corrected, a, byDoc));
    const verified = items.filter((i) => i.status === 'continuity');
    const simulated = items.filter((i) => i.status === 'continuity_simulated');
    const blocking = items.filter((i) => ['contradiction', 'scorecard_slot_mismatch'].includes(i.status));
    const candidate = {
      candidate_a: officialSummary(o), candidate_b: twins[0] ? officialSummary(twins[0]) : null, corrected_name: corrected,
      relation: `leading "${o.display_name.slice(0, o.display_name.length - o.display_name.replace(/^[^\p{L}]+/u, '').length).trim()}" removed (parser artifact)`,
      source_documents: docsOf(o, byDoc), continuity: items,
    };
    const scorecards = candidate.candidate_a.scorecards;
    const assignments = candidate.candidate_a.assignments_active;
    if (twins.length > 1) { plan.C.push({ ...candidate, classification: 'C', reason: 'more_than_one_official_carries_the_corrected_name' }); continue; }
    const shared = twins[0] && (o.assignments ?? []).some((a) => ACTIVE.has(a.state) && (twins[0].assignments ?? []).some((b) => ACTIVE.has(b.state) && b.bout_id === a.bout_id && b.role === a.role));
    if (blocking.length || shared) {
      plan.B.push({ ...candidate, classification: 'B', reason: shared ? 'both_officials_active_on_the_same_bout' : `continuity_blocked:${[...new Set(blocking.map((b) => b.status))].join(',')}` });
      continue;
    }
    const action = twins[0] ? 'merge_parser_artifact' : 'rename_parser_artifact';
    const effect = action === 'rename_parser_artifact'
      ? { officials_renamed: 1, aliases_recorded: 1, officials_merged: 0, assignments_repointed: 0, scorecards_repointed: 0, rows_deleted: 0, assignments_keep_resolving: assignments, scorecards_keep_resolving: scorecards }
      : { officials_renamed: 0, aliases_recorded: 1, officials_merged: 1, assignments_repointed: 0, scorecards_repointed: 0, rows_deleted: 0, assignments_resolve_through_canonical: assignments, scorecards_resolve_through_canonical: scorecards };
    const apply = {
      action, category: 'A', official_id: twins[0] ? twins[0].id : o.id, from_official_id: twins[0] ? o.id : null, after_display_name: corrected,
      keys: nameKeys(corrected), tool_version: OFFICIAL_CLEANUP_VERSION,
      evidence: { rule: 'same_document_same_bout_role_slot_corrected_parser_version', artifact_name: o.display_name, corrected_name: corrected,
        continuity: verified.map((i) => ({ doc_key: i.doc_key, bout_id: i.bout_id, role: i.role, slot: i.slot, old_name: i.old_name, new_name: i.new_name,
          old_parser_version: i.old_parser_version, new_parser_version: i.new_parser_version, scorecards: i.scorecards, scorecard_slot: i.scorecard_slot })) },
    };
    if (verified.length) plan.A.push({ ...candidate, classification: 'A', confidence: 'deterministic', would_change: effect, apply });
    else if (simulated.length) plan.A_pending.push({ ...candidate, classification: 'A_pending', reason: 'corrected parse is simulated; becomes A only once a scheduled run stores it', would_change: effect });
    else plan.B.push({ ...candidate, classification: 'B', reason: 'artifact name without a corrected parse of its documents' });
    if (twins[0]) seenPairs.add(pairKey(o.id, twins[0].id));
  }

  // ---- C / D: surname-only officials and officials sharing a surname
  for (const s of officials.filter((o) => isSurnameOnly(o.display_name))) {
    const token = lastToken(s.display_name);
    const fulls = officials.filter((f) => f.id !== s.id && f.official_type === s.official_type && !isSurnameOnly(f.display_name) && lastToken(f.display_name) === token);
    const items = (s.assignments ?? []).filter((a) => ACTIVE.has(a.state)).map((a) => {
      const docs = [];
      for (const [docKey, list] of byDoc) {
        const named = list.map((p) => ({ p, name: nameAt(p, a.source_bout_ids, a.role, a.slot) })).filter((x) => x.name !== undefined);
        if (named.length) docs.push({ doc_key: docKey, names: named.map((x) => ({ parser_version: x.p.parser_version, simulated: Boolean(x.p.simulated), name: x.name })),
          header_lists: [...new Set(named.flatMap((x) => [...(x.p.header_officials?.judges ?? []), ...(x.p.header_officials?.referees ?? [])]))].filter((n) => lastToken(n) === token) });
      }
      return { bout_id: a.bout_id, role: a.role, slot: a.slot, event_date: a.event_date, scorecards: a.scorecards, documents: docs };
    });
    if (!fulls.length) {
      plan.C.push({ candidate_a: officialSummary(s), candidate_b: null, classification: 'C', reason: 'surname_only_official_without_a_full_name_candidate', evidence: items });
      continue;
    }
    for (const f of fulls) {
      seenPairs.add(pairKey(s.id, f.id));
      const sharedCommissions = officialSummary(s).commissions.filter((c) => officialSummary(f).commissions.includes(c));
      plan.C.push({ candidate_a: officialSummary(s), candidate_b: officialSummary(f), classification: 'C', reason: 'surname_only', shared_commissions: sharedCommissions,
        evidence: items, note: 'a surname never merges automatically, even when a corrected parse resolves the surname to this full name; human review decides' });
    }
  }
  const multi = officials.filter((o) => !isSurnameOnly(o.display_name) && !artifactCorrection(o.display_name));
  for (let i = 0; i < multi.length; i++) {
    for (let j = i + 1; j < multi.length; j++) {
      const [x, y] = [multi[i], multi[j]];
      if (x.official_type !== y.official_type || seenPairs.has(pairKey(x.id, y.id))) continue;
      const variant = variantLevel(x.display_name, y.display_name);
      if (variant) {
        seenPairs.add(pairKey(x.id, y.id));
        plan.B.push({ candidate_a: officialSummary(x), candidate_b: officialSummary(y), classification: 'B', reason: `name_variant:${variant}` });
      } else if (lastToken(x.display_name) === lastToken(y.display_name)) {
        seenPairs.add(pairKey(x.id, y.id));
        plan.D.push({ candidate_a: officialSummary(x), candidate_b: officialSummary(y), classification: 'D', reason: 'different_officials_sharing_a_surname' });
      }
    }
  }

  // ---- pending review queue: explained, never resolved here
  for (const r of evidence.review_items ?? []) {
    const cands = (r.candidates ?? []).map((c) => ({ id: c.id ?? c.official_id ?? null, display_name: c.display_name ?? null, bout_id: c.bout_id ?? null, slot: c.slot ?? null }));
    let classification = 'C';
    let reason = 'insufficient_evidence';
    if (/\b(WBO|WBA|WBC|IBF)\b|weight\b/i.test(r.raw_name)) { classification = 'parser_artifact_title_text'; reason = 'title text read into the official name (Florida layout); needs a Florida parser fix, not a merge'; }
    else if (/\s&\s/.test(r.raw_name) || /,(?!\s*(jr|sr|ii|iii|iv)\.?\s*$)/i.test(r.raw_name)) { classification = 'parser_artifact_combined_names'; reason = 'two names read as one (the corrected parser splits them); the queue item can be dismissed by a reviewer'; }
    else if (r.reason === 'reparse_names_a_different_official_in_held_slot') {
      const occ = cands[0]?.display_name ?? '';
      classification = isSurnameOnly(occ) || isSurnameOnly(r.raw_name) ? 'C' : 'B';
      reason = classification === 'C' ? 'held_slot_surname_only' : 'held_slot_different_full_name';
    } else if (cands.some((c) => c.display_name && variantLevel(r.raw_name, c.display_name))) {
      classification = 'B'; reason = `name_variant:${cands.map((c) => c.display_name && variantLevel(r.raw_name, c.display_name)).find(Boolean)}`;
    } else if (cands.some((c) => c.display_name && normalizedAlias(c.display_name) === normalizedAlias(r.raw_name))) {
      classification = 'B'; reason = 'same_name_without_commission_history';
    }
    plan.review_queue.push({ id: r.id, raw_name: r.raw_name, namespace: r.namespace, commission: r.commission, queue_reason: r.reason, candidates: cands, classification, reason });
  }

  // ---- parser artifacts still visible in the newest parse of each document
  const artifacts = { promoter_fragments: [], official_names: [] };
  for (const [docKey, list] of byDoc) {
    const latest = list[list.length - 1];
    for (const group of latest.promoters ?? []) {
      // "TKO Productions LLC d" / "b" / "a Zuffa Boxing": a d/b/a split into fragments
      for (const name of group ?? []) if (/^\S{1,2}$|\s[a-z]$|^[a-z]\s/.test(String(name).trim())) artifacts.promoter_fragments.push({ doc_key: docKey, parser_version: latest.parser_version, simulated: Boolean(latest.simulated), name });
    }
    for (const [id, b] of latest.bouts) {
      for (const n of [b.referee, ...b.judges.values()]) if (n && (artifactCorrection(n) || /\s&\s/.test(n))) artifacts.official_names.push({ doc_key: docKey, source_bout_id: id, parser_version: latest.parser_version, simulated: Boolean(latest.simulated), name: n });
    }
  }
  plan.parser_artifacts_in_latest_parses = artifacts;
  plan.summary = {
    officials: officials.length, A: plan.A.length, A_pending: plan.A_pending.length, B: plan.B.length, C: plan.C.length, D: plan.D.length,
    review_queue_pending: plan.review_queue.length, artifact_official_names: officials.filter((o) => artifactCorrection(o.display_name)).length,
    surname_only_officials: officials.filter((o) => isSurnameOnly(o.display_name)).length,
    duplicate_active_judge_slots: evidence.totals?.duplicate_active_judge_slots ?? null,
    promoter_fragments_in_latest_parses: artifacts.promoter_fragments.length, official_artifacts_in_latest_parses: artifacts.official_names.length,
  };
  return plan;
}
