# Fight DNA, officials intelligence, matchup snapshots and models (issue #6)

Migration `20260913000009_boxing_fight_dna.sql`; engine `shared/intel/*` (`boxing-intel-engine@1.0.0`); read API `workers/boxing-gateway` (NOT DEPLOYED).

Everything here is **PropBetEdge-derived**. It reads canonical facts and writes only derived tables, and no canonical table references a derived table. A database test checksums every fact table before and after computation.

## Rules

- **Versioned definitions.** A metric is `(metric_key, version, subject_kind)`, with formula, required inputs, minimum sample, unit and source requirements. Registering a *changed* definition under an existing version is refused (`BX100`), so a change requires a new version, and versions coexist.
- **Status before value.** Each snapshot row has one of four statuses: `available`, `insufficient_sample`, `source_unavailable` or `not_applicable`. A database CHECK makes every value column null unless the status is `available`. Every row carries `sample_size`, a `sample_context` (numerator, denominator, minimum required, exclusions), `inputs_hash`, `engine_version`, `as_of` (the input cutoff) and `created_at` (generated timestamp).
- **Append-only.** Metric snapshots, matchup snapshots and model outputs cannot be updated or deleted. A recompute with identical inputs (same `inputs_hash`) writes nothing. Changed inputs write a new row.
- **Canonical identity.** Histories are built on the canonical fighter or official, and merged records fold in. Snapshots are never keyed to a merged id. Nothing joins on display names.

## Point-in-time (no future leakage)

`boxing_fighter_history_as_of(fighter, cutoff)` and `boxing_official_history_as_of(official, cutoff)` return only what was knowable at the cutoff:

| Fact | Known from |
|---|---|
| Bout | its start (`boxing_bout_starts_at`) is before the cutoff |
| Result revision 1 | fight time |
| Amendment / overturn (revision > 1) | `coalesce(decided_at, captured_at)` |
| Scorecard revision 1 | fight time |
| Scorecard correction | its `captured_at` |
| Knockdowns, punch stats, point deductions (+ coverage) | fight time. They describe the bout, so backfilled data stays usable for backtests. |
| Opponent record entering a bout | the sourced record on the participant row, else the graph record from bouts before that bout |

Tests prove it: later bouts, a later overturn and a later scorecard correction are all invisible at an earlier cutoff and visible at a later one.

## Missing data is never invented

- `boxing_bout_stat_coverage (bout, stat_kind, source, complete)`: knockdowns and punch statistics only count for a bout when a source declared complete coverage. No coverage returns null (source_unavailable), never zero. Coverage with no knockdown rows is a real zero.
- **Punch statistics** additionally require the source to be `enabled`, `derivative_allowed` and rights `internal`/`approved`. They are read from exactly one covering source per bout and never summed across sources. A field the source did not provide (e.g. no jab split) leaves that metric `source_unavailable`.
- **No approved punch-stat or knockdown source exists today**, so every `output.*` metric, `durability.knockdowns_suffered_per_bout` and `late.knockdowns_after_round_8` currently return `source_unavailable` for every fighter.

## Naming discipline

- Finishing metrics describe how bouts ended, not punching power.
- Durability metrics are record-derived. There is no "chin" score.
- Division metrics state direction only, with no claim about weight cutting.
- Stance uses the opponent's *recorded* stance and needs at least 5 decided bouts.
- Judge and Referee DNA are descriptive counts and rates with sample sizes. No qualitative labels, and a unit test scans every definition for loaded terms.

## Opponent quality: `pbe_opponent_quality@1`

`q = 0.5 * opp_win_pct_entering + 0.5 * min(opp_prior_bouts, 30) / 30`

It uses only the opponent's record *entering* that bout, so it never touches rankings or later results. That makes it neither circular (a fighter's own results do not feed their opponents' scores) nor leaky. A debutant scores 0. It powers `opposition.opponent_quality_index` and the opponent-adjusted stoppage rates.

## Metric catalogue (v1.0.0)

### Fighter metrics (45)

| Key | Formula | Minimum sample | Needs |
|---|---|---|---|
| `activity.pro_bouts` | count(professional bouts started before cutoff with result outcome != unknown) | - |  |
| `activity.rounds_boxed` | sum(decision: scheduled_rounds; stoppage: (round-1) + time_sec/round_seconds when time known else (round-1)) | bouts >= 1 |  |
| `activity.days_since_last_bout` | floor((cutoff - max(bout.start)) / 1 day) | bouts >= 1 |  |
| `activity.bouts_last_12_months` | count(bout.start >= cutoff - 365 days) | - |  |
| `activity.bouts_last_24_months` | count(bout.start >= cutoff - 730 days) | - |  |
| `activity.avg_days_between_bouts` | (last.start - first.start) / (bouts - 1) | bouts >= 2 |  |
| `results.win_rate` | wins / (wins + losses + draws) | decided_bouts >= 5 |  |
| `results.stoppage_win_share` | wins(method in KO,TKO,RTD) / wins | wins >= 5 |  |
| `results.decision_win_share` | wins(method in DECISION,TECHNICAL_DECISION) / wins | wins >= 5 |  |
| `results.distance_rate` | bouts(method = DECISION) / bouts(method known) | bouts >= 5 |  |
| `results.stoppage_loss_rate` | losses(method in KO,TKO,RTD) / decided bouts | decided_bouts >= 5 |  |
| `results.outcome_summary` | counts by outcome and DQ direction | - |  |
| `finishing.stoppage_win_rate` | wins(method in KO,TKO,RTD) / decided bouts | decided_bouts >= 5 |  |
| `finishing.opponent_adjusted_stoppage_win_rate` | sum(q_i * stoppage_win_i) / sum(q_i); q = 0.5*opp_win_pct_entering + 0.5*min(opp_prior_bouts,30)/30 | decided_bouts_with_opponent_record >= 5 |  |
| `finishing.early_stoppage_share` | stoppage_wins(round <= 3) / stoppage_wins(round known) | stoppage_wins >= 3 |  |
| `finishing.late_stoppage_share` | stoppage_wins(scheduled > 8, round >= 9) / stoppage_wins(scheduled > 8, round known) | stoppage_wins_scheduled_beyond_8 >= 3 |  |
| `durability.stoppage_losses` | count(losses with method in KO,TKO,RTD) | - |  |
| `durability.knockdowns_suffered_per_bout` | knockdowns_suffered / bouts_with_complete_knockdown_coverage | covered_bouts >= 5 | knockdowns |
| `durability.rounds_completed_ratio` | sum(rounds_completed) / sum(scheduled_rounds) | bouts >= 5 |  |
| `durability.reached_round_9_rate` | bouts(scheduled > 8 and (distance or finish_round >= 9)) / bouts(scheduled > 8, method known) | bouts_scheduled_beyond_8 >= 3 |  |
| `durability.opponent_adjusted_stoppage_loss_rate` | sum(q_i * stoppage_loss_i) / sum(q_i) | decided_bouts_with_opponent_record >= 5 |  |
| `output.thrown_per_round` | sum(total_attempted) / covered_rounds | covered_rounds >= 10 | punch_stats |
| `output.landed_per_round` | sum(total_landed) / covered_rounds | covered_rounds >= 10 | punch_stats |
| `output.total_accuracy` | sum(total_landed) / sum(total_attempted) | covered_rounds >= 10 | punch_stats |
| `output.jab_attempt_share` | sum(jab_attempted) / sum(total_attempted) | covered_rounds >= 10 | punch_stats |
| `output.jab_accuracy` | sum(jab_landed) / sum(jab_attempted) | covered_rounds >= 10 | punch_stats |
| `output.power_accuracy` | sum(power_landed) / sum(power_attempted) | covered_rounds >= 10 | punch_stats |
| `output.opponent_landed_per_round` | sum(opponent total_landed) / covered_rounds | covered_rounds >= 10 | punch_stats |
| `late.bouts_scheduled_beyond_8` | count(scheduled_rounds > 8) | - |  |
| `late.rounds_boxed_9_plus` | sum(max(rounds_completed - 8, 0)) over scheduled > 8 | bouts_scheduled_beyond_8 >= 1 |  |
| `late.stoppage_wins_after_round_8` | count(stoppage wins with round >= 9) | - |  |
| `late.knockdowns_after_round_8` | {scored: count(round >= 9, opponent down), suffered: count(round >= 9, me down)} over covered bouts | covered_bouts_scheduled_beyond_8 >= 1 | knockdowns |
| `late.round_scoring_share_9_plus` | rounds(r >= 9, mean_judges(me - opponent) > 0) / rounds(r >= 9 scored) | scored_rounds_9_plus >= 6 |  |
| `opposition.avg_opponent_win_pct_entering` | mean(opp_wins / opp_decided entering) | bouts_with_opponent_record >= 5 |  |
| `opposition.avg_opponent_prior_bouts` | mean(opp_prior_bouts) | bouts_with_opponent_record >= 5 |  |
| `opposition.opponent_quality_index` | mean(0.5*opp_win_pct_entering + 0.5*min(opp_prior_bouts,30)/30) | bouts_with_opponent_record >= 5 |  |
| `opposition.title_fights` | count(bouts with a title at stake) | - |  |
| `opposition.championship_rounds_boxed` | sum(max(rounds_completed - 9, 0)) over title fights | - |  |
| `division.current` | weight_class_key of latest bout | bouts_with_division >= 1 |  |
| `division.recent` | weight_class_key of last 5 bouts | bouts_with_division >= 1 |  |
| `division.bouts_at_current` | length of latest same-division streak | bouts_with_division >= 1 |  |
| `division.days_since_change` | cutoff - start of latest same-division streak | bouts_with_division >= 2 |  |
| `division.last_move` | sign(order(current) - order(previous division)) | bouts_with_division >= 2 |  |
| `stance.win_rate_vs_orthodox` | wins / decided bouts where opponent.stance = orthodox | decided_bouts_vs_stance >= 5 |  |
| `stance.win_rate_vs_southpaw` | wins / decided bouts where opponent.stance = southpaw | decided_bouts_vs_stance >= 5 |  |

### Judge and referee metrics (19)

| Key | Formula | Minimum sample | Needs |
|---|---|---|---|
| `judge.bouts_scored` | count(bouts with judge card) | - |  |
| `judge.rounds_scored` | count(scorecard rounds) | - |  |
| `judge.avg_card_margin` | mean(abs(a_total - b_total)) | bouts >= 10 |  |
| `judge.panel_disagreement_rate` | bouts(my_winner != majority(other winners)) / comparable bouts | comparable_bouts >= 10 |  |
| `judge.split_decision_involvement` | bouts(result.decision_type = split) / bouts(result.method in DECISION, TECHNICAL_DECISION) | decision_bouts >= 10 |  |
| `judge.majority_decision_involvement` | bouts(result.decision_type = majority) / bouts(result.method in DECISION, TECHNICAL_DECISION) | decision_bouts >= 10 |  |
| `judge.round_10_10_rate` | rounds(a = b) / rounds scored | rounds >= 60 |  |
| `judge.round_10_8_rate` | rounds(abs(a - b) >= 2) / rounds scored | rounds >= 60 |  |
| `judge.round_consensus_distance` | mean(abs(my_margin_r - mean(other_margins_r))) | rounds >= 60 |  |
| `judge.title_fight_assignments` | count(judged bouts with a title at stake) | - |  |
| `judge.jurisdictions` | count by commission | - |  |
| `referee.bouts_refereed` | count(refereed bouts with result) | - |  |
| `referee.stoppage_rate` | bouts(method in KO,TKO,RTD) / refereed bouts with result | bouts >= 10 |  |
| `referee.avg_stoppage_round` | mean(result.round over stoppages) | stoppages >= 5 |  |
| `referee.ko_tko_stoppages` | count(method in KO,TKO,RTD) | - |  |
| `referee.disqualifications` | count(method = DQ) | - |  |
| `referee.point_deductions_per_bout` | sum(point deductions) / refereed bouts | bouts >= 10 |  |
| `referee.title_fights` | count(refereed bouts with a title at stake) | - |  |
| `referee.avg_completed_rounds` | mean(rounds_completed) | bouts >= 10 |  |

Late-fight metrics use rounds 9 and up, and they cover historical 15-round bouts: a KO in round 14 at 1:00 counts 13⅓ completed rounds. Championship rounds are rounds 10 and up in title fights.

## Judge DNA and Referee DNA

- **Judge DNA** is computed from stored scorecards as they stood at the cutoff, round by round where rounds exist.
  - Panel comparisons need at least two other cards.
  - `panel_disagreement_rate` only counts bouts where the other judges form a majority.
- **Referee DNA** is computed from stored bouts with an active referee assignment, the result as of the cutoff, and stored point deductions.
- Minimum samples: 10 bouts for rates, 60 rounds for round-level rates, 5 stoppages for the average stoppage round. Below the minimum the value is null.

## Matchup snapshots: `pbe_matchup_dna@1.0.0`

`boxing_matchup_snapshots` has one immutable row per `(bout, model_key, model_version, input_cutoff, inputs_hash)`. Each row contains:

- `bout_id`, `fighter_a_id`, `fighter_b_id` (canonical)
- `input_cutoff` (= `as_of`)
- `metric_versions`
- `features` with the **raw metric values embedded** for both corners (status, value, sample size, version), plus:
  - age at cutoff, and height/reach/stance, flagged as *not* point-in-time
  - differentials, null unless both sides are `available`
  - stance interaction
- `inputs_hash` = sha256 of the canonical feature JSON
- `engine_version`, `created_at`

A trigger refuses a cutoff after the bout start (`BX120`). Because raw values are embedded, a later recomputation of either fighter's DNA can never change an existing snapshot. A later fight produces the same hash at the same cutoff and a different snapshot at a later cutoff. This makes snapshots safe for backtesting.

## Models and fair prices

- **`boxing_models`** is keyed on `(model_key, version)`. Each row records:
  - target and feature model key/version
  - training cutoff, window and sample size
  - status (`untrained → trained → validated → retired`), `unavailable_reason` and calibration
  - Registration fields are frozen. Only status and calibration can change, and only forward.
- **`pbe_bout_winner@0.1.0` is registered as `untrained`.** No model has been trained and no probability has been produced.
- **`boxing_model_outputs`** is append-only. An output is refused when:
  - the model is not trained or validated (`BX111`)
  - its feature version or cutoff does not match the snapshot (`BX112`)
  - the model's training cutoff is after the snapshot cutoff (`BX113`)
  - there is no registered snapshot for the bout (FK)
- **Fair prices** are checked by the database: `fair_decimal = round(1/p, 6)`; `fair_american = -round(100p/(1-p))` for p ≥ 0.5, else `round(100(1-p)/p)`. The same math lives in `shared/intel/fair-odds.mjs`, and `fairMarket` requires probabilities that sum to 1.

## Read-only gateway: `workers/boxing-gateway`

The contract is `contracts/boxing-gateway.v1.json`, generated from `src/routes.mjs` by `node scripts/gen-gateway-contract.mjs`; a test fails if it is stale.

- Requires Bearer `BOXING_INTERNAL_TOKEN` (≥ 32 chars).
- GET only; anything else returns 405.
- No cron, no writes, no collection, no public routes.
- Handlers receive a frozen store view that exposes only the listed read methods.

Routes:
- `/internal/v1/fighters/:ref`, `/internal/v1/fighters/:ref/dna`
- `/internal/v1/events/:id`
- `/internal/v1/bouts/:id`, `/internal/v1/bouts/:id/matchup`, `/internal/v1/bouts/:id/odds-summary`
- `/internal/v1/titles/:id`, `/internal/v1/title-map`, `/internal/v1/rankings`
- `/internal/v1/officials/:id`, `/internal/v1/officials/:id/dna`
- `/internal/v1/models`, `/internal/v1/contract`

## Known limits

- Height, reach and stance are current attributes, not point-in-time measurements. Snapshots flag this.
- A sourced entering record without draws counts draws as 0.
- Coverage of early careers depends on the graph. `activity.pro_bouts` counts graph bouts, not a licensed career record.
- `division.last_move` uses the weight-class order. Catchweights without a class are skipped.
- No scheduler runs the engine yet. Computation is invoked explicitly (`runFighterDna`, `computeOfficialDna`, `buildMatchupSnapshot`).
