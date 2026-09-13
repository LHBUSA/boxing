# Boxing source policy

PropBetEdge Boxing treats source rights as a runtime/data-model concern, not a README disclaimer.

## Source states

Every adapter must be registered in `boxing_sources` before it can write canonical data.

### access_mode

- `approved_ingest` — automated collection into canonical/raw stores is approved for the intended use.
- `identity_only` — may be used to map an external identity but not to import broader facts.
- `reference_only` — humans may use it for research/corroboration; no automated canonical ingestion.
- `review_required` — do not automate until terms/license/contract are reviewed.
- `blocked` — automated access is prohibited for this system.

### rights_state

- `internal`
- `approved`
- `reference_only`
- `unknown`
- `prohibited`

`redistribution_allowed` must never be true unless the rights state is `internal` or `approved`.

## Source hierarchy

Authority is field-specific, but the normal preference is:

1. **Regulatory/official** — athletic commissions and official bout/result/scorecard documents.
2. **Sanctioning bodies** — title and ranking state for that organization's own belts/rankings.
3. **Promotion/broadcaster official** — event announcements, card changes, broadcast details and public weigh-in information.
4. **Licensed structured providers** — records, statistics, markets and other contracted data according to the license.
5. **Open licensed data** — identity/enrichment where license and provenance are compatible.
6. **Media/reference** — discovery and corroboration; never silently promoted to canonical authority.

A lower-tier source may still be authoritative for a field the higher-tier source does not publish. The selected source and confidence must remain visible in provenance.

## Candidate sources are disabled by default

The initial schema may register candidate namespaces such as BoxRec, CompuBox, sanctioning bodies, commission adapters and odds providers. Registration is not approval.

Do not enable automated collection merely because a source is public on the web.

Before enabling a source, record:

- terms/license URL or contract reference
- intended fields/use
- persistence rights
- derivative analytics rights
- display rights
- redistribution/API rights
- attribution requirements
- rate limits/technical constraints
- review date and reviewer note

## Raw observations

Raw observations should be append-only and include:

- source ID
- external entity type/key
- source URL when applicable
- payload or content hash
- captured timestamp
- parser/adapter version
- ingestion run ID

Canonical normalization must never destroy the original observation that produced the fact.

## Conflict handling

Conflicting values are not resolved by "latest wins" alone.

Resolution should consider:

- source authority for the field
- publication/effective timestamp
- whether the document is official/final vs preliminary
- identity confidence
- parser confidence
- manual verification state

When uncertainty remains, preserve the competing observations and leave the canonical field null/under-review rather than fabricating certainty.

## Automated news

A news item may cite external reporting, but generated factual claims must be represented in its stored `fact_block` or directly attributed to the cited source.

The newsroom may not invent or infer as fact:

- injuries
- purses
- weights
- title status
- ranking position
- odds
- model probabilities
- officials
- suspensions
- results
- scorecards

Derived PropBetEdge analytics must include a model/metric version and must be labeled as derived.

## No new paid data sources (owner policy, 2026-09-13)

Boxing does not purchase or subscribe to new data APIs, licences, trials or credits without explicit owner approval. Sources are prioritized in this order:
1. official athletic commissions
2. official event and promoter records where permitted
3. public government data
4. Wikidata and open-licensed identity data
5. sanctioning-body public pages after an access and terms review
6. existing PropBetEdge infrastructure that adds no cost

The Odds API is used only within the existing PropBetEdge subscription. Any action that could create a charge needs approval first. See `docs/BOXING_SOURCE_ACQUISITION.md`.

## Rights reviews are data

Every approval, restriction or block is an append-only row in `boxing_source_rights_reviews` with:
- terms URL, the terms' "last updated" date and page hash
- permitted and prohibited uses, attribution
- whether an account-specific agreement was found
- reviewer, review date and next review date

`boxing_sources.latest_rights_review_id` points at the review in force. Collection code refuses a source without one (`shared/odds/capture.mjs`). The current matrix is `docs/BOXING_SOURCE_ACQUISITION.md`.

## The Odds API — decision 2026-09-13

| | |
|---|---|
| Source URL | https://the-odds-api.com/ (API v4, sport key `boxing_boxing`) |
| Terms URL | https://the-odds-api.com/terms-and-conditions.html |
| Terms last updated | 2026-08-31 (page sha256 `f4d79e40…f660` at review) |
| Review date | 2026-09-13; next review due 2026-12-13 |
| Account agreement | None found. Existing paid PropBetEdge subscription, 100K tier (publicly listed at $59/month; 100,000 credits reset monthly; shared with NFL/UFC) under the public terms. Boxing adds no incremental charge within included credits |
| Decision | **Approved with restriction** |
| Permitted | ingestion; storing data and retaining it indefinitely; display in first-party websites/apps/dashboards, including commercial use; research and analytical dashboards; calculating and displaying derived values; training statistical and ML models |
| Prohibited | reselling, repackaging or redistributing the data as a standalone data product; offering it through our own API, data feed, downloadable files or any format intended as a raw data source for others; any product where the provider data is the primary product sold |
| Attribution | Not required ("always appreciated") |
| Registry | `approved_ingest`, `approved`, enabled, `persistence_allowed`, `derivative_allowed`, `display_allowed` = true, **`redistribution_allowed` = false** |
| Enforcement | `boxing-gateway` serves market data only as a per-bout, field-whitelisted summary. There are no bulk, tick-history, raw, provider-id or download routes, and tests enforce this |

**Future review notes:**
- The provider may change the terms by posting them and emails registered users about material changes. Re-review on any such email.
- Re-review before building any external/partner API, export, CSV/download or white-label feature that includes market data. Those are the prohibited raw-redistribution shapes.
- Re-review if the account moves to a custom or enterprise agreement; account terms would then override this public-terms decision.
- Responsible-gambling messaging is encouraged on customer-facing surfaces that promote bookmakers.
