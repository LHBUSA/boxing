// Formatting for boxing facts. Pure; unknown stays unknown (null in, null or an
// explicit "not on record" phrase out). Never renders a missing number as 0.

import type { BoutCompact, Corner, IsoDate, RecordSummary, Result, Venue, Weight } from "./types.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Calendar dates are anchored at UTC noon so no timezone shifts the day.
export function dateParts(d: IsoDate) {
  const t = new Date(`${d}T12:00:00Z`);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), day: t.getUTCDate(), dow: t.getUTCDay() };
}
export function fmtDate(d: IsoDate | null | undefined, opts: { year?: boolean; weekday?: boolean } = {}): string {
  if (!d) return "Date not on record";
  const p = dateParts(d);
  const base = `${MONTHS[p.m]} ${p.day}`;
  return `${opts.weekday ? `${DAYS[p.dow]}, ` : ""}${base}${opts.year === false ? "" : `, ${p.y}`}`;
}
export const fmtDateShort = (d: IsoDate) => fmtDate(d, { year: false });
export const weekday = (d: IsoDate) => DAYS[dateParts(d).dow];
export const monthDay = (d: IsoDate) => { const p = dateParts(d); return { month: MONTHS[p.m].toUpperCase(), day: String(p.day) }; };

export function fmtRange(a: IsoDate, b: IsoDate): string {
  if (a === b) return fmtDate(a, { year: false });
  const pa = dateParts(a);
  const pb = dateParts(b);
  return pa.m === pb.m ? `${MONTHS[pa.m]} ${pa.day}–${pb.day}` : `${MONTHS[pa.m]} ${pa.day} – ${MONTHS[pb.m]} ${pb.day}`;
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export function relativeDays(today: IsoDate, d: IsoDate): string {
  const n = daysBetween(today, d);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function placeLine(venue: Venue | null | undefined): string | null {
  if (!venue) return null;
  const city = [venue.city, venue.region].filter(Boolean).join(", ");
  return [venue.name, city].filter(Boolean).join(" · ") || null;
}
export function cityLine(venue: Venue | null | undefined): string | null {
  if (!venue) return null;
  return [venue.city, venue.region].filter(Boolean).join(", ") || null;
}

export function fmtRecord(r: Pick<RecordSummary, "wins" | "losses" | "draws" | "no_contests"> | null | undefined): string {
  if (!r) return "—";
  const core = `${r.wins}-${r.losses}${r.draws ? `-${r.draws}` : ""}`;
  return r.no_contests ? `${core} (${r.no_contests} NC)` : core;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const METHOD: Record<string, string> = {
  KO: "Knockout", TKO: "Technical knockout", RTD: "Corner retirement (RTD)", DQ: "Disqualification",
  TECHNICAL_DECISION: "Technical decision", NO_CONTEST: "No contest", NO_DECISION: "No decision", OTHER: "Other",
};
const METHOD_SHORT: Record<string, string> = { KO: "KO", TKO: "TKO", RTD: "RTD", DQ: "DQ", TECHNICAL_DECISION: "TD", NO_CONTEST: "NC", NO_DECISION: "ND", OTHER: "Other" };
const DECISION: Record<string, [string, string]> = {
  unanimous: ["Unanimous decision", "UD"], split: ["Split decision", "SD"], majority: ["Majority decision", "MD"],
  referee: ["Referee's decision", "Ref. dec."], newspaper: ["Newspaper decision", "ND"],
};

export function methodLabel(r: Pick<Result, "method" | "decision_type" | "outcome"> | null | undefined, short = false): string | null {
  if (!r || !r.method) return null;
  if (r.method === "DECISION") {
    const d = r.decision_type ? DECISION[r.decision_type] : null;
    if (r.outcome === "draw") return d ? `${short ? d[1] : d[0].replace("decision", "draw")}${short ? " draw" : ""}` : "Draw";
    return d ? d[short ? 1 : 0] : short ? "Dec." : "Decision";
  }
  return (short ? METHOD_SHORT : METHOD)[r.method] ?? r.method;
}

export function fmtClock(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function resultLine(r: Result | null, rounds: number | null): string | null {
  if (!r) return null;
  const m = methodLabel(r);
  if (!m) return r.outcome === "draw" ? "Draw" : null;
  if (r.method === "DECISION") return rounds ? `${m} · ${rounds} rounds` : m;
  const at = [r.round ? `Round ${r.round}` : null, fmtClock(r.time_sec)].filter(Boolean).join(", ");
  return at ? `${m} · ${at}` : m;
}

export function winnerLoser(b: Pick<BoutCompact, "a" | "b" | "result">): { winner: Corner | null; loser: Corner | null } {
  if (!b.result || b.result.outcome !== "win" || !b.result.winner_side) return { winner: null, loser: null };
  return b.result.winner_side === "a" ? { winner: b.a, loser: b.b } : { winner: b.b, loser: b.a };
}

export function divisionLabel(w: Weight | null | undefined): string | null {
  if (!w) return null;
  if (w.class_name && w.catchweight && w.contracted_lb) return `${w.class_name} · catchweight ${fmtLb(w.contracted_lb)}`;
  if (w.class_name) return w.class_name;
  if (w.contracted_lb) return `Contracted ${fmtLb(w.contracted_lb)}`;
  return null;
}

export const fmtLb = (lb: number | null | undefined) => (lb == null ? null : `${Number.isInteger(lb) ? lb : lb.toFixed(1)} lb`);

export function fmtHeight(cm: number | null | undefined): string | null {
  if (cm == null) return null;
  const inches = cm / 2.54;
  return `${Math.floor(inches / 12)}′${Math.round(inches % 12)}″ · ${Math.round(cm)} cm`;
}
export const fmtReach = (cm: number | null | undefined) => (cm == null ? null : `${Math.round(cm / 2.54)}″ · ${Math.round(cm)} cm`);

export const STANCE: Record<string, string> = { orthodox: "Orthodox", southpaw: "Southpaw", switch: "Switch" };

export function initials(name: string): string {
  const clean = name.replace(/[“"][^”"]*[”"]/g, " ").replace(/\s+/g, " ").trim();
  const parts = clean.split(" ").filter((p) => /[A-Za-zÀ-ÿ]/.test(p) && !/^(jr|sr|ii|iii|iv)\.?$/i.test(p));
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function scoreVerdict(cards: { a_total: number | null; b_total: number | null }[]): { a: number; b: number; even: number; complete: boolean } {
  const known = cards.filter((c) => c.a_total != null && c.b_total != null);
  return {
    a: known.filter((c) => (c.a_total as number) > (c.b_total as number)).length,
    b: known.filter((c) => (c.b_total as number) > (c.a_total as number)).length,
    even: known.filter((c) => c.a_total === c.b_total).length,
    complete: known.length > 0 && known.length === cards.length,
  };
}

// Commission sheet names are long and uneven; the part before " at " is the
// promoter listing, the part after is the venue. Used only for compact labels.
export function shortEventName(name: string, venue: Venue | null | undefined): string {
  if (venue?.name) return venue.name;
  const i = name.lastIndexOf(" at ");
  return i > 0 ? name.slice(i + 4) : name;
}
