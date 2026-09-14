import type { Metadata } from "next";
import { OfficialsBoard } from "@/components/OfficialsBoard";

export const revalidate = 900;
export const metadata: Metadata = { title: "Referee DNA", description: "Every referee on the official commission record: bouts worked, how they ended, stoppage rounds and deductions, always with the sample." };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  return <OfficialsBoard role="referee" q={(sp.q ?? "").trim().slice(0, 60)} base="/referees" />;
}
