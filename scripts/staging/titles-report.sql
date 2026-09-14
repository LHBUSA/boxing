-- Read-only report of sanctioning-body title + ranking ingestion on Boxing STAGING (WBA, IBF, WBO; WBC not licensed).
-- Every number is a count; nothing is written.
with orgs as (select o.id, o.slug from public.boxing_organizations o where o.slug in ('wbc','wba','ibf','wbo'))
select jsonb_build_object(
  'taken_at', now(),
  'sources', (select jsonb_object_agg(s.source_key, jsonb_build_object('access_mode', s.access_mode, 'enabled', s.enabled))
              from public.boxing_sources s where s.source_key in ('wbc_official','wba_official','ibf_official','wbo_official')),
  'status_snapshots_by_body_kind', (select jsonb_object_agg(k, n) from (select o.slug || ':' || s.document_kind k, count(*) n
                                     from public.boxing_title_status_snapshots s join orgs o on o.id = s.organization_id group by 1) x),
  'status_snapshots_by_body_division', (select jsonb_object_agg(k, n) from (select o.slug || ':' || wc.class_key k, count(*) n
                                         from public.boxing_title_status_snapshots s join orgs o on o.id = s.organization_id
                                         join public.boxing_weight_classes wc on wc.id = s.weight_class_id group by 1) x),
  'ranking_snapshots_by_body_division', (select jsonb_object_agg(k, n) from (select o.slug || ':' || wc.class_key k, count(*) n
                                          from public.boxing_ranking_snapshots r join orgs o on o.id = r.organization_id
                                          join public.boxing_weight_classes wc on wc.id = r.weight_class_id group by 1) x),
  'ranking_revisions', (select count(*) from public.boxing_ranking_snapshots r join orgs o on o.id = r.organization_id where r.supersedes_id is not null),
  'months_by_body', (select jsonb_object_agg(slug, jsonb_build_object('distinct_months', n, 'first', f, 'last', l)) from (
                       select o.slug, count(distinct to_char(coalesce(s.as_of, s.published_on), 'YYYY-MM')) n,
                              min(to_char(coalesce(s.as_of, s.published_on), 'YYYY-MM')) f, max(to_char(coalesce(s.as_of, s.published_on), 'YYYY-MM')) l
                       from public.boxing_title_status_snapshots s join orgs o on o.id = s.organization_id
                       where s.document_kind in ('wba_ranking','ibf_rating','wbo_ratings') group by o.slug) x),
  'entries_identity', (select jsonb_object_agg(k, n) from (select o.slug || ':' || e.identity_state k, count(*) n
                        from public.boxing_title_status_entries e join public.boxing_title_status_snapshots s on s.id = e.snapshot_id
                        join orgs o on o.id = s.organization_id group by 1) x),
  'ranking_entries_resolved', (select jsonb_object_agg(k, n) from (select o.slug || ':' || case when e.fighter_id is null then 'unresolved' else 'resolved' end k, count(*) n
                                from public.boxing_ranking_entries e join public.boxing_ranking_snapshots r on r.id = e.snapshot_id
                                join orgs o on o.id = r.organization_id group by 1) x),
  'identity_reviews_by_body', (select jsonb_object_agg(slug, n) from (select o.slug, count(*) n from public.boxing_org_identity_reviews v
                                join orgs o on o.id = v.organization_id group by 1) x),
  'identity_decisions', (select count(*) from public.boxing_org_identity_decisions),
  'conflicts_by_body', (select jsonb_object_agg(slug, n) from (select o.slug, count(*) n from public.boxing_title_conflicts c join orgs o on o.id = c.organization_id group by 1) x),
  'conflicts_current', (select coalesce(jsonb_agg(jsonb_build_object('body', o.slug, 'division', wc.class_key, 'belt', c.belt_key,
                          'left', ls.document_kind || ': ' || coalesce(c.left_value, '-'), 'right', rs.document_kind || ': ' || coalesce(c.right_value, '-'))), '[]'::jsonb)
                        from public.boxing_title_conflicts c join orgs o on o.id = c.organization_id
                        join public.boxing_weight_classes wc on wc.id = c.weight_class_id
                        join public.boxing_title_status_snapshots ls on ls.id = c.left_snapshot_id
                        join public.boxing_title_status_snapshots rs on rs.id = c.right_snapshot_id
                        where ls.retrieved_at > now() - interval '2 days' and rs.retrieved_at > now() - interval '2 days'),
  'diffs', (select count(*) from public.boxing_title_snapshot_diffs),
  'proposals_by_body_type', (select jsonb_object_agg(k, n) from (select o.slug || ':' || p.change_type k, count(*) n
                              from public.boxing_title_event_proposals p join orgs o on o.id = p.organization_id group by 1) x),
  'proposal_decisions', (select count(*) from public.boxing_title_event_proposal_decisions),
  'title_events_written', (select count(*) from public.boxing_title_events),
  'pending_divisions', (select coalesce(jsonb_agg(o.slug || ':' || d.native_label), '[]'::jsonb) from public.boxing_org_divisions d join orgs o on o.id = d.organization_id where d.review_state = 'pending_review'),
  'pending_designations', (select coalesce(jsonb_agg(o.slug || ':' || d.native_label), '[]'::jsonb) from public.boxing_org_designations d join orgs o on o.id = d.organization_id where d.review_state = 'pending_review'),
  'checkpoints', (select coalesce(jsonb_agg(jsonb_build_object('job', job_key, 'completed', jsonb_array_length(completed), 'failures', jsonb_array_length(failures))), '[]'::jsonb)
                  from public.boxing_source_backfill_checkpoints),
  'runs', (select jsonb_object_agg(k, n) from (select s.source_key || ':' || r.status k, count(*) n from public.boxing_ingest_runs r
            join public.boxing_sources s on s.id = r.source_id where r.worker = 'boxing-rankings' group by 1) x),
  'wbc_facts', jsonb_build_object(
     'status_snapshots', (select count(*) from public.boxing_title_status_snapshots s join orgs o on o.id = s.organization_id where o.slug = 'wbc'),
     'ranking_snapshots', (select count(*) from public.boxing_ranking_snapshots r join orgs o on o.id = r.organization_id where o.slug = 'wbc'),
     'observations', (select count(*) from public.boxing_source_observations x join public.boxing_sources s on s.id = x.source_id where s.source_key = 'wbc_official'))
) as report;
