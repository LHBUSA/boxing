-- 0050: a placeholder that slipped through is corrected, not deleted.
--
-- boxing_identity_resolutions is append-only (history is immutable), so 0049's delete-based repair could not remove the
-- "TBC TBC" fighter the 2026-10-02 Matchroom apply created. The correction is a new identity state, 'void' (not a
-- person): the fighter row stays for the ledger, its name/search keys are removed so no resolver or search can ever
-- match it again, and an appended resolution row records the correction and why. Public reads exclude void fighters.

begin;

alter table public.boxing_fighters drop constraint if exists boxing_fighters_identity_state_check;
alter table public.boxing_fighters add constraint boxing_fighters_identity_state_check
  check (identity_state in ('verified','source_native','review_required','merged','void'));

create or replace function public.boxing_repair_placeholder_fighters(p_apply boolean default false)
returns jsonb language plpgsql set search_path = '' as $$
declare
  r record;
  v_voided jsonb := '[]'::jsonb;
  v_kept jsonb := '[]'::jsonb;
  v_refs jsonb;
begin
  for r in select f.id, f.public_id, f.display_name, f.created_at from public.boxing_fighters f
           where f.identity_state <> 'void' and (public.boxing_identity_name_quality(f.display_name) ->> 'placeholder')::boolean
           order by f.created_at loop
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
      -- attached to something real: a human decides, nothing is touched
      v_kept := v_kept || jsonb_build_object('public_id', r.public_id, 'name', r.display_name, 'attached_to', v_refs);
      continue;
    end if;
    if p_apply then
      delete from public.boxing_fighter_name_keys where fighter_id = r.id;
      delete from public.boxing_fighter_search_names where fighter_id = r.id;
      delete from public.boxing_fighter_aliases where fighter_id = r.id;
      update public.boxing_fighters set identity_state = 'void', career_status = 'unknown' where id = r.id;
      -- the correction is filed against the same source observation that created the person
      insert into public.boxing_identity_resolutions (observation_id, source_id, ingest_run_id, decision_kind, outcome, reason, fighter_id, namespace,
        external_id, method, verification_state, confidence, evidence, resolver_version, decided_by)
      select ir.observation_id, ir.source_id, ir.ingest_run_id, 'automatic', 'rejected', 'placeholder_not_a_person', null, ir.namespace,
             ir.external_id, 'placeholder_repair', 'rejected', 100,
             jsonb_build_object('voided_fighter', r.public_id, 'printed_name', r.display_name, 'rule', 'pbe_placeholder_repair@2', 'corrects_resolution', ir.id),
             'pbe_placeholder_repair@2', 'pbe_placeholder_repair@2'
      from public.boxing_identity_resolutions ir where ir.fighter_id = r.id order by ir.created_at desc limit 1;
    end if;
    v_voided := v_voided || jsonb_build_object('public_id', r.public_id, 'name', r.display_name, 'created_at', r.created_at);
  end loop;
  return jsonb_build_object('rule', 'pbe_placeholder_repair@2', 'applied', p_apply, 'voided', v_voided, 'kept_for_review', v_kept);
end $$;

comment on function public.boxing_repair_placeholder_fighters(boolean) is
  'pbe_placeholder_repair@2: placeholder-named fighters with nothing attached become identity_state=void (keys removed, correction appended). Dry run by default.';

select public.boxing_lockdown();

commit;
