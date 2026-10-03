-- P0 identity graph proofs (read-only). One row per proof; pass must be true.
-- 0058: the duplicate proof uses identity equivalence (first+last, ordered containment, stored Wikidata alias),
-- not first+last equality alone, so a double-surname or alias duplicate is counted and listed.
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
fl as (
  select f.id, f.display_name, public.boxing_name_tokens(f.display_name) t,
    exists (select 1 from public.boxing_identity_seed_decisions x where x.decision = 'AUTO_SEEDED' and public.boxing_canonical_fighter_id(x.fighter_id) = f.id) seeded
  from public.boxing_fighters f where f.merged_into_id is null
),
dup_pairs as (
  select a.display_name seeded, b.display_name existing, 'name' route
  from fl a join fl b on b.t[1] = a.t[1] and b.id <> a.id and not b.seeded
  where a.seeded and cardinality(a.t) >= 2 and cardinality(b.t) >= 2
    and (a.t[cardinality(a.t)] = b.t[cardinality(b.t)]
         or public.boxing_name_contained(a.display_name, b.display_name) or public.boxing_name_contained(b.display_name, a.display_name))
  union
  select a.display_name, b.display_name, 'wikidata_alias'
  from fl a
  join public.boxing_fighter_identities fi on fi.fighter_id in (select id from public.boxing_fighters where id = a.id or merged_into_id = a.id)
    and fi.namespace = 'wikidata.item' and fi.verification_state = 'verified'
  join public.boxing_fighter_wikidata_aliases al on al.qid = fi.external_id
  join fl b on b.t = public.boxing_name_tokens(al.alias) and b.id <> a.id and not b.seeded
  where a.seeded and cardinality(b.t) >= 2
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
union all select 'no_seeded_duplicate_of_existing', count(distinct (seeded, existing)) = 0, jsonb_build_object('seeded_identity_equivalent_to_unmerged_fighter', count(distinct (seeded, existing)), 'pairs', coalesce(jsonb_agg(jsonb_build_object('seeded', seeded, 'existing', existing, 'route', route)), '[]'::jsonb)) from dup_pairs
union all select 'one_decision_per_cluster', multi_decision.n = 0, jsonb_build_object('clusters_with_several_matches', multi_decision.n) from multi_decision
union all select 'no_body_claim_moved_between_people', moved.n = 0, jsonb_build_object('links_not_matching_their_seed_entry', moved.n) from moved
union all select 'no_title_ranking_record_created', (title_rank.wikidata_record_claims = 0), to_jsonb(title_rank) from title_rank;
