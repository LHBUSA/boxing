import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { canonical } from "@/lib/posture";
import { gateway, optional, todayUtc } from "@/lib/gateway";
import { daysBetween, divisionLabel, fmtClock, fmtDate, fmtLb, fmtRecord, methodLabel, plural, STANCE } from "@/lib/format";
import { boutPath, eventPath, fighterPath, parseRef, refOf } from "@/lib/slug";
import { FighterArt } from "@/components/FighterArt";
import { Crumbs, DnaBars, FormStrip, Note, RChip, SecHead, Unavailable } from "@/components/fight";
import type { FighterBout } from "@/lib/types";

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
  return { title: `${f.name}: dossier, verified record, Fight DNA`, description: `${f.name} is ${fmtRecord(r)} in ${plural(r.bouts, "verified bout")} on the official commission record.`, alternates: canonical(fighterPath(f)) };
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

  return (
    <div className="wrap page">
      <Crumbs items={[{ label: "Fighters", href: "/fighters" }, { label: f.name }]} />
      <section className="panel dossier">
        <div className="dossier__art"><FighterArt name={f.name} id={f.public_id} portrait={f.portrait} corner={null} /></div>
        <div>
          <div className="eyebrow">{[division, commissions[0]].filter(Boolean).join(" · ") || "Boxer"}</div>
          <h1>{f.name}</h1>
          {f.nickname ? <p className="serif gold" style={{ fontStyle: "italic", fontSize: 22, marginTop: 6 }}>“{f.nickname}”</p> : null}
          {ctx?.hall_of_fame?.length ? (
            <div className="mt-1" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ctx.hall_of_fame.map((h) => <Link key={h.institution_slug + h.year} href={"/hall-of-fame?year=" + h.year} className="tag tag--gold">Hall of Fame · {h.institution} · {h.year} · {h.category}</Link>)}
            </div>
          ) : null}
          <div className="tiles mt-3">
            <div className="tile"><b className="gold">{r.bouts ? fmtRecord(r) : "0-0"}</b><span>Verified record</span></div>
            <div className="tile"><b>{r.bouts}</b><span>Verified bouts</span></div>
            <div className="tile"><b className={finishRate == null ? "is-na" : ""}>{finishRate == null ? "No wins yet" : `${finishRate}%`}</b><span>Wins by KO/TKO/RTD</span></div>
            <div className="tile"><b className={since == null ? "is-na" : ""}>{since == null ? "—" : `${since}d`}</b><span>Since last bout</span></div>
          </div>
          {done.length ? <div className="mt-3" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span className="eyebrow eyebrow--dim">Last {Math.min(5, done.length)}</span><FormStrip results={done.slice(0, 5).map((b) => b.result)} /></div> : null}
          <dl className="facts mt-3">
            <div><dt>Division</dt><dd>{division ?? (weights.length ? `Weighed ${fmtLb(weights[0])} last out` : "Not on sheet")}</dd></div>
            <div><dt>Stance</dt><dd className={f.stance ? "" : "faint"}>{f.stance ? STANCE[f.stance] ?? f.stance : "Not verified"}</dd></div>
            <div><dt>Height · reach</dt><dd className={f.height_cm || f.reach_cm || bio?.height_cm ? "" : "faint"}>{f.height_cm || f.reach_cm ? `${f.height_cm ? `${Math.round(f.height_cm)} cm` : "—"} · ${f.reach_cm ? `${Math.round(f.reach_cm)} cm` : "—"}` : bio?.height_cm ? `${Math.round(bio.height_cm)} cm (Wikidata) · reach not verified` : "Not verified"}</dd></div>
            <div><dt>Age</dt><dd className={bio?.age_years ? "" : "faint"}>{bio?.age_years ? `${bio.age_years} (Wikidata)` : "Not verified"}</dd></div>
            <div><dt>Nationality</dt><dd className={bio?.nationality?.length || f.nationality ? "" : "faint"}>{f.nationality ?? (bio?.nationality?.length ? `${bio.nationality.join(" / ")} (Wikidata)` : "Not verified")}</dd></div>
            <div><dt>Last verified bout</dt><dd>{latest ? <Link className="gold" href={boutPath({ public_id: latest.public_id })}>{fmtDate(latest.date)}</Link> : "—"}</dd></div>
            <div><dt>First verified bout</dt><dd>{r.first_date ? fmtDate(r.first_date) : "—"}</dd></div>
            <div><dt>Weigh-in range</dt><dd>{weights.length ? `${fmtLb(Math.min(...weights))} – ${fmtLb(Math.max(...weights))}` : "—"}</dd></div>
          </dl>
          {bio ? <p className="fine mt-2">Identity matched to <a className="link-gold" href={bio.wikidata_url} target="_blank" rel="noopener noreferrer">Wikidata {bio.wikidata_qid}</a>{bio.wikipedia_url ? <> · <a className="link-gold" href={bio.wikipedia_url} target="_blank" rel="noopener noreferrer">Wikipedia</a></> : null}: its boxing record lists a bout on our verified record.</p> : null}
          <p className="fine mt-2">Titles and rankings appear once sanctioning-body records are cleared. Age appears only from an identity-proven source. Bouts outside covered commissions are not on this record.</p>
        </div>
      </section>

      <section className="mt-4">
        <SecHead kicker="Canonical bouts only" title="Next Fight" />
        {upcoming.length ? upcoming.map((b) => (
          <Link key={b.public_id} href={boutPath({ public_id: b.public_id, a: { name: f.name }, b: { name: b.opponent.name } })} className="result-band">
            <div><div className="eyebrow">{fmtDate(b.date, { weekday: true })}</div><strong>{f.name} vs {b.opponent.name}</strong></div>
            <span className="mono dim">{b.event.name}</span>
          </Link>
        )) : <Note title="No verified upcoming bout">A next fight appears once a commission bout sheet lists it and both boxers are verified.</Note>}
      </section>

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

      <section>
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
      </section>

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

      <section className="mt-4">
        <SecHead kicker="Matched markets only" title="Market History" />
        <Note title="No matched market history yet">Sportsbook prices attach to a boxer only through bouts matched to the verified record.</Note>
      </section>
    </div>
  );
}
