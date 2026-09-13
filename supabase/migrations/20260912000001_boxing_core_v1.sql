-- PropBetEdge Boxing Core v1
-- Data-first canonical boxing graph. The frontend is a downstream consumer.
--
-- Design rules:
--   * canonical IDs, never durable joins by display name
--   * source rights/provenance enforced in schema
--   * raw observations preserved separately from normalized facts
--   * ranking/market/fight-state history is append-oriented
--   * derived intelligence never overwrites source facts

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Sources and ingest audit
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  source_kind text not null check (source_kind in (
    'internal','commission','sanctioning_body','promotion','broadcaster',
    'data_provider','open_data','media','reference','bookmaker','exchange','other'
  )),
  homepage_url text,
  terms_url text,
  license_name text,
  access_mode text not null default 'review_required' check (access_mode in (
    'approved_ingest','identity_only','reference_only','review_required','blocked'
  )),
  rights_state text not null default 'unknown' check (rights_state in (
    'internal','approved','reference_only','unknown','prohibited'
  )),
  redistribution_allowed boolean not null default false,
  enabled boolean not null default false,
  rights_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not enabled or access_mode <> 'blocked'),
  check (not redistribution_allowed or rights_state in ('internal','approved'))
);

insert into public.boxing_sources
  (source_key, source_name, source_kind, homepage_url, license_name, access_mode, rights_state, redistribution_allowed, enabled, rights_note, reviewed_at)
values
  ('pbe_boxing_internal', 'PropBetEdge Boxing canonical graph', 'internal', null, 'internal normalized facts', 'approved_ingest', 'internal', true, true,
   'First-party normalized/derived records. Upstream source rights remain attached to observations.', now()),
  ('wikidata', 'Wikidata', 'open_data', 'https://www.wikidata.org/', 'CC0 1.0', 'approved_ingest', 'approved', true, true,
   'Open identity/reference enrichment. Absence is never evidence that a bout or fighter does not exist.', now()),
  ('boxrec', 'BoxRec', 'reference', 'https://boxrec.com/', null, 'review_required', 'unknown', false, false,
   'High-value identity/career candidate. Do not automate or persist broad facts until commercial/API terms are reviewed.', null),
  ('compubox', 'CompuBox', 'data_provider', 'https://www.compuboxdata.com/', null, 'review_required', 'unknown', false, false,
   'Punch-stat candidate. Requires rights review for persistence, derived analytics and product display.', null),
  ('wbc_official', 'World Boxing Council', 'sanctioning_body', 'https://wbcboxing.com/', null, 'review_required', 'unknown', false, false,
   'Candidate official source for WBC title/ranking state. Adapter approval is separate.', null),
  ('wba_official', 'World Boxing Association', 'sanctioning_body', 'https://www.wbaboxing.com/', null, 'review_required', 'unknown', false, false,
   'Candidate official source for WBA title/ranking state. Adapter approval is separate.', null),
  ('ibf_official', 'International Boxing Federation', 'sanctioning_body', 'https://www.ibf-usba-boxing.com/', null, 'review_required', 'unknown', false, false,
   'Candidate official source for IBF title/ranking state. Adapter approval is separate.', null),
  ('wbo_official', 'World Boxing Organization', 'sanctioning_body', 'https://www.wboboxing.com/', null, 'review_required', 'unknown', false, false,
   'Candidate official source for WBO title/ranking state. Adapter approval is separate.', null),
  ('commission_official', 'Athletic commission source', 'commission', null, null, 'review_required', 'unknown', false, false,
   'Placeholder only. Each jurisdiction must receive a concrete source row and terms review.', null),
  ('promotion_official', 'Promotion official source', 'promotion', null, null, 'review_required', 'unknown', false, false,
   'Placeholder only. Each promotion must receive a concrete source row and terms review.', null),
  ('odds_provider', 'Odds provider', 'data_provider', null, null, 'review_required', 'unknown', false, false,
   'Placeholder only. Enable after storage/display/derivative rights and plan limits are confirmed.', null)
on conflict (source_key) do nothing;

create table if not exists public.boxing_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  worker text not null,
  adapter_version text,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','ok','partial','failed','blocked')),
  observed_count int not null default 0,
  canonical_writes int not null default 0,
  review_items int not null default 0,
  error_count int not null default 0,
  assertions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists boxing_ingest_runs_worker_idx on public.boxing_ingest_runs (worker, started_at desc);

create table if not exists public.boxing_source_observations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete set null,
  entity_type text not null,
  external_key text,
  source_url text,
  payload jsonb not null default '{}'::jsonb,
  content_hash text,
  observed_at timestamptz not null default now(),
  parser_version text,
  canonicalized_at timestamptz,
  canonical_entity_type text,
  canonical_entity_id uuid
);
create index if not exists boxing_observations_source_idx on public.boxing_source_observations (source_id, observed_at desc);
create index if not exists boxing_observations_external_idx on public.boxing_source_observations (entity_type, external_key);

-- ---------------------------------------------------------------------------
-- Fighter identity
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_fighters (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxer_' || replace(gen_random_uuid()::text, '-', '')),
  display_name text not null,
  normalized_name text,
  nickname text,
  dob date,
  nationality text,
  birth_country text,
  hometown text,
  stance text check (stance is null or stance in ('orthodox','southpaw','switch','unknown')),
  height_cm numeric(6,2),
  reach_cm numeric(6,2),
  career_status text not null default 'unknown' check (career_status in ('active','inactive','retired','deceased','unknown')),
  pro_debut_date date,
  sex text check (sex is null or sex in ('male','female','other','unknown')),
  identity_state text not null default 'review_required' check (identity_state in ('verified','source_native','review_required','merged')),
  merged_into_id uuid references public.boxing_fighters(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((identity_state = 'merged') = (merged_into_id is not null)),
  check (merged_into_id is null or merged_into_id <> id)
);
create index if not exists boxing_fighters_name_idx on public.boxing_fighters (lower(display_name));
create index if not exists boxing_fighters_status_idx on public.boxing_fighters (career_status, identity_state);

create table if not exists public.boxing_fighter_identities (
  id uuid primary key default gen_random_uuid(),
  fighter_id uuid not null references public.boxing_fighters(id) on delete cascade,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  namespace text not null,
  external_id text not null,
  external_url text,
  source_display_name text,
  source_dob date,
  verification_state text not null default 'review' check (verification_state in ('verified','probable','review','rejected')),
  confidence smallint not null default 0 check (confidence between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  unique (namespace, external_id)
);
create index if not exists boxing_fighter_identities_fighter_idx on public.boxing_fighter_identities (fighter_id);
create index if not exists boxing_fighter_identities_verify_idx on public.boxing_fighter_identities (verification_state, confidence desc);

create table if not exists public.boxing_fighter_aliases (
  id uuid primary key default gen_random_uuid(),
  fighter_id uuid not null references public.boxing_fighters(id) on delete cascade,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  alias text not null,
  normalized text not null,
  kind text not null default 'name' check (kind in ('name','nickname','transliteration','former_name','other')),
  verification_state text not null default 'verified' check (verification_state in ('verified','review','rejected')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fighter_id, normalized, kind)
);
create index if not exists boxing_fighter_aliases_norm_idx on public.boxing_fighter_aliases (normalized);

create table if not exists public.boxing_identity_review_queue (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  raw_external_id text,
  raw_name text not null,
  raw_dob date,
  candidate_fighter_ids uuid[] not null default '{}',
  reason text not null,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','resolved','rejected')),
  resolved_fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status = 'resolved') = (resolved_fighter_id is not null))
);
create index if not exists boxing_identity_review_status_idx on public.boxing_identity_review_queue (status, created_at);

-- ---------------------------------------------------------------------------
-- Organizations, commissions, divisions, venues
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_organizations (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxorg_' || replace(gen_random_uuid()::text, '-', '')),
  slug text not null unique,
  name text not null,
  short_name text,
  organization_kind text not null check (organization_kind in ('sanctioning_body','promoter','broadcaster','governing_body','media','other')),
  country_code text,
  website_url text,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boxing_commissions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxcommission_' || replace(gen_random_uuid()::text, '-', '')),
  slug text not null unique,
  name text not null,
  jurisdiction text,
  country_code text,
  region_code text,
  website_url text,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boxing_weight_classes (
  id uuid primary key default gen_random_uuid(),
  class_key text not null unique,
  name text not null,
  alternate_names text[] not null default '{}',
  max_weight_lb numeric(6,2),
  max_weight_kg numeric(6,2),
  gender_scope text not null default 'all' check (gender_scope in ('all','male','female','other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boxing_venues (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxvenue_' || replace(gen_random_uuid()::text, '-', '')),
  name text not null,
  city text,
  region text,
  country_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists boxing_venues_location_idx on public.boxing_venues (country_code, region, city);

-- ---------------------------------------------------------------------------
-- Events, bouts and participants
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_events (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxevent_' || replace(gen_random_uuid()::text, '-', '')),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  external_event_id text,
  name text not null,
  event_date date,
  start_at timestamptz,
  venue_id uuid references public.boxing_venues(id) on delete restrict,
  commission_id uuid references public.boxing_commissions(id) on delete restrict,
  status text not null default 'unknown' check (status in ('announced','scheduled','in_progress','complete','postponed','cancelled','unknown')),
  broadcast_notes text,
  source_url text,
  source_record jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_event_id)
);
create index if not exists boxing_events_date_idx on public.boxing_events (event_date desc);
create index if not exists boxing_events_status_idx on public.boxing_events (status, event_date);

create table if not exists public.boxing_event_organizations (
  event_id uuid not null references public.boxing_events(id) on delete cascade,
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  role text not null check (role in ('promoter','co_promoter','broadcaster','sanctioning_body','partner','other')),
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  primary key (event_id, organization_id, role)
);

create table if not exists public.boxing_bouts (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxbout_' || replace(gen_random_uuid()::text, '-', '')),
  event_id uuid not null references public.boxing_events(id) on delete cascade,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  external_bout_id text,
  weight_class_id uuid references public.boxing_weight_classes(id) on delete restrict,
  contracted_weight_lb numeric(6,2),
  scheduled_rounds int check (scheduled_rounds is null or scheduled_rounds between 1 and 15),
  round_minutes int check (round_minutes is null or round_minutes between 1 and 5),
  competition_class text not null default 'professional' check (competition_class in ('professional','amateur','exhibition','unknown')),
  bout_order int,
  status text not null default 'unknown' check (status in ('announced','scheduled','in_progress','complete','cancelled','replaced','unknown')),
  source_url text,
  source_record jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_bout_id)
);
create index if not exists boxing_bouts_event_idx on public.boxing_bouts (event_id, bout_order);

create table if not exists public.boxing_bout_participants (
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  side text not null check (side in ('a','b')),
  record_wins int,
  record_losses int,
  record_draws int,
  record_no_contests int,
  ranking_context jsonb not null default '{}'::jsonb,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  primary key (bout_id, fighter_id),
  unique (bout_id, side)
);
create index if not exists boxing_bout_participants_fighter_idx on public.boxing_bout_participants (fighter_id, bout_id);

create table if not exists public.boxing_bout_results (
  bout_id uuid primary key references public.boxing_bouts(id) on delete cascade,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  outcome text not null check (outcome in ('win','draw','no_contest','technical_draw','unknown')),
  winner_id uuid references public.boxing_fighters(id) on delete restrict,
  method text check (method is null or method in ('KO','TKO','RTD','UD','SD','MD','DQ','TD','DRAW','NC','OTHER')),
  method_raw text,
  round int check (round is null or round between 1 and 15),
  time_sec int check (time_sec is null or time_sec >= 0),
  result_notes text,
  source_url text,
  source_record jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  check ((outcome = 'win' and winner_id is not null) or (outcome <> 'win' and winner_id is null))
);

-- ---------------------------------------------------------------------------
-- Titles and rankings
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_titles (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxtitle_' || replace(gen_random_uuid()::text, '-', '')),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  weight_class_id uuid references public.boxing_weight_classes(id) on delete restrict,
  title_key text not null,
  name text not null,
  title_type text not null default 'world',
  gender_scope text not null default 'all' check (gender_scope in ('all','male','female','other')),
  active boolean not null default true,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, title_key)
);

create table if not exists public.boxing_bout_titles (
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  title_id uuid not null references public.boxing_titles(id) on delete restrict,
  status text not null default 'contested' check (status in ('contested','defended','won_vacant','unification','undisputed','other')),
  source_id uuid references public.boxing_sources(id) on delete restrict,
  primary key (bout_id, title_id)
);

create table if not exists public.boxing_title_reigns (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.boxing_titles(id) on delete restrict,
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  status text not null check (status in ('champion','interim','regular','super','franchise','vacant','other')),
  started_on date,
  ended_on date,
  won_bout_id uuid references public.boxing_bouts(id) on delete set null,
  ended_bout_id uuid references public.boxing_bouts(id) on delete set null,
  ended_reason text,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  captured_at timestamptz not null default now(),
  check (ended_on is null or started_on is null or ended_on >= started_on),
  check (status = 'vacant' or fighter_id is not null)
);
create index if not exists boxing_title_reigns_title_idx on public.boxing_title_reigns (title_id, started_on desc);
create index if not exists boxing_title_reigns_fighter_idx on public.boxing_title_reigns (fighter_id, started_on desc);

create table if not exists public.boxing_ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  weight_class_id uuid not null references public.boxing_weight_classes(id) on delete restrict,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  published_on date,
  effective_on date,
  source_url text,
  source_record jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  unique (organization_id, weight_class_id, source_id, published_on, effective_on)
);
create index if not exists boxing_rankings_snapshot_idx on public.boxing_ranking_snapshots (organization_id, weight_class_id, coalesce(effective_on, published_on) desc);

create table if not exists public.boxing_ranking_entries (
  snapshot_id uuid not null references public.boxing_ranking_snapshots(id) on delete cascade,
  rank int not null check (rank >= 0),
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  source_name text,
  designation text,
  mandatory boolean,
  metadata jsonb not null default '{}'::jsonb,
  primary key (snapshot_id, rank),
  unique (snapshot_id, fighter_id)
);

-- ---------------------------------------------------------------------------
-- Officials, scorecards and weigh-ins
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_officials (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxofficial_' || replace(gen_random_uuid()::text, '-', '')),
  display_name text not null,
  normalized_name text,
  country_code text,
  official_type text not null check (official_type in ('judge','referee','inspector','other')),
  identity_state text not null default 'review_required' check (identity_state in ('verified','source_native','review_required','merged')),
  merged_into_id uuid references public.boxing_officials(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((identity_state = 'merged') = (merged_into_id is not null))
);
create index if not exists boxing_officials_name_idx on public.boxing_officials (lower(display_name));

create table if not exists public.boxing_official_identities (
  id uuid primary key default gen_random_uuid(),
  official_id uuid not null references public.boxing_officials(id) on delete cascade,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  namespace text not null,
  external_id text not null,
  external_url text,
  confidence smallint not null default 0 check (confidence between 0 and 100),
  verification_state text not null default 'review' check (verification_state in ('verified','probable','review','rejected')),
  evidence jsonb not null default '{}'::jsonb,
  unique (namespace, external_id)
);

create table if not exists public.boxing_bout_officials (
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  official_id uuid not null references public.boxing_officials(id) on delete restrict,
  role text not null check (role in ('referee','judge','inspector','other')),
  slot int,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  primary key (bout_id, official_id, role)
);
create index if not exists boxing_bout_officials_official_idx on public.boxing_bout_officials (official_id, bout_id);

create table if not exists public.boxing_scorecards (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  judge_id uuid not null references public.boxing_officials(id) on delete restrict,
  fighter_a_id uuid not null references public.boxing_fighters(id) on delete restrict,
  fighter_b_id uuid not null references public.boxing_fighters(id) on delete restrict,
  fighter_a_total int,
  fighter_b_total int,
  decision_for_id uuid references public.boxing_fighters(id) on delete restrict,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  captured_at timestamptz not null default now(),
  unique (bout_id, judge_id),
  check (fighter_a_id <> fighter_b_id)
);

create table if not exists public.boxing_scorecard_rounds (
  scorecard_id uuid not null references public.boxing_scorecards(id) on delete cascade,
  round int not null check (round between 1 and 15),
  fighter_a_points int not null check (fighter_a_points between 0 and 10),
  fighter_b_points int not null check (fighter_b_points between 0 and 10),
  notes text,
  primary key (scorecard_id, round)
);

create table if not exists public.boxing_weigh_ins (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  attempt_no int not null default 1 check (attempt_no >= 1),
  official_weight_lb numeric(6,2),
  contracted_weight_lb numeric(6,2),
  miss_lb numeric(6,2),
  status text not null default 'recorded' check (status in ('recorded','made_weight','missed_weight','reweigh_required','unknown')),
  weighed_at timestamptz,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  captured_at timestamptz not null default now(),
  unique (bout_id, fighter_id, attempt_no)
);
create index if not exists boxing_weigh_ins_fighter_idx on public.boxing_weigh_ins (fighter_id, weighed_at desc);

-- ---------------------------------------------------------------------------
-- Markets and immutable price history
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_odds_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.boxing_bookmakers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  jurisdiction text,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.boxing_markets (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  provider_id uuid not null references public.boxing_odds_providers(id) on delete restrict,
  bookmaker_id uuid not null references public.boxing_bookmakers(id) on delete restrict,
  external_market_id text,
  market_type text not null,
  line numeric(10,4),
  period text not null default 'fight',
  is_live boolean not null default false,
  status text not null default 'open' check (status in ('open','suspended','closed','settled','unknown')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (provider_id, bookmaker_id, external_market_id)
);
create index if not exists boxing_markets_bout_idx on public.boxing_markets (bout_id, market_type, bookmaker_id);

create table if not exists public.boxing_market_selections (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.boxing_markets(id) on delete cascade,
  external_selection_id text,
  selection_key text not null,
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  label text,
  line numeric(10,4),
  unique (market_id, selection_key)
);

create table if not exists public.boxing_market_ticks (
  id bigserial primary key,
  selection_id uuid not null references public.boxing_market_selections(id) on delete cascade,
  captured_at timestamptz not null default now(),
  american_odds int,
  decimal_odds numeric(12,6),
  implied_probability numeric(10,8),
  provider_timestamp timestamptz,
  raw_price jsonb not null default '{}'::jsonb,
  check (decimal_odds is null or decimal_odds >= 1)
);
create index if not exists boxing_market_ticks_selection_idx on public.boxing_market_ticks (selection_id, captured_at desc);
create index if not exists boxing_market_ticks_time_idx on public.boxing_market_ticks (captured_at desc);

-- ---------------------------------------------------------------------------
-- Structured news and generated articles
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_news_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'FIGHT_ANNOUNCED','OPPONENT_REPLACED','BOUT_CANCELLED','EVENT_POSTPONED',
    'TITLE_STATUS_CHANGED','RANKING_CHANGED','OFFICIALS_ASSIGNED','WEIGH_IN_RECORDED',
    'WEIGHT_MISSED','MARKET_MOVED','RESULT_OFFICIAL','SCORECARD_POSTED',
    'SUSPENSION_STATUS_CHANGED','OTHER'
  )),
  dedupe_key text not null unique,
  fighter_id uuid references public.boxing_fighters(id) on delete set null,
  bout_id uuid references public.boxing_bouts(id) on delete set null,
  boxing_event_id uuid references public.boxing_events(id) on delete set null,
  organization_id uuid references public.boxing_organizations(id) on delete set null,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  occurred_at timestamptz,
  detected_at timestamptz not null default now(),
  confidence smallint not null default 100 check (confidence between 0 and 100),
  payload jsonb not null,
  state text not null default 'new' check (state in ('new','enriched','published','skipped','needs_review'))
);
create index if not exists boxing_news_events_state_idx on public.boxing_news_events (state, detected_at);

create table if not exists public.boxing_articles (
  id uuid primary key default gen_random_uuid(),
  news_event_id uuid references public.boxing_news_events(id) on delete set null,
  slug text not null unique,
  headline text not null,
  dek text,
  body_md text not null,
  fact_block jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  model_version text,
  needs_human boolean not null default false,
  state text not null default 'draft' check (state in ('draft','review','published','retracted')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Append-only fight-state ledger
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_fight_state_ledger (
  id bigserial primary key,
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  boxing_event_id uuid not null references public.boxing_events(id) on delete cascade,
  checkpoint text not null,
  captured_at timestamptz not null default now(),
  bout_state jsonb not null default '{}'::jsonb,
  participant_state jsonb not null default '{}'::jsonb,
  title_state jsonb not null default '{}'::jsonb,
  ranking_state jsonb not null default '{}'::jsonb,
  officials_state jsonb not null default '{}'::jsonb,
  weigh_in_state jsonb not null default '{}'::jsonb,
  market_state jsonb not null default '{}'::jsonb,
  source_digest jsonb not null default '{}'::jsonb
);
create index if not exists boxing_fight_state_ledger_bout_idx on public.boxing_fight_state_ledger (bout_id, captured_at desc);

comment on table public.boxing_market_ticks is 'Append-only bookmaker/provider price observations. Derive open/current/close; do not rewrite history.';
comment on table public.boxing_ranking_snapshots is 'Historical organization/division ranking snapshots. Current rankings are a query over snapshots, not mutable truth.';
comment on table public.boxing_fight_state_ledger is 'Immutable fight-week checkpoints preserving state that cannot be reliably recreated after the fact.';
comment on column public.boxing_articles.fact_block is 'The complete structured factual basis allowed for generated prose. Generated factual claims must not exceed this block plus explicit cited attribution.';

commit;
