# Boxing official video channels - owner review audit

Checked 2026-09-13. Input: `D:\Workers\boxing\scripts\videos\channels.json` (21 channels, none enabled). Read-only public GETs only: one RSS fetch per channel, oEmbed on the 2 newest RSS videos, channel page HTML, official site pages and terms pages. No API keys, sign-ups or contact.

## Counts

| Recommendation | Channels |
|---|---|
| approve_for_embed_metadata | 9 |
| permission_required | 5 |
| reference_only | 6 |
| unresolved | 1 |
| block | 0 |

## Cross-cutting finding: RSS polling vs robots.txt

Every feed returned 15 entries on a single manual fetch. But:

- `https://www.youtube.com/robots.txt` has `User-agent: *` with `Disallow: /feeds/videos.xml`.
- The YouTube Terms of Service restrict accessing the Service "using any automated means (such as robots, botnets or scrapers) except (a) in the case of public search engines, in accordance with YouTube's robots.txt file; or (b) with YouTube's prior written permission".

So a scheduled RSS poller is not clearly sanctioned, even for approved channels. `/oembed` is not disallowed. The documented automated route is the YouTube Data API under the API Services Terms. It has a free quota but needs a Google Cloud project and API key, so the owner must approve it. This audit makes no legal conclusion; it flags the conflict for an owner decision before any ingestion job is enabled.

## Table

<div style="overflow-x:auto">

| # | Channel | Channel ID | Org type / class | Site links channel | Badge | RSS latest | oEmbed | Recommendation | Reason |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Matchroom Boxing (@MatchroomBoxing) | `UC7LReVje9aPB4B6XAsXX8WQ` | promoter / promoter_official | yes | yes | 2026-09-12 (15) | 200/200 | **approve_for_embed_metadata** | Site-linked channel ID, verified badge, feed returns entries, newest uploads embeddable; no org clause against YouTube-player embedding found. |
| 2 | Top Rank Boxing (@toprank) | `UCbzRzJNHx7ZLlJML9BjZQVQ` | promoter / promoter_official | yes | yes | 2026-09-12 (15) | 200/200 | **permission_required** | Identity, feed and embeds pass, but Top Rank is blocked by the recorded promoter source policy and its terms broadly bar third-party redistribution without written consent; needs owner/permission decision. |
| 3 | Golden Boy Boxing (Golden Boy Promotions) (@GoldenBoyBoxing) | `UC518BHmSjZ2R1UanxO9nHmg` | promoter / promoter_official | yes | yes | 2026-09-13 (15) | 200/200 | **permission_required** | Identity, feed and embeds pass, but Golden Boy is disabled by the recorded promoter source review and its disclaimer requires written permission for any use of its materials; owner decision needed. |
| 4 | Premier Boxing Champions (@PremierBoxingChampions) | `UCWXYAGB9SadlL6p5Bb66wWw` | promoter / promoter_official | yes | yes | 2026-09-13 (15) | 200/200 | **approve_for_embed_metadata** | Site-linked channel ID, verified badge, feed returns entries, uploads embeddable; website-content terms do not address YouTube-player embeds. |
| 5 | Queensberry Promotions (Frank Warren's Queensberry Promotions) (@QueensberryPromotions) | `UCP3MOjimNiqqkhBcuXzO0RA` | promoter / promoter_official | yes | no | 2026-09-11 (15) | 200/200 | **permission_required** | Exact-ID site link, feed and embeds pass, but Queensberry is blocked by the recorded promoter source policy (anti-scrape terms); needs owner/permission decision. No verified badge. |
| 6 | BOXXER (@BOXXERofficial) | `UC-DvM-fdpkuy7Cupga3LOOQ` | promoter / promoter_official | yes | yes | 2026-09-02 (15) | 200/200 | **permission_required** | Exact-ID site link, verified badge, feed and embeds pass, but BOXXER is blocked by the recorded promoter source policy (anti-scrape terms); needs owner/permission decision. |
| 7 | Most Valuable Promotions (MVP) (@Most_Valuable_Promotions) | `UCGJlZUB-7b5s1wFynzpYU7Q` | promoter / promoter_official | yes | no | 2026-09-11 (15) | 200/200 | **reference_only** | Identity corroborated and embeds work, but the site signals use=reference, terms were unreadable, and the recorded policy is reference-only. |
| 8 | Salita Promotions (@SalitaPromotions) | `UCgKoiUinex5G_p7s8kTrU1Q` | promoter / promoter_official | yes | no | 2026-09-13 (15) | 200/200 | **approve_for_embed_metadata** | Site-linked channel, feed returns entries, uploads embeddable; website-only terms. No verified badge - identity rests on the site link. |
| 9 | Ring Magazine (@ringmagazine) | `UC8ybHJltwhtpk0cFKU4G8kQ` | broadcaster / broadcaster_official | yes | yes | 2026-09-13 (15) | 200/200 | **approve_for_embed_metadata** | Site-linked channel ID, verified badge, feed active, uploads embeddable; Ring terms target its own Services, not YouTube embeds. |
| 10 | Riyadh Season (@RiyadhSeason) | `UC2IV4srmjG3d3FAEE88n4_A` | promoter / promoter_official | no | yes | 2026-06-14 (15) | 200/200 | **reference_only** | No site corroboration (badge only), mostly non-boxing uploads, stale since June; recorded promoter policy disables it. |
| 11 | DAZN Boxing (@DAZNBoxing) | `UCurvRE5fGcdUgCYWgh-BDsg` | broadcaster / broadcaster_official | yes | yes | 2026-09-13 (15) | 200/200 | **approve_for_embed_metadata** | Verified badge plus official dazn.com page pointing to this channel's video, feed active, uploads embeddable. |
| 12 | Sky Sports Boxing (@SkySportsBoxing) | `UC_JQGBtA7P0RwkRxd7xpJcA` | broadcaster / broadcaster_official | yes | yes | 2026-09-13 (15) | 200/200 | **approve_for_embed_metadata** | Verified badge plus official skysports.com page embedding this channel's video, feed active, uploads embeddable. |
| 13 | TNT Fight Sports (formerly TNT Sports Boxing) (@TNTFightSports) | `UC-hWvVvE-crFl5vg5G8QbqA` | broadcaster / broadcaster_official | no | yes | 2026-09-13 (15) | 200/200 | **reference_only** | Not linked from the official site (site links @TNTSports instead), badge-only identity, and current uploads are UFC not boxing. |
| 14 | FOX Sports (@FOXSports) | `UCwNqHDsnBCKT-olwJwIFyfg` | broadcaster / broadcaster_official | yes | yes | 2026-09-13 (15) | 200/200 | **reference_only** | Identity and embeds pass, but the channel carries no boxing and Fox terms reserve embedding control; no value for a boxing desk. |
| 15 | World Boxing Council (WBC) (@WBCBoxingvid) | `UCOogiDvTQ8G7Zb5AOim9Olw` | sanctioning body / sanctioning_body_official | yes | no | 2026-09-13 (15) | 200/200 | **approve_for_embed_metadata** | Site-linked (and ID in page source) official channel, feed active, uploads embeddable; no org restriction found. No verified badge. |
| 16 | World Boxing Association (WBA) (@WorldBoxingAssociationOfficial) | `UCFLh18_umMvBkz9YCLo4vkA` | sanctioning body / sanctioning_body_official | yes | no | 2026-09-13 (15) | 200/200 | **approve_for_embed_metadata** | Linked from an official WBA news post, feed active, uploads embeddable; no org restriction found. Corroboration is a news post, not the homepage; no badge. |
| 17 | World Boxing Organization (WBO) (@WorldBoxingOrg) | `UCj9SVchp1P7nXAOcaWGMCiA` | sanctioning body / sanctioning_body_official | yes | no | 2026-08-04 (15) | 200/200 | **approve_for_embed_metadata** | Site-linked official channel, feed returns entries, uploads embeddable; low cadence and institutional content. No badge. |
| 18 | New Jersey OAG (parent of NJ State Athletic Control Board) (@NewJerseyOAG) | `UC1yoLnmPP-tQElJsL1kYL0g` | commission / commission_official | yes | no | 2026-08-26 (15) | 200/200 | **reference_only** | Genuine government channel but it is the Attorney General office, and uploads are not boxing. |
| 19 | Florida DBPR (parent of Florida State Boxing/Athletic Commission) (@FloridaDBPR) | `UCoUph3knwfclNRB2yxEDIRQ` | commission / commission_official | yes | no | 2026-08-27 (15) | 200/200 | **reference_only** | Genuine parent-agency channel, but uploads are not boxing. |
| 20 | Zuffa Boxing (@zuffaboxing) | `UCDncyGaGt5KumYowsnYUXKg` | promoter / promoter_official | no | no | 2026-09-13 (15) | 200/200 | **unresolved** | Content fits and embeds work, but no official site link and no verified badge; ownership not proven. |
| 21 | ProBox TV (@ProBoxTV) | `UCT7Mm-aRWBZ1Zd2bIXIEsyg` | broadcaster / broadcaster_official | yes | yes | 2026-09-13 (15) | 200/200 | **permission_required** | Identity, feed and embeds pass, but ProBox terms bar linking/framing its Content without written consent and fights are moving behind YouTube Membership; get permission first. |

</div>

## Per-channel notes

### Matchroom Boxing - approve_for_embed_metadata

- **ID / handle:** `UC7LReVje9aPB4B6XAsXX8WQ` / @MatchroomBoxing. Feed title: "Matchroom Boxing".
- **Organization:** Matchroom Boxing (Matchroom Sport) (promoter). Source class: promoter_official.
- **Site corroboration:** https://www.matchroomboxing.com/ - Homepage links https://www.youtube.com/user/MatchroomBoxing, which resolves (externalId/canonical) to UC7LReVje9aPB4B6XAsXX8WQ.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** full fight, weigh-in, post-fight press conference, post-fight interview, highlights, promo, interview, documentary/feature
- **Recent titles:**
  - 2026-09-12 Ryan Garcia vs Rolando Romero | Full Fight | Matchroom Boxing (G9gYHQQVHo4)
  - 2026-09-06 Taylor Vs Pili Post-Fight Press Conference With Eddie Hearn | Matchroom Boxing (jgWoXIFNfp4)
  - 2026-09-04 Katie Taylor Vs Flora Pili Weigh In | Matchroom Boxing (l7ZHXIYtcGs)
  - 2026-09-09 Pat Brown vs John Hedges: Countdown to Clash of Unbeatens | Matchroom Boxing (HCPDURNoXkA)
  - 2026-09-05 Katie Taylor Vs Flora Pili Prelims | 5 Live Fights | Matchroom Boxing (0EGEGxufaJA)
- **oEmbed:** G9gYHQQVHo4 200 (https://www.youtube.com/@MatchroomBoxing); _69vmG7eL_E 200 (https://www.youtube.com/@MatchroomBoxing)
- **Terms:** Site terms found (https://www.matchroomboxing.com/terms-conditions) are ticket/event T&Cs: s3.6 "Nothing in this clause shall entitle any person to use, display, alter, copy or otherwise deal in any manner whatsoever with Matchroom's or the Organiser's intellectual property rights." No website clause on embedding, framing or scraping found. Live events are DAZN-exclusive; YouTube carries replays/highlights/press. A separate website-data permission request is drafted (not sent) - it does not cover or block YouTube-player embedding.
- **Reason:** Site-linked channel ID, verified badge, feed returns entries, newest uploads embeddable; no org clause against YouTube-player embedding found.

### Top Rank Boxing - permission_required

- **ID / handle:** `UCbzRzJNHx7ZLlJML9BjZQVQ` / @toprank. Feed title: "Top Rank Boxing".
- **Organization:** Top Rank, Inc. (promoter). Source class: promoter_official.
- **Site corroboration:** https://toprank.com/ - Homepage links youtube.com/@toprank, youtube.com/toprank and youtube.com/trboxing; all resolve to this ID. Homepage also links a fighter channel (@keyshawndavis1773) - not this channel.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** documentary/feature, highlights, press conference, announcement, trailer, interview, knockout
- **Recent titles:**
  - 2026-09-12 The ENTIRE O'Shaquie Foster vs Robson Conceicao Rivalry In One Video (N3qqF94St8Y)
  - 2026-09-02 Emanuel Navarrete vs O'Shaquie Foster | ANNOUNCEMENT PRESS CONFERENCE (ZCoH8_Ghbgw)
  - 2026-09-02 Emanuel Navarrete vs O'Shaquie Foster | EVENT TEASE (WKxu1IYV1Z8)
  - 2026-09-08 Wladimir Klitschko's Three Knockdown Slugfest (MRHTfVJmkvw)
  - 2026-09-09 Abass Baraou Wants to Prove He Belongs Among The Best (g1DgneN7z0E)
- **oEmbed:** N3qqF94St8Y 200 (https://www.youtube.com/@toprank); VFmpr17pR-M 200 (https://www.youtube.com/@toprank)
- **Terms:** https://toprank.com/terms-of-use: "you will not monitor, gather, copy, or distribute the Content ... by using any robot, rover, 'bot', spider, scraper, crawler ..."; "you will not frame or utilize framing techniques to enclose any such Content"; "(vi) you will not copy, modify, reproduce ... distribute, broadcast, retransmit ... on any third-party application or website ... except as specifically permitted by these Terms ... or with the prior written consent of an officer". These terms govern the toprank.com Site Content, not YouTube-hosted uploads, but the owner's 2026-09-13 promoter source review already set Top Rank to blocked.
- **Reason:** Identity, feed and embeds pass, but Top Rank is blocked by the recorded promoter source policy and its terms broadly bar third-party redistribution without written consent; needs owner/permission decision.

### Golden Boy Boxing (Golden Boy Promotions) - permission_required

- **ID / handle:** `UC518BHmSjZ2R1UanxO9nHmg` / @GoldenBoyBoxing. Feed title: "Golden Boy Boxing".
- **Organization:** Golden Boy Promotions LLC (promoter). Source class: promoter_official.
- **Site corroboration:** https://www.goldenboy.com/ - Homepage links https://www.youtube.com/user/goldenboypromo, which resolves to this ID.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** full fight, highlights, knockout, interview, promo, other
- **Recent titles:**
  - 2026-09-12 Full Fight | José Ramirez vs. Rances Barthelemy | Power. Pressure. Experience. (37mRwAzJXuQ)
  - 2026-09-04 Full Fight | Oscar De La Hoya vs. Félix “Tito” Trinidad | 🥊 THE FIGHT OF THE MILLENNIUM 🥊 (TPYlXk5UfR0)
  - 2026-09-10 Quick Jabs | Alexis Rocha vs. Jojo Diaz Jr. | 🔥 SO CAL SHOWDOWN! 🔥 (tAmdjJk9yTg)
  - 2026-09-11 Oscar Collazo is ready for the big fights and ready to make history! 🇵🇷 (H1kW2rAGw-c)
  - 2026-09-02 Floyd Schofield made 𝒆𝒂𝒔𝒚 𝒘𝒐𝒓𝒌, scoring a first-round stoppage over Ricardo Lopez Torres! 💪 (xW7pgsuGvRc)
- **oEmbed:** r0zsy6Ds0uY 200 (https://www.youtube.com/@GoldenBoyBoxing); j2om1CDIY-A 200 (https://www.youtube.com/@GoldenBoyBoxing)
- **Terms:** https://www.goldenboy.com/disclaimer/: "All intellectual property rights to content on this website are vested in Golden Boy Promotions LLC or in third parties"; "Copying, disseminating and any other use of these materials is not permitted without the written permission of Golden Boy Promotions LLC". No terms-of-use link found on the homepage (the referenced terms return 404 per the earlier review). Disclaimer governs website materials; it says nothing about YouTube embedding.
- **Reason:** Identity, feed and embeds pass, but Golden Boy is disabled by the recorded promoter source review and its disclaimer requires written permission for any use of its materials; owner decision needed.

### Premier Boxing Champions - approve_for_embed_metadata

- **ID / handle:** `UCWXYAGB9SadlL6p5Bb66wWw` / @PremierBoxingChampions. Feed title: "Premier Boxing Champions".
- **Organization:** Premier Boxing Champions (Haymon Boxing) (promoter). Source class: promoter_official.
- **Site corroboration:** https://www.premierboxingchampions.com/ - Site links youtube.com/c/premierboxingchampions, which resolves to this ID.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** weigh-in, press conference, highlights, knockout, preview, interview, promo
- **Recent titles:**
  - 2026-09-11 Pitbull vs Bravo WEIGH-IN LIVESTREAM (MRQm-3-wwGc)
  - 2026-09-11 Pitbull vs Bravo FINAL PRESS CONFERENCE LIVESTREAM (DY1Oq_MdQqs)
  - 2026-09-13 Face-First on the Canvas. That's Pitbull's Power (wl9wcTdJsWw)
  - 2026-09-08 Pitbull vs Bravo: A Classic Mexico vs. Puerto Rico Showdown in the Making (7s0Q4aUXzaU)
  - 2026-09-10 Jesus Ramos Explains How He Had to DIG DEEP to Defeat Mosley Jr. (ifEYtZRCu9c)
- **oEmbed:** wl9wcTdJsWw 200 (https://www.youtube.com/@PremierBoxingChampions); G6-u1XgmuIA 200 (https://www.youtube.com/@PremierBoxingChampions)
- **Terms:** https://www.premierboxingchampions.com/terms-of-use: "You may review, download, and/or print one copy of the Content of this Website, but you may not ... frame or otherwise display any of the Content of this Website on your own or any other website"; "Haymon maintains social media pages on various websites (including ... YouTube)". Clauses govern Website Content; no statement restricting YouTube-player embedding found. Live events are on Prime Video. A website-data permission request is drafted (not sent).
- **Reason:** Site-linked channel ID, verified badge, feed returns entries, uploads embeddable; website-content terms do not address YouTube-player embeds.

### Queensberry Promotions (Frank Warren's Queensberry Promotions) - permission_required

- **ID / handle:** `UCP3MOjimNiqqkhBcuXzO0RA` / @QueensberryPromotions. Feed title: "Frank Warren's Queensberry Promotions".
- **Organization:** Queensberry Promotions Limited (Frank Warren) (promoter). Source class: promoter_official.
- **Site corroboration:** https://queensberry.co.uk/ - Homepage links https://www.youtube.com/channel/UCP3MOjimNiqqkhBcuXzO0RA (exact ID).
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** full fight, press conference, faceoff, interview, highlights, promo
- **Recent titles:**
  - 2026-09-09 A WAR 🔥 Joshua Buatsi vs Willy Hutchinson 1 FULL FIGHT (7lvxjbfY_3c)
  - 2026-09-08 LIVE Launch Press Conference | Joshua Buatsi vs Willy Hutchinson 2 | A Point 2 Prove 🥊 (FPO9ytORdYM)
  - 2026-09-10 The Face Off: Buatsi vs Hutchinson 2 (nBZdrgZO2EQ)
  - 2026-09-11 Joshua Buatsi relives his win over Willy Hutchinson at Wembley Stadium 🏟️⚔️ (GktSW06fiDc)
  - 2026-09-08 The last time Daniel Dubois walked into the ring to face Fabio Wardley 🤩 (I4Cntyvn_BM)
- **oEmbed:** GktSW06fiDc 200 (https://www.youtube.com/@QueensberryPromotions); _5upfr_hOmM 200 (https://www.youtube.com/@QueensberryPromotions)
- **Terms:** https://queensberry.co.uk/policies/terms-of-service (store/site ToS): "You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service ... without express written permission by us"; prohibited uses include "to spam, phish, pharm, pretext, spider, crawl, or scrape". Governs the website Service; owner's promoter source review set Queensberry to blocked.
- **Reason:** Exact-ID site link, feed and embeds pass, but Queensberry is blocked by the recorded promoter source policy (anti-scrape terms); needs owner/permission decision. No verified badge.

### BOXXER - permission_required

- **ID / handle:** `UC-DvM-fdpkuy7Cupga3LOOQ` / @BOXXERofficial. Feed title: "BOXXER".
- **Organization:** BOXXER (promoter). Source class: promoter_official.
- **Site corroboration:** https://www.boxxer.com/ - Homepage links https://www.youtube.com/channel/UC-DvM-fdpkuy7Cupga3LOOQ (exact ID).
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** full fight, documentary/feature, knockout, highlights, weigh-in, promo
- **Recent titles:**
  - 2026-09-02 Frazer Clarke v David Allen | OTD - September 2nd 2023 (JXHptR9gAu4)
  - 2026-08-14 REVENGE! Williamson v Simpson 2 - The After Movie | Inside BOXXER 🩸 (oM8HHC2W1H8)
  - 2026-08-08 WHAT A KO 🤯 #WilliamsonSimpson2 | DAZN | Aug 8 | First Direct Bank Arena, Leeds (wUeQm4djen8)
  - 2026-08-07 FIRST PRO WEIGH IN ✅ PRO DEBUT ⏳ #WilliamsonSimpson2 | DAZN | Aug 8 | First Direct Bank Arena, Leeds (F5mk85yfpiM)
  - 2026-08-08 AZIM STOPS MARTIN 🤩 #WilliamsonSimpson2 | DAZN | Today | First Direct Bank Arena, Leeds (CDsoqQ_vuBU)
- **oEmbed:** JXHptR9gAu4 200 (https://www.youtube.com/@boxxerofficial); cWEyZuvAguI 200 (https://www.youtube.com/@boxxerofficial)
- **Terms:** https://www.boxxer.com/terms-conditions/: "You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service ... without express written permission by us"; prohibited: "to spam, phish, pharm, pretext, spider, crawl, or scrape". Governs the website Service; owner's promoter source review set BOXXER to blocked. Low cadence (newest 2026-09-02).
- **Reason:** Exact-ID site link, verified badge, feed and embeds pass, but BOXXER is blocked by the recorded promoter source policy (anti-scrape terms); needs owner/permission decision.

### Most Valuable Promotions (MVP) - reference_only

- **ID / handle:** `UCGJlZUB-7b5s1wFynzpYU7Q` / @Most_Valuable_Promotions. Feed title: "MVP - Most Valuable Promotions".
- **Organization:** Most Valuable Promotions (MVP) (promoter). Source class: promoter_official.
- **Site corroboration:** https://www.mostvaluablepromotions.com/ - Homepage links https://www.youtube.com/@Most_Valuable_Promotions, which resolves to this ID. Decoys @MostValuablePromotions and @mvppromotions are different channels.
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** announcement, post-fight press conference, faceoff, documentary/feature, highlights, other
- **Recent titles:**
  - 2026-08-30 POST FIGHT PRESS CONFERENCE | MVPW06 UK VS USA (iWhi-bf19dQ)
  - 2026-08-30 ELIF TURHAN AND ALYCIA BAUMGARDNER FACEOFF 🔥 (ADN23a2KXYU)
  - 2026-08-31 MVP UNCUT: Mikaela Mayer vs Chantelle Cameron | Episode 3 (UtoRBRfRMsM)
  - 2026-09-11 JAKE PAUL AND LOGAN PAUL ANNOUNCE THEIR NEW SHOW 😳 (Sq0xTjQwca0)
  - 2026-09-10 MVPW07 | TURHAN VS BAUMGARDNER TICKETS ON SALE NOW 👀🔥 (fK-Od5M0F-o)
- **oEmbed:** NRupTEQOGv0 200 (https://www.youtube.com/@Most_Valuable_Promotions); Sq0xTjQwca0 200 (https://www.youtube.com/@Most_Valuable_Promotions)
- **Terms:** Earlier source review recorded MVP robots.txt "Content-Signal: search=yes,ai-train=no,use=reference" and a terms page that returned 403 (WebFetch returned 403 again today). No embed-specific clause could be read. Owner registry: reference_only. Content is personality/vlog heavy (Jake Paul).
- **Reason:** Identity corroborated and embeds work, but the site signals use=reference, terms were unreadable, and the recorded policy is reference-only.

### Salita Promotions - approve_for_embed_metadata

- **ID / handle:** `UCgKoiUinex5G_p7s8kTrU1Q` / @SalitaPromotions. Feed title: "Salita Promotions".
- **Organization:** Salita Promotions (promoter). Source class: promoter_official.
- **Site corroboration:** https://www.salitapromotions.com/ - Homepage links https://www.youtube.com/@SalitaPromotions, which resolves to this ID.
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** full fight, faceoff, interview, press conference, other
- **Recent titles:**
  - 2026-09-13 BRANDON MOORE VS BRYANT JENNINGS FULL FIGHT (k4vivw2yqV4)
  - 2026-09-13 SARDIUS SIMMONS VS DETRAILOUS WEBSTER FULL FIGH (X7FNVB24bVE)
  - 2026-08-30 Moore vs Jennings 1st Face Off (wsJ7CDXOOxE)
  - 2026-08-29 Jonny Mansour Press conference Interview (HmfqpXo5TJ4)
  - 2026-08-29 Juju Bhallo Pre-Fight Interview: Expect Fireworks in Detroit! (zMVYO04kW-g)
- **oEmbed:** X7FNVB24bVE 200 (https://www.youtube.com/@SalitaPromotions); k4vivw2yqV4 200 (https://www.youtube.com/@SalitaPromotions)
- **Terms:** https://www.salitapromotions.com/legal/terms-conditions: "You agree not to: copy, reproduce, or distribute Website content without written permission"; "use automated software, bots, crawlers, or scraping tools to collect Website content"; "no content from this Website may be copied, reproduced, republished ... displayed, or exploited for commercial purposes without the prior written consent of Salita Promotions or the applicable rights holder." These govern Website content; no clause on YouTube-player embedding. Several uploads are untitled-style bout videos (e.g. "JOE RUDY VS MARK LEWIS") that are probably full fights but not labelled.
- **Reason:** Site-linked channel, feed returns entries, uploads embeddable; website-only terms. No verified badge - identity rests on the site link.

### Ring Magazine - approve_for_embed_metadata

- **ID / handle:** `UC8ybHJltwhtpk0cFKU4G8kQ` / @ringmagazine. Feed title: "Ring Magazine".
- **Organization:** The Ring (Ring Magazine) (broadcaster). Source class: broadcaster_official (registered as promoter_official).
- **Site corroboration:** https://www.ringmagazine.com/ - Site links https://youtube.com/@ringmagazine, which resolves to this ID. Registered source_class is promoter_official; Ring is a media brand tied to Riyadh Season events, so broadcaster/media is the closer organization type.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** highlights, knockout, post-fight interview, analysis, interview, other
- **Recent titles:**
  - 2026-09-13 SPITEFUL FINISH! Ryan Garcia KNOCKS OUT Conor Benn | FIGHT HIGHLIGHTS (X-TvuYsbDA0)
  - 2026-09-13 KING RY REIGNS SUPREME! Ryan Garcia vs Conor Benn | FIGHT REVIEW (IzcNZMlN70I)
  - 2026-09-13 "HE CAN'T F**K WITH ME!" 😤Ryan Garcia's instant reaction after dispatching Conor Benn 💪 (3XRx4k9YWQk)
  - 2026-09-13 WAR! Jai Opetaia vs Noel Mikaelian | FIGHT HIGHLIGHTS (DuA_I1OPWSI)
  - 2026-09-13 Brian Norman Jr CALLS on Ryan Garcia Fight, Reacts to Benn KO & SOUNDS OFF On Richardson Hitchins  (3tfHDQhmkE0)
- **oEmbed:** VjAoVnY4c60 200 (https://www.youtube.com/@RingMagazine); p8MsEXPWlpE 200 (https://www.youtube.com/@RingMagazine)
- **Terms:** https://www.ringmagazine.com/terms: "You must not reproduce, distribute or exploit substantial parts of the Services or content for commercial purposes without our written consent."; "You must not use bots/scrapers/crawlers to extract content except as permitted by public search engines in accordance with robots.txt or explicit permission."; "(a) copy, download, capture, scrape, bulk-extract, republish or redistribute archive or magazine content". Govern Ring's own Services; no statement about YouTube-player embeds.
- **Reason:** Site-linked channel ID, verified badge, feed active, uploads embeddable; Ring terms target its own Services, not YouTube embeds.

### Riyadh Season - reference_only

- **ID / handle:** `UC2IV4srmjG3d3FAEE88n4_A` / @RiyadhSeason. Feed title: "موسم الرياض | Riyadh Season".
- **Organization:** Riyadh Season (Saudi General Entertainment Authority event season) (promoter). Source class: promoter_official.
- **Site corroboration:** https://riyadhseason.com/ - riyadhseason.com and /en/explore return a ~2.5KB script shell with no YouTube link in static HTML; could not re-verify a site link. Identity rests on the verified badge only.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** full fight, other
- **Recent titles:**
  - 2026-06-14 البث المباشر للمواجهة بين أنتوني جوشوا وكريستيان برينغا | Live stream of the  Joshua vs.  Prenga (o49vWT0mM4k)
  - 2026-06-01 البث المباشر للمواجهة بين أنتوني جوشوا وكريستيان برينغا | Live stream of the  Joshua vs.  Prenga (k5CDjREQl4w)
  - 2026-01-20 البث المباشر: بطولة ماسترز السعودية للسهام | Live Stream: The Saudi Darts Masters (7jcgjMS9sCM)
  - 2026-01-17 البث المباشر لحفل ⁧#جوي_أووردز 2026 ⁩| Watch the Live Stream of Joy Awards 2026 😎❤️ (NAOK7ey0TlY)
  - 2026-01-15 تعرف وش جديد بوليفارد سيتي؟ فلوق ياخذك في رحلة ممتعة حول المنطقة 😎❤️ (aVZr21sVgEY)
- **oEmbed:** o49vWT0mM4k 200 (https://www.youtube.com/@RiyadhSeason); k5CDjREQl4w 200 (https://www.youtube.com/@RiyadhSeason)
- **Terms:** Terms page is script-rendered and unreadable (earlier review and today). Channel is general entertainment (concerts, darts, lifestyle); boxing appears only as occasional event live streams. Newest upload 2026-06-14.
- **Reason:** No site corroboration (badge only), mostly non-boxing uploads, stale since June; recorded promoter policy disables it.

### DAZN Boxing - approve_for_embed_metadata

- **ID / handle:** `UCurvRE5fGcdUgCYWgh-BDsg` / @DAZNBoxing. Feed title: "DAZN Boxing".
- **Organization:** DAZN Group (broadcaster). Source class: broadcaster_official.
- **Site corroboration:** https://www.dazn.com/en-GB/news/boxing/usyk-vs-verhoeven-fight-card-prelim-fights-watch-free-on-dazn/fewjbmdsse781jrx0bdq1coj4 - Video-level corroboration: the dazn.com article says "Watch them for free on DAZN here, or on the DAZN YouTube channel below." and links watch?v=e0MGk4MtHg0, whose oEmbed author_url is https://www.youtube.com/@DAZNBoxing (= this ID). Confirmed via WebFetch; a plain static fetch returns an SPA shell. The page links a video from the channel, not the channel URL itself.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** highlights, knockout, post-fight interview, analysis, grand arrivals, other
- **Recent titles:**
  - 2026-09-13 Ryan Garcia vs. Conor Benn | FIGHT HIGHLIGHTS (KGDH_rHeYZg)
  - 2026-09-13 FULL CARD HIGHLIGHTS | Ryan Garcia vs. Conor Benn (Epc16TQdNL4)
  - 2026-09-13 "EXPOSED!" Tony Bellew & DAZN panel REACT to Conor Benn's defeat by Ryan Garcia | Beyond The Bell (AvG4qJ4CZ6s)
  - 2026-09-13 Ryan Garcia REACTS to knocking out Conor Benn and wants all the SMOKE next! (LsJSPEUUgwE)
  - 2026-09-13 Ryan Garcia makes his ring walk against Conor Benn in Las Vegas! (GKM374H3bN0)
- **oEmbed:** _NkCeRKoaUE 200 (https://www.youtube.com/@DAZNBoxing); THNsw8MaEFE 200 (https://www.youtube.com/@DAZNBoxing)
- **Terms:** DAZN service terms (per search snippet of dazngroup.com/help pages, not read verbatim) prohibit embedding the DAZN Service into other sites and copying/republishing material on DAZN without consent; these concern the DAZN service, not its public YouTube uploads. A person should read the live DAZN T&Cs before relying on this. Main events are subscription/PPV; YouTube carries free prelims, highlights and reaction clips.
- **Reason:** Verified badge plus official dazn.com page pointing to this channel's video, feed active, uploads embeddable.

### Sky Sports Boxing - approve_for_embed_metadata

- **ID / handle:** `UC_JQGBtA7P0RwkRxd7xpJcA` / @SkySportsBoxing. Feed title: "Sky Sports Boxing".
- **Organization:** Sky Sports (Sky UK) (broadcaster). Source class: broadcaster_official.
- **Site corroboration:** https://www.skysports.com/boxing/news/12040/13188821/free-stream-watch-the-zak-chelli-vs-callum-simpson-and-caroline-dubois-vs-maira-moneo-public-workouts - Video-level corroboration: the skysports.com FREE STREAM article embeds youtube.com/embed/lM5nXXNq290, whose oEmbed author_url is https://www.youtube.com/@skysportsboxing (= this ID). skysports.com footer links only the parent @SkySports channel.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** interview, analysis, documentary/feature, open workout, other
- **Recent titles:**
  - 2026-09-03 Fabio Wardley explains why he lost to Daniel Dubois ahead of their upcoming rematch! 👀 (9G0P3GaKkCo)
  - 2026-09-08 Will Conor Benn shock Ryan Garcia? 'Trailblazer' Katie Taylor | Toe2Toe podcast (e-ONqHMBJTY)
  - 2026-09-01 "He's lost his aura" | What went wrong for Moses Itauma against Filip Hrgović? (7a2MrJfj55I)
  - 2026-09-02 Frank Warren reacts to Moses Itauma stoppage loss, gives update on Fury vs AJ (f1P93jd5NVI)
  - 2026-09-10 George Groves and James DeGale’s HEATED argument! 🤬 | Ringside Rewind (9LJTTC5-nrI)
- **oEmbed:** ZfmfEfsGG_Q 200 (https://www.youtube.com/@skysportsboxing); 9LJTTC5-nrI 200 (https://www.youtube.com/@skysportsboxing)
- **Terms:** Sky terms page (https://www.sky.com/help/articles/skycom-terms-and-conditions) is script-rendered; no readable clause. Sky is a UK/IE rights holder - some uploads may be geo-limited (not checkable without API).
- **Reason:** Verified badge plus official skysports.com page embedding this channel's video, feed active, uploads embeddable.

### TNT Fight Sports (formerly TNT Sports Boxing) - reference_only

- **ID / handle:** `UC-hWvVvE-crFl5vg5G8QbqA` / @TNTFightSports. Feed title: "TNT Fight Sports".
- **Organization:** TNT Sports UK & Ireland (Warner Bros. Discovery / BT JV) (broadcaster). Source class: broadcaster_official.
- **Site corroboration:** https://www.tntsports.co.uk/ - tntsports.co.uk homepage links only https://youtube.com/@TNTSports (a different channel); /boxing/ and the boxing how-to-watch article have no YouTube link (curl gets 403; Node fetch and WebFetch read the pages). Identity rests on the verified badge and channel description.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** highlights, knockout, other
- **Recent titles:**
  - 2026-09-13 BLOODY BRAWL! 🩸 | Tommy McMillen vs. Marwan Rahiki | #UFCNoche Fight Highlights (mhe1gOojCZk)
  - 2026-09-03 TOP 10 UFC KNOCKOUTS FROM AUGUST 2026 💥 (cUYEwbcq1VI)
  - 2026-09-05 UNANIMOUS DECISION VICTORY 👏 | Michael Page vs Nursulton Ruziboev | #UFCParis Fight Highlights (0biiBYI8r9U)
  - 2026-08-29 STUNNING KNOCKOUT! 🔥 | Umar Nurmagomedov vs Song Yadong | #UFCShanghai Highlights (2joMs7riMzY)
  - 2026-08-17 Ian Machado Garry lost but looked as ELITE as it gets 🙏 #UFC330 #UFC #MMA (9VpcTmRIrSE)
- **oEmbed:** mhe1gOojCZk 200 (https://www.youtube.com/@TNTFightSports); hEieTo1STX8 200 (https://www.youtube.com/@TNTFightSports)
- **Terms:** No readable TNT Sports terms clause about embeds located. All 15 newest uploads are UFC/MMA, none boxing.
- **Reason:** Not linked from the official site (site links @TNTSports instead), badge-only identity, and current uploads are UFC not boxing.

### FOX Sports - reference_only

- **ID / handle:** `UCwNqHDsnBCKT-olwJwIFyfg` / @FOXSports. Feed title: "FOX Sports".
- **Organization:** FOX Sports (Fox Corporation) (broadcaster). Source class: broadcaster_official.
- **Site corroboration:** https://www.foxsports.com/ - Homepage links https://www.youtube.com/foxsports, which resolves to this ID.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** highlights, other
- **Recent titles:**
  - 2026-09-13 Ronald Acuña Jr. comes through for the Braves 💪 #acuna #braves #homerun #mlb (d_u47gQl1F8)
  - 2026-09-12 CFB Weekend RECAP 🏈 FOX College Football (Lf1rr8yQyew)
  - 2026-09-09 ELLY DE LA CRUZ THREW OUT TEOSCAR WITH A 105.3 MPH LASER 🤯 🔥 #MLB (IT9Kq_do5t0)
  - 2026-09-11 A special moment as the Yankees honor the victims of 9/11 ❤️ (q4OV9JUKrAo)
  - 2026-09-09 What a rookie season for Kazuma Okamoto! 👏 #MLB #ROOKIE (Mt0XMXJd5vQ)
- **oEmbed:** d_u47gQl1F8 200 (https://www.youtube.com/@foxsports); NH9X2ROs3es 200 (https://www.youtube.com/@foxsports)
- **Terms:** https://www.foxsports.com/terms-of-use: "you may not copy, download, stream, scrape, capture, reproduce ... frame, deep-link, make available or otherwise use any Content contained in or accessible through the Fox Services"; "Fox reserves the right to prevent embedding on any website or other location that Fox finds inappropriate or objectionable ... or for any other reason." (Fox Video Player). No boxing in the 15 newest uploads (MLB/CFB).
- **Reason:** Identity and embeds pass, but the channel carries no boxing and Fox terms reserve embedding control; no value for a boxing desk.

### World Boxing Council (WBC) - approve_for_embed_metadata

- **ID / handle:** `UCOogiDvTQ8G7Zb5AOim9Olw` / @WBCBoxingvid. Feed title: "World Boxing Council".
- **Organization:** World Boxing Council (WBC) (sanctioning body). Source class: sanctioning_body_official.
- **Site corroboration:** https://www.wbcboxing.com/ - Homepage links https://www.youtube.com/user/WBCBoxingvid (resolves to this ID) and the page source contains the channel ID itself. Channel description: "Official YouTube account of the World Boxing Council (WBC)".
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** highlights, knockout, documentary/feature, announcement, other
- **Recent titles:**
  - 2026-09-13 Floyd Mayweather Jr. and Marcos Maidana produced a fascinating clash of styles! 👑 (j8EBfLdr4TE)
  - 2026-09-12 Tollan Topiltzin, the WBC Belt that will be awarded to the winner of Ryan Garcia vs Conor Benn. 🏆 (dTL6RgZd9jM)
  - 2026-09-11 KO Friday! Juan Manuel Márquez delivered such iconic knockout when he stopped Manny Pacquiao! 🇲🇽 (yB2z96bHjXk)
  - 2026-09-12 Joséjas, embajador del WBC hablando sobre el cinturón conmemorativo Tollan Topiltzin! 👹🔰 (VtsTpato7Bc)
  - 2026-09-11 Gennady Golovkin defended his WBC middleweight title against Kell Brook, on September 10, 2016. 🔰 (UbQmkGPmSnY)
- **oEmbed:** j8EBfLdr4TE 200 (https://www.youtube.com/@WBCBoxingvid); rQzuNBViPl4 200 (https://www.youtube.com/@WBCBoxingvid)
- **Terms:** No terms-of-use link found on wbcboxing.com (only a privacy notice, https://wbcboxing.com/en/aviso-de-privacidad/). Uploads are on-this-day historical fight clips that include third-party broadcast footage; embedding via YouTube leaves rights handling with the uploader.
- **Reason:** Site-linked (and ID in page source) official channel, feed active, uploads embeddable; no org restriction found. No verified badge.

### World Boxing Association (WBA) - approve_for_embed_metadata

- **ID / handle:** `UCFLh18_umMvBkz9YCLo4vkA` / @WorldBoxingAssociationOfficial. Feed title: "World Boxing Association".
- **Organization:** World Boxing Association (WBA) (sanctioning body). Source class: sanctioning_body_official.
- **Site corroboration:** https://www.wbaboxing.com/boxing-news/canelito-and-carbajal-set-to-headline-wba-future - Official wbaboxing.com news post links https://www.youtube.com/@WorldBoxingAssociationOfficial (resolves to this ID). The WBA homepage and /boxing-news index have no YouTube link. Four look-alike WBA channels are decoys.
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** full fight, replay, other
- **Recent titles:**
  - 2026-09-13 WBA Future of Venezuelan Boxing September 12th,  2026 #16 - Boxeo AMB presented by RIYADH SEASON (BELV6HIyF-Q)
  - 2026-09-06 WBA Future Champions Venezuela Boxing  September 5th,  2026 - Boxeo AMB presented by RIYADH SEASON (9-X0_Mj8oJg)
  - 2026-08-30 FUTURE CHAMPIONS PANAMA (rovJ6K4uVcQ)
  - 2026-05-23 WBA Future Champions Andorra | 2026 WBA (xtKWm3TFeVA)
  - 2026-08-02 FUTURE CHAMPIONS URUGUAY (frJKJs3EK_s)
- **oEmbed:** BELV6HIyF-Q 200 (https://www.youtube.com/@WorldBoxingAssociationOfficial); 9-X0_Mj8oJg 200 (https://www.youtube.com/@WorldBoxingAssociationOfficial)
- **Terms:** https://www.wbaboxing.com/important-legal-information is an accuracy disclaimer ("provided for informational purposes only") with a copyright notice; no clause on embedding or content use found (a referenced "Usage of Content" page was not located). Uploads are full-length WBA Future Champions live-stream cards (prospect/amateur-level).
- **Reason:** Linked from an official WBA news post, feed active, uploads embeddable; no org restriction found. Corroboration is a news post, not the homepage; no badge.

### World Boxing Organization (WBO) - approve_for_embed_metadata

- **ID / handle:** `UCj9SVchp1P7nXAOcaWGMCiA` / @WorldBoxingOrg. Feed title: "World Boxing Organization".
- **Organization:** World Boxing Organization (WBO) (sanctioning body). Source class: sanctioning_body_official.
- **Site corroboration:** https://wboboxing.com/ - Homepage links https://www.youtube.com/@WorldBoxingOrg, which resolves to this ID. Description: "Welcome to the official YouTube of the World Boxing Organization (WBO)".
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** documentary/feature, announcement, other
- **Recent titles:**
  - 2026-08-04 WBO/IBF Unified Convention 2026 (VQyyVK5Lwa8)
  - 2026-07-30 WBO Welterweight Mandatory Championship Purse Bid (Jaj2cSLkEd8)
  - 2026-04-28 WBO Honors Greatness: Navarrete & Olascuaga Receive Elite Legacy Ring (YnMOS6vrzuo)
  - 2026-03-29 René Santiago: Road to Japan 🇯🇵 | #beltsmatter  (Mgf9x9ORvbU)
  - 2025-10-31 38th ANNUAL CONVENTION - DAY 3 (mXROKexuLQs)
- **oEmbed:** VQyyVK5Lwa8 200 (https://www.youtube.com/@WorldBoxingOrg); Jaj2cSLkEd8 200 (https://www.youtube.com/@WorldBoxingOrg)
- **Terms:** No terms link found on wboboxing.com homepage. Institutional content (conventions, purse bids, ceremonies); low cadence (newest 2026-08-04).
- **Reason:** Site-linked official channel, feed returns entries, uploads embeddable; low cadence and institutional content. No badge.

### New Jersey OAG (parent of NJ State Athletic Control Board) - reference_only

- **ID / handle:** `UC1yoLnmPP-tQElJsL1kYL0g` / @NewJerseyOAG. Feed title: "New Jersey OAG".
- **Organization:** New Jersey Office of the Attorney General (parent of NJ State Athletic Control Board) (commission). Source class: commission_official.
- **Site corroboration:** https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/ - Official SACB page links https://www.youtube.com/NewJerseyOAG/ (resolves to this ID) and embeds WhIKn4ImMrs (oEmbed author @NewJerseyOAG). Channel belongs to the AG office, not the SACB.
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** press conference, announcement, other
- **Recent titles:**
  - 2026-08-26 Attorney General Davenport Announces Historic Settlement with Meta (SEe0QOwqO6g)
  - 2026-08-05 AG Davenport to Hold Press Conference to Announce an Antitrust Complaint Against Major Tech Company (neu1h98Esps)
  - 2026-08-07 New Jersey Family Leave Act (NJFLA) (fvyJtz_jCxw)
  - 2026-07-21 Post-World Cup Security Overview with State and Federal Partners (ZJHRYWzWRBc)
  - 2026-07-07 The Office of the Attorney General Celebrates 250 Years (vSBGNqvmw6E)
- **oEmbed:** SEe0QOwqO6g 200 (https://www.youtube.com/@NewJerseyOAG); fvyJtz_jCxw 200 (https://www.youtube.com/@NewJerseyOAG)
- **Terms:** https://www.njoag.gov/resources/legal-notices/ had no embed/scrape clause matched. None of the 15 newest uploads relate to boxing (AG announcements, legal campaigns).
- **Reason:** Genuine government channel but it is the Attorney General office, and uploads are not boxing.

### Florida DBPR (parent of Florida State Boxing/Athletic Commission) - reference_only

- **ID / handle:** `UCoUph3knwfclNRB2yxEDIRQ` / @FloridaDBPR. Feed title: "Florida DBPR".
- **Organization:** Florida Department of Business and Professional Regulation (parent of Florida State Boxing Commission) (commission). Source class: commission_official.
- **Site corroboration:** https://www2.myfloridalicense.com/athletic-commission/ - Florida Athletic Commission page links https://www.youtube.com/user/FloridaDBPR/ (resolves to this ID). Channel belongs to the parent department.
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** other
- **Recent titles:**
  - 2026-08-27 Florida DBPR Broadcast H264_8.27.26 (2Mi2PozQ-0c)
  - 2026-08-27 Scams_ULA english final_8.27.26 (Y9tIMA9H2ks)
  - 2026-08-27 DBPR After a Storm_30 Sec Griffin_8.27.26 (uZ5DtyBQwVM)
  - 2023-11-04 2023 DBPR Employee Awards (kWAAtv1iyy4)
  - 2022-11-30 Florida DBPR Live Stream (PjSEewz3PDg)
- **oEmbed:** 3MKzuaKH--E 200 (https://www.youtube.com/@FloridaDBPR); 2Mi2PozQ-0c 200 (https://www.youtube.com/@FloridaDBPR)
- **Terms:** No terms link found on the page. Uploads are licensing/scam-awareness PSAs and agency awards; no boxing.
- **Reason:** Genuine parent-agency channel, but uploads are not boxing.

### Zuffa Boxing - unresolved

- **ID / handle:** `UCDncyGaGt5KumYowsnYUXKg` / @zuffaboxing. Feed title: "Zuffa Boxing".
- **Organization:** Zuffa Boxing (TKO Group / Sela) (promoter). Source class: promoter_official.
- **Site corroboration:** https://www.zuffaboxing.com/ - zuffaboxing.com returns a ~2.4KB script shell with no social links in static HTML; https://www.ufc.com/zuffaboxing links only youtube.com/ufc; UFC channel pages do not reference this ID; Paramount+ show page links only youtube.com/paramountplus. The channel About page links paramountplus.com/shows/zuffa-boxing (reverse direction only). No verified badge. Web search shows the handle and Instagram/X @zuffaboxing but no first-party site link.
- **Badge:** not verified (no badge in channel page header data; observed from public HTML, not the rendered UI)
- **Content types:** highlights, knockout, post-fight press conference, post-fight interview, weigh-in, other
- **Recent titles:**
  - 2026-09-13 Ryan Garcia ROCKS Conor Benn with a Round 2 TKO stunner: Garcia Benn on Paramount (liptI5VrkQo)
  - 2026-09-13 Post-Fight Press Conference: Garcia Benn on Paramount (SPPy9hyAKE8)
  - 2026-09-13 Jai Opetaia scores a powerful TKO victory over Noel Mikaelian: Garcia Benn on Paramount (qk_Az-vVEss)
  - 2026-09-13 BREAKING: Ryan Garcia calls out Teofimo Lopez (dAXYawcFfO4)
  - 2026-09-13 Ryan Garcia ignites chaos when he calls out Teofimo Lopez: Garcia Benn on Paramount (0qFZ-UnV8Fc)
- **oEmbed:** 0qFZ-UnV8Fc 200 (https://www.youtube.com/@zuffaboxing); WxeZ7QfBk1o 200 (https://www.youtube.com/@zuffaboxing)
- **Terms:** No readable Zuffa terms. Events are Paramount+ exclusive in the US; channel titles append "on Paramount". Note: a search hit for "OFFICIAL WEIGH-IN RESULTS | ZUFFA BOXING 03" (hWISZkMHd4s) belongs to @VegasSportsToday, not this channel - third-party uploads of Zuffa media exist.
- **Reason:** Content fits and embeds work, but no official site link and no verified badge; ownership not proven.

### ProBox TV - permission_required

- **ID / handle:** `UCT7Mm-aRWBZ1Zd2bIXIEsyg` / @ProBoxTV. Feed title: "ProBox TV".
- **Organization:** ProBox TV (broadcaster). Source class: broadcaster_official.
- **Site corroboration:** https://proboxtv.com/ - Homepage links https://www.youtube.com/channel/UCT7Mm-aRWBZ1Zd2bIXIEsyg (exact ID) and youtube.com/c/ProBoxTV (same ID). Also links a Spanish channel (c/ProBoxTVEspañol) not audited here. ProBox also promotes cards (Championship Series), so it is promoter + broadcaster.
- **Badge:** verified (channel page header title carries the CHECK_CIRCLE_FILLED badge in public page data)
- **Content types:** post-fight interview, analysis, highlights, knockout, other
- **Recent titles:**
  - 2026-09-12 Abass Baraou BEATS Hometown Hero Santillan, Takes WBO Title | Post-Fight Interview  (esQwyBQRh2s)
  - 2026-09-13 "IT WAS BOY AGAINST MAN" Paulie Malignaggi on Conor Benn's performance against Ryan Garcia (5AfRlOvnTqg)
  - 2026-09-12 Dominic Valle vs Francois Scarboro Jr: Best Action | Championship Series (YKq4HFgj52w)
  - 2026-09-12 Venado Lopez Finishes It in Round 3 | ProBox TV Debut (Cl2Z15SBpXk)
  - 2026-09-12 Giovanni Santillan Warms Up Backstage | WBO Intercontinental Title Main Event (0QfhRgyB4Go)
- **oEmbed:** 5AfRlOvnTqg 200 (https://www.youtube.com/@ProBoxTV); M8oB-GGCwuE 200 (https://www.youtube.com/@ProBoxTV)
- **Terms:** https://proboxtv.com/terms/ defines "ProBox Services" as "the Site and the App and any other sites or mobile applications, features, apps, services, or technologies owned, licensed, and/or operated by ProBox" and says users "will not create Internet 'links' to or from the ProBox Services or its Content, or 'frame' or 'mirror' any content contained therein" without express written consent; also bars crawlers/robots "to collect, scrape, index, mine, republish, redistribute". YouTube is not named in the definition. Channel description: "We are launching our new Championship Series with YouTube Membership" - some fights may be members-only and not publicly embeddable.
- **Reason:** Identity, feed and embeds pass, but ProBox terms bar linking/framing its Content without written consent and fights are moving behind YouTube Membership; get permission first.

## Common caveats

- **Embedding:** YouTube ToS: "You may also show YouTube videos through the embeddable YouTube player." (https://www.youtube.com/static?gl=US&template=terms). All oEmbed probes returned 200, which indicates embedding is allowed for those videos; it does not rule out per-video region locks, age gates or members-only restrictions.
- **Region restrictions:** Not discoverable without the YouTube Data API (contentDetails.regionRestriction); not checked.
- **Badge detection:** it reads the public channel-page JSON (`pageHeaderViewModel` title attachment `CHECK_CIRCLE_FILLED`). It matched the badge states already recorded in channels.json for all 21 channels.
- **Website terms vs YouTube uploads:** promoter and broadcaster terms quoted here govern their own websites and services. None of them names YouTube-player embedding of its own public uploads. The Top Rank, Golden Boy, Queensberry and BOXXER results follow the owner's recorded 2026-09-13 promoter source review (docs/BOXING_SOURCE_ACQUISITION.md section G), not a new legal finding.
- **MVP:** the earlier review recorded that MVP's robots.txt sets `use=reference` and that future reviews should be human-only. This audit made one automated homepage GET and one terms-page GET to mostvaluablepromotions.com before re-reading that note; WebFetch of the terms page returned 403 and was not bypassed.
- **DAZN quotes:** DAZN service-terms wording came from search snippets, not a verbatim read; confirm it on the live page.
