# Identity review batch 003

Generated 2026-09-14T13:24:45.190Z by boxing-identity-review-workbench@1.1.0. **Nothing has been applied.** Each entry needs a named human reviewer's decision and note.

```
{
 "groups_in_batch": 9,
 "grouped_entries_in_batch": 18,
 "groupable_identities_in_queue": 9,
 "pending_items": 216,
 "pending_appearances": 103,
 "unlock_now": 77,
 "recommendations": {
  "match": 24,
  "hold": 79
 },
 "danger_cases": 31,
 "blocked_bouts": {
  "NV": {
   "on_official_sheets": 134,
   "canonical": 115,
   "blocked": 19
  },
  "FL": {
   "on_official_sheets": 391,
   "canonical": 271,
   "blocked": 120
  },
  "NJ": {
   "on_official_sheets": 72,
   "canonical": 59,
   "blocked": 13
  },
  "MO": {
   "on_official_sheets": 41,
   "canonical": 28,
   "blocked": 13
  },
  "PA": {
   "on_official_sheets": 151,
   "canonical": 74,
   "blocked": 77
  }
 }
}
```

## Grouped identities (one decision covers every member)

- **Jibril Noble** (PA, PA) -> proposed Jibril Noble; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-03-07, 2026-06-13), weights 136 -> 133.4
- **Cahir Gormley** (PA, PA) -> proposed Cahir Gormley; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-03-07, 2026-04-03), weights 159 -> 153.4
- **Lemir Isom-Riley** (PA, PA) -> proposed Lemir Isom-Riley; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-01-17, 2026-07-18), weights 234.8 -> 244.5
- **Otabek Melikov** (PA, PA) -> proposed Otabek Melikov; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-01-17, 2026-04-11), weights 123.8 -> 124.4
- **Brian Mowry** (PA, PA) -> proposed Brian Mowry; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-02-07, 2026-05-09), weights 269.6 -> 267.2
- **Brooke Mullen** (PA, PA) -> proposed Brooke Mullen; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-04-03, 2026-06-20), weights 153.6 -> 147.8
- **Marco Romero** (MO, Olathe, KS) -> proposed Marco Romero; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-03-20, 2026-05-16), weights 167.5 -> 165.7
- **Dominique Griffin** (PA, TX) -> proposed Dominique Griffin; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-02-07, 2026-07-24), weights 123.9 -> 124.8
- **Dashaun Johns** (PA, NY) -> proposed Dashaun Johns; 2 appearances. Basis: same source, exact normalized name, same stated place, same proposed boxer, no competing candidate or separating danger flag, distinct dates (2026-04-11, 2026-08-29), weights 142.6 -> 142.6

## Sibling / twin / same-name danger cases in this batch

- **Josue Mendez Sosa** (PA, 2026-01-17): stated_place_mismatch [FL (florida) vs cuba]
- **Dainier Pero** (PA, 2026-01-17): stated_place_mismatch [NV (nevada) vs florida]
- **Izak Carlos** (MO, 2026-02-13): same_surname_same_city_different_given_name [Jorge Carlos]
- **Willmank Brito** (PA, 2026-03-07): name_not_exact_form [Willmank Brito ~ Willmank Canonico Brito (containment)]; stated_place_mismatch [FL (florida) vs mexico]
- **Jesus Segundo Martinez** (MO, 2026-03-20): name_not_exact_form [Jesus Segundo Martinez ~ Jesus Segundo Martinez Carrascal (containment)]; common_surname [5 canonical boxers share the surname "martinez"]; stated_place_mismatch [Miami, FL (florida) vs colombia]
- **Daevion Williams** (MO, 2026-03-21): name_not_exact_form [Daevion Williams ~ De Von Williams (transliteration)]; given_name_differs [Daevion Williams vs De Von Williams]; common_surname [15 canonical boxers share the surname "williams"]; stated_place_mismatch [St. Louis, MO (missouri) vs florida]
- **Edward Millard** (PA, 2026-03-28): stated_place_mismatch [PA (pennsylvania) vs new york]
- **Gustavo Morales** (PA, 2026-04-03): common_surname [5 canonical boxers share the surname "morales"]
- **David Garcia** (PA, 2026-04-11): common_surname [10 canonical boxers share the surname "garcia"]
- **Jorge Carlos** (MO, 2026-04-25): same_surname_same_city_different_given_name [Izak Carlos]
- **Wilfrido Buelvas Pacheco** (MO, 2026-05-16): stated_place_mismatch [Barranquilla, COL (col) vs columbia]
- **Jesus Segundo Martinez** (MO, 2026-05-16): name_not_exact_form [Jesus Segundo Martinez ~ Jesus Segundo Martinez Carrascal (containment)]; common_surname [5 canonical boxers share the surname "martinez"]; stated_place_mismatch [Miami, FL (florida) vs colombia]
- **Emmanuel Rodriguez** (PA, 2026-05-22): common_surname [11 canonical boxers share the surname "rodriguez"]; stated_place_mismatch [P Rico (p rico) vs new jersey]
- **Jose Alvarado** (PA, 2026-05-29): name_not_exact_form [Jose Alvarado ~ Jose Valenzuela Alvarado (containment)]; stated_place_mismatch [PUEBLA (puebla) vs mexico]
- **Colleen Davis** (PA, 2026-06-13): same_surname_same_region_different_given_name [Sanjay Davis]; common_surname [7 canonical boxers share the surname "davis"]
- **Raul Garcia** (PA, 2026-06-13): name_not_exact_form [Raul Garcia ~ Raul Curiel Garcia (containment)]; common_surname [10 canonical boxers share the surname "garcia"]; stated_place_mismatch [OK (oklahoma) vs mexico]
- **Luis Arrollo** (PA, 2026-06-13): stated_place_mismatch [MEXICO (mexico) vs sonora]
- **Dwyke Flemmings** (PA, 2026-06-20): generational_suffix [Dwyke Flemmings vs Dwyke Flemmings, Jr.]; name_not_exact_form [Dwyke Flemmings ~ Dwyke Flemmings, Jr. (containment)]
- **Joshafat Ortiz** (PA, 2026-06-20): same_surname_same_region_different_given_name [Christian Ortiz]; common_surname [5 canonical boxers share the surname "ortiz"]
- **Luis Morales** (PA, 2026-06-20): name_not_exact_form [Luis Morales ~ Luis Almendarez-Morales (containment)]; common_surname [5 canonical boxers share the surname "morales"]; stated_place_mismatch [CA (california) vs mexico]
- **Carlos** (PA, 2026-07-25): name_not_exact_form [Carlos ~ Carlos Suarez (none)]
- **Juan Rivera** (PA, 2026-07-25): name_not_exact_form [Juan Rivera ~ Juan Rivera V (containment)]
- **Julian Gonzalez** (PA, 2026-08-29): same_surname_same_region_different_given_name [Ethan Gonzalez]; name_not_exact_form [Julian Gonzalez ~ Julian Gonzalez Sanchez (containment)]; common_surname [14 canonical boxers share the surname "gonzalez"]
- **Shakeem Williams** (PA, 2026-03-07): same_surname_same_region_different_given_name [Tyhler Williams / Steven Williams]; common_surname [15 canonical boxers share the surname "williams"]
- **Jerome Baxter** (PA, 2026-04-11): name_not_exact_form [Jerome Baxter ~ Jerome Kenneth Baxter (containment)]
- **Alex Martin** (PA, 2026-04-11): common_surname [7 canonical boxers share the surname "martin"]
- **Juan Rivera** (PA, 2026-04-11): name_not_exact_form [Juan Rivera ~ Juan Rivera V (containment)]
- **Elijah Gonzalez** (PA, 2026-07-24): common_surname [14 canonical boxers share the surname "gonzalez"]
- **German Perez** (PA, 2026-07-24): common_surname [13 canonical boxers share the surname "perez"]
- **Alexander Marrero** (PA, 2026-08-07): same_surname_same_region_different_given_name [Juan Marrero]; name_not_exact_form [Alexander Marrero ~ Alexandre Lima Moura (containment)]; stated_place_mismatch [PA (pennsylvania) vs florida]
- **Saul Corral** (PA, 2026-08-22): name_not_exact_form [Saul Corral ~ Saul Guadalupe Corral Escalante (containment)]; stated_place_mismatch [MX (mexico) vs arizona]

## 003:pa_state_athletic_commission:2026-01-17|philadelphia|2300-arena|colon-gabriel|alborov-soslan|b

| | |
|---|---|
| Source appearance | "ALBOROV, SOSLAN" (PA), corner b, 2026-01-17, Marshall Kauffman at 2300 Arena; document `pa-results:2026:01-17-26 - box - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/01-17-26%20-%20box%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+venue+weight |
| All candidates | Soslan Alborov [C, 79; 1 bouts; aliases: Soslan Alborov (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Soslan Alborov (`25ade4fa-70e3-4376-b76e-ff69265fbcb5`, resolver tier C) |
| Normalized name | soslan alborov ~ soslan alborov (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 157.8 lb / -; candidate weights: 159 (2026-04-11) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Gabriel Colon (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission, same_venue |
| This appearance | source bout `2026-01-17|philadelphia|2300-arena|colon-gabriel|alborov-soslan`, repeat index 1, sheet order 7 |
| Candidate record | 2026-04-11 vs Donta Swedenburg, order 3; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 79 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+venue+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-02-06|philadelphia|live-casino|hardy-david|jackson-darnell|a

| | |
|---|---|
| Source appearance | "HARDY, DAVID" (PA), corner a, 2026-02-06, Jesus Rivera at Live Casino; document `pa-results:2026:02-06-26 box rivera - live casino - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-06-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20%20-%20%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | David Fecteau [-, -; 1 bouts; aliases: David Fecteau (name, verified)]<br>David Calabro [-, -; 1 bouts; aliases: David Calabro (name, verified)]<br>David Hardy [C, 78; 1 bouts; aliases: David Hardy (name, verified)]<br>David Malul [-, -; 1 bouts; aliases: David Malul (name, verified)]<br>David Garcia [-, -; 1 bouts; aliases: David Garcia (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | David Hardy (`57fac663-247a-48ea-996f-39c0475796d3`, resolver tier C) |
| Normalized name | david hardy ~ david hardy (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 129.7 lb / -; candidate weights: 130.8 (2026-07-11) |
| Commission / venue | pa-state-athletic-commission / Live Casino, Philadelphia |
| Opponent | Darnell Jackson (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-02-06|philadelphia|live-casino|hardy-david|jackson-darnell`, repeat index 1, sheet order 4 |
| Candidate record | 2026-07-11 vs John Fruto, order 6; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-07|pa|mohegan-sun-wilkes-barre|jackson-nicholas|oltmanns-jesse|a

| | |
|---|---|
| Source appearance | "JACKSON, NICHOLAS" (PA), corner a, 2026-03-07, Chris Coyne at MOHEGAN SUN - Wilkes Barre; document `pa-results:2026:03-07-26 box coyne - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20coyne%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Darnell Jackson [-, -; 0 bouts; aliases: Darnell Jackson (name, verified)]<br>Anthony Jackson [-, -; 1 bouts; aliases: Anthony Jackson (name, verified)]<br>Nicholas Monty [-, -; 0 bouts; aliases: Nicholas Monty (name, verified)]<br>Darrius Jackson [-, -; 3 bouts; aliases: Darrius Jackson (name, verified)]<br>Nicholas Jackson [C, 78; 1 bouts; aliases: Nicholas Jackson (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Nicholas Jackson (`dbaacfd7-2c70-48e9-825a-327ee5e3a473`, resolver tier C) |
| Normalized name | nicholas jackson ~ nicholas jackson (exact) |
| City-level hometown | observed: OH (not city-level); candidate: OH |
| Official / contracted weight | 189.4 lb / -; candidate weights: 197 (2026-05-09) |
| Commission / venue | pa-state-athletic-commission / MOHEGAN SUN - Wilkes Barre |
| Opponent | Jesse Oltmanns (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-03-07|pa|mohegan-sun-wilkes-barre|jackson-nicholas|oltmanns-jesse`, repeat index 1, sheet order 6 |
| Candidate record | 2026-05-09 vs Jordan Carr, order 1; current: no official result recorded |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-07|philadelphia|sixth-man-center|green-tariq|martin-james|a

| | |
|---|---|
| Source appearance | "GREEN, TARIQ" (PA), corner a, 2026-03-07, Dominique Walton at Sixth Man Center; document `pa-results:2026:03-07-26 box walton - sixth man arena - phila., pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20walton%20-%20sixth%20man%20arena%20-%20phila.%2C%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Jaylen Green [-, -; 1 bouts; aliases: Jaylen Green (name, verified)]<br>Tariq Green [C, 78; 1 bouts; aliases: Tariq Green (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Tariq Green (`e6651f28-31d0-4b05-9be3-2fb0dc7d5cd0`, resolver tier C) |
| Normalized name | tariq green ~ tariq green (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 167.6 lb / -; candidate weights: 162.2 (2026-06-13) |
| Commission / venue | pa-state-athletic-commission / Sixth Man Center, Philadelphia |
| Opponent | James Martin (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-03-07|philadelphia|sixth-man-center|green-tariq|martin-james`, repeat index 1, sheet order 5 |
| Candidate record | 2026-06-13 vs Christopher Brooker, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-07|philadelphia|sixth-man-center|noble-jibril|centeno-juan|a

| | |
|---|---|
| Source appearance | "NOBLE, JIBRIL" (PA), corner a, 2026-03-07, Dominique Walton at Sixth Man Center; document `pa-results:2026:03-07-26 box walton - sixth man arena - phila., pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20walton%20-%20sixth%20man%20arena%20-%20phila.%2C%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|jibril noble|text:pa|9c826902-e4f7-4e3d-b09d-d5627f9aab40` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Jibril Noble [C, 78; 1 bouts; aliases: Jibril Noble (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jibril Noble (`9c826902-e4f7-4e3d-b09d-d5627f9aab40`, resolver tier C) |
| Normalized name | jibril noble ~ jibril noble (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 136 lb / -; candidate weights: 135 (2026-08-22) |
| Commission / venue | pa-state-athletic-commission / Sixth Man Center, Philadelphia |
| Opponent | Juan Centeno (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-03-07|philadelphia|sixth-man-center|noble-jibril|centeno-juan`, repeat index 1, sheet order 1 |
| Candidate record | 2026-08-22 vs Wanzell Ellison, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-28|chester|harrah-s-casino|haywood-tyreem|el-amin-kashif|b

| | |
|---|---|
| Source appearance | "EL-AMIN, KASHIF" (PA), corner b, 2026-03-28, Greg Pritchett at Harrah's Casino; document `pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+venue+weight |
| All candidates | Kashif El-Amin [C, 79; 1 bouts; aliases: Kashif El-Amin (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Kashif El-Amin (`5b84e322-c90a-48eb-a7de-bbd5113b7284`, resolver tier C) |
| Normalized name | kashif amin ~ kashif amin (exact) |
| City-level hometown | observed: NC (not city-level); candidate: NC |
| Official / contracted weight | 145.4 lb / -; candidate weights: 146 (2026-07-11) |
| Commission / venue | pa-state-athletic-commission / Harrah's Casino, Chester |
| Opponent | Tyreem Haywood (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission, same_venue |
| This appearance | source bout `2026-03-28|chester|harrah-s-casino|haywood-tyreem|el-amin-kashif`, repeat index 1, sheet order 1 |
| Candidate record | 2026-07-11 vs Frank Barbley, order 2; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 79 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+venue+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-28|chester|harrah-s-casino|holden-jalique|threatt-nathan|a

| | |
|---|---|
| Source appearance | "HOLDEN, JALIQUE" (PA), corner a, 2026-03-28, Greg Pritchett at Harrah's Casino; document `pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+venue+weight |
| All candidates | Jalique Holden [C, 79; 1 bouts; aliases: Jalique Holden (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jalique Holden (`0710f6aa-6859-47d9-960f-9c5f848c3576`, resolver tier C) |
| Normalized name | jalique holden ~ jalique holden (exact) |
| City-level hometown | observed: DE (not city-level); candidate: DE |
| Official / contracted weight | 132.6 lb / -; candidate weights: 130 (2026-07-11) |
| Commission / venue | pa-state-athletic-commission / Harrah's Casino, Chester |
| Opponent | Nathan Threatt (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission, same_venue |
| This appearance | source bout `2026-03-28|chester|harrah-s-casino|holden-jalique|threatt-nathan`, repeat index 1, sheet order 2 |
| Candidate record | 2026-07-11 vs Antonio Dunton-El, order 7; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 79 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+venue+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-28|chester|harrah-s-casino|santiago-thomas|ajuwa-elias|b

| | |
|---|---|
| Source appearance | "AJUWA, ELIAS" (PA), corner b, 2026-03-28, Greg Pritchett at Harrah's Casino; document `pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+venue+weight |
| All candidates | Elias Ajuwa [C, 79; 1 bouts; aliases: Elias Ajuwa (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Elias Ajuwa (`4cb45149-32ec-47fb-84a1-315ffb639d3e`, resolver tier C) |
| Normalized name | elias ajuwa ~ elias ajuwa (exact) |
| City-level hometown | observed: DE (not city-level); candidate: DE |
| Official / contracted weight | 171.6 lb / -; candidate weights: 163.4 (2026-07-11) |
| Commission / venue | pa-state-athletic-commission / Harrah's Casino, Chester |
| Opponent | Thomas Santiago (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission, same_venue |
| This appearance | source bout `2026-03-28|chester|harrah-s-casino|santiago-thomas|ajuwa-elias`, repeat index 1, sheet order 6 |
| Candidate record | 2026-07-11 vs Stephen McCabe, order 4; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 79 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+venue+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-28|chester|harrah-s-casino|thomas-chris|hackett-greg|b

| | |
|---|---|
| Source appearance | "HACKETT, GREG" (PA), corner b, 2026-03-28, Greg Pritchett at Harrah's Casino; document `pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Greg Hackett [C, 78; 1 bouts; aliases: Greg Hackett (name, verified)]<br>Jalil Major Hackett [-, -; 1 bouts; aliases: Jalil Major Hackett (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Greg Hackett (`9ff57157-c6c8-4d0a-b703-099341674137`, resolver tier C) |
| Normalized name | greg hackett ~ greg hackett (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 210.8 lb / -; candidate weights: 204 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / Harrah's Casino, Chester |
| Opponent | Chris Thomas (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-03-28|chester|harrah-s-casino|thomas-chris|hackett-greg`, repeat index 1, sheet order 4 |
| Candidate record | 2026-07-25 vs Ali Ellis, order 9; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-04-03|allentown|the-archer|gormley-cahir|mcbride-dominicque|a

| | |
|---|---|
| Source appearance | "GORMLEY, CAHIR" (PA), corner a, 2026-04-03, James Bartley at The Archer; document `pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|cahir gormley|text:pa|2c73bebd-3d47-4fa4-97eb-d21a43057925` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Cahir Gormley [C, 78; 1 bouts; aliases: Cahir Gormley (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Cahir Gormley (`2c73bebd-3d47-4fa4-97eb-d21a43057925`, resolver tier C) |
| Normalized name | cahir gormley ~ cahir gormley (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 153.4 lb / -; candidate weights: 153.8 (2026-05-29) |
| Commission / venue | pa-state-athletic-commission / The Archer, Allentown |
| Opponent | Dominicque McBride (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-04-03|allentown|the-archer|gormley-cahir|mcbride-dominicque`, repeat index 1, sheet order 11 |
| Candidate record | 2026-05-29 vs Jamar Leach, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-04-11|coraopolis|montour-sports-complex|graziano-john|worthy-chaka|a

| | |
|---|---|
| Source appearance | "GRAZIANO, JOHN" (PA), corner a, 2026-04-11, William Hutchinson at Montour Sports Complex; document `pa-results:2026:04-11-26 box hutchinson - montour sportsplex - coraopolis pa` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20hutchinson%20-%20montour%20sportsplex%20-%20coraopolis%20pa.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | John Garcia [-, -; 1 bouts; aliases: John Garcia (name, verified)]<br>John Graziano [C, 78; 1 bouts; aliases: John Graziano (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | John Graziano (`f9893ad2-a1ca-4ceb-a31e-f45e1bad6934`, resolver tier C) |
| Normalized name | john graziano ~ john graziano (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 137.9 lb / -; candidate weights: 130.5 (2026-07-18) |
| Commission / venue | pa-state-athletic-commission / Montour Sports Complex, Coraopolis |
| Opponent | Chaka Worthy (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-04-11|coraopolis|montour-sports-complex|graziano-john|worthy-chaka`, repeat index 1, sheet order 4 |
| Candidate record | 2026-07-18 vs Asadbek Saidov, order 4; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-04-11|philadelphia|2300-arena|davis-sanjay|litz-justin|b

| | |
|---|---|
| Source appearance | "LITZ, JUSTIN" (PA), corner b, 2026-04-11, Brian Costello at 2300 Arena; document `pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Justin Howard [-, -; 1 bouts; aliases: Justin Howard (name, verified)]<br>Justin Figueroa [-, -; 1 bouts; aliases: Justin Figueroa (name, verified)]<br>Justin Litz [C, 78; 1 bouts; aliases: Justin Litz (name, verified)]<br>Justin Penaranda [-, -; 1 bouts; aliases: Justin Penaranda (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Justin Litz (`9a4c4f82-fb1b-43e7-8d57-2d761e8e9391`, resolver tier C) |
| Normalized name | justin litz ~ justin litz (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 247 lb / -; candidate weights: 238.4 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Sanjay Davis (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-04-11|philadelphia|2300-arena|davis-sanjay|litz-justin`, repeat index 1, sheet order 1 |
| Candidate record | 2026-07-25 vs Maurice Morris, order 2; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-04-11|philadelphia|2300-arena|o-callaghan-brendan|brewer-john|b

| | |
|---|---|
| Source appearance | "BREWER, JOHN" (PA), corner b, 2026-04-11, Brian Costello at 2300 Arena; document `pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | John Brewer [C, 78; 1 bouts; aliases: John Brewer (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | John Brewer (`5f8d9bbd-e082-4a47-b778-3b8fbbde429e`, resolver tier C) |
| Normalized name | john brewer ~ john brewer (exact) |
| City-level hometown | observed: MO (not city-level); candidate: MO |
| Official / contracted weight | 159.8 lb / -; candidate weights: 167.2 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Brendan O'Callaghan (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-04-11|philadelphia|2300-arena|o-callaghan-brendan|brewer-john`, repeat index 1, sheet order 5 |
| Candidate record | 2026-07-25 vs William Briscoe, order 3; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-05-29|allentown|archer-allentown-pa|sims-rishon|payne-giovanni|b

| | |
|---|---|
| Source appearance | "PAYNE, GIOVANNI" (PA), corner b, 2026-05-29, James Bartley at Archer - Allentown Pa; document `pa-results:2026:05-29-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-29-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Giovanni Figueroa [-, -; 1 bouts; aliases: Giovanni Figueroa (name, verified)]<br>Giovanni Payne [C, 78; 1 bouts; aliases: Giovanni Payne (name, verified)]<br>Giovanni Louis [-, -; 0 bouts; aliases: Giovanni Louis (name, verified)]<br>Giovannie Gonzalez [-, -; 1 bouts; aliases: Giovannie Gonzalez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Giovanni Payne (`2678904d-b124-4c0b-8f69-7205e4844343`, resolver tier C) |
| Normalized name | giovanni payne ~ giovanni payne (exact) |
| City-level hometown | observed: VA (not city-level); candidate: VA |
| Official / contracted weight | 208 lb / -; candidate weights: 218.2 (2026-08-29) |
| Commission / venue | pa-state-athletic-commission / Archer - Allentown, Pa, Allentown |
| Opponent | Rishon Sims (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-05-29|allentown|archer-allentown-pa|sims-rishon|payne-giovanni`, repeat index 1, sheet order 4 |
| Candidate record | 2026-08-29 vs Elijah Akana, order 1; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-06-13|philadelphia|first-district-plaza|alvarado-ivan|noble-jibril|b

| | |
|---|---|
| Source appearance | "NOBLE, JIBRIL" (PA), corner b, 2026-06-13, Dominique Walton at First District Plaza; document `pa-results:2026:06-13-26 box walton - first district plaza - phila., pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-13-26%20box%20walton%20-%20first%20district%20plaza%20-%20phila.,%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|jibril noble|text:pa|9c826902-e4f7-4e3d-b09d-d5627f9aab40` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+venue+weight |
| All candidates | Jibril Noble [C, 79; 1 bouts; aliases: Jibril Noble (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jibril Noble (`9c826902-e4f7-4e3d-b09d-d5627f9aab40`, resolver tier C) |
| Normalized name | jibril noble ~ jibril noble (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 133.4 lb / -; candidate weights: 135 (2026-08-22) |
| Commission / venue | pa-state-athletic-commission / First District Plaza, Philadelphia |
| Opponent | Ivan Alvarado (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission, same_venue |
| This appearance | source bout `2026-06-13|philadelphia|first-district-plaza|alvarado-ivan|noble-jibril`, repeat index 1, sheet order 1 |
| Candidate record | 2026-08-22 vs Wanzell Ellison, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 79 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+venue+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-08-07|philadelphia|2300-arena|blanco-alfredo|scoby-kurt|b

| | |
|---|---|
| Source appearance | "SCOBY, KURT" (PA), corner b, 2026-08-07, Alexis Barbosa at 2300 Arena; document `pa-results:2026:08-07-26 box barbosa - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-07-26%20box%20barbosa%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Kurt Scoby [C, 78; 1 bouts; aliases: Kurt Scoby (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Kurt Scoby (`6aeca4df-9ad0-45c9-bbdb-1540b9c33295`, resolver tier C) |
| Normalized name | kurt scoby ~ kurt scoby (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 146 lb / -; candidate weights: 147.2 (2026-03-07) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Alfredo Blanco (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-08-07|philadelphia|2300-arena|blanco-alfredo|scoby-kurt`, repeat index 1, sheet order 5 |
| Candidate record | 2026-03-07 vs Cristian Hernandez, order 2; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-08-28|philadelphia|live-casino|price-dylan|guevara-alberto|a

| | |
|---|---|
| Source appearance | "PRICE, DYLAN" (PA), corner a, 2026-08-28, Jesus Rivera at Live Casino; document `pa-results:2026:08-28-26 box rivera - live casino - 900 packer ave - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-28-26%20box%20rivera%20-%20live%20casino%20-%20900%20packer%20ave%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+venue+weight |
| All candidates | Dylan Colon [-, -; 1 bouts; aliases: Dylan Colon (name, verified)]<br>Devin Price [-, -; 1 bouts; aliases: Devin Price (name, verified)]<br>Dylan Price [C, 79; 1 bouts; aliases: Dylan Price (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dylan Price (`e50a5f7a-95d5-4a73-bd62-50f88e156f30`, resolver tier C) |
| Normalized name | dylan price ~ dylan price (exact) |
| City-level hometown | observed: NJ (not city-level); candidate: NJ |
| Official / contracted weight | 122.6 lb / -; candidate weights: 123.6 (2026-02-06) |
| Commission / venue | pa-state-athletic-commission / Live Casino, Philadelphia |
| Opponent | Alberto Guevara (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission, same_venue |
| This appearance | source bout `2026-08-28|philadelphia|live-casino|price-dylan|guevara-alberto`, repeat index 1, sheet order 6 |
| Candidate record | 2026-02-06 vs Sean Diaz, order 1; current: no official result recorded |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 79 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+venue+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-08-28|philadelphia|live-casino|tinnin-jayon|hernandez-alonso-manuel|b

| | |
|---|---|
| Source appearance | "Hernandez Alonso, Manuel" (PA), corner b, 2026-08-28, Jesus Rivera at Live Casino; document `pa-results:2026:08-28-26 box rivera - live casino - 900 packer ave - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-28-26%20box%20rivera%20-%20live%20casino%20-%20900%20packer%20ave%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+venue+weight |
| All candidates | Hernandez Trejo, [-, -; 1 bouts; aliases: Hernandez Trejo, (name, verified)]<br>Manuel Hernandez Alonso [C, 79; 1 bouts; aliases: Manuel Hernandez Alonso (name, verified)]<br>Claudio Hernandez [-, -; 1 bouts; aliases: Claudio Hernandez (name, verified)]<br>Luis Hernandez [-, -; 1 bouts; aliases: Luis Hernandez (name, verified)]<br>Miguel Angel Hernandez [-, -; 1 bouts; aliases: Miguel Angel Hernandez (name, verified)]<br>Alondra Yamile-Hernandez Mendoza [-, -; 1 bouts; aliases: Alondra Yamile-Hernandez Mendoza (name, verified)]<br>Wilver Hernandez [-, -; 0 bouts; aliases: Wilver Hernandez (name, verified)]<br>Cristian Hernandez [-, -; 1 bouts; aliases: Cristian Hernandez (name, verified)]<br>Angelo Hernandez [-, -; 1 bouts; aliases: Angelo Hernandez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Manuel Hernandez Alonso (`16fca70d-0ea1-42b3-8096-9943347e426d`, resolver tier C) |
| Normalized name | manuel hernandez alonso ~ manuel hernandez alonso (exact) |
| City-level hometown | observed: Coohula (not city-level); candidate: Coohula |
| Official / contracted weight | 118.4 lb / -; candidate weights: 114.3 (2026-02-06) |
| Commission / venue | pa-state-athletic-commission / Live Casino, Philadelphia |
| Opponent | Jayon Tinnin (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission, same_venue |
| This appearance | source bout `2026-08-28|philadelphia|live-casino|tinnin-jayon|hernandez-alonso-manuel`, repeat index 1, sheet order 4 |
| Candidate record | 2026-02-06 vs Amilliohn Lovera, order 2; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 79 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+venue+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-01-17|philadelphia|2300-arena|isom-riley-lemir|caudle-joel|a

| | |
|---|---|
| Source appearance | "ISOM-RILEY, LEMIR" (PA), corner a, 2026-01-17, Marshall Kauffman at 2300 Arena; document `pa-results:2026:01-17-26 - box - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/01-17-26%20-%20box%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|lemir isom riley|text:pa|3581e006-a5d9-4ab6-bdb3-2e12906521f4` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Lemir Isom-Riley [C, 60; 0 bouts; aliases: Lemir Isom-Riley (name, verified)]<br>Jasir Riley [-, -; 2 bouts; aliases: Jasir Riley (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Lemir Isom-Riley (`3581e006-a5d9-4ab6-bdb3-2e12906521f4`, resolver tier C) |
| Normalized name | lemir isom riley ~ lemir isom riley (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 234.8 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Joel Caudle (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-01-17|philadelphia|2300-arena|isom-riley-lemir|caudle-joel`, repeat index 1, sheet order 2 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-01-17|philadelphia|2300-arena|melikov-otabek|torres-jose|a

| | |
|---|---|
| Source appearance | "MELIKOV, OTABEK" (PA), corner a, 2026-01-17, Marshall Kauffman at 2300 Arena; document `pa-results:2026:01-17-26 - box - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/01-17-26%20-%20box%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|otabek melikov|text:pa|fa1f2479-6349-45c9-9b63-bfa84962fb10` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Otabek Melikov [C, 60; 0 bouts; aliases: Otabek Melikov (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Otabek Melikov (`fa1f2479-6349-45c9-9b63-bfa84962fb10`, resolver tier C) |
| Normalized name | otabek melikov ~ otabek melikov (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 123.8 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Jose Torres (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-01-17|philadelphia|2300-arena|melikov-otabek|torres-jose`, repeat index 1, sheet order 5 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-02-07|pittsburgh|the-priority|irving-kiante|juresic-christian|a

| | |
|---|---|
| Source appearance | "IRVING, KIANTE" (PA), corner a, 2026-02-07, John Richardson at The Priority; document `pa-results:2026:02-07-26 box richardson - the priory - pittsburgh pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-07-26%20box%20richardson%20-%20the%20priory%20-%20pittsburgh%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction |
| All candidates | Kiante Irving [C, 69; 1 bouts; aliases: Kiante Irving (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Kiante Irving (`162f6fd0-d4ab-4be0-8d6b-dcb8f1185a86`, resolver tier C) |
| Normalized name | kiante irving ~ kiante irving (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 173.9 lb / -; candidate weights: 162.2 (2026-07-18) |
| Commission / venue | pa-state-athletic-commission / The Priority, Pittsburgh |
| Opponent | Christian Juresic (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-02-07|pittsburgh|the-priority|irving-kiante|juresic-christian`, repeat index 1, sheet order 5 |
| Candidate record | 2026-07-18 vs Cameron Krael, order 3; current: win (rev1) |
| Contradictions | weight_gap_11.7lb(neutral) |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-02-07|pittsburgh|the-priority|mowry-brian|torres-antonio|a

| | |
|---|---|
| Source appearance | "MOWRY, BRIAN" (PA), corner a, 2026-02-07, John Richardson at The Priority; document `pa-results:2026:02-07-26 box richardson - the priory - pittsburgh pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-07-26%20box%20richardson%20-%20the%20priory%20-%20pittsburgh%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|brian mowry|text:pa|b16dee58-a855-49c9-8870-d247b4fbe8b4` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Brian Mowry [C, 60; 0 bouts; aliases: Brian Mowry (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Brian Mowry (`b16dee58-a855-49c9-8870-d247b4fbe8b4`, resolver tier C) |
| Normalized name | brian mowry ~ brian mowry (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 269.6 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / The Priority, Pittsburgh |
| Opponent | Antonio Torres (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-02-07|pittsburgh|the-priority|mowry-brian|torres-antonio`, repeat index 1, sheet order 1 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:mo_office_of_athletics:2026-02-13|kansas-city|event-26-103|dedrick-bell|jamar-pemberton|b

| | |
|---|---|
| Source appearance | "Jamar Pemberton" (MO), corner b, 2026-02-13, Blue Corner Promotions at Harrah’s Casino; document `mo-results:2026-02-13 BOXRESAKICKRES Kansas City Blue Corner Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-02-13%20BOXRESAKICKRES%20Kansas%20City%20Blue%20Corner%20Promo.pdf)) |
| Why held | queue: insufficient_evidence; resolver: contradiction:hometown_different_city |
| All candidates | Jamar Pemberton [C, 54; 1 bouts; aliases: Jamar Pemberton (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jamar Pemberton (`9cd5cbe4-1764-4b05-a098-438406f1a703`, resolver tier C) |
| Normalized name | jamar pemberton ~ jamar pemberton (exact) |
| City-level hometown | observed: St. Louis, MO (st louis, mo); candidate: Saint Louis, MO |
| Official / contracted weight | 158.2 lb / -; candidate weights: 159.2 (2026-05-16) |
| Commission / venue | mo-office-of-athletics / Harrah’s Casino, Kansas City |
| Opponent | Dedrick Bell (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-02-13|kansas-city|event-26-103|dedrick-bell|jamar-pemberton`, repeat index 1, sheet order 8 |
| Candidate record | 2026-05-16 vs Isiah Hart, order 2; current: win (rev1) |
| Contradictions | hometown_different_city:st louis, mo vs saint louis, mo |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 54 |
| Why the resolver stopped | contradiction:hometown_different_city |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: contradiction: hometown_different_city:st louis, mo vs saint louis, mo |

## 003:mo_office_of_athletics:2026-02-28|st-joseph|event-26-133|josh-martin|tyler-rowe|b

| | |
|---|---|
| Source appearance | "Tyler Rowe" (MO), corner b, 2026-02-28, Carden Combat Sports Promotions at Good Time Events Center; document `mo-results:2026-02-28 BOXRES Carden Combat Sports St. Joseph` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-02-28%20BOXRES%20Carden%20Combat%20Sports%20St.%20Joseph.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:hometown+jurisdiction |
| All candidates | Tyler Yavalar [-, -; 1 bouts; aliases: Tyler Yavalar (name, verified)]<br>Tyler Rowe [C, 78; 1 bouts; aliases: Tyler Rowe (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Tyler Rowe (`cf638c20-3c65-4fdb-8ec7-4159773d7122`, resolver tier C) |
| Normalized name | tyler rowe ~ tyler rowe (exact) |
| City-level hometown | observed: Independence, MO (independence, mo); candidate: Independence, MO |
| Official / contracted weight | 270.9 lb / -; candidate weights: 256.3 (2026-03-28) |
| Commission / venue | mo-office-of-athletics / Good Time Events Center, St. Joseph |
| Opponent | Josh Martin (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:mo-office-of-athletics |
| This appearance | source bout `2026-02-28|st-joseph|event-26-133|josh-martin|tyler-rowe`, repeat index 1, sheet order 1 |
| Candidate record | 2026-03-28 vs Charles Hackmann, order 16; current: loss (rev1) |
| Contradictions | weight_gap_14.6lb(neutral) |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:hometown+jurisdiction |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:mo_office_of_athletics:2026-03-20|independence|event-26-160|marcel-davidson|jonathan-bales|a

| | |
|---|---|
| Source appearance | "Marcel Davidson" (MO), corner a, 2026-03-20, KC Boxing Promotions at Truman Memorial Building; document `mo-results:2026-03-20 BOXRES Independence KC Boxing Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-20%20BOXRES%20Independence%20KC%20Boxing%20Promo.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:hometown |
| All candidates | Marcel Davidson [C, 69; 0 bouts; aliases: Marcel Davidson (name, verified)]<br>David Malul [-, -; 1 bouts; aliases: David Malul (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Marcel Davidson (`638e87f4-0103-4d82-9292-c480d02f08d1`, resolver tier C) |
| Normalized name | marcel davidson ~ marcel davidson (exact) |
| City-level hometown | observed: Kansas City, KS (kansas city, ks); candidate: Kansas City, KS |
| Official / contracted weight | 147.3 lb / -; candidate weights: - |
| Commission / venue | mo-office-of-athletics / Truman Memorial Building, Independence |
| Opponent | Jonathan Bales (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-20|independence|event-26-160|marcel-davidson|jonathan-bales`, repeat index 1, sheet order 1 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:hometown |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:mo_office_of_athletics:2026-03-21|st-louis|event-26-144|randle-canaday|marcus-decamp|b

| | |
|---|---|
| Source appearance | "Marcus Decamp" (MO), corner b, 2026-03-21, Box Culture Promotions at Ambassador Club; document `mo-results:2026-03-21 BOXRES St. Louis Box Culture Promotions` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-21%20BOXRES%20St.%20Louis%20Box%20Culture%20Promotions.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:hometown+weight |
| All candidates | Marcus Smith [-, -; 1 bouts; aliases: Marcus Smith (name, verified)]<br>Marcus Decamp [C, 78; 1 bouts; aliases: Marcus Decamp (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Marcus Decamp (`f4b487f9-c0c9-4517-a451-ce7c499ac73f`, resolver tier C) |
| Normalized name | marcus decamp ~ marcus decamp (exact) |
| City-level hometown | observed: Battle Creek, MI (battle creek, mi); candidate: Battle Creek, MI |
| Official / contracted weight | 118.2 lb / -; candidate weights: 114 (2026-07-25) |
| Commission / venue | mo-office-of-athletics / Ambassador Club, St. Louis |
| Opponent | Randle Canaday (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-21|st-louis|event-26-144|randle-canaday|marcus-decamp`, repeat index 1, sheet order 5 |
| Candidate record | 2026-07-25 vs Oscar Membreno, order 8; current: loss (rev1, identity_graph_reapply) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:hometown+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-04-03|allentown|the-archer|mullen-brooke|vaughn-breona|a

| | |
|---|---|
| Source appearance | "MULLEN, BROOKE" (PA), corner a, 2026-04-03, James Bartley at The Archer; document `pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|brooke mullen|text:pa|2a903bf9-156c-40c9-8832-723eaca6822b` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Brooke Mullen [C, 69; 1 bouts; aliases: Brooke Mullen (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Brooke Mullen (`2a903bf9-156c-40c9-8832-723eaca6822b`, resolver tier C) |
| Normalized name | brooke mullen ~ brooke mullen (exact) |
| City-level hometown | observed: PA (not city-level); candidate: Pottstown, PA |
| Official / contracted weight | 153.6 lb / -; candidate weights: 146.8 (2026-09-04) |
| Commission / venue | pa-state-athletic-commission / The Archer, Allentown |
| Opponent | Breona Vaughn (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-03|allentown|the-archer|mullen-brooke|vaughn-breona`, repeat index 1, sheet order 10 |
| Candidate record | 2026-09-04 vs Bria Miller, order 1; current: no official result recorded |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-04-03|allentown|the-archer|phipps-cornelio|gonzalez-frank|a

| | |
|---|---|
| Source appearance | "PHIPPS, CORNELIO" (PA), corner a, 2026-04-03, James Bartley at The Archer; document `pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Cornelio Phipps [C, 60; 0 bouts; aliases: Cornelio Phipps (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Cornelio Phipps (`d99adfba-5ec5-4789-b5a4-1f1e4a2bc76e`, resolver tier C) |
| Normalized name | cornelio phipps ~ cornelio phipps (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 123.8 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / The Archer, Allentown |
| Opponent | Frank Gonzalez (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-03|allentown|the-archer|phipps-cornelio|gonzalez-frank`, repeat index 1, sheet order 3 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-04-03|allentown|the-archer|thompson-dennis|olguin-diuhl|a

| | |
|---|---|
| Source appearance | "THOMPSON, DENNIS" (PA), corner a, 2026-04-03, James Bartley at The Archer; document `pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Dennis Thompson [C, 69; 1 bouts; aliases: Dennis Thompson (name, verified)]<br>Brittany Thompson [-, -; 1 bouts; aliases: Brittany Thompson (name, verified)]<br>Christopher Thompson [-, -; 0 bouts; aliases: Christopher Thompson (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dennis Thompson (`351cd8d2-b50d-4ae5-9665-0679ecec3299`, resolver tier C) |
| Normalized name | dennis thompson ~ dennis thompson (exact) |
| City-level hometown | observed: PA (not city-level); candidate: Philadelphia, PA |
| Official / contracted weight | 127.4 lb / -; candidate weights: 122.5 (2026-09-04) |
| Commission / venue | pa-state-athletic-commission / The Archer, Allentown |
| Opponent | Diuhl Olguin (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-03|allentown|the-archer|thompson-dennis|olguin-diuhl`, repeat index 1, sheet order 7 |
| Candidate record | 2026-09-04 vs Jose Casillas, order 4; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-04-11|coraopolis|montour-sports-complex|reed-demetrius|pumphrey-dillon|b

| | |
|---|---|
| Source appearance | "PUMPHREY, DILLON" (PA), corner b, 2026-04-11, William Hutchinson at Montour Sports Complex; document `pa-results:2026:04-11-26 box hutchinson - montour sportsplex - coraopolis pa` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20hutchinson%20-%20montour%20sportsplex%20-%20coraopolis%20pa.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Dillon Pumphrey [C, 69; 1 bouts; aliases: Dillon Pumphrey (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dillon Pumphrey (`1a66503f-cbf8-4d68-8d74-2a9685e5f88f`, resolver tier C) |
| Normalized name | dillon pumphrey ~ dillon pumphrey (exact) |
| City-level hometown | observed: WV (not city-level); candidate: Clarksburg, WV |
| Official / contracted weight | 330 lb / -; candidate weights: 330 (2026-03-07) |
| Commission / venue | pa-state-athletic-commission / Montour Sports Complex, Coraopolis |
| Opponent | Demetrius Reed (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-11|coraopolis|montour-sports-complex|reed-demetrius|pumphrey-dillon`, repeat index 1, sheet order 5 |
| Candidate record | 2026-03-07 vs Joshua Popper, order 4; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-04-11|philadelphia|2300-arena|melikov-otabek|rodriguez-irvin|a

| | |
|---|---|
| Source appearance | "MELIKOV, OTABEK" (PA), corner a, 2026-04-11, Brian Costello at 2300 Arena; document `pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|otabek melikov|text:pa|fa1f2479-6349-45c9-9b63-bfa84962fb10` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Otabek Melikov [C, 60; 0 bouts; aliases: Otabek Melikov (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Otabek Melikov (`fa1f2479-6349-45c9-9b63-bfa84962fb10`, resolver tier C) |
| Normalized name | otabek melikov ~ otabek melikov (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 124.4 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Irvin Rodriguez (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-11|philadelphia|2300-arena|melikov-otabek|rodriguez-irvin`, repeat index 1, sheet order 2 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-05-09|washington|meadows-casino|conway-matthew|gallichan-tristan|b

| | |
|---|---|
| Source appearance | "GALLICHAN, TRISTAN" (PA), corner b, 2026-05-09, John Richardson at Meadows Casino; document `pa-results:2026:05-09-26 box richardson - meadows casino - washington pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-09-26%20box%20richardson%20-%20meadows%20casino%20-%20washington%20pa%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Tristan Gallichan [C, 69; 2 bouts; aliases: Tristan Gallichan (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Tristan Gallichan (`c2bb89ad-4d6d-4c0e-a308-5a0f571d86b0`, resolver tier C) |
| Normalized name | tristan gallichan ~ tristan gallichan (exact) |
| City-level hometown | observed: FL (not city-level); candidate: Florida |
| Official / contracted weight | 142.9 lb / -; candidate weights: 141.8 (2026-03-07), 145.2 (2026-04-10) |
| Commission / venue | pa-state-athletic-commission / Meadows Casino, Washington |
| Opponent | Matthew Conway (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-09|washington|meadows-casino|conway-matthew|gallichan-tristan`, repeat index 1, sheet order 4 |
| Candidate record | 2026-03-07 vs Cody Jenkins, order 2; current: win (rev1, identity_graph_reapply)<br>2026-04-10 vs Bryan Ivan Duran, order 10; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:mo_office_of_athletics:2026-05-16|kansas-city|event-26-163|marco-romero|andre-sherard|a

| | |
|---|---|
| Source appearance | "Marco Romero" (MO), corner a, 2026-05-16, KC Boxing Promotions at Scottish Rite Temple; document `mo-results:2026-05-16 BOXRES Kansas City KC Boxing Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-05-16%20BOXRES%20Kansas%20City%20KC%20Boxing%20Promo.pdf)) |
| Group | `G:mo_office_of_athletics|marco romero|olathe, ks|16c4e627-3434-4615-85dd-2e2c57b00a53` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:hometown+weight |
| All candidates | Marco Romero [C, 78; 1 bouts; aliases: Marco Romero (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Marco Romero (`16c4e627-3434-4615-85dd-2e2c57b00a53`, resolver tier C) |
| Normalized name | marco romero ~ marco romero (exact) |
| City-level hometown | observed: Olathe, KS (olathe, ks); candidate: Olathe, KS |
| Official / contracted weight | 165.7 lb / -; candidate weights: 164 (2026-08-22) |
| Commission / venue | mo-office-of-athletics / Scottish Rite Temple, Kansas City |
| Opponent | Andre Sherard (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-16|kansas-city|event-26-163|marco-romero|andre-sherard`, repeat index 1, sheet order 5 |
| Candidate record | 2026-08-22 vs Kahlil Mitchell, order 5; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:hometown+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-05-22|philadelphia|live-casino-philadelphia|craig-darryl|ruiz-michael|b

| | |
|---|---|
| Source appearance | "RUIZ, MICHAEL" (PA), corner b, 2026-05-22, Jesus Rivera at Live Casino Philadelphia; document `pa-results:2026:05-22-26 box rivera - live casino - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-22-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Michael Osumah [-, -; 1 bouts; aliases: Michael Osumah (name, verified)]<br>Michael Cserenyi [-, -; 1 bouts; aliases: Michael Cserenyi (name, verified)]<br>Michael Lemelle [-, -; 1 bouts; aliases: Michael Lemelle (name, verified)]<br>Michael Ruiz [C, 60; 0 bouts; aliases: Michael Ruiz (name, verified)]<br>Michael Harris [-, -; 1 bouts; aliases: Michael Harris (name, verified)]<br>Michael Garcia [-, -; 1 bouts; aliases: Michael Garcia (name, verified)]<br>Michael Ian Peck [-, -; 1 bouts; aliases: Michael Ian Peck (name, verified)]<br>Michael McDonald [-, -; 1 bouts; aliases: Michael McDonald (name, verified)]<br>Michael Lee [-, -; 1 bouts; aliases: Michael Lee (name, verified)]<br>Michael Anderson [-, -; 1 bouts; aliases: Michael Anderson (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Michael Ruiz (`31f0cfea-a205-4103-bb97-5b5a6e822f65`, resolver tier C) |
| Normalized name | michael ruiz ~ michael ruiz (exact) |
| City-level hometown | observed: NJ (not city-level); candidate: Toms River, NJ |
| Official / contracted weight | 133 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Live Casino Philadelphia, Philadelphia |
| Opponent | Darryl Craig (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-22|philadelphia|live-casino-philadelphia|craig-darryl|ruiz-michael`, repeat index 1, sheet order 2 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-05-22|philadelphia|live-casino-philadelphia|rosa-devon|decamp-marcus|b

| | |
|---|---|
| Source appearance | "DECAMP, MARCUS" (PA), corner b, 2026-05-22, Jesus Rivera at Live Casino Philadelphia; document `pa-results:2026:05-22-26 box rivera - live casino - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-22-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Marcus Smith [-, -; 1 bouts; aliases: Marcus Smith (name, verified)]<br>Marcus Decamp [C, 69; 1 bouts; aliases: Marcus Decamp (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Marcus Decamp (`f4b487f9-c0c9-4517-a451-ce7c499ac73f`, resolver tier C) |
| Normalized name | marcus decamp ~ marcus decamp (exact) |
| City-level hometown | observed: MI (not city-level); candidate: Battle Creek, MI |
| Official / contracted weight | 118 lb / -; candidate weights: 114 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / Live Casino Philadelphia, Philadelphia |
| Opponent | Devon Rosa (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-22|philadelphia|live-casino-philadelphia|rosa-devon|decamp-marcus`, repeat index 1, sheet order 1 |
| Candidate record | 2026-07-25 vs Oscar Membreno, order 8; current: loss (rev1, identity_graph_reapply) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-05-29|allentown|archer-allentown-pa|perez-angel|murray-derrick|b

| | |
|---|---|
| Source appearance | "MURRAY, DERRICK" (PA), corner b, 2026-05-29, James Bartley at Archer - Allentown Pa; document `pa-results:2026:05-29-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-29-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Derrick Murray [C, 60; 0 bouts; aliases: Derrick Murray (name, verified)]<br>Daniel Murray [-, -; 1 bouts; aliases: Daniel Murray (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Derrick Murray (`c4f78a9e-71be-4c35-a9b8-9830de2aae15`, resolver tier C) |
| Normalized name | derrick murray ~ derrick murray (exact) |
| City-level hometown | observed: MO (not city-level); candidate: MO |
| Official / contracted weight | 143 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Archer - Allentown, Pa, Allentown |
| Opponent | Angel Perez (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-29|allentown|archer-allentown-pa|perez-angel|murray-derrick`, repeat index 1, sheet order 8 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-06-13|pa|pasquerilla-center-johnstown|ford-ryizeemmion|conteh-ahmed|b

| | |
|---|---|
| Source appearance | "CONTEH, AHMED" (PA), corner b, 2026-06-13, Max Leasock at Pasquerilla Center - Johnstown; document `pa-results:2026:06-13-26 box leasock - pasquerilla conference center - johnstown - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-13-26%20box%20leasock%20-%20pasquerilla%20conference%20center%20-%20johnstown%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Ahmed Conteh [C, 69; 1 bouts; aliases: Ahmed Conteh (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Ahmed Conteh (`0537f53e-5e2d-44ac-9f5e-878dc6b0067f`, resolver tier C) |
| Normalized name | ahmed conteh ~ ahmed conteh (exact) |
| City-level hometown | observed: OH (not city-level); candidate: Columbia, OH |
| Official / contracted weight | 138.9 lb / -; candidate weights: 135.5 (2026-03-21) |
| Commission / venue | pa-state-athletic-commission / Pasquerilla Center - Johnstown |
| Opponent | Ryizeemmion Ford (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-13|pa|pasquerilla-center-johnstown|ford-ryizeemmion|conteh-ahmed`, repeat index 1, sheet order 1 |
| Candidate record | 2026-03-21 vs Christian Gragg, order 6; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-06-20|philadelphia|2300-arena-philadelphia|falcon-ofacio|sanchez-frankie|a

| | |
|---|---|
| Source appearance | "FALCON, OFACIO" (PA), corner a, 2026-06-20, Thomas Lamanna at 2300 Arena Philadelphia; document `pa-results:2026:06-20-26 box lamanna - 2300 arena - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-20-26%20box%20lamanna%20-%202300%20arena%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Ofacio Falcon [C, 69; 1 bouts; aliases: Ofacio Falcon (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Ofacio Falcon (`4e1ea9c6-1684-4025-878d-dcef5b608ff6`, resolver tier C) |
| Normalized name | ofacio falcon ~ ofacio falcon (exact) |
| City-level hometown | observed: NY (not city-level); candidate: Bronx, NY |
| Official / contracted weight | 134.6 lb / -; candidate weights: 136.5 (2026-04-10) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena Philadelphia, Philadelphia |
| Opponent | Frankie Sanchez (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-20|philadelphia|2300-arena-philadelphia|falcon-ofacio|sanchez-frankie`, repeat index 1, sheet order 8 |
| Candidate record | 2026-04-10 vs Tackie Annan, order 2; current: no_contest (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-06-20|philadelphia|2300-arena-philadelphia|lopez-isabel|roman-gabrielle|b

| | |
|---|---|
| Source appearance | "ROMAN, GABRIELLE" (PA), corner b, 2026-06-20, Thomas Lamanna at 2300 Arena Philadelphia; document `pa-results:2026:06-20-26 box lamanna - 2300 arena - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-20-26%20box%20lamanna%20-%202300%20arena%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Gabriela Tellez [-, -; 1 bouts; aliases: Gabriela Tellez (name, verified)]<br>Gabriel San Juan Romanelli Da Silva [-, -; 1 bouts; aliases: Gabriel San Juan Romanelli Da Silva (name, verified)]<br>Gabriel Rodriguez [-, -; 1 bouts; aliases: Gabriel Rodriguez (name, verified)]<br>Gabriel Gerena [-, -; 1 bouts; aliases: Gabriel Gerena (name, verified)]<br>Gabriel Colon [-, -; 0 bouts; aliases: Gabriel Colon (name, verified)]<br>Gabrielle Roman [C, 69; 1 bouts; aliases: Gabrielle Roman (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Gabrielle Roman (`f19be734-efa0-472e-a0ac-16fffe14de57`, resolver tier C) |
| Normalized name | gabrielle roman ~ gabrielle roman (exact) |
| City-level hometown | observed: NJ (not city-level); candidate: South Amboy, NJ |
| Official / contracted weight | 133.4 lb / -; candidate weights: 128.6 (2026-03-07) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena Philadelphia, Philadelphia |
| Opponent | Isabel Lopez (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-20|philadelphia|2300-arena-philadelphia|lopez-isabel|roman-gabrielle`, repeat index 1, sheet order 1 |
| Candidate record | 2026-03-07 vs Ali Pajuelo Valle, order 4; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-06-20|philadelphia|2300-arena-philadelphia|muhammad-ismail|murray-daniel|b

| | |
|---|---|
| Source appearance | "MURRAY, DANIEL" (PA), corner b, 2026-06-20, Thomas Lamanna at 2300 Arena Philadelphia; document `pa-results:2026:06-20-26 box lamanna - 2300 arena - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-20-26%20box%20lamanna%20-%202300%20arena%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Daniel Olea [-, -; 0 bouts; aliases: Daniel Olea (name, verified)]<br>Daniel Blancas [-, -; 1 bouts; aliases: Daniel Blancas (name, verified)]<br>Daniel Gonzalez [-, -; 0 bouts; aliases: Daniel Gonzalez (name, verified)]<br>Derrick Murray [-, -; 0 bouts; aliases: Derrick Murray (name, verified)]<br>Daniel Murray [C, 69; 1 bouts; aliases: Daniel Murray (name, verified)]<br>Daniel Bean [-, -; 1 bouts; aliases: Daniel Bean (name, verified)]<br>Daniel Keepers [-, -; 1 bouts; aliases: Daniel Keepers (name, verified)]<br>Daniel Matellon [-, -; 1 bouts; aliases: Daniel Matellon (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Daniel Murray (`c55ce49e-3cd0-43bf-8cf2-94191162e38a`, resolver tier C) |
| Normalized name | daniel murray ~ daniel murray (exact) |
| City-level hometown | observed: NJ (not city-level); candidate: Lanoka Harbor, NJ |
| Official / contracted weight | 148.2 lb / -; candidate weights: 145.5 (2026-04-10) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena Philadelphia, Philadelphia |
| Opponent | Ismail Muhammad (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-20|philadelphia|2300-arena-philadelphia|muhammad-ismail|murray-daniel`, repeat index 1, sheet order 2 |
| Candidate record | 2026-04-10 vs Elijah Gonzalez, order 3; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-06-20|philadelphia|2300-arena-philadelphia|mullen-brooke|barber-miranda|a

| | |
|---|---|
| Source appearance | "MULLEN, BROOKE" (PA), corner a, 2026-06-20, Thomas Lamanna at 2300 Arena Philadelphia; document `pa-results:2026:06-20-26 box lamanna - 2300 arena - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-20-26%20box%20lamanna%20-%202300%20arena%20-%20phila%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|brooke mullen|text:pa|2a903bf9-156c-40c9-8832-723eaca6822b` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Brooke Mullen [C, 69; 1 bouts; aliases: Brooke Mullen (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Brooke Mullen (`2a903bf9-156c-40c9-8832-723eaca6822b`, resolver tier C) |
| Normalized name | brooke mullen ~ brooke mullen (exact) |
| City-level hometown | observed: PA (not city-level); candidate: Pottstown, PA |
| Official / contracted weight | 147.8 lb / -; candidate weights: 146.8 (2026-09-04) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena Philadelphia, Philadelphia |
| Opponent | Miranda Barber (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-20|philadelphia|2300-arena-philadelphia|mullen-brooke|barber-miranda`, repeat index 1, sheet order 4 |
| Candidate record | 2026-09-04 vs Bria Miller, order 1; current: no official result recorded |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-07-18|washington|hollywood-casino-meadows|bodish-danny|alcala-damian|b

| | |
|---|---|
| Source appearance | "ALCALA, DAMIAN" (PA), corner b, 2026-07-18, John Richardson at Hollywood Casino - Meadows; document `pa-results:2026:07-18-26 box richardson - meadows casino - washington pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-18-26%20box%20richardson%20-%20meadows%20casino%20-%20washington%20pa%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Damian Alcala [C, 69; 1 bouts; aliases: Damian Alcala (name, verified)]<br>Damian Knyba [-, -; 1 bouts; aliases: Damian Knyba (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Damian Alcala (`9bda0300-b5cb-41ce-9e81-938547b88520`, resolver tier C) |
| Normalized name | damian alcala ~ damian alcala (exact) |
| City-level hometown | observed: CA (not city-level); candidate: Chula Vista, CA |
| Official / contracted weight | 127.8 lb / -; candidate weights: 127.8 (2026-03-21) |
| Commission / venue | pa-state-athletic-commission / Hollywood Casino - Meadows, Washington |
| Opponent | Danny Bodish (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-18|washington|hollywood-casino-meadows|bodish-danny|alcala-damian`, repeat index 1, sheet order 1 |
| Candidate record | 2026-03-21 vs Carlos Jamil De Leon Castro, order 4; current: loss (rev1, identity_graph_reapply) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-07-18|washington|hollywood-casino-meadows|mowry-brian|isom-riley-lemir|b

| | |
|---|---|
| Source appearance | "ISOM-RILEY, LEMIR" (PA), corner b, 2026-07-18, John Richardson at Hollywood Casino - Meadows; document `pa-results:2026:07-18-26 box richardson - meadows casino - washington pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-18-26%20box%20richardson%20-%20meadows%20casino%20-%20washington%20pa%20%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|lemir isom riley|text:pa|3581e006-a5d9-4ab6-bdb3-2e12906521f4` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Lemir Isom-Riley [C, 60; 0 bouts; aliases: Lemir Isom-Riley (name, verified)]<br>Jasir Riley [-, -; 2 bouts; aliases: Jasir Riley (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Lemir Isom-Riley (`3581e006-a5d9-4ab6-bdb3-2e12906521f4`, resolver tier C) |
| Normalized name | lemir isom riley ~ lemir isom riley (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 244.5 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Hollywood Casino - Meadows, Washington |
| Opponent | Brian Mowry (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-18|washington|hollywood-casino-meadows|mowry-brian|isom-riley-lemir`, repeat index 1, sheet order 2 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-07-24|philadelphia|2300-arena|kirkpatrick-jasai|monty-nicholas|a

| | |
|---|---|
| Source appearance | "KIRKPATRICK, JASAI" (PA), corner a, 2026-07-24, Robert Farrell at 2300 Arena; document `pa-results:2026:07-24-26 box farrell - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-24-26%20box%20farrell%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Jasai Kirkpatrick [C, 69; 1 bouts; aliases: Jasai Kirkpatrick (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jasai Kirkpatrick (`775d4c39-7140-4ad7-95b2-2bde4ce334cd`, resolver tier C) |
| Normalized name | jasai kirkpatrick ~ jasai kirkpatrick (exact) |
| City-level hometown | observed: NJ (not city-level); candidate: Port Monmouth, NJ |
| Official / contracted weight | 140 lb / -; candidate weights: 142 (2026-02-21) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Nicholas Monty (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-24|philadelphia|2300-arena|kirkpatrick-jasai|monty-nicholas`, repeat index 1, sheet order 3 |
| Candidate record | 2026-02-21 vs Claudio Hernandez, order 5; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-07-24|philadelphia|2300-arena|peterson-erron|aradoaie-eromin|a

| | |
|---|---|
| Source appearance | "PETERSON, ERRON" (PA), corner a, 2026-07-24, Robert Farrell at 2300 Arena; document `pa-results:2026:07-24-26 box farrell - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-24-26%20box%20farrell%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Brian Peterson [-, -; 2 bouts; aliases: Brian Peterson (name, verified)]<br>Erron Peterson [C, 69; 1 bouts; aliases: Erron Peterson (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Erron Peterson (`a49ad869-dd34-4727-b39b-6fa83404ea17`, resolver tier C) |
| Normalized name | erron peterson ~ erron peterson (exact) |
| City-level hometown | observed: PA (not city-level); candidate: Philadelphia, PA |
| Official / contracted weight | 160.6 lb / -; candidate weights: 159 (2026-02-21) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Eromin Aradoaie (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-24|philadelphia|2300-arena|peterson-erron|aradoaie-eromin`, repeat index 1, sheet order 6 |
| Candidate record | 2026-02-21 vs Jose Angulo, order 9; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-07-24|philadelphia|2300-arena|phipps-cornelio|griffin-dominique|b

| | |
|---|---|
| Source appearance | "GRIFFIN, DOMINIQUE" (PA), corner b, 2026-07-24, Robert Farrell at 2300 Arena; document `pa-results:2026:07-24-26 box farrell - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-24-26%20box%20farrell%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|dominique griffin|text:tx|f70b1a10-2b2f-4e76-8308-6b5b64710b1a` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Dominique Valera [-, -; 1 bouts; aliases: Dominique Valera (name, verified)]<br>Avios Griffin [-, -; 1 bouts; aliases: Avios Griffin (name, verified)]<br>Dominique Griffin [C, 69; 1 bouts; aliases: Dominique Griffin (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dominique Griffin (`f70b1a10-2b2f-4e76-8308-6b5b64710b1a`, resolver tier C) |
| Normalized name | dominique griffin ~ dominique griffin (exact) |
| City-level hometown | observed: TX (not city-level); candidate: Irving, TX |
| Official / contracted weight | 124.8 lb / -; candidate weights: 120.8 (2026-05-16) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Cornelio Phipps (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-24|philadelphia|2300-arena|phipps-cornelio|griffin-dominique`, repeat index 1, sheet order 4 |
| Candidate record | 2026-05-16 vs Kevin Soltero, order 3; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-07-25|philadelphia|the-fillmore|green-jaylen|homitov-timur|a

| | |
|---|---|
| Source appearance | "GREEN, JAYLEN" (PA), corner a, 2026-07-25, Brian Costello at The Fillmore; document `pa-results:2026:07-25-26 box costello - canstatters - 9130 academy road -phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-25-26%20box%20costello%20-%20canstatters%20-%209130%20academy%20road%20-phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Jaylen Green [C, 60; 1 bouts; aliases: Jaylen Green (name, verified)]<br>Tariq Green [-, -; 1 bouts; aliases: Tariq Green (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jaylen Green (`bd7e8ad4-ec93-4d8b-b9dc-48da04eb29e6`, resolver tier C) |
| Normalized name | jaylen green ~ jaylen green (exact) |
| City-level hometown | observed: MO (not city-level); candidate: Saint Louis, MO |
| Official / contracted weight | 149 lb / -; candidate weights: 161.8 (2026-05-16) |
| Commission / venue | pa-state-athletic-commission / The Fillmore, Philadelphia |
| Opponent | Timur Homitov (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-25|philadelphia|the-fillmore|green-jaylen|homitov-timur`, repeat index 1, sheet order 1 |
| Candidate record | 2026-05-16 vs Timur Pirnazarov, order 1; current: loss (rev1) |
| Contradictions | weight_gap_12.8lb(neutral) |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-07-25|philadelphia|the-fillmore|ward-taran|melikov-otabek|a

| | |
|---|---|
| Source appearance | "WARD, TARAN" (PA), corner a, 2026-07-25, Brian Costello at The Fillmore; document `pa-results:2026:07-25-26 box costello - canstatters - 9130 academy road -phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-25-26%20box%20costello%20-%20canstatters%20-%209130%20academy%20road%20-phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Taran Ward [C, 69; 2 bouts; aliases: Taran Ward (name, verified)]<br>Rance Ward [-, -; 1 bouts; aliases: Rance Ward (name, verified)]<br>Mona Ward [-, -; 1 bouts; aliases: Mona Ward (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Taran Ward (`1b76b672-2cd8-497c-be92-06e2ab4e26a3`, resolver tier C) |
| Normalized name | taran ward ~ taran ward (exact) |
| City-level hometown | observed: MO (not city-level); candidate: Saint Louis, MO |
| Official / contracted weight | 128 lb / -; candidate weights: 126.2 (2026-02-19), 131 (2026-05-16) |
| Commission / venue | pa-state-athletic-commission / The Fillmore, Philadelphia |
| Opponent | Otabek Melikov (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-25|philadelphia|the-fillmore|ward-taran|melikov-otabek`, repeat index 1, sheet order 4 |
| Candidate record | 2026-02-19 vs Kevin Nunez, order 8; current: loss (rev1, identity_graph_reapply)<br>2026-05-16 vs Steven Ray Jr, order 7; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-08-07|philadelphia|2300-arena|diaz-martin|penaranda-justin|b

| | |
|---|---|
| Source appearance | "PENARANDA, JUSTIN" (PA), corner b, 2026-08-07, Alexis Barbosa at 2300 Arena; document `pa-results:2026:08-07-26 box barbosa - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-07-26%20box%20barbosa%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Justin Litz [-, -; 1 bouts; aliases: Justin Litz (name, verified)]<br>Justin Penaranda [C, 60; 1 bouts; aliases: Justin Penaranda (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Justin Penaranda (`ba4f7002-c4af-48a8-9dc7-590c4d9e4435`, resolver tier C) |
| Normalized name | justin penaranda ~ justin penaranda (exact) |
| City-level hometown | observed: NJ (not city-level); candidate: Bayonne, NJ |
| Official / contracted weight | 143.6 lb / -; candidate weights: 135.4 (2026-02-07) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Martin Diaz (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-07|philadelphia|2300-arena|diaz-martin|penaranda-justin`, repeat index 1, sheet order 3 |
| Candidate record | 2026-02-07 vs Skyler Bray, order 3; current: win (rev1) |
| Contradictions | weight_gap_8.2lb(neutral) |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-08-07|philadelphia|2300-arena|rushing-shaquille|gonzalez-daniel|a

| | |
|---|---|
| Source appearance | "RUSHING, SHAQUILLE" (PA), corner a, 2026-08-07, Alexis Barbosa at 2300 Arena; document `pa-results:2026:08-07-26 box barbosa - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-07-26%20box%20barbosa%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Shaquille Rushing [C, 69; 3 bouts; aliases: Shaquille Rushing (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Shaquille Rushing (`47814fad-c70e-4ede-88ac-e71828053290`, resolver tier C) |
| Normalized name | shaquille rushing ~ shaquille rushing (exact) |
| City-level hometown | observed: FL (not city-level); candidate: Lakeland, FL / Lakeland, FL. |
| Official / contracted weight | 137.4 lb / -; candidate weights: 137.8 (2026-02-21), 135.8 (2026-03-13), 137.4 (2026-08-29) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Daniel Gonzalez (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-07|philadelphia|2300-arena|rushing-shaquille|gonzalez-daniel`, repeat index 1, sheet order 1 |
| Candidate record | 2026-02-21 vs Manuel Enrique Arrieta Sangroni, order 2; current: loss (rev1, identity_graph_reapply)<br>2026-03-13 vs Miguel Rosario-Paredes, order 1; current: loss (rev1, identity_graph_reapply)<br>2026-08-29 vs Arrieon Washpun, order 6; current: draw (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-08-28|philadelphia|live-casino|craig-darryl|miner-jerrod|a

| | |
|---|---|
| Source appearance | "CRAIG, DARRYL" (PA), corner a, 2026-08-28, Jesus Rivera at Live Casino; document `pa-results:2026:08-28-26 box rivera - live casino - 900 packer ave - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-28-26%20box%20rivera%20-%20live%20casino%20-%20900%20packer%20ave%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Darryl Craig [C, 60; 0 bouts; aliases: Darryl Craig (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Darryl Craig (`fe542928-cbf2-4c20-8468-a6345c3e8092`, resolver tier C) |
| Normalized name | darryl craig ~ darryl craig (exact) |
| City-level hometown | observed: NJ (not city-level); candidate: NJ |
| Official / contracted weight | 130.4 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Live Casino, Philadelphia |
| Opponent | Jerrod Miner (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-28|philadelphia|live-casino|craig-darryl|miner-jerrod`, repeat index 1, sheet order 1 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-08-29|philadelphia|2300-arena|bernadin-james|johns-dashaun|b

| | |
|---|---|
| Source appearance | "JOHNS, DASHAUN" (PA), corner b, 2026-08-29, Marshall Kauffman at 2300 Arena; document `pa-results:2026:08-29-26 box kauffman - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-29-26%20box%20kauffman%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|dashaun johns|text:ny|52c43320-6870-4d0a-aeb9-9922636d13d2` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Dashaun Johns [C, 69; 1 bouts; aliases: Dashaun Johns (name, verified)]<br>Amari Dashaun Walter Jones [-, -; 1 bouts; aliases: Amari Dashaun Walter Jones (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dashaun Johns (`52c43320-6870-4d0a-aeb9-9922636d13d2`, resolver tier C) |
| Normalized name | dashaun johns ~ dashaun johns (exact) |
| City-level hometown | observed: NY (not city-level); candidate: Brooklyn, NY |
| Official / contracted weight | 142.6 lb / -; candidate weights: 141 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | James Bernadin (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-29|philadelphia|2300-arena|bernadin-james|johns-dashaun`, repeat index 1, sheet order 3 |
| Candidate record | 2026-07-25 vs Ezequiel Martinez, order 4; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-08-29|philadelphia|2300-arena|madison-colby|isom-riley-lemir|a

| | |
|---|---|
| Source appearance | "MADISON, COLBY" (PA), corner a, 2026-08-29, Marshall Kauffman at 2300 Arena; document `pa-results:2026:08-29-26 box kauffman - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-29-26%20box%20kauffman%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Colby Courter [-, -; 1 bouts; aliases: Colby Courter (name, verified)]<br>Colby Madison [C, 69; 1 bouts; aliases: Colby Madison (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Colby Madison (`d4c3126d-9a44-4252-aed0-af17a56f2fd3`, resolver tier C) |
| Normalized name | colby madison ~ colby madison (exact) |
| City-level hometown | observed: MD (not city-level); candidate: Baltimore, MD |
| Official / contracted weight | 258 lb / -; candidate weights: 256 (2026-05-30) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Lemir Isom-Riley (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-29|philadelphia|2300-arena|madison-colby|isom-riley-lemir`, repeat index 1, sheet order 7 |
| Candidate record | 2026-05-30 vs Dominique Valera, order 7; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-08-29|philadelphia|2300-arena|young-devon|webster-vercell|a

| | |
|---|---|
| Source appearance | "YOUNG, DEVON" (PA), corner a, 2026-08-29, Marshall Kauffman at 2300 Arena; document `pa-results:2026:08-29-26 box kauffman - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-29-26%20box%20kauffman%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Devon Young [C, 60; 0 bouts; aliases: Devon Young (name, verified)]<br>Devon Rosa [-, -; 0 bouts; aliases: Devon Rosa (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Devon Young (`19c2c221-d3b4-4782-9d56-98b63e421595`, resolver tier C) |
| Normalized name | devon young ~ devon young (exact) |
| City-level hometown | observed: SC (not city-level); candidate: South Carolina |
| Official / contracted weight | 218 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Vercell Webster (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-29|philadelphia|2300-arena|young-devon|webster-vercell`, repeat index 1, sheet order 2 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-01-17|philadelphia|2300-arena|mendez-sosa-josue|corona-eduardo|a

| | |
|---|---|
| Source appearance | "MENDEZ SOSA, JOSUE" (PA), corner a, 2026-01-17, Marshall Kauffman at 2300 Arena; document `pa-results:2026:01-17-26 - box - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/01-17-26%20-%20box%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Jason Sosa [-, -; 0 bouts; aliases: Jason Sosa (name, verified)]<br>Jorge Rodrigo Sosa [-, -; 1 bouts; aliases: Jorge Rodrigo Sosa (name, verified)]<br>Josue Sosa Mendez [C, 69; 1 bouts; aliases: Josue Sosa Mendez (name, verified)]<br>Josue Silva [-, -; 0 bouts; aliases: Josue Silva (name, verified)]<br>Jonathan A. Sosa [-, -; 1 bouts; aliases: Jonathan A. Sosa (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Josue Sosa Mendez (`9f35cf5b-52a2-417f-9c89-5d39512da84c`, resolver tier C) |
| Normalized name | josue mendez sosa ~ josue sosa mendez (reordered) |
| City-level hometown | observed: FL (not city-level); candidate: Cuba |
| Official / contracted weight | 141.8 lb / -; candidate weights: 142 (2026-05-16) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Eduardo Corona (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-01-17|philadelphia|2300-arena|mendez-sosa-josue|corona-eduardo`, repeat index 1, sheet order 6 |
| Candidate record | 2026-05-16 vs Angelo Colon, order 9; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-01-17|philadelphia|2300-arena|pero-dainier|aguilar-mario|a

| | |
|---|---|
| Source appearance | "PERO, DAINIER" (PA), corner a, 2026-01-17, Marshall Kauffman at 2300 Arena; document `pa-results:2026:01-17-26 - box - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/01-17-26%20-%20box%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Dainier Pero [C, 69; 1 bouts; aliases: Dainier Pero (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dainier Pero (`bcee4271-3520-41ab-b771-7feb19bc8566`, resolver tier C) |
| Normalized name | dainier pero ~ dainier pero (exact) |
| City-level hometown | observed: NV (not city-level); candidate: Miami, FL. |
| Official / contracted weight | 231 lb / -; candidate weights: 232.8 (2026-08-08) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Mario Aguilar (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-01-17|philadelphia|2300-arena|pero-dainier|aguilar-mario`, repeat index 1, sheet order 1 |
| Candidate record | 2026-08-08 vs Aleem Whitfield, order 5; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: stated_place_mismatch |

## 003:mo_office_of_athletics:2026-02-13|kansas-city|event-26-103|jay-krupp|izak-carlos|b

| | |
|---|---|
| Source appearance | "Izak Carlos" (MO), corner b, 2026-02-13, Blue Corner Promotions at Harrah’s Casino; document `mo-results:2026-02-13 BOXRESAKICKRES Kansas City Blue Corner Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-02-13%20BOXRESAKICKRES%20Kansas%20City%20Blue%20Corner%20Promo.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:hometown+weight |
| All candidates | Izak Carlos [C, 78; 1 bouts; aliases: Izak Carlos (name, verified)]<br>Carlos Lewis [-, -; 1 bouts; aliases: Carlos Lewis (name, verified)]<br>Carlos Adames [-, -; 1 bouts; aliases: Carlos Adames (name, verified)]<br>Carlos Padilla [-, -; 1 bouts; aliases: Carlos Padilla (name, verified)]<br>Jorge Carlos [-, -; 1 bouts; aliases: Jorge Carlos (name, verified)]<br>Carlos Buitrago [-, -; 1 bouts; aliases: Carlos Buitrago (name, verified)]<br>Carlos Suarez [-, -; 1 bouts; aliases: Carlos Suarez (name, verified)]<br>Carlos Gonzalez [-, -; 1 bouts; aliases: Carlos Gonzalez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Izak Carlos (`2e34f74b-d2e1-4b0c-98c8-aff0463b57a6`, resolver tier C) |
| Normalized name | izak carlos ~ izak carlos (exact) |
| City-level hometown | observed: Olathe, KS (olathe, ks); candidate: Olathe, KS |
| Official / contracted weight | 137 lb / -; candidate weights: 132 (2026-05-16) |
| Commission / venue | mo-office-of-athletics / Harrah’s Casino, Kansas City |
| Opponent | Jay Krupp (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-02-13|kansas-city|event-26-103|jay-krupp|izak-carlos`, repeat index 1, sheet order 11 |
| Candidate record | 2026-05-16 vs David Michael Paz, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:hometown+weight |
| Danger flags | same_surname_same_city_different_given_name |
| **Workbench recommendation (advice only)** | **hold**: danger case: same_surname_same_city_different_given_name |

## 003:pa_state_athletic_commission:2026-03-07|pa|mohegan-sun-wilkes-barre|blumenfeld-thomas|brito-willmank|b

| | |
|---|---|
| Source appearance | "BRITO, WILLMANK" (PA), corner b, 2026-03-07, Chris Coyne at MOHEGAN SUN - Wilkes Barre; document `pa-results:2026:03-07-26 box coyne - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20coyne%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Willmank Canonico Brito [C, 59; 1 bouts; aliases: Willmank Canonico Brito (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Willmank Canonico Brito (`2acf0b86-5c40-4acf-8391-ec88613d80bd`, resolver tier C) |
| Normalized name | willmank brito ~ willmank canonico brito (containment) |
| City-level hometown | observed: FL (not city-level); candidate: Rosarito, Mexico |
| Official / contracted weight | 140.4 lb / -; candidate weights: 142 (2026-06-13) |
| Commission / venue | pa-state-athletic-commission / MOHEGAN SUN - Wilkes Barre |
| Opponent | Thomas Blumenfeld (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-07|pa|mohegan-sun-wilkes-barre|blumenfeld-thomas|brito-willmank`, repeat index 1, sheet order 3 |
| Candidate record | 2026-06-13 vs Daiyaan Butt, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 59 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | name_not_exact_form, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form, stated_place_mismatch |

## 003:mo_office_of_athletics:2026-03-20|independence|event-26-160|kevin-soltero|jesus-segundo-martinez|b

| | |
|---|---|
| Source appearance | "Jesus Segundo Martinez" (MO), corner b, 2026-03-20, KC Boxing Promotions at Truman Memorial Building; document `mo-results:2026-03-20 BOXRES Independence KC Boxing Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-20%20BOXRES%20Independence%20KC%20Boxing%20Promo.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Eric Martinez [-, -; 1 bouts; aliases: Eric Martinez (name, verified)]<br>Jesus Segundo Martinez Carrascal [C, 59; 1 bouts; aliases: Jesus Segundo Martinez Carrascal (name, verified)]<br>Armando Martinez Rabi [-, -; 1 bouts; aliases: Armando Martinez Rabi (name, verified)]<br>Javier Martinez [-, -; 2 bouts; aliases: Javier Martinez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jesus Segundo Martinez Carrascal (`96fab8b3-8904-46ac-913a-56dccd435e08`, resolver tier C) |
| Normalized name | jesus segundo martinez ~ jesus segundo martinez carrascal (containment) |
| City-level hometown | observed: Miami, FL (miami, fl); candidate: Colombia |
| Official / contracted weight | 120.3 lb / -; candidate weights: 119.2 (2026-08-16) |
| Commission / venue | mo-office-of-athletics / Truman Memorial Building, Independence |
| Opponent | Kevin Soltero (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-20|independence|event-26-160|kevin-soltero|jesus-segundo-martinez`, repeat index 1, sheet order 3 |
| Candidate record | 2026-08-16 vs Ari Bonilla, order 3; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 59 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | name_not_exact_form, common_surname, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form, common_surname, stated_place_mismatch |

## 003:mo_office_of_athletics:2026-03-21|st-louis|event-26-144|cesar-miranda|daevion-williams|b

| | |
|---|---|
| Source appearance | "Daevion Williams" (MO), corner b, 2026-03-21, Box Culture Promotions at Ambassador Club; document `mo-results:2026-03-21 BOXRES St. Louis Box Culture Promotions` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-21%20BOXRES%20St.%20Louis%20Box%20Culture%20Promotions.pdf)) |
| Why held | queue: given_name_variant; resolver: contradiction:hometown_different_city+weight_incompatible |
| All candidates | Tyhler Williams [-, -; 1 bouts; aliases: Tyhler Williams (name, verified)]<br>Osiris Williams [-, -; 2 bouts; aliases: Osiris Williams (name, verified)]<br>Caleb Williams [-, -; 1 bouts; aliases: Caleb Williams (name, verified)]<br>Craig Williams [-, -; 1 bouts; aliases: Craig Williams (name, verified)]<br>Steven Williams [-, -; 1 bouts; aliases: Steven Williams (name, verified)]<br>De Von Williams [C, 20; 2 bouts; aliases: De Von Williams (name, verified), DeVon Williams (name, review)]<br>Larry Williams [-, -; 1 bouts; aliases: Larry Williams (name, verified)]<br>Devonte Williams [-, -; 1 bouts; aliases: Devonte Williams (name, verified)]<br>Austin Williams [-, -; 1 bouts; aliases: Austin Williams (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | De Von Williams (`d7f58a44-9276-4417-8b4c-e4bbcd5777b8`, resolver tier C) |
| Normalized name | daevion williams ~ de williams (transliteration) |
| City-level hometown | observed: St. Louis, MO (st louis, mo); candidate: Fort Lauderdale, FL / Fort Lauderdale, FL. |
| Official / contracted weight | 183.2 lb / -; candidate weights: 144.8 (2026-04-12), 147 (2026-08-08) |
| Commission / venue | mo-office-of-athletics / Ambassador Club, St. Louis |
| Opponent | Cesar Miranda (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-21|st-louis|event-26-144|cesar-miranda|daevion-williams`, repeat index 1, sheet order 3 |
| Candidate record | 2026-04-12 vs Roberto Acevedo-Santiago, order 5; current: win (rev1, identity_graph_reapply)<br>2026-08-08 vs Lionell Omar Colon Santana, order 9; current: win (rev1) |
| Contradictions | given_name_differs, hometown_different_city:st louis, mo vs fort lauderdale, fl, weight_183.2_vs_144.8_on_2026-04-12 |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 20 |
| Why the resolver stopped | contradiction:hometown_different_city+weight_incompatible |
| Danger flags | name_not_exact_form, given_name_differs, common_surname, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form, given_name_differs, common_surname, stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-03-28|chester|harrah-s-casino|millard-edward|wilson-anthony|a

| | |
|---|---|
| Source appearance | "MILLARD, EDWARD" (PA), corner a, 2026-03-28, Greg Pritchett at Harrah's Casino; document `pa-results:2026:03-28-26 box pritchett - harrahs casino - chester pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-28-26%20box%20pritchett%20-%20harrahs%20casino%20-%20chester%20pa%20%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Edward Griffitts [-, -; 3 bouts; aliases: Edward Griffitts (name, verified)]<br>Edward Millard [C, 60; 0 bouts; aliases: Edward Millard (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Edward Millard (`ca72e77d-f005-4f89-8df8-f681bcffa71d`, resolver tier C) |
| Normalized name | edward millard ~ edward millard (exact) |
| City-level hometown | observed: PA (not city-level); candidate: Brooklyn, Ny |
| Official / contracted weight | 266.6 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Harrah's Casino, Chester |
| Opponent | Anthony Wilson (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-28|chester|harrah-s-casino|millard-edward|wilson-anthony`, repeat index 1, sheet order 3 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-04-03|allentown|the-archer|morales-gustavo|bridges-chevy|a

| | |
|---|---|
| Source appearance | "MORALES, GUSTAVO" (PA), corner a, 2026-04-03, James Bartley at The Archer; document `pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Josue Morales [-, -; 1 bouts; aliases: Josue Morales (name, verified)]<br>Gustavo Morales [C, 78; 1 bouts; aliases: Gustavo Morales (name, verified)]<br>Gustavo Trujillo [-, -; 2 bouts; aliases: Gustavo Trujillo (name, verified)]<br>Angel Meza Morales [-, -; 1 bouts; aliases: Angel Meza Morales (name, verified)]<br>Holman Morales [-, -; 1 bouts; aliases: Holman Morales (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Gustavo Morales (`63ab0697-7e3e-4069-bf9b-e51134216ad3`, resolver tier C) |
| Normalized name | gustavo morales ~ gustavo morales (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 159.8 lb / -; candidate weights: 153.8 (2026-05-29) |
| Commission / venue | pa-state-athletic-commission / The Archer, Allentown |
| Opponent | Chevy Bridges (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-04-03|allentown|the-archer|morales-gustavo|bridges-chevy`, repeat index 1, sheet order 8 |
| Candidate record | 2026-05-29 vs Kevin Luna, order 2; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: common_surname |

## 003:pa_state_athletic_commission:2026-04-11|philadelphia|2300-arena|herrera-alejandro|garcia-david|b

| | |
|---|---|
| Source appearance | "GARCIA, DAVID" (PA), corner b, 2026-04-11, Brian Costello at 2300 Arena; document `pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | David Hardy [-, -; 1 bouts; aliases: David Hardy (name, verified)]<br>Michael Garcia [-, -; 1 bouts; aliases: Michael Garcia (name, verified)]<br>John Garcia [-, -; 1 bouts; aliases: John Garcia (name, verified)]<br>David Malul [-, -; 1 bouts; aliases: David Malul (name, verified)]<br>Ryan Garcia [-, -; 1 bouts; aliases: Ryan Garcia (name, verified)]<br>David Garcia [C, 78; 1 bouts; aliases: David Garcia (name, verified)]<br>Edgar Garcia De Leon [-, -; 0 bouts; aliases: Edgar Garcia De Leon (name, verified)]<br>Eridson Garcia [-, -; 1 bouts; aliases: Eridson Garcia (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | David Garcia (`78d35a29-3de4-4580-a7b9-2dcbeba5e7bc`, resolver tier C) |
| Normalized name | david garcia ~ david garcia (exact) |
| City-level hometown | observed: AZ (not city-level); candidate: AZ |
| Official / contracted weight | 121 lb / -; candidate weights: 123.4 (2026-05-29) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Alejandro Herrera (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-04-11|philadelphia|2300-arena|herrera-alejandro|garcia-david`, repeat index 1, sheet order 4 |
| Candidate record | 2026-05-29 vs Josue Morales, order 6; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: common_surname |

## 003:mo_office_of_athletics:2026-04-25|kansas-city|event-26-175|helton-lara|jorge-carlos|b

| | |
|---|---|
| Source appearance | "Jorge Carlos" (MO), corner b, 2026-04-25, Blue Corner Promotions at Harrah’s Casino; document `mo-results:2026-04-25 BOXRES KICKRES Kansas CIty Blue Corner` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-04-25%20BOXRES%20KICKRES%20Kansas%20CIty%20Blue%20Corner.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:hometown+weight |
| All candidates | Izak Carlos [-, -; 1 bouts; aliases: Izak Carlos (name, verified)]<br>Carlos Lewis [-, -; 1 bouts; aliases: Carlos Lewis (name, verified)]<br>Carlos Adames [-, -; 1 bouts; aliases: Carlos Adames (name, verified)]<br>Jordan Carr [-, -; 1 bouts; aliases: Jordan Carr (name, verified)]<br>Carlos Padilla [-, -; 1 bouts; aliases: Carlos Padilla (name, verified)]<br>Jorge Carlos [C, 78; 1 bouts; aliases: Jorge Carlos (name, verified)]<br>Carlos Buitrago [-, -; 1 bouts; aliases: Carlos Buitrago (name, verified)]<br>Carlos Suarez [-, -; 1 bouts; aliases: Carlos Suarez (name, verified)]<br>Carlos Gonzalez [-, -; 1 bouts; aliases: Carlos Gonzalez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jorge Carlos (`7fc52a96-07ac-49b4-be99-b8cf16f55927`, resolver tier C) |
| Normalized name | jorge carlos ~ jorge carlos (exact) |
| City-level hometown | observed: Olathe, KS (olathe, ks); candidate: Olathe, KS |
| Official / contracted weight | 143.6 lb / -; candidate weights: 143.4 (2026-01-24) |
| Commission / venue | mo-office-of-athletics / Harrah’s Casino, Kansas City |
| Opponent | Helton Lara (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-25|kansas-city|event-26-175|helton-lara|jorge-carlos`, repeat index 1, sheet order 9 |
| Candidate record | 2026-01-24 vs Jaylin Strong, order 4; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:hometown+weight |
| Danger flags | same_surname_same_city_different_given_name |
| **Workbench recommendation (advice only)** | **hold**: danger case: same_surname_same_city_different_given_name |

## 003:mo_office_of_athletics:2026-05-16|kansas-city|event-26-163|marcel-davidson|wilfrido-buelvas-pacheco|b

| | |
|---|---|
| Source appearance | "Wilfrido Buelvas Pacheco" (MO), corner b, 2026-05-16, KC Boxing Promotions at Scottish Rite Temple; document `mo-results:2026-05-16 BOXRES Kansas City KC Boxing Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-05-16%20BOXRES%20Kansas%20City%20KC%20Boxing%20Promo.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Wilfrido Buelvas Pacheco [C, 69; 1 bouts; aliases: Wilfrido Buelvas Pacheco (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Wilfrido Buelvas Pacheco (`9e7a52a1-6ddd-4064-91bd-f97d53096422`, resolver tier C) |
| Normalized name | wilfrido buelvas pacheco ~ wilfrido buelvas pacheco (exact) |
| City-level hometown | observed: Barranquilla, COL (barranquilla, col); candidate: Columbia |
| Official / contracted weight | 142.3 lb / -; candidate weights: 144.6 (2026-02-19) |
| Commission / venue | mo-office-of-athletics / Scottish Rite Temple, Kansas City |
| Opponent | Marcel Davidson (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-16|kansas-city|event-26-163|marcel-davidson|wilfrido-buelvas-pacheco`, repeat index 1, sheet order 2 |
| Candidate record | 2026-02-19 vs Terrence Williams, order 5; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: stated_place_mismatch |

## 003:mo_office_of_athletics:2026-05-16|kansas-city|event-26-163|wilver-hernandez|jesus-segundo-martinez|b

| | |
|---|---|
| Source appearance | "Jesus Segundo Martinez" (MO), corner b, 2026-05-16, KC Boxing Promotions at Scottish Rite Temple; document `mo-results:2026-05-16 BOXRES Kansas City KC Boxing Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-05-16%20BOXRES%20Kansas%20City%20KC%20Boxing%20Promo.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Eric Martinez [-, -; 1 bouts; aliases: Eric Martinez (name, verified)]<br>Jesus Segundo Martinez Carrascal [C, 59; 1 bouts; aliases: Jesus Segundo Martinez Carrascal (name, verified)]<br>Armando Martinez Rabi [-, -; 1 bouts; aliases: Armando Martinez Rabi (name, verified)]<br>Javier Martinez [-, -; 2 bouts; aliases: Javier Martinez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jesus Segundo Martinez Carrascal (`96fab8b3-8904-46ac-913a-56dccd435e08`, resolver tier C) |
| Normalized name | jesus segundo martinez ~ jesus segundo martinez carrascal (containment) |
| City-level hometown | observed: Miami, FL (miami, fl); candidate: Colombia |
| Official / contracted weight | 120.8 lb / -; candidate weights: 119.2 (2026-08-16) |
| Commission / venue | mo-office-of-athletics / Scottish Rite Temple, Kansas City |
| Opponent | Wilver Hernandez (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-16|kansas-city|event-26-163|wilver-hernandez|jesus-segundo-martinez`, repeat index 1, sheet order 1 |
| Candidate record | 2026-08-16 vs Ari Bonilla, order 3; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 59 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | name_not_exact_form, common_surname, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form, common_surname, stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-05-22|philadelphia|live-casino-philadelphia|sosa-jason|rodriguez-emmanuel|b

| | |
|---|---|
| Source appearance | "Rodriguez, Emmanuel" (PA), corner b, 2026-05-22, Jesus Rivera at Live Casino Philadelphia; document `pa-results:2026:05-22-26 box rivera - live casino - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-22-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Ibarra-Rodriguez, [-, -; 1 bouts; aliases: Ibarra-Rodriguez, (name, verified)]<br>Colon- Rodriguez, [-, -; 1 bouts; aliases: Colon- Rodriguez, (name, verified)]<br>Emmanuel Rodriguez [C, 60; 0 bouts; aliases: Emmanuel Rodriguez (name, verified)]<br>Ruben Rodriguez [-, -; 1 bouts; aliases: Ruben Rodriguez (name, verified)]<br>Emmanuel Chance [-, -; 1 bouts; aliases: Emmanuel Chance (name, verified)]<br>Edwin Rodriguez Rojas [-, -; 1 bouts; aliases: Edwin Rodriguez Rojas (name, verified)]<br>Francisco Rodriguez [-, -; 1 bouts; aliases: Francisco Rodriguez (name, verified)]<br>Irvin Rodriguez [-, -; 0 bouts; aliases: Irvin Rodriguez (name, verified)]<br>Gabriel Rodriguez [-, -; 1 bouts; aliases: Gabriel Rodriguez (name, verified)]<br>Juan Rodriguez [-, -; 1 bouts; aliases: Juan Rodriguez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Emmanuel Rodriguez (`3e3f8ca9-3e53-478d-bad3-c77b72fc0316`, resolver tier C) |
| Normalized name | emmanuel rodriguez ~ emmanuel rodriguez (exact) |
| City-level hometown | observed: P Rico (not city-level); candidate: NJ |
| Official / contracted weight | 135 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Live Casino Philadelphia, Philadelphia |
| Opponent | Jason Sosa (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-22|philadelphia|live-casino-philadelphia|sosa-jason|rodriguez-emmanuel`, repeat index 1, sheet order 4 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | common_surname, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: common_surname, stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-05-29|allentown|archer-allentown-pa|philson-damari|alvarado-jose|b

| | |
|---|---|
| Source appearance | "ALVARADO, JOSE" (PA), corner b, 2026-05-29, James Bartley at Archer - Allentown Pa; document `pa-results:2026:05-29-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-29-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: contradiction:fought_within_13_days |
| All candidates | Jose Angulo [-, -; 1 bouts; aliases: Jose Angulo (name, verified)]<br>Ivan Alvarado [-, -; 0 bouts; aliases: Ivan Alvarado (name, verified)]<br>Jose Valenzuela Alvarado [C, 44; 2 bouts; aliases: Jose Valenzuela Alvarado (name, verified)]<br>Alexis Jesse Alvarado Ariel [-, -; 0 bouts; aliases: Alexis Jesse Alvarado Ariel (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jose Valenzuela Alvarado (`6eb66caa-9b42-4b05-ba67-c27516d415f6`, resolver tier C) |
| Normalized name | jose alvarado ~ jose valenzuela alvarado (containment) |
| City-level hometown | observed: PUEBLA (not city-level); candidate: Mexico / Puebla, MX |
| Official / contracted weight | 133.4 lb / -; candidate weights: 141.6 (2026-02-20), 137.6 (2026-05-16) |
| Commission / venue | pa-state-athletic-commission / Archer - Allentown, Pa, Allentown |
| Opponent | Damari Philson (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-29|allentown|archer-allentown-pa|philson-damari|alvarado-jose`, repeat index 1, sheet order 5 |
| Candidate record | 2026-02-20 vs Jusiyah Shirley, order 7; current: loss (rev1, identity_graph_reapply)<br>2026-05-16 vs Eric Valencia, order 7; current: loss (rev1) |
| Contradictions | fought_2026-05-16 |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 44 |
| Why the resolver stopped | contradiction:fought_within_13_days |
| Danger flags | name_not_exact_form, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form, stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-06-13|pa|pasquerilla-center-johnstown|michaels-lauren|davis-colleen|b

| | |
|---|---|
| Source appearance | "DAVIS, COLLEEN" (PA), corner b, 2026-06-13, Max Leasock at Pasquerilla Center - Johnstown; document `pa-results:2026:06-13-26 box leasock - pasquerilla conference center - johnstown - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-13-26%20box%20leasock%20-%20pasquerilla%20conference%20center%20-%20johnstown%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Colleen Davis [C, 78; 1 bouts; aliases: Colleen Davis (name, verified)]<br>Zavier Davis [-, -; 1 bouts; aliases: Zavier Davis (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Colleen Davis (`415d6c34-465c-4c85-9186-fdf2ed9d79f4`, resolver tier C) |
| Normalized name | colleen davis ~ colleen davis (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 124.1 lb / -; candidate weights: 125.6 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / Pasquerilla Center - Johnstown |
| Opponent | Lauren Michaels (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-06-13|pa|pasquerilla-center-johnstown|michaels-lauren|davis-colleen`, repeat index 1, sheet order 2 |
| Candidate record | 2026-07-25 vs Jaclyne McTamney, order 8; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | same_surname_same_region_different_given_name, common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: same_surname_same_region_different_given_name, common_surname |

## 003:pa_state_athletic_commission:2026-06-13|pa|pasquerilla-center-johnstown|watkins-brandon|garcia-raul|b

| | |
|---|---|
| Source appearance | "GARCIA, RAUL" (PA), corner b, 2026-06-13, Max Leasock at Pasquerilla Center - Johnstown; document `pa-results:2026:06-13-26 box leasock - pasquerilla conference center - johnstown - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-13-26%20box%20leasock%20-%20pasquerilla%20conference%20center%20-%20johnstown%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Michael Garcia [-, -; 1 bouts; aliases: Michael Garcia (name, verified)]<br>John Garcia [-, -; 1 bouts; aliases: John Garcia (name, verified)]<br>Ryan Garcia [-, -; 1 bouts; aliases: Ryan Garcia (name, verified)]<br>David Garcia [-, -; 1 bouts; aliases: David Garcia (name, verified)]<br>Raul Curiel Garcia [C, 59; 1 bouts; aliases: Raul Curiel Garcia (name, verified)]<br>Edgar Garcia De Leon [-, -; 0 bouts; aliases: Edgar Garcia De Leon (name, verified)]<br>Eridson Garcia [-, -; 1 bouts; aliases: Eridson Garcia (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Raul Curiel Garcia (`91bbd25a-aabe-41ac-8ffd-08cdde4aee80`, resolver tier C) |
| Normalized name | raul garcia ~ raul curiel garcia (containment) |
| City-level hometown | observed: OK (not city-level); candidate: Guadalajara, Jalisco, MEXICO |
| Official / contracted weight | 147.2 lb / -; candidate weights: 148.2 (2026-08-01) |
| Commission / venue | pa-state-athletic-commission / Pasquerilla Center - Johnstown |
| Opponent | Brandon Watkins (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-13|pa|pasquerilla-center-johnstown|watkins-brandon|garcia-raul`, repeat index 1, sheet order 3 |
| Candidate record | 2026-08-01 vs Quinton Nathaniel Randall, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 59 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | name_not_exact_form, common_surname, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form, common_surname, stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-06-13|philadelphia|first-district-plaza|arrollo-luis|gonzalez-ethan|a

| | |
|---|---|
| Source appearance | "ARROLLO, LUIS" (PA), corner a, 2026-06-13, Dominique Walton at First District Plaza; document `pa-results:2026:06-13-26 box walton - first district plaza - phila., pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-13-26%20box%20walton%20-%20first%20district%20plaza%20-%20phila.,%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Luis Arrollo [C, 78; 1 bouts; aliases: Luis Arrollo (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Luis Arrollo (`a477490d-43e0-47f2-8ae8-e962ac725bdb`, resolver tier C) |
| Normalized name | luis arrollo ~ luis arrollo (exact) |
| City-level hometown | observed: MEXICO (not city-level); candidate: SONORA |
| Official / contracted weight | 126.6 lb / -; candidate weights: 132 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / First District Plaza, Philadelphia |
| Opponent | Ethan Gonzalez (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-06-13|philadelphia|first-district-plaza|arrollo-luis|gonzalez-ethan`, repeat index 1, sheet order 6 |
| Candidate record | 2026-07-25 vs Christian Ortiz, order 6; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-06-20|philadelphia|2300-arena-philadelphia|flemmings-dwyke|arteaga-andy|a

| | |
|---|---|
| Source appearance | "FLEMMINGS, DWYKE" (PA), corner a, 2026-06-20, Thomas Lamanna at 2300 Arena Philadelphia; document `pa-results:2026:06-20-26 box lamanna - 2300 arena - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-20-26%20box%20lamanna%20-%202300%20arena%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: suffix_missing; resolver: contradiction:suffix_missing |
| All candidates | Dwyke Flemmings, Jr. [C, 44; 1 bouts; aliases: Dwyke Flemmings, Jr. (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dwyke Flemmings, Jr. (`9c421ac8-6d1c-4698-bc50-dd95f505cc41`, resolver tier C) |
| Normalized name | dwyke flemmings ~ dwyke flemmings jr (containment) |
| City-level hometown | observed: NJ (not city-level); candidate: Paterson, NJ |
| Official / contracted weight | 156.8 lb / -; candidate weights: 153.6 (2026-04-11) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena Philadelphia, Philadelphia |
| Opponent | Andy Arteaga (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-20|philadelphia|2300-arena-philadelphia|flemmings-dwyke|arteaga-andy`, repeat index 1, sheet order 9 |
| Candidate record | 2026-04-11 vs Yan Marcos, order 6; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 44 |
| Why the resolver stopped | contradiction:suffix_missing |
| Danger flags | generational_suffix, name_not_exact_form |
| **Workbench recommendation (advice only)** | **hold**: danger case: generational_suffix, name_not_exact_form |

## 003:pa_state_athletic_commission:2026-06-20|philadelphia|2300-arena-philadelphia|ortiz-joshafat|holcomb-william|a

| | |
|---|---|
| Source appearance | "ORTIZ, JOSHAFAT" (PA), corner a, 2026-06-20, Thomas Lamanna at 2300 Arena Philadelphia; document `pa-results:2026:06-20-26 box lamanna - 2300 arena - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-20-26%20box%20lamanna%20-%202300%20arena%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Luis Ortiz [-, -; 1 bouts; aliases: Luis Ortiz (name, verified)]<br>Chris J. Ortiz [-, -; 1 bouts; aliases: Chris J. Ortiz (name, verified)]<br>Joshafat Ortiz [C, 69; 1 bouts; aliases: Joshafat Ortiz (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Joshafat Ortiz (`b11a6bb8-3963-47ed-9ab5-4b99a8571632`, resolver tier C) |
| Normalized name | joshafat ortiz ~ joshafat ortiz (exact) |
| City-level hometown | observed: PA (not city-level); candidate: Reading, PA |
| Official / contracted weight | 131.8 lb / -; candidate weights: 130 (2026-04-10) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena Philadelphia, Philadelphia |
| Opponent | William Holcomb (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-20|philadelphia|2300-arena-philadelphia|ortiz-joshafat|holcomb-william`, repeat index 1, sheet order 5 |
| Candidate record | 2026-04-10 vs William Foster, order 7; current: no_contest (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | same_surname_same_region_different_given_name, common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: same_surname_same_region_different_given_name, common_surname |

## 003:pa_state_athletic_commission:2026-06-20|philadelphia|2300-arena-philadelphia|rodriguez-emmanuel|morales-luis|b

| | |
|---|---|
| Source appearance | "MORALES, LUIS" (PA), corner b, 2026-06-20, Thomas Lamanna at 2300 Arena Philadelphia; document `pa-results:2026:06-20-26 box lamanna - 2300 arena - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/06-20-26%20box%20lamanna%20-%202300%20arena%20-%20phila%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Josue Morales [-, -; 1 bouts; aliases: Josue Morales (name, verified)]<br>Gustavo Morales [-, -; 1 bouts; aliases: Gustavo Morales (name, verified)]<br>Luis Almendarez-Morales [C, 59; 1 bouts; aliases: Luis Almendarez-Morales (name, verified)]<br>Angel Meza Morales [-, -; 1 bouts; aliases: Angel Meza Morales (name, verified)]<br>Holman Morales [-, -; 1 bouts; aliases: Holman Morales (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Luis Almendarez-Morales (`c57f5e4e-0cd5-4357-bdc0-943f646c6d77`, resolver tier C) |
| Normalized name | luis morales ~ luis almendarez morales (containment) |
| City-level hometown | observed: CA (not city-level); candidate: Tijuana, MX |
| Official / contracted weight | 123.2 lb / -; candidate weights: 125 (2026-04-10) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena Philadelphia, Philadelphia |
| Opponent | Emmanuel Rodriguez (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-06-20|philadelphia|2300-arena-philadelphia|rodriguez-emmanuel|morales-luis`, repeat index 1, sheet order 7 |
| Candidate record | 2026-04-10 vs Keith Colon, order 4; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 59 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | name_not_exact_form, common_surname, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form, common_surname, stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-07-25|philadelphia|the-fillmore|rivera-delgado|carlos|b

| | |
|---|---|
| Source appearance | "CARLOS" (PA), corner b, 2026-07-25, Brian Costello at The Fillmore; document `pa-results:2026:07-25-26 box costello - canstatters - 9130 academy road -phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-25-26%20box%20costello%20-%20canstatters%20-%209130%20academy%20road%20-phila.%20pa%20-%20results.pdf)) |
| Why held | queue: weak_name_only; resolver: no_name_similar_candidates |
| All candidates | Carlos Jamil De Leon Castro [C, 40; 2 bouts; aliases: Carlos Jamil De Leon Castro (name, verified)]<br>Izak Carlos [C, 40; 1 bouts; aliases: Izak Carlos (name, verified)]<br>Carlos Lewis [C, 40; 1 bouts; aliases: Carlos Lewis (name, verified)]<br>Carlos Adames [-, -; 1 bouts; aliases: Carlos Adames (name, verified)]<br>Carlos Padilla [-, -; 1 bouts; aliases: Carlos Padilla (name, verified)]<br>Carlos Fromenta Romero [-, -; 0 bouts; aliases: Carlos Fromenta Romero (name, verified)]<br>Jorge Carlos [-, -; 1 bouts; aliases: Jorge Carlos (name, verified)]<br>Carlos Buitrago [-, -; 1 bouts; aliases: Carlos Buitrago (name, verified)]<br>Carlos Suarez [C, 49; 1 bouts; aliases: Carlos Suarez (name, verified)]<br>Carlos Gonzalez [C, 49; 1 bouts; aliases: Carlos Gonzalez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Carlos Suarez (`8d2b5297-f2e8-47a8-9cf2-1ff8b4fb627a`, resolver tier C) |
| Normalized name | carlos ~ carlos suarez (none) |
| City-level hometown | observed: - (not city-level); candidate: ARGENTI |
| Official / contracted weight | - lb / -; candidate weights: 140 (2026-06-13) |
| Commission / venue | pa-state-athletic-commission / The Fillmore, Philadelphia |
| Opponent | Rivera Delgado, (already resolved: approving unlocks this bout) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-07-25|philadelphia|the-fillmore|rivera-delgado|carlos`, repeat index 1, sheet order 5 |
| Candidate record | 2026-06-13 vs Kadeen Hunter, order 4; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | Carlos Jamil De Leon Castro [C, 40]; Izak Carlos [C, 40]; Carlos Lewis [C, 40]; Carlos Gonzalez [C, 49] |
| Confidence | 49 |
| Why the resolver stopped | no_name_similar_candidates |
| Danger flags | name_not_exact_form |
| **Workbench recommendation (advice only)** | **hold**: 5 plausible candidates: needs independent evidence |

## 003:pa_state_athletic_commission:2026-07-25|philadelphia|the-fillmore|rivera-juan|murray-derrick|a

| | |
|---|---|
| Source appearance | "RIVERA, JUAN" (PA), corner a, 2026-07-25, Brian Costello at The Fillmore; document `pa-results:2026:07-25-26 box costello - canstatters - 9130 academy road -phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-25-26%20box%20costello%20-%20canstatters%20-%209130%20academy%20road%20-phila.%20pa%20-%20results.pdf)) |
| Why held | queue: ambiguous; resolver: more_than_one_plausible_candidate |
| All candidates | Jan Paul Rivera-Pizarro [C, 50; 1 bouts; aliases: Jan Paul Rivera-Pizarro (name, verified)]<br>Juan Rivera V [C, 59; 1 bouts; aliases: Juan Rivera V (name, verified)]<br>Rivera Delgado, [-, -; 0 bouts; aliases: Rivera Delgado, (name, verified)]<br>Rigoberto Rivera [-, -; 1 bouts; aliases: Rigoberto Rivera (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Juan Rivera V (`2ce5305b-a407-44fe-9fd7-7176d6bc8ff3`, resolver tier C) |
| Normalized name | juan rivera ~ juan rivera v (containment) |
| City-level hometown | observed: PA (not city-level); candidate: Philadelphia, PA |
| Official / contracted weight | 142.4 lb / -; candidate weights: 141.7 (2026-06-06) |
| Commission / venue | pa-state-athletic-commission / The Fillmore, Philadelphia |
| Opponent | Derrick Murray (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-25|philadelphia|the-fillmore|rivera-juan|murray-derrick`, repeat index 1, sheet order 10 |
| Candidate record | 2026-06-06 vs Chuckie Driver (a/k/a Demarius Driver), order 8; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | Jan Paul Rivera-Pizarro [C, 50] |
| Confidence | 59 |
| Why the resolver stopped | more_than_one_plausible_candidate |
| Danger flags | name_not_exact_form |
| **Workbench recommendation (advice only)** | **hold**: 2 plausible candidates: needs independent evidence |

## 003:pa_state_athletic_commission:2026-08-29|philadelphia|2300-arena|gonzalez-julian|pettis-trakwon|a

| | |
|---|---|
| Source appearance | "GONZALEZ, JULIAN" (PA), corner a, 2026-08-29, Marshall Kauffman at 2300 Arena; document `pa-results:2026:08-29-26 box kauffman - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-29-26%20box%20kauffman%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Johan Gonzalez [-, -; 1 bouts; aliases: Johan Gonzalez (name, verified)]<br>Jorge Gonzalez [-, -; 1 bouts; aliases: Jorge Gonzalez (name, verified)]<br>Peter Gonzalez [-, -; 1 bouts; aliases: Peter Gonzalez (name, verified)]<br>Julian Gonzalez Sanchez [C, 50; 0 bouts; aliases: Julian Gonzalez Sanchez (name, verified)]<br>Andy Gonzalez [-, -; 1 bouts; aliases: Andy Gonzalez (name, verified)]<br>Daniel Gonzalez [-, -; 0 bouts; aliases: Daniel Gonzalez (name, verified)]<br>Carlos Gonzalez [-, -; 1 bouts; aliases: Carlos Gonzalez (name, verified)]<br>Frank Gonzalez [-, -; 0 bouts; aliases: Frank Gonzalez (name, verified)]<br>Elijah Gonzalez [-, -; 1 bouts; aliases: Elijah Gonzalez (name, verified)]<br>Ethan Gonzalez [-, -; 0 bouts; aliases: Ethan Gonzalez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Julian Gonzalez Sanchez (`7f8453a1-360b-4009-8511-a7cf80308aec`, resolver tier C) |
| Normalized name | julian gonzalez ~ julian gonzalez sanchez (containment) |
| City-level hometown | observed: PA (not city-level); candidate: Reading, PA |
| Official / contracted weight | 134.4 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Trakwon Pettis (already resolved: approving unlocks this bout) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-29|philadelphia|2300-arena|gonzalez-julian|pettis-trakwon`, repeat index 1, sheet order 6 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 50 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | same_surname_same_region_different_given_name, name_not_exact_form, common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: same_surname_same_region_different_given_name, name_not_exact_form, common_surname |

## 003:pa_state_athletic_commission:2026-02-06|philadelphia|live-casino|box-cali|still-everlon|a

| | |
|---|---|
| Source appearance | "Box, Cali" (PA), corner a, 2026-02-06, Jesus Rivera at Live Casino; document `pa-results:2026:02-06-26 box rivera - live casino - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-06-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20%20-%20%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Cali Box [C, 78; 1 bouts; aliases: Cali Box (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Cali Box (`eb12d7f7-6d3d-47ab-bccf-ef67871eb430`, resolver tier C) |
| Normalized name | cali box ~ cali box (exact) |
| City-level hometown | observed: nj (not city-level); candidate: NJ |
| Official / contracted weight | 169 lb / -; candidate weights: 169.2 (2026-05-22) |
| Commission / venue | pa-state-athletic-commission / Live Casino, Philadelphia |
| Opponent | Everlon Still (unresolved: the bout needs both corners) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-02-06|philadelphia|live-casino|box-cali|still-everlon`, repeat index 1, sheet order 3 |
| Candidate record | 2026-05-22 vs Everlon Still, order 3; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-02-06|philadelphia|live-casino|box-cali|still-everlon|b

| | |
|---|---|
| Source appearance | "STILL, EVERLON" (PA), corner b, 2026-02-06, Jesus Rivera at Live Casino; document `pa-results:2026:02-06-26 box rivera - live casino - phila pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-06-26%20box%20rivera%20-%20live%20casino%20-%20phila%20pa%20%20-%20%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Everlon Still [C, 78; 1 bouts; aliases: Everlon Still (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Everlon Still (`188c6c69-7eb6-4b74-ab25-130d6e0d7097`, resolver tier C) |
| Normalized name | everlon still ~ everlon still (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 171 lb / -; candidate weights: 172.4 (2026-05-22) |
| Commission / venue | pa-state-athletic-commission / Live Casino, Philadelphia |
| Opponent | Cali Box (unresolved: the bout needs both corners) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-02-06|philadelphia|live-casino|box-cali|still-everlon`, repeat index 1, sheet order 3 |
| Candidate record | 2026-05-22 vs Cali Box, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-07|philadelphia|sixth-man-center|gormley-cahir|ajuwa-elias|a

| | |
|---|---|
| Source appearance | "GORMLEY, CAHIR" (PA), corner a, 2026-03-07, Dominique Walton at Sixth Man Center; document `pa-results:2026:03-07-26 box walton - sixth man arena - phila., pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20walton%20-%20sixth%20man%20arena%20-%20phila.%2C%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|cahir gormley|text:pa|2c73bebd-3d47-4fa4-97eb-d21a43057925` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Cahir Gormley [C, 78; 1 bouts; aliases: Cahir Gormley (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Cahir Gormley (`2c73bebd-3d47-4fa4-97eb-d21a43057925`, resolver tier C) |
| Normalized name | cahir gormley ~ cahir gormley (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 159 lb / -; candidate weights: 153.8 (2026-05-29) |
| Commission / venue | pa-state-athletic-commission / Sixth Man Center, Philadelphia |
| Opponent | Elias Ajuwa (unresolved: the bout needs both corners) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-03-07|philadelphia|sixth-man-center|gormley-cahir|ajuwa-elias`, repeat index 1, sheet order 4 |
| Candidate record | 2026-05-29 vs Jamar Leach, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-03-07|philadelphia|sixth-man-center|gormley-cahir|ajuwa-elias|b

| | |
|---|---|
| Source appearance | "AJUWA, ELIAS" (PA), corner b, 2026-03-07, Dominique Walton at Sixth Man Center; document `pa-results:2026:03-07-26 box walton - sixth man arena - phila., pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20walton%20-%20sixth%20man%20arena%20-%20phila.%2C%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Elias Ajuwa [C, 78; 1 bouts; aliases: Elias Ajuwa (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Elias Ajuwa (`4cb45149-32ec-47fb-84a1-315ffb639d3e`, resolver tier C) |
| Normalized name | elias ajuwa ~ elias ajuwa (exact) |
| City-level hometown | observed: DE (not city-level); candidate: DE |
| Official / contracted weight | 160.4 lb / -; candidate weights: 163.4 (2026-07-11) |
| Commission / venue | pa-state-athletic-commission / Sixth Man Center, Philadelphia |
| Opponent | Cahir Gormley (unresolved: the bout needs both corners) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-03-07|philadelphia|sixth-man-center|gormley-cahir|ajuwa-elias`, repeat index 1, sheet order 4 |
| Candidate record | 2026-07-11 vs Stephen McCabe, order 4; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-04-03|allentown|the-archer|mctamney-jaclyne|michaels-lauren|a

| | |
|---|---|
| Source appearance | "MCTAMNEY, JACLYNE" (PA), corner a, 2026-04-03, James Bartley at The Archer; document `pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Jaclyne McTamney [C, 78; 1 bouts; aliases: Jaclyne McTamney (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jaclyne McTamney (`988d0ade-1b1d-4bbf-a220-76edecd90dbd`, resolver tier C) |
| Normalized name | jaclyne mctamney ~ jaclyne mctamney (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 127.8 lb / -; candidate weights: 127.4 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / The Archer, Allentown |
| Opponent | Lauren Michaels (unresolved: the bout needs both corners) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-04-03|allentown|the-archer|mctamney-jaclyne|michaels-lauren`, repeat index 1, sheet order 9 |
| Candidate record | 2026-07-25 vs Colleen Davis, order 8; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-08-07|philadelphia|2300-arena|hollie-rasuiod|marrero-alexander|a

| | |
|---|---|
| Source appearance | "HOLLIE, RASUIOD" (PA), corner a, 2026-08-07, Alexis Barbosa at 2300 Arena; document `pa-results:2026:08-07-26 box barbosa - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-07-26%20box%20barbosa%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Rasuiod Hollie [C, 78; 1 bouts; aliases: Rasuiod Hollie (name, verified)]<br>Roger Hilley [-, -; 2 bouts; aliases: Roger Hilley (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Rasuiod Hollie (`65f1611e-6839-4241-8a57-2f8aea87ba8f`, resolver tier C) |
| Normalized name | rasuiod hollie ~ rasuiod hollie (exact) |
| City-level hometown | observed: TX (not city-level); candidate: TX |
| Official / contracted weight | 120.4 lb / -; candidate weights: 120 (2026-08-28) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Alexander Marrero (unresolved: the bout needs both corners) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-08-07|philadelphia|2300-arena|hollie-rasuiod|marrero-alexander`, repeat index 1, sheet order 2 |
| Candidate record | 2026-08-28 vs Deykel Valdez, order 2; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **match**: exact-form name, compatible official weight and commission/venue continuity; only a city-level hometown is missing on one side (no contradiction) |

## 003:pa_state_athletic_commission:2026-02-07|pittsburgh|the-priority|bodish-danny|griffin-dominique|a

| | |
|---|---|
| Source appearance | "BODISH, DANNY" (PA), corner a, 2026-02-07, John Richardson at The Priority; document `pa-results:2026:02-07-26 box richardson - the priory - pittsburgh pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-07-26%20box%20richardson%20-%20the%20priory%20-%20pittsburgh%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Danny Bodish [C, 60; 0 bouts; aliases: Danny Bodish (name, verified)]<br>Danny Barlow [-, -; 2 bouts; aliases: Danny Barlow (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Danny Bodish (`21acd9c7-40d3-4884-bd0b-9e15aa80a53b`, resolver tier C) |
| Normalized name | danny bodish ~ danny bodish (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 124 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / The Priority, Pittsburgh |
| Opponent | Dominique Griffin (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-02-07|pittsburgh|the-priority|bodish-danny|griffin-dominique`, repeat index 1, sheet order 2 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-02-07|pittsburgh|the-priority|bodish-danny|griffin-dominique|b

| | |
|---|---|
| Source appearance | "GRIFFIN, DOMINIQUE" (PA), corner b, 2026-02-07, John Richardson at The Priority; document `pa-results:2026:02-07-26 box richardson - the priory - pittsburgh pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/02-07-26%20box%20richardson%20-%20the%20priory%20-%20pittsburgh%20pa%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|dominique griffin|text:tx|f70b1a10-2b2f-4e76-8308-6b5b64710b1a` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Dominique Valera [-, -; 1 bouts; aliases: Dominique Valera (name, verified)]<br>Avios Griffin [-, -; 1 bouts; aliases: Avios Griffin (name, verified)]<br>Dominique Griffin [C, 69; 1 bouts; aliases: Dominique Griffin (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dominique Griffin (`f70b1a10-2b2f-4e76-8308-6b5b64710b1a`, resolver tier C) |
| Normalized name | dominique griffin ~ dominique griffin (exact) |
| City-level hometown | observed: TX (not city-level); candidate: Irving, TX |
| Official / contracted weight | 123.9 lb / -; candidate weights: 120.8 (2026-05-16) |
| Commission / venue | pa-state-athletic-commission / The Priority, Pittsburgh |
| Opponent | Danny Bodish (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-02-07|pittsburgh|the-priority|bodish-danny|griffin-dominique`, repeat index 1, sheet order 2 |
| Candidate record | 2026-05-16 vs Kevin Soltero, order 3; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:mo_office_of_athletics:2026-02-28|st-joseph|event-26-133|dakoda-eighmy|jaylin-strong|a

| | |
|---|---|
| Source appearance | "Dakoda Eighmy" (MO), corner a, 2026-02-28, Carden Combat Sports Promotions at Good Time Events Center; document `mo-results:2026-02-28 BOXRES Carden Combat Sports St. Joseph` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-02-28%20BOXRES%20Carden%20Combat%20Sports%20St.%20Joseph.pdf)) |
| Why held | queue: insufficient_evidence; resolver: contradiction:hometown_different_city |
| All candidates | Dakoda Eighmy [C, 54; 1 bouts; aliases: Dakoda Eighmy (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dakoda Eighmy (`10b02522-4c30-401f-a43b-a00401be17f6`, resolver tier C) |
| Normalized name | dakoda eighmy ~ dakoda eighmy (exact) |
| City-level hometown | observed: St. Joseph, MO (st joseph, mo); candidate: Saint Joseph, MO |
| Official / contracted weight | 146.9 lb / -; candidate weights: 151 (2026-08-29) |
| Commission / venue | mo-office-of-athletics / Good Time Events Center, St. Joseph |
| Opponent | Jaylin Strong (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-02-28|st-joseph|event-26-133|dakoda-eighmy|jaylin-strong`, repeat index 1, sheet order 6 |
| Candidate record | 2026-08-29 vs David Fecteau, order 5; current: no_contest (rev1) |
| Contradictions | hometown_different_city:st joseph, mo vs saint joseph, mo |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 54 |
| Why the resolver stopped | contradiction:hometown_different_city |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: contradiction: hometown_different_city:st joseph, mo vs saint joseph, mo |

## 003:mo_office_of_athletics:2026-02-28|st-joseph|event-26-133|dakoda-eighmy|jaylin-strong|b

| | |
|---|---|
| Source appearance | "Jaylin Strong" (MO), corner b, 2026-02-28, Carden Combat Sports Promotions at Good Time Events Center; document `mo-results:2026-02-28 BOXRES Carden Combat Sports St. Joseph` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-02-28%20BOXRES%20Carden%20Combat%20Sports%20St.%20Joseph.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:hometown+weight |
| All candidates | Jaylin Strong [C, 78; 1 bouts; aliases: Jaylin Strong (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jaylin Strong (`83bff2f1-e745-488d-8e72-8b160106dc7c`, resolver tier C) |
| Normalized name | jaylin strong ~ jaylin strong (exact) |
| City-level hometown | observed: Decatur, AL (decatur, al); candidate: Decatur, AL |
| Official / contracted weight | 146.9 lb / -; candidate weights: 146.6 (2026-01-24) |
| Commission / venue | mo-office-of-athletics / Good Time Events Center, St. Joseph |
| Opponent | Dakoda Eighmy (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-02-28|st-joseph|event-26-133|dakoda-eighmy|jaylin-strong`, repeat index 1, sheet order 6 |
| Candidate record | 2026-01-24 vs Jorge Carlos, order 4; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:hometown+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-03-07|pa|mohegan-sun-wilkes-barre|williams-shakeem|dalton-vladimir|b

| | |
|---|---|
| Source appearance | "DALTON, VLADIMIR" (PA), corner b, 2026-03-07, Chris Coyne at MOHEGAN SUN - Wilkes Barre; document `pa-results:2026:03-07-26 box coyne - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20coyne%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Vladimir Dalton [C, 69; 1 bouts; aliases: Vladimir Dalton (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Vladimir Dalton (`01bb8b2e-e212-4e9b-87bc-bb40b7bbf29f`, resolver tier C) |
| Normalized name | vladimir dalton ~ vladimir dalton (exact) |
| City-level hometown | observed: NJ (not city-level); candidate: Linden, NJ |
| Official / contracted weight | 197.6 lb / -; candidate weights: 197.3 (2026-06-06) |
| Commission / venue | pa-state-athletic-commission / MOHEGAN SUN - Wilkes Barre |
| Opponent | Shakeem Williams (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-07|pa|mohegan-sun-wilkes-barre|williams-shakeem|dalton-vladimir`, repeat index 1, sheet order 4 |
| Candidate record | 2026-06-06 vs Ibrahima Fofana, order 2; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:mo_office_of_athletics:2026-03-20|independence|event-26-160|marco-romero|william-langston|a

| | |
|---|---|
| Source appearance | "Marco Romero" (MO), corner a, 2026-03-20, KC Boxing Promotions at Truman Memorial Building; document `mo-results:2026-03-20 BOXRES Independence KC Boxing Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-20%20BOXRES%20Independence%20KC%20Boxing%20Promo.pdf)) |
| Group | `G:mo_office_of_athletics|marco romero|olathe, ks|16c4e627-3434-4615-85dd-2e2c57b00a53` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:hometown+weight |
| All candidates | Marco Romero [C, 78; 1 bouts; aliases: Marco Romero (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Marco Romero (`16c4e627-3434-4615-85dd-2e2c57b00a53`, resolver tier C) |
| Normalized name | marco romero ~ marco romero (exact) |
| City-level hometown | observed: Olathe, KS (olathe, ks); candidate: Olathe, KS |
| Official / contracted weight | 167.5 lb / -; candidate weights: 164 (2026-08-22) |
| Commission / venue | mo-office-of-athletics / Truman Memorial Building, Independence |
| Opponent | William Langston (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-20|independence|event-26-160|marco-romero|william-langston`, repeat index 1, sheet order 5 |
| Candidate record | 2026-08-22 vs Kahlil Mitchell, order 5; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:hometown+weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:mo_office_of_athletics:2026-03-20|independence|event-26-160|marco-romero|william-langston|b

| | |
|---|---|
| Source appearance | "William Langston" (MO), corner b, 2026-03-20, KC Boxing Promotions at Truman Memorial Building; document `mo-results:2026-03-20 BOXRES Independence KC Boxing Promo` ([official document](https://pr.mo.gov/boards/athletics/boxingresults/2026-03-20%20BOXRES%20Independence%20KC%20Boxing%20Promo.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | William Holcomb [-, -; 0 bouts; aliases: William Holcomb (name, verified)]<br>Johnnie Langston [-, -; 1 bouts; aliases: Johnnie Langston (name, verified)]<br>William Bates [-, -; 1 bouts; aliases: William Bates (name, verified)]<br>William Briscoe [-, -; 1 bouts; aliases: William Briscoe (name, verified)]<br>William Foster [-, -; 1 bouts; aliases: William Foster (name, verified)]<br>De Von Williams [-, -; 2 bouts; aliases: De Von Williams (name, verified), DeVon Williams (name, review)]<br>Larry Williams [-, -; 1 bouts; aliases: Larry Williams (name, verified)]<br>William Langston [C, 60; 1 bouts; aliases: William Langston (name, verified)]<br>Antonio Ladale Williams Jr. [-, -; 1 bouts; aliases: Antonio Ladale Williams Jr. (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | William Langston (`f80bf04d-a156-4f0a-bf16-279d6779e72a`, resolver tier C) |
| Normalized name | william langston ~ william langston (exact) |
| City-level hometown | observed: Kenosha, WI (kenosha, wi); candidate: Wisconsin |
| Official / contracted weight | 167.2 lb / -; candidate weights: 178 (2026-06-26) |
| Commission / venue | mo-office-of-athletics / Truman Memorial Building, Independence |
| Opponent | Marco Romero (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-03-20|independence|event-26-160|marco-romero|william-langston`, repeat index 1, sheet order 5 |
| Candidate record | 2026-06-26 vs Isaac Carbonell, order 14; current: win (rev1) |
| Contradictions | weight_gap_10.8lb(neutral) |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-04-03|allentown|the-archer|mctamney-jaclyne|michaels-lauren|b

| | |
|---|---|
| Source appearance | "MICHAELS, LAUREN" (PA), corner b, 2026-04-03, James Bartley at The Archer; document `pa-results:2026:04-03-26 box bartley - the archer - allentown pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-03-26%20box%20bartley%20-%20the%20archer%20-%20allentown%20pa%20%20-%20%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Michael Cserenyi [-, -; 1 bouts; aliases: Michael Cserenyi (name, verified)]<br>Michael Lemelle [-, -; 1 bouts; aliases: Michael Lemelle (name, verified)]<br>Michael Ruiz [-, -; 0 bouts; aliases: Michael Ruiz (name, verified)]<br>Lauren Michaels [C, 60; 0 bouts; aliases: Lauren Michaels (name, verified)]<br>Michael Lee [-, -; 1 bouts; aliases: Michael Lee (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Lauren Michaels (`3ecf5e09-56d8-47ce-a3c6-2542d999d646`, resolver tier C) |
| Normalized name | lauren michaels ~ lauren michaels (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 126.6 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / The Archer, Allentown |
| Opponent | Jaclyne McTamney (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-03|allentown|the-archer|mctamney-jaclyne|michaels-lauren`, repeat index 1, sheet order 9 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-04-11|coraopolis|montour-sports-complex|baxter-jerome|johns-dashaun|b

| | |
|---|---|
| Source appearance | "JOHNS, DASHAUN" (PA), corner b, 2026-04-11, William Hutchinson at Montour Sports Complex; document `pa-results:2026:04-11-26 box hutchinson - montour sportsplex - coraopolis pa` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20hutchinson%20-%20montour%20sportsplex%20-%20coraopolis%20pa.pdf)) |
| Group | `G:pa_state_athletic_commission|dashaun johns|text:ny|52c43320-6870-4d0a-aeb9-9922636d13d2` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Dashaun Johns [C, 69; 1 bouts; aliases: Dashaun Johns (name, verified)]<br>Amari Dashaun Walter Jones [-, -; 1 bouts; aliases: Amari Dashaun Walter Jones (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Dashaun Johns (`52c43320-6870-4d0a-aeb9-9922636d13d2`, resolver tier C) |
| Normalized name | dashaun johns ~ dashaun johns (exact) |
| City-level hometown | observed: NY (not city-level); candidate: Brooklyn, NY |
| Official / contracted weight | 142.6 lb / -; candidate weights: 141 (2026-07-25) |
| Commission / venue | pa-state-athletic-commission / Montour Sports Complex, Coraopolis |
| Opponent | Jerome Baxter (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-11|coraopolis|montour-sports-complex|baxter-jerome|johns-dashaun`, repeat index 1, sheet order 3 |
| Candidate record | 2026-07-25 vs Ezequiel Martinez, order 4; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-05-09|washington|meadows-casino|mowry-brian|webster-vercell|a

| | |
|---|---|
| Source appearance | "MOWRY, BRIAN" (PA), corner a, 2026-05-09, John Richardson at Meadows Casino; document `pa-results:2026:05-09-26 box richardson - meadows casino - washington pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-09-26%20box%20richardson%20-%20meadows%20casino%20-%20washington%20pa%20%20-%20results.pdf)) |
| Group | `G:pa_state_athletic_commission|brian mowry|text:pa|b16dee58-a855-49c9-8870-d247b4fbe8b4` (decided once for all members) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Brian Mowry [C, 60; 0 bouts; aliases: Brian Mowry (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Brian Mowry (`b16dee58-a855-49c9-8870-d247b4fbe8b4`, resolver tier C) |
| Normalized name | brian mowry ~ brian mowry (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 267.2 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Meadows Casino, Washington |
| Opponent | Vercell Webster (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-09|washington|meadows-casino|mowry-brian|webster-vercell`, repeat index 1, sheet order 5 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-05-09|washington|meadows-casino|mowry-brian|webster-vercell|b

| | |
|---|---|
| Source appearance | "WEBSTER, VERCELL" (PA), corner b, 2026-05-09, John Richardson at Meadows Casino; document `pa-results:2026:05-09-26 box richardson - meadows casino - washington pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/05-09-26%20box%20richardson%20-%20meadows%20casino%20-%20washington%20pa%20%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Vercell Webster [C, 60; 0 bouts; aliases: Vercell Webster (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Vercell Webster (`428e2d73-8f08-4769-a134-0f12464b7bcf`, resolver tier C) |
| Normalized name | vercell webster ~ vercell webster (exact) |
| City-level hometown | observed: TX (not city-level); candidate: TX |
| Official / contracted weight | 229 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Meadows Casino, Washington |
| Opponent | Brian Mowry (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-05-09|washington|meadows-casino|mowry-brian|webster-vercell`, repeat index 1, sheet order 5 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 60 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-08-22|philadelphia|first-district-plaza|cangelosi-cristian|corral-saul|a

| | |
|---|---|
| Source appearance | "CANGELOSI, CRISTIAN" (PA), corner a, 2026-08-22, Dominique Walton at First District Plaza; document `pa-results:2026:08-22-26 box - first district plaza - 3801 market street - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-22-26%20box%20-%20first%20district%20plaza%20-%203801%20market%20street%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Cristian Cangelosi [C, 69; 1 bouts; aliases: Cristian Cangelosi (name, verified)]<br>Cristian Hernandez [-, -; 1 bouts; aliases: Cristian Hernandez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Cristian Cangelosi (`3fc03d1f-1b98-46d4-b7d8-a35f6107ad60`, resolver tier C) |
| Normalized name | cristian cangelosi ~ cristian cangelosi (exact) |
| City-level hometown | observed: NY (not city-level); candidate: Brooklyn, NY |
| Official / contracted weight | 155.2 lb / -; candidate weights: 154.8 (2026-03-28) |
| Commission / venue | pa-state-athletic-commission / First District Plaza, Philadelphia |
| Opponent | Saul Corral (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-22|philadelphia|first-district-plaza|cangelosi-cristian|corral-saul`, repeat index 1, sheet order 1 |
| Candidate record | 2026-03-28 vs Miguel Angel Hernandez, order 10; current: draw (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | none |
| **Workbench recommendation (advice only)** | **hold**: not enough independent evidence |

## 003:pa_state_athletic_commission:2026-03-07|pa|mohegan-sun-wilkes-barre|williams-shakeem|dalton-vladimir|a

| | |
|---|---|
| Source appearance | "WILLIAMS, SHAKEEM" (PA), corner a, 2026-03-07, Chris Coyne at MOHEGAN SUN - Wilkes Barre; document `pa-results:2026:03-07-26 box coyne - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/03-07-26%20box%20coyne%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Tyhler Williams [-, -; 1 bouts; aliases: Tyhler Williams (name, verified)]<br>Osiris Williams [-, -; 2 bouts; aliases: Osiris Williams (name, verified)]<br>Sirarminius Williams [-, -; 1 bouts; aliases: Sirarminius Williams (name, verified)]<br>Caleb Williams [-, -; 1 bouts; aliases: Caleb Williams (name, verified)]<br>Craig Williams [-, -; 1 bouts; aliases: Craig Williams (name, verified)]<br>Steven Williams [-, -; 1 bouts; aliases: Steven Williams (name, verified)]<br>Shakeem Williams [C, 78; 1 bouts; aliases: Shakeem Williams (name, verified)]<br>De Von Williams [-, -; 2 bouts; aliases: De Von Williams (name, verified), DeVon Williams (name, review)]<br>Larry Williams [-, -; 1 bouts; aliases: Larry Williams (name, verified)]<br>Austin Williams [-, -; 1 bouts; aliases: Austin Williams (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Shakeem Williams (`b4282699-9d2f-4670-8dd9-76cd44369362`, resolver tier C) |
| Normalized name | shakeem williams ~ shakeem williams (exact) |
| City-level hometown | observed: PA (not city-level); candidate: PA |
| Official / contracted weight | 195.6 lb / -; candidate weights: 194.2 (2026-06-13) |
| Commission / venue | pa-state-athletic-commission / MOHEGAN SUN - Wilkes Barre |
| Opponent | Vladimir Dalton (unresolved: the bout needs both corners) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-03-07|pa|mohegan-sun-wilkes-barre|williams-shakeem|dalton-vladimir`, repeat index 1, sheet order 4 |
| Candidate record | 2026-06-13 vs Angel Vazquez, order 4; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | same_surname_same_region_different_given_name, common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: same_surname_same_region_different_given_name, common_surname |

## 003:pa_state_athletic_commission:2026-04-11|coraopolis|montour-sports-complex|baxter-jerome|johns-dashaun|a

| | |
|---|---|
| Source appearance | "BAXTER, JEROME" (PA), corner a, 2026-04-11, William Hutchinson at Montour Sports Complex; document `pa-results:2026:04-11-26 box hutchinson - montour sportsplex - coraopolis pa` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20hutchinson%20-%20montour%20sportsplex%20-%20coraopolis%20pa.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Jerome Kenneth Baxter [C, 50; 1 bouts; aliases: Jerome Kenneth Baxter (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Jerome Kenneth Baxter (`894404b0-3554-4230-ad1a-bf23127cb2c5`, resolver tier C) |
| Normalized name | jerome baxter ~ jerome kenneth baxter (containment) |
| City-level hometown | observed: PA (not city-level); candidate: Pittsburgh, PA |
| Official / contracted weight | 145.9 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / Montour Sports Complex, Coraopolis |
| Opponent | Dashaun Johns (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-11|coraopolis|montour-sports-complex|baxter-jerome|johns-dashaun`, repeat index 1, sheet order 3 |
| Candidate record | 2026-01-24 vs Omari Lamon Jones, order 4; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 50 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | name_not_exact_form |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form |

## 003:pa_state_athletic_commission:2026-04-11|philadelphia|2300-arena|martin-alex|rivera-juan|a

| | |
|---|---|
| Source appearance | "MARTIN, ALEX" (PA), corner a, 2026-04-11, Brian Costello at 2300 Arena; document `pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:jurisdiction+weight |
| All candidates | Eric Martinez [-, -; 1 bouts; aliases: Eric Martinez (name, verified)]<br>Alex Martin [C, 78; 1 bouts; aliases: Alex Martin (name, verified)]<br>Alexander Martin [-, -; 1 bouts; aliases: Alexander Martin (name, verified)]<br>Martin Diaz [-, -; 0 bouts; aliases: Martin Diaz (name, verified)]<br>Frank Lamar Martin [-, -; 1 bouts; aliases: Frank Lamar Martin (name, verified)]<br>Tray Martin [-, -; 1 bouts; aliases: Tray Martin (name, verified)]<br>Josh Martin [-, -; 0 bouts; aliases: Josh Martin (name, verified)]<br>James Martin [-, -; 0 bouts; aliases: James Martin (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Alex Martin (`30fa501f-6fbb-4bf2-8ad6-7287eb79f21d`, resolver tier C) |
| Normalized name | alex martin ~ alex martin (exact) |
| City-level hometown | observed: IN (not city-level); candidate: IN |
| Official / contracted weight | 140 lb / -; candidate weights: 146.8 (2026-07-11) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Juan Rivera (unresolved: the bout needs both corners) |
| Relationship evidence | same_commission:pa-state-athletic-commission |
| This appearance | source bout `2026-04-11|philadelphia|2300-arena|martin-alex|rivera-juan`, repeat index 1, sheet order 6 |
| Candidate record | 2026-07-11 vs Rasheed Johnson, order 5; current: loss (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 78 |
| Why the resolver stopped | insufficient_graph_evidence:jurisdiction+weight |
| Danger flags | common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: common_surname |

## 003:pa_state_athletic_commission:2026-04-11|philadelphia|2300-arena|martin-alex|rivera-juan|b

| | |
|---|---|
| Source appearance | "RIVERA, JUAN" (PA), corner b, 2026-04-11, Brian Costello at 2300 Arena; document `pa-results:2026:04-11-26 box costello - 2300 arena - phila pa results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/04-11-26%20box%20costello%20-%202300%20arena%20-%20phila%20pa%20results.pdf)) |
| Why held | queue: ambiguous; resolver: more_than_one_plausible_candidate |
| All candidates | Jan Paul Rivera-Pizarro [C, 50; 1 bouts; aliases: Jan Paul Rivera-Pizarro (name, verified)]<br>Juan Rivera V [C, 59; 1 bouts; aliases: Juan Rivera V (name, verified)]<br>Rivera Delgado, [-, -; 0 bouts; aliases: Rivera Delgado, (name, verified)]<br>Rigoberto Rivera [-, -; 1 bouts; aliases: Rigoberto Rivera (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Juan Rivera V (`2ce5305b-a407-44fe-9fd7-7176d6bc8ff3`, resolver tier C) |
| Normalized name | juan rivera ~ juan rivera v (containment) |
| City-level hometown | observed: PA (not city-level); candidate: Philadelphia, PA |
| Official / contracted weight | 140.8 lb / -; candidate weights: 141.7 (2026-06-06) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Alex Martin (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-04-11|philadelphia|2300-arena|martin-alex|rivera-juan`, repeat index 1, sheet order 6 |
| Candidate record | 2026-06-06 vs Chuckie Driver (a/k/a Demarius Driver), order 8; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | Jan Paul Rivera-Pizarro [C, 50] |
| Confidence | 59 |
| Why the resolver stopped | more_than_one_plausible_candidate |
| Danger flags | name_not_exact_form |
| **Workbench recommendation (advice only)** | **hold**: 2 plausible candidates: needs independent evidence |

## 003:pa_state_athletic_commission:2026-07-24|philadelphia|2300-arena|gonzalez-elijah|perez-german|a

| | |
|---|---|
| Source appearance | "GONZALEZ, ELIJAH" (PA), corner a, 2026-07-24, Robert Farrell at 2300 Arena; document `pa-results:2026:07-24-26 box farrell - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-24-26%20box%20farrell%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Johan Gonzalez [-, -; 1 bouts; aliases: Johan Gonzalez (name, verified)]<br>Jorge Gonzalez [-, -; 1 bouts; aliases: Jorge Gonzalez (name, verified)]<br>Elijah Grant [-, -; 1 bouts; aliases: Elijah Grant (name, verified)]<br>Peter Gonzalez [-, -; 1 bouts; aliases: Peter Gonzalez (name, verified)]<br>Andy Gonzalez [-, -; 1 bouts; aliases: Andy Gonzalez (name, verified)]<br>Daniel Gonzalez [-, -; 0 bouts; aliases: Daniel Gonzalez (name, verified)]<br>Carlos Gonzalez [-, -; 1 bouts; aliases: Carlos Gonzalez (name, verified)]<br>Frank Gonzalez [-, -; 0 bouts; aliases: Frank Gonzalez (name, verified)]<br>Elijah Gonzalez [C, 69; 1 bouts; aliases: Elijah Gonzalez (name, verified)]<br>Ethan Gonzalez [-, -; 0 bouts; aliases: Ethan Gonzalez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Elijah Gonzalez (`d9568912-f49f-4097-a0c8-b6d72f3f2784`, resolver tier C) |
| Normalized name | elijah gonzalez ~ elijah gonzalez (exact) |
| City-level hometown | observed: NY (not city-level); candidate: Brooklyn, NY |
| Official / contracted weight | 143.8 lb / -; candidate weights: 145.5 (2026-04-10) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | German Perez (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-24|philadelphia|2300-arena|gonzalez-elijah|perez-german`, repeat index 1, sheet order 1 |
| Candidate record | 2026-04-10 vs Daniel Murray, order 3; current: win (rev1) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: common_surname |

## 003:pa_state_athletic_commission:2026-07-24|philadelphia|2300-arena|gonzalez-elijah|perez-german|b

| | |
|---|---|
| Source appearance | "PEREZ, GERMAN" (PA), corner b, 2026-07-24, Robert Farrell at 2300 Arena; document `pa-results:2026:07-24-26 box farrell - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/07-24-26%20box%20farrell%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | German Perez [C, 69; 1 bouts; aliases: German Perez (name, verified)]<br>Angel Perez [-, -; 0 bouts; aliases: Angel Perez (name, verified)]<br>Ariel Perez [-, -; 1 bouts; aliases: Ariel Perez (name, verified)]<br>Jose German Perez Cordero [-, -; 1 bouts; aliases: Jose German Perez Cordero (name, verified)]<br>Gabriel Garcia Perez [-, -; 1 bouts; aliases: Gabriel Garcia Perez (name, verified)]<br>German Ramos [-, -; 1 bouts; aliases: German Ramos (name, verified)]<br>Ethan Perez [-, -; 0 bouts; aliases: Ethan Perez (name, verified)]<br>Hector Perez [-, -; 1 bouts; aliases: Hector Perez (name, verified)]<br>Oscar Alan Perez [-, -; 1 bouts; aliases: Oscar Alan Perez (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | German Perez (`4a1e7a31-8df7-42bd-b9b3-d7e6b94e28cb`, resolver tier C) |
| Normalized name | german perez ~ german perez (exact) |
| City-level hometown | observed: MEXICO (not city-level); candidate: Mexico |
| Official / contracted weight | 140 lb / -; candidate weights: 140.8 (2026-02-21) |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Elijah Gonzalez (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-07-24|philadelphia|2300-arena|gonzalez-elijah|perez-german`, repeat index 1, sheet order 1 |
| Candidate record | 2026-02-21 vs Joshua Amill, order 8; current: loss (rev1, identity_graph_reapply) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 69 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | common_surname |
| **Workbench recommendation (advice only)** | **hold**: danger case: common_surname |

## 003:pa_state_athletic_commission:2026-08-07|philadelphia|2300-arena|hollie-rasuiod|marrero-alexander|b

| | |
|---|---|
| Source appearance | "MARRERO, ALEXANDER" (PA), corner b, 2026-08-07, Alexis Barbosa at 2300 Arena; document `pa-results:2026:08-07-26 box barbosa - 2300 arena - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-07-26%20box%20barbosa%20-%202300%20arena%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:none |
| All candidates | Vaughn Alexander [-, -; 0 bouts; aliases: Vaughn Alexander (name, verified)]<br>Alexander Martin [-, -; 1 bouts; aliases: Alexander Martin (name, verified)]<br>Juan Marrero [-, -; 1 bouts; aliases: Juan Marrero (name, verified)]<br>Alexander Collado [-, -; 1 bouts; aliases: Alexander Collado (name, verified)]<br>Alexander Schenk [-, -; 1 bouts; aliases: Alexander Schenk (name, verified)]<br>Andre Moore [-, -; 2 bouts; aliases: Andre Moore (name, verified)]<br>Alexander Rios Vega [-, -; 0 bouts; aliases: Alexander Rios Vega (name, verified)]<br>Alexandre Lima Moura [C, 50; 0 bouts; aliases: Alexandre Lima Moura (name, verified)]<br>Alvin Alexander Varmall Jr. [-, -; 1 bouts; aliases: Alvin Alexander Varmall Jr. (name, verified)]<br>Alexander Castellano [-, -; 0 bouts; aliases: Alexander Castellano (name, verified)]<br>Alexander Espinoza [-, -; 1 bouts; aliases: Alexander Espinoza (name, verified)]<br>Alexander Cruz Torres [-, -; 1 bouts; aliases: Alexander Cruz Torres (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Alexandre Lima Moura (`78180c67-4b97-4ab8-892f-2dc2f0c897ed`, resolver tier C) |
| Normalized name | alexander marrero ~ alexandre lima moura (containment) |
| City-level hometown | observed: PA (not city-level); candidate: Orlando, FL. |
| Official / contracted weight | 121.2 lb / -; candidate weights: - |
| Commission / venue | pa-state-athletic-commission / 2300 Arena, Philadelphia |
| Opponent | Rasuiod Hollie (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-07|philadelphia|2300-arena|hollie-rasuiod|marrero-alexander`, repeat index 1, sheet order 2 |
| Candidate record | - |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 50 |
| Why the resolver stopped | insufficient_graph_evidence:none |
| Danger flags | same_surname_same_region_different_given_name, name_not_exact_form, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: same_surname_same_region_different_given_name, name_not_exact_form, stated_place_mismatch |

## 003:pa_state_athletic_commission:2026-08-22|philadelphia|first-district-plaza|cangelosi-cristian|corral-saul|b

| | |
|---|---|
| Source appearance | "CORRAL, SAUL" (PA), corner b, 2026-08-22, Dominique Walton at First District Plaza; document `pa-results:2026:08-22-26 box - first district plaza - 3801 market street - phila. pa - results` ([official document](https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/08-22-26%20box%20-%20first%20district%20plaza%20-%203801%20market%20street%20-%20phila.%20pa%20-%20results.pdf)) |
| Why held | queue: insufficient_evidence; resolver: insufficient_graph_evidence:weight |
| All candidates | Saul Guadalupe Corral Escalante [C, 59; 1 bouts; aliases: Saul Guadalupe Corral Escalante (name, verified)] |
| Weight class / DOB | not derivable from the sheet / not collected: dates of birth are never stored (data minimization policy) |
| Proposed canonical boxer | Saul Guadalupe Corral Escalante (`212ff1ee-f7e4-4b98-8bc5-00e3d68cab12`, resolver tier C) |
| Normalized name | saul corral ~ saul guadalupe corral escalante (containment) |
| City-level hometown | observed: MX (not city-level); candidate: Douglas, AZ |
| Official / contracted weight | 155 lb / -; candidate weights: 152.8 (2026-06-13) |
| Commission / venue | pa-state-athletic-commission / First District Plaza, Philadelphia |
| Opponent | Cristian Cangelosi (unresolved: the bout needs both corners) |
| Relationship evidence | - |
| This appearance | source bout `2026-08-22|philadelphia|first-district-plaza|cangelosi-cristian|corral-saul`, repeat index 1, sheet order 1 |
| Candidate record | 2026-06-13 vs Geise Reyes Del Verso, order 8; current: loss (rev1, identity_graph_reapply) |
| Contradictions | none |
| Similar-named other boxers | none |
| Competing candidates | none |
| Confidence | 59 |
| Why the resolver stopped | insufficient_graph_evidence:weight |
| Danger flags | name_not_exact_form, stated_place_mismatch |
| **Workbench recommendation (advice only)** | **hold**: danger case: name_not_exact_form, stated_place_mismatch |
