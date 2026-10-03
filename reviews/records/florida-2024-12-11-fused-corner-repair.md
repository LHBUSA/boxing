# Florida 2024-12-11 Probox: fused-corner repair (PREPARED, NOT APPLIED)

Parser defect fixed in florida-athletic-commission@1.2.0 (3ac404b; commissions Worker 05f89566, rollback 9e2fc3b8).
This packet repairs the one stored artifact it produced. Source:
https://www2.myfloridalicense.com/pro/sbc/documents/12-11-2024-Probox-results_without_med.pdf

## What production holds (parsed by 1.1.0)

| Bout | Stored | Correct (1.2.0 parse of the same sheet) |
|---|---|---|
| 6 | Leonardo Baez (Leonardo Baez Valencia) vs **"Luis Reynaldo Nunez (Luis Reynaldo Nuñez Mosquea) Eduardo Ramirez (Eduardo Antonio Solorza"** (fighter 34e0ac48; 1 bout, 0 body links), complete, 1 result | Leonardo Baez (Leonardo Baez Valencia) vs Luis Reynaldo Nunez (Luis Reynaldo Nuñez Mosquea); Mexico / Dominican Republic; 126.8 / 129.8 lb; red corner won |
| 7 | not stored (blue corner parsed as "Ramirez)", refused by the identity name gate) | Eduardo Ramirez (Eduardo Antonio Solorza Ramirez) vs Jonhatan Cardoso (Jonhatan Soares Lourenço Cardoso); Mexico / Brazil; 135 / 134.4 lb; red corner won |

## Proposed repair (needs owner approval; nothing deleted)

1. Reprocess this one document with parser 1.2.0 (single-document run; not a 2024 year backfill, which would
   re-fetch ~98 sheets now that 1.1.0 parses are no longer current). Creates the correct bout 6 and bout 7 through the
   normal identity path.
2. Mark the stored fused bout 6 `replaced`, with a correction note pointing at the corrected bout; its result row and
   observation stay as history.
3. Set fighter 34e0ac48 (the fused name) to identity_state `void`. It has no other bout and no body links.
4. Re-run the six graph proofs and the Florida coverage counts.

Until applied, the fused fighter stays out of every identity batch (tier C, malformed name).

## APPLIED 2026-10-03 (owner-approved; reviewer Justin Erickson)

Sequence followed: prove identity -> create correct bouts -> replace malformed bout -> void malformed fighter.

1. Four-corner review (`florida-2024-12-11-four-corner-review.md`), owner change applied to Eduardo Ramirez:
   Baez MATCH 1b0ac8d2; Nunez CREATE 70ab28e9; Eduardo Ramirez CREATE 2a90d0a3 (possible relation to 25b46937 kept as a
   duplicate HOLD: missing independent identity evidence); Cardoso MATCH cb3d5c43. Queue items resolved and human
   appearance decisions recorded (seq 2529-2532, batch fl-2024-12-11-fused-corner-repair).
2. Single-document re-apply (runs 705f08ef, 8449d8ca, 28c6cde7, a45b63b5; 98 listed / 1 fetched / 97 skipped each):
   corrected bout 6 `e9dbad99` (Leonardo Baez 126.8 lb vs Luis Reynaldo Nunez 129.8 lb, Nunez won, decision) and
   bout 7 `6b16f6dd` (Eduardo Ramirez 135 lb vs Jonhatan Cardoso 134.4 lb, Cardoso won, decision), Florida source.
3. Fused bout 6 `d4c1c3b5` -> `replaced`; card change `repair:fl-2024-12-11-probox:bout6-fused-replaced`
   (bout_status_changed, replaced_by_bout_id e9dbad99); its result row and observation kept.
4. Fighter 34e0ac48 -> identity_state `void` (it had exactly that one bout). Nothing deleted.

Proof: counts +2 fighters, +1 void, +2 bouts, +2 results; body links, merges, seed decisions unchanged; bout and
result fingerprints outside the event identical; 0 other fighters / bouts touched since the repair began; bouts 2 and 4
still held for review; six graph proofs PASS (unexpected duplicates 0, reviewed HOLD Espinoza). Florida 2024 coverage:
80 professional bouts (79 live + the replaced fused row, which the report still counts), 152 fighters linked.
Incident closed.
