-- READ ONLY. Events on verified record with their bouts and corner names: the resolution context for the video
-- dry run (scripts/videos/feed-dryrun.mjs). One jsonb value.
select jsonb_build_object('generated_at', now(), 'events', (select coalesce(jsonb_agg(jsonb_build_object(
  'id', e.public_id, 'name', e.name, 'date', e.event_date, 'status', e.status, 'venue_name', v.name, 'city', v.city,
  'bouts', (select coalesce(jsonb_agg(jsonb_build_object('id', b.public_id,
      'fighters', (select coalesce(jsonb_agg(jsonb_build_object('id', f.public_id, 'name', f.display_name) order by p.side), '[]'::jsonb)
                   from public.boxing_bout_participants p join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(p.fighter_id)
                   where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')))), '[]'::jsonb)
    from public.boxing_bouts b where b.event_id = e.id and b.status is distinct from 'cancelled')) order by e.event_date), '[]'::jsonb)
  from public.boxing_events e left join public.boxing_venues v on v.id = e.venue_id where e.status <> 'cancelled'))
