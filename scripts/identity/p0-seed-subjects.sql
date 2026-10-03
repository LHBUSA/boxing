-- P0 identity seed subjects (read-only). __SCOPE__ is replaced by the caller with 'champions' or 'top15'.
-- One subject per boxer (letters-only name key) across bodies; every body entry is kept as its own source claim with
-- its real candidate cluster (joined, never reconstructed) and the fighter that cluster already resolves to, if any.
-- Subjects are NOT filtered by existing fighters: the rule classifies EXISTING_LINK / POSSIBLE_EXISTING_FIGHTER itself.
with latest_status as (
  select distinct on (s.organization_id, s.weight_class_id, s.document_kind) s.id, s.organization_id, s.weight_class_id, coalesce(s.as_of, s.published_on) d
  from public.boxing_title_status_snapshots s
  order by s.organization_id, s.weight_class_id, s.document_kind, coalesce(s.as_of, s.published_on) desc nulls last, s.retrieved_at desc
), latest_rank as (
  select distinct on (r.organization_id, r.weight_class_id) r.id, r.organization_id, r.weight_class_id, coalesce(r.effective_on, r.captured_at::date) d
  from public.boxing_ranking_snapshots r
  order by r.organization_id, r.weight_class_id, r.effective_on desc nulls last, r.captured_at desc
), raw as (
  select 'title' kind, ls.organization_id, ls.weight_class_id, t.tier role, t.holder_source_name printed, t.holder_country country,
    t.holder_org_boxer_id org_boxer_id, ls.d::text status_date
  from latest_status ls join public.boxing_title_status_entries t on t.snapshot_id = ls.id
  where '__SCOPE__' = 'champions' and t.holder_status in ('held', 'in_recess') and t.holder_source_name is not null
    and t.tier in ('world', 'super', 'regular', 'interim', 'franchise')
  union all
  select 'ranking', lr.organization_id, lr.weight_class_id, 'rank ' || e.position, e.source_name, coalesce(e.metadata ->> 'country', e.metadata ->> 'nationality'),
    e.metadata ->> 'org_boxer_id', lr.d::text
  from latest_rank lr join public.boxing_ranking_entries e on e.snapshot_id = lr.id
  where '__SCOPE__' = 'top15' and e.position between 1 and 15 and e.source_name is not null and not coalesce(e.is_vacant, false)
), entries as (
  select r.*, o.slug body, wc.class_key division,
    regexp_replace(lower(translate(r.printed, 'áàâäãéèêëíìîïóòôöõúùûüñçłÁÀÂÄÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇŁ’''', 'aaaaaeeeeiiiiooooouuuunclAAAAAEEEEIIIIOOOOOUUUUNCL')), '[^a-z]', '', 'g') person_key,
    c.id candidate_id, c.cluster_key, c.state cluster_state,
    (select public.boxing_canonical_fighter_id(d.fighter_id) from public.boxing_org_identity_candidate_decisions d
      where d.candidate_id = c.id and d.decision = 'matched' order by d.decided_at desc limit 1) linked_fighter_id
  from raw r
  join public.boxing_organizations o on o.id = r.organization_id join public.boxing_weight_classes wc on wc.id = r.weight_class_id
  left join lateral (select c.* from public.boxing_org_identity_candidates c where c.organization_id = r.organization_id
    and (c.cluster_key = 'id:' || r.org_boxer_id or c.source_names ? r.printed)
    order by (c.cluster_key = 'id:' || r.org_boxer_id) desc nulls last limit 1) c on true
)
select jsonb_agg(s order by s ->> 'person_key') subjects from (
  select jsonb_build_object('person_key', e.person_key,
    'names_as_printed', jsonb_agg(distinct e.printed), 'countries_as_printed', coalesce(jsonb_agg(distinct e.country) filter (where e.country is not null), '[]'::jsonb),
    'divisions', jsonb_agg(distinct e.division), 'status_date', max(e.status_date),
    'entries', jsonb_agg(jsonb_build_object('kind', e.kind, 'body', e.body, 'cluster_key', e.cluster_key, 'candidate_id', e.candidate_id,
       'cluster_state', e.cluster_state, 'role', e.role, 'printed', e.printed, 'country', e.country, 'org_boxer_id', e.org_boxer_id,
       'division', e.division, 'status_date', e.status_date, 'linked_fighter_id', e.linked_fighter_id))) s
  from entries e
  where e.person_key <> ''
  group by e.person_key
) x;
