import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { currentFightWeek, groupByWeek } from "@/lib/weekend";
import { cityLine, daysBetween, fmtDate, fmtRange, fmtRecord, plural, shortEventName } from "@/lib/format";
import { boutPath, eventPath, fighterPath } from "@/lib/slug";
import { metricView } from "@/lib/dna";
import { Chip, Eyebrow, RingFrame, Ropes, SectionHead, Stat, StateNote, Unavailable } from "@/components/ui";
import { BoutRow, CardChips, CardFileState, EventDateBlock, EventLine, EventStateChip, HistoryChip, ScorecardTable } from "@/components/boxing";
import { Portrait } from "@/components/Portrait";
import type { EventSummary, HomeData } from "@/lib/types";

export const revalidate = 300;

function Marquee({ e, kind, weekCards, today }: { e: EventSummary; kind: "this_week" | "next_fight_week"; weekCards: EventSummary[]; today: string }) {
  const days = daysBetween(today, e.date);
  const where = [e.venue?.name, cityLine(e.venue)].filter(Boolean).join(" · ");
  const h = e.headline;
  const dates = weekCards.map((x) => x.date).sort();
  return (
    <RingFrame as="article" className="marquee">
      <div className="marquee__top">
        <Eyebrow>{kind === "this_week" ? "This week in boxing" : "Next fight weekend"}</Eyebrow>
        <span className="marquee__window">{fmtRange(dates[0], dates[dates.length - 1])} · {plural(weekCards.length, "card")} · {plural(new Set(weekCards.map((x) => x.commission?.slug)).size, "commission")}</span>
      </div>
      <div className="marquee__body">
        <div className="marquee__main">
          <div className="marquee__chips">
            <EventStateChip e={e} today={today} />
            <Chip kind="neutral">Featured card</Chip>
          </div>
          <h1 className="marquee__title"><Link href={eventPath(e)}>{e.name}</Link></h1>
          <dl className="marquee__facts">
            <div><dt>Date</dt><dd>{fmtDate(e.date, { weekday: true })}</dd></div>
            <div><dt>Venue</dt><dd>{where || <span className="muted">Not on record yet</span>}</dd></div>
            <div><dt>Commission</dt><dd>{e.commission?.name ?? <span className="muted">Not on record</span>}</dd></div>
            <div className="hide-sm"><dt>Promoter</dt><dd>{e.promoters.length ? e.promoters.join(", ") : <span className="muted">Listed when the bout sheet is filed</span>}</dd></div>
            <div className="hide-sm"><dt>Broadcast</dt><dd><span className="muted">No sourced broadcast record</span></dd></div>
          </dl>
          {h && h.a && h.b ? (
            <Link className="marquee__bout" href={boutPath(h)}>
              <span className="eyebrow">Headline bout{h.scheduled_rounds ? ` · ${h.scheduled_rounds} rounds` : ""}</span>
              <span className="marquee__names">{h.a.name} <em>vs</em> {h.b.name}</span>
            </Link>
          ) : (
            <StateNote kind="building" title="Upcoming card intelligence is filling as official records resolve">
              <span className="hide-sm">The commission has listed this card, but its bout sheet is not on record yet. Matchups, title stakes and market state appear here as soon as verified bouts exist. Nothing is filled in ahead of the official record.</span>
              <span className="show-sm">Bout sheet not on record yet. Matchups appear as verified bouts exist.</span>
            </StateNote>
          )}
        </div>
        <div className="marquee__side">
          <div className="countdown" aria-label={`${days} days until the card`}>
            <span className="countdown__n">{days > 0 ? days : 0}</span>
            <span className="countdown__l">{days === 1 ? "day out" : days > 0 ? "days out" : "fight night"}</span>
          </div>
          <div className="marquee__market">
            <Eyebrow>Market</Eyebrow>
            <span>{h?.market_matched ? "Matched market available" : "No matched market yet"}</span>
          </div>
          <div className="marquee__actions">
            <Link className="btn btn--primary" href="/fight-week">Open Fight Week</Link>
            <Link className="btn" href={eventPath(e)}>Event page</Link>
          </div>
        </div>
      </div>
    </RingFrame>
  );
}

function DnaFeature({ f }: { f: NonNullable<HomeData["dna_feature"]> }) {
  const keys = ["results.win_rate", "results.stoppage_win_share", "finishing.early_stoppage_share", "durability.rounds_completed_ratio"];
  const views = keys.map((k) => metricView(k, f.dna)).filter((v) => v.state === "available");
  return (
    <div className="feature-dna">
      <Link href={fighterPath(f.fighter)} className="feature-dna__who">
        <Portrait name={f.fighter.name} id={f.fighter.public_id} size={88} />
        <span>
          <span className="feature-dna__name">{f.fighter.name}</span>
          <span className="feature-dna__rec">{fmtRecord(f.record)} · {plural(f.record.bouts, "verified bout")}</span>
          <HistoryChip bouts={f.record.bouts} />
        </span>
      </Link>
      <div className="feature-dna__metrics">
        {views.map((v) => (
          <div key={v.key} className="meter">
            <div className="meter__top"><span>{v.label}</span><strong>{v.value}</strong></div>
            <div className="meter__track"><span style={{ width: `${Math.round((v.raw ?? 0) * 100)}%` }} /></div>
            <div className="meter__n">{v.sample}</div>
          </div>
        ))}
      </div>
      <p className="fine">Selected automatically: the boxer with the most Fight DNA metrics past their sample thresholds. PropBetEdge-derived from official commission results.</p>
    </div>
  );
}

export default async function Home() {
  const res = await gateway.home();
  if (!res.ok) return <Unavailable what="The boxing home desk" />;
  const d = res.data;
  const today = d.today;
  const fw = currentFightWeek(d.upcoming, today);
  const featured = fw?.week.events[0] ?? null;
  const others = fw ? fw.week.events.slice(1) : [];
  const later = fw ? d.upcoming.filter((e) => !fw.week.events.includes(e)).slice(0, 4) : d.upcoming.slice(0, 4);
  const recentWeeks = groupByWeek(d.recent).reverse();
  const sc = d.scorecard_watch[0];
  const c = d.coverage;

  return (
    <>
      <section className="hero">
        <div className="wrap hero__grid">
          {featured && fw ? (
            <Marquee e={featured} kind={fw.kind} weekCards={fw.week.events} today={today} />
          ) : (
            <RingFrame as="article" className="marquee">
              <Eyebrow>This week in boxing</Eyebrow>
              <h1 className="marquee__title">No upcoming card on record</h1>
              <StateNote kind="building" title="Commission schedules are checked daily">Upcoming cards appear here when a covered athletic commission lists them.</StateNote>
            </RingFrame>
          )}
          <aside className="weekend">
            <SectionHead kicker={fw?.kind === "this_week" ? "Same week" : "Same weekend"} title="Other cards this weekend" />
            {others.length ? (
              <div className="weekend__list">
                {others.map((e) => (
                  <Link key={e.public_id} href={eventPath(e)} className="wcard">
                    <EventDateBlock date={e.date} />
                    <span className="wcard__body">
                      <span className="wcard__name">{e.name}</span>
                      <span className="wcard__meta">{e.commission?.jurisdiction ?? "Commission not on record"}{cityLine(e.venue) ? ` · ${cityLine(e.venue)}` : ""}</span>
                      <CardFileState e={e} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">No other card on record for this weekend.</p>
            )}
            {later.length ? (
              <>
                <Eyebrow className="weekend__later">Later on the schedule</Eyebrow>
                <ul className="later">
                  {later.map((e) => (
                    <li key={e.public_id}><Link href={eventPath(e)}><span className="later__d">{fmtDate(e.date, { year: false })}</span><span className="later__n">{shortEventName(e.name, e.venue)}</span><span className="later__j">{e.commission?.jurisdiction}</span></Link></li>
                  ))}
                </ul>
              </>
            ) : null}
            <Link className="more-link" href="/events">Full schedule <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </section>

      <div className="wrap">
        <Ropes />
        <section className="home-results">
          <SectionHead kicker="Official commission results" title="Recent results" href="/events?scope=results" hrefLabel="All results" />
          <div className="home-results__grid">
            <div className="home-results__events">
              {recentWeeks.slice(0, 2).map((w) => (
                <div key={w.start} className="weekblock">
                  <div className="weekblock__head"><span className="eyebrow">Fight weekend</span><span className="weekblock__range">{fmtRange(w.first, w.last)}</span><span className="muted">{plural(w.events.length, "card")}</span></div>
                  {w.events.map((e) => <EventLine key={e.public_id} e={e} today={today} />)}
                </div>
              ))}
            </div>
            <div className="home-results__bouts">
              <Eyebrow>Latest official results</Eyebrow>
              <div className="bout-list bout-list--tight">
                {d.latest_results.slice(0, 6).map((b) => <BoutRow key={b.public_id} b={b} completeEvent showEvent />)}
              </div>
            </div>
          </div>
        </section>

        <Ropes />
        <div className="home-duo">
          <section>
            <SectionHead kicker="Split and majority decisions" title="Scorecard Watch" />
            {sc && sc.a && sc.b ? (
              <div className="scwatch">
                <Link href={boutPath(sc)} className="scwatch__title">
                  <span>{sc.a.name} <em>vs</em> {sc.b.name}</span>
                  <span className="muted">{sc.event ? `${fmtDate(sc.event.date)} · ${sc.event.name}` : ""}</span>
                </Link>
                <ScorecardTable b={sc} aName={sc.a.name} bName={sc.b.name} />
                {d.scorecard_watch.slice(1).map((x) => x.a && x.b ? (
                  <Link key={x.public_id} href={boutPath(x)} className="scwatch__more">
                    <span>{x.a.name} vs {x.b.name}</span>
                    <CardChips cards={x.scorecards} />
                  </Link>
                ) : null)}
              </div>
            ) : (
              <StateNote kind="pending" title="No split or majority decision with official cards yet" compact />
            )}
          </section>
          <section>
            <SectionHead kicker="PropBetEdge-derived" title="Fight DNA" />
            {d.dna_feature ? <DnaFeature f={d.dna_feature} /> : <StateNote kind="building" title="Fight DNA building as verified career history expands" />}
          </section>
        </div>

        <Ropes />
        <section className="home-status">
          <SectionHead kicker="Championship picture · markets" title="Titles, Rankings and Markets" />
          <div className="status-grid">
            <Link href="/titles" className="status-tile">
              <Eyebrow>World Title Map</Eyebrow>
              <strong>{c.title_records ? plural(c.title_records, "title record") : "Title lineage under source review"}</strong>
              <span className="muted">WBC · WBA · IBF · WBO are tracked. Champions appear only from cleared sanctioning-body records, never inferred.</span>
            </Link>
            <Link href="/rankings" className="status-tile">
              <Eyebrow>Rankings</Eyebrow>
              <strong>{c.ranking_snapshots ? plural(c.ranking_snapshots, "ranking snapshot") : "Ranking sources under review"}</strong>
              <span className="muted">Organization rankings stay separate by body and division. No universal PropBetEdge ranking is made up.</span>
            </Link>
            <div className="status-tile">
              <Eyebrow>Market Watch</Eyebrow>
              <strong>{c.matched_market_bouts ? plural(c.matched_market_bouts, "matched bout") : "No matched markets yet"}</strong>
              <span className="muted">{plural(c.captured_market_events_upcoming, "upcoming sportsbook event")} captured; prices attach only after a match to a verified bout.</span>
            </div>
          </div>
        </section>

        <Ropes />
        <section className="onrecord" id="coverage">
          <SectionHead kicker="Coverage grows every commission filing" title="On the record" href="/methodology#coverage" hrefLabel="Methodology" />
          <div className="onrecord__grid">
            <Stat value={c.bouts} label="Verified bouts" sub={`${c.official_results} official results`} />
            <Stat value={c.fighters_with_bouts} label="Boxers with verified bouts" />
            <Stat value={c.events_complete} label="Completed cards" sub={`${c.events_upcoming} upcoming listed`} />
            <Stat value={c.bouts_with_scorecards} label="Bouts with judges' cards" />
            <Stat value={`${c.judges} / ${c.referees}`} label="Judges / referees" />
            <Stat value={c.awaiting_verification} label="Sheet bouts awaiting identity verification" sub="Shown once both boxers are verified" />
          </div>
          <p className="fine">Sources: {c.commissions.map((x) => x.name).join(" · ")}.</p>
        </section>
      </div>
    </>
  );
}
