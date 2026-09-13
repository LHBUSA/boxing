// Provider event -> canonical bout. Fail-closed.
//
// A provider event matches a bout only when BOTH provider names resolve,
// through the identity resolver in bout scope, to the two DIFFERENT corners of
// exactly one scheduled bout within +-2 days of the provider start. The date
// is a filter, never the evidence. An existing provider-event mapping is
// re-verified every time: if the corners no longer match (opponent replaced
// but the provider reused its event id) the event goes to the unmatched queue.
//
// 1.1.0: a different given name never matches in bout scope (Jermall/Jermell);
// a provider participant identity VERIFIED by an earlier authoritative match
// decides that name: it confirms its own boxer and refuses any other corner.

import { resolveIdentity } from '../identity/resolver.mjs';
import { normalizedAlias } from '../identity/normalize.mjs';

export const MATCHER_VERSION = 'boxing-odds-event-matcher@1.1.0';
const WINDOW_MS = 2 * 86_400_000;

export const providerNameKey = (name) => normalizedAlias(name);

function resolveCorner(name, bout, candidatesById, providerIdentities) {
  const corners = bout.participants.map((p) => candidatesById.get(p.fighter_id)).filter(Boolean);
  if (corners.length !== 2) return { outcome: 'unresolved', reason: 'bout_corners_missing' };
  const known = providerIdentities?.get(providerNameKey(name)) ?? [];
  if (known.length === 1) {
    const corner = bout.participants.find((p) => p.fighter_id === known[0]);
    if (!corner) return { outcome: 'unresolved', reason: 'provider_identity_points_elsewhere' };
    return { outcome: 'matched', fighter_id: corner.fighter_id, side: corner.side, level: 'provider_identity_verified' };
  }
  const d = resolveIdentity({ display_name: name }, { candidates: corners }, { scope: corners.map((c) => c.id), allowCreate: false });
  if (d.outcome !== 'matched') return { outcome: 'unresolved', reason: d.reason };
  if (d.evidence?.givenNameDiffers) return { outcome: 'unresolved', reason: 'given_name_differs' };
  const side = bout.participants.find((p) => p.fighter_id === d.fighter_id)?.side;
  return { outcome: 'matched', fighter_id: d.fighter_id, side, level: d.evidence?.nameLevel };
}

function tryBout(event, bout, candidatesById, providerIdentities) {
  const home = resolveCorner(event.home_team, bout, candidatesById, providerIdentities);
  const away = resolveCorner(event.away_team, bout, candidatesById, providerIdentities);
  if (home.outcome !== 'matched' || away.outcome !== 'matched') return { ok: false, home, away };
  if (home.fighter_id === away.fighter_id) return { ok: false, home, away, reason: 'both_names_same_corner' };
  return {
    ok: true,
    bout_id: bout.bout_id,
    sides: { [event.home_team]: home.side, [event.away_team]: away.side },
    fighters: Object.fromEntries(bout.participants.map((p) => [p.side, p.fighter_id])),
    evidence: { home: { name: event.home_team, ...home }, away: { name: event.away_team, ...away } },
  };
}

// bouts: from boxing_market_bouts_in_window; candidatesById: Map of candidate
// objects for every participant; mappedBoutId: existing provider mapping or null.
export function matchEvent(event, { bouts, candidatesById, mappedBoutId = null, providerIdentities = null }) {
  const commence = Date.parse(event.commence_time);
  if (!Number.isFinite(commence)) return { matched: false, reason: 'invalid_commence_time' };

  if (mappedBoutId) {
    const bout = bouts.find((b) => b.bout_id === mappedBoutId);
    if (!bout) return { matched: false, reason: 'mapped_bout_not_schedulable', detail: { mapped_bout_id: mappedBoutId } };
    const r = tryBout(event, bout, candidatesById, providerIdentities);
    if (!r.ok) return { matched: false, reason: 'mapped_bout_participant_mismatch', detail: { mapped_bout_id: mappedBoutId, home: r.home, away: r.away } };
    return { matched: true, method: 'existing_mapping', ...r };
  }

  const inWindow = bouts.filter((b) => b.starts_at && Math.abs(Date.parse(b.starts_at) - commence) <= WINDOW_MS);
  const hits = [];
  const near = [];
  for (const bout of inWindow) {
    const r = tryBout(event, bout, candidatesById, providerIdentities);
    if (r.ok) hits.push(r);
    else if (r.home?.outcome === 'matched' || r.away?.outcome === 'matched') near.push({ bout_id: bout.bout_id, home: r.home, away: r.away, reason: r.reason });
  }
  if (hits.length === 1) return { matched: true, method: 'both_corners_resolved', ...hits[0] };
  if (hits.length > 1) return { matched: false, reason: 'ambiguous_multiple_bouts', detail: { bout_ids: hits.map((h) => h.bout_id) } };
  return {
    matched: false,
    reason: !inWindow.length ? 'no_candidate_bout_in_window' : near.length ? 'no_bout_with_both_fighters' : 'participants_not_found',
    detail: { bouts_in_window: inWindow.length, partial_matches: near.slice(0, 5) },
  };
}
