# Titles and rankings (issue #2)

**Status:** built and tested. Since 2026-09-14 WBA, IBF and WBO official sources are approved and collected on staging; WBC is not licensed. Ingestion, the four-lane Title Map and body-native rankings are described in [TITLES_RANKINGS_INGESTION.md](TITLES_RANKINGS_INGESTION.md).

There is no `fighter.current_belt`. Belts are a historical graph.

## Organizations

WBC, WBA, IBF and WBO are seeded as `sanctioning_body` / `world` organizations. Each is linked to its candidate source row (`wbc_official`, …), and all of those rows are `review_required`.

Organization kinds are enforced in the database. Promoters, broadcasters, commissions (a separate table) and record keepers cannot issue titles or rankings. `media` and `ranking_body` can, which covers The Ring and TBRB when added. Further sanctioning bodies (IBO, WBF, regional bodies such as the EBU or NABF) are added as rows with a `sanctioning_scope`; no code changes are needed.

## Title model

| Concept | Representation |
|---|---|
| A belt lineage | `boxing_titles`: organization + division + gender + **tier**, with the `source_native_label` kept verbatim |
| Tiers | `world`, `super`, `regular`, `interim`, `franchise`, `silver`, `diamond`, `gold`, `emeritus`, `regional`, `other` |
| Coexisting belts | WBA Super + WBA World/Regular + WBA Interim are three lineages with three possible holders at once; WBC world + WBC interim likewise |
| Facts | `boxing_title_events` (append-only): `won`, `awarded`, `elevated`, `reinstated`, `defended`, `vacated`, `relinquished`, `stripped`, `lost`, `downgraded`, `status_changed`, `retraction`, each with `effective_on`, same-day `sequence`, optional `bout_id`, `source_native_status`, public reason, source, observation |
| Reigns / vacancy | **Derived** by `boxing_title_reigns_derived()`. A start by the reigning champion is a continuation. A reign ends at the next end event or at a start by someone else. No reign = vacant |
| Corrections | A new event with `supersedes_id`, or a `retraction`. The original stays readable, and deleting it is refused |
| Title won via bout | The bout must have contested that title (`BX061`), the boxer must have boxed in it (`BX064`), and a winning event must agree with the current official result (`BX062`) |
| Title awarded, vacated or stripped without a bout | Supported; no bout required |
| Multi-title bouts | `boxing_bout_titles`: one row per belt at stake |

`boxing_title_reigns` from 0001 is deprecated. It was a mutable table where ending a reign meant overwriting it.

### Undisputed and unified (`pbe_undisputed@1`, PropBetEdge-derived)

These are computed, never stored:
- **Primary champion** of an organization at a date: the holder of its highest-priority belt flagged `counts_toward_undisputed`. Priority is WBA Super (5), then World (10), then WBA Regular (20).
- Interim, franchise, silver, diamond, gold, emeritus and regional belts never count by default. The flag is per lineage and can be changed by migration if the owner's policy differs.
- **Undisputed**: one boxer is the primary champion of all four of WBC, WBA, IBF and WBO.
- **Unified**: primary champion of two or three of them.
- The output lists exactly which belts counted, and is labelled `PropBetEdge-derived` with the rule version.

## Rankings

| Requirement | Implementation |
|---|---|
| Immutable historical snapshots | `boxing_ranking_snapshots` / `entries` are append-only. A new month is a new snapshot |
| Organization, division, gender, dates | Snapshot columns (`gender_scope` added in 0006); the source-native `division_label` is kept |
| Rank | `position` (list order), `rank` (numeric if any), `rank_label` source-native (`C`, `SC`, `IC`, `1`, …), plus `is_champion` and `is_vacant` |
| Fighter | `fighter_id` resolved through identity; an unresolved entry keeps `source_name` with `fighter_id` NULL. It is never guessed |
| Mandatory | `mandatory` only when the list states it; NULL otherwise. It is never inferred from rank |
| Idempotent | The same document (content hash) is a `duplicate`; nothing is written |
| Source correction | The same org/division/date with different content becomes a new **revision** linked by `supersedes_id`, with a correction note. The original snapshot is still readable, and "as of" reads pick the latest non-superseded revision |

**Ranking documents** (`shared/rankings/import.mjs`) are the structured form of one published list. An approved adapter or an operator produces them. Entry identity is resolved in this order:
1. The organization's own id, if already mapped.
2. The same normalized name at that org/division in the prior snapshot.
3. A lookup-only resolver call.
4. Otherwise unresolved.

### Change detection → `RANKING_CHANGED`

`diffRankings(previous, current)` reports:
- `moved_up`, `moved_down`, `new_entrant`, `removed`
- `became_champion`, `no_longer_champion`, `champion_changed`, `title_vacant_in_ranking`
- `designation_changed`, `mandatory_changed` (only when both lists state mandatory status)

Each import emits **one** `RANKING_CHANGED` event carrying all changes. Its dedupe key is org + division + gender + previous snapshot + current snapshot. A correction revision emits a new event with `supersedes_dedupe_key` and requires review. Any change involving an unresolved boxer also requires review.

### Title events → news

| Title event | News event | Review |
|---|---|---|
| won / awarded / elevated | `TITLE_WON` | |
| vacated / relinquished | `TITLE_VACATED` | |
| stripped | `TITLE_STRIPPED` | required |
| lost / downgraded / status_changed / reinstated / retraction | `TITLE_STATUS_CHANGED` | retraction and downgrade: required |
| any correction (has `supersedes_id`) | same as the corrected type, linked by `supersedes_dedupe_key` | required |
| defended | none (reported with the result, #3) | |

A title event's fact key excludes the source. The same fact from a second source attaches its observation to the existing event, so it creates neither a duplicate reign change nor a duplicate story.

## PBE Title Map

`boxing_title_map_facts(weight_class, gender, as_of)` returns the facts, and `buildTitleMap()` shapes them. The map shows, for any division and date:
- Every belt per organization: held or vacant, holder, when the reign started, defenses, last change.
- The primary champion per organization.
- Vacancies, and overlapping champions (e.g. three WBA holders).
- The current ranking snapshot per organization, with sourced mandatory challengers.
- Recent changes: title events in the last 180 days, plus the ranking diff against the previous snapshot.
- Unified/undisputed state (derived and versioned).

Internal route: `GET /internal/v1/title-map?weight_class=&gender=&as_of=` on `boxing-rankings`.

## Rights

| Source | State |
|---|---|
| `wba_official`, `ibf_official`, `wbo_official` | `approved_ingest`, enabled (owner approval 2026-09-14, rights reviews in migration 0033). Facts only, attributed, no redistribution of copied HTML/PDF |
| `wbc_official` | `review_required`, disabled: **not licensed**. No collector exists; scheduled runs record `blocked`; the database refuses its imports (`BX010`). Permission request drafted, not sent: [permission-requests/wbc.md](permission-requests/wbc.md) |

Test fixtures stay synthetic.

## Tests

- **`tests/db/07_titles_rankings.test.mjs` (14):** organizations; won via bout; simultaneous belts; lose one keep others; bout/result/participant guards; interim + full; vacancy without a bout; division change; stripping and second-source dedupe; WBA super/regular/interim and WBC franchise statuses; undisputed derivation and history; corrected title event; snapshots over time with every change type; correction revision; the Title Map; refusal of unapproved sources.
- **Unit tests:** division label parsing, document validation, ranking diff, title-map derivation, worker gating.
