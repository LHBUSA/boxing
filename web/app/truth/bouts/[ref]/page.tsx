import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateway } from "@/lib/gateway";
import { refOf } from "@/lib/slug";
import { Crumbs, Unavailable } from "@/components/fight";
import { Lane, Src, Table, state, when } from "@/components/truth";

export const revalidate = 60;
export const metadata: Metadata = { title: "Bout truth · investigator", robots: { index: false, follow: false } };
type Props = { params: Promise<{ ref: string }> };

export default async function TruthBoutPage({ params }: Props) {
  const { ref } = await params;
  if (!/^[0-9a-f]{12,32}$/.test(ref)) notFound();
  const res = await gateway.truthBout(ref);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This bout" />; }
  const t = res.data;
  if (!t) notFound();
  const active = t.corners.filter((c) => ["scheduled", "confirmed"].includes(c.participant_status));
  const title = active.map((c) => c.display_name).join(" vs ") || "Bout";
  return (
    <div className="wrap page">
      <Crumbs items={[{ href: "/truth", label: "Event truth" }, ...(t.event ? [{ href: `/truth/events/${refOf(t.event.public_id)}`, label: t.event.name }] : []), { label: title }]} />
      <header className="page-hero">
        <div className="eyebrow">Bout · {t.bout.status}{t.bout.weight_class_name ? ` · ${t.bout.weight_class_name}` : ""}{t.bout.scheduled_rounds ? ` · ${t.bout.scheduled_rounds} rounds` : ""}</div>
        <h1>{title}</h1>
        <p>{t.event ? `${t.event.name} · ${t.event.event_date}` : ""}</p>
      </header>
      <Lane title="Bout record">
        <div className="truth-kv">
          <div><b>public id</b>{t.bout.public_id}</div>
          <div><b>source</b><Src s={t.bout.source} /></div>
          <div><b>order / segment</b>{t.bout.bout_order ?? "—"} / {t.bout.card_segment ?? "—"}</div>
          <div><b>contracted weight</b>{t.bout.contracted_weight_lb ?? "—"}{t.bout.is_catchweight ? " (catchweight)" : ""}</div>
        </div>
      </Lane>
      <Lane title="Source identities of the bout" count={t.source_identities.length}>
        <Table head={["Namespace", "Source ref", "State", "Source"]} rows={t.source_identities.map((i) => [i.namespace, i.source_ref, i.verification_state, i.source_key ?? "—"])} />
      </Lane>
      <Lane title="Corners (every card state)" count={t.corners.length}>
        <Table head={["Side", "Fighter", "Status", "Replaced by", "Record entering", "Identity evidence", "Source"]} rows={t.corners.map((c) => [c.side,
          <Link key="f" className="link-gold" href={`/fighters/${refOf(c.fighter)}`}>{c.display_name}</Link>,
          `${c.participant_status}${c.status_changed_at ? ` · ${when(c.status_changed_at)}` : ""}`, c.replaced_by_name ?? "—",
          [c.record_entering.wins, c.record_entering.losses, c.record_entering.draws].every((x) => x == null) ? "—" : `${c.record_entering.wins ?? "?"}-${c.record_entering.losses ?? "?"}-${c.record_entering.draws ?? "?"}`,
          <span key="i" className="fine">{[...c.identities.map((i) => `${i.namespace}:${i.source_ref} (${i.verification_state})`),
            ...c.appearance_decisions.map((d) => `${d.decision} tier ${d.tier} by ${d.decided_by} as "${d.observed_name}"`)].join("; ") || "resolver decision on the source observation"}</span>,
          <Src key="s" s={c.source} />])} />
      </Lane>
      <Lane title="Titles contested" count={t.titles.length} empty="No title at stake is stored for this bout.">
        <Table head={["Body", "Tier", "As printed", "Status", "Source"]} rows={t.titles.map((x) => [x.organization.toUpperCase(), x.tier, x.source_native_label ?? "—",
          `${x.status}${x.at_stake ? "" : " (no longer at stake)"}`, <Src key="s" s={x.source} />])} />
      </Lane>
      <Lane title="Each sanctioning body's own statement" count={t.sanctioning_bodies.length} empty="No division to compare with the bodies' documents.">
        <Table head={["Body", "Division", "Before the fight", "After the fight"]} rows={t.sanctioning_bodies.map((b) => [b.body.toUpperCase(), b.weight_class,
          ...[b.before, b.after].map((d, i) => d ? <span key={i} className="fine">{d.as_of_label ?? d.as_of}: {d.belts.map((x) => `${x.designation ?? x.tier}: ${x.holder?.name ?? x.status}`).join("; ") || "no belt listed"}</span> : "—")])} />
      </Lane>
      <Lane title="Results (every revision)" count={t.results.length}>
        <Table head={["Rev", "Current", "State", "Outcome", "Winner", "Method", "Round / time", "Reason", "Source"]} rows={t.results.map((r) => [String(r.revision), r.current ? "yes" : "no",
          r.result_state, r.outcome, r.winner_name ?? "—", `${r.method ?? "—"}${r.decision_type ? ` · ${r.decision_type}` : ""}${r.method_raw ? ` (${r.method_raw})` : ""}`,
          `${r.round ?? "—"} / ${r.time_sec ?? "—"}`, r.change_reason ?? "—", <Src key="s" s={r.source} />])} />
      </Lane>
      <Lane title="Scorecards (every revision)" count={t.scorecards.length}>
        <Table head={["Judge", "Slot", "Rev", "Current", "State", "Totals", "Rounds", "Source"]} rows={t.scorecards.map((s) => [s.judge_name ?? "—", s.slot ?? "—", String(s.revision),
          s.current ? "yes" : "no", s.card_state, `${s.fighter_a_total ?? "?"}–${s.fighter_b_total ?? "?"}`,
          s.rounds.length ? s.rounds.map((x) => `${x.a}-${x.b}`).join(" ") : "totals only", <Src key="x" s={s.source} />])} />
      </Lane>
      <Lane title="Point deductions" count={t.point_deductions.length}>
        <Table head={["Round", "Points", "Reason", "Source"]} rows={t.point_deductions.map((d) => [d.round ?? "—", String(d.points), d.reason ?? "—", <Src key="s" s={d.source} />])} />
      </Lane>
      <Lane title="Officials" count={t.officials.length}>
        <Table head={["Role", "Slot", "Official", "Assignment", "Source"]} rows={t.officials.map((o) => [o.role, o.slot ?? "—", o.name ?? "—", o.assignment_state, <Src key="s" s={o.source} />])} />
      </Lane>
      <Lane title="Weigh-ins" count={t.weigh_ins.length}>
        <Table head={["Fighter", "Kind", "Weight", "Contracted", "Status", "Verification", "Rev", "Source"]} rows={t.weigh_ins.map((w) => [w.fighter_name ?? "—", `${w.kind} #${w.attempt}`,
          w.official_weight_lb ?? "—", w.contracted_weight_lb ?? "—", `${w.status}${w.miss_lb ? ` (${w.miss_lb} over)` : ""}`, w.verification_state, `${w.revision}${w.current ? "" : " (superseded)"}`,
          <Src key="s" s={w.source} />])} />
      </Lane>
      <Lane title="Regulatory actions" count={t.regulatory_actions.length}>
        <Table head={["Fighter", "Type", "Status", "From", "To", "Rev", "Source"]} rows={t.regulatory_actions.map((a) => [a.fighter_name ?? "—", a.action_type, a.status,
          (a.effective_from ?? "—").slice(0, 10), (a.effective_to ?? "—").slice(0, 10), String(a.revision), <Src key="s" s={a.source} />])} />
      </Lane>
      <Lane title="Card history (append-only)" count={t.card_history.length}>
        <Table head={["Change", "Before", "After", "Detected", "Source"]} rows={t.card_history.map((h) => [h.change_type, <span key="b" className="fine">{state(h.before)}</span>,
          <span key="a" className="fine">{state(h.after)}</span>, when(h.detected_at), <Src key="s" s={h.source} />])} />
      </Lane>
      <Lane title="Change ledger" count={t.ledger.length}>
        <Table head={["When", "Change", "Native", "Fighter", "Rev", "Source"]} rows={t.ledger.map((l) => [when(l.occurred_at), l.change_type, l.source_change_type, l.fighter_name ?? "—",
          String(l.revision), <Src key="s" s={l.source} />])} />
      </Lane>
      <Lane title="News events emitted from these facts" count={t.news.length}>
        <Table head={["Type", "State", "Detected"]} rows={t.news.map((n) => [n.event_type, n.state, when(n.detected_at)])} />
      </Lane>
    </div>
  );
}
