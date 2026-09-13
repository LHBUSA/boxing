import Link from "next/link";
import { Portrait } from "./Portrait";
import { Chip, Eyebrow, RingFrame, SectionHead, StateNote } from "./ui";
import { BoutRow, CornerDot, FormStrip, HistoryChip, ScorecardTable, WeighInLine } from "./boxing";
import { DnaPanel } from "./DnaPanel";
import { comparisonRows, fightRead, pathsToVictory, phaseProfile, UNKNOWN_PHYSICALS, whatMatters } from "@/lib/matchup";
import { cityLine, divisionLabel, fmtDate, fmtRecord, methodLabel, plural, resultLine } from "@/lib/format";
import { eventPath, fighterPath } from "@/lib/slug";
import type { BoutDetail, Corner, CornerDetail } from "@/lib/types";

function Side({ c, d, side, won, lost }: { c: Corner | null; d: CornerDetail | undefined; side: "a" | "b"; won: boolean; lost: boolean }) {
  if (!c || !d) return <div className={`fo__side fo__side--${side}`}><StateNote kind="review" title="Corner not on verified record" compact /></div>;
  const tone = c.corner ?? "neutral";
  return (
    <div className={`fo__side fo__side--${side} fo__side--${tone}${won ? " is-won" : ""}${lost ? " is-lost" : ""}`}>
      <Link href={fighterPath(c)} className="fo__portrait" aria-label={`${c.name} dossier`}>
        <Portrait name={c.name} id={c.public_id} corner={c.corner} size={196} />
      </Link>
      <div className="fo__id">
        <div className="fo__corner">
          <CornerDot corner={c.corner} />
          <span>{c.corner ? `${c.corner === "red" ? "Red" : "Blue"} corner` : "Corner not listed"}</span>
          {won ? <Chip kind="final">Winner</Chip> : null}
        </div>
        <h2 className="fo__name"><Link href={fighterPath(c)}>{c.name}</Link></h2>
        <div className="fo__rec">
          <span className="fo__recnum">{d.entering.bouts ? fmtRecord(d.entering) : "0-0"}</span>
          <span className="fo__recsub">{d.entering.bouts ? `verified record entering · ${plural(d.entering.bouts, "bout")}` : "no earlier verified bout"}</span>
        </div>
        <div className="fo__chips">
          <HistoryChip bouts={d.entering.bouts} />
          {d.recent_entering.length ? <FormStrip results={d.recent_entering.map((x) => x.result)} /> : null}
        </div>
        <dl className="fo__facts">
          <div><dt>Weigh-in</dt><dd><WeighInLine c={c} contracted={null} /></dd></div>
          {d.fighter.stance ? <div><dt>Stance</dt><dd>{d.fighter.stance}</dd></div> : null}
          {d.fighter.nationality ? <div><dt>Nationality</dt><dd>{d.fighter.nationality}</dd></div> : null}
          <div><dt>All verified</dt><dd>{fmtRecord(d.record_all)} · {plural(d.record_all.bouts, "bout")}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export function Faceoff({ d }: { d: BoutDetail }) {
  const b = d.bout;
  const r = b.result;
  const aWon = r?.winner_side === "a";
  const bWon = r?.winner_side === "b";
  const div = divisionLabel(b.weight);
  const place = [d.event.venue?.name, cityLine(d.event.venue)].filter(Boolean).join(" · ");
  const complete = d.event.status === "complete";
  return (
    <RingFrame as="section" className="fo">
      <Side c={b.a} d={d.corners.a} side="a" won={aWon} lost={bWon} />
      <div className="fo__center">
        <div className="fo__vs">{r ? (r.outcome === "win" ? "Final" : r.outcome === "draw" ? "Draw" : "Final") : complete ? "Result pending" : "vs"}</div>
        {r ? <div className="fo__result">{resultLine(r, b.scheduled_rounds)}</div> : null}
        <dl className="fo__meta">
          <div><dt>Scheduled</dt><dd>{b.scheduled_rounds ? `${b.scheduled_rounds} rounds` : "Not on sheet"}</dd></div>
          <div><dt>Division</dt><dd>{div ?? "Not on sheet"}</dd></div>
          <div><dt>Titles</dt><dd>{b.titles.length ? b.titles.map((t) => `${t.organization} ${t.label}`).join(" · ") : "No title on record"}</dd></div>
          <div><dt>Card</dt><dd><Link href={eventPath(d.event)}>{fmtDate(d.event.date)}</Link>{place ? <span className="muted"> · {place}</span> : null}</dd></div>
          <div><dt>Market</dt><dd>{d.market ? "Matched" : "No matched market"}</dd></div>
        </dl>
        {r && r.revision > 1 ? <Chip kind="review">Result revised by the commission</Chip> : null}
      </div>
      <Side c={b.b} d={d.corners.b} side="b" won={bWon} lost={aWon} />
    </RingFrame>
  );
}

export function MatchupIntel({ d, compact = false }: { d: BoutDetail; compact?: boolean }) {
  const aName = d.bout.a?.name ?? "Corner A";
  const bName = d.bout.b?.name ?? "Corner B";
  const rows = comparisonRows(d);
  const factors = whatMatters(d);
  const read = fightRead(d);
  const unknown = UNKNOWN_PHYSICALS(d);
  const A = d.corners.a;
  const B = d.corners.b;
  const later = Math.max(A?.later_bouts ?? 0, B?.later_bouts ?? 0);
  const complete = Boolean(d.bout.result) || d.event.status === "complete";
  const paths = A && B ? [pathsToVictory(A), pathsToVictory(B)] : [null, null];
  const phases = A && B ? [phaseProfile(A), phaseProfile(B)] : [null, null];
  return (
    <div className="intel">
      <div className="intel__grid">
        <section className="intel__read">
          <SectionHead kicker="Evidence-led" title="Fight Read" />
          {read.map((p, i) => <p key={i} className={i === 0 ? "lede" : ""}>{p}</p>)}
          <SectionHead kicker={`${factors.length ? plural(factors.length, "factor") : "Threshold"} · facts only`} title="What Matters" />
          {factors.length ? (
            <ol className="factors">
              {factors.map((f) => (
                <li key={f.title}><strong>{f.title}</strong><span>{f.evidence}</span></li>
              ))}
            </ol>
          ) : (
            <StateNote kind="building" title="No difference clears the evidence threshold" compact>
              A factor appears when verified records differ by at least 3 bouts, a scheduled distance, 3 lb on the scale, 180 days of activity, or a missed weight.
            </StateNote>
          )}
        </section>
        <section className="intel__compare">
          <SectionHead kicker="Differences, not advantages" title="Key Comparison" />
          <div className="mirror" role="table" aria-label="Key comparison">
            <div className="mirror__row mirror__row--head" role="row">
              <span role="columnheader" className="mirror__a"><CornerDot corner={d.bout.a?.corner} /> {aName}</span>
              <span role="columnheader" className="mirror__label">&nbsp;</span>
              <span role="columnheader" className="mirror__b">{bName} <CornerDot corner={d.bout.b?.corner} /></span>
            </div>
            {rows.map((r) => (
              <div className={`mirror__row${r.differs ? " is-diff" : ""}`} role="row" key={r.label}>
                <span role="cell" className="mirror__a">{r.a ?? <span className="muted">Not on record</span>}</span>
                <span role="rowheader" className="mirror__label">{r.label}</span>
                <span role="cell" className="mirror__b">{r.b ?? <span className="muted">Not on record</span>}</span>
              </div>
            ))}
          </div>
          {unknown.length ? <p className="fine">Not yet on verified record for either boxer: {unknown.join(", ")}. Age is never shown without a verified date of birth.</p> : null}
        </section>
      </div>

      {complete ? (
        <section>
          <SectionHead kicker={d.bout.referee ? `Referee: ${d.bout.referee}` : "Officials"} title="Official Scorecards" />
          <ScorecardTable b={d.bout} aName={aName} bName={bName} />
          {d.result_history.length > 1 ? (
            <div className="revisions">
              <Eyebrow>Official revisions, oldest first</Eyebrow>
              <ol>
                {d.result_history.map((h) => (
                  <li key={h.revision}>Revision {h.revision}: {h.outcome.replace("_", " ")}{h.method ? ` · ${methodLabel(h)}` : ""} <span className="muted">({h.state}{h.change_reason ? `, ${h.change_reason.replace(/_/g, " ")}` : ""})</span></li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <SectionHead kicker="PropBetEdge-derived" title="Fight DNA" />
        <DnaPanel
          sides={[{ name: aName, dna: A?.dna ?? [] }, { name: bName, dna: B?.dna ?? [] }]}
          asOf={A?.dna_as_of ?? B?.dna_as_of ?? null}
          context={complete && later >= 0 ? "Includes this bout's result" + (later ? ` and ${plural(later, "later bout")}` : "") + "; it is a current profile, not a pre-fight snapshot." : undefined}
        />
      </section>

      {!compact ? (
        <div className="intel__grid">
          <section>
            <SectionHead kicker="Tendencies, not picks" title="Paths to Victory" />
            {paths[0] || paths[1] ? (
              <div className="paths">
                {[[aName, paths[0]], [bName, paths[1]]].map(([n, p]) => (
                  <div key={n as string} className="paths__side">
                    <div className="paths__who">{n as string}</div>
                    {p ? (
                      <>
                        <div className="bar" aria-label="Share of verified wins by method">
                          <span className="bar__seg bar__seg--stop" style={{ flexGrow: parseInt((p as { stoppage: string }).stoppage ?? "0") || 0 }} />
                          <span className="bar__seg bar__seg--dec" style={{ flexGrow: parseInt((p as { decision: string }).decision ?? "0") || 0 }} />
                        </div>
                        <div className="paths__legend"><span>KO/TKO/RTD {(p as { stoppage: string }).stoppage}</span><span>Decision {(p as { decision: string }).decision}</span></div>
                      </>
                    ) : <p className="muted">Needs at least 5 verified wins.</p>}
                  </div>
                ))}
              </div>
            ) : (
              <StateNote kind="building" title="Building as verified wins accumulate" compact>
                How a boxer&apos;s wins ended is shown once at least five verified wins are on record.
              </StateNote>
            )}
          </section>
          <section>
            <SectionHead kicker="Only with enough evidence" title="Early · Middle · Late" />
            {phases[0] || phases[1] ? (
              <div className="phases">
                {[[aName, phases[0]], [bName, phases[1]]].map(([n, p]) => (
                  <div key={n as string} className="phases__side">
                    <div className="paths__who">{n as string}</div>
                    {p ? (
                      <dl>
                        <div><dt>Rounds 1–3</dt><dd>{(p as { early: string | null }).early ?? <span className="muted">Building</span>}</dd></div>
                        <div><dt>Rounds 4–8</dt><dd><span className="muted">Not derived</span></dd></div>
                        <div><dt>Round 9+</dt><dd>{(p as { late: string | null }).late ?? <span className="muted">Building</span>}</dd></div>
                      </dl>
                    ) : <p className="muted">Needs at least 3 stoppage wins with a known round.</p>}
                  </div>
                ))}
                <p className="fine">Share of verified stoppage wins ending in each phase.</p>
              </div>
            ) : (
              <StateNote kind="building" title="Not enough stoppages with a known round" compact>
                The phase profile needs at least three verified stoppage wins with a recorded round.
              </StateNote>
            )}
          </section>
        </div>
      ) : null}

      <section>
        <SectionHead kicker="Matched markets only" title="Market" />
        {d.market ? (
          <MarketBlock d={d} />
        ) : (
          <StateNote kind="neutral" title="No matched market history yet" compact>
            Sportsbook prices are attached only after a market is matched to this verified bout. No probability, fair line or pick is published: the PropBetEdge bout model is untrained.
          </StateNote>
        )}
      </section>

      {d.card.length ? (
        <section>
          <SectionHead kicker="Official sheet order" title="Also on this card" href={eventPath(d.event)} hrefLabel="Full card" />
          <div className="bout-list">
            {d.card.map((b) => <BoutRow key={b.public_id} b={b} completeEvent={d.event.status === "complete"} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MarketBlock({ d }: { d: BoutDetail }) {
  const m = d.market!;
  const h2h = m.consensus.filter((c) => c.market_key.startsWith("moneyline"));
  return (
    <div className="market">
      <div className="market__grid">
        {h2h.map((c) => {
          const best = m.best_prices.find((b) => b.market_key === c.market_key && b.selection_key === c.selection_key);
          const open = m.selections.find((s) => s.market_key === c.market_key && s.selection_key === c.selection_key && s.opening_american != null);
          return (
            <div key={c.selection_key} className="market__sel">
              <div className="eyebrow">{c.selection_key}</div>
              <div className="market__best">{best ? (best.best_american > 0 ? `+${best.best_american}` : best.best_american) : "—"}</div>
              <div className="muted">Best of {plural(c.bookmaker_count, "book")}{open?.opening_american != null ? ` · opened ${open.opening_american > 0 ? "+" : ""}${open.opening_american}` : ""}</div>
            </div>
          );
        })}
      </div>
      <p className="fine">{m.rights.attribution} Summarized for display only.</p>
    </div>
  );
}
