import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { refOf } from "@/lib/slug";
import { FighterArt } from "@/components/FighterArt";
import { Note, ScorecardView, SecHead, Unavailable, verdictLine } from "@/components/fight";

export const revalidate = 300;
export const metadata: Metadata = { title: "Scorecard Center", description: "Every decision with official judges' cards on record: unanimous, split and majority decisions, card by card, with the spread between judges." };

const KINDS = [["", "All"], ["split", "Split"], ["majority", "Majority"], ["unanimous", "Unanimous"], ["draw", "Draws"]] as const;

export default async function ScorecardsPage({ searchParams }: { searchParams: Promise<{ decision?: string; sort?: string; commission?: string }> }) {
  const sp = await searchParams;
  const decision = ["split", "majority", "unanimous", "draw"].includes(sp.decision ?? "") ? sp.decision! : null;
  const sort = sp.sort === "spread" ? "spread" : "recent";
  const commission = sp.commission && /^[a-z0-9-]{2,40}$/.test(sp.commission) ? sp.commission : null;
  const res = await gateway.scorecards({ decision, sort, commission, limit: 60 });
  if (!res.ok) return <Unavailable what="The Scorecard Center" />;
  const d = res.data;
  const href = (p: { decision?: string | null; sort?: string; commission?: string | null }) => {
    const s = new URLSearchParams();
    const dv = p.decision === undefined ? decision : p.decision;
    const so = p.sort ?? sort;
    const cm = p.commission === undefined ? commission : p.commission;
    if (dv) s.set("decision", dv);
    if (so === "spread") s.set("sort", "spread");
    if (cm) s.set("commission", cm);
    const q = s.toString();
    return `/scorecards${q ? `?${q}` : ""}`;
  };
  const lead = d.rows[0];
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Scorecard Center · official judges&apos; cards</div>
        <h1>Three judges. One decision.</h1>
        <p>{plural(d.counts.all, "decision")} on record carry the judges&apos; official totals: {d.counts.unanimous} unanimous, {d.counts.split} split, {d.counts.majority} majority and {d.counts.draw} draws. The numbers are shown as the commissions published them.</p>
      </header>
      <div className="tiles">
        <div className="tile"><b className="gold">{d.counts.split}</b><span>Split decisions</span></div>
        <div className="tile"><b>{d.counts.majority}</b><span>Majority decisions</span></div>
        <div className="tile"><b>{d.counts.unanimous}</b><span>Unanimous decisions</span></div>
        <div className="tile"><b>{d.widest_spread ?? "—"}</b><span>Widest judge spread</span><small>points between the most apart cards</small></div>
      </div>
      <div className="filters mt-3">
        <div className="seg">{KINDS.map(([k, l]) => <Link key={l} className={(decision ?? "") === k ? "is-on" : ""} href={href({ decision: k || null })}>{l}</Link>)}</div>
        <div className="seg"><Link className={sort === "recent" ? "is-on" : ""} href={href({ sort: "recent" })}>Most recent</Link><Link className={sort === "spread" ? "is-on" : ""} href={href({ sort: "spread" })}>Widest spread</Link></div>
        <div className="scroll-x">
          <Link className={`pill${!commission ? " is-on" : ""}`} href={href({ commission: null })}>All</Link>
          {d.commissions.map((c) => <Link key={c.slug} className={`pill${commission === c.slug ? " is-on" : ""}`} href={href({ commission: c.slug })}>{c.name.replace(/ State Athletic (Commission|Control Board)/, "")} · {c.n}</Link>)}
        </div>
      </div>

      {!d.rows.length ? <Note title="No decision matches this filter" /> : null}
      {lead?.a && lead?.b ? (
        <section className="split mt-3">
          <div>
            <div className="eyebrow">{sort === "spread" ? "Widest spread in view" : "Latest in view"} · {fmtDate(lead.event.date)}</div>
            <h2 className="serif mt-1" style={{ fontSize: "clamp(28px,3.4vw,40px)", fontWeight: 900 }}>{lead.a.name} <span className="gold" style={{ fontStyle: "italic" }}>vs</span> {lead.b.name}</h2>
            <p className="dim mt-1">{verdictLine(lead)} · {lead.event.name}</p>
            <div className="mt-3"><ScorecardView bout={lead} aName={lead.a.name} bName={lead.b.name} /></div>
            <Link className="btn btn--gold btn--sm mt-2" href={`/scorecards/${refOf(lead.public_id)}`}>Open the scorecard</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignSelf: "start" }}>
            <FighterArt name={lead.a.name} id={lead.a.public_id} corner={lead.a.corner ?? "red"} portrait={lead.a.portrait} side="a" />
            <FighterArt name={lead.b.name} id={lead.b.public_id} corner={lead.b.corner ?? "blue"} portrait={lead.b.portrait} side="b" />
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <SecHead kicker={`${plural(d.total, "decision")} in view`} title="Decisions on Record" />
        <div className="blist">
          {d.rows.slice(lead ? 1 : 0).map((b) => {
            const spread = b.spread;
            return (
              <Link key={b.public_id} href={`/scorecards/${refOf(b.public_id)}`} className="bline">
                <span className="bline__names">
                  <span style={{ color: "var(--paper)", fontWeight: 600, display: "block" }} className="truncate">{b.a?.name} vs {b.b?.name}</span>
                  <span className="bline__meta">{fmtDate(b.event.date)} · {b.event.name}</span>
                </span>
                <span className="bline__res">
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}><span className={`tag ${b.kind === "split" ? "tag--gold" : ""}`}>{b.kind === "draw" ? "Draw" : b.kind}</span>{spread != null ? <span className="mono faint" style={{ fontSize: 11 }}>spread {spread}</span> : null}</span>
                  <span className="cards">{b.scorecards.map((s, i) => <span key={i}>{s.a_total}–{s.b_total}</span>)}</span>
                </span>
              </Link>
            );
          })}
        </div>
        <p className="fine mt-2">Spread is the gap in points between the two judges whose cards were furthest apart. It is a description of the published numbers, not a judgment of any official. {d.round_cards_bouts ? `${plural(d.round_cards_bouts, "decision")} include round-by-round cards.` : "Round-by-round cards are not published in the covered commission documents yet."}</p>
      </section>
    </div>
  );
}
