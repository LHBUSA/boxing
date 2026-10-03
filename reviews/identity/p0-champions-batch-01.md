# P0 champion identity review, batch 01 (2026-10-03)

**Status: PREPARED. Nothing applied.** Every recommendation is advisory. A named human reviewer decides each entry;
the database refuses automated reviewer names. Machine file: `p0-champions-batch-01.json` (candidate ids,
proposed fighter public ids, evidence).

## Why the batch has only 8 decisions out of 87 champion entries

- The 87 entries are distinct (body, name as printed) pairs.
  - The same boxer is spelled two ways inside one body once: the WBC prints O'Shaquie Foster with two different apostrophes.
  - That leaves 86 distinct printed identities and **76 distinct boxers**. Naoya Inoue holds all four bodies' belts, and 6 others hold belts in two or three.
- **Only 7 of the 76 boxers (8 entries) have any PropBetEdge fighter to link to.** The fighter graph comes from
  regional US commission cards and announced cards, and the other 69 champions have no canonical fighter yet.
  Under the owner rule, no canonical fighter is created just because a sanctioning body printed a name, so those
  69 are not decisions yet. See *Next decision* below.

## Decisions

Evidence tiers:
- **A**: the same body's title in the same division was at stake in a verified bout of the candidate.
- **B**: distinctive name plus a verified bout at the division weight, or an announced title bout.
- **none**: nothing independent of the name.

| # | Body · cluster | Printed as | Proposed fighter | Evidence | Recommendation | Decision (fill) |
|---|---|---|---|---|---|---|
| 1 | WBC · `name:ryan garcia` | RYAN GARCIA (US), welterweight champion | Ryan Garcia (Victorville, CA) | **A**: won a 12-rd bout 2026-02-21 (NV) for the **WBC world welterweight title**, 146.5 lb | MATCH | |
| 2 | WBC · `name:dalton smith` | DALTON SMITH (GB), super lightweight champion | Dalton Smith | **B**: booked 2026-10-24 (Matchroom card) for the **WBC world super lightweight title**; no completed bout yet | MATCH | |
| 3 | WBA · `id:10627` (WBA boxer id) | GARY ANTUANNE RUSSELL (USA), world super lightweight | Gary Antuanne Russell (Capitol Heights, MD) | **B**: won a 12-rd bout 2026-02-21 (NV) at 140.0 lb; three-part name | MATCH | |
| 4 | WBA · `id:10548` (WBA boxer id) | JARON ENNIS (USA), world super welterweight | Jaron Ennis (PA) | **B**: won a 12-rd bout 2024-07-13 (PA) at 146.4 lb; moved up since | MATCH | |
| 5 | WBO · `name:jaron ennis` | JARON ENNIS (USA), super welterweight champion | Jaron Ennis (PA) | **B**: same boxer and evidence as #4 | MATCH | |
| 6 | WBA · `id:4439` (WBA boxer id) | MURAT GASSIEV (RUS), world heavyweight | Murat Gassiev (Russia) | **B**: won a 10-rd bout 2025-08-23 (FL) at 233.0 lb | MATCH | |
| 7 | IBF · `name:angelo leo` | Angelo Leo (USA), featherweight champion | Angelo Leo (Las Vegas, NV) | **none**: the candidate has no bout, id or card | HOLD | |
| 8 | WBC · `name:carlos adames` | CARLOS ADAMES (DOM. R.), middleweight champion | Carlos Adames (DR) | **none**: the candidate has no bout, id or card | HOLD | |

## Danger flags

- **#1 Ryan Garcia:** a common name. The WBO cluster for "Ryan Garcia" is *ambiguous* (countries differ across months). This decision is for the WBC cluster only, and rests on the title-at-stake bout, not the name.
- **#2 Dalton Smith:** the evidence is an announced card, not a completed official result.
- **#6 Murat Gassiev:** the IBF and WBO name clusters are ambiguous (countries differ). This decision is for the WBA boxer id only.
- **#3, #4 and #6** use the WBA's own boxer id cluster (`source_identity_proven`). The WBA *name* clusters for these boxers stay ambiguous on purpose and need no decision.

## How to approve

For each entry, write MATCH, HOLD or DISTINCT plus a note of at least 20 characters in your own words, and name yourself as
reviewer. Applying is one reviewed insert per approved entry into `boxing_org_identity_candidate_decisions`.
Once applied, the matched fighter's sourced record, ledger and Fight DNA reach that body's lane and rankings.

## Next decision (69 champions with no canonical fighter)

Linking cannot help these until a canonical fighter exists. The approved, zero-cost way to create one from evidence is
the existing identity lane (migration 0047) fed by an approved identity source. Wikidata (CC0) is already approved for
identity, and most current champions have a Wikidata item and a BoxRec-free identity there. Proposal, for owner decision: build a
Wikidata-backed P0 identity seed that creates a canonical fighter only when a Wikidata boxer item matches the
sanctioning-body entry on name + nationality + division-era evidence, and holds everything else for review.
