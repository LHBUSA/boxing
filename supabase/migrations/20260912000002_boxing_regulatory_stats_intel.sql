-- PropBetEdge Boxing Core v1 extension
-- Regulatory history, licensed/source-native punch statistics, and versioned
-- derived-intelligence storage. No metric table below is permission to ingest
-- from an unapproved upstream source.

begin;

-- ---------------------------------------------------------------------------
-- Public regulatory state
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_regulatory_actions (
  id uuid primary key default gen_random_uuid(),
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  bout_id uuid references public.boxing_bouts(id) on delete set null,
  commission_id uuid references public.boxing_commissions(id) on delete restrict,
  action_type text not null check (action_type in (
    'suspension','license_status','eligibility','medical_hold_public','disciplinary','fine','other'
  )),
  status text not null default 'unknown' check (status in ('active','expired','cleared','denied','unknown')),
  effective_from timestamptz,
  effective_to timestamptz,
  reason_public text,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text,
  source_record jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from)
);
create index if not exists boxing_regulatory_fighter_idx on public.boxing_regulatory_actions (fighter_id, captured_at desc);
create index if not exists boxing_regulatory_active_idx on public.boxing_regulatory_actions (status, effective_to);

comment on table public.boxing_regulatory_actions is
  'Public competitive/regulatory status only. Do not store private medical records, identifiers, or non-public personal data.';

-- ---------------------------------------------------------------------------
-- Source-native boxing statistics
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_round_punch_stats (
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  round int not null check (round between 1 and 15),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  total_landed int,
  total_attempted int,
  jab_landed int,
  jab_attempted int,
  power_landed int,
  power_attempted int,
  head_landed int,
  head_attempted int,
  body_landed int,
  body_attempted int,
  extra jsonb not null default '{}'::jsonb,
  source_url text,
  captured_at timestamptz not null default now(),
  primary key (bout_id, fighter_id, round, source_id),
  check (total_landed is null or total_landed >= 0),
  check (total_attempted is null or total_attempted >= 0),
  check (jab_landed is null or jab_landed >= 0),
  check (jab_attempted is null or jab_attempted >= 0),
  check (power_landed is null or power_landed >= 0),
  check (power_attempted is null or power_attempted >= 0)
);
create index if not exists boxing_round_punch_stats_fighter_idx on public.boxing_round_punch_stats (fighter_id, bout_id, round);

-- ---------------------------------------------------------------------------
-- Versioned Fight DNA / derived intelligence
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_metric_definitions (
  metric_key text not null,
  version text not null,
  name text not null,
  description text not null,
  formula_text text not null,
  minimum_sample jsonb not null default '{}'::jsonb,
  value_kind text not null check (value_kind in ('number','probability','rate','score','category','json')),
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  primary key (metric_key, version)
);

create table if not exists public.boxing_fighter_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  fighter_id uuid not null references public.boxing_fighters(id) on delete cascade,
  metric_key text not null,
  metric_version text not null,
  as_of timestamptz not null,
  through_bout_id uuid references public.boxing_bouts(id) on delete set null,
  value_number numeric,
  value_text text,
  value_json jsonb,
  sample_size int,
  confidence numeric(6,5),
  inputs_digest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (metric_key, metric_version) references public.boxing_metric_definitions(metric_key, version) on delete restrict,
  unique (fighter_id, metric_key, metric_version, as_of),
  check (sample_size is null or sample_size >= 0),
  check (confidence is null or (confidence >= 0 and confidence <= 1))
);
create index if not exists boxing_fighter_metric_latest_idx on public.boxing_fighter_metric_snapshots (fighter_id, metric_key, as_of desc);

create table if not exists public.boxing_matchup_snapshots (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references public.boxing_bouts(id) on delete cascade,
  model_key text not null,
  model_version text not null,
  as_of timestamptz not null,
  fighter_a_id uuid not null references public.boxing_fighters(id) on delete restrict,
  fighter_b_id uuid not null references public.boxing_fighters(id) on delete restrict,
  features jsonb not null,
  outputs jsonb not null default '{}'::jsonb,
  inputs_digest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (bout_id, model_key, model_version, as_of),
  check (fighter_a_id <> fighter_b_id)
);
create index if not exists boxing_matchup_snapshots_bout_idx on public.boxing_matchup_snapshots (bout_id, as_of desc);

create table if not exists public.boxing_official_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  official_id uuid not null references public.boxing_officials(id) on delete cascade,
  metric_key text not null,
  metric_version text not null,
  as_of timestamptz not null,
  value_number numeric,
  value_text text,
  value_json jsonb,
  sample_size int,
  inputs_digest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (official_id, metric_key, metric_version, as_of),
  check (sample_size is null or sample_size >= 0)
);

comment on table public.boxing_fighter_metric_snapshots is
  'Versioned derived Fight DNA values. These are PropBetEdge analytics, never source facts.';
comment on table public.boxing_matchup_snapshots is
  'Point-in-time matchup/model output. Preserve old versions and as-of timestamps; never rewrite historical predictions.';
comment on table public.boxing_official_metric_snapshots is
  'Versioned descriptive official analytics. Avoid unsupported accusations or qualitative labels; metrics must have transparent definitions.';

commit;
