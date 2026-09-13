import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, fmtRecord, plural } from "@/lib/format";
import { fighterPath } from "@/lib/slug";
import { Eyebrow, StateNote, Unavailable } from "@/components/ui";
import { HistoryChip } from "@/components/boxing";
import { Portrait } from "@/components/Portrait";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Boxers on verified record",
  description: "Boxer directory built from official athletic commission results: verified records, latest bouts and divisions.",
};

const PAGE = 48;
const COMM: Record<string, string> = { nsac: "NV", "fl-athletic-commission": "FL", "nj-sacb": "NJ" };

export default async function FightersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const res = await gateway.fighters({ q: q.length >= 2 ? q : null, limit: PAGE, offset: (page - 1) * PAGE });
  if (!res.ok) return <Unavailable what="The fighter directory" />;
  const d = res.data;
  const pages = Math.max(1, Math.ceil(d.total / PAGE));
  const link = (p: number) => `/fighters?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`;

  return (
    <div className="wrap page-pad">
      <Eyebrow>Verified by official commission results</Eyebrow>
      <h1 className="page-title">Fighters</h1>
      <p className="page-lede">
        {plural(d.total, "boxer")} {q ? `match “${q}”` : "on verified record"}. Records here count only bouts on PropBetEdge record from covered commissions. They are not full career records.
      </p>
      <form className="search" action="/fighters" method="get" role="search">
        <label htmlFor="q" className="sr-only">Search boxers by name</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search by name" minLength={2} maxLength={60} autoComplete="off" />
        <button className="btn btn--primary" type="submit">Search</button>
        {q ? <Link className="btn" href="/fighters">Clear</Link> : null}
      </form>

      {!d.rows.length ? (
        <StateNote kind="neutral" title="No boxer on verified record matches that name">
          Boxers appear after at least one bout from a covered commission is verified. Spelling on official sheets can differ.
        </StateNote>
      ) : (
        <div className="roster" role="table" aria-label="Boxers">
          <div className="roster__row roster__row--head" role="row">
            <span role="columnheader">Boxer</span>
            <span role="columnheader">Verified record</span>
            <span role="columnheader">Last verified bout</span>
            <span role="columnheader">Division</span>
            <span role="columnheader">Commissions</span>
          </div>
          {d.rows.map((f) => (
            <Link key={f.public_id} href={fighterPath(f)} className="roster__row" role="row">
              <span role="cell" className="roster__who">
                <Portrait name={f.name} id={f.public_id} size={36} />
                <span>
                  <span className="roster__name">{f.name}</span>
                  <HistoryChip bouts={f.record.bouts} />
                </span>
              </span>
              <span role="cell" className="roster__rec"><strong>{fmtRecord(f.record)}</strong> <span className="muted">{plural(f.record.bouts, "bout")}</span></span>
              <span role="cell">{f.last_date ? fmtDate(f.last_date) : <span className="muted">—</span>}</span>
              <span role="cell">{f.division?.class_name ?? <span className="muted">Not on sheet</span>}</span>
              <span role="cell" className="roster__comm">{f.commissions.map((c) => <span key={c} className="tag">{COMM[c] ?? c}</span>)}</span>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn" href={link(page - 1)}>← Previous</Link> : <span />}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn" href={link(page + 1)}>Next →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
