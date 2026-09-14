-- PropBetEdge Boxing — Tennessee Athletic Commission as an approved official commission source.
--
-- Access/terms review 2026-09-14 (docs/sources/commissions.json, owner direction 2026-09-14 "continue adapters for
-- Pennsylvania, Texas, Tennessee, Missouri"; Tennessee adapter ordered 2026-09-14):
--   * results: https://www.tn.gov/commerce/regboards/athletic/events.html (current year) and
--     https://www.tn.gov/commerce/regboards/athletic/events/archive.html (2020-2025): static tables linking one or more
--     result PDFs per event under /content/dam/tn/commerce/documents/regboards/athletic/results/<year>/
--   * robots.txt (https://www.tn.gov/robots.txt): "User-agent: *" "Allow: /"
--   * TN.gov web policies (https://www.tn.gov/web-policies.html): the linking policy asks that TN.gov content is not
--     presented as another site's, not misrepresented, and that TN.gov graphics are not hotlinked; no prohibition on
--     using facts from public records. Facts are extracted with attribution; documents are not redistributed.
--   * result forms print federal boxer IDs and/or birth dates, and suspension origin text that can name a physician
--     ("14 days by Dr."): the FED ID AND/OR DOB column and all suspension text are dropped at parse time; header
--     inspectors, ringside doctors, announcer, timekeeper and office contact details are never read
--     (shared/adapters/commissions/tennessee.mjs)
-- Bare-knuckle, kickboxing, MMA and multi-sport forms, amateur bouts, scanned (image-only or OCR) sheets and bouts with
-- ambiguous WINNER marks are refused by the parser. Rerunnable.

begin;

insert into public.boxing_sources (source_key, source_name, source_kind, homepage_url, terms_url, access_mode, rights_state,
  redistribution_allowed, enabled, persistence_allowed, derivative_allowed, display_allowed, intended_use, rights_note)
values ('tn_athletic_commission', 'Tennessee Athletic Commission (Department of Commerce & Insurance)', 'commission', 'https://www.tn.gov/commerce/regboards/athletic.html', 'https://www.tn.gov/web-policies.html',
  'review_required', 'unknown', false, false, false, false, false,
  'Official boxing result forms: bouts, results, methods, rounds, times, weights, scheduled rounds, referee per bout, judges and their totals per bout.',
  'Pending review.')
on conflict (source_key) do nothing;

do $$
declare
  v_src uuid;
  v_review uuid;
  v_at timestamptz := '2026-09-14T15:00:00Z';
begin
  select id into v_src from public.boxing_sources where source_key = 'tn_athletic_commission';
  insert into public.boxing_source_rights_reviews
    (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses, account_agreement_found, account_scope_note, next_review_due, notes)
  values (v_src, v_at, 'PropBetEdge owner direction 2026-09-14; access/terms review by Claude Code session 2026-09-14', 'https://www.tn.gov/web-policies.html',
    'approved_with_restrictions',
    array['automated low-rate retrieval of the public events and archive pages and boxing result PDFs (robots.txt allows all)',
          'store boxing facts: events, bouts, results (winner from the form''s WINNER selection), methods, rounds, times, weights, scheduled rounds, the referee named on each bout''s line, judges and totals from each bout''s score lines, suspension periods (duration only)',
          'first-party display with attribution to the Tennessee Athletic Commission', 'derived analytics and models'],
    array['storing birth dates, federal boxer ID numbers, suspension origin text, ringside doctors, inspectors or office contact details',
          'redistributing or hotlinking the PDF documents as our content', 'ingesting MMA, kickboxing, bare-knuckle or amateur bouts into Boxing Core',
          'guessing a winner, a judge or a score attribution the form does not state'],
    false, 'Official government public source; no account or fee.', '2026-12-14',
    'Tennessee public records on TN.gov; facts are extracted with attribution and documents are not redistributed.')
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
    rights_note = 'APPROVED (2026-09-14): official public result forms; facts with attribution; FED ID/DOB column, suspension text and medical staff dropped at parse; documents not redistributed.'
  where id = v_src and (latest_rights_review_id is distinct from v_review);
end $$;

commit;
