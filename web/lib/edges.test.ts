import { test } from "node:test";
import assert from "node:assert/strict";
import { compareMatchup, COMPARE_RULE } from "./edges.ts";
import type { DnaMetric } from "./types.ts";

const m = (key: string, value: number | null, status: DnaMetric["status"] = "available"): DnaMetric => ({
  key, version: "1.0.0", category: key.split(".")[0], name: key, unit: null, status, value, value_text: null, value_json: null,
  sample_size: 10, minimum_sample: 5, as_of: "2026-10-02",
});
const byKey = (rows: ReturnType<typeof compareMatchup>) => Object.fromEntries(rows.map((r) => [r.key, r.outcome]));

test("comparisons are deterministic, versioned and only from available values", () => {
  const a = [m("finishing.stoppage_win_rate", 0.7), m("activity.rounds_boxed", 120), m("activity.days_since_last_bout", 90), m("opposition.opponent_quality_index", 0.55), m("late.rounds_boxed_9_plus", 30)];
  const b = [m("finishing.stoppage_win_rate", 0.45), m("activity.rounds_boxed", 110), m("activity.days_since_last_bout", 400), m("opposition.opponent_quality_index", null, "insufficient_sample"), m("late.rounds_boxed_9_plus", 10)];
  assert.equal(COMPARE_RULE, "pbe_matchup_compare@1");
  assert.deepEqual(byKey(compareMatchup(a, b)), { finishing: "a", experience: "even", activity: "a", opposition: "insufficient", distance: "a" });
  assert.deepEqual(compareMatchup(a, b), compareMatchup(a, b), "same inputs, same output");
});

test("a missing or building metric is never read as zero", () => {
  const rows = compareMatchup([], [m("finishing.stoppage_win_rate", 0.9)]);
  assert.ok(rows.every((r) => r.outcome === "insufficient"));
});

test("activity: fewer days since the last bout is the more active record", () => {
  const rows = compareMatchup([m("activity.days_since_last_bout", 700)], [m("activity.days_since_last_bout", 60)]);
  assert.equal(rows.find((r) => r.key === "activity")?.outcome, "b");
});
