import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { canonical } from "@/lib/posture";
import { gateway, optional, todayUtc } from "@/lib/gateway";
import { daysBetween, divisionLabel, fmtClock, fmtDate, fmtLb, fmtRecord, methodLabel, plural, STANCE } from "@/lib/format";
import { boutPath, eventPath, fighterPath, parseRef, refOf } from "@/lib/slug";
import { FighterArt } from "@/components/FighterArt";
import { JsonLd } from "@/components/JsonLd";
import { fighterJsonLd } from "@/lib/seo";
import { Crumbs, DnaBars, FormStrip, Note, RChip, SecHead, Unavailable } from "@/components/fight";
import type { FighterBout } from "@/lib/types";
import type { BodyClaim } from "@/lib/types-os";
import { DnaModules } from "@/components/dna";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const ref = parseRef(slug);
  if (!ref) notFound();
  return gateway.fighter(ref.slice(0, 12));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok || !res.data.fighter) return { title: "Fighter", robots: { index: false } };
  const { fighter: f, record: r } = res.data;
  if (r.bouts) return { title: `${f.name}: dossier, verified record, Fight DNA`, description: `${f.name} is ${fmtRecord(r)} in ${plural(r.bouts, "verified bout")} on the official commission record.`, alternates: canonical(fighterPath(f)) };
  const claims = optional(await gateway.fighterContext(refOf(f.public_id)))?.body_claims ?? [];
  const headline = bodyHeadline(claims);
  return { title: `${f.name}: dossier${headline ? ", titles and rankings" : ""}`, description: headline ? `${f.name}: ${headline}, as the sanctioning bodies list them.` : `${f.name}: boxer dossier on PropBetEdge Boxing.`, alternates: canonical(fighterPath(f)) };
}

const TIER: Record<string, string> = { world: "champion", super: "super champion", regular: "regular champion", interim: "interim champion", franchise: "franchise champion" };
const bodyShort = (c: BodyClaim) => c.body.toUpperCase();
// one line per body and division: a title beats a ranking, the body's own label is kept for the detail
function groupClaims(claims: BodyClaim[]) {
  const seen = new Map<string, BodyClaim>();
  for (const c of claims) {
    const k = `${c.body}|${c.division_key}|${c.kind}`;
    if (!seen.has(k)) seen.set(k, c);
  }
  const titles = [...seen.values()].filter((c) => c.kind === "title");
  const titleKeys = new Set(titles.map((c) => `${c.body}|${c.division_key}`));
  const ranks = [...seen.values()].filter((c) => c.kind === "ranking" && !titleKeys.has(`${c.body}|${c.division_key}`));
  return { titles, ranks };
}
function bodyHeadline(claims: BodyClaim[]) {
  const { titles, ranks } = groupClaims(claims);
  if (titles.length) return `${titles.map(bodyShort).filter((v, i, a) => a.indexOf(v) === i).join(", ")} ${titles[0].division.toLowerCase()} ${TIER[titles[0].tier ?? ""] ?? "champion"}`;
  if (ranks.length) return `ranked by ${ranks.map(bodyShort).filter((v, i, a) => a.indexOf(v) === i).join(", ")} at ${ranks[0].division.toLowerCase()}`;
  return null;
}

function how(b: FighterBout) {
  if (!b.event_complete) return "Scheduled";
  if (!b.result) return "Result not recorded";
  const m = methodLabel({ method: b.method, decision_type: b.decision_type, outcome: b.result === "D" ? "draw" : "win" }, true);
  return `${m ?? b.result}${b.method && b.method !== "DECISION" && b.round ? ` · R${b.round}${b.time_sec != null ? ` ${fmtClock(b.time_sec)}` : ""}` : ""}`;
}

export default async function FighterPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This dossier" />; }
  const d = res.data;
  if (d.redirect_public_id) {
    const t = await gateway.fighter(d.redirect_public_id.slice(-32).slice(0, 12));
    if (t.ok && t.data.fighter) permanentRedirect(fighterPath(t.data.fighter));
    notFound();
  }
  const f = d.fighter;
  if (`/fighters/${slug}` !== fighterPath(f)) permanentRedirect(fighterPath(f));
  const ctx = optional(await gateway.fighterContext(refOf(f.public_id)));
  const bio = ctx?.sourced_bio ?? null;
  const r = d.record;
  const today = todayUtc();
  const done = d.bouts.filter((b) => b.event_complete);
  const upcoming = d.bouts.filter((b) => !b.event_complete);
  const latest = done[0];
  const division = done.map((b) => divisionLabel(b.weight)).find(Boolean) ?? null;
  const since = latest ? daysBetween(latest.date, today) : null;
  const weights = done.map((b) => b.weigh_in?.weight_lb).filter((w): w is number => w != null);
  const decisions = done.filter((b) => b.scorecards.some((s) => s.mine != null));
  const commissions = [...new Set(d.bouts.map((b) => b.event.commission).filter(Boolean))];
  const finishRate = r.wins ? Math.round((r.stoppage_wins / r.wins) * 100) : null;
  // 0 verified bouts means only that PropBetEdge has not verified the history yet: nothing bout-derived is rendered
  const hasRecord = r.bouts > 0;
  const { titles, ranks } = groupClaims(ctx?.body_claims ?? []);
  const claimDivision = titles[0]?.division ?? ranks[0]?.division ?? null;
  const nationality = f.nationality ?? (bio?.nationality?.length ? `${bio.nationality.join(" / ")} (identity-proven)` : null);
  const heightReach = f.height_cm || f.reach_cm ? `${f.height_cm ? `${Math.round(f.height_cm)} cm` : "—"} · ${f.reach_cm ? `${Math.round(f.reach_cm)} cm` : "—"}` : bio?.height_cm ? `${Math.round(bio.height_cm)} cm (identity-proven) · reach not verified` : null;
  const facts: [string, React.ReactNode][] = hasRecord
    ? [
        ["Division", division ?? (weights.length ? `Weighed ${fmtLb(weights[0])} last out` : claimDivision ?? "Not on sheet")],
        ["Stance", f.stance ? STANCE[f.stance] ?? f.stance : "Not verified"],
        ["Height · reach", heightReach ?? "Not verified"],
        ["Age", bio?.age_years ? `${bio.age_years} (identity-proven)` : "Not verified"],
        ["Nationality", nationality ?? "Not verified"],
        ["Last verified bout", latest ? <Link className="gold" href={boutPath({ public_id: latest.public_id })}>{fmtDate(latest.date)}</Link> : "—"],
        ["First verified bout", r.first_date ? fmtDate(r.first_date) : "—"],
        ["Weigh-in range", weights.length ? `${fmtLb(Math.min(...weights))} – ${fmtLb(Math.max(...weights))}` : "—"],
      ]
    : ([
        ["Division", claimDivision],
        ["Stance", f.stance ? STANCE[f.stance] ?? f.stance : null],
        ["Height · reach", heightReach],
        ["Age", bio?.age_years ? `${bio.age_years} (identity-proven)` : null],
        ["Nationality", nationality],
      ] as [string, React.ReactNode][]).filter(([, v]) => v != null && v !== "");

  return (
    <div className="wrap page">
      <JsonLd data={fighterJsonLd(d, [bio?.wikidata_url, bio?.wikipedia_url])} />
      <Crumbs items={[{ label: "Fighters", href: "/fighters" }, { label: f.name }]} />
      <section className="panel dossier">
        <div className="dossier__art"><FighterArt name={f.name} id={f.public_id} portrait={f.portrait} corner={null} /></div>
        <div>
          <div className="eyebrow">{[division ?? claimDivision, commissions[0]].filter(Boolean).join(" · ") || "Boxer"}</div>
          <h1>{f.name}</h1>
          {f.nickname ? <p className="serif gold" style={{ fontStyle: "italic", fontSize: 22, marginTop: 6 }}>“{f.nickname}”</p> : null}
          {ctx?.hall_of_fame?.length ? (
            <div className="mt-1" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ctx.hall_of_fame.map((h) => <Link key={h.institution_slug + h.year} href={"/hall-of-fame?year=" + h.year} className="tag tag--gold">Hall of Fame · {h.institution} · {h.year} · {h.category}</Link>)}
            </div>
          ) : null}
          {hasRecord ? (
            <div className="tiles mt-3">
              <div className="tile"><b className="gold">{fmtRecord(r)}</b><span>Verified record</span></div>
              <div className="tile"><b>{r.bouts}</b><span>Verified bouts</span></div>
              <div className="tile"><b className={finishRate == null ? "is-na" : ""}>{finishRate == null ? "No wins yet" : `${finishRate}%`}</b><span>Wins by KO/TKO/RTD</span></div>
              <div className="tile"><b className={since == null ? "is-na" : ""}>{since == null ? "—" : `${since}d`}</b><span>Since last bout</span></div>
            </div>
          ) : null}
          {titles.length || ranks.length ? (
            <div className="mt-3">
              <div className="eyebrow eyebrow--dim">Sanctioning-body records · as each body lists them</div>
              <div className="mt-1" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {titles.map((c) => <span key={"t" + c.body + c.division_key} className="tag tag--gold" title={[c.role, c.as_of ? `as of ${fmtDate(c.as_of)}` : null].filter(Boolean).join(" · ")}>{bodyShort(c)} · {c.division} · {TIER[c.tier ?? ""] ?? "champion"}</span>)}
                {ranks.map((c) => <span key={"r" + c.body + c.division_key} className="tag" title={c.as_of ? `as of ${fmtDate(c.as_of)}` : undefined}>{bodyShort(c)} · {c.division} · #{c.position ?? c.role}</span>)}
              </div>
            </div>
          ) : null}
          {done.length ? <div className="mt-3" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span className="eyebrow eyebrow--dim">Last {Math.min(5, done.length)}</span><FormStrip results={done.slice(0, 5).map((b) => b.result)} /></div> : null}
          {facts.length ? (
            <dl className="facts mt-3">
              {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          ) : null}
          {bio ? <p className="fine mt-2">{hasRecord
            ? "Identity proven: a reference boxing record for this person lists a bout on our verified record. DATA · PropSports"
            : "Identity proven: an open reference record for this person agrees with the sanctioning bodies' entries on name, country and era. DATA · PropSports"}</p> : null}
          {hasRecord
            ? <p className="fine mt-2">Titles and rankings are each body&apos;s own current records. Age appears only from an identity-proven source. Bouts outside covered commissions are not on this record.</p>
            : <p className="fine mt-2">Detailed fight history is still being verified from official commission records.</p>}
        </div>
      </section>

      {hasRecord || upcoming.length ? <section className="mt-4">
        <SecHead kicker="Canonical bouts only" title="Next Fight" />
        {upcoming.length ? upcoming.map((b) => (
          <Link key={b.public_id} href={boutPath({ public_id: b.public_id, a: { name: f.name }, b: { name: b.opponent.name } })} className="result-band">
            <div><div className="eyebrow">{fmtDate(b.date, { weekday: true })}</div><strong>{f.name} vs {b.opponent.name}</strong></div>
            <span className="mono dim">{b.event.name}</span>
          </Link>
        )) : <Note title="No verified upcoming bout">A next fight appears once a commission bout sheet lists it and both boxers are verified.</Note>}
      </section> : null}

      {hasRecord ? <>
      <div className="band">
        <div className="split">
          <section>
            <SecHead kicker="PropBetEdge-derived · with samples" title="Fight DNA" />
            <DnaBars a={d.dna} aName={f.name} />
          </section>
          <section>
            <SecHead kicker="How verified bouts ended" title="Result Profile" />
            <div className="tiles" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
              <div className="tile"><b className="gold">{r.ko_tko_wins}</b><span>Wins by KO/TKO</span></div>
              <div className="tile"><b>{r.decision_wins}</b><span>Wins by decision</span></div>
              <div className="tile"><b>{r.rtd_wins + r.dq_wins}</b><span>Wins by RTD/DQ</span></div>
              <div className="tile"><b>{r.losses}</b><span>Losses</span><small>{r.stoppage_losses} by stoppage · {r.decision_losses} on cards</small></div>
              <div className="tile"><b>{r.distance_bouts}</b><span>Went the distance</span></div>
              <div className="tile"><b>{r.draws + r.no_contests}</b><span>Draws / no contests</span></div>
            </div>
            {decisions.length ? (
              <div className="mt-3">
                <div className="eyebrow eyebrow--dim">On the judges&apos; cards</div>
                <div className="blist mt-1">{decisions.slice(0, 5).map((b) => (
                  <Link key={b.public_id} href={`/scorecards/${b.public_id.slice(-32).slice(0, 12)}`} className="bline">
                    <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>vs {b.opponent.name}</span><span className="bline__meta">{fmtDate(b.date)} · {how(b)}</span></span>
                    <span className="bline__res"><span className="cards">{b.scorecards.map((s, i) => <span key={i}>{s.mine}–{s.theirs}</span>)}</span></span>
                  </Link>
                ))}</div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <section className="mt-4">
        <SecHead kicker="PropBetEdge-derived · every value with its sample, cutoff and definition version" title="Fight DNA, Full Profile" />
        <DnaModules metrics={d.dna} name={f.name} />
      </section>
      </> : null}

      {d.bouts.length ? <section>
        <SecHead kicker="Chronological · newest first" title="Verified Fight History" />
        <div className="blist">
          {d.bouts.map((b) => (
            <div key={b.public_id} className="bline">
              <div className="bline__who">
                <span style={{ display: "grid", placeItems: "center" }}><RChip r={b.event_complete ? b.result : "S"} /></span>
                <div className="bline__names">
                  <Link href={fighterPath(b.opponent)}>vs {b.opponent.name}</Link>
                  <div className="bline__meta">{fmtDate(b.date)} · <Link href={eventPath({ public_id: b.event.public_id, name: b.event.name, date: b.date })}>{b.event.name}</Link></div>
                </div>
              </div>
              <Link href={boutPath({ public_id: b.public_id, a: { name: f.name }, b: { name: b.opponent.name } })} className="bline__res">
                <span className="bline__method">{how(b)}</span>
                <span className="bline__meta">{[b.scheduled_rounds ? `${b.scheduled_rounds} rds` : null, fmtLb(b.weigh_in?.weight_lb), b.opponent.record_entering.bouts ? `opp ${fmtRecord(b.opponent.record_entering)}` : null].filter(Boolean).join(" · ")}</span>
              </Link>
            </div>
          ))}
        </div>
      </section> : null}

      {ctx?.promoter_appearances?.length ? (
        <section className="mt-4">
          <SecHead kicker="Cards listing each promoter · appearances, not affiliation" title="Promotion Appearances">
            {f.name} appeared on cards listing these promoters on the official sheet. That is all it shows: no contract or promotional affiliation is implied.
          </SecHead>
          <div className="blist">{ctx.promoter_appearances.map((p) => (
            <Link key={p.key} href={"/promoters/" + p.key} className="bline">
              <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{p.name}</span><span className="bline__meta">{fmtDate(p.first_date)}{p.first_date !== p.last_date ? " – " + fmtDate(p.last_date) : ""}</span></span>
              <span className="bline__res"><span className="bline__method">{plural(p.cards, "card")}</span></span>
            </Link>
          ))}</div>
        </section>
      ) : null}

      {hasRecord ? <section className="mt-4">
        <SecHead kicker="Matched markets only" title="Market History" />
        <Note title="No matched market history yet">Sportsbook prices attach to a boxer only through bouts matched to the verified record.</Note>
      </section> : null}
    </div>
  );
}
