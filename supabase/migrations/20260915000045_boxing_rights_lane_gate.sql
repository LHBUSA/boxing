-- Rights lane gate + archival source registry (owner decisions, 2026-09-15).
--
-- 1. New Jersey: the recorded rights review covers SCHEDULE FACTS ONLY. Results, judges' totals, suspensions and the other
--    expanded lanes are marked unresolved / review_scope_gap and, from here on, FAIL CLOSED at write time. The parser is
--    untouched and the rows already stored stay exactly where they are (they are counted, never hidden).
-- 2. A lane write gate: a fact may not be written for a (source, lane) whose registry row says the rights review does not
--    cover it. The recorders return a refusal instead of writing; nothing is deleted and no parser changes.
-- 3. Archival/historical media sources are REGISTERED, not approved: Library of Congress, Chronicling America, Wikimedia
--    Commons, Smithsonian Open Access, Internet Archive, DPLA and NARA, each with its rights fields per lane and every
--    unclear permission left unresolved and fail-closed. Registration is not ingestion approval.
-- 4. Amateur/Olympic bodies (IOC, World Boxing, IBA, USA Boxing) are registered as review_required with every lane
--    not permitted until their exact terms are reviewed.

begin;

-- 1 -------------------------------------------------------------------------------------------------------------------
-- 'unresolved' joins the availability vocabulary: the source may well publish the lane, but whether we may store and use
-- it is unresolved, so it is treated as unavailable.
alter table public.boxing_source_capabilities drop constraint if exists boxing_source_capabilities_availability_check;
do $$ begin
  perform public.boxing_ensure_constraint('public.boxing_source_capabilities', 'boxing_source_capabilities_availability_check',
    'check (availability in (''provided'',''partial'',''not_provided'',''not_permitted'',''unverified'',''unresolved''))');
end $$;

alter table public.boxing_source_capabilities add column if not exists commercial_use text;
alter table public.boxing_source_capabilities add column if not exists storage_allowed text;
alter table public.boxing_source_capabilities add column if not exists redistribution_allowed text;
alter table public.boxing_source_capabilities add column if not exists public_display_allowed text;
alter table public.boxing_source_capabilities add column if not exists pro_tier_allowed text;
alter table public.boxing_source_capabilities add column if not exists internal_use_allowed text;
alter table public.boxing_source_capabilities add column if not exists verification_state text;
do $$ begin
  perform public.boxing_ensure_constraint('public.boxing_source_capabilities', 'boxing_source_capabilities_permission_values',
    'check (coalesce(commercial_use, ''unresolved'') in (''allowed'',''prohibited'',''conditional'',''unresolved'')
        and coalesce(storage_allowed, ''unresolved'') in (''allowed'',''prohibited'',''conditional'',''unresolved'')
        and coalesce(redistribution_allowed, ''unresolved'') in (''allowed'',''prohibited'',''conditional'',''unresolved'')
        and coalesce(public_display_allowed, ''unresolved'') in (''allowed'',''prohibited'',''conditional'',''unresolved'')
        and coalesce(pro_tier_allowed, ''unresolved'') in (''allowed'',''prohibited'',''conditional'',''unresolved'')
        and coalesce(internal_use_allowed, ''unresolved'') in (''allowed'',''prohibited'',''conditional'',''unresolved'')
        and coalesce(verification_state, ''unverified'') in (''verified_terms_read'',''secondary_evidence'',''unverified''))');
end $$;

-- the current-rows view and the registry read must expose the new permission columns
create or replace view public.boxing_source_capabilities_current with (security_invoker = true) as
  select c.* from public.boxing_source_capabilities c
  where not exists (select 1 from public.boxing_source_capabilities n where n.supersedes_id = c.id);

-- New Jersey: supersede the expanded lanes with unresolved / review_scope_gap rows
insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, jurisdiction_code, country_code,
  coverage_from, coverage_to, coverage_basis, acquisition_method, cadence, completeness, confidence, notes, evidence, recorded_by,
  commercial_use, storage_allowed, redistribution_allowed, public_display_allowed, pro_tier_allowed, internal_use_allowed, verification_state,
  supersedes_id)
select c.source_id, c.lane, 'unresolved', 'review_scope_gap', c.jurisdiction_code, c.country_code, c.coverage_from, c.coverage_to,
  c.coverage_basis, c.acquisition_method, c.cadence, c.completeness, 'high',
  'Owner decision 2026-09-15: the recorded NJ rights review covers schedule facts only. This lane stays unresolved and fails closed at write time until the governing terms are reviewed for commercial storage and use. The parser and the rows already stored are untouched.',
  jsonb_build_object('owner_decision', '2026-09-15', 'documented_in', 'docs/history/GLOBAL_BOXING_HISTORY_V1.md#d'),
  'pbe_owner_decision@2026-09-15',
  'unresolved', 'unresolved', 'prohibited', 'unresolved', 'unresolved', 'conditional', 'unverified', c.id
from public.boxing_source_capabilities_current c
join public.boxing_sources s on s.id = c.source_id
where s.source_key = 'nj_sacb'
  and c.lane in ('bouts','results','stoppage_round_time','scorecard_totals','judges','referees','weigh_ins','point_deductions','suspensions','titles_at_stake')
  and c.availability <> 'unresolved';

-- a lane NJ has never had a registry row for is created closed, so "not declared" can never read as "allowed"
insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, jurisdiction_code, country_code, coverage_basis,
  acquisition_method, completeness, confidence, notes, evidence, recorded_by,
  commercial_use, storage_allowed, redistribution_allowed, public_display_allowed, pro_tier_allowed, internal_use_allowed, verification_state)
select s.id, l.lane, 'unresolved', 'review_scope_gap', 'US-NJ', 'US', 'research_note', 'pdf', 'unknown', 'high',
  'Owner decision 2026-09-15: outside the recorded schedule-facts review. Closed until the governing terms are reviewed.',
  jsonb_build_object('owner_decision', '2026-09-15'), 'pbe_owner_decision@2026-09-15',
  'unresolved', 'unresolved', 'prohibited', 'unresolved', 'unresolved', 'conditional', 'unverified'
from public.boxing_sources s
cross join lateral (select unnest(array['bouts','results','stoppage_round_time','scorecard_totals','judges','referees','weigh_ins','point_deductions','suspensions','titles_at_stake']) lane) l
where s.source_key = 'nj_sacb'
  and not exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = s.id and c.lane = l.lane);

-- Appending to rights_note must not append twice on a chain rerun: the note is written once and the guard is the note's
-- own text, so a second pass is a no-op rather than a silently duplicated sentence.
update public.boxing_sources set rights_note = coalesce(rights_note || ' | ', '')
  || 'Scope 2026-09-15: schedule facts only. Result, official, scorecard, weigh-in and suspension lanes are unresolved and fail closed until re-reviewed.'
where source_key = 'nj_sacb'
  and coalesce(rights_note, '') not like '%Scope 2026-09-15: schedule facts only.%';

-- 2 -------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_lane_rights_state(p_source uuid, p_lane text)
returns text language sql stable set search_path = '' as $$
  select coalesce((select c.rights_scope from public.boxing_source_capabilities_current c
                   where c.source_id = p_source and c.lane = p_lane limit 1), 'not_declared')
$$;

create or replace function public.boxing_lane_rights_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_lane text := tg_argv[0];
  v_state text;
begin
  -- optional second lane selected by a column value:
  --   (default_lane, column_name, column_value, lane_to_use_when_the_column_equals_that_value)
  if tg_argv[1] is not null and to_jsonb(new) ->> tg_argv[1] is not distinct from tg_argv[2] then
    v_lane := tg_argv[3];
  end if;
  v_state := public.boxing_lane_rights_state(new.source_id, v_lane);
  if v_state in ('review_scope_gap', 'not_permitted') then
    raise exception 'lane_not_rights_approved: % is % for source %', v_lane, v_state,
      (select source_key from public.boxing_sources where id = new.source_id) using errcode = 'BX140';
  end if;
  return new;
end $$;

drop trigger if exists boxing_results_lane_gate on public.boxing_bout_results;
create trigger boxing_results_lane_gate before insert on public.boxing_bout_results
  for each row execute function public.boxing_lane_rights_guard('results');
drop trigger if exists boxing_scorecards_lane_gate on public.boxing_scorecards;
create trigger boxing_scorecards_lane_gate before insert on public.boxing_scorecards
  for each row execute function public.boxing_lane_rights_guard('scorecard_totals');
drop trigger if exists boxing_deductions_lane_gate on public.boxing_point_deductions;
create trigger boxing_deductions_lane_gate before insert on public.boxing_point_deductions
  for each row execute function public.boxing_lane_rights_guard('point_deductions');
drop trigger if exists boxing_weigh_ins_lane_gate on public.boxing_weigh_ins;
create trigger boxing_weigh_ins_lane_gate before insert on public.boxing_weigh_ins
  for each row execute function public.boxing_lane_rights_guard('weigh_ins');
drop trigger if exists boxing_regulatory_lane_gate on public.boxing_regulatory_actions;
create trigger boxing_regulatory_lane_gate before insert on public.boxing_regulatory_actions
  for each row execute function public.boxing_lane_rights_guard('suspensions');
-- officials: the judge lane for judges, the referee lane for everyone else
drop trigger if exists boxing_bout_officials_lane_gate on public.boxing_bout_officials;
create trigger boxing_bout_officials_lane_gate before insert on public.boxing_bout_officials
  for each row execute function public.boxing_lane_rights_guard('referees', 'role', 'judge', 'judges');
drop trigger if exists boxing_bout_titles_lane_gate on public.boxing_bout_titles;
create trigger boxing_bout_titles_lane_gate before insert on public.boxing_bout_titles
  for each row execute function public.boxing_lane_rights_guard('titles_at_stake');
drop trigger if exists boxing_bouts_lane_gate on public.boxing_bouts;
create trigger boxing_bouts_lane_gate before insert on public.boxing_bouts
  for each row execute function public.boxing_lane_rights_guard('bouts');

-- the registry read now reports each lane's permissions, not just its availability
create or replace function public.boxing_source_registry_json(p_source_key text default null)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'source_key', s.source_key, 'source_name', s.source_name, 'source_kind', s.source_kind, 'access_mode', s.access_mode, 'rights_state', s.rights_state, 'enabled', s.enabled,
    'homepage_url', s.homepage_url, 'terms_url', s.terms_url, 'redistribution_allowed', s.redistribution_allowed, 'derivative_allowed', s.derivative_allowed,
    'display_allowed', s.display_allowed, 'attribution_required', s.attribution_required, 'reviewed_at', s.reviewed_at, 'next_review_due', s.next_review_due,
    'rights_note', s.rights_note,
    'latest_rights_review', (select jsonb_build_object('decision', r.decision, 'reviewed_at', r.reviewed_at, 'permitted_uses', r.permitted_uses, 'prohibited_uses', r.prohibited_uses,
        'next_review_due', r.next_review_due) from public.boxing_source_rights_reviews r where r.source_id = s.id order by r.reviewed_at desc limit 1),
    'lanes', (select coalesce(jsonb_agg(jsonb_build_object('lane', c.lane, 'availability', c.availability, 'rights_scope', c.rights_scope, 'jurisdiction', c.jurisdiction_code,
        'country', c.country_code, 'coverage_from', c.coverage_from, 'coverage_to', c.coverage_to, 'coverage_basis', c.coverage_basis, 'acquisition', c.acquisition_method,
        'cadence', c.cadence, 'completeness', c.completeness, 'confidence', c.confidence,
        'commercial_use', coalesce(c.commercial_use, 'unresolved'), 'storage_allowed', coalesce(c.storage_allowed, 'unresolved'),
        'redistribution_allowed', coalesce(c.redistribution_allowed, 'unresolved'), 'public_display_allowed', coalesce(c.public_display_allowed, 'unresolved'),
        'pro_tier_allowed', coalesce(c.pro_tier_allowed, 'unresolved'), 'internal_use_allowed', coalesce(c.internal_use_allowed, 'unresolved'),
        'verification_state', coalesce(c.verification_state, 'unverified'),
        'notes', c.notes, 'evidence', c.evidence, 'recorded_at', c.recorded_at) order by c.lane), '[]'::jsonb)
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

create or replace function public.boxing_rights_gate_report()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'rule', 'pbe_rights_lane_gate@1',
    'gated_lanes', (select coalesce(jsonb_agg(jsonb_build_object('source_key', s.source_key, 'lane', c.lane, 'rights_scope', c.rights_scope,
        'availability', c.availability, 'commercial_use', c.commercial_use, 'storage_allowed', c.storage_allowed,
        'verification_state', c.verification_state, 'notes', c.notes) order by s.source_key, c.lane), '[]'::jsonb)
      from public.boxing_source_capabilities_current c join public.boxing_sources s on s.id = c.source_id
      where c.rights_scope in ('review_scope_gap','not_permitted')),
    -- rows stored before a lane was closed: kept, counted, never silently used
    'rows_stored_in_closed_lanes', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
        select s.source_key || ':results' k, count(*) n from public.boxing_bout_results r join public.boxing_sources s on s.id = r.source_id
          where public.boxing_lane_rights_state(r.source_id, 'results') in ('review_scope_gap','not_permitted') group by 1
        union all
        select s.source_key || ':scorecard_totals', count(*) from public.boxing_scorecards x join public.boxing_sources s on s.id = x.source_id
          where public.boxing_lane_rights_state(x.source_id, 'scorecard_totals') in ('review_scope_gap','not_permitted') group by 1
        union all
        select s.source_key || ':weigh_ins', count(*) from public.boxing_weigh_ins x join public.boxing_sources s on s.id = x.source_id
          where public.boxing_lane_rights_state(x.source_id, 'weigh_ins') in ('review_scope_gap','not_permitted') group by 1
        union all
        select s.source_key || ':suspensions', count(*) from public.boxing_regulatory_actions x join public.boxing_sources s on s.id = x.source_id
          where public.boxing_lane_rights_state(x.source_id, 'suspensions') in ('review_scope_gap','not_permitted') group by 1
        union all
        select s.source_key || ':bouts', count(*) from public.boxing_bouts x join public.boxing_sources s on s.id = x.source_id
          where public.boxing_lane_rights_state(x.source_id, 'bouts') in ('review_scope_gap','not_permitted') group by 1) y),
    'registered_not_approved', (select coalesce(jsonb_agg(jsonb_build_object('source_key', s.source_key, 'kind', s.source_kind,
        'access_mode', s.access_mode, 'rights_state', s.rights_state, 'enabled', s.enabled) order by s.source_key), '[]'::jsonb)
      from public.boxing_sources s where s.access_mode in ('review_required','reference_only') and not s.enabled))
$$;

-- 3 -------------------------------------------------------------------------------------------------------------------
-- Archival and amateur bodies: registered so they exist in the registry with explicit rights, NOT approved for ingestion.
insert into public.boxing_sources (source_key, source_name, source_kind, homepage_url, terms_url, license_name, access_mode, rights_state,
  redistribution_allowed, enabled, rights_note, intended_use, persistence_allowed, derivative_allowed, display_allowed, attribution_required)
values
  ('loc_gov', 'Library of Congress digital collections', 'reference', 'https://www.loc.gov/', 'https://www.loc.gov/legal/', null,
    'review_required', 'unknown', false, false,
    'Rights are per item. Only items whose record states "No known restrictions on publication" may ever be considered, and each one needs its own recorded check.',
    'Historical corroboration and public-domain media; never a structured-fact source.', false, false, false, true),
  ('chronicling_america', 'Chronicling America (LoC newspaper archive)', 'reference', 'https://chroniclingamerica.loc.gov/', 'https://www.loc.gov/legal/', null,
    'review_required', 'unknown', false, false,
    'Pre-1931 pages only, OCR text is evidence for a human to read, never an automatic fact. Page, sequence and text span must be stored with any claim.',
    'Historical corroboration of events already on record.', false, false, false, true),
  ('wikimedia_commons', 'Wikimedia Commons', 'open_data', 'https://commons.wikimedia.org/', 'https://commons.wikimedia.org/wiki/Commons:Licensing', null,
    'review_required', 'unknown', false, false,
    'Per-file licensing. Only files traceable to a public-domain or CC0 institutional source qualify, and the licence must be recorded per file.',
    'Historical media with recorded per-file licence.', false, false, false, true),
  ('smithsonian_open_access', 'Smithsonian Open Access', 'open_data', 'https://www.si.edu/openaccess', 'https://www.si.edu/termsofuse', null,
    'review_required', 'unknown', false, false,
    'CC0 applies per media file, not per record: the trap is a CC0 record with a restricted image. Each file needs its own usage.access check.',
    'Historical media with recorded per-file licence.', false, false, false, true),
  ('internet_archive', 'Internet Archive', 'reference', 'https://archive.org/', 'https://archive.org/about/terms.php', null,
    'reference_only', 'reference_only', false, false,
    'Rights are asserted by uploaders, so nothing here is authoritative. Human research only; user-uploaded periodicals are excluded.',
    'Human research and corroboration only.', false, false, false, true),
  ('dpla', 'Digital Public Library of America', 'reference', 'https://dp.la/', 'https://pro.dp.la/developers/policies', null,
    'review_required', 'unknown', false, false,
    'Aggregator: rights follow the contributing institution, and an API key needs owner approval under the zero-signup rule.',
    'Discovery of primary sources for human review.', false, false, false, true),
  ('nara', 'US National Archives (NARA) catalog', 'reference', 'https://catalog.archives.gov/', 'https://www.archives.gov/global-pages/privacy', null,
    'review_required', 'unknown', false, false,
    'Mostly US federal public domain, but per-item rights statements govern; an API key needs owner approval.',
    'Historical corroboration and public-domain media.', false, false, false, true),
  ('ioc_olympics', 'International Olympic Committee / Olympics.com', 'other', 'https://olympics.com/', 'https://olympics.com/en/terms-of-service', null,
    'review_required', 'unknown', false, false,
    'Owner decision 2026-09-15: no amateur/Olympic ingestion until the exact terms and data rights are reviewed.',
    'None until reviewed.', false, false, false, true),
  ('world_boxing', 'World Boxing', 'other', 'https://worldboxing.org/', null, null, 'review_required', 'unknown', false, false,
    'Owner decision 2026-09-15: registered only; no ingestion until terms are reviewed.', 'None until reviewed.', false, false, false, true),
  ('iba_boxing', 'International Boxing Association (IBA)', 'other', 'https://www.iba.sport/', null, null, 'review_required', 'unknown', false, false,
    'Owner decision 2026-09-15: registered only; no ingestion until terms are reviewed.', 'None until reviewed.', false, false, false, true),
  ('usa_boxing', 'USA Boxing', 'other', 'https://www.usaboxing.org/', null, null, 'review_required', 'unknown', false, false,
    'Owner decision 2026-09-15: registered only; no ingestion until terms are reviewed.', 'None until reviewed.', false, false, false, true)
on conflict (source_key) do nothing;

-- every lane of every newly registered source is closed until its terms are read
do $$
declare
  v_by text := 'pbe_owner_decision@2026-09-15';
begin
  insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, coverage_basis, acquisition_method,
    completeness, confidence, notes, evidence, recorded_by, commercial_use, storage_allowed, redistribution_allowed,
    public_display_allowed, pro_tier_allowed, internal_use_allowed, verification_state)
  select s.id, l.lane, 'unresolved', 'not_permitted', 'research_note', 'none', 'unknown', 'low',
    case when s.source_key in ('ioc_olympics','world_boxing','iba_boxing','usa_boxing')
      then 'Amateur/Olympic body: registered only. No ingestion until the exact terms and data rights are reviewed (owner decision 2026-09-15).'
      else 'Archival source: registered, NOT approved for ingestion. May only ever support provenance, corroboration and media - never override an authoritative structured fact.' end,
    jsonb_build_object('owner_decision', '2026-09-15', 'registration_is_not_approval', true), v_by,
    'unresolved', 'unresolved', 'prohibited', 'unresolved', 'unresolved', 'conditional', 'unverified'
  from public.boxing_sources s
  cross join lateral (select unnest(case when s.source_key in ('ioc_olympics','world_boxing','iba_boxing','usa_boxing')
      then array['events','bouts','results','fighter_identity','fighter_attributes','rankings','titles_at_stake']
      else array['events','bouts','results','fighter_identity','fighter_attributes','venues','promoters'] end) lane) l
  where s.source_key in ('loc_gov','chronicling_america','wikimedia_commons','smithsonian_open_access','internet_archive','dpla','nara',
                         'ioc_olympics','world_boxing','iba_boxing','usa_boxing')
    and not exists (select 1 from public.boxing_source_capabilities c where c.source_id = s.id and c.lane = l.lane);
end $$;

select public.boxing_lockdown();

commit;
