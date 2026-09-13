// Fighter Fight DNA metric registry (v1.0.0). Pure.
//
// Every metric is PropBetEdge-derived and describes ONLY the bouts in the
// PropBetEdge graph that started before the input cutoff. Record-based
// finishing metrics describe how bouts ended; they are not measurements of
// punching power or of a "chin", and are named accordingly.

import { DIVISION_ORDER } from '../identity/evidence.mjs';
import {
  available, boutView, days, insufficient, notApplicable, opponentQuality, rate, round4, sourceUnavailable,
} from './common.mjs';

const V = '1.0.0';
const PRO = 'professional';

function prepare(history) {
  const meId = history.fighter.id;
  const all = (history.bouts ?? []).map((b) => boutView(b, meId));
  const pro = all.filter((b) => b.competition_class === PRO);
  const withResult = pro.filter((b) => b.known);
  return { meId, cutoff: history.input_cutoff, all, pro, withResult, decided: withResult.filter((b) => b.decided) };
}

const def = (key, category, name, description, formula, requiredInputs, minimumSample, valueKind, unit, compute, sourceRequirements = {}) => ({
  metric_key: key, version: V, subject_kind: 'fighter', category, name, description, formula_text: formula,
  required_inputs: requiredInputs, minimum_sample: minimumSample, value_kind: valueKind, unit, source_requirements: sourceRequirements, compute,
});

const RESULT_INPUTS = ['bout.start', 'bout.competition_class', 'result.outcome', 'result.winner', 'result.method'];

export const FIGHTER_METRICS = [
  // ---------------- activity
  def('activity.pro_bouts', 'activity', 'Professional bouts',
    'Professional bouts with a known result in the PropBetEdge graph before the cutoff. Graph coverage may be incomplete for early careers.',
    'count(professional bouts started before cutoff with result outcome != unknown)', RESULT_INPUTS, { bouts: 0 }, 'number', 'bouts',
    (c) => available(c.withResult.length, c.withResult.length, { professional_bouts_without_result: c.pro.length - c.withResult.length })),
  def('activity.rounds_boxed', 'activity', 'Rounds boxed',
    'Rounds completed across professional bouts. Decisions count the scheduled rounds; stoppages count completed rounds plus the elapsed share of the final round when the stoppage time is sourced.',
    'sum(decision: scheduled_rounds; stoppage: (round-1) + time_sec/round_seconds when time known else (round-1))',
    [...RESULT_INPUTS, 'bout.scheduled_rounds', 'result.round', 'result.time_sec'], { bouts: 1 }, 'number', 'rounds',
    (c) => {
      const usable = c.withResult.filter((b) => b.roundsCompleted != null);
      if (usable.length < 1) return insufficient(usable.length, { bouts: 1 });
      return available(round4(usable.reduce((s, b) => s + b.roundsCompleted, 0)), usable.length,
        { excluded_missing_inputs: c.withResult.length - usable.length, stoppages_without_time: usable.filter((b) => b.partialUnknown).length });
    }),
  def('activity.days_since_last_bout', 'activity', 'Days since last bout', 'Whole days from the most recent professional bout start to the cutoff.',
    'floor((cutoff - max(bout.start)) / 1 day)', ['bout.start', 'bout.competition_class'], { bouts: 1 }, 'number', 'days',
    (c) => (c.pro.length ? available(days(c.pro.at(-1).starts_at, c.cutoff), c.pro.length) : insufficient(0, { bouts: 1 }))),
  def('activity.bouts_last_12_months', 'activity', 'Bouts in previous 12 months', 'Professional bouts that started in the 365 days before the cutoff.',
    'count(bout.start >= cutoff - 365 days)', ['bout.start', 'bout.competition_class'], { bouts: 0 }, 'number', 'bouts',
    (c) => { const n = c.pro.filter((b) => days(b.starts_at, c.cutoff) <= 365).length; return available(n, c.pro.length); }),
  def('activity.bouts_last_24_months', 'activity', 'Bouts in previous 24 months', 'Professional bouts that started in the 730 days before the cutoff.',
    'count(bout.start >= cutoff - 730 days)', ['bout.start', 'bout.competition_class'], { bouts: 0 }, 'number', 'bouts',
    (c) => { const n = c.pro.filter((b) => days(b.starts_at, c.cutoff) <= 730).length; return available(n, c.pro.length); }),
  def('activity.avg_days_between_bouts', 'activity', 'Average days between bouts', 'Mean gap in days between consecutive professional bouts.',
    '(last.start - first.start) / (bouts - 1)', ['bout.start', 'bout.competition_class'], { bouts: 2 }, 'number', 'days',
    (c) => (c.pro.length < 2 ? insufficient(c.pro.length, { bouts: 2 })
      : available(round4(days(c.pro[0].starts_at, c.pro.at(-1).starts_at) / (c.pro.length - 1)), c.pro.length))),

  // ---------------- results profile
  def('results.win_rate', 'results', 'Win rate', 'Wins over decided bouts (wins, losses, draws). No contests and no decisions are excluded from the denominator.',
    'wins / (wins + losses + draws)', RESULT_INPUTS, { decided_bouts: 5 }, 'rate', 'ratio',
    (c) => rate(c.decided.filter((b) => b.outcome === 'win').length, c.decided.length, 5)),
  def('results.stoppage_win_share', 'results', 'Share of wins by KO/TKO/RTD', 'Wins by KO, TKO or corner retirement over all wins. Describes how wins ended; not a measure of punch power.',
    'wins(method in KO,TKO,RTD) / wins', RESULT_INPUTS, { wins: 5 }, 'rate', 'ratio',
    (c) => { const wins = c.decided.filter((b) => b.outcome === 'win'); return rate(wins.filter((b) => b.stoppageWin).length, wins.length, 5); }),
  def('results.decision_win_share', 'results', 'Share of wins by decision', 'Wins by decision or technical decision over all wins.',
    'wins(method in DECISION,TECHNICAL_DECISION) / wins', RESULT_INPUTS, { wins: 5 }, 'rate', 'ratio',
    (c) => { const wins = c.decided.filter((b) => b.outcome === 'win'); return rate(wins.filter((b) => b.decisionWin).length, wins.length, 5); }),
  def('results.distance_rate', 'results', 'Distance rate', 'Bouts that went the scheduled distance (full decision, any outcome) over bouts with a known method.',
    'bouts(method = DECISION) / bouts(method known)', RESULT_INPUTS, { bouts: 5 }, 'rate', 'ratio',
    (c) => { const m = c.withResult.filter((b) => b.method); return rate(m.filter((b) => b.distance).length, m.length, 5); }),
  def('results.stoppage_loss_rate', 'results', 'Loss-by-stoppage rate', 'Losses by KO, TKO or corner retirement over decided bouts.',
    'losses(method in KO,TKO,RTD) / decided bouts', RESULT_INPUTS, { decided_bouts: 5 }, 'rate', 'ratio',
    (c) => rate(c.decided.filter((b) => b.stoppageLoss).length, c.decided.length, 5)),
  def('results.outcome_summary', 'results', 'Outcome summary', 'Counts of wins, losses, draws, no contests, no decisions and disqualifications, so rates can always be read against raw counts.',
    'counts by outcome and DQ direction', RESULT_INPUTS, { bouts: 0 }, 'json', null,
    (c) => available({
      wins: c.withResult.filter((b) => b.outcome === 'win').length, losses: c.withResult.filter((b) => b.outcome === 'loss').length,
      draws: c.withResult.filter((b) => b.outcome === 'draw').length, no_contests: c.withResult.filter((b) => b.outcome === 'no_contest').length,
      no_decisions: c.withResult.filter((b) => b.outcome === 'no_decision').length,
      dq_wins: c.withResult.filter((b) => b.outcome === 'win' && b.method === 'DQ').length,
      dq_losses: c.withResult.filter((b) => b.outcome === 'loss' && b.method === 'DQ').length,
    }, c.withResult.length)),

  // ---------------- finishing (record-derived)
  def('finishing.stoppage_win_rate', 'finishing', 'KO/TKO/RTD win frequency', 'Stoppage wins over decided bouts. Record-derived; says nothing about punch power by itself.',
    'wins(method in KO,TKO,RTD) / decided bouts', RESULT_INPUTS, { decided_bouts: 5 }, 'rate', 'ratio',
    (c) => rate(c.decided.filter((b) => b.stoppageWin).length, c.decided.length, 5)),
  def('finishing.opponent_adjusted_stoppage_win_rate', 'finishing', 'Opponent-adjusted stoppage win rate',
    'Stoppage-win indicator weighted by opponent quality entering each bout (pbe_opponent_quality@1). Bouts whose opponent record is unknown are excluded.',
    'sum(q_i * stoppage_win_i) / sum(q_i); q = 0.5*opp_win_pct_entering + 0.5*min(opp_prior_bouts,30)/30',
    [...RESULT_INPUTS, 'opponent.record_entering'], { decided_bouts_with_opponent_record: 5 }, 'rate', 'ratio',
    (c) => {
      const rows = c.decided.map((b) => ({ b, oq: opponentQuality(b) })).filter((x) => x.oq);
      const w = rows.reduce((s, x) => s + x.oq.q, 0);
      if (rows.length < 5) return insufficient(rows.length, { decided_bouts_with_opponent_record: 5 });
      if (w === 0) return notApplicable('all opponents were debutants (zero quality weight)', rows.length);
      return available(round4(rows.reduce((s, x) => s + x.oq.q * (x.b.stoppageWin ? 1 : 0), 0) / w), rows.length,
        { opponent_quality_formula: 'pbe_opponent_quality@1', sourced_records: rows.filter((x) => x.oq.basis === 'sourced').length });
    }),
  def('finishing.early_stoppage_share', 'finishing', 'Early stoppage share', 'Stoppage wins that ended in rounds 1-3 over stoppage wins with a known round.',
    'stoppage_wins(round <= 3) / stoppage_wins(round known)', [...RESULT_INPUTS, 'result.round'], { stoppage_wins: 3 }, 'rate', 'ratio',
    (c) => { const s = c.decided.filter((b) => b.stoppageWin && b.finishRound); return rate(s.filter((b) => b.finishRound <= 3).length, s.length, 3); }),
  def('finishing.late_stoppage_share', 'finishing', 'Late stoppage share', 'In bouts scheduled for more than 8 rounds, stoppage wins in round 9 or later over stoppage wins with a known round. Rounds up to 45 are supported.',
    'stoppage_wins(scheduled > 8, round >= 9) / stoppage_wins(scheduled > 8, round known)', [...RESULT_INPUTS, 'result.round', 'bout.scheduled_rounds'],
    { stoppage_wins_scheduled_beyond_8: 3 }, 'rate', 'ratio',
    (c) => { const s = c.decided.filter((b) => b.stoppageWin && b.finishRound && b.scheduledBeyond8); return rate(s.filter((b) => b.finishRound >= 9).length, s.length, 3); }),

  // ---------------- durability (record-derived; no "chin" fact)
  def('durability.stoppage_losses', 'durability', 'Stoppage losses', 'Count of losses by KO, TKO or corner retirement.',
    'count(losses with method in KO,TKO,RTD)', RESULT_INPUTS, { bouts: 0 }, 'number', 'bouts',
    (c) => available(c.decided.filter((b) => b.stoppageLoss).length, c.decided.length)),
  def('durability.knockdowns_suffered_per_bout', 'durability', 'Knockdowns suffered per bout',
    'Knockdowns suffered over bouts whose knockdowns a source declared complete. Bouts without coverage are excluded, never counted as zero.',
    'knockdowns_suffered / bouts_with_complete_knockdown_coverage', ['bout.knockdowns (complete coverage)'], { covered_bouts: 5 }, 'rate', 'per_bout',
    (c) => {
      const covered = c.pro.filter((b) => Array.isArray(b.knockdowns));
      if (!covered.length) return sourceUnavailable('no bouts with complete knockdown coverage from a source');
      return rate(covered.reduce((s, b) => s + b.knockdowns.filter((k) => k.down_is_me).length, 0), covered.length, 5, { uncovered_bouts: c.pro.length - covered.length });
    }, { stat_coverage: 'knockdowns' }),
  def('durability.rounds_completed_ratio', 'durability', 'Rounds completed ratio', 'Rounds completed over rounds scheduled, across bouts where both are known.',
    'sum(rounds_completed) / sum(scheduled_rounds)', [...RESULT_INPUTS, 'bout.scheduled_rounds', 'result.round'], { bouts: 5 }, 'rate', 'ratio',
    (c) => {
      const rows = c.withResult.filter((b) => b.roundsCompleted != null && b.scheduled_rounds);
      if (rows.length < 5) return insufficient(rows.length, { bouts: 5 });
      return available(round4(rows.reduce((s, b) => s + b.roundsCompleted, 0) / rows.reduce((s, b) => s + b.scheduled_rounds, 0)), rows.length);
    }),
  def('durability.reached_round_9_rate', 'durability', 'Reached round 9 rate', 'In bouts scheduled beyond 8 rounds, the share that lasted into round 9 or went the distance, whoever won.',
    'bouts(scheduled > 8 and (distance or finish_round >= 9)) / bouts(scheduled > 8, method known)', [...RESULT_INPUTS, 'bout.scheduled_rounds', 'result.round'],
    { bouts_scheduled_beyond_8: 3 }, 'rate', 'ratio',
    (c) => { const rows = c.withResult.filter((b) => b.scheduledBeyond8 && b.method && (b.distance || b.finishRound)); return rate(rows.filter((b) => b.distance || b.finishRound >= 9).length, rows.length, 3); }),
  def('durability.opponent_adjusted_stoppage_loss_rate', 'durability', 'Opponent-adjusted stoppage loss rate',
    'Stoppage-loss indicator weighted by opponent quality entering each bout (pbe_opponent_quality@1).',
    'sum(q_i * stoppage_loss_i) / sum(q_i)', [...RESULT_INPUTS, 'opponent.record_entering'], { decided_bouts_with_opponent_record: 5 }, 'rate', 'ratio',
    (c) => {
      const rows = c.decided.map((b) => ({ b, oq: opponentQuality(b) })).filter((x) => x.oq);
      const w = rows.reduce((s, x) => s + x.oq.q, 0);
      if (rows.length < 5) return insufficient(rows.length, { decided_bouts_with_opponent_record: 5 });
      if (w === 0) return notApplicable('all opponents were debutants (zero quality weight)', rows.length);
      return available(round4(rows.reduce((s, x) => s + x.oq.q * (x.b.stoppageLoss ? 1 : 0), 0) / w), rows.length, { opponent_quality_formula: 'pbe_opponent_quality@1' });
    }),

  // ---------------- output / jab-power (licensed punch stats only)
  ...['thrown_per_round', 'landed_per_round', 'total_accuracy', 'jab_attempt_share', 'jab_accuracy', 'power_accuracy', 'opponent_landed_per_round'].map((k) =>
    def(`output.${k}`, 'output', `Punch output: ${k.replace(/_/g, ' ')}`,
      'Computed only from round-by-round punch statistics whose source has approved rights (enabled, derivative use allowed) and declared complete coverage for the bout. Otherwise unavailable; never inferred.',
      {
        thrown_per_round: 'sum(total_attempted) / covered_rounds', landed_per_round: 'sum(total_landed) / covered_rounds',
        total_accuracy: 'sum(total_landed) / sum(total_attempted)', jab_attempt_share: 'sum(jab_attempted) / sum(total_attempted)',
        jab_accuracy: 'sum(jab_landed) / sum(jab_attempted)', power_accuracy: 'sum(power_landed) / sum(power_attempted)',
        opponent_landed_per_round: 'sum(opponent total_landed) / covered_rounds',
      }[k], ['punch_stats (approved source, complete coverage)'], { covered_rounds: 10 }, 'rate', k.endsWith('per_round') ? 'per_round' : 'ratio',
      (c) => {
        const covered = c.pro.filter((b) => Array.isArray(b.punch_stats) && b.punch_stats.length);
        if (!covered.length) return sourceUnavailable('no punch statistics from a rights-approved source with complete coverage');
        const mine = covered.flatMap((b) => b.punch_stats.filter((r) => r.is_me));
        const theirs = covered.flatMap((b) => b.punch_stats.filter((r) => !r.is_me));
        const n = mine.length;
        if (n < 10) return insufficient(n, { covered_rounds: 10 });
        // a field the source did not provide for any covered round makes the metric unavailable (null is never 0)
        const fields = {
          thrown_per_round: [mine, ['total_attempted']], landed_per_round: [mine, ['total_landed']], total_accuracy: [mine, ['total_landed', 'total_attempted']],
          jab_attempt_share: [mine, ['jab_attempted', 'total_attempted']], jab_accuracy: [mine, ['jab_landed', 'jab_attempted']],
          power_accuracy: [mine, ['power_landed', 'power_attempted']], opponent_landed_per_round: [theirs, ['total_landed']],
        }[k];
        const missing = fields[1].filter((f) => fields[0].length === 0 || fields[0].some((r) => r[f] == null));
        if (missing.length) return sourceUnavailable('source does not provide every required field for every covered round', { missing_fields: missing });
        const sum = (rows, f) => rows.reduce((s, r) => s + Number(r[f]), 0);
        const ratio = (a, b) => (b > 0 ? available(round4(a / b), n) : notApplicable('denominator is zero', n));
        switch (k) {
          case 'thrown_per_round': return available(round4(sum(mine, 'total_attempted') / n), n);
          case 'landed_per_round': return available(round4(sum(mine, 'total_landed') / n), n);
          case 'total_accuracy': return ratio(sum(mine, 'total_landed'), sum(mine, 'total_attempted'));
          case 'jab_attempt_share': return ratio(sum(mine, 'jab_attempted'), sum(mine, 'total_attempted'));
          case 'jab_accuracy': return ratio(sum(mine, 'jab_landed'), sum(mine, 'jab_attempted'));
          case 'power_accuracy': return ratio(sum(mine, 'power_landed'), sum(mine, 'power_attempted'));
          default: return available(round4(sum(theirs, 'total_landed') / theirs.length), theirs.length);
        }
      }, { stat_coverage: 'punch_stats', rights: 'enabled source with derivative_allowed' })),

  // ---------------- late fight (rounds 9+, up to 15 and beyond for historical bouts)
  def('late.bouts_scheduled_beyond_8', 'late', 'Bouts scheduled beyond 8 rounds', 'Professional bouts scheduled for 9 or more rounds (historical 15-round bouts included).',
    'count(scheduled_rounds > 8)', ['bout.scheduled_rounds', 'bout.competition_class'], { bouts: 0 }, 'number', 'bouts',
    (c) => available(c.pro.filter((b) => b.scheduledBeyond8).length, c.pro.length)),
  def('late.rounds_boxed_9_plus', 'late', 'Rounds boxed from round 9 on', 'Completed rounds numbered 9 or higher in bouts scheduled beyond 8 rounds.',
    'sum(max(rounds_completed - 8, 0)) over scheduled > 8', [...RESULT_INPUTS, 'bout.scheduled_rounds', 'result.round'], { bouts_scheduled_beyond_8: 1 }, 'number', 'rounds',
    (c) => {
      const rows = c.withResult.filter((b) => b.scheduledBeyond8 && b.roundsCompleted != null);
      if (!rows.length) return insufficient(0, { bouts_scheduled_beyond_8: 1 });
      return available(round4(rows.reduce((s, b) => s + Math.max(b.roundsCompleted - 8, 0), 0)), rows.length);
    }),
  def('late.stoppage_wins_after_round_8', 'late', 'Stoppage wins after round 8', 'Wins by KO, TKO or corner retirement in round 9 or later.',
    'count(stoppage wins with round >= 9)', [...RESULT_INPUTS, 'result.round'], { bouts: 0 }, 'number', 'bouts',
    (c) => available(c.decided.filter((b) => b.stoppageWin && b.finishRound >= 9).length, c.decided.length)),
  def('late.knockdowns_after_round_8', 'late', 'Knockdowns after round 8', 'Knockdowns scored and suffered in rounds 9+ of bouts scheduled beyond 8 rounds with complete knockdown coverage.',
    '{scored: count(round >= 9, opponent down), suffered: count(round >= 9, me down)} over covered bouts', ['bout.knockdowns (complete coverage)', 'bout.scheduled_rounds'],
    { covered_bouts_scheduled_beyond_8: 1 }, 'json', null,
    (c) => {
      const covered = c.pro.filter((b) => b.scheduledBeyond8 && Array.isArray(b.knockdowns));
      if (!covered.length) return sourceUnavailable('no bouts scheduled beyond 8 rounds with complete knockdown coverage');
      const late = covered.flatMap((b) => b.knockdowns.filter((k) => k.round >= 9));
      return available({ scored: late.filter((k) => !k.down_is_me).length, suffered: late.filter((k) => k.down_is_me).length }, covered.length);
    }, { stat_coverage: 'knockdowns' }),
  def('late.round_scoring_share_9_plus', 'late', 'Round scoring share, rounds 9+',
    'From stored official round-by-round cards: rounds numbered 9+ where the mean judge margin favoured the fighter, over rounds 9+ that were scored. Even rounds count in the denominator.',
    'rounds(r >= 9, mean_judges(me - opponent) > 0) / rounds(r >= 9 scored)', ['scorecard rounds (as of cutoff)'], { scored_rounds_9_plus: 6 }, 'rate', 'ratio',
    (c) => {
      let won = 0; let total = 0;
      for (const b of c.pro) {
        const byRound = new Map();
        for (const card of b.scorecards ?? []) {
          const meA = card.fighter_a_id === c.meId;
          for (const r of card.rounds ?? []) {
            if (r.round < 9) continue;
            const m = (meA ? Number(r.a) - Number(r.b) : Number(r.b) - Number(r.a));
            if (!byRound.has(r.round)) byRound.set(r.round, []);
            byRound.get(r.round).push(m);
          }
        }
        for (const margins of byRound.values()) {
          total++;
          if (margins.reduce((s, x) => s + x, 0) / margins.length > 0) won++;
        }
      }
      return rate(won, total, 6);
    }),

  // ---------------- experience / opposition
  def('opposition.avg_opponent_win_pct_entering', 'opposition', 'Average opponent win % entering', 'Mean opponent win percentage entering each bout (sourced record at bout time, else graph record before the bout).',
    'mean(opp_wins / opp_decided entering)', ['opponent.record_entering'], { bouts_with_opponent_record: 5 }, 'rate', 'ratio',
    (c) => { const q = c.pro.map(opponentQuality).filter(Boolean); return q.length < 5 ? insufficient(q.length, { bouts_with_opponent_record: 5 }) : available(round4(q.reduce((s, x) => s + x.winPct, 0) / q.length), q.length); }),
  def('opposition.avg_opponent_prior_bouts', 'opposition', 'Average opponent experience entering', 'Mean number of professional bouts opponents had before each bout.',
    'mean(opp_prior_bouts)', ['opponent.record_entering'], { bouts_with_opponent_record: 5 }, 'number', 'bouts',
    (c) => { const q = c.pro.map(opponentQuality).filter(Boolean); return q.length < 5 ? insufficient(q.length, { bouts_with_opponent_record: 5 }) : available(round4(q.reduce((s, x) => s + x.bouts, 0) / q.length), q.length); }),
  def('opposition.opponent_quality_index', 'opposition', 'Opponent quality index', 'Mean pbe_opponent_quality@1 across bouts. Uses only opponent records entering each bout: no rankings, no later results, so it is neither circular nor leaky.',
    'mean(0.5*opp_win_pct_entering + 0.5*min(opp_prior_bouts,30)/30)', ['opponent.record_entering'], { bouts_with_opponent_record: 5 }, 'score', 'index_0_1',
    (c) => { const q = c.pro.map(opponentQuality).filter(Boolean); return q.length < 5 ? insufficient(q.length, { bouts_with_opponent_record: 5 }) : available(round4(q.reduce((s, x) => s + x.q, 0) / q.length), q.length, { formula: 'pbe_opponent_quality@1' }); }),
  def('opposition.title_fights', 'opposition', 'Title fights', 'Professional bouts with at least one title at stake.',
    'count(bouts with a title at stake)', ['bout.titles'], { bouts: 0 }, 'number', 'bouts',
    (c) => available(c.pro.filter((b) => b.title_fight).length, c.pro.length)),
  def('opposition.championship_rounds_boxed', 'opposition', 'Championship rounds boxed', 'Completed rounds numbered 10 or higher in title fights (covers modern 12-round and historical 15-round title bouts).',
    'sum(max(rounds_completed - 9, 0)) over title fights', ['bout.titles', 'bout.scheduled_rounds', 'result.round'], { bouts: 0 }, 'number', 'rounds',
    (c) => { const rows = c.withResult.filter((b) => b.title_fight && b.roundsCompleted != null); return available(round4(rows.reduce((s, b) => s + Math.max(b.roundsCompleted - 9, 0), 0)), rows.length); }),

  // ---------------- division movement (no inference about weight cutting)
  def('division.current', 'division', 'Current division', 'Weight class of the most recent professional bout with a weight class.',
    'weight_class_key of latest bout', ['bout.weight_class'], { bouts_with_division: 1 }, 'category', null,
    (c) => { const d = c.pro.filter((b) => b.weight_class_key); return d.length ? available(d.at(-1).weight_class_key, d.length) : insufficient(0, { bouts_with_division: 1 }); }),
  def('division.recent', 'division', 'Recent divisions', 'Weight classes of the last five professional bouts, most recent first.',
    'weight_class_key of last 5 bouts', ['bout.weight_class'], { bouts_with_division: 1 }, 'json', null,
    (c) => { const d = c.pro.filter((b) => b.weight_class_key); return d.length ? available(d.slice(-5).reverse().map((b) => b.weight_class_key), d.length) : insufficient(0, { bouts_with_division: 1 }); }),
  def('division.bouts_at_current', 'division', 'Consecutive bouts at current division', 'Consecutive most-recent bouts in the current weight class.',
    'length of latest same-division streak', ['bout.weight_class'], { bouts_with_division: 1 }, 'number', 'bouts',
    (c) => {
      const d = c.pro.filter((b) => b.weight_class_key);
      if (!d.length) return insufficient(0, { bouts_with_division: 1 });
      let n = 0; for (let i = d.length - 1; i >= 0 && d[i].weight_class_key === d.at(-1).weight_class_key; i--) n++;
      return available(n, d.length);
    }),
  def('division.days_since_change', 'division', 'Days since division change', 'Days from the first bout of the current division streak to the cutoff. Not applicable if the fighter never changed division in the graph.',
    'cutoff - start of latest same-division streak', ['bout.weight_class', 'bout.start'], { bouts_with_division: 2 }, 'number', 'days',
    (c) => {
      const d = c.pro.filter((b) => b.weight_class_key);
      if (d.length < 2) return insufficient(d.length, { bouts_with_division: 2 });
      let i = d.length - 1; while (i > 0 && d[i - 1].weight_class_key === d.at(-1).weight_class_key) i--;
      if (i === 0) return notApplicable('no division change in the graph', d.length);
      return available(days(d[i].starts_at, c.cutoff), d.length);
    }),
  def('division.last_move', 'division', 'Last division move', 'Direction of the most recent division change (up or down by weight). No claim about weight cutting.',
    'sign(order(current) - order(previous division))', ['bout.weight_class'], { bouts_with_division: 2 }, 'category', null,
    (c) => {
      const d = c.pro.filter((b) => b.weight_class_key);
      if (d.length < 2) return insufficient(d.length, { bouts_with_division: 2 });
      let i = d.length - 1; while (i > 0 && d[i - 1].weight_class_key === d.at(-1).weight_class_key) i--;
      if (i === 0) return notApplicable('no division change in the graph', d.length);
      const delta = DIVISION_ORDER.indexOf(d[i].weight_class_key) - DIVISION_ORDER.indexOf(d[i - 1].weight_class_key);
      return available(delta > 0 ? 'up' : 'down', d.length, { from: d[i - 1].weight_class_key, to: d[i].weight_class_key });
    }),

  // ---------------- stance matchup
  ...['orthodox', 'southpaw'].map((stance) => def(`stance.win_rate_vs_${stance}`, 'stance', `Win rate vs ${stance}`,
    `Wins over decided bouts against opponents whose recorded stance is ${stance}. Stance is the opponent's recorded stance, not necessarily their stance on the night.`,
    `wins / decided bouts where opponent.stance = ${stance}`, [...RESULT_INPUTS, 'opponent.stance'], { decided_bouts_vs_stance: 5 }, 'rate', 'ratio',
    (c) => { const rows = c.decided.filter((b) => b.opponent?.stance === stance); return rate(rows.filter((b) => b.outcome === 'win').length, rows.length, 5); })),
];

export function computeFighterMetrics(history) {
  const ctx = prepare(history);
  return FIGHTER_METRICS.map((m) => {
    const r = m.compute(ctx);
    return {
      metric_key: m.metric_key, metric_version: m.version, status: r.status, sample_size: r.sample_size, sample_context: r.sample_context,
      value_number: m.value_kind === 'category' || m.value_kind === 'json' ? null : r.value,
      value_text: m.value_kind === 'category' ? r.value : null,
      value_json: m.value_kind === 'json' ? r.value : null,
    };
  });
}

export const definitionPayload = (m) => {
  const { compute, ...rest } = m;
  return rest;
};
