-- PropBetEdge Boxing — event display names follow their naming rule, with an append-only revision trail.
--
-- Commission event names are derived ("<promoter> at <venue>", shared/commissions/apply.mjs eventName). Until rule
-- commission-event-name@2 the derivation stripped digits ("2300 Arena" -> "Arena", "8 Count Promotions" -> "Count
-- Promotions"), and boxing_upsert_event never revisited a stored name, so the bad names stayed.
--
-- 1. boxing_event_name_revisions: every stored-name change, append-only (previous name, new name, rule, source).
-- 2. boxing_upsert_event: when the SOURCE THAT OWNS the event (boxing_events.source_id) re-applies its card with a
--    declared name_rule and a different derived name, the name is updated and the revision recorded. Another source
--    never renames an event it does not own. Cards without a name_rule keep today's behaviour (no rename).
-- Rerunnable.

begin;

create table if not exists public.boxing_event_name_revisions (
  seq bigint generated always as identity primary key,
  event_id uuid not null references public.boxing_events(id) on delete restrict,
  previous_name text not null,
  name text not null,
  name_rule text not null,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  reason text not null default 'derived_name_rule',
  revised_at timestamptz not null default now(),
  check (previous_name <> name)
);
create index if not exists boxing_event_name_revisions_event_idx on public.boxing_event_name_revisions (event_id, seq);
select public.boxing_install_append_only('public.boxing_event_name_revisions'::regclass);

create or replace function public.boxing_upsert_event(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_event uuid;
  v_owner uuid;
  v_name text;
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  select event_id into v_event from public.boxing_event_identities
  where namespace = p ->> 'namespace' and external_id = p ->> 'external_id' and verification_state <> 'rejected';
  if v_event is not null then
    select source_id, name into v_owner, v_name from public.boxing_events where id = v_event;
    if nullif(p ->> 'name_rule', '') is not null and nullif(btrim(p ->> 'name'), '') is not null
       and v_owner = v_src and v_name is distinct from btrim(p ->> 'name') then
      insert into public.boxing_event_name_revisions (event_id, previous_name, name, name_rule, source_id)
      values (v_event, v_name, btrim(p ->> 'name'), p ->> 'name_rule', v_src);
      update public.boxing_events set name = btrim(p ->> 'name') where id = v_event;
      return jsonb_build_object('event_id', v_event, 'created', false, 'renamed', true, 'previous_name', v_name);
    end if;
    return jsonb_build_object('event_id', v_event, 'created', false, 'renamed', false);
  end if;
  insert into public.boxing_events (source_id, external_event_id, name, event_date, start_at, status, source_url)
  values (v_src, p ->> 'external_id', p ->> 'name', nullif(p ->> 'event_date', '')::date, nullif(p ->> 'start_at', '')::timestamptz,
          coalesce(p ->> 'status', 'scheduled'), p ->> 'source_url')
  returning id into v_event;
  insert into public.boxing_event_identities (event_id, source_id, namespace, external_id, verification_state, confidence)
  values (v_event, v_src, p ->> 'namespace', p ->> 'external_id', 'verified', 100);
  return jsonb_build_object('event_id', v_event, 'created', true, 'renamed', false);
end $$;

select public.boxing_lockdown();

commit;
