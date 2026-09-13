# Boxing Wire: fact-driven newsroom (issue #5)

**Status:** built and tested. Generation is off (`NEWSROOM_ENABLED=false`), auto-publish is off (`NEWS_AUTOPUBLISH_ENABLED=false`), and nothing is deployed.

## Pipeline

```
SOURCE OBSERVATION → NORMALIZED FACT → CHANGE DETECTION → boxing_news_events (deduped, sourced)
  → boxing_news_context() → FACT BLOCK (immutable, hashed, labelled) → TEMPLATE ARTICLE
  → PROSE VALIDATOR → state → boxing_articles (versioned) → REVIEW → PUBLISH → boxing_wire()
```

Event types come from contract v1.1.0, which the database CHECK enforces:
`FIGHT_ANNOUNCED`, `OPPONENT_REPLACED`, `FIGHT_CANCELLED`, `FIGHT_POSTPONED`, `EVENT_CANCELLED`, `EVENT_POSTPONED`, `VENUE_CHANGED`, `TITLE_WON`, `TITLE_VACATED`, `TITLE_STRIPPED`, `TITLE_STATUS_CHANGED`, `RANKING_CHANGED`, `WEIGH_IN_RESULT`, `WEIGHT_MISSED`, `OFFICIALS_ASSIGNED`, `RESULT_OFFICIAL`, `RESULT_OVERTURNED`, `SCORECARD_POSTED`, `SUSPENSION_POSTED`, `MARKET_MOVED`.

Every emitter shown in the tests writes through `boxing_emit_news_event` with a deterministic dedupe key: cards, weigh-ins, results, scorecards, titles, rankings, odds and regulatory actions.

## Fact blocks

`shared/news/fact-block.mjs` builds the block from structured data only.

**Each fact carries:**
- an id
- a label: **`canonical_fact`**, **`attributed_statement`** (with the exact publisher) or **`pbe_derived`** (a version is required)
- a topic, a machine value, the exact display `text` prose may use, and source provenance
- optional entity refs

**The block also records:**
- the `entities` whose names prose may use
- the `absent_topics` with no facts: odds, ranking, title, weight, result, scorecard, officials, regulatory, Fight DNA, record, injury, purse, quote, previous meeting
- `conflicts`
- `sensitivity` and `review_reasons`

**Entity names are data, not instructions.** A name that does not look like a name, or that contains instruction words, rejects the whole block. The event is held as `needs_review` and no article is written.

**PBE context is added only where it exists, and always labelled:**
- boxer records, only when sourced for the bout
- previous meetings
- Fight DNA metrics, with version and sample size
- current market consensus, fresh books only, labelled `pbe_derived`
- title-at-stake and eligibility facts
- weigh-in values
- market movement, with no cause

Stored forever in `boxing_fact_blocks` (append-only, unique per event + hash).

## Generation

`shared/news/templates.mjs` (`pbe-wire-templates@1.0.0`) is deterministic. Each sentence is built only from fact `text` strings plus a small fixed connective vocabulary, and declares its `fact_ids`.

**A missing fact means no sentence.** A template has no fallback phrasing, so missing odds, rankings or venue simply do not appear. When a template's required facts are missing, no article is written (`not_generated`).

Any future LLM rewriter must emit the same `{headline, sentences[]}` shape and pass the same validator, with no extra facts.

## Validator (`boxing-prose-validator@1.0.0`), stricter than UFC

UFC's validators were probed with adversarial input (UFC repo review 2026-09-12). Every hole found there has a boxing test.

| Rule | Boxing behaviour | UFC gap it closes |
|---|---|---|
| Numbers | Every digit token **and number word/ordinal** (twenty-eight, two-time, third, 3rd) must come from the block. **No** 0–5, 15, 25 or year exemptions | Number words and ordinals passed; 0–5 and years were exempt |
| Ordered tuples | A record (W-L-D) or card (115-113) must match a fact exactly, in order | "5-25" passed for 25-5-0 |
| Ownership | A number that only a fact about boxer B contains cannot appear in a sentence naming only boxer A | Numbers were a flat bag |
| Names | Every capitalised proper-noun span must resolve to an entity or fact text | No name check existed |
| Quotes | Any quote style and length must be a verbatim attributed statement | Only ≥25-char double quotes |
| Attribution | A value found only in an attributed statement needs the **exact** publisher string in the sentence | First-word match ("MMA", "The") |
| Category language | Odds, ranking, title, weight, result, scorecard, officials, regulatory, Fight DNA, record and previous-meeting words need a fact of that category or the word in a fact's text. The price pattern has no leading `\b` and includes word forms (minus, plus, pick'em, line) | "-150" after a space and word forms passed |
| Loaded terms | favorite, underdog, undisputed, unified, mandatory, undefeated, stripped, vacated, vacant, interim, franchise, former, elevated, overturned: only when a fact states them verbatim | Title and status claims were ungated |
| Attribution-only | Injury and purse language needs an attributed statement | Injury ungated on the wire path |
| Always banned | Predictions and betting advice; relative time (yesterday, last month, tonight); unsupported characterisation (robbery, controversial, biased, dominant, …), which matters especially for officials; unattributed reporting (reportedly, sources say) | Relative time and rumour passed |
| Causality | No causal connectives when the block has market facts or the event is `MARKET_MOVED` | n/a |
| Derived labelling | A sentence using a value found only in `pbe_derived` facts must say "PropBetEdge" | Derived values were unmarked |
| Bindings | A sentence's numbers must come from the facts that sentence cites | n/a |

## Review states

`generated → review_required | approved | rejected`, `review_required → approved | rejected`, `approved → published | rejected | review_required`, `published → superseded`. The database enforces this (`BX090`).

**Decision (fail-closed):**
1. Validator problems → **rejected**. The row is stored for inspection and can never be published.
2. Any review reason → **review_required**. Review reasons: sensitive type (`SUSPENSION_POSTED`, `TITLE_STRIPPED`, `RESULT_OVERTURNED`), correction, unresolved boxer, conflicting sources, unverified reading, result contradicting cards, confidence < 90, a source without `display_allowed`, or a flagged news event.
3. Otherwise → **approved**.

**Publishing:**
- Requires `approved` **and** a stored passing validation (`BX091`).
- Approving from `review_required` requires a named reviewer (`BX092`).
- Auto-publish is a separate switch and applies only to approved items.

## Duplicates, corrections, storage

- **Dedupe:** at news-event level by dedupe key; at article level by `unique (news_event_id, fact_block_hash)`. Reprocessing returns `duplicate`.
- **Corrections:** a corrected news event (`supersedes_id`) gets a new article. The earlier *published* article becomes `superseded` and stays readable; an unpublished one is `rejected` with a note. Corrections always require review.
- **Stored forever per article:** fact block (and fact block id and hash), sources, news event id, claims (sentence → fact ids), generator, validator and model versions, validation verdict, review reasons, reviewer and timestamps. Content columns are frozen (`BX002`); only workflow columns change. Deleting is refused.
- **Rights:** the public wire (`boxing_wire`) returns headline, dek, slug, version, hash and sources, **not** fact blocks. Third-party text in fact blocks is limited to short attributed public reasons (≤280 characters).

## Tests

- **`shared/news/news.test.mjs` (39):**
  - Generation from facts only, and no sentence for a missing fact.
  - An incomplete block writes no article; a malicious block is refused; derived versioning.
  - 26 hostile prose cases: invented number, number words, compound words, ordinals, percent, year, slash date, small numbers, reversed record, invented person, invented organisation, double and single quotes, injury, purse, odds price and odds words without odds, ranking without ranking, loaded title term, prediction, relative time, characterising a referee, rumour, stripped, suspension.
  - Market move with no cause (an added cause and an unlabelled derived value are both rejected).
  - The other boxer's number; weigh-in miss content; unverified attribution; conflicting sources; title vacancy; scorecard release; review forcing; hash determinism.
- **`tests/db/09_newsroom.test.mjs` (10), end to end on a real database:**
  - announcement → approved → published, with immutable article and fact block
  - duplicate processing
  - state machine gates
  - weigh-in miss and conflicting sources
  - scorecards and result
  - title correction superseding a published article, and title vacancy
  - market move without a cause
  - unresolved identity and a source without display rights
  - malicious name blocked
  - storage completeness
