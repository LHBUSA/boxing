import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { Note, Unavailable } from "@/components/fight";
import { needText } from "@/lib/dna";
import type { OfficialMetric, OfficialRow } from "@/lib/types";


function val(m: OfficialMetric | undefined) {
  if (!m || m.status !== "available" || m.value == null) return null;
  if (m.unit === "ratio") return `${Math.round(m.value * 100)}%`;
  if (m.unit === "points") return m.value.toFixed(1);
  if (m.unit === "round") return `R${m.value.toFixed(1)}`;
  return String(Math.round(m.value * 100) / 100);
}

export async function OfficialsBoard({ role, q, base }: { role: "judge" | "referee"; q: string; base: string }) {
  const res = await gateway.officials(role, { q: q.length >= 2 ? q : null, limit: 120 });
  if (!res.ok) return <Unavailable what="Officials" />;
  const d = res.data;
  const officialHref = (id: string) => `/officials/${id.slice(-32).slice(0, 12)}`;
  const hasSample = (o: OfficialRow) => (role === "judge" ? o.cards > 0 : o.metrics.some((m) => (m.sample_size ?? 0) > 0));
  const measured = d.rows.filter(hasSample).sort((x, y) => (role === "judge" ? y.cards - x.cards : 0) || y.assignments - x.assignments);
  const unmeasured = d.rows.filter((o) => !hasSample(o));
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
        <div className="seg"><Link className={role === "judge" ? "is-on" : ""} href="/judges">Judges</Link><Link className={role === "referee" ? "is-on" : ""} href="/referees">Referees</Link></div>
      </div>
      <form className="search" action={base} method="get" role="search">
        <label htmlFor="q" className="sr-only">Search officials</label>
        <input id="q" name="q" defaultValue={q} placeholder={`Search ${role}s by name`} minLength={2} maxLength={60} />
        <button className="btn btn--gold" type="submit">Search</button>
      </form>
      {!d.rows.length ? <Note title="No official matches that name" /> : null}
      {measured.length ? (
        <div className="blist">
          {measured.map((o) => (
            <Link key={o.public_id} href={officialHref(o.public_id)} className="orow">
              <div>
                <div className="orow__name">{o.name}</div>
                <div className="orow__meta">{role === "judge" ? `${plural(o.cards, "published card")} · ${plural(o.assignments, "assignment")}` : plural(o.assignments, "bout")}{o.last_date ? ` · last ${fmtDate(o.last_date)}` : ""}</div>
              </div>
              <div className="orow__metrics">
                {cols.map(([k, l]) => {
                  const m = o.metrics.find((x) => x.key === k);
                  const v = val(m);
                  const need = m ? needText(m.minimum_sample) : null;
                  return <div className="orow__m" key={k}><b className={v ? "" : "is-na"}>{v ?? (m?.sample_size ? `${m.sample_size}${need ? ` of ${need}` : ""}` : "—")}</b><span>{v ? l : `${l} · sample`}</span></div>;
                })}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
      {unmeasured.length ? (
        <section className="mt-4">
          <div className="eyebrow eyebrow--dim">{role === "judge" ? "Assigned · no published cards yet" : "Assigned · no recorded results yet"}</div>
          <p className="fine mt-1">{role === "judge" ? "These judges appear on official assignments, but the commission documents covered so far do not publish their cards." : "These referees appear on official assignments without a recorded result yet."}</p>
          <div className="ogrid mt-2">
            {unmeasured.map((o) => (
              <Link key={o.public_id} href={officialHref(o.public_id)} className="ogrid__i">
                <span>{o.name}</span>
                <small>{plural(o.assignments, role === "judge" ? "assignment" : "bout")}{o.last_date ? ` · ${fmtDate(o.last_date)}` : ""}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <p className="fine mt-2">A value appears once the metric&apos;s minimum sample is met; below it the sample collected so far is shown against the minimum. Metrics are PropBetEdge-derived from official commission records.</p>
    </div>
  );
}
