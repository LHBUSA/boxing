// Issue #6 acceptance on a real database: Fight DNA, point-in-time safety,
// Judge/Referee DNA, matchup snapshots, model registry. All data synthetic.
// Expected values are computed BY HAND in the comments, not by the engine.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { asRole, expectPgError, freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { buildMatchupSnapshot, computeFighterDna, computeOfficialDna, registerDefinitions, runFighterDna } from '../../shared/intel/engine.mjs';
import { fairOdds } from '../../shared/intel/fair-odds.mjs';

let db;
let store;
let src;
const F = {};
const B = {};
const O = {};
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const CUTOFF = '2026-09-01T00:00:00Z';

async function boxer(key, name, extra = {}) {
  F[key] = (await one(`insert into public.boxing_fighters (display_name, dob, stance, height_cm, reach_cm, identity_state)
    values ($1, $2, $3, $4, $5, 'source_native') returning id`, [name, extra.dob ?? null, extra.stance ?? null, extra.height ?? null, extra.reach ?? null])).id;
}

async function bout(key, { date, a, b, rounds = 12, wc = 'welterweight', title = false, commission = null, cls = 'professional' }) {
  const evt = await one(`insert into public.boxing_events (source_id, name, event_date, start_at, status, commission_id)
    values ($1, $2, $3::date, ($3 || 'T20:00:00Z')::timestamptz, 'complete', $4) returning id`, [src.id, `Card ${key}`, date, commission]);
  const bt = await one(`insert into public.boxing_bouts (event_id, source_id, weight_class_id, scheduled_rounds, round_minutes, competition_class, status)
    values ($1, $2, (select id from public.boxing_weight_classes where class_key = $3), $4, 3, $5, 'complete') returning id`, [evt.id, src.id, wc, rounds, cls]);
  await q(`insert into public.boxing_bout_participants (bout_id, fighter_id, side, source_id) values ($1, $2, 'a', $4), ($1, $3, 'b', $4)`, [bt.id, F[a], F[b], src.id]);
  if (title) {
    const t = await one(`select public.boxing_ensure_title('wbc', $1, 'male', 'world', null) as id`, [wc]);
    await q(`insert into public.boxing_bout_titles (bout_id, title_id, source_id) values ($1, $2, $3)`, [bt.id, t.id, src.id]);
  }
  B[key] = bt.id;
  return bt.id;
}

async function result(key, { outcome, winner = null, method, decision = null, round = null, time = null, revision = 1, supersedes = null, decidedAt = null, state = 'official' }) {
  return one(`insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, decision_type, round, time_sec, revision, supersedes_id, decided_at, result_state)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
  [B[key], src.id, outcome, winner ? F[winner] : null, method, decision, round, time, revision, supersedes, decidedAt, state]);
}

async function official(key, name, type) {
  O[key] = (await one(`insert into public.boxing_officials (display_name, official_type, identity_state) values ($1, $2, 'source_native') returning id`, [name, type])).id;
}
const assign = (boutKey, officialKey, role, slot = null) => q(
  `insert into public.boxing_bout_officials (bout_id, official_id, role, slot, source_id) values ($1, $2, $3, $4, $5)`, [B[boutKey], O[officialKey], role, slot, src.id]);

// rounds where side a wins `aRounds` of 12 (10-9 each); totals follow exactly
const rounds12 = (aRounds) => Array.from({ length: 12 }, (_, i) => (i < aRounds ? { round: i + 1, a: 10, b: 9 } : { round: i + 1, a: 9, b: 10 }));
async function card(boutKey, judgeKey, aRounds, slot, { capturedAt = null, revision = 1, supersedes = null } = {}) {
  const rs = rounds12(aRounds);
  const a = rs.reduce((s, r) => s + r.a, 0);
  const b = rs.reduce((s, r) => s + r.b, 0);
  const parts = await q(`select fighter_id, side from public.boxing_bout_participants where bout_id = $1 order by side`, [B[boutKey]]);
  const c = await one(`insert into public.boxing_scorecards (bout_id, judge_id, fighter_a_id, fighter_b_id, fighter_a_total, fighter_b_total, source_id, slot, revision, supersedes_id, card_state, captured_at)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, coalesce($12::timestamptz, now())) returning id`,
  [B[boutKey], O[judgeKey], parts[0].fighter_id, parts[1].fighter_id, a, b, src.id, slot, revision, supersedes, revision > 1 ? 'corrected' : 'official', capturedAt]);
  for (const r of rs) await q(`insert into public.boxing_scorecard_rounds (scorecard_id, round, fighter_a_points, fighter_b_points) values ($1, $2, $3, $4)`, [c.id, r.round, r.a, r.b]);
  return c.id;
}

const factChecksum = () => one(`select md5(string_agg(t, '|' order by t)) h from (
  select 'f' || md5(string_agg(to_jsonb(x)::text, ',' order by x.id)) t from public.boxing_fighters x
  union all select 'b' || md5(string_agg(to_jsonb(x)::text, ',' order by x.id)) from public.boxing_bouts x
  union all select 'p' || md5(string_agg(to_jsonb(x)::text, ',' order by x.bout_id, x.fighter_id)) from public.boxing_bout_participants x
  union all select 'r' || md5(string_agg(to_jsonb(x)::text, ',' order by x.id)) from public.boxing_bout_results x
  union all select 's' || md5(string_agg(to_jsonb(x)::text, ',' order by x.id)) from public.boxing_scorecards x
  union all select 'e' || md5(string_agg(to_jsonb(x)::text, ',' order by x.id)) from public.boxing_events x) y`);

before(async () => {
  db = await freshDatabase('fight_dna');
  store = pgStore(db.client);
  src = await testSource(db.client, 'dna_fixture_source');
  await registerDefinitions(store);
  const commission = (await one(`insert into public.boxing_commissions (slug, name) values ('test_ac', 'Test Athletic Commission') returning id`)).id;

  await boxer('hero', 'Aaron Vale', { dob: '1995-01-01', stance: 'orthodox', height: 180, reach: 185 });
  await boxer('villain', 'Bruno Kade', { dob: '1993-06-15', stance: 'southpaw', height: 176, reach: 183 });
  for (const [k, s] of [['o1', 'southpaw'], ['o2', 'orthodox'], ['o3', 'orthodox'], ['o4', 'southpaw'], ['o5', 'orthodox'], ['o6', 'southpaw'], ['o7', 'orthodox'], ['o8', 'southpaw']]) {
    await boxer(k, `Opponent ${k.toUpperCase()} Test`, { stance: s });
  }
  // opponents' own earlier history (for opponent quality from the graph)
  await bout('o3_prior', { date: '2020-09-01', a: 'o3', b: 'o2', rounds: 8, wc: 'lightweight' });
  await result('o3_prior', { outcome: 'win', winner: 'o3', method: 'DECISION', decision: 'unanimous' });

  // hero career (round_minutes = 3 everywhere)
  await bout('b1', { date: '2020-01-10', a: 'hero', b: 'o1', rounds: 6, wc: 'lightweight' });
  await result('b1', { outcome: 'win', winner: 'hero', method: 'KO', round: 2, time: 95 });
  await bout('b2', { date: '2020-06-10', a: 'hero', b: 'o2', rounds: 8, wc: 'lightweight' });
  await result('b2', { outcome: 'win', winner: 'hero', method: 'DECISION', decision: 'unanimous' });
  await bout('b3', { date: '2021-01-15', a: 'hero', b: 'o3', rounds: 10, wc: 'super_lightweight' });
  await result('b3', { outcome: 'win', winner: 'hero', method: 'TKO', round: 4, time: 120 });
  await bout('b4', { date: '2021-08-20', a: 'hero', b: 'o4', rounds: 10, wc: 'super_lightweight' });
  await result('b4', { outcome: 'win', winner: 'o4', method: 'DECISION', decision: 'split' });
  await bout('b5', { date: '2022-03-05', a: 'hero', b: 'o5', rounds: 12, wc: 'super_lightweight', title: true });
  await result('b5', { outcome: 'win', winner: 'hero', method: 'TKO', round: 10, time: 60 });
  await bout('b6', { date: '2022-11-12', a: 'hero', b: 'o6', rounds: 12, wc: 'welterweight', title: true, commission });
  await bout('b7', { date: '2023-06-01', a: 'hero', b: 'o7', rounds: 12, wc: 'welterweight' });
  await result('b7', { outcome: 'win', winner: 'o7', method: 'TKO', round: 9, time: 30 });
  await bout('b8', { date: '2024-02-10', a: 'hero', b: 'o8', rounds: 10, wc: 'welterweight' });
  await result('b8', { outcome: 'draw', method: 'DECISION', decision: 'majority' });
  await bout('b9', { date: '2025-05-01', a: 'hero', b: 'o1', rounds: 12, wc: 'welterweight' });
  await result('b9', { outcome: 'no_contest', method: 'NO_CONTEST', round: 2, time: 40 });
  // b6: majority-decision win for hero with three round-by-round cards
  for (const [k, n] of [['k1', 'Panel Judge One'], ['k2', 'Panel Judge Two'], ['k3', 'Panel Judge Three']]) await official(k, n, 'judge');
  await assign('b6', 'k1', 'judge', 1); await assign('b6', 'k2', 'judge', 2); await assign('b6', 'k3', 'judge', 3);
  await card('b6', 'k1', 7, 1); await card('b6', 'k2', 6, 2); await card('b6', 'k3', 8, 3);
  await result('b6', { outcome: 'win', winner: 'hero', method: 'DECISION', decision: 'majority' });

  // villain: five earlier wins
  for (let i = 1; i <= 5; i++) {
    await boxer(`vo${i}`, `Villain Opponent ${i} Test`, { stance: 'orthodox' });
    await bout(`v${i}`, { date: `202${i}-03-01`, a: 'villain', b: `vo${i}`, rounds: 10 });
    await result(`v${i}`, { outcome: 'win', winner: 'villain', method: i % 2 ? 'KO' : 'DECISION', decision: i % 2 ? null : 'unanimous', round: i % 2 ? 3 : null, time: i % 2 ? 100 : null });
  }
  // the upcoming bout the matchup snapshot is about
  await bout('upcoming', { date: '2026-10-01', a: 'hero', b: 'villain', rounds: 12 });
  await q(`update public.boxing_bouts set status = 'scheduled' where id = $1`, [B.upcoming]);
});
after(async () => { await db?.close(); });

test('fighter Fight DNA: hand-computed values, sample context, unavailable where data is missing', async () => {
  const before = await factChecksum();
  const { rows } = await computeFighterDna(store, F.hero, CUTOFF);
  const m = Object.fromEntries(rows.map((r) => [r.metric_key, r]));
  assert.equal(m['activity.pro_bouts'].value_number, 9);
  assert.equal(m['activity.days_since_last_bout'].value_number, 487, '2025-05-01T20:00Z to 2026-09-01T00:00Z is 487 whole days');
  // decided = b1..b8 (b9 no contest excluded); wins b1 b2 b3 b5 b6
  assert.equal(m['results.win_rate'].value_number, 0.625);
  assert.equal(m['results.stoppage_win_share'].value_number, 0.6); // b1 b3 b5 of 5 wins
  assert.equal(m['results.decision_win_share'].value_number, 0.4);
  assert.equal(m['results.distance_rate'].value_number, 0.4444); // b2 b4 b6 b8 of 9 with a method
  assert.equal(m['results.stoppage_loss_rate'].value_number, 0.125); // b7
  assert.equal(m['finishing.early_stoppage_share'].value_number, 0.3333); // b1 (r2) of b1, b3, b5
  assert.equal(m['finishing.late_stoppage_share'].status, 'insufficient_sample'); // only 2 stoppage wins scheduled > 8
  assert.equal(m['finishing.late_stoppage_share'].value_number, null);
  // scheduled > 8: b3 r4 no; b4 dist; b5 r10; b6 dist; b7 r9; b8 dist; b9 NC r2 no => 5 of 7
  assert.equal(m['durability.reached_round_9_rate'].value_number, 0.7143);
  assert.equal(m['durability.knockdowns_suffered_per_bout'].status, 'source_unavailable');
  assert.equal(m['output.thrown_per_round'].status, 'source_unavailable');
  assert.equal(m['division.current'].value_text, 'welterweight');
  assert.equal(m['division.bouts_at_current'].value_number, 4); // b6 b7 b8 b9
  assert.equal(m['division.last_move'].value_text, 'up');
  assert.equal(m['opposition.title_fights'].value_number, 2);
  assert.equal(m['stance.win_rate_vs_southpaw'].status, 'insufficient_sample'); // b1 b4 b6 b8 = 4
  // b6 rounds 9-12: k1 (7 a-rounds) b,b,b,b; k2 (6) b,b,b,b; k3 (8) b,b,b,b => hero wins 0 of 4 => insufficient (min 6)
  assert.equal(m['late.round_scoring_share_9_plus'].status, 'insufficient_sample');
  assert.equal(m['late.round_scoring_share_9_plus'].sample_size, 4);
  assert.ok(m['results.win_rate'].sample_context.numerator === 5 && m['results.win_rate'].sample_context.denominator === 8);

  const stored = await q(`select status, value_number, sample_size from public.boxing_fighter_metric_snapshots where fighter_id = $1 and metric_key = 'results.win_rate'`, [F.hero]);
  assert.deepEqual(stored.map((s) => [s.status, Number(s.value_number), s.sample_size]), [['available', 0.625, 8]]);
  assert.equal((await factChecksum()).h, before.h, '1. computing derived intelligence modified no source fact');
});

test('recomputing with identical inputs writes nothing; runs are recorded', async () => {
  const again = await computeFighterDna(store, F.hero, CUTOFF);
  assert.equal(again.written, 0);
  const run = await runFighterDna(store, [F.hero, F.villain], CUTOFF);
  const r = await one(`select status, subjects from public.boxing_intel_runs where id = $1`, [run.run_id]);
  assert.deepEqual(r, { status: 'ok', subjects: 2 });
});

test('4. bouts and result revisions after the cutoff are excluded', async () => {
  const { rows } = await computeFighterDna(store, F.hero, '2023-01-01T00:00:00Z');
  const m = Object.fromEntries(rows.map((r) => [r.metric_key, r]));
  assert.equal(m['activity.pro_bouts'].value_number, 6, 'b7-b9 happened after the cutoff');
  assert.equal(m['results.stoppage_loss_rate'].value_number, 0, 'b7 stoppage loss is after the cutoff');

  // overturn b2 (win) to no contest, decided in 2025
  const prev = await one(`select id from public.boxing_bout_results where bout_id = $1`, [B.b2]);
  await result('b2', { outcome: 'no_contest', method: 'NO_CONTEST', revision: 2, supersedes: prev.id, decidedAt: '2025-01-15T00:00:00Z', state: 'overturned' });
  const early = Object.fromEntries((await computeFighterDna(store, F.hero, '2024-06-01T00:00:00Z')).rows.map((r) => [r.metric_key, r]));
  const late = Object.fromEntries((await computeFighterDna(store, F.hero, '2025-06-01T00:00:00Z')).rows.map((r) => [r.metric_key, r]));
  // 2024-06-01: b1..b8, decided 8, wins b1 b2 b3 b5 b6 = 5
  assert.equal(early['results.win_rate'].value_number, 0.625, 'the overturn was not known yet');
  // 2025-06-01: b2 is now a no contest -> decided 7, wins 4
  assert.equal(late['results.win_rate'].value_number, 0.5714, 'after the ruling the overturn applies');
});

test('5. insufficient sample returns null, and the database refuses a value without availability', async () => {
  await boxer('rookie', 'Rookie Test Boxer');
  await bout('r1', { date: '2026-01-01', a: 'rookie', b: 'o8', rounds: 4 });
  await result('r1', { outcome: 'win', winner: 'rookie', method: 'DECISION', decision: 'unanimous' });
  const m = Object.fromEntries((await computeFighterDna(store, F.rookie, CUTOFF)).rows.map((r) => [r.metric_key, r]));
  assert.equal(m['results.win_rate'].status, 'insufficient_sample');
  assert.equal(m['results.win_rate'].value_number, null);
  assert.deepEqual(m['results.win_rate'].sample_context.minimum_required, 5);
  assert.equal(m['activity.avg_days_between_bouts'].status, 'insufficient_sample');
  await expectPgError(() => q(`insert into public.boxing_fighter_metric_snapshots (fighter_id, metric_key, metric_version, as_of, value_number, status)
    values ($1, 'results.win_rate', '1.0.0', now(), 1, 'insufficient_sample')`, [F.rookie]), { code: '23514' });
});

test('6. missing punch data is never invented; unapproved punch data is ignored; approved covered data is used', async () => {
  const addPunches = async (sourceId) => {
    for (const r of [1, 2, 3, 4, 5, 6]) {
      for (const [who, att, land] of [['hero', 50, 20], ['o1', 40, 10]]) {
        await q(`insert into public.boxing_round_punch_stats (bout_id, fighter_id, round, source_id, total_landed, total_attempted, jab_landed, jab_attempted, power_landed, power_attempted)
          values ($1, $2, $3, $4, $5, $6, 5, 20, $7, $8) on conflict do nothing`, [B.b1, F[who], r, sourceId, land, att, land - 5, att - 20]);
      }
    }
    await q(`insert into public.boxing_bout_stat_coverage (bout_id, stat_kind, source_id, complete) values ($1, 'punch_stats', $2, true) on conflict do nothing`, [B.b1, sourceId]);
  };
  const unapproved = await one(`insert into public.boxing_sources (source_key, source_name, source_kind, access_mode, rights_state, enabled)
    values ('punch_vendor_unreviewed', 'x', 'data_provider', 'review_required', 'unknown', false) returning id`);
  await addPunches(unapproved.id);
  let m = Object.fromEntries((await computeFighterDna(store, F.hero, CUTOFF)).rows.map((r) => [r.metric_key, r]));
  assert.equal(m['output.thrown_per_round'].status, 'source_unavailable', 'stats from an unapproved source are not used');

  const approved = await testSource(db.client, 'punch_vendor_licensed', { source_kind: 'data_provider' });
  await q(`update public.boxing_sources set derivative_allowed = true where id = $1`, [approved.id]);
  await addPunches(approved.id);
  // b3 too, so there are >= 10 covered rounds
  for (const r of [1, 2, 3, 4]) {
    for (const [who, att, land] of [['hero', 60, 30], ['o3', 30, 9]]) {
      await q(`insert into public.boxing_round_punch_stats (bout_id, fighter_id, round, source_id, total_landed, total_attempted, jab_landed, jab_attempted, power_landed, power_attempted)
        values ($1, $2, $3, $4, $5, $6, 3, 10, $7, $8)`, [B.b3, F[who], r, approved.id, land, att, land - 3, att - 10]);
    }
  }
  await q(`insert into public.boxing_bout_stat_coverage (bout_id, stat_kind, source_id, complete) values ($1, 'punch_stats', $2, true)`, [B.b3, approved.id]);
  m = Object.fromEntries((await computeFighterDna(store, F.hero, CUTOFF)).rows.map((r) => [r.metric_key, r]));
  // hero rounds: 6 x 50 attempted + 4 x 60 = 540 over 10 rounds = 54; landed 6x20 + 4x30 = 240 => accuracy 0.4444
  assert.equal(m['output.thrown_per_round'].value_number, 54);
  assert.equal(m['output.total_accuracy'].value_number, 0.4444);
  assert.equal(m['output.opponent_landed_per_round'].value_number, 9.6); // (6x10 + 4x9) / 10
  // jab: 6x5 + 4x3 = 42 landed of 6x20 + 4x10 = 160 attempted; attempt share 160 / 540
  assert.equal(m['output.jab_accuracy'].value_number, 0.2625);
  assert.equal(m['output.jab_attempt_share'].value_number, 0.2963);
  assert.equal(m['durability.knockdowns_suffered_per_bout'].status, 'source_unavailable');

  // knockdown coverage with zero knockdown rows is a real zero; no coverage stays null
  await q(`insert into public.boxing_bout_stat_coverage (bout_id, stat_kind, source_id, complete) values ($1, 'knockdowns', $2, true)`, [B.b3, approved.id]);
  const history = await store.fighterHistoryAsOf(F.hero, CUTOFF);
  const byId = Object.fromEntries(history.bouts.map((b) => [b.bout_id, b]));
  assert.equal(byId[B.b1].punch_stats.length, 12, 'one approved source only (6 rounds x 2 corners), never summed with the unapproved one');
  assert.equal(byId[B.b2].punch_stats, null, 'no coverage is null, not zero');
  assert.deepEqual(byId[B.b3].knockdowns, []);
  assert.equal(byId[B.b1].knockdowns, null);
});

test('2. metric versions coexist; a changed definition under the same version is refused', async () => {
  await store.registerMetricDefinition({
    metric_key: 'results.win_rate', version: '2.0.0', subject_kind: 'fighter', category: 'results', name: 'Win rate (incl. no contests)',
    description: 'Wins over all bouts with a known result.', formula_text: 'wins / bouts(result known)', required_inputs: ['result.outcome'],
    minimum_sample: { bouts: 5 }, value_kind: 'rate', unit: 'ratio', source_requirements: {},
  });
  await q(`insert into public.boxing_fighter_metric_snapshots (fighter_id, metric_key, metric_version, as_of, value_number, sample_size, status, inputs_hash)
    values ($1, 'results.win_rate', '2.0.0', $2, 0.5556, 9, 'available', 'v2-probe')`, [F.hero, CUTOFF]);
  const versions = await q(`select distinct metric_version from public.boxing_fighter_metric_snapshots where fighter_id = $1 and metric_key = 'results.win_rate' order by 1`, [F.hero]);
  assert.deepEqual(versions.map((v) => v.metric_version), ['1.0.0', '2.0.0']);
  await expectPgError(() => store.registerMetricDefinition({
    metric_key: 'results.win_rate', version: '2.0.0', subject_kind: 'fighter', category: 'results', name: 'Win rate (incl. no contests)',
    description: 'Wins over all bouts with a known result.', formula_text: 'wins / everything', required_inputs: ['result.outcome'],
    minimum_sample: { bouts: 5 }, value_kind: 'rate', unit: 'ratio', source_requirements: {},
  }), { code: 'BX100' });
  await expectPgError(() => q(`insert into public.boxing_fighter_metric_snapshots (fighter_id, metric_key, metric_version, as_of, status) values ($1, 'made.up', '1.0.0', now(), 'available')`, [F.hero]), { code: '23503' });
});

test('3 + 4. matchup snapshots are immutable, deterministic and blind to later fights', async () => {
  const s1 = await buildMatchupSnapshot(store, B.upcoming, CUTOFF);
  assert.equal(s1.status, 'created');
  const row1 = await one(`select features, inputs_hash, metric_versions, fighter_a_id, fighter_b_id, input_cutoff from public.boxing_matchup_snapshots where id = $1`, [s1.snapshot_id]);
  assert.equal(row1.features.fighter_a.fighter_id, F.hero);
  assert.equal(row1.features.fighter_b.fighter_id, F.villain);
  assert.equal(row1.metric_versions['results.win_rate'], '1.0.0');
  assert.equal(row1.features.differentials.height_cm, 4);
  assert.equal(row1.features.differentials.reach_cm, 2);
  assert.equal(row1.features.stance.interaction, 'orthodox_vs_southpaw');
  assert.equal(row1.features.fighter_a.physical.point_in_time.reach_cm, false);

  // a later fight for the hero, after the snapshot's cutoff
  await bout('later', { date: '2026-09-10', a: 'hero', b: 'o2', rounds: 10 });
  await result('later', { outcome: 'win', winner: 'hero', method: 'KO', round: 1, time: 30 });
  const again = await buildMatchupSnapshot(store, B.upcoming, CUTOFF);
  assert.equal(again.status, 'unchanged');
  assert.equal(again.inputs_hash, s1.inputs_hash, 'the later fight did not leak into the same cutoff');
  const row1After = await one(`select features, inputs_hash from public.boxing_matchup_snapshots where id = $1`, [s1.snapshot_id]);
  assert.deepEqual(row1After, { features: row1.features, inputs_hash: row1.inputs_hash });
  await expectPgError(() => q(`update public.boxing_matchup_snapshots set features = '{}' where id = $1`, [s1.snapshot_id]), { code: 'BX001' });

  const s2 = await buildMatchupSnapshot(store, B.upcoming, '2026-09-20T00:00:00Z');
  assert.equal(s2.status, 'created');
  assert.notEqual(s2.inputs_hash, s1.inputs_hash);
  assert.equal(s2.features.fighter_a.metrics['activity.pro_bouts'].value, 10, 'the new cutoff sees the new fight');
  assert.equal(s1.features.fighter_a.metrics['activity.pro_bouts'].value, 9);

  await expectPgError(() => buildMatchupSnapshot(store, B.upcoming, '2026-10-02T00:00:00Z'), { code: 'BX120' });
  await expectPgError(() => q(`insert into public.boxing_matchup_snapshots (bout_id, model_key, model_version, as_of, input_cutoff, fighter_a_id, fighter_b_id, features)
    values ($1, 'pbe_matchup_dna', '1.0.0', '2026-10-05', '2026-10-05', $2, $3, '{}')`, [B.upcoming, F.hero, F.villain]), { code: 'BX120' });
});

test('7. Judge DNA is computed from stored scorecards (12 panel bouts, hand-checked)', async () => {
  const commission = (await one(`select id from public.boxing_commissions where slug = 'test_ac'`)).id;
  for (const [k, n] of [['j1', 'Judge Alpha Test'], ['j2', 'Judge Beta Test'], ['j3', 'Judge Gamma Test']]) await official(k, n, 'judge');
  await official('ref1', 'Referee Delta Test', 'referee');
  for (let i = 1; i <= 12; i++) {
    await boxer(`pa${i}`, `Panel A ${i} Test`); await boxer(`pb${i}`, `Panel B ${i} Test`);
    await bout(`p${i}`, { date: `2024-0${(i % 9) + 1}-1${i % 9}`, a: `pa${i}`, b: `pb${i}`, rounds: 12, commission });
    await assign(`p${i}`, 'j1', 'judge', 1); await assign(`p${i}`, 'j2', 'judge', 2); await assign(`p${i}`, 'j3', 'judge', 3); await assign(`p${i}`, 'ref1', 'referee');
    await card(`p${i}`, 'j1', 7, 1);                 // 115-113 a
    await card(`p${i}`, 'j2', i <= 2 ? 6 : 8, 2);    // 114-114 even, else 116-112 a
    await card(`p${i}`, 'j3', 5, 3);                 // 113-115 b
    // cards a/even/b = split draw; a/a/b = split decision for a
    if (i <= 2) await result(`p${i}`, { outcome: 'draw', method: 'DECISION', decision: 'split' });
    else await result(`p${i}`, { outcome: 'win', winner: `pa${i}`, method: 'DECISION', decision: 'split' });
  }
  for (const i of [2, 5, 9]) {
    await q(`insert into public.boxing_point_deductions (bout_id, fighter_id, round, points, referee_official_id, source_id) values ($1, $2, 6, 1, $3, $4)`, [B[`p${i}`], F[`pa${i}`], O.ref1, src.id]);
  }
  const j1 = Object.fromEntries((await computeOfficialDna(store, O.j1, CUTOFF)).rows.map((r) => [r.metric_key, r]));
  const j3 = Object.fromEntries((await computeOfficialDna(store, O.j3, CUTOFF)).rows.map((r) => [r.metric_key, r]));
  assert.equal(j1['judge.bouts_scored'].value_number, 12);
  assert.equal(j1['judge.rounds_scored'].value_number, 144);
  assert.equal(j1['judge.avg_card_margin'].value_number, 2);
  assert.equal(j1['judge.split_decision_involvement'].value_number, 1);
  assert.equal(j1['judge.majority_decision_involvement'].value_number, 0);
  assert.equal(j1['judge.round_10_10_rate'].value_number, 0);
  assert.equal(j1['judge.round_10_8_rate'].value_number, 0);
  // per bout J1 differs from the others' mean by 1 in rounds 6,7,8 (bouts 3-12) or 1,2 in rounds 6,7 (bouts 1-2): 3 points / 12 rounds
  assert.equal(j1['judge.round_consensus_distance'].value_number, 0.25);
  assert.equal(j1['judge.panel_disagreement_rate'].status, 'insufficient_sample', 'J2 and J3 never form a majority against J1');
  // J3: in bouts 3-12 the other two both have side a; J3 has b => 10 of 10
  assert.equal(j3['judge.panel_disagreement_rate'].value_number, 1);
  assert.equal(j3['judge.panel_disagreement_rate'].sample_size, 10);
  assert.deepEqual(j1['judge.jurisdictions'].value_json, { test_ac: 12 });
  assert.equal(j1['judge.title_fight_assignments'].value_number, 0);

  // a correction captured after the cutoff is not visible at that cutoff
  const orig = await one(`select id from public.boxing_scorecards where bout_id = $1 and judge_id = $2`, [B.p3, O.j1]);
  await card('p3', 'j1', 12, 1, { revision: 2, supersedes: orig.id, capturedAt: '2026-12-01T00:00:00Z' }); // 120-108
  const j1Again = Object.fromEntries((await computeOfficialDna(store, O.j1, CUTOFF)).rows.map((r) => [r.metric_key, r]));
  assert.equal(j1Again['judge.avg_card_margin'].value_number, 2, 'correction captured after the cutoff is ignored');
  const j1Later = Object.fromEntries((await computeOfficialDna(store, O.j1, '2027-01-01T00:00:00Z')).rows.map((r) => [r.metric_key, r]));
  assert.equal(j1Later['judge.avg_card_margin'].value_number, 2.8333, '(11 x 2 + 12) / 12');
});

test('8. Referee DNA is computed from stored bouts, with sample sizes', async () => {
  const r1 = Object.fromEntries((await computeOfficialDna(store, O.ref1, CUTOFF)).rows.map((r) => [r.metric_key, r]));
  assert.equal(r1['referee.bouts_refereed'].value_number, 12);
  assert.equal(r1['referee.stoppage_rate'].value_number, 0);
  assert.equal(r1['referee.avg_stoppage_round'].status, 'insufficient_sample');
  assert.equal(r1['referee.point_deductions_per_bout'].value_number, 0.25); // 3 / 12
  assert.equal(r1['referee.avg_completed_rounds'].value_number, 12);

  await official('ref2', 'Referee Epsilon Test', 'referee');
  for (const k of ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9']) await assign(k, 'ref2', 'referee');
  await boxer('fa', 'Filler A Test'); await boxer('fb', 'Filler B Test');
  await bout('filler', { date: '2025-08-01', a: 'fa', b: 'fb', rounds: 6 });
  await result('filler', { outcome: 'win', winner: 'fa', method: 'KO', round: 1, time: 50 });
  await assign('filler', 'ref2', 'referee');
  const r2 = Object.fromEntries((await computeOfficialDna(store, O.ref2, CUTOFF)).rows.map((r) => [r.metric_key, r]));
  assert.equal(r2['referee.bouts_refereed'].value_number, 10);
  // stoppages: b1 r2, b3 r4, b5 r10, b7 r9, filler r1 (b2 was overturned to a no contest, still refereed)
  assert.equal(r2['referee.stoppage_rate'].value_number, 0.5);
  assert.equal(r2['referee.avg_stoppage_round'].value_number, 5.2);
  assert.equal(r2['referee.title_fights'].value_number, 2);
  // completed rounds are computable for b1 b3 b4 b5 b6 b7 b8 b9 filler (b2 is now a no contest without a round)
  assert.equal(r2['referee.avg_completed_rounds'].status, 'insufficient_sample', '9 computable bouts < 10');
  assert.equal(r2['referee.avg_completed_rounds'].sample_size, 9);
});

test('9 + 10. model outputs need a trained registered model, a matching snapshot, and correct fair-odds arithmetic', async () => {
  const snap = await one(`select id, input_cutoff from public.boxing_matchup_snapshots where bout_id = $1 order by input_cutoff limit 1`, [B.upcoming]);
  const insert = (model, version, p, dec, am) => q(`insert into public.boxing_model_outputs (model_key, model_version, bout_id, matchup_snapshot_id, feature_model_version, input_cutoff, selection_key, probability, fair_decimal, fair_american)
    values ($1, $2, $3, $4, '1.0.0', $5, 'fighter_a', $6, $7, $8)`, [model, version, B.upcoming, snap.id, snap.input_cutoff, p, dec, am]);
  const good = fairOdds(0.6);
  assert.deepEqual(good, { probability: 0.6, fair_decimal: 1.666667, fair_american: -150 });
  await expectPgError(() => insert('pbe_bout_winner', '0.1.0', good.probability, good.fair_decimal, good.fair_american), { code: 'BX111' });
  await expectPgError(() => q(`update public.boxing_models set status = 'trained' where model_key = 'pbe_bout_winner'`), { code: 'BX110' });

  await q(`insert into public.boxing_models (model_key, version, name, description, target, feature_model_key, feature_model_version, training_cutoff, training_sample_size, status)
    values ('test_model', '1.0.0', 'Test only', 'synthetic test registration', 'bout_winner', 'pbe_matchup_dna', '1.0.0', '2026-01-01', 250, 'trained'),
           ('test_model', '1.0.1', 'Test only', 'trained after the snapshot cutoff', 'bout_winner', 'pbe_matchup_dna', '1.0.0', '2026-12-01', 250, 'trained')`);
  await insert('test_model', '1.0.0', good.probability, good.fair_decimal, good.fair_american);
  await expectPgError(() => q(`insert into public.boxing_model_outputs (model_key, model_version, bout_id, matchup_snapshot_id, feature_model_version, input_cutoff, selection_key, probability, fair_decimal, fair_american)
    values ('test_model', '1.0.0', $1, $2, '1.0.0', $3, 'fighter_b', 0.4, 2.4, 150)`, [B.upcoming, snap.id, snap.input_cutoff]), { code: '23514' }); // 1/0.4 = 2.5
  await expectPgError(() => q(`insert into public.boxing_model_outputs (model_key, model_version, bout_id, matchup_snapshot_id, feature_model_version, input_cutoff, selection_key, probability, fair_decimal, fair_american)
    values ('test_model', '1.0.0', $1, $2, '1.0.0', $3, 'fighter_b', 0.4, 2.5, 140)`, [B.upcoming, snap.id, snap.input_cutoff]), { code: '23514' }); // american should be +150
  await expectPgError(() => insert('test_model', '1.0.1', 0.55, fairOdds(0.55).fair_decimal, fairOdds(0.55).fair_american), { code: 'BX113' });
  await expectPgError(() => q(`insert into public.boxing_model_outputs (model_key, model_version, bout_id, matchup_snapshot_id, feature_model_version, input_cutoff, selection_key, probability, fair_decimal, fair_american)
    values ('test_model', '1.0.0', $1, gen_random_uuid(), '1.0.0', now(), 'draw', 0.05, 20, 1900)`, [B.upcoming]), { code: '23503' });
  const untrained = await one(`select status, unavailable_reason is not null r from public.boxing_models where model_key = 'pbe_bout_winner'`);
  assert.deepEqual(untrained, { status: 'untrained', r: true });
});

test('11. canonical identity holds through derived tables (merged duplicate folds in)', async () => {
  await boxer('dup', 'Aaron Vale Duplicate');
  await bout('b0', { date: '2019-05-05', a: 'dup', b: 'o5', rounds: 4, wc: 'lightweight' });
  await result('b0', { outcome: 'win', winner: 'dup', method: 'DECISION', decision: 'unanimous' });
  await q(`update public.boxing_fighters set identity_state = 'merged', merged_into_id = $1 where id = $2`, [F.hero, F.dup]);
  const viaDuplicate = await computeFighterDna(store, F.dup, CUTOFF);
  assert.equal(viaDuplicate.fighter_id, F.hero);
  const m = Object.fromEntries(viaDuplicate.rows.map((r) => [r.metric_key, r]));
  assert.equal(m['activity.pro_bouts'].value_number, 10, 'the duplicate\'s bout is part of the canonical history (9 + b0; b2 still counted, now NC)');
  const orphan = await q(`select count(*)::int n from public.boxing_fighter_metric_snapshots where fighter_id = $1`, [F.dup]);
  assert.equal(orphan[0].n, 0, 'no snapshot is ever keyed to a merged id');
});

test('12. derived tables are locked down like every other boxing table', async () => {
  await asRole(db.client, 'anon', async () => {
    await expectPgError(() => q('select * from public.boxing_fighter_metric_snapshots limit 1'), { code: '42501' });
  });
  await asRole(db.client, 'authenticated', async () => {
    await expectPgError(() => q(`select public.boxing_fighter_dna_latest(gen_random_uuid())`), { code: '42501' });
  });
  const latest = await store.fighterDnaLatest(F.hero);
  assert.ok(latest.every((r) => r.label === 'pbe_derived' && 'sample_size' in r && r.generated_at));
  await expectPgError(() => q(`delete from public.boxing_official_metric_snapshots`), { code: 'BX001' });
});

test('gateway (read-only) serves every route from the real database with canonical ids', async () => {
  const { createWorker } = await import('../../workers/boxing-gateway/src/index.mjs');
  const env = { BOXING_INTERNAL_TOKEN: 'z'.repeat(40) };
  const worker = createWorker({ makeStore: () => store });
  const get = async (path) => {
    const res = await worker.fetch(new Request(`https://g.internal${path}`, { headers: { authorization: `Bearer ${env.BOXING_INTERNAL_TOKEN}` } }), env);
    return { status: res.status, body: await res.json() };
  };
  const before = await factChecksum();
  const heroDna = await get(`/internal/v1/fighters/${F.dup}/dna`);
  assert.equal(heroDna.status, 200);
  assert.equal(heroDna.body.data.fighter_id, F.hero, 'merged id resolves to the canonical fighter');
  assert.ok(heroDna.body.data.metrics.some((m) => m.metric_key === 'results.win_rate' && m.metric_version === '2.0.0'));

  const bout = await get(`/internal/v1/bouts/${B.b6}`);
  assert.equal(bout.body.data.result.method, 'DECISION');
  assert.equal(bout.body.data.scorecards.length, 3);
  assert.equal(bout.body.data.titles.length, 1);
  assert.deepEqual(bout.body.data.participants.map((p) => p.fighter_id).sort(), [F.hero, F.o6].sort());

  const event = await get(`/internal/v1/events/${(await one('select event_id from public.boxing_bouts where id = $1', [B.b6])).event_id}`);
  assert.equal(event.body.data.bouts.length, 1);

  const matchup = await get(`/internal/v1/bouts/${B.upcoming}/matchup?limit=10`);
  assert.equal(matchup.body.data.snapshots.length, 2);
  assert.ok(new Date(matchup.body.data.snapshots[0].input_cutoff) > new Date(matchup.body.data.snapshots[1].input_cutoff));
  assert.ok(matchup.body.data.snapshots.every((s) => s.inputs_hash && s.metric_versions && s.features.fighter_a));
  assert.ok(matchup.body.data.models.some((m) => m.model_key === 'pbe_bout_winner' && m.status === 'untrained'));

  const odds = await get(`/internal/v1/bouts/${B.upcoming}/odds-summary`);
  assert.deepEqual(odds.body.data.consensus, []);
  assert.deepEqual(odds.body.data.fair_prices.map((p) => p.model_key), ['test_model'], 'only the trained test model has prices');

  const judge = await get(`/internal/v1/officials/${O.j1}/dna`);
  assert.ok(judge.body.data.judge.length > 0);
  assert.ok(judge.body.data.judge.every((m) => 'sample_size' in m && m.label === 'pbe_derived'));
  const ref = await get(`/internal/v1/officials/${O.ref2}`);
  assert.equal(ref.body.data.assignment_counts.referee, 10);

  const title = await get(`/internal/v1/titles/${(await one('select title_id from public.boxing_bout_titles where bout_id = $1', [B.b6])).title_id}`);
  assert.equal(title.status, 200);
  assert.equal((await get('/internal/v1/title-map?weight_class=welterweight&as_of=2026-09-01')).status, 200);
  assert.equal((await get('/internal/v1/rankings?organization=wbc&weight_class=welterweight&as_of=2026-09-01')).status, 200);
  assert.equal((await get(`/internal/v1/bouts/${F.hero}`)).status, 404);
  assert.equal((await factChecksum()).h, before.h, 'gateway reads changed no fact');
});
