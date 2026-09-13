import type { Metadata } from "next";
import Link from "next/link";
import { gateway, todayUtc } from "@/lib/gateway";
import { groupByWeek } from "@/lib/weekend";
import { cityLine, fmtDate, fmtRange, plural } from "@/lib/format";
import { eventPath } from "@/lib/slug";
import { CardTile, MatchupCard, Note, Unavailable } from "@/components/fight";
import type { BoutCompact } from "@/lib/types";

export const revalidate = 300;
export const metadata: Metadata = { title: "Boxing schedule and results", description: "Every boxing card on the official commission record, grouped by fight weekend: upcoming cards and official results." };

const PAGE = 24;

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ scope?: string; commission?: string; page?: string }> }) {
  const sp = await searchParams;
  const scope = sp.scope === "results" ? "results" : "upcoming";
  const commission = sp.commission && /^[a-z0-9-]{2,40}$/.test(sp.commission) ? sp.commission : null;
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const res = await gateway.events(scope, { commission, limit: PAGE, offset: (page - 1) * PAGE });
  if (!res.ok) return <Unavailable what="The schedule" />;
  const d = res.data;
  const today = todayUtc();
  const weeks = groupByWeek(d.rows);
  if (scope === "results") weeks.reverse();
  const href = (p: { scope?: string; commission?: string | null; page?: number }) => {
    const s = new URLSearchParams();
    const sc = p.scope ?? scope;
    const cm = p.commission === undefined ? commission : p.commission;
    if (sc === "results") s.set("scope", "results");
    if (cm) s.set("commission", cm);
    if (p.page && p.page > 1) s.set("page", String(p.page));
    const q = s.toString();
    return `/events${q ? `?${q}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(d.total / PAGE));
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Weekend → promoters → cards → bouts</div>
        <h1>{scope === "results" ? "Results" : "Schedule"}</h1>
        <p>Boxing runs many cards at once across promoters and commissions. Every card here comes from an athletic commission record, grouped by fight weekend.</p>
      </header>
      <div className="filters">
        <div className="seg"><Link className={scope === "upcoming" ? "is-on" : ""} href={href({ scope: "upcoming", page: 1 })}>Upcoming</Link><Link className={scope === "results" ? "is-on" : ""} href={href({ scope: "results", page: 1 })}>Results</Link></div>
        <div className="scroll-x">
          <Link className={`pill${!commission ? " is-on" : ""}`} href={href({ commission: null, page: 1 })}>All commissions</Link>
          {d.commissions.map((c) => <Link key={c.slug} className={`pill${commission === c.slug ? " is-on" : ""}`} href={href({ commission: c.slug, page: 1 })}>{c.name.replace(/ State Athletic (Commission|Control Board)| Athletic Commission/, "")} · {c.events}</Link>)}
        </div>
      </div>
      {!d.rows.length ? <Note title="No card for this filter" /> : weeks.map((w) => (
        <section key={w.start} className="mt-4">
          <div className="tier"><h3>{fmtRange(w.first, w.last)}</h3><span>{plural(w.events.length, "card")}</span></div>
          {scope === "upcoming" ? (
            <div className="nextcards">{w.events.map((e) => <CardTile key={e.public_id} e={e} today={today} />)}</div>
          ) : (
            <div className="mgrid mgrid--3">
              {w.events.map((e) => e.headline?.a && e.headline?.b ? (
                <div key={e.public_id} style={{ display: "grid", gap: 8 }}>
                  <Link href={eventPath(e)} className="eyebrow eyebrow--dim truncate">{fmtDate(e.date, { year: false })} · {e.name}</Link>
                  <MatchupCard bout={e.headline as BoutCompact} event={e} />
                  <span className="fine">{plural(e.bout_count, "verified bout")}{cityLine(e.venue) ? ` · ${cityLine(e.venue)}` : ""} · <Link className="gold" href={eventPath(e)}>Full card →</Link></span>
                </div>
              ) : (
                <Link key={e.public_id} href={eventPath(e)} className="ncard"><div className="ncard__name">{e.name}</div><div className="ncard__meta">{fmtDate(e.date)} · no verified bout yet</div></Link>
              ))}
            </div>
          )}
        </section>
      ))}
      {pages > 1 ? (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn btn--sm" href={href({ page: page - 1 })}>← Previous</Link> : <span />}
          <span className="fine">Page {page} of {pages} · {plural(d.total, "card")}</span>
          {page < pages ? <Link className="btn btn--sm" href={href({ page: page + 1 })}>Next →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
