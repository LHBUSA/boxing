# Events, card history, officials, results, scorecards and weigh-ins (issue #3)

**Status:** built and tested. **No collection is enabled.** No commission, promoter or broadcaster source is approved, and nothing is deployed.

## Boxing's world is several distinct relationships

| Relationship | Where |
|---|---|
| Promoter(s), co-promoters | `boxing_event_organizations` role `promoter` / `co_promoter` (organization kind must be `promoter`) |
| Broadcaster / platform | role `broadcaster` (kind `broadcaster`) |
| Sanctioning bodies | role `sanctioning_body` for the event; the belts at stake are **per bout** in `boxing_bout_titles` |
| Commission / jurisdiction | `boxing_events.commission_id` → `boxing_commissions`, a separate entity type, not an organization |
| Venue | `boxing_venues` |
| Titles at stake | `boxing_bout_titles`: several per bout; `at_stake`; `eligible_fighter_id` |

Nothing assumes a single promotion.

## Card documents

A card document is the structured form of one published card from an approved source; see the header of `shared/events/card.mjs`. `applyCardDocument()` does the following:
1. Stores the raw document as an observation.
2. Finds or creates the event by namespace id.
3. Resolves every boxer through `boxing-identity`. An unresolved boxer blocks only that bout, which is reported in `unresolved`.
4. Resolves every official through the officials resolver.
5. Diffs the document against the current card.
6. Applies each change **and** appends it to `boxing_card_changes` (before, after, source, observation), in one transaction per change.
7. Emits at most one structured news event per change.

Rules:
- **Absence is not cancellation.** A bout missing from a partial card is left alone; only an explicit status changes it.
- **Replacement:** for a bout matched by its external id, a new corner is recorded as `opponent_replaced`. The replaced boxer's participant row stays, with status `replaced` and `replaced_by_fighter_id`, so earlier weigh-ins and odds still point at a real row. Without an external id, a new pairing becomes a new bout and is flagged `possible_replacement_without_external_id` for review.
- **Corner order** in the document is irrelevant; matching is by boxer identity.
- **Date moved:** a later date logs `event_postponed` and emits `EVENT_POSTPONED`; an earlier date logs `event_date_changed`. The original date is kept in the log.
- **Commission correction:** logs `commission_changed` with the previous commission.
- **Titles:** a `titles` array, when present, is the complete list for that bout. A removed belt becomes `at_stake=false` (title fight changed to non-title), and a later `won` for it is refused (`BX081`). A sourced single eligibility, e.g. "only the boxer who made weight can win", sets `eligible_fighter_id`. The other boxer then cannot win the belt (`BX082`), and the change requires review. Eligibility is never inferred from a weight miss.
- **Re-applying the same document** changes nothing (`change_key` dedupe).

Change types: event announced, date changed, postponed, cancelled or status changed; venue changed; commission changed; organization role added or removed; bout added, cancelled, postponed or status changed; opponent replaced; participant withdrawn; card order, segment, scheduled rounds, contracted weight or weight class changed; title added, removed or eligibility changed; official assigned, replaced or removed.

News:

| Change | News event |
|---|---|
| bout added | `FIGHT_ANNOUNCED` |
| opponent replaced | `OPPONENT_REPLACED` |
| bout cancelled / postponed | `FIGHT_CANCELLED` / `FIGHT_POSTPONED` |
| event postponed / cancelled | `EVENT_POSTPONED` / `EVENT_CANCELLED` |
| venue changed | `VENUE_CHANGED` |
| officials assigned or replaced | `OFFICIALS_ASSIGNED` (one per bout per apply) |
| title removed or eligibility changed | `TITLE_STATUS_CHANGED` (review) |

## Officials graph

Referees and judges are canonical `boxing_officials`, with `boxing_official_identities`, retrieval name keys and a review queue:
- An external id decides.
- Exact name + same country + prior work for the same commission, unique → `probable`.
- Any other name-similar candidate goes to review. Very similar official names are held, as the tests exercise.
- No candidate → a new official.

Assignments keep history. A replaced judge's row becomes `replaced` with `replaced_by_official_id`, and the replacement is a new active assignment. One active referee per bout and one active official per judge slot are enforced. **A scorecard can only be written by an active assigned official of the matching role** (`BX083`), so a replaced judge cannot post a card.

## Results

Results are versioned (see the schema audit, H9). `recordResult()`:
- Is idempotent for identical content.
- Writes changed content as a new revision that supersedes the previous one.
- Refuses a winner who is not an active participant (`BX080`).
- Compares a decision result with the stored cards. `classifyDecision()` covers unanimous, split and majority wins and draws, plus referee-scored decisions. A disagreement is **reported and flagged for review, never silently fixed**.
- Emits `RESULT_OFFICIAL`, or `RESULT_OVERTURNED` when the outcome or winner changes or the state is `overturned` (review required).

Supported outcomes: win, draw, no contest, no decision. Methods: KO, TKO, RTD, DQ, decision, technical decision, no contest, no decision. Decision agreement: unanimous, split, majority, referee, newspaper.

## Scorecards

`recordScorecards()` handles three judges (or a single referee), round-by-round points (half points allowed), point deductions and the pre/post-deduction basis.

- **Validation:** round sums equal totals; points are 0–10; the 10-point must system holds unless a deduction is recorded; round count matches the scheduled rounds, or the stopped round for technical decisions. Problems are attached to the news event and force review.
- **Corrections:** an official correction becomes revision 2 with `card_state='corrected'`. Revision 1 stays, and `SCORECARD_POSTED` supersedes the earlier event. An identical re-delivery is a no-op.

## Weigh-ins

`recordWeighIn()`:
- Stores the contractual limit, official weight (with the source-native reading and unit: lb, kg, stone), attempt number, kind (`official`, `rehydration_check`, `fight_day_check`, `ceremonial`), verification state and timestamp.
- Computes the miss **against the bout's contracted weight**, so a 141.8 lb weigh-in for a 142 lb catchweight is `made_weight` even though the division limit is 140.
- Keeps an unverified reading as history when a verified one supersedes it.
- Emits `WEIGHT_MISSED` **only for a verified official weigh-in over the contract**. Reported readings and rehydration checks produce `WEIGH_IN_RESULT`; unverified readings produce nothing.
- Lists titles at stake as facts and sets `title_consequence` to null. Consequences come only from a sourced eligibility change.

## Public regulatory actions

- **Versioned and append-only:** the same `action_key` with changed content becomes a revision, e.g. a suspension being cleared.
- **Public source only:** `source_url` is required and must be http(s); `reason_public` is capped at 280 characters.
- **Private data:** the column comment prohibits diagnoses, test results, medical detail and non-public personal data.
- **News:** `SUSPENSION_POSTED` always requires review.

## Tests

- **`tests/db/08_events.test.mjs` (14):** announcement with distinct roles, commission entity and multi-title bout; idempotent re-apply; replacement + date moved + commission correction + judge replacement + title removed, with history retained; the removed belt cannot be won; replaced corners are invisible to odds matching; weigh-ins (verified miss, unverified report, second attempt, catchweight, rehydration check); sourced title eligibility; split decision with round-by-round cards and the replaced judge refused; scorecard correction; result contradicting cards held for review and corrected to a majority draw; technical decision, DQ and no contest (and a replaced boxer cannot win); overturned result; suspension requirements and revision; official identity dedupe.
- **Unit tests:** decision classification, scorecard validation, result-vs-card checks, weight units and misses, news gating, card diff rules. Worker tests cover auth, validation and error mapping.
