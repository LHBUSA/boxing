# Boxing odds capture (issue #4)

**Status: built and tested; collection OFF.** Capture is blocked in the database by the `the_odds_api` source row, in config by `ODDS_CAPTURE_ENABLED="false"`, and by infrastructure: no boxing Supabase project exists and nothing is deployed.

## Provider and rights

| | |
|---|---|
| Provider | The Odds API v4, sport key `boxing_boxing` |
| Technical coverage | Confirmed 2026-09-12 with the unmetered `/v4/sports` call: `boxing_boxing` is listed **active** for the existing PropBetEdge account (cost 0) |
| Plan / terms | **Not recorded anywhere.** No PropBetEdge repo documents the plan's persistence, display, derivative-analytics or redistribution terms. UFC persists this provider's data, but no rights review is on record there either. A key being present is not approval |
| Source row | `the_odds_api`: `review_required`, rights `unknown`, `enabled=false`, `persistence_allowed=false`. The observation gate refuses writes (`BX010`) |

To enable, the owner records the terms review on the source row, in this order:
1. `terms_url` and `contract_reference`
2. `persistence_allowed`, `derivative_allowed`, `display_allowed`
3. `access_mode='approved_ingest'`, `rights_state='approved'`, `reviewed_at`, `reviewed_by`
4. `enabled=true`

Then set `ODDS_CAPTURE_ENABLED="true"` and deploy with the secrets listed in `workers/boxing-odds/wrangler.toml`.

## Pipeline

```
cron (every 2h at :15) ─► gates ─► unmetered preflight ─► ONE bulk call (regions × markets credits)
   ─► raw observation (content-hash dedupe)
   ─► match each provider event to a canonical bout (bout-scoped identity resolution)
   ─► normalize markets ─► boxing_ingest_market_snapshot (atomic) ─► append-only ticks
   ─► unmatched queue for anything that fails
   ─► MARKET_MOVED detection ─► boxing_emit_news_event (deduped)
   ─► boxing_ingest_runs row: status, metrics, quota used/remaining/last cost
```

There is **no user-driven refresh**. Readers get stored prices labelled with their freshness. This follows the NFL odds quota outage, where credits were burned by polling.

## Normalization

| Field | Where |
|---|---|
| provider | `boxing_odds_providers` (`the_odds_api`) |
| bookmaker (+ region) | `boxing_bookmakers` |
| event ↔ bout | `boxing_bout_identities` (namespace `the_odds_api.event`); unique per provider event id |
| market type, line, prematch/live | `boxing_markets.market_type`, `line`, `market_key` = `type\|period\|line\|pre\|live` |
| selection (canonical side), fighter, verbatim provider name | `boxing_market_selections.selection_key`, `fighter_id`, `outcome_name` |
| American, decimal, implied probability | `boxing_market_ticks` (all three; derived from the provider's own format) |
| provider timestamp / capture time / ingest run / raw payload link | `provider_timestamp`, `captured_at`, `ingest_run_id`, `observation_id` |

Selection keys are relative to the canonical bout sides (`fighter_a`/`fighter_b` from `boxing_bout_participants`), never the provider's home/away order. A provider that flips corners cannot flip history.

### Market types
The normalizer supports `moneyline`, `moneyline_3way`, `draw`, `goes_distance`, `total_rounds`, `method_of_victory`, `win_by_ko_tko`, `win_by_decision`, `exact_round` and `round_group`, with validated selection grammars. Live markets are separate (`…|live`).

**Enabled for The Odds API:** only what it delivers:
- `h2h` → `moneyline`, or `moneyline_3way` when a Draw outcome is present
- `totals` → `total_rounds`

`totals` is off by default (`ODDS_MARKETS="h2h"`) because each market adds a credit per call. Any other provider market is counted as `unsupported_markets`; nothing is guessed.

## Participant resolution (fail-closed)

A provider event attaches to a bout only if **both** provider names resolve, through `boxing-identity` in bout scope, to the two **different** corners of **exactly one** scheduled bout within ±2 days. The date is a filter, not evidence. Initials and surnames are allowed only inside that two-person scope.

Unmatched reasons:

| Reason | Meaning |
|---|---|
| `no_candidate_bout_in_window` | no scheduled bout within ±2 days |
| `participants_not_found` | neither name resolved to any corner in the window |
| `no_bout_with_both_fighters` | names resolved, but to corners of different bouts |
| `ambiguous_multiple_bouts` | more than one bout matched |
| `mapped_bout_participant_mismatch` | the provider reused an event id after an opponent change |
| `mapping_conflict` | the provider event id is already mapped to another bout |

An existing event mapping is **re-verified on every capture**. If the provider keeps its event id after an opponent replacement, the new prices do not attach to the old bout.

## Immutability

- Ticks are append-only: UPDATE, DELETE and TRUNCATE are refused (`BX001`), and FKs are `RESTRICT`.
- An exact re-delivery is refused by a unique index.
- A price equal to the latest tick for that selection is **not a tick**; the trigger skips it. So polling and replays never fabricate movement.
- A→B→A reversions are kept, because only the latest tick is compared.
- Freshness comes from `boxing_market_selections.last_seen_at`, which is operational metadata, not history.

## Derived values (`boxing_market_selection_prices`, `boxing_market_consensus`)

| Value | Definition |
|---|---|
| opening | earliest open-market tick (by provider timestamp, else capture time) |
| latest | latest open-market tick |
| current | latest price **only when freshness is `fresh` or `live`**; otherwise null |
| closing | latest pre-fight tick before the start time; null until the fight starts. Start time = provider `commence_time`, else event `start_at`. Individual walkout times are not known |
| price change | American and implied-probability change from opening to latest |
| bookmaker count / stale count | fresh or live books vs stale books |
| cross-book | min/max American, min/max implied, dispersion (max−min implied), consensus = median implied; stale books are never included |
| fair price | `devig()` is proportional and only applied to a complete market |

## Freshness rules

These are implemented identically in SQL (`boxing_market_freshness`) and JS (`shared/odds/freshness.mjs`); parity is tested.

| State | Rule |
|---|---|
| `live` | in-play price confirmed ≤ 2 min ago |
| `fresh` | pre-fight price confirmed within its window: ≤30 min in the final 3 h, ≤2 h on fight day, ≤12 h in fight week, ≤36 h further out |
| `stale` | older than its window. May only be shown with its age, never as current |
| `closed` | the fight has started; a pre-fight price is a closing price |
| `unknown` | never confirmed |

## MARKET_MOVED

- **Consensus** at time *t* is the median raw implied probability across books, using each book's latest price at or before *t*.
- **Measurement:** a move is compared over the **same books** at both ends, so books joining or leaving never create movement.
- **Emit** when |move| ≥ 4 probability points over a 24 h window, with ≥ 2 books participating.
- **Dedupe key** = bout | market | selection | origin band | destination band. The same state observed again gets the same key and is dropped by `unique (dedupe_key)`.
- **Cooldown:** 6 h per selection unless the price moves a further 4 points.
- **Facts:**
  - bout, selection, previous and new consensus (implied and American), move magnitude and direction
  - window, per-book previous/new prices with timestamps, books participating, dispersion
  - price basis, and the tick ids as sources
  - `cause: null` and `causal_claim_allowed: false`. No cause is ever asserted unless a sourced one is attached.

## Operations

| | |
|---|---|
| Schedule | `15 */2 * * *` (12 runs/day). With `us × h2h` = 1 credit per run, about 360 credits/month |
| Preflight floor | `ODDS_MIN_REMAINING=5000` credits. Cost cap: `ODDS_MAX_CALL_COST=4` credits per call |
| Replay | Every payload is stored as a raw observation. Re-ingesting it is idempotent and spends no credits |
| Errors | The provider key is redacted from all errors and run rows; tests assert this |

## Tests

- `shared/odds/odds.test.mjs`: conversions, invalid prices, de-vig, market grammars, freshness windows, provider normalization (side mapping, draw, totals, unsupported, unexpected outcomes), matching (both corners, cross-card, window, ambiguity, reused event id), movement (threshold, same-book set, dedupe key stability, cooldown, no cause).
- `tests/db/06_odds.test.mjs`:
  - database block while unapproved
  - first capture and unmatched queue
  - repeat payload idempotent
  - new price → one tick with prior ticks unchanged; A→B→A kept
  - opening/latest/change/freshness, and stale never current
  - closing and separate live market
  - consensus, min/max, dispersion
  - reused provider event id does not cross-wire
  - participant ambiguity fails closed
  - selection fighter guard
  - SQL↔JS freshness parity
  - MARKET_MOVED emitted once with facts
- `workers/boxing-odds`: disabled by default; blocked when source unapproved, key missing, over the cost cap, or preflight fails; key never leaks; auth; capture route obeys the gates.
