import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate } from "@/lib/format";
import { fighterPath } from "@/lib/slug";
import type { RankingEntry } from "@/lib/types";
import { Note, SecHead, Unavailable } from "@/components/fight";
import { DOC_LABEL, Holder, asOfText, docDate } from "@/components/titles";

export const revalidate = 1800;
export const metadata: Metadata = { title: "Rankings", description: "WBA, IBF and WBO rankings kept separate by body and division, each from the body's own dated document. No universal ranking." };

const day = (ts: string | null | undefined) => (ts ? fmtDate(ts.slice(0, 10)) : "Date not on record");
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const notRated = (e: RankingEntry) => Boolean(e.metadata?.not_rated || (e.is_vacant && !e.source_name));

function Who({ e }: { e: RankingEntry }) {
  if (notRated(e)) return <span>NOT RATED</span>;
  if (e.public_id && e.display_name) return <Link href={fighterPath({ public_id: e.public_id, name: e.display_name })}>{e.display_name}</Link>;
  // not yet tied to a PropBetEdge fighter: as printed by the body, never matched by name
  return <span className="lane__asprinted" title="As printed by the body; identity under review">{e.source_name}</span>;
}

// movement only between entries tied to the same PropBetEdge fighter; names are never compared
function Movement({ e, previous }: { e: RankingEntry; previous: RankingEntry[] | undefined }) {
  if (!previous || !e.public_id) return null;
  const was = previous.find((p) => p.public_id === e.public_id && !p.metadata?.outside_numbered_list && p.rank_label !== "**");
  if (!was) return <span className="tag">New</span>;
  const d = was.position - e.position;
  return d ? <span className={`tag${d > 0 ? " tag--gold" : ""}`}>{d > 0 ? `Up ${d}` : `Down ${-d}`}</span> : null;
}

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ org?: string; division?: string; gender?: string }> }) {
  const sp = await searchParams;
  const gender = sp.gender === "female" ? "female" : "male";
  const base = await gateway.rankings(null, null, gender);
  if (!base.ok) return <Unavailable what="Rankings" />;
  const { organizations, divisions: all, snapshots } = base.data.board;
  const divisions = all.filter((d) => gender === "female" || d.gender_scope !== "female");
  const order = ["wbc", "wba", "ibf", "wbo"];
  const orgs = [...organizations].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  const org = orgs.find((o) => o.slug === sp.org) ?? orgs.find((o) => o.slug === "wba") ?? orgs[0];
  const div = divisions.find((d) => d.class_key === sp.division) ?? divisions.find((d) => d.class_key === "welterweight") ?? divisions[0];
  const res = await gateway.rankings(org.slug, div.class_key, gender);
  const body = res.ok ? res.data.body : null;
  const snap = body?.snapshot ?? null;
  const entries = snap?.entries ?? [];
  const numbered = entries.filter((e) => !e.metadata?.outside_numbered_list && e.rank_label !== "**");
  const outside = entries.filter((e) => e.metadata?.outside_numbered_list || e.rank_label === "**");
  const champs = body?.champions ?? null;
  const rec = body?.source_record ?? null;
  const link = (p: { org?: string; division?: string; gender?: string }) => `/rankings?${new URLSearchParams({ org: p.org ?? org.slug, division: p.division ?? div.class_key, ...((p.gender ?? gender) === "female" ? { gender: "female" } : {}) })}`;
  const stored = (slug: string) => snapshots.filter((s) => s.organization_slug === slug).reduce((n, s) => n + (s.stored ?? 1), 0);
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Rankings · by sanctioning body</div>
        <h1>Every body ranks its own.</h1>
        <p>The WBC, WBA, IBF and WBO each publish separate rankings. PropBetEdge shows each body's own list, dated to its document, and never blends them into a universal ranking.</p>
      </header>
      <div className="filters">
        <div className="seg">{orgs.map((o) => <Link key={o.slug} className={o.slug === org.slug ? "is-on" : ""} href={link({ org: o.slug })}>{o.short_name}</Link>)}</div>
        <div className="seg"><Link className={gender === "male" ? "is-on" : ""} href={link({ gender: "male" })}>Men</Link><Link className={gender === "female" ? "is-on" : ""} href={link({ gender: "female" })}>Women</Link></div>
      </div>
      <nav className="ladder" aria-label="Divisions">
        {[...divisions].reverse().map((d) => <Link key={d.class_key} href={link({ division: d.class_key })} className={d.class_key === div.class_key ? "is-on" : ""}><b>{d.name}</b><span>{d.max_lb ? `${d.max_lb} lb` : "No limit"}</span></Link>)}
      </nav>
      <section className="mt-4">
        <SecHead
          kicker={org.name}
          title={`${org.short_name} ${rec?.division_native_label ? titleCase(rec.division_native_label) : div.name}`}
          action={body?.state === "not_licensed" ? <span className="tag tag--pending">Not licensed</span>
            : snap ? <span className="tag tag--gold">{asOfText(rec?.as_of_label) ?? `Effective ${day(snap.effective_on ?? snap.published_on)}`}</span>
            : <span className="tag tag--pending">No snapshot yet</span>}
        >
          {rec ? `${DOC_LABEL[rec.document_kind] ?? rec.document_kind}${rec.division_limit_text ? ` · ${rec.division_limit_text}` : ""} · read ${day(rec.retrieved_at)}` : undefined}
        </SecHead>

        {!res.ok ? (
          <Note title="Rankings did not load" pending>The Boxing data service did not answer for this list. Nothing is shown rather than a stale or guessed list.</Note>
        ) : body?.state === "not_licensed" ? (
          <div className="lane lane--not_licensed">
            <div className="lane__closed">
              <b>Not licensed · source unavailable</b>
              <span>PropBetEdge has no permission to collect {org.short_name} rankings, so no {org.short_name} list is shown and no ranks are taken from other sources. Each other body's list is under its own tab.</span>
            </div>
          </div>
        ) : !snap ? (
          <Note title="No snapshot yet" pending>No {org.short_name} {div.name.toLowerCase()} document has been stored. A list appears here with its document date once collected.</Note>
        ) : (
          <>
            <div className="rk__champs" aria-label={`${org.short_name} champions`}>
              <div className="eyebrow eyebrow--dim">Champions · above the numbered ranking{champs ? ` · ${DOC_LABEL[champs.document_kind] ?? champs.document_kind}, ${docDate(champs).toLowerCase()}` : ""}</div>
              {champs?.belts.length ? champs.belts.map((b, i) => (
                <div className="rk__champ" key={i}>
                  <span className="bline__names"><span className="eyebrow">{b.designation ?? "Champion"}</span><b><Holder belt={b} /></b></span>
                  <span className="rk__tags">{b.mandatory ? <span className="tag">Mandatory: {b.mandatory.challenger ?? b.mandatory.as_printed}</span> : null}</span>
                </div>
              )) : <p className="fine">This document lists no champion for the division.</p>}
            </div>
            <div className="blist">
              {numbered.map((e) => (
                <div className={`bline${notRated(e) ? " bline--nr" : ""}`} key={`${e.position}-${e.rank_label}`}>
                  <span className="bline__who" style={{ gridTemplateColumns: "48px minmax(0,1fr)" }}>
                    <span className="serif gold" style={{ fontSize: 26, fontWeight: 900 }}>{e.rank_label ?? e.rank}</span>
                    <span className="bline__names"><Who e={e} />{e.metadata?.country ? <span className="bline__meta">{e.metadata.country_label ?? e.metadata.country}</span> : null}</span>
                  </span>
                  <span className="rk__tags">
                    {e.metadata?.regional_label ? <span className="tag">{e.metadata.regional_label}</span> : null}
                    {e.mandatory ? <span className="tag">Mandatory</span> : null}
                    <Movement e={e} previous={body?.previous?.entries} />
                  </span>
                </div>
              ))}
            </div>
            {outside.length ? (
              <div className="mt-2">
                <div className="eyebrow eyebrow--dim">Outside the numbered list · as the {org.short_name} prints them</div>
                <div className="blist">
                  {outside.map((e) => (
                    <div className="bline" key={`o-${e.position}`}>
                      <span className="bline__who" style={{ gridTemplateColumns: "48px minmax(0,1fr)" }}>
                        <span className="serif dim" style={{ fontSize: 20, fontWeight: 900 }}>**</span>
                        <span className="bline__names"><Who e={e} />{e.metadata?.country ? <span className="bline__meta">{e.metadata.country}</span> : null}</span>
                      </span>
                      <span className="rk__tags">{e.metadata?.regional_label ?? e.designation ? <span className="tag">{e.metadata?.regional_label ?? e.designation}</span> : null}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="fine mt-2">Source: {org.name}, official {DOC_LABEL[rec?.document_kind ?? ""] ?? "document"}. Facts only; regional tags are the body's own.{body?.previous ? ` Movement compares with the ${day(body.previous.effective_on ?? body.previous.published_on)} list, for fighters on record only.` : ""}</p>
          </>
        )}
      </section>
      {body?.history?.length ? (
        <section className="mt-4">
          <SecHead kicker={`${body.history.length} stored ${org.short_name} ${div.name.toLowerCase()} documents`} title="Snapshot History" />
          <div className="rk__tags" style={{ justifyContent: "flex-start" }}>
            {body.history.slice(0, 24).map((h, i) => <span className="tag" key={i}>{(h.effective_on ?? h.published_on ?? "").slice(0, 7) || "undated"}</span>)}
            {body.history.length > 24 ? <span className="fine">and {body.history.length - 24} earlier</span> : null}
          </div>
        </section>
      ) : null}
      <section className="band">
        <SecHead kicker="Coverage" title="Snapshots on Record" />
        <div className="tiles">{orgs.map((o) => (
          <div className="tile" key={o.slug}>
            <b className={o.slug === "wbc" ? "is-na" : ""}>{o.slug === "wbc" ? "Not licensed" : stored(o.slug)}</b>
            <span>{o.short_name} snapshots</span>
            <small>{o.slug === "wbc" ? "Source unavailable" : o.display_allowed ? "Official source" : "Under source review"}</small>
          </div>
        ))}</div>
      </section>
    </div>
  );
}
