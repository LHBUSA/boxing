// Fight DNA presentation rules. Pure.
//
// - A metric renders a value ONLY when its status is "available"; everything
//   else renders a state (building / needs licensed stats / not applicable),
//   never a zero.
// - Finishing metrics describe how bouts ended. They are never called power.
// - Punch output and knockdown families need a licensed punch-stat source; they
//   collapse into one line instead of a grid of empty tiles.
// - Opposition metrics depend on opponents' own verified histories, which are
//   still shallow; Phase 1 does not display them (see OPPOSITION_NOTE).

import type { DnaMetric } from "./types.ts";

export interface Family { key: string; title: string; blurb: string; metrics: string[] }

export const FAMILIES: Family[] = [
  { key: "results", title: "Results", blurb: "How verified bouts ended.", metrics: ["results.win_rate", "results.stoppage_win_share", "results.decision_win_share", "results.distance_rate", "results.stoppage_loss_rate"] },
  { key: "finishing", title: "Finishing", blurb: "When stoppages happened. How bouts ended, not punching power.", metrics: ["finishing.stoppage_win_rate", "finishing.early_stoppage_share", "finishing.late_stoppage_share"] },
  { key: "durability", title: "Durability", blurb: "Rounds completed and stoppage losses on record.", metrics: ["durability.stoppage_losses", "durability.rounds_completed_ratio", "durability.reached_round_9_rate"] },
  { key: "activity", title: "Activity", blurb: "Verified bouts over time.", metrics: ["activity.pro_bouts", "activity.rounds_boxed", "activity.bouts_last_12_months", "activity.avg_days_between_bouts", "activity.days_since_last_bout"] },
  { key: "late", title: "Championship distance", blurb: "Experience beyond eight rounds.", metrics: ["late.bouts_scheduled_beyond_8", "late.rounds_boxed_9_plus", "late.stoppage_wins_after_round_8"] },
];

export const LICENSED_ONLY_PREFIXES = ["output.", "durability.knockdowns_", "late.knockdowns_"];
export const OPPOSITION_NOTE = "Opposition strength waits for deeper verified histories of each opponent.";
export const LICENSED_NOTE = "Punch output, accuracy and knockdown metrics need a licensed punch-stat source. None is connected, so they are not shown.";

const LABELS: Record<string, string> = {
  "results.win_rate": "Win rate (decided bouts)",
  "results.stoppage_win_share": "Wins by KO, TKO or RTD",
  "results.decision_win_share": "Wins by decision",
  "results.distance_rate": "Bouts that went the distance",
  "results.stoppage_loss_rate": "Losses by KO, TKO or RTD",
  "finishing.stoppage_win_rate": "KO/TKO/RTD wins per decided bout",
  "finishing.early_stoppage_share": "Stoppage wins in rounds 1–3",
  "finishing.late_stoppage_share": "Stoppage wins in round 9+",
  "durability.stoppage_losses": "Stoppage losses",
  "durability.rounds_completed_ratio": "Scheduled rounds completed",
  "durability.reached_round_9_rate": "Reached round 9 (9+ scheduled)",
  "activity.pro_bouts": "Verified bouts",
  "activity.rounds_boxed": "Rounds boxed",
  "activity.bouts_last_12_months": "Bouts, last 12 months",
  "activity.avg_days_between_bouts": "Days between bouts",
  "activity.days_since_last_bout": "Days since last bout",
  "late.bouts_scheduled_beyond_8": "Bouts scheduled 9+ rounds",
  "late.rounds_boxed_9_plus": "Rounds boxed after round 8",
  "late.stoppage_wins_after_round_8": "Stoppage wins after round 8",
};

export type MetricState = "available" | "building" | "licensed_only" | "not_applicable" | "missing";
export interface MetricView { key: string; label: string; state: MetricState; value: string | null; raw: number | null; sample: string | null; minimum: string | null; sampleSize: number | null }

// minimum_sample is either a count or { unit: count }, e.g. { decided_bouts: 5 }.
export function needText(min: DnaMetric["minimum_sample"]): string | null {
  if (min == null) return null;
  if (typeof min === "number") return String(min);
  const parts = Object.entries(min).filter(([, n]) => typeof n === "number" && n > 0).map(([k, n]) => `${n} ${k.replace(/_/g, " ").replace(/s$/, n === 1 ? "" : "s")}`);
  return parts.length ? parts.join(", ") : null;
}

export function fmtMetricValue(m: Pick<DnaMetric, "unit" | "value">): string | null {
  if (m.value == null || Number.isNaN(m.value)) return null;
  switch (m.unit) {
    case "ratio": return `${Math.round(m.value * 100)}%`;
    case "days": return `${Math.round(m.value)}`;
    case "per_bout":
    case "per_round":
    case "index_0_1": return m.value.toFixed(2);
    default: return Number.isInteger(m.value) ? String(m.value) : m.value.toFixed(1);
  }
}

export function metricView(key: string, metrics: DnaMetric[]): MetricView {
  const m = metrics.find((x) => x.key === key);
  const label = LABELS[key] ?? m?.name ?? key;
  if (!m) return { key, label, state: "missing", value: null, raw: null, sample: null, minimum: null, sampleSize: null };
  const n = m.sample_size;
  const base = { key, label, raw: null as number | null, minimum: needText(m.minimum_sample), sampleSize: n };
  if (LICENSED_ONLY_PREFIXES.some((p) => key.startsWith(p)) || m.status === "source_unavailable") {
    return { ...base, state: "licensed_only", value: null, sample: null };
  }
  if (m.status === "available") {
    const value = fmtMetricValue(m);
    if (value == null) return { ...base, state: "missing", value: null, sample: null };
    return { ...base, state: "available", value, raw: m.value, sample: n != null ? `n=${n}` : null };
  }
  if (m.status === "insufficient_sample") {
    const need = needText(m.minimum_sample);
    return { ...base, state: "building", value: null, sample: need ? `needs ${need}${n != null ? `, has ${n}` : ""}` : "sample building" };
  }
  return { ...base, state: "not_applicable", value: null, sample: "not applicable" };
}

export function familyViews(metrics: DnaMetric[]) {
  return FAMILIES.map((f) => ({ ...f, rows: f.metrics.map((k) => metricView(k, metrics)) }));
}

export function dnaSummary(metrics: DnaMetric[]) {
  const shown = FAMILIES.flatMap((f) => f.metrics).map((k) => metricView(k, metrics));
  return {
    available: shown.filter((v) => v.state === "available").length,
    building: shown.filter((v) => v.state === "building").length,
    total: shown.length,
    hasAny: metrics.length > 0,
  };
}

// Nothing user-facing may imply punch power or a "chin" from result data.
export const FORBIDDEN_LABEL_WORDS = /\b(power|punching|chin|heart|killer)\b/i;
