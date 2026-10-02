# Boxing production Supabase: creation and migration plan (2026-10-02)

**Status: plan only. Nothing here has been run.** On 2026-10-02 the Supabase org `hckxwtehexilsrxpglqw` held three
projects: `rlfyavnhbngwbldebrid` (MLB + PropTech + identity/billing), `tkmlnhmylqnttmnsnief` (NFL + UFC + sports models),
`wpaxofilvbsjyrxrwjhg` (propbetedge-boxing-staging). **No Boxing production project exists.** The owner's sprint brief
approves creating a dedicated one. It is a billed project, so the creation step waits for an explicit go.

Staging applies the whole repo chain (51/51 migrations, 0001 to 0051, checked 2026-10-02), so production starts from the
same chain.

## 0. Rules this plan keeps

- It is a **dedicated** project. Never UFC/NFL (`tkmln…`) or MLB/PropTech (`rlfy…`). The write-target guard refuses both by ref.
- **No wholesale clone from staging.** Staging carries known append-only artefacts: 93 duplicate WBA ranking revisions
  from the URL-label bug, officials written before the parser fixes, and a WBC run stuck in `running`. Production is
  re-ingested from the source documents with the current parsers.
- Human identity decisions are the one thing carried over: they are reviewed records, not scraped data (step 5).

## 1. Create the project (needs the owner's go)

Use the same Management API path that created staging on 2026-09-13 (CLI token from Windows Credential Manager
"Supabase CLI:supabase"):

```
POST /v1/projects  { name: "propbetedge-boxing-production", organization_id: "hckxwtehexilsrxpglqw",
                     region: "us-east-2", db_pass: <generated, stored in D:\Workers\secrets\boxing-production-db.env> }
```

Then record `production/boxing-production.json`, the same shape as `staging/boxing-staging.json`, holding the ref and no secrets.
Enable daily backups and PITR (if the plan offers it) before the first migration.

## 2. Reviewed code changes (one commit, before any write)

1. `shared/store/target-guard.mjs`: add `<prod ref>: { projectName: 'propbetedge-boxing-production', environment: 'production' }`.
2. `scripts/staging/BoxingSupabase.psm1`: it refuses every project name except staging, and stays that way. Add a separate
   `scripts/production/BoxingProduction.psm1` with `Assert-BoxingProductionProject` (name AND ref pinned).
3. `[env.production]` blocks in `workers/boxing-rankings`, `boxing-commissions`, `boxing-odds`, `boxing-gateway`:
   `BOXING_ENVIRONMENT=production`, `BOXING_SUPABASE_REF=<prod ref>`, the same crons as staging and `workers_dev=false`.
   Collection flags start `"false"`.
4. Unit test: the guard accepts the production ref only when `BOXING_ENVIRONMENT=production`, and staging only with `staging`.

## 3. Migrations: proof, then apply, then verify

1. `apply-migrations.ps1 -Mode proof` against production (empty DB, so the full chain 0001 to 0051 replays inside a rolled-back transaction).
2. Take a backup snapshot. Rollback for this step is to discard the empty project and recreate it.
3. `-Mode apply`, then confirm that `supabase_migrations.schema_migrations` equals the repo chain.
4. Run `verify.sql`. `expected_tables_exist` must compare against the TARGET's applied ledger
   (see `scripts/staging/expected-tables.mjs`), not repo HEAD.
5. Read/write check: one guarded `startRun`/`finishRun` pair from a production-env Worker, then the gateway's `/health` and one `/internal` read.

## 4. Re-ingest (current parsers, low rate, foreground chunks)

| Lane | Command (production variant) | Depth |
|---|---|---|
| WBA | titles-collect -Body wba -Backfill | 2000-01 → |
| WBO | titles-collect -Body wbo -Backfill | 2000-01 → |
| IBF | titles-collect -Body ibf -Backfill | 2005-12 → |
| WBC | titles-collect -Body wbc | current month (2026-10); history = access gap |
| Commissions NV/FL/MO/PA/TN | commissions-ingest backfill per adapter | as on staging |
| NJ | forward only, within the recorded schedule scope (results/officials lanes stay `review_scope_gap`) | |
| Odds | boxing-odds production capture, credits budget shared (100k/month plan) | forward |

Pace the WBA/WBO/IBF backfills: IBF stays ≥ 10 s between requests (Crawl-delay), WBA and WBO ≥ 5 s.

## 5. Identity decisions

Re-apply the committed human batches (`reviews/identity/*.json`, applied on staging with named reviewers) through
`identity-review -Apply` with `graphResolve:false`. **Owner decision:** whether replaying a recorded human decision onto
a new database keeps the original reviewer and date (proposed: yes, plus a `replayed_from` note), or needs a fresh sign-off.
Claude never signs as a reviewer.

## 6. Cut-over

The gateway production Worker reads production. Vercel `BOXING_GATEWAY_URL/TOKEN` switch only when `web/DEPLOY_HOLD` lifts
(after Phases D–I). Rollback is to point the env vars back at the staging gateway (read-only) and redeploy.
