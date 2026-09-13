import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { fighterPath } from "@/lib/slug";
import { Chip, Eyebrow, RingFrame, Ropes, SectionHead, StateNote, Unavailable } from "@/components/ui";
import type { Division, SanctioningBody, TitleMap } from "@/lib/types";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "World Title Map",
  description: "Boxing's fragmented world titles, division by division: WBC, WBA, IBF and WBO belts kept separate, with every champion from cleared sanctioning-body records only.",
};

const TIERS: [string, string][] = [
  ["World / full", "An organization's main championship in a division."],
  ["Super", "WBA designation above its regular champion, typically for a boxer holding several belts."],
  ["Regular", "WBA world title that can coexist with a WBA super champion."],
  ["Interim", "A placeholder title while the full champion is inactive or injured. Never counts toward undisputed."],
  ["Franchise", "WBC designation for a champion excused from mandatory defences. Tracked separately."],
  ["Vacant", "No current holder on record."],
];

const SOURCE_STATE: Record<string, string> = { approved: "Cleared", unknown: "Under source review", review_required: "Under source review", blocked: "Not licensed" };

function Lane({ org, body }: { org: TitleMap["organizations"][number]; body: SanctioningBody | undefined }) {
  return (
    <div className="lane">
      <header className="lane__head">
        <span className="lane__org">{body?.short_name ?? org.organization_slug.toUpperCase()}</span>
        <span className="muted">{body?.name}</span>
      </header>
      {org.belts.map((b, i) => (
        <div key={i} className={`belt belt--${b.status}`}>
          <div className="belt__tier">{b.source_native_label ?? b.tier}</div>
          {b.holder ? (
            <>
              <Link className="belt__holder" href={fighterPath({ public_id: b.holder.public_id, name: b.holder.display_name })}>{b.holder.display_name}</Link>
              <div className="muted">{b.holder.started_on ? `Reign from ${fmtDate(b.holder.started_on)}` : "Reign start not on record"}</div>
            </>
          ) : <div className="belt__vacant">Vacant</div>}
          {b.last_change ? <div className="fine">Last title event: {b.last_change.event_type.replace(/_/g, " ")}{b.last_change.effective_on ? `, ${fmtDate(b.last_change.effective_on)}` : ""}</div> : null}
        </div>
      ))}
      {org.overlapping_champions.length ? <p className="fine">Several champions recognised by this body at once; each belt is listed separately.</p> : null}
    </div>
  );
}

export default async function TitlesPage({ searchParams }: { searchParams: Promise<{ division?: string; gender?: string }> }) {
  const sp = await searchParams;
  const gender = sp.gender === "female" ? "female" : "male";
  const res0 = await gateway.titles(null, gender);
  if (!res0.ok) return <Unavailable what="The World Title Map" />;
  const divisions = res0.data.board.divisions.filter((d: Division) => gender === "female" || d.gender_scope !== "female");
  const selected = divisions.find((d) => d.class_key === sp.division) ?? divisions.find((d) => d.class_key === "welterweight") ?? divisions[0];
  const res = await gateway.titles(selected.class_key, gender);
  const board = res.ok ? res.data.board : res0.data.board;
  const map = res.ok ? res.data.map : null;
  const lanes = map?.organizations.filter((o) => o.belts.length) ?? [];
  const bodies = board.organizations;
  const link = (division: string, g = gender) => `/titles?${new URLSearchParams({ division, ...(g === "female" ? { gender: g } : {}) })}`;

  return (
    <div className="wrap page-pad">
      <Eyebrow>Signature map · four sanctioning bodies · every belt separate</Eyebrow>
      <h1 className="page-title">World Title Map</h1>
      <p className="page-lede">Boxing has no single champion per division. The WBC, WBA, IBF and WBO each crown their own, sometimes several at once. This map never merges them.</p>

      <div className="titles">
        <aside className="ladder" aria-label="Divisions">
          <div className="seg seg--small" role="tablist" aria-label="Division scope">
            <Link role="tab" aria-selected={gender === "male"} className={`seg__btn${gender === "male" ? " is-on" : ""}`} href={link(selected.class_key, "male")}>Men</Link>
            <Link role="tab" aria-selected={gender === "female"} className={`seg__btn${gender === "female" ? " is-on" : ""}`} href={link(selected.class_key, "female")}>Women</Link>
          </div>
          <ol className="ladder__list">
            {[...divisions].reverse().map((d) => (
              <li key={d.class_key}>
                <Link href={link(d.class_key)} className={`ladder__item${d.class_key === selected.class_key ? " is-on" : ""}`} aria-current={d.class_key === selected.class_key ? "page" : undefined}>
                  <span className="ladder__name">{d.name}</span>
                  <span className="ladder__lb">{d.max_lb ? `${d.max_lb} lb` : "No limit"}</span>
                </Link>
              </li>
            ))}
          </ol>
        </aside>

        <div className="titles__main">
          <RingFrame as="section" className="divhead">
            <div>
              <Eyebrow>{gender === "female" ? "Women's" : "Men's"} division</Eyebrow>
              <h2 className="divhead__name">{selected.name}</h2>
              <div className="divhead__limit">{selected.max_lb ? `Limit ${selected.max_lb} lb · ${selected.max_kg} kg` : "No upper limit"}</div>
              {selected.notes ? <p className="fine">{selected.notes}</p> : null}
            </div>
            <div className="divhead__stats">
              <span><strong>{selected.title_records ?? 0}</strong> title records</span>
              <span><strong>{selected.verified_bouts ?? 0}</strong> verified bouts in this division</span>
            </div>
          </RingFrame>

          {lanes.length ? (
            <>
              <div className="lanes">{lanes.map((o) => <Lane key={o.organization_slug} org={o} body={bodies.find((b) => b.slug === o.organization_slug)} />)}</div>
              {map?.derived.unification.length ? (
                <div className="derived">
                  <Chip kind="derived">PropBetEdge-derived · {map.derived.version}</Chip>
                  {map.derived.unification.map((u) => <p key={u.display_name}><strong>{u.display_name}</strong>: {u.state} ({u.organizations.map((o) => o.organization_slug.toUpperCase()).join(", ")})</p>)}
                </div>
              ) : null}
            </>
          ) : (
            <StateNote kind="review" title={`${selected.name} title lineage is under source review`}>
              World-title records from the WBC, WBA, IBF and WBO are not yet cleared for display. A champion appears here only from a cleared sanctioning-body record, never inferred from results, press or rankings, so no lane is drawn yet.
            </StateNote>
          )}

          <section className="bodies">
            <SectionHead kicker="Tracked sanctioning bodies" title="Source status" />
            <div className="bodies__grid" role="table" aria-label="Sanctioning bodies">
              <div className="bodies__row bodies__row--head" role="row">
                <span role="columnheader">Body</span><span role="columnheader">Title data</span><span role="columnheader" className="num">Title records</span><span role="columnheader" className="num">Ranking snapshots</span>
              </div>
              {bodies.map((b) => (
                <div className="bodies__row" role="row" key={b.slug}>
                  <span role="cell"><strong>{b.short_name}</strong> <span className="muted">{b.name}</span></span>
                  <span role="cell"><Chip kind={b.display_allowed ? "verified" : "review"}>{b.display_allowed ? "Cleared" : SOURCE_STATE[b.source_state ?? "unknown"] ?? "Under source review"}</Chip></span>
                  <span role="cell" className="num">{b.title_records}</span>
                  <span role="cell" className="num">{b.ranking_snapshots}</span>
                </div>
              ))}
            </div>
          </section>

          <Ropes />
          <section>
            <SectionHead kicker="Distinct, never collapsed" title="How to read a belt" />
            <dl className="tiers">
              {TIERS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              <div className="tiers__derived"><dt>Undisputed <Chip kind="derived">PropBetEdge-derived</Chip></dt><dd>One boxer holding the primary world title of all four bodies (WBA super ahead of WBA regular). Interim, franchise, silver and regional belts never count. Two or three bodies make a boxer unified. Rule pbe_undisputed@1.</dd></div>
            </dl>
          </section>
          <p className="fine">No sanctioning-body logos or belts are reproduced. {plural(board.title_bouts, "title bout")} on verified record.</p>
        </div>
      </div>
    </div>
  );
}
