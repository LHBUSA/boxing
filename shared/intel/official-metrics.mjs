// Judge DNA and Referee DNA (v1.0.0). Pure.
//
// Descriptive statistics over stored official records only: scorecards as
// they stood at the cutoff and bouts the official refereed. No qualitative
// labels, no accusations; every value carries its sample size, and a small
// sample returns insufficient_sample instead of a number.

import { available, boutView, insufficient, rate, round4, STOPPAGE_METHODS } from './common.mjs';

const V = '1.0.0';
const def = (key, category, name, description, formula, requiredInputs, minimumSample, valueKind, unit, compute) => ({
  metric_key: key, version: V, subject_kind: 'official', category, name, description, formula_text: formula,
  required_inputs: requiredInputs, minimum_sample: minimumSample, value_kind: valueKind, unit, source_requirements: {}, compute,
});

const winnerOf = (card) => (Number(card.a_total) > Number(card.b_total) ? 'a' : Number(card.b_total) > Number(card.a_total) ? 'b' : 'draw');

function prepare(history) {
  const meId = history.official.id;
  const bouts = history.bouts ?? [];
  const judged = bouts
    .map((b) => ({ b, mine: (b.scorecards ?? []).find((c) => c.judge_id === meId && c.scorer_role !== 'referee') }))
    .filter((x) => x.mine);
  const refereed = bouts.filter((b) => b.refereed).map((b) => ({ ...b, view: boutView(b, null) }));
  return { meId, judged, refereed };
}

export const JUDGE_METRICS = [
  def('judge.bouts_scored', 'judge', 'Bouts scored', 'Bouts with a stored card by this judge, as the card stood at the cutoff.',
    'count(bouts with judge card)', ['scorecards'], { bouts: 0 }, 'number', 'bouts', (c) => available(c.judged.length, c.judged.length)),
  def('judge.rounds_scored', 'judge', 'Rounds scored', 'Round-by-round entries on this judge\'s stored cards.',
    'count(scorecard rounds)', ['scorecard rounds'], { bouts: 0 }, 'number', 'rounds',
    (c) => available(c.judged.reduce((s, x) => s + (x.mine.rounds ?? []).length, 0), c.judged.length)),
  def('judge.avg_card_margin', 'judge', 'Average card margin', 'Mean absolute points gap between the two fighters on this judge\'s final cards.',
    'mean(|a_total - b_total|)', ['scorecards'], { bouts: 10 }, 'number', 'points',
    (c) => { const rows = c.judged.filter((x) => x.mine.a_total != null && x.mine.b_total != null); return rows.length < 10 ? insufficient(rows.length, { bouts: 10 }) : available(round4(rows.reduce((s, x) => s + Math.abs(Number(x.mine.a_total) - Number(x.mine.b_total)), 0) / rows.length), rows.length); }),
  def('judge.panel_disagreement_rate', 'judge', 'Different winner from the rest of the panel',
    'Share of comparable bouts where this judge\'s card winner (a, b or even) differed from the majority winner of the other judges\' cards. Comparable = at least two other cards with a majority.',
    'bouts(my_winner != majority(other winners)) / comparable bouts', ['scorecards (3-judge panels)'], { comparable_bouts: 10 }, 'rate', 'ratio',
    (c) => {
      let diff = 0; let n = 0;
      for (const { b, mine } of c.judged) {
        const others = (b.scorecards ?? []).filter((x) => x.judge_id !== c.meId && x.scorer_role !== 'referee').map(winnerOf);
        if (others.length < 2) continue;
        const counts = others.reduce((m, w) => ({ ...m, [w]: (m[w] ?? 0) + 1 }), {});
        const [top, topN] = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
        if (topN <= others.length / 2) continue;
        n++;
        if (winnerOf(mine) !== top) diff++;
      }
      return rate(diff, n, 10);
    }),
  ...['split', 'majority'].map((type) => def(`judge.${type}_decision_involvement`, 'judge', `${type[0].toUpperCase()}${type.slice(1)}-decision involvement`,
    `Share of this judge's decision bouts whose official result was a ${type} decision (win or draw).`,
    `bouts(result.decision_type = ${type}) / bouts(result.method in DECISION, TECHNICAL_DECISION)`, ['scorecards', 'result'], { decision_bouts: 10 }, 'rate', 'ratio',
    (c) => { const d = c.judged.filter((x) => ['DECISION', 'TECHNICAL_DECISION'].includes(x.b.result?.method)); return rate(d.filter((x) => x.b.result?.decision_type === type).length, d.length, 10); })),
  def('judge.round_10_10_rate', 'judge', '10-10 round frequency', 'Rounds scored even (equal points) over rounds scored.',
    'rounds(a = b) / rounds scored', ['scorecard rounds'], { rounds: 60 }, 'rate', 'ratio',
    (c) => { const r = c.judged.flatMap((x) => x.mine.rounds ?? []); return rate(r.filter((x) => Number(x.a) === Number(x.b)).length, r.length, 60); }),
  def('judge.round_10_8_rate', 'judge', '10-8 (or wider) round frequency', 'Rounds with a margin of two or more points over rounds scored.',
    'rounds(|a - b| >= 2) / rounds scored', ['scorecard rounds'], { rounds: 60 }, 'rate', 'ratio',
    (c) => { const r = c.judged.flatMap((x) => x.mine.rounds ?? []); return rate(r.filter((x) => Math.abs(Number(x.a) - Number(x.b)) >= 2).length, r.length, 60); }),
  def('judge.round_consensus_distance', 'judge', 'Distance from panel consensus per round',
    'Mean absolute difference between this judge\'s round margin and the mean margin of the other judges for the same round, over rounds scored by at least two other judges.',
    'mean(|my_margin_r - mean(other_margins_r)|)', ['scorecard rounds (3-judge panels)'], { rounds: 60 }, 'number', 'points',
    (c) => {
      const d = [];
      for (const { b, mine } of c.judged) {
        const others = (b.scorecards ?? []).filter((x) => x.judge_id !== c.meId && x.scorer_role !== 'referee');
        for (const r of mine.rounds ?? []) {
          const om = others.map((o) => (o.rounds ?? []).find((x) => x.round === r.round)).filter(Boolean).map((x) => Number(x.a) - Number(x.b));
          if (om.length < 2) continue;
          d.push(Math.abs((Number(r.a) - Number(r.b)) - om.reduce((s, x) => s + x, 0) / om.length));
        }
      }
      return d.length < 60 ? insufficient(d.length, { rounds: 60 }) : available(round4(d.reduce((s, x) => s + x, 0) / d.length), d.length);
    }),
  def('judge.title_fight_assignments', 'judge', 'Title fights scored', 'Bouts with a title at stake that this judge scored.',
    'count(judged bouts with a title at stake)', ['scorecards', 'bout.titles'], { bouts: 0 }, 'number', 'bouts',
    (c) => available(c.judged.filter((x) => x.b.title_fight).length, c.judged.length)),
  def('judge.jurisdictions', 'judge', 'Jurisdiction history', 'Bouts scored per regulating commission.',
    'count by commission', ['scorecards', 'event.commission'], { bouts: 0 }, 'json', null,
    (c) => available(c.judged.reduce((m, x) => { const k = x.b.commission ?? 'unknown'; return { ...m, [k]: (m[k] ?? 0) + 1 }; }, {}), c.judged.length)),
];

export const REFEREE_METRICS = [
  def('referee.bouts_refereed', 'referee', 'Bouts refereed', 'Bouts with an active referee assignment and a known result at the cutoff.',
    'count(refereed bouts with result)', ['bout officials', 'result'], { bouts: 0 }, 'number', 'bouts',
    (c) => { const n = c.refereed.filter((b) => b.view.known).length; return available(n, n); }),
  def('referee.stoppage_rate', 'referee', 'Stoppage rate', 'Bouts ending by KO, TKO or corner retirement over refereed bouts with a known result.',
    'bouts(method in KO,TKO,RTD) / refereed bouts with result', ['bout officials', 'result'], { bouts: 10 }, 'rate', 'ratio',
    (c) => { const k = c.refereed.filter((b) => b.view.known); return rate(k.filter((b) => STOPPAGE_METHODS.has(b.view.method)).length, k.length, 10); }),
  def('referee.avg_stoppage_round', 'referee', 'Average stoppage round', 'Mean round of KO/TKO/RTD stoppages with a known round.',
    'mean(result.round over stoppages)', ['bout officials', 'result.round'], { stoppages: 5 }, 'number', 'round',
    (c) => { const s = c.refereed.filter((b) => STOPPAGE_METHODS.has(b.view.method) && b.view.finishRound); return s.length < 5 ? insufficient(s.length, { stoppages: 5 }) : available(round4(s.reduce((t, b) => t + b.view.finishRound, 0) / s.length), s.length); }),
  def('referee.ko_tko_stoppages', 'referee', 'KO/TKO/RTD stoppages', 'Count of refereed bouts ending by KO, TKO or corner retirement.',
    'count(method in KO,TKO,RTD)', ['bout officials', 'result'], { bouts: 0 }, 'number', 'bouts',
    (c) => { const k = c.refereed.filter((b) => b.view.known); return available(k.filter((b) => STOPPAGE_METHODS.has(b.view.method)).length, k.length); }),
  def('referee.disqualifications', 'referee', 'Disqualifications', 'Count of refereed bouts ending by disqualification.',
    'count(method = DQ)', ['bout officials', 'result'], { bouts: 0 }, 'number', 'bouts',
    (c) => { const k = c.refereed.filter((b) => b.view.known); return available(k.filter((b) => b.view.method === 'DQ').length, k.length); }),
  def('referee.point_deductions_per_bout', 'referee', 'Point deductions per bout', 'Stored point deductions over refereed bouts.',
    'sum(point deductions) / refereed bouts', ['bout officials', 'point deductions'], { bouts: 10 }, 'rate', 'per_bout',
    (c) => rate(c.refereed.reduce((s, b) => s + Number(b.point_deductions ?? 0), 0), c.refereed.length, 10, { total_deductions: c.refereed.reduce((s, b) => s + Number(b.point_deductions ?? 0), 0) })),
  def('referee.title_fights', 'referee', 'Title fights refereed', 'Refereed bouts with a title at stake.',
    'count(refereed bouts with a title at stake)', ['bout officials', 'bout.titles'], { bouts: 0 }, 'number', 'bouts',
    (c) => available(c.refereed.filter((b) => b.title_fight).length, c.refereed.length)),
  def('referee.avg_completed_rounds', 'referee', 'Average completed rounds', 'Mean rounds completed per refereed bout where it is computable (decisions: scheduled rounds; stoppages: completed rounds plus elapsed share when time is known).',
    'mean(rounds_completed)', ['bout officials', 'result', 'bout.scheduled_rounds'], { bouts: 10 }, 'number', 'rounds',
    (c) => { const r = c.refereed.filter((b) => b.view.roundsCompleted != null); return r.length < 10 ? insufficient(r.length, { bouts: 10 }) : available(round4(r.reduce((s, b) => s + b.view.roundsCompleted, 0) / r.length), r.length); }),
];

export const OFFICIAL_METRICS = [...JUDGE_METRICS, ...REFEREE_METRICS];

export function computeOfficialMetrics(history) {
  const ctx = prepare(history);
  return OFFICIAL_METRICS.map((m) => {
    const r = m.compute(ctx);
    return {
      metric_key: m.metric_key, metric_version: m.version, status: r.status, sample_size: r.sample_size ?? 0, sample_context: r.sample_context,
      value_number: m.value_kind === 'json' || m.value_kind === 'category' ? null : r.value,
      value_text: m.value_kind === 'category' ? r.value : null,
      value_json: m.value_kind === 'json' ? r.value : null,
    };
  });
}
