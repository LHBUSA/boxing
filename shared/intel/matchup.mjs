// Point-in-time matchup features (pbe_matchup_dna@1.0.0). Pure.
//
// Built from the two fighters' histories AS OF the cutoff. Raw metric values
// are embedded in the snapshot, so later recalculation of either fighter's
// Fight DNA can never change what this snapshot says.

import { computeFighterMetrics } from './fighter-metrics.mjs';
import { round4 } from './common.mjs';

export const MATCHUP_MODEL_KEY = 'pbe_matchup_dna';
export const MATCHUP_MODEL_VERSION = '1.0.0';

const DIFFERENTIALS = {
  experience_pro_bouts: 'activity.pro_bouts',
  activity_days_since_last_bout: 'activity.days_since_last_bout',
  activity_bouts_last_24_months: 'activity.bouts_last_24_months',
  opponent_quality_index: 'opposition.opponent_quality_index',
  stoppage_win_rate: 'finishing.stoppage_win_rate',
  stoppage_loss_rate: 'results.stoppage_loss_rate',
  rounds_completed_ratio: 'durability.rounds_completed_ratio',
  reached_round_9_rate: 'durability.reached_round_9_rate',
  late_round_scoring_share: 'late.round_scoring_share_9_plus',
  title_fights: 'opposition.title_fights',
  bouts_at_current_division: 'division.bouts_at_current',
};

const ageYears = (dob, cutoff) => (dob ? round4((+new Date(cutoff) - +new Date(`${String(dob).slice(0, 10)}T00:00:00Z`)) / (365.2425 * 86_400_000)) : null);

function side(history, cutoff) {
  const metrics = Object.fromEntries(computeFighterMetrics(history).map((m) => [m.metric_key, {
    version: m.metric_version, status: m.status, value: m.value_number ?? m.value_text ?? m.value_json, sample_size: m.sample_size,
  }]));
  const f = history.fighter;
  return {
    fighter_id: f.id,
    physical: {
      age_years: ageYears(f.dob, cutoff),
      height_cm: f.height_cm == null ? null : Number(f.height_cm),
      reach_cm: f.reach_cm == null ? null : Number(f.reach_cm),
      stance: f.stance ?? null,
      // height, reach and stance are the currently recorded attributes, not
      // point-in-time measurements; age is exact from DOB
      point_in_time: { age_years: true, height_cm: false, reach_cm: false, stance: false },
    },
    metrics,
  };
}

const diff = (a, b) => (a == null || b == null ? null : round4(Number(a) - Number(b)));

export function buildMatchupFeatures({ bout, historyA, historyB, cutoff }) {
  const a = side(historyA, cutoff);
  const b = side(historyB, cutoff);
  const differentials = {
    age_years: diff(a.physical.age_years, b.physical.age_years),
    height_cm: diff(a.physical.height_cm, b.physical.height_cm),
    reach_cm: diff(a.physical.reach_cm, b.physical.reach_cm),
  };
  for (const [name, key] of Object.entries(DIFFERENTIALS)) {
    const ma = a.metrics[key];
    const mb = b.metrics[key];
    differentials[name] = ma?.status === 'available' && mb?.status === 'available' ? diff(ma.value, mb.value) : null;
  }
  const stanceKey = (s) => (s === 'orthodox' || s === 'southpaw' ? s : null);
  const stance = {
    interaction: a.physical.stance && b.physical.stance ? `${a.physical.stance}_vs_${b.physical.stance}` : null,
    a_vs_b_stance: stanceKey(b.physical.stance) ? a.metrics[`stance.win_rate_vs_${b.physical.stance}`] : null,
    b_vs_a_stance: stanceKey(a.physical.stance) ? b.metrics[`stance.win_rate_vs_${a.physical.stance}`] : null,
  };
  const metricVersions = Object.fromEntries(Object.entries(a.metrics).map(([k, v]) => [k, v.version]));
  return {
    model_key: MATCHUP_MODEL_KEY,
    model_version: MATCHUP_MODEL_VERSION,
    features: {
      input_cutoff: new Date(cutoff).toISOString(),
      bout: { bout_id: bout.bout_id, scheduled_rounds: bout.scheduled_rounds ?? null, weight_class_key: bout.weight_class_key ?? null, title_fight: Boolean(bout.title_fight) },
      fighter_a: a,
      fighter_b: b,
      differentials,
      stance,
      label: 'PropBetEdge-derived',
    },
    metric_versions: metricVersions,
  };
}
