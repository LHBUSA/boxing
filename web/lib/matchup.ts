// Matchup intelligence from verified facts only. Pure.
// Differences are stated as differences, never as advantages or picks. The
// registered model is untrained, so there are no probabilities, fair lines,
// predicted winners or edges anywhere in this module.

import { daysBetween, divisionLabel, fmtDate, fmtLb, fmtRecord, methodLabel, plural, scoreVerdict, STANCE, fmtHeight, fmtReach } from "./format.ts";
import { metricView } from "./dna.ts";
import type { BoutDetail, CornerDetail, RecordSummary } from "./types.ts";

export const THRESHOLDS = Object.freeze({
  experienceGapBouts: 3,
  weighInGapLb: 3,
  activityGapDays: 180,
  minDecidedForPaths: 5,
});

export interface ComparisonRow { label: string; a: string | null; b: string | null; differs: boolean; note?: string }

const recordText = (r: RecordSummary) => (r.bouts ? `${fmtRecord(r)} in ${plural(r.bouts, "bout")}` : "No prior verified bout");

export function comparisonRows(d: BoutDetail): ComparisonRow[] {
  const A = d.corners.a;
  const B = d.corners.b;
  if (!A || !B) return [];
  const rows: ComparisonRow[] = [];
  const push = (label: string, a: string | null, b: string | null, note?: string) => {
    if (a == null && b == null) return;
    rows.push({ label, a, b, differs: a !== b, note });
  };
  push("Verified record entering", recordText(A.entering), recordText(B.entering));
  push("KO/TKO/RTD wins entering", A.entering.bouts ? String(A.entering.stoppage_wins) : null, B.entering.bouts ? String(B.entering.stoppage_wins) : null);
  push("Went the distance entering", A.entering.bouts ? String(A.entering.distance_bouts) : null, B.entering.bouts ? String(B.entering.distance_bouts) : null);
  push("Longest scheduled bout entering", A.entering.max_scheduled_rounds ? `${A.entering.max_scheduled_rounds} rounds` : null, B.entering.max_scheduled_rounds ? `${B.entering.max_scheduled_rounds} rounds` : null);
  push("Last verified bout before", A.entering.last_date ? fmtDate(A.entering.last_date) : null, B.entering.last_date ? fmtDate(B.entering.last_date) : null);
  push("Official weigh-in", fmtLb(d.bout.a?.weigh_in?.weight_lb), fmtLb(d.bout.b?.weigh_in?.weight_lb));
  push("Stance", A.fighter.stance ? STANCE[A.fighter.stance] ?? A.fighter.stance : null, B.fighter.stance ? STANCE[B.fighter.stance] ?? B.fighter.stance : null);
  push("Height", fmtHeight(A.fighter.height_cm), fmtHeight(B.fighter.height_cm));
  push("Reach", fmtReach(A.fighter.reach_cm), fmtReach(B.fighter.reach_cm));
  push("Nationality", A.fighter.nationality, B.fighter.nationality);
  return rows;
}

export const UNKNOWN_PHYSICALS = (d: BoutDetail) => {
  const f = [d.corners.a?.fighter, d.corners.b?.fighter];
  const missing: string[] = [];
  if (f.every((x) => !x?.stance)) missing.push("stance");
  if (f.every((x) => !x?.height_cm)) missing.push("height");
  if (f.every((x) => !x?.reach_cm)) missing.push("reach");
  if (f.every((x) => !x?.nationality)) missing.push("nationality");
  return missing;
};

export interface Factor { title: string; evidence: string }

export function whatMatters(d: BoutDetail): Factor[] {
  const A = d.corners.a;
  const B = d.corners.b;
  if (!A || !B) return [];
  const an = d.bout.a?.name ?? "Corner A";
  const bn = d.bout.b?.name ?? "Corner B";
  const out: Factor[] = [];
  const gap = A.entering.bouts - B.entering.bouts;
  if (Math.abs(gap) >= THRESHOLDS.experienceGapBouts) {
    const [more, less, m, l] = gap > 0 ? [an, bn, A.entering, B.entering] : [bn, an, B.entering, A.entering];
    out.push({ title: "Verified experience gap", evidence: `${more} entered with ${plural(m.bouts, "verified bout")}; ${less} with ${plural(l.bouts, "verified bout")}.` });
  }
  const rounds = d.bout.scheduled_rounds;
  if (rounds) {
    const aHas = (A.entering.max_scheduled_rounds ?? 0) >= rounds;
    const bHas = (B.entering.max_scheduled_rounds ?? 0) >= rounds;
    if (aHas !== bHas && (A.entering.bouts || B.entering.bouts)) {
      const [has, not] = aHas ? [an, bn] : [bn, an];
      out.push({ title: `First ${rounds}-round assignment on record`, evidence: `${has} has been scheduled for ${rounds} rounds before on verified record; ${not} has not.` });
    }
  }
  const wa = d.bout.a?.weigh_in?.weight_lb;
  const wb = d.bout.b?.weigh_in?.weight_lb;
  if (wa != null && wb != null && Math.abs(wa - wb) >= THRESHOLDS.weighInGapLb) {
    const [heavier, lighter] = wa > wb ? [an, bn] : [bn, an];
    out.push({ title: "Scale difference", evidence: `${heavier} weighed ${Math.abs(wa - wb).toFixed(1)} lb more than ${lighter} at the official weigh-in (${fmtLb(wa)} vs ${fmtLb(wb)}).` });
  }
  const eventDate = d.event.date;
  const la = A.entering.last_date;
  const lb = B.entering.last_date;
  if (la && lb) {
    const ga = daysBetween(la, eventDate);
    const gb = daysBetween(lb, eventDate);
    if (Math.abs(ga - gb) >= THRESHOLDS.activityGapDays) {
      const [idle, active, gi, gact] = ga > gb ? [an, bn, ga, gb] : [bn, an, gb, ga];
      out.push({ title: "Activity gap", evidence: `${idle} came in ${gi} days after a verified bout; ${active} after ${gact} days.` });
    }
  }
  const missA = d.bout.a?.weigh_in?.status === "missed_weight";
  const missB = d.bout.b?.weigh_in?.status === "missed_weight";
  if (missA || missB) {
    const who = missA && missB ? "Both boxers" : missA ? an : bn;
    out.push({ title: "Missed weight", evidence: `${who} missed the contracted weight at the official weigh-in${d.bout.weight?.contracted_lb ? ` (${fmtLb(d.bout.weight.contracted_lb)})` : ""}.` });
  }
  return out.slice(0, 4);
}

export interface Path { share: string; count: string; kind: "stoppage" | "decision" }
export function pathsToVictory(c: CornerDetail): { stoppage: string | null; decision: string | null; sample: number | null } | null {
  const s = metricView("results.stoppage_win_share", c.dna);
  const dcs = metricView("results.decision_win_share", c.dna);
  if (s.state !== "available" || dcs.state !== "available") return null;
  return { stoppage: s.value, decision: dcs.value, sample: s.sampleSize };
}

export function phaseProfile(c: CornerDetail): { early: string | null; late: string | null } | null {
  const e = metricView("finishing.early_stoppage_share", c.dna);
  const l = metricView("finishing.late_stoppage_share", c.dna);
  if (e.state !== "available" && l.state !== "available") return null;
  return { early: e.state === "available" ? e.value : null, late: l.state === "available" ? l.value : null };
}

export function fightRead(d: BoutDetail): string[] {
  const an = d.bout.a?.name ?? "Corner A";
  const bn = d.bout.b?.name ?? "Corner B";
  const A = d.corners.a;
  const B = d.corners.b;
  const lines: string[] = [];
  const rounds = d.bout.scheduled_rounds ? `${d.bout.scheduled_rounds} scheduled rounds` : "a scheduled distance not on record";
  const div = divisionLabel(d.bout.weight);
  const r = d.bout.result;
  if (r) {
    const winner = r.winner_side === "a" ? an : r.winner_side === "b" ? bn : null;
    const loser = r.winner_side === "a" ? bn : r.winner_side === "b" ? an : null;
    const how = r.method === "DECISION" || r.method === "TECHNICAL_DECISION"
      ? methodLabel(r)?.toLowerCase()
      : r.method ? `${methodLabel(r, true)}${r.round ? ` in round ${r.round}` : ""}` : null;
    if (winner && loser) lines.push(`${winner} beat ${loser}${how ? ` by ${how}` : ""}${div ? ` in a ${div.toLowerCase()} bout` : ""} scheduled for ${rounds.replace(" scheduled", "")}.`);
    else if (r.outcome === "draw") lines.push(`${an} and ${bn} fought to a ${methodLabel(r)?.toLowerCase() ?? "draw"} over ${rounds}.`);
    else lines.push(`The official outcome was recorded as ${r.outcome.replace("_", " ")}.`);
    const v = scoreVerdict(d.bout.scorecards);
    if (d.bout.scorecards.length && v.complete) {
      const cards = d.bout.scorecards.map((c) => `${c.a_total}–${c.b_total}`).join(", ");
      lines.push(`The judges' official totals read ${cards} (${an} first).`);
    }
  } else if (d.event.status === "complete") {
    lines.push(`${an} vs ${bn} is on the official sheet, but no official result has been recorded for it yet.`);
  } else {
    lines.push(`${an} vs ${bn}${div ? `, ${div.toLowerCase()},` : ""} is scheduled for ${rounds}.`);
  }
  if (A && B) {
    const fresh = [A, B].filter((c) => c.entering.bouts === 0).length;
    if (fresh === 2) lines.push("Neither boxer had an earlier bout on verified record, so this read rests on the official result and the scale.");
    else if (fresh === 1) lines.push(`${A.entering.bouts === 0 ? an : bn} had no earlier verified bout; ${A.entering.bouts === 0 ? bn : an} entered ${fmtRecord(A.entering.bouts === 0 ? B.entering : A.entering)} on verified record.`);
    else lines.push(`${an} entered ${fmtRecord(A.entering)} and ${bn} ${fmtRecord(B.entering)} on verified record.`);
  }
  return lines;
}

// Confidence vocabulary shown to readers (no internal ids or jargon).
export type Confidence = "verified" | "limited" | "first";
export function historyConfidence(bouts: number): Confidence {
  if (bouts >= 3) return "verified";
  if (bouts >= 1) return "limited";
  return "first";
}

// "What could break the read": the limits of the evidence, stated plainly. Pure; no prediction.
export function readLimits(d: BoutDetail, ctx?: { officials?: { role: string }[] | null; corners?: { a?: { sourced_bio: { height_cm: number | null } | null }; b?: { sourced_bio: { height_cm: number | null } | null } } | null } | null): Factor[] {
  const an = d.bout.a?.name ?? "Corner A";
  const bn = d.bout.b?.name ?? "Corner B";
  const A = d.corners.a;
  const B = d.corners.b;
  const out: Factor[] = [];
  const complete = Boolean(d.bout.result) || d.event.status === "complete";
  // One item for both corners: titles are unique within a read (they key the rendered list).
  const thin = ([[an, A], [bn, B]] as const).flatMap(([name, c]) => (c && c.entering.bouts < 3 ? [`${name} entered with ${plural(c.entering.bouts, "verified bout")}`] : []));
  if (thin.length) out.push({ title: "Thin verified history", evidence: `${thin.join("; ")}. Verified records cover the commissions PropBetEdge ingests, not a full career.` });
  if (!complete && (d.bout.a?.weigh_in == null || d.bout.b?.weigh_in == null)) out.push({ title: "Scale not on record yet", evidence: "The official weigh-in has not been recorded; a missed weight or a late change would change this read." });
  if (!complete && !(ctx?.officials?.length)) out.push({ title: "Officials not assigned on record", evidence: "Referee and judges appear once the commission assigns them." });
  const sourcedHeight = Boolean(ctx?.corners?.a?.sourced_bio?.height_cm || ctx?.corners?.b?.sourced_bio?.height_cm);
  const missing = UNKNOWN_PHYSICALS(d).filter((m) => !(sourcedHeight && m === "height"));
  if (missing.length) out.push({ title: "Physicals not verified", evidence: `No verified ${missing.join(", ")} for either boxer${sourcedHeight ? "; height shown comes from Wikidata" : ""}.` });
  if (!d.market) out.push({ title: "No matched market", evidence: "Prices attach only when a sportsbook event matches this verified bout." });
  if (d.result_history.length > 1) out.push({ title: "Result revised", evidence: `The official result has ${plural(d.result_history.length - 1, "revision")} on record.` });
  return out.slice(0, 5);
}
