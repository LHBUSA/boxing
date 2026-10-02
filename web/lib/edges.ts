// Matchup comparisons, rule pbe_matchup_compare@1. Pure and deterministic.
//
// Each comparison says which boxer's verified record is larger or higher on ONE descriptive dimension, using Fight DNA
// values the engine marked "available" (so each already cleared its minimum sample). Outcomes: "a", "b", "even"
// (difference below the stated threshold) or "insufficient" (either side lacks an available value). These describe the
// two records. They are not a win probability, a pick or an edge in any market sense; the bout-winner model is untrained.

import type { DnaMetric } from "./types.ts";

export const COMPARE_RULE = "pbe_matchup_compare@1";

export type CompareOutcome = "a" | "b" | "even" | "insufficient";
export interface Comparison { key: string; title: string; outcome: CompareOutcome; basis: string; a: number | null; b: number | null }

interface Dim { key: string; title: string; metric: string; threshold: number; higherIs: string; fmt: (v: number) => string; relative?: boolean; lowerWins?: boolean }

// thresholds: the smallest difference stated as a difference; anything smaller is "no clear edge"
export const DIMENSIONS: Dim[] = [
  { key: "finishing", title: "Finishing profile", metric: "finishing.stoppage_win_rate", threshold: 0.1, higherIs: "more decided bouts won by KO, TKO or RTD", fmt: (v) => `${Math.round(v * 100)}%` },
  { key: "experience", title: "Experience", metric: "activity.rounds_boxed", threshold: 0.25, relative: true, higherIs: "more verified rounds boxed", fmt: (v) => `${Math.round(v)} rounds` },
  { key: "activity", title: "Activity", metric: "activity.days_since_last_bout", threshold: 180, lowerWins: true, higherIs: "fought more recently", fmt: (v) => `${Math.round(v)} days since last bout` },
  { key: "opposition", title: "Opposition", metric: "opposition.opponent_quality_index", threshold: 0.08, higherIs: "faced opponents with stronger records entering those bouts", fmt: (v) => v.toFixed(2) },
  { key: "distance", title: "Distance experience", metric: "late.rounds_boxed_9_plus", threshold: 0.25, relative: true, higherIs: "more rounds boxed after round 8", fmt: (v) => `${Math.round(v)} rounds after R8` },
];

const value = (metrics: DnaMetric[], key: string) => {
  const m = metrics.find((x) => x.key === key);
  return m && m.status === "available" && m.value != null && Number.isFinite(m.value) ? m.value : null;
};

export function compareOne(dim: Dim, a: DnaMetric[], b: DnaMetric[]): Comparison {
  const va = value(a, dim.metric);
  const vb = value(b, dim.metric);
  const base = { key: dim.key, title: dim.title, a: va, b: vb };
  if (va == null || vb == null) return { ...base, outcome: "insufficient", basis: "One or both boxers lack enough verified bouts for this measure." };
  const diff = Math.abs(va - vb);
  const scale = dim.relative ? Math.max(va, vb) : 1;
  const clear = dim.relative ? scale > 0 && diff / scale >= dim.threshold : diff >= dim.threshold;
  if (!clear) return { ...base, outcome: "even", basis: `${dim.fmt(va)} vs ${dim.fmt(vb)}: within the ${dim.relative ? `${Math.round(dim.threshold * 100)}%` : dim.fmt(dim.threshold)} threshold.` };
  const aAhead = dim.lowerWins ? va < vb : va > vb;
  return { ...base, outcome: aAhead ? "a" : "b", basis: `${dim.fmt(va)} vs ${dim.fmt(vb)}: ${aAhead ? "A" : "B"} ${dim.higherIs}.` };
}

export function compareMatchup(a: DnaMetric[], b: DnaMetric[]): Comparison[] {
  return DIMENSIONS.map((d) => compareOne(d, a, b));
}
