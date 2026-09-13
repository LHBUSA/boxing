-- PropBetEdge Boxing — site read contract fixes (frontend Phase 1 QA).
--
-- 1. Verified-record stoppage counts use KO/TKO/RTD only, matching the Fight DNA
--    definitions (results.stoppage_win_share); disqualifications stay separate
--    (dq_wins, new dq_losses).
-- 2. Home result lists carry red/blue corners from the official sheet, like the
--    event page (boxing_site_event_sheet).
-- Read-only; rerunnable.

begin;

create or replace function public.boxing_site_event_sheet(p_event uuid)
returns jsonb language sql stable set search_path = '' as $$
  select se.bouts from public.boxing_event_identities ei
  join public.boxing_site_sheet_events() se on se.source_event_id = ei.external_id and se.source_id = ei.source_id
  where ei.event_id = p_event and ei.verification_state <> 'rejected'
  limit 1
$$;

create or replace function public.boxing_site_record(p_fighter uuid, p_before_date date default null, p_before_order int default null)
returns jsonb language sql stable set search_path = '' as $$
  with x as (
    select * from public.boxing_site_participations() v
    where v.fighter_id = p_fighter and v.event_complete
      and (p_before_date is null or v.event_date < p_before_date or (v.event_date = p_before_date and p_before_order is not null and v.bout_order < p_before_order)))
  select jsonb_build_object(
    'bouts', count(*),
    'wins', count(*) filter (where result_code = 'W'),
    'losses', count(*) filter (where result_code = 'L'),
    'draws', count(*) filter (where result_code = 'D'),
    'no_contests', count(*) filter (where result_code in ('NC','ND')),
    'pending', count(*) filter (where result_code is null),
    'stoppage_wins', count(*) filter (where result_code = 'W' and method in ('KO','TKO','RTD')),
    'ko_tko_wins', count(*) filter (where result_code = 'W' and method in ('KO','TKO')),
    'rtd_wins', count(*) filter (where result_code = 'W' and method = 'RTD'),
    'dq_wins', count(*) filter (where result_code = 'W' and method = 'DQ'),
    'decision_wins', count(*) filter (where result_code = 'W' and method in ('DECISION','TECHNICAL_DECISION')),
    'stoppage_losses', count(*) filter (where result_code = 'L' and method in ('KO','TKO','RTD')),
    'dq_losses', count(*) filter (where result_code = 'L' and method = 'DQ'),
    'decision_losses', count(*) filter (where result_code = 'L' and method in ('DECISION','TECHNICAL_DECISION')),
    'distance_bouts', count(*) filter (where method = 'DECISION'),
    'max_scheduled_rounds', max(scheduled_rounds),
    'first_date', min(event_date), 'last_date', max(event_date))
  from x
$$;

create or replace function public.boxing_site_home(p_today date default current_date)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'today', p_today,
    'upcoming', (select coalesce(jsonb_agg(public.boxing_site_event_summary(e.id, true) order by e.event_date, e.name), '[]'::jsonb) from (
        select * from public.boxing_events where status is distinct from 'cancelled' and status is distinct from 'complete' and event_date >= p_today - 1
        order by event_date, name limit 24) e),
    'recent', (select coalesce(jsonb_agg(public.boxing_site_event_summary(e.id, true) order by e.event_date desc, e.name), '[]'::jsonb) from (
        select * from public.boxing_events where status = 'complete' and event_date <= p_today
        order by event_date desc, name limit 10) e),
    'latest_results', (select coalesce(jsonb_agg(x.j order by x.event_date desc, x.bout_order desc), '[]'::jsonb) from (
        select public.boxing_site_bout_compact(b.id, public.boxing_site_event_sheet(e.id)) || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date)) j,
               e.event_date, b.bout_order
        from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
        join public.boxing_bout_results_current r on r.bout_id = b.id
        where e.event_date <= p_today order by e.event_date desc, b.scheduled_rounds desc nulls last, b.bout_order desc limit 8) x),
    'scorecard_watch', (select coalesce(jsonb_agg(x.j order by x.event_date desc), '[]'::jsonb) from (
        select public.boxing_site_bout_compact(b.id, public.boxing_site_event_sheet(e.id)) || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date)) j, e.event_date
        from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
        join public.boxing_bout_results_current r on r.bout_id = b.id and r.decision_type in ('split', 'majority')
        where (select count(*) from public.boxing_scorecards_current s where s.bout_id = b.id and s.fighter_a_total is not null) >= 3
        order by e.event_date desc, b.scheduled_rounds desc nulls last limit 3) x),
    'dna_feature', (select jsonb_build_object('fighter', public.boxing_site_fighter_head(t.fighter_id), 'record', public.boxing_site_record(t.fighter_id),
                      'dna', public.boxing_site_dna(t.fighter_id), 'available_metrics', t.n)
                    from (select s.fighter_id, count(distinct s.metric_key) filter (where s.status = 'available') n
                          from (select distinct on (fighter_id, metric_key) * from public.boxing_fighter_metric_snapshots order by fighter_id, metric_key, as_of desc, created_at desc) s
                          join public.boxing_fighters f on f.id = s.fighter_id and f.merged_into_id is null
                          group by s.fighter_id order by n desc, s.fighter_id limit 1) t),
    'coverage', public.boxing_site_coverage(p_today))
$$;

select public.boxing_lockdown();

commit;
