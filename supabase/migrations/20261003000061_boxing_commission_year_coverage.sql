-- Commission year coverage (read-only; owner decision 2026-10-03 after the Florida 2024-12-11 fused-corner repair).
--
-- A bout row marked `replaced` stays stored, queryable and visible in the event truth ledger, but it is not a live
-- professional bout: counting it would put 80 rows where the sheet has 79 real fights. Coverage therefore reports:
--   live_bouts            canonical bout rows of the source and year whose status is not `replaced`
--   replaced_bouts        historical rows superseded by a correction (kept as evidence)
--   total_bout_rows       every stored row (live + replaced)
--   held_bouts            bouts the source printed that were never created because a corner is held in identity
--                         review (latest appearance decision `review` and no bout row carries that source bout id)
-- per event, so a card with held bouts reads as incomplete rather than smaller.

create or replace function public.boxing_commission_year_coverage(p_source_key text, p_year int)
returns jsonb language sql stable set search_path = '' as $$
  with src as (select id from public.boxing_sources where source_key = p_source_key),
  ev as (
    select e.id, e.event_date, e.name from public.boxing_events e
    where e.source_id = (select id from src) and extract(year from e.event_date) = p_year
  ),
  bt as (select b.id, b.event_id, b.status from public.boxing_bouts b join ev on ev.id = b.event_id),
  -- source bout ids already carried by a bout row of this source
  have as (select bi.external_id from public.boxing_bout_identities bi join bt on bt.id = bi.bout_id),
  appearances as (
    select distinct on (d.appearance_key) d.bout_external_id, d.decision
    from public.boxing_identity_appearance_decisions d
    where d.source_id = (select id from src) and d.bout_external_id like p_year::text || '-%'
    order by d.appearance_key, d.seq desc
  ),
  held as (
    select distinct a.bout_external_id from appearances a
    where a.decision = 'review' and a.bout_external_id not in (select external_id from have)
  )
  select jsonb_build_object(
    'source_key', p_source_key, 'year', p_year,
    'events', (select count(*) from ev),
    'live_bouts', (select count(*) from bt where status <> 'replaced'),
    'replaced_bouts', (select count(*) from bt where status = 'replaced'),
    'total_bout_rows', (select count(*) from bt),
    'held_bouts', (select count(*) from held),
    'fighters_linked_live', (select count(distinct public.boxing_canonical_fighter_id(p.fighter_id)) from public.boxing_bout_participants p
       join bt on bt.id = p.bout_id where bt.status <> 'replaced'),
    'events_with_held_bouts', (select coalesce(jsonb_agg(jsonb_build_object('event_date', x.d, 'held', x.n) order by x.d), '[]'::jsonb)
       from (select substr(h.bout_external_id, 1, 10) d, count(*) n from held h group by 1) x))
$$;

comment on function public.boxing_commission_year_coverage(text, int) is
  'Year coverage per commission source: live bouts exclude replaced rows; replaced rows stay stored and visible; held bouts are printed bouts awaiting identity review.';

select public.boxing_lockdown();
