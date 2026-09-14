-- Sanctioning-body identity review by source identity, not by monthly occurrence (owner decision 2026-09-14), and the
-- PropBetEdge-derived unified / undisputed state from each body's primary champion.
--
-- Identity (staging first):
--   boxing_org_identity_names             every raw printed name variant (name, country, org boxer id) -> its normalized
--                                          name, so a stored entry can be tied to its review candidate at read time
--   boxing_org_identity_candidates        one review unit per source identity:
--                                            WBA  'id:<WBA boxer id>'  (the strongest key; every month collapses into it)
--                                            else 'name:<normalized name>' (countries kept as evidence, never merged on)
--                                          state: source_identity_proven (a stable org id, no conflicting evidence)
--                                                 review_candidate      (name only, nothing conflicting)
--                                                 ambiguous             (conflicting evidence: needs explicit members)
--   boxing_org_identity_candidate_members review row -> candidate (deterministic from the review row's own key)
--   boxing_org_identity_candidate_decisions append-only human decisions; a match names the member review rows it covers
--                                          (all members unless the candidate is ambiguous, where they must be listed)
--   boxing_org_effective_fighter()        stored fighter_id, else a reviewed decision covering that entry's review row.
--                                          Never a name match; a "name not printed" entry never resolves.
-- Derived (pbe_undisputed@1): each body's primary belt from its latest ranking document (WBA super, else WBA world/regular;
-- world for the others), holders compared only by resolved PropBetEdge fighter. All four -> undisputed; two or three ->
-- unified. Source wording ("unified", "undisputed") is never evidence.

begin;

create table if not exists public.boxing_org_identity_names (
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  source_name text not null,
  country text,
  org_boxer_id text,
  normalized_name text not null,
  first_seen_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, source_name, country, org_boxer_id)
);

create table if not exists public.boxing_org_identity_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.boxing_organizations(id) on delete restrict,
  cluster_key text not null,
  evidence_basis text not null check (evidence_basis in ('org_boxer_id','normalized_name')),
  state text not null check (state in ('source_identity_proven','review_candidate','ambiguous')),
  ambiguity jsonb not null default '[]'::jsonb,
  normalized_names jsonb not null default '[]'::jsonb,
  source_names jsonb not null default '[]'::jsonb,
  countries jsonb not null default '[]'::jsonb,
  review_rows int not null default 0,
  refreshed_at timestamptz not null default now(),
  unique (organization_id, cluster_key)
);

create table if not exists public.boxing_org_identity_candidate_members (
  review_id uuid primary key references public.boxing_org_identity_reviews(id) on delete restrict,
  candidate_id uuid not null references public.boxing_org_identity_candidates(id) on delete restrict
);
create index if not exists boxing_org_identity_candidate_members_candidate_idx on public.boxing_org_identity_candidate_members (candidate_id);

create table if not exists public.boxing_org_identity_candidate_decisions (
  seq bigint generated always as identity primary key,
  candidate_id uuid not null references public.boxing_org_identity_candidates(id) on delete restrict,
  decision text not null check (decision in ('matched','distinct','hold')),
  fighter_id uuid references public.boxing_fighters(id) on delete restrict,
  member_review_ids uuid[] not null,
  reviewer text not null,
  review_note text not null,
  evidence jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  check ((decision = 'matched') = (fighter_id is not null)),
  check (cardinality(member_review_ids) >= 1),
  check (length(btrim(review_note)) >= 20),
  check (reviewer !~* '(resolver|claude|gpt|openai|anthropic|\mbot\M|automat|script|system)')
);
create index if not exists boxing_org_identity_candidate_decisions_candidate_idx on public.boxing_org_identity_candidate_decisions (candidate_id, seq desc);

create or replace function public.boxing_org_identity_cluster_key(p_org_boxer_id text, p_normalized_name text)
returns text language sql immutable set search_path = '' as $$
  select case when nullif(btrim(p_org_boxer_id), '') is not null then 'id:' || btrim(p_org_boxer_id) else 'name:' || p_normalized_name end
$$;

-- a decision covers the members it names; with none named it covers every member, which an ambiguous candidate refuses
create or replace function public.boxing_org_identity_candidate_decision_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_state text;
begin
  select state into v_state from public.boxing_org_identity_candidates where id = new.candidate_id;
  if new.member_review_ids is null or cardinality(new.member_review_ids) = 0 then
    if v_state = 'ambiguous' then
      raise exception 'candidate % is ambiguous: name the member review rows this decision covers', new.candidate_id using errcode = '23514';
    end if;
    select array_agg(review_id order by review_id) into new.member_review_ids from public.boxing_org_identity_candidate_members where candidate_id = new.candidate_id;
  end if;
  if exists (select 1 from unnest(new.member_review_ids) m(id)
             where not exists (select 1 from public.boxing_org_identity_candidate_members x where x.review_id = m.id and x.candidate_id = new.candidate_id)) then
    raise exception 'decision names a review row that is not a member of candidate %', new.candidate_id using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists boxing_org_identity_candidate_decision_guard on public.boxing_org_identity_candidate_decisions;
create trigger boxing_org_identity_candidate_decision_guard before insert on public.boxing_org_identity_candidate_decisions
  for each row execute function public.boxing_org_identity_candidate_decision_guard();
select public.boxing_install_append_only('public.boxing_org_identity_candidate_decisions');

-- Rebuild candidate evidence from the review rows (idempotent; candidate ids stay stable because the key is).
create or replace function public.boxing_refresh_org_identity_candidates()
returns jsonb language plpgsql set search_path = '' as $$
declare v_members int; v_candidates int;
begin
  insert into public.boxing_org_identity_candidates (organization_id, cluster_key, evidence_basis, state)
  select distinct r.organization_id, public.boxing_org_identity_cluster_key(r.org_boxer_id, r.normalized_name),
    case when nullif(btrim(r.org_boxer_id), '') is not null then 'org_boxer_id' else 'normalized_name' end, 'review_candidate'
  from public.boxing_org_identity_reviews r
  on conflict (organization_id, cluster_key) do nothing;

  insert into public.boxing_org_identity_candidate_members (review_id, candidate_id)
  select r.id, c.id from public.boxing_org_identity_reviews r
  join public.boxing_org_identity_candidates c on c.organization_id = r.organization_id and c.cluster_key = public.boxing_org_identity_cluster_key(r.org_boxer_id, r.normalized_name)
  on conflict (review_id) do nothing;

  with ev as (
    select c.id, c.organization_id, c.evidence_basis,
      jsonb_agg(distinct r.normalized_name) normalized_names, jsonb_agg(distinct r.source_name) source_names,
      coalesce(jsonb_agg(distinct r.country) filter (where r.country is not null), '[]'::jsonb) countries,
      count(*) review_rows,
      count(distinct regexp_replace(r.normalized_name, '^.* ', '')) surnames,
      count(distinct r.country) filter (where r.country is not null) n_countries
    from public.boxing_org_identity_candidates c join public.boxing_org_identity_candidate_members m on m.candidate_id = c.id
    join public.boxing_org_identity_reviews r on r.id = m.review_id
    group by c.id, c.organization_id, c.evidence_basis),
  names_under_ids as (
    select r.organization_id, r.normalized_name, count(distinct r.org_boxer_id) ids
    from public.boxing_org_identity_reviews r where r.org_boxer_id is not null group by 1, 2),
  flags as (
    select ev.id, ev.normalized_names, ev.source_names, ev.countries, ev.review_rows,
      to_jsonb(array_remove(array[
        case when ev.evidence_basis = 'org_boxer_id' and ev.surnames > 1 then 'org_boxer_id_printed_with_different_surnames' end,
        case when ev.evidence_basis = 'org_boxer_id' and exists (select 1 from names_under_ids u join jsonb_array_elements_text(ev.normalized_names) nm(v) on u.normalized_name = nm.v
                                                                  where u.organization_id = ev.organization_id and u.ids > 1) then 'same_name_under_another_org_boxer_id' end,
        case when ev.evidence_basis = 'normalized_name' and ev.n_countries > 1 then 'countries_differ' end,
        case when ev.evidence_basis = 'normalized_name' and exists (select 1 from names_under_ids u join jsonb_array_elements_text(ev.normalized_names) nm(v) on u.normalized_name = nm.v
                                                                     where u.organization_id = ev.organization_id) then 'same_name_also_printed_with_org_boxer_id' end
      ], null)) ambiguity,
      ev.evidence_basis
    from ev)
  update public.boxing_org_identity_candidates c set
    normalized_names = f.normalized_names, source_names = f.source_names, countries = f.countries, review_rows = f.review_rows,
    ambiguity = f.ambiguity,
    state = case when jsonb_array_length(f.ambiguity) > 0 then 'ambiguous' when f.evidence_basis = 'org_boxer_id' then 'source_identity_proven' else 'review_candidate' end,
    refreshed_at = now()
  from flags f where f.id = c.id;

  select count(*) into v_members from public.boxing_org_identity_candidate_members;
  select count(*) into v_candidates from public.boxing_org_identity_candidates;
  return jsonb_build_object('candidates', v_candidates, 'members', v_members);
end $$;

-- the fighter a reviewed candidate decision gives this printed identity (normalized key), or null
create or replace function public.boxing_org_candidate_fighter(p_org uuid, p_normalized_name text, p_country text, p_org_boxer_id text)
returns uuid language sql stable set search_path = '' as $$
  select d.fighter_id
  from public.boxing_org_identity_candidates c
  join lateral (select * from public.boxing_org_identity_candidate_decisions x where x.candidate_id = c.id order by x.seq desc limit 1) d on true
  where c.organization_id = p_org and c.cluster_key = public.boxing_org_identity_cluster_key(p_org_boxer_id, p_normalized_name) and d.decision = 'matched'
    and exists (select 1 from public.boxing_org_identity_reviews r
                where r.id = any(d.member_review_ids) and r.org_boxer_id is not distinct from nullif(btrim(p_org_boxer_id), '')
                  and (r.org_boxer_id is not null or (r.normalized_name = p_normalized_name and r.country is not distinct from p_country)))
  limit 1
$$;

-- a stored entry's effective fighter: its own fighter_id, else a reviewed decision covering the review row its printed
-- identity belongs to. p_name_not_printed short-circuits: a missing name never resolves.
create or replace function public.boxing_org_effective_fighter(p_org uuid, p_fighter uuid, p_source_name text, p_country text, p_org_boxer_id text, p_name_not_printed boolean default false)
returns uuid language sql stable set search_path = '' as $$
  select case
    when p_fighter is not null then p_fighter
    when coalesce(p_name_not_printed, false) or p_source_name is null then null
    else coalesce(
      (select public.boxing_org_candidate_fighter(p_org, n.normalized_name, p_country, p_org_boxer_id)
         from public.boxing_org_identity_names n
        where n.organization_id = p_org and n.source_name = p_source_name and n.country is not distinct from p_country
          and n.org_boxer_id is not distinct from nullif(btrim(p_org_boxer_id), '') limit 1),
      (select d.fighter_id from public.boxing_org_identity_names n
         join public.boxing_org_identity_reviews r on r.organization_id = n.organization_id and r.normalized_name = n.normalized_name
          and r.country is not distinct from n.country and r.org_boxer_id is not distinct from n.org_boxer_id
         join lateral (select * from public.boxing_org_identity_decisions x where x.review_id = r.id order by x.seq desc limit 1) d on true
        where n.organization_id = p_org and n.source_name = p_source_name and n.country is not distinct from p_country
          and n.org_boxer_id is not distinct from nullif(btrim(p_org_boxer_id), '') and d.decision = 'matched' limit 1))
  end
$$;

-- raw printed names (batch), used by holds and the historical backfill of the name map
create or replace function public.boxing_record_org_identity_names(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare v int;
begin
  insert into public.boxing_org_identity_names (organization_id, source_name, country, org_boxer_id, normalized_name)
  select o.id, x ->> 'source_name', nullif(x ->> 'country', ''), nullif(btrim(x ->> 'org_boxer_id'), ''), x ->> 'normalized_name'
  from jsonb_array_elements(coalesce(p -> 'names', '[]'::jsonb)) x join public.boxing_organizations o on o.slug = x ->> 'organization_slug'
  where nullif(x ->> 'source_name', '') is not null and nullif(x ->> 'normalized_name', '') is not null
  on conflict do nothing;
  get diagnostics v = row_count;
  return jsonb_build_object('inserted', v);
end $$;

-- printed identities already stored in entries but not yet in the name map (historical backfill; normalized in JS)
create or replace function public.boxing_org_identity_unmapped_names(p_org_slug text, p_limit int default 2000)
returns jsonb language sql stable set search_path = '' as $$
  with o as (select id from public.boxing_organizations where slug = p_org_slug),
  printed as (
    select e.holder_source_name source_name, e.holder_country country, nullif(btrim(e.holder_org_boxer_id), '') org_boxer_id
    from public.boxing_title_status_entries e join public.boxing_title_status_snapshots s on s.id = e.snapshot_id
    where s.organization_id = (select id from o) and e.holder_source_name is not null
    union
    select e.source_name, e.metadata ->> 'nationality', nullif(btrim(e.metadata ->> 'source_fighter_id'), '')
    from public.boxing_ranking_entries e join public.boxing_ranking_snapshots s on s.id = e.snapshot_id
    where s.organization_id = (select id from o) and e.source_name is not null and coalesce(e.metadata ->> 'name_not_printed', 'false') <> 'true')
  select coalesce(jsonb_agg(jsonb_build_object('source_name', p.source_name, 'country', p.country, 'org_boxer_id', p.org_boxer_id)), '[]'::jsonb)
  from (select * from printed p
        where not exists (select 1 from public.boxing_org_identity_names n where n.organization_id = (select id from o) and n.source_name = p.source_name
                            and n.country is not distinct from p.country and n.org_boxer_id is not distinct from p.org_boxer_id)
        limit p_limit) p
$$;

create or replace function public.boxing_hold_org_identity(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare v_org uuid; v_id uuid;
begin
  select id into v_org from public.boxing_organizations where slug = p ->> 'organization_slug';
  if v_org is null then raise exception 'unknown organization' using errcode = 'BX070'; end if;
  insert into public.boxing_org_identity_reviews (organization_id, source_name, normalized_name, country, org_boxer_id, first_seen_snapshot_kind)
  values (v_org, p ->> 'source_name', p ->> 'normalized_name', nullif(p ->> 'country', ''), nullif(p ->> 'org_boxer_id', ''), p ->> 'document_kind')
  on conflict do nothing returning id into v_id;
  insert into public.boxing_org_identity_names (organization_id, source_name, country, org_boxer_id, normalized_name)
  values (v_org, p ->> 'source_name', nullif(p ->> 'country', ''), nullif(p ->> 'org_boxer_id', ''), p ->> 'normalized_name')
  on conflict do nothing;
  return jsonb_build_object('created', v_id is not null);
end $$;

-- import-time resolution: per-review decisions (0033) and candidate decisions
create or replace function public.boxing_org_identity_resolution(p_org_slug text, p_normalized_name text, p_country text, p_org_boxer_id text)
returns uuid language sql stable set search_path = '' as $$
  select coalesce(
    (select d.fighter_id from public.boxing_org_identity_reviews r
       join public.boxing_organizations o on o.id = r.organization_id and o.slug = p_org_slug
       join lateral (select * from public.boxing_org_identity_decisions x where x.review_id = r.id order by x.seq desc limit 1) d on true
      where d.decision = 'matched'
        and ((p_org_boxer_id is not null and r.org_boxer_id = p_org_boxer_id)
          or (p_org_boxer_id is null and r.org_boxer_id is null and r.normalized_name = p_normalized_name and r.country is not distinct from p_country))
      limit 1),
    (select public.boxing_org_candidate_fighter(o.id, p_normalized_name, p_country, p_org_boxer_id) from public.boxing_organizations o where o.slug = p_org_slug))
$$;

-- Review queue summary: raw occurrences, review rows, candidates by state, decided candidates, resolved occurrences.
create or replace function public.boxing_org_identity_review_summary()
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(o.slug, jsonb_build_object(
    'raw_title_entries_held', (select count(*) from public.boxing_title_status_entries e join public.boxing_title_status_snapshots s on s.id = e.snapshot_id
                               where s.organization_id = o.id and e.identity_state = 'held'),
    'raw_ranking_entries_unresolved', (select count(*) from public.boxing_ranking_entries e join public.boxing_ranking_snapshots s on s.id = e.snapshot_id
                                       where s.organization_id = o.id and e.fighter_id is null and e.source_name is not null),
    'name_not_printed_entries', (select count(*) from public.boxing_ranking_entries e join public.boxing_ranking_snapshots s on s.id = e.snapshot_id
                                 where s.organization_id = o.id and e.metadata ->> 'name_not_printed' = 'true'),
    'review_rows', (select count(*) from public.boxing_org_identity_reviews r where r.organization_id = o.id),
    'candidates', (select count(*) from public.boxing_org_identity_candidates c where c.organization_id = o.id),
    'source_identity_proven', (select count(*) from public.boxing_org_identity_candidates c where c.organization_id = o.id and c.state = 'source_identity_proven'),
    'review_candidate', (select count(*) from public.boxing_org_identity_candidates c where c.organization_id = o.id and c.state = 'review_candidate'),
    'ambiguous', (select count(*) from public.boxing_org_identity_candidates c where c.organization_id = o.id and c.state = 'ambiguous'),
    'candidates_decided', (select count(distinct d.candidate_id) from public.boxing_org_identity_candidate_decisions d join public.boxing_org_identity_candidates c on c.id = d.candidate_id where c.organization_id = o.id),
    'resolved_to_fighter', (select count(distinct d.candidate_id) from public.boxing_org_identity_candidate_decisions d join public.boxing_org_identity_candidates c on c.id = d.candidate_id
                            where c.organization_id = o.id and d.decision = 'matched'),
    'ambiguity_reasons', (select coalesce(jsonb_object_agg(reason, n), '{}'::jsonb) from (select a.reason, count(*) n from public.boxing_org_identity_candidates c, jsonb_array_elements_text(c.ambiguity) a(reason)
                          where c.organization_id = o.id group by 1) x),
    'names_mapped', (select count(*) from public.boxing_org_identity_names n where n.organization_id = o.id))), '{}'::jsonb)
  from public.boxing_organizations o where o.slug in ('wbc','wba','ibf','wbo')
$$;

-- Title snapshot JSON: holder fighter through the effective resolution (a decision reaches every stored month)
create or replace function public.boxing_title_snapshot_json(p_snapshot uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('document_kind', s.document_kind, 'source_url', s.source_url, 'published_on', s.published_on, 'as_of', s.as_of,
    'as_of_label', s.as_of_label, 'retrieved_at', s.retrieved_at, 'division_native_label', d.native_label, 'division_limit_text', d.limit_text,
    'belts', (select coalesce(jsonb_agg(jsonb_build_object('designation', e.designation_native, 'tier', e.tier, 'status', e.holder_status, 'honorific', e.honorific,
        'holder', case when e.holder_status = 'vacant' then null else jsonb_build_object('name', e.holder_source_name, 'country', e.holder_country,
          'fighter', f.public_id, 'display_name', f.display_name, 'identity_state', case when f.id is not null then 'resolved' else e.identity_state end) end,
        'reign_start', case when e.reign_start_on is null then null else jsonb_build_object('on', e.reign_start_on, 'basis', e.reign_start_basis) end,
        'last_defense_on', e.last_defense_on,
        'mandatory', (select jsonb_build_object('as_printed', m.as_printed, 'challenger', m.challenger_source_name, 'status_as_printed', m.status_as_printed, 'due_on', m.due_on, 'basis', m.basis)
                      from public.boxing_title_mandatory_statements m where m.snapshot_id = e.snapshot_id and m.entry_seq = e.seq and m.kind = 'mandatory' limit 1))
        order by e.seq), '[]'::jsonb)
      from public.boxing_title_status_entries e
      left join public.boxing_fighters f on f.id = public.boxing_org_effective_fighter(s.organization_id, e.fighter_id, e.holder_source_name, e.holder_country, e.holder_org_boxer_id)
      where e.snapshot_id = s.id),
    'claims', (select coalesce(jsonb_agg(jsonb_build_object('about', ao.slug, 'says', case when c.claimed_vacant then 'VACANT' when c.claimed_blank then null else c.claimed_holder_source_name end,
        'blank', c.claimed_blank, 'native_text', c.native_text) order by ao.slug), '[]'::jsonb)
      from public.boxing_title_claims c join public.boxing_organizations ao on ao.id = c.about_organization_id where c.snapshot_id = s.id))
  from public.boxing_title_status_snapshots s join public.boxing_org_divisions d on d.id = s.org_division_id
  where s.id = p_snapshot
$$;

-- Ranking entries JSON (0006 contract): same effective resolution; a stored fighter_id is unchanged
create or replace function public.boxing_ranking_entries_json(p_snapshot uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'snapshot_id', s.id, 'published_on', s.published_on, 'effective_on', s.effective_on, 'revision', s.revision,
    'supersedes_id', s.supersedes_id, 'source_url', s.source_url, 'division_label', s.division_label,
    'organization_slug', o.slug, 'weight_class_key', wc.class_key, 'gender_scope', s.gender_scope,
    'source_key', src.source_key, 'captured_at', s.captured_at,
    'entries', (select coalesce(jsonb_agg(jsonb_build_object(
        'position', e.position, 'rank', e.rank, 'rank_label', e.rank_label, 'fighter_id', f.id,
        'public_id', f.public_id, 'display_name', f.display_name, 'source_name', e.source_name,
        'designation', e.designation, 'mandatory', e.mandatory, 'is_vacant', e.is_vacant, 'is_champion', e.is_champion,
        'metadata', e.metadata) order by e.position), '[]'::jsonb)
      from public.boxing_ranking_entries e
      left join public.boxing_fighters f on f.id = public.boxing_org_effective_fighter(s.organization_id, e.fighter_id, e.source_name, e.metadata ->> 'nationality',
        e.metadata ->> 'source_fighter_id', (e.metadata ->> 'name_not_printed')::boolean)
      where e.snapshot_id = s.id))
  from public.boxing_ranking_snapshots s
  join public.boxing_organizations o on o.id = s.organization_id
  join public.boxing_weight_classes wc on wc.id = s.weight_class_id
  join public.boxing_sources src on src.id = s.source_id
  where s.id = p_snapshot
$$;

-- PropBetEdge-derived unified / undisputed for one division (pbe_undisputed@1)
create or replace function public.boxing_derived_unification(p_weight_class_key text, p_gender text default 'male')
returns jsonb language sql stable set search_path = '' as $$
  with wc as (select id from public.boxing_weight_classes where class_key = p_weight_class_key),
  orgs as (select o.id, o.slug, o.short_name from public.boxing_organizations o where o.slug in ('wbc','wba','ibf','wbo')),
  latest as (
    select distinct on (s.organization_id) s.*
    from public.boxing_title_status_snapshots s
    where s.weight_class_id = (select id from wc) and s.gender_scope = p_gender and s.document_kind in ('wba_ranking','ibf_rating','wbo_ratings')
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

-- Lanes: same as 0033 except the derived block
create or replace function public.boxing_site_title_lanes(p_weight_class_key text, p_gender text default 'male')
returns jsonb language sql stable set search_path = '' as $$
  with wc as (select id, class_key, name, max_weight_lb from public.boxing_weight_classes where class_key = p_weight_class_key),
  orgs as (select o.id, o.slug, o.short_name, o.name, src.access_mode, src.enabled, src.rights_note
           from public.boxing_organizations o left join public.boxing_sources src on src.source_key = o.slug || '_official'
           where o.slug in ('wbc','wba','ibf','wbo')),
  latest as (
    select distinct on (s.organization_id, s.document_kind) s.*
    from public.boxing_title_status_snapshots s
    where s.weight_class_id = (select id from wc) and s.gender_scope = p_gender
    order by s.organization_id, s.document_kind, coalesce(s.as_of, s.published_on) desc, s.captured_at desc)
  select jsonb_build_object(
    'division', (select jsonb_build_object('class_key', class_key, 'name', name, 'max_lb', max_weight_lb) from wc),
    'lanes', (select jsonb_agg(jsonb_build_object(
        'body', o.slug, 'short_name', o.short_name, 'name', o.name,
        'state', case when not (coalesce(o.enabled, false) and o.access_mode = 'approved_ingest') then 'not_licensed'
                      when exists (select 1 from latest l where l.organization_id = o.id) then 'current' else 'no_snapshot' end,
        'note', case when not (coalesce(o.enabled, false) and o.access_mode = 'approved_ingest') then 'Source not approved: no ' || o.short_name || ' standings are collected or shown.' end,
        'documents', (select coalesce(jsonb_agg(public.boxing_title_snapshot_json(l.id) order by l.document_kind), '[]'::jsonb) from latest l where l.organization_id = o.id),
        'freshness', (select jsonb_build_object('last_run_at', r.finished_at, 'last_run_status', r.status,
                        'last_ok_at', (select max(k.finished_at) from public.boxing_ingest_runs k where k.worker = 'boxing-rankings' and k.source_id = r.source_id
                                         and k.status in ('ok','partial') and coalesce(k.metrics ->> 'mode', 'current') = 'current'))
                      from public.boxing_ingest_runs r join public.boxing_sources rs on rs.id = r.source_id
                      where r.worker = 'boxing-rankings' and rs.source_key = o.slug || '_official' and r.finished_at is not null and coalesce(r.metrics ->> 'mode', 'current') = 'current'
                      order by r.finished_at desc limit 1),
        'conflicts_within_body', (select coalesce(jsonb_agg(distinct jsonb_build_object('belt', c.belt_key, 'left_document', ls.document_kind, 'left', c.left_value,
                                    'right_document', rs.document_kind, 'right', c.right_value, 'same_surname', c.same_surname)), '[]'::jsonb)
                                  from public.boxing_title_conflicts c
                                  join public.boxing_title_status_snapshots ls on ls.id = c.left_snapshot_id
                                  join public.boxing_title_status_snapshots rs on rs.id = c.right_snapshot_id
                                  where c.left_snapshot_id in (select id from latest) and c.right_snapshot_id in (select id from latest) and c.organization_id = o.id),
        'claims_by_other_bodies', (select coalesce(jsonb_agg(jsonb_build_object('by', co.slug, 'document_kind', l.document_kind, 'as_of', coalesce(l.as_of, l.published_on),
                                     'says', case when c.claimed_vacant then 'VACANT' when c.claimed_blank then null else c.claimed_holder_source_name end, 'blank', c.claimed_blank, 'native_text', c.native_text)
                                     order by co.slug, l.document_kind), '[]'::jsonb)
                                   from public.boxing_title_claims c join latest l on l.id = c.snapshot_id join public.boxing_organizations co on co.id = l.organization_id
                                   where c.about_organization_id = o.id))
        order by array_position(array['wbc','wba','ibf','wbo'], o.slug)) from orgs o),
    'derived', public.boxing_derived_unification(p_weight_class_key, p_gender))
$$;

select public.boxing_refresh_org_identity_candidates();

select public.boxing_lockdown();

commit;
