-- P0 identity graph proofs after merges + batch 02 (read-only). One row per proof; pass must be true.
with seed_start as (select min(decided_at) t from public.boxing_identity_seed_decisions),
inoue as (
  select count(distinct public.boxing_canonical_fighter_id(d.fighter_id)) fighters, count(*) linked_clusters,
    (select count(*) from public.boxing_org_identity_candidates c where c.normalized_names @> '["naoya inoue"]'::jsonb) clusters_total
  from public.boxing_org_identity_candidate_decisions d join public.boxing_org_identity_candidates c on c.id = d.candidate_id
  where d.decision = 'matched' and c.normalized_names @> '["naoya inoue"]'::jsonb
),
dup_qid as (
  select count(*) n from (select fi.external_id from public.boxing_fighter_identities fi
    where fi.namespace = 'wikidata.item' and fi.verification_state <> 'rejected'
    group by 1 having count(distinct public.boxing_canonical_fighter_id(fi.fighter_id)) > 1) x
),
dup_name as (
  select count(*) n from (select public.boxing_first_last_key(f.display_name) k from public.boxing_fighters f
    where f.merged_into_id is null and exists (select 1 from public.boxing_identity_seed_decisions d where public.boxing_canonical_fighter_id(d.fighter_id) = f.id)
    ) s where exists (select 1 from public.boxing_fighters o where o.merged_into_id is null
      and public.boxing_first_last_key(o.display_name) = s.k
      and not exists (select 1 from public.boxing_identity_seed_decisions d where public.boxing_canonical_fighter_id(d.fighter_id) = o.id)
      and o.id not in (select survivor_fighter_id from public.boxing_fighter_merge_decisions))
),
multi_decision as (
  select count(*) n from (select candidate_id from public.boxing_org_identity_candidate_decisions where decision = 'matched' group by 1 having count(*) > 1) x
),
moved as (
  -- every seed-era body link goes to the canonical fighter of the seed decision that printed that very cluster
  select count(*) n from public.boxing_org_identity_candidate_decisions d
  join public.boxing_org_identity_candidates c on c.id = d.candidate_id join public.boxing_organizations o on o.id = c.organization_id
  where d.evidence ->> 'batch' in ('p0-champions-02', 'p0-champions-merges-01')
    and not exists (select 1 from public.boxing_identity_seed_decisions s cross join lateral jsonb_array_elements(s.source_claims) e
      where s.decision = 'AUTO_SEEDED' and e ->> 'body' = o.slug and e ->> 'cluster_key' = c.cluster_key
        and public.boxing_canonical_fighter_id(s.fighter_id) = public.boxing_canonical_fighter_id(d.fighter_id))
),
title_rank as (
  select (select count(*) from public.boxing_title_status_snapshots, seed_start where retrieved_at >= seed_start.t) title_snapshots_since,
         (select count(*) from public.boxing_ranking_snapshots, seed_start where captured_at >= seed_start.t) ranking_snapshots_since,
         (select count(*) from public.boxing_fighter_record_claims c join public.boxing_identity_seed_decisions s on public.boxing_canonical_fighter_id(s.fighter_id) = public.boxing_canonical_fighter_id(c.fighter_id) where c.source_id = (select id from public.boxing_sources where source_key = 'wikidata')) wikidata_record_claims
)
select 'inoue_one_fighter' proof, (inoue.fighters = 1) pass, jsonb_build_object('fighters', inoue.fighters, 'linked_clusters', inoue.linked_clusters, 'inoue_clusters_total', inoue.clusters_total) detail from inoue
union all select 'no_qid_on_two_fighters', dup_qid.n = 0, jsonb_build_object('qids_on_several_fighters', dup_qid.n) from dup_qid
union all select 'no_seeded_duplicate_of_existing', dup_name.n = 0, jsonb_build_object('seeded_with_same_first_last_as_unmerged_fighter', dup_name.n) from dup_name
union all select 'one_decision_per_cluster', multi_decision.n = 0, jsonb_build_object('clusters_with_several_matches', multi_decision.n) from multi_decision
union all select 'no_body_claim_moved_between_people', moved.n = 0, jsonb_build_object('links_not_matching_their_seed_entry', moved.n) from moved
union all select 'no_title_ranking_record_created', (title_rank.wikidata_record_claims = 0), to_jsonb(title_rank) from title_rank;
