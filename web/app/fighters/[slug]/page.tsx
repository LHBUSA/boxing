import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { gateway, todayUtc } from "@/lib/gateway";
import { daysBetween, divisionLabel, fmtDate, fmtHeight, fmtLb, fmtReach, fmtRecord, fmtClock, methodLabel, plural, STANCE } from "@/lib/format";
import { boutPath, eventPath, fighterPath, parseRef } from "@/lib/slug";
import { Chip, Crumbs, Eyebrow, RingFrame, Ropes, SectionHead, StateNote, Unavailable } from "@/components/ui";
import { FormStrip, HistoryChip } from "@/components/boxing";
import { DnaPanel } from "@/components/DnaPanel";
import { Portrait } from "@/components/Portrait";
import type { FighterBout, RecordSummary } from "@/lib/types";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const ref = parseRef(slug);
  if (!ref) notFound();
  return gateway.fighter(ref.slice(0, 12));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok || !res.data.fighter) return { title: "Fighter", robots: { index: false } };
  const { fighter: f, record: r } = res.data;
  return {
    title: `${f.name}: verified record, bouts and Fight DNA`,
    description: `${f.name} is ${fmtRecord(r)} in ${plural(r.bouts, "verified bout")} on PropBetEdge record, from official athletic commission results.`,
    alternates: { canonical: fighterPath(f) },
  };
}

const RESULT_WORD: Record<string, string> = { W: "Win", L: "Loss", D: "Draw", NC: "No contest", ND: "No decision" };

function outcomeText(b: FighterBout) {
  if (!b.event_complete) return "Scheduled";
  if (!b.result) return "Result not recorded";
  const m = methodLabel({ method: b.method, decision_type: b.decision_type, outcome: b.result === "D" ? "draw" : "win" }, true);
  const at = b.method && b.method !== "DECISION" && b.round ? ` R${b.round}${b.time_sec != null ? ` ${fmtClock(b.time_sec)}` : ""}` : "";
  return `${m ?? RESULT_WORD[b.result] ?? b.result}${at}`;
}

function ProfileBar({ parts, total }: { parts: { label: string; n: number; tone: string }[]; total: number }) {
  if (!total) return <p className="muted">None on verified record.</p>;
  return (
    <div className="pbar">
      <div className="pbar__track" aria-hidden="true">
        {parts.filter((p) => p.n).map((p) => <span key={p.label} className={`pbar__seg pbar__seg--${p.tone}`} style={{ flexGrow: p.n }} />)}
      </div>
      <ul className="pbar__legend">
        {parts.map((p) => <li key={p.label}><span className={`pbar__key pbar__key--${p.tone}`} />{p.label} <strong>{p.n}</strong></li>)}
      </ul>
    </div>
  );
}

function ResultProfile({ r }: { r: RecordSummary }) {
  return (
    <div className="profile">
      <div>
        <Eyebrow>Wins · {r.wins}</Eyebrow>
        <ProfileBar total={r.wins} parts={[{ label: "KO / TKO", n: r.ko_tko_wins, tone: "stop" }, { label: "RTD", n: r.rtd_wins, tone: "rtd" }, { label: "DQ", n: r.dq_wins, tone: "dq" }, { label: "Decision", n: r.decision_wins, tone: "dec" }]} />
      </div>
      <div>
        <Eyebrow>Losses · {r.losses}</Eyebrow>
        <ProfileBar total={r.losses} parts={[{ label: "By KO / TKO / RTD / DQ", n: r.stoppage_losses, tone: "stop" }, { label: "By decision", n: r.decision_losses, tone: "dec" }]} />
      </div>
      <div className="profile__misc">
        <span>Draws <strong>{r.draws}</strong></span>
        <span>No contests <strong>{r.no_contests}</strong></span>
        <span>Went the distance <strong>{r.distance_bouts}</strong></span>
        {r.pending ? <span>Result not recorded <strong>{r.pending}</strong></span> : null}
      </div>
    </div>
  );
}

export default async function FighterPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This fighter dossier" />; }
  const d = res.data;
  if (d.redirect_public_id) {
    const target = await gateway.fighter(d.redirect_public_id.slice(-32).slice(0, 12));
    if (target.ok && target.data.fighter) permanentRedirect(fighterPath(target.data.fighter));
    notFound();
  }
  const f = d.fighter;
  if (`/fighters/${slug}` !== fighterPath(f)) permanentRedirect(fighterPath(f));
  const today = todayUtc();
  const r = d.record;
  const done = d.bouts.filter((b) => b.event_complete);
  const upcoming = d.bouts.filter((b) => !b.event_complete).sort((a, b) => a.date.localeCompare(b.date));
  const last5 = done.slice(0, 5);
  const latest = done[0];
  const latestDivision = done.map((b) => divisionLabel(b.weight)).find(Boolean) ?? null;
  const commissions = [...new Map(d.bouts.filter((b) => b.event.commission).map((b) => [b.event.commission_slug, b.event.commission as string])).values()];
  const titled = d.bouts.filter((b) => b.titles.length);
  const weights = done.map((b) => b.weigh_in?.weight_lb).filter((w): w is number => w != null);
  const known: [string, string][] = [];
  if (f.stance) known.push(["Stance", STANCE[f.stance] ?? f.stance]);
  if (f.height_cm) known.push(["Height", fmtHeight(f.height_cm)!]);
  if (f.reach_cm) known.push(["Reach", fmtReach(f.reach_cm)!]);
  if (f.nationality) known.push(["Nationality", f.nationality]);
  const unknown = ["age", ...(!f.stance ? ["stance"] : []), ...(!f.height_cm ? ["height"] : []), ...(!f.reach_cm ? ["reach"] : []), ...(!f.nationality ? ["nationality"] : [])];
  const sinceLast = latest ? daysBetween(latest.date, today) : null;
  const jsonLd = { "@context": "https://schema.org", "@type": "Person", name: f.name, ...(f.nationality ? { nationality: f.nationality } : {}) };

  return (
    <div className="wrap page-pad">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Crumbs items={[{ label: "Fighters", href: "/fighters" }, { label: f.name }]} />
      <RingFrame as="section" className="dossier">
        <div className="dossier__portrait"><Portrait name={f.name} id={f.public_id} size={220} /></div>
        <div className="dossier__id">
          <div className="marquee__chips">
            <HistoryChip bouts={r.bouts} />
            {sinceLast != null ? <Chip kind={sinceLast <= 365 ? "verified" : "neutral"}>{sinceLast <= 365 ? "Active in the last 12 months" : "No verified bout in 12 months"}</Chip> : null}
            {upcoming.length ? <Chip kind="soon">Upcoming bout on record</Chip> : null}
          </div>
          <h1 className="dossier__name">{f.name}</h1>
          {f.nickname ? <div className="dossier__nick">“{f.nickname}”</div> : null}
          <div className="dossier__record">
            <span className="dossier__recnum">{r.bouts ? fmtRecord(r) : "0-0"}</span>
            <span className="dossier__recsub">verified record · {plural(r.bouts, "bout")} on PropBetEdge record{r.pending ? ` · ${r.pending} without an official result` : ""}</span>
          </div>
          {last5.length ? <div className="dossier__form"><Eyebrow>Last {last5.length}</Eyebrow><FormStrip results={last5.map((b) => b.result)} /></div> : null}
          <dl className="dossier__facts">
            <div><dt>Division</dt><dd>{latestDivision ?? (latest?.weigh_in?.weight_lb ? `Weighed ${fmtLb(latest.weigh_in.weight_lb)} last out` : <span className="muted">Not on sheet</span>)}</dd></div>
            <div><dt>Last verified bout</dt><dd>{latest ? <Link href={boutPath({ public_id: latest.public_id })}>{fmtDate(latest.date)}</Link> : "—"}{sinceLast != null ? <span className="muted"> · {sinceLast} days ago</span> : null}</dd></div>
            <div><dt>First verified bout</dt><dd>{r.first_date ? fmtDate(r.first_date) : "—"}</dd></div>
            <div><dt>Commissions</dt><dd>{commissions.join(" · ") || "—"}</dd></div>
            {known.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <p className="fine">Not on verified record: {unknown.join(", ")}. Career bouts before or outside covered commissions are not shown, so this is a verified record, not a full career record.</p>
        </div>
      </RingFrame>

      <nav className="jump" aria-label="Dossier sections">
        {["Upcoming", "Fight DNA", "Career", "Result profile", "Division history", "Title history", "Opposition", "Market history"].map((s) => (
          <a key={s} href={`#${s.toLowerCase().replace(/ /g, "-")}`}>{s}</a>
        ))}
      </nav>

      <section id="upcoming">
        <SectionHead kicker="Canonical scheduled bouts only" title="Upcoming Fight" />
        {upcoming.length ? upcoming.map((b) => (
          <Link key={b.public_id} href={boutPath({ public_id: b.public_id, a: { name: f.name }, b: { name: b.opponent.name } })} className="upnext">
            <span className="eyebrow">{fmtDate(b.date, { weekday: true })}</span>
            <span className="upnext__names">{f.name} <em>vs</em> {b.opponent.name}</span>
            <span className="muted">{b.event.name}{b.scheduled_rounds ? ` · ${b.scheduled_rounds} rounds` : ""}</span>
          </Link>
        )) : <StateNote kind="neutral" title="No verified upcoming bout" compact>An upcoming bout appears once a commission bout sheet lists it and both boxers are verified.</StateNote>}
      </section>

      <Ropes />
      <section id="fight-dna">
        <SectionHead kicker="PropBetEdge-derived from verified bouts" title="Fight DNA" />
        <DnaPanel sides={[{ name: f.name, dna: d.dna }]} asOf={d.dna_as_of} context={r.bouts < 5 ? "Most rates need five decided bouts; limited histories show what is known so far." : undefined} />
      </section>

      <Ropes />
      <section id="career">
        <SectionHead kicker="Chronological, newest first" title="Career" meta={<span className="muted">{plural(d.bouts.length, "verified bout")}</span>} />
        <div className="career" role="table" aria-label="Verified bouts">
          <div className="career__row career__row--head" role="row">
            <span role="columnheader">Date</span>
            <span role="columnheader">Result</span>
            <span role="columnheader">Opponent</span>
            <span role="columnheader">Method</span>
            <span role="columnheader">Card</span>
            <span role="columnheader" className="num">Weigh-in</span>
            <span role="columnheader" className="num">Cards</span>
          </div>
          {d.bouts.map((b) => (
            <div className="career__row" role="row" key={b.public_id}>
              <span role="cell" className="career__date"><Link href={boutPath({ public_id: b.public_id, a: { name: f.name }, b: { name: b.opponent.name } })}>{fmtDate(b.date)}</Link></span>
              <span role="cell"><span className={`rchip rchip--${(b.result ?? (b.event_complete ? "p" : "s")).toLowerCase()}`}>{b.result ?? (b.event_complete ? "—" : "Sched.")}</span>{b.revised ? <Chip kind="review">Revised</Chip> : null}</span>
              <span role="cell" className="career__opp">
                <Link href={fighterPath(b.opponent)}>{b.opponent.name}</Link>
                <span className="muted">{b.opponent.record_entering.bouts ? `${fmtRecord(b.opponent.record_entering)} entering` : "no earlier verified bout"}</span>
              </span>
              <span role="cell">{outcomeText(b)}{b.scheduled_rounds ? <span className="muted"> · {b.scheduled_rounds} rds</span> : null}</span>
              <span role="cell" className="career__event"><Link href={eventPath({ public_id: b.event.public_id, name: b.event.name, date: b.date })}>{b.event.name}</Link><span className="muted">{b.event.commission ?? ""}</span></span>
              <span role="cell" className="num">{fmtLb(b.weigh_in?.weight_lb) ?? <span className="muted">—</span>}</span>
              <span role="cell" className="num career__cards">{b.scorecards.filter((s) => s.mine != null).map((s, i) => <span key={i}>{s.mine}–{s.theirs}</span>)}{!b.scorecards.length ? <span className="muted">—</span> : null}</span>
            </div>
          ))}
        </div>
      </section>

      <Ropes />
      <div className="home-duo">
        <section id="result-profile">
          <SectionHead kicker="How verified bouts ended" title="Result Profile" />
          <ResultProfile r={r} />
        </section>
        <section id="division-history">
          <SectionHead kicker="From official sheets and weigh-ins" title="Division History" />
          {weights.length ? (
            <div className="divsum">
              <span><strong>{fmtLb(Math.min(...weights))}</strong> – <strong>{fmtLb(Math.max(...weights))}</strong></span>
              <span className="muted">official weigh-in range across {plural(weights.length, "verified bout")}</span>
            </div>
          ) : null}
          <ol className="divhist">
            {done.slice(0, 10).map((b) => (
              <li key={b.public_id}>
                <span className="divhist__d">{fmtDate(b.date, { year: true })}</span>
                <span>{divisionLabel(b.weight) ?? <span className="muted">Division not stated on the sheet</span>}</span>
                <span className="muted">{b.weigh_in?.weight_lb ? `weighed ${fmtLb(b.weigh_in.weight_lb)}` : "no weigh-in on record"}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Ropes />
      <div className="home-duo">
        <section id="title-history">
          <SectionHead kicker="Sanctioned titles on verified bouts" title="Title History" />
          {titled.length ? (
            <ul className="decisions">
              {titled.map((b) => <li key={b.public_id}><span>{b.titles.map((t) => `${t.organization} ${t.label}`).join(" · ")}</span><span className="muted">{fmtDate(b.date)} vs {b.opponent.name} · {b.result ?? "—"}</span></li>)}
            </ul>
          ) : <StateNote kind="neutral" title="No title bout on verified record" compact>Sanctioning-body title records are under source review; title stakes appear once they are cleared.</StateNote>}
        </section>
        <section id="opposition">
          <SectionHead kicker="Verified record at the time of the bout" title="Opposition" />
          <ul className="opp">
            {done.slice(0, 10).map((b) => (
              <li key={b.public_id}>
                <span className={`rchip rchip--${(b.result ?? "p").toLowerCase()}`}>{b.result ?? "—"}</span>
                <Link href={fighterPath(b.opponent)}>{b.opponent.name}</Link>
                <span className="muted">{b.opponent.record_entering.bouts ? `${fmtRecord(b.opponent.record_entering)} entering` : "first verified bout"}</span>
              </li>
            ))}
          </ul>
          <p className="fine">Opposition strength scores wait for deeper verified histories of each opponent.</p>
        </section>
      </div>

      <Ropes />
      <section id="market-history">
        <SectionHead kicker="Matched markets only" title="Market History" />
        <StateNote kind="neutral" title="No matched odds history yet" compact>
          Sportsbook prices attach to a boxer only through bouts matched to the verified record. None of this boxer&apos;s bouts has a matched market yet.
        </StateNote>
      </section>
      <p className="fine">Official videos and news for this boxer open in later phases.</p>
    </div>
  );
}
