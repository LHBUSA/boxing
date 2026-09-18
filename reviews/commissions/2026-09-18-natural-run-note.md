# Commission cron, 2026-09-18 11:40Z slot — Tennessee recovered (evidence, not yet a compliant proof)

**TENNESSEE RAN CLEAN.** After `http_525` on 2026-09-15 and `http_403` on 09-16 and 09-17, the 2026-09-18 slot completed
with `tn_athletic_commission = ok`. The access refusal cleared on its own; nothing was changed, retried by hand or worked
around on our side.

| Adapter | Status | Named cause | Documents listed / fetched / changed |
|---|---|---|---|
| NV | partial | `empty_indexes: nv-results-index:2026` (accepted by item 2) | 0 / 0 / 0 |
| FL | partial | `documents_not_pdf = 1` (accepted by item 2) | 16 / 1 / 0 |
| NJ | partial | `apply.identity_unresolved = 8` (accepted by item 2) | 1 / 1 / 1 |
| MO | ok | — | 6 / 0 / 0 |
| PA | ok | — | 14 / 0 / 0 |
| **TN** | **ok** | — | 4 / 0 / 0 |

Tennessee detail (item 3): `completed_at 2026-09-18 11:42:02Z`, no `error`, no `index_links_unplaced`, no `empty_indexes`,
`parse_failures = 0`, `index_dates_unreadable = 0`, `http_errors = 0`, adapter `tn-athletic@1.0.0`.

Item 1 holds: 6 invocations under one prefix `c7dc2d77-…`, `trigger_type = scheduled`, `cron = 40 11 * * *`,
`runtime = cloudflare-workers`, `worker_version = b451ad9b-3990-4438-897a-bfa6cc0bc8ad`, all `outcome = ran`;
`non_scheduled_runs_since_baseline = 0`, `texas_runs = 0`. Duplicate counters (item 6) are all 0 and
`same_day_same_pair_bouts` is still 20. Identity diff empty, `human_decisions_since_slot = 0`, no new queue items.

## Why this is not yet the proof

1. **The baseline predates three slots.** `2026-09-16-natural-run-baseline.json` was taken 2026-09-15T14:47Z, so the
   deltas in `2026-09-18-natural-run-after.json` cover the 09-16, 09-17 and 09-18 runs together. Item 9 ("for every
   adapter with `documents_changed = 0`, all its deltas are 0") cannot be evaluated that way: NV/FL/MO/PA/TN show index
   document revisions from the earlier slots, and NJ shows +6 suspensions across the three days.
2. **The staging verifier is 43/44.** The only failing check is `expected_tables_exist`, missing the six tables added by
   migrations 0043/0044/0045, which are deliberately not applied to staging. Item 6 and item 10 both require 44/44, so as
   written the gate cannot pass while approved-but-unapplied migrations sit in the repo. That circularity needs an owner
   decision: either apply the migrations first (then the check passes again), or pin the verifier's expected-table list to
   the applied chain.

A clean, single-slot proof is set up: `reviews/commissions/2026-09-19-natural-run-baseline.json` was taken read-only at
2026-09-18T14:50Z, before the 2026-09-19 11:40Z slot.

## State

No migration applied, nothing deployed, no batch applied, no backfill. Production writes 0.
