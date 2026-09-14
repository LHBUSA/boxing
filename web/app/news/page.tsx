import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, fmtLb, plural } from "@/lib/format";
import { boutPath, eventPath, fighterPath, refOf } from "@/lib/slug";
import { Note, SecHead, Unavailable, verdictLine } from "@/components/fight";
import type { WireItem } from "@/lib/types-os";

export const revalidate = 300;
export const metadata: Metadata = { title: "Boxing Desk", description: "The verified boxing wire: official results, posted scorecards, missed weight and card changes, each linked to its record." };

const KIND: Record<WireItem["kind"], string> = {
  result_official: "Official result", scorecards_posted: "Scorecards posted", missed_weight: "Missed weight", bout_added: "Added to the card",
  bout_cancelled: "Bout cancelled", opponent_replaced: "Opponent replaced", event_postponed: "Card postponed", event_cancelled: "Card cancelled", event_date_changed: "Date changed",
};

function Line({ it }: { it: WireItem }) {
  const b = it.bout;
  const names = b?.a && b?.b ? `${b.a.name} vs ${b.b.name}` : null;
  let body: React.ReactNode = names ?? it.event?.name ?? "";
  let href = b ? boutPath(b) : it.event ? eventPath(it.event) : "/events";
  if (it.kind === "result_official" && b) body = verdictLine(b) ?? names;
  if (it.kind === "scorecards_posted" && b) { body = <>{names} · {plural(Number(it.detail.cards ?? 0), "official card")}</>; href = `/scorecards/${refOf(b.public_id)}`; }
  if (it.kind === "missed_weight") {
    const d = it.detail as { fighter?: string; fighter_public_id?: string; weight_lb?: number; contracted_lb?: number };
    body = <>{d.fighter} weighed {fmtLb(d.weight_lb ?? null)}{d.contracted_lb ? ` for a ${fmtLb(d.contracted_lb)} contract` : ""}{names ? ` · ${names}` : ""}</>;
    if (d.fighter_public_id) href = fighterPath({ public_id: d.fighter_public_id, name: d.fighter ?? "" });
  }
  return (
    <Link href={href} className="bline">
      <span className="bline__names">
        <span className="bline__meta"><span className={`tag ${it.kind === "result_official" ? "tag--gold" : it.kind === "missed_weight" || it.kind.endsWith("cancelled") ? "tag--red" : ""}`}>{KIND[it.kind] ?? it.kind}</span></span>
        <span style={{ color: "var(--paper)", fontWeight: 600 }}>{body}</span>
        {it.event ? <span className="bline__meta">{it.event.name}</span> : null}
      </span>
      <span className="bline__res"><span className="bline__method">{it.event_date ? fmtDate(it.event_date, { year: false }) : ""}</span></span>
    </Link>
  );
}

export default async function NewsPage() {
  const res = await gateway.wire(80);
  if (!res.ok) return <Unavailable what="The Boxing Desk" />;
  const items = res.data;
  const groups = new Map<string, WireItem[]>();
  for (const it of items) {
    const k = it.event?.public_id ?? it.event_date ?? "other";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Boxing Desk · verified wire</div>
        <h1>What the record says.</h1>
        <p>Every line below is a fact on an official commission record: results, judges&apos; cards, the scale and card changes, linked to the fight, fighter or card it concerns. PropBetEdge stories publish only when every figure in them traces to this record; rumors and call-outs are never turned into fight announcements.</p>
      </header>
      {!items.length ? <Note title="Nothing on the wire yet" /> : null}
      <div style={{ display: "grid", gap: 28 }}>
        {[...groups.values()].map((g) => {
          const e = g[0].event;
          return (
            <section key={e?.public_id ?? g[0].at}>
              <SecHead kicker={e ? fmtDate(e.date, { weekday: true }) : undefined} title={e?.name ?? "Record updates"} action={e ? <Link className="link-gold" href={eventPath(e)}>Fight Center →</Link> : undefined} />
              <div className="blist">{g.map((it, i) => <Line key={`${it.kind}-${i}`} it={it} />)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
