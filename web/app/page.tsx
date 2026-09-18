import Link from "next/link";
import { gateway, optional } from "@/lib/gateway";
import { currentFightWeek } from "@/lib/weekend";
import { cityLine, daysBetween, fmtDate, fmtRange, fmtRecord, plural, shortEventName } from "@/lib/format";
import { boutPath, eventPath, fighterPath, refOf } from "@/lib/slug";
import { metricView } from "@/lib/dna";
import { fightRead, whatMatters } from "@/lib/matchup";
import { FighterArt } from "@/components/FighterArt";
import { RingGlyph } from "@/components/Shell";
import { BoutLine, CardTile, DnaBars, MatchupCard, Note, PosterCard, ScorecardView, SecHead, Unavailable, surname, verdictLine } from "@/components/fight";
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
    <Link href={`/${role}s`} className="panel panel--pad" style={{ display: "grid", gap: 14 }}>
      <div>
        <div className="eyebrow">{role === "judge" ? "Judge DNA" : "Referee DNA"} · {plural(role === "judge" ? row.cards : row.assignments, role === "judge" ? "official card" : "bout")}</div>
        <div className="serif" style={{ fontSize: 26, fontWeight: 800, color: "var(--paper)", marginTop: 8 }}>{row.name}</div>
      </div>
      <div className="tiles" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {keys.map((k) => { const x = fmt(k); return <div className="tile" key={k}><b className={x.v ? "gold" : "is-na"}>{x.v ?? "Building"}</b><span>{label[k]}</span><small>{x.n != null ? `n=${x.n}` : ""}</small></div>; })}
      </div>
    </Link>
  );
}

export default async function Home() {
  const [homeRes, wireRes, hallRes, titlesRes] = await Promise.all([gateway.home(), gateway.wire(8), gateway.hallOfFame({ limit: 600 }), gateway.titles()]);
  if (!homeRes.ok) return <Unavailable what="The Boxing home desk" />;
  const d = homeRes.data;
  const wire = optional(wireRes) ?? [];
  const hall = optional(hallRes);
  const titles = optional(titlesRes);
  const today = d.today;
  const hero = pickHero(d.upcoming, d.recent);
  const heroDetail = hero?.e.headline ? await gateway.bout(refOf(hero.e.headline.public_id)) : null;
  const fw = currentFightWeek(d.upcoming, today);
  const cards = fw?.week.events ?? [];
  const featured = cards[0] ?? null;
  const bigFights = d.recent.filter((e) => e.headline?.a && e.headline?.b && e.public_id !== hero?.e.public_id).slice(0, 6);
  const sc = d.scorecard_watch[0];
  const c = d.coverage;
  const ow = d.officials_watch;
  const mi = d.market_index;
  const dna = d.dna_feature;
  const laterCards = d.upcoming.filter((e) => !cards.includes(e)).slice(0, 6);
  const latestClass = hall?.years.length ? Math.max(...hall.years.map((y) => y.year)) : null;
  const classRows = latestClass ? (hall?.rows ?? []).filter((r) => r.year === latestClass) : [];

  return (
    <>
      <section className="hero">
        <div className="wrap hero__grid">
          <div>
            <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 10 }}><RingGlyph /> This week in boxing</div>
            {fw ? (
              <>
                <h1>{fmtRange(fw.week.first, fw.week.last)}. <em>{plural(cards.length, "card")}.</em></h1>
                <p className="hero__lede">{fw.kind === "this_week" ? "This week" : "Next fight weekend"}: {cards.map((e) => shortEventName(e.name, e.venue)).join(" · ")}. Boxing runs in parallel across promotions and commissions; every card fills in from its official record, and nothing is filled in ahead of it.</p>
              </>
            ) : (
              <>
                <h1>Every card. Every corner. <em>Every scorecard.</em></h1>
                <p className="hero__lede">Boxing from the official record up: cards, fighters, judges&apos; scorecards, officials, titles, markets and history.</p>
              </>
            )}
            <div className="hero__cta">
              <Link className="btn btn--gold" href="/fight-week">Enter Fight Week →</Link>
              <Link className="btn" href="/scorecards">Scorecard Center</Link>
              <Link className="btn" href="/fighters">Fighters</Link>
            </div>
            <div className="hero__stats">
              <div className="hero__stat"><b>{c.bouts}</b><span>Verified bouts</span></div>
              <div className="hero__stat"><b>{c.scorecard_decisions ?? c.bouts_with_scorecards}</b><span>Decisions with cards</span></div>
              <div className="hero__stat"><b>{c.judges + c.referees}</b><span>Officials on record</span></div>
              <div className="hero__stat"><b>{hall?.total ?? c.fighters_with_bouts}</b><span>{hall ? "Hall of Fame inductions" : "Boxers on record"}</span></div>
            </div>
          </div>
          {hero?.e.headline ? (
            <PosterCard
              priority
              bout={heroDetail?.ok ? heroDetail.data.bout : hero.e.headline}
              event={hero.e}
              recA={heroDetail?.ok ? heroDetail.data.corners.a?.record_all : null}
              recB={heroDetail?.ok ? heroDetail.data.corners.b?.record_all : null}
              eyebrow={hero.kind === "final" ? "Latest main event on record" : "Main event"}
              badge={<span className={`tag ${hero.kind === "final" ? "tag--gold" : "tag--live"}`}>{hero.kind === "final" ? "Final" : fmtDate(hero.e.date, { year: false })}</span>}
              actions={<>
                <Link className="btn btn--gold btn--sm" href={boutPath(hero.e.headline)}>Fight Center</Link>
                <Link className="btn btn--sm" href={`/scorecards/${refOf(hero.e.headline.public_id)}`}>Scorecards</Link>
                <Link className="btn btn--sm" href={eventPath(hero.e)}>Full card</Link>
              </>}
              foot={featured ? (
                <>
                  <span className="mono dim" style={{ fontSize: 12.5 }}>
                    <span className="gold">FEATURED NEXT</span> · {fmtDate(featured.date, { weekday: true, year: false })} · {shortEventName(featured.name, featured.venue)}{cityLine(featured.venue) ? `, ${cityLine(featured.venue)}` : ""}
                  </span>
                  <Link className="link-gold" href="/fight-week">{Math.max(0, daysBetween(today, featured.date))} days →</Link>
                </>
              ) : null}
            />
          ) : <Note title="No fight on record yet" />}
        </div>
      </section>

      {cards.length ? (
        <section className="band band--tint">
          <div className="wrap">
            <SecHead kicker={fw?.kind === "this_week" ? "Cards this week" : "Next fight weekend"} title="On the Weekend Board" action={<Link className="link-gold" href="/fight-week">Open Fight Week →</Link>}>
              Each card carries its own promotion, commission, venue, title stakes, market and media state. Bout sheets join as the commissions file them.
            </SecHead>
            <div className="nextcards">{cards.map((e) => <CardTile key={e.public_id} e={e} today={today} />)}</div>
          </div>
        </section>
      ) : null}

      {heroDetail?.ok ? (
        <section className="band">
          <div className="wrap split">
            <div>
              <SecHead kicker={hero?.kind === "final" ? "Fight intelligence · latest main event" : "Fight Week intelligence · main event"} title={`${surname(heroDetail.data.bout.a?.name ?? "")} vs ${surname(heroDetail.data.bout.b?.name ?? "")}`} action={<Link className="link-gold" href={boutPath(heroDetail.data.bout)}>Full read →</Link>} />
              {fightRead(heroDetail.data).map((p, i) => <p key={i} className="read">{p}</p>)}
              {whatMatters(heroDetail.data).length ? <div className="factors mt-2">{whatMatters(heroDetail.data).map((f) => <div className="factor" key={f.title}><b>{f.title}</b><span>{f.evidence}</span></div>)}</div> : null}
            </div>
            <div>
              <SecHead kicker="Matched markets only" title="Market Watch" action={<Link className="link-gold" href="/odds">Odds Terminal →</Link>} />
              {mi?.matched.length ? (
                <div className="blist">{mi.matched.slice(0, 5).map((b) => <Link key={b.public_id} href={boutPath(b)} className="bline"><span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{b.a?.name} vs {b.b?.name}</span><span className="bline__meta">{fmtDate(b.event.date)} · {b.event.name}</span></span><span className="bline__res"><span className="bline__method">Market →</span></span></Link>)}</div>
              ) : (
                <Note title="No matched market yet">{mi ? `${mi.captured_upcoming_events} upcoming sportsbook events are captured; prices appear only once one matches a bout on the official record.` : "Prices appear only for bouts on the official record."} No probabilities or picks: the PropBetEdge model is untrained.</Note>
              )}
              <div className="mt-4">
                <SecHead kicker="Four sanctioning bodies · never merged" title="World Title Map" action={<Link className="link-gold" href="/titles">Title Map →</Link>} />
                <div className="lanes">
                  {(titles?.board.organizations ?? []).map((o) => (
                    <Link key={o.slug} href="/titles" className="lane">
                      <b>{o.short_name}</b>
                      <span>{o.title_records ? plural(o.title_records, "title record") : "Champion records pending source clearance"}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {bigFights.length ? (
        <section className="band band--tint">
          <div className="wrap">
            <SecHead kicker="Main events on record" title="The Big Fights" action={<Link className="link-gold" href="/events?scope=results">All results →</Link>}>
              The longest scheduled bout from each recent card, with the official result and judges&apos; totals.
            </SecHead>
            <div className="mgrid mgrid--3">{bigFights.map((e) => <MatchupCard key={e.public_id} bout={e.headline as BoutCompact} event={e} />)}</div>
          </div>
        </section>
      ) : null}

      {sc?.a && sc?.b ? (
        <section className="band">
          <div className="wrap split">
            <div>
              <SecHead kicker="Scorecard Watch · split and majority decisions" title={`${surname(sc.a.name)} vs ${surname(sc.b.name)}`}>
                {sc.event ? `${fmtDate(sc.event.date)} · ${sc.event.name}.` : ""} Three judges, one bout, the official totals as published.
              </SecHead>
              <ScorecardView bout={sc} aName={sc.a.name} bName={sc.b.name} />
              <div className="mt-2" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn btn--gold btn--sm" href={`/scorecards/${refOf(sc.public_id)}`}>Open the scorecard</Link>
                <Link className="btn btn--sm" href="/scorecards?decision=split">All split decisions</Link>
              </div>
            </div>
            <div>
              <SecHead kicker="Scorecard Center" title="More close cards" />
              <div className="blist">{d.scorecard_watch.slice(1).map((b) => <BoutLine key={b.public_id} bout={b} completeEvent showEvent />)}</div>
              {ow?.judge || ow?.referee ? (
                <div className="mt-4" style={{ display: "grid", gap: 12 }}>
                  {ow?.judge ? <OfficialTile row={ow.judge} role="judge" /> : null}
                  {ow?.referee ? <OfficialTile row={ow.referee} role="referee" /> : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {dna ? (
        <section className="band band--tint">
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

      <section className="band">
        <div className="wrap split">
          <div>
            <SecHead kicker="Boxing Desk · verified wire" title="Latest From the Desk" action={wire.length ? <Link className="link-gold" href="/news">All →</Link> : undefined} />
            {wire.length ? (
              <div className="blist">{wire.slice(0, 6).map((w, i) => (
                <Link key={i} href={w.bout ? boutPath(w.bout) : w.event ? eventPath(w.event) : "/news"} className="bline">
                  <span className="bline__names"><span className="bline__meta"><span className="tag">{w.kind === "result_official" ? "Official result" : w.kind === "scorecards_posted" ? "Scorecards posted" : w.kind === "missed_weight" ? "Missed weight" : "Card change"}</span></span><span style={{ color: "var(--paper)", fontWeight: 600 }}>{w.kind === "result_official" && w.bout ? verdictLine(w.bout) : w.kind === "missed_weight" ? `${String((w.detail as { fighter?: string }).fighter ?? "")} missed weight` : w.bout?.a && w.bout?.b ? `${w.bout.a.name} vs ${w.bout.b.name}` : w.event?.name}</span></span>
                  <span className="bline__res"><span className="bline__method">{w.event_date ? fmtDate(w.event_date, { year: false }) : ""}</span></span>
                </Link>
              ))}</div>
            ) : <div className="blist">{d.latest_results.slice(0, 6).map((b) => <BoutLine key={b.public_id} bout={b} completeEvent showEvent />)}</div>}
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
          </div>
        </div>
      </section>

      {hall && latestClass ? (
        <section className="band band--tint">
          <div className="wrap split">
            <div>
              <SecHead kicker="Boxing history · recognized institutions" title={`Hall of Fame Class of ${latestClass}`} action={<Link className="link-gold" href="/hall-of-fame">Hall of Fame →</Link>}>
                {plural(hall.total, "induction")} across {plural(hall.years.length, "class", "classes")}, with each institution&apos;s own categories. PropBetEdge never keeps a Hall of its own.
              </SecHead>
              <div className="hof-grid">{classRows.slice(0, 8).map((r) => <div key={r.person_public_id + r.category} className="hof-card"><b>{r.name}</b><span>{r.category}</span><small>{r.institution}</small></div>)}</div>
            </div>
            <div>
              <SecHead kicker="Decade first · coverage expanding" title="How the Sport Got Here" action={<Link className="link-gold" href="/history">History →</Link>} />
              <Note title="Built as a graph, not copied prose">History connects fighters, cards, venues, promoters, title lineage and Hall of Fame records as each source is cleared. Decades are objective; eras are never drawn by opinion.</Note>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
