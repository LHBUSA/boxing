// Title Map and body-native rankings pieces. Every fact shown here is one sanctioning body's own statement, labelled
// with that body and its document; nothing is merged across bodies or resolved between a body's own documents.

import Link from "next/link";
import type { TitleBeltStatus, TitleDocument, TitleLane, TitleLanes } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { fighterPath } from "@/lib/slug";

export const DOC_LABEL: Record<string, string> = {
  wba_ranking: "WBA ranking",
  wba_champions: "WBA champions page",
  ibf_rating: "IBF ratings",
  wbo_ratings: "WBO ratings PDF",
  wbo_champions: "WBO champions page",
  wbc_ratings: "WBC ratings PDF",
  wbc_champions: "WBC champions list",
};

// the public page of each body where a reader finds the underlying fact (PropBetEdge links back; it does not republish)
export const OFFICIAL_PAGE: Record<string, string> = {
  wba_ranking: "https://www.wbaboxing.com/wba-ranking",
  wba_champions: "https://www.wbaboxing.com/current-wba-champions",
  ibf_rating: "https://www.ibf-usba-boxing.com/ratings/",
  wbo_ratings: "https://wboboxing.com/rankings/",
  wbo_champions: "https://wboboxing.com/male-champions/",
  wbc_ratings: "https://wbcboxing.com/en/main-ratings/",
  wbc_champions: "https://wbcboxing.com/en/main-ratings/",
};
export const BODY_SITE: Record<string, string> = {
  wbc: "https://wbcboxing.com/", wba: "https://www.wbaboxing.com/", ibf: "https://www.ibf-usba-boxing.com/", wbo: "https://wboboxing.com/",
};
export function OfficialLink({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return null;
  return <a className="link-gold lane__official" href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}
const day = (ts: string | null | undefined) => (ts ? fmtDate(ts.slice(0, 10)) : "never");
// collection is monthly; a lane is stale once a full cycle plus two weeks has passed without a successful check
const STALE_DAYS = 45;

export function Freshness({ lane, today }: { lane: TitleLane; today: string }) {
  if (lane.state === "not_licensed") return <span className="tag tag--pending">Not collected</span>;
  const ok = lane.freshness?.last_ok_at ?? null;
  const age = ok ? Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(ok)) / 86_400_000) : null;
  if (!ok) return <span className="tag tag--pending">Not yet checked</span>;
  return <span className={`tag ${age != null && age > STALE_DAYS ? "tag--pending" : "tag--gold"}`}>{age != null && age > STALE_DAYS ? "Stale · " : ""}Checked {day(ok)}</span>;
}

export function Holder({ belt }: { belt: TitleBeltStatus }) {
  if (belt.status === "vacant") return <span className="dim">Vacant</span>;
  // a record that names no holder is shown as not stated; it is never read as a vacancy
  if (!belt.holder?.name) return <span className="dim" title="The body's document names no holder for this belt">Not stated</span>;
  const h = belt.holder;
  if (h.fighter && h.display_name) return <Link className="gold" href={fighterPath({ public_id: h.fighter, name: h.display_name })}>{h.display_name}</Link>;
  // not yet tied to a PropBetEdge fighter: shown exactly as the body prints it, never matched by name
  return <span className="lane__asprinted" title="As printed by the body; identity under review">{h.name}{h.country ? <span className="fine"> · {h.country}</span> : null}</span>;
}

export function BeltRows({ doc }: { doc: TitleDocument }) {
  if (!doc.belts.length) return <p className="fine">This document lists no {doc.division_native_label.toLowerCase()} champion.</p>;
  return (
    <ul className="lane__belts">
      {doc.belts.map((b, i) => (
        <li key={i}>
          <span className="eyebrow eyebrow--dim">{b.designation ?? b.tier ?? "Champion"}{b.status === "in_recess" ? " · in recess" : ""}</span>
          <b><Holder belt={b} /></b>
          {b.honorific && /[A-Z]/.test(b.honorific) ? <span className="fine">Also printed: {b.honorific}</span> : null}
          {b.reign_start ? <span className="fine">Since {fmtDate(b.reign_start.on)}{b.reign_start.basis ? ` (${b.reign_start.basis.replace(/_/g, " ")})` : ""}</span> : null}
          {b.mandatory ? <span className="fine">Mandatory, as printed: {b.mandatory.as_printed}</span> : null}
        </li>
      ))}
    </ul>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// "JULY 2026" (WBA/WBO) or an IBF record title ending "- 08/2026": shown as the month the body names
export function asOfText(label: string | null | undefined, asOf?: string | null) {
  const mmyyyy = label?.match(/(\d{2})\/(\d{4})\s*$/);
  if (mmyyyy) return `As of ${MONTHS[Number(mmyyyy[1]) - 1]} ${mmyyyy[2]}`;
  if (label) return `As of ${label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}`;
  return asOf ? `As of ${fmtDate(asOf)}` : null;
}
export function docDate(doc: TitleDocument) {
  return asOfText(doc.as_of_label) ?? (doc.published_on ? `Published ${fmtDate(doc.published_on)}` : `Read ${day(doc.retrieved_at)}`);
}
// the body's dated ranking document leads; its champions page follows
const DOC_ORDER = ["wbc_ratings", "wba_ranking", "ibf_rating", "wbo_ratings", "wbc_champions", "wba_champions", "wbo_champions"];
const beltLabel = (key: string) => {
  const tier = key.split("|")[0];
  return tier === "world" ? "World title" : `${tier.charAt(0).toUpperCase()}${tier.slice(1)} title`;
};

const DERIVED_STATE: Record<string, string> = {
  resolved: "holder identified", no_document: "no document stored", document_stale: "document out of date",
  body_documents_disagree: "its own documents disagree", no_primary_belt_listed: "no primary belt listed",
  primary_belt_vacant: "primary belt vacant", primary_belt_unknown: "holder not stated", primary_belt_in_recess: "champion in recess",
  holder_identity_unresolved: "holder identity under review",
};

export function DerivedStrip({ derived, bodies }: { derived: TitleLanes["derived"]; bodies: TitleLane[] }) {
  const name = (slug: string) => bodies.find((l) => l.body === slug)?.short_name ?? slug.toUpperCase();
  const headline = derived.status === "undisputed" ? "Undisputed"
    : derived.status === "unified" ? "Unified"
    : derived.status === "none" ? "No unified champion" : "Not determined";
  return (
    <div className="derived mt-2">
      <span className="tag">PropBetEdge-derived</span>
      <span>
        <b>{headline}.</b>{" "}
        {derived.holders.filter((h) => h.state !== "single").map((h) => (
          <span key={h.fighter}><Link className="gold" href={fighterPath({ public_id: h.fighter, name: h.display_name })}>{h.display_name}</Link> holds the primary belt of {h.bodies.map(name).join(", ")}. </span>
        ))}
        {!derived.complete ? <>Not every body can be counted: {derived.bodies.filter((b) => b.state !== "resolved").map((b) => `${name(b.body)} (${DERIVED_STATE[b.state] ?? b.state.replace(/_/g, " ")})`).join("; ")}. </> : null}
        Our own calculation from each body&apos;s primary champion, never a body&apos;s own &quot;unified&quot; or &quot;undisputed&quot; wording. PropBetEdge does not award or recognise titles.
      </span>
    </div>
  );
}

export function LaneCard({ lane, today, division }: { lane: TitleLane; today: string; division: string }) {
  const [primary, ...others] = [...lane.documents].sort((a, b) => DOC_ORDER.indexOf(a.document_kind) - DOC_ORDER.indexOf(b.document_kind));
  return (
    <article className={`lane lane--${lane.state}`} aria-label={`${lane.short_name} ${division}`}>
      <header className="lane__head">
        <div><div className="belt__org">{lane.short_name}</div><div className="belt__name">{lane.name}</div></div>
        <Freshness lane={lane} today={today} />
      </header>

      {lane.state === "not_licensed" ? (
        <div className="lane__closed">
          <b>Not collected</b>
          <span>PropBetEdge does not collect {lane.short_name} documents, so this lane holds no {lane.short_name} champion or ranking.</span>
          <OfficialLink href={BODY_SITE[lane.body]} label={`${lane.name} official site`} />
        </div>
      ) : lane.state === "no_snapshot" || !primary ? (
        <div className="lane__closed">
          <b>Not collected yet</b>
          <span>No {lane.short_name} {division.toLowerCase()} document is stored yet. The {lane.name} publishes its own champions and ratings.</span>
          <OfficialLink href={BODY_SITE[lane.body]} label={`${lane.name} official site`} />
        </div>
      ) : (
        <>
          <div className="lane__doc">
            <div className="lane__doclabel"><span>{DOC_LABEL[primary.document_kind] ?? primary.document_kind}</span><span className="fine">{docDate(primary)}</span></div>
            <BeltRows doc={primary} />
          </div>
          {others.map((d) => (
            <details className="lane__more" key={d.document_kind}>
              <summary>{DOC_LABEL[d.document_kind] ?? d.document_kind} · {docDate(d)}</summary>
              <BeltRows doc={d} />
            </details>
          ))}
        </>
      )}

      {lane.conflicts_within_body.length ? (
        <div className="lane__conflicts">
          <span className="tag tag--red">{lane.short_name} documents disagree</span>
          <ul>
            {lane.conflicts_within_body.map((c, i) => (
              <li key={i} className="fine">
                <strong>{beltLabel(c.belt)}</strong>: {DOC_LABEL[c.left_document] ?? c.left_document} says {c.left ?? "nothing"}; {DOC_LABEL[c.right_document] ?? c.right_document} says {c.right ?? "nothing"}. Not resolved by PropBetEdge.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lane.claims_by_other_bodies.length ? (
        <details className="lane__others">
          <summary>What the other bodies say</summary>
          <p className="fine">Statements about the {lane.short_name} title taken from other bodies' own documents. They are those bodies' claims, not {lane.short_name} facts.</p>
          <ul>
            {lane.claims_by_other_bodies.map((c, i) => (
              <li key={i}>
                <span className="tag">{c.by.toUpperCase()}</span>{" "}
                <span>{c.blank ? "left blank" : c.says ?? "no name"}</span>
                <span className="fine"> · {DOC_LABEL[c.document_kind] ?? c.document_kind}{c.as_of ? `, ${fmtDate(c.as_of)}` : ""}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {primary ? (
        <p className="fine lane__attr">Source: {lane.name}. <OfficialLink href={OFFICIAL_PAGE[primary.document_kind] ?? BODY_SITE[lane.body]} label="Official source" /></p>
      ) : null}
    </article>
  );
}
