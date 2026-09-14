-- Official canonicalization: parser-artifact officials resolved through the canonical
-- official graph, never by deleting history.
--
-- nsac-nevada@1.0.0 read the header "Judges: ..., & Cory Santos" as the name "& Cory Santos".
-- A corrected parse of the SAME document names "Cory Santos" in the same bout, role and slot.
-- Category A (deterministic parser artifact) is the only class this migration can apply, and the
-- database re-verifies every piece of evidence itself:
--   * the corrected name is exactly the artifact with its leading non-letter characters removed
--   * the artifact official holds that role/slot on that bout (active assignment)
--   * any scorecard of that judge on that bout carries the same slot
--   * an older stored parse of that document named the artifact at that bout/role/slot, and a
--     parse by a DIFFERENT (newer) parser version names the corrected official there, with no
--     later parse of the document contradicting it
-- rename_parser_artifact: one official; its display name becomes the corrected name and the old
--   display name is kept as an alias (append-only).
-- merge_parser_artifact: two officials (the artifact and the corrected-name official); the artifact
--   becomes merged_into the corrected official. No assignment or scorecard row is re-pointed or
--   deleted: every read resolves through boxing_canonical_official_id().
-- Probable (B), ambiguous (C: e.g. surname only) and distinct (D) pairs are never applied here;
-- they go to human review.

create table if not exists public.boxing_official_canonicalizations (
  seq bigint generated always as identity primary key,
  action text not null check (action in ('rename_parser_artifact', 'merge_parser_artifact')),
  category text not null check (category = 'A'),
  official_id uuid not null references public.boxing_officials(id) on delete restrict,
  from_official_id uuid references public.boxing_officials(id) on delete restrict,
  before_display_name text not null,
  after_display_name text not null,
  evidence jsonb not null,
  tool_version text not null,
  actor text not null,
  applied_at timestamptz not null default now(),
  check ((action = 'merge_parser_artifact') = (from_official_id is not null)),
  check (from_official_id is null or from_official_id <> official_id)
);
select public.boxing_install_append_only('public.boxing_official_canonicalizations');

create table if not exists public.boxing_official_aliases (
  id uuid primary key default gen_random_uuid(),
  official_id uuid not null references public.boxing_officials(id) on delete restrict,
  alias_name text not null,
  normalized_alias text,
  reason text not null check (reason in ('parser_artifact_display_name', 'merged_official_display_name')),
  canonicalization_seq bigint references public.boxing_official_canonicalizations(seq) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique (official_id, alias_name)
);
select public.boxing_install_append_only('public.boxing_official_aliases');

-- The official name a stored commission parse gives for one bout (any of its source bout ids),
-- role and judge slot. Null when that parse does not name one.
create or replace function public.boxing_parsed_official_name(p_payload jsonb, p_source_bout_ids text[], p_role text, p_slot int)
returns text language sql immutable set search_path = '' as $$
  select case when p_role = 'referee' then
      (select b ->> 'referee' from jsonb_array_elements(coalesce(p_payload -> 'bouts', '[]'::jsonb)) b
       where b ->> 'source_bout_id' = any (p_source_bout_ids) limit 1)
    else
      (select j ->> 'name' from jsonb_array_elements(coalesce(p_payload -> 'bouts', '[]'::jsonb)) b,
              jsonb_array_elements(coalesce(b -> 'judges', '[]'::jsonb)) j
       where b ->> 'source_bout_id' = any (p_source_bout_ids) and (j ->> 'slot')::int = p_slot limit 1)
    end
$$;

-- Read-only evidence for the cleanup planner (scripts/officials/cleanup-plan.mjs). The same SELECT
-- lives in scripts/officials/cleanup-evidence.sql so it can run before this migration is applied.
create or replace function public.boxing_official_cleanup_evidence()
returns jsonb language sql stable set search_path = '' as $$
with assignments as (
  select bo.official_id, bo.bout_id, bo.role, bo.slot, bo.assignment_state, e.event_date, e.name as event_name, c.slug as commission,
         (select coalesce(jsonb_agg(bi.external_id order by bi.external_id), '[]'::jsonb) from public.boxing_bout_identities bi
          where bi.bout_id = bo.bout_id and bi.namespace like '%.bout' and bi.verification_state <> 'rejected') as source_bout_ids,
         (select count(*) from public.boxing_scorecards s where s.bout_id = bo.bout_id and s.judge_id = bo.official_id) as scorecards,
         (select count(*) from public.boxing_scorecards_current s where s.bout_id = bo.bout_id and s.judge_id = bo.official_id) as scorecards_current,
         (select min(s.slot) from public.boxing_scorecards s where s.bout_id = bo.bout_id and s.judge_id = bo.official_id) as scorecard_slot
  from public.boxing_bout_officials bo
  join public.boxing_bouts b on b.id = bo.bout_id
  join public.boxing_events e on e.id = b.event_id
  left join public.boxing_commissions c on c.id = e.commission_id),
parses as (
  select distinct on (o.external_key, o.parser_version) o.id, o.external_key, o.parser_version, o.observed_at, s.source_key, o.payload
  from public.boxing_source_observations o join public.boxing_sources s on s.id = o.source_id
  where o.entity_type = 'commission_results_document'
  order by o.external_key, o.parser_version, o.observed_at desc, o.id)
select jsonb_build_object(
  'generated_at', now(),
  'totals', jsonb_build_object(
    'officials', (select count(*) from public.boxing_officials),
    'officials_merged', (select count(*) from public.boxing_officials where merged_into_id is not null),
    'official_identities', (select count(*) from public.boxing_official_identities),
    'official_name_keys', (select count(*) from public.boxing_official_name_keys),
    'bout_officials', (select count(*) from public.boxing_bout_officials),
    'bout_officials_active', (select count(*) from public.boxing_bout_officials where assignment_state in ('assigned', 'worked')),
    'scorecards', (select count(*) from public.boxing_scorecards),
    'scorecards_current', (select count(*) from public.boxing_scorecards_current),
    'review_pending', (select count(*) from public.boxing_official_review_queue where status = 'pending'),
    'duplicate_active_judge_slots', (select count(*) from (select 1 from public.boxing_bout_officials
        where assignment_state in ('assigned', 'worked') and role = 'judge' and slot is not null group by bout_id, slot having count(*) > 1) d),
    'bouts_with_two_active_referees', (select count(*) from (select 1 from public.boxing_bout_officials
        where assignment_state in ('assigned', 'worked') and role = 'referee' group by bout_id having count(*) > 1) d),
    'scorecards_without_active_assignment', (select count(*) from public.boxing_scorecards_current s where not exists (
        select 1 from public.boxing_bout_officials bo where bo.bout_id = s.bout_id and bo.official_id = s.judge_id and bo.assignment_state in ('assigned', 'worked')))),
  'officials', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'public_id', o.public_id, 'display_name', o.display_name, 'normalized_name', o.normalized_name,
      'official_type', o.official_type, 'identity_state', o.identity_state, 'merged_into_id', o.merged_into_id,
      'assignments', (select coalesce(jsonb_agg(jsonb_build_object('bout_id', a.bout_id, 'role', a.role, 'slot', a.slot, 'state', a.assignment_state,
                        'event_date', a.event_date, 'event_name', a.event_name, 'commission', a.commission, 'source_bout_ids', a.source_bout_ids,
                        'scorecards', a.scorecards, 'scorecards_current', a.scorecards_current, 'scorecard_slot', a.scorecard_slot)
                      order by a.event_date, a.bout_id, a.role), '[]'::jsonb) from assignments a where a.official_id = o.id))
    order by o.display_name, o.id), '[]'::jsonb) from public.boxing_officials o),
  'review_items', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'raw_name', r.raw_name, 'namespace', r.namespace, 'reason', r.reason,
      'commission', (select c.slug from public.boxing_commissions c where c.id = r.commission_id), 'candidates', r.candidates, 'created_at', r.created_at)
    order by r.created_at, r.id), '[]'::jsonb) from public.boxing_official_review_queue r where r.status = 'pending'),
  'parses', (select coalesce(jsonb_agg(jsonb_build_object('observation_id', p.id, 'doc_key', p.external_key, 'source_key', p.source_key,
      'parser_version', p.parser_version, 'observed_at', p.observed_at, 'source_url', p.payload ->> 'url',
      'header_officials', p.payload -> 'document' -> 'officials',
      'promoters', (select coalesce(jsonb_agg(ev -> 'promoters'), '[]'::jsonb) from jsonb_array_elements(coalesce(p.payload -> 'events', '[]'::jsonb)) ev),
      'bouts', (select coalesce(jsonb_agg(jsonb_build_object('source_bout_id', b ->> 'source_bout_id', 'referee', b ->> 'referee',
                  'judges', (select coalesce(jsonb_agg(jsonb_build_object('slot', (j ->> 'slot')::int, 'name', j ->> 'name', 'source_name', j ->> 'source_name')), '[]'::jsonb)
                             from jsonb_array_elements(coalesce(b -> 'judges', '[]'::jsonb)) j))), '[]'::jsonb)
                from jsonb_array_elements(coalesce(p.payload -> 'bouts', '[]'::jsonb)) b))
    order by p.external_key, p.observed_at), '[]'::jsonb) from parses p)
)
$$;

create or replace function public.boxing_apply_official_canonicalization(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_action text := p ->> 'action';
  v_after text := btrim(coalesce(p ->> 'after_display_name', ''));
  v_survivor public.boxing_officials%rowtype;
  v_from public.boxing_officials%rowtype;
  v_artifact public.boxing_officials%rowtype;
  v_item jsonb;
  v_ids text[];
  v_bout uuid;
  v_role text;
  v_slot int;
  v_new_at timestamptz;
  v_ok int := 0;
  v_seq bigint;
  k text;
begin
  if btrim(coalesce(p ->> 'actor', '')) = '' or btrim(coalesce(p ->> 'tool_version', '')) = '' then
    raise exception 'canonicalization_actor_and_tool_version_required' using errcode = 'BX060';
  end if;
  if v_action is null or v_action not in ('rename_parser_artifact', 'merge_parser_artifact') then
    raise exception 'canonicalization_action_not_allowed: %', v_action using errcode = 'BX060';
  end if;
  if coalesce(p ->> 'category', '') <> 'A' then
    raise exception 'only_category_A_parser_artifacts_are_applied' using errcode = 'BX060';
  end if;

  select * into v_survivor from public.boxing_officials where id = (p ->> 'official_id')::uuid for update;
  if not found then raise exception 'official_not_found' using errcode = 'BX061'; end if;

  if v_action = 'merge_parser_artifact' then
    select * into v_from from public.boxing_officials where id = (p ->> 'from_official_id')::uuid for update;
    if not found then raise exception 'from_official_not_found' using errcode = 'BX061'; end if;
    if v_from.merged_into_id = v_survivor.id then
      return jsonb_build_object('status', 'already_applied', 'action', v_action, 'official_id', v_survivor.id, 'from_official_id', v_from.id);
    end if;
    if v_from.id = v_survivor.id then raise exception 'merge_needs_two_officials' using errcode = 'BX062'; end if;
    if v_from.identity_state = 'merged' then raise exception 'from_official_already_merged' using errcode = 'BX062'; end if;
    if v_from.official_type <> v_survivor.official_type then raise exception 'official_type_mismatch' using errcode = 'BX062'; end if;
    if v_survivor.display_name <> v_after then raise exception 'survivor_must_carry_the_corrected_name' using errcode = 'BX062'; end if;
    if exists (select 1 from public.boxing_bout_officials a join public.boxing_bout_officials b on b.bout_id = a.bout_id and b.role = a.role
               where a.official_id = v_from.id and b.official_id = v_survivor.id
                 and a.assignment_state in ('assigned', 'worked') and b.assignment_state in ('assigned', 'worked')) then
      raise exception 'both_officials_active_on_the_same_bout' using errcode = 'BX062';
    end if;
    v_artifact := v_from;
  else
    if v_survivor.display_name = v_after and exists (select 1 from public.boxing_official_canonicalizations c
        where c.official_id = v_survivor.id and c.action = v_action and c.after_display_name = v_after) then
      return jsonb_build_object('status', 'already_applied', 'action', v_action, 'official_id', v_survivor.id);
    end if;
    if exists (select 1 from public.boxing_officials t where t.id <> v_survivor.id and t.identity_state <> 'merged'
               and t.official_type = v_survivor.official_type and t.normalized_name = v_survivor.normalized_name) then
      raise exception 'another_official_carries_this_name_use_merge' using errcode = 'BX062';
    end if;
    v_artifact := v_survivor;
  end if;
  if v_survivor.identity_state = 'merged' then raise exception 'official_is_merged' using errcode = 'BX062'; end if;

  -- exactly the known parser artifact: leading non-letter characters ("& ") removed, nothing else
  if v_after = '' or v_after = v_artifact.display_name or v_after <> btrim(regexp_replace(v_artifact.display_name, '^[^[:alpha:]]+', '')) then
    raise exception 'not_a_parser_artifact_correction: % -> %', v_artifact.display_name, v_after using errcode = 'BX062';
  end if;

  if jsonb_typeof(p -> 'evidence' -> 'continuity') is distinct from 'array' or jsonb_array_length(p -> 'evidence' -> 'continuity') = 0 then
    raise exception 'continuity_evidence_required' using errcode = 'BX063';
  end if;
  for v_item in select * from jsonb_array_elements(p -> 'evidence' -> 'continuity') loop
    v_bout := (v_item ->> 'bout_id')::uuid;
    v_role := v_item ->> 'role';
    v_slot := nullif(v_item ->> 'slot', '')::int;
    if v_role is null or v_role not in ('judge', 'referee') or (v_role = 'judge' and v_slot is null) then
      raise exception 'continuity_role_or_slot_invalid' using errcode = 'BX063';
    end if;
    if coalesce(v_item ->> 'old_parser_version', '') = '' or coalesce(v_item ->> 'new_parser_version', '') = ''
       or v_item ->> 'old_parser_version' = v_item ->> 'new_parser_version' then
      raise exception 'continuity_needs_two_parser_versions' using errcode = 'BX063';
    end if;
    if not exists (select 1 from public.boxing_bout_officials bo where bo.bout_id = v_bout and bo.official_id = v_artifact.id and bo.role = v_role
                   and bo.assignment_state in ('assigned', 'worked') and (v_role = 'referee' or bo.slot = v_slot)) then
      raise exception 'continuity_assignment_missing: bout % % slot %', v_bout, v_role, v_slot using errcode = 'BX063';
    end if;
    if v_role = 'judge' and exists (select 1 from public.boxing_scorecards s where s.bout_id = v_bout and s.judge_id = v_artifact.id and s.slot is not null and s.slot <> v_slot) then
      raise exception 'continuity_scorecard_slot_mismatch: bout %', v_bout using errcode = 'BX063';
    end if;
    v_ids := array(select bi.external_id from public.boxing_bout_identities bi
                   where bi.bout_id = v_bout and bi.namespace like '%.bout' and bi.verification_state <> 'rejected');
    if not exists (select 1 from public.boxing_source_observations o
                   where o.entity_type = 'commission_results_document' and o.external_key = v_item ->> 'doc_key' and o.parser_version = v_item ->> 'old_parser_version'
                     and public.boxing_parsed_official_name(o.payload, v_ids, v_role, v_slot) = v_artifact.display_name) then
      raise exception 'continuity_old_parse_does_not_name_the_artifact: %', v_item ->> 'doc_key' using errcode = 'BX063';
    end if;
    select max(o.observed_at) into v_new_at from public.boxing_source_observations o
    where o.entity_type = 'commission_results_document' and o.external_key = v_item ->> 'doc_key' and o.parser_version = v_item ->> 'new_parser_version'
      and public.boxing_parsed_official_name(o.payload, v_ids, v_role, v_slot) = v_after;
    if v_new_at is null then
      raise exception 'continuity_corrected_parse_does_not_name_the_official: %', v_item ->> 'doc_key' using errcode = 'BX063';
    end if;
    if exists (select 1 from public.boxing_source_observations o
               where o.entity_type = 'commission_results_document' and o.external_key = v_item ->> 'doc_key' and o.observed_at > v_new_at
                 and public.boxing_parsed_official_name(o.payload, v_ids, v_role, v_slot) is distinct from v_after) then
      raise exception 'continuity_contradicted_by_a_later_parse: %', v_item ->> 'doc_key' using errcode = 'BX063';
    end if;
    v_ok := v_ok + 1;
  end loop;

  insert into public.boxing_official_canonicalizations (action, category, official_id, from_official_id, before_display_name, after_display_name, evidence, tool_version, actor)
  values (v_action, 'A', v_survivor.id, case when v_action = 'merge_parser_artifact' then v_from.id end, v_artifact.display_name, v_after,
          (p -> 'evidence') || jsonb_build_object('continuity_verified', v_ok), p ->> 'tool_version', p ->> 'actor')
  returning seq into v_seq;
  insert into public.boxing_official_aliases (official_id, alias_name, normalized_alias, reason, canonicalization_seq)
  values (v_survivor.id, v_artifact.display_name, v_artifact.normalized_name,
          case when v_action = 'merge_parser_artifact' then 'merged_official_display_name' else 'parser_artifact_display_name' end, v_seq)
  on conflict (official_id, alias_name) do nothing;
  if v_action = 'rename_parser_artifact' then
    update public.boxing_officials set display_name = v_after, updated_at = now() where id = v_survivor.id;
  else
    update public.boxing_officials set identity_state = 'merged', merged_into_id = v_survivor.id, updated_at = now() where id = v_from.id;
    insert into public.boxing_official_name_keys (official_id, key)
    select v_survivor.id, nk.key from public.boxing_official_name_keys nk where nk.official_id = v_from.id
    on conflict (official_id, key) do nothing;
  end if;
  for k in select jsonb_array_elements_text(coalesce(p -> 'keys', '[]'::jsonb)) loop
    insert into public.boxing_official_name_keys (official_id, key) values (v_survivor.id, k) on conflict (official_id, key) do nothing;
  end loop;
  return jsonb_build_object('status', 'applied', 'seq', v_seq, 'action', v_action, 'official_id', v_survivor.id,
    'from_official_id', case when v_action = 'merge_parser_artifact' then v_from.id end,
    'before_display_name', v_artifact.display_name, 'after_display_name', v_after, 'continuity_verified', v_ok);
end $$;

select public.boxing_lockdown();
