import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { currentFightWeek } from "@/lib/weekend";
import { cityLine, daysBetween, fmtDate, fmtRange, fmtRecord, plural, shortEventName } from "@/lib/format";
import { boutPath, eventPath, fighterPath } from "@/lib/slug";
import { metricView } from "@/lib/dna";
import { FighterArt } from "@/components/FighterArt";
import { RingGlyph } from "@/components/Shell";
import { BoutLine, CardTile, DnaBars, MatchupCard, Note, PosterCard, ScorecardView, SecHead, Unavailable, surname } from "@/components/fight";
import type { BoutCompact, EventSummary, OfficialRow } from "@/lib/types";

export const revalidate = 300;

function pickHero(upcoming: EventSummary[], recent: EventSummary[]) {
  const withBouts = upcoming.find((e) => e.headline?.a && e.headline?.b);
  if (withBouts) return { e: withBouts, kind: "upcoming" as const };
  const done = recent.find((e) => e.headline?.a && e.headline?.b && (e.headline.scheduled_rounds ?? 0) >= 10) ?? recent.find((e) => e.headline?.a && e.headline?.b);
  return done ? { e: done, kind: "final" as const } : null;
}

function OfficialTile({ row, role }: { row: OfficialRow; role: "judge" | "referee" }) {
  const keys = role === "judge" ? ["judge.avg_card_margin", "judge.panel_disagreement_rate"] : ["referee.stoppage_rate", "referee.avg_stoppage_round"];
  const label: Record<string, string> = { "judge.avg_card_margin": "Avg card margin", "judge.panel_disagreement_rate": "Different winner from panel", "referee.stoppage_rate": "Bouts ending in stoppage", "referee.avg_stoppage_round": "Avg stoppage round" };
  const fmt = (k: string) => {
    const m = row.metrics.find((x) => x.key === k);
    if (!m || m.status !== "available" || m.value == null) return { v: null, n: m?.sample_size ?? null };
    const v = m.unit === "ratio" ? `${Math.round(m.value * 100)}%` : m.unit === "points" ? `${m.value.toFixed(1)} pts` : m.unit === "round" ? `R${m.value.toFixed(1)}` : String(m.value);
    return { v, n: m.sample_size };
  };
  return (
    <Link href={`/officials/${row.public_id.slice(-32).slice(0, 12)}`} className="panel panel--pad" style={{ display: "grid", gap: 14 }}>
      <div>
        <div className="eyebrow">{role === "judge" ? "Judge" : "Referee"} · {plural(role === "judge" ? row.cards : row.assignments, role === "judge" ? "official card" : "bout")}</div>
        <div className="serif" style={{ fontSize: 28, fontWeight: 800, color: "var(--paper)", marginTop: 8 }}>{row.name}</div>
      </div>
      <div className="tiles" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {keys.map((k) => { const x = fmt(k); return <div className="tile" key={k}><b className={x.v ? "gold" : "is-na"}>{x.v ?? "Building"}</b><span>{label[k]}</span><small>{x.n != null ? `n=${x.n}` : ""}</small></div>; })}
      </div>
    </Link>
  );
}

export default async function Home() {
  const res = await gateway.home();
  if (!res.ok) return <Unavailable what="The Boxing home desk" />;
  const d = res.data;
  const today = d.today;
  const hero = pickHero(d.upcoming, d.recent);
  const heroDetail = hero?.e.headline ? await gateway.bout(hero.e.headline.public_id.slice(-32).slice(0, 12)) : null;
  const fw = currentFightWeek(d.upcoming, today);
  const next = fw?.week.events[0] ?? d.upcoming[0] ?? null;
  const featured = d.recent.filter((e) => e.headline?.a && e.headline?.b && e.public_id !== hero?.e.public_id).slice(0, 6);
  const sc = d.scorecard_watch[0];
  const c = d.coverage;
  const ow = d.officials_watch;
  const mi = d.market_index;
  const dna = d.dna_feature;
  const laterCards = d.upcoming.filter((e) => !fw?.week.events.includes(e)).slice(0, 6);

  return (
    <>
      <section className="hero">
        <div className="wrap hero__grid">
          <div>
            <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 10 }}><RingGlyph /> PropBetEdge sports network · Fight intelligence</div>
            <h1>Every card. Every corner. <em>Every scorecard.</em></h1>
            <p className="hero__lede">Boxing from the official record up: cards from the athletic commissions, fighter dossiers, judges&apos; scorecards, officials, Fight DNA, titles and markets, built from sources we can show you.</p>
            <div className="hero__cta">
              <Link className="btn btn--gold" href="/fight-week">Enter Fight Week →</Link>
              <Link className="btn" href="/scorecards">Scorecard Center</Link>
              <Link className="btn" href="/fighters">Fighters</Link>
            </div>
            <div className="hero__stats">
              <div className="hero__stat"><b>{c.bouts}</b><span>Verified bouts</span></div>
              <div className="hero__stat"><b>{c.scorecard_decisions ?? c.bouts_with_scorecards}</b><span>Decisions with cards</span></div>
              <div className="hero__stat"><b>{c.judges}</b><span>Judges</span></div>
              <div className="hero__stat"><b>{c.referees}</b><span>Referees</span></div>
            </div>
          </div>
          {hero?.e.headline ? (
            <PosterCard
              bout={heroDetail?.ok ? heroDetail.data.bout : hero.e.headline}
              event={hero.e}
              recA={heroDetail?.ok ? heroDetail.data.corners.a?.record_all : null}
              recB={heroDetail?.ok ? heroDetail.data.corners.b?.record_all : null}
              eyebrow={hero.kind === "final" ? "Latest fight night · main event" : "Main event"}
              badge={<span className={`tag ${hero.kind === "final" ? "tag--gold" : "tag--live"}`}>{hero.kind === "final" ? "Final" : fmtDate(hero.e.date, { year: false })}</span>}
              actions={<>
                <Link className="btn btn--gold btn--sm" href={boutPath(hero.e.headline)}>Fight Center</Link>
                <Link className="btn btn--sm" href={`/scorecards/${hero.e.headline.public_id.slice(-32).slice(0, 12)}`}>Scorecards</Link>
                <Link className="btn btn--sm" href={eventPath(hero.e)}>Full card</Link>
              </>}
              foot={next ? (
                <>
                  <span className="mono dim" style={{ fontSize: 12.5 }}>
                    <span className="gold">NEXT CARD</span> · {fmtDate(next.date, { weekday: true, year: false })} · {shortEventName(next.name, next.venue)}{cityLine(next.venue) ? `, ${cityLine(next.venue)}` : ""}
                  </span>
                  <Link className="link-gold" href="/fight-week">{Math.max(0, daysBetween(today, next.date))} days →</Link>
                </>
              ) : null}
            />
          ) : <Note title="No fight on record yet" />}
        </div>
      </section>

      {fw ? (
        <section className="band band--tint">
          <div className="wrap">
            <SecHead kicker={fw.kind === "this_week" ? "Fight Week · this week" : "Fight Week · next weekend"} title={`${fmtRange(fw.week.first, fw.week.last)}: ${plural(fw.week.events.length, "card")}`}
              action={<Link className="link-gold" href="/fight-week">Open Fight Week →</Link>}>
              Boxing weekends run in parallel across promoters and commissions. Matchups, weigh-ins and markets join each card as its official bout sheet is filed.
            </SecHead>
            <div className="nextcards">{fw.week.events.map((e) => <CardTile key={e.public_id} e={e} today={today} />)}</div>
            {mi ? (
              <div className="mt-3"><Note title={mi.matched.length ? `${plural(mi.matched.length, "bout")} with a matched market` : "Markets attach when bouts are verified"}>
                {mi.captured_upcoming_events} upcoming sportsbook events are being tracked. Prices appear on a fight page only once that sportsbook event matches a bout on the official record.
              </Note></div>
            ) : null}
          </div>
        </section>
      ) : null}

      {featured.length ? (
        <section className="band">
          <div className="wrap">
            <SecHead kicker="Main events on record" title="The Big Fights" action={<Link className="link-gold" href="/events?scope=results">All results →</Link>}>
              The longest scheduled bout from each recent card, with the official result and judges&apos; totals.
            </SecHead>
            <div className="mgrid mgrid--3">{featured.map((e) => <MatchupCard key={e.public_id} bout={e.headline as BoutCompact} event={e} />)}</div>
          </div>
        </section>
      ) : null}

      {sc?.a && sc?.b ? (
        <section className="band band--tint">
          <div className="wrap split">
            <div>
              <SecHead kicker="Scorecard Watch · split and majority decisions" title={`${surname(sc.a.name)} vs ${surname(sc.b.name)}`}>
                {sc.event ? `${fmtDate(sc.event.date)} · ${sc.event.name}.` : ""} Three judges, one bout, the official totals as published.
              </SecHead>
              <ScorecardView bout={sc} aName={sc.a.name} bName={sc.b.name} />
              <div className="mt-2" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn btn--gold btn--sm" href={`/scorecards/${sc.public_id.slice(-32).slice(0, 12)}`}>Open the scorecard</Link>
                <Link className="btn btn--sm" href="/scorecards?decision=split">All split decisions</Link>
              </div>
            </div>
            <div>
              <SecHead kicker="Scorecard Center" title="More close cards" />
              <div className="blist">{d.scorecard_watch.slice(1).map((b) => <BoutLine key={b.public_id} bout={b} completeEvent showEvent />)}</div>
              {ow?.judge || ow?.referee ? (
                <div className="mt-4" style={{ display: "grid", gap: 12 }}>
                  <div className="eyebrow">Officials intelligence</div>
                  {ow?.judge ? <OfficialTile row={ow.judge} role="judge" /> : null}
                  {ow?.referee ? <OfficialTile row={ow.referee} role="referee" /> : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {dna ? (
        <section className="band">
          <div className="wrap split">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr)", gap: 20, alignItems: "end" }}>
              <FighterArt name={dna.fighter.name} id={dna.fighter.public_id} portrait={dna.fighter.portrait} corner={null} />
              <div>
                <div className="eyebrow">Fight DNA · feature</div>
                <h2 className="serif" style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 900, marginTop: 8 }}><Link href={fighterPath(dna.fighter)}>{dna.fighter.name}</Link></h2>
                <p className="dim mt-1">{fmtRecord(dna.record)} across {plural(dna.record.bouts, "verified bout")}, {dna.record.ko_tko_wins} by KO/TKO. The boxer on record with the most Fight DNA metrics past their sample thresholds.</p>
                <Link className="btn btn--sm mt-2" href={fighterPath(dna.fighter)}>Open dossier</Link>
              </div>
            </div>
            <DnaBars a={dna.dna} aName={dna.fighter.name} keys={["results.win_rate", "results.stoppage_win_share", "finishing.early_stoppage_share", "durability.rounds_completed_ratio"].filter((k) => metricView(k, dna.dna).state === "available")} />
          </div>
        </section>
      ) : null}

      <section className="band band--tint">
        <div className="wrap split">
          <div>
            <SecHead kicker="Official results" title="Recent Results" action={<Link className="link-gold" href="/events?scope=results">All →</Link>} />
            <div className="blist">{d.latest_results.slice(0, 7).map((b) => <BoutLine key={b.public_id} bout={b} completeEvent showEvent />)}</div>
          </div>
          <div>
            <SecHead kicker="Commission schedules" title="Upcoming Cards" action={<Link className="link-gold" href="/events">Schedule →</Link>} />
            <div className="blist">
              {(laterCards.length ? laterCards : d.upcoming.slice(0, 6)).map((e) => (
                <Link key={e.public_id} href={eventPath(e)} className="bline">
                  <span className="bline__names"><span style={{ fontWeight: 600, color: "var(--paper)" }}>{shortEventName(e.name, e.venue)}</span><span className="bline__meta">{e.name}</span></span>
                  <span className="bline__res"><span className="bline__method">{fmtDate(e.date, { year: false })}</span><span className="tag">{e.commission?.jurisdiction}</span></span>
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <div className="eyebrow">Title landscape</div>
              <div className="panel panel--pad mt-1" style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["WBC", "WBA", "IBF", "WBO"].map((o) => <span key={o} className="tag tag--gold" style={{ fontSize: 13, padding: "6px 10px" }}>{o}</span>)}</div>
                <p className="dim" style={{ fontSize: 14 }}>Four sanctioning bodies, every belt kept separate. Champions appear only from cleared sanctioning-body records; those records are under source review, so no champion is shown yet.</p>
                <Link className="link-gold" href="/titles">World Title Map →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
