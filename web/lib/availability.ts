import "server-only";
import { gateway } from "./gateway";
import type { NavKey } from "./nav";

// Which surfaces carry meaningful real data right now. Core record surfaces are always on; the rest join
// the navigation only when their read proves real content. Every read is cached by the gateway client.
export async function navAvailability(): Promise<Set<NavKey>> {
  const on = new Set<NavKey>(["fight-week", "events", "fighters", "titles", "rankings", "promoters", "scorecards", "judges", "referees", "methodology"]);
  const [coverage, wire, hall] = await Promise.all([gateway.coverage(), gateway.wire(5), gateway.hallOfFame({ limit: 1 })]);
  if (coverage.ok && coverage.data.matched_market_bouts > 0) on.add("odds");
  if (coverage.ok && (coverage.data.videos_published ?? 0) > 0) on.add("videos");
  if (wire.ok && wire.data.length > 0) on.add("news");
  if (hall.ok && hall.data.total > 0) { on.add("hall-of-fame"); on.add("history"); }
  return on;
}
