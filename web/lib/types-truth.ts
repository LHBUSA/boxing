// Event Truth investigator reads (boxing_truth_index / _event / _bout). Loose on purpose: the page renders every lane the
// gateway returns and labels each with its source.

export interface TruthSource { source_key: string | null; url: string | null; observation: string | null }
export interface TruthCheck { assertion: string; severity: "failure" | "info"; count: number; sample: string[] }
export interface TruthIndex {
  assertions: { failures: number; checks: TruthCheck[] };
  counts: Record<string, number | Record<string, number>>;
  recent_events: { public_id: string; name: string; event_date: string; status: string; bouts: number }[];
}
export interface LedgerRow {
  ledger_key: string; change_type: string; source_change_type: string; bout: string | null; fighter: string | null; fighter_name: string | null;
  occurred_at: string; recorded_at: string; revision: number; before: Record<string, unknown> | null; after: Record<string, unknown> | null; source: TruthSource;
}
export interface CardHistoryRow { change_type: string; bout?: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null; effective_at: string | null; detected_at: string; source: TruthSource }
export interface TruthIdentity { namespace: string; source_ref: string; verification_state: string; source_key?: string; source_display_name?: string | null }
export interface TruthEvent {
  event: { public_id: string; name: string; event_date: string; start_at: string | null; status: string; venue: { name: string; city: string | null; region: string | null; country_code: string | null } | null;
    commission: { slug: string; name: string } | null; broadcast_notes: string | null; source: TruthSource };
  source_identities: TruthIdentity[];
  organizations: { role: string; organization: string; name: string; source: TruthSource }[];
  bouts: { public_id: string; status: string; bout_order: number | null; scheduled_rounds: number | null; weight_class: string | null;
    corners: { side: string; participant_status: string; fighter: string; display_name: string }[];
    result: { outcome: string; method: string | null; round: number | null; result_state: string; revision: number; winner: string | null } | null;
    titles: string[]; scorecards: number; officials: number; weigh_ins: number; source: TruthSource }[];
  card_history: CardHistoryRow[];
  ledger: LedgerRow[];
}
export interface TruthBout {
  bout: { public_id: string; status: string; bout_order: number | null; card_segment: string | null; scheduled_rounds: number | null; weight_class: string | null; weight_class_name: string | null;
    contracted_weight_lb: number | null; is_catchweight: boolean | null; source: TruthSource };
  event: TruthEvent["event"] | null;
  source_identities: TruthIdentity[];
  corners: { side: string; participant_status: string; status_changed_at: string | null; fighter: string; display_name: string; replaced_by: string | null; replaced_by_name: string | null;
    record_entering: { wins: number | null; losses: number | null; draws: number | null; no_contests: number | null };
    identities: TruthIdentity[];
    appearance_decisions: { namespace: string; source_bout_ref: string; side: string; observed_name: string; decision: string; tier: string; decided_by: string; decided_at: string }[];
    source: TruthSource }[];
  titles: { organization: string; tier: string; title: string; name: string; source_native_label: string | null; status: string; at_stake: boolean; eligible_fighter: string | null; source: TruthSource }[];
  sanctioning_bodies: { body: string; weight_class: string; before: BodyDocument | null; after: BodyDocument | null }[];
  results: { revision: number; current: boolean; result_state: string; outcome: string; winner: string | null; winner_name: string | null; method: string | null; method_raw: string | null;
    decision_type: string | null; round: number | null; time_sec: number | null; change_reason: string | null; captured_at: string; source: TruthSource }[];
  scorecards: { judge: string | null; judge_name: string | null; slot: number | null; revision: number; current: boolean; card_state: string; fighter_a_total: number | null; fighter_b_total: number | null;
    score_basis: string; captured_at: string; rounds: { round: number; a: number; b: number }[]; source: TruthSource }[];
  point_deductions: { fighter: string | null; round: number | null; points: number; reason: string | null; source: TruthSource }[];
  officials: { role: string; slot: number | null; official: string | null; name: string | null; assignment_state: string; replaced_by: string | null; state_changed_at: string | null; source: TruthSource }[];
  weigh_ins: { fighter: string | null; fighter_name: string | null; kind: string; attempt: number; official_weight_lb: number | null; contracted_weight_lb: number | null; miss_lb: number | null;
    status: string; verification_state: string; revision: number; current: boolean; source: TruthSource }[];
  regulatory_actions: { fighter: string | null; fighter_name: string | null; action_type: string; status: string; effective_from: string | null; effective_to: string | null; revision: number; source: TruthSource }[];
  card_history: CardHistoryRow[];
  ledger: LedgerRow[];
  news: { event_type: string; state: string; occurred_at: string | null; detected_at: string }[];
}
export interface BodyDocument {
  document_kind: string; as_of: string | null; as_of_label: string | null; source_url: string;
  belts: { designation: string | null; tier: string | null; status: string; holder: { name: string | null; country: string | null } | null }[];
}
