# NATURAL RUN 2026-09-19 11:40Z — FAIL (nj_sacb failed: BX140 suspensions lane)

Evaluated against `docs/COMMISSION_NATURAL_RUN_2026-09-15.md` as written. Evidence:
`reviews/commissions/2026-09-19-natural-run-after.json`. Read-only check; nothing was rerun by hand and nothing changed.

## Verdict

**FAIL on item 2 and item 10.** `nj_sacb` returned `failed`. The doc is explicit: *"Any other `partial` or any `failed`
fails the check."* The cron itself fired correctly and five of six adapters are healthy.

## Why it failed, and why it is not an upstream problem

```
nj_sacb  failed  listed=1 fetched=1 changed=1 http=0 parse_fail=0 fetch_errors=0
error: postgrest POST rpc/boxing_record_regulatory_action failed:
       lane_not_rights_approved: suspensions is review_scope_gap for source nj_sacb
```

This is **BX140 — migration 0045's rights lane gate — refusing exactly what the owner ordered it to refuse.** The
standing rule is that New Jersey's expanded lanes stay `review_scope_gap` and fail closed until re-reviewed. 0045 was
applied to staging on 2026-09-18, so from that moment NJ's suspension writes are refused. Before 0045 the lane was
undeclared and the write went through.

The refusal is correct. What is wrong is how the commission Worker *reports* it: `shared/events/rights.mjs` converts a
lane refusal into a counted skip on the card path, but the regulatory-action path in `boxing-commissions` lets the
error escape and marks the whole adapter run `failed`. A refusal we deliberately configured should be a counted skip
with the run still `ok`/`partial` — the same shape the gate doc already anticipates.

**No fix applied.** Per the instruction: on FAIL, stop and change nothing.

## Item-by-item

| # | Item | Result |
|---|---|---|
| 1 | Cron fired naturally | **Partly.** 6 invocations sharing prefix `06f5fed0-d100-4eb2-9f36-77ef701d6b9a`, all `scheduled`, cron `40 11 * * *`, worker `boxing-commissions-staging`, version `b451ad9b`, `scheduled_for` 11:40:07Z. `non_scheduled_runs_since_baseline = 0`, `texas_runs = 0`. But `new_jersey` outcome is `failed`, not `ran`. |
| 2 | All six executed and completed | **FAIL.** 6 runs, all `completed_at` set, correct adapter versions. Status: nsac `partial`, florida `partial`, **nj_sacb `failed`**, mo/pa/tn `ok`. Both partials have a named cause (below); the failure has none. |
| 3 | Tennessee completed | **PASS.** `completed_at` set, `error` absent, `index_links_unplaced` absent, `empty_indexes` absent, `parse_failures = 0`, `documents_listed = 4`, `http_errors = 0`. |
| 4 | Retry logic | **PASS.** `fetch_errors` empty for all six; no url listed even once. |
| 5 | Documents | **PASS.** Reported below. |
| 6 | No duplicates | **PASS.** possible_duplicate_bouts 0, duplicate_active_judge_slots 0, duplicate_active_referees 0, event_identity_collisions 0, bout_identity_collisions 0, same_day_same_pair_bouts 20 = baseline. |
| 7 | No identity thresholds changed | **PASS.** `git diff bf10259..9a202c4` over the six identity modules prints nothing. `decisions_since_slot_by_version` empty, `queue_resolver_versions` only `boxing-identity-resolver@1.0.0`, `human_decisions_since_slot = 0`. |
| 8 | New review items appropriate | **PASS.** `queue_items_since_slot` empty, `review_pending` delta 0 for every source. |
| 9 | Idempotency on stored documents | **PASS.** mo/pa/tn have `documents_changed = 0` and all-zero deltas. Nevada changed 12 documents → events +3, observations +3, everything else 0. No revision grew without a new sha256. |
| 10 | No regression in NV/FL/NJ/MO/PA | **FAIL.** No negative deltas anywhere, but `nj_sacb` is worse than its last scheduled run. |

### Named causes for the two partials — both acceptable per item 2

- **nsac_nevada** — `apply.identity_unresolved = 16 > 0`. Named cause.
- **florida_athletic_commission** — `documents_not_pdf = 1` (the `fl-results` 08-30 TBL link serves HTML). Named cause.

## Per-adapter counts

| Adapter | Status | Listed | Fetched | Changed | http | parse_fail | fetch_errors |
|---|---|---|---|---|---|---|---|
| nsac_nevada | partial | 40 | 12 | 12 | 0 | 0 | 0 |
| florida_athletic_commission | partial | 16 | 1 | 0 | 0 | 0 | 0 |
| nj_sacb | **failed** | 1 | 1 | 1 | 0 | 0 | 0 |
| mo_office_of_athletics | ok | 6 | 0 | 0 | 0 | 0 | 0 |
| pa_state_athletic_commission | ok | 15 | 0 | 0 | 0 | 0 | 0 |
| tn_athletic_commission | ok | 4 | 0 | 0 | 0 | 0 | 0 |

Three new Nevada event identities first seen at this slot: Joey Gilbert Promotions at Silver Legacy Reno (2026-11-14),
TGB Promotions at The Cosmopolitan of Las Vegas (2026-10-17), TheBag2 LLC at Silverton Casino Lodge (2026-11-10).

Global after: events 216, bouts 715, fighters 1764, officials 182.

## Tennessee availability across the week

| Date | TN outcome |
|---|---|
| 2026-09-15 | upstream `http_525` |
| 2026-09-16 | upstream `http_403` |
| 2026-09-17 | upstream `http_403` |
| 2026-09-18 | ok |
| **2026-09-19** | **ok** — `http_errors = 0`, 4 documents listed, no error, no unplaced links |

Tennessee is healthy and has been for two consecutive days. It is not the blocker today.

## What this does and does not gate

The gate's original purpose — hold the promoter rollout until the commission cron is proven — no longer applies to
migrations 0042–0046 or to the two 2026-09-19 cards. Both were completed on 2026-09-18 under an explicit owner GO that
superseded the gate. Staging is at `20260919000048` and holds both cards already.

So today's FAIL blocks nothing that has not already shipped. It is a live defect in the commission lane, surfaced by a
rights rule we deliberately turned on, and it needs a reviewed code change before the cron can be called proven.
