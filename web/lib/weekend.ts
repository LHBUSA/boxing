// Boxing happens in weekends of simultaneous cards, not one card at a time.
// Weeks run Monday..Sunday; a "fight week" is the set of cards inside one week.

import { daysBetween } from "./format.ts";
import type { EventSummary, IsoDate } from "./types.ts";

export function weekStart(d: IsoDate): IsoDate {
  const t = new Date(`${d}T12:00:00Z`);
  const offset = (t.getUTCDay() + 6) % 7; // Monday = 0
  t.setUTCDate(t.getUTCDate() - offset);
  return t.toISOString().slice(0, 10);
}

export interface FightWeek { start: IsoDate; first: IsoDate; last: IsoDate; events: EventSummary[] }

export function groupByWeek(events: EventSummary[]): FightWeek[] {
  const map = new Map<IsoDate, EventSummary[]>();
  for (const e of events) {
    const k = weekStart(e.date);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, list]) => {
      const dates = list.map((e) => e.date).sort();
      return { start, first: dates[0], last: dates[dates.length - 1], events: rankCards(list) };
    });
}

// Featured-card rule (documented on /methodology): title bouts on record, then
// bouts on record, then the longest scheduled headline bout, then a verified
// venue, then the earliest date. No promotion is favoured by name.
export function rankCards(events: EventSummary[]): EventSummary[] {
  return [...events].sort((x, y) =>
    y.title_bouts - x.title_bouts
    || y.bout_count - x.bout_count
    || (y.headline?.scheduled_rounds ?? 0) - (x.headline?.scheduled_rounds ?? 0)
    || Number(Boolean(y.venue?.name)) - Number(Boolean(x.venue?.name))
    || x.date.localeCompare(y.date)
    || x.name.localeCompare(y.name));
}

export type WeekKind = "this_week" | "next_fight_week";
export function currentFightWeek(upcoming: EventSummary[], today: IsoDate): { kind: WeekKind; week: FightWeek } | null {
  const live = upcoming.filter((e) => e.status !== "cancelled" && e.date >= today);
  const weeks = groupByWeek(live);
  if (!weeks.length) return null;
  const thisWeek = weeks.find((w) => w.start === weekStart(today));
  return thisWeek ? { kind: "this_week", week: thisWeek } : { kind: "next_fight_week", week: weeks[0] };
}

export type EventState = "final" | "today" | "results_pending" | "upcoming" | "cancelled";
export function eventState(e: Pick<EventSummary, "status" | "date">, today: IsoDate): EventState {
  if (e.status === "cancelled") return "cancelled";
  if (e.status === "complete") return "final";
  const n = daysBetween(today, e.date);
  if (n === 0) return "today";
  if (n < 0) return "results_pending";
  return "upcoming";
}

export function stateLabel(e: Pick<EventSummary, "status" | "date">, today: IsoDate): string {
  const s = eventState(e, today);
  if (s === "final") return "Final";
  if (s === "today") return "Fight night";
  if (s === "results_pending") return "Results pending";
  if (s === "cancelled") return "Cancelled";
  const n = daysBetween(today, e.date);
  return n <= 7 ? "Fight week" : `In ${n} days`;
}
