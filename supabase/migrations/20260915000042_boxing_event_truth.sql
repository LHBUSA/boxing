-- Boxing Event Truth V1 (staging first; production untouched).
--
-- 1. Provenance on every outcome lane: the scorecard, point-deduction, weigh-in and regulatory recorders write the
--    observation of the document the fact came from (the columns existed; the recorders never set them).
-- 2. boxing_event_truth_ledger: one ordered view of the changes the stored append-only facts prove (card changes,
--    result / scorecard / weigh-in / regulatory revisions), in the Boxing News vocabulary.
-- 3. boxing_event_truth_assertions(): invariants of the canonical graph (failures vs counted known gaps).
-- 4. Investigator reads boxing_truth_index / boxing_truth_event / boxing_truth_bout: event -> card -> bout -> corners
--    (source identities, appearance decisions) -> titles and each body's own statement -> results (all revisions) ->
--    scorecards (all revisions, rounds) -> officials -> weigh-ins -> regulatory actions -> card history -> ledger -> news,
--    every lane with its source.

begin;

create or replace function public.boxing_record_scorecard(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_bout uuid := (p ->> 'bout_id')::uuid;
  v_judge uuid := (p ->> 'judge_id')::uuid;
  v_cur public.boxing_scorecards%rowtype;
  v_same boolean;
  v_id uuid;
  r jsonb;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  select * into v_cur from public.boxing_scorecards_current where bout_id = v_bout and judge_id = v_judge;
  if found then
    v_same := v_cur.fighter_a_total is not distinct from nullif(p ->> 'fighter_a_total', '')::numeric
      and v_cur.fighter_b_total is not distinct from nullif(p ->> 'fighter_b_total', '')::numeric
      and v_cur.decision_for_id is not distinct from nullif(p ->> 'decision_for_id', '')::uuid
      and coalesce((select jsonb_agg(jsonb_build_object('round', sr.round, 'a', sr.fighter_a_points, 'b', sr.fighter_b_points) order by sr.round)
                    from public.boxing_scorecard_rounds sr where sr.scorecard_id = v_cur.id), '[]'::jsonb)
         = coalesce((select jsonb_agg(jsonb_build_object('round', (x ->> 'round')::int, 'a', (x ->> 'a')::numeric(4,1), 'b', (x ->> 'b')::numeric(4,1))
                                      order by (x ->> 'round')::int)
                     from jsonb_array_elements(coalesce(p -> 'rounds', '[]'::jsonb)) x), '[]'::jsonb);
    if v_same then
      return jsonb_build_object('status', 'duplicate', 'scorecard_id', v_cur.id, 'revision', v_cur.revision);
    end if;
  end if;
  insert into public.boxing_scorecards
    (bout_id, judge_id, fighter_a_id, fighter_b_id, fighter_a_total, fighter_b_total, decision_for_id, source_id, source_url,
     revision, supersedes_id, card_state, scorer_role, score_basis, slot, change_reason, observation_id)
  values (v_bout, v_judge, (p ->> 'fighter_a_id')::uuid, (p ->> 'fighter_b_id')::uuid,
          nullif(p ->> 'fighter_a_total', '')::numeric, nullif(p ->> 'fighter_b_total', '')::numeric,
          nullif(p ->> 'decision_for_id', '')::uuid, v_src, p ->> 'source_url', coalesce(v_cur.revision + 1, 1), v_cur.id,
          case when v_cur.id is null then coalesce(p ->> 'card_state', 'official') else 'corrected' end,
          coalesce(p ->> 'scorer_role', 'judge'), coalesce(p ->> 'score_basis', 'unknown'), nullif(p ->> 'slot', '')::smallint,
          p ->> 'change_reason', nullif(p ->> 'observation_id', '')::uuid)
  returning id into v_id;
  for r in select * from jsonb_array_elements(coalesce(p -> 'rounds', '[]'::jsonb)) loop
    insert into public.boxing_scorecard_rounds (scorecard_id, round, fighter_a_points, fighter_b_points, notes)
    values (v_id, (r ->> 'round')::int, (r ->> 'a')::numeric, (r ->> 'b')::numeric, r ->> 'notes');
  end loop;
  return jsonb_build_object('status', case when v_cur.id is null then 'created' else 'revised' end, 'scorecard_id', v_id,
    'revision', coalesce(v_cur.revision + 1, 1), 'superseded_scorecard_id', v_cur.id);
end $$;

create or replace function public.boxing_record_point_deduction(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.boxing_point_deductions (bout_id, fighter_id, round, points, reason_public, referee_official_id, source_id, source_url, observation_id)
  values ((p ->> 'bout_id')::uuid, (p ->> 'fighter_id')::uuid, (p ->> 'round')::int, (p ->> 'points')::numeric, p ->> 'reason_public',
          nullif(p ->> 'referee_official_id', '')::uuid, (select id from public.boxing_sources where source_key = p ->> 'source_key'),
          p ->> 'source_url', nullif(p ->> 'observation_id', '')::uuid)
  on conflict do nothing
  returning id into v_id;
  return jsonb_build_object('inserted', v_id is not null, 'id', v_id);
end $$;

create or replace function public.boxing_record_weigh_in(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_cur public.boxing_weigh_ins%rowtype;
  v_id uuid;
  v_kind text := coalesce(p ->> 'weigh_in_kind', 'official');
  v_attempt int := coalesce((p ->> 'attempt_no')::int, 1);
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  select w.* into v_cur from public.boxing_weigh_ins w
  where w.bout_id = (p ->> 'bout_id')::uuid and w.fighter_id = (p ->> 'fighter_id')::uuid and w.weigh_in_kind = v_kind
    and w.attempt_no = v_attempt and not exists (select 1 from public.boxing_weigh_ins n where n.supersedes_id = w.id)
  order by w.revision desc limit 1;
  if found and v_cur.official_weight_lb is not distinct from nullif(p ->> 'official_weight_lb', '')::numeric
     and v_cur.contracted_weight_lb is not distinct from nullif(p ->> 'contracted_weight_lb', '')::numeric
     and v_cur.status = p ->> 'status' and v_cur.verification_state = coalesce(p ->> 'verification_state', 'unverified') then
    return jsonb_build_object('status', 'duplicate', 'weigh_in_id', v_cur.id);
  end if;
  insert into public.boxing_weigh_ins
    (bout_id, fighter_id, attempt_no, official_weight_lb, official_weight_kg, contracted_weight_lb, miss_lb, status, weighed_at,
     source_id, source_url, weigh_in_kind, source_unit, source_weight_raw, verification_state, revision, supersedes_id, observation_id)
  values ((p ->> 'bout_id')::uuid, (p ->> 'fighter_id')::uuid, v_attempt, nullif(p ->> 'official_weight_lb', '')::numeric,
          nullif(p ->> 'official_weight_kg', '')::numeric, nullif(p ->> 'contracted_weight_lb', '')::numeric,
          nullif(p ->> 'miss_lb', '')::numeric, p ->> 'status', nullif(p ->> 'weighed_at', '')::timestamptz, v_src, p ->> 'source_url',
          v_kind, p ->> 'source_unit', p ->> 'source_weight_raw', coalesce(p ->> 'verification_state', 'unverified'),
          coalesce(v_cur.revision + 1, 1), v_cur.id, nullif(p ->> 'observation_id', '')::uuid)
  returning id into v_id;
  return jsonb_build_object('status', case when v_cur.id is null then 'created' else 'revised' end, 'weigh_in_id', v_id,
    'superseded_weigh_in_id', v_cur.id, 'previous_status', v_cur.status, 'previous_verification_state', v_cur.verification_state);
end $$;

create or replace function public.boxing_record_regulatory_action(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_cur public.boxing_regulatory_actions%rowtype;
  v_id uuid;
  v_key text := p ->> 'action_key';
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  select a.* into v_cur from public.boxing_regulatory_actions a
  where split_part(a.action_key, '#r', 1) = v_key
    and not exists (select 1 from public.boxing_regulatory_actions n where n.supersedes_id = a.id)
  order by a.revision desc limit 1;
  if found and v_cur.status = p ->> 'status' and v_cur.action_type = p ->> 'action_type'
     and v_cur.effective_from is not distinct from nullif(p ->> 'effective_from', '')::timestamptz
     and v_cur.effective_to is not distinct from nullif(p ->> 'effective_to', '')::timestamptz
     and v_cur.reason_public is not distinct from (p ->> 'reason_public') then
    return jsonb_build_object('status', 'duplicate', 'action_id', v_cur.id);
  end if;
  insert into public.boxing_regulatory_actions
    (fighter_id, official_id, bout_id, commission_id, action_type, status, effective_from, effective_to, reason_public,
     source_id, source_url, source_record, revision, supersedes_id, action_key, observation_id)
  values (nullif(p ->> 'fighter_id', '')::uuid, nullif(p ->> 'official_id', '')::uuid, nullif(p ->> 'bout_id', '')::uuid,
          (select id from public.boxing_commissions where slug = p ->> 'commission_slug'), p ->> 'action_type', p ->> 'status',
          nullif(p ->> 'effective_from', '')::timestamptz, nullif(p ->> 'effective_to', '')::timestamptz, p ->> 'reason_public',
          v_src, p ->> 'source_url', coalesce(p -> 'source_record', '{}'::jsonb), coalesce(v_cur.revision + 1, 1), v_cur.id,
          case when v_cur.id is null then v_key else v_key || '#r' || (v_cur.revision + 1) end, nullif(p ->> 'observation_id', '')::uuid)
  returning id into v_id;
  return jsonb_build_object('status', case when v_cur.id is null then 'created' else 'revised' end, 'action_id', v_id,
    'superseded_action_id', v_cur.id);
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Event truth ledger: one ordered, deterministic list of the changes the stored facts prove. It is a view over the
-- append-only fact tables (card changes, result / scorecard / weigh-in / regulatory revisions): nothing is re-written and
-- nothing is emitted that a stored fact does not support. change_type is the Boxing News vocabulary; source_change_type
-- keeps the native fact name.
-- ---------------------------------------------------------------------------------------------------------------------

create or replace view public.boxing_event_truth_ledger as
select 'card_change:' || c.id::text as ledger_key,
  case c.change_type
    when 'bout_added' then 'FIGHT_ANNOUNCED' when 'opponent_replaced' then 'OPPONENT_REPLACED' when 'participant_withdrawn' then 'OPPONENT_REPLACED'
    when 'bout_cancelled' then 'FIGHT_CANCELLED' when 'bout_postponed' then 'FIGHT_POSTPONED'
    when 'event_cancelled' then 'EVENT_CANCELLED' when 'event_postponed' then 'EVENT_POSTPONED' when 'event_announced' then 'EVENT_ADDED'
    when 'venue_changed' then 'VENUE_CHANGED'
    when 'official_assigned' then 'OFFICIALS_ASSIGNED' when 'official_replaced' then 'OFFICIALS_ASSIGNED'
    when 'title_added' then 'TITLE_STATUS_CHANGED' when 'title_removed' then 'TITLE_STATUS_CHANGED'
    else 'CARD_CHANGED' end as change_type,
  c.change_type as source_change_type, c.event_id, c.bout_id, null::uuid as fighter_id,
  coalesce(c.effective_at, c.detected_at) as occurred_at, c.detected_at as recorded_at,
  c.source_id, c.source_url, c.observation_id, 'boxing_card_changes'::text as fact_table, c.id::text as fact_key, 1 as revision,
  c.before_state, c.after_state
from public.boxing_card_changes c
union all
select 'result:' || r.id::text,
  case when r.result_state = 'overturned' then 'RESULT_OVERTURNED' when r.revision > 1 then 'RESULT_CORRECTED' when r.result_state = 'official' then 'RESULT_OFFICIAL' else 'RESULT_PROVISIONAL' end,
  'result_' || r.result_state, b.event_id, r.bout_id, r.winner_id, coalesce(r.decided_at, r.captured_at), r.captured_at,
  r.source_id, r.source_url, r.observation_id, 'boxing_bout_results', r.id::text, r.revision,
  case when r.supersedes_id is null then null else (select jsonb_build_object('outcome', p.outcome, 'method', p.method, 'result_state', p.result_state, 'winner_id', p.winner_id)
    from public.boxing_bout_results p where p.id = r.supersedes_id) end,
  jsonb_build_object('outcome', r.outcome, 'method', r.method, 'decision_type', r.decision_type, 'round', r.round, 'time_sec', r.time_sec, 'result_state', r.result_state, 'winner_id', r.winner_id)
from public.boxing_bout_results r join public.boxing_bouts b on b.id = r.bout_id
union all
select 'scorecard:' || s.id::text, case when s.revision > 1 then 'SCORECARD_CORRECTED' else 'SCORECARD_POSTED' end,
  'scorecard_' || s.card_state, b.event_id, s.bout_id, null, s.captured_at, s.captured_at,
  s.source_id, s.source_url, s.observation_id, 'boxing_scorecards', s.id::text, s.revision, null,
  jsonb_build_object('judge_id', s.judge_id, 'fighter_a_total', s.fighter_a_total, 'fighter_b_total', s.fighter_b_total, 'card_state', s.card_state)
from public.boxing_scorecards s join public.boxing_bouts b on b.id = s.bout_id
union all
select 'weigh_in:' || w.id::text,
  case when w.weigh_in_kind = 'official' and w.status = 'missed_weight' and w.verification_state = 'verified' then 'WEIGHT_MISSED' else 'WEIGH_IN_RESULT' end,
  'weigh_in_' || w.weigh_in_kind, b.event_id, w.bout_id, w.fighter_id, coalesce(w.weighed_at, w.captured_at), w.captured_at,
  w.source_id, w.source_url, w.observation_id, 'boxing_weigh_ins', w.id::text, w.revision, null,
  jsonb_build_object('official_weight_lb', w.official_weight_lb, 'contracted_weight_lb', w.contracted_weight_lb, 'miss_lb', w.miss_lb, 'status', w.status,
    'verification_state', w.verification_state, 'weigh_in_kind', w.weigh_in_kind)
from public.boxing_weigh_ins w join public.boxing_bouts b on b.id = w.bout_id
union all
select 'regulatory:' || a.id::text, case when a.action_type = 'suspension' then 'SUSPENSION_POSTED' else 'REGULATORY_ACTION' end,
  'regulatory_' || a.action_type, b.event_id, a.bout_id, a.fighter_id, coalesce(a.effective_from, a.captured_at), a.captured_at,
  a.source_id, a.source_url, a.observation_id, 'boxing_regulatory_actions', a.id::text, a.revision, null,
  jsonb_build_object('action_type', a.action_type, 'status', a.status, 'effective_from', a.effective_from, 'effective_to', a.effective_to)
from public.boxing_regulatory_actions a left join public.boxing_bouts b on b.id = a.bout_id;

-- the ledger of one event or one bout, ordered by when it happened, then when it was recorded
create or replace function public.boxing_event_truth_ledger_json(p_event uuid default null, p_bout uuid default null, p_limit int default 500)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('ledger_key', l.ledger_key, 'change_type', l.change_type, 'source_change_type', l.source_change_type,
      'bout', bt.public_id, 'fighter', f.public_id, 'fighter_name', f.display_name, 'occurred_at', l.occurred_at, 'recorded_at', l.recorded_at,
      'revision', l.revision, 'before', l.before_state, 'after', l.after_state,
      'source', jsonb_build_object('source_key', s.source_key, 'url', l.source_url, 'observation', left(l.observation_id::text, 8)))
    order by l.occurred_at, l.recorded_at, l.ledger_key), '[]'::jsonb)
  from (select * from public.boxing_event_truth_ledger x
        where (p_event is null or x.event_id = p_event) and (p_bout is null or x.bout_id = p_bout)
        order by x.occurred_at desc, x.recorded_at desc limit p_limit) l
  left join public.boxing_bouts bt on bt.id = l.bout_id
  left join public.boxing_fighters f on f.id = l.fighter_id
  left join public.boxing_sources s on s.id = l.source_id
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Assertions: invariants the canonical event graph must hold. severity 'failure' fails the acceptance; 'info' is a
-- counted, known gap (e.g. facts stored before a recorder wrote observation ids: their source and URL are still present).
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_fighter_has_identity_evidence(p_fighter uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.boxing_fighter_identities i where i.fighter_id = p_fighter)
      or exists (select 1 from public.boxing_identity_appearance_decisions d where d.fighter_id = p_fighter)
      or exists (select 1 from public.boxing_identity_resolutions r where r.fighter_id = p_fighter and r.outcome in ('matched','created'))
$$;

create or replace function public.boxing_event_truth_assertions()
returns jsonb language sql stable set search_path = '' as $$
  with checks as (
    select 'bout_not_exactly_two_active_corners' as assertion, 'failure' as severity,
      (select count(*) from public.boxing_bouts b where b.status <> 'cancelled' and
        (select count(*) from public.boxing_bout_participants p where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')) <> 2) as failures,
      (select coalesce(jsonb_agg(x.public_id), '[]'::jsonb) from (select b.public_id from public.boxing_bouts b where b.status <> 'cancelled' and
        (select count(*) from public.boxing_bout_participants p where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')) <> 2 limit 5) x) as sample
    union all
    select 'bout_without_source_identity', 'failure',
      (select count(*) from public.boxing_bouts b where not exists (select 1 from public.boxing_bout_identities i where i.bout_id = b.id and i.verification_state <> 'rejected')),
      (select coalesce(jsonb_agg(x.public_id), '[]'::jsonb) from (select b.public_id from public.boxing_bouts b where not exists
        (select 1 from public.boxing_bout_identities i where i.bout_id = b.id and i.verification_state <> 'rejected') limit 5) x)
    union all
    select 'event_without_source_identity', 'failure',
      (select count(*) from public.boxing_events e where not exists (select 1 from public.boxing_event_identities i where i.event_id = e.id and i.verification_state <> 'rejected')),
      (select coalesce(jsonb_agg(x.public_id), '[]'::jsonb) from (select e.public_id from public.boxing_events e where not exists
        (select 1 from public.boxing_event_identities i where i.event_id = e.id and i.verification_state <> 'rejected') limit 5) x)
    union all
    -- a fighter in a bout must stand on recorded identity evidence (a source identity, a resolver or human resolution of an
    -- observation, or an appearance decision): never on a display name alone
    select 'bout_fighter_without_identity_evidence', 'failure',
      (select count(distinct p.fighter_id) from public.boxing_bout_participants p where not public.boxing_fighter_has_identity_evidence(p.fighter_id)),
      (select coalesce(jsonb_agg(x.public_id), '[]'::jsonb) from (select distinct f.public_id from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id
        where not public.boxing_fighter_has_identity_evidence(p.fighter_id) limit 5) x)
    union all
    select 'factual_row_without_source', 'failure',
      (select count(*) from public.boxing_bout_results where source_id is null) + (select count(*) from public.boxing_scorecards where source_id is null)
        + (select count(*) from public.boxing_weigh_ins where source_id is null) + (select count(*) from public.boxing_regulatory_actions where source_id is null)
        + (select count(*) from public.boxing_bout_officials where source_id is null) + (select count(*) from public.boxing_point_deductions where source_id is null),
      '[]'::jsonb
    union all
    select 'result_winner_not_a_corner', 'failure',
      (select count(*) from public.boxing_bout_results_current r where r.winner_id is not null
        and not exists (select 1 from public.boxing_bout_participants p where p.bout_id = r.bout_id and p.fighter_id = r.winner_id)), '[]'::jsonb
    union all
    select 'more_than_one_current_result', 'failure',
      (select count(*) from (select bout_id from public.boxing_bout_results_current group by bout_id having count(*) > 1) x), '[]'::jsonb
    union all
    select 'more_than_one_current_card_per_judge', 'failure',
      (select count(*) from (select bout_id, judge_id from public.boxing_scorecards_current group by 1, 2 having count(*) > 1) x), '[]'::jsonb
    union all
    select 'scorecard_judge_never_assigned', 'failure',
      (select count(*) from public.boxing_scorecards_current s where not exists (select 1 from public.boxing_bout_officials o where o.bout_id = s.bout_id and o.official_id = s.judge_id)), '[]'::jsonb
    union all
    select 'replaced_corner_without_successor', 'failure',
      (select count(*) from public.boxing_bout_participants p where p.participant_status = 'replaced' and p.replaced_by_fighter_id is null), '[]'::jsonb
    union all
    select 'bout_title_division_mismatch', 'failure',
      (select count(*) from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join public.boxing_bouts b on b.id = bt.bout_id
        where b.weight_class_id is not null and t.weight_class_id is distinct from b.weight_class_id), '[]'::jsonb
    union all
    select 'active_referees_more_than_one', 'failure',
      (select count(*) from (select bout_id from public.boxing_bout_officials where role = 'referee' and assignment_state in ('assigned','worked') group by 1 having count(*) > 1) x), '[]'::jsonb
    union all
    select 'fact_without_observation_link (legacy rows before 0042)', 'info',
      (select count(*) from public.boxing_scorecards where observation_id is null) + (select count(*) from public.boxing_weigh_ins where observation_id is null)
        + (select count(*) from public.boxing_regulatory_actions where observation_id is null) + (select count(*) from public.boxing_point_deductions where observation_id is null)
        + (select count(*) from public.boxing_bout_results where observation_id is null), '[]'::jsonb
    union all
    select 'identity_review_pending', 'info', (select count(*) from public.boxing_identity_review_queue where status = 'pending'), '[]'::jsonb
    union all
    select 'scheduled_bouts_before_fight_night', 'info',
      (select count(*) from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id where b.status in ('announced','scheduled') and e.event_date >= current_date), '[]'::jsonb
  )
  select jsonb_build_object('failures', (select coalesce(sum(failures), 0) from checks where severity = 'failure'),
    'checks', (select jsonb_agg(jsonb_build_object('assertion', assertion, 'severity', severity, 'count', failures, 'sample', sample)) from checks))
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Investigator reads: the whole graph of one event or one bout, every lane with its source (source key, URL, observation).
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_truth_source(p_source uuid, p_url text, p_observation uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('source_key', (select source_key from public.boxing_sources where id = p_source), 'url', p_url, 'observation', left(p_observation::text, 8))
$$;

create or replace function public.boxing_truth_bout(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select b.* from public.boxing_bouts b where public.boxing_site_ref_matches(b.public_id, p_ref)),
  b as (select * from hit where (select count(*) from hit) = 1),
  e as (select ev.* from public.boxing_events ev join b on b.event_id = ev.id)
  select case when not exists (select 1 from b) then null else jsonb_build_object(
    'bout', (select jsonb_build_object('public_id', b.public_id, 'status', b.status, 'bout_order', b.bout_order, 'card_segment', b.card_segment,
        'scheduled_rounds', b.scheduled_rounds, 'weight_class', wc.class_key, 'weight_class_name', wc.name, 'contracted_weight_lb', b.contracted_weight_lb,
        'is_catchweight', b.is_catchweight, 'source', public.boxing_truth_source(b.source_id, b.source_url, null))
      from b left join public.boxing_weight_classes wc on wc.id = b.weight_class_id),
    'event', (select jsonb_build_object('public_id', e.public_id, 'name', e.name, 'event_date', e.event_date, 'status', e.status,
        'venue', (select jsonb_build_object('name', v.name, 'city', v.city, 'region', v.region, 'country_code', v.country_code) from public.boxing_venues v where v.id = e.venue_id),
        'commission', (select jsonb_build_object('slug', c.slug, 'name', c.name) from public.boxing_commissions c where c.id = e.commission_id),
        'source', public.boxing_truth_source(e.source_id, e.source_url, null)) from e),
    'source_identities', (select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'source_ref', i.external_id, 'verification_state', i.verification_state,
        'source_key', s.source_key) order by i.namespace), '[]'::jsonb)
      from public.boxing_bout_identities i join b on b.id = i.bout_id left join public.boxing_sources s on s.id = i.source_id),
    'corners', (select coalesce(jsonb_agg(jsonb_build_object('side', p.side, 'participant_status', p.participant_status, 'status_changed_at', p.status_changed_at,
        'fighter', f.public_id, 'display_name', f.display_name, 'replaced_by', rf.public_id, 'replaced_by_name', rf.display_name,
        'record_entering', jsonb_build_object('wins', p.record_wins, 'losses', p.record_losses, 'draws', p.record_draws, 'no_contests', p.record_no_contests),
        'identities', (select coalesce(jsonb_agg(jsonb_build_object('namespace', fi.namespace, 'source_ref', fi.external_id, 'verification_state', fi.verification_state,
            'source_display_name', fi.source_display_name) order by fi.namespace), '[]'::jsonb) from public.boxing_fighter_identities fi where fi.fighter_id = f.id),
        'appearance_decisions', (select coalesce(jsonb_agg(jsonb_build_object('namespace', d.namespace, 'source_bout_ref', d.bout_external_id, 'side', d.side,
            'observed_name', d.observed_name, 'decision', d.decision, 'tier', d.tier, 'decided_by', d.decided_by, 'decided_at', d.decided_at) order by d.seq), '[]'::jsonb)
          from public.boxing_identity_appearance_decisions d where d.fighter_id = f.id and d.bout_external_id in (select external_id from public.boxing_bout_identities where bout_id = p.bout_id)),
        'source', public.boxing_truth_source(p.source_id, p.source_url, null)) order by p.side, p.status_changed_at nulls first), '[]'::jsonb)
      from public.boxing_bout_participants p join b on b.id = p.bout_id join public.boxing_fighters f on f.id = p.fighter_id
      left join public.boxing_fighters rf on rf.id = p.replaced_by_fighter_id),
    'titles', (select coalesce(jsonb_agg(jsonb_build_object('organization', o.slug, 'tier', t.tier, 'title', t.public_id, 'name', t.name, 'source_native_label', t.source_native_label,
        'status', bt.status, 'at_stake', bt.at_stake, 'eligible_fighter', ef.public_id, 'source', public.boxing_truth_source(bt.source_id, bt.source_url, null)) order by o.slug, t.tier), '[]'::jsonb)
      from public.boxing_bout_titles bt join b on b.id = bt.bout_id join public.boxing_titles t on t.id = bt.title_id
      join public.boxing_organizations o on o.id = t.organization_id left join public.boxing_fighters ef on ef.id = bt.eligible_fighter_id),
    -- each body's own statement for the bout's division (or, when the sheet names none, the divisions of the titles it
    -- contested) before and after the fight; never merged into the bout's titles
    'sanctioning_bodies', (select coalesce(jsonb_agg(jsonb_build_object('body', o.slug, 'weight_class', wc.class_key,
        'before', (select public.boxing_title_snapshot_json(s.id) from public.boxing_title_status_snapshots s where s.organization_id = o.id
                     and s.weight_class_id = wc.id and s.gender_scope = 'male' and s.document_kind in ('wba_ranking','ibf_rating','wbo_ratings','wbc_ratings')
                     and coalesce(s.as_of, s.published_on) < (select event_date from e) order by coalesce(s.as_of, s.published_on) desc, s.captured_at desc limit 1),
        'after', (select public.boxing_title_snapshot_json(s.id) from public.boxing_title_status_snapshots s where s.organization_id = o.id
                     and s.weight_class_id = wc.id and s.gender_scope = 'male' and s.document_kind in ('wba_ranking','ibf_rating','wbo_ratings','wbc_ratings')
                     and coalesce(s.as_of, s.published_on) >= (select event_date from e) order by coalesce(s.as_of, s.published_on), s.captured_at limit 1))
      order by wc.max_weight_lb, array_position(array['wbc','wba','ibf','wbo'], o.slug)), '[]'::jsonb)
      from public.boxing_organizations o
      cross join public.boxing_weight_classes wc
      where o.slug in ('wbc','wba','ibf','wbo')
        and wc.id in (select weight_class_id from b where weight_class_id is not null
                      union select t.weight_class_id from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join b on b.id = bt.bout_id)),
    'results', (select coalesce(jsonb_agg(jsonb_build_object('revision', r.revision, 'current', not exists (select 1 from public.boxing_bout_results n where n.supersedes_id = r.id),
        'result_state', r.result_state, 'outcome', r.outcome, 'winner', wf.public_id, 'winner_name', wf.display_name, 'method', r.method, 'method_raw', r.method_raw,
        'decision_type', r.decision_type, 'round', r.round, 'time_sec', r.time_sec, 'change_reason', r.change_reason, 'captured_at', r.captured_at,
        'source', public.boxing_truth_source(r.source_id, r.source_url, r.observation_id)) order by r.revision), '[]'::jsonb)
      from public.boxing_bout_results r join b on b.id = r.bout_id left join public.boxing_fighters wf on wf.id = r.winner_id),
    'scorecards', (select coalesce(jsonb_agg(jsonb_build_object('judge', o.public_id, 'judge_name', o.display_name, 'slot', s.slot, 'revision', s.revision,
        'current', not exists (select 1 from public.boxing_scorecards n where n.supersedes_id = s.id), 'card_state', s.card_state,
        'fighter_a_total', s.fighter_a_total, 'fighter_b_total', s.fighter_b_total, 'score_basis', s.score_basis, 'captured_at', s.captured_at,
        'rounds', (select coalesce(jsonb_agg(jsonb_build_object('round', sr.round, 'a', sr.fighter_a_points, 'b', sr.fighter_b_points) order by sr.round), '[]'::jsonb)
                   from public.boxing_scorecard_rounds sr where sr.scorecard_id = s.id),
        'source', public.boxing_truth_source(s.source_id, s.source_url, s.observation_id)) order by s.slot nulls last, s.revision), '[]'::jsonb)
      from public.boxing_scorecards s join b on b.id = s.bout_id left join public.boxing_officials o on o.id = public.boxing_canonical_official_id(s.judge_id)),
    'point_deductions', (select coalesce(jsonb_agg(jsonb_build_object('fighter', f.public_id, 'round', d.round, 'points', d.points, 'reason', d.reason_public,
        'source', public.boxing_truth_source(d.source_id, d.source_url, d.observation_id)) order by d.round), '[]'::jsonb)
      from public.boxing_point_deductions d join b on b.id = d.bout_id left join public.boxing_fighters f on f.id = d.fighter_id),
    'officials', (select coalesce(jsonb_agg(jsonb_build_object('role', bo.role, 'slot', bo.slot, 'official', o.public_id, 'name', o.display_name,
        'assignment_state', bo.assignment_state, 'replaced_by', ro.public_id, 'state_changed_at', bo.state_changed_at,
        'source', public.boxing_truth_source(bo.source_id, bo.source_url, bo.observation_id)) order by bo.role desc, bo.slot nulls first), '[]'::jsonb)
      from public.boxing_bout_officials bo join b on b.id = bo.bout_id left join public.boxing_officials o on o.id = public.boxing_canonical_official_id(bo.official_id)
      left join public.boxing_officials ro on ro.id = bo.replaced_by_official_id),
    'weigh_ins', (select coalesce(jsonb_agg(jsonb_build_object('fighter', f.public_id, 'fighter_name', f.display_name, 'kind', w.weigh_in_kind, 'attempt', w.attempt_no,
        'official_weight_lb', w.official_weight_lb, 'contracted_weight_lb', w.contracted_weight_lb, 'miss_lb', w.miss_lb, 'status', w.status,
        'verification_state', w.verification_state, 'revision', w.revision, 'current', not exists (select 1 from public.boxing_weigh_ins n where n.supersedes_id = w.id),
        'source', public.boxing_truth_source(w.source_id, w.source_url, w.observation_id)) order by f.public_id, w.weigh_in_kind, w.attempt_no, w.revision), '[]'::jsonb)
      from public.boxing_weigh_ins w join b on b.id = w.bout_id left join public.boxing_fighters f on f.id = w.fighter_id),
    'regulatory_actions', (select coalesce(jsonb_agg(jsonb_build_object('fighter', f.public_id, 'fighter_name', f.display_name, 'action_type', a.action_type, 'status', a.status,
        'effective_from', a.effective_from, 'effective_to', a.effective_to, 'revision', a.revision,
        'source', public.boxing_truth_source(a.source_id, a.source_url, a.observation_id)) order by a.effective_from, a.revision), '[]'::jsonb)
      from public.boxing_regulatory_actions a join b on b.id = a.bout_id left join public.boxing_fighters f on f.id = a.fighter_id),
    'card_history', (select coalesce(jsonb_agg(jsonb_build_object('change_type', c.change_type, 'before', c.before_state, 'after', c.after_state,
        'effective_at', c.effective_at, 'detected_at', c.detected_at, 'source', public.boxing_truth_source(c.source_id, c.source_url, c.observation_id)) order by c.id), '[]'::jsonb)
      from public.boxing_card_changes c join b on b.id = c.bout_id),
    'ledger', public.boxing_event_truth_ledger_json(null, (select id from b)),
    'news', (select coalesce(jsonb_agg(jsonb_build_object('event_type', n.event_type, 'state', n.state, 'occurred_at', n.occurred_at, 'detected_at', n.detected_at) order by n.detected_at), '[]'::jsonb)
      from public.boxing_news_events n join b on b.id = n.bout_id)
  ) end
$$;

create or replace function public.boxing_truth_event(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select e.* from public.boxing_events e where public.boxing_site_ref_matches(e.public_id, p_ref)),
  e as (select * from hit where (select count(*) from hit) = 1)
  select case when not exists (select 1 from e) then null else jsonb_build_object(
    'event', (select jsonb_build_object('public_id', e.public_id, 'name', e.name, 'event_date', e.event_date, 'start_at', e.start_at, 'status', e.status,
        'venue', (select jsonb_build_object('name', v.name, 'city', v.city, 'region', v.region, 'country_code', v.country_code) from public.boxing_venues v where v.id = e.venue_id),
        'commission', (select jsonb_build_object('slug', c.slug, 'name', c.name) from public.boxing_commissions c where c.id = e.commission_id),
        'broadcast_notes', e.broadcast_notes, 'source', public.boxing_truth_source(e.source_id, e.source_url, null)) from e),
    'source_identities', (select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'source_ref', i.external_id, 'verification_state', i.verification_state,
        'source_key', s.source_key) order by i.namespace), '[]'::jsonb)
      from public.boxing_event_identities i join e on e.id = i.event_id left join public.boxing_sources s on s.id = i.source_id),
    'organizations', (select coalesce(jsonb_agg(jsonb_build_object('role', eo.role, 'organization', o.slug, 'name', o.name,
        'source', public.boxing_truth_source(eo.source_id, eo.source_url, null)) order by eo.role, o.slug), '[]'::jsonb)
      from public.boxing_event_organizations eo join e on e.id = eo.event_id join public.boxing_organizations o on o.id = eo.organization_id),
    'bouts', (select coalesce(jsonb_agg(jsonb_build_object('public_id', b.public_id, 'status', b.status, 'bout_order', b.bout_order, 'scheduled_rounds', b.scheduled_rounds,
        'weight_class', wc.class_key,
        'corners', (select coalesce(jsonb_agg(jsonb_build_object('side', p.side, 'participant_status', p.participant_status, 'fighter', f.public_id, 'display_name', f.display_name)
                     order by p.side, p.status_changed_at nulls first), '[]'::jsonb)
                    from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id where p.bout_id = b.id),
        'result', (select jsonb_build_object('outcome', r.outcome, 'method', r.method, 'round', r.round, 'result_state', r.result_state, 'revision', r.revision, 'winner', wf.public_id)
                   from public.boxing_bout_results_current r left join public.boxing_fighters wf on wf.id = r.winner_id where r.bout_id = b.id limit 1),
        'titles', (select coalesce(jsonb_agg(o.slug || ':' || t.tier order by o.slug), '[]'::jsonb) from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id
                   join public.boxing_organizations o on o.id = t.organization_id where bt.bout_id = b.id and bt.at_stake),
        'scorecards', (select count(*) from public.boxing_scorecards_current s where s.bout_id = b.id),
        'officials', (select count(*) from public.boxing_bout_officials bo where bo.bout_id = b.id and bo.assignment_state in ('assigned','worked')),
        'weigh_ins', (select count(*) from public.boxing_weigh_ins w where w.bout_id = b.id),
        'source', public.boxing_truth_source(b.source_id, b.source_url, null)) order by b.bout_order nulls last, b.public_id), '[]'::jsonb)
      from public.boxing_bouts b join e on e.id = b.event_id left join public.boxing_weight_classes wc on wc.id = b.weight_class_id),
    'card_history', (select coalesce(jsonb_agg(jsonb_build_object('change_type', c.change_type, 'bout', bt.public_id, 'before', c.before_state, 'after', c.after_state,
        'effective_at', c.effective_at, 'detected_at', c.detected_at, 'source', public.boxing_truth_source(c.source_id, c.source_url, c.observation_id)) order by c.id), '[]'::jsonb)
      from public.boxing_card_changes c join e on e.id = c.event_id left join public.boxing_bouts bt on bt.id = c.bout_id),
    'ledger', public.boxing_event_truth_ledger_json((select id from e), null)
  ) end
$$;

create or replace function public.boxing_truth_index(p_limit int default 60)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'assertions', public.boxing_event_truth_assertions(),
    'counts', jsonb_build_object(
      'events', (select count(*) from public.boxing_events), 'events_upcoming', (select count(*) from public.boxing_events where event_date >= current_date),
      'bouts', (select count(*) from public.boxing_bouts), 'bouts_scheduled_upcoming', (select count(*) from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
         where b.status in ('announced','scheduled') and e.event_date >= current_date),
      'fighters', (select count(*) from public.boxing_fighters), 'fighter_source_identities', (select count(*) from public.boxing_fighter_identities),
      'results_current', (select count(*) from public.boxing_bout_results_current), 'result_revisions', (select count(*) from public.boxing_bout_results where revision > 1),
      'scorecards_current', (select count(*) from public.boxing_scorecards_current), 'scorecard_revisions', (select count(*) from public.boxing_scorecards where revision > 1),
      'officials', (select count(*) from public.boxing_officials), 'official_assignments', (select count(*) from public.boxing_bout_officials),
      'weigh_ins', (select count(*) from public.boxing_weigh_ins), 'regulatory_actions', (select count(*) from public.boxing_regulatory_actions),
      'bout_titles', (select count(*) from public.boxing_bout_titles), 'card_changes', (select count(*) from public.boxing_card_changes),
      'identity_review_pending', (select count(*) from public.boxing_identity_review_queue where status = 'pending'),
      'ledger_by_type', (select coalesce(jsonb_object_agg(change_type, n), '{}'::jsonb) from (select change_type, count(*) n from public.boxing_event_truth_ledger group by 1) x)),
    'recent_events', (select coalesce(jsonb_agg(jsonb_build_object('public_id', e.public_id, 'name', e.name, 'event_date', e.event_date, 'status', e.status,
        'bouts', (select count(*) from public.boxing_bouts b where b.event_id = e.id)) order by e.event_date desc), '[]'::jsonb)
      from (select * from public.boxing_events order by event_date desc limit p_limit) e))
$$;

select public.boxing_lockdown();

commit;
