-- PropBetEdge Boxing — source acquisition decisions in the registry
--
-- Records the 2026-09-13 terms research (docs/BOXING_SOURCE_ACQUISITION.md) as
-- append-only rights reviews and makes the registry match it:
--   BoxRec, CompuBox              -> BLOCKED (access_mode blocked, rights prohibited)
--   WBC/WBA/IBF/WBO               -> review_required (no terms grant found)
--   Boxing Data API (RapidAPI)    -> new row, review_required, disabled
--   athletic commissions          -> concrete per-jurisdiction rows, review_required, disabled
-- Nothing here enables collection. Only the_odds_api (migration 0010) and
-- existing internal/wikidata rows are enabled. Rerunnable.

begin;

-- concrete candidate rows (disabled)
insert into public.boxing_sources (source_key, source_name, source_kind, homepage_url, terms_url, access_mode, rights_state,
  redistribution_allowed, enabled, persistence_allowed, derivative_allowed, display_allowed, intended_use, rights_note)
values
  ('boxing_data_api', 'Boxing Data API (boxing-data.com via RapidAPI)', 'data_provider', 'https://boxing-data.com/', 'https://rapidapi.com/page/terms',
   'review_required', 'unknown', false, false, false, false, false,
   'Candidate for fighters, records, fights, events, schedules, results, score totals, titles, organizations, divisions, broadcasters.',
   'YELLOW (2026-09-13): provider publishes no terms; RapidAPI terms leave data rights to the provider and are silent on storage, derivatives and ML. Rankings self-described as sourced from BoxingScene; upstream provenance unknown. Do not ingest until a written licence + provenance/IP warranty exists.'),
  ('nsac_nevada', 'Nevada State Athletic Commission', 'commission', 'https://boxing.nv.gov/', 'https://nv.gov/privacy-policy',
   'review_required', 'unknown', false, false, false, false, false,
   'Official result PDFs: officials, judge names and totals, point deductions, title notes.',
   'YELLOW, strong official source: public result PDFs 2020-2026; footer "All Rights Reserved"; no reuse licence. Legal review (public records vs copyright notice); strip Federal IDs.'),
  ('csac_california', 'California State Athletic Commission', 'commission', 'https://www.dca.ca.gov/csac/', 'https://www.ca.gov/legal/conditions-of-use/',
   'review_required', 'unknown', false, false, false, false, false,
   'Schedules and CSAC-authored documents; official result sheets via public records request.',
   'GREEN for CSAC-authored content (ca.gov public domain statement) but event results are delegated to BoxRec (blocked). First-party results require a CPRA request.'),
  ('nysac_new_york', 'New York State Athletic Commission', 'commission', 'https://dos.ny.gov/athletic-commission', 'https://dos.ny.gov/disclaimer',
   'review_required', 'unknown', false, false, false, false, false,
   'Upcoming events; results/scorecards/suspensions via FOIL.',
   'YELLOW: site blocks automated fetch; only upcoming events published; no reuse terms found. FOIL request for results, scorecards and suspensions.'),
  ('nj_sacb', 'New Jersey State Athletic Control Board', 'commission', 'https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/', null,
   'review_required', 'unknown', false, false, false, false, false,
   'Official show results with individual judge scores and suspensions.',
   'YELLOW, strong official source: result PDFs include per-judge scores and suspensions; no reuse terms found. Legal review; strip IDs; suspension page links to BoxRec (blocked).'),
  ('tdlr_texas', 'Texas Department of Licensing and Regulation — Combative Sports', 'commission', 'https://www.tdlr.texas.gov/sports/', 'https://www.tdlr.texas.gov/disclaimer.htm',
   'review_required', 'unknown', false, false, false, false, false,
   'Results of past events, boxing champions.',
   'GREEN with conditions: state content may be copied with source agency, URL and copy date, non-misleading and non-endorsement, no logos. Result document format not yet verified (JS-loaded table).'),
  ('florida_athletic_commission', 'Florida Athletic Commission (DBPR)', 'commission', 'https://www2.myfloridalicense.com/athletic-commission/', 'https://www2.myfloridalicense.com/disclaimer/',
   'review_required', 'unknown', false, false, false, false, false,
   'Professional event result PDFs incl. officials and suspension periods.',
   'YELLOW, strong official source: ~1,230 result PDFs; copyright footer, no reuse grant. Legal review; never store DOB or Federal ID.'),
  ('bbbofc_uk', 'British Boxing Board of Control', 'commission', 'https://www.bbbofc.com/', null,
   'review_required', 'unknown', false, false, false, false, false,
   'Board champion lists and publications (results widget is BoxRec data).',
   'RED for results (provided by BoxRec); YELLOW for Board publications (no terms page). Outreach for champion lists and official returns.')
on conflict (source_key) do nothing;

do $$
declare
  r record;
  v_src uuid;
  v_review uuid;
begin
  for r in select * from (values
    ('boxrec', 'blocked', 'https://boxrec.com/en/policies/terms_conditions/public', null::date,
     array[]::text[],
     array['text or data mining, web scraping, bots/spiders/scrapers', 'commercial use of content without a licence', 'creating a database from site material (2022 terms)', 'use of BoxRec ratings by betting/fantasy platforms without an official licence (2022 terms)'],
     'Live terms behind a Cloudflare challenge (403); quotes from Wayback captures 2025-12-29 and 2024-03-26. BoxRec claims IP incl. database rights in profile/results data. Licensing outreach required (help@boxrec.com). No scraping.'),
    ('compubox', 'blocked', 'https://app2.compuboxdata.com/terms-and-conditions', null,
     array[]::text[],
     array['any commercial use without prior written consent', 'reproduction, redistribution, derivative works', 'use of punch statistics (claimed as CompuBox property)'],
     'Personal non-commercial use only. Data feeds for sportsbook/fantasy use require contacting CompuBox. Licensing inquiry required before any punch-level data.'),
    ('wbc_official', 'review_required', 'https://wbcboxing.com/en/aviso-de-privacidad/', null,
     array[]::text[], array[]::text[],
     'Ratings published free in HTML; only a privacy policy found, no terms of use or reuse grant. Written permission outreach + legal review (compilation/database rights). Facts-only references with attribution; no logos.'),
    ('wba_official', 'review_required', 'https://www.wbaboxing.com/important-legal-information', null,
     array[]::text[], array[]::text[],
     'Monthly rankings in HTML with archive; legal page is a disclaimer only, copyright footer. Written permission outreach + legal review.'),
    ('ibf_official', 'review_required', 'https://www.ibf-usba-boxing.com/privacy-policy/', null,
     array[]::text[], array[]::text[],
     'Ratings table loaded by JavaScript; PDF via form POST; only privacy policy + All Rights Reserved footer. Written permission outreach + legal review.'),
    ('wbo_official', 'review_required', 'https://wboboxing.com/', null,
     array[]::text[], array[]::text[],
     'Rankings PDF; footer All Rights Reserved, no terms page (404). Written permission outreach + legal review.'),
    ('boxing_data_api', 'review_required', 'https://rapidapi.com/page/terms', '2026-05-13'::date,
     array[]::text[], array['nothing expressly granted: storage, display, derivative analytics and ML are unaddressed by provider and RapidAPI'],
     'Plans $0/$29/$99/$249 per month (100/5k/50k/500k requests); only Mega ($249) has unlimited history. No PropBetEdge RapidAPI subscription found. Outreach to hello@boxing-data.com for written licence, retention after cancellation, provenance and IP warranty.')
  ) as t(source_key, decision, terms_url, terms_last_updated, permitted, prohibited, notes)
  loop
    select id into v_src from public.boxing_sources where source_key = r.source_key;
    continue when v_src is null;
    insert into public.boxing_source_rights_reviews
      (source_id, reviewed_at, reviewed_by, terms_url, terms_last_updated, decision, permitted_uses, prohibited_uses, account_agreement_found,
       account_scope_note, next_review_due, notes)
    values (v_src, '2026-09-13T00:00:00Z', 'PropBetEdge owner direction; public terms research by Claude Code session 2026-09-13', r.terms_url,
            r.terms_last_updated, r.decision, r.permitted, r.prohibited, false, 'No PropBetEdge licence or agreement found.', '2026-12-13', r.notes)
    on conflict (source_id, reviewed_at) do nothing;
    select id into v_review from public.boxing_source_rights_reviews where source_id = v_src and reviewed_at = '2026-09-13T00:00:00Z';
    update public.boxing_sources set
      latest_rights_review_id = v_review,
      terms_url = coalesce(terms_url, r.terms_url),
      terms_last_updated = coalesce(terms_last_updated, r.terms_last_updated),
      next_review_due = '2026-12-13',
      enabled = false,
      access_mode = case when r.decision = 'blocked' then 'blocked' else access_mode end,
      rights_state = case when r.decision = 'blocked' then 'prohibited' else rights_state end,
      persistence_allowed = false, derivative_allowed = false, display_allowed = false, redistribution_allowed = false,
      rights_note = case when r.decision = 'blocked' then 'BLOCKED (2026-09-13): ' else 'REVIEW REQUIRED (2026-09-13): ' end || r.notes
    where id = v_src and latest_rights_review_id is null;
  end loop;
end $$;

select public.boxing_lockdown();

commit;
