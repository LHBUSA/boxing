# Boxing Core schema audit — 2026-09-12

Scope: `20260912000001_boxing_core_v1.sql` and `20260912000002_boxing_regulatory_stats_intel.sql` as committed at `271723f`.

Method: I applied both migrations to a disposable local PostgreSQL 17 database, dumped every constraint and FK, and read each table against boxing semantics and `SOURCE_POLICY.md`. The fixes are in a **forward** migration, `20260912000003_boxing_foundation_hardening.sql`. The earlier files are not edited, so the chain stays correct even if 0001/0002 were already applied somewhere.

Baseline result: both files applied cleanly and re-ran as no-ops. Neither is broken SQL. The problems below are semantic.

Each finding carries a section tag (H1–H17) that matches the comment headers in migration 0003.

## Severity: critical

### H1 / lockdown — every table was writable with the Supabase anon key
Supabase exposes `public` through PostgREST and grants new tables to `anon` and `authenticated` by default. 0001/0002 enabled RLS nowhere, so a deploy would have let anyone holding the public anon key read **and write** fighters, odds ticks and results.

**Fix.** `boxing_lockdown()` enables RLS with no policies and revokes table and function privileges from `public`, `anon` and `authenticated`. It covers every `boxing_*` table, view and function. `service_role` (BYPASSRLS) keeps access. Every future migration must end with `select public.boxing_lockdown();`.

**Test.** The harness recreates Supabase's default grants locally (`supabase/tests/supabase_roles.sql`) before the migrations run. That way the test exercises the real danger instead of a Postgres default that happens to be safe.

### H2 — cascading deletes could erase immutable history
Several foreign keys cascaded:
- events → bouts → markets → selections → **ticks**
- bouts/events → **fight_state_ledger**
- bouts → results, scorecards, weigh-ins
- fighters → identities, aliases, metric snapshots

One mistaken `DELETE FROM boxing_events` would have silently destroyed the odds history and ledger checkpoints the architecture says cannot be recreated. `ON DELETE SET NULL` references also severed provenance silently.

**Fix.** Every FK in the boxing graph is now `ON DELETE RESTRICT`. Canonical entities are cancelled, merged or superseded, never hard-deleted. A test asserts that no non-restrict FK exists.

### H4 — raw observations were mutable, mixed with normalization, and duplicated on every rerun
- `canonicalized_at` and `canonical_entity_id` lived on the observation row and were updated after normalization. Raw and normalized state shared one mutable row, and one observation could support only one entity.
- `content_hash` was optional and not unique, so re-ingesting the same payload duplicated raw rows.

**Fix.**
- The normalization columns are dropped. The link now lives in the append-only `boxing_observation_links` table: many-to-many, with roles `created`, `supports`, `matched`, `contradicts` and `superseded`.
- `content_hash` is required, with `unique nulls not distinct (source_id, entity_type, external_key, content_hash)`.
- Observations are append-only (UPDATE, DELETE and TRUNCATE are refused).

### H3 — the source registry did not enforce the source policy
0001 refused `enabled = true` only when `access_mode = 'blocked'`, so a `review_required` or `unknown` source could be enabled. The fields `SOURCE_POLICY.md` requires before enablement did not exist: persistence, derivative and display rights, attribution, and rate limits.

**Fix.**
- New columns: `intended_use`, `persistence_allowed`, `derivative_allowed`, `display_allowed`, `attribution_required`, `rate_limit_note`, `contract_reference`, `reviewed_by`.
- Enabling a source now requires `access_mode ∈ {approved_ingest, identity_only}`, `rights_state ∈ {internal, approved}` and `reviewed_at` set.
- A `BEFORE INSERT` gate on raw observations refuses any source that is not enabled, not persistence-approved, or not ingestable. `identity_only` sources may write only `*identity` observations.
- The persistence requirement sits in the gate, not the CHECK, because CHECKs run before `ON CONFLICT`. As a CHECK, it would reject 0001's own seed rows on a rerun; the test suite caught this.

## Severity: high (boxing semantics)

### H9 — results could not be corrected, and methods conflated outcomes
- `bout_id` was the primary key of `boxing_bout_results`. A commission overturning a win to a no contest (for example after a failed drug test) could only be recorded by overwriting the official result.
- `method` mixed outcome with method:
  - `DRAW` could not say whether a draw was unanimous, split or majority.
  - `TD` could mean either technical decision or technical draw.
  - Referee-scored decisions (UK `PTS`) and historical newspaper decisions had no representation.
- `winner_id` could name a fighter who was not in the bout.

**Fix.**
- Results are versioned rows: `revision`, `supersedes_id` (same bout, enforced by a composite FK), `result_state ∈ {provisional, official, amended, overturned}` and `change_reason`. They are append-only, a unique index allows one successor per row so chains cannot fork, and `boxing_bout_results_current` is the derived view.
- `outcome ∈ {win, draw, no_contest, no_decision, unknown}`.
- `method ∈ {KO, TKO, RTD, DQ, DECISION, TECHNICAL_DECISION, NO_CONTEST, NO_DECISION, OTHER}`.
- `decision_type ∈ {unanimous, split, majority, referee, newspaper}`.
- A semantics CHECK enforces the rules: stoppages and DQs have a winner, only decisions carry a `decision_type`, a draw is a decision or technical decision, and so on.
- The winner must be a participant (composite FK to `boxing_bout_participants`).
- Existing `UD`/`SD`/`MD`/`TD`/`NC`/`DRAW` values are mapped forward.

### H10 — scorecards could not be corrected, and missed boxing cases
- `unique (bout_id, judge_id)` meant a corrected card (commission addition errors do happen) overwrote the original.
- `fighter_a_id` and `fighter_b_id` were not tied to the bout.
- Integer points could not hold historical half-point cards.
- The schema could not express referee-only scoring (UK small-hall bouts).
- Point deductions had nowhere to live, and cards did not say whether totals were before or after deductions.

**Fix.**
- Scorecards get `revision`, `supersedes_id`, `card_state ∈ {official, corrected, unofficial}`, `scorer_role ∈ {judge, referee}`, `score_basis ∈ {after_deductions, before_deductions, unknown}` and `slot`.
- Points are `numeric(4,1)`.
- Participant composite FKs are added, and `decision_for_id` must be one of the two fighters.
- Scorecards and rounds are append-only. `boxing_scorecards_current` is the derived view.
- New append-only `boxing_point_deductions`.

### H12 — ranking snapshots duplicated on rerun, and entries could not represent real lists
- `unique (org, class, source, published_on, effective_on)` with nullable dates treated NULLs as distinct, so an undated snapshot re-ingested forever.
- `primary key (snapshot_id, rank)` could not hold a WBA division that lists Super, Regular and Interim champions (all unnumbered), or an IBF list where #1 and #2 are "not rated".
- A source correction could only be applied by rewriting history.

**Fix.**
- A snapshot must have a published or effective date.
- Uniqueness is `nulls not distinct` and includes `revision`.
- Corrections are new revisions with `supersedes_id` and `correction_note`.
- Entries are keyed by `(snapshot_id, position)`, with `rank` nullable, `rank_label` source-native, and `is_vacant` / `is_champion` flags.
- Snapshots and entries are append-only.

### H6 — promoters, broadcasters and sanctioning bodies were one untyped pool
Titles, ranking snapshots and event "sanctioning_body" roles could point at a promoter or a TV network. Record keepers and independent ranking boards had no kind.

**Fix.**
- Kinds gain `ranking_body` and `record_keeper`, plus a `sanctioning_scope` column.
- Triggers enforce which kinds may issue titles and rankings: sanctioning, governing and ranking bodies, plus `media` (The Ring issues a championship and rankings).
- Event-organization roles must match the organization's kind.
- `organization_kind` is frozen after insert.
- Commissions were already a separate table, which is correct.

### H11 — weigh-ins could not tell an official weigh-in from a rehydration check
The IBF fight-morning rehydration check is a separate weigh-in with its own limit. One row per `(bout, fighter, attempt)` could not distinguish it from an official re-weigh. Weights were lb-only with no record of the source unit (kg or stone), and a corrected weight overwrote the original.

**Fix.**
- New columns: `weigh_in_kind ∈ {official, rehydration_check, fight_day_check, ceremonial, unknown}`, `official_weight_kg`, `source_unit`, `source_weight_raw` and `verification_state ∈ {verified, reported, unverified}`. (`WEIGHT_MISSED` news may fire only on `verified`.)
- Revisions and a participant FK are added, and the table is append-only.
- A `miss_lb` consistency CHECK is added.

### H13 — markets duplicated and ticks were unprotected
- `unique (provider, bookmaker, external_market_id)` with a nullable id allowed unlimited duplicate markets. The Odds API has no market ids.
- `market_type` was free text.
- Ticks had no append-only protection, no live flag, no link to the payload that produced them, and accepted impossible American odds such as `+50`.

**Fix.**
- A deterministic `market_key` with `unique (provider, bookmaker, bout, market_key)`.
- A typed `market_type` enum covering the Prompt 3 market families.
- Ticks gain `is_live`, `market_status`, `observation_id` and `ingest_run_id`, plus CHECKs on American odds (≤ −100 or ≥ +100), implied probability (0, 1] and a price being present when the market is open.
- Ticks are append-only. Deduplication and derivations come in the odds migration (issue #4).

### H15 — the fight-state ledger could cross-wire and was not immutable
`bout_id` and `boxing_event_id` were independent FKs, so a checkpoint could record bout X under event Y. UPDATE and DELETE were allowed, and identical checkpoints were re-inserted on every run.

**Fix.**
- A composite FK `(bout_id, boxing_event_id)` → `boxing_bouts(id, event_id)`.
- A trigger-computed `state_hash` with `unique (bout_id, checkpoint, state_hash)`.
- The ledger is append-only.

## Severity: medium

### H5 — identity mappings
- `unique (namespace, external_id)` also covered `rejected` rows. Recording "provider id X is NOT fighter A" therefore blocked ever mapping X to the correct fighter. Uniqueness now applies only to non-rejected mappings (partial unique indexes).
- Merge chains (A→B→C) and silent un-merges were possible. The new `boxing_merge_guard` refuses both, for fighters and officials.
- `public_id` could be rewritten after being published. It is now frozen on fighters, officials, organizations, commissions, venues, events, bouts and titles.
- Events and bouts could carry an external id from only ONE source (`unique (source_id, external_id)`), so a promoter id and an odds-provider id for the same bout could not both attach. The new `boxing_event_identities` and `boxing_bout_identities` tables mirror the fighter identity model.

### H8 — rounds were capped at 15
Pre-modern championship bouts were scheduled for 20–45 rounds (Johnson–Willard, 1915, was scheduled for 45). The planned historical backfill would have been rejected. Round CHECKs on bouts, results, scorecards and punch stats now allow 1..45.

Bouts gain `contracted_weight_kg`, `is_catchweight`, `weight_source_unit` and status `postponed`. Punch stats and matchup snapshots gain participant composite FKs.

### H7 — weight classes
No canonical divisions were seeded, and sanctioning bodies name the same limit differently.

**Fix.**
- 19 divisions are seeded with current professional limits. Heavyweight is seeded with **no** limit; one was not invented.
- The seed notes that the cruiserweight limit was 190 lb before the early 2000s.
- New `boxing_weight_class_aliases` table, organization-scoped.

Known gap, left in place deliberately: division limits have changed historically. Historical bouts must use `contracted_weight_lb`. A per-organization limit history table is deferred until a sourced need exists.

### H14 — news event taxonomy and provenance
- The DB and contract lacked `TITLE_WON`, `TITLE_VACATED`, `TITLE_STRIPPED`, `VENUE_CHANGED`, `FIGHT_POSTPONED`, `EVENT_CANCELLED` and `RESULT_OVERTURNED`.
- Provenance existed only inside the free-form payload, so an event with zero sources was accepted.
- A single `fighter_id` could not reference both fighters in an announcement.
- Payloads were mutable.

**Fix.**
- The taxonomy is reconciled across DB and contract (contract v1.1.0). `BOUT_CANCELLED` → `FIGHT_CANCELLED`, `WEIGH_IN_RECORDED` → `WEIGH_IN_RESULT` and `SUSPENSION_STATUS_CHANGED` → `SUSPENSION_POSTED`.
- A test asserts the contract enum equals the DB CHECK.
- `sources` is required as a non-empty jsonb array. `fighter_ids uuid[]` (GIN-indexed) and `supersedes_id` are added.
- Every column except `state` and `state_changed_at` is frozen.

### H16 — derived intelligence could change meaning silently
A metric definition's `formula_text` could be edited under the same version, silently changing the meaning of every stored value. Snapshots were mutable, and official tendencies could be stored without a sample size (issue #6 requires one).

**Fix.**
- Definitions are frozen except for `retired_at`.
- Fighter, matchup and official metric snapshots are append-only.
- `official_metric_snapshots.sample_size` is `NOT NULL`.

### H17 — hygiene
`updated_at` existed but nothing maintained it; triggers are now installed on every table with the column. Missing FK indexes are added on `bout_titles.title_id`, `title_reigns.won_bout_id`, `events.venue_id` / `commission_id`, `bouts.weight_class_id`, `event_organizations.organization_id`, `ranking_entries.fighter_id`, `scorecards.judge_id`, `markets` provider/book, `selections.fighter_id`, `news_events.bout_id` / `fighter_ids` and `regulatory.commission_id`.

### Audited escape hatch
Real operations occasionally need to correct history, for example a legal takedown or a row written against the wrong bout. Every append-only guard honours `set local boxing.history_override = '<reason>'` inside a transaction. Each such operation is logged to the append-only `boxing_history_override_log`, and the log itself cannot be overridden.

## Not changed (deliberately), deferred to the issue that owns it

| Area | Why deferred | Owner |
|---|---|---|
| Title model: reign overlap rules, interim vs full lineage, super/regular/franchise semantics, `boxing_bout_titles.status` | Needs the title-graph design; changing it piecemeal would churn twice | #2 |
| Card history (replacement / postponement ledger), official assignment history, regulatory action versioning | Forward-capture design | #3 |
| Tick dedupe trigger, derived opening/current/closing views, unmatched queue, `MARKET_MOVED` thresholds | Odds design | #4 |
| Article review states (`generated/review_required/approved/published/rejected`) and fact-block immutability on `boxing_articles` | Newsroom design | #5 |
| Review-queue evidence/confidence columns, fighter attribute provenance, merge audit | Identity resolver design | #1 |
| Knockdown facts | Not required yet; add with licensed stat feeds | #6 |

## Supabase compatibility notes
- Requires PostgreSQL 15+: `NULLS NOT DISTINCT` and `security_invoker` views. Supabase projects run PG 15 or 17.
- Custom SQLSTATEs used by guards: `BX001` append-only, `BX002` immutable column, `BX010`/`BX011` source gate, `BX020` merge guard, `BX030` organization kind.
- All functions set `search_path = ''` and schema-qualify, which satisfies the Supabase advisor's mutable-search-path lint.
- Derived views are `security_invoker`, so they cannot bypass RLS, and are revoked from anon/authenticated.
