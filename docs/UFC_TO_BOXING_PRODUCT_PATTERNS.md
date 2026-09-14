# UFC to Boxing: product patterns

Read-only audit, 2026-09-13. Sources:
- Live site: https://ufc.propbetedge.ai/ (home, /fight-week, /events/ufc-331-…, /fights/joshua-van-vs-alexandre-pantoja-…, /fighters/alexandre-pantoja-2560746, /news, one /news article, /rankings, /history, /hall-of-fame, /tuf, /contender-series, /judges, /pro).
- Code: `D:\Workers\ufc-propbetedge\web` (Next.js app router) and `docs/`.

UFC paths below are relative to `ufc-propbetedge/web/` unless they start with `docs/`.

**Scope.** This copies UFC's product operating system, not its look. The boxing graph is:
weekend -> promotions -> events -> bouts -> fighters -> titles -> sanctioning bodies -> commissions -> officials -> scorecards -> markets.

**Boxing constraints that apply to every section:**
- There is no trained winner model, so no probabilities, picks, fair lines or edges.
- There are no licensed punch stats: CompuBox and BoxRec are RED in `docs/BOXING_SOURCE_ACQUISITION.md`.
- Four sanctioning bodies each keep their own source-native title state. There is never one unified champion.
- Commissions, officials and official scorecards are the moat.

---

## 0. The operating system in one page

These patterns recur on every UFC surface. They matter more than any single module.

1. **Packet, then render.** Pages render a packet assembled on the server from stored facts, such as `loadFightWeek()` in `lib/fightweek.ts` and `buildDeskBriefs()` in `lib/pregame.ts`. A UI component never computes a claim the packet does not hold. `components/dna.tsx` says it outright: "The UI never recomputes a metric, never grades a value".
2. **Every number carries its receipt.** Fight DNA metrics carry sample, confidence (`insufficient|low|medium|high`), `as_of_date` and definition version (`lib/dna.ts` `MetricObject`). Reader-facing provenance is translated from internal table names (`lib/provenance.ts`: "translation is the default, not an opt-in").
3. **Tiered degradation, never filler.** A brief is `marquee | supporting | watch`. A thin packet becomes "What to watch" instead of forced analysis (`fightReadParts`). Status labels are "Full packet", "Limited packet" and "Card only".
4. **Absence is a sentence.** A finish renders "no scorecard" as the result (`components/Scorecard.tsx`), and so does an unnamed injury (`components/StatusBits.tsx`). Market has six explicit states (`lib/market.ts` `MARKET_STATE_COPY`). Rates are withheld below a sample (`MIN_RATE_SAMPLE = 40`, `lib/judgeScoring.ts`). An empty rail renders nothing (`VideoRail`).
5. **Fail closed to empty, never 500.** Every reader returns a fallback (`lib/db.ts`, `lib/status.ts`, `lib/broadcast.ts`). A partial graph throws and renders absence (`lib/dwcsGraph.ts`: "A partial graph presented as the whole one is worse than an error state").
6. **One resolver per fact.** Rankings go through `lib/rankingContext.ts` plus `components/RankBadge.tsx`, so a P4P number can never read as a divisional rank. Judge orientation goes through `lib/judgeScoring.ts`. Surfaces do not re-derive facts.
7. **Identity before attachment.** Videos, wire items, rankings and portraits attach only when exactly one canonical entity matches. Two or more candidates go to review, never a guess (`docs/videos.md`, `docs/rankings.md`, `docs/news_realtime_pipeline.md`).
8. **Official source beside our layer.** `OfficialDestinations` and `lib/heritage.ts` `UFC_OFFICIAL` always link the record owner, and non-affiliation copy appears in the module itself.
9. **Timestamps name what they are the time of.** Examples: "Observed" vs "Book last moved" (`components/Market.tsx`), "Intelligence updated SEP 14 · 00:34 UTC" (`fmtStamp`), and a rankings snapshot date shown next to its capture time.

---

## 1. Fight Week

**UFC pattern**
- Routes: `app/fight-week/page.tsx` is the hub and `app/pregame/[slug]` is the permanent per-event archive. Rendering is `components/FightWeek.tsx` and the logic is `lib/fightweek.ts`.
- Event identification: `resolveFightWeekEvent()` calls `getNextEvent()`, which returns the first event with `event_date >= today`, excluding DWCS and Road to UFC by name regex (`lib/db.ts` `NOT_DWCS`). If there is no event, or an event with no bouts, the page renders `FightWeekEmpty` ("Intelligence desk opens as the card fills") plus upcoming rows.
- Countdown: "Final", "Date TBA", "Fight night", "Tomorrow", "Awaiting results" or "N days out". A live pulse shows when `days ∈ [-1, 0]` and the card is not done. The homepage poster tags are "Fight week" (6 days or fewer), "Next card" and "Tomorrow".
- Page order: masthead with an "Intelligence updated" stamp, countdown and official links, then `FightNavigator` (Main event, Main card N, Prelims N, "Jump to fight ▾"), `MainEventDesk`, main card as `MatchupIntel` cards, prelims as `<details>` `PrelimRow`, secondary video, and finally a "Sources in this packet" footer.
- `MainEventDesk` sections:
  - kicker "Title fight/Main event · Verified/Limited packet"
  - stakes chips
  - `DeskArt` faceoff
  - **Fight read**: lead, a supporting sentence only if it adds a second dimension, and one evidence line
  - **Key comparison**: Age, Height, Reach, Stance, Rank. Highlighted rows are "a meaningful factual difference, not an advantage"; unpublished values stay "Not published".
  - **3 things that matter**: factors from `thingsThatMatter()` (pace, distance, grappling, danger, durability, experience). Each has a short hook, one line and an optional "Favors X" lean, and appears only when evidence exists; they are ranked by contrast size.
  - **How they win**: `side.keys`
  - **Fight phase**: early, middle, late with evidence-derived headlines
  - "Full matchup intelligence →"
- Card-level economy: each card gets one matchup read and up to two key signals, and a signal never repeats evidence already used in the read (`compactRead`, `compactSignals`).
- Sources footer: `packetSources()` lists the inputs actually used, including the rankings snapshot date and archived result counts. It closes with "Pregame Desk is evidence-led commentary, not a pick generator".

**Reusable pattern**
- Auto-resolving hub plus a frozen per-event archive copy.
- Packet tiers.
- Factor engine where each factor exists only with evidence, has a hook and a line, and is ranked by contrast.
- A "no repeated evidence" rule for compact cards.
- Card navigator.
- Sources-in-packet footer and a single freshness stamp.

**Boxing adaptation**
- **Unit is the weekend, not the event.** Keep `lib/weekend.ts` `currentFightWeek()`, which groups Monday to Sunday. The hub shows every card on the weekend with a card picker (already `?card=`).
- **Promotion is a first-class facet.** Card chips show promoter and commission. The featured card comes from the documented `rankCards()` rule (title bouts, then bouts on record, then scheduled rounds, then venue, then date) and never favours a promotion by name.
- **Main event** is the headline bout per card, not per week. Order by scheduled rounds, then sheet order (already `byDistance`).
- **Factor set for boxing**, all from owned data:
  - verified experience gap
  - first 10- or 12-round assignment
  - official scale difference and missed weight
  - activity gap
  - stoppage vs distance history (`lib/matchup.ts` `whatMatters`)
  - **titles at stake per body**, from `boxing_bout_titles`
  - **assigned officials**, with Judge and Referee DNA when a sample exists
  - **commission** context: jurisdiction, and scoring rules if sourced
- Stakes chips list each belt with its source-native label ("WBA Super", "WBC Interim"). Never write "unified title fight" unless `pbe_undisputed@1` derives it, and label it PropBetEdge-derived when it does.
- Packet tiers map to `historyConfidence()` (`verified`, `limited`, `first`). Reuse the "Limited packet / Card only" copy discipline.
- Keep a permanent pregame archive per event, reading `asOf = event_date`.

**Do NOT copy**
- One canonical event per week. `getNextEvent()` returns a single card, and boxing weekends have many.
- Excluding secondary cards by name regex. Boxing uses promotion and commission facets, not an allowlist.
- UFCStats-driven factors: pace (SLpM), grappling, takedowns and submission averages. There are no licensed punch stats, so drop them. Do not proxy them from news prose.
- "Rank" as a single Key Comparison row. Boxing has four body rankings plus independent lists (Ring/TBRB, if ever cleared), so show per-body rows or omit.
- "Favors X" leans derived from punch stats. Physical and record leans are fine only as "difference, not advantage".

---

## 2. Event and card pages

**UFC pattern** (`app/events/[slug]/page.tsx`)
- Order:
  1. Poster: brand, PPV, status tag, main-event faces, "FINAL" or "VS", h1, date and venue, "N days out" or "N finishes · M dec"
  2. `HowToWatchPanel`: verified start times from our own table; the page never waits on the promotion site
  3. `OfficialDestinations`
  4. `PregameDesk mode="cta"`
  5. `CardSegments`, grouped main, prelim, early, unpositioned
  6. `CardIntelligence` on completed cards: per-bout result, whole-fight totals and judges' totals, with coverage counts in the header ("X of Y decisions carded")
  7. DWCS `WhereTheyWent`
  8. Headline `MatchupCard`s
  9. `EventWeighInPanel`, then `EventCardChanges`
  10. `VideoRail variant="timeline"`, grouped by fight-week stage
  11. "Pregame reading" or "Post-fight desk" stories
  12. Nearby cards
- Markets are fetched only for cards that have not happened.
- Empty states: "Historical card not yet loaded" (with a link to archive coverage) and "Card not published yet". Neither invents a card.
- Breadcrumbs are context-aware; DWCS cards get Season crumbs.

**Reusable pattern**
- Poster header with a state-aware count.
- Pregame CTA that becomes a pregame archive after the card.
- Results intelligence with coverage counts in the header.
- Weigh-ins and card changes as separate timeline modules.
- State-specific empty copy.
- Markets only pre-event.

**Boxing adaptation** (the existing Fight Center in `app/events/[slug]` already follows much of this)
- Header adds **commission (jurisdiction)** and **promoter(s) exactly as listed on the official sheet** next to venue and date.
- Tiers replace main card and prelims. Boxing has no stable prelim or main split, so use: championship bouts (any belt at stake), featured bouts (scheduled 10 rounds or more), then the undercard in official sheet order. Label the order source "official sheet order".
- **Officials panel** per bout: referee and three judges, each linked to `/officials/[slug]`.
- **Decisions panel**: official cards per judge, attributed per corner.
- Results intelligence for boxing is the official result, method, round and time, plus judges' totals. There are no fight totals.
- Commission artifacts: weigh-in sheet, results sheet, suspensions list. Show each with document date and source link.
- "Same weekend" strip for sibling cards.

**Do NOT copy**
- `card_position` main, prelim, early as a data assumption.
- `CardIntelligence` fight-totals columns (ESPN and UFCStats strike and control totals).
- `HowToWatch` scraping a single promotion site. Boxing broadcasters vary per card, so show them only from a cleared source.
- A DWCS "where they went" graph wired into event pages. That is UFC-specific.

---

## 3. Fight and matchup pages

**UFC pattern** (`app/fights/[slug]/page.tsx`)
- Order:
  1. Eyebrow: division, title, rounds, position; plus a "Cancelled", "Final" or "In N days" tag
  2. Faceoff: portraits and credits, bout-aware `FighterRank` (champion of *this* division, else rank here, else a labelled P4P chip), nickname, record, "Winner" tag
  3. `BoutStatusAlert`, then `BoutWeighIns` (pre-result only)
  4. Event card
  5. Result: method, round, time, referee tag, source tag "Source · ESPN/UFC Stats", judge links
  6. `OfficialScorecards`
  7. `MarketSection`
  8. `FightTotalsSection`, then `RoundAnalysis` against as-of DNA baselines
  9. Fight stats tables
  10. Tale of the tape (`TaleOfTheTape` bars, then archive tiles for KO/Sub wins and finish rate, then "Last 5")
  11. `ProLock`
  12. `DnaMatchup`: comparisons, "Strongest supported observations" with sample and confidence, and a counter-case ("No coverage warnings recorded for this pairing")
  13. Coverage stories
  14. "Also on this card"
- DNA baselines are read **as of the event date**, so a result is never compared against a snapshot that already contains it.
- Market copy: "Descriptive pricing, kept separate from Fight DNA and from round-level analysis… does not publish a model probability, an edge or a recommended bet". Staleness is stated ("last observed 6 days ago… not the current market").
- Derived intelligence lives on Fight Week (fight read, 3 things that matter, how they win, fight phase), and in articles as "What could break the angle" (`docs/editorial_contract.md`).

**Reusable pattern**
- Bout-aware rank badge.
- Result band with a source tag.
- Official scorecards as their own section.
- Market as an independent, stamped, state-machine layer.
- As-of-date baselines.
- Counter-case block.
- Neighbours on the card.

**Boxing adaptation** (existing `app/fights/[slug]` has faceoff, result band, Fight Read, What Matters, tape, scorecards, DNA, Paths to Victory, market)
- **Title strip**: one chip per belt at stake, each with body, source-native tier and division. State after the result comes from `boxing_title_events`, e.g. "WBC: won" or "IBF: vacant, not at stake". Never write "for the unified title" unless it is derived and labelled.
- **Official scorecards are the centrepiece.** Show per judge: total per corner, the round-by-round card if the commission sheet has it, and dissent. Label the decision shape (UD, SD, MD, draw types). Show commission document provenance: jurisdiction, document date, source link. A stoppage gets one sentence: "Ended by TKO in round 7; no cards were required."
- **Officials block**: referee with Referee DNA (stoppage share, sample), judges with Judge DNA (dissent rate, withheld below sample). This mirrors UFC `MIN_RATE_SAMPLE` and its 95% significance rule for "differs from archive".
- **Paths to victory** only from the result mix (`stoppage_win_share`, `decision_win_share`) with the sample shown (already `pathsToVictory`, gated by `minDecidedForPaths`).
- **What could break the read**: missed weight, activity gap, first scheduled distance, and a low verified sample. Show it as a counter-case list.
- Market: reuse the six-state copy, the "Observed" vs "Book last moved" stamps and the staleness sentence. One bout at a time, summarized, with no raw provider payloads.
- Tale of the tape: verified record entering, KO/TKO/RTD wins, distance bouts, longest scheduled bout, last bout, official weigh-in, stance, height, reach, nationality (`lib/matchup.ts`). Missing physicals are named ("reach not on record"), not dashed silently.

**Do NOT copy**
- `ProLock` "Algo lean · locked" with a blurred "+0.0%". It implies a pending model number. Boxing has no model, so render nothing there.
- Fight stats tables, `RoundAnalysis`, `FightTotalsSection` and head/body/leg bars. These are UFCStats-only data.
- DNA matchup stance splits and striking geography built on strike data.
- Portraits from ESPN or other editorial hosts. Boxing uses only `boxing_fighter_media`-approved, licensed, credited assets, with the silhouette as fallback.

---

## 4. Fighter pages

**UFC pattern** (`app/fighters/[slug]/page.tsx`)
- Canonical-slug `permanentRedirect` after identity merges.
- Header: portrait with credit; eyebrow with best rank or last division and "Inactive"; tiles for Pro record, In archive, Finish rate and Age; `RankStack` ("every current identity… with the snapshot date so 'currently #4' is never undated"); a key-value grid of physicals.
- Order after the header:
  1. Heritage feature link, keyed by source id and not by name
  2. `FighterStatusSection` (sourced availability)
  3. Next fight: tape plus `ProLock`, or the empty state "When a bout is announced it appears here…"
  4. DWCS lineage
  5. Striking and grappling tiles from round stats
  6. `FightDnaSection` or `FightDnaEmpty`: sample line (bouts, rounds, minutes, coverage level), "As of", "v1 Definition", "PBE derived" origin badge
  7. UFC Stats career, labelled "snapshot at capture · not an as-of model feature"
  8. Fight history table (Date, Event, Opponent, Res, Method, Rd, Time, "Round analysis →" only when eligible)
  9. `TufOnFighter`: house bouts explicitly excluded from the record
  10. Video rail (medium or high resolver confidence only)
  11. Stories

**Reusable pattern**
- Canonical redirect.
- Rank stack with a dated snapshot.
- Status section.
- Next-fight module.
- DNA with a sample, as-of and version header plus an origin badge.
- Source snapshot vs as-of feature labelling.
- A history table linking every bout and event.
- Exhibitions shown apart from the record.
- Video attached by identity confidence.

**Boxing adaptation** (existing dossier: art, record tiles, form, facts, next fight, DNA, result profile, cards, history, market history)
- **Belts panel** replaces the rank stack. For each of WBC, WBA, IBF and WBO: current holding (source-native tier) or none, reign start, defenses, last change date. Then a separate **rankings-by-body** list, each entry with its snapshot date. Never show one "champion" badge.
- **Record honesty**: show "Verified record" (bouts on our graph) separately from any published record, and state coverage ("12 of 31 career bouts on verified record").
- **Commission trail**: jurisdictions fought in, and suspensions (from approved commission sources, with dates and document links). Status copy follows UFC's "no diagnosis stated" rule: never infer medical detail.
- **Scorecards received**: every decision with per-judge totals, and the judges who scored against them. This is boxing-native and has no UFC analogue on the fighter page.
- **Fight DNA (boxer)**: result and finishing metrics only (stoppage share, early and late stoppage share, distance share, scheduled-distance history, activity). Keep the UFC header contract of sample, confidence, as-of and definition version.
- **Exhibitions and amateur bouts** shown apart and excluded from aggregates, same rule as `lib/tuf.ts` ("`unverified` is treated exactly like an exhibition").
- History columns: Date, Event, Promoter, Commission, Opponent, Res, Method, Rd/Time, Scheduled rds, Titles at stake, Cards →.

**Do NOT copy**
- "Striking & grappling" and "UFC Stats career" tiles (SLpM, TD avg, control time).
- `ProLock` on next fight, and "Pro members get the alert the moment it changes". Do not promise alerts that do not exist.
- `is_active` as truth. UFC itself reports activity as facts (`lib/dwcsGraph.ts`).
- The hard-coded `HERITAGE_FEATURE` map, unless it is keyed by canonical id and backed by a real page.

---

## 5. Video Desk

**UFC pattern** (`docs/videos.md`, `lib/videoPolicy.ts`, `components/VideoRail.tsx`, `components/OfficialVideo.tsx`)
- There is no standalone `/video` route. The desk is a module: homepage "Inside fight week" (`variant="desk"`), event timeline, fighter rail, article rail.
- **Allowlist**: exact channel IDs only; handles are evidence, not keys ("@UFCBrasil is a Brazilian university"). Each channel is re-verified every run: feed title, verified badge, featured on the official channel. A failing channel is disabled, never deleted, and rejections are recorded with reasons.
- **Classification** from the title in fixed precedence (embedded, countdown, post_fight beats press_conference, media_day, weigh_in, faceoff, full_fight, highlights, preview, analysis, interview, other). Multilingual patterns; description consulted only for strong format words; evidence stored.
- **Linking**: event, then fighters, then bout, then article, with confidence `high`, `medium`, `low` or `none`. An ambiguous match goes to `link_status=review` and is not attached. A bout needs both fighters named in the title.
- **Playability**: `playable`, `unverified`, `blocked` or `unembeddable`. oEmbed 200 is not proof of region playability. Blocked and unembeddable rows get no player and no JSON-LD.
- **Ranking**: language, then embeddable, viewable, channel tier, freshness (never above usability), relevance.
- **Poster-first**: youtube-nocookie iframe created only on click. On error 100, 101 or 150 it falls back to the poster with "Watch on YouTube".
- Attribution on every rail: "embedded from YouTube, not hosted by PropBetEdge · no endorsement implied". Media events only: nothing about injuries or camp is inferred from titles.

**Reusable pattern**
- Whole-pipeline shape: verified allowlist, deterministic classifier, confidence-gated linker with a review queue, playability states, poster-first render with runtime fallback, and a desk/timeline/rail variant set.

**Boxing adaptation**
- **Channel classes are multi-owner**: promoter (Matchroom, Top Rank, Queensberry, GBP, PBC), broadcaster, sanctioning body and commission. Each needs identity verification **and** a named rights approval before `enabled`. This is already the rule in `docs/FRONTEND.md`; 21 verified, 0 enabled.
- Linking scope is the weekend: a title can name a card that shares a city and date with another card. The UFC rule applies — if two events match at the same strength, attach none and send to review.
- The promoter channel is a *label* on the video, not a promotion endorsement. Rails on a card show only that card's promoter and broadcaster channels, plus neutral ones.
- Classifier families to add: "Final Press Conference", "Weigh-In" (commission vs ceremonial), "Face Off", "Ring Walk", "Full Fight", "Fight Highlights", "Post-Fight Presser".

**Do NOT copy**
- The UFC channel set, "featured on the UFC channel" as a verification check, or UFC regional language mapping.
- Treating a single promotion's official channel as tier 1 for the whole sport.

---

## 6. Newsroom

**UFC pattern**
- Code: `app/news/page.tsx`, `app/news/[slug]` via `components/StoryView.tsx`, `components/editorial.tsx`, `components/plan.tsx`, `lib/wire.ts`, `lib/db.ts` `getTicker`.
- Docs: `docs/editorial_contract.md`, `docs/news_realtime_pipeline.md`.
- **Two layers, never blurred.**
  - External wire is radar: attributed and linked, never rewritten, labelled "Around MMA".
  - Native PBE stories are intelligence: story types are card_change, rankings, fight_preview, weigh_in, results, line_move and external.
  - The ticker puts PBE first. One development gets one slot (`topic_signature` / `news_item_id`). An external item shows only until our article exists, then ours supersedes it ("Freshness still wins" for genuinely breaking external news).
- **Story maturation**: `new → scored → queued → enriching → published | held | duplicate | skipped | failed`. Held articles are `status='review'` plus `hold_reason`, and the site filters `status='published'`. The desk preview renders byte-for-byte what will publish (`StoryView`). The index shows "Updated" only when the edit is 5 minutes or more after publish.
- **Number gate**:
  - Class A: our tables, may be asserted directly.
  - Class B: the fetched source, only with attribution.
  - Class C: anything else, rejected.
  - An entity below confidence is held. The hero image uses only `primary_fighter_id`.
- **Content plan**: modules attach only when evidence exists (Bettor's Edge, stat comparison, DNA, recent form, market for *this* bout, round visual, official video, fighter card, related wire, methodology). Charts come from packet fields, never from the language model.
- **Bettor angle** (`fact_block.bettor_angle`): `impact_score` 1–5 ("analysis, not fact"), markets affected, supporting facts, risks (at least one counter-case), watch items, `odds_status`, `model_status`. Rendered as "Odds · no verified snapshot" and "Model · not yet produced".
- **Market availability is resolved at render time** (`lib/editorialMarket.ts`), never frozen in the article. "Markets of interest" is editorial; "market availability" is a data fact.
- **Homepage integration**: a feature story plus six cards, and "The wire" beside "Coming up".

**Reusable pattern**
- All of the above transfers almost unchanged: radar vs intelligence split, supersession ticker, state machine with a held path, number-class gate, content plan, render-time market resolution, bettor angle with a counter-case, byte-identical preview.

**Boxing adaptation** (`docs/BOXING_UFC_PARITY_LAUNCH.md` news classes)
- **Event classes are graph deltas**:
  - card and bout: EVENT_ADDED, BOUT_ADDED, BOUT_REPLACED, BOUT_CANCELLED, RESULT_FINAL
  - titles and rankings: TITLE_WON, TITLE_VACATED, TITLE_STRIPPED, RANKING_CHANGED (one event per body snapshot)
  - commission: WEIGH_IN_MISS, SUSPENSION_ADDED, SCORECARD_ADDED, OFFICIAL_CHANGED
  - CORRECTION
  - Commission-sourced classes are the moat stories, e.g. "The judge who scored it 118-110".
- **Title stories name the body and tier verbatim** ("won the vacant WBO interim title"). "Unified" and "undisputed" appear only with `pbe_undisputed@1`. TITLE_STRIPPED, retractions and corrections are always review-required.
- The bettor angle keeps `model_status: "unavailable"` permanently until a boxing model is separately validated. Markets affected are limited to what `ODDS_CAPTURE` actually stores.
- Backfills never publish as news. Late-linked facts are never back-dated.
- The wire ingests broadly: UFC's wire already sees boxing items and marks them `skipped`. Boxing needs its own focus filter so MMA and bare-knuckle items are skipped.

**Do NOT copy**
- UFC story types as-is: "Around MMA", `line_move` before odds are proven, `weigh_in` from promotion sources.
- Hero images from wire sources or Commons without the boxing portrait review gates.
- "Edge N/5" wording on cards while there is no model. Consider renaming it to "Impact" so it does not read as a betting edge.
- News in navigation before articles exist (boxing `lib/nav.ts` already enforces this).

---

## 7. Rankings and champions

**UFC pattern**
- Code: `app/rankings/page.tsx`, `components/ChampionsShowcase.tsx`, `lib/rankingContext.ts`, `components/RankBadge.tsx`. Docs: `docs/rankings.md`.
- One official source (ufc.com/rankings) goes into a dated JSON snapshot (`rankings/YYYY-MM-DD.json` plus `latest.json`), with every structural assumption asserted and the ingest failing before writing if the page changed.
- Names link to a fighter only when exactly one matches; unresolved entries are reported, never guessed.
- Page header: "Official UFC rankings · snapshot Thu, Sep 10, 2026 · captured … (4d ago)", with "Official source first" copy and a link to the official page.
- Champion card per division (portrait, record, nickname), then 15 ranked. Movement shown as ▲/▼/NEW, ties are real, P4P is a separate list.
- Homepage `ChampionsShowcase`: champion plus top 3 contenders from the same snapshot, with the snapshot date in the eyebrow.
- `RankBadge` rules: champion is "C" never "#0"; a P4P chip always carries its label; unranked renders nothing.

**Reusable pattern**
- Dated immutable snapshots, a capture-time label, the official link beside it, a resolver-only badge, "unranked renders nothing", a bout-aware badge, and unresolved entries reported.

**Boxing adaptation** (`docs/TITLES_RANKINGS.md` already models this)
- **Two separate surfaces**:
  - `/titles`: a per-division **Title Map**. Four lanes (WBC, WBA, IBF, WBO), each belt tier as its own row (WBA Super, WBA Regular, WBA Interim, WBC Franchise…), held or vacant, reign start, defenses, last change, source-native label.
  - `/rankings`: body, then division, then snapshot date, with mandatory challenger only when the list states it.
- The "champions" homepage module becomes a **Title landscape**. For each division show four body chips. A derived "Undisputed" or "Unified" badge carries rule version and the belts that counted.
- Snapshot history per body; diffs (`diffRankings`) drive movement arrows and RANKING_CHANGED stories.
- Badge rules for boxing: `WBC C`, `IBF #3`, `WBA SC`, source-native `rank_label`, and a body prefix is always required. A fighter can hold several badges, so show a stack and never a scalar.
- Until a body's source is cleared, show "records pending source clearance" (already built). Never scrape.

**Do NOT copy**
- UFC rankings as the canon. There is no single official list in boxing.
- The P4P list. There is no cleared source; The Ring and TBRB are `ranking_body` rows only if rights are cleared.
- `ChampionshipBelt` "one belt per division" visual metaphor.
- Division identity as (key, is_womens) only. Boxing needs (organization, division label, gender, tier).

---

## 8. History, eras, Hall of Fame and archive products

**UFC pattern**
- **History** (`app/history/page.tsx`, `lib/heritage.ts`, `lib/archive.ts`):
  - Seven numbered eras (1993 to today), each with why it mattered, key moments, key figures and official links.
  - An **archive coverage disclosure**: "Every fight since UFC 1 is the target. Here is how far the archive actually reaches", with bout rows, results with round stats, and a per-year "events indexed vs with bouts loaded" bar.
  - A deep feature (`/history/gracie-influence`) told "from the bouts this archive holds".
- **Hall of Fame** (`app/hall-of-fame`, `lib/hof.ts`):
  - Wings (Pioneer, Modern, Contributor, Fight).
  - Uncertain facts are null and omitted.
  - "Independent archive tribute; the honors belong to the UFC Hall of Fame"; non-affiliation stated.
  - Records resolved from the archive only when the inductee exists there.
- **TUF** (`app/tuf/*`, `lib/tuf.ts`, `lib/tufGraph.ts`):
  - Season metadata is committed JSON with provenance; pro results come from the DB, joined and never copied.
  - House bouts carry an explicit `classification` (professional, exhibition, unverified) and never reach records.
  - "Complete" vs "Verified" season states; unresolved discrepancies are printed on the page.
- **Contender Series** (`app/contender-series*`, `lib/dwcsGraph.ts`):
  - Alumni graph: appearance, result, UFC debut, career, current rank, joined on canonical id only.
  - Contracts only as sourced claims (outcome badges need operator resolution).
  - Activity as facts.

**Reusable pattern**
- Eras as editorial scaffolding over the data archive.
- A coverage-by-year honesty bar.
- Tribute pages with explicit ownership of honors.
- Archive products with committed-provenance metadata joined to canonical results.
- Exhibition classification that never leaks into records.
- Pipeline graphs joined on ids, with outcomes as claims.

**Boxing adaptation**
- **History** eras: bare-knuckle to Queensberry; the lineal and single-champion era; alphabet proliferation (WBA 1921/1962, WBC 1963, IBF 1983, WBO 1988); the pay-per-view era; the streaming and unification era. Each era links to the verified bouts we hold. The **coverage bar is by commission and year** ("NJ SACB 2019–2026: N results parsed"), because the archive is built commission by commission.
- **Lineage pages** per body and division come from `boxing_title_events` (reigns derived, vacancies explicit). This is boxing's strongest archive product.
- **Hall of Fame**: IBHOF and WBHOF are third-party honors. Only build it if facts are cleared; use tribute framing with honors credited to the owner. Lower priority.
- **Archive products analogous to TUF and DWCS**:
  - Olympic-to-pro pipeline: amateur and exhibition bouts classified apart, never in pro aggregates.
  - Tournament series (WBSS, Riyadh Season cards, Prizefighter), with brackets as committed metadata and pro results from the graph.
  - "Where they went" graphs only on canonical ids; promotional-contract claims only when sourced.
- **Commission archive**: per-commission pages (events regulated, officials licensed, suspensions issued, document coverage). No UFC analogue, and a moat.

**Do NOT copy**
- UFC eras, "UFC 1" as the archive target, or UFC HoF wings.
- Any archive product that implies a single promotion owns the sport's history.
- `UFC_OFFICIAL` destinations. Boxing has many record owners, so link the owner that sourced each fact (commission, body, promoter).

---

## 9. Free and Pro

**UFC pattern** (`app/pro/page.tsx`, `components/ui.tsx` `ProPlans`/`ProLock`, `components/ModelProbability.tsx`, `app/model/page.tsx`)
- Headline: "Fight intelligence first. Model claims only when earned."
- **Free**: every card, fighter pages, event pages and results with round stats, matchup pages with tape, official rankings, newsroom and RSS. Judges and referees pages are also public.
- **Pro** ($14.99/mo or $5.99/card, Stripe): the Fight DNA layer "as Pro surfaces ship" and fight-week, weigh-in and market intelligence "as available". Locked lines are struck through: "Model picks and fair pricing stay locked until validated"; "No fabricated odds, picks, probabilities or unavailable features".
- Access is a server-side entitlement (`lib/auth.ts` `hasProAccess`). "Model-only surfaces still require actual validated model output regardless of plan."
- `ModelProbability` rule: a probability is never bare. It sits beside its sample, the band's out-of-sample hit rate and a timestamp-compatible market, and says "No timestamp-compatible price" rather than a placeholder.
- Tension seen live: DNA sections render fully on public pages while Pro copy sells DNA; `ProLock` shows a blurred "+0.0%".

**Reusable pattern**
- Public research layer free and indexable.
- Pro sells depth and workflow, not claims.
- Locked features listed as locked, with the condition for unlocking.
- Server-side entitlement.
- "Regardless of plan" for evidence-gated surfaces.
- The probability card contract, reserved for when a validated model exists.

**Boxing adaptation**
- **Free** (the research and SEO layer): weekend and cards, bout pages, verified records, official results, official scorecards, officials directory, Title Map, body rankings snapshots, newsroom.
- **Pro candidates**, all real and derived from owned data:
  - Judge and Referee DNA depth: per-judge panel spread, dissent history by jurisdiction, card-by-card plots
  - scorecard alerts when a card is filed
  - weekend officials assignments
  - market history and line-movement summaries per bout
  - commission suspension tracker
  - title-at-stake and mandatory tracker
  - CSV or saved-watchlists workflow
- **Honest locking**: a Pro block says what it contains and shows its sample count, e.g. "Judge DNA: 214 cards on record". It never shows a blurred number. Model items are listed only as "Not offered: no validated boxing model", not "coming soon".
- No `ModelProbability`, no `/model` page and no "Algo lean" slot until a boxing model passes its own walk-forward validation.

**Do NOT copy**
- `ProLock` blurred "+0.0%", "Algo lean · locked", or "Model pricing arrives with Pro".
- Selling DNA as Pro while rendering it fully free. Decide the split once.
- The UFC price points or Stripe links. Boxing billing is not built; use the network commerce system when approved.

---

## 10. Navigation, IA and homepage order

**UFC pattern**
- `lib/site.ts` `NAV` registry with `place`: primary, more (grouped), logo, cta. "Removing a link from the bar never removes a route." `components/NavLinks.tsx` and the accessible `components/Menu.tsx` dropdown.
  - Primary: Fight Week, Schedule, Fighters, Rankings, News, Store.
  - More / Fight Week: Weigh-Ins, Injuries & Withdrawals.
  - More / Contender Series: DWCS, TUF.
  - More / Archive: History, Hall of Fame.
  - More / Intelligence: PBE Model, Round-by-Round, Referees, Judges & Scorecards, Notable Voices, How Fight DNA works.
  - CTA: Pro.
- Homepage module order (`app/page.tsx`):
  1. Hero: claim, lede, CTAs (Enter fight week, Schedule, History), four live archive counts, next-event poster with countdown and `WatchStrip`
  2. `PregameDesk` teaser (fight read, 3 things, proof chips "N fights analyzed · Fight DNA · Updated")
  3. Next card `CardSegments`
  4. Video desk
  5. Headline matchups (tale of the tape)
  6. `FightDnaShowcase`
  7. `ChampionsShowcase`
  8. Newsroom: feature plus 6
  9. Notable Voices
  10. Coming up + The wire, then `ContenderStrip`
  11. Heritage close
  12. Recent cards
  13. Official destinations
  14. API CTA
  15. Free vs Pro
- Every page has breadcrumbs plus JSON-LD. Metadata titles change by state (upcoming vs results).

**Reusable pattern**
- Nav registry with placement and grouping.
- Accessible More menu.
- "Only list usable surfaces".
- Homepage as a funnel: now (fight week), then card, then evidence (matchups, DNA), then authority (titles), then news, then schedule and archive, then official links, then plans.
- Live archive counts as proof in the hero.
- Proof chips on the teaser.

**Boxing adaptation** (existing `lib/nav.ts`: Fight Week, Events, Fighters, Scorecards, Officials, Titles, Rankings; More: Promoters, Methodology)
- Keep Scorecards and Officials in **primary**; they are the moat. Add News and Video only when content exists.
- Group More as:
  - Weekend: Weigh-ins, Suspensions (when sourced)
  - Authority: Commissions, Promoters, Sanctioning bodies
  - Archive: History, Lineage
  - Method: Methodology, How Judge DNA works
- Homepage order:
  1. Hero: weekend range, cards count, commissions count, featured main event poster, countdown to the next card, live counts (verified bouts, official results, cards scored, officials)
  2. **This weekend**: every card, promoter and commission chips, a pregame teaser per featured card
  3. **Titles on the line this weekend**: per-body chips
  4. **Scorecard Watch**: latest split and majority decisions with per-judge totals
  5. **Officials intelligence**: assigned or recent judges with Judge DNA samples
  6. Big fights / headline matchups
  7. Fight DNA feature (result-based)
  8. **Title landscape**: four bodies × divisions, snapshot dates
  9. Newsroom and wire (when live)
  10. Recent results and upcoming cards
  11. Methodology and sources
  12. Free vs Pro (when billing exists)

**Do NOT copy**
- "Store", "Notable Voices", "PBE Model", "Round-by-Round" and "DWCS/TUF" nav entries.
- The single-promotion hero ("Every card. Every fighter. Every round.") and a UFC official-destinations block.
- The API CTA before a boxing API product exists.

---

## Module inventory for Boxing

| Boxing surface / module | Mirrors UFC module | Data it needs |
|---|---|---|
| `/fight-week` weekend hub + card picker | `app/fight-week` + `FightWeekPage`, `FightNavigator` | upcoming events grouped by week; promoter(s), commission, venue per card; bout sheet order; scheduled rounds |
| Pregame packet + Fight Read / What matters / Counter-case | `lib/fightweek.ts` `thingsThatMatter`, `fightReadParts`; `MainEventDesk` | verified record entering, stoppage/distance history, max scheduled rounds, last bout date, official weigh-in, titles at stake, assigned officials |
| `/pregame/[slug]` frozen archive | `app/pregame/[slug]` | same packet read `asOf = event_date` |
| Card sources footer + "Intelligence updated" | `packetSources`, `intelligenceUpdated`, `fmtStamp` | ingest freshness per source, snapshot dates, commission document dates |
| Event Fight Center | `app/events/[slug]` poster, `CardSegments`, `CardIntelligence` | event, bouts, results, scorecards, officials, weigh-ins, card changes, same-weekend events |
| Title strip on bout / event | `FighterRank` bout-aware badge (concept only) | `boxing_bout_titles`, `boxing_title_events`, source-native tier labels |
| Bout page | `app/fights/[slug]` faceoff, result band, `OfficialScorecards`, `MarketSection` | bout detail, corners with entering records, result + method + round/time, per-judge cards, officials, market summary |
| Official Scorecards (centrepiece) | `components/Scorecard.tsx`, `lib/judgeScoring.ts` | per-judge totals (and rounds if on sheet), corner attribution, decision shape, commission doc provenance |
| `/scorecards`, `/scorecards/[slug]` | `CardIntelligence` + judge links (no UFC page equivalent) | all decisions, panel spread, dissent flags |
| `/officials` Judge & Referee DNA | `app/judges`, `app/referees`, `MIN_RATE_SAMPLE` + 95% test | cards per judge, dissents, margin, jurisdictions; referee assignments, stoppage share, rounds of stoppage |
| Market section (descriptive) | `components/Market.tsx`, `lib/market.ts` states | per-bout consensus/best/range, book count, first observed, observed_at, source_last_update, match status |
| Fighter dossier | `app/fighters/[slug]` header, `RankStack`, history table, `FighterStatusSection` | fighter identity, approved portrait or silhouette, verified vs published record, bouts, belts by body, rankings by body, suspensions |
| Belts panel + rankings-by-body stack | `RankStack` / `rankingContext.ts` (multi-context, never scalar) | title reigns derived per body/tier, ranking snapshot entries with `rank_label`, snapshot dates |
| Boxer Fight DNA | `components/dna.tsx` header contract, `Origin`, `Conf` | result/finishing metrics with sample, confidence, as_of_date, definition_version |
| Exhibitions / amateur apart from record | `TufOnFighter`, `lib/tuf.ts` classification | bout classification (professional / exhibition / amateur / unverified) |
| `/titles` Title Map | `ChampionsShowcase` (inverted: per body, not per division) | `boxing_title_map_facts`, reigns, vacancies, `pbe_undisputed@1` derivation |
| `/rankings` by body | `app/rankings` dated snapshot page | `boxing_ranking_snapshots`/entries, diffs, mandatory only when stated, source clearance state |
| Video desk / timeline / rails | `VideoRail`, `OfficialVideo`, `lib/videoPolicy.ts` | enabled + rights-approved channels, classification, event/bout/fighter links with confidence, playability |
| Newsroom + wire + ticker | `app/news`, `StoryView`, `editorial.tsx`, `plan.tsx`, `getTicker` | structured news events, fact blocks, content plan, render-time market state, attributed wire items, topic signatures |
| Bettor angle block | `fact_block.bettor_angle`, `BettorsEdge` | impact (analysis), markets affected (only captured markets), supporting facts, risks, watch items; `model_status` fixed `unavailable` |
| Weigh-ins / card changes | `EventWeighInPanel`, `EventCardChanges`, `BoutWeighIns` | commission weigh-in sheets (weight, limit, missed), replacements/cancellations with source |
| Suspensions tracker | `app/injuries` + `StatusBits` "no diagnosis stated" rule | approved commission suspension lists: dates, jurisdiction, document link; no medical inference |
| `/promoters`, `/promoters/[key]` | none (UFC is single-promotion) | promoter names exactly as on official sheets, events by promoter |
| `/commissions/[slug]` (new) | `OfficialDestinations` (concept) + archive coverage | events regulated, officials, suspensions, document coverage by year |
| History eras + coverage bar | `app/history`, `lib/archive.ts` coverage | era copy; coverage counts by commission and year |
| Lineage pages | TUF season / DWCS graph pattern (ids only, claims sourced) | title events per body/division, derived reigns |
| Empty / pending states | `Empty`, `FightWeekEmpty`, market `not_posted`/`unresolved` | explicit state per module ("bout sheet pending", "records pending source clearance") |
| Nav registry | `lib/site.ts` `NAV` + `Menu.tsx` | usable-surface flags per route |
| Free vs Pro | `ProPlans` minus `ProLock`; server entitlement | entitlement source; sample counts for locked depth; no model |
| Methodology | `app/methodology` ("a methodology page listing only strengths is marketing") | source policy, sample thresholds, derivation rules (e.g. `pbe_undisputed@1`) |
