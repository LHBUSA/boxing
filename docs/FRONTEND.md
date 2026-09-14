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

- **Git:** one repository, `LHBUSA/boxing`. The frontend is `web/`; data,
  workers, migrations and backend stay in the same repository.
- **Vercel:** one project, `boxing` (`prj_E9VN82i77FdGzL5fB8lWuTX0y7Jw`, team
  `justins-projects-ad4f4bb7`). Git integration is `LHBUSA/boxing`, Root
  Directory is `web`, framework is Next.js.
  - Production branch is `main`. Pushes to other branches, such as
    `boxing-core-v1`, deploy previews.
  - Local `web/.vercel/project.json` points at this project.
- **Env** (Preview + Production, sensitive): `BOXING_GATEWAY_URL` and
  `BOXING_GATEWAY_TOKEN`, pointing at the staging gateway.
- **Protection:** Vercel Standard protection (`all_except_custom_domains`).
  Deployment and preview URLs require a team login. The production alias
  `boxing-alpha-beryl.vercel.app` is anonymously reachable; the owner decided
  this on 2026-09-13 for development review. Advanced Deployment Protection is
  not purchased.
- **Retired 2026-09-13:** the redundant projects `web`
  (`prj_PATkAWtTsh3vmsvODl8E1fMnfH99`, a second Git link to this repository) and
  `propbetedge-boxing-web` (`prj_AjuV6BIv4vr888KFlwoZwy5AUlkQ`, CLI-only).
  - Carried over: their Root Directory and the gateway env.
  - Neither had a custom domain.
  - `web`'s sensitive `BOXING_TEST_DATABASE_URL` was not carried over: its
    value cannot be read, and the site does not use it (DB tests run in CI
    against a disposable Postgres).

## Deployment safety policy

Allowed posture until the owner approves a public launch:
**anonymous read-only access + staging data + noindex + no custom public domain.**

An anonymous HTTP 200 on the production alias is permitted. A deployment fails,
or its promotion is refused or undone, if any of these is true:

- `boxing.propbetedge.ai`, or any domain that is not `*.vercel.app`, is attached
  to `boxing` without explicit approval.
- `robots.txt` does not block every crawler, or a sitemap is served.
- A page loses `<meta name="robots" content="noindex, nofollow">`, or a response
  loses `X-Robots-Tag: noindex, nofollow`.
- Canonical, `og:url`, `og:image` or `metadataBase` advertises the custom domain.
- `BOXING_GATEWAY_TOKEN` (its name or its value), a Supabase URL or key, a JWT, or
  the gateway host appears in client JS, prerendered HTML or a response.
- Web code reaches Supabase instead of the gateway, the gateway client calls
  anything other than GET `/internal/v1/site/*`, or a Supabase or database
  credential exists in the web environment.
- A mutation surface appears: a route handler exporting POST/PUT/PATCH/DELETE,
  a server action, or a write endpoint that answers anonymously. The gateway
  must also keep refusing anonymous requests with 401.

Indexing turns on only when all three hold: `VERCEL_ENV=production`,
`BOXING_ALLOW_INDEXING=true` and `BOXING_PUBLIC_URL` is set (`web/lib/posture.ts`).
Setting them is a launch decision, not a frontend change.

`web/scripts/posture.mjs` enforces the policy:

| Mode | Where it runs | What it checks |
|---|---|---|
| `static` | before every `npm run build` (Vercel and CI) | source: posture flags, noindex, robots, header, no custom-domain refs, server-only gateway, GET-only site reads, no Supabase, no route handlers or server actions |
| `bundle` | after every `npm run build` | `.next/static` and prerendered payloads contain no secret names, values or patterns and no custom domain; every prerendered page carries meta robots noindex; no canonical/`og:url` outside `*.vercel.app`; built robots.txt blocks all crawlers; the build env holds no database credential and no indexing flag |
| `vercel` | `deploy.mjs`, CI `web-posture-live` (when a `VERCEL_TOKEN` secret exists), or by hand | the project's CURRENT domain list from the Vercel API (every domain `*.vercel.app` unless `LAUNCH_APPROVED` is committed; empty or truncated list fails), env key names (never values), indexing flags unset |
| `live <url>` | CI job `web-posture-live` after each push to main, and `deploy.mjs` | anonymous probe of robots, sitemap, meta and header on 16 pages, custom-domain and canonical leaks, secrets in HTML and every JS/CSS bundle, write probes, server-action probe, gateway 401 |

A posture failure in `npm run build` fails the Vercel build, so the deployment
is never promoted.

Domain attachment has one authority: the Vercel project domain list read by `vercel`
mode. The build-time system variable `VERCEL_PROJECT_PRODUCTION_URL` is not evidence
of attachment. After boxing.propbetedge.ai was attached and then reported detached on
2026-09-14, Vercel still injected it, and the old bundle check failed every build on it.
`bundle` now only checks what a build can know (its output and its env). Regression tests
are in `web/scripts/posture.test.mjs` (run by `npm test`):

- `VERCEL_PROJECT_PRODUCTION_URL=boxing.propbetedge.ai` and only `*.vercel.app` domains
  attached: bundle passes and vercel passes.
- boxing.propbetedge.ai attached and `LAUNCH_APPROVED=false`: vercel fails.
- Any other non-`*.vercel.app` domain fails, and so does an empty or truncated domain list.

A Git-triggered Vercel build cannot read the project's domains, so it no longer stops on
attachment. `vercel` mode must be green before pushing to `main`. The live CI job waits for the alias to serve the pushed
commit (`X-Boxing-Build` header), then probes it.

Manual CLI fallback:

```
cd web
npm run posture -- all https://boxing-alpha-beryl.vercel.app   # verify the live alias
npm run deploy:preview      # preview of the current commit
npm run deploy:production   # staged prod deploy -> promote -> live posture -> rollback on failure
```

`scripts/deploy.mjs`:

- Refuses to run unless the tree is clean, HEAD equals origin/main, the linked
  project is `boxing`, and the static and vercel posture checks pass.
- Production deploys with `--skip-domain`, promotes the deployment, and probes
  the alias anonymously. On any failure it rolls the alias back to the previous
  production deployment and exits 1.
- Never deletes a deployment.

Persistent env: `vercel env add NAME preview|production --value … --yes < /dev/null`.
This works with CLI 59.16. CLI 54.4 looped on `git_branch_required`, and without
`< /dev/null` the command waits on stdin.

## Local QA

```
NODE_OPTIONS="--require D:/Workers/exfat-readlink.cjs" npx next build && npx next start -p 3400
MSYS_NO_PATHCONV=1 node scripts/qa-shot.mjs qa/shots http://localhost:3400 1440,1024,390,375 /,/fight-week,/titles
npm test && npx tsc --noEmit
```
