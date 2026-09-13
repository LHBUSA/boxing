-- PropBetEdge Boxing — document state exposes the parser version of the
-- current revision, so a fixed parser re-parses unchanged official documents
-- (issue found 2026-09-13: repeat pairings on one Florida card were collapsed
-- into one bout by parser 1.0.0). Coverage counts result-document revisions
-- only (listing/calendar refreshes are not official revisions). Rerunnable.

begin;

create or replace function public.boxing_source_document_state(p_source_key text, p_doc_keys text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(d.doc_key, jsonb_build_object('document_id', d.id, 'status', d.status, 'current_revision', d.current_revision,
      'current_sha256', d.current_sha256, 'http_last_modified', d.http_last_modified, 'last_checked_at', d.last_checked_at,
      'parser_version', (select r.parser_version from public.boxing_source_document_revisions r where r.document_id = d.id and r.revision = d.current_revision))), '{}'::jsonb)
  from public.boxing_source_documents d join public.boxing_sources s on s.id = d.source_id
  where s.source_key = p_source_key and d.doc_key = any (p_doc_keys)
$$;

-- a re-parse of unchanged content records its parser version on the document row
alter table public.boxing_source_documents add column if not exists last_parser_version text;

create or replace function public.boxing_commission_revision_summary()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'result_document_revisions_beyond_first', (select count(*) from public.boxing_source_document_revisions r join public.boxing_source_documents d on d.id = r.document_id
                                                where d.kind = 'results' and r.revision > 1),
    'result_revisions_beyond_first', (select coalesce(jsonb_object_agg(coalesce(k, 'official_source_change'), n), '{}'::jsonb) from (
        select r.change_reason as k, count(*) n from public.boxing_bout_results r join public.boxing_sources s on s.id = r.source_id
        where s.source_kind = 'commission' and r.revision > 1 group by 1) x),
    'scorecard_revisions_beyond_first', (select count(*) from public.boxing_scorecards c join public.boxing_sources s on s.id = c.source_id
                                         where s.source_kind = 'commission' and c.revision > 1)
  )
$$;

select public.boxing_lockdown();

commit;
