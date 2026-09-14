-- PropBetEdge Boxing — site bout context: judges' totals published without judge attribution.
--
-- Missouri Office of Athletics sheets print three totals per decision but do not say which judge scored which.
-- They are never written as judge scorecards (adapter mo-athletics@1.0.0). This exposes them read-only on the bout
-- context, in the sheet's order, with attribution 'not_stated_on_sheet', so a decision page can show what the
-- commission published instead of "not captured". Additive: same function signature, one new key. Rerunnable.

begin;

create or replace function public.boxing_site_bout_context(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select b.* from public.boxing_bouts b where public.boxing_site_ref_matches(b.public_id, p_ref)),
  b as (select * from hit where (select count(*) from hit) = 1),
  corners as (select p.side, public.boxing_canonical_fighter_id(p.fighter_id) fighter_id from b
              join public.boxing_bout_participants p on p.bout_id = b.id and p.participant_status in ('scheduled','confirmed'))
  select jsonb_build_object(
    'public_id', b.public_id,
    'corners', (select jsonb_object_agg(c.side, jsonb_build_object(
        'sourced_bio', public.boxing_site_sourced_bio(c.fighter_id),
        'hall_of_fame', public.boxing_site_hall_for_fighter(c.fighter_id),
        'promoter_appearances', public.boxing_site_promoter_appearances(c.fighter_id))) from corners c),
    'previous_meetings', (select coalesce(jsonb_agg(jsonb_build_object('bout_public_id', bb.public_id, 'date', v.event_date, 'result_for_a', v.result_code,
                            'method', v.method, 'decision_type', v.decision_type, 'round', v.result_round,
                            'event', (select jsonb_build_object('public_id', e.public_id, 'name', e.name) from public.boxing_events e where e.id = v.event_id))
                            order by v.event_date desc), '[]'::jsonb)
        from public.boxing_site_participations() v join public.boxing_bouts bb on bb.id = v.bout_id
        where v.bout_id <> b.id and v.fighter_id = (select fighter_id from corners where side = 'a') and v.opponent_id = (select fighter_id from corners where side = 'b')),
    'officials', (select coalesce(jsonb_agg(jsonb_build_object('role', bo.role, 'slot', bo.slot, 'public_id', o.public_id, 'name', o.display_name,
                    'assignments', (select count(*) from public.boxing_bout_officials x where public.boxing_canonical_official_id(x.official_id) = o.id and x.role = bo.role),
                    'dna', public.boxing_site_official_dna(o.id)) order by bo.role desc, bo.slot), '[]'::jsonb)
        from public.boxing_bout_officials bo join public.boxing_officials o on o.id = public.boxing_canonical_official_id(bo.official_id)
        where bo.bout_id = b.id and bo.assignment_state in ('assigned','worked')),
    -- judges' totals the commission printed without tying them to judge names (Missouri sheets): the latest stored
    -- commission observation of this bout, in the sheet's order; never attributed to an official
    'published_totals', (select case when jsonb_typeof(o.payload -> 'bout' -> 'score_totals_unattributed') = 'array'
                              then jsonb_build_object('totals', o.payload -> 'bout' -> 'score_totals_unattributed', 'attribution', 'not_stated_on_sheet',
                                                      'source', s.source_name, 'source_url', o.source_url) end
        from public.boxing_bout_identities i
        join public.boxing_source_observations o on o.entity_type = 'commission_bout_result'
             and o.external_key = regexp_replace(i.namespace, '\.bout$', '') || ':' || i.external_id
        join public.boxing_sources s on s.id = o.source_id
        where i.bout_id = b.id and i.namespace like '%.bout'
        order by o.observed_at desc limit 1))
  from b
$$;

commit;
