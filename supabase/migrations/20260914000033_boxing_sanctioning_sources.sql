-- PropBetEdge Boxing — sanctioning-body titles + rankings from approved official sources (WBA, IBF, WBO).
--
-- Owner approvals 2026-09-14 (docs/TITLES_RANKINGS_SOURCES_2026-09-14.md):
--   * wba_official: automated monthly collection of /wba-ranking and /current-wba-champions; facts only, attribution,
--     low rate, no redistribution of copied pages; disagreements between WBA pages preserved.
--   * ibf_official: the public ratings JSON (/wp-json/ratings/v1/filter), Crawl-delay 10 or slower, historical backfill
--     2005-2026 throttled with checkpoints; a mandatory due date never names a challenger.
--   * wbo_official: the ratings PDF (token read from /rankings/ every run, never guessed) and /male-champions/;
--     "Undisputed Super Champion" is narrative, not a designation.
--   * wbc_official: NOT approved. State not_licensed; no WBC fact is ingested. Other bodies' claims about the WBC are
--     kept as claims only.
--
-- Model (append-only observations; nothing here writes title lineage):
--   boxing_org_divisions            organization-native division labels and limits -> canonical weight class (or null)
--   boxing_org_designations         organization-native belt/status labels -> tier / holder status (unknown -> review)
--   boxing_title_status_snapshots   one normalized statement document per org x division x document kind
--   boxing_title_status_entries     its belts: status, holder as printed, printed reign start, identity state
--   boxing_title_mandatory_statements  mandatory/eliminator statements exactly as printed
--   boxing_title_claims             what one body's document says about ANOTHER body (display/disagreement only)
--   boxing_title_conflicts          two documents of the same body disagree about a belt
--   boxing_title_snapshot_diffs     changes between consecutive snapshots of the same document kind
--   boxing_title_event_proposals    proposed title events from diffs; a proposal never writes boxing_title_events
--   boxing_title_event_proposal_decisions  human review (default) or the two-source automatic confirmation
--   boxing_org_identity_reviews / _decisions  champion/ranking names held for identity review; reviewed org ids only
--   boxing_source_backfill_checkpoints  resumable, throttled historical collection
-- Ranking lists keep using boxing_ranking_snapshots / entries (0006); source-native extras live in metadata and
-- source_record (regional tag, NOT RATED slot, outside the numbered list, org boxer id, retrieval hashes).

begin;

-- ---------------------------------------------------------------------------------------------------------------------
-- Source approvals (WBC stays review_required = not licensed)
-- ---------------------------------------------------------------------------------------------------------------------

do $$
declare
  v_at timestamptz := '2026-09-14T18:00:00Z';
  r record;
  v_src uuid;
  v_review uuid;
begin
  for r in select * from (values
    ('wba_official', 'https://www.wbaboxing.com/important-legal-information',
     array['automated monthly collection of https://www.wbaboxing.com/wba-ranking and /current-wba-champions at a low rate',
           'store normalized facts (belts, holders as printed, rankings, regional tags, WBA boxer ids) with source snapshots, retrieval times and content hashes',
           'first-party display with attribution to the World Boxing Association', 'derived analytics'],
     array['redistributing copied WBA HTML or PDF content', 'choosing between conflicting WBA pages', 'collection that ignores unexpected page structure (fail closed)'],
     'WBA "Important Legal Information": content provided for informational purposes only and not binding; no reuse prohibition found. Owner approval 2026-09-14.'),
    ('ibf_official', 'https://www.ibf-usba-boxing.com/',
     array['use of the public ratings JSON https://www.ibf-usba-boxing.com/wp-json/ratings/v1/filter at Crawl-delay 10 or slower',
           'historical backfill of monthly ratings 2005-2026, throttled and checkpointed',
           'store normalized facts (champion records, ratings, NOT RATED slots) with source provenance', 'first-party display with attribution to the International Boxing Federation'],
     array['redistributing the raw feed', 'inferring a mandatory challenger from a mandatory due date', 'continuing after an unexpected API shape (fail closed)'],
     'IBF site (terms_url is the home page: no terms page exists): "All Rights Reserved" footer, no terms of use; robots.txt Crawl-delay: 10 and /wp-json/ not disallowed. The endpoint is undocumented. Owner approval 2026-09-14.'),
    ('wbo_official', 'https://wboboxing.com/',
     array['automated collection of the WBO male world ratings PDF, with its link read from https://wboboxing.com/rankings/ on every run',
           'automated collection of https://wboboxing.com/male-champions/', 'store normalized facts with source provenance',
           'first-party display with attribution to the World Boxing Organization'],
     array['guessing or synthesizing a ratings PDF token', 'redistributing the PDF', 'treating "Undisputed Super Champion" prose as an official designation without evidence',
           'choosing between the ratings PDF and the champions page when they disagree'],
     'WBO site (terms_url is the home page: no terms page exists): copyright footer, no terms of use; robots.txt allows all. Owner approval 2026-09-14.')
  ) as t(source_key, terms_url, permitted, prohibited, notes)
  loop
    select id into v_src from public.boxing_sources where source_key = r.source_key;
    if v_src is null then raise exception 'missing source row %', r.source_key; end if;
    insert into public.boxing_source_rights_reviews
      (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses, account_agreement_found, account_scope_note, next_review_due, notes)
    values (v_src, v_at, 'PropBetEdge owner approval 2026-09-14 (titles + rankings); source review by Claude Code session 2026-09-14', r.terms_url,
      'approved_with_restrictions', r.permitted, r.prohibited, false, 'Official public source; no account or fee.', '2026-12-14', r.notes)
    on conflict (source_id, reviewed_at) do nothing;
    select id into v_review from public.boxing_source_rights_reviews where source_id = v_src and reviewed_at = v_at;
    update public.boxing_sources set
      latest_rights_review_id = v_review, access_mode = 'approved_ingest', rights_state = 'approved', enabled = true,
      persistence_allowed = true, derivative_allowed = true, display_allowed = true, redistribution_allowed = false,
      attribution_required = 'Attribute the sanctioning body as the official source.',
      reviewed_at = v_at, reviewed_by = 'PropBetEdge owner approval 2026-09-14', next_review_due = '2026-12-14',
      rights_note = 'APPROVED (2026-09-14): normalized facts with attribution and provenance; no redistribution of copied documents; conflicts preserved.'
    where id = v_src and latest_rights_review_id is distinct from v_review;
  end loop;
  update public.boxing_sources set rights_note = 'NOT LICENSED (owner decision 2026-09-14): no crawling, downloading or automated collection until written WBC permission exists; no workaround through search engines, mirrors or copies.'
  where source_key = 'wbc_official' and access_mode <> 'approved_ingest';
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Organization-native vocabulary
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.boxing_org_divisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  gender_scope text not null default 'male' check (gender_scope in ('male','female')),
  native_label text not null,
  weight_class_id uuid references public.boxing_weight_classes(id) on delete restrict,
  limit_text text,
  review_state text not null default 'seeded' check (review_state in ('seeded','pending_review')),
  first_seen_at timestamptz not null default now(),
  unique (organization_id, gender_scope, native_label),
  check (weight_class_id is not null or review_state = 'pending_review')
);

create table if not exists public.boxing_org_designations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  native_label text not null,
  normalized_label text not null,
  tier text check (tier is null or tier in ('world','super','regular','interim','franchise','silver','diamond','gold','emeritus','regional','other')),
  holder_status text not null check (holder_status in ('champion','in_recess','unknown')),
  honorific text,
  review_state text not null default 'seeded' check (review_state in ('seeded','pending_review')),
  first_seen_at timestamptz not null default now(),
  unique (organization_id, normalized_label),
  check (review_state = 'pending_review' or holder_status <> 'unknown')
);

-- ---------------------------------------------------------------------------------------------------------------------
-- Title status observations
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.boxing_title_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  org_division_id uuid not null references public.boxing_org_divisions(id) on delete restrict,
  weight_class_id uuid references public.boxing_weight_classes(id) on delete restrict,
  gender_scope text not null check (gender_scope in ('male','female')),
  document_kind text not null check (document_kind in ('wba_ranking','wba_champions','ibf_rating','wbo_ratings','wbo_champions')),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text not null,
  published_on date,
  as_of date,
  as_of_label text,
  retrieved_at timestamptz not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  document_sha256 text check (document_sha256 is null or document_sha256 ~ '^[0-9a-f]{64}$'),
  parser_version text not null,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict,
  previous_snapshot_id uuid references public.boxing_title_status_snapshots(id) on delete restrict,
  captured_at timestamptz not null default now(),
  unique (organization_id, org_division_id, gender_scope, document_kind, content_hash)
);
create index if not exists boxing_title_status_snapshots_key on public.boxing_title_status_snapshots (organization_id, weight_class_id, gender_scope, document_kind, coalesce(as_of, published_on) desc, captured_at desc);

create table if not exists public.boxing_title_status_entries (
  snapshot_id uuid not null references public.boxing_title_status_snapshots(id) on delete restrict,
  seq smallint not null check (seq >= 1),
  designation_id uuid references public.boxing_org_designations(id) on delete restrict,
  designation_native text,
  tier text,
  holder_status text not null check (holder_status in ('held','vacant','in_recess','unknown')),
  honorific text,
  holder_source_name text,
  holder_country text,
  holder_org_boxer_id text,
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  identity_state text not null check (identity_state in ('resolved','held','not_applicable')),
  reign_start_on date,
  reign_start_basis text,
  last_defense_on date,
  previous_holder_as_printed text,
  ignored_fields jsonb,
  primary key (snapshot_id, seq),
  check ((holder_status = 'vacant') = (holder_source_name is null)),
  check (holder_status <> 'vacant' or identity_state = 'not_applicable'),
  check (identity_state <> 'resolved' or fighter_id is not null),
  check (reign_start_on is null or reign_start_basis is not null)
);

create table if not exists public.boxing_title_mandatory_statements (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.boxing_title_status_snapshots(id) on delete restrict,
  entry_seq smallint not null,
  kind text not null check (kind in ('mandatory','eliminator')),
  as_printed text,
  challenger_source_name text,
  challenger_fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  status_as_printed text,
  due_on date,
  basis text not null,
  created_at timestamptz not null default now(),
  foreign key (snapshot_id, entry_seq) references public.boxing_title_status_entries(snapshot_id, seq) on delete restrict,
  check (as_printed is not null or due_on is not null),
  -- a due date alone never names a challenger
  check (challenger_source_name is null or as_printed is not null)
);

create table if not exists public.boxing_title_claims (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.boxing_title_status_snapshots(id) on delete restrict,
  about_organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  claimed_holder_source_name text,
  claimed_vacant boolean not null default false,
  claimed_blank boolean not null default false,
  native_text text not null,
  location_in_document text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(claimed_holder_source_name) + claimed_vacant::int + claimed_blank::int = 1)
);

create table if not exists public.boxing_title_conflicts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  weight_class_id uuid references public.boxing_weight_classes(id) on delete restrict,
  gender_scope text not null,
  belt_key text not null,
  left_snapshot_id uuid not null references public.boxing_title_status_snapshots(id) on delete restrict,
  right_snapshot_id uuid not null references public.boxing_title_status_snapshots(id) on delete restrict,
  left_value text,
  right_value text,
  same_surname boolean not null default false,
  detected_at timestamptz not null default now(),
  unique (left_snapshot_id, right_snapshot_id, belt_key),
  check (left_snapshot_id <> right_snapshot_id)
);

create table if not exists public.boxing_title_snapshot_diffs (
  id uuid primary key default gen_random_uuid(),
  previous_snapshot_id uuid not null references public.boxing_title_status_snapshots(id) on delete restrict,
  current_snapshot_id uuid not null references public.boxing_title_status_snapshots(id) on delete restrict,
  title_changes jsonb not null default '[]'::jsonb,
  ranking_changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (previous_snapshot_id, current_snapshot_id),
  check (previous_snapshot_id <> current_snapshot_id)
);

create table if not exists public.boxing_title_event_proposals (
  id uuid primary key default gen_random_uuid(),
  diff_id uuid not null references public.boxing_title_snapshot_diffs(id) on delete restrict,
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  weight_class_id uuid references public.boxing_weight_classes(id) on delete restrict,
  gender_scope text not null,
  tier text,
  change_type text not null check (change_type in ('became_vacant','filled','holder_changed','belt_listed','belt_no_longer_listed')),
  previous_holder_source_name text,
  holder_source_name text,
  holder_fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  reign_start_on date,
  reign_start_basis text,
  -- never inferred: only an official statement fills this
  cause_as_stated text,
  cause_source_url text,
  created_at timestamptz not null default now(),
  unique (diff_id, tier, change_type),
  check (cause_as_stated is null or cause_source_url is not null)
);

create table if not exists public.boxing_title_event_proposal_decisions (
  seq bigint generated always as identity primary key,
  proposal_id uuid not null references public.boxing_title_event_proposals(id) on delete restrict,
  decision text not null check (decision in ('confirmed_by_review','rejected_by_review','auto_confirmed')),
  decided_by text not null,
  reviewer text,
  review_note text,
  commission_bout_id uuid references public.boxing_bouts(id) on delete restrict,
  confirming_snapshot_id uuid references public.boxing_title_status_snapshots(id) on delete restrict,
  title_event_id uuid references public.boxing_title_events(id) on delete restrict,
  evidence jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  check (decision <> 'auto_confirmed' or (commission_bout_id is not null and confirming_snapshot_id is not null and decided_by like 'rule:%')),
  check (decision = 'auto_confirmed' or (reviewer is not null and length(btrim(coalesce(review_note, ''))) >= 20
         and reviewer !~* '(resolver|claude|gpt|openai|anthropic|\mbot\M|automat|script|system)'))
);

-- ---------------------------------------------------------------------------------------------------------------------
-- Identity: names held for review; only reviewed org ids resolve
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.boxing_org_identity_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  source_name text not null,
  normalized_name text not null,
  country text,
  org_boxer_id text,
  first_seen_snapshot_kind text not null,
  first_seen_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, normalized_name, country, org_boxer_id)
);

create table if not exists public.boxing_org_identity_decisions (
  seq bigint generated always as identity primary key,
  review_id uuid not null references public.boxing_org_identity_reviews(id) on delete restrict,
  decision text not null check (decision in ('matched','distinct','hold')),
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  reviewer text not null,
  review_note text not null,
  evidence jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  check ((decision = 'matched') = (fighter_id is not null)),
  check (length(btrim(review_note)) >= 20),
  check (reviewer !~* '(resolver|claude|gpt|openai|anthropic|\mbot\M|automat|script|system)')
);

create table if not exists public.boxing_source_backfill_checkpoints (
  source_key text not null,
  job_key text not null,
  cursor jsonb not null default '{}'::jsonb,
  completed jsonb not null default '[]'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (source_key, job_key)
);
-- explicit, so a rerun of the whole chain (where 0003's updated_at sweep now sees this table) changes nothing
drop trigger if exists boxing_source_backfill_checkpoints_touch on public.boxing_source_backfill_checkpoints;
create trigger boxing_source_backfill_checkpoints_touch before update on public.boxing_source_backfill_checkpoints
  for each row execute function public.boxing_touch_updated_at();

select public.boxing_install_append_only('public.boxing_title_status_snapshots');
select public.boxing_install_append_only('public.boxing_title_status_entries');
select public.boxing_install_append_only('public.boxing_title_mandatory_statements');
select public.boxing_install_append_only('public.boxing_title_claims');
select public.boxing_install_append_only('public.boxing_title_conflicts');
select public.boxing_install_append_only('public.boxing_title_snapshot_diffs');
select public.boxing_install_append_only('public.boxing_title_event_proposals');
select public.boxing_install_append_only('public.boxing_title_event_proposal_decisions');
select public.boxing_install_append_only('public.boxing_org_identity_decisions');

-- ---------------------------------------------------------------------------------------------------------------------
-- Seed vocabulary (as published, checked 2026-09-14)
-- ---------------------------------------------------------------------------------------------------------------------

insert into public.boxing_org_designations (organization_id, native_label, normalized_label, tier, holder_status, honorific)
select o.id, v.label, upper(regexp_replace(btrim(v.label), '\s+', ' ', 'g')), v.tier, v.status, v.honorific
from (values
  ('wba', 'WBA SUPER CHAMPION', 'super', 'champion', null), ('wba', 'WBA Super World', 'super', 'champion', null),
  ('wba', 'WBA WORLD CHAMPION', 'regular', 'champion', null), ('wba', 'WBA World', 'regular', 'champion', null),
  ('wba', 'WBA INTERIM CHAMPION', 'interim', 'champion', null), ('wba', 'Interim WBA', 'interim', 'champion', null),
  ('wba', 'WBA Gold', 'gold', 'champion', null), ('wba', 'Champion in recess', null, 'in_recess', null),
  ('ibf', 'CHAMPION', 'world', 'champion', null), ('ibf', 'INTERIM CHAMPION', 'interim', 'champion', null),
  ('wbo', 'CHAMPION', 'world', 'champion', null), ('wbo', 'INTERIM', 'interim', 'champion', null), ('wbo', 'INTERIM CHAMPION', 'interim', 'champion', null),
  ('wbo', 'Sup. Champion', 'world', 'champion', 'super_champion'), ('wbo', 'Super Champion', 'world', 'champion', 'super_champion')
) as v(org, label, tier, status, honorific)
join public.boxing_organizations o on o.slug = v.org
on conflict (organization_id, normalized_label) do nothing;

insert into public.boxing_org_divisions (organization_id, gender_scope, native_label, weight_class_id)
select o.id, 'male', v.label, wc.id
from (values
  ('wba','HEAVYWEIGHT','heavyweight'), ('wba','BRIDGERWEIGHT','bridgerweight'), ('wba','CRUISERWEIGHT','cruiserweight'), ('wba','LIGHT HEAVYWEIGHT','light_heavyweight'),
  ('wba','SUPER MIDDLEWEIGHT','super_middleweight'), ('wba','MIDDLEWEIGHT','middleweight'), ('wba','SUPER WELTERWEIGHT','super_welterweight'), ('wba','WELTERWEIGHT','welterweight'),
  ('wba','SUPER LIGHTWEIGHT','super_lightweight'), ('wba','LIGHTWEIGHT','lightweight'), ('wba','SUPER FEATHERWEIGHT','super_featherweight'), ('wba','FEATHERWEIGHT','featherweight'),
  ('wba','SUPER BANTAMWEIGHT','super_bantamweight'), ('wba','BANTAMWEIGHT','bantamweight'), ('wba','SUPER FLYWEIGHT','super_flyweight'), ('wba','FLYWEIGHT','flyweight'),
  ('wba','LIGHT FLYWEIGHT','light_flyweight'), ('wba','MINIMUMWEIGHT','minimumweight'),
  ('ibf','heavyweight','heavyweight'), ('ibf','cruiserweight','cruiserweight'), ('ibf','light-heavyweight','light_heavyweight'), ('ibf','super-middleweight','super_middleweight'),
  ('ibf','middleweight','middleweight'), ('ibf','jr-middleweight','super_welterweight'), ('ibf','welterweight','welterweight'), ('ibf','jr-welterweight','super_lightweight'),
  ('ibf','lightweight','lightweight'), ('ibf','jr-lightweight','super_featherweight'), ('ibf','featherweight','featherweight'), ('ibf','jr-featherweight','super_bantamweight'),
  ('ibf','bantamweight','bantamweight'), ('ibf','jr-bantamweight','super_flyweight'), ('ibf','flyweight','flyweight'), ('ibf','jr-flyweight','light_flyweight'), ('ibf','minimumweight','minimumweight'),
  ('wbo','HEAVYWEIGHT','heavyweight'), ('wbo','JR. HEAVYWEIGHT','cruiserweight'), ('wbo','LT. HEAVYWEIGHT','light_heavyweight'), ('wbo','SUP. MIDDLEWEIGHT','super_middleweight'),
  ('wbo','MIDDLEWEIGHT','middleweight'), ('wbo','JR. MIDDLEWEIGHT','super_welterweight'), ('wbo','WELTERWEIGHT','welterweight'), ('wbo','JR. WELTERWEIGHT','super_lightweight'),
  ('wbo','LIGHTWEIGHT','lightweight'), ('wbo','JR. LIGHTWEIGHT','super_featherweight'), ('wbo','FEATHERWEIGHT','featherweight'), ('wbo','JR. FEATHERWEIGHT','super_bantamweight'),
  ('wbo','BANTAMWEIGHT','bantamweight'), ('wbo','JR. BANTAMWEIGHT','super_flyweight'), ('wbo','FLYWEIGHT','flyweight'), ('wbo','JR. FLYWEIGHT','light_flyweight'),
  ('wbo','MINI-FLYWEIGHT','minimumweight'), ('wbo','MINIMUMWEIGHT','minimumweight')
) as v(org, label, class_key)
join public.boxing_organizations o on o.slug = v.org
join public.boxing_weight_classes wc on wc.class_key = v.class_key
on conflict (organization_id, gender_scope, native_label) do nothing;

-- ---------------------------------------------------------------------------------------------------------------------
-- Write path
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.boxing_title_source_gate(p_source_key text, p_org_slug text)
returns uuid language plpgsql stable set search_path = '' as $$
declare v public.boxing_sources%rowtype;
begin
  select * into v from public.boxing_sources where source_key = p_source_key;
  if v.id is null then raise exception 'source_not_registered: %', p_source_key using errcode = 'BX010'; end if;
  if v.source_key <> p_org_slug || '_official' then raise exception 'source_org_mismatch: % for %', p_source_key, p_org_slug using errcode = 'BX010'; end if;
  if not (v.enabled and v.access_mode = 'approved_ingest' and v.persistence_allowed and v.latest_rights_review_id is not null) then
    raise exception 'source_not_approved: %', p_source_key using errcode = 'BX010';
  end if;
  return v.id;
end $$;

-- One normalized statement document. Idempotent by content hash. Unknown division/designation labels are recorded for
-- review and the document is refused (fail closed) until reviewed.
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
      case when e ->> 'holder_status' = 'vacant' then 'not_applicable' when nullif(e ->> 'fighter_id', '') is not null then 'resolved' else 'held' end,
      nullif(e ->> 'reign_start_on', '')::date, e ->> 'reign_start_basis', nullif(e ->> 'last_defense_on', '')::date, e ->> 'previous_holder_as_printed', e -> 'ignored_fields');
    if e ->> 'holder_status' <> 'vacant' and nullif(e ->> 'fighter_id', '') is null then
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

-- Diff between two snapshots of the same key, with proposals; conflicts between two documents of the same body.
create or replace function public.boxing_record_title_analysis(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_diff uuid;
  v_cur public.boxing_title_status_snapshots%rowtype;
  ch jsonb;
  cf jsonb;
  v_props int := 0;
  v_conf int := 0;
begin
  select * into v_cur from public.boxing_title_status_snapshots where id = (p ->> 'current_snapshot_id')::uuid;
  if v_cur.id is null then raise exception 'unknown snapshot' using errcode = 'BX070'; end if;
  if nullif(p ->> 'previous_snapshot_id', '') is not null then
    insert into public.boxing_title_snapshot_diffs (previous_snapshot_id, current_snapshot_id, title_changes, ranking_changes)
    values ((p ->> 'previous_snapshot_id')::uuid, v_cur.id, coalesce(p -> 'title_changes', '[]'::jsonb), coalesce(p -> 'ranking_changes', '[]'::jsonb))
    on conflict (previous_snapshot_id, current_snapshot_id) do nothing returning id into v_diff;
    if v_diff is not null then
      for ch in select * from jsonb_array_elements(coalesce(p -> 'title_changes', '[]'::jsonb)) loop
        insert into public.boxing_title_event_proposals (diff_id, organization_id, weight_class_id, gender_scope, tier, change_type, previous_holder_source_name,
          holder_source_name, holder_fighter_id, reign_start_on, reign_start_basis)
        values (v_diff, v_cur.organization_id, v_cur.weight_class_id, v_cur.gender_scope, ch ->> 'tier', ch ->> 'type', ch ->> 'previous_holder', ch ->> 'holder',
          nullif(ch ->> 'holder_fighter_id', '')::uuid, nullif(ch #>> '{reign_start,on}', '')::date, ch #>> '{reign_start,basis}')
        on conflict (diff_id, tier, change_type) do nothing;
        v_props := v_props + 1;
      end loop;
    end if;
  end if;
  for cf in select * from jsonb_array_elements(coalesce(p -> 'conflicts', '[]'::jsonb)) loop
    insert into public.boxing_title_conflicts (organization_id, weight_class_id, gender_scope, belt_key, left_snapshot_id, right_snapshot_id, left_value, right_value, same_surname)
    values (v_cur.organization_id, v_cur.weight_class_id, v_cur.gender_scope, cf ->> 'belt', (cf ->> 'left_snapshot_id')::uuid, (cf ->> 'right_snapshot_id')::uuid,
      cf ->> 'left_value', cf ->> 'right_value', coalesce((cf ->> 'same_surname')::boolean, false))
    on conflict (left_snapshot_id, right_snapshot_id, belt_key) do nothing;
    v_conf := v_conf + 1;
  end loop;
  return jsonb_build_object('diff_id', v_diff, 'proposals', v_props, 'conflicts', v_conf);
end $$;

-- Human review of a proposal (append-only; the title event itself is recorded separately through boxing_record_title_event).
create or replace function public.boxing_decide_title_event_proposal(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare v_seq bigint;
begin
  if p ->> 'decision' = 'auto_confirmed' then
    raise exception 'auto confirmation goes through boxing_auto_confirm_title_event_proposal' using errcode = '22023';
  end if;
  insert into public.boxing_title_event_proposal_decisions (proposal_id, decision, decided_by, reviewer, review_note, title_event_id, evidence)
  values ((p ->> 'proposal_id')::uuid, p ->> 'decision', 'reviewer:' || (p ->> 'reviewer'), p ->> 'reviewer', p ->> 'review_note',
    nullif(p ->> 'title_event_id', '')::uuid, coalesce(p -> 'evidence', '{}'::jsonb))
  returning seq into v_seq;
  return jsonb_build_object('status', 'recorded', 'seq', v_seq);
end $$;

-- Automatic confirmation needs BOTH an official commission result for a bout contesting this body's belt with the
-- proposed holder as the winner, AND a later snapshot of the same body that still states that holder. Otherwise refused.
create or replace function public.boxing_auto_confirm_title_event_proposal(p_proposal uuid, p_commission_bout uuid, p_confirming_snapshot uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  pr public.boxing_title_event_proposals%rowtype;
  v_ok_bout boolean;
  v_ok_snap boolean;
  v_seq bigint;
begin
  select * into pr from public.boxing_title_event_proposals where id = p_proposal;
  if pr.id is null or pr.change_type not in ('filled','holder_changed') or pr.holder_fighter_id is null then
    raise exception 'proposal cannot be auto-confirmed (needs a filled/holder_changed proposal with a resolved holder)' using errcode = '22023';
  end if;
  select exists (select 1 from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id
                 join public.boxing_bout_results_current r on r.bout_id = bt.bout_id
                 join public.boxing_sources s on s.id = r.source_id and s.source_kind = 'commission'
                 where bt.bout_id = p_commission_bout and t.organization_id = pr.organization_id and t.weight_class_id = pr.weight_class_id
                   and r.outcome = 'win' and r.winner_id = pr.holder_fighter_id) into v_ok_bout;
  select exists (select 1 from public.boxing_title_status_snapshots s join public.boxing_title_status_entries e on e.snapshot_id = s.id
                 join public.boxing_title_snapshot_diffs d on d.id = pr.diff_id
                 where s.id = p_confirming_snapshot and s.organization_id = pr.organization_id and s.weight_class_id = pr.weight_class_id
                   and s.captured_at >= (select captured_at from public.boxing_title_status_snapshots where id = d.current_snapshot_id)
                   and e.tier is not distinct from pr.tier and e.holder_status = 'held' and e.fighter_id = pr.holder_fighter_id) into v_ok_snap;
  if not (v_ok_bout and v_ok_snap) then
    return jsonb_build_object('status', 'refused', 'commission_result_confirms', v_ok_bout, 'body_snapshot_confirms', v_ok_snap, 'next', 'human_review');
  end if;
  insert into public.boxing_title_event_proposal_decisions (proposal_id, decision, decided_by, commission_bout_id, confirming_snapshot_id, evidence)
  values (p_proposal, 'auto_confirmed', 'rule:commission_result_plus_body_snapshot@1', p_commission_bout, p_confirming_snapshot,
    jsonb_build_object('rule', 'commission_result_plus_body_snapshot@1'))
  returning seq into v_seq;
  return jsonb_build_object('status', 'auto_confirmed', 'seq', v_seq);
end $$;

-- Reviewed org boxer ids / names that resolve; everything else stays held.
create or replace function public.boxing_org_identity_resolution(p_org_slug text, p_normalized_name text, p_country text, p_org_boxer_id text)
returns uuid language sql stable set search_path = '' as $$
  select d.fighter_id from public.boxing_org_identity_reviews r
  join public.boxing_organizations o on o.id = r.organization_id and o.slug = p_org_slug
  join lateral (select * from public.boxing_org_identity_decisions x where x.review_id = r.id order by x.seq desc limit 1) d on true
  where d.decision = 'matched'
    and ((p_org_boxer_id is not null and r.org_boxer_id = p_org_boxer_id)
      or (p_org_boxer_id is null and r.org_boxer_id is null and r.normalized_name = p_normalized_name and r.country is not distinct from p_country))
  limit 1
$$;

-- A ranked name without a reviewed identity: held for review (one row per org + name + country + org boxer id).
create or replace function public.boxing_hold_org_identity(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  select id into v_org from public.boxing_organizations where slug = p ->> 'organization_slug';
  if v_org is null then raise exception 'unknown organization' using errcode = 'BX070'; end if;
  insert into public.boxing_org_identity_reviews (organization_id, source_name, normalized_name, country, org_boxer_id, first_seen_snapshot_kind)
  values (v_org, p ->> 'source_name', p ->> 'normalized_name', nullif(p ->> 'country', ''), nullif(p ->> 'org_boxer_id', ''), p ->> 'document_kind')
  on conflict do nothing returning id into v_id;
  return jsonb_build_object('created', v_id is not null);
end $$;

-- Latest stored snapshot of one org/division/document kind on or before a date (optionally excluding one snapshot).
create or replace function public.boxing_latest_title_snapshot(p_org_slug text, p_weight_class_key text, p_gender text, p_kind text, p_on_or_before date default null, p_exclude uuid default null)
returns uuid language sql stable set search_path = '' as $$
  select s.id from public.boxing_title_status_snapshots s
  join public.boxing_organizations o on o.id = s.organization_id and o.slug = p_org_slug
  join public.boxing_weight_classes wc on wc.id = s.weight_class_id and wc.class_key = p_weight_class_key
  where s.gender_scope = p_gender and s.document_kind = p_kind and s.id is distinct from p_exclude
    and (p_on_or_before is null or coalesce(s.as_of, s.published_on) <= p_on_or_before)
  order by coalesce(s.as_of, s.published_on) desc, s.captured_at desc limit 1
$$;

create or replace function public.boxing_backfill_checkpoint(p_source_key text, p_job_key text, p_cursor jsonb default null, p_completed text default null, p_failure jsonb default null)
returns jsonb language plpgsql set search_path = '' as $$
declare v public.boxing_source_backfill_checkpoints%rowtype;
begin
  insert into public.boxing_source_backfill_checkpoints (source_key, job_key) values (p_source_key, p_job_key) on conflict do nothing;
  update public.boxing_source_backfill_checkpoints set
    cursor = coalesce(p_cursor, cursor),
    completed = case when p_completed is null or completed ? p_completed then completed else completed || to_jsonb(p_completed) end,
    failures = case when p_failure is null then failures else failures || p_failure end,
    updated_at = now()
  where source_key = p_source_key and job_key = p_job_key
  returning * into v;
  return to_jsonb(v);
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Read models (site)
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.boxing_title_snapshot_json(p_snapshot uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('document_kind', s.document_kind, 'source_url', s.source_url, 'published_on', s.published_on, 'as_of', s.as_of,
    'as_of_label', s.as_of_label, 'retrieved_at', s.retrieved_at, 'division_native_label', d.native_label, 'division_limit_text', d.limit_text,
    'belts', (select coalesce(jsonb_agg(jsonb_build_object('designation', e.designation_native, 'tier', e.tier, 'status', e.holder_status, 'honorific', e.honorific,
        'holder', case when e.holder_status = 'vacant' then null else jsonb_build_object('name', e.holder_source_name, 'country', e.holder_country,
          'fighter', f.public_id, 'display_name', f.display_name, 'identity_state', e.identity_state) end,
        'reign_start', case when e.reign_start_on is null then null else jsonb_build_object('on', e.reign_start_on, 'basis', e.reign_start_basis) end,
        'last_defense_on', e.last_defense_on,
        'mandatory', (select jsonb_build_object('as_printed', m.as_printed, 'challenger', m.challenger_source_name, 'status_as_printed', m.status_as_printed, 'due_on', m.due_on, 'basis', m.basis)
                      from public.boxing_title_mandatory_statements m where m.snapshot_id = e.snapshot_id and m.entry_seq = e.seq and m.kind = 'mandatory' limit 1))
        order by e.seq), '[]'::jsonb)
      from public.boxing_title_status_entries e left join public.boxing_fighters f on f.id = e.fighter_id where e.snapshot_id = s.id),
    'claims', (select coalesce(jsonb_agg(jsonb_build_object('about', ao.slug, 'says', case when c.claimed_vacant then 'VACANT' when c.claimed_blank then null else c.claimed_holder_source_name end,
        'blank', c.claimed_blank, 'native_text', c.native_text) order by ao.slug), '[]'::jsonb)
      from public.boxing_title_claims c join public.boxing_organizations ao on ao.id = c.about_organization_id where c.snapshot_id = s.id))
  from public.boxing_title_status_snapshots s join public.boxing_org_divisions d on d.id = s.org_division_id
  where s.id = p_snapshot
$$;

create or replace function public.boxing_site_title_lanes(p_weight_class_key text, p_gender text default 'male')
returns jsonb language sql stable set search_path = '' as $$
  with wc as (select id, class_key, name, max_weight_lb from public.boxing_weight_classes where class_key = p_weight_class_key),
  orgs as (select o.id, o.slug, o.short_name, o.name, src.access_mode, src.enabled, src.rights_note
           from public.boxing_organizations o left join public.boxing_sources src on src.source_key = o.slug || '_official'
           where o.slug in ('wbc','wba','ibf','wbo')),
  latest as (
    select distinct on (s.organization_id, s.document_kind) s.*
    from public.boxing_title_status_snapshots s
    where s.weight_class_id = (select id from wc) and s.gender_scope = p_gender
    order by s.organization_id, s.document_kind, coalesce(s.as_of, s.published_on) desc, s.captured_at desc)
  select jsonb_build_object(
    'division', (select jsonb_build_object('class_key', class_key, 'name', name, 'max_lb', max_weight_lb) from wc),
    'lanes', (select jsonb_agg(jsonb_build_object(
        'body', o.slug, 'short_name', o.short_name, 'name', o.name,
        'state', case when not (coalesce(o.enabled, false) and o.access_mode = 'approved_ingest') then 'not_licensed'
                      when exists (select 1 from latest l where l.organization_id = o.id) then 'current' else 'no_snapshot' end,
        'note', case when not (coalesce(o.enabled, false) and o.access_mode = 'approved_ingest') then 'Source not licensed: no ' || o.short_name || ' standings are collected or shown.' end,
        'documents', (select coalesce(jsonb_agg(public.boxing_title_snapshot_json(l.id) order by l.document_kind), '[]'::jsonb) from latest l where l.organization_id = o.id),
        -- identical content is stored once, so a snapshot's retrieved_at is when it first appeared; the lane's freshness
        -- is the body's latest current-mode collection run
        'freshness', (select jsonb_build_object('last_run_at', r.finished_at, 'last_run_status', r.status,
                        'last_ok_at', (select max(k.finished_at) from public.boxing_ingest_runs k where k.worker = 'boxing-rankings' and k.source_id = r.source_id
                                         and k.status in ('ok','partial') and coalesce(k.metrics ->> 'mode', 'current') = 'current'))
                      from public.boxing_ingest_runs r join public.boxing_sources rs on rs.id = r.source_id
                      where r.worker = 'boxing-rankings' and rs.source_key = o.slug || '_official' and r.finished_at is not null and coalesce(r.metrics ->> 'mode', 'current') = 'current'
                      order by r.finished_at desc limit 1),
        'conflicts_within_body', (select coalesce(jsonb_agg(distinct jsonb_build_object('belt', c.belt_key, 'left_document', ls.document_kind, 'left', c.left_value,
                                    'right_document', rs.document_kind, 'right', c.right_value, 'same_surname', c.same_surname)), '[]'::jsonb)
                                  from public.boxing_title_conflicts c
                                  join public.boxing_title_status_snapshots ls on ls.id = c.left_snapshot_id
                                  join public.boxing_title_status_snapshots rs on rs.id = c.right_snapshot_id
                                  where c.left_snapshot_id in (select id from latest) and c.right_snapshot_id in (select id from latest) and c.organization_id = o.id),
        'claims_by_other_bodies', (select coalesce(jsonb_agg(jsonb_build_object('by', co.slug, 'document_kind', l.document_kind, 'as_of', coalesce(l.as_of, l.published_on),
                                     'says', case when c.claimed_vacant then 'VACANT' when c.claimed_blank then null else c.claimed_holder_source_name end, 'blank', c.claimed_blank, 'native_text', c.native_text)
                                     order by co.slug, l.document_kind), '[]'::jsonb)
                                   from public.boxing_title_claims c join latest l on l.id = c.snapshot_id join public.boxing_organizations co on co.id = l.organization_id
                                   where c.about_organization_id = o.id))
        order by array_position(array['wbc','wba','ibf','wbo'], o.slug)) from orgs o),
    'derived', jsonb_build_object('rule', 'pbe_undisputed@1', 'label', 'PropBetEdge-derived from each body''s own title holdings; not a sanctioning-body designation',
      'status', case when exists (select 1 from orgs where not (coalesce(enabled, false) and access_mode = 'approved_ingest')) then 'not_derivable' else 'pending_complete_holdings' end,
      'reason', (select 'own statement unavailable (not licensed): ' || string_agg(short_name, ', ') from orgs where not (coalesce(enabled, false) and access_mode = 'approved_ingest'))))
$$;

create or replace function public.boxing_site_body_rankings(p_org_slug text, p_weight_class_key text, p_gender text default 'male', p_as_of date default null)
returns jsonb language sql stable set search_path = '' as $$
  with o as (select o.id, o.slug, o.short_name, src.access_mode, src.enabled from public.boxing_organizations o
             left join public.boxing_sources src on src.source_key = o.slug || '_official' where o.slug = p_org_slug),
  wc as (select id from public.boxing_weight_classes where class_key = p_weight_class_key),
  snap as (select public.boxing_ranking_snapshot_as_of((select id from o), (select id from wc), p_gender, coalesce(p_as_of, current_date)) as id)
  select case when not exists (select 1 from o where coalesce(enabled, false) and access_mode = 'approved_ingest')
    then jsonb_build_object('organization', p_org_slug, 'state', 'not_licensed')
    else jsonb_build_object('organization', p_org_slug, 'state', case when (select id from snap) is null then 'no_snapshot' else 'current' end,
      'snapshot', public.boxing_ranking_entries_json((select id from snap)),
      'source_record', (select source_record from public.boxing_ranking_snapshots where id = (select id from snap)),
      'previous', public.boxing_ranking_entries_json(public.boxing_ranking_snapshot_as_of((select id from o), (select id from wc), p_gender, coalesce(p_as_of, current_date), (select id from snap))),
      'champions', (select public.boxing_title_snapshot_json(s.id) from public.boxing_title_status_snapshots s
                    where s.organization_id = (select id from o) and s.weight_class_id = (select id from wc) and s.gender_scope = p_gender
                      and s.document_kind in ('wba_ranking','ibf_rating','wbo_ratings') and coalesce(s.as_of, s.published_on) <= coalesce(p_as_of, current_date)
                    order by coalesce(s.as_of, s.published_on) desc, s.captured_at desc limit 1),
      'history', (select coalesce(jsonb_agg(jsonb_build_object('published_on', r.published_on, 'effective_on', r.effective_on) order by coalesce(r.effective_on, r.published_on) desc), '[]'::jsonb)
                  from public.boxing_ranking_snapshots r where r.organization_id = (select id from o) and r.weight_class_id = (select id from wc) and r.gender_scope = p_gender
                    and not exists (select 1 from public.boxing_ranking_snapshots n where n.supersedes_id = r.id)))
  end
$$;

-- With monthly history stored, the board lists each body/division's latest document and its stored count instead of
-- every snapshot (the full list would be thousands of rows on every rankings page).
create or replace function public.boxing_site_ranking_board()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'organizations', public.boxing_site_sanctioning_bodies(),
    'divisions', (select coalesce(jsonb_agg(jsonb_build_object('class_key', wc.class_key, 'name', wc.name, 'max_lb', wc.max_weight_lb, 'gender_scope', wc.gender_scope) order by wc.max_weight_lb nulls last), '[]'::jsonb)
                  from public.boxing_weight_classes wc),
    'snapshots', (select coalesce(jsonb_agg(jsonb_build_object('organization_slug', x.slug, 'class_key', x.class_key, 'published_on', x.published_on, 'effective_on', x.effective_on, 'stored', x.stored)
                    order by x.slug, x.max_weight_lb nulls last), '[]'::jsonb)
                  from (select distinct on (o.slug, wc.class_key) o.slug, wc.class_key, wc.max_weight_lb, r.published_on, r.effective_on,
                               count(*) over (partition by o.slug, wc.class_key) as stored
                        from public.boxing_ranking_snapshots r join public.boxing_organizations o on o.id = r.organization_id join public.boxing_weight_classes wc on wc.id = r.weight_class_id
                        order by o.slug, wc.class_key, coalesce(r.effective_on, r.published_on) desc nulls last) x))
$$;

select public.boxing_lockdown();

commit;
