-- PropBetEdge Boxing — events, card history, officials, results, scorecards,
-- weigh-ins and public regulatory actions (issue #3)
--
-- Current card state stays queryable in the normal tables; every change to it
-- is ALSO appended to boxing_card_changes (before/after + provenance), so the
-- card can be reconstructed as it stood at any time. Replaced boxers keep
-- their participant row (status 'replaced'): nothing that referenced them is
-- orphaned and history is never rewritten as though they were never booked.
-- Rerunnable.

begin;

-- ---------------------------------------------------------------------------
-- Participants: replacement / withdrawal without erasing history
-- ---------------------------------------------------------------------------

alter table public.boxing_bout_participants
  add column if not exists participant_status text not null default 'scheduled',
  add column if not exists replaced_by_fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  add column if not exists status_changed_at timestamptz;
alter table public.boxing_bout_participants drop constraint if exists boxing_bout_participants_status_check;
alter table public.boxing_bout_participants add constraint boxing_bout_participants_status_check
  check (participant_status in ('scheduled','confirmed','replaced','withdrawn'));
alter table public.boxing_bout_participants drop constraint if exists boxing_bout_participants_bout_id_side_key;
create unique index if not exists boxing_bout_participants_active_side
  on public.boxing_bout_participants (bout_id, side) where participant_status in ('scheduled','confirmed');

create or replace function public.boxing_is_active_participant(p_bout uuid, p_fighter uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.boxing_bout_participants p
                 where p.bout_id = p_bout and p.fighter_id = p_fighter and p.participant_status in ('scheduled','confirmed'))
$$;

-- Results, scorecards, weigh-ins' official side and title events may only name
-- a boxer who is (still) in the bout. A replaced boxer's earlier weigh-in stays
-- valid, so weigh-ins are only checked for new rows of an active bout slot.
create or replace function public.boxing_active_participant_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_fighters uuid[];
  v_row jsonb;
  f uuid;
begin
  -- NEW is read through jsonb: PL/pgSQL resolves every CASE branch, so direct
  -- NEW.<column> references would fail on tables without that column.
  v_row := to_jsonb(new);
  v_fighters := case tg_table_name
    when 'boxing_bout_results' then array[(v_row ->> 'winner_id')::uuid]
    when 'boxing_scorecards' then array[(v_row ->> 'fighter_a_id')::uuid, (v_row ->> 'fighter_b_id')::uuid]
    else array[(v_row ->> 'fighter_id')::uuid] end;
  foreach f in array v_fighters loop
    if f is not null and (v_row ->> 'bout_id') is not null and not public.boxing_is_active_participant((v_row ->> 'bout_id')::uuid, f) then
      raise exception 'participant_not_active: % is not an active participant of bout %', f, v_row ->> 'bout_id' using errcode = 'BX080';
    end if;
  end loop;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['boxing_bout_results','boxing_scorecards','boxing_point_deductions','boxing_title_events'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_active_participant', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.boxing_active_participant_guard()',
                   t || '_active_participant', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Bouts, titles at stake, card segments
-- ---------------------------------------------------------------------------

alter table public.boxing_bouts add column if not exists card_segment text;
alter table public.boxing_bouts drop constraint if exists boxing_bouts_card_segment_check;
alter table public.boxing_bouts add constraint boxing_bouts_card_segment_check
  check (card_segment is null or card_segment in ('main_event','co_main','main_card','undercard','prelims','unknown'));

alter table public.boxing_bout_titles
  add column if not exists at_stake boolean not null default true,
  add column if not exists eligible_fighter_id uuid,
  add column if not exists status_changed_at timestamptz,
  add column if not exists source_url text;
select public.boxing_ensure_constraint('public.boxing_bout_titles', 'boxing_bout_titles_eligible_participant_fkey',
  'foreign key (bout_id, eligible_fighter_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict');
comment on column public.boxing_bout_titles.eligible_fighter_id is
  'Set ONLY from a source stating that just one boxer can win the title (e.g. champion missed weight). Never inferred.';

-- Title events must also respect "no longer at stake" and single eligibility.
create or replace function public.boxing_title_at_stake_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_bt public.boxing_bout_titles%rowtype;
begin
  if new.bout_id is not null and new.event_type in ('won','defended') then
    select * into v_bt from public.boxing_bout_titles where bout_id = new.bout_id and title_id = new.title_id;
    if found and not v_bt.at_stake then
      raise exception 'title_not_at_stake: title % was removed from bout % before it took place', new.title_id, new.bout_id
        using errcode = 'BX081';
    end if;
    if found and v_bt.eligible_fighter_id is not null and v_bt.eligible_fighter_id <> new.fighter_id then
      raise exception 'title_ineligible: only % could win title % in bout %', v_bt.eligible_fighter_id, new.title_id, new.bout_id
        using errcode = 'BX082';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists boxing_title_events_at_stake on public.boxing_title_events;
create trigger boxing_title_events_at_stake before insert on public.boxing_title_events
  for each row execute function public.boxing_title_at_stake_guard();

-- ---------------------------------------------------------------------------
-- Append-only card change log
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_card_changes (
  id bigserial primary key,
  event_id uuid not null references public.boxing_events(id) on delete restrict,
  bout_id uuid references public.boxing_bouts(id) on delete restrict,
  change_type text not null check (change_type in (
    'event_announced','event_date_changed','event_postponed','event_cancelled','event_status_changed',
    'venue_changed','commission_changed','organization_role_added','organization_role_removed',
    'bout_added','bout_cancelled','bout_postponed','bout_status_changed','opponent_replaced','participant_withdrawn',
    'card_order_changed','card_segment_changed','scheduled_rounds_changed','contracted_weight_changed','weight_class_changed',
    'title_added','title_removed','title_eligibility_changed',
    'official_assigned','official_replaced','official_removed')),
  before_state jsonb,
  after_state jsonb,
  effective_at timestamptz,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  change_key text not null unique,
  detected_at timestamptz not null default now()
);
create index if not exists boxing_card_changes_event_idx on public.boxing_card_changes (event_id, detected_at);
create index if not exists boxing_card_changes_bout_idx on public.boxing_card_changes (bout_id, detected_at);
select public.boxing_install_append_only('public.boxing_card_changes');

-- ---------------------------------------------------------------------------
-- Officials: canonical identity, retrieval keys, assignment history
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_official_name_keys (
  id bigserial primary key,
  official_id uuid not null references public.boxing_officials(id) on delete restrict,
  key text not null check (key ~ '^(full|sorted|skel|joined|part|init|nick):'),
  unique (official_id, key)
);
create index if not exists boxing_official_name_keys_key_idx on public.boxing_official_name_keys (key);

create table if not exists public.boxing_official_review_queue (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  namespace text,
  raw_external_id text,
  raw_name text not null,
  raw_country_code text,
  commission_id uuid references public.boxing_commissions(id) on delete restrict,
  candidates jsonb not null default '[]'::jsonb,
  reason text not null,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  dedupe_key text not null,
  status text not null default 'pending' check (status in ('pending','resolved','rejected')),
  resolved_official_id uuid references public.boxing_officials(id) on delete restrict,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists boxing_official_review_pending_dedupe
  on public.boxing_official_review_queue (dedupe_key) where status = 'pending';

alter table public.boxing_bout_officials
  add column if not exists assignment_state text not null default 'assigned',
  add column if not exists replaced_by_official_id uuid references public.boxing_officials(id) on delete restrict,
  add column if not exists assigned_at timestamptz not null default now(),
  add column if not exists state_changed_at timestamptz,
  add column if not exists observation_id uuid references public.boxing_source_observations(id) on delete restrict;
alter table public.boxing_bout_officials drop constraint if exists boxing_bout_officials_state_check;
alter table public.boxing_bout_officials add constraint boxing_bout_officials_state_check
  check (assignment_state in ('assigned','worked','replaced','withdrawn'));
create unique index if not exists boxing_bout_officials_active_slot
  on public.boxing_bout_officials (bout_id, role, slot) where assignment_state in ('assigned','worked') and slot is not null;
create unique index if not exists boxing_bout_officials_one_referee
  on public.boxing_bout_officials (bout_id) where role = 'referee' and assignment_state in ('assigned','worked');

-- A scorecard's scorer must be an assigned (or worked) official of that bout
-- in the matching role.
create or replace function public.boxing_scorecard_scorer_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.boxing_bout_officials bo
    where bo.bout_id = new.bout_id and bo.official_id = new.judge_id
      and bo.role = case when new.scorer_role = 'referee' then 'referee' else 'judge' end
      and bo.assignment_state in ('assigned','worked')) then
    raise exception 'scorer_not_assigned: official % is not an active % of bout %', new.judge_id, new.scorer_role, new.bout_id
      using errcode = 'BX083';
  end if;
  return new;
end $$;
drop trigger if exists boxing_scorecards_scorer_guard on public.boxing_scorecards;
create trigger boxing_scorecards_scorer_guard before insert on public.boxing_scorecards
  for each row execute function public.boxing_scorecard_scorer_guard();

-- ---------------------------------------------------------------------------
-- Public regulatory actions: versioned, public-source only
-- ---------------------------------------------------------------------------

alter table public.boxing_regulatory_actions
  add column if not exists official_id uuid references public.boxing_officials(id) on delete restrict,
  add column if not exists revision int not null default 1,
  add column if not exists supersedes_id uuid references public.boxing_regulatory_actions(id) on delete restrict,
  add column if not exists observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  add column if not exists action_key text;
update public.boxing_regulatory_actions set action_key = id::text where action_key is null;
alter table public.boxing_regulatory_actions alter column action_key set not null;
select public.boxing_ensure_constraint('public.boxing_regulatory_actions', 'boxing_regulatory_actions_action_key', 'unique (action_key)');
alter table public.boxing_regulatory_actions drop constraint if exists boxing_regulatory_actions_public_source_check;
alter table public.boxing_regulatory_actions add constraint boxing_regulatory_actions_public_source_check
  check (source_url is not null and source_url ~ '^https?://');
alter table public.boxing_regulatory_actions drop constraint if exists boxing_regulatory_actions_subject_check;
alter table public.boxing_regulatory_actions add constraint boxing_regulatory_actions_subject_check
  check ((fighter_id is not null) or (official_id is not null));
alter table public.boxing_regulatory_actions drop constraint if exists boxing_regulatory_actions_reason_length_check;
alter table public.boxing_regulatory_actions add constraint boxing_regulatory_actions_reason_length_check
  check (reason_public is null or length(reason_public) <= 280);
alter table public.boxing_regulatory_actions drop constraint if exists boxing_regulatory_actions_revision_check;
alter table public.boxing_regulatory_actions add constraint boxing_regulatory_actions_revision_check
  check (revision >= 1 and ((revision = 1) = (supersedes_id is null)));
create unique index if not exists boxing_regulatory_actions_single_successor
  on public.boxing_regulatory_actions (supersedes_id) where supersedes_id is not null;
select public.boxing_install_append_only('public.boxing_regulatory_actions');
comment on column public.boxing_regulatory_actions.reason_public is
  'Only the reason as published by the commission (<=280 chars). Never diagnoses, test results, medical detail or non-public personal data.';

-- ---------------------------------------------------------------------------
-- Existing readers: only ACTIVE participants count as "in the bout"
-- ---------------------------------------------------------------------------

create or replace function public.boxing_market_bouts_in_window(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'bout_id', b.id, 'event_id', e.id, 'status', b.status,
      'starts_at', coalesce(e.start_at, e.event_date::timestamptz),
      'participants', (select jsonb_agg(jsonb_build_object('fighter_id', p.fighter_id, 'side', p.side, 'display_name', f.display_name) order by p.side)
                       from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id
                       where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')))
    order by b.id), '[]'::jsonb)
  from public.boxing_bouts b
  join public.boxing_events e on e.id = b.event_id
  where b.status in ('announced','scheduled','in_progress')
    and e.status not in ('cancelled','postponed')
    and coalesce(e.start_at, e.event_date::timestamptz) between p_from and p_to
    and (select count(*) from public.boxing_bout_participants p
         where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')) = 2
$$;

create or replace function public.boxing_selection_fighter_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.fighter_id is not null and not exists (
    select 1 from public.boxing_markets m
    join public.boxing_bout_participants p on p.bout_id = m.bout_id and p.fighter_id = new.fighter_id
      and p.participant_status in ('scheduled','confirmed')
    where m.id = new.market_id) then
    raise exception 'selection_fighter_not_in_bout: fighter % is not an active participant of market %', new.fighter_id, new.market_id
      using errcode = 'BX050';
  end if;
  return new;
end $$;

create or replace function public.boxing_fighter_candidate_json(p_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', f.id,
    'public_id', f.public_id,
    'display_name', f.display_name,
    'dob', f.dob,
    'sex', f.sex,
    'stance', f.stance,
    'height_cm', f.height_cm,
    'reach_cm', f.reach_cm,
    'hometown', f.hometown,
    'identity_state', f.identity_state,
    'nationalities', (
      select coalesce(jsonb_agg(distinct n), '[]'::jsonb) from (
        select upper(f.nationality) as n where f.nationality is not null
        union
        select upper(c.value #>> '{}') from public.boxing_fighter_attribute_claims c
        where c.fighter_id = f.id and c.attribute = 'nationality') x),
    'division_keys', (
      select coalesce(jsonb_agg(distinct d), '[]'::jsonb) from (
        select c.value #>> '{}' as d from public.boxing_fighter_attribute_claims c
        where c.fighter_id = f.id and c.attribute = 'division'
        union
        select wc.class_key from public.boxing_bout_participants p
        join public.boxing_bouts b on b.id = p.bout_id
        join public.boxing_weight_classes wc on wc.id = b.weight_class_id
        where p.fighter_id = f.id and p.participant_status in ('scheduled','confirmed')) x),
    'aliases', (
      select coalesce(jsonb_agg(jsonb_build_object('alias', a.alias, 'kind', a.kind, 'verification_state', a.verification_state)
                                order by a.created_at), '[]'::jsonb)
      from public.boxing_fighter_aliases a where a.fighter_id = f.id),
    'identities', (
      select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'external_id', i.external_id,
                                                   'verification_state', i.verification_state) order by i.namespace, i.external_id), '[]'::jsonb)
      from public.boxing_fighter_identities i where i.fighter_id = f.id),
    'bouts', (
      select coalesce(jsonb_agg(x order by x->>'date' desc), '[]'::jsonb) from (
        select jsonb_build_object('bout_id', b.id, 'date', e.event_date, 'opponent_id', op.fighter_id,
                                  'opponent_name', of.display_name, 'weight_class', wc.class_key) as x
        from public.boxing_bout_participants p
        join public.boxing_bouts b on b.id = p.bout_id
        join public.boxing_events e on e.id = b.event_id
        left join public.boxing_bout_participants op on op.bout_id = b.id and op.fighter_id <> p.fighter_id
          and op.participant_status in ('scheduled','confirmed')
        left join public.boxing_fighters of on of.id = op.fighter_id
        left join public.boxing_weight_classes wc on wc.id = b.weight_class_id
        where p.fighter_id = f.id and p.participant_status in ('scheduled','confirmed')
        order by e.event_date desc nulls last
        limit 25) y)
  )
  from public.boxing_fighters f where f.id = p_id
$$;

-- ---------------------------------------------------------------------------
-- Card state + atomic change application
-- ---------------------------------------------------------------------------

create or replace function public.boxing_card_state(p_event uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'event_id', e.id, 'public_id', e.public_id, 'name', e.name, 'event_date', e.event_date, 'start_at', e.start_at,
    'status', e.status, 'venue_id', e.venue_id, 'commission_id', e.commission_id,
    'commission_slug', (select c.slug from public.boxing_commissions c where c.id = e.commission_id),
    'organizations', (select coalesce(jsonb_agg(jsonb_build_object('slug', o.slug, 'role', eo.role, 'organization_id', o.id) order by eo.role, o.slug), '[]'::jsonb)
                      from public.boxing_event_organizations eo join public.boxing_organizations o on o.id = eo.organization_id
                      where eo.event_id = e.id),
    'bouts', (select coalesce(jsonb_agg(jsonb_build_object(
        'bout_id', b.id, 'public_id', b.public_id, 'status', b.status, 'bout_order', b.bout_order, 'card_segment', b.card_segment,
        'scheduled_rounds', b.scheduled_rounds, 'contracted_weight_lb', b.contracted_weight_lb, 'is_catchweight', b.is_catchweight,
        'weight_class_key', (select wc.class_key from public.boxing_weight_classes wc where wc.id = b.weight_class_id),
        'external_ids', (select coalesce(jsonb_agg(bi.namespace || ':' || bi.external_id), '[]'::jsonb) from public.boxing_bout_identities bi
                         where bi.bout_id = b.id and bi.verification_state <> 'rejected'),
        'participants', (select coalesce(jsonb_agg(jsonb_build_object('fighter_id', p.fighter_id, 'side', p.side, 'status', p.participant_status,
                                                                     'display_name', f.display_name) order by p.side, p.participant_status), '[]'::jsonb)
                         from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id where p.bout_id = b.id),
        'titles', (select coalesce(jsonb_agg(jsonb_build_object('title_id', bt.title_id, 'at_stake', bt.at_stake,
                                                               'eligible_fighter_id', bt.eligible_fighter_id) order by bt.title_id), '[]'::jsonb)
                   from public.boxing_bout_titles bt where bt.bout_id = b.id),
        'officials', (select coalesce(jsonb_agg(jsonb_build_object('official_id', bo.official_id, 'role', bo.role, 'slot', bo.slot,
                                                                  'state', bo.assignment_state, 'display_name', o.display_name) order by bo.role, bo.slot), '[]'::jsonb)
                      from public.boxing_bout_officials bo join public.boxing_officials o on o.id = bo.official_id where bo.bout_id = b.id)
      ) order by b.bout_order nulls last, b.id), '[]'::jsonb)
      from public.boxing_bouts b where b.event_id = e.id)
  )
  from public.boxing_events e where e.id = p_event
$$;

-- Applies one computed card change: mutates current state AND appends the
-- change log row, in one transaction. Idempotent on change_key.
create or replace function public.boxing_apply_card_change(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_type text := p ->> 'change_type';
  v_event uuid := (p ->> 'event_id')::uuid;
  v_bout uuid := nullif(p ->> 'bout_id', '')::uuid;
  a jsonb := coalesce(p -> 'after_state', '{}'::jsonb);
  v_id bigint;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  if exists (select 1 from public.boxing_card_changes where change_key = p ->> 'change_key') then
    return jsonb_build_object('applied', false, 'reason', 'duplicate');
  end if;

  if v_type = 'event_date_changed' or v_type = 'event_postponed' then
    update public.boxing_events set event_date = nullif(a ->> 'event_date', '')::date, start_at = nullif(a ->> 'start_at', '')::timestamptz,
      status = coalesce(a ->> 'status', status) where id = v_event;
  elsif v_type in ('event_cancelled','event_status_changed') then
    update public.boxing_events set status = a ->> 'status' where id = v_event;
  elsif v_type = 'venue_changed' then
    update public.boxing_events set venue_id = nullif(a ->> 'venue_id', '')::uuid where id = v_event;
  elsif v_type = 'commission_changed' then
    update public.boxing_events set commission_id = nullif(a ->> 'commission_id', '')::uuid where id = v_event;
  elsif v_type = 'organization_role_added' then
    insert into public.boxing_event_organizations (event_id, organization_id, role, source_id, source_url)
    values (v_event, (a ->> 'organization_id')::uuid, a ->> 'role', v_src, p ->> 'source_url') on conflict do nothing;
  elsif v_type = 'organization_role_removed' then
    delete from public.boxing_event_organizations
    where event_id = v_event and organization_id = (a ->> 'organization_id')::uuid and role = a ->> 'role';
  elsif v_type = 'bout_added' then
    null; -- the bout row and participants are inserted by boxing_add_bout before the change is logged
  elsif v_type in ('bout_cancelled','bout_postponed','bout_status_changed') then
    update public.boxing_bouts set status = a ->> 'status' where id = v_bout;
  elsif v_type = 'opponent_replaced' then
    update public.boxing_bout_participants set participant_status = 'replaced',
      replaced_by_fighter_id = (a ->> 'fighter_id')::uuid, status_changed_at = now()
    where bout_id = v_bout and fighter_id = (p #>> '{before_state,fighter_id}')::uuid and participant_status in ('scheduled','confirmed');
    insert into public.boxing_bout_participants (bout_id, fighter_id, side, participant_status, source_id, source_url)
    values (v_bout, (a ->> 'fighter_id')::uuid, a ->> 'side', 'scheduled', v_src, p ->> 'source_url');
  elsif v_type = 'participant_withdrawn' then
    update public.boxing_bout_participants set participant_status = 'withdrawn', status_changed_at = now()
    where bout_id = v_bout and fighter_id = (p #>> '{before_state,fighter_id}')::uuid and participant_status in ('scheduled','confirmed');
  elsif v_type = 'card_order_changed' then
    update public.boxing_bouts set bout_order = nullif(a ->> 'bout_order', '')::int where id = v_bout;
  elsif v_type = 'card_segment_changed' then
    update public.boxing_bouts set card_segment = a ->> 'card_segment' where id = v_bout;
  elsif v_type = 'scheduled_rounds_changed' then
    update public.boxing_bouts set scheduled_rounds = nullif(a ->> 'scheduled_rounds', '')::int where id = v_bout;
  elsif v_type = 'contracted_weight_changed' then
    update public.boxing_bouts set contracted_weight_lb = nullif(a ->> 'contracted_weight_lb', '')::numeric,
      is_catchweight = nullif(a ->> 'is_catchweight', '')::boolean where id = v_bout;
  elsif v_type = 'weight_class_changed' then
    update public.boxing_bouts set weight_class_id = (select id from public.boxing_weight_classes where class_key = a ->> 'weight_class_key') where id = v_bout;
  elsif v_type = 'title_added' then
    insert into public.boxing_bout_titles (bout_id, title_id, status, source_id, source_url, at_stake)
    values (v_bout, (a ->> 'title_id')::uuid, 'contested', v_src, p ->> 'source_url', true)
    on conflict (bout_id, title_id) do update set at_stake = true, status_changed_at = now();
  elsif v_type = 'title_removed' then
    update public.boxing_bout_titles set at_stake = false, status_changed_at = now()
    where bout_id = v_bout and title_id = (a ->> 'title_id')::uuid;
  elsif v_type = 'title_eligibility_changed' then
    update public.boxing_bout_titles set eligible_fighter_id = nullif(a ->> 'eligible_fighter_id', '')::uuid, status_changed_at = now()
    where bout_id = v_bout and title_id = (a ->> 'title_id')::uuid;
  elsif v_type = 'official_assigned' then
    insert into public.boxing_bout_officials (bout_id, official_id, role, slot, source_id, source_url, assignment_state)
    values (v_bout, (a ->> 'official_id')::uuid, a ->> 'role', nullif(a ->> 'slot', '')::int, v_src, p ->> 'source_url', 'assigned')
    on conflict (bout_id, official_id, role) do update set assignment_state = 'assigned', state_changed_at = now();
  elsif v_type = 'official_replaced' then
    update public.boxing_bout_officials set assignment_state = 'replaced', replaced_by_official_id = (a ->> 'official_id')::uuid,
      state_changed_at = now()
    where bout_id = v_bout and official_id = (p #>> '{before_state,official_id}')::uuid and role = a ->> 'role';
    insert into public.boxing_bout_officials (bout_id, official_id, role, slot, source_id, source_url, assignment_state)
    values (v_bout, (a ->> 'official_id')::uuid, a ->> 'role', nullif(a ->> 'slot', '')::int, v_src, p ->> 'source_url', 'assigned')
    on conflict (bout_id, official_id, role) do update set assignment_state = 'assigned', state_changed_at = now();
  elsif v_type = 'official_removed' then
    update public.boxing_bout_officials set assignment_state = 'withdrawn', state_changed_at = now()
    where bout_id = v_bout and official_id = (p #>> '{before_state,official_id}')::uuid and role = p #>> '{before_state,role}';
  end if;

  insert into public.boxing_card_changes
    (event_id, bout_id, change_type, before_state, after_state, effective_at, source_id, source_url, observation_id, change_key)
  values (v_event, v_bout, v_type, p -> 'before_state', p -> 'after_state', nullif(p ->> 'effective_at', '')::timestamptz,
          v_src, p ->> 'source_url', nullif(p ->> 'observation_id', '')::uuid, p ->> 'change_key')
  returning id into v_id;
  return jsonb_build_object('applied', true, 'change_id', v_id);
end $$;

-- Inserts a bout with its two corners (used for bout_added).
create or replace function public.boxing_add_bout(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_bout uuid;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  insert into public.boxing_bouts (event_id, source_id, weight_class_id, contracted_weight_lb, is_catchweight, scheduled_rounds,
                                   round_minutes, competition_class, bout_order, card_segment, status, source_url)
  values ((p ->> 'event_id')::uuid, v_src, (select id from public.boxing_weight_classes where class_key = p ->> 'weight_class_key'),
          nullif(p ->> 'contracted_weight_lb', '')::numeric, nullif(p ->> 'is_catchweight', '')::boolean,
          nullif(p ->> 'scheduled_rounds', '')::int, nullif(p ->> 'round_minutes', '')::int,
          coalesce(p ->> 'competition_class', 'professional'), nullif(p ->> 'bout_order', '')::int, p ->> 'card_segment',
          coalesce(p ->> 'status', 'scheduled'), p ->> 'source_url')
  returning id into v_bout;
  insert into public.boxing_bout_participants (bout_id, fighter_id, side, source_id, source_url)
  values (v_bout, (p ->> 'fighter_a_id')::uuid, 'a', v_src, p ->> 'source_url'),
         (v_bout, (p ->> 'fighter_b_id')::uuid, 'b', v_src, p ->> 'source_url');
  if nullif(p ->> 'external_namespace', '') is not null then
    insert into public.boxing_bout_identities (bout_id, source_id, namespace, external_id, verification_state, confidence)
    values (v_bout, v_src, p ->> 'external_namespace', p ->> 'external_id', 'verified', 100)
    on conflict (namespace, external_id) where verification_state <> 'rejected' do nothing;
  end if;
  return v_bout;
end $$;

-- Creates (or finds by namespace id) an event from a card document.
create or replace function public.boxing_upsert_event(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_event uuid;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  select event_id into v_event from public.boxing_event_identities
  where namespace = p ->> 'namespace' and external_id = p ->> 'external_id' and verification_state <> 'rejected';
  if v_event is not null then return jsonb_build_object('event_id', v_event, 'created', false); end if;
  insert into public.boxing_events (source_id, external_event_id, name, event_date, start_at, status, source_url)
  values (v_src, p ->> 'external_id', p ->> 'name', nullif(p ->> 'event_date', '')::date, nullif(p ->> 'start_at', '')::timestamptz,
          coalesce(p ->> 'status', 'scheduled'), p ->> 'source_url')
  returning id into v_event;
  insert into public.boxing_event_identities (event_id, source_id, namespace, external_id, verification_state, confidence)
  values (v_event, v_src, p ->> 'namespace', p ->> 'external_id', 'verified', 100);
  return jsonb_build_object('event_id', v_event, 'created', true);
end $$;

-- ---------------------------------------------------------------------------
-- Officials resolution support
-- ---------------------------------------------------------------------------

create or replace function public.boxing_official_candidates(p_keys text[], p_namespace text, p_external_id text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'mapped', (select jsonb_build_object('id', o.id, 'display_name', o.display_name, 'country_code', o.country_code)
               from public.boxing_official_identities i join public.boxing_officials o on o.id = coalesce(
                 (select merged_into_id from public.boxing_officials m where m.id = i.official_id), i.official_id)
               where i.namespace = p_namespace and i.external_id = p_external_id and i.verification_state <> 'rejected'),
    'candidates', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'display_name', o.display_name, 'country_code', o.country_code, 'official_type', o.official_type,
        'commission_ids', (select coalesce(jsonb_agg(distinct e.commission_id), '[]'::jsonb)
                           from public.boxing_bout_officials bo join public.boxing_bouts b on b.id = bo.bout_id
                           join public.boxing_events e on e.id = b.event_id
                           where bo.official_id = o.id and e.commission_id is not null),
        'identities', (select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'external_id', i.external_id)), '[]'::jsonb)
                       from public.boxing_official_identities i where i.official_id = o.id and i.verification_state <> 'rejected'))
      order by o.id), '[]'::jsonb)
      from public.boxing_officials o
      where o.identity_state <> 'merged' and exists (select 1 from public.boxing_official_name_keys k where k.official_id = o.id and k.key = any (p_keys)))
  )
$$;

create or replace function public.boxing_apply_official_decision(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  d jsonb := p -> 'decision';
  i jsonb := p -> 'identity';
  v_official uuid;
  v_review uuid;
  k text;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  if d ->> 'outcome' = 'created' then
    insert into public.boxing_officials (display_name, normalized_name, country_code, official_type, identity_state)
    values (i ->> 'display_name', p ->> 'normalized_name', i ->> 'country_code', coalesce(i ->> 'official_type', 'other'), 'source_native')
    returning id into v_official;
  elsif d ->> 'outcome' = 'matched' then
    v_official := (d ->> 'official_id')::uuid;
  end if;
  if v_official is not null then
    if nullif(i ->> 'external_id', '') is not null then
      insert into public.boxing_official_identities (official_id, source_id, namespace, external_id, confidence, verification_state, evidence)
      values (v_official, v_src, i ->> 'namespace', i ->> 'external_id', coalesce((d ->> 'confidence')::smallint, 0),
              coalesce(d ->> 'verification_state', 'probable'), coalesce(d -> 'evidence', '{}'::jsonb))
      on conflict (namespace, external_id) where verification_state <> 'rejected' do nothing;
    end if;
    for k in select jsonb_array_elements_text(coalesce(p -> 'keys', '[]'::jsonb)) loop
      insert into public.boxing_official_name_keys (official_id, key) values (v_official, k) on conflict do nothing;
    end loop;
    return jsonb_build_object('outcome', d ->> 'outcome', 'official_id', v_official);
  end if;
  insert into public.boxing_official_review_queue
    (source_id, namespace, raw_external_id, raw_name, raw_country_code, commission_id, candidates, reason, dedupe_key)
  values (v_src, i ->> 'namespace', i ->> 'external_id', i ->> 'display_name', i ->> 'country_code',
          nullif(i ->> 'commission_id', '')::uuid, coalesce(d -> 'candidates', '[]'::jsonb), coalesce(d ->> 'reason', 'review'),
          (p ->> 'source_key') || '|' || coalesce(i ->> 'namespace', '-') || '|' || coalesce(i ->> 'external_id', i ->> 'display_name'))
  on conflict (dedupe_key) where status = 'pending' do nothing
  returning id into v_review;
  return jsonb_build_object('outcome', 'review', 'review_item_id', v_review);
end $$;

-- ---------------------------------------------------------------------------
-- Official outcomes: results, scorecards, weigh-ins, regulatory actions.
-- Each write is idempotent for identical content; changed content becomes a
-- new revision that supersedes the current one (never an UPDATE).
-- ---------------------------------------------------------------------------

create or replace function public.boxing_record_result(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_bout uuid := (p ->> 'bout_id')::uuid;
  v_cur public.boxing_bout_results%rowtype;
  v_id uuid;
  v_obs uuid;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  if p ? 'observation' then
    v_obs := ((public.boxing_record_observation(jsonb_set(p -> 'observation', '{source_key}', to_jsonb(p ->> 'source_key')))) ->> 'id')::uuid;
  end if;
  select * into v_cur from public.boxing_bout_results_current where bout_id = v_bout;
  if found
     and v_cur.outcome = p ->> 'outcome'
     and v_cur.winner_id is not distinct from nullif(p ->> 'winner_id', '')::uuid
     and v_cur.method is not distinct from (p ->> 'method')
     and v_cur.decision_type is not distinct from (p ->> 'decision_type')
     and v_cur.round is not distinct from nullif(p ->> 'round', '')::int
     and v_cur.time_sec is not distinct from nullif(p ->> 'time_sec', '')::int
     and v_cur.result_state = coalesce(p ->> 'result_state', 'official') then
    return jsonb_build_object('status', 'duplicate', 'result_id', v_cur.id, 'revision', v_cur.revision);
  end if;
  insert into public.boxing_bout_results
    (bout_id, source_id, outcome, winner_id, method, method_raw, decision_type, round, time_sec, result_state,
     change_reason, decided_at, source_url, observation_id, revision, supersedes_id)
  values (v_bout, v_src, p ->> 'outcome', nullif(p ->> 'winner_id', '')::uuid, p ->> 'method', p ->> 'method_raw',
          p ->> 'decision_type', nullif(p ->> 'round', '')::int, nullif(p ->> 'time_sec', '')::int,
          coalesce(p ->> 'result_state', 'official'), p ->> 'change_reason', nullif(p ->> 'decided_at', '')::timestamptz,
          p ->> 'source_url', v_obs, coalesce(v_cur.revision + 1, 1), v_cur.id)
  returning id into v_id;
  update public.boxing_bouts set status = 'complete' where id = v_bout and status <> 'complete';
  return jsonb_build_object('status', case when v_cur.id is null then 'created' else 'revised' end, 'result_id', v_id,
    'revision', coalesce(v_cur.revision + 1, 1),
    'previous', case when v_cur.id is null then null else jsonb_build_object('result_id', v_cur.id, 'outcome', v_cur.outcome,
      'winner_id', v_cur.winner_id, 'method', v_cur.method, 'decision_type', v_cur.decision_type, 'result_state', v_cur.result_state) end);
end $$;

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
     revision, supersedes_id, card_state, scorer_role, score_basis, slot, change_reason)
  values (v_bout, v_judge, (p ->> 'fighter_a_id')::uuid, (p ->> 'fighter_b_id')::uuid,
          nullif(p ->> 'fighter_a_total', '')::numeric, nullif(p ->> 'fighter_b_total', '')::numeric,
          nullif(p ->> 'decision_for_id', '')::uuid, v_src, p ->> 'source_url', coalesce(v_cur.revision + 1, 1), v_cur.id,
          case when v_cur.id is null then coalesce(p ->> 'card_state', 'official') else 'corrected' end,
          coalesce(p ->> 'scorer_role', 'judge'), coalesce(p ->> 'score_basis', 'unknown'), nullif(p ->> 'slot', '')::smallint,
          p ->> 'change_reason')
  returning id into v_id;
  for r in select * from jsonb_array_elements(coalesce(p -> 'rounds', '[]'::jsonb)) loop
    insert into public.boxing_scorecard_rounds (scorecard_id, round, fighter_a_points, fighter_b_points, notes)
    values (v_id, (r ->> 'round')::int, (r ->> 'a')::numeric, (r ->> 'b')::numeric, r ->> 'notes');
  end loop;
  return jsonb_build_object('status', case when v_cur.id is null then 'created' else 'revised' end, 'scorecard_id', v_id,
    'revision', coalesce(v_cur.revision + 1, 1), 'superseded_scorecard_id', v_cur.id);
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
     source_id, source_url, weigh_in_kind, source_unit, source_weight_raw, verification_state, revision, supersedes_id)
  values ((p ->> 'bout_id')::uuid, (p ->> 'fighter_id')::uuid, v_attempt, nullif(p ->> 'official_weight_lb', '')::numeric,
          nullif(p ->> 'official_weight_kg', '')::numeric, nullif(p ->> 'contracted_weight_lb', '')::numeric,
          nullif(p ->> 'miss_lb', '')::numeric, p ->> 'status', nullif(p ->> 'weighed_at', '')::timestamptz, v_src, p ->> 'source_url',
          v_kind, p ->> 'source_unit', p ->> 'source_weight_raw', coalesce(p ->> 'verification_state', 'unverified'),
          coalesce(v_cur.revision + 1, 1), v_cur.id)
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
     source_id, source_url, source_record, revision, supersedes_id, action_key)
  values (nullif(p ->> 'fighter_id', '')::uuid, nullif(p ->> 'official_id', '')::uuid, nullif(p ->> 'bout_id', '')::uuid,
          (select id from public.boxing_commissions where slug = p ->> 'commission_slug'), p ->> 'action_type', p ->> 'status',
          nullif(p ->> 'effective_from', '')::timestamptz, nullif(p ->> 'effective_to', '')::timestamptz, p ->> 'reason_public',
          v_src, p ->> 'source_url', coalesce(p -> 'source_record', '{}'::jsonb), coalesce(v_cur.revision + 1, 1), v_cur.id,
          case when v_cur.id is null then v_key else v_key || '#r' || (v_cur.revision + 1) end)
  returning id into v_id;
  return jsonb_build_object('status', case when v_cur.id is null then 'created' else 'revised' end, 'action_id', v_id,
    'superseded_action_id', v_cur.id);
end $$;

-- ---------------------------------------------------------------------------
-- Reference entities referenced by card documents (find-or-create, provenance
-- kept on the row). Organization kind is fixed at creation and enforced by
-- the role/kind triggers.
-- ---------------------------------------------------------------------------

create or replace function public.boxing_ensure_commission(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.boxing_commissions where slug = p ->> 'slug';
  if v_id is not null then return v_id; end if;
  insert into public.boxing_commissions (slug, name, jurisdiction, country_code, region_code, source_id, source_url)
  values (p ->> 'slug', coalesce(p ->> 'name', p ->> 'slug'), p ->> 'jurisdiction', p ->> 'country_code', p ->> 'region_code',
          (select id from public.boxing_sources where source_key = p ->> 'source_key'), p ->> 'source_url')
  on conflict (slug) do nothing
  returning id into v_id;
  return coalesce(v_id, (select id from public.boxing_commissions where slug = p ->> 'slug'));
end $$;

create or replace function public.boxing_ensure_venue(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.boxing_venues
  where lower(name) = lower(p ->> 'name') and city is not distinct from (p ->> 'city') and country_code is not distinct from (p ->> 'country_code')
  limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.boxing_venues (name, city, region, country_code, source_id, source_url)
  values (p ->> 'name', p ->> 'city', p ->> 'region', p ->> 'country_code',
          (select id from public.boxing_sources where source_key = p ->> 'source_key'), p ->> 'source_url')
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.boxing_ensure_organization(p jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.boxing_organizations where slug = p ->> 'slug';
  if v_id is not null then return v_id; end if;
  if p ->> 'kind' is null then
    raise exception 'organization_kind_required: % is unknown; supply its kind', p ->> 'slug' using errcode = 'BX084';
  end if;
  insert into public.boxing_organizations (slug, name, short_name, organization_kind, source_id, source_url)
  values (p ->> 'slug', coalesce(p ->> 'name', p ->> 'slug'), p ->> 'short_name', p ->> 'kind',
          (select id from public.boxing_sources where source_key = p ->> 'source_key'), p ->> 'source_url')
  on conflict (slug) do nothing
  returning id into v_id;
  return coalesce(v_id, (select id from public.boxing_organizations where slug = p ->> 'slug'));
end $$;

create unique index if not exists boxing_point_deductions_dedupe
  on public.boxing_point_deductions (bout_id, fighter_id, round, points, source_id);

create or replace function public.boxing_record_point_deduction(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.boxing_point_deductions (bout_id, fighter_id, round, points, reason_public, referee_official_id, source_id, source_url)
  values ((p ->> 'bout_id')::uuid, (p ->> 'fighter_id')::uuid, (p ->> 'round')::int, (p ->> 'points')::numeric, p ->> 'reason_public',
          nullif(p ->> 'referee_official_id', '')::uuid, (select id from public.boxing_sources where source_key = p ->> 'source_key'),
          p ->> 'source_url')
  on conflict do nothing
  returning id into v_id;
  return jsonb_build_object('inserted', v_id is not null, 'id', v_id);
end $$;

create or replace function public.boxing_bout_outcome_state(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'bout_id', b.id, 'event_id', b.event_id, 'status', b.status, 'scheduled_rounds', b.scheduled_rounds,
    'contracted_weight_lb', b.contracted_weight_lb,
    'weight_class_limit_lb', (select wc.max_weight_lb from public.boxing_weight_classes wc where wc.id = b.weight_class_id),
    'participants', (select coalesce(jsonb_agg(jsonb_build_object('fighter_id', p.fighter_id, 'side', p.side, 'status', p.participant_status)
                                    order by p.side), '[]'::jsonb)
                     from public.boxing_bout_participants p where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')),
    'result', (select to_jsonb(r) from public.boxing_bout_results_current r where r.bout_id = b.id),
    'scorecards', (select coalesce(jsonb_agg(jsonb_build_object('scorecard_id', s.id, 'judge_id', s.judge_id, 'a_total', s.fighter_a_total,
                                                               'b_total', s.fighter_b_total, 'revision', s.revision) order by s.slot, s.judge_id), '[]'::jsonb)
                   from public.boxing_scorecards_current s where s.bout_id = b.id),
    'titles', (select coalesce(jsonb_agg(jsonb_build_object('title_id', bt.title_id, 'at_stake', bt.at_stake, 'eligible_fighter_id', bt.eligible_fighter_id)), '[]'::jsonb)
               from public.boxing_bout_titles bt where bt.bout_id = b.id)
  )
  from public.boxing_bouts b where b.id = p_bout
$$;

select public.boxing_lockdown();

commit;
