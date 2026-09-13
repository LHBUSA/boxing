import type { Metadata } from "next";
import { gateway } from "@/lib/gateway";
import { THRESHOLDS } from "@/lib/matchup";
import { Eyebrow, Ropes, SectionHead, Stat } from "@/components/ui";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Methodology and sources",
  description: "Where PropBetEdge Boxing facts come from, what a verified record means, how Fight DNA, titles, rankings and markets are handled, and what is never shown.",
};

export default async function MethodologyPage() {
  const cov = await gateway.coverage();
  const c = cov.ok ? cov.data : null;
  return (
    <div className="wrap page-pad prose">
      <Eyebrow>Standards</Eyebrow>
      <h1 className="page-title">Methodology</h1>
      <p className="page-lede">PropBetEdge Boxing is built to show the whole sport honestly: what is on the official record, what is derived from it, and what is not known yet.</p>

      <section id="sources">
        <SectionHead title="Sources" kicker="Official records first" />
        <ul>
          <li><strong>Athletic commissions.</strong> Cards, bouts, results, judges&apos; totals, referees and weigh-ins come from published official documents of the {c ? c.commissions.map((x) => x.name).join(", ") : "covered commissions"}. Each event links to its official document.</li>
          <li><strong>Promoters.</strong> A promoter is shown as it is listed on the official sheet. No promoter is presented as a live entity, and no promoter logo is used without permission.</li>
          <li><strong>Sanctioning bodies.</strong> WBC, WBA, IBF and WBO title and ranking data are under source review. Until cleared, titles and rankings show that state instead of a list.</li>
          <li><strong>Markets.</strong> Bookmaker prices are captured through a licensed odds provider and summarized for display, one bout at a time. They attach only to bouts matched to the verified record. Raw feeds are never redistributed.</li>
          <li><strong>Never used:</strong> scraped photos, AI likenesses of real boxers, licensed punch statistics we do not hold, dates of birth without a verified source, federal IDs or medical information.</li>
        </ul>
      </section>

      <Ropes />
      <section>
        <SectionHead title="Verified record" kicker="Not a career record" />
        <p>A boxer&apos;s verified record counts only bouts on PropBetEdge record: bouts from covered commission documents where both boxers have been identified. Bouts elsewhere, or before coverage began, are not included, so a verified record can differ from a boxer&apos;s full professional record. Pages say &ldquo;verified record&rdquo; for that reason.</p>
        <p>A bout from an official sheet waits for <strong>identity verification</strong> when one of its boxers cannot yet be confirmed as a specific person (for example two boxers with the same name). It appears once both are verified. Counts of waiting bouts are shown; the bouts themselves are not.</p>
        <p>Official results can be revised by a commission. The current result is shown; earlier versions are kept and marked &ldquo;Revised&rdquo;.</p>
      </section>

      <Ropes />
      <section>
        <SectionHead title="Fight DNA" kicker="PropBetEdge-derived" />
        <p>Fight DNA metrics are computed from verified bouts, each with a version, an as-of date and a sample size. A metric shows a value only when it clears its minimum sample; otherwise it shows <em>Building</em> with what it needs. Missing values are never shown as zero.</p>
        <p>Finishing and result metrics describe how bouts ended. They are not a measure of punching power. Punch output, accuracy and knockdown metrics need a licensed punch-stat source and are not shown. Opposition-strength scores wait for deeper verified opponent histories.</p>
      </section>

      <Ropes />
      <section>
        <SectionHead title="Matchups" kicker="Facts, not picks" />
        <p>The PropBetEdge bout model is registered but untrained, so no probability, fair line, predicted winner or edge is published anywhere. The key comparison lists differences, not advantages. &ldquo;What Matters&rdquo; factors appear only past fixed thresholds: a verified experience gap of {THRESHOLDS.experienceGapBouts}+ bouts, a first assignment at the scheduled distance, a scale difference of {THRESHOLDS.weighInGapLb}+ lb, an activity gap of {THRESHOLDS.activityGapDays}+ days, or a missed weight.</p>
        <p>The featured card of a fight weekend is chosen by rule, never by promoter: title bouts on record, then bouts on record, then the longest scheduled headline bout, then a verified venue, then the earliest date. On a card, the &ldquo;headline&rdquo; is the longest scheduled bout, because covered commissions do not publish card segments.</p>
      </section>

      <Ropes />
      <section>
        <SectionHead title="Titles and rankings" kicker="Fragmented by design" />
        <p>Every belt is kept separate by sanctioning body and tier: world, super, regular, interim, franchise and vacant are never collapsed into one champion. &ldquo;Undisputed&rdquo; and &ldquo;unified&rdquo; are PropBetEdge derivations under rule pbe_undisputed@1 and are always labelled that way. Rankings belong to their body and division, tied to a dated snapshot.</p>
      </section>

      <Ropes />
      <section id="coverage">
        <SectionHead title="Coverage today" kicker="Live counts" />
        {c ? (
          <div className="onrecord__grid">
            <Stat value={c.bouts} label="Verified bouts" />
            <Stat value={c.official_results} label="Official results" sub={`${c.results_pending} bouts without a recorded result`} />
            <Stat value={c.bouts_with_scorecards} label="Bouts with judges' totals" sub={`${c.scorecard_rounds} round-by-round scores`} />
            <Stat value={c.awaiting_verification} label="Sheet bouts awaiting identity verification" />
            <Stat value={c.fighters_with_dna} label="Boxers with Fight DNA" />
            <Stat value={c.title_records} label="Cleared title records" />
            <Stat value={c.ranking_snapshots} label="Cleared ranking snapshots" />
            <Stat value={c.matched_market_bouts} label="Bouts with a matched market" sub={`${c.captured_market_events_upcoming} upcoming sportsbook events captured`} />
          </div>
        ) : <p className="muted">Coverage counts are temporarily unavailable.</p>}
      </section>
    </div>
  );
}
