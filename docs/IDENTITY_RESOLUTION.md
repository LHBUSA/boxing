# Boxer identity resolution (issue #1)

A canonical boxer is a `boxing_fighters` row. Its immutable public id (`pbe_boxer_<32 hex>`) is published outward and a trigger stops it from being rewritten. No external provider keys the boxer. BoxRec, Wikidata, commission, sanctioning-body, promoter and odds ids are all rows in `boxing_fighter_identities`, and each `(namespace, external_id)` is unique among non-rejected mappings.

## Components

| Piece | Where | Role |
|---|---|---|
| Name normalization | `shared/identity/normalize.mjs` | Parses names and builds retrieval keys. Never replaces the source string |
| Evidence | `shared/identity/evidence.mjs` | Compares one observation against one candidate |
| Resolver | `shared/identity/resolver.mjs` | Pure, deterministic decision (`boxing-identity-resolver@1.0.0`) |
| Pipeline | `shared/identity/pipeline.mjs` | Record → candidates → decision → persist; shared by Workers and scripts |
| Retrieval + persistence | migration `20260912000004` | `boxing_identity_candidates()`, `boxing_apply_identity_decision()` |
| Internal API | `workers/boxing-identity` | Resolve, fighter, identities, aliases, unresolved, coverage, seed. **Not deployed** |
| Adapters | `shared/adapters/identity/` | Wikidata (approved); BoxRec, commission and promotion (disabled) |

## Name normalization

`parseName()` keeps `raw` verbatim and derives the other forms:
- Unicode NFKC, then NFKD with combining marks stripped (é→e)
- Latin special letters (ł ø ß æ …) and Cyrillic (Russian, Ukrainian, Belarusian, Bulgarian, Serbian, Kazakh) transliterated
- Apostrophes removed (`O'Brien` → `obrien`); periods, hyphens and other punctuation split tokens
- Suffixes `Jr / Sr / II / III / IV` (plus `hijo`, `filho`, `jnr`) separated into `suffix`, never dropped
- Nicknames in quotes or parentheses extracted
- `Surname, Given` comma order reordered
- Surname particles (`de la`, `dos`, `van`, `bin`, …) are optional for matching but kept in `tokens`
- Non-Latin scripts that cannot be romanized reliably (CJK, Arabic, Thai) stay as-is and match only through explicit aliases
- `skeleton()` is a lossy consonant form that nominates transliteration variants (Oleksandr/Alexander, Hvozdyk/Gvozdik, Kowalski/Kovalski). **It is never proof.**

Retrieval keys (`full:`, `sorted:`, `skel:`, `joined:`, `part:`, `init:`, `nick:`) are produced by the same function for indexing and for lookup, so they cannot drift. Candidates are also retrieved by exact DOB and by trigram similarity on the normalized name (`pg_trgm`). Without the trigram path, a surname typo with no DOB would never be retrieved, and a seed run would create a duplicate.

## Evidence classes

| Class | Signals |
|---|---|
| Name level | `exact`, `reordered`, `joined`, `transliteration`, `containment` (strong) · `fuzzy`, `initial`, `nickname` (weak) · `surname` (bout scope only) |
| Strong corroboration | exact DOB, bout context (same opponent ±3 days), 2+ shared opponents |
| Medium | nationality match, division within 2 classes, stance, height+reach, hometown, promoter, 1 shared opponent, DOB year match |
| Soft conflict (blocks auto-match → review) | DOB typo-like (±1 day, day/month swap, one digit), nationality conflict, missing Jr/Sr on one side, stance/physical/division conflict, same namespace already mapped to a different id |
| Hard conflict (rules the candidate out) | DOB conflict, sex conflict, Jr vs Sr, previously rejected by a reviewer |
| Sibling/twin signature | Transliteration or fuzzy name where a given or middle name differs (Antonio/Antuanne, Dorian/Darian) |

## Decision policy

1. **External id first.** A live `(namespace, external_id)` mapping decides the match. If the mapped boxer hard-conflicts with the observation (for example, a different DOB), the result is review (`mapped_identity_conflict`). The mapping is never moved.
2. **Auto-match** requires ALL of:
   - A strong name level plus strong corroboration, OR a weak name level plus strong corroboration plus two medium signals.
   - No hard and no soft conflicts.
   - If the given or middle name differs, corroboration **other than DOB**, because twins share DOB, surname, nationality and often division.
   - Exactly one candidate qualifies. If two qualify, the result is review (`ambiguous`).
   - Verification: `verified` only for exact/reordered/joined names with exact DOB; otherwise `probable`.
3. **Review** covers any name-similar candidate that is not ruled out. It also covers:
   - same-DOB boxers with no conflicts (`possible_name_change`)
   - a strong name + DOB match that also has a hard conflict (`contradictory_evidence`): exact name + exact DOB + wrong sex is a data error, not a new person
4. **Create** a new boxer only when every candidate is ruled out by a hard conflict or no candidate exists, AND the source is `approved_ingest`. `identity_only` sources can never create a boxer; the database enforces this (`source_cannot_create`) even if a caller claims otherwise.
5. **Bout scope** (odds and card resolution): the candidate pool is exactly the bout's corners. Initial and surname-only names are allowed, the match must be unique, and nothing is persisted or created. Anything else returns `unresolved`.

Review reasons: `ambiguous`, `contradictory_evidence`, `given_name_variant`, `dob_mismatch`, `nationality_conflict`, `suffix_missing`, `possible_name_change`, `weak_name_only`, `attribute_conflict`, `namespace_id_conflict`, `insufficient_evidence`, `mapped_identity_conflict`, plus the database-side guards `external_id_conflict`, `concurrent_mapping` and `source_cannot_create`.

## Persistence (`boxing_apply_identity_decision`, one transaction)

1. The raw observation is inserted first; the source gate and content-hash dedupe are enforced by triggers. A repeated observation returns `duplicate_observation` with the original outcome and writes nothing.
2. The database re-checks for races and policy violations: an external id mapped meanwhile, a forged match that contradicts an existing mapping, or a non-approved source trying to create.
3. Matched or created:
   - The identity mapping is written.
   - Aliases and retrieval keys are written. The alias kind follows how the record matched: a nickname match is indexed as a nickname, and an initial or surname-only match teaches no alias.
   - Attribute claims are written (append-only; they never overwrite canonical columns).
   - Verified matches may fill NULL canonical columns only.
   - An observation link is written.
4. Review: a queue item is written with the raw identity, candidates (with per-candidate evidence), confidence, reasons, observation id and resolver version. Its dedupe key keeps one pending item per source identity.
5. An append-only `boxing_identity_resolutions` row is always written.

"Why did PropBetEdge believe this boxer was this person?" is answered by `boxing_get_fighter(ref)`. It returns identities, aliases (with source), attribute claims (with source and observation) and every resolution (method, evidence, confidence, source, decision kind, reviewer).

Manual review (`boxing_resolve_identity_review`) needs an actor and a note. It records the decision as a `manual` resolution. A `rejected` decision stores a rejected identity, so the resolver never proposes that pairing again.

## Coverage metrics

`boxing_identity_coverage()` and per-run `boxing_ingest_runs.metrics` report:

| Metric | Definition |
|---|---|
| raw identities observed | `fighter_identity` observations (per run: records processed) |
| duplicate observations | identical payload already observed; nothing written |
| canonical fighters created | `created` resolutions |
| identities matched | `matched` resolutions (and how many by external id) |
| identities unresolved | `review` + `unresolved` resolutions; pending queue items reported separately |
| identities rejected | invalid observations plus adapter rejections (e.g. conflicting DOB statements upstream) |
| duplicates prevented | decisions that did **not** create a boxer although the external id was new: evidence matches plus review holds. A naive "new id → new boxer" pipeline would have duplicated each |
| source breakdown | all of the above per `source_key` |

## Sources

| Source | State | Notes |
|---|---|---|
| `wikidata` | enabled (CC0, `approved_ingest` since seed 0001) | Identity/reference only. **Cannot establish active status**; absence proves nothing. BoxRec ids Wikidata carries stay in the raw payload and are not written as boxrec identities |
| `boxrec` | disabled, `blocked` | Adapter throws. No licence is being pursued (zero-new-paid-source policy) |
| `commission_official`, `promotion_official` | disabled placeholders | Each concrete commission or promoter needs its own reviewed source row |

## "Active universe"

No approved source currently establishes **active** status. Wikidata identifies professional boxers (occupation boxer + BoxRec id, born ≥ 1975, no date of death) but does not record activity. `career_status` therefore stays `unknown` and is not inferred. An active universe needs an approved no-cost record source: commission result/licensing data, official promoter cards, or sanctioning-body rankings once rights are reviewed under #2. Paid record APIs and a BoxRec licence are not planned.

## Local real-data check (2026-09-12)

This was a replay of 5 Wikidata pages (2,500 rows, fetched once and replayed from a local file) into a **local disposable** database. Nothing was written to any remote database.

| | |
|---|---|
| records processed | 2,421 |
| canonical boxers created | 2,417 |
| auto-merged | 0 (no candidate cleared the auto-match bar) |
| held for review | 4 |
| rejected upstream | 36 (QIDs with conflicting DOB statements) |
| replay of an identical page | 477/477 duplicate observations, 0 writes |

The four review holds were all correct to hold:

| Held record | Candidate | Reason |
|---|---|---|
| Gary Russell Jr. | Gary Antonio Russell | `suffix_missing`; the two are brothers |
| Gary Antuanne Russell | Gary Antonio Russell | `given_name_variant`; also brothers |
| Gusmyr Perdomo (1977-09-07) | Gusmyl Perdomo (1976-09-07) | `given_name_variant`; likely one person entered twice upstream, needs a human |
| José Rodríguez Tenorio | Jesse Rodriguez | `nationality_conflict` |

Two different "Martin Ward" items (DOBs 1988 and 1991) became two canonical boxers.
