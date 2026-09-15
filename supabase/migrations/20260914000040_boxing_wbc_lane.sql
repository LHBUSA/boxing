-- WBC lane (owner authorization 2026-09-15; staging first, production untouched).
--
-- Public sources, inspected 2026-09-15:
--   https://wbcboxing.com/main-ratings-es/  "CAMPEONES DEL MUNDO" grid (men) and the link to the month's men's ratings PDF
--   https://wbcboxing.com/mailing/<year>/WBC_RATINGS_<MONTH>_<year>.pdf  one page per division: title lines, numbered list
-- History: the public pages link only the current month's PDF; the two older PDFs linked anywhere on the site (May 2020,
-- August 2024) return 404. No other month is requested (no guessed file names).
--
-- Document kinds wbc_ratings / wbc_champions; tier 'international' for "WBC INT. CHAMPION" (not forced into another body's
-- vocabulary); WBC division labels as printed (PDF headers, and the Spanish names on the champions grid); WBC designations as
-- printed. FRANCHISE CHAMPION and EMERITUS CHAMPION are known WBC labels but were not in the inspected document.

begin;

do $$
declare c record;
begin
  for c in select conname from pg_catalog.pg_constraint
           where conrelid = 'public.boxing_title_status_snapshots'::regclass and contype = 'c'
             and pg_catalog.pg_get_constraintdef(oid) ilike '%document_kind%wbo_champions%'
  loop
    execute format('alter table public.boxing_title_status_snapshots drop constraint %I', c.conname);
  end loop;
  for c in select conname from pg_catalog.pg_constraint
           where conrelid = 'public.boxing_org_designations'::regclass and contype = 'c'
             and pg_catalog.pg_get_constraintdef(oid) ilike '%tier%diamond%'
  loop
    execute format('alter table public.boxing_org_designations drop constraint %I', c.conname);
  end loop;
end $$;
select public.boxing_ensure_constraint('public.boxing_title_status_snapshots', 'boxing_title_status_snapshots_document_kind',
  'check (document_kind in (''wba_ranking'',''wba_champions'',''ibf_rating'',''wbo_ratings'',''wbo_champions'',''wbc_ratings'',''wbc_champions''))');
select public.boxing_ensure_constraint('public.boxing_org_designations', 'boxing_org_designations_tier',
  'check (tier is null or tier in (''world'',''super'',''regular'',''interim'',''franchise'',''silver'',''diamond'',''gold'',''emeritus'',''regional'',''international'',''other''))');

insert into public.boxing_org_divisions (organization_id, gender_scope, native_label, weight_class_id)
select o.id, 'male', v.label, wc.id
from (values
  ('HEAVYWEIGHT','heavyweight'), ('BRIDGERWEIGHT','bridgerweight'), ('CRUISERWEIGHT','cruiserweight'), ('LT. HEAVYWEIGHT','light_heavyweight'),
  ('SUPERMIDDLEWEIGHT','super_middleweight'), ('MIDDLEWEIGHT','middleweight'), ('SUPERWELTERWEIGHT','super_welterweight'), ('WELTERWEIGHT','welterweight'),
  ('SUPERLIGHTWEIGHT','super_lightweight'), ('LIGHTWEIGHT','lightweight'), ('SUPERFEATHERWEIGHT','super_featherweight'), ('FEATHERWEIGHT','featherweight'),
  ('SUPERBANTAMWEIGHT','super_bantamweight'), ('BANTAMWEIGHT','bantamweight'), ('SUPERFLYWEIGHT','super_flyweight'), ('FLYWEIGHT','flyweight'),
  ('LT. FLYWEIGHT','light_flyweight'), ('STRAWWEIGHT','minimumweight'),
  ('Completo','heavyweight'), ('bridger','bridgerweight'), ('Crucero','cruiserweight'), ('Semicompleto','light_heavyweight'), ('Supermedio','super_middleweight'),
  ('Medio','middleweight'), ('Superwelter','super_welterweight'), ('Welter','welterweight'), ('Superligero','super_lightweight'), ('Ligero','lightweight'),
  ('Superpluma','super_featherweight'), ('Pluma','featherweight'), ('Supergallo','super_bantamweight'), ('Gallo','bantamweight'), ('Supermosca','super_flyweight'),
  ('Mosca','flyweight'), ('Minimosca','light_flyweight'), ('Paja','minimumweight')
) as v(label, class_key)
join public.boxing_organizations o on o.slug = 'wbc'
join public.boxing_weight_classes wc on wc.class_key = v.class_key
on conflict (organization_id, gender_scope, native_label) do nothing;

insert into public.boxing_org_designations (organization_id, native_label, normalized_label, tier, holder_status)
select o.id, v.label, upper(regexp_replace(btrim(v.label), '\s+', ' ', 'g')), v.tier, v.status
from (values
  ('CHAMPION', 'world', 'champion'), ('INTERIM CHAMPION', 'interim', 'champion'), ('CHAMPION IN RECESS', null, 'in_recess'),
  ('WBC SILVER CHAMPION', 'silver', 'champion'), ('WBC INT. CHAMPION', 'international', 'champion'),
  ('FRANCHISE CHAMPION', 'franchise', 'champion'), ('EMERITUS CHAMPION', 'emeritus', 'champion'),
  ('CAMPEONES DEL MUNDO', 'world', 'champion')
) as v(label, tier, status)
join public.boxing_organizations o on o.slug = 'wbc'
on conflict (organization_id, normalized_label) do nothing;

create or replace function public.boxing_derived_unification(p_weight_class_key text, p_gender text default 'male')
returns jsonb language sql stable set search_path = '' as $$
  with wc as (select id from public.boxing_weight_classes where class_key = p_weight_class_key),
  orgs as (select o.id, o.slug, o.short_name from public.boxing_organizations o where o.slug in ('wbc','wba','ibf','wbo')),
  latest as (
    select distinct on (s.organization_id) s.*
    from public.boxing_title_status_snapshots s
    where s.weight_class_id = (select id from wc) and s.gender_scope = p_gender and s.document_kind in ('wba_ranking','ibf_rating','wbo_ratings','wbc_ratings')
    order by s.organization_id, coalesce(s.as_of, s.published_on) desc, s.captured_at desc),
  newest as (select max(coalesce(as_of, published_on)) d from latest),
  primary_belt as (
    select distinct on (l.organization_id) l.organization_id, l.id snapshot_id, l.document_kind, coalesce(l.as_of, l.published_on) as_of,
      e.tier, e.holder_status, e.holder_source_name,
      public.boxing_org_effective_fighter(l.organization_id, e.fighter_id, e.holder_source_name, e.holder_country, e.holder_org_boxer_id) fighter_id
    from latest l join public.boxing_title_status_entries e on e.snapshot_id = l.id
    where e.tier in ('super','regular','world')
    order by l.organization_id, case e.tier when 'super' then 5 when 'world' then 10 else 20 end, e.seq),
  bodies as (
    select o.slug, o.short_name, l.id snapshot_id, l.document_kind, coalesce(l.as_of, l.published_on) as_of, p.tier, p.holder_status, p.holder_source_name, p.fighter_id,
      case when l.id is null then 'no_document'
           when coalesce(l.as_of, l.published_on) < (select d from newest) - 90 then 'document_stale'
           when exists (select 1 from public.boxing_title_conflicts c where (c.left_snapshot_id = l.id or c.right_snapshot_id = l.id)
                          and split_part(c.belt_key, '|', 1) = coalesce(p.tier, '')) then 'body_documents_disagree'
           when p.holder_status is null then 'no_primary_belt_listed'
           when p.holder_status <> 'held' then 'primary_belt_' || p.holder_status
           when p.fighter_id is null then 'holder_identity_unresolved'
           else 'resolved' end state
    from orgs o left join latest l on l.organization_id = o.id left join primary_belt p on p.organization_id = o.id),
  holders as (select fighter_id, array_agg(slug order by slug) bodies from bodies where state = 'resolved' group by fighter_id)
  select jsonb_build_object(
    'rule', 'pbe_undisputed@1',
    'label', 'PropBetEdge-derived from each body''s own primary champion; not a sanctioning-body designation. Source wording such as "unified" or "undisputed" is not used.',
    'status', case when exists (select 1 from holders where cardinality(bodies) = 4) then 'undisputed'
                   when exists (select 1 from holders where cardinality(bodies) between 2 and 3) then 'unified'
                   when exists (select 1 from bodies where state <> 'resolved' and state not like 'primary_belt_%') then 'incomplete'
                   else 'none' end,
    'complete', not exists (select 1 from bodies where state <> 'resolved' and state not like 'primary_belt_%'),
    'holders', (select coalesce(jsonb_agg(jsonb_build_object('fighter', f.public_id, 'display_name', f.display_name, 'bodies', to_jsonb(h.bodies),
                  'state', case when cardinality(h.bodies) = 4 then 'undisputed' when cardinality(h.bodies) >= 2 then 'unified' else 'single' end)), '[]'::jsonb)
                from holders h join public.boxing_fighters f on f.id = h.fighter_id),
    'bodies', (select jsonb_agg(jsonb_build_object('body', b.slug, 'state', b.state, 'document_kind', b.document_kind, 'as_of', b.as_of, 'tier', b.tier,
                 'holder_as_printed', b.holder_source_name, 'fighter', f.public_id) order by array_position(array['wbc','wba','ibf','wbo'], b.slug))
               from bodies b left join public.boxing_fighters f on f.id = b.fighter_id))
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
                      and s.document_kind in ('wba_ranking','ibf_rating','wbo_ratings','wbc_ratings') and coalesce(s.as_of, s.published_on) <= coalesce(p_as_of, current_date)
                    order by coalesce(s.as_of, s.published_on) desc, s.captured_at desc limit 1),
      'history', (select coalesce(jsonb_agg(jsonb_build_object('published_on', r.published_on, 'effective_on', r.effective_on) order by coalesce(r.effective_on, r.published_on) desc), '[]'::jsonb)
                  from public.boxing_ranking_snapshots r where r.organization_id = (select id from o) and r.weight_class_id = (select id from wc) and r.gender_scope = p_gender
                    and not exists (select 1 from public.boxing_ranking_snapshots n where n.supersedes_id = r.id)))
  end
$$;

create or replace function public.boxing_title_chain_pairs(p_org_slug text, p_limit int default 50)
returns jsonb language sql stable set search_path = '' as $$
  with o as (select id from public.boxing_organizations where slug = p_org_slug),
  chain as (
    select s.id, s.organization_id, s.weight_class_id, s.gender_scope, s.document_kind, coalesce(s.as_of, s.published_on) d,
      lag(s.id) over w prev_id, lag(coalesce(s.as_of, s.published_on)) over w prev_d
    from public.boxing_title_status_snapshots s
    where s.organization_id = (select id from o)
    window w as (partition by s.weight_class_id, s.gender_scope, s.document_kind order by coalesce(s.as_of, s.published_on), s.captured_at)),
  todo as (
    select c.* from chain c
    where c.prev_id is not null
      and not exists (select 1 from public.boxing_title_snapshot_diffs x where x.previous_snapshot_id = c.prev_id and x.current_snapshot_id = c.id)
    order by c.d, c.id limit p_limit)
  select coalesce(jsonb_agg(jsonb_build_object(
      'previous_snapshot_id', t.prev_id, 'current_snapshot_id', t.id, 'document_kind', t.document_kind, 'previous_on', t.prev_d, 'current_on', t.d,
      'previous', public.boxing_title_snapshot_json(t.prev_id), 'current', public.boxing_title_snapshot_json(t.id),
      'previous_ranking', case when t.document_kind in ('wba_ranking','ibf_rating','wbo_ratings','wbc_ratings') then public.boxing_title_ranking_entries_light(t.organization_id, t.weight_class_id, t.gender_scope, t.prev_d) end,
      'current_ranking', case when t.document_kind in ('wba_ranking','ibf_rating','wbo_ratings','wbc_ratings') then public.boxing_title_ranking_entries_light(t.organization_id, t.weight_class_id, t.gender_scope, t.d) end)
    order by t.d, t.id), '[]'::jsonb)
  from todo t
$$;

select public.boxing_lockdown();

commit;
