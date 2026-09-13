# Identity review batch 001: applied record

**Applied:** 2026-09-13 18:10:31–18:12Z to staging `wpaxofilvbsjyrxrwjhg`.
- **Reviewer:** Justin Erickson.
- **Decisions:** 12 × `approve_match` (see `identity-review-batch-001.json`, commit `066c393`).
- **Apply mode:** reviewed documents only (6 Florida sheets), graph resolver disabled (`graphResolve: false`), one pass, no refetch.
- **Production:** untouched.

## Verification against the pre-apply snapshot

| Check | Before | After |
|---|---|---|
| Appearance decision rows | 254 (max seq 254) | 266: exactly 12 new rows (seq 255–266), all `reviewer:Justin Erickson`, batch `001`, decision `matched`, with reviewed_at, note, supersedes_seq and evidence shown |
| Resolver rows written after seq 254 | n/a | **0** |
| Bound appearances | 62 | 74 (+12) |
| Name-resolver resolution rows | 1145 | 1145 |
| Review-queue rows | 170 | 170 (no new review items) |
| Pending review items | 130 | 125: 5 closed by the reviewer (Valenzuela Alvarado, Rodriguez Montemayor, Arrieta Sangroni, Gallichan, De La Cruz Sena) |
| Canonical bouts | 431 | **443** (+12, all listed below) |
| Florida blocked bouts | 134 of 391 | 122 of 391 |
| Canonical boxers | 880 | 880 |
| News written by the re-apply | n/a | 67 rows, all `skipped` history (0 open) |
| Jose Cortes, 2026-01-04 West Palm Beach appearance | resolver review hold (seq 6) | unchanged: one row only, never bound, no canonical bout, review item still pending |

## Bouts created

| Date | Bout (sheet order) | Winner method | Source bout id |
|---|---|---|---|
| 2026-02-20 | Jose Valenzuela Alvarado vs Jusiyah Shirley | DECISION | `2026-02-20\|orlando\|boxlab\|jose-valenzuela-alvarado\|jusiyah-shirley` |
| 2026-02-21 | Jose Rodriguez Montemayor vs Aniel Viamontes | TKO | `2026-02-21\|miami\|m-r-boxing\|jose-rodriguez-montemayor\|aniel-viamontes` |
| 2026-02-21 | Shaquille Rushing vs Manuel Enrique Arrieta Sangroni | DECISION | `2026-02-21\|miami\|m-r-boxing\|shaquille-rushing\|manuel-enrique-arrieta-sangroni` |
| 2026-03-07 | Cody Jenkins vs Tristan Gallichan | TKO | `2026-03-07\|alamonte-springs\|mike-sawyer-promotions\|cody-jenkins\|tristan-gallichan` |
| 2026-03-07 | Ethan Trout vs Yusmel Alejandro Ruiz | TKO | `2026-03-07\|alamonte-springs\|mike-sawyer-promotions\|ethan-trout\|yusmel-alejandro-ruiz` |
| 2026-03-07 | Phillip Penson vs Gustavo Trujillo | KO | `2026-03-07\|alamonte-springs\|mike-sawyer-promotions\|phillip-penson\|gustavo-trujillo` |
| 2026-03-28 | Wilner Soto vs Alex Vallecillo | KO | `2026-03-28\|palm-bay\|boxlite-promotions\|wilner-soto\|alex-vallecillo` |
| 2026-04-12 | Harrison Melendez vs Jose Cortes | DECISION | `2026-04-12\|hollywood\|heavyweight-factory\|harrison-melendez\|jose-cortes` |
| 2026-04-12 | Ramon De La Cruz Sena vs Aaron Aponte | DECISION | `2026-04-12\|hollywood\|heavyweight-factory\|ramon-de-la-cruz-sena\|aaron-aponte` |
| 2026-05-01 | Ariele Davis vs Sofia Viretti | DECISION | `2026-05-01\|fort-lauderdale\|team-boxing-league\|ariele-davis\|sofia-viretti` |
| 2026-05-01 | Doctress Robinson vs Esteuri Suero | DECISION | `2026-05-01\|fort-lauderdale\|team-boxing-league\|doctress-robinson\|esteuri-suero` |
| 2026-05-01 | Kaylee Ann Justus Knight vs Samantha Ginithan | DECISION | `2026-05-01\|fort-lauderdale\|team-boxing-league\|kaylee-ann-justus-knight\|samantha-ginithan` |

## Reconciliation with the independent AI audit (`identity-review-batch-001-openai-audit.md`)

The audit was committed at 18:11:08Z, while the apply was running. It was not seen before the decisions were recorded. It is advisory, and the recorded decisions are the named reviewer's.

The audit recommended **holding** Yusmel Alejandro Ruiz, Sofia Viretti and Samantha Ginithan because of "two canonical bouts on 2026-06-26 against the same opponent" and results that "oscillate between opposite winner IDs". Checked on staging after the apply:

| Boxer | 2026-06-26 bouts | What the database shows |
|---|---|---|
| Yusmel Alejandro Ruiz vs Juan Barajas | `…\|juan-barajas\|yusmel-alejandro-ruiz` (order 13) and `…\|2` (order 21) | Two rows on the official Team Boxing League sheet (repeat pairing). Ruiz won both; single revision each. |
| Sofia Viretti vs Suzana Rodriguez Griffin | `…\|sofia-viretti` (order 11) and `…\|2` (order 20) | Two sheet rows. Meeting 1: rev1 Griffin → rev2 Viretti → rev3 Griffin `[reparsed_with_florida-athletic-commission@1.0.1]`. Meeting 2: Viretti. |
| Samantha Ginithan vs Shelby Cannon | `…\|samantha-ginithan` (order 3) and `…\|2` (order 23) | Two sheet rows. Meeting 1: rev1 Cannon → rev2 Ginithan → rev3 Cannon `[reparsed_with_…@1.0.1]`. Meeting 2: Ginithan. |

**Conclusion.**
- **Not duplicates:** these are documented team-league repeat pairings, two separate official bouts with distinct source ids and sheet positions.
- **The winner flip is preserved false history:** revision 2 of meeting 1 is the known parser-1.0.0 false row ([FALSE_HISTORY.md](../../docs/FALSE_HISTORY.md) case 1), and revision 3 restores the official winner.
- **Current results are deterministic.**
- **No change to the identity evidence.**

**The audit's workbench criticism stands.** The batch evidence listed those records without the meeting number or the preserved-correction history, so a reviewer could not tell a repeat pairing from a duplicate. Follow-up: show the source bout id / repeat index and "result history contains a preserved parser correction" in `candidate_record`.

If the reviewer nevertheless wants to hold any of the three, a new human `hold` decision can be recorded (append-only). The bouts created by this batch are separate official bouts on 2026-03-07 and 2026-05-01, not the 2026-06-26 meetings.

## After-apply resolver dry run (batch 002 input, NOT applied)

`resolver-dry-run-002.{json,md}`: a simulation over the 154 still-blocked official bouts, mirroring card application exactly. It recorded nothing; decision, resolution, review-queue, bout and boxer counts are identical before and after.

- **Would bind:** 2 appearances, both **Tier A** (confidence 98). Each would create a bout.
  - Sofia Viretti, 2026-05-01 second meeting vs Ariele Davis (`…|2`)
  - Esteuri Suero, 2026-05-01 second meeting vs Doctress Robinson (`…|2`)
- **Reviewer caution:** the resolver's reason is `same_fight_already_on_record`, but the record it finds is the FIRST meeting on the same card, a different fight. The identity (same boxer, same card, same weight) is plausible, but the evidence label conflates repeat pairings with the same fight. Review these two as batch 002; the resolver was not changed.
- **Finding:** the same-card rule (same name + stated hometown on one card = same boxer) feeds on name-resolver outcomes but not on recorded bindings. That is why the batch-001 apply created exactly 12 bouts and did not also create these two second meetings. Changing that is a behavior change for the owner to decide.
