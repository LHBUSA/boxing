# Staging verifier fix: expected schema = the chain staging has applied

Owner decision 2026-09-18: do not apply 0043/0044/0045 to make the verifier green; the 43/44 result exposed a verifier
design defect. Fixed and proven below. Nothing was applied to staging.

## Root cause

`scripts/staging/expected-tables.mjs` built the expected table list by applying **every migration in the repo** to a fresh
local database, and `verify-staging.ps1` compared staging with that. So a migration that was committed but deliberately
not yet applied appeared as staging drift, and the pre-migration gate demanded the very migration it was gating —
circular by construction.

## The fix

1. `verify-staging.ps1` reads staging's own ledger, `supabase_migrations.schema_migrations`, the same table
   `apply-migrations.ps1` writes.
2. It fails closed, before any check runs, on ledger drift: a version recorded on staging that is absent from the repo, a
   version recorded under a different migration name than the repo file, an empty ledger, an applied set that is not a
   prefix of the repo chain (a skipped earlier migration or out-of-order application), or a failed local replay.
3. `expected-tables.mjs --versions=<applied set>` creates a disposable local database and replays **only those versions,
   in order**, then derives the `boxing_*` tables from that replay. Nothing is hardcoded and no migration is special-cased.
4. The verifier compares staging with that schema, and reports repo head, applied-through and pending separately.

Mechanism test: `tests/db/30_expected_schema_replay.test.mjs` (3 tests) proves a prefix replay excludes the later tables,
a full replay includes them, and a drifted ledger exits non-zero.

## Result, before applying anything

```
repo_head: 20260915000045  staging_applied_through: 20260914000041  pending: [20260915000042, 20260915000043, 20260915000044, 20260915000045]
expected schema replayed from 41 applied migration(s): 110 boxing_* tables
expected_tables_exist  True  {"missing":null,"expected":110,"unexpected":null}
checks: 44  passed: 44  failed: 0
```

| | |
|---|---|
| Staging applied versions | 41, `20260912000001` … `20260914000041` (contiguous prefix, no gaps) |
| Repo head | `20260915000045` |
| Pending in repo | `20260915000042` (Event Truth), `20260915000043` (history foundation), `20260915000044` (model scope), `20260915000045` (rights lanes) |
| Expected tables (local replay of the applied set) | 110 |
| Staging actual `boxing_*` tables | 110 |
| Missing | 0 |
| Unexpected | 0 |
| Verifier | **44/44** |

No check was weakened, removed or renamed; the count is still 44 and `expected_tables_exist` is stricter than before
(it now also fails on drift the old form could not see, such as a renamed or skipped migration).

## What this proves about the design

The same verifier, unchanged, will expect `boxing_jurisdictions`, `boxing_result_classes`, `boxing_runtime_flags`,
`boxing_scope_consumers`, `boxing_source_capabilities` and `boxing_weight_class_definitions` the moment staging's ledger
records 0043–0045, because the expected schema is replayed from the ledger. No configuration change will be needed.

## State

Migrations 0042–0045 remain unapplied. `archive_scope_ingest` remains OFF. Production writes 0. The rollout still waits on
the 2026-09-19 natural-run proof, which now has its clean pre-slot baseline.
