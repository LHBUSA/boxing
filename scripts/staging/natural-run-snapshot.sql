-- Read-only snapshot of the six commission sources on Boxing STAGING, taken before and after a natural cron slot
-- (scripts/staging/natural-run-check.ps1). Every number is a count; nothing is written.
with srcs as (
  select id, source_key from public.boxing_sources
  where source_key in ('nsac_nevada','florida_athletic_commission','nj_sacb','mo_office_of_athletics','pa_state_athletic_commission','tn_athletic_commission')
),
per_source as (
  select s.source_key, jsonb_build_object(
    'events', (select count(*) from public.boxing_events e where e.source_id = s.id),
    'bouts', (select count(*) from public.boxing_bouts b where b.source_id = s.id),
    'bout_identities', (select count(*) from public.boxing_bout_identities i where i.source_id = s.id),
    'results_current', (select count(*) from public.boxing_bout_results_current r where r.source_id = s.id),
    'result_rows', (select count(*) from public.boxing_bout_results r where r.source_id = s.id),
    'scorecards_current', (select count(*) from public.boxing_scorecards_current c join public.boxing_bouts b on b.id = c.bout_id where b.source_id = s.id),
    'official_assignments_active', (select count(*) from public.boxing_bout_officials bo join public.boxing_bouts b on b.id = bo.bout_id
                                    where b.source_id = s.id and bo.assignment_state in ('assigned','worked')),
    'suspensions', (select count(*) from public.boxing_regulatory_actions x where x.source_id = s.id),
    'review_pending', (select count(*) from public.boxing_identity_review_queue q where q.source_id = s.id and q.status = 'pending'),
    'review_resolved', (select count(*) from public.boxing_identity_review_queue q where q.source_id = s.id and q.status <> 'pending'),
    'decisions_resolver', (select count(*) from public.boxing_identity_appearance_decisions d where d.source_id = s.id and d.decided_by = 'resolver'),
    'decisions_human', (select count(*) from public.boxing_identity_appearance_decisions d where d.source_id = s.id and d.decided_by <> 'resolver'),
    'documents', (select coalesce(jsonb_object_agg(st, n), '{}'::jsonb) from (select coalesce(d.status, '?') st, count(*) n from public.boxing_source_documents d where d.source_id = s.id group by 1) x),
    'documents_with_revisions', (select count(*) from public.boxing_source_documents d where d.source_id = s.id and d.current_revision > 1),
    'document_revisions', (select count(*) from public.boxing_source_document_revisions r join public.boxing_source_documents d on d.id = r.document_id where d.source_id = s.id),
    'observations', (select count(*) from public.boxing_source_observations o where o.source_id = s.id)
  ) c from srcs s
)
select jsonb_build_object(
  'taken_at', now(),
  'sources', (select jsonb_object_agg(source_key, c) from per_source),
  'global', jsonb_build_object(
    'fighters', (select count(*) from public.boxing_fighters where identity_state <> 'merged'),
    'officials', (select count(*) from public.boxing_officials),
    'bouts', (select count(*) from public.boxing_bouts),
    'events', (select count(*) from public.boxing_events),
    'possible_duplicate_bouts', jsonb_array_length(public.boxing_possible_duplicate_bouts(1000)),
    'duplicate_active_judge_slots', (select count(*) from (select 1 from public.boxing_bout_officials where assignment_state in ('assigned','worked') and role = 'judge' and slot is not null
                                      group by bout_id, slot having count(*) > 1) d),
    'duplicate_active_referees', (select count(*) from (select 1 from public.boxing_bout_officials where assignment_state in ('assigned','worked') and role = 'referee'
                                   group by bout_id having count(*) > 1) d),
    'event_identity_collisions', (select count(*) from (select 1 from public.boxing_event_identities group by namespace, external_id having count(distinct event_id) > 1) d),
    'bout_identity_collisions', (select count(*) from (select 1 from public.boxing_bout_identities group by namespace, external_id having count(distinct bout_id) > 1) d),
    'same_day_same_pair_bouts', (select count(*) from (select 1 from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
                                  join public.boxing_bout_participants pa on pa.bout_id = b.id and pa.side = 'a' join public.boxing_bout_participants pb on pb.bout_id = b.id and pb.side = 'b'
                                  group by e.event_date, least(pa.fighter_id, pb.fighter_id), greatest(pa.fighter_id, pb.fighter_id) having count(*) > 1) d),
    'decision_resolver_versions', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select coalesce(resolver_version, '-') v, count(*) n from public.boxing_identity_appearance_decisions group by 1) x),
    'queue_resolver_versions', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select coalesce(resolver_version, '-') v, count(*) n from public.boxing_identity_review_queue group by 1) x)
  )
) as snapshot;
