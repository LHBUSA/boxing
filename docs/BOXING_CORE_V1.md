# PropBetEdge Boxing Core v1

## Mission

Build a provenance-aware boxing intelligence graph that can power `boxing.propbetedge.ai`, internal models, automated news, historical research, and future APIs without depending on the frontend as a source of truth.

Boxing Core is not a website database. It is the canonical data plane for the sport.

## Non-negotiable design rules

1. **Canonical identity before enrichment.** Fighters, officials, organizations, commissions, promoters, venues, events and bouts receive PropBetEdge IDs. Display names are never durable join keys.
2. **Raw observation != canonical fact.** Source payloads/observations are preserved independently from normalized tables.
3. **Every important fact has provenance.** Store source, source URL/external key, capture time and confidence/verification state where applicable.
4. **No fabricated values.** Unknown stays null/unknown. Derived values are labeled as derived and versioned.
5. **History is an asset.** Odds ticks, ranking snapshots, title state, card state and fight-week context are append-only wherever practical.
6. **News comes from facts.** The newsroom may generate prose only from an explicit stored fact block plus cited source material. It may not invent odds, rankings, injuries, weights, results or model outputs.
7. **Source rights are enforced in data.** A source can be useful for identity/reference while still being prohibited from automated canonical ingestion or redistribution.
8. **Frontend is downstream.** `boxing.propbetedge.ai` consumes the gateway/data plane; it never becomes the canonical store.

## System boundaries

### boxing-core

Responsible for:

- canonical fighter identity and aliases
- external identity mappings
- promoters, sanctioning bodies and commissions
- venues and events
- bouts and participants
- results, methods and official records
- title graph and title reigns
- ranking snapshots
- officials and scorecards
- weigh-ins and contracted weights
- source registry, observations and ingest audit

### boxing-odds

Responsible for:

- bookmaker/provider market identity
- pre-fight and live market snapshots
- immutable price ticks
- opening/current/closing derivations
- cross-book dispersion
- stale-market detection
- price-change events for the newsroom

### boxing-intel

Responsible for versioned derived features only:

- Fight DNA
- opponent-quality adjustment
- pace/output features
- jab/power/defense profiles
- durability and distance profiles
- layoff/activity features
- weight-class movement
- southpaw/orthodox matchup history
- judge/referee historical tendencies
- matchup features
- fair-price/model outputs

No model output is allowed to overwrite source facts.

### boxing-news

Consumes structured changes, not scraped prose. The authoritative event type list is `contracts/boxing-news-event.schema.json` (v1.1.0), which a test keeps identical to the database CHECK. It includes:

- FIGHT_ANNOUNCED, OPPONENT_REPLACED, FIGHT_CANCELLED, FIGHT_POSTPONED, EVENT_CANCELLED, EVENT_POSTPONED, VENUE_CHANGED
- TITLE_WON, TITLE_VACATED, TITLE_STRIPPED, TITLE_STATUS_CHANGED, RANKING_CHANGED
- WEIGH_IN_RESULT, WEIGHT_MISSED, OFFICIALS_ASSIGNED
- RESULT_OFFICIAL, RESULT_OVERTURNED, SCORECARD_POSTED, SUSPENSION_POSTED
- MARKET_MOVED

Each generated story stores the fact block used to write it, source citations, model/version metadata and whether human review is required.

### boxing-gateway

Read-optimized API layer for first-party products. Initial resource families:

- `/v1/boxing/fighters`
- `/v1/boxing/events`
- `/v1/boxing/bouts`
- `/v1/boxing/rankings`
- `/v1/boxing/titles`
- `/v1/boxing/odds`
- `/v1/boxing/intelligence`
- `/v1/boxing/news`

## Identity model

Every boxer gets an internal UUID and an immutable public ID such as `pbe_boxer_<id>`.

External namespaces are mappings, not primary keys. Examples may include BoxRec, sanctioning-body IDs, promoter IDs, commission IDs, stats-provider IDs and odds-provider participant IDs. Names alone never auto-merge two fighters.

Identity resolution states:

- `verified` — deterministic or manually verified link
- `probable` — strong evidence but not yet canonical
- `review` — unresolved candidate set
- `rejected` — known non-match

Aliases preserve nicknames, transliterations, former names and source-native spellings.

## Boxing-specific graph

### Titles

A title is not a column on a fighter. It is its own entity:

`organization -> title -> division -> reign -> fighter`

A bout may contest multiple titles. A title may become vacant, interim, regular, super, franchise or another source-native status without destroying historical state.

### Rankings

Rankings are snapshots, not mutable current rows. Store:

`organization + division + published/effective date + source -> entries`

That makes movement, entry/exit, mandatory status and historical reconstruction deterministic.

### Officials and scorecards

Judges and referees are first-class people. Store assignments separately from scorecards. Round-level scorecards support future Judge DNA without inferring scores from final totals.

### Commissions

The regulating commission/jurisdiction is distinct from the promoter and sanctioning body. This is essential for results, suspensions, officials, licensing context and authoritative event documents.

## Initial ingestion order

1. Register/approve source adapters.
2. Build current fighter identity universe.
3. Build sanctioning bodies, divisions, titles and current ranking snapshots.
4. Build upcoming events/cards and recent results.
5. Start odds capture immediately.
6. Capture weigh-ins, officials and scorecards for live/current cards.
7. Emit structured change events into boxing-news.
8. Backfill career history after the forward-capture system is stable.
9. Add licensed punch-stat feeds and derived Fight DNA.
10. Expand historical title/ranking/officials graph backward.

## First consumer surfaces

The frontend should eventually expose:

- Boxing Market Board
- Fight Center
- Fighter profiles
- Fight DNA matchup view
- Global schedule/results
- Title Map
- Rankings explorer
- Odds history
- Judge/Referee intelligence
- Live weigh-ins
- Automated boxing wire/news

But those surfaces do not block the data platform build.
