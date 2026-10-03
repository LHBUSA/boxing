# Batch 04: POSSIBLE_EXISTING_FIGHTER review packet (review only; nothing applied)

Each row proposes LINKING a sanctioning-body entry to a fighter PropBetEdge already holds. No merge, no new fighter.
Ranked by: commission bout evidence, verified external ids (none exist yet), verified Wikidata identity, body participation.

Queue: 150 candidate rows for 145 subjects. Tier A 68, tier B 22, tier C 60.

- **Tier A**: one existing candidate, exact name or the printed name inside the commission full name, commission bouts, not only ambiguous entries.
- **Tier B**: first+last or near-spelling only (middle names, relatives such as the Russell brothers, transliterations): a human must look.
- **Tier C**: no commission bout, several candidates, or only ambiguous entries: hold.

## Batch 04 proposal: first 25 tier A rows

`p0-batch-04-prepared.sql` links exactly these rows (non-ambiguous body entries only) with a REVIEWER placeholder; a rolled-back dry run proves its count.

| Printed | Body / division | Existing fighter | Match | Commission bouts | Wikidata | Printed country | Why this tier |
|---|---|---|---|---|---|---|---|
| Najee Lopez / NAJEE LOPEZ | IBF, WBA, WBC, WBO light_heavyweight | Najee Lopez | name_agreement | 6 (last 2026-03-13) | - | PRI/PUR/US/USA | name_agreement |
| Anthony Joshua / ANTHONY JOSHUA | IBF, WBA, WBC, WBO heavyweight | Anthony Joshua | name_agreement | 1 (last 2025-12-19) | - | ENG/GB/GBR | name_agreement |
| Atif Oberlton / ATIF OBERLTON | IBF, WBA, WBC, WBO light_heavyweight | Atif Oberlton | name_agreement | 1 (last 2024-06-08) | - | US/USA | name_agreement |
| Bektemir Melikuziev / BEKTEMIR MELIKUZIEV | IBF, WBA, WBC, WBO super_middleweight | Bektemir Rozmatjon Ogli ’Melikuziev’ Meliqoziyev | contained_in_full_name | 1 (last 2026-02-21) | - | USA/UZB/Uzbekistan | contained_in_full_name |
| Gilberto Ramirez / GILBERTO RAMIREZ | IBF, WBA, WBC, WBO cruiserweight | Gilberto Ramirez Sanchez | contained_in_full_name | 1 (last 2026-05-02) | - | MEX/Mexico | contained_in_full_name |
| Israil Madrimov / ISRAIL MADRIMOV | IBF, WBA, WBC, WBO super_welterweight | Israil Madrimov | name_agreement | 1 (last 2026-01-24) | - | UZB/Uzbekistan | name_agreement |
| Ramon Cardenas / RAMON CARDENAS | IBF, WBA, WBC, WBO super_bantamweight | Ramon Cardenas | name_agreement | 1 (last 2025-12-18) | - | US/USA | name_agreement |
| Raul Curiel / RAUL CURIEL | IBF, WBA, WBC, WBO welterweight | Raul Curiel Garcia | contained_in_full_name | 1 (last 2026-08-01) | - | MEX/Mexico | contained_in_full_name |
| Richardson Hitchins / RICHARDSON HITCHINS | IBF, WBA, WBC, WBO welterweight | Richardson Hitchins | name_agreement | 1 (last 2023-09-23) | - | US/USA | name_agreement |
| Tim Tszyu / TIM TSZYU | IBF, WBA, WBC, WBO middleweight | Tim Tszyu | name_agreement | 1 (last 2024-10-19) | - | AUS/Australia | name_agreement |
| Xander Zayas / XANDER ZAYAS | IBF, WBA, WBC, WBO super_welterweight | Xander Yarob Zayas Castro | contained_in_full_name | 1 (last 2023-12-09) | - | P. Rico/PRI/PUR | contained_in_full_name |
| Yuniel Dorticos / YUNIEL DORTICOS | IBF, WBA, WBC, WBO cruiserweight | Yuniel Dorticos | name_agreement | 1 (last 2026-08-16) | - | CUB/Cuba | name_agreement |
| Ari Bonilla / ARI BONILLA | IBF, WBA, WBC super_flyweight | Ari Bonilla | name_agreement | 2 (last 2026-08-16) | - | Mexico/USA | name_agreement |
| Andres Cortes / ANDRES CORTES | WBA, WBC, WBO lightweight | Andres Cortes | name_agreement | 1 (last 2026-04-05) | - | US/USA | name_agreement |
| Andy Cruz | IBF, WBC, WBO lightweight | Andy Cruz Gomez | contained_in_full_name | 1 (last 2026-01-24) | - | CUB/Cuba | contained_in_full_name |
| Bakhram Murtazaliev | IBF, WBC, WBO super_welterweight | Bakhram Murtazaliev | name_agreement | 1 (last 2024-10-19) | - | RUS/US | name_agreement |
| Callum Walsh | IBF, WBC, WBO middleweight | Callum Walsh | name_agreement | 1 (last 2026-01-23) | - | Ireland/IRL | name_agreement |
| Efe Ajagba / EFE AJAGBA | IBF, WBA, WBC heavyweight | Efe Ajagba | name_agreement | 1 (last 2026-02-15) | - | NGA/NIG/Nigeria/US | name_agreement |
| Emiliano Vargas | IBF, WBC, WBO super_lightweight | Emiliano Vargas | name_agreement | 1 (last 2024-06-29) | - | MEX/US/USA | name_agreement |
| Eridson Garcia / ERIDSON GARCIA | WBA, WBC, WBO lightweight | Eridson Garcia | name_agreement | 1 (last 2026-04-05) | - | DOM/Dom. Republic | name_agreement |
| Ismael Flores / ISMAEL FLORES | WBA, WBC, WBO middleweight, super_welterweight | Ismael Flores | name_agreement | 1 (last 2026-05-02) | - | ARG/Spain/Argentina | name_agreement |
| Jose Armando Resendiz / JOSE ARMANDO RESENDIZ | WBA, WBC, WBO super_middleweight | Jose Armando Resendiz Garcia | contained_in_full_name | 1 (last 2026-05-02) | - | MEX/Mexico | contained_in_full_name |
| Michael Angeletti | IBF, WBC, WBO bantamweight | Michael Angeletti | name_agreement | 1 (last 2024-08-21) | - | US/USA | name_agreement |
| Radivoje Kalajdzic / RADIVOJE KALAJDZIC | WBA, WBC, WBO light_heavyweight | Radivoje Kalajdzic | name_agreement | 1 (last 2026-02-01) | - | Serbia/US/USA | name_agreement |
| Yoenli Hernandez | IBF, WBC, WBO middleweight | Yoenli Feliciano Hernandez Martinez | contained_in_full_name | 1 (last 2026-03-28) | - | CUB/Cuba | contained_in_full_name |

## Remaining tier A (43, next batch)

| Printed | Body / division | Existing fighter | Match | Commission bouts | Wikidata | Printed country | Why this tier |
|---|---|---|---|---|---|---|---|
| Alex Bray / ALEX BRAY | WBA, WBO super_welterweight | Alex Bray | name_agreement | 4 (last 2026-08-28) | - | USA | name_agreement |
| Andrey Bonilla / ANDREY BONILLA | WBA, WBC bantamweight | Andrey Bonilla | name_agreement | 4 (last 2026-08-16) | - | Mexico/USA | name_agreement |
| Corey Marksman / COREY MARKSMAN | WBA, WBO lightweight | Corey Marksman | name_agreement | 3 (last 2026-08-28) | - | USA | name_agreement |
| Alex Vallecillo / ALEX VALLECILLO | WBA, WBO super_bantamweight | Alex Vallecillo | name_agreement | 2 (last 2026-08-15) | - | MEX/NCA | name_agreement |
| Katsuma Akitsugi / KATSUMA AKITSUGI | WBA, WBO bantamweight | Katsuma Akitsugi | name_agreement | 2 (last 2025-11-07) | - | JPN/USA | name_agreement |
| Omar Cande Trinidad | IBF, WBO featherweight | Omar Cande Trinidad | name_agreement | 2 (last 2026-06-28) | - | USA | name_agreement |
| Andy Hiraoka / ANDY HIRAOKA | IBF, WBA super_lightweight | Andy Hiraoka | name_agreement | 1 (last 2026-02-21) | - | JPN | name_agreement |
| Antonio Vargas / ANTONIO VARGAS | WBA, WBC bantamweight | Antonio Vargas | name_agreement | 1 (last 2024-12-13) | - | US/USA | name_agreement |
| Bek Nurmaganbet | IBF, WBC super_middleweight | Bek Nurmaganbet | name_agreement | 1 (last 2025-04-05) | - | KAZ/Kazahkstan | name_agreement |
| Carlos Utria / CARLOS UTRIA | WBA, WBC super_lightweight | Carlos Alfonso Utria Lopez | contained_in_full_name | 1 (last 2026-08-22) | - | COL/Colombia | contained_in_full_name |
| Delante Johnson | IBF, WBO welterweight | Delante Johnson | name_agreement | 1 (last 2025-11-07) | - | USA | name_agreement |
| Emmanuel Rodriguez | IBF, WBO bantamweight | Emmanuel Rodriguez | name_agreement | 1 (last 2026-09-26) | - | PRI | name_agreement |
| Jan Paul Rivera-Pizarro / JAN PAUL RIVERA-PIZARRO | WBA, WBO featherweight, super_featherweight | Jan Paul Rivera-Pizarro | name_agreement | 1 (last 2026-08-08) | - | PRI/PUR | name_agreement |
| Lucas Bahdi / LUCAS BAHDI | IBF, WBA lightweight | Lucas Bahdi | name_agreement | 1 (last 2025-08-23) | - | CAN | name_agreement |
| Luis Reynaldo Nunez / LUIS REYNALDO NUNEZ | IBF, WBA featherweight | Luis Reynaldo Nunez (Luis Reynaldo Nuñez Mosquea) Eduardo Ramirez (Eduardo Antonio Solorza | contained_in_full_name | 1 (last 2024-12-11) | - | DOM | contained_in_full_name |
| Mark Magsayo | IBF, WBO lightweight | Jessel Mark Araula Magsayo | contained_in_full_name | 1 (last 2026-04-05) | - | PHL | contained_in_full_name |
| Raymond Muratalla | WBC, WBO super_lightweight | Raymond Muratalla | name_agreement | 1 (last 2026-01-24) | - | US/USA | name_agreement |
| Rolando Romero / ROLANDO ROMERO | WBA, WBC welterweight | Rolando Florencio Romero Moreno | contained_in_full_name | 1 (last 2026-08-22) | - | US/USA | contained_in_full_name |
| Tsendbaatar Erdenebat | IBF, WBC super_featherweight | Tsendbaatar Erdenebat | name_agreement | 1 (last 2024-10-09) | - | MNG/Mongolia/US | name_agreement |
| Umar Dzambekov / UMAR DZAMBEKOV | WBA, WBC light_heavyweight | Umar Dzambekov | name_agreement | 1 (last 2026-02-15) | - | Austria/AUT | name_agreement |
| Yoenis Tellez / YOENIS TELLEZ | WBA, WBO super_welterweight | Yoenis Tellez Silega | contained_in_full_name | 1 (last 2026-03-28) | - | CUB | contained_in_full_name |
| Francisco Rodriguez Jr. | WBC flyweight | Francisco Rodriguez | name_agreement | 2 (last 2026-08-30) | - | Mexico | name_agreement |
| Gustavo Trujillo | WBO heavyweight | Gustavo Trujillo | name_agreement | 2 (last 2026-06-28) | - | CUB | name_agreement |
| Ali Ellis | WBC bridgerweight | Ali Ellis | name_agreement | 1 (last 2026-07-25) | - | US | name_agreement |
| ANDREAS KATZOURAKIS | WBA middleweight | Andreas Katzourakis | name_agreement | 1 (last 2026-05-10) | - | GRE | name_agreement |
| ANDRES TERAN | WBA bantamweight | Jose Andres Teran Santibanez | contained_in_full_name | 1 (last 2026-06-28) | - | MEX | contained_in_full_name |
| Angelino Cordova | WBC flyweight | Angelino Cordova | name_agreement | 1 (last 2025-08-23) | - | Venezuela | name_agreement |
| ARMANDO MARTINEZ RABI | WBA lightweight | Armando Martinez Rabi | name_agreement | 1 (last 2026-06-28) | - | CUB | name_agreement |
| DAINIER PERO | WBA heavyweight | Dainier Pero | name_agreement | 1 (last 2026-08-08) | - | CUB | name_agreement |
| Daniel Blancas | WBC super_middleweight | Daniel Blancas | name_agreement | 1 (last 2026-05-02) | - | US | name_agreement |
| DEONTE BROWN | WBA super_featherweight | Deonte Brown | name_agreement | 1 (last 2026-05-29) | - | USA | name_agreement |
| EMANUEL MORENO | WBA bantamweight | Emanuel Moreno | name_agreement | 1 (last 2026-04-03) | - | USA | name_agreement |
| GREG OUTLAW | WBA welterweight | Greg Outlaw | name_agreement | 1 (last 2025-01-18) | - | USA | name_agreement |
| GURGEN HOVHANNISYAN | WBA heavyweight | Gurgen Hovhannisyan | name_agreement | 1 (last 2026-03-28) | - | ARM | name_agreement |
| JONATHAN GONZALEZ | WBA flyweight | Jonathan Gonzalez-Ortiz | contained_in_full_name | 1 (last 2024-06-08) | - | PUR | contained_in_full_name |
| Jordan Orozco | WBO bantamweight | Jordan Orozco Hernandez | contained_in_full_name | 1 (last 2026-06-13) | - | NIC | contained_in_full_name |
| JORDAN OROZCO HERNANDEZ | WBA bantamweight | Jordan Orozco Hernandez | name_agreement | 1 (last 2026-06-13) | - | NCA | name_agreement |
| Lamont Roach | WBC lightweight | Lamont Roach Jr. | name_agreement | 1 (last 2026-08-01) | - | US | name_agreement |
| Lyubomyr Pinchuk | WBC bridgerweight | Lyubomyr Pinchuk | name_agreement | 1 (last 2026-02-07) | - | Ukraine | name_agreement |
| Oscar Duarte | IBF super_lightweight | Oscar Duarte Juarado | contained_in_full_name | 1 (last 2026-05-02) | - | MEX | contained_in_full_name |
| SAMUEL ARNOLD | WBA light_heavyweight | Samuel Arnold | name_agreement | 1 (last 2024-06-22) | - | USA | name_agreement |
| TAYVIEN ALPOUGH | WBA light_flyweight | Tayvien Alpough | name_agreement | 1 (last 2024-07-02) | - | USA | name_agreement |
| YANKIEL RIVERA FIGUEROA | WBA flyweight | Yankiel Rivera Figueroa | name_agreement | 1 (last 2025-08-23) | - | PUR | name_agreement |

## Tier B (22)

| Printed | Body / division | Existing fighter | Match | Commission bouts | Wikidata | Printed country | Why this tier |
|---|---|---|---|---|---|---|---|
| Jai Opetaia | IBF cruiserweight | Jai Tapu Opetaia | first_last | 1 (last 2026-03-08) | Q2029085 | AUS | first_last: check middle names / relatives |
| Jose Tito Sanchez / JOSE TITO SANCHEZ | IBF, WBA, WBC super_bantamweight | Jose Tito Juan Sanchez | first_last | 1 (last 2026-05-02) | - | US/USA | first_last: check middle names / relatives |
| Oscar Duarte Jurado / OSCAR DUARTE JURADO | WBA, WBC, WBO super_lightweight, welterweight | Oscar Duarte Juarado | near_spelling | 1 (last 2026-05-02) | - | MEX/Mexico/US | near_spelling: check middle names / relatives |
| Rashidi Ellis | WBC, WBO super_welterweight | Rashida Shakilya Ellis | near_spelling | 2 (last 2026-08-30) | - | US/USA | near_spelling: check middle names / relatives |
| Angel Barrientes / ANGEL BARRIENTES | WBA, WBO super_bantamweight | Angel Lawrence Barrientes | first_last | 1 (last 2026-04-25) | - | USA | first_last: check middle names / relatives |
| Charles Conwell | WBC, WBO super_welterweight | Charles Albert Shone Conwell | first_last | 1 (last 2026-08-01) | - | US/USA | first_last: check middle names / relatives |
| Frank Martin / FRANK MARTIN | WBA, WBO super_lightweight | Frank Lamar Martin | first_last | 1 (last 2026-02-21) | - | USA | first_last: check middle names / relatives |
| GARY ANTONIO RUSSELL | WBA super_bantamweight | Gary Antuanne Russell | first_last | 1 (last 2026-02-21) | - | United States/USA | first_last: check middle names / relatives |
| Jarrell Miller / JARRELL MILLER | IBF, WBA heavyweight | Jarrell King Miller | first_last | 1 (last 2026-04-25) | - | USA | first_last: check middle names / relatives |
| Eric Rosa | IBF light_flyweight | Eric Ross | near_spelling | 2 (last 2026-08-30) | - | DOM | near_spelling: check middle names / relatives |
| Omar Trinidad | WBC featherweight | Omar Cande Trinidad | first_last | 2 (last 2026-06-28) | - | US | first_last: check middle names / relatives |
| Alan Abel Chavez | IBF lightweight | Alan Abel Chaves | near_spelling | 1 (last 2026-04-25) | - | ARG | near_spelling: check middle names / relatives |
| Delante Tiger Johnson | WBC welterweight | Delante Johnson | first_last | 1 (last 2025-11-07) | - | US | first_last: check middle names / relatives |
| Emannuel Rodriguez | WBC bantamweight | Emmanuel Rodriguez | near_spelling | 1 (last 2026-09-26) | - | Puerto Rico | near_spelling: check middle names / relatives |
| GARY ALLEN RUSSELL JR | WBA lightweight | Gary Antuanne Russell | first_last | 1 (last 2026-02-21) | - | USA | first_last: check middle names / relatives |
| Gary Russell | WBC super_featherweight | Gary Antuanne Russell | first_last | 1 (last 2026-02-21) | - | US | first_last: check middle names / relatives |
| Ilunga Makabu | WBC cruiserweight | Ilunga Junior Makabu | first_last | 1 (last 2023-11-04) | - | Congo | first_last: check middle names / relatives |
| JONATHAN CABRERA SANCHEZ | WBA featherweight | Jonathan Sanchez | first_last | 1 (last 2025-07-11) | - | DOM | first_last: check middle names / relatives |
| KAIPO GALLEGOS | WBA super_featherweight | Kaipo Ethan Gallegos | first_last | 1 (last 2026-01-24) | - | USA | first_last: check middle names / relatives |
| Mario Barrios | WBC super_welterweight | Mario Thomas Barrios | first_last | 1 (last 2026-02-21) | - | US | first_last: check middle names / relatives |
| Raymund Muratalla | IBF super_lightweight | Raymond Muratalla | near_spelling | 1 (last 2026-01-24) | - | USA | near_spelling: check middle names / relatives |
| Teremoana Teremoana | IBF heavyweight | Teremooana Teremoana | near_spelling | 1 (last 2026-03-21) | - | AUS | near_spelling: check middle names / relatives |

## Tier C (60)

| Printed | Body / division | Existing fighter | Match | Commission bouts | Wikidata | Printed country | Why this tier |
|---|---|---|---|---|---|---|---|
| Amari Jones | IBF, WBC middleweight | Amari Dashaun Walter Jones | first_last | 1 (last 2026-02-21) | - | US/USA | several existing candidates |
| Amari Jones | IBF, WBC middleweight | Omari Lamon Jones | near_spelling | 1 (last 2026-01-24) | - | US/USA | several existing candidates |
| JOSE VALENZUELA | WBA lightweight | Jose A Valenzuela Gastelum | contained_in_full_name | 2 (last 2026-06-28) | - | USA | several existing candidates |
| Alan Abel Chaves | WBO lightweight | Alan Abel Chaves | name_agreement | 1 (last 2026-04-25) | - | ARG | every body entry is an ambiguous cluster |
| ISRAEL MERCADO ( * ) | WBA super_lightweight | Israel De Jesus Mercado Hernandez | contained_in_full_name | 1 (last 2026-08-22) | - | USA | several existing candidates |
| JOSE VALENZUELA | WBA lightweight | Jose Valenzuela Alvarado | contained_in_full_name | 1 (last 2026-05-16) | - | USA | several existing candidates |
| JULIAN RODRIGUEZ | WBA welterweight | Julian Nicholas Rodriguez Mullen | contained_in_full_name | 1 (last 2026-01-23) | - | USA | several existing candidates |
| JULIAN RODRIGUEZ | WBA welterweight | Juan Rodriguez | near_spelling | 1 (last 2026-02-06) | - | USA | several existing candidates |
| Dmitrii Bivol / DMITRII BIVOL | IBF, WBO light_heavyweight | Dmitry Bivol | near_spelling | 0 (last -) | Q18236558 | KGZ/RUS | no commission bout on the existing fighter |
| Josh Kelly | IBF super_welterweight | Josh Kelly | name_agreement | 0 (last -) | Q20751996 | ENG | no commission bout on the existing fighter |
| Takeshi Ishii | WBO minimumweight | Takeshi Ishii | name_agreement | 0 (last -) | Q116936233 | JPN | no commission bout on the existing fighter |
| VERGIL ORTIZ Jr. | WBC super_welterweight | Vergil Ortiz Jr. | name_agreement | 0 (last -) | Q66391755 | US | no commission bout on the existing fighter |
| Diego Pacheco / DIEGO PACHECO | IBF, WBA, WBC, WBO super_middleweight | Diego Pacheco | name_agreement | 0 (last 2026-11-14) | - | US/USA | no commission bout on the existing fighter |
| Vito Mielnicki Jr / VITO MIELNICKI JR / Vito Mielnicki Jr. / Vito Mielnicki, Jr. | IBF, WBA, WBC, WBO middleweight | Vito Mielnicki, Jr. | name_agreement | 0 (last -) | - | US/USA | no commission bout on the existing fighter |
| Abass Baraou / ABASS BARAOU | WBA, WBC, WBO super_welterweight | Abass Baraou | name_agreement | 0 (last -) | - | DEU/GER/Germany | no commission bout on the existing fighter |
| Ben Whittaker | IBF, WBC, WBO light_heavyweight | Ben Whittaker | name_agreement | 0 (last 2026-10-03) | - | GB/GBR | no commission bout on the existing fighter |
| Frank Sanchez | IBF, WBC, WBO heavyweight | Frankie Sanchez | near_spelling | 0 (last -) | - | CUB/Cuba | no commission bout on the existing fighter |
| Jahi Tucker | IBF, WBC, WBO middleweight | Jahi Tucker | name_agreement | 0 (last -) | - | US/USA | no commission bout on the existing fighter |
| Rohan Polanco | IBF, WBC, WBO welterweight | Rohan Polanco | name_agreement | 0 (last -) | - | DOM/Dom. R. | no commission bout on the existing fighter |
| SHANE MOSLEY JR / Shane Mosley Jr. / Shane Mosley, Jr. | WBA, WBC, WBO middleweight | Shane Donte Mosley Jr. | first_last | 0 (last -) | - | US/USA | no commission bout on the existing fighter |
| Anthony Johns | IBF, WBO flyweight | Anthony Johns | name_agreement | 0 (last -) | - | USA | no commission bout on the existing fighter |
| Carlos Adames / CARLOS ADAMES | WBC middleweight | Carlos Adames | name_agreement | 0 (last -) | - | DOM. R. | no commission bout on the existing fighter |
| Conor Wallace | IBF, WBC light_heavyweight | Conor Wallace | name_agreement | 0 (last 2026-10-03) | - | AUS/N.Ireland/Australia | no commission bout on the existing fighter |
| Fiodor Czerkaszyn | WBC, WBO middleweight | Fiodor Czerkaszyn | name_agreement | 0 (last -) | - | POL/Poland/Ukraine | no commission bout on the existing fighter |
| Israel Gonzalez | WBC, WBO super_flyweight | Misael Lopez Gonzalez | near_spelling | 0 (last -) | - | MEX/Mexico | no commission bout on the existing fighter |
| Justin Pauldo | WBC, WBO lightweight | Justin Rommell Pauldo | first_last | 0 (last -) | - | US/USA | no commission bout on the existing fighter |
| Raymond Ford | WBC, WBO super_featherweight | Raymond Ford | name_agreement | 0 (last -) | - | US/USA | no commission bout on the existing fighter |
| Yan Carlos Santana-Guerrero | IBF, WBO featherweight | Yan Santana Guerrero | first_last | 0 (last -) | - | DOM | no commission bout on the existing fighter |
| Yan Marcos / YAN MARCOS | IBF, WBA super_welterweight | Yan Marcos | name_agreement | 0 (last -) | - | CUB/USA | several existing candidates |
| Yan Marcos / YAN MARCOS | IBF, WBA super_welterweight | Jean Sanchez (Yan Marcos) | contained_in_full_name | 0 (last -) | - | CUB/USA | several existing candidates |
| Alberto Puello | WBC super_lightweight | Alberto Puello | name_agreement | 0 (last 2026-10-24) | - | Dom. R. | no commission bout on the existing fighter |
| Andy Dominguez | WBC flyweight | Andy Dominguez | name_agreement | 0 (last -) | - | US | no commission bout on the existing fighter |
| Angelo Leo | IBF featherweight | Angelo Leo | name_agreement | 0 (last -) | - | USA | no commission bout on the existing fighter |
| ARTURO CARDENAS | WBA super_bantamweight | Arturo Popoca (AKA Arturo Cardenas) | first_last | 0 (last -) | - | MEX | no commission bout on the existing fighter |
| Arturo Cardenas Popoca | WBC super_bantamweight | Arturo Popoca (AKA Arturo Cardenas) | contained_in_full_name | 0 (last -) | - | Mexico | no commission bout on the existing fighter |
| Billal Fawaz | IBF super_welterweight | Bilal Fawaz | near_spelling | 0 (last 2026-10-03) | - | GBR | no commission bout on the existing fighter |
| Carlos Fromenta | WBC bridgerweight | Carlos Fromenta Romero | contained_in_full_name | 0 (last -) | - | Cuba | no commission bout on the existing fighter |
| CARLOS FROMENTA ROMERO | WBA bridgerweight | Carlos Fromenta Romero | name_agreement | 0 (last -) | - | CUB | no commission bout on the existing fighter |
| Connor Wallace | WBO light_heavyweight | Conor Wallace | near_spelling | 0 (last 2026-10-03) | - | AUS | no commission bout on the existing fighter |
| Conor Benn | WBC welterweight | Conor Benn | name_agreement | 0 (last -) | - | GB | no commission bout on the existing fighter |
| DARIUS FULGHUM | WBA super_middleweight | Darius Fulghum | name_agreement | 0 (last 2026-11-14) | - | USA | no commission bout on the existing fighter |
| Dominique Crowder | IBF bantamweight | Dominique Crowder | name_agreement | 0 (last -) | - | USA | no commission bout on the existing fighter |
| Ermal Hadribeaj | WBC super_welterweight | Ermal Hadribeaj | name_agreement | 0 (last -) | - | Albania/US | no commission bout on the existing fighter |
| Euri Cedeno | WBO middleweight | Euri Cedeno | name_agreement | 0 (last -) | - | DOM | no commission bout on the existing fighter |
| Francisco Veron | WBC super_welterweight | Francisco Daniel Vernon | near_spelling | 0 (last -) | - | Argentina | no commission bout on the existing fighter |
| Guido Vianello | IBF heavyweight | Guido Vianello | name_agreement | 0 (last -) | - | ITA | no commission bout on the existing fighter |
| HAMZA UDDIN | WBA flyweight | Hamza Uddin | name_agreement | 0 (last 2026-10-03) | - | GBR | no commission bout on the existing fighter |
| Hebert Conceicao Sousa | WBO super_middleweight | Hebert Conceicao Sousa | name_agreement | 0 (last -) | - | BRA | no commission bout on the existing fighter |
| ISRAEL MERCADO ( * ) | WBA super_lightweight | Iseael Mercado | near_spelling | 0 (last -) | - | USA | several existing candidates |
| JEAN CARLOS VARGAS | WBA flyweight | Jean Guerra Vargas | first_last | 0 (last -) | - | VEN | no commission bout on the existing fighter |
| JOEL IRIARTE | WBA welterweight | Joel Cuauhtemoc Iriarte | first_last | 0 (last -) | - | USA | no commission bout on the existing fighter |
| Jordy Cardona Adames | WBO bantamweight | Jordy Cardona Adames | name_agreement | 0 (last -) | - | PRI | no commission bout on the existing fighter |
| Jorge Ascanio Martinez | WBO super_bantamweight | Jorge Armando Martinez | first_last | 0 (last -) | - | MEX | no commission bout on the existing fighter |
| Joshua Pagan | WBO lightweight | Joshua Pagan | name_agreement | 0 (last -) | - | USA | no commission bout on the existing fighter |
| KEVIN HAYLER BROWN | WBA super_lightweight | Kevin Hayler Brown | name_agreement | 0 (last -) | - | CUB | no commission bout on the existing fighter |
| Muhammadkhuja Yaqubov | WBC super_featherweight | Muhammadkhuja Yaqubov | name_agreement | 0 (last -) | - | Tajikistan | no commission bout on the existing fighter |
| Ricardo Nunez | WBC lightweight | Ricardo Perez Nunez | first_last | 0 (last -) | - | Panama | no commission bout on the existing fighter |
| Richard Torrez Jr. | IBF heavyweight | Richard Torrez Jr. | name_agreement | 0 (last -) | - | USA | no commission bout on the existing fighter |
| SHAKHRAM GIYASOV | WBA welterweight | Shakhram Giyasov | name_agreement | 0 (last -) | - | UZB | no commission bout on the existing fighter |
| VICTOR SANTILLAN | WBA super_bantamweight | Victor Daniel Santillan Perez | contained_in_full_name | 0 (last -) | - | DOM | no commission bout on the existing fighter |
