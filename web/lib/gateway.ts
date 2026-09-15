import "server-only";
import type { BoutContext, ErasData, FighterContext, HallOfFamePage, WireItem } from "./types-os";
import type { TruthBout, TruthEvent, TruthIndex } from "./types-truth";
import type { BoutDetail, Coverage, EventDetail, EventsPage, FighterDetail, FightersPage, HomeData, MarketIndex, OfficialDetail, OfficialsPage, PromoterDetail, PromotersPage, RankingsData, ScorecardDetail, ScorecardsPage, TitlesData, VideoDesk } from "./types";

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
  // investigator reads (Event Truth V1): short revalidate, they exist to inspect the stored graph
  truthIndex: (limit = 60) => read<TruthIndex>(`site/truth${q({ limit })}`, 60),
  truthEvent: (ref: string) => read<TruthEvent>(`site/truth/events/${ref}`, 60),
  truthBout: (ref: string) => read<TruthBout>(`site/truth/bouts/${ref}`, 60),
  fighters: (opts: { q?: string | null; limit?: number; offset?: number } = {}) =>
    read<FightersPage>(`site/fighters${q({ q: opts.q, limit: opts.limit, offset: opts.offset })}`),
  fighter: (ref: string) => read<FighterDetail>(`site/fighters/${ref}`),
  titles: (weightClass?: string | null, gender: "male" | "female" = "male") =>
    read<TitlesData>(`site/titles${q({ weight_class: weightClass, gender })}`, 1800),
  rankings: (organization?: string | null, weightClass?: string | null, gender: "male" | "female" = "male") =>
    read<RankingsData>(`site/rankings${q({ organization, weight_class: weightClass, gender })}`, 1800),
  coverage: () => read<Coverage>(`site/coverage${q({ today: todayUtc() })}`),
  scorecards: (opts: { decision?: string | null; commission?: string | null; sort?: "recent" | "spread"; limit?: number; offset?: number } = {}) =>
    read<ScorecardsPage>(`site/scorecards${q({ decision: opts.decision, commission: opts.commission, sort: opts.sort, limit: opts.limit, offset: opts.offset })}`),
  scorecard: (ref: string) => read<ScorecardDetail>(`site/scorecards/${ref}`),
  officials: (role: "judge" | "referee", opts: { q?: string | null; limit?: number; offset?: number } = {}) =>
    read<OfficialsPage>(`site/officials${q({ role, q: opts.q, limit: opts.limit, offset: opts.offset })}`),
  official: (ref: string) => read<OfficialDetail>(`site/officials/${ref}`),
  marketIndex: () => read<MarketIndex>(`site/market-index${q({ today: todayUtc() })}`),
  videos: (type?: string | null, limit = 24) => read<VideoDesk>(`site/videos${q({ type, limit })}`),
  promoters: () => read<PromotersPage>("site/promoters"),
  promoter: (key: string) => read<PromoterDetail>(`site/promoters/${key}`),
  fighterContext: (ref: string) => read<FighterContext>(`site/fighters/${ref}/context`),
  boutContext: (ref: string) => read<BoutContext>(`site/bouts/${ref}/context`),
  hallOfFame: (opts: { category?: string | null; year?: number | null; limit?: number; offset?: number } = {}) =>
    read<HallOfFamePage>(`site/hall-of-fame${q({ category: opts.category, year: opts.year, limit: opts.limit, offset: opts.offset })}`, 1800),
  eras: () => read<ErasData>("site/eras", 1800),
  wire: (limit = 40) => read<WireItem[]>(`site/wire${q({ limit })}`),
};

// Optional reads: absent (not deployed yet, not found, outage) is simply null.
export const optional = <T>(r: Read<T>): T | null => (r.ok ? r.data : null);
