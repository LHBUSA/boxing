import type { Metadata } from "next";
import Link from "next/link";
import { gateway, todayUtc } from "@/lib/gateway";
import { currentFightWeek } from "@/lib/weekend";
import { cityLine, daysBetween, fmtDate, fmtRange, monthDay, plural, weekday } from "@/lib/format";
import { boutPath, eventPath, parseRef, refOf } from "@/lib/slug";
import { BoutLine, MatchupCard, Note, PosterCard, SecHead, Unavailable } from "@/components/fight";
import { Timeline } from "@/components/Timeline";
import type { BoutCompact } from "@/lib/types";

export const revalidate = 300;
export const metadata: Metadata = { title: "Fight Week", description: "This boxing weekend, card by card: main events, matchups, weigh-ins, markets, officials and results as they happen." };

const byDistance = (x: BoutCompact, y: BoutCompact) => (y.scheduled_rounds ?? 0) - (x.scheduled_rounds ?? 0) || (y.order ?? 0) - (x.order ?? 0);

export default async function FightWeekPage({ searchParams }: { searchParams: Promise<{ card?: string }> }) {
  const sp = await searchParams;
  const [up, recent] = await Promise.all([gateway.events("upcoming", { limit: 40 }), gateway.events("results", { limit: 3 })]);
  if (!up.ok) return <Unavailable what="Fight Week" />;
  const today = todayUtc();
  const fw = currentFightWeek(up.data.rows, today);
  const cards = fw?.week.events ?? [];
  const wanted = sp.card ? parseRef(sp.card) : null;
  const sel = cards.find((e) => wanted && refOf(e.public_id) === wanted.slice(0, 12)) ?? cards[0] ?? null;
  const detail = sel ? await gateway.event(refOf(sel.public_id)) : null;
  const bouts = detail?.ok ? detail.data.bouts : [];
  const main = [...bouts].sort(byDistance)[0] ?? null;
  const mainDetail = main ? await gateway.bout(refOf(main.public_id)) : null;
  const last = recent.ok ? recent.data.rows[0] : null;
  const lastDetail = last ? await gateway.event(refOf(last.public_id)) : null;
  const lastMain = lastDetail?.ok ? [...lastDetail.data.bouts].sort(byDistance)[0] : null;
  const lastMainDetail = lastMain ? await gateway.bout(refOf(lastMain.public_id)) : null;

  return (
    <div className="page">
      <section className="wrap">
        <header className="page-hero" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 20, alignItems: "flex-end" }}>
          <div>
            <div className="eyebrow">{fw?.kind === "this_week" ? "Fight Week · this week" : "Fight Week · next fight weekend"}</div>
            <h1>{fw ? fmtRange(fw.week.first, fw.week.last) : "Fight Week"}</h1>
            <p>{fw ? `${plural(cards.length, "card")} across ${plural(new Set(cards.map((c) => c.commission?.slug)).size, "commission")}. Pick a card; everything on this page comes from its official record.` : "No upcoming card is on the commission schedules yet."}</p>
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
                  <div className="ncard__date"><span className="ncard__day">{md.day}</span><span className="ncard__mon">{md.month} · {weekday(e.date)}</span>{on ? <span className="tag tag--solid" style={{ marginLeft: "auto" }}>Selected</span> : null}</div>
                  <div className="ncard__name">{e.name}</div>
                  <div className="ncard__meta">{[e.venue?.name, cityLine(e.venue) ?? e.commission?.jurisdiction].filter(Boolean).join(" · ")}</div>
                  <div className="ncard__state">{e.bout_count ? <span className="tag tag--gold">{plural(e.bout_count, "bout")}</span> : <span className="tag tag--pending">Bout sheet pending</span>}</div>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </section>

      {sel ? (
        <section className="wrap mt-4">
          {main && mainDetail?.ok ? (
            <>
              <div className="split">
                <PosterCard bout={mainDetail.data.bout} event={sel} recA={mainDetail.data.corners.a?.record_all} recB={mainDetail.data.corners.b?.record_all} eyebrow="Main event" badge={<span className="tag tag--live">{fmtDate(sel.date, { year: false })}</span>}
                  actions={<Link className="btn btn--gold btn--sm" href={boutPath(main)}>Fight Center</Link>} />
                <div>
                  <SecHead kicker={sel.commission?.name} title={sel.name} />
                  {detail?.ok && detail.data.timeline ? <Timeline e={sel} t={detail.data.timeline} bouts={bouts} /> : null}
                </div>
              </div>
              {bouts.length > 1 ? (<><div className="tier"><h3>The card</h3><span>official sheet order</span></div><div className="blist">{bouts.filter((b) => b !== main).map((b) => <BoutLine key={b.public_id} bout={b} completeEvent={sel.status === "complete"} />)}</div></>) : null}
            </>
          ) : (
            <div className="split">
              <div className="panel panel--pad">
                <div className="eyebrow">{sel.commission?.name}</div>
                <h2 className="serif mt-1" style={{ fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 900 }}>{sel.name}</h2>
                <p className="mono dim mt-1">{fmtDate(sel.date, { weekday: true })}{sel.venue?.name ? ` · ${sel.venue.name}` : ""}{cityLine(sel.venue) ? `, ${cityLine(sel.venue)}` : ""}</p>
                <div className="mt-3"><Note title="The bout sheet is not on record yet" pending>The commission lists this card, but no official bout sheet is filed. The main event, full card, weigh-ins, officials and markets join this page as soon as verified bouts exist. Nothing is filled in ahead of the official record.</Note></div>
                <div className="mt-2" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link className="btn btn--sm" href={eventPath(sel)}>Event page</Link></div>
              </div>
              <div>
                <SecHead kicker="Recorded stages only" title="Fight Week Timeline" />
                {detail?.ok && detail.data.timeline ? <Timeline e={sel} t={detail.data.timeline} bouts={bouts} /> : <Note title="No recorded stage yet" />}
              </div>
            </div>
          )}
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
