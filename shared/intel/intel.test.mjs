import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fairMarket, fairOdds } from './fair-odds.mjs';
import { boutView, opponentQuality, rate } from './common.mjs';
import { FIGHTER_METRICS, computeFighterMetrics, definitionPayload } from './fighter-metrics.mjs';
import { OFFICIAL_METRICS, computeOfficialMetrics } from './official-metrics.mjs';
import { buildMatchupFeatures } from './matchup.mjs';

const ME = 'f-me';
const OPP = (n, stance = 'orthodox') => ({ id: `opp-${n}`, stance, record_entering_sourced: null, record_entering_graph: { wins: n, losses: 1, draws: 0, bouts: n + 1 } });
let seq = 0;
function bout({ date, rounds = 12, outcome = 'win', method = 'DECISION', round = null, time = null, wc = 'welterweight', stance = 'orthodox', title = false, cards, knockdowns, punches }) {
  seq += 1;
  return {
    bout_id: `b-${seq}`, starts_at: `${date}T20:00:00Z`, competition_class: 'professional', scheduled_rounds: rounds, round_minutes: 3,
    weight_class_key: wc, title_fight: title, side: 'a', opponent: OPP(seq, stance),
    result: { outcome: outcome === 'loss' ? 'win' : outcome, winner_id: outcome === 'win' ? ME : outcome === 'loss' ? `opp-${seq}` : null, method, round, time_sec: time },
    knockdowns: knockdowns ?? null, punch_stats: punches ?? null, scorecards: cards ?? [],
  };
}
const history = (bouts, cutoff = '2026-09-01T00:00:00Z', fighter = {}) => ({ fighter: { id: ME, dob: '1996-09-01', height_cm: 180, reach_cm: 190, stance: 'orthodox', ...fighter }, input_cutoff: cutoff, bouts });
const byKey = (rows) => Object.fromEntries(rows.map((r) => [r.metric_key, r]));

test('fair odds: decimal is 1/p, American follows the favourite/underdog convention', () => {
  // even money is written -100 (p >= 0.5 is priced negative), matching the database check
  assert.deepEqual(fairOdds(0.5), { probability: 0.5, fair_decimal: 2, fair_american: -100 });
  assert.deepEqual(fairOdds(0.75), { probability: 0.75, fair_decimal: 1.333333, fair_american: -300 });
  assert.deepEqual(fairOdds(0.2), { probability: 0.2, fair_decimal: 5, fair_american: 400 });
  assert.equal(fairOdds(0.6).fair_american, -150);
  assert.equal(fairOdds(0.4).fair_american, 150);
  for (const bad of [0, 1, -0.1, 1.2, Number.NaN, null]) assert.throws(() => fairOdds(bad));
  const m = fairMarket({ a: 0.55, b: 0.4, draw: 0.05 });
  assert.equal(m.draw.fair_decimal, 20);
  assert.throws(() => fairMarket({ a: 0.55, b: 0.55 }), /sum to 1/);
  assert.throws(() => fairMarket({ a: 1 }));
});

test('rate() never produces a value below the minimum sample', () => {
  assert.deepEqual(rate(3, 4, 5), { status: 'insufficient_sample', value: null, sample_size: 4, sample_context: { minimum_required: 5 } });
  assert.equal(rate(3, 5, 5).value, 0.6);
});

test('boutView: rounds completed, 15-round bouts, unknown stays null', () => {
  const b = boutView({ scheduled_rounds: 15, round_minutes: 3, result: { outcome: 'win', winner_id: ME, method: 'TKO', round: 14, time_sec: 90 } }, ME);
  assert.equal(b.roundsCompleted, 13.5);
  assert.equal(b.scheduledBeyond8, true);
  const noTime = boutView({ scheduled_rounds: 10, round_minutes: 3, result: { outcome: 'win', winner_id: 'x', method: 'KO', round: 3 } }, ME);
  assert.deepEqual([noTime.outcome, noTime.roundsCompleted, noTime.partialUnknown, noTime.stoppageLoss], ['loss', 2, true, true]);
  const unknown = boutView({ scheduled_rounds: 10, result: null }, ME);
  assert.deepEqual([unknown.known, unknown.outcome, unknown.roundsCompleted], [false, null, null]);
});

test('opponent quality: sourced record wins over graph record; debutant scores 0', () => {
  assert.deepEqual(opponentQuality({ opponent: { record_entering_sourced: { wins: 15, losses: 5, draws: 0 }, record_entering_graph: { wins: 1, losses: 0, bouts: 1 } } }),
    { q: 0.5 * 0.75 + 0.5 * (20 / 30), winPct: 0.75, bouts: 20, basis: 'sourced' });
  assert.equal(opponentQuality({ opponent: { record_entering_graph: { wins: 0, losses: 0, draws: 0, bouts: 0 } } }).q, 0);
  assert.equal(opponentQuality({ opponent: { record_entering_graph: null } }), null);
});

test('fighter metrics: no punch or knockdown data means source_unavailable, never zero', () => {
  const rows = computeFighterMetrics(history(Array.from({ length: 8 }, (_, i) => bout({ date: `201${i}-05-01` }))));
  const m = byKey(rows);
  for (const k of ['output.thrown_per_round', 'output.landed_per_round', 'output.total_accuracy', 'output.jab_accuracy', 'output.power_accuracy', 'durability.knockdowns_suffered_per_bout', 'late.knockdowns_after_round_8']) {
    assert.equal(m[k].status, 'source_unavailable', k);
    assert.equal(m[k].value_number, null, k);
    assert.equal(m[k].value_json, null, k);
  }
  for (const r of rows) {
    if (r.status !== 'available') assert.ok(r.value_number === null && r.value_text === null && r.value_json === null, `${r.metric_key} carries a value while ${r.status}`);
  }
});

test('punch metrics: a field the source never provided stays unavailable instead of counting as zero', () => {
  const rounds = (n) => Array.from({ length: n }, (_, i) => [
    { round: i + 1, is_me: true, total_landed: 20, total_attempted: 50, jab_landed: null, jab_attempted: null, power_landed: null, power_attempted: null },
    { round: i + 1, is_me: false, total_landed: 10, total_attempted: 40, jab_landed: null, jab_attempted: null, power_landed: null, power_attempted: null },
  ]).flat();
  const m = byKey(computeFighterMetrics(history([bout({ date: '2025-01-01', punches: rounds(12) })])));
  assert.equal(m['output.thrown_per_round'].value_number, 50);
  assert.equal(m['output.total_accuracy'].value_number, 0.4);
  assert.equal(m['output.opponent_landed_per_round'].value_number, 10);
  for (const k of ['output.jab_attempt_share', 'output.jab_accuracy', 'output.power_accuracy']) {
    assert.equal(m[k].status, 'source_unavailable', k);
    assert.equal(m[k].value_number, null, k);
  }
  assert.deepEqual(m['output.jab_accuracy'].sample_context.missing_fields, ['jab_landed', 'jab_attempted']);
  assert.equal(byKey(computeFighterMetrics(history([bout({ date: '2025-01-01', punches: rounds(4) })])))['output.thrown_per_round'].status, 'insufficient_sample');
});

test('fighter metrics: 15-round title fights count as late rounds and championship rounds', () => {
  const bouts = [
    bout({ date: '1985-01-01', rounds: 15, title: true, method: 'KO', round: 14, time: 60 }),
    bout({ date: '1985-06-01', rounds: 15, title: true, method: 'DECISION' }),
  ];
  const m = byKey(computeFighterMetrics(history(bouts, '1986-01-01T00:00:00Z')));
  // KO 14 at 1:00 -> 13 + 1/3 completed; decision 15
  assert.equal(m['late.rounds_boxed_9_plus'].value_number, round(5 + 1 / 3 + 7));
  assert.equal(m['opposition.championship_rounds_boxed'].value_number, round(4 + 1 / 3 + 6));
  assert.equal(m['late.stoppage_wins_after_round_8'].value_number, 1);
});
const round = (x) => Math.round(x * 10_000) / 10_000;

test('fighter metrics: division movement and stance samples', () => {
  const bouts = [
    ...Array.from({ length: 3 }, (_, i) => bout({ date: `201${i}-01-01`, wc: 'middleweight', stance: 'southpaw' })),
    ...Array.from({ length: 3 }, (_, i) => bout({ date: `201${i + 5}-01-01`, wc: 'super_middleweight', stance: 'southpaw', outcome: i === 0 ? 'loss' : 'win' })),
  ];
  const m = byKey(computeFighterMetrics(history(bouts, '2020-01-01T00:00:00Z')));
  assert.equal(m['division.current'].value_text, 'super_middleweight');
  assert.equal(m['division.last_move'].value_text, 'up');
  assert.deepEqual(m['division.last_move'].sample_context, { from: 'middleweight', to: 'super_middleweight' });
  assert.equal(m['division.bouts_at_current'].value_number, 3);
  assert.equal(m['stance.win_rate_vs_southpaw'].value_number, 0.8333);
  assert.equal(m['stance.win_rate_vs_orthodox'].status, 'insufficient_sample');
  const once = byKey(computeFighterMetrics(history(bouts.slice(0, 3), '2020-01-01T00:00:00Z')));
  assert.equal(once['division.last_move'].status, 'not_applicable');
});

test('official metrics: small samples return null; nothing labelled qualitatively', () => {
  const official = { id: 'j1' };
  const cards = [{ judge_id: 'j1', a_total: 115, b_total: 113, rounds: [] }, { judge_id: 'j2', a_total: 114, b_total: 114 }, { judge_id: 'j3', a_total: 113, b_total: 115 }];
  const rows = byKey(computeOfficialMetrics({ official, input_cutoff: '2026-01-01', bouts: [{ bout_id: 'x', scheduled_rounds: 12, result: { outcome: 'draw', method: 'DECISION', decision_type: 'split' }, scorecards: cards }] }));
  assert.equal(rows['judge.bouts_scored'].value_number, 1);
  assert.equal(rows['judge.avg_card_margin'].status, 'insufficient_sample');
  assert.equal(rows['judge.avg_card_margin'].value_number, null);
  assert.equal(rows['referee.stoppage_rate'].status, 'insufficient_sample');
  const text = JSON.stringify([...FIGHTER_METRICS, ...OFFICIAL_METRICS].map(definitionPayload)).toLowerCase();
  for (const word of ['corrupt', 'biased', 'bad judge', 'robbery', 'rigged', 'chin', 'punching power', 'weight cut', 'drained']) {
    const hits = text.match(new RegExp(`[^.]*${word}[^.]*`, 'g')) ?? [];
    // the only permitted mentions are explicit disclaimers
    for (const h of hits) assert.match(h, /\bnot\b|\bno claim\b|\bno inference\b/, `definition text uses "${word}" without a disclaimer: ${h}`);
  }
});

test('definitions are complete and frozen-shape (version, formula, inputs, minimum sample)', () => {
  const keys = new Set();
  for (const m of [...FIGHTER_METRICS, ...OFFICIAL_METRICS]) {
    const d = definitionPayload(m);
    assert.ok(!('compute' in d));
    for (const f of ['metric_key', 'version', 'subject_kind', 'category', 'name', 'description', 'formula_text', 'required_inputs', 'minimum_sample', 'value_kind']) {
      assert.ok(d[f] != null && d[f] !== '', `${m.metric_key}.${f}`);
    }
    assert.ok(!keys.has(`${d.subject_kind}:${d.metric_key}`), `duplicate ${d.metric_key}`);
    keys.add(`${d.subject_kind}:${d.metric_key}`);
  }
});

test('matchup features: differentials only between available metrics; raw values embedded', () => {
  const many = Array.from({ length: 8 }, (_, i) => bout({ date: `201${i}-05-01`, method: i % 2 ? 'DECISION' : 'TKO', round: i % 2 ? null : 5, time: i % 2 ? null : 30 }));
  const few = [bout({ date: '2025-01-01' })];
  const f = buildMatchupFeatures({
    bout: { bout_id: 'up', scheduled_rounds: 12, weight_class_key: 'welterweight', title_fight: false },
    historyA: history(many), historyB: { ...history(few, '2026-09-01T00:00:00Z', { stance: 'southpaw', reach_cm: null, dob: null }), fighter: { id: 'f-b', stance: 'southpaw', height_cm: 175, reach_cm: null, dob: null } },
    cutoff: '2026-09-01T00:00:00Z',
  });
  assert.equal(f.features.differentials.height_cm, 5);
  assert.equal(f.features.differentials.reach_cm, null);
  assert.equal(f.features.differentials.age_years, null);
  assert.equal(f.features.differentials.stoppage_win_rate, null, 'B has too few bouts');
  assert.equal(f.features.differentials.experience_pro_bouts, 7);
  assert.equal(f.features.fighter_a.metrics['results.win_rate'].value, 1);
  assert.equal(f.features.stance.interaction, 'orthodox_vs_southpaw');
  assert.equal(f.metric_versions['results.win_rate'], '1.0.0');
  assert.equal(f.features.input_cutoff, '2026-09-01T00:00:00.000Z');
});
