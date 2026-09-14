import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { Note, SecHead, Unavailable } from "@/components/fight";

export const revalidate = 1800;
export const metadata: Metadata = { title: "Boxing History", description: "Professional boxing decade by decade, from what is on record: verified cards and bouts, Hall of Fame classes and title reigns as coverage expands." };

export default async function HistoryPage() {
  const res = await gateway.eras();
  if (!res.ok) {
    return res.reason === "not_found" || res.reason === "not_configured"
      ? <div className="wrap page"><header className="page-hero"><div className="eyebrow">History</div><h1>Boxing History</h1></header><Note title="Historical coverage is being loaded" /></div>
      : <Unavailable what="Boxing history" />;
  }
  const d = res.data;
  const max = Math.max(1, ...d.decades.map((x) => Math.max(x.verified_bouts, x.hall_inductions)));
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">History · decade first · coverage expanding</div>
        <h1>How the sport <em>got here.</em></h1>
        <p>Boxing history built as a graph, not copied prose: decades are objective, every count is a record we hold, and eras are never drawn by opinion. Verified fight records currently run {d.record_span.first_date ? `${fmtDate(d.record_span.first_date)} to ${fmtDate(d.record_span.last_date!)}` : "from the covered commissions"}; Hall of Fame classes reach back further.</p>
      </header>

      <div className="tiles">
        {d.hall_categories.slice(0, 1).length ? <div className="tile"><b className="gold">{d.hall_classes.reduce((n, c) => n + c.n, 0)}</b><span>Hall of Fame inductions</span><small>{plural(d.hall_classes.length, "class", "classes")}</small></div> : null}
        <div className="tile"><b>{d.decades.reduce((n, x) => n + x.verified_bouts, 0)}</b><span>Verified bouts on record</span></div>
        <div className="tile"><b>{d.venues_on_record}</b><span>Venues on record</span></div>
        <div className="tile"><b className={d.title_reigns ? "" : "is-na"}>{d.title_reigns || "Pending"}</b><span>Title reigns on record</span><small>{d.title_reigns ? "" : "sanctioning-body sources under review"}</small></div>
      </div>

      <section className="mt-4">
        <SecHead kicker="Objective periods · what is on record per decade" title="Decades" />
        <div className="decades">
          {d.decades.map((x) => (
            <div className="decade" key={x.decade}>
              <div className="decade__name">{x.decade}s</div>
              <div className="decade__bars">
                <div className="decade__bar"><i style={{ width: `${Math.round((x.verified_bouts / max) * 100)}%` }} /><span>{plural(x.verified_bouts, "verified bout")}</span></div>
                <div className="decade__bar decade__bar--gold"><i style={{ width: `${Math.round((x.hall_inductions / max) * 100)}%` }} /><span>{x.hall_inductions ? <Link href={`/hall-of-fame`} className="link-gold">{plural(x.hall_inductions, "Hall of Fame induction")}</Link> : "No Hall class this decade"}</span></div>
              </div>
              <div className="decade__meta">{x.verified_events ? plural(x.verified_events, "card") : ""}{x.title_reigns_started ? ` · ${plural(x.title_reigns_started, "title reign")}` : ""}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="split">
          <div>
            <SecHead kicker="Institutions' own categories" title="Who the Halls honor" action={<Link className="link-gold" href="/hall-of-fame">Hall of Fame →</Link>} />
            <div className="blist">{d.hall_categories.map((c) => <Link key={c.label} href={`/hall-of-fame?category=${encodeURIComponent(c.label)}`} className="bline"><span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{c.label}</span></span><span className="bline__res"><span className="bline__method">{c.n}</span></span></Link>)}</div>
          </div>
          <div>
            <SecHead kicker="What comes next" title="Coverage Expanding" />
            <Note title="Built from sources, one layer at a time">Title lineage (by sanctioning body, with forks where bodies recognized different champions), historic cards, venues and public-domain historical media join this page as each source is cleared. Nothing is written from memory, and no era is labeled without a documented rule.</Note>
          </div>
        </div>
      </section>
    </div>
  );
}
