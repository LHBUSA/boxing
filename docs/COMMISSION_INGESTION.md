# Official athletic-commission ingestion

**Status (2026-09-13): STAGING only.**
- **Sources:** Nevada (NSAC), Florida (Florida Athletic Commission) and the New Jersey SACB schedule are approved for ingestion. Texas (TDLR) is reference-only.
- **Runtime:** Worker `boxing-commissions-staging` (daily cron `40 11 * * *`, no routes) and the guarded operator script. Both write only to `wpaxofilvbsjyrxrwjhg`.
- **Cost:** no paid source, no subscription, no credits.

Goal: authoritative canonical events, bouts and results built from official public records, so stored and forward Odds API observations can resolve against Boxing Core without loosening identity rules.

## Rights and access (review 2026-09-13)

| Jurisdiction | Registry | Access basis | Automation |
|---|---|---|---|
| Nevada (NSAC) | `nsac_nevada`: `approved_ingest` | Public results index + PDFs (`boxing.nv.gov`, robots disallows only `/workarea/`, `/widgets/`); public professional calendar feed embedded on the commission site; Nevada public records (NRS 239) | Enabled |
| Florida (DBPR / FAC) | `florida_athletic_commission`: `approved_ingest` | Public upcoming-events and event-results pages + match-result PDFs (robots disallows only WordPress admin/includes/content); Florida public records (Ch. 119) | Enabled |
| New Jersey (SACB) | `nj_sacb`: `approved_ingest` | Public Event Schedule & Results page (robots disallows only `/wp-admin/`); NJ public records (OPRA) | Schedule enabled; result PDF parsing **not built** (documents registered `parser_pending`) |
| Texas (TDLR) | `tdlr_texas`: `reference_only` | Results table is loaded from `/sports/_events-list.csv`; robots.txt **`Disallow: /*.csv`** | **Disabled**; human reference only, with agency/URL/copy date and a non-endorsement statement |

**Approval covers facts, with attribution to the commission.**
- Documents are not redistributed.
- Private identifiers and medical fields are never stored.
- Third-party sites linked from commission pages (for example BoxRec for NJ suspensions) are never followed and never become sources.

Each decision is an append-only `boxing_source_rights_reviews` row (migration 0014).

## Adapter contract (`shared/adapters/commissions/`)

One module per jurisdiction: `nevada.mjs`, `florida.mjs`, `new-jersey.mjs`, `texas.mjs`. There is no cross-jurisdiction branching.

The shared pieces are:
- `contract.mjs`: sport classification, event/bout observation validation, display names.
- `minimize.mjs`: sensitive-data patterns and `assertMinimized`.
- `pdf.mjs`: positioned text via pdf.js (`unpdf`, MIT) in Node and Workers.

**Event observation fields:** source, jurisdiction, source-native event id, event date, start time (only when the source gives an instant), venue/city/region, promoters, source event type, sport, professional flag, status, broadcast (null unless published), source URL, document key, source revision, captured_at.

**Bout observation fields:**
- **Participants:** source names plus display names, corner, hometown, weight.
- **Scheduled rounds.**
- **Result:** outcome, winner side, method, decision type, round, time, raw text.
- **Officials:** referee; judges with per-judge totals and score order.
- **Remarks:** point deductions, title remarks, suspension duration (Florida).
- **Provenance:** document key and page.

**Missing is `null`.** A result whose winner cannot be tied to a corner is not recorded.

## Sport discrimination

| Source | Rule |
|---|---|
| Nevada | Document must be listed as Boxing (filename) **and** titled "BOXING SHOW RESULTS". MMA and PowerSlap PDFs are never downloaded; PowerSlap sheets are titled "MIXED MARTIAL ARTS" and would be rejected anyway. Calendar: only `PRO Boxing Event` |
| Florida | Listing brands (BKFC, bare knuckle, PFL, UFC, Karate Combat, kickboxing, MMA) are skipped. Each sheet's **Event Type** must be Boxing **and** each bout's **Sport** cell must be Boxing. Upcoming rows need type `Box` and no non-boxing brand (BKFC is listed as "Box") |
| New Jersey | `(pro boxing)` / `(pro/am boxing)` only. `(pro boxing bare knuckle)`, kickboxing and MMA are rejected |
| Texas | `classifyTexasRow` accepts professional boxing only; not used remotely |

Texas state championships would be their own title context (`tdlr-texas`, tier `state`), never WBC/WBA/IBF/WBO lineage.

## Data minimization

- **Dropped by column position** before any text leaves a parser:
  - Nevada: Federal ID column; telephone, ringside doctors/physicians and commission-member header lines.
  - Florida: DOB and Federal ID columns; Ringside Physicians header block.
- **Second line of defence:** every persisted observation, card document, result observation and **fact block** passes `assertMinimized`, which refuses federal-ID-shaped tokens, SSNs, phone numbers, DOB keys and medical wording. A document that trips it is not ingested; it is marked `error` and retried after a parser fix.
- **DOB is not used, not even transiently,** for identity resolution. Suspensions are stored as a duration only, with no reason.
- **Verification in staging:** a scan of every `boxing_*` table for federal-ID patterns returns 0.

## Canonical writes (`shared/commissions/apply.mjs`)

Observations become **card documents** and flow through the existing paths:
- `applyCardDocument`: events, bouts, identity resolution, officials, card history, news.
- `recordResult`: revisions and news.
- `recordScorecards`: per-judge totals and deductions.
- `recordWeighIn`: official commission weights, verified.
- `recordRegulatoryAction`: Florida suspension periods.

Nothing writes canonical tables directly.

**Identity**, via the existing resolver:
- A new name with no candidate creates a canonical fighter with commission provenance.
- A name similar to an existing boxer without strong corroboration goes to `boxing_identity_review_queue`.
- Names are never merged on their own.
- A bout is created only when **both** corners resolve.

Nevada 2026 produced 26 review items, mostly repeat appearances.

**Officials:** a repeat official matches only when the observation is the commission's **own** result sheet, the name is exact, the official has worked for that commission before and there is no country conflict. Within one document, one name is one official.

## Revisions and history

- **Official document registry:** `boxing_source_documents`, plus append-only `boxing_source_document_revisions`.
- **Changed content:** a new sha256 is a new revision with its own raw observation. The prior observation and revision are never overwritten.
- **Result changes:** a changed result becomes result revision N+1.
  - It emits `RESULT_CORRECTED`, or `RESULT_OVERTURNED` when the winner or outcome changes.
  - Both types go to human review.
- **Listing hashes** ignore volatile stamps (iCal `DTSTAMP`).

## Resolving stored odds later (`shared/odds/replay.mjs`)

`reprocessStoredOdds` replays stored `the_odds_api` observations with **no provider request**:
- **What it may match:** completed bouts are eligible, because commission results arrive after the fight. Live capture still sees only scheduled bouts.
- **History is untouched:**
  - ticks keep the original `captured_at` and provider timestamps
  - `recorded_at` shows when the row was written
  - the provider ledger is untouched
- **New mappings record** `resolved_at`, `resolver_version` (`boxing-odds-event-matcher@1.0.0`), `resolution_run_id` and `evidence.original_captured_at`.
- **Matching still requires** both provider names to resolve to the two corners of exactly one bout within ±2 days. Event-title similarity alone never links.

## Cadence (respectful)

- **Worker:** one daily forward run per adapter, sequential.
- **Documents:** a known result document is re-fetched only when its event is within 45 days and it was not checked in the last 7 days, to catch official revisions.
- **Limits:** at most `COMMISSION_MAX_DOCUMENTS` (12) PDFs per adapter per run, `COMMISSION_FETCH_DELAY_MS` (1.5 s) apart, with an identifying User-Agent.
- **Backfills** are explicit operator runs (`trigger_type = backfill`), 2 s apart.

## Provenance

Every run has `trigger_type` (manual | scheduled | retry | backfill | test), `worker_name`, `worker_version` (Cloudflare version id or `git:<sha>`), `invocation_id`, `scheduled_for`, `runtime`, `source_version` and `config_hash`, all write-once.

`boxing_worker_invocations` records every invocation, including cron firings that do nothing. `boxing_scheduler_evidence(worker, since)` summarizes scheduler proof from the database alone.

## Operations

| Task | Command |
|---|---|
| Backfill (staging) | `pwsh scripts/staging/commissions-ingest.ps1 -Adapter nevada -Backfill -Year 2026` |
| Forward run (staging) | `pwsh scripts/staging/commissions-ingest.ps1 -Adapter florida` |
| Replay stored odds | `pwsh scripts/staging/commissions-ingest.ps1 -ReplayOdds` |
| Coverage | `select public.boxing_commission_coverage();` |
| Deploy Worker (staging) | `cd workers/boxing-commissions && npx wrangler@4 deploy --env staging` |
| Worker secrets | `pwsh scripts/staging/set-commissions-worker-secrets.ps1` |

## Tests

- `shared/adapters/commissions/commissions.test.mjs`: synthetic layouts.
  - Nevada: boxing parsed; MMA and PowerSlap rejected; Federal ID never output; calendar filtering.
  - Florida: boxing parsed; DOB and Federal ID dropped; bare-knuckle bout and non-boxing documents rejected.
  - New Jersey: third-party links ignored.
  - Texas: disabled; non-boxing combat rejected.
- `tests/db/13_commission_ingestion.test.mjs`: real database, synthetic official sites.
  - Nevada, Florida and New Jersey ingestion; nothing sensitive in any table, gateway output or fact block.
  - Revision → `RESULT_CORRECTED` with history kept.
  - Same-name fighters and ambiguous identity go to review.
  - Stored odds resolve later without refetching, both corners required, event-title similarity alone never links, original timestamps preserved.
- `tests/db/12_run_provenance.test.mjs`: manual vs scheduled provenance, invocation ledger, write-once.

Fixtures are synthetic; real documents, which contain federal IDs, are never committed.
