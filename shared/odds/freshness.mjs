// Market freshness. Mirrors SQL public.boxing_market_freshness() exactly; a DB
// test asserts parity across a grid of cases.
//
//   closed   the fight has started and this is a pre-fight price (show as
//            closing, never as current)
//   live     in-play price confirmed within LIVE_MAX_AGE
//   fresh    pre-fight price confirmed within the window for its time-to-fight
//   stale    older than its window: display only with an explicit age warning
//   unknown  no confirmation time
//
// Pre-fight windows tighten as the fight approaches because prices move faster.

export const LIVE_MAX_AGE_S = 120;
export const PREMATCH_WINDOWS = [
  // [seconds_to_start_at_or_below, max_age_seconds]
  [3 * 3600, 30 * 60], // final 3 hours: 30 min
  [24 * 3600, 2 * 3600], // fight day: 2 h
  [7 * 86400, 12 * 3600], // fight week: 12 h
  [Infinity, 36 * 3600], // further out: 36 h
];

export function freshness({ lastSeenAt, startsAt, isLive, now = new Date() }) {
  if (!lastSeenAt) return 'unknown';
  const nowMs = +new Date(now);
  const age = (nowMs - +new Date(lastSeenAt)) / 1000;
  if (isLive) return age <= LIVE_MAX_AGE_S ? 'live' : 'stale';
  if (startsAt && nowMs >= +new Date(startsAt)) return 'closed';
  const toStart = startsAt ? (+new Date(startsAt) - nowMs) / 1000 : Infinity;
  const [, maxAge] = PREMATCH_WINDOWS.find(([limit]) => toStart <= limit);
  return age <= maxAge ? 'fresh' : 'stale';
}
