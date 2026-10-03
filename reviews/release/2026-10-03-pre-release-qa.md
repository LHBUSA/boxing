# Boxing pre-release QA (2026-10-03)

```text
PRE-RELEASE QA
WBO HISTORY COMPLETENESS: PENDING
DEPLOY_HOLD: ACTIVE
```

This is **not** release acceptance. The release suite reruns from clean state after WBO history completes. The
production Vercel env is unchanged, and `boxing-gateway-staging` is kept as rollback until final approval.

## Rankings depth by body (Boxing database `lobcdprmoiosbjanheeo`)

| Body | State | Stored | Gaps |
|---|---|---|---|
| WBA | COMPLETE | 312 months, 2000-01 → 2026-09 | 9 months the WBA never published (absent from its own month selector): 2000-04, 2000-06, 2002-10, 2003-03, 2003-04, 2003-06, 2003-10, 2003-12, 2005-09. 189 months hold one division for review (lone unified/undisputed phrase, division listed twice, UNKNOWN division); the other divisions in those months are stored |
| IBF | COMPLETE | 248 months, 2005-12 → 2026-08; 4,193 ranking snapshots, 17 divisions | 1-3 months per division absent from the IBF's own feed (checked at source for heavyweight): 2014-09..2014-11 (varies by division), 2015-01 super bantamweight, 2018-12 heavyweight |
| WBO | INCOMPLETE / SOURCE TEMPORARILY UNAVAILABLE | 64 months, 2020-07 → 2026-09, every month with all 17 divisions (1,088 ranking snapshots) | TRANSPORT FAILURE: 23 months returned HTTP 503, kept in the checkpoint for retry (2019-05..2020-04, 2022-01..2022-11). HELD: 2. UNTRIED: 2000-01..2019-04. **A 503 is not proof that the WBO never published a month.** |
| WBC | DOCUMENTED LIMITATION | 2026-09 and 2026-10 | The WBC links only its current ratings PDF; older linked PDFs return 404. History grows one month per collection |

The states are kept distinct: STORED, SOURCE-PUBLISHED GAP, HELD, TRANSPORT FAILURE, UNTRIED.

## WBO retry plan (next window)

1. Send one historical month request first. On anything other than 200 (429, 503, a challenge or an unexpected redirect), stop and extend the cooldown.
2. If it returns 200, continue strictly serially in small bounded batches, checkpointing after each, with a wait between requests. No bursts.
3. Order: retry the 23 failed months (`titles-collect.ps1 -Body wbo -Backfill -RetryFailed`), verify those captures, then resume backward from 2019-04 to 2000-01.

## Checks run

| Check | Result |
|---|---|
| Secrets scan | 603 files, none |
| Unit | 280/280 |
| DB (local PostgreSQL) | 284/284. `01_migrations` hit the 120 s test timeout under 4-way concurrency on a memory-tight host; run alone it passes 12/12 (chain rerun 4.9 s) |
| Web | 33/33 |
| Typecheck | clean |
| Build + posture | static 26/26, compile clean, bundle 8/8 (no gateway host, token, Supabase ref or key in client bundles) |
| Data integrity | verifier 44/44; 0 duplicate current ranking snapshots across all four bodies; 0 title events written |
| Production gateway canaries | health 200; every site route refuses anonymous calls with 401; authenticated reads 200 (23 routes); malformed ref 400, unknown ref 404. The only forbidden-key hit was `source_record` on ranking reads, which is document provenance only (body, as-of label, retrieval time, parser version, hash, division label) and is accepted |
| Browser QA (local build on 127.0.0.1 against the production gateway) | 14 routes × 6 widths (390-1920) = 84 checks: 0 horizontal overflow, 0 unavailable states, 0 console errors, 0 real failed requests (only aborted Next.js prefetches) |
| Fix found in QA | "0-0" shown for boxers with no verified bout (home poster, fighter tile/description, directory) changed to "No verified bouts yet" / "—" (80fd9c8) |

## Movement coverage (identity only, never names)

| Body | Coverage |
|---|---|
| WBA | 260 of 270 numbered entries (body boxer id) |
| WBC | 0 (one month stored) |
| IBF | 0 (no body id printed, no resolved identity) |
| WBO | 0 (no body id printed, no resolved identity) |

## Identity

Unresolved, ranked by `scripts/staging/identity-priority.sql`:

| Queue | P0 | P1 | P2 |
|---|---|---|---|
| Sanctioning names | 1,104 | 446 | 6,477 |
| Commission appearances | 5 | 474 | 770 |

The 11 replayed human decisions remain marked `replayed_from: staging` with their original 2026-09-13 review times.

## Newsroom (preview)

50 articles: 0 published, 27 approved but unpublished (auto-publish OFF), 23 review_required. Every commission
suspension or medical story is review_required, for a human.

## Known gaps that block release even if WBO completes

1. **Production Vercel still reads `boxing-gateway-staging`.** Its database is deleted, so the live build surface shows "temporarily unavailable". The switch belongs to the cutover step, together with `DEPLOY_HOLD` removal and a redeploy.
2. **Soft 404:** a missing fighter or fight returns HTTP 200 with a "Not found" page, because pages stream through `loading.tsx`. Harmless while the site is noindex; fix before launch.
3. **Hall of Fame and coverage-graph reference data is not rebuilt yet**, so the home page shows "0 Hall of Fame inductions". The zero comes from missing reference data, not from a true count.
4. **The commission Worker's first natural run on the Boxing database (NJ included) is pending:** 2026-10-03 11:40Z.
