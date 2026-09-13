# Identity review batch 001 — independent AI audit

Date: 2026-09-13
Environment reviewed: `propbetedge-boxing-staging` (`wpaxofilvbsjyrxrwjhg`)
Batch source: `reviews/identity/identity-review-batch-001.json`

**This document is advisory only. It is not a human identity decision and must not be written to `boxing_identity_appearance_decisions` as a human review.**

## Correction after full source-identity verification

The original version of this audit recommended 9 approvals and 3 holds. **That 9/3 split is withdrawn.**

The earlier hold rationale misread legitimate Team Boxing League repeat pairings as duplicate canonical bouts because the generated candidate record did not expose the commission bout identity suffix (`|2`), sheet/bout order, or preserved parser-correction history.

Direct staging verification now shows:

- **Yusmel Alejandro Ruiz vs Juan Barajas, 2026-06-26**
  - meeting 1: bout order 13, commission identity `...|juan-barajas|yusmel-alejandro-ruiz`
  - meeting 2: bout order 21, commission identity `...|juan-barajas|yusmel-alejandro-ruiz|2`
  - Ruiz is the current official winner of both meetings.

- **Sofia Viretti vs Suzana Rodriguez Griffin, 2026-06-26**
  - meeting 1: bout order 11, commission identity `...|suzana-rodriguez-griffin|sofia-viretti`
  - meeting 2: bout order 20, commission identity `...|suzana-rodriguez-griffin|sofia-viretti|2`
  - meeting 1 current official result is Griffin after the preserved parser correction chain; meeting 2 current official result is Viretti.

- **Samantha Ginithan vs Shelby Cannon, 2026-06-26**
  - meeting 1: bout order 3, commission identity `...|shelby-cannon|samantha-ginithan`
  - meeting 2: bout order 23, commission identity `...|shelby-cannon|samantha-ginithan|2`
  - meeting 1 current official result is Cannon after the preserved parser correction chain; meeting 2 current official result is Ginithan.

These are **separate official repeat pairings**, not duplicated canonical bouts. The result revision history is intentionally preserved false history from earlier parser output, with the latest canonical result deterministic.

Accordingly, the identity evidence for Yusmel Alejandro Ruiz, Sofia Viretti and Samantha Ginithan is not invalidated by those June 26 rows.

## Corrected assessment of Batch 001

After the additional source-identity check, I find **no evidence-based reason to revoke any of the 12 human approvals recorded by Justin Erickson**.

The batch-001 apply record shows exactly 12 human decisions, no automatic resolver decisions, and 12 corresponding official Florida bouts created. The separate Jose Cortes West Palm Beach appearance remains unresolved and was not inherited from the approved Colombia appearance.

No new hold should be recorded for Yusmel Alejandro Ruiz, Sofia Viretti or Samantha Ginithan based on my original audit.

## Workbench defect that remains valid

The audit did expose a real review-UX/evidence problem:

1. Candidate history should display the canonical/source bout identity, including repeat suffix/index such as `|2`.
2. Candidate history should display source/sheet bout order when repeat pairings occur on one card.
3. Preserved parser-correction history should be labelled explicitly instead of rendering as an unexplained win/loss pair.
4. The resolver reason `same_fight_already_on_record` is misleading for a distinct repeat pairing. A distinct label should be used for identity continuity across another meeting, e.g. `same_card_repeat_pairing_identity_continuity` or an equivalent precise reason.
5. Review tooling should distinguish:
   - duplicate canonical bout
   - legitimate repeat pairing
   - corrected historical result revision
   - current canonical result

This should be fixed so future reviewers are not forced to reverse-engineer source identity from the database.

## Batch 002 advisory review

`reviews/identity/resolver-dry-run-002.json` proposes two still-unapplied appearances:

- Sofia Viretti, 2026-05-01 second meeting vs Ariele Davis (`...|2`), 145.8 lb, exact name, Argentina, same Florida commission, no competing candidate.
- Esteuri Suero, 2026-05-01 second meeting vs Doctress Robinson (`...|2`), 151.6 lb, exact name, Dominican Republic, same Florida commission, no competing candidate.

Both are Tier A / confidence 98 in the dry run and each is a distinct official repeat pairing. The existing reason label `same_fight_already_on_record` is semantically wrong, but the identity evidence itself is strong.

**Advisory recommendation:** a human reviewer may approve both Batch 002 appearances, while separately fixing the resolver/workbench label. The label defect should not be treated as evidence that the boxer identity is wrong.

## Production

Production was not touched by this audit or correction.
