-- PropBetEdge Boxing — title graph and ranking snapshots (issue #2)
--
-- Titles are belt LINEAGES (organization + division + gender + tier). The fact
-- store is an append-only title event log; reigns, vacancies and holders are
-- DERIVED from it, so ending a reign never overwrites anything. Undisputed /
-- unified status is a versioned PropBetEdge derivation, never a stored fact.
-- Rerunnable.

begin;

-- ---------------------------------------------------------------------------
-- First-class sanctioning organizations
-- ---------------------------------------------------------------------------

insert into public.boxing_organizations (slug, name, short_name, organization_kind, sanctioning_scope, website_url, source_id)
select v.slug, v.name, v.short_name, 'sanctioning_body', 'world', v.url, s.id
from (values
  ('wbc', 'World Boxing Council', 'WBC', 'https://wbcboxing.com/', 'wbc_official'),
  ('wba', 'World Boxing Association', 'WBA', 'https://www.wbaboxing.com/', 'wba_official'),
  ('ibf', 'International Boxing Federation', 'IBF', 'https://www.ibf-usba-boxing.com/', 'ibf_official'),
  ('wbo', 'World Boxing Organization', 'WBO', 'https://www.wboboxing.com/', 'wbo_official')
) as v(slug, name, short_name, url, source_key)
left join public.boxing_sources s on s.source_key = v.source_key
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Titles: tiers and source-native labels
-- ---------------------------------------------------------------------------

alter table public.boxing_titles
  add column if not exists tier text,
  add column if not exists source_native_label text,
  add column if not exists counts_toward_undisputed boolean not null default false,
  add column if not exists org_priority smallint;
update public.boxing_titles set tier = 'world' where tier is null;
alter table public.boxing_titles alter column tier set default 'world';
alter table public.boxing_titles alter column tier set not null;
alter table public.boxing_titles drop constraint if exists boxing_titles_tier_check;
alter table public.boxing_titles add constraint boxing_titles_tier_check check (tier in (
  'world','super','regular','interim','franchise','silver','diamond','gold','emeritus','regional','other'));
alter table public.boxing_titles drop constraint if exists boxing_titles_undisputed_tier_check;
alter table public.boxing_titles add constraint boxing_titles_undisputed_tier_check check (
  not counts_toward_undisputed or (tier in ('world','super','regular') and org_priority is not null));
create unique index if not exists boxing_titles_lineage_key
  on public.boxing_titles (organization_id, weight_class_id, gender_scope, tier) nulls not distinct;

comment on column public.boxing_titles.counts_toward_undisputed is
  'Policy flag for the PBE undisputed derivation (rule pbe_undisputed@1). Interim, franchise, silver, diamond, gold, emeritus and regional belts never count by default.';
comment on table public.boxing_title_reigns is
  'DEPRECATED (0006): reigns are derived from boxing_title_events by boxing_title_reigns_derived(). Do not write here.';

-- Creates (or returns) the lineage for org + division + gender + tier.
create or replace function public.boxing_ensure_title(
  p_org_slug text, p_weight_class_key text, p_gender text, p_tier text, p_source_native_label text default null
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_org uuid;
  v_wc uuid;
  v_id uuid;
  v_counts boolean := p_tier in ('world','super','regular');
  v_priority smallint := case p_tier when 'super' then 5 when 'world' then 10 when 'regular' then 20 end;
begin
  select id into v_org from public.boxing_organizations where slug = p_org_slug;
  select id into v_wc from public.boxing_weight_classes where class_key = p_weight_class_key;
  if v_org is null or v_wc is null then
    raise exception 'title_lineage_unknown: org % / division %', p_org_slug, p_weight_class_key using errcode = 'BX060';
  end if;
  select id into v_id from public.boxing_titles
  where organization_id = v_org and weight_class_id = v_wc and gender_scope = p_gender and tier = p_tier;
  if v_id is not null then return v_id; end if;
  insert into public.boxing_titles
    (organization_id, weight_class_id, title_key, name, title_type, gender_scope, tier, source_native_label,
     counts_toward_undisputed, org_priority, source_id)
  values (v_org, v_wc, p_org_slug || ':' || p_weight_class_key || ':' || p_gender || ':' || p_tier,
          upper(p_org_slug) || ' ' || p_tier || ' ' || replace(p_weight_class_key, '_', ' ') || ' (' || p_gender || ')',
          'world', p_gender, p_tier, p_source_native_label, v_counts, v_priority,
          (select id from public.boxing_sources where source_key = 'pbe_boxing_internal'))
  on conflict do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.boxing_titles
    where organization_id = v_org and weight_class_id = v_wc and gender_scope = p_gender and tier = p_tier;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Title event log (append-only fact store)
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_title_events (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.boxing_titles(id) on delete restrict,
  event_type text not null check (event_type in (
    'won','awarded','elevated','reinstated','defended',
    'vacated','relinquished','stripped','lost','downgraded','status_changed','retraction')),
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  effective_on date not null,
  sequence smallint not null default 0,
  bout_id uuid references public.boxing_bouts(id) on delete restrict,
  source_native_status text,
  reason_public text,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  supersedes_id uuid references public.boxing_title_events(id) on delete restrict,
  event_key text not null unique,
  recorded_at timestamptz not null default now(),
  check (event_type in ('vacated','downgraded','status_changed','retraction','stripped','relinquished') or fighter_id is not null),
  check (event_type not in ('defended','lost') or bout_id is not null),
  check (event_type <> 'retraction' or supersedes_id is not null),
  foreign key (bout_id, fighter_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict
);
create index if not exists boxing_title_events_title_idx on public.boxing_title_events (title_id, effective_on, sequence);
create index if not exists boxing_title_events_fighter_idx on public.boxing_title_events (fighter_id, effective_on);
create unique index if not exists boxing_title_events_single_successor
  on public.boxing_title_events (supersedes_id) where supersedes_id is not null;
select public.boxing_install_append_only('public.boxing_title_events');

-- A bout-based title event must be for a title that bout contested, and a
-- "won" must agree with the bout's current official result if one exists.
create or replace function public.boxing_title_event_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_winner uuid;
  v_outcome text;
begin
  if new.bout_id is not null and new.fighter_id is not null and not exists (
      select 1 from public.boxing_bout_participants bp where bp.bout_id = new.bout_id and bp.fighter_id = new.fighter_id) then
    raise exception 'title_event_fighter_not_in_bout: % did not box in bout %', new.fighter_id, new.bout_id using errcode = 'BX064';
  end if;
  if new.bout_id is not null and new.event_type in ('won','defended','lost') then
    if not exists (select 1 from public.boxing_bout_titles bt where bt.bout_id = new.bout_id and bt.title_id = new.title_id) then
      raise exception 'title_not_contested_in_bout: title % was not at stake in bout %', new.title_id, new.bout_id
        using errcode = 'BX061';
    end if;
    select r.winner_id, r.outcome into v_winner, v_outcome
    from public.boxing_bout_results_current r where r.bout_id = new.bout_id;
    if found then
      if new.event_type in ('won','defended') and (v_outcome <> 'win' or v_winner <> new.fighter_id) then
        raise exception 'title_event_contradicts_result: % by % but official result is % (winner %)',
          new.event_type, new.fighter_id, v_outcome, v_winner using errcode = 'BX062';
      end if;
      if new.event_type = 'lost' and (v_outcome <> 'win' or v_winner = new.fighter_id) then
        raise exception 'title_event_contradicts_result: lost by % but official result is % (winner %)',
          new.fighter_id, v_outcome, v_winner using errcode = 'BX062';
      end if;
    end if;
  end if;
  if new.supersedes_id is not null and not exists (
      select 1 from public.boxing_title_events s where s.id = new.supersedes_id and s.title_id = new.title_id) then
    raise exception 'title_event_supersedes_other_title' using errcode = 'BX063';
  end if;
  return new;
end $$;
drop trigger if exists boxing_title_events_guard on public.boxing_title_events;
create trigger boxing_title_events_guard before insert on public.boxing_title_events
  for each row execute function public.boxing_title_event_guard();

-- Derived reigns. Effective events exclude retractions and superseded events.
-- A start event (won/awarded/elevated/reinstated) by the reigning champion is
-- a continuation, not a new reign. A reign ends at the next end event
-- (vacated/relinquished/stripped/lost/downgraded) or the next start event by
-- a different fighter.
create or replace function public.boxing_title_reigns_derived(p_title uuid default null)
returns table (
  title_id uuid, fighter_id uuid, started_on date, ended_on date, start_event_id uuid, start_type text,
  end_event_id uuid, end_type text, won_bout_id uuid, defenses int
) language sql stable set search_path = '' as $$
  with eff as (
    select e.* from public.boxing_title_events e
    where (p_title is null or e.title_id = p_title)
      and e.event_type <> 'retraction'
      and not exists (select 1 from public.boxing_title_events s where s.supersedes_id = e.id)
  ), ordered as (
    select eff.*, row_number() over (partition by eff.title_id order by eff.effective_on, eff.sequence, eff.recorded_at, eff.id) as ord
    from eff
  ), starts as (
    select o.* from ordered o
    where o.event_type in ('won','awarded','elevated','reinstated')
      and not exists (
        select 1 from ordered p
        where p.title_id = o.title_id and p.ord < o.ord
          and p.event_type in ('won','awarded','elevated','reinstated') and p.fighter_id = o.fighter_id
          and not exists (
            select 1 from ordered q
            where q.title_id = o.title_id and q.ord > p.ord and q.ord < o.ord
              and (q.event_type in ('vacated','relinquished','stripped','lost','downgraded')
                   or (q.event_type in ('won','awarded','elevated','reinstated') and q.fighter_id is distinct from o.fighter_id))))
  )
  select s.title_id, s.fighter_id, s.effective_on, e.effective_on, s.id, s.event_type, e.id, e.event_type, s.bout_id,
    (select count(*)::int from ordered d
     where d.title_id = s.title_id and d.event_type = 'defended' and d.fighter_id = s.fighter_id
       and d.ord > s.ord and (e.ord is null or d.ord < e.ord))
  from starts s
  left join lateral (
    select x.* from ordered x
    where x.title_id = s.title_id and x.ord > s.ord
      and (x.event_type in ('vacated','relinquished','stripped','lost','downgraded')
           or (x.event_type in ('won','awarded','elevated','reinstated') and x.fighter_id is distinct from s.fighter_id))
    order by x.ord limit 1) e on true
$$;

create or replace function public.boxing_record_title_event(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_obs uuid;
  v_id uuid;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  if p ? 'observation' then
    v_obs := ((public.boxing_record_observation(jsonb_set(p -> 'observation', '{source_key}', to_jsonb(p ->> 'source_key')))) ->> 'id')::uuid;
  end if;
  insert into public.boxing_title_events
    (title_id, event_type, fighter_id, effective_on, sequence, bout_id, source_native_status, reason_public,
     source_id, source_url, observation_id, supersedes_id, event_key)
  values ((p ->> 'title_id')::uuid, p ->> 'event_type', nullif(p ->> 'fighter_id', '')::uuid, (p ->> 'effective_on')::date,
          coalesce((p ->> 'sequence')::smallint, 0), nullif(p ->> 'bout_id', '')::uuid, p ->> 'source_native_status',
          p ->> 'reason_public', v_src, p ->> 'source_url', v_obs, nullif(p ->> 'supersedes_id', '')::uuid, p ->> 'event_key')
  on conflict (event_key) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.boxing_title_events where event_key = p ->> 'event_key';
    if v_obs is not null then
      insert into public.boxing_observation_links (observation_id, entity_type, entity_id, link_role)
      values (v_obs, 'title_event', v_id::text, 'supports') on conflict do nothing;
    end if;
    return jsonb_build_object('inserted', false, 'id', v_id);
  end if;
  if v_obs is not null then
    insert into public.boxing_observation_links (observation_id, entity_type, entity_id, link_role)
    values (v_obs, 'title_event', v_id::text, 'created') on conflict do nothing;
  end if;
  return jsonb_build_object('inserted', true, 'id', v_id);
end $$;

-- ---------------------------------------------------------------------------
-- Ranking snapshots: gender scope, idempotent import, automatic revisions
-- ---------------------------------------------------------------------------

alter table public.boxing_ranking_snapshots
  add column if not exists gender_scope text not null default 'male',
  add column if not exists division_label text;
alter table public.boxing_ranking_snapshots drop constraint if exists boxing_ranking_snapshots_gender_check;
alter table public.boxing_ranking_snapshots add constraint boxing_ranking_snapshots_gender_check
  check (gender_scope in ('male','female','all'));
alter table public.boxing_ranking_snapshots drop constraint if exists boxing_ranking_snapshots_key;
alter table public.boxing_ranking_snapshots add constraint boxing_ranking_snapshots_key
  unique nulls not distinct (organization_id, weight_class_id, gender_scope, source_id, published_on, effective_on, revision);
create unique index if not exists boxing_ranking_snapshots_content_key
  on public.boxing_ranking_snapshots (organization_id, weight_class_id, gender_scope, source_id, content_hash)
  where content_hash is not null;

-- Current snapshot for org/division/gender as of a date: latest effective
-- publication on or before the date, highest non-superseded revision.
create or replace function public.boxing_ranking_snapshot_as_of(
  p_org uuid, p_wc uuid, p_gender text, p_as_of date, p_before_snapshot uuid default null
) returns uuid language sql stable set search_path = '' as $$
  select s.id from public.boxing_ranking_snapshots s
  where s.organization_id = p_org and s.weight_class_id = p_wc and s.gender_scope = p_gender
    and coalesce(s.effective_on, s.published_on) <= p_as_of
    and not exists (select 1 from public.boxing_ranking_snapshots n where n.supersedes_id = s.id)
    and (p_before_snapshot is null or coalesce(s.effective_on, s.published_on) < (
      select coalesce(b.effective_on, b.published_on) from public.boxing_ranking_snapshots b where b.id = p_before_snapshot))
  order by coalesce(s.effective_on, s.published_on) desc, s.revision desc, s.captured_at desc
  limit 1
$$;

create or replace function public.boxing_import_ranking_snapshot(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_org uuid;
  v_wc uuid;
  v_gender text := coalesce(p ->> 'gender_scope', 'male');
  v_pub date := nullif(p ->> 'published_on', '')::date;
  v_eff date := nullif(p ->> 'effective_on', '')::date;
  v_hash text := p ->> 'content_hash';
  v_existing uuid;
  v_latest public.boxing_ranking_snapshots%rowtype;
  v_obs uuid;
  v_id uuid;
  e jsonb;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  select id into v_org from public.boxing_organizations where slug = p ->> 'organization_slug';
  select id into v_wc from public.boxing_weight_classes where class_key = p ->> 'weight_class_key';
  if v_src is null or v_org is null or v_wc is null then
    raise exception 'ranking_import_unknown_reference: source=% org=% division=%', p ->> 'source_key', p ->> 'organization_slug', p ->> 'weight_class_key'
      using errcode = 'BX070';
  end if;

  v_obs := ((public.boxing_record_observation(jsonb_build_object(
    'source_key', p ->> 'source_key', 'entity_type', 'ranking_snapshot',
    'external_key', concat_ws('|', p ->> 'organization_slug', p ->> 'weight_class_key', v_gender, v_pub, v_eff),
    'payload', p -> 'raw', 'content_hash', v_hash, 'source_url', p ->> 'source_url',
    'ingest_run_id', p ->> 'ingest_run_id'))) ->> 'id')::uuid;

  select id into v_existing from public.boxing_ranking_snapshots
  where organization_id = v_org and weight_class_id = v_wc and gender_scope = v_gender and source_id = v_src and content_hash = v_hash;
  if v_existing is not null then
    return jsonb_build_object('status', 'duplicate', 'snapshot_id', v_existing,
      'previous_snapshot_id', public.boxing_ranking_snapshot_as_of(v_org, v_wc, v_gender, coalesce(v_eff, v_pub), v_existing));
  end if;

  select * into v_latest from public.boxing_ranking_snapshots s
  where s.organization_id = v_org and s.weight_class_id = v_wc and s.gender_scope = v_gender and s.source_id = v_src
    and s.published_on is not distinct from v_pub and s.effective_on is not distinct from v_eff
    and not exists (select 1 from public.boxing_ranking_snapshots n where n.supersedes_id = s.id)
  order by s.revision desc limit 1;

  insert into public.boxing_ranking_snapshots
    (organization_id, weight_class_id, source_id, published_on, effective_on, source_url, source_record, gender_scope,
     division_label, revision, supersedes_id, content_hash, observation_id, correction_note)
  values (v_org, v_wc, v_src, v_pub, v_eff, p ->> 'source_url', coalesce(p -> 'source_record', '{}'::jsonb), v_gender,
          p ->> 'division_label', coalesce(v_latest.revision + 1, 1), v_latest.id, v_hash, v_obs,
          case when v_latest.id is not null then coalesce(p ->> 'correction_note', 'source republished with different content') end)
  returning id into v_id;

  for e in select * from jsonb_array_elements(coalesce(p -> 'entries', '[]'::jsonb)) loop
    insert into public.boxing_ranking_entries
      (snapshot_id, position, rank, rank_label, fighter_id, source_name, designation, mandatory, is_vacant, is_champion, metadata)
    values (v_id, (e ->> 'position')::int, nullif(e ->> 'rank', '')::int, e ->> 'rank_label', nullif(e ->> 'fighter_id', '')::uuid,
            e ->> 'source_name', e ->> 'designation', nullif(e ->> 'mandatory', '')::boolean,
            coalesce((e ->> 'is_vacant')::boolean, false), coalesce((e ->> 'is_champion')::boolean, false),
            coalesce(e -> 'metadata', '{}'::jsonb));
  end loop;

  insert into public.boxing_observation_links (observation_id, entity_type, entity_id, link_role)
  values (v_obs, 'ranking_snapshot', v_id::text, 'created') on conflict do nothing;

  return jsonb_build_object('status', case when v_latest.id is null then 'created' else 'revised' end,
    'snapshot_id', v_id, 'revision', coalesce(v_latest.revision + 1, 1), 'superseded_snapshot_id', v_latest.id,
    'previous_snapshot_id', public.boxing_ranking_snapshot_as_of(v_org, v_wc, v_gender, coalesce(v_eff, v_pub), v_id));
end $$;

create or replace function public.boxing_ranking_entries_json(p_snapshot uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'snapshot_id', s.id, 'published_on', s.published_on, 'effective_on', s.effective_on, 'revision', s.revision,
    'supersedes_id', s.supersedes_id, 'source_url', s.source_url, 'division_label', s.division_label,
    'organization_slug', o.slug, 'weight_class_key', wc.class_key, 'gender_scope', s.gender_scope,
    'source_key', src.source_key, 'captured_at', s.captured_at,
    'entries', (select coalesce(jsonb_agg(jsonb_build_object(
        'position', e.position, 'rank', e.rank, 'rank_label', e.rank_label, 'fighter_id', e.fighter_id,
        'public_id', f.public_id, 'display_name', f.display_name, 'source_name', e.source_name,
        'designation', e.designation, 'mandatory', e.mandatory, 'is_vacant', e.is_vacant, 'is_champion', e.is_champion,
        'metadata', e.metadata) order by e.position), '[]'::jsonb)
      from public.boxing_ranking_entries e left join public.boxing_fighters f on f.id = e.fighter_id
      where e.snapshot_id = s.id))
  from public.boxing_ranking_snapshots s
  join public.boxing_organizations o on o.id = s.organization_id
  join public.boxing_weight_classes wc on wc.id = s.weight_class_id
  join public.boxing_sources src on src.id = s.source_id
  where s.id = p_snapshot
$$;

create or replace function public.boxing_ranking_as_of_json(p_org_slug text, p_weight_class_key text, p_gender text, p_as_of date)
returns jsonb language sql stable set search_path = '' as $$
  select public.boxing_ranking_entries_json(public.boxing_ranking_snapshot_as_of(
    (select id from public.boxing_organizations where slug = p_org_slug),
    (select id from public.boxing_weight_classes where class_key = p_weight_class_key),
    p_gender, p_as_of))
$$;

create or replace function public.boxing_title_summary(p_title uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', t.id, 'public_id', t.public_id, 'organization_id', t.organization_id,
    'organization_slug', o.slug, 'tier', t.tier, 'source_native_label', t.source_native_label,
    'weight_class_key', wc.class_key, 'gender_scope', t.gender_scope)
  from public.boxing_titles t
  join public.boxing_organizations o on o.id = t.organization_id
  left join public.boxing_weight_classes wc on wc.id = t.weight_class_id
  where t.id = p_title
$$;

-- Everything the Title Map needs for one division, gender and date.
create or replace function public.boxing_title_map_facts(p_weight_class_key text, p_gender text, p_as_of date, p_recent_days int default 180)
returns jsonb language sql stable set search_path = '' as $$
  with wc as (select id from public.boxing_weight_classes where class_key = p_weight_class_key),
  titles as (
    select t.*, o.slug as org_slug, o.short_name as org_short, o.organization_kind
    from public.boxing_titles t join public.boxing_organizations o on o.id = t.organization_id
    where t.weight_class_id = (select id from wc) and t.gender_scope in (p_gender, 'all')
  )
  select jsonb_build_object(
    'weight_class_key', p_weight_class_key, 'gender_scope', p_gender, 'as_of', p_as_of,
    'titles', (select coalesce(jsonb_agg(jsonb_build_object(
        'title_id', t.id, 'public_id', t.public_id, 'organization_slug', t.org_slug, 'organization', t.org_short,
        'tier', t.tier, 'source_native_label', t.source_native_label, 'counts_toward_undisputed', t.counts_toward_undisputed,
        'org_priority', t.org_priority,
        'holder', (select jsonb_build_object('fighter_id', r.fighter_id, 'public_id', f.public_id, 'display_name', f.display_name,
                                             'started_on', r.started_on, 'start_type', r.start_type, 'won_bout_id', r.won_bout_id,
                                             'defenses', r.defenses)
                   from public.boxing_title_reigns_derived(t.id) r join public.boxing_fighters f on f.id = r.fighter_id
                   where r.started_on <= p_as_of and (r.ended_on is null or r.ended_on > p_as_of)
                   order by r.started_on desc limit 1),
        'last_change', (select jsonb_build_object('event_type', x.event_type, 'effective_on', x.effective_on,
                                                  'fighter_id', x.fighter_id, 'source_native_status', x.source_native_status)
                        from public.boxing_title_events x
                        where x.title_id = t.id and x.effective_on <= p_as_of and x.event_type <> 'defended'
                          and x.event_type <> 'retraction'
                          and not exists (select 1 from public.boxing_title_events s where s.supersedes_id = x.id)
                        order by x.effective_on desc, x.sequence desc limit 1)
      ) order by t.org_slug, t.org_priority nulls last, t.tier), '[]'::jsonb) from titles t),
    'recent_title_events', (select coalesce(jsonb_agg(jsonb_build_object(
        'title_id', x.title_id, 'organization_slug', t.org_slug, 'tier', t.tier, 'event_type', x.event_type,
        'fighter_id', x.fighter_id, 'effective_on', x.effective_on, 'bout_id', x.bout_id,
        'source_native_status', x.source_native_status, 'superseded', exists (select 1 from public.boxing_title_events s where s.supersedes_id = x.id))
      order by x.effective_on desc, x.sequence desc), '[]'::jsonb)
      from public.boxing_title_events x join titles t on t.id = x.title_id
      where x.effective_on <= p_as_of and x.effective_on > p_as_of - p_recent_days),
    'rankings', (select coalesce(jsonb_agg(jsonb_build_object(
        'organization_slug', o.slug,
        'current', public.boxing_ranking_entries_json(public.boxing_ranking_snapshot_as_of(o.id, (select id from wc), p_gender, p_as_of)),
        'previous', public.boxing_ranking_entries_json(public.boxing_ranking_snapshot_as_of(o.id, (select id from wc), p_gender, p_as_of,
                      public.boxing_ranking_snapshot_as_of(o.id, (select id from wc), p_gender, p_as_of))))
      order by o.slug), '[]'::jsonb)
      from public.boxing_organizations o
      where o.organization_kind in ('sanctioning_body','governing_body','ranking_body','media')
        and exists (select 1 from public.boxing_ranking_snapshots s where s.organization_id = o.id and s.weight_class_id = (select id from wc)))
  )
$$;

select public.boxing_lockdown();

commit;
