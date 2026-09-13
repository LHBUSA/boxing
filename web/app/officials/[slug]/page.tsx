import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { gateway } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { boutPath, parseRef, refOf } from "@/lib/slug";
import { needText } from "@/lib/dna";
import { Crumbs, Note, SecHead, Unavailable, shortResult, surname } from "@/components/fight";
import type { OfficialAssignment, OfficialMetric } from "@/lib/types";

export const revalidate = 900;
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const ref = parseRef(slug);
  if (!ref) notFound();
  return gateway.official(ref.slice(0, 12));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok || !res.data.official) return { title: "Official", robots: { index: false } };
  return { title: `${res.data.official.name}: officials record`, description: `${res.data.official.name}: assignments, published cards and descriptive metrics with samples, from official commission records.` };
}

const JUDGE = [
  ["judge.bouts_scored", "Bouts scored"], ["judge.avg_card_margin", "Average card margin"], ["judge.panel_disagreement_rate", "Different winner from the rest of the panel"],
  ["judge.split_decision_involvement", "Split-decision involvement"], ["judge.majority_decision_involvement", "Majority-decision involvement"],
  ["judge.round_10_8_rate", "10-8 round frequency"], ["judge.round_10_10_rate", "10-10 round frequency"], ["judge.round_consensus_distance", "Distance from panel per round"], ["judge.title_fight_assignments", "Title fights scored"],
] as const;
const REF = [
  ["referee.bouts_refereed", "Bouts refereed"], ["referee.stoppage_rate", "Bouts ending in KO/TKO/RTD"], ["referee.ko_tko_stoppages", "KO/TKO/RTD stoppages"],
  ["referee.avg_stoppage_round", "Average stoppage round"], ["referee.disqualifications", "Disqualifications"], ["referee.point_deductions_per_bout", "Point deductions per bout"],
  ["referee.avg_completed_rounds", "Average completed rounds"], ["referee.title_fights", "Title fights refereed"],
] as const;

function MetricTile({ m, label }: { m: OfficialMetric | undefined; label: string }) {
  const ok = m?.status === "available" && m.value != null;
  const v = !ok ? null : m!.unit === "ratio" ? `${Math.round(m!.value! * 100)}%` : m!.unit === "points" ? m!.value!.toFixed(1) : m!.unit === "round" ? `R${m!.value!.toFixed(1)}` : m!.unit === "per_bout" ? m!.value!.toFixed(2) : String(Math.round(m!.value! * 10) / 10);
  const need = m ? needText(m.minimum_sample) : null;
  return (
    <div className="tile">
      <b className={ok ? "" : "is-na"}>{v ?? "Building"}</b>
      <span>{label}</span>
      <small>{ok ? `n=${m!.sample_size}${m!.numerator != null && m!.denominator != null ? ` · ${m!.numerator} of ${m!.denominator}` : ""}` : `needs ${need ?? "a larger sample"}${m?.sample_size != null ? `, has ${m.sample_size}` : ""}`}</small>
    </div>
  );
}

function PanelRows({ list, me }: { list: OfficialAssignment[]; me: string }) {
  const cards = list.filter((b) => b.scorecards.length);
  if (!cards.length) return <Note title="No published cards for these assignments">The commission documents for these bouts did not publish readable judges&apos; totals.</Note>;
  return (
    <div>
      {cards.map((b) => {
        const margins = b.scorecards.filter((c) => c.a_total != null && c.b_total != null).map((c) => ({ me: c.judge_public_id === me, m: (c.a_total as number) - (c.b_total as number), judge: c.judge }));
        const scale = Math.max(6, ...margins.map((x) => Math.abs(x.m)));
        const mine = margins.find((x) => x.me);
        return (
          <Link key={b.public_id} href={`/scorecards/${refOf(b.public_id)}`} className="pv">
            <div className="pv__who">
              <span style={{ color: "var(--paper)", fontWeight: 600 }}>{surname(b.a?.name ?? "")} vs {surname(b.b?.name ?? "")}</span>
              <small>{fmtDate(b.event.date)} · {shortResult(b.result, b.scheduled_rounds) ?? "no result"} · this card {mine ? (mine.m === 0 ? "even" : `${Math.abs(mine.m)} to ${surname((mine.m > 0 ? b.a?.name : b.b?.name) ?? "")}`) : "—"}</small>
            </div>
            <div className="pv__axis">
              {margins.map((x, i) => <span key={i} className={`pv__dot${x.me ? " pv__dot--me" : ""}`} style={{ left: `${50 - (x.m / scale) * 46}%` }} title={`${x.judge}: ${x.m}`} />)}
            </div>
          </Link>
        );
      })}
      <p className="fine mt-2">Each row is one bout. Gold is this judge&apos;s card; grey dots are the other judges on the same panel. Left of centre leans to the first-named boxer, right to the second.</p>
    </div>
  );
}

export default async function OfficialPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This official" />; }
  const d = res.data;
  if (d.redirect_public_id) permanentRedirect(`/officials/${d.redirect_public_id.slice(-32).slice(0, 12)}`);
  const o = d.official;
  const isJudge = (d.roles.judge ?? 0) > 0;
  const isRef = (d.roles.referee ?? 0) > 0;
  const dna = new Map(d.dna.map((m) => [m.key, m]));
  const refStops = d.refereed.filter((b) => ["KO", "TKO", "RTD"].includes(b.result?.method ?? "")).length;
  const refDecisions = d.refereed.filter((b) => b.result?.method === "DECISION").length;
  const refOther = d.refereed.length - refStops - refDecisions;
  return (
    <div className="wrap page">
      <Crumbs items={[{ label: "Officials", href: isRef && !isJudge ? "/officials?role=referee" : "/officials" }, { label: o.name }]} />
      <header className="page-hero">
        <div className="eyebrow">{[isJudge ? `Judge · ${plural(d.roles.judge, "assignment")}` : null, isRef ? `Referee · ${plural(d.roles.referee, "bout")}` : null].filter(Boolean).join(" · ")}</div>
        <h1>{o.name}</h1>
        <p>{d.jurisdictions.map((j) => `${j.name} (${j.assignments})`).join(" · ")}. Descriptive record from official commission documents. No labels: each number shows its sample.</p>
      </header>

      {isJudge ? (
        <section>
          <SecHead kicker="Judge DNA · PropBetEdge-derived" title="How this judge scores relative to the panel" />
          <div className="tiles">{JUDGE.slice(0, 4).map(([k, l]) => <MetricTile key={k} m={dna.get(k)} label={l} />)}</div>
          <div className="tiles mt-1">{JUDGE.slice(4, 8).map(([k, l]) => <MetricTile key={k} m={dna.get(k)} label={l} />)}</div>
          <div className="band" style={{ paddingBlock: 32 }}>
            <SecHead kicker="Published cards · this judge vs the rest of the panel" title="Card by Card" />
            <PanelRows list={d.judged} me={o.public_id} />
          </div>
        </section>
      ) : null}

      {isRef ? (
        <section className={isJudge ? "mt-4" : ""}>
          <SecHead kicker="Referee DNA · PropBetEdge-derived" title="How the bouts ended" />
          <div className="tiles">{REF.slice(0, 4).map(([k, l]) => <MetricTile key={k} m={dna.get(k)} label={l} />)}</div>
          <div className="tiles mt-1">{REF.slice(4, 8).map(([k, l]) => <MetricTile key={k} m={dna.get(k)} label={l} />)}</div>
          {d.refereed.length ? (
            <div className="mt-3 panel panel--pad">
              <div className="eyebrow">Result mix · {plural(d.refereed.length, "bout")} on record</div>
              <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", marginTop: 12, background: "rgba(255,245,220,.07)" }}>
                <span style={{ flexGrow: refStops, background: "var(--gold)" }} />
                <span style={{ flexGrow: refDecisions, background: "rgba(255,245,220,.45)" }} />
                <span style={{ flexGrow: refOther, background: "var(--subtle)" }} />
              </div>
              <p className="mono dim mt-1" style={{ fontSize: 12.5 }}><span className="gold">{refStops} KO/TKO/RTD</span> · {refDecisions} decisions · {refOther} other or not recorded</p>
            </div>
          ) : null}
          <div className="band" style={{ paddingBlock: 32 }}>
            <SecHead kicker="Most recent first" title="Recent Assignments" />
            <div className="blist">{d.refereed.slice(0, 20).map((b) => (
              <Link key={b.public_id} href={boutPath(b)} className="bline">
                <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }} className="truncate">{b.a?.name} vs {b.b?.name}</span><span className="bline__meta">{fmtDate(b.event.date)} · {b.event.name}</span></span>
                <span className="bline__res"><span className="bline__method">{shortResult(b.result, b.scheduled_rounds) ?? "Result not recorded"}</span>{b.deductions ? <span className="tag tag--pending">{plural(b.deductions, "point")} deducted</span> : null}</span>
              </Link>
            ))}</div>
          </div>
        </section>
      ) : null}
      <p className="fine">Metrics are computed from stored official records with their sample sizes. They describe past assignments only and imply nothing about any official&apos;s conduct.</p>
    </div>
  );
}
