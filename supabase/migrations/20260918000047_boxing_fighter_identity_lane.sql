-- Minting a canonical fighter is a rights decision, not a side effect of reading a card.
--
-- Until this migration, creating a boxer in boxing_fighters was the only canonical write on the promoter path with no
-- rights gate at all. The 0045 lane gate is a deny-list: it refuses 'review_scope_gap' and 'not_permitted' and lets
-- everything else through, so an UNDECLARED lane silently authorized the write. fighter_identity was undeclared for
-- nine ingesting sources, the two promoters among them.
--
-- This file inverts that for identity only. Creating a fighter now requires the source to hold fighter_identity as
-- 'covered_by_rights_review' — an allow-list. Not declared is a refusal, exactly like not permitted.
--
-- Refused does not mean lost. The decision is downgraded from 'created' to 'review' with a stated reason, so the corner
-- lands in the identity review queue with its observation intact, the card still writes, and a human can approve the
-- identity. Nothing is invented and nothing is thrown away.
--
-- Existing behaviour is preserved by declaring the lane explicitly for every source that already creates fighters:
-- the four commissions, the three sanctioning bodies whose ratings name boxers, and our own internal/manual sources.
-- The two promoters are declared 'review_scope_gap': their 2026-09-18 rights review approved announced SCHEDULE facts
-- and said nothing about minting canonical people from promotional pages. That is a gap for the owner to close, not an
-- omission for the code to assume past.
--
-- Also here, because each one strengthens the same write path:
--   * an index the 0045 gate probes on every gated insert
--   * security_invoker on the one view in the chain that was missing it
--   * a dismissed discovery candidate can no longer be resurrected by rediscovery
--   * boxing_promoter_lane_ready(): proves the schema half AND the data half of 0046 are both present

begin;

-- 1 -------------------------------------------------------------------------------------------------------------------
-- boxing_lane_rights_state() runs inside eight BEFORE INSERT triggers and filters capabilities by (source_id, lane).
-- There was no index for that predicate, so every gated insert paid a scan of the capability table.
create index if not exists boxing_source_capabilities_source_lane_idx
  on public.boxing_source_capabilities (source_id, lane);

-- Every other view in the chain is security_invoker; this one was not, so it ran with owner rights. boxing_lockdown()
-- already revokes anon and authenticated, so this changes no one's access today — it closes the inconsistency.
alter view public.boxing_event_truth_ledger set (security_invoker = true);

-- 2 -------------------------------------------------------------------------------------------------------------------
-- Declare fighter_identity everywhere it was merely absent. Sources that already create fighters keep doing so; the
-- promoters are marked as a scope gap and fail closed until the owner decides.
do $$
declare
  v_at timestamptz := '2026-09-18T21:00:00Z';
  v_by text := 'Justin Erickson (owner decision 2026-09-18: fighter identity is a declared lane)';
begin
  -- already creating fighters under an approved review: commissions read official bout sheets, sanctioning bodies
  -- publish ratings that name boxers, and the internal sources are our own records and our own human decisions
  insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, coverage_basis, acquisition_method, cadence,
    completeness, confidence, notes, evidence, recorded_by, commercial_use, storage_allowed, redistribution_allowed, public_display_allowed,
    pro_tier_allowed, internal_use_allowed, verification_state)
  select s.id, 'fighter_identity', 'provided', 'covered_by_rights_review', 'source_index_documented',
    case when s.source_kind = 'internal' then 'none' else 'html' end, 'daily', 'partial', 'high',
    case when s.source_kind = 'internal'
      then 'Internal source: our own canonical records and our own reviewed identity decisions. Declared so identity creation is never an undeclared write.'
      else 'The source names the boxers in the material its rights review already approves. Declared explicitly so identity creation is an approved lane, not an undeclared one.' end,
    jsonb_build_object('owner_decision', '2026-09-18', 'lane', 'fighter_identity', 'basis', 'preserves existing approved behaviour'), v_by,
    'allowed', 'allowed', 'prohibited', 'allowed', 'allowed', 'allowed',
    case when s.source_kind = 'internal' then 'secondary_evidence' else 'verified_terms_read' end
  from public.boxing_sources s
  where s.source_key in ('mo_office_of_athletics', 'nj_sacb', 'pa_state_athletic_commission', 'tn_athletic_commission',
                         'ibf_official', 'wbc_official', 'wbo_official',
                         'pbe_boxing_internal', 'pbe_manual_review')
    and not exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = s.id and c.lane = 'fighter_identity');

  -- the promoters: schedule permission is not permission to mint a person
  insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, coverage_basis, acquisition_method,
    completeness, confidence, notes, evidence, recorded_by, commercial_use, storage_allowed, redistribution_allowed, public_display_allowed,
    pro_tier_allowed, internal_use_allowed, verification_state)
  select s.id, 'fighter_identity', 'provided', 'review_scope_gap', 'none', 'none', 'unknown', 'high',
    'The 2026-09-18 review approved announced schedule facts only. Creating a canonical fighter from a promotional page was not reviewed, so it fails closed: a corner that cannot be matched goes to identity review instead of minting a person.',
    jsonb_build_object('owner_decision', '2026-09-18', 'lane', 'fighter_identity', 'basis', 'not covered by the schedule review'), v_by,
    'unresolved', 'unresolved', 'prohibited', 'unresolved', 'unresolved', 'conditional', 'verified_terms_read'
  from public.boxing_sources s
  where s.source_key in ('promoter_pbc', 'promoter_matchroom')
    and not exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = s.id and c.lane = 'fighter_identity');
end $$;

-- 3 -------------------------------------------------------------------------------------------------------------------
-- The gate itself. An allow-list for identity creation: only 'covered_by_rights_review' may mint a fighter, so an
-- undeclared lane refuses exactly like a forbidden one. Matching an existing fighter is untouched — reading the graph
-- to recognise someone we already hold is not the same act as creating them.
create or replace function public.boxing_fighter_identity_lane_allows_create(p_source uuid)
returns boolean language sql stable set search_path = '' as $$
  select public.boxing_lane_rights_state(p_source, 'fighter_identity') = 'covered_by_rights_review'
$$;

comment on function public.boxing_fighter_identity_lane_allows_create(uuid) is
  'True only when the source explicitly holds the fighter_identity lane under an approved rights review. Undeclared is false: identity creation is allow-listed, unlike the 0045 write gate which is a deny-list.';

-- 4 -------------------------------------------------------------------------------------------------------------------
-- boxing_apply_identity_decision, recreated from migration 0004 with ONE added condition in its policy-guard block.
-- Nothing else in the body changes: the duplicate-observation short circuit, the concurrent-mapping and
-- external-id-conflict guards, the access_mode downgrade, matching, the identity/alias/claim writes and the
-- verified-match gap fill are all byte-identical to 0004. The addition is marked inline with a 0047 comment.
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
  -- 0047: minting a canonical fighter needs the fighter_identity lane, explicitly approved. Undeclared is a refusal.
  elsif v_outcome = 'created' and not public.boxing_fighter_identity_lane_allows_create(v_src.id) then
    v_outcome := 'review'; v_reason := 'fighter_identity_lane_not_approved';
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

-- 5 -------------------------------------------------------------------------------------------------------------------
-- A dismissed candidate could be resurrected. boxing_record_event_candidate's ON CONFLICT set canonical_event_id from
-- coalesce(existing, excluded) and then re-derived the state, so a candidate a human had dismissed flipped back to
-- 'matched' the moment a same-day event appeared — carrying its dismissed_reason with it, and violating the table's own
-- check that only matched/promoted rows may hold a canonical event. A dismissal is a human decision; rediscovering the
-- same page does not undo it. Recreated from 0046 with 'dismissed' made sticky, exactly as 'promoted' already was.
create or replace function public.boxing_record_event_candidate(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_id uuid;
  v_match uuid;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  -- a candidate is discovery, not canonical data: it needs the source to be known, not to hold any writing lane
  select e.id into v_match from public.boxing_events e
  where e.event_date = nullif(p ->> 'probable_date', '')::date
    and (lower(e.name) = lower(p ->> 'discovered_name')
         or exists (select 1 from public.boxing_venues v where v.id = e.venue_id and lower(v.city) = lower(p ->> 'probable_city')))
  limit 1;
  insert into public.boxing_event_discovery_candidates (source_id, external_key, discovered_name, probable_date, probable_city, probable_country,
    probable_promoter, probable_broadcaster, headline, source_url, confidence, state, canonical_event_id, match_basis, observation_id)
  values (v_src, p ->> 'external_key', p ->> 'discovered_name', nullif(p ->> 'probable_date', '')::date, p ->> 'probable_city', p ->> 'probable_country',
    p ->> 'probable_promoter', p ->> 'probable_broadcaster', p ->> 'headline', p ->> 'source_url', coalesce(p ->> 'confidence', 'medium'),
    case when v_match is null then 'open' else 'matched' end, v_match,
    case when v_match is null then null else 'same date and event name or city' end, nullif(p ->> 'observation_id', '')::uuid)
  on conflict (source_id, external_key) do update
    set discovered_name = excluded.discovered_name, probable_date = excluded.probable_date, probable_city = excluded.probable_city,
        probable_promoter = excluded.probable_promoter, probable_broadcaster = excluded.probable_broadcaster, headline = excluded.headline,
        -- a dismissed candidate holds no canonical event, and rediscovery does not give it one
        canonical_event_id = case when public.boxing_event_discovery_candidates.state = 'dismissed' then null
                                  else coalesce(public.boxing_event_discovery_candidates.canonical_event_id, excluded.canonical_event_id) end,
        state = case when public.boxing_event_discovery_candidates.state = 'promoted' then 'promoted'
                     when public.boxing_event_discovery_candidates.state = 'dismissed' then 'dismissed'
                     when coalesce(public.boxing_event_discovery_candidates.canonical_event_id, excluded.canonical_event_id) is not null then 'matched'
                     else public.boxing_event_discovery_candidates.state end,
        match_basis = case when public.boxing_event_discovery_candidates.state = 'dismissed' then public.boxing_event_discovery_candidates.match_basis
                           else coalesce(public.boxing_event_discovery_candidates.match_basis, excluded.match_basis) end
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'matched_event', v_match, 'state', (select state from public.boxing_event_discovery_candidates where id = v_id));
end $$;

-- 6 -------------------------------------------------------------------------------------------------------------------
-- Half-apply detection. Migration 0046 has two halves: the SCHEMA half (the candidates table and three functions, which
-- the runtime binds to) and the DATA half (the source approvals and the capability rows, which actually open the lane).
-- Applying one without the other fails OPEN: the code would run, the lane would read 'not_declared', and 0045's
-- deny-list would wave the writes through. This function refuses to call the lane ready unless BOTH halves are present,
-- and the collector and the staging runner both check it before a single write.
create or replace function public.boxing_promoter_lane_ready(p_source_keys text[] default array['promoter_pbc','promoter_matchroom'])
returns jsonb language sql stable set search_path = '' as $$
  with schema_half as (
    select jsonb_build_object(
      'discovery_candidates_table', to_regclass('public.boxing_event_discovery_candidates') is not null,
      'capabilities_view', to_regclass('public.boxing_source_capabilities_current') is not null,
      'record_event_candidate', to_regprocedure('public.boxing_record_event_candidate(jsonb)') is not null,
      'event_priority', to_regprocedure('public.boxing_event_priority(uuid)') is not null,
      'coverage_health', to_regprocedure('public.boxing_pro_coverage_health(int)') is not null,
      'lane_rights_state', to_regprocedure('public.boxing_lane_rights_state(uuid,text)') is not null,
      'bouts_lane_trigger', exists (select 1 from pg_trigger where tgname = 'boxing_bouts_lane_gate' and not tgisinternal),
      'identity_lane_gate', to_regprocedure('public.boxing_fighter_identity_lane_allows_create(uuid)') is not null
    ) j
  ),
  data_half as (
    select coalesce(jsonb_object_agg(k.source_key, k.detail), '{}'::jsonb) j,
           coalesce(bool_and(k.ok), false) ok, count(*) n
    from (
      select s.source_key,
        (s.enabled and s.access_mode = 'approved_ingest' and s.rights_state = 'approved'
         and (select count(*) from public.boxing_source_capabilities_current c
               where c.source_id = s.id and c.lane in ('events','upcoming_cards','bouts','venues','promoters','broadcasters','titles_at_stake')
                 and c.rights_scope = 'covered_by_rights_review') = 7
         and not exists (select 1 from public.boxing_source_capabilities_current c
               where c.source_id = s.id and c.lane in ('results','photos','video','article_text','judges','referees','scorecard_totals')
                 and c.rights_scope <> 'not_permitted')
         and exists (select 1 from public.boxing_source_capabilities_current c
               where c.source_id = s.id and c.lane = 'fighter_identity')) ok,
        jsonb_build_object(
          'enabled', s.enabled, 'access_mode', s.access_mode, 'rights_state', s.rights_state,
          'schedule_lanes_covered', (select count(*) from public.boxing_source_capabilities_current c
             where c.source_id = s.id and c.lane in ('events','upcoming_cards','bouts','venues','promoters','broadcasters','titles_at_stake')
               and c.rights_scope = 'covered_by_rights_review'),
          'non_schedule_lanes_open', (select count(*) from public.boxing_source_capabilities_current c
             where c.source_id = s.id and c.lane in ('results','photos','video','article_text','judges','referees','scorecard_totals')
               and c.rights_scope <> 'not_permitted'),
          'fighter_identity', public.boxing_lane_rights_state(s.id, 'fighter_identity'),
          'may_create_fighters', public.boxing_fighter_identity_lane_allows_create(s.id)
        ) detail
      from public.boxing_sources s where s.source_key = any(p_source_keys)
    ) k
  )
  select jsonb_build_object(
    'ready', (select bool_and(e.value::boolean) from schema_half, jsonb_each_text(schema_half.j) e)
             and (select ok from data_half) and (select n from data_half) = cardinality(p_source_keys),
    'schema_half', (select j from schema_half),
    'schema_half_complete', (select bool_and(e.value::boolean) from schema_half, jsonb_each_text(schema_half.j) e),
    'data_half', (select j from data_half),
    'data_half_complete', (select ok from data_half) and (select n from data_half) = cardinality(p_source_keys),
    'sources_expected', cardinality(p_source_keys),
    'sources_found', (select n from data_half)
  )
$$;

comment on function public.boxing_promoter_lane_ready(text[]) is
  'Both halves of migration 0046 must be present before the promoter collector may write: the schema objects the runtime binds to, and the source approvals plus capability rows that actually open the lane. Half-applied fails open otherwise.';

commit;
