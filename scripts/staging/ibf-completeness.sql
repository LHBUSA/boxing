-- IBF ranking completeness on the Boxing database (read-only). Per division: first/last stored month, months stored,
-- months missing INSIDE that range (listed, never inferred), and duplicate snapshots for one month. A missing month is
-- a month the IBF feed did not give us a dated record for; nothing is filled in.
with ibf as (select id from public.boxing_organizations where slug = 'ibf'),
snaps as (
  select wc.class_key, r.effective_on, r.id, r.supersedes_id, date_trunc('month', r.effective_on)::date m
  from public.boxing_ranking_snapshots r join public.boxing_weight_classes wc on wc.id = r.weight_class_id
  where r.organization_id = (select id from ibf) and r.gender_scope = 'male'
),
per_div as (
  select class_key, min(m) first_m, max(m) last_m, count(distinct m) months,
    (select count(*) from generate_series(min(m), max(m), interval '1 month')) span_months
  from snaps group by class_key
),
missing as (
  select d.class_key, to_char(g, 'YYYY-MM') mo
  from per_div d cross join lateral generate_series(d.first_m, d.last_m, interval '1 month') g
  where not exists (select 1 from snaps s where s.class_key = d.class_key and s.m = g::date)
),
dups as (
  -- two current (not superseded) snapshots for the same division and month would be a duplicate
  select class_key, to_char(m, 'YYYY-MM') mo, count(*) n from snaps s
  where not exists (select 1 from snaps x where x.supersedes_id = s.id)
  group by class_key, m having count(*) > 1
)
select jsonb_build_object(
  'divisions', (select jsonb_agg(jsonb_build_object('division', class_key, 'first', to_char(first_m, 'YYYY-MM'), 'last', to_char(last_m, 'YYYY-MM'),
      'months_stored', months, 'months_in_range', span_months, 'missing_inside_range', span_months - months) order by class_key) from per_div),
  'distinct_months_any_division', (select count(distinct m) from snaps),
  'ranking_snapshots', (select count(*) from snaps),
  'revisions', (select count(*) from snaps where supersedes_id is not null),
  'missing_months', (select coalesce(jsonb_object_agg(class_key, ms), '{}'::jsonb) from (select class_key, jsonb_agg(mo order by mo) ms from missing group by 1) x),
  'duplicate_current_snapshots', (select coalesce(jsonb_agg(jsonb_build_object('division', class_key, 'month', mo, 'n', n)), '[]'::jsonb) from dups),
  'refusals_recorded', (select coalesce(jsonb_agg(f), '[]'::jsonb) from public.boxing_source_backfill_checkpoints c, jsonb_array_elements(c.failures) f
      where c.job_key like 'ibf-%')
) as ibf;
