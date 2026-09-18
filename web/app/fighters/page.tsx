import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, fmtRecord, plural } from "@/lib/format";
import { fighterPath } from "@/lib/slug";
import { FighterArt } from "@/components/FighterArt";
import { Note, Unavailable } from "@/components/fight";

export const revalidate = 300;
export const metadata: Metadata = { title: "Fighters", description: "Boxer dossiers built from official athletic commission results: verified records, recent bouts and Fight DNA." };

const PAGE = 48;
const COMM: Record<string, string> = { nsac: "Nevada", "fl-athletic-commission": "Florida", "nj-sacb": "New Jersey" };

export default async function FightersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const res = await gateway.fighters({ q: q.length >= 2 ? q : null, limit: PAGE, offset: (page - 1) * PAGE });
  if (!res.ok) return <Unavailable what="Fighters" />;
  const d = res.data;
  const pages = Math.max(1, Math.ceil(d.total / PAGE));
  const link = (p: number) => `/fighters?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`;
  const top = page === 1 && !q ? d.rows.slice(0, 6) : [];
  const rest = page === 1 && !q ? d.rows.slice(6) : d.rows;
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Dossiers from official results</div>
        <h1>Fighters</h1>
        <p>{plural(d.total, "boxer")} {q ? `match “${q}”` : "with verified bouts"}. A verified record counts only bouts on the official commission record we cover; it is not a full career record.</p>
      </header>
      <form className="search" action="/fighters" method="get" role="search">
        <label htmlFor="q" className="sr-only">Search boxers</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search a boxer by name" minLength={2} maxLength={60} autoComplete="off" />
        <button className="btn btn--gold" type="submit">Search</button>
        {q ? <Link className="btn" href="/fighters">Clear</Link> : null}
      </form>
      {!d.rows.length ? <Note title="No boxer on record matches that name">Names follow the official sheets, which often use full legal names.</Note> : null}
      {top.length ? (
        <>
          <div className="tier"><h3>Most verified bouts</h3></div>
          <div className="mgrid mgrid--3">
            {top.map((f) => (
              <Link key={f.public_id} href={fighterPath(f)} className="mcard mcard--roster">
                <FighterArt name={f.name} id={f.public_id} portrait={f.portrait} corner={null} side="a" variant="square" credit={false} />
                <div className="mcard__body">
                  <span className="mcard__n">{f.name}</span>
                  <span className="roster__rec mono">{fmtRecord(f.record)}</span>
                  <span className="mcard__meta"><span>{plural(f.record.bouts, "verified bout")}</span><span>{f.division?.class_name ?? ""}</span></span>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
      {rest.length ? (
        <>
          <div className="tier"><h3>{q ? "Results" : "All boxers"}</h3></div>
          {/* phones get fighter rows; the six-column table would have to scroll sideways to be read */}
          <div className="roster-list only-narrow">
            {rest.map((f) => (
              <Link key={f.public_id} href={fighterPath(f)} className="rrow">
                <span className="namecell__art"><FighterArt name={f.name} id={f.public_id} portrait={f.portrait} variant="thumb" corner={null} credit={false} /></span>
                <span>
                  <span className="rrow__n">{f.name}</span>
                  <span className="rrow__m">
                    <span>{plural(f.record.bouts, "bout")}</span>
                    {f.division?.class_name ? <span>{f.division.class_name}</span> : null}
                    {f.last_date ? <span>{fmtDate(f.last_date)}</span> : null}
                  </span>
                </span>
                <span className="rrow__r">{fmtRecord(f.record)}</span>
              </Link>
            ))}
          </div>
          <div className="tbl-wrap only-wide">
            <table className="tbl">
              <thead><tr><th>Boxer</th><th>Verified record</th><th className="r">Bouts</th><th>Last bout</th><th>Division</th><th>Commissions</th></tr></thead>
              <tbody>
                {rest.map((f) => (
                  <tr key={f.public_id}>
                    <td><Link href={fighterPath(f)} className="namecell"><span className="namecell__art"><FighterArt name={f.name} id={f.public_id} portrait={f.portrait} variant="thumb" corner={null} credit={false} /></span>{f.name}</Link></td>
                    <td className="mono">{fmtRecord(f.record)}</td>
                    <td className="r mono">{f.record.bouts}</td>
                    <td className="mono dim">{f.last_date ? fmtDate(f.last_date) : "—"}</td>
                    <td className="dim">{f.division?.class_name ?? "—"}</td>
                    <td className="dim">{f.commissions.map((c) => COMM[c] ?? c).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {pages > 1 ? (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn btn--sm" href={link(page - 1)}>← Previous</Link> : <span />}
          <span className="fine">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn btn--sm" href={link(page + 1)}>Next →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
