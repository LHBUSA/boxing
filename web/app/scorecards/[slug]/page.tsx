import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateway } from "@/lib/gateway";
import { cityLine, fmtDate, plural } from "@/lib/format";
import { boutPath, eventPath, fighterPath, parseRef } from "@/lib/slug";
import { FighterArt } from "@/components/FighterArt";
import { Crumbs, Note, ScorecardView, SecHead, Unavailable, surname, verdictLine } from "@/components/fight";
import type { OfficialMetric } from "@/lib/types";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const ref = parseRef(slug);
  if (!ref) notFound();
  return gateway.scorecard(ref.slice(0, 12));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) return { title: "Scorecard", robots: { index: false } };
  const b = res.data.bout;
  return { title: `Scorecards: ${b.a?.name} vs ${b.b?.name}`, description: `The official judges' cards for ${b.a?.name} vs ${b.b?.name}, ${fmtDate(res.data.event.date)}.` };
}

const mv = (list: OfficialMetric[], key: string) => list.find((m) => m.key === key);

export default async function ScorecardPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This scorecard" />; }
  const d = res.data;
  const b = d.bout;
  const aName = b.a?.name ?? "Corner A";
  const bName = b.b?.name ?? "Corner B";
  const margins = b.scorecards.filter((c) => c.a_total != null && c.b_total != null).map((c) => (c.a_total as number) - (c.b_total as number));
  const scale = Math.max(8, ...margins.map(Math.abs));
  const place = [d.event.venue?.name, cityLine(d.event.venue)].filter(Boolean).join(" · ");
  const rounds = b.scorecards.some((c) => (c as { rounds?: unknown[] }).rounds?.length);
  return (
    <div className="wrap page">
      <Crumbs items={[{ label: "Scorecards", href: "/scorecards" }, { label: d.event.name, href: eventPath(d.event) }, { label: `${surname(aName)} vs ${surname(bName)}` }]} />
      <section className="split" style={{ alignItems: "center" }}>
        <div>
          <div className="eyebrow">Official scorecards · {fmtDate(d.event.date)}</div>
          <h1 className="serif mt-1" style={{ fontSize: "clamp(34px, 5vw, 60px)", fontWeight: 900, lineHeight: 1 }}>{aName} <span className="gold" style={{ fontStyle: "italic" }}>vs</span> {bName}</h1>
          <p className="read mt-2">{verdictLine(b) ?? "Official result not recorded"}</p>
          <p className="mono dim mt-1" style={{ fontSize: 13 }}>{d.event.name}{place ? ` · ${place}` : ""}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <Link className="btn btn--gold btn--sm" href={boutPath(b)}>Fight Center</Link>
            <Link className="btn btn--sm" href={eventPath(d.event)}>Full card</Link>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {b.a ? <Link href={fighterPath(b.a)}><FighterArt name={aName} id={b.a.public_id} corner={b.a.corner ?? "red"} portrait={b.a.portrait} side="a" /></Link> : null}
          {b.b ? <Link href={fighterPath(b.b)}><FighterArt name={bName} id={b.b.public_id} corner={b.b.corner ?? "blue"} portrait={b.b.portrait} side="b" /></Link> : null}
        </div>
      </section>

      <section className="mt-4">
        {b.scorecards.length ? <ScorecardView bout={b} aName={aName} bName={bName} title="The judges' cards" source={<span>Source: <a href={d.card_provenance.source_url ?? "#"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{d.event.commission?.name ?? "commission"} document</a></span>} /> : <Note title="No judges' cards on record for this bout" />}
      </section>

      {margins.length >= 2 ? (
        <section className="band">
          <div className="split">
            <div>
              <SecHead kicker="Where each card landed" title="Panel Spread" />
              <div className="pv" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="pv__who"><b style={{ color: "#ff9a9a" }}>← {surname(aName)}</b></div>
                <div style={{ textAlign: "right" }}><b style={{ color: "#9cc4ff" }}>{surname(bName)} →</b></div>
              </div>
              {b.scorecards.map((c, i) => {
                const m = c.a_total != null && c.b_total != null ? c.a_total - c.b_total : null;
                return (
                  <div className="pv" key={i}>
                    <div className="pv__who"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{c.judge}</span><small>{m == null ? "total not published" : m === 0 ? "even" : `${Math.abs(m)} points to ${surname(m > 0 ? aName : bName)}`}</small></div>
                    <div className="pv__axis">{m != null ? <span className="pv__dot pv__dot--me" style={{ left: `${50 - (m / scale) * 46}%`, background: m > 0 ? "var(--red)" : m < 0 ? "var(--blue)" : "var(--gold)" }} /> : null}</div>
                  </div>
                );
              })}
              <p className="fine mt-2">Spread: {d.spread ?? 0} points between the two cards furthest apart. A description of the published totals, not a judgment of any official.</p>
            </div>
            <div>
              <SecHead kicker="Judge DNA · with samples" title="The Judges" />
              <div className="blist">
                {d.judges.map((j) => {
                  const margin = mv(j.dna, "judge.avg_card_margin");
                  const dis = mv(j.dna, "judge.panel_disagreement_rate");
                  return (
                    <Link key={j.public_id} href={`/officials/${j.public_id.slice(-32).slice(0, 12)}`} className="orow">
                      <div><div className="orow__name">{j.name}</div><div className="orow__meta">{plural(j.cards_on_record, "official card")} on record</div></div>
                      <div className="orow__metrics">
                        <div className="orow__m"><b className={margin?.status === "available" ? "" : "is-na"}>{margin?.status === "available" && margin.value != null ? `${margin.value.toFixed(1)}` : `n=${margin?.sample_size ?? 0}`}</b><span>Avg margin</span></div>
                        <div className="orow__m"><b className={dis?.status === "available" ? "" : "is-na"}>{dis?.status === "available" && dis.value != null ? `${Math.round(dis.value * 100)}%` : `n=${dis?.sample_size ?? 0}`}</b><span>Different winner</span></div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <p className="fine mt-2">Values appear once a judge has at least ten comparable bouts on record; below that the sample size is shown instead.</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <SecHead kicker="Provenance" title="On the Record" />
        <div className="tiles">
          <div className="tile"><b>{b.result?.revision ?? "—"}</b><span>Result revision</span><small>{d.result_history.length > 1 ? "revised by the commission" : "as first published"}</small></div>
          <div className="tile"><b>{d.card_provenance.stored_card_versions}</b><span>Stored card versions</span></div>
          <div className="tile"><b>{d.deductions.reduce((s, x) => s + x.points, 0)}</b><span>Point deductions</span><small>{d.deductions.map((x) => `R${x.round} ${x.reason ?? ""}`).join(" · ")}</small></div>
          <div className="tile"><b className={rounds ? "" : "is-na"}>{rounds ? "Yes" : "Not published"}</b><span>Round-by-round</span></div>
        </div>
      </section>
    </div>
  );
}
