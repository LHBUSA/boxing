# Officials cleanup plan (READ ONLY)

Generated 2026-09-13T23:51:13.191Z by boxing-official-cleanup@1.0.0. Evidence 2026-09-13T23:49:12.934237+00:00. Simulated documents: 26.

## Summary

| key | value |
|---|---|
| officials | 117 |
| A | 0 |
| A_pending | 2 |
| B | 7 |
| C | 5 |
| D | 7 |
| review_queue_pending | 28 |
| artifact_official_names | 2 |
| surname_only_officials | 5 |
| duplicate_active_judge_slots | 0 |
| promoter_fragments_in_latest_parses | 0 |
| official_artifacts_in_latest_parses | 3 |

## Staging totals

| key | value |
|---|---|
| officials | 117 |
| scorecards | 180 |
| bout_officials | 1391 |
| review_pending | 28 |
| officials_merged | 0 |
| official_name_keys | 735 |
| scorecards_current | 180 |
| official_identities | 0 |
| bout_officials_active | 1391 |
| duplicate_active_judge_slots | 0 |
| bouts_with_two_active_referees | 0 |
| scorecards_without_active_assignment | 0 |

## Category A: deterministic parser artifacts (apply-ready, stored evidence) (0)

None.

## A pending: deterministic once a scheduled run stores the corrected parse (2)

| class | candidate A | candidate B | roles | commissions | assignments A / B | scorecards A / B | reason / relation |
|---|---|---|---|---|---|---|---|
| A_pending | & Cory Santos | (rename to Cory Santos) | judge | nsac | 10 / - | 8 / - | corrected parse is simulated; becomes A only once a scheduled run stores it |
| A_pending | & Steve Weisfeld | (rename to Steve Weisfeld) | judge | nsac | 8 / - | 7 / - | corrected parse is simulated; becomes A only once a scheduled run stores it |

### & Cory Santos -> Cory Santos

Source documents: nv-results:2026:01-23-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:03-28-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:04-11-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:05-02-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:05-10-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:05-23-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]

| event | bout | role | slot | scorecards (slot) | document | stored name (parser) | corrected name (parser) | status |
|---|---|---|---|---|---|---|---|---|
| 2026-01-23 TKO Productions LLC d and b and a Zuffa Boxing at The Meta Apex | 47d27e31-678e-4ba6-bdd4-1daa67d5a7e0 | judge | 2 | 1 (2) | nv-results:2026:01-23-26_Boxing_REDACTED | & Cory Santos (nsac-nevada@1.0.0) | Cory Santos (nsac-nevada@1.0.2, simulated) | continuity_simulated |
| 2026-03-28 TGB Promotions and Sampson Boxing at MGM Grand Garden Arena | 25c099d5-09e9-4f8f-8d83-abec2471e60b | judge | 3 | 1 (3) | nv-results:2026:03-28-26_Boxing_REDACTED |  () | Cory Santos (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-04-11 DMG Boxing and Promotions Inc. at Chelsea at Cosmopolitan | 06f5486c-f845-4d2e-8778-f28aa412eabe | judge | 2 | 1 (2) | nv-results:2026:04-11-26_Boxing_REDACTED |  () | Cory Santos (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-04-11 DMG Boxing and Promotions Inc. at Chelsea at Cosmopolitan | 9b85e517-53eb-43b3-92cf-83dea87508e2 | judge | 2 | 1 (2) | nv-results:2026:04-11-26_Boxing_REDACTED |  () | Cory Santos (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-04-11 DMG Boxing and Promotions Inc. at Chelsea at Cosmopolitan | a65dcf79-aeee-451c-b067-4b1ea79ac228 | judge | 3 | 1 (3) | nv-results:2026:04-11-26_Boxing_REDACTED |  () | Cory Santos (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-05-02 TGB Promotions and Golden Boy Promotions and Sampson Boxing at T-Mobile Arena | 301150c3-7591-4660-830d-509d60daa9fb | judge | 3 | 1 (3) | nv-results:2026:05-02-26_Boxing_REDACTED |  () | Cory Santos (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-05-02 TGB Promotions and Golden Boy Promotions and Sampson Boxing at T-Mobile Arena | 50c1530e-4976-4b20-9a60-32fccb1af1a6 | judge | 1 | 0 (-) | nv-results:2026:05-02-26_Boxing_REDACTED |  () | Cory Santos (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-05-02 TGB Promotions and Golden Boy Promotions and Sampson Boxing at T-Mobile Arena | cb34afb9-8cc1-48af-a924-6b66e4712de0 | judge | 3 | 0 (-) | nv-results:2026:05-02-26_Boxing_REDACTED |  () | Cory Santos (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-05-10 TKO Productions LLC d and b and a Zuffa Boxing at The Meta Apex | 64d75810-b68a-4302-994b-8ac936eae374 | judge | 2 | 1 (2) | nv-results:2026:05-10-26_Boxing_REDACTED |  () | Cory Santos (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-05-23 RR Enterprise LLC dba Reid Boxing at The Meta Apex | a82f6b59-4666-4258-ab92-81d288b3a42c | judge | 3 | 1 (3) | nv-results:2026:05-23-26_Boxing_REDACTED | & Cory Santos (nsac-nevada@1.0.0) | Cory Santos (nsac-nevada@1.0.2, simulated) | continuity_simulated |

Would change: officials_renamed=1, aliases_recorded=1, officials_merged=0, assignments_repointed=0, scorecards_repointed=0, rows_deleted=0, assignments_keep_resolving=10, scorecards_keep_resolving=8

### & Steve Weisfeld -> Steve Weisfeld

Source documents: nv-results:2026:01-23-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:02-21-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:04-05-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:04-25-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]; nv-results:2026:05-10-26_Boxing_REDACTED [nsac-nevada@1.0.0, nsac-nevada@1.0.2 (simulated)]

| event | bout | role | slot | scorecards (slot) | document | stored name (parser) | corrected name (parser) | status |
|---|---|---|---|---|---|---|---|---|
| 2026-01-23 TKO Productions LLC d and b and a Zuffa Boxing at The Meta Apex | 47d27e31-678e-4ba6-bdd4-1daa67d5a7e0 | judge | 3 | 1 (3) | nv-results:2026:01-23-26_Boxing_REDACTED | & Steve Weisfeld (nsac-nevada@1.0.0) | Steve Weisfeld (nsac-nevada@1.0.2, simulated) | continuity_simulated |
| 2026-02-21 TGB Promotions and Golden Boy Promotions at T-Mobile Arena | 37fc7b5e-c57c-4a33-8d8e-82559d3dff51 | judge | 3 | 1 (3) | nv-results:2026:02-21-26_Boxing_REDACTED |  () | Steve Weisfeld (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-02-21 TGB Promotions and Golden Boy Promotions at T-Mobile Arena | ffaffb72-578e-41ee-bf28-d9debbb54cb2 | judge | 3 | 1 (3) | nv-results:2026:02-21-26_Boxing_REDACTED |  () | Steve Weisfeld (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-04-05 TKO Boxing Promotions LLC at Meta Apex | 39c0c940-40df-4545-ba30-7535a8c8218c | judge | 3 | 1 (3) | nv-results:2026:04-05-26_Boxing_REDACTED |  () | Steve Weisfeld (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-04-05 TKO Boxing Promotions LLC at Meta Apex | d8426a59-b5ec-41df-be03-467eed004d33 | judge | 3 | 0 (-) | nv-results:2026:04-05-26_Boxing_REDACTED |  () | Steve Weisfeld (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-04-25 Matchroom Boxing at The Fontainebleau | 04601489-f06a-4e4a-bf00-b93beb88d44b | judge | 3 | 1 (3) | nv-results:2026:04-25-26_Boxing_REDACTED |  () | Steve Weisfeld (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-04-25 Matchroom Boxing at The Fontainebleau | 70115cf1-151b-4f4e-9f55-aebc33986177 | judge | 3 | 1 (3) | nv-results:2026:04-25-26_Boxing_REDACTED |  () | Steve Weisfeld (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |
| 2026-05-10 TKO Productions LLC d and b and a Zuffa Boxing at The Meta Apex | 64d75810-b68a-4302-994b-8ac936eae374 | judge | 3 | 1 (3) | nv-results:2026:05-10-26_Boxing_REDACTED |  () | Steve Weisfeld (nsac-nevada@1.0.2, simulated) | document_names_the_corrected_name |

Would change: officials_renamed=1, aliases_recorded=1, officials_merged=0, assignments_repointed=0, scorecards_repointed=0, rows_deleted=0, assignments_keep_resolving=8, scorecards_keep_resolving=7

## Category B: probable same official (human review) (7)

| class | candidate A | candidate B | roles | commissions | assignments A / B | scorecards A / B | reason / relation |
|---|---|---|---|---|---|---|---|
| B | Daniel Torres | Prof. Daniel Torres | judge | fl-athletic-commission | 9 / 7 | 0 / 0 | name_variant:token_containment |
| B | G. Wayne Hedgpeth | Gilbert Wayne Hedgpeth | judge | nj-sacb | 24 / 4 | 3 / 2 | name_variant:initial |
| B | Ged O'Connor | James (Ged) O'Connor | judge | fl-athletic-commission | 7 / 6 | 0 / 0 | name_variant:nickname_as_first_name |
| B | Kevin Mogan | Kevin Moran | judge | nj-sacb | 1 / 1 | 0 / 0 | name_variant:fuzzy |
| B | Kevin Mogan | Kevin Morgan | judge | nj-sacb | 1 / 7 | 0 / 0 | name_variant:fuzzy |
| B | Kevin Moran | Kevin Morgan | judge | nj-sacb | 1 / 7 | 0 / 0 | name_variant:fuzzy |
| B | Lynne Carte | Lynne Carter | judge | nj-sacb | 1 / 17 | 0 / 3 | name_variant:fuzzy |

## Category C: ambiguous (human review; surname alone never merges) (5)

| class | candidate A | candidate B | roles | commissions | assignments A / B | scorecards A / B | reason / relation |
|---|---|---|---|---|---|---|---|
| C | Cheatham | Tim Cheatham | judge | nsac | 1 / 22 | 1 / 17 | surname_only |
| C | Cheek | Eric Cheek | judge | nsac | 2 / 21 | 2 / 19 | surname_only |
| C | Migliore | Chris Migliore | judge | nsac | 1 / 13 | 1 / 11 | surname_only |
| C | Sutherland | David Sutherland | judge | nsac | 2 / 19 | 1 / 17 | surname_only |
| C | Trella | Don Trella | judge | nsac | 1 / 1 | 1 / 1 | surname_only |

### Cheatham / Tim Cheatham (surname_only)

- 2026-04-25 bout 04601489-f06a-4e4a-bf00-b93beb88d44b judge slot 1, scorecards 1: nv-results:2026:04-25-26_Boxing_REDACTED: "Cheatham" (nsac-nevada@1.0.0) -> "Cheatham" (nsac-nevada@1.0.2, simulated); header lists no full name with this surname

### Cheek / Eric Cheek (surname_only)

- 2026-01-24 bout bd27759a-9423-4b63-aa1c-1b1e12059688 judge slot 1, scorecards 1: nv-results:2026:01-24-26_Boxing_REDACTED: "Cheek" (nsac-nevada@1.0.0) -> "Cheek" (nsac-nevada@1.0.2, simulated); header lists no full name with this surname
- 2026-02-21 bout edf0471d-55e6-46ff-9f6b-08ff47ca051e judge slot 1, scorecards 1: nv-results:2026:02-21-26_Boxing_REDACTED: "Cheek" (nsac-nevada@1.0.0) -> "Cheek" (nsac-nevada@1.0.2, simulated); header lists no full name with this surname

### Migliore / Chris Migliore (surname_only)

- 2026-02-01 bout b24e4a63-ae5e-4b35-a3dc-d15c22de31bc judge slot 3, scorecards 1: nv-results:2026:02-01-26_Boxing_REDACTED: "Migliore" (nsac-nevada@1.0.0) -> "Chris Migliore" (nsac-nevada@1.0.2, simulated); header lists Chris Migliore

### Sutherland / David Sutherland (surname_only)

- 2026-02-01 bout 7c1cabf3-9774-4829-900e-2d7e869685f2 judge slot 3, scorecards 0: nv-results:2026:02-01-26_Boxing_REDACTED: "Sutherland" (nsac-nevada@1.0.0) -> "Sutherland" (nsac-nevada@1.0.2, simulated); header lists no full name with this surname
- 2026-02-01 bout 9647614c-936e-479c-894b-0de0a395bd72 judge slot 3, scorecards 1: nv-results:2026:02-01-26_Boxing_REDACTED: "Sutherland" (nsac-nevada@1.0.0) -> "Sutherland" (nsac-nevada@1.0.2, simulated); header lists no full name with this surname

### Trella / Don Trella (surname_only)

- 2026-08-01 bout eaf9bd25-57e7-4034-9e8d-ddd53af1cc53 judge slot 3, scorecards 1: nv-results:2026:08-01-26_Boxing_REDACTED: "Trella" (nsac-nevada@1.0.0) -> "Trella" (nsac-nevada@1.0.2, simulated); header lists no full name with this surname

## Category D: distinct (untouched) (7)

| class | candidate A | candidate B | roles | commissions | assignments A / B | scorecards A / B | reason / relation |
|---|---|---|---|---|---|---|---|
| D | Alvaro Rodriguez | Eliseo Rodriguez | judge | fl-athletic-commission | 29 / 31 | 0 / 0 | different_officials_sharing_a_surname |
| D | Alvaro Rodriguez | Perla Rodriguez | judge | fl-athletic-commission | 29 / 2 | 0 / 0 | different_officials_sharing_a_surname |
| D | Alvaro Rodriguez | Vicente Rodriguez | judge | fl-athletic-commission | 29 / 45 | 0 / 0 | different_officials_sharing_a_surname |
| D | David Young | Roark Young | judge | fl-athletic-commission | 11 / 4 | 0 / 0 | different_officials_sharing_a_surname |
| D | Eliseo Rodriguez | Perla Rodriguez | judge | fl-athletic-commission | 31 / 2 | 0 / 0 | different_officials_sharing_a_surname |
| D | Eliseo Rodriguez | Vicente Rodriguez | judge | fl-athletic-commission | 31 / 45 | 0 / 0 | different_officials_sharing_a_surname |
| D | Perla Rodriguez | Vicente Rodriguez | judge | fl-athletic-commission | 2 / 45 | 0 / 0 | different_officials_sharing_a_surname |

## Pending official review queue (28)

| raw name | commission | queue reason | candidates | classification | note |
|---|---|---|---|---|---|
| Steven Weisfeld | nsac | insufficient_evidence | & Steve Weisfeld | B | name_variant:fuzzy |
| Chris Migliore & Ricardo Ocasio | nsac | insufficient_evidence | Chris Migliore | parser_artifact_combined_names | two names read as one (the corrected parser splits them); the queue item can be dismissed by a reviewer |
| Max DeLuca | nsac | insufficient_evidence | Max De Luca | B | name_variant:joined |
| Patrica Morse Jarman | nsac | insufficient_evidence | Patricia Morse Jarman | B | name_variant:transliteration |
| Max Deluca | nsac | insufficient_evidence | Max De Luca | B | name_variant:joined |
| Ged WBO & WBA O'Connor | fl-athletic-commission | insufficient_evidence | Ged O'Connor | parser_artifact_title_text | title text read into the official name (Florida layout); needs a Florida parser fix, not a merge |
| Braddan WBO & WBA Jackson | fl-athletic-commission | insufficient_evidence | Braddan Jackson | parser_artifact_title_text | title text read into the official name (Florida layout); needs a Florida parser fix, not a merge |
| David Heavyweight DeJonge | fl-athletic-commission | insufficient_evidence | David DeJonge | parser_artifact_title_text | title text read into the official name (Florida layout); needs a Florida parser fix, not a merge |
| Alicia Collins | fl-athletic-commission | insufficient_evidence | Alicia Collins WBA Continental USA | B | name_variant:containment |
| Christopher Young IBF & WBO World Middle Weight | fl-athletic-commission | insufficient_evidence | Christopher Young | parser_artifact_title_text | title text read into the official name (Florida layout); needs a Florida parser fix, not a merge |
| Lisa Giampa | fl-athletic-commission | insufficient_evidence | Lisa Giampa | B | name_variant:exact |
| Richard Green, Jr. | fl-athletic-commission | insufficient_evidence | Richard Green | B | name_variant:containment |
| Richard Green, Sr. | fl-athletic-commission | insufficient_evidence | Richard Green | B | name_variant:containment |
| Manuel Marquez, Jr. | fl-athletic-commission | insufficient_evidence | Manuel Marquez | B | name_variant:containment |
| Mario Perez, Jr. | fl-athletic-commission | insufficient_evidence | Mario Perez | B | name_variant:containment |
| Michael DeJesus | fl-athletic-commission | insufficient_evidence | Michael De Jesus | B | name_variant:joined |
| Luis Pabon Rivas | fl-athletic-commission | insufficient_evidence | Luis Pabon | B | name_variant:containment |
| Efrain WBC Middleweight Lebron | fl-athletic-commission | insufficient_evidence | Efrain Lebron | parser_artifact_title_text | title text read into the official name (Florida layout); needs a Florida parser fix, not a merge |
| Jacob Rust, Sr. | fl-athletic-commission | insufficient_evidence | Jacob Rust | B | name_variant:containment |
| Luis Pabon Rivas WBA Continental Americas Lightweight | fl-athletic-commission | insufficient_evidence | Luis Pabon | parser_artifact_title_text | title text read into the official name (Florida layout); needs a Florida parser fix, not a merge |
| Steven Weisfeld | nj-sacb | insufficient_evidence | & Steve Weisfeld | B | name_variant:fuzzy |
| Harvey Dock | nj-sacb | insufficient_evidence | Harvey Dock | B | name_variant:exact |
| Robin Taylor | nj-sacb | insufficient_evidence | Robin Taylor | B | name_variant:exact |
| Glenn Feldman | nj-sacb | insufficient_evidence | Glenn Feldman | B | name_variant:exact |
| David Feilds | nj-sacb | insufficient_evidence | David Fields | B | name_variant:transliteration |
| Mark Consention | nj-sacb | insufficient_evidence | Mark Consentino | B | name_variant:transliteration |
| Steve Weisfeld | nj-sacb | insufficient_evidence | & Steve Weisfeld | B | name_variant:exact |
| David Franiciosi | nj-sacb | insufficient_evidence | David Franciosi | B | name_variant:transliteration |

## Parser artifacts still in the newest parse of each document

Promoter fragments: 0; official names: 3

- fl-results:08-08-2026-MVP_Boxing_Promotion-Results_without_med (florida-athletic-commission@1.0.0): "Christopher Young IBF & WBO World Middle Weight"
- fl-results:08-29-2026-Boxlab_Promotions_Results_without_med (florida-athletic-commission@1.0.0): "Ged WBO & WBA O'Connor"
- fl-results:08-29-2026-Boxlab_Promotions_Results_without_med (florida-athletic-commission@1.0.0): "Braddan WBO & WBA Jackson"

## Simulated corrected parse vs stored parse

### nj-results:2026-0115_Show-Results-Pro-Bxg-Patriots-Theater-at-War-Memorial-Trenton-CB-Prom

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nj-results:2026-0307_Official-Show-Result-Pro-Bxg-Tropicana-Hotel-Casino-AC-Boxing-Insider

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nj-results:2026-0410_Show-Results-Pro-Boxing-4-10-26-Prudential-Center-Newark-Rising-Star-ProBox-TV

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nj-results:2026-0411_Show-Results-Pro-Boxing-4-11-26-Boardwalk-Hall-AC-Sampson-Paco-ProBoxTV

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nj-results:2026-0606_Show_Results_Pro_Boxing-Prudential_Center_Newark_RDR

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nj-results:2026-0613_Official-Show-Results-Pro-Boxing-Tropicana-Hotel-Casino-AC-Boxing-Insider

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nj-results:2026-0904_Official_Show_Results_Pro_Boxing-Prudential_Center_Newark_Matchroom

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nj-results:Official-Show-Results-Pro-Boxing-02-21-26-Showboat-Hotel-AC-RDR

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nj-results:Show-Results-02-07-26-Hard-Rock-Hotel-Casino-AC-RB

nj-sacb@1.1.0 -> nj-sacb@1.1.1. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:01-23-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. promoters [["TKO Productions LLC d","b","a Zuffa Boxing"]] -> [["TKO Productions LLC d/b/a Zuffa Boxing"]]. Bouts missing from simulation: 0; new: 0.

| bout | role | slot | stored name | corrected name | current official | ingest action |
|---|---|---|---|---|---|---|
| 2026-01-23/ufc-apex/robert-owen-meriwether-iii/cesar-eric-correa | judge | 2 | & Cory Santos | Cory Santos | & Cory Santos | keep: same_name_after_normalization |
| 2026-01-23/ufc-apex/robert-owen-meriwether-iii/cesar-eric-correa | judge | 3 | & Steve Weisfeld | Steve Weisfeld | & Steve Weisfeld | keep: same_name_after_normalization |

### nv-results:2026:01-24-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:02-01-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. promoters [["TKO Productions LLC d","b","a Zuffa Boxing"]] -> [["TKO Productions LLC d/b/a Zuffa Boxing"]]. Bouts missing from simulation: 0; new: 0.

| bout | role | slot | stored name | corrected name | current official | ingest action |
|---|---|---|---|---|---|---|
| 2026-02-01/meta-apex/serhii-bohachuk/radzhab-butaev | judge | 3 | Migliore | Chris Migliore | Migliore | hold: reparse_names_a_different_official_in_held_slot |
| 2026-02-01/meta-apex/oscar-alan-perez/justin-kawika-viloria | judge | 2 | Chris Migliore & Ricardo Ocasio | Ricardo Ocasio |  | resolve: no active official in this slot: normal resolver |

### nv-results:2026:02-15-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. promoters [["TKO Productions LLC d","b","a Zuffa Boxing"]] -> [["TKO Productions LLC d/b/a Zuffa Boxing"]]. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:02-21-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:03-08-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. promoters [["TKO Productions LLC d","b","a Zuffa Boxing"]] -> [["TKO Productions LLC d/b/a Zuffa Boxing"]]. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:03-20-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:03-28-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:04-05-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:04-11-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:04-25-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:05-02-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:05-10-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. promoters [["TKO Productions LLC d","b","a Zuffa Boxing"]] -> [["TKO Productions LLC d/b/a Zuffa Boxing"]]. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:05-23-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

| bout | role | slot | stored name | corrected name | current official | ingest action |
|---|---|---|---|---|---|---|
| 2026-05-23/meta-apex/anthony-proctor/ethan-stern | judge | 3 | & Cory Santos | Cory Santos | & Cory Santos | keep: same_name_after_normalization |

### nv-results:2026:06-28-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. promoters [["TKO Productions LLC d","b","a Zuffa Boxing"]] -> [["TKO Productions LLC d/b/a Zuffa Boxing"]]. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:08-01-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

### nv-results:2026:08-22-26_Boxing_REDACTED

nsac-nevada@1.0.0 -> nsac-nevada@1.0.2. Bouts missing from simulation: 0; new: 0.

