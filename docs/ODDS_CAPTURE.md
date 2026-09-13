# Boxing odds capture (issue #4)

**Status (2026-09-13): forward capture LIVE in STAGING only.**
- Worker `boxing-odds-staging` writes to Supabase `wpaxofilvbsjyrxrwjhg` (`propbetedge-boxing-staging`).
- There is no boxing production project. The default `boxing-odds` environment is not deployed, and capture is off there.

## Provider and rights

| | |
|---|---|
| Provider | The Odds API v4, sport key `boxing_boxing` (listed active on the account 2026-09-13) |
| Terms | https://the-odds-api.com/terms-and-conditions.html (last updated 2026-08-31, reviewed 2026-09-13) |
| Decision | **Approved with restriction.** Ingest, indefinite storage, first-party display (commercial), derived values and ML training are permitted. **Raw redistribution is prohibited**: no own API, feed or downloadable files of provider data |
| Account | Self-serve plan: 100,000 credits/month shared with PropBetEdge NFL/UFC. No account-specific agreement found. Same key as NFL/UFC; no second key |
| Attribution | Not required ("always appreciated") |
| Registry | `boxing_sources.the_odds_api`: `approved_ingest`, `approved`, enabled, persistence/derivative/display true, `redistribution_allowed=false`, `latest_rights_review_id` → `boxing_source_rights_reviews` (migration 0010) |
| Re-review | 2026-12-13, on any terms-change email, or before any partner/export feature. See `docs/BOXING_SOURCE_ACQUISITION.md` |

## Pipeline

```
cron */15 ─► gates ─► adaptive cadence (due?) ─► unmetered preflight (/sports, 0 credits)
  └─ per region call (/odds, credits = markets):
       raw observation (boxing_source_observations, external_key boxing_boxing|<region>|<markets>)
       ─► provider ledger: boxing_provider_events / _participants / _event_participants
                           boxing_provider_quote_series (per book/market/outcome, regions[])
                           boxing_provider_quotes (append-only, change-only)
       ─► canonical resolution attempt (bout-scoped identity; never creates fighters)
            matched   ─► boxing_markets / selections / append-only boxing_market_ticks
            unmatched ─► boxing_market_unmatched (reason, names, observation)
       ─► boxing_provider_captures row (http status, credits, quota, observation, quotes inserted/unchanged)
  ─► MARKET_MOVED for matched bouts ─► boxing_ingest_runs row with metrics
```

**Gates (all fail closed):**
1. `ODDS_CAPTURE_ENABLED="true"`.
2. The store carries a verified write target: `shared/store/target-guard.mjs` accepts only allow-listed refs (staging), requires `BOXING_ENVIRONMENT` and `BOXING_SUPABASE_REF` to agree with `SUPABASE_URL`, and refuses the NFL/UFC and MLB/PropTech projects by name.
3. Source row approved **with a recorded rights review**.
4. The key is present.
5. Plan cost ≤ `ODDS_MAX_RUN_COST`.
6. The cadence says a capture is due, and the daily budget has room.
7. Preflight: sport active and remaining credits ≥ `ODDS_MIN_REMAINING` (20,000, protecting NFL/UFC on the shared plan).

`force` (operator only) skips gate 6 alone. There is no user-driven refresh.

### Unmatched is not discarded

No approved canonical events/records source exists yet, so provider events usually do not resolve to canonical bouts. Everything is still kept:
- the raw payload
- every provider event id, commence time and verbatim participant name
- every bookmaker/market/outcome price change, including markets the canonical layer does not normalize (`h2h_lay`, 3-way)

Each quote carries the observation, capture time, provider timestamp, commence time and run. When events/identities are later resolved, the history can be attached by replaying observations or reading the ledger.

**Names never create canonical fighters.**
- Provider participant resolution is only through `boxing_fighter_identities` (namespace `the_odds_api.participant`), and the view is `boxing_provider_participant_resolution`.
- Matching a bout requires both names to resolve to the two corners of exactly one scheduled bout within ±2 days; see *Participant resolution*.

### Duplicates vs traceability

- **Canonical ticks and provider quotes are change-only.** An unchanged price is not a new row; a trigger compares against the latest row, and an exact re-delivery is refused by a unique index. A→B→A reversions are kept.
- **Re-confirmation** only moves `last_seen_at` on the series/selection.
- **Raw observations** are content-hash deduplicated. An identical payload points at the existing observation (`observation_duplicate=true`).
- **Every call** is still an append-only `boxing_provider_captures` row, so polling behaviour is fully traceable.

## Normalization (canonical layer)

| Field | Where |
|---|---|
| provider | `boxing_odds_providers` (`the_odds_api`) |
| bookmaker (+ first region) | `boxing_bookmakers` |
| event ↔ bout | `boxing_bout_identities` (namespace `the_odds_api.event`), unique per provider event id |
| market type, line, prematch/live | `boxing_markets.market_type`, `line`, `market_key` = `type\|period\|line\|pre\|live` |
| selection (canonical side), fighter, verbatim provider name | `boxing_market_selections.selection_key`, `fighter_id`, `outcome_name` |
| American, decimal, implied probability | `boxing_market_ticks` |
| provider timestamp / capture time / run / raw payload | `provider_timestamp`, `captured_at`, `ingest_run_id`, `observation_id` |

**Canonical markets:**
- `h2h` → `moneyline`, or `moneyline_3way` when a Draw outcome is present.
- `totals` → `total_rounds`.
- Any other provider market is counted as `unsupported_markets`, but it is preserved in the provider ledger.
- Nothing is guessed. Props that are not returned are not fabricated.

Selection keys are relative to canonical bout sides, never the provider's home/away order.

## Discovery (2026-09-13, account response)

| | |
|---|---|
| Sport keys | `boxing_boxing` (the only boxing key; `has_outrights=false`) |
| Upcoming events | 42 (6 within 7 days: Sep 19–20 cards; 10 in 7–30 days; 14 in 30–90; 12 beyond) |
| Participants | 69 distinct provider names |
| Placeholder dates | 10 events share `2026-12-31T22:57:00Z` (unscheduled heavyweight pairings). Flagged `placeholder_suspect` and ignored by the cadence |
| Bookmakers | 35. By region: uk 10, eu 10, au 7, us 6, us2 2 (`betonlineag` also in eu; `sport888` in eu+uk) |
| Markets returned by `/odds` | `h2h` (incl. Draw outcomes at 3-way books), `h2h_lay` (Betfair exchanges), `totals` (rare: 6 series) |
| Per-event market listing (1 credit each, 3 sampled) | `h2h`, `h2h_3_way`, `h2h_lay`, `h2h_3_way_lay`, `double_chance`. Not captured (per-event calls would cost events × regions × markets) |
| Provider update age | market `last_update` p50 0.7 min, p90 1.9 min (provider documents 60 s pre-match / 40 s in-play for featured markets) |
| Discovery cost | 16 credits (10 bulk, 3 event-markets, 0 for sports/events) |

## Region plan, cadence and quota

**Region plan.** `ODDS_REGION_PLAN = us=h2h,totals;us2=h2h;uk=h2h;eu=h2h;au=h2h`.
- That is one call per region, so every observation has an exact region.
- Cost is **6 credits per capture**, the same as a single 5-region call, and `totals` is only requested where it appears.

**Cadence** (`shared/odds/cadence.mjs`). The cron runs every 15 min, and a paid capture happens only when due:

| Tier | Condition (nearest non-placeholder start *t*) | Interval | Why |
|---|---|---|---|
| live_window | now ∈ [t − 3h, t + 2h] | 15 min | Closing lines and in-play; the provider tightens toward 40 s inside 6h, so 15 min never outpaces it |
| fight_day | t − now ≤ 24h | 30 min | Main pre-fight movement |
| fight_week | t − now ≤ 7d | 2h | Line formation |
| far | otherwise | 6h | Openers and long-dated markets |

**Budgets:**
- `ODDS_DAILY_BUDGET=600`: nothing is due above it, and a blocked run is recorded.
- `ODDS_MONTHLY_BUDGET=8000` (30-day rolling): the cadence degrades to `far`.
- `ODDS_MIN_REMAINING=20000` on the shared plan.

**Quota math** (simulated over the next 30 days using the 42 real start times, placeholders excluded):
- 680 captures × 6 credits = **4,080 credits / 30 days**, about 4% of the 100,000 plan.
- Captures by tier: fight_week 271, fight_day 217, live_window 190, far 2.
- Heaviest days are card days: 384 credits on 2026-09-19, and 342–372 on the following Saturdays.
- The 600/day budget is never reached. Weekly-card steady state is ≈ 900–1,000 credits/week.
- NFL runs ≈ 113 credits × 3/day ≈ 10k/month, UFC is manual, and 95,065 remained after the first capture. The plan comfortably covers continuous boxing capture.

**Rejected alternatives:**
- Every minute: 43k credits/month, wasted on unchanged prices.
- Per-event markets: ×42 per region per market.

## Derived values

**Canonical (`boxing_market_selection_prices`, `boxing_market_consensus`) and provider-level (`boxing_provider_quote_prices`, `boxing_provider_event_consensus`) share one definition set:**

| Value | Definition |
|---|---|
| opening | earliest quote/tick (provider timestamp, else capture time) |
| latest | latest quote/tick |
| current | latest **only when freshness is `fresh` or `live`**, otherwise null |
| closing | latest pre-start, non-live quote/tick, once the start time has passed |
| age / freshness | seconds since last confirmation; `boxing_market_freshness` rules below |
| movement | American and implied-probability change opening → latest |
| cross-book | book count, stale count, min/max American, dispersion (max − min implied), consensus = median implied of fresh books only. Individual book rows are always retained |

**Freshness** (identical in SQL and JS; parity tested):

| State | Rule |
|---|---|
| live | in-play ≤ 2 min |
| fresh | pre-fight within ≤30 min (final 3h), ≤2h (fight day), ≤12h (fight week), ≤36h (further) |
| stale | older than its window. Shown only with its age, never as current |
| closed | started; a pre-fight price is a closing price |
| unknown | never confirmed |

## MARKET_MOVED

- **Consensus:** the median raw implied probability over the **same books** at both ends of a 24h window.
- **Emit threshold:** |move| ≥ 4 points with ≥ 2 books.
- **Dedupe key:** bout | market | selection | origin band | destination band. Plus a 6h cooldown unless the price moves another 4 points.
- **Facts:** previous/new consensus (implied and American), move and direction, window, and every book's previous/new price with timestamps, dispersion, price basis, tick ids.
- **Cause:** `cause: null`, `causal_claim_allowed: false`. The event says *what* moved, never *why*. "Sharp money" style claims require separate sourced evidence.
- **Scope:** only for canonically matched bouts, because news events reference canonical bouts and fighters. With no canonical events source in staging, no real MARKET_MOVED events exist yet. The system is exercised in `tests/db/06_odds.test.mjs` and `tests/db/11_odds_forward_capture.test.mjs`.

## Gateway rights boundary

`boxing-gateway` exposes market data only at `/internal/v1/bouts/:id/odds-summary`:
- one bout per request
- whitelisted fields: per-book current/opening/closing with freshness, best price, consensus/dispersion, PropBetEdge fair prices
- a `rights` block

**Tests assert:**
- no route path contains tick/raw/export/download/bulk/feed/quotes/history/provider terms
- the gateway cannot reach tick-history, ledger or observation store methods
- raw fields and provider event ids are stripped even if storage returns them
- gateway SQL functions never read `boxing_provider_*`, `boxing_source_observations` or `boxing_market_ticks` directly

## Operations

| Task | Command |
|---|---|
| Deploy staging Worker | `cd workers/boxing-odds && npx wrangler@4 deploy --env staging` |
| Set staging secrets (stdin, nothing on disk) | `pwsh scripts/staging/set-odds-worker-secrets.ps1` |
| Operator capture (same code path, staging only) | `pwsh scripts/staging/capture-odds.ps1 [-Force] [-CoverageOnly]` |
| Verify staging | `pwsh scripts/staging/verify-staging.ps1` |
| Coverage | `select public.boxing_provider_coverage();` / `boxing_odds_schedule_state()` |
| Spend | `boxing_provider_captures.credits_cost` (also `credits_remaining`) |
| Replay | re-ingest stored observations; idempotent, spends no credits |

The provider key is redacted from errors, run rows and capture rows (tested). It lives only in `D:\Workers\secrets\ufc-propbetedge.env` and the Worker secret.

## Participant resolution (fail-closed)

A provider event attaches to a bout only if **both** provider names resolve, through `boxing-identity` in bout scope, to the two **different** corners of **exactly one** scheduled bout within ±2 days. The date is a filter, not evidence.

| Unmatched reason | Meaning |
|---|---|
| `no_candidate_bout_in_window` | no scheduled canonical bout within ±2 days |
| `participants_not_found` | neither name resolved to a corner in the window |
| `no_bout_with_both_fighters` | names resolved to corners of different bouts |
| `ambiguous_multiple_bouts` | more than one bout matched |
| `mapped_bout_participant_mismatch` | provider reused an event id after an opponent change |
| `mapping_conflict` | provider event id already mapped to another bout |

## Tests

- `shared/odds/odds.test.mjs`: conversions, de-vig, market grammars, freshness, normalization, matching, movement.
- `workers/boxing-odds/src/index.test.mjs`:
  - disabled by default
  - write-target allow-list (UFC/NFL/MLB refused)
  - unverified store refused
  - worker refuses non-boxing target
  - rights/review gate
  - key/cost/preflight gates
  - cadence not-due / daily budget / force limits
  - tiers and budget fallback
  - staging wrangler config
  - raw → ledger → unmatched order
  - key redaction
- `tests/db/06_odds.test.mjs`: canonical capture, idempotency, derivations, closing, consensus, reused ids, MARKET_MOVED.
- `tests/db/11_odds_forward_capture.test.mjs`, with a synthetic provider through the real `runCapture`:
  - rights gate before any request
  - raw + ledger survive unmatched
  - no fighters created
  - multi-region books
  - identical re-delivery creates nothing but is logged
  - append-only
  - stale
  - opening/current/closing
  - factual deduped MARKET_MOVED
  - key never in the DB
  - gateway SQL isolation
  - coverage
- Staging verifier:
  - `the_odds_api_approved_without_raw_redistribution`
  - `no_other_external_feed_enabled`
  - `provider_ledger_requires_raw_observation_dedupes_and_is_immutable`
  - plus the existing security checks
