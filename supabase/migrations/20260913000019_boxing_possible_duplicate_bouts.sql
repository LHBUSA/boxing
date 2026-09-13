-- PropBetEdge Boxing — possible duplicate canonical bouts (issue #10 protection).
--
-- Two canonical bouts with the same two active boxers within one day are a
-- possible duplicate UNLESS they are a legitimate repeat pairing on the same
-- official card: same event row, and either distinct source bout ids with
-- different repeat indices ("<pair>" vs "<pair>|2") or different sheet orders.
-- Mirrors shared/identity/bout-history.mjs classifyCandidateBouts. Read-only;
-- used by the staging verifier and review tooling. Rerunnable.

begin;

create or replace function public.boxing_possible_duplicate_bouts(p_limit int default 100)
returns jsonb language sql stable set search_path = '' as $$
  with active as (
    select b.id, b.event_id, e.event_date, b.bout_order, array_agg(p.fighter_id order by p.fighter_id) as pair
    from public.boxing_bouts b
    join public.boxing_events e on e.id = b.event_id
    join public.boxing_bout_participants p on p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')
    group by b.id, b.event_id, e.event_date, b.bout_order
    having count(*) = 2),
  ids as (
    select bi.bout_id, array_agg(bi.namespace || ':' || bi.external_id) as ids,
           max(coalesce((substring(bi.external_id from '\|([0-9]+)$'))::int, 1)) as repeat_index
    from public.boxing_bout_identities bi
    where bi.verification_state <> 'rejected' and bi.namespace like '%.bout'
    group by bi.bout_id)
  select coalesce(jsonb_agg(to_jsonb(d) order by d.date_a, d.bout_a), '[]'::jsonb)
  from (
    select x.id as bout_a, y.id as bout_b, x.event_id as event_a, y.event_id as event_b, x.event_date as date_a, y.event_date as date_b,
           x.bout_order as order_a, y.bout_order as order_b, ix.ids as source_ids_a, iy.ids as source_ids_b,
           case when x.event_id <> y.event_id then 'same_pair_different_event_rows_within_a_day'
                else 'same_pair_same_event_without_distinct_repeat_identity' end as reason
    from active x
    join active y on y.pair = x.pair and x.id < y.id and abs(x.event_date - y.event_date) <= 1
    left join ids ix on ix.bout_id = x.id
    left join ids iy on iy.bout_id = y.id
    where not (
      x.event_id = y.event_id and (
        (ix.ids is not null and iy.ids is not null and not (ix.ids && iy.ids) and ix.repeat_index <> iy.repeat_index)
        or (x.bout_order is not null and y.bout_order is not null and x.bout_order <> y.bout_order)))
    order by x.event_date, x.id
    limit greatest(1, least(coalesce(p_limit, 100), 1000))) d
$$;

select public.boxing_lockdown();

commit;
