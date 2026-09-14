-- PropBetEdge Boxing — scope derived-name corrections to what the naming rule actually changed.
--
-- Migration 0030 let the owning source replace a stored event name whenever a card with a declared name_rule derived
-- a different name. The dry run on staging (reviews/events/2026-09-14-event-names) showed that New Jersey cards derive
-- names from a different promoter list than the schedule that created the events (and one result sheet yields a wrong
-- venue), so 0030 would have renamed events for reasons that are not the naming rule.
--
-- commission-event-name@2 changed exactly one thing: digits are kept. A stored name is now corrected only when it
-- equals the new name with its digits removed (the @1 output). Every other difference leaves the stored name alone.
-- Rerunnable.

begin;

create or replace function public.boxing_event_name_rule_correction(p_stored text, p_new text, p_rule text)
returns boolean language sql immutable set search_path = '' as $$
  select case p_rule
    when 'commission-event-name@2' then
      p_stored is distinct from p_new
      and p_new ~ '[0-9]'
      and btrim(regexp_replace(regexp_replace(p_new, '[0-9]+', ' ', 'g'), '\s+', ' ', 'g')) = btrim(regexp_replace(p_stored, '\s+', ' ', 'g'))
    else false
  end
$$;

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
    if nullif(btrim(p ->> 'name'), '') is not null and v_owner = v_src
       and public.boxing_event_name_rule_correction(v_name, btrim(p ->> 'name'), p ->> 'name_rule') then
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
