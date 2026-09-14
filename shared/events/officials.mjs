// Referee / judge identity. Same principles as boxers: a canonical id,
// external ids attach as identities, and a name alone never merges.
//
//   external id mapped                               -> matched (verified)
//   exact name + same country + worked for this
//     commission before, and unique                  -> matched (probable)
//   exact name + worked for this commission before,
//     no country conflict, observed in that commission's
//     OWN official record (commissionAuthoritative)    -> matched (probable)
//   any other name-similar candidate                 -> review
//   no name-similar candidate                        -> created (source_native)

import { compareNames } from '../identity/evidence.mjs';
import { nameKeys, normalizedAlias } from '../identity/normalize.mjs';

export const OFFICIAL_RESOLVER_VERSION = 'boxing-official-resolver@1.0.0';

export function resolveOfficial(obs, { mapped = null, candidates = [] }, { commissionId = null, commissionAuthoritative = false } = {}) {
  if (mapped) return { outcome: 'matched', official_id: mapped.id, verification_state: 'verified', confidence: 100, method: 'external_id' };
  const scored = candidates.map((c) => {
    const name = compareNames(obs.display_name, c.display_name).level;
    const country = obs.country_code && c.country_code ? (obs.country_code === c.country_code ? 'match' : 'conflict') : 'unknown';
    const commission = commissionId && (c.commission_ids ?? []).includes(commissionId);
    return { official_id: c.id, display_name: c.display_name, name, country, commission_history: Boolean(commission) };
  }).filter((s) => s.name !== 'none');
  const eligible = scored.filter((s) => ['exact', 'reordered', 'joined'].includes(s.name) && s.commission_history
    && (s.country === 'match' || (commissionAuthoritative && s.name === 'exact' && s.country === 'unknown')));
  if (eligible.length === 1) {
    return { outcome: 'matched', official_id: eligible[0].official_id, verification_state: 'probable', confidence: 80,
      method: eligible[0].country === 'match' ? 'name+country+commission_history' : 'exact_name+commission_record', evidence: eligible[0] };
  }
  if (scored.length) return { outcome: 'review', reason: eligible.length > 1 ? 'ambiguous' : 'insufficient_evidence', candidates: scored };
  return { outcome: 'created', verification_state: 'verified', confidence: 100, method: 'no_candidates' };
}

// Correction-aware slot continuity for a commission's own result sheet. A re-parse of a
// document (newer parser, same bout) that names the official already holding that role/slot:
//   no active occupant                                    -> resolve (normal resolver)
//   same name after normalization ("& Cory Santos" and
//     "Cory Santos" normalize identically)                 -> keep    (occupant stays; no resolver call,
//                                                                      no second official, no second active judge)
//   a different name ("Cheek" -> "Eric Cheek")            -> hold    (occupant stays; a review item records the
//                                                                      conflict; nothing is re-pointed)
// A surname never proves identity, so a different name is never an automatic replacement.
export function slotContinuity(incoming, occupant) {
  if (!occupant) return { action: 'resolve' };
  const name = normalizedAlias(incoming.display_name);
  if (name && name === normalizedAlias(occupant.display_name)) return { action: 'keep', reason: 'same_name_after_normalization', official_id: occupant.official_id };
  return { action: 'hold', reason: 'reparse_names_a_different_official_in_held_slot', official_id: occupant.official_id };
}

// The official actively holding this role (referee) or role + slot (judge) on a card-state bout.
export function activeOccupant(stateBout, o) {
  if (!stateBout) return null;
  return (stateBout.officials ?? []).find((x) => ['assigned', 'worked'].includes(x.state) && x.role === o.role
    && (o.role === 'referee' || (x.slot != null && o.slot != null && Number(x.slot) === Number(o.slot)))) ?? null;
}

export async function ingestOfficial(store, { sourceKey, namespace, official, commissionId = null, commissionAuthoritative = false }) {
  const keys = nameKeys(official.display_name, { lookup: true });
  const retrieved = await store.officialCandidates(keys, namespace, official.external_id ?? null);
  const decision = resolveOfficial(official, retrieved, { commissionId, commissionAuthoritative });
  const result = await store.applyOfficialDecision({
    source_key: sourceKey,
    identity: { ...official, namespace, commission_id: commissionId },
    decision,
    normalized_name: normalizedAlias(official.display_name),
    keys: nameKeys(official.display_name),
  });
  return { decision, result };
}
