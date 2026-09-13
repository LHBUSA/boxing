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
