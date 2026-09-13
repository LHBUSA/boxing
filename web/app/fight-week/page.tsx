import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { currentFightWeek } from "@/lib/weekend";
import { cityLine, daysBetween, fmtDate, fmtRange, plural } from "@/lib/format";
import { eventPath, parseRef, refOf } from "@/lib/slug";
import { Chip, Eyebrow, RingFrame, Ropes, SectionHead, StateNote, Unavailable } from "@/components/ui";
import { BoutRow, CardFileState, EventDateBlock, EventLine, EventStateChip } from "@/components/boxing";
import { Faceoff, MatchupIntel } from "@/components/MatchupDesk";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Fight Week",
  description: "Every card of the current boxing fight weekend across promotions and commissions: featured card, matchup intelligence and official state.",
};

export default async function FightWeekPage({ searchParams }: { searchParams: Promise<{ card?: string }> }) {
  const sp = await searchParams;
  const up = await gateway.events("upcoming", { limit: 40 });
  if (!up.ok) return <Unavailable what="Fight Week" />;
  const today = new Date().toISOString().slice(0, 10);
  const fw = currentFightWeek(up.data.rows, today);
  if (!fw) {
    return (
      <div className="wrap page-pad">
        <Eyebrow>Fight Week</Eyebrow>
        <h1 className="page-title">No upcoming card on record</h1>
        <StateNote kind="building" title="The desk opens when a covered commission lists a card" />
      </div>
    );
  }
  const cards = fw.week.events;
  const wanted = sp.card ? parseRef(sp.card) : null;
  const selected = cards.find((e) => wanted && refOf(e.public_id) === wanted.slice(0, 12)) ?? cards[0];
  const [detail, sameCommission] = await Promise.all([
    gateway.event(refOf(selected.public_id)),
    selected.commission ? gateway.events("results", { commission: selected.commission.slug, limit: 3 }) : Promise.resolve(null),
  ]);
  const bouts = detail.ok ? detail.data.bouts : [];
  const headline = [...bouts].sort((x, y) => (y.scheduled_rounds ?? 0) - (x.scheduled_rounds ?? 0) || (y.order ?? 0) - (x.order ?? 0))[0];
  const main = headline ? await gateway.bout(refOf(headline.public_id)) : null;
  const days = daysBetween(today, selected.date);
  const where = [selected.venue?.name, cityLine(selected.venue)].filter(Boolean).join(" · ");
  const jurisdictions = new Set(cards.map((c) => c.commission?.slug)).size;

  return (
    <div className="fw">
      <section className="fw__mast">
        <div className="wrap">
          <div className="fw__masthead">
            <div>
              <Eyebrow>{fw.kind === "this_week" ? "Fight Week · this week" : "Fight Week · next fight weekend"}</Eyebrow>
              <h1 className="page-title">{fmtRange(fw.week.first, fw.week.last)}</h1>
              <p className="fw__sub">{plural(cards.length, "card")} across {plural(jurisdictions, "commission")}. Boxing weekends run in parallel; pick a card below.</p>
            </div>
            <div className="fw__count" aria-label={`${days} days to the first card`}>
              <span className="countdown__n">{Math.max(days, 0)}</span>
              <span className="countdown__l">days to {fmtDate(selected.date, { year: false })}</span>
            </div>
          </div>
          <nav className="cardpick" aria-label="Cards this weekend">
            {cards.map((e) => {
              const on = e.public_id === selected.public_id;
              return (
                <Link key={e.public_id} href={`/fight-week?card=${refOf(e.public_id)}`} className={`cardpick__item${on ? " is-on" : ""}`} aria-current={on ? "true" : undefined} scroll={false}>
                  <EventDateBlock date={e.date} />
                  <span className="cardpick__body">
                    <span className="cardpick__name">{e.name}</span>
                    <span className="cardpick__meta">{e.commission?.jurisdiction ?? "—"} · <CardFileState e={e} /></span>
                  </span>
                  {on ? <Chip kind="neutral">Selected</Chip> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="wrap">
        <RingFrame as="section" className="fw__event">
          <div className="fw__eventhead">
            <div>
              <div className="marquee__chips">
                <EventStateChip e={selected} today={today} />
                {selected === cards[0] ? <Chip kind="neutral">Featured card</Chip> : null}
                {selected.title_bouts ? <Chip kind="official">{plural(selected.title_bouts, "title bout")}</Chip> : null}
              </div>
              <h2 className="fw__eventname"><Link href={eventPath(selected)}>{selected.name}</Link></h2>
            </div>
            <Link className="btn" href={eventPath(selected)}>Event page</Link>
          </div>
          <dl className="marquee__facts marquee__facts--row">
            <div><dt>Date</dt><dd>{fmtDate(selected.date, { weekday: true })}</dd></div>
            <div><dt>Venue</dt><dd>{where || <span className="muted">Not on record yet</span>}</dd></div>
            <div><dt>Commission</dt><dd>{selected.commission?.name ?? "—"}</dd></div>
            <div><dt>Promoter</dt><dd>{selected.promoters.length ? selected.promoters.join(", ") : <span className="muted">Listed with the bout sheet</span>}</dd></div>
            <div><dt>Broadcast</dt><dd><span className="muted">No sourced record</span></dd></div>
            <div><dt>Coverage</dt><dd><CardFileState e={selected} /></dd></div>
          </dl>
        </RingFrame>

        {main && main.ok && headline ? (
          <>
            <SectionHead kicker={`Longest scheduled bout · ${headline.scheduled_rounds ?? "?"} rounds`} title="Main Event" />
            <Faceoff d={main.data} />
            <MatchupIntel d={main.data} compact />
            <Ropes />
            <SectionHead kicker="Official sheet order · card segments not published by the commission" title="The Card" />
            <div className="bout-list">{bouts.map((b) => <BoutRow key={b.public_id} b={b} completeEvent={selected.status === "complete"} />)}</div>
          </>
        ) : (
          <div className="fw__empty">
            <StateNote kind="building" title="Upcoming card intelligence is filling as official records resolve">
              {selected.commission?.name ?? "The commission"} lists this card, but no bout sheet is on record yet. The main-event face-off, matchup intelligence, title stakes and market state open here once verified bouts exist. Nothing is filled in ahead of the official record.
            </StateNote>
            <div className="timeline">
              <Eyebrow>Fight Week timeline · recorded stages only</Eyebrow>
              <ol>
                <li className="is-done"><span className="timeline__stage">Card listed</span><span>On the {selected.commission?.name ?? "commission"} schedule</span></li>
                <li><span className="timeline__stage">Fight night</span><span>{fmtDate(selected.date, { weekday: true })}{where ? ` · ${where}` : ""}</span></li>
              </ol>
              <p className="fine">Media days, weigh-ins, face-offs and official video join this timeline only when a real record of them exists.</p>
            </div>
          </div>
        )}

        {sameCommission && sameCommission.ok && sameCommission.data.rows.length ? (
          <>
            <Ropes />
            <section>
              <SectionHead kicker={`Latest from ${selected.commission?.jurisdiction ?? "this commission"}`} title="Recent cards, same commission" href={`/events?scope=results&commission=${selected.commission?.slug}`} hrefLabel="More" />
              {sameCommission.data.rows.map((e) => <EventLine key={e.public_id} e={e} today={today} />)}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
