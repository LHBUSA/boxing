# Boxing Core production readiness — 2026-09-12

Branch `boxing-core-v1`. **Nothing is deployed.** Migrations 0001–0009 are applied to the dedicated Boxing STAGING Supabase project only (`propbetedge-boxing-staging`, ref `wpaxofilvbsjyrxrwjhg`, created 2026-09-13; no production data, never the UFC/NFL/MLB projects).

The whole suite runs on disposable PostgreSQL 17, locally and in CI (`postgres:17`): 147 unit/worker tests and 141 database tests. The test harness still refuses non-local hosts; staging is checked by `scripts/staging/verify-staging.ps1` (29 SQL + HTTP checks, all writes rolled back).

## What is ready (code + schema + tests)

| Area | Issue | State |
|---|---|---|
| Schema foundation, audit, lockdown, append-only history | PR #7 | Ready to apply to a disposable Supabase project |
| Boxer identity resolver, review queue, provenance | #1 | Ready; validated on a local replay of 2,421 real Wikidata records |
| Odds capture, derivations, freshness, `MARKET_MOVED` | #4 | Ready; **collection blocked on provider rights** |
| Title graph, ranking snapshots, Title Map | #2 | Ready; **automation blocked on sanctioning-body rights** |
| Events, card history, officials, results, scorecards, weigh-ins, regulatory | #3 | Ready; **no approved event source** |
| Fact-driven newsroom | #5 | Ready; generation and publishing switched off |
| Fight DNA, Judge/Referee DNA, matchup snapshots, model registry, read-only gateway | #6 | Ready; engine not scheduled; bout-winner model registered **untrained**; punch/knockdown metrics unavailable (no approved source) |

## Blockers, in the order they unblock value

1. **A boxing PRODUCTION Supabase project.** STAGING exists and is verified (see `staging/boxing-staging.json`, `scripts/staging/`). Production still needs owner approval, then the same proof → apply → verify sequence.
2. **The Odds API rights review** (`the_odds_api` source row). Technical coverage of `boxing_boxing` is confirmed; the plan's persistence, display, derivative and redistribution terms are not recorded anywhere. Every week without capture is market history that cannot be recreated.
3. **An approved event and result source.** Without one, cards and bouts never exist, and odds events have nothing to match; every provider event lands in the unmatched queue by design. Options: a commission-by-commission source rows plus terms review, a promoter feed agreement, or a licensed data provider.
4. **Sanctioning-body terms** (WBC, WBA, IBF, WBO) before any ranking or title automation.
5. **BoxRec licence**, or another licensed record source, to establish an *active* universe. Wikidata cannot.
6. **Deploy secrets per Worker:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BOXING_INTERNAL_TOKEN`, plus `ODDS_API_KEY` for boxing-odds. Service bindings between Workers are also still to be configured.

## Deploy order once unblocked

1. Apply migrations to the boxing production project (proof, then apply, then `verify-staging.ps1`-equivalent checks). Record the rollback approach: each migration is forward-only; rollback means restoring the pre-apply snapshot.
2. Deploy `boxing-identity` (internal only), then run the Wikidata seed with `IDENTITY_SEED_ENABLED=true` for bounded pages.
3. Review and enable `the_odds_api`, deploy `boxing-odds` against staging, verify one capture, then set `ODDS_CAPTURE_ENABLED=true`.
4. Deploy `boxing-events`, `boxing-rankings` and `boxing-news` with their switches off. Enable each only when an approved source feeds it.
5. `boxing-gateway` (built, read-only, not deployed) after that. The frontend is not built.

## Known limits

- **Card documents** need an external bout id to detect replacements; without one, a new pairing is flagged for review.
- **Knockdowns and punch statistics:** modelled with explicit coverage (#6), but no approved source supplies them, so those metrics are `source_unavailable`.
- **Weight-class limits:** use current rules; historical bouts rely on contracted weight.
- **Closing odds** use the provider's commence time; walkout times are unknown.
- **The newsroom** writes plain, deterministic wire copy. An LLM rewriter could be added behind the same validator.
- **Officials resolution** is conservative: near-identical names go to review.
