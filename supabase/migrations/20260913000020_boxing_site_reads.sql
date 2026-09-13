-- PropBetEdge Boxing — site read contract (frontend Phase 1).
--
-- Fixed-field, read-only projections for the consumer site, served ONLY
-- through boxing-gateway (/internal/v1/site/*). The browser never reads
-- Supabase. Every function builds its JSON field by field; nothing returns a
-- whole row, so new columns never leak.
--
-- Never included: DOB, stated hometowns, federal/licence ids, medical or
-- suspension detail, identity evidence, reviewer names, review ids, provider
-- (sportsbook) ids or prices. Market data appears only as a matched/unmatched
-- flag and an aggregate count; prices stay on the one-bout odds-summary route.
--
-- "Verified record" = results of canonical bouts on PropBetEdge record
-- (official commission sheets). It is NOT a career record and is never
-- labelled as one.
--
-- Sheet facts (promoters listed on the official sheet, red/blue corner, and
-- how many sheet bouts still await identity verification) come from the latest
-- stored official results document per commission document.

begin;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Public refs in URLs are the hex suffix of public_id (12..32 chars).
create or replace function public.boxing_site_ref_matches(p_public_id text, p_ref text)
returns boolean language sql immutable set search_path = '' as $$
  select p_ref ~ '^[0-9a-f]{12,32}$' and right(p_public_id, 32) like p_ref || '%'
$$;

-- Latest official results document per (source, document), expanded per event.
create or replace function public.boxing_site_sheet_events()
returns table (source_id uuid, source_event_id text, promoters jsonb, sheet_bouts int, source_url text, bouts jsonb)
language sql stable set search_path = '' as $$
  with docs as (
    select * from (select distinct on (o.source_id, o.external_key) o.* from public.boxing_source_observations o
      where o.entity_type in ('commission_results_document', 'commission_document_rejected')
      order by o.source_id, o.external_key, o.observed_at desc, o.id) l
    where l.entity_type = 'commission_results_document')
  select d.source_id, ev ->> 'source_event_id',
         coalesce(ev -> 'promoters', '[]'::jsonb),
         (select count(*)::int from jsonb_array_elements(d.payload -> 'bouts') b
            where b ->> 'source_event_id' = ev ->> 'source_event_id' and coalesce((b ->> 'professional')::boolean, true)),
         coalesce(ev ->> 'source_url', d.source_url),
         (select coalesce(jsonb_agg(jsonb_build_object('order', (b ->> 'bout_order')::int, 'a_corner', b -> 'fighter_a' ->> 'corner', 'b_corner', b -> 'fighter_b' ->> 'corner')), '[]'::jsonb)
            from jsonb_array_elements(d.payload -> 'bouts') b where b ->> 'source_event_id' = ev ->> 'source_event_id')
  from docs d, jsonb_array_elements(d.payload -> 'events') ev
$$;

-- Result of a bout from one fighter's perspective.
create or replace function public.boxing_site_result_code(p_outcome text, p_winner uuid, p_fighter uuid)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_outcome is null then null
    when p_outcome = 'win' and p_winner = p_fighter then 'W'
    when p_outcome = 'win' and p_winner is not null then 'L'
    when p_outcome = 'draw' then 'D'
    when p_outcome = 'no_contest' then 'NC'
    when p_outcome = 'no_decision' then 'ND'
    else null end
$$;

-- Canonical participation rows: one per (bout, side), canonical fighter ids,
-- current result, rounds completed where the sheet makes it knowable.
create or replace function public.boxing_site_participations()
returns table (bout_id uuid, event_id uuid, event_date date, bout_order int, side text, fighter_id uuid, opponent_id uuid,
               result_code text, method text, decision_type text, result_round int, time_sec int, scheduled_rounds int,
               rounds_completed int, event_complete boolean)
language sql stable set search_path = '' as $$
  select b.id, e.id, e.event_date, b.bout_order, p.side,
         public.boxing_canonical_fighter_id(p.fighter_id),
         public.boxing_canonical_fighter_id(o.fighter_id),
         public.boxing_site_result_code(r.outcome::text, public.boxing_canonical_fighter_id(r.winner_id), public.boxing_canonical_fighter_id(p.fighter_id)),
         r.method::text, r.decision_type::text, r.round, r.time_sec, b.scheduled_rounds,
         case when r.method in ('KO','TKO','RTD','DQ','TECHNICAL_DECISION') then r.round
              when r.method = 'DECISION' then b.scheduled_rounds end,
         (e.status = 'complete' or r.bout_id is not null)
  from public.boxing_bouts b
  join public.boxing_events e on e.id = b.event_id
  join public.boxing_bout_participants p on p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')
  join public.boxing_bout_participants o on o.bout_id = b.id and o.participant_status in ('scheduled','confirmed') and o.side <> p.side
  left join public.boxing_bout_results_current r on r.bout_id = b.id
  where b.status is distinct from 'cancelled' and e.status is distinct from 'cancelled'
$$;

-- Record summary over a set of participation rows (jsonb array input keeps it composable).
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
    'stoppage_wins', count(*) filter (where result_code = 'W' and method in ('KO','TKO','RTD','DQ')),
    'ko_tko_wins', count(*) filter (where result_code = 'W' and method in ('KO','TKO')),
    'rtd_wins', count(*) filter (where result_code = 'W' and method = 'RTD'),
    'dq_wins', count(*) filter (where result_code = 'W' and method = 'DQ'),
    'decision_wins', count(*) filter (where result_code = 'W' and method in ('DECISION','TECHNICAL_DECISION')),
    'stoppage_losses', count(*) filter (where result_code = 'L' and method in ('KO','TKO','RTD','DQ')),
    'decision_losses', count(*) filter (where result_code = 'L' and method in ('DECISION','TECHNICAL_DECISION')),
    'distance_bouts', count(*) filter (where method = 'DECISION'),
    'max_scheduled_rounds', max(scheduled_rounds),
    'first_date', min(event_date), 'last_date', max(event_date))
  from x
$$;

create or replace function public.boxing_site_weight(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('class_key', wc.class_key, 'class_name', wc.name, 'contracted_lb', b.contracted_weight_lb, 'catchweight', b.is_catchweight)
  from public.boxing_bouts b left join public.boxing_weight_classes wc on wc.id = b.weight_class_id where b.id = p_bout
$$;

-- Current official weigh-in weight for a canonical fighter in a bout.
create or replace function public.boxing_site_weigh_in(p_bout uuid, p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('weight_lb', w.official_weight_lb, 'kind', w.weigh_in_kind, 'status', w.status)
  from public.boxing_weigh_ins w
  where w.bout_id = p_bout and public.boxing_canonical_fighter_id(w.fighter_id) = p_fighter
    and w.verification_state <> 'rejected'
    and not exists (select 1 from public.boxing_weigh_ins x where x.supersedes_id = w.id)
  order by (w.weigh_in_kind = 'official') desc, w.attempt_no desc
  limit 1
$$;

-- Compact bout: corners, result from the sheet's perspective, counts.
create or replace function public.boxing_site_bout_compact(p_bout uuid, p_sheet jsonb default null)
returns jsonb language sql stable set search_path = '' as $$
  with b as (select * from public.boxing_bouts where id = p_bout),
  corners as (
    select p.side, f.public_id, f.display_name, f.id fighter_id
    from b join public.boxing_bout_participants p on p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')
    join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(p.fighter_id)),
  sheet as (select s from jsonb_array_elements(coalesce(p_sheet, '[]'::jsonb)) s, b where (s ->> 'order')::int = b.bout_order limit 1),
  r as (select * from public.boxing_bout_results_current where bout_id = p_bout)
  select jsonb_build_object(
    'public_id', b.public_id, 'order', b.bout_order, 'status', b.status, 'scheduled_rounds', b.scheduled_rounds,
    'weight', public.boxing_site_weight(b.id),
    'a', (select jsonb_build_object('public_id', c.public_id, 'name', c.display_name, 'corner', (select s ->> 'a_corner' from sheet),
                                    'weigh_in', public.boxing_site_weigh_in(b.id, c.fighter_id)) from corners c where c.side = 'a'),
    'b', (select jsonb_build_object('public_id', c.public_id, 'name', c.display_name, 'corner', (select s ->> 'b_corner' from sheet),
                                    'weigh_in', public.boxing_site_weigh_in(b.id, c.fighter_id)) from corners c where c.side = 'b'),
    'result', (select jsonb_build_object('outcome', r.outcome,
                 'winner_side', (select c.side from corners c where c.fighter_id = public.boxing_canonical_fighter_id(r.winner_id)),
                 'method', r.method, 'decision_type', r.decision_type, 'round', r.round, 'time_sec', r.time_sec,
                 'revision', r.revision, 'state', r.result_state) from r),
    'scorecards', (select coalesce(jsonb_agg(jsonb_build_object('slot', s.slot, 'judge', o.display_name,
                     'a_total', case when public.boxing_canonical_fighter_id(s.fighter_a_id) = (select fighter_id from corners where side = 'a') then s.fighter_a_total else s.fighter_b_total end,
                     'b_total', case when public.boxing_canonical_fighter_id(s.fighter_a_id) = (select fighter_id from corners where side = 'a') then s.fighter_b_total else s.fighter_a_total end,
                     'state', s.card_state, 'revision', s.revision) order by s.slot nulls last, o.display_name), '[]'::jsonb)
                   from public.boxing_scorecards_current s join public.boxing_officials o on o.id = public.boxing_canonical_official_id(s.judge_id)
                   where s.bout_id = b.id),
    'referee', (select o.display_name from public.boxing_bout_officials bo join public.boxing_officials o on o.id = public.boxing_canonical_official_id(bo.official_id)
                where bo.bout_id = b.id and bo.role = 'referee' limit 1),
    'titles', (select coalesce(jsonb_agg(jsonb_build_object('organization', org.short_name, 'organization_slug', org.slug, 'tier', t.tier,
                 'label', coalesce(t.source_native_label, t.name), 'status', bt.status) order by org.slug, t.tier), '[]'::jsonb)
               from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join public.boxing_organizations org on org.id = t.organization_id
               where bt.bout_id = b.id),
    'market_matched', exists (select 1 from public.boxing_bout_identities bi where bi.bout_id = b.id and bi.namespace = 'the_odds_api.event' and bi.verification_state = 'verified'))
  from b
$$;

-- Event summary (+ optional headline = longest scheduled bout, later on the sheet breaking ties).
create or replace function public.boxing_site_event_summary(p_event uuid, p_with_headline boolean default true)
returns jsonb language sql stable set search_path = '' as $$
  with e as (select * from public.boxing_events where id = p_event),
  sheet as (
    select se.* from e join public.boxing_event_identities ei on ei.event_id = e.id and ei.verification_state <> 'rejected'
    join public.boxing_site_sheet_events() se on se.source_event_id = ei.external_id and se.source_id = ei.source_id
    limit 1),
  bouts as (select b.* from e join public.boxing_bouts b on b.event_id = e.id where b.status is distinct from 'cancelled')
  select jsonb_build_object(
    'public_id', e.public_id, 'name', e.name, 'date', e.event_date, 'start_at', e.start_at, 'status', e.status,
    'venue', (select jsonb_build_object('name', v.name, 'city', v.city, 'region', v.region, 'country_code', v.country_code) from public.boxing_venues v where v.id = e.venue_id),
    'commission', (select jsonb_build_object('slug', c.slug, 'name', c.name, 'jurisdiction', c.jurisdiction, 'country_code', c.country_code) from public.boxing_commissions c where c.id = e.commission_id),
    'promoters', coalesce((select promoters from sheet), '[]'::jsonb),
    'sheet_filed', exists (select 1 from sheet),
    'official_source_url', coalesce((select source_url from sheet), e.source_url),
    'bout_count', (select count(*) from bouts),
    'results_count', (select count(*) from bouts b where exists (select 1 from public.boxing_bout_results_current r where r.bout_id = b.id)),
    'awaiting_verification', (select greatest(s.sheet_bouts - (select count(*) from bouts), 0) from sheet s),
    'title_bouts', (select count(distinct bt.bout_id) from bouts b join public.boxing_bout_titles bt on bt.bout_id = b.id),
    'headline', case when p_with_headline then (
        select public.boxing_site_bout_compact(b.id, (select bouts from sheet)) from bouts b
        order by b.scheduled_rounds desc nulls last, b.bout_order desc nulls last limit 1) end)
  from e
$$;

-- ---------------------------------------------------------------------------
-- Site reads
-- ---------------------------------------------------------------------------

create or replace function public.boxing_site_events(p_scope text default 'all', p_commission text default null, p_limit int default 40, p_offset int default 0, p_today date default current_date)
returns jsonb language sql stable set search_path = '' as $$
  with ev as (
    select e.* from public.boxing_events e
    left join public.boxing_commissions c on c.id = e.commission_id
    where e.status is distinct from 'cancelled'
      and (p_commission is null or c.slug = p_commission)
      and case coalesce(p_scope, 'all')
            when 'upcoming' then e.event_date >= p_today and e.status is distinct from 'complete'
            when 'results' then e.event_date < p_today or e.status = 'complete'
            else true end),
  page as (
    select * from ev
    order by case when coalesce(p_scope, 'all') = 'upcoming' then ev.event_date end asc nulls last, ev.event_date desc, ev.name
    limit greatest(1, least(coalesce(p_limit, 40), 100)) offset greatest(0, coalesce(p_offset, 0)))
  select jsonb_build_object(
    'scope', coalesce(p_scope, 'all'), 'commission', p_commission, 'total', (select count(*) from ev),
    'limit', greatest(1, least(coalesce(p_limit, 40), 100)), 'offset', greatest(0, coalesce(p_offset, 0)),
    'commissions', (select coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'events', (select count(*) from public.boxing_events x where x.commission_id = c.id and x.status is distinct from 'cancelled')) order by c.name), '[]'::jsonb) from public.boxing_commissions c),
    'rows', (select coalesce(jsonb_agg(public.boxing_site_event_summary(p.id, true) order by case when coalesce(p_scope, 'all') = 'upcoming' then p.event_date end asc nulls last, p.event_date desc, p.name), '[]'::jsonb) from page p))
$$;

create or replace function public.boxing_site_event(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select e.* from public.boxing_events e where public.boxing_site_ref_matches(e.public_id, p_ref)),
  e as (select * from hit where (select count(*) from hit) = 1),
  sheet as (
    select se.* from e join public.boxing_event_identities ei on ei.event_id = e.id and ei.verification_state <> 'rejected'
    join public.boxing_site_sheet_events() se on se.source_event_id = ei.external_id and se.source_id = ei.source_id limit 1)
  select jsonb_build_object(
    'event', public.boxing_site_event_summary(e.id, false),
    'bouts', (select coalesce(jsonb_agg(public.boxing_site_bout_compact(b.id, (select bouts from sheet)) order by b.bout_order nulls last, b.public_id), '[]'::jsonb)
              from public.boxing_bouts b where b.event_id = e.id and b.status is distinct from 'cancelled'),
    'cancelled_bouts', (select count(*) from public.boxing_bouts b where b.event_id = e.id and b.status = 'cancelled'),
    'card_changes', (select jsonb_build_object('count', count(*), 'latest_at', max(cc.detected_at),
                       'by_type', coalesce((select jsonb_object_agg(t.change_type, t.n) from (select change_type, count(*) n from public.boxing_card_changes where event_id = e.id group by 1) t), '{}'::jsonb))
                     from public.boxing_card_changes cc where cc.event_id = e.id),
    'same_weekend', (select coalesce(jsonb_agg(jsonb_build_object('public_id', x.public_id, 'name', x.name, 'date', x.event_date, 'status', x.status,
                        'commission', (select c.name from public.boxing_commissions c where c.id = x.commission_id)) order by x.event_date, x.name), '[]'::jsonb)
                     from public.boxing_events x where x.id <> e.id and x.status is distinct from 'cancelled' and abs(x.event_date - e.event_date) <= 2))
  from e
$$;

create or replace function public.boxing_site_fighter_bouts(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'public_id', b.public_id, 'date', v.event_date, 'order', v.bout_order,
      'event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'status', e.status,
                                  'commission_slug', c.slug, 'commission', c.name,
                                  'city', ve.city, 'region', ve.region, 'country_code', ve.country_code),
      'opponent', jsonb_build_object('public_id', of.public_id, 'name', of.display_name, 'record_entering', public.boxing_site_record(v.opponent_id, v.event_date, v.bout_order)),
      'result', v.result_code, 'event_complete', v.event_complete, 'method', v.method, 'decision_type', v.decision_type, 'round', v.result_round, 'time_sec', v.time_sec,
      'scheduled_rounds', v.scheduled_rounds, 'rounds_completed', v.rounds_completed,
      'weight', public.boxing_site_weight(b.id), 'weigh_in', public.boxing_site_weigh_in(b.id, v.fighter_id),
      'scorecards', (select coalesce(jsonb_agg(jsonb_build_object(
                        'mine', case when public.boxing_canonical_fighter_id(s.fighter_a_id) = v.fighter_id then s.fighter_a_total else s.fighter_b_total end,
                        'theirs', case when public.boxing_canonical_fighter_id(s.fighter_a_id) = v.fighter_id then s.fighter_b_total else s.fighter_a_total end) order by s.slot nulls last), '[]'::jsonb)
                     from public.boxing_scorecards_current s where s.bout_id = b.id),
      'titles', (select coalesce(jsonb_agg(jsonb_build_object('organization', org.short_name, 'tier', t.tier, 'label', coalesce(t.source_native_label, t.name), 'status', bt.status)), '[]'::jsonb)
                 from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join public.boxing_organizations org on org.id = t.organization_id where bt.bout_id = b.id),
      'revised', coalesce((select r.revision > 1 from public.boxing_bout_results_current r where r.bout_id = b.id), false))
    order by v.event_date desc, v.bout_order desc nulls last), '[]'::jsonb)
  from public.boxing_site_participations() v
  join public.boxing_bouts b on b.id = v.bout_id
  join public.boxing_events e on e.id = v.event_id
  left join public.boxing_commissions c on c.id = e.commission_id
  left join public.boxing_venues ve on ve.id = e.venue_id
  join public.boxing_fighters of on of.id = v.opponent_id
  where v.fighter_id = p_fighter
$$;

create or replace function public.boxing_site_dna(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', s.metric_key, 'version', s.metric_version, 'category', d.category, 'name', d.name, 'unit', d.unit,
      'status', s.status, 'value', s.value_number, 'value_text', s.value_text,
      'value_json', case when s.metric_key in ('results.outcome_summary', 'division.recent', 'division.last_move', 'late.knockdowns_after_round_8') then s.value_json end,
      'sample_size', s.sample_size, 'minimum_sample', d.minimum_sample, 'as_of', s.as_of)
    order by d.category, s.metric_key), '[]'::jsonb)
  from (select distinct on (metric_key) * from public.boxing_fighter_metric_snapshots
        where fighter_id = p_fighter order by metric_key, as_of desc, created_at desc) s
  join public.boxing_metric_definitions d on d.metric_key = s.metric_key and d.version = s.metric_version and d.subject_kind = s.subject_kind
$$;

create or replace function public.boxing_site_fighter_head(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('public_id', f.public_id, 'name', f.display_name, 'nickname', f.nickname,
    'stance', nullif(f.stance::text, 'unknown'), 'height_cm', f.height_cm, 'reach_cm', f.reach_cm, 'nationality', f.nationality, 'sex', f.sex,
    'career_status', f.career_status)
  from public.boxing_fighters f where f.id = p_fighter
$$;

create or replace function public.boxing_site_fighter(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select f.* from public.boxing_fighters f where public.boxing_site_ref_matches(f.public_id, p_ref)),
  f as (select * from hit where (select count(*) from hit) = 1),
  canon as (select public.boxing_canonical_fighter_id(f.id) id, f.id raw_id from f)
  select case
    when (select id from canon) <> (select raw_id from canon) then
      jsonb_build_object('redirect_public_id', (select x.public_id from public.boxing_fighters x where x.id = (select id from canon)))
    else jsonb_build_object(
      'fighter', public.boxing_site_fighter_head(c.id),
      'record', public.boxing_site_record(c.id),
      'bouts', public.boxing_site_fighter_bouts(c.id),
      'dna', public.boxing_site_dna(c.id),
      'dna_as_of', (select max(as_of) from public.boxing_fighter_metric_snapshots where fighter_id = c.id)) end
  from canon c
$$;

create or replace function public.boxing_site_fighters(p_q text default null, p_limit int default 50, p_offset int default 0)
returns jsonb language sql stable set search_path = '' as $$
  with agg as (
    select v.fighter_id, count(*) filter (where v.event_complete) bouts, max(v.event_date) last_date,
           count(*) filter (where v.result_code = 'W') wins, count(*) filter (where v.result_code = 'L') losses,
           count(*) filter (where v.result_code = 'D') draws, count(*) filter (where v.result_code in ('NC','ND')) nc,
           count(*) filter (where not v.event_complete) upcoming
    from public.boxing_site_participations() v group by v.fighter_id),
  q as (select lower(regexp_replace(coalesce(p_q, ''), '[^[:alnum:] ]', '', 'g')) t),
  base as (
    select f.id, f.public_id, f.display_name, a.* from agg a join public.boxing_fighters f on f.id = a.fighter_id, q
    where f.merged_into_id is null
      and (q.t = '' or f.normalized_name like '%' || q.t || '%' or lower(f.display_name) like '%' || q.t || '%')),
  page as (select * from base order by bouts desc, last_date desc nulls last, display_name
           limit greatest(1, least(coalesce(p_limit, 50), 100)) offset greatest(0, coalesce(p_offset, 0)))
  select jsonb_build_object('q', nullif(p_q, ''), 'total', (select count(*) from base),
    'limit', greatest(1, least(coalesce(p_limit, 50), 100)), 'offset', greatest(0, coalesce(p_offset, 0)),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('public_id', p.public_id, 'name', p.display_name,
        'record', jsonb_build_object('bouts', p.bouts, 'wins', p.wins, 'losses', p.losses, 'draws', p.draws, 'no_contests', p.nc),
        'upcoming', p.upcoming, 'last_date', p.last_date,
        'division', (select jsonb_build_object('class_key', wc.class_key, 'class_name', wc.name)
                     from public.boxing_site_participations() v join public.boxing_bouts b on b.id = v.bout_id join public.boxing_weight_classes wc on wc.id = b.weight_class_id
                     where v.fighter_id = p.id order by v.event_date desc, v.bout_order desc limit 1),
        'commissions', (select coalesce(jsonb_agg(distinct c.slug), '[]'::jsonb) from public.boxing_site_participations() v join public.boxing_events e on e.id = v.event_id
                        join public.boxing_commissions c on c.id = e.commission_id where v.fighter_id = p.id))
      order by p.bouts desc, p.last_date desc nulls last, p.display_name), '[]'::jsonb) from page p))
$$;

create or replace function public.boxing_site_bout(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select b.* from public.boxing_bouts b where public.boxing_site_ref_matches(b.public_id, p_ref)),
  b as (select * from hit where (select count(*) from hit) = 1),
  e as (select ev.* from public.boxing_events ev join b on b.event_id = ev.id),
  sheet as (
    select se.* from e join public.boxing_event_identities ei on ei.event_id = e.id and ei.verification_state <> 'rejected'
    join public.boxing_site_sheet_events() se on se.source_event_id = ei.external_id and se.source_id = ei.source_id limit 1),
  corners as (
    select p.side, public.boxing_canonical_fighter_id(p.fighter_id) fighter_id
    from b join public.boxing_bout_participants p on p.bout_id = b.id and p.participant_status in ('scheduled','confirmed'))
  select jsonb_build_object(
    -- internal_bout_id lets the gateway fetch the one-bout odds summary; the gateway strips it before responding
    'internal_bout_id', b.id,
    'bout', public.boxing_site_bout_compact(b.id, (select bouts from sheet)),
    'event', public.boxing_site_event_summary(e.id, false),
    'result_history', (select coalesce(jsonb_agg(jsonb_build_object('revision', r.revision, 'outcome', r.outcome, 'method', r.method, 'decision_type', r.decision_type,
                          'round', r.round, 'state', r.result_state, 'change_reason', r.change_reason, 'captured_at', r.captured_at) order by r.revision), '[]'::jsonb)
                       from public.boxing_bout_results r where r.bout_id = b.id),
    'corners', (select jsonb_object_agg(c.side, jsonb_build_object(
        'fighter', public.boxing_site_fighter_head(c.fighter_id),
        'record_all', public.boxing_site_record(c.fighter_id),
        'entering', public.boxing_site_record(c.fighter_id, e.event_date, b.bout_order),
        'recent_entering', (select coalesce(jsonb_agg(x order by x ->> 'date' desc, (x ->> 'order')::int desc), '[]'::jsonb) from (
            select jsonb_build_object('date', v.event_date, 'order', v.bout_order, 'result', v.result_code, 'method', v.method, 'decision_type', v.decision_type, 'round', v.result_round,
                                      'opponent', (select jsonb_build_object('public_id', o.public_id, 'name', o.display_name) from public.boxing_fighters o where o.id = v.opponent_id),
                                      'bout_public_id', (select bb.public_id from public.boxing_bouts bb where bb.id = v.bout_id)) x
            from public.boxing_site_participations() v
            where v.fighter_id = c.fighter_id and v.event_complete
              and (v.event_date < e.event_date or (v.event_date = e.event_date and v.bout_order < b.bout_order))
            order by v.event_date desc, v.bout_order desc limit 5) q),
        'later_bouts', (select count(*) from public.boxing_site_participations() v where v.fighter_id = c.fighter_id
                          and (v.event_date > e.event_date or (v.event_date = e.event_date and v.bout_order > b.bout_order))),
        'dna', public.boxing_site_dna(c.fighter_id),
        'dna_as_of', (select max(as_of) from public.boxing_fighter_metric_snapshots where fighter_id = c.fighter_id)))
      from corners c),
    'card', (select coalesce(jsonb_agg(public.boxing_site_bout_compact(x.id, (select bouts from sheet)) order by x.bout_order nulls last), '[]'::jsonb)
             from public.boxing_bouts x where x.event_id = b.event_id and x.id <> b.id and x.status is distinct from 'cancelled'))
  from b, e
$$;

create or replace function public.boxing_site_coverage(p_today date default current_date)
returns jsonb language sql stable set search_path = '' as $$
  with sheets as (
    select se.sheet_bouts, (select count(*) from public.boxing_bouts b where b.event_id = ei.event_id) canon
    from public.boxing_site_sheet_events() se
    join public.boxing_event_identities ei on ei.external_id = se.source_event_id and ei.source_id = se.source_id and ei.verification_state <> 'rejected')
  select jsonb_build_object(
    'as_of', now(),
    'fighters_with_bouts', (select count(distinct fighter_id) from public.boxing_site_participations()),
    'events', (select count(*) from public.boxing_events where status is distinct from 'cancelled'),
    'events_upcoming', (select count(*) from public.boxing_events where status is distinct from 'cancelled' and status is distinct from 'complete' and event_date >= p_today),
    'events_complete', (select count(*) from public.boxing_events where status = 'complete'),
    'bouts', (select count(*) from public.boxing_bouts where status is distinct from 'cancelled'),
    'upcoming_bouts', (select count(*) from public.boxing_site_participations() where side = 'a' and not event_complete),
    'official_results', (select count(*) from public.boxing_bout_results_current),
    'results_pending', (select count(*) from public.boxing_site_participations() v where v.side = 'a' and v.event_complete and v.result_code is null
                          and not exists (select 1 from public.boxing_bout_results_current r where r.bout_id = v.bout_id)),
    'bouts_with_scorecards', (select count(distinct bout_id) from public.boxing_scorecards_current),
    'scorecard_rounds', (select count(*) from public.boxing_scorecard_rounds),
    'judges', (select count(distinct official_id) from public.boxing_bout_officials where role = 'judge'),
    'referees', (select count(distinct official_id) from public.boxing_bout_officials where role = 'referee'),
    'sheet_bouts', (select coalesce(sum(sheet_bouts), 0) from sheets),
    'awaiting_verification', (select coalesce(sum(greatest(sheet_bouts - canon, 0)), 0) from sheets),
    'fighters_with_dna', (select count(distinct fighter_id) from public.boxing_fighter_metric_snapshots),
    'title_records', (select count(*) from public.boxing_titles),
    'title_events', (select count(*) from public.boxing_title_events),
    'ranking_snapshots', (select count(*) from public.boxing_ranking_snapshots),
    'matched_market_bouts', (select count(distinct bout_id) from public.boxing_bout_identities where namespace = 'the_odds_api.event' and verification_state = 'verified'),
    'captured_market_events_upcoming', (select count(*) from public.boxing_provider_events pe where pe.last_commence_time >= now()),
    'commissions', (select coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'jurisdiction', c.jurisdiction,
                      'events', (select count(*) from public.boxing_events x where x.commission_id = c.id and x.status is distinct from 'cancelled'))
                      order by c.name), '[]'::jsonb) from public.boxing_commissions c))
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
        select public.boxing_site_bout_compact(b.id) || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date)) j,
               e.event_date, b.bout_order
        from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
        join public.boxing_bout_results_current r on r.bout_id = b.id
        where e.event_date <= p_today order by e.event_date desc, b.scheduled_rounds desc nulls last, b.bout_order desc limit 8) x),
    'scorecard_watch', (select coalesce(jsonb_agg(x.j order by x.event_date desc), '[]'::jsonb) from (
        select public.boxing_site_bout_compact(b.id) || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date)) j, e.event_date
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

create or replace function public.boxing_site_sanctioning_bodies()
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', o.slug, 'short_name', o.short_name, 'name', o.name, 'website_url', o.website_url,
      'source_state', s.rights_state, 'display_allowed', s.display_allowed,
      'title_records', (select count(*) from public.boxing_titles t where t.organization_id = o.id),
      'ranking_snapshots', (select count(*) from public.boxing_ranking_snapshots r where r.organization_id = o.id))
    order by o.short_name), '[]'::jsonb)
  from public.boxing_organizations o
  left join public.boxing_sources s on s.source_key = o.slug || '_official'
  where o.organization_kind = 'sanctioning_body' and o.sanctioning_scope = 'world'
$$;

-- Title Map board: divisions, sanctioning bodies with their source review state.
create or replace function public.boxing_site_title_board()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'divisions', (select coalesce(jsonb_agg(jsonb_build_object('class_key', wc.class_key, 'name', wc.name, 'max_lb', wc.max_weight_lb, 'max_kg', wc.max_weight_kg,
                     'gender_scope', wc.gender_scope, 'notes', wc.notes,
                     'title_records', (select count(*) from public.boxing_titles t where t.weight_class_id = wc.id),
                     'verified_bouts', (select count(*) from public.boxing_bouts b where b.weight_class_id = wc.id and b.status is distinct from 'cancelled'))
                   order by wc.max_weight_lb nulls last), '[]'::jsonb) from public.boxing_weight_classes wc),
    'organizations', public.boxing_site_sanctioning_bodies(),
    'title_records', (select count(*) from public.boxing_titles),
    'title_events', (select count(*) from public.boxing_title_events),
    'title_bouts', (select count(distinct bout_id) from public.boxing_bout_titles))
$$;

create or replace function public.boxing_site_ranking_board()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'organizations', public.boxing_site_sanctioning_bodies(),
    'divisions', (select coalesce(jsonb_agg(jsonb_build_object('class_key', wc.class_key, 'name', wc.name, 'max_lb', wc.max_weight_lb, 'gender_scope', wc.gender_scope) order by wc.max_weight_lb nulls last), '[]'::jsonb)
                  from public.boxing_weight_classes wc),
    'snapshots', (select coalesce(jsonb_agg(jsonb_build_object('organization_slug', o.slug, 'class_key', wc.class_key, 'published_on', r.published_on, 'effective_on', r.effective_on)
                    order by o.slug, wc.max_weight_lb nulls last, r.published_on desc nulls last), '[]'::jsonb)
                  from public.boxing_ranking_snapshots r join public.boxing_organizations o on o.id = r.organization_id join public.boxing_weight_classes wc on wc.id = r.weight_class_id))
$$;

select public.boxing_lockdown();

commit;
