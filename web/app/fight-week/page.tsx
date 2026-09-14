import type { Metadata } from "next";
import Link from "next/link";
import { gateway, optional, todayUtc } from "@/lib/gateway";
import { currentFightWeek } from "@/lib/weekend";
import { cityLine, daysBetween, fmtDate, fmtRange, monthDay, plural, weekday } from "@/lib/format";
import { boutPath, eventPath, parseRef, refOf } from "@/lib/slug";
import { fightRead, readLimits, whatMatters } from "@/lib/matchup";
import { BoutLine, MatchupCard, Note, PosterCard, SecHead, Unavailable } from "@/components/fight";
import { CardFacts } from "@/components/CardFacts";
import { Timeline } from "@/components/Timeline";
import type { BoutCompact, EventSummary } from "@/lib/types";
import type { EventTimeline } from "@/lib/types-phase2";

export const revalidate = 300;
export const metadata: Metadata = { title: "Fight Week", description: "This boxing weekend, card by card across promotions and commissions: main events, full cards, officials, weigh-ins, markets and results as the record fills in." };

const byDistance = (x: BoutCompact, y: BoutCompact) => (y.scheduled_rounds ?? 0) - (x.scheduled_rounds ?? 0) || (y.order ?? 0) - (x.order ?? 0);

function Readiness({ e, t, main }: { e: EventSummary; t: EventTimeline | null; main: BoutCompact | null }) {
  const steps: [string, boolean, string][] = [
    ["Card listed", true, `On the ${e.commission?.name ?? "commission"} schedule`],
    ["Bout sheet", e.sheet_filed, e.sheet_filed ? plural(e.bout_count, "verified bout") : "Not filed on record yet"],
    ["Main event", Boolean(main?.a && main?.b), main?.a && main?.b ? `${main.a.name} vs ${main.b.name}` : "Identified from the sheet (longest scheduled bout)"],
    ["Officials", Boolean(t?.card.officials_assigned), t?.card.officials_assigned ? plural(t.card.officials_assigned, "assignment") : "Referee and judges once assigned"],
    ["Official weigh-in", Boolean(t?.weigh_ins.official_weights), t?.weigh_ins.official_weights ? `${plural(t.weigh_ins.official_weights, "official weight")}${t.weigh_ins.missed ? ` · ${t.weigh_ins.missed} missed` : ""}` : "Scale results when recorded"],
    ["Matched market", Boolean(t?.market.matched_bouts), t?.market.matched_bouts ? plural(t.market.matched_bouts, "bout") : "Prices once a sportsbook event matches a verified bout"],
    ["Official results", Boolean(t?.results.official), t?.results.official ? `${plural(t.results.official, "result")}${t.scorecards.bouts ? ` · ${plural(t.scorecards.bouts, "scorecard set")}` : ""}` : "After the card"],
  ];
  return <ul className="readiness">{steps.map(([k, ok, v]) => <li key={k} className={ok ? "is-done" : ""}><i aria-hidden="true" /><span><b>{k}</b> · {v}</span></li>)}</ul>;
}

export default async function FightWeekPage({ searchParams }: { searchParams: Promise<{ card?: string }> }) {
  const sp = await searchParams;
  const [up, recent, mi] = await Promise.all([gateway.events("upcoming", { limit: 40 }), gateway.events("results", { limit: 3 }), gateway.marketIndex()]);
  if (!up.ok) return <Unavailable what="Fight Week" />;
  const market = optional(mi);
  const today = todayUtc();
  const fw = currentFightWeek(up.data.rows, today);
  const cards = fw?.week.events ?? [];
  const wanted = sp.card ? parseRef(sp.card) : null;
  const sel = cards.find((e) => wanted && refOf(e.public_id) === wanted.slice(0, 12)) ?? cards[0] ?? null;
  const featured = cards[0] ?? null;
  const detail = sel ? await gateway.event(refOf(sel.public_id)) : null;
  const timeline = detail?.ok ? detail.data.timeline ?? null : null;
  const bouts = detail?.ok ? detail.data.bouts : [];
  const main = [...bouts].sort(byDistance)[0] ?? null;
  const mainDetail = main ? await gateway.bout(refOf(main.public_id)) : null;
  const last = recent.ok ? recent.data.rows[0] : null;
  const lastDetail = last ? await gateway.event(refOf(last.public_id)) : null;
  const lastMain = lastDetail?.ok ? [...lastDetail.data.bouts].sort(byDistance)[0] : null;
  const lastMainDetail = lastMain ? await gateway.bout(refOf(lastMain.public_id)) : null;
  const others = cards.filter((e) => e.public_id !== sel?.public_id);

  return (
    <div className="page">
      <section className="wrap">
        <header className="page-hero" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 20, alignItems: "flex-end" }}>
          <div>
            <div className="eyebrow">{fw?.kind === "this_week" ? "Fight Week · this week in boxing" : "Fight Week · next fight weekend"}</div>
            <h1>{fw ? fmtRange(fw.week.first, fw.week.last) : "Fight Week"}</h1>
            <p>{fw ? `${plural(cards.length, "card")} across ${plural(new Set(cards.map((c) => c.commission?.slug)).size, "commission")}. Boxing weekends run in parallel: pick a card, and everything below comes from its official record.` : "No upcoming card is on the commission schedules yet."}</p>
          </div>
          {sel ? <div className="countdown"><b>{Math.max(0, daysBetween(today, sel.date))}</b><span>days to<br />{fmtDate(sel.date, { year: false })}</span></div> : null}
        </header>
        {cards.length ? (
          <nav className="nextcards" aria-label="Cards this weekend">
            {cards.map((e) => {
              const md = monthDay(e.date);
              const on = e.public_id === sel?.public_id;
              return (
                <Link key={e.public_id} href={`/fight-week?card=${refOf(e.public_id)}`} className="ncard" aria-current={on ? "true" : undefined} style={on ? { borderColor: "var(--gold)", boxShadow: "0 0 0 1px var(--gold) inset" } : undefined} scroll={false}>
                  <div className="ncard__date"><span className="ncard__day">{md.day}</span><span className="ncard__mon">{md.month} · {weekday(e.date)}</span>{e.public_id === featured?.public_id ? <span className="tag tag--solid" style={{ marginLeft: "auto" }}>Featured</span> : on ? <span className="tag" style={{ marginLeft: "auto" }}>Viewing</span> : null}</div>
                  <div className="ncard__name">{e.name}</div>
                  <div className="ncard__meta">{[e.venue?.name, cityLine(e.venue) ?? e.commission?.jurisdiction].filter(Boolean).join(" · ")}</div>
                  <div className="ncard__state">{e.bout_count ? <span className="tag tag--gold">{plural(e.bout_count, "bout")}</span> : <span className="tag tag--pending">Bout sheet pending</span>}{e.title_bouts ? <span className="tag tag--gold">{plural(e.title_bouts, "title bout")}</span> : null}</div>
                </Link>
              );
            })}
          </nav>
        ) : null}
        {cards.length > 1 ? <p className="fine mt-1">Featured card rule: title bouts on record, then verified bouts, then the longest scheduled headline bout, then a verified venue, then the earliest date. No promotion is favoured by name.</p> : null}
      </section>

      {sel ? (
        <section className="wrap mt-4">
          <SecHead kicker={`${sel.commission?.name ?? "Commission schedule"}${sel.public_id === featured?.public_id ? " · featured card" : ""}`} title={sel.name} action={<Link className="link-gold" href={eventPath(sel)}>Fight Center →</Link>} />
          <CardFacts e={sel} market={market} timeline={timeline} />

          {main && mainDetail?.ok ? (
            <>
              <div className="split mt-4">
                <PosterCard bout={mainDetail.data.bout} event={sel} recA={mainDetail.data.corners.a?.record_all} recB={mainDetail.data.corners.b?.record_all} eyebrow="Main event" badge={<span className="tag tag--live">{fmtDate(sel.date, { year: false })}</span>}
                  actions={<Link className="btn btn--gold btn--sm" href={boutPath(main)}>Fight Center</Link>} />
                <div>
                  <SecHead kicker="Evidence-led · research, not a pick" title="Fight Week Intelligence" />
                  {fightRead(mainDetail.data).map((p, i) => <p key={i} className="read">{p}</p>)}
                  {whatMatters(mainDetail.data).length ? <div className="factors mt-2">{whatMatters(mainDetail.data).map((f) => <div className="factor" key={f.title}><b>{f.title}</b><span>{f.evidence}</span></div>)}</div> : null}
                  <div className="mt-3"><div className="eyebrow eyebrow--dim">What could break the read</div><ul className="limits mt-1">{readLimits(mainDetail.data, null).slice(0, 3).map((l) => <li key={l.title}><b>{l.title}.</b> {l.evidence}</li>)}</ul></div>
                </div>
              </div>
              {bouts.length > 1 ? (<><div className="tier"><h3>The card</h3><span>official sheet order</span></div><div className="blist">{bouts.filter((b) => b !== main).map((b) => <BoutLine key={b.public_id} bout={b} completeEvent={sel.status === "complete"} />)}</div></>) : null}
            </>
          ) : (
            <div className="split mt-4">
              <div className="panel panel--pad">
                <div className="eyebrow">Main event</div>
                <h2 className="serif mt-1" style={{ fontSize: "clamp(26px, 3.4vw, 38px)", fontWeight: 900 }}>Not on the official record yet</h2>
                <p className="dim mt-1">The commission lists this card, but no official bout sheet is filed. The main event, full card, tale of the tape, weigh-ins, officials and markets fill in as verified bouts exist. Nothing is filled in ahead of the official record.</p>
                <div className="mt-3"><Readiness e={sel} t={timeline} main={main} /></div>
              </div>
              <div>
                <SecHead kicker="Recorded stages only" title="Fight Week Timeline" />
                {timeline ? <Timeline e={sel} t={timeline} bouts={bouts} /> : <Note title="No recorded stage yet" />}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {others.length ? (
        <section className="wrap mt-4">
          <SecHead kicker="Same weekend · other promotions and commissions" title="Other Cards This Week" />
          <div className="blist">
            {others.map((e) => (
              <Link key={e.public_id} href={`/fight-week?card=${refOf(e.public_id)}`} className="bline" scroll={false}>
                <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{e.name}</span><span className="bline__meta">{fmtDate(e.date, { weekday: true, year: false })} · {[e.venue?.name, cityLine(e.venue) ?? e.commission?.jurisdiction].filter(Boolean).join(" · ")}</span></span>
                <span className="bline__res"><span className="bline__method">{e.headline?.a && e.headline?.b ? `${e.headline.a.name} vs ${e.headline.b.name}` : e.bout_count ? plural(e.bout_count, "bout") : "Sheet pending"}</span><span className="tag">{e.commission?.jurisdiction ?? ""}</span></span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {last && lastMain && lastMainDetail?.ok ? (
        <section className="band band--tint mt-4">
          <div className="wrap">
            <SecHead kicker="Last fight week · in review" title={`${last.name}`} action={<Link className="link-gold" href={eventPath(last)}>Full Fight Center →</Link>}>
              {fmtDate(last.date, { weekday: true })} · {plural(last.bout_count, "verified bout")} · {last.results_count} official results
            </SecHead>
            <div className="split">
              <PosterCard bout={lastMainDetail.data.bout} event={last} recA={lastMainDetail.data.corners.a?.record_all} recB={lastMainDetail.data.corners.b?.record_all} eyebrow="Main event · final" badge={<span className="tag tag--gold">Final</span>}
                actions={<><Link className="btn btn--gold btn--sm" href={boutPath(lastMain)}>Fight Center</Link>{lastMain.scorecards.length ? <Link className="btn btn--sm" href={`/scorecards/${refOf(lastMain.public_id)}`}>Scorecards</Link> : null}</>} />
              <div>
                <div className="mgrid">{lastDetail!.ok ? lastDetail!.data.bouts.filter((b) => b !== lastMain).slice(0, 4).map((b) => <MatchupCard key={b.public_id} bout={b} event={last} />) : null}</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
