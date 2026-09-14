import Link from "next/link";
import { cityLine, fmtDate, plural } from "@/lib/format";
import { weekStart } from "@/lib/weekend";
import type { EventSummary } from "@/lib/types";
import type { EventTimeline, MarketIndex } from "@/lib/types-phase2";

// One card's operating facts, each either on record or honestly pending. Boxing weekends are multi-card,
// so every card carries its own promotion, commission, venue, stakes, market and media state.
export function CardFacts({ e, market, timeline }: { e: EventSummary; market?: MarketIndex | null; timeline?: EventTimeline | null }) {
  const week = market?.captured_by_week.find((w) => w.week_start === weekStart(e.date));
  const matched = market?.matched.filter((m) => m.event.public_id === e.public_id).length ?? 0;
  const rows: { k: string; v: React.ReactNode; pending?: boolean }[] = [
    { k: "Promotion", v: e.promoters.length ? e.promoters.map((p, i) => <span key={p}>{i ? " · " : ""}<Link className="link-gold" href={`/promoters/${p.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}>{p}</Link></span>) : "As listed on the commission schedule", pending: !e.promoters.length },
    { k: "Commission", v: e.commission?.name ?? "Not on record", pending: !e.commission },
    { k: "Venue", v: [e.venue?.name, cityLine(e.venue)].filter(Boolean).join(" · ") || "Not on record", pending: !e.venue },
    { k: "Date", v: `${fmtDate(e.date, { weekday: true })}${e.start_at ? ` · ${new Date(e.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET` : ""}` },
    { k: "Bout sheet", v: e.sheet_filed ? `${plural(e.bout_count, "verified bout")}${e.awaiting_verification ? ` · ${e.awaiting_verification} awaiting identity review` : ""}` : "Not filed yet", pending: !e.sheet_filed },
    { k: "Title stakes", v: e.title_bouts ? plural(e.title_bouts, "title bout") : "None on record", pending: !e.title_bouts },
    { k: "Officials", v: timeline?.card.officials_assigned ? plural(timeline.card.officials_assigned, "assignment") : "Not assigned on record", pending: !timeline?.card.officials_assigned },
    { k: "How to watch", v: "Broadcast not on record", pending: true },
    { k: "Market", v: matched ? plural(matched, "matched bout") : week ? `${plural(week.events, "sportsbook event")} captured this week · none matched to this card yet` : "No matched market", pending: !matched },
    { k: "Official video", v: timeline?.videos?.length ? plural(timeline.videos.length, "official video") : "None approved yet", pending: !timeline?.videos?.length },
  ];
  return (
    <dl className="cardfacts">
      {rows.map((r) => <div key={r.k} className={r.pending ? "is-pending" : ""}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}
    </dl>
  );
}
