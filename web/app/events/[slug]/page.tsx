import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { gateway, todayUtc } from "@/lib/gateway";
import { cityLine, fmtDate, methodLabel, plural, scoreVerdict } from "@/lib/format";
import { boutPath, eventPath, parseRef, refOf } from "@/lib/slug";
import { Chip, Crumbs, Eyebrow, RingFrame, Ropes, SectionHead, Stat, StateNote, Unavailable } from "@/components/ui";
import { BoutRow, EventStateChip, ScorecardTable } from "@/components/boxing";
import { Faceoff, MatchupIntel } from "@/components/MatchupDesk";
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
  const done = e.status === "complete";
  return {
    title: `${e.name}, ${fmtDate(e.date)}${done ? ": results and scorecards" : ""}`,
    description: `${done ? "Official results, judges' scorecards and officials" : "Card state and matchups"} for ${e.name} (${e.commission?.name ?? "athletic commission record"}).`,
    alternates: { canonical: eventPath(e) },
  };
}

function headlineOf(bouts: BoutCompact[]) {
  return [...bouts].sort((x, y) => (y.scheduled_rounds ?? 0) - (x.scheduled_rounds ?? 0) || (y.order ?? 0) - (x.order ?? 0))[0] ?? null;
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This event" />; }
  const { event: e, bouts, same_weekend, card_changes } = res.data;
  if (`/events/${slug}` !== eventPath(e)) permanentRedirect(eventPath(e));
  const today = todayUtc();
  const complete = e.status === "complete";
  const head = headlineOf(bouts);
  const headDetail = head ? await gateway.bout(refOf(head.public_id)) : null;
  const titleBouts = bouts.filter((b) => b.titles.length);
  const withCards = bouts.filter((b) => b.scorecards.length).length;
  const splitish = bouts.filter((b) => b.result?.decision_type === "split" || b.result?.decision_type === "majority").length;
  const stoppages = bouts.filter((b) => ["KO", "TKO", "RTD"].includes(b.result?.method ?? "")).length;
  const noResult = complete ? bouts.filter((b) => !b.result).length : 0;
  const referees = [...new Set(bouts.map((b) => b.referee).filter(Boolean))] as string[];
  const judges = [...new Set(bouts.flatMap((b) => b.scorecards.map((s) => s.judge)))];
  const where = [e.venue?.name, cityLine(e.venue)].filter(Boolean).join(" · ");
  const jsonLd = {
    "@context": "https://schema.org", "@type": "SportsEvent", name: e.name, startDate: e.date, sport: "Boxing",
    eventStatus: e.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    location: e.venue?.name ? { "@type": "Place", name: e.venue.name, address: cityLine(e.venue) ?? undefined } : undefined,
  };

  return (
    <div className="wrap page-pad">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Crumbs items={[{ label: "Events", href: complete ? "/events?scope=results" : "/events" }, { label: fmtDate(e.date) }]} />
      <RingFrame as="section" className="evhead">
        <div className="evhead__top">
          <div className="marquee__chips">
            <EventStateChip e={e} today={today} />
            {e.commission ? <Chip kind="official">{e.commission.name}</Chip> : null}
          </div>
          {e.official_source_url ? <a className="source-link" href={e.official_source_url} target="_blank" rel="noopener noreferrer">Official {complete ? "results document" : "listing"} ↗</a> : null}
        </div>
        <h1 className="evhead__title">{e.name}</h1>
        <dl className="marquee__facts marquee__facts--row">
          <div><dt>Date</dt><dd>{fmtDate(e.date, { weekday: true })}</dd></div>
          <div><dt>Venue</dt><dd>{where || <span className="muted">Not on record</span>}</dd></div>
          <div><dt>Promoter on the sheet</dt><dd>{e.promoters.length ? e.promoters.join(", ") : <span className="muted">Not listed yet</span>}</dd></div>
          <div><dt>Broadcast</dt><dd><span className="muted">No sourced record</span></dd></div>
        </dl>
        {complete || bouts.length ? (
          <div className="evhead__stats">
            <Stat value={bouts.length} label="Verified bouts" sub={e.awaiting_verification ? `${e.awaiting_verification} more awaiting identity verification` : "Every sheet bout verified"} />
            <Stat value={bouts.length - noResult} label="Official results" sub={noResult ? `${noResult} not recorded` : undefined} />
            <Stat value={stoppages} label="KO / TKO / RTD" />
            <Stat value={withCards} label="Bouts with judges' cards" sub={splitish ? `${splitish} split or majority` : undefined} />
          </div>
        ) : null}
      </RingFrame>

      {!bouts.length ? (
        <StateNote kind="building" title={complete ? "No verified bout on this card yet" : "Upcoming card intelligence is filling as official records resolve"}>
          {complete
            ? `${e.awaiting_verification ? `${plural(e.awaiting_verification, "bout")} from the official sheet ${e.awaiting_verification === 1 ? "is" : "are"} awaiting identity verification. ` : ""}Bouts appear once both boxers are verified.`
            : `${e.commission?.name ?? "The commission"} lists this card; its bout sheet is not on record yet. Matchups appear as soon as verified bouts exist.`}
        </StateNote>
      ) : null}

      {head && headDetail?.ok ? (
        <>
          <SectionHead kicker={`Longest scheduled bout on the card${head.scheduled_rounds ? ` · ${head.scheduled_rounds} rounds` : ""}`} title={complete ? "Headline Result" : "Main Event"} />
          <Faceoff d={headDetail.data} />
          {complete ? (
            <div className="evhead__score">
              <ScorecardTable b={headDetail.data.bout} aName={headDetail.data.bout.a?.name ?? "Corner A"} bName={headDetail.data.bout.b?.name ?? "Corner B"} />
              <Link className="more-link" href={boutPath(head)}>Full matchup intelligence and Fight DNA <span aria-hidden="true">→</span></Link>
            </div>
          ) : (
            <MatchupIntel d={{ ...headDetail.data, card: [] }} compact />
          )}
        </>
      ) : null}

      {titleBouts.length ? (
        <>
          <Ropes />
          <SectionHead kicker="Sanctioned titles on record" title="Championship Bouts" />
          <div className="bout-list">{titleBouts.map((b) => <BoutRow key={b.public_id} b={b} completeEvent={complete} />)}</div>
        </>
      ) : null}

      {bouts.length ? (
        <>
          <Ropes />
          <SectionHead kicker="Official sheet order · this commission does not publish card segments" title="Full Card" meta={e.awaiting_verification ? <Chip kind="review">{e.awaiting_verification} awaiting identity verification</Chip> : null} />
          <div className="bout-list">{bouts.map((b) => <BoutRow key={b.public_id} b={b} completeEvent={complete} />)}</div>
        </>
      ) : null}

      {complete && bouts.length ? (
        <div className="home-duo">
          <section>
            <SectionHead kicker="Assignments on the official sheet" title="Officials" />
            <dl className="officials">
              <div><dt>Referees</dt><dd>{referees.length ? referees.join(" · ") : <span className="muted">Not on record</span>}</dd></div>
              <div><dt>Judges with cards</dt><dd>{judges.length ? judges.join(" · ") : <span className="muted">No judges&apos; totals captured</span>}</dd></div>
            </dl>
            <p className="fine">Judge DNA and Referee DNA profiles open in Phase 2. Descriptive only, always with sample sizes.</p>
          </section>
          <section>
            <SectionHead kicker="Judges' totals" title="Decisions on this card" />
            {bouts.filter((b) => b.result?.method === "DECISION").length ? (
              <ul className="decisions">
                {bouts.filter((b) => b.result?.method === "DECISION").map((b) => {
                  const v = scoreVerdict(b.scorecards);
                  return (
                    <li key={b.public_id}>
                      <span>{b.a?.name} vs {b.b?.name}</span>
                      <span className="muted">{methodLabel(b.result)}{b.scorecards.length ? ` · ${v.a}-${v.b}${v.even ? `-${v.even}` : ""} on the cards` : " · cards not captured"}</span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="muted">No bout on this card went to the scorecards.</p>}
          </section>
        </div>
      ) : null}

      {same_weekend.length ? (
        <>
          <Ropes />
          <section>
            <SectionHead kicker="Boxing weekends run in parallel" title="Same weekend" />
            <ul className="later">
              {same_weekend.map((x) => (
                <li key={x.public_id}><Link href={eventPath(x)}><span className="later__d">{fmtDate(x.date, { year: false })}</span><span className="later__n">{x.name}</span><span className="later__j">{x.commission}</span></Link></li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <p className="fine">
        {card_changes.count ? `${plural(card_changes.count, "official-record update")} tracked for this card. ` : ""}
        Source: {e.commission?.name ?? "athletic commission"}. Results and scorecards are shown as the commission published them; revised results keep their earlier versions.
      </p>
    </div>
  );
}
