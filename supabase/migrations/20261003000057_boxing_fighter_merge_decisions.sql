-- Owner-reviewed fighter merges with lineage, and two more identity-seed decision classes (owner decision 2026-10-03).
--
-- 1. public.boxing_fighter_merge_decisions (append-only): every merge names a human reviewer and keeps both fighter ids,
--    the checks it passed and the evidence. The merged row is never deleted: it keeps its identities, source claims,
--    name keys and seed decision, and resolves to the survivor through merged_into_id (boxing_canonical_fighter_id).
-- 2. public.boxing_merge_fighters(p jsonb): refuses a merge unless every required check passes, computed here from the
--    stored rows, not asserted by the caller:
--      first_last        first and last name agree (middle names and Jr/Sr/II/III/IV ignored, accents folded)
--      dob               no two known dates of birth disagree (profile dob, identity source dob, seed evidence dob)
--      nationality       no two known nationalities disagree
--      era               every bout of either fighter falls at a fighting age (16-50) for any known dob
--      commission        the survivor has commission evidence: a bout, or a commission observation naming a bout
--      external_ids      no namespace holds different ids for the two fighters
--    The survivor must be the fighter that owns the commission evidence; the merged row must not be a merge target.
-- 3. boxing_identity_seed_decisions gains EXISTING_LINK (the body entry already resolves to a fighter) and
--    POSSIBLE_EXISTING_FIGHTER (a normalized first+last or near spelling of an existing fighter: review, never create).

-- 1 -------------------------------------------------------------------------------------------------------------------
create table if not exists public.boxing_fighter_merge_decisions (
  id uuid primary key default gen_random_uuid(),
  merged_fighter_id uuid not null references public.boxing_fighters (id),
  survivor_fighter_id uuid not null references public.boxing_fighters (id),
  merged_display_name text not null,
  survivor_display_name text not null,
  reviewer text not null check (reviewer !~* '(resolver|claude|gpt|openai|anthropic|\mbot\M|automat|script|system)'),
  review_note text not null check (length(btrim(review_note)) >= 20),
  checks jsonb not null,
  evidence jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  check (merged_fighter_id <> survivor_fighter_id),
  unique (merged_fighter_id)
);
select public.boxing_install_append_only('public.boxing_fighter_merge_decisions');

-- first + last name key: suffixes and middle names dropped, accents and punctuation folded
create or replace function public.boxing_first_last_key(p_name text)
returns text language sql immutable set search_path = '' as $$
  with t as (
    select array_remove(regexp_split_to_array(btrim(regexp_replace(lower(translate(coalesce(p_name, ''),
      'áàâäãåéèêëíìîïóòôöõøúùûüñçýÿłÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕØÚÙÛÜÑÇÝŁ', 'aaaaaaeeeeiiiiooooooouuuuncyylAAAAAAEEEEIIIIOOOOOOUUUUNCYL')),
      '[^a-z\s]+', '', 'g')), '\s+'), '') a
  ), u as (
    select array(select x from unnest(a) x where x not in ('jr', 'sr', 'ii', 'iii', 'iv')) b from t
  )
  select case when cardinality(b) >= 2 then b[1] || ' ' || b[cardinality(b)] end from u
$$;

-- 2 -------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_merge_fighters(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_from public.boxing_fighters%rowtype;
  v_into public.boxing_fighters%rowtype;
  v_checks jsonb;
  v_dobs date[];
  v_nats text[];
  v_bad_era int;
  v_into_bouts int;
  v_into_obs int;
  v_ext_conflicts int;
  v_failed text[];
  v_id uuid;
begin
  select * into v_from from public.boxing_fighters where id = (p ->> 'merged_fighter_id')::uuid for update;
  select * into v_into from public.boxing_fighters where id = (p ->> 'survivor_fighter_id')::uuid for update;
  if v_from.id is null or v_into.id is null then
    raise exception 'merge_fighter_missing' using errcode = '23503';
  end if;
  if v_from.merged_into_id = v_into.id then
    return jsonb_build_object('status', 'duplicate', 'merged_fighter_id', v_from.id, 'survivor_fighter_id', v_into.id);
  end if;

  select array_agg(distinct d) into v_dobs from (
    select v_from.dob d union all select v_into.dob
    union all select source_dob from public.boxing_fighter_identities where fighter_id in (v_from.id, v_into.id)
    union all select dob from public.boxing_identity_seed_decisions where fighter_id in (v_from.id, v_into.id)) x where d is not null;
  select array_agg(distinct upper(n)) into v_nats from (select v_from.nationality n union all select v_into.nationality) x where n is not null;
  select count(*) into v_bad_era from public.boxing_bout_participants bp
    join public.boxing_bouts b on b.id = bp.bout_id join public.boxing_events e on e.id = b.event_id
    cross join unnest(coalesce(v_dobs, '{}'::date[])) dob
    where bp.fighter_id in (v_from.id, v_into.id) and (extract(year from age(e.event_date, dob)) < 16 or extract(year from age(e.event_date, dob)) > 50);
  select count(*) into v_into_bouts from public.boxing_bout_participants where fighter_id = v_into.id;
  select count(*) into v_into_obs from public.boxing_identity_resolutions r join public.boxing_source_observations o on o.id = r.observation_id
    join public.boxing_sources s on s.id = r.source_id
    where r.fighter_id = v_into.id and s.source_kind = 'commission' and (o.payload ? 'bout');
  select count(*) into v_ext_conflicts from public.boxing_fighter_identities a join public.boxing_fighter_identities b
    on a.namespace = b.namespace and a.external_id <> b.external_id
    where a.fighter_id = v_from.id and b.fighter_id = v_into.id and a.verification_state <> 'rejected' and b.verification_state <> 'rejected';

  v_checks := jsonb_build_object(
    'first_last', jsonb_build_object('pass', public.boxing_first_last_key(v_from.display_name) = public.boxing_first_last_key(v_into.display_name),
      'merged', public.boxing_first_last_key(v_from.display_name), 'survivor', public.boxing_first_last_key(v_into.display_name)),
    'dob', jsonb_build_object('pass', coalesce(cardinality(v_dobs), 0) <= 1, 'known', to_jsonb(v_dobs)),
    'nationality', jsonb_build_object('pass', coalesce(cardinality(v_nats), 0) <= 1, 'known', to_jsonb(v_nats)),
    'era', jsonb_build_object('pass', v_bad_era = 0, 'bouts_outside_age_16_50', v_bad_era),
    'commission', jsonb_build_object('pass', v_into_bouts > 0 or v_into_obs > 0, 'survivor_bouts', v_into_bouts, 'survivor_commission_observations', v_into_obs),
    'external_ids', jsonb_build_object('pass', v_ext_conflicts = 0, 'conflicts', v_ext_conflicts),
    'merged_is_not_a_target', jsonb_build_object('pass', not exists (select 1 from public.boxing_fighters where merged_into_id = v_from.id)));
  select array_agg(k) into v_failed from jsonb_each(v_checks) c(k, v) where not (v ->> 'pass')::boolean;
  if v_failed is not null then
    raise exception 'merge_check_failed: % (%)', array_to_string(v_failed, ','), v_checks::text using errcode = '23514';
  end if;

  update public.boxing_fighters set merged_into_id = v_into.id, identity_state = 'merged', updated_at = now() where id = v_from.id;
  insert into public.boxing_fighter_merge_decisions (merged_fighter_id, survivor_fighter_id, merged_display_name, survivor_display_name,
    reviewer, review_note, checks, evidence)
  values (v_from.id, v_into.id, v_from.display_name, v_into.display_name, p ->> 'reviewer', p ->> 'review_note', v_checks,
    coalesce(p -> 'evidence', '{}'::jsonb))
  returning id into v_id;
  return jsonb_build_object('status', 'merged', 'id', v_id, 'merged_fighter_id', v_from.id, 'survivor_fighter_id', v_into.id, 'checks', v_checks);
end $$;

-- 3 -------------------------------------------------------------------------------------------------------------------
alter table public.boxing_identity_seed_decisions drop constraint if exists boxing_identity_seed_decisions_decision_check;
alter table public.boxing_identity_seed_decisions add constraint boxing_identity_seed_decisions_decision_check
  check (decision in ('AUTO_SEEDED', 'REVIEW_REQUIRED', 'NO_CANDIDATE', 'EXISTING_LINK', 'POSSIBLE_EXISTING_FIGHTER'));

create or replace function public.boxing_apply_identity_seed_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- only AUTO_SEEDED carries a fighter it created; EXISTING_LINK names the fighter the entry already resolves to in evidence
  if new.decision in ('EXISTING_LINK', 'POSSIBLE_EXISTING_FIGHTER') and new.fighter_id is not null then
    raise exception 'seed_decision_% creates no fighter', new.decision using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists boxing_identity_seed_decisions_guard on public.boxing_identity_seed_decisions;
create trigger boxing_identity_seed_decisions_guard before insert on public.boxing_identity_seed_decisions
  for each row execute function public.boxing_apply_identity_seed_guard();

-- the seed RPC accepts the two new classes (they never create a fighter: only AUTO_SEEDED does)
create or replace function public.boxing_apply_identity_seed(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_existing public.boxing_identity_seed_decisions%rowtype;
  v_decision text := p ->> 'decision';
  v_reasons text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'reasons', '[]'::jsonb)) x), '{}');
  v_fighter uuid;
  v_result jsonb;
  v_id uuid;
begin
  select * into v_existing from public.boxing_identity_seed_decisions
  where rule_version = p ->> 'rule_version' and subject_key = p ->> 'subject_key';
  if found then
    return jsonb_build_object('status', 'duplicate', 'id', v_existing.id, 'decision', v_existing.decision, 'fighter_id', v_existing.fighter_id);
  end if;
  if v_decision not in ('AUTO_SEEDED', 'REVIEW_REQUIRED', 'NO_CANDIDATE', 'EXISTING_LINK', 'POSSIBLE_EXISTING_FIGHTER') then
    raise exception 'invalid_seed_decision: %', v_decision using errcode = '22023';
  end if;

  -- a QID already mapped to a fighter is never seeded again from another subject: that subject is the same person only
  -- if a human says so (an accepted fighter in one lane never validates a different entry in another)
  if v_decision = 'AUTO_SEEDED' and exists (select 1 from public.boxing_fighter_identities fi
      where fi.namespace = 'wikidata.item' and fi.external_id = p ->> 'wikidata_qid' and fi.verification_state <> 'rejected') then
    v_decision := 'REVIEW_REQUIRED';
    v_reasons := array_append(v_reasons, 'qid_already_mapped_to_a_fighter');
  end if;

  if v_decision = 'AUTO_SEEDED' then
    -- the identity carries the name and citizenship only: never a dob, a record or a title
    v_result := public.boxing_apply_identity_decision(jsonb_build_object(
      'source_key', 'wikidata',
      'resolver_version', p ->> 'rule_version',
      'observation', jsonb_build_object('entity_type', 'fighter_identity', 'external_key', p ->> 'wikidata_qid',
        'source_url', 'https://www.wikidata.org/wiki/' || (p ->> 'wikidata_qid'),
        'payload', jsonb_build_object('display_name', p ->> 'canonical_name', 'qid', p ->> 'wikidata_qid',
          'entity_revision', p #> '{evidence,entity_revision}', 'seed_subject', p ->> 'subject_key'),
        'content_hash', encode(sha256(convert_to((p ->> 'wikidata_qid') || '|' || coalesce(p #>> '{evidence,entity_revision}', ''), 'UTF8')), 'hex'),
        'parser_version', p ->> 'rule_version'),
      'identity', jsonb_build_object('namespace', 'wikidata.item', 'external_id', p ->> 'wikidata_qid',
        'external_url', 'https://www.wikidata.org/wiki/' || (p ->> 'wikidata_qid'), 'display_name', p ->> 'canonical_name',
        'nationality', coalesce(p #> '{nationality_evidence,wikidata_citizenship_iso2}', '[]'::jsonb)),
      'index', p -> 'index',
      'decision', jsonb_build_object('outcome', 'created', 'method', 'p0_identity_seed', 'confidence', 90,
        'verification_state', 'verified', 'evidence', p -> 'evidence')));
    if v_result ->> 'status' = 'applied' and v_result ->> 'outcome' = 'created' then
      v_fighter := (v_result ->> 'fighter_id')::uuid;
    else
      v_decision := 'REVIEW_REQUIRED';
      v_reasons := array_append(v_reasons, 'creation_path_' || coalesce(v_result ->> 'outcome', 'unknown') || ':' || coalesce(v_result ->> 'reason', 'none'));
    end if;
  end if;

  insert into public.boxing_identity_seed_decisions
    (rule_version, batch, subject_key, decision, wikidata_qid, fighter_id, canonical_name, aliases, nationality_evidence,
     dob, dob_precision, division_evidence, source_claims, identity_sources, creation_basis, reasons, evidence, candidates)
  values (p ->> 'rule_version', p ->> 'batch', p ->> 'subject_key', v_decision, p ->> 'wikidata_qid', v_fighter,
     p ->> 'canonical_name', coalesce(p -> 'aliases', '[]'::jsonb), coalesce(p -> 'nationality_evidence', '{}'::jsonb),
     nullif(p ->> 'dob', '')::date, p ->> 'dob_precision', coalesce(p -> 'division_evidence', '{}'::jsonb),
     p -> 'source_claims', coalesce(p -> 'identity_sources', '[]'::jsonb), p ->> 'creation_basis', v_reasons,
     p -> 'evidence', coalesce(p -> 'candidates', '[]'::jsonb))
  returning id into v_id;
  return jsonb_build_object('status', 'created', 'id', v_id, 'decision', v_decision, 'fighter_id', v_fighter,
    'creation', v_result);
end $$;

select public.boxing_lockdown();
