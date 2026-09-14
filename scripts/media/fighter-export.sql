-- READ ONLY. Canonical fighters with the verified bouts that identity evidence is checked against,
-- their current portrait state and acquisition-priority signals. One jsonb value.
with f as (select * from public.boxing_fighters where merged_into_id is null),
part as (
  select public.boxing_canonical_fighter_id(p.fighter_id) fighter_id, p.bout_id, p.side, b.scheduled_rounds, e.event_date, e.name event_name, e.status event_status,
         v.name venue, v.city, v.region, c.slug commission,
         (select jsonb_agg(of.display_name) from public.boxing_bout_participants op join public.boxing_fighters of on of.id = public.boxing_canonical_fighter_id(op.fighter_id)
          where op.bout_id = p.bout_id and op.side <> p.side and op.participant_status in ('scheduled','confirmed')) opponents,
         (select r.method from public.boxing_bout_results_current r where r.bout_id = p.bout_id) method,
         exists (select 1 from public.boxing_bout_titles t where t.bout_id = p.bout_id and t.at_stake) title_bout,
         (select count(*) from public.boxing_bouts b2 where b2.event_id = b.event_id and coalesce(b2.scheduled_rounds, 0) > coalesce(b.scheduled_rounds, 0)) longer_bouts_on_card
  from public.boxing_bout_participants p
  join public.boxing_bouts b on b.id = p.bout_id and b.status is distinct from 'cancelled'
  join public.boxing_events e on e.id = b.event_id
  left join public.boxing_venues v on v.id = e.venue_id
  left join public.boxing_commissions c on c.id = e.commission_id
  where p.participant_status in ('scheduled','confirmed'))
select jsonb_build_object('generated_at', now(), 'fighters', (select coalesce(jsonb_agg(jsonb_build_object(
  'public_id', f.public_id, 'name', f.display_name, 'nickname', f.nickname, 'hometown', f.hometown,
  'aliases', (select coalesce(jsonb_agg(distinct a.alias), '[]'::jsonb) from public.boxing_fighter_aliases a where public.boxing_canonical_fighter_id(a.fighter_id) = f.id),
  'portrait_state', (select m.review_state from public.boxing_fighter_media m where m.fighter_id = f.id order by (m.review_state = 'approved') desc limit 1),
  'bouts', (select coalesce(jsonb_agg(jsonb_build_object('date', x.event_date, 'event', x.event_name, 'venue', x.venue, 'city', x.city, 'region', x.region, 'commission', x.commission,
              'opponents', x.opponents, 'rounds', x.scheduled_rounds, 'method', x.method, 'title_bout', x.title_bout, 'main_event', x.longer_bouts_on_card = 0) order by x.event_date desc), '[]'::jsonb)
            from part x where x.fighter_id = f.id)) order by f.display_name), '[]'::jsonb) from f))
