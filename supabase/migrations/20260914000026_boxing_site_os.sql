-- Boxing product operating system: additive site reads (no redefinitions of earlier site functions).
--
--   boxing_site_fighter_context(ref)  sourced biography (age from an identity-proven Wikidata DOB, nationality, height),
--                                     Wikidata/Wikipedia links, Hall of Fame inductions, promoter APPEARANCES
--                                     (cards listing a promoter; never an affiliation), previous-opponent count
--   boxing_site_bout_context(ref)     both corners' sourced tale of the tape, previous meetings, assigned officials
--                                     with their DNA samples, the event's listed promoters
--   boxing_site_hall_of_fame(...)     recognized institutions and their source-native induction records
--   boxing_site_history()             decade-first view of what is on record (verified cards, Hall classes)
--   boxing_site_wire(limit)           verified record feed: official results, scorecards, missed weight, card changes
--
-- Site payloads never carry dob, hometown, evidence, external ids or internal uuids (gateway SITE_FORBIDDEN_KEYS).

create or replace function public.boxing_site_sourced_bio(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  with f as (select public.boxing_canonical_fighter_id(p_fighter) id),
  qid as (select i.external_id, i.external_url from f join public.boxing_fighter_identities i on public.boxing_canonical_fighter_id(i.fighter_id) = f.id
          where i.namespace = 'wikidata.item' and i.verification_state = 'verified' limit 1),
  wiki as (select i.external_url, i.namespace from f join public.boxing_fighter_identities i on public.boxing_canonical_fighter_id(i.fighter_id) = f.id
           where i.namespace like 'wikipedia.%' and i.verification_state = 'verified' order by i.namespace limit 1),
  src as (select id from public.boxing_sources where source_key = 'wikidata'),
  claim as (select distinct on (c.attribute) c.attribute, c.value from f join public.boxing_fighter_attribute_claims c on c.fighter_id = f.id, src
            where c.source_id = src.id order by c.attribute, c.claimed_at desc)
  select case when not exists (select 1 from qid) then null else jsonb_build_object(
    'source', 'Wikidata',
    'wikidata_qid', (select external_id from qid),
    'wikidata_url', (select external_url from qid),
    'wikipedia_url', (select external_url from wiki),
    'age_years', (select extract(year from age(current_date, (c.value #>> '{}')::date))::int from claim c where c.attribute = 'dob'),
    'nationality', (select c.value from claim c where c.attribute = 'nationality'),
    'height_cm', (select (c.value #>> '{}')::numeric from claim c where c.attribute = 'height_cm')) end
$$;

create or replace function public.boxing_site_promoter_appearances(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  with ev as (
    select distinct e.id, e.event_date from public.boxing_site_participations() v join public.boxing_events e on e.id = v.event_id
    where v.fighter_id = public.boxing_canonical_fighter_id(p_fighter))
  select coalesce(jsonb_agg(jsonb_build_object('key', x.promoter_key, 'name', x.name, 'cards', x.n, 'first_date', x.first_date, 'last_date', x.last_date)
                            order by x.n desc, x.last_date desc), '[]'::jsonb)
  from (select sp.promoter_key, min(sp.name) name, count(distinct ev.id) n, min(ev.event_date) first_date, max(ev.event_date) last_date
        from ev join public.boxing_site_sheet_promoters() sp on sp.event_id = ev.id group by 1) x
$$;

create or replace function public.boxing_site_hall_for_fighter(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('institution', o.name, 'institution_slug', o.slug, 'year', h.induction_year, 'category', h.category_source_label)
                            order by h.induction_year), '[]'::jsonb)
  from public.boxing_persons p join public.boxing_hall_inductions h on h.person_id = p.id and h.supersedes_id is null
  join public.boxing_organizations o on o.id = h.institution_id
  where p.merged_into_id is null and public.boxing_canonical_fighter_id(p.fighter_id) = public.boxing_canonical_fighter_id(p_fighter)
$$;

create or replace function public.boxing_site_fighter_context(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select f.* from public.boxing_fighters f where public.boxing_site_ref_matches(f.public_id, p_ref)),
  f as (select public.boxing_canonical_fighter_id(id) id from hit where (select count(*) from hit) = 1)
  select jsonb_build_object(
    'public_id', (select x.public_id from public.boxing_fighters x where x.id = f.id),
    'sourced_bio', public.boxing_site_sourced_bio(f.id),
    'hall_of_fame', public.boxing_site_hall_for_fighter(f.id),
    'promoter_appearances', public.boxing_site_promoter_appearances(f.id),
    'distinct_opponents', (select count(distinct v.opponent_id) from public.boxing_site_participations() v where v.fighter_id = f.id),
    'title_bouts', (select count(distinct bt.bout_id) from public.boxing_site_participations() v join public.boxing_bout_titles bt on bt.bout_id = v.bout_id and bt.at_stake where v.fighter_id = f.id),
    'approved_videos', (select count(*) from public.boxing_video_links l join public.boxing_videos vd on vd.id = l.video_id and vd.link_status = 'published'
                        join public.boxing_video_channels c on c.channel_id = vd.channel_id and c.enabled where public.boxing_canonical_fighter_id(l.fighter_id) = f.id))
  from f
$$;

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
        where bo.bout_id = b.id and bo.assignment_state in ('assigned','worked')))
  from b
$$;

create or replace function public.boxing_site_hall_of_fame(p_category text default null, p_year int default null, p_limit int default 120, p_offset int default 0)
returns jsonb language sql stable set search_path = '' as $$
  with h as (
    select h.*, o.name institution, o.slug institution_slug, p.public_id person_public_id, p.display_name, p.fighter_id
    from public.boxing_hall_inductions h join public.boxing_organizations o on o.id = h.institution_id and o.organization_kind = 'hall_of_fame'
    join public.boxing_persons p on p.id = h.person_id and p.merged_into_id is null
    where h.supersedes_id is null),
  f as (select * from h where (p_category is null or category_source_label = p_category) and (p_year is null or induction_year = p_year))
  select jsonb_build_object(
    'institutions', (select coalesce(jsonb_agg(jsonb_build_object('slug', x.institution_slug, 'name', x.institution, 'inductions', x.n, 'first_year', x.fy, 'last_year', x.ly,
                        'website', (select website_url from public.boxing_organizations o where o.slug = x.institution_slug)) order by x.n desc), '[]'::jsonb)
                     from (select institution_slug, institution, count(*) n, min(induction_year) fy, max(induction_year) ly from h group by 1, 2) x),
    'categories', (select coalesce(jsonb_agg(jsonb_build_object('label', x.category_source_label, 'institution', x.institution, 'n', x.n) order by x.n desc), '[]'::jsonb)
                   from (select category_source_label, institution, count(*) n from h group by 1, 2) x),
    'years', (select coalesce(jsonb_agg(jsonb_build_object('year', x.induction_year, 'n', x.n) order by x.induction_year desc), '[]'::jsonb)
              from (select induction_year, count(*) n from h group by 1) x),
    'category', p_category, 'year', p_year,
    'total', (select count(*) from f),
    'linked_to_fighters', (select count(*) from h where fighter_id is not null),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('person_public_id', r.person_public_id, 'name', r.display_name, 'institution', r.institution,
                'year', r.induction_year, 'category', r.category_source_label,
                'fighter_public_id', (select x.public_id from public.boxing_fighters x where x.id = public.boxing_canonical_fighter_id(r.fighter_id)))
              order by r.induction_year desc, r.display_name), '[]'::jsonb)
             from (select * from f order by induction_year desc, display_name limit greatest(1, least(coalesce(p_limit, 120), 600)) offset greatest(0, coalesce(p_offset, 0))) r))
$$;

create or replace function public.boxing_site_history()
returns jsonb language sql stable set search_path = '' as $$
  with ev as (select e.* from public.boxing_events e where e.status <> 'cancelled' and e.event_date is not null),
  bouts as (select b.id, e.event_date from public.boxing_bouts b join ev e on e.id = b.event_id where b.status is distinct from 'cancelled'),
  hall as (select h.* from public.boxing_hall_inductions h where h.supersedes_id is null),
  decades as (
    select d from (select (extract(year from event_date)::int / 10) * 10 d from ev union select (induction_year / 10) * 10 from hall) x)
  select jsonb_build_object(
    'record_span', jsonb_build_object('first_date', (select min(event_date) from ev), 'last_date', (select max(event_date) from ev)),
    'decades', (select coalesce(jsonb_agg(jsonb_build_object('decade', d.d,
        'verified_events', (select count(*) from ev where (extract(year from ev.event_date)::int / 10) * 10 = d.d),
        'verified_bouts', (select count(*) from bouts where (extract(year from bouts.event_date)::int / 10) * 10 = d.d),
        'hall_inductions', (select count(*) from hall where (hall.induction_year / 10) * 10 = d.d),
        'title_reigns_started', (select count(*) from public.boxing_title_reigns tr where tr.started_on is not null and (extract(year from tr.started_on)::int / 10) * 10 = d.d))
      order by d.d desc), '[]'::jsonb) from decades d),
    'hall_classes', (select coalesce(jsonb_agg(jsonb_build_object('year', x.induction_year, 'n', x.n) order by x.induction_year desc), '[]'::jsonb)
                     from (select induction_year, count(*) n from hall group by 1) x),
    'hall_categories', (select coalesce(jsonb_agg(jsonb_build_object('label', x.category_source_label, 'n', x.n) order by x.n desc), '[]'::jsonb)
                        from (select category_source_label, count(*) n from hall group by 1) x),
    'title_reigns', (select count(*) from public.boxing_title_reigns),
    'venues_on_record', (select count(distinct venue_id) from ev where venue_id is not null))
$$;

create or replace function public.boxing_site_wire(p_limit int default 40)
returns jsonb language sql stable set search_path = '' as $$
  with items as (
    select 'result_official' kind, r.captured_at at, b.id bout_id, e.id event_id, e.event_date,
           jsonb_build_object('method', r.method, 'decision_type', r.decision_type, 'round', r.round, 'revision', r.revision) detail
    from public.boxing_bout_results_current r join public.boxing_bouts b on b.id = r.bout_id join public.boxing_events e on e.id = b.event_id
    union all
    select 'scorecards_posted', max(s.captured_at), s.bout_id, b.event_id, e.event_date, jsonb_build_object('cards', count(*))
    from public.boxing_scorecards_current s join public.boxing_bouts b on b.id = s.bout_id join public.boxing_events e on e.id = b.event_id group by s.bout_id, b.event_id, e.event_date
    union all
    select 'missed_weight', w.captured_at, w.bout_id, b.event_id, e.event_date,
           jsonb_build_object('fighter_public_id', f.public_id, 'fighter', f.display_name, 'weight_lb', w.official_weight_lb, 'contracted_lb', w.contracted_weight_lb)
    from public.boxing_weigh_ins w join public.boxing_bouts b on b.id = w.bout_id join public.boxing_events e on e.id = b.event_id
    join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(w.fighter_id)
    where w.miss_lb > 0 and not exists (select 1 from public.boxing_weigh_ins n where n.supersedes_id = w.id)
    union all
    select c.change_type, c.detected_at, c.bout_id, c.event_id, e.event_date, jsonb_build_object('change', c.change_type)
    from public.boxing_card_changes c join public.boxing_events e on e.id = c.event_id
    where c.change_type in ('bout_added','bout_cancelled','opponent_replaced','event_postponed','event_cancelled','event_date_changed') and e.event_date >= current_date - 7)
  select coalesce(jsonb_agg(jsonb_build_object('kind', i.kind, 'at', i.at, 'event_date', i.event_date,
      'event', (select jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date) from public.boxing_events e where e.id = i.event_id),
      'bout', case when i.bout_id is not null then public.boxing_site_bout_compact(i.bout_id) end,
      'detail', i.detail) order by i.event_date desc nulls last, i.at desc), '[]'::jsonb)
  from (select * from items order by event_date desc nulls last, at desc limit greatest(1, least(coalesce(p_limit, 40), 120))) i
$$;

select public.boxing_lockdown();
