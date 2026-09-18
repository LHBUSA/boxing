-- Current professional fight week: promoter SCHEDULE lanes, discovery candidates, and the operational priority system.
--
-- Owner decision 2026-09-18, after two major professional cards on 2026-09-19 (PBC San Diego, Matchroom Manchester) were
-- absent from the consumer product: current major professional boxing comes first, historical expansion second.
--
-- Root cause proven before writing this: neither card could reach us. San Diego is California (csac_california,
-- review_required, never polled) and Manchester is the United Kingdom (bbbofc_uk, review_required, robots-disallowed);
-- both promoters were registered but disabled with no collector; and commissions publish calendars, not announced cards,
-- so every future event we did hold had zero bouts. It was never a consumer filter: the upcoming scope is simply
-- event_date >= today and status <> complete, with no competition_class filter.
--
-- 1. Rights, BY LANE. PBC and Matchroom are approved for announced SCHEDULE facts only — the card as the promoter
--    publishes it. Results, scorecards, officials, photographs, video and article text stay not_permitted for both, and
--    the 0045 lane gate enforces that at write time. Schedule permission is not image permission.
-- 2. boxing_event_discovery_candidates: "we may be missing this card" is a candidate, never a canonical event. A
--    candidate carries what was discovered and its confidence; only the canonicalizer promotes it.
-- 3. boxing_event_priority() / boxing_pro_coverage_health(): the operational priority heuristic (professional first,
--    title bouts, major promoter, broadcast, proximity) and the fight-week SLA report, including MAJOR_PRO_CARD_MISSING.
--
-- This changes no model object, no archive scope, no runtime flag and no history gate.

begin;

-- 1 -------------------------------------------------------------------------------------------------------------------
-- lanes that describe content we must be able to refuse separately from schedule facts
alter table public.boxing_source_capabilities drop constraint if exists boxing_source_capabilities_lane_check;
do $$ begin
  perform public.boxing_ensure_constraint('public.boxing_source_capabilities', 'boxing_source_capabilities_lane_check',
    'check (lane in (''events'',''upcoming_cards'',''bouts'',''results'',''stoppage_round_time'',''scorecard_totals'',''scorecard_rounds'',''judges'',''referees'',
      ''weigh_ins'',''point_deductions'',''knockdowns'',''suspensions'',''titles_at_stake'',''title_status'',''rankings'',''fighter_identity'',''fighter_attributes'',''venues'',
      ''promoters'',''broadcasters'',''hall_inductions'',''odds'',''photos'',''video'',''article_text''))');
end $$;

do $$
declare
  v_at timestamptz := '2026-09-18T18:00:00Z';
  v_by text := 'Justin Erickson (owner decision 2026-09-18)';
  r record;
begin
  -- PBC: schedule lane only
  insert into public.boxing_source_rights_reviews (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses,
    attribution, account_agreement_found, account_scope_note, next_review_due, notes)
  select id, v_at, v_by, 'https://www.premierboxingchampions.com/terms-of-use', 'approved_with_restrictions',
    array['announced event schedule facts: event name, date, venue, city, country, promoter, broadcaster as published',
          'announced bout pairings with division, scheduled rounds, title stake and card position as published',
          'link back to the official event page as the source of every fact'],
    array['results, method, rounds, scorecards, officials', 'photographs and any image asset', 'video and embeds',
          'article or promotional body text', 'bulk or raw redistribution of the source page'],
    'Card facts as announced by Premier Boxing Champions, linked to the official event page.', false,
    'Public event pages only; no account, no login, no paywalled or member material.', date '2026-12-18',
    'Owner decision 2026-09-18: approve the SCHEDULE lane so publicly announced professional cards can be known and shown. Every other lane stays refused and is enforced by the 0045 lane gate.'
  from public.boxing_sources where source_key = 'promoter_pbc'
  on conflict (source_id, reviewed_at) do nothing;

  -- Matchroom: schedule lane only (owner approved factual ingestion 2026-09-15; this records it and scopes it by lane)
  insert into public.boxing_source_rights_reviews (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses,
    attribution, account_agreement_found, account_scope_note, next_review_due, notes)
  select id, v_at, v_by, 'https://www.matchroomboxing.com/', 'approved_with_restrictions',
    array['announced event schedule facts: event name, date, venue, city, country, promoter, broadcaster as published',
          'announced bout pairings with division, scheduled rounds, title stake and card position as published',
          'link back to the official event page as the source of every fact'],
    array['results, method, rounds, scorecards, officials', 'photographs and any image asset', 'video and embeds',
          'article or promotional body text', 'bulk or raw redistribution of the source page'],
    'Card facts as announced by Matchroom Boxing, linked to the official event page.', false,
    'Public event pages only; robots permits normal crawling of them.', date '2026-12-18',
    'Owner decision 2026-09-15 (facts only from the public event/card surface), scoped by lane and recorded 2026-09-18.'
  from public.boxing_sources where source_key = 'promoter_matchroom'
  on conflict (source_id, reviewed_at) do nothing;

  for r in select id, source_key from public.boxing_sources where source_key in ('promoter_pbc', 'promoter_matchroom') loop
    update public.boxing_sources
      set access_mode = 'approved_ingest', rights_state = 'approved', enabled = true, reviewed_at = v_at, reviewed_by = v_by,
          redistribution_allowed = false, persistence_allowed = true, derivative_allowed = true, display_allowed = true, attribution_required = true,
          intended_use = 'Announced professional card facts for the current fight-week product. Schedule lane only.',
          next_review_due = date '2026-12-18',
          latest_rights_review_id = (select rr.id from public.boxing_source_rights_reviews rr where rr.source_id = r.id order by rr.reviewed_at desc limit 1),
          rights_note = 'Schedule lane approved 2026-09-18 (announced cards). Results, officials, scorecards, photos, video and article text are NOT permitted and fail closed at write time.'
    where id = r.id;

    -- what the schedule lane covers
    insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, coverage_basis, acquisition_method, cadence,
      completeness, confidence, notes, evidence, recorded_by, commercial_use, storage_allowed, redistribution_allowed, public_display_allowed,
      pro_tier_allowed, internal_use_allowed, verification_state)
    select r.id, l.lane, 'provided', 'covered_by_rights_review', 'source_index_documented', 'html', 'daily', 'partial', 'high',
      'Announced card as the promoter publishes it; every fact links back to the official event page.',
      jsonb_build_object('owner_decision', '2026-09-18', 'lane', 'schedule'), v_by,
      'allowed', 'allowed', 'prohibited', 'allowed', 'allowed', 'allowed', 'verified_terms_read'
    from unnest(array['events','upcoming_cards','bouts','venues','promoters','broadcasters','titles_at_stake']) l(lane)
    where not exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = r.id and c.lane = l.lane);

    -- what it does not: the 0045 trigger refuses these writes outright
    insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, coverage_basis, acquisition_method,
      completeness, confidence, notes, evidence, recorded_by, commercial_use, storage_allowed, redistribution_allowed, public_display_allowed,
      pro_tier_allowed, internal_use_allowed, verification_state)
    select r.id, l.lane, 'not_permitted', 'not_permitted', 'none', 'none', 'unknown', 'high',
      'Outside the schedule lane: not permitted for this source. Schedule permission is not permission for results, officials, images, video or article text.',
      jsonb_build_object('owner_decision', '2026-09-18', 'lane', 'non_schedule'), v_by,
      'prohibited', 'prohibited', 'prohibited', 'prohibited', 'prohibited', 'prohibited', 'verified_terms_read'
    from unnest(array['results','stoppage_round_time','scorecard_totals','scorecard_rounds','judges','referees','weigh_ins','point_deductions',
      'suspensions','knockdowns','photos','video','article_text','fighter_attributes']) l(lane)
    where not exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = r.id and c.lane = l.lane);
  end loop;
end $$;

-- 2 -------------------------------------------------------------------------------------------------------------------
create table if not exists public.boxing_event_discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  external_key text not null,
  discovered_name text not null,
  probable_date date,
  probable_city text,
  probable_country text,
  probable_promoter text,
  probable_broadcaster text,
  headline text,
  source_url text not null check (source_url ~ '^https://'),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  state text not null default 'open' check (state in ('open', 'matched', 'promoted', 'dismissed')),
  canonical_event_id uuid references public.boxing_events(id) on delete restrict,
  match_basis text,
  dismissed_reason text,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_key),
  check ((state = 'matched' or state = 'promoted') = (canonical_event_id is not null)),
  check (state <> 'dismissed' or dismissed_reason is not null)
);
create index if not exists boxing_event_discovery_open_idx on public.boxing_event_discovery_candidates (probable_date) where state = 'open';

-- Migration 0003 installs a <table>_touch trigger on every table that has updated_at. It runs before this file, so on a
-- first pass it never sees this table and on a rerun it would add the trigger — schema drift. Declaring it here with the
-- exact name and function 0003 uses keeps the chain a no-op on rerun.
drop trigger if exists boxing_event_discovery_candidates_touch on public.boxing_event_discovery_candidates;
create trigger boxing_event_discovery_candidates_touch before update on public.boxing_event_discovery_candidates
  for each row execute function public.boxing_touch_updated_at();

-- A candidate never becomes a fight. It records that a card may exist so the canonicalizer (and a human) can act.
create or replace function public.boxing_record_event_candidate(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_id uuid;
  v_match uuid;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  -- a candidate is discovery, not canonical data: it needs the source to be known, not to hold any writing lane
  select e.id into v_match from public.boxing_events e
  where e.event_date = nullif(p ->> 'probable_date', '')::date
    and (lower(e.name) = lower(p ->> 'discovered_name')
         or exists (select 1 from public.boxing_venues v where v.id = e.venue_id and lower(v.city) = lower(p ->> 'probable_city')))
  limit 1;
  insert into public.boxing_event_discovery_candidates (source_id, external_key, discovered_name, probable_date, probable_city, probable_country,
    probable_promoter, probable_broadcaster, headline, source_url, confidence, state, canonical_event_id, match_basis, observation_id)
  values (v_src, p ->> 'external_key', p ->> 'discovered_name', nullif(p ->> 'probable_date', '')::date, p ->> 'probable_city', p ->> 'probable_country',
    p ->> 'probable_promoter', p ->> 'probable_broadcaster', p ->> 'headline', p ->> 'source_url', coalesce(p ->> 'confidence', 'medium'),
    case when v_match is null then 'open' else 'matched' end, v_match,
    case when v_match is null then null else 'same date and event name or city' end, nullif(p ->> 'observation_id', '')::uuid)
  on conflict (source_id, external_key) do update
    set discovered_name = excluded.discovered_name, probable_date = excluded.probable_date, probable_city = excluded.probable_city,
        probable_promoter = excluded.probable_promoter, probable_broadcaster = excluded.probable_broadcaster, headline = excluded.headline,
        canonical_event_id = coalesce(public.boxing_event_discovery_candidates.canonical_event_id, excluded.canonical_event_id),
        state = case when public.boxing_event_discovery_candidates.state = 'promoted' then 'promoted'
                     when coalesce(public.boxing_event_discovery_candidates.canonical_event_id, excluded.canonical_event_id) is not null then 'matched'
                     else public.boxing_event_discovery_candidates.state end,
        match_basis = coalesce(public.boxing_event_discovery_candidates.match_basis, excluded.match_basis)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'matched_event', v_match, 'state', (select state from public.boxing_event_discovery_candidates where id = v_id));
end $$;

-- 3 -------------------------------------------------------------------------------------------------------------------
-- Operational importance only: it decides what ingest and QA work on first. It is not a public quality score.
create or replace function public.boxing_event_priority(p_event uuid)
returns jsonb language sql stable set search_path = '' as $$
  with e as (select * from public.boxing_events where id = p_event),
  b as (select * from public.boxing_bouts where event_id = p_event and status <> 'cancelled'),
  facts as (
    select
      (select count(*) from b) bouts,
      (select bool_or(competition_class = 'professional') from b) professional,
      (select bool_or(competition_class in ('amateur','exhibition')) from b) amateur,
      (select count(*) from public.boxing_bout_titles bt join b on b.id = bt.bout_id join public.boxing_titles t on t.id = bt.title_id
       join public.boxing_organizations o on o.id = t.organization_id where bt.at_stake and o.slug in ('wbc','wba','ibf','wbo')) world_title_bouts,
      (select count(*) from public.boxing_bout_titles bt join b on b.id = bt.bout_id where bt.at_stake) title_bouts,
      (select count(*) from public.boxing_event_organizations eo join public.boxing_organizations o on o.id = eo.organization_id
       where eo.event_id = p_event and eo.role = 'broadcaster') broadcasters,
      (select e.event_date - current_date from e) days_out,
      (select e.broadcast_notes is not null from e) has_broadcast_note)
  select jsonb_build_object(
    'rule', 'pbe_event_priority@1',
    'event', (select public_id from e), 'event_date', (select event_date from e), 'days_out', (select days_out from facts),
    'tier', case
      when (select days_out from facts) < 0 then 'past'
      when (select world_title_bouts from facts) > 0 then 'P1_world_title'
      when (select title_bouts from facts) > 0 then 'P2_other_title'
      when (select broadcasters from facts) > 0 or (select has_broadcast_note from facts) then 'P0_major_broadcast'
      when coalesce((select professional from facts), false) then 'P3_professional'
      when coalesce((select amateur from facts), false) then 'P5_amateur_or_exhibition'
      else 'P4_unclassified' end,
    'score', greatest(0,
      case when coalesce((select professional from facts), true) then 40 else 0 end
      + case when coalesce((select amateur from facts), false) and not coalesce((select professional from facts), false) then -30 else 0 end
      + (select world_title_bouts from facts) * 25 + (select title_bouts from facts) * 10
      + case when (select broadcasters from facts) > 0 or (select has_broadcast_note from facts) then 20 else 0 end
      + case when (select days_out from facts) between 0 and 1 then 30
             when (select days_out from facts) between 2 and 7 then 20
             when (select days_out from facts) between 8 and 14 then 10 else 0 end
      + least(10, (select bouts from facts))),
    'facts', to_jsonb((select f from facts f)))
$$;

-- Fight-week SLA: what we hold for every upcoming event, and what is missing, worst first.
create or replace function public.boxing_pro_coverage_health(p_days int default 14)
returns jsonb language sql stable set search_path = '' as $$
  with ev as (select * from public.boxing_events where event_date between current_date and current_date + p_days and status <> 'cancelled'),
  per as (
    select e.id, e.public_id, e.name, e.event_date, e.status, public.boxing_event_priority(e.id) pr,
      (select count(*) from public.boxing_bouts b where b.event_id = e.id and b.status <> 'cancelled') bouts,
      (select count(*) from public.boxing_bouts b join public.boxing_bout_participants p on p.bout_id = b.id where b.event_id = e.id) corners,
      (select count(distinct p.fighter_id) from public.boxing_bouts b join public.boxing_bout_participants p on p.bout_id = b.id where b.event_id = e.id) fighters,
      (select count(*) from public.boxing_bouts b join public.boxing_bout_titles bt on bt.bout_id = b.id where b.event_id = e.id and bt.at_stake) title_bouts,
      (select count(*) from public.boxing_bouts b join public.boxing_bout_participants p on p.bout_id = b.id
        join public.boxing_fighter_media m on m.fighter_id = public.boxing_canonical_fighter_id(p.fighter_id) and m.review_state = 'approved'
        where b.event_id = e.id) portraits,
      (select count(*) from public.boxing_bout_identities bi join public.boxing_bouts b on b.id = bi.bout_id
        where b.event_id = e.id and bi.namespace like 'the_odds_api%') market_matched,
      e.venue_id is not null has_venue, e.commission_id is not null has_commission, e.broadcast_notes is not null has_broadcast
    from ev e)
  select jsonb_build_object(
    'rule', 'pbe_pro_coverage_health@1', 'window_days', p_days, 'generated_at', now(),
    'canonical_events', (select count(*) from per),
    'open_discovery_candidates', (select count(*) from public.boxing_event_discovery_candidates
      where state = 'open' and probable_date between current_date and current_date + p_days),
    'alerts', (select coalesce(jsonb_agg(jsonb_build_object('alert', 'MAJOR_PRO_CARD_MISSING', 'discovered_name', c.discovered_name,
        'probable_date', c.probable_date, 'probable_city', c.probable_city, 'promoter', c.probable_promoter, 'source_url', c.source_url,
        'confidence', c.confidence) order by c.probable_date), '[]'::jsonb)
      from public.boxing_event_discovery_candidates c
      where c.state = 'open' and c.probable_date between current_date and current_date + p_days),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
        'event', p.public_id, 'name', p.name, 'date', p.event_date, 'days_out', p.pr -> 'days_out', 'tier', p.pr ->> 'tier', 'score', p.pr -> 'score',
        'bouts', p.bouts, 'fighters', p.fighters, 'title_bouts', p.title_bouts, 'portraits', p.portraits, 'market_matched', p.market_matched,
        'gaps', (select coalesce(jsonb_agg(g), '[]'::jsonb) from (select unnest(array_remove(array[
            case when p.bouts = 0 then 'no announced bouts' end,
            case when not p.has_venue then 'no venue' end,
            case when not p.has_broadcast then 'no broadcaster on record' end,
            case when p.bouts > 0 and p.corners < p.bouts * 2 then 'corners incomplete' end,
            case when p.bouts > 0 and p.portraits = 0 then 'no portrait for any fighter' end,
            case when p.bouts > 0 and p.market_matched = 0 then 'no matched market' end], null)) g) x))
      order by (p.pr ->> 'score')::int desc, p.event_date), '[]'::jsonb) from per p))
$$;

select public.boxing_lockdown();

commit;
