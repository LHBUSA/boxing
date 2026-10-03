-- Fight Record Coverage Gate (owner direction 2026-10-03). READ-ONLY scoreboard for the Boxing data sprint.
--
-- P0 universe, split by why a boxer is P0:
--   champion: a held / in-recess world, super, regular, interim or franchise belt in a body's latest own document
--   top15:    positions 1-15 in a body's latest ranking list
--   upcoming: a corner on a bout whose event is today or later
-- A P0 member is either RESOLVED to a PropBetEdge fighter (through recorded identity decisions or the body's own boxer
-- id, never a name) or IDENTITY UNRESOLVED (as printed by the body). For resolved fighters it reports: a sourced record
-- claim, the ledger, and the reconciliation class (COMPLETE / PARTIAL / CONFLICT / UNKNOWN).
with latest_status as (
  select distinct on (s.organization_id, s.weight_class_id, s.document_kind) s.id, s.organization_id
  from public.boxing_title_status_snapshots s
  order by s.organization_id, s.weight_class_id, s.document_kind, coalesce(s.as_of, s.published_on) desc nulls last, s.retrieved_at desc
), champions as (
  select 'champion' why, o.slug body, t.holder_source_name printed,
    public.boxing_org_effective_fighter(ls.organization_id, t.fighter_id, t.holder_source_name, t.holder_country, t.holder_org_boxer_id, false) fighter_id
  from latest_status ls join public.boxing_title_status_entries t on t.snapshot_id = ls.id join public.boxing_organizations o on o.id = ls.organization_id
  where t.holder_status in ('held', 'in_recess') and t.holder_source_name is not null and t.tier in ('world', 'super', 'regular', 'interim', 'franchise')
), latest_rank as (
  select distinct on (r.organization_id, r.weight_class_id) r.id, r.organization_id
  from public.boxing_ranking_snapshots r order by r.organization_id, r.weight_class_id, r.effective_on desc nulls last, r.captured_at desc
), top15 as (
  select 'top15' why, o.slug body, e.source_name printed,
    public.boxing_org_effective_fighter(lr.organization_id, e.fighter_id, e.source_name, e.metadata ->> 'nationality', e.metadata ->> 'source_fighter_id',
      coalesce((e.metadata ->> 'name_not_printed')::boolean, false)) fighter_id
  from latest_rank lr join public.boxing_ranking_entries e on e.snapshot_id = lr.id join public.boxing_organizations o on o.id = lr.organization_id
  where e.position between 1 and 15 and e.source_name is not null
), upcoming as (
  select 'upcoming' why, null::text body, f.display_name printed, p.fighter_id
  from public.boxing_bout_participants p join public.boxing_bouts b on b.id = p.bout_id join public.boxing_events ev on ev.id = b.event_id
  join public.boxing_fighters f on f.id = p.fighter_id
  where ev.event_date >= current_date
), p0 as (
  select why, body, printed, case when fighter_id is null then null else public.boxing_canonical_fighter_id(fighter_id) end fighter_id from champions
  union all select why, body, printed, case when fighter_id is null then null else public.boxing_canonical_fighter_id(fighter_id) end from top15
  union all select why, body, printed, public.boxing_canonical_fighter_id(fighter_id) from upcoming
), resolved as (
  select distinct p.why, p.fighter_id from p0 p where p.fighter_id is not null
), unresolved as (
  select distinct p.why, p.body, lower(p.printed) printed from p0 p where p.fighter_id is null
), fighter_state as (
  select r.why, r.fighter_id, rec.r ->> 'classification' class, (rec.r -> 'ledger' ->> 'bouts')::int ledger_bouts
  from resolved r cross join lateral (select public.boxing_fighter_record_reconciliation(r.fighter_id) r) rec
), per_why as (
  select w.why,
    (select count(*) from resolved r where r.why = w.why) + (select count(*) from unresolved u where u.why = w.why) p0_total,
    (select count(*) from unresolved u where u.why = w.why) identity_unresolved,
    (select count(*) from resolved r where r.why = w.why) resolved,
    (select count(*) from fighter_state f where f.why = w.why and f.class <> 'UNKNOWN') sourced_record,
    (select count(*) from fighter_state f where f.why = w.why and f.class = 'COMPLETE') ledger_complete,
    (select count(*) from fighter_state f where f.why = w.why and f.class = 'PARTIAL') ledger_partial,
    (select count(*) from fighter_state f where f.why = w.why and f.class = 'CONFLICT') conflict,
    (select count(*) from fighter_state f where f.why = w.why and f.class = 'UNKNOWN') no_record_source,
    (select count(*) from fighter_state f where f.why = w.why and coalesce(f.ledger_bouts, 0) = 0) zero_bouts
  from (values ('champion'), ('top15'), ('upcoming')) w(why)
)
select jsonb_build_object(
  'generated_at', now(),
  'rule', 'fight-record-coverage@1 (read-only)',
  'by_reason', (select jsonb_object_agg(why, to_jsonb(p) - 'why') from per_why p),
  'p0_distinct_resolved_fighters', (select count(distinct fighter_id) from resolved),
  'p0_distinct_unresolved_names', (select count(*) from (select distinct body, printed from unresolved) x),
  'all_fighters_with_record_claim', (select count(distinct fighter_id) from public.boxing_fighter_record_claims where parse_state = 'parsed'),
  'record_claims', (select jsonb_build_object('parsed', count(*) filter (where parse_state = 'parsed'), 'held', count(*) filter (where parse_state = 'held'))
                    from public.boxing_fighter_record_claims)
) as coverage;
