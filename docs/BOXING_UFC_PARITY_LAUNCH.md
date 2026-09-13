# Boxing UFC-Parity Launch Plan

Branch: `boxing-ufc-parity-v1`

Tracking: GitHub issue #8

## Mission

Build `boxing.propbetedge.ai` as the boxing counterpart to the PropBetEdge UFC product: a public intelligence product backed by an owned, provenance-aware boxing graph; an automated structured newsroom driven by canonical changes; and indexable entity/story surfaces from the first production release.

The data graph is the product. The website is a client.

## Core invariant

Never let the public web layer become a second source of truth.

The pipeline is:

`allowed source -> raw observation -> canonical identity/event/bout fact -> derived intelligence -> structured news event -> validated article -> public API projection -> server-rendered page -> sitemap/feed/discovery notification`

Every downstream object must be traceable to the canonical graph and its provenance.

## UFC parity matrix

| UFC concept | Boxing equivalent | Launch posture |
| --- | --- | --- |
| fighter profile | boxer profile | required |
| event/card page | boxing event/card page | required |
| matchup page | bout page | required |
| fight week desk | boxing fight week desk | required once upcoming cards exist |
| rankings | WBC/WBA/IBF/WBO/etc snapshots | required where licensed/allowed facts exist |
| Fight DNA | boxer Fight DNA | required where metric coverage is sufficient |
| referee intelligence | referee intelligence | later when sample coverage is sufficient |
| judge intelligence | judge + scorecard intelligence | required where commission scorecards support it |
| odds terminal | bout market summary/line movement | required as first-party summarized display only |
| automated UFC news | Boxing Wire autopilot | required |
| pregame desk | fight preview / bout intelligence | required once upcoming bout graph is reliable |
| live fight center | live boxing fight center | later; only with reliable live authority |
| model lab | boxing model lab | later; only after separately validated models |

## Public product surfaces

Initial server-rendered routes:

- `/`
- `/boxers`
- `/boxers/[slug]`
- `/events`
- `/events/[slug]`
- `/fights/[slug]`
- `/fight-week`
- `/rankings`
- `/titles`
- `/judges`
- `/judges/[slug]`
- `/news`
- `/news/[slug]`
- `/history`
- `/methodology`
- `/about`

Add only when real coverage exists:

- `/referees/[slug]`
- `/weigh-ins`
- `/live`
- `/market`
- `/model-lab`

No empty vanity pages. A surface exists because the graph supports it.

## Gateway rule

The existing `boxing-gateway` remains the public site's data boundary.

The web app must not query raw provider tables directly and must not contain source-specific parsing logic.

Add list/discovery projections to the gateway as needed, such as:

- public boxer directory
- event directory / upcoming events
- recent bouts
- title directory
- judge directory
- published article feed
- article by slug
- related content by canonical entity ids

Those routes must return only fields approved for first-party display.

Market data remains summarized one bout at a time. Never expose raw provider payloads, provider event ids, tick dumps, bulk quote exports or a redistributable odds API.

## News autopilot

The existing `boxing-news` fact-block pipeline is the foundation, not the finished newsroom.

Target event classes:

- `EVENT_ADDED`
- `EVENT_CHANGED`
- `BOUT_ADDED`
- `BOUT_CHANGED`
- `BOUT_REPLACED`
- `BOUT_CANCELLED`
- `RESULT_FINAL`
- `TITLE_CHANGE`
- `RANKING_CHANGE`
- `WEIGH_IN_RESULT`
- `WEIGH_IN_MISS`
- `SUSPENSION_ADDED`
- `SUSPENSION_CHANGED`
- `ODDS_OPEN`
- `ODDS_MOVE_MATERIAL`
- `MARKET_CLOSE`
- `SCORECARD_ADDED`
- `OFFICIAL_CHANGED`
- `CORRECTION`

### News generation contract

1. Detect a canonical change.
2. Create one immutable structured news event.
3. Build an immutable fact block containing only facts available at that detection time.
4. Build a deterministic content plan.
5. Generate original editorial prose from that fact block.
6. Validate all names, dates, records, prices, percentages, scorecards and source claims against the fact block.
7. Fail closed on unresolved identity, conflict, low confidence, source-rights restriction or unsupported numeric claim.
8. Publish only allowed green-path classes automatically.
9. Emit discovery notifications only after the canonical public URL is live.

Historical backfills are never breaking news.

Late-linked data is never back-dated into a story as if it was known earlier.

### Editorial depth

A story should use every relevant verified module supported by the graph:

- what changed
- why it matters
- boxer records and recent form
- title/ranking stakes
- bout/card context
- official or regulatory facts
- scorecard/judge context
- observed market context
- Fight DNA comparison
- related canonical entities
- source/provenance module

Thin template stories should not autopublish merely because a structured event exists.

## Autopublish policy

`NEWS_AUTOPUBLISH_ENABLED=true` is allowed only after staging proves the class-specific gates.

Autopublish requires:

- resolved canonical identities
- allowed/verified sources
- no source conflicts
- no unsupported numbers
- green article validation
- sufficient editorial depth
- no sensitive/review reason

Corrections, source conflicts, identity ambiguity and sensitive regulatory cases remain review-required.

## SEO and fast discovery

The objective is instant publication and rapid discovery, not a false guarantee of instant Google indexing.

### Every public entity/story

Must have:

- stable slug
- canonical URL
- unique title
- unique description/dek
- server-rendered primary content
- Open Graph metadata
- Twitter metadata
- breadcrumbs
- internal links to canonical related entities
- structured data where applicable

### Structured data

Use valid schema only when facts exist:

- `NewsArticle` for Boxing Wire stories
- `Person` + `ProfilePage` for boxer profiles
- `Event` / sports-event semantics for event pages
- `BreadcrumbList`
- `Organization` for PropBetEdge publisher identity

Do not invent ratings, images, attendance, dates, offers or other schema fields simply to make markup richer.

### Discovery surfaces

Implement:

- `/sitemap.xml` for all canonical public pages
- a recent-news sitemap for eligible published stories
- `/robots.txt`
- `/feed.xml` RSS/Atom for Boxing Wire
- accurate `lastModified`
- IndexNow notification for newly published, materially updated or removed URLs
- Search Console sitemap submission when credentials/integration exist

Do not use Google's Indexing API for ordinary article/entity pages.

### Sitemap priorities

Highest-change/highest-value surfaces:

- home
- news
- fight week
- upcoming events
- current bout pages

Stable archive/profile/history surfaces remain indexable but use lower change frequency.

## Internal linking graph

Every public article should link to its canonical:

`article -> boxer(s) -> bout -> event -> title/ranking/official context -> related articles`

Profiles link back to recent and upcoming bouts and relevant stories.

Event pages link to every canonical bout.

Bout pages link to both boxers, event, title stakes, available market summary, Fight DNA and related news.

The goal is an internally connected boxing knowledge graph, not isolated blog posts.

## Images

Do not hotlink or copy restricted promoter/editorial photography.

Use only:

- owned PropBetEdge creative
- properly licensed assets
- source assets with explicit reuse permission
- generated editorial graphics where appropriate

Articles must still render coherently when no image is available.

## Source policy

Keep automated promoter ingestion disabled unless permission or applicable terms allow it.

Commission/official public-record facts remain preferred authorities where available.

Source rights and provenance must travel from observation to canonical fact to article fact block.

No public article may imply a source supports a claim beyond the actual evidence.

## Launch gates

### Data

- no display-name joins for canonical entities
- no sportsbook-derived fighter creation
- no sportsbook-derived bout creation
- unresolved identity fails closed
- canonical correction history preserved

### News

- old backfills cannot publish as current news
- source conflicts cannot autopublish
- unresolved identities cannot autopublish
- article numeric claims round-trip to fact block
- corrections supersede rather than silently overwrite history

### Web/SEO

- boxer/event/bout/article routes resolve real DB-backed entities
- canonical metadata works
- representative JSON-LD validates
- sitemap contains public canonical entities
- news sitemap contains only eligible recent published stories
- robots excludes internal/auth/API surfaces
- RSS works
- IndexNow sends only changed public URLs
- removed content uses proper 404/410 behavior
- no review-only article is publicly fetchable

### Quality

- desktop and mobile QA
- no horizontal overflow
- accessible headings/navigation
- useful empty states only where unavoidable
- zero secret leakage
- tests green
- CI green

## Work order

1. Extend gateway with public discovery/list/article projections.
2. Promote `boxing-news` staging lane and finish event-class coverage.
3. Add article depth/content-plan + strict validator parity.
4. Scaffold production Next.js app using the gateway only.
5. Ship boxer/event/bout/news surfaces.
6. Ship metadata, sitemap, news sitemap, RSS, robots and structured data.
7. Add IndexNow changed-URL notifications.
8. Replay real staging changes and prove newsroom output.
9. Mobile/desktop/public-crawl QA.
10. Production launch only after acceptance evidence is recorded on issue #8.
