-- 0049: card completeness + placeholder hardening.
--
-- 1. Name quality: Matchroom prints an unsigned slot as "TBC" in BOTH name fields ("TBC TBC"). The placeholder rule
--    matched a single token only, so the 2026-10-02 Matchroom apply created a canonical fighter "TBC TBC". Repeated
--    placeholder tokens are now a placeholder (mirrors shared/adapters/promoters/names.mjs).
-- 2. boxing_repair_placeholder_fighters(p_apply): finds placeholder-named fighters and removes ONLY those that carry no
--    bout, appearance decision, identity, result, title, ranking or media. Dry run by default; the operator runs it with
--    p_apply=true and commits the receipt. Anything a placeholder is attached to is reported, never deleted.
-- 3. boxing_event_card_completeness(event): how much of the ADVERTISED card we actually hold.
--      announced_bouts  named pairings in the latest announced-card observation per source (max across sources)
--      tbc_slots        slots the source printed without a named opponent
--      stored_bouts     canonical, non-cancelled bouts on the event
--      held_bouts       announced pairings with no canonical bout (identity held for review, or not yet applied)
--      completeness_pct stored-of-announced, TBC slots excluded
--    States (pbe_card_completeness@1, thresholds explicit below):
--      COMPLETE_CARD   announced card known, >= 3 named bouts, every named bout stored (TBC slots allowed)
--      PARTIAL_CARD    announced card known and >= 1 named bout missing/held; or no announced card and >= 3 stored
--      HEADLINER_ONLY  <= 2 bouts known/stored and the event is within 21 days (a 1-2 bout record is never "complete")
--      CARD_DEVELOPING nothing announced yet, or <= 2 bouts announced more than 21 days out
-- 4. boxing_site_event_summary gains a 'completeness' block; 5. boxing_card_completeness_report() for internal health.

begin;

create or replace function public.boxing_identity_name_quality(p_name text)
returns jsonb language sql immutable set search_path = '' as $fn$
  with n as (select btrim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', ' ', 'g')) as v),
  t as (select v,
               coalesce(array_length(regexp_split_to_array(nullif(v, ''), ' '), 1), 0) as tokens,
               length(replace(v, ' ', '')) as letters,
               case when v ~ '^[a-z]( [a-z])*$' then replace(v, ' ', '') else v end as squashed
        from n),
  p as (select t.*, (v = '' or v = 'opponent'
      or v ~ '^(opponent )?(tbd|tba|tbc|to be (announced|confirmed|determined))( (tbd|tba|tbc|opponent))*$'
      or squashed ~ '^(tbd|tba|tbc)+$') as placeholder from t)
  select jsonb_build_object(
    'normalized', v, 'tokens', tokens, 'letters', letters, 'placeholder', placeholder,
    'ok', (not placeholder and length(v) <= 120 and letters >= 4)
  ) from p
$fn$;

create or replace function public.boxing_repair_placeholder_fighters(p_apply boolean default false)
returns jsonb language plpgsql set search_path = '' as $$
declare
  r record;
  v_removed jsonb := '[]'::jsonb;
  v_kept jsonb := '[]'::jsonb;
  v_refs jsonb;
begin
  for r in select f.id, f.public_id, f.display_name, f.created_at from public.boxing_fighters f
           where (public.boxing_identity_name_quality(f.display_name) ->> 'placeholder')::boolean order by f.created_at loop
    select jsonb_strip_nulls(jsonb_build_object(
      'bouts', nullif((select count(*) from public.boxing_bout_participants x where x.fighter_id = r.id or x.replaced_by_fighter_id = r.id), 0),
      'appearance_decisions', nullif((select count(*) from public.boxing_identity_appearance_decisions x where x.fighter_id = r.id), 0),
      'identities', nullif((select count(*) from public.boxing_fighter_identities x where x.fighter_id = r.id), 0),
      'results', nullif((select count(*) from public.boxing_bout_results x where x.winner_id = r.id), 0),
      'titles', nullif((select count(*) from public.boxing_title_status_entries x where x.fighter_id = r.id), 0),
      'rankings', nullif((select count(*) from public.boxing_ranking_entries x where x.fighter_id = r.id), 0),
      'media', nullif((select count(*) from public.boxing_fighter_media x where x.fighter_id = r.id), 0),
      'merged_children', nullif((select count(*) from public.boxing_fighters x where x.merged_into_id = r.id), 0))) into v_refs;
    if v_refs <> '{}'::jsonb then
      v_kept := v_kept || jsonb_build_object('public_id', r.public_id, 'name', r.display_name, 'attached_to', v_refs);
      continue;
    end if;
    if p_apply then
      delete from public.boxing_fighter_name_keys where fighter_id = r.id;
      delete from public.boxing_fighter_search_names where fighter_id = r.id;
      delete from public.boxing_fighter_aliases where fighter_id = r.id;
      delete from public.boxing_identity_resolutions where fighter_id = r.id;
      delete from public.boxing_fighters where id = r.id;
    end if;
    v_removed := v_removed || jsonb_build_object('public_id', r.public_id, 'name', r.display_name, 'created_at', r.created_at);
  end loop;
  return jsonb_build_object('rule', 'pbe_placeholder_repair@1', 'applied', p_apply, 'removed', v_removed, 'kept_for_review', v_kept);
end $$;

create or replace function public.boxing_event_card_completeness(p_event uuid, p_today date default current_date)
returns jsonb language sql stable set search_path = '' as $$
  with e as (select * from public.boxing_events where id = p_event),
  -- latest announced-card observation per source that identifies this event
  ann as (
    select distinct on (o.source_id) o.source_id, s.source_key, o.observed_at, o.payload
    from e join public.boxing_event_identities ei on ei.event_id = e.id and ei.verification_state <> 'rejected'
    join public.boxing_source_observations o on o.source_id = ei.source_id and o.entity_type = 'event_card'
      and o.payload ->> 'external_id' = ei.external_id
    join public.boxing_sources s on s.id = o.source_id
    where s.source_key like 'promoter\_%' or s.source_key like '%\_schedule'
    order by o.source_id, o.observed_at desc),
  ann_bouts as (
    select a.source_id, b ->> 'external_id' ext,
           (public.boxing_identity_name_quality(b -> 'fighter_a' ->> 'display_name') ->> 'placeholder')::boolean
             or (public.boxing_identity_name_quality(b -> 'fighter_b' ->> 'display_name') ->> 'placeholder')::boolean as placeholder
    from ann a cross join lateral jsonb_array_elements(coalesce(a.payload -> 'bouts', '[]'::jsonb)) b),
  per_source as (
    select a.source_key, a.observed_at,
      (select count(*) from ann_bouts x where x.source_id = a.source_id and not x.placeholder) named,
      coalesce((a.payload -> 'observed' ->> 'placeholder_slots')::int, 0)
        + (select count(*) from ann_bouts x where x.source_id = a.source_id and x.placeholder) tbc,
      (select count(*) from ann_bouts x where x.source_id = a.source_id and not x.placeholder
         and not exists (select 1 from public.boxing_bout_identities bi join public.boxing_bouts b on b.id = bi.bout_id
                         where bi.source_id = a.source_id and bi.external_id = x.ext and bi.verification_state <> 'rejected'
                           and b.event_id = p_event and b.status is distinct from 'cancelled')) held
    from ann a),
  best as (select * from per_source order by named desc, observed_at desc limit 1),
  st as (select count(*) stored from public.boxing_bouts b where b.event_id = p_event and b.status is distinct from 'cancelled'),
  f as (
    select (select stored from st) stored,
           (select named from best) named, coalesce((select tbc from best), 0) tbc, coalesce((select held from best), 0) held,
           (select source_key from best) source_key,
           coalesce((select max(observed_at) from per_source), (select updated_at from e)) verified_at,
           (select event_date from e) - p_today days_out),
  s as (select f.*, case
      when f.named is not null then case
        when f.named = 0 then 'CARD_DEVELOPING'
        when f.held > 0 then case when f.named - f.held <= 2 and f.named <= 2 then 'HEADLINER_ONLY' else 'PARTIAL_CARD' end
        when f.named >= 3 then 'COMPLETE_CARD'
        when f.days_out > 21 then 'CARD_DEVELOPING'
        else 'HEADLINER_ONLY' end
      else case
        when f.stored = 0 then 'CARD_DEVELOPING'
        when f.stored <= 2 then case when f.days_out > 21 then 'CARD_DEVELOPING' else 'HEADLINER_ONLY' end
        else 'PARTIAL_CARD' end
    end state from f)
  select jsonb_build_object(
    'rule', 'pbe_card_completeness@1',
    'state', s.state,
    'label', case s.state when 'COMPLETE_CARD' then 'Complete card' when 'PARTIAL_CARD' then 'Partial card'
                          when 'HEADLINER_ONLY' then 'Headliner only' else 'Card developing' end,
    'announced_source', s.source_key,
    'known_expected_bouts', s.named,
    'tbc_slots', s.tbc,
    'stored_bouts', s.stored,
    'held_bouts', s.held,
    'completeness_pct', case when coalesce(s.named, 0) > 0 then round(100.0 * (s.named - s.held) / s.named) end,
    'last_verified_at', s.verified_at,
    'basis', case when s.named is null then 'No advertised card from an approved source yet; size of the card is unknown.'
                  else format('%s of %s advertised bouts held on record%s.', s.named - s.held, s.named,
                              case when s.tbc > 0 then format(', %s opponent-TBC slot(s) excluded', s.tbc) else '' end) end)
  from s
$$;

-- Event summary: identical to 0020 plus the completeness block.
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
    'completeness', case when e.event_date >= current_date - 1 then public.boxing_event_card_completeness(e.id) end,
    'headline', case when p_with_headline then (
        select public.boxing_site_bout_compact(b.id, (select bouts from sheet)) from bouts b
        order by b.scheduled_rounds desc nulls last, b.bout_order desc nulls last limit 1) end)
  from e
$$;

create or replace function public.boxing_card_completeness_report(p_days int default 180)
returns jsonb language sql stable set search_path = '' as $$
  with ev as (select e.*, public.boxing_event_card_completeness(e.id) c from public.boxing_events e
              where e.event_date between current_date - 1 and current_date + p_days and e.status is distinct from 'cancelled')
  select jsonb_build_object(
    'rule', 'pbe_card_completeness@1', 'window_days', p_days, 'generated_at', now(),
    'events', (select count(*) from ev),
    'by_state', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select c ->> 'state' k, count(*) n from ev group by 1) x),
    'bouts_stored', (select coalesce(sum((c ->> 'stored_bouts')::int), 0) from ev),
    'bouts_held', (select coalesce(sum((c ->> 'held_bouts')::int), 0) from ev),
    'tbc_slots', (select coalesce(sum((c ->> 'tbc_slots')::int), 0) from ev),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('event', public_id, 'name', name, 'date', event_date) || c order by event_date, name), '[]'::jsonb) from ev))
$$;

comment on function public.boxing_event_card_completeness(uuid, date) is
  'pbe_card_completeness@1: advertised vs held card size for an event. A 1-2 bout record is never COMPLETE_CARD.';

select public.boxing_lockdown();

commit;
