// Shapes of the boxing-gateway site contract (/internal/v1/site/*, migration 0020).
// Every nullable field is genuinely unknown on record; never coerce null to 0.

export type IsoDate = string; // YYYY-MM-DD

export interface Venue { name: string | null; city: string | null; region: string | null; country_code: string | null }
export interface Commission { slug: string; name: string; jurisdiction: string | null; country_code: string | null }
export interface Weight { class_key: string | null; class_name: string | null; contracted_lb: number | null; catchweight: boolean | null }
export interface WeighIn { weight_lb: number | null; kind: string | null; status: string | null }

export type CornerColor = "red" | "blue";
export interface Corner { public_id: string; name: string; corner: CornerColor | null; weigh_in: WeighIn | null }

export type Outcome = "win" | "draw" | "no_contest" | "no_decision" | "unknown";
export interface Result {
  outcome: Outcome;
  winner_side: "a" | "b" | null;
  method: string | null;
  decision_type: string | null;
  round: number | null;
  time_sec: number | null;
  revision: number;
  state: string;
}

export interface Scorecard { slot: number | null; judge: string; a_total: number | null; b_total: number | null; state: string; revision: number }
export interface TitleStake { organization: string; organization_slug: string; tier: string; label: string; status: string }

export interface BoutCompact {
  public_id: string;
  order: number | null;
  status: string;
  scheduled_rounds: number | null;
  weight: Weight | null;
  a: Corner | null;
  b: Corner | null;
  result: Result | null;
  scorecards: Scorecard[];
  referee: string | null;
  titles: TitleStake[];
  market_matched: boolean;
  event?: { public_id: string; name: string; date: IsoDate };
}

export interface EventSummary {
  public_id: string;
  name: string;
  date: IsoDate;
  start_at: string | null;
  status: string;
  venue: Venue | null;
  commission: Commission | null;
  promoters: string[];
  sheet_filed: boolean;
  official_source_url: string | null;
  bout_count: number;
  results_count: number;
  awaiting_verification: number | null;
  title_bouts: number;
  headline: BoutCompact | null;
}

export interface RecordSummary {
  bouts: number;
  wins: number;
  losses: number;
  draws: number;
  no_contests: number;
  pending: number;
  stoppage_wins: number;
  ko_tko_wins: number;
  rtd_wins: number;
  dq_wins: number;
  decision_wins: number;
  stoppage_losses: number;
  dq_losses?: number;
  decision_losses: number;
  distance_bouts: number;
  max_scheduled_rounds: number | null;
  first_date: IsoDate | null;
  last_date: IsoDate | null;
}

export interface FighterHead {
  public_id: string;
  name: string;
  nickname: string | null;
  stance: string | null;
  height_cm: number | null;
  reach_cm: number | null;
  nationality: string | null;
  sex: string | null;
  career_status: string | null;
}

export type MetricStatus = "available" | "insufficient_sample" | "source_unavailable" | "not_applicable";
export interface DnaMetric {
  key: string;
  version: string;
  category: string;
  name: string;
  unit: string | null;
  status: MetricStatus;
  value: number | null;
  value_text: string | null;
  value_json: unknown;
  sample_size: number | null;
  minimum_sample: number | Record<string, number> | null;
  as_of: string;
}

export interface Coverage {
  as_of: string;
  fighters_with_bouts: number;
  events: number;
  events_upcoming: number;
  events_complete: number;
  bouts: number;
  upcoming_bouts: number;
  official_results: number;
  results_pending: number;
  bouts_with_scorecards: number;
  scorecard_rounds: number;
  judges: number;
  referees: number;
  sheet_bouts: number;
  awaiting_verification: number;
  fighters_with_dna: number;
  title_records: number;
  title_events: number;
  ranking_snapshots: number;
  matched_market_bouts: number;
  captured_market_events_upcoming: number;
  commissions: { slug: string; name: string; jurisdiction: string | null; events: number }[];
}

export interface HomeData {
  today: IsoDate;
  upcoming: EventSummary[];
  recent: EventSummary[];
  latest_results: BoutCompact[];
  scorecard_watch: BoutCompact[];
  dna_feature: { fighter: FighterHead; record: RecordSummary; dna: DnaMetric[]; available_metrics: number } | null;
  coverage: Coverage;
}

export interface EventsPage {
  scope: "upcoming" | "results" | "all";
  commission: string | null;
  total: number;
  limit: number;
  offset: number;
  commissions: { slug: string; name: string; events: number }[];
  rows: EventSummary[];
}

export interface EventDetail {
  event: EventSummary;
  bouts: BoutCompact[];
  cancelled_bouts: number;
  card_changes: { count: number; latest_at: string | null; by_type: Record<string, number> };
  same_weekend: { public_id: string; name: string; date: IsoDate; status: string; commission: string | null }[];
}

export interface RecentBout {
  date: IsoDate;
  order: number | null;
  result: string | null;
  method: string | null;
  decision_type: string | null;
  round: number | null;
  opponent: { public_id: string; name: string };
  bout_public_id: string;
}

export interface CornerDetail {
  fighter: FighterHead;
  record_all: RecordSummary;
  entering: RecordSummary;
  recent_entering: RecentBout[];
  later_bouts: number;
  dna: DnaMetric[];
  dna_as_of: string | null;
}

export interface MarketSummary {
  rights: { permitted: string; prohibited: string; attribution: string };
  consensus: { market_key: string; selection_key: string; bookmaker_count: number; stale_bookmaker_count: number; consensus_implied: number | null; newest_price_at: string | null }[];
  best_prices: { market_key: string; selection_key: string; best_american: number; bookmaker: string; latest_at: string }[];
  selections: { market_key: string; selection_key: string; bookmaker: string; opening_american: number | null; current_american: number | null; latest_at: string | null; freshness: string | null }[];
  fair_prices: unknown[];
}

export interface BoutDetail {
  bout: BoutCompact;
  event: EventSummary;
  result_history: { revision: number; outcome: Outcome; method: string | null; decision_type: string | null; round: number | null; state: string; change_reason: string | null; captured_at: string }[];
  corners: { a?: CornerDetail; b?: CornerDetail };
  card: BoutCompact[];
  market: MarketSummary | null;
}

export interface FighterBout {
  public_id: string;
  date: IsoDate;
  order: number | null;
  event: { public_id: string; name: string; status: string; commission_slug: string | null; commission: string | null; city: string | null; region: string | null; country_code: string | null };
  opponent: { public_id: string; name: string; record_entering: RecordSummary };
  result: "W" | "L" | "D" | "NC" | "ND" | null;
  event_complete: boolean;
  method: string | null;
  decision_type: string | null;
  round: number | null;
  time_sec: number | null;
  scheduled_rounds: number | null;
  rounds_completed: number | null;
  weight: Weight | null;
  weigh_in: WeighIn | null;
  scorecards: { mine: number | null; theirs: number | null }[];
  titles: { organization: string; tier: string; label: string; status: string }[];
  revised: boolean;
}

export interface FighterDetail {
  redirect_public_id?: string;
  fighter: FighterHead;
  record: RecordSummary;
  bouts: FighterBout[];
  dna: DnaMetric[];
  dna_as_of: string | null;
}

export interface FightersPage {
  q: string | null;
  total: number;
  limit: number;
  offset: number;
  rows: { public_id: string; name: string; record: { bouts: number; wins: number; losses: number; draws: number; no_contests: number }; upcoming: number; last_date: IsoDate | null; division: { class_key: string; class_name: string } | null; commissions: string[] }[];
}

export interface SanctioningBody {
  slug: string;
  short_name: string;
  name: string;
  website_url: string | null;
  source_state: string | null;
  display_allowed: boolean | null;
  title_records: number;
  ranking_snapshots: number;
}

export interface Division { class_key: string; name: string; max_lb: number | null; max_kg: number | null; gender_scope: string; notes: string | null; title_records?: number; verified_bouts?: number }

export interface TitleBelt { public_id?: string; tier: string; source_native_label: string | null; status: "held" | "vacant"; holder: { public_id: string; display_name: string; started_on?: string | null; start_type?: string | null } | null; last_change: { event_type: string; effective_on: string | null } | null }
export interface TitleMap {
  weight_class_key: string;
  gender_scope: string;
  as_of: string;
  organizations: { organization_slug: string; belts: TitleBelt[]; primary_champion: { public_id: string; display_name: string; tier: string } | null; vacancies: { tier: string; since: string | null }[]; overlapping_champions: { tier: string; source_native_label: string | null; display_name: string }[] }[];
  derived: { version: string; label: string; unification: { display_name: string; state: string; organizations: { organization_slug: string; tier: string }[] }[]; undisputed_champion: unknown };
}
export interface TitlesData {
  board: { divisions: Division[]; organizations: SanctioningBody[]; title_records: number; title_events: number; title_bouts: number };
  map: TitleMap | null;
}

export interface RankingEntry { position: number; rank: number; rank_label: string | null; public_id: string | null; display_name: string | null; source_name?: string | null; designation: string | null; mandatory: boolean | null; is_vacant: boolean | null; is_champion: boolean | null }
export interface RankingsData {
  board: { organizations: SanctioningBody[]; divisions: Division[]; snapshots: { organization_slug: string; class_key: string; published_on: string | null; effective_on: string | null }[] };
  snapshot: { published_on: string | null; effective_on: string | null; revision: number | null; source_url: string | null; division_label: string | null; entries: RankingEntry[] } | null;
}
