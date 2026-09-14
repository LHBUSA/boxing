# Tennessee reconciliation (staging, 2026-09-14)

Queries: `scripts/staging/tn-reconciliation.sql` (read-only, staging `wpaxofilvbsjyrxrwjhg`). The document-level join
against the tn.gov index pages and the local research copies was run from the session scratchpad; the research PDFs are
not committed (they print federal IDs and birth dates).

## Why the earlier figures moved

| Figure | First report | After the Workers-runtime proof | Now (index fix + backfill 2020/2021/2023) |
|---|---:|---:|---:|
| Source bouts read | 588 | 595 (+7: `2023/Country-Box_12-5`, the earlier fetch error, parsed in local workerd) | **625** (+30 from 7 newly listed documents) |
| Canonical bouts created | 147 | 148 | **153** |
| Bouts held | 441 | 447 | **472** |
| Tennessee review items | 341 | 344 | **361** |

The 7 newly listed documents were missed by the first index parser. It dropped rows whose cells contain `<br />`
(22 links, 6 of them boxing sheets 2020–2021) and the archive row dated "2/7/202" (Lion Heart Boxing Productions, 2023).
Fixed in `76890ec`: every link is placed, and a run with an unplaced link is `partial`.
The `76890ec` commit message says "7 of them boxing" for the `<br />` rows; the correct count is 6 plus the mistyped row.

## Bouts → appearances → review items → fighters

| Stage | Count | How it is derived |
|---|---:|---|
| Parsed result documents | 101 | `boxing_source_documents` (kind results, status parsed) |
| Source bouts on the stored parses | 625 | `payload.bouts` of each document's current revision; 625 distinct source bout ids |
| Canonical bouts created | 153 | source bout id present in `boxing_bout_identities` (`tn-athletic-commission.bout`); = 153 `boxing_bouts` rows owned by Tennessee |
| Bouts held | 472 | 625 − 153 |
| Corner appearances | 1,250 | 625 × 2 |
| in created bouts | 306 | 153 × 2, both corners resolved |
| resolved corner of a held bout | 268 | its opponent is held |
| held appearances | 676 | latest appearance decision = `C:review` by `boxing-identity-graph@1.1.0` (all 676) |
| Held bouts with ONE held corner | 268 | 268 held appearances; one human decision creates the bout |
| Held bouts with BOTH corners held | 204 | 408 held appearances; two decisions needed |
| Check | 268 + 408 = 676; 268 + 204 = 472 | |
| Pending review items | 361 | queue dedupe key = source + printed name (no date of birth): all held appearances of one printed name share one item |
| appearances per item | 219 items ×1, 77 ×2, 29 ×3, 10 ×4, 10 ×5, 4 ×6, 6 ×7, 2 ×8, 1 ×10, 2 ×11, 1 ×12 | = 676 |
| Unaccounted | 0 | every held appearance links to a pending item (676/676); every pending item has a held appearance (0 orphan items); no held name without an item |
| Grouped reviews | 0 | grouping requires a stated place; Tennessee prints none, so one decision per appearance (676 decisions) |
| Canonical fighters created by Tennessee | 574 | = resolved appearances 306 + 268; 574 distinct normalized names; 0 share a name with any other canonical fighter |
| Candidate of each held item | 361 × exactly 1 | 220 are fighters Tennessee itself created (a first appearance of the same printed name); 141 are fighters from other commissions |

Why names are held: Tennessee prints a name and a weight, no hometown or date of birth. The resolver's Tier B needs a
city-level hometown; Tier A needs recorded opponent/card continuity. So a printed name seen before goes to review. By
queue reason: 321 insufficient evidence, 30 given-name variant, 10 missing suffix. Thresholds are unchanged.

## Documents: every link ends in a terminal state

| tn.gov index (events + archive) | Links |
|---|---:|
| Distinct result-PDF links | 226 |
| Placed by the row parser | 226 (0 unplaced) |
| Skipped at the index: the row/label names another sport | 108 (MMA 92, kickboxing 14, bare-knuckle 2) |
| Boxing links fetched into staging | 118 |
| parsed | 101 (625 bouts) |
| rejected: image-only scan (no text layer) | 8 |
| rejected: OCR scan quarantined (glyph noise; marks unreadable) | 7 |
| rejected: bare-knuckle form (BKFC 2026-06-19, BKB 42 2025-06-21) | 2 |
| current fetch errors | 0 |

Flag for a later review: `2021/STRIKEFEST-BOXING-OFFICIAL-RESULTS_7-03-21` sits on a "Pro-Am MMA" row with a generic
"Results" label. It is skipped as MMA by the index rule, although its file name says BOXING.

| Local research copies (118 boxing-labelled PDFs) | |
|---|---:|
| Also in staging | 108 (91 parsed + 17 rejected, same outcome locally and on staging) |
| Local only | 10: the index row or link names another sport (8 kickboxing/MMA rows, 1 "Bare-Knuckle Results" link, 1 Pro-Am MMA row). The local survey selected by the words "pro" + "box" in the row; the adapter uses the per-link sport. |
| Staging only | 10: all parsed. 4 failed to download during the local survey; 6 were missed by the survey's own row regex (same `<br />` rows). |

Earlier counts of "95 parsed / 17 rejected / 1 error" included the 2 index pages (kind listing). The results documents
were 93 parsed + 17 rejected + 1 fetch error.
