// Deterministic boxer identity resolver. Pure: callers load candidates and
// persist the returned decision.
//
// Policy (docs/IDENTITY_RESOLUTION.md):
//   1. A live mapping of (namespace, external_id) decides, unless the mapped
//      boxer hard-conflicts with the observation -> review, never remap.
//   2. Otherwise a candidate auto-matches only with a strong name level plus
//      strong corroboration (exact DOB, bout context, 2+ shared opponents), or
//      a weak name level plus strong corroboration plus two medium signals,
//      AND no hard or soft conflict, AND it is the only such candidate.
//   3. Anything name-similar that does not clear that bar goes to review.
//   4. Only when every candidate is ruled out by a hard conflict (or none
//      exist) may a seed run create a new canonical boxer.
//   Fuzzy similarity nominates; it never merges on its own. A different given
//   name (Antonio/Antuanne) is never decided by DOB/attributes: twins share them.

import { STRONG_NAME, WEAK_NAME, scoreCandidate } from './evidence.mjs';
import { parseName } from './normalize.mjs';

export const RESOLVER_VERSION = 'boxing-identity-resolver@1.0.0';

// Stable ordering: confidence desc, then id, so output never depends on the
// order the database returned candidates in.
const byConfidence = (a, b) => b.confidence - a.confidence || String(a.fighter_id).localeCompare(String(b.fighter_id));

function validate(obs) {
  const problems = [];
  if (!obs || typeof obs !== 'object') return ['observation missing'];
  const name = parseName(obs.display_name);
  if (!name.core.length) problems.push('display_name has no letters');
  if (obs.dob && !/^\d{4}-\d{2}-\d{2}$/.test(obs.dob)) problems.push('dob must be YYYY-MM-DD');
  if (obs.dob && Number.isNaN(Date.parse(obs.dob))) problems.push('dob is not a real date');
  if (obs.sex && !['male', 'female', 'other', 'unknown'].includes(obs.sex)) problems.push('sex not recognised');
  return problems;
}

function eligibility(s, { scoped }) {
  if (s.hard.length) return false;
  if (scoped) return s.nameLevel !== 'none' && s.soft.filter((f) => f !== 'suffix_missing').length === 0;
  if (s.soft.length) return false;
  // a different given name needs corroboration that siblings do not share
  if (s.givenNameDiffers && !s.strong.some((x) => x !== 'dob_exact')) return false;
  if (STRONG_NAME.has(s.nameLevel)) return s.strong.length >= 1;
  if (WEAK_NAME.has(s.nameLevel)) return s.strong.length >= 1 && s.medium.length >= 2;
  return false;
}

function reviewReason(nominated) {
  const flags = new Set(nominated.flatMap((s) => [...s.soft, ...s.strong, s.nameLevel]));
  if (nominated.some((s) => s.hard.length)) return 'contradictory_evidence';
  if (nominated.length > 1 && nominated.filter((s) => STRONG_NAME.has(s.nameLevel)).length > 1) return 'ambiguous';
  if (nominated.some((s) => s.givenNameDiffers)) return 'given_name_variant';
  if (flags.has('dob_typo_like')) return 'dob_mismatch';
  if (flags.has('nationality_conflict')) return 'nationality_conflict';
  if (flags.has('suffix_missing')) return 'suffix_missing';
  if (nominated.every((s) => s.nameLevel === 'none')) return 'possible_name_change';
  if (nominated.every((s) => !STRONG_NAME.has(s.nameLevel))) return 'weak_name_only';
  if (flags.has('stance_conflict') || flags.has('physical_conflict') || flags.has('division_conflict')) return 'attribute_conflict';
  if (flags.has('namespace_id_conflict')) return 'namespace_id_conflict';
  return 'insufficient_evidence';
}

// resolveIdentity(observation, { mapped, candidates }, options)
//   observation: identity record (see docs/IDENTITY_RESOLUTION.md)
//   mapped:      candidate object already mapped to (namespace, external_id), or null
//   candidates:  candidate objects retrieved by name keys / DOB / scope
//   options:     { namespace, allowCreate, scope: [fighterId, ...] }
export function resolveIdentity(obs, { mapped = null, candidates = [] } = {}, options = {}) {
  const { namespace = null, allowCreate = false, scope = null } = options;
  const base = { resolver_version: RESOLVER_VERSION, namespace, external_id: obs?.external_id ?? null };

  const problems = validate(obs);
  if (problems.length) {
    return { ...base, outcome: 'rejected', reason: 'invalid_observation', problems, candidates: [] };
  }

  // 1. deterministic external id
  if (mapped) {
    const s = scoreCandidate(obs, mapped, { namespace: null });
    const conflicts = s.hard.filter((h) => h !== 'namespace_id_conflict');
    const others = candidates.filter((c) => c.id !== mapped.id).map((c) => scoreCandidate(obs, c, { namespace }));
    if (conflicts.length) {
      return {
        ...base,
        outcome: 'review',
        reason: 'mapped_identity_conflict',
        confidence: 0,
        candidates: [{ ...s, mapped: true }, ...others.filter((o) => o.nameLevel !== 'none' || o.strong.length)]
          .sort(byConfidence),
      };
    }
    return {
      ...base,
      outcome: 'matched',
      fighter_id: mapped.id,
      method: 'external_id',
      verification_state: 'verified',
      confidence: 100,
      evidence: s,
      name_differs: s.nameLevel === 'none' || !STRONG_NAME.has(s.nameLevel),
      candidates: [],
    };
  }

  // 2. score candidates (scope restricts the universe to one bout's corners)
  let pool = candidates;
  if (scope) {
    const allowed = new Set(scope);
    pool = candidates.filter((c) => allowed.has(c.id));
  }
  const scored = pool
    .map((c) => scoreCandidate(obs, c, { namespace }))
    .sort(byConfidence);

  const eligible = scored.filter((s) => eligibility(s, { scoped: Boolean(scope) }));
  if (eligible.length === 1) {
    const s = eligible[0];
    const exactish = ['exact', 'reordered', 'joined'].includes(s.nameLevel);
    return {
      ...base,
      outcome: 'matched',
      fighter_id: s.fighter_id,
      method: scope ? 'bout_scope' : `name_${s.nameLevel}+${s.strong.join('+')}`,
      verification_state: !scope && exactish && s.strong.includes('dob_exact') ? 'verified' : 'probable',
      confidence: scope ? Math.max(s.confidence, 70) : s.confidence,
      evidence: s,
      candidates: scored.filter((x) => x !== s && (x.nameLevel !== 'none' || x.strong.length)).slice(0, 5),
    };
  }
  if (eligible.length > 1) {
    return { ...base, outcome: scope ? 'unresolved' : 'review', reason: 'ambiguous', confidence: 0, candidates: eligible.slice(0, 10) };
  }

  // 3. nominate for review: any name-similar candidate that is not ruled out,
  //    plus same-DOB boxers with no conflicts (possible name change).
  //    A hard conflict rules a candidate out, EXCEPT when strong name evidence
  //    and strong corroboration also point at it: exact name + exact DOB with
  //    a conflicting sex is a data error to review, not a new person.
  //    A reviewer's explicit non-match is final and is never re-proposed.
  const contradictory = (s) => s.hard.length > 0 && !s.hard.includes('previously_rejected')
    && STRONG_NAME.has(s.nameLevel) && s.strong.length > 0;
  const nominated = scored.filter((s) => contradictory(s) || (!s.hard.length
    && (s.nameLevel !== 'none' || (s.strong.includes('dob_exact') && !s.soft.length && s.medium.length >= 1))));
  if (nominated.length) {
    return {
      ...base,
      outcome: scope ? 'unresolved' : 'review',
      reason: reviewReason(nominated),
      confidence: nominated[0].confidence,
      candidates: nominated.slice(0, 10),
    };
  }

  // 4. nothing plausible
  const ruledOut = scored.filter((s) => s.hard.length && s.nameLevel !== 'none');
  if (scope || !allowCreate) {
    return { ...base, outcome: 'unresolved', reason: ruledOut.length ? 'all_candidates_conflict' : 'no_candidates', confidence: 0, candidates: ruledOut.slice(0, 10) };
  }
  return {
    ...base,
    outcome: 'created',
    reason: ruledOut.length ? 'distinct_from_candidates' : 'no_candidates',
    verification_state: 'verified',
    confidence: 100,
    candidates: ruledOut.slice(0, 10),
  };
}
