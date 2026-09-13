import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate } from "@/lib/format";
import { fighterPath } from "@/lib/slug";
import { Chip, Eyebrow, SectionHead, StateNote, Unavailable } from "@/components/ui";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Boxing rankings by sanctioning body",
  description: "WBC, WBA, IBF and WBO rankings kept separate by body and division, each tied to a dated snapshot. No universal ranking is invented.",
};

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ org?: string; division?: string; gender?: string }> }) {
  const sp = await searchParams;
  const gender = sp.gender === "female" ? "female" : "male";
  const base = await gateway.rankings(null, null, gender);
  if (!base.ok) return <Unavailable what="Rankings" />;
  const { organizations, divisions: allDivisions, snapshots } = base.data.board;
  const divisions = allDivisions.filter((d) => gender === "female" || d.gender_scope !== "female");
  const org = organizations.find((o) => o.slug === sp.org) ?? organizations.find((o) => o.slug === "wbc") ?? organizations[0];
  const division = divisions.find((d) => d.class_key === sp.division) ?? divisions.find((d) => d.class_key === "welterweight") ?? divisions[0];
  const res = org && division ? await gateway.rankings(org.slug, division.class_key, gender) : null;
  const snap = res && res.ok ? res.data.snapshot : null;
  const link = (p: { org?: string; division?: string; gender?: string }) => `/rankings?${new URLSearchParams({ org: p.org ?? org.slug, division: p.division ?? division.class_key, ...((p.gender ?? gender) === "female" ? { gender: "female" } : {}) })}`;
  const stored = (slug: string) => snapshots.filter((s) => s.organization_slug === slug).length;

  return (
    <div className="wrap page-pad">
      <Eyebrow>Division → organization · dated snapshots</Eyebrow>
      <h1 className="page-title">Rankings</h1>
      <p className="page-lede">Each sanctioning body publishes its own rankings. PropBetEdge keeps them separate and never blends them into a universal list.</p>

      <div className="filters">
        <div className="seg" role="tablist" aria-label="Sanctioning body">
          {organizations.map((o) => (
            <Link key={o.slug} role="tab" aria-selected={o.slug === org.slug} className={`seg__btn${o.slug === org.slug ? " is-on" : ""}`} href={link({ org: o.slug })}>{o.short_name}</Link>
          ))}
        </div>
        <div className="seg seg--small" role="tablist" aria-label="Division scope">
          <Link role="tab" aria-selected={gender === "male"} className={`seg__btn${gender === "male" ? " is-on" : ""}`} href={link({ gender: "male" })}>Men</Link>
          <Link role="tab" aria-selected={gender === "female"} className={`seg__btn${gender === "female" ? " is-on" : ""}`} href={link({ gender: "female" })}>Women</Link>
        </div>
      </div>
      <div className="chips-row chips-row--scroll" aria-label="Division">
        {[...divisions].reverse().map((d) => (
          <Link key={d.class_key} className={`fchip${d.class_key === division.class_key ? " is-on" : ""}`} href={link({ division: d.class_key })}>{d.name}</Link>
        ))}
      </div>

      <SectionHead kicker={`${org.name}`} title={`${org.short_name} ${division.name}`} meta={snap?.published_on ? <Chip kind="official">Snapshot {fmtDate(snap.published_on)}</Chip> : <Chip kind="review">No cleared snapshot</Chip>} />

      {snap && snap.entries.length ? (
        <div className="rank" role="table" aria-label={`${org.short_name} ${division.name} rankings`}>
          <div className="rank__row rank__row--head" role="row">
            <span role="columnheader" className="num">Rank</span><span role="columnheader">Boxer</span><span role="columnheader">Status</span><span role="columnheader">Movement</span>
          </div>
          {snap.entries.map((e) => (
            <div className="rank__row" role="row" key={`${e.position}-${e.rank}`}>
              <span role="cell" className="num rank__n">{e.is_champion ? "C" : e.rank_label ?? e.rank}</span>
              <span role="cell">{e.public_id && e.display_name ? <Link href={fighterPath({ public_id: e.public_id, name: e.display_name })}>{e.display_name}</Link> : e.is_vacant ? <span className="muted">Vacant</span> : e.source_name ?? <span className="muted">Not identified</span>}</span>
              <span role="cell">{e.is_champion ? <Chip kind="official">Champion</Chip> : null}{e.mandatory ? <Chip kind="neutral">Mandatory</Chip> : null}{e.designation ? <span className="muted"> {e.designation}</span> : null}</span>
              <span role="cell" className="muted">Needs a previous snapshot</span>
            </div>
          ))}
          {snap.source_url ? <p className="fine">Source: <a href={snap.source_url} target="_blank" rel="noopener noreferrer">{org.name} ↗</a></p> : null}
        </div>
      ) : (
        <StateNote kind="review" title="Ranking source under review">
          {org.name} rankings are not yet cleared for display, so no {division.name.toLowerCase()} list is shown. No placeholder ranks are drawn. When a snapshot is cleared it appears here with its publication date and movement against the previous snapshot.
        </StateNote>
      )}

      <section className="bodies">
        <SectionHead kicker="Coverage" title="Stored snapshots by body" />
        <div className="bodies__grid" role="table" aria-label="Ranking coverage">
          <div className="bodies__row bodies__row--head" role="row"><span role="columnheader">Body</span><span role="columnheader">Status</span><span role="columnheader" className="num">Snapshots</span><span role="columnheader" className="num">Divisions</span></div>
          {organizations.map((o) => (
            <div className="bodies__row" role="row" key={o.slug}>
              <span role="cell"><strong>{o.short_name}</strong> <span className="muted">{o.name}</span></span>
              <span role="cell"><Chip kind={o.display_allowed ? "verified" : "review"}>{o.display_allowed ? "Cleared" : "Under source review"}</Chip></span>
              <span role="cell" className="num">{stored(o.slug)}</span>
              <span role="cell" className="num">{new Set(snapshots.filter((s) => s.organization_slug === o.slug).map((s) => s.class_key)).size}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
