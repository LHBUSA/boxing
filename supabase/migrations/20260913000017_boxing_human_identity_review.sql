-- PropBetEdge Boxing — human identity review on the appearance ledger.
--
-- The graph resolver decides only Tier A/B. Everything else waits for a person.
-- A human decision is a NEW row in boxing_identity_appearance_decisions (never an
-- update of earlier resolver evidence) and must carry: reviewer, reviewed_at,
-- review batch, a substantive note, the evidence shown to the reviewer, and the
-- sequence number of the latest decision the reviewer saw (so a decision made
-- on stale evidence is refused). Automated actors cannot sign as reviewers.
-- Rerunnable.

begin;

alter table public.boxing_identity_appearance_decisions
  add column if not exists reviewer text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists review_batch text,
  add column if not exists supersedes_seq bigint;

select public.boxing_ensure_constraint('public.boxing_identity_appearance_decisions', 'boxing_appearance_human_review_complete',
  $c$check (decided_by = 'resolver' or (reviewer is not null and reviewed_at is not null and review_batch is not null
            and length(btrim(coalesce(review_note, ''))) >= 20 and decided_by = 'reviewer:' || reviewer
            and reviewer !~* '(resolver|claude|gpt|openai|anthropic|\mbot\M|automat|script|system)'))$c$);

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
  v_human boolean;
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
  v_human := v_by <> 'resolver';
  if v_human and (coalesce(p ->> 'reviewer', '') = '' or length(btrim(coalesce(p ->> 'review_note', ''))) < 20 or coalesce(p ->> 'review_batch', '') = '') then
    raise exception 'human_review_requires_reviewer_batch_and_note' using errcode = '22023';
  end if;
  v_key := v_bout || '|' || v_side;
  perform pg_advisory_xact_lock(hashtextextended('boxing_appearance:' || v_ns || '|' || v_key, 0));

  select * into v_prev from public.boxing_identity_appearance_decisions
  where namespace = v_ns and appearance_key = v_key order by seq desc limit 1;
  if v_prev.seq is not null and not v_human then
    if v_prev.decision in ('matched','created') then
      return jsonb_build_object('status', 'already_bound', 'decision', v_prev.decision, 'tier', v_prev.tier,
        'fighter_id', public.boxing_canonical_fighter_id(v_prev.fighter_id));
    end if;
    if v_decision = 'review' and v_prev.resolver_version = p ->> 'resolver_version' and v_prev.evidence_hash = p ->> 'evidence_hash' then
      return jsonb_build_object('status', 'unchanged', 'decision', 'review', 'tier', 'C');
    end if;
  end if;
  -- a reviewer decides on the evidence they were shown: the latest decision must be the one they saw
  if v_human and (nullif(p ->> 'supersedes_seq', '')::bigint is distinct from v_prev.seq) then
    raise exception 'stale_review: latest decision is %, reviewer saw %', v_prev.seq, p ->> 'supersedes_seq' using errcode = 'BX041';
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
      case when p ->> 'tier' in ('A','D') or v_human then 'verified' else 'review' end);
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
     evidence, evidence_hash, resolver_version, observation_id, review_item_id, ingest_run_id, decided_by,
     reviewer, reviewed_at, review_note, review_batch, supersedes_seq)
  values (v_src.id, v_ns, v_key, v_bout, v_side, p ->> 'observed_name', v_decision, p ->> 'tier', v_fighter,
          coalesce((p ->> 'confidence')::smallint, 0), coalesce(p -> 'evidence', '{}'::jsonb), coalesce(p ->> 'evidence_hash', ''),
          p ->> 'resolver_version', v_obs,
          (select l.entity_id::uuid from public.boxing_observation_links l where l.observation_id = v_obs and l.entity_type = 'identity_review' limit 1),
          nullif(p ->> 'ingest_run_id', '')::uuid, v_by,
          case when v_human then p ->> 'reviewer' end, case when v_human then coalesce(nullif(p ->> 'reviewed_at', '')::timestamptz, now()) end,
          case when v_human then p ->> 'review_note' end, case when v_human then p ->> 'review_batch' end, nullif(p ->> 'supersedes_seq', '')::bigint)
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
          resolution_note = case when v_human
            then format('closed by human review (batch %s, reviewer %s): %s', p ->> 'review_batch', p ->> 'reviewer', p ->> 'review_note')
            else format('closed by %s: every linked appearance bound (latest tier %s); evidence in boxing_identity_appearance_decisions',
                        p ->> 'resolver_version', p ->> 'tier') end,
          resolved_by = case when v_human then v_by else 'resolver:' || (p ->> 'resolver_version') end,
          resolved_at = now()
        where id = v_item.id;
        v_closed := v_closed || v_item.id;
      end if;
    end loop;
  end if;

  return jsonb_build_object('status', 'recorded', 'decision_id', v_id, 'decision_seq', (select seq from public.boxing_identity_appearance_decisions where id = v_id),
    'decision', v_decision, 'tier', p ->> 'tier', 'fighter_id', v_fighter, 'observation_id', v_obs, 'review_items_closed', to_jsonb(v_closed));
end $$;

-- Latest decision sequence per appearance (reviewers must cite it).
create or replace function public.boxing_appearance_latest(p_namespace text, p_keys text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(x.appearance_key, jsonb_build_object('seq', x.seq, 'decision', x.decision, 'tier', x.tier,
      'fighter_id', x.fighter_id, 'decided_by', x.decided_by, 'decided_at', x.decided_at)), '{}'::jsonb)
  from (select distinct on (d.appearance_key) d.* from public.boxing_identity_appearance_decisions d
        where d.namespace = p_namespace and d.appearance_key = any (p_keys) order by d.appearance_key, d.seq desc) x
$$;

-- Name / hometown index for sibling, twin and same-name danger checks.
create or replace function public.boxing_fighter_name_index()
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'display_name', f.display_name,
      'hometowns', (select coalesce(jsonb_agg(distinct h.h), '[]'::jsonb) from (
          select f.hometown as h where f.hometown is not null
          union select c.value #>> '{}' from public.boxing_fighter_attribute_claims c where c.fighter_id = f.id and c.attribute = 'hometown') h),
      'bouts', (select count(*) from public.boxing_bout_participants p where p.fighter_id = f.id and p.participant_status in ('scheduled','confirmed')))
    order by f.id), '[]'::jsonb)
  from public.boxing_fighters f where f.identity_state <> 'merged'
$$;

select public.boxing_lockdown();

commit;
