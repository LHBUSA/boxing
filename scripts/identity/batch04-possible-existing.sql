-- Batch 04 review packet (read-only): every subject whose latest seed decision is POSSIBLE_EXISTING_FIGHTER, each
-- candidate existing fighter with the evidence the owner prioritised, ranked:
--   1. commission bout evidence  2. verified external ids  3. verified Wikidata identity  4. body participation
-- Proposes body-entry LINKS to an existing fighter only. Creates nothing, merges nothing.
with latest as (
  select distinct on (subject_key) * from public.boxing_identity_seed_decisions order by subject_key, decided_at desc
), cand as (
  select l.subject_key, l.batch, l.source_claims, e ->> 'match' match,
    public.boxing_canonical_fighter_id((e ->> 'fighter_id')::uuid) fighter_id
  from latest l cross join lateral jsonb_array_elements(l.evidence -> 'existing_fighters') e
  where l.decision = 'POSSIBLE_EXISTING_FIGHTER'
), ev as (
  select c.*, f.display_name candidate_name,
    (select count(*) from public.boxing_bout_participants bp join public.boxing_bouts b on b.id = bp.bout_id
       join public.boxing_sources s on s.id = b.source_id
       where public.boxing_canonical_fighter_id(bp.fighter_id) = c.fighter_id and s.source_kind = 'commission') commission_bouts,
    (select max(e.event_date) from public.boxing_bout_participants bp join public.boxing_bouts b on b.id = bp.bout_id
       join public.boxing_events e on e.id = b.event_id
       where public.boxing_canonical_fighter_id(bp.fighter_id) = c.fighter_id) last_bout,
    (select coalesce(jsonb_agg(distinct fi.namespace || ':' || fi.external_id), '[]'::jsonb) from public.boxing_fighter_identities fi
       where public.boxing_canonical_fighter_id(fi.fighter_id) = c.fighter_id and fi.verification_state = 'verified' and fi.namespace <> 'wikidata.item') verified_external_ids,
    (select fi.external_id from public.boxing_fighter_identities fi
       where public.boxing_canonical_fighter_id(fi.fighter_id) = c.fighter_id and fi.verification_state = 'verified' and fi.namespace = 'wikidata.item' limit 1) wikidata_qid,
    (select count(*) from public.boxing_org_identity_candidate_decisions d where d.decision = 'matched' and public.boxing_canonical_fighter_id(d.fighter_id) = c.fighter_id) body_links_already,
    jsonb_array_length(c.source_claims) body_entries,
    (select jsonb_agg(distinct x ->> 'body') from jsonb_array_elements(c.source_claims) x) bodies,
    (select jsonb_agg(distinct x ->> 'printed') from jsonb_array_elements(c.source_claims) x) printed,
    (select jsonb_agg(distinct x ->> 'country') from jsonb_array_elements(c.source_claims) x where x ->> 'country' is not null) countries,
    (select jsonb_agg(distinct x ->> 'division') from jsonb_array_elements(c.source_claims) x) divisions,
    (select count(*) from jsonb_array_elements(c.source_claims) x where x ->> 'cluster_state' = 'ambiguous') ambiguous_entries,
    count(*) over (partition by c.subject_key) candidates_for_subject
  from cand c join public.boxing_fighters f on f.id = c.fighter_id
)
select jsonb_agg(to_jsonb(ev) - 'source_claims' order by (commission_bouts > 0) desc, (jsonb_array_length(verified_external_ids) > 0) desc,
  (wikidata_qid is not null) desc, body_entries desc, commission_bouts desc, subject_key) packet
from ev;
