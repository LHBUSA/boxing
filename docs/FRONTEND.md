# PropBetEdge Boxing frontend

`web/` is a Next.js 15 app-router site (server components, plain CSS, 103 kB
shared JS) in the PropBetEdge product family. It follows UFC's palette
(warm ink, paper, championship gold) and type (Playfair Display, Inter,
JetBrains Mono). Boxing has its own identity: red and blue corner light,
ring ropes and official-scorecard styling.

The site reads only through **boxing-gateway** `/internal/v1/site/*` from the
server:

- `BOXING_GATEWAY_URL` and `BOXING_GATEWAY_TOKEN` are stored on the Vercel
  project for Preview and Production.
- The browser never sees the token and never reaches Supabase.

## Routes

| Route | Surface |
|---|---|
| `/` | Hero poster: the next main event, or the latest fight night when no upcoming bout is filed, plus the next-card countdown. Then Fight Week cards, big fights, Scorecard Watch, officials intelligence, a Fight DNA feature, recent results, upcoming cards and the title landscape. |
| `/fight-week` | This (or next) fight weekend: card picker, main-event poster and card when filed, recorded-stage timeline, last fight week in review |
| `/events`, `/events/[slug]` | Schedule/results by weekend; Fight Center: header, main-event poster, championship/featured/undercard tiers, timeline, officials, decisions, same weekend |
| `/fights/[slug]` | Faceoff (photos or silhouettes), result band, Fight Read, What Matters, Tale of the Tape bars, official scorecards, Fight DNA bars, Paths to Victory, market, rest of card |
| `/fighters`, `/fighters/[slug]` | Directory; dossier: art, record tiles, form, facts, next fight, Fight DNA, result profile, cards, fight history, market history |
| `/scorecards`, `/scorecards/[slug]` | Scorecard Center (decision filters, widest spread); decision page: official card, panel spread, judges with Judge DNA, provenance |
| `/officials`, `/officials/[slug]` | Judge/Referee DNA directory; profile with metric tiles (samples), card-by-card panel plot, result mix, assignments |
| `/titles`, `/rankings` | Four-body belt lanes per division, and body/division rankings. Both show a "records pending source clearance" state until data is cleared. |
| `/promoters`, `/promoters/[key]` | Promotions as listed on official sheets: cards-by-month timeline, appearances (never affiliation) |
| `/judges`, `/referees` | Officials boards split by role (the `/officials` board remains) |
| `/news` | Boxing Desk: verified wire (official results, scorecards posted, missed weight, card changes) grouped by card |
| `/odds` | Odds Terminal: matched markets only, capture counts by week, match states; never raw provider data |
| `/videos` | Video Desk: approved official-channel embeds (poster-first); registry state until channels are enabled |
| `/hall-of-fame` | Recognized institutions' induction records (IBHOF via Wikidata), class-at-a-time, institution category labels |
| `/history` | Decade-first view of the Hall graph; eras and lineage only with documented rules |
| `/methodology` | Sources, verified record, DNA/officials, matchups/markets, media, Fight Week rule, sourced bios and Hall policy |

Navigation is data-aware (`web/lib/nav.ts` registry + `web/lib/availability.ts`). Primary: Fight Week, Events,
Fighters, Titles, Rankings, Odds, News. More: Promotions, Videos, Scorecards, Judges, Referees, History, Hall of Fame,
Methodology. A route enters navigation only when the gateway returns real data for it (Odds: a matched market;
News: a wire item; Videos: a published video; History/Hall: a Hall total above zero). Free/Pro design:
`docs/FREE_PRO_ARCHITECTURE.md` (nothing locked today).

## Media

- **Fighter portraits.** Source is `boxing_fighter_media` (migration 0023). A
  portrait needs all of these:
  - a free license or permission
  - author and credit
  - the source page
  - evidence the image shows that boxer (Wikidata P18, or the Commons
    description naming them)
  - evidence of the boxer's identity (a Wikipedia/Wikidata record that includes
    the verified bout)
  - `review_state = approved`

  Assets are stored in `web/public/media/boxers/`, never hotlinked, and each one
  is credited wherever it is shown. Usage is editorial identification only,
  never ads or share images. The registry is in `scripts/media/portraits.json`:
  8 approved, 3 held for owner review, 5 rejected.
- **Silhouette fallback.** `components/FighterArt.tsx` draws a generic boxer in
  guard with corner light. It is never a likeness.
- **Video.** Channels live in `boxing_video_channels` (`scripts/videos/channels.json`,
  21 identity-verified). A channel can publish only after its identity is
  verified *and* a named person approves its rights review, and none is enabled.
  The classifier and resolver are in `shared/videos/`.

## Deployment topology

- **Git:** one repository, `LHBUSA/boxing`, branch `main` only. Direct commits to `main`; no
  feature or preview branches, no PRs for our own work, no forks, no GitHub Actions. The frontend
  is `web/`; data, workers, migrations and backend stay in the same repository.
- **Vercel:** one project, `boxing` (`prj_E9VN82i77FdGzL5fB8lWuTX0y7Jw`, team
  `justins-projects-ad4f4bb7`). Native Git integration with `LHBUSA/boxing`, Root Directory `web`,
  framework Next.js, production branch `main`. Every push to `main` builds (`npm run build`,
  including posture static + bundle) and serves production.
- **Build surface:** `https://boxing.propbetedge.ai/` is attached and shows the current `main` build.
  The product is not launched, not advertised and has no subscribers; the domain stays attached.
  `boxing-alpha-beryl.vercel.app` and the generated `*.vercel.app` URLs also exist.
- **Env** (Preview + Production, sensitive): `BOXING_GATEWAY_URL` and `BOXING_GATEWAY_TOKEN`,
  pointing at the staging gateway. No indexing env: the launch switch is committed.
- **Protection:** Vercel Standard protection (`all_except_custom_domains`). Advanced Deployment
  Protection is not purchased.
- **Retired 2026-09-13:** the redundant projects `web` (`prj_PATkAWtTsh3vmsvODl8E1fMnfH99`) and
  `propbetedge-boxing-web` (`prj_AjuV6BIv4vr888KFlwoZwy5AUlkQ`).

## Launch posture

One switch, committed in `web/lib/posture.ts`: `LAUNCH_APPROVED`. It controls indexing and public
discovery. It does not control which domains are attached.

**BUILD MODE** (`LAUNCH_APPROVED = false`, now). Allowed: `boxing.propbetedge.ai` attached, `main`
deployments visible there, real routes, data and UI. Required:

- `<meta name="robots" content="noindex, nofollow">` on every page and `X-Robots-Tag: noindex, nofollow`
  on every response.
- `robots.txt` blocks every crawler; no sitemap; no IndexNow integration.
- No canonical or `og:url`, and no metadata URL naming the public domain (`metadataBase` uses the
  deployment's `*.vercel.app` URL). Titles, descriptions, OG images and structured-data architecture
  may exist.
- No env indexing switch (`BOXING_ALLOW_INDEXING` / `BOXING_PUBLIC_URL` are retired and refused).

**LAUNCH MODE** (`LAUNCH_APPROVED = true`, only on explicit owner approval, production deployments
only): index/follow, robots allowing crawlers, production sitemap, IndexNow, canonical/OG URLs on
`https://boxing.propbetedge.ai`. Flipping the switch exposes the finished SEO system.

**Both modes** refuse:

- A domain other than `*.vercel.app` and `boxing.propbetedge.ai` attached to `boxing`.
- `BOXING_GATEWAY_TOKEN` (its name or its value), a Supabase URL or key, a JWT, or the gateway host in
  client JS, prerendered HTML or a response.
- Web code reaching Supabase instead of the gateway, a gateway client call other than GET
  `/internal/v1/site/*`, or a Supabase or database credential in the web environment.
- A mutation surface: a route handler exporting POST/PUT/PATCH/DELETE, a server action, or a write
  endpoint that answers anonymously. The gateway keeps refusing anonymous requests with 401.

`web/scripts/posture.mjs` enforces the matching mode:

| Mode | Where it runs | What it checks |
|---|---|---|
| `static` | before every `npm run build` (Vercel and local) | the switch and its single use, noindex/robots/header wiring, no sitemap/IndexNow/public-domain refs in build mode, server-only GET-only gateway, no Supabase, no route handlers or server actions |
| `bundle` | after every `npm run build` | no secrets in client assets and prerendered payloads; build mode: noindex on every prerendered page, no canonical/`og:url`, no public-domain URLs, robots blocks all; launch mode: indexable pages, launch URLs only on the public domain, robots allows; no database credential or env indexing switch |
| `vercel` | by hand (`npm run posture -- vercel`, needs `vercel login` or `VERCEL_TOKEN`) | the project's CURRENT domain list (only `*.vercel.app` and `boxing.propbetedge.ai`; empty/truncated/unreadable fails), env key names (never values), no env indexing switch |
| `live [url]` | `npm run verify:live` after every push (defaults to `https://boxing.propbetedge.ai`) | robots, sitemap, meta, header, canonical/`og:url` on 24 pages in the matching mode, secrets in HTML and every JS/CSS bundle, write probes, server-action probe, gateway 401 |

Attached domains come only from the Vercel project domain list. The build-time system variable
`VERCEL_PROJECT_PRODUCTION_URL` is never read: on 2026-09-14 Vercel injected a stale value and the old
bundle check failed builds on it. Regression tests: `web/scripts/posture.test.mjs` (`npm test`).

## Workflow on main

```
git pull --ff-only
npm run verify            # repo root: secrets scan, unit + DB tests, web tests, typecheck, web build (posture static + bundle)
git commit … && git push origin main
npm run verify:live       # waits for boxing.propbetedge.ai to serve HEAD, then live posture
```

DB tests use a disposable local PostgreSQL 17 (`BOXING_TEST_DATABASE_URL`, default
`postgres://postgres@localhost:55432/postgres`; non-local hosts are refused).

## Local QA

```
NODE_OPTIONS="--require D:/Workers/exfat-readlink.cjs" npx next build && npx next start -p 3400
MSYS_NO_PATHCONV=1 node scripts/qa-shot.mjs qa/shots http://localhost:3400 1440,1024,390,375 /,/fight-week,/titles
npm test && npx tsc --noEmit
```
