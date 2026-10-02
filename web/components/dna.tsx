// Fight DNA V2 modules: every family of the versioned metric catalogue, each value with its sample, its as-of cutoff
// and its definition version. A value renders only when the engine marked it "available"; everything else shows the
// state (building, with the minimum it needs), never a zero. Punch statistics have no approved source: one line says so.

import type { DnaMetric } from "@/lib/types";
import { FAMILIES, metricView, type MetricView } from "@/lib/dna";
import { fmtDate } from "@/lib/format";
import type { Comparison } from "@/lib/edges";

const OPPOSITION = { key: "opposition", title: "Opposition", blurb: "Opponents' verified records entering each bout (pbe_opponent_quality@1). Never rankings, never later results.", metrics: ["opposition.opponent_quality_index", "finishing.opponent_adjusted_stoppage_win_rate", "durability.opponent_adjusted_stoppage_loss_rate"] };
const EXTRA_LABELS: Record<string, string> = {
  "opposition.opponent_quality_index": "Opponent quality index (0–1)",
  "finishing.opponent_adjusted_stoppage_win_rate": "Stoppage win rate, opponent-adjusted",
  "durability.opponent_adjusted_stoppage_loss_rate": "Stoppage loss rate, opponent-adjusted",
};
const MODULES = [...FAMILIES, OPPOSITION];

function Row({ v, m }: { v: MetricView; m: DnaMetric | undefined }) {
  const label = EXTRA_LABELS[v.key] ?? v.label;
  const pct = v.state === "available" && v.raw != null && v.value?.endsWith("%") ? Math.min(100, Math.max(3, v.raw * 100)) : null;
  return (
    <li className={`dnam__row dnam__row--${v.state}`}>
      <span className="dnam__label">{label}</span>
      {v.state === "available" ? (
        <span className="dnam__val"><b>{v.value}</b>{pct != null ? <span className="dnabar__track"><i style={{ width: `${pct}%` }} /></span> : null}<small>{v.sample ?? ""}</small></span>
      ) : (
        <span className="dnam__state">{v.state === "building" ? `Building · ${v.sample}` : v.state === "licensed_only" ? "No approved source" : v.state === "not_applicable" ? "Not applicable" : "Not computed"}</span>
      )}
      {m ? <span className="dnam__ver" title={`Definition ${m.key}@${m.version}`}>v{m.version}</span> : null}
    </li>
  );
}

export function DnaModules({ metrics, name }: { metrics: DnaMetric[]; name: string }) {
  if (!metrics.length) {
    return <p className="fine">Fight DNA is computed from verified professional bouts. None has been processed for {name} yet; nothing is estimated before then.</p>;
  }
  const asOf = metrics.map((m) => m.as_of).filter(Boolean).sort().at(-1) ?? null;
  const available = MODULES.flatMap((f) => f.metrics).filter((k) => metricView(k, metrics).state === "available").length;
  return (
    <div className="dnam">
      <div className="dnam__meta fine">
        <span>{available} metric{available === 1 ? "" : "s"} with enough verified bouts</span>
        {asOf ? <span>As of {fmtDate(asOf.slice(0, 10))} (bouts before this date only)</span> : null}
        <span>Engine definitions are versioned; a value never changes under the same version.</span>
      </div>
      <div className="dnam__grid">
        {MODULES.map((f) => (
          <section className="dnam__mod" key={f.key} aria-label={f.title}>
            <header><b>{f.title}</b><span className="fine">{f.blurb}</span></header>
            <ul>{f.metrics.map((k) => <Row key={k} v={metricView(k, metrics)} m={metrics.find((x) => x.key === k)} />)}</ul>
          </section>
        ))}
      </div>
      <p className="dnam__punch"><span className="tag tag--pending">Punch statistics unavailable</span> <span className="fine">No approved punch-stat or knockdown source is connected, so output, accuracy and knockdown metrics are not shown. They are never estimated.</span></p>
    </div>
  );
}

// Matchup comparisons (lib/edges.ts, pbe_matchup_compare@1): one descriptive line per dimension, never a probability
export function MatchupComparisons({ rows, aName, bName }: { rows: Comparison[]; aName: string; bName: string }) {
  const label = (o: Comparison["outcome"]) => (o === "a" ? aName : o === "b" ? bName : o === "even" ? "No clear edge" : "Insufficient sample");
  return (
    <div className="mcmp">
      {rows.map((r) => (
        <div className={`mcmp__row mcmp__row--${r.outcome}`} key={r.key}>
          <span className="mcmp__dim">{r.title}</span>
          <b className="mcmp__out">{label(r.outcome)}</b>
          <span className="fine mcmp__basis">{r.outcome === "a" || r.outcome === "b" ? r.basis.replace(/: A /, `: ${aName} `).replace(/: B /, `: ${bName} `) : r.basis}</span>
        </div>
      ))}
      <p className="fine">Each line compares one measure of the two verified records, using only values with enough verified bouts. They describe the records; they are not a prediction, a pick or a betting edge.</p>
    </div>
  );
}
