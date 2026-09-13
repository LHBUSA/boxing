-- PropBetEdge Boxing — provider quote series record EVERY region a bookmaker
-- was returned in (issue #4)
--
-- The Odds API returns some bookmakers in more than one region
-- (observed 2026-09-13: betonlineag, sport888). A quote series is per
-- bookmaker, so `region` stays the first region seen and `regions` now lists
-- all of them; each quote keeps its region through its raw observation
-- (external_key boxing_boxing|<region>|<markets>). Rerunnable.

begin;

alter table public.boxing_provider_quote_series add column if not exists regions text[] not null default '{}';

drop trigger if exists boxing_provider_quote_series_guard on public.boxing_provider_quote_series;
create trigger boxing_provider_quote_series_guard before update or delete on public.boxing_provider_quote_series
  for each row execute function public.boxing_guard_mutable_columns('regions', 'last_seen_at', 'last_provider_update', 'last_observation_id');

-- backfill: first region plus any other region whose observation delivered the same book for the event
update public.boxing_provider_quote_series s set regions = coalesce((
    select array_agg(distinct x.region order by x.region) from (
      select s.region
      union
      select split_part(o.external_key, '|', 2)
      from public.boxing_source_observations o, jsonb_array_elements(o.payload) e, jsonb_array_elements(e -> 'bookmakers') b
      where o.source_id = (select source_id from public.boxing_odds_providers where id = s.provider_id)
        and o.entity_type = 'odds_snapshot' and jsonb_typeof(o.payload) = 'array'
        and e ->> 'id' = s.provider_event_id and b ->> 'key' = s.bookmaker_key) x), array[s.region])
where s.regions = '{}';

create or replace function public.boxing_ingest_provider_quotes(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_provider public.boxing_odds_providers%rowtype;
  v_obs uuid := nullif(p ->> 'observation_id', '')::uuid;
  v_seen timestamptz := coalesce(nullif(p ->> 'captured_at', '')::timestamptz, now());
  v_region text := coalesce(nullif(p ->> 'region', ''), 'unknown');
  v_run uuid := nullif(p ->> 'ingest_run_id', '')::uuid;
  ev jsonb; q jsonb; nm text; rl text;
  v_series uuid; v_quote bigint; v_new boolean;
  c_events_new int := 0; c_events int := 0; c_participants_new int := 0; c_series_new int := 0; c_ins int := 0; c_same int := 0;
begin
  select * into v_provider from public.boxing_odds_providers where slug = p ->> 'provider_slug';
  if not found then raise exception 'provider_not_registered: %', p ->> 'provider_slug' using errcode = 'BX051'; end if;
  -- the raw observation must already exist and belong to this provider's source
  if v_obs is null or not exists (select 1 from public.boxing_source_observations o where o.id = v_obs and o.source_id = v_provider.source_id) then
    raise exception 'provider_quotes_require_raw_observation: % is not an observation of provider %', v_obs, v_provider.slug using errcode = 'BX052';
  end if;

  for ev in select * from jsonb_array_elements(coalesce(p -> 'events', '[]'::jsonb)) loop
    c_events := c_events + 1;
    insert into public.boxing_provider_events as e
      (provider_id, provider_event_id, sport_key, home_name, away_name, first_commence_time, last_commence_time,
       first_seen_at, last_seen_at, first_observation_id, last_observation_id)
    values (v_provider.id, ev ->> 'provider_event_id', ev ->> 'sport_key', ev ->> 'home_name', ev ->> 'away_name',
            nullif(ev ->> 'commence_time', '')::timestamptz, nullif(ev ->> 'commence_time', '')::timestamptz, v_seen, v_seen, v_obs, v_obs)
    on conflict (provider_id, provider_event_id) do update
      set last_commence_time = coalesce(excluded.last_commence_time, e.last_commence_time),
          last_seen_at = greatest(e.last_seen_at, excluded.last_seen_at),
          last_observation_id = case when excluded.last_seen_at >= e.last_seen_at then excluded.last_observation_id else e.last_observation_id end,
          seen_count = e.seen_count + 1
    returning (xmax = 0) into v_new;
    if v_new then c_events_new := c_events_new + 1; end if;

    foreach rl in array array['home','away'] loop
      nm := ev ->> (rl || '_name');
      insert into public.boxing_provider_participants as pp (provider_id, participant_name, first_seen_at, last_seen_at, first_observation_id)
      values (v_provider.id, nm, v_seen, v_seen, v_obs)
      on conflict (provider_id, participant_name) do update
        set last_seen_at = greatest(pp.last_seen_at, excluded.last_seen_at), seen_count = pp.seen_count + 1
      returning (xmax = 0) into v_new;
      if v_new then c_participants_new := c_participants_new + 1; end if;
      insert into public.boxing_provider_event_participants (provider_id, provider_event_id, participant_name, role, first_seen_at, first_observation_id)
      values (v_provider.id, ev ->> 'provider_event_id', nm, rl, v_seen, v_obs)
      on conflict do nothing;
    end loop;

    for q in select * from jsonb_array_elements(coalesce(ev -> 'quotes', '[]'::jsonb)) loop
      insert into public.boxing_provider_quote_series as s
        (provider_id, provider_event_id, region, regions, bookmaker_key, bookmaker_title, provider_market_key, outcome_name,
         first_seen_at, last_seen_at, last_provider_update, last_observation_id)
      values (v_provider.id, ev ->> 'provider_event_id', v_region, array[v_region], q ->> 'bookmaker_key', q ->> 'bookmaker_title', q ->> 'market_key',
              q ->> 'outcome_name', v_seen, v_seen, nullif(q ->> 'provider_last_update', '')::timestamptz, v_obs)
      on conflict (provider_id, provider_event_id, bookmaker_key, provider_market_key, outcome_name) do update
        set regions = case when v_region = any (s.regions) then s.regions else s.regions || v_region end,
            last_seen_at = greatest(s.last_seen_at, excluded.last_seen_at),
            last_provider_update = greatest(s.last_provider_update, excluded.last_provider_update),
            last_observation_id = case when excluded.last_seen_at >= s.last_seen_at then excluded.last_observation_id else s.last_observation_id end
      returning id, (xmax = 0) into v_series, v_new;
      if v_new then c_series_new := c_series_new + 1; end if;

      v_quote := null;
      insert into public.boxing_provider_quotes
        (series_id, point, price_american, price_decimal, implied_probability, provider_last_update, commence_time, is_live,
         captured_at, observation_id, ingest_run_id)
      values (v_series, nullif(q ->> 'point', '')::numeric, (q ->> 'american')::int, (q ->> 'decimal')::numeric, (q ->> 'implied')::numeric,
              nullif(q ->> 'provider_last_update', '')::timestamptz, nullif(ev ->> 'commence_time', '')::timestamptz,
              coalesce((q ->> 'is_live')::boolean, false), v_seen, v_obs, v_run)
      on conflict do nothing
      returning id into v_quote;
      if v_quote is null then c_same := c_same + 1; else c_ins := c_ins + 1; end if;
    end loop;
  end loop;

  return jsonb_build_object('events', c_events, 'events_new', c_events_new, 'participants_new', c_participants_new,
                            'series_new', c_series_new, 'quotes_inserted', c_ins, 'quotes_unchanged', c_same);
end $$;

create or replace function public.boxing_provider_coverage()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'provider_events', (select count(*) from public.boxing_provider_events),
    'provider_events_upcoming', (select count(*) from public.boxing_provider_events where last_commence_time > now()),
    'participants', (select count(*) from public.boxing_provider_participants),
    'participants_unresolved', (select count(*) from public.boxing_provider_participant_resolution where resolution_state = 'unresolved'),
    'events_mapped_to_bouts', (select count(*) from public.boxing_provider_events e join public.boxing_bout_identities i
                               on i.namespace = 'the_odds_api.event' and i.external_id = e.provider_event_id and i.verification_state <> 'rejected'),
    'unmatched_queue_open', (select count(*) from public.boxing_market_unmatched where not resolved),
    'unmatched_reasons', (select coalesce(jsonb_object_agg(reason, n), '{}'::jsonb) from (select reason, count(*) n from public.boxing_market_unmatched where not resolved group by reason) r),
    'bookmakers', (select count(distinct bookmaker_key) from public.boxing_provider_quote_series),
    'bookmakers_by_region', (select coalesce(jsonb_object_agg(region, n), '{}'::jsonb) from (select r.region, count(distinct s.bookmaker_key) n
                             from public.boxing_provider_quote_series s, unnest(s.regions) r(region) group by r.region) r),
    'market_keys', (select coalesce(jsonb_object_agg(provider_market_key, n), '{}'::jsonb) from (select provider_market_key, count(*) n from public.boxing_provider_quote_series group by provider_market_key) r),
    'quote_series', (select count(*) from public.boxing_provider_quote_series),
    'provider_quotes', (select count(*) from public.boxing_provider_quotes),
    'raw_observations', (select count(*) from public.boxing_source_observations o join public.boxing_sources s on s.id = o.source_id where s.source_key = 'the_odds_api'),
    'captures', (select count(*) from public.boxing_provider_captures),
    'credits_spent', (select coalesce(sum(credits_cost), 0) from public.boxing_provider_captures),
    'canonical_ticks', (select count(*) from public.boxing_market_ticks),
    'market_moved_events', (select count(*) from public.boxing_news_events where event_type = 'MARKET_MOVED')
  )
$$;

select public.boxing_lockdown();

commit;
