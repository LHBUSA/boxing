# Officials cleanup: parser artifacts and duplicate candidates

Status 2026-09-14 12:00Z: protection deployed; the first natural commission run happened (11:40Z) but did **not**
re-parse Nevada (see below), so no Category A item exists yet and staging officials data is unchanged. The next natural
run is 2026-09-15 11:40Z; Category A is applied only after a stored corrected Nevada parse exists.

## What went wrong

| Parser | Bug | Visible effect on staging |
|---|---|---|
| `nsac-nevada@1.0.0` | header officials split on `,` only (`Judges: A, B, & Cory Santos`) | officials `& Cory Santos` (10 assignments, 8 scorecards) and `& Steve Weisfeld` (8, 7); review item `Chris Migliore & Ricardo Ocasio`; bouts whose surname line could not resolve against a combined header name kept the surname (`Migliore`) |
| `nsac-nevada@1.0.0` | promoter line split on `/` | promoters `TKO Productions LLC d` / `b` / `a Zuffa Boxing`, event names `... d and b and a ...` (6 documents) |
| `nj-sacb@1.1.0` | judges split on `,` only; `Jr. (57-57)` split from its name | none in stored New Jersey parses (verified) |

Surname-only officials `Cheek`, `Sutherland`, `Cheatham`, `Trella` come from Nevada sheets whose header does not list
that judge at all; a corrected parser cannot resolve them either. They stay in human review (Category C).

## Protection for the next ingest (`shared/events/card.mjs`, `shared/events/officials.mjs`)

When a commission's own result sheet is re-parsed, each official is compared with the official already actively
holding that role/slot on the same bout (matched by the source bout id):

| Situation | Action |
|---|---|
| no active official in the slot | normal resolver (unchanged thresholds) |
| same name after normalization (`& Cory Santos` / `Cory Santos`) | **keep** the occupant; no resolver call, no new official, no card change |
| a different name (`Migliore` / `Chris Migliore`) | **hold**: occupant stays, nothing re-pointed, a review item `reparse_names_a_different_official_in_held_slot` records the conflict |

Scorecards look up the ACTIVE judge by slot, so a held slot keeps its scorecards.

Forward runs re-parse a stored document only when its adapter lists the stored parser version in
`supersedesParserVersions` (Nevada: `null`, `1.0.0`, `1.0.1`; New Jersey: `1.1.0`; Florida: none), within the
per-run document cap (12). Florida is deliberately not re-parsed.

## Categories

| | Meaning | Applied? |
|---|---|---|
| A | deterministic parser artifact: corrected name = artifact minus leading non-letters; a STORED older parse of the same document named the artifact and a stored parse by a newer parser names the corrected official at the same bout, role and slot; scorecard slot agrees; nothing later contradicts | yes, staging only, database re-verifies every item |
| A_pending | A, but the corrected parse is only simulated | no |
| B | probable same official (name variants: `Steve`/`Steven Weisfeld`, `Max De Luca`/`Max DeLuca`, `G. Wayne`/`Gilbert Wayne Hedgpeth`) | human review |
| C | ambiguous: surname only (`Cheek`/`Eric Cheek`), more than one corrected-name candidate | human review; never merged on surname |
| D | different officials sharing a surname (`Alvaro`/`Eliseo Rodriguez`) | untouched |

## Canonicalization (migration `20260914000024`)

* `rename_parser_artifact`: display name becomes the corrected name; the old display name is kept in
  `boxing_official_aliases`; public id, assignments and scorecards unchanged.
* `merge_parser_artifact` (only when a separate corrected-name official exists): the artifact official becomes
  `merged_into` the corrected official. No row is re-pointed or deleted; reads resolve through
  `boxing_canonical_official_id`, and merged officials are no longer resolver candidates.
* Every decision is an append-only row in `boxing_official_canonicalizations` with its evidence.

## Runbook

```
# before the run (read only)
pwsh scripts/staging/officials-cleanup.ps1 -Plan -SimulateParse -OutDir reviews/officials/2026-09-14-before

# after the natural run: capture run + plan again (read only)
pwsh scripts/staging/officials-cleanup.ps1 -Plan -OutDir reviews/officials/2026-09-14-after-run

# apply migration 0024, then Category A only
pwsh scripts/staging/apply-migrations.ps1 -Mode apply
pwsh scripts/staging/officials-cleanup.ps1 -ApplyCategoryA -Actor "<name>" -OutDir reviews/officials/2026-09-14-applied
pwsh scripts/staging/verify-staging.ps1
```

## Dry run on 2026-09-14 (stored evidence + simulated parse of 26 documents)

* 117 officials, 1,391 bout-official rows (all active), 180 scorecards, 28 pending official review items,
  0 duplicate active judge slots, 0 current scorecards without an active assignment.
* Simulated corrected parse: 7 Nevada documents change, 0 New Jersey documents change, 0 bout ids change.
  * `& Cory Santos` → `Cory Santos` (2 documents): keep. `& Steve Weisfeld` → `Steve Weisfeld`: keep.
  * `Migliore` → `Chris Migliore` (02-01-26, slot 3): hold → review (C).
  * `Chris Migliore & Ricardo Ocasio` → `Ricardo Ocasio` (02-01-26, slot 2, empty today): normal resolver; an
    existing Nevada judge `Ricardo Ocasio` exists, so the bout gains its slot-2 judge and its scorecards.
  * promoters `TKO Productions LLC d/b/a Zuffa Boxing` in 6 documents.
* Plan: A 0, A_pending 2 (`& Cory Santos`, `& Steve Weisfeld`: renames), B 7, C 5, D 7.
* Still open outside this cleanup: Florida title text inside official names (`Ged WBO & WBA O'Connor`,
  `Efrain WBC Middleweight Lebron`, ...) needs a Florida parser fix; it is not a merge.

## Natural run 2026-09-14 11:40Z (Worker boxing-commissions-staging 6b079bc7, cron `40 11 * * *`)

Snapshots: `reviews/officials/2026-09-14-pre-run` (11:19Z) and `reviews/officials/2026-09-14-after-run` (11:44Z), both from
`officials-cleanup.ps1 -RunMetrics -Plan` (read only).

| adapter | status | listed | fetched | changed | superseded re-parse | officials kept | held | review items |
|---|---|---|---|---|---|---|---|---|
| nsac-nevada@1.0.2 | ok (should have been partial) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| florida-athletic-commission@1.0.2 | partial | 16 | 1 | 0 | 0 | 0 | 0 | 0 |
| nj-sacb@1.1.1 | partial | 1 | 1 | 1 | 1 | 17 | 0 | 8 identity |

* Nevada: at 11:40:24 the 2026 results index answered 200 with a body that carried no result links (stored as listing
  revision 2, sha `da3425bd`); the page served before and after is the normal one (sha `f27876cc`, 40 documents, also
  from Cloudflare's network). Nothing was listed, so no superseded document was re-parsed. Fix: an official index that
  parses to zero documents now marks the run partial (`metrics.empty_indexes`).
* Florida: the listing links `08-30-2026-TBL_Promotions_results_without_med` (with a soft hyphen in the file name); every
  URL variant returns an HTML page with status 200. Recorded before as a parse failure; now `not_a_pdf` (source-side).
* New Jersey: the 09-04 sheet re-parsed with 1.1.1; 17 officials kept by continuity, 0 held, 0 new officials.
* Officials before → after: 117 → 117; active assignments 1,391 → 1,391; scorecards 180 → 180; duplicate active judge
  slots 0 → 0; pending official review items 28 → 28; parser-artifact names `& Cory Santos`, `& Steve Weisfeld` (Nevada)
  remain; malformed Nevada promoter names (3) and event names (6) remain; malformed New Jersey judge names: none.
* Plan after the run: A 0, A_pending 0 (no simulation), B 9, C 5, D 7. Nothing to apply.
* Known gap: Ruiz vs Knyba (NJ 09-04) has judges in slots 2 and 3 and the referee; slot 1 (Glenn Feldman) stays in
  review (`insufficient_evidence`), so none of its three published cards is stored. Thresholds are not lowered.

