# Upcoming-card source permission requests: DRAFTS, NOT SENT

Status (2026-09-13): drafted for owner review.
- **Nothing has been sent.** Nobody at any promoter has been contacted.
- **Nothing here is permission.** Every promoter source stays disabled in `boxing_sources` until a written grant exists and a new rights review is recorded.

| Promoter | Registry row | Current classification | Draft | Contact channel (from public site, unverified) |
|---|---|---|---|---|
| Premier Boxing Champions | `promoter_pbc` | review_required, disabled | [pbc.md](pbc.md) | info@premierboxingchampions.com (general contact on the terms page); confirm before sending |
| Matchroom Boxing | `promoter_matchroom` | review_required, disabled | [matchroom.md](matchroom.md) | boxing@matchroom.com (listed on matchroomboxing.com); confirm before sending |
| Ohashi Boxing Gym / Phoenix Promotion | `promoter_ohashi` | review_required, disabled | [ohashi.md](ohashi.md) (English + Japanese) | **not identified**: find the official inquiry form or address on ohashi-gym.com first |

Sanctioning body: **WBC** (`wbc_official`) is `approved_ingest` since 2026-09-14 (owner decision: no separate permission required). The earlier draft [wbc.md](wbc.md) is superseded and not sent.

**Not drafted, and they stay disabled:**
- **Top Rank, Queensberry and BOXXER** (`blocked`): their terms explicitly prohibit robots, spiders, crawling or scraping.
- **Golden Boy and Riyadh Season** (`review_required`).
- **Most Valuable Promotions** stays `reference_only` (robots `use=reference`) unless a stronger permission basis is found.

## Before sending (owner)

1. Fill in sender name, title and reply address. Do not use a no-reply address.
2. Confirm the contact channel on the promoter's own site on the day of sending.
3. **Crawler identity:** the drafts promise `PropBetEdge-Boxing/1.0 (+https://propbetedge.ai)`. The commission adapters currently send `PropBetEdge-Boxing/1.0 (+https://propbetedge.ai; official commission records; low-rate)`. A promoter adapter must send exactly the identifier agreed with that promoter, so change the code before the first retrieval if they ask for a different one.
4. **Once a reply arrives:**
   1. Store it (PDF or email export) outside Git, with its date.
   2. Record a new `boxing_source_rights_reviews` row through a migration: decision, permitted uses, limits, reviewer.
   3. Build the source-specific adapter against `shared/adapters/promoters/contract.mjs`.
   4. Enable the source only then.
5. A "no" or silence changes nothing: the source stays disabled.

## What we ask for, in every draft

- **Scope:** automated retrieval and normalization of publicly posted upcoming event and card facts: event date, venue and location, scheduled bouts, fighter names, weight class or contracted weight where published, card changes, cancellations and replacements.
- **Attribution:** kept, with source URLs.
- **Not republished:** page design, long-form editorial, images or video.
- **Rate limits and cadence:** honoured. The crawler is identified clearly.
- **No claim of existing permission.**
