-- Boxing identity graph totals (read-only): every current champion and top-15 body entry, its link, and the seed queues.
with latest_status as (
  select distinct on (s.organization_id, s.weight_class_id, s.document_kind) s.id, s.organization_id
  from public.boxing_title_status_snapshots s
  order by s.organization_id, s.weight_class_id, s.document_kind, coalesce(s.as_of, s.published_on) desc nulls last, s.retrieved_at desc
), latest_rank as (
  select distinct on (r.organization_id, r.weight_class_id) r.id, r.organization_id
  from public.boxing_ranking_snapshots r order by r.organization_id, r.weight_class_id, r.effective_on desc nulls last, r.captured_at desc
), raw as (
  select 'title' kind, ls.organization_id, t.holder_source_name printed, t.holder_org_boxer_id org_boxer_id
  from latest_status ls join public.boxing_title_status_entries t on t.snapshot_id = ls.id
  where t.holder_status in ('held', 'in_recess') and t.holder_source_name is not null and t.tier in ('world', 'super', 'regular', 'interim', 'franchise')
  union all
  select 'ranking', lr.organization_id, e.source_name, e.metadata ->> 'org_boxer_id'
  from latest_rank lr join public.boxing_ranking_entries e on e.snapshot_id = lr.id
  where e.position between 1 and 15 and e.source_name is not null and not coalesce(e.is_vacant, false)
), entries as (
  select r.*, c.id candidate_id, c.state cluster_state,
    (select public.boxing_canonical_fighter_id(d.fighter_id) from public.boxing_org_identity_candidate_decisions d
      where d.candidate_id = c.id and d.decision = 'matched' order by d.decided_at desc limit 1) fighter_id
  from raw r left join lateral (select c.* from public.boxing_org_identity_candidates c where c.organization_id = r.organization_id
    and (c.cluster_key = 'id:' || r.org_boxer_id or c.source_names ? r.printed)
    order by (c.cluster_key = 'id:' || r.org_boxer_id) desc nulls last limit 1) c on true
), linked as (select distinct fighter_id from entries where fighter_id is not null),
latest_seed as (select distinct on (subject_key) subject_key, decision from public.boxing_identity_seed_decisions order by subject_key, decided_at desc),
fl as (
  select f.id, f.display_name, public.boxing_name_tokens(f.display_name) t,
    exists (select 1 from public.boxing_identity_seed_decisions x where x.decision = 'AUTO_SEEDED' and public.boxing_canonical_fighter_id(x.fighter_id) = f.id) seeded
  from public.boxing_fighters f where f.merged_into_id is null
),
dup_pairs as (
  select a.id seeded_id, b.id existing_id, a.display_name seeded, b.display_name existing, 'name' route
  from fl a join fl b on b.t[1] = a.t[1] and b.id <> a.id and not b.seeded
  where a.seeded and cardinality(a.t) >= 2 and cardinality(b.t) >= 2
    and (a.t[cardinality(a.t)] = b.t[cardinality(b.t)]
         or public.boxing_name_contained(a.display_name, b.display_name) or public.boxing_name_contained(b.display_name, a.display_name))
  union
  select a.id, b.id, a.display_name, b.display_name, 'wikidata_alias'
  from fl a
  join public.boxing_fighter_identities fi on fi.fighter_id in (select id from public.boxing_fighters where id = a.id or merged_into_id = a.id)
    and fi.namespace = 'wikidata.item' and fi.verification_state = 'verified'
  join public.boxing_fighter_wikidata_aliases al on al.qid = fi.external_id
  join fl b on b.t = public.boxing_name_tokens(al.alias) and b.id <> a.id and not b.seeded
  where a.seeded and cardinality(b.t) >= 2
),
dup_classified as (
  select seeded_id, existing_id, seeded, existing, jsonb_agg(distinct route) routes,
    (select h.missing_evidence from public.boxing_duplicate_hold_decisions h
      where h.seeded_fighter_id = d.seeded_id and h.survivor_fighter_id = d.existing_id and h.status = 'HOLD' limit 1) held_for
  from dup_pairs d group by seeded_id, existing_id, seeded, existing
)
select jsonb_build_object(
  'body_entries_total', (select count(*) from entries),
  'body_entries_title', (select count(*) from entries where kind = 'title'),
  'body_entries_top15', (select count(*) from entries where kind = 'ranking'),
  'body_entries_linked', (select count(*) from entries where fighter_id is not null),
  'distinct_canonical_fighters_linked', (select count(*) from linked),
  'linked_fighters_identity_only', (select count(*) from linked l join public.boxing_fighter_identity_status s on s.fighter_id = l.fighter_id where s.record_status = 'IDENTITY_SEEDED'),
  'linked_fighters_record_verified', (select count(*) from linked l join public.boxing_fighter_identity_status s on s.fighter_id = l.fighter_id where s.record_status = 'RECORD_VERIFIED'),
  'all_fighters_identity_only', (select count(*) from public.boxing_fighter_identity_status where record_status = 'IDENTITY_SEEDED'),
  'all_fighters_record_verified', (select count(*) from public.boxing_fighter_identity_status where record_status = 'RECORD_VERIFIED'),
  'ambiguous_body_id_entries_unlinked', (select count(*) from entries where fighter_id is null and cluster_state = 'ambiguous'),
  'ambiguous_candidate_clusters_total', (select count(*) from public.boxing_org_identity_candidates where state = 'ambiguous'),
  'subjects_possible_existing', (select count(*) from latest_seed where decision = 'POSSIBLE_EXISTING_FIGHTER'),
  'subjects_review_required', (select count(*) from latest_seed where decision = 'REVIEW_REQUIRED'),
  'subjects_no_candidate', (select count(*) from latest_seed where decision = 'NO_CANDIDATE'),
  'qids_on_more_than_one_fighter', (select count(*) from (select external_id from public.boxing_fighter_identities where namespace = 'wikidata.item' and verification_state <> 'rejected'
      group by 1 having count(distinct public.boxing_canonical_fighter_id(fighter_id)) > 1) x),
  'unexpected_duplicate_pairs', (select count(*) from dup_classified where held_for is null),
  'reviewed_held_duplicate_pairs', (select count(*) from dup_classified where held_for is not null),
  'duplicate_pairs', (select coalesce(jsonb_agg(jsonb_build_object('seeded', seeded, 'existing', existing, 'routes', routes, 'held_for', held_for)), '[]'::jsonb) from dup_classified),
  'public_dob_from_wikidata', (select count(*) from public.boxing_fighters f join public.boxing_identity_seed_decisions s on s.fighter_id = f.id where f.dob is not null),
  'batch_03_links', (select count(*) from public.boxing_org_identity_candidate_decisions where evidence ->> 'batch' = 'p0-top15-03'),
  'batch_03_fighters', (select count(distinct fighter_id) from public.boxing_org_identity_candidate_decisions where evidence ->> 'batch' = 'p0-top15-03'),
  'merges_total', (select count(*) from public.boxing_fighter_merge_decisions)
) totals;
