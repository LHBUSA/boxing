# Sanctioning-body source map (rankings + champions)

Checked 2026-09-13. Read-only: public pages, robots.txt, and one site-internal JSON endpoint the IBF page calls itself. Full detail is in `sanctioning.json`.

| Body | Current rankings source | Format | Divisions / ranks | Date label seen | History | robots.txt | Automation | Recommended state |
|---|---|---|---|---|---|---|---|---|
| WBC | `/mailing/<yr>/WBC_RATINGS_<MONTH>_<yr>.pdf`, `/en/championsratings/` | Monthly PDF + WP HTML. **403 to our fetcher** | not verified; WBC's own release says top 40 | "RATINGS AS OF MARCH 2026 / CLASIFICACIONES DEL MES DE ..." (latest PDF indexed: June 2026) | Monthly PDFs back to at least 2025 in the search index | `Content-Signal: search=yes,ai-train=no,use=reference`; ClaudeBot, GPTBot, CCBot and others `Disallow: /` | low | **review_required** |
| WBA | `/wba-ranking`, `/wba-female-ranking`, `/current-wba-champions` | Server HTML + PDF download | 17 men x 15; 17 women x 12 | "World Boxing Association Ranking as of AUGUST 2026", "August 31st, 2026" | Month selector 2000 to 2026; PDFs from 2018 on | allow all except /wp-admin/ | high | **approved_ingest** (owner to confirm) |
| IBF/USBA | `/ratings/` gets its data from `/wp-json/ratings/v1/filter?weight=&org=` | Page is JS; the endpoint returns JSON | 17 men x 15 (empty slot shows "NOT RATED") | "Ratings posted on 09/08/2026. Based on results from 08/1/2026 to 08/31/2026." | 246 monthly snapshots (Dec 2005 to Aug 2026) with `ppp=-1` | `Crawl-delay: 10`; allow all; /weight-class/ and /promoter/ disallowed | high | **approved_ingest** (endpoint is undocumented; owner to confirm) |
| WBO | `/wborankings/report/.../RankingReportMale` (and Female) | PDF built on request (dompdf), text can be extracted | 17 men x 15, plus "**" regional lines | "WBO MALE WORLD RATINGS / As of August 28, 2026" | Year/month POST form (2000 on, not tested); some PDFs under wp-content; Explanations Sep 2025 to Jul 2026 | allow all | medium | **review_required** |
| The Ring | `/fighters/rankings?org=ring` | Next.js, rows rendered client-side | champion + top 10 (unverified) | none on the table | news articles only | allow all | low | **blocked** (terms ban scraping and commercial reuse) |
| TBRB | `/mens-rankings`, `/womens-rankings`, `/p4p` | Server HTML tables | 17 men, 14 women x top 10 + champion | "Latest Update" 7 Sep 2026 (men), 9 Sep 2026 (women) | Archive back to 13 Dec 2021 at least; successions pages | allow all except /wp-admin/ | medium | **approved_reference** |

## Title labels, exactly as each source shows them
- **WBC** (from search snippets only, site blocked): Champion, Interim Champion, Champion in Recess, Franchise Champion, Champion Emeritus, Silver. "Diamond" and "Eternal" were **not** seen.
- **WBA** ranking page: WBA SUPER CHAMPION, WBA WORLD CHAMPION, WBA INTERIM CHAMPION, CHAMPION IN RECESS, VACANT. Champions page: WBA Super World, WBA World, Interim WBA, WBA Gold, Champion in recess. Regional suffixes: GOLD, INT, C/A, NABA, LAC, PANAF, WBAO, CON, I/C.
- **IBF**: Champion, Interim Champion, TITLE VACANT, NOT RATED. The champion record has Title won / Mandatory / Defended dates. No super or regular tiers.
- **WBO**: the PDF uses CHAMPIONS, "(Interim)" and VACANT. Champion pages use Champion, Interim Champion, Interim Super Champion, Undisputed Super Champion and Vacant (the Super variants need re-checking).

## Mandatory designations
- WBA: not marked in the list. There is a separate `/mandatory-fights` page, which returned HTTP 500 when checked.
- IBF: a Mandatory due date on the champion record. The #1 and #2 slots are often left "NOT RATED".
- WBO: not marked in the PDF. Mandatories appear in Official Rulings and Ranking Explanations (prose).
- WBC: prose only, in the "WBC Status by Division <Month Year>" posts and convention releases.

## Identity keys
- WBA: `wba-boxer-profile/?id=<int>`. This is the only stable official fighter ID found.
- IBF, WBO, WBC: name and country only.
- WBO's footer names BoxRec "The Official Record Keeper". BoxRec is blocked for us and was not followed.
- Ring: fighter slug with an ID. Blocked anyway.

## Notes and caveats
- WBC: do not work around the 403 or the robots signals (for example with a spoofed user agent). Any use needs owner review, and realistically permission. PDF filenames are irregular, so guessing URLs is brittle.
- Terms of use:
  - WBA says the site is "provided for informational purposes only" and "not binding in any way".
  - IBF and WBO have only an "All Rights Reserved" footer and no terms page.
  - TBRB has a copyright notice and no licence.
  - None of these is legal clearance.
- Source typos (WBO "DANIEL BUBOIS", IBF name spellings) mean we need fuzzy matching plus a human review queue.
- Wayback Machine earliest captures: WBA `/wba-ranking` 2016, WBO `/rankings/` 2012, WBC `/en/championsratings/` 2019, TBRB 2013. The IBF page is a JS shell, so its captures hold little; the JSON endpoint is the real archive. The Internet Archive rate-limited us and part of the check failed.
- Raw evidence is in `research/raw/`: `ibf_ratings.html`, `ibf_ratings_filter.js`, `ibf_hw.json`, `ibf_hw_all.json`, `wbo_male.pdf`, `wbo_male.txt`, `wbo_rankings.html`.
