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
| `/promoters`, `/promoters/[key]` | Promoters exactly as listed on official sheets |
| `/methodology` | Sources, verified record, DNA/officials, matchups/markets, media rules |

Navigation lists only usable surfaces (`web/lib/nav.ts`). Odds and News stay out
of navigation until matched markets and published articles exist. Market state
is shown in context on fight pages and Fight Week.

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
- **Protection:** Vercel Authentication covers `all_except_custom_domains`. No
  custom domain is attached, so every deployment, production included, requires
  a team login. Attaching `boxing.propbetedge.ai` would make it public and needs
  owner approval.
- **Retired 2026-09-13:** the redundant projects `web`
  (`prj_PATkAWtTsh3vmsvODl8E1fMnfH99`, a second Git link to this repository) and
  `propbetedge-boxing-web` (`prj_AjuV6BIv4vr888KFlwoZwy5AUlkQ`, CLI-only).
  - Carried over: their Root Directory and the gateway env.
  - Neither had a custom domain.
  - `web`'s sensitive `BOXING_TEST_DATABASE_URL` was not carried over: its
    value cannot be read, and the site does not use it (DB tests run in CI
    against a disposable Postgres).

Manual CLI fallback:

```
cd web
npm run deploy:protected   # production target of `boxing`, with post-checks
npm run deploy:preview     # preview of the current commit
```

`scripts/deploy.mjs` refuses to run unless:

- the tree is clean
- HEAD equals origin/main
- the linked project is correct

After deploying, it removes the deployment if either of these is true:

- an alias is not `*.vercel.app` (a custom domain such as boxing.propbetedge.ai)
- an anonymous request is answered with 200

Deployment protection is `all_except_custom_domains`, so attaching a custom
domain is the step that would make the site public, and it needs owner
approval.

Persistent env: `vercel env add NAME preview|production --value … --yes < /dev/null`.
This works with CLI 59.16. CLI 54.4 looped on `git_branch_required`, and without
`< /dev/null` the command waits on stdin.

## Local QA

```
NODE_OPTIONS="--require D:/Workers/exfat-readlink.cjs" npx next build && npx next start -p 3400
MSYS_NO_PATHCONV=1 node scripts/qa-shot.mjs qa/shots http://localhost:3400 1440,1024,390,375 /,/fight-week,/titles
npm test && npx tsc --noEmit
```
