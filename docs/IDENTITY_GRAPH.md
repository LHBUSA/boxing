# Career-graph identity resolution

Status (2026-09-13): code on `boxing-core-v1`; migration 0016 on STAGING only.

## Why

Official commission sheets identify a boxer by name, stated hometown and weight. They carry no usable source id, and PropBetEdge never uses DOB or federal ids. The name resolver (`shared/identity/resolver.mjs`) auto-matches only with strong corroboration (DOB, the same bout, two shared opponents), so a boxer's second card always went to review: 147 items on staging, which blocked about 177 Florida and 25 Nevada bouts.

The graph resolver (`shared/identity/graph.mjs`, `boxing-identity-graph@1.0.0`) weighs what the sheets do carry against what the canonical graph already knows about each candidate. It never loosens the name resolver. It runs only for corners the name resolver could not decide.

## Unit of decision: the appearance

An appearance is one corner of one source bout: `<source bout id>|<a|b>` in the source's fighter namespace.

Every graph decision is a row in `boxing_identity_appearance_decisions`, which is append-only. Each row carries:
- the tier and decision
- the canonical boxer
- confidence
- the full evidence: observation context, plus the reasons for and against each candidate
- evidence hash, resolver version and time
- `decided_by`

The latest row per appearance wins. A human decision is a new row (`decided_by`, a note is required), never an update. On every re-apply, a recorded binding is reused before any resolution. Review items are deduplicated by name, so a pending item closes only when every appearance linked to it is bound to one boxer.

## Tiers

| Tier | Decision | Requirements |
|---|---|---|
| **A**: deterministic | match | The candidate already has a bout against the same resolved opponent within one day, with a strong name form, no contradiction and no other plausible candidate. Since `boxing-identity-graph@1.1.0` (issue #10) the evidence is labelled precisely. **`repeat_pairing_identity_continuity`**: that bout is a DIFFERENT official bout on the same card (different source bout id such as `<pair>` vs `<pair>\|2`, or a different sheet order). **`same_fight_already_on_record`**: the same fight recorded again (another event row, or no distinguishing id or order), i.e. a possible duplicate record. The tier conditions did not change. A recorded binding (resolver or human) is also deterministic. |
| **B**: high-confidence graph | match | See the list below. |
| **C**: ambiguous | review | Anything else with a plausible candidate. |
| **D**: conflict | reject the candidate | A hard contradiction (list below). When every name-similar candidate is rejected and the source is `approved_ingest`, a distinct boxer is created. |

**Tier B, all of:**
1. The name is exact, reordered or joined. No different given name, no missing Jr/Sr.
2. No contradiction at all.
3. It is the only name-similar candidate (strong or weak name level) that is not Tier D.
4. At least three independent support families, two of them mandatory:
   - **hometown (mandatory):** the same city-level stated hometown ("Miami, FL"; a country or state alone never counts)
   - **weight (mandatory):** official weight within max(8 lb, 5%) of the candidate's nearest weigh-in within 400 days
   - **plus one of:** the same commission, the same venue, or a rematch of a recorded opponent

**Hard conflicts (Tier D):**
- the candidate fought at another event within ±2 days in a different commission or venue (a same-place bout on another event row is only a soft "possible duplicate event")
- the sheet marks a debut but the candidate has an earlier completed bout
- the candidate is the opponent
- suffix or sex conflict

**Soft contradictions (block auto-resolution → review):**
- a different city-level hometown
- a weight gap above max(20 lb, 12%)
- a bout 3–13 days away
- a possible duplicate event
- a missing suffix

**Never decisive:** fuzzy similarity, region-only hometowns, sportsbook names (never an input) and DOB (never used).

Thresholds live in `TIER_B_RULES` (`shared/identity/graph.mjs`). Changing them is a resolver version bump with a test.

## Review assistant

`buildIdentityReviewReport` (`shared/identity/review-assist.mjs`) produces a report per pending item from stored official observations and the career graph, with no refetching. For each appearance it shows:
- raw and normalized name, commission, event date, event, venue, jurisdiction
- opponent, weight, stated hometown, debut flag
- per candidate: aliases, approved source identities, hometowns, prior opponents, weights, jurisdictions, tier, confidence, and the reasons for and against
- the resolver's proposal

No DOB, private identifier or sportsbook name appears.

```
pwsh scripts/staging/identity-graph.ps1 -Report -OutDir <local dir>   # read-only, dry-run projection
pwsh scripts/staging/identity-graph.ps1 -Reapply florida,nevada        # re-apply stored parses (no refetch)
pwsh scripts/staging/identity-graph.ps1 -Summary
```

## Re-apply without refetching

`reapplyStoredDocuments` re-applies the latest stored parse of every accepted official result document:
1. Documents are processed in chronological order, so earlier cards build the graph that later cards are resolved against.
2. The deterministic bout-id assignment is re-run.
3. Passes repeat while new bindings keep unlocking bouts.
4. The run is recorded with `trigger_type = backfill`.
5. News written by a re-apply is history (`payload.temporal.mode = 'reapply'`, state `skipped`).

## Provider identities (odds)

`boxing_provider_participant_identities` stores a sportsbook participant name → canonical boxer mapping. It is written only after that name resolved to a corner of exactly one canonical bout, with the other name resolving to the other corner. The database refuses a mapping unless the boxer is an active corner of a bout mapped to that provider event.

Afterwards (matcher `boxing-odds-event-matcher@1.1.0`), a verified provider identity confirms its own boxer and refuses any other corner. A provider name never creates, establishes or merges a boxer. In bout scope, a different given name (Jermall/Jermell) never matches.

## Staging run (2026-09-13)

**Dry run** (read-only report over the 147 pending items, 242 appearances): 1 Tier A, 62 Tier B, 179 review. Every proposed match was audited:
- same city-level hometown, weights within a few pounds, same commission, no contradiction
- the only non-exact name was "DeVon Williams" → "De Von Williams" (joined forms)
- brothers "Andrey Bonilla" and "Ari Bonilla" (both El Paso, TX) bound to different boxers

**Re-apply** of stored Florida (34 documents) and Nevada (17 documents) parses, then the New Jersey result backfill:

| | Before | After |
|---|---|---|
| Pending review items | 147 (Florida 121, Nevada 26) | 130 (Florida 94, Nevada 19, New Jersey 17 new); 40 closed by the resolver |
| Appearance bindings | — | 4 Tier A and 58 Tier B, linking 45 distinct existing boxers; 0 Tier D, 0 boxers created by the graph |
| Florida bouts | 214 | 257: 43 of the 177 blocked unlocked with their official results; 134 still blocked |
| Nevada bouts | 109 | 115: 6 of 25 unlocked; 19 blocked |
| Canonical fighters | 759 | 880: +121 first sightings in New Jersey documents, by the name resolver |

**Why most items stay in review:**
- 61 appearances have weight and commission continuity but no city-level hometown on one side (country or state only)
- 28 have a different city
- 20 fought within 13 days (Team Boxing League)
- a few have missing suffixes or incompatible weights

These need a human or a new independent source; thresholds were not loosened.

## Tests

- `shared/identity/graph.test.mjs`: tiers, weak clues, same names, impossible dates, debut conflicts, same fight on record.
- `tests/db/14_identity_graph_upcoming.test.mjs`, end to end:
  - graph resolution, same-name distinctness, Tier D creation, review closure
  - auditable append-only decisions, the review report
  - a human decision followed by re-apply, with no refetch and no bogus news
  - provider identities after an authoritative match
- `shared/odds/odds.test.mjs`: given-name guard and provider identity refusal.

## Review evidence for repeat pairings and corrections (issue #10)

Candidate history (`shared/identity/bout-history.mjs`, graph context from migration 0018) shows for every candidate bout:
- the source/canonical bout identity
- the repeat index (`|2`) and official sheet order
- the **current canonical result** (revision, change reason, whether it is a parser correction)
- **preserved history**: earlier revisions, labelled `superseded_by_parser_correction` or `superseded_by_later_official_revision`

Bouts against the same opponent within a day are classified:
- **`repeat_pairing`** ("meeting N of M on the same card"): the same event with distinct source ids or distinct sheet orders
- **`possible_duplicate_canonical_bout`**: anything else. This also raises the review danger flag `candidate_record_has_possible_duplicate_bout`.
