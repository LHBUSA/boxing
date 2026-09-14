import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateway, todayUtc } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { fighterPath } from "@/lib/slug";
import { Crumbs, MatchupCard, Note, SecHead, Unavailable } from "@/components/fight";
import type { BoutCompact } from "@/lib/types";

export const revalidate = 1800;
type Props = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const res = /^[a-z0-9-]{1,80}$/.test(key) ? await gateway.promoter(key) : null;
  if (!res?.ok) return { title: "Promoter", robots: { index: false } };
  return { title: `${res.data.names[0]}: cards on record`, description: `Cards listed under ${res.data.names[0]} on official commission sheets.` };
}

export default async function PromoterPage({ params }: Props) {
  const { key } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(key)) notFound();
  const res = await gateway.promoter(key);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This promoter" />; }
  const d = res.data;
  const today = todayUtc();
  const dated = [...d.cards].sort((a, b) => a.date.localeCompare(b.date));
  const past = dated.filter((e) => e.date < today);
  const upcoming = dated.filter((e) => e.date >= today);
  const months = new Map<string, number>();
  for (const e of dated) months.set(e.date.slice(0, 7), (months.get(e.date.slice(0, 7)) ?? 0) + 1);
  const maxMonth = Math.max(1, ...months.values());
  return (
    <div className="wrap page">
      <Crumbs items={[{ label: "Promoters", href: "/promoters" }, { label: d.names[0] }]} />
      <header className="page-hero">
        <div className="eyebrow">Promoter · as listed on official sheets</div>
        <h1>{d.names[0]}</h1>
        <p>{plural(d.cards.length, "card")} on record{d.venues.length ? ` at ${plural(d.venues.length, "venue")}` : ""}. This page shows only the relationship the commission sheets state: this name is listed as the promoter of these cards.</p>
      </header>
      <div className="tiles">
        <div className="tile"><b className="gold">{d.cards.length}</b><span>Cards</span></div>
        <div className="tile"><b>{d.cards.reduce((s, e) => s + e.bout_count, 0)}</b><span>Verified bouts</span></div>
        <div className="tile"><b>{d.fighters.length}</b><span>Fighters on these cards</span></div>
        <div className="tile"><b>{d.title_bouts}</b><span>Title bouts</span></div>
      </div>
      <div className="split mt-4">
        <section>
          <SecHead kicker={dated.length ? fmtDate(dated[0].date) + " – " + fmtDate(dated[dated.length - 1].date) : "On record"} title="Timeline" />
          <div className="hof-years" aria-label="Cards by month">
            {[...months.entries()].map(([m, n]) => (
              <div key={m} className="hof-year" title={m + ": " + plural(n, "card")}><i style={{ height: Math.max(10, Math.round((n / maxMonth) * 100)) + "%" }} /><span>{m.slice(5)}</span></div>
            ))}
          </div>
          <p className="fine mt-1">{plural(past.length, "card")} on record{upcoming.length ? " · " + plural(upcoming.length, "upcoming card") : ""}. Months are the event dates on the commission records we cover.</p>
        </section>
        <section>
          <SecHead kicker="Brand record" title="Identity" />
          <Note title="Logo, official site and executives are not on record yet">They appear once the promotion&apos;s brand record is sourced and any logo is rights-cleared for editorial identification. This page never implies which boxers are signed to the promotion.</Note>
        </section>
      </div>
      <section className="band">
        <SecHead kicker="Most recent first" title="Cards" />
        <div className="mgrid mgrid--3">
          {d.cards.filter((e) => e.headline?.a && e.headline?.b).map((e) => <MatchupCard key={e.public_id} bout={e.headline as BoutCompact} event={e} />)}
        </div>
      </section>
      <div className="split">
        <section>
          <SecHead kicker="Appearing on these cards · not contract status" title="Fighters" />
          <div className="blist">{d.fighters.slice(0, 24).map((f) => (
            <Link key={f.public_id} href={fighterPath(f)} className="bline"><span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{f.name}</span></span><span className="bline__res"><span className="bline__method">{plural(f.appearances, "bout")}</span></span></Link>
          ))}</div>
        </section>
        <section>
          <SecHead kicker="Where" title="Venues" />
          <div className="blist">{d.venues.map((v) => <div key={v.name} className="bline"><span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{v.name}</span><span className="bline__meta">{[v.city, v.region].filter(Boolean).join(", ")}</span></span><span className="bline__res"><span className="bline__method">{plural(v.cards, "card")}</span></span></div>)}</div>
          {d.co_promoters.length ? <><div className="tier"><h3>Also listed on these cards</h3></div><div className="scroll-x" style={{ flexWrap: "wrap" }}>{d.co_promoters.map((c) => <Link key={c.key} className="pill" href={`/promoters/${c.key}`}>{c.name} · {c.shared_cards}</Link>)}</div></> : null}
        </section>
      </div>
    </div>
  );
}
