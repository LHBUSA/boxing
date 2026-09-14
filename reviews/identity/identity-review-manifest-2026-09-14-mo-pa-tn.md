# Identity review manifest (2026-09-14T15:44:01.539Z)

boxing-identity-review-manifest@1.0.0 over boxing-identity-review-workbench@1.1.0. Advice for a named human reviewer. Nothing here is a decision; classes rank evidence, they never approve. Decisions are recorded only through identity-review.ps1 -Apply with -Reviewer.

```
{
 "identities": 452,
 "held_appearances": 779,
 "decisions_required": 770,
 "grouped_identities": 9,
 "classes": {
  "B": 44,
  "D": 361,
  "A": 42,
  "C": 5
 },
 "bouts_unlockable_by_single_identity": 345,
 "by_source": {
  "tn_athletic_commission": {
   "identities": 361,
   "held_appearances": 676,
   "decisions_required": 676,
   "groups": 0,
   "classes": {
    "A": 22,
    "B": 31,
    "C": 4,
    "D": 304
   },
   "bouts_unlockable_now": 268
  },
  "pa_state_athletic_commission": {
   "identities": 78,
   "held_appearances": 88,
   "decisions_required": 80,
   "groups": 8,
   "classes": {
    "A": 20,
    "B": 7,
    "C": 0,
    "D": 51
   },
   "bouts_unlockable_now": 66
  },
  "mo_office_of_athletics": {
   "identities": 13,
   "held_appearances": 15,
   "decisions_required": 14,
   "groups": 1,
   "classes": {
    "A": 0,
    "B": 6,
    "C": 1,
    "D": 6
   },
   "bouts_unlockable_now": 11
  }
 }
}
```

## Top 25 by bouts one identity review unlocks

| # | Class | Printed name | Commission | Held appearances | Bouts unlocked alone | With other held identities | Proposed canonical boxer | Prior verified bouts | Resolver reason |
|---:|:---:|---|---|---:|---:|---:|---|---:|---|
| 1 | B | Anthony Woods | TN | 8 | 5 | 3 | Anthony Woods (source_native) | 1 | insufficient_graph_evidence:jurisdiction (x6); insufficient_graph_evidence:jurisdiction+weight (x2) |
| 2 | B | Tyler Tomlin | TN | 6 | 5 | 1 | Tyler Tomlin (source_native) | 1 | insufficient_graph_evidence:jurisdiction+weight (x3); insufficient_graph_evidence:jurisdiction (x3) |
| 3 | B | Mike Cook | TN | 5 | 5 | 0 | Mike Cook (source_native) | 1 | insufficient_graph_evidence:jurisdiction (x3); insufficient_graph_evidence:jurisdiction+weight (x2) |
| 4 | B | Ermes Orta | TN | 11 | 4 | 7 | Ermes Orta (source_native) | 1 | insufficient_graph_evidence:jurisdiction (x7); insufficient_graph_evidence:jurisdiction+weight (x4) |
| 5 | B | Eric Draper | TN | 7 | 4 | 3 | Eric Draper (source_native) | 1 | insufficient_graph_evidence:jurisdiction (x5); insufficient_graph_evidence:jurisdiction+weight (x2) |
| 6 | B | Erick Arellano | TN | 7 | 4 | 3 | Erick Arellano (source_native) | 1 | insufficient_graph_evidence:jurisdiction+weight (x5); insufficient_graph_evidence:jurisdiction (x2) |
| 7 | B | Kevin Torian | TN | 4 | 4 | 0 | Kevin Torian (source_native) | 1 | insufficient_graph_evidence:jurisdiction+venue+weight; insufficient_graph_evidence:jurisdiction+weight; insufficient_graph_evidence:jurisdiction+venue; insufficient_graph_evidence:jurisdiction |
| 8 | D | Dedrick Bell | TN | 10 | 4 | 6 | Dedrick Bell (source_native) | 0 | insufficient_graph_evidence:none (x10) |
| 9 | B | Miguel Gomez | TN | 4 | 3 | 1 | Miguel Gomez (source_native) | 1 | insufficient_graph_evidence:jurisdiction+weight (x4) |
| 10 | B | Tyrrell Evans | TN | 3 | 3 | 0 | Tyrrell Evans (source_native) | 1 | insufficient_graph_evidence:jurisdiction+weight (x2); insufficient_graph_evidence:jurisdiction |
| 11 | D | Roger Hilley | TN | 12 | 3 | 9 | Roger Hilley (source_native) | 2 | insufficient_graph_evidence:none (x6); insufficient_graph_evidence:weight (x6) |
| 12 | D | Doctress Robinson | TN | 6 | 3 | 3 | Doctress Robinson (source_native) | 2 | insufficient_graph_evidence:none (x6) |
| 13 | D | Curtis Harper | TN | 5 | 3 | 2 | Curtis Harper (source_native) | 1 | insufficient_graph_evidence:none (x4); insufficient_graph_evidence:weight |
| 14 | D | Weusi Johnson | TN | 5 | 3 | 2 | Weusi Johnson (source_native) | 0 | insufficient_graph_evidence:none (x5) |
| 15 | D | Devin Parrish | TN | 3 | 3 | 0 | Devin Parrish (source_native) | 1 | insufficient_graph_evidence:weight (x2); insufficient_graph_evidence:none |
| 16 | D | Keith Rydell Mayes Jr | TN | 3 | 3 | 0 | Keith Rydell Mayes (source_native) | 1 | contradiction:suffix_missing (x3) |
| 17 | A | Jonathan Rice | TN | 4 | 2 | 2 | Jonathan Rice (source_native) | 1 | insufficient_graph_evidence:jurisdiction+venue+weight (x2); insufficient_graph_evidence:jurisdiction+weight (x2) |
| 18 | A | Jibril Noble | PA | 2 | 2 | 0 | Jibril Noble (source_native) | 1 | insufficient_graph_evidence:jurisdiction+weight; insufficient_graph_evidence:jurisdiction+venue+weight |
| 19 | B | Jay Ellis | TN | 4 | 2 | 2 | Jay Ellis (source_native) | 1 | insufficient_graph_evidence:jurisdiction+weight (x2); insufficient_graph_evidence:jurisdiction (x2) |
| 20 | B | Jashawn Hunter | TN | 3 | 2 | 1 | Jashawn Hunter (source_native) | 1 | insufficient_graph_evidence:jurisdiction (x2); insufficient_graph_evidence:jurisdiction+venue+weight |
| 21 | B | Maidel Sando | TN | 3 | 2 | 1 | Maidel Sando (source_native) | 1 | insufficient_graph_evidence:jurisdiction (x2); insufficient_graph_evidence:jurisdiction+venue+weight |
| 22 | B | Ryan Shaw | TN | 3 | 2 | 1 | Ryan Shaw (source_native) | 1 | insufficient_graph_evidence:jurisdiction (x2); insufficient_graph_evidence:jurisdiction+weight |
| 23 | B | Victor Hernandez | TN | 3 | 2 | 1 | Victor Hernandez (source_native) | 1 | insufficient_graph_evidence:jurisdiction (x2); insufficient_graph_evidence:jurisdiction+venue+weight |
| 24 | B | Oliver McCall | TN | 2 | 2 | 0 | Oliver McCall (source_native) | 1 | insufficient_graph_evidence:jurisdiction+weight; insufficient_graph_evidence:jurisdiction |
| 25 | B | Tivan Young | TN | 2 | 2 | 0 | Tivan Young (source_native) | 1 | insufficient_graph_evidence:jurisdiction+weight; insufficient_graph_evidence:jurisdiction |

## Class A (42)

### #17 Jonathan Rice (TN)

- Proposed canonical boxer: Jonathan Rice `f38211ae-61d9-409a-95db-ae641be2b2c9`; aliases: Jonathan Rice (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Jonathan Webb [-]; Jonathan Bales [-]; Johnathan Smith [-]; Jonathan A. Sosa [-]; Bernard Jonathan Joseph [-]
- Unlocks: 2 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 4
- Place evidence: none printed; official weights: 199.4, 201.6, 199.4, 201.6
- Evidence FOR: name_exact (x4), same_commission:tn-athletic-commission (x4), weight_199.4_vs_198.2_on_2025-04-06 (x2), same_venue (x2), weight_201.6_vs_198.2_on_2025-04-06 (x2)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x4)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 199.4 | Kalvin Henderson | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 201.6 | Adrian Taylor | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 199.4 | Kalvin Henderson | needs:Kalvin Henderson | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 201.6 | Adrian Taylor | needs:Adrian Taylor | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #18 Jibril Noble (PA)

- Proposed canonical boxer: Jibril Noble `9c826902-e4f7-4e3d-b09d-d5627f9aab40`; aliases: Jibril Noble (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 136, 133.4
- Evidence FOR: name_exact (x2), hometown_same_region_only(not_decisive) (x2), same_commission:pa-state-athletic-commission (x2), weight_136_vs_135_on_2026-08-22, weight_133.4_vs_135_on_2026-08-22, same_venue
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-07 Dominique Walton at Sixth Man Center (corner a) | [pa-results:2026:03-07-26 box walton - sixth man arena - phila., pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20walton%20-%20sixth%20man%20arena%20-%20phila.%2C%20pa%20-%20results.pdf) | 136 | Juan Centeno | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |
| 2026-06-13 Dominique Walton at First District Plaza (corner b) | [pa-results:2026:06-13-26 box walton - first district plaza - phila., pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-13-26%20box%20walton%20-%20first%20district%20plaza%20-%20phila.,%20pa%20-%20results.pdf) | 133.4 | Ivan Alvarado | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | 003 |

### #59 Aaron Cypress (TN)

- Proposed canonical boxer: Aaron Cypress `01cb1e49-30e5-449a-826a-2159e97edf79`; aliases: Aaron Cypress (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Aaron Lopez [-]; Aaron Aponte [-]
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 186, 187.2
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_186_vs_185.6_on_2024-05-07, weight_187.2_vs_185.6_on_2024-05-07
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-12-05 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/Country-Box_12-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Country-Box_12-5.pdf) | 186 | Shabios Lynch | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2024-10-01 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/Country-Box_10-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Country-Box_10-1.pdf) | 187.2 | Raquan Ashby | needs:Raquan Ashby | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #60 Cahir Gormley (PA)

- Proposed canonical boxer: Cahir Gormley `2c73bebd-3d47-4fa4-97eb-d21a43057925`; aliases: Cahir Gormley (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: PA; official weights: 153.4, 159
- Evidence FOR: name_exact (x2), hometown_same_region_only(not_decisive) (x2), same_commission:pa-state-athletic-commission (x2), weight_153.4_vs_153.8_on_2026-05-29, weight_159_vs_153.8_on_2026-05-29
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-03 James Bartley at The Archer (corner a) | [pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf) | 153.4 | Dominicque McBride | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |
| 2026-03-07 Dominique Walton at Sixth Man Center (corner a) | [pa-results:2026:03-07-26 box walton - sixth man arena - phila., pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20walton%20-%20sixth%20man%20arena%20-%20phila.%2C%20pa%20-%20results.pdf) | 159 | Elias Ajuwa | needs:Elias Ajuwa | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #61 Cleveland Billingsly (TN)

- Proposed canonical boxer: Cleveland Billingsly `701149e3-e374-43ab-a91d-5b9854c93559`; aliases: Cleveland Billingsly (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Cleveland Mclean [-]
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 250.2, 242.8
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_250.2_vs_237.8_on_2020-11-07, weight_242.8_vs_237.8_on_2020-11-07
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-06-12 Matt Young at Camp Jordan Arena (corner a) | [tn-results:2021/TRI-STAR-OFFICIAL-RESULTS_6-12-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR-OFFICIAL-RESULTS_6-12-21.pdf) | 250.2 | William Patch | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2021-02-12 Matt Young at The Notes Lounge (corner b) | [tn-results:2021/TRI-STAR-FRIDAY-NIGHT-FIGHTS-BORO_OFFICIAL-RESULTS_2-12-21-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR-FRIDAY-NIGHT-FIGHTS-BORO_OFFICIAL-RESULTS_2-12-21-1.pdf) | 242.8 | Deangelo Leachman | needs:Deangelo Leachman | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #62 Elias Ajuwa (PA)

- Proposed canonical boxer: Elias Ajuwa `4cb45149-32ec-47fb-84a1-315ffb639d3e`; aliases: Elias Ajuwa (name, verified); verified prior bouts: 1; hometowns: DE; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 2
- Place evidence: DE; official weights: 171.6, 160.4
- Evidence FOR: name_exact (x2), hometown_same_region_only(not_decisive) (x2), same_commission:pa-state-athletic-commission (x2), weight_171.6_vs_163.4_on_2026-07-11, same_venue, weight_160.4_vs_163.4_on_2026-07-11
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-28 Greg Pritchett at Harrah's Casino (corner b) | [pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf) | 171.6 | Thomas Santiago | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | 003 |
| 2026-03-07 Dominique Walton at Sixth Man Center (corner b) | [pa-results:2026:03-07-26 box walton - sixth man arena - phila., pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20walton%20-%20sixth%20man%20arena%20-%20phila.%2C%20pa%20-%20results.pdf) | 160.4 | Cahir Gormley | needs:Cahir Gormley | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #63 Keith Foreman (TN)

- Proposed canonical boxer: Keith Foreman `444aa9c0-44a4-477f-96b8-a3ab5696ebdb`; aliases: Keith Foreman (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Keith [-]; Keith Barr [-]; Keith Fitzgerald Thurman [-]; Keith Colon [-]; Keasen Freeman [-]; Keith Debow [-]
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 148.6, 151.6
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_148.6_vs_147.2_on_2024-08-06, weight_151.6_vs_147.2_on_2024-08-06
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-03-04 Jimmy Adams at The Troubadour (corner b) | [tn-results:2025/CountryBox_3-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_3-4.pdf) | 148.6 | Jordan Ginnis | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-08-02 Christine Salters at Fairgrounds Nashville (corner b) | [tn-results:2025/Christy-Martin-Promotions_8-2-BOXING](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Christy-Martin-Promotions_8-2-BOXING.pdf) | 151.6 | Hadrian Phillips | needs:Hadrian Phillips | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #64 Andrew Rodgers (TN)

- Proposed canonical boxer: Andrew Rodgers `9a66457a-cb5d-4455-93a7-0b08c8715e18`; aliases: Andrew Rodgers (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Andrew Lawson [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 136
- Evidence FOR: name_exact, weight_136_vs_135.8_on_2024-07-02, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-12-03 Jimmy Adams at Texas Troubadour (corner b) | [tn-results:2024/CountryBox_12-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_12-3.pdf) | 136 | Nikolay Shvab | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #65 David Hardy (PA)

- Proposed canonical boxer: David Hardy `57fac663-247a-48ea-996f-39c0475796d3`; aliases: David Hardy (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: David Fecteau [-]; David Calabro [-]; David Malul [-]; David Garcia [-]; David Ratliff [-]; Heather Hardy [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 129.7
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_129.7_vs_130.8_on_2026-07-11, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-02-06 Jesus Rivera at Live Casino (corner a) | [pa-results:2026:02-06-26 box rivera - live casino - phila pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-06-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20%20-%20%20results.pdf) | 129.7 | Darnell Jackson | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #66 Deirdre Rhodes (TN)

- Proposed canonical boxer: Deirdre Rhodes `d44a01b1-0637-49ff-b2c3-42aed87f5f35`; aliases: Deirdre Rhodes (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Jackson Rhodes [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 128.6
- Evidence FOR: name_exact, weight_128.6_vs_134.2_on_2025-04-06, same_commission:tn-athletic-commission, same_venue
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 128.6 | Monserrat Carmona | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |

### #67 Djibril Diakite (TN)

- Proposed canonical boxer: Djibril Diakite `454bfbf8-35ac-4901-be38-cf225e8f9c9d`; aliases: Djibril Diakite (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 169
- Evidence FOR: name_exact, weight_169_vs_166.4_on_2025-02-04, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-17 Christine Salters at Fat Bottom Brewer y (corner a) | [tn-results:2025/Martin-Promo-Boxing_5-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Martin-Promo-Boxing_5-17.pdf) | 169 | Manny Woods | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #68 Dreon Meriweather (TN)

- Proposed canonical boxer: Dreon Meriweather `7c93663c-ef06-42a2-ab1b-29adf2c7fed7`; aliases: Dreon Meriweather (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Nesaw Merriweather [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 130.2
- Evidence FOR: name_exact, weight_130.2_vs_131.6_on_2023-01-13, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-07-01 Matt Young at Ole Smoky Distillery (corner a) | [tn-results:2022/Tri-Star-Boxing_7-1-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing_7-1-22.pdf) | 130.2 | Jahterris Lewis | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #69 Dylan Price (PA)

- Proposed canonical boxer: Dylan Price `e50a5f7a-95d5-4a73-bd62-50f88e156f30`; aliases: Dylan Price (name, verified); verified prior bouts: 1; hometowns: NJ; commissions: pa-state-athletic-commission
- Competing candidates: Dylan Colon [-]; Devin Price [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: NJ; official weights: 122.6
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_122.6_vs_123.6_on_2026-02-06, same_commission:pa-state-athletic-commission, same_venue
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-08-28 Jesus Rivera at Live Casino (corner a) | [pa-results:2026:08-28-26 box rivera - live casino - 900 packer ave - phila. pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-28-26%20box%20rivera%20-%20live%20casino%20-%20900%20packer%20ave%20-%20phila.%20pa%20-%20results.pdf) | 122.6 | Alberto Guevara | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | 003 |

### #70 Giovanni Payne (PA)

- Proposed canonical boxer: Giovanni Payne `2678904d-b124-4c0b-8f69-7205e4844343`; aliases: Giovanni Payne (name, verified); verified prior bouts: 1; hometowns: VA; commissions: pa-state-athletic-commission
- Competing candidates: Giovanni Figueroa [-]; Giovanni Louis [-]; Giovannie Gonzalez [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: VA; official weights: 208
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_208_vs_218.2_on_2026-08-29, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-05-29 James Bartley at Archer - Allentown Pa (corner b) | [pa-results:2026:05-29-26 box bartley - the archer - allentown pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-29-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20results.pdf) | 208 | Rishon Sims | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #71 Greg Hackett (PA)

- Proposed canonical boxer: Greg Hackett `9ff57157-c6c8-4d0a-b703-099341674137`; aliases: Greg Hackett (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: Jalil Major Hackett [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 210.8
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_210.8_vs_204_on_2026-07-25, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-28 Greg Pritchett at Harrah's Casino (corner b) | [pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf) | 210.8 | Chris Thomas | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #72 Jalique Holden (PA)

- Proposed canonical boxer: Jalique Holden `0710f6aa-6859-47d9-960f-9c5f848c3576`; aliases: Jalique Holden (name, verified); verified prior bouts: 1; hometowns: DE; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: DE; official weights: 132.6
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_132.6_vs_130_on_2026-07-11, same_commission:pa-state-athletic-commission, same_venue
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-28 Greg Pritchett at Harrah's Casino (corner a) | [pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf) | 132.6 | Nathan Threatt | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | 003 |

### #73 John Brewer (PA)

- Proposed canonical boxer: John Brewer `5f8d9bbd-e082-4a47-b778-3b8fbbde429e`; aliases: John Brewer (name, verified); verified prior bouts: 1; hometowns: MO; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: MO; official weights: 159.8
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_159.8_vs_167.2_on_2026-07-25, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-11 Brian Costello at 2300 Arena (corner b) | [pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf) | 159.8 | Brendan O'Callaghan | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #74 John Graziano (PA)

- Proposed canonical boxer: John Graziano `f9893ad2-a1ca-4ceb-a31e-f45e1bad6934`; aliases: John Graziano (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: John Garcia [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 137.9
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_137.9_vs_130.5_on_2026-07-18, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-11 William Hutchinson at Montour Sports Complex (corner a) | [pa-results:2026:04-11-26 box hutchinson - montour sportsplex - coraopolis pa](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20hutchinson%20-%20montour%20sportsplex%20-%20coraopolis%20pa.pdf) | 137.9 | Chaka Worthy | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #75 Justin Litz (PA)

- Proposed canonical boxer: Justin Litz `9a4c4f82-fb1b-43e7-8d57-2d761e8e9391`; aliases: Justin Litz (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: Justin Biggs [-]; Justin Howard [-]; Justin Figueroa [-]; Justin Penaranda [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 247
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_247_vs_238.4_on_2026-07-25, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-11 Brian Costello at 2300 Arena (corner b) | [pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf) | 247 | Sanjay Davis | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #76 Kashif El-Amin (PA)

- Proposed canonical boxer: Kashif El-Amin `5b84e322-c90a-48eb-a7de-bbd5113b7284`; aliases: Kashif El-Amin (name, verified); verified prior bouts: 1; hometowns: NC; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: NC; official weights: 145.4
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_145.4_vs_146_on_2026-07-11, same_commission:pa-state-athletic-commission, same_venue
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-28 Greg Pritchett at Harrah's Casino (corner b) | [pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf) | 145.4 | Tyreem Haywood | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | 003 |

### #77 Kurt Scoby (PA)

- Proposed canonical boxer: Kurt Scoby `6aeca4df-9ad0-45c9-bbdb-1540b9c33295`; aliases: Kurt Scoby (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 146
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_146_vs_147.2_on_2026-03-07, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-08-07 Alexis Barbosa at 2300 Arena (corner b) | [pa-results:2026:08-07-26 box barbosa - 2300 arena - phila. pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-07-26%20box%20barbosa%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf) | 146 | Alfredo Blanco | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #78 Manuel Hernandez Alonso (PA)

- Proposed canonical boxer: Manuel Hernandez Alonso `16fca70d-0ea1-42b3-8096-9943347e426d`; aliases: Manuel Hernandez Alonso (name, verified); verified prior bouts: 1; hometowns: Coohula; commissions: pa-state-athletic-commission
- Competing candidates: Hernandez Trejo, [-]; Victor Hernandez [-]; Luis Hernandez [-]; Antonio L. Hernandez [-]; Miguel Angel Hernandez [-]; Alondra Yamile-Hernandez Mendoza [-]; Wilver Hernandez [-]; Pedro Hernandez [-]; Angelo Hernandez [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: Coohula; official weights: 118.4
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_118.4_vs_114.3_on_2026-02-06, same_commission:pa-state-athletic-commission, same_venue
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-08-28 Jesus Rivera at Live Casino (corner b) | [pa-results:2026:08-28-26 box rivera - live casino - 900 packer ave - phila. pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-28-26%20box%20rivera%20-%20live%20casino%20-%20900%20packer%20ave%20-%20phila.%20pa%20-%20results.pdf) | 118.4 | Jayon Tinnin | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | 003 |

### #79 Phillip Burke (TN)

- Proposed canonical boxer: Phillip Burke `ed63f742-a471-4ba1-a64d-cea6475919b4`; aliases: Phillip Burke (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Phillip Penson [-]; Jaylan Phillips [-]; Mehki Phillips [-]; William Phillips [-]; Phillip Lars [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 142.2
- Evidence FOR: name_exact, weight_142.2_vs_142.2_on_2023-01-13, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-06-30 Matt Young at Ole Smoky Moonshine (corner b) | [tn-results:2023/TRI-STAR-BOXING_6-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TRI-STAR-BOXING_6-30.pdf) | 142.2 | Luis Quintero | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #80 Rafael Morel (TN)

- Proposed canonical boxer: Rafael Morel `d3017a52-7846-4e1f-ae93-c4a1f119a4ba`; aliases: Rafael Morel (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Raphael Monny [-]; Rafael Garcia [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 134
- Evidence FOR: name_exact, weight_134_vs_137.2_on_2025-10-25, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-12-20 Ramon Arellano at San Jose Fiesta (corner b) | [tn-results:2025/Arellano-BOXING_12-20](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Arellano-BOXING_12-20.pdf) | 134 | Alejandro B. Sanchez | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #81 Savannah Tini (TN)

- Proposed canonical boxer: Savannah Tini `af548ef5-679c-492a-8547-8f04bed5ca1a`; aliases: Savannah Tini (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 144.6
- Evidence FOR: name_exact, weight_144.6_vs_146.4_on_2025-04-01, same_commission:tn-athletic-commission, same_venue
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-06-03 Jim my Adams at The Troubadour (corner a) | [tn-results:2025/COUNRTBOX_6-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/COUNRTBOX_6-3.pdf) | 144.6 | Simone Da Silva | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |

### #82 Soslan Alborov (PA)

- Proposed canonical boxer: Soslan Alborov `25ade4fa-70e3-4376-b76e-ff69265fbcb5`; aliases: Soslan Alborov (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 157.8
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_157.8_vs_159_on_2026-04-11, same_commission:pa-state-athletic-commission, same_venue
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-01-17 Marshall Kauffman at 2300 Arena (corner b) | [pa-results:2026:01-17-26 - box - 2300 arena - phila. pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/01-17-26%20-%20box%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf) | 157.8 | Gabriel Colon | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | 003 |

### #83 Tariq Green (PA)

- Proposed canonical boxer: Tariq Green `e6651f28-31d0-4b05-9be3-2fb0dc7d5cd0`; aliases: Tariq Green (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: Tobias Green [-]; Jaylen Green [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 167.6
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_167.6_vs_162.2_on_2026-06-13, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-07 Dominique Walton at Sixth Man Center (corner a) | [pa-results:2026:03-07-26 box walton - sixth man arena - phila., pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20walton%20-%20sixth%20man%20arena%20-%20phila.%2C%20pa%20-%20results.pdf) | 167.6 | James Martin | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #84 Tayvien Alpough (TN)

- Proposed canonical boxer: Tayvien Alpough `a36abfbf-046b-4b66-be67-fa14a8db3cd4`; aliases: Tayvien Alpough (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 110.8
- Evidence FOR: name_exact, weight_110.8_vs_111.2_on_2024-07-02, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-09-03 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2024/CountryBox_9-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_9-3.pdf) | 110.8 | Riley Buck | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #261 Aidyn Crigger (TN)

- Proposed canonical boxer: Aidyn Crigger `00cb85bd-cb69-4334-aba7-88f18cbd5ddb`; aliases: Aidyn Crigger (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 158.8
- Evidence FOR: name_exact, weight_158.8_vs_159.8_on_2025-04-05, same_commission:tn-athletic-commission, same_venue
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-10-25 Sable Long at Holiday Inn (corner b) | [tn-results:2025/Strikefest-BOXING_10-25](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Strikefest-BOXING_10-25.pdf) | 158.8 | Leonardo Perez | needs:Leonardo Perez | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |

### #262 Anthony Stewart (TN)

- Proposed canonical boxer: Anthony Stewart `7e5451ec-56f5-47d2-a719-e5182008798a`; aliases: Anthony Stewart (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Anthony Alston Jr. [-]; Jalyn Anthony [-]; Anthony Muta [-]; Anthony Wilson [-]; Anthony Jones [-]; Anthony Johns [-]; Anthony Taylor [-]; Anthony Avila [-]; Anthony Woods [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 197.4
- Evidence FOR: name_exact, weight_197.4_vs_192.8_on_2023-05-06, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-12-10 Matt young at Beast Mode Sports Co (corner b) | [tn-results:2022/TRI-STAR-BOXING_12-10](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_12-10.pdf) | 197.4 | Deangelo Leachman | needs:Deangelo Leachman | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #263 Ariel Vasquez (TN)

- Proposed canonical boxer: Ariel Vasquez `8e91b95a-a3df-4836-becf-f5156fdf0e02`; aliases: Ariel Vasquez (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Yohan Vasquez [-]; Ariel Perez [-]; Angel Vazquez [-]; Austin Vasquez [-]; Vasquez Florenti, [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 147.8
- Evidence FOR: name_exact, weight_147.8_vs_147.4_on_2022-02-05, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-02-26 Matthew Young at Beast Mode Fitness (corner b) | [tn-results:2022/TRI-STAR-BOXING_OFFICIAL-RESULTS_2-26-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_OFFICIAL-RESULTS_2-26-22.pdf) | 147.8 | Dedrick Bell | needs:Dedrick Bell | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #264 Cali Box (PA)

- Proposed canonical boxer: Cali Box `eb12d7f7-6d3d-47ab-bccf-ef67871eb430`; aliases: Cali Box (name, verified); verified prior bouts: 1; hometowns: NJ; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: nj; official weights: 169
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_169_vs_169.2_on_2026-05-22, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-02-06 Jesus Rivera at Live Casino (corner a) | [pa-results:2026:02-06-26 box rivera - live casino - phila pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-06-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20%20-%20%20results.pdf) | 169 | Everlon Still | needs:Everlon Still | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #265 Courtney McCleave (TN)

- Proposed canonical boxer: Courtney McCleave `1e830545-28b8-4046-8e0f-9ffed8db6e93`; aliases: Courtney McCleave (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 178.8
- Evidence FOR: name_exact, weight_178.8_vs_181.8_on_2021-07-31, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-09-11 Sable Long at Holiday Inn Johnson C (corner b) | [tn-results:2021/STRIKE-FEST_OFFICIAL-RESULTS_9-11-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/STRIKE-FEST_OFFICIAL-RESULTS_9-11-21.pdf) | 178.8 | Robert Magee | needs:Robert Magee | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #266 Demonte Cherry (TN)

- Proposed canonical boxer: Demonte Cherry `80a4af81-cf85-4903-ba8a-4c5d9c329fba`; aliases: Demonte Cherry (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Ritchie Cherry [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 239.4
- Evidence FOR: name_exact, weight_239.4_vs_242.4_on_2024-12-17, same_commission:tn-athletic-commission, same_venue
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-02-04 Jimmy Adams at Texas Troubadour (corner b) | [tn-results:2025/CountryBox_2-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_2-4.pdf) | 239.4 | Conja Nathan | needs:Conja Nathan | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |

### #267 Evan Holyfield (TN)

- Proposed canonical boxer: Evan Holyfield `7a2a6f82-8d4f-4dfb-ac28-5b2b85fbf8b8`; aliases: Evan Holyfield (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 154.8
- Evidence FOR: name_exact, weight_154.8_vs_153.2_on_2025-07-01, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-08-02 Christine Salters at Fairgrounds Nashville (corner a) | [tn-results:2025/Christy-Martin-Promotions_8-2-BOXING](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Christy-Martin-Promotions_8-2-BOXING.pdf) | 154.8 | Jeremiah Robinson | needs:Jeremiah Robinson | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #268 Everlon Still (PA)

- Proposed canonical boxer: Everlon Still `188c6c69-7eb6-4b74-ab25-130d6e0d7097`; aliases: Everlon Still (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: PA; official weights: 171
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_171_vs_172.4_on_2026-05-22, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-02-06 Jesus Rivera at Live Casino (corner b) | [pa-results:2026:02-06-26 box rivera - live casino - phila pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-06-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20%20-%20%20results.pdf) | 171 | Cali Box | needs:Cali Box | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #269 Jaclyne McTamney (PA)

- Proposed canonical boxer: Jaclyne McTamney `988d0ade-1b1d-4bbf-a220-76edecd90dbd`; aliases: Jaclyne McTamney (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: PA; official weights: 127.8
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_127.8_vs_127.4_on_2026-07-25, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-03 James Bartley at The Archer (corner a) | [pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf) | 127.8 | Lauren Michaels | needs:Lauren Michaels | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #270 Julius Daniel (TN)

- Proposed canonical boxer: Julius Daniel `de8aabfd-3dbf-461d-abfe-62b672f4ffbe`; aliases: Julius Daniel (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Daniel Olea [-]; Daniel Lugo [-]; Daniel Blancas [-]; Daniel Bailey [-]; Julius Thomas [-]; Daniel Gonzalez [-]; Daniel Murray [-]; Daniel Bean [-]; Daniel Keepers [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 184.8
- Evidence FOR: name_exact, weight_184.8_vs_189_on_2025-10-07, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-03 Jimmy Adams at Plaza Mariachi (corner a) | [tn-results:2026/Jimmy-Adams-Boxing_3-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/Jimmy-Adams-Boxing_3-3.pdf) | 184.8 | Jaylen Green | needs:Jaylen Green | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #271 Keasen Freeman (TN)

- Proposed canonical boxer: Keasen Freeman `d6eb3df0-5d2d-4a9d-b683-302d28252e1b`; aliases: Keasen Freeman (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Keith Foreman [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 140.2
- Evidence FOR: name_exact, weight_140.2_vs_144.4_on_2023-04-29, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-12-05 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2023/Country-Box_12-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Country-Box_12-5.pdf) | 140.2 | Marklin Bailey | needs:Marklin Bailey | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #272 Nick Campbell (TN)

- Proposed canonical boxer: Nick Campbell `51836fd0-04ba-451b-82be-07f0f72147e4`; aliases: Nick Campbell (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Marsellus Campbell [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 157.8
- Evidence FOR: name_exact, weight_157.8_vs_158_on_2025-02-01, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-06-27 Sable Long at The Ramsey Hotel (corner b) | [tn-results:2025/Strikefest_6-27_Boxing](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Strikefest_6-27_Boxing.pdf) | 157.8 | Kemper Johnson | needs:Kemper Johnson | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #273 Rasuiod Hollie (PA)

- Proposed canonical boxer: Rasuiod Hollie `65f1611e-6839-4241-8a57-2f8aea87ba8f`; aliases: Rasuiod Hollie (name, verified); verified prior bouts: 1; hometowns: TX; commissions: pa-state-athletic-commission
- Competing candidates: Robert Hall Jr [-]; Roger Hilley [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: TX; official weights: 120.4
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_120.4_vs_120_on_2026-08-28, same_commission:pa-state-athletic-commission
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-08-07 Alexis Barbosa at 2300 Arena (corner a) | [pa-results:2026:08-07-26 box barbosa - 2300 arena - phila. pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-07-26%20box%20barbosa%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf) | 120.4 | Alexander Marrero | needs:Alexander Marrero | C insufficient_graph_evidence:jurisdiction+weight | A | 003 |

### #274 Veshawn Champion (TN)

- Proposed canonical boxer: Veshawn Champion `ed175c82-3a8b-4bd5-aa7c-d258b1249974`; aliases: Veshawn Champion (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 150
- Evidence FOR: name_exact, weight_150_vs_155.2_on_2024-01-20, same_commission:tn-athletic-commission
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-04-06 Lamont Ingram at Champ Event Center (corner a) | [tn-results:2024/Champions-Enterprise-Boxing_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Champions-Enterprise-Boxing_4-6.pdf) | 150 | Marlon Lewis | needs:Marlon Lewis | C insufficient_graph_evidence:jurisdiction+weight | A | - |


## Class B (44)

### #1 Anthony Woods (TN)

- Proposed canonical boxer: Anthony Woods `bf27f897-9db0-4a66-b669-40bfeb1191f4`; aliases: Anthony Woods (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Anthony Alston Jr. [-]; Jalyn Anthony [-]; Anthony Muta [-]; Anthony Wilson [-]; Anthony Jones [-]; Anthony Johns [-]; Anthony Taylor [-]; Antonio Devon Woods [-]; Anthony Reeves [-]; Anthony Avila [-]
- Unlocks: 5 bout(s) alone; 3 more only together with 3 other held identities; decisions required: 8
- Place evidence: none printed; official weights: 154, 152, 148.4, 157.4, 154.2, 147.2, 152, 152.6
- Evidence FOR: name_exact (x8), same_commission:tn-athletic-commission (x8), weight_154_vs_147.8_on_2020-11-07, weight_147.2_vs_147.8_on_2020-11-07
- Evidence AGAINST: danger:common_surname (x8), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x6) | B: support: weight, commission; caveats: common_surname (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-09-24 Brandi McCain at Agricenter Internation (corner b) | [tn-results:2021/One-One-Six-Boxing-OFFICIAL-RESULTS_9-24-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/One-One-Six-Boxing-OFFICIAL-RESULTS_9-24-21.pdf) | 154 | Langston Stevenson | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2022-05-21 Matt Young at Beast Mode Sports Co (corner b) | [tn-results:2022/TRI-STAR-BOXING-OFFICIAL-RESULTS_5-21-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING-OFFICIAL-RESULTS_5-21-22.pdf) | 152 | William Marcell Davis | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-07-23 Matt Young at Embassy Suites Murfre (corner b) | [tn-results:2022/TRI-STAR-BOXING_7-23-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_7-23-22.pdf) | 148.4 | Eridanni Leon | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2023-04-29 Brandi McCain at Memphis Music Room (corner a) | [tn-results:2023/One-One-Six-Boxing_4-29](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/One-One-Six-Boxing_4-29.pdf) | 157.4 | Greg Reynolds | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2023-08-12 Matt Young at Embassy Suites Nashvi (corner b) | [tn-results:2023/TriStar-Boxing_8-12](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TriStar-Boxing_8-12.pdf) | 154.2 | Decarlo Patton | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2020-01-16 Matt Young at Nashville Fairgrou (corner b) | [tn-results:2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020.pdf) | 147.2 | Lawrence Donald | needs:Lawrence Donald | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2024-07-25 Ramon Arellano at San Jose Fiesta (corner b) | [tn-results:2024/Arellano-Boxing_7-25](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Arellano-Boxing_7-25.pdf) | 152 | Macro Hall jr. | needs:Macro Hall jr. | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-03-04 Jimmy Adams at The Troubadour (corner b) | [tn-results:2025/CountryBox_3-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_3-4.pdf) | 152.6 | Ermes Orta | needs:Ermes Orta | C insufficient_graph_evidence:jurisdiction | D | - |

### #2 Tyler Tomlin (TN)

- Proposed canonical boxer: Tyler Tomlin `d1aad60e-bd1e-462a-8327-11d0100a84a0`; aliases: Tyler Tomlin (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Tyler Schaefer [-]; Tyler Yavalar [-]; Tyler Rowe [-]
- Unlocks: 5 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 6
- Place evidence: none printed; official weights: 140, 136.4, 143, 136, 136, 135
- Evidence FOR: name_exact (x6), same_commission:tn-athletic-commission (x6), weight_140_vs_139.6_on_2020-02-15, weight_136.4_vs_139.6_on_2020-02-15, weight_135_vs_139.6_on_2020-02-15
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x3) | D: the printed name plus one family only (commission): not independent evidence (x3)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2020-01-16 Matt Young at Nashville Fairgrou (corner a) | [tn-results:2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020.pdf) | 140 | Gerardo Esquivel | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2020-11-07 Matthew Young at Camp Jordan (corner a) | [tn-results:2020/TRI-STAR-OFFICIAL-RESULTS_11-7-2020F](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2020/TRI-STAR-OFFICIAL-RESULTS_11-7-2020F.pdf) | 136.4 | William Parra-Smith | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2021-05-14 Matt Young at Embassy Suites Hotel (corner a) | [tn-results:2021/TRI-STAR_BOXING_PRO_5-14-21-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR_BOXING_PRO_5-14-21-1.pdf) | 143 | Tyrone Luckey | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-02-05 Brandi McCain at Winfield Dunn Cent (corner a) | [tn-results:2022/1-1-6-BOXING-RESULTS_2-5-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/1-1-6-BOXING-RESULTS_2-5-22.pdf) | 136 | Charlie Serrano | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2023-07-22 Tri-Star Boxing at Municipal Auditorium (corner a) | [tn-results:2023/Tri-Star-Boxing_7-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Tri-Star-Boxing_7-22.pdf) | 136 | Abdel Sauceda | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2021-02-13 Matt Young at The Notes Lounge (corner a) | [tn-results:2021/TRI-STAR-SATURDAY-NIGHT-FIGHTS-BORO_OFFICIAL-RESULTS_2-13-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR-SATURDAY-NIGHT-FIGHTS-BORO_OFFICIAL-RESULTS_2-13-21.pdf) | 135 | Augustine Mauras | needs:Augustine Mauras | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #3 Mike Cook (TN)

- Proposed canonical boxer: Mike Cook `e76c44dc-29b6-424f-89ae-4ca33560cd7a`; aliases: Mike Cook (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Michael Cook [-]
- Unlocks: 5 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 165.2, 162, 162.4, 170.6, 175.4
- Evidence FOR: name_exact (x5), same_commission:tn-athletic-commission (x5), weight_165.2_vs_162.4_on_2023-04-29, weight_162_vs_162.4_on_2023-04-29
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x3) | A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-06-18 Brandi McCain at Memphis Ag Center (corner a) | [tn-results:2022/116-Boxing-Promotions_6-18](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/116-Boxing-Promotions_6-18.pdf) | 165.2 | Marcelo Ruben Molina | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2022-10-01 Brandi McCain at Memphis Agricenter (corner a) | [tn-results:2022/One-One-Six-Boxing-Promotions_10-01-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/One-One-Six-Boxing-Promotions_10-01-22.pdf) | 162 | Miguel Angel Suarez | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2021-09-24 Brandi McCain at Agricenter Internation (corner a) | [tn-results:2021/One-One-Six-Boxing-OFFICIAL-RESULTS_9-24-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/One-One-Six-Boxing-OFFICIAL-RESULTS_9-24-21.pdf) | 162.4 | Jeremy Marts | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-06-07 London Lamar at Beale Street Landing (corner a) | [tn-results:2025/Elite-Performance-Foundation-BOXING_6-7](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Elite-Performance-Foundation-BOXING_6-7.pdf) | 170.6 | Bruno Leonardo Romay | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-10-17 London Lamar at AgriCenter (corner a) | [tn-results:2025/Elite-Performance_10-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Elite-Performance_10-17.pdf) | 175.4 | Job Ezequiel Herrera | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |

### #4 Ermes Orta (TN)

- Proposed canonical boxer: Ermes Orta `32089d95-4caa-4371-a301-08f451c17d80`; aliases: Ermes Orta (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 4 bout(s) alone; 7 more only together with 7 other held identities; decisions required: 11
- Place evidence: none printed; official weights: 139.6, 139.8, 144.2, 148.6, 140.2, 139.2, 150.4, 150, 150, 150.4, 151
- Evidence FOR: name_exact (x11), same_commission:tn-athletic-commission (x11), weight_139.6_vs_139_on_2023-07-11, weight_139.8_vs_139_on_2023-07-11, weight_144.2_vs_139_on_2023-07-11, weight_140.2_vs_139_on_2023-07-11
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x7) | A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x4)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-09-05 Jimmy Adams at Texas Troubador Thea (corner a) | [tn-results:2023/COUNTRYBOX_9-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/COUNTRYBOX_9-5.pdf) | 139.6 | Raymond Chacon | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2024-05-07 Jimmy Adams at The Troubadour (corner a) | [tn-results:2024/COUNTRY-BOX_5-7](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNTRY-BOX_5-7.pdf) | 139.8 | Rondale Hubbert | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2024-08-06 Jimmy Adams at Texas Trabadour (corner a) | [tn-results:2024/COUNTRYBOX_8-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNTRYBOX_8-6.pdf) | 144.2 | Ryan Venable | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2026-01-06 Jimmy Adams at The Troubadour (corner a) | [tn-results:2026/JIMMY-ADAMS-BOXING_1-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/JIMMY-ADAMS-BOXING_1-6.pdf) | 148.6 | Gabriel Smith | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2024-03-05 Jimmy Adams at Texas Toubadour Thea (corner a) | [tn-results:2024/COUNRTY-BOX_3-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNRTY-BOX_3-5.pdf) | 140.2 | Cody Jenkins | needs:Cody Jenkins | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2024-09-17 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/CountryBox_9-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_9-17.pdf) | 139.2 | Juan Carlos Pena | needs:Juan Carlos Pena | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-03-04 Jimmy Adams at The Troubadour (corner a) | [tn-results:2025/CountryBox_3-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_3-4.pdf) | 150.4 | Anthony Woods | needs:Anthony Woods | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 150 | Javonn Davis | needs:Javonn Davis | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 150 | Ryan Martin | needs:Ryan Martin | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Miami-V-Nashville](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Miami-V-Nashville.pdf) | 150.4 | Charles Petit-Homme | needs:Charles Petit-Homme | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 151 | Lionell Omar Santana | needs:Lionell Omar Santana | C insufficient_graph_evidence:jurisdiction | D | - |

### #5 Eric Draper (TN)

- Proposed canonical boxer: Eric Draper `bc98cb4a-a827-495d-ae45-0c2105283539`; aliases: Eric Draper (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Eric Bossler [-]; Eric Hunter [-]; Eric Perry [-]
- Unlocks: 4 bout(s) alone; 3 more only together with 3 other held identities; decisions required: 7
- Place evidence: none printed; official weights: 158.8, 162.2, 175, 167, 159.8, 153.2, 156.4
- Evidence FOR: name_exact (x7), same_commission:tn-athletic-commission (x7), weight_158.8_vs_162.8_on_2023-01-13, weight_159.8_vs_162.8_on_2023-01-13
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_12.2lb(neutral)
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x5) | A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-06-30 Matt Young at Ole Smoky Moonshine (corner a) | [tn-results:2023/TRI-STAR-BOXING_6-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TRI-STAR-BOXING_6-30.pdf) | 158.8 | Yolexcy Leiva | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2021-09-24 Brandi McCain at Agricenter Internation (corner a) | [tn-results:2021/One-One-Six-Boxing-OFFICIAL-RESULTS_9-24-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/One-One-Six-Boxing-OFFICIAL-RESULTS_9-24-21.pdf) | 162.2 | Rashad Jones | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2023-12-01 Matt Young at Fairgrounds Nashville (corner a) | [tn-results:2023/TriStar-Boxing_12-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TriStar-Boxing_12-1.pdf) | 175 | Rafael Garcia | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2024-08-17 Matt Young at Texas Troubadour The (corner a) | [tn-results:2024/TRI-STAR-BOXING_8-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/TRI-STAR-BOXING_8-17.pdf) | 167 | Augustine Cicero | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-04-16 Matt Young at Embassy Suites (corner a) | [tn-results:2022/TRI-STAR-BOXING_4-16-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_4-16-22.pdf) | 159.8 | George Sheppard | needs:George Sheppard | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-01-17 Matt Young at Renasant Convention (corner a) | [tn-results:2025/TRI-STAR-BOXING_1-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TRI-STAR-BOXING_1-17.pdf) | 153.2 | Rakhim Johnson | needs:Rakhim Johnson | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-05-23 Matthew Young at Renasant Convention (corner a) | [tn-results:2025/Tri-Star-Boxing_5-23](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Tri-Star-Boxing_5-23.pdf) | 156.4 | John Brewer | needs:John Brewer | C insufficient_graph_evidence:jurisdiction | D | - |

### #6 Erick Arellano (TN)

- Proposed canonical boxer: Erick Arellano `3f0757a5-89ed-48d8-8463-cdff2eed56c7`; aliases: Erick Arellano (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Erick Lanzas, Jr. [-]; Maria Arellano [-]; Aldo Blancas Arellano [-]
- Unlocks: 4 bout(s) alone; 3 more only together with 3 other held identities; decisions required: 7
- Place evidence: none printed; official weights: 232, 234.4, 225.4, 231, 226, 225.8, 215.2
- Evidence FOR: name_exact (x7), same_commission:tn-athletic-commission (x7), weight_232_vs_235.4_on_2023-04-04, weight_234.4_vs_235.4_on_2023-04-04, weight_225.4_vs_235.4_on_2023-04-04, weight_226_vs_235.4_on_2023-04-04, weight_225.8_vs_235.4_on_2023-04-04
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_20.2lb(neutral)
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x5) | D: the printed name plus one family only (commission): not independent evidence (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-05-02 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/COUNTRY-BOX_5-2.df](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/COUNTRY-BOX_5-2.df.pdf) | 232 | Martez Poe | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2023-07-11 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/Country-Box_7-11](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Country-Box_7-11.pdf) | 234.4 | Javier Frazier | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2023-09-05 Jimmy Adams at Texas Troubador Thea (corner a) | [tn-results:2023/COUNTRYBOX_9-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/COUNTRYBOX_9-5.pdf) | 225.4 | Francois Russell | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-12-20 Ramon Arellano at San Jose Fiesta (corner a) | [tn-results:2025/Arellano-BOXING_12-20](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Arellano-BOXING_12-20.pdf) | 231 | Jashon Moore | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2023-08-08 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/Jimmy-Adams-Promotions_8-8](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Jimmy-Adams-Promotions_8-8.pdf) | 226 | Javier Frazier | needs:Javier Frazier | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2023-12-05 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/Country-Box_12-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Country-Box_12-5.pdf) | 225.8 | Armondo Reeves | needs:Armondo Reeves | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2024-03-05 Jimmy Adams at Texas Toubadour Thea (corner a) | [tn-results:2024/COUNRTY-BOX_3-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNRTY-BOX_3-5.pdf) | 215.2 | Raphael Carolina | needs:Raphael Carolina | C insufficient_graph_evidence:jurisdiction | D | - |

### #7 Kevin Torian (TN)

- Proposed canonical boxer: Kevin Torian `de48ead4-ab6b-4c43-9a6c-dea62b93fb8f`; aliases: Kevin Torian (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Kevin Luna [-]; Kevin Nunez [-]; Kevin Ofei [-]
- Unlocks: 4 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 4
- Place evidence: none printed; official weights: 198.4, 200, 200.2, 193.4
- Evidence FOR: name_exact (x4), same_commission:tn-athletic-commission (x4), same_venue (x2), weight_198.4_vs_201.4_on_2023-05-02, weight_200_vs_201.4_on_2023-05-02
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2) | B: support: commission, venue; caveats: workbench advice hold | D: the printed name plus one family only (commission): not independent evidence

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-07-11 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/Country-Box_7-11](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Country-Box_7-11.pdf) | 198.4 | Raphael Carolina | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |
| 2023-09-05 Jimmy Adams at Texas Troubador Thea (corner a) | [tn-results:2023/COUNTRYBOX_9-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/COUNTRYBOX_9-5.pdf) | 200 | Raquan Ashby | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2024-11-19 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2024/CountryBox_11-19](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_11-19.pdf) | 200.2 | Joel Mutombo | bout_now | C insufficient_graph_evidence:jurisdiction+venue | B | - |
| 2025-06-03 Jim my Adams at The Troubadour (corner b) | [tn-results:2025/COUNRTBOX_6-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/COUNRTBOX_6-3.pdf) | 193.4 | Jaywon Woods | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |

### #9 Miguel Gomez (TN)

- Proposed canonical boxer: Miguel Gomez `b729ffc5-d02c-4c01-a837-1c26390f791f`; aliases: Miguel Gomez (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Miguel Teo [-]; Miguel Angel Suarez [-]; Demalik Miguel [-]; Jaycob Gomez [-]
- Unlocks: 3 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 4
- Place evidence: none printed; official weights: 134, 134.8, 136, 136.2
- Evidence FOR: name_exact (x4), same_commission:tn-athletic-commission (x4), weight_134_vs_139.4_on_2023-01-13, weight_134.8_vs_139.4_on_2023-01-13, weight_136_vs_139.4_on_2023-01-13, weight_136.2_vs_139.4_on_2023-01-13
- Evidence AGAINST: danger:common_surname (x4), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname (x4)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-04-16 Matt Young at Embassy Suites (corner a) | [tn-results:2022/TRI-STAR-BOXING_4-16-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_4-16-22.pdf) | 134 | Cameron Cain | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2022-07-01 Matt Young at Ole Smoky Distillery (corner a) | [tn-results:2022/Tri-Star-Boxing_7-1-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing_7-1-22.pdf) | 134.8 | Travis Crain | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2023-12-01 Matt Young at Fairgrounds Nashville (corner a) | [tn-results:2023/TriStar-Boxing_12-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TriStar-Boxing_12-1.pdf) | 136 | Marco Lara | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2023-08-12 Matt Young at Embassy Suites Nashvi (corner a) | [tn-results:2023/TriStar-Boxing_8-12](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TriStar-Boxing_8-12.pdf) | 136.2 | Aaron Hollis | needs:Aaron Hollis | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #10 Tyrrell Evans (TN)

- Proposed canonical boxer: Tyrrell Evans `22e93d2a-4b7b-46f0-a8fc-a2d749f0d759`; aliases: Tyrrell Evans (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 3 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 3
- Place evidence: none printed; official weights: 171.2, 171.4, 171
- Evidence FOR: name_exact (x3), same_commission:tn-athletic-commission (x3), weight_171.2_vs_171.4_on_2024-07-13, weight_171.4_vs_171.4_on_2024-07-13
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) (x2) | D: the printed name plus one family only (commission): not independent evidence

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-12-07 Lamont Ingram at Champ's Event Center (corner b) | [tn-results:2024/Champions-Enterprise-Boxing_12-7](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Champions-Enterprise-Boxing_12-7.pdf) | 171.2 | Keynan Williams | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-01-17 Matt Young at Renasant Convention (corner b) | [tn-results:2025/TRI-STAR-BOXING_1-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TRI-STAR-BOXING_1-17.pdf) | 171.4 | Jackson Rhodes | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-10-25 Lamont Ingram at Prestige Bistro (corner b) | [tn-results:2025/Champions-Enterprise_10-25](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Champions-Enterprise_10-25.pdf) | 171 | Japheth Bryan | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |

### #19 Jay Ellis (TN)

- Proposed canonical boxer: Jay Ellis `f96a580b-dd1b-410e-8c68-1f579ffabe8a`; aliases: Jay Ellis (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Ali Ellis [-]; Lindsay Ellis [-]; Rashidi Ellis [-]; Ronald Ellis [-]
- Unlocks: 2 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 4
- Place evidence: none printed; official weights: 163.2, 159.2, 163, 157.6
- Evidence FOR: name_exact (x4), same_commission:tn-athletic-commission (x4), weight_163.2_vs_160_on_2024-01-20, weight_159.2_vs_160_on_2024-01-20
- Evidence AGAINST: danger:common_surname (x4), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname (x2) | D: the printed name plus one family only (commission): not independent evidence (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-04-06 Lamont Ingram at Champ Event Center (corner b) | [tn-results:2024/Champions-Enterprise-Boxing_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Champions-Enterprise-Boxing_4-6.pdf) | 163.2 | Tarvoris Southall ‐ Mack | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2024-12-07 Lamont Ingram at Champ's Event Center (corner b) | [tn-results:2024/Champions-Enterprise-Boxing_12-7](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Champions-Enterprise-Boxing_12-7.pdf) | 159.2 | Brandon Chaney | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2025-04-26 Lamont Ingram at Champ's Event Center (corner b) | [tn-results:2025/Champions-Boxing_4-26](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Champions-Boxing_4-26.pdf) | 163 | Jaylin Strong | needs:Jaylin Strong | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-10-17 London Lamar at AgriCenter (corner b) | [tn-results:2025/Elite-Performance_10-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Elite-Performance_10-17.pdf) | 157.6 | Jerry Smith | needs:Jerry Smith | C insufficient_graph_evidence:jurisdiction | D | - |

### #20 Jashawn Hunter (TN)

- Proposed canonical boxer: Jashawn Hunter `2a9291d1-63a4-4144-b602-4182021d9f40`; aliases: Jashawn Hunter (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Kadeen Hunter [-]; Eric Hunter [-]
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 142.8, 156, 153.4
- Evidence FOR: name_exact (x3), same_commission:tn-athletic-commission (x3), weight_142.8_vs_141.6_on_2024-09-03, same_venue
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x2) | A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-12-05 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2023/Country-Box_12-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Country-Box_12-5.pdf) | 142.8 | Scot England | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |
| 2022-06-11 Matt Young at Montague Park (corner b) | [tn-results:2022/Tri-Star-Boxing_RESULTS_6-11-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing_RESULTS_6-11-22.pdf) | 156 | Joshua Villion | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-12-10 Matt young at Beast Mode Sports Co (corner b) | [tn-results:2022/TRI-STAR-BOXING_12-10](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_12-10.pdf) | 153.4 | Dyron Words | needs:Dyron Words | C insufficient_graph_evidence:jurisdiction | D | - |

### #21 Maidel Sando (TN)

- Proposed canonical boxer: Maidel Sando `869334f0-5814-4dd5-968c-c2201f8ae947`; aliases: Maidel Sando (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 172.6, 175, 171
- Evidence FOR: name_exact (x3), same_commission:tn-athletic-commission (x3), weight_171_vs_167.2_on_2024-10-01, same_venue
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x2) | A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-11-27 Langston Hampton at Municipal Auditori (corner a) | [tn-results:2021/LANK-PROMOTIONS-BOXING-OFFICIAL-RESULTS_11-27-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/LANK-PROMOTIONS-BOXING-OFFICIAL-RESULTS_11-27-21.pdf) | 172.6 | Clarence Brown | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-12-02 Jimmy Adams at The Troubadour (corner a) | [tn-results:2025/CountryBox_12-2](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_12-2.pdf) | 175 | Zachary Randolph | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-02-04 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2025/CountryBox_2-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_2-4.pdf) | 171 | Vaughn Alexander | needs:Vaughn Alexander | C insufficient_graph_evidence:jurisdiction+venue+weight | A | - |

### #22 Ryan Shaw (TN)

- Proposed canonical boxer: Ryan Shaw `f4c8fedf-2937-414c-8bdd-e7ff2d762695`; aliases: Ryan Shaw (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Ryan Raglin [-]; Ryan Jett [-]; Shawn Rall [-]; Ryan Diaz [-]; Ryan Pino [-]
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 117.6, 111.8, 105.4
- Evidence FOR: name_exact (x3), same_commission:tn-athletic-commission (x3), weight_117.6_vs_118.2_on_2023-08-12
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x2) | A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-02-06 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2024/Jimmy-Adams-Boxing_2-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Jimmy-Adams-Boxing_2-6.pdf) | 117.6 | Vit Y | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2024-12-03 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/CountryBox_12-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_12-3.pdf) | 111.8 | Rondarius Hunter | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2021-09-17 Matthew Young at Fairgrounds Nashville (corner a) | [tn-results:2021/TRI-STAR-BOXING-OFFICIAL-RESULTS_9-17-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR-BOXING-OFFICIAL-RESULTS_9-17-21.pdf) | 105.4 | Kenneth Jamerson | needs:Kenneth Jamerson | C insufficient_graph_evidence:jurisdiction | D | - |

### #23 Victor Hernandez (TN)

- Proposed canonical boxer: Victor Hernandez `3e15c673-d111-43d3-80e1-36e3a4f515ff`; aliases: Victor Hernandez (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Hernandez Trejo, [-]; Claudio Hernandez [-]; Luis Hernandez [-]; Antonio L. Hernandez [-]; Wilver Hernandez [-]; Pedro Hernandez [-]; Elder Hernandez Gama [-]; Cristian Hernandez [-]; Angelo Hernandez [-]
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 128, 126, 126.6
- Evidence FOR: name_exact (x3), same_commission:tn-athletic-commission (x3), weight_128_vs_133.6_on_2023-07-11, same_venue
- Evidence AGAINST: danger:common_surname (x3), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x2) | B: support: weight, commission, venue; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-08-08 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/Jimmy-Adams-Promotions_8-8](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Jimmy-Adams-Promotions_8-8.pdf) | 128 | Weusi Johnson | bout_now | C insufficient_graph_evidence:jurisdiction+venue+weight | B | - |
| 2025-08-02 Christine Salters at Fairgrounds Nashville (corner a) | [tn-results:2025/Christy-Martin-Promotions_8-2-BOXING](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Christy-Martin-Promotions_8-2-BOXING.pdf) | 126 | Jayvon Garnett | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-05-17 Christine Salters at Fat Bottom Brewer y (corner a) | [tn-results:2025/Martin-Promo-Boxing_5-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Martin-Promo-Boxing_5-17.pdf) | 126.6 | Weusi Johnson | needs:Weusi Johnson | C insufficient_graph_evidence:jurisdiction | D | - |

### #24 Oliver McCall (TN)

- Proposed canonical boxer: Oliver McCall `fbdb197f-8cf1-4f89-8e12-622c0227e55c`; aliases: Oliver McCall (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Cuttino Oliver [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 250, 235.4
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_250_vs_251.2_on_2024-11-19
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_15.8lb(neutral)
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) | D: the printed name plus one family only (commission): not independent evidence

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-02-04 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2025/CountryBox_2-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_2-4.pdf) | 250 | Gary Cobia | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-06-03 Jim my Adams at The Troubadour (corner a) | [tn-results:2025/COUNRTBOX_6-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/COUNRTBOX_6-3.pdf) | 235.4 | Carlos Reyes | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |

### #25 Tivan Young (TN)

- Proposed canonical boxer: Tivan Young `c84804d4-e543-4678-affc-982925efcddf`; aliases: Tivan Young (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Devon Young [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 145.6, 148.4
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_145.6_vs_151_on_2024-07-13
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) | D: the printed name plus one family only (commission): not independent evidence

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-06-27 Sable Long at The Ramsey Hotel (corner b) | [tn-results:2025/Strikefest_6-27_Boxing](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Strikefest_6-27_Boxing.pdf) | 145.6 | Joshua Smartt | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-09-06 Wilfredo Santiago Jr. at Chat. Convention Cent (corner b) | [tn-results:2025/TOP-TIER-PROMOTIONS-BOXING_9-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TOP-TIER-PROMOTIONS-BOXING_9-6.pdf) | 148.4 | Mandel Jackson | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |

### #85 Dyron Words (TN)

- Proposed canonical boxer: Dyron Words `21147a43-1012-40a8-9252-031ef97dff8d`; aliases: Dyron Words (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 4 more only together with 4 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 163.8, 155.6, 144.6, 160, 161.2
- Evidence FOR: name_exact (x5), same_commission:tn-athletic-commission (x5), weight_155.6_vs_160.2_on_2023-04-29
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_15.6lb(neutral)
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x4) | A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-09-21 Lamont Ingram at Champions Enterprise (corner a) | [tn-results:2024/Champions-Enterprise-Boxing_9-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Champions-Enterprise-Boxing_9-21.pdf) | 163.8 | La'Trevin Williams | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-12-10 Matt young at Beast Mode Sports Co (corner a) | [tn-results:2022/TRI-STAR-BOXING_12-10](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_12-10.pdf) | 155.6 | Jashawn Hunter | needs:Jashawn Hunter | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2022-10-01 Brandi McCain at Memphis Agricenter (corner a) | [tn-results:2022/One-One-Six-Boxing-Promotions_10-01-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/One-One-Six-Boxing-Promotions_10-01-22.pdf) | 144.6 | John Williams | needs:John Williams | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-01-17 Matt Young at Renasant Convention (corner a) | [tn-results:2025/TRI-STAR-BOXING_1-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TRI-STAR-BOXING_1-17.pdf) | 160 | Aaron Anderson | needs:Aaron Anderson | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-05-23 Matthew Young at Renasant Convention (corner a) | [tn-results:2025/Tri-Star-Boxing_5-23](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Tri-Star-Boxing_5-23.pdf) | 161.2 | Rakim Johnson | needs:Rakim Johnson | C insufficient_graph_evidence:jurisdiction | D | - |

### #86 Ryan Martin (TN)

- Proposed canonical boxer: Ryan Martin `daae27dc-e5c7-4b93-9b72-3ac1a094a9d9`; aliases: Ryan Martin (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Ryan Raglin [-]; Alex Martin [-]; Alexander Martin [-]; Martin Diaz [-]; Ryan Mondala [-]; Martin Brown [-]; Tray Martin [-]; Josh Martin [-]; James Martin [-]
- Unlocks: 1 bout(s) alone; 4 more only together with 3 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 151, 150.2, 150.2, 150.2, 151
- Evidence FOR: name_exact (x5), same_commission:tn-athletic-commission (x4), weight_151_vs_150.2_on_2025-04-06 (x2), weight_150.2_vs_150.2_on_2025-04-06 (x2), same_venue (x2)
- Evidence AGAINST: danger:common_surname (x5), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname (x2) | B: support: weight, commission, venue; caveats: common_surname (x2) | D: the printed name is the only link (no official-weight, commission, venue or opponent support)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 151 | Erick Lanzas, Jr. | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 150.2 | Ermes Orta | needs:Ermes Orta | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 150.2 | Deontay Brown | needs:Deontay Brown | C insufficient_graph_evidence:jurisdiction+venue+weight | B | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 150.2 | Deontay Brown | needs:Deontay Brown | C insufficient_graph_evidence:jurisdiction+venue+weight | B | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 151 | Charles Garner | needs:Charles Garner | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #87 Jerry Smith (TN)

- Proposed canonical boxer: Jerry Smith `906259ec-d202-4a87-a4c7-2d3d263361bf`; aliases: Jerry Smith (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Damonte Smith [-]; Twon Smith [-]; Jeremy Smith [-]; Johnathan Smith [-]; Da'Velle Smith [-]; Elijah Smith [-]; Marcus Smith [-]; Larry Smith Jr [-]; Hayden Smith [-]
- Unlocks: 1 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 3
- Place evidence: none printed; official weights: 153, 152.8, 159.2
- Evidence FOR: name_exact (x3), same_commission:tn-athletic-commission (x3), weight_159.2_vs_159.8_on_2025-06-07
- Evidence AGAINST: danger:common_surname (x3), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x2) | B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-09-24 Brandi McCain at Agricenter Internation (corner a) | [tn-results:2021/One-One-Six-Boxing-OFFICIAL-RESULTS_9-24-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/One-One-Six-Boxing-OFFICIAL-RESULTS_9-24-21.pdf) | 153 | Marqueez Greer | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-06-18 Brandi McCain at Memphis Ag Center (corner b) | [tn-results:2022/116-Boxing-Promotions_6-18](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/116-Boxing-Promotions_6-18.pdf) | 152.8 | Izale Kimble | needs:Izale Kimble | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-10-17 London Lamar at AgriCenter (corner a) | [tn-results:2025/Elite-Performance_10-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Elite-Performance_10-17.pdf) | 159.2 | Jay Ellis | needs:Jay Ellis | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #88 Kerry James Jr (TN)

- Proposed canonical boxer: Kerry James Jr `d6fa0bb4-21e4-490b-adeb-1eeb0d127a40`; aliases: Kerry James Jr (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Montrel James [-]; James Bodner [-]; James Perella [-]; James Hughes [-]; Kenneth James [-]; James Sellers [-]; James Martin [-]
- Unlocks: 1 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 3
- Place evidence: none printed; official weights: 149.6, 150, 160
- Evidence FOR: name_exact (x3), same_commission:tn-athletic-commission (x3), weight_149.6_vs_143_on_2020-11-07
- Evidence AGAINST: danger:generational_suffix (x3), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x2) | B: support: weight, commission; caveats: generational_suffix

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-11-27 Langston Hampton at Municipal Auditori (corner a) | [tn-results:2021/LANK-PROMOTIONS-BOXING-OFFICIAL-RESULTS_11-27-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/LANK-PROMOTIONS-BOXING-OFFICIAL-RESULTS_11-27-21.pdf) | 149.6 | Christopher Hatley | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2023-04-04 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2023/Jimmy-Adams-Promotion-Boxing_4-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Jimmy-Adams-Promotion-Boxing_4-4.pdf) | 150 | Raul Garcia Jr. | needs:Raul Garcia Jr. | C insufficient_graph_evidence:jurisdiction | D | - |
| 2024-08-17 Matt Young at Texas Troubadour The (corner a) | [tn-results:2024/TRI-STAR-BOXING_8-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/TRI-STAR-BOXING_8-17.pdf) | 160 | Phillip Lars | needs:Phillip Lars | C insufficient_graph_evidence:jurisdiction | D | - |

### #89 David Ratliff (TN)

- Proposed canonical boxer: David Ratliff `9712dea8-33cc-4efe-88b5-e98e83ff9063`; aliases: David Ratliff (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: David Griffith [-]; David Hardy [-]; David Malul [-]
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 179.1, 175
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_175_vs_168.6_on_2021-07-31
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_10.5lb(neutral)
- Class reasons: D: the printed name plus one family only (commission): not independent evidence | A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-05-28 Tracy Crutcher-Kenne at 1st Horizon Pavillion (corner b) | [tn-results:2021/46Eleven-Boxing_5-28-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/46Eleven-Boxing_5-28-21.pdf) | 179.1 | Calvin Early | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-02-19 Matthew Young at Ymca Y- Cap (corner b) | [tn-results:2022/Tri-Star-Boxing-OFFICIAL-RESULTS_2-19-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing-OFFICIAL-RESULTS_2-19-22.pdf) | 175 | Kahlil Mitchell | needs:Kahlil Mitchell | C insufficient_graph_evidence:jurisdiction+weight | A | - |

### #90 Decorian Dodson (TN)

- Proposed canonical boxer: Decorian Dodson `fe5338ba-b7d3-45df-9cc3-bb82644c1c8c`; aliases: Decorian Dodson (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Caleb Dodson [-]
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 157.8, 141.4
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_157.8_vs_153_on_2023-04-04
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_11.6lb(neutral)
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) | D: the printed name plus one family only (commission): not independent evidence

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-06-30 Matt Young at Ole Smoky Moonshine (corner b) | [tn-results:2023/TRI-STAR-BOXING_6-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TRI-STAR-BOXING_6-30.pdf) | 157.8 | Zachary Wagenmaker | bout_now | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2022-07-01 Matt Young at Ole Smoky Distillery (corner b) | [tn-results:2022/Tri-Star-Boxing_7-1-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing_7-1-22.pdf) | 141.4 | Lawrence Donald | needs:Lawrence Donald | C insufficient_graph_evidence:jurisdiction | D | - |

### #91 Jessie Fletcher III (TN)

- Proposed canonical boxer: Jessie Fletcher III `97487180-3c9e-421c-b97e-d966e66fde35`; aliases: Jessie Fletcher III (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 145.4, 144.6
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_145.4_vs_146_on_2023-04-29, weight_144.6_vs_146_on_2023-04-29
- Evidence AGAINST: danger:generational_suffix (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: generational_suffix (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-06-18 Brandi McCain at Memphis Ag Center (corner a) | [tn-results:2022/116-Boxing-Promotions_6-18](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/116-Boxing-Promotions_6-18.pdf) | 145.4 | Roderick Gilkey | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |
| 2022-10-01 Brandi McCain at Memphis Agricenter (corner a) | [tn-results:2022/One-One-Six-Boxing-Promotions_10-01-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/One-One-Six-Boxing-Promotions_10-01-22.pdf) | 144.6 | Izale Kimble | needs:Izale Kimble | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #92 Kemper Johnson (TN)

- Proposed canonical boxer: Kemper Johnson `c4cb7385-1b51-465f-bd9e-47bf89264fec`; aliases: Kemper Johnson (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Rasheed Johnson [-]; Kanesha Johnson [-]; Rakim Johnson [-]; Erion Johnson [-]; Richard Johnson [-]; Tracey Johnson [-]; Tony Johnson Jr. [-]; Weusi Johnson [-]; Isaiah Johnson [-]
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 160.8, 158
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_158_vs_159.4_on_2025-02-01
- Evidence AGAINST: danger:common_surname (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence | B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-09-17 Sable Long at Colboch Harley (corner a) | [tn-results:2022/Strike-Fest-10-BOXING_9-17-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Strike-Fest-10-BOXING_9-17-22.pdf) | 160.8 | McArio DelCastillo | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-06-27 Sable Long at The Ramsey Hotel (corner a) | [tn-results:2025/Strikefest_6-27_Boxing](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Strikefest_6-27_Boxing.pdf) | 158 | Nick Campbell | needs:Nick Campbell | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #93 Marco Romero (MO)

- Proposed canonical boxer: Marco Romero `16c4e627-3434-4615-85dd-2e2c57b00a53`; aliases: Marco Romero (name, verified); verified prior bouts: 1; hometowns: Olathe, KS; commissions: nsac
- Competing candidates: Marco Hall, Jr. [-]; Marco Lara [-]
- Unlocks: 1 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: Olathe, KS; official weights: 165.7, 167.5
- Evidence FOR: name_exact (x2), hometown_same_city:olathe, ks (x2), weight_165.7_vs_164_on_2026-08-22, weight_167.5_vs_164_on_2026-08-22
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: B: support: hometown, weight; caveats: workbench advice hold (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-05-16 KC Boxing Promotions at Scottish Rite Temple (corner a) | [mo-results:2026-05-16 BOXRES Kansas City KC Boxing Promo](https://pr.mo.gov/boards/athletics/boxingresults/2026-05-16%20BOXRES%20Kansas%20City%20KC%20Boxing%20Promo.pdf) | 165.7 | Andre Sherard | bout_now | C insufficient_graph_evidence:hometown+weight | B | 003 |
| 2026-03-20 KC Boxing Promotions at Truman Memorial Building (corner a) | [mo-results:2026-03-20 BOXRES Independence KC Boxing Promo](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-20%20BOXRES%20Independence%20KC%20Boxing%20Promo.pdf) | 167.5 | William Langston | needs:William Langston | C insufficient_graph_evidence:hometown+weight | B | 003 |

### #94 Colleen Davis (PA)

- Proposed canonical boxer: Colleen Davis `415d6c34-465c-4c85-9186-fdf2ed9d79f4`; aliases: Colleen Davis (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: Zavier Davis [-]; Will Davis [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 124.1
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_124.1_vs_125.6_on_2026-07-25, same_commission:pa-state-athletic-commission
- Evidence AGAINST: danger:same_surname_same_region_different_given_name, danger:common_surname
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: same_surname_same_region_different_given_name, common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-06-13 Max Leasock at Pasquerilla Center - Johnstown (corner b) | [pa-results:2026:06-13-26 box leasock - pasquerilla conference center - johnstown - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-13-26%20box%20leasock%20-%20pasquerilla%20conference%20center%20-%20johnstown%20-%20results.pdf) | 124.1 | Lauren Michaels | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | 003 |

### #95 David Garcia (PA)

- Proposed canonical boxer: David Garcia `78d35a29-3de4-4580-a7b9-2dcbeba5e7bc`; aliases: David Garcia (name, verified); verified prior bouts: 1; hometowns: AZ; commissions: pa-state-athletic-commission
- Competing candidates: David Griffith [-]; David Hardy [-]; Michael Garcia [-]; John Garcia [-]; Julio Garcia [-]; David Malul [-]; Ryan Garcia [-]; Eridson Garcia [-]; Rafael Garcia [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: AZ; official weights: 121
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_121_vs_123.4_on_2026-05-29, same_commission:pa-state-athletic-commission
- Evidence AGAINST: danger:common_surname
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-11 Brian Costello at 2300 Arena (corner b) | [pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf) | 121 | Alejandro Herrera | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | 003 |

### #96 Gustavo Morales (PA)

- Proposed canonical boxer: Gustavo Morales `63ab0697-7e3e-4069-bf9b-e51134216ad3`; aliases: Gustavo Morales (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: Josue Morales [-]; Gustavo Trujillo [-]; Michelle Morales [-]; Angel Meza Morales [-]; Holman Morales [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 159.8
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_159.8_vs_153.8_on_2026-05-29, same_commission:pa-state-athletic-commission
- Evidence AGAINST: danger:common_surname
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-03 James Bartley at The Archer (corner a) | [pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf) | 159.8 | Chevy Bridges | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | 003 |

### #97 Izak Carlos (MO)

- Proposed canonical boxer: Izak Carlos `2e34f74b-d2e1-4b0c-98c8-aff0463b57a6`; aliases: Izak Carlos (name, verified); verified prior bouts: 1; hometowns: Olathe, KS; commissions: fl-athletic-commission
- Competing candidates: Carlos Lewis [-]; Carlos Adames [-]; Juan Carlos Pena [-]; Carlos Padilla [-]; Jorge Carlos [-]; Carlos Buitrago [-]; Carlos Suarez [-]; Carlos Reyes [-]; Carlos Gonzalez [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: Olathe, KS; official weights: 137
- Evidence FOR: name_exact, hometown_same_city:olathe, ks, weight_137_vs_132_on_2026-05-16
- Evidence AGAINST: danger:same_surname_same_city_different_given_name
- Uncertainty: -
- Class reasons: B: support: hometown, weight; caveats: same_surname_same_city_different_given_name

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-02-13 Blue Corner Promotions at Harrah’s Casino (corner b) | [mo-results:2026-02-13 BOXRESAKICKRES Kansas City Blue Corner Promo](https://pr.mo.gov/boards/athletics/boxingresults/2026-02-13%20BOXRESAKICKRES%20Kansas%20City%20Blue%20Corner%20Promo.pdf) | 137 | Jay Krupp | bout_now | C insufficient_graph_evidence:hometown+weight | B | 003 |

### #98 Jorge Carlos (MO)

- Proposed canonical boxer: Jorge Carlos `7fc52a96-07ac-49b4-be99-b8cf16f55927`; aliases: Jorge Carlos (name, verified); verified prior bouts: 1; hometowns: Olathe, KS; commissions: fl-athletic-commission
- Competing candidates: Izak Carlos [-]; Carlos Lewis [-]; Carlos Adames [-]; Juan Carlos Pena [-]; Carlos Padilla [-]; Carlos Buitrago [-]; Carlos Suarez [-]; Carlos Reyes [-]; Carlos Gonzalez [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: Olathe, KS; official weights: 143.6
- Evidence FOR: name_exact, hometown_same_city:olathe, ks, weight_143.6_vs_143.4_on_2026-01-24
- Evidence AGAINST: danger:same_surname_same_city_different_given_name
- Uncertainty: -
- Class reasons: B: support: hometown, weight; caveats: same_surname_same_city_different_given_name

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-25 Blue Corner Promotions at Harrah’s Casino (corner b) | [mo-results:2026-04-25 BOXRES KICKRES Kansas CIty Blue Corner](https://pr.mo.gov/boards/athletics/boxingresults/2026-04-25%20BOXRES%20KICKRES%20Kansas%20CIty%20Blue%20Corner.pdf) | 143.6 | Helton Lara | bout_now | C insufficient_graph_evidence:hometown+weight | B | 003 |

### #99 Luis Arrollo (PA)

- Proposed canonical boxer: Luis Arrollo `a477490d-43e0-47f2-8ae8-e962ac725bdb`; aliases: Luis Arrollo (name, verified); verified prior bouts: 1; hometowns: SONORA; commissions: pa-state-athletic-commission
- Competing candidates: none
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: MEXICO; official weights: 126.6
- Evidence FOR: name_exact, weight_126.6_vs_132_on_2026-07-25, same_commission:pa-state-athletic-commission
- Evidence AGAINST: danger:stated_place_mismatch
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: stated_place_mismatch

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-06-13 Dominique Walton at First District Plaza (corner a) | [pa-results:2026:06-13-26 box walton - first district plaza - phila., pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-13-26%20box%20walton%20-%20first%20district%20plaza%20-%20phila.,%20pa%20-%20results.pdf) | 126.6 | Ethan Gonzalez | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | 003 |

### #100 Marcus Decamp (MO)

- Proposed canonical boxer: Marcus Decamp `f4b487f9-c0c9-4517-a451-ce7c499ac73f`; aliases: Marcus Decamp (name, verified); verified prior bouts: 1; hometowns: Battle Creek, MI; commissions: fl-athletic-commission
- Competing candidates: Demarcus Rogers [-]; Marcus Perkins [-]; Marcus Smith [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: Battle Creek, MI; official weights: 118.2
- Evidence FOR: name_exact, hometown_same_city:battle creek, mi, weight_118.2_vs_114_on_2026-07-25
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: B: support: hometown, weight; caveats: workbench advice hold

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-21 Box Culture Promotions at Ambassador Club (corner b) | [mo-results:2026-03-21 BOXRES St. Louis Box Culture Promotions](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-21%20BOXRES%20St.%20Louis%20Box%20Culture%20Promotions.pdf) | 118.2 | Randle Canaday | bout_now | C insufficient_graph_evidence:hometown+weight | B | 003 |

### #101 Nicholas Jackson (PA)

- Proposed canonical boxer: Nicholas Jackson `dbaacfd7-2c70-48e9-825a-327ee5e3a473`; aliases: Nicholas Jackson (name, verified); verified prior bouts: 1; hometowns: OH; commissions: pa-state-athletic-commission
- Competing candidates: Harold Jackson [-]; Jordan Jackson [-]; Deon Nicholson [-]; Nicholas Monty [-]; Darrius Jackson [-]; Jackson Rhodes [-]; Mandel Jackson [-]; Malik Jackson [-]; Nicholas Adams [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: OH; official weights: 189.4
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_189.4_vs_197_on_2026-05-09, same_commission:pa-state-athletic-commission
- Evidence AGAINST: danger:common_surname
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-07 Chris Coyne at MOHEGAN SUN - Wilkes Barre (corner a) | [pa-results:2026:03-07-26 box coyne - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20coyne%20-%20results.pdf) | 189.4 | Jesse Oltmanns | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | 003 |

### #102 Russell Harris (TN)

- Proposed canonical boxer: Russell Harris `37899a03-5c8f-4ae4-af67-37670e9a0f28`; aliases: Russell Harris (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Francois Russell [-]; Michael Harris [-]; Calvery Harris [-]; Daryn Harris [-]; Harris-McCray, [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 188
- Evidence FOR: name_exact, weight_188_vs_197.2_on_2026-01-06, same_commission:tn-athletic-commission
- Evidence AGAINST: danger:common_surname, no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-03 Jimmy Adams at Plaza Mariachi (corner a) | [tn-results:2026/Jimmy-Adams-Boxing_3-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/Jimmy-Adams-Boxing_3-3.pdf) | 188 | Carson Brown | bout_now | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #103 Tyler Rowe (MO)

- Proposed canonical boxer: Tyler Rowe `cf638c20-3c65-4fdb-8ec7-4159773d7122`; aliases: Tyler Rowe (name, verified); verified prior bouts: 1; hometowns: Independence, MO; commissions: mo-office-of-athletics
- Competing candidates: Tyler Winemiller [-]; Tyler Schaefer [-]; Tyler Yavalar [-]; Tyler Tomlin [-]; Tyler Duangsay [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: Independence, MO; official weights: 270.9
- Evidence FOR: name_exact, hometown_same_city:independence, mo, same_commission:mo-office-of-athletics
- Evidence AGAINST: none
- Uncertainty: weight_gap_14.6lb(neutral)
- Class reasons: B: support: hometown, commission; caveats: workbench advice hold

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-02-28 Carden Combat Sports Promotions at Good Time Events Center (corner b) | [mo-results:2026-02-28 BOXRES Carden Combat Sports St. Joseph](https://pr.mo.gov/boards/athletics/boxingresults/2026-02-28%20BOXRES%20Carden%20Combat%20Sports%20St.%20Joseph.pdf) | 270.9 | Josh Martin | bout_now | C insufficient_graph_evidence:hometown+jurisdiction | B | 003 |

### #275 Cleotis Pendarvis (TN)

- Proposed canonical boxer: Cleotis Pendarvis `c3008bd2-34aa-4e53-bdb5-64c5a1b67ae5`; aliases: Cleotis Pendarvis (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 176.8, 186.2
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_176.8_vs_175.2_on_2024-07-02, same_venue
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) | B: support: commission, venue; caveats: workbench advice hold

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-08-20 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2024/Country-Box_8-20](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Country-Box_8-20.pdf) | 176.8 | Isaac Carbonnell | needs:Isaac Carbonnell | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2025-09-02 Jimmy Adams at The Troubadour (corner b) | [tn-results:2025/CountryBox_9-2](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_9-2.pdf) | 186.2 | Deion Pruitt | needs:Deion Pruitt | C insufficient_graph_evidence:jurisdiction+venue | B | - |

### #276 John Williams (TN)

- Proposed canonical boxer: John Williams `27bf0470-222c-4edc-a6f2-0905a851fc78`; aliases: John Williams (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Sir Williams [-]; Caleb Williams [-]; Khary Williams [-]; Craig Williams [-]; Corey Williams [-]; De Von Williams [-]; Larry Williams [-]; Vaughn Williams [-]
- Unlocks: 0 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 153.2, 144.6
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_144.6_vs_146.6_on_2023-05-06
- Evidence AGAINST: danger:common_surname (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence | B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-02-05 Brandi McCain at Winfield Dunn Cent (corner b) | [tn-results:2022/1-1-6-BOXING-RESULTS_2-5-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/1-1-6-BOXING-RESULTS_2-5-22.pdf) | 153.2 | Harold Jackson | needs:Harold Jackson | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-10-01 Brandi McCain at Memphis Agricenter (corner b) | [tn-results:2022/One-One-Six-Boxing-Promotions_10-01-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/One-One-Six-Boxing-Promotions_10-01-22.pdf) | 144.6 | Dyron Words | needs:Dyron Words | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #277 Lawrence Donald (TN)

- Proposed canonical boxer: Lawrence Donald `04bbeb80-e84f-4fa6-b9b2-e7b4ccd6160a`; aliases: Lawrence Donald (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Larry Donald [-]; La ’ Vay Lawrence [-]; Donald Ward [-]
- Unlocks: 0 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 139.2, 140.8
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2), weight_139.2_vs_137.8_on_2023-06-30
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: A: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) | D: the printed name plus one family only (commission): not independent evidence

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-07-01 Matt Young at Ole Smoky Distillery (corner a) | [tn-results:2022/Tri-Star-Boxing_7-1-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing_7-1-22.pdf) | 139.2 | Decorian Dodson | needs:Decorian Dodson | C insufficient_graph_evidence:jurisdiction+weight | A | - |
| 2020-01-16 Matt Young at Nashville Fairgrou (corner a) | [tn-results:2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020.pdf) | 140.8 | Anthony Woods | needs:Anthony Woods | C insufficient_graph_evidence:jurisdiction | D | - |

### #278 Alex Martin (PA)

- Proposed canonical boxer: Alex Martin `30fa501f-6fbb-4bf2-8ad6-7287eb79f21d`; aliases: Alex Martin (name, verified); verified prior bouts: 1; hometowns: IN; commissions: pa-state-athletic-commission
- Competing candidates: Alexander Martin [-]; Martin Diaz [-]; Frank Lamar Martin [-]; Martin Brown [-]; Tray Martin [-]; Josh Martin [-]; Alex Maldanado [-]; Ryan Martin [-]; James Martin [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: IN; official weights: 140
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_140_vs_146.8_on_2026-07-11, same_commission:pa-state-athletic-commission
- Evidence AGAINST: danger:common_surname
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-11 Brian Costello at 2300 Arena (corner a) | [pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf) | 140 | Juan Rivera | needs:Juan Rivera | C insufficient_graph_evidence:jurisdiction+weight | B | 003 |

### #279 Chase Wilson (TN)

- Proposed canonical boxer: Chase Wilson `387704a4-ea1e-4661-92e1-e37a744d1f2a`; aliases: Chase Wilson (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Famous Wilson [-]; Anthony Wilson [-]; Wilson Akinocho [-]; Ryan Wilson [-]; William Wilson [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 164.8
- Evidence FOR: name_exact, weight_164.8_vs_167_on_2023-04-29, same_commission:tn-athletic-commission
- Evidence AGAINST: danger:common_surname, no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-10-01 Brandi McCain at Memphis Agricenter (corner a) | [tn-results:2022/One-One-Six-Boxing-Promotions_10-01-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/One-One-Six-Boxing-Promotions_10-01-22.pdf) | 164.8 | Marcell Sams Jr | needs:Marcell Sams Jr | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #280 Iman Lee (TN)

- Proposed canonical boxer: Iman Lee `0648f945-cd1e-4bf1-b5ac-ec9ec24ba9b9`; aliases: Iman Lee (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 132
- Evidence FOR: name_exact, weight_132_vs_132.8_on_2024-02-06, same_commission:tn-athletic-commission, same_venue
- Evidence AGAINST: danger:common_surname, no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: B: support: weight, commission, venue; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-12-05 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/Country-Box_12-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Country-Box_12-5.pdf) | 132 | Weusi Johnson | needs:Weusi Johnson | C insufficient_graph_evidence:jurisdiction+venue+weight | B | - |

### #281 Jaylin Strong (MO)

- Proposed canonical boxer: Jaylin Strong `83bff2f1-e745-488d-8e72-8b160106dc7c`; aliases: Jaylin Strong (name, verified); verified prior bouts: 1; hometowns: Decatur, AL; commissions: fl-athletic-commission
- Competing candidates: none
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: Decatur, AL; official weights: 146.9
- Evidence FOR: name_exact, hometown_same_city:decatur, al, weight_146.9_vs_146.6_on_2026-01-24
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: B: support: hometown, weight; caveats: workbench advice hold

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-02-28 Carden Combat Sports Promotions at Good Time Events Center (corner b) | [mo-results:2026-02-28 BOXRES Carden Combat Sports St. Joseph](https://pr.mo.gov/boards/athletics/boxingresults/2026-02-28%20BOXRES%20Carden%20Combat%20Sports%20St.%20Joseph.pdf) | 146.9 | Dakoda Eighmy | needs:Dakoda Eighmy | C insufficient_graph_evidence:hometown+weight | B | 003 |

### #282 Jordy Suarez Gonzalez (TN)

- Proposed canonical boxer: Jordy Suarez Gonzalez `1d85f95e-abdf-4746-8e7f-9a0231301dee`; aliases: Jordy Suarez Gonzalez (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Johan Gonzalez [-]; Jorge Gonzalez [-]; Peter Gonzalez [-]; Julian Gonzalez Sanchez [-]; Andy Gonzalez [-]; Carlos Gonzalez [-]; Frank Gonzalez [-]; Elijah Gonzalez [-]; Ethan Gonzalez [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 134.8
- Evidence FOR: name_exact, weight_134.8_vs_141_on_2024-09-03, same_commission:tn-athletic-commission
- Evidence AGAINST: danger:common_surname, no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-10-07 Jimmy Adams at The Troubadour (corner a) | [tn-results:2025/CountryBox_10-7](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_10-7.pdf) | 134.8 | Gregory Lee | needs:Gregory Lee | C insufficient_graph_evidence:jurisdiction+weight | B | - |

### #283 Shakeem Williams (PA)

- Proposed canonical boxer: Shakeem Williams `b4282699-9d2f-4670-8dd9-76cd44369362`; aliases: Shakeem Williams (name, verified); verified prior bouts: 1; hometowns: PA; commissions: pa-state-athletic-commission
- Competing candidates: Sir Williams [-]; John Williams [-]; Sirarminius Williams [-]; Caleb Williams [-]; Craig Williams [-]; Steven Williams [-]; Corey Williams [-]; De Von Williams [-]; Larry Williams [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: PA; official weights: 195.6
- Evidence FOR: name_exact, hometown_same_region_only(not_decisive), weight_195.6_vs_194.2_on_2026-06-13, same_commission:pa-state-athletic-commission
- Evidence AGAINST: danger:same_surname_same_region_different_given_name, danger:common_surname
- Uncertainty: -
- Class reasons: B: support: weight, commission; caveats: same_surname_same_region_different_given_name, common_surname

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-07 Chris Coyne at MOHEGAN SUN - Wilkes Barre (corner a) | [pa-results:2026:03-07-26 box coyne - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20coyne%20-%20results.pdf) | 195.6 | Vladimir Dalton | needs:Vladimir Dalton | C insufficient_graph_evidence:jurisdiction+weight | B | 003 |


## Class C (5)

### #104 Daevion Williams (MO)

- Proposed canonical boxer: De Von Williams `d7f58a44-9276-4417-8b4c-e4bbcd5777b8`; aliases: De Von Williams (name, verified), DeVon Williams (name, review); verified prior bouts: 2; hometowns: Fort Lauderdale, FL / Fort Lauderdale, FL.; commissions: fl-athletic-commission
- Competing candidates: Sir Williams [-]; John Williams [-]; La'Trevin Williams [-]; Larry Williams [-]; Devonte Williams [-]; Hylon Williams, Jr [-]; Darion Williams [-]; Dante Williams [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: St. Louis, MO; official weights: 183.2
- Evidence FOR: name_transliteration
- Evidence AGAINST: given_name_differs, hometown_different_city:st louis, mo vs fort lauderdale, fl, weight_183.2_vs_144.8_on_2026-04-12, danger:name_not_exact_form, danger:given_name_differs, danger:common_surname, danger:stated_place_mismatch
- Uncertainty: -
- Class reasons: C: official weight incompatible with the candidate's record: weight_183.2_vs_144.8_on_2026-04-12

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-21 Box Culture Promotions at Ambassador Club (corner b) | [mo-results:2026-03-21 BOXRES St. Louis Box Culture Promotions](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-21%20BOXRES%20St.%20Louis%20Box%20Culture%20Promotions.pdf) | 183.2 | Cesar Miranda | bout_now | C contradiction:hometown_different_city+weight_incompatible | C | 003 |

### #105 Oliver Thomas (TN)

- Proposed canonical boxer: Thomas Oliveira `ba3bba41-74ae-4e43-b569-781c09edfe79`; aliases: Thomas Oliveira (name, verified); verified prior bouts: 1; hometowns: Brazil; commissions: fl-athletic-commission
- Competing candidates: Thomas Hawkins [-]; Chris Thomas [-]; Thomas Santiago [-]; Thomas Parker [-]; Thomas Miller [-]; Julius Thomas [-]; Cuttino Oliver [-]; Jason Thomas [-]; Oliver McCall [-]
- Unlocks: 1 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: none printed; official weights: 117.2
- Evidence FOR: name_transliteration
- Evidence AGAINST: given_name_differs, weight_117.2_vs_183.8_on_2026-08-22, danger:name_not_exact_form, danger:given_name_differs, no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: C: official weight incompatible with the candidate's record: weight_117.2_vs_183.8_on_2026-08-22

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-10-25 Lamont Ingram at Prestige Bistro (corner b) | [tn-results:2025/Champions-Enterprise_10-25](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Champions-Enterprise_10-25.pdf) | 117.2 | Alex Maldanado | bout_now | C contradiction:weight_incompatible | C | - |

### #284 Danny Barlow (TN)

- Proposed canonical boxer: Danny Barlow `c3d977c5-ad73-4b9c-b24e-b4a648cabb1a`; aliases: Danny Barlow (name, verified); verified prior bouts: 2; hometowns: Tennessee; commissions: fl-athletic-commission
- Competing candidates: Danny Bodish [-]
- Unlocks: 0 bout(s) alone; 2 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 213.2, 213.2
- Evidence FOR: name_exact (x2)
- Evidence AGAINST: weight_213.2_vs_250.8_on_2026-06-26 (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: C: official weight incompatible with the candidate's record: weight_213.2_vs_250.8_on_2026-06-26 (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-05-23 Danny Vella at Municipal Auditorium (corner a) | [tn-results:2026/TeamBoxingLeague_5-23](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/TeamBoxingLeague_5-23.pdf) | 213.2 | Skylar Lacy | needs:Skylar Lacy | C contradiction:weight_incompatible | C | - |
| 2026-05-23 Danny Vella at Municipal Auditorium (corner a) | [tn-results:2026/TeamBoxingLeague_5-23](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/TeamBoxingLeague_5-23.pdf) | 213.2 | Skylar Lacy | needs:Skylar Lacy | C contradiction:weight_incompatible | C | - |

### #285 Deontay Brown (TN)

- Proposed canonical boxer: Deonte Brown `40ae0fb5-c979-4994-8f73-97affe4a8a25`; aliases: Deonte Brown (name, verified); verified prior bouts: 1; hometowns: TX; commissions: pa-state-athletic-commission
- Competing candidates: Kevon Brown [-]; Frank Brown [-]; Tiara Brown [-]; Sa'Rai Brown-El [-]
- Unlocks: 0 bout(s) alone; 2 more only together with 1 other held identity; decisions required: 2
- Place evidence: none printed; official weights: 151, 151
- Evidence FOR: name_transliteration (x2)
- Evidence AGAINST: given_name_differs (x2), weight_151_vs_130_on_2026-05-29 (x2), danger:name_not_exact_form (x2), danger:given_name_differs (x2), danger:common_surname (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: C: official weight incompatible with the candidate's record: weight_151_vs_130_on_2026-05-29 (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-09 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 151 | Ryan Martin | needs:Ryan Martin | C contradiction:weight_incompatible | C | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 151 | Ryan Martin | needs:Ryan Martin | C contradiction:weight_incompatible | C | - |

### #286 Jaylen Green (TN)

- Proposed canonical boxer: Jaylen Green `bd7e8ad4-ec93-4d8b-b9dc-48da04eb29e6`; aliases: Jaylen Green (name, verified); verified prior bouts: 1; hometowns: Saint Louis, MO; commissions: fl-athletic-commission
- Competing candidates: Jaylen Jones [-]; Tobias Green [-]; Tariq Green [-]
- Unlocks: 0 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 1
- Place evidence: none printed; official weights: 186
- Evidence FOR: name_exact
- Evidence AGAINST: weight_186_vs_161.8_on_2026-05-16, no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: C: official weight incompatible with the candidate's record: weight_186_vs_161.8_on_2026-05-16

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-03 Jimmy Adams at Plaza Mariachi (corner b) | [tn-results:2026/Jimmy-Adams-Boxing_3-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/Jimmy-Adams-Boxing_3-3.pdf) | 186 | Julius Daniel | needs:Julius Daniel | C contradiction:weight_incompatible | C | - |


## Class D (361)

### #8 Dedrick Bell (TN)

- Proposed canonical boxer: Dedrick Bell `7de2bd04-55f9-44b1-bf61-953c631f3b5a`; aliases: Dedrick Bell (name, verified); verified prior bouts: 0; hometowns: Memphis, TN; commissions: -
- Competing candidates: Dustin Bailey [-]; Daniel Bailey [-]
- Unlocks: 4 bout(s) alone; 6 more only together with 5 other held identities; decisions required: 10
- Place evidence: none printed; official weights: 151.4, 163.2, 153.4, 162.2, 151.8, 149.5, 163.2, 153.6, 152.2, 152.2
- Evidence FOR: name_exact (x10)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x10)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2020-11-07 Matthew Young at Camp Jordan (corner a) | [tn-results:2020/TRI-STAR-OFFICIAL-RESULTS_11-7-2020F](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2020/TRI-STAR-OFFICIAL-RESULTS_11-7-2020F.pdf) | 151.4 | Phillip Lars | bout_now | C insufficient_graph_evidence:none | D | - |
| 2021-02-13 Matt Young at The Notes Lounge (corner a) | [tn-results:2021/TRI-STAR-SATURDAY-NIGHT-FIGHTS-BORO_OFFICIAL-RESULTS_2-13-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR-SATURDAY-NIGHT-FIGHTS-BORO_OFFICIAL-RESULTS_2-13-21.pdf) | 163.2 | Marcus Perkins | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-05-21 Matt Young at Beast Mode Sports Co (corner a) | [tn-results:2022/TRI-STAR-BOXING-OFFICIAL-RESULTS_5-21-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING-OFFICIAL-RESULTS_5-21-22.pdf) | 153.4 | Thomas Miller | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-11-09 Matt Young at Municipal Auditorium (corner b) | [tn-results:2025/Tri-Star_11-9](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Tri-Star_11-9.pdf) | 162.2 | Amir Anderson | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-02-26 Matthew Young at Beast Mode Fitness (corner a) | [tn-results:2022/TRI-STAR-BOXING_OFFICIAL-RESULTS_2-26-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_OFFICIAL-RESULTS_2-26-22.pdf) | 151.8 | Ariel Vasquez | needs:Ariel Vasquez | C insufficient_graph_evidence:none | D | - |
| 2025-01-17 Matt Young at Renasant Convention (corner a) | [tn-results:2025/TRI-STAR-BOXING_1-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TRI-STAR-BOXING_1-17.pdf) | 149.5 | Izale Kimble | needs:Izale Kimble | C insufficient_graph_evidence:none | D | - |
| 2025-03-04 Jimmy Adams at The Troubadour (corner a) | [tn-results:2025/CountryBox_3-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_3-4.pdf) | 163.2 | Aaron Anderson | needs:Aaron Anderson | C insufficient_graph_evidence:none | D | - |
| 2025-05-23 Matthew Young at Renasant Convention (corner a) | [tn-results:2025/Tri-Star-Boxing_5-23](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Tri-Star-Boxing_5-23.pdf) | 153.6 | Phillip Lars | needs:Phillip Lars | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 152.2 | Amin Mitchell | needs:Amin Mitchell | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 152.2 | Amin Mitchell | needs:Amin Mitchell | C insufficient_graph_evidence:none | D | - |

### #11 Roger Hilley (TN)

- Proposed canonical boxer: Roger Hilley `e900fefa-b2b7-462d-bad3-996daeb8a415`; aliases: Roger Hilley (name, verified); verified prior bouts: 2; hometowns: Tennessee; commissions: fl-athletic-commission
- Competing candidates: Robert Hall Jr [-]; Rasuiod Hollie [-]
- Unlocks: 3 bout(s) alone; 9 more only together with 7 other held identities; decisions required: 12
- Place evidence: none printed; official weights: 136.2, 139, 138, 14, 135.4, 138.2, 139, 138, 138, 135.6, 140.6, 140.6
- Evidence FOR: name_exact (x12), weight_138_vs_140_on_2026-06-26 (x3), weight_140.6_vs_140_on_2026-06-26 (x2), weight_135.6_vs_140_on_2026-06-26
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x6) | D: the printed name plus one family only (weight): not independent evidence (x6)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-06-12 Matt Young at Camp Jordan Arena (corner a) | [tn-results:2021/TRI-STAR-OFFICIAL-RESULTS_6-12-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR-OFFICIAL-RESULTS_6-12-21.pdf) | 136.2 | Augustine Mauras | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-06-11 Matt Young at Montague Park (corner a) | [tn-results:2022/Tri-Star-Boxing_RESULTS_6-11-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing_RESULTS_6-11-22.pdf) | 139 | Jonatan Goday | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 138 | Sherbek Rakhmatulloev | bout_now | C insufficient_graph_evidence:weight | D | - |
| 2022-02-19 Matthew Young at Ymca Y- Cap (corner a) | [tn-results:2022/Tri-Star-Boxing-OFFICIAL-RESULTS_2-19-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing-OFFICIAL-RESULTS_2-19-22.pdf) | 14 | Dwayne Wisdom | needs:Dwayne Wisdom | C insufficient_graph_evidence:none | D | - |
| 2023-05-06 Matthew Young at Chattanooga Conventi (corner a) | [tn-results:2023/Tri-Star_Boxing_5-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Tri-Star_Boxing_5-6.pdf) | 135.4 | Oscar Bravo | needs:Oscar Bravo | C insufficient_graph_evidence:none | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 138.2 | Doctress Robinson | needs:Doctress Robinson | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Miami-V-Nashville](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Miami-V-Nashville.pdf) | 139 | Claudio Marrero | needs:Claudio Marrero | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 138 | Sherbek Rakhmatulloev | needs:Sherbek Rakhmatulloev | C insufficient_graph_evidence:weight | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 138 | Sherbek Rakhmatulloev | needs:Sherbek Rakhmatulloev | C insufficient_graph_evidence:weight | D | - |
| 2025-09-06 Wilfredo Santiago Jr. at Chat. Convention Cent (corner a) | [tn-results:2025/TOP-TIER-PROMOTIONS-BOXING_9-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TOP-TIER-PROMOTIONS-BOXING_9-6.pdf) | 135.6 | Jerome Rodriguez | needs:Jerome Rodriguez | C insufficient_graph_evidence:weight | D | - |
| 2026-05-23 Danny Vella at Municipal Auditorium (corner a) | [tn-results:2026/TeamBoxingLeague_5-23](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/TeamBoxingLeague_5-23.pdf) | 140.6 | Alexy De La Cruz | needs:Alexy De La Cruz | C insufficient_graph_evidence:weight | D | - |
| 2026-05-23 Danny Vella at Municipal Auditorium (corner a) | [tn-results:2026/TeamBoxingLeague_5-23](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/TeamBoxingLeague_5-23.pdf) | 140.6 | Alexy De La Cruz | needs:Alexy De La Cruz | C insufficient_graph_evidence:weight | D | - |

### #12 Doctress Robinson (TN)

- Proposed canonical boxer: Doctress Robinson `f1b9fc89-b795-471e-bd2e-7beb62e5d5f5`; aliases: Doctress Robinson (name, verified); verified prior bouts: 2; hometowns: New Orleans, LA; commissions: fl-athletic-commission
- Competing candidates: Robinson Donato Conceicao [-]; Desley Robinson [-]; Robinson Perez [-]; Brandi Robinson [-]; Muhammad Robinson [-]; Ray Ray Robinson [-]; Jeremiah Robinson [-]
- Unlocks: 3 bout(s) alone; 3 more only together with 3 other held identities; decisions required: 6
- Place evidence: none printed; official weights: 136.8, 136.8, 142.2, 136.4, 136.4, 142.2
- Evidence FOR: name_exact (x6)
- Evidence AGAINST: danger:common_surname (x6), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_14.2lb(neutral) (x2), weight_gap_8.8lb(neutral) (x2), weight_gap_14.6lb(neutral) (x2)
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x6)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 136.8 | Jak Sambiaku Banzoy | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 136.8 | Malik Samar Lark | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 142.2 | Andre Ewell | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 136.4 | Austin Dulay | needs:Austin Dulay | C insufficient_graph_evidence:none | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 136.4 | Roger Hilley | needs:Roger Hilley | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 142.2 | Sean Bates | needs:Sean Bates | C insufficient_graph_evidence:none | D | - |

### #13 Curtis Harper (TN)

- Proposed canonical boxer: Curtis Harper `69df489f-3405-41c2-a88a-4e674c320591`; aliases: Curtis Harper (name, verified); verified prior bouts: 1; hometowns: Jacksonville, FL; commissions: fl-athletic-commission
- Competing candidates: none
- Unlocks: 3 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 266.4, 267.6, 264.6, 270.4, 267.6
- Evidence FOR: name_exact (x5), weight_264.6_vs_270.2_on_2026-03-21
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x4) | D: the printed name plus one family only (weight): not independent evidence

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-05-07 Jimmy Adams at The Troubadour (corner a) | [tn-results:2024/COUNTRY-BOX_5-7](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNTRY-BOX_5-7.pdf) | 266.4 | Kaleb Slaughter | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-09-03 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2024/CountryBox_9-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_9-3.pdf) | 267.6 | Antwuan Tubbs | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-17 Christine Salters at Fat Bottom Brewer y (corner a) | [tn-results:2025/Martin-Promo-Boxing_5-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Martin-Promo-Boxing_5-17.pdf) | 264.6 | Dell Long | bout_now | C insufficient_graph_evidence:weight | D | - |
| 2024-08-20 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2024/Country-Box_8-20](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Country-Box_8-20.pdf) | 270.4 | Deon Ronny Hale | needs:Deon Ronny Hale | C insufficient_graph_evidence:none | D | - |
| 2024-12-03 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/CountryBox_12-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_12-3.pdf) | 267.6 | Francios Russell | needs:Francios Russell | C insufficient_graph_evidence:none | D | - |

### #14 Weusi Johnson (TN)

- Proposed canonical boxer: Weusi Johnson `d585935a-98e1-4d0e-b5c6-60bcbe040e38`; aliases: Weusi Johnson (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Rakim Johnson [-]; Rayford Johnson [-]; Erion Johnson [-]; Richard Johnson [-]; Kemper Johnson [-]; Tracey Johnson [-]; Tony Johnson Jr. [-]; Anthony Johnson Jr. [-]; Isaiah Johnson [-]
- Unlocks: 3 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 124.6, 130.8, 134.2, 128, 126.4
- Evidence FOR: name_exact (x5)
- Evidence AGAINST: danger:common_surname (x5), no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x5)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-02-06 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2024/Jimmy-Adams-Boxing_2-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Jimmy-Adams-Boxing_2-6.pdf) | 124.6 | Elon de Jesus | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-09-17 Jimmy Adams at Texas Troubadour (corner b) | [tn-results:2024/CountryBox_9-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_9-17.pdf) | 130.8 | Koby Khalil Williams | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-12-17 Jimmy Adams at Texas Troubadour (corner b) | [tn-results:2024/CountryBox_12-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_12-17.pdf) | 134.2 | DeMichael Harris | bout_now | C insufficient_graph_evidence:none | D | - |
| 2023-12-05 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2023/Country-Box_12-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Country-Box_12-5.pdf) | 128 | Iman Lee | needs:Iman Lee | C insufficient_graph_evidence:none | D | - |
| 2025-05-17 Christine Salters at Fat Bottom Brewer y (corner b) | [tn-results:2025/Martin-Promo-Boxing_5-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Martin-Promo-Boxing_5-17.pdf) | 126.4 | Victor Hernandez | needs:Victor Hernandez | C insufficient_graph_evidence:none | D | - |

### #15 Devin Parrish (TN)

- Proposed canonical boxer: Devin Parrish `9f3c781d-d557-47f4-8d7f-c227282e6f9f`; aliases: Devin Parrish (name, verified); verified prior bouts: 1; hometowns: Wauconda, IL; commissions: fl-athletic-commission
- Competing candidates: Devin Price [-]; Devin Gantt [-]
- Unlocks: 3 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 3
- Place evidence: none printed; official weights: 150.8, 148.8, 148.8
- Evidence FOR: name_exact (x3), weight_148.8_vs_148.6_on_2026-02-19 (x2)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (weight): not independent evidence (x2) | D: the printed name is the only link (no official-weight, commission, venue or opponent support)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-12-17 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/CountryBox_12-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_12-17.pdf) | 150.8 | Jamar McClain | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-02-04 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2025/CountryBox_2-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_2-4.pdf) | 148.8 | Khary Williams | bout_now | C insufficient_graph_evidence:weight | D | - |
| 2025-05-17 Christine Salters at Fat Bottom Brewer y (corner a) | [tn-results:2025/Martin-Promo-Boxing_5-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Martin-Promo-Boxing_5-17.pdf) | 148.8 | Stevenson Thomas | bout_now | C insufficient_graph_evidence:weight | D | - |

### #16 Keith Rydell Mayes Jr (TN)

- Proposed canonical boxer: Keith Rydell Mayes `8db6251b-786d-4318-9e12-9739e284eca4`; aliases: Keith Rydell Mayes (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Keith [-]; Rydell Mayes Jr [-]; Keith Criddell [-]
- Unlocks: 3 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 3
- Place evidence: none printed; official weights: 229.8, 197, 252.8
- Evidence FOR: name_containment (x3), same_commission:tn-athletic-commission (x3), weight_252.8_vs_254.6_on_2023-08-12
- Evidence AGAINST: danger:generational_suffix (x3), danger:name_not_exact_form (x3), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: name form containment only (x3)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-02-12 Matt Young at The Notes Lounge (corner b) | [tn-results:2021/TRI-STAR-FRIDAY-NIGHT-FIGHTS-BORO_OFFICIAL-RESULTS_2-12-21-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR-FRIDAY-NIGHT-FIGHTS-BORO_OFFICIAL-RESULTS_2-12-21-1.pdf) | 229.8 | Jaden Booth | bout_now | C contradiction:suffix_missing | D | - |
| 2021-09-17 Matthew Young at Fairgrounds Nashville (corner a) | [tn-results:2021/TRI-STAR-BOXING-OFFICIAL-RESULTS_9-17-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/TRI-STAR-BOXING-OFFICIAL-RESULTS_9-17-21.pdf) | 197 | Turner Williams | bout_now | C contradiction:suffix_missing | D | - |
| 2024-03-05 Jimmy Adams at Texas Toubadour Thea (corner a) | [tn-results:2024/COUNRTY-BOX_3-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNRTY-BOX_3-5.pdf) | 252.8 | Ritchie Cherry | bout_now | C contradiction:suffix_missing | D | - |

### #26 Austin Dulay (TN)

- Proposed canonical boxer: Austin Dulay `4729dbfe-332a-4794-9dba-645bb2d92528`; aliases: Austin Dulay (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Dustin Long [-]; Austin Blake Deanda [-]; Austin Vasquez [-]; Austin McBroom [-]; Austin Lajiness [-]; Austin Rivas [-]; Austin Williams [-]
- Unlocks: 2 bout(s) alone; 5 more only together with 4 other held identities; decisions required: 7
- Place evidence: none printed; official weights: 134.2, 135.6, 138.2, 137.4, 141.2, 141.2, 142.2
- Evidence FOR: name_exact (x7), same_commission:tn-athletic-commission (x7)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x7)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-07-22 Tri-Star Boxing at Municipal Auditorium (corner a) | [tn-results:2023/Tri-Star-Boxing_7-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Tri-Star-Boxing_7-22.pdf) | 134.2 | Juan Carlos Pena | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2023-12-01 Matt Young at Fairgrounds Nashville (corner a) | [tn-results:2023/TriStar-Boxing_12-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TriStar-Boxing_12-1.pdf) | 135.6 | Mario Ezequiil Lozano | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 138.2 | Doctress Robinson | needs:Doctress Robinson | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Miami-V-Nashville](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Miami-V-Nashville.pdf) | 137.4 | Claudio Marrero | needs:Claudio Marrero | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 141.2 | Ryan Zempoaltecatl | needs:Ryan Zempoaltecatl | C insufficient_graph_evidence:jurisdiction | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 141.2 | Ryan Zempoaltecatl | needs:Ryan Zempoaltecatl | C insufficient_graph_evidence:jurisdiction | D | - |
| 2026-05-23 Danny Vella at Municipal Auditorium (corner a) | [tn-results:2026/TeamBoxingLeague_5-23](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/TeamBoxingLeague_5-23.pdf) | 142.2 | Hebreux Francois | needs:Hebreux Francois | C insufficient_graph_evidence:jurisdiction | D | - |

### #27 Vaughn Alexander (TN)

- Proposed canonical boxer: Vaughn Alexander `2a7c553d-299e-4e95-b3b7-a7a14a5941f8`; aliases: Vaughn Alexander (name, verified); verified prior bouts: 0; hometowns: Saint Louis, MO; commissions: -
- Competing candidates: Alexander Martin [-]; Alexander Collado [-]; Alexander Schenk [-]; Stanley Alexander [-]; Alexander Rios Vega [-]; Alvin Alexander Varmall Jr. [-]; Alexander Flores [-]; Alexander Theil [-]; Alexander Espinoza [-]
- Unlocks: 2 bout(s) alone; 5 more only together with 4 other held identities; decisions required: 7
- Place evidence: none printed; official weights: 162.6, 163.4, 166.4, 163.6, 163.6, 162.6, 163.4
- Evidence FOR: name_exact (x7)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x7)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 162.6 | Adolphe Stephens | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 163.4 | Corey Caad | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-02-04 Jimmy Adams at Texas Troubadour (corner b) | [tn-results:2025/CountryBox_2-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_2-4.pdf) | 166.4 | Maidel Sando | needs:Maidel Sando | C insufficient_graph_evidence:none | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 163.6 | Isaiah Elrod | needs:Isaiah Elrod | C insufficient_graph_evidence:none | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 163.6 | Isaiah Elrod | needs:Isaiah Elrod | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 162.6 | Adolphe Stephens | needs:Adolphe Stephens | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 163.4 | Corey Caad | needs:Corey Caad | C insufficient_graph_evidence:none | D | - |

### #28 Yoelys Leal Molina (TN)

- Proposed canonical boxer: Yoelys Leal Molina `40ca57f2-7b69-46ac-8ed2-81c0b2d64d89`; aliases: Yoelys Leal Molina (name, verified); verified prior bouts: 0; hometowns: Cuba; commissions: -
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 4 more only together with 4 other held identities; decisions required: 6
- Place evidence: none printed; official weights: 148, 147.4, 159, 146.2, 151, 150.8
- Evidence FOR: name_exact (x6)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x6)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-08-08 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2023/Jimmy-Adams-Promotions_8-8](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Jimmy-Adams-Promotions_8-8.pdf) | 148 | Henry Hewig | bout_now | C insufficient_graph_evidence:none | D | - |
| 2026-01-06 Jimmy Adams at The Troubadour (corner a) | [tn-results:2026/JIMMY-ADAMS-BOXING_1-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/JIMMY-ADAMS-BOXING_1-6.pdf) | 147.4 | Ernest Davis | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-12-03 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/CountryBox_12-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_12-3.pdf) | 159 | JaShawn Hunter | needs:JaShawn Hunter | C insufficient_graph_evidence:none | D | - |
| 2024-12-17 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/CountryBox_12-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_12-17.pdf) | 146.2 | Cody Jenkins | needs:Cody Jenkins | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Miami-V-Nashville](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Miami-V-Nashville.pdf) | 151 | Orestes Velazquez | needs:Orestes Velazquez | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 150.8 | Lionel Omar Santana | needs:Lionel Omar Santana | C insufficient_graph_evidence:none | D | - |

### #29 Aaron Anderson (TN)

- Proposed canonical boxer: Aaron Anderson `506e1e9e-2f07-4d2d-bfbf-1990533c0e77`; aliases: Aaron Anderson (name, verified); verified prior bouts: 1; hometowns: MD; commissions: pa-state-athletic-commission
- Competing candidates: Aaron Lopez [-]; Amir Anderson [-]; Aaron Aponte [-]; Jardae Anderson [-]; Eric Anderson [-]; Aaron Bailey [-]; Michael Anderson [-]; Blair Anderson [-]; Aiden Anderson [-]
- Unlocks: 2 bout(s) alone; 3 more only together with 3 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 160, 165.6, 160.8, 167.6, 164.2
- Evidence FOR: name_exact (x5)
- Evidence AGAINST: danger:common_surname (x5), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x5)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-12-01 Matt Young at Fairgrounds Nashville (corner b) | [tn-results:2023/TriStar-Boxing_12-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TriStar-Boxing_12-1.pdf) | 160 | Macro Hall Jr | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-04-05 Sable Long at Holiday Inn (corner b) | [tn-results:2025/Strike-Fest_4-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Strike-Fest_4-5.pdf) | 165.6 | Leonardo Perez | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-01-17 Matt Young at Renasant Convention (corner b) | [tn-results:2025/TRI-STAR-BOXING_1-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TRI-STAR-BOXING_1-17.pdf) | 160.8 | Dyron Words | needs:Dyron Words | C insufficient_graph_evidence:none | D | - |
| 2025-02-01 Sable Long at Holiday Inn (corner b) | [tn-results:2025/Strikefest-Boxing_2-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Strikefest-Boxing_2-1.pdf) | 167.6 | Isaiah Elrod | needs:Isaiah Elrod | C insufficient_graph_evidence:none | D | - |
| 2025-03-04 Jimmy Adams at The Troubadour (corner b) | [tn-results:2025/CountryBox_3-4](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_3-4.pdf) | 164.2 | Dedrick Bell | needs:Dedrick Bell | C insufficient_graph_evidence:none | D | - |

### #30 Amin Mitchell (TN)

- Proposed canonical boxer: Amin Mitchell `c1989520-c6c0-43bc-91d2-2f1e0bbb4d72`; aliases: Amin Mitchell (name, verified); verified prior bouts: 0; hometowns: Atlanta, GA; commissions: -
- Competing candidates: Kahlil Mitchell [-]; Zayveon Mitchell [-]; Cornelius Mitchell [-]
- Unlocks: 2 bout(s) alone; 3 more only together with 2 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 156.4, 156, 156, 158, 158
- Evidence FOR: name_exact (x5)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x5)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 156.4 | Jeremiah Hinton | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 156 | Mauricio King | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 156 | Mauricio King | needs:Mauricio King | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 158 | Dedrick Bell | needs:Dedrick Bell | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 158 | Dedrick Bell | needs:Dedrick Bell | C insufficient_graph_evidence:none | D | - |

### #31 KeAndrae Leatherwood (TN)

- Proposed canonical boxer: KeAndrae Leatherwood `735bd931-5cbb-4fd1-a4c4-02f0cb666e75`; aliases: KeAndrae Leatherwood (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 3 more only together with 3 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 171.2, 170.8, 171.8, 171.2, 170.8
- Evidence FOR: name_exact (x5)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x5)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 171.2 | Jordan Jackson | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 170.8 | Marco Hall, Jr. | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 171.8 | Juan Barajas | needs:Juan Barajas | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 171.2 | Jordan Jackson | needs:Jordan Jackson | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 170.8 | Marco Hall, Jr. | needs:Marco Hall, Jr. | C insufficient_graph_evidence:none | D | - |

### #32 Ryan Zempoaltecatl (TN)

- Proposed canonical boxer: Ryan Zempoaltecatl `430dff44-7ada-467d-827c-e6cf5c15d2cd`; aliases: Ryan Zempoaltecatl (name, verified); verified prior bouts: 0; hometowns: South Fallsburg, NY; commissions: -
- Competing candidates: Nataly Zempoaltecatl [-]
- Unlocks: 2 bout(s) alone; 3 more only together with 2 other held identities; decisions required: 5
- Place evidence: none printed; official weights: 141.8, 141, 141.6, 143, 143
- Evidence FOR: name_exact (x5)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x5)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-10-01 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/Country-Box_10-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Country-Box_10-1.pdf) | 141.8 | David Lee DE Los Santos | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-11-05 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/COUNTRYBOX_11-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNTRYBOX_11-5.pdf) | 141 | Ryan Schwartzberg | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-11-19 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2024/CountryBox_11-19](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_11-19.pdf) | 141.6 | Raymond Chacon | needs:Raymond Chacon | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 143 | Austin Dulay | needs:Austin Dulay | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 143 | Austin Dulay | needs:Austin Dulay | C insufficient_graph_evidence:none | D | - |

### #33 Alissa Boltz (TN)

- Proposed canonical boxer: Alissa Boltz `09cccc3e-70da-454a-bb2b-bd11be9a80f5`; aliases: Alissa Boltz (name, verified); verified prior bouts: 1; hometowns: Minnesota; commissions: fl-athletic-commission
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 4
- Place evidence: none printed; official weights: 126.2, 120.2, 126.2, 120.2
- Evidence FOR: name_exact (x4), weight_126.2_vs_128.4_on_2026-05-01 (x2)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_8.2lb(neutral) (x2)
- Class reasons: D: the printed name plus one family only (weight): not independent evidence (x2) | D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 126.2 | Hailey Pennington | bout_now | C insufficient_graph_evidence:weight | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 120.2 | Jewry Rodriquez | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner b) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 126.2 | Hailey Pennington | needs:Hailey Pennington | C insufficient_graph_evidence:weight | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 120.2 | Jewry Rodriquez | needs:Jewry Rodriquez | C insufficient_graph_evidence:none | D | - |

### #34 Javier Frazier (TN)

- Proposed canonical boxer: Javier Frazier `8f1c059e-4e8a-4338-b722-50ea75e964bc`; aliases: Javier Frazier (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Francisco Javier Castro [-]; Javier Saul Meza [-]; Shaniqua Frazier [-]; Javier Mayoral [-]; Stacy Frazier [-]; Javier Martinez [-]
- Unlocks: 2 bout(s) alone; 2 more only together with 2 other held identities; decisions required: 4
- Place evidence: none printed; official weights: 175.4, 199.2, 199, 209.6
- Evidence FOR: name_exact (x4)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x4)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-02-06 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2024/Jimmy-Adams-Boxing_2-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Jimmy-Adams-Boxing_2-6.pdf) | 175.4 | Luis J Fernandez | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-12-17 Jimmy Adams at Texas Troubadour (corner b) | [tn-results:2024/CountryBox_12-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_12-17.pdf) | 199.2 | Jacob Yamazato | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-12-03 Sable Long at Happy Valley High Sch (corner a) | [tn-results:2022/Strike-Fest_12-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Strike-Fest_12-3.pdf) | 199 | Isaiah Elrod | needs:Isaiah Elrod | C insufficient_graph_evidence:none | D | - |
| 2023-08-08 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2023/Jimmy-Adams-Promotions_8-8](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Jimmy-Adams-Promotions_8-8.pdf) | 209.6 | Erick Arellano | needs:Erick Arellano | C insufficient_graph_evidence:none | D | - |

### #35 Ariele Davis (TN)

- Proposed canonical boxer: Ariele Davis `62e0f8dc-5a27-46ce-9166-e95ee62d7208`; aliases: Ariele Davis (name, verified); verified prior bouts: 2; hometowns: New Orleans, LA; commissions: fl-athletic-commission
- Competing candidates: Kyrone Davis [-]; Sanjay Davis [-]; Zavier Davis [-]; Ernest Davis [-]; Javonn Davis [-]; Will Davis [-]
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 145.2, 142.4, 142.4
- Evidence FOR: name_exact (x3), weight_142.4_vs_145.8_on_2026-05-01 (x2), weight_145.2_vs_145.8_on_2026-05-01
- Evidence AGAINST: danger:common_surname (x3), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (weight): not independent evidence (x3)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Atlanta-V-Dallas](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Atlanta-V-Dallas.pdf) | 145.2 | Martyna Krol | bout_now | C insufficient_graph_evidence:weight | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 142.4 | Latia Williams | bout_now | C insufficient_graph_evidence:weight | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner b) | [tn-results:2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-San-Antonio-Vs-Atlanta_5-30.pdf) | 142.4 | Latia Williams | needs:Latia Williams | C insufficient_graph_evidence:weight | D | - |

### #36 Avaughnda Ammons (TN)

- Proposed canonical boxer: Avaughnda Ammons `0e846d14-10ff-4245-a4d5-9de34a313a09`; aliases: Avaughnda Ammons (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 142.6, 143.6, 145
- Evidence FOR: name_exact (x3)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x3)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Miami-V-Nashville](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Miami-V-Nashville.pdf) | 142.6 | Tyler Schaefer | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-30 Dewey Cooper at The Pinnacle (corner a) | [tn-results:2025/Team-Combat-League-NYC-Vs-Nashville_5-30](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League-NYC-Vs-Nashville_5-30.pdf) | 143.6 | Stacia Suttles | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-04-06 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/TEAM-COMBAT-LEAGUE_4-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TEAM-COMBAT-LEAGUE_4-6.pdf) | 145 | Ariel Davis | needs:Ariel Davis | C insufficient_graph_evidence:none | D | - |

### #37 Francois Russell (TN)

- Proposed canonical boxer: Francois Russell `4439ef0b-933a-49ee-89f2-3814d0d81aa9`; aliases: Francois Russell (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Russell Harris [-]; Hebreux Francois [-]
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 247.8, 247.8, 251.4
- Evidence FOR: name_exact (x3)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x3)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-03-05 Jimmy Adams at Texas Toubadour Thea (corner b) | [tn-results:2024/COUNRTY-BOX_3-5](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNRTY-BOX_3-5.pdf) | 247.8 | Kahlil Smoot | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-05-07 Jimmy Adams at The Troubadour (corner b) | [tn-results:2024/COUNTRY-BOX_5-7](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/COUNTRY-BOX_5-7.pdf) | 247.8 | Fernando Cuza | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-12-02 Jimmy Adams at The Troubadour (corner b) | [tn-results:2025/CountryBox_12-2](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_12-2.pdf) | 251.4 | Nestor Santana | needs:Nestor Santana | C insufficient_graph_evidence:none | D | - |

### #38 Harold Jackson (TN)

- Proposed canonical boxer: Harold Jackson `094e76ed-cc4e-497e-9d55-0d2bb3599598`; aliases: Harold Jackson (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Darnell Jackson [-]; Anthony Jackson [-]; Jordan Jackson [-]; Deterious Jackson [-]; Darrius Jackson [-]; Jackson Rhodes [-]; Mandel Jackson [-]; Malik Jackson [-]; Nicholas Jackson [-]
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 153.6, 155.6, 155.8
- Evidence FOR: name_exact (x3)
- Evidence AGAINST: danger:common_surname (x3), no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x3)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-06-18 Brandi McCain at Memphis Ag Center (corner a) | [tn-results:2022/116-Boxing-Promotions_6-18](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/116-Boxing-Promotions_6-18.pdf) | 153.6 | Will Davis | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-10-01 Brandi McCain at Memphis Agricenter (corner a) | [tn-results:2022/One-One-Six-Boxing-Promotions_10-01-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/One-One-Six-Boxing-Promotions_10-01-22.pdf) | 155.6 | Jimmy Ford III | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-02-05 Brandi McCain at Winfield Dunn Cent (corner a) | [tn-results:2022/1-1-6-BOXING-RESULTS_2-5-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/1-1-6-BOXING-RESULTS_2-5-22.pdf) | 155.8 | John Williams | needs:John Williams | C insufficient_graph_evidence:none | D | - |

### #39 Jalyn Anthony (TN)

- Proposed canonical boxer: Jalyn Anthony `4f3e220b-ae42-4b87-b908-defacb61670f`; aliases: Jalyn Anthony (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Anthony Alston Jr. [-]; Anthony Jackson [-]; Anthony Muta [-]; Anthony Jones [-]; Anthony Johns [-]; Anthony Reeves [-]; Anthony Avila [-]; Anthony Woods [-]; Anthony Johnson Jr. [-]
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 177.2, 217.2, 202
- Evidence FOR: name_exact (x3)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x3)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-07-01 Matt Young at Ole Smoky Distillery (corner b) | [tn-results:2022/Tri-Star-Boxing_7-1-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing_7-1-22.pdf) | 177.2 | Robert Magee | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-01-17 Matt Young at Renasant Convention (corner b) | [tn-results:2025/TRI-STAR-BOXING_1-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TRI-STAR-BOXING_1-17.pdf) | 217.2 | James Tanksley | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-10-25 Sable Long at Holiday Inn (corner b) | [tn-results:2025/Strikefest-BOXING_10-25](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Strikefest-BOXING_10-25.pdf) | 202 | Kashaun Davis | needs:Kashaun Davis | C insufficient_graph_evidence:none | D | - |

### #40 Raymond Chacon (TN)

- Proposed canonical boxer: Raymond Chacon `1c139f51-273f-47b1-b3d5-0ee67cc41968`; aliases: Raymond Chacon (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Alfred Raymond [-]; Raymond Muratalla [-]
- Unlocks: 2 bout(s) alone; 1 more only together with 1 other held identity; decisions required: 3
- Place evidence: none printed; official weights: 133.8, 138.4, 139.2
- Evidence FOR: name_exact (x3)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x3)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-02-05 Brandi McCain at Winfield Dunn Cent (corner b) | [tn-results:2022/1-1-6-BOXING-RESULTS_2-5-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/1-1-6-BOXING-RESULTS_2-5-22.pdf) | 133.8 | Daniel Bailey | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-09-06 Wilfredo Santiago Jr. at Chat. Convention Cent (corner b) | [tn-results:2025/TOP-TIER-PROMOTIONS-BOXING_9-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TOP-TIER-PROMOTIONS-BOXING_9-6.pdf) | 138.4 | Joseph Francisco | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-11-19 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2024/CountryBox_11-19](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_11-19.pdf) | 139.2 | Ryan Zempoaltecatl | needs:Ryan Zempoaltecatl | C insufficient_graph_evidence:none | D | - |

### #41 Avious Griffin (TN)

- Proposed canonical boxer: Avios Griffin `f327c3a6-108c-49f9-9ff7-8bddadded350`; aliases: Avios Griffin (name, verified); verified prior bouts: 1; hometowns: NNV; commissions: pa-state-athletic-commission
- Competing candidates: David Griffith [-]; Dominique Griffin [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 149.7, 150
- Evidence FOR: name_transliteration (x2)
- Evidence AGAINST: given_name_differs (x2), danger:name_not_exact_form (x2), danger:given_name_differs (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: name form transliteration only (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-05-28 Tracy Crutcher-Kenne at 1st Horizon Pavillion (corner a) | [tn-results:2021/46Eleven-Boxing_5-28-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/46Eleven-Boxing_5-28-21.pdf) | 149.7 | Jair Garza | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-02-19 Matthew Young at Ymca Y- Cap (corner a) | [tn-results:2022/Tri-Star-Boxing-OFFICIAL-RESULTS_2-19-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing-OFFICIAL-RESULTS_2-19-22.pdf) | 150 | Marcelo Fabian Bzowski | bout_now | C insufficient_graph_evidence:none | D | - |

### #42 Brooke Mullen (PA)

- Proposed canonical boxer: Brooke Mullen `2a903bf9-156c-40c9-8832-723eaca6822b`; aliases: Brooke Mullen (name, verified); verified prior bouts: 1; hometowns: Pottstown, PA; commissions: nj-sacb
- Competing candidates: Brooke Evans [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 153.6, 147.8
- Evidence FOR: name_exact (x2), weight_153.6_vs_146.8_on_2026-09-04, weight_147.8_vs_146.8_on_2026-09-04
- Evidence AGAINST: none
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (weight): not independent evidence (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-04-03 James Bartley at The Archer (corner a) | [pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf) | 153.6 | Breona Vaughn | bout_now | C insufficient_graph_evidence:weight | D | 003 |
| 2026-06-20 Thomas Lamanna at 2300 Arena Philadelphia (corner a) | [pa-results:2026:06-20-26 box lamanna - 2300 arena - phila pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-20-26%20box%20lamanna%20-%202300%20arena%20-%20phila%20pa%20-%20results.pdf) | 147.8 | Miranda Barber | bout_now | C insufficient_graph_evidence:weight | D | 003 |

### #43 Cleveland Billingsly III (TN)

- Proposed canonical boxer: Cleveland Billingsly `701149e3-e374-43ab-a91d-5b9854c93559`; aliases: Cleveland Billingsly (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Cleveland Mclean [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 247.2, 247.4
- Evidence FOR: name_containment (x2), same_commission:tn-athletic-commission (x2), weight_247.2_vs_237.8_on_2020-11-07
- Evidence AGAINST: danger:generational_suffix (x2), danger:name_not_exact_form (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: name form containment only (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-05-28 Tracy Crutcher-Kenne at 1st Horizon Pavillion (corner a) | [tn-results:2021/46Eleven-Boxing_5-28-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/46Eleven-Boxing_5-28-21.pdf) | 247.2 | Satario Holdbrooks | bout_now | C contradiction:suffix_missing | D | - |
| 2022-09-17 Sable Long at Colboch Harley (corner b) | [tn-results:2022/Strike-Fest-10-BOXING_9-17-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Strike-Fest-10-BOXING_9-17-22.pdf) | 247.4 | Robert Hall Jr | bout_now | C contradiction:suffix_missing | D | - |

### #44 Decarlo Patton (TN)

- Proposed canonical boxer: Decarlo Patton `0c112863-e1b7-4492-9389-444832c24c9c`; aliases: Decarlo Patton (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 162.6, 165
- Evidence FOR: name_exact (x2)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2023-12-01 Matt Young at Fairgrounds Nashville (corner a) | [tn-results:2023/TriStar-Boxing_12-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/TriStar-Boxing_12-1.pdf) | 162.6 | Richard Marvels Jr | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-10-25 Lamont Ingram at Prestige Bistro (corner a) | [tn-results:2025/Champions-Enterprise_10-25](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Champions-Enterprise_10-25.pdf) | 165 | Earl Henry | bout_now | C insufficient_graph_evidence:none | D | - |

### #45 Demichael Harris (TN)

- Proposed canonical boxer: DeMichael Harris `2cf37d25-a1b5-490a-8765-d2c0569e016f`; aliases: DeMichael Harris (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Michael Harris [-]; Daryn Harris [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 135, 132.2
- Evidence FOR: name_exact (x2)
- Evidence AGAINST: danger:common_surname (x2), no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-04-16 Matt Young at Embassy Suites (corner a) | [tn-results:2022/TRI-STAR-BOXING_4-16-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_4-16-22.pdf) | 135 | Julio Garcia | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-07-01 Matt Young at Ole Smoky Distillery (corner a) | [tn-results:2022/Tri-Star-Boxing_7-1-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/Tri-Star-Boxing_7-1-22.pdf) | 132.2 | Christopher Nelson | bout_now | C insufficient_graph_evidence:none | D | - |

### #46 Dewayne Wisdom (TN)

- Proposed canonical boxer: Dewayne Wisdom `a88ddf5e-97cf-4c4d-acd8-9ca9a55bab33`; aliases: Dewayne Wisdom (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 133.2, 152.4
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2020-01-16 Matt Young at Nashville Fairgrou (corner b) | [tn-results:2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020.pdf) | 133.2 | Dominique Crowder | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2022-04-16 Matt Young at Embassy Suites (corner b) | [tn-results:2022/TRI-STAR-BOXING_4-16-22](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_4-16-22.pdf) | 152.4 | Luis Galarza | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |

### #47 Frank Brown (TN)

- Proposed canonical boxer: Frank Brown `41154703-bf66-4622-89a4-1110de283fad`; aliases: Frank Brown (name, verified); verified prior bouts: 1; hometowns: San Antonio, TX; commissions: fl-athletic-commission
- Competing candidates: Kevon Brown [-]; Rasheen Brown [-]; Carson Brown [-]; Deonte Brown [-]; Jahyae Brown [-]; Martin Brown [-]; Frank Barbley [-]; Tiara Brown [-]; Sa'Rai Brown-El [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 143.6, 146.8
- Evidence FOR: name_exact (x2), weight_146.8_vs_149.4_on_2026-08-29
- Evidence AGAINST: danger:common_surname (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) | D: the printed name plus one family only (weight): not independent evidence

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-09-03 Jimmy Adams at Texas Troubadour The (corner b) | [tn-results:2024/CountryBox_9-3](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_9-3.pdf) | 143.6 | Julian Bridges | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-12-02 Jimmy Adams at The Troubadour (corner b) | [tn-results:2025/CountryBox_12-2](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_12-2.pdf) | 146.8 | Isaiah Johnson | bout_now | C insufficient_graph_evidence:weight | D | - |

### #48 Isaac Carbonell (TN)

- Proposed canonical boxer: Isaac Carbonell `88690fc9-0d39-47e7-b9a1-67cb27f3016c`; aliases: Isaac Carbonell (name, verified); verified prior bouts: 1; hometowns: Nashville, TN; commissions: fl-athletic-commission
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 174, 175
- Evidence FOR: name_exact (x2)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-09-17 Jimmy Adams at Texas Troubadour (corner a) | [tn-results:2024/CountryBox_9-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_9-17.pdf) | 174 | Twon Smith | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-11-19 Jimmy Adams at Texas Troubadour The (corner a) | [tn-results:2024/CountryBox_11-19](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/CountryBox_11-19.pdf) | 175 | Antonio L. Hernandez | bout_now | C insufficient_graph_evidence:none | D | - |

### #49 Jesus Segundo Martinez (MO)

- Proposed canonical boxer: Jesus Segundo Martinez Carrascal `96fab8b3-8904-46ac-913a-56dccd435e08`; aliases: Jesus Segundo Martinez Carrascal (name, verified); verified prior bouts: 1; hometowns: Colombia; commissions: fl-athletic-commission
- Competing candidates: Eric Martinez [-]; Armando Martinez Rabi [-]; Javier Martinez [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: Miami, FL; official weights: 120.3, 120.8
- Evidence FOR: name_containment (x2), weight_120.3_vs_119.2_on_2026-08-16, weight_120.8_vs_119.2_on_2026-08-16
- Evidence AGAINST: danger:name_not_exact_form (x2), danger:common_surname (x2), danger:stated_place_mismatch (x2)
- Uncertainty: -
- Class reasons: D: name form containment only (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-03-20 KC Boxing Promotions at Truman Memorial Building (corner b) | [mo-results:2026-03-20 BOXRES Independence KC Boxing Promo](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-20%20BOXRES%20Independence%20KC%20Boxing%20Promo.pdf) | 120.3 | Kevin Soltero | bout_now | C insufficient_graph_evidence:weight | D | 003 |
| 2026-05-16 KC Boxing Promotions at Scottish Rite Temple (corner b) | [mo-results:2026-05-16 BOXRES Kansas City KC Boxing Promo](https://pr.mo.gov/boards/athletics/boxingresults/2026-05-16%20BOXRES%20Kansas%20City%20KC%20Boxing%20Promo.pdf) | 120.8 | Wilver Hernandez | bout_now | C insufficient_graph_evidence:weight | D | 003 |

### #50 Lemir Isom-Riley (PA)

- Proposed canonical boxer: Lemir Isom-Riley `3581e006-a5d9-4ab6-bdb3-2e12906521f4`; aliases: Lemir Isom-Riley (name, verified); verified prior bouts: 0; hometowns: PA; commissions: -
- Competing candidates: Jasir Riley [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 234.8, 244.5
- Evidence FOR: name_exact (x2), hometown_same_region_only(not_decisive) (x2)
- Evidence AGAINST: proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-01-17 Marshall Kauffman at 2300 Arena (corner a) | [pa-results:2026:01-17-26 - box - 2300 arena - phila. pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/01-17-26%20-%20box%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf) | 234.8 | Joel Caudle | bout_now | C insufficient_graph_evidence:none | D | 003 |
| 2026-07-18 John Richardson at Hollywood Casino - Meadows (corner b) | [pa-results:2026:07-18-26 box richardson - meadows casino - washington pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-18-26%20box%20richardson%20-%20meadows%20casino%20-%20washington%20pa%20%20-%20results.pdf) | 244.5 | Brian Mowry | bout_now | C insufficient_graph_evidence:none | D | 003 |

### #51 Marquez Greer (TN)

- Proposed canonical boxer: Marqueez Greer `157dda45-d988-4ae6-9a13-f4a0d5e43e2c`; aliases: Marqueez Greer (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Andre Marquez [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 158.1, 146.8
- Evidence FOR: name_transliteration (x2)
- Evidence AGAINST: given_name_differs (x2), danger:name_not_exact_form (x2), danger:given_name_differs (x2), no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: name form transliteration only (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2021-11-13 Josh Volner at Decatur County Conve (corner b) | [tn-results:2021/JV-BOXING-OFFICIAL-RESULTS_11-13-21](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/JV-BOXING-OFFICIAL-RESULTS_11-13-21.pdf) | 158.1 | Brendan Joe Bryant | bout_now | C insufficient_graph_evidence:none | D | - |
| 2022-12-10 Matt young at Beast Mode Sports Co (corner b) | [tn-results:2022/TRI-STAR-BOXING_12-10](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_12-10.pdf) | 146.8 | Kevon Brown | bout_now | C insufficient_graph_evidence:none | D | - |

### #52 Michael Lemelle (TN)

- Proposed canonical boxer: Michael Lemelle `250339cd-abdb-452a-a222-6890df18159f`; aliases: Michael Lemelle (name, verified); verified prior bouts: 1; hometowns: Fort Worth, TX; commissions: fl-athletic-commission
- Competing candidates: Michael Osumah [-]; Michael Cook [-]; Michael Ruiz [-]; Michael Harris [-]; Michael Jones [-]; Michelle Lopez [-]; Michael Seals [-]; Michael Garcia [-]; Michael Lee [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 168.6, 152
- Evidence FOR: name_exact (x2), weight_168.6_vs_165_on_2026-08-08
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_13.0lb(neutral)
- Class reasons: D: the printed name plus one family only (weight): not independent evidence | D: the printed name is the only link (no official-weight, commission, venue or opponent support)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-09-06 Wilfredo Santiago Jr. at Chat. Convention Cent (corner b) | [tn-results:2025/TOP-TIER-PROMOTIONS-BOXING_9-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TOP-TIER-PROMOTIONS-BOXING_9-6.pdf) | 168.6 | Kahlil Mithcell | bout_now | C insufficient_graph_evidence:weight | D | - |
| 2025-12-20 Ramon Arellano at San Jose Fiesta (corner b) | [tn-results:2025/Arellano-BOXING_12-20](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Arellano-BOXING_12-20.pdf) | 152 | Destyne Butler | bout_now | C insufficient_graph_evidence:none | D | - |

### #53 N’dira Spearman (TN)

- Proposed canonical boxer: Ndira Spearman `602b2228-61be-440c-b5be-b91271f9fff7`; aliases: Ndira Spearman (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 134, 122.8
- Evidence FOR: name_exact (x2)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2022-12-10 Matt young at Beast Mode Sports Co (corner b) | [tn-results:2022/TRI-STAR-BOXING_12-10](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2022/TRI-STAR-BOXING_12-10.pdf) | 134 | Keveon Ware | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-01-17 Matt Young at Renasant Convention (corner b) | [tn-results:2025/TRI-STAR-BOXING_1-17](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/TRI-STAR-BOXING_1-17.pdf) | 122.8 | Hunter Turbyfill | bout_now | C insufficient_graph_evidence:none | D | - |

### #54 Otabek Melikov (PA)

- Proposed canonical boxer: Otabek Melikov `fa1f2479-6349-45c9-9b63-bfa84962fb10`; aliases: Otabek Melikov (name, verified); verified prior bouts: 0; hometowns: PA; commissions: -
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 1
- Place evidence: PA; official weights: 123.8, 124.4
- Evidence FOR: name_exact (x2), hometown_same_region_only(not_decisive) (x2)
- Evidence AGAINST: proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2026-01-17 Marshall Kauffman at 2300 Arena (corner a) | [pa-results:2026:01-17-26 - box - 2300 arena - phila. pa - results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/01-17-26%20-%20box%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf) | 123.8 | Jose Torres | bout_now | C insufficient_graph_evidence:none | D | 003 |
| 2026-04-11 Brian Costello at 2300 Arena (corner a) | [pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf) | 124.4 | Irvin Rodriguez | bout_now | C insufficient_graph_evidence:none | D | 003 |

### #55 Rashad Hicks (TN)

- Proposed canonical boxer: Rashad Hicks `82236e62-095f-4f8a-8335-1d48f023bf70`; aliases: Rashad Hicks (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: Ricky Hicks [-]; Rashad Bogar [-]; Rashad Bowens [-]; Rashad Jones [-]; Joseph Hicks [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 137.4, 122.4
- Evidence FOR: name_exact (x2)
- Evidence AGAINST: no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: the printed name is the only link (no official-weight, commission, venue or opponent support) (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-04-01 Jimmy Adams at The Troubadour (corner a) | [tn-results:2025/CountryBox_4-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_4-1.pdf) | 137.4 | Terree'on Hammond | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-07-01 Jimm y Adams at The Troubadour (corner b) | [tn-results:2025/CountryBox_7-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_7-1.pdf) | 122.4 | Jeison Estrada Altuve | bout_now | C insufficient_graph_evidence:none | D | - |

### #56 Rydell Mayes Jr (TN)

- Proposed canonical boxer: Rydell Mayes Jr `f1efa9ea-9358-400e-8fa8-320dfe1ef2ea`; aliases: Rydell Mayes Jr (name, verified); verified prior bouts: 1; hometowns: -; commissions: tn-athletic-commission
- Competing candidates: Rydell Booker [-]; Keith Rydell Mayes [-]
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 243.2, 257
- Evidence FOR: name_exact (x2), same_commission:tn-athletic-commission (x2)
- Evidence AGAINST: danger:generational_suffix (x2), no place printed on the sheet (cannot compare hometowns)
- Uncertainty: weight_gap_16.0lb(neutral)
- Class reasons: D: the printed name plus one family only (commission): not independent evidence (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2020-01-16 Matt Young at Nashville Fairgrou (corner a) | [tn-results:2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2020/Tri-Star_BoxingOFFICIAL-RESULTS_1-16-2020.pdf) | 243.2 | Christopher Beal | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |
| 2023-05-06 Matthew Young at Chattanooga Conventi (corner b) | [tn-results:2023/Tri-Star_Boxing_5-6](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2023/Tri-Star_Boxing_5-6.pdf) | 257 | Jeff Holcomb | bout_now | C insufficient_graph_evidence:jurisdiction | D | - |

### #57 Tarvoris Mack (TN)

- Proposed canonical boxer: Tarvoris Southall ‐ Mack `bf883eba-0ffa-463c-a548-0545e13730b0`; aliases: Tarvoris Southall ‐ Mack (name, verified); verified prior bouts: 0; hometowns: -; commissions: -
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 165.6, 169.8
- Evidence FOR: name_containment (x2)
- Evidence AGAINST: danger:name_not_exact_form (x2), no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: name form containment only (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2024-07-13 Lamont Ingram at Champ Event Center (corner b) | [tn-results:2024/Champions-Enterprise-Boxing_7-13](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Champions-Enterprise-Boxing_7-13.pdf) | 165.6 | Anthony Reeves | bout_now | C insufficient_graph_evidence:none | D | - |
| 2024-12-07 Lamont Ingram at Champ's Event Center (corner b) | [tn-results:2024/Champions-Enterprise-Boxing_12-7](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2024/Champions-Enterprise-Boxing_12-7.pdf) | 169.8 | Camerin Manning | bout_now | C insufficient_graph_evidence:none | D | - |

### #58 Yoelys Molina (TN)

- Proposed canonical boxer: Yoelys Leal Molina `40ca57f2-7b69-46ac-8ed2-81c0b2d64d89`; aliases: Yoelys Leal Molina (name, verified); verified prior bouts: 0; hometowns: Cuba; commissions: -
- Competing candidates: none
- Unlocks: 2 bout(s) alone; 0 more only together with 0 other held identities; decisions required: 2
- Place evidence: none printed; official weights: 146.8, 151
- Evidence FOR: name_containment (x2)
- Evidence AGAINST: danger:name_not_exact_form (x2), no place printed on the sheet (cannot compare hometowns), proposed boxer has no verified bout (created from another held-name appearance)
- Uncertainty: -
- Class reasons: D: name form containment only (x2)

| Appearance | Sheet | Weight | Opponent | Unlocks | Resolver | Class | In batch |
|---|---|---:|---|---|---|:---:|---|
| 2025-04-01 Jimmy Adams at The Troubadour (corner a) | [tn-results:2025/CountryBox_4-1](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/CountryBox_4-1.pdf) | 146.8 | Jaylen Jones | bout_now | C insufficient_graph_evidence:none | D | - |
| 2025-05-09 Dewey Cooper at World Wide Stages (corner a) | [tn-results:2025/Team-Combat-League_5-9_Miami-V-Nashville](https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2025/Team-Combat-League_5-9_Miami-V-Nashville.pdf) | 151 | Orestes Velazquez | bout_now | C insufficient_graph_evidence:none | D | - |

(321 more class D identities in the JSON manifest)
