-- PropBetEdge Boxing — immutable odds capture and market normalization (issue #4)
--
-- Source of truth = append-only boxing_market_ticks. Opening / current /
-- closing / consensus / dispersion / freshness are DERIVED (views + functions).
-- Rerunnable.

begin;

-- ---------------------------------------------------------------------------
-- Provider source row: registered, NOT enabled.
-- ---------------------------------------------------------------------------

insert into public.boxing_sources
  (source_key, source_name, source_kind, homepage_url, terms_url, access_mode, rights_state,
   redistribution_allowed, enabled, persistence_allowed, derivative_allowed, display_allowed,
   intended_use, rate_limit_note, rights_note)
values
  ('the_odds_api', 'The Odds API', 'data_provider', 'https://the-odds-api.com/', null,
   'review_required', 'unknown', false, false, false, false, false,
   'Pre-fight and in-play bookmaker prices for sport key boxing_boxing (markets: h2h; totals where offered).',
   'Credits billed per call as regions x markets. Use the unmetered /v4/sports endpoint as preflight.',
   'Technical coverage checked 2026-09-12: boxing_boxing is listed active for the existing PropBetEdge account. '
   'The plan''s persistence, display, derivative-analytics and redistribution terms are not recorded in any PropBetEdge '
   'repository. A key being present is not approval. Record terms_url, contract/plan reference and the rights flags, then enable.')
on conflict (source_key) do nothing;

insert into public.boxing_odds_providers (slug, name, source_id, enabled, metadata)
select 'the_odds_api', 'The Odds API', s.id, false,
       '{"sport_key": "boxing_boxing", "api_version": "v4", "supported_market_keys": ["h2h", "totals"]}'::jsonb
from public.boxing_sources s where s.source_key = 'the_odds_api'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Market / selection metadata
-- ---------------------------------------------------------------------------

alter table public.boxing_markets
  add column if not exists provider_event_id text,
  add column if not exists commence_time timestamptz,
  add column if not exists provider_market_key text;

alter table public.boxing_market_selections
  add column if not exists outcome_name text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_provider_update timestamptz;
alter table public.boxing_market_selections drop constraint if exists boxing_market_selections_key_format;
alter table public.boxing_market_selections add constraint boxing_market_selections_key_format
  check (selection_key ~ '^[a-z0-9_:.-]{1,60}$');

alter table public.boxing_bookmakers add column if not exists region text;

-- A fighter selection must belong to the market's bout.
create or replace function public.boxing_selection_fighter_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.fighter_id is not null and not exists (
    select 1 from public.boxing_markets m
    join public.boxing_bout_participants p on p.bout_id = m.bout_id and p.fighter_id = new.fighter_id
    where m.id = new.market_id) then
    raise exception 'selection_fighter_not_in_bout: fighter % is not a participant of market %', new.fighter_id, new.market_id
      using errcode = 'BX050';
  end if;
  return new;
end $$;
drop trigger if exists boxing_market_selections_fighter_guard on public.boxing_market_selections;
create trigger boxing_market_selections_fighter_guard before insert or update of fighter_id, market_id
  on public.boxing_market_selections for each row execute function public.boxing_selection_fighter_guard();

-- ---------------------------------------------------------------------------
-- Tick dedupe
-- ---------------------------------------------------------------------------
-- A tick is a price CHANGE. An exact re-delivery is refused by a unique index;
-- an unchanged price (same as the latest tick) is skipped by the trigger, so
-- replays and polling never fabricate movement. A -> B -> A reversions are
-- kept because only the latest tick is compared.

create unique index if not exists boxing_market_ticks_exact_key
  on public.boxing_market_ticks (selection_id, provider_timestamp, decimal_odds, american_odds, is_live, market_status) nulls not distinct;

create or replace function public.boxing_market_tick_dedupe()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_latest public.boxing_market_ticks%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('boxing_tick:' || new.selection_id::text, 0));
  select * into v_latest from public.boxing_market_ticks t
  where t.selection_id = new.selection_id
  order by coalesce(t.provider_timestamp, t.captured_at) desc, t.id desc
  limit 1;
  if found
     and v_latest.american_odds is not distinct from new.american_odds
     and v_latest.decimal_odds is not distinct from new.decimal_odds
     and v_latest.is_live = new.is_live
     and v_latest.market_status = new.market_status
     and (new.provider_timestamp is null or v_latest.provider_timestamp is null
          or new.provider_timestamp >= v_latest.provider_timestamp) then
    return null; -- unchanged: not a tick
  end if;
  return new;
end $$;
drop trigger if exists boxing_market_ticks_dedupe on public.boxing_market_ticks;
create trigger boxing_market_ticks_dedupe before insert on public.boxing_market_ticks
  for each row execute function public.boxing_market_tick_dedupe();

create index if not exists boxing_market_ticks_selection_time_idx
  on public.boxing_market_ticks (selection_id, (coalesce(provider_timestamp, captured_at)) desc);

-- ---------------------------------------------------------------------------
-- Unmatched provider events (operational queue; resolution is a state change)
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_market_unmatched (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.boxing_odds_providers(id) on delete restrict,
  provider_event_id text not null,
  reason text not null,
  detail jsonb not null default '{}'::jsonb,
  home_name text,
  away_name text,
  commence_time timestamptz,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seen_count int not null default 1,
  resolved boolean not null default false,
  resolved_bout_id uuid references public.boxing_bouts(id) on delete restrict,
  unique (provider_id, provider_event_id, reason)
);
create index if not exists boxing_market_unmatched_open_idx on public.boxing_market_unmatched (resolved, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- RPCs used by shared/odds/ingest.mjs
-- ---------------------------------------------------------------------------

-- Generic raw observation write (gate + dedupe enforced by triggers).
create or replace function public.boxing_record_observation(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_id uuid;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  insert into public.boxing_source_observations
    (source_id, ingest_run_id, entity_type, external_key, source_url, payload, content_hash, source_published_at, parser_version)
  values (v_src, nullif(p ->> 'ingest_run_id', '')::uuid, p ->> 'entity_type', p ->> 'external_key', p ->> 'source_url',
          coalesce(p -> 'payload', '{}'::jsonb), p ->> 'content_hash', nullif(p ->> 'source_published_at', '')::timestamptz,
          p ->> 'parser_version')
  on conflict on constraint boxing_observations_dedupe_key do nothing
  returning id into v_id;
  if v_id is not null then return jsonb_build_object('id', v_id, 'duplicate', false); end if;
  select id into v_id from public.boxing_source_observations
  where source_id = v_src and entity_type = p ->> 'entity_type'
    and external_key is not distinct from (p ->> 'external_key') and content_hash = p ->> 'content_hash';
  return jsonb_build_object('id', v_id, 'duplicate', true);
end $$;

-- Scheduled bouts in a time window, with canonical corners.
create or replace function public.boxing_market_bouts_in_window(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'bout_id', b.id, 'event_id', e.id, 'status', b.status,
      'starts_at', coalesce(e.start_at, e.event_date::timestamptz),
      'participants', (select jsonb_agg(jsonb_build_object('fighter_id', p.fighter_id, 'side', p.side, 'display_name', f.display_name) order by p.side)
                       from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id
                       where p.bout_id = b.id))
    order by b.id), '[]'::jsonb)
  from public.boxing_bouts b
  join public.boxing_events e on e.id = b.event_id
  where b.status in ('announced','scheduled','in_progress')
    and coalesce(e.start_at, e.event_date::timestamptz) between p_from and p_to
    and (select count(*) from public.boxing_bout_participants p where p.bout_id = b.id) = 2
$$;

create or replace function public.boxing_bouts_for_provider_events(p_namespace text, p_event_ids text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(i.external_id, i.bout_id), '{}'::jsonb)
  from public.boxing_bout_identities i
  where i.namespace = p_namespace and i.external_id = any (p_event_ids) and i.verification_state <> 'rejected'
$$;

-- Maps a provider event id to a bout. Fails closed if the id is already mapped
-- to a different bout (no cross-wiring).
create or replace function public.boxing_map_provider_event(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_existing uuid;
begin
  select bout_id into v_existing from public.boxing_bout_identities
  where namespace = p ->> 'namespace' and external_id = p ->> 'provider_event_id' and verification_state <> 'rejected';
  if v_existing is not null and v_existing <> (p ->> 'bout_id')::uuid then
    return jsonb_build_object('status', 'conflict', 'mapped_bout_id', v_existing);
  end if;
  insert into public.boxing_bout_identities
    (bout_id, source_id, namespace, external_id, verification_state, confidence, evidence)
  values ((p ->> 'bout_id')::uuid, (select id from public.boxing_sources where source_key = p ->> 'source_key'),
          p ->> 'namespace', p ->> 'provider_event_id', coalesce(p ->> 'verification_state', 'probable'),
          coalesce((p ->> 'confidence')::smallint, 0), coalesce(p -> 'evidence', '{}'::jsonb))
  on conflict (namespace, external_id) where verification_state <> 'rejected'
  do update set last_observed_at = now();
  return jsonb_build_object('status', 'mapped', 'bout_id', p ->> 'bout_id');
end $$;

create or replace function public.boxing_record_market_unmatched(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.boxing_market_unmatched
    (provider_id, provider_event_id, reason, detail, home_name, away_name, commence_time, observation_id)
  values ((select id from public.boxing_odds_providers where slug = p ->> 'provider_slug'), p ->> 'provider_event_id',
          p ->> 'reason', coalesce(p -> 'detail', '{}'::jsonb), p ->> 'home_name', p ->> 'away_name',
          nullif(p ->> 'commence_time', '')::timestamptz, nullif(p ->> 'observation_id', '')::uuid)
  on conflict (provider_id, provider_event_id, reason) do update
    set last_seen_at = now(), seen_count = public.boxing_market_unmatched.seen_count + 1, detail = excluded.detail,
        observation_id = coalesce(excluded.observation_id, public.boxing_market_unmatched.observation_id)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- Atomic ingest of one provider event's normalized markets for a matched bout.
create or replace function public.boxing_ingest_market_snapshot(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_provider uuid;
  v_book uuid;
  v_market uuid;
  v_selection uuid;
  v_tick bigint;
  bk jsonb;
  mk jsonb;
  oc jsonb;
  v_inserted int := 0;
  v_skipped int := 0;
  v_markets int := 0;
  v_seen timestamptz := coalesce(nullif(p ->> 'captured_at', '')::timestamptz, now());
begin
  select id into v_provider from public.boxing_odds_providers where slug = p ->> 'provider_slug';
  if v_provider is null then raise exception 'provider_not_registered: %', p ->> 'provider_slug' using errcode = 'BX051'; end if;

  for bk in select * from jsonb_array_elements(coalesce(p -> 'bookmakers', '[]'::jsonb)) loop
    insert into public.boxing_bookmakers (slug, name, region, source_id)
    values (bk ->> 'key', coalesce(bk ->> 'title', bk ->> 'key'), bk ->> 'region',
            (select source_id from public.boxing_odds_providers where id = v_provider))
    on conflict (slug) do update set region = coalesce(public.boxing_bookmakers.region, excluded.region)
    returning id into v_book;

    for mk in select * from jsonb_array_elements(coalesce(bk -> 'markets', '[]'::jsonb)) loop
      insert into public.boxing_markets
        (bout_id, provider_id, bookmaker_id, external_market_id, market_type, market_key, line, period, is_live, status,
         provider_event_id, commence_time, provider_market_key, first_seen_at, last_seen_at)
      values ((p ->> 'bout_id')::uuid, v_provider, v_book, null, mk ->> 'market_type', mk ->> 'market_key',
              nullif(mk ->> 'line', '')::numeric, coalesce(mk ->> 'period', 'fight'), coalesce((mk ->> 'is_live')::boolean, false),
              coalesce(mk ->> 'status', 'open'), p ->> 'provider_event_id', nullif(p ->> 'commence_time', '')::timestamptz,
              mk ->> 'provider_market_key', v_seen, v_seen)
      on conflict (provider_id, bookmaker_id, bout_id, market_key) do update
        set last_seen_at = greatest(public.boxing_markets.last_seen_at, excluded.last_seen_at),
            status = excluded.status, commence_time = coalesce(excluded.commence_time, public.boxing_markets.commence_time),
            provider_event_id = excluded.provider_event_id
      returning id into v_market;
      v_markets := v_markets + 1;

      for oc in select * from jsonb_array_elements(coalesce(mk -> 'outcomes', '[]'::jsonb)) loop
        insert into public.boxing_market_selections (market_id, selection_key, fighter_id, label, outcome_name, line, last_seen_at, last_provider_update)
        values (v_market, oc ->> 'selection_key', nullif(oc ->> 'fighter_id', '')::uuid, oc ->> 'label', oc ->> 'outcome_name',
                nullif(oc ->> 'line', '')::numeric, v_seen, nullif(oc ->> 'provider_timestamp', '')::timestamptz)
        on conflict (market_id, selection_key) do update
          set last_seen_at = greatest(public.boxing_market_selections.last_seen_at, excluded.last_seen_at),
              last_provider_update = greatest(public.boxing_market_selections.last_provider_update, excluded.last_provider_update),
              outcome_name = excluded.outcome_name
        returning id into v_selection;

        v_tick := null;
        insert into public.boxing_market_ticks
          (selection_id, captured_at, american_odds, decimal_odds, implied_probability, provider_timestamp, raw_price,
           is_live, market_status, observation_id, ingest_run_id)
        values (v_selection, v_seen, nullif(oc ->> 'american', '')::int, nullif(oc ->> 'decimal', '')::numeric,
                nullif(oc ->> 'implied', '')::numeric, nullif(oc ->> 'provider_timestamp', '')::timestamptz,
                coalesce(oc -> 'raw', '{}'::jsonb), coalesce((mk ->> 'is_live')::boolean, false), coalesce(mk ->> 'status', 'open'),
                nullif(p ->> 'observation_id', '')::uuid, nullif(p ->> 'ingest_run_id', '')::uuid)
        on conflict do nothing
        returning id into v_tick;
        if v_tick is null then v_skipped := v_skipped + 1; else v_inserted := v_inserted + 1; end if;
      end loop;
    end loop;
  end loop;

  if nullif(p ->> 'observation_id', '') is not null then
    insert into public.boxing_observation_links (observation_id, entity_type, entity_id, link_role, ingest_run_id)
    values ((p ->> 'observation_id')::uuid, 'bout_markets', p ->> 'bout_id', 'supports', nullif(p ->> 'ingest_run_id', '')::uuid)
    on conflict do nothing;
  end if;

  return jsonb_build_object('markets', v_markets, 'ticks_inserted', v_inserted, 'ticks_unchanged', v_skipped);
end $$;

-- ---------------------------------------------------------------------------
-- Freshness (mirrors shared/odds/freshness.mjs; parity is tested)
-- ---------------------------------------------------------------------------

create or replace function public.boxing_market_freshness(
  p_last_seen timestamptz, p_starts_at timestamptz, p_is_live boolean, p_now timestamptz default now()
) returns text language sql immutable set search_path = '' as $$
  select case
    when p_last_seen is null then 'unknown'
    when p_is_live then case when extract(epoch from p_now - p_last_seen) <= 120 then 'live' else 'stale' end
    when p_starts_at is not null and p_now >= p_starts_at then 'closed'
    when extract(epoch from p_now - p_last_seen) <= case
        when p_starts_at is null then 36 * 3600
        when extract(epoch from p_starts_at - p_now) <= 3 * 3600 then 30 * 60
        when extract(epoch from p_starts_at - p_now) <= 24 * 3600 then 2 * 3600
        when extract(epoch from p_starts_at - p_now) <= 7 * 86400 then 12 * 3600
        else 36 * 3600 end then 'fresh'
    else 'stale'
  end
$$;

-- ---------------------------------------------------------------------------
-- Derived prices. Views are security_invoker (cannot bypass RLS).
-- ---------------------------------------------------------------------------

create or replace view public.boxing_market_selection_prices with (security_invoker = true) as
with base as (
  select s.id as selection_id, s.selection_key, s.fighter_id, s.label, s.last_seen_at,
         m.id as market_id, m.bout_id, m.market_type, m.market_key, m.line, m.is_live,
         bk.slug as bookmaker, pr.slug as provider,
         coalesce(m.commence_time, e.start_at, e.event_date::timestamptz) as starts_at
  from public.boxing_market_selections s
  join public.boxing_markets m on m.id = s.market_id
  join public.boxing_bookmakers bk on bk.id = m.bookmaker_id
  join public.boxing_odds_providers pr on pr.id = m.provider_id
  join public.boxing_bouts b on b.id = m.bout_id
  join public.boxing_events e on e.id = b.event_id
)
select b.*,
  o.american_odds as opening_american, o.implied_probability as opening_implied, o.observed_at as opening_at,
  l.american_odds as latest_american, l.implied_probability as latest_implied, l.observed_at as latest_at,
  c.american_odds as closing_american, c.implied_probability as closing_implied, c.observed_at as closing_at,
  (l.american_odds - o.american_odds) as american_change,
  (l.implied_probability - o.implied_probability) as implied_change,
  (select count(*) from public.boxing_market_ticks t where t.selection_id = b.selection_id) as tick_count,
  public.boxing_market_freshness(coalesce(b.last_seen_at, l.captured_at), b.starts_at, b.is_live) as freshness,
  extract(epoch from now() - coalesce(b.last_seen_at, l.captured_at))::int as age_seconds,
  case when public.boxing_market_freshness(coalesce(b.last_seen_at, l.captured_at), b.starts_at, b.is_live) in ('fresh','live')
       then l.american_odds end as current_american,
  case when public.boxing_market_freshness(coalesce(b.last_seen_at, l.captured_at), b.starts_at, b.is_live) in ('fresh','live')
       then l.implied_probability end as current_implied
from base b
left join lateral (
  select t.*, coalesce(t.provider_timestamp, t.captured_at) as observed_at from public.boxing_market_ticks t
  where t.selection_id = b.selection_id and t.market_status = 'open' and t.american_odds is not null
  order by coalesce(t.provider_timestamp, t.captured_at), t.id limit 1) o on true
left join lateral (
  select t.*, coalesce(t.provider_timestamp, t.captured_at) as observed_at from public.boxing_market_ticks t
  where t.selection_id = b.selection_id and t.market_status = 'open' and t.american_odds is not null
  order by coalesce(t.provider_timestamp, t.captured_at) desc, t.id desc limit 1) l on true
left join lateral (
  select t.*, coalesce(t.provider_timestamp, t.captured_at) as observed_at from public.boxing_market_ticks t
  where t.selection_id = b.selection_id and t.market_status = 'open' and t.american_odds is not null
    and not t.is_live and b.starts_at is not null and now() >= b.starts_at
    and coalesce(t.provider_timestamp, t.captured_at) < b.starts_at
  order by coalesce(t.provider_timestamp, t.captured_at) desc, t.id desc limit 1) c on true;

-- Cross-book view per bout / market / selection. Only fresh or live prices
-- participate; stale books are counted separately and never averaged in.
create or replace view public.boxing_market_consensus with (security_invoker = true) as
select bout_id, market_type, market_key, selection_key,
  count(*) filter (where freshness in ('fresh','live')) as bookmaker_count,
  count(*) filter (where freshness = 'stale') as stale_bookmaker_count,
  min(current_american) as min_american,
  max(current_american) as max_american,
  min(current_implied) as min_implied,
  max(current_implied) as max_implied,
  max(current_implied) - min(current_implied) as implied_dispersion,
  percentile_cont(0.5) within group (order by current_implied) as consensus_implied,
  max(latest_at) filter (where freshness in ('fresh','live')) as newest_price_at
from public.boxing_market_selection_prices
group by bout_id, market_type, market_key, selection_key;

-- Tick history for movement detection.
create or replace function public.boxing_market_tick_history(p_bout uuid, p_market_key text, p_since timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'tick_id', t.id, 'bookmaker', bk.slug, 'selection_key', s.selection_key, 'american', t.american_odds,
      'decimal', t.decimal_odds, 'implied', t.implied_probability, 'observed_at', coalesce(t.provider_timestamp, t.captured_at),
      'captured_at', t.captured_at, 'is_live', t.is_live, 'status', t.market_status, 'selection_last_seen_at', s.last_seen_at)
    order by coalesce(t.provider_timestamp, t.captured_at), t.id), '[]'::jsonb)
  from public.boxing_market_ticks t
  join public.boxing_market_selections s on s.id = t.selection_id
  join public.boxing_markets m on m.id = s.market_id
  join public.boxing_bookmakers bk on bk.id = m.bookmaker_id
  where m.bout_id = p_bout and m.market_key = p_market_key
    and (p_since is null or coalesce(t.provider_timestamp, t.captured_at) >= p_since
         or t.id in (  -- plus each selection's last tick before the window (the "then" price)
           select distinct on (t2.selection_id) t2.id from public.boxing_market_ticks t2
           join public.boxing_market_selections s2 on s2.id = t2.selection_id
           join public.boxing_markets m2 on m2.id = s2.market_id
           where m2.bout_id = p_bout and m2.market_key = p_market_key
             and coalesce(t2.provider_timestamp, t2.captured_at) < p_since
           order by t2.selection_id, coalesce(t2.provider_timestamp, t2.captured_at) desc, t2.id desc))
$$;

-- ---------------------------------------------------------------------------
-- Structured news events: one deduped write path for every emitter.
-- ---------------------------------------------------------------------------

create or replace function public.boxing_emit_news_event(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.boxing_news_events
    (event_type, dedupe_key, fighter_id, fighter_ids, bout_id, boxing_event_id, organization_id, source_id,
     occurred_at, detected_at, confidence, payload, sources, state, supersedes_id)
  values (p ->> 'event_type', p ->> 'dedupe_key', nullif(p ->> 'fighter_id', '')::uuid,
          coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p -> 'fighter_ids', '[]'::jsonb)) x), '{}'),
          nullif(p ->> 'bout_id', '')::uuid, nullif(p ->> 'event_id', '')::uuid, nullif(p ->> 'organization_id', '')::uuid,
          (select id from public.boxing_sources where source_key = p ->> 'source_key'),
          nullif(p ->> 'occurred_at', '')::timestamptz, coalesce(nullif(p ->> 'detected_at', '')::timestamptz, now()),
          coalesce((p ->> 'confidence')::smallint, 100),
          p -> 'payload', coalesce(p -> 'sources', '[]'::jsonb),
          case when coalesce((p ->> 'requires_human_review')::boolean, false) then 'needs_review' else 'new' end,
          (select id from public.boxing_news_events where dedupe_key = p ->> 'supersedes_dedupe_key'))
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('inserted', false, 'id', (select id from public.boxing_news_events where dedupe_key = p ->> 'dedupe_key'));
  end if;
  return jsonb_build_object('inserted', true, 'id', v_id);
end $$;

create or replace function public.boxing_recent_news_events(p_event_type text, p_bout uuid, p_since timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'dedupe_key', n.dedupe_key, 'detected_at', n.detected_at,
                                               'payload', n.payload) order by n.detected_at desc), '[]'::jsonb)
  from public.boxing_news_events n
  where n.event_type = p_event_type and n.bout_id = p_bout and n.detected_at >= p_since
$$;

select public.boxing_lockdown();

commit;
