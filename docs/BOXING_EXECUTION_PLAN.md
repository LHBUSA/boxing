# Boxing execution plan

How Boxing Core v1 (`BOXING_CORE_V1.md`) becomes running infrastructure. This document covers the services, where their code lives, what each one reads and writes, how they are scheduled, and which UFC patterns carry over.

## Platform rule

| Layer | Owner |
|---|---|
| Source control | GitHub `LHBUSA/boxing` |
| System of record | Supabase Postgres (boxing project; **not yet provisioned**, see Blockers) |
| Runtime, cron, provider mediation, APIs | Cloudflare Workers |
| Consumer UI (`boxing.propbetedge.ai`) | Vercel, later. It reads only from `boxing-gateway` |

Rules that apply to every service:
- **GitHub never schedules, never deploys and runs no Actions.** Tests run locally (`npm run verify`); the web deploys through Vercel's native Git integration from `main`. Workers are deployed with `wrangler` from a clean `git archive` of a pushed commit, and the previous version id is captured as the rollback target first.
- Workers write with the Supabase **service role** through PostgREST, always with an explicit `?on_conflict=<cols>`. Without it, PostgREST infers the primary key, and a rerun fails with 23505 instead of being idempotent.
- A write is only as trustworthy as its observation. Adapters write `boxing_source_observations` first (the source gate enforces `SOURCE_POLICY.md` in the database). Normalizers then write canonical rows and `boxing_observation_links`.
- Every run writes one `boxing_ingest_runs` row with counters and named assertion failures. A parser that sees an unexpected shape stops and records the failure; it never writes a guess.
- Collection is **off by default**. Each worker has an `*_ENABLED` var that defaults to `"false"`, and the source row must also be `enabled`.

## Repository layout

```
contracts/                  JSON contracts shared across services
docs/                       architecture, source policy, audits, this plan
shared/                     pure ESM modules (no I/O), unit-tested, imported by workers
  canonical.mjs             canonical JSON + sha256 content hashes / dedupe keys
  identity/                 name normalization, evidence scoring, resolver core   (#1)
  odds/                     price conversion, market normalization, derivations    (#4)
  rankings/                 snapshot diff / change detection                      (#2)
  events/                   card diff, result/scorecard validation                 (#3)
  news/                     fact-block builder, prose validator                    (#5)
  adapters/                 source adapter interface + per-source adapters (disabled unless approved)
supabase/migrations/        forward-only, rerunnable SQL; every file ends with boxing_lockdown()
supabase/tests/             local stand-ins for Supabase roles/grants
tests/db/                   schema/behavior tests against a disposable local Postgres
tests/fixtures/             recorded or synthetic source payloads (no private data)
workers/<name>/             wrangler.toml, src/index.mjs, src/*.test.mjs
scripts/                    local operator scripts (check-secrets, local DB apply, replay)
```

Conventions carried over from UFC: plain ESM `.mjs`, `node --test`, `wrangler.toml`, and pure logic in `shared/` so a replay CLI and a Worker run the same code.

## Services

### boxing-identity (issue #1)
Canonical boxers and officials.

- **Reads:** identity observations from approved sources, plus resolve requests from other services (odds participants, ranking entries, card entries).
- **Writes:** `boxing_fighters`, `boxing_fighter_identities`, `boxing_fighter_aliases`, fighter attribute claims, `boxing_identity_review_queue`, merge audit.
- **Interface:** an internal service binding offering `resolveFighter(sourceIdentity)`, `getFighter(id)`, `listIdentities(id)`, `listAliases(id)` and `listUnresolved()`. It is not a public API.
- **Rules:**
  - A deterministic external-id match wins.
  - A name match needs corroborating evidence (DOB, nationality, known opponent, bout context).
  - Fuzzy similarity only nominates candidates.
  - An ambiguous or conflicting match goes to the review queue with its candidates, scores and reasons, and never merges automatically.
  - An existing mapping of the same external id to a different boxer is a hard conflict that goes to review.
- **Schedule:** on demand (called by other workers), plus a seed run per approved source. No polling.

### boxing-events (issue #3)
Forward capture of cards and official outcomes.

- **Writes:**
  - `boxing_events`, `boxing_bouts`, `boxing_bout_participants` and the card-state history
  - `boxing_event_organizations`, where promoter, broadcaster and sanctioning roles are distinct
  - `boxing_bout_titles`
  - `boxing_weigh_ins`, `boxing_bout_officials`, `boxing_scorecards` / rounds, `boxing_point_deductions`
  - `boxing_bout_results` (versioned), `boxing_regulatory_actions`
  - `boxing_fight_state_ledger` checkpoints
- **Emits:** `FIGHT_ANNOUNCED`, `OPPONENT_REPLACED`, `FIGHT_CANCELLED`/`POSTPONED`, `VENUE_CHANGED`, `WEIGH_IN_RESULT`, `WEIGHT_MISSED` (verified only), `OFFICIALS_ASSIGNED`, `RESULT_OFFICIAL`, `RESULT_OVERTURNED`, `SCORECARD_POSTED`, `SUSPENSION_POSTED`.
- **Rules:**
  - A replacement is a new participant state; the prior state is never erased.
  - A commission correction is a new revision.
  - No private medical data is stored.
- **Schedule:** Cloudflare cron with fight-week density. Daily outside fight week; hourly from T-72h; tighter around weigh-ins and results, only for events in that window.

### boxing-rankings (issue #2)
Organization-specific ranking snapshots and the title graph.

- **Writes:** `boxing_ranking_snapshots` / entries (append-only revisions), `boxing_titles`, reigns, title events.
- **Emits:** `RANKING_CHANGED`, `TITLE_WON`, `TITLE_VACATED`, `TITLE_STRIPPED`, `TITLE_STATUS_CHANGED`.
- **Interface:** Title Map queries for a division and date: champions by organization, rankings, vacancies, sourced mandatories, overlaps, and unification/undisputed state (derived, never stored as a fact).
- **Schedule:** weekly check for a new published list per organization. Unchanged content (same hash) is a no-op.
- **Status:** WBC/WBA/IBF/WBO adapters stay off until each site's terms are reviewed. Parsers are built against stored fixtures.

### boxing-odds (issue #4)
Immutable market history.

- **Writes:** `boxing_odds_providers`, `boxing_bookmakers`, `boxing_markets`, `boxing_market_selections`, `boxing_market_ticks` (append-only, deduped against the latest tick), unmatched-market queue, `boxing_ingest_runs` with quota counters.
- **Derives (views/functions):** opening, latest valid and closing prices; price and implied-probability change; bookmaker count; cross-book min/max/dispersion; consensus; staleness.
- **Emits:** `MARKET_MOVED`, thresholded and deduped on (bout, selection, price-band window) so a repeated state never re-emits.
- **Rules:**
  - Provider participants resolve through boxing-identity **scoped to one bout**. Both corners must resolve to the two participants of the same bout, or the market goes to the unmatched queue.
  - Provider timestamps are kept separately from ingest time.
- **Schedule:** fixed ingest windows, never user-driven. The NFL odds outage (credits burned by polling) is the standing lesson. A quota preflight runs against an unmetered endpoint.

### boxing-news (issue #5)
Fact-driven wire.

- **Reads:** `boxing_news_events` (contract `boxing-news-event.schema.json` v1.1.0).
- **Writes:** fact blocks and articles, with review state, sources, event id, model and generation versions, and timestamps.
- **Pipeline:** observation → normalized fact → change detection → news event → immutable fact block (every field tagged `canonical_fact`, `attributed_statement` or `pbe_derived`) → PBE context → prose → validation → review/publish.
- **Rules:**
  - A deterministic validator rejects any number, name, title, odds or result claim not present in the fact block.
  - A missing field produces no sentence; nothing is filled in.
  - Sensitive or low-confidence events stay unpublished.
  - One article per news event; corrections become new versions.
- **Schedule:** queue-driven off new news events, with a cron sweep as a fallback.

### boxing-intel (issue #6)
Versioned derived analytics only.

- **Writes:** `boxing_metric_definitions` (frozen per version), `boxing_fighter_metric_snapshots`, `boxing_matchup_snapshots`, `boxing_official_metric_snapshots` (sample size required). It never writes a canonical fact table, and the schema has no FK path that would let it.
- **Schedule:** a rebuild after new official results, plus a nightly deterministic rebuild. The same input watermark must produce the same output.
- **Status (#6):** schema, engine and tests built (`docs/FIGHT_DNA.md`); no scheduler yet.

### boxing-gateway
Read API for first-party products.

- **Routes:** `/v1/boxing/{fighters,events,bouts,rankings,titles,odds,intelligence,news}`.
- **Reads** through service bindings or Supabase with a read-scoped role. It never exposes raw observations or rights-restricted fields, and it filters on `display_allowed` / `redistribution_allowed`.
- Stale market data is labelled with its age and never presented as live.
- **Status:** built as an internal, read-only, bearer-token Worker (`workers/boxing-gateway`, contract `contracts/boxing-gateway.v1.json`); NOT DEPLOYED. The public `/v1/boxing/*` shape and `display_allowed` filtering come with the consumer API.

## UFC concepts reused vs. intentionally different

| Concept | UFC implementation | Boxing decision |
|---|---|---|
| Canonical IDs + external identities | `combat_fighters` / `combat_fighter_identities` with verification states | **Reused.** Also applied to officials, events and bouts |
| Name normalization | `shared/alias_resolver.mjs` (NFKD, translit table, punctuation) | **Reused as a base, extended** for Jr/Sr/II/III, two-surname Spanish names, Cyrillic transliteration variants and token reordering, while keeping the source-native name |
| Never auto-merge on name alone | Resolver requires a second key | **Reused, stricter.** Fuzzy similarity only nominates; conflicts always go to review |
| Merge proof before apply | Plan/render/BEGIN…ROLLBACK proof, audit rows | **Reused** for any future production merge |
| Source registry + DB gate | `combat_sources` + `combat_guard_fact_source` trigger | **Reused, stricter.** Persistence/derivative/display rights are required fields; `identity_only` sources are limited to identity observations |
| Append-only ledgers | Per-table immutable triggers | **Generalized** into `boxing_append_only()` / `boxing_guard_mutable_columns()`, with an audited override |
| Fight DNA versioning | `(metric_key, definition_version)`, as-of snapshots | **Reused.** Definitions are also frozen in the DB |
| Fact-block newsroom + number validator | Two-class number gate, banned odds/pick language | **Reused, stricter.** Field-level provenance labels and absence rules per fact type |
| Odds matching | Both corners must resolve within one bout; unmatched queue | **Reused** |
| Tick uniqueness | Unique on (bout, book, market, outcome, last_update, price) | **Different.** Dedupe compares against the *latest* tick per selection, so A→B→A price reversions are kept even when a provider omits timestamps |
| Single promotion | UFC is its own promoter; titles are UFC's | **Different.** Promoter, sanctioning body, commission, broadcaster, media and ranking board are separate typed entities. One bout contests several titles |
| Titles | One belt per division (plus interim) | **Different.** A title graph per organization with source-native statuses (super / regular / franchise / interim / silver). Undisputed is derived from simultaneous ownership |
| Rankings | Single UFC ranking list | **Different.** Per-organization dated snapshots with revisions, where champions and vacancies are entries |
| Results | One result per bout | **Different.** Versioned results (overturned to NC, amended), with decision agreement type and referee-scored `PTS` |
| Scorecards | Three judges, 10-point rounds | **Different.** Referee-only scoring, half points, deductions, corrected cards |
| Weigh-ins | Single official weigh-in | **Different.** Official, rehydration check (IBF) and fight-day check are distinct kinds, with unit provenance |
| Round counts | 3 or 5 | **Different.** 1..45 for historical backfill |
| GitHub cron workflows | Some UFC workflows still carry cron triggers | **Not reused.** GitHub schedules nothing here |

## Build order and gates

1. **Foundation** (this change): schema audit, hardening migration, test harness, CI. Gate: `npm test` is green, and a rerun of the chain is a no-op.
2. **Identity** (#1): resolver plus fixtures. Gate: the adversarial identity fixture suite passes, and no weak match merges.
3. **Odds** (#4): adapter, normalization, derivations. Gate: tests pass. Live capture needs provider rights and a provisioned database.
4. **Titles/rankings** (#2). Gate: the Title Map queries pass fixture scenarios.
5. **Events** (#3). Gate: the card-history and scorecard scenarios pass.
6. **Newsroom** (#5). Gate: the adversarial fact-block suite passes.
7. **Intel** (#6), then **gateway**.

## Blockers

- **No boxing Supabase project is provisioned or configured in this repo.** Nothing has been applied remotely. Applying migrations to any remote database requires the owner's explicit approval.
- **Sources:** every candidate source except `wikidata` (CC0, identity/reference) and internal sources is `review_required`. That covers BoxRec, CompuBox, WBC/WBA/IBF/WBO, commissions, promoters and odds providers. Collection stays off until each one is reviewed.
