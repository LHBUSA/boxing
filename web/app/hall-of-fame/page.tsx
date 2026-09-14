import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { plural } from "@/lib/format";
import { fighterPath } from "@/lib/slug";
import { Note, SecHead, Unavailable } from "@/components/fight";

export const revalidate = 1800;
export const metadata: Metadata = { title: "Hall of Fame", description: "Recognized boxing Halls of Fame and their own induction records: person, institution, year and the institution's category, linked to the verified record." };

export default async function HallOfFamePage({ searchParams }: { searchParams: Promise<{ category?: string; year?: string }> }) {
  const sp = await searchParams;
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : null;
  const category = sp.category && sp.category.length <= 80 ? sp.category : null;
  const all = !year && !category && sp.year === "all";
  const facets = await gateway.hallOfFame({ limit: 1 });
  const latest = facets.ok && facets.data.years.length ? Math.max(...facets.data.years.map((y) => y.year)) : null;
  // A class at a time by default: never a wall of every inductee.
  const shownYear = year ?? (category || all ? null : latest);
  const res = await gateway.hallOfFame({ category, year: shownYear, limit: 600 });
  if (!res.ok) {
    return res.reason === "not_found" || res.reason === "not_configured"
      ? <div className="wrap page"><header className="page-hero"><div className="eyebrow">Hall of Fame</div><h1>Hall of Fame</h1></header><Note title="Induction records are being loaded">Hall of Fame pages show recognized institutions&apos; own induction records once they are on record. PropBetEdge never keeps a Hall of its own.</Note></div>
      : <Unavailable what="The Hall of Fame" />;
  }
  const d = res.data;
  const qs = (next: { category?: string | null; year?: number | null }) => {
    const p = new URLSearchParams();
    const c = next.category === undefined ? category : next.category;
    const y = next.year === undefined ? year : next.year;
    if (c) p.set("category", c);
    if (y) p.set("year", String(y));
    const s = p.toString();
    return `/hall-of-fame${s ? `?${s}` : ""}`;
  };
  const maxYear = Math.max(1, ...d.years.map((y) => y.n));
  const allYears = facets.ok ? facets.data.years : d.years;
  const byYear = new Map<number, typeof d.rows>();
  for (const r of d.rows) { if (!byYear.has(r.year)) byYear.set(r.year, []); byYear.get(r.year)!.push(r); }

  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Hall of Fame · recognized institutions only</div>
        <h1>Enshrined. <em>On their terms.</em></h1>
        <p>PropBetEdge does not run a Hall of Fame. These are the induction records of recognized institutions, with each institution&apos;s own year and category label, linked to a boxer&apos;s verified record where one exists.</p>
      </header>

      <div className="tiles">
        {d.institutions.map((i) => (
          <div className="tile" key={i.slug}><b className="gold">{i.inductions}</b><span>{i.name}</span><small>Classes {i.first_year}–{i.last_year}</small></div>
        ))}
        <div className="tile"><b>{d.years.length}</b><span>Induction classes</span></div>
        <div className="tile"><b>{d.linked_to_fighters}</b><span>Linked to a verified PBE record</span></div>
      </div>

      <section className="mt-4">
        <SecHead kicker="The institution's own categories" title="Browse" />
        <div className="filters" style={{ flexWrap: "wrap" }}>
          <Link className={`pill${!category ? " is-on" : ""}`} href={qs({ category: null })}>All categories</Link>
          {d.categories.map((c) => <Link key={c.label} className={`pill${category === c.label ? " is-on" : ""}`} href={qs({ category: c.label })}>{c.label} · {c.n}</Link>)}
        </div>
        <div className="hof-years mt-2" aria-label="Induction classes by year">
          {[...allYears].sort((a, b) => a.year - b.year).map((y) => (
            <Link key={y.year} href={qs({ year: y.year })} className={`hof-year${shownYear === y.year ? " is-on" : ""}`} title={`${y.year}: ${plural(y.n, "inductee")}`}>
              <i style={{ height: `${Math.max(8, Math.round((y.n / maxYear) * 100))}%` }} />
              <span>{String(y.year).slice(2)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <SecHead kicker={`${plural(d.total, "induction")}${category ? ` · ${category}` : ""}`} title={shownYear ? `Class of ${shownYear}` : category ?? "All inductees"} action={shownYear || category ? <Link className="link-gold" href="/hall-of-fame?year=all">Every class →</Link> : undefined} />
        {!d.rows.length ? <Note title="No induction matches this filter" /> : null}
        <div style={{ display: "grid", gap: 26 }}>
          {[...byYear.entries()].map(([y, rows]) => (
            <div key={y}>
              <div className="tier"><h3>{y}</h3><span>{plural(rows.length, "inductee")}</span></div>
              <div className="hof-grid">
                {rows.map((r) => {
                  const inner = (<><b>{r.name}</b><span>{r.category}</span><small>{r.institution}{r.fighter_public_id ? " · on PBE record →" : ""}</small></>);
                  return r.fighter_public_id
                    ? <Link key={`${r.person_public_id}-${r.category}`} className="hof-card is-linked" href={fighterPath({ public_id: r.fighter_public_id, name: r.name })}>{inner}</Link>
                    : <div key={`${r.person_public_id}-${r.category}`} className="hof-card">{inner}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="fine mt-3">Induction facts (person, year, category) come from the institutions&apos; public records as structured on Wikidata (CC0), spot-checked against the institution&apos;s site. No biography text or Hall photography is reproduced.</p>
    </div>
  );
}
