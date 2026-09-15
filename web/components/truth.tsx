// Investigator building blocks: a source chip for every lane, compact tables that scroll sideways on phones.

import type { ReactNode } from "react";
import type { TruthSource } from "@/lib/types-truth";

export function Src({ s }: { s: TruthSource | null | undefined }) {
  if (!s) return <span className="tag tag--pending">no source</span>;
  const host = s.url && /^https?:/.test(s.url) ? new URL(s.url).host : null;
  return (
    <span className="truth-src">
      <span className="tag">{s.source_key ?? "?"}</span>
      {host ? <a className="fine" href={s.url!} target="_blank" rel="noopener noreferrer">{host} ↗</a> : s.url ? <span className="fine">{s.url}</span> : null}
      {s.observation ? <span className="fine" title="source observation">obs {s.observation}</span> : <span className="fine dim">no observation</span>}
    </span>
  );
}

export function Lane({ title, count, children, empty }: { title: string; count?: number; children: ReactNode; empty?: string }) {
  return (
    <section className="truth-lane">
      <h3>{title}{count != null ? <span className="fine"> · {count}</span> : null}</h3>
      {count === 0 ? <p className="fine">{empty ?? "Nothing stored for this lane."}</p> : children}
    </section>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl truth-tbl">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export const state = (o: Record<string, unknown> | null | undefined) =>
  o ? Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ") : "—";

export const when = (t: string | null | undefined) => (t ? t.replace("T", " ").slice(0, 16) : "—");
