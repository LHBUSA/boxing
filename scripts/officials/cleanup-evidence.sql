-- Read-only officials cleanup evidence (one jsonb value). Kept identical to the body of
-- public.boxing_official_cleanup_evidence() in migration 20260914000024 (checked by a unit test) so the
-- planner can run before that migration is applied.
with assignments as (
  select bo.official_id, bo.bout_id, bo.role, bo.slot, bo.assignment_state, e.event_date, e.name as event_name, c.slug as commission,
         (select coalesce(jsonb_agg(bi.external_id order by bi.external_id), '[]'::jsonb) from public.boxing_bout_identities bi
          where bi.bout_id = bo.bout_id and bi.namespace like '%.bout' and bi.verification_state <> 'rejected') as source_bout_ids,
         (select count(*) from public.boxing_scorecards s where s.bout_id = bo.bout_id and s.judge_id = bo.official_id) as scorecards,
         (select count(*) from public.boxing_scorecards_current s where s.bout_id = bo.bout_id and s.judge_id = bo.official_id) as scorecards_current,
         (select min(s.slot) from public.boxing_scorecards s where s.bout_id = bo.bout_id and s.judge_id = bo.official_id) as scorecard_slot
  from public.boxing_bout_officials bo
  join public.boxing_bouts b on b.id = bo.bout_id
  join public.boxing_events e on e.id = b.event_id
  left join public.boxing_commissions c on c.id = e.commission_id),
parses as (
  select distinct on (o.external_key, o.parser_version) o.id, o.external_key, o.parser_version, o.observed_at, s.source_key, o.payload
  from public.boxing_source_observations o join public.boxing_sources s on s.id = o.source_id
  where o.entity_type = 'commission_results_document'
  order by o.external_key, o.parser_version, o.observed_at desc, o.id)
select jsonb_build_object(
  'generated_at', now(),
  'totals', jsonb_build_object(
    'officials', (select count(*) from public.boxing_officials),
    'officials_merged', (select count(*) from public.boxing_officials where merged_into_id is not null),
    'official_identities', (select count(*) from public.boxing_official_identities),
    'official_name_keys', (select count(*) from public.boxing_official_name_keys),
    'bout_officials', (select count(*) from public.boxing_bout_officials),
    'bout_officials_active', (select count(*) from public.boxing_bout_officials where assignment_state in ('assigned', 'worked')),
    'scorecards', (select count(*) from public.boxing_scorecards),
    'scorecards_current', (select count(*) from public.boxing_scorecards_current),
    'review_pending', (select count(*) from public.boxing_official_review_queue where status = 'pending'),
    'duplicate_active_judge_slots', (select count(*) from (select 1 from public.boxing_bout_officials
        where assignment_state in ('assigned', 'worked') and role = 'judge' and slot is not null group by bout_id, slot having count(*) > 1) d),
    'bouts_with_two_active_referees', (select count(*) from (select 1 from public.boxing_bout_officials
        where assignment_state in ('assigned', 'worked') and role = 'referee' group by bout_id having count(*) > 1) d),
    'scorecards_without_active_assignment', (select count(*) from public.boxing_scorecards_current s where not exists (
        select 1 from public.boxing_bout_officials bo where bo.bout_id = s.bout_id and bo.official_id = s.judge_id and bo.assignment_state in ('assigned', 'worked')))),
  'officials', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'public_id', o.public_id, 'display_name', o.display_name, 'normalized_name', o.normalized_name,
      'official_type', o.official_type, 'identity_state', o.identity_state, 'merged_into_id', o.merged_into_id,
      'assignments', (select coalesce(jsonb_agg(jsonb_build_object('bout_id', a.bout_id, 'role', a.role, 'slot', a.slot, 'state', a.assignment_state,
                        'event_date', a.event_date, 'event_name', a.event_name, 'commission', a.commission, 'source_bout_ids', a.source_bout_ids,
                        'scorecards', a.scorecards, 'scorecards_current', a.scorecards_current, 'scorecard_slot', a.scorecard_slot)
                      order by a.event_date, a.bout_id, a.role), '[]'::jsonb) from assignments a where a.official_id = o.id))
    order by o.display_name, o.id), '[]'::jsonb) from public.boxing_officials o),
  'review_items', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'raw_name', r.raw_name, 'namespace', r.namespace, 'reason', r.reason,
      'commission', (select c.slug from public.boxing_commissions c where c.id = r.commission_id), 'candidates', r.candidates, 'created_at', r.created_at)
    order by r.created_at, r.id), '[]'::jsonb) from public.boxing_official_review_queue r where r.status = 'pending'),
  'parses', (select coalesce(jsonb_agg(jsonb_build_object('observation_id', p.id, 'doc_key', p.external_key, 'source_key', p.source_key,
      'parser_version', p.parser_version, 'observed_at', p.observed_at, 'source_url', p.payload ->> 'url',
      'header_officials', p.payload -> 'document' -> 'officials',
      'promoters', (select coalesce(jsonb_agg(ev -> 'promoters'), '[]'::jsonb) from jsonb_array_elements(coalesce(p.payload -> 'events', '[]'::jsonb)) ev),
      'bouts', (select coalesce(jsonb_agg(jsonb_build_object('source_bout_id', b ->> 'source_bout_id', 'referee', b ->> 'referee',
                  'judges', (select coalesce(jsonb_agg(jsonb_build_object('slot', (j ->> 'slot')::int, 'name', j ->> 'name', 'source_name', j ->> 'source_name')), '[]'::jsonb)
                             from jsonb_array_elements(coalesce(b -> 'judges', '[]'::jsonb)) j))), '[]'::jsonb)
                from jsonb_array_elements(coalesce(p.payload -> 'bouts', '[]'::jsonb)) b))
    order by p.external_key, p.observed_at), '[]'::jsonb) from parses p)
);
