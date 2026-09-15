-- Global Boxing History + Fighter Intelligence V1: the first vertical slice's schema (docs/history/GLOBAL_BOXING_HISTORY_V1.md).
--
-- Additive only. No existing table, constraint, recorder, identity rule, parser or Fight DNA / model object changes; every
-- read below is a stable function over the canonical graph that already exists. The global ids are the frozen public ids
-- (global_fighter_id = boxing_fighters.public_id, global_bout_id = boxing_bouts.public_id, ...): nothing new is minted.
--
-- 1. boxing_jurisdictions: global_jurisdiction_id (ISO 3166-1 country / ISO 3166-2 subdivision codes) for the commissions
--    already registered; boxing_jurisdiction_json() resolves a venue or commission to it without changing either table.
-- 2. boxing_source_capabilities + boxing_source_registry_json(): the formal source/provenance registry. What each source
--    provides per data lane, under which rights scope, jurisdiction, coverage, acquisition method, cadence, completeness,
--    confidence and parser lineage; stored coverage and parser versions are computed live, never typed in.
-- 3. boxing_weight_class_definitions + boxing_weight_class_as_of() + boxing_archive_bout_weights(): time-aware weight class
--    rules. Only the present-day reference is seeded; a historical limit needs a source row (none is invented).
-- 4. boxing_result_classes + boxing_classify_result() (pbe_result_ontology@1) + boxing_archive_decision_check(): the result
--    ontology over the stored method / decision type / outcome / state, keeping the source string and flagging, never
--    reinterpreting, anything ambiguous.
-- 5. boxing_classify_title_remark() (pbe_title_remark_ontology@1): world, interim, continental, regional, national, silver,
--    gold, youth belts as printed on a commission sheet, classified without creating titles or title events.
-- 6. boxing_archive_title_runs() (pbe_title_runs@1): a body's own month-by-month statements collapsed into runs. A run is
--    evidence, not a reign; reigns stay derived from confirmed title events only.
-- 7. Reads: boxing_archive_card, boxing_fighter_passport (as-of), boxing_archive_division, boxing_archive_meetings,
--    boxing_archive_assertions, boxing_archive_index.

begin;

-- 1 -------------------------------------------------------------------------------------------------------------------
create table if not exists public.boxing_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxjurisdiction_' || replace(gen_random_uuid()::text, '-', '')),
  jurisdiction_code text not null unique check (jurisdiction_code ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?(:[a-z0-9_]{2,40})?$'),
  kind text not null check (kind in ('country','subdivision','territory','tribal','international','other')),
  name text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  parent_id uuid references public.boxing_jurisdictions(id) on delete restrict,
  code_basis text not null check (code_basis in ('iso_3166_1','iso_3166_2','pbe_local')),
  created_at timestamptz not null default now(),
  check ((kind = 'country') = (parent_id is null))
);
drop trigger if exists boxing_jurisdictions_freeze_public_id on public.boxing_jurisdictions;
create trigger boxing_jurisdictions_freeze_public_id before update on public.boxing_jurisdictions
  for each row execute function public.boxing_freeze_columns('public_id');

insert into public.boxing_jurisdictions (jurisdiction_code, kind, name, country_code, code_basis)
values ('US', 'country', 'United States', 'US', 'iso_3166_1'), ('GB', 'country', 'United Kingdom', 'GB', 'iso_3166_1')
on conflict (jurisdiction_code) do nothing;
insert into public.boxing_jurisdictions (jurisdiction_code, kind, name, country_code, parent_id, code_basis)
select v.code, 'subdivision', v.name, 'US', (select id from public.boxing_jurisdictions where jurisdiction_code = 'US'), 'iso_3166_2'
from (values ('US-NV','Nevada'), ('US-FL','Florida'), ('US-NJ','New Jersey'), ('US-MO','Missouri'), ('US-PA','Pennsylvania'),
             ('US-TN','Tennessee'), ('US-TX','Texas'), ('US-CA','California'), ('US-NY','New York')) v(code, name)
on conflict (jurisdiction_code) do nothing;

-- a region code ('NV') or, for rows that store only a subdivision name ('Nevada'), that exact name within the country
create or replace function public.boxing_jurisdiction_json(p_country text, p_region text, p_subdivision_name text default null)
returns jsonb language sql stable set search_path = '' as $$
  select case when nullif(btrim(p_country), '') is null then null else coalesce(
    (select jsonb_build_object('global_jurisdiction_id', j.public_id, 'code', j.jurisdiction_code, 'kind', j.kind, 'name', j.name, 'country_code', j.country_code, 'registered', true)
       from public.boxing_jurisdictions j where j.jurisdiction_code = upper(btrim(p_country)) || '-' || upper(btrim(p_region))),
    (select jsonb_build_object('global_jurisdiction_id', j.public_id, 'code', j.jurisdiction_code, 'kind', j.kind, 'name', j.name, 'country_code', j.country_code, 'registered', true)
       from public.boxing_jurisdictions j where j.kind = 'subdivision' and j.country_code = upper(btrim(p_country)) and lower(j.name) = lower(btrim(p_subdivision_name))),
    (select jsonb_build_object('global_jurisdiction_id', j.public_id, 'code', j.jurisdiction_code, 'kind', j.kind, 'name', j.name, 'country_code', j.country_code, 'registered', true,
        'subdivision_as_printed', coalesce(nullif(btrim(p_region), ''), nullif(btrim(p_subdivision_name), '')))
       from public.boxing_jurisdictions j where j.jurisdiction_code = upper(btrim(p_country))),
    jsonb_build_object('code', upper(btrim(p_country)), 'subdivision_as_printed', nullif(btrim(p_region), ''), 'registered', false)) end
$$;

-- 2 -------------------------------------------------------------------------------------------------------------------
create table if not exists public.boxing_source_capabilities (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  lane text not null check (lane in ('events','upcoming_cards','bouts','results','stoppage_round_time','scorecard_totals','scorecard_rounds','judges','referees',
    'weigh_ins','point_deductions','knockdowns','suspensions','titles_at_stake','title_status','rankings','fighter_identity','fighter_attributes','venues',
    'promoters','broadcasters','hall_inductions','odds')),
  availability text not null check (availability in ('provided','partial','not_provided','not_permitted','unverified')),
  rights_scope text not null check (rights_scope in ('covered_by_rights_review','review_scope_gap','not_permitted','not_applicable')),
  jurisdiction_code text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  coverage_from date,
  coverage_to date,
  coverage_basis text not null check (coverage_basis in ('source_index_documented','stored_documents','research_note','none')),
  acquisition_method text not null check (acquisition_method in ('html','pdf','json','ical','sparql','api','manual','none')),
  cadence text,
  completeness text not null check (completeness in ('complete_for_range','partial','unknown')),
  confidence text not null check (confidence in ('high','medium','low')),
  notes text,
  evidence jsonb not null default '{}'::jsonb,
  recorded_by text not null,
  recorded_at timestamptz not null default now(),
  supersedes_id uuid references public.boxing_source_capabilities(id) on delete restrict,
  check (coverage_to is null or coverage_from is null or coverage_to >= coverage_from),
  check (availability <> 'not_permitted' or rights_scope = 'not_permitted')
);
create unique index if not exists boxing_source_capabilities_one_successor on public.boxing_source_capabilities (supersedes_id) where supersedes_id is not null;
select public.boxing_install_append_only('public.boxing_source_capabilities');

create or replace view public.boxing_source_capabilities_current with (security_invoker = true) as
  select c.* from public.boxing_source_capabilities c
  where not exists (select 1 from public.boxing_source_capabilities n where n.supersedes_id = c.id);

do $$
declare v_by text := 'pbe_history_source_audit@2026-09-15';
begin
  create temporary table cap_seed (source_key text, lanes text[], availability text, rights_scope text, jurisdiction_code text, country_code text, coverage_from date,
    coverage_to date, coverage_basis text, acquisition_method text, cadence text, completeness text, confidence text, notes text, doc text) on commit drop;
  insert into cap_seed values
  -- commissions (docs/sources/commissions.md, docs/COMMISSION_INGESTION.md)
  ('nsac_nevada', array['events','bouts','results','stoppage_round_time','judges','referees','weigh_ins','point_deductions','titles_at_stake','venues','promoters'],
    'provided', 'covered_by_rights_review', 'US-NV', 'US', date '2020-01-01', null, 'source_index_documented', 'pdf', 'daily 11:40Z cron; <=12 PDFs a run', 'partial', 'high',
    'Yearly redacted results PDFs. Titles as printed in remarks; promoters as listed.', 'docs/sources/commissions.md'),
  ('nsac_nevada', array['scorecard_totals'], 'partial', 'covered_by_rights_review', 'US-NV', 'US', date '2020-01-01', null, 'source_index_documented', 'pdf', 'daily', 'partial', 'high',
    'Judges'' totals printed for decisions only, judges named by surname and resolved to the sheet header.', 'shared/adapters/commissions/nevada.mjs'),
  ('nsac_nevada', array['scorecard_rounds','knockdowns','broadcasters'], 'not_provided', 'not_applicable', 'US-NV', 'US', null, null, 'none', 'none', null, 'unknown', 'high',
    'The results sheet prints no round-by-round cards, knockdowns or broadcaster.', 'docs/sources/commissions.md'),
  ('nsac_nevada', array['fighter_identity'], 'partial', 'covered_by_rights_review', 'US-NV', 'US', date '2020-01-01', null, 'source_index_documented', 'pdf', 'daily', 'partial', 'medium',
    'Licensed name and hometown only; no fighter ids, no DOB used.', 'docs/IDENTITY_GRAPH.md'),
  ('nsac_nevada', array['upcoming_cards'], 'partial', 'covered_by_rights_review', 'US-NV', 'US', null, null, 'none', 'ical', 'daily', 'partial', 'high',
    'Public calendar gives events, never bouts.', 'docs/COMMISSION_INGESTION.md'),
  ('florida_athletic_commission', array['events','bouts','results','stoppage_round_time','judges','referees','weigh_ins','suspensions','venues'],
    'provided', 'covered_by_rights_review', 'US-FL', 'US', null, null, 'research_note', 'pdf', 'daily 11:40Z cron', 'partial', 'high',
    'About 1,230 result PDFs listed; suspension duration only. BKFC/MMA rejected.', 'docs/sources/commissions.md'),
  ('florida_athletic_commission', array['scorecard_totals','point_deductions','titles_at_stake','fighter_identity'], 'unverified', 'covered_by_rights_review', 'US-FL', 'US', null, null, 'none', 'pdf', null, 'unknown', 'low',
    'Not yet audited lane by lane.', 'docs/history/GLOBAL_BOXING_HISTORY_V1.md'),
  ('nj_sacb', array['upcoming_cards','events','venues','promoters'], 'provided', 'covered_by_rights_review', 'US-NJ', 'US', null, null, 'research_note', 'html', 'daily 11:40Z cron', 'partial', 'high',
    'Schedule facts: the scope of the 2026-09-13 rights review.', 'supabase/migrations/20260913000014_boxing_commission_ingestion.sql'),
  ('nj_sacb', array['bouts','results','stoppage_round_time','scorecard_totals','judges','referees','weigh_ins','suspensions','titles_at_stake'],
    'provided', 'review_scope_gap', 'US-NJ', 'US', null, null, 'stored_documents', 'pdf', 'daily 11:40Z cron', 'partial', 'high',
    'Result PDFs are parsed (nj-sacb@1.1.x) but the recorded rights review covers schedule facts only: owner re-review required.', 'docs/history/GLOBAL_BOXING_HISTORY_V1.md#d'),
  ('mo_office_of_athletics', array['events','bouts','results','stoppage_round_time','referees','judges','weigh_ins','suspensions','venues'],
    'provided', 'covered_by_rights_review', 'US-MO', 'US', date '2017-01-01', null, 'source_index_documented', 'pdf', 'daily 11:40Z cron', 'partial', 'high',
    'Archive to 2017; about 9 professional cards a year. Amateur and exhibition sections rejected.', 'supabase/migrations/20260914000027_boxing_missouri_commission.sql'),
  ('mo_office_of_athletics', array['scorecard_totals'], 'partial', 'covered_by_rights_review', 'US-MO', 'US', date '2017-01-01', null, 'source_index_documented', 'pdf', 'daily', 'partial', 'high',
    'Printed totals are not attributable to named judges; stored as published totals, never per judge.', 'supabase/migrations/20260914000028_boxing_site_published_totals.sql'),
  ('pa_state_athletic_commission', array['events','bouts','results','stoppage_round_time','referees','weigh_ins','suspensions','venues'],
    'provided', 'covered_by_rights_review', 'US-PA', 'US', date '2024-01-01', null, 'source_index_documented', 'pdf', 'daily 11:40Z cron', 'partial', 'high',
    'Year index lists 2024-2026; Team Boxing League sheets rejected.', 'supabase/migrations/20260914000029_boxing_pennsylvania_commission.sql'),
  ('pa_state_athletic_commission', array['judges'], 'partial', 'covered_by_rights_review', 'US-PA', 'US', date '2024-01-01', null, 'source_index_documented', 'pdf', 'daily', 'partial', 'high',
    'Judges only when exactly three are listed.', 'shared/adapters/commissions/pennsylvania.mjs'),
  ('tn_athletic_commission', array['events','bouts','results','stoppage_round_time','scorecard_totals','judges','referees','weigh_ins','suspensions','venues'],
    'provided', 'covered_by_rights_review', 'US-TN', 'US', date '2020-01-01', null, 'source_index_documented', 'pdf', 'daily 11:40Z cron', 'partial', 'high',
    'Flattened result forms; 18 scanned or OCR sheets refused. No hometown or DOB printed, so repeat names go to review.', 'docs/sources/tennessee.md'),
  ('tdlr_texas', array['events','bouts','results','scorecard_totals','judges','referees','weigh_ins','suspensions'], 'not_permitted', 'not_permitted', 'US-TX', 'US', null, null, 'none', 'none', null, 'unknown', 'high',
    'robots.txt disallows /*.csv (the event list); reference only.', 'supabase/migrations/20260913000014_boxing_commission_ingestion.sql'),
  -- sanctioning bodies (docs/TITLES_RANKINGS_INGESTION.md)
  ('wba_official', array['title_status','rankings'], 'provided', 'covered_by_rights_review', null, null, date '2000-01-01', null, 'stored_documents', 'html', 'monthly', 'partial', 'high',
    '311 months stored; months printing a division twice or an unknown division stay refused.', 'docs/TITLES_RANKINGS_INGESTION.md'),
  ('wba_official', array['fighter_identity'], 'partial', 'covered_by_rights_review', null, null, date '2000-01-01', null, 'stored_documents', 'html', 'monthly', 'partial', 'medium',
    'WBA boxer profile ids where printed; names as printed otherwise.', 'shared/adapters/sanctioning/wba.mjs'),
  ('ibf_official', array['title_status','rankings'], 'provided', 'covered_by_rights_review', null, null, date '2005-12-01', null, 'stored_documents', 'json', 'monthly', 'partial', 'high',
    '248 months stored from the public ratings filter.', 'docs/TITLES_RANKINGS_INGESTION.md'),
  ('wbo_official', array['title_status','rankings'], 'provided', 'covered_by_rights_review', null, null, date '2000-01-01', null, 'stored_documents', 'pdf', 'monthly', 'partial', 'high',
    '306 months stored; 14 months unavailable.', 'docs/TITLES_RANKINGS_INGESTION.md'),
  ('wbc_official', array['title_status','rankings'], 'provided', 'covered_by_rights_review', null, null, date '2026-09-01', null, 'stored_documents', 'pdf', 'monthly', 'partial', 'high',
    'Only the current ratings PDF is publicly linked: earlier months are a source-access gap, never guessed.', 'docs/TITLES_RANKINGS_INGESTION.md'),
  -- open data / providers
  ('wikidata', array['fighter_identity','hall_inductions'], 'provided', 'covered_by_rights_review', null, null, null, null, 'research_note', 'sparql', 'on demand', 'partial', 'high',
    'CC0. Identity crosswalk only when a deterministic rule proves the item (e.g. its Wikipedia record row lists our bout); never P1967.', 'scripts/identity/wikidata-enrich.mjs'),
  ('wikidata', array['fighter_attributes'], 'partial', 'covered_by_rights_review', null, null, null, null, 'research_note', 'sparql', 'on demand', 'partial', 'medium',
    'Nationality, height and labels; date of birth is not stored under the owner rule.', 'docs/SOURCE_POLICY.md'),
  ('the_odds_api', array['odds'], 'provided', 'covered_by_rights_review', null, null, null, null, 'stored_documents', 'api', 'forward capture every 15 minutes', 'partial', 'high',
    'First-party display and derived values only; no raw redistribution.', 'supabase/migrations/20260913000010_boxing_odds_provider_ledger.sql'),
  ('the_odds_api', array['fighter_identity','bouts'], 'not_provided', 'not_applicable', null, null, null, null, 'none', 'none', null, 'unknown', 'high',
    'Sportsbook names never create fighters or bouts (owner rule).', 'docs/ODDS_CAPTURE.md'),
  -- blocked
  ('boxrec', array['bouts','results','fighter_identity','fighter_attributes'], 'not_permitted', 'not_permitted', null, null, null, null, 'none', 'none', null, 'unknown', 'high',
    'Terms prohibit text and data mining and claim database rights; licence not pursued (zero paid sources).', 'supabase/migrations/20260913000012_boxing_source_acquisition_registry.sql'),
  ('compubox', array['knockdowns','scorecard_rounds'], 'not_permitted', 'not_permitted', null, null, null, null, 'none', 'none', null, 'unknown', 'high',
    'Personal use only; punch statistics claimed as CompuBox property.', 'supabase/migrations/20260913000012_boxing_source_acquisition_registry.sql'),
  ('promoter_top_rank', array['upcoming_cards','bouts'], 'not_permitted', 'not_permitted', null, null, null, null, 'none', 'none', null, 'unknown', 'high', 'Terms ban robots and scrapers.', 'docs/sources/promoters.md'),
  ('promoter_queensberry', array['upcoming_cards','bouts'], 'not_permitted', 'not_permitted', null, null, null, null, 'none', 'none', null, 'unknown', 'high', 'Terms ban spidering and scraping.', 'docs/sources/promoters.md'),
  ('promoter_boxxer', array['upcoming_cards','bouts'], 'not_permitted', 'not_permitted', null, null, null, null, 'none', 'none', null, 'unknown', 'high', 'Terms ban spidering and scraping.', 'docs/sources/promoters.md');

  insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, jurisdiction_code, country_code, coverage_from, coverage_to, coverage_basis,
    acquisition_method, cadence, completeness, confidence, notes, evidence, recorded_by)
  select s.id, l.lane, c.availability, c.rights_scope, c.jurisdiction_code, c.country_code, c.coverage_from, c.coverage_to, c.coverage_basis,
    c.acquisition_method, c.cadence, c.completeness, c.confidence, c.notes, jsonb_build_object('documented_in', c.doc), v_by
  from cap_seed c join public.boxing_sources s on s.source_key = c.source_key
  cross join lateral unnest(c.lanes) l(lane)
  where not exists (select 1 from public.boxing_source_capabilities x where x.source_id = s.id and x.lane = l.lane);
end $$;

create or replace function public.boxing_source_registry_json(p_source_key text default null)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'source_key', s.source_key, 'source_name', s.source_name, 'source_kind', s.source_kind, 'access_mode', s.access_mode, 'rights_state', s.rights_state, 'enabled', s.enabled,
    'homepage_url', s.homepage_url, 'terms_url', s.terms_url, 'redistribution_allowed', s.redistribution_allowed, 'derivative_allowed', s.derivative_allowed,
    'display_allowed', s.display_allowed, 'attribution_required', s.attribution_required, 'reviewed_at', s.reviewed_at, 'next_review_due', s.next_review_due,
    'latest_rights_review', (select jsonb_build_object('decision', r.decision, 'reviewed_at', r.reviewed_at, 'permitted_uses', r.permitted_uses, 'prohibited_uses', r.prohibited_uses,
        'next_review_due', r.next_review_due) from public.boxing_source_rights_reviews r where r.source_id = s.id order by r.reviewed_at desc limit 1),
    'lanes', (select coalesce(jsonb_agg(jsonb_build_object('lane', c.lane, 'availability', c.availability, 'rights_scope', c.rights_scope, 'jurisdiction', c.jurisdiction_code,
        'country', c.country_code, 'coverage_from', c.coverage_from, 'coverage_to', c.coverage_to, 'coverage_basis', c.coverage_basis, 'acquisition', c.acquisition_method,
        'cadence', c.cadence, 'completeness', c.completeness, 'confidence', c.confidence, 'notes', c.notes, 'evidence', c.evidence, 'recorded_at', c.recorded_at) order by c.lane), '[]'::jsonb)
      from public.boxing_source_capabilities_current c where c.source_id = s.id),
    'stored', jsonb_build_object(
      'events', (select count(*) from public.boxing_events e where e.source_id = s.id),
      'event_dates', (select jsonb_build_object('from', min(e.event_date), 'to', max(e.event_date)) from public.boxing_events e where e.source_id = s.id),
      'bouts', (select count(*) from public.boxing_bouts b where b.source_id = s.id),
      'result_rows', (select count(*) from public.boxing_bout_results r where r.source_id = s.id),
      'scorecard_rows', (select count(*) from public.boxing_scorecards c where c.source_id = s.id),
      'title_documents', (select count(*) from public.boxing_title_status_snapshots t where t.source_id = s.id),
      'title_document_dates', (select jsonb_build_object('from', min(coalesce(t.as_of, t.published_on)), 'to', max(coalesce(t.as_of, t.published_on)))
                               from public.boxing_title_status_snapshots t where t.source_id = s.id),
      'fighter_identities', (select count(*) from public.boxing_fighter_identities i where i.source_id = s.id)),
    'parser_lineage', (select coalesce(jsonb_agg(jsonb_build_object('parser_version', p.parser_version, 'observations', p.n, 'first_observed_at', p.first_at, 'last_observed_at', p.last_at)
        order by p.first_at), '[]'::jsonb)
      from (select o.parser_version, count(*) n, min(o.observed_at) first_at, max(o.observed_at) last_at from public.boxing_source_observations o
            where o.source_id = s.id and o.parser_version is not null group by 1) p)
  ) order by s.source_kind, s.source_key), '[]'::jsonb)
  from public.boxing_sources s where p_source_key is null or s.source_key = p_source_key
$$;

-- 3 -------------------------------------------------------------------------------------------------------------------
create table if not exists public.boxing_weight_class_definitions (
  id uuid primary key default gen_random_uuid(),
  weight_class_id uuid not null references public.boxing_weight_classes(id) on delete restrict,
  organization_id uuid references public.boxing_organizations(id) on delete restrict,
  gender_scope text not null default 'all' check (gender_scope in ('all','male','female')),
  native_label text,
  limit_lb numeric(6,2) check (limit_lb is null or limit_lb > 0),
  limit_kg numeric(7,3) check (limit_kg is null or limit_kg > 0),
  valid_from date,
  valid_to date,
  basis text not null check (basis in ('pbe_modern_reference','source_document','source_statement')),
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  note text,
  recorded_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from),
  check (basis = 'pbe_modern_reference' or (source_id is not null and source_url is not null)),
  check (basis <> 'pbe_modern_reference' or (organization_id is null and valid_from is null and valid_to is null))
);
select public.boxing_install_append_only('public.boxing_weight_class_definitions');

insert into public.boxing_weight_class_definitions (weight_class_id, gender_scope, native_label, limit_lb, limit_kg, basis, source_id, note)
select w.id, w.gender_scope, w.name, w.max_weight_lb, w.max_weight_kg, 'pbe_modern_reference', (select id from public.boxing_sources where source_key = 'pbe_boxing_internal'),
  'Present-day reference limit. Not evidence of the limit in force on any historical date.'
from public.boxing_weight_classes w
where not exists (select 1 from public.boxing_weight_class_definitions d where d.weight_class_id = w.id and d.basis = 'pbe_modern_reference');

create or replace function public.boxing_weight_class_as_of(p_class uuid, p_date date, p_org uuid default null)
returns jsonb language sql stable set search_path = '' as $$
  with sourced as (
    select d.* from public.boxing_weight_class_definitions d
    where d.weight_class_id = p_class and d.basis <> 'pbe_modern_reference'
      and (d.organization_id is not distinct from p_org or d.organization_id is null)
      and (d.valid_from is null or d.valid_from <= p_date) and (d.valid_to is null or d.valid_to >= p_date)
    order by (d.organization_id is not distinct from p_org) desc, d.valid_from desc nulls last, d.recorded_at desc limit 1),
  ref as (select d.* from public.boxing_weight_class_definitions d where d.weight_class_id = p_class and d.basis = 'pbe_modern_reference' limit 1),
  chosen as (select * from sourced union all select * from ref where not exists (select 1 from sourced) limit 1)
  select case when p_class is null then null else (select jsonb_build_object('rule', 'pbe_weight_class_as_of@1',
    'weight_class', w.class_key, 'name', w.name, 'limit_lb', c.limit_lb, 'limit_kg', c.limit_kg, 'basis', c.basis, 'valid_from', c.valid_from, 'valid_to', c.valid_to,
    'verified_for_date', c.basis <> 'pbe_modern_reference',
    'source_url', c.source_url,
    -- each sanctioning body listing this division in a document within 45 days of the date (evidence the class existed, not of its limit)
    'bodies_listing_division', (select coalesce(jsonb_agg(distinct o.slug), '[]'::jsonb) from public.boxing_title_status_snapshots s join public.boxing_organizations o on o.id = s.organization_id
        where s.weight_class_id = p_class and coalesce(s.as_of, s.published_on) between p_date - 45 and p_date + 45),
    'note', c.note)
    from chosen c join public.boxing_weight_classes w on w.id = c.weight_class_id) end
$$;

-- 4 -------------------------------------------------------------------------------------------------------------------
create table if not exists public.boxing_result_classes (
  code text primary key check (code ~ '^[A-Z_]{2,20}$'),
  label text not null,
  family text not null check (family in ('decision','technical_decision','stoppage','disqualification','draw','no_contest','no_decision','newspaper_decision',
    'exhibition','walkover','unclassified')),
  counts_in_professional_record boolean not null,
  description text not null
);
select public.boxing_install_append_only('public.boxing_result_classes');
insert into public.boxing_result_classes values
  ('UD', 'Unanimous decision', 'decision', true, 'All scoring officials scored for the winner.'),
  ('SD', 'Split decision', 'decision', true, 'Two scoring officials for the winner, one for the loser.'),
  ('MD', 'Majority decision', 'decision', true, 'Two scoring officials for the winner, one even.'),
  ('REF_DEC', 'Referee decision', 'decision', true, 'The referee was the sole scorer.'),
  ('DEC', 'Decision (type not stated)', 'decision', true, 'The source states a decision without its type; never promoted to UD/SD/MD.'),
  ('TD', 'Technical decision', 'technical_decision', true, 'Bout stopped (typically an accidental foul) and decided on the cards.'),
  ('KO', 'Knockout', 'stoppage', true, 'Knockout as stated by the source.'),
  ('TKO', 'Technical knockout', 'stoppage', true, 'Technical knockout as stated by the source.'),
  ('RTD', 'Corner retirement', 'stoppage', true, 'Retired on the stool / corner stoppage.'),
  ('DQ', 'Disqualification', 'disqualification', true, 'Disqualification as stated by the source.'),
  ('DRAW', 'Unanimous draw', 'draw', true, 'All scoring officials even, or a draw stated as unanimous.'),
  ('MAJORITY_DRAW', 'Majority draw', 'draw', true, 'Draw stated as majority.'),
  ('SPLIT_DRAW', 'Split draw', 'draw', true, 'Draw stated as split.'),
  ('TECHNICAL_DRAW', 'Technical draw', 'draw', true, 'Bout stopped and scored a draw on the cards.'),
  ('DRAW_UNSPECIFIED', 'Draw (type not stated)', 'draw', true, 'The source states a draw without its type.'),
  ('NC', 'No contest', 'no_contest', true, 'No contest, including results overturned to no contest.'),
  ('ND', 'No decision', 'no_decision', true, 'No decision rendered (historical no-decision bouts).'),
  ('NWS', 'Newspaper decision', 'newspaper_decision', false, 'Unofficial decision reported by newspapers; kept apart from official results.'),
  ('EXHIBITION', 'Exhibition', 'exhibition', false, 'Exhibition bout; never part of a professional record.'),
  ('WALKOVER', 'Walkover', 'walkover', false, 'Source states a walkover; kept apart from contested results.'),
  ('UNCLASSIFIED', 'Unclassified', 'unclassified', false, 'The stored result cannot be classified without reinterpretation.')
on conflict (code) do nothing;

create or replace function public.boxing_classify_result(p_outcome text, p_method text, p_decision_type text, p_result_state text, p_method_raw text,
  p_competition_class text default 'professional', p_round int default null, p_time_sec int default null)
returns jsonb language sql stable set search_path = '' as $$
  with base as (select case
      when p_outcome is null then null
      when p_decision_type = 'newspaper' then 'NWS'
      when p_method = 'NO_CONTEST' or p_outcome = 'no_contest' then 'NC'
      when p_method = 'NO_DECISION' or p_outcome = 'no_decision' then 'ND'
      when p_outcome = 'unknown' then 'UNCLASSIFIED'
      when p_method in ('KO','TKO','RTD','DQ') and p_outcome = 'win' then p_method
      when p_method = 'DECISION' and p_outcome = 'win' then case p_decision_type when 'unanimous' then 'UD' when 'split' then 'SD' when 'majority' then 'MD'
                                                                  when 'referee' then 'REF_DEC' else 'DEC' end
      when p_method = 'DECISION' and p_outcome = 'draw' then case p_decision_type when 'unanimous' then 'DRAW' when 'majority' then 'MAJORITY_DRAW' when 'split' then 'SPLIT_DRAW'
                                                                   else 'DRAW_UNSPECIFIED' end
      when p_method = 'TECHNICAL_DECISION' and p_outcome = 'win' then 'TD'
      when p_method = 'TECHNICAL_DECISION' and p_outcome = 'draw' then 'TECHNICAL_DRAW'
      when p_method = 'OTHER' and p_outcome = 'win' and coalesce(p_method_raw, '') ~* '\mwalk[- ]?over\M' then 'WALKOVER'
      else 'UNCLASSIFIED' end code),
  flags as (select array_remove(array[
      case when (select code from base) in ('KO','TKO','RTD','DQ','TD','TECHNICAL_DRAW') and p_round is null then 'stoppage_round_not_stated' end,
      case when (select code from base) in ('KO','TKO') and p_time_sec is null then 'stoppage_time_not_stated' end,
      case when (select code from base) in ('DEC','DRAW_UNSPECIFIED') then 'decision_type_not_stated' end,
      case when coalesce(p_method_raw, '') ~* '(\mof|\mround|\mrd\.?|[-:])\s*$' then 'source_text_incomplete' end,
      case when p_result_state = 'overturned' then 'overturned' end,
      case when p_result_state = 'provisional' then 'provisional' end,
      case when p_result_state = 'amended' then 'amended' end,
      case when (select code from base) = 'UNCLASSIFIED' then 'not_interpreted' end,
      case when p_competition_class = 'amateur' then 'amateur_record' end], null) f)
  select case when (select code from base) is null then null else jsonb_build_object(
    'rule', 'pbe_result_ontology@1',
    'code', case when p_competition_class = 'exhibition' then 'EXHIBITION' else (select code from base) end,
    'underlying_code', case when p_competition_class = 'exhibition' then (select code from base) end,
    'family', (select family from public.boxing_result_classes where code = case when p_competition_class = 'exhibition' then 'EXHIBITION' else (select code from base) end),
    'counts_in_professional_record', coalesce(p_competition_class, 'professional') = 'professional'
        and (select counts_in_professional_record from public.boxing_result_classes where code = (select code from base)),
    'flags', to_jsonb((select f from flags)),
    'stored', jsonb_build_object('outcome', p_outcome, 'method', p_method, 'decision_type', p_decision_type, 'result_state', p_result_state),
    'source_text', p_method_raw) end
$$;

-- judges' current cards against the stated decision (UD 3-0, MD 2-0-1, SD 2-1; draws 0-0-3, majority 2 even, split 1-1-1)
create or replace function public.boxing_archive_decision_check(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  with r as (select * from public.boxing_bout_results_current where bout_id = p_bout limit 1),
  cls as (select public.boxing_classify_result(r.outcome, r.method, r.decision_type, r.result_state, r.method_raw) c from r),
  cards as (select s.*, case when s.fighter_a_total > s.fighter_b_total then s.fighter_a_id when s.fighter_b_total > s.fighter_a_total then s.fighter_b_id end card_for
            from public.boxing_scorecards_current s where s.bout_id = p_bout and s.scorer_role = 'judge' and s.fighter_a_total is not null and s.fighter_b_total is not null),
  tally as (select count(*) n, count(*) filter (where card_for is null) even,
              count(*) filter (where card_for = (select winner_id from r)) for_winner,
              count(*) filter (where card_for is not null and card_for is distinct from (select winner_id from r)) against_winner from cards)
  select case
    when not exists (select 1 from r) then jsonb_build_object('status', 'no_result')
    when (select c ->> 'code' from cls) not in ('UD','SD','MD','DRAW','MAJORITY_DRAW','SPLIT_DRAW','DEC','DRAW_UNSPECIFIED') then jsonb_build_object('status', 'not_a_decision')
    when (select n from tally) = 0 then jsonb_build_object('status', 'no_cards')
    when (select n from tally) <> 3 then jsonb_build_object('status', 'not_three_cards', 'cards', (select n from tally))
    else (select jsonb_build_object('rule', 'pbe_decision_check@1', 'cards', t.n, 'for_winner', t.for_winner, 'against_winner', t.against_winner, 'even', t.even,
        'cards_imply', x.implied, 'stated', (select c ->> 'code' from cls),
        'status', case when (select c ->> 'code' from cls) in ('DEC','DRAW_UNSPECIFIED') then 'type_not_stated_cards_imply_' || lower(x.implied)
                       when x.implied = (select c ->> 'code' from cls) then 'consistent' else 'contradicts' end)
      from tally t cross join lateral (select case
          when (select outcome from r) = 'win' and t.for_winner = 3 then 'UD'
          when (select outcome from r) = 'win' and t.for_winner = 2 and t.even = 1 then 'MD'
          when (select outcome from r) = 'win' and t.for_winner = 2 and t.against_winner = 1 then 'SD'
          when (select outcome from r) = 'draw' and t.even = 3 then 'DRAW'
          when (select outcome from r) = 'draw' and t.even = 1 and t.n - t.even = 2 and (select count(distinct card_for) from cards where card_for is not null) = 2 then 'SPLIT_DRAW'
          when (select outcome from r) = 'draw' and t.even = 2 then 'MAJORITY_DRAW'
          else 'INCONSISTENT' end implied) x) end
$$;

-- 5 -------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_archive_name_key(p_name text)
returns text language sql immutable set search_path = '' as $$
  select nullif(btrim(regexp_replace(lower(translate(coalesce(p_name, ''), 'ÁÀÂÄÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇáàâäãéèêëíìîïóòôöõúùûüñç', 'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc')),
    '[^a-z0-9]+', ' ', 'g')), '')
$$;

create or replace function public.boxing_archive_division_key(p_text text)
returns text language sql stable set search_path = '' as $$
  select w.class_key from public.boxing_weight_classes w
  cross join lateral unnest(array[w.name] || coalesce(w.alternate_names, '{}')) n(label)
  where lower(coalesce(p_text, '')) ~ ('\m' || replace(lower(n.label), ' ', '[ -]?') || '\M')
  order by length(n.label) desc limit 1
$$;

create or replace function public.boxing_classify_title_remark(p_text text)
returns jsonb language sql stable set search_path = '' as $$
  with t as (select btrim(regexp_replace(coalesce(p_text, ''), '^\s*\*+\s*', '')) txt),
  body_part as (select btrim(regexp_replace((select txt from t), '^.*?\m(retains?|retained|wins?|won|captures?|unifies|defends?|for)\M\s*', '', 'i')) s),
  parts as (select btrim(p) part, ord from regexp_split_to_table((select s from body_part), '\s*(&|\mand\M|,)\s*') with ordinality x(p, ord) where btrim(p) <> ''),
  belts as (select ord, part,
      (select string_agg(upper(m[1]), ',') from regexp_matches(part, '\m(WBC|WBA|IBF|WBO|NABF|NABO|NABA|USBA|USBO|IBO|WBF|WBU|EBU|OPBF|ABCO|WBC-USNBC|USNBC|FECARBOX|FECOMBOX|WBC LATINO)\M', 'gi') m) bodies,
      case when part ~* '\minterim\M' then 'interim'
           when part ~* '\m(continental|latin america|north america|asia|asian|europe|european|africa|african|oceania|pan african|intercontinental|fedelatin|fedecentro)\M' then 'continental'
           when part ~* '\m(NABF|NABO|NABA|USBA|USBO|USNBC)\M' then 'regional'
           when part ~* '\m(national|state|U\.?S\.?|american|british|commonwealth)\M' then 'national_or_regional'
           when part ~* '\myouth\M' then 'youth'
           when part ~* '\msilver\M' then 'silver'
           when part ~* '\mgold\M' then 'gold'
           when part ~* '\minternational\M|\mint\.' then 'international'
           when part ~* '\m(WBC|IBF|WBO)\M' and part !~* '\m(NABF|NABO|NABA|USBA|USBO|IBO|WBF|WBU|EBU|OPBF)\M' then 'world'
           when part ~* '\mWBA\M' and part ~* '\m(super|world|regular)\M' then 'world'
           when part ~* '\mWBA\M' then 'wba_lineage_not_stated'
           else 'unrecognized' end scope,
      array_remove(array[case when part ~* '\mgold\M' then 'gold' end, case when part ~* '\msilver\M' then 'silver' end,
                         case when part ~* '\minterim\M' then 'interim' end, case when part ~* '\myouth\M' then 'youth' end,
                         case when part ~* '\mwomen' then 'women' end, case when part ~* '\mvacant\M' then 'vacant' end], null) qualifiers
    from parts)
  select case when nullif((select txt from t), '') is null then null else jsonb_build_object(
    'rule', 'pbe_title_remark_ontology@1',
    'as_printed', (select txt from t),
    'action', case when (select txt from t) ~* '\munif' then 'unification'
                   when (select txt from t) ~* '\m(retains?|retained|defends?)\M' then 'retained'
                   when (select txt from t) ~* '\mvacant\M' and (select txt from t) ~* '\m(wins?|won|captures?)\M' then 'won_vacant'
                   when (select txt from t) ~* '\m(wins?|won|captures?)\M' then 'won'
                   when (select txt from t) ~* '\mfor\M' then 'contested'
                   else 'not_stated' end,
    'division', public.boxing_archive_division_key((select txt from t)),
    'division_printed_once_for_several_belts', (select count(*) from belts) > 1,
    'belts', (select coalesce(jsonb_agg(jsonb_build_object('as_printed', part, 'bodies_named', coalesce(to_jsonb(string_to_array(bodies, ',')), '[]'::jsonb), 'scope', scope,
        'qualifiers', to_jsonb(qualifiers)) order by ord), '[]'::jsonb) from belts where bodies is not null or scope <> 'unrecognized'),
    'unrecognized_parts', (select coalesce(jsonb_agg(part order by ord), '[]'::jsonb) from belts where bodies is null and scope = 'unrecognized'),
    'note', 'Classification of the printed words only. It creates no title, title event or lineage; a body named inside a regional title is not asserted as its sanctioning parent.') end
$$;

-- 6 -------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_archive_title_runs(p_org text, p_class text, p_gender text default 'male', p_from date default null, p_to date default null)
returns jsonb language sql stable set search_path = '' as $$
  with docs as (
    select distinct on (s.document_kind, coalesce(s.as_of, s.published_on)) s.id, s.document_kind, coalesce(s.as_of, s.published_on) at, s.source_url
    from public.boxing_title_status_snapshots s
    join public.boxing_organizations o on o.id = s.organization_id
    join public.boxing_weight_classes w on w.id = s.weight_class_id
    where o.slug = p_org and w.class_key = p_class and s.gender_scope = p_gender
      and (p_from is null or coalesce(s.as_of, s.published_on) >= p_from) and (p_to is null or coalesce(s.as_of, s.published_on) <= p_to)
    order by s.document_kind, coalesce(s.as_of, s.published_on), s.captured_at desc),
  st as (
    select d.at, d.document_kind, d.source_url, e.tier, e.designation_native, e.holder_status, e.holder_source_name, e.reign_start_on, e.reign_start_basis,
      e.last_defense_on, e.fighter_id,
      case when e.holder_status = 'vacant' then 'vacant' when e.holder_status = 'in_recess' then 'in_recess:' || coalesce(public.boxing_archive_name_key(e.holder_source_name), '')
           else coalesce(public.boxing_archive_name_key(e.holder_source_name), 'not_printed') end holder_key
    from docs d join public.boxing_title_status_entries e on e.snapshot_id = d.id
    where e.tier is not null),
  isl as (select st.*, row_number() over (partition by tier order by at, document_kind) - row_number() over (partition by tier, holder_key order by at, document_kind) grp from st),
  runs as (
    select tier, holder_key, grp, min(at) first_at, max(at) last_at, count(*) statements,
      (array_agg(holder_source_name order by at))[1] holder_as_printed,
      (array_agg(designation_native order by at desc))[1] designation_as_printed,
      (array_agg(holder_status order by at desc))[1] holder_status,
      (array_agg(source_url order by at))[1] first_url, (array_agg(source_url order by at desc))[1] last_url,
      (array_agg(reign_start_on order by at desc) filter (where reign_start_on is not null))[1] reign_start_on,
      (array_agg(reign_start_basis order by at desc) filter (where reign_start_basis is not null))[1] reign_start_basis,
      max(last_defense_on) last_defense_on, bool_or(fighter_id is not null) resolved,
      (select public_id from public.boxing_fighters where id = (array_agg(fighter_id order by at desc) filter (where fighter_id is not null))[1]) fighter,
      array_agg(distinct document_kind) kinds
    from isl group by tier, holder_key, grp)
  select jsonb_build_object('rule', 'pbe_title_runs@1', 'organization', p_org, 'weight_class', p_class, 'gender', p_gender,
    'documents', (select count(*) from docs), 'first_document_on', (select min(at) from docs), 'last_document_on', (select max(at) from docs),
    'basis', 'The body''s own documents, holder exactly as printed; consecutive identical statements for a tier form one run. A run is not a reign: reigns are derived from confirmed title events only.',
    'runs', coalesce((select jsonb_agg(jsonb_build_object('run_key', 'run_' || left(md5(concat_ws('|', p_org, p_class, p_gender, tier, holder_key, first_at)), 16),
        'tier', tier, 'designation_as_printed', designation_as_printed, 'holder_as_printed', holder_as_printed, 'holder_status', holder_status,
        'first_statement_on', first_at, 'last_statement_on', last_at, 'statements', statements, 'document_kinds', to_jsonb(kinds),
        'reign_start_as_printed', reign_start_on, 'reign_start_basis', reign_start_basis, 'last_defense_as_printed', last_defense_on,
        'identity', case when resolved then 'resolved' when holder_key = 'vacant' or holder_key = 'not_printed' then 'not_applicable' else 'unresolved_name_as_printed' end,
        'global_fighter_id', fighter, 'first_source_url', first_url, 'last_source_url', last_url) order by tier, first_at) from runs), '[]'::jsonb))
$$;

-- 7 -------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_archive_src(p_source uuid, p_url text, p_observation uuid default null)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('source_key', s.source_key, 'source_kind', s.source_kind, 'url', p_url, 'observation', left(p_observation::text, 8),
    'parser_version', (select o.parser_version from public.boxing_source_observations o where o.id = p_observation))
  from (select 1) one left join public.boxing_sources s on s.id = p_source
$$;

create or replace function public.boxing_archive_mmss(p_sec int)
returns text language sql immutable set search_path = '' as $$
  select case when p_sec is null then null else (p_sec / 60)::text || ':' || lpad((p_sec % 60)::text, 2, '0') end
$$;

create or replace function public.boxing_archive_bout_weights(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  with b as (select b.*, e.event_date from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id where b.id = p_bout),
  remark_class as (
    select public.boxing_archive_division_key(rem) k
    from public.boxing_bout_results_current r join public.boxing_source_observations o on o.id = r.observation_id
    cross join lateral jsonb_array_elements_text(coalesce(o.payload -> 'bout' -> 'title_remarks', '[]'::jsonb)) rem
    where r.bout_id = p_bout and public.boxing_archive_division_key(rem) is not null limit 1),
  cls as (
    select coalesce(
      (select jsonb_build_object('id', b.weight_class_id, 'basis', 'bout_record') from b where b.weight_class_id is not null),
      (select jsonb_build_object('id', t.weight_class_id, 'basis', 'title_at_stake') from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id
         where bt.bout_id = p_bout and t.weight_class_id is not null limit 1),
      (select jsonb_build_object('id', w.id, 'basis', 'title_remark_as_printed') from remark_class rc join public.boxing_weight_classes w on w.class_key = rc.k)) j),
  lim as (select public.boxing_weight_class_as_of((select (j ->> 'id')::uuid from cls), (select event_date from b)) j),
  wi as (select distinct on (w.fighter_id) w.* from public.boxing_weigh_ins w
         where w.bout_id = p_bout and w.weigh_in_kind = 'official' and not exists (select 1 from public.boxing_weigh_ins n where n.supersedes_id = w.id)
         order by w.fighter_id, w.attempt_no desc)
  select jsonb_build_object('rule', 'pbe_bout_weights@1',
    'weight_class', (select l.j ->> 'weight_class' from lim l), 'weight_class_basis', (select j ->> 'basis' from cls),
    'class_limit', (select j from lim), 'contracted_weight_lb', b.contracted_weight_lb, 'is_catchweight', b.is_catchweight,
    'corners', (select coalesce(jsonb_agg(jsonb_build_object('side', p.side, 'global_fighter_id', f.public_id, 'official_weight_lb', wi.official_weight_lb,
        'weigh_in_status', wi.status, 'over_class_limit_lb', case when wi.official_weight_lb > ((select j from lim) ->> 'limit_lb')::numeric
                                                                  then wi.official_weight_lb - ((select j from lim) ->> 'limit_lb')::numeric end,
        'source', case when wi.id is not null then public.boxing_archive_src(wi.source_id, wi.source_url, wi.observation_id) end) order by p.side), '[]'::jsonb)
      from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id left join wi on wi.fighter_id = p.fighter_id
      where p.bout_id = p_bout and p.participant_status in ('scheduled','confirmed')),
    'observations', to_jsonb(array_remove(array[
      case when (select j from cls) is null then 'weight_class_not_stated_by_source' end,
      case when exists (select 1 from wi where wi.official_weight_lb > ((select j from lim) ->> 'limit_lb')::numeric) and b.contracted_weight_lb is null
           then 'official_weight_above_class_limit_without_stated_contract' end,
      case when (select j ->> 'verified_for_date' from lim) = 'false' then 'class_limit_is_present_day_reference' end], null)))
  from b
$$;

create or replace function public.boxing_archive_bout(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  with b as (select b.*, e.event_date from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id where b.id = p_bout),
  r as (select * from public.boxing_bout_results_current where bout_id = p_bout limit 1),
  robs as (select o.* from public.boxing_source_observations o where o.id = (select observation_id from r))
  select jsonb_build_object(
    'global_bout_id', b.public_id, 'listed_order', b.bout_order, 'card_segment', b.card_segment, 'status', b.status, 'competition_class', b.competition_class,
    'scheduled_rounds', b.scheduled_rounds, 'round_minutes', b.round_minutes,
    'source_bout_ids', (select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'id', i.external_id, 'verification_state', i.verification_state) order by i.namespace), '[]'::jsonb)
      from public.boxing_bout_identities i where i.bout_id = p_bout),
    'corners', (select coalesce(jsonb_agg(jsonb_build_object('side', p.side, 'global_fighter_id', f.public_id, 'display_name', f.display_name,
        'name_as_printed', coalesce(
            (select d.observed_name from public.boxing_identity_appearance_decisions d
             where d.bout_external_id in (select external_id from public.boxing_bout_identities where bout_id = p_bout) and d.side = p.side order by d.seq desc limit 1),
            (select o.payload -> 'bout' -> ('fighter_' || p.side) ->> 'source_name' from public.boxing_source_observations o where o.id = (select observation_id from r))),
        'hometown_as_printed', f.hometown,
        'record_entering', case when coalesce(p.record_wins, p.record_losses, p.record_draws) is null then null
                                else jsonb_build_object('wins', p.record_wins, 'losses', p.record_losses, 'draws', p.record_draws, 'no_contests', p.record_no_contests) end,
        'source', public.boxing_archive_src(p.source_id, p.source_url)) order by p.side), '[]'::jsonb)
      from public.boxing_bout_participants p join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(p.fighter_id)
      where p.bout_id = p_bout and p.participant_status in ('scheduled','confirmed')),
    'replaced_corners', (select count(*) from public.boxing_bout_participants p where p.bout_id = p_bout and p.participant_status in ('replaced','withdrawn')),
    'weights', public.boxing_archive_bout_weights(p_bout),
    'result', (select jsonb_build_object('classification', public.boxing_classify_result(r.outcome, r.method, r.decision_type, r.result_state, r.method_raw, b.competition_class, r.round, r.time_sec),
        'winner_global_fighter_id', (select public_id from public.boxing_fighters where id = public.boxing_canonical_fighter_id(r.winner_id)),
        'winner_side', (select p.side from public.boxing_bout_participants p where p.bout_id = p_bout and p.fighter_id = r.winner_id limit 1),
        'round', r.round, 'time', public.boxing_archive_mmss(r.time_sec), 'time_sec', r.time_sec, 'result_state', r.result_state, 'revision', r.revision,
        'revisions', (select count(*) from public.boxing_bout_results x where x.bout_id = p_bout),
        'previous_classification', (select public.boxing_classify_result(x.outcome, x.method, x.decision_type, x.result_state, x.method_raw, b.competition_class, x.round, x.time_sec)
                                    from public.boxing_bout_results x where x.id = r.supersedes_id),
        'source', public.boxing_archive_src(r.source_id, r.source_url, r.observation_id)) from r),
    'decision_check', public.boxing_archive_decision_check(p_bout),
    'scorecards', (select coalesce(jsonb_agg(jsonb_build_object('slot', s.slot, 'global_official_id', o.public_id, 'judge', o.display_name, 'card_state', s.card_state,
        'fighter_a_total', s.fighter_a_total, 'fighter_b_total', s.fighter_b_total, 'score_basis', s.score_basis, 'revision', s.revision,
        'rounds_published', exists (select 1 from public.boxing_scorecard_rounds sr where sr.scorecard_id = s.id),
        'source', public.boxing_archive_src(s.source_id, s.source_url, s.observation_id)) order by s.slot nulls last), '[]'::jsonb)
      from public.boxing_scorecards_current s left join public.boxing_officials o on o.id = public.boxing_canonical_official_id(s.judge_id) where s.bout_id = p_bout),
    'officials', (select coalesce(jsonb_agg(jsonb_build_object('role', bo.role, 'slot', bo.slot, 'global_official_id', o.public_id, 'name', o.display_name,
        'assignment_state', bo.assignment_state, 'source', public.boxing_archive_src(bo.source_id, bo.source_url, bo.observation_id)) order by bo.role desc, bo.slot nulls first), '[]'::jsonb)
      from public.boxing_bout_officials bo left join public.boxing_officials o on o.id = public.boxing_canonical_official_id(bo.official_id)
      where bo.bout_id = p_bout and bo.assignment_state in ('assigned','worked')),
    'point_deductions', (select coalesce(jsonb_agg(jsonb_build_object('global_fighter_id', f.public_id, 'round', d.round, 'points', d.points, 'reason', d.reason_public,
        'source', public.boxing_archive_src(d.source_id, d.source_url, d.observation_id)) order by d.round), '[]'::jsonb)
      from public.boxing_point_deductions d left join public.boxing_fighters f on f.id = d.fighter_id where d.bout_id = p_bout),
    'knockdowns', jsonb_build_object(
      'recorded', (select coalesce(jsonb_agg(jsonb_build_object('global_fighter_id', f.public_id, 'round', k.round, 'time', public.boxing_archive_mmss(k.time_sec),
          'source', public.boxing_archive_src(k.source_id, k.source_url, k.observation_id)) order by k.round, k.time_sec), '[]'::jsonb)
        from public.boxing_bout_knockdowns k left join public.boxing_fighters f on f.id = k.fighter_down_id where k.bout_id = p_bout),
      'coverage', (select coalesce(jsonb_agg(jsonb_build_object('source_key', s.source_key, 'complete', c.complete)), '[]'::jsonb)
        from public.boxing_bout_stat_coverage c join public.boxing_sources s on s.id = c.source_id where c.bout_id = p_bout and c.stat_kind = 'knockdowns'),
      'lane', case when exists (select 1 from public.boxing_bout_stat_coverage c where c.bout_id = p_bout and c.stat_kind = 'knockdowns') then 'covered'
                   when exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = b.source_id and c.lane = 'knockdowns' and c.availability in ('not_provided','not_permitted'))
                     then 'source_does_not_publish' else 'not_recorded' end),
    'titles', jsonb_build_object(
      'linked', (select coalesce(jsonb_agg(jsonb_build_object('organization', o.slug, 'tier', t.tier, 'weight_class', w.class_key, 'global_title_id', t.public_id, 'title_key', t.title_key,
          'status', bt.status, 'at_stake', bt.at_stake, 'source', public.boxing_archive_src(bt.source_id, bt.source_url)) order by o.slug, t.tier), '[]'::jsonb)
        from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join public.boxing_organizations o on o.id = t.organization_id
        left join public.boxing_weight_classes w on w.id = t.weight_class_id where bt.bout_id = p_bout),
      'remarks_as_printed', (select coalesce(jsonb_agg(public.boxing_classify_title_remark(rem)), '[]'::jsonb)
        from robs cross join lateral jsonb_array_elements_text(coalesce(robs.payload -> 'bout' -> 'title_remarks', '[]'::jsonb)) rem)),
    'source_document', (select jsonb_build_object('document_key', robs.payload ->> 'document_key', 'source_revision', robs.payload ->> 'source_revision') from robs),
    'source', public.boxing_archive_src(b.source_id, b.source_url))
  from b
$$;

create or replace function public.boxing_archive_card(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select e.* from public.boxing_events e where public.boxing_site_ref_matches(e.public_id, p_ref)),
  e as (select * from hit where (select count(*) from hit) = 1),
  bx as (select b.id, b.bout_order, b.public_id, b.competition_class, public.boxing_archive_bout(b.id) j from public.boxing_bouts b join e on e.id = b.event_id),
  res as (select bx.id, (bx.j -> 'result' -> 'classification' ->> 'family') family, (bx.j -> 'result' -> 'classification' ->> 'code') code,
            (bx.j -> 'result' ->> 'round')::int round, (bx.j -> 'result' ->> 'time_sec')::int time_sec, b.scheduled_rounds, coalesce(b.round_minutes, 3) round_minutes
          from bx join public.boxing_bouts b on b.id = bx.id where bx.j -> 'result' is not null),
  cards as (select s.bout_id, abs(s.fighter_a_total - s.fighter_b_total) margin, (s.fighter_a_total - s.fighter_b_total) signed
            from public.boxing_scorecards_current s join bx on bx.id = s.bout_id where s.scorer_role = 'judge' and s.fighter_a_total is not null and s.fighter_b_total is not null)
  select case when not exists (select 1 from e) then null else jsonb_build_object(
    'rule', 'pbe_archive_card@1',
    'event', (select jsonb_build_object('global_event_id', e.public_id, 'name', e.name, 'event_date', e.event_date, 'start_at', e.start_at, 'status', e.status,
        'source_event_ids', (select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'id', i.external_id, 'verification_state', i.verification_state)), '[]'::jsonb)
          from public.boxing_event_identities i where i.event_id = e.id),
        'venue', (select jsonb_build_object('global_venue_id', v.public_id, 'name', v.name, 'city', v.city, 'region', v.region, 'country_code', v.country_code,
            'aliases', (select coalesce(jsonb_agg(jsonb_build_object('alias', a.alias, 'kind', a.kind, 'valid_from', a.valid_from, 'valid_to', a.valid_to)), '[]'::jsonb)
              from public.boxing_venue_aliases a where a.venue_id = v.id),
            'jurisdiction', public.boxing_jurisdiction_json(v.country_code, v.region), 'source', public.boxing_archive_src(v.source_id, v.source_url))
          from public.boxing_venues v where v.id = e.venue_id),
        'commission', (select jsonb_build_object('global_commission_id', c.public_id, 'slug', c.slug, 'name', c.name,
            'jurisdiction', public.boxing_jurisdiction_json(c.country_code, c.region_code, c.jurisdiction)) from public.boxing_commissions c where c.id = e.commission_id),
        'organizations', (select coalesce(jsonb_agg(jsonb_build_object('role', eo.role, 'organization', o.slug, 'name', o.name, 'source', public.boxing_archive_src(eo.source_id, eo.source_url))), '[]'::jsonb)
          from public.boxing_event_organizations eo join public.boxing_organizations o on o.id = eo.organization_id where eo.event_id = e.id),
        'promoters_as_printed', (select coalesce(jsonb_agg(distinct p), '[]'::jsonb) from public.boxing_site_sheet_events() se
            join public.boxing_event_identities ei on ei.source_id = se.source_id and ei.external_id = se.source_event_id and ei.event_id = e.id
            cross join lateral jsonb_array_elements(se.promoters) p),
        'broadcast', jsonb_build_object('notes', e.broadcast_notes, 'lane', case when e.broadcast_notes is null then 'no_approved_source_states_it' else 'stored' end),
        'source', public.boxing_archive_src(e.source_id, e.source_url)) from e),
    'bouts', (select coalesce(jsonb_agg(bx.j order by bx.bout_order nulls last, bx.public_id), '[]'::jsonb) from bx),
    'derived', jsonb_build_object('rule', 'pbe_card_stats@1', 'label', 'PropBetEdge-derived from the stored official record above',
      'bouts', (select count(*) from bx), 'with_result', (select count(*) from res),
      'by_result_code', (select coalesce(jsonb_object_agg(code, n), '{}'::jsonb) from (select code, count(*) n from res group by 1) x),
      'stoppages', (select count(*) from res where family in ('stoppage','disqualification')),
      'stoppage_rate', (select round(count(*) filter (where family = 'stoppage')::numeric / nullif(count(*) filter (where family in ('stoppage','decision','draw','technical_decision')), 0), 3) from res),
      'rounds_scheduled', (select sum(b.scheduled_rounds) from bx join public.boxing_bouts b on b.id = bx.id),
      'rounds_fought', (select round(sum(case when family in ('decision','draw') then scheduled_rounds
                                              when round is not null and time_sec is not null then (round - 1) + time_sec::numeric / (round_minutes * 60) end), 2) from res),
      'rounds_fought_basis', 'decisions and draws count every scheduled round; stoppages count completed rounds plus the elapsed share of the last; stoppages without a stated round and time are left out',
      'stoppages_without_round_or_time', (select count(*) from res where family = 'stoppage' and (round is null or time_sec is null)),
      'judges_cards', (select count(*) from cards),
      'mean_card_margin', (select round(avg(margin), 2) from cards),
      'panels_with_disagreement', (select count(*) from (select bout_id from cards group by bout_id having count(distinct sign(signed)) > 1) x),
      'mean_panel_spread', (select round(avg(spread), 2) from (select bout_id, max(signed) - min(signed) spread from cards group by bout_id having count(*) = 3) x),
      'bouts_with_linked_titles', (select count(*) from bx where jsonb_array_length(bx.j -> 'titles' -> 'linked') > 0),
      'bouts_with_title_remarks', (select count(*) from bx where jsonb_array_length(bx.j -> 'titles' -> 'remarks_as_printed') > 0)),
    'coverage', jsonb_build_object(
      'lanes', (select coalesce(jsonb_object_agg(c.lane, c.availability), '{}'::jsonb) from public.boxing_source_capabilities_current c join e on c.source_id = e.source_id),
      'note', 'Lanes marked not_provided are absent from the source, not zero.')
  ) end
$$;

create or replace function public.boxing_fighter_passport(p_ref text, p_as_of date default null)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select f.id from public.boxing_fighters f where public.boxing_site_ref_matches(f.public_id, p_ref)),
  f as (select cf.* from public.boxing_fighters cf where cf.id = (select public.boxing_canonical_fighter_id(id) from hit where (select count(*) from hit) = 1)),
  ids as (select x.id from public.boxing_fighters x where public.boxing_canonical_fighter_id(x.id) = (select id from f)),
  apps as (
    select p.bout_id, p.side, p.fighter_id, p.record_wins, p.record_losses, p.record_draws, b.public_id bout_public, b.competition_class, b.scheduled_rounds, b.weight_class_id,
      b.status bout_status, b.source_id bout_source, b.source_url bout_url, e.event_date, e.public_id event_public, e.name event_name, e.venue_id, e.commission_id
    from public.boxing_bout_participants p join public.boxing_bouts b on b.id = p.bout_id join public.boxing_events e on e.id = b.event_id
    where p.fighter_id in (select id from ids) and p.participant_status in ('scheduled','confirmed') and b.status is distinct from 'cancelled'
      and (p_as_of is null or e.event_date < p_as_of)),
  -- as-of: revision 1 is known at fight time; a later revision only once captured
  res as (
    select distinct on (r.bout_id) r.* from public.boxing_bout_results r join apps a on a.bout_id = r.bout_id
    where p_as_of is null or r.revision = 1 or r.captured_at < p_as_of::timestamptz
    order by r.bout_id, r.revision desc),
  rowz as (
    select a.*, r.id result_id, r.outcome, r.method, r.round, r.time_sec, r.result_state,
      public.boxing_classify_result(r.outcome, r.method, r.decision_type, r.result_state, r.method_raw, a.competition_class, r.round, r.time_sec) cls,
      case when r.id is null then null when r.outcome = 'win' and public.boxing_canonical_fighter_id(r.winner_id) = (select id from f) then 'W'
           when r.outcome = 'win' then 'L' when r.outcome = 'draw' then 'D' when r.outcome = 'no_contest' then 'NC' when r.outcome = 'no_decision' then 'ND' else 'unknown' end wl,
      (select public.boxing_canonical_fighter_id(o.fighter_id) from public.boxing_bout_participants o
       where o.bout_id = a.bout_id and o.side <> a.side and o.participant_status in ('scheduled','confirmed') limit 1) opp,
      coalesce(a.weight_class_id, (select t.weight_class_id from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id where bt.bout_id = a.bout_id limit 1)) class_id
    from apps a left join res r on r.bout_id = a.bout_id),
  pro as (select * from rowz where competition_class = 'professional' and result_id is not null)
  select case when not exists (select 1 from f) then null else jsonb_build_object(
    'rule', 'pbe_fighter_passport@1',
    'as_of', p_as_of,
    'temporal_rule', 'Bouts before the as-of date only; a result revision after the first counts only once captured before the as-of date.',
    'global_fighter_id', (select public_id from f), 'display_name', (select display_name from f), 'identity_state', (select identity_state from f),
    'merged_records', (select count(*) - 1 from ids),
    'names', (select coalesce(jsonb_agg(n order by n ->> 'kind', n ->> 'name'), '[]'::jsonb) from (
        select distinct jsonb_build_object('name', a.alias, 'kind', 'alias:' || a.kind, 'verification_state', a.verification_state, 'source_key', s.source_key) n
          from public.boxing_fighter_aliases a left join public.boxing_sources s on s.id = a.source_id where a.fighter_id in (select id from ids)
        union
        select distinct jsonb_build_object('name', i.source_display_name, 'kind', 'source_label:' || i.namespace, 'verification_state', i.verification_state, 'source_key', s.source_key)
          from public.boxing_fighter_identities i left join public.boxing_sources s on s.id = i.source_id
          where i.fighter_id in (select id from ids) and i.source_display_name is not null and i.verification_state <> 'rejected'
        union
        select distinct jsonb_build_object('name', d.observed_name, 'kind', 'as_printed:' || d.namespace, 'verification_state', d.decision, 'source_key', null)
          from public.boxing_identity_appearance_decisions d where d.fighter_id in (select id from ids) and d.decision in ('matched','created')) x),
    'nickname', jsonb_build_object('value', (select nickname from f), 'basis', case when (select nickname from f) is null then 'no approved source states one' else 'stored' end),
    'source_ids', (select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'id', i.external_id, 'verification_state', i.verification_state, 'confidence', i.confidence,
        'rule', i.evidence ->> 'rule', 'source_key', s.source_key) order by i.namespace), '[]'::jsonb)
      from public.boxing_fighter_identities i left join public.boxing_sources s on s.id = i.source_id where i.fighter_id in (select id from ids) and i.verification_state <> 'rejected'),
    'attributes', (select jsonb_build_object(
        'date_of_birth', jsonb_build_object('value', null, 'policy', 'not stored (owner rule)'),
        'nationality', f.nationality, 'birth_country', f.birth_country, 'hometown_as_printed', f.hometown, 'stance', f.stance, 'height_cm', f.height_cm, 'reach_cm', f.reach_cm, 'sex', f.sex,
        'claims', (select coalesce(jsonb_agg(jsonb_build_object('attribute', c.attribute, 'value', c.value, 'source_key', s.source_key) order by c.attribute), '[]'::jsonb)
          from public.boxing_fighter_attribute_claims c left join public.boxing_sources s on s.id = c.source_id where c.fighter_id in (select id from ids) and c.attribute <> 'dob')) from f),
    'career', jsonb_build_object(
      'professional', jsonb_build_object(
        'record_on_file', jsonb_build_object('W', (select count(*) from pro where wl = 'W'), 'L', (select count(*) from pro where wl = 'L'), 'D', (select count(*) from pro where wl = 'D'),
          'NC', (select count(*) from pro where wl = 'NC'), 'ND', (select count(*) from pro where wl = 'ND')),
        'record_basis', 'Derived from canonical bouts on record from approved sources only. Not a complete career record unless the coverage below says so.',
        'bouts_on_record', (select count(*) from rowz where competition_class = 'professional'),
        'bouts_without_result', (select count(*) from rowz where competition_class = 'professional' and result_id is null),
        'wins_by_code', (select coalesce(jsonb_object_agg(code, n), '{}'::jsonb) from (select cls ->> 'code' code, count(*) n from pro where wl = 'W' group by 1) x),
        'losses_by_code', (select coalesce(jsonb_object_agg(code, n), '{}'::jsonb) from (select cls ->> 'code' code, count(*) n from pro where wl = 'L' group by 1) x),
        'first_bout_on_record', (select min(event_date) from rowz), 'last_bout_on_record', (select max(event_date) from rowz),
        'latest_record_printed_by_a_source', (select jsonb_build_object('event_date', event_date, 'wins', record_wins, 'losses', record_losses, 'draws', record_draws)
          from rowz where coalesce(record_wins, record_losses, record_draws) is not null order by event_date desc limit 1)),
      'amateur', jsonb_build_object('status', 'not_modeled', 'bouts_on_record', (select count(*) from rowz where competition_class = 'amateur'),
        'note', 'Amateur and Olympic careers are a separate lane with no approved source yet; never merged into the professional record.'),
      'exhibition', jsonb_build_object('bouts_on_record', (select count(*) from rowz where competition_class = 'exhibition'))),
    'bouts', (select coalesce(jsonb_agg(jsonb_build_object('event_date', z.event_date, 'global_event_id', z.event_public, 'event_name', z.event_name, 'global_bout_id', z.bout_public,
        'competition_class', z.competition_class, 'opponent', (select jsonb_build_object('global_fighter_id', o.public_id, 'display_name', o.display_name) from public.boxing_fighters o where o.id = z.opp),
        'result', z.wl, 'classification', z.cls, 'round', z.round, 'time', public.boxing_archive_mmss(z.time_sec), 'scheduled_rounds', z.scheduled_rounds,
        'weight_class', (select class_key from public.boxing_weight_classes w where w.id = z.class_id),
        'official_weight_lb', (select w.official_weight_lb from public.boxing_weigh_ins w where w.bout_id = z.bout_id and w.fighter_id = z.fighter_id and w.weigh_in_kind = 'official'
                               and not exists (select 1 from public.boxing_weigh_ins n where n.supersedes_id = w.id) order by w.attempt_no desc limit 1),
        'titles', (select coalesce(jsonb_agg(jsonb_build_object('organization', o.slug, 'tier', t.tier, 'status', bt.status)), '[]'::jsonb)
          from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join public.boxing_organizations o on o.id = t.organization_id where bt.bout_id = z.bout_id),
        'venue', (select jsonb_build_object('global_venue_id', v.public_id, 'name', v.name, 'city', v.city, 'jurisdiction', public.boxing_jurisdiction_json(v.country_code, v.region))
          from public.boxing_venues v where v.id = z.venue_id),
        'commission', (select c.slug from public.boxing_commissions c where c.id = z.commission_id),
        'source', public.boxing_archive_src(z.bout_source, z.bout_url)) order by z.event_date, z.bout_public), '[]'::jsonb) from rowz z),
    'divisions', (select coalesce(jsonb_agg(jsonb_build_object('weight_class', w.class_key, 'bouts', x.n, 'first', x.first_on, 'last', x.last_on) order by x.first_on), '[]'::jsonb)
      from (select class_id, count(*) n, min(event_date) first_on, max(event_date) last_on from rowz where class_id is not null group by 1) x join public.boxing_weight_classes w on w.id = x.class_id),
    'title_bouts', (select count(distinct z.bout_id) from rowz z join public.boxing_bout_titles bt on bt.bout_id = z.bout_id),
    'body_statements_resolved_to_fighter', (select count(*) from public.boxing_title_status_entries e where e.fighter_id in (select id from ids)),
    'opponents', (select coalesce(jsonb_agg(jsonb_build_object('global_fighter_id', o.public_id, 'display_name', o.display_name, 'meetings', x.n, 'results', x.results) order by x.first_on), '[]'::jsonb)
      from (select opp, count(*) n, min(event_date) first_on, jsonb_agg(wl order by event_date) results from rowz where opp is not null group by opp) x
      join public.boxing_fighters o on o.id = x.opp),
    'officials_faced', (select coalesce(jsonb_agg(jsonb_build_object('global_official_id', o.public_id, 'name', o.display_name, 'role', x.role, 'bouts', x.n) order by x.n desc, o.display_name), '[]'::jsonb)
      from (select public.boxing_canonical_official_id(bo.official_id) official_id, bo.role, count(distinct bo.bout_id) n from public.boxing_bout_officials bo
            where bo.bout_id in (select bout_id from rowz) and bo.assignment_state in ('assigned','worked') group by 1, 2) x join public.boxing_officials o on o.id = x.official_id),
    'geography', jsonb_build_object(
      'jurisdictions', (select coalesce(jsonb_agg(distinct public.boxing_jurisdiction_json(v.country_code, v.region) ->> 'code'), '[]'::jsonb) from rowz z join public.boxing_venues v on v.id = z.venue_id),
      'venues', (select count(distinct venue_id) from rowz)),
    'coverage', jsonb_build_object('sources', (select coalesce(jsonb_agg(distinct s.source_key), '[]'::jsonb) from rowz z join public.boxing_sources s on s.id = z.bout_source))
  ) end
$$;

create or replace function public.boxing_archive_meetings(p_a text, p_b text)
returns jsonb language sql stable set search_path = '' as $$
  with ha as (select public.boxing_canonical_fighter_id(f.id) id from public.boxing_fighters f where public.boxing_site_ref_matches(f.public_id, p_a)),
  hb as (select public.boxing_canonical_fighter_id(f.id) id from public.boxing_fighters f where public.boxing_site_ref_matches(f.public_id, p_b)),
  a as (select id from ha where (select count(distinct id) from ha) = 1 limit 1),
  b as (select id from hb where (select count(distinct id) from hb) = 1 limit 1),
  part as (
    select public.boxing_canonical_fighter_id(p.fighter_id) fid, p.bout_id, p.side, e.event_date, bt.public_id bout_public, bt.competition_class
    from public.boxing_bout_participants p join public.boxing_bouts bt on bt.id = p.bout_id join public.boxing_events e on e.id = bt.event_id
    where p.participant_status in ('scheduled','confirmed') and bt.status is distinct from 'cancelled'),
  view_of as (
    select x.fid me, y.fid opp, x.bout_id, x.event_date, x.bout_public, r.outcome, r.winner_id,
      case when r.id is null then null when r.outcome = 'win' and public.boxing_canonical_fighter_id(r.winner_id) = x.fid then 'W' when r.outcome = 'win' then 'L'
           when r.outcome = 'draw' then 'D' when r.outcome = 'no_contest' then 'NC' else r.outcome end wl,
      public.boxing_classify_result(r.outcome, r.method, r.decision_type, r.result_state, r.method_raw, x.competition_class, r.round, r.time_sec) ->> 'code' code
    from part x join part y on y.bout_id = x.bout_id and y.side <> x.side
    left join public.boxing_bout_results_current r on r.bout_id = x.bout_id)
  select case when not exists (select 1 from a) or not exists (select 1 from b) then null else jsonb_build_object(
    'rule', 'pbe_meetings@1',
    'a', (select public_id from public.boxing_fighters where id = (select id from a)), 'b', (select public_id from public.boxing_fighters where id = (select id from b)),
    'meetings', (select coalesce(jsonb_agg(jsonb_build_object('event_date', v.event_date, 'global_bout_id', v.bout_public, 'result_for_a', v.wl, 'code', v.code) order by v.event_date), '[]'::jsonb)
      from view_of v where v.me = (select id from a) and v.opp = (select id from b)),
    'common_opponents', (select coalesce(jsonb_agg(jsonb_build_object('global_fighter_id', o.public_id, 'display_name', o.display_name,
        'a_results', (select jsonb_agg(jsonb_build_object('event_date', v.event_date, 'result', v.wl, 'code', v.code, 'global_bout_id', v.bout_public) order by v.event_date) from view_of v where v.me = (select id from a) and v.opp = c.opp),
        'b_results', (select jsonb_agg(jsonb_build_object('event_date', v.event_date, 'result', v.wl, 'code', v.code, 'global_bout_id', v.bout_public) order by v.event_date) from view_of v where v.me = (select id from b) and v.opp = c.opp))
        order by o.display_name), '[]'::jsonb)
      from (select opp from view_of where me = (select id from a) intersect select opp from view_of where me = (select id from b)) c
      join public.boxing_fighters o on o.id = c.opp where c.opp not in ((select id from a), (select id from b))),
    'basis', 'Canonical bouts on record only; identities joined by canonical fighter id, never by name.') end
$$;

create or replace function public.boxing_archive_division(p_class text, p_gender text default 'male', p_from date default null, p_to date default null)
returns jsonb language sql stable set search_path = '' as $$
  with w as (select * from public.boxing_weight_classes where class_key = p_class),
  tb as (
    select b.id, b.public_id, e.event_date, e.public_id event_public
    from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
    where exists (select 1 from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id where bt.bout_id = b.id and t.weight_class_id = (select id from w))
      and (p_from is null or e.event_date >= p_from) and (p_to is null or e.event_date <= p_to))
  select case when not exists (select 1 from w) then null else jsonb_build_object(
    'rule', 'pbe_archive_division@1', 'weight_class', p_class, 'gender', p_gender, 'from', p_from, 'to', p_to,
    'definitions', (select coalesce(jsonb_agg(jsonb_build_object('basis', d.basis, 'organization', o.slug, 'native_label', d.native_label, 'limit_lb', d.limit_lb,
        'valid_from', d.valid_from, 'valid_to', d.valid_to, 'note', d.note) order by d.valid_from nulls first), '[]'::jsonb)
      from public.boxing_weight_class_definitions d left join public.boxing_organizations o on o.id = d.organization_id where d.weight_class_id = (select id from w)),
    'native_labels', (select coalesce(jsonb_agg(jsonb_build_object('organization', o.slug, 'native_label', od.native_label, 'limit_as_printed', od.limit_text) order by o.slug, od.native_label), '[]'::jsonb)
      from public.boxing_org_divisions od join public.boxing_organizations o on o.id = od.organization_id where od.weight_class_id = (select id from w)),
    'bodies', (select coalesce(jsonb_agg(public.boxing_archive_title_runs(o.slug, p_class, p_gender, p_from, p_to) order by array_position(array['wbc','wba','ibf','wbo'], o.slug)), '[]'::jsonb)
      from public.boxing_organizations o where o.slug in ('wbc','wba','ibf','wbo')),
    'title_bouts_on_record', (select coalesce(jsonb_agg(public.boxing_archive_bout(tb.id) || jsonb_build_object('event_date', tb.event_date, 'global_event_id', tb.event_public) order by tb.event_date), '[]'::jsonb) from tb),
    'bouts_on_record_by_year', (select coalesce(jsonb_object_agg(y, n), '{}'::jsonb) from (
        select extract(year from e.event_date)::int::text y, count(*) n from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
        where b.weight_class_id = (select id from w) and (p_from is null or e.event_date >= p_from) and (p_to is null or e.event_date <= p_to) group by 1) x),
    'basis', 'Body runs are each body''s own printed statements; title bouts are canonical bouts linked to a title of this division. Neither is merged into the other.') end
$$;

create or replace function public.boxing_archive_assertions()
returns jsonb language sql stable set search_path = '' as $$
  with cr as (select r.*, b.competition_class, b.source_id bout_source,
                public.boxing_classify_result(r.outcome, r.method, r.decision_type, r.result_state, r.method_raw, b.competition_class, r.round, r.time_sec) c
              from public.boxing_bout_results_current r join public.boxing_bouts b on b.id = r.bout_id),
  checks as (
    select 'result_without_ontology_code' a, 'failure' sev, count(*) n, (array_agg(bout_id::text))[1:5] sample from cr where c is null or c ->> 'code' is null
    union all select 'result_unclassified_with_a_stated_method', 'failure', count(*), (array_agg(bout_id::text))[1:5] from cr where c ->> 'code' = 'UNCLASSIFIED' and method is distinct from 'OTHER' and outcome <> 'unknown'
    union all select 'decision_contradicts_judges_cards', 'failure', count(*), (array_agg(bout_id::text))[1:5] from cr
      where method in ('DECISION','TECHNICAL_DECISION') and public.boxing_archive_decision_check(bout_id) ->> 'status' = 'contradicts'
    union all select 'enabled_source_without_registry_lanes', 'failure', count(*), (array_agg(source_key))[1:5] from public.boxing_sources s
      where s.enabled and s.source_kind <> 'internal' and not exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = s.id)
    union all select 'weight_definition_overlap', 'failure', count(*), null::text[] from public.boxing_weight_class_definitions d1 join public.boxing_weight_class_definitions d2
      on d2.weight_class_id = d1.weight_class_id and d2.organization_id is not distinct from d1.organization_id and d2.gender_scope = d1.gender_scope and d2.id > d1.id
      and d1.basis <> 'pbe_modern_reference' and d2.basis <> 'pbe_modern_reference'
      and daterange(d1.valid_from, d1.valid_to, '[]') && daterange(d2.valid_from, d2.valid_to, '[]')
    union all select 'stoppage_round_not_stated', 'info', count(*), (array_agg(bout_id::text))[1:5] from cr where c -> 'flags' ? 'stoppage_round_not_stated'
    union all select 'result_source_text_incomplete', 'info', count(*), (array_agg(bout_id::text))[1:5] from cr where c -> 'flags' ? 'source_text_incomplete'
    union all select 'decision_type_not_stated', 'info', count(*), (array_agg(bout_id::text))[1:5] from cr where c -> 'flags' ? 'decision_type_not_stated'
    union all select 'results_overturned', 'info', count(*), (array_agg(bout_id::text))[1:5] from cr where result_state = 'overturned'
    union all select 'amateur_or_exhibition_bouts', 'info', count(*), null from public.boxing_bouts where competition_class in ('amateur','exhibition')
    union all select 'commissions_without_registered_jurisdiction', 'info', count(*), (array_agg(slug))[1:5] from public.boxing_commissions c
      where (public.boxing_jurisdiction_json(c.country_code, c.region_code, c.jurisdiction) ->> 'kind') is distinct from 'subdivision'
    union all select 'lanes_with_rights_review_scope_gap', 'info', count(*), (array_agg(s.source_key || ':' || c.lane))[1:5] from public.boxing_source_capabilities_current c
      join public.boxing_sources s on s.id = c.source_id where c.rights_scope = 'review_scope_gap')
  select jsonb_build_object('rule', 'pbe_archive_assertions@1', 'failures', (select coalesce(sum(n) filter (where sev = 'failure'), 0) from checks),
    'checks', (select jsonb_agg(jsonb_build_object('assertion', a, 'severity', sev, 'count', n, 'sample', coalesce(to_jsonb(sample), '[]'::jsonb)) order by sev, a) from checks))
$$;

create or replace function public.boxing_archive_index()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('rules', jsonb_build_object('result_ontology', 'pbe_result_ontology@1', 'title_remarks', 'pbe_title_remark_ontology@1', 'title_runs', 'pbe_title_runs@1',
      'weights', 'pbe_weight_class_as_of@1', 'card', 'pbe_archive_card@1', 'passport', 'pbe_fighter_passport@1', 'meetings', 'pbe_meetings@1', 'division', 'pbe_archive_division@1'),
    'assertions', public.boxing_archive_assertions(),
    'result_classes', (select jsonb_agg(jsonb_build_object('code', code, 'label', label, 'family', family, 'counts_in_professional_record', counts_in_professional_record) order by family, code)
      from public.boxing_result_classes),
    'results_by_code', (select coalesce(jsonb_object_agg(code, n), '{}'::jsonb) from (
        select public.boxing_classify_result(r.outcome, r.method, r.decision_type, r.result_state, r.method_raw, b.competition_class, r.round, r.time_sec) ->> 'code' code, count(*) n
        from public.boxing_bout_results_current r join public.boxing_bouts b on b.id = r.bout_id group by 1) x),
    'jurisdictions', (select jsonb_agg(jsonb_build_object('global_jurisdiction_id', public_id, 'code', jurisdiction_code, 'kind', kind, 'name', name) order by jurisdiction_code)
      from public.boxing_jurisdictions),
    'registry', (select jsonb_build_object('sources', count(distinct c.source_id), 'lanes', count(*),
        'by_availability', (select jsonb_object_agg(availability, n) from (select availability, count(*) n from public.boxing_source_capabilities_current group by 1) x))
      from public.boxing_source_capabilities_current c),
    'coverage', jsonb_build_object('events', (select count(*) from public.boxing_events), 'first_event_on', (select min(event_date) from public.boxing_events),
      'last_event_on', (select max(event_date) from public.boxing_events), 'bouts', (select count(*) from public.boxing_bouts),
      'fighters', (select count(*) from public.boxing_fighters where merged_into_id is null),
      'title_documents', (select count(*) from public.boxing_title_status_snapshots),
      'venue_countries', (select coalesce(jsonb_agg(distinct country_code), '[]'::jsonb) from public.boxing_venues)))
$$;

select public.boxing_lockdown();

commit;
