import type { Metadata } from "next";
import { OfficialsBoard } from "@/components/OfficialsBoard";

export const revalidate = 900;
export const metadata: Metadata = { title: "Judge DNA", description: "Every judge on the official commission record: published cards, panel agreement and card margins, always with the sample." };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  return <OfficialsBoard role="judge" q={(sp.q ?? "").trim().slice(0, 60)} base="/judges" />;
}
