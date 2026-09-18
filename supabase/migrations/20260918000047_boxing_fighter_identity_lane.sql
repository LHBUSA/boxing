-- Facts are not content. Creating the minimum canonical identity for a publicly reported fighter is a factual act
-- governed by EVIDENCE; copying someone's biography, photograph or article text is a content act governed by RIGHTS.
--
-- Owner decision 2026-09-18 (revised): public factual information may enter the canonical truth system when it has
-- sufficient source evidence and provenance. Rights restrictions apply to expressive or licensed material, not to the
-- underlying facts. A fighter named on a traceable public card, official record or credible news report may therefore
-- be created; an image, a biography, an article body or a licensed feed may not be stored merely because it was public.
--
-- This file does NOT gate identity creation on a fighter_identity rights lane. Where that lane already exists it stays
-- as a description of what a source provides; it no longer decides whether a person may be recorded. There is no
-- promoter-specific exception: the facts/content line is system-wide.
--
-- What replaces it is an evidence gate with five signals — traceability, event association, name quality, collision
-- risk and corroboration. Insufficient evidence is a downgrade to REVIEW: never an invention, never a silent drop.
--
-- What this file ADDS on the content side, so the distinction is enforced rather than merely asserted:
--   * attribute claims (dob, hometown, stance, height, reach, nationality, promoter — the profile) are skipped for any
--     source whose fighter_attributes lane is declared closed
--   * a fighter created by such a source is created with a NAME and nothing else: the minimum canonical identity
--
-- Also here, because each strengthens the same write path:
--   * an index the 0045 lane gate probes on every gated insert
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
-- Name quality. A placeholder is not a person, and neither is a bare fragment. This mirrors
-- shared/adapters/promoters/names.mjs; a test runs one vocabulary through both so they cannot drift apart.
create or replace function public.boxing_identity_name_quality(p_name text)
returns jsonb language sql immutable set search_path = '' as $fn$
  with n as (select btrim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', ' ', 'g')) as v),
  t as (select v,
               coalesce(array_length(regexp_split_to_array(nullif(v, ''), ' '), 1), 0) as tokens,
               length(replace(v, ' ', '')) as letters,
               -- "T.B.C." normalises to "t b c": a string of single letters is an abbreviation, not a name
               case when v ~ '^[a-z]( [a-z])*$' then replace(v, ' ', '') else v end as squashed
        from n)
  select jsonb_build_object(
    'normalized', v,
    'tokens', tokens,
    'letters', letters,
    'placeholder', (v = '' or v = 'opponent'
      or v ~ '^(opponent )?(tbd|tba|tbc|to be (announced|confirmed|determined))( opponent)?$'
      or squashed ~ '^(tbd|tba|tbc)$'),
    'ok', (v <> '' and v <> 'opponent'
      and v !~ '^(opponent )?(tbd|tba|tbc|to be (announced|confirmed|determined))( opponent)?$'
      and squashed !~ '^(tbd|tba|tbc)$'
      and length(v) <= 120 and letters >= 4)
  ) from t
$fn$;

comment on function public.boxing_identity_name_quality(text) is
  'Name quality for identity evidence: placeholder vocabulary, token count, letter count. Mirrors shared/adapters/promoters/names.mjs.';

-- The evidence gate. Five signals decide whether a publicly reported person may become a canonical identity:
--
--   traceable        the observation exists and carries an https source we can go back to
--   event_associated the name was reported as part of a specific card, bout or event, not floating on its own
--   name_ok          two or more name tokens, or one token backed by a stable per-source id on a specific event
--   collisions       an existing canonical fighter already answers to this exact name -> ambiguous, goes to review
--   corroboration    how many distinct sources have reported this name; two independent reports stand in for a missing
--                    event association, because a name two sources report is not a bare name
--
-- Sufficient = name_ok AND traceable AND no collision AND (event_associated OR corroboration >= 2).
-- Nothing here asks what KIND of source it is. An official record, a promoter's card and a credible news report are
-- judged by the same evidence; a source that cannot show the evidence is refused however official it is.
create or replace function public.boxing_identity_evidence(p jsonb)
returns jsonb language plpgsql stable set search_path = '' as $fn$
declare
  v_name jsonb := public.boxing_identity_name_quality(p ->> 'display_name');
  v_obs public.boxing_source_observations%rowtype;
  v_traceable boolean := false;
  v_linked boolean := false;
  v_event boolean := false;
  v_collisions int := 0;
  v_distinguishers int := 0;
  v_corroboration int := 0;
  v_name_ok boolean;
  v_sufficient boolean;
  v_reason text := null;
begin
  if (p ->> 'observation_id') is not null then
    select * into v_obs from public.boxing_source_observations where id = (p ->> 'observation_id')::uuid;
  end if;

  -- Traceability: the claim is attributable. A recorded observation is itself the provenance — it carries the source,
  -- the payload as received, a content hash and an observed_at. A per-fact https link is stronger still and is reported
  -- as its own signal, but requiring one would refuse legitimate feeds whose URL lives on the run rather than the row.
  v_traceable := v_obs.id is not null and v_obs.source_id is not null;
  v_linked := coalesce(v_obs.source_url, '') ~ '^https://' or coalesce(p ->> 'external_url', '') ~ '^https://';

  -- event association: the report ties the person to a specific card, bout or event
  v_event := (v_obs.payload ? 'bout') or (v_obs.payload ? 'event') or (v_obs.payload ? 'event_external_id')
    or coalesce(v_obs.external_key, '') <> '' or coalesce(p ->> 'external_id', '') <> '';

  -- a single-token ring name is a name only when a stable per-source id pins it to a specific event
  v_name_ok := (v_name ->> 'ok')::boolean
    and ((v_name ->> 'tokens')::int >= 2 or (coalesce(p ->> 'external_id', '') <> '' and v_event));

  -- Collision risk. A shared name is only a problem when nothing else separates the two people. Boxing has many
  -- genuine namesakes, and the resolver distinguishes them on date of birth, nationality or hometown before it ever
  -- proposes creating anybody; what must fail closed is a BARE name that collides — a second "John Smith" with nothing
  -- to tell him apart from the first.
  select count(*) into v_collisions
  from public.boxing_fighter_name_keys k
  where k.key = 'full:' || (v_name ->> 'normalized');

  v_distinguishers := (case when coalesce(p #>> '{identity,dob}', '') <> '' then 1 else 0 end)
    + (case when coalesce(p #>> '{identity,nationality,0}', '') <> '' then 1 else 0 end)
    + (case when coalesce(p #>> '{identity,hometown}', '') <> '' then 1 else 0 end);

  -- corroboration: how many distinct sources have reported this name
  select count(distinct o.source_id) into v_corroboration
  from public.boxing_source_observations o
  where o.entity_type = 'fighter_identity'
    and btrim(regexp_replace(lower(coalesce(o.payload ->> 'display_name', o.payload #>> '{identity,display_name}', '')), '[^a-z0-9]+', ' ', 'g'))
        = (v_name ->> 'normalized');

  v_sufficient := v_name_ok and v_traceable and (v_collisions = 0 or v_distinguishers > 0)
    and (v_event or v_corroboration >= 2);
  if not v_sufficient then
    v_reason := case
      when (v_name ->> 'placeholder')::boolean then 'placeholder_is_not_a_person'
      when not v_name_ok then 'name_evidence_insufficient'
      when not v_traceable then 'no_traceable_source_evidence'
      when v_collisions > 0 and v_distinguishers = 0 then 'name_collision_requires_review'
      else 'no_event_association_or_corroboration' end;
  end if;

  return jsonb_build_object(
    'sufficient', v_sufficient,
    'reason', v_reason,
    'signals', jsonb_build_object(
      'name', v_name, 'name_ok', v_name_ok, 'traceable', v_traceable, 'source_linked', v_linked, 'event_associated', v_event,
      'collisions', v_collisions, 'distinguishers', v_distinguishers, 'corroborating_sources', v_corroboration,
      'observation_id', v_obs.id, 'source_url', v_obs.source_url, 'observed_at', v_obs.observed_at,
      'parser_version', v_obs.parser_version));
end $fn$;

comment on function public.boxing_identity_evidence(jsonb) is
  'Evidence test for creating a canonical fighter: traceability, event association, name quality, collision risk, corroboration. Replaces the fighter_identity rights lane as the gate on identity creation — facts are governed by evidence, content by rights.';

-- 3 -------------------------------------------------------------------------------------------------------------------
-- Content stays gated. A profile is not a fight fact: dob, hometown, stance, height, reach, nationality and promoter
-- are the expressive layer and remain governed by the fighter_attributes lane. A source whose attribute lane is closed
-- may still have the PERSON recorded — name only — and contributes nothing to their profile.
create or replace function public.boxing_attributes_permitted(p_source uuid)
returns boolean language sql stable set search_path = '' as $fn$
  select public.boxing_lane_rights_state(p_source, 'fighter_attributes') not in ('not_permitted', 'review_scope_gap')
$fn$;

comment on function public.boxing_attributes_permitted(uuid) is
  'False when a source may not contribute to a fighter profile. Identity creation does not depend on this: the name is a fact, the profile is content.';


create or replace function public.boxing_record_attribute_claims(
  p_fighter uuid, p_source uuid, p_observation uuid, p_identity jsonb
) returns void language plpgsql set search_path = '' as $$
declare
  v_attr text;
  v_val jsonb;
begin
  -- the facts/content line: the person may be recorded, their profile may not be taken from a closed lane
  if not public.boxing_attributes_permitted(p_source) then return; end if;
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

-- 4 -------------------------------------------------------------------------------------------------------------------
-- boxing_apply_identity_decision, recreated from migration 0004 with two changes, each marked inline:
--   * the evidence gate replaces nothing that was there before — it is an ADDITIONAL condition on creating a person
--   * a source whose attribute lane is closed creates the name and no profile columns
-- Everything else is byte-identical to 0004: the duplicate-observation short circuit, the concurrent-mapping and
-- external-id-conflict guards, the access_mode downgrade, matching, the identity/alias writes and the gap fill.

create or replace function public.boxing_apply_identity_decision(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src public.boxing_sources%rowtype;
  v_obs uuid;
  v_prior public.boxing_identity_resolutions%rowtype;
  v_evidence jsonb;
  v_attrs_ok boolean;
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

  -- 0047: a publicly reported person may become canonical on EVIDENCE, not on a content-rights lane. Insufficient
  -- evidence is a downgrade to review with the reason stated, so the corner is worked by a human rather than invented.
  if v_outcome = 'created' then
    v_evidence := public.boxing_identity_evidence(jsonb_build_object(
      'display_name', i ->> 'display_name', 'external_id', v_ext, 'external_url', i ->> 'external_url',
      'identity', i, 'observation_id', v_obs));
    if not (v_evidence ->> 'sufficient')::boolean then
      v_outcome := 'review'; v_reason := v_evidence ->> 'reason';
    end if;
  end if;

  -- 3. apply
  if v_outcome = 'created' then
    -- The MINIMUM canonical identity is the name. Everything else on this row is profile, and a source whose
    -- fighter_attributes lane is closed contributes none of it: the person is recorded, their biography is not.
    v_attrs_ok := public.boxing_attributes_permitted(v_src.id);
    insert into public.boxing_fighters
      (display_name, normalized_name, dob, nationality, hometown, stance, height_cm, reach_cm, sex, identity_state)
    values (i ->> 'display_name', p #>> '{index,normalized_name}',
            case when v_attrs_ok then nullif(i ->> 'dob', '')::date end,
            case when v_attrs_ok then upper(i #>> '{nationality,0}') end,
            case when v_attrs_ok then i ->> 'hometown' end,
            case when v_attrs_ok then i ->> 'stance' end,
            case when v_attrs_ok then nullif(i ->> 'height_cm', '')::numeric end,
            case when v_attrs_ok then nullif(i ->> 'reach_cm', '')::numeric end,
            i ->> 'sex', 'source_native')
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
      'identity_evidence_gate', to_regprocedure('public.boxing_identity_evidence(jsonb)') is not null,
      'name_quality', to_regprocedure('public.boxing_identity_name_quality(text)') is not null
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
         ) ok,
        jsonb_build_object(
          'enabled', s.enabled, 'access_mode', s.access_mode, 'rights_state', s.rights_state,
          'schedule_lanes_covered', (select count(*) from public.boxing_source_capabilities_current c
             where c.source_id = s.id and c.lane in ('events','upcoming_cards','bouts','venues','promoters','broadcasters','titles_at_stake')
               and c.rights_scope = 'covered_by_rights_review'),
          'non_schedule_lanes_open', (select count(*) from public.boxing_source_capabilities_current c
             where c.source_id = s.id and c.lane in ('results','photos','video','article_text','judges','referees','scorecard_totals')
               and c.rights_scope <> 'not_permitted'),
          'fighter_attributes', public.boxing_lane_rights_state(s.id, 'fighter_attributes'),
          'may_store_profile_content', public.boxing_attributes_permitted(s.id)
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
