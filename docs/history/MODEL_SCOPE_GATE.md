# Model scope gate and rights lane gate

Two gates stand between the canonical graph and any historical backfill. Both are enforced by the database, not by
convention, and both are proven by tests (`tests/db/28_model_scope_gate.test.mjs`, `tests/db/29_rights_lane_gate.test.mjs`).

Owner decisions of 2026-09-15: `model_scope` is a mandatory prerequisite before any historical backfill; historical data
requires explicit scope inclusion rather than being included by default; the New Jersey lanes outside its recorded rights
review fail closed; archival sources are registered but not approved; DOB is never stored.

## 1. Model scope gate (migration 0044)

**The row says what it is.** `boxing_bouts.model_scope` is `current` (default) or `archive`. Every row already on record
keeps the meaning it had; a historical row must declare itself.

**Archive rows cannot exist yet.** A trigger refuses any bout written with `model_scope = 'archive'` (BX132) unless the
runtime flag `archive_scope_ingest` is enabled, and `boxing_set_runtime_flag()` refuses to enable it (BX131) while any
consumer of the bout graph is still classified `pending_scope_review`. Backfill is blocked by construction.

**The model boundary filters by scope.** `boxing_fighter_history_as_of`, `boxing_official_history_as_of`,
`boxing_graph_record_before` and `boxing_matchup_inputs` take `p_scopes`, defaulting to `{current}`. The old unfiltered
signatures were **dropped**, not left in place: a defaulted parameter creates an overload, and an unfiltered overload
would still win a two-argument call — exactly the silent leak the gate exists to stop. A model declares what it opts into
in `boxing_models.model_scopes` (default `{current}`), frozen after registration by the existing model guard.
`pbe_bout_winner@0.1.0` is `{current}`.

**Consumer inventory.** `boxing_scope_consumers` classifies every function that reads the bout graph:

| Classification | Count | Meaning |
|---|---|---|
| `current_only_enforced` | 5 | model inputs; scope-filtered, defaults to current |
| `archive_aware_by_design` | 14 | the history and investigator layers; they show archive rows on purpose |
| `scope_agnostic_safe` | 18 | identity, dedup and ingestion guards that must see every bout or they fail open |
| `pending_scope_review` | 32 | product surfaces (site reads, gateway reads, newsroom, coverage) that must exclude archive rows before the flag can ever be enabled |

A function added later without a classification blocks the flag, so new consumers cannot be forgotten.

**Proof (2026-09-18).** With 100,000 archive bouts, 200,000 participants and 100,000 results loaded on the *same* fighters
as the current-scope fixture, the digest of every current model input is unchanged:

```
loaded 100000 archive bouts + 200000 participants + 100000 results in 37.5s
current model input digest before: d1c2fd7714dce233a660adac1c93055ea9af1579a08fc020440e54d8dd12c8a7
current model input digest after : d1c2fd7714dce233a660adac1c93055ea9af1579a08fc020440e54d8dd12c8a7
```

The digest is a sha256 over every fighter history, every opponent graph record, every official history and every matchup
input, serialized as the model reads them. The value differs between runs because the fixture mints fresh ids; what the
test asserts is that it is identical before and after the archive load in the same run.

The same test proves the filter is not vacuous. A probe fighter with exactly three archive bouts reads 0 bouts by default
and exactly 3 with an explicit `{current,archive}` opt-in, and `boxing_matchup_inputs` returns `null` for an archive bout
by default but the bout once opted in.

## 2. Rights lane gate (migration 0045)

**Lane-level rights.** `boxing_source_capabilities` carries per-lane `rights_scope` plus explicit permissions:
`commercial_use`, `storage_allowed`, `redistribution_allowed`, `public_display_allowed`, `pro_tier_allowed`,
`internal_use_allowed` and `verification_state`. Anything unclear is `unresolved`.

**Fail closed at write time.** A trigger on results, scorecards, point deductions, weigh-ins, regulatory actions, bout
officials, bout titles and bouts refuses a write whose `(source, lane)` is `review_scope_gap` or `not_permitted` (BX140).
The pipeline catches that refusal (`shared/events/rights.mjs`), counts it, and carries on: no run fails, no parser is
deleted, and nothing already stored is touched.

**New Jersey.** The recorded review covers schedule facts only. `events`, `upcoming_cards`, `venues` and `promoters` stay
approved; `bouts`, `results`, `stoppage_round_time`, `scorecard_totals`, `judges`, `referees`, `weigh_ins`,
`point_deductions`, `suspensions` and `titles_at_stake` are now `unresolved` / `review_scope_gap` and fail closed. The
superseded registry rows are kept (the registry is append-only history), and `boxing_rights_gate_report()` counts the rows
stored before the lane closed so they are visible rather than hidden.

**Archival sources registered, not approved** — every lane `unresolved` / `not_permitted`, redistribution prohibited,
commercial use unresolved, verification `unverified`:

| Source | Access mode | Note |
|---|---|---|
| Library of Congress | review_required | rights are per item; only "no known restrictions" items could ever qualify |
| Chronicling America | review_required | pre-1931 pages; OCR text is evidence for a human, never an automatic fact |
| Wikimedia Commons | review_required | per-file licensing; only files traceable to a PD/CC0 institution |
| Smithsonian Open Access | review_required | CC0 applies per media file, not per record |
| Internet Archive | reference_only | uploader-asserted rights; human research only |
| DPLA | review_required | aggregator; rights follow the contributing institution; API key needs owner approval |
| NARA | review_required | per-item rights statements; API key needs owner approval |

**Amateur and Olympic bodies registered, nothing permitted:** IOC / Olympics.com, World Boxing, IBA, USA Boxing — every
lane `not_permitted` until their exact terms are reviewed. The ontology stays ready for them (`competition_class`, a
separate career lane, identities on the same canonical fighter) but no ingestion may occur.

Registration is not ingestion approval: the observation gate still refuses these sources outright
(`source_not_ingestable`), which the test asserts.

## 3. What still blocks a historical backfill

1. The commission natural-run proof has not passed (Tennessee, HTTP 525 on 2026-09-15 and HTTP 403 on 09-16 and 09-17).
2. Migrations 0042-0045 are not applied to staging (owner: only after that proof).
3. 32 product consumers are still `pending_scope_review`, so `archive_scope_ingest` cannot be enabled.
4. No historical bout source is rights-approved: BoxRec is blocked, and the archival sources above are registered only.
5. The backfill order is fixed: approved commission facts → approved sanctioning/title documents → additional commissions
   after rights review → sanctioning historical lineage → archival corroboration → amateur/Olympic only after clearance.
