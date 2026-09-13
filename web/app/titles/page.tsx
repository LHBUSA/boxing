import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fighterPath } from "@/lib/slug";
import { fmtDate } from "@/lib/format";
import { Note, SecHead, Unavailable } from "@/components/fight";

export const revalidate = 1800;
export const metadata: Metadata = { title: "World Title Map", description: "Boxing's world titles division by division: WBC, WBA, IBF and WBO belts kept separate, champions only from cleared sanctioning-body records." };

const TIERS: [string, string][] = [
  ["World / full", "An organization's main championship in a division."],
  ["Super", "WBA designation above its regular champion."],
  ["Regular", "WBA world title that can coexist with a super champion."],
  ["Interim", "Placeholder while the full champion is out. Never counts toward undisputed."],
  ["Franchise", "WBC designation excusing mandatory defences. Tracked separately."],
  ["Undisputed", "PropBetEdge-derived: one boxer holding the primary world title of all four bodies (rule pbe_undisputed@1)."],
];

export default async function TitlesPage({ searchParams }: { searchParams: Promise<{ division?: string; gender?: string }> }) {
  const sp = await searchParams;
  const gender = sp.gender === "female" ? "female" : "male";
  const base = await gateway.titles(null, gender);
  if (!base.ok) return <Unavailable what="The World Title Map" />;
  const divisions = base.data.board.divisions.filter((d) => gender === "female" || d.gender_scope !== "female");
  const sel = divisions.find((d) => d.class_key === sp.division) ?? divisions.find((d) => d.class_key === "welterweight") ?? divisions[0];
  const res = await gateway.titles(sel.class_key, gender);
  const board = res.ok ? res.data.board : base.data.board;
  const map = res.ok ? res.data.map : null;
  const link = (division: string, g = gender) => `/titles?${new URLSearchParams({ division, ...(g === "female" ? { gender: g } : {}) })}`;
  const orgs = board.organizations;
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">World Title Map · four sanctioning bodies</div>
        <h1>Four belts. <span className="gold" style={{ fontStyle: "italic" }}>Never merged.</span></h1>
        <p>Boxing has no single champion per division. The WBC, WBA, IBF and WBO each crown their own, sometimes several at once. This map keeps every belt separate and shows a champion only from a cleared sanctioning-body record.</p>
      </header>
      <div className="filters">
        <div className="seg"><Link className={gender === "male" ? "is-on" : ""} href={link(sel.class_key, "male")}>Men</Link><Link className={gender === "female" ? "is-on" : ""} href={link(sel.class_key, "female")}>Women</Link></div>
      </div>
      <nav className="ladder" aria-label="Divisions">
        {[...divisions].reverse().map((d) => <Link key={d.class_key} href={link(d.class_key)} className={d.class_key === sel.class_key ? "is-on" : ""}><b>{d.name}</b><span>{d.max_lb ? `${d.max_lb} lb` : "No limit"}</span></Link>)}
      </nav>
      <section className="mt-4">
        <SecHead kicker={`${sel.max_lb ? `${sel.max_lb} lb · ${sel.max_kg} kg` : "No upper limit"} · ${sel.verified_bouts ?? 0} verified bouts in this division`} title={sel.name}>{sel.notes ?? undefined}</SecHead>
        <div className="belts">
          {orgs.map((o) => {
            const lane = map?.organizations.find((x) => x.organization_slug === o.slug);
            return (
              <div className="belt" key={o.slug}>
                <div><div className="belt__org">{o.short_name}</div><div className="belt__name">{o.name}</div></div>
                {lane?.belts.length ? (
                  <div className="belt__slot">
                    {lane.belts.map((b, i) => (
                      <div key={i}>
                        <span className="eyebrow eyebrow--dim">{b.source_native_label ?? b.tier}</span>
                        {b.holder ? <p><Link className="gold" href={fighterPath({ public_id: b.holder.public_id, name: b.holder.display_name })}>{b.holder.display_name}</Link>{b.holder.started_on ? <span className="fine"> · since {fmtDate(b.holder.started_on)}</span> : null}</p> : <p className="dim">Vacant</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="belt__slot"><b>Champion record pending</b><span className="fine">{o.short_name} title data is under source review. No champion is inferred from results or press.</span></div>
                )}
              </div>
            );
          })}
        </div>
        {map?.derived.unification.length ? <div className="mt-2"><Note title="Unification (PropBetEdge-derived)">{map.derived.unification.map((u) => `${u.display_name}: ${u.state}`).join(" · ")}</Note></div> : null}
      </section>
      <section className="band">
        <SecHead kicker="Distinct, never collapsed" title="How to Read a Belt" />
        <div className="factors">{TIERS.map(([k, v]) => <div className="factor" key={k}><b>{k}</b><span>{v}</span></div>)}</div>
        <p className="fine mt-2">No sanctioning-body logos or belts are reproduced.</p>
      </section>
    </div>
  );
}
