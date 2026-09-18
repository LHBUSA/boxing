# Commission natural-run receipt — 2026-09-16 11:40Z slot

**NATURAL RUN: FAIL — TN upstream HTTP 403**

Second consecutive failed proof. The gate is unchanged, Tennessee is not waived, and a remote 4xx/5xx is not an accepted
`partial`. Migration 0042, Event Truth staging and Matchroom stay blocked. Neither this run nor the 2026-09-15 run is ever
to be redefined as passing. Evaluated 2026-09-18 (the session was down when the slot fired; the ledger is authoritative).

## Supporting evidence

| Item | Result |
|---|---|
| Scheduled Cloudflare cron | fired normally: 6 invocations, 6 ingest runs, `scheduled_for 2026-09-16 11:40:07+00`, all `forward` |
| Deployed Worker | `boxing-commissions-staging` still `b451ad9b-3990-4438-897a-bfa6cc0bc8ad` |
| Staging verifier | 43/44 — see the note below; no staging drift |
| Identity logic diff | unchanged (`shared/identity/graph.mjs`, `resolver.mjs`, `evidence.mjs`, `normalize.mjs`, `appearance.mjs`, `pipeline.mjs`) |
| Tennessee reconciliation | unchanged from the 2026-09-15 receipt |
| Production writes | 0 |

**Verifier note:** the single failing check is `expected_tables_exist`, missing `boxing_jurisdictions`,
`boxing_result_classes`, `boxing_runtime_flags`, `boxing_scope_consumers`, `boxing_source_capabilities`,
`boxing_weight_class_definitions`. That check compares staging with the repo's migration chain, and migrations 0043/0044
are deliberately **not** applied to staging (owner: only after this gate passes). Every other check passes, including the
44th-check invariants for append-only history, RLS, source policy and duplicate detection.

## Per-commission outcome (2026-09-16 slot)

| Commission | Status | Listed / fetched / changed | Named cause |
|---|---|---|---|
| NV | partial | 0 / 0 / 0 | `empty_indexes: nv-results-index:2026` (transient empty index page) |
| FL | partial | 15 / 1 / 0 | documents_not_pdf |
| NJ | partial | 1 / 1 / 1 | identity_unresolved |
| MO | ok | 6 / 0 / 0 | — |
| PA | ok | 14 / 0 / 0 | — |
| **TN** | **failed** | **0 listed** | `http_403 https://www.tn.gov/commerce/regboards/athletic/events.html` |

Deltas (spanning the 09-16 and 09-17 slots, because the baseline was taken 2026-09-15T14:47Z): no negative deltas; bouts
700, events 209, fighters 1,731, officials 182 all unchanged; NJ +4 suspensions; index document revisions advanced for
NV/FL/NJ/MO/PA; TN zero everywhere. Duplicate bouts, identity collisions and duplicate judge/referee slots remain 0; no
Texas runs, no non-scheduled runs, no human decisions, no new queue items.

## Tennessee chain (read-only, unchanged since 2026-09-15)

625 source bouts → 153 canonical bouts created, 472 held (268 one side, 204 both); 1,250 appearances (676 held, all
`C:review` by resolver); 361 pending review items = 361 distinct held names, no orphans; 574 TN-created fighters, none
carrying another source's identity; documents 101 parsed / 17 rejected.

## Two-run source-availability comparison

| | 2026-09-15 11:40Z | 2026-09-16 11:40Z | 2026-09-17 11:40Z |
|---|---|---|---|
| TN run | `09e3cdfb` failed 11:42:50Z | failed | failed |
| Upstream response | **HTTP 525** (Cloudflare↔origin TLS handshake failed) | **HTTP 403** | **HTTP 403** |
| Documents listed | 0 | 0 | 0 |
| Other five commissions | ran (2 ok, 3 partial) | ran (2 ok, 3 partial) | ran (2 ok, 3 partial) |
| Worker version | b451ad9b | b451ad9b | b451ad9b |

**The failure changed character.** A 525 is an origin-side TLS failure — transient infrastructure. A 403 repeated on two
consecutive days is an access-control response: tn.gov is refusing our request, not failing to serve it. Under
`docs/SOURCE_POLICY.md` this is an access gap, and it is never to be worked around: no user-agent spoofing, no header
games, no proxying, no CAPTCHA handling. It also meets the owner's stop condition "source-policy/access change", so no
further Tennessee collection attempt should be made until this is decided.

## Proposed durable Tennessee availability design — FOR OWNER APPROVAL ONLY, NOT IMPLEMENTED

1. **Classify access refusals apart from outages.** Record `http_403`/`http_401`/robots refusals as
   `access_refused` rather than a generic fetch error, and stop retrying that host inside the same run.
2. **Access-gap state on the source.** After N consecutive refusals (proposed: 2 scheduled runs), mark the source
   `access_gap` in `boxing_sources`, stop scheduling it, and surface it in the registry and coverage reads. Re-enabling is
   an explicit owner action, never automatic.
3. **Conditional, polite re-checks.** While in `access_gap`, one HEAD/If-Modified-Since probe per day at a jittered minute,
   from the same identified agent, with no retry storm. Success clears the gap and reopens normal collection.
4. **Keep the gate honest.** Do **not** reclassify a refused source as an accepted `partial`. Instead the proof would read
   "5 of 6 commissions ran; TN in `access_gap` since <date>", and the owner decides per run whether that constitutes a
   pass. I recommend keeping FAIL as the default so no silent coverage loss is possible.
5. **Written access request.** tn.gov publishes a linking/usage policy and the records are public under Tennessee law; the
   durable fix is a short written request for programmatic access (or an alternate data path), tracked like the promoter
   permission drafts.
6. **No backfill of the gap.** The 108 unfetched TN index links and 18 scanned sheets stay unfetched; the coverage report
   keeps showing them as missing rather than estimating.

## State after this proof

Nothing was applied, deployed, invoked or backfilled. Staging is unchanged apart from what the cron itself wrote.
Migrations 0042/0043/0044 remain unapplied. Production writes 0.
