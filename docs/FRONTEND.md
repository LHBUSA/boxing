# PropBetEdge Boxing frontend (Phase 1)

`web/` is a Next.js 15 app-router site. It uses server components, one small
client component (navigation), plain CSS and no UI library. It reads only
through **boxing-gateway** `/internal/v1/site/*`:

- The site's server holds `BOXING_GATEWAY_URL` and `BOXING_GATEWAY_TOKEN`.
- The browser never sees the token and never reaches Supabase.

Data path: browser → Vercel (server components, 300 s revalidate) →
`boxing-gateway-staging` (bearer) → Supabase staging `wpaxofilvbsjyrxrwjhg`
(service role, inside the Worker only).

## Routes

| Route | Surface | Data |
|---|---|---|
| `/` | This week in boxing: featured card and other cards this weekend, recent results by fight weekend, Scorecard Watch, Fight DNA feature, titles/rankings/markets state, coverage | `site/home` |
| `/fight-week` | The current (or next) fight week: card selector, event header, main-event face-off plus matchup intelligence when bouts exist, recorded-stage timeline, same-commission results | `site/events`, `site/events/:ref`, `site/bouts/:ref` |
| `/events` | Upcoming or results, by fight weekend, with a commission filter | `site/events` |
| `/events/[slug]` | Event / Fight Center: header and coverage stats, headline bout face-off and scorecards, championship bouts, full card in sheet order, officials, decisions, same weekend | `site/events/:ref`, `site/bouts/:ref` |
| `/fights/[slug]` | Matchup intelligence: face-off, Fight Read, What Matters, Key Comparison, scorecards and revisions, Fight DNA, Paths to Victory, Early/Middle/Late, Market, rest of the card | `site/bouts/:ref` |
| `/fighters` | Directory with name search | `site/fighters` |
| `/fighters/[slug]` | Dossier: upcoming fight, Fight DNA, career, result profile, division history, title history, opposition, market history | `site/fighters/:ref` |
| `/titles` | World Title Map: division ladder, per-body lanes (only with cleared title data), source status, belt vocabulary, derived undisputed rule | `site/titles` |
| `/rankings` | Rankings by body and division, dated snapshots only | `site/rankings` |
| `/methodology` | Sources, verified record, Fight DNA, matchups, titles, live coverage | `site/coverage` |

Slugs are `readable-name-<first 12 hex of public_id>`. Lookup uses only the id. A
renamed boxer 308-redirects to the canonical slug, and merged records redirect
to the surviving boxer.

**Navigation:** Odds, News, Promotions, Videos, Scorecards, Judges and Referees
appear as "Soon" (`web/lib/nav.ts`). They are never linked to empty pages.

## Components

- **Shell:**
  - `Header` and `NavClient`: desktop primary nav plus a More menu, and the mobile drawer.
  - `StatusRail`: the global event rail.
  - `Footer`.
- **Boxing parts (`components/boxing.tsx`):**
  - `BoutRow` (scan-first) and `EventLine`
  - `ScorecardTable`, `CardChips`
  - `FormStrip`, `HistoryChip`, `CornerDot`, `WeighInLine`
- **Matchup (`components/MatchupDesk.tsx`):**
  - `Faceoff` (ring frame with red and blue corners)
  - `MatchupIntel`
- **Fight DNA (`components/DnaPanel.tsx`):** family tables with value, sample or building state.
- **`components/Portrait.tsx`:** deterministic monogram composition. There are no photos.
- **`components/ui.tsx`:**
  - `RingFrame`, `Ropes`, `SectionHead`
  - `Chip`, `StateNote`, `Stat`
  - `Crumbs`, `Unavailable`
- **Pure logic (`web/lib`, unit-tested):**
  - `format`, `slug`, `weekend` (fight weeks, featured-card rule)
  - `dna` (display rules)
  - `matchup` (facts and thresholds; no picks)

## Site read contract (migrations 0020, 0021)

`boxing_site_*` SQL builds fixed-field JSON. It never contains:

- DOB, stated hometowns or identity evidence
- reviewer names or internal uuids
- provider ids or prices outside the one-bout market summary

The guarantees are enforced in two places:

- **`tests/db/16_site_reads.test.mjs`:** a recursive forbidden-key scan, plus federal id, DOB, hometown and uuid patterns, on every site route.
- **The gateway (`stripInternalIds`):** removes uuids from title maps and ranking snapshots.

A **verified record** counts only canonical bouts on PropBetEdge record. It is
labelled as such everywhere and never as a career record.

## Coverage states (reader-facing)

| State | Meaning |
|---|---|
| Verified history | 3+ verified bouts |
| Limited verified history | 1–2 verified bouts |
| First verified bout | No earlier verified bout |
| Bout sheet not filed yet / Upcoming card intelligence is filling | The commission listed the card; no bouts are on record yet |
| N awaiting identity verification | Sheet bouts that are not yet canonical |
| Official result not recorded | The sheet row has no readable result |
| Official scorecards not captured | Judges' totals are missing |
| Fight DNA building (needs N, has M) | Below the metric's sample minimum |
| No matched market history yet | No verified odds match |
| Title lineage / ranking source under review | Sanctioning-body data is not cleared |

## Local run and QA

```
cd web
npm ci
# .env.local (gitignored): BOXING_GATEWAY_URL, BOXING_GATEWAY_TOKEN (D:\Workers\secrets\boxing-gateway-staging-internal-token)
NODE_OPTIONS="--require D:/Workers/exfat-readlink.cjs" npx next build && npx next start -p 3400
MSYS_NO_PATHCONV=1 node scripts/qa-shot.mjs qa/shots http://localhost:3400 1440,1024,390 /,/fight-week,/titles
npm test
```

## Preview

- **Project:** Vercel `propbetedge-boxing-web`, deployed from `web/` with `vercel deploy --target preview`.
- **Env:** the gateway variables are passed with `-e`/`-b` on each deploy.
- **Access:** previews sit behind Vercel Authentication.
- **No production deployment and no custom domain.**
  - A new project's first CLI deploy is auto-targeted to production. Always pass `--target preview`.

## Deferred

- **Phase 2:** Promotions, Odds Terminal, Judge DNA, Referee DNA, Scorecard Center, Videos.
- **Phase 3:** newsroom, media timelines, history exploration, Pro.
- **Also not yet built:** per-entity OG images (only the site OG image exists) and a sitemap (added when indexing is approved).
