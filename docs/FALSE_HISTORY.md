# Preserved false history

Boxing Core is append-only for official facts: results, scorecards, card changes, identity decisions and news events are never deleted or rewritten. When a parser bug writes a wrong fact, the wrong row stays and a later, explicitly labelled row corrects it. This page records every known case on staging, so a reader of the tables can tell a parser mistake from an official correction.

## 1. Florida repeat pairings collapsed into one bout (2026-09-13)

| | |
|---|---|
| Caused by | `florida-athletic-commission@1.0.0` |
| Fixed by | `@1.0.1` (distinct repeat-pairing bout ids) and `@1.0.2` (re-apply attaches ids to the orphan bouts) |
| Where | Team Boxing League cards, Fort Lauderdale, 2026-05-08 and 2026-06-26 (staging `wpaxofilvbsjyrxrwjhg` only) |
| Rows kept | 10 false result revisions + 10 restoring revisions; 20 news events set `skipped` |

**What happened.**
- Team Boxing League cards match the same two boxers twice in one night.
- Parser 1.0.0 gave both meetings the same source bout id (`<event>|<a>|<b>`), so the second meeting's official result was written to the first meeting's canonical bout as result revision 2.
- On the 10 affected bouts that produced 7 false `RESULT_OVERTURNED` events (the second meeting had the other winner) and 3 false `RESULT_CORRECTED` events (same winner, different method or round).
- The second meeting also created its own canonical bout, but its source id insert collided, so it had no id and no result.

**How it was corrected.**
1. **Parser 1.0.1:** the first meeting keeps `<event>|<a>|<b>`, later meetings get `|2`, `|3`. Re-parsing the unchanged documents wrote result revision 3 on each affected bout, restoring the first meeting's official result with `change_reason = 'reparsed_with_florida-athletic-commission@1.0.1'`.
2. **Adapter 1.0.2 re-apply:** the 15 orphan second-meeting bouts were matched by exact pairing on the official card and received their own source ids through the fail-closed mapping, then their official results.
3. **News:** the 20 correction events produced by the false revisions and their restoration were set to `skipped`. None had become an article.

**Why the false rows stay.**
- **Revision history is evidence.** Revision 2 records that PropBetEdge once believed something different. Deleting it would make revision 3 look like an official change.
- **The mistake is labelled, not hidden.** The restoring revision names the parser version in `change_reason`. Revision 2 has `change_reason = null` because it was written as an official change; this document is its annotation.
- **Anything derived in between can be re-derived.** Metrics or articles computed from revision 2 can be found and recomputed by time, which is impossible once the row is gone.
- **Regression locks:** `tests/db/13_commission_ingestion.test.mjs`, tests "repeat pairings on one card stay separate bouts…" and "legacy collapsed repeat pairing (parser 1.0.0) is repaired…".

**How to read the tables.**
- A `boxing_bout_results` row with `revision > 1` and `change_reason` starting `reparsed_with_` is a parser correction, not an official one.
- On the two Team Boxing League dates, revision 2 of the 10 bouts is the known false row.

## 2. New events emitted `VENUE_CHANGED` for their first venue (2026-09-13)

- **Caused by:** card application before commit `f234d0b`. A newly created event diffed its venue against "no venue" and emitted `VENUE_CHANGED` beside `EVENT_ADDED`.
- **Kept:** 71 news events, set to `skipped`. The `venue_changed` card-change rows stay; they are how a new event's venue is written.
- **Locked by:** `tests/db/13` (New Jersey) and `tests/db/14` ("a new event venue is not a change; a later venue change is").

## 3. Backfilled history emitted as news (2026-09-13)

- **Caused by:** the 2026 commission backfills, before the temporal news gate (migration 0016). Every past fight, weigh-in, suspension and result discovered by a backfill became a `new` or `needs_review` news event dated at detection time.
- **Kept:** 1,796 events. Migration 0016 set them to `skipped` (state only; payloads are immutable) under the rule "event more than 14 days before detection, never turned into an article".
- **New rows:** they carry `payload.temporal` (`mode`, `event_date`, `detected_at`, `days_after_event`, `newsworthy`) and are skipped at insert when written by a backfill or re-apply.
- **Locked by:** `tests/db/14` (backfill news skipped; a re-apply that unlocks a months-old bout emits only skipped history).

## 4. Re-parsed documents kept the old parse as their stored observation (found 2026-09-13)

- **Caused by:** commission document observations deduplicated on the PDF hash alone. Re-parsing the same bytes with a newer parser returned the original observation, so the stored parse still carried parser 1.0.0's collapsed bout ids.
- **Fix:** the observation hash now includes the parser version, so a new parser writes a new observation.
- **Re-apply:** it reads the latest observation per document and re-runs the deterministic bout-id assignment, so older stored parses are normalized without refetching.
- **Nothing deleted:** the older observations remain.

## 5. New Jersey weigh-ins judged against class limits instead of printed contracts (2026-09-13)

- **Caused by:** the first New Jersey result run with division-label mapping (commit `4313423`). "Middleweight (165 lbs.)" was stored as the middleweight class (160 lb limit) with no contracted weight, so a 165 lb boxer was classified `missed_weight`. The printed number is the contracted weight.
- **Fixed by:** commit `00ac958`. The number becomes `contracted_weight_lb`, and the class is kept only when the contract falls inside the labelled class band. A contradictory label ("Heavyweight (147 lbs.)", "Middleweight (165 lbs.)") yields no class and clears the one set earlier (3 bouts).
- **Repair:** the stored parses were re-applied with no refetch. Weigh-ins were revised append-only:

| Previous status | Revised status | Rows | What it means |
|---|---|---|---|
| missed | made | 4 | false misses |
| made | missed | 12 | real misses against a catchweight contract that the class limit had hidden |
| made | made | 30 | contract refined |
| recorded | made | 2 | |

- **Kept:** every superseded weigh-in row (`supersedes_id`). No false miss reached an article: the news was written by a backfill, so it was already skipped history.
- **Locked by:** `shared/adapters/commissions/commissions.test.mjs` (printed division labels), `shared/events/events.test.mjs` (only an explicit contradiction clears a class) and `tests/db/13` (a 165 lb contract is made, not missed).
