-- PropBetEdge Boxing — The Odds API rights decision + provider-level market
-- ledger (issue #4, forward capture)
--
-- 1. Records the 2026-09-13 terms review of The Odds API as an append-only
--    rights review and approves the source for ingestion, persistent storage,
--    first-party display, derived analytics and model training. Raw
--    redistribution stays prohibited (redistribution_allowed = false).
-- 2. Adds a provider-level ledger that preserves every provider event,
--    participant name and price change EVEN WHEN no canonical bout matches:
--      raw observation -> provider event/participants -> provider quote series
--      -> append-only provider quotes; canonical resolution is attempted
--      separately and never creates fighters.
-- 3. Adds an append-only capture log so every provider call is traceable
--    (credits, http status, observation reference), including polls whose
--    prices were unchanged.
-- Rerunnable.

begin;

-- ---------------------------------------------------------------------------
-- Rights reviews (append-only history of source terms decisions)
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_source_rights_reviews (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  reviewed_at timestamptz not null,
  reviewed_by text not null,
  terms_url text not null,
  terms_last_updated date,
  terms_sha256 text,
  decision text not null check (decision in ('approved','approved_with_restrictions','reference_only','blocked','review_required')),
  permitted_uses text[] not null default '{}',
  prohibited_uses text[] not null default '{}',
  attribution text,
  account_agreement_found boolean not null,
  account_scope_note text,
  next_review_due date,
  notes text,
  created_at timestamptz not null default now(),
  unique (source_id, reviewed_at)
);
select public.boxing_install_append_only('public.boxing_source_rights_reviews');

alter table public.boxing_sources
  add column if not exists terms_last_updated date,
  add column if not exists next_review_due date,
  add column if not exists latest_rights_review_id uuid references public.boxing_source_rights_reviews(id) on delete restrict;

do $$
declare
  v_src uuid;
  v_review uuid;
begin
  select id into v_src from public.boxing_sources where source_key = 'the_odds_api';
  insert into public.boxing_source_rights_reviews
    (source_id, reviewed_at, reviewed_by, terms_url, terms_last_updated, terms_sha256, decision, permitted_uses, prohibited_uses,
     attribution, account_agreement_found, account_scope_note, next_review_due, notes)
  values (v_src, '2026-09-13T00:00:00Z', 'PropBetEdge owner direction; terms read from the official page by Claude Code session 2026-09-13',
    'https://the-odds-api.com/terms-and-conditions.html', '2026-08-31',
    'f4d79e4016d470b65ab20d733b0d7918ac3fcfde36babdb7c83a4de21af8f660',
    'approved_with_restrictions',
    array['store market data and retain it indefinitely',
          'display in first-party websites, apps and dashboards, including commercial use',
          'research and analytical dashboards',
          'calculate and display derived values (consensus, movement, dispersion, fair prices)',
          'train statistical and machine learning models'],
    array['resell, repackage or redistribute the data as a standalone data product',
          'offer the data through our own API, data feed or downloadable files intended as a raw data source for others',
          'any product where the provider data is the primary product being sold'],
    'Not required ("always appreciated").',
    false,
    'Self-serve subscription (100,000 credits/month observed 2026-09-13, shared with PropBetEdge NFL and UFC). No account-specific agreement, contract or enterprise terms found in PropBetEdge repositories, secrets or records; the public terms govern.',
    '2026-12-13',
    'Terms change on posting; material changes are emailed to registered users. Re-review on any notice, before any external API/partner offering, and by next_review_due. Terms page sha256 recorded for change detection.')
  on conflict (source_id, reviewed_at) do nothing;
  select id into v_review from public.boxing_source_rights_reviews where source_id = v_src and reviewed_at = '2026-09-13T00:00:00Z';

  update public.boxing_sources set
    terms_url = 'https://the-odds-api.com/terms-and-conditions.html',
    homepage_url = 'https://the-odds-api.com/',
    license_name = 'The Odds API Terms and Conditions (last updated 2026-08-31)',
    contract_reference = 'Self-serve subscription under public terms; no account-specific agreement found (review 2026-09-13)',
    terms_last_updated = '2026-08-31',
    next_review_due = '2026-12-13',
    latest_rights_review_id = v_review,
    access_mode = 'approved_ingest',
    rights_state = 'approved',
    persistence_allowed = true,
    derivative_allowed = true,
    display_allowed = true,
    redistribution_allowed = false,
    attribution_required = 'not required',
    intended_use = 'Forward capture of boxing_boxing bookmaker prices (h2h; totals where offered) for first-party PropBetEdge display, market history, derived analytics and models. Never exposed as a raw feed.',
    rights_note = 'APPROVED WITH RESTRICTION (review 2026-09-13): ingest, store indefinitely, first-party UI/analytics, derived metrics and ML are permitted by the public terms. Raw redistribution (our own API/feed/downloadable files of provider data) is prohibited; the boxing gateway must only serve summarized first-party views.',
    rate_limit_note = 'Credits per call = regions x markets (/odds). /sports and /events are unmetered. Shared 100k/month plan: respect ODDS_MIN_REMAINING and the boxing monthly budget.',
    reviewed_at = '2026-09-13T00:00:00Z',
    reviewed_by = 'PropBetEdge owner direction (terms review 2026-09-13)',
    enabled = true
  where id = v_src and latest_rights_review_id is null;
end $$;

update public.boxing_odds_providers set enabled = true,
  metadata = metadata || '{"supported_market_keys": ["h2h", "totals"], "ledger_market_keys": "all returned markets are preserved in boxing_provider_quotes"}'::jsonb
where slug = 'the_odds_api' and not enabled;

-- ---------------------------------------------------------------------------
-- Provider-level ledger (survives unmatched canonical resolution)
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_provider_events (
  provider_id uuid not null references public.boxing_odds_providers(id) on delete restrict,
  provider_event_id text not null,
  sport_key text not null,
  home_name text not null,
  away_name text not null,
  first_commence_time timestamptz,
  last_commence_time timestamptz,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  first_observation_id uuid not null references public.boxing_source_observations(id) on delete restrict,
  last_observation_id uuid not null references public.boxing_source_observations(id) on delete restrict,
  seen_count int not null default 1,
  primary key (provider_id, provider_event_id)
);
drop trigger if exists boxing_provider_events_guard on public.boxing_provider_events;
create trigger boxing_provider_events_guard before update or delete on public.boxing_provider_events
  for each row execute function public.boxing_guard_mutable_columns('last_commence_time', 'last_seen_at', 'last_observation_id', 'seen_count');

-- Provider participant names exactly as delivered. The Odds API has no
-- participant ids, so the verbatim name IS the provider identity. A name is
-- never turned into a canonical fighter here.
create table if not exists public.boxing_provider_participants (
  provider_id uuid not null references public.boxing_odds_providers(id) on delete restrict,
  participant_name text not null check (length(participant_name) between 1 and 200),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  first_observation_id uuid not null references public.boxing_source_observations(id) on delete restrict,
  seen_count int not null default 1,
  primary key (provider_id, participant_name)
);
drop trigger if exists boxing_provider_participants_guard on public.boxing_provider_participants;
create trigger boxing_provider_participants_guard before update or delete on public.boxing_provider_participants
  for each row execute function public.boxing_guard_mutable_columns('last_seen_at', 'seen_count');

create table if not exists public.boxing_provider_event_participants (
  provider_id uuid not null,
  provider_event_id text not null,
  participant_name text not null,
  role text not null check (role in ('home','away')),
  first_seen_at timestamptz not null,
  first_observation_id uuid not null references public.boxing_source_observations(id) on delete restrict,
  primary key (provider_id, provider_event_id, role, participant_name),
  foreign key (provider_id, provider_event_id) references public.boxing_provider_events(provider_id, provider_event_id) on delete restrict,
  foreign key (provider_id, participant_name) references public.boxing_provider_participants(provider_id, participant_name) on delete restrict
);
select public.boxing_install_append_only('public.boxing_provider_event_participants');

create table if not exists public.boxing_provider_quote_series (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  provider_event_id text not null,
  region text not null,
  bookmaker_key text not null,
  bookmaker_title text,
  provider_market_key text not null,
  outcome_name text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  last_provider_update timestamptz,
  last_observation_id uuid not null references public.boxing_source_observations(id) on delete restrict,
  unique (provider_id, provider_event_id, bookmaker_key, provider_market_key, outcome_name),
  foreign key (provider_id, provider_event_id) references public.boxing_provider_events(provider_id, provider_event_id) on delete restrict
);
drop trigger if exists boxing_provider_quote_series_guard on public.boxing_provider_quote_series;
create trigger boxing_provider_quote_series_guard before update or delete on public.boxing_provider_quote_series
  for each row execute function public.boxing_guard_mutable_columns('last_seen_at', 'last_provider_update', 'last_observation_id');

create table if not exists public.boxing_provider_quotes (
  id bigint generated always as identity primary key,
  series_id uuid not null references public.boxing_provider_quote_series(id) on delete restrict,
  point numeric(8,2),
  price_american int not null check (price_american <= -100 or price_american >= 100),
  price_decimal numeric(12,6) not null check (price_decimal > 1),
  implied_probability numeric(10,8) not null check (implied_probability > 0 and implied_probability < 1),
  provider_last_update timestamptz,
  commence_time timestamptz,
  is_live boolean not null,
  captured_at timestamptz not null,
  observation_id uuid not null references public.boxing_source_observations(id) on delete restrict,
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict
);
select public.boxing_install_append_only('public.boxing_provider_quotes');
create unique index if not exists boxing_provider_quotes_exact_key
  on public.boxing_provider_quotes (series_id, provider_last_update, price_american, point, is_live) nulls not distinct;
create index if not exists boxing_provider_quotes_series_time_idx
  on public.boxing_provider_quotes (series_id, (coalesce(provider_last_update, captured_at)) desc);

-- A provider quote is a CHANGE (price, line or live state). Re-confirmation of
-- an unchanged price only moves the series' last_seen_at.
create or replace function public.boxing_provider_quote_dedupe()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_latest public.boxing_provider_quotes%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('boxing_pquote:' || new.series_id::text, 0));
  select * into v_latest from public.boxing_provider_quotes q where q.series_id = new.series_id
  order by coalesce(q.provider_last_update, q.captured_at) desc, q.id desc limit 1;
  if found and v_latest.price_american = new.price_american and v_latest.point is not distinct from new.point
     and v_latest.is_live = new.is_live
     and (new.provider_last_update is null or v_latest.provider_last_update is null or new.provider_last_update >= v_latest.provider_last_update) then
    return null;
  end if;
  return new;
end $$;
drop trigger if exists boxing_provider_quotes_dedupe on public.boxing_provider_quotes;
create trigger boxing_provider_quotes_dedupe before insert on public.boxing_provider_quotes
  for each row execute function public.boxing_provider_quote_dedupe();

-- Every provider call, including unchanged and failed ones.
create table if not exists public.boxing_provider_captures (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.boxing_odds_providers(id) on delete restrict,
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict,
  endpoint text not null check (endpoint in ('odds','events','sports','event_markets')),
  region text,
  markets text[] not null default '{}',
  requested_at timestamptz not null,
  http_status int not null,
  credits_cost int,
  credits_used int,
  credits_remaining int,
  events_returned int,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  observation_duplicate boolean,
  quotes_inserted int,
  quotes_unchanged int,
  error text,
  created_at timestamptz not null default now()
);
select public.boxing_install_append_only('public.boxing_provider_captures');
create index if not exists boxing_provider_captures_time_idx on public.boxing_provider_captures (provider_id, requested_at desc);

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

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
        (provider_id, provider_event_id, region, bookmaker_key, bookmaker_title, provider_market_key, outcome_name,
         first_seen_at, last_seen_at, last_provider_update, last_observation_id)
      values (v_provider.id, ev ->> 'provider_event_id', v_region, q ->> 'bookmaker_key', q ->> 'bookmaker_title', q ->> 'market_key',
              q ->> 'outcome_name', v_seen, v_seen, nullif(q ->> 'provider_last_update', '')::timestamptz, v_obs)
      on conflict (provider_id, provider_event_id, bookmaker_key, provider_market_key, outcome_name) do update
        set last_seen_at = greatest(s.last_seen_at, excluded.last_seen_at),
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

create or replace function public.boxing_record_provider_capture(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.boxing_provider_captures
    (provider_id, ingest_run_id, endpoint, region, markets, requested_at, http_status, credits_cost, credits_used, credits_remaining,
     events_returned, observation_id, observation_duplicate, quotes_inserted, quotes_unchanged, error)
  values ((select id from public.boxing_odds_providers where slug = p ->> 'provider_slug'), nullif(p ->> 'ingest_run_id', '')::uuid,
          p ->> 'endpoint', p ->> 'region',
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'markets', '[]'::jsonb)) x), '{}'),
          coalesce(nullif(p ->> 'requested_at', '')::timestamptz, now()), (p ->> 'http_status')::int,
          nullif(p ->> 'credits_cost', '')::int, nullif(p ->> 'credits_used', '')::int, nullif(p ->> 'credits_remaining', '')::int,
          nullif(p ->> 'events_returned', '')::int, nullif(p ->> 'observation_id', '')::uuid, (p ->> 'observation_duplicate')::boolean,
          nullif(p ->> 'quotes_inserted', '')::int, nullif(p ->> 'quotes_unchanged', '')::int, left(p ->> 'error', 300))
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- Scheduling inputs: last successful capture, credits spent, next provider
-- start times (placeholder-suspect times flagged: several pairings sharing one
-- odd timestamp far out are provider placeholders, not fight dates).
create or replace function public.boxing_odds_schedule_state(p_now timestamptz default now())
returns jsonb language sql stable set search_path = '' as $$
  with pr as (select id from public.boxing_odds_providers where slug = 'the_odds_api'),
  upcoming as (
    select e.provider_event_id, e.last_commence_time,
           (select count(*) from public.boxing_provider_events x, pr
             where x.provider_id = pr.id and x.last_commence_time = e.last_commence_time) as same_time_events
    from public.boxing_provider_events e, pr
    where e.provider_id = pr.id and e.last_commence_time > p_now - interval '6 hours'
      and e.last_seen_at > p_now - interval '3 days'
  )
  select jsonb_build_object(
    'now', p_now,
    'last_capture_at', (select max(c.requested_at) from public.boxing_provider_captures c, pr
                        where c.provider_id = pr.id and c.endpoint = 'odds' and c.http_status = 200),
    'credits_24h', (select coalesce(sum(c.credits_cost), 0) from public.boxing_provider_captures c, pr
                    where c.provider_id = pr.id and c.requested_at > p_now - interval '24 hours'),
    'credits_30d', (select coalesce(sum(c.credits_cost), 0) from public.boxing_provider_captures c, pr
                    where c.provider_id = pr.id and c.requested_at > p_now - interval '30 days'),
    'known_events', (select count(*) from upcoming),
    'next_commence_times', (select coalesce(jsonb_agg(jsonb_build_object('commence_time', u.last_commence_time, 'events', u.n, 'placeholder_suspect', u.suspect)
                              order by u.last_commence_time), '[]'::jsonb)
                            from (select last_commence_time, count(*) n, bool_or(same_time_events >= 3 and extract(second from last_commence_time) = 0
                                          and extract(minute from last_commence_time) not in (0, 15, 30, 45)) suspect
                                  from upcoming group by last_commence_time order by last_commence_time limit 20) u)
  )
$$;

-- ---------------------------------------------------------------------------
-- Derived provider prices (same rules as boxing_market_selection_prices)
-- ---------------------------------------------------------------------------

create or replace view public.boxing_provider_quote_prices with (security_invoker = true) as
with base as (
  select s.id as series_id, s.provider_event_id, s.region, s.bookmaker_key, s.provider_market_key, s.outcome_name, s.last_seen_at,
         e.home_name, e.away_name, e.last_commence_time as starts_at, pr.slug as provider
  from public.boxing_provider_quote_series s
  join public.boxing_provider_events e on e.provider_id = s.provider_id and e.provider_event_id = s.provider_event_id
  join public.boxing_odds_providers pr on pr.id = s.provider_id
)
select b.*,
  o.price_american as opening_american, o.implied_probability as opening_implied, o.point as opening_point, o.observed_at as opening_at,
  l.price_american as latest_american, l.implied_probability as latest_implied, l.point as latest_point, l.observed_at as latest_at, l.is_live as latest_is_live,
  c.price_american as closing_american, c.implied_probability as closing_implied, c.point as closing_point, c.observed_at as closing_at,
  (l.price_american - o.price_american) as american_change,
  (l.implied_probability - o.implied_probability) as implied_change,
  (select count(*) from public.boxing_provider_quotes q where q.series_id = b.series_id) as quote_count,
  public.boxing_market_freshness(b.last_seen_at, b.starts_at, coalesce(l.is_live, false)) as freshness,
  extract(epoch from now() - b.last_seen_at)::int as age_seconds,
  case when public.boxing_market_freshness(b.last_seen_at, b.starts_at, coalesce(l.is_live, false)) in ('fresh','live') then l.price_american end as current_american,
  case when public.boxing_market_freshness(b.last_seen_at, b.starts_at, coalesce(l.is_live, false)) in ('fresh','live') then l.implied_probability end as current_implied
from base b
left join lateral (
  select q.*, coalesce(q.provider_last_update, q.captured_at) as observed_at from public.boxing_provider_quotes q
  where q.series_id = b.series_id order by coalesce(q.provider_last_update, q.captured_at), q.id limit 1) o on true
left join lateral (
  select q.*, coalesce(q.provider_last_update, q.captured_at) as observed_at from public.boxing_provider_quotes q
  where q.series_id = b.series_id order by coalesce(q.provider_last_update, q.captured_at) desc, q.id desc limit 1) l on true
left join lateral (
  select q.*, coalesce(q.provider_last_update, q.captured_at) as observed_at from public.boxing_provider_quotes q
  where q.series_id = b.series_id and not q.is_live and b.starts_at is not null and now() >= b.starts_at
    and coalesce(q.provider_last_update, q.captured_at) < b.starts_at
  order by coalesce(q.provider_last_update, q.captured_at) desc, q.id desc limit 1) c on true;

create or replace view public.boxing_provider_event_consensus with (security_invoker = true) as
select provider, provider_event_id, home_name, away_name, starts_at, provider_market_key, outcome_name, latest_point,
  count(*) filter (where freshness in ('fresh','live')) as bookmaker_count,
  count(*) filter (where freshness = 'stale') as stale_bookmaker_count,
  min(current_american) as min_american,
  max(current_american) as max_american,
  max(current_implied) - min(current_implied) as implied_dispersion,
  percentile_cont(0.5) within group (order by current_implied) as consensus_implied,
  max(latest_at) filter (where freshness in ('fresh','live')) as newest_price_at
from public.boxing_provider_quote_prices
group by provider, provider_event_id, home_name, away_name, starts_at, provider_market_key, outcome_name, latest_point;

-- Provider names with their canonical resolution state. Resolution only via
-- boxing_fighter_identities (namespace the_odds_api.participant); never by
-- display-name joins.
create or replace view public.boxing_provider_participant_resolution with (security_invoker = true) as
select pp.participant_name, pp.first_seen_at, pp.last_seen_at, pp.seen_count,
  i.fighter_id, case when i.fighter_id is null then 'unresolved' else i.verification_state end as resolution_state,
  (select count(*) from public.boxing_provider_event_participants ep where ep.provider_id = pp.provider_id and ep.participant_name = pp.participant_name) as provider_events
from public.boxing_provider_participants pp
join public.boxing_odds_providers pr on pr.id = pp.provider_id
left join public.boxing_fighter_identities i on i.namespace = 'the_odds_api.participant' and i.external_id = pp.participant_name
  and i.verification_state <> 'rejected';

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
    'bookmakers_by_region', (select coalesce(jsonb_object_agg(region, n), '{}'::jsonb) from (select region, count(distinct bookmaker_key) n from public.boxing_provider_quote_series group by region) r),
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
