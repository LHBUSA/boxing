-- PropBetEdge Boxing — repeat-pairing provenance in identity graph context (issue #10).
--
-- Review tooling could not tell a legitimate repeat pairing (the same two boxers
-- twice on one official card: source bout ids "<pair>" and "<pair>|2", distinct
-- sheet orders) from a duplicate canonical bout, and showed preserved
-- parser-correction revisions as if they were current results. Each candidate
-- bout now carries: source bout identities, repeat index, official sheet order,
-- the current canonical result, and every result revision with its change reason.
-- No threshold, table or decision changes. Rerunnable.

begin;

create or replace function public.boxing_identity_graph_context(p_ids uuid[])
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'display_name', f.display_name,
    'identity_state', f.identity_state,
    'hometowns', (select coalesce(jsonb_agg(distinct h.h), '[]'::jsonb) from (
        select f.hometown as h where f.hometown is not null
        union select c.value #>> '{}' from public.boxing_fighter_attribute_claims c
        where c.fighter_id = f.id and c.attribute = 'hometown') h),
    'aliases', (select coalesce(jsonb_agg(jsonb_build_object('alias', a.alias, 'kind', a.kind, 'verification_state', a.verification_state)
                order by a.created_at), '[]'::jsonb) from public.boxing_fighter_aliases a where a.fighter_id = f.id),
    'identities', (select coalesce(jsonb_agg(jsonb_build_object('namespace', i.namespace, 'external_id', i.external_id,
                   'verification_state', i.verification_state, 'source_key', s.source_key) order by i.namespace), '[]'::jsonb)
                   from public.boxing_fighter_identities i join public.boxing_sources s on s.id = i.source_id
                   where i.fighter_id = f.id and s.access_mode in ('approved_ingest','identity_only')),
    'bouts', (select coalesce(jsonb_agg(jsonb_build_object(
        'bout_id', b.id, 'event_id', e.id, 'date', e.event_date, 'status', b.status, 'bout_order', b.bout_order, 'side', p.side,
        'commission', cm.slug, 'jurisdiction', cm.jurisdiction, 'venue_id', e.venue_id, 'venue', v.name, 'city', v.city, 'region', v.region,
        'opponent_id', op.fighter_id, 'opponent_name', ofi.display_name, 'weight_class', wc.class_key,
        'weight_lb', (select w.official_weight_lb from public.boxing_weigh_ins w where w.bout_id = b.id and w.fighter_id = p.fighter_id
                      and not exists (select 1 from public.boxing_weigh_ins n where n.supersedes_id = w.id)
                      order by w.attempt_no desc, w.revision desc limit 1),
        'source_bout_ids', (select coalesce(jsonb_agg(jsonb_build_object('namespace', bi.namespace, 'external_id', bi.external_id,
                              'repeat_index', coalesce((substring(bi.external_id from '\|([0-9]+)$'))::int, 1)) order by bi.namespace, bi.external_id), '[]'::jsonb)
                            from public.boxing_bout_identities bi where bi.bout_id = b.id and bi.verification_state <> 'rejected'),
        'result', (select case when r.outcome = 'win' and r.winner_id = p.fighter_id then 'win' when r.outcome = 'win' then 'loss' else r.outcome end
                   from public.boxing_bout_results r where r.bout_id = b.id order by r.revision desc limit 1),
        'result_revisions', (select coalesce(jsonb_agg(jsonb_build_object('revision', r.revision,
                               'result', case when r.outcome = 'win' and r.winner_id = p.fighter_id then 'win' when r.outcome = 'win' then 'loss' else r.outcome end,
                               'method', r.method, 'change_reason', r.change_reason, 'recorded_at', r.captured_at) order by r.revision), '[]'::jsonb)
                             from public.boxing_bout_results r where r.bout_id = b.id)
      ) order by e.event_date, b.bout_order nulls last, b.id), '[]'::jsonb)
      from public.boxing_bout_participants p
      join public.boxing_bouts b on b.id = p.bout_id
      join public.boxing_events e on e.id = b.event_id
      left join public.boxing_commissions cm on cm.id = e.commission_id
      left join public.boxing_venues v on v.id = e.venue_id
      left join public.boxing_weight_classes wc on wc.id = b.weight_class_id
      left join public.boxing_bout_participants op on op.bout_id = b.id and op.fighter_id <> p.fighter_id and op.participant_status in ('scheduled','confirmed')
      left join public.boxing_fighters ofi on ofi.id = op.fighter_id
      where p.fighter_id = f.id and p.participant_status in ('scheduled','confirmed'))
  ) order by f.id), '[]'::jsonb)
  from public.boxing_fighters f
  where f.id in (select distinct public.boxing_canonical_fighter_id(x) from unnest(p_ids) x)
$$;

select public.boxing_lockdown();

commit;
