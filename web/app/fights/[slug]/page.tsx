import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { canonical } from "@/lib/posture";
import { gateway, optional } from "@/lib/gateway";
import { cityLine, divisionLabel, fmtDate, fmtLb, fmtRecord, methodLabel, plural } from "@/lib/format";
import { boutPath, eventPath, fighterPath, parseRef, refOf } from "@/lib/slug";
import { fightRead, pathsToVictory, readLimits, whatMatters } from "@/lib/matchup";
import { FighterArt } from "@/components/FighterArt";
import { JsonLd } from "@/components/JsonLd";
import { boutJsonLd } from "@/lib/seo";
import { BoutLine, CompareBars, Crumbs, DnaBars, FormStrip, Note, PublishedTotals, ScorecardView, SecHead, Unavailable, surname, verdictLine, type CmpRow } from "@/components/fight";
import type { BoutDetail, CornerDetail } from "@/lib/types";
import type { BoutContext, HallBadge, SourcedBio } from "@/lib/types-os";
import type { OfficialMetric } from "@/lib/types-phase2";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const ref = parseRef(slug);
  if (!ref) notFound();
  return gateway.bout(ref.slice(0, 12));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) return { title: "Fight", robots: { index: false } };
  const { bout: b, event: e } = res.data;
  const names = `${b.a?.name ?? "TBA"} vs ${b.b?.name ?? "TBA"}`;
  return {
    title: `${names}${b.result ? `: ${methodLabel(b.result) ?? "result"}` : ""} · ${fmtDate(e.date)}`,
    description: `Fight Center for ${names} at ${e.name}: official result, judges' scorecards, verified records, Fight DNA and officials.`,
    alternates: canonical(boutPath(b)),
  };
}

function Side({ d, c, side, ctx }: { d: BoutDetail; c: CornerDetail | undefined; side: "a" | "b"; ctx?: { sourced_bio: SourcedBio | null; hall_of_fame: HallBadge[] } }) {
  const corner = side === "a" ? d.bout.a : d.bout.b;
  if (!corner || !c) return <div className={`faceoff__side faceoff__side--${side}`}><Note title="Corner not on verified record" /></div>;
  const won = d.bout.result?.winner_side === side;
  return (
    <div className={`faceoff__side faceoff__side--${side}`}>
      <div style={{ width: "100%", display: "grid", justifyItems: side === "a" ? "start" : "end" }}>
        <FighterArt name={corner.name} id={corner.public_id} corner={corner.corner ?? (side === "a" ? "red" : "blue")} portrait={corner.portrait} side={side} href={fighterPath(corner)} />
      </div>
      <div>
        <div className="faceoff__sub">
          <span className={`tag ${side === "a" ? "tag--red" : "tag--blue"}`}>{corner.corner ? `${corner.corner} corner` : side === "a" ? "Corner A" : "Corner B"}</span>
          {won ? <span className="tag tag--solid">Winner</span> : null}
        </div>
        <h2 className="faceoff__name mt-1"><Link href={fighterPath(corner)}>{corner.name}</Link></h2>
        <div className="faceoff__sub mt-1">
          <span className="faceoff__rec">{c.record_all.bouts ? fmtRecord(c.record_all) : "0-0"}</span>
          <span>verified · {plural(c.record_all.bouts, "bout")}</span>
        </div>
        {c.recent_entering.length ? <div className="faceoff__sub mt-1"><FormStrip results={c.recent_entering.map((x) => x.result)} /></div> : null}
        {ctx?.hall_of_fame?.length ? <div className="faceoff__sub mt-1">{ctx.hall_of_fame.map((h) => <Link key={h.institution_slug + h.year} href="/hall-of-fame" className="tag tag--gold">{h.institution.replace("International Boxing Hall of Fame", "IBHOF")} · {h.year}</Link>)}</div> : null}
      </div>
    </div>
  );
}

function rows(d: BoutDetail, ctx: BoutContext | null): CmpRow[] {
  const A = d.corners.a;
  const B = d.corners.b;
  if (!A || !B) return [];
  const rec = (c: CornerDetail) => (c.entering.bouts ? `${fmtRecord(c.entering)}` : "First verified bout");
  const out: CmpRow[] = [
    { label: "Record entering", a: rec(A), b: rec(B), an: A.entering.bouts, bn: B.entering.bouts },
    { label: "KO/TKO/RTD wins", a: A.entering.bouts ? String(A.entering.stoppage_wins) : null, b: B.entering.bouts ? String(B.entering.stoppage_wins) : null, an: A.entering.bouts ? A.entering.stoppage_wins : null, bn: B.entering.bouts ? B.entering.stoppage_wins : null },
    { label: "Went the distance", a: A.entering.bouts ? String(A.entering.distance_bouts) : null, b: B.entering.bouts ? String(B.entering.distance_bouts) : null, an: A.entering.bouts ? A.entering.distance_bouts : null, bn: B.entering.bouts ? B.entering.distance_bouts : null },
    { label: "Longest bout before", a: A.entering.max_scheduled_rounds ? `${A.entering.max_scheduled_rounds} rds` : null, b: B.entering.max_scheduled_rounds ? `${B.entering.max_scheduled_rounds} rds` : null, an: A.entering.max_scheduled_rounds, bn: B.entering.max_scheduled_rounds },
    { label: "Official weigh-in", a: fmtLb(d.bout.a?.weigh_in?.weight_lb), b: fmtLb(d.bout.b?.weigh_in?.weight_lb), an: d.bout.a?.weigh_in?.weight_lb ?? null, bn: d.bout.b?.weigh_in?.weight_lb ?? null },
  ];
  const sa = ctx?.corners?.a?.sourced_bio;
  const sb = ctx?.corners?.b?.sourced_bio;
  if (sa?.age_years || sb?.age_years) out.push({ label: "Age · Wikidata", a: sa?.age_years ? String(sa.age_years) : null, b: sb?.age_years ? String(sb.age_years) : null, an: sa?.age_years ?? null, bn: sb?.age_years ?? null });
  if (!A.fighter.height_cm && !B.fighter.height_cm && (sa?.height_cm || sb?.height_cm)) out.push({ label: "Height · Wikidata", a: sa?.height_cm ? Math.round(sa.height_cm) + " cm" : null, b: sb?.height_cm ? Math.round(sb.height_cm) + " cm" : null, an: sa?.height_cm ?? null, bn: sb?.height_cm ?? null });
  if (sa?.nationality?.length || sb?.nationality?.length) out.push({ label: "Nationality · Wikidata", a: sa?.nationality?.join(" / ") ?? null, b: sb?.nationality?.join(" / ") ?? null });
  if (A.fighter.stance || B.fighter.stance) out.push({ label: "Stance", a: A.fighter.stance, b: B.fighter.stance });
  if (A.fighter.height_cm || B.fighter.height_cm) out.push({ label: "Height", a: A.fighter.height_cm ? `${Math.round(A.fighter.height_cm)} cm` : null, b: B.fighter.height_cm ? `${Math.round(B.fighter.height_cm)} cm` : null, an: A.fighter.height_cm, bn: B.fighter.height_cm });
  if (A.fighter.reach_cm || B.fighter.reach_cm) out.push({ label: "Reach", a: A.fighter.reach_cm ? `${Math.round(A.fighter.reach_cm)} cm` : null, b: B.fighter.reach_cm ? `${Math.round(B.fighter.reach_cm)} cm` : null, an: A.fighter.reach_cm, bn: B.fighter.reach_cm });
  return out.filter((r) => r.a != null || r.b != null);
}

function officialSample(role: string, dna: OfficialMetric[]) {
  const key = role === "judge" ? "judge.avg_card_margin" : "referee.stoppage_rate";
  const m = dna.find((x) => x.key === key);
  if (!m || m.status !== "available" || m.value == null) return m?.sample_size ? "DNA building · n=" + m.sample_size : "DNA building";
  return role === "judge" ? "Avg card margin " + m.value.toFixed(1) + " · n=" + m.sample_size : "Stoppage rate " + Math.round(m.value * 100) + "% · n=" + m.sample_size;
}

export default async function FightPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This fight" />; }
  const d = res.data;
  if (`/fights/${slug}` !== boutPath(d.bout)) permanentRedirect(boutPath(d.bout));
  const ctx = optional(await gateway.boutContext(refOf(d.bout.public_id)));
  const b = d.bout;
  const aName = b.a?.name ?? "Corner A";
  const bName = b.b?.name ?? "Corner B";
  const complete = Boolean(b.result) || d.event.status === "complete";
  const read = fightRead(d);
  const factors = whatMatters(d);
  const limits = readLimits(d, ctx);
  const place = [d.event.venue?.name, cityLine(d.event.venue)].filter(Boolean).join(" · ");
  const A = d.corners.a;
  const B = d.corners.b;
  const pa = A ? pathsToVictory(A) : null;
  const pb = B ? pathsToVictory(B) : null;
  const judges = b.scorecards.filter((s) => s.judge_public_id);
  const assignedJudges = (ctx?.officials ?? []).filter((o) => o.role === "judge");
  const later = Math.max(A?.later_bouts ?? 0, B?.later_bouts ?? 0);

  return (
    <div className="wrap page">
      <JsonLd data={boutJsonLd(d)} />
      <Crumbs items={[{ label: "Events", href: "/events" }, { label: d.event.name, href: eventPath(d.event) }, { label: `${surname(aName)} vs ${surname(bName)}` }]} />
      <section className="faceoff">
        <div className="faceoff__meta">
          <span className="eyebrow">{[divisionLabel(b.weight), b.scheduled_rounds ? `${b.scheduled_rounds} rounds` : null, b.titles.length ? b.titles.map((t) => `${t.organization} ${t.label}`).join(" · ") : null].filter(Boolean).join(" · ") || "Bout"}</span>
          <span className={`tag ${complete ? "tag--gold" : "tag--live"}`}>{complete ? (b.result ? "Final" : "Result pending") : fmtDate(d.event.date, { year: false })}</span>
        </div>
        <div className="faceoff__grid">
          <Side d={d} c={A} side="a" ctx={ctx?.corners?.a} />
          <div className="faceoff__vs"><b>vs</b><span className="tag">{b.scheduled_rounds ? `${b.scheduled_rounds} rds` : "Rounds n/a"}</span></div>
          <Side d={d} c={B} side="b" ctx={ctx?.corners?.b} />
        </div>
        <div className="result-band">
          <div>
            <div className="eyebrow">{complete ? "Official result" : "Scheduled"}</div>
            <strong>{b.result ? verdictLine(b) : complete ? "Official result not recorded" : `${aName} vs ${bName}`}</strong>
          </div>
          <div className="mono dim" style={{ fontSize: 13 }}>
            <Link href={eventPath(d.event)} className="link-gold">{d.event.name}</Link><br />
            {fmtDate(d.event.date, { weekday: true })}{place ? ` · ${place}` : ""}
          </div>
        </div>
      </section>

      <div className="split mt-4">
        <section>
          <SecHead kicker="Evidence-led · facts only" title="Fight Read" />
          {read.map((p, i) => <p key={i} className="read">{p}</p>)}
          {factors.length ? (
            <div className="factors mt-3">{factors.map((f) => <div className="factor" key={f.title}><b>{f.title}</b><span>{f.evidence}</span></div>)}</div>
          ) : (
            <div className="mt-3"><Note title="No difference on record clears the evidence threshold">Factors appear for a gap of 3+ verified bouts, a first assignment at this distance, 3 lb on the scale, 180 days of activity, or a missed weight.</Note></div>
          )}
          {limits.length ? (
            <div className="mt-3">
              <div className="eyebrow eyebrow--dim">What could break the read</div>
              <ul className="limits mt-1">{limits.map((l) => <li key={l.title}><b>{l.title}.</b> {l.evidence}</li>)}</ul>
            </div>
          ) : null}
        </section>
        <section>
          <SecHead kicker="Differences, not advantages" title="Tale of the Tape" />
          <CompareBars rows={rows(d, ctx)} aName={aName} bName={bName} />
          <p className="fine mt-2">Records count bouts on verified record only. Rows marked Wikidata come from the boxer&apos;s identity-proven Wikidata item; stance and reach appear only when verified.</p>
        </section>
      </div>

      {complete ? (
        <section className="mt-4">
          <SecHead kicker={b.referee ? `Referee · ${b.referee}` : "Officials"} title="Official Scorecards" action={b.scorecards.length ? <Link className="link-gold" href={`/scorecards/${b.public_id.slice(-32).slice(0, 12)}`}>Open the scorecard →</Link> : undefined} />
          {b.scorecards.length ? <ScorecardView bout={b} aName={aName} bName={bName} /> : ctx?.published_totals?.totals.length ? (
            <PublishedTotals totals={ctx.published_totals.totals} aName={aName} bName={bName} source={ctx.published_totals.source} sourceUrl={ctx.published_totals.source_url}
              judges={assignedJudges.map((o) => ({ public_id: o.public_id, name: o.name }))} />
          ) : (
            <Note title={b.result?.method === "DECISION" ? "Judges' totals not captured for this decision" : "No judges' cards: this bout did not go to the scorecards"}>
              {b.result?.method === "DECISION" ? "No readable judges' totals for this bout are stored from the commission document." : null}
            </Note>
          )}
          {judges.length || assignedJudges.length || b.referee_public_id ? (
            <div className="tiles mt-2">
              {judges.map((j) => <Link key={j.judge_public_id} href={`/officials/${j.judge_public_id!.slice(-32).slice(0, 12)}`} className="tile"><b style={{ fontSize: 15, fontFamily: "var(--f-ui)" }}>{j.judge}</b><span>Judge · history →</span></Link>)}
              {judges.length ? null : assignedJudges.map((o) => <Link key={o.public_id} href={`/officials/${refOf(o.public_id)}`} className="tile"><b style={{ fontSize: 15, fontFamily: "var(--f-ui)" }}>{o.name}</b><span>Judge (assigned) · history →</span></Link>)}
              {b.referee_public_id ? <Link href={`/officials/${b.referee_public_id.slice(-32).slice(0, 12)}`} className="tile"><b style={{ fontSize: 15, fontFamily: "var(--f-ui)" }}>{b.referee}</b><span>Referee · history →</span></Link> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="band">
        <div className="split">
          <div>
            <SecHead kicker="PropBetEdge-derived · with samples" title="Fight DNA">
              {complete ? `Current profiles, including this result${later ? ` and ${plural(later, "later bout")}` : ""}; not a pre-fight snapshot.` : "Current profiles from verified bouts."}
            </SecHead>
            <DnaBars a={A?.dna ?? []} b={B?.dna ?? []} aName={aName} bName={bName} />
          </div>
          <div>
            <SecHead kicker="Tendencies, not picks" title="Paths to Victory" />
            {pa || pb ? (
              <div className="dnabars">
                {[[aName, pa, "a"], [bName, pb, "b"]].map(([n, p, s]) => (
                  <div key={s as string}>
                    <div className="dnabar__top"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{n as string}</span></div>
                    {p ? <p className="dim mt-1">{(p as { stoppage: string }).stoppage} of verified wins by KO, TKO or RTD · {(p as { decision: string }).decision} by decision <span className="fine">(n={(p as { sample: number }).sample})</span></p>
                      : <p className="fine mt-1">Needs at least five verified wins.</p>}
                  </div>
                ))}
              </div>
            ) : <Note title="Builds with five verified wins">How each boxer&apos;s wins ended is shown once at least five verified wins are on record.</Note>}
            <div className="mt-4">
              <SecHead kicker="Matched markets only" title="Market" />
              {d.market ? (
                <div className="tiles">
                  {d.market.best_prices.filter((p) => p.market_key.startsWith("moneyline")).map((p) => (
                    <div className="tile" key={p.selection_key}><b className="gold">{p.best_american > 0 ? `+${p.best_american}` : p.best_american}</b><span>Best · {p.selection_key}</span><small>{p.bookmaker}</small></div>
                  ))}
                </div>
              ) : <Note title="No matched market for this bout">Prices attach only when a sportsbook event matches this verified bout. No probability or pick is published: the PropBetEdge model is untrained.</Note>}
            </div>
          </div>
        </div>
      </section>

      {ctx?.previous_meetings?.length ? (
        <section className="mt-4">
          <SecHead kicker="Same two boxers on verified record" title="Previous Meetings" />
          <div className="blist">{ctx.previous_meetings.map((m) => (
            <Link key={m.bout_public_id} href={boutPath({ public_id: m.bout_public_id })} className="bline">
              <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{m.result_for_a === "W" ? aName + " won" : m.result_for_a === "L" ? bName + " won" : m.result_for_a === "D" ? "Draw" : "No official result"}</span><span className="bline__meta">{fmtDate(m.date)} · {m.event.name}</span></span>
              <span className="bline__res"><span className="bline__method">{methodLabel({ method: m.method, decision_type: m.decision_type, outcome: m.result_for_a === "D" ? "draw" : "win" }, true) ?? ""}</span></span>
            </Link>
          ))}</div>
        </section>
      ) : null}

      {!complete && ctx?.officials?.length ? (
        <section className="mt-4">
          <SecHead kicker="Assigned by the commission · descriptive, with samples" title="Officials" />
          <div className="tiles">
            {ctx.officials.map((o) => (
              <Link key={o.role + o.public_id} href={"/officials/" + refOf(o.public_id)} className="tile">
                <b style={{ fontSize: 15, fontFamily: "var(--f-ui)" }}>{o.name}</b>
                <span>{o.role === "judge" ? "Judge" : "Referee"} · {plural(o.assignments, "assignment")}</span>
                <small>{officialSample(o.role, o.dna)}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {ctx?.corners && (ctx.corners.a?.promoter_appearances?.length || ctx.corners.b?.promoter_appearances?.length) ? (
        <section className="mt-4">
          <SecHead kicker="Cards listing each promoter · appearances, not affiliation" title="Promotion Context" />
          <div className="split">
            {([["a", aName], ["b", bName]] as const).map(([s2, n]) => (
              <div key={s2}>
                <div className="eyebrow eyebrow--dim">{n}</div>
                <div className="blist mt-1">{(ctx.corners?.[s2]?.promoter_appearances ?? []).slice(0, 4).map((p) => (
                  <Link key={p.key} href={"/promoters/" + p.key} className="bline"><span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{p.name}</span><span className="bline__meta">{fmtDate(p.first_date)} – {fmtDate(p.last_date)}</span></span><span className="bline__res"><span className="bline__method">{plural(p.cards, "card")}</span></span></Link>
                ))}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {d.card.length ? (
        <section>
          <SecHead kicker="Same card · official sheet order" title="Also on the Card" action={<Link className="link-gold" href={eventPath(d.event)}>Fight Center →</Link>} />
          <div className="blist">{d.card.map((x) => <BoutLine key={x.public_id} bout={x} completeEvent={d.event.status === "complete"} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
