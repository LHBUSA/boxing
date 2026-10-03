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
