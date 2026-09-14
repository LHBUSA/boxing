-- Title status import: an entry that names no holder (IBF records such as champ ",,;;;;", which the IBF page renders
-- as a Champion section with a blank name) is stored as holder_status 'unknown' with identity_state 'not_applicable'
-- and creates no identity review. 0033's version queued a review with a null name and the backfill failed closed
-- (23502). Otherwise identical to 0033.

begin;

-- 0033's check tied "no name" to "vacant" both ways. A vacancy still has no name and a held/in-recess belt still has
-- one; only an 'unknown' entry may now have no name.
do $$
declare c record;
begin
  for c in select conname from pg_catalog.pg_constraint
           where conrelid = 'public.boxing_title_status_entries'::regclass and contype = 'c'
             and pg_catalog.pg_get_constraintdef(oid) ilike '%holder_status = ''vacant''::text) = (holder_source_name IS NULL)%'
  loop
    execute format('alter table public.boxing_title_status_entries drop constraint %I', c.conname);
  end loop;
end $$;
select public.boxing_ensure_constraint('public.boxing_title_status_entries', 'boxing_title_status_entries_holder_name',
  'check ((holder_status = ''vacant'' and holder_source_name is null) or (holder_status in (''held'',''in_recess'') and holder_source_name is not null) or holder_status = ''unknown'')');

create or replace function public.boxing_import_title_status_snapshot(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_org uuid;
  v_gender text := coalesce(p ->> 'gender_scope', 'male');
  v_div public.boxing_org_divisions%rowtype;
  v_existing uuid;
  v_prev uuid;
  v_obs uuid;
  v_id uuid;
  e jsonb;
  c jsonb;
  m jsonb;
  v_des public.boxing_org_designations%rowtype;
  v_unknown text[] := '{}';
  v_seq int := 0;
  v_held int := 0;
begin
  select id into v_org from public.boxing_organizations where slug = p ->> 'organization_slug';
  if v_org is null then raise exception 'unknown organization %', p ->> 'organization_slug' using errcode = 'BX070'; end if;
  v_src := public.boxing_title_source_gate(p ->> 'source_key', p ->> 'organization_slug');

  insert into public.boxing_org_divisions (organization_id, gender_scope, native_label, weight_class_id, limit_text, review_state)
  values (v_org, v_gender, p ->> 'division_native_label', null, p ->> 'division_limit_text', 'pending_review')
  on conflict (organization_id, gender_scope, native_label) do nothing;
  select * into v_div from public.boxing_org_divisions where organization_id = v_org and gender_scope = v_gender and native_label = p ->> 'division_native_label';
  if v_div.weight_class_id is null then
    return jsonb_build_object('status', 'refused', 'reason', 'unknown_division_pending_review', 'division', p ->> 'division_native_label');
  end if;

  for e in select * from jsonb_array_elements(coalesce(p -> 'entries', '[]'::jsonb)) loop
    if e ->> 'designation_native' is not null then
      insert into public.boxing_org_designations (organization_id, native_label, normalized_label, tier, holder_status, review_state)
      values (v_org, e ->> 'designation_native', upper(regexp_replace(btrim(e ->> 'designation_native'), '\s+', ' ', 'g')), null, 'unknown', 'pending_review')
      on conflict (organization_id, normalized_label) do nothing;
      select * into v_des from public.boxing_org_designations where organization_id = v_org and normalized_label = upper(regexp_replace(btrim(e ->> 'designation_native'), '\s+', ' ', 'g'));
      if v_des.review_state = 'pending_review' then v_unknown := v_unknown || (e ->> 'designation_native'); end if;
    end if;
  end loop;
  if cardinality(v_unknown) > 0 then
    return jsonb_build_object('status', 'refused', 'reason', 'unknown_designation_pending_review', 'designations', to_jsonb(v_unknown));
  end if;

  select id into v_existing from public.boxing_title_status_snapshots
  where organization_id = v_org and org_division_id = v_div.id and gender_scope = v_gender and document_kind = p ->> 'document_kind' and content_hash = p ->> 'content_hash';
  if v_existing is not null then return jsonb_build_object('status', 'duplicate', 'snapshot_id', v_existing); end if;

  select s.id into v_prev from public.boxing_title_status_snapshots s
  where s.organization_id = v_org and s.org_division_id = v_div.id and s.gender_scope = v_gender and s.document_kind = p ->> 'document_kind'
    and coalesce(s.as_of, s.published_on) <= coalesce(nullif(p ->> 'as_of', '')::date, nullif(p ->> 'published_on', '')::date, 'infinity'::date)
  order by coalesce(s.as_of, s.published_on) desc, s.captured_at desc limit 1;

  v_obs := ((public.boxing_record_observation(jsonb_build_object(
    'source_key', p ->> 'source_key', 'entity_type', 'title_status_snapshot',
    'external_key', concat_ws('|', p ->> 'organization_slug', p ->> 'document_kind', p ->> 'division_native_label', v_gender, coalesce(p ->> 'as_of', p ->> 'published_on')),
    'payload', p -> 'normalized', 'content_hash', p ->> 'content_hash', 'source_url', p ->> 'source_url',
    'ingest_run_id', p ->> 'ingest_run_id', 'parser_version', p ->> 'parser_version'))) ->> 'id')::uuid;

  insert into public.boxing_title_status_snapshots (organization_id, org_division_id, weight_class_id, gender_scope, document_kind, source_id, source_url,
    published_on, as_of, as_of_label, retrieved_at, content_hash, document_sha256, parser_version, observation_id, ingest_run_id, previous_snapshot_id)
  values (v_org, v_div.id, v_div.weight_class_id, v_gender, p ->> 'document_kind', v_src, p ->> 'source_url',
    nullif(p ->> 'published_on', '')::date, nullif(p ->> 'as_of', '')::date, p ->> 'as_of_label', (p ->> 'retrieved_at')::timestamptz,
    p ->> 'content_hash', nullif(p ->> 'document_sha256', ''), p ->> 'parser_version', v_obs, nullif(p ->> 'ingest_run_id', '')::uuid, v_prev)
  returning id into v_id;

  for e in select * from jsonb_array_elements(coalesce(p -> 'entries', '[]'::jsonb)) loop
    v_seq := v_seq + 1;
    select * into v_des from public.boxing_org_designations where organization_id = v_org and normalized_label = upper(regexp_replace(btrim(coalesce(e ->> 'designation_native', '')), '\s+', ' ', 'g'));
    insert into public.boxing_title_status_entries (snapshot_id, seq, designation_id, designation_native, tier, holder_status, honorific, holder_source_name,
      holder_country, holder_org_boxer_id, fighter_id, identity_state, reign_start_on, reign_start_basis, last_defense_on, previous_holder_as_printed, ignored_fields)
    values (v_id, v_seq, v_des.id, e ->> 'designation_native', v_des.tier, e ->> 'holder_status', v_des.honorific, e ->> 'holder_source_name',
      e ->> 'holder_country', e ->> 'holder_org_boxer_id', nullif(e ->> 'fighter_id', '')::uuid,
      case when e ->> 'holder_status' = 'vacant' or nullif(btrim(e ->> 'holder_source_name'), '') is null then 'not_applicable'
           when nullif(e ->> 'fighter_id', '') is not null then 'resolved' else 'held' end,
      nullif(e ->> 'reign_start_on', '')::date, e ->> 'reign_start_basis', nullif(e ->> 'last_defense_on', '')::date, e ->> 'previous_holder_as_printed', e -> 'ignored_fields');
    if e ->> 'holder_status' <> 'vacant' and nullif(e ->> 'fighter_id', '') is null and nullif(btrim(e ->> 'holder_source_name'), '') is not null then
      v_held := v_held + 1;
      insert into public.boxing_org_identity_reviews (organization_id, source_name, normalized_name, country, org_boxer_id, first_seen_snapshot_kind)
      values (v_org, e ->> 'holder_source_name', e ->> 'holder_normalized_name', nullif(e ->> 'holder_country', ''), nullif(e ->> 'holder_org_boxer_id', ''), p ->> 'document_kind')
      on conflict do nothing;
    end if;
    m := e -> 'mandatory';
    if m is not null and jsonb_typeof(m) = 'object' then
      insert into public.boxing_title_mandatory_statements (snapshot_id, entry_seq, kind, as_printed, challenger_source_name, status_as_printed, due_on, basis)
      values (v_id, v_seq, 'mandatory', m ->> 'as_printed', m ->> 'challenger_source_name', m ->> 'status_as_printed', nullif(m ->> 'due_on', '')::date, m ->> 'basis');
    end if;
  end loop;

  for c in select * from jsonb_array_elements(coalesce(p -> 'claims', '[]'::jsonb)) loop
    insert into public.boxing_title_claims (snapshot_id, about_organization_id, claimed_holder_source_name, claimed_vacant, claimed_blank, native_text, location_in_document)
    values (v_id, (select id from public.boxing_organizations where slug = c ->> 'about'),
      case when coalesce((c ->> 'vacant')::boolean, false) or coalesce((c ->> 'blank')::boolean, false) then null else c ->> 'source_name' end,
      coalesce((c ->> 'vacant')::boolean, false), coalesce((c ->> 'blank')::boolean, false), c ->> 'native_text', c ->> 'where');
  end loop;

  insert into public.boxing_observation_links (observation_id, entity_type, entity_id, link_role)
  values (v_obs, 'title_status_snapshot', v_id::text, 'created') on conflict do nothing;
  return jsonb_build_object('status', 'created', 'snapshot_id', v_id, 'previous_snapshot_id', v_prev, 'entries', v_seq, 'identities_held', v_held);
end $$;

select public.boxing_lockdown();

commit;
