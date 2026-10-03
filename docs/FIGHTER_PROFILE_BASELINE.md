# Fighter profile presentation baseline (FROZEN 2026-10-03 at 8cca82c)

Owner decision: the fighter-profile UI is frozen at commit 8cca82c (production boxing-cug2kczpn; rollback
boxing-i80hxxgcu). Do not revisit the missing-field presentation unless a real production defect appears. Next work is
data depth (identity review, commission history), not profile cosmetics.

Invariants (enforced by web/lib/fighter-facts.ts + web/lib/fighter-facts.test.ts):

- A missing sourced fact is omitted. Never render `Not verified`, `Unknown`, `N/A` or `—` as profile filler.
- 0 verified bouts in the PropBetEdge graph is never shown as a career record (no `None yet`, `0 verified bouts`,
  `No wins yet`, zero rates); bout-derived sections render only with verified bouts.
- Verified bouts do not authorize unrelated bio facts.
- Merges do not copy profile attributes from the merged (losing) identity.
- Nationality, age, stance, height and reach stay independently sourced; age only through the identity-proven path;
  date of birth is never shown.
- Identity-only fighters show substantial title/ranking pages (sanctioning-body records, labelled as each body's own)
  without fabricated career stats.
- JSON-LD stays tied to the evidence model (`Professional boxer` only with verified bouts).
- `not verified` remains a legitimate status on methodology, review and diagnostic surfaces.
