# Sanctioning-body titles and rankings: ingestion, identity, history (staging)

**Status (2026-09-15 02:30Z): all four bodies built and running on Boxing STAGING only.** Production has received no title or ranking
writes. The site at boxing.propbetedge.ai stays in build mode (LAUNCH_APPROVED=false, noindex).

## What PropBetEdge is here

PropBetEdge Boxing is an independent discovery and intelligence layer over the four world sanctioning bodies (WBC,
WBA, IBF, WBO). It does not compete with them, and it does not award, sanction, recognize or govern any championship.

Each body keeps, on every page:
- its own identity, rankings and championship wording, exactly as printed;
- its own source dates and a link to its own public page ("Official source");
- its own disagreements, both with other bodies and between its own documents.

PropBetEdge's role is to collect, organize, preserve history, connect identities, explain changes and link back to the
source. Anything calculated by PropBetEdge is labelled **PropBetEdge-derived**. Someone searching for a WBC ranking, a
WBA champion, an IBF mandatory or WBO title history should find it here with an obvious path to the body that
published it.

## Sources (owner decisions 2026-09-14)

| Body | Registry row | Official public sources used | Posture |
|---|---|---|---|
| WBA | `wba_official` approved_ingest | `https://www.wbaboxing.com/wba-ranking` (month selector POST `dates=YYYY:M:`), `/current-wba-champions` | facts only, attribution, low rate, fail closed |
| IBF | `ibf_official` approved_ingest | the ratings JSON the public `/ratings/` page reads (`/wp-json/ratings/v1/filter`), 11 s between requests | same; the endpoint is undocumented, so a shape change fails closed |
| WBO | `wbo_official` approved_ingest | `/rankings/` (PDF link read on every run; month history POST), `/male-champions/` | same; the PDF token is never guessed |
| WBC | `wbc_official` approved_ingest (0036; fetching authorized 2026-09-15) | `https://wbcboxing.com/main-ratings-es/` (men's champions grid "CAMPEONES DEL MUNDO" and the link to the month's ratings PDF), the men's ratings PDF `https://wbcboxing.com/mailing/<year>/WBC_RATINGS_<MONTH>_<year>.pdf` | same posture; robots.txt allows general agents; the PDF URL is always taken from a public link |

For all four bodies:
- No copied HTML or PDF body is redistributed.
- A blocked URL is an access gap, never something to work around: no user-agent spoofing, CAPTCHA bypass or
  authentication tricks.

## Schema (migrations 0033-0041)

| Object | Purpose |
|---|---|
| `boxing_org_divisions` / `boxing_org_designations` | body-native labels mapped to canonical keys; unknown labels become `pending_review` |
| `boxing_title_status_snapshots` / `_entries` | append-only observations of one body document per division |
| `boxing_title_mandatory_statements` | mandatory statements exactly as printed |
| `boxing_title_claims` | what a body prints about other bodies |
| `boxing_title_conflicts` | disagreements between a body's own documents |
| `boxing_title_snapshot_diffs` / `boxing_title_event_proposals` / `_decisions` | change detection and review. Automatic confirmation needs an official commission result plus a later snapshot from the same body |
| `boxing_ranking_snapshots` / `_entries` (0006) | body rankings; a correction is a new revision |
| `boxing_org_identity_reviews`, `_names`, `_candidates`, `_candidate_members`, `_candidate_decisions` | identity review by source identity |
| `boxing_source_backfill_checkpoints` | resumable, throttled history collection |
| `boxing_derived_unification()` | PropBetEdge-derived unified / undisputed (`pbe_undisputed@1`) |

## Source-native vocabulary decisions

- **WBA divisions:** `MINIMUM` and `MINI FLYWEIGHT` map to canonical minimumweight, and the native label is kept on the
  org division and ranking. `UNKNOWN` stays unmapped and pending review.
- **WBA gold:** `WBA GOLD CHAMPION` maps to the WBA gold lineage, champion status.
- **WBA unified/undisputed wording:** `WBA UNDISPUTED CHAMPION`, `WBA UNIFIED CHAMPION` and `WBA -xxx UNIFIED CHAMPION` are
  WBA wording, never a lineage and never PropBetEdge status.
  - When the same champion row prints its WBA lineage (for example `WBA SUPER CHAMPION`), the phrase is stored as that
    entry's `honorific` exactly as printed.
  - Alone, the phrase stays a pending designation, and that division's document is refused for review.
- **IBF:** the division slug is `mini-flyweight` (canonical minimumweight). `jr-mini-flyweight` stays unmapped until its
  limit, gender scope and division are proven.
- **Unfilled positions:**
  - IBF: an empty slot or the printed words "NOT RATED".
  - WBA: `NOT RATED`, or older lists' `OFFICIAL CHALLENGER VACANT` in one wide cell. The words are kept in
    `metadata.slot_text`, and no challenger is inferred.
- **Nameless ranked entries** (the WBA printed only a profile link):
  - The position stands, with `source_name` and `fighter_id` null, `metadata.name_not_printed`, and the WBA boxer id
    kept.
  - No identity review is opened.
  - The site shows "Name not printed by source" as a display phrase only.
- **A division printed twice in one document:** nothing is stored for that division from that document.
- **WBC (September 2026 ratings PDF, as printed):**
  - Division headers are `HEAVYWEIGHT` ... `LT. HEAVYWEIGHT`, `SUPERMIDDLEWEIGHT`, `LT. FLYWEIGHT`, `STRAWWEIGHT` (18 divisions). The champions grid uses the Spanish names (`Completo` ... `Paja`).
  - Title lines are `CHAMPION`, `INTERIM CHAMPION`, `CHAMPION IN RECESS`, `WBC SILVER CHAMPION`, `WBC INT. CHAMPION` (tier `international`, kept as the WBC's own) and `CAMPEONES DEL MUNDO` (champions grid).
  - `FRANCHISE CHAMPION` and `EMERITUS CHAMPION` are known WBC labels but did not appear. Any other title line goes to review.
  - `IBF CHAMPION:` / `WBO CHAMPION:` lines are the WBC's claims about those bodies.
  - `WON TITLE` / `LAST DEFENCE` attach only when one full `CHAMPION` line is printed. `LAST COMPULSORY` stays a printed note.
  - The PDF text layer is not in reading order, so each page is rebuilt from item positions. Rank numbers pair with name rows by height, and a tag printed as a separate item is joined to its row.
  - Positions the WBC left blank are kept (`metadata.printed_blank`). Text outside the name column is ignored (the file carries stray "WBO CHAMPION" text there). A page whose rows do not pair keeps its title lines but is not stored as a ranking.

## Identity review (source identities, not monthly occurrences)

- **WBA:** one candidate per WBA boxer id (the strongest key). Every month that printed that id collapses into it.
- **IBF / WBO:** one candidate per normalized name, with countries kept as evidence. Conflicting countries mark it
  `ambiguous`. A name never merges fighters on its own.
- **Decisions:**
  - Human reviewers only; the database refuses automated reviewer names.
  - A match covers the member review rows it names, and an ambiguous candidate must name them.
  - One decision resolves every stored month of that source identity at read time, in title snapshot JSON, ranking
    JSON and the derived calculation. Stored history is not rewritten.
- **Operator commands:**
  - `pwsh scripts/staging/titles-identity.ps1` fills the printed-name map, refreshes candidates and prints the summary.
  - The full rebuild is `select public.boxing_refresh_org_identity_candidates()`; collectors run the incremental
    `_v2(false)`.

## Change detection

`pwsh scripts/staging/titles-diff-pass.ps1 -Bodies ibf,wba,wbo` walks each body oldest to newest per division and
document kind. It records title and ranking diffs and proposals only; no title event is ever created from a proposal.

`boxing_title_proposal_summary()` separates proposals whose diff is between chronologically consecutive snapshots from
older ingestion-order artifacts. Those artifacts come from months inserted newest-first; they are kept, not
rewritten, and the review queue should use the consecutive ones.

## PropBetEdge-derived unified / undisputed (`pbe_undisputed@1`)

- **Primary belt:** each body's primary belt comes from its latest ranking document: WBA super, else WBA world/regular;
  the world title for the other bodies.
- **Comparison:** holders are compared only by resolved PropBetEdge fighter. Four bodies give undisputed; two or three
  give unified.
- **Bodies that cannot count** are reported with the reason: no document, a document more than 90 days older than the
  newest, disagreeing documents, a vacant or unstated belt, or an unresolved holder identity.
- **Source wording is never used.**

## History collection (staging, 2026-09-14/15)

WBC history discovery reads the three public ratings pages for linked PDFs (`titles-collect.ps1 -Body wbc -Backfill`); a dead link is recorded with `access_gap: true`. WBA/WBO/IBF ran in foreground, checkpointed chunks, because the host is memory-constrained; background runs were killed twice. Retry
passes use `-RetryFailedBefore <time>` so each earlier failure is re-read once.

| Body | Months with stored documents | Range | Months still open (only the affected divisions) |
|---|---|---|---|
| IBF | 248 | 2005-12 to 2026-08 | 0 |
| WBA | 311 (every month the WBA lists) | 2000-01 to 2026-08 | 189: 172 lone "unified/undisputed" phrase; 15 division listed twice; 3 `UNKNOWN` division (one month has both of the last two) |
| WBO | 306 | 2000-01 to 2026-08 | 14 unavailable: 12 with no ratings published, 1 with one division, 1 without a numbered list |
| WBC | 1 (2026-09) | current month only | **source-access gap**: the WBC links only the current month's PDF. The two older men's PDFs linked anywhere on the site (May 2020 from a news post, August 2024 from `/en/championsratings/`) return 404, and no file names are guessed. History grows from the monthly collection |

## Append-only staging history (kept, not cleaned)

There are 116 ranking revisions on staging, classified from the stored entries:
- 93 (WBA) have identical entries. They differ only because an early WBA history URL carried a month label that
  entered the hash.
- 17 (WBA) add a printed rank-1 slot that an earlier parser dropped.
- 5 (WBA) have different content after parser changes: 2011-07 super featherweight (division printed twice),
  2012-12 flyweight, and 2026-03/04/05 bridgerweight.
- 1 (IBF) is the 2005-12 heavyweight correction, where "NOT RATED" had been read as a name.

Every one keeps the database note "source republished with different content", which is inaccurate for parser-driven
revisions. As-of reads were verified to return the non-superseded revision in all 116 cases.

## Reads

A requested as-of date covers its whole month (0041). Monthly lists are stored with the month-end date, so a mid-month
read shows that month's list.

**Production must not copy these tables wholesale.** A production import must come from the corrected parsers and
accepted source evidence.
