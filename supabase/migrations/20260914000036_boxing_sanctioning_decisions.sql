-- Owner decisions 2026-09-14 (titles + rankings, continued). Staging first; production untouched.
--
-- 1. WBA division aliases MINIMUM and MINI FLYWEIGHT -> canonical minimumweight. The native label stays the org division
--    label; "UNKNOWN" stays pending_review and unmapped.
-- 2. WBA GOLD CHAMPION -> WBA gold lineage, champion. "UNDISPUTED" / "UNIFIED" / "WBA -xxx UNIFIED" wording stays a
--    pending designation on its own; when a champion row also names its WBA lineage, the phrase is stored as that entry's
--    honorific exactly as printed (honorific_as_printed). Neither ever feeds the PropBetEdge-derived unified/undisputed rule.
-- 3. A ranked entry whose name the body did not print keeps its position: fighter_id null, source_name null,
--    metadata.name_not_printed = true (plus any WBA boxer id). No name is invented.
-- 4. WBC official source: approved_ingest (owner decision). Facts only, source-native wording, provenance, attribution,
--    no redistribution of WBC documents, and no circumvention of any technical access control.

begin;

-- 1 -------------------------------------------------------------------------------------------------------------------
update public.boxing_org_divisions d set weight_class_id = wc.id, review_state = 'seeded'
from public.boxing_organizations o, public.boxing_weight_classes wc
where d.organization_id = o.id and o.slug = 'wba' and d.gender_scope = 'male' and d.native_label in ('MINIMUM', 'MINI FLYWEIGHT')
  and wc.class_key = 'minimumweight' and d.weight_class_id is null;
insert into public.boxing_org_divisions (organization_id, gender_scope, native_label, weight_class_id)
select o.id, 'male', v.label, wc.id
from (values ('MINIMUM'), ('MINI FLYWEIGHT')) as v(label)
join public.boxing_organizations o on o.slug = 'wba'
join public.boxing_weight_classes wc on wc.class_key = 'minimumweight'
on conflict (organization_id, gender_scope, native_label) do nothing;

-- 2 -------------------------------------------------------------------------------------------------------------------
update public.boxing_org_designations d set tier = 'gold', holder_status = 'champion', review_state = 'seeded'
from public.boxing_organizations o
where d.organization_id = o.id and o.slug = 'wba' and d.normalized_label = 'WBA GOLD CHAMPION' and d.review_state = 'pending_review';
insert into public.boxing_org_designations (organization_id, native_label, normalized_label, tier, holder_status)
select o.id, 'WBA GOLD CHAMPION', 'WBA GOLD CHAMPION', 'gold', 'champion' from public.boxing_organizations o where o.slug = 'wba'
on conflict (organization_id, normalized_label) do nothing;

-- 3 -------------------------------------------------------------------------------------------------------------------
alter table public.boxing_ranking_entries drop constraint if exists boxing_ranking_entries_subject_check;
alter table public.boxing_ranking_entries add constraint boxing_ranking_entries_subject_check check (
  (is_vacant and fighter_id is null)
  or (not is_vacant and (fighter_id is not null or source_name is not null))
  or (not is_vacant and fighter_id is null and source_name is null and metadata ->> 'name_not_printed' = 'true'));

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
    values (v_id, v_seq, v_des.id, e ->> 'designation_native', v_des.tier, e ->> 'holder_status', coalesce(nullif(btrim(e ->> 'honorific_as_printed'), ''), v_des.honorific), e ->> 'holder_source_name',
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

-- 4 -------------------------------------------------------------------------------------------------------------------
do $$
declare
  v_at timestamptz := '2026-09-14T23:30:00Z';
  v_src uuid;
  v_review uuid;
begin
  select id into v_src from public.boxing_sources where source_key = 'wbc_official';
  if v_src is null then raise exception 'missing source row wbc_official'; end if;
  insert into public.boxing_source_rights_reviews
    (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses, account_agreement_found, account_scope_note, next_review_due, notes)
  values (v_src, v_at, 'PropBetEdge owner decision 2026-09-14 (WBC public rankings and title facts approved for ingestion)', 'https://wbcboxing.com/',
    'approved_with_restrictions',
    array['collection of public WBC rankings and title-status facts from normally accessible official WBC pages and documents',
          'operator-supplied official WBC documents', 'store normalized facts with source URL, date and provenance',
          'first-party display with attribution to the World Boxing Council and a link to the official source'],
    array['redistributing copied WBC HTML or PDF bodies', 'spoofing a user agent, bypassing a CAPTCHA, defeating authentication or circumventing a block (a blocked URL is an access gap, not a permission question)',
          'using WBC content to train AI models (robots.txt Content-Signal ai-train=no)', 'treating WBC "unified"/"undisputed" wording as proof of PropBetEdge-derived status'],
    false, 'Official public source; no account or fee.', '2026-12-14',
    'Owner decision 2026-09-14: WBC does not require separate permission for this project. robots.txt (2026-09-14): User-agent * Allow /, Content-Signal search=yes, ai-train=no, use=reference; named AI crawlers disallowed. Supersedes the earlier not-licensed posture; the drafted permission request is no longer required.')
  on conflict (source_id, reviewed_at) do nothing;
  select id into v_review from public.boxing_source_rights_reviews where source_id = v_src and reviewed_at = v_at;
  update public.boxing_sources set
    latest_rights_review_id = v_review, access_mode = 'approved_ingest', rights_state = 'approved', enabled = true,
    persistence_allowed = true, derivative_allowed = true, display_allowed = true, redistribution_allowed = false,
    attribution_required = 'Attribute the World Boxing Council as the official source and link to it.',
    reviewed_at = v_at, reviewed_by = 'PropBetEdge owner decision 2026-09-14', next_review_due = '2026-12-14',
    rights_note = 'APPROVED (2026-09-14): public WBC rankings and title facts; facts only, source-native wording, provenance, attribution; no redistribution of WBC documents; no circumvention of technical access controls.'
  where id = v_src and latest_rights_review_id is distinct from v_review;
end $$;

select public.boxing_lockdown();

commit;
