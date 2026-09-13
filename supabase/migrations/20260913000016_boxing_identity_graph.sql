-- PropBetEdge Boxing — career-graph identity resolution.
--
-- Commission sheets identify a boxer by name, stated hometown and weight only.
-- A repeat name on a later card therefore never met the resolver's "strong
-- corroboration" bar and went to review (147 items on staging, 2026-09-13).
-- This migration adds:
--   * boxing_identity_appearance_decisions: an append-only ledger binding one
--     source appearance (a corner of one source bout) to a canonical boxer,
--     with tier (A deterministic, B graph, C review, D conflict), confidence,
--     evidence, resolver version and time. The latest row per appearance wins;
--     a later human decision is a new row, never an update.
--   * graph context for candidates (career bouts, opponents, weights,
--     jurisdictions, venues, hometown claims) without private fields
--   * review-queue backlog and stored parsed documents for re-apply without
--     refetching official documents
-- Rerunnable.

begin;

create table if not exists public.boxing_identity_appearance_decisions (
  seq bigserial primary key,
  id uuid not null default gen_random_uuid() unique,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  namespace text not null check (namespace ~ '^[a-z][a-z0-9_.:-]*$'),
  appearance_key text not null check (length(appearance_key) between 3 and 500),
  bout_external_id text not null,
  side text not null check (side in ('a','b')),
  observed_name text not null,
  decision text not null check (decision in ('matched','created','review')),
  tier text not null check (tier in ('A','B','C','D')),
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  confidence smallint not null check (confidence between 0 and 100),
  evidence jsonb not null,
  evidence_hash text not null,
  resolver_version text not null,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  review_item_id uuid references public.boxing_identity_review_queue(id) on delete restrict,
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict,
  decided_by text not null default 'resolver',
  decided_at timestamptz not null default now(),
  check ((decision in ('matched','created')) = (fighter_id is not null)),
  check (decision <> 'review' or tier = 'C'),
  check (decision <> 'matched' or tier in ('A','B') or decided_by <> 'resolver'),
  check (decision <> 'created' or tier in ('A','D') or decided_by <> 'resolver')
);
create index if not exists boxing_appearance_decisions_key_idx on public.boxing_identity_appearance_decisions (namespace, appearance_key, seq desc);
create index if not exists boxing_appearance_decisions_fighter_idx on public.boxing_identity_appearance_decisions (fighter_id);
select public.boxing_install_append_only('public.boxing_identity_appearance_decisions');

create index if not exists boxing_observations_identity_bout_idx
  on public.boxing_source_observations (source_id, (payload ->> 'bout'), (payload ->> 'side')) where entity_type = 'fighter_identity';

-- Latest binding per appearance key: { key: { decision, tier, fighter_id, confidence, decided_at, decided_by } }.
-- A latest row of 'review' is not a binding.
create or replace function public.boxing_appearance_bindings(p_namespace text, p_keys text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(x.appearance_key, jsonb_build_object('decision', x.decision, 'tier', x.tier,
      'fighter_id', public.boxing_canonical_fighter_id(x.fighter_id), 'confidence', x.confidence,
      'decided_at', x.decided_at, 'decided_by', x.decided_by, 'resolver_version', x.resolver_version)), '{}'::jsonb)
  from (select distinct on (d.appearance_key) d.* from public.boxing_identity_appearance_decisions d
        where d.namespace = p_namespace and d.appearance_key = any (p_keys)
        order by d.appearance_key, d.seq desc) x
  where x.decision in ('matched','created')
$$;

-- Career graph for candidate boxers. Only facts already in canonical tables;
-- no DOB, no source identity values from non-approved sources.
create or replace function public.boxing_identity_graph_context(p_ids uuid[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'display_name', f.display_name,
    'identity_state', f.identity_state,
    'hometowns', (select coalesce(jsonb_agg(distinct h.h), '[]'::jsonb) from (
        select f.hometown as h where f.hometown is not null
        union select c.value #>> '{}' from public.boxing_fighter_attribute_claims c
        where c.fighter_id = f.id and c.attribute = 'hometown') h),
    'aliases', (select coalesce(jsonb_agg(jsonb_build_object('alias', a.alias, 'kind', a.kind, 'verification_state', a.verification_state)
                order by a.created_at), '[]'::jsonb) from public.boxing_fighter_aliases a where a.fighter_id = f.id),
    'identities', (select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'external_id', i.external_id,
                   'verification_state', i.verification_state, 'source_key', s.source_key) order by i.namespace), '[]'::jsonb)
                   from public.boxing_fighter_identities i join public.boxing_sources s on s.id = i.source_id
                   where i.fighter_id = f.id and s.access_mode in ('approved_ingest','identity_only')),
    'bouts', (select coalesce(jsonb_agg(jsonb_build_object(
        'bout_id', b.id, 'event_id', e.id, 'date', e.event_date, 'status', b.status,
        'commission', cm.slug, 'jurisdiction', cm.jurisdiction, 'venue_id', e.venue_id, 'venue', v.name, 'city', v.city, 'region', v.region,
        'opponent_id', op.fighter_id, 'opponent_name', ofi.display_name, 'weight_class', wc.class_key,
        'weight_lb', (select w.official_weight_lb from public.boxing_weigh_ins w where w.bout_id = b.id and w.fighter_id = p.fighter_id
                      order by w.attempt_no desc, w.revision desc limit 1),
        'result', (select case when r.outcome = 'win' and r.winner_id = p.fighter_id then 'win' when r.outcome = 'win' then 'loss' else r.outcome end
                   from public.boxing_bout_results r where r.bout_id = b.id order by r.revision desc limit 1)
      ) order by e.event_date, b.id), '[]'::jsonb)
      from public.boxing_bout_participants p
      join public.boxing_bouts b on b.id = p.bout_id
      join public.boxing_events e on e.id = b.event_id
      left join public.boxing_commissions cm on cm.id = e.commission_id
      left join public.boxing_venues v on v.id = e.venue_id
      left join public.boxing_weight_classes wc on wc.id = b.weight_class_id
      left join public.boxing_bout_participants op on op.bout_id = b.id and op.fighter_id <> p.fighter_id and op.participant_status in ('scheduled','confirmed')
      left join public.boxing_fighters ofi on ofi.id = op.fighter_id
      where p.fighter_id = f.id and p.participant_status in ('scheduled','confirmed'))
  ) order by f.id), '[]'::jsonb)
  from public.boxing_fighters f
  where f.id in (select distinct public.boxing_canonical_fighter_id(x) from unnest(p_ids) x)
$$;

-- Records one appearance decision. The resolver never replaces an existing
-- binding; an unchanged review decision is not re-recorded. A pending review
-- item closes when every appearance linked to it is bound to ONE boxer.
create or replace function public.boxing_record_appearance_decision(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src public.boxing_sources%rowtype;
  v_ns text := p ->> 'namespace';
  v_bout text := p ->> 'bout_external_id';
  v_side text := p ->> 'side';
  v_key text;
  v_decision text := p ->> 'decision';
  v_by text := coalesce(nullif(p ->> 'decided_by', ''), 'resolver');
  v_prev public.boxing_identity_appearance_decisions%rowtype;
  v_fighter uuid;
  v_obs uuid;
  v_id uuid;
  v_item record;
  v_unbound int;
  v_fighters uuid[];
  v_all_created boolean;
  v_closed uuid[] := '{}';
begin
  select * into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if not found then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  if coalesce(v_ns, '') = '' or coalesce(v_bout, '') = '' or v_side not in ('a','b') then
    raise exception 'appearance_requires_namespace_bout_side' using errcode = '22023';
  end if;
  if v_by <> 'resolver' and coalesce(p ->> 'note', '') = '' then
    raise exception 'manual_appearance_decision_requires_note' using errcode = '22023';
  end if;
  v_key := v_bout || '|' || v_side;
  perform pg_advisory_xact_lock(hashtextextended('boxing_appearance:' || v_ns || '|' || v_key, 0));

  select * into v_prev from public.boxing_identity_appearance_decisions
  where namespace = v_ns and appearance_key = v_key order by seq desc limit 1;
  if v_prev.seq is not null and v_by = 'resolver' then
    if v_prev.decision in ('matched','created') then
      return jsonb_build_object('status', 'already_bound', 'decision', v_prev.decision, 'tier', v_prev.tier,
        'fighter_id', public.boxing_canonical_fighter_id(v_prev.fighter_id));
    end if;
    if v_decision = 'review' and v_prev.resolver_version = p ->> 'resolver_version' and v_prev.evidence_hash = p ->> 'evidence_hash' then
      return jsonb_build_object('status', 'unchanged', 'decision', 'review', 'tier', 'C');
    end if;
  end if;

  if v_decision = 'created' then
    if v_src.access_mode <> 'approved_ingest' then
      raise exception 'source_cannot_create: %', v_src.source_key using errcode = 'BX011';
    end if;
    insert into public.boxing_fighters (display_name, normalized_name, hometown, identity_state)
    values (p ->> 'observed_name', p #>> '{index,normalized_name}', p ->> 'hometown', 'source_native')
    returning id into v_fighter;
  elsif v_decision = 'matched' then
    v_fighter := public.boxing_canonical_fighter_id((p ->> 'fighter_id')::uuid);
    if v_fighter is null then raise exception 'matched_fighter_missing: %', p ->> 'fighter_id' using errcode = '23503'; end if;
  elsif v_decision <> 'review' then
    raise exception 'invalid_appearance_decision: %', v_decision using errcode = '22023';
  end if;

  select o.id into v_obs from public.boxing_source_observations o
  where o.source_id = v_src.id and o.entity_type = 'fighter_identity' and o.payload ->> 'bout' = v_bout and o.payload ->> 'side' = v_side
  order by o.observed_at desc limit 1;

  if v_fighter is not null then
    perform public.boxing_index_fighter_names(v_fighter, v_src.id, coalesce(p -> 'index', '{}'::jsonb),
      case when p ->> 'tier' in ('A','D') or v_by <> 'resolver' then 'verified' else 'review' end);
    if v_obs is not null then
      perform public.boxing_record_attribute_claims(v_fighter, v_src.id, v_obs,
        jsonb_strip_nulls(jsonb_build_object('hometown', p ->> 'hometown')));
      insert into public.boxing_observation_links (observation_id, entity_type, entity_id, link_role, ingest_run_id)
      values (v_obs, 'fighter', v_fighter::text, case when v_decision = 'created' then 'created' else 'matched' end, nullif(p ->> 'ingest_run_id', '')::uuid)
      on conflict do nothing;
    end if;
  end if;

  insert into public.boxing_identity_appearance_decisions
    (source_id, namespace, appearance_key, bout_external_id, side, observed_name, decision, tier, fighter_id, confidence,
     evidence, evidence_hash, resolver_version, observation_id, review_item_id, ingest_run_id, decided_by)
  values (v_src.id, v_ns, v_key, v_bout, v_side, p ->> 'observed_name', v_decision, p ->> 'tier', v_fighter,
          coalesce((p ->> 'confidence')::smallint, 0), coalesce(p -> 'evidence', '{}'::jsonb), coalesce(p ->> 'evidence_hash', ''),
          p ->> 'resolver_version', v_obs,
          (select l.entity_id::uuid from public.boxing_observation_links l where l.observation_id = v_obs and l.entity_type = 'identity_review' limit 1),
          nullif(p ->> 'ingest_run_id', '')::uuid, v_by)
  returning id into v_id;

  -- close pending review items whose every linked appearance is bound to one boxer
  if v_fighter is not null and v_obs is not null then
    for v_item in
      select q.* from public.boxing_identity_review_queue q
      join public.boxing_observation_links l on l.entity_type = 'identity_review' and l.entity_id = q.id::text
      where l.observation_id = v_obs and q.status = 'pending'
    loop
      select count(*) filter (where b.fighter_id is null),
             array_agg(distinct public.boxing_canonical_fighter_id(b.fighter_id)) filter (where b.fighter_id is not null),
             bool_and(b.decision = 'created') filter (where b.fighter_id is not null)
        into v_unbound, v_fighters, v_all_created
      from public.boxing_observation_links l2
      join public.boxing_source_observations o2 on o2.id = l2.observation_id
      left join lateral (
        select d.decision, d.fighter_id from public.boxing_identity_appearance_decisions d
        where d.namespace = v_ns and d.appearance_key = (o2.payload ->> 'bout') || '|' || (o2.payload ->> 'side')
        order by d.seq desc limit 1) b0 on true
      left join lateral (select b0.decision, case when b0.decision in ('matched','created') then b0.fighter_id end as fighter_id) b on true
      where l2.entity_type = 'identity_review' and l2.entity_id = v_item.id::text;
      if v_unbound = 0 and cardinality(v_fighters) = 1 then
        update public.boxing_identity_review_queue set status = 'resolved', resolved_fighter_id = v_fighters[1],
          resolution_kind = case when v_all_created then 'created_new' else 'matched_existing' end,
          resolution_note = format('closed by %s: every linked appearance bound (latest tier %s); evidence in boxing_identity_appearance_decisions',
                                   p ->> 'resolver_version', p ->> 'tier'),
          resolved_by = case when v_by = 'resolver' then 'resolver:' || (p ->> 'resolver_version') else v_by end,
          resolved_at = now()
        where id = v_item.id;
        v_closed := v_closed || v_item.id;
      end if;
    end loop;
  end if;

  return jsonb_build_object('status', 'recorded', 'decision_id', v_id, 'decision', v_decision, 'tier', p ->> 'tier',
    'fighter_id', v_fighter, 'observation_id', v_obs, 'review_items_closed', to_jsonb(v_closed));
end $$;

-- Pending review items with every linked appearance (no DOB, no private fields).
create or replace function public.boxing_identity_review_backlog(p_source_keys text[] default null)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'source_key', s.source_key, 'namespace', q.namespace, 'raw_name', q.raw_name, 'reason', q.reason,
    'confidence', q.confidence, 'created_at', q.created_at, 'candidate_fighter_ids', to_jsonb(q.candidate_fighter_ids),
    'appearances', (select coalesce(jsonb_agg(jsonb_build_object('observation_id', o.id, 'event', o.payload ->> 'event',
        'bout', o.payload ->> 'bout', 'side', o.payload ->> 'side', 'display_name', o.payload ->> 'display_name',
        'hometown', o.payload ->> 'hometown', 'observed_at', o.observed_at) order by o.observed_at), '[]'::jsonb)
      from public.boxing_observation_links l join public.boxing_source_observations o on o.id = l.observation_id
      where l.entity_type = 'identity_review' and l.entity_id = q.id::text)
  ) order by q.created_at, q.id), '[]'::jsonb)
  from public.boxing_identity_review_queue q join public.boxing_sources s on s.id = q.source_id
  where q.status = 'pending' and (p_source_keys is null or s.source_key = any (p_source_keys))
$$;

-- Latest stored parse of each official result document (re-apply without refetching).
create or replace function public.boxing_commission_parsed_documents(p_source_key text, p_offset int default 0, p_limit int default 10)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('doc_key', x.external_key, 'observation_id', x.id, 'parser_version', x.parser_version,
      'observed_at', x.observed_at, 'events', x.payload -> 'events', 'bouts', x.payload -> 'bouts') order by x.external_key), '[]'::jsonb)
  from (select * from (select distinct on (o.external_key) o.* from public.boxing_source_observations o
          join public.boxing_sources s on s.id = o.source_id
          where s.source_key = p_source_key and o.entity_type in ('commission_results_document','commission_document_rejected')
          order by o.external_key, o.observed_at desc, o.id) latest
        where latest.entity_type = 'commission_results_document'
        order by latest.external_key
        offset greatest(0, coalesce(p_offset, 0)) limit greatest(1, least(coalesce(p_limit, 10), 50))) x
$$;

create or replace function public.boxing_identity_tier_summary()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'review_pending', (select count(*) from public.boxing_identity_review_queue where status = 'pending'),
    'review_closed_by_resolver', (select count(*) from public.boxing_identity_review_queue where resolved_by like 'resolver:%'),
    'appearance_decisions', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
        select x.tier || ':' || x.decision k, count(*) n from (
          select distinct on (namespace, appearance_key) tier, decision from public.boxing_identity_appearance_decisions
          order by namespace, appearance_key, seq desc) x group by 1) t),
    'fighters_created_by_graph', (select count(distinct fighter_id) from public.boxing_identity_appearance_decisions where decision = 'created'),
    'fighters_linked_by_graph', (select count(distinct fighter_id) from public.boxing_identity_appearance_decisions where decision = 'matched')
  )
$$;

-- Canonical boxer already attached to each source corner: the latest appearance
-- binding, else the automatic resolution of that corner's identity observation.
create or replace function public.boxing_source_corner_fighters(p_source_key text, p_namespace text, p_bouts text[])
returns jsonb language sql stable set search_path = '' as $$
  with src as (select id from public.boxing_sources where source_key = p_source_key),
  corners as (select b, s from unnest(p_bouts) b cross join (values ('a'), ('b')) v(s))
  select coalesce(jsonb_object_agg(c.b || '|' || c.s, x.fighter_id) filter (where x.fighter_id is not null), '{}'::jsonb)
  from corners c
  left join lateral (
    select coalesce(
      (select public.boxing_canonical_fighter_id(d.fighter_id) from public.boxing_identity_appearance_decisions d
       where d.namespace = p_namespace and d.appearance_key = c.b || '|' || c.s and d.seq = (
         select max(d2.seq) from public.boxing_identity_appearance_decisions d2 where d2.namespace = p_namespace and d2.appearance_key = c.b || '|' || c.s)
         and d.decision in ('matched','created')),
      (select public.boxing_canonical_fighter_id(r.fighter_id) from public.boxing_source_observations o
       join public.boxing_identity_resolutions r on r.observation_id = o.id and r.decision_kind = 'automatic' and r.outcome in ('matched','created')
       where o.source_id = (select id from src) and o.entity_type = 'fighter_identity' and o.payload ->> 'bout' = c.b and o.payload ->> 'side' = c.s
       order by o.observed_at desc limit 1)) as fighter_id) x on true
$$;

-- Canonical event (and venue / commission) for source event ids.
create or replace function public.boxing_source_event_ids(p_namespace text, p_external_ids text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(i.external_id, jsonb_build_object('event_id', e.id, 'venue_id', e.venue_id, 'event_date', e.event_date,
      'name', e.name, 'status', e.status, 'commission', (select c.slug from public.boxing_commissions c where c.id = e.commission_id),
      'venue', (select v.name || coalesce(', ' || v.city, '') from public.boxing_venues v where v.id = e.venue_id))), '{}'::jsonb)
  from public.boxing_event_identities i join public.boxing_events e on e.id = i.event_id
  where i.namespace = p_namespace and i.external_id = any (p_external_ids) and i.verification_state <> 'rejected'
$$;

-- ---------------------------------------------------------------------------
-- Provider participant identities, learned ONLY after an authoritative match:
-- a provider event whose two names resolved to the two corners of exactly one
-- canonical bout (built from approved official/first-party sources). A
-- provider name never creates or establishes a boxer.
-- ---------------------------------------------------------------------------
create table if not exists public.boxing_provider_participant_identities (
  seq bigserial primary key,
  provider_id uuid not null references public.boxing_odds_providers(id) on delete restrict,
  participant_name text not null,
  normalized_name text not null,
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  verification_state text not null check (verification_state in ('verified','rejected')),
  resolver_version text not null,
  evidence jsonb not null,
  provider_event_id text not null,
  bout_id uuid not null references public.boxing_bouts(id) on delete restrict,
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict,
  verified_at timestamptz not null default now()
);
create unique index if not exists boxing_provider_participant_identity_once
  on public.boxing_provider_participant_identities (provider_id, normalized_name, fighter_id, verification_state);
select public.boxing_install_append_only('public.boxing_provider_participant_identities');

create or replace function public.boxing_record_provider_participant_identity(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_provider uuid;
  v_bout uuid := (p ->> 'bout_id')::uuid;
  v_fighter uuid := public.boxing_canonical_fighter_id((p ->> 'fighter_id')::uuid);
  v_seq bigint;
begin
  select id into v_provider from public.boxing_odds_providers where slug = p ->> 'provider_slug';
  if v_provider is null then raise exception 'provider_not_registered: %', p ->> 'provider_slug' using errcode = 'BX010'; end if;
  -- the fighter must be an active corner of the mapped bout, and the provider event must map to that bout
  if not exists (select 1 from public.boxing_bout_participants bp where bp.bout_id = v_bout and bp.fighter_id = v_fighter
                 and bp.participant_status in ('scheduled','confirmed')) then
    raise exception 'provider_identity_requires_bout_corner' using errcode = '22023';
  end if;
  if not exists (select 1 from public.boxing_bout_identities bi where bi.bout_id = v_bout and bi.external_id = p ->> 'provider_event_id'
                 and bi.verification_state <> 'rejected') then
    raise exception 'provider_identity_requires_event_mapping' using errcode = '22023';
  end if;
  insert into public.boxing_provider_participant_identities
    (provider_id, participant_name, normalized_name, fighter_id, verification_state, resolver_version, evidence, provider_event_id, bout_id, ingest_run_id)
  values (v_provider, p ->> 'participant_name', p ->> 'normalized_name', v_fighter, 'verified', p ->> 'resolver_version',
          coalesce(p -> 'evidence', '{}'::jsonb), p ->> 'provider_event_id', v_bout, nullif(p ->> 'ingest_run_id', '')::uuid)
  on conflict (provider_id, normalized_name, fighter_id, verification_state) do nothing
  returning seq into v_seq;
  return jsonb_build_object('status', case when v_seq is null then 'already_verified' else 'verified' end, 'fighter_id', v_fighter);
end $$;

-- { normalized_name: [fighter_id, ...] } for verified provider identities
create or replace function public.boxing_provider_participant_identity_map(p_provider_slug text, p_names text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(x.normalized_name, x.ids), '{}'::jsonb)
  from (select i.normalized_name, jsonb_agg(distinct public.boxing_canonical_fighter_id(i.fighter_id)) ids
        from public.boxing_provider_participant_identities i join public.boxing_odds_providers pr on pr.id = i.provider_id
        where pr.slug = p_provider_slug and i.normalized_name = any (p_names) and i.verification_state = 'verified'
        group by i.normalized_name) x
$$;

-- ---------------------------------------------------------------------------
-- Cross-source events: a first-party card for an event a commission already
-- lists. Candidates share the date and venue city; attaching is explicit,
-- evidenced and fails closed. The owner (first) source keeps authority for
-- event-level fields.
-- ---------------------------------------------------------------------------
create or replace function public.boxing_event_cross_source_candidates(p jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('event_id', e.id, 'event_date', e.event_date, 'status', e.status, 'name', e.name,
      'venue', v.name, 'city', v.city, 'region', v.region, 'owner_source_key', s.source_key, 'owner_source_kind', s.source_kind,
      'commission', (select c.slug from public.boxing_commissions c where c.id = e.commission_id),
      'date_gap_days', abs(e.event_date - (p ->> 'event_date')::date)) order by e.event_date, e.id), '[]'::jsonb)
  from public.boxing_events e
  join public.boxing_sources s on s.id = e.source_id
  left join public.boxing_venues v on v.id = e.venue_id
  where e.event_date between (p ->> 'event_date')::date - 1 and (p ->> 'event_date')::date + 1
    and lower(coalesce(v.city, '')) = lower(coalesce(p ->> 'city', '~'))
    and not exists (select 1 from public.boxing_event_identities i where i.event_id = e.id and i.namespace = p ->> 'namespace')
$$;

create or replace function public.boxing_attach_event_identity(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_existing uuid;
begin
  select event_id into v_existing from public.boxing_event_identities
  where namespace = p ->> 'namespace' and external_id = p ->> 'external_id' and verification_state <> 'rejected';
  if v_existing is not null then
    return jsonb_build_object('status', case when v_existing = (p ->> 'event_id')::uuid then 'already_attached' else 'conflict' end, 'event_id', v_existing);
  end if;
  insert into public.boxing_event_identities (event_id, source_id, namespace, external_id, verification_state, confidence, evidence)
  values ((p ->> 'event_id')::uuid, (select id from public.boxing_sources where source_key = p ->> 'source_key'), p ->> 'namespace', p ->> 'external_id',
          'probable', coalesce((p ->> 'confidence')::smallint, 80), coalesce(p -> 'evidence', '{}'::jsonb));
  return jsonb_build_object('status', 'attached', 'event_id', p ->> 'event_id');
end $$;

create or replace function public.boxing_event_owner(p_event uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('source_key', s.source_key, 'source_kind', s.source_kind, 'event_date', e.event_date, 'status', e.status, 'venue_id', e.venue_id)
  from public.boxing_events e join public.boxing_sources s on s.id = e.source_id where e.id = p_event
$$;

-- ---------------------------------------------------------------------------
-- Newsroom temporal gate. News is about something happening now. A fact
-- written by a backfill or a late re-apply (identity resolved months later),
-- or detected long after its event, is recorded as history and skipped; it is
-- never offered to the article generator. Corrections stay news.
-- ---------------------------------------------------------------------------
create or replace function public.boxing_emit_news_event(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id uuid;
  v_detected timestamptz := coalesce(nullif(p ->> 'detected_at', '')::timestamptz, now());
  v_event_date date;
  v_mode text := coalesce(nullif(p ->> 'temporal_mode', ''), 'forward');
  v_historical boolean := false;
  v_payload jsonb := coalesce(p -> 'payload', '{}'::jsonb);
begin
  select e.event_date into v_event_date from public.boxing_events e
  where e.id = coalesce(nullif(p ->> 'event_id', '')::uuid, (select b.event_id from public.boxing_bouts b where b.id = nullif(p ->> 'bout_id', '')::uuid));
  if p ->> 'event_type' not in ('RESULT_CORRECTED','RESULT_OVERTURNED','MARKET_MOVED') then
    -- a backfill that discovers an UPCOMING event is still news; past facts are history
    v_historical := (v_mode in ('backfill','reapply') and (v_event_date is null or v_event_date < (v_detected at time zone 'UTC')::date))
      or (v_event_date is not null and v_event_date < (v_detected at time zone 'UTC')::date - 45);
  end if;
  v_payload := v_payload || jsonb_build_object('temporal', jsonb_build_object(
    'rule', 'boxing-news-temporal@1.0.0', 'mode', v_mode, 'event_date', v_event_date, 'detected_at', v_detected,
    'days_after_event', case when v_event_date is not null then (v_detected at time zone 'UTC')::date - v_event_date end,
    'newsworthy', not v_historical));
  insert into public.boxing_news_events
    (event_type, dedupe_key, fighter_id, fighter_ids, bout_id, boxing_event_id, organization_id, source_id,
     occurred_at, detected_at, confidence, payload, sources, state, supersedes_id)
  values (p ->> 'event_type', p ->> 'dedupe_key', nullif(p ->> 'fighter_id', '')::uuid,
          coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p -> 'fighter_ids', '[]'::jsonb)) x), '{}'),
          nullif(p ->> 'bout_id', '')::uuid, nullif(p ->> 'event_id', '')::uuid, nullif(p ->> 'organization_id', '')::uuid,
          (select id from public.boxing_sources where source_key = p ->> 'source_key'),
          nullif(p ->> 'occurred_at', '')::timestamptz, v_detected,
          coalesce((p ->> 'confidence')::smallint, 100),
          v_payload, coalesce(p -> 'sources', '[]'::jsonb),
          case when v_historical then 'skipped'
               when coalesce((p ->> 'requires_human_review')::boolean, false) then 'needs_review' else 'new' end,
          (select id from public.boxing_news_events where dedupe_key = p ->> 'supersedes_dedupe_key'))
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('inserted', false, 'id', (select id from public.boxing_news_events where dedupe_key = p ->> 'dedupe_key'));
  end if;
  return jsonb_build_object('inserted', true, 'id', v_id, 'historical', v_historical);
end $$;

-- Rows written before the gate by the 2026-09-13 backfills: same rule, state only
-- (payloads are immutable). Events more than 14 days before detection that were
-- never turned into an article become 'skipped'.
update public.boxing_news_events n set state = 'skipped', state_changed_at = now()
where n.state in ('new','needs_review')
  and n.event_type not in ('RESULT_CORRECTED','RESULT_OVERTURNED','MARKET_MOVED')
  and not (n.payload ? 'temporal')
  and not exists (select 1 from public.boxing_articles a where a.news_event_id = n.id)
  and exists (select 1 from public.boxing_events e
              where e.id = coalesce(n.boxing_event_id, (select b.event_id from public.boxing_bouts b where b.id = n.bout_id))
                and e.event_date < (n.detected_at at time zone 'UTC')::date - 14);

-- Market consensus as the database knew it at p_as_of: only ticks captured AND
-- recorded by then (a tick replayed later is not known at an earlier time),
-- and only prices at most 48 hours old at p_as_of.
create or replace function public.boxing_market_consensus_as_of(p_bout uuid, p_as_of timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  with last_tick as (
    select distinct on (s.id) m.market_key, s.selection_key, t.implied_probability, t.american_odds,
           coalesce(t.provider_timestamp, t.captured_at) as observed_at
    from public.boxing_market_ticks t
    join public.boxing_market_selections s on s.id = t.selection_id
    join public.boxing_markets m on m.id = s.market_id
    where m.bout_id = p_bout and m.market_key like 'moneyline%|pre' and t.market_status = 'open' and t.american_odds is not null
      and t.captured_at <= p_as_of and t.recorded_at <= p_as_of and t.captured_at >= p_as_of - interval '48 hours'
    order by s.id, coalesce(t.provider_timestamp, t.captured_at) desc, t.id desc)
  select coalesce(jsonb_agg(jsonb_build_object('market_key', x.market_key, 'selection_key', x.selection_key, 'bookmaker_count', x.n,
      'consensus_implied', x.consensus, 'min_american', x.min_a, 'max_american', x.max_a, 'newest_price_at', x.newest, 'as_of', p_as_of)
      order by x.market_key, x.selection_key), '[]'::jsonb)
  from (select market_key, selection_key, count(*) n, percentile_cont(0.5) within group (order by implied_probability) consensus,
               min(american_odds) min_a, max(american_odds) max_a, max(observed_at) newest
        from last_tick group by 1, 2) x
$$;

-- News context, as of the news event: market and Fight DNA are what was known
-- when the event was detected, never what was learned afterwards.
create or replace function public.boxing_news_context(p_news_event uuid)
returns jsonb language sql stable set search_path = '' as $$
  with n as (select * from public.boxing_news_events where id = p_news_event),
  fighter_ids as (
    select distinct x as id from n, unnest(n.fighter_ids) x
    union select p.fighter_id from n join public.boxing_bout_participants p on p.bout_id = n.bout_id
      and p.participant_status in ('scheduled','confirmed')
  )
  select jsonb_build_object(
    'news_event', (select to_jsonb(n) from n),
    'as_of', (select detected_at from n),
    'supersedes', (select to_jsonb(s) from n join public.boxing_news_events s on s.id = n.supersedes_id),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('source_key', s.source_key, 'source_name', s.source_name,
                                                             'rights_state', s.rights_state, 'display_allowed', s.display_allowed,
                                                             'attribution_required', s.attribution_required)), '[]'::jsonb)
                from public.boxing_sources s
                where s.source_key in (select jsonb_array_elements(n.sources) ->> 'source_key' from n)),
    'fighters', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'public_id', f.public_id, 'display_name', f.display_name,
                                                             'identity_state', f.identity_state, 'nationality', f.nationality) order by f.display_name), '[]'::jsonb)
                 from public.boxing_fighters f where f.id in (select id from fighter_ids)),
    'bout', (select jsonb_build_object('id', b.id, 'public_id', b.public_id, 'status', b.status, 'scheduled_rounds', b.scheduled_rounds,
                                       'contracted_weight_lb', b.contracted_weight_lb, 'is_catchweight', b.is_catchweight,
                                       'weight_class', (select jsonb_build_object('key', wc.class_key, 'name', wc.name, 'max_weight_lb', wc.max_weight_lb)
                                                        from public.boxing_weight_classes wc where wc.id = b.weight_class_id),
                                       'participants', (select coalesce(jsonb_agg(jsonb_build_object('fighter_id', p.fighter_id, 'side', p.side,
                                                          'record_wins', p.record_wins, 'record_losses', p.record_losses, 'record_draws', p.record_draws,
                                                          'record_source_id', p.source_id) order by p.side), '[]'::jsonb)
                                                        from public.boxing_bout_participants p where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')),
                                       'titles', (select coalesce(jsonb_agg(jsonb_build_object('title_id', t.id, 'organization', o.short_name, 'tier', t.tier,
                                                     'source_native_label', t.source_native_label, 'eligible_fighter_id', bt.eligible_fighter_id) order by o.slug), '[]'::jsonb)
                                                  from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id
                                                  join public.boxing_organizations o on o.id = t.organization_id
                                                  where bt.bout_id = b.id and bt.at_stake),
                                       'result', (select to_jsonb(r) from public.boxing_bout_results_current r where r.bout_id = b.id),
                                       'officials', (select coalesce(jsonb_agg(jsonb_build_object('official_id', o.id, 'display_name', o.display_name, 'role', bo.role, 'slot', bo.slot)
                                                        order by bo.role, bo.slot), '[]'::jsonb)
                                                     from public.boxing_bout_officials bo join public.boxing_officials o on o.id = bo.official_id
                                                     where bo.bout_id = b.id and bo.assignment_state in ('assigned','worked')))
             from n join public.boxing_bouts b on b.id = n.bout_id),
    'event', (select jsonb_build_object('id', e.id, 'public_id', e.public_id, 'name', e.name, 'event_date', e.event_date, 'status', e.status,
                                        'venue', (select jsonb_build_object('name', v.name, 'city', v.city, 'country_code', v.country_code) from public.boxing_venues v where v.id = e.venue_id),
                                        'commission', (select jsonb_build_object('name', c.name, 'slug', c.slug) from public.boxing_commissions c where c.id = e.commission_id))
              from public.boxing_events e
              where e.id = coalesce((select boxing_event_id from n), (select b.event_id from n join public.boxing_bouts b on b.id = n.bout_id))),
    'previous_meetings', (select coalesce(jsonb_agg(jsonb_build_object('bout_id', b.id, 'event_date', e.event_date, 'outcome', r.outcome,
                                                                      'winner_id', r.winner_id, 'method', r.method) order by e.event_date), '[]'::jsonb)
                          from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
                          left join public.boxing_bout_results_current r on r.bout_id = b.id
                          where b.id <> coalesce((select bout_id from n), '00000000-0000-0000-0000-000000000000'::uuid)
                            and (select count(*) from fighter_ids) = 2
                            and (select count(*) from public.boxing_bout_participants p where p.bout_id = b.id
                                 and p.participant_status in ('scheduled','confirmed') and p.fighter_id in (select id from fighter_ids)) = 2),
    'fight_dna', (select coalesce(jsonb_agg(jsonb_build_object('fighter_id', m.fighter_id, 'metric_key', m.metric_key, 'metric_version', m.metric_version,
                                                              'as_of', m.as_of, 'value_number', m.value_number, 'sample_size', m.sample_size,
                                                              'metric_name', d.name) order by m.fighter_id, m.metric_key), '[]'::jsonb)
                  from (select distinct on (s.fighter_id, s.metric_key) s.* from public.boxing_fighter_metric_snapshots s
                        where s.fighter_id in (select id from fighter_ids) and s.created_at <= (select detected_at from n)
                        order by s.fighter_id, s.metric_key, s.as_of desc) m
                  join public.boxing_metric_definitions d on d.metric_key = m.metric_key and d.version = m.metric_version
                  where d.retired_at is null),
    'weigh_in_history', (select coalesce(jsonb_agg(jsonb_build_object('weigh_in_id', w.id, 'fighter_id', w.fighter_id, 'weigh_in_kind', w.weigh_in_kind,
                                                                     'attempt_no', w.attempt_no, 'official_weight_lb', w.official_weight_lb,
                                                                     'verification_state', w.verification_state, 'revision', w.revision,
                                                                     'source_key', s.source_key) order by w.fighter_id, w.attempt_no, w.revision), '[]'::jsonb)
                         from public.boxing_weigh_ins w join public.boxing_sources s on s.id = w.source_id
                         where w.bout_id = (select bout_id from n)),
    'market', (select public.boxing_market_consensus_as_of(n.bout_id, n.detected_at) from n where n.bout_id is not null)
  )
$$;

-- ---------------------------------------------------------------------------
-- First-party promoter/event sources for upcoming cards (review 2026-09-13,
-- docs/BOXING_SOURCE_ACQUISITION.md section G). None approved; all disabled.
-- ---------------------------------------------------------------------------
insert into public.boxing_sources (source_key, source_name, source_kind, homepage_url, terms_url, access_mode, rights_state,
  redistribution_allowed, enabled, persistence_allowed, derivative_allowed, display_allowed, intended_use, rights_note)
values
  ('promoter_top_rank', 'Top Rank', 'promotion', 'https://toprank.com/', 'https://www.toprank.com/terms-of-use', 'blocked', 'prohibited', false, false, false, false, false,
   'Candidate for upcoming cards.', 'BLOCKED (2026-09-13): terms prohibit robot/spider/scraper collection and commercial use.'),
  ('promoter_matchroom', 'Matchroom Boxing', 'promotion', 'https://www.matchroomboxing.com/', 'https://www.matchroomboxing.com/terms-conditions/', 'review_required', 'unknown', false, false, false, false, false,
   'Candidate for upcoming cards.', 'REVIEW REQUIRED (2026-09-13): only ticket terms found, no website-use grant; written permission is the path.'),
  ('promoter_golden_boy', 'Golden Boy Promotions', 'promotion', 'https://www.goldenboy.com/', 'https://www.goldenboy.com/disclaimer/', 'review_required', 'unknown', false, false, false, false, false,
   'Candidate for upcoming cards.', 'REVIEW REQUIRED (2026-09-13): disclaimer says any other use needs written permission; referenced terms of use not found.'),
  ('promoter_pbc', 'Premier Boxing Champions', 'promotion', 'https://www.premierboxingchampions.com/', 'https://www.premierboxingchampions.com/terms-of-use', 'review_required', 'unknown', false, false, false, false, false,
   'Candidate for upcoming cards.', 'REVIEW REQUIRED (2026-09-13): one-copy, no-distribution licence; robots Crawl-delay 10; written permission is the path.'),
  ('promoter_queensberry', 'Queensberry Promotions', 'promotion', 'https://queensberry.co.uk/', 'https://queensberry.co.uk/policies/terms-of-service', 'blocked', 'prohibited', false, false, false, false, false,
   'Candidate for upcoming cards.', 'BLOCKED (2026-09-13): terms prohibit use "to spider, crawl, or scrape".'),
  ('promoter_boxxer', 'BOXXER', 'promotion', 'https://www.boxxer.com/', 'https://www.boxxer.com/terms-conditions/', 'blocked', 'prohibited', false, false, false, false, false,
   'Candidate for upcoming cards.', 'BLOCKED (2026-09-13): terms prohibit use "to spider, crawl, or scrape".'),
  ('promoter_ohashi', 'Ohashi Boxing Gym / Phoenix Promotion', 'promotion', 'https://www.ohashi-gym.com/', 'https://www.ohashi-gym.com/', 'review_required', 'unknown', false, false, false, false, false,
   'Candidate for upcoming Japanese cards.', 'REVIEW REQUIRED (2026-09-13): no terms or robots.txt; "All rights reserved" notice only.'),
  ('promoter_riyadh_season', 'Riyadh Season', 'promotion', 'https://riyadhseason.com/', 'https://riyadhseason.com/en/terms', 'review_required', 'unknown', false, false, false, false, false,
   'Candidate for upcoming cards.', 'REVIEW REQUIRED (2026-09-13): terms page script-rendered and unreadable to review.'),
  ('promoter_mvp', 'Most Valuable Promotions', 'promotion', 'https://www.mostvaluablepromotions.com/', 'https://www.mostvaluablepromotions.com/terms-and-conditions/', 'reference_only', 'reference_only', false, false, false, false, false,
   'Candidate for upcoming cards.', 'REFERENCE ONLY (2026-09-13): robots Content-Signal use=reference, ai-train=no (EU DSM Art. 4 reservation); terms returned 403.')
on conflict (source_key) do nothing;

do $$
declare r record; v_src uuid;
begin
  for r in select source_key, terms_url, access_mode, rights_note from public.boxing_sources where source_key like 'promoter\_%' loop
    select id into v_src from public.boxing_sources where source_key = r.source_key;
    insert into public.boxing_source_rights_reviews
      (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses, account_agreement_found, account_scope_note, next_review_due, notes)
    values (v_src, '2026-09-13T20:00:00Z', 'Access/terms review by Claude Code session 2026-09-13 (read terms, robots.txt and one schedule page; no contact made)',
            r.terms_url, case r.access_mode when 'blocked' then 'blocked' when 'reference_only' then 'reference_only' else 'review_required' end,
            case when r.access_mode = 'reference_only' then array['human reading to corroborate a matchup during identity review'] else '{}'::text[] end,
            array['automated collection of cards or any page content', 'using promoter names or cards as identity evidence without an approved source'],
            false, 'No account or agreement; a free written-permission request is possible where a contact is published (not made).', '2026-12-13', r.rights_note)
    on conflict (source_id, reviewed_at) do nothing;
    update public.boxing_sources set latest_rights_review_id = (select id from public.boxing_source_rights_reviews where source_id = v_src and reviewed_at = '2026-09-13T20:00:00Z'),
      reviewed_at = '2026-09-13T20:00:00Z', next_review_due = '2026-12-13'
    where id = v_src and latest_rights_review_id is null;
  end loop;
end $$;

select public.boxing_lockdown();

commit;
