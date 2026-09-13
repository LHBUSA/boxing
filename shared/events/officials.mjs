// Referee / judge identity. Same principles as boxers: a canonical id,
// external ids attach as identities, and a name alone never merges.
//
//   external id mapped                               -> matched (verified)
//   exact name + same country + worked for this
//     commission before, and unique                  -> matched (probable)
//   any other name-similar candidate                 -> review
//   no name-similar candidate                        -> created (source_native)

import { compareNames } from '../identity/evidence.mjs';
import { nameKeys, normalizedAlias } from '../identity/normalize.mjs';

export const OFFICIAL_RESOLVER_VERSION = 'boxing-official-resolver@1.0.0';

export function resolveOfficial(obs, { mapped = null, candidates = [] }, { commissionId = null } = {}) {
  if (mapped) return { outcome: 'matched', official_id: mapped.id, verification_state: 'verified', confidence: 100, method: 'external_id' };
  const scored = candidates.map((c) => {
    const name = compareNames(obs.display_name, c.display_name).level;
    const country = obs.country_code && c.country_code ? (obs.country_code === c.country_code ? 'match' : 'conflict') : 'unknown';
    const commission = commissionId && (c.commission_ids ?? []).includes(commissionId);
    return { official_id: c.id, display_name: c.display_name, name, country, commission_history: Boolean(commission) };
  }).filter((s) => s.name !== 'none');
  const eligible = scored.filter((s) => ['exact', 'reordered', 'joined'].includes(s.name) && s.country === 'match' && s.commission_history);
  if (eligible.length === 1) {
    return { outcome: 'matched', official_id: eligible[0].official_id, verification_state: 'probable', confidence: 80,
      method: 'name+country+commission_history', evidence: eligible[0] };
  }
  if (scored.length) return { outcome: 'review', reason: eligible.length > 1 ? 'ambiguous' : 'insufficient_evidence', candidates: scored };
  return { outcome: 'created', verification_state: 'verified', confidence: 100, method: 'no_candidates' };
}

export async function ingestOfficial(store, { sourceKey, namespace, official, commissionId = null }) {
  const keys = nameKeys(official.display_name, { lookup: true });
  const retrieved = await store.officialCandidates(keys, namespace, official.external_id ?? null);
  const decision = resolveOfficial(official, retrieved, { commissionId });
  const result = await store.applyOfficialDecision({
    source_key: sourceKey,
    identity: { ...official, namespace, commission_id: commissionId },
    decision,
    normalized_name: normalizedAlias(official.display_name),
    keys: nameKeys(official.display_name),
  });
  return { decision, result };
}
