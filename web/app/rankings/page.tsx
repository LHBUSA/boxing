import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate } from "@/lib/format";
import { fighterPath } from "@/lib/slug";
import { Note, SecHead, Unavailable } from "@/components/fight";

export const revalidate = 1800;
export const metadata: Metadata = { title: "Rankings", description: "WBC, WBA, IBF and WBO rankings kept separate by body and division, each tied to a dated snapshot." };

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ org?: string; division?: string; gender?: string }> }) {
  const sp = await searchParams;
  const gender = sp.gender === "female" ? "female" : "male";
  const base = await gateway.rankings(null, null, gender);
  if (!base.ok) return <Unavailable what="Rankings" />;
  const { organizations, divisions: all, snapshots } = base.data.board;
  const divisions = all.filter((d) => gender === "female" || d.gender_scope !== "female");
  const org = organizations.find((o) => o.slug === sp.org) ?? organizations.find((o) => o.slug === "wbc") ?? organizations[0];
  const div = divisions.find((d) => d.class_key === sp.division) ?? divisions.find((d) => d.class_key === "welterweight") ?? divisions[0];
  const res = await gateway.rankings(org.slug, div.class_key, gender);
  const snap = res.ok ? res.data.snapshot : null;
  const link = (p: { org?: string; division?: string; gender?: string }) => `/rankings?${new URLSearchParams({ org: p.org ?? org.slug, division: p.division ?? div.class_key, ...((p.gender ?? gender) === "female" ? { gender: "female" } : {}) })}`;
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Rankings · by sanctioning body</div>
        <h1>Every body ranks its own.</h1>
        <p>The WBC, WBA, IBF and WBO each publish separate rankings. PropBetEdge keeps them separate, dated, and never blends them into a universal list.</p>
      </header>
      <div className="filters">
        <div className="seg">{organizations.map((o) => <Link key={o.slug} className={o.slug === org.slug ? "is-on" : ""} href={link({ org: o.slug })}>{o.short_name}</Link>)}</div>
        <div className="seg"><Link className={gender === "male" ? "is-on" : ""} href={link({ gender: "male" })}>Men</Link><Link className={gender === "female" ? "is-on" : ""} href={link({ gender: "female" })}>Women</Link></div>
      </div>
      <nav className="ladder" aria-label="Divisions">
        {[...divisions].reverse().map((d) => <Link key={d.class_key} href={link({ division: d.class_key })} className={d.class_key === div.class_key ? "is-on" : ""}><b>{d.name}</b><span>{d.max_lb ? `${d.max_lb} lb` : "No limit"}</span></Link>)}
      </nav>
      <section className="mt-4">
        <SecHead kicker={org.name} title={`${org.short_name} ${div.name}`} action={snap?.published_on ? <span className="tag tag--gold">Snapshot {fmtDate(snap.published_on)}</span> : <span className="tag tag--pending">No cleared snapshot</span>} />
        {snap?.entries.length ? (
          <div className="blist">
            {snap.entries.map((e) => (
              <div className="bline" key={`${e.position}-${e.rank}`}>
                <span className="bline__who" style={{ gridTemplateColumns: "48px minmax(0,1fr)" }}>
                  <span className="serif gold" style={{ fontSize: 26, fontWeight: 900 }}>{e.is_champion ? "C" : e.rank_label ?? e.rank}</span>
                  <span className="bline__names">{e.public_id && e.display_name ? <Link href={fighterPath({ public_id: e.public_id, name: e.display_name })}>{e.display_name}</Link> : <span className="dim">{e.is_vacant ? "Vacant" : e.source_name}</span>}</span>
                </span>
                <span className="bline__res">{e.mandatory ? <span className="tag">Mandatory</span> : null}</span>
              </div>
            ))}
          </div>
        ) : (
          <Note title="Ranking source under review" pending>{org.name} rankings are not yet cleared for display, so no {div.name.toLowerCase()} list is shown and no placeholder ranks are drawn. A cleared snapshot appears here with its publication date and movement.</Note>
        )}
      </section>
      <section className="band">
        <SecHead kicker="Coverage" title="Snapshots on Record" />
        <div className="tiles">{organizations.map((o) => <div className="tile" key={o.slug}><b>{snapshots.filter((s) => s.organization_slug === o.slug).length}</b><span>{o.short_name} snapshots</span><small>{o.display_allowed ? "Cleared" : "Under source review"}</small></div>)}</div>
      </section>
    </div>
  );
}
