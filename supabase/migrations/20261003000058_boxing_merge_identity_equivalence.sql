-- Merge guard identity equivalence (owner approved 2026-10-03, proposal reviews/identity/p0-merge-guard-proposal-0058.md).
--
-- 0057's first_last check reduced a name to first token + LAST token. Commission sheets print both Spanish surnames
-- (Jaime Aaron Munguia Escobedo, William Zepeda Segura), so the check refused true pairs. Surname parsing is NOT
-- redefined globally (no "second-to-last token" rule). Instead the name check passes on any of three routes:
--   1. first_last     the first+last keys are equal (0057's rule, unchanged)
--   2. containment    every token of the shorter name appears, whole and in order, inside the longer full name, the
--                     given (first) names are equal, and the longer name has more tokens. Whole tokens only: a
--                     substring ("Ana" in "Anastasia") or a reordering never passes.
--   3. wikidata_alias the survivor's full name equals (case/accent folded) a stored alias of the merged fighter's
--                     verified wikidata.item, recorded from the item itself (boxing_fighter_wikidata_aliases)
-- dob, nationality, era, commission evidence, external ids, merge-chain safety and the named human reviewer are all
-- unchanged and still mandatory.
--
-- boxing_identity_name_equivalent(a, b) is routes 1+2; the graph duplicate proof uses it plus route 3, so the proof can
-- no longer report "0 duplicates" while a double-surname or alias duplicate remains.

-- folded whole-name tokens, generational suffixes dropped
create or replace function public.boxing_name_tokens(p_name text)
returns text[] language sql immutable set search_path = '' as $$
  select array(select x from unnest(regexp_split_to_array(btrim(regexp_replace(translate(lower(coalesce(p_name, '')),
      'áàâäãåéèêëíìîïóòôöõøúùûüñçýÿłōūāēī', 'aaaaaaeeeeiiiioooooouuuuncyylouaei'),
      '[^a-z\s]+', '', 'g')), '\s+')) x where x <> '' and x not in ('jr', 'sr', 'ii', 'iii', 'iv'))
$$;

-- every token of p_short appears, whole and in order, in p_long; same given name; p_long strictly longer
create or replace function public.boxing_name_contained(p_short text, p_long text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  s text[] := public.boxing_name_tokens(p_short);
  l text[] := public.boxing_name_tokens(p_long);
  i int := 1;
  t text;
begin
  if cardinality(s) < 2 or cardinality(l) <= cardinality(s) or s[1] <> l[1] then
    return false;
  end if;
  foreach t in array s loop
    while i <= cardinality(l) and l[i] <> t loop i := i + 1; end loop;
    if i > cardinality(l) then return false; end if;
    i := i + 1;
  end loop;
  return true;
end $$;

create or replace function public.boxing_identity_name_equivalent(p_a text, p_b text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(public.boxing_first_last_key(p_a) = public.boxing_first_last_key(p_b), false)
      or public.boxing_name_contained(p_a, p_b) or public.boxing_name_contained(p_b, p_a)
$$;

-- aliases of a verified Wikidata item, recorded from the item (append-only; one row per qid + alias + language)
create table if not exists public.boxing_fighter_wikidata_aliases (
  id uuid primary key default gen_random_uuid(),
  qid text not null check (qid ~ '^Q[0-9]+$'),
  alias text not null check (length(btrim(alias)) >= 2),
  language text not null,
  kind text not null check (kind in ('label', 'alias')),
  entity_revision bigint,
  recorded_at timestamptz not null default now(),
  unique (qid, alias, language)
);
select public.boxing_install_append_only('public.boxing_fighter_wikidata_aliases');

create or replace function public.boxing_wikidata_alias_match(p_merged uuid, p_survivor_name text)
returns text language sql stable set search_path = '' as $$
  select a.qid || ':' || a.alias from public.boxing_fighter_identities fi
  join public.boxing_fighter_wikidata_aliases a on a.qid = fi.external_id
  where fi.fighter_id = p_merged and fi.namespace = 'wikidata.item' and fi.verification_state = 'verified'
    and cardinality(public.boxing_name_tokens(a.alias)) >= 2
    and public.boxing_name_tokens(a.alias) = public.boxing_name_tokens(p_survivor_name)
  order by a.kind desc, a.alias limit 1
$$;

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
  v_route text;
  v_alias text;
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

  -- the name check: one of three evidence routes, recorded with the merge
  if public.boxing_first_last_key(v_from.display_name) = public.boxing_first_last_key(v_into.display_name) then
    v_route := 'first_last';
  elsif public.boxing_name_contained(v_from.display_name, v_into.display_name) or public.boxing_name_contained(v_into.display_name, v_from.display_name) then
    v_route := 'containment';
  else
    v_alias := public.boxing_wikidata_alias_match(v_from.id, v_into.display_name);
    if v_alias is not null then v_route := 'wikidata_alias'; end if;
  end if;

  v_checks := jsonb_build_object(
    'first_last', jsonb_build_object('pass', v_route is not null, 'route', v_route, 'alias', v_alias,
      'merged', public.boxing_first_last_key(v_from.display_name), 'survivor', public.boxing_first_last_key(v_into.display_name),
      'merged_tokens', to_jsonb(public.boxing_name_tokens(v_from.display_name)), 'survivor_tokens', to_jsonb(public.boxing_name_tokens(v_into.display_name))),
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

select public.boxing_lockdown();
