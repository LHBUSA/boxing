-- READ ONLY. Officials + commission-run snapshot for the natural cron proof and the cleanup report.
-- pwsh scripts/staging/officials-cleanup.ps1 -RunMetrics -Since <iso> -OutDir <dir>   (Since defaults to 36 h ago)
-- :since is substituted by the caller as an ISO timestamp literal.
select jsonb_build_object(
  'captured_at', now(),
  'runs', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'worker', r.worker, 'adapter_version', r.adapter_version, 'status', r.status,
      'started_at', r.started_at, 'finished_at', r.finished_at, 'observed', r.observed_count,
      'canonical_writes', r.canonical_writes, 'review_items', r.review_items, 'errors', r.error_count,
      'duplicates_skipped', r.duplicates_skipped, 'metrics', r.metrics, 'metadata', r.metadata) order by r.started_at)
    from public.boxing_ingest_runs r where r.worker ilike '%commission%' and r.started_at >= :since), '[]'::jsonb),
  'parser_versions_observed_since', coalesce((select jsonb_object_agg(v, n) from (
      select coalesce(parser_version, 'null') v, count(*) n from public.boxing_source_observations
      where observed_at >= :since and entity_type in ('commission_results_document', 'commission_document_rejected', 'commission_bout_result')
      group by 1) x), '{}'::jsonb),
  'officials', jsonb_build_object(
    'total', (select count(*) from public.boxing_officials),
    'canonical', (select count(*) from public.boxing_officials where merged_into_id is null),
    'merged', (select count(*) from public.boxing_officials where merged_into_id is not null),
    'by_type', (select jsonb_object_agg(official_type, n) from (select official_type, count(*) n from public.boxing_officials where merged_into_id is null group by 1) t),
    'identities', (select count(*) from public.boxing_official_identities),
    'aliases', (select count(*) from public.boxing_official_aliases),
    'canonicalizations', (select count(*) from public.boxing_official_canonicalizations),
    'bout_official_rows', (select count(*) from public.boxing_bout_officials),
    'active_assignments', (select count(*) from public.boxing_bout_officials where assignment_state in ('assigned', 'worked')),
    'scorecards', (select count(*) from public.boxing_scorecards),
    'current_scorecards', (select count(*) from public.boxing_scorecards_current),
    'duplicate_active_judge_slots', (select count(*) from (select 1 from public.boxing_bout_officials where assignment_state in ('assigned', 'worked') and role = 'judge' and slot is not null group by bout_id, slot having count(*) > 1) d),
    'current_scorecards_without_active_assignment', (select count(*) from public.boxing_scorecards_current s where not exists (select 1 from public.boxing_bout_officials bo where bo.bout_id = s.bout_id and bo.official_id = s.judge_id and bo.assignment_state in ('assigned', 'worked'))),
    'pending_review_items', (select count(*) from public.boxing_official_review_queue where status = 'pending'),
    'review_items_since', (select coalesce(jsonb_object_agg(reason, n), '{}'::jsonb) from (select reason, count(*) n from public.boxing_official_review_queue where created_at >= :since group by 1) q),
    'parser_artifact_names', (select coalesce(jsonb_agg(display_name order by display_name), '[]'::jsonb) from public.boxing_officials where merged_into_id is null and (display_name ~ '^[^[:alpha:]]' or display_name ~ '\(\s*\d+(\.\d)?\s*-\s*\d+(\.\d)?\s*\)' or display_name ~ ' & ')),
    'surname_only_names', (select coalesce(jsonb_agg(display_name order by display_name), '[]'::jsonb) from public.boxing_officials where merged_into_id is null and display_name !~ '\s')
  ),
  -- promoters as listed on the stored (latest) sheets
  'malformed_nevada_promoters', (select coalesce(jsonb_agg(distinct name), '[]'::jsonb) from public.boxing_site_sheet_promoters()
    where name ~* '(^|\s)(d|b|a)$' or name ~* '^(b|a)(\s|$)' or name ~* '\sLLC d$'),
  'malformed_event_names', (select coalesce(jsonb_agg(name order by name), '[]'::jsonb) from public.boxing_events where name ~* '\sd and b and a\s'),
  'malformed_nj_judge_names', (select coalesce(jsonb_agg(display_name order by display_name), '[]'::jsonb) from public.boxing_officials
    where merged_into_id is null and (display_name ~ '^&' or display_name ~ '\(\s*\d+(\.\d)?\s*-\s*\d+(\.\d)?\s*\)'))
)::text as metrics
