// Boxing operating-system site contract (migration 0026). Every field is optional-safe: pages render
// honest sparse states when a read is unavailable or not yet deployed.

import type { BoutCompact, IsoDate } from "./types.ts";
import type { OfficialMetric } from "./types-phase2.ts";

export interface SourcedBio {
  source: "Wikidata";
  wikidata_qid: string;
  wikidata_url: string;
  wikipedia_url: string | null;
  age_years: number | null;
  nationality: string[] | null;
  height_cm: number | null;
}
export interface HallBadge { institution: string; institution_slug: string; year: number; category: string }
export interface PromoterAppearance { key: string; name: string; cards: number; first_date: IsoDate; last_date: IsoDate }

export interface FighterContext {
  public_id: string;
  sourced_bio: SourcedBio | null;
  hall_of_fame: HallBadge[];
  promoter_appearances: PromoterAppearance[];
  distinct_opponents: number;
  title_bouts: number;
  approved_videos: number;
}

export interface BoutContext {
  public_id: string;
  corners: { a?: { sourced_bio: SourcedBio | null; hall_of_fame: HallBadge[]; promoter_appearances: PromoterAppearance[] }; b?: { sourced_bio: SourcedBio | null; hall_of_fame: HallBadge[]; promoter_appearances: PromoterAppearance[] } } | null;
  previous_meetings: { bout_public_id: string; date: IsoDate; result_for_a: string | null; method: string | null; decision_type: string | null; round: number | null; event: { public_id: string; name: string } }[];
  officials: { role: "referee" | "judge"; slot: number | null; public_id: string; name: string; assignments: number; dna: OfficialMetric[] }[];
}

export interface HallOfFamePage {
  institutions: { slug: string; name: string; inductions: number; first_year: number; last_year: number; website: string | null }[];
  categories: { label: string; institution: string; n: number }[];
  years: { year: number; n: number }[];
  category: string | null;
  year: number | null;
  total: number;
  linked_to_fighters: number;
  rows: { person_public_id: string; name: string; institution: string; year: number; category: string; fighter_public_id: string | null }[];
}

export interface ErasData {
  record_span: { first_date: IsoDate | null; last_date: IsoDate | null };
  decades: { decade: number; verified_events: number; verified_bouts: number; hall_inductions: number; title_reigns_started: number }[];
  hall_classes: { year: number; n: number }[];
  hall_categories: { label: string; n: number }[];
  title_reigns: number;
  venues_on_record: number;
}

export interface WireItem {
  kind: "result_official" | "scorecards_posted" | "missed_weight" | "bout_added" | "bout_cancelled" | "opponent_replaced" | "event_postponed" | "event_cancelled" | "event_date_changed";
  at: string;
  event_date: IsoDate | null;
  event: { public_id: string; name: string; date: IsoDate } | null;
  bout: BoutCompact | null;
  detail: Record<string, unknown>;
}
