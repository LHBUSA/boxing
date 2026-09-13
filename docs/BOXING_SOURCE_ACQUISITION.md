# Boxing source acquisition matrix

Review date: **2026-09-13**. Next review is due 2026-12-13, or earlier if any terms-change notice arrives. Registry: `boxing_sources` + `boxing_source_rights_reviews` (migrations 0010, 0012, 0014).

**Method.** Public official pages were read directly. There were no sign-ups, no logins, no data-API calls (except The Odds API, which we already subscribe to) and no bulk scraping. One sample document was opened per commission result format. Quotes are verbatim from the official page or a dated archive of it, and archives are named where used. **This is not legal advice.** Public-records and database-rights questions are flagged for legal review.

| Class | Meaning |
|---|---|
| **GREEN** | Official terms expressly permit our use (persistent storage, commercial first-party display, derived analytics, ML), possibly with conditions |
| **YELLOW** | Possibly permissible, but no express grant. Needs a plan/contract, outreach or legal review first |
| **RED** | Prohibited, or blocked without a licence |

**Enabled for collection (staging only):** The Odds API; Nevada NSAC, Florida Athletic Commission and New Jersey SACB official commission pages (enabled 2026-09-13, see [COMMISSION_INGESTION.md](COMMISSION_INGESTION.md)). Every other external source stays disabled.
- `wikidata` has been enabled since issue #1, for identity only, and its seed worker is not deployed.
- The internal rows are PropBetEdge's own data.

## Owner policy: zero new paid data sources (2026-09-13)

**PropBetEdge does not purchase or subscribe to any new data API for Boxing** unless the owner explicitly approves the spend.
- **Not pursued:** Boxing Data API, BoxRec, CompuBox, Sportradar, SportsDataIO and any other commercial provider. That covers subscriptions, trials, credit purchases, upgrades and paid licences.
- **The goal is to build and own a normalized boxing dataset,** not to assemble a product that depends on new paid APIs. PropBetEdge is creating the API, not buying one.
- **The Odds API stays enabled in staging only because** it is the existing PropBetEdge subscription (the 100K plan, also used by NFL/UFC), Boxing adds no incremental charge within the included credits, and its terms permit the use.
- **Anything that could create a charge needs explicit owner approval first.** That includes an upgrade forced by quota pressure and public-records requests that carry copy fees.

### Source build order (no new cost)

1. **Official athletic commissions:** result sheets, scorecards, officials, suspensions and weigh-ins from free public pages.
   - Nevada, New Jersey and Florida PDFs; Texas TDLR under its copy conditions.
   - Each needs a terms/legal review, attribution rules and PII stripping (never DOB or Federal ID).
   - Public-records requests (CPRA, FOIL, OPRA) are made only where there is no fee, or after the owner approves a fee.
2. **Official event and promoter sources:** public cards, bout orders, weigh-in announcements and results where the site terms permit. Each promoter gets its own source row and review.
3. **Public and open government data**, with provenance recorded.
4. **Wikidata and open-licensed identity data:** already enabled for identity (CC0).
5. **Sanctioning-body public pages** (WBC/WBA/IBF/WBO rankings and titles): only after an access and terms review. Until then, facts-only references with attribution.
6. **Existing PropBetEdge infrastructure** that adds no cost: The Odds API within the existing plan; internal editorial and manual review (`pbe_manual_review`).

Paid or licensed options (BoxRec licence, CompuBox feed, Boxing Data API plans) are recorded below **for reference only**. They are not in the execution plan.

## Summary

| Source | Class | Registry state | Key evidence | Next action |
|---|---|---|---|---|
| **A. The Odds API** | **GREEN (raw redistribution prohibited)** | `approved_ingest` / `approved`, **enabled**, `redistribution_allowed=false` | [Terms](https://the-odds-api.com/terms-and-conditions.html), last updated 2026-08-31 | Staging capture live; re-review 2026-12-13 |
| **B. BoxRec** | **RED** | `blocked` / `prohibited` | [Terms (Wayback 2025-12-29)](http://web.archive.org/web/20251229101505/https://boxrec.com/en/policies/terms_conditions/public) | **Not pursued** (paid licence). No scraping, no automated use |
| **C. Boxing Data API** (boxing-data.com via RapidAPI) | **YELLOW** | `review_required`, disabled | [RapidAPI pricing](https://rapidapi.com/bengroves1993/api/boxing-data-api/pricing) (`termsOfService: null`); [RapidAPI terms](https://rapidapi.com/page/terms) (2026-05-13) | **Not pursued** (paid subscription). No subscription, trial or ingestion |
| **D. WBC** | YELLOW | `review_required` | [Ratings](https://wbcboxing.com/campeones-y-ratings/varonil/completo/); privacy policy only | Terms/access review before any automation (no cost) |
| **D. WBA** | YELLOW | `review_required` | [Rankings](https://www.wbaboxing.com/wba-ranking); [legal disclaimer](https://www.wbaboxing.com/important-legal-information) | Terms/access review before any automation (no cost) |
| **D. IBF** | YELLOW | `review_required` | [Ratings](https://www.ibf-usba-boxing.com/ratings/); privacy policy only | Terms/access review before any automation (no cost) |
| **D. WBO** | YELLOW | `review_required` | Rankings PDF on [wboboxing.com](https://wboboxing.com/); no terms page | Terms/access review before any automation (no cost) |
| **E. CompuBox** | **RED** | `blocked` / `prohibited` | [Terms](https://app2.compuboxdata.com/terms-and-conditions) | **Not pursued** (paid feed). Punch metrics stay unavailable |
| **F. Nevada (NSAC)** | GREEN for facts (public records) | `nsac_nevada`: **`approved_ingest`**, enabled (staging) | [Results 2026](https://boxing.nv.gov/results/2026_Results/); robots disallows only `/workarea/`, `/widgets/`; public pro calendar feed; NRS 239 | Ingesting boxing results only (MMA/PowerSlap never fetched); Federal ID column and physician/medical header lines dropped in the parser |
| **F. California (CSAC)** | GREEN for own content; results → BoxRec (RED) | `csac_california`, `review_required` | [Events](https://www.dca.ca.gov/csac/events/index.html); [ca.gov conditions](https://www.ca.gov/legal/conditions-of-use/) | CPRA request for result sheets (no-fee only; any fee needs owner approval) |
| **F. New York (NYSAC)** | YELLOW | `nysac_new_york`, `review_required` | [Athletic commission](https://dos.ny.gov/athletic-commission) (403 to automated fetch) | FOIL request (no-fee only; any fee needs owner approval) |
| **F. New Jersey (SACB)** | GREEN for facts (public records) | `nj_sacb`: **`approved_ingest`**, enabled (staging) | [Schedule & results](https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/); robots disallows only `/wp-admin/`; OPRA | Schedule ingested (pro boxing only); result-PDF parser **not built** (documents registered `parser_pending`); linked third-party record keepers are never followed |
| **F. Texas (TDLR)** | GREEN with conditions for human reference; automation blocked by robots | `tdlr_texas`: **`reference_only`**, disabled | [Disclaimer/copyright](https://www.tdlr.texas.gov/disclaimer.htm); [results](https://www.tdlr.texas.gov/sports/events/results/) load from `/sports/_events-list.csv`, and robots.txt says `Disallow: /*.csv` | No automated fetch. Adapter classifies rows (boxing only; state titles = `tdlr-texas` tier `state`) but is disabled; human reference with attribution + non-endorsement |
| **F. Florida (DBPR)** | GREEN for facts (public records) | `florida_athletic_commission`: **`approved_ingest`**, enabled (staging) | [Pro results](https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/); robots disallows only WordPress paths; Ch. 119 | Ingesting pro boxing only (Event Type + per-bout Sport; BKFC/bare knuckle/kickboxing/MMA rejected); DOB and Federal ID columns dropped in the parser |
| **F. BBBofC (UK)** | RED for results (BoxRec-provided); YELLOW for Board lists | `bbbofc_uk`, `review_required` | [Results](https://www.bbbofc.com/results) ("Provided by boxrec.com") | Free written permission request for Board lists only; results not used |
| **F. ABC record keeper / National Suspension List** | YELLOW (conflicting evidence) | none | [Boxer's Bill of Rights](https://www.abcboxing.com/boxers-bill-of-rights/) (Fight Fax) vs [ABC home](https://www.abcboxing.com/) sidebar (BoxRec) | Ask ABC which registry is certified |

---

## A. The Odds API — GREEN, with a raw-redistribution restriction

**Terms:** https://the-odds-api.com/terms-and-conditions.html, "Last updated: 31 August 2026".
- Read 2026-09-13.
- HTML sha256 `f4d79e4016d470b65ab20d733b0d7918ac3fcfde36babdb7c83a4de21af8f660`.

**Permitted, verbatim:**
- "Storing our data and retaining it indefinitely"
- "Displaying our data in a UI, website, or mobile app, including for commercial use"
- "Using our data in research papers and analytical dashboards"
- "Calculating and displaying values you derive from our data"
- "Using our data to train statistical and machine learning models"

**Prohibited, verbatim:**
- "Do not resell, repackage, or redistribute our data as a standalone data product. This includes, but is not limited to, offering our data through your own API, data feed, downloadable files, or any other format intended to serve as a source of raw data for others."
- "don't resell our data as your own API or data source."

**Attribution:** "Attribution to The Odds API is not required, but is always appreciated."

**Other terms that matter:**
- Changes take effect once posted, and material changes are emailed.
- The provider can revoke the key if it suspects resale.
- Responsible-gambling messaging is encouraged wherever bookmakers are promoted.

**Account:**
- Existing paid PropBetEdge subscription on the **100K tier**: 100,000 credits/month, reset on the 1st; publicly listed at $59/month; upgraded from 20K by the owner in September 2026 for NFL. It is shared with PropBetEdge NFL and UFC, and 95,065 credits remained after the first staging capture.
- Boxing uses included credits only. Plans are fixed monthly quotas with no published overage pricing; the September 2026 NFL exhaustion stopped requests rather than billing more.
- **No account-specific agreement, contract or enterprise terms** were found in PropBetEdge repositories, secrets or records.
- The public terms therefore govern, and there is no conflict.

**Product consequence:**
- `boxing-gateway` serves market data only as a per-bout summary with whitelisted fields: current price per book with freshness, best price, opening/current/closing, consensus, dispersion, and PropBetEdge fair prices.
- It serves no tick history, raw payloads, provider ids, bulk lists or downloads. Tests enforce this: `workers/boxing-gateway/src/index.test.mjs`, `tests/db/11_odds_forward_capture.test.mjs`.

**Future review triggers:**
- a terms-change email
- any plan to offer a partner or external API
- any downloadable or exportable market feature
- the 2026-12-13 scheduled review

## B. BoxRec — RED

**Access.** Live boxrec.com returns a Cloudflare challenge (403) to automated reads, so the terms were read from Wayback captures of the official pages.

**Terms quotes:**
- Current consumer terms (capture 2025-12-29): "You shall not conduct, facilitate, authorise or permit any text or data mining or web scraping in relation to our Website"
- Same terms: "You must not use any part of the content on the Website for commercial purposes without obtaining a licence"
- Same terms: BoxRec "owns and shall retain ownership of all Intellectual Property Rights … (including the Profile Data)", including database rights. Separate business-user terms apply but were not found.
- 2022 terms (capture 2024-03-26): "The use of BoxRec ratings by media, betting or fantasy platforms requires an official licence." Screen scraping is prohibited without a written licence.

**Decision:** blocked. No scraping, and no data-mining of pages mirrored elsewhere.
- Wikidata-carried BoxRec ids stay provenance-only in raw payloads, as since #1.
- Commissions and bodies that display BoxRec data (CSAC, NJ suspensions, BBBofC results, the WBO footer) do not pass BoxRec rights to us.

**Plan:** not pursued, because a licence is a paid acquisition under the zero-new-paid-source policy. BoxRec remains blocked. Records and the active universe are built from commission documents, promoter results, Wikidata and our own normalized graph.

## C. Boxing Data API (RapidAPI) — YELLOW

**What it is:**
- Provider boxing-data.com; RapidAPI listing `bengroves1993/boxing-data-api`, v2.0.1.
- Documented endpoints: fighters (records, KOs, rounds, debut), fights (status, outcome, round, judges' totals), events (venue, broadcasters by country), schedules, titles, organizations, divisions, rankings (IBF/WBA/WBC/WBO, 17 men's divisions).
- "Updated daily".

**Plans:**

| Plan | Price/month | Requests/month | History |
|---|---|---|---|
| Basic | $0 | 100 | 7-day window |
| Pro | $29 | 5,000 | 30 days |
| Ultra | $99 | 50,000 | 90 days |
| Mega | $249 | 500,000 | unlimited |

- Hard caps.
- Only Mega gives the history depth needed for models.

**Rights:**
- The provider publishes **no terms of service**, and its RapidAPI plans have no legal document attached.
- RapidAPI's terms (2026-05-13) say data-use terms are "solely between each such API Consumer and such API Provider". They are silent on caching, storage, derivative works and ML.

**Provenance risk:**
- Rankings are "sourced from BoxingScene".
- The sources of records and results are unstated and could trace to BoxRec, which is RED.
- Punch stats announced in 2024 are absent from the v2 fights docs; if present, they could be CompuBox-derived.
- Referee/judge names and weigh-ins are not documented.

**PropBetEdge plan:** no RapidAPI subscription found.

**Decision:** YELLOW on rights, and **not pursued** under the zero-new-paid-source policy. No subscription (including the free Basic tier), trial or ingestion. Documentation is not approval, and the upstream provenance is doubtful anyway.

## D. Sanctioning bodies — YELLOW (all four)

| Body | Official ranking source | Terms found |
|---|---|---|
| WBC | https://wbcboxing.com/campeones-y-ratings/varonil/completo/ (HTML, dated update) | Privacy policy only; no terms of use |
| WBA | https://www.wbaboxing.com/wba-ranking (HTML, monthly archive) | Disclaimer ("informational purposes only … request official certification") + copyright footer |
| IBF | https://www.ibf-usba-boxing.com/ratings/ (JavaScript table; PDF via form) | Privacy policy + "All Rights Reserved" |
| WBO | Rankings PDF under https://wboboxing.com/wborankings/ ("As of August 28, 2026") | "All Rights Reserved" footer; no terms page |

**Unresolved questions:**
- Are ranking compilations protected? This is US/Mexican law, plus EU/UK database right if EU users are served.
- Can full monthly history be stored and used as model features?
- Do body names, belts and logos raise trademark issues?

**Until written permission:** no automated collection, which matches #2's disabled adapters. Use facts-only references with attribution, and no logos.

## E. CompuBox — RED

- https://app2.compuboxdata.com: "All data displayed on this website is for personal use only. Any commercial use is strictly prohibited unless approved by CompuBox Inc."
- Terms: "punch statistics, fight data … are the sole property of CompuBox Inc." No commercial reproduction or derivative works without prior written consent.
- A data-feed product for sportsbook and fantasy use is implied, with no public API documentation.

**Decision:** blocked.
- Punch metrics in Fight DNA stay `source_unavailable`.
- Audit any third-party punch stats (including Boxing Data API) for CompuBox derivation.

**Plan:** not pursued (paid feed). Punch and knockdown metrics stay `source_unavailable` unless a no-cost, permissible official source appears.

## F. Athletic commissions

Classified per jurisdiction, because terms and access methods differ. Result sheets carry **personal data**:
- Nevada and New Jersey: Federal IDs.
- Florida: DOB and Federal ID.

These must never be stored in public tables; internal identity matching would need legal review first.

| Jurisdiction | Publishes | Format / access | Terms | Class |
|---|---|---|---|---|
| **Nevada NSAC** | Results with officials, **judge names + totals**, point deductions, title notes (no suspensions in sample) | Yearly index of redacted PDFs 2020–2026; public records request form | "All Rights Reserved" footer; no reuse licence | YELLOW (strong) |
| **California CSAC** | Schedules; results **delegated to BoxRec** | HTML/PDF | ca.gov: content "is considered in the public domain" | GREEN (own content) / results RED |
| **New York NYSAC** | Upcoming events only (disciplinary PDFs exist) | Site blocks automated fetch | No reuse terms found | YELLOW |
| **New Jersey SACB** | Results with **per-judge scores** and **suspensions** | PDFs; suspension page links to BoxRec | No reuse terms found | YELLOW (strong) |
| **Texas TDLR** | Past results, champions | JavaScript table (format unverified) | May copy with agency, URL and copy date; non-endorsement; no logos | GREEN with conditions |
| **Florida DBPR** | Results with officials and **suspension periods** (~1,230 PDFs) | PDFs | Copyright footer; no reuse grant | YELLOW (strong) |
| **UK BBBofC** | Results widget "Provided by boxrec.com"; Board champion lists | HTML | No terms page | RED results / YELLOW lists |
| **ABC** | "Record keeper" and National Suspension List host | BoxRec per ABC sidebar; Fight Fax per current Boxer's Bill of Rights | Fight Fax not reachable | YELLOW (conflict) |

**Strategic order** once legal review clears public-records use:
1. Nevada, New Jersey and Florida, the richest official result/scorecard/suspension documents.
2. Texas, whose conditions are explicit.
3. Public-records requests: California (CPRA), New York (FOIL), New Jersey (OPRA) for backfill.

Each gets its own source row, adapter, attribution rule and PII stripping before enabling.

### Decision 2026-09-13 (migration 0014; engineering review, not counsel)

| Jurisdiction | Classification | Why | Conditions |
|---|---|---|---|
| Nevada NSAC | `approved_ingest` | Official public-records results index; robots permits the paths used; facts (who fought, result, officials, scores, weights) are not copyrightable. The "All Rights Reserved" footer is honoured by **not redistributing documents**. | Boxing PDFs only; facts with attribution; Federal ID and physician/medical header lines dropped at parse time; forward runs once a day, ≤12 PDFs, 1.5 s apart |
| Florida FAC | `approved_ingest` | Same basis (Ch. 119 public records, robots permits). Copyright footer honoured the same way. | Pro boxing only; DOB and Federal ID columns dropped; suspension **period** only, never a reason |
| New Jersey SACB | `approved_ingest` | Official SACB page on njoag.gov; robots permits. | Only njoag.gov / nj.gov URLs (nj.gov `/oag/secure-pdf/` is robots-disallowed and never fetched); linked BoxRec or other record keepers are never followed or approved; result PDFs parsed since 2026-09-13 (`nj-sacb@1.1.0`) with federal IDs, injury notes, no-contact periods and the officials page dropped |
| Texas TDLR | `reference_only` | Copy conditions are explicit, but the results table loads from `/sports/_events-list.csv` and robots.txt disallows `/*.csv`. Public does not mean automation is welcome. | No automated access; human reference with agency, URL, copy date and non-endorsement |

**Still open for legal review:** the database-rights and commercial-display questions for public-records compilations. Any adverse finding flips the row to `blocked`, and the gates stop ingestion without a deploy.

---

## G. First-party promoter / event sources for upcoming cards (review 2026-09-13, migration 0016)

**Why these were reviewed.** Commission schedules give event facts (date, venue, promoter) but no pairings, and the 42 stored sportsbook events are upcoming fights. The only free first-party source of "A vs B" before fight week is the promoter.

**Method.**
- For each site: read the terms, robots.txt and one schedule page.
- No sign-ups, logins, contact or crawling.
- The fetch tool returns processed pages, so a person should confirm the quotes on the live page before relying on them legally.

| Source | Registry | Evidence | Upcoming cards published |
|---|---|---|---|
| Top Rank | `promoter_top_rank`: **blocked** | [Terms](https://www.toprank.com/terms-of-use): "you will not monitor, gather, copy, or distribute the Content … by using any robot, rover, "bot", spider, scraper, crawler …"; no commercial use | Headline only |
| Queensberry | `promoter_queensberry`: **blocked** | [Terms](https://queensberry.co.uk/policies/terms-of-service): prohibited "to spam, phish, pharm, pretext, spider, crawl, or scrape" | Headline only |
| BOXXER | `promoter_boxxer`: **blocked** | [Terms](https://www.boxxer.com/terms-conditions/): same "spider, crawl, or scrape" prohibition | None listed |
| Matchroom Boxing | `promoter_matchroom`: review_required | Only ticket/venue T&Cs found; no website-use grant; robots allows | Headline surnames |
| Golden Boy | `promoter_golden_boy`: review_required | [Disclaimer](https://www.goldenboy.com/disclaimer/): "Copying, disseminating and any other use … not permitted without the written permission"; the referenced terms of use return 404 | Headline only |
| Premier Boxing Champions | `promoter_pbc`: review_required | [Terms](https://www.premierboxingchampions.com/terms-of-use): one-copy licence, no distribution; robots `Crawl-delay: 10` | Full names + co-features |
| Ohashi / Phoenix Promotion | `promoter_ohashi`: review_required | No terms or robots.txt; "All rights reserved" | Full cards |
| Riyadh Season | `promoter_riyadh_season`: review_required | Terms page script-rendered, unreadable | Not checked |
| Most Valuable Promotions | `promoter_mvp`: **reference_only** | robots `Content-Signal: search=yes,ai-train=no,use=reference` (EU DSM Art. 4 reservation); terms page 403 | Not checked |

**Result: no promoter source is approved, and all are disabled.**
- **Engineering is ready:** the upcoming-card contract (`shared/adapters/promoters/contract.mjs`) and cross-source event attachment are built and tested with synthetic sources, so an adapter can be added once a source is approved.
- **Path forward:** a written permission request, which is free and needs owner approval to send, to the least-restrictive candidates (PBC, Matchroom, Ohashi).
- **Human reference noted during review, not used as identity evidence:**
  - PBC lists Isaac Cruz vs **Nestor Bravo** (the sportsbook market says Sergio Rio Jimenez).
  - PBC lists **Jermall** Charlo vs Koen Mazoudier (the market says **Jermell**).
  - These disagreements are why the odds matcher never matches a different given name.

### G.1 Permission requests (2026-09-13): drafted, NOT sent

- **Drafts:** PBC, Matchroom Boxing and Ohashi (English + Japanese) are in [permission-requests/](permission-requests/README.md). They await owner review; nothing has been sent and no permission exists.
- **Top Rank, Queensberry, BOXXER:** stay `blocked` (explicit anti-scraping terms).
- **Golden Boy, Riyadh Season:** stay `review_required` and disabled.
- **Most Valuable Promotions:** stays `reference_only`.

### G.2 Source-policy concerns noted 2026-09-13

- **Wasserman Boxing was not reviewed.** UK cards in the stored markets may be theirs; review it before assuming no source exists.
- **Research fetches:** the terms review used a web-fetch tool, not the PropBetEdge crawler. It read robots.txt, terms pages and one schedule page per site. Most Valuable Promotions' robots.txt disallows AI crawlers and its terms page returned 403, which was recorded and not bypassed. Future reviews of that site should stay human-only.
- **Card mismatches:** PBC's published card disagrees with the stored sportsbook markets twice (Isaac Cruz's opponent; Jermall vs Jermell Charlo). Sportsbook participant names are not reliable identity evidence; the matcher's given-name guard is the mitigation.
- **Personal data in review files:** identity-review evidence contains boxers' stated hometowns (city level, from public commission sheets). Batch files stay in the private repository and staging. They are never published or exposed through the gateway or newsroom.
- **Reviewer names are stored** with human decisions (staff attribution). Keep them to a name or handle; no contact details.
- **Ohashi:** no official contact channel was identified during the review. Do not guess an address.
