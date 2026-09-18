# Global Boxing History + Fighter Intelligence — V1 first deliverable

Status: **design + first vertical slice proven on a local database.** Staging is untouched (the commission natural-run gate
is open), production writes remain 0, and nothing here changes an existing parser, identity rule, recorder or model object.

Audit date 2026-09-15. Repo `LHBUSA/boxing`, staging Supabase `wpaxofilvbsjyrxrwjhg`.

Contents: [A](#a-coverage) coverage inventory · [B](#b-schema) schema inventory · [C](#c-sources) source map · [D](#d-rights)
rights risk map · [E](#e-missing) missing-data matrix · [F](#f-fighter) fighter identity · [G](#g-bout) bout identity ·
[H](#h-weight) weight-class ontology · [I](#i-titles) title/belt ontology · [J](#j-events) event/card ontology ·
[K](#k-geography) promoter / commission / jurisdiction · [L](#l-sequence) ingestion sequence · [M](#m-apis) APIs ·
[N](#n-slice) the vertical slice · [O](#o-isolation) model isolation and temporal integrity · [P](#p-decisions) owner decisions.

---

## A. Current historical coverage <a id="a-coverage"></a>

Everything on record today is 2020s and United States only. This is a forward-capture graph, not yet a history graph.

| Dimension | On record (staging, 2026-09-15) |
|---|---|
| Events | 209 · earliest 2020-02-15, latest 2026-09 |
| Bouts by year | 2020: 12 · 2021: 13 · 2022: 16 · 2023: 36 · 2024: 32 · 2025: 34 · 2026: 557 |
| Events by source | TN 86 (2020-2026), FL 41, PA 23, NJ 20, NV 18, MO 8 (all 2026 except TN) |
| Venues | 120, all `US`: TN 53, FL 22, PA 16, NJ 13, NV 9, MO 7 |
| Results (current) | 682. Methods: TKO 235, DECISION-unanimous 261, split 55, majority 30, KO 70, draws 20, NC 8, RTD 1, DQ 1 |
| Scorecards | 278 current; **round-by-round cards: 0** (no approved source publishes them) |
| Knockdowns / punch stats | 0 rows (CompuBox blocked; commissions do not print knockdowns) |
| Officials | 182, with 1,814 assignments |
| Fighters | 1,731 canonical; 0 with DOB/stance/reach; 69 with a proven Wikidata/Wikipedia identity |
| Identity review pending | 577 (mostly Tennessee, which prints no hometown) |
| Sanctioning documents | 1,083 for super welterweight alone; WBA 2000-01→, WBO 2000-01→, IBF 2005-12→, **WBC 2026-09 only** |
| Titles / bout titles | 0 / 0 — migration 0042 (which links commission title remarks) is not applied yet |
| Title reigns, title events | 0 / 0 — reigns are derived from confirmed title events; none has been confirmed |
| Hall of Fame inductions | 545 (IBHOF via Wikidata) |
| Amateur / Olympic | nothing; no source researched |

## B. Existing schema inventory <a id="b-schema"></a>

The canonical graph already covers most of the model. What matters for history:

- **Identity:** `boxing_fighters` (+ `merged_into_id`, merge guard), `boxing_fighter_identities` (namespace + external id),
  `boxing_fighter_aliases` (kinds name / nickname / transliteration / former_name / other), `boxing_fighter_name_keys`,
  `boxing_fighter_attribute_claims` (append-only, sourced), `boxing_identity_appearance_decisions` (A-D tiers, append-only),
  `boxing_identity_resolutions`, `boxing_identity_review_queue`, org identity candidates/decisions (0033-0038).
- **Events/bouts:** `boxing_events`, `boxing_venues` (+ `boxing_venue_aliases` with valid_from/to), `boxing_commissions`,
  `boxing_organizations` (+ aliases, facts, relations, media), `boxing_event_organizations`, `boxing_bouts`
  (`competition_class` professional/amateur/exhibition, `card_segment`, catchweight columns), `boxing_bout_participants`
  (side, participant_status, record entering), `boxing_card_changes` (26 append-only change types).
- **Outcomes:** `boxing_bout_results` (revisions + `supersedes_id`, `result_state`), `boxing_scorecards` +
  `boxing_scorecard_rounds`, `boxing_point_deductions`, `boxing_bout_knockdowns`, `boxing_bout_stat_coverage`,
  `boxing_bout_officials`, `boxing_weigh_ins`, `boxing_regulatory_actions`.
- **Titles/rankings:** `boxing_titles` (tier world/super/regular/interim/franchise/silver/diamond/gold/emeritus/regional),
  `boxing_bout_titles`, `boxing_title_events` (append-only) → `boxing_title_reigns_derived()`, the sanctioning document
  lane (`boxing_title_status_snapshots/_entries`, `boxing_org_divisions`, `boxing_org_designations`, claims, conflicts,
  diffs, proposals), `boxing_ranking_snapshots/_entries`.
- **Provenance:** `boxing_sources` (+ `boxing_source_rights_reviews`), `boxing_source_documents/_revisions`,
  `boxing_source_observations` (content-hash deduped), `boxing_observation_links`, `boxing_ingest_runs`,
  `boxing_worker_invocations`; append-only triggers everywhere (`boxing_install_append_only`, override logged).

**Gaps this deliverable closes** (migration 0043, additive): jurisdictions, a formal source capability registry,
time-aware weight-class definitions, a result ontology, title-remark classification beyond world titles, body-statement
runs, and the archive reads. **Gaps still open:** amateur/Olympic lane, knockdown detail (type, scorer), round-by-round
cards, fighter merge audit table, `boxing_titles.tier` has no `international` value (the WBC prints `WBC INT. CHAMPION`).

## C. Source map <a id="c-sources"></a>

| Source | Type / jurisdiction | Status | Approved facts | Method | Documented coverage | Cadence |
|---|---|---|---|---|---|---|
| `nsac_nevada` | commission US-NV | approved_ingest | events, bouts, results, round/time, judges' totals, referees, weigh-ins, deductions, title remarks, promoters as printed | PDF + iCal | index 2020→ | daily 11:40Z |
| `florida_athletic_commission` | commission US-FL | approved_ingest | results, officials, weigh-ins, suspension duration | PDF | ~1,230 PDFs | daily |
| `nj_sacb` | commission US-NJ | approved_ingest | schedule facts **(review scope)**; results parsed in practice | HTML + PDF | — | daily |
| `mo_office_of_athletics` | commission US-MO | approved_ingest | results, officials, weigh-ins, suspensions; totals not per judge | PDF | 2017→ | daily |
| `pa_state_athletic_commission` | commission US-PA | approved_ingest | results, referee, judges when 3 listed, weigh-ins, suspensions | PDF | 2024→ | daily |
| `tn_athletic_commission` | commission US-TN | approved_ingest | results, judges' totals, referee, weigh-ins, suspensions | PDF forms | 2020-01→ | daily |
| `tdlr_texas` | commission US-TX | reference_only | none | — | — | never |
| `wba_official` | sanctioning | approved_ingest | belts, holders, rankings, WBA boxer ids | HTML | 2000-01→ (311 months) | monthly |
| `ibf_official` | sanctioning | approved_ingest | ratings, champions, mandatories | JSON | 2005-12→ (248 months) | monthly |
| `wbo_official` | sanctioning | approved_ingest | ratings, champions | PDF/HTML | 2000-01→ (306 months) | monthly |
| `wbc_official` | sanctioning | approved_ingest | ratings, champions, reign start/last defense as printed | PDF/HTML | **2026-09 only** | monthly |
| `wikidata` | open data CC0 | approved_ingest | identity crosswalk, hall awards | SPARQL | — | on demand |
| `the_odds_api` | provider | approved_ingest | odds only; never identities or bouts | API | forward | 15 min |
| `boxrec`, `compubox` | reference / provider | **blocked** | none | — | — | — |
| Top Rank, Queensberry, BOXXER | promoters | **blocked** | none | — | — | — |
| Matchroom, PBC, Golden Boy, Ohashi, Riyadh, MVP | promoters | review_required / reference_only | none yet (Matchroom approved by owner for facts-only, pending the registry migration) | — | — | — |
| CSAC, NYSAC, BBBofC, JBC, ABC | commissions | review_required / unregistered | none | — | — | — |
| IOC / World Boxing / IBA / USA Boxing | amateur bodies | **not registered, never researched** | none | — | — | — |

The registry now lives in the database: `boxing_source_capabilities` (append-only) plus `boxing_source_registry_json()`,
which joins the rights review, the declared lanes, the **live** stored coverage and the **live** parser lineage.

## D. Rights and licensing risk map <a id="d-rights"></a>

| # | Risk | Severity | Detail | Action |
|---|---|---|---|---|
| 1 | **New Jersey result parsing exceeds its recorded rights review** | High | The 2026-09-13 review permits schedule facts; `nj-sacb@1.1.x` parses results, judges' totals and suspensions. No later review widens it. | **Closed 2026-09-15 by owner decision** (migration 0045): those lanes are `unresolved` / `review_scope_gap` and now fail closed at write time; the parser and the rows already stored are untouched. Re-open only after a recorded review. See `MODEL_SCOPE_GATE.md`. |
| 2 | WBC approval rests on an owner decision against a `use=reference` robots signal | Medium | Owner ruled no separate permission is required; robots also disallows AI crawlers by name. Collection uses normal unauthenticated HTTP, facts only. | Keep the decision recorded; re-review 2026-12-14. |
| 3 | Wikidata DOB | Medium | Wikidata is approved for identity including DOB, but the standing owner rule is that DOB is never stored. | Rule wins: the passport returns `date_of_birth: null, policy: not stored (owner rule)`. Confirm or lift. |
| 4 | Commission database rights for commercial display | Medium | Never legally reviewed for any commission. | Legal review before launch. |
| 5 | IBHOF verification fetches a site with no registry row | Low | `scripts/history/ibhof-wikidata.mjs --verify-sample` fetches ibhof.com. | Register the source or drop the verification fetch. |
| 6 | Research docs recommend states the registry does not have (`approved_reference`) | Low | Commons, LOC, Chronicling America, Smithsonian are rated `approved_ingest` in `docs/sources/history.json` but have no registry row, so they cannot write anything. | Register with real rows before any historical media/newspaper work. |
| 7 | BoxRec contamination | High (silent) | Wikipedia record tables and several commission sites cite BoxRec. | Existing rule holds: a fact whose only citation is boxrec.com is dropped; Wikidata P1967 is never read. |
| 8 | Amateur/Olympic sources unresearched | Medium | No terms have been read for IOC, World Boxing, IBA or USA Boxing. | Scope decision required before Phase 10 work. |

## E. Missing-data matrix <a id="e-missing"></a>

Lane × best available approved source (`✓` provided, `~` partial, `·` not provided, `✗` not permitted, `?` unverified):

| Lane | NV | FL | NJ | MO | PA | TN | Bodies | Wikidata | Gap |
|---|---|---|---|---|---|---|---|---|---|
| Event, venue, promoter as printed | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | · | broadcaster: no source at all |
| Bout, scheduled rounds, order | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | · | — |
| Result, method, round, time | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | · | — |
| Judges' totals | ~ | ? | ✓ | ~ | ~ | ✓ | · | · | MO cannot attribute totals to judges |
| Round-by-round cards | · | · | · | · | · | · | · | · | **no source**; NY State Archives B2499 is manual-only |
| Knockdowns / punch stats | · | · | · | · | · | · | · | · | **no source** (CompuBox ✗) |
| Weigh-in weights | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | · | — |
| Suspensions (duration only) | ? | ✓ | ✓ | ✓ | ✓ | ✓ | · | · | — |
| Titles at stake | ~ | ? | ~ | · | · | · | ✓ | · | commissions print remarks; bodies print holders |
| Title lineage (won/vacated/stripped) | · | · | · | · | · | · | ~ | · | derivable from month-to-month body statements only |
| Rankings | · | · | · | · | · | · | ✓ | · | — |
| Fighter identity ids | · | · | · | · | · | · | ~ | ✓ | commissions print names only |
| DOB / stance / reach / height | ✗ policy | ✗ | ✗ | ✗ | ✗ | ✗ | · | ~ | DOB excluded by owner rule |
| Amateur / Olympic career | · | · | · | · | · | · | · | ~ | **no source** |
| Pre-2017 professional bouts | · | · | · | · | · | · | · | · | **the central gap**: no approved source of historical bouts |

## F. Proposed fighter identity model <a id="f-fighter"></a>

`global_fighter_id` = `boxing_fighters.public_id` (`pbe_boxer_<32 hex>`), minted once and frozen by trigger. No parallel id
is introduced; determinism lives in the *keys* that resolve to it (source namespace + external id, appearance keys,
name keys), not in the surrogate.

- **Names** are rows, not columns: `boxing_fighter_aliases` (kind: name, nickname, transliteration, former_name, other)
  plus each source's own label on `boxing_fighter_identities.source_display_name` and each appearance's printed name. The
  passport returns all three with kind, verification state and source, e.g. for one fighter: `alias:name` "Sebastian
  Alexander Fundora" (as the regulator licenses him) and `source_label:wikidata.item` "Sebastian Fundora" (the common ring
  name), never merged into one "true" name. Proposed additions (not yet applied): alias kinds `licensed_name`,
  `ring_name`, `translation`, `maiden_name`, and a `script` column for non-Latin forms.
- **Merging** stays as built: identical or similar names never merge (tier C → review, tier D → hard conflict), evidence is
  DOB-free, decisions are append-only and confidence-scored, and merges are one-way with a guard.
- **Amateur and Olympic identities** attach as additional namespaces on the same canonical fighter; their bouts stay in a
  separate lane (`competition_class`), so a career passport can be continuous while the records stay separate.
- **Sanctioning-body identities** (`boxing_org_identity_*`) stay unresolved until a decision proves them: the WBC printing
  "SEBASTIAN FUNDORA" as champion does **not** link to our canonical fighter, and the archive reads say so explicitly.

## G. Proposed bout identity model <a id="g-bout"></a>

`global_bout_id` = `boxing_bouts.public_id`; `global_event_id`, `global_venue_id`, `global_commission_id`,
`global_official_id`, `global_title_id` likewise. Deterministic natural keys already exist per source
(`<event>|<slugA>|<slugB>[|n]`, with `|2` for a rematch on the same card) and are stored in `boxing_bout_identities`, so
the same bout observed by two sources attaches rather than duplicating. Every lane of a bout keeps its own provenance
(source, url, observation), results and scorecards are revision chains, card state changes append to
`boxing_card_changes`, and `boxing_possible_duplicate_bouts()` must stay at 0.

## H. Weight-class ontology <a id="h-weight"></a>

`global_weight_class_id` = `boxing_weight_classes.id` with `class_key`. New in 0043: `boxing_weight_class_definitions`
(append-only) carries **time-aware** limits — `limit_lb`, `valid_from`, `valid_to`, `organization_id` (null = general),
`native_label`, and a `basis` of `pbe_modern_reference` | `source_document` | `source_statement`. Only the present-day
reference is seeded, and `boxing_weight_class_as_of()` marks it `verified_for_date: false`: **we never claim a modern
limit was the limit in force on a historical date.** A sourced definition covering the date wins and is marked verified.
Body-native labels stay in `boxing_org_divisions` (WBA MINIMUM, WBC Superwelter/Paja, IBF mini-flyweight…). Catchweight
stays a bout fact (`contracted_weight_lb`, `is_catchweight`); `boxing_archive_bout_weights()` reports each corner's
official weight against the class limit and flags an over-limit weigh-in **without** reinterpreting it as a catchweight or
a missed weight.

## I. Title and belt ontology <a id="i-titles"></a>

`global_title_id` = `boxing_titles.public_id`, keyed `org:weight_class:gender:tier` — WBA super vs regular vs gold, WBC
franchise/silver/interim, regional and national belts stay distinct lineages; there is no generic "champion" flag.

Three evidence classes are kept apart and never merged:

1. **Commission statement** — the remark printed on an official results sheet. `boxing_classify_title_remark()`
   (`pbe_title_remark_ontology@1`) classifies the printed words: action (retained / won / won_vacant / unification /
   contested), the bodies named, scope (world, interim, continental, regional, national, silver, gold, youth,
   international) and the division. A body named inside a regional belt is **not** asserted to be its sanctioning parent.
2. **The body's own documents** — `boxing_archive_title_runs()` (`pbe_title_runs@1`) collapses consecutive identical
   monthly statements into runs, carrying holder as printed, the body's own `reign_start_on` and `last_defense_on`, the
   document kinds and both source urls. **A run is evidence, not a reign.**
3. **Confirmed title events** — `boxing_title_events` (append-only) remains the only thing that mints a reign
   (`boxing_title_reigns_derived`). Nothing in this layer creates one: the owner rule "do not auto-create title events"
   holds, and the slice proves `boxing_title_events` stays at 0.

`global_title_reign_id` therefore stays reserved for confirmed events; body runs carry a stable `run_key` instead.

## J. Event and card ontology <a id="j-events"></a>

`boxing_archive_card()` reconstructs a card as it happened: the event with venue (and aliases, and jurisdiction),
commission, organizations and promoters exactly as the sheet printed them, then every bout in sheet order — corners with
the printed name and hometown, weights against the class limit, the classified result with the source string kept,
judges' cards checked against the stated decision, officials, deductions, the knockdown lane's state, titles linked and as
printed, provenance per lane — plus PropBetEdge-derived card statistics. Cancellations, replacements, postponements and
venue changes already append to `boxing_card_changes` and surface through the Event Truth ledger (0042).

## K. Promoter, commission, jurisdiction and geography <a id="k-geography"></a>

New: `boxing_jurisdictions` (`global_jurisdiction_id`), codes ISO 3166-1 / 3166-2 (`US`, `US-NV`, `GB`), seeded for the
registered commissions, with `pbe_local` reserved for tribal and other bodies. `boxing_jurisdiction_json()` resolves a
venue (country + region code) or a commission (which stores only "Nevada") without altering either table. Venues keep one
physical identity with `boxing_venue_aliases` (former_name, sponsor_name, with valid_from/to) — a renamed arena is not a
new venue. Promoters remain "as listed on the sheet" plus canonical organizations where a source supports it; business
relationships are never asserted (`boxing_organization_relations` needs effective dates and provenance).

## L. Recommended ingestion sequence <a id="l-sequence"></a>

1. **Unblock the current gate**: the commission natural run must pass (Tennessee), then 0042, Event Truth staging, and the
   Matchroom forward-capture work already approved. Nothing here jumps that queue.
2. Apply 0043 to staging (registry, jurisdictions, ontologies, archive reads). Read-only; no backfill.
3. **Model-scope gate first** (see O) — before a single historical bout is ingested.
4. Deepen what is already approved, in this order: NV 2020-2025 backfill → TN scanned-sheet path → MO 2017-2023 → PA
   pre-2024 → FL full index. This is the only lawful route to pre-2026 bouts today.
5. Title lineage from the bodies' own documents (already stored, 2000→) — runs today, confirmed title events only after
   human review.
6. Identity resolution passes for the 577 pending review items, then org-identity decisions so body statements can link.
7. New jurisdictions only after a rights review each: CSAC/NYSAC (public-records route), BBBofC, JBC.
8. Amateur/Olympic only after the owner sets scope and terms are read.
9. Historical media/newspaper (LOC, Chronicling America, Commons) only after registry rows exist; human verification per
   fact, pre-1931 only.

## M. Proposed APIs <a id="m-apis"></a>

Added to the gateway route table (code only — the Worker is not deployed; the gateway forbids "history" in a path, so the
namespace is `archive`):

| Route | Returns |
|---|---|
| `GET /internal/v1/site/archive` | rule versions, result-class ontology, assertions, jurisdictions, registry counts, what is on record |
| `GET /internal/v1/site/archive/sources` | the source/provenance registry (per lane: availability, rights scope, coverage, cadence, completeness, confidence, parser lineage) |
| `GET /internal/v1/site/archive/cards/:ref` | one card, fully reconstructed with provenance and derived statistics |
| `GET /internal/v1/site/archive/divisions/:key` | division history: definitions, native labels, each body's runs, title bouts on record |
| `GET /internal/v1/site/archive/meetings/:a/:b` | meetings and common opponents, joined by canonical id only |
| `GET /internal/v1/site/passport/:ref` | fighter passport, with `?as_of=YYYY-MM-DD` reconstruction |

Future surfaces (design only): History Explorer, Fighter Passport, Fight Archive, Card Explorer, Championship Lineage,
Belt History, Division History, Records Engine, Trilogy/Rematch Explorer, Common Opponent Explorer, Venue History,
Scorecard Explorer, Judge Intelligence, Trainer/Gym Graph, Olympic timeline, Fight DNA, Era Comparison, Historical Matchup
Intelligence. Judge Intelligence stays descriptive: measured quantities with sample sizes, never an accusation.

## N. First vertical slice <a id="n-slice"></a>

**Card: NSAC, 2026-03-28, MGM Grand Garden Arena, Las Vegas.** Ten bouts, one WBC world title defense, regional belts,
decisions, a split draw and one truncated source line. Facts were exported read-only from staging
(`scripts/staging/history-slice-export.ps1`) and replayed through the normal pipeline into a disposable local database;
proof artifact: `reviews/history/2026-09-15-slice-proof.json`; acceptance: `tests/db/27_global_history_slice.test.mjs` (7 tests).

| Proof | Result |
|---|---|
| Canonical fighters | 20 created through the identity pipeline; 0 merges, 0 unresolved, 0 review items |
| Fighter aliases | licensed name from the commission + common name from the proven Wikidata identity, kept distinct |
| Full card | 10 bouts in sheet order, corners with printed name and hometown |
| Weights | 20 official weigh-ins; class limit resolved as-of, marked as a present-day reference; Gausha 160.8 lb against a 160 limit flagged, not reinterpreted |
| Results | TKO 5, UD 3, MD 1, SPLIT_DRAW 1; source string kept on every one |
| Round / stoppage data | round and m:ss for 4 of 5 stoppages; the 5th (source text ends "TKO 2:45 of") flagged `stoppage_round_not_stated` + `source_text_incomplete` |
| Titles | WBC world super welterweight linked; regional belts classified as printed (WBA continental + gold, WBA continental + NABO) and **not** linked as world titles |
| Officials | 4 referees, 15 judges' cards across 5 decisions; every card checked against the stated decision — all consistent |
| Scorecards | totals only; round-by-round `not_provided` by the source |
| Venue / jurisdiction | MGM Grand Garden Arena → `US-NV`; the commission row stores only "Nevada" and still resolves to `US-NV` |
| Provenance | every lane carries source key, url and the observation id; results carry the document key |
| Derived statistics | stoppage rate 0.5, 86 rounds scheduled, 58.60 rounds fought, mean card margin 3.33, mean panel spread 3.2, 2 panels with disagreement |
| APIs | card, passport, division, meetings, registry, index — all six return |
| Validation | `boxing_archive_assertions()`: 0 failures; info counts name every ambiguity |

**Expansion proof, one card → one career → one division → one era:**

- **Career:** the passport for the main-event winner returns the record derived from bouts on record (1-0, TKO 1), labelled
  with its coverage basis, plus an `as_of=2026-03-28` reconstruction that correctly knows nothing about the fight.
- **Division:** the same function reads 1,083 stored body documents for male super welterweight and returns
  **26 years of lineage from the bodies' own words** — WBA 288 documents → 51 runs (35 distinct holders, 2000-01→),
  WBO 308 → 43 runs, IBF 246 → 17 runs, WBC 2 → 4 runs. Example (WBO, as printed): Charlo 2022-05→2023-09, Tszyu
  2023-10→2024-03, Fundora 2024-04→2025-04, vacant 2025-05→2025-07, Zayas 2025-08→2026-05, Ennis 2026-06→.
- **Corroboration across sources:** the commission's remark "Fundora retains WBC Super Welterweight Title" on 2026-03-28
  and the WBC's own September 2026 ratings PDF (reign start 2024-03-30 "WON TITLE", last defense **2026-03-28**) agree —
  two independent approved sources, kept as two statements, with the identity link still unresolved until a decision.
- **Era / global:** the same reads take `from`/`to` and jurisdiction; what is missing is source coverage, not architecture.

**What the slice does not prove:** no pre-2020 bout, no non-US jurisdiction, no amateur bout, no round-by-round card, no
knockdown, no confirmed title reign. Each is a source gap named in [E](#e-missing), not a modelling gap.

## O. Model isolation and temporal integrity <a id="o-isolation"></a>

- Fight DNA reads **every** professional bout through `boxing_fighter_history_as_of` / `boxing_matchup_inputs`. A
  historical backfill would therefore flow into the existing lineage silently. **This is now gated in the database**
  (migration 0044, `docs/history/MODEL_SCOPE_GATE.md`): bouts carry `model_scope`, archive rows cannot be written until a
  runtime flag is enabled, that flag cannot be enabled while any consumer is unreviewed, the model boundary defaults to
  current scope only, and 100,000 archive bouts are proven to leave every current model input byte-identical.
  Nothing in 0043 touches a model object, and the slice test asserts that: every archive function is non-volatile, writes
  nothing, and never references `boxing_models`, `boxing_model_outputs`, metric snapshots, matchup snapshots or intel runs.
- Any predictive use of history starts a separate lineage (`pbe-boxing-model-v2-history`) with its own feature contract,
  leakage audit, holdout, calibration and promotion criteria. The official record of `pbe_bout_winner@0.1.0` (still
  untrained, no outputs) is untouched.
- As-of reconstruction is enforced in the passport: bouts strictly before the as-of date, and a result revision after the
  first counts only once it was captured. Event time and observation time stay separate columns throughout.

## P. Owner decisions needed <a id="p-decisions"></a>

1. **New Jersey rights re-review** (results parsing beyond the recorded scope) — highest priority.
2. Confirm the **DOB rule** (never stored) against the Phase 2 request for "DOB where legitimate".
3. Approve the **backfill order** in [L](#l-sequence) and the `model_scope` gate before any historical ingest.
4. Set **amateur/Olympic scope** (IOC, World Boxing, IBA, USA Boxing) before any research fetch.
5. Decide whether to register the **historical media sources** (LOC, Chronicling America, Commons, Smithsonian) that the
   research doc already rates as ingestible but that have no registry row.
6. Confirm that applying 0043 to staging is wanted **after** the existing gate sequence, not inside it.
