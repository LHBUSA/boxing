-- Body rankings read: a requested date covers its whole month. Sanctioning-body lists are monthly and stored with the
-- month-end date of the month they are "as of" (WBA, IBF, WBO history, WBC); reading "as of today" hid the current
-- month's list until the month ended (seen with the WBC September 2026 ratings on 2026-09-15). Stored snapshots are unchanged.

begin;

create or replace function public.boxing_site_body_rankings(p_org_slug text, p_weight_class_key text, p_gender text default 'male', p_as_of date default null)
returns jsonb language sql stable set search_path = '' as $$
  with o as (select o.id, o.slug, o.short_name, src.access_mode, src.enabled from public.boxing_organizations o
             left join public.boxing_sources src on src.source_key = o.slug || '_official' where o.slug = p_org_slug),
  wc as (select id from public.boxing_weight_classes where class_key = p_weight_class_key),
  snap as (select public.boxing_ranking_snapshot_as_of((select id from o), (select id from wc), p_gender, (date_trunc('month', coalesce(p_as_of, current_date)) + interval '1 month - 1 day')::date) as id)
  select case when not exists (select 1 from o where coalesce(enabled, false) and access_mode = 'approved_ingest')
    then jsonb_build_object('organization', p_org_slug, 'state', 'not_licensed')
    else jsonb_build_object('organization', p_org_slug, 'state', case when (select id from snap) is null then 'no_snapshot' else 'current' end,
      'snapshot', public.boxing_ranking_entries_json((select id from snap)),
      'source_record', (select source_record from public.boxing_ranking_snapshots where id = (select id from snap)),
      'previous', public.boxing_ranking_entries_json(public.boxing_ranking_snapshot_as_of((select id from o), (select id from wc), p_gender, (date_trunc('month', coalesce(p_as_of, current_date)) + interval '1 month - 1 day')::date, (select id from snap))),
      'champions', (select public.boxing_title_snapshot_json(s.id) from public.boxing_title_status_snapshots s
                    where s.organization_id = (select id from o) and s.weight_class_id = (select id from wc) and s.gender_scope = p_gender
                      and s.document_kind in ('wba_ranking','ibf_rating','wbo_ratings','wbc_ratings') and coalesce(s.as_of, s.published_on) <= (date_trunc('month', coalesce(p_as_of, current_date)) + interval '1 month - 1 day')::date
                    order by coalesce(s.as_of, s.published_on) desc, s.captured_at desc limit 1),
      'history', (select coalesce(jsonb_agg(jsonb_build_object('published_on', r.published_on, 'effective_on', r.effective_on) order by coalesce(r.effective_on, r.published_on) desc), '[]'::jsonb)
                  from public.boxing_ranking_snapshots r where r.organization_id = (select id from o) and r.weight_class_id = (select id from wc) and r.gender_scope = p_gender
                    and not exists (select 1 from public.boxing_ranking_snapshots n where n.supersedes_id = r.id)))
  end
$$;

select public.boxing_lockdown();

commit;
