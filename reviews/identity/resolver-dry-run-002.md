# Resolver dry run 002 (NOT applied)

Generated 2026-09-13T19:33:42.127Z. Decisions the unchanged Tier A/B/D graph resolver WOULD make now on blocked official bouts. Nothing was recorded; review them as a batch.

```
{
 "blocked_bouts_examined": 154,
 "appearances_that_would_bind": 2,
 "by_tier": {
  "A:matched": 2
 },
 "by_state": {
  "FL": 2
 },
 "bouts_that_would_be_created": 2,
 "bouts_by_state": {
  "FL": 2
 }
}
```

## Sofia Viretti: FL 2026-05-01 vs Ariele Davis

| | |
|---|---|
| Appearance | `2026-05-01|fort-lauderdale|team-boxing-league|ariele-davis|sofia-viretti|2|b` (Team Boxing League at War Memorial Auditorium; War Memorial Auditorium, Fort Lauderdale); document `fl-results:05-01-2026-Team_Boxing_League-results_without_med` |
| Would | **Tier A matched** -> Sofia Viretti (`dc05fc46-e9fd-4e19-a8ae-f198f97a615b`), confidence 98 |
| Resolver reason | repeat_pairing_identity_continuity |
| Stated hometown / official weight | Argentina / 145.8 lb |
| Evidence for | name_exact, hometown_same_region_only(not_decisive), repeat_pairing_identity_continuity, weight_145.8_vs_146_on_2026-06-26, same_commission:fl-athletic-commission |
| Evidence against | none |
| This appearance | source bout `2026-05-01|fort-lauderdale|team-boxing-league|ariele-davis|sofia-viretti|2`, repeat index 2, sheet order 18 |
| Candidate record | 2026-05-01 vs Ariele Davis, order 12; current: loss (rev1, identity_graph_reapply)<br>2026-06-26 vs Suzana Rodriguez Griffin, order 11 [repeat_pairing: meeting 1 of 2 on the same card]; current: loss (rev3, reparsed_with_florida-athletic-commission@1.0.1); preserved: rev1 loss (superseded_by_parser_correction by rev3), rev2 win (superseded_by_parser_correction by rev3)<br>2026-06-26 vs Suzana Rodriguez Griffin, order 20 |2 [repeat_pairing: meeting 2 of 2 on the same card]; current: win (rev1, reparsed_with_florida-athletic-commission@1.0.2) |
| Competing candidates | none |
| Opponent | Ariele Davis (resolved: same_card_name_and_hometown) |
| Bout impact | the official bout would be created |

## Esteuri Suero: FL 2026-05-01 vs Doctress Robinson

| | |
|---|---|
| Appearance | `2026-05-01|fort-lauderdale|team-boxing-league|doctress-robinson|esteuri-suero|2|b` (Team Boxing League at War Memorial Auditorium; War Memorial Auditorium, Fort Lauderdale); document `fl-results:05-01-2026-Team_Boxing_League-results_without_med` |
| Would | **Tier A matched** -> Esteuri Suero (`3b7a4532-c39d-4879-b0dd-fce7c3a06ec1`), confidence 98 |
| Resolver reason | repeat_pairing_identity_continuity |
| Stated hometown / official weight | Dominican Republic / 151.6 lb |
| Evidence for | name_exact, hometown_same_region_only(not_decisive), repeat_pairing_identity_continuity, weight_151.6_vs_151_on_2026-06-26, same_commission:fl-athletic-commission |
| Evidence against | none |
| This appearance | source bout `2026-05-01|fort-lauderdale|team-boxing-league|doctress-robinson|esteuri-suero|2`, repeat index 2, sheet order 29 |
| Candidate record | 2026-05-01 vs Doctress Robinson, order 4; current: win (rev1, identity_graph_reapply)<br>2026-06-26 vs Jasir Riley, order 5; current: win (rev1) |
| Competing candidates | none |
| Opponent | Doctress Robinson (resolved: same_card_name_and_hometown) |
| Bout impact | the official bout would be created |
