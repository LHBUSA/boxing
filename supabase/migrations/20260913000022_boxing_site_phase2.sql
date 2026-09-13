-- PropBetEdge Boxing — Phase 2 site read contract.
--
-- Scorecard Center, Judge DNA, Referee DNA, Odds Terminal index, Official Video
-- Desk registry, Fight Week media timeline and the Promotions foundation.
-- Same rules as 0020: fixed-field projections served only through
-- boxing-gateway; no DOB, hometowns, evidence, reviewer names, internal uuids,
-- provider or bookmaker identifiers, or prices (prices stay on the one-bout
-- market summary). Promoters are shown exactly as listed on official sheets.

begin;

-- ---------------------------------------------------------------------------
-- Official video registry (Official Video Desk). YouTube metadata only:
-- nothing is downloaded or rehosted. A channel publishes only when its exact
-- channel id is identity-verified AND its rights review is approved; the
-- CHECK below makes "enabled" impossible otherwise.
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_video_channels (
  channel_id text primary key check (channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  name text not null,
  handle text,
  source_class text not null check (source_class in ('promoter_official','broadcaster_official','commission_official','sanctioning_body_official','fighter_team_official')),
  identity_state text not null default 'identity_unconfirmed' check (identity_state in ('verified','identity_unconfirmed','not_found')),
  rights_state text not null default 'review_required' check (rights_state in ('approved','review_required','blocked')),
  enabled boolean not null default false,
  verification jsonb not null default '{}'::jsonb,
  rights_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boxing_video_channel_enable_requires_review check (not enabled or (identity_state = 'verified' and rights_state = 'approved' and reviewed_by is not null and reviewed_at is not null))
);

create table if not exists public.boxing_videos (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'youtube' check (provider = 'youtube'),
  provider_video_id text not null check (provider_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  channel_id text not null references public.boxing_video_channels(channel_id) on delete restrict,
  title text not null,
  published_at timestamptz,
  thumbnail_url text,
  duration_sec int check (duration_sec is null or duration_sec >= 0),
  embeddable boolean,
  language text not null default 'unknown' check (language in ('en','es','pt','ja','unknown')),
  video_type text not null default 'other' check (video_type in ('announcement','trailer_promo','grand_arrival','media_workout','press_conference','interview','faceoff','weigh_in','ceremonial_weigh_in','fight_preview','highlights','full_fight','post_fight_interview','post_fight_press_conference','analysis','other')),
  classification jsonb not null default '{}'::jsonb,
  link_status text not null default 'review' check (link_status in ('published','review','rejected')),
  resolver_confidence text not null default 'none' check (resolver_confidence in ('high','medium','low','none')),
  review_reason text,
  source_metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (provider, provider_video_id)
);
create index if not exists boxing_videos_channel_idx on public.boxing_videos (channel_id, published_at desc);

create table if not exists public.boxing_video_links (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.boxing_videos(id) on delete cascade,
  entity_type text not null check (entity_type in ('promoter','event','bout','fighter')),
  event_id uuid references public.boxing_events(id) on delete restrict,
  bout_id uuid references public.boxing_bouts(id) on delete restrict,
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  promoter_key text,
  method text not null,
  confidence text not null check (confidence in ('high','medium','low')),
  created_at timestamptz not null default now(),
  check ((entity_type = 'event' and event_id is not null) or (entity_type = 'bout' and bout_id is not null)
      or (entity_type = 'fighter' and fighter_id is not null) or (entity_type = 'promoter' and promoter_key is not null))
);
create index if not exists boxing_video_links_video_idx on public.boxing_video_links (video_id);
create index if not exists boxing_video_links_event_idx on public.boxing_video_links (event_id) where event_id is not null;
create index if not exists boxing_video_links_bout_idx on public.boxing_video_links (bout_id) where bout_id is not null;

-- A video is public only from an enabled channel, published, and not known to be unembeddable.
create or replace function public.boxing_site_video_card(p_video uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'provider_video_id', v.provider_video_id, 'title', v.title, 'channel_name', c.name, 'source_class', c.source_class,
    'published_at', v.published_at, 'thumbnail_url', v.thumbnail_url, 'duration_sec', v.duration_sec, 'embeddable', v.embeddable,
    'language', v.language, 'video_type', v.video_type, 'confidence', v.resolver_confidence,
    'event', (select jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date) from public.boxing_video_links l join public.boxing_events e on e.id = l.event_id where l.video_id = v.id and l.entity_type = 'event' limit 1),
    'bout', (select jsonb_build_object('public_id', b.public_id,
                 'a', (select f.display_name from public.boxing_bout_participants p join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(p.fighter_id) where p.bout_id = b.id and p.side = 'a' and p.participant_status in ('scheduled','confirmed') limit 1),
                 'b', (select f.display_name from public.boxing_bout_participants p join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(p.fighter_id) where p.bout_id = b.id and p.side = 'b' and p.participant_status in ('scheduled','confirmed') limit 1))
             from public.boxing_video_links l join public.boxing_bouts b on b.id = l.bout_id where l.video_id = v.id and l.entity_type = 'bout' limit 1),
    'fighters', (select coalesce(jsonb_agg(distinct jsonb_build_object('public_id', f.public_id, 'name', f.display_name)), '[]'::jsonb)
                 from public.boxing_video_links l join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(l.fighter_id) where l.video_id = v.id and l.entity_type = 'fighter'))
  from public.boxing_videos v join public.boxing_video_channels c on c.channel_id = v.channel_id
  where v.id = p_video and c.enabled and v.link_status = 'published' and v.embeddable is not false
$$;

create or replace function public.boxing_site_videos(p_type text default null, p_limit int default 24)
returns jsonb language sql stable set search_path = '' as $$
  with pub as (
    select v.* from public.boxing_videos v join public.boxing_video_channels c on c.channel_id = v.channel_id
    where c.enabled and v.link_status = 'published' and v.embeddable is not false)
  select jsonb_build_object(
    'channels', (select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'handle', c.handle, 'source_class', c.source_class,
                    'identity_state', c.identity_state, 'rights_state', c.rights_state, 'enabled', c.enabled, 'reviewed_at', c.reviewed_at)
                  order by c.enabled desc, c.source_class, c.name), '[]'::jsonb) from public.boxing_video_channels c),
    'published', (select count(*) from pub),
    'in_review', (select count(*) from public.boxing_videos v join public.boxing_video_channels c on c.channel_id = v.channel_id where c.enabled and v.link_status = 'review'),
    'types', (select coalesce(jsonb_object_agg(t.video_type, t.n), '{}'::jsonb) from (select video_type, count(*) n from pub group by 1) t),
    'videos', (select coalesce(jsonb_agg(public.boxing_site_video_card(x.id) order by x.published_at desc nulls last), '[]'::jsonb) from (
        select id, published_at from pub where p_type is null or video_type = p_type
        order by published_at desc nulls last limit greatest(1, least(coalesce(p_limit, 24), 60))) x))
$$;

-- ---------------------------------------------------------------------------
-- Scorecards: judge cards oriented to the bout's corners a/b (+ round cards)
-- ---------------------------------------------------------------------------

create or replace function public.boxing_site_cards_oriented(p_bout uuid)
returns jsonb language sql stable set search_path = '' as $$
  with a as (select public.boxing_canonical_fighter_id(p.fighter_id) fid from public.boxing_bout_participants p
             where p.bout_id = p_bout and p.side = 'a' and p.participant_status in ('scheduled','confirmed') limit 1)
  select coalesce(jsonb_agg(jsonb_build_object(
      'slot', s.slot, 'judge', o.display_name, 'judge_public_id', o.public_id,
      'a_total', case when public.boxing_canonical_fighter_id(s.fighter_a_id) = (select fid from a) then s.fighter_a_total else s.fighter_b_total end,
      'b_total', case when public.boxing_canonical_fighter_id(s.fighter_a_id) = (select fid from a) then s.fighter_b_total else s.fighter_a_total end,
      'state', s.card_state, 'revision', s.revision,
      'rounds', (select coalesce(jsonb_agg(jsonb_build_object('round', r.round,
             'a', case when public.boxing_canonical_fighter_id(s.fighter_a_id) = (select fid from a) then r.fighter_a_points else r.fighter_b_points end,
             'b', case when public.boxing_canonical_fighter_id(s.fighter_a_id) = (select fid from a) then r.fighter_b_points else r.fighter_a_points end) order by r.round), '[]'::jsonb)
           from public.boxing_scorecard_rounds r where r.scorecard_id = s.id))
    order by s.slot nulls last, o.display_name), '[]'::jsonb)
  from public.boxing_scorecards_current s
  join public.boxing_officials o on o.id = public.boxing_canonical_official_id(s.judge_id)
  where s.bout_id = p_bout
$$;

-- Signed margins (a minus b) of complete cards; spread = widest minus narrowest.
create or replace function public.boxing_site_card_spread(p_bout uuid)
returns numeric language sql stable set search_path = '' as $$
  select max(m) - min(m) from (
    select (c ->> 'a_total')::numeric - (c ->> 'b_total')::numeric m
    from jsonb_array_elements(public.boxing_site_cards_oriented(p_bout)) c
    where c ->> 'a_total' is not null and c ->> 'b_total' is not null) x
  having count(*) >= 2
$$;


create or replace function public.boxing_site_bout_compact(p_bout uuid, p_sheet jsonb default null)
returns jsonb language sql stable set search_path = '' as $$
  with b as (select * from public.boxing_bouts where id = p_bout),
  corners as (
    select p.side, f.public_id, f.display_name, f.id fighter_id
    from b join public.boxing_bout_participants p on p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')
    join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(p.fighter_id)),
  sheet as (select s from jsonb_array_elements(coalesce(p_sheet, '[]'::jsonb)) s, b where (s ->> 'order')::int = b.bout_order limit 1),
  r as (select * from public.boxing_bout_results_current where bout_id = p_bout)
  select jsonb_build_object(
    'public_id', b.public_id, 'order', b.bout_order, 'status', b.status, 'scheduled_rounds', b.scheduled_rounds,
    'weight', public.boxing_site_weight(b.id),
    'a', (select jsonb_build_object('public_id', c.public_id, 'name', c.display_name, 'corner', (select s ->> 'a_corner' from sheet),
                                    'weigh_in', public.boxing_site_weigh_in(b.id, c.fighter_id)) from corners c where c.side = 'a'),
    'b', (select jsonb_build_object('public_id', c.public_id, 'name', c.display_name, 'corner', (select s ->> 'b_corner' from sheet),
                                    'weigh_in', public.boxing_site_weigh_in(b.id, c.fighter_id)) from corners c where c.side = 'b'),
    'result', (select jsonb_build_object('outcome', r.outcome,
                 'winner_side', (select c.side from corners c where c.fighter_id = public.boxing_canonical_fighter_id(r.winner_id)),
                 'method', r.method, 'decision_type', r.decision_type, 'round', r.round, 'time_sec', r.time_sec,
                 'revision', r.revision, 'state', r.result_state) from r),
    'scorecards', public.boxing_site_cards_oriented(b.id),
    'referee', (select o.display_name from public.boxing_bout_officials bo join public.boxing_officials o on o.id = public.boxing_canonical_official_id(bo.official_id)
                where bo.bout_id = b.id and bo.role = 'referee' limit 1),
    'referee_public_id', (select o.public_id from public.boxing_bout_officials bo join public.boxing_officials o on o.id = public.boxing_canonical_official_id(bo.official_id)
                where bo.bout_id = b.id and bo.role = 'referee' limit 1),
    'titles', (select coalesce(jsonb_agg(jsonb_build_object('organization', org.short_name, 'organization_slug', org.slug, 'tier', t.tier,
                 'label', coalesce(t.source_native_label, t.name), 'status', bt.status) order by org.slug, t.tier), '[]'::jsonb)
               from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join public.boxing_organizations org on org.id = t.organization_id
               where bt.bout_id = b.id),
    'market_matched', exists (select 1 from public.boxing_bout_identities bi where bi.bout_id = b.id and bi.namespace = 'the_odds_api.event' and bi.verification_state = 'verified'))
  from b
$$;

create or replace function public.boxing_site_scorecards(p_decision text default null, p_commission text default null, p_sort text default 'recent', p_limit int default 40, p_offset int default 0)
returns jsonb language sql stable set search_path = '' as $$
  with d as (
    select b.id bout_id, e.id event_id, e.event_date, b.bout_order, c.slug commission_slug, c.name commission_name,
           case when r.outcome = 'draw' then 'draw' else coalesce(r.decision_type::text, 'unstated') end kind,
           public.boxing_site_card_spread(b.id) spread
    from public.boxing_bouts b
    join public.boxing_events e on e.id = b.event_id
    left join public.boxing_commissions c on c.id = e.commission_id
    join public.boxing_bout_results_current r on r.bout_id = b.id
    where exists (select 1 from public.boxing_scorecards_current s where s.bout_id = b.id)),
  f as (select * from d where (p_decision is null or kind = p_decision) and (p_commission is null or commission_slug = p_commission)),
  page as (
    select * from f
    order by case when p_sort = 'spread' then spread end desc nulls last, event_date desc, bout_order desc nulls last
    limit greatest(1, least(coalesce(p_limit, 40), 100)) offset greatest(0, coalesce(p_offset, 0)))
  select jsonb_build_object(
    'decision', p_decision, 'commission', p_commission, 'sort', coalesce(p_sort, 'recent'),
    'total', (select count(*) from f),
    'limit', greatest(1, least(coalesce(p_limit, 40), 100)), 'offset', greatest(0, coalesce(p_offset, 0)),
    'counts', jsonb_build_object('all', (select count(*) from d), 'unanimous', (select count(*) from d where kind = 'unanimous'),
        'split', (select count(*) from d where kind = 'split'), 'majority', (select count(*) from d where kind = 'majority'),
        'draw', (select count(*) from d where kind = 'draw')),
    'commissions', (select coalesce(jsonb_agg(jsonb_build_object('slug', x.commission_slug, 'name', x.commission_name, 'n', x.n) order by x.commission_name), '[]'::jsonb)
                    from (select commission_slug, commission_name, count(*) n from d where commission_slug is not null group by 1, 2) x),
    'round_cards_bouts', (select count(distinct s.bout_id) from public.boxing_scorecards_current s where exists (select 1 from public.boxing_scorecard_rounds r where r.scorecard_id = s.id)),
    'widest_spread', (select max(spread) from d),
    'rows', (select coalesce(jsonb_agg(public.boxing_site_bout_compact(p.bout_id)
               || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date, 'commission', p.commission_name, 'commission_slug', p.commission_slug),
                                     'kind', p.kind, 'spread', p.spread)
             order by case when p_sort = 'spread' then p.spread end desc nulls last, p.event_date desc, p.bout_order desc nulls last), '[]'::jsonb)
             from page p join public.boxing_events e on e.id = p.event_id))
$$;

create or replace function public.boxing_site_official_dna(p_official uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', s.metric_key, 'version', s.metric_version, 'category', d.category, 'name', d.name, 'unit', d.unit,
      'status', s.status, 'value', s.value_number, 'value_text', s.value_text,
      'value_json', case when s.metric_key = 'judge.jurisdictions' then s.value_json end,
      'sample_size', s.sample_size, 'minimum_sample', d.minimum_sample,
      'numerator', s.sample_context -> 'numerator', 'denominator', s.sample_context -> 'denominator', 'as_of', s.as_of)
    order by d.category, s.metric_key), '[]'::jsonb)
  from (select distinct on (metric_key) * from public.boxing_official_metric_snapshots
        where official_id = p_official order by metric_key, as_of desc, created_at desc) s
  join public.boxing_metric_definitions d on d.metric_key = s.metric_key and d.version = s.metric_version and d.subject_kind = s.subject_kind
$$;

create or replace function public.boxing_site_scorecard(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select b.* from public.boxing_bouts b where public.boxing_site_ref_matches(b.public_id, p_ref)),
  b as (select * from hit where (select count(*) from hit) = 1),
  e as (select ev.* from public.boxing_events ev join b on b.event_id = ev.id),
  sides as (select p.side, public.boxing_canonical_fighter_id(p.fighter_id) fid from b join public.boxing_bout_participants p on p.bout_id = b.id and p.participant_status in ('scheduled','confirmed'))
  select jsonb_build_object(
    'bout', public.boxing_site_bout_compact(b.id, public.boxing_site_event_sheet(e.id)),
    'event', public.boxing_site_event_summary(e.id, false),
    'spread', public.boxing_site_card_spread(b.id),
    'result_history', (select coalesce(jsonb_agg(jsonb_build_object('revision', r.revision, 'outcome', r.outcome, 'method', r.method, 'decision_type', r.decision_type,
                          'round', r.round, 'state', r.result_state, 'change_reason', r.change_reason, 'captured_at', r.captured_at) order by r.revision), '[]'::jsonb)
                       from public.boxing_bout_results r where r.bout_id = b.id),
    'card_provenance', (select jsonb_build_object('source_url', min(s.source_url), 'captured_at', max(s.captured_at), 'stored_card_versions', (select count(*) from public.boxing_scorecards x where x.bout_id = b.id))
                        from public.boxing_scorecards_current s where s.bout_id = b.id),
    'deductions', (select coalesce(jsonb_agg(jsonb_build_object('round', d.round, 'points', d.points, 'reason', d.reason_public,
                      'side', (select side from sides where fid = public.boxing_canonical_fighter_id(d.fighter_id) limit 1)) order by d.round), '[]'::jsonb)
                   from public.boxing_point_deductions d where d.bout_id = b.id),
    'judges', (select coalesce(jsonb_agg(jsonb_build_object('public_id', o.public_id, 'name', o.display_name,
                   'cards_on_record', (select count(*) from public.boxing_scorecards_current x where public.boxing_canonical_official_id(x.judge_id) = o.id),
                   'dna', (select coalesce(jsonb_agg(m) filter (where m ->> 'key' in ('judge.avg_card_margin','judge.panel_disagreement_rate','judge.split_decision_involvement','judge.bouts_scored')), '[]'::jsonb)
                           from jsonb_array_elements(public.boxing_site_official_dna(o.id)) m))
                 order by o.display_name), '[]'::jsonb)
               from (select distinct public.boxing_canonical_official_id(s.judge_id) jid from public.boxing_scorecards_current s where s.bout_id = b.id) j
               join public.boxing_officials o on o.id = j.jid))
  from b, e
$$;

-- ---------------------------------------------------------------------------
-- Officials (Judge DNA, Referee DNA)
-- ---------------------------------------------------------------------------

create or replace function public.boxing_site_officials(p_role text, p_q text default null, p_limit int default 60, p_offset int default 0)
returns jsonb language sql stable set search_path = '' as $$
  with a as (
    select public.boxing_canonical_official_id(bo.official_id) oid, count(*) n, max(e.event_date) last_date, min(e.event_date) first_date,
           coalesce(jsonb_agg(distinct c.slug) filter (where c.slug is not null), '[]'::jsonb) comms
    from public.boxing_bout_officials bo
    join public.boxing_bouts b on b.id = bo.bout_id
    join public.boxing_events e on e.id = b.event_id
    left join public.boxing_commissions c on c.id = e.commission_id
    where bo.role = p_role and p_role in ('judge','referee')
    group by 1),
  q as (select lower(coalesce(p_q, '')) t),
  base as (
    select o.id, o.public_id, o.display_name, a.n, a.last_date, a.first_date, a.comms
    from a join public.boxing_officials o on o.id = a.oid, q
    where q.t = '' or lower(o.display_name) like '%' || q.t || '%'),
  page as (select * from base order by n desc, display_name limit greatest(1, least(coalesce(p_limit, 60), 120)) offset greatest(0, coalesce(p_offset, 0)))
  select jsonb_build_object('role', p_role, 'q', nullif(p_q, ''), 'total', (select count(*) from base),
    'universe', (select count(*) from a),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('public_id', p.public_id, 'name', p.display_name, 'assignments', p.n,
        'first_date', p.first_date, 'last_date', p.last_date, 'commissions', p.comms,
        'cards', (select count(*) from public.boxing_scorecards_current s where public.boxing_canonical_official_id(s.judge_id) = p.id),
        'metrics', (select coalesce(jsonb_agg(m), '[]'::jsonb) from jsonb_array_elements(public.boxing_site_official_dna(p.id)) m
                    where m ->> 'key' = any (case when p_role = 'judge' then array['judge.avg_card_margin','judge.panel_disagreement_rate','judge.bouts_scored']
                                                  else array['referee.stoppage_rate','referee.avg_stoppage_round','referee.bouts_refereed','referee.ko_tko_stoppages'] end)))
      order by p.n desc, p.display_name), '[]'::jsonb) from page p))
$$;

create or replace function public.boxing_site_official_assignments(p_official uuid, p_role text)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x.j order by x.d desc, x.o desc nulls last), '[]'::jsonb) from (
    select e.event_date d, b.bout_order o,
           public.boxing_site_bout_compact(b.id)
           || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date, 'commission', c.name, 'commission_slug', c.slug),
                                 'deductions', (select coalesce(sum(pd.points), 0) from public.boxing_point_deductions pd where pd.bout_id = b.id),
                                 'slot', bo.slot) j
    from public.boxing_bout_officials bo
    join public.boxing_bouts b on b.id = bo.bout_id
    join public.boxing_events e on e.id = b.event_id
    left join public.boxing_commissions c on c.id = e.commission_id
    where public.boxing_canonical_official_id(bo.official_id) = p_official and bo.role = p_role
    order by e.event_date desc, b.bout_order desc nulls last limit 120) x
$$;

create or replace function public.boxing_site_official(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select o.* from public.boxing_officials o where public.boxing_site_ref_matches(o.public_id, p_ref)),
  me as (select * from hit where (select count(*) from hit) = 1),
  canon as (select public.boxing_canonical_official_id(me.id) id, me.id raw from me)
  select case
    when (select id from canon) <> (select raw from canon) then
      jsonb_build_object('redirect_public_id', (select o.public_id from public.boxing_officials o where o.id = (select id from canon)))
    else jsonb_build_object(
      'official', (select jsonb_build_object('public_id', o.public_id, 'name', o.display_name, 'official_type', o.official_type, 'country_code', o.country_code)
                   from public.boxing_officials o where o.id = c.id),
      'roles', (select coalesce(jsonb_object_agg(r.role, r.n), '{}'::jsonb) from (
                  select bo.role, count(*) n from public.boxing_bout_officials bo where public.boxing_canonical_official_id(bo.official_id) = c.id group by 1) r),
      'jurisdictions', (select coalesce(jsonb_agg(jsonb_build_object('slug', cm.slug, 'name', cm.name, 'assignments', x.n) order by x.n desc), '[]'::jsonb) from (
                  select e.commission_id, count(*) n from public.boxing_bout_officials bo join public.boxing_bouts b on b.id = bo.bout_id
                  join public.boxing_events e on e.id = b.event_id where public.boxing_canonical_official_id(bo.official_id) = c.id group by 1) x
                  join public.boxing_commissions cm on cm.id = x.commission_id),
      'dna', public.boxing_site_official_dna(c.id),
      'dna_as_of', (select max(as_of) from public.boxing_official_metric_snapshots where official_id = c.id),
      'judged', public.boxing_site_official_assignments(c.id, 'judge'),
      'refereed', public.boxing_site_official_assignments(c.id, 'referee')) end
  from canon c
$$;

-- ---------------------------------------------------------------------------
-- Market index (no prices, no provider or bookmaker identifiers)
-- ---------------------------------------------------------------------------

create or replace function public.boxing_site_market_index(p_today date default current_date)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'captured_upcoming_events', (select count(*) from public.boxing_provider_events where last_commence_time >= now()),
    'captured_events_total', (select count(*) from public.boxing_provider_events),
    'next_captured_start', (select min(last_commence_time) from public.boxing_provider_events where last_commence_time >= now()),
    'captured_by_week', (select coalesce(jsonb_agg(jsonb_build_object('week_start', w, 'events', n) order by w), '[]'::jsonb) from (
        select date_trunc('week', last_commence_time)::date w, count(*) n from public.boxing_provider_events where last_commence_time >= now() group by 1) x),
    'unmatched_open', (select count(*) from public.boxing_market_unmatched where not resolved),
    'unmatched_reasons', (select coalesce(jsonb_object_agg(reason, n), '{}'::jsonb) from (select reason, count(*) n from public.boxing_market_unmatched where not resolved group by 1) x),
    'last_capture_at', (select max(requested_at) from public.boxing_provider_captures where http_status between 200 and 299),
    'captures_last_7_days', (select count(*) from public.boxing_provider_captures where requested_at >= now() - interval '7 days' and http_status between 200 and 299),
    'matched', (select coalesce(jsonb_agg(x.j order by x.d, x.o), '[]'::jsonb) from (
        select e.event_date d, b.bout_order o,
               public.boxing_site_bout_compact(b.id)
               || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date, 'status', e.status,
                                                                  'commission', (select cm.name from public.boxing_commissions cm where cm.id = e.commission_id)),
                                     'starts_at', public.boxing_bout_starts_at(b.id)) j
        from (select distinct bout_id from public.boxing_bout_identities where namespace = 'the_odds_api.event' and verification_state = 'verified') m
        join public.boxing_bouts b on b.id = m.bout_id
        join public.boxing_events e on e.id = b.event_id
        order by e.event_date desc limit 60) x))
$$;

-- ---------------------------------------------------------------------------
-- Fight Week media timeline: recorded facts per stage. Capture times are
-- reported only when they precede the card (a backfill after the fight is not
-- event chronology).
-- ---------------------------------------------------------------------------

create or replace function public.boxing_site_event_timeline(p_event uuid)
returns jsonb language sql stable set search_path = '' as $$
  with e as (select * from public.boxing_events where id = p_event),
  bouts as (select b.* from public.boxing_bouts b, e where b.event_id = e.id),
  pre as (select (e.event_date)::timestamptz cutoff from e),
  wi as (
    select w.*, b.public_id bout_public_id, b.contracted_weight_lb bout_contracted_lb from public.boxing_weigh_ins w join bouts b on b.id = w.bout_id
    where w.verification_state <> 'rejected' and not exists (select 1 from public.boxing_weigh_ins x where x.supersedes_id = w.id))
  select jsonb_build_object(
    'listed', (select jsonb_build_object('on_record', count(*) > 0,
                  'recorded_at', case when min(cc.effective_at) < (select cutoff from pre) then min(cc.effective_at) end)
               from public.boxing_card_changes cc where cc.event_id = p_event and cc.change_type = 'event_announced'),
    'card', (select jsonb_build_object('bouts_added', count(*) filter (where cc.change_type = 'bout_added'),
                  'first_bout_recorded_at', case when min(cc.effective_at) filter (where cc.change_type = 'bout_added') < (select cutoff from pre) then min(cc.effective_at) filter (where cc.change_type = 'bout_added') end,
                  'officials_assigned', count(*) filter (where cc.change_type = 'official_assigned'),
                  'weight_changes', count(*) filter (where cc.change_type in ('contracted_weight_changed','weight_class_changed')))
             from public.boxing_card_changes cc where cc.event_id = p_event),
    'replacements', (select coalesce(jsonb_agg(jsonb_build_object('bout_public_id', b.public_id, 'status', p.participant_status, 'name', f.display_name, 'fighter_public_id', f.public_id)), '[]'::jsonb)
                     from bouts b join public.boxing_bout_participants p on p.bout_id = b.id and p.participant_status in ('replaced','withdrawn')
                     join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(p.fighter_id)),
    'weigh_ins', (select jsonb_build_object('official_weights', count(*) filter (where wi.official_weight_lb is not null and wi.weigh_in_kind = 'official'),
                    'ceremonial', count(*) filter (where wi.weigh_in_kind = 'ceremonial'),
                    'missed', count(*) filter (where wi.status = 'missed_weight'),
                    'weighed_at', min(wi.weighed_at)) from wi),
    'missed_weight', (select coalesce(jsonb_agg(jsonb_build_object('bout_public_id', wi.bout_public_id, 'name', f.display_name, 'fighter_public_id', f.public_id,
                        'weight_lb', wi.official_weight_lb, 'contracted_lb', coalesce(wi.bout_contracted_lb, wi.contracted_weight_lb))), '[]'::jsonb)
                      from wi join public.boxing_fighters f on f.id = public.boxing_canonical_fighter_id(wi.fighter_id) where wi.status = 'missed_weight'),
    'results', (select jsonb_build_object('official', count(*), 'revised', count(*) filter (where r.revision > 1),
                   'stoppages', count(*) filter (where r.method in ('KO','TKO','RTD')), 'decisions', count(*) filter (where r.method = 'DECISION'))
                from public.boxing_bout_results_current r join bouts b on b.id = r.bout_id),
    'scorecards', (select jsonb_build_object('bouts', count(distinct s.bout_id),
                     'split_or_majority', count(distinct s.bout_id) filter (where r.decision_type in ('split','majority')))
                   from public.boxing_scorecards_current s join bouts b on b.id = s.bout_id left join public.boxing_bout_results_current r on r.bout_id = b.id),
    'market', (select jsonb_build_object('matched_bouts', count(distinct bi.bout_id), 'first_observed_at', min(bi.first_observed_at), 'last_observed_at', max(bi.last_observed_at))
               from public.boxing_bout_identities bi join bouts b on b.id = bi.bout_id where bi.namespace = 'the_odds_api.event' and bi.verification_state = 'verified'),
    'videos', (select coalesce(jsonb_agg(public.boxing_site_video_card(v.id) order by v.published_at nulls last), '[]'::jsonb)
               from public.boxing_videos v
               where exists (select 1 from public.boxing_video_links l where l.video_id = v.id and (l.event_id = p_event or l.bout_id in (select id from bouts)))
                 and public.boxing_site_video_card(v.id) is not null))
$$;

-- ---------------------------------------------------------------------------
-- Promoters AS LISTED on official commission sheets (not canonical entities,
-- no inferred affiliation). Different spellings stay separate.
-- ---------------------------------------------------------------------------

create or replace function public.boxing_site_promoter_key(p_name text)
returns text language sql immutable set search_path = '' as $$
  select nullif(trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g')), '')
$$;

create or replace function public.boxing_site_sheet_promoters()
returns table (promoter_key text, name text, event_id uuid)
language sql stable set search_path = '' as $$
  select public.boxing_site_promoter_key(pr), pr, ei.event_id
  from public.boxing_site_sheet_events() se
  join public.boxing_event_identities ei on ei.external_id = se.source_event_id and ei.source_id = se.source_id and ei.verification_state <> 'rejected'
  cross join lateral jsonb_array_elements_text(se.promoters) pr
  where public.boxing_site_promoter_key(pr) is not null
$$;

create or replace function public.boxing_site_promoters()
returns jsonb language sql stable set search_path = '' as $$
  with p as (select * from public.boxing_site_sheet_promoters()),
  agg as (
    select p.promoter_key, min(p.name) name, count(distinct p.event_id) cards, min(e.event_date) first_date, max(e.event_date) last_date,
           coalesce(jsonb_agg(distinct c.slug) filter (where c.slug is not null), '[]'::jsonb) commissions,
           count(distinct v.city) cities, count(distinct b.id) bouts
    from p join public.boxing_events e on e.id = p.event_id
    left join public.boxing_commissions c on c.id = e.commission_id
    left join public.boxing_venues v on v.id = e.venue_id
    left join public.boxing_bouts b on b.event_id = e.id and b.status is distinct from 'cancelled'
    group by p.promoter_key)
  select jsonb_build_object(
    'listed_names', (select count(*) from agg),
    'cards_with_sheet', (select count(distinct event_id) from p),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('key', a.promoter_key, 'name', a.name, 'cards', a.cards, 'first_date', a.first_date, 'last_date', a.last_date,
               'commissions', a.commissions, 'cities', a.cities, 'bouts', a.bouts) order by a.last_date desc, a.cards desc, a.name), '[]'::jsonb) from agg a))
$$;

create or replace function public.boxing_site_promoter(p_key text)
returns jsonb language sql stable set search_path = '' as $$
  with allp as (select * from public.boxing_site_sheet_promoters()),
  p as (select * from allp where promoter_key = p_key),
  ev as (select distinct event_id from p)
  select case when not exists (select 1 from p) then null else jsonb_build_object(
    'key', p_key,
    'names', (select jsonb_agg(distinct name) from p),
    'cards', (select coalesce(jsonb_agg(public.boxing_site_event_summary(e.id, true) order by e.event_date desc), '[]'::jsonb) from ev join public.boxing_events e on e.id = ev.event_id),
    'co_promoters', (select coalesce(jsonb_agg(jsonb_build_object('key', x.promoter_key, 'name', x.name, 'shared_cards', x.n) order by x.n desc, x.name), '[]'::jsonb) from (
        select a.promoter_key, min(a.name) name, count(distinct a.event_id) n from allp a where a.event_id in (select event_id from ev) and a.promoter_key <> p_key group by 1) x),
    'venues', (select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'city', x.city, 'region', x.region, 'cards', x.n) order by x.n desc, x.name), '[]'::jsonb) from (
        select v.name, v.city, v.region, count(*) n from ev join public.boxing_events e on e.id = ev.event_id join public.boxing_venues v on v.id = e.venue_id group by 1, 2, 3) x),
    'fighters', (select coalesce(jsonb_agg(jsonb_build_object('public_id', f.public_id, 'name', f.display_name, 'appearances', y.n) order by y.n desc, f.display_name), '[]'::jsonb) from (
        select public.boxing_canonical_fighter_id(bp.fighter_id) fid, count(distinct b.id) n
        from ev join public.boxing_bouts b on b.event_id = ev.event_id and b.status is distinct from 'cancelled'
        join public.boxing_bout_participants bp on bp.bout_id = b.id and bp.participant_status in ('scheduled','confirmed') group by 1) y
        join public.boxing_fighters f on f.id = y.fid),
    'title_bouts', (select count(distinct bt.bout_id) from ev join public.boxing_bouts b on b.event_id = ev.event_id join public.boxing_bout_titles bt on bt.bout_id = b.id),
    'videos', (select coalesce(jsonb_agg(public.boxing_site_video_card(l.video_id)), '[]'::jsonb) from public.boxing_video_links l
               where l.entity_type = 'promoter' and l.promoter_key = p_key and public.boxing_site_video_card(l.video_id) is not null)) end
$$;

create or replace function public.boxing_site_event(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select e.* from public.boxing_events e where public.boxing_site_ref_matches(e.public_id, p_ref)),
  e as (select * from hit where (select count(*) from hit) = 1),
  sheet as (
    select se.* from e join public.boxing_event_identities ei on ei.event_id = e.id and ei.verification_state <> 'rejected'
    join public.boxing_site_sheet_events() se on se.source_event_id = ei.external_id and se.source_id = ei.source_id limit 1)
  select jsonb_build_object(
    'event', public.boxing_site_event_summary(e.id, false),
    'bouts', (select coalesce(jsonb_agg(public.boxing_site_bout_compact(b.id, (select bouts from sheet)) order by b.bout_order nulls last, b.public_id), '[]'::jsonb)
              from public.boxing_bouts b where b.event_id = e.id and b.status is distinct from 'cancelled'),
    'timeline', public.boxing_site_event_timeline(e.id),
    'cancelled_bouts', (select count(*) from public.boxing_bouts b where b.event_id = e.id and b.status = 'cancelled'),
    'card_changes', (select jsonb_build_object('count', count(*), 'latest_at', max(cc.detected_at),
                       'by_type', coalesce((select jsonb_object_agg(t.change_type, t.n) from (select change_type, count(*) n from public.boxing_card_changes where event_id = e.id group by 1) t), '{}'::jsonb))
                     from public.boxing_card_changes cc where cc.event_id = e.id),
    'same_weekend', (select coalesce(jsonb_agg(jsonb_build_object('public_id', x.public_id, 'name', x.name, 'date', x.event_date, 'status', x.status,
                        'commission', (select c.name from public.boxing_commissions c where c.id = x.commission_id)) order by x.event_date, x.name), '[]'::jsonb)
                     from public.boxing_events x where x.id <> e.id and x.status is distinct from 'cancelled' and abs(x.event_date - e.event_date) <= 2))
  from e
$$;

create or replace function public.boxing_site_coverage(p_today date default current_date)
returns jsonb language sql stable set search_path = '' as $$
  with sheets as (
    select se.sheet_bouts, (select count(*) from public.boxing_bouts b where b.event_id = ei.event_id) canon
    from public.boxing_site_sheet_events() se
    join public.boxing_event_identities ei on ei.external_id = se.source_event_id and ei.source_id = se.source_id and ei.verification_state <> 'rejected')
  select jsonb_build_object(
    'as_of', now(),
    'fighters_with_bouts', (select count(distinct fighter_id) from public.boxing_site_participations()),
    'events', (select count(*) from public.boxing_events where status is distinct from 'cancelled'),
    'events_upcoming', (select count(*) from public.boxing_events where status is distinct from 'cancelled' and status is distinct from 'complete' and event_date >= p_today),
    'events_complete', (select count(*) from public.boxing_events where status = 'complete'),
    'bouts', (select count(*) from public.boxing_bouts where status is distinct from 'cancelled'),
    'upcoming_bouts', (select count(*) from public.boxing_site_participations() where side = 'a' and not event_complete),
    'official_results', (select count(*) from public.boxing_bout_results_current),
    'results_pending', (select count(*) from public.boxing_site_participations() v where v.side = 'a' and v.event_complete and v.result_code is null
                          and not exists (select 1 from public.boxing_bout_results_current r where r.bout_id = v.bout_id)),
    'bouts_with_scorecards', (select count(distinct bout_id) from public.boxing_scorecards_current),
    'scorecard_rounds', (select count(*) from public.boxing_scorecard_rounds),
    'judges', (select count(distinct official_id) from public.boxing_bout_officials where role = 'judge'),
    'referees', (select count(distinct official_id) from public.boxing_bout_officials where role = 'referee'),
    'sheet_bouts', (select coalesce(sum(sheet_bouts), 0) from sheets),
    'awaiting_verification', (select coalesce(sum(greatest(sheet_bouts - canon, 0)), 0) from sheets),
    'fighters_with_dna', (select count(distinct fighter_id) from public.boxing_fighter_metric_snapshots),
    'title_records', (select count(*) from public.boxing_titles),
    'title_events', (select count(*) from public.boxing_title_events),
    'ranking_snapshots', (select count(*) from public.boxing_ranking_snapshots),
    'matched_market_bouts', (select count(distinct bout_id) from public.boxing_bout_identities where namespace = 'the_odds_api.event' and verification_state = 'verified'),
    'captured_market_events_upcoming', (select count(*) from public.boxing_provider_events pe where pe.last_commence_time >= now()),
    'scorecard_decisions', (select count(distinct s.bout_id) from public.boxing_scorecards_current s join public.boxing_bout_results_current r on r.bout_id = s.bout_id),
    'officials_judges', (select count(distinct public.boxing_canonical_official_id(official_id)) from public.boxing_bout_officials where role = 'judge'),
    'officials_referees', (select count(distinct public.boxing_canonical_official_id(official_id)) from public.boxing_bout_officials where role = 'referee'),
    'video_channels_registered', (select count(*) from public.boxing_video_channels),
    'video_channels_enabled', (select count(*) from public.boxing_video_channels where enabled),
    'videos_published', (select count(*) from public.boxing_videos v join public.boxing_video_channels c on c.channel_id = v.channel_id where c.enabled and v.link_status = 'published'),
    'promoter_names_listed', (select count(distinct promoter_key) from public.boxing_site_sheet_promoters()),
    'commissions', (select coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'jurisdiction', c.jurisdiction,
                      'events', (select count(*) from public.boxing_events x where x.commission_id = c.id and x.status is distinct from 'cancelled'))
                      order by c.name), '[]'::jsonb) from public.boxing_commissions c))
$$;

create or replace function public.boxing_site_home(p_today date default current_date)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'today', p_today,
    'upcoming', (select coalesce(jsonb_agg(public.boxing_site_event_summary(e.id, true) order by e.event_date, e.name), '[]'::jsonb) from (
        select * from public.boxing_events where status is distinct from 'cancelled' and status is distinct from 'complete' and event_date >= p_today - 1
        order by event_date, name limit 24) e),
    'recent', (select coalesce(jsonb_agg(public.boxing_site_event_summary(e.id, true) order by e.event_date desc, e.name), '[]'::jsonb) from (
        select * from public.boxing_events where status = 'complete' and event_date <= p_today
        order by event_date desc, name limit 10) e),
    'latest_results', (select coalesce(jsonb_agg(x.j order by x.event_date desc, x.bout_order desc), '[]'::jsonb) from (
        select public.boxing_site_bout_compact(b.id, public.boxing_site_event_sheet(e.id)) || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date)) j,
               e.event_date, b.bout_order
        from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
        join public.boxing_bout_results_current r on r.bout_id = b.id
        where e.event_date <= p_today order by e.event_date desc, b.scheduled_rounds desc nulls last, b.bout_order desc limit 8) x),
    'scorecard_watch', (select coalesce(jsonb_agg(x.j order by x.event_date desc), '[]'::jsonb) from (
        select public.boxing_site_bout_compact(b.id, public.boxing_site_event_sheet(e.id)) || jsonb_build_object('event', jsonb_build_object('public_id', e.public_id, 'name', e.name, 'date', e.event_date)) j, e.event_date
        from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
        join public.boxing_bout_results_current r on r.bout_id = b.id and r.decision_type in ('split', 'majority')
        where (select count(*) from public.boxing_scorecards_current s where s.bout_id = b.id and s.fighter_a_total is not null) >= 3
        order by e.event_date desc, b.scheduled_rounds desc nulls last limit 3) x),
    'dna_feature', (select jsonb_build_object('fighter', public.boxing_site_fighter_head(t.fighter_id), 'record', public.boxing_site_record(t.fighter_id),
                      'dna', public.boxing_site_dna(t.fighter_id), 'available_metrics', t.n)
                    from (select s.fighter_id, count(distinct s.metric_key) filter (where s.status = 'available') n
                          from (select distinct on (fighter_id, metric_key) * from public.boxing_fighter_metric_snapshots order by fighter_id, metric_key, as_of desc, created_at desc) s
                          join public.boxing_fighters f on f.id = s.fighter_id and f.merged_into_id is null
                          group by s.fighter_id order by n desc, s.fighter_id limit 1) t),
    'officials_watch', jsonb_build_object(
        'judge', (select r from jsonb_array_elements(public.boxing_site_officials('judge', null, 30, 0) -> 'rows') r
                  where exists (select 1 from jsonb_array_elements(r -> 'metrics') m where m ->> 'key' = 'judge.avg_card_margin' and m ->> 'status' = 'available')
                  order by (r ->> 'cards')::int desc limit 1),
        'referee', (select r from jsonb_array_elements(public.boxing_site_officials('referee', null, 30, 0) -> 'rows') r
                    where exists (select 1 from jsonb_array_elements(r -> 'metrics') m where m ->> 'key' = 'referee.stoppage_rate' and m ->> 'status' = 'available')
                    order by (r ->> 'assignments')::int desc limit 1)),
    'market_index', public.boxing_site_market_index(p_today),
    'coverage', public.boxing_site_coverage(p_today))
$$;

select public.boxing_lockdown();

commit;
