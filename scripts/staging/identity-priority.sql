-- Identity review priority queue (owner directive 2026-10-02). READ-ONLY: ranks what a human reviewer should look at
-- first; it decides nothing and never matches anyone by name. Ambiguous identities stay held.
--
--   P0: current champions and interim champions (each body's latest own documents), fighters on upcoming announced
--       cards (promoter schedule lanes), and each body's current top 15
--   P1: each body's current ranks 16-40, and commission appearances from the last 12 months
--   P2: everything else (historical archive)
--
-- Sanctioning-body rows (boxing_org_identity_reviews) are ranked from the SAME body's latest printed documents (the
-- printed entry the review row came from); commission rows (boxing_identity_review_queue) by namespace and date.
with latest_rank as (
  select distinct on (r.organization_id, r.weight_class_id) r.id, r.organization_id
  from public.boxing_ranking_snapshots r order by r.organization_id, r.weight_class_id, r.effective_on desc nulls last, r.captured_at desc
), ranked as (
  select l.organization_id, lower(e.source_name) nm, min(e.position) best
  from latest_rank l join public.boxing_ranking_entries e on e.snapshot_id = l.id
  where e.fighter_id is null and e.source_name is not null group by 1, 2
), latest_status as (
  select distinct on (s.organization_id, s.weight_class_id, s.document_kind) s.id, s.organization_id
  from public.boxing_title_status_snapshots s order by s.organization_id, s.weight_class_id, s.document_kind, coalesce(s.as_of, s.published_on) desc nulls last, s.retrieved_at desc
), holders as (
  select distinct ls.organization_id, lower(t.holder_source_name) nm, t.tier
  from latest_status ls join public.boxing_title_status_entries t on t.snapshot_id = ls.id
  where t.holder_status in ('held', 'in_recess') and t.fighter_id is null and t.holder_source_name is not null
), org_rows as (
  select o.slug body, v.source_name, v.country,
    case when exists (select 1 from holders h where h.organization_id = v.organization_id and h.nm = lower(v.source_name) and h.tier in ('world', 'super', 'regular', 'interim', 'franchise')) then 'P0'
         when (select best from ranked k where k.organization_id = v.organization_id and k.nm = lower(v.source_name)) <= 15 then 'P0'
         when (select best from ranked k where k.organization_id = v.organization_id and k.nm = lower(v.source_name)) <= 40 then 'P1'
         else 'P2' end prio,
    (select string_agg(distinct h.tier, '/') from holders h where h.organization_id = v.organization_id and h.nm = lower(v.source_name)) titles,
    (select best from ranked k where k.organization_id = v.organization_id and k.nm = lower(v.source_name)) best_rank
  from (select distinct on (organization_id, lower(source_name)) * from public.boxing_org_identity_reviews order by organization_id, lower(source_name), first_seen_at) v
  join public.boxing_organizations o on o.id = v.organization_id
), com_dated as (
  -- a commission review item is dated by the official source bout of its appearance (keys start "YYYY-MM-DD|" or carry it)
  select q.id, q.namespace, q.raw_name,
    (select max(substring(d.bout_external_id from '(\d{4}-\d{2}-\d{2})'))::date from public.boxing_identity_appearance_decisions d where d.review_item_id = q.id) event_date
  from public.boxing_identity_review_queue q where q.status = 'pending'
), com_rows as (
  select namespace, raw_name, event_date,
    case when namespace ~ '^(promoter|matchroom|pbc)' or event_date >= current_date then 'P0'
         when event_date >= current_date - 365 then 'P1' else 'P2' end prio
  from com_dated
)
select jsonb_build_object(
  'generated_at', now(),
  'rule', 'identity-priority@1 (read-only; decides nothing)',
  'sanctioning_names', (select jsonb_object_agg(prio, n) from (select prio, count(*) n from org_rows group by 1) x),
  'commission_appearances', (select jsonb_object_agg(prio, n) from (select prio, count(*) n from com_rows group by 1) x),
  'p0_sanctioning', (select coalesce(jsonb_agg(jsonb_build_object('body', body, 'name_as_printed', source_name, 'country', country, 'titles', titles, 'best_rank', best_rank) order by (coalesce(titles, '') ~ '(world|super|regular|interim|franchise)') desc, best_rank nulls last, body), '[]'::jsonb) from org_rows where prio = 'P0'),
  'p0_commission', (select coalesce(jsonb_agg(jsonb_build_object('namespace', namespace, 'name_as_printed', raw_name, 'event_date', event_date) order by event_date), '[]'::jsonb) from com_rows where prio = 'P0')
) as queue;
