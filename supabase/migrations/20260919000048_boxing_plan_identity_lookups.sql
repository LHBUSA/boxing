-- Two read-only lookups so a DRY RUN can see the same established identity evidence the apply path sees.
--
-- The apply path recognises a person it has already resolved in two ways. First, a source-native mapping:
-- boxing_fighter_identities ties (namespace, external_id) to a canonical fighter, so the source's own id is
-- authoritative. Second, a prior resolution: boxing_apply_identity_decision hashes the identity payload, and when an
-- identical payload arrives again it short-circuits on the duplicate observation and returns the resolution it made
-- last time, fighter id and all.
--
-- planCanonicalization had neither. It re-resolved on display_name alone, so the 33 boxers written as minimum canonical
-- identity — a name and nothing else, because the promoters' content lane is closed — could not be confirmed by name
-- alone and came back as 'review'. The plan then reported every already-written bout as held. Pessimistic, never
-- optimistic, so it could not cause a bad write; but it made the receipt useless for answering "is there anything to
-- do?", which is exactly what it is for.
--
-- Neither function decides anything. They report what is already established, and the resolver still does the work
-- whenever nothing is established — so collision handling is untouched and an unresolved corner stays unresolved.

begin;

-- (namespace, external_id) -> canonical fighter id. The source's own identifier, as the source asserts it.
-- A rejected mapping is not a mapping, and a merged fighter resolves to whoever they were merged into.
create or replace function public.boxing_fighter_identity_map(p_namespace text, p_external_ids text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(x.external_id, x.fighter_id), '{}'::jsonb)
  from (
    select distinct on (fi.external_id) fi.external_id,
           public.boxing_canonical_fighter_id(fi.fighter_id) as fighter_id
    from public.boxing_fighter_identities fi
    where fi.namespace = p_namespace
      and fi.external_id = any (p_external_ids)
      and fi.verification_state <> 'rejected'
      and public.boxing_canonical_fighter_id(fi.fighter_id) is not null
    order by fi.external_id, fi.verification_state = 'verified' desc, fi.confidence desc nulls last, fi.id
  ) x
$$;

comment on function public.boxing_fighter_identity_map(text, text[]) is
  'Source-native identity mappings for a namespace: the external ids a dry run is about to plan, resolved to canonical fighters. Read-only; decides nothing.';

-- The resolution this exact identity payload received last time, keyed the way boxing_apply_identity_decision keys its
-- duplicate-observation short circuit: source, entity type, external key and content hash. Only automatic decisions are
-- returned, and only the most recent per observation.
create or replace function public.boxing_prior_identity_resolutions(p jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(x.k, x.v), '{}'::jsonb)
  from (
    select distinct on (o.content_hash, o.external_key)
           coalesce(o.external_key, '') || '|' || o.content_hash as k,
           jsonb_build_object(
             'outcome', r.outcome,
             'fighter_id', r.fighter_id,
             'reason', r.reason,
             'method', r.method,
             'observation_id', o.id,
             'observed_at', o.observed_at,
             'source_url', o.source_url) as v
    from public.boxing_source_observations o
    join public.boxing_sources s on s.id = o.source_id
    join public.boxing_identity_resolutions r on r.observation_id = o.id and r.decision_kind = 'automatic'
    where s.source_key = p ->> 'source_key'
      and o.entity_type = 'fighter_identity'
      and o.content_hash in (select jsonb_array_elements_text(coalesce(p -> 'content_hashes', '[]'::jsonb)))
    order by o.content_hash, o.external_key, r.created_at desc, r.id desc
  ) x
$$;

comment on function public.boxing_prior_identity_resolutions(jsonb) is
  'What this exact identity payload resolved to last time, keyed as boxing_apply_identity_decision keys its duplicate-observation short circuit. Lets a dry run forecast a repeat run honestly. Read-only; decides nothing.';

commit;
