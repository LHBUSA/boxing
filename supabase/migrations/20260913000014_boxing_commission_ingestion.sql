-- PropBetEdge Boxing — official athletic-commission ingestion layer
--
-- 1. Rights/access decisions for the priority commissions (review 2026-09-13,
--    docs/BOXING_SOURCE_ACQUISITION.md), recorded as append-only reviews:
--      Nevada (NSAC)        approved_ingest   official results PDFs + public calendar feed
--      Florida (DBPR/FAC)   approved_ingest   official listings + match-result sheets
--      New Jersey (SACB)    approved_ingest   official event schedule & results page
--      Texas (TDLR)         reference_only    results data file is disallowed by robots.txt (Disallow: /*.csv)
--    Approval covers FACTS with attribution; PDFs are not redistributed and
--    private identifiers / medical fields are never stored.
-- 2. Paid-provider rows keep their blocked/disabled state; their notes now say
--    "not pursued" (owner policy: zero new paid data sources).
-- 3. Official document registry with append-only revisions: a changed
--    document becomes a new revision; the prior observation is never overwritten.
-- 4. News types EVENT_ADDED, EVENT_CHANGED, RESULT_CORRECTED.
-- 5. Late resolution is visible: odds ticks get recorded_at (when the row was
--    written) next to captured_at (when the price was observed); provider
--    event -> bout mappings record resolved_at / resolver_version / run.
-- Rerunnable.

begin;

-- ---------------------------------------------------------------------------
-- 1. commission rights decisions
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_src uuid;
  v_review uuid;
begin
  for r in select * from (values
    ('nsac_nevada', 'approved', 'https://boxing.nv.gov/results/2026_Results/', 'approved_ingest', 'approved',
     array['automated retrieval of the public results index and boxing result PDFs (robots.txt disallows only /workarea/ and /widgets/)',
           'automated retrieval of the commission''s public professional calendar feed',
           'store facts: events, bouts, results, methods, rounds, times, referees, judges and score totals, weights, title remarks',
           'first-party display with attribution to the Nevada State Athletic Commission', 'derived analytics and models'],
     array['redistributing the PDF documents', 'storing federal boxer ID numbers, dates of birth, medical or ringside-physician details',
           'ingesting MMA or PowerSlap documents into Boxing Core'],
     'Nevada public records (NRS 239.010 presumption of public access); site footer "All Rights Reserved" covers the site, facts are extracted with attribution. Conditional, low-rate retrieval; documents change rarely.'),
    ('florida_athletic_commission', 'approved', 'https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/', 'approved_ingest', 'approved',
     array['automated retrieval of the public upcoming-events and event-results pages and match-result PDFs (robots.txt disallows only /wp-admin/, /wp-includes/, /wp-content/)',
           'store boxing facts: events, bouts, results, methods, rounds, times, officials, weights, suspension periods (duration only)',
           'first-party display with attribution to the Florida Athletic Commission', 'derived analytics and models'],
     array['storing dates of birth, federal ID numbers or any medical data', 'ingesting MMA, kickboxing, bare-knuckle, Karate Combat or other non-boxing events',
           'redistributing the PDF documents'],
     'Florida public records (Chapter 119); DBPR copyright notice covers the site. The results listing has no sport label: classification is taken from each document''s Event Type and per-bout Sport cells.'),
    ('nj_sacb', 'approved', 'https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/', 'approved_ingest', 'approved',
     array['automated retrieval of the public Event Schedule & Results page (robots.txt disallows only /wp-admin/)',
           'store boxing event facts: date, promoter, venue, city, status (scheduled/cancelled), result document links',
           'first-party display with attribution to the New Jersey State Athletic Control Board'],
     array['treating third-party sites linked from SACB pages (e.g. BoxRec for suspensions) as approved sources',
           'storing promoter contact persons, federal ID numbers or medical data', 'redistributing documents'],
     'New Jersey public records (OPRA). Result PDF parsing is not built yet: documents are registered, not parsed.'),
    ('tdlr_texas', 'reference_only', 'https://www.tdlr.texas.gov/disclaimer.htm', 'reference_only', 'reference_only',
     array['human reference to published results and champions, copied with agency, URL and copy date and a non-endorsement statement (TDLR copyright policy)'],
     array['automated retrieval of /sports/_events-list.csv (robots.txt: Disallow: /*.csv)', 'use of TDLR logos'],
     'Texas results table is populated from a CSV file that robots.txt disallows for automated agents. No automated collection until TDLR provides a permitted feed or written permission.')
  ) as t(source_key, decision, terms_url, access_mode, rights_state, permitted, prohibited, notes)
  loop
    select id into v_src from public.boxing_sources where source_key = r.source_key;
    continue when v_src is null;
    insert into public.boxing_source_rights_reviews
      (source_id, reviewed_at, reviewed_by, terms_url, decision, permitted_uses, prohibited_uses, account_agreement_found, account_scope_note, next_review_due, notes)
    values (v_src, '2026-09-13T18:00:00Z', 'PropBetEdge owner direction; access/terms review by Claude Code session 2026-09-13', r.terms_url,
            case when r.decision = 'reference_only' then 'reference_only' else 'approved_with_restrictions' end,
            r.permitted, r.prohibited, false, 'Official government public source; no account or fee.', '2026-12-13', r.notes)
    on conflict (source_id, reviewed_at) do nothing;
    select id into v_review from public.boxing_source_rights_reviews where source_id = v_src and reviewed_at = '2026-09-13T18:00:00Z';
    update public.boxing_sources set
      latest_rights_review_id = v_review,
      access_mode = r.access_mode,
      rights_state = r.rights_state,
      enabled = r.access_mode = 'approved_ingest',
      persistence_allowed = r.access_mode = 'approved_ingest',
      derivative_allowed = r.access_mode = 'approved_ingest',
      display_allowed = r.access_mode = 'approved_ingest',
      redistribution_allowed = false,
      attribution_required = case when r.access_mode = 'approved_ingest' then 'Attribute the commission as the official source.' else 'agency, URL, copy date, non-endorsement statement' end,
      reviewed_at = '2026-09-13T18:00:00Z',
      reviewed_by = 'PropBetEdge owner direction (access/terms review 2026-09-13)',
      next_review_due = '2026-12-13',
      rights_note = upper(r.decision) || ' (2026-09-13): ' || r.notes
    where id = v_src and (latest_rights_review_id is null or latest_rights_review_id <> v_review)
      and (latest_rights_review_id is null or (select reviewed_at from public.boxing_source_rights_reviews x where x.id = latest_rights_review_id) < '2026-09-13T18:00:00Z');
  end loop;
end $$;

-- paid providers: not pursued (policy), never enabled
update public.boxing_sources set rights_note = 'NOT PURSUED (owner policy 2026-09-13: zero new paid data sources). ' || regexp_replace(rights_note, '(Outreach|outreach|Licensing outreach)[^.]*\.', '', 'g')
where source_key in ('boxrec', 'compubox', 'boxing_data_api') and rights_note not like 'NOT PURSUED%';

-- ---------------------------------------------------------------------------
-- 3. official document registry (operational row + append-only revisions)
-- ---------------------------------------------------------------------------
create table if not exists public.boxing_source_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  doc_key text not null,
  url text not null check (url ~ '^https://'),
  kind text not null check (kind in ('results','schedule','calendar','listing','other')),
  sport_hint text,
  classification jsonb not null default '{}'::jsonb,
  status text not null default 'discovered' check (status in ('discovered','fetched','parsed','rejected','parser_pending','error','skipped')),
  current_revision int not null default 0,
  current_sha256 text,
  http_last_modified text,
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_error text,
  unique (source_id, doc_key)
);

create table if not exists public.boxing_source_document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.boxing_source_documents(id) on delete restrict,
  revision int not null check (revision >= 1),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  fetched_at timestamptz not null,
  http_last_modified text,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  parser_version text,
  parse_summary jsonb not null default '{}'::jsonb,
  ingest_run_id uuid references public.boxing_ingest_runs(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (document_id, revision),
  unique (document_id, sha256)
);
select public.boxing_install_append_only('public.boxing_source_document_revisions');

-- Registers a fetch of a document. A new sha256 is a new revision; the same
-- sha256 only updates last_checked_at. Returns { document_id, revision, changed, previous_revision }.
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
      classification = coalesce(p -> 'classification', classification), last_error = null
    where id = v_doc.id;
    return jsonb_build_object('document_id', v_doc.id, 'revision', v_rev, 'changed', false, 'current_revision', v_doc.current_revision);
  end if;
  v_rev := v_doc.current_revision + 1;
  insert into public.boxing_source_document_revisions (document_id, revision, sha256, fetched_at, http_last_modified, observation_id, parser_version, parse_summary, ingest_run_id)
  values (v_doc.id, v_rev, p ->> 'sha256', v_now, p ->> 'http_last_modified', nullif(p ->> 'observation_id', '')::uuid, p ->> 'parser_version',
          coalesce(p -> 'parse_summary', '{}'::jsonb), nullif(p ->> 'ingest_run_id', '')::uuid);
  update public.boxing_source_documents set current_revision = v_rev, current_sha256 = p ->> 'sha256', http_last_modified = p ->> 'http_last_modified',
    last_checked_at = v_now, last_changed_at = v_now, status = coalesce(p ->> 'status', 'fetched'), classification = coalesce(p -> 'classification', classification), last_error = null
  where id = v_doc.id;
  return jsonb_build_object('document_id', v_doc.id, 'revision', v_rev, 'changed', true, 'previous_revision', nullif(v_rev - 1, 0));
end $$;

create or replace function public.boxing_source_document_state(p_source_key text, p_doc_keys text[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(d.doc_key, jsonb_build_object('document_id', d.id, 'status', d.status, 'current_revision', d.current_revision,
      'current_sha256', d.current_sha256, 'http_last_modified', d.http_last_modified, 'last_checked_at', d.last_checked_at)), '{}'::jsonb)
  from public.boxing_source_documents d join public.boxing_sources s on s.id = d.source_id
  where s.source_key = p_source_key and d.doc_key = any (p_doc_keys)
$$;

-- ---------------------------------------------------------------------------
-- 4. news types
-- ---------------------------------------------------------------------------
alter table public.boxing_news_events drop constraint if exists boxing_news_events_event_type_check;
alter table public.boxing_news_events add constraint boxing_news_events_event_type_check check (event_type in (
  'FIGHT_ANNOUNCED','OPPONENT_REPLACED','FIGHT_CANCELLED','FIGHT_POSTPONED','EVENT_ADDED','EVENT_CHANGED','EVENT_CANCELLED','EVENT_POSTPONED',
  'VENUE_CHANGED','TITLE_WON','TITLE_VACATED','TITLE_STRIPPED','TITLE_STATUS_CHANGED','RANKING_CHANGED','WEIGH_IN_RESULT','WEIGHT_MISSED',
  'OFFICIALS_ASSIGNED','RESULT_OFFICIAL','RESULT_CORRECTED','RESULT_OVERTURNED','SCORECARD_POSTED','SUSPENSION_POSTED','MARKET_MOVED','OTHER'));

-- ---------------------------------------------------------------------------
-- 5. late resolution is visible
-- ---------------------------------------------------------------------------
alter table public.boxing_market_ticks add column if not exists recorded_at timestamptz not null default now();
alter table public.boxing_bout_identities
  add column if not exists resolved_at timestamptz,
  add column if not exists resolver_version text,
  add column if not exists resolution_run_id uuid references public.boxing_ingest_runs(id) on delete restrict;

create or replace function public.boxing_map_provider_event(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_existing uuid;
begin
  select bout_id into v_existing from public.boxing_bout_identities
  where namespace = p ->> 'namespace' and external_id = p ->> 'provider_event_id' and verification_state <> 'rejected';
  if v_existing is not null and v_existing <> (p ->> 'bout_id')::uuid then
    return jsonb_build_object('status', 'conflict', 'mapped_bout_id', v_existing);
  end if;
  insert into public.boxing_bout_identities
    (bout_id, source_id, namespace, external_id, verification_state, confidence, evidence, resolved_at, resolver_version, resolution_run_id)
  values ((p ->> 'bout_id')::uuid, (select id from public.boxing_sources where source_key = p ->> 'source_key'),
          p ->> 'namespace', p ->> 'provider_event_id', coalesce(p ->> 'verification_state', 'probable'),
          coalesce((p ->> 'confidence')::smallint, 0), coalesce(p -> 'evidence', '{}'::jsonb), now(), p ->> 'resolver_version',
          nullif(p ->> 'resolution_run_id', '')::uuid)
  on conflict (namespace, external_id) where verification_state <> 'rejected'
  do update set last_observed_at = now();
  return jsonb_build_object('status', 'mapped', 'bout_id', p ->> 'bout_id');
end $$;

-- stored odds payloads for replay (no provider call): oldest first
create or replace function public.boxing_odds_observations_for_replay(p_since timestamptz default null, p_limit int default 200)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'external_key', o.external_key, 'captured_at', coalesce(o.source_published_at, o.observed_at),
      'ingest_run_id', o.ingest_run_id, 'payload', o.payload) order by coalesce(o.source_published_at, o.observed_at), o.id), '[]'::jsonb)
  from (select * from public.boxing_source_observations o
        where o.source_id = (select id from public.boxing_sources where source_key = 'the_odds_api') and o.entity_type = 'odds_snapshot'
          and (p_since is null or coalesce(o.source_published_at, o.observed_at) >= p_since)
        order by coalesce(o.source_published_at, o.observed_at), o.id limit greatest(1, least(coalesce(p_limit, 200), 1000))) o
$$;

create or replace function public.boxing_commission_coverage()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'sources', (select coalesce(jsonb_object_agg(s.source_key, jsonb_build_object('access_mode', s.access_mode, 'enabled', s.enabled)), '{}'::jsonb)
                from public.boxing_sources s where s.source_kind = 'commission' and s.source_key not in ('commission_official')),
    'documents', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select s.source_key || ':' || d.status as k, count(*) n
                  from public.boxing_source_documents d join public.boxing_sources s on s.id = d.source_id group by 1) x),
    'document_revisions_beyond_first', (select count(*) from public.boxing_source_document_revisions where revision > 1),
    'events', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select s.source_key as k, count(*) n from public.boxing_events e
               join public.boxing_sources s on s.id = e.source_id where s.source_kind = 'commission' group by 1) x),
    'bouts', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select s.source_key as k, count(*) n from public.boxing_bouts b
              join public.boxing_sources s on s.id = b.source_id where s.source_kind = 'commission' group by 1) x),
    'results', (select count(*) from public.boxing_bout_results r join public.boxing_sources s on s.id = r.source_id where s.source_kind = 'commission'),
    'result_revisions_beyond_first', (select count(*) from public.boxing_bout_results r join public.boxing_sources s on s.id = r.source_id where s.source_kind = 'commission' and r.revision > 1),
    'scorecards', (select count(*) from public.boxing_scorecards c join public.boxing_sources s on s.id = c.source_id where s.source_kind = 'commission'),
    'fighters_total', (select count(*) from public.boxing_fighters),
    'fighters_with_commission_resolution', (select count(distinct r.fighter_id) from public.boxing_identity_resolutions r join public.boxing_sources s on s.id = r.source_id where s.source_kind = 'commission' and r.fighter_id is not null),
    'identity_review_open', (select count(*) from public.boxing_identity_review_queue q where q.status = 'pending'),
    'news_events', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select n.event_type as k, count(*) n from public.boxing_news_events n
                    join public.boxing_sources s on s.id = n.source_id where s.source_kind = 'commission' group by 1) x)
  )
$$;

-- Replay of stored odds may attach to bouts that have since COMPLETED (the
-- commission result arrives after the fight); live capture still only sees
-- announced/scheduled/in-progress bouts. Body otherwise identical to 0007
-- (active corners only; cancelled/postponed events excluded).
drop function if exists public.boxing_market_bouts_in_window(timestamptz, timestamptz);
create or replace function public.boxing_market_bouts_in_window(p_from timestamptz, p_to timestamptz, p_include_completed boolean default false)
returns jsonb language sql stable set search_path = '' as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
      'bout_id', b.id, 'event_id', e.id, 'status', b.status,
      'starts_at', coalesce(e.start_at, e.event_date::timestamptz),
      'participants', (select jsonb_agg(jsonb_build_object('fighter_id', p.fighter_id, 'side', p.side, 'display_name', f.display_name) order by p.side)
                       from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id
                       where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')))
    order by b.id), '[]'::jsonb)
  from public.boxing_bouts b
  join public.boxing_events e on e.id = b.event_id
  where (b.status in ('announced','scheduled','in_progress') or (p_include_completed and b.status = 'complete'))
    and e.status not in ('cancelled','postponed')
    and coalesce(e.start_at, e.event_date::timestamptz) between p_from and p_to
    and (select count(*) from public.boxing_bout_participants p
         where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')) = 2
$fn$;

-- boxing_market_selection_prices expands boxing_market_ticks.* (0005): recreate it
-- after adding recorded_at so a rerun of the chain yields the same definition.
create or replace view public.boxing_market_selection_prices with (security_invoker = true) as
with base as (
  select s.id as selection_id, s.selection_key, s.fighter_id, s.label, s.last_seen_at,
         m.id as market_id, m.bout_id, m.market_type, m.market_key, m.line, m.is_live,
         bk.slug as bookmaker, pr.slug as provider,
         coalesce(m.commence_time, e.start_at, e.event_date::timestamptz) as starts_at
  from public.boxing_market_selections s
  join public.boxing_markets m on m.id = s.market_id
  join public.boxing_bookmakers bk on bk.id = m.bookmaker_id
  join public.boxing_odds_providers pr on pr.id = m.provider_id
  join public.boxing_bouts b on b.id = m.bout_id
  join public.boxing_events e on e.id = b.event_id
)
select b.*,
  o.american_odds as opening_american, o.implied_probability as opening_implied, o.observed_at as opening_at,
  l.american_odds as latest_american, l.implied_probability as latest_implied, l.observed_at as latest_at,
  c.american_odds as closing_american, c.implied_probability as closing_implied, c.observed_at as closing_at,
  (l.american_odds - o.american_odds) as american_change,
  (l.implied_probability - o.implied_probability) as implied_change,
  (select count(*) from public.boxing_market_ticks t where t.selection_id = b.selection_id) as tick_count,
  public.boxing_market_freshness(coalesce(b.last_seen_at, l.captured_at), b.starts_at, b.is_live) as freshness,
  extract(epoch from now() - coalesce(b.last_seen_at, l.captured_at))::int as age_seconds,
  case when public.boxing_market_freshness(coalesce(b.last_seen_at, l.captured_at), b.starts_at, b.is_live) in ('fresh','live')
       then l.american_odds end as current_american,
  case when public.boxing_market_freshness(coalesce(b.last_seen_at, l.captured_at), b.starts_at, b.is_live) in ('fresh','live')
       then l.implied_probability end as current_implied
from base b
left join lateral (
  select t.*, coalesce(t.provider_timestamp, t.captured_at) as observed_at from public.boxing_market_ticks t
  where t.selection_id = b.selection_id and t.market_status = 'open' and t.american_odds is not null
  order by coalesce(t.provider_timestamp, t.captured_at), t.id limit 1) o on true
left join lateral (
  select t.*, coalesce(t.provider_timestamp, t.captured_at) as observed_at from public.boxing_market_ticks t
  where t.selection_id = b.selection_id and t.market_status = 'open' and t.american_odds is not null
  order by coalesce(t.provider_timestamp, t.captured_at) desc, t.id desc limit 1) l on true
left join lateral (
  select t.*, coalesce(t.provider_timestamp, t.captured_at) as observed_at from public.boxing_market_ticks t
  where t.selection_id = b.selection_id and t.market_status = 'open' and t.american_odds is not null
    and not t.is_live and b.starts_at is not null and now() >= b.starts_at
    and coalesce(t.provider_timestamp, t.captured_at) < b.starts_at
  order by coalesce(t.provider_timestamp, t.captured_at) desc, t.id desc limit 1) c on true;

select public.boxing_lockdown();

commit;
