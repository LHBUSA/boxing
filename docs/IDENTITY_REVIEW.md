# Human identity review

Status (2026-09-13): tooling live on staging (migration 0017).
- **Pending:** 130 review items, i.e. 203 unbound appearances.
- **Recorded:** no human decisions yet.
- **Batch 001:** proposed (`reviews/identity/identity-review-batch-001.md`), awaiting a named reviewer.

The career-graph resolver (`boxing-identity-graph@1.0.0`, [IDENTITY_GRAPH.md](IDENTITY_GRAPH.md)) decides only Tier A/B, and its thresholds are unchanged. Everything else waits for a person. The workbench prepares evidence and advice; **it never decides**.

## Process

1. **Propose** (read-only): `pwsh scripts/staging/identity-review.ps1 -Propose -Batch 00N -Size 10 -OutDir <dir>`.
   - **Ranking:** appearances whose opponent is already resolved come first (approving them unlocks an official bout), then by recommendation and date.
   - **Evidence per entry:**
     - source appearance (printed name, document, corner), proposed canonical boxer
     - normalized-name level, city-level hometown on both sides, official and contracted weight with the printed division
     - commission, venue, event date, opponent
     - relationship evidence (same commission/venue, rematch), candidate record
     - contradictions, competing candidates, similar-named other boxers
     - resolver confidence and the exact reason the resolver stopped
   - **Danger flags,** listed at the top of every batch:
     - same name held by more than one canonical boxer
     - same surname + same city/region with a different given name (siblings, twins)
     - generational suffix
     - name not an exact form, or a different given name
     - common surname
     - stated places that disagree ("West Palm Beach, FL" vs "Colombia")
   - **Recommendations are advice:**
     - `match`: exact-form name, compatible weight, commission/venue continuity, no contradiction, no danger flag; only a city-level hometown is missing
     - `match_with_caveat`: the same, but with a bout within 13 days (weekly team-league cards)
     - `hold`
     - `distinct`: hard contradiction
2. **Review:** a named human edits the batch JSON. For each entry they decide, set `reviewer_decision` (`approve_match` | `approve_distinct` | `hold` | `reject_candidate`) and write `reviewer_note` (20+ characters, the actual reason). Entries left blank are not recorded.
3. **Apply:** `pwsh scripts/staging/identity-review.ps1 -Apply <batch.json> -Reviewer "<human name>"`.
   - **One new append-only row per reviewed entry** in `boxing_identity_appearance_decisions`, carrying:
     - `decided_by = reviewer:<name>`, `reviewer`, `reviewed_at`, `review_batch`, `review_note`
     - the full evidence shown to the reviewer
     - `supersedes_seq`, the latest decision the reviewer saw
   - **Refused by the database:** a stale `supersedes_seq`, a missing note, and reviewer names that look automated (resolver, claude, gpt, bot, script, system…).
   - **Earlier resolver evidence is never modified.**
   - **Then:** stored official parses are re-applied (no refetch). News from the re-apply is history.
4. **Measure after each batch:** `-Apply` prints this automatically; `-Metrics` prints it on demand, and `pwsh scripts/staging/fight-dna.ps1` recomputes DNA for the new bouts.
   - pending review queue
   - blocked bouts per state
   - canonical boxer and bout counts
   - Fight DNA coverage
   - replay of the stored odds observations (no provider request)

## Workbench 1.1.0 (2026-09-14): per-source batches, grouped identities, local review UI

- **Per-source batches:** `-Propose -Batch 003 -Size 200 -Sources mo_office_of_athletics,pa_state_athletic_commission -OutDir reviews/identity`.
- **More evidence per entry:** official document URL, jurisdiction, weight class, every name-similar candidate (tier,
  confidence, aliases, hometowns, jurisdictions, verified bouts, reasons for/against), why it is held (queue reason and
  the resolver's own stop reason), and the date-of-birth policy (never collected).
- **Grouped identities** (`groupEntries`): several held appearances become ONE review decision only when they share the
  source, the exact normalized printed name and a stated place, propose the same canonical boxer (or none), carry no
  competing candidate and no separating danger flag (namesakes, relatives, suffixes, non-exact form, place mismatch),
  fall on distinct dates, and their official weights move by at most max(8 lb, 5%). Similar names never group. A batch
  never splits a group.
- **Group apply:** a group decision writes one append-only decision row per member (same reviewer, note and batch; the
  group id and basis in the evidence). `approve_distinct` creates ONE new boxer from the earliest member and matches the
  others to it. A member cannot carry its own decision as well; members must propose the same boxer.
- **Local review UI:** `node scripts/identity/review-ui.mjs reviews/identity/identity-review-batch-003.json` opens
  http://127.0.0.1:4717 with every group and entry and its evidence, a decision select and a note. Save writes only
  `reviewer_decision` / `reviewer_note` into the batch file. It never talks to a database; it binds 127.0.0.1, refuses
  other Host headers and requires a per-run token. Applying stays `-Apply <file> -Reviewer "<human name>"`.

### Batch 003 (Missouri + Pennsylvania holds), proposed 2026-09-14, NOT applied

103 held appearances (MO 15, PA 88), 9 grouped identities covering 18 appearances, 77 would unlock a bout on approval.
Workbench advice: 24 match, 79 hold; danger flags on 31 entries (stated place mismatch 15, non-exact name form 15,
common surname 15, same surname + same region/city with a different given name 7, given name differs 1, suffix 1).
Every held appearance has a name-matched Tier C candidate; the resolver's thresholds are unchanged. No decision has
been made or recorded: the queue changes only when a named human reviews and applies.

## Review manifest and the six-commission backlog (2026-09-14)

`pwsh scripts/staging/identity-review.ps1 -Manifest <name> -Sources <keys> -Batches <batch.json,...> -OutDir reviews/identity`
(read-only). It lists every pending appearance per held identity (source + printed name). For each it shows the bouts
that approving or distinguishing it would unlock, alone or only together with another held identity, and the evidence
for and against the proposed canonical boxer. Each identity gets an evidence class:

- **A**: every appearance has the workbench's own match advice (exact-form name, compatible official weight,
  commission/venue/opponent continuity, no contradiction, no danger flag). Still needs a human approval.
- **B**: exact-form name plus at least two independent families (weight, commission, venue, opponent, hometown) with a
  caveat or danger flag, or appearances that disagree.
- **C**: a hard contradiction (same-date bout elsewhere, candidate is the opponent, debut after a recorded bout) or an
  incompatible official weight.
- **D**: the name alone, or the name plus one family. For Tennessee, "same commission" is shared by every candidate, so
  it is not independent evidence. Leave these held.

Classes rank and explain; no decision field is filled. Current manifest:
`reviews/identity/identity-review-manifest-2026-09-14-mo-pa-tn.{json,md}`.

| Source | Identities | Held appearances | Decisions required | Groups | A | B | C | D | Bouts unlockable by one identity |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Tennessee | 361 | 676 | 676 | 0 | 22 | 31 | 4 | 304 | 268 |
| Pennsylvania | 78 | 88 | 80 | 8 | 20 | 7 | 0 | 51 | 66 |
| Missouri | 13 | 15 | 14 | 1 | 0 | 6 | 1 | 6 | 11 |

### Batch 004 (Tennessee), proposed 2026-09-14, NOT applied

`reviews/identity/identity-review-batch-004.{json,md}`: the 12 Tennessee appearances the workbench ranks first. Each has
match advice, no danger flag, and its opponent already resolved, so approving it creates the bout. Open it with
`node scripts/identity/review-ui.mjs reviews/identity/identity-review-batch-004.json`. Batch 003 is unchanged: 103
entries, 0 decided, none stale (every entry's `latest_decision_seq` is still the latest).

### What a recorded decision guarantees (tests/db/24_identity_review_audit.test.mjs)

- **Every decision is recorded the same way.** Approve, hold and reject-candidate each write one append-only row with:
  - the reviewer name, `decided_by = reviewer:<name>` and `reviewed_at`
  - the batch id and the note (20+ characters)
  - the evidence shown to the reviewer, including the official document URL
  - the rejected candidate, when there is one
  - the evidence hash and `supersedes_seq` (the resolver row the reviewer saw)
- **Rows cannot be changed.** Update and delete are refused.
- **Hold and reject change nothing else.** The review item stays pending, no boxer is created, the bout stays blocked.
- **Approval preserves the source record.** Tennessee source observations are byte-for-byte unchanged (payload hash,
  content hash, observed_at), and an update is refused. Existing aliases of the approved boxer are unchanged.
- **Re-apply is deterministic.** Re-applying the reviewed document binds the approved appearance to that boxer and
  creates exactly one bout. A second re-apply creates nothing and records no decision.
- **Every bout traces to its document.** Canonical bout → human decision → the `commission_results_document`
  observation that carries the source bout id → document key, URL, revision and sha256.
- **A decision covers one appearance only.** A later appearance of the same printed name is not bound by the earlier
  decision. It gets its own resolver review row, and the next reviewer sees the approved bout in the candidate's
  verified record.

## Rules

- **Batches stay small** (about 10) and are committed under `reviews/identity/` before they are applied.
- **Danger cases need extra care.** A danger-flagged entry is never recommended as a match. A reviewer who approves one must say in the note what independent evidence separates the relatives or namesakes.
- **Sportsbook names are never evidence** and never create or match a boxer.
- **Merging two existing canonical boxers is out of scope.** It needs the separate merge workflow.

## Baseline before any human decision (staging, 2026-09-13)

| | |
|---|---|
| Pending review items | 130 (FL 94, NV 19, NJ 17), 203 appearances; 121 would unlock a bout on approval |
| Blocked official bouts | NV 19 of 134, FL 134 of 391, NJ 13 of 72 |
| Canonical boxers / bouts | 880 / 431 |
| Fight DNA | 769 fighters with bouts have snapshots; 7 with 3+ bouts; 29 metrics available; 9 source_unavailable |
| Stored odds replay | 15 stored observations, 0 events linked; the 42 events remain unmatched (no upcoming canonical bouts) |
