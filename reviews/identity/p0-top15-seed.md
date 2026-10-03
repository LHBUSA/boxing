# P0 top-15 identity seed (rule p0-identity-seed@1.2.1)

Wikidata establishes a person only. AUTO_SEEDED fighters were created; every other class created nothing and waits for a human.
Body links for the new fighters are PREPARED in `p0-top15-batch-03-prepared.sql`, not applied.

Subjects 621 (622 quoted earlier; the subject query now drops vacant/blank slots). As recorded: AUTO_SEEDED 138, EXISTING_LINK 1, POSSIBLE_EXISTING_FIGHTER 139, REVIEW_REQUIRED 131, NO_CANDIDATE 212.

Notes:
- Two QIDs were printed under two spellings each (Fernando Daniel Martinez / Fernando Martinez Q26267550; Vic / Victorio Saludar Q55584727): the first created the fighter, the database guard sent the second to REVIEW (qid_already_mapped_to_a_fighter). Link the second spelling to the same fighter after review.
- Zhanibek Alimkhanuly: REVIEW as WBO champion (no country printed), AUTO_SEEDED here from the ranking entries that print KAZ. His WBO champion entry stays unlinked for a human.
- Gary Allen Russell Jr / Gary Russell / Gary Antonio Russell vs Gary Antuanne Russell are flagged POSSIBLE_EXISTING_FIGHTER by first+last: brothers; likely DISTINCT.
- Rule 1.2.1 added containment (double Spanish surnames / extra given names): Rolando Romero, Gilberto Ramirez and 21 others went to POSSIBLE_EXISTING_FIGHTER instead of being seeded.

## Slice 01

Rule `p0-identity-seed@1.2.1`. Wikidata establishes a person only, never a record, title, ranking or bout.

EXISTING_LINK 0 | AUTO_SEEDED 13 | POSSIBLE_EXISTING_FIGHTER 30 | REVIEW_REQUIRED 17 | NO_CANDIDATE 40 | Wikidata requests 0

### EXISTING_LINK (0)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|

### AUTO_SEEDED (13)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Adam Azim | WBC super_lightweight, IBF super_lightweight | [Q115037372](https://www.wikidata.org/wiki/Q115037372) Adam Azim | -; POSSIBLY SAME PERSON AS adamazin (REVIEW_REQUIRED) | name exact ("Adam Azim" = "Adam Azim"); country agrees (GBR vs GBR); dob single 2002-01-01; era plausible (age 24); division not_on_wikidata; no_death_recorded |
| Adam Balski | WBC bridgerweight | [Q55220156](https://www.wikidata.org/wiki/Q55220156) Adam Balski | - | name exact ("Adam Balski" = "Adam Balski"); country agrees (POL vs POL); dob single 1990-11-03; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| ANDREW TABITI | WBA bridgerweight | [Q24258821](https://www.wikidata.org/wiki/Q24258821) Andrew Tabiti | - | name exact ("ANDREW TABITI" = "Andrew Tabiti"); country agrees (USA vs USA/USA); dob single 1989-09-20; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Angel Ayala | IBF super_flyweight | [Q113867935](https://www.wikidata.org/wiki/Q113867935) Angel Ayala | -; POSSIBLY SAME PERSON AS angelayalalardizabal (NO_CANDIDATE) | name exact ("Angel Ayala" = "Angel Ayala"); country agrees (MEX vs MEX); dob single 2000-05-11; era plausible (age 26); division not_on_wikidata; no_death_recorded |
| Anthony Yarde | WBC light_heavyweight | [Q29976926](https://www.wikidata.org/wiki/Q29976926) Anthony Yarde | - | name exact ("Anthony Yarde" = "Anthony Yarde"); country agrees (GBR vs GBR); dob single 1991-08-13; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Ardian Krasniqi | WBO light_heavyweight | [Q135409877](https://www.wikidata.org/wiki/Q135409877) Ardian Krasniqi | - | name exact ("Ardian Krasniqi" = "Ardian Krasniqi"); country agrees (DEU vs DEU); dob single 1996-09-22; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Arlen Lopez / ARLEN LOPEZ | WBC light_heavyweight, WBA light_heavyweight | [Q20804465](https://www.wikidata.org/wiki/Q20804465) Arlen López | - | name exact ("Arlen Lopez" = "Arlen López"); country agrees (CUB vs CUB/CUB); dob single 1993-02-21; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Arthur Biyarslanov | IBF super_lightweight, WBC super_lightweight, WBO super_lightweight | [Q20736429](https://www.wikidata.org/wiki/Q20736429) Arthur Biyarslanov | - | name exact ("Arthur Biyarslanov" = "Arthur Biyarslanov"); country agrees (CAN vs CAN/CAN); dob single 1995-04-22; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Artur Beterbiev | WBC light_heavyweight, WBO light_heavyweight | [Q388359](https://www.wikidata.org/wiki/Q388359) Artur Beterbiev | - | name exact ("Artur Beterbiev" = "Artur Beterbiev"); country agrees (CAN/RUS vs RUS/CAN/RUS/CAN); dob single 1985-01-21; era plausible (age 41); division not_on_wikidata; no_death_recorded |
| Artur Subkhankulov | IBF lightweight | [Q16702816](https://www.wikidata.org/wiki/Q16702816) Artur Subkhankulov | - | name exact ("Artur Subkhankulov" = "Artur Subkhankulov"); country agrees (RUS vs RUS); dob single 1992-01-01; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Bakhodir Jalolov | IBF heavyweight, WBC heavyweight, WBO heavyweight | [Q23060341](https://www.wikidata.org/wiki/Q23060341) Bakhodir Jalolov | - | name exact ("Bakhodir Jalolov" = "Bakhodir Jalolov"); country agrees (UZB vs UZB/UZB); dob single 1994-07-08; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Brad Pauls | WBO middleweight | [Q132178681](https://www.wikidata.org/wiki/Q132178681) Brad Pauls | - | name exact ("Brad Pauls" = "Brad Pauls"); country agrees (GBR vs GBR); dob single 1993-04-11; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Brandon Adams | IBF super_welterweight, WBC super_welterweight | [Q28674793](https://www.wikidata.org/wiki/Q28674793) Brandon Adams | - | name exact ("Brandon Adams" = "Brandon Adams"); country agrees (USA vs USA); dob single 1989-07-31; era plausible (age 37); division not_on_wikidata; no_death_recorded |

### POSSIBLE_EXISTING_FIGHTER (30)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Abass Baraou / ABASS BARAOU | WBC super_welterweight, WBO super_welterweight, WBA super_welterweight | - | existing_fighter_may_be_same_person |  |
| Alan Abel Chaves | WBO lightweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS alanabelchavez (POSSIBLE_EXISTING_FIGHTER) |  |
| Alan Abel Chavez | IBF lightweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS alanabelchaves (POSSIBLE_EXISTING_FIGHTER) |  |
| Alberto Puello | WBC super_lightweight | - | existing_fighter_may_be_same_person |  |
| Alex Bray / ALEX BRAY | WBO super_welterweight, WBA super_welterweight | - | existing_fighter_may_be_same_person |  |
| Alex Vallecillo / ALEX VALLECILLO | WBO super_bantamweight, WBA super_bantamweight | - | existing_fighter_may_be_same_person |  |
| Ali Ellis | WBC bridgerweight | - | existing_fighter_may_be_same_person |  |
| Amari Jones | IBF middleweight, WBC middleweight | - | existing_fighter_may_be_same_person |  |
| ANDREAS KATZOURAKIS | WBA middleweight | - | existing_fighter_may_be_same_person |  |
| Andres Cortes / ANDRES CORTES | WBO lightweight, WBC lightweight, WBA lightweight | - | existing_fighter_may_be_same_person |  |
| ANDRES TERAN | WBA bantamweight | - | existing_fighter_may_be_same_person |  |
| Andrey Bonilla / ANDREY BONILLA | WBC bantamweight, WBA bantamweight | - | existing_fighter_may_be_same_person |  |
| Andy Cruz | IBF lightweight, WBO lightweight, WBC lightweight | - | existing_fighter_may_be_same_person |  |
| Andy Dominguez | WBC flyweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS andydominguezvelasquez (NO_CANDIDATE) |  |
| Andy Hiraoka / ANDY HIRAOKA | IBF super_lightweight, WBA super_lightweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS andyhiroaka (NO_CANDIDATE) |  |
| Angel Barrientes / ANGEL BARRIENTES | WBO super_bantamweight, WBA super_bantamweight | - | existing_fighter_may_be_same_person |  |
| Angelino Cordova | WBC flyweight | - | existing_fighter_may_be_same_person |  |
| Anthony Johns | IBF flyweight, WBO flyweight | - | existing_fighter_may_be_same_person |  |
| Anthony Joshua / ANTHONY JOSHUA | IBF heavyweight, WBC heavyweight, WBO heavyweight, WBA heavyweight | - | existing_fighter_may_be_same_person |  |
| Antonio Vargas / ANTONIO VARGAS | WBC bantamweight, WBA bantamweight | - | existing_fighter_may_be_same_person |  |
| Ari Bonilla / ARI BONILLA | IBF super_flyweight, WBC super_flyweight, WBA super_flyweight | - | existing_fighter_may_be_same_person |  |
| ARMANDO MARTINEZ RABI | WBA lightweight | - | existing_fighter_may_be_same_person |  |
| ARTURO CARDENAS | WBA super_bantamweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS arturocardenaspopoca (POSSIBLE_EXISTING_FIGHTER) |  |
| Arturo Cardenas Popoca | WBC super_bantamweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS arturocardenas (POSSIBLE_EXISTING_FIGHTER) |  |
| Atif Oberlton / ATIF OBERLTON | WBC light_heavyweight, WBO light_heavyweight, IBF light_heavyweight, WBA light_heavyweight | - | existing_fighter_may_be_same_person |  |
| Bakhram Murtazaliev | WBO super_welterweight, IBF super_welterweight, WBC super_welterweight | - | existing_fighter_may_be_same_person |  |
| Bek Nurmaganbet | IBF super_middleweight, WBC super_middleweight | - | existing_fighter_may_be_same_person |  |
| Bektemir Melikuziev / BEKTEMIR MELIKUZIEV | IBF super_middleweight, WBO super_middleweight, WBC super_middleweight, WBA super_middleweight | - | existing_fighter_may_be_same_person |  |
| Ben Whittaker | WBC light_heavyweight, WBO light_heavyweight, IBF light_heavyweight | - | existing_fighter_may_be_same_person |  |
| Billal Fawaz | IBF super_welterweight | - | existing_fighter_may_be_same_person |  |

### REVIEW_REQUIRED (17)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Adam Azin | WBO super_lightweight | - | possible_source_spelling_of:adamazim; POSSIBLY SAME PERSON AS adamazim (AUTO_SEEDED Q115037372) |  |
| Albert Bell | WBO lightweight, WBC lightweight | [Q128033765](https://www.wikidata.org/wiki/Q128033765) Albert Bell | no_wikidata_country_to_corroborate | name exact ("Albert Bell" = "Albert Bell"); country wikidata_has_no_country (USA vs -); dob single 1993-01-21; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Alejandro Silva | WBC super_welterweight | [Q60581503](https://www.wikidata.org/wiki/Q60581503) Alejandro Silva | no_wikidata_country_to_corroborate, age_implausible_for_current_champion | name exact ("Alejandro Silva" = "Alejandro Silva"); country wikidata_has_no_country (ARG vs -); dob single 1957-11-07; era implausible (age 68); division not_on_wikidata; no_death_recorded |
| Alex Santisima Jr. | WBO super_bantamweight | - | possible_source_spelling_of:alexsantisma |  |
| Alex Santisma | WBC super_bantamweight | - | possible_source_spelling_of:alexsantisimajr |  |
| Ali Ismailov | IBF light_heavyweight | [Q4724897](https://www.wikidata.org/wiki/Q4724897) Ali Ismailov | country_mismatch_needs_more_evidence, age_implausible_for_current_champion | name exact ("Ali Ismailov" = "Ali Ismailov"); country disagrees (RUS vs AZE); dob single 1974-05-08; era implausible (age 52); division not_on_wikidata; no_death_recorded |
| Andrew Cain / ANDREW CAIN | IBF bantamweight, WBO bantamweight, WBC bantamweight, WBA bantamweight | [Q132981293](https://www.wikidata.org/wiki/Q132981293) Andrew Cain | no_wikidata_country_to_corroborate | name exact ("Andrew Cain" = "Andrew Cain"); country wikidata_has_no_country (GBR vs -); dob single 1996-08-03; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Angelo Pena | WBO super_featherweight | [Q119848016](https://www.wikidata.org/wiki/Q119848016) Angelo Peña | country_mismatch_needs_more_evidence | name exact ("Angelo Pena" = "Angelo Peña"); country disagrees (DOM vs CHE); dob single 1994-09-30; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Arnold Barboza Jr / ARNOLD BARBOZA JR / Arnold Barboza, Jr. | WBC welterweight, WBA welterweight, WBO welterweight | [Q99690778](https://www.wikidata.org/wiki/Q99690778) Arnold Barboza Jr. | no_wikidata_country_to_corroborate | name exact ("Arnold Barboza Jr" = "Arnold Barboza Jr."); country wikidata_has_no_country (USA vs -); dob single 1991-12-09; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| ARTEM SUSLENKOV | WBA heavyweight | [Q127384411](https://www.wikidata.org/wiki/Q127384411) Artem Suslenkov | no_wikidata_country_to_corroborate | name exact ("ARTEM SUSLENKOV" = "Artem Suslenkov"); country wikidata_has_no_country (RUS vs -); dob single 1995-01-01; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Arvin Jhon Paciones | WBO flyweight, IBF flyweight | - | possible_source_spelling_of:arvinpaciones |  |
| Arvin Paciones | WBC flyweight | - | possible_source_spelling_of:arvinjhonpaciones |  |
| Badou Jack | WBC cruiserweight | [Q367930](https://www.wikidata.org/wiki/Q367930) Badou Jack | no_printed_country_to_corroborate | name exact ("Badou Jack" = "Badou Jack"); country not_printed (Gambia/Sweden vs -); dob single 1983-10-31; era plausible (age 43); division not_on_wikidata; no_death_recorded |
| Bakary Samake | WBC super_welterweight | [Q132851115](https://www.wikidata.org/wiki/Q132851115) Bakary Samake | no_wikidata_country_to_corroborate | name exact ("Bakary Samake" = "Bakary Samake"); country wikidata_has_no_country (FRA vs -); dob single 2003-06-29; era plausible (age 23); division not_on_wikidata; no_death_recorded |
| Ben Crocker | WBO welterweight | [Q133830739](https://www.wikidata.org/wiki/Q133830739) Ben Crocker | no_wikidata_country_to_corroborate | name exact ("Ben Crocker" = "Ben Crocker"); country wikidata_has_no_country (GBR vs -); dob single 1994-10-16; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| BRADLEY REA | WBA light_heavyweight | [Q135112512](https://www.wikidata.org/wiki/Q135112512) Bradley Rea | no_wikidata_country_to_corroborate | name exact ("BRADLEY REA" = "Bradley Rea"); country wikidata_has_no_country (GBR vs -); dob single 1998-02-16; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Brandon Daord | WBO flyweight | [Q133042416](https://www.wikidata.org/wiki/Q133042416) Brandon Daord | no_wikidata_country_to_corroborate | name exact ("Brandon Daord" = "Brandon Daord"); country wikidata_has_no_country (GBR vs -); dob single 1997-04-21; era plausible (age 29); division not_on_wikidata; no_death_recorded |

### NO_CANDIDATE (40)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Aaron de la Cruz Escobedo / AARON DE LA CRUZ ESCOBEDO | WBC light_flyweight, IBF minimumweight, WBO light_flyweight, WBA light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Adam Deines | WBO light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ADRIAN MAXIMILIANO ROBLEDO | WBA featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ALAN GRAVES | WBA middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Alan Picasso | WBC featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS alanpicassoromero (NO_CANDIDATE) |  |
| ALAN PICASSO ROMERO | WBA featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS alanpicasso (NO_CANDIDATE) |  |
| Albert Gonzalez | WBO featherweight, IBF featherweight, WBC featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Alberto Mora Garcia | WBO super_featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Alejandro Jair Gonzalez | WBC bantamweight, WBO bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Alexander Nedbei | WBC bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Alexis Rocha / ALEXIS ROCHA | WBO welterweight, WBA welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ALOYS YOUMBI | WBA cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ANDRES GREGORIO | WBA super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Andrii Novitskyi | WBC heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Andy Dominguez Velasquez | WBO flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS andydominguez (POSSIBLE_EXISTING_FIGHTER) |  |
| Andy Hiroaka | WBC super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS andyhiraoka (POSSIBLE_EXISTING_FIGHTER) |  |
| ANGEL ALVARADO SOTO | WBA flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Angel Ayala Lardizabal | WBO flyweight, WBC super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS angelayala (AUTO_SEEDED Q113867935) |  |
| Angelo Morejon | WBC bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Angel Talavera Carillo | WBO featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Aoi Yokoyama | IBF bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Aram Faniian | WBO super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Arar Andales / ArAr Andales | IBF light_flyweight, WBC light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ARMAT ARMANULY | WBA middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Armend Xhoxhaj / ARMEND XHOXHAJ | WBO cruiserweight, WBA bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Artur Reis | WBO light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Arvin Magramo | WBO light_flyweight, WBC light_flyweight, IBF light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Atsuki Sano | WBO flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ayrton Osmar Gimenez | WBO super_featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ayumu Sano | IBF super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Azael Villar / AZAEL VILLAR | WBO light_flyweight, WBA light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Balihenbiake Balihenbieke | WBO super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Beaven Sibanda / BEAVEN SIBANDA | WBC minimumweight, WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Benjamin Mendes | WBO light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS benjaminmendestani (NO_CANDIDATE) |  |
| Benjamin Mendes Tani / BENJAMIN MENDES TANI | IBF light_heavyweight, WBA light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS benjaminmendes (NO_CANDIDATE) |  |
| Ben Mahoney | IBF super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Bernardin Jakaj | WBO super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Bilal Jkitou | WBC middleweight, IBF middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Bradley Goldsmith | IBF middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Brandon Gael Rodriguez | WBO super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |

## Slice 02

Rule `p0-identity-seed@1.2.1`. Wikidata establishes a person only, never a record, title, ranking or bout.

EXISTING_LINK 0 | AUTO_SEEDED 21 | POSSIBLE_EXISTING_FIGHTER 28 | REVIEW_REQUIRED 18 | NO_CANDIDATE 33 | Wikidata requests 0

### EXISTING_LINK (0)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|

### AUTO_SEEDED (21)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| BRIAN NORMAN JR / Brian Norman Jr. / Brian Norman, Jr. | WBA welterweight, IBF welterweight, WBC welterweight, WBO welterweight | [Q125975589](https://www.wikidata.org/wiki/Q125975589) Brian Norman Jr. | - | name exact ("BRIAN NORMAN JR" = "Brian Norman Jr."); country agrees (USA vs USA); dob single 2000-11-23; era plausible (age 25); division not_on_wikidata; no_death_recorded |
| Callum Peters | IBF middleweight | [Q131399299](https://www.wikidata.org/wiki/Q131399299) Callum Peters | - | name exact ("Callum Peters" = "Callum Peters"); country agrees (AUS vs AUS/AUS); dob single 2002-11-25; era plausible (age 23); division not_on_wikidata; no_death_recorded |
| CARLOS CANIZALES | WBA light_flyweight | [Q50736670](https://www.wikidata.org/wiki/Q50736670) Carlos Cañizales | - | name exact ("CARLOS CANIZALES" = "Carlos Cañizales"); country agrees (VEN vs VEN); dob single 1993-03-11; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Charlie Edwards | IBF super_flyweight | [Q16535879](https://www.wikidata.org/wiki/Q16535879) Charlie Edwards | - | name exact ("Charlie Edwards" = "Charlie Edwards"); country agrees (GBR vs GBR/GBR); dob single 1993-02-08; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Charly Suarez | WBO super_featherweight, WBC super_featherweight | [Q18217943](https://www.wikidata.org/wiki/Q18217943) Charly Suarez | - | name exact ("Charly Suarez" = "Charly Suarez"); country agrees (PHL vs PHL); dob single 1988-08-14; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| Chris Billam-Smith / CHRIS BILLAM-SMITH | IBF cruiserweight, WBC cruiserweight, WBA cruiserweight | [Q76490961](https://www.wikidata.org/wiki/Q76490961) Chris Billam-Smith | -; POSSIBLY SAME PERSON AS chrisbilliamsmith (REVIEW_REQUIRED) | name exact ("Chris Billam-Smith" = "Chris Billam-Smith"); country agrees (GBR vs GBR); dob single 1990-08-02; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Cristobal Lorente | IBF featherweight, WBC featherweight, WBO featherweight | [Q133455847](https://www.wikidata.org/wiki/Q133455847) Cristobal Lorente | - | name exact ("Cristobal Lorente" = "Cristobal Lorente"); country agrees (ESP vs ESP); dob single 1996-03-25; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Daigo Higa / DAIGO HIGA | WBC bantamweight, WBA bantamweight | [Q29998783](https://www.wikidata.org/wiki/Q29998783) Daigo Higa | -; POSSIBLY SAME PERSON AS diagohiga (NO_CANDIDATE) | name exact ("Daigo Higa" = "Daigo Higa"); country agrees (JPN vs JPN); dob single 1995-08-09; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Daniel Valladares | WBC light_flyweight, WBO light_flyweight, IBF light_flyweight | [Q111952086](https://www.wikidata.org/wiki/Q111952086) Daniel Valladares | - | name exact ("Daniel Valladares" = "Daniel Valladares"); country agrees (MEX vs MEX); dob single 1995-01-01; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| David Nyika | IBF cruiserweight, WBO cruiserweight | [Q17484230](https://www.wikidata.org/wiki/Q17484230) David Nyika | - | name exact ("David Nyika" = "David Nyika"); country agrees (AUS/NZL vs NZL); dob single 1995-08-07; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Deontay Wilder | WBC heavyweight, IBF heavyweight, WBO heavyweight | [Q933423](https://www.wikidata.org/wiki/Q933423) Deontay Wilder | - | name exact ("Deontay Wilder" = "Deontay Wilder"); country agrees (GBR/USA vs USA/USA); dob single 1985-10-22; era plausible (age 41); division not_on_wikidata; no_death_recorded |
| Edgar Berlanga / EDGAR BERLANGA | WBC super_middleweight, WBO super_middleweight, WBA super_middleweight | [Q97609005](https://www.wikidata.org/wiki/Q97609005) Edgar Berlanga | - | name exact ("Edgar Berlanga" = "Edgar Berlanga"); country agrees (PRI/USA vs USA); dob single 1997-05-18; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| EDMOND KHUDOYAN | WBA minimumweight | [Q118340600](https://www.wikidata.org/wiki/Q118340600) Edmond Khudoyan | - | name exact ("EDMOND KHUDOYAN" = "Edmond Khudoyan"); country agrees (RUS vs RUS/RUS); dob single 1996-07-16; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Eduardo Nunez | WBO super_featherweight, IBF super_featherweight, WBC super_featherweight | [Q132432440](https://www.wikidata.org/wiki/Q132432440) Eduardo Núñez | - | name exact ("Eduardo Nunez" = "Eduardo Núñez"); country agrees (MEX vs MEX); dob single 1997-07-25; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Elwin Soto | WBC light_flyweight | [Q64765682](https://www.wikidata.org/wiki/Q64765682) Elwin Soto | - | name exact ("Elwin Soto" = "Elwin Soto"); country agrees (MEX vs MEX); dob single 1996-12-23; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Etinosa Oliha | IBF middleweight | [Q117832463](https://www.wikidata.org/wiki/Q117832463) Etinosa Oliha | - | name exact ("Etinosa Oliha" = "Etinosa Oliha"); country agrees (ITA vs ITA); dob single 1998-06-13; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Eumir Marcial | WBC middleweight | [Q27999455](https://www.wikidata.org/wiki/Q27999455) Eumir Marcial | - | name exact ("Eumir Marcial" = "Eumir Marcial"); country agrees (PHL vs PHL/PHL); dob single 1995-10-29; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Fabio Wardley | WBO heavyweight | [Q102218789](https://www.wikidata.org/wiki/Q102218789) Fabio Wardley | - | name exact ("Fabio Wardley" = "Fabio Wardley"); country agrees (GBR vs GBR/GBR); dob single 1994-12-18; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Felix Alvarado | IBF flyweight | [Q58009915](https://www.wikidata.org/wiki/Q58009915) Felix Alvarado | - | name exact ("Felix Alvarado" = "Felix Alvarado"); country agrees (NIC vs NIC); dob single 1989-02-15; era plausible (age 37); division not_on_wikidata; no_death_recorded |
| FERNANDO DANIEL MARTINEZ | WBA super_flyweight | [Q26267550](https://www.wikidata.org/wiki/Q26267550) Fernando Daniel Martínez | -; POSSIBLY SAME PERSON AS fernandomartinez (AUTO_SEEDED Q26267550) | name exact ("FERNANDO DANIEL MARTINEZ" = "Fernando Daniel Martínez"); country agrees (ARG vs ARG); dob single 1991-07-18; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Fernando Martinez | WBC super_flyweight | [Q26267550](https://www.wikidata.org/wiki/Q26267550) Fernando Martínez | -; POSSIBLY SAME PERSON AS fernandodanielmartinez (AUTO_SEEDED Q26267550) | name exact ("Fernando Martinez" = "Fernando Martínez"); country agrees (ARG vs ARG); dob single 1991-07-18; era plausible (age 35); division not_on_wikidata; no_death_recorded |

### POSSIBLE_EXISTING_FIGHTER (28)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Callum Walsh | WBC middleweight, IBF middleweight, WBO middleweight | - | existing_fighter_may_be_same_person |  |
| Carlos Fromenta | WBC bridgerweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS carlosfromentaromero (POSSIBLE_EXISTING_FIGHTER) |  |
| CARLOS FROMENTA ROMERO | WBA bridgerweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS carlosfromenta (POSSIBLE_EXISTING_FIGHTER) |  |
| Carlos Utria / CARLOS UTRIA | WBC super_lightweight, WBA super_lightweight | - | existing_fighter_may_be_same_person |  |
| Charles Conwell | WBO super_welterweight, WBC super_welterweight | - | existing_fighter_may_be_same_person |  |
| Connor Wallace | WBO light_heavyweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS conorwallace (POSSIBLE_EXISTING_FIGHTER) |  |
| Conor Benn | WBC welterweight | - | existing_fighter_may_be_same_person |  |
| Conor Wallace | IBF light_heavyweight, WBC light_heavyweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS connorwallace (POSSIBLE_EXISTING_FIGHTER) |  |
| Corey Marksman / COREY MARKSMAN | WBO lightweight, WBA lightweight | - | existing_fighter_may_be_same_person |  |
| DAINIER PERO | WBA heavyweight | - | existing_fighter_may_be_same_person |  |
| Daniel Blancas | WBC super_middleweight | - | existing_fighter_may_be_same_person |  |
| DARIUS FULGHUM | WBA super_middleweight | - | existing_fighter_may_be_same_person |  |
| Delante Johnson | IBF welterweight, WBO welterweight | - | existing_fighter_may_be_same_person |  |
| Delante Tiger Johnson | WBC welterweight | - | existing_fighter_may_be_same_person |  |
| DEONTE BROWN | WBA super_featherweight | - | existing_fighter_may_be_same_person |  |
| Diego Pacheco / DIEGO PACHECO | WBC super_middleweight, WBO super_middleweight, IBF super_middleweight, WBA super_middleweight | - | existing_fighter_may_be_same_person |  |
| Dominique Crowder | IBF bantamweight | - | existing_fighter_may_be_same_person |  |
| Efe Ajagba / EFE AJAGBA | WBC heavyweight, IBF heavyweight, WBA heavyweight | - | existing_fighter_may_be_same_person |  |
| Emannuel Rodriguez | WBC bantamweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS emmanuelrodriguez (POSSIBLE_EXISTING_FIGHTER) |  |
| EMANUEL MORENO | WBA bantamweight | - | existing_fighter_may_be_same_person |  |
| Emiliano Vargas | WBO super_lightweight, IBF super_lightweight, WBC super_lightweight | - | existing_fighter_may_be_same_person |  |
| Emmanuel Rodriguez | IBF bantamweight, WBO bantamweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS emannuelrodriguez (POSSIBLE_EXISTING_FIGHTER) |  |
| Eric Rosa | IBF light_flyweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS erickrosa (REVIEW_REQUIRED Q107615385) |  |
| Eridson Garcia / ERIDSON GARCIA | WBC lightweight, WBO lightweight, WBA lightweight | - | existing_fighter_may_be_same_person |  |
| Ermal Hadribeaj | WBC super_welterweight | - | existing_fighter_may_be_same_person |  |
| Euri Cedeno | WBO middleweight | - | existing_fighter_may_be_same_person |  |
| Fiodor Czerkaszyn | WBO middleweight, WBC middleweight | - | existing_fighter_may_be_same_person |  |
| Francisco Rodriguez Jr. | WBC flyweight | - | existing_fighter_may_be_same_person |  |

### REVIEW_REQUIRED (18)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Brandon Mejia Mosqueda | WBC featherweight | [Q137578596](https://www.wikidata.org/wiki/Q137578596) Brandon Mejia Mosqueda | no_wikidata_country_to_corroborate | name exact ("Brandon Mejia Mosqueda" = "Brandon Mejia Mosqueda"); country wikidata_has_no_country (MEX vs -); dob single 2004-05-12; era plausible (age 22); division not_on_wikidata; no_death_recorded |
| Brandon Mosqueda | WBO featherweight | - | possible_source_spelling_of:brandonmejiamosqueda |  |
| Caoimhin Agyarko | IBF super_welterweight | [Q112058083](https://www.wikidata.org/wiki/Q112058083) Caoimhín Agyarko | no_wikidata_country_to_corroborate | name exact ("Caoimhin Agyarko" = "Caoimhín Agyarko"); country wikidata_has_no_country (IRL vs -); dob single 1997-01-01; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Carl Jammes Martin | WBO super_bantamweight, IBF super_bantamweight | [Q56809058](https://www.wikidata.org/wiki/Q56809058) Carl Jammes Martin | no_wikidata_country_to_corroborate | name exact ("Carl Jammes Martin" = "Carl Jammes Martin"); country wikidata_has_no_country (PHL vs -); dob single 1999-05-18; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Chris Billiam-Smith | WBO cruiserweight | - | possible_source_spelling_of:chrisbillamsmith; POSSIBLY SAME PERSON AS chrisbillamsmith (AUTO_SEEDED Q76490961) |  |
| Chris Eubank Jr | IBF super_middleweight | - | several_plausible_wikidata_candidates |  |
| Conah Walker / CONAH WALKER | IBF welterweight, WBA welterweight | [Q131910731](https://www.wikidata.org/wiki/Q131910731) Conah Walker | no_wikidata_country_to_corroborate | name exact ("Conah Walker" = "Conah Walker"); country wikidata_has_no_country (GBR vs -); dob single 1995-05-19; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Dylan Biggs | WBC middleweight | [Q137582737](https://www.wikidata.org/wiki/Q137582737) Dylan Biggs | no_wikidata_country_to_corroborate | name exact ("Dylan Biggs" = "Dylan Biggs"); country wikidata_has_no_country (AUS vs -); dob single 2002-12-27; era plausible (age 23); division not_on_wikidata; no_death_recorded |
| Dzmitri Asanau | IBF lightweight | - | possible_source_spelling_of:dzmitryasanau; POSSIBLY SAME PERSON AS dzmitryasanau (REVIEW_REQUIRED Q20564501) |  |
| Dzmitry Asanau | WBC lightweight | [Q20564501](https://www.wikidata.org/wiki/Q20564501) Dzmitry Asanau | country_mismatch_needs_more_evidence; POSSIBLY SAME PERSON AS dzmitriasanau (REVIEW_REQUIRED) | name exact ("Dzmitry Asanau" = "Dzmitry Asanau"); country disagrees (CAN vs BLR); dob single 1996-05-18; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Egidijus Kavaliauskas | WBC welterweight | [Q1297828](https://www.wikidata.org/wiki/Q1297828) Egidijus Kavaliauskas | no_printed_country_to_corroborate | name exact ("Egidijus Kavaliauskas" = "Egidijus Kavaliauskas"); country not_printed (Lithuania vs -); dob single 1988-06-29; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| Erick Badillo | WBO light_flyweight | - | possible_source_spelling_of:erikbadillo; POSSIBLY SAME PERSON AS erikbadillo (REVIEW_REQUIRED) |  |
| Erick Rosa / ERICK ROSA | WBC light_flyweight, WBA light_flyweight | [Q107615385](https://www.wikidata.org/wiki/Q107615385) Erick Rosa | no_wikidata_country_to_corroborate; POSSIBLY SAME PERSON AS ericrosa (POSSIBLE_EXISTING_FIGHTER) | name exact ("Erick Rosa" = "Erick Rosa"); country wikidata_has_no_country (DOM vs -); dob single 2000-03-18; era plausible (age 26); division not_on_wikidata; no_death_recorded |
| Erik Badillo | WBC light_flyweight | - | possible_source_spelling_of:erickbadillo; POSSIBLY SAME PERSON AS erickbadillo (REVIEW_REQUIRED) |  |
| Ernesto Mercado | WBO super_lightweight, IBF super_lightweight | [Q132195744](https://www.wikidata.org/wiki/Q132195744) Ernesto Mercado | no_wikidata_country_to_corroborate | name exact ("Ernesto Mercado" = "Ernesto Mercado"); country wikidata_has_no_country (USA vs -); dob single 2001-10-29; era plausible (age 24); division not_on_wikidata; no_death_recorded |
| Floyd Masson | IBF cruiserweight | [Q110420019](https://www.wikidata.org/wiki/Q110420019) Floyd Masson | no_wikidata_country_to_corroborate | name exact ("Floyd Masson" = "Floyd Masson"); country wikidata_has_no_country (AUS vs -); dob single 1991-12-01; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| FLOYD SCHOFIELD | WBA lightweight | [Q127280702](https://www.wikidata.org/wiki/Q127280702) Floyd Schofield | no_wikidata_country_to_corroborate | name exact ("FLOYD SCHOFIELD" = "Floyd Schofield"); country wikidata_has_no_country (USA vs -); dob single 2002-08-27; era plausible (age 24); division not_on_wikidata; no_death_recorded |
| Francisco Fonseca / FRANCISCO FONSECA | WBC lightweight, WBA lightweight | [Q39074271](https://www.wikidata.org/wiki/Q39074271) Francisco Fonseca | no_wikidata_country_to_corroborate | name exact ("Francisco Fonseca" = "Francisco Fonseca"); country wikidata_has_no_country (CRI/NIC vs -); dob single 1994-01-24; era plausible (age 32); division not_on_wikidata; no_death_recorded |

### NO_CANDIDATE (33)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Brandon Moore | WBO heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Brandon Moreno | IBF minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Bryan Flores | IBF super_lightweight, WBC super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Bryan Largaespada Blandon | WBO bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Bryan Mercado | WBC super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS bryanmercadovazquez (NO_CANDIDATE) |  |
| Bryan Mercado Vazquez | IBF super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS bryanmercado (NO_CANDIDATE) |  |
| Callum Simpson | IBF super_middleweight, WBO super_middleweight, WBC super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Cameron Voung | WBO lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| CARLOS SINISTERRA | WBA super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Christian Balunan | IBF minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Chriztian Pitt Laurente | IBF lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Craig Richards | IBF light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| DAUD ALAEV | WBA lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| David Alonso Sanchez | WBC light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| DAVID ALONSO SANCHEZ ESTRALLA | WBA flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| David Cuellar | IBF bantamweight, WBC bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| David Papot | IBF welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| David Picasso | IBF featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Diago Higa | WBO bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS daigohiga (AUTO_SEEDED Q29998783) |  |
| Dian Xing Zhu / Dianxing Zhu / DianXing Zhu / DIANXING ZHU | WBO minimumweight, WBC minimumweight, IBF minimumweight, WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Edin Avdic / EDIN AVDIC | IBF super_middleweight, WBA super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| EDIN PUHALO | WBA cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Eduardo Zuleta | WBO welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Efetobor Apochi / EFETOBOR APOCHI | WBC cruiserweight, WBA cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| EMEKA NWOKOLO | WBA super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ENKHMANDAKH KHARKHUU | WBA flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ERIC PRIEST | WBA middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| EVGENY ROMANOV | WBA bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Felix Parrilla | WBO featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| FEUDRI FRANCO | WBA super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Fillemon Nghutenanye | WBO flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Fillipus Nghitumbwa | WBO super_bantamweight, WBC super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| FRANCISCO MENDIVIL PEREZ | WBA super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |

## Slice 03

Rule `p0-identity-seed@1.2.1`. Wikidata establishes a person only, never a record, title, ranking or bout.

EXISTING_LINK 0 | AUTO_SEEDED 18 | POSSIBLE_EXISTING_FIGHTER 30 | REVIEW_REQUIRED 16 | NO_CANDIDATE 36 | Wikidata requests 0

### EXISTING_LINK (0)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|

### AUTO_SEEDED (18)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Freddy Kiwitt | WBO super_welterweight | [Q67391973](https://www.wikidata.org/wiki/Q67391973) Freddy Kiwitt | - | name exact ("Freddy Kiwitt" = "Freddy Kiwitt"); country agrees (DEU vs DEU/LBR); dob single 1990-08-24; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| GEORGIY YUNOVIDOV | WBA bridgerweight | [Q109492859](https://www.wikidata.org/wiki/Q109492859) Georgiy Yunovidov | - | name exact ("GEORGIY YUNOVIDOV" = "Georgiy Yunovidov"); country agrees (RUS vs RUS); dob single 1992-10-09; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| GEROME WARBURTON | WBA middleweight | [Q134571854](https://www.wikidata.org/wiki/Q134571854) Gerome Warburton | - | name exact ("GEROME WARBURTON" = "Gerome Warburton"); country agrees (GBR vs GBR); dob single 1995-06-29; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Giovanni Sarchioto | WBO middleweight | [Q20030560](https://www.wikidata.org/wiki/Q20030560) Giovanni Sarchioto | - | name exact ("Giovanni Sarchioto" = "Giovanni Sarchioto"); country agrees (ITA vs ITA); dob single 1997-09-30; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Hayato Tsutsumi / HAYATO TSUTSUMI | WBO super_featherweight, WBC super_featherweight, IBF super_featherweight, WBA super_featherweight | [Q66364972](https://www.wikidata.org/wiki/Q66364972) Hayato Tsutsumi | - | name exact ("Hayato Tsutsumi" = "Hayato Tsutsumi"); country agrees (JPN vs JPN); dob single 1999-07-12; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Henry Lebron / HENRY LEBRON | WBC super_featherweight, IBF super_featherweight, WBO super_featherweight, WBA super_featherweight | [Q124463105](https://www.wikidata.org/wiki/Q124463105) Henry Lebron | - | name exact ("Henry Lebron" = "Henry Lebron"); country agrees (PRI/USA vs USA); dob single 1997-09-15; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Imam Khataev | IBF light_heavyweight, WBO light_heavyweight, WBC light_heavyweight | [Q21645082](https://www.wikidata.org/wiki/Q21645082) Imam Khataev | - | name exact ("Imam Khataev" = "Imam Khataev"); country agrees (AUS/CAN/RUS vs RUS/RUS); dob single 1994-08-31; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Jack Rafferty / JACK RAFFERTY | WBO super_lightweight, IBF welterweight, WBC welterweight, WBA welterweight | [Q130436750](https://www.wikidata.org/wiki/Q130436750) Jack Rafferty | - | name exact ("Jack Rafferty" = "Jack Rafferty"); country agrees (GBR vs GBR); dob single 1995-09-22; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| JAMES DICKENS | WBA super_featherweight | [Q21005622](https://www.wikidata.org/wiki/Q21005622) James Dickens | - | name exact ("JAMES DICKENS" = "James Dickens"); country agrees (GBR vs GBR); dob single 1991-04-12; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Jason Moloney / JASON MOLONEY | WBO bantamweight, WBC bantamweight, IBF bantamweight, WBA bantamweight | [Q51120641](https://www.wikidata.org/wiki/Q51120641) Jason Moloney | - | name exact ("Jason Moloney" = "Jason Moloney"); country agrees (AUS vs AUS); dob single 1991-01-10; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Jayr Raquinel | WBC super_flyweight | [Q84580833](https://www.wikidata.org/wiki/Q84580833) Jayr Raquinel | - | name exact ("Jayr Raquinel" = "Jayr Raquinel"); country agrees (PHL vs PHL); dob single 1997-01-01; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Jermall Charlo / JERMALL CHARLO | WBC super_middleweight, WBA super_middleweight | [Q19864206](https://www.wikidata.org/wiki/Q19864206) Jermall Charlo | - | name exact ("Jermall Charlo" = "Jermall Charlo"); country agrees (USA vs USA/USA); dob single 1990-05-19; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Jeyvier Cintron | WBC bantamweight, IBF bantamweight | [Q2029950](https://www.wikidata.org/wiki/Q2029950) Jeyvier Cintrón | - | name exact ("Jeyvier Cintron" = "Jeyvier Cintrón"); country agrees (PRI vs USA); dob single 1995-02-08; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Joe Cordina | WBC lightweight, WBO lightweight | [Q18330912](https://www.wikidata.org/wiki/Q18330912) Joe Cordina | - | name exact ("Joe Cordina" = "Joe Cordina"); country agrees (GBR vs GBR); dob single 1991-12-01; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| John Ramirez / JOHN RAMIREZ | WBO super_flyweight, WBC super_flyweight, WBA super_flyweight | [Q126006029](https://www.wikidata.org/wiki/Q126006029) John Ramírez | - | name exact ("John Ramirez" = "John Ramírez"); country agrees (USA vs USA); dob single 1996-05-20; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| John Riel Casimero | WBO super_bantamweight, IBF super_bantamweight | [Q3078771](https://www.wikidata.org/wiki/Q3078771) John Riel Casimero | - | name exact ("John Riel Casimero" = "John Riel Casimero"); country agrees (PHL vs PHL); dob single 1990-02-13; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Jon Fernandez | WBC super_lightweight | [Q26774491](https://www.wikidata.org/wiki/Q26774491) Jon Fernández | - | name exact ("Jon Fernandez" = "Jon Fernández"); country agrees (ESP vs ESP); dob single 1995-08-26; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Joselito Velazquez / JOSELITO VELAZQUEZ | WBO flyweight, WBC flyweight, IBF flyweight, WBA flyweight | [Q11728386](https://www.wikidata.org/wiki/Q11728386) Joselito Velázquez | - | name exact ("Joselito Velazquez" = "Joselito Velázquez"); country agrees (MEX vs MEX); dob single 1993-09-30; era plausible (age 33); division not_on_wikidata; no_death_recorded |

### POSSIBLE_EXISTING_FIGHTER (30)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Francisco Veron | WBC super_welterweight | - | existing_fighter_may_be_same_person |  |
| Frank Martin / FRANK MARTIN | WBO super_lightweight, WBA super_lightweight | - | existing_fighter_may_be_same_person |  |
| Frank Sanchez | WBC heavyweight, WBO heavyweight, IBF heavyweight | - | existing_fighter_may_be_same_person |  |
| GARY ALLEN RUSSELL JR | WBA lightweight | - | existing_fighter_may_be_same_person |  |
| Gary Russell | WBC super_featherweight | - | existing_fighter_may_be_same_person |  |
| Gilberto Ramirez / GILBERTO RAMIREZ | WBO cruiserweight, IBF cruiserweight, WBC cruiserweight, WBA cruiserweight | - | existing_fighter_may_be_same_person |  |
| GREG OUTLAW | WBA welterweight | - | existing_fighter_may_be_same_person |  |
| Guido Vianello | IBF heavyweight | - | existing_fighter_may_be_same_person |  |
| GURGEN HOVHANNISYAN | WBA heavyweight | - | existing_fighter_may_be_same_person |  |
| Gustavo Trujillo | WBO heavyweight | - | existing_fighter_may_be_same_person |  |
| HAMZA UDDIN | WBA flyweight | - | existing_fighter_may_be_same_person |  |
| Hebert Conceicao Sousa | WBO super_middleweight | - | existing_fighter_may_be_same_person |  |
| Ilunga Makabu | WBC cruiserweight | - | existing_fighter_may_be_same_person |  |
| Ismael Flores / ISMAEL FLORES | WBO middleweight, WBC super_welterweight, WBA super_welterweight | - | existing_fighter_may_be_same_person |  |
| Israel Gonzalez | WBO super_flyweight, WBC super_flyweight | - | existing_fighter_may_be_same_person |  |
| ISRAEL MERCADO ( * ) | WBA super_lightweight | - | existing_fighter_may_be_same_person |  |
| Israil Madrimov / ISRAIL MADRIMOV | WBO super_welterweight, WBC super_welterweight, IBF super_welterweight, WBA super_welterweight | - | existing_fighter_may_be_same_person |  |
| Jahi Tucker | WBC middleweight, WBO middleweight, IBF middleweight | - | existing_fighter_may_be_same_person |  |
| Jai Opetaia | IBF cruiserweight | - | existing_fighter_may_be_same_person |  |
| Jan Paul Rivera-Pizarro / JAN PAUL RIVERA-PIZARRO | WBO super_featherweight, WBA featherweight | - | existing_fighter_may_be_same_person |  |
| Jarrell Miller / JARRELL MILLER | IBF heavyweight, WBA heavyweight | - | existing_fighter_may_be_same_person |  |
| JEAN CARLOS VARGAS | WBA flyweight | - | existing_fighter_may_be_same_person |  |
| JOEL IRIARTE | WBA welterweight | - | existing_fighter_may_be_same_person |  |
| JONATHAN CABRERA SANCHEZ | WBA featherweight | - | existing_fighter_may_be_same_person |  |
| JONATHAN GONZALEZ | WBA flyweight | - | existing_fighter_may_be_same_person |  |
| Jordan Orozco | WBO bantamweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS jordanorozcohernandez (POSSIBLE_EXISTING_FIGHTER) |  |
| JORDAN OROZCO HERNANDEZ | WBA bantamweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS jordanorozco (POSSIBLE_EXISTING_FIGHTER) |  |
| Jordy Cardona Adames | WBO bantamweight | - | existing_fighter_may_be_same_person |  |
| Jorge Ascanio Martinez | WBO super_bantamweight | - | existing_fighter_may_be_same_person |  |
| Jose Armando Resendiz / JOSE ARMANDO RESENDIZ | WBC super_middleweight, WBO super_middleweight, WBA super_middleweight | - | existing_fighter_may_be_same_person |  |

### REVIEW_REQUIRED (16)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| GAVIN GWYNNE | WBA super_lightweight | [Q105642415](https://www.wikidata.org/wiki/Q105642415) Gavin Gwynne | no_wikidata_country_to_corroborate, no_dob_era_unverifiable | name exact ("GAVIN GWYNNE" = "Gavin Gwynne"); country wikidata_has_no_country (GBR vs -); dob absent; era -; division not_on_wikidata; no_death_recorded |
| George Liddard | WBC middleweight, IBF middleweight | [Q134499093](https://www.wikidata.org/wiki/Q134499093) George Liddard | no_wikidata_country_to_corroborate; POSSIBLY SAME PERSON AS georgieliddard (REVIEW_REQUIRED) | name exact ("George Liddard" = "George Liddard"); country wikidata_has_no_country (GBR vs -); dob single 2002-05-30; era plausible (age 24); division not_on_wikidata; no_death_recorded |
| Georgie Liddard | WBO middleweight | - | possible_source_spelling_of:georgeliddard; POSSIBLY SAME PERSON AS georgeliddard (REVIEW_REQUIRED Q134499093) |  |
| Giovani Santillan | WBO super_welterweight | [Q123536174](https://www.wikidata.org/wiki/Q123536174) Giovani Santillan | no_wikidata_country_to_corroborate; POSSIBLY SAME PERSON AS giovannisantillan (REVIEW_REQUIRED) | name exact ("Giovani Santillan" = "Giovani Santillan"); country wikidata_has_no_country (USA vs -); dob single 1991-12-04; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Giovanni Santillan | IBF super_welterweight | - | possible_source_spelling_of:giovanisantillan; POSSIBLY SAME PERSON AS giovanisantillan (REVIEW_REQUIRED Q123536174) |  |
| Gradus Kraus / GRADUS KRAUS | IBF light_heavyweight, WBA light_heavyweight | [Q136419383](https://www.wikidata.org/wiki/Q136419383) Gradus Kraus | no_printed_country_to_corroborate | name exact ("Gradus Kraus" = "Gradus Kraus"); country not_printed (NED/NLD vs -); dob single 2001-07-12; era plausible (age 25); division not_on_wikidata; no_death_recorded |
| Hamzah Sheeraz / HAMZAH SHEERAZ | WBC super_middleweight, WBA super_middleweight | - | several_plausible_wikidata_candidates |  |
| HOVHANNES BACHKOV | WBA super_lightweight | [Q26254457](https://www.wikidata.org/wiki/Q26254457) Hovhannes Bachkov | no_printed_country_to_corroborate | name exact ("HOVHANNES BACHKOV" = "Hovhannes Bachkov"); country not_printed (ARM vs -); dob single 1992-12-02; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Jacob Bank | WBO super_middleweight, WBC super_middleweight, IBF super_middleweight | [Q115104547](https://www.wikidata.org/wiki/Q115104547) Jacob Bank | no_printed_country_to_corroborate | name exact ("Jacob Bank" = "Jacob Bank"); country not_printed (Denmark/DNK vs -); dob single 2001-02-09; era plausible (age 25); division not_on_wikidata; no_death_recorded |
| Jayson Vayson / JAYSON VAYSON | IBF light_flyweight, WBO minimumweight, WBC light_flyweight, WBA minimumweight | [Q124050918](https://www.wikidata.org/wiki/Q124050918) Jayson Vayson | no_wikidata_country_to_corroborate | name exact ("Jayson Vayson" = "Jayson Vayson"); country wikidata_has_no_country (PHL vs -); dob single 1998-05-11; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Jerry Forrest | WBC bridgerweight | [Q141258981](https://www.wikidata.org/wiki/Q141258981) Jerry Forrest | no_wikidata_country_to_corroborate | name exact ("Jerry Forrest" = "Jerry Forrest"); country wikidata_has_no_country (USA vs -); dob single 1988-04-08; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| Jesse Espinas | WBC flyweight, WBO light_flyweight | [Q135319299](https://www.wikidata.org/wiki/Q135319299) Jesse Espinas | no_wikidata_country_to_corroborate | name exact ("Jesse Espinas" = "Jesse Espinas"); country wikidata_has_no_country (PHL vs -); dob single 1992-11-29; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Jhon Orobio / JHON OROBIO | IBF super_lightweight, WBO super_lightweight, WBC super_lightweight, WBA super_lightweight | [Q134893981](https://www.wikidata.org/wiki/Q134893981) Jhon Orobio | no_wikidata_country_to_corroborate | name exact ("Jhon Orobio" = "Jhon Orobio"); country wikidata_has_no_country (COL vs -); dob single 2003-06-21; era plausible (age 23); division not_on_wikidata; no_death_recorded |
| Joet Gonzalez | WBC featherweight | [Q112301854](https://www.wikidata.org/wiki/Q112301854) Joet Gonzalez | no_wikidata_country_to_corroborate | name exact ("Joet Gonzalez" = "Joet Gonzalez"); country wikidata_has_no_country (USA vs -); dob single 1993-10-12; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Joey Canoy / JOEY CANOY | IBF minimumweight, WBC minimumweight, WBO minimumweight, WBA minimumweight | [Q125400463](https://www.wikidata.org/wiki/Q125400463) Joey Canoy | no_wikidata_country_to_corroborate | name exact ("Joey Canoy" = "Joey Canoy"); country wikidata_has_no_country (PHL vs -); dob single 1993-01-01; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Jordan White | IBF lightweight, WBC lightweight | [Q141350684](https://www.wikidata.org/wiki/Q141350684) Jordan White | no_wikidata_country_to_corroborate | name exact ("Jordan White" = "Jordan White"); country wikidata_has_no_country (USA vs -); dob single 1997-08-27; era plausible (age 29); division not_on_wikidata; no_death_recorded |

### NO_CANDIDATE (36)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Francis Hogan | WBC middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Gabriel Santisima | WBO super_bantamweight, IBF super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Gabriel Valenzuela | IBF super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Gerardo Sanchez | WBO light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| GEREMY VERA | WBA flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Gohan Rodriguez | WBC super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Hayate Hanada | IBF super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ian Abne | WBC minimumweight, IBF minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ibrahima Diallo | IBF super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ignacio David Iribarren | WBO welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ILYAS CAN KALI | WBA welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| ISSA SAKATA | WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| IVAN CHIRKOV | WBA featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jack Bowen | WBO super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jack Mulowayi | WBC bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jackson England | IBF super_featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jack Turner / JACK TURNER | WBO super_flyweight, IBF super_flyweight, WBA super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JAIRO NORIEGA | WBA light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jassiel Ramon Amador Gamez / JASSIEL RAMON AMADOR GAMEZ | WBO super_flyweight, WBA super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JEIFRY JUAN | WBA light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JEREMY ALVAREZ | WBA super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JESUS HARO | WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jevgenijs Aleksejevs | IBF middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jhon-Riel Casimero | WBC featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jin Sasaki | WBC welterweight, WBO welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JOEL AGUSTIN CONTRERAS | WBA flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JOEL CAMILLERI | WBA middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JOE MCGRAIL | WBA super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jonathan Kasheeta | WBO bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jonathan Kogasso | WBC cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jong Seon Kang | WBO super_featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jorge Garcia | WBC super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jose Angel Rosa | WBC welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jose Calderon Cervantes | WBC bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JOSE LUIS NAVARRO JR | WBA super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jose Luis Russell Regalado | WBO flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |

## Slice 04

Rule `p0-identity-seed@1.2.1`. Wikidata establishes a person only, never a record, title, ranking or bout.

EXISTING_LINK 0 | AUTO_SEEDED 29 | POSSIBLE_EXISTING_FIGHTER 14 | REVIEW_REQUIRED 27 | NO_CANDIDATE 30 | Wikidata requests 0

### EXISTING_LINK (0)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|

### AUTO_SEEDED (29)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Joseph Parker | WBO heavyweight, WBC heavyweight | [Q16227145](https://www.wikidata.org/wiki/Q16227145) Joseph Parker | - | name exact ("Joseph Parker" = "Joseph Parker"); country agrees (NZL vs NZL/NZL); dob single 1992-01-09; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Joshua Buatsi | WBC light_heavyweight | [Q24084854](https://www.wikidata.org/wiki/Q24084854) Joshua Buatsi | - | name exact ("Joshua Buatsi" = "Joshua Buatsi"); country agrees (GBR/GHA vs GBR/GBR); dob single 1993-03-14; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Juan Francisco Estrada | WBC bantamweight | [Q11332309](https://www.wikidata.org/wiki/Q11332309) Juan Francisco Estrada | - | name exact ("Juan Francisco Estrada" = "Juan Francisco Estrada"); country agrees (MEX vs MEX/MEX); dob single 1990-04-14; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| JULIO CESAR LA CRUZ | WBA cruiserweight, WBA bridgerweight | [Q918584](https://www.wikidata.org/wiki/Q918584) Julio César la Cruz | - | name exact ("JULIO CESAR LA CRUZ" = "Julio César la Cruz"); country agrees (CUB vs CUB); dob single 1989-08-11; era plausible (age 37); division not_on_wikidata; no_death_recorded |
| Junto Nakatani / JUNTO NAKATANI | WBO super_bantamweight, IBF super_bantamweight, WBC super_bantamweight, WBA super_bantamweight | [Q97959573](https://www.wikidata.org/wiki/Q97959573) Junto Nakatani | - | name exact ("Junto Nakatani" = "Junto Nakatani"); country agrees (JPN vs JPN); dob single 1998-01-02; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Justis Huni | WBC heavyweight, IBF heavyweight | [Q68101642](https://www.wikidata.org/wiki/Q68101642) Justis Huni | -; POSSIBLY SAME PERSON AS justinhuni (REVIEW_REQUIRED) | name exact ("Justis Huni" = "Justis Huni"); country agrees (AUS vs AUS); dob single 1999-04-04; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Kazuki Nakajima | WBC super_bantamweight | [Q81373730](https://www.wikidata.org/wiki/Q81373730) Kazuki Nakajima | - | name exact ("Kazuki Nakajima" = "Kazuki Nakajima"); country agrees (JPN vs JPN); dob single 1993-05-28; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Kazuto Ioka / KAZUTO IOKA | WBC bantamweight, IBF bantamweight, WBA bantamweight | [Q3116883](https://www.wikidata.org/wiki/Q3116883) Kazuto Ioka | - | name exact ("Kazuto Ioka" = "Kazuto Ioka"); country agrees (JPN vs JPN/JPN); dob single 1989-03-24; era plausible (age 37); division not_on_wikidata; no_death_recorded |
| Keisuke Matsumoto | IBF super_featherweight | [Q118696864](https://www.wikidata.org/wiki/Q118696864) Keisuke Matsumoto | - | name exact ("Keisuke Matsumoto" = "Keisuke Matsumoto"); country agrees (JPN vs JPN); dob single 1999-07-17; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Kenichi Ogawa | WBC super_featherweight, WBO super_featherweight | [Q41639368](https://www.wikidata.org/wiki/Q41639368) Kenichi Ogawa | - | name exact ("Kenichi Ogawa" = "Kenichi Ogawa"); country agrees (JPN vs JPN); dob single 1988-02-01; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| Kenta Nakagawa / KENTA NAKAGAWA | WBO super_flyweight, IBF super_flyweight, WBA super_flyweight | [Q70544604](https://www.wikidata.org/wiki/Q70544604) Kenta Nakagawa | - | name exact ("Kenta Nakagawa" = "Kenta Nakagawa"); country agrees (JPN vs JPN); dob single 1985-08-07; era plausible (age 41); division not_on_wikidata; no_death_recorded |
| Kevin Lele Sadjo / KEVIN LELE SADJO | IBF super_middleweight, WBO super_middleweight, WBC super_middleweight, WBA super_middleweight | [Q97441046](https://www.wikidata.org/wiki/Q97441046) Kevin Lele Sadjo | - | name exact ("Kevin Lele Sadjo" = "Kevin Lele Sadjo"); country agrees (FRA/GBR vs FRA); dob single 1990-04-06; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Kevin Lerena | WBC cruiserweight | [Q29043108](https://www.wikidata.org/wiki/Q29043108) Kevin Lerena | - | name exact ("Kevin Lerena" = "Kevin Lerena"); country agrees (ZAF vs ZAF/ZAF); dob single 1992-05-05; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Keyshawn Davis | IBF welterweight | [Q67943370](https://www.wikidata.org/wiki/Q67943370) Keyshawn Davis | - | name exact ("Keyshawn Davis" = "Keyshawn Davis"); country agrees (USA vs USA/USA); dob single 1999-02-28; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Khalil El Hadri | WBC super_featherweight | [Q141468476](https://www.wikidata.org/wiki/Q141468476) Khalil El Hadri | - | name exact ("Khalil El Hadri" = "Khalil El Hadri"); country agrees (FRA vs FRA); dob single 1995-11-16; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| KHARITON AGRBA | WBA super_lightweight | [Q65044044](https://www.wikidata.org/wiki/Q65044044) Khariton Agrba | - | name exact ("KHARITON AGRBA" = "Khariton Agrba"); country agrees (RUS vs RUS/RUS); dob single 1995-10-22; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Kyonosuke Kameda | IBF featherweight | [Q60613901](https://www.wikidata.org/wiki/Q60613901) Kyōnosuke Kameda | - | name exact ("Kyonosuke Kameda" = "Kyōnosuke Kameda"); country agrees (JPN vs JPN); dob single 1998-01-01; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Kyosuke Takami / KYOSUKE TAKAMI | WBC flyweight, IBF flyweight, WBO flyweight, WBA flyweight | [Q135510034](https://www.wikidata.org/wiki/Q135510034) Kyosuke Takami | - | name exact ("Kyosuke Takami" = "Kyosuke Takami"); country agrees (JPN vs JPN); dob single 2002-04-05; era plausible (age 24); division not_on_wikidata; no_death_recorded |
| Lazaro Alvarez / LAZARO ALVAREZ | WBC lightweight, WBA lightweight | [Q1277404](https://www.wikidata.org/wiki/Q1277404) Lázaro Álvarez | - | name exact ("Lazaro Alvarez" = "Lázaro Álvarez"); country agrees (CUB vs CUB/CUB); dob single 1991-01-28; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Leonardo Mosquea / LEONARDO MOSQUEA | IBF cruiserweight, WBC cruiserweight, WBO cruiserweight, WBA cruiserweight | [Q133214390](https://www.wikidata.org/wiki/Q133214390) Leonardo Mosquea | - | name exact ("Leonardo Mosquea" = "Leonardo Mosquea"); country agrees (FRA vs FRA); dob single 1994-03-11; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Lindolfo Delgado | WBO super_lightweight, IBF super_lightweight | [Q19823586](https://www.wikidata.org/wiki/Q19823586) Lindolfo Delgado | - | name exact ("Lindolfo Delgado" = "Lindolfo Delgado"); country agrees (MEX vs MEX/MEX); dob single 1994-12-31; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Luka Plantic | WBC super_middleweight | [Q20030316](https://www.wikidata.org/wiki/Q20030316) Luka Plantić | - | name exact ("Luka Plantic" = "Luka Plantić"); country agrees (HRV vs HRV); dob single 1996-10-29; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| MAGOMED KURBANOV | WBA super_welterweight | [Q29035331](https://www.wikidata.org/wiki/Q29035331) Magomed Kurbanov | - | name exact ("MAGOMED KURBANOV" = "Magomed Kurbanov"); country agrees (RUS vs RUS); dob single 1995-08-03; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Mark Chamberlain | WBC super_lightweight, IBF super_lightweight | [Q132673311](https://www.wikidata.org/wiki/Q132673311) Mark Chamberlain | - | name exact ("Mark Chamberlain" = "Mark Chamberlain"); country agrees (GBR vs GBR); dob single 1999-01-11; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Marlon Tapales | WBC featherweight | [Q26207110](https://www.wikidata.org/wiki/Q26207110) Marlon Tapales | - | name exact ("Marlon Tapales" = "Marlon Tapales"); country agrees (PHL vs PHL); dob single 1992-03-22; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| MASANORI RIKIISHI | WBA super_featherweight | [Q111654079](https://www.wikidata.org/wiki/Q111654079) Masanori Rikiishi | -; POSSIBLY SAME PERSON AS masanoririkishi (REVIEW_REQUIRED) | name exact ("MASANORI RIKIISHI" = "Masanori Rikiishi"); country agrees (JPN vs JPN); dob single 1994-06-10; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Masataka Taniguchi / MASATAKA TANIGUCHI | IBF light_flyweight, WBC light_flyweight, WBO light_flyweight, WBA light_flyweight | [Q59552147](https://www.wikidata.org/wiki/Q59552147) Masataka Taniguchi | - | name exact ("Masataka Taniguchi" = "Masataka Taniguchi"); country agrees (JPN vs JPN); dob single 1994-01-19; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Mateusz Masternak | WBC cruiserweight, IBF cruiserweight | [Q4284347](https://www.wikidata.org/wiki/Q4284347) Mateusz Masternak | - | name exact ("Mateusz Masternak" = "Mateusz Masternak"); country agrees (POL vs POL/POL); dob single 1987-05-02; era plausible (age 39); division not_on_wikidata; no_death_recorded |
| Matias Carlos Adrian Rueda | WBO super_lightweight | [Q18719929](https://www.wikidata.org/wiki/Q18719929) Matías Carlos Adrían Rueda | - | name exact ("Matias Carlos Adrian Rueda" = "Matías Carlos Adrían Rueda"); country agrees (ARG vs ARG); dob single 1988-04-15; era plausible (age 38); division not_on_wikidata; no_death_recorded |

### POSSIBLE_EXISTING_FIGHTER (14)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Jose Tito Sanchez / JOSE TITO SANCHEZ | WBC super_bantamweight, IBF super_bantamweight, WBA super_bantamweight | - | existing_fighter_may_be_same_person |  |
| JOSE VALENZUELA | WBA lightweight | - | existing_fighter_may_be_same_person |  |
| Joshua Pagan | WBO lightweight | - | existing_fighter_may_be_same_person |  |
| JULIAN RODRIGUEZ | WBA welterweight | - | existing_fighter_may_be_same_person |  |
| Justin Pauldo | WBC lightweight, WBO lightweight | - | existing_fighter_may_be_same_person |  |
| KAIPO GALLEGOS | WBA super_featherweight | - | existing_fighter_may_be_same_person |  |
| Katsuma Akitsugi / KATSUMA AKITSUGI | WBO bantamweight, WBA bantamweight | - | existing_fighter_may_be_same_person |  |
| KEVIN HAYLER BROWN | WBA super_lightweight | - | existing_fighter_may_be_same_person |  |
| Lamont Roach | WBC lightweight | - | existing_fighter_may_be_same_person |  |
| Lucas Bahdi / LUCAS BAHDI | IBF lightweight, WBA lightweight | - | existing_fighter_may_be_same_person |  |
| Luis Reynaldo Nunez / LUIS REYNALDO NUNEZ | IBF featherweight, WBA featherweight | - | existing_fighter_may_be_same_person |  |
| Lyubomyr Pinchuk | WBC bridgerweight | - | existing_fighter_may_be_same_person |  |
| Mario Barrios | WBC super_welterweight | - | existing_fighter_may_be_same_person |  |
| Mark Magsayo | IBF lightweight, WBO lightweight | - | existing_fighter_may_be_same_person |  |

### REVIEW_REQUIRED (27)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Joseph Cordina | IBF lightweight | [Q18330912](https://www.wikidata.org/wiki/Q18330912) Joseph Cordina | no_printed_country_to_corroborate | name exact ("Joseph Cordina" = "Joseph Cordina"); country not_printed (WLS vs -); dob single 1991-12-01; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Josh Padley / JOSH PADLEY | IBF super_featherweight, WBC super_featherweight, WBA super_featherweight | [Q131408252](https://www.wikidata.org/wiki/Q131408252) Josh Padley | no_wikidata_country_to_corroborate | name exact ("Josh Padley" = "Josh Padley"); country wikidata_has_no_country (GBR vs -); dob single 1995-11-12; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Juergen Uldedaj | IBF cruiserweight | [Q110814668](https://www.wikidata.org/wiki/Q110814668) Juergen Uldedaj | no_printed_country_to_corroborate | name exact ("Juergen Uldedaj" = "Juergen Uldedaj"); country not_printed (ALB vs -); dob single 1997-08-26; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Junior Leandro Zarate | WBO minimumweight | - | possible_source_spelling_of:juniorzarate |  |
| Junior Zarate | WBC minimumweight | - | possible_source_spelling_of:juniorleandrozarate |  |
| Justin Huni | WBO heavyweight | - | possible_source_spelling_of:justishuni; POSSIBLY SAME PERSON AS justishuni (AUTO_SEEDED Q68101642) |  |
| KAROL WELTER | WBA middleweight | [Q132470863](https://www.wikidata.org/wiki/Q132470863) Karol Welter | no_wikidata_country_to_corroborate | name exact ("KAROL WELTER" = "Karol Welter"); country wikidata_has_no_country (POL vs -); dob single 1995-09-29; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| KEM LJUNGQUIST | WBA heavyweight | [Q61058992](https://www.wikidata.org/wiki/Q61058992) Kem Ljungquist | no_printed_country_to_corroborate | name exact ("KEM LJUNGQUIST" = "Kem Ljungquist"); country not_printed (DEN vs -); dob single 1990-07-17; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Kenneth Llover | IBF super_bantamweight | [Q133804044](https://www.wikidata.org/wiki/Q133804044) Kenneth Llover | no_wikidata_country_to_corroborate | name exact ("Kenneth Llover" = "Kenneth Llover"); country wikidata_has_no_country (PHL vs -); dob single 2003-01-15; era plausible (age 23); division not_on_wikidata; no_death_recorded |
| Kevin Walsh | IBF featherweight, WBC featherweight | [Q138543376](https://www.wikidata.org/wiki/Q138543376) Kevin Walsh | no_wikidata_country_to_corroborate | name exact ("Kevin Walsh" = "Kevin Walsh"); country wikidata_has_no_country (USA vs -); dob single 1992-09-08; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Kieran Molloy | IBF welterweight | [Q59155039](https://www.wikidata.org/wiki/Q59155039) Kieran Molloy | no_wikidata_country_to_corroborate | name exact ("Kieran Molloy" = "Kieran Molloy"); country wikidata_has_no_country (IRL vs -); dob single 1998-11-26; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Kingsley Ibeh / KINGSLEY IBEH | WBC heavyweight, WBA heavyweight | [Q140690786](https://www.wikidata.org/wiki/Q140690786) Kingsley Ibeh | no_wikidata_country_to_corroborate | name exact ("Kingsley Ibeh" = "Kingsley Ibeh"); country wikidata_has_no_country (USA vs -); dob single 1993-11-13; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Kirra Ruston | IBF light_heavyweight | [Q133275643](https://www.wikidata.org/wiki/Q133275643) Kirra Ruston | no_wikidata_country_to_corroborate | name exact ("Kirra Ruston" = "Kirra Ruston"); country wikidata_has_no_country (AUS vs -); dob single 1998-04-19; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Labinot Xhoxhaj | WBC heavyweight | [Q137540720](https://www.wikidata.org/wiki/Q137540720) Labinot Xhoxhaj | no_printed_country_to_corroborate | name exact ("Labinot Xhoxhaj" = "Labinot Xhoxhaj"); country not_printed (Kosovo vs -); dob single 1993-03-04; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Lenar Perez / LENAR PEREZ | WBO cruiserweight, WBC cruiserweight, IBF cruiserweight, WBA cruiserweight | [Q112989461](https://www.wikidata.org/wiki/Q112989461) Lenar Perez | no_wikidata_country_to_corroborate | name exact ("Lenar Perez" = "Lenar Perez"); country wikidata_has_no_country (CUB vs -); dob single 1998-01-25; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| LEON HARTH | WBA cruiserweight | [Q111941927](https://www.wikidata.org/wiki/Q111941927) Leon Harth | no_wikidata_country_to_corroborate | name exact ("LEON HARTH" = "Leon Harth"); country wikidata_has_no_country (DEU vs -); dob single 1988-05-31; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| LERRONE RICHARDS | WBA light_heavyweight | [Q76490989](https://www.wikidata.org/wiki/Q76490989) Lerrone Richards | no_wikidata_country_to_corroborate | name exact ("LERRONE RICHARDS" = "Lerrone Richards"); country wikidata_has_no_country (GBR vs -); dob single 1992-08-25; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Lewis Crocker | IBF welterweight, WBC welterweight | [Q95686762](https://www.wikidata.org/wiki/Q95686762) Lewis Crocker | no_wikidata_country_to_corroborate | name exact ("Lewis Crocker" = "Lewis Crocker"); country wikidata_has_no_country (GBR vs -); dob single 1997-01-06; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| LEWIS EDMONDSON | WBA light_heavyweight | [Q131986668](https://www.wikidata.org/wiki/Q131986668) Lewis Edmondson | no_wikidata_country_to_corroborate | name exact ("LEWIS EDMONDSON" = "Lewis Edmondson"); country wikidata_has_no_country (GBR vs -); dob single 1995-11-28; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Liam Davies | IBF featherweight, WBC featherweight, WBO featherweight | [Q123278569](https://www.wikidata.org/wiki/Q123278569) Liam Davies | no_wikidata_country_to_corroborate | name exact ("Liam Davies" = "Liam Davies"); country wikidata_has_no_country (GBR vs -); dob single 1996-03-31; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Lienard Sarcon | IBF featherweight | [Q140130188](https://www.wikidata.org/wiki/Q140130188) Lienard Sarcon | no_wikidata_country_to_corroborate | name exact ("Lienard Sarcon" = "Lienard Sarcon"); country wikidata_has_no_country (PHL vs -); dob single 2000-03-21; era plausible (age 26); division not_on_wikidata; no_death_recorded |
| Lorenzo Parra | WBO featherweight, IBF featherweight | [Q3116862](https://www.wikidata.org/wiki/Q3116862) Lorenzo Parra | age_implausible_for_current_champion | name exact ("Lorenzo Parra" = "Lorenzo Parra"); country agrees (VEN vs VEN); dob single 1978-08-19; era implausible (age 48); division not_on_wikidata; no_death_recorded |
| Luis Alberto Lopez | WBO super_featherweight | [Q110628587](https://www.wikidata.org/wiki/Q110628587) Luis Alberto López | no_wikidata_country_to_corroborate; POSSIBLY SAME PERSON AS luisalbertolopezvargas (NO_CANDIDATE) | name exact ("Luis Alberto Lopez" = "Luis Alberto López"); country wikidata_has_no_country (MEX vs -); dob single 1993-08-21; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Luis Castillo | WBC minimumweight | [Q64223740](https://www.wikidata.org/wiki/Q64223740) Luis Castillo | age_implausible_for_current_champion, recorded_deceased | name exact ("Luis Castillo" = "Luis Castillo"); country agrees (MEX vs MEX); dob single 1918-01-01; era implausible (age 108); division not_on_wikidata; deceased |
| Malik Zinad | IBF super_middleweight | [Q111849798](https://www.wikidata.org/wiki/Q111849798) Malik Zinad | no_printed_country_to_corroborate | name exact ("Malik Zinad" = "Malik Zinad"); country not_printed (LBY vs -); dob single 1993-11-19; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Mark Vicelles | IBF light_flyweight | [Q110288942](https://www.wikidata.org/wiki/Q110288942) Mark Vicelles | no_wikidata_country_to_corroborate | name exact ("Mark Vicelles" = "Mark Vicelles"); country wikidata_has_no_country (PHL vs -); dob single 1995-12-10; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Masanori Rikishi | IBF super_featherweight | - | possible_source_spelling_of:masanoririkiishi; POSSIBLY SAME PERSON AS masanoririkiishi (AUTO_SEEDED Q111654079) |  |

### NO_CANDIDATE (30)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| JOSE NUNEZ | WBA super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JOSEPH SPENCER | WBA super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Joseph Sumabong / JOSEPH SUMABONG | WBO minimumweight, IBF minimumweight, WBC minimumweight, WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jose Ramirez Maciel | WBC super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JOSUE FRANCISCO AGUERO | WBA super_featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Julian Vogel | WBO super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Jun Ikegawa | WBC super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| JUNIOR ANDRES NARVAES | WBA bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Junior Younan / JUNIOR YOUNAN | IBF super_middleweight, WBA super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Karen Chukhadzhian | IBF welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Katsuki Mori / KATSUKI MORI | WBO minimumweight, IBF minimumweight, WBC minimumweight, WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Keaton Gomes | WBC bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Keita Nakayama | IBF bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| KEVIN GONZALEZ | WBA super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Kevin Ramirez | WBO cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Kevin Vivas | WBO light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Kosuke Tomioka / KOSUKE TOMIOKA | IBF flyweight, WBO flyweight, WBA flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Kris Terzievski | WBC bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Kuntae Lee | WBC super_lightweight, WBO super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Landile Ngxeke | IBF bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| LEONARDO SANCHEZ | WBA welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Leonard Pores III | IBF flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Liam Wilson / LIAM WILSON | WBO super_featherweight, IBF super_featherweight, WBA super_featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Luca D'Ortenzi | IBF light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| LUCAS BRIAN ARIEL BASTIDA | WBA middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Lucas Pontes Da Silva | WBO cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Luis Alberto Lopez Vargas | IBF super_featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS luisalbertolopez (REVIEW_REQUIRED Q110628587) |  |
| Luke Modini | IBF cruiserweight, WBO cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Masatora Okada | IBF minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Mateus Heita | WBO featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |

## Slice 05

Rule `p0-identity-seed@1.2.1`. Wikidata establishes a person only, never a record, title, ranking or bout.

EXISTING_LINK 1 | AUTO_SEEDED 19 | POSSIBLE_EXISTING_FIGHTER 19 | REVIEW_REQUIRED 25 | NO_CANDIDATE 36 | Wikidata requests 0

### EXISTING_LINK (1)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| MUSLIM GADZHIMAGOMEDOV | WBA cruiserweight | - | entry_already_resolves_to_fighter |  |

### AUTO_SEEDED (19)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Melvin Jerusalem | WBO minimumweight, IBF minimumweight, WBC minimumweight | [Q28528821](https://www.wikidata.org/wiki/Q28528821) Melvin Jerusalem | - | name exact ("Melvin Jerusalem" = "Melvin Jerusalem"); country agrees (PHL vs PHL); dob single 1994-02-22; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Michel Soro | IBF middleweight | [Q20202171](https://www.wikidata.org/wiki/Q20202171) Michel Soro | - | name exact ("Michel Soro" = "Michel Soro"); country agrees (FRA vs FRA/FRA); dob single 1987-10-30; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| Miel Fajardo | WBC flyweight, IBF flyweight | [Q120813069](https://www.wikidata.org/wiki/Q120813069) Miel Fajardo | - | name exact ("Miel Fajardo" = "Miel Fajardo"); country agrees (PHL vs PHL); dob single 2000-01-01; era plausible (age 26); division not_on_wikidata; no_death_recorded |
| Mike Perez / MIKE PEREZ | IBF cruiserweight, WBO cruiserweight, WBA cruiserweight | [Q4350855](https://www.wikidata.org/wiki/Q4350855) Mike Perez | - | name exact ("Mike Perez" = "Mike Perez"); country agrees (CUB vs CUB); dob single 1985-10-20; era plausible (age 40); division not_on_wikidata; no_death_recorded |
| Mikito Nakano / MIKITO NAKANO | WBO featherweight, IBF featherweight, WBC featherweight, WBA featherweight | [Q66364951](https://www.wikidata.org/wiki/Q66364951) Mikito Nakano | - | name exact ("Mikito Nakano" = "Mikito Nakano"); country agrees (JPN vs JPN); dob single 1995-01-01; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| MIRCO CUELLO | WBA featherweight | [Q64364492](https://www.wikidata.org/wiki/Q64364492) Mirco Cuello | - | name exact ("MIRCO CUELLO" = "Mirco Cuello"); country agrees (ARG vs ARG/ARG); dob single 2000-09-21; era plausible (age 26); division not_on_wikidata; no_death_recorded |
| Moreno Fendero | WBC super_middleweight | [Q118329264](https://www.wikidata.org/wiki/Q118329264) Moreno Fendero | - | name exact ("Moreno Fendero" = "Moreno Fendero"); country agrees (CAN/FRA vs FRA); dob single 1999-05-31; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Mourad Aliev | WBC heavyweight | [Q64875891](https://www.wikidata.org/wiki/Q64875891) Mourad Aliev | - | name exact ("Mourad Aliev" = "Mourad Aliev"); country agrees (FRA vs FRA/RUS/FRA); dob single 1995-07-31; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Murodjon Akhmadaliev / MURODJON AKHMADALIEV | IBF super_bantamweight, WBC super_bantamweight, WBO super_bantamweight, WBA super_bantamweight | [Q26260147](https://www.wikidata.org/wiki/Q26260147) Murodjon Akhmadaliev | - | name exact ("Murodjon Akhmadaliev" = "Murodjon Akhmadaliev"); country agrees (UZB vs UZB); dob single 1994-11-02; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| NONITO DONAIRE | WBA bantamweight | [Q731759](https://www.wikidata.org/wiki/Q731759) Nonito Donaire | - | name exact ("NONITO DONAIRE" = "Nonito Donaire"); country agrees (PHL vs PHL/USA); dob single 1982-11-16; era plausible (age 43); division not_on_wikidata; no_death_recorded |
| OLEKSANDR KHYZHNIAK | WBA light_heavyweight | [Q20070537](https://www.wikidata.org/wiki/Q20070537) Oleksandr Khyzhniak | - | name exact ("OLEKSANDR KHYZHNIAK" = "Oleksandr Khyzhniak"); country agrees (UKR vs UKR/UKR); dob single 1995-08-03; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Oleksandr Usyk | WBO heavyweight | [Q938027](https://www.wikidata.org/wiki/Q938027) Oleksandr Usyk | - | name exact ("Oleksandr Usyk" = "Oleksandr Usyk"); country agrees (UKR vs UKR/SUN/UKR); dob single 1987-01-17; era plausible (age 39); division not_on_wikidata; no_death_recorded |
| OTABEK KHOLMATOV | WBA featherweight | [Q119840379](https://www.wikidata.org/wiki/Q119840379) Otabek Kholmatov | - | name exact ("OTABEK KHOLMATOV" = "Otabek Kholmatov"); country agrees (UZB vs UZB); dob single 1998-07-22; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Paulo Aokuso | IBF light_heavyweight, WBO light_heavyweight | [Q107689714](https://www.wikidata.org/wiki/Q107689714) Paulo Aokuso | - | name exact ("Paulo Aokuso" = "Paulo Aokuso"); country agrees (AUS vs AUS); dob single 1997-05-20; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Pedro Guevara | WBO super_flyweight, WBC super_flyweight | [Q7159624](https://www.wikidata.org/wiki/Q7159624) Pedro Guevara | - | name exact ("Pedro Guevara" = "Pedro Guevara"); country agrees (MEX vs MEX/MEX); dob single 1988-01-10; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| PIERGIULIO RUHE | WBA super_welterweight | [Q95628866](https://www.wikidata.org/wiki/Q95628866) Piergiulio Ruhe | - | name exact ("PIERGIULIO RUHE" = "Piergiulio Ruhe"); country agrees (ITA vs DEU/ITA); dob single 1995-07-04; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Reiya Abe | WBC featherweight | [Q60685594](https://www.wikidata.org/wiki/Q60685594) Reiya Abe | - | name exact ("Reiya Abe" = "Reiya Abe"); country agrees (JPN vs JPN); dob single 1993-01-01; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Rex Tso | IBF bantamweight | [Q8937969](https://www.wikidata.org/wiki/Q8937969) Rex Tso | - | name exact ("Rex Tso" = "Rex Tso"); country agrees (CHN vs CHN/HKG); dob single 1987-07-15; era plausible (age 39); division not_on_wikidata; no_death_recorded |
| RUSLAN ABDULLAEV | WBA super_lightweight | [Q118368135](https://www.wikidata.org/wiki/Q118368135) Ruslan Abdullaev | - | name exact ("RUSLAN ABDULLAEV" = "Ruslan Abdullaev"); country agrees (UZB vs UZB); dob single 2002-07-19; era plausible (age 24); division not_on_wikidata; no_death_recorded |

### POSSIBLE_EXISTING_FIGHTER (19)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Michael Angeletti | WBO bantamweight, IBF bantamweight, WBC bantamweight | - | existing_fighter_may_be_same_person |  |
| Muhammadkhuja Yaqubov | WBC super_featherweight | - | existing_fighter_may_be_same_person |  |
| Najee Lopez / NAJEE LOPEZ | IBF light_heavyweight, WBC light_heavyweight, WBO light_heavyweight, WBA light_heavyweight | - | existing_fighter_may_be_same_person |  |
| Omar Cande Trinidad | IBF featherweight, WBO featherweight | - | existing_fighter_may_be_same_person |  |
| Omar Trinidad | WBC featherweight | - | existing_fighter_may_be_same_person |  |
| Oscar Duarte | IBF super_lightweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS oscarduartejurado (POSSIBLE_EXISTING_FIGHTER) |  |
| Oscar Duarte Jurado / OSCAR DUARTE JURADO | WBC super_lightweight, WBO welterweight, WBA super_lightweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS oscarduarte (POSSIBLE_EXISTING_FIGHTER) |  |
| Radivoje Kalajdzic / RADIVOJE KALAJDZIC | WBO light_heavyweight, WBC light_heavyweight, WBA light_heavyweight | - | existing_fighter_may_be_same_person |  |
| Ramon Cardenas / RAMON CARDENAS | IBF super_bantamweight, WBC super_bantamweight, WBO super_bantamweight, WBA super_bantamweight | - | existing_fighter_may_be_same_person |  |
| Rashidi Ellis | WBC super_welterweight, WBO super_welterweight | - | existing_fighter_may_be_same_person |  |
| Raul Curiel / RAUL CURIEL | WBC welterweight, WBO welterweight, IBF welterweight, WBA welterweight | - | existing_fighter_may_be_same_person |  |
| Raymond Ford | WBO super_featherweight, WBC super_featherweight | - | existing_fighter_may_be_same_person |  |
| Raymond Muratalla | WBO super_lightweight, WBC super_lightweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS raymundmuratalla (POSSIBLE_EXISTING_FIGHTER) |  |
| Raymund Muratalla | IBF super_lightweight | - | existing_fighter_may_be_same_person; POSSIBLY SAME PERSON AS raymondmuratalla (POSSIBLE_EXISTING_FIGHTER) |  |
| Ricardo Nunez | WBC lightweight | - | existing_fighter_may_be_same_person |  |
| Richardson Hitchins / RICHARDSON HITCHINS | WBC welterweight, WBO welterweight, IBF welterweight, WBA welterweight | - | existing_fighter_may_be_same_person |  |
| Richard Torrez Jr. | IBF heavyweight | - | existing_fighter_may_be_same_person |  |
| Rohan Polanco | WBC welterweight, WBO welterweight, IBF welterweight | - | existing_fighter_may_be_same_person |  |
| Rolando Romero / ROLANDO ROMERO | WBC welterweight, WBA welterweight | - | existing_fighter_may_be_same_person |  |

### REVIEW_REQUIRED (25)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Mauricio Lara | WBC super_featherweight | [Q107626126](https://www.wikidata.org/wiki/Q107626126) Mauricio Lara | no_wikidata_country_to_corroborate | name exact ("Mauricio Lara" = "Mauricio Lara"); country wikidata_has_no_country (MEX vs -); dob single 1998-02-23; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Meiirim Nursultanov | WBC middleweight | [Q56308772](https://www.wikidata.org/wiki/Q56308772) Meiirim Nursultanov | no_wikidata_country_to_corroborate | name exact ("Meiirim Nursultanov" = "Meiirim Nursultanov"); country wikidata_has_no_country (KAZ/USA vs -); dob single 1993-07-29; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Michael Zerafa / MICHAEL ZERAFA | WBO middleweight, WBA middleweight | [Q39218159](https://www.wikidata.org/wiki/Q39218159) Michael Zerafa | no_wikidata_country_to_corroborate | name exact ("Michael Zerafa" = "Michael Zerafa"); country wikidata_has_no_country (AUS vs -); dob single 1992-03-25; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Milorad Zizic | WBO super_middleweight | [Q15669991](https://www.wikidata.org/wiki/Q15669991) Milorad Žižić | no_printed_country_to_corroborate | name exact ("Milorad Zizic" = "Milorad Žižić"); country not_printed (MNE vs -); dob single 1986-12-01; era plausible (age 39); division not_on_wikidata; no_death_recorded |
| Moses Itauma / MOSES ITAUMA | WBO heavyweight, IBF heavyweight, WBC heavyweight, WBA heavyweight | [Q125162793](https://www.wikidata.org/wiki/Q125162793) Moses Itauma | no_wikidata_country_to_corroborate | name exact ("Moses Itauma" = "Moses Itauma"); country wikidata_has_no_country (GBR vs -); dob single 2004-12-28; era plausible (age 21); division not_on_wikidata; no_death_recorded |
| Moussa Gholam / MOUSSA GHOLAM | IBF super_featherweight, WBC super_featherweight, WBA super_featherweight | [Q96782294](https://www.wikidata.org/wiki/Q96782294) Moussa Gholam | no_wikidata_country_to_corroborate | name exact ("Moussa Gholam" = "Moussa Gholam"); country wikidata_has_no_country (ESP vs -); dob single 1995-06-10; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Nelson Hysa / NELSON HYSA | WBO heavyweight, WBA heavyweight | [Q20029125](https://www.wikidata.org/wiki/Q20029125) Nelson Hysa | no_printed_country_to_corroborate | name exact ("Nelson Hysa" = "Nelson Hysa"); country not_printed (ALB vs -); dob single 1984-09-06; era plausible (age 42); division not_on_wikidata; no_death_recorded |
| Nick Ball / NICK BALL | WBO featherweight, WBA super_featherweight | [Q124805598](https://www.wikidata.org/wiki/Q124805598) Nick Ball | no_wikidata_country_to_corroborate | name exact ("Nick Ball" = "Nick Ball"); country wikidata_has_no_country (GBR vs -); dob single 1997-02-28; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Nikita Zon / NIKITA ZON | IBF super_middleweight, WBA super_middleweight | [Q132799090](https://www.wikidata.org/wiki/Q132799090) Nikita Zon | no_wikidata_country_to_corroborate | name exact ("Nikita Zon" = "Nikita Zon"); country wikidata_has_no_country (RUS vs -); dob single 1993-03-13; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Nikodem Jezewski | WBC bridgerweight | [Q137693597](https://www.wikidata.org/wiki/Q137693597) Nikodem Jeżewski | no_wikidata_country_to_corroborate | name exact ("Nikodem Jezewski" = "Nikodem Jeżewski"); country wikidata_has_no_country (POL vs -); dob single 1991-05-29; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Oliver Zaren | IBF super_middleweight | [Q131400800](https://www.wikidata.org/wiki/Q131400800) Oliver Zaren | no_printed_country_to_corroborate | name exact ("Oliver Zaren" = "Oliver Zaren"); country not_printed (DNK vs -); dob single 1999-11-11; era plausible (age 26); division not_on_wikidata; no_death_recorded |
| OTAR ERANOSYAN | WBA super_featherweight | [Q23061136](https://www.wikidata.org/wiki/Q23061136) Otar Eranosyan | no_printed_country_to_corroborate | name exact ("OTAR ERANOSYAN" = "Otar Eranosyan"); country not_printed (GEO vs -); dob single 1993-08-20; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Paddy Donovan | IBF welterweight, WBO welterweight | - | several_plausible_wikidata_candidates |  |
| Petch Sor Chitpattana | WBC bantamweight | [Q16140170](https://www.wikidata.org/wiki/Q16140170) Petch Sor Chitpattana | no_printed_country_to_corroborate | name exact ("Petch Sor Chitpattana" = "Petch Sor Chitpattana"); country not_printed (Thai vs -); dob single 1993-11-20; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Phumelele Cafu | IBF super_flyweight | [Q130529840](https://www.wikidata.org/wiki/Q130529840) Phumelele Cafu | no_wikidata_country_to_corroborate, dob_conflict_hard_hold | name exact ("Phumelele Cafu" = "Phumelele Cafu"); country wikidata_has_no_country (ZAF vs -); dob conflict; era -; division not_on_wikidata; no_death_recorded |
| Piotr Lacz | WBC bridgerweight | [Q133890527](https://www.wikidata.org/wiki/Q133890527) Piotr Łącz | no_wikidata_country_to_corroborate | name exact ("Piotr Lacz" = "Piotr Łącz"); country wikidata_has_no_country (POL vs -); dob single 1998-02-11; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| REITO TSUTSUMI | WBA featherweight | [Q134008183](https://www.wikidata.org/wiki/Q134008183) Reito Tsutsumi | no_wikidata_country_to_corroborate, no_dob_era_unverifiable | name exact ("REITO TSUTSUMI" = "Reito Tsutsumi"); country wikidata_has_no_country (JPN vs -); dob absent; era -; division not_on_wikidata; no_death_recorded |
| Rene Calixto Bibiano | IBF flyweight | [Q132432320](https://www.wikidata.org/wiki/Q132432320) Rene Calixto Bibiano | no_dob_era_unverifiable | name exact ("Rene Calixto Bibiano" = "Rene Calixto Bibiano"); country agrees (MEX vs MEX); dob absent; era -; division not_on_wikidata; no_death_recorded |
| Reymart Gaballo | IBF bantamweight | [Q50860298](https://www.wikidata.org/wiki/Q50860298) Reymart Gaballo | no_wikidata_country_to_corroborate | name exact ("Reymart Gaballo" = "Reymart Gaballo"); country wikidata_has_no_country (PHL vs -); dob single 1996-08-24; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Richard Riakporhe | WBO heavyweight, IBF heavyweight, WBC heavyweight | [Q79052399](https://www.wikidata.org/wiki/Q79052399) Richard Riakporhe | no_wikidata_country_to_corroborate | name exact ("Richard Riakporhe" = "Richard Riakporhe"); country wikidata_has_no_country (GBR vs -); dob single 1990-01-05; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Rico Verhoeven / RICO VERHOEVEN | WBC heavyweight, WBA heavyweight | [Q7332289](https://www.wikidata.org/wiki/Q7332289) Rico Verhoeven | no_printed_country_to_corroborate | name exact ("Rico Verhoeven" = "Rico Verhoeven"); country not_printed (NED/Netherlands vs -); dob single 1989-04-10; era plausible (age 37); division not_on_wikidata; no_death_recorded |
| Robin Sirwan Safar / ROBIN SIRWAN SAFAR | WBC cruiserweight, WBO cruiserweight, WBA cruiserweight | [Q132830153](https://www.wikidata.org/wiki/Q132830153) Robin Sirwan Safar | no_printed_country_to_corroborate | name exact ("Robin Sirwan Safar" = "Robin Sirwan Safar"); country not_printed (SWE/Sweden vs -); dob single 1992-11-30; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Roman Fress | WBO cruiserweight | [Q139470918](https://www.wikidata.org/wiki/Q139470918) Roman Fress | no_wikidata_country_to_corroborate | name exact ("Roman Fress" = "Roman Fress"); country wikidata_has_no_country (KAZ vs -); dob single 1994-03-20; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| ROMAN GONZALEZ | WBA super_flyweight | [Q2635046](https://www.wikidata.org/wiki/Q2635046) Román González | no_printed_country_to_corroborate | name exact ("ROMAN GONZALEZ" = "Román González"); country not_printed (NCA vs -); dob single 1987-06-17; era plausible (age 39); division not_on_wikidata; no_death_recorded |
| Royston Barney Smith / Royston Barney-Smith | IBF super_featherweight, WBO super_featherweight | [Q125222791](https://www.wikidata.org/wiki/Q125222791) Royston Barney-Smith | no_wikidata_country_to_corroborate | name exact ("Royston Barney Smith" = "Royston Barney-Smith"); country wikidata_has_no_country (GBR vs -); dob single 2004-01-01; era plausible (age 22); division not_on_wikidata; no_death_recorded |

### NO_CANDIDATE (36)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Max Reeves | WBO super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Mehmet Unal / MEHMET UNAL | WBC light_heavyweight, WBA light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Michael Abban / MICHAEL ABBAN | WBO super_flyweight, WBA super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Mikhail Grigoryan | IBF lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Milan Prat | WBC super_welterweight, IBF super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Mirazizbek Mirzkhalilov | IBF super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Mitchell Smith | WBO lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| MITSURO BRANDON TAJIMA | WBA cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Mukhammad Shekhov / MUKHAMMAD SHEKHOV | WBO super_bantamweight, IBF super_bantamweight, WBC super_bantamweight, WBA super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Mykal Fox / MYKAL FOX | WBO super_welterweight, WBA super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ndabezinhle Phiri | WBC flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| NICKY TEJADA | WBA super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Nikita Tszyu | WBO super_welterweight, IBF super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Nkosingiphile Sibisi | IBF flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Noel Mikaeljan | WBC cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| NOEL REYES CEPEDA | WBA super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Olajuwon Acosta / OLAJUWON ACOSTA | WBO super_flyweight, WBA super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Oleksandr Hrytsiv | WBC bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Pablo Ezequiel Corzo | IBF light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Pat Brown / PAT BROWN | IBF cruiserweight, WBA cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Pavel Sosulin / PAVEL SOSULIN | IBF super_welterweight, WBA super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Pete Apolinar | WBO super_featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Peter Milas | IBF heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Regie Suganob / REGIE SUGANOB | WBC light_flyweight, IBF light_flyweight, WBO light_flyweight, WBA light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Reito Takahashi / REITO TAKAHASHI | WBO lightweight, IBF lightweight, WBC lightweight, WBA lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Rene Tellez Giron | WBO lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ricardo Blandon | WBO featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Rodrigo Fabian Ruiz | IBF super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| RODRIGO RAMIREZ | WBA light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ronald Chacon / RONALD CHACON | WBO minimumweight, WBA light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Rubens Diego Dos Santos | WBO bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| RUSLAN MADIYEV | WBA welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Russell Acosta Silveira | WBO minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS russellacostasilveria (NO_CANDIDATE) |  |
| Russell Acosta Silveria | WBC minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS russellacostasilveira (NO_CANDIDATE) |  |
| Ryang Ho Han | IBF super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ryoma Morimoto | IBF flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |

## Slice 06

Rule `p0-identity-seed@1.2.1`. Wikidata establishes a person only, never a record, title, ranking or bout.

EXISTING_LINK 0 | AUTO_SEEDED 33 | POSSIBLE_EXISTING_FIGHTER 15 | REVIEW_REQUIRED 20 | NO_CANDIDATE 32 | Wikidata requests 0

### EXISTING_LINK (0)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|

### AUTO_SEEDED (33)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Ryosuke Nishida | WBC super_bantamweight, IBF super_bantamweight | [Q106994974](https://www.wikidata.org/wiki/Q106994974) Ryosuke Nishida | - | name exact ("Ryosuke Nishida" = "Ryosuke Nishida"); country agrees (JPN vs JPN); dob single 1996-08-07; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Ryota Muto / RYOTA MUTO | WBO featherweight, WBA featherweight | [Q124097360](https://www.wikidata.org/wiki/Q124097360) Ryōta Mutō | - | name exact ("Ryota Muto" = "Ryōta Mutō"); country agrees (JPN vs JPN); dob single 2005-01-14; era plausible (age 21); division not_on_wikidata; no_death_recorded |
| Sam Goodman | IBF super_bantamweight | [Q126006216](https://www.wikidata.org/wiki/Q126006216) Sam Goodman | - | name exact ("Sam Goodman" = "Sam Goodman"); country agrees (AUS vs AUS); dob single 1998-10-10; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Samuel Carmona / SAMUEL CARMONA | WBC flyweight, WBA flyweight | [Q26236121](https://www.wikidata.org/wiki/Q26236121) Samuel Carmona | - | name exact ("Samuel Carmona" = "Samuel Carmona"); country agrees (ESP vs ESP/ESP); dob single 1996-05-28; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Samuel Molina | WBC welterweight | [Q94328586](https://www.wikidata.org/wiki/Q94328586) Samuel Molina | - | name exact ("Samuel Molina" = "Samuel Molina"); country agrees (ESP vs ESP); dob single 1998-11-29; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Sandor Martin | WBC super_lightweight | [Q97488817](https://www.wikidata.org/wiki/Q97488817) Sandor Martin | - | name exact ("Sandor Martin" = "Sandor Martin"); country agrees (ESP vs ESP); dob single 1993-08-22; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| SANZHAR TASHKENBAY | WBA light_flyweight | [Q108380369](https://www.wikidata.org/wiki/Q108380369) Sanzhar Tashkenbay | - | name exact ("SANZHAR TASHKENBAY" = "Sanzhar Tashkenbay"); country agrees (KAZ vs KAZ); dob single 2003-06-01; era plausible (age 23); division not_on_wikidata; no_death_recorded |
| Saul Alvarez / SAUL ALVAREZ | WBC super_middleweight, WBA super_middleweight | [Q2117769](https://www.wikidata.org/wiki/Q2117769) Saúl Álvarez | - | name exact ("Saul Alvarez" = "Saúl Álvarez"); country agrees (MEX vs MEX/MEX); dob single 1990-07-18; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Sean McComb | IBF super_lightweight | [Q20643970](https://www.wikidata.org/wiki/Q20643970) Sean McComb | - | name exact ("Sean McComb" = "Sean McComb"); country agrees (IRL vs IRL); dob single 1992-08-14; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Seigo Yuri Akui / SEIGO YURI AKUI | IBF super_flyweight, WBC super_flyweight, WBO super_flyweight, WBA super_flyweight | [Q64782605](https://www.wikidata.org/wiki/Q64782605) Seigo Yuri Akui | - | name exact ("Seigo Yuri Akui" = "Seigo Yuri Akui"); country agrees (JPN vs JPN); dob single 1995-09-03; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| SEIYA TSUTSUMI | WBA bantamweight | [Q81783513](https://www.wikidata.org/wiki/Q81783513) Seiya Tsutsumi | - | name exact ("SEIYA TSUTSUMI" = "Seiya Tsutsumi"); country agrees (JPN vs JPN); dob single 1995-12-24; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Shabaz Masoud / SHABAZ MASOUD | WBC featherweight, WBO super_bantamweight, IBF featherweight, WBA featherweight | [Q131025574](https://www.wikidata.org/wiki/Q131025574) Shabaz Masoud | - | name exact ("Shabaz Masoud" = "Shabaz Masoud"); country agrees (GBR vs GBR); dob single 1996-03-04; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Sharabutdin Ataev / SHARABUTDIN ATAEV | IBF light_heavyweight, WBA light_heavyweight | [Q97182532](https://www.wikidata.org/wiki/Q97182532) Sharabutdin Ataev | - | name exact ("Sharabutdin Ataev" = "Sharabutdin Ataev"); country agrees (RUS vs RUS/RUS); dob single 1999-06-10; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Shuma Nakazato | IBF lightweight | [Q118696978](https://www.wikidata.org/wiki/Q118696978) Shuma Nakazato | - | name exact ("Shuma Nakazato" = "Shuma Nakazato"); country agrees (JPN vs JPN); dob single 1996-09-24; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Sivenathi Nontshinga | IBF light_flyweight | [Q96066302](https://www.wikidata.org/wiki/Q96066302) Sivenathi Nontshinga | - | name exact ("Sivenathi Nontshinga" = "Sivenathi Nontshinga"); country agrees (ZAF vs ZAF); dob single 1998-12-03; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| SOFIANE OUMIHA | WBA super_featherweight | [Q20030030](https://www.wikidata.org/wiki/Q20030030) Sofiane Oumiha | - | name exact ("SOFIANE OUMIHA" = "Sofiane Oumiha"); country agrees (FRA vs FRA/FRA); dob single 1994-12-23; era plausible (age 31); division not_on_wikidata; no_death_recorded |
| Souleymane Cissokho | WBC welterweight | [Q24940506](https://www.wikidata.org/wiki/Q24940506) Souleymane Cissokho | - | name exact ("Souleymane Cissokho" = "Souleymane Cissokho"); country agrees (FRA vs FRA/FRA); dob single 1991-07-04; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Subriel Matias | WBC super_lightweight, WBO super_lightweight, IBF super_lightweight | [Q64292681](https://www.wikidata.org/wiki/Q64292681) Subriel Matías | - | name exact ("Subriel Matias" = "Subriel Matías"); country agrees (PRI vs USA); dob single 1992-03-31; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| Sultan Zaurbek | WBC super_featherweight, IBF super_featherweight | [Q56426633](https://www.wikidata.org/wiki/Q56426633) Sultan Zaurbek | - | name exact ("Sultan Zaurbek" = "Sultan Zaurbek"); country agrees (KAZ vs KAZ); dob single 1996-04-19; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Taras Shelestyuk | WBO welterweight | [Q1257290](https://www.wikidata.org/wiki/Q1257290) Taras Shelestyuk | - | name exact ("Taras Shelestyuk" = "Taras Shelestyuk"); country agrees (UKR vs UKR/UKR); dob single 1985-11-30; era plausible (age 40); division not_on_wikidata; no_death_recorded |
| Thammanoon Niyomtrong | WBO light_flyweight, WBC light_flyweight | [Q16438856](https://www.wikidata.org/wiki/Q16438856) Thammanoon Niyomtrong | - | name exact ("Thammanoon Niyomtrong" = "Thammanoon Niyomtrong"); country agrees (THA vs THA/THA); dob single 1990-09-20; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| TOMOKI KAMEDA | WBA featherweight | [Q7820147](https://www.wikidata.org/wiki/Q7820147) Tomoki Kameda | - | name exact ("TOMOKI KAMEDA" = "Tomoki Kameda"); country agrees (JPN vs JPN); dob single 1991-07-12; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Tomoya Tsuboi / TOMOYA TSUBOI | WBO super_flyweight, WBC super_flyweight, WBA super_flyweight | [Q104538652](https://www.wikidata.org/wiki/Q104538652) Tomoya Tsuboi | - | name exact ("Tomoya Tsuboi" = "Tomoya Tsuboi"); country agrees (JPN vs JPN/JPN); dob single 1996-03-25; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Toshiki Shimomachi / TOSHIKI SHIMOMACHI | WBC featherweight, WBO featherweight, IBF featherweight, WBA super_bantamweight | [Q64783561](https://www.wikidata.org/wiki/Q64783561) Toshiki Shimomachi | - | name exact ("Toshiki Shimomachi" = "Toshiki Shimomachi"); country agrees (JPN vs JPN); dob single 1996-01-01; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Toshiya Ishii | WBC super_bantamweight | [Q80069551](https://www.wikidata.org/wiki/Q80069551) Toshiya Ishii | - | name exact ("Toshiya Ishii" = "Toshiya Ishii"); country agrees (JPN vs JPN); dob single 2001-01-01; era plausible (age 25); division not_on_wikidata; no_death_recorded |
| Troy Isley | WBC middleweight, WBO middleweight | [Q38258431](https://www.wikidata.org/wiki/Q38258431) Troy Isley | - | name exact ("Troy Isley" = "Troy Isley"); country agrees (USA vs USA/USA); dob single 1998-09-05; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| Tyson Fury / TYSON FURY | WBC heavyweight, WBO heavyweight, IBF heavyweight, WBA heavyweight | [Q1000592](https://www.wikidata.org/wiki/Q1000592) Tyson Fury | - | name exact ("Tyson Fury" = "Tyson Fury"); country agrees (GBR vs GBR/GBR); dob single 1988-08-12; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| Vadim Musaev | IBF welterweight | [Q74791322](https://www.wikidata.org/wiki/Q74791322) Vadim Musaev | - | name exact ("Vadim Musaev" = "Vadim Musaev"); country agrees (RUS vs RUS/RUS); dob single 1993-01-03; era plausible (age 33); division not_on_wikidata; no_death_recorded |
| Vic Saludar / VIC SALUDAR | WBC minimumweight, WBA minimumweight | [Q55584727](https://www.wikidata.org/wiki/Q55584727) Vic Saludar | -; POSSIBLY SAME PERSON AS victoriosaludar (AUTO_SEEDED Q55584727) | name exact ("Vic Saludar" = "Vic Saludar"); country agrees (PHL vs PHL); dob single 1990-11-03; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| Victorio Saludar | WBO minimumweight, IBF minimumweight | [Q55584727](https://www.wikidata.org/wiki/Q55584727) Victorio Saludar | -; POSSIBLY SAME PERSON AS vicsaludar (AUTO_SEEDED Q55584727) | name exact ("Victorio Saludar" = "Victorio Saludar"); country agrees (PHL vs PHL); dob single 1990-11-03; era plausible (age 35); division not_on_wikidata; no_death_recorded |
| WILFREDO MENDEZ | WBA minimumweight | [Q66733667](https://www.wikidata.org/wiki/Q66733667) Wilfredo Mendez | - | name exact ("WILFREDO MENDEZ" = "Wilfredo Mendez"); country agrees (PRI vs USA); dob single 1996-11-10; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Willibaldo Garcia | WBC super_flyweight | [Q132432319](https://www.wikidata.org/wiki/Q132432319) Willibaldo Garcia | -; POSSIBLY SAME PERSON AS willibaldogarciaperez (REVIEW_REQUIRED Q134571042) | name exact ("Willibaldo Garcia" = "Willibaldo Garcia"); country agrees (MEX vs MEX); dob single 1989-12-24; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Yamato Hata / YAMATO HATA | WBC super_featherweight, WBA super_featherweight | [Q84802430](https://www.wikidata.org/wiki/Q84802430) Yamato Hata | - | name exact ("Yamato Hata" = "Yamato Hata"); country agrees (JPN vs JPN); dob single 1997-01-18; era plausible (age 29); division not_on_wikidata; no_death_recorded |

### POSSIBLE_EXISTING_FIGHTER (15)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| SAMUEL ARNOLD | WBA light_heavyweight | - | existing_fighter_may_be_same_person |  |
| SHAKHRAM GIYASOV | WBA welterweight | - | existing_fighter_may_be_same_person |  |
| SHANE MOSLEY JR / Shane Mosley Jr. / Shane Mosley, Jr. | WBA middleweight, WBC middleweight, WBO middleweight | - | existing_fighter_may_be_same_person |  |
| Takeshi Ishii | WBO minimumweight | - | existing_fighter_may_be_same_person |  |
| TAYVIEN ALPOUGH | WBA light_flyweight | - | existing_fighter_may_be_same_person |  |
| Teremoana Teremoana | IBF heavyweight | - | existing_fighter_may_be_same_person |  |
| Tim Tszyu / TIM TSZYU | WBC middleweight, WBO middleweight, IBF middleweight, WBA middleweight | - | existing_fighter_may_be_same_person |  |
| Tsendbaatar Erdenebat | WBC super_featherweight, IBF super_featherweight | - | existing_fighter_may_be_same_person |  |
| Umar Dzambekov / UMAR DZAMBEKOV | WBC light_heavyweight, WBA light_heavyweight | - | existing_fighter_may_be_same_person |  |
| VICTOR SANTILLAN | WBA super_bantamweight | - | existing_fighter_may_be_same_person |  |
| Vito Mielnicki Jr / VITO MIELNICKI JR / Vito Mielnicki Jr. / Vito Mielnicki, Jr. | WBC middleweight, WBA middleweight, IBF middleweight, WBO middleweight | - | existing_fighter_may_be_same_person |  |
| Xander Zayas / XANDER ZAYAS | IBF super_welterweight, WBO super_welterweight, WBC super_welterweight, WBA super_welterweight | - | existing_fighter_may_be_same_person |  |
| Yan Carlos Santana-Guerrero | WBO featherweight, IBF featherweight | - | existing_fighter_may_be_same_person |  |
| YANKIEL RIVERA FIGUEROA | WBA flyweight | - | existing_fighter_may_be_same_person |  |
| Yan Marcos / YAN MARCOS | IBF super_welterweight, WBA super_welterweight | - | existing_fighter_may_be_same_person |  |

### REVIEW_REQUIRED (20)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Ryusei Kawaura | IBF super_flyweight, WBO super_flyweight, WBC super_flyweight | [Q132431947](https://www.wikidata.org/wiki/Q132431947) Ryūsei Kawaura | no_dob_era_unverifiable | name exact ("Ryusei Kawaura" = "Ryūsei Kawaura"); country agrees (JPN vs JPN); dob absent; era -; division compatible; no_death_recorded |
| SAM GILLEY | WBA middleweight | [Q132852911](https://www.wikidata.org/wiki/Q132852911) Sam Gilley | no_wikidata_country_to_corroborate | name exact ("SAM GILLEY" = "Sam Gilley"); country wikidata_has_no_country (GBR vs -); dob single 1994-08-19; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Sam Noakes | WBO lightweight, WBC lightweight, IBF lightweight | [Q125546025](https://www.wikidata.org/wiki/Q125546025) Sam Noakes | no_wikidata_country_to_corroborate | name exact ("Sam Noakes" = "Sam Noakes"); country wikidata_has_no_country (GBR vs -); dob single 1997-01-01; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Samuel Salva | WBO minimumweight | [Q104057724](https://www.wikidata.org/wiki/Q104057724) Samuel Salva | no_wikidata_country_to_corroborate | name exact ("Samuel Salva" = "Samuel Salva"); country wikidata_has_no_country (PHL vs -); dob single 1997-01-01; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Senad Gashi | WBC bridgerweight | [Q23060842](https://www.wikidata.org/wiki/Q23060842) Senad Gashi | country_mismatch_needs_more_evidence | name exact ("Senad Gashi" = "Senad Gashi"); country disagrees (DEU vs XKS); dob single 1990-04-20; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Siro Choi / SIRO CHOI | IBF lightweight, WBC lightweight, WBA lightweight | [Q134993000](https://www.wikidata.org/wiki/Q134993000) Siro Choi | no_wikidata_country_to_corroborate | name exact ("Siro Choi" = "Siro Choi"); country wikidata_has_no_country (KOR/UZB vs -); dob single 2001-03-16; era plausible (age 25); division not_on_wikidata; no_death_recorded |
| Siseko Teyise | IBF light_flyweight | - | possible_source_spelling_of:sisekoteyisi; POSSIBLY SAME PERSON AS sisekoteyisi (REVIEW_REQUIRED) |  |
| Siseko Teyisi / SISEKO TEYISI | WBO light_flyweight, WBC light_flyweight, WBA light_flyweight | - | possible_source_spelling_of:sisekoteyise; POSSIBLY SAME PERSON AS sisekoteyise (REVIEW_REQUIRED) |  |
| Stephen McKenna | WBO middleweight | [Q104839670](https://www.wikidata.org/wiki/Q104839670) Stephen McKenna | no_wikidata_country_to_corroborate | name exact ("Stephen McKenna" = "Stephen McKenna"); country wikidata_has_no_country (IRL vs -); dob single 1997-01-01; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| Thananchai Charunphak | WBC flyweight | [Q130527162](https://www.wikidata.org/wiki/Q130527162) Thananchai Charunphak | no_printed_country_to_corroborate | name exact ("Thananchai Charunphak" = "Thananchai Charunphak"); country not_printed (Thai vs -); dob single 2000-04-16; era plausible (age 26); division not_on_wikidata; no_death_recorded |
| Tobias Jeremias Reyes | WBO flyweight | - | possible_source_spelling_of:tobiasreyes |  |
| Tobias Reyes | WBC flyweight | - | possible_source_spelling_of:tobiasjeremiasreyes |  |
| Umar Salamov / UMAR SALAMOV | IBF cruiserweight, WBO cruiserweight, WBA bridgerweight | [Q20890223](https://www.wikidata.org/wiki/Q20890223) Umar Salamov | dob_conflict_hard_hold | name exact ("Umar Salamov" = "Umar Salamov"); country agrees (KGZ/RUS vs RUS/RUS); dob conflict; era -; division not_on_wikidata; no_death_recorded |
| Vadim Tukov / VADIM TUKOV | IBF middleweight, WBA middleweight | [Q135003825](https://www.wikidata.org/wiki/Q135003825) Vadim Tukov | no_wikidata_country_to_corroborate | name exact ("Vadim Tukov" = "Vadim Tukov"); country wikidata_has_no_country (RUS vs -); dob single 1994-02-10; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| VARTAN ARUTYUNYAN | WBA heavyweight | [Q139545754](https://www.wikidata.org/wiki/Q139545754) Vartan Arutyunyan | no_wikidata_country_to_corroborate | name exact ("VARTAN ARUTYUNYAN" = "Vartan Arutyunyan"); country wikidata_has_no_country (RUS vs -); dob single 1999-12-27; era plausible (age 26); division not_on_wikidata; no_death_recorded |
| Viddal Riley | WBO cruiserweight, WBC cruiserweight, IBF cruiserweight | [Q74596406](https://www.wikidata.org/wiki/Q74596406) Viddal Riley | no_wikidata_country_to_corroborate | name exact ("Viddal Riley" = "Viddal Riley"); country wikidata_has_no_country (GBR vs -); dob single 1997-07-07; era plausible (age 29); division not_on_wikidata; no_death_recorded |
| VSEVOLOD SHUMKOV | WBA featherweight | [Q118329293](https://www.wikidata.org/wiki/Q118329293) Vsevolod Shumkov | no_wikidata_country_to_corroborate | name exact ("VSEVOLOD SHUMKOV" = "Vsevolod Shumkov"); country wikidata_has_no_country (RUS vs -); dob single 2001-10-27; era plausible (age 24); division not_on_wikidata; no_death_recorded |
| Wilkens Mathieu / WILKENS MATHIEU | WBO super_middleweight, WBC super_middleweight, IBF super_middleweight, WBA super_middleweight | [Q134883865](https://www.wikidata.org/wiki/Q134883865) Wilkens Mathieu | no_wikidata_country_to_corroborate | name exact ("Wilkens Mathieu" = "Wilkens Mathieu"); country wikidata_has_no_country (CAN vs -); dob single 2005-01-04; era plausible (age 21); division not_on_wikidata; no_death_recorded |
| Willibaldo Garcia Perez | IBF super_flyweight | [Q134571042](https://www.wikidata.org/wiki/Q134571042) Willibaldo García Pérez | no_wikidata_country_to_corroborate; POSSIBLY SAME PERSON AS willibaldogarcia (AUTO_SEEDED Q132432319) | name exact ("Willibaldo Garcia Perez" = "Willibaldo García Pérez"); country wikidata_has_no_country (MEX vs -); dob single 1989-12-24; era plausible (age 36); division not_on_wikidata; no_death_recorded |
| Willy Hutchinson / WILLY HUTCHINSON | WBC light_heavyweight, WBA light_heavyweight | [Q99454396](https://www.wikidata.org/wiki/Q99454396) Willy Hutchinson | no_wikidata_country_to_corroborate | name exact ("Willy Hutchinson" = "Willy Hutchinson"); country wikidata_has_no_country (GBR vs -); dob single 1998-08-04; era plausible (age 28); division not_on_wikidata; no_death_recorded |

### NO_CANDIDATE (32)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Ryo Mandokoro | IBF flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Ryota Toyoshima | WBO super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Sebastian Hernandez | WBC featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Sebastian Hernandez Reyes | WBO super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Sento Ito | IBF bantamweight, WBO bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Sergio Alfonso Mendoza Cordova | WBO light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Sergio Mendoza | WBC flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS sergiomendozacordova (NO_CANDIDATE) |  |
| SERGIO MENDOZA CORDOVA | WBA flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS sergiomendoza (NO_CANDIDATE) |  |
| Shane Gentallan | IBF light_flyweight, WBC minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Sho Nogami | IBF flyweight, WBO flyweight, WBC flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Sikho Nqothole | WBC super_flyweight, WBO super_flyweight, IBF super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Simon Zhachenhuber | WBO super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| STEVEN CAIRNS | WBA lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Takero Kitano / TAKERO KITANO | WBO minimumweight, IBF minimumweight, WBC minimumweight, WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| TEMUR MAMOYAN | WBA heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Tenshin Nakusawa | WBO bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS tenshinnasukawa (NO_CANDIDATE) |  |
| Tenshin Nasukawa / TENSHIN NASUKAWA | WBC bantamweight, WBA bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name; POSSIBLY SAME PERSON AS tenshinnakusawa (NO_CANDIDATE) |  |
| Terry Washington / TERRY WASHINGTON | WBO light_flyweight, WBC light_flyweight, IBF light_flyweight, WBA light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Theophilous Kpakpo Allotey / THEOPHILOUS KPAKPO ALLOTEY | WBO super_flyweight, WBC super_flyweight, IBF super_flyweight, WBA super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| THOMAS O&#39;TOOLE | WBA super_middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| TYRELL BOYD | WBA middleweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Tyrone Buttigieg | WBO super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| VIC PASILLAS | WBA featherweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Viktor Vykhryst / VIKTOR VYKHRYST | WBO heavyweight, WBA heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| VILDAN MINASOV | WBA lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Willy Gilheaney | WBO welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Willy Kyakonye | WBC bridgerweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Yahir Frank | WBC super_flyweight, WBO super_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Yair Gallardo | WBO light_heavyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Yamil Alberto Peralta | WBC cruiserweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Yaser Al Ghena | WBO super_lightweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Yerny Betancourt / YERNY BETANCOURT | WBC super_bantamweight, WBA super_bantamweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |

## Slice 07

Rule `p0-identity-seed@1.2.1`. Wikidata establishes a person only, never a record, title, ranking or bout.

EXISTING_LINK 0 | AUTO_SEEDED 7 | POSSIBLE_EXISTING_FIGHTER 3 | REVIEW_REQUIRED 6 | NO_CANDIDATE 5 | Wikidata requests 0

### EXISTING_LINK (0)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|

### AUTO_SEEDED (7)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| YOEL FINOL | WBA super_flyweight | [Q26267522](https://www.wikidata.org/wiki/Q26267522) Yoel Finol | - | name exact ("YOEL FINOL" = "Yoel Finol"); country agrees (VEN vs VEN); dob single 1996-09-21; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Yoshiki Takei / YOSHIKI TAKEI | WBO bantamweight, IBF super_bantamweight, WBA bantamweight | [Q52346158](https://www.wikidata.org/wiki/Q52346158) Yoshiki Takei | - | name exact ("Yoshiki Takei" = "Yoshiki Takei"); country agrees (JPN vs JPN); dob single 1996-07-12; era plausible (age 30); division not_on_wikidata; no_death_recorded |
| Yuberjen Martinez | WBO flyweight | [Q26238028](https://www.wikidata.org/wiki/Q26238028) Yuberjén Martínez | -; POSSIBLY SAME PERSON AS yuberjanmartinez (REVIEW_REQUIRED) | name exact ("Yuberjen Martinez" = "Yuberjén Martínez"); country agrees (COL vs COL); dob single 1991-11-01; era plausible (age 34); division not_on_wikidata; no_death_recorded |
| YUKINORI OGUNI | WBA super_bantamweight | [Q11459380](https://www.wikidata.org/wiki/Q11459380) Yukinori Oguni | - | name exact ("YUKINORI OGUNI" = "Yukinori Oguni"); country agrees (JPN vs JPN); dob single 1988-05-19; era plausible (age 38); division not_on_wikidata; no_death_recorded |
| Yuni Takada | WBC minimumweight | [Q118696971](https://www.wikidata.org/wiki/Q118696971) Yuni Takada | - | name exact ("Yuni Takada" = "Yuni Takada"); country agrees (JPN vs JPN); dob single 1998-06-10; era plausible (age 28); division not_on_wikidata; no_death_recorded |
| ZAUR ABDULLAEV | WBA super_lightweight | [Q95985958](https://www.wikidata.org/wiki/Q95985958) Zaur Abdullaev | - | name exact ("ZAUR ABDULLAEV" = "Zaur Abdullaev"); country agrees (RUS vs RUS); dob single 1994-03-23; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Zhanibek Alimkhanuly | WBO super_middleweight | [Q16272092](https://www.wikidata.org/wiki/Q16272092) Zhanibek Alimkhanuly | - | name exact ("Zhanibek Alimkhanuly" = "Zhanibek Alimkhanuly"); country agrees (KAZ vs KAZ); dob single 1993-04-01; era plausible (age 33); division not_on_wikidata; no_death_recorded |

### POSSIBLE_EXISTING_FIGHTER (3)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Yoenis Tellez / YOENIS TELLEZ | WBO super_welterweight, WBA super_welterweight | - | existing_fighter_may_be_same_person |  |
| Yoenli Hernandez | WBC middleweight, IBF middleweight, WBO middleweight | - | existing_fighter_may_be_same_person |  |
| Yuniel Dorticos / YUNIEL DORTICOS | IBF cruiserweight, WBC cruiserweight, WBO cruiserweight, WBA cruiserweight | - | existing_fighter_may_be_same_person |  |

### REVIEW_REQUIRED (6)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| YEVGENIY PAVLOV | WBA super_featherweight | [Q110566494](https://www.wikidata.org/wiki/Q110566494) Yevgeniy Pavlov | no_wikidata_country_to_corroborate | name exact ("YEVGENIY PAVLOV" = "Yevgeniy Pavlov"); country wikidata_has_no_country (KAZ vs -); dob single 1999-01-01; era plausible (age 27); division not_on_wikidata; no_death_recorded |
| Yoali Mejia Mosqueda / YOALI MEJIA MOSQUEDA | WBO flyweight, WBA flyweight | - | possible_source_spelling_of:yoalimosqueda |  |
| Yoali Mosqueda | WBC flyweight | - | possible_source_spelling_of:yoalimejiamosqueda |  |
| Yuberjan Martinez | IBF flyweight | - | possible_source_spelling_of:yuberjenmartinez; POSSIBLY SAME PERSON AS yuberjenmartinez (AUTO_SEEDED Q26238028) |  |
| Zach Parker | WBO light_heavyweight, WBC light_heavyweight | [Q50215793](https://www.wikidata.org/wiki/Q50215793) Zach Parker | no_wikidata_country_to_corroborate | name exact ("Zach Parker" = "Zach Parker"); country wikidata_has_no_country (GBR vs -); dob single 1994-06-06; era plausible (age 32); division not_on_wikidata; no_death_recorded |
| Zak Chelli | WBC light_heavyweight, WBO light_heavyweight | [Q132348641](https://www.wikidata.org/wiki/Q132348641) Zak Chelli | no_wikidata_country_to_corroborate | name exact ("Zak Chelli" = "Zak Chelli"); country wikidata_has_no_country (GBR vs -); dob single 1997-11-26; era plausible (age 28); division not_on_wikidata; no_death_recorded |

### NO_CANDIDATE (5)

| Printed | Bodies | Wikidata | Reasons | Evidence |
|---|---|---|---|---|
| Yoshi Sugiura / YOSHI SUGIURA | WBO minimumweight, IBF minimumweight, WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Yuga Ozaki | IBF light_flyweight, WBO light_flyweight, WBC light_flyweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Yuri Sakunts | WBO super_welterweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Zyvry John Medecillo | IBF minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
| Zyvyr John Medecilo / ZYVYR JOHN MEDECILO | WBC minimumweight, WBO minimumweight, WBA minimumweight | - | no_wikidata_human_boxer_agrees_with_printed_name |  |
