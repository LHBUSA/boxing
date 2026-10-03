-- P0 identity seed subjects (read-only): current world/super/regular/interim/franchise champions whose printed name has
-- no PropBetEdge fighter yet, grouped into one subject per boxer across bodies (letters-only name key), with every
-- body entry (body, cluster, name and country as printed, division, tier, status date) kept as its own source claim.
with latest_status as (
  select distinct on (s.organization_id, s.weight_class_id, s.document_kind) s.id, s.organization_id, s.weight_class_id, s.document_kind, coalesce(s.as_of, s.published_on) d
  from public.boxing_title_status_snapshots s
  order by s.organization_id, s.weight_class_id, s.document_kind, coalesce(s.as_of, s.published_on) desc nulls last, s.retrieved_at desc
), entries as (
  select o.slug body, wc.class_key division, ls.document_kind, t.tier, t.designation_native, t.holder_source_name printed, t.holder_country country,
    t.holder_org_boxer_id org_boxer_id, ls.d::text status_date,
    regexp_replace(lower(translate(t.holder_source_name, 'áéíóúñüçÁÉÍÓÚÑÜÇ’''', 'aeiounucAEIOUNUC')), '[^a-z]', '', 'g') person_key,
    case when t.holder_org_boxer_id is not null then 'id:' || t.holder_org_boxer_id else 'name:' || lower(regexp_replace(t.holder_source_name, '\s+', ' ', 'g')) end cluster_key
  from latest_status ls join public.boxing_title_status_entries t on t.snapshot_id = ls.id
  join public.boxing_organizations o on o.id = ls.organization_id join public.boxing_weight_classes wc on wc.id = ls.weight_class_id
  where t.holder_status in ('held', 'in_recess') and t.holder_source_name is not null and t.tier in ('world', 'super', 'regular', 'interim', 'franchise')
), fighters as (
  select regexp_replace(lower(translate(f.display_name, 'áéíóúñüçÁÉÍÓÚÑÜÇ’''', 'aeiounucAEIOUNUC')), '[^a-z]', '', 'g') person_key
  from public.boxing_fighters f where f.merged_into_id is null
)
select jsonb_agg(s order by s ->> 'person_key') subjects from (
  select jsonb_build_object('person_key', e.person_key,
    'names_as_printed', jsonb_agg(distinct e.printed), 'countries_as_printed', jsonb_agg(distinct e.country) filter (where e.country is not null),
    'divisions', jsonb_agg(distinct e.division), 'status_date', max(e.status_date),
    'entries', jsonb_agg(jsonb_build_object('body', e.body, 'cluster_key', e.cluster_key, 'document', e.document_kind, 'tier', e.tier,
       'designation', e.designation_native, 'printed', e.printed, 'country', e.country, 'org_boxer_id', e.org_boxer_id, 'division', e.division, 'status_date', e.status_date))) s
  from entries e
  where not exists (select 1 from fighters f where f.person_key = e.person_key)
  group by e.person_key
) x;
