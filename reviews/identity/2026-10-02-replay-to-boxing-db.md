# Identity decision replay into the Boxing database (2026-10-02)

The deleted staging database (`wpaxofilvbsjyrxrwjhg`) held the only applied human identity decisions: batches 001 and 002,
reviewed by Justin Erickson on 2026-09-13. The owner authorized replaying them into `lobcdprmoiosbjanheeo`, keeping the
original reviewer and review date. The replay is not a new review.

| Batch | Decided | Recorded | Held (no unique remap) | Original review time (UTC) |
|---|---|---|---|---|
| 001 | 12 | 10 | 2 | 2026-09-13 18:10:31 |
| 002 | 2 | 1 | 1 | 2026-09-13 19:41:16 |

- **Remap:** `scripts/identity/replay-remap.mjs`, read-only. Files `identity-review-batch-00{1,2}-replay-remap.json`.
  - Each proposed boxer is found again only through the official source bouts the reviewer saw: the exact source bout id, or the commission key on that date with both printed-name slugs.
  - The candidate's corner is read from the source key.
  - A remap is written only when exactly one fighter results.
- **Held, still pending a human:**
  - batch 001: the Ethan Trout vs Yusmel Alejandro Ruiz corner;
  - batch 001 and batch 002: the Doctress Robinson vs Esteuri Suero corners.
  - Their reviewed candidate bouts are not canonical in the rebuilt database, so nothing was guessed.
- **Stored on each row:**
  - reviewer `Justin Erickson` and the original `reviewed_at`;
  - in the evidence: `replay.replayed_from = staging wpaxofilvbsjyrxrwjhg (deleted 2026-10-02)`, `replayed_at`, `original_fighter_id` and the remap basis;
  - `decided_at` = write time.
- **After the replay:** a reapply of only the reviewed Florida documents (graph resolver off) linked 33 bouts and created 10 results.
- **Not replayed:** batches 003 and 004 were proposed but never decided.
