// Title Map and body-native rankings pieces. Every fact shown here is one sanctioning body's own statement, labelled
// with that body and its document; nothing is merged across bodies or resolved between a body's own documents.

import Link from "next/link";
import type { TitleBeltStatus, TitleDocument, TitleLane } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { fighterPath } from "@/lib/slug";

export const DOC_LABEL: Record<string, string> = {
  wba_ranking: "WBA ranking",
  wba_champions: "WBA champions page",
  ibf_rating: "IBF ratings",
  wbo_ratings: "WBO ratings PDF",
  wbo_champions: "WBO champions page",
};

const BODY_HOME: Record<string, string> = { wba: "wbaboxing.com", ibf: "ibf-usba-boxing.com", wbo: "wboboxing.com" };
const day = (ts: string | null | undefined) => (ts ? fmtDate(ts.slice(0, 10)) : "never");
// collection is monthly; a lane is stale once a full cycle plus two weeks has passed without a successful check
const STALE_DAYS = 45;

export function Freshness({ lane, today }: { lane: TitleLane; today: string }) {
  if (lane.state === "not_licensed") return <span className="tag tag--pending">Source unavailable</span>;
  const ok = lane.freshness?.last_ok_at ?? null;
  const age = ok ? Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(ok)) / 86_400_000) : null;
  if (!ok) return <span className="tag tag--pending">Not yet checked</span>;
  return <span className={`tag ${age != null && age > STALE_DAYS ? "tag--pending" : "tag--gold"}`}>{age != null && age > STALE_DAYS ? "Stale · " : ""}Checked {day(ok)}</span>;
}

export function Holder({ belt }: { belt: TitleBeltStatus }) {
  if (belt.status === "vacant" || !belt.holder) return <span className="dim">Vacant</span>;
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
          {b.reign_start ? <span className="fine">Since {fmtDate(b.reign_start.on)}{b.reign_start.basis ? ` (${b.reign_start.basis.replace(/_/g, " ")})` : ""}</span> : null}
          {b.mandatory ? <span className="fine">Mandatory, as printed: {b.mandatory.as_printed}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function docDate(doc: TitleDocument) {
  return doc.as_of_label ? `As of ${doc.as_of_label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}` : doc.published_on ? `Published ${fmtDate(doc.published_on)}` : `Read ${day(doc.retrieved_at)}`;
}

export function LaneCard({ lane, today, division }: { lane: TitleLane; today: string; division: string }) {
  const [primary, ...others] = lane.documents;
  return (
    <article className={`lane lane--${lane.state}`} aria-label={`${lane.short_name} ${division}`}>
      <header className="lane__head">
        <div><div className="belt__org">{lane.short_name}</div><div className="belt__name">{lane.name}</div></div>
        <Freshness lane={lane} today={today} />
      </header>

      {lane.state === "not_licensed" ? (
        <div className="lane__closed">
          <b>Not licensed</b>
          <span>PropBetEdge has no permission to collect {lane.short_name} data, so this lane holds no {lane.short_name} champion or ranking. It is closed on purpose, not missing.</span>
        </div>
      ) : lane.state === "no_snapshot" || !primary ? (
        <div className="lane__closed"><b>No snapshot yet</b><span>The {lane.short_name} source is approved but no {division.toLowerCase()} document has been stored.</span></div>
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
                <b>{c.belt}</b>: {DOC_LABEL[c.left_document] ?? c.left_document} says {c.left ?? "nothing"}; {DOC_LABEL[c.right_document] ?? c.right_document} says {c.right ?? "nothing"}. Not resolved by PropBetEdge.
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

      {lane.state !== "not_licensed" ? <p className="fine lane__attr">Source: {lane.name} ({BODY_HOME[lane.body] ?? "official site"}). Facts only.</p> : null}
    </article>
  );
}
