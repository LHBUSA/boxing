-- Chronological title-status diffs and proposals (owner decision 2026-09-14). WBA and WBO history was collected newest
-- month first, so a snapshot's previous_snapshot_id (set when it was stored) is usually empty and no diff was computed.
-- This pass reprocesses each body's snapshots oldest -> newest per division and document kind:
--   boxing_title_chain_pairs(org, limit)   consecutive (previous, current) pairs with no diff yet, with both documents and
--                                          the same-date ranking entries (non-superseded) for change detection
--   boxing_record_title_analyses(p)        records a batch through boxing_record_title_analysis (diffs + proposals only)
--   boxing_title_proposal_summary()        proposals by body and change type, split by whether their diff is between
--                                          chronologically consecutive snapshots today
-- Stored snapshots, their previous_snapshot_id and earlier diffs are not rewritten. Proposals never create title events.

begin;

create or replace function public.boxing_title_ranking_entries_light(p_org uuid, p_weight_class uuid, p_gender text, p_on date)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('position', e.position, 'rank', e.rank, 'rank_label', e.rank_label, 'fighter_id', e.fighter_id,
            'source_name', e.source_name, 'designation', e.designation, 'mandatory', e.mandatory, 'is_vacant', e.is_vacant, 'is_champion', e.is_champion) order by e.position)
          from public.boxing_ranking_entries e where e.snapshot_id = x.id), '[]'::jsonb)
  from (select r.id from public.boxing_ranking_snapshots r
        where r.organization_id = p_org and r.weight_class_id = p_weight_class and r.gender_scope = p_gender and r.effective_on = p_on
          and not exists (select 1 from public.boxing_ranking_snapshots n where n.supersedes_id = r.id)
        order by r.captured_at desc limit 1) x
$$;

create or replace function public.boxing_title_chain_pairs(p_org_slug text, p_limit int default 50)
returns jsonb language sql stable set search_path = '' as $$
  with o as (select id from public.boxing_organizations where slug = p_org_slug),
  chain as (
    select s.id, s.organization_id, s.weight_class_id, s.gender_scope, s.document_kind, coalesce(s.as_of, s.published_on) d,
      lag(s.id) over w prev_id, lag(coalesce(s.as_of, s.published_on)) over w prev_d
    from public.boxing_title_status_snapshots s
    where s.organization_id = (select id from o)
    window w as (partition by s.weight_class_id, s.gender_scope, s.document_kind order by coalesce(s.as_of, s.published_on), s.captured_at)),
  todo as (
    select c.* from chain c
    where c.prev_id is not null
      and not exists (select 1 from public.boxing_title_snapshot_diffs x where x.previous_snapshot_id = c.prev_id and x.current_snapshot_id = c.id)
    order by c.d, c.id limit p_limit)
  select coalesce(jsonb_agg(jsonb_build_object(
      'previous_snapshot_id', t.prev_id, 'current_snapshot_id', t.id, 'document_kind', t.document_kind, 'previous_on', t.prev_d, 'current_on', t.d,
      'previous', public.boxing_title_snapshot_json(t.prev_id), 'current', public.boxing_title_snapshot_json(t.id),
      'previous_ranking', case when t.document_kind in ('wba_ranking','ibf_rating','wbo_ratings') then public.boxing_title_ranking_entries_light(t.organization_id, t.weight_class_id, t.gender_scope, t.prev_d) end,
      'current_ranking', case when t.document_kind in ('wba_ranking','ibf_rating','wbo_ratings') then public.boxing_title_ranking_entries_light(t.organization_id, t.weight_class_id, t.gender_scope, t.d) end)
    order by t.d, t.id), '[]'::jsonb)
  from todo t
$$;

create or replace function public.boxing_record_title_analyses(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare x jsonb; v_diffs int := 0; v_props int := 0; r jsonb;
begin
  for x in select * from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) loop
    r := public.boxing_record_title_analysis(x);
    if r ->> 'diff_id' is not null then v_diffs := v_diffs + 1; v_props := v_props + coalesce((r ->> 'proposals')::int, 0); end if;
  end loop;
  return jsonb_build_object('diffs', v_diffs, 'proposals', v_props);
end $$;

create or replace function public.boxing_title_proposal_summary()
returns jsonb language sql stable set search_path = '' as $$
  with chain as (
    select s.id, lag(s.id) over (partition by s.organization_id, s.weight_class_id, s.gender_scope, s.document_kind order by coalesce(s.as_of, s.published_on), s.captured_at) prev_id
    from public.boxing_title_status_snapshots s),
  p as (
    select o.slug, pr.change_type, exists (select 1 from chain c where c.id = d.current_snapshot_id and c.prev_id = d.previous_snapshot_id) consecutive,
      exists (select 1 from public.boxing_title_event_proposal_decisions x where x.proposal_id = pr.id) decided
    from public.boxing_title_event_proposals pr join public.boxing_title_snapshot_diffs d on d.id = pr.diff_id
    join public.boxing_organizations o on o.id = pr.organization_id)
  select jsonb_build_object(
    'by_body', (select coalesce(jsonb_object_agg(slug, j), '{}'::jsonb) from (
       select slug, jsonb_build_object('total', count(*), 'consecutive', count(*) filter (where consecutive), 'non_consecutive', count(*) filter (where not consecutive),
         'decided', count(*) filter (where decided),
         'by_type', (select jsonb_object_agg(change_type, n) from (select change_type, count(*) n from p p2 where p2.slug = p.slug and p2.consecutive group by 1) t)) j
       from p group by slug) b),
    'title_events_from_proposals', (select count(*) from public.boxing_title_event_proposal_decisions where title_event_id is not null),
    'diffs', (select count(*) from public.boxing_title_snapshot_diffs))
$$;

select public.boxing_lockdown();

commit;
