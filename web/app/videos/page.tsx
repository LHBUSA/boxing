import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { boutPath, eventPath, fighterPath } from "@/lib/slug";
import { VIDEO_TYPE_LABEL } from "@/lib/video-labels";
import { Note, SecHead, Unavailable } from "@/components/fight";

export const revalidate = 900;
export const metadata: Metadata = { title: "Video Desk", description: "Official boxing video from identity-verified, rights-approved channels: embeds and metadata only, linked to cards, bouts and fighters." };

const CLASS: Record<string, string> = { promoter_official: "Promoters", broadcaster_official: "Broadcasters", sanctioning_body_official: "Sanctioning bodies", commission_official: "Commissions", fighter_official: "Fighters", team_official: "Teams" };

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const type = sp.type && /^[a-z_]{3,40}$/.test(sp.type) ? sp.type : null;
  const res = await gateway.videos(type, 48);
  if (!res.ok) return <Unavailable what="The Video Desk" />;
  const d = res.data;
  const classes = [...new Set(d.channels.map((c) => c.source_class))];
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Video Desk · official channels only</div>
        <h1>Official video, <em>in context.</em></h1>
        <p>Videos come only from channels whose identity is verified against the organization&apos;s own site and whose rights are approved. We link and embed through the platform player; nothing is downloaded or re-hosted, and a title never becomes a fight fact.</p>
      </header>

      {d.videos.length ? (
        <>
          <div className="filters">
            <div className="seg">
              <Link className={!type ? "is-on" : ""} href="/videos">All</Link>
              {Object.entries(d.types).map(([t, n]) => <Link key={t} className={type === t ? "is-on" : ""} href={`/videos?type=${t}`}>{VIDEO_TYPE_LABEL[t] ?? t} · {n}</Link>)}
            </div>
          </div>
          <div className="vgrid">
            {d.videos.map((v) => (
              <a key={v.provider_video_id} className="vcard" href={`https://www.youtube.com/watch?v=${v.provider_video_id}`} target="_blank" rel="noopener noreferrer">
                <div className="vcard__poster"><span className="tag">{VIDEO_TYPE_LABEL[v.video_type] ?? "Official video"}</span></div>
                <b>{v.title}</b>
                <span>{v.channel_name}{v.published_at ? ` · ${fmtDate(v.published_at.slice(0, 10))}` : ""}</span>
                <small>
                  {v.bout ? <Link href={boutPath({ public_id: v.bout.public_id })}>{v.bout.a} vs {v.bout.b}</Link> : v.event ? <Link href={eventPath(v.event)}>{v.event.name}</Link> : null}
                  {v.fighters.map((f) => <Link key={f.public_id} href={fighterPath(f)}> · {f.name}</Link>)}
                </small>
              </a>
            ))}
          </div>
        </>
      ) : (
        <Note title="No official video is published yet">
          {plural(d.channels.length, "official channel")} {d.channels.length === 1 ? "is" : "are"} registered with verified identities; each needs an approved rights review before its uploads appear here, on fight weeks, cards and fighter dossiers.
        </Note>
      )}

      <section className="mt-4">
        <SecHead kicker="Channel registry" title="Official Sources" />
        <div className="split">
          {classes.map((cl) => (
            <div key={cl}>
              <div className="eyebrow eyebrow--dim">{CLASS[cl] ?? cl}</div>
              <div className="blist mt-1">
                {d.channels.filter((c) => c.source_class === cl).map((c) => (
                  <div key={c.name} className="bline">
                    <span className="bline__names"><span style={{ color: "var(--paper)", fontWeight: 600 }}>{c.name}</span><span className="bline__meta">{c.handle ?? ""}</span></span>
                    <span className="bline__res">
                      <span className={`tag ${c.identity_state === "verified" ? "tag--gold" : ""}`}>{c.identity_state === "verified" ? "Identity verified" : "Identity pending"}</span>
                      <span className={`tag ${c.enabled ? "tag--solid" : "tag--pending"}`}>{c.enabled ? "Live" : c.rights_state === "approved" ? "Approved" : "Rights review"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
