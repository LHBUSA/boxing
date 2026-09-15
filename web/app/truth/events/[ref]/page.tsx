import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gateway } from "@/lib/gateway";
import { refOf } from "@/lib/slug";
import { Crumbs, SecHead, Unavailable } from "@/components/fight";
import { Lane, Src, Table, state, when } from "@/components/truth";

export const revalidate = 60;
export const metadata: Metadata = { title: "Event truth · investigator", robots: { index: false, follow: false } };
type Props = { params: Promise<{ ref: string }> };

export default async function TruthEventPage({ params }: Props) {
  const { ref } = await params;
  if (!/^[0-9a-f]{12,32}$/.test(ref)) notFound();
  const res = await gateway.truthEvent(ref);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This event" />; }
  if (!res.data) notFound();
  const { event: e, source_identities: ids, organizations, bouts, card_history: history, ledger } = res.data;
  return (
    <div className="wrap page">
      <Crumbs items={[{ href: "/truth", label: "Event truth" }, { label: e.name }]} />
      <header className="page-hero">
        <div className="eyebrow">Event · {e.status} · {e.event_date}</div>
        <h1>{e.name}</h1>
        <p>{e.venue ? `${e.venue.name}${e.venue.city ? `, ${e.venue.city}` : ""}` : "Venue not on record"} · {e.commission?.name ?? "No commission on record"}</p>
      </header>
      <Lane title="Event record">
        <div className="truth-kv">
          <div><b>public id</b>{e.public_id}</div>
          <div><b>source</b><Src s={e.source} /></div>
          <div><b>start</b>{when(e.start_at)}</div>
          <div><b>broadcast notes</b>{e.broadcast_notes ?? "—"}</div>
        </div>
      </Lane>
      <Lane title="Source identities" count={ids.length}>
        <Table head={["Namespace", "Source ref", "State", "Source"]} rows={ids.map((i) => [i.namespace, i.source_ref, i.verification_state, i.source_key ?? "—"])} />
      </Lane>
      <Lane title="Organizations" count={organizations.length} empty="No promoter, broadcaster or sanctioning role is stored from an approved source.">
        <Table head={["Role", "Organization", "Source"]} rows={organizations.map((o) => [o.role, o.name, <Src key="s" s={o.source} />])} />
      </Lane>
      <section className="mt-4">
        <SecHead kicker={`${bouts.length} bouts, including cancelled and replaced`} title="Card" />
        <Table head={["#", "Bout", "Corners", "Status", "Result", "Titles", "Cards / officials / weigh-ins", "Source"]} rows={bouts.map((b) => [
          b.bout_order ?? "—",
          <Link key="b" className="link-gold" href={`/truth/bouts/${refOf(b.public_id)}`}>{refOf(b.public_id)}</Link>,
          <span key="c">{b.corners.map((c) => <span key={`${c.side}${c.fighter}`} className={c.participant_status === "replaced" ? "dim" : ""} style={{ display: "block" }}>{c.side}: {c.display_name} ({c.participant_status})</span>)}</span>,
          `${b.status}${b.weight_class ? ` · ${b.weight_class}` : ""}${b.scheduled_rounds ? ` · ${b.scheduled_rounds} rds` : ""}`,
          b.result ? `${b.result.outcome}${b.result.method ? ` · ${b.result.method}` : ""}${b.result.round ? ` R${b.result.round}` : ""} (${b.result.result_state}, rev ${b.result.revision})` : "—",
          b.titles.join(", ") || "—",
          `${b.scorecards} / ${b.officials} / ${b.weigh_ins}`,
          <Src key="s" s={b.source} />,
        ])} />
      </section>
      <Lane title="Card history (append-only)" count={history.length}>
        <Table head={["Change", "Bout", "Before", "After", "Detected", "Source"]} rows={history.map((h) => [h.change_type, h.bout ? refOf(h.bout) : "event",
          <span key="b" className="fine">{state(h.before)}</span>, <span key="a" className="fine">{state(h.after)}</span>, when(h.detected_at), <Src key="s" s={h.source} />])} />
      </Lane>
      <Lane title="Change ledger" count={ledger.length}>
        <Table head={["When", "Change", "Native", "Bout", "Fighter", "Rev", "Source"]} rows={ledger.map((l) => [when(l.occurred_at), l.change_type, l.source_change_type,
          l.bout ? refOf(l.bout) : "—", l.fighter_name ?? "—", String(l.revision), <Src key="s" s={l.source} />])} />
      </Lane>
    </div>
  );
}
