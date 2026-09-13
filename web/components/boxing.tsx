import Link from "next/link";
import { Chip, StateNote } from "./ui";
import { Portrait } from "./Portrait";
import {
  cityLine, divisionLabel, fmtDate, fmtDateShort, fmtLb, fmtRecord, methodLabel, monthDay, plural, resultLine, scoreVerdict, weekday,
} from "@/lib/format";
import { boutPath, eventPath, fighterPath } from "@/lib/slug";
import { stateLabel, eventState } from "@/lib/weekend";
import type { BoutCompact, Corner, EventSummary, RecordSummary, Scorecard } from "@/lib/types";

export function CornerDot({ corner }: { corner: "red" | "blue" | null | undefined }) {
  if (!corner) return null;
  return <span className={`cdot cdot--${corner}`} title={`${corner === "red" ? "Red" : "Blue"} corner (official sheet)`} aria-label={`${corner} corner`} />;
}

function FighterName({ c, won, lost }: { c: Corner | null; won: boolean; lost: boolean }) {
  if (!c) return <span className="bn bn--missing">Corner not on record</span>;
  return (
    <Link href={fighterPath(c)} className={`bn${won ? " bn--won" : ""}${lost ? " bn--lost" : ""}`}>
      <CornerDot corner={c.corner} />
      <span className="bn__name">{c.name}</span>
      {won ? <span className="bn__w" aria-label="winner">W</span> : null}
    </Link>
  );
}

export function CardChips({ cards, flip = false }: { cards: Scorecard[]; flip?: boolean }) {
  const known = cards.filter((c) => c.a_total != null && c.b_total != null);
  if (!known.length) return null;
  return (
    <span className="cards" aria-label="Official judges' totals">
      {known.map((c, i) => {
        const [x, y] = flip ? [c.b_total, c.a_total] : [c.a_total, c.b_total];
        return <span key={i} className="cards__one">{x}–{y}</span>;
      })}
    </span>
  );
}

export function ResultCell({ b, completeEvent }: { b: BoutCompact; completeEvent: boolean }) {
  if (!b.result) {
    return completeEvent
      ? <span className="res res--pending">Official result not recorded</span>
      : <span className="res res--muted">Scheduled</span>;
  }
  const r = b.result;
  const label = methodLabel(r, true);
  return (
    <span className="res">
      <span className={`res__method${r.outcome === "win" ? "" : " res__method--neutral"}`}>{r.outcome === "win" ? label : r.outcome === "draw" ? `Draw${label && label !== "Draw" ? ` · ${label}` : ""}` : label ?? r.outcome}</span>
      {r.round && r.method !== "DECISION" ? <span className="res__round">R{r.round}</span> : null}
      {r.revision > 1 ? <Chip kind="review" title="The commission revised this result; earlier versions are kept">Revised</Chip> : null}
    </span>
  );
}

export function BoutRow({ b, completeEvent, showEvent = false }: { b: BoutCompact; completeEvent: boolean; showEvent?: boolean }) {
  const aWon = b.result?.winner_side === "a";
  const bWon = b.result?.winner_side === "b";
  const div = divisionLabel(b.weight);
  return (
    <div className="bout-row">
      <div className="bout-row__order" aria-label="Official sheet order">{b.order ?? "–"}</div>
      <div className="bout-row__names">
        <FighterName c={b.a} won={aWon} lost={bWon} />
        <FighterName c={b.b} won={bWon} lost={aWon} />
      </div>
      <div className="bout-row__meta">
        {showEvent && b.event ? <Link href={eventPath(b.event)} className="bout-row__event">{fmtDateShort(b.event.date)} · {b.event.name}</Link> : null}
        <span>{[div, b.scheduled_rounds ? `${b.scheduled_rounds} rds` : null].filter(Boolean).join(" · ") || "Division not on sheet"}</span>
        {b.titles.length ? <span className="bout-row__titles">{b.titles.map((t) => `${t.organization} ${t.label}`).join(" · ")}</span> : null}
      </div>
      <div className="bout-row__result">
        <ResultCell b={b} completeEvent={completeEvent} />
        <CardChips cards={b.scorecards} />
      </div>
      <Link href={boutPath(b)} className="bout-row__go" aria-label={`Open ${b.a?.name ?? "bout"} vs ${b.b?.name ?? ""}`}>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

export function EventDateBlock({ date }: { date: string }) {
  const md = monthDay(date);
  return (
    <div className="dateblock" aria-hidden="true">
      <span className="dateblock__m">{md.month}</span>
      <span className="dateblock__d">{md.day}</span>
      <span className="dateblock__w">{weekday(date).toUpperCase()}</span>
    </div>
  );
}

export function EventStateChip({ e, today }: { e: EventSummary; today: string }) {
  const s = eventState(e, today);
  const kind = s === "final" ? "final" : s === "today" ? "live" : s === "results_pending" ? "pending" : "soon";
  return <Chip kind={kind}>{stateLabel(e, today)}</Chip>;
}

export function CardFileState({ e }: { e: EventSummary }) {
  if (e.status === "complete" || e.bout_count > 0) {
    return (
      <span className="filestate">
        {plural(e.bout_count, "verified bout")}
        {e.awaiting_verification ? <> · <span className="filestate__pending">{e.awaiting_verification} awaiting identity verification</span></> : null}
      </span>
    );
  }
  return <span className="filestate filestate--muted">Bout sheet not filed yet</span>;
}

export function EventLine({ e, today, showHeadline = true }: { e: EventSummary; today: string; showHeadline?: boolean }) {
  const where = [e.venue?.name, cityLine(e.venue)].filter(Boolean).join(" · ");
  const h = e.headline;
  return (
    <article className="event-line">
      <EventDateBlock date={e.date} />
      <div className="event-line__body">
        <div className="event-line__top">
          <EventStateChip e={e} today={today} />
          {e.commission ? <span className="event-line__comm">{e.commission.jurisdiction ?? e.commission.name}</span> : null}
          {e.title_bouts ? <Chip kind="official">{plural(e.title_bouts, "title bout")}</Chip> : null}
        </div>
        <h3 className="event-line__name"><Link href={eventPath(e)}>{e.name}</Link></h3>
        <div className="event-line__meta">
          {where ? <span>{where}</span> : <span className="muted">Venue not on record yet</span>}
          <CardFileState e={e} />
        </div>
        {showHeadline && h && h.a && h.b ? (
          <Link href={boutPath(h)} className="event-line__headline">
            <span className="eyebrow">{h.scheduled_rounds ? `Longest scheduled · ${h.scheduled_rounds} rds` : "Headline"}</span>
            <span className="event-line__bout">
              <span className={h.result?.winner_side === "a" ? "is-winner" : ""}>{h.a.name}</span>
              <span className="vs">vs</span>
              <span className={h.result?.winner_side === "b" ? "is-winner" : ""}>{h.b.name}</span>
            </span>
            {h.result ? <span className="event-line__res">{resultLine(h.result, h.scheduled_rounds)}</span> : e.status === "complete" ? <span className="event-line__res muted">Official result not recorded</span> : null}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function FormStrip({ results, label = "Last verified bouts, newest first" }: { results: (string | null)[]; label?: string }) {
  if (!results.length) return null;
  return (
    <span className="form" aria-label={label}>
      {results.map((r, i) => <span key={i} className={`form__cell form__cell--${(r ?? "p").toLowerCase()}`}>{r ?? "–"}</span>)}
    </span>
  );
}

export function RecordBadge({ r, big = false }: { r: RecordSummary; big?: boolean }) {
  return (
    <div className={`recbadge${big ? " recbadge--big" : ""}`}>
      <span className="recbadge__rec">{r.bouts ? fmtRecord(r) : "0-0"}</span>
      <span className="recbadge__sub">{r.bouts ? `in ${plural(r.bouts, "verified bout")}` : "no verified bout yet"}</span>
    </div>
  );
}

export function HistoryChip({ bouts }: { bouts: number }) {
  if (bouts >= 3) return <Chip kind="verified" title="Three or more bouts on verified record">Verified history</Chip>;
  if (bouts >= 1) return <Chip kind="limited" title="One or two bouts on verified record; career bouts outside covered commissions are not shown">Limited verified history</Chip>;
  return <Chip kind="first" title="No earlier bout on verified record">First verified bout</Chip>;
}

export function ScorecardTable({ b, aName, bName }: { b: BoutCompact; aName: string; bName: string }) {
  const cards = b.scorecards;
  if (!cards.length) {
    return (
      <StateNote kind="pending" title="Official scorecards not captured" compact>
        {b.result?.method === "DECISION" ? "The commission document for this bout did not include judges' totals we could read." : "No judges' cards are expected for a result that did not go to the scorecards."}
      </StateNote>
    );
  }
  const v = scoreVerdict(cards);
  const verdict = b.result?.decision_type === "split" ? "Split" : b.result?.decision_type === "majority" ? "Majority" : b.result?.decision_type === "unanimous" ? "Unanimous" : null;
  return (
    <div className="scard">
      <div className="scard__grid" role="table" aria-label="Official judges' scorecards">
        <div className="scard__row scard__row--head" role="row">
          <span role="columnheader">Judge</span>
          <span role="columnheader" className="num">{aName}</span>
          <span role="columnheader" className="num">{bName}</span>
          <span role="columnheader" className="num">Margin</span>
        </div>
        {cards.map((c, i) => {
          const m = c.a_total != null && c.b_total != null ? c.a_total - c.b_total : null;
          return (
            <div className="scard__row" role="row" key={i}>
              <span role="cell" className="scard__judge">{c.judge}{c.revision > 1 ? <Chip kind="review">Revised card</Chip> : null}</span>
              <span role="cell" className={`num${m != null && m > 0 ? " is-hi" : ""}`}>{c.a_total ?? "—"}</span>
              <span role="cell" className={`num${m != null && m < 0 ? " is-hi" : ""}`}>{c.b_total ?? "—"}</span>
              <span role="cell" className="num muted">{m == null ? "—" : m === 0 ? "Even" : `${Math.abs(m)} · ${m > 0 ? aName.split(" ").slice(-1)[0] : bName.split(" ").slice(-1)[0]}`}</span>
            </div>
          );
        })}
      </div>
      <div className="scard__foot">
        {verdict ? <Chip kind="official">{verdict} decision</Chip> : null}
        <span className="muted">{v.a} for {aName} · {v.b} for {bName}{v.even ? ` · ${v.even} even` : ""}</span>
        <span className="muted">Round-by-round cards not captured</span>
      </div>
    </div>
  );
}

export function WeighInLine({ c, contracted }: { c: Corner | null; contracted: number | null | undefined }) {
  if (!c?.weigh_in?.weight_lb) return <span className="muted">Weigh-in not on record</span>;
  const missed = c.weigh_in.status === "missed_weight";
  return (
    <span className={missed ? "weigh weigh--missed" : "weigh"}>
      {fmtLb(c.weigh_in.weight_lb)}{missed ? ` · missed${contracted ? ` ${fmtLb(contracted)}` : ""}` : ""}
    </span>
  );
}

export function PortraitName({ c, size = 44 }: { c: { public_id: string; name: string; corner?: "red" | "blue" | null }; size?: number }) {
  return (
    <Link href={fighterPath(c)} className="pname">
      <Portrait name={c.name} id={c.public_id} corner={c.corner ?? null} size={size} />
      <span>{c.name}</span>
    </Link>
  );
}

export const eventWhen = (e: EventSummary) => `${fmtDate(e.date, { weekday: true })}`;
