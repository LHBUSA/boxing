// Career-graph identity resolution for one source APPEARANCE: one corner of one
// bout on an official card. Pure: callers load candidates + graph context and
// persist the decision (boxing_record_appearance_decision).
//
// The name resolver (resolver.mjs) needs strong corroboration (DOB, bout
// context, shared opponents) that commission sheets do not carry, so a boxer's
// second card always went to review. This module weighs what the sheets DO
// carry, against what the canonical graph already knows about each candidate:
//
//   Tier A  deterministic   the same fight is already on the candidate's record
//                           (same resolved opponent within one day), strong name,
//                           and no other name-similar candidate survives
//   Tier B  graph match     strong exact-form name (exact/reordered/joined, same
//                           given name), no contradiction at all, the ONLY
//                           name-similar candidate that survives, and at least
//                           three independent support families of which two are
//                           mandatory: the same city-level stated hometown AND a
//                           compatible official weight; plus one of same
//                           commission, same venue, or a rematch of a recorded
//                           opponent
//   Tier C  review          anything else that names a plausible candidate
//   Tier D  conflict        a candidate is excluded by a hard contradiction
//                           (simultaneous event elsewhere, commission debut after
//                           a recorded bout, the candidate IS the opponent,
//                           suffix/sex conflict). When every name-similar
//                           candidate is excluded, an approved source may create
//                           a distinct boxer.
//
// Never decisive: fuzzy similarity, a region/country-only hometown, DOB (not
// used), sportsbook names (never an input).

import { STRONG_NAME, WEAK_NAME, scoreCandidate } from './evidence.mjs';
import { normalizedAlias, parseName } from './normalize.mjs';

// 1.1.0 (issue #10): a distinct second meeting against the same opponent on the same official card is
// labelled repeat_pairing_identity_continuity, not same_fight_already_on_record. Tier conditions unchanged.
export const GRAPH_RESOLVER_VERSION = 'boxing-identity-graph@1.1.0';

const DAY = 86_400_000;
const EXACT_FORMS = new Set(['exact', 'reordered', 'joined']);
export const TIER_B_RULES = Object.freeze({
  mandatory_families: ['hometown', 'weight'],
  one_of_families: ['jurisdiction', 'venue', 'opponent_graph'],
  min_families: 3,
  weight_window_days: 400,
  weight_support_lb: (w) => Math.max(8, 0.05 * w),
  weight_conflict_lb: (w) => Math.max(20, 0.12 * w),
  simultaneous_days: 2,
  close_days: 13,
});

// "Miami, FL" / "Budapest, Hungary" identify a place; "Cuba" / "Pennsylvania" do not.
export function cityLevelHometown(h) {
  if (!h) return null;
  const parts = String(h).split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts.map((x) => normalizedAlias(x)).join(', ');
}

const days = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / DAY;

// appearance: { display_name, hometown, weight_lb, debut, event: { event_id, date, commission, venue_id },
//               opponent: { display_name, fighter_id } }
// cand: boxing_identity_candidates() candidate JSON merged with graph context
//       ({ id, display_name, aliases, identities, hometowns, bouts: [{ event_id, date, status, commission, venue_id, opponent_id, weight_lb }] })
export function evaluateCandidate(app, cand) {
  const s = scoreCandidate({ display_name: app.display_name, names: [], nationality: [], hometown: null }, cand, {});
  const support = [];
  const against = [];
  const hard = s.hard.filter((h) => h !== 'dob_conflict');
  const soft = [...s.soft];
  const families = new Set();
  const nameStrong = STRONG_NAME.has(s.nameLevel);
  const nameExactForm = EXACT_FORMS.has(s.nameLevel) && !s.givenNameDiffers && !s.soft.includes('suffix_missing');
  if (s.nameLevel !== 'none') support.push(`name_${s.nameLevel}`);
  if (s.givenNameDiffers) against.push('given_name_differs');

  // stated hometown (commission-published): city level only counts
  const oh = cityLevelHometown(app.hometown);
  const ch = [...new Set((cand.hometowns ?? []).map(cityLevelHometown).filter(Boolean))];
  if (oh && ch.includes(oh)) { families.add('hometown'); support.push(`hometown_same_city:${oh}`); }
  else if (oh && ch.length) { soft.push('hometown_different_city'); against.push(`hometown_different_city:${oh} vs ${ch.join(' / ')}`); }
  else if (app.hometown && (cand.hometowns ?? []).some((x) => normalizedAlias(x) === normalizedAlias(app.hometown))) support.push('hometown_same_region_only(not_decisive)');

  const bouts = (cand.bouts ?? []).filter((b) => b.date);
  const date = app.event?.date;
  // the same fight recorded under another event row (another official document) is not a separate bout
  const sameFightBout = (b) => Boolean(app.opponent?.fighter_id) && b.opponent_id === app.opponent.fighter_id && date && days(b.date, date) <= 1;
  // the same two boxers on the same card as a DIFFERENT official bout (different source bout id
  // such as <pair> vs <pair>|2, or a different sheet order) is a repeat pairing, not the same fight
  const boutNamespace = app.namespace ? String(app.namespace).replace(/\.fighter$/, '.bout') : null;
  const isRepeatPairing = (b) => {
    if (!sameFightBout(b) || !app.event?.event_id || b.event_id !== app.event.event_id) return false;
    const own = (b.source_bout_ids ?? []).filter((x) => !boutNamespace || x.namespace === boutNamespace).map((x) => x.external_id);
    if (app.bout_external_id && own.length && !own.includes(app.bout_external_id)) return true;
    return app.bout_order != null && b.bout_order != null && Number(app.bout_order) !== Number(b.bout_order);
  };
  const otherEvents = bouts.filter((b) => b.event_id !== app.event?.event_id && !sameFightBout(b));

  if (app.opponent?.fighter_id && cand.id === app.opponent.fighter_id) { hard.push('candidate_is_the_opponent'); against.push('candidate_is_the_opponent'); }

  const repeatPairing = bouts.some(isRepeatPairing);
  const sameFight = bouts.some((b) => sameFightBout(b) && !isRepeatPairing(b));
  if (repeatPairing) support.push('repeat_pairing_identity_continuity');
  if (sameFight) support.push('same_fight_already_on_record');

  if (date) {
    for (const b of otherEvents) {
      const d = days(b.date, date);
      if (d <= TIER_B_RULES.simultaneous_days) {
        const elsewhere = (b.commission && app.event?.commission && b.commission !== app.event.commission)
          || (b.venue_id && app.event?.venue_id && b.venue_id !== app.event.venue_id);
        if (elsewhere) { if (!hard.includes('simultaneous_event_elsewhere')) hard.push('simultaneous_event_elsewhere'); against.push(`fought_${b.date}_at_other_event`); }
        else if (!soft.includes('possible_duplicate_event')) { soft.push('possible_duplicate_event'); against.push(`bout_${b.date}_same_place_other_event`); }
      } else if (d <= TIER_B_RULES.close_days && !soft.includes('fought_within_13_days')) {
        soft.push('fought_within_13_days'); against.push(`fought_${b.date}`);
      }
    }
    if (app.debut === true && bouts.some((b) => b.status === 'complete' && Date.parse(b.date) < Date.parse(date) - DAY)) {
      hard.push('debut_after_recorded_bout'); against.push('sheet_marks_debut_but_candidate_has_earlier_bout');
    }
  }

  if (app.weight_lb && date) {
    const weighed = otherEvents.filter((b) => b.weight_lb != null && days(b.date, date) <= TIER_B_RULES.weight_window_days)
      .sort((x, y) => days(x.date, date) - days(y.date, date));
    if (weighed.length) {
      const near = weighed[0];
      const diff = Math.abs(Number(app.weight_lb) - Number(near.weight_lb));
      if (diff <= TIER_B_RULES.weight_support_lb(Number(app.weight_lb))) { families.add('weight'); support.push(`weight_${app.weight_lb}_vs_${near.weight_lb}_on_${near.date}`); }
      else if (diff > TIER_B_RULES.weight_conflict_lb(Number(app.weight_lb))) { soft.push('weight_incompatible'); against.push(`weight_${app.weight_lb}_vs_${near.weight_lb}_on_${near.date}`); }
      else against.push(`weight_gap_${diff.toFixed(1)}lb(neutral)`);
    }
  }
  if (app.event?.commission && otherEvents.some((b) => b.commission === app.event.commission)) { families.add('jurisdiction'); support.push(`same_commission:${app.event.commission}`); }
  if (app.event?.venue_id && otherEvents.some((b) => b.venue_id === app.event.venue_id)) { families.add('venue'); support.push('same_venue'); }
  if (app.opponent?.fighter_id && otherEvents.some((b) => b.opponent_id === app.opponent.fighter_id)) { families.add('opponent_graph'); support.push('rematch_of_recorded_opponent'); }

  let tier = 'C';
  if (hard.length) tier = 'D';
  else if ((sameFight || repeatPairing) && nameStrong && !soft.length) tier = 'A';
  else if (nameExactForm && !soft.length
    && TIER_B_RULES.mandatory_families.every((f) => families.has(f))
    && TIER_B_RULES.one_of_families.some((f) => families.has(f))
    && families.size >= TIER_B_RULES.min_families) tier = 'B';

  const confidence = tier === 'D' ? 0 : tier === 'A' ? 98
    : Math.min(tier === 'B' ? 95 : 79, 40 + (nameExactForm ? 20 : nameStrong ? 10 : 0) + families.size * 9 - soft.length * 15);
  return {
    fighter_id: cand.id, display_name: cand.display_name, name_level: s.nameLevel, name_similar: s.nameLevel !== 'none',
    tier, confidence: Math.max(0, confidence), families: [...families].sort(), support, against, hard, soft,
    continuity: repeatPairing ? 'repeat_pairing_identity_continuity' : sameFight ? 'same_fight_already_on_record' : null,
    career: { bouts: bouts.length, commissions: [...new Set(bouts.map((b) => b.commission).filter(Boolean))].sort(),
      first_bout: bouts[0]?.date ?? null, last_bout: bouts.at(-1)?.date ?? null,
      weights_lb: bouts.map((b) => b.weight_lb).filter((w) => w != null) },
  };
}

// Returns { decision: 'matched'|'created'|'review'|'none', tier, fighter_id, confidence, reason, candidates }
//   'none': no name-similar candidate at all (not this module's call; the name
//           resolver already handles unseen names)
export function resolveAppearance(app, candidates, { allowCreate = false } = {}) {
  const base = { resolver_version: GRAPH_RESOLVER_VERSION };
  if (!parseName(app?.display_name).core.length) return { ...base, decision: 'none', reason: 'no_name', candidates: [] };
  const evaluated = candidates.map((c) => evaluateCandidate(app, c))
    .sort((a, b) => b.confidence - a.confidence || String(a.fighter_id).localeCompare(String(b.fighter_id)));
  const similar = evaluated.filter((e) => e.name_similar && (STRONG_NAME.has(e.name_level) || WEAK_NAME.has(e.name_level)));
  if (!similar.length) return { ...base, decision: 'none', reason: 'no_name_similar_candidates', candidates: evaluated.slice(0, 5) };
  const live = similar.filter((e) => e.tier !== 'D');

  if (!live.length) {
    return allowCreate
      ? { ...base, decision: 'created', tier: 'D', confidence: 90, reason: 'every_name_similar_candidate_conflicts', candidates: similar }
      : { ...base, decision: 'review', tier: 'C', confidence: 0, reason: 'every_candidate_conflicts_source_cannot_create', candidates: similar };
  }
  if (live.length > 1) {
    return { ...base, decision: 'review', tier: 'C', confidence: live[0].confidence, reason: 'more_than_one_plausible_candidate', candidates: similar };
  }
  const [only] = live;
  if (only.tier === 'A' || only.tier === 'B') {
    return { ...base, decision: 'matched', tier: only.tier, fighter_id: only.fighter_id, confidence: only.confidence,
      reason: only.tier === 'A' ? only.continuity : `graph:${only.families.join('+')}`, candidates: similar };
  }
  return { ...base, decision: 'review', tier: 'C', confidence: only.confidence,
    reason: only.soft.length ? `contradiction:${only.soft.join('+')}` : `insufficient_graph_evidence:${only.families.join('+') || 'none'}`, candidates: similar };
}
