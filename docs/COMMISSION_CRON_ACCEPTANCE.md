# Commission cron acceptance check

**Status: PENDING.** As of 2026-09-13 the `boxing-commissions-staging` Worker has never been invoked by its cron.
- Every commission run so far was an operator run: `manual` or `backfill` provenance.
- An operator run, a route call or a local script is **never** scheduler proof.

| | |
|---|---|
| Worker | `boxing-commissions-staging` (Cloudflare account `fd3a233e…`) |
| Deployed version at time of writing | `6f46b2a8-d433-49b3-80de-ff8aaf2ea1c1` (check `npx wrangler@4 deployments list --env staging` before running the check; a later deploy replaces this id) |
| Cron | `40 11 * * *` (UTC) |
| First natural slot | **2026-09-14 11:40Z** |
| Target | Supabase `propbetedge-boxing-staging` `wpaxofilvbsjyrxrwjhg` only |
| Scheduled adapters | `nevada`, `florida`, `new_jersey`, in that order, forward mode; `texas` is never fetched |

Do not keep a session waiting for the slot. Run the check any time after roughly 11:55Z.

## 1. Run the queries against staging only

Use `scripts/staging/BoxingSupabase.psm1` (`Assert-BoxingStagingProject` + `Invoke-BoxingStagingSql`), which verifies the project ref before every request.

```sql
-- A. invocation ledger: one row per adapter from the natural cron
select invocation_id, worker, worker_name, worker_version, trigger_type, cron, scheduled_for, runtime, outcome, ingest_run_id, detail
from public.boxing_worker_invocations
where worker = 'boxing-commissions' and trigger_type = 'scheduled' and scheduled_for >= '2026-09-14T11:39:00Z'
order by started_at;

-- B. the ingest runs those invocations point at
select r.id, s.source_key, r.trigger_type, r.worker_name, r.worker_version, r.invocation_id, r.scheduled_for, r.source_version,
       r.config_hash, r.status, r.started_at, r.completed_at, r.metrics ->> 'mode' as mode,
       r.metrics ->> 'documents_fetched' as fetched, r.metrics ->> 'documents_changed' as changed, r.metrics -> 'apply' as apply
from public.boxing_ingest_runs r join public.boxing_sources s on s.id = r.source_id
where r.worker = 'boxing-commissions' and r.trigger_type = 'scheduled' and r.scheduled_for >= '2026-09-14T11:39:00Z'
order by r.started_at;

-- C. summary
select public.boxing_scheduler_evidence('boxing-commissions', '2026-09-14T11:30:00Z');
```

## 2. Accept only if every item holds

1. **Query A returns exactly three rows** whose invocation ids end in `:nevada`, `:florida` and `:new_jersey`, all sharing the same invocation prefix.
2. **Every row in A** has:
   - `trigger_type = 'scheduled'`
   - `cron = '40 11 * * *'`
   - `runtime = 'cloudflare-workers'`
   - `worker_name = 'boxing-commissions-staging'`
   - `scheduled_for` within one minute of `2026-09-14T11:40:00Z`
3. **`worker_version`** equals the version deployed at the slot (currently `6f46b2a8-d433-49b3-80de-ff8aaf2ea1c1`), not `git:…` and not null.
4. **`outcome = 'ran'`** for all three, each with an `ingest_run_id`.
5. **Query B returns the three runs:**
   - `source_key` values `nsac_nevada`, `florida_athletic_commission`, `nj_sacb`
   - `trigger_type = 'scheduled'`
   - `mode = 'forward'`
   - `completed_at` set
   - `status` in (`ok`, `partial`); `partial` is acceptable only when caused by identity review items
   - the same `invocation_id` / `worker_version` as A
   - `source_version` equal to the adapter versions in code (`nsac-nevada@1.0.1`, `florida-athletic-commission@1.0.2`, `nj-sacb@1.1.0` at time of writing)
6. **Target is staging:** the rows are read from project `wpaxofilvbsjyrxrwjhg` through the verified Management API. The Worker can only write there (`shared/store/target-guard.mjs` allow-list). No other project has boxing tables.
7. **No private or medical data** was introduced: `pwsh scripts/staging/verify-staging.ps1` passes 39/39.
8. **No texas fetch:** no `tdlr_texas` run exists.

Report the three run ids, the worker version, `scheduled_for`, per-adapter status and the documents fetched/changed. Only then may the commission cron be called proven.

## 3. If the check fails

- **No rows at all:** the cron did not fire, or the Worker failed before recording anything. Check the Cloudflare Workers observability logs for `boxing-commissions-staging` around 11:40Z. Look for `boxing-commissions: skipped (...)`: missing secrets, or a write target refused.
- **Only some adapters:** the scheduled handler runs the three adapters sequentially in one invocation. A CPU or wall-time limit (PDF parsing) can stop it part-way. Record which adapter was last and do NOT call the cron proven. The fix is a code change (for example one adapter per cron slot), reviewed and deployed normally.
- **`outcome = 'failed'` or run `status = 'failed'`:** read `metrics.error`. Do not rerun manually to "complete" the proof; a manual run is not scheduler evidence.
