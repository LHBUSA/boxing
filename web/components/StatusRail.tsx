import Link from "next/link";
import { gateway, todayUtc } from "@/lib/gateway";
import { cityLine, daysBetween, fmtDateShort, methodLabel, shortEventName, winnerLoser } from "@/lib/format";
import { eventPath } from "@/lib/slug";
import { eventState } from "@/lib/weekend";
import type { EventSummary } from "@/lib/types";

// Global event rail. Priority: LIVE BOXING, TODAY, THIS WEEKEND, UPCOMING, then
// the latest final. Static (no marquee); scrolls sideways inside itself only.

function group(e: EventSummary, today: string): { label: string; tone: string } {
  const s = eventState(e, today);
  if (s === "today") return { label: "Fight night", tone: "live" };
  if (s === "final") return { label: "Final", tone: "final" };
  if (s === "results_pending") return { label: "Results pending", tone: "pending" };
  const n = daysBetween(today, e.date);
  return n <= 7 ? { label: "This week", tone: "soon" } : { label: fmtDateShort(e.date), tone: "neutral" };
}

export async function StatusRail() {
  const [up, done] = await Promise.all([gateway.events("upcoming", { limit: 6 }), gateway.events("results", { limit: 2 })]);
  if (!up.ok && !done.ok) return null;
  const today = todayUtc();
  const items = [...(up.ok ? up.data.rows : []).slice(0, 5), ...(done.ok ? done.data.rows : []).slice(0, 2)];
  if (!items.length) return null;
  return (
    <div className="rail" aria-label="Boxing event status">
      <div className="rail__inner wrap">
        <span className="rail__label">On the record</span>
        <ul className="rail__list">
          {items.map((e) => {
            const g = group(e, today);
            const { winner, loser } = e.headline ? winnerLoser(e.headline) : { winner: null, loser: null };
            const where = cityLine(e.venue) ?? e.commission?.jurisdiction ?? null;
            return (
              <li key={e.public_id}>
                <Link href={eventPath(e)} className="rail__item">
                  <span className={`rail__state rail__state--${g.tone}`}>{g.label}</span>
                  {g.label !== fmtDateShort(e.date) ? <span className="rail__date">{fmtDateShort(e.date)}</span> : null}
                  <span className="rail__name">{shortEventName(e.name, e.venue)}</span>
                  {where ? <span className="rail__where">{where}</span> : null}
                  {winner && loser ? (
                    <span className="rail__detail">{winner.name} def. {loser.name}{e.headline?.result ? ` · ${methodLabel(e.headline.result, true)}` : ""}</span>
                  ) : e.status !== "complete" && e.bout_count === 0 ? (
                    <span className="rail__detail rail__detail--muted">Card not filed yet</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
