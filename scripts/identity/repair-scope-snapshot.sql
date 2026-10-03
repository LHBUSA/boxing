-- Scope snapshot for a targeted repair (read-only): global counts + fingerprints of everything the repair must not touch.
-- Compare before/after: only the rows of the repaired event may differ.
select jsonb_build_object(
  'fighters', (select count(*) from public.boxing_fighters),
  'fighters_void', (select count(*) from public.boxing_fighters where identity_state = 'void'),
  'bouts', (select count(*) from public.boxing_bouts),
  'bout_results', (select count(*) from public.boxing_bout_results),
  'body_links', (select count(*) from public.boxing_org_identity_candidate_decisions),
  'merges', (select count(*) from public.boxing_fighter_merge_decisions),
  'seed_decisions', (select count(*) from public.boxing_identity_seed_decisions),
  -- every fighter outside the repaired event: id, canonical id, identity state
  'fighters_outside_event_fp', (select md5(string_agg(f.id::text || ':' || coalesce(public.boxing_canonical_fighter_id(f.id)::text, '-') || ':' || f.identity_state, ',' order by f.id))
     from public.boxing_fighters f where not exists (select 1 from public.boxing_bout_participants p join public.boxing_bouts b on b.id = p.bout_id join public.boxing_events e on e.id = b.event_id
       where p.fighter_id = f.id and e.event_date = '2024-12-11' and e.name ilike '%probox%')),
  -- every bout outside the repaired event: id, status, participants
  'bouts_outside_event_fp', (select md5(string_agg(b.id::text || ':' || b.status || ':' || coalesce((select string_agg(p.fighter_id::text || p.participant_status, '|' order by p.side) from public.boxing_bout_participants p where p.bout_id = b.id), ''), ',' order by b.id))
     from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id where not (e.event_date = '2024-12-11' and e.name ilike '%probox%')),
  'results_outside_event_fp', (select md5(string_agg(r.id::text, ',' order by r.id)) from public.boxing_bout_results r join public.boxing_bouts b on b.id = r.bout_id
     join public.boxing_events e on e.id = b.event_id where not (e.event_date = '2024-12-11' and e.name ilike '%probox%')),
  'body_links_fp', (select md5(string_agg(d.candidate_id::text || ':' || d.fighter_id::text, ',' order by d.candidate_id)) from public.boxing_org_identity_candidate_decisions d),
  'event_bouts', (select jsonb_agg(jsonb_build_object('bout_id', b.id, 'order', b.bout_order, 'status', b.status,
      'corners', (select jsonb_agg(jsonb_build_object('side', p.side, 'fighter_id', p.fighter_id, 'name', f.display_name, 'state', f.identity_state) order by p.side)
                  from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id where p.bout_id = b.id),
      'results', (select count(*) from public.boxing_bout_results r where r.bout_id = b.id)) order by b.bout_order, b.id)
    from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id where e.event_date = '2024-12-11' and e.name ilike '%probox%')
) snapshot;
