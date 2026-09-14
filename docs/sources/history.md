# PropBetEdge Boxing: Hall of Fame and historical source map

Retrieved 2026-09-13. Read-only: public pages, Wikidata SPARQL, MediaWiki API, loc.gov JSON, archive.org metadata, and the Smithsonian API with the public `DEMO_KEY`. No signups. Full detail and evidence URLs are in `history.json`.

**Standing rules**
- BoxRec is blocked. Never select or store Wikidata **P1967** (BoxRec boxer ID).
- Drop any fact whose only citation is boxrec.com.
- Ingest atomic facts only. No biography prose, records or photos from hall sites.

## Part 1: Hall of Fame institutions

| Hall | Official site | Location | Roster by year? | Source-native categories | Years visible | Wikidata hall QID / P166 | Automation | State |
|---|---|---|---|---|---|---|---|---|
| **International Boxing Hall of Fame** | http://www.ibhof.com (HTTPS refused; HTTP only) | 1 Hall of Fame Dr, Canastota NY 13032 | Category pages are alphabetical. Each profile page has an `Induction: YYYY` field | Index: "Men's Modern Boxers", "Women's Modern Boxers", "Men's Old-Timer Boxers" ("Early"/"Late" era), "Women's Trailblazer Boxers", "Pioneer", "Non-Participant", "Observer". Nav: "Modern", "Women's Modern", "Old Timer", "Women's Trailblazer", "Pioneer", "Non Participant", "Observer" | 1990 to 2026 | Q572227; 545 people, 543 with P585 | High (about 553 static pages) | approved_reference (Wikidata statements: approved_ingest) |
| World Boxing Hall of Fame | https://wbhof.org | Sacramento CA (revived; original was Los Angeles, 1980 to 2010) | One PDF "1980-2010" with about 411 name+year entries, grouped by role | "Boxers", "Administrators / Physicians", "Ring Officials", "Promoters/Matchmakers", "Managers/Trainers", "Journalists/Writers", "Historians", "Announcers/Broadcasters" | 1980 to 2010 | Q4020860; 0 | Low (PD typos; rebuilt from the Wayback Machine) | review_required |
| Nevada Boxing Hall of Fame | https://www.nvbhof.com | Las Vegas NV | Yes: /2013 through /2024. 2025 and 2026 classes announced on the home page | "Nevada Resident Boxers", "Non-Nevada Resident Boxers", "Non-Boxer Inductees" | 2013 to 2026 | Q16227099; 0 | Medium (Wix, but text is in the HTML) | approved_reference |
| California Boxing Hall of Fame | none (domain dead; 2017 Wayback capture is a parking page) | Los Angeles (historical) | No | n/a | n/a | none | None | unavailable |
| New Jersey Boxing Hall of Fame | https://www.njboxinghof.org | Garfield NJ ceremonies (55th in 2025) | Master list of about 800 names with no years. Class posts only from about 2013 | "Hall of Famers", plus awards "Professional of the Year", "Man of the Year", "Special Awards", "Amateur Boxing Awards", "Journeymen Boxing"; "Posthumous" label | about 2013 to 2026 on site | Q106218633; 7 (5 with P585) | Medium/low | approved_reference |
| Florida Boxing Hall of Fame | http://www.floridaboxinghalloffame.com (HTTP only) | Fort Myers announcements; St. Petersburg induction; Tampa museum aim | Class rosters are **JPG images** (2009 to 2020) plus 2026 images | No text labels. Awards: "Boxing Achievement Award", "Walter Flansburg Award" (from file name) | 2009 to 2026 | none | Low (needs OCR or manual work) | review_required |
| International Women's Boxing Hall of Fame | https://www.iwbhf.com | Vancouver WA origin; Las Vegas ceremonies (Oct 10, 2026) | Home page has "Name - YYYY" entries; later classes in womenboxing.com press releases | "Modern Female Boxer(s)", "Trailblazer/Pioneer Female Boxers", "Non-boxer recipients", "Special Award Recipients" | 2014 to 2026 | Q21189385; 11 (0 with year) | Medium | approved_reference |
| Canada's Sports Hall of Fame (boxing) | https://halloffamers.sportshall.ca | Calgary AB ("virtual institution", closed to the public) | Yes: embedded JSON with `member_inducted` and `member_sport`. 724 members, 18 Boxing | "Athlete", "Builder", "Athlete, Builder", "Honourary Member", "Team", "Trailblazer" | Boxing: 1955 to 2015 | Q1330014; 526 all sports, 18 boxers | High (one request) | approved_reference |
| WBC Legends of Boxing Museum | wbcboxing.com (no roster page) | Los Angeles | No (a museum, not an induction body) | n/a | n/a | none | n/a | unavailable |
| WBA hall | none found | n/a | No | n/a | n/a | none | n/a | unavailable |
| The Ring magazine HoF (defunct) | none | n/a | Wikipedia list only | n/a | about 1954 to 1987 | Q7334716; 0 | n/a | review_required |
| boxinghalloffame.com (BHOF, Inc.) | https://boxinghalloffame.com | n/a | "Hall of Famers" page | n/a | n/a | n/a | n/a | **blocked** (identity trap: commercial licensing site, NOT the IBHOF) |

### Hall site robots.txt and copyright notices (verbatim)
- **IBHOF**
  - robots.txt: `User-agent: *` with only `/~site/Scripts_*` and `/~site/siteapps/showmap.action` disallowed. Inductee pages are allowed.
  - Footer: "(C) Copyright 1997,1998,1999,2000 All rights reserved". No terms page. Thumbnails have no credit.
- **WBHOF**
  - robots.txt: `User-agent: * / Disallow: /404`
  - Footer: "Copyright © 2026 World Boxing Hall of Fame - All Rights Reserved."
- **NVBHOF**
  - robots.txt: `User-agent: * / Allow: / / Disallow: *?lightbox=`
  - Footer: "The official site of the Nevada Boxing Hall of Fame. ©2026. All rights reserved."
- **NJ**
  - robots.txt: `User-agent: * / Disallow: /wp-admin/`
  - Footer: "Copyright © 2026 New Jersey Boxing Hall of Fame . All Rights Reserved."
- **Florida**
  - robots.txt: Homestead default, same as IBHOF.
  - No copyright notice found in page text.
- **IWBHF**
  - No robots.txt (404).
  - No notice found.
- **Canada's Sports HoF**
  - robots.txt: `Disallow: /admin/ /cgi-bin/ /tmp/`
  - Footer: "© 2025, CANADA'S SPORTS HALL OF FAME"

**Photos:** no hall credits or licenses its photos. Treat every hall photo as not reusable.

### IBHOF deep dive
- **Process (quoted):** "Members of the Boxing Writers Association of America and an international panel of boxing historians cast votes ... An independent accounting firm tabulates the votes ... news conference ... in December ... induction ceremony is held each year in June."
- **Site counts (profile links):**

  | Category | Count |
  |---|---|
  | Modern | 158 |
  | Women's Modern | 15 |
  | Old Timer | 135 |
  | Women's Trailblazer | 6 |
  | Pioneer | 44 |
  | Non-Participant | 132 |
  | Observer | 56 |
  | **Total** | **546** |

- **Wikidata matches the site almost exactly.**
  - The award pattern is `?p p:P166 ?st . ?st ps:P166 wd:Q572227 ; pq:P585 ?year`, with references P813 and **P4474** (IBHOF ID, e.g. `observer/neiman`).
  - No statement has a category qualifier. The category is the P4474 prefix: modern 158, oldtimer 135, nonparticipant 131, observer 56, pioneer 44, women_modern 15, women_trailblazer 6.
  - All 545 awardees have P4474. Class sizes range from 53 in 1990 to 12 in 2026.
  - About 351 awardee rows also carry P1967 (BoxRec ID). Do not select it.
- **Wikipedia:**
  - "List of International Boxing Hall of Fame inductees" **does not exist (404)**. The lists live in the main "International Boxing Hall of Fame" article.
  - Entries per section: Modern 157, Old Timers 134, Pioneers 44, Non-participants 121, Observers 44, Women's Modern 15, Women's Trailblazer 6, "Women non-participants" 4 (a Wikipedia-only grouping). Total 525.
  - It is short by about 23 in the Observer and Non-Participant groups, and **Al Bernstein is under Non-participants on Wikipedia but Observer on ibhof.com**.
  - The "Record" column is likely BoxRec-derived. License is CC BY-SA 4.0: facts are fine, but don't copy tables or prose.
- **Best strategy:**
  1. Pull (person QID, category from the P4474 prefix, year from P585) from Wikidata (CC0).
  2. Verify each row against the ibhof.com profile's `Induction:` field over HTTP at a low rate.
  3. Store both URLs as provenance.
  4. Flag disagreements for human review.
  5. Use Wikipedia for cross-checks only.

## Part 2: Historical sources

| Source | Authority | Rights / access | Automation | Coverage | Data types | Stable IDs | State |
|---|---|---|---|---|---|---|---|
| Wikidata | tertiary | CC0 ("All structured data ... available under the Creative Commons CC0 License") | SPARQL (60 s timeout), dumps, no key | Global, all eras. 19,591 boxers; 10,089 with P1967; 950 boxing-match items | Identity, awards, ID crosswalks | QID, statement GUID, revision ID | **approved_ingest** (identity and awards; exclude P1967 and BoxRec-referenced statements) |
| Wikipedia "Professional boxing record" tables | tertiary | CC BY-SA 4.0 | Action API parse/wikitext | Global | Bout rows | Page ID, revision ID | **review_required** (heavily BoxRec-cited: Harry Greb 25 BoxRec mentions in 47 refs, Joe Louis 42; no bulk bout ingest) |
| Wikimedia Commons | tertiary host | Per-file license in extmetadata | MediaWiki API, no key | Global | Photos, posters | File title, pageid, SHA-1 | **approved_ingest** (PD/CC0 files traceable to LOC/NARA only) |
| LOC Prints & Photographs / Bain | primary | "No known restrictions on publication" (item `rights_advisory`) | loc.gov JSON, no key. **20 req/min (1-hour block)**, images 150/min. robots Crawl-Delay 5; /search disallowed | Bain about 1900 to 1920s, US. 41,526 Bain items; 228 for "boxer" | Photos, negatives, posters | LCCN, call number | **approved_ingest** |
| Chronicling America | primary | "The Library of Congress believes that the newspapers in Chronicling America are in the public domain or have no known copyright restrictions" | loc.gov JSON only (legacy API retired; migration done 2025-08-04) | US, about 1756 to 1963 | Page images and OCR | LCCN + date + ed + seq | **approved_ingest** (pre-1931 pages; human-verify OCR facts) |
| Internet Archive | mixed | Per item: `possible-copyright-status`, `copyright-evidence`, `licenseurl` (often uploader-asserted) | advancedsearch + metadata API, no key | Global, 1700s onward. 165 boxing texts from 1800 to 1929 | Books, Police Gazette, programs | IA identifier | **approved_reference** (pre-1931 items promotable after review; exclude user-uploaded Ring issues) |
| DPLA | tertiary aggregator | Contributor rightsstatements.org URIs; metadata reportedly CC0 | **API key via email POST** (needs approval). dp.la reset connections from here | US | Pointers to photos and documents | 32-hex item ID | **review_required** |
| Smithsonian Open Access | primary objects | CC0 **per media file** (`usage.access`). Pages say "Metadata Usage CC0" even when the image is restricted | API needs api.data.gov key (DEMO_KEY is low-rate). **GitHub bulk dataset, no key**. si.edu pages bot-challenge (403) | Mostly US, 1800s onward | Tickets, postcards, documents, art | record_ID, ARK | **approved_ingest** (media-level CC0 via bulk) |
| NARA Catalog | primary | Federal works generally PD; donated items vary | **API key by email** (Catalog_API@nara.gov), 10k queries/month; UI is a JS SPA | US federal, military | Photos, film, documents | NAID | **review_required** |
| NY State Archives, Athletic Commission (B2499 event files with scorecards; Boxing History Record Cards for about 5,000 boxers; A1372 minutes) | primary | Not captured: **Anubis proof-of-work bot wall** and robot verification | None; do not automate | NY, 1920s onward | Results, scorecards, record cards | Series numbers | **review_required** (manual; very high value) |
| California State Archives, State Athletic Commission (OAC ark:/13030/tf838nb2b2) | primary | IPA/PRA restrictions; items 75+ years old open (Gov Code 12237) | None (OAC returns 202 to scripts) | CA. 1925 to 1991 per text vs 1913 to 1934 per title (discrepancy) | License applications (1,000+ boxers), event reports, tax journals | F-numbers (e.g. F2214) | **review_required** (manual) |
| Cyber Boxing Zone and similar fan sites | tertiary | No license statement; no robots.txt; sourcing unclear | None | Global | Records, lineage | Page URLs | **blocked** |
| Ring magazine archive | secondary | Copyrighted; full access needs an account (free signup or paid). IA copies are unlicensed uploads | None | 1922 to present | Issues, ratings | Issue date | **blocked** |

### Public-domain feasibility proofs (3 per image archive)
**LOC Bain.** Each item's `rights_advisory` reads: "No known restrictions on publication. For more information, see George Grantham Bain Collection - Rights and Restrictions Information".
- https://www.loc.gov/item/2014691254/ [Boxer George Robinson], LC-B2- 2479-11
- https://www.loc.gov/item/2014703516/ Harry Tracy (boxer), LC-B2- 3308-1
- https://www.loc.gov/item/2014691152/ [South African boxer Fred] Storbeck, LC-B2- 2470-3

**Wikimedia Commons** (LicenseShortName "Public domain")
- https://commons.wikimedia.org/wiki/File:Boxer_George_Robinson_LCCN2014691254.jpg (LOC source)
- https://commons.wikimedia.org/wiki/File:Navy_-_Athletics_-_Company_boxing,_Great_Lakes_Naval_Base,_Ill_-_NARA_-_45510118.jpg (NARA, 1917 to 1918)
- https://commons.wikimedia.org/wiki/File:Recreation_-_Athletics_-_Boxing_(165-WW-469A-54)_-_DPLA_-_9f6464b9c08e4f38a58ed1de5623e6c1.jpg (PD-US)

**Smithsonian Open Access** (media `usage.access = "CC0"`)
- http://n2t.net/ark:/65665/fd568c29a9f-3c75-4e6b-925d-3488bda75249 Photographic postcard of boxer Emma Maitland (NMAAHC)
- http://n2t.net/ark:/65665/vk7c8d19ba6-fabd-41c0-ad46-442d15dec15e Muybridge, "Pugilist Striking a Blow" (SAAM)
- http://n2t.net/ark:/65665/fd5ddfde298-a3c0-4103-a439-2690a9d36576 Document listing championship boxing matches held in Florida (NMAAHC)
- Counter-example: https://www.si.edu/object/american-amateur-boxing-album:nmah_1072598 shows "Metadata Usage CC0", but the image says "There are restrictions for re-using this image."

**Internet Archive**
- https://archive.org/details/pugilisticahisto01mileuoft: NOT_IN_COPYRIGHT; "no visible notice of copyright; stated date is 1906."
- https://archive.org/details/boxiana-vol-2-1824: PD Mark 1.0 (uploaded by National Sporting Library)
- https://archive.org/details/KnucklesAndGloves: PD Mark 1.0, published 1922

**Chronicling America** (LOC PD statement). These pages matched a "prize fight" OCR query; their boxing content was not read.
- https://www.loc.gov/resource/sn82014248/1910-07-07/ed-1/?sp=12
- https://www.loc.gov/resource/sn82014248/1910-06-16/ed-1/?sp=12
- https://www.loc.gov/resource/sn85053057/1899-05-27/ed-1/?sp=9

**NARA** (PD per the Commons NARA-cooperation mirror; catalog fields not read because the API needs a key)
- https://catalog.archives.gov/id/45510118
- https://catalog.archives.gov/id/285830
- https://catalog.archives.gov/id/285873

## Notes and traps
- The IBHOF and Florida sites are HTTP-only (Homestead). IBHOF refuses port 443.
- Search engines label **boxinghalloffame.com** as the IBHOF. It is BHOF, Inc., a commercial licensing site.
- Items on the **Smithsonian** site can show CC0 metadata while the image is restricted. Always gate on media-level `usage.access`.
- The Smithsonian API stems "boxing" to "box", so filter titles after retrieval.
- The **LOC** JSON API allows 20 requests per minute. Exceeding it blocks you for an hour, and the block timer resets on any request made during it.
- Getting a **DPLA** or **NARA** API key requires registering an email. Under the zero-signup rule, the owner must approve that first.
- The **New York State Archives** and **OAC** sites actively bot-wall scripted access. Use them manually only.
