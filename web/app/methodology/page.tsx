import type { Metadata } from "next";
import { gateway } from "@/lib/gateway";
import { THRESHOLDS } from "@/lib/matchup";
import { SecHead } from "@/components/fight";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Methodology", description: "Where PropBetEdge Boxing facts come from, what a verified record means, and how Fight DNA, officials, titles, markets and media are handled." };

export default async function MethodologyPage() {
  const cov = await gateway.coverage();
  const c = cov.ok ? cov.data : null;
  const blocks: [string, string, string[]][] = [
    ["Sources", "Official records first", [
      `Cards, bouts, results, judges' totals, referees and weigh-ins come from published documents of the ${c ? c.commissions.map((x) => x.name).join(", ") : "covered athletic commissions"}. Every event links to its official document.`,
      "Promoters are shown exactly as the official sheet lists them. Appearing on a card never implies a fighter is signed to that promoter.",
      "Sanctioning-body titles and rankings are under source review; until cleared, those pages show that state instead of a list.",
    ]],
    ["Verified record", "Not a career record", [
      "A verified record counts only bouts on the covered commission record where both boxers are identified. Bouts elsewhere, or before coverage began, are not included.",
      "A sheet bout waits for identity verification when one boxer cannot yet be confirmed as a specific person. It appears once both are verified.",
      "Commissions can revise results. The current result is shown; earlier versions are kept and marked revised.",
    ]],
    ["Fight DNA and officials", "PropBetEdge-derived, always with samples", [
      "Metrics are computed from verified bouts, each with a version and sample size. A value appears only past its minimum sample; otherwise the page says what it needs.",
      "Result and finishing shares describe how bouts ended, not punching power. Punch-stat metrics need a licensed source and are not shown.",
      "Judge and referee metrics describe past assignments only. No labels such as biased, lenient or early stopper are used.",
    ]],
    ["Matchups and markets", "Facts, not picks", [
      `The PropBetEdge bout model is untrained, so no probability, fair line or pick is published. Matchup factors appear only past fixed thresholds: ${THRESHOLDS.experienceGapBouts}+ verified bouts of experience, a first assignment at the distance, ${THRESHOLDS.weighInGapLb}+ lb on the scale, ${THRESHOLDS.activityGapDays}+ days of activity, or a missed weight.`,
      "Sportsbook prices are captured through a licensed provider, summarized one bout at a time, and attach only after a match to a verified bout. Raw feeds are never redistributed.",
      "On commission cards without published segments, the main event is the longest scheduled bout.",
    ]],
    ["Media", "Rights first", [
      "A fighter photo appears only with a recorded free license or permission, the author and credit, the source page, and evidence that it shows that boxer. Photos are stored by PropBetEdge, never hotlinked, and used only to identify the boxer on pages about their fights.",
      "Without an approved photo, the page uses the PropBetEdge silhouette. It is never a likeness and never a generated face.",
      "Official videos embed only from YouTube channels whose identity is verified and whose rights review is approved.",
    ]],
    ["Fight Week and cards", "Multi-card by design", [
      "A fight week is every card inside one Monday–Sunday week. The featured card is chosen by a fixed rule: title bouts on record, then verified bouts, then the longest scheduled headline bout, then a verified venue, then the earliest date. No promotion is favoured by name.",
      "Every card lists its own promotion, commission, venue, bout sheet, title stakes, officials, broadcast, market and video state; anything not on record says so.",
      "'What could break the read' lists the limits of the evidence (thin verified history, scale or officials not yet recorded, unverified physicals, no matched market). It is not a prediction.",
    ]],
    ["Biography, history and Halls of Fame", "Sourced, never written from memory", [
      "Age, height and nationality marked Wikidata come from the boxer's Wikidata item, used only after identity is proven: that item's Wikipedia boxing record lists a bout on our verified record. Dates of birth are never shown; age is derived.",
      "Hall of Fame pages show recognized institutions' own induction records (year and the institution's category label) as structured on Wikidata (CC0) and spot-checked against the institution. PropBetEdge does not keep a Hall of Fame, and no biography text or Hall photography is reproduced.",
      "History is decade-first because decades are objective. Eras, title lineage and historic media are added only with a documented rule and a cleared source.",
    ]],
  ];
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Standards</div>
        <h1>How PropBetEdge Boxing knows what it shows.</h1>
        <p>What is on the official record, what we derive from it, and what is not known yet.</p>
      </header>
      {c ? (
        <div className="tiles">
          <div className="tile"><b className="gold">{c.bouts}</b><span>Verified bouts</span><small>{c.official_results} official results</small></div>
          <div className="tile"><b>{c.bouts_with_scorecards}</b><span>Decisions with cards</span></div>
          <div className="tile"><b>{c.awaiting_verification}</b><span>Sheet bouts awaiting identity check</span></div>
          <div className="tile"><b>{c.matched_market_bouts}</b><span>Bouts with matched markets</span><small>{c.captured_market_events_upcoming} sportsbook events tracked</small></div>
        </div>
      ) : null}
      {blocks.map(([t, k, items]) => (
        <section className="band" key={t} style={{ paddingBlock: 36 }}>
          <SecHead kicker={k} title={t} />
          <div className="factors">{items.map((i, n) => <div className="factor" key={n}><b>{String(n + 1).padStart(2, "0")}</b><span>{i}</span></div>)}</div>
        </section>
      ))}
    </div>
  );
}
