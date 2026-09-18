-- Model scope gate: historical/archive records can never silently enter the current model, its inputs or the product.
--
-- Owner decision 2026-09-15: model_scope is a mandatory prerequisite before ANY historical backfill, and historical data
-- requires explicit scope inclusion rather than being included by default.
--
-- 1. boxing_bouts.model_scope ('current' | 'archive'), default 'current': every row on record today keeps exactly the
--    meaning it had, and a historical row must say so.
-- 2. A bout may not be written with scope 'archive' at all until the runtime flag archive_scope_ingest is enabled
--    (boxing_runtime_flags, append-only), and that flag cannot be enabled while any consumer of the bout graph is still
--    classified pending_scope_review (boxing_scope_consumers). Backfill is therefore blocked by construction, not by policy.
-- 3. The model boundary filters by scope: boxing_fighter_history_as_of / _official_history_as_of / _matchup_inputs /
--    _graph_record_before take p_scopes and default to {current}. A model declares what it opts into
--    (boxing_models.model_scopes, frozen after registration by the existing model guard).
-- 4. boxing_model_scope_check(): the proof surface — scope counts, the flag state, unreviewed consumers, and any archive
--    row that exists while the flag is off.
--
-- Nothing here changes an existing result: with no archive rows, every function returns exactly what it returned before.

begin;

alter table public.boxing_bouts add column if not exists model_scope text not null default 'current';
do $$ begin
  perform public.boxing_ensure_constraint('public.boxing_bouts', 'boxing_bouts_model_scope_check', 'check (model_scope in (''current'',''archive''))');
end $$;
-- a full index, not a partial one: once archive rows outnumber current rows, the current-scope model reads are the ones
-- that need it
create index if not exists boxing_bouts_model_scope_idx on public.boxing_bouts (model_scope);

create table if not exists public.boxing_runtime_flags (
  id uuid primary key default gen_random_uuid(),
  flag text not null check (flag ~ '^[a-z][a-z0-9_]{2,60}$'),
  enabled boolean not null,
  reason text not null check (length(btrim(reason)) >= 20),
  decided_by text not null check (length(btrim(decided_by)) >= 2),
  recorded_at timestamptz not null default now()
);
select public.boxing_install_append_only('public.boxing_runtime_flags');
create index if not exists boxing_runtime_flags_flag_idx on public.boxing_runtime_flags (flag, recorded_at desc);

create or replace function public.boxing_flag_enabled(p_flag text)
returns boolean language sql stable set search_path = '' as $$
  select coalesce((select f.enabled from public.boxing_runtime_flags f where f.flag = p_flag order by f.recorded_at desc, f.id limit 1), false)
$$;

-- every function that reads the bout graph is classified; a new one must be classified before archive ingestion can start
create table if not exists public.boxing_scope_consumers (
  function_name text primary key,
  classification text not null check (classification in ('current_only_enforced','archive_aware_by_design','scope_agnostic_safe','pending_scope_review')),
  note text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.boxing_scope_consumer_touch()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists boxing_scope_consumers_touch on public.boxing_scope_consumers;
create trigger boxing_scope_consumers_touch before update on public.boxing_scope_consumers
  for each row execute function public.boxing_scope_consumer_touch();

insert into public.boxing_scope_consumers (function_name, classification, note) values
  -- the model boundary: scope-filtered, defaults to current only
  ('boxing_fighter_history_as_of', 'current_only_enforced', 'Fight DNA fighter inputs; p_scopes defaults to {current}.'),
  ('boxing_official_history_as_of', 'current_only_enforced', 'Fight DNA official inputs; p_scopes defaults to {current}.'),
  ('boxing_graph_record_before', 'current_only_enforced', 'Opponent record used by DNA; p_scopes defaults to {current}.'),
  ('boxing_matchup_inputs', 'current_only_enforced', 'Model matchup inputs; refuses a bout outside the requested scopes.'),
  ('boxing_gateway_matchup', 'current_only_enforced', 'Serves matchup snapshots and model outputs for current-scope bouts.'),
  -- the history layer: shows archive rows on purpose and labels them
  ('boxing_archive_card', 'archive_aware_by_design', 'Global history read; reports the scope of every bout.'),
  ('boxing_archive_bout', 'archive_aware_by_design', 'Global history read; reports bout scope.'),
  ('boxing_archive_bout_weights', 'archive_aware_by_design', 'Weight interpretation for a bout of either scope.'),
  ('boxing_archive_division', 'archive_aware_by_design', 'Division history across both scopes.'),
  ('boxing_archive_meetings', 'archive_aware_by_design', 'Meetings and common opponents across both scopes.'),
  ('boxing_archive_assertions', 'archive_aware_by_design', 'Counts both scopes and fails on an archive row written while the gate is off.'),
  ('boxing_archive_index', 'archive_aware_by_design', 'History index; reports scope counts.'),
  ('boxing_fighter_passport', 'archive_aware_by_design', 'Career passport; the record on file names the scopes it counted.'),
  ('boxing_truth_bout', 'archive_aware_by_design', 'Investigator view of one bout, any scope.'),
  ('boxing_truth_event', 'archive_aware_by_design', 'Investigator view of one event, any scope.'),
  ('boxing_truth_index', 'archive_aware_by_design', 'Investigator counts of the whole graph.'),
  ('boxing_event_truth_assertions', 'archive_aware_by_design', 'Graph invariants must hold for every bout.'),
  ('boxing_event_truth_ledger_json', 'archive_aware_by_design', 'Change ledger of stored facts, any scope.'),
  ('boxing_source_registry_json', 'archive_aware_by_design', 'Registry coverage counts rows of both scopes.'),
  -- identity, dedup and ingestion guards must see every bout or they would fail open
  ('boxing_add_bout', 'scope_agnostic_safe', 'Writer; scope is set by the caller and defaults to current.'),
  ('boxing_apply_card_change', 'scope_agnostic_safe', 'Card-change writer; append-only history.'),
  ('boxing_is_active_participant', 'scope_agnostic_safe', 'Participation predicate.'),
  ('boxing_bout_outcome_state', 'scope_agnostic_safe', 'Ingestion helper for the bout being written.'),
  ('boxing_bout_starts_at', 'scope_agnostic_safe', 'Pure timestamp helper.'),
  ('boxing_card_state', 'scope_agnostic_safe', 'Ingestion view of one card.'),
  ('boxing_possible_duplicate_bouts', 'scope_agnostic_safe', 'Duplicate detection must see archive rows or duplicates hide.'),
  ('boxing_identity_graph_context', 'scope_agnostic_safe', 'Identity resolution must see every appearance.'),
  ('boxing_fighter_candidate_json', 'scope_agnostic_safe', 'Identity candidate evidence.'),
  ('boxing_fighter_name_index', 'scope_agnostic_safe', 'Identity name keys.'),
  ('boxing_official_candidates', 'scope_agnostic_safe', 'Official identity evidence.'),
  ('boxing_official_cleanup_evidence', 'scope_agnostic_safe', 'Official cleanup evidence.'),
  ('boxing_record_provider_participant_identity', 'scope_agnostic_safe', 'Provider identity mapping guard.'),
  ('boxing_selection_fighter_guard', 'scope_agnostic_safe', 'Market selection guard.'),
  ('boxing_title_event_guard', 'scope_agnostic_safe', 'Title event guard checks the bout it is given.'),
  ('boxing_bout_completeness', 'scope_agnostic_safe', 'Completeness of one given bout.'),
  ('boxing_event_completeness', 'scope_agnostic_safe', 'Completeness of one given event.'),
  ('boxing_fighter_completeness', 'scope_agnostic_safe', 'Completeness of one given fighter.'),
  -- product surfaces: must exclude archive rows before any backfill is enabled
  ('boxing_site_home', 'pending_scope_review', 'Home page counts and features.'),
  ('boxing_site_events', 'pending_scope_review', 'Event directory.'),
  ('boxing_site_event', 'pending_scope_review', 'Event page.'),
  ('boxing_site_event_summary', 'pending_scope_review', 'Event summary block.'),
  ('boxing_site_event_timeline', 'pending_scope_review', 'Event timeline.'),
  ('boxing_site_cards_oriented', 'pending_scope_review', 'Card orientation helper.'),
  ('boxing_site_bout', 'pending_scope_review', 'Bout page.'),
  ('boxing_site_bout_compact', 'pending_scope_review', 'Compact bout block.'),
  ('boxing_site_bout_context', 'pending_scope_review', 'Bout context: previous meetings and officials.'),
  ('boxing_site_fighters', 'pending_scope_review', 'Fighter directory with records.'),
  ('boxing_site_fighter_bouts', 'pending_scope_review', 'Fighter bout list and derived record.'),
  ('boxing_site_participations', 'pending_scope_review', 'Participation lists.'),
  ('boxing_site_weight', 'pending_scope_review', 'Weight lane on site reads.'),
  ('boxing_site_coverage', 'pending_scope_review', 'Published coverage counts.'),
  ('boxing_site_history', 'pending_scope_review', 'History by decade.'),
  ('boxing_site_scorecards', 'pending_scope_review', 'Scorecard Center.'),
  ('boxing_site_scorecard', 'pending_scope_review', 'One scorecard page.'),
  ('boxing_site_officials', 'pending_scope_review', 'Official directory metrics.'),
  ('boxing_site_official', 'pending_scope_review', 'Official profile metrics.'),
  ('boxing_site_official_assignments', 'pending_scope_review', 'Official assignment list.'),
  ('boxing_site_promoters', 'pending_scope_review', 'Promoter directory.'),
  ('boxing_site_promoter', 'pending_scope_review', 'One promoter page.'),
  ('boxing_site_title_board', 'pending_scope_review', 'Title board.'),
  ('boxing_site_market_index', 'pending_scope_review', 'Odds index.'),
  ('boxing_site_video_card', 'pending_scope_review', 'Video card block.'),
  ('boxing_site_wire', 'pending_scope_review', 'Verified record wire.'),
  ('boxing_gateway_bout', 'pending_scope_review', 'Gateway bout read.'),
  ('boxing_gateway_official', 'pending_scope_review', 'Gateway official read.'),
  ('boxing_gateway_odds_summary', 'pending_scope_review', 'Gateway odds summary.'),
  ('boxing_commission_coverage', 'pending_scope_review', 'Commission coverage counts.'),
  ('boxing_market_bouts_in_window', 'pending_scope_review', 'Odds capture window.'),
  ('boxing_emit_news_event', 'pending_scope_review', 'Newsroom must never publish a historical row as news.'),
  ('boxing_news_context', 'pending_scope_review', 'Newsroom context.')
on conflict (function_name) do nothing;

create or replace function public.boxing_set_runtime_flag(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_flag text := p ->> 'flag';
  v_enabled boolean := coalesce((p ->> 'enabled')::boolean, false);
  v_pending int;
begin
  if v_flag is null then raise exception 'flag is required' using errcode = 'BX130'; end if;
  if v_flag = 'archive_scope_ingest' and v_enabled then
    select count(*) into v_pending from public.boxing_scope_consumers where classification = 'pending_scope_review';
    if v_pending > 0 then
      raise exception 'archive_scope_ingest refused: % consumers of the bout graph are still pending_scope_review', v_pending using errcode = 'BX131';
    end if;
  end if;
  insert into public.boxing_runtime_flags (flag, enabled, reason, decided_by)
  values (v_flag, v_enabled, p ->> 'reason', p ->> 'decided_by');
  return jsonb_build_object('flag', v_flag, 'enabled', v_enabled);
end $$;

create or replace function public.boxing_bout_scope_gate()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.model_scope = 'archive' and not public.boxing_flag_enabled('archive_scope_ingest') then
    raise exception 'archive_scope_disabled: a bout may not be written with model_scope=archive until the archive_scope_ingest flag is enabled'
      using errcode = 'BX132';
  end if;
  return new;
end $$;
drop trigger if exists boxing_bouts_scope_gate on public.boxing_bouts;
create trigger boxing_bouts_scope_gate before insert or update of model_scope on public.boxing_bouts
  for each row execute function public.boxing_bout_scope_gate();

-- a model declares the scopes it was built on; the model guard already freezes every column but status and calibration
alter table public.boxing_models add column if not exists model_scopes text[] not null default array['current']::text[];
do $$ begin
  perform public.boxing_ensure_constraint('public.boxing_models', 'boxing_models_scopes_check',
    'check (cardinality(model_scopes) between 1 and 2 and model_scopes <@ array[''current'',''archive'']::text[])');
end $$;

create or replace function public.boxing_model_scopes(p_model_key text, p_version text default null)
returns text[] language sql stable set search_path = '' as $$
  select m.model_scopes from public.boxing_models m
  where m.model_key = p_model_key and (p_version is null or m.version = p_version)
  order by m.registered_at desc limit 1
$$;

-- ---------------------------------------------------------------------------
-- Model boundary: same bodies as migration 0009, with the scope filter added.
--
-- The scoped versions take p_scopes WITHOUT a default, and the original signatures are re-created as thin wrappers that
-- pass {current}. That matters for two reasons:
--   * a defaulted parameter would make a call with the original arity ambiguous once migration 0009 re-creates its own
--     version (the chain must stay re-runnable), and
--   * any caller still using the original signature — including the intel engine — gets current scope, never the archive.
-- There is therefore no unfiltered path left, whatever arity a caller uses.
-- ---------------------------------------------------------------------------

create or replace function public.boxing_graph_record_before(p_fighter uuid, p_before timestamptz, p_cutoff timestamptz, p_scopes text[])
returns jsonb language sql stable set search_path = '' as $$
  with ids as (select f.id from public.boxing_fighters f where f.id = p_fighter or f.merged_into_id = p_fighter),
  rows as (
    select public.boxing_result_as_of(p.bout_id, p_cutoff) r
    from public.boxing_bout_participants p
    join public.boxing_bouts b on b.id = p.bout_id
    join public.boxing_events e on e.id = b.event_id
    where p.fighter_id in (select id from ids) and p.participant_status in ('scheduled','confirmed')
      and b.competition_class = 'professional' and b.model_scope = any(p_scopes)
      and coalesce(e.start_at, e.event_date::timestamptz) < least(p_before, p_cutoff)
  )
  select jsonb_build_object(
    'bouts', count(*) filter (where r is not null and r ->> 'outcome' <> 'unknown'),
    'wins', count(*) filter (where r ->> 'outcome' = 'win' and (r ->> 'winner_id')::uuid = p_fighter),
    'losses', count(*) filter (where r ->> 'outcome' = 'win' and (r ->> 'winner_id')::uuid <> p_fighter),
    'draws', count(*) filter (where r ->> 'outcome' = 'draw'))
  from rows
$$;

create or replace function public.boxing_fighter_history_as_of(p_fighter uuid, p_cutoff timestamptz, p_scopes text[])
returns jsonb language sql stable set search_path = '' as $$
  with me as (select public.boxing_canonical_fighter_id(p_fighter) as id),
  ids as (select f.id from public.boxing_fighters f, me where f.id = me.id or f.merged_into_id = me.id),
  mine as (
    select p.*, b.event_id, b.scheduled_rounds, b.round_minutes, b.competition_class, b.contracted_weight_lb,
           wc.class_key as weight_class_key, public.boxing_bout_starts_at(b.id) as starts_at, e.event_date, e.commission_id
    from public.boxing_bout_participants p
    join public.boxing_bouts b on b.id = p.bout_id
    join public.boxing_events e on e.id = b.event_id
    left join public.boxing_weight_classes wc on wc.id = b.weight_class_id
    where p.fighter_id in (select id from ids) and p.participant_status in ('scheduled','confirmed')
      and b.model_scope = any(p_scopes)
      and coalesce(e.start_at, e.event_date::timestamptz) < p_cutoff
  )
  select jsonb_build_object(
    'fighter', (select jsonb_build_object('id', f.id, 'public_id', f.public_id, 'display_name', f.display_name, 'dob', f.dob, 'sex', f.sex,
                                          'stance', f.stance, 'height_cm', f.height_cm, 'reach_cm', f.reach_cm) from public.boxing_fighters f, me where f.id = me.id),
    'input_cutoff', p_cutoff,
    'input_scopes', to_jsonb(p_scopes),
    'bouts', (select coalesce(jsonb_agg(x order by x ->> 'starts_at', x ->> 'bout_id'), '[]'::jsonb) from (
      select jsonb_build_object(
        'bout_id', m.bout_id, 'event_id', m.event_id, 'event_date', m.event_date, 'starts_at', m.starts_at, 'commission_id', m.commission_id,
        'competition_class', m.competition_class, 'scheduled_rounds', m.scheduled_rounds, 'round_minutes', m.round_minutes,
        'weight_class_key', m.weight_class_key, 'contracted_weight_lb', m.contracted_weight_lb, 'side', m.side,
        'record_entering_sourced', case when m.record_wins is not null and m.record_losses is not null
                                        then jsonb_build_object('wins', m.record_wins, 'losses', m.record_losses, 'draws', coalesce(m.record_draws, 0)) end,
        'title_fight', exists (select 1 from public.boxing_bout_titles bt where bt.bout_id = m.bout_id and bt.at_stake),
        'opponent', (select jsonb_build_object(
            'id', public.boxing_canonical_fighter_id(op.fighter_id), 'stance', of.stance,
            'record_entering_sourced', case when op.record_wins is not null and op.record_losses is not null
                                            then jsonb_build_object('wins', op.record_wins, 'losses', op.record_losses, 'draws', coalesce(op.record_draws, 0)) end,
            'record_entering_graph', public.boxing_graph_record_before(public.boxing_canonical_fighter_id(op.fighter_id), m.starts_at, p_cutoff, p_scopes))
          from public.boxing_bout_participants op join public.boxing_fighters of on of.id = op.fighter_id
          where op.bout_id = m.bout_id and op.side <> m.side and op.participant_status in ('scheduled','confirmed') limit 1),
        'result', public.boxing_result_as_of(m.bout_id, p_cutoff),
        'knockdowns', case when exists (select 1 from public.boxing_bout_stat_coverage c where c.bout_id = m.bout_id and c.stat_kind = 'knockdowns' and c.complete)
          then (select coalesce(jsonb_agg(jsonb_build_object('round', k.round, 'down_is_me', public.boxing_canonical_fighter_id(k.fighter_down_id) = (select id from me)) order by k.round), '[]'::jsonb)
                from public.boxing_bout_knockdowns k where k.bout_id = m.bout_id) end,
        -- one approved, completely covering source per bout (never summed across sources)
        'punch_stats', (select (select coalesce(jsonb_agg(jsonb_build_object('round', ps.round, 'is_me', public.boxing_canonical_fighter_id(ps.fighter_id) = (select id from me),
                  'total_landed', ps.total_landed, 'total_attempted', ps.total_attempted, 'jab_landed', ps.jab_landed, 'jab_attempted', ps.jab_attempted,
                  'power_landed', ps.power_landed, 'power_attempted', ps.power_attempted) order by ps.round, ps.fighter_id), '[]'::jsonb)
                from public.boxing_round_punch_stats ps
                where ps.bout_id = m.bout_id and ps.source_id = cov.source_id)
          from (select c.source_id from public.boxing_bout_stat_coverage c join public.boxing_sources s on s.id = c.source_id
                where c.bout_id = m.bout_id and c.stat_kind = 'punch_stats' and c.complete
                  and s.enabled and s.derivative_allowed and s.rights_state in ('internal','approved')
                order by s.source_key limit 1) cov),
        'scorecards', public.boxing_scorecards_as_of(m.bout_id, p_cutoff)
      ) x from mine m) y)
  )
$$;

create or replace function public.boxing_official_history_as_of(p_official uuid, p_cutoff timestamptz, p_scopes text[])
returns jsonb language sql stable set search_path = '' as $$
  with me as (select public.boxing_canonical_official_id(p_official) as id),
  ids as (select o.id from public.boxing_officials o, me where o.id = me.id or o.merged_into_id = me.id),
  -- the start time is joined rather than taken from boxing_bout_starts_at(): identical semantics, but the planner can use
  -- the scope and event indexes instead of calling a function once per bout in the graph
  bouts as (
    select distinct b.id as bout_id from public.boxing_bouts b
    join public.boxing_events e on e.id = b.event_id
    where coalesce(e.start_at, e.event_date::timestamptz) < p_cutoff and b.model_scope = any(p_scopes) and (
      exists (select 1 from public.boxing_bout_officials bo where bo.bout_id = b.id and bo.official_id in (select id from ids)
              and bo.role = 'referee' and bo.assignment_state in ('assigned','worked'))
      or exists (select 1 from public.boxing_scorecards s where s.bout_id = b.id and s.judge_id in (select id from ids)
                 and (s.revision = 1 or s.captured_at <= p_cutoff)))
  )
  select jsonb_build_object(
    'official', (select jsonb_build_object('id', o.id, 'public_id', o.public_id, 'display_name', o.display_name, 'official_type', o.official_type)
                 from public.boxing_officials o, me where o.id = me.id),
    'input_cutoff', p_cutoff,
    'input_scopes', to_jsonb(p_scopes),
    'bouts', (select coalesce(jsonb_agg(x order by x ->> 'starts_at', x ->> 'bout_id'), '[]'::jsonb) from (
      select jsonb_build_object(
        'bout_id', bb.bout_id, 'starts_at', public.boxing_bout_starts_at(bb.bout_id), 'scheduled_rounds', b.scheduled_rounds,
        'competition_class', b.competition_class, 'commission_id', e.commission_id,
        'commission', (select c.slug from public.boxing_commissions c where c.id = e.commission_id),
        'title_fight', exists (select 1 from public.boxing_bout_titles bt where bt.bout_id = bb.bout_id and bt.at_stake),
        'refereed', exists (select 1 from public.boxing_bout_officials bo where bo.bout_id = bb.bout_id and bo.official_id in (select id from ids)
                            and bo.role = 'referee' and bo.assignment_state in ('assigned','worked')),
        'result', public.boxing_result_as_of(bb.bout_id, p_cutoff),
        'point_deductions', (select count(*) from public.boxing_point_deductions d where d.bout_id = bb.bout_id),
        'scorecards', public.boxing_scorecards_as_of(bb.bout_id, p_cutoff)
      ) x
      from bouts bb join public.boxing_bouts b on b.id = bb.bout_id join public.boxing_events e on e.id = b.event_id) y)
  )
$$;

create or replace function public.boxing_matchup_inputs(p_bout uuid, p_scopes text[])
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'bout_id', b.id, 'status', b.status, 'starts_at', public.boxing_bout_starts_at(b.id), 'scheduled_rounds', b.scheduled_rounds,
    'input_scopes', to_jsonb(p_scopes),
    'weight_class_key', (select wc.class_key from public.boxing_weight_classes wc where wc.id = b.weight_class_id),
    'title_fight', exists (select 1 from public.boxing_bout_titles bt where bt.bout_id = b.id and bt.at_stake),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object('side', p.side, 'fighter_id', public.boxing_canonical_fighter_id(p.fighter_id)) order by p.side), '[]'::jsonb)
                     from public.boxing_bout_participants p where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')))
  from public.boxing_bouts b where b.id = p_bout and b.model_scope = any(p_scopes)
$$;

-- The original signatures, re-created as wrappers that pass current scope. Every caller that has not been taught about
-- scopes — including the intel engine — therefore reads the current graph and nothing else.
create or replace function public.boxing_graph_record_before(p_fighter uuid, p_before timestamptz, p_cutoff timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select public.boxing_graph_record_before(p_fighter, p_before, p_cutoff, array['current']::text[])
$$;

create or replace function public.boxing_fighter_history_as_of(p_fighter uuid, p_cutoff timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select public.boxing_fighter_history_as_of(p_fighter, p_cutoff, array['current']::text[])
$$;

create or replace function public.boxing_official_history_as_of(p_official uuid, p_cutoff timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select public.boxing_official_history_as_of(p_official, p_cutoff, array['current']::text[])
$$;

create or replace function public.boxing_matchup_inputs(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  select public.boxing_matchup_inputs(p_bout, array['current']::text[])
$$;

-- the proof surface
create or replace function public.boxing_model_scope_check()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'rule', 'pbe_model_scope@1',
    'archive_scope_ingest_enabled', public.boxing_flag_enabled('archive_scope_ingest'),
    'bouts_by_scope', (select coalesce(jsonb_object_agg(model_scope, n), '{}'::jsonb) from (select model_scope, count(*) n from public.boxing_bouts group by 1) x),
    'models', (select coalesce(jsonb_agg(jsonb_build_object('model_key', m.model_key, 'version', m.version, 'status', m.status, 'model_scopes', m.model_scopes)
        order by m.model_key, m.version), '[]'::jsonb) from public.boxing_models m),
    'models_opted_into_archive', (select count(*) from public.boxing_models where 'archive' = any(model_scopes)),
    'consumers', (select coalesce(jsonb_object_agg(classification, n), '{}'::jsonb) from (select classification, count(*) n from public.boxing_scope_consumers group by 1) x),
    'consumers_pending', (select coalesce(jsonb_agg(function_name order by function_name), '[]'::jsonb) from public.boxing_scope_consumers where classification = 'pending_scope_review'),
    'violations', jsonb_build_object(
      'archive_bouts_while_gate_disabled', case when public.boxing_flag_enabled('archive_scope_ingest') then 0
        else (select count(*) from public.boxing_bouts where model_scope = 'archive') end,
      'archive_bouts_in_current_scope_models', (select count(*) from public.boxing_models m where 'archive' = any(m.model_scopes) and m.status <> 'untrained')),
    'flag_history', (select coalesce(jsonb_agg(jsonb_build_object('flag', f.flag, 'enabled', f.enabled, 'decided_by', f.decided_by, 'recorded_at', f.recorded_at)
        order by f.recorded_at desc), '[]'::jsonb) from public.boxing_runtime_flags f))
$$;

select public.boxing_lockdown();

commit;
