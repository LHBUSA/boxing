import { familyViews, LICENSED_NOTE, OPPOSITION_NOTE, type MetricView } from "@/lib/dna";
import { fmtDate } from "@/lib/format";
import { Chip, StateNote } from "./ui";
import type { DnaMetric } from "@/lib/types";

function Cell({ v }: { v: MetricView }) {
  if (v.state === "available") {
    return (
      <span className="dna__cell">
        <span className="dna__val">{v.value}</span>
        {v.sample ? <span className="dna__n">{v.sample}</span> : null}
      </span>
    );
  }
  if (v.state === "building") return <span className="dna__cell dna__cell--state" title="Not enough verified bouts yet">Building <span className="dna__n">{v.sample}</span></span>;
  if (v.state === "not_applicable") return <span className="dna__cell dna__cell--state">Not applicable</span>;
  return <span className="dna__cell dna__cell--state">—</span>;
}

export function DnaPanel({ sides, asOf, context }: { sides: { name: string; dna: DnaMetric[] }[]; asOf: string | null; context?: string }) {
  const hasAny = sides.some((s) => s.dna.length);
  if (!hasAny) {
    return (
      <StateNote kind="building" title="Fight DNA building">
        Fight DNA is computed from verified bouts. It appears here once this boxer&apos;s verified history has been processed.
      </StateNote>
    );
  }
  const views = sides.map((s) => familyViews(s.dna));
  const two = sides.length === 2;
  return (
    <div className={`dna${two ? " dna--two" : ""}`}>
      <div className="dna__legend">
        <Chip kind="derived">PropBetEdge-derived</Chip>
        {asOf ? <span className="muted">Current profile as of {fmtDate(asOf.slice(0, 10))}</span> : null}
        {context ? <span className="muted">{context}</span> : null}
      </div>
      {views[0].map((fam, fi) => {
        const rows = fam.rows.map((row, ri) => ({ label: row.label, cells: views.map((v) => v[fi].rows[ri]) }));
        const visible = rows.filter((r) => r.cells.some((c) => c.state === "available" || c.state === "building"));
        if (!visible.length) return null;
        const allBuilding = visible.every((r) => r.cells.every((c) => c.state !== "available"));
        return (
          <section className="dna__fam" key={fam.key}>
            <header className="dna__famhead">
              <h4>{fam.title}</h4>
              <p>{fam.blurb}</p>
            </header>
            {allBuilding ? (
              <p className="dna__building">Building: every metric here needs more verified bouts ({visible[0].cells.find((c) => c.sample)?.sample ?? "sample building"}).</p>
            ) : (
              <div className="dna__table" role="table">
                {two ? (
                  <div className="dna__row dna__row--head" role="row">
                    <span role="columnheader">Metric</span>
                    {sides.map((s) => <span role="columnheader" key={s.name} className="dna__who">{s.name}</span>)}
                  </div>
                ) : null}
                {visible.map((r) => (
                  <div className="dna__row" role="row" key={r.label}>
                    <span role="rowheader" className="dna__label">{r.label}</span>
                    {r.cells.map((c, i) => <span role="cell" key={i}><Cell v={c} /></span>)}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <ul className="dna__notes">
        <li>{LICENSED_NOTE}</li>
        <li>{OPPOSITION_NOTE}</li>
        <li>Finishing and result metrics describe how verified bouts ended. They are not a measure of punching power.</li>
      </ul>
    </div>
  );
}
