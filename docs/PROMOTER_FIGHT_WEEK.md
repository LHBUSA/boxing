# Promoter schedule lane — current fight-week cards

PBC and Matchroom publish announced professional cards before any commission calendar shows them. This lane reads those
pages for schedule facts only: event name, date, venue, city, promoter, broadcaster, published start time, and the
announced pairings with division, distance, title stake and card position. Results, officials, scorecards, weigh-ins,
photographs, video and article text are refused by the rights review and fail closed at write time (migration 0045's
lane gate).

## What the parsers refuse

* **A start time two sources disagree about.** The structured timestamp and the printed line are independent
  assertions. They are both kept; the printed times win only when they corroborate each other, and the disagreement is
  recorded as `source_time_conflict`. If nothing corroborates, `scheduled_start_at` is null and the date still stands.
  See `shared/adapters/promoters/time.mjs`.
* **An announced slot.** "TBC", "TBD", "TBA", "To Be Announced/Confirmed/Determined" and the "Opponent TBC" forms are
  slots, not people. A pairing is a bout only when both corners are named. The rule lives in
  `shared/adapters/promoters/names.mjs`, is used by every adapter, and is asserted again in the card contract so no
  future adapter can pass a placeholder down to the identity resolver. One incomplete slot never discards the event.
* **An ambiguous distance.** "an eight or 10-round showdown" is two possibilities, so no distance is stored.
* **A title we do not model.** British, Commonwealth, International and Intercontinental belts stay unresolved with the
  source's exact wording; an eliminator is not a title at stake.

## Facts are not content

Owner decision 2026-09-18 (revised). Public factual information may enter the canonical truth system when it has
sufficient source evidence and provenance. Rights restrictions apply to expressive or licensed material, not to the
underlying facts. This line is system-wide — there is no promoter-specific exception.

**Facts, judged on evidence** (migration 0047): fighter names and canonical identities, bouts, dates, venues,
participants, results, withdrawals, cancellations and card changes. Creating a person requires name quality, an
attributable observation, an event association (or two independent sources), and no ambiguous collision. Insufficient
evidence is a downgrade to **review** — the observation, its timestamp and its reason are kept and a human decides.

**Content, judged on rights** (unchanged, still refused at write time): article text and excerpts, biographies and
promotional descriptions, images, video and graphics, paywalled or credential-restricted material, licensed feeds. A
source whose `fighter_attributes` lane is closed creates the **name and nothing else** — the minimum canonical identity
— and contributes nothing to a profile.

## Run order — the only approved sequence

1. **Natural-run proof** for the six-commission cron must PASS. Nothing below happens on a failed gate.
2. **Apply migrations 0042–0047** to staging, one at a time, in order.
3. **Verify source and lane state.** `pwsh scripts/staging/promoter-collect.ps1` runs this gate before it fetches a
   service-role key or writes anything, and `boxing_promoter_lane_ready()` is its single authority. It asserts:
   * **the schema half** — `boxing_event_discovery_candidates`, `boxing_source_capabilities_current`,
     `boxing_record_event_candidate`, `boxing_event_priority`, `boxing_pro_coverage_health`, `boxing_lane_rights_state`,
     the `boxing_bouts_lane_gate` trigger, and `boxing_identity_evidence`, `boxing_identity_name_quality`;
   * **the data half** — `promoter_pbc` and `promoter_matchroom` `enabled` + `approved_ingest` + `approved`, all seven
     schedule lanes `covered_by_rights_review`, and no content or non-schedule lane escaped `not_permitted`.

   Both halves matter because a half-applied 0046 **fails open**: the runtime binds to the schema half while the content
   lanes read `not_declared`, which the deny-list waves through. The collector refuses an apply on a half-applied
   database; a dry run is allowed to proceed and reports what it found. If any of this is false the run **STOPS**. The
   fix is the migration or the rights review — never a flag on the collector.
4. **Dry-run the collector** (`scripts/staging/promoter-collect.ps1`, no `-Apply`): fetch, parse, plan, write nothing.
5. **Inspect the receipt.** Check the corrected UTC instants, the `source_time_conflict` records, the slot refusals, and
   that no planned fighter is a placeholder.
6. **`-Apply`** to canonicalize.
7. **Coverage health** (`boxing_pro_coverage_health()`): every upcoming event with its gaps, and `MAJOR_PRO_CARD_MISSING`
   for any announced card we do not hold.
8. **Visual QA** of the fight-week surfaces.

## Local work that needs no gate

`node scripts/promoters/dry-run.mjs` replays the committed fixtures against a disposable local database;
`--live` fetches the real pages instead. Both write nothing anywhere.
`node scripts/promoters/make-fixture.mjs <captured.html> <fixture.html>` cuts a captured PBC event page down to the
JSON-LD, the printed header and the fight rows, so fixtures carry no article text, photography or personal data.
