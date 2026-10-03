-- Fighter context gains body_claims (read-only; owner decision 2026-10-03, production fighter-page truthfulness fix).
--
-- A fighter linked to sanctioning-body entries (reviewed candidate decisions) can be a current world champion while
-- PropBetEdge still holds no verified bout for them. The dossier must show what the bodies print, labelled as the
-- bodies' own current records, instead of an empty bout-derived record. body_claims lists the CURRENT title-status
-- and ranking entries whose candidate cluster resolves to this fighter: body, division, role as printed (tier /
-- designation or rank), the name as printed, the document date and its source url. It is never a PropBetEdge-verified
-- fight fact and never feeds a record, a title history or Fight DNA. Nothing is written.

create or replace function public.boxing_site_fighter_body_claims(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  with latest_status as (
    select distinct on (s.organization_id, s.weight_class_id, s.document_kind) s.*
    from public.boxing_title_status_snapshots s
    order by s.organization_id, s.weight_class_id, s.document_kind, coalesce(s.as_of, s.published_on) desc nulls last, s.retrieved_at desc
  ), latest_rank as (
    select distinct on (r.organization_id, r.weight_class_id) r.*
    from public.boxing_ranking_snapshots r
    order by r.organization_id, r.weight_class_id, r.effective_on desc nulls last, r.captured_at desc
  ), raw as (
    select 'title' kind, ls.organization_id, ls.weight_class_id, t.holder_source_name printed, t.holder_org_boxer_id org_boxer_id,
      coalesce(t.designation_native, t.tier) role, t.tier, null::int position, coalesce(ls.as_of, ls.published_on) as_of, ls.source_url
    from latest_status ls join public.boxing_title_status_entries t on t.snapshot_id = ls.id
    where t.holder_status in ('held', 'in_recess') and t.holder_source_name is not null
    union all
    select 'ranking', lr.organization_id, lr.weight_class_id, e.source_name, e.metadata ->> 'org_boxer_id',
      coalesce(e.rank_label, '#' || e.position), null, e.position, coalesce(lr.effective_on, lr.published_on), lr.source_url
    from latest_rank lr join public.boxing_ranking_entries e on e.snapshot_id = lr.id
    where e.source_name is not null and not coalesce(e.is_vacant, false)
  ), linked as (
    select r.*, o.slug body, o.short_name body_name, wc.class_key division_key, wc.name division
    from raw r
    join public.boxing_organizations o on o.id = r.organization_id
    join public.boxing_weight_classes wc on wc.id = r.weight_class_id
    where exists (
      select 1 from public.boxing_org_identity_candidates c
      join public.boxing_org_identity_candidate_decisions d on d.candidate_id = c.id and d.decision = 'matched'
      where c.organization_id = r.organization_id
        and (c.cluster_key = 'id:' || r.org_boxer_id or c.source_names ? r.printed)
        and public.boxing_canonical_fighter_id(d.fighter_id) = p_fighter)
  )
  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'body', body, 'body_name', body_name, 'division_key', division_key,
      'division', division, 'role', role, 'tier', tier, 'position', position, 'printed_name', printed, 'as_of', as_of, 'source_url', source_url)
    order by (kind = 'title') desc, position nulls first, body), '[]'::jsonb)
  from (select distinct on (kind, body, division_key, role) * from linked order by kind, body, division_key, role, as_of desc nulls last) x
$$;

create or replace function public.boxing_site_fighter_context(p_ref text)
returns jsonb language sql stable set search_path = '' as $$
  with hit as (select f.* from public.boxing_fighters f where public.boxing_site_ref_matches(f.public_id, p_ref)),
  f as (select public.boxing_canonical_fighter_id(id) id from hit where (select count(*) from hit) = 1)
  select jsonb_build_object(
    'public_id', (select x.public_id from public.boxing_fighters x where x.id = f.id),
    'sourced_bio', public.boxing_site_sourced_bio(f.id),
    'hall_of_fame', public.boxing_site_hall_for_fighter(f.id),
    'promoter_appearances', public.boxing_site_promoter_appearances(f.id),
    'distinct_opponents', (select count(distinct v.opponent_id) from public.boxing_site_participations() v where v.fighter_id = f.id),
    'title_bouts', (select count(distinct bt.bout_id) from public.boxing_site_participations() v join public.boxing_bout_titles bt on bt.bout_id = v.bout_id and bt.at_stake where v.fighter_id = f.id),
    'approved_videos', (select count(*) from public.boxing_video_links l join public.boxing_videos vd on vd.id = l.video_id and vd.link_status = 'published'
                        join public.boxing_video_channels c on c.channel_id = vd.channel_id and c.enabled where public.boxing_canonical_fighter_id(l.fighter_id) = f.id),
    'body_claims', public.boxing_site_fighter_body_claims(f.id))
  from f
$$;

select public.boxing_lockdown();
