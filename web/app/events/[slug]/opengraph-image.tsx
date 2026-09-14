import { ImageResponse } from "next/og";
import { gateway } from "@/lib/gateway";
import { cityLine, fmtDate, plural } from "@/lib/format";
import { parseRef } from "@/lib/slug";
import { BrandShare, CardShare, SHARE_SIZE } from "@/components/ShareCard";

export const size = SHARE_SIZE;
export const contentType = "image/png";
export const alt = "Fight card share image";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ref = parseRef(slug);
  const res = ref ? await gateway.event(ref.slice(0, 12)) : null;
  if (!res?.ok) return new ImageResponse(<BrandShare />, size);
  const { event, bouts } = res.data;
  const headline = [...bouts].filter((b) => b.a && b.b).sort((x, y) => (y.scheduled_rounds ?? 0) - (x.scheduled_rounds ?? 0))[0];
  const lines = [
    headline ? `${headline.a!.name} vs ${headline.b!.name}` : null,
    event.status === "complete" ? `${plural(event.results_count, "official result")} on record` : event.sheet_filed ? plural(event.bout_count, "bout") + " on the sheet" : "Bout sheet not filed yet",
  ].filter((l): l is string => Boolean(l));
  return new ImageResponse(
    <CardShare name={event.name} lines={lines} eyebrow={event.status === "complete" ? "results" : "fight card"}
      meta={[fmtDate(event.date), [event.venue?.name, cityLine(event.venue)].filter(Boolean).join(" · "), event.commission?.name].filter(Boolean).join(" · ")} />,
    size,
  );
}
