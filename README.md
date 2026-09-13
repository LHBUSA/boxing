# PropBetEdge Boxing

PropBetEdge Boxing is the boxing intelligence layer for PropBetEdge.

This repository is being built data-first: canonical fighter identity, complete event and bout history, titles and rankings, officials and scorecards, regulatory status, weigh-ins, market history, derived Fight DNA, and an automated fact-driven news layer. The consumer product at `boxing.propbetedge.ai` is a client of that infrastructure, not the source of truth.

## Product thesis

Boxing data is fragmented across commissions, sanctioning bodies, promoters, broadcasters, record keepers, statistics providers, and sportsbooks. PropBetEdge Boxing normalizes those sources into one provenance-aware graph and derives market intelligence from it.

Core principles:

- Canonical IDs first; never join core entities by display name.
- Preserve source provenance and observation timestamps.
- Never fabricate missing fields.
- Separate raw observations from normalized facts and derived intelligence.
- Record market ticks as they happen; historical prices cannot be perfectly reconstructed later.
- Generate news from structured facts, not copied reporting.
- Keep the data platform independent from the frontend.

## Planned system

- `boxing-core` — ingestion, identity resolution, normalization, provenance
- `boxing-odds` — bookmaker markets and immutable price history
- `boxing-intel` — Fight DNA, matchup features, officials intelligence, fair-price models
- `boxing-news` — structured event detection and automated data-driven reporting
- `boxing-gateway` — APIs consumed by first-party products
- `boxing.propbetedge.ai` — consumer terminal

## Initial build order

1. Canonical schema and identity graph
2. Current active fighter / title / ranking universe
3. Event, bout, result, scorecard, weigh-in and regulatory ingestion
4. Odds capture and historical market storage
5. Rankings/title change autopilots
6. Structured news-event pipeline
7. Fight DNA and matchup intelligence
8. Judge/referee intelligence
9. Historical backfill
10. Live Fight Center and Model Lab

Development begins on the `boxing-core-v1` branch.
