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
