# Boxing Free / Pro architecture (design, not built)

Status 2026-09-14: design only. No surface is locked, no entitlement check exists in `web/`, and nothing is sold.

## Principles

1. **Never lock basic truth.** Cards, results, official scorecards, fighter records, officials' assignments, titles
   and rankings (once cleared), Hall of Fame records, history and official video stay public.
2. **Lock only real depth.** A locked module must exist and work for Pro users, and the public page shows what it
   contains and its sample size (e.g. "Judge panel-deviation profile · 19 cards").
3. **No fake model.** While `pbe_bout_winner` is untrained there is no probability, fair line, edge, pick or
   "locked model" teaser anywhere (UFC's blurred "Algo lean · locked" block is explicitly not copied).
4. **Entitlement on the server.** Pro data is fetched by the Next.js server only after an entitlement check against
   the network commerce system (`pbe_session`); the browser never receives locked payloads.

## Candidate split

| Public (always) | Pro (when real) |
|---|---|
| Fight Week, cards, results, official scorecards | Fight-week alerting (card changes, weigh-in misses, officials assigned) |
| Fighter dossier, verified record, basic Fight DNA with samples | Deeper Fight DNA views (splits by distance, opposition, era) |
| Judge / Referee DNA headline metrics with samples | Full officials intelligence (panel deviation by round type, jurisdiction splits) |
| Matched market summary per bout (best, consensus, freshness) | Market intelligence (movement history, dispersion over time, book-level timelines within provider terms) |
| Titles, rankings, Hall of Fame, history, official video | Advanced matchup analysis built from the same evidence packets |
| Methodology and sources | Validated model outputs, only after training, holdout validation and a published methodology |

## Implementation notes (future)

- Gateway: Pro-only reads get their own `/internal/v1/pro/*` routes behind an entitlement header issued by the
  frontend server; site routes stay public-read.
- Frontend: a `ProModule` server component renders either the module (entitled) or a truthful description with
  sample counts (not entitled). No blurred fake numbers.
- Commerce: reuse the PropBetEdge network checkout (UFC app is the live checkout); do not create a Boxing billing
  project.
