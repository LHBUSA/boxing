import type { Metadata } from "next";
import Link from "next/link";
import { gateway, todayUtc } from "@/lib/gateway";
import { groupByWeek } from "@/lib/weekend";
import { fmtRange, plural } from "@/lib/format";
import { Eyebrow, SectionHead, StateNote, Unavailable } from "@/components/ui";
import { EventLine } from "@/components/boxing";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Boxing events: schedule and results",
  description: "Every boxing card on verified record, grouped by fight weekend: upcoming cards listed by athletic commissions and official results.",
};

const PAGE = 30;

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ scope?: string; commission?: string; page?: string }> }) {
  const sp = await searchParams;
  const scope = sp.scope === "results" ? "results" : "upcoming";
  const commission = sp.commission && /^[a-z0-9-]{2,40}$/.test(sp.commission) ? sp.commission : null;
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const res = await gateway.events(scope, { commission, limit: PAGE, offset: (page - 1) * PAGE });
  if (!res.ok) return <Unavailable what="The event directory" />;
  const d = res.data;
  const today = todayUtc();
  const weeks = groupByWeek(d.rows);
  if (scope === "results") weeks.reverse();
  const href = (p: Record<string, string | number | null>) => {
    const s = new URLSearchParams();
    const merged = { scope, commission, page: null as number | null, ...p };
    for (const [k, v] of Object.entries(merged)) if (v !== null && v !== undefined && !(k === "scope" && v === "upcoming") && !(k === "page" && v === 1)) s.set(k, String(v));
    const q = s.toString();
    return `/events${q ? `?${q}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(d.total / PAGE));

  return (
    <div className="wrap page-pad">
      <Eyebrow>Weekend → promotions → events → bouts</Eyebrow>
      <h1 className="page-title">Events</h1>
      <p className="page-lede">Boxing runs many cards at once. Every card here comes from an athletic commission record, grouped by fight weekend.</p>

      <div className="filters">
        <div className="seg" role="tablist" aria-label="Schedule or results">
          <Link role="tab" aria-selected={scope === "upcoming"} className={`seg__btn${scope === "upcoming" ? " is-on" : ""}`} href={href({ scope: "upcoming", page: 1 })}>Upcoming</Link>
          <Link role="tab" aria-selected={scope === "results"} className={`seg__btn${scope === "results" ? " is-on" : ""}`} href={href({ scope: "results", page: 1 })}>Results</Link>
        </div>
        <div className="chips-row" aria-label="Commission">
          <Link className={`fchip${!commission ? " is-on" : ""}`} href={href({ commission: null, page: 1 })}>All commissions</Link>
          {d.commissions.map((c) => (
            <Link key={c.slug} className={`fchip${commission === c.slug ? " is-on" : ""}`} href={href({ commission: c.slug, page: 1 })}>
              {c.name.replace(/ State Athletic (Commission|Control Board)| Athletic Commission/, "")} <span className="muted">{c.events}</span>
            </Link>
          ))}
        </div>
      </div>

      {!d.rows.length ? (
        <StateNote kind="building" title={scope === "upcoming" ? "No upcoming card listed for this filter" : "No completed card for this filter"} />
      ) : (
        weeks.map((w) => (
          <section key={w.start} className="weekblock">
            <SectionHead kicker="Fight weekend" title={fmtRange(w.first, w.last)} meta={<span className="muted">{plural(w.events.length, "card")}</span>} />
            {w.events.map((e) => <EventLine key={e.public_id} e={e} today={today} />)}
          </section>
        ))
      )}

      {pages > 1 ? (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn" href={href({ page: page - 1 })}>← Newer</Link> : <span />}
          <span className="muted">Page {page} of {pages} · {plural(d.total, "card")}</span>
          {page < pages ? <Link className="btn" href={href({ page: page + 1 })}>Older →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
