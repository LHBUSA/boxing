-- Identity review candidates: incremental refresh (0037's full rebuild exceeded PostgREST's statement timeout on
-- staging, ~15k candidates). A collector run refreshes only candidates touched by new review rows (and candidates that
-- share a normalized name with them, whose ambiguity can change); the full rebuild stays available as p_full => true for
-- an operator session without the API timeout (boxing_refresh_org_identity_candidates() = full). Same states and rules as 0037.

begin;

create or replace function public.boxing_refresh_org_identity_candidates_v2(p_full boolean default false)
returns jsonb language plpgsql set search_path = '' as $$
declare v_members int; v_candidates int; v_touched int;
begin
  create temporary table if not exists pg_temp.boxing_touched_candidates (id uuid primary key) on commit drop;
  truncate pg_temp.boxing_touched_candidates;

  -- new review rows -> candidates + members
  insert into public.boxing_org_identity_candidates (organization_id, cluster_key, evidence_basis, state)
  select distinct r.organization_id, public.boxing_org_identity_cluster_key(r.org_boxer_id, r.normalized_name),
    case when nullif(btrim(r.org_boxer_id), '') is not null then 'org_boxer_id' else 'normalized_name' end, 'review_candidate'
  from public.boxing_org_identity_reviews r
  where not exists (select 1 from public.boxing_org_identity_candidate_members m where m.review_id = r.id)
  on conflict (organization_id, cluster_key) do nothing;

  with new_members as (
    insert into public.boxing_org_identity_candidate_members (review_id, candidate_id)
    select r.id, c.id from public.boxing_org_identity_reviews r
    join public.boxing_org_identity_candidates c on c.organization_id = r.organization_id and c.cluster_key = public.boxing_org_identity_cluster_key(r.org_boxer_id, r.normalized_name)
    where not exists (select 1 from public.boxing_org_identity_candidate_members m where m.review_id = r.id)
    on conflict (review_id) do nothing
    returning review_id, candidate_id)
  insert into pg_temp.boxing_touched_candidates (id)
  select distinct candidate_id from new_members on conflict do nothing;

  if p_full then
    insert into pg_temp.boxing_touched_candidates (id) select id from public.boxing_org_identity_candidates on conflict do nothing;
  else
    -- candidates sharing a normalized name with a touched candidate (their name/id ambiguity can change)
    insert into pg_temp.boxing_touched_candidates (id)
    select distinct m2.candidate_id
    from pg_temp.boxing_touched_candidates t
    join public.boxing_org_identity_candidate_members m on m.candidate_id = t.id
    join public.boxing_org_identity_reviews r on r.id = m.review_id
    join public.boxing_org_identity_reviews r2 on r2.organization_id = r.organization_id and r2.normalized_name = r.normalized_name
    join public.boxing_org_identity_candidate_members m2 on m2.review_id = r2.id
    on conflict do nothing;
  end if;
  select count(*) into v_touched from pg_temp.boxing_touched_candidates;

  with cand_rows as (
    select m.candidate_id, r.* from pg_temp.boxing_touched_candidates t
    join public.boxing_org_identity_candidate_members m on m.candidate_id = t.id
    join public.boxing_org_identity_reviews r on r.id = m.review_id),
  ev as (
    select candidate_id,
      jsonb_agg(distinct normalized_name) normalized_names, jsonb_agg(distinct source_name) source_names,
      coalesce(jsonb_agg(distinct country) filter (where country is not null), '[]'::jsonb) countries,
      count(*) review_rows,
      count(distinct regexp_replace(normalized_name, '^.* ', '')) surnames,
      count(distinct country) filter (where country is not null) n_countries
    from cand_rows group by candidate_id),
  name_ids as (
    select r.organization_id, r.normalized_name, count(distinct r.org_boxer_id) ids
    from public.boxing_org_identity_reviews r
    where r.org_boxer_id is not null and (r.organization_id, r.normalized_name) in (select organization_id, normalized_name from cand_rows)
    group by 1, 2),
  name_flags as (
    select cr.candidate_id, bool_or(n.ids > 1) name_under_several_ids, bool_or(n.ids >= 1) name_has_id
    from (select distinct candidate_id, organization_id, normalized_name from cand_rows) cr
    join name_ids n on n.organization_id = cr.organization_id and n.normalized_name = cr.normalized_name
    group by cr.candidate_id),
  flags as (
    select c.id, c.evidence_basis, ev.normalized_names, ev.source_names, ev.countries, ev.review_rows,
      to_jsonb(array_remove(array[
        case when c.evidence_basis = 'org_boxer_id' and ev.surnames > 1 then 'org_boxer_id_printed_with_different_surnames' end,
        case when c.evidence_basis = 'org_boxer_id' and coalesce(nf.name_under_several_ids, false) then 'same_name_under_another_org_boxer_id' end,
        case when c.evidence_basis = 'normalized_name' and ev.n_countries > 1 then 'countries_differ' end,
        case when c.evidence_basis = 'normalized_name' and coalesce(nf.name_has_id, false) then 'same_name_also_printed_with_org_boxer_id' end
      ], null)) ambiguity
    from public.boxing_org_identity_candidates c
    join ev on ev.candidate_id = c.id
    left join name_flags nf on nf.candidate_id = c.id)
  update public.boxing_org_identity_candidates c set
    normalized_names = f.normalized_names, source_names = f.source_names, countries = f.countries, review_rows = f.review_rows,
    ambiguity = f.ambiguity,
    state = case when jsonb_array_length(f.ambiguity) > 0 then 'ambiguous' when f.evidence_basis = 'org_boxer_id' then 'source_identity_proven' else 'review_candidate' end,
    refreshed_at = now()
  from flags f
  where f.id = c.id
    and (c.normalized_names, c.source_names, c.countries, c.review_rows, c.ambiguity) is distinct from (f.normalized_names, f.source_names, f.countries, f.review_rows, f.ambiguity);

  select count(*) into v_members from public.boxing_org_identity_candidate_members;
  select count(*) into v_candidates from public.boxing_org_identity_candidates;
  return jsonb_build_object('candidates', v_candidates, 'members', v_members, 'touched', v_touched, 'full', p_full);
end $$;

-- 0037's name stays (no overload, so a rerun of the chain resolves the call unambiguously); it is now the full rebuild
create or replace function public.boxing_refresh_org_identity_candidates()
returns jsonb language sql set search_path = '' as $$ select public.boxing_refresh_org_identity_candidates_v2(true) $$;

select public.boxing_lockdown();

commit;
