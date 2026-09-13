# Boxing source acquisition matrix

Review date: **2026-09-13**. Next review is due 2026-12-13, or earlier if any terms-change notice arrives. Registry: `boxing_sources` + `boxing_source_rights_reviews` (migrations 0010, 0012).

**Method.** Public official pages were read directly. There were no sign-ups, no logins, no data-API calls (except The Odds API, which we already subscribe to) and no bulk scraping. One sample document was opened per commission result format. Quotes are verbatim from the official page or a dated archive of it, and archives are named where used. **This is not legal advice.** Public-records and database-rights questions are flagged for legal review.

| Class | Meaning |
|---|---|
| **GREEN** | Official terms expressly permit our use (persistent storage, commercial first-party display, derived analytics, ML), possibly with conditions |
| **YELLOW** | Possibly permissible, but no express grant. Needs a plan/contract, outreach or legal review first |
| **RED** | Prohibited, or blocked without a licence |

Only **The Odds API** is enabled for collection. Every other external source stays disabled.
- `wikidata` has been enabled since issue #1, for identity only, and its seed worker is not deployed.
- The internal rows are PropBetEdge's own data.

## Summary

| Source | Class | Registry state | Key evidence | Next action |
|---|---|---|---|---|
| **A. The Odds API** | **GREEN (raw redistribution prohibited)** | `approved_ingest` / `approved`, **enabled**, `redistribution_allowed=false` | [Terms](https://the-odds-api.com/terms-and-conditions.html), last updated 2026-08-31 | Staging capture live; re-review 2026-12-13 |
| **B. BoxRec** | **RED** | `blocked` / `prohibited` | [Terms (Wayback 2025-12-29)](http://web.archive.org/web/20251229101505/https://boxrec.com/en/policies/terms_conditions/public) | Business licensing outreach (help@boxrec.com). No scraping |
| **C. Boxing Data API** (boxing-data.com via RapidAPI) | **YELLOW** | `review_required`, disabled | [RapidAPI pricing](https://rapidapi.com/bengroves1993/api/boxing-data-api/pricing) (`termsOfService: null`); [RapidAPI terms](https://rapidapi.com/page/terms) (2026-05-13) | Written licence + provenance/IP warranty from hello@boxing-data.com before any plan |
| **D. WBC** | YELLOW | `review_required` | [Ratings](https://wbcboxing.com/campeones-y-ratings/varonil/completo/); privacy policy only | Written permission; legal review |
| **D. WBA** | YELLOW | `review_required` | [Rankings](https://www.wbaboxing.com/wba-ranking); [legal disclaimer](https://www.wbaboxing.com/important-legal-information) | Written permission; legal review |
| **D. IBF** | YELLOW | `review_required` | [Ratings](https://www.ibf-usba-boxing.com/ratings/); privacy policy only | Written permission; legal review |
| **D. WBO** | YELLOW | `review_required` | Rankings PDF on [wboboxing.com](https://wboboxing.com/); no terms page | Written permission; legal review |
| **E. CompuBox** | **RED** | `blocked` / `prohibited` | [Terms](https://app2.compuboxdata.com/terms-and-conditions) | Data-feed licensing inquiry |
| **F. Nevada (NSAC)** | YELLOW, strong | `nsac_nevada`, `review_required` | [Results 2026](https://boxing.nv.gov/results/2026_Results/) | Legal review; strip Federal IDs |
| **F. California (CSAC)** | GREEN for own content; results → BoxRec (RED) | `csac_california`, `review_required` | [Events](https://www.dca.ca.gov/csac/events/index.html); [ca.gov conditions](https://www.ca.gov/legal/conditions-of-use/) | CPRA request for result sheets |
| **F. New York (NYSAC)** | YELLOW | `nysac_new_york`, `review_required` | [Athletic commission](https://dos.ny.gov/athletic-commission) (403 to automated fetch) | FOIL request |
| **F. New Jersey (SACB)** | YELLOW, strong | `nj_sacb`, `review_required` | [Schedule & results](https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/) | Legal review; OPRA backfill; strip IDs |
| **F. Texas (TDLR)** | GREEN with conditions | `tdlr_texas`, `review_required` | [Disclaimer/copyright](https://www.tdlr.texas.gov/disclaimer.htm); [results](https://www.tdlr.texas.gov/sports/events/results/) | Verify result format; attribution + non-endorsement; no logos |
| **F. Florida (DBPR)** | YELLOW, strong | `florida_athletic_commission`, `review_required` | [Pro results](https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/) | Legal review; never store DOB/Federal ID |
| **F. BBBofC (UK)** | RED for results (BoxRec-provided); YELLOW for Board lists | `bbbofc_uk`, `review_required` | [Results](https://www.bbbofc.com/results) ("Provided by boxrec.com") | Outreach for champion lists / official returns |
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
- Self-serve subscription: 100,000 credits/month, 95,065 remaining after the first staging capture, shared with PropBetEdge NFL and UFC.
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

**Next:** business licensing outreach to BoxRec Limited (help@boxrec.com; boxrec@gmail.com is also listed). Ask for business terms and a written licence covering storage, display, derived analytics and ML.

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

**Decision:** YELLOW. Documentation is not approval. Do not subscribe for ingestion or persist any data until there is a written licence covering storage and retention after cancellation, commercial display, derived analytics and ML, plus a source-by-source provenance statement and IP warranty. Then legal review.

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

**Next:** licensing inquiry.

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

Each gets its own source row, adapter, attribution rule and PII stripping before enabling. The rows exist now, disabled.
