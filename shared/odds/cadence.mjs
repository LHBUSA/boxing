// Adaptive capture cadence for the_odds_api boxing prices. Pure.
//
// The Worker cron fires every 15 minutes; this decides whether a paid capture
// is due, from the nearest known provider start time, the time since the last
// successful capture, and the credits already spent.
//
// Tiers (nearest non-placeholder commence time t):
//   live_window  now in [t - 3h, t + 2h]   every 15 min
//   fight_day    t - now <= 24h            every 30 min
//   fight_week   t - now <= 7d             every 2h
//   far          otherwise / no events     every 6h
// Budgets: over the 30-day budget the cadence falls back to `far`; over the
// 24h budget nothing is due. Provider pre-match updates are ~60s and in-play
// ~40s, so 15 minutes never outpaces the source.

export const DEFAULT_CADENCE = Object.freeze({
  liveWindowBeforeMs: 3 * 3600_000,
  liveWindowAfterMs: 2 * 3600_000,
  intervals: Object.freeze({ live_window: 15, fight_day: 30, fight_week: 120, far: 360 }),
  toleranceMs: 2 * 60_000,
  monthlyBudget: 8000,
  dailyBudget: 600,
});

export function cadenceConfig(env = {}) {
  const n = (v, d) => (v == null || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));
  return { ...DEFAULT_CADENCE, monthlyBudget: n(env.ODDS_MONTHLY_BUDGET, DEFAULT_CADENCE.monthlyBudget), dailyBudget: n(env.ODDS_DAILY_BUDGET, DEFAULT_CADENCE.dailyBudget) };
}

export function tierFor(nowMs, commenceTimes, config = DEFAULT_CADENCE) {
  const times = (commenceTimes ?? []).filter((c) => !c.placeholder_suspect).map((c) => Date.parse(c.commence_time)).filter(Number.isFinite);
  if (times.some((t) => nowMs >= t - config.liveWindowBeforeMs && nowMs <= t + config.liveWindowAfterMs)) return 'live_window';
  const next = times.filter((t) => t > nowMs).sort((a, b) => a - b)[0];
  if (next == null) return 'far';
  if (next - nowMs <= 24 * 3600_000) return 'fight_day';
  if (next - nowMs <= 7 * 86_400_000) return 'fight_week';
  return 'far';
}

export function decideCadence({ now, state, runCost, config = DEFAULT_CADENCE }) {
  const nowMs = +new Date(now);
  let tier = tierFor(nowMs, state?.next_commence_times, config);
  const credits30d = Number(state?.credits_30d ?? 0);
  const credits24h = Number(state?.credits_24h ?? 0);
  if (credits24h + runCost > config.dailyBudget) {
    return { due: false, tier, reason: 'daily_budget_reached', credits24h, dailyBudget: config.dailyBudget };
  }
  let budgetFallback = false;
  if (credits30d + runCost > config.monthlyBudget && tier !== 'far') { tier = 'far'; budgetFallback = true; }
  const intervalMinutes = config.intervals[tier];
  const last = state?.last_capture_at ? Date.parse(state.last_capture_at) : null;
  const due = last == null || nowMs - last >= intervalMinutes * 60_000 - config.toleranceMs;
  return {
    due, tier, intervalMinutes, budgetFallback, credits24h, credits30d,
    reason: due ? (last == null ? 'no_previous_capture' : 'interval_elapsed') : 'interval_not_elapsed',
    nextDueAt: last == null ? new Date(nowMs).toISOString() : new Date(last + intervalMinutes * 60_000).toISOString(),
  };
}

// "us=h2h,totals;uk=h2h" -> [{ region: 'us', markets: ['h2h','totals'] }, ...]
export function parseRegionPlan(env = {}) {
  if (env.ODDS_REGION_PLAN) {
    return String(env.ODDS_REGION_PLAN).split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const [region, markets = ''] = part.split('=');
      return { region: region.trim(), markets: markets.split(',').map((m) => m.trim()).filter(Boolean) };
    });
  }
  const regions = (env.ODDS_REGIONS ?? 'us').split(',').map((r) => r.trim()).filter(Boolean);
  const markets = (env.ODDS_MARKETS ?? 'h2h').split(',').map((m) => m.trim()).filter(Boolean);
  return regions.map((region) => ({ region, markets }));
}

export const planCost = (plan) => plan.reduce((s, p) => s + p.markets.length, 0);
