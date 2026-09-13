-- PropBetEdge Boxing Core v1 — foundation hardening
--
-- Audit fixes for 20260912000001 / 20260912000002. Written as a forward
-- migration (never edits the earlier files) so it is safe whether or not the
-- first two were already applied somewhere. Every change is explained in
-- docs/SCHEMA_AUDIT_2026-09-12.md; section numbers below match that document.
--
-- Rerunnable: every statement is guarded (if [not] exists / drop-then-add /
-- catalog checks), so applying the file twice is a no-op.

begin;

-- ===========================================================================
-- H1. Shared helpers
-- ===========================================================================

create or replace function public.boxing_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Operators occasionally need to correct history (legal takedown, a row
-- written against the wrong bout). That must be deliberate and audited, never
-- accidental: `set local boxing.history_override = '<reason>'` inside the
-- transaction, and the override is logged here.
create table if not exists public.boxing_history_override_log (
  id bigserial primary key,
  table_name text not null,
  operation text not null,
  row_data jsonb,
  reason text not null,
  actor text not null default current_user,
  created_at timestamptz not null default now()
);

create or replace function public.boxing_append_only()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_reason text := nullif(current_setting('boxing.history_override', true), '');
begin
  if v_reason is not null and tg_table_name <> 'boxing_history_override_log' then
    insert into public.boxing_history_override_log (table_name, operation, row_data, reason)
    values (tg_table_name, tg_op, case when tg_level = 'ROW' then to_jsonb(old) end, v_reason);
    if tg_level = 'STATEMENT' then return null; end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'append_only_violation: % on public.% is not allowed', tg_op, tg_table_name
    using errcode = 'BX001',
          hint = 'History is immutable. Append a correction/revision row instead.';
end $$;

-- Column-level immutability: every column except the ones named in the
-- trigger arguments is frozen. DELETE is always refused.
create or replace function public.boxing_guard_mutable_columns()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_reason text := nullif(current_setting('boxing.history_override', true), '');
  v_old jsonb;
  v_new jsonb;
  i int;
begin
  if v_reason is not null then
    insert into public.boxing_history_override_log (table_name, operation, row_data, reason)
    values (tg_table_name, tg_op, case when tg_level = 'ROW' then to_jsonb(old) end, v_reason);
    if tg_level = 'STATEMENT' then return null; end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op <> 'UPDATE' then
    raise exception 'append_only_violation: % on public.% is not allowed', tg_op, tg_table_name
      using errcode = 'BX001';
  end if;
  v_old := to_jsonb(old);
  v_new := to_jsonb(new);
  if tg_nargs > 0 then
    for i in 0 .. tg_nargs - 1 loop
      v_old := v_old - tg_argv[i];
      v_new := v_new - tg_argv[i];
    end loop;
  end if;
  if v_old is distinct from v_new then
    raise exception 'immutable_column_violation: public.% only allows updates to (%)',
      tg_table_name, array_to_string(tg_argv, ', ')
      using errcode = 'BX002';
  end if;
  return new;
end $$;

-- Freeze specific columns (e.g. public_id) on otherwise mutable tables.
create or replace function public.boxing_freeze_columns()
returns trigger language plpgsql set search_path = '' as $$
declare
  i int;
begin
  for i in 0 .. tg_nargs - 1 loop
    if (to_jsonb(old) -> tg_argv[i]) is distinct from (to_jsonb(new) -> tg_argv[i]) then
      raise exception 'immutable_column_violation: public.%.% cannot change', tg_table_name, tg_argv[i]
        using errcode = 'BX002';
    end if;
  end loop;
  return new;
end $$;

create or replace function public.boxing_install_append_only(p_table regclass)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('drop trigger if exists boxing_append_only_row on %s', p_table);
  execute format('create trigger boxing_append_only_row before update or delete on %s '
                 'for each row execute function public.boxing_append_only()', p_table);
  execute format('drop trigger if exists boxing_append_only_truncate on %s', p_table);
  execute format('create trigger boxing_append_only_truncate before truncate on %s '
                 'for each statement execute function public.boxing_append_only()', p_table);
end $$;

create or replace function public.boxing_ensure_constraint(p_table regclass, p_name text, p_def text)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = p_table and conname = p_name) then
    execute format('alter table %s add constraint %I %s', p_table, p_name, p_def);
  end if;
end $$;

-- Supabase exposes `public` through PostgREST. Without RLS, the anon key can
-- read AND write every table. Lock every boxing table: RLS on, no policies,
-- no grants to anon/authenticated. service_role (BYPASSRLS) and the owner keep
-- access. Called at the end of every boxing migration.
create or replace function public.boxing_lockdown()
returns void language plpgsql set search_path = '' as $$
declare
  r record;
  v_has_anon boolean := exists (select 1 from pg_catalog.pg_roles where rolname = 'anon');
  v_has_auth boolean := exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated');
begin
  for r in
    select c.oid::regclass as rel, c.relkind
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname like 'boxing\_%' and c.relkind in ('r','v','m','p')
  loop
    if r.relkind in ('r','p') then
      execute format('alter table %s enable row level security', r.rel);
    end if;
    execute format('revoke all on %s from public', r.rel);
    if v_has_anon then execute format('revoke all on %s from anon', r.rel); end if;
    if v_has_auth then execute format('revoke all on %s from authenticated', r.rel); end if;
  end loop;
  for r in
    select p.oid::regprocedure as fn
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'boxing\_%'
  loop
    execute format('revoke all on function %s from public', r.fn);
    if v_has_anon then execute format('revoke all on function %s from anon', r.fn); end if;
    if v_has_auth then execute format('revoke all on function %s from authenticated', r.fn); end if;
  end loop;
end $$;

-- ===========================================================================
-- H2. No cascading/set-null deletes anywhere in the graph
-- ===========================================================================
-- 0001/0002 used ON DELETE CASCADE from events -> bouts -> markets ->
-- selections -> ticks, and from bouts/events -> the fight-state ledger. One
-- mistaken DELETE of an event would silently erase immutable odds history,
-- scorecards, results and ledger checkpoints. SET NULL silently severs
-- provenance. Canonical entities are never hard-deleted: they are cancelled,
-- merged or retracted via status. Every FK becomes RESTRICT.

do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as rel, c.conname, pg_catalog.pg_get_constraintdef(c.oid) as def
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname like 'boxing\_%'
      and c.contype = 'f' and c.confdeltype in ('c','n','d')
  loop
    execute format('alter table %s drop constraint %I', r.rel, r.conname);
    execute format('alter table %s add constraint %I %s', r.rel, r.conname,
      regexp_replace(r.def, 'ON DELETE (CASCADE|SET NULL|SET DEFAULT)', 'ON DELETE RESTRICT'));
  end loop;
end $$;

-- ===========================================================================
-- H3. Source registry enforces SOURCE_POLICY.md
-- ===========================================================================
-- 0001 allowed enabled=true with access_mode='review_required' and
-- rights_state='unknown' (only 'blocked' was refused). The policy says a
-- source must be reviewed, with persistence/derivative/display rights
-- recorded, before automation. Those fields did not exist.

alter table public.boxing_sources
  add column if not exists intended_use text,
  add column if not exists persistence_allowed boolean not null default false,
  add column if not exists derivative_allowed boolean not null default false,
  add column if not exists display_allowed boolean not null default false,
  add column if not exists attribution_required text,
  add column if not exists rate_limit_note text,
  add column if not exists contract_reference text,
  add column if not exists reviewed_by text;

update public.boxing_sources
   set persistence_allowed = true, derivative_allowed = true, display_allowed = true,
       intended_use = coalesce(intended_use, 'First-party normalized and derived records.'),
       reviewed_by = coalesce(reviewed_by, 'schema seed 20260912000001')
 where source_key = 'pbe_boxing_internal';

update public.boxing_sources
   set persistence_allowed = true, derivative_allowed = true, display_allowed = true,
       terms_url = coalesce(terms_url, 'https://www.wikidata.org/wiki/Wikidata:Licensing'),
       intended_use = coalesce(intended_use, 'Identity/reference enrichment only (QIDs, DOB, nationality, labels).'),
       attribution_required = coalesce(attribution_required, 'None required (CC0); cite QID as provenance.'),
       rate_limit_note = coalesce(rate_limit_note, 'WDQS: descriptive User-Agent, serial queries, respect 429/Retry-After.'),
       reviewed_by = coalesce(reviewed_by, 'schema seed 20260912000001')
 where source_key = 'wikidata';

insert into public.boxing_sources
  (source_key, source_name, source_kind, license_name, access_mode, rights_state,
   redistribution_allowed, enabled, persistence_allowed, derivative_allowed, display_allowed,
   intended_use, rights_note, reviewed_at, reviewed_by)
values
  ('pbe_manual_review', 'PropBetEdge manual review decision', 'internal', 'internal', 'approved_ingest', 'internal',
   false, true, true, true, true,
   'Human review decisions (identity merges, conflict resolution). The evidence behind a decision stays attached to the upstream observations.',
   'A manual decision is provenance for the decision, not for the underlying fact.', now(), 'schema seed 20260912000003')
on conflict (source_key) do nothing;

alter table public.boxing_sources drop constraint if exists boxing_sources_check;
alter table public.boxing_sources drop constraint if exists boxing_sources_enable_requires_review;
alter table public.boxing_sources add constraint boxing_sources_enable_requires_review check (
  not enabled or (
    access_mode in ('approved_ingest','identity_only')
    and rights_state in ('internal','approved')
    and reviewed_at is not null
  )
);
-- persistence_allowed is enforced at the ingestion gate (H4), not in this
-- CHECK: CHECKs run before ON CONFLICT arbitration, so a CHECK on a column
-- 0001's seed rows do not set would make the migration chain non-rerunnable.

drop trigger if exists boxing_sources_touch on public.boxing_sources;
create trigger boxing_sources_touch before update on public.boxing_sources
  for each row execute function public.boxing_touch_updated_at();

-- ===========================================================================
-- H4. Raw observations: immutable, deduplicated, source-gated
-- ===========================================================================
-- 0001 stored canonicalized_at / canonical_entity_id ON the observation and
-- updated it after normalization — raw and normalized state mixed in one
-- mutable row, and one observation could only ever point at one entity.
-- content_hash was optional and not unique, so every rerun duplicated raw rows.

alter table public.boxing_source_observations
  drop column if exists canonicalized_at,
  drop column if exists canonical_entity_type,
  drop column if exists canonical_entity_id,
  add column if not exists source_published_at timestamptz;

update public.boxing_source_observations
   set content_hash = encode(sha256(convert_to(payload::text, 'UTF8')), 'hex')
 where content_hash is null;
alter table public.boxing_source_observations alter column content_hash set not null;

select public.boxing_ensure_constraint('public.boxing_source_observations',
  'boxing_observations_dedupe_key',
  'unique nulls not distinct (source_id, entity_type, external_key, content_hash)');
select public.boxing_ensure_constraint('public.boxing_source_observations',
  'boxing_observations_entity_type_format', $c$check (entity_type ~ '^[a-z][a-z0-9_]*$')$c$);
create index if not exists boxing_observations_run_idx on public.boxing_source_observations (ingest_run_id);

create or replace function public.boxing_observation_source_gate()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_src public.boxing_sources%rowtype;
begin
  select * into v_src from public.boxing_sources where id = new.source_id;
  if not found then
    raise exception 'source_not_registered: %', new.source_id using errcode = 'BX010';
  end if;
  if not v_src.enabled or not v_src.persistence_allowed
     or v_src.access_mode not in ('approved_ingest','identity_only') then
    raise exception 'source_not_ingestable: % (enabled=%, access_mode=%, rights_state=%, persistence_allowed=%)',
      v_src.source_key, v_src.enabled, v_src.access_mode, v_src.rights_state, v_src.persistence_allowed
      using errcode = 'BX010',
            hint = 'Review the source under docs/SOURCE_POLICY.md before automated collection.';
  end if;
  if v_src.access_mode = 'identity_only' and new.entity_type not like '%identity' then
    raise exception 'source_identity_only: % may only write *identity observations, got %',
      v_src.source_key, new.entity_type using errcode = 'BX011';
  end if;
  return new;
end $$;

drop trigger if exists boxing_observation_source_gate on public.boxing_source_observations;
create trigger boxing_observation_source_gate before insert on public.boxing_source_observations
  for each row execute function public.boxing_observation_source_gate();
select public.boxing_install_append_only('public.boxing_source_observations');

-- One observation can support many canonical rows, and one canonical row can
-- be supported (or contradicted) by many observations. Links are append-only.
create table if not exists public.boxing_observation_links (
  id bigserial primary key,
  observation_id uuid not null references public.boxing_source_observations(id) on delete restrict,
  entity_type text not null check (entity_type ~ '^[a-z][a-z0-9_]*$'),
  entity_id text not null,
  link_role text not null default 'supports' check (link_role in ('created','supports','matched','contradicts','superseded')),
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  unique (observation_id, entity_type, entity_id, link_role)
);
create index if not exists boxing_observation_links_entity_idx on public.boxing_observation_links (entity_type, entity_id);
select public.boxing_install_append_only('public.boxing_observation_links');

alter table public.boxing_ingest_runs
  add column if not exists duplicates_skipped int not null default 0,
  add column if not exists metrics jsonb not null default '{}'::jsonb;

-- ===========================================================================
-- H5. Identity mappings
-- ===========================================================================
-- unique(namespace, external_id) covered REJECTED rows too, so recording
-- "provider id X is NOT fighter A" blocked ever mapping X to the right fighter.
-- Uniqueness now applies to live (non-rejected) mappings only.

alter table public.boxing_fighter_identities drop constraint if exists boxing_fighter_identities_namespace_external_id_key;
create unique index if not exists boxing_fighter_identities_live_key
  on public.boxing_fighter_identities (namespace, external_id) where verification_state <> 'rejected';
create unique index if not exists boxing_fighter_identities_rejected_key
  on public.boxing_fighter_identities (namespace, external_id, fighter_id) where verification_state = 'rejected';
select public.boxing_ensure_constraint('public.boxing_fighter_identities',
  'boxing_fighter_identities_namespace_format', $c$check (namespace ~ '^[a-z][a-z0-9_.:-]*$')$c$);

alter table public.boxing_official_identities drop constraint if exists boxing_official_identities_namespace_external_id_key;
create unique index if not exists boxing_official_identities_live_key
  on public.boxing_official_identities (namespace, external_id) where verification_state <> 'rejected';

-- Merge chains (A -> B -> C) make every lookup recursive and let cycles form.
-- A fighter may only be merged into a fighter that is not itself merged, and a
-- fighter that others point at cannot be merged away.
create or replace function public.boxing_merge_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_target_state text;
begin
  if new.merged_into_id is not null then
    execute format('select identity_state from %I.%I where id = $1', tg_table_schema, tg_table_name)
      into v_target_state using new.merged_into_id;
    if v_target_state = 'merged' then
      raise exception 'merge_chain_violation: target % is itself merged', new.merged_into_id using errcode = 'BX020';
    end if;
    execute format('select case when exists (select 1 from %I.%I where merged_into_id = $1) then ''merged'' end',
                   tg_table_schema, tg_table_name) into v_target_state using new.id;
    if v_target_state is not null then
      raise exception 'merge_chain_violation: % is a merge target and cannot itself be merged', new.id using errcode = 'BX020';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.identity_state = 'merged' and new.identity_state <> 'merged' then
    raise exception 'merge_irreversible: unmerge by creating a new canonical record, not by editing %', old.id
      using errcode = 'BX020';
  end if;
  return new;
end $$;

drop trigger if exists boxing_fighters_merge_guard on public.boxing_fighters;
create trigger boxing_fighters_merge_guard before insert or update on public.boxing_fighters
  for each row execute function public.boxing_merge_guard();
drop trigger if exists boxing_officials_merge_guard on public.boxing_officials;
create trigger boxing_officials_merge_guard before insert or update on public.boxing_officials
  for each row execute function public.boxing_merge_guard();

-- Canonical public ids are published outward; they may never be rewritten.
do $$
declare t text;
begin
  foreach t in array array['boxing_fighters','boxing_officials','boxing_organizations','boxing_commissions',
                           'boxing_venues','boxing_events','boxing_bouts','boxing_titles']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_freeze_public_id', t);
    execute format('create trigger %I before update on public.%I for each row '
                   'execute function public.boxing_freeze_columns(''public_id'')', t || '_freeze_public_id', t);
  end loop;
end $$;

-- Events and bouts were keyed to ONE source via unique(source_id, external_id):
-- a promoter id and an odds-provider id for the same bout could never both
-- attach. External ids now live in identity tables, like fighters.
create table if not exists public.boxing_event_identities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.boxing_events(id) on delete restrict,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  namespace text not null check (namespace ~ '^[a-z][a-z0-9_.:-]*$'),
  external_id text not null,
  external_url text,
  verification_state text not null default 'review' check (verification_state in ('verified','probable','review','rejected')),
  confidence smallint not null default 0 check (confidence between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now()
);
create unique index if not exists boxing_event_identities_live_key
  on public.boxing_event_identities (namespace, external_id) where verification_state <> 'rejected';
create index if not exists boxing_event_identities_event_idx on public.boxing_event_identities (event_id);

create table if not exists public.boxing_bout_identities (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references public.boxing_bouts(id) on delete restrict,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  namespace text not null check (namespace ~ '^[a-z][a-z0-9_.:-]*$'),
  external_id text not null,
  external_url text,
  verification_state text not null default 'review' check (verification_state in ('verified','probable','review','rejected')),
  confidence smallint not null default 0 check (confidence between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now()
);
create unique index if not exists boxing_bout_identities_live_key
  on public.boxing_bout_identities (namespace, external_id) where verification_state <> 'rejected';
create index if not exists boxing_bout_identities_bout_idx on public.boxing_bout_identities (bout_id);

-- ===========================================================================
-- H6. Entity types stay distinct: promoter != sanctioning body != broadcaster
-- ===========================================================================
-- boxing_organizations holds several kinds in one table with nothing stopping
-- a title or ranking from pointing at a promoter or broadcaster, or an event
-- "sanctioning_body" role from pointing at a TV network. Record keepers
-- (BoxRec as an entity) and independent ranking boards (TBRB) had no kind.

alter table public.boxing_organizations drop constraint if exists boxing_organizations_organization_kind_check;
alter table public.boxing_organizations add constraint boxing_organizations_organization_kind_check check (
  organization_kind in ('sanctioning_body','governing_body','promoter','broadcaster','media',
                        'ranking_body','record_keeper','other'));
alter table public.boxing_organizations
  add column if not exists sanctioning_scope text;
alter table public.boxing_organizations drop constraint if exists boxing_organizations_sanctioning_scope_check;
alter table public.boxing_organizations add constraint boxing_organizations_sanctioning_scope_check check (
  sanctioning_scope is null or (
    organization_kind in ('sanctioning_body','governing_body','ranking_body')
    and sanctioning_scope in ('world','continental','regional','national','other')));

drop trigger if exists boxing_organizations_freeze_kind on public.boxing_organizations;
create trigger boxing_organizations_freeze_kind before update on public.boxing_organizations
  for each row execute function public.boxing_freeze_columns('organization_kind');
drop trigger if exists boxing_organizations_touch on public.boxing_organizations;
create trigger boxing_organizations_touch before update on public.boxing_organizations
  for each row execute function public.boxing_touch_updated_at();

create or replace function public.boxing_assert_org_kind()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_kind text;
  v_allowed text[];
  v_role text;
begin
  select organization_kind into v_kind from public.boxing_organizations where id = new.organization_id;
  if tg_table_name = 'boxing_event_organizations' then
    v_role := new.role;
    v_allowed := case v_role
      when 'promoter' then array['promoter']
      when 'co_promoter' then array['promoter']
      when 'broadcaster' then array['broadcaster']
      when 'sanctioning_body' then array['sanctioning_body','governing_body']
      else array['sanctioning_body','governing_body','promoter','broadcaster','media','ranking_body','record_keeper','other']
    end;
  else
    -- titles and ranking snapshots: bodies that issue belts/rankings.
    -- media is allowed because The Ring issues a championship and rankings.
    v_allowed := array['sanctioning_body','governing_body','ranking_body','media'];
  end if;
  if v_kind is null or not (v_kind = any (v_allowed)) then
    raise exception 'organization_kind_violation: organization % of kind % cannot be used by % %',
      new.organization_id, coalesce(v_kind, 'missing'), tg_table_name, coalesce(' as role ' || v_role, '')
      using errcode = 'BX030';
  end if;
  return new;
end $$;

drop trigger if exists boxing_titles_org_kind on public.boxing_titles;
create trigger boxing_titles_org_kind before insert or update of organization_id on public.boxing_titles
  for each row execute function public.boxing_assert_org_kind();
drop trigger if exists boxing_ranking_snapshots_org_kind on public.boxing_ranking_snapshots;
create trigger boxing_ranking_snapshots_org_kind before insert on public.boxing_ranking_snapshots
  for each row execute function public.boxing_assert_org_kind();
drop trigger if exists boxing_event_orgs_org_kind on public.boxing_event_organizations;
create trigger boxing_event_orgs_org_kind before insert or update on public.boxing_event_organizations
  for each row execute function public.boxing_assert_org_kind();

-- ===========================================================================
-- H7. Weight classes
-- ===========================================================================
-- Canonical divisions were never seeded, and sanctioning bodies name the same
-- limit differently (WBA "super lightweight" = "junior welterweight" =
-- "light welterweight"; WBC/WBA bridgerweight has no IBF/WBO equivalent).
-- Limits below are the current professional rule limits. Contracted weights
-- live on the bout; this table is not a substitute for them.

insert into public.boxing_weight_classes (class_key, name, alternate_names, max_weight_lb, max_weight_kg, gender_scope, notes)
values
  ('atomweight',          'Atomweight',          '{}',                                                     102, 46.27, 'female', 'Women''s division only.'),
  ('minimumweight',       'Minimumweight',       '{strawweight,"mini flyweight"}',                         105, 47.63, 'all', null),
  ('light_flyweight',     'Light flyweight',     '{"junior flyweight"}',                                   108, 48.99, 'all', null),
  ('flyweight',           'Flyweight',           '{}',                                                     112, 50.80, 'all', null),
  ('super_flyweight',     'Super flyweight',     '{"junior bantamweight"}',                                115, 52.16, 'all', null),
  ('bantamweight',        'Bantamweight',        '{}',                                                     118, 53.52, 'all', null),
  ('super_bantamweight',  'Super bantamweight',  '{"junior featherweight"}',                               122, 55.34, 'all', null),
  ('featherweight',       'Featherweight',       '{}',                                                     126, 57.15, 'all', null),
  ('super_featherweight', 'Super featherweight', '{"junior lightweight"}',                                 130, 58.97, 'all', null),
  ('lightweight',         'Lightweight',         '{}',                                                     135, 61.23, 'all', null),
  ('super_lightweight',   'Super lightweight',   '{"junior welterweight","light welterweight"}',           140, 63.50, 'all', null),
  ('welterweight',        'Welterweight',        '{}',                                                     147, 66.68, 'all', null),
  ('super_welterweight',  'Super welterweight',  '{"junior middleweight","light middleweight"}',           154, 69.85, 'all', null),
  ('middleweight',        'Middleweight',        '{}',                                                     160, 72.57, 'all', null),
  ('super_middleweight',  'Super middleweight',  '{}',                                                     168, 76.20, 'all', null),
  ('light_heavyweight',   'Light heavyweight',   '{}',                                                     175, 79.38, 'all', null),
  ('cruiserweight',       'Cruiserweight',       '{"junior heavyweight"}',                                 200, 90.72, 'all', 'Limit was 190 lb before the early 2000s; historical bouts must use contracted weight, not this row.'),
  ('bridgerweight',       'Bridgerweight',       '{}',                                                     224, 101.60, 'all', 'Recognized by WBC and WBA; not by IBF or WBO.'),
  ('heavyweight',         'Heavyweight',         '{}',                                                     null, null, 'all', 'No upper limit.')
on conflict (class_key) do nothing;

create table if not exists public.boxing_weight_class_aliases (
  id uuid primary key default gen_random_uuid(),
  weight_class_id uuid not null references public.boxing_weight_classes(id) on delete restrict,
  organization_id uuid references public.boxing_organizations(id) on delete restrict,
  alias text not null,
  normalized text not null,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  created_at timestamptz not null default now(),
  constraint boxing_weight_class_aliases_key unique nulls not distinct (organization_id, normalized)
);

-- ===========================================================================
-- H8. Bouts: historical round counts, composite keys for cross-wire safety
-- ===========================================================================
-- Rounds were capped at 15. Championship bouts were scheduled for 20-45 rounds
-- before the modern era (Johnson-Willard 1915 was scheduled for 45), and the
-- planned historical backfill would be rejected. Round checks now allow 1..45.

alter table public.boxing_bouts drop constraint if exists boxing_bouts_scheduled_rounds_check;
alter table public.boxing_bouts add constraint boxing_bouts_scheduled_rounds_check
  check (scheduled_rounds is null or scheduled_rounds between 1 and 45);
alter table public.boxing_bouts drop constraint if exists boxing_bouts_status_check;
alter table public.boxing_bouts add constraint boxing_bouts_status_check check (
  status in ('announced','scheduled','in_progress','complete','postponed','cancelled','replaced','unknown'));
alter table public.boxing_bouts
  add column if not exists contracted_weight_kg numeric(7,3),
  add column if not exists is_catchweight boolean,
  add column if not exists weight_source_unit text;
alter table public.boxing_bouts drop constraint if exists boxing_bouts_weight_source_unit_check;
alter table public.boxing_bouts add constraint boxing_bouts_weight_source_unit_check
  check (weight_source_unit is null or weight_source_unit in ('lb','kg','stone_lb'));
select public.boxing_ensure_constraint('public.boxing_bouts', 'boxing_bouts_id_event_key', 'unique (id, event_id)');

alter table public.boxing_bout_results drop constraint if exists boxing_bout_results_round_check;
alter table public.boxing_bout_results add constraint boxing_bout_results_round_check
  check (round is null or round between 1 and 45);
alter table public.boxing_scorecard_rounds drop constraint if exists boxing_scorecard_rounds_round_check;
alter table public.boxing_scorecard_rounds add constraint boxing_scorecard_rounds_round_check
  check (round between 1 and 45);
alter table public.boxing_round_punch_stats drop constraint if exists boxing_round_punch_stats_round_check;
alter table public.boxing_round_punch_stats add constraint boxing_round_punch_stats_round_check
  check (round between 1 and 45);

-- A fighter referenced by a bout-scoped fact must actually be in that bout.
select public.boxing_ensure_constraint('public.boxing_round_punch_stats', 'boxing_round_punch_stats_participant_fkey',
  'foreign key (bout_id, fighter_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict');
select public.boxing_ensure_constraint('public.boxing_matchup_snapshots', 'boxing_matchup_snapshots_a_participant_fkey',
  'foreign key (bout_id, fighter_a_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict');
select public.boxing_ensure_constraint('public.boxing_matchup_snapshots', 'boxing_matchup_snapshots_b_participant_fkey',
  'foreign key (bout_id, fighter_b_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict');

-- ===========================================================================
-- H9. Results are versioned, with boxing-correct method semantics
-- ===========================================================================
-- (a) bout_id was the primary key, so a commission overturning a win to a no
--     contest (failed drug test) could only be recorded by destroying the
--     original official result.
-- (b) method mixed outcome and method: 'DRAW' lost unanimous/split/majority
--     draw; 'TD' was ambiguous between technical decision and technical draw;
--     PTS (referee-scored decisions) and historical newspaper decisions had no
--     representation.
-- (c) winner_id was not required to be a participant in the bout.

do $$
begin
  if exists (select 1 from pg_catalog.pg_constraint
             where conname = 'boxing_bout_results_pkey'
               and pg_catalog.pg_get_constraintdef(oid) = 'PRIMARY KEY (bout_id)') then
    alter table public.boxing_bout_results drop constraint boxing_bout_results_pkey;
    alter table public.boxing_bout_results add column id uuid not null default gen_random_uuid();
    alter table public.boxing_bout_results add constraint boxing_bout_results_pkey primary key (id);
  end if;
end $$;

alter table public.boxing_bout_results
  add column if not exists revision int not null default 1,
  add column if not exists supersedes_id uuid,
  add column if not exists result_state text not null default 'official',
  add column if not exists decision_type text,
  add column if not exists decided_at timestamptz,
  add column if not exists change_reason text,
  add column if not exists observation_id uuid references public.boxing_source_observations(id) on delete restrict;

alter table public.boxing_bout_results drop constraint if exists boxing_bout_results_outcome_check;
alter table public.boxing_bout_results drop constraint if exists boxing_bout_results_method_check;
alter table public.boxing_bout_results drop constraint if exists boxing_bout_results_semantics_check;
alter table public.boxing_bout_results drop constraint if exists boxing_bout_results_decision_type_check;
alter table public.boxing_bout_results drop constraint if exists boxing_bout_results_state_check;
alter table public.boxing_bout_results drop constraint if exists boxing_bout_results_time_sec_check;
alter table public.boxing_bout_results drop constraint if exists boxing_bout_results_revision_check;

update public.boxing_bout_results set outcome = 'draw', method = 'TECHNICAL_DECISION' where outcome = 'technical_draw';
update public.boxing_bout_results set method = case method
    when 'UD' then 'DECISION' when 'SD' then 'DECISION' when 'MD' then 'DECISION'
    when 'TD' then 'TECHNICAL_DECISION' when 'NC' then 'NO_CONTEST' when 'DRAW' then 'DECISION'
    else method end
  where method in ('UD','SD','MD','TD','NC','DRAW');

alter table public.boxing_bout_results add constraint boxing_bout_results_outcome_check
  check (outcome in ('win','draw','no_contest','no_decision','unknown'));
alter table public.boxing_bout_results add constraint boxing_bout_results_method_check check (
  method is null or method in ('KO','TKO','RTD','DQ','DECISION','TECHNICAL_DECISION','NO_CONTEST','NO_DECISION','OTHER'));
alter table public.boxing_bout_results add constraint boxing_bout_results_decision_type_check check (
  decision_type is null or decision_type in ('unanimous','split','majority','referee','newspaper'));
alter table public.boxing_bout_results add constraint boxing_bout_results_state_check check (
  result_state in ('provisional','official','amended','overturned'));
alter table public.boxing_bout_results add constraint boxing_bout_results_time_sec_check
  check (time_sec is null or time_sec between 0 and 300);
alter table public.boxing_bout_results add constraint boxing_bout_results_revision_check check (
  revision >= 1 and ((revision = 1) = (supersedes_id is null)));
alter table public.boxing_bout_results add constraint boxing_bout_results_semantics_check check (
  -- stoppages and DQs always produce a winner
  (method is null or method not in ('KO','TKO','RTD','DQ') or outcome = 'win')
  and (method is distinct from 'NO_CONTEST' or outcome = 'no_contest')
  and (method is distinct from 'NO_DECISION' or outcome = 'no_decision')
  and (outcome <> 'no_contest' or method is null or method in ('NO_CONTEST','OTHER'))
  and (outcome <> 'draw' or method is null or method in ('DECISION','TECHNICAL_DECISION','OTHER'))
  -- a decision type only qualifies a decision
  and (decision_type is null or method in ('DECISION','TECHNICAL_DECISION','NO_DECISION'))
  and (decision_type is distinct from 'newspaper' or outcome in ('win','draw','no_decision'))
);

select public.boxing_ensure_constraint('public.boxing_bout_results', 'boxing_bout_results_id_bout_key', 'unique (id, bout_id)');
select public.boxing_ensure_constraint('public.boxing_bout_results', 'boxing_bout_results_revision_key', 'unique (bout_id, revision)');
select public.boxing_ensure_constraint('public.boxing_bout_results', 'boxing_bout_results_supersedes_fkey',
  'foreign key (supersedes_id, bout_id) references public.boxing_bout_results(id, bout_id) on delete restrict');
select public.boxing_ensure_constraint('public.boxing_bout_results', 'boxing_bout_results_winner_participant_fkey',
  'foreign key (bout_id, winner_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict');
create unique index if not exists boxing_bout_results_single_successor
  on public.boxing_bout_results (supersedes_id) where supersedes_id is not null;
select public.boxing_install_append_only('public.boxing_bout_results');

create or replace view public.boxing_bout_results_current with (security_invoker = true) as
select r.*
from public.boxing_bout_results r
where not exists (select 1 from public.boxing_bout_results n where n.supersedes_id = r.id);

-- ===========================================================================
-- H10. Scorecards: versions, deductions, referee-only scoring, half points
-- ===========================================================================
-- unique(bout_id, judge_id) meant a commission-corrected card (addition
-- errors happen) overwrote the original. Nothing tied fighter_a/b to the bout's
-- participants. Integer points could not hold historical half-point cards.
-- UK small-hall bouts are scored by the referee alone. Point deductions had
-- nowhere to live, and cards never said whether scores are pre/post deduction.

alter table public.boxing_scorecards drop constraint if exists boxing_scorecards_bout_id_judge_id_key;
alter table public.boxing_scorecards
  add column if not exists revision int not null default 1,
  add column if not exists supersedes_id uuid,
  add column if not exists card_state text not null default 'official',
  add column if not exists scorer_role text not null default 'judge',
  add column if not exists score_basis text not null default 'unknown',
  add column if not exists slot smallint,
  add column if not exists change_reason text,
  add column if not exists observation_id uuid references public.boxing_source_observations(id) on delete restrict;
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'boxing_scorecards' and column_name = 'fighter_a_total') = 'integer' then
    alter table public.boxing_scorecards alter column fighter_a_total type numeric(5,1);
    alter table public.boxing_scorecards alter column fighter_b_total type numeric(5,1);
    alter table public.boxing_scorecard_rounds alter column fighter_a_points type numeric(4,1);
    alter table public.boxing_scorecard_rounds alter column fighter_b_points type numeric(4,1);
  end if;
end $$;

alter table public.boxing_scorecards drop constraint if exists boxing_scorecards_card_state_check;
alter table public.boxing_scorecards add constraint boxing_scorecards_card_state_check
  check (card_state in ('official','corrected','unofficial'));
alter table public.boxing_scorecards drop constraint if exists boxing_scorecards_scorer_role_check;
alter table public.boxing_scorecards add constraint boxing_scorecards_scorer_role_check
  check (scorer_role in ('judge','referee'));
alter table public.boxing_scorecards drop constraint if exists boxing_scorecards_score_basis_check;
alter table public.boxing_scorecards add constraint boxing_scorecards_score_basis_check
  check (score_basis in ('after_deductions','before_deductions','unknown'));
alter table public.boxing_scorecards drop constraint if exists boxing_scorecards_decision_for_check;
alter table public.boxing_scorecards add constraint boxing_scorecards_decision_for_check
  check (decision_for_id is null or decision_for_id in (fighter_a_id, fighter_b_id));
alter table public.boxing_scorecards drop constraint if exists boxing_scorecards_revision_check;
alter table public.boxing_scorecards add constraint boxing_scorecards_revision_check
  check (revision >= 1 and ((revision = 1) = (supersedes_id is null)));

select public.boxing_ensure_constraint('public.boxing_scorecards', 'boxing_scorecards_revision_key', 'unique (bout_id, judge_id, revision)');
select public.boxing_ensure_constraint('public.boxing_scorecards', 'boxing_scorecards_id_bout_key', 'unique (id, bout_id)');
select public.boxing_ensure_constraint('public.boxing_scorecards', 'boxing_scorecards_supersedes_fkey',
  'foreign key (supersedes_id, bout_id) references public.boxing_scorecards(id, bout_id) on delete restrict');
select public.boxing_ensure_constraint('public.boxing_scorecards', 'boxing_scorecards_a_participant_fkey',
  'foreign key (bout_id, fighter_a_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict');
select public.boxing_ensure_constraint('public.boxing_scorecards', 'boxing_scorecards_b_participant_fkey',
  'foreign key (bout_id, fighter_b_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict');
create unique index if not exists boxing_scorecards_single_successor
  on public.boxing_scorecards (supersedes_id) where supersedes_id is not null;
create index if not exists boxing_scorecards_judge_idx on public.boxing_scorecards (judge_id, bout_id);

select public.boxing_install_append_only('public.boxing_scorecards');
select public.boxing_install_append_only('public.boxing_scorecard_rounds');

create or replace view public.boxing_scorecards_current with (security_invoker = true) as
select s.*
from public.boxing_scorecards s
where not exists (select 1 from public.boxing_scorecards n where n.supersedes_id = s.id);

create table if not exists public.boxing_point_deductions (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references public.boxing_bouts(id) on delete restrict,
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  round int not null check (round between 1 and 45),
  points numeric(3,1) not null check (points > 0),
  reason_public text,
  referee_official_id uuid references public.boxing_officials(id) on delete restrict,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  captured_at timestamptz not null default now(),
  foreign key (bout_id, fighter_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict
);
create index if not exists boxing_point_deductions_bout_idx on public.boxing_point_deductions (bout_id, round);
select public.boxing_install_append_only('public.boxing_point_deductions');

-- ===========================================================================
-- H11. Weigh-ins: kinds, units, verification, corrections
-- ===========================================================================
-- The IBF fight-morning rehydration check is a second, separate weigh-in with
-- its own limit; one row per (bout, fighter, attempt) could not distinguish it
-- from an official re-weigh. Weights were lb-only with no record of the
-- source unit (kg/stone), and a corrected weight overwrote the original.

alter table public.boxing_weigh_ins drop constraint if exists boxing_weigh_ins_bout_id_fighter_id_attempt_no_key;
alter table public.boxing_weigh_ins
  add column if not exists weigh_in_kind text not null default 'official',
  add column if not exists official_weight_kg numeric(7,3),
  add column if not exists source_unit text,
  add column if not exists source_weight_raw text,
  add column if not exists verification_state text not null default 'unverified',
  add column if not exists revision int not null default 1,
  add column if not exists supersedes_id uuid,
  add column if not exists observation_id uuid references public.boxing_source_observations(id) on delete restrict;

alter table public.boxing_weigh_ins drop constraint if exists boxing_weigh_ins_kind_check;
alter table public.boxing_weigh_ins add constraint boxing_weigh_ins_kind_check
  check (weigh_in_kind in ('official','rehydration_check','fight_day_check','ceremonial','unknown'));
alter table public.boxing_weigh_ins drop constraint if exists boxing_weigh_ins_source_unit_check;
alter table public.boxing_weigh_ins add constraint boxing_weigh_ins_source_unit_check
  check (source_unit is null or source_unit in ('lb','kg','stone_lb'));
alter table public.boxing_weigh_ins drop constraint if exists boxing_weigh_ins_verification_check;
alter table public.boxing_weigh_ins add constraint boxing_weigh_ins_verification_check
  check (verification_state in ('verified','reported','unverified'));
alter table public.boxing_weigh_ins drop constraint if exists boxing_weigh_ins_miss_check;
alter table public.boxing_weigh_ins add constraint boxing_weigh_ins_miss_check check (
  (miss_lb is null or miss_lb >= 0)
  and (status <> 'made_weight' or miss_lb is null or miss_lb = 0)
  and (status <> 'missed_weight' or miss_lb is null or miss_lb > 0));
alter table public.boxing_weigh_ins drop constraint if exists boxing_weigh_ins_revision_check;
alter table public.boxing_weigh_ins add constraint boxing_weigh_ins_revision_check
  check (revision >= 1 and ((revision = 1) = (supersedes_id is null)));
select public.boxing_ensure_constraint('public.boxing_weigh_ins', 'boxing_weigh_ins_revision_key',
  'unique (bout_id, fighter_id, weigh_in_kind, attempt_no, revision)');
select public.boxing_ensure_constraint('public.boxing_weigh_ins', 'boxing_weigh_ins_id_bout_key', 'unique (id, bout_id)');
select public.boxing_ensure_constraint('public.boxing_weigh_ins', 'boxing_weigh_ins_supersedes_fkey',
  'foreign key (supersedes_id, bout_id) references public.boxing_weigh_ins(id, bout_id) on delete restrict');
select public.boxing_ensure_constraint('public.boxing_weigh_ins', 'boxing_weigh_ins_participant_fkey',
  'foreign key (bout_id, fighter_id) references public.boxing_bout_participants(bout_id, fighter_id) on delete restrict');
create unique index if not exists boxing_weigh_ins_single_successor
  on public.boxing_weigh_ins (supersedes_id) where supersedes_id is not null;
select public.boxing_install_append_only('public.boxing_weigh_ins');

-- ===========================================================================
-- H12. Rankings: snapshots are immutable; entries allow champions and gaps
-- ===========================================================================
-- (a) unique(org, class, source, published_on, effective_on) treats NULL dates
--     as distinct, so re-ingesting an undated snapshot duplicated it forever.
-- (b) primary key (snapshot_id, rank) cannot represent a WBA division that
--     lists a Super champion, a Regular champion and an Interim champion at
--     the top (all unnumbered), nor IBF lists where #1/#2 are "not rated".
-- (c) a source correction could only be expressed by rewriting the snapshot.

alter table public.boxing_ranking_snapshots
  drop constraint if exists boxing_ranking_snapshots_organization_id_weight_class_id_so_key;
alter table public.boxing_ranking_snapshots
  add column if not exists revision int not null default 1,
  add column if not exists supersedes_id uuid references public.boxing_ranking_snapshots(id) on delete restrict,
  add column if not exists content_hash text,
  add column if not exists observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  add column if not exists correction_note text;
alter table public.boxing_ranking_snapshots drop constraint if exists boxing_ranking_snapshots_dated_check;
alter table public.boxing_ranking_snapshots add constraint boxing_ranking_snapshots_dated_check
  check (published_on is not null or effective_on is not null);
alter table public.boxing_ranking_snapshots drop constraint if exists boxing_ranking_snapshots_revision_check;
alter table public.boxing_ranking_snapshots add constraint boxing_ranking_snapshots_revision_check
  check (revision >= 1 and ((revision = 1) = (supersedes_id is null)));
select public.boxing_ensure_constraint('public.boxing_ranking_snapshots', 'boxing_ranking_snapshots_key',
  'unique nulls not distinct (organization_id, weight_class_id, source_id, published_on, effective_on, revision)');
create unique index if not exists boxing_ranking_snapshots_single_successor
  on public.boxing_ranking_snapshots (supersedes_id) where supersedes_id is not null;

do $$
begin
  if exists (select 1 from pg_catalog.pg_constraint
             where conname = 'boxing_ranking_entries_pkey'
               and pg_catalog.pg_get_constraintdef(oid) = 'PRIMARY KEY (snapshot_id, rank)') then
    alter table public.boxing_ranking_entries drop constraint boxing_ranking_entries_pkey;
    alter table public.boxing_ranking_entries add column if not exists position int;
    update public.boxing_ranking_entries set position = rank where position is null;
    alter table public.boxing_ranking_entries alter column position set not null;
    alter table public.boxing_ranking_entries alter column rank drop not null;
    alter table public.boxing_ranking_entries add constraint boxing_ranking_entries_pkey primary key (snapshot_id, position);
  end if;
end $$;

alter table public.boxing_ranking_entries
  add column if not exists rank_label text,
  add column if not exists is_vacant boolean not null default false,
  add column if not exists is_champion boolean not null default false;
alter table public.boxing_ranking_entries drop constraint if exists boxing_ranking_entries_position_check;
alter table public.boxing_ranking_entries add constraint boxing_ranking_entries_position_check check (position >= 1);
alter table public.boxing_ranking_entries drop constraint if exists boxing_ranking_entries_subject_check;
alter table public.boxing_ranking_entries add constraint boxing_ranking_entries_subject_check check (
  (is_vacant and fighter_id is null)
  or (not is_vacant and (fighter_id is not null or source_name is not null)));
create index if not exists boxing_ranking_entries_fighter_idx on public.boxing_ranking_entries (fighter_id);

select public.boxing_install_append_only('public.boxing_ranking_snapshots');
select public.boxing_install_append_only('public.boxing_ranking_entries');

-- ===========================================================================
-- H13. Markets: natural keys, typed markets, immutable ticks
-- ===========================================================================
-- unique(provider, bookmaker, external_market_id) with a nullable id allowed
-- unlimited duplicate markets (The Odds API has no market ids). market_type
-- was free text. Ticks had no append-only protection, no link to the payload
-- that produced them, no live flag, and accepted impossible American odds
-- (e.g. +50).

alter table public.boxing_markets drop constraint if exists boxing_markets_provider_id_bookmaker_id_external_market_id_key;
alter table public.boxing_markets add column if not exists market_key text;
update public.boxing_markets
   set market_key = market_type || '|' || period || '|' || coalesce(line::text, '-') || '|' || coalesce(external_market_id, id::text)
 where market_key is null;
alter table public.boxing_markets alter column market_key set not null;
select public.boxing_ensure_constraint('public.boxing_markets', 'boxing_markets_natural_key',
  'unique (provider_id, bookmaker_id, bout_id, market_key)');
alter table public.boxing_markets drop constraint if exists boxing_markets_market_type_check;
alter table public.boxing_markets add constraint boxing_markets_market_type_check check (market_type in (
  'moneyline','moneyline_3way','draw','goes_distance','total_rounds','method_of_victory',
  'win_by_ko_tko','win_by_decision','exact_round','round_group','other'));
create index if not exists boxing_markets_provider_book_idx on public.boxing_markets (provider_id, bookmaker_id);
create index if not exists boxing_market_selections_fighter_idx on public.boxing_market_selections (fighter_id);

alter table public.boxing_market_ticks
  add column if not exists is_live boolean not null default false,
  add column if not exists market_status text not null default 'open',
  add column if not exists observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  add column if not exists ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict;
alter table public.boxing_market_ticks drop constraint if exists boxing_market_ticks_american_check;
alter table public.boxing_market_ticks add constraint boxing_market_ticks_american_check
  check (american_odds is null or american_odds <= -100 or american_odds >= 100);
alter table public.boxing_market_ticks drop constraint if exists boxing_market_ticks_implied_check;
alter table public.boxing_market_ticks add constraint boxing_market_ticks_implied_check
  check (implied_probability is null or (implied_probability > 0 and implied_probability <= 1));
alter table public.boxing_market_ticks drop constraint if exists boxing_market_ticks_price_present_check;
alter table public.boxing_market_ticks add constraint boxing_market_ticks_price_present_check
  check (market_status <> 'open' or decimal_odds is not null or american_odds is not null);
alter table public.boxing_market_ticks drop constraint if exists boxing_market_ticks_market_status_check;
alter table public.boxing_market_ticks add constraint boxing_market_ticks_market_status_check
  check (market_status in ('open','suspended','closed','settled','unknown'));
select public.boxing_install_append_only('public.boxing_market_ticks');

-- ===========================================================================
-- H14. Structured news events: aligned taxonomy, mandatory provenance
-- ===========================================================================
-- The event type list lacked TITLE_WON / TITLE_VACATED / TITLE_STRIPPED /
-- VENUE_CHANGED / FIGHT_POSTPONED / RESULT_OVERTURNED. Provenance lived only
-- inside free-form payload, so an event with no sources was accepted. A single
-- fighter_id could not reference both boxers of an announced fight. Payloads
-- were mutable after detection.

update public.boxing_news_events set event_type = case event_type
    when 'BOUT_CANCELLED' then 'FIGHT_CANCELLED'
    when 'WEIGH_IN_RECORDED' then 'WEIGH_IN_RESULT'
    when 'SUSPENSION_STATUS_CHANGED' then 'SUSPENSION_POSTED'
    else event_type end
  where event_type in ('BOUT_CANCELLED','WEIGH_IN_RECORDED','SUSPENSION_STATUS_CHANGED');

alter table public.boxing_news_events drop constraint if exists boxing_news_events_event_type_check;
alter table public.boxing_news_events add constraint boxing_news_events_event_type_check check (event_type in (
  'FIGHT_ANNOUNCED','OPPONENT_REPLACED','FIGHT_CANCELLED','FIGHT_POSTPONED','EVENT_CANCELLED','EVENT_POSTPONED',
  'VENUE_CHANGED','TITLE_WON','TITLE_VACATED','TITLE_STRIPPED','TITLE_STATUS_CHANGED','RANKING_CHANGED',
  'WEIGH_IN_RESULT','WEIGHT_MISSED','OFFICIALS_ASSIGNED','RESULT_OFFICIAL','RESULT_OVERTURNED',
  'SCORECARD_POSTED','SUSPENSION_POSTED','MARKET_MOVED','OTHER'));

alter table public.boxing_news_events
  add column if not exists sources jsonb,
  add column if not exists fighter_ids uuid[] not null default '{}',
  add column if not exists supersedes_id uuid references public.boxing_news_events(id) on delete restrict,
  add column if not exists contract_version text not null default '1.1.0',
  add column if not exists state_changed_at timestamptz;
update public.boxing_news_events set sources = coalesce(payload -> 'sources', '[]'::jsonb) where sources is null;
alter table public.boxing_news_events alter column sources set not null;
alter table public.boxing_news_events drop constraint if exists boxing_news_events_sources_check;
alter table public.boxing_news_events add constraint boxing_news_events_sources_check
  check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) >= 1);

create index if not exists boxing_news_events_bout_idx on public.boxing_news_events (bout_id);
create index if not exists boxing_news_events_fighters_idx on public.boxing_news_events using gin (fighter_ids);

drop trigger if exists boxing_news_events_guard on public.boxing_news_events;
create trigger boxing_news_events_guard before update or delete on public.boxing_news_events
  for each row execute function public.boxing_guard_mutable_columns('state','state_changed_at');
drop trigger if exists boxing_news_events_truncate on public.boxing_news_events;
create trigger boxing_news_events_truncate before truncate on public.boxing_news_events
  for each statement execute function public.boxing_append_only();

-- ===========================================================================
-- H15. Fight-state ledger: immutable, cannot cross-wire bout and event
-- ===========================================================================
-- bout_id and boxing_event_id were independent FKs: a checkpoint could record
-- bout X under event Y. Nothing prevented UPDATE/DELETE, and identical
-- checkpoints were re-inserted on every run.

select public.boxing_ensure_constraint('public.boxing_fight_state_ledger', 'boxing_fight_state_ledger_bout_event_fkey',
  'foreign key (bout_id, boxing_event_id) references public.boxing_bouts(id, event_id) on delete restrict');
alter table public.boxing_fight_state_ledger add column if not exists state_hash text;

create or replace function public.boxing_ledger_state_hash()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.state_hash := encode(sha256(convert_to(jsonb_build_array(
    new.bout_state, new.participant_state, new.title_state, new.ranking_state,
    new.officials_state, new.weigh_in_state, new.market_state, new.source_digest)::text, 'UTF8')), 'hex');
  return new;
end $$;
drop trigger if exists boxing_fight_state_ledger_hash on public.boxing_fight_state_ledger;
create trigger boxing_fight_state_ledger_hash before insert on public.boxing_fight_state_ledger
  for each row execute function public.boxing_ledger_state_hash();
update public.boxing_fight_state_ledger set state_hash = encode(sha256(convert_to(jsonb_build_array(
    bout_state, participant_state, title_state, ranking_state, officials_state, weigh_in_state, market_state, source_digest)::text, 'UTF8')), 'hex')
  where state_hash is null;
alter table public.boxing_fight_state_ledger alter column state_hash set not null;
select public.boxing_ensure_constraint('public.boxing_fight_state_ledger', 'boxing_fight_state_ledger_dedupe_key',
  'unique (bout_id, checkpoint, state_hash)');
select public.boxing_install_append_only('public.boxing_fight_state_ledger');

-- ===========================================================================
-- H16. Derived intelligence is versioned and immutable
-- ===========================================================================
-- A metric definition's formula could be edited in place under the same
-- version, silently changing the meaning of every stored value. Snapshots were
-- mutable. Official tendencies could be stored without a sample size.

drop trigger if exists boxing_metric_definitions_guard on public.boxing_metric_definitions;
create trigger boxing_metric_definitions_guard before update or delete on public.boxing_metric_definitions
  for each row execute function public.boxing_guard_mutable_columns('retired_at');
select public.boxing_install_append_only('public.boxing_fighter_metric_snapshots');
select public.boxing_install_append_only('public.boxing_matchup_snapshots');
select public.boxing_install_append_only('public.boxing_official_metric_snapshots');

update public.boxing_official_metric_snapshots set sample_size = 0 where sample_size is null;
alter table public.boxing_official_metric_snapshots alter column sample_size set not null;

select public.boxing_install_append_only('public.boxing_history_override_log');

-- ===========================================================================
-- H17. updated_at maintenance and missing FK indexes
-- ===========================================================================

do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname like 'boxing\_%' and c.relkind = 'r'
      and a.attname = 'updated_at' and not a.attisdropped
  loop
    execute format('drop trigger if exists %I on public.%I', r.relname || '_touch', r.relname);
    execute format('create trigger %I before update on public.%I for each row execute function public.boxing_touch_updated_at()',
                   r.relname || '_touch', r.relname);
  end loop;
end $$;

create index if not exists boxing_bout_titles_title_idx on public.boxing_bout_titles (title_id);
create index if not exists boxing_title_reigns_won_bout_idx on public.boxing_title_reigns (won_bout_id);
create index if not exists boxing_events_venue_idx on public.boxing_events (venue_id);
create index if not exists boxing_events_commission_idx on public.boxing_events (commission_id);
create index if not exists boxing_bouts_weight_class_idx on public.boxing_bouts (weight_class_id);
create index if not exists boxing_event_organizations_org_idx on public.boxing_event_organizations (organization_id, role);
create index if not exists boxing_regulatory_commission_idx on public.boxing_regulatory_actions (commission_id);

select public.boxing_lockdown();

commit;
