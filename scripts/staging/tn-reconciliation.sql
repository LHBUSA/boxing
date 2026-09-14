-- Tennessee reconciliation on Boxing STAGING (read-only): source bouts -> appearances -> held appearances -> review items -> canonical
-- fighters -> created bouts, and every result document with its terminal state. Run with Invoke-BoxingStagingSql; see
-- reviews/commissions/2026-09-14-tennessee-reconciliation.md.
with src as (select id from public.boxing_sources where source_key = 'tn_athletic_commission'),
docs as (
  select d.doc_key, d.status, d.url, d.last_error, d.classification ->> 'reason' reason, d.current_revision, r.observation_id, r.parser_version
  from public.boxing_source_documents d
  left join public.boxing_source_document_revisions r on r.document_id = d.id and r.revision = d.current_revision
  where d.source_id in (select id from src) and d.kind = 'results'
),
src_bouts as (
  select dc.doc_key, b ->> 'source_bout_id' sbid, b -> 'fighter_a' ->> 'display_name' a_name, b -> 'fighter_b' ->> 'display_name' b_name,
    (b -> 'result' ->> 'resolved')::boolean resolved, b -> 'result' ->> 'outcome' outcome
  from docs dc join public.boxing_source_observations o on o.id = dc.observation_id
  cross join lateral jsonb_array_elements(coalesce(o.payload -> 'bouts', '[]'::jsonb)) b
  where dc.status = 'parsed'
),
mapped as (select external_id, bout_id from public.boxing_bout_identities where namespace = 'tn-athletic-commission.bout'),
appearances as (
  select sb.doc_key, sb.sbid, s.side, case s.side when 'a' then sb.a_name else sb.b_name end as name, m.bout_id is not null as bout_created
  from src_bouts sb left join mapped m on m.external_id = sb.sbid cross join (values ('a'), ('b')) s(side)
),
latest_dec as (
  select distinct on (appearance_key) appearance_key, decision, tier, decided_by, fighter_id, review_item_id
  from public.boxing_identity_appearance_decisions where namespace = 'tn-athletic-commission.fighter' order by appearance_key, seq desc
),
app as (
  select a.*, ld.decision, ld.tier, ld.decided_by, ld.review_item_id,
    case when a.bout_created then 'resolved_in_created_bout' when ld.decision = 'review' then 'held' else 'resolved_in_held_bout' end as state
  from appearances a left join latest_dec ld on ld.appearance_key = a.sbid || '|' || a.side
),
held_bouts as (select sbid, count(*) filter (where state = 'held') held_sides from app where not bout_created group by sbid),
queue as (select id, raw_name, status, reason from public.boxing_identity_review_queue where namespace = 'tn-athletic-commission.fighter'),
fighter_ids as (select distinct fighter_id from public.boxing_fighter_identities where namespace = 'tn-athletic-commission.fighter'),
created_links as (
  select distinct l.entity_id from public.boxing_observation_links l join public.boxing_source_observations o on o.id = l.observation_id
  where o.source_id in (select id from src) and l.entity_type = 'fighter' and l.link_role = 'created'
)
select jsonb_build_object(
  'documents', (select jsonb_object_agg(status, n) from (select status, count(*) n from docs group by 1) x),
  'document_rows', (select jsonb_agg(jsonb_build_object('doc_key', doc_key, 'status', status, 'reason', coalesce(reason, last_error), 'parser', parser_version,
       'bouts', (select count(*) from src_bouts sb where sb.doc_key = docs.doc_key)) order by doc_key) from docs),
  'source_bouts', (select count(*) from src_bouts),
  'source_bouts_distinct_ids', (select count(distinct sbid) from src_bouts),
  'source_bouts_result_resolved', (select count(*) from src_bouts where resolved),
  'bouts_created', (select count(*) from src_bouts sb join mapped m on m.external_id = sb.sbid),
  'bouts_held', (select count(*) from src_bouts sb left join mapped m on m.external_id = sb.sbid where m.bout_id is null),
  'canonical_bouts_tn_source', (select count(*) from public.boxing_bouts b where b.source_id in (select id from src)),
  'bout_identities_tn', (select count(*) from mapped),
  'appearances', (select count(*) from app),
  'appearance_states', (select jsonb_object_agg(state, n) from (select state, count(*) n from app group by 1) x),
  'held_bouts_by_held_sides', (select jsonb_object_agg(held_sides, n) from (select held_sides, count(*) n from held_bouts group by 1) x),
  'held_appearances_without_decision', (select count(*) from app where not bout_created and decision is null),
  'held_appearance_decisions', (select jsonb_object_agg(k, n) from (select coalesce(tier, '-') || ':' || coalesce(decision, 'none') || ':' || coalesce(decided_by, '-') k, count(*) n from app where state = 'held' group by 1) x),
  'held_distinct_names', (select count(distinct name) from app where state = 'held'),
  'held_appearances_with_review_item', (select count(*) from app where state = 'held' and review_item_id is not null),
  'held_distinct_review_items', (select count(distinct review_item_id) from app where state = 'held'),
  'queue', (select jsonb_object_agg(status || ':' || reason, n) from (select status, reason, count(*) n from queue group by 1, 2) x),
  'queue_pending', (select count(*) from queue where status = 'pending'),
  'queue_pending_names_not_held_now', (select count(*) from queue q where q.status = 'pending' and not exists (select 1 from app a where a.state = 'held' and a.name = q.raw_name)),
  'held_names_without_pending_item', (select count(distinct a.name) from app a where a.state = 'held' and not exists (select 1 from queue q where q.status = 'pending' and q.raw_name = a.name)),
  'held_items_names_differ', (select count(*) from app a join queue q on q.id = a.review_item_id where a.state = 'held' and q.raw_name <> a.name),
  'appearances_per_pending_item', (select jsonb_object_agg(k, n) from (select k, count(*) n from (select q.id, count(a.*) k from queue q left join app a on a.state = 'held' and a.review_item_id = q.id where q.status = 'pending' group by q.id) y group by k) x),
  'tn_fighter_identities', (select count(*) from fighter_ids),
  'tn_fighters_created_by_tn', (select count(*) from created_links),
  'tn_fighters_in_created_bouts', (select count(distinct p.fighter_id) from public.boxing_bout_participants p join mapped m on m.bout_id = p.bout_id),
  'tn_fighters_in_created_bouts_also_other_sources', (select count(distinct p.fighter_id) from public.boxing_bout_participants p join mapped m on m.bout_id = p.bout_id
     where exists (select 1 from public.boxing_fighter_identities fi where fi.fighter_id = p.fighter_id and fi.namespace <> 'tn-athletic-commission.fighter'))
) r;
