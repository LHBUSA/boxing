-- Finish the 0015 intent ("a re-parse of unchanged content records its parser version on the document row"): the
-- column was added but nothing wrote or read it. A re-parse of identical bytes creates no new revision, so the document
-- state kept reporting the OLD parser version, every backfill pass re-parsed the same first documents again (the per-run
-- cap was never passed: found 2026-10-03 on Florida 2024, 98 listed / 80 fetched every pass), and nightly runs re-parsed
-- unchanged documents.
--
-- 1. boxing_record_document_fetch records last_parser_version whenever a parse is recorded (new revision or identical
--    bytes re-parsed). A plain "checked, unchanged" fetch passes no parser version and leaves it untouched.
-- 2. boxing_source_document_state reports last_parser_version when set, else the current revision's.

begin;

create or replace function public.boxing_record_document_fetch(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_doc public.boxing_source_documents%rowtype;
  v_rev int;
  v_now timestamptz := coalesce(nullif(p ->> 'fetched_at', '')::timestamptz, now());
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  insert into public.boxing_source_documents as d (source_id, doc_key, url, kind, sport_hint, first_seen_at)
  values (v_src, p ->> 'doc_key', p ->> 'url', coalesce(p ->> 'kind', 'other'), p ->> 'sport_hint', v_now)
  on conflict (source_id, doc_key) do update set url = excluded.url
  returning * into v_doc;
  perform pg_advisory_xact_lock(hashtextextended('boxing_doc:' || v_doc.id::text, 0));
  select * into v_doc from public.boxing_source_documents where id = v_doc.id;

  if nullif(p ->> 'sha256', '') is null then
    update public.boxing_source_documents set last_checked_at = v_now, status = coalesce(p ->> 'status', status),
      classification = coalesce(p -> 'classification', classification), last_error = p ->> 'error'
    where id = v_doc.id;
    return jsonb_build_object('document_id', v_doc.id, 'revision', v_doc.current_revision, 'changed', false);
  end if;
  select revision into v_rev from public.boxing_source_document_revisions where document_id = v_doc.id and sha256 = p ->> 'sha256';
  if v_rev is not null then
    update public.boxing_source_documents set last_checked_at = v_now, status = coalesce(p ->> 'status', status),
      classification = coalesce(p -> 'classification', classification), last_error = null,
      last_parser_version = coalesce(nullif(p ->> 'parser_version', ''), last_parser_version)
    where id = v_doc.id;
    return jsonb_build_object('document_id', v_doc.id, 'revision', v_rev, 'changed', false, 'current_revision', v_doc.current_revision);
  end if;
  v_rev := v_doc.current_revision + 1;
  insert into public.boxing_source_document_revisions (document_id, revision, sha256, fetched_at, http_last_modified, observation_id, parser_version, parse_summary, ingest_run_id)
  values (v_doc.id, v_rev, p ->> 'sha256', v_now, p ->> 'http_last_modified', nullif(p ->> 'observation_id', '')::uuid, p ->> 'parser_version',
          coalesce(p -> 'parse_summary', '{}'::jsonb), nullif(p ->> 'ingest_run_id', '')::uuid);
  update public.boxing_source_documents set current_revision = v_rev, current_sha256 = p ->> 'sha256', http_last_modified = p ->> 'http_last_modified',
    last_checked_at = v_now, last_changed_at = v_now, status = coalesce(p ->> 'status', 'fetched'), classification = coalesce(p -> 'classification', classification), last_error = null,
    last_parser_version = coalesce(nullif(p ->> 'parser_version', ''), last_parser_version)
  where id = v_doc.id;
  return jsonb_build_object('document_id', v_doc.id, 'revision', v_rev, 'changed', true, 'previous_revision', nullif(v_rev - 1, 0));
end $$;

create or replace function public.boxing_source_document_state(p_source_key text, p_doc_keys text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(d.doc_key, jsonb_build_object('document_id', d.id, 'status', d.status, 'current_revision', d.current_revision,
      'current_sha256', d.current_sha256, 'http_last_modified', d.http_last_modified, 'last_checked_at', d.last_checked_at,
      'parser_version', coalesce(d.last_parser_version,
        (select r.parser_version from public.boxing_source_document_revisions r where r.document_id = d.id and r.revision = d.current_revision)))), '{}'::jsonb)
  from public.boxing_source_documents d join public.boxing_sources s on s.id = d.source_id
  where s.source_key = p_source_key and d.doc_key = any (p_doc_keys)
$$;

select public.boxing_lockdown();

commit;
