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

* **A canonical fighter.** Creating a boxer is a rights decision, not a side effect of reading a card (migration 0047).
  The source must hold `fighter_identity` as `covered_by_rights_review`; **undeclared refuses exactly like forbidden**,
  because the 0045 write gate is a deny-list and an undeclared lane would otherwise fall straight through it. Both
  promoters ship as `review_scope_gap`: their rights review approved announced schedule facts and said nothing about
  minting people. A refused corner is downgraded to identity **review**, not lost — the observation is kept, the event
  still writes, and a human can approve the person. Until the owner closes that gap, a promoter card writes its event
  and venue but no bouts, because a bout needs both corners resolved.

## Run order — the only approved sequence

1. **Natural-run proof** for the six-commission cron must PASS. Nothing below happens on a failed gate.
2. **Apply migrations 0042–0047** to staging, one at a time, in order.
3. **Verify source and lane state.** `pwsh scripts/staging/promoter-collect.ps1` runs this gate before it fetches a
   service-role key or writes anything, and `boxing_promoter_lane_ready()` is its single authority. It asserts:
   * **the schema half** — `boxing_event_discovery_candidates`, `boxing_source_capabilities_current`,
     `boxing_record_event_candidate`, `boxing_event_priority`, `boxing_pro_coverage_health`, `boxing_lane_rights_state`,
     the `boxing_bouts_lane_gate` trigger, and `boxing_fighter_identity_lane_allows_create`;
   * **the data half** — `promoter_pbc` and `promoter_matchroom` `enabled` + `approved_ingest` + `approved`, all seven
     schedule lanes `covered_by_rights_review`, no non-schedule lane escaped `not_permitted`, and `fighter_identity`
     declared one way or the other.

   Both halves matter because a half-applied 0046 **fails open**: the runtime binds to the schema half while the lane
   state reads `not_declared`, which the deny-list waves through. The collector refuses an apply on a half-applied
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
