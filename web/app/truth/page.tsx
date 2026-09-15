import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { refOf } from "@/lib/slug";
import { SecHead, Unavailable } from "@/components/fight";
import { Lane, Table } from "@/components/truth";

export const revalidate = 60;
export const metadata: Metadata = { title: "Event Truth · investigator", robots: { index: false, follow: false } };

export default async function TruthIndexPage() {
  const res = await gateway.truthIndex(60);
  if (!res.ok) return <Unavailable what="The event truth index" />;
  const { assertions, counts, recent_events: events } = res.data;
  const ledger = (counts.ledger_by_type ?? {}) as Record<string, number>;
  const flat = Object.entries(counts).filter(([, v]) => typeof v === "number") as [string, number][];
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Event Truth V1 · investigator</div>
        <h1>The canonical event graph.</h1>
        <p>Every event, bout, result, scorecard, official, weigh-in and regulatory record stored for Boxing, with the source each lane came from. Nothing here is edited by hand; history is appended, never rewritten.</p>
      </header>
      <section className="mt-4">
        <SecHead kicker={assertions.failures === 0 ? "All graph assertions hold" : `${assertions.failures} assertion failures`} title="Graph Assertions" />
        <Table head={["Assertion", "Kind", "Count", "Sample"]} rows={assertions.checks.map((c) => [
          c.assertion, <span key="k" className={`tag${c.severity === "failure" && c.count > 0 ? " tag--red" : ""}`}>{c.severity}</span>, String(c.count),
          <span key="s" className="fine">{(c.sample ?? []).join(", ") || "—"}</span>])} />
      </section>
      <Lane title="Graph counts">
        <div className="truth-kv">{flat.map(([k, v]) => <div key={k}><b>{k.replace(/_/g, " ")}</b>{v}</div>)}</div>
      </Lane>
      <Lane title="Change ledger by type">
        <div className="truth-kv">{Object.entries(ledger).sort((a, b) => b[1] - a[1]).map(([k, v]) => <div key={k}><b>{k}</b>{v}</div>)}</div>
      </Lane>
      <Lane title="Recent events" count={events.length}>
        <Table head={["Date", "Event", "Status", "Bouts"]} rows={events.map((e) => [e.event_date,
          <Link key="l" className="link-gold" href={`/truth/events/${refOf(e.public_id)}`}>{e.name}</Link>, e.status, String(e.bouts)])} />
      </Lane>
    </div>
  );
}
