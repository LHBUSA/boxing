import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, fmtRange, plural } from "@/lib/format";
import { boutPath } from "@/lib/slug";
import { Note, SecHead, Unavailable } from "@/components/fight";

export const revalidate = 300;
export const metadata: Metadata = { title: "Odds Terminal", description: "Matched boxing markets only: a price attaches to a fight when the sportsbook event matches a bout on the official record. No picks, no probabilities." };

const REASON: Record<string, string> = {
  no_candidate_bout_in_window: "No bout on the official record in the matching window yet",
  ambiguous_bout: "More than one bout could match",
  participant_unresolved: "A participant is not resolved to a verified boxer",
};

export default async function OddsPage() {
  const res = await gateway.marketIndex();
  if (!res.ok) return <Unavailable what="The Odds Terminal" />;
  const d = res.data;
  const maxWeek = Math.max(1, ...d.captured_by_week.map((w) => w.events));
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Odds Terminal · matched markets only</div>
        <h1>Prices meet <em>the record.</em></h1>
        <p>Sportsbook events are captured on a fixed schedule, but a price is shown only when its event matches a bout on the official commission record with both boxers resolved. No loose matching inflates coverage, raw provider data is never redistributed, and no probability or pick is published: the PropBetEdge bout model is untrained.</p>
      </header>

      <div className="tiles">
        <div className="tile"><b className={d.matched.length ? "gold" : "is-na"}>{d.matched.length}</b><span>Bouts with a matched market</span></div>
        <div className="tile"><b>{d.captured_upcoming_events}</b><span>Upcoming sportsbook events captured</span></div>
        <div className="tile"><b>{d.captures_last_7_days}</b><span>Captures in the last 7 days</span><small>{d.last_capture_at ? `last ${fmtDate(d.last_capture_at.slice(0, 10))}` : ""}</small></div>
        <div className="tile"><b>{d.unmatched_open}</b><span>Waiting for a verified bout</span></div>
      </div>

      <section className="mt-4">
        <SecHead kicker="Per bout · opening, current, best, consensus, books" title="Matched Markets" />
        {d.matched.length ? (
          <div className="blist">
            {d.matched.map((b) => (
              <Link key={b.public_id} href={boutPath(b)} className="bline">
                <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{b.a?.name} vs {b.b?.name}</span><span className="bline__meta">{fmtDate(b.event.date)} · {b.event.name}</span></span>
                <span className="bline__res"><span className="bline__method">Market →</span></span>
              </Link>
            ))}
          </div>
        ) : (
          <Note title="No matched market yet">Upcoming sportsbook events are tracked, but none matches a bout on the official record yet: commission bout sheets for those cards are not filed. Each match appears on its Fight Center the moment it exists.</Note>
        )}
      </section>

      <div className="split mt-4">
        <section>
          <SecHead kicker="Counts only · no prices" title="Capture Coverage by Week" />
          <div className="decades">
            {d.captured_by_week.map((w) => (
              <div className="decade" key={w.week_start} style={{ gridTemplateColumns: "120px minmax(0,1fr)" }}>
                <div className="mono dim" style={{ fontSize: 13 }}>{fmtRange(w.week_start, new Date(Date.parse(`${w.week_start}T12:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10))}</div>
                <div className="decade__bar decade__bar--gold"><i style={{ width: `${Math.round((w.events / maxWeek) * 100)}%` }} /><span>{plural(w.events, "sportsbook event")}</span></div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <SecHead kicker="Why an event is not matched" title="Match States" />
          <div className="blist">
            {Object.entries(d.unmatched_reasons).map(([k, n]) => (
              <div key={k} className="bline"><span className="bline__names"><span style={{ color: "var(--paper)" }}>{REASON[k] ?? k.replaceAll("_", " ")}</span></span><span className="bline__res"><span className="bline__method">{n}</span></span></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
