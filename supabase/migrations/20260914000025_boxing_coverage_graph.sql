-- Coverage graph foundation: promotions as canonical brands, people beyond fighters, organization logos,
-- executive portraits, Hall of Fame inductions, historical assets, venue aliases, event distribution
-- (how to watch) and source health.
--
-- Principles (enforced by constraints where a database can enforce them):
--   * sourced facts are append-only claims with provenance, kept apart from canonical display fields
--   * nothing renders without a recorded rights basis: logos need rights/trademark evidence and are used for
--     editorial identification only (never affiliation); portraits need identity + license evidence; historical
--     assets need an evidenced rights basis (age alone is not public domain)
--   * Hall of Fame inductions keep the institution's own category label; PropBetEdge never invents a Hall
--   * appearing on a promotion's card never implies a fighter is signed to it (no such relation exists here)

-- ---------------------------------------------------------------------------
-- Organizations: Halls of Fame and archives become organization kinds
-- ---------------------------------------------------------------------------
alter table public.boxing_organizations drop constraint if exists boxing_organizations_organization_kind_check;
alter table public.boxing_organizations add constraint boxing_organizations_organization_kind_check check (
  organization_kind in ('sanctioning_body','governing_body','promoter','broadcaster','media',
                        'ranking_body','record_keeper','hall_of_fame','archive','other'));

create table if not exists public.boxing_organization_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  alias text not null,
  normalized text not null,
  kind text not null check (kind in ('source_native_listing','legal_name','dba','former_name','short_name','translation')),
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique (organization_id, normalized, kind)
);
create index if not exists boxing_organization_aliases_normalized_idx on public.boxing_organization_aliases (normalized);
select public.boxing_install_append_only('public.boxing_organization_aliases');

-- founded_on, founder, headquarters, official_site, status, active_from/to, ... as sourced claims.
create table if not exists public.boxing_organization_facts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  attribute text not null check (attribute in ('founded_on','dissolved_on','headquarters','home_market','official_site',
    'official_youtube_channel','status','active_from','active_to','country','wikidata_qid','description_source_native')),
  value_text text,
  value_date date,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text not null check (source_url ~ '^https://'),
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  confidence smallint not null default 80 check (confidence between 0 and 100),
  recorded_at timestamptz not null default now(),
  check (value_text is not null or value_date is not null)
);
select public.boxing_install_append_only('public.boxing_organization_facts');

create table if not exists public.boxing_organization_relations (
  id uuid primary key default gen_random_uuid(),
  from_organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  to_organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  relation text not null check (relation in ('predecessor_of','successor_of','subsidiary_of','doing_business_as','partner_broadcaster_of','co_promoted_with')),
  valid_from date,
  valid_to date,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text not null check (source_url ~ '^https://'),
  evidence text not null check (length(evidence) >= 20),
  recorded_at timestamptz not null default now(),
  check (from_organization_id <> to_organization_id)
);
select public.boxing_install_append_only('public.boxing_organization_relations');

-- Logos are NOT photographs: trademark identification for editorial use only.
create table if not exists public.boxing_organization_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  asset_type text not null check (asset_type in ('primary_logo','alternate_logo','wordmark','historic_logo')),
  source_page_url text not null check (source_page_url ~ '^https://'),
  source_asset_url text not null check (source_asset_url ~ '^https://'),
  source_organization text,
  file_type text,
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  discovered_at timestamptz not null default now(),
  rights_basis text not null check (rights_basis in ('press_kit_terms','site_terms_permit_reuse','commons_free_or_pd_textlogo','permission','unresolved')),
  rights_evidence text not null default '',
  trademark_note text not null default 'Trademark of its owner; shown only to identify the organization in editorial coverage. No affiliation or endorsement.',
  intended_usage text not null default 'editorial_identification_not_affiliation' check (intended_usage = 'editorial_identification_not_affiliation'),
  asset_url text check (asset_url is null or asset_url ~ '^/media/'),
  review_state text not null default 'review_required' check (review_state in ('approved_editorial','review_required','permission_requested','permission_granted','rejected')),
  review_rule text,
  reviewer text,
  permission_reference text,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boxing_organization_media_approved_complete check (
    review_state not in ('approved_editorial','permission_granted')
    or (asset_url is not null and rights_basis <> 'unresolved' and length(rights_evidence) >= 20 and (review_rule is not null or reviewer is not null))),
  constraint boxing_organization_media_permission_reference check (review_state <> 'permission_granted' or permission_reference is not null)
);
create unique index if not exists boxing_organization_media_one_approved on public.boxing_organization_media (organization_id, asset_type)
  where review_state in ('approved_editorial','permission_granted');
drop trigger if exists boxing_organization_media_touch on public.boxing_organization_media;
create trigger boxing_organization_media_touch before update on public.boxing_organization_media
  for each row execute function public.boxing_touch_updated_at();

-- ---------------------------------------------------------------------------
-- People beyond fighters (promoters, executives, trainers, managers, referees, judges, journalists)
-- ---------------------------------------------------------------------------
create table if not exists public.boxing_persons (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('pbe_boxperson_' || replace(gen_random_uuid()::text, '-', '')),
  display_name text not null,
  normalized_name text not null,
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  official_id uuid references public.boxing_officials(id) on delete restrict,
  identity_state text not null default 'review_required' check (identity_state in ('verified','source_native','review_required','merged')),
  merged_into_id uuid references public.boxing_persons(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((identity_state = 'merged') = (merged_into_id is not null))
);
create unique index if not exists boxing_persons_one_per_fighter on public.boxing_persons (fighter_id) where fighter_id is not null and merged_into_id is null;
create unique index if not exists boxing_persons_one_per_official on public.boxing_persons (official_id) where official_id is not null and merged_into_id is null;
drop trigger if exists boxing_persons_touch on public.boxing_persons;
create trigger boxing_persons_touch before update on public.boxing_persons for each row execute function public.boxing_touch_updated_at();

create table if not exists public.boxing_person_identities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.boxing_persons(id) on delete restrict,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  namespace text not null,
  external_id text not null,
  external_url text,
  verification_state text not null check (verification_state in ('verified','probable','review','rejected')),
  evidence text not null check (length(evidence) >= 20),
  recorded_at timestamptz not null default now()
);
create unique index if not exists boxing_person_identities_active on public.boxing_person_identities (namespace, external_id) where verification_state <> 'rejected';
select public.boxing_install_append_only('public.boxing_person_identities');

create table if not exists public.boxing_person_roles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.boxing_persons(id) on delete restrict,
  role text not null check (role in ('boxer','promoter','founder','executive','matchmaker','manager','adviser','trainer','referee','judge','broadcaster','journalist','historian','other')),
  role_title_source_native text,
  organization_id uuid references public.boxing_organizations(id) on delete restrict,
  valid_from date,
  valid_to date,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text not null check (source_url ~ '^https://'),
  evidence text not null check (length(evidence) >= 20),
  recorded_at timestamptz not null default now()
);
select public.boxing_install_append_only('public.boxing_person_roles');

create table if not exists public.boxing_person_media (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.boxing_persons(id) on delete restrict,
  kind text not null default 'portrait' check (kind in ('portrait')),
  asset_url text not null check (asset_url ~ '^/media/'),
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  focus text,
  source_kind text not null check (source_kind in ('wikimedia_commons','public_domain_government','licensed_press_kit','permission','owned')),
  source_url text not null check (source_url ~ '^https://'),
  original_url text,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  license text not null,
  license_url text,
  author text not null,
  credit text not null,
  identity_evidence text not null,
  image_identity_evidence text not null,
  usage text not null default 'editorial_identification' check (usage = 'editorial_identification'),
  review_state text not null default 'review_required' check (review_state in ('approved','review_required','permission_requested','permission_granted','permission_denied','rejected')),
  review_rule text,
  review_note text,
  retrieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boxing_person_media_approved_complete check (review_state not in ('approved','permission_granted') or (review_rule is not null and length(identity_evidence) >= 20 and length(image_identity_evidence) >= 10))
);
create unique index if not exists boxing_person_media_one_approved on public.boxing_person_media (person_id, kind) where review_state in ('approved','permission_granted');
drop trigger if exists boxing_person_media_touch on public.boxing_person_media;
create trigger boxing_person_media_touch before update on public.boxing_person_media for each row execute function public.boxing_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Hall of Fame: recognized institutions (organizations of kind hall_of_fame) and their inductions
-- ---------------------------------------------------------------------------
create table if not exists public.boxing_hall_inductions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.boxing_organizations(id) on delete restrict,
  person_id uuid not null references public.boxing_persons(id) on delete restrict,
  induction_year int not null check (induction_year between 1900 and 2100),
  class_label text,
  category_source_label text not null,
  category_key text check (category_key is null or category_key in ('boxer','non_participant','observer','trainer','promoter','manager','referee_judge','pioneer','old_timer','modern','womens','posthumous','other')),
  announced_on date,
  inducted_on date,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text not null check (source_url ~ '^https://'),
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  evidence text not null check (length(evidence) >= 20),
  supersedes_id uuid references public.boxing_hall_inductions(id) on delete restrict,
  recorded_at timestamptz not null default now()
);
create unique index if not exists boxing_hall_inductions_current on public.boxing_hall_inductions (institution_id, person_id, induction_year, category_source_label) where supersedes_id is null;
select public.boxing_install_append_only('public.boxing_hall_inductions');

create or replace function public.boxing_hall_institution_kind_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.boxing_organizations o where o.id = new.institution_id and o.organization_kind = 'hall_of_fame') then
    raise exception 'hall_induction_institution_must_be_a_hall_of_fame_organization' using errcode = 'BX070';
  end if;
  return new;
end $$;
drop trigger if exists boxing_hall_inductions_institution_kind on public.boxing_hall_inductions;
create trigger boxing_hall_inductions_institution_kind before insert on public.boxing_hall_inductions
  for each row execute function public.boxing_hall_institution_kind_guard();

-- ---------------------------------------------------------------------------
-- Historical assets: photos, posters, programs, tickets, newspaper pages, venue photos
-- ---------------------------------------------------------------------------
create table if not exists public.boxing_historical_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('historic_photo','event_poster','program_cover','ticket','newspaper_page','venue_photo')),
  subject_fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  subject_person_id uuid references public.boxing_persons(id) on delete restrict,
  subject_event_id uuid references public.boxing_events(id) on delete restrict,
  subject_bout_id uuid references public.boxing_bouts(id) on delete restrict,
  subject_venue_id uuid references public.boxing_venues(id) on delete restrict,
  subject_note text,
  depicted_date date,
  depicted_date_precision text check (depicted_date_precision is null or depicted_date_precision in ('day','month','year','decade','circa')),
  photographer text,
  archive_name text not null,
  archive_item_url text not null check (archive_item_url ~ '^https://'),
  archive_identifier text,
  original_description text check (original_description is null or length(original_description) <= 500),
  rights_statement text not null,
  rights_statement_url text,
  rights_basis text not null check (rights_basis in ('public_domain_evidenced','no_known_restrictions_statement','free_license','permission','unresolved')),
  original_url text,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  derivative_state text not null default 'none' check (derivative_state in ('none','stored','cropped')),
  asset_url text check (asset_url is null or asset_url ~ '^/media/'),
  identity_evidence text,
  review_state text not null default 'review_required' check (review_state in ('approved','review_required','permission_requested','permission_granted','rejected')),
  review_rule text,
  review_note text,
  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boxing_historical_assets_has_subject check (num_nonnulls(subject_fighter_id, subject_person_id, subject_event_id, subject_bout_id, subject_venue_id) >= 1 or subject_note is not null),
  constraint boxing_historical_assets_approved_complete check (
    review_state not in ('approved','permission_granted')
    or (asset_url is not null and rights_basis <> 'unresolved' and length(rights_statement) >= 10 and review_rule is not null and length(coalesce(identity_evidence, '')) >= 20))
);
drop trigger if exists boxing_historical_assets_touch on public.boxing_historical_assets;
create trigger boxing_historical_assets_touch before update on public.boxing_historical_assets for each row execute function public.boxing_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Venues: aliases so punctuation/name variants never create new venues
-- ---------------------------------------------------------------------------
create table if not exists public.boxing_venue_aliases (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.boxing_venues(id) on delete restrict,
  alias text not null,
  normalized text not null,
  kind text not null check (kind in ('source_native','former_name','sponsor_name','short_name')),
  valid_from date,
  valid_to date,
  source_id uuid references public.boxing_sources(id) on delete restrict,
  source_url text,
  recorded_at timestamptz not null default now(),
  unique (venue_id, normalized, kind)
);
create index if not exists boxing_venue_aliases_normalized_idx on public.boxing_venue_aliases (normalized);
select public.boxing_install_append_only('public.boxing_venue_aliases');

-- ---------------------------------------------------------------------------
-- Event distribution (how to watch): observations, never implied availability
-- ---------------------------------------------------------------------------
create table if not exists public.boxing_event_distribution (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.boxing_events(id) on delete restrict,
  broadcaster_organization_id uuid references public.boxing_organizations(id) on delete restrict,
  platform_name_source_native text not null,
  geography text not null,
  mode text not null check (mode in ('live','replay','delayed','unknown')),
  access text not null default 'unknown' check (access in ('free','subscription','pay_per_view','ticketed_stream','unknown')),
  price_note_source_native text,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text not null check (source_url ~ '^https://'),
  observed_at timestamptz not null,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  supersedes_id uuid references public.boxing_event_distribution(id) on delete restrict,
  recorded_at timestamptz not null default now()
);
select public.boxing_install_append_only('public.boxing_event_distribution');

-- ---------------------------------------------------------------------------
-- Source health (autopilots): last success, last meaningful change, parser version, failures
-- ---------------------------------------------------------------------------
create or replace view public.boxing_source_health with (security_invoker = true) as
select s.source_key, s.source_kind, s.access_mode, s.rights_state, s.enabled,
  (select max(r.started_at) from public.boxing_ingest_runs r where r.source_id = s.id) as last_run_at,
  (select r.status from public.boxing_ingest_runs r where r.source_id = s.id order by r.started_at desc limit 1) as last_run_status,
  (select max(r.started_at) from public.boxing_ingest_runs r where r.source_id = s.id and r.status in ('ok','partial')) as last_success_at,
  (select max(r.started_at) from public.boxing_ingest_runs r where r.source_id = s.id and r.status in ('ok','partial') and r.canonical_writes > 0) as last_meaningful_change_at,
  (select max(d.last_changed_at) from public.boxing_source_documents d where d.source_id = s.id) as last_document_change_at,
  (select count(*) from (select r.status from public.boxing_ingest_runs r where r.source_id = s.id order by r.started_at desc limit 5) x where x.status = 'failed') as failures_last_5_runs,
  (select count(*) from public.boxing_ingest_runs r where r.source_id = s.id and r.trigger_type = 'scheduled') as scheduled_runs,
  (select r.adapter_version from public.boxing_ingest_runs r where r.source_id = s.id order by r.started_at desc limit 1) as last_adapter_version,
  (select count(*) from public.boxing_source_documents d where d.source_id = s.id and d.status = 'error') as documents_in_error
from public.boxing_sources s;

-- ---------------------------------------------------------------------------
-- Video types: the full official-media vocabulary (shared/videos/classify.mjs VIDEO_TYPES)
-- ---------------------------------------------------------------------------
alter table public.boxing_videos drop constraint if exists boxing_videos_video_type_check;
alter table public.boxing_videos add constraint boxing_videos_video_type_check check (video_type in (
  'announcement','trailer_promo','grand_arrival','media_day','open_workout','media_workout','press_conference','interview','faceoff',
  'weigh_in','ceremonial_weigh_in','fight_preview','full_fight','replay','highlights','knockout','post_fight_interview',
  'post_fight_press_conference','analysis','documentary_feature','other'));

-- ---------------------------------------------------------------------------
-- Completeness diagnostics (INTERNAL: never part of boxing_site_* reads). Booleans and counts, no scores.
-- ---------------------------------------------------------------------------
create or replace function public.boxing_fighter_completeness(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  with f as (select public.boxing_canonical_fighter_id(p_fighter) id),
  bouts as (select distinct p.bout_id from f join public.boxing_bout_participants p on public.boxing_canonical_fighter_id(p.fighter_id) = f.id
            join public.boxing_bouts b on b.id = p.bout_id and b.status is distinct from 'cancelled' where p.participant_status in ('scheduled','confirmed'))
  select jsonb_build_object(
    'identity', jsonb_build_object(
      'wikidata', exists (select 1 from f join public.boxing_fighter_identities i on public.boxing_canonical_fighter_id(i.fighter_id) = f.id where i.namespace = 'wikidata.item' and i.verification_state <> 'rejected'),
      'dob_claim', exists (select 1 from f join public.boxing_fighter_attribute_claims c on c.fighter_id = f.id where c.attribute = 'dob'),
      'nationality_claim', exists (select 1 from f join public.boxing_fighter_attribute_claims c on c.fighter_id = f.id where c.attribute = 'nationality'),
      'height_claim', exists (select 1 from f join public.boxing_fighter_attribute_claims c on c.fighter_id = f.id where c.attribute = 'height_cm'),
      'stance', (select fx.stance is not null and fx.stance <> 'unknown' from f join public.boxing_fighters fx on fx.id = f.id)),
    'career', jsonb_build_object(
      'verified_bouts', (select count(*) from bouts),
      'bouts_with_result', (select count(*) from bouts b where exists (select 1 from public.boxing_bout_results_current r where r.bout_id = b.bout_id)),
      'bouts_with_scorecards', (select count(*) from bouts b where exists (select 1 from public.boxing_scorecards_current s where s.bout_id = b.bout_id))),
    'media', jsonb_build_object(
      'approved_portrait', exists (select 1 from f join public.boxing_fighter_media m on m.fighter_id = f.id where m.review_state = 'approved'),
      'linked_videos', (select count(*) from f join public.boxing_video_links l on public.boxing_canonical_fighter_id(l.fighter_id) = f.id)),
    'fight_dna', jsonb_build_object(
      'available_metrics', (select count(*) from (select distinct on (s.metric_key) s.status from f join public.boxing_fighter_metric_snapshots s on s.fighter_id = f.id order by s.metric_key, s.as_of desc) l where l.status = 'available')))
$$;

create or replace function public.boxing_bout_completeness(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'result', exists (select 1 from public.boxing_bout_results_current r where r.bout_id = p_bout),
    'result_method', exists (select 1 from public.boxing_bout_results_current r where r.bout_id = p_bout and r.method is not null),
    'scheduled_rounds', exists (select 1 from public.boxing_bouts b where b.id = p_bout and b.scheduled_rounds is not null),
    'weight', exists (select 1 from public.boxing_bouts b where b.id = p_bout and (b.weight_class_id is not null or b.contracted_weight_lb is not null)),
    'referee', exists (select 1 from public.boxing_bout_officials o where o.bout_id = p_bout and o.role = 'referee' and o.assignment_state in ('assigned','worked')),
    'judges_active', (select count(*) from public.boxing_bout_officials o where o.bout_id = p_bout and o.role = 'judge' and o.assignment_state in ('assigned','worked')),
    'scorecards_current', (select count(*) from public.boxing_scorecards_current s where s.bout_id = p_bout),
    'official_weigh_ins_corners', (select count(distinct w.fighter_id) from public.boxing_weigh_ins w where w.bout_id = p_bout and w.weigh_in_kind = 'official'),
    'titles_recorded', (select count(*) from public.boxing_bout_titles t where t.bout_id = p_bout),
    'linked_videos', (select count(*) from public.boxing_video_links l where l.bout_id = p_bout),
    'matched_markets', (select count(*) from public.boxing_markets m where m.bout_id = p_bout))
$$;

create or replace function public.boxing_event_completeness(p_event uuid)
returns jsonb language sql stable set search_path = '' as $$
  with b as (select id from public.boxing_bouts where event_id = p_event and status is distinct from 'cancelled')
  select jsonb_build_object(
    'bouts', (select count(*) from b),
    'bouts_with_result', (select count(*) from b where exists (select 1 from public.boxing_bout_results_current r where r.bout_id = b.id)),
    'bouts_with_referee', (select count(*) from b where exists (select 1 from public.boxing_bout_officials o where o.bout_id = b.id and o.role = 'referee' and o.assignment_state in ('assigned','worked'))),
    'venue', exists (select 1 from public.boxing_events e where e.id = p_event and e.venue_id is not null),
    'start_time', exists (select 1 from public.boxing_events e where e.id = p_event and e.start_at is not null),
    'distribution_observations', (select count(*) from public.boxing_event_distribution d where d.event_id = p_event),
    'linked_videos', (select count(*) from public.boxing_video_links l where l.event_id = p_event),
    'card_changes', (select count(*) from public.boxing_card_changes c where c.event_id = p_event))
$$;

select public.boxing_lockdown();
