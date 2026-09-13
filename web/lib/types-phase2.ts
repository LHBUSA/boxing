// Phase 2 site contract (migration 0022) and rights-aware media (migration 0023).

import type { BoutCompact, BoutDetail, EventSummary, IsoDate, MetricStatus, Scorecard } from "./types.ts";

// A portrait exists only with a recorded license, author and source; otherwise
// the UI uses the PropBetEdge silhouette treatment.
export interface Portrait { src: string; width: number | null; height: number | null; credit: string; license: string; license_url: string | null; source_url: string; focus: string | null }

export interface OrientedCard extends Scorecard { judge_public_id: string; rounds: { round: number; a: number; b: number }[] }

export interface ScorecardRow extends BoutCompact {
  event: { public_id: string; name: string; date: IsoDate; commission: string | null; commission_slug: string | null };
  kind: "unanimous" | "split" | "majority" | "draw" | "unstated";
  spread: number | null;
}
export interface ScorecardsPage {
  decision: string | null; commission: string | null; sort: string; total: number; limit: number; offset: number;
  counts: { all: number; unanimous: number; split: number; majority: number; draw: number };
  commissions: { slug: string; name: string; n: number }[];
  round_cards_bouts: number; widest_spread: number | null;
  rows: ScorecardRow[];
}
export interface OfficialMetric { key: string; name: string; unit: string | null; status: MetricStatus; value: number | null; value_json: unknown; sample_size: number | null; minimum_sample: number | Record<string, number> | null; numerator: number | null; denominator: number | null; as_of: string; category: string }
export interface ScorecardDetail {
  bout: BoutCompact & { scorecards: OrientedCard[] };
  event: EventSummary;
  spread: number | null;
  result_history: BoutDetail["result_history"];
  card_provenance: { source_url: string | null; captured_at: string | null; stored_card_versions: number };
  deductions: { round: number | null; points: number; reason: string | null; side: "a" | "b" | null }[];
  judges: { public_id: string; name: string; cards_on_record: number; dna: OfficialMetric[] }[];
}
export interface OfficialRow { public_id: string; name: string; assignments: number; first_date: IsoDate | null; last_date: IsoDate | null; commissions: string[]; cards: number; metrics: OfficialMetric[] }
export interface OfficialsPage { role: "judge" | "referee"; q: string | null; total: number; universe: number; rows: OfficialRow[] }
export interface OfficialAssignment extends BoutCompact {
  event: { public_id: string; name: string; date: IsoDate; commission: string | null; commission_slug: string | null };
  deductions: number; slot: number | null;
}
export interface OfficialDetail {
  redirect_public_id?: string;
  official: { public_id: string; name: string; official_type: string | null; country_code: string | null };
  roles: Record<string, number>;
  jurisdictions: { slug: string; name: string; assignments: number }[];
  dna: OfficialMetric[];
  dna_as_of: string | null;
  judged: OfficialAssignment[];
  refereed: OfficialAssignment[];
}
export interface MarketIndex {
  captured_upcoming_events: number; captured_events_total: number; next_captured_start: string | null;
  captured_by_week: { week_start: IsoDate; events: number }[];
  unmatched_open: number; unmatched_reasons: Record<string, number>; last_capture_at: string | null; captures_last_7_days: number;
  matched: (BoutCompact & { event: { public_id: string; name: string; date: IsoDate; status: string; commission: string | null }; starts_at: string | null })[];
}
export interface VideoCard {
  provider_video_id: string; title: string; channel_name: string; source_class: string; published_at: string | null; thumbnail_url: string | null;
  duration_sec: number | null; embeddable: boolean | null; language: string; video_type: string; confidence: string;
  event: { public_id: string; name: string; date: IsoDate } | null; bout: { public_id: string; a: string; b: string } | null; fighters: { public_id: string; name: string }[];
}
export interface VideoDesk {
  channels: { name: string; handle: string | null; source_class: string; identity_state: string; rights_state: string; enabled: boolean; reviewed_at: string | null }[];
  published: number; in_review: number; types: Record<string, number>; videos: VideoCard[];
}
export interface EventTimeline {
  listed: { on_record: boolean; recorded_at: string | null };
  card: { bouts_added: number; first_bout_recorded_at: string | null; officials_assigned: number; weight_changes: number };
  replacements: { bout_public_id: string; status: string; name: string; fighter_public_id: string }[];
  weigh_ins: { official_weights: number; ceremonial: number; missed: number; weighed_at: string | null };
  missed_weight: { bout_public_id: string; name: string; fighter_public_id: string; weight_lb: number | null; contracted_lb: number | null }[];
  results: { official: number; revised: number; stoppages: number; decisions: number };
  scorecards: { bouts: number; split_or_majority: number };
  market: { matched_bouts: number; first_observed_at: string | null; last_observed_at: string | null };
  videos: VideoCard[];
}
export interface PromoterRow { key: string; name: string; cards: number; first_date: IsoDate; last_date: IsoDate; commissions: string[]; cities: number; bouts: number }
export interface PromotersPage { listed_names: number; cards_with_sheet: number; rows: PromoterRow[] }
export interface PromoterDetail {
  key: string; names: string[]; cards: EventSummary[];
  co_promoters: { key: string; name: string; shared_cards: number }[];
  venues: { name: string; city: string | null; region: string | null; cards: number }[];
  fighters: { public_id: string; name: string; appearances: number }[];
  title_bouts: number; videos: VideoCard[];
}
