-- PropBetEdge Boxing — run provenance (who/what/when started every ingest run)
--
-- Every boxing_ingest_runs row now records its trigger (manual | scheduled |
-- retry | backfill | test | unknown), the worker name and deployed version,
-- a per-invocation id, the scheduled time for cron runs, the runtime, the
-- source/adapter version and a hash of the non-secret config. Provenance is
-- write-once: once set it cannot be changed (BX003).
--
-- boxing_worker_invocations is an append-only ledger of EVERY invocation of a
-- collection worker, including cron firings that decide nothing is due, so a
-- natural scheduler run is provable from the database alone.
--
-- Rows written before this migration by code that does not send provenance
-- are recorded as 'unknown', never guessed. Rerunnable.

begin;

alter table public.boxing_ingest_runs
  add column if not exists trigger_type text,
  add column if not exists worker_name text,
  add column if not exists worker_version text,
  add column if not exists deployment_id text,
  add column if not exists invocation_id text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists runtime text,
  add column if not exists source_version text,
  add column if not exists config_hash text;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'boxing_ingest_runs' and column_name = 'completed_at') then
    alter table public.boxing_ingest_runs add column completed_at timestamptz generated always as (finished_at) stored;
  end if;
end $$;

-- provenance for rows that predate this migration: the one odds run so far was
-- the operator script (scripts/staging/capture-odds.ps1, 2026-09-13T13:10:51Z);
-- everything else is unknown
update public.boxing_ingest_runs
set trigger_type = 'manual', worker_name = 'scripts/staging/capture-odds.ps1', runtime = 'node',
    metadata = metadata || '{"provenance_backfilled_by": "migration 20260913000013", "provenance_basis": "only operator capture before the staging worker was deployed"}'::jsonb
where trigger_type is null and worker = 'boxing-odds' and started_at < '2026-09-13T13:15:00Z' and started_at > '2026-09-13T13:00:00Z';

update public.boxing_ingest_runs set trigger_type = 'unknown' where trigger_type is null;

alter table public.boxing_ingest_runs alter column trigger_type set default 'unknown';
alter table public.boxing_ingest_runs alter column trigger_type set not null;
alter table public.boxing_ingest_runs drop constraint if exists boxing_ingest_runs_trigger_type_check;
alter table public.boxing_ingest_runs add constraint boxing_ingest_runs_trigger_type_check
  check (trigger_type in ('manual','scheduled','retry','backfill','test','unknown'));
alter table public.boxing_ingest_runs drop constraint if exists boxing_ingest_runs_scheduled_provenance_check;
alter table public.boxing_ingest_runs add constraint boxing_ingest_runs_scheduled_provenance_check
  check (trigger_type <> 'scheduled' or (scheduled_for is not null and invocation_id is not null and worker_version is not null and worker_name is not null));
alter table public.boxing_ingest_runs drop constraint if exists boxing_ingest_runs_manual_not_scheduled_check;
alter table public.boxing_ingest_runs add constraint boxing_ingest_runs_manual_not_scheduled_check
  check (trigger_type = 'scheduled' or scheduled_for is null);
alter table public.boxing_ingest_runs drop constraint if exists boxing_ingest_runs_config_hash_check;
alter table public.boxing_ingest_runs add constraint boxing_ingest_runs_config_hash_check
  check (config_hash is null or config_hash ~ '^[0-9a-f]{64}$');

create or replace function public.boxing_ingest_runs_provenance_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (old.trigger_type <> 'unknown' and new.trigger_type is distinct from old.trigger_type)
     or new.worker_name is distinct from old.worker_name and old.worker_name is not null
     or new.worker_version is distinct from old.worker_version and old.worker_version is not null
     or new.deployment_id is distinct from old.deployment_id and old.deployment_id is not null
     or new.invocation_id is distinct from old.invocation_id and old.invocation_id is not null
     or new.scheduled_for is distinct from old.scheduled_for and old.scheduled_for is not null
     or new.config_hash is distinct from old.config_hash and old.config_hash is not null
     or new.started_at is distinct from old.started_at
     or new.worker is distinct from old.worker then
    raise exception 'run_provenance_is_write_once: run %', old.id using errcode = 'BX003';
  end if;
  return new;
end $$;
drop trigger if exists boxing_ingest_runs_provenance_guard on public.boxing_ingest_runs;
create trigger boxing_ingest_runs_provenance_guard before update on public.boxing_ingest_runs
  for each row execute function public.boxing_ingest_runs_provenance_guard();

create index if not exists boxing_ingest_runs_trigger_idx on public.boxing_ingest_runs (worker, trigger_type, started_at desc);

-- ---------------------------------------------------------------------------
-- Every collection-worker invocation (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.boxing_worker_invocations (
  id uuid primary key default gen_random_uuid(),
  worker text not null,
  worker_name text not null,
  worker_version text,
  deployment_id text,
  invocation_id text not null,
  trigger_type text not null check (trigger_type in ('manual','scheduled','retry','backfill','test')),
  cron text,
  scheduled_for timestamptz,
  runtime text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  outcome text not null check (outcome in ('ran','not_due','disabled','blocked','failed')),
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict,
  config_hash text check (config_hash is null or config_hash ~ '^[0-9a-f]{64}$'),
  detail jsonb not null default '{}'::jsonb,
  unique (worker, invocation_id),
  check (trigger_type <> 'scheduled' or (scheduled_for is not null and cron is not null and worker_version is not null))
);
select public.boxing_install_append_only('public.boxing_worker_invocations');
create index if not exists boxing_worker_invocations_time_idx on public.boxing_worker_invocations (worker, started_at desc);

create or replace function public.boxing_record_worker_invocation(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.boxing_worker_invocations
    (worker, worker_name, worker_version, deployment_id, invocation_id, trigger_type, cron, scheduled_for, runtime, started_at,
     outcome, ingest_run_id, config_hash, detail)
  values (p ->> 'worker', p ->> 'worker_name', p ->> 'worker_version', p ->> 'deployment_id', p ->> 'invocation_id', p ->> 'trigger_type',
          p ->> 'cron', nullif(p ->> 'scheduled_for', '')::timestamptz, p ->> 'runtime', (p ->> 'started_at')::timestamptz,
          p ->> 'outcome', nullif(p ->> 'ingest_run_id', '')::uuid, p ->> 'config_hash', coalesce(p -> 'detail', '{}'::jsonb))
  on conflict (worker, invocation_id) do nothing
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'duplicate', v_id is null);
end $$;

-- Scheduler acceptance summary for a worker, from the database alone.
create or replace function public.boxing_scheduler_evidence(p_worker text, p_since timestamptz default now() - interval '2 days')
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'worker', p_worker,
    'since', p_since,
    'invocations_by_trigger_outcome', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
        select trigger_type || ':' || outcome as k, count(*) n from public.boxing_worker_invocations
        where worker = p_worker and started_at >= p_since group by 1) x),
    'last_scheduled_invocation', (select to_jsonb(i) - 'detail' from public.boxing_worker_invocations i
        where worker = p_worker and trigger_type = 'scheduled' and started_at >= p_since order by started_at desc limit 1),
    'scheduled_runs', (select coalesce(jsonb_agg(jsonb_build_object('run_id', r.id, 'status', r.status, 'started_at', r.started_at,
        'completed_at', r.completed_at, 'scheduled_for', r.scheduled_for, 'worker_version', r.worker_version, 'invocation_id', r.invocation_id,
        'credits', r.metrics ->> 'credits_spent', 'quotes_inserted', r.metrics ->> 'quotes_inserted', 'provider_events', r.metrics ->> 'provider_events',
        'events_unmatched', r.metrics ->> 'events_unmatched', 'target', r.metrics ->> 'target') order by r.started_at), '[]'::jsonb)
        from public.boxing_ingest_runs r where r.worker = p_worker and r.trigger_type = 'scheduled' and r.started_at >= p_since),
    'manual_runs', (select count(*) from public.boxing_ingest_runs where worker = p_worker and trigger_type = 'manual' and started_at >= p_since)
  )
$$;

select public.boxing_lockdown();

commit;
