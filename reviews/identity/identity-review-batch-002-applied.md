# Identity review batch 002: applied record

**Applied:** 2026-09-13 19:41:16–19:42Z to staging `wpaxofilvbsjyrxrwjhg`.
- **Reviewer:** Justin Erickson (explicit approval of both entries).
- **Decisions:** 2 × `approve_match` (`identity-review-batch-002.json`, commit `2a0b977`).
- **Apply mode:** only `fl-results:05-01-2026-Team_Boxing_League-results_without_med`, graph resolver disabled (`graphResolve: false`), one pass, no refetch.
- **Production:** untouched.

| Check | Before | After |
|---|---|---|
| Human decision rows | 12 | 14: seq 267 (Sofia Viretti `…\|2\|b`, supersedes 114) and 268 (Esteuri Suero `…\|2\|b`, supersedes 123). Both `reviewer:Justin Erickson`, batch 002, `matched`, with `repeat_pairing_identity_continuity` and repeat index 2 preserved in the stored evidence. |
| Resolver rows written | n/a | **0** |
| Bound appearances | 74 | 76 (+2) |
| Name-resolver resolution rows / review-queue rows | 1145 / 170 | 1145 / 170 |
| Canonical bouts | 443 | **445**: exactly the two second meetings, no unrelated bout |
| Florida blocked bouts | 122 of 391 | 120 of 391 |
| Pending review items | 125 | 125 (both names still have other pending appearances) |
| Canonical boxers | 880 | 880 |
| News from the re-apply | n/a | 9 rows, all skipped history |

## Bouts created

| Source bout id | Sheet order | Bout | Official result |
|---|---|---|---|
| `2026-05-01\|fort-lauderdale\|team-boxing-league\|ariele-davis\|sofia-viretti\|2` | 18 | Ariele Davis vs Sofia Viretti | Ariele Davis, unanimous decision (rev1) |
| `2026-05-01\|fort-lauderdale\|team-boxing-league\|doctress-robinson\|esteuri-suero\|2` | 29 | Doctress Robinson vs Esteuri Suero | **none recorded** |

**Why the Suero second meeting has no result.**
- The stored official parse of the 1 May sheet (`florida-athletic-commission@1.0.0` observation) has `result: null` for sheet order 29. The parser found no readable decision for that row.
- Missing facts stay null and are never inferred, and no document was refetched.
- The bout exists; its result waits for a readable official source. A later forward run re-parses the document only if the sheet changes or the parser version changes.

## After recompute

- **Fight DNA:** 778 fighters with snapshots (unchanged); 11 with 3+ bouts (unchanged). Activity metrics count bouts with a result, and the Suero second meeting has none.
- **Stored-odds replay:** stored data only (20 observations now, from the natural odds cron). 0 of the 42 events matched; no provider request.
- **Staging verifier:** 39/39.
