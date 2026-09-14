# Natural commission cron: 2026-09-15 11:40Z verification

**Do not invoke the Worker, its route or a local ingest before or during this check.** A manual run is never scheduler
evidence, and it would change the counts the baseline is compared with.

| | |
|---|---|
| Worker | `boxing-commissions-staging`, cron `40 11 * * *` (UTC) |
| Version expected at the slot | `b451ad9b-3990-4438-897a-bfa6cc0bc8ad` = main `9a202c4` (rollbacks, newest first: `41e2e040` = `76890ec`, `5964684e` = `bf10259`, `d3c08e78` = `d707522`) |
| Adapters, in order | `nevada`, `florida`, `new_jersey`, `missouri`, `pennsylvania`, `tennessee`; forward mode; `texas` never fetched |
| Adapter versions | `nsac-nevada@1.0.2`, `florida-athletic-commission@1.0.2`, `nj-sacb@1.1.1`, `mo-athletics@1.0.0`, `pa-sac@1.0.0`, `tn-athletic@1.0.0` |
| Identity code at the slot | `boxing-identity-resolver@1.0.0`, `boxing-identity-graph@1.1.0` (`TIER_B_RULES` unchanged since 2026-09-13) |
| Baseline | `reviews/commissions/2026-09-15-natural-run-baseline.json` (taken 2026-09-14 15:57Z) |
| Target | Supabase `wpaxofilvbsjyrxrwjhg` only |

`9a202c4` carries the `fetch_errors` run metric that item 4 reads. Confirm `npx wrangler@4 deployments list --env staging`
still shows `b451ad9b` before running the check; if anything was deployed after it, use that version and commit.

## 1. Run the check (any time after about 12:00Z)

```powershell
pwsh scripts/staging/natural-run-check.ps1 -Check -Baseline reviews/commissions/2026-09-15-natural-run-baseline.json `
  -Slot 2026-09-15T11:40:00Z -Out reviews/commissions/2026-09-15-natural-run-after.json
pwsh scripts/staging/verify-staging.ps1          # must stay 44/44
git diff bf10259..9a202c4 --stat -- shared/identity/graph.mjs shared/identity/resolver.mjs shared/identity/evidence.mjs shared/identity/normalize.mjs shared/identity/appearance.mjs shared/identity/pipeline.mjs
```

The script is read-only. It prints one line per adapter run and writes the invocations, runs, deltas and duplicate
counters to the `-Out` file.

## 2. Accept only if every item holds

1. **The cron fired naturally.**
   - `invocations` has exactly 6 rows sharing one invocation prefix, ending `:nevada`, `:florida`, `:new_jersey`, `:missouri`, `:pennsylvania`, `:tennessee`.
   - Every row: `trigger_type = scheduled`, `cron = '40 11 * * *'`, `runtime = cloudflare-workers`, `worker_name = boxing-commissions-staging`, `scheduled_for` within a minute of 11:40Z, `worker_version` = the deployed version id (not `git:…`), `outcome = ran` with an `ingest_run_id`.
   - `other.non_scheduled_runs_since_baseline = 0` (nobody ran anything by hand) and `other.texas_runs = 0`.
2. **All six adapters executed and completed.** `runs` has 6 rows, same `invocation_id` and `worker_version` as the ledger, `mode = forward`, `completed_at` set, `source_version` = the adapter versions above, `status` in (`ok`, `partial`).
   - `partial` is acceptable only for a named cause in its metrics: `apply.identity_unresolved > 0`, Florida's known `documents_not_pdf = 1` (`fl-results` 08-30 TBL link serves HTML), or Nevada `empty_indexes` (the NSAC index intermittently answers without links). Any other `partial` or any `failed` fails the check.
   - A run that stopped part-way (fewer than 6 rows) is a Worker CPU/wall-time stop: record the last adapter and do not call the cron proven.
3. **Tennessee completed.** The `tn_athletic_commission` run has `completed_at`, `error` absent, `index_links_unplaced` absent (every result link on the page was placed), `empty_indexes` absent, `parse_failures = 0`. In September the forward run reads only the current-year page: `documents_listed` = links dated within 60 days (plus any 2026 row with an unreadable date).
4. **Retry logic.** For each adapter, every url in `metrics.fetch_errors` appears at most twice.
   - A url listed once or twice with the run completed and no matching `http_errors` recovered on retry: acceptable, and report it.
   - A url listed three times exhausted its retries. For a document that must show as `http_errors` plus a document row with `status = error`. For an index the run is `failed`. Either one fails item 2.
5. **Documents.** Per adapter, report `documents_listed`, `documents_fetched`, `documents_changed`, `documents_unchanged`, `documents_rejected`, `documents_skipped`, and `other.revisions_since_slot`.
   - Every changed document is either a new doc key (not in the baseline) or a new revision with a different sha256.
6. **No duplicates.** From `global_after`, each of these must be 0:
   - `possible_duplicate_bouts`
   - `duplicate_active_judge_slots`
   - `duplicate_active_referees`
   - `event_identity_collisions`
   - `bout_identity_collisions`

   `same_day_same_pair_bouts` must equal its baseline (20: legitimate same-card repeat pairings on team-league cards) unless a new team-league card was ingested; any increase must be a distinct `|2` repeat pairing. The staging verifier stays 44/44.
7. **No identity thresholds changed.**
   - The `git diff` above between the baseline commit and the commit behind the deployed version prints nothing.
   - `other.decisions_since_slot_by_version` contains only `boxing-identity-graph@1.1.0:*`.
   - `queue_resolver_versions` gains only `boxing-identity-resolver@1.0.0`.
   - `other.human_decisions_since_slot = 0`: the cron makes no human decision, and nobody applied a batch.
8. **New review items are appropriate.**
   - `other.queue_items_since_slot` lists items only for sources whose run had `documents_changed > 0`.
   - Each run's `apply.identity_unresolved` equals the review items it lists.
   - A source with no changed document creates no review item.
9. **Idempotency on stored documents.**
   - For every adapter with `documents_changed = 0`, all its `deltas` are 0: events, bouts, results, scorecards, official assignments, suspensions, review items, resolver decisions.
   - For an adapter with changes, the deltas equal what the new documents carry (events and bouts only on new dates).
   - No baseline document's revision count grows without a new sha256.
10. **No regression in Nevada, Florida, New Jersey, Missouri or Pennsylvania.**
    - No count in `deltas` is negative.
    - Each run's status is not worse than its last scheduled run (2026-09-14 11:40Z for NV/FL/NJ; the first scheduled run for MO/PA is this one).
    - `documents` per status in the snapshot changes only by the documents named in item 5.
    - `verify-staging.ps1` is 44/44.

Report: the six run ids, the worker version, `scheduled_for`, per-adapter status and document counts, retry evidence,
deltas, and any item that did not hold. Only then call the six-commission cron proven.

## 3. If it fails

- **No rows:** the cron did not fire, or the Worker failed before writing. Check Workers observability logs for `boxing-commissions-staging` around 11:40Z. Do not rerun by hand.
- **Fewer than six adapters:** the scheduled handler runs them sequentially in one invocation; a CPU or wall-time stop (PDF parsing) leaves the tail missing. The fix is a reviewed code change, such as splitting adapters across slots, not a manual completion.
- **Duplicates or negative deltas:** stop. Capture `-Out` and the verifier output, and do not apply any review batch until the cause is found.
