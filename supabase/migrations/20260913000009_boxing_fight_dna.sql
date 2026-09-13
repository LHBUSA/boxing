-- PropBetEdge Boxing — Fight DNA, officials intelligence, matchup snapshots,
-- model registry (issue #6)
--
-- Derived intelligence only. Nothing here writes a canonical fact table, and
-- no canonical table references these tables.
--
-- Point-in-time rule (used by every *_as_of function):
--   * a bout is history iff it started before the cutoff
--   * result revision 1 is known at fight time; a later revision (amendment,
--     overturn) is known only from coalesce(decided_at, captured_at)
--   * scorecard revision 1 is known at fight time; a correction only from
--     its captured_at
--   * in-fight facts (knockdowns, punch stats, point deductions) and their
--     coverage describe what happened in the bout, so they are known at fight
--     time even when recorded later (backfill stays usable for backtests)
-- so a snapshot for cutoff T can never see information from after T.
-- Rerunnable.

begin;

-- ---------------------------------------------------------------------------
-- Source-only stat facts with explicit coverage (absence is never zero)
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_bout_knockdowns (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references public.boxing_bouts(id) on delete restrict,
  fighter_down_id uuid not null references public.boxing_fighters(id) on delete restrict,
  round int not null check (round between 1 and 45),
  time_sec int check (time_sec is null or time_sec between 0 and 300),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  captured_at timestamptz not null default now(),
  foreign key (bout_id, fighter_down_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict
);
create index if not exists boxing_bout_knockdowns_bout_idx on public.boxing_bout_knockdowns (bout_id);
select public.boxing_install_append_only('public.boxing_bout_knockdowns');

-- A bout's knockdowns / punch stats / round scores only count when a source
-- declared its data for that bout COMPLETE. No coverage row = unknown.
create table if not exists public.boxing_bout_stat_coverage (
  bout_id uuid not null references public.boxing_bouts(id) on delete restrict,
  stat_kind text not null check (stat_kind in ('knockdowns','punch_stats')),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  complete boolean not null,
  note text,
  captured_at timestamptz not null default now(),
  primary key (bout_id, stat_kind, source_id)
);
select public.boxing_install_append_only('public.boxing_bout_stat_coverage');

-- ---------------------------------------------------------------------------
-- Metric definitions: required inputs, subject, category; frozen per version
-- ---------------------------------------------------------------------------

alter table public.boxing_metric_definitions
  add column if not exists subject_kind text not null default 'fighter',
  add column if not exists category text,
  add column if not exists required_inputs text[] not null default '{}',
  add column if not exists source_requirements jsonb not null default '{}'::jsonb,
  add column if not exists label text not null default 'pbe_derived',
  add column if not exists unit text;
alter table public.boxing_metric_definitions drop constraint if exists boxing_metric_definitions_subject_check;
alter table public.boxing_metric_definitions add constraint boxing_metric_definitions_subject_check
  check (subject_kind in ('fighter','official','matchup'));
alter table public.boxing_metric_definitions drop constraint if exists boxing_metric_definitions_label_check;
alter table public.boxing_metric_definitions add constraint boxing_metric_definitions_label_check check (label = 'pbe_derived');
select public.boxing_ensure_constraint('public.boxing_metric_definitions', 'boxing_metric_definitions_subject_key',
  'unique (metric_key, version, subject_kind)');

-- Registration is idempotent for an identical definition and REFUSES a
-- changed definition under an existing version.
create or replace function public.boxing_register_metric_definition(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  d public.boxing_metric_definitions%rowtype;
  v_inputs text[] := coalesce((select array_agg(x order by x) from jsonb_array_elements_text(coalesce(p -> 'required_inputs', '[]'::jsonb)) x), '{}');
begin
  select * into d from public.boxing_metric_definitions where metric_key = p ->> 'metric_key' and version = p ->> 'version';
  if found then
    if d.name is distinct from p ->> 'name' or d.description is distinct from p ->> 'description'
       or d.formula_text is distinct from p ->> 'formula_text' or d.value_kind is distinct from p ->> 'value_kind'
       or d.minimum_sample is distinct from coalesce(p -> 'minimum_sample', '{}'::jsonb)
       or d.subject_kind is distinct from p ->> 'subject_kind' or d.category is distinct from p ->> 'category'
       or (select array_agg(x order by x) from unnest(d.required_inputs) x) is distinct from nullif(v_inputs, '{}')
       or d.source_requirements is distinct from coalesce(p -> 'source_requirements', '{}'::jsonb) then
      raise exception 'metric_definition_changed_without_version_bump: %@%', d.metric_key, d.version using errcode = 'BX100';
    end if;
    return jsonb_build_object('status', 'unchanged');
  end if;
  insert into public.boxing_metric_definitions
    (metric_key, version, name, description, formula_text, minimum_sample, value_kind, subject_kind, category, required_inputs, source_requirements, unit)
  values (p ->> 'metric_key', p ->> 'version', p ->> 'name', p ->> 'description', p ->> 'formula_text',
          coalesce(p -> 'minimum_sample', '{}'::jsonb), p ->> 'value_kind', p ->> 'subject_kind', p ->> 'category', v_inputs,
          coalesce(p -> 'source_requirements', '{}'::jsonb), p ->> 'unit');
  return jsonb_build_object('status', 'registered');
end $$;

-- ---------------------------------------------------------------------------
-- Computation runs
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_intel_runs (
  id uuid primary key default gen_random_uuid(),
  run_kind text not null check (run_kind in ('fighter_dna','official_dna','matchup_snapshot')),
  engine_version text not null,
  input_cutoff timestamptz not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','ok','failed')),
  subjects int not null default 0,
  snapshots_written int not null default 0,
  metrics jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Metric snapshots: status + sample context; value only when available
-- ---------------------------------------------------------------------------

do $$
declare t text; c record;
begin
  foreach t in array array['boxing_fighter_metric_snapshots','boxing_official_metric_snapshots'] loop
    execute format('alter table public.%I
      add column if not exists status text not null default %L,
      add column if not exists sample_context jsonb not null default %L::jsonb,
      add column if not exists inputs_hash text,
      add column if not exists engine_version text,
      add column if not exists computation_run_id uuid references public.boxing_intel_runs(id) on delete restrict', t, 'available', '{}');
    -- replace the (subject, key, version, as_of) uniqueness: a later recompute
    -- for the same cutoff with different inputs is kept, not overwritten
    for c in select conname from pg_constraint where conrelid = format('public.%I', t)::regclass and contype = 'u'
               and pg_get_constraintdef(oid) ~ 'metric_version, as_of\)$' loop
      execute format('alter table public.%I drop constraint %I', t, c.conname);
    end loop;
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_status_check');
    execute format('alter table public.%I add constraint %I check (status in (''available'',''insufficient_sample'',''source_unavailable'',''not_applicable''))', t, t || '_status_check');
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_value_status_check');
    execute format('alter table public.%I add constraint %I check (status = ''available'' or (value_number is null and value_text is null and value_json is null))', t, t || '_value_status_check');
  end loop;
end $$;
select public.boxing_ensure_constraint('public.boxing_fighter_metric_snapshots', 'boxing_fighter_metric_snapshots_point_key',
  'unique nulls not distinct (fighter_id, metric_key, metric_version, as_of, inputs_hash)');
select public.boxing_ensure_constraint('public.boxing_official_metric_snapshots', 'boxing_official_metric_snapshots_point_key',
  'unique nulls not distinct (official_id, metric_key, metric_version, as_of, inputs_hash)');

-- subject kind is enforced declaratively through the definition FK
alter table public.boxing_fighter_metric_snapshots add column if not exists subject_kind text not null default 'fighter' check (subject_kind = 'fighter');
alter table public.boxing_official_metric_snapshots add column if not exists subject_kind text not null default 'official' check (subject_kind = 'official');
select public.boxing_ensure_constraint('public.boxing_fighter_metric_snapshots', 'boxing_fighter_metric_snapshots_definition_kind_fkey',
  'foreign key (metric_key, metric_version, subject_kind) references public.boxing_metric_definitions(metric_key, version, subject_kind) on delete restrict');
select public.boxing_ensure_constraint('public.boxing_official_metric_snapshots', 'boxing_official_metric_snapshots_definition_kind_fkey',
  'foreign key (metric_key, metric_version, subject_kind) references public.boxing_metric_definitions(metric_key, version, subject_kind) on delete restrict');
select public.boxing_ensure_constraint('public.boxing_official_metric_snapshots', 'boxing_official_metric_snapshots_definition_fkey',
  'foreign key (metric_key, metric_version) references public.boxing_metric_definitions(metric_key, version) on delete restrict');

-- ---------------------------------------------------------------------------
-- Matchup snapshots: explicit cutoff, versions, hash
-- ---------------------------------------------------------------------------

alter table public.boxing_matchup_snapshots
  add column if not exists input_cutoff timestamptz,
  add column if not exists metric_versions jsonb not null default '{}'::jsonb,
  add column if not exists inputs_hash text,
  add column if not exists engine_version text,
  add column if not exists computation_run_id uuid references public.boxing_intel_runs(id) on delete restrict;
update public.boxing_matchup_snapshots set input_cutoff = as_of where input_cutoff is null;
alter table public.boxing_matchup_snapshots alter column input_cutoff set not null;
alter table public.boxing_matchup_snapshots drop constraint if exists boxing_matchup_snapshots_cutoff_check;
alter table public.boxing_matchup_snapshots add constraint boxing_matchup_snapshots_cutoff_check check (as_of = input_cutoff);
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.boxing_matchup_snapshots'::regclass and contype = 'u'
             and pg_get_constraintdef(oid) = 'UNIQUE (bout_id, model_key, model_version, as_of)' loop
    execute format('alter table public.boxing_matchup_snapshots drop constraint %I', c.conname);
  end loop;
end $$;
select public.boxing_ensure_constraint('public.boxing_matchup_snapshots', 'boxing_matchup_snapshots_point_key',
  'unique nulls not distinct (bout_id, model_key, model_version, input_cutoff, inputs_hash)');
select public.boxing_ensure_constraint('public.boxing_matchup_snapshots', 'boxing_matchup_snapshots_id_bout_key', 'unique (id, bout_id)');

-- ---------------------------------------------------------------------------
-- Model registry and outputs (no output without a trained, registered model)
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_models (
  model_key text not null,
  version text not null,
  name text not null,
  description text not null,
  target text not null check (target in ('bout_winner','method_of_victory','goes_distance','total_rounds')),
  feature_model_key text not null,
  feature_model_version text not null,
  training_cutoff timestamptz,
  training_window jsonb,
  training_sample_size int check (training_sample_size is null or training_sample_size >= 0),
  status text not null check (status in ('untrained','trained','validated','retired')),
  unavailable_reason text,
  calibration jsonb,
  registered_at timestamptz not null default now(),
  primary key (model_key, version),
  check (status <> 'untrained' or unavailable_reason is not null),
  check (status not in ('trained','validated') or (training_cutoff is not null and coalesce(training_sample_size, 0) > 0)),
  check (status <> 'validated' or calibration is not null)
);
drop trigger if exists boxing_models_guard on public.boxing_models;
create trigger boxing_models_guard before update or delete on public.boxing_models
  for each row execute function public.boxing_guard_mutable_columns('status', 'calibration');

create or replace function public.boxing_model_status_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then return new; end if;
  -- training produces a NEW version; an untrained registration cannot become trained
  if not ((old.status = 'trained' and new.status in ('validated','retired'))
          or (old.status = 'validated' and new.status = 'retired')
          or (old.status = 'untrained' and new.status = 'retired')) then
    raise exception 'model_status_transition_invalid: % -> % (train a new version instead)', old.status, new.status using errcode = 'BX110';
  end if;
  return new;
end $$;
drop trigger if exists boxing_models_status_guard on public.boxing_models;
create trigger boxing_models_status_guard before update of status on public.boxing_models
  for each row execute function public.boxing_model_status_guard();

insert into public.boxing_models (model_key, version, name, description, target, feature_model_key, feature_model_version, status, unavailable_reason)
values ('pbe_bout_winner', '0.1.0', 'PBE bout winner', 'Registered architecture only. No probabilities are produced until a model is trained on a legitimate point-in-time historical set.',
        'bout_winner', 'pbe_matchup_dna', '1.0.0', 'untrained',
        'No licensed career-record history, no approved result feed and no captured odds history yet; training now would manufacture probabilities.')
on conflict do nothing;

create table if not exists public.boxing_model_outputs (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  model_version text not null,
  bout_id uuid not null references public.boxing_bouts(id) on delete restrict,
  matchup_snapshot_id uuid not null,
  feature_model_version text not null,
  input_cutoff timestamptz not null,
  selection_key text not null check (selection_key in ('fighter_a','fighter_b','draw')),
  probability numeric(10,8) not null check (probability > 0 and probability < 1),
  fair_decimal numeric(12,6) not null check (fair_decimal > 1),
  fair_american int not null check (fair_american <= -100 or fair_american >= 100),
  calibration jsonb,
  generated_at timestamptz not null default now(),
  foreign key (model_key, model_version) references public.boxing_models(model_key, version) on delete restrict,
  foreign key (matchup_snapshot_id, bout_id) references public.boxing_matchup_snapshots(id, bout_id) on delete restrict,
  unique (model_key, model_version, matchup_snapshot_id, selection_key),
  check (abs(fair_decimal - round(1 / probability, 6)) <= 0.000002),
  check (fair_american = case when probability >= 0.5 then -round(100 * probability / (1 - probability))
                              else round(100 * (1 - probability) / probability) end)
);
select public.boxing_install_append_only('public.boxing_model_outputs');

create or replace function public.boxing_model_output_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  m public.boxing_models%rowtype;
  s public.boxing_matchup_snapshots%rowtype;
begin
  select * into m from public.boxing_models where model_key = new.model_key and version = new.model_version;
  if m.status not in ('trained','validated') then
    raise exception 'model_not_trained: %@% is %', new.model_key, new.model_version, m.status using errcode = 'BX111';
  end if;
  select * into s from public.boxing_matchup_snapshots where id = new.matchup_snapshot_id;
  if s.model_key <> m.feature_model_key or s.model_version <> m.feature_model_version or new.feature_model_version <> s.model_version then
    raise exception 'model_feature_version_mismatch: model expects %@%, snapshot is %@%',
      m.feature_model_key, m.feature_model_version, s.model_key, s.model_version using errcode = 'BX112';
  end if;
  if new.input_cutoff <> s.input_cutoff then
    raise exception 'model_output_cutoff_mismatch' using errcode = 'BX112';
  end if;
  if m.training_cutoff > s.input_cutoff then
    raise exception 'model_trained_after_snapshot_cutoff: training cutoff % is after input cutoff % (leakage)', m.training_cutoff, s.input_cutoff
      using errcode = 'BX113';
  end if;
  return new;
end $$;
drop trigger if exists boxing_model_outputs_guard on public.boxing_model_outputs;
create trigger boxing_model_outputs_guard before insert on public.boxing_model_outputs
  for each row execute function public.boxing_model_output_guard();

-- ---------------------------------------------------------------------------
-- Point-in-time history
-- ---------------------------------------------------------------------------

create or replace function public.boxing_canonical_official_id(p_id uuid)
returns uuid language sql stable set search_path = '' as $$
  select coalesce(o.merged_into_id, o.id) from public.boxing_officials o where o.id = p_id
$$;

create or replace function public.boxing_bout_starts_at(p_bout uuid)
returns timestamptz language sql stable set search_path = '' as $$
  select coalesce(e.start_at, e.event_date::timestamptz) from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id where b.id = p_bout
$$;

create or replace function public.boxing_result_as_of(p_bout uuid, p_cutoff timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select to_jsonb(x) from (
    select r.id, r.outcome, public.boxing_canonical_fighter_id(r.winner_id) as winner_id, r.method, r.decision_type, r.round, r.time_sec,
           r.revision, r.result_state
    from public.boxing_bout_results r
    where r.bout_id = p_bout and public.boxing_bout_starts_at(p_bout) < p_cutoff
      and (r.revision = 1 or coalesce(r.decided_at, r.captured_at) <= p_cutoff)
    order by r.revision desc limit 1) x
$$;

create or replace function public.boxing_scorecards_as_of(p_bout uuid, p_cutoff timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'scorecard_id', c.id, 'judge_id', public.boxing_canonical_official_id(c.judge_id), 'scorer_role', c.scorer_role, 'revision', c.revision,
      'fighter_a_id', public.boxing_canonical_fighter_id(c.fighter_a_id), 'fighter_b_id', public.boxing_canonical_fighter_id(c.fighter_b_id),
      'a_total', c.fighter_a_total, 'b_total', c.fighter_b_total,
      'rounds', (select coalesce(jsonb_agg(jsonb_build_object('round', sr.round, 'a', sr.fighter_a_points, 'b', sr.fighter_b_points) order by sr.round), '[]'::jsonb)
                 from public.boxing_scorecard_rounds sr where sr.scorecard_id = c.id))
    order by c.judge_id), '[]'::jsonb)
  from (select distinct on (s.judge_id) s.* from public.boxing_scorecards s
        where s.bout_id = p_bout and public.boxing_bout_starts_at(p_bout) < p_cutoff
          and (s.revision = 1 or s.captured_at <= p_cutoff)
        order by s.judge_id, s.revision desc) c
$$;

-- Graph record of a set of fighter ids from bouts that started before
-- p_before, using results known at p_cutoff.
create or replace function public.boxing_graph_record_before(p_fighter uuid, p_before timestamptz, p_cutoff timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  with ids as (select f.id from public.boxing_fighters f where f.id = p_fighter or f.merged_into_id = p_fighter),
  rows as (
    select public.boxing_result_as_of(p.bout_id, p_cutoff) r
    from public.boxing_bout_participants p join public.boxing_bouts b on b.id = p.bout_id
    where p.fighter_id in (select id from ids) and p.participant_status in ('scheduled','confirmed')
      and b.competition_class = 'professional' and public.boxing_bout_starts_at(p.bout_id) < least(p_before, p_cutoff)
  )
  select jsonb_build_object(
    'bouts', count(*) filter (where r is not null and r ->> 'outcome' <> 'unknown'),
    'wins', count(*) filter (where r ->> 'outcome' = 'win' and (r ->> 'winner_id')::uuid = p_fighter),
    'losses', count(*) filter (where r ->> 'outcome' = 'win' and (r ->> 'winner_id')::uuid <> p_fighter),
    'draws', count(*) filter (where r ->> 'outcome' = 'draw'))
  from rows
$$;

create or replace function public.boxing_fighter_history_as_of(p_fighter uuid, p_cutoff timestamptz)
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
      and public.boxing_bout_starts_at(b.id) < p_cutoff
  )
  select jsonb_build_object(
    'fighter', (select jsonb_build_object('id', f.id, 'public_id', f.public_id, 'display_name', f.display_name, 'dob', f.dob, 'sex', f.sex,
                                          'stance', f.stance, 'height_cm', f.height_cm, 'reach_cm', f.reach_cm) from public.boxing_fighters f, me where f.id = me.id),
    'input_cutoff', p_cutoff,
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
            'record_entering_graph', public.boxing_graph_record_before(public.boxing_canonical_fighter_id(op.fighter_id), m.starts_at, p_cutoff))
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

create or replace function public.boxing_official_history_as_of(p_official uuid, p_cutoff timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  with me as (select public.boxing_canonical_official_id(p_official) as id),
  ids as (select o.id from public.boxing_officials o, me where o.id = me.id or o.merged_into_id = me.id),
  bouts as (
    select distinct b.id as bout_id from public.boxing_bouts b
    where public.boxing_bout_starts_at(b.id) < p_cutoff and (
      exists (select 1 from public.boxing_bout_officials bo where bo.bout_id = b.id and bo.official_id in (select id from ids)
              and bo.role = 'referee' and bo.assignment_state in ('assigned','worked'))
      or exists (select 1 from public.boxing_scorecards s where s.bout_id = b.id and s.judge_id in (select id from ids)
                 and (s.revision = 1 or s.captured_at <= p_cutoff)))
  )
  select jsonb_build_object(
    'official', (select jsonb_build_object('id', o.id, 'public_id', o.public_id, 'display_name', o.display_name, 'official_type', o.official_type)
                 from public.boxing_officials o, me where o.id = me.id),
    'input_cutoff', p_cutoff,
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

create or replace function public.boxing_matchup_inputs(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'bout_id', b.id, 'status', b.status, 'starts_at', public.boxing_bout_starts_at(b.id), 'scheduled_rounds', b.scheduled_rounds,
    'weight_class_key', (select wc.class_key from public.boxing_weight_classes wc where wc.id = b.weight_class_id),
    'title_fight', exists (select 1 from public.boxing_bout_titles bt where bt.bout_id = b.id and bt.at_stake),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object('side', p.side, 'fighter_id', public.boxing_canonical_fighter_id(p.fighter_id)) order by p.side), '[]'::jsonb)
                     from public.boxing_bout_participants p where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')))
  from public.boxing_bouts b where b.id = p_bout
$$;

-- ---------------------------------------------------------------------------
-- Writes
-- ---------------------------------------------------------------------------

create or replace function public.boxing_write_metric_snapshots(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  r jsonb;
  v_written int := 0;
  v_id uuid;
  v_table text := case p ->> 'subject_kind' when 'official' then 'boxing_official_metric_snapshots' else 'boxing_fighter_metric_snapshots' end;
  v_subject_col text := case p ->> 'subject_kind' when 'official' then 'official_id' else 'fighter_id' end;
begin
  for r in select * from jsonb_array_elements(coalesce(p -> 'rows', '[]'::jsonb)) loop
    v_id := null;
    if v_table = 'boxing_fighter_metric_snapshots' then
      insert into public.boxing_fighter_metric_snapshots
        (fighter_id, metric_key, metric_version, as_of, value_number, value_text, value_json, sample_size, confidence, inputs_digest,
         status, sample_context, inputs_hash, engine_version, computation_run_id)
      values (public.boxing_canonical_fighter_id((p ->> 'subject_id')::uuid), r ->> 'metric_key', r ->> 'metric_version', (p ->> 'input_cutoff')::timestamptz,
              nullif(r ->> 'value_number', '')::numeric, r ->> 'value_text', case when r -> 'value_json' = 'null'::jsonb then null else r -> 'value_json' end,
              nullif(r ->> 'sample_size', '')::int, nullif(r ->> 'confidence', '')::numeric, coalesce(p -> 'inputs_digest', '{}'::jsonb),
              r ->> 'status', coalesce(r -> 'sample_context', '{}'::jsonb), p ->> 'inputs_hash', p ->> 'engine_version', nullif(p ->> 'run_id', '')::uuid)
      on conflict do nothing returning id into v_id;
    else
      insert into public.boxing_official_metric_snapshots
        (official_id, metric_key, metric_version, as_of, value_number, value_text, value_json, sample_size, inputs_digest,
         status, sample_context, inputs_hash, engine_version, computation_run_id)
      values (public.boxing_canonical_official_id((p ->> 'subject_id')::uuid), r ->> 'metric_key', r ->> 'metric_version', (p ->> 'input_cutoff')::timestamptz,
              nullif(r ->> 'value_number', '')::numeric, r ->> 'value_text', case when r -> 'value_json' = 'null'::jsonb then null else r -> 'value_json' end,
              coalesce(nullif(r ->> 'sample_size', '')::int, 0), coalesce(p -> 'inputs_digest', '{}'::jsonb),
              r ->> 'status', coalesce(r -> 'sample_context', '{}'::jsonb), p ->> 'inputs_hash', p ->> 'engine_version', nullif(p ->> 'run_id', '')::uuid)
      on conflict do nothing returning id into v_id;
    end if;
    if v_id is not null then v_written := v_written + 1; end if;
  end loop;
  return jsonb_build_object('written', v_written, 'table', v_table, 'subject_column', v_subject_col);
end $$;

-- A matchup snapshot describes what was knowable BEFORE the bout: a cutoff
-- after the bout started would let the bout's own result leak in.
create or replace function public.boxing_matchup_cutoff_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_start timestamptz := public.boxing_bout_starts_at(new.bout_id);
begin
  if v_start is not null and new.input_cutoff > v_start then
    raise exception 'matchup_cutoff_after_bout_start: cutoff % is after bout start %', new.input_cutoff, v_start using errcode = 'BX120';
  end if;
  return new;
end $$;
drop trigger if exists boxing_matchup_snapshots_cutoff_guard on public.boxing_matchup_snapshots;
create trigger boxing_matchup_snapshots_cutoff_guard before insert on public.boxing_matchup_snapshots
  for each row execute function public.boxing_matchup_cutoff_guard();

create or replace function public.boxing_write_matchup_snapshot(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.boxing_matchup_snapshots
    (bout_id, model_key, model_version, as_of, input_cutoff, fighter_a_id, fighter_b_id, features, outputs, inputs_digest,
     metric_versions, inputs_hash, engine_version, computation_run_id)
  values ((p ->> 'bout_id')::uuid, p ->> 'model_key', p ->> 'model_version', (p ->> 'input_cutoff')::timestamptz, (p ->> 'input_cutoff')::timestamptz,
          (p ->> 'fighter_a_id')::uuid, (p ->> 'fighter_b_id')::uuid, p -> 'features', '{}'::jsonb, coalesce(p -> 'inputs_digest', '{}'::jsonb),
          coalesce(p -> 'metric_versions', '{}'::jsonb), p ->> 'inputs_hash', p ->> 'engine_version', nullif(p ->> 'run_id', '')::uuid)
  on conflict do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.boxing_matchup_snapshots
    where bout_id = (p ->> 'bout_id')::uuid and model_key = p ->> 'model_key' and model_version = p ->> 'model_version'
      and input_cutoff = (p ->> 'input_cutoff')::timestamptz and inputs_hash is not distinct from (p ->> 'inputs_hash');
    return jsonb_build_object('status', 'unchanged', 'snapshot_id', v_id);
  end if;
  return jsonb_build_object('status', 'created', 'snapshot_id', v_id);
end $$;

create or replace function public.boxing_start_intel_run(p_kind text, p_engine text, p_cutoff timestamptz)
returns uuid language sql set search_path = '' as $$
  insert into public.boxing_intel_runs (run_kind, engine_version, input_cutoff) values (p_kind, p_engine, p_cutoff) returning id
$$;

create or replace function public.boxing_finish_intel_run(p_run uuid, p_status text, p_subjects int, p_written int, p_metrics jsonb)
returns void language sql set search_path = '' as $$
  update public.boxing_intel_runs set status = p_status, subjects = p_subjects, snapshots_written = p_written, metrics = p_metrics, finished_at = now()
  where id = p_run
$$;

-- latest snapshot per metric key/version for a subject (reads for the gateway)
create or replace function public.boxing_fighter_dna_latest(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('metric_key', s.metric_key, 'metric_version', s.metric_version, 'as_of', s.as_of, 'status', s.status,
      'value_number', s.value_number, 'value_text', s.value_text, 'value_json', s.value_json, 'sample_size', s.sample_size,
      'sample_context', s.sample_context, 'generated_at', s.created_at, 'category', d.category, 'name', d.name, 'unit', d.unit, 'label', d.label)
    order by d.category, s.metric_key, s.metric_version), '[]'::jsonb)
  from (select distinct on (metric_key, metric_version) * from public.boxing_fighter_metric_snapshots
        where fighter_id = public.boxing_canonical_fighter_id(p_fighter) order by metric_key, metric_version, as_of desc, created_at desc) s
  join public.boxing_metric_definitions d on d.metric_key = s.metric_key and d.version = s.metric_version and d.subject_kind = s.subject_kind
$$;

create or replace function public.boxing_official_dna_latest(p_official uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('metric_key', s.metric_key, 'metric_version', s.metric_version, 'as_of', s.as_of, 'status', s.status,
      'value_number', s.value_number, 'value_text', s.value_text, 'value_json', s.value_json, 'sample_size', s.sample_size,
      'sample_context', s.sample_context, 'generated_at', s.created_at, 'category', d.category, 'name', d.name, 'unit', d.unit, 'label', d.label)
    order by d.category, s.metric_key, s.metric_version), '[]'::jsonb)
  from (select distinct on (metric_key, metric_version) * from public.boxing_official_metric_snapshots
        where official_id = public.boxing_canonical_official_id(p_official) order by metric_key, metric_version, as_of desc, created_at desc) s
  join public.boxing_metric_definitions d on d.metric_key = s.metric_key and d.version = s.metric_version and d.subject_kind = s.subject_kind
$$;

-- ---------------------------------------------------------------------------
-- Read-only gateway reads (PART 8). Stable functions; no writes.
-- ---------------------------------------------------------------------------

create or replace function public.boxing_gateway_bout(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'bout_id', b.id, 'public_id', b.public_id, 'status', b.status, 'starts_at', public.boxing_bout_starts_at(b.id),
    'bout_order', b.bout_order, 'card_segment', b.card_segment, 'competition_class', b.competition_class,
    'scheduled_rounds', b.scheduled_rounds, 'round_minutes', b.round_minutes,
    'weight_class_key', (select wc.class_key from public.boxing_weight_classes wc where wc.id = b.weight_class_id),
    'contracted_weight_lb', b.contracted_weight_lb, 'is_catchweight', b.is_catchweight,
    'event', (select jsonb_build_object('event_id', e.id, 'public_id', e.public_id, 'name', e.name, 'event_date', e.event_date, 'status', e.status,
                                       'commission_slug', (select c.slug from public.boxing_commissions c where c.id = e.commission_id))
              from public.boxing_events e where e.id = b.event_id),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object('side', p.side, 'status', p.participant_status,
                        'fighter_id', f.id, 'display_name', f.display_name, 'public_id', f.public_id,
                        'record_entering', case when p.record_wins is not null then jsonb_build_object('wins', p.record_wins, 'losses', p.record_losses,
                                                'draws', p.record_draws, 'no_contests', p.record_no_contests) end) order by p.side, p.participant_status), '[]'::jsonb)
                     from public.boxing_bout_participants p join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(p.fighter_id)
                     where p.bout_id = b.id),
    'titles', (select coalesce(jsonb_agg(jsonb_build_object('title_id', bt.title_id, 'organization_slug', o.slug, 'tier', t.tier,
                                                           'at_stake', bt.at_stake, 'status', bt.status) order by o.slug, t.tier), '[]'::jsonb)
               from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join public.boxing_organizations o on o.id = t.organization_id
               where bt.bout_id = b.id),
    'result', (select jsonb_build_object('outcome', r.outcome, 'winner_id', public.boxing_canonical_fighter_id(r.winner_id), 'method', r.method,
                                         'decision_type', r.decision_type, 'round', r.round, 'time_sec', r.time_sec, 'revision', r.revision,
                                         'result_state', r.result_state)
               from public.boxing_bout_results_current r where r.bout_id = b.id),
    'scorecards', (select coalesce(jsonb_agg(jsonb_build_object('scorecard_id', s.id, 'slot', s.slot, 'judge_id', public.boxing_canonical_official_id(s.judge_id),
                                                               'scorer_role', s.scorer_role, 'fighter_a_id', public.boxing_canonical_fighter_id(s.fighter_a_id),
                                                               'fighter_b_id', public.boxing_canonical_fighter_id(s.fighter_b_id),
                                                               'a_total', s.fighter_a_total, 'b_total', s.fighter_b_total, 'revision', s.revision, 'card_state', s.card_state)
                                              order by s.slot nulls last, s.judge_id), '[]'::jsonb)
                   from public.boxing_scorecards_current s where s.bout_id = b.id),
    'officials', (select coalesce(jsonb_agg(jsonb_build_object('official_id', o.id, 'display_name', o.display_name,
                                                              'role', bo.role, 'slot', bo.slot, 'state', bo.assignment_state) order by bo.role, bo.slot nulls last), '[]'::jsonb)
                  from public.boxing_bout_officials bo join public.boxing_officials o on o.id = public.boxing_canonical_official_id(bo.official_id)
                  where bo.bout_id = b.id),
    'weigh_ins', (select coalesce(jsonb_agg(jsonb_build_object('fighter_id', public.boxing_canonical_fighter_id(w.fighter_id), 'kind', w.weigh_in_kind,
                                                              'attempt_no', w.attempt_no, 'official_weight_lb', w.official_weight_lb, 'status', w.status,
                                                              'verification_state', w.verification_state, 'weighed_at', w.weighed_at, 'revision', w.revision)
                                             order by w.weighed_at nulls last, w.attempt_no), '[]'::jsonb)
                  from public.boxing_weigh_ins w where w.bout_id = b.id
                    and not exists (select 1 from public.boxing_weigh_ins x where x.supersedes_id = w.id))
  )
  from public.boxing_bouts b where b.id = p_bout
$$;

create or replace function public.boxing_gateway_official(p_official uuid)
returns jsonb language sql stable set search_path = '' as $$
  with me as (select o.id from public.boxing_officials o where o.id = public.boxing_canonical_official_id(p_official)),
  ids as (select o.id from public.boxing_officials o, me where o.id = me.id or o.merged_into_id = me.id)
  select case when not exists (select 1 from me) then null else jsonb_build_object(
    'official', (select jsonb_build_object('id', o.id, 'public_id', o.public_id, 'display_name', o.display_name, 'official_type', o.official_type,
                                          'country_code', o.country_code, 'identity_state', o.identity_state)
                 from public.boxing_officials o, me where o.id = me.id),
    'requested_id', p_official,
    'assignment_counts', (select coalesce(jsonb_object_agg(c.role, c.n), '{}'::jsonb) from (
        select bo.role, count(*) n from public.boxing_bout_officials bo where bo.official_id in (select id from ids)
          and bo.assignment_state in ('assigned','worked') group by bo.role) c),
    'recent_assignments', (select coalesce(jsonb_agg(r.x order by r.starts_at desc), '[]'::jsonb) from (
        select public.boxing_bout_starts_at(bo.bout_id) as starts_at,
               jsonb_build_object('bout_id', bo.bout_id, 'event_name', e.name, 'event_date', e.event_date, 'starts_at', public.boxing_bout_starts_at(bo.bout_id),
                                  'role', bo.role, 'slot', bo.slot, 'state', bo.assignment_state) x
        from public.boxing_bout_officials bo join public.boxing_bouts b on b.id = bo.bout_id join public.boxing_events e on e.id = b.event_id
        where bo.official_id in (select id from ids)
        order by 1 desc nulls last limit 25) r)
  ) end
$$;

create or replace function public.boxing_gateway_matchup(p_bout uuid, p_limit integer default 5)
returns jsonb language sql stable set search_path = '' as $$
  select case when not exists (select 1 from public.boxing_bouts where id = p_bout) then null else jsonb_build_object(
    'bout', public.boxing_matchup_inputs(p_bout),
    'snapshots', (select coalesce(jsonb_agg(q.x order by q.input_cutoff desc, q.created_at desc), '[]'::jsonb) from (
        select s.input_cutoff, s.created_at,
               jsonb_build_object('snapshot_id', s.id, 'model_key', s.model_key, 'model_version', s.model_version, 'input_cutoff', s.input_cutoff,
                                  'generated_at', s.created_at, 'inputs_hash', s.inputs_hash, 'engine_version', s.engine_version,
                                  'fighter_a_id', s.fighter_a_id, 'fighter_b_id', s.fighter_b_id, 'metric_versions', s.metric_versions, 'features', s.features) x
        from public.boxing_matchup_snapshots s where s.bout_id = p_bout
        order by s.input_cutoff desc, s.created_at desc limit greatest(1, least(coalesce(p_limit, 5), 50))) q),
    'model_outputs', (select coalesce(jsonb_agg(jsonb_build_object('model_key', m.model_key, 'model_version', m.model_version, 'matchup_snapshot_id', m.matchup_snapshot_id,
                                                                  'feature_model_version', m.feature_model_version, 'input_cutoff', m.input_cutoff,
                                                                  'selection_key', m.selection_key, 'probability', m.probability, 'fair_decimal', m.fair_decimal,
                                                                  'fair_american', m.fair_american, 'calibration', m.calibration, 'generated_at', m.generated_at)
                                                 order by m.generated_at desc, m.selection_key), '[]'::jsonb)
                      from public.boxing_model_outputs m where m.bout_id = p_bout)
  ) end
$$;

create or replace function public.boxing_gateway_models()
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('model_key', m.model_key, 'version', m.version, 'name', m.name, 'target', m.target,
      'feature_model_key', m.feature_model_key, 'feature_model_version', m.feature_model_version, 'training_cutoff', m.training_cutoff,
      'training_sample_size', m.training_sample_size, 'status', m.status, 'unavailable_reason', m.unavailable_reason,
      'calibration', m.calibration, 'registered_at', m.registered_at) order by m.model_key, m.version), '[]'::jsonb)
  from public.boxing_models m
$$;

create or replace function public.boxing_gateway_odds_summary(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  select case when not exists (select 1 from public.boxing_bouts where id = p_bout) then null else jsonb_build_object(
    'bout_id', p_bout,
    'consensus', (select coalesce(jsonb_agg(to_jsonb(c) - 'bout_id' order by c.market_key, c.selection_key), '[]'::jsonb)
                  from public.boxing_market_consensus c where c.bout_id = p_bout),
    'selections', (select coalesce(jsonb_agg(jsonb_build_object('market_key', sp.market_key, 'market_type', sp.market_type, 'line', sp.line, 'is_live', sp.is_live,
                       'bookmaker', sp.bookmaker, 'provider', sp.provider, 'selection_key', sp.selection_key,
                       'fighter_id', public.boxing_canonical_fighter_id(sp.fighter_id),
                       'opening_american', sp.opening_american, 'opening_at', sp.opening_at, 'current_american', sp.current_american,
                       'current_implied', sp.current_implied, 'latest_at', sp.latest_at, 'closing_american', sp.closing_american,
                       'closing_at', sp.closing_at, 'tick_count', sp.tick_count, 'freshness', sp.freshness)
                     order by sp.market_key, sp.bookmaker, sp.selection_key), '[]'::jsonb)
                   from public.boxing_market_selection_prices sp where sp.bout_id = p_bout),
    'fair_prices', (select coalesce(jsonb_agg(jsonb_build_object('model_key', m.model_key, 'model_version', m.model_version, 'selection_key', m.selection_key,
                        'probability', m.probability, 'fair_decimal', m.fair_decimal, 'fair_american', m.fair_american,
                        'input_cutoff', m.input_cutoff, 'generated_at', m.generated_at) order by m.model_key, m.model_version, m.selection_key), '[]'::jsonb)
                    from (select distinct on (o.model_key, o.model_version, o.selection_key) o.* from public.boxing_model_outputs o
                          where o.bout_id = p_bout order by o.model_key, o.model_version, o.selection_key, o.input_cutoff desc, o.generated_at desc) m)
  ) end
$$;

select public.boxing_lockdown();

commit;
