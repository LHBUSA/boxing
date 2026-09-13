import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { Note, Unavailable } from "@/components/fight";
import type { OfficialMetric } from "@/lib/types";

export const revalidate = 900;
export const metadata: Metadata = { title: "Officials: Judge DNA and Referee DNA", description: "Every judge and referee on the official commission record: assignments, published cards and descriptive metrics with their samples." };

function val(m: OfficialMetric | undefined) {
  if (!m || m.status !== "available" || m.value == null) return null;
  if (m.unit === "ratio") return `${Math.round(m.value * 100)}%`;
  if (m.unit === "points") return m.value.toFixed(1);
  if (m.unit === "round") return `R${m.value.toFixed(1)}`;
  return String(Math.round(m.value * 100) / 100);
}

export default async function OfficialsPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const sp = await searchParams;
  const role = sp.role === "referee" ? "referee" : "judge";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const res = await gateway.officials(role, { q: q.length >= 2 ? q : null, limit: 120 });
  if (!res.ok) return <Unavailable what="Officials" />;
  const d = res.data;
  const cols = role === "judge"
    ? [["judge.avg_card_margin", "Avg margin"], ["judge.panel_disagreement_rate", "Different winner"]]
    : [["referee.stoppage_rate", "Stoppage rate"], ["referee.avg_stoppage_round", "Avg stop round"]];
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Officials intelligence · descriptive, always with samples</div>
        <h1>{role === "judge" ? "Judge DNA" : "Referee DNA"}</h1>
        <p>{role === "judge" ? `${plural(d.universe, "judge")} on the official record. How each has scored relative to the rest of the panel, from published cards.` : `${plural(d.universe, "referee")} on the official record. How the bouts they worked ended, from official results.`} No labels, no accusations: the numbers and their sample sizes.</p>
      </header>
      <div className="filters">
        <div className="seg"><Link className={role === "judge" ? "is-on" : ""} href="/officials">Judges</Link><Link className={role === "referee" ? "is-on" : ""} href="/officials?role=referee">Referees</Link></div>
      </div>
      <form className="search" action="/officials" method="get" role="search">
        {role === "referee" ? <input type="hidden" name="role" value="referee" /> : null}
        <label htmlFor="q" className="sr-only">Search officials</label>
        <input id="q" name="q" defaultValue={q} placeholder={`Search ${role}s by name`} minLength={2} maxLength={60} />
        <button className="btn btn--gold" type="submit">Search</button>
      </form>
      {!d.rows.length ? <Note title="No official matches that name" /> : null}
      <div className="blist">
        {d.rows.map((o) => (
          <Link key={o.public_id} href={`/officials/${o.public_id.slice(-32).slice(0, 12)}`} className="orow">
            <div>
              <div className="orow__name">{o.name}</div>
              <div className="orow__meta">{role === "judge" ? `${plural(o.assignments, "assignment")} · ${plural(o.cards, "published card")}` : plural(o.assignments, "bout")}{o.last_date ? ` · last ${fmtDate(o.last_date)}` : ""}</div>
            </div>
            <div className="orow__metrics">
              {cols.map(([k, l]) => {
                const m = o.metrics.find((x) => x.key === k);
                const v = val(m);
                return <div className="orow__m" key={k}><b className={v ? "" : "is-na"}>{v ?? `n=${m?.sample_size ?? 0}`}</b><span>{l}</span></div>;
              })}
            </div>
          </Link>
        ))}
      </div>
      <p className="fine mt-2">A value appears once the metric&apos;s minimum sample is met; below it the sample size is shown. Metrics are PropBetEdge-derived from official commission records.</p>
    </div>
  );
}
