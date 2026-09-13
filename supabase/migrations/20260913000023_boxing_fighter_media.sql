-- PropBetEdge Boxing — rights-aware fighter media.
--
-- A fighter image is displayable only when its row records a free or granted
-- license, the author and credit, the source page, and the evidence that the
-- image shows THIS boxer, and review_state = 'approved'. Everything else falls
-- back to the PropBetEdge silhouette in the frontend. Usage is editorial
-- identification on pages about the boxer; never advertising or promotion.
-- Assets are stored by PropBetEdge (asset_url); nothing is hotlinked.

begin;

create table if not exists public.boxing_fighter_media (
  id uuid primary key default gen_random_uuid(),
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  kind text not null default 'portrait' check (kind in ('portrait')),
  asset_url text not null check (asset_url ~ '^(/media/|https://)'),
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  focus text,
  source_kind text not null check (source_kind in ('wikimedia_commons','owned','licensed','permission')),
  source_url text not null check (source_url ~ '^https://'),
  license text not null,
  license_url text,
  author text not null,
  credit text not null,
  identity_method text not null,
  identity_evidence text not null,
  usage text not null default 'editorial_identification' check (usage in ('editorial_identification')),
  review_state text not null default 'review' check (review_state in ('approved','review','rejected')),
  review_rule text,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boxing_fighter_media_approved_complete check (review_state <> 'approved' or (review_rule is not null and length(identity_evidence) >= 20))
);
create unique index if not exists boxing_fighter_media_one_approved on public.boxing_fighter_media (fighter_id, kind) where review_state = 'approved';
drop trigger if exists boxing_fighter_media_touch on public.boxing_fighter_media;
create trigger boxing_fighter_media_touch before update on public.boxing_fighter_media
  for each row execute function public.boxing_touch_updated_at();

create or replace function public.boxing_site_portrait(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('src', m.asset_url, 'width', m.width, 'height', m.height, 'focus', m.focus,
                            'credit', m.credit, 'license', m.license, 'license_url', m.license_url, 'source_url', m.source_url)
  from public.boxing_fighter_media m
  where m.fighter_id = public.boxing_canonical_fighter_id(p_fighter) and m.kind = 'portrait' and m.review_state = 'approved'
  limit 1
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
                                    'weigh_in', public.boxing_site_weigh_in(b.id, c.fighter_id), 'portrait', public.boxing_site_portrait(c.fighter_id)) from corners c where c.side = 'a'),
    'b', (select jsonb_build_object('public_id', c.public_id, 'name', c.display_name, 'corner', (select s ->> 'b_corner' from sheet),
                                    'weigh_in', public.boxing_site_weigh_in(b.id, c.fighter_id), 'portrait', public.boxing_site_portrait(c.fighter_id)) from corners c where c.side = 'b'),
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

create or replace function public.boxing_site_fighter_head(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('public_id', f.public_id, 'name', f.display_name, 'nickname', f.nickname,
    'stance', nullif(f.stance::text, 'unknown'), 'height_cm', f.height_cm, 'reach_cm', f.reach_cm, 'nationality', f.nationality, 'sex', f.sex,
    'career_status', f.career_status, 'portrait', public.boxing_site_portrait(f.id))
  from public.boxing_fighters f where f.id = p_fighter
$$;

create or replace function public.boxing_site_fighters(p_q text default null, p_limit int default 50, p_offset int default 0)
returns jsonb language sql stable set search_path = '' as $$
  with agg as (
    select v.fighter_id, count(*) filter (where v.event_complete) bouts, max(v.event_date) last_date,
           count(*) filter (where v.result_code = 'W') wins, count(*) filter (where v.result_code = 'L') losses,
           count(*) filter (where v.result_code = 'D') draws, count(*) filter (where v.result_code in ('NC','ND')) nc,
           count(*) filter (where not v.event_complete) upcoming
    from public.boxing_site_participations() v group by v.fighter_id),
  q as (select lower(regexp_replace(coalesce(p_q, ''), '[^[:alnum:] ]', '', 'g')) t),
  base as (
    select f.id, f.public_id, f.display_name, a.* from agg a join public.boxing_fighters f on f.id = a.fighter_id, q
    where f.merged_into_id is null
      and (q.t = '' or f.normalized_name like '%' || q.t || '%' or lower(f.display_name) like '%' || q.t || '%')),
  page as (select * from base order by bouts desc, last_date desc nulls last, display_name
           limit greatest(1, least(coalesce(p_limit, 50), 100)) offset greatest(0, coalesce(p_offset, 0)))
  select jsonb_build_object('q', nullif(p_q, ''), 'total', (select count(*) from base),
    'limit', greatest(1, least(coalesce(p_limit, 50), 100)), 'offset', greatest(0, coalesce(p_offset, 0)),
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('public_id', p.public_id, 'name', p.display_name, 'portrait', public.boxing_site_portrait(p.id),
        'record', jsonb_build_object('bouts', p.bouts, 'wins', p.wins, 'losses', p.losses, 'draws', p.draws, 'no_contests', p.nc),
        'upcoming', p.upcoming, 'last_date', p.last_date,
        'division', (select jsonb_build_object('class_key', wc.class_key, 'class_name', wc.name)
                     from public.boxing_site_participations() v join public.boxing_bouts b on b.id = v.bout_id join public.boxing_weight_classes wc on wc.id = b.weight_class_id
                     where v.fighter_id = p.id order by v.event_date desc, v.bout_order desc limit 1),
        'commissions', (select coalesce(jsonb_agg(distinct c.slug), '[]'::jsonb) from public.boxing_site_participations() v join public.boxing_events e on e.id = v.event_id
                        join public.boxing_commissions c on c.id = e.commission_id where v.fighter_id = p.id))
      order by p.bouts desc, p.last_date desc nulls last, p.display_name), '[]'::jsonb) from page p))
$$;

select public.boxing_lockdown();

commit;
