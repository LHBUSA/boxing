import "server-only";
import type { BoutDetail, Coverage, EventDetail, EventsPage, FighterDetail, FightersPage, HomeData, RankingsData, TitlesData } from "./types";

// The ONLY data path of this site: server -> boxing-gateway (bearer token) -> Boxing Core.
// The token lives in server env and never reaches the browser. Every read fails soft:
// a missing record is not_found (-> 404), an outage is unavailable (-> honest state).

export type Read<T> = { ok: true; data: T; generatedAt: string } | { ok: false; reason: "not_found" | "unavailable" | "not_configured" };

const REVALIDATE = 300;

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

async function read<T>(path: string, revalidate = REVALIDATE): Promise<Read<T>> {
  const base = process.env.BOXING_GATEWAY_URL;
  const token = process.env.BOXING_GATEWAY_TOKEN;
  if (!base || !token) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/internal/v1/${path}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      next: { revalidate, tags: ["boxing-gateway"] },
    });
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (res.status === 400) return { ok: false, reason: "not_found" };
    if (!res.ok) {
      console.error(`[boxing-gateway] ${path} -> HTTP ${res.status}`);
      return { ok: false, reason: "unavailable" };
    }
    const body = (await res.json()) as { data: T; generated_at: string };
    return { ok: true, data: body.data, generatedAt: body.generated_at };
  } catch (err) {
    console.error(`[boxing-gateway] ${path} -> ${(err as Error).message}`);
    return { ok: false, reason: "unavailable" };
  }
}

const q = (params: Record<string, string | number | null | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
};

export const gateway = {
  home: () => read<HomeData>(`site/home${q({ today: todayUtc() })}`),
  events: (scope: "upcoming" | "results" | "all", opts: { commission?: string | null; limit?: number; offset?: number } = {}) =>
    read<EventsPage>(`site/events${q({ scope, commission: opts.commission, limit: opts.limit, offset: opts.offset, today: todayUtc() })}`),
  event: (ref: string) => read<EventDetail>(`site/events/${ref}`),
  bout: (ref: string) => read<BoutDetail>(`site/bouts/${ref}`),
  fighters: (opts: { q?: string | null; limit?: number; offset?: number } = {}) =>
    read<FightersPage>(`site/fighters${q({ q: opts.q, limit: opts.limit, offset: opts.offset })}`),
  fighter: (ref: string) => read<FighterDetail>(`site/fighters/${ref}`),
  titles: (weightClass?: string | null, gender: "male" | "female" = "male") =>
    read<TitlesData>(`site/titles${q({ weight_class: weightClass, gender })}`, 1800),
  rankings: (organization?: string | null, weightClass?: string | null, gender: "male" | "female" = "male") =>
    read<RankingsData>(`site/rankings${q({ organization, weight_class: weightClass, gender })}`, 1800),
  coverage: () => read<Coverage>(`site/coverage${q({ today: todayUtc() })}`),
};
