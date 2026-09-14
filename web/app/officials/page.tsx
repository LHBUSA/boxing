import type { Metadata } from "next";
import { OfficialsBoard } from "@/components/OfficialsBoard";

export const revalidate = 900;
export const metadata: Metadata = { title: "Officials: Judge DNA and Referee DNA", description: "Every judge and referee on the official commission record: assignments, published cards and descriptive metrics with their samples." };

export default async function OfficialsPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const sp = await searchParams;
  const role = sp.role === "referee" ? "referee" : "judge";
  return <OfficialsBoard role={role} q={(sp.q ?? "").trim().slice(0, 60)} base={role === "referee" ? "/referees" : "/judges"} />;
}
