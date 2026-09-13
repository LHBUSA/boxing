# Identity review batch 001 — independent AI audit

Date: 2026-09-13
Environment reviewed: `propbetedge-boxing-staging` (`wpaxofilvbsjyrxrwjhg`)
Batch source: `reviews/identity/identity-review-batch-001.json`

**This document is advisory only. It is not a human identity decision and must not be written to `boxing_identity_appearance_decisions` as a human review.** The existing review guard requiring a named human reviewer remains correct and must not be bypassed.

## Result

- Recommend human approval: **9**
- Recommend hold: **3**
- Applied to staging: **0**
- Production touched: **NO**

## Recommend human approval

These nine appearances have an exact normalized name match, a compatible official weight, same Florida commission continuity, no competing candidate, and no contradiction found in the batch evidence. The staging graph audit also found no duplicate same-date/same-opponent canonical bout for these proposed fighter IDs.

1. **Jose Valenzuela Alvarado** → `6eb66caa-9b42-4b05-ba67-c27516d415f6`
   - Exact full-name form.
   - FL official weight 141.6 lb; candidate evidence 137.6 lb.
   - Same Florida commission.
   - Observed Puebla, MX; candidate currently only Mexico.
   - A different boxer, Jose A Valenzuela Gastelum of Renton, WA, exists, but is not a competing exact-name candidate.
   - Recommendation: `match` after human review.

2. **Jose Rodriguez Montemayor** → `781262fb-5f1c-4b73-8717-672a192a0c18`
   - Exact full-name form.
   - 120.8 lb vs candidate evidence 126 lb.
   - Mexico on both sides; city-level evidence absent.
   - Other Jose/Rodriguez names in the graph have materially different full names and locations.
   - Recommendation: `match` after human review.

3. **Manuel Enrique Arrieta Sangroni** → `7e9af7b5-79b5-44b6-8096-fbed53569808`
   - Exact full-name form.
   - 138.4 lb vs 136.8 lb.
   - Venezuela on both sides; same Florida commission.
   - No competing candidate or contradiction.
   - Recommendation: `match` after human review.

4. **Tristan Gallichan** → `c2bb89ad-4d6d-4c0e-a308-5a0f571d86b0`
   - Exact name.
   - 141.8 lb vs 145.2 lb.
   - Florida on both sides; same commission.
   - No competing candidate or contradiction.
   - Recommendation: `match` after human review.

5. **Gustavo Trujillo** → `8b37e533-a252-43c2-bc73-ce739cc72b95`
   - Exact name.
   - 244.4 lb vs 245 lb.
   - Cuba on both sides; same commission.
   - No competing candidate or contradiction.
   - Recommendation: `match` after human review.

6. **Alex Vallecillo** → `cb481094-6ba0-4c90-884d-b979c5f29b56`
   - Exact name.
   - Official and candidate evidence both 124 lb.
   - Nicaragua on both sides; same commission.
   - No competing candidate or contradiction.
   - Recommendation: `match` after human review.

7. **Jose Cortes** (Colombia appearance) → `d32c813f-f999-412d-af97-bda96e535dd3`
   - Exact name.
   - 179.2 lb vs 179 lb.
   - Colombia on both sides; same Florida commission.
   - The separate West Palm Beach appearance remains correctly excluded from this batch and should not inherit this decision.
   - Recommendation: `match` for this appearance only after human review.

8. **Ramon De La Cruz Sena** → `58ffde58-2411-4b1b-be7a-5419849fb9a5`
   - Exact normalized name (`ramon cruz sena`).
   - 145.4 lb vs 142 lb.
   - Argentina on both sides; same commission.
   - No competing candidate or contradiction.
   - Recommendation: `match` after human review.

9. **Esteuri Suero** → `3b7a4532-c39d-4879-b0dd-fce7c3a06ec1`
   - Exact name.
   - 151.6 lb vs 151 lb.
   - Dominican Republic on both sides; same commission.
   - No competing candidate or contradiction.
   - Recommendation: `match` after human review.

## HOLD — graph evidence is not currently clean enough

### Yusmel Alejandro Ruiz → `5ea394ab-9eeb-44ba-8e2a-384f0650869e`

The identity evidence itself looks strong: exact name, Cuba on both sides, 168.2 lb vs 172.4 lb, same Florida commission, no competing candidate.

However, staging currently contains **two canonical bouts** on 2026-06-26 against Juan Barajas for this fighter. The batch generator therefore repeats the same candidate record twice. Even though the duplicated result agrees, a duplicated canonical bout is graph-integrity debt and should not be used as clean review evidence.

**Recommendation: HOLD until the duplicate bout is reconciled, then regenerate the review evidence.**

### Sofia Viretti → `dc05fc46-e9fd-4e19-a8ae-f198f97a615b`

Identity evidence looks strong: exact name, Argentina on both sides, 147.4 lb vs 146 lb, same commission, no competing candidate.

But staging currently contains **two canonical bouts** on 2026-06-26 against Suzana Rodriguez Griffin. Worse, the result history on one duplicate oscillates between opposite winner IDs across reparses/revisions. The batch summary renders this as both a loss and a win while its `contradictions` array remains empty.

**Recommendation: HOLD. Repair/reconcile the duplicate bout and result revision chain, regenerate candidate evidence, then review again.**

### Samantha Ginithan → `2b2d8197-95f6-4f98-abe4-70417ed844f0`

Identity evidence looks strong: exact name, observed New Mexico with candidate Las Cruces, NM, 129.2 lb vs 129.4 lb, same commission, no competing candidate.

But staging currently contains **two canonical bouts** on 2026-06-26 against Shelby Cannon. The result history on one duplicate also oscillates between opposite winner IDs across reparses/revisions, while the batch `contradictions` field remains empty.

**Recommendation: HOLD. Repair/reconcile the duplicate bout and result revision chain, regenerate candidate evidence, then review again.**

## Required follow-up before applying Batch 001

1. Fix duplicate canonical same-date/same-opponent bouts for Yusmel Alejandro Ruiz, Sofia Viretti and Samantha Ginithan.
2. Fix/reconcile the result revision chains for Sofia Viretti and Samantha Ginithan so the latest canonical result is deterministic and provenance-correct.
3. Update the review workbench so duplicate canonical bouts and conflicting result revisions are surfaced as contradiction/danger evidence rather than silently appearing in `candidate_record`.
4. Regenerate Batch 001 after the repair.
5. A named human reviewer may then record decisions. Do not weaken the human-review guard and do not attribute this AI audit to a human reviewer.
