import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtRecord, fmtRange, methodLabel, initials, scoreVerdict, divisionLabel, resultLine, shortEventName, relativeDays } from "./format.ts";
import { boutPath, eventPath, fighterPath, parseRef, refOf, slugify } from "./slug.ts";
import { currentFightWeek, eventState, groupByWeek, rankCards, weekStart } from "./weekend.ts";
import { FAMILIES, FORBIDDEN_LABEL_WORDS, familyViews, fmtMetricValue, metricView, needText } from "./dna.ts";
import { comparisonRows, fightRead, whatMatters } from "./matchup.ts";
import { MORE_NAV, PRIMARY_NAV, filterNav } from "./nav.ts";
import type { BoutDetail, DnaMetric, EventSummary, RecordSummary } from "./types.ts";

const ev = (over: Partial<EventSummary>): EventSummary => ({
  public_id: "pbe_boxevent_0123456789abcdef0123456789abcdef", name: "Card at Arena", date: "2026-09-25", start_at: null, status: "scheduled",
  venue: null, commission: { slug: "nsac", name: "Nevada State Athletic Commission", jurisdiction: "Nevada", country_code: "US" }, promoters: [],
  sheet_filed: false, official_source_url: null, bout_count: 0, results_count: 0, awaiting_verification: null, title_bouts: 0, headline: null, ...over,
});
const rec = (over: Partial<RecordSummary> = {}): RecordSummary => ({
  bouts: 0, wins: 0, losses: 0, draws: 0, no_contests: 0, pending: 0, stoppage_wins: 0, ko_tko_wins: 0, rtd_wins: 0, dq_wins: 0, decision_wins: 0,
  stoppage_losses: 0, decision_losses: 0, distance_bouts: 0, max_scheduled_rounds: null, first_date: null, last_date: null, ...over,
});
const metric = (over: Partial<DnaMetric>): DnaMetric => ({
  key: "results.win_rate", version: "1.0.0", category: "results", name: "Win rate", unit: "ratio", status: "available", value: 0.6,
  value_text: null, value_json: null, sample_size: 5, minimum_sample: { decided_bouts: 5 }, as_of: "2026-09-13T00:00:00Z", ...over,
});

test("records, ranges and methods read like boxing", () => {
  assert.equal(fmtRecord({ wins: 5, losses: 1, draws: 0, no_contests: 0 }), "5-1");
  assert.equal(fmtRecord({ wins: 5, losses: 1, draws: 1, no_contests: 2 }), "5-1-1 (2 NC)");
  assert.equal(fmtRange("2026-09-25", "2026-09-26"), "Sep 25–26");
  assert.equal(fmtRange("2026-09-30", "2026-10-02"), "Sep 30 – Oct 2");
  assert.equal(methodLabel({ method: "DECISION", decision_type: "split", outcome: "win" }), "Split decision");
  assert.equal(methodLabel({ method: "DECISION", decision_type: "majority", outcome: "draw" }, true), "MD draw");
  assert.equal(methodLabel({ method: "RTD", decision_type: null, outcome: "win" }, true), "RTD");
  assert.equal(resultLine({ outcome: "win", winner_side: "a", method: "TKO", decision_type: null, round: 6, time_sec: 95, revision: 1, state: "official" }, 10), "Technical knockout · Round 6, 1:35");
  assert.equal(initials("Andres “Andy” Ruiz"), "AR");
  assert.equal(initials("Mario Perez, Jr."), "MP");
  assert.deepEqual(scoreVerdict([{ a_total: 97, b_total: 93 }, { a_total: 95, b_total: 95 }, { a_total: 94, b_total: 96 }]), { a: 1, b: 1, even: 1, complete: true });
  assert.equal(divisionLabel({ class_key: null, class_name: null, contracted_lb: null, catchweight: null }), null, "unknown division stays unknown");
  assert.equal(shortEventName("Warriors Boxing Promotion Misfits at Miami", null), "Miami");
  assert.equal(relativeDays("2026-09-13", "2026-09-25"), "In 12 days");
});

test("slugs carry the public id and resolve from it only", () => {
  const f = { public_id: "pbe_boxer_abe5df7656ca44c5bc023659594833e3", name: "Andres “Andy” Ruiz" };
  assert.equal(fighterPath(f), "/fighters/andres-andy-ruiz-abe5df7656ca");
  assert.equal(parseRef("andres-andy-ruiz-abe5df7656ca"), "abe5df7656ca");
  assert.equal(parseRef("renamed-completely-abe5df7656ca"), refOf(f.public_id));
  assert.equal(parseRef("no-id-here"), null);
  assert.equal(slugify("José Pérez & Sons"), "jose-perez-and-sons");
  assert.match(eventPath({ public_id: "pbe_boxevent_532b51af9b5e4dd88301cdf28667d8af", name: "Matchroom at Prudential Center", date: "2026-09-04" }), /^\/events\/matchroom-at-prudential-center-2026-09-04-532b51af9b5e$/);
  assert.equal(boutPath({ public_id: "pbe_boxbout_09b02d7113f8455b958c1139e7988b89", a: { name: "A B" }, b: { name: "C D" } }), "/fights/a-b-vs-c-d-09b02d7113f8");
});

test("fight weeks group simultaneous cards; the featured rule never favours a name", () => {
  assert.equal(weekStart("2026-09-13"), "2026-09-07", "Sunday belongs to the week that started Monday");
  const cards = [
    ev({ public_id: "pbe_boxevent_a", name: "Zeta at Miami", date: "2026-09-26" }),
    ev({ public_id: "pbe_boxevent_b", name: "Alpha at Arena", date: "2026-09-25", venue: { name: "Arena", city: "Las Vegas", region: "NV", country_code: "US" } }),
    ev({ public_id: "pbe_boxevent_c", name: "Later", date: "2026-10-03" }),
  ];
  const weeks = groupByWeek(cards);
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0].events.length, 2);
  assert.equal(weeks[0].events[0].public_id, "pbe_boxevent_b", "verified venue breaks the tie");
  assert.equal(rankCards([ev({ public_id: "x", bout_count: 1 }), ev({ public_id: "y", title_bouts: 1 })])[0].public_id, "y", "title bouts first");
  const fw = currentFightWeek(cards, "2026-09-13");
  assert.equal(fw?.kind, "next_fight_week");
  assert.equal(eventState(ev({ status: "complete", date: "2026-09-04" }), "2026-09-13"), "final");
  assert.equal(eventState(ev({ date: "2026-09-04" }), "2026-09-13"), "results_pending");
});

test("Fight DNA never renders a missing value as zero and never implies power", () => {
  assert.equal(metricView("results.win_rate", [metric({})]).value, "60%");
  const building = metricView("results.win_rate", [metric({ status: "insufficient_sample", value: null, sample_size: 2 })]);
  assert.equal(building.state, "building");
  assert.equal(building.value, null);
  assert.equal(building.sample, "needs 5 decided bouts, has 2");
  assert.equal(metricView("output.power_accuracy", [metric({ key: "output.power_accuracy", status: "source_unavailable", value: null })]).state, "licensed_only");
  assert.equal(metricView("results.win_rate", []).state, "missing");
  assert.equal(fmtMetricValue({ unit: "ratio", value: null }), null);
  assert.equal(needText({ wins: 1 }), "1 win");
  assert.equal(needText(3), "3");
  const labels = familyViews([]).flatMap((f) => [f.title, f.blurb.replace("not punching power", ""), ...f.rows.map((r) => r.label)]);
  for (const l of labels) assert.doesNotMatch(l, FORBIDDEN_LABEL_WORDS, l);
  assert.ok(!FAMILIES.some((f) => f.key === "output" || f.key === "opposition"), "licensed-only and shallow families are not displayed");
});

function bout(over: Partial<BoutDetail> = {}): BoutDetail {
  const corner = (name: string, entering: RecordSummary) => ({
    fighter: { public_id: `pbe_boxer_${name}`, name, nickname: null, stance: null, height_cm: null, reach_cm: null, nationality: null, sex: null, career_status: null },
    record_all: entering, entering, recent_entering: [], later_bouts: 0, dna: [], dna_as_of: null,
  });
  return {
    bout: { public_id: "pbe_boxbout_x", order: 8, status: "scheduled", scheduled_rounds: 10, weight: { class_key: "welterweight", class_name: "Welterweight", contracted_lb: 147, catchweight: false },
      a: { public_id: "pbe_boxer_a", name: "Alpha One", corner: "red", weigh_in: { weight_lb: 146.2, kind: "official", status: "made_weight" } },
      b: { public_id: "pbe_boxer_b", name: "Bravo Two", corner: "blue", weigh_in: { weight_lb: 146.8, kind: "official", status: "made_weight" } },
      result: null, scorecards: [], referee: null, titles: [], market_matched: false },
    event: ev({ date: "2026-09-25" }),
    result_history: [],
    corners: { a: corner("Alpha One", rec({ bouts: 4, wins: 4, max_scheduled_rounds: 10, last_date: "2026-01-10" })), b: corner("Bravo Two", rec({ bouts: 1, wins: 1, max_scheduled_rounds: 6, last_date: "2026-08-20" })) },
    card: [], market: null, ...over,
  };
}

test("matchup factors are facts past fixed thresholds; no picks or probabilities", () => {
  const d = bout();
  const f = whatMatters(d);
  assert.deepEqual(f.map((x) => x.title), ["Verified experience gap", "First 10-round assignment on record", "Activity gap"]);
  const text = JSON.stringify([f, fightRead(d), comparisonRows(d)]);
  assert.doesNotMatch(text, /probabilit|fair line|predict|edge %|favorite|favourite|advantage|will win/i);
  const rows = comparisonRows(d);
  assert.ok(!rows.some((r) => r.label === "Height"), "rows with no known value on either side are omitted");
  const small = bout({ corners: { ...d.corners, b: { ...d.corners.b!, entering: rec({ bouts: 3, wins: 3, max_scheduled_rounds: 10, last_date: "2026-01-01" }) } } });
  assert.deepEqual(whatMatters(small), [], "no factor clears the threshold");
});

test("navigation lists only usable surfaces", () => {
  assert.deepEqual(PRIMARY_NAV.map((n) => n.label), ["Fight Week", "Events", "Fighters", "Titles", "Rankings", "Odds", "News"]);
  const onlyCore = filterNav([...PRIMARY_NAV, ...MORE_NAV], new Set(["fight-week", "events", "fighters", "titles", "rankings"]));
  assert.deepEqual(onlyCore.map((n) => n.key), ["fight-week", "events", "fighters", "titles", "rankings"], "a surface without data is never listed");
  assert.ok([...PRIMARY_NAV, ...MORE_NAV].every((n) => n.href.startsWith("/") && !/soon/i.test(n.label)));
});
