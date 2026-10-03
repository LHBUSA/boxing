-- Owner decision 2026-10-03: an explicit Florida commission "Pro Debut" marker establishes a record ENTERING that bout
-- of zero prior professional bouts. That is a source-derived normalization of an explicit commission fact; it is NOT
-- PBE inference from an empty ledger, and it is never the same kind of claim as a printed numeric record.
--
-- 1. claim_basis on every claim: 'printed_record' (the source printed W-L[-D[-NC]]) or 'explicit_pro_debut_marker'
--    (the source printed "Pro Debut"). A Pro Debut claim must carry raw_record 'Pro Debut' and 0/0/0/0.
-- 2. The Florida record_entering lane is opened for the Pro Debut basis ONLY. The capability's evidence names the allowed
--    basis and the strict lane guard enforces it, so Florida can never write a numeric claim under this decision.
-- 3. Reconciliation also compares no-contests when the claim states them (a Pro Debut states 0 of everything), so
--    "Pro Debut" with an earlier verified professional bout is CONFLICT, and neither fact is touched.

begin;

-- 1 -------------------------------------------------------------------------------------------------------------------
alter table public.boxing_fighter_record_claims add column if not exists claim_basis text not null default 'printed_record';
do $$ begin
  perform public.boxing_ensure_constraint('public.boxing_fighter_record_claims', 'boxing_fighter_record_claims_basis',
    'check (claim_basis in (''printed_record'', ''explicit_pro_debut_marker''))');
  perform public.boxing_ensure_constraint('public.boxing_fighter_record_claims', 'boxing_fighter_record_claims_pro_debut_shape',
    'check (claim_basis <> ''explicit_pro_debut_marker'' or (raw_record = ''Pro Debut'' and parse_state = ''parsed''
       and wins = 0 and losses = 0 and draws = 0 and no_contests = 0 and ko_wins is null))');
end $$;

-- 2 -------------------------------------------------------------------------------------------------------------------
insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, jurisdiction_code, country_code, coverage_basis,
  acquisition_method, completeness, confidence, notes, evidence, recorded_by,
  commercial_use, storage_allowed, redistribution_allowed, public_display_allowed, pro_tier_allowed, internal_use_allowed, verification_state)
select s.id, 'record_entering', 'partial', 'covered_by_rights_review', 'US-FL', 'US', 'stored_documents', 'pdf', 'partial', 'high',
  'Owner decision 2026-10-03: the explicit per-corner "Pro Debut" marker on Florida result sheets establishes a record entering the bout of 0 prior professional bouts (0-0-0-0). Florida prints no numeric career record; no other record claim is permitted from this source.',
  jsonb_build_object('owner_decision', '2026-10-03', 'allowed_claim_basis', 'explicit_pro_debut_marker', 'marker', 'Pro Debut'),
  'pbe_owner_decision@2026-10-03',
  coalesce(r.commercial_use, 'conditional'), coalesce(r.storage_allowed, 'allowed'), 'prohibited', coalesce(r.public_display_allowed, 'conditional'),
  coalesce(r.pro_tier_allowed, 'conditional'), 'allowed', coalesce(r.verification_state, 'secondary_evidence')
from public.boxing_sources s
left join lateral (select * from public.boxing_source_capabilities_current c where c.source_id = s.id and c.lane = 'results' limit 1) r on true
where s.source_key = 'florida_athletic_commission'
  and not exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = s.id and c.lane = 'record_entering');

create or replace function public.boxing_record_claim_lane_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_state text := public.boxing_lane_rights_state(new.source_id, 'record_entering');
  v_basis text := (select c.evidence ->> 'allowed_claim_basis' from public.boxing_source_capabilities_current c
                   where c.source_id = new.source_id and c.lane = 'record_entering' limit 1);
begin
  if v_state <> 'covered_by_rights_review' then
    raise exception 'lane_not_rights_approved: record_entering is % for source %', v_state,
      (select source_key from public.boxing_sources where id = new.source_id) using errcode = 'BX140';
  end if;
  if v_basis is not null and new.claim_basis <> v_basis then
    raise exception 'lane_not_rights_approved: record_entering is % for source % except basis %', 'basis_not_permitted',
      (select source_key from public.boxing_sources where id = new.source_id), v_basis using errcode = 'BX140';
  end if;
  return new;
end $$;

create or replace function public.boxing_record_fighter_record_claim(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_src uuid;
  v_id uuid;
  v_fighter uuid := public.boxing_canonical_fighter_id((p ->> 'fighter_id')::uuid);
begin
  select id into v_src from public.boxing_sources where source_key = p ->> 'source_key';
  if v_src is null then raise exception 'source_not_registered: %', p ->> 'source_key' using errcode = 'BX010'; end if;
  insert into public.boxing_fighter_record_claims (fighter_id, record_type, bout_id, effective_as_of, bout_order, raw_record, wins, losses, draws,
    no_contests, ko_wins, parse_state, parse_note, source_id, source_url, source_external_id, observation_id, parser_version, claim_basis)
  values (v_fighter, coalesce(p ->> 'record_type', 'RECORD_ENTERING'), nullif(p ->> 'bout_id', '')::uuid, (p ->> 'effective_as_of')::date,
    nullif(p ->> 'bout_order', '')::int, p ->> 'raw_record', nullif(p ->> 'wins', '')::int, nullif(p ->> 'losses', '')::int,
    nullif(p ->> 'draws', '')::int, nullif(p ->> 'no_contests', '')::int, nullif(p ->> 'ko_wins', '')::int, p ->> 'parse_state', p ->> 'parse_note',
    v_src, p ->> 'source_url', p ->> 'source_external_id', nullif(p ->> 'observation_id', '')::uuid, p ->> 'parser_version',
    coalesce(p ->> 'claim_basis', 'printed_record'))
  on conflict (source_id, source_external_id, raw_record) do nothing
  returning id into v_id;
  return jsonb_build_object('status', case when v_id is null then 'duplicate' else 'created' end, 'claim_id', v_id);
end $$;

-- 3 -------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_fighter_current_record(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('record_type', c.record_type, 'claim_basis', c.claim_basis, 'wins', c.wins, 'losses', c.losses, 'draws', c.draws,
    'no_contests', c.no_contests, 'ko_wins', c.ko_wins, 'raw_record', c.raw_record, 'effective_as_of', c.effective_as_of, 'bout_id', c.bout_id,
    'bout_order', c.bout_order, 'source_key', s.source_key, 'source_url', c.source_url, 'parser_version', c.parser_version, 'captured_at', c.captured_at)
  from public.boxing_fighter_record_claims c join public.boxing_sources s on s.id = c.source_id
  where c.fighter_id = public.boxing_canonical_fighter_id(p_fighter) and c.parse_state = 'parsed'
  order by c.effective_as_of desc, c.bout_order desc nulls last, c.captured_at desc
  limit 1
$$;

create or replace function public.boxing_fighter_record_reconciliation(p_fighter uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_claim jsonb := public.boxing_fighter_current_record(p_fighter);
  v_date date;
  v_order int;
  v_bw int; v_bl int; v_bd int; v_bn int;
  v_n int; v_first date; v_last date;
  v_at jsonb;
  v_class text;
begin
  select count(*), min(bout_date), max(bout_date) into v_n, v_first, v_last from public.boxing_fighter_ledger(p_fighter) where outcome is not null;
  if v_claim is null then
    return jsonb_build_object('classification', 'UNKNOWN', 'sourced_record', null,
      'ledger', jsonb_build_object('bouts', v_n, 'earliest', v_first, 'latest', v_last));
  end if;
  v_date := (v_claim ->> 'effective_as_of')::date;
  v_order := nullif(v_claim ->> 'bout_order', '')::int;
  select count(*) filter (where outcome = 'W'), count(*) filter (where outcome = 'L'), count(*) filter (where outcome = 'D'), count(*) filter (where outcome = 'NC')
    into v_bw, v_bl, v_bd, v_bn
  from public.boxing_fighter_ledger(p_fighter) l
  where l.bout_date < v_date or (l.bout_date = v_date and v_order is not null and l.bout_order < v_order);
  select jsonb_build_object('outcome', outcome) into v_at from public.boxing_fighter_ledger(p_fighter) l
  where l.bout_id = nullif(v_claim ->> 'bout_id', '')::uuid;
  v_class := case
    when v_bw > (v_claim ->> 'wins')::int or v_bl > (v_claim ->> 'losses')::int
      or (v_claim ->> 'draws' is not null and v_bd > (v_claim ->> 'draws')::int)
      or (v_claim ->> 'no_contests' is not null and v_bn > (v_claim ->> 'no_contests')::int) then 'CONFLICT'
    when v_bw = (v_claim ->> 'wins')::int and v_bl = (v_claim ->> 'losses')::int
      and (v_claim ->> 'draws' is not null and v_bd = (v_claim ->> 'draws')::int or v_claim ->> 'draws' is null and v_bd = 0) then 'COMPLETE'
    else 'PARTIAL' end;
  return jsonb_build_object(
    'classification', v_class,
    'sourced_record', v_claim,
    'graph_before_claim', jsonb_build_object('wins', v_bw, 'losses', v_bl, 'draws', v_bd, 'no_contests', v_bn),
    'graph_after_claim_bout', case when v_at is null then null else jsonb_build_object(
      'label', 'pbe_derived', 'wins', (v_claim ->> 'wins')::int + case when v_at ->> 'outcome' = 'W' then 1 else 0 end,
      'losses', (v_claim ->> 'losses')::int + case when v_at ->> 'outcome' = 'L' then 1 else 0 end,
      'draws', case when v_claim ->> 'draws' is null then null else (v_claim ->> 'draws')::int + case when v_at ->> 'outcome' = 'D' then 1 else 0 end end) end,
    'missing_before_claim', case when v_class = 'PARTIAL' then jsonb_build_object(
      'wins', (v_claim ->> 'wins')::int - v_bw, 'losses', (v_claim ->> 'losses')::int - v_bl,
      'draws', case when v_claim ->> 'draws' is null then null else (v_claim ->> 'draws')::int - v_bd end) end,
    'ledger', jsonb_build_object('bouts', v_n, 'earliest', v_first, 'latest', v_last));
end $$;

select public.boxing_lockdown();

commit;
