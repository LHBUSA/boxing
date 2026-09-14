# Titles + Rankings intelligence: source research and dry run (2026-09-14)

**Status: research and dry run only.**
- Nothing was written to staging or production. No sanctioning-body adapter is enabled; `shared/adapters/rankings/registry.mjs` still throws.
- WBC was not inspected beyond `robots.txt`, one status probe of its home page, and search-engine snippets.
- WBA, IBF and WBO public pages were fetched once, at a low rate (IBF with its 10 s crawl delay), for inspection.
- Raw copies stayed in the session scratchpad, not in Git.

Builds on `docs/TITLES_RANKINGS.md` (model 0006, built and tested) and `docs/sources/sanctioning.md` (source map 2026-09-13).

## 1. Source-rights decision matrix

| | WBC | WBA | IBF | WBO |
|---|---|---|---|---|
| Champion source | "WBC Status by Division <Month Year>" and "WBC Official Mandatory Status" posts; division pages `/en/<division>/` | `https://www.wbaboxing.com/current-wba-champions` | `https://www.ibf-usba-boxing.com/champions/`, plus `champ` / `interim_champ` in each ratings record | `https://wboboxing.com/male-champions/` (and `/female-champions/`) |
| Rankings source | Monthly PDF `https://wbcboxing.com/mailing/<year>/WBC_RATINGS_<MONTH>_<year>.pdf` (irregular names, e.g. `WBC_RATINGS_JUNE_2026_.pdf`) | `https://www.wbaboxing.com/wba-ranking` (HTML; POST `dates=YYYY:M:` for past months; PDF download) | `https://www.ibf-usba-boxing.com/wp-json/ratings/v1/filter?weight=<slug>&org=ibf[&ppp=-1]` (the JSON the `/ratings/` page reads) | Male ratings PDF `https://wboboxing.com/wborankings/report/<token>/RankingReportMale`, linked from `/rankings/` (year/month POST form for the past) |
| Format | PDF + WordPress HTML | Server-rendered HTML (+ PDF) | JSON (undocumented, public, same-origin) | dompdf PDF with a text layer + HTML champion cards |
| Cadence | Monthly ratings; status posts ad hoc; mandatory rulings at conventions and board decisions | Monthly ("Ranking as of AUGUST 2026", dated August 31st, 2026) | Monthly, posted about the 8th for the previous month ("Ratings posted on 09/08/2026. Based on results from 08/1/2026 to 08/31/2026") | Monthly-ish ("As of August 28, 2026"); champion cards ad hoc |
| History | Monthly PDFs in the search index back to at least 2025 | Month selector back to January 2000 (gaps in 2003/2005) | 246 monthly heavyweight records, Dec 2005 to Aug 2026, in one request | POST form (2000 on per earlier map, not re-tested); explanations archive is old (2016-17) |
| robots.txt (2026-09-14) | `User-agent: *` Allow `/` with `Content-Signal: search=yes, ai-train=no, use=reference`; `Disallow: /` for ClaudeBot, GPTBot, CCBot, Google-Extended, Applebot-Extended, Bytespider, Amazonbot, meta-externalagent. Reservation under EU DSM Art. 4 | Allow all except `/wp-admin/` | `Crawl-delay: 10`; `/weight-class/`, `/promoter/`, `/location/`, `/author/`, `/thank-you/` disallowed; `/wp-json/` not disallowed | Allow all |
| Terms / rights text | No terms page found; privacy notice only; the robots content signals are the operative machine-readable reservation | "Important Legal Information": content "provided for informational purposes only… not binding… the user must always request official certification". © 1998-2026 WBA. No reuse licence, no prohibition on factual reuse | "All Rights Reserved" footer; privacy policy only; no terms of use | "Legal Info" heading with no terms text; copyright footer; no terms of use |
| Automation posture | **Reference only. Needs written permission from the WBC before any collection.** AI crawlers are explicitly disallowed and `use=reference` limits AI consumption; this is not a site to work around | **Owner review.** Technically clean HTML; no prohibition found; facts only, with attribution | **Owner review.** Public JSON; no terms; the endpoint is undocumented and could change without notice. Respect `Crawl-delay: 10` | **Owner review.** Allow-all robots; the PDF link carries a token that must be taken from `/rankings/` each time, never guessed |
| Official ID for boxers | none found | `wba-boxer-profile/?id=<int>` (stable) | none (name, country, US state) | none (name, country) |

Other sources in the 2026-09-13 map are unchanged:
- **The Ring:** blocked; its terms ban scraping.
- **TBRB:** reference only.

Neither is a sanctioning body, and neither is ingested as one.

## 2. Title vocabulary, exactly as each body publishes it

| Body | Own belt / status words | Mandatory / eliminator wording | Division names (examples) |
|---|---|---|---|
| WBC (snippets only) | Champion, Interim Champion, Champion in Recess, Franchise Champion, Emeritus Champion, Silver, plus regional (International, etc.) | "WBC Official Mandatory Status" lists (for example, updated January 27th, 2026) and convention rulings. Eliminators are named in those posts | Bridgerweight is a WBC division |
| WBA | Ranking page: WBA SUPER CHAMPION, WBA WORLD CHAMPION, WBA INTERIM CHAMPION, VACANT. Champions page: WBA Super World, WBA World, Interim WBA, WBA Gold, Champion in recess. Regional tags on ranked boxers: GOLD, GOLD INT, INT, C/LA, C/NA, C/USA, C/A, NABA, OC, CON, I/C, BALTIC, OCEANIA, Ibero-American | `/mandatory-fights` page, which returned HTTP 500 on 2026-09-14 and on 2026-09-13; nothing in the lists | HEAVYWEIGHT "Over 224 Lbs", BRIDGERWEIGHT, CRUISERWEIGHT 200, SUPER WELTERWEIGHT 154… |
| IBF | CHAMPION, INTERIM CHAMPION (`interim_champ`), TITLE VACANT; ratings slots "NOT RATED" | The champion record has three dates: "Title won", "Mandatory" (a due date, **no challenger named**) and "Defended" | HEAVYWEIGHT "(OVER 200LBS)", LT. HEAVYWEIGHT, S. MIDDLEWEIGHT, JR. MIDDLEWEIGHT; API slugs `jr-middleweight`… |
| WBO | Ratings PDF: CHAMPIONS, "(Interim)", "(Sup. Champion)", VACANT; "**" regional champions outside the numbers. Champion cards: INTERIM, "Champion since", "Previous champion", "Number of Defenses"; "Undisputed Super Champion" appears in card prose | "Next Mandatory:" on each card, e.g. "Mandatory vs Moses Itauma", "Voluntary Period", "TBD", "Suspension Period". A "Mandatory Challenger Request" form exists | HEAVYWEIGHT "(Over 201 lbs)", JR. HEAVYWEIGHT (200), LT. HEAVYWEIGHT, SUP. MIDDLEWEIGHT, MINI-FLYWEIGHT |

Consequences for the model:
- **Heavyweight lower limits differ.** WBA: over 224 lb (it has bridgerweight). IBF: over 200. WBO: over 201. Each body's limit stays on its snapshot.
- **WBA Super and WBA World are two WBA lineages.** A WBO "Super Champion" is the WBO world champion with an honorific, not a separate belt.
- **"Champion in recess" is a holder status.** It is not a belt tier, and the WBA does not say which belt it would return to.

## 3. What the dry run found (2026-09-14 documents)

The dry run used current WBA, IBF and WBO documents for heavyweight, light heavyweight, super middleweight, middleweight, welterweight and lightweight. The IBF heavyweight history was also parsed.
- Full normalized output: `scripts/titles/dry-run.mjs --raw=<dir> --out=<dir>` → `titles-rankings-dry-run.json`, kept in the session scratchpad, not committed.
- Samples: §9.

**Cross-body disagreement is normal, and each body prints its own version of the others.**
- **WBC light heavyweight and super middleweight:** WBA and WBO say David Benavidez and Christian Mbilli. IBF's record says TITLE VACANT for both.
- **WBC welterweight:** WBA and WBO say Ryan Garcia. IBF says Teofimo Lopez, whom the WBA lists as its own WBA Super champion.
- **WBO middleweight:** the IBF record says Zhanibek Alimkhanuly. WBA and the WBO ratings PDF say Denzel Bentley.
- **IBF lightweight:** the WBA page says Raymond Muratalla. IBF says TITLE VACANT, and so does WBO. WBO ranks Muratalla #1 at junior welterweight.
- **Name forms:** "DMITRY BIVOL" (WBA) vs "Dmitrii Bivol" (IBF, WBO). Surfaced as `differs_name_form_same_surname`; never merged by name.

**The same body can disagree with itself.**
- **WBO middleweight:**
  - Ratings PDF: champion DENZEL BENTLEY.
  - Champions page: ZHANIBEK ALIMKHANULY as champion ("Next Mandatory: Suspension Period", champion since November 12, 2022) and Denzel Bentley as INTERIM (since April 4, 2026).
- **WBO heavyweight:** the PDF prints "DANIEL BUBOIS"; the card says "Daniel Dubois".
- **WBA super featherweight:** the ranking page says WORLD Anthony Cacace and INTERIM Elnur Samedov. The champions page says Super World Cacace and World Samedov.
- **WBA light flyweight:** the ranking page says the WORLD belt is VACANT; the champions page says Daiya Kira holds it.

**Source hygiene.**
- **IBF keeps dates on vacant records.** Lightweight: `TITLE VACANT,,;06/07/2025`. Heavyweight in June and July 2026: `06/01/2024`. The parser ignores these dates and records the fact.
- **The WBA ranking page hides a row in an HTML comment** (Gervonta Davis, "CHAMPION IN RECESS"). Commented markup is not treated as published.
- **The WBO PDF has a division the first parser did not know** (MINI-FLYWEIGHT). Its rows were merged into light flyweight until the parser was changed. An unknown label now opens its own flagged division.

**Snapshots over time (IBF heavyweight, monthly records):**

| Results month → | Title change | Ranking change |
|---|---|---|
| 2026-05 → 2026-06 | `became_vacant` (previous holder Oleksandr Usyk); cause **not stated** | Jarrell Miller in, Brandon Moore out |
| 2026-06 → 2026-07 | none | none |
| 2026-07 → 2026-08 | `filled`: Filip Hrgovic, "Title won" 08/29/2026 | Hrgovic leaves the numbered list; two new entrants |

**An existing bug found.** `shared/rankings/import.mjs parseDivisionLabel` mapped IBF and WBO abbreviations to the wrong division:
- "LT. HEAVYWEIGHT" became heavyweight.
- "S. MIDDLEWEIGHT" and "SUP. MIDDLEWEIGHT" became middleweight.
- "Lt. Flyweight" became flyweight.

Fixed in this change, with tests. No ranking source is enabled, so no data was affected.

## 4. Canonical model recommendation

Keep the 0006 model and add what the research shows is missing. **None of this is applied**; it is a proposal for the migration that would follow owner approval.

| Concept | Today (0006) | Recommendation |
|---|---|---|
| Sanctioning body | `boxing_organizations` (kind `sanctioning_body`, scope `world`) | Keep. Add each body's source keys per document type (champions, ratings, rulings) |
| Weight division | `boxing_weight_classes` + `parseDivisionLabel` | Add `boxing_org_divisions` (org, native label, canonical class key, native limit text, lower/upper lb as published). Heavyweight limits differ per body; bridgerweight exists only for WBC and WBA |
| Title type | `boxing_titles.tier` + `source_native_label` | Add `boxing_org_designations` (org, native label, tier or null, holder status, honorific). Unknown labels go to review, never guessed. Add tier `in_recess`? **No.** Use holder status `in_recess` with tier null |
| Champion / title status | `boxing_title_events` (append-only) → derived reigns | Keep the facts. Add `boxing_title_status_snapshots` (append-only): one row per body document × division × belt, with holder source name + fighter id (resolved or null), status (`held`, `vacant`, `in_recess`, `unknown`), `reign_start_on` and its basis, last defense, previous holder as printed, content hash, retrieved at. Title events are proposed from snapshot diffs and confirmed by review. A snapshot never writes a reign |
| Reign start | derived from events | Sourced only: IBF "Title won", WBO "Champion since". The WBA publishes none on these pages. A reign start from a bout needs the bout |
| Vacancy | `vacated` / `relinquished` / `stripped` events | Snapshot diff → `vacated` with `reason_public` null. `relinquished` or `stripped` only when an official statement says so (a resolution or ruling with its URL) |
| Interim / regular / super | tiers `interim`, `regular`, `super`, `franchise`, `emeritus`, `silver`, `gold` | Keep, per body only. The WBO "Super Champion" honorific is not a tier |
| Ranking position | `boxing_ranking_snapshots` / `entries` (position, rank_label, is_vacant, designation, mandatory) | Keep. Also store: `not_rated` (IBF slot), entries outside the numbered list (WBO `**`), the regional tag as its own column, the org's boxer id (WBA), and `division_limit_text`. The champion is never one of the numbered entries |
| Mandatory challenger | `entries.mandatory` boolean | Add `boxing_title_mandatory_statements` (org, belt, as printed, challenger source name + fighter id, status text, due date, basis, source URL, stated on). From WBO "Next Mandatory", IBF "Mandatory" due date and WBC mandatory-status posts. Never from rank #1 |
| Eliminator | none | A `kind = 'eliminator'` statement in the same table, only from an official post or ruling |
| Title bout | `boxing_bout_titles` | Keep. A title bout is linked only when an official commission sheet or body statement names the belt |
| Title change | `boxing_title_events` + news mapping | Keep. Changes come from snapshot diffs reviewed into events, or from a result with the sanctioned belt |
| Claims about other bodies | none | Add `boxing_title_claims` (claimant org, document, about org, division, name or VACANT, as printed, as of). Display and disagreement only; never a title fact |
| Source snapshot | ranking snapshots carry a content hash and revisions | Same pattern for status snapshots and claims: content hash, `retrieved_at`, `published_on`, `as_of`, supersession on correction |
| Effective date / superseded | `effective_on`, `supersedes_id` | Keep for all three new tables |

**Undisputed and unified** (`pbe_undisputed@1`) stay PropBetEdge-derived:
- Computed from the four bodies' own current status snapshots, and only when all four exist and are fresh.
- Otherwise the result is `not_derivable` with the reason ("own statement unavailable for: wbc").
- The UI labels it "PropBetEdge-derived from each body's own title holdings".

### How the model handles each case

| Case | Handling (seen in the dry run where noted) |
|---|---|
| Full champion | Belt `world` (WBA `regular` / `super`) `held`, with holder as printed and the printed reign start (IBF "Title won", WBO "Champion since") |
| Interim champion | Separate lineage `interim` of that body (WBA Albert Ramirez, WBO Callum Smith) |
| Regular / super | WBA only: two lineages at once (light heavyweight Bivol Super + Benavidez World + Ramirez Interim). WBO "Sup. Champion" is an honorific on the world belt |
| Vacant title | `vacant` status with no holder. Dates printed on a vacant record are ignored and noted (IBF lightweight) |
| Stripped / relinquished | Never inferred. A snapshot diff gives `became_vacant`, cause not stated (IBF heavyweight, June 2026). The cause is recorded only from an official statement |
| Fighter moving divisions | Belts are per body × division. Benavidez holds WBA Super cruiserweight **and** WBA World light heavyweight on the same page. Alimkhanuly is WBO #1 at super middleweight while the WBO champions page still lists him at middleweight. Identity is one fighter id, never two |
| Champion absent from numbered rankings | All three bodies list champions outside the numbers. A new champion's diff shows `removed` from the list (Hrgovic, Aug 2026). WBO ranks former champion Usyk #1 |
| Multiple sanctioned titles in one division | Four lanes plus several WBA lineages. A boxer holding several (Bivol: WBA Super + IBF + WBO) appears in each lane from each body's own statement |
| Source disagreement | Each lane uses only its body's own documents. What others say is a claim marked `agrees`, `differs`, `differs_name_form_same_surname`, `blank` or `no_own_statement_to_compare`. Intra-body conflicts (WBO middleweight, WBA super featherweight) are flagged and block automated events until reviewed |
| Ranking snapshot changes | Monthly snapshots are append-only. `diffRankings` gives moved / new / removed. Title diffs give became_vacant / filled / holder_changed |

## 5. Proposed ingestion architecture (after approval, per body)

Each body is behind its own rights decision (`boxing_sources` row + review). A disabled body's adapter keeps throwing.

1. **Worker `boxing-rankings` (exists) gets one scheduled adapter per approved body.** It is not added to the commission Worker.
   - **Cadence:** daily probe with conditional GET (ETag / Last-Modified / content hash), because rankings change monthly and champions ad hoc.
   - **Politeness:** IBF waits 10 s between requests; WBA and WBO wait at least 3 s.
   - **Limits:** no retries beyond the commission policy (2 on connection reset), never a spoofed user agent.
2. **Fetch → store raw document** (append-only revision with sha256), as for commissions.
3. **Parse** with the dry-run parsers in `shared/adapters/sanctioning/` → status snapshots, ranking documents and claims.
   - Fail closed on unknown division or designation labels, empty lists, or HTML served instead of JSON/PDF.
4. **Identity:**
   - WBA: its boxer id maps once through review.
   - IBF / WBO: name + country + division + prior snapshot, through the existing ranking import (lookup only, never creates).
   - Unresolved entries keep `source_name` and go to the identity review queue.
5. **Diff** against the previous snapshot of the same body, document and division → `title_status_changes` and `ranking_changes`.
   - Title changes are **proposals** in a review queue. They become `boxing_title_events` after review, or automatically only when an official commission result already records the belt changing hands in that bout.
6. **Intra-body conflicts** (two documents of one body disagree) block automated proposals for that division until reviewed.
7. **Freshness:** each lane carries its document's `published_on` / `as_of` / `retrieved_at`. A lane older than 45 days shows as stale.
8. **WBC:** no fetch. The WBC lane shows "WBC standings not shown: source not licensed" plus other bodies' claims, clearly labelled as claims, until the WBC grants permission.

## 6. Product contract: /titles and /rankings

The existing pages stay. The gateway read gains the source-native fields.

`GET site/titles?weight_class=<key>&gender=male|female`:

```json
{
  "division": { "key": "light_heavyweight", "name": "Light Heavyweight", "limits_by_body": { "wba": "175 Lbs", "ibf": "175 LBS", "wbo": "175 lbs" } },
  "lanes": [
    { "body": "wbc", "state": "not_licensed", "note": "WBC standings are not shown until the WBC grants permission.",
      "claims_by_other_bodies": [{ "by": "wba", "says": "DAVID BENAVIDEZ", "as_of": "2026-08-31" }, { "by": "ibf", "says": "VACANT", "as_of": "2026-08-31" }] },
    { "body": "wba", "state": "current", "freshness": { "published_on": "2026-08-31", "retrieved_at": "…", "stale": false },
      "belts": [
        { "designation": "WBA Super World", "tier": "super", "status": "held", "holder": { "name": "Dmitry Bivol", "fighter": "…public id or null" }, "reign_start": null, "mandatory": null },
        { "designation": "WBA World", "tier": "regular", "status": "held", "holder": { "name": "David Benavidez" } },
        { "designation": "Interim WBA", "tier": "interim", "status": "held", "holder": { "name": "Albert Ramirez" } }],
      "conflicts_within_body": [], "claims_by_other_bodies": [{ "by": "ibf", "says": "Dmitrii Bivol", "agreement": "differs_name_form_same_surname" }],
      "next_title_bout": null },
    { "body": "ibf", "state": "current", "belts": [{ "designation": "Champion", "status": "held", "holder": { "name": "Dmitrii Bivol" },
      "reign_start": { "on": "2017-11-11", "basis": "IBF champion record \"Title won\"" }, "mandatory": { "due_on": "2024-10-28", "challenger": null } }] },
    { "body": "wbo", "state": "current", "belts": [
      { "designation": "Champion", "status": "held", "holder": { "name": "Dmitrii Bivol" }, "reign_start": { "on": "2025-02-22", "basis": "WBO \"Champion since\"" }, "mandatory": { "as_printed": "Callum Smith", "challenger": { "name": "Callum Smith" } } },
      { "designation": "Interim Champion", "status": "held", "holder": { "name": "Callum Smith" } }] }
  ],
  "derived": { "rule": "pbe_undisputed@1", "status": "not_derivable", "reason": "WBC standings not licensed", "label": "PropBetEdge-derived from each body's own title holdings" }
}
```

`GET site/rankings?organization=wba|ibf|wbo&weight_class=<key>`:
- **Returns:** `{ organization, division, snapshot: { published_on, as_of, source_url, retrieved_at }, champions_outside_list: [...], entries: [{ position, rank_label, name, fighter, country, regional_tag, not_rated }], outside_numbered_list: [...], changes_since_previous: [...], history: [{ as_of, snapshot_id }] }`.
- **WBC:** `state: "not_licensed"`.

**UI behaviour**
- **Title Map:** division ladder, then four lanes **WBC | WBA | IBF | WBO**, always in that order. Each lane shows:
  - every belt that body publishes, with its exact designation
  - holder, or VACANT
  - reign start only if printed, with its basis in a tooltip
  - mandatory only if stated: the named challenger, or the status/due date as printed
  - next title bout only when an official schedule or body statement links the belt to a bout
  - a freshness chip ("WBA · Aug 31, 2026")
- **Claims and conflicts:**
  - Claims by other bodies sit behind a "What the other bodies say" disclosure, with agree/differ marks.
  - Conflicts inside one body show a warning chip ("WBO pages disagree"), with both documents linked.
- **Unification strip:** "PropBetEdge-derived" badge; `not_derivable` shows its reason.
- **Rankings:** one body at a time (tabs WBA / IBF / WBO, plus WBC not licensed), showing that body's own list and snapshot date.
  - NOT RATED slots stay visible.
  - Regional tags stay as printed.
  - Champions appear above the list, never numbered.
  - A month selector for history, and a change list against the previous month.
- **Never shown:** a merged cross-body ranking; a champion or mandatory inferred from rank or from another body's claim; lineage the body did not publish.

## 7. Unresolved source questions

1. WBC permission: will the WBC allow collection of its ratings and status posts, and on what terms (attribution, frequency, AI use given `use=reference`)?
2. **WBO middleweight:** is Alimkhanuly or Bentley the WBO champion? The two WBO documents disagree. Ask the WBO, or wait for the next ratings PDF.
3. **WBA light flyweight and super featherweight:** which WBA page is authoritative when they disagree, the monthly ranking or the champions page?
4. The IBF JSON endpoint is undocumented. Would the IBF confirm that programmatic use at 10 s intervals is acceptable?
5. The WBO ratings PDF link carries a token (`b368b21b…`). Is it stable per publication, or per session?
6. WBA `/mandatory-fights` has returned HTTP 500 on two days. Is there another official source for WBA mandatories?
7. WBO champion pages carry prose ("Undisputed Super Champion"). Is that an official WBO designation or narrative text? The dry run treats it as narrative.
8. Female divisions and regional belts are out of scope for this dry run.

## 8. Owner approvals needed

1. **WBA:** approve or deny `wba_official` for automated monthly collection of `/wba-ranking` and `/current-wba-champions` (facts only, attribution, no redistribution of pages or PDFs).
2. **IBF:** approve or deny `ibf_official` for use of the public ratings JSON at Crawl-delay 10, including the 2005-2026 history backfill.
3. **WBO:** approve or deny `wbo_official` for the ratings PDF (token taken from `/rankings/` each run) and `/male-champions/`.
4. **WBC:** approve sending a permission request (draft to be written; not sent). Until then the WBC lane shows not licensed plus labelled claims.
5. **Display policy:** may the Title Map show other bodies' claims about the WBC lane? It is factual, but a claim.
6. **Policy:** should `undisputed` stay `not_derivable` while the WBC is unlicensed? This is the recommendation.
7. **Schema:** approve the migration outlined in §4 (org divisions, designations, title status snapshots, mandatory statements, title claims), built and tested locally before any staging apply.
8. **Review queue:** approve title-change proposals going to human review, not automatic events. Automatic only when an official commission result records the belt changing hands.

## 9. Sample normalized division lanes (dry run, 2026-09-14 documents)

Rankings are truncated to the top five here. Each lane is built only from that body's own documents.

### heavyweight
| Lane | Own statement (document) | Reign start (as printed) | Mandatory (as printed) | Claims by other bodies |
|---|---|---|---|---|
| WBC | not ingested (source not licensed) | — | — | WBA: AGIT KABAYEL; IBF: Agit Kabayel; WBO: AGIT KABAYEL (nothing to compare with) |
| WBA | WBA WORLD CHAMPION: MURAT GASSIEV [ranking]; WBA World: MURAT GASSIEV, WBA Gold: NELSON HYSA [champions] | — | — | IBF, WBO agree |
| IBF | CHAMPION: Filip Hrgovic [rating] | 2026-08-29 | — | WBA, WBO agree |
| WBO | CHAMPION: DANIEL BUBOIS [ratings]; Daniel Dubois [champions] (**intra-WBO spelling conflict**) | 2026-05-09 | Moses Itauma | WBA, IBF agree |

Rankings:
- **WBA** (Aug 2026): 1 Jarrell Miller, 2 Tyson Fury, 3 Anthony Joshua, 4 Vartan Arutyunyan, 5 Nelson Hysa (GOLD).
- **IBF** (results month Aug 2026, posted 09/08): 1 Frank Sanchez, 2 NOT RATED, 3 Anthony Joshua, 4 Bakhodir Jalolov, 5 Tyson Fury.
- **WBO** (as of Aug 28, 2026): 1 Oleksandr Usyk, 2 Tyson Fury, 3 Anthony Joshua, 4 Fabio Wardley, 5 Moses Itauma (Int-Cont).

### light heavyweight
| Lane | Own statement | Reign start | Mandatory | Claims by other bodies |
|---|---|---|---|---|
| WBC | not ingested | — | — | WBA: DAVID BENAVIDEZ; IBF: VACANT; WBO: DAVID BENAVIDEZ (**claims disagree**) |
| WBA | Super: DMITRY BIVOL; World: DAVID BENAVIDEZ; Interim: ALBERT RAMIREZ (both WBA pages agree) | — | — | IBF, WBO: "Dmitrii Bivol" (same surname, different name form) |
| IBF | CHAMPION: Dmitrii Bivol | 2017-11-11 (as printed) | due 2024-10-28 (no challenger named) | WBA: name form differs; WBO agrees |
| WBO | CHAMPION: DMITRII BIVOL; Interim: CALLUM SMITH | Bivol 2025-02-22; Smith 2025-02-22 (as printed) | Bivol: Callum Smith; Smith: Dmitrii Bivol | WBA: name form differs; IBF agrees |

### super middleweight
| Lane | Own statement | Reign start | Mandatory | Claims |
|---|---|---|---|---|
| WBC | not ingested | — | — | WBA: CHRISTIAN MBILLI; IBF: VACANT; WBO: CHRISTIAN MBILLI (**claims disagree**) |
| WBA | World: JAIME MUNGUIA; Gold: NIKITA ZON | — | — | agree |
| IBF | CHAMPION: Osleys Iglesias | 2026-04-09 | — | agree |
| WBO | CHAMPION: HAMZAH SHEERAZ | 2026-05-23 | Voluntary Period | agree |

WBO ranks Zhanibek Alimkhanuly #1 here, while the WBO champions page still lists him as its middleweight champion.

### middleweight
| Lane | Own statement | Reign start | Mandatory | Claims |
|---|---|---|---|---|
| WBC | not ingested | — | — | WBA, IBF, WBO: CARLOS ADAMES |
| WBA | World: ERISLANDY LARA; Gold: VADIM TUKOV | — | — | agree |
| IBF | CHAMPION: Aaron McKenna | 2026-08-08 | — | WBA agrees; WBO leaves IBF blank |
| WBO | **Conflict.** Ratings PDF: champion DENZEL BENTLEY. Champions page: ZHANIBEK ALIMKHANULY champion + Denzel Bentley INTERIM | Alimkhanuly 2022-11-12; Bentley 2026-04-04 | Suspension Period; TBD | WBA: Bentley; IBF: Alimkhanuly |

### welterweight
| Lane | Own statement | Reign start | Mandatory | Claims |
|---|---|---|---|---|
| WBC | not ingested | — | — | WBA: RYAN GARCIA; WBO: RYAN GARCIA; IBF: Teofimo Lopez (**claims disagree**) |
| WBA | Super: TEOFIMO LOPEZ; World: JACK CATTERALL; Gold: MOHAMED MIMOUNE | — | — | agree |
| IBF | CHAMPION: Liam Paro | 2026-06-22 | — | agree |
| WBO | CHAMPION: DEVIN HANEY | 2025-11-22 | Keyshawn Davis | agree |

### lightweight
| Lane | Own statement | Reign start | Mandatory | Claims |
|---|---|---|---|---|
| WBC | not ingested | — | — | WBA: VACANT; IBF: VACANT; WBO: WILLIAM ZEPEDA SEGURA (**claims disagree**) |
| WBA | World: VACANT; Gold: FRANCISCO FONSECA; GERVONTA DAVIS champion in recess (champions page only; commented out on the ranking page) | — | — | IBF says Davis; WBO says VACANT |
| IBF | CHAMPION: VACANT (a 06/07/2025 "Title won" date on the vacant record is ignored) | — | — | WBA: RAYMOND MURATALLA (**differs**); WBO agrees VACANT |
| WBO | CHAMPION: ABDULLAH MASON | 2025-11-22 | Joe Cordina | agree |

## 10. Code in this change (dry run only)

- `shared/adapters/sanctioning/vocabulary.mjs`: per-body division and designation vocabulary.
- `wba.mjs`, `ibf.mjs`, `wbo.mjs`: pure parsers, no fetch.
- `shared/titles/sanctioning-snapshot.mjs`: status snapshots, lanes, claims agreement, intra-body conflicts, snapshot diffs, conversion to the existing ranking import document.
- `scripts/titles/dry-run.mjs`: local files in, JSON out; no network or database.
- `shared/adapters/sanctioning/sanctioning.test.mjs`: 9 tests on synthetic fixtures.
- `shared/rankings/import.mjs`: abbreviated division labels fixed.
