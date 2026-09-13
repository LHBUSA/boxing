import Link from "next/link";
import { fmtDate, fmtLb, plural } from "@/lib/format";
import { boutPath, fighterPath } from "@/lib/slug";
import type { BoutCompact, EventSummary, EventTimeline } from "@/lib/types";
import { VIDEO_TYPE_LABEL } from "@/lib/video-labels";

// The living record of one card. A stage renders only when a record of it exists;
// capture times are shown only when they precede the card.

const MEDIA_STAGES: [string, string[]][] = [
  ["Announcement", ["announcement", "trailer_promo"]],
  ["Arrivals", ["grand_arrival"]],
  ["Media & workouts", ["media_workout", "interview", "fight_preview"]],
  ["Press conference", ["press_conference"]],
  ["Face-off", ["faceoff"]],
];

export function Timeline({ e, t, bouts }: { e: EventSummary; t: EventTimeline; bouts: BoutCompact[] }) {
  const stages: { k: string; done: boolean; body: React.ReactNode }[] = [];
  const vids = (types: string[]) => t.videos.filter((v) => types.includes(v.video_type));
  if (t.listed.on_record) stages.push({ k: "Card listed", done: true, body: <p>On the {e.commission?.name ?? "commission"} schedule{t.listed.recorded_at ? `, first recorded ${fmtDate(t.listed.recorded_at.slice(0, 10))}` : ""}.</p> });
  for (const [label, types] of MEDIA_STAGES) {
    const v = vids(types);
    if (v.length) stages.push({ k: label, done: true, body: <p>{v.map((x) => `${VIDEO_TYPE_LABEL[x.video_type] ?? "Video"}: ${x.title}`).join(" · ")}</p> });
  }
  if (t.card.bouts_added || bouts.length) {
    stages.push({ k: "Bout sheet", done: true, body: <>
      <p>{plural(bouts.length, "verified bout")} on the official sheet{t.card.officials_assigned ? `; ${plural(t.card.officials_assigned, "official assignment")}` : ""}.</p>
      {e.awaiting_verification ? <p className="fine">{plural(e.awaiting_verification, "further bout")} await identity verification before they are shown.</p> : null}
      {t.replacements.length ? <p className="fine">Replacements on record: {t.replacements.map((r) => r.name).join(", ")}.</p> : null}
    </> });
  }
  if (t.weigh_ins.official_weights || t.weigh_ins.ceremonial || vids(["weigh_in", "ceremonial_weigh_in"]).length) {
    stages.push({ k: "Weigh-in", done: true, body: <>
      <p>{plural(t.weigh_ins.official_weights, "official weight")} recorded{t.weigh_ins.missed ? `; ${t.weigh_ins.missed} missed the contracted weight` : ""}.</p>
      {t.missed_weight.length ? <p className="fine">{t.missed_weight.map((m) => <span key={m.fighter_public_id}><Link className="gold" href={fighterPath({ public_id: m.fighter_public_id, name: m.name })}>{m.name}</Link> {fmtLb(m.weight_lb)}{m.contracted_lb ? ` vs ${fmtLb(m.contracted_lb)}` : ""}. </span>)}</p> : null}
    </> });
  }
  if (t.market.matched_bouts) stages.push({ k: "Markets", done: true, body: <p>{plural(t.market.matched_bouts, "bout")} with a matched sportsbook market.</p> });
  stages.push({ k: "Fight night", done: e.status === "complete", body: <p>{fmtDate(e.date, { weekday: true })}{e.venue?.name ? ` · ${e.venue.name}` : ""}</p> });
  if (t.results.official) {
    stages.push({ k: "Results", done: true, body: <>
      <p>{plural(t.results.official, "official result")}: {t.results.stoppages} by KO/TKO/RTD, {t.results.decisions} on the cards{t.results.revised ? `; ${t.results.revised} revised by the commission` : ""}.</p>
    </> });
  }
  if (t.scorecards.bouts) {
    const close = bouts.filter((b) => b.result?.decision_type === "split" || b.result?.decision_type === "majority");
    stages.push({ k: "Scorecards", done: true, body: <>
      <p>{plural(t.scorecards.bouts, "decision")} with official judges&apos; cards{t.scorecards.split_or_majority ? `, ${t.scorecards.split_or_majority} split or majority` : ""}.</p>
      {close.length ? <p className="fine">{close.map((b) => <span key={b.public_id}><Link className="gold" href={boutPath(b)}>{b.a?.name} vs {b.b?.name}</Link> ({b.result?.decision_type}). </span>)}</p> : null}
    </> });
  }
  const post = vids(["post_fight_interview", "post_fight_press_conference", "highlights", "full_fight"]);
  if (post.length) stages.push({ k: "Post-fight", done: true, body: <p>{post.map((x) => `${VIDEO_TYPE_LABEL[x.video_type]}: ${x.title}`).join(" · ")}</p> });
  return (
    <ol className="tl">
      {stages.map((s, i) => (
        <li key={s.k} className={`tl__stage${s.done ? " is-done" : ""}`}>
          <span className="tl__dot" aria-hidden="true">{i + 1}</span>
          <div className="tl__body"><div className="tl__k">{s.k}</div>{s.body}</div>
        </li>
      ))}
    </ol>
  );
}
