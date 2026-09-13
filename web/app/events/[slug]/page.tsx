import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { gateway, todayUtc } from "@/lib/gateway";
import { cityLine, daysBetween, fmtDate, plural } from "@/lib/format";
import { boutPath, eventPath, parseRef, refOf } from "@/lib/slug";
import { BoutLine, Crumbs, MatchupCard, Note, PosterCard, SecHead, Unavailable, verdictLine } from "@/components/fight";
import { Timeline } from "@/components/Timeline";
import type { BoutCompact } from "@/lib/types";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const ref = parseRef(slug);
  if (!ref) notFound();
  return gateway.event(ref.slice(0, 12));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) return { title: "Event", robots: { index: false } };
  const e = res.data.event;
  return {
    title: `${e.name} · ${fmtDate(e.date)}${e.status === "complete" ? " · results and scorecards" : ""}`,
    description: `Fight Center for ${e.name}: the full card, official results, judges' scorecards and officials from the ${e.commission?.name ?? "athletic commission"} record.`,
    alternates: { canonical: eventPath(e) },
  };
}

const byDistance = (x: BoutCompact, y: BoutCompact) => (y.scheduled_rounds ?? 0) - (x.scheduled_rounds ?? 0) || (y.order ?? 0) - (x.order ?? 0);

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This event" />; }
  const { event: e, bouts, same_weekend, timeline } = res.data;
  if (`/events/${slug}` !== eventPath(e)) permanentRedirect(eventPath(e));
  const today = todayUtc();
  const complete = e.status === "complete";
  const sorted = [...bouts].sort(byDistance);
  const main = sorted[0] ?? null;
  const mainDetail = main ? await gateway.bout(refOf(main.public_id)) : null;
  const titleBouts = bouts.filter((b) => b.titles.length && b !== main);
  const featured = sorted.slice(1).filter((b) => (b.scheduled_rounds ?? 0) >= 8 && !b.titles.length);
  const undercard = [...bouts].filter((b) => b !== main && !featured.includes(b) && !titleBouts.includes(b)).sort((x, y) => (y.order ?? 0) - (x.order ?? 0));
  const place = [e.venue?.name, cityLine(e.venue)].filter(Boolean).join(" · ");
  const days = daysBetween(today, e.date);
  const stoppages = bouts.filter((b) => ["KO", "TKO", "RTD"].includes(b.result?.method ?? "")).length;
  const decisions = bouts.filter((b) => b.result?.method === "DECISION").length;
  const withCards = bouts.filter((b) => b.scorecards.length).length;
  const referees = [...new Map(bouts.filter((b) => b.referee_public_id).map((b) => [b.referee_public_id, b.referee])).entries()];
  const judges = [...new Map(bouts.flatMap((b) => b.scorecards).filter((s) => s.judge_public_id).map((s) => [s.judge_public_id, s.judge])).entries()];

  return (
    <div className="wrap page">
      <Crumbs items={[{ label: "Events", href: complete ? "/events?scope=results" : "/events" }, { label: fmtDate(e.date) }]} />
      <section className="hero__grid" style={{ alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={`tag ${complete ? "tag--gold" : "tag--live"}`}>{complete ? "Final" : days <= 0 ? "Fight night" : `In ${days} days`}</span>
            {e.commission ? <span className="tag">{e.commission.name}</span> : null}
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(36px, 5.2vw, 64px)", fontWeight: 900, lineHeight: 0.98, letterSpacing: "-0.025em", marginTop: 14 }}>{e.name}</h1>
          <p className="mono dim mt-2" style={{ fontSize: 14 }}>{fmtDate(e.date, { weekday: true })}{place ? ` · ${place}` : ""}</p>
          <div className="facts mt-3">
            <div><dt>Promoter on the sheet</dt><dd>{e.promoters.length ? e.promoters.map((p, i) => <span key={p}>{i ? ", " : ""}<Link className="gold" href={`/promoters/${p.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}>{p}</Link></span>) : <span className="faint">Listed with the bout sheet</span>}</dd></div>
            <div><dt>Commission</dt><dd>{e.commission?.name ?? "—"}</dd></div>
            <div><dt>Broadcast</dt><dd className="faint">No sourced broadcast record</dd></div>
          </div>
          {bouts.length ? (
            <div className="tiles mt-3">
              <div className="tile"><b>{bouts.length}</b><span>Verified bouts</span>{e.awaiting_verification ? <small>+{e.awaiting_verification} awaiting identity check</small> : null}</div>
              <div className="tile"><b>{e.results_count}</b><span>Official results</span></div>
              <div className="tile"><b>{stoppages}</b><span>KO · TKO · RTD</span></div>
              <div className="tile"><b>{withCards}</b><span>Decisions with cards</span><small>{decisions} decisions</small></div>
            </div>
          ) : null}
          {e.official_source_url ? <p className="mt-2"><a className="link-gold" href={e.official_source_url} target="_blank" rel="noopener noreferrer">Official commission {complete ? "results" : "listing"} ↗</a></p> : null}
        </div>
        {main && mainDetail?.ok ? (
          <PosterCard bout={mainDetail.data.bout} event={e} recA={mainDetail.data.corners.a?.record_all} recB={mainDetail.data.corners.b?.record_all}
            eyebrow="Main event · longest scheduled bout" badge={<span className="tag tag--gold">{main.scheduled_rounds ? `${main.scheduled_rounds} rounds` : "Main event"}</span>}
            actions={<><Link className="btn btn--gold btn--sm" href={boutPath(main)}>Fight Center</Link>{main.scorecards.length ? <Link className="btn btn--sm" href={`/scorecards/${refOf(main.public_id)}`}>Scorecards</Link> : null}</>} />
        ) : (
          <Note title={complete ? "No verified bout on this card yet" : "Upcoming card intelligence is filling as official records resolve"} pending={!complete}>
            {complete ? `${e.awaiting_verification ? `${plural(e.awaiting_verification, "bout")} from the official sheet await identity verification. ` : ""}Bouts appear once both boxers are verified.`
              : `${e.commission?.name ?? "The commission"} lists this card; its bout sheet is not on record yet. Matchups, weigh-ins and markets appear as soon as verified bouts exist.`}
          </Note>
        )}
      </section>

      {titleBouts.length ? (<><div className="tier"><h3>Championship bouts</h3></div><div className="mgrid mgrid--3">{titleBouts.map((b) => <MatchupCard key={b.public_id} bout={b} event={e} />)}</div></>) : null}
      {featured.length >= 2 ? (<><div className="tier"><h3>Featured bouts</h3><span>8+ scheduled rounds</span></div><div className="mgrid mgrid--3">{featured.map((b) => <MatchupCard key={b.public_id} bout={b} event={e} />)}</div></>) : null}
      {featured.length === 1 ? (<><div className="tier"><h3>Featured bout</h3><span>8+ scheduled rounds</span></div><div className="blist">{featured.map((b) => <BoutLine key={b.public_id} bout={b} completeEvent={complete} />)}</div></>) : null}
      {undercard.length ? (<><div className="tier"><h3>Undercard</h3><span>Official sheet order · segments not published by the commission</span></div><div className="blist">{undercard.map((b) => <BoutLine key={b.public_id} bout={b} completeEvent={complete} />)}</div></>) : null}

      {bouts.length || timeline ? (
        <section className="band">
          <div className="split">
            <div>
              <SecHead kicker="Recorded stages only" title="Fight Week Timeline" />
              {timeline ? <Timeline e={e} t={timeline} bouts={bouts} /> : null}
            </div>
            <div>
              <SecHead kicker="Assignments on the official sheet" title="Officials" />
              {referees.length || judges.length ? (
                <div style={{ display: "grid", gap: 16 }}>
                  {referees.length ? <div><div className="eyebrow eyebrow--dim">Referees</div><div className="tiles mt-1" style={{ gridTemplateColumns: "1fr 1fr" }}>{referees.map(([id, n]) => <Link key={id} className="tile" href={`/officials/${String(id).slice(-32).slice(0, 12)}`}><b style={{ fontSize: 15, fontFamily: "var(--f-ui)" }}>{n}</b><span>Referee DNA →</span></Link>)}</div></div> : null}
                  {judges.length ? <div><div className="eyebrow eyebrow--dim">Judges with published cards</div><div className="tiles mt-1" style={{ gridTemplateColumns: "1fr 1fr" }}>{judges.map(([id, n]) => <Link key={id} className="tile" href={`/officials/${String(id).slice(-32).slice(0, 12)}`}><b style={{ fontSize: 15, fontFamily: "var(--f-ui)" }}>{n}</b><span>Judge DNA →</span></Link>)}</div></div> : null}
                </div>
              ) : <Note title="Officials not on record yet" />}
              {decisions ? (
                <div className="mt-3">
                  <div className="eyebrow eyebrow--dim">Decisions</div>
                  <div className="blist mt-1">{bouts.filter((b) => b.result?.method === "DECISION").map((b) => (
                    <Link key={b.public_id} href={b.scorecards.length ? `/scorecards/${refOf(b.public_id)}` : boutPath(b)} className="bline">
                      <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{verdictLine(b)}</span><span className="bline__meta">{b.scorecards.length ? b.scorecards.map((s) => `${s.a_total}–${s.b_total}`).join(" · ") : "Cards not captured"}</span></span>
                      <span className="bline__res"><span className="link-gold" style={{ fontSize: 13 }}>{b.scorecards.length ? "Scorecard →" : "Fight →"}</span></span>
                    </Link>
                  ))}</div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {same_weekend.length ? (
        <section>
          <SecHead kicker="Boxing weekends run in parallel" title="Same Weekend" />
          <div className="blist">{same_weekend.map((x) => (
            <Link key={x.public_id} href={eventPath(x)} className="bline">
              <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{x.name}</span><span className="bline__meta">{x.commission}</span></span>
              <span className="bline__res"><span className="bline__method">{fmtDate(x.date, { year: false })}</span></span>
            </Link>
          ))}</div>
        </section>
      ) : null}
    </div>
  );
}
