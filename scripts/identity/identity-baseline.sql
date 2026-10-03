-- Boxing identity graph baseline (read-only): champion layer after the P0 seed, merges and batch 02.
with latest_status as (
  select distinct on (s.organization_id, s.weight_class_id, s.document_kind) s.id, s.organization_id
  from public.boxing_title_status_snapshots s
  order by s.organization_id, s.weight_class_id, s.document_kind, coalesce(s.as_of, s.published_on) desc nulls last, s.retrieved_at desc
), entries as (
  select o.slug body, t.holder_source_name printed,
    regexp_replace(lower(translate(t.holder_source_name, 'áàâäãéèêëíìîïóòôöõúùûüñçłÁÀÂÄÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇŁ’''', 'aaaaaeeeeiiiiooooouuuunclAAAAAEEEEIIIIOOOOOUUUUNCL')), '[^a-z]', '', 'g') person_key,
    (select public.boxing_canonical_fighter_id(d.fighter_id) from public.boxing_org_identity_candidates c
       join public.boxing_org_identity_candidate_decisions d on d.candidate_id = c.id and d.decision = 'matched'
       where c.organization_id = ls.organization_id and (c.cluster_key = 'id:' || t.holder_org_boxer_id or c.source_names ? t.holder_source_name)
       order by d.decided_at desc limit 1) fighter_id,
    (select c.state from public.boxing_org_identity_candidates c where c.organization_id = ls.organization_id
       and (c.cluster_key = 'id:' || t.holder_org_boxer_id or c.source_names ? t.holder_source_name) limit 1) cluster_state
  from latest_status ls join public.boxing_title_status_entries t on t.snapshot_id = ls.id
  join public.boxing_organizations o on o.id = ls.organization_id
  where t.holder_status in ('held', 'in_recess') and t.holder_source_name is not null and t.tier in ('world', 'super', 'regular', 'interim', 'franchise')
), latest_seed as (
  select distinct on (subject_key) subject_key, decision from public.boxing_identity_seed_decisions order by subject_key, decided_at desc
)
select jsonb_build_object(
  'sanctioning_body_entries', (select count(*) from entries),
  'distinct_printed_names', (select count(distinct printed) from entries),
  'distinct_subjects', (select count(distinct person_key) from entries),
  'entries_resolved', (select count(*) from entries where fighter_id is not null),
  'distinct_resolved_humans', (select count(distinct fighter_id) from entries),
  'canonical_fighters_total', (select count(*) from public.boxing_fighters where merged_into_id is null),
  'canonical_identity_seeded_only', (select count(*) from public.boxing_fighter_identity_status where record_status = 'IDENTITY_SEEDED'),
  'canonical_record_verified', (select count(*) from public.boxing_fighter_identity_status where record_status = 'RECORD_VERIFIED'),
  'resolved_champions_record_verified', (select count(distinct e.fighter_id) from entries e join public.boxing_fighter_identity_status s on s.fighter_id = e.fighter_id where s.record_status = 'RECORD_VERIFIED'),
  'resolved_champions_identity_seeded_only', (select count(distinct e.fighter_id) from entries e join public.boxing_fighter_identity_status s on s.fighter_id = e.fighter_id where s.record_status = 'IDENTITY_SEEDED'),
  'seeded_fighters_created', (select count(*) from public.boxing_identity_seed_decisions where decision = 'AUTO_SEEDED'),
  'champion_subjects_review_required', (select count(*) from latest_seed s where s.decision = 'REVIEW_REQUIRED' and s.subject_key in (select person_key from entries)),
  'champion_subjects_possible_existing_fighter', (select count(*) from latest_seed s where s.decision = 'POSSIBLE_EXISTING_FIGHTER' and s.subject_key in (select person_key from entries)),
  'champion_subjects_no_candidate', (select count(*) from latest_seed s where s.decision = 'NO_CANDIDATE' and s.subject_key in (select person_key from entries)),
  'duplicate_merges_performed', (select count(*) from public.boxing_fighter_merge_decisions),
  'unresolved_ambiguous_body_id_clusters', (select count(distinct (body, printed)) from entries where fighter_id is null and cluster_state = 'ambiguous'),
  'all_ambiguous_candidate_clusters', (select count(*) from public.boxing_org_identity_candidates where state = 'ambiguous')
) baseline;
