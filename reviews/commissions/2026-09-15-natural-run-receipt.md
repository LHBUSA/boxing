# Commission natural-run receipt — 2026-09-15 11:40Z slot

**NATURAL RUN: FAIL — TN upstream HTTP 525**

Owner decision (2026-09-15): legitimate FAIL caused by upstream source availability, not a code failure. Tennessee is not
waived, the gate in `docs/COMMISSION_NATURAL_RUN_2026-09-15.md` is unchanged, and a remote 5xx is not an accepted
`partial`. Migration 0042, Event Truth and Matchroom stay blocked. The identical proof runs after the 2026-09-16 11:40Z
natural slot under the same acceptance rules. This run is never to be redefined as passing.

## Supporting evidence

| Item | Result |
|---|---|
| Scheduled Cloudflare cron | fired normally: invocation `82f4424f-11f4-48c9-84b6-befb9a58e54c`, cron `40 11 * * *`, runtime cloudflare-workers, 6 invocation rows, 6 ingest runs, all `forward` |
| Deployed Worker | `boxing-commissions-staging` remained `b451ad9b-3990-4438-897a-bfa6cc0bc8ad` (created 2026-09-14T16:14:18Z) |
| Staging verifier | `verify-staging.ps1` 44/44 |
| Identity diff | `git diff bf10259..9a202c4` on identity files: empty |
| Tennessee reconciliation | unchanged (below) |
| Production writes | 0 |

## Failing item

Tennessee run `09e3cdfb-1076-463b-b53f-d2e6fc0db754` (`tn-athletic@1.0.0`), started 11:42:50.644Z, completed 11:42:50.829Z,
status `failed`, error `http_525 https://www.tn.gov/commerce/regboards/athletic/events.html`, documents listed 0. Checklist
items 2 and 3 fail. Check output: `2026-09-15-natural-run-after.json` (commit 22ab1a8); re-run at 12:07Z gave the same result.

## Other commissions (not accepted on their own; the gate is all six)

| Commission | Status | Listed / fetched / changed / unchanged / rejected | Fetch errors | Bouts / events Δ | Scorecards Δ | Officials Δ | Reviews |
|---|---|---|---|---|---|---|---|
| NV | partial (identity_unresolved) | 40 / 12 / 12 / 0 / 0 (12 parser-superseded re-parses) | 0 | 0 / 0 | +3 | +1 | 16 unresolved → 5 C:review, existing pending items |
| FL | partial (documents_not_pdf=1) | 16 / 1 / 0 / 0 / 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| NJ | partial (identity_unresolved) | 1 / 1 / 1 / 0 / 0 | 0 | 0 / 0 | 0 | 0 | 8 unresolved, existing pending items; +2 suspensions |
| MO | ok | 6 / 0 / 0 / 0 / 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| PA | ok | 15 / 0 / 0 / 0 / 0 | 0 | 0 / 0 | 0 | 0 | 0 |
| TN | **failed** | 0 listed (HTTP 525) | — | 0 / 0 | 0 | 0 | 0 |

Global invariants after: bouts 700, events 209, fighters 1,731, officials 182; possible duplicate bouts 0, event/bout
identity collisions 0, duplicate judge slots 0, duplicate active referees 0, same-day same-pair bouts 20 (= baseline); no
Texas runs, no non-scheduled runs, no human decisions since the slot, no new queue items.

## Tennessee reconciliation (`scripts/staging/tn-reconciliation.sql`, read-only, 2026-09-15)

- result documents 118: parsed 101, rejected 17 (7 image-only, 7 OCR quarantined, 3 bare-knuckle)
- source bouts 625 (617 with resolved result); canonical bouts created 153; held 472 (one side 268, both sides 204)
- appearances 1,250: held 676 (all `C:review` by resolver), resolved in held bout 268, resolved in created bout 306
- review queue pending 361 (insufficient_evidence 321, given_name_variant 30, suffix_missing 10) = 361 distinct held names; 0 orphans either way
- fighters created from Tennessee 574; in created bouts 306; also carrying another source's identity 0

## Next proof

Baseline for the 2026-09-16 slot: `2026-09-16-natural-run-baseline.json` (read-only snapshot, 2026-09-15T14:47Z). After the slot:
`natural-run-check.ps1 -Check -Baseline reviews/commissions/2026-09-16-natural-run-baseline.json -Slot 2026-09-16T11:40:00Z`,
`verify-staging.ps1`, the identity diff and `tn-reconciliation.sql`, evaluated against the unchanged checklist.
