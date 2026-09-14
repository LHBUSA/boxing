-- PropBetEdge Boxing — Pennsylvania State Athletic Commission as an approved official commission source.
--
-- Access/terms review 2026-09-14 (docs/sources/commissions.json, owner direction 2026-09-14 "continue adapters for
-- Pennsylvania, Texas, Tennessee, Missouri"):
--   * results index https://www.pa.gov/agencies/dos/programs/state-athletic/results: one result PDF per event
--   * robots.txt (https://www.pa.gov/robots.txt) disallows only /form/ksca-form/ksca.html; result PDFs under
--     /content/dam/copapwp-pagov/... are not disallowed
--   * results page footer "Copyright (c) 2026 Commonwealth of Pennsylvania. All rights reserved." covers the site; facts
--     from the Commission's public result sheets are extracted with attribution, documents are not redistributed
--     (the same treatment as the Nevada site's "All Rights Reserved" footer)
--   * result sheets print birth dates, federal boxer IDs, the physician and remarks that can carry medical reasons:
--     dropped by column at parse time (shared/adapters/commissions/pennsylvania.mjs)
-- Team Boxing League sheets are rejected by the parser until reviewed. Rerunnable.

begin;

insert into public.boxing_sources (source_key, source_name, source_kind, homepage_url, terms_url, access_mode, rights_state,
  redistribution_allowed, enabled, persistence_allowed, derivative_allowed, display_allowed, intended_use, rights_note)
values ('pa_state_athletic_commission', 'Pennsylvania State Athletic Commission (Department of State)', 'commission', 'https://www.pa.gov/agencies/dos/department-and-offices/sac', 'https://www.pa.gov/social-media-policy-and-disclaimer',
  'review_required', 'unknown', false, false, false, false, false,
  'Official boxing result sheets: bouts, results, methods, rounds, times, weights, scheduled rounds, referee per bout, judges listed per event.',
  'Pending review.')
on conflict (source_key) do nothing;

do $$
declare
  v_src uuid;
  v_review uuid;
  v_at timestamptz := '2026-09-14T13:00:00Z';
begin
  select id into v_src from public.boxing_sources where source_key = 'pa_state_athletic_commission';
  insert into public.boxing_source_rights_reviews
    (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses, account_agreement_found, account_scope_note, next_review_due, notes)
  values (v_src, v_at, 'PropBetEdge owner direction 2026-09-14; access/terms review by Claude Code session 2026-09-14', 'https://www.pa.gov/social-media-policy-and-disclaimer',
    'approved_with_restrictions',
    array['automated low-rate retrieval of the public results index and boxing result PDFs (robots.txt disallows only /form/ksca-form/)',
          'store boxing facts: events, bouts, results, methods, rounds, times, weights, scheduled rounds, the referee each bout''s sheet marker names, judges when exactly three are listed, suspension periods (duration only)',
          'first-party display with attribution to the Pennsylvania State Athletic Commission', 'derived analytics and models'],
    array['storing birth dates, federal boxer ID numbers, the physician, timekeeper or any medical remark text',
          'redistributing the PDF documents', 'ingesting MMA, kickboxing, muay thai or bare-knuckle documents into Boxing Core',
          'parsing Team Boxing League sheets before a reviewed parser exists'],
    false, 'Official government public source; no account or fee.', '2026-12-14',
    'Pennsylvania public records; the Commonwealth copyright notice covers the site and its intellectual property, facts are extracted with attribution and documents are not redistributed.')
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
    rights_note = 'APPROVED (2026-09-14): official public result sheets; facts with attribution; private columns and medical remarks dropped at parse; documents not redistributed.'
  where id = v_src and (latest_rights_review_id is distinct from v_review);
end $$;

commit;
