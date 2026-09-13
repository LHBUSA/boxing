import Link from "next/link";
import type { ReactNode } from "react";
import { FighterArt } from "./FighterArt";
import { divisionLabel, fmtDate, fmtDateShort, fmtLb, fmtRecord, methodLabel, plural, scoreVerdict, weekday, monthDay, cityLine } from "@/lib/format";
import { boutPath, eventPath, fighterPath } from "@/lib/slug";
import { metricView } from "@/lib/dna";
import type { BoutCompact, Corner, DnaMetric, EventSummary, RecordSummary, Result, Scorecard } from "@/lib/types";

/* ------------------------------------------------------------------ basics */

export function SecHead({ kicker, title, children, action }: { kicker?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <header className="sec-head">
      <div>
        {kicker ? <div className="eyebrow">{kicker}</div> : null}
        <h2>{title}</h2>
        {children ? <p>{children}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Note({ title, children, pending = false }: { title: string; children?: ReactNode; pending?: boolean }) {
  return (
    <div className={`note${pending ? " note--pending" : ""}`}>
      <span className="note__dot" aria-hidden="true" />
      <div><b>{title}</b>{children}</div>
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i}>{it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}{i < items.length - 1 ? <span aria-hidden="true"> / </span> : null}</span>
      ))}
    </nav>
  );
}

export function Unavailable({ what }: { what: string }) {
  return (
    <div className="wrap page">
      <Note title={`${what} is temporarily unavailable`} pending>The Boxing data service did not answer. Nothing is shown rather than a stale or guessed view.</Note>
    </div>
  );
}

/* ------------------------------------------------------------------ result language */

export function shortResult(r: Result | null | undefined, rounds: number | null | undefined): string | null {
  if (!r) return null;
  const m = methodLabel(r, true);
  if (!m) return r.outcome === "draw" ? "Draw" : null;
  if (r.method === "DECISION") return `${r.outcome === "draw" ? m : m}${rounds ? ` · ${rounds} rds` : ""}`;
  return `${m}${r.round ? ` · R${r.round}` : ""}`;
}

export function verdictLine(b: Pick<BoutCompact, "a" | "b" | "result" | "scheduled_rounds">): string | null {
  const r = b.result;
  if (!r) return null;
  const how = shortResult(r, b.scheduled_rounds);
  if (r.outcome === "win" && r.winner_side) {
    const w = r.winner_side === "a" ? b.a : b.b;
    const l = r.winner_side === "a" ? b.b : b.a;
    if (w && l) return `${w.name} def. ${l.name}${how ? ` · ${how}` : ""}`;
  }
  if (r.outcome === "draw") return `Draw${how && how !== "Draw" ? ` · ${how}` : ""}`;
  if (r.outcome === "no_contest") return "No contest";
  return how;
}

export function RChip({ r }: { r: string | null }) {
  const k = (r ?? "").toLowerCase();
  return <span className={`rchip${k ? ` rchip--${k}` : ""}`}>{r ?? "–"}</span>;
}

export function FormStrip({ results }: { results: (string | null)[] }) {
  if (!results.length) return null;
  return <span className="form" aria-label="Recent verified results, newest first">{results.map((r, i) => <RChip key={i} r={r} />)}</span>;
}

export const surname = (name: string) => name.replace(/[“"][^”"]*[”"]/g, "").trim().split(/\s+/).filter((t) => !/^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(t)).pop() ?? name;

/* ------------------------------------------------------------------ poster (hero) */

export function PosterCard({ bout, event, recA, recB, eyebrow, badge, actions, foot }: {
  bout: BoutCompact; event: { public_id: string; name: string; date: string } & Partial<EventSummary>;
  recA?: RecordSummary | null; recB?: RecordSummary | null; eyebrow: string; badge?: ReactNode; actions?: ReactNode; foot?: ReactNode;
}) {
  const a = bout.a;
  const b = bout.b;
  const win = bout.result?.winner_side;
  const place = [event.venue?.name, cityLine(event.venue)].filter(Boolean).join(" · ");
  return (
    <article className="poster">
      <div className="poster__top"><span className="eyebrow">{eyebrow}</span>{badge}</div>
      <Link href={boutPath(bout)} className="poster__stage" aria-label={`${a?.name} vs ${b?.name}`}>
        <FighterArt name={a?.name ?? "Corner A"} id={a?.public_id ?? "a"} corner={a?.corner ?? "red"} portrait={a?.portrait} side="a" credit={false} />
        <FighterArt name={b?.name ?? "Corner B"} id={b?.public_id ?? "b"} corner={b?.corner ?? "blue"} portrait={b?.portrait} side="b" credit={false} />
        <span className="poster__vs">vs</span>
        <span className="poster__names">
          <span>
            <span className="poster__name" style={{ display: "block" }}>{a?.name}</span>
            <span className="poster__rec">{recA ? fmtRecord(recA) : ""}{win === "a" ? <span className="gold"> · Winner</span> : null}</span>
          </span>
          <span style={{ textAlign: "right" }}>
            <span className="poster__name poster__name--b" style={{ display: "block" }}>{b?.name}</span>
            <span className="poster__rec">{win === "b" ? <span className="gold">Winner · </span> : null}{recB ? fmtRecord(recB) : ""}</span>
          </span>
        </span>
      </Link>
      <div className="poster__body">
        <h3 className="poster__title">{a && b ? `${surname(a.name)} vs. ${surname(b.name)}` : event.name}</h3>
        <div className="poster__meta">
          {fmtDate(event.date, { weekday: true })}{place ? ` · ${place}` : ""}<br />
          {[divisionLabel(bout.weight), bout.scheduled_rounds ? `${bout.scheduled_rounds} rounds` : null, event.commission?.name].filter(Boolean).join(" · ")}
        </div>
        {bout.result ? <div className="mcard__res mt-2"><span className="tag tag--gold">Final</span>{verdictLine(bout)}</div> : null}
        {actions ? <div className="poster__actions">{actions}</div> : null}
        <PhotoCredits corners={[a, b]} />
      </div>
      {foot ? <div className="poster__foot">{foot}</div> : null}
    </article>
  );
}

/* ------------------------------------------------------------------ matchup card */

export function MatchupCard({ bout, event }: { bout: BoutCompact; event?: { public_id: string; name: string; date: string } }) {
  const a = bout.a;
  const b = bout.b;
  const win = bout.result?.winner_side;
  const ev = event ?? bout.event;
  return (
    <Link href={boutPath(bout)} className="mcard">
      <div className="mcard__art">
        <FighterArt name={a?.name ?? "A"} id={a?.public_id ?? "a"} corner={a?.corner ?? "red"} portrait={a?.portrait} side="a" credit={false} />
        <FighterArt name={b?.name ?? "B"} id={b?.public_id ?? "b"} corner={b?.corner ?? "blue"} portrait={b?.portrait} side="b" credit={false} />
        <span className="mcard__vs">vs</span>
      </div>
      <div className="mcard__body">
        <div className="mcard__names">
          <span className={`mcard__n${win === "b" ? " is-lose" : ""}`}>{a?.name}</span>
          <span className={`mcard__n mcard__n--b${win === "a" ? " is-lose" : ""}`}>{b?.name}</span>
        </div>
        <div className="mcard__meta">
          <span>{[divisionLabel(bout.weight), bout.scheduled_rounds ? `${bout.scheduled_rounds} rds` : null].filter(Boolean).join(" · ") || "Division not on sheet"}</span>
          {ev ? <span>{fmtDateShort(ev.date)}</span> : null}
        </div>
        {bout.result ? (
          <div className="mcard__res"><span className="tag tag--gold">Final</span>{verdictLine(bout)}</div>
        ) : <div className="mcard__res dim">{ev && ev.date < new Date().toISOString().slice(0, 10) ? "Result not recorded" : "Scheduled"}</div>}
        {bout.scorecards.some((c) => c.a_total != null) ? <CardChips cards={bout.scorecards} /> : null}
        <PhotoCredits corners={[a, b]} />
      </div>
    </Link>
  );
}

export function PhotoCredits({ corners }: { corners: (Corner | null | undefined)[] }) {
  const withPhoto = corners.filter((c): c is Corner => Boolean(c?.portrait));
  if (!withPhoto.length) return null;
  return (
    <p className="poster__credit">
      {withPhoto.map((c, i) => <span key={c.public_id}>{i ? " · " : ""}{c.name.split(" ")[0]} photo: {c.portrait!.credit}, {c.portrait!.license}</span>)}
    </p>
  );
}

export function CardChips({ cards }: { cards: Scorecard[] }) {
  const known = cards.filter((c) => c.a_total != null && c.b_total != null);
  if (!known.length) return null;
  return <span className="cards" aria-label="Official judges' totals">{known.map((c, i) => <span key={i}>{c.a_total}–{c.b_total}</span>)}</span>;
}

/* ------------------------------------------------------------------ compact bout line */

export function BoutLine({ bout, completeEvent, showEvent = false }: { bout: BoutCompact; completeEvent: boolean; showEvent?: boolean }) {
  const a = bout.a;
  const b = bout.b;
  const win = bout.result?.winner_side;
  const meta = [showEvent && bout.event ? `${fmtDateShort(bout.event.date)} · ${bout.event.name}` : null, divisionLabel(bout.weight), bout.scheduled_rounds ? `${bout.scheduled_rounds} rds` : null].filter(Boolean).join(" · ");
  return (
    <div className="bline">
      <div className="bline__who">
        <Link href={boutPath(bout)} className="bline__faces" aria-label="Open bout">
          <FighterArt name={a?.name ?? "A"} id={a?.public_id ?? "a"} corner={a?.corner ?? "red"} portrait={a?.portrait} side="a" variant="thumb" />
          <FighterArt name={b?.name ?? "B"} id={b?.public_id ?? "b"} corner={b?.corner ?? "blue"} portrait={b?.portrait} side="b" variant="thumb" />
        </Link>
        <div className="bline__names">
          {a ? <Link href={fighterPath(a)} className={win === "a" ? "is-win" : win === "b" ? "is-lose" : ""}>{a.name}</Link> : null}
          {b ? <Link href={fighterPath(b)} className={win === "b" ? "is-win" : win === "a" ? "is-lose" : ""}>{b.name}</Link> : null}
          <div className="bline__meta">{meta || "Division not on sheet"}</div>
        </div>
      </div>
      <Link href={boutPath(bout)} className="bline__res">
        {bout.result
          ? <span className="bline__method">{shortResult(bout.result, bout.scheduled_rounds)}</span>
          : <span className={`bline__method bline__method--pending`}>{completeEvent ? "Result not recorded" : "Scheduled"}</span>}
        <CardChips cards={bout.scorecards} />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ next card tile */

export function CardTile({ e, today }: { e: EventSummary; today: string }) {
  const md = monthDay(e.date);
  const days = Math.round((Date.parse(`${e.date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
  return (
    <Link href={eventPath(e)} className="ncard">
      <div className="ncard__date">
        <span className="ncard__day">{md.day}</span>
        <span className="ncard__mon">{md.month} · {weekday(e.date)}</span>
        <span className="tag" style={{ marginLeft: "auto" }}>{days <= 0 ? "Fight night" : `${days}d`}</span>
      </div>
      <div className="ncard__name">{e.name}</div>
      <div className="ncard__meta">{[e.venue?.name, cityLine(e.venue) ?? e.commission?.jurisdiction].filter(Boolean).join(" · ") || e.commission?.jurisdiction}</div>
      <div className="ncard__state">
        {e.bout_count ? <span className="tag tag--gold">{plural(e.bout_count, "bout")} on record</span> : <span className="tag tag--pending">Bout sheet pending</span>}
        {e.commission ? <span className="tag">{e.commission.jurisdiction ?? e.commission.name}</span> : null}
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ official scorecard */

export function ScorecardView({ bout, aName, bName, title, compact = false, source }: { bout: Pick<BoutCompact, "scorecards" | "result">; aName: string; bName: string; title?: string; compact?: boolean; source?: ReactNode }) {
  const cards = bout.scorecards;
  const v = scoreVerdict(cards);
  const scale = Math.max(6, ...cards.map((c) => (c.a_total != null && c.b_total != null ? Math.abs(c.a_total - c.b_total) : 0)));
  const kind = bout.result?.outcome === "draw" ? `${bout.result?.decision_type ?? ""} draw` : bout.result?.decision_type ? `${bout.result.decision_type} decision` : "Decision";
  return (
    <div className={`scorecard${compact ? " scorecard--compact" : ""}`}>
      <div className="scorecard__head">
        <h3>{title ?? "Official scorecards"}</h3>
        <span className="tag tag--gold" style={{ textTransform: "uppercase" }}>{kind.trim()}</span>
      </div>
      <div className="scorecard__row scorecard__row--hd">
        <span>Judge</span><span className="ca">{surname(aName)}</span><span className="cb">{surname(bName)}</span><span>Card lean</span>
      </div>
      {cards.map((c, i) => {
        const m = c.a_total != null && c.b_total != null ? c.a_total - c.b_total : null;
        const pct = m == null ? 0 : Math.min(50, (Math.abs(m) / scale) * 50);
        return (
          <div className="scorecard__row" key={i}>
            <span className="scorecard__judge">
              {c.judge_public_id ? <Link href={`/officials/${c.judge_public_id.slice(-32).slice(0, 12)}`}>{c.judge}</Link> : c.judge}
              <small>{c.revision > 1 ? `Revised card · rev ${c.revision}` : "Official total"}</small>
            </span>
            <span className={`scorecard__tot${m != null && m > 0 ? " is-a" : m === 0 ? " is-even" : ""}`}>{c.a_total ?? "—"}</span>
            <span className={`scorecard__tot${m != null && m < 0 ? " is-b" : m === 0 ? " is-even" : ""}`}>{c.b_total ?? "—"}</span>
            <span>
              <span className="lean" aria-hidden="true">
                {m ? <i style={m > 0 ? { right: "50%", width: `${pct}%`, background: "#b0272c" } : { left: "50%", width: `${pct}%`, background: "#1f5fbd" }} /> : null}
              </span>
              <span className="lean__lbl">{m == null ? "Total not published" : m === 0 ? "Even card" : `${Math.abs(m)} for ${surname(m > 0 ? aName : bName)}`}</span>
            </span>
          </div>
        );
      })}
      <div className="scorecard__foot">
        <span><b>{v.a}</b> for {surname(aName)} · <b>{v.b}</b> for {surname(bName)}{v.even ? <> · <b>{v.even}</b> even</> : null}</span>
        {source ?? <span>Round-by-round cards not published in this commission document</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ comparison + DNA bars */

export interface CmpRow { label: string; a: string | null; b: string | null; an?: number | null; bn?: number | null }
export function CompareBars({ rows, aName, bName }: { rows: CmpRow[]; aName: string; bName: string }) {
  return (
    <div className="cmp" role="table" aria-label="Side-by-side comparison">
      <div className="cmp__head" role="row"><span role="columnheader">{aName}</span><span role="columnheader" /><span role="columnheader">{bName}</span></div>
      {rows.map((r) => {
        const max = Math.max(r.an ?? 0, r.bn ?? 0);
        const wa = r.an != null && max > 0 ? Math.max(6, (r.an / max) * 100) : 0;
        const wb = r.bn != null && max > 0 ? Math.max(6, (r.bn / max) * 100) : 0;
        return (
          <div className="cmp__row" role="row" key={r.label}>
            <span className="cmp__val cmp__val--a" role="cell"><b className={r.a == null ? "is-na" : ""}>{r.a ?? "Not on record"}</b>{r.an != null ? <span className="cmp__bar"><i style={{ width: `${wa}%` }} /></span> : null}</span>
            <span className="cmp__label" role="rowheader">{r.label}</span>
            <span className="cmp__val cmp__val--b" role="cell"><b className={r.b == null ? "is-na" : ""}>{r.b ?? "Not on record"}</b>{r.bn != null ? <span className="cmp__bar"><i style={{ width: `${wb}%` }} /></span> : null}</span>
          </div>
        );
      })}
    </div>
  );
}

const DNA_KEYS = ["results.win_rate", "results.stoppage_win_share", "results.decision_win_share", "finishing.early_stoppage_share", "durability.rounds_completed_ratio", "results.distance_rate", "results.stoppage_loss_rate"];

export function DnaBars({ a, b, aName, bName, keys = DNA_KEYS }: { a: DnaMetric[]; b?: DnaMetric[]; aName: string; bName?: string; keys?: string[] }) {
  const two = Boolean(b);
  const rows = keys.map((k) => ({ k, va: metricView(k, a), vb: b ? metricView(k, b) : null }))
    .filter((r) => r.va.state === "available" || r.va.state === "building" || r.vb?.state === "available" || r.vb?.state === "building");
  if (!rows.length) return <Note title="Fight DNA building">Fight DNA appears once verified bouts have been processed for {two ? "these boxers" : aName}.</Note>;
  const anyAvailable = rows.some((r) => r.va.state === "available" || r.vb?.state === "available");
  if (!anyAvailable) {
    const need = rows.map((r) => r.va.sample ?? r.vb?.sample).find(Boolean);
    return <Note title="Fight DNA builds as verified bouts accumulate">{two ? "Neither boxer has" : `${aName} does not have`} enough verified bouts yet for a rate to be meaningful{need ? ` (${need})` : ""}. Values appear here automatically once each metric clears its minimum sample; nothing is estimated before then.</Note>;
  }
  const pct = (v: { raw: number | null; state: string }) => (v.state === "available" && v.raw != null ? Math.min(100, Math.max(3, v.raw * 100)) : 0);
  const cell = (v: ReturnType<typeof metricView>, side: "a" | "b" | "one") => (
    <span className={`dnabar__v dnabar__v--${side}`}>
      {v.state === "available" ? <><b>{v.value}</b><span className="dnabar__track"><i style={{ width: `${pct(v)}%` }} /></span><small>{v.sample}</small></>
        : <span className="dnabar__state">{v.state === "building" ? `Building · ${v.sample}` : "Not available"}</span>}
    </span>
  );
  return (
    <div className="dnabars">
      {rows.map((r) => (
        <div key={r.k}>
          <div className="dnabar__top"><span>{r.va.label}</span></div>
          <div className={`dnabar__vals${two ? "" : " dnabar__vals--one"}`}>
            {cell(r.va, two ? "a" : "one")}
            {two && r.vb ? cell(r.vb, "b") : null}
          </div>
        </div>
      ))}
      <p className="fine">PropBetEdge-derived from verified bouts; each value shows its sample (n). Result shares describe how bouts ended, not punching power. Punch-stat metrics need a licensed source and are not shown.</p>
    </div>
  );
}

export const cornerOf = (c: Corner | null | undefined, side: "a" | "b") => c?.corner ?? (side === "a" ? "red" : "blue");
export const weightText = (c: Corner | null | undefined) => fmtLb(c?.weigh_in?.weight_lb) ?? null;
