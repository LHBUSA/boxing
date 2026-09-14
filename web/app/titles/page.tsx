import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { todayUtc } from "@/lib/gateway";
import { Note, SecHead, Unavailable } from "@/components/fight";
import { LaneCard } from "@/components/titles";

export const revalidate = 1800;
export const metadata: Metadata = { title: "World Title Map", description: "Boxing's world titles division by division in four separate lanes: WBC, WBA, IBF and WBO, each from its own official documents, with source dates and disagreements shown." };

const TIERS: [string, string][] = [
  ["World / full", "An organization's main championship in a division."],
  ["Super", "WBA designation above its regular champion."],
  ["Regular", "WBA world title that can coexist with a super champion."],
  ["Interim", "Placeholder while the full champion is out. Never counts toward undisputed."],
  ["Franchise", "WBC designation excusing mandatory defences. Tracked separately."],
  ["Undisputed", "PropBetEdge-derived only from every body's own official holdings (rule pbe_undisputed@1). Not derivable while any body's statement is unavailable."],
];

// Each body's own title vocabulary, as published on its site (source review 2026-09-14, docs/TITLES_RANKINGS_SOURCES_2026-09-14.md).
// Reference text only: no champion is derived from it.
const BODIES: { short: string; labels: string[]; status: string }[] = [
  { short: "WBC", labels: ["Champion", "Interim Champion", "Franchise Champion", "Champion in Recess", "Champion Emeritus", "Silver"], status: "Not licensed. No WBC data is collected; labels listed for reference." },
  { short: "WBA", labels: ["Super Champion", "World Champion", "Interim Champion", "Gold", "Champion in Recess", "Vacant"], status: "Official ranking and champions pages, collected with attribution." },
  { short: "IBF", labels: ["Champion", "Interim Champion", "Title Vacant"], status: "Official monthly ratings, collected with attribution back to 2005." },
  { short: "WBO", labels: ["Super Champion", "Champion", "Interim Champion", "Vacant"], status: "Official ratings PDF and champions page, collected with attribution." },
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
  const lanes = res.ok ? res.data.lanes : null;
  const link = (division: string, g = gender) => `/titles?${new URLSearchParams({ division, ...(g === "female" ? { gender: g } : {}) })}`;
  const today = todayUtc();
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">World Title Map · four sanctioning bodies</div>
        <h1>Four belts. <span className="gold" style={{ fontStyle: "italic" }}>Never merged.</span></h1>
        <p>Boxing has no single champion per division. The WBC, WBA, IBF and WBO each crown their own, sometimes several at once. Each lane below shows one body's own official documents with their dates. When a body's documents disagree, both versions are shown.</p>
      </header>
      <div className="filters">
        <div className="seg"><Link className={gender === "male" ? "is-on" : ""} href={link(sel.class_key, "male")}>Men</Link><Link className={gender === "female" ? "is-on" : ""} href={link(sel.class_key, "female")}>Women</Link></div>
      </div>
      <nav className="ladder" aria-label="Divisions">
        {[...divisions].reverse().map((d) => <Link key={d.class_key} href={link(d.class_key)} className={d.class_key === sel.class_key ? "is-on" : ""}><b>{d.name}</b><span>{d.max_lb ? `${d.max_lb} lb` : "No limit"}</span></Link>)}
      </nav>
      <section className="mt-4">
        <SecHead kicker={`${sel.max_lb ? `${sel.max_lb} lb · ${sel.max_kg} kg` : "No upper limit"} · WBC | WBA | IBF | WBO`} title={sel.name}>{sel.notes ?? undefined}</SecHead>
        {lanes ? (
          <>
            <div className="belts">{lanes.lanes.map((l) => <LaneCard key={l.body} lane={l} today={today} division={sel.name} />)}</div>
            <div className="derived mt-2">
              <span className="tag">PropBetEdge-derived</span>
              <span><b>Undisputed: {lanes.derived.status === "not_derivable" ? "not derivable" : "pending complete holdings"}.</b> {lanes.derived.reason ? `${lanes.derived.reason.replace(/^own statement unavailable/, "One body's own statement is unavailable")}. ` : ""}PropBetEdge does not call anyone undisputed from three bodies or from other bodies' claims.</span>
            </div>
          </>
        ) : (
          <Note title="Title lanes unavailable" pending>The title lanes for {sel.name.toLowerCase()} did not load. Nothing is shown rather than a guessed view.</Note>
        )}
        <p className="fine mt-2">{board.organizations.length} sanctioning bodies on record. Champion changes seen between monthly documents are held for review; no title history is written from them automatically.</p>
      </section>
      <section className="mt-4">
        <SecHead kicker="Source-native labels · kept exactly as each body publishes them" title="Four Bodies, Four Vocabularies" />
        <div className="belts">
          {BODIES.map((b) => (
            <div className="belt" key={b.short}>
              <div><div className="belt__org">{b.short}</div><div className="belt__name">{b.status}</div></div>
              <div className="belt__slot" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{b.labels.map((l) => <span key={l} className="tag">{l}</span>)}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="band">
        <SecHead kicker="Distinct, never collapsed" title="How to Read a Belt" />
        <div className="factors">{TIERS.map(([k, v]) => <div className="factor" key={k}><b>{k}</b><span>{v}</span></div>)}</div>
        <p className="fine mt-2">No sanctioning-body logos or belts are reproduced.</p>
      </section>
    </div>
  );
}
