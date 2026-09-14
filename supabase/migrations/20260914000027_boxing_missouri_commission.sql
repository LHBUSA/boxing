-- PropBetEdge Boxing — Missouri Office of Athletics as an approved official commission source.
--
-- Access/terms review 2026-09-14 (docs/sources/commissions.json, owner direction 2026-09-14 "continue adapters for
-- Pennsylvania, Texas, Tennessee, Missouri"):
--   * results index https://pr.mo.gov/athletics-boxingresults.asp: static HTML table of result PDFs
--   * robots.txt (https://pr.mo.gov/robots.txt) disallows /data, /downloadables, /vault and others; the /boards line
--     is commented out, so /boards/athletics/boxingresults/ is not disallowed
--   * disclaimer https://pr.mo.gov/disclaimer.asp: no warranty; no copyright or reuse restriction observed
--   * result sheets print federal boxer IDs, dates of birth, records, ages, the event doctor and suspension comments that
--     can carry medical reasons: dropped by column at parse time (shared/adapters/commissions/missouri.mjs)
-- Approval covers FACTS with attribution. Documents are not redistributed. Rerunnable.

begin;

insert into public.boxing_sources (source_key, source_name, source_kind, homepage_url, terms_url, access_mode, rights_state,
  redistribution_allowed, enabled, persistence_allowed, derivative_allowed, display_allowed, intended_use, rights_note)
values ('mo_office_of_athletics', 'Missouri Office of Athletics (Division of Professional Registration)', 'commission', 'https://pr.mo.gov/athletics.asp', 'https://pr.mo.gov/disclaimer.asp',
  'review_required', 'unknown', false, false, false, false, false,
  'Official professional boxing show results: bouts, results, methods, rounds, times, weights, scheduled rounds, referees and judges by bout.',
  'Pending review.')
on conflict (source_key) do nothing;

do $$
declare
  v_src uuid;
  v_review uuid;
  v_at timestamptz := '2026-09-14T12:00:00Z';
begin
  select id into v_src from public.boxing_sources where source_key = 'mo_office_of_athletics';
  insert into public.boxing_source_rights_reviews
    (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses, account_agreement_found, account_scope_note, next_review_due, notes)
  values (v_src, v_at, 'PropBetEdge owner direction 2026-09-14; access/terms review by Claude Code session 2026-09-14', 'https://pr.mo.gov/disclaimer.asp',
    'approved_with_restrictions',
    array['automated low-rate retrieval of the public results index and professional boxing result PDFs under /boards/athletics/boxingresults/ (robots.txt does not disallow /boards/)',
          'store boxing facts: events, bouts, results, methods, rounds, times, weights, scheduled rounds, referees and judges as assigned by the sheet''s BOUTS column, suspension periods (duration only)',
          'first-party display with attribution to the Missouri Office of Athletics', 'derived analytics and models'],
    array['storing federal boxer ID numbers, dates of birth, ages, fight records printed on the sheet, the event doctor, inspectors or any medical text',
          'attributing judges'' printed totals to named judges (the sheet does not tie totals to judges)',
          'ingesting kickboxing, muay thai, amateur or exhibition bouts into Boxing Core', 'redistributing the PDF documents'],
    false, 'Official government public source; no account or fee.', '2026-12-14',
    'Missouri public records. No copyright or reuse restriction observed on the athletics pages; the disclaimer disclaims warranties only. The site serves only its leaf TLS certificate; retrieval completes the chain from system roots.')
  on conflict (source_id, reviewed_at) do nothing;
  select id into v_review from public.boxing_source_rights_reviews where source_id = v_src and reviewed_at = v_at;
  update public.boxing_sources set
    latest_rights_review_id = v_review,
    access_mode = 'approved_ingest',
    rights_state = 'approved',
    enabled = true,
    persistence_allowed = true,
    derivative_allowed = true,
    display_allowed = true,
    redistribution_allowed = false,
    attribution_required = 'Attribute the commission as the official source.',
    reviewed_at = v_at,
    reviewed_by = 'PropBetEdge owner direction (access/terms review 2026-09-14)',
    next_review_due = '2026-12-14',
    rights_note = 'APPROVED (2026-09-14): official public results; facts with attribution; private columns and medical text dropped at parse; documents not redistributed.'
  where id = v_src and (latest_rights_review_id is distinct from v_review);
end $$;

commit;
