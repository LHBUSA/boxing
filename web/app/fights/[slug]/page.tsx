import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { gateway } from "@/lib/gateway";
import { fmtDate, methodLabel } from "@/lib/format";
import { boutPath, eventPath, parseRef } from "@/lib/slug";
import { Crumbs, Unavailable } from "@/components/ui";
import { Faceoff, MatchupIntel } from "@/components/MatchupDesk";

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
  if (!res.ok) return { title: "Bout", robots: { index: false } };
  const { bout: b, event: e } = res.data;
  const names = `${b.a?.name ?? "TBA"} vs ${b.b?.name ?? "TBA"}`;
  const r = b.result;
  return {
    title: `${names}${r ? ` result: ${methodLabel(r) ?? r.outcome}` : ": matchup"} · ${fmtDate(e.date)}`,
    description: r
      ? `Official result, judges' scorecards, verified records and Fight DNA for ${names} at ${e.name}.`
      : `Verified records, key comparison and Fight DNA for ${names} at ${e.name}. No picks or probabilities.`,
    alternates: { canonical: boutPath(b) },
  };
}

export default async function FightPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res.ok) { if (res.reason === "not_found") notFound(); return <Unavailable what="This bout" />; }
  const d = res.data;
  if (`/fights/${slug}` !== boutPath(d.bout)) permanentRedirect(boutPath(d.bout));
  return (
    <div className="wrap page-pad">
      <Crumbs items={[{ label: "Events", href: "/events" }, { label: d.event.name, href: eventPath(d.event) }, { label: `${d.bout.a?.name ?? "TBA"} vs ${d.bout.b?.name ?? "TBA"}` }]} />
      <Faceoff d={d} />
      <MatchupIntel d={d} />
    </div>
  );
}
