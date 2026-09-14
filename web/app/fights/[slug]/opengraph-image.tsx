import { ImageResponse } from "next/og";
import { gateway } from "@/lib/gateway";
import { cityLine, fmtDate } from "@/lib/format";
import { parseRef } from "@/lib/slug";
import { verdictLine } from "@/components/fight";
import { BrandShare, FightShare, SHARE_SIZE } from "@/components/ShareCard";

export const size = SHARE_SIZE;
export const contentType = "image/png";
export const alt = "Fight Center share image";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ref = parseRef(slug);
  const res = ref ? await gateway.bout(ref.slice(0, 12)) : null;
  if (!res?.ok || !res.data.bout.a || !res.data.bout.b) return new ImageResponse(<BrandShare />, size);
  const { bout, event } = res.data;
  const where = [event.venue?.name, cityLine(event.venue)].filter(Boolean).join(" · ");
  return new ImageResponse(
    <FightShare a={bout.a!.name} b={bout.b!.name} verdict={verdictLine(bout)} eyebrow={bout.result ? "official result" : "fight center"}
      meta={[fmtDate(event.date), where, event.commission?.name].filter(Boolean).join(" · ")} />,
    size,
  );
}
