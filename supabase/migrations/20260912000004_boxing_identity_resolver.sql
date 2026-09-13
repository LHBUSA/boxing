-- PropBetEdge Boxing — identity resolver storage and RPCs (issue #1)
--
-- The resolver itself is pure JS (shared/identity/). The database provides:
--   * retrieval indexes (name keys computed by shared/identity/normalize.mjs,
--     trigram search names, DOB)
--   * boxing_identity_candidates()      candidate objects for the resolver
--   * boxing_apply_identity_decision()  atomic, idempotent persistence
--   * an append-only resolution log that answers "why did PropBetEdge believe
--     this boxer was this person?"
-- Rerunnable.

begin;

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema extensions to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Retrieval indexes
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_fighter_name_keys (
  id bigserial primary key,
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  alias_id uuid references public.boxing_fighter_aliases(id) on delete restrict,
  key text not null check (key ~ '^(full|sorted|skel|joined|part|init|nick):'),
  created_at timestamptz not null default now(),
  unique (fighter_id, key)
);
create index if not exists boxing_fighter_name_keys_key_idx on public.boxing_fighter_name_keys (key);

create table if not exists public.boxing_fighter_search_names (
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (fighter_id, name)
);
create index if not exists boxing_fighter_search_names_trgm_idx
  on public.boxing_fighter_search_names using gin (name extensions.gin_trgm_ops);
create index if not exists boxing_fighters_dob_idx on public.boxing_fighters (dob) where dob is not null;

-- ---------------------------------------------------------------------------
-- Attribute provenance: every sourced DOB/nationality/stance/... is a claim.
-- boxing_fighters columns hold the selected canonical value; claims never
-- overwrite it. Conflicting claims coexist.
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_fighter_attribute_claims (
  id bigserial primary key,
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  attribute text not null check (attribute in (
    'dob','sex','nationality','stance','height_cm','reach_cm','hometown','division','promoter','career_status','pro_debut_date')),
  value jsonb not null,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  claim_hash text not null unique,
  claimed_at timestamptz not null default now()
);
create index if not exists boxing_fighter_attribute_claims_fighter_idx on public.boxing_fighter_attribute_claims (fighter_id, attribute);
select public.boxing_install_append_only('public.boxing_fighter_attribute_claims');

-- ---------------------------------------------------------------------------
-- Review queue: evidence, confidence, candidates, dedupe, resolution audit
-- ---------------------------------------------------------------------------

alter table public.boxing_identity_review_queue
  add column if not exists namespace text,
  add column if not exists observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  add column if not exists confidence smallint,
  add column if not exists candidates jsonb not null default '[]'::jsonb,
  add column if not exists reasons text[] not null default '{}',
  add column if not exists dedupe_key text,
  add column if not exists resolver_version text,
  add column if not exists resolution_kind text,
  add column if not exists resolution_note text,
  add column if not exists resolved_by text;
alter table public.boxing_identity_review_queue drop constraint if exists boxing_identity_review_queue_confidence_check;
alter table public.boxing_identity_review_queue add constraint boxing_identity_review_queue_confidence_check
  check (confidence is null or confidence between 0 and 100);
alter table public.boxing_identity_review_queue drop constraint if exists boxing_identity_review_queue_resolution_kind_check;
alter table public.boxing_identity_review_queue add constraint boxing_identity_review_queue_resolution_kind_check check (
  (status = 'pending' and resolution_kind is null)
  or (status = 'resolved' and resolution_kind in ('matched_existing','created_new'))
  or (status = 'rejected' and resolution_kind = 'rejected'));
create unique index if not exists boxing_identity_review_pending_dedupe
  on public.boxing_identity_review_queue (dedupe_key) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Resolution log (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_identity_resolutions (
  id bigserial primary key,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict,
  decision_kind text not null default 'automatic' check (decision_kind in ('automatic','manual')),
  namespace text,
  external_id text,
  outcome text not null check (outcome in ('matched','created','review','unresolved','rejected')),
  reason text,
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  method text,
  verification_state text check (verification_state is null or verification_state in ('verified','probable','review','rejected')),
  confidence smallint check (confidence is null or confidence between 0 and 100),
  candidates jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  review_item_id uuid references public.boxing_identity_review_queue(id) on delete restrict,
  resolver_version text not null,
  decided_by text,
  created_at timestamptz not null default now(),
  check ((outcome in ('matched','created')) = (fighter_id is not null))
);
create unique index if not exists boxing_identity_resolutions_auto_once
  on public.boxing_identity_resolutions (observation_id) where decision_kind = 'automatic';
create index if not exists boxing_identity_resolutions_fighter_idx on public.boxing_identity_resolutions (fighter_id, created_at desc);
create index if not exists boxing_identity_resolutions_source_idx on public.boxing_identity_resolutions (source_id, outcome);
select public.boxing_install_append_only('public.boxing_identity_resolutions');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.boxing_canonical_fighter_id(p_id uuid)
returns uuid language sql stable set search_path = '' as $$
  select coalesce(f.merged_into_id, f.id) from public.boxing_fighters f where f.id = p_id
$$;

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
        where p.fighter_id = f.id) x),
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
        left join public.boxing_fighters of on of.id = op.fighter_id
        left join public.boxing_weight_classes wc on wc.id = b.weight_class_id
        where p.fighter_id = f.id
        order by e.event_date desc nulls last
        limit 25) y)
  )
  from public.boxing_fighters f where f.id = p_id
$$;

-- Candidate retrieval for the resolver. With p_scope, ONLY those fighters are
-- returned (bout-scoped odds/card resolution). Merged fighters are replaced by
-- their merge target.
create or replace function public.boxing_identity_candidates(
  p_keys text[] default '{}',
  p_search_name text default null,
  p_dob date default null,
  p_namespace text default null,
  p_external_id text default null,
  p_scope uuid[] default null,
  p_limit int default 40
) returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_mapped uuid;
  v_candidates jsonb;
begin
  if p_namespace is not null and p_external_id is not null then
    select public.boxing_canonical_fighter_id(i.fighter_id) into v_mapped
    from public.boxing_fighter_identities i
    where i.namespace = p_namespace and i.external_id = p_external_id and i.verification_state <> 'rejected';
  end if;

  if p_scope is not null then
    select coalesce(jsonb_agg(public.boxing_fighter_candidate_json(id) order by id), '[]'::jsonb) into v_candidates
    from (select distinct public.boxing_canonical_fighter_id(s) as id from unnest(p_scope) s) x
    where id is not null;
  else
    with hits as (
      select k.fighter_id from public.boxing_fighter_name_keys k where k.key = any (p_keys)
      union
      select f.id from public.boxing_fighters f where p_dob is not null and f.dob = p_dob
      union
      select s.fighter_id from (
        select n.fighter_id from public.boxing_fighter_search_names n
        where p_search_name is not null and n.name operator(extensions.%) p_search_name
        order by extensions.similarity(n.name, p_search_name) desc
        limit 10) s
    ), canon as (
      select distinct public.boxing_canonical_fighter_id(h.fighter_id) as id from hits h
    )
    select coalesce(jsonb_agg(public.boxing_fighter_candidate_json(c.id) order by c.id), '[]'::jsonb) into v_candidates
    from (select id from canon where id is not null and id is distinct from v_mapped order by id limit p_limit) c;
  end if;

  return jsonb_build_object(
    'mapped', case when v_mapped is null then null else public.boxing_fighter_candidate_json(v_mapped) end,
    'candidates', v_candidates);
end $$;

-- Writes aliases, name keys, search names and attribute claims for a fighter.
create or replace function public.boxing_index_fighter_names(
  p_fighter uuid, p_source uuid, p_index jsonb, p_alias_state text
) returns void language plpgsql set search_path = '' as $$
declare
  a jsonb;
  v_alias uuid;
  k text;
begin
  for a in select * from jsonb_array_elements(coalesce(p_index -> 'aliases', '[]'::jsonb)) loop
    insert into public.boxing_fighter_aliases (fighter_id, source_id, alias, normalized, kind, verification_state)
    values (p_fighter, p_source, a ->> 'alias', a ->> 'normalized', coalesce(a ->> 'kind', 'name'), p_alias_state)
    on conflict (fighter_id, normalized, kind) do nothing
    returning id into v_alias;
    if v_alias is null then
      select id into v_alias from public.boxing_fighter_aliases
      where fighter_id = p_fighter and normalized = a ->> 'normalized' and kind = coalesce(a ->> 'kind', 'name');
    end if;
    for k in select jsonb_array_elements_text(coalesce(a -> 'keys', '[]'::jsonb)) loop
      insert into public.boxing_fighter_name_keys (fighter_id, alias_id, key) values (p_fighter, v_alias, k)
      on conflict (fighter_id, key) do nothing;
    end loop;
    if coalesce(a ->> 'search_name', '') <> '' then
      insert into public.boxing_fighter_search_names (fighter_id, name) values (p_fighter, a ->> 'search_name')
      on conflict do nothing;
    end if;
    v_alias := null;
  end loop;
end $$;

create or replace function public.boxing_record_attribute_claims(
  p_fighter uuid, p_source uuid, p_observation uuid, p_identity jsonb
) returns void language plpgsql set search_path = '' as $$
declare
  v_attr text;
  v_val jsonb;
begin
  for v_attr, v_val in
    select x.attr, x.val from (
      values ('dob', p_identity -> 'dob'), ('sex', p_identity -> 'sex'), ('stance', p_identity -> 'stance'),
             ('height_cm', p_identity -> 'height_cm'), ('reach_cm', p_identity -> 'reach_cm'),
             ('hometown', p_identity -> 'hometown'), ('promoter', p_identity -> 'promoter')) as x(attr, val)
    where x.val is not null and x.val <> 'null'::jsonb
    union all
    select 'nationality', n from jsonb_array_elements(case when jsonb_typeof(p_identity -> 'nationality') = 'array'
                                                         then p_identity -> 'nationality' else '[]'::jsonb end) n
    union all
    select 'division', d from jsonb_array_elements(case when jsonb_typeof(p_identity -> 'division_keys') = 'array'
                                                      then p_identity -> 'division_keys' else '[]'::jsonb end) d
  loop
    insert into public.boxing_fighter_attribute_claims (fighter_id, attribute, value, source_id, observation_id, claim_hash)
    values (p_fighter, v_attr, v_val, p_source, p_observation,
            encode(sha256(convert_to(p_fighter::text || '|' || v_attr || '|' || v_val::text || '|' || p_source::text, 'UTF8')), 'hex'))
    on conflict (claim_hash) do nothing;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Apply one resolver decision atomically and idempotently.
-- ---------------------------------------------------------------------------

create or replace function public.boxing_apply_identity_decision(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src public.boxing_sources%rowtype;
  v_obs uuid;
  v_prior public.boxing_identity_resolutions%rowtype;
  o jsonb := p -> 'observation';
  i jsonb := p -> 'identity';
  d jsonb := p -> 'decision';
  v_outcome text := d ->> 'outcome';
  v_reason text := d ->> 'reason';
  v_ns text := i ->> 'namespace';
  v_ext text := i ->> 'external_id';
  v_mapped uuid;
  v_fighter uuid;
  v_verification text := d ->> 'verification_state';
  v_review uuid;
  v_dedupe text;
  v_run uuid := nullif(p ->> 'ingest_run_id', '')::uuid;
  v_resolution bigint;
begin
  select * into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if not found then
    raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010';
  end if;
  if v_outcome not in ('matched','created','review','unresolved','rejected') then
    raise exception 'invalid_decision_outcome: %', v_outcome using errcode = '22023';
  end if;

  -- 1. raw observation first (source gate + dedupe enforced by table triggers)
  insert into public.boxing_source_observations
    (source_id, ingest_run_id, entity_type, external_key, source_url, payload, content_hash, source_published_at, parser_version)
  values (v_src.id, v_run, coalesce(o ->> 'entity_type', 'fighter_identity'), o ->> 'external_key', o ->> 'source_url',
          coalesce(o -> 'payload', '{}'::jsonb), o ->> 'content_hash', nullif(o ->> 'source_published_at', '')::timestamptz,
          o ->> 'parser_version')
  on conflict on constraint boxing_observations_dedupe_key do nothing
  returning id into v_obs;

  if v_obs is null then
    select so.id into v_obs from public.boxing_source_observations so
    where so.source_id = v_src.id and so.entity_type = coalesce(o ->> 'entity_type', 'fighter_identity')
      and so.external_key is not distinct from (o ->> 'external_key') and so.content_hash = o ->> 'content_hash';
    select * into v_prior from public.boxing_identity_resolutions r
    where r.observation_id = v_obs and r.decision_kind = 'automatic';
    if found then
      return jsonb_build_object('status', 'duplicate_observation', 'observation_id', v_obs,
        'outcome', v_prior.outcome, 'fighter_id', v_prior.fighter_id, 'review_item_id', v_prior.review_item_id,
        'resolution_id', v_prior.id);
    end if;
  end if;

  -- 2. guard against races and policy violations the resolver could not see
  if v_ns is not null and v_ext is not null then
    select public.boxing_canonical_fighter_id(fi.fighter_id) into v_mapped
    from public.boxing_fighter_identities fi
    where fi.namespace = v_ns and fi.external_id = v_ext and fi.verification_state <> 'rejected';
  end if;
  if v_outcome = 'created' and v_mapped is not null then
    v_outcome := 'review'; v_reason := 'concurrent_mapping';
  elsif v_outcome = 'matched' and v_mapped is not null
        and v_mapped <> public.boxing_canonical_fighter_id((d ->> 'fighter_id')::uuid) then
    v_outcome := 'review'; v_reason := 'external_id_conflict';
  elsif v_outcome = 'created' and v_src.access_mode <> 'approved_ingest' then
    v_outcome := 'review'; v_reason := 'source_cannot_create';
  end if;

  -- 3. apply
  if v_outcome = 'created' then
    insert into public.boxing_fighters
      (display_name, normalized_name, dob, nationality, hometown, stance, height_cm, reach_cm, sex, identity_state)
    values (i ->> 'display_name', p #>> '{index,normalized_name}', nullif(i ->> 'dob', '')::date,
            upper(i #>> '{nationality,0}'), i ->> 'hometown', i ->> 'stance', nullif(i ->> 'height_cm', '')::numeric,
            nullif(i ->> 'reach_cm', '')::numeric, i ->> 'sex', 'source_native')
    returning id into v_fighter;
    v_verification := 'verified';
  elsif v_outcome = 'matched' then
    v_fighter := public.boxing_canonical_fighter_id((d ->> 'fighter_id')::uuid);
    if v_fighter is null then
      raise exception 'matched_fighter_missing: %', d ->> 'fighter_id' using errcode = '23503';
    end if;
  end if;

  if v_outcome in ('created','matched') then
    if v_ns is not null and v_ext is not null then
      insert into public.boxing_fighter_identities
        (fighter_id, source_id, namespace, external_id, external_url, source_display_name, source_dob,
         verification_state, confidence, evidence)
      values (v_fighter, v_src.id, v_ns, v_ext, i ->> 'external_url', i ->> 'display_name', nullif(i ->> 'dob', '')::date,
              coalesce(v_verification, 'probable'), coalesce((d ->> 'confidence')::smallint, 0),
              jsonb_build_object('method', d ->> 'method', 'resolver_version', p ->> 'resolver_version',
                                 'observation_id', v_obs, 'evidence', d -> 'evidence'))
      on conflict (namespace, external_id) where verification_state <> 'rejected'
      do update set last_observed_at = now(), source_display_name = excluded.source_display_name;
    end if;

    perform public.boxing_index_fighter_names(v_fighter, v_src.id, p -> 'index',
      case when v_verification = 'verified' then 'verified' else 'review' end);
    perform public.boxing_record_attribute_claims(v_fighter, v_src.id, v_obs, i);

    -- verified matches may fill canonical gaps; they never overwrite a value
    if v_outcome = 'matched' and v_verification = 'verified' then
      update public.boxing_fighters f set
        dob = coalesce(f.dob, nullif(i ->> 'dob', '')::date),
        sex = coalesce(f.sex, i ->> 'sex'),
        nationality = coalesce(f.nationality, upper(i #>> '{nationality,0}')),
        stance = coalesce(f.stance, i ->> 'stance'),
        height_cm = coalesce(f.height_cm, nullif(i ->> 'height_cm', '')::numeric),
        reach_cm = coalesce(f.reach_cm, nullif(i ->> 'reach_cm', '')::numeric)
      where f.id = v_fighter
        and (f.dob is null or f.sex is null or f.nationality is null or f.stance is null or f.height_cm is null or f.reach_cm is null);
    end if;

    insert into public.boxing_observation_links (observation_id, entity_type, entity_id, link_role, ingest_run_id)
    values (v_obs, 'fighter', v_fighter::text, case when v_outcome = 'created' then 'created' else 'matched' end, v_run)
    on conflict do nothing;
  end if;

  if v_outcome = 'review' then
    v_dedupe := v_src.source_key || '|' || coalesce(v_ns, '-') || '|' ||
      coalesce(v_ext, encode(sha256(convert_to(coalesce(i ->> 'display_name', '') || '|' || coalesce(i ->> 'dob', ''), 'UTF8')), 'hex'));
    insert into public.boxing_identity_review_queue
      (source_id, namespace, raw_external_id, raw_name, raw_dob, candidate_fighter_ids, candidates, reason, reasons,
       confidence, context, observation_id, dedupe_key, resolver_version)
    values (v_src.id, v_ns, v_ext, coalesce(i ->> 'display_name', ''), nullif(i ->> 'dob', '')::date,
            coalesce((select array_agg((c ->> 'fighter_id')::uuid) from jsonb_array_elements(coalesce(d -> 'candidates', '[]'::jsonb)) c
                      where c ->> 'fighter_id' ~ '^[0-9a-f-]{36}$'), '{}'),
            coalesce(d -> 'candidates', '[]'::jsonb), v_reason,
            array_remove(array[v_reason, d ->> 'reason'], null),
            coalesce((d ->> 'confidence')::smallint, 0),
            jsonb_build_object('identity', i, 'index', p -> 'index'), v_obs, v_dedupe, p ->> 'resolver_version')
    on conflict (dedupe_key) where status = 'pending' do nothing
    returning id into v_review;
    if v_review is null then
      select id into v_review from public.boxing_identity_review_queue where dedupe_key = v_dedupe and status = 'pending';
    end if;
    insert into public.boxing_observation_links (observation_id, entity_type, entity_id, link_role, ingest_run_id)
    values (v_obs, 'identity_review', v_review::text, 'supports', v_run)
    on conflict do nothing;
  end if;

  insert into public.boxing_identity_resolutions
    (observation_id, source_id, ingest_run_id, decision_kind, namespace, external_id, outcome, reason, fighter_id, method,
     verification_state, confidence, candidates, evidence, review_item_id, resolver_version)
  values (v_obs, v_src.id, v_run, 'automatic', v_ns, v_ext, v_outcome, v_reason, v_fighter, d ->> 'method',
          case when v_outcome in ('matched','created') then v_verification end,
          coalesce((d ->> 'confidence')::smallint, 0), coalesce(d -> 'candidates', '[]'::jsonb),
          coalesce(d -> 'evidence', '{}'::jsonb), v_review, coalesce(p ->> 'resolver_version', 'unknown'))
  returning id into v_resolution;

  return jsonb_build_object('status', 'applied', 'observation_id', v_obs, 'outcome', v_outcome, 'reason', v_reason,
    'fighter_id', v_fighter, 'public_id', (select public_id from public.boxing_fighters where id = v_fighter),
    'review_item_id', v_review, 'resolution_id', v_resolution);
end $$;

-- ---------------------------------------------------------------------------
-- Manual review resolution. Upstream evidence stays on the original
-- observation; this records the decision and who made it.
-- ---------------------------------------------------------------------------

create or replace function public.boxing_resolve_identity_review(
  p_item uuid, p_kind text, p_fighter uuid, p_note text, p_actor text, p_index jsonb default '{}'::jsonb
) returns jsonb language plpgsql set search_path = '' as $$
declare
  q public.boxing_identity_review_queue%rowtype;
  v_manual uuid;
  v_fighter uuid;
  i jsonb;
begin
  if coalesce(p_actor, '') = '' or coalesce(p_note, '') = '' then
    raise exception 'manual_resolution_requires_actor_and_note' using errcode = '22023';
  end if;
  select * into q from public.boxing_identity_review_queue where id = p_item for update;
  if not found or q.status <> 'pending' then
    raise exception 'review_item_not_pending: %', p_item using errcode = 'BX040';
  end if;
  select id into v_manual from public.boxing_sources where source_key = 'pbe_manual_review';
  i := q.context -> 'identity';

  if p_kind = 'matched_existing' then
    v_fighter := public.boxing_canonical_fighter_id(p_fighter);
    if v_fighter is null then raise exception 'fighter_missing: %', p_fighter using errcode = '23503'; end if;
  elsif p_kind = 'created_new' then
    insert into public.boxing_fighters (display_name, dob, nationality, sex, identity_state)
    values (q.raw_name, q.raw_dob, upper(i #>> '{nationality,0}'), i ->> 'sex', 'verified')
    returning id into v_fighter;
  elsif p_kind <> 'rejected' then
    raise exception 'invalid_resolution_kind: %', p_kind using errcode = '22023';
  end if;

  if v_fighter is not null then
    if q.namespace is not null and q.raw_external_id is not null then
      insert into public.boxing_fighter_identities
        (fighter_id, source_id, namespace, external_id, source_display_name, source_dob, verification_state, confidence, evidence)
      values (v_fighter, q.source_id, q.namespace, q.raw_external_id, q.raw_name, q.raw_dob, 'verified', 100,
              jsonb_build_object('method', 'manual_review', 'review_item_id', q.id, 'actor', p_actor, 'note', p_note))
      on conflict (namespace, external_id) where verification_state <> 'rejected' do nothing;
    end if;
    perform public.boxing_index_fighter_names(v_fighter, q.source_id,
      case when p_index = '{}'::jsonb then coalesce(q.context -> 'index', '{}'::jsonb) else p_index end, 'verified');
    if q.observation_id is not null then
      perform public.boxing_record_attribute_claims(v_fighter, q.source_id, q.observation_id, coalesce(i, '{}'::jsonb));
    end if;
  elsif q.namespace is not null and q.raw_external_id is not null and p_fighter is not null then
    -- record a known non-match so the resolver never proposes it again
    insert into public.boxing_fighter_identities
      (fighter_id, source_id, namespace, external_id, source_display_name, verification_state, confidence, evidence)
    values (p_fighter, q.source_id, q.namespace, q.raw_external_id, q.raw_name, 'rejected', 0,
            jsonb_build_object('method', 'manual_review', 'review_item_id', q.id, 'actor', p_actor, 'note', p_note))
    on conflict do nothing;
  end if;

  update public.boxing_identity_review_queue set
    status = case when p_kind = 'rejected' then 'rejected' else 'resolved' end,
    resolved_fighter_id = v_fighter, resolution_kind = p_kind, resolution_note = p_note,
    resolved_by = p_actor, resolved_at = now()
  where id = q.id;

  insert into public.boxing_identity_resolutions
    (observation_id, source_id, decision_kind, namespace, external_id, outcome, reason, fighter_id, method,
     verification_state, confidence, evidence, review_item_id, resolver_version, decided_by)
  values (q.observation_id, v_manual, 'manual', q.namespace, q.raw_external_id,
          case when p_kind = 'rejected' then 'rejected' when p_kind = 'created_new' then 'created' else 'matched' end,
          p_note, v_fighter, 'manual_review', case when v_fighter is not null then 'verified' end, 100,
          jsonb_build_object('review_reason', q.reason, 'candidates', q.candidates), q.id, 'manual', p_actor);

  return jsonb_build_object('status', 'resolved', 'review_item_id', q.id, 'kind', p_kind, 'fighter_id', v_fighter);
end $$;

-- ---------------------------------------------------------------------------
-- Internal read interface
-- ---------------------------------------------------------------------------

create or replace function public.boxing_get_fighter(p_ref text)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_id uuid;
  v_canon uuid;
begin
  if p_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_id from public.boxing_fighters where id = p_ref::uuid;
  elsif p_ref like 'pbe_boxer_%' then
    select id into v_id from public.boxing_fighters where public_id = p_ref;
  elsif position(':' in p_ref) > 0 then
    select fighter_id into v_id from public.boxing_fighter_identities
    where namespace = split_part(p_ref, ':', 1) and external_id = substr(p_ref, length(split_part(p_ref, ':', 1)) + 2)
      and verification_state <> 'rejected';
  end if;
  if v_id is null then return null; end if;
  v_canon := public.boxing_canonical_fighter_id(v_id);
  return jsonb_build_object(
    'requested_id', v_id,
    'fighter', (select to_jsonb(f) from public.boxing_fighters f where f.id = v_canon),
    'identities', (select coalesce(jsonb_agg(to_jsonb(x) order by x.namespace, x.external_id), '[]'::jsonb)
                   from public.boxing_fighter_identities x where x.fighter_id = v_canon),
    'aliases', (select coalesce(jsonb_agg(jsonb_build_object('alias', a.alias, 'kind', a.kind, 'verification_state', a.verification_state,
                                                             'source_key', s.source_key) order by a.created_at), '[]'::jsonb)
                from public.boxing_fighter_aliases a left join public.boxing_sources s on s.id = a.source_id
                where a.fighter_id = v_canon),
    'attribute_claims', (select coalesce(jsonb_agg(jsonb_build_object('attribute', c.attribute, 'value', c.value,
                                                                      'source_key', s.source_key, 'observation_id', c.observation_id,
                                                                      'claimed_at', c.claimed_at) order by c.attribute, c.claimed_at), '[]'::jsonb)
                         from public.boxing_fighter_attribute_claims c join public.boxing_sources s on s.id = c.source_id
                         where c.fighter_id = v_canon),
    'resolutions', (select coalesce(jsonb_agg(jsonb_build_object('outcome', r.outcome, 'method', r.method, 'reason', r.reason,
                                                                 'confidence', r.confidence, 'evidence', r.evidence,
                                                                 'source_key', s.source_key, 'namespace', r.namespace,
                                                                 'external_id', r.external_id, 'observation_id', r.observation_id,
                                                                 'decision_kind', r.decision_kind, 'decided_by', r.decided_by,
                                                                 'resolver_version', r.resolver_version, 'at', r.created_at)
                                              order by r.created_at), '[]'::jsonb)
                    from public.boxing_identity_resolutions r join public.boxing_sources s on s.id = r.source_id
                    where r.fighter_id = v_canon)
  );
end $$;

create or replace function public.boxing_list_unresolved_identities(p_limit int default 100, p_source_key text default null)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x->>'created_at'), '[]'::jsonb) from (
    select jsonb_build_object('id', q.id, 'source_key', s.source_key, 'namespace', q.namespace,
      'external_id', q.raw_external_id, 'raw_name', q.raw_name, 'raw_dob', q.raw_dob, 'reason', q.reason,
      'confidence', q.confidence, 'candidates', q.candidates, 'observation_id', q.observation_id,
      'created_at', q.created_at) as x
    from public.boxing_identity_review_queue q join public.boxing_sources s on s.id = q.source_id
    where q.status = 'pending' and (p_source_key is null or s.source_key = p_source_key)
    order by q.created_at
    limit greatest(1, least(p_limit, 1000))) y
$$;

-- duplicates_prevented: automatic decisions that did NOT create a boxer
-- although the external id was new to us (matched by evidence, or held for
-- review). A naive "new external id -> new boxer" pipeline would have created
-- a duplicate canonical record for each of these.
create or replace function public.boxing_identity_coverage()
returns table (
  source_key text, observations bigint, created bigint, matched bigint, matched_by_external_id bigint,
  review bigint, unresolved bigint, rejected bigint, duplicates_prevented bigint, pending_review_items bigint,
  canonical_fighters_linked bigint
) language sql stable set search_path = '' as $$
  select s.source_key,
    (select count(*) from public.boxing_source_observations o where o.source_id = s.id and o.entity_type = 'fighter_identity'),
    count(*) filter (where r.outcome = 'created'),
    count(*) filter (where r.outcome = 'matched'),
    count(*) filter (where r.outcome = 'matched' and r.method = 'external_id'),
    count(*) filter (where r.outcome = 'review'),
    count(*) filter (where r.outcome = 'unresolved'),
    count(*) filter (where r.outcome = 'rejected'),
    count(*) filter (where r.outcome = 'review' or (r.outcome = 'matched' and r.method is distinct from 'external_id')),
    (select count(*) from public.boxing_identity_review_queue q where q.source_id = s.id and q.status = 'pending'),
    count(distinct r.fighter_id)
  from public.boxing_sources s
  join public.boxing_identity_resolutions r on r.source_id = s.id and r.decision_kind = 'automatic'
  group by s.id, s.source_key
  order by s.source_key
$$;

select public.boxing_lockdown();

commit;
