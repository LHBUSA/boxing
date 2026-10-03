# Florida 2024-12-11 Probox: four-corner identity review (PREPARED; resolution needs owner approval)

Part of the approved fused-corner repair (`florida-2024-12-11-fused-corner-repair.md`). The parser 1.2.0 reprocess
(run 705f08ef) held these four corners for review (`insufficient_evidence`), so corrected bouts 6 and 7 were not
created. Steps 3-4 of the repair (fused bout 6 -> `replaced`, fighter 34e0ac48 -> `void`) wait until these resolve.
Global identity gate unchanged; no new merge rule. Bouts 2 and 4 stay held and are not part of this review.

Sheet: https://www2.myfloridalicense.com/pro/sbc/documents/12-11-2024-Probox-results_without_med.pdf
(ProBox Promotions, ProBox TV Events Center, Plant City FL)

| # | Corner (parser 1.2.0, as printed) | Sheet facts | Review item | Resolver candidate | Candidate evidence | Proposal |
|---|---|---|---|---|---|---|
| 6 blue | Leonardo Baez (Leonardo Baez Valencia) | Mexico, 126.8 lb | c62bf3c1 | 1b0ac8d2 Leonardo Baez (Leonardo Baez Valencia) | exact full name incl. parenthetical, hometown Mexico; its only bout is this same sheet's bout 6 at 126.8 lb | **MATCH 1b0ac8d2** (same person, same bout) |
| 6 red | Luis Reynaldo Nunez (Luis Reynaldo Nuñez Mosquea) | Dominican Republic, 129.8 lb, winner | d6ac1483 | 34e0ac48 (the fused fighter; containment only) | the candidate IS the parser artifact to be voided; no other candidate | **CREATE NEW** (never match the fused row) |
| 7 blue | Eduardo Ramirez (Eduardo Antonio Solorza Ramirez) | Mexico, 135 lb | 491765bd | 25b46937 Eduardo Ramirez | exact given+surname, hometown Mexico; one bout 2026-03-13, 130.8 lb vs Dominic Valle, also a Probox card (Osceola Heritage Park) | **MATCH 25b46937**, flagged: common name; same promoter, country and weight band are the only bridge |
| 7 red | Jonhatan Cardoso (Jonhatan Soares Lourenço Cardoso) | Brazil, 134.4 lb, winner | 7181cb63 | cb3d5c43 Jonhatan Cardoso (Jonhatan Soares Lourenço Cardoso) | exact distinctive full name incl. parenthetical, hometown Brazil; no stored bout yet | **MATCH cb3d5c43** |

Alternative for Eduardo Ramirez if the common-name bridge is not enough: CREATE NEW, leaving a possible later merge to
the guarded merge function once more evidence exists.

## After approval (exact sequence)

1. Resolve the four items with `boxing_resolve_identity_review` (actor = owner): matched_existing / created_new as above.
2. Reprocess only `fl-results:12-11-2024-Probox-results_without_med` (`commissions-ingest.ps1 -Adapter florida -Backfill -Year 2024 -Doc ...`).
3. Prove corrected bout 6 (Baez vs Nunez, red won) and bout 7 (Ramirez vs Cardoso, red won) exist with weights and source.
4. Same reviewed step: fused bout 6 -> `replaced` pointing at corrected bout 6; fighter 34e0ac48 -> `void`; history kept.
5. Six graph proofs, Florida coverage counts, and the repair-scope snapshot diff (nothing outside the event changes).
