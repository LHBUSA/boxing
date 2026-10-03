-- Fight Record V1 (owner direction 2026-10-03): a SOURCED career-record claim is a different thing from the bout ledger
-- PropBetEdge has reconstructed, and neither is ever presented as the other.
--
-- 1. Lane `record_entering`: a professional record printed beside a boxer on an official document, meaning the record
--    the boxer carried INTO that bout. Approved for the Missouri Office of Athletics result sheets only (owner decision
--    2026-10-03). Every other source stays closed. Unlike older lanes, this guard is strict: a claim needs the lane
--    explicitly `covered_by_rights_review`, and "not declared" fails closed.
-- 2. public.boxing_fighter_record_claims: append-only. One row per (source, printed appearance, raw text). The exact
--    printed string is always kept. Only explicitly printed components are parsed: a missing draw or no-contest
--    component is null, never 0. Anything else is held with every count null.
-- 3. boxing_fighter_current_record(fighter): the newest parsed claim by EFFECTIVE chronology (the bout it was printed for),
--    never by captured_at, so a late historical backfill can never become a boxer's "current" record.
-- 4. boxing_fighter_record_reconciliation(fighter): the sourced claim vs the graph-derived ledger before that bout.
--    The result is COMPLETE / PARTIAL / CONFLICT / UNKNOWN. A gap is evidence of missing history and never creates a bout.

begin;

-- 1 -------------------------------------------------------------------------------------------------------------------
alter table public.boxing_source_capabilities drop constraint if exists boxing_source_capabilities_lane_check;
do $$ begin
  perform public.boxing_ensure_constraint('public.boxing_source_capabilities', 'boxing_source_capabilities_lane_check',
    'check (lane in (''events'',''upcoming_cards'',''bouts'',''results'',''stoppage_round_time'',''scorecard_totals'',''scorecard_rounds'',''judges'',''referees'',
      ''weigh_ins'',''point_deductions'',''knockdowns'',''suspensions'',''titles_at_stake'',''title_status'',''rankings'',''fighter_identity'',''fighter_attributes'',''venues'',
      ''promoters'',''broadcasters'',''hall_inductions'',''odds'',''photos'',''video'',''article_text'',''record_entering''))');
end $$;

insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, jurisdiction_code, country_code, coverage_basis,
  acquisition_method, completeness, confidence, notes, evidence, recorded_by,
  commercial_use, storage_allowed, redistribution_allowed, public_display_allowed, pro_tier_allowed, internal_use_allowed, verification_state)
select s.id, 'record_entering', 'provided', 'covered_by_rights_review', 'US-MO', 'US', 'stored_documents', 'pdf', 'partial', 'high',
  'Owner decision 2026-10-03: the RECORD column of the public Missouri result sheets (the professional record entering the bout) is an approved fact lane. AGE, DOB and FED ID on the same sheets stay dropped by the parser.',
  jsonb_build_object('owner_decision', '2026-10-03', 'column', 'RECORD', 'semantics', 'record entering the bout'),
  'pbe_owner_decision@2026-10-03',
  coalesce(r.commercial_use, 'conditional'), coalesce(r.storage_allowed, 'allowed'), 'prohibited', coalesce(r.public_display_allowed, 'conditional'),
  coalesce(r.pro_tier_allowed, 'conditional'), 'allowed', coalesce(r.verification_state, 'secondary_evidence')
from public.boxing_sources s
left join lateral (select * from public.boxing_source_capabilities_current c where c.source_id = s.id and c.lane = 'results' limit 1) r on true
where s.source_key = 'mo_office_of_athletics'
  and not exists (select 1 from public.boxing_source_capabilities_current c where c.source_id = s.id and c.lane = 'record_entering');

-- 2 -------------------------------------------------------------------------------------------------------------------
create table if not exists public.boxing_fighter_record_claims (
  id uuid primary key default gen_random_uuid(),
  fighter_id uuid not null references public.boxing_fighters(id) on delete restrict,
  record_type text not null check (record_type in ('RECORD_ENTERING')),
  -- the record the boxer carried INTO this bout: effective immediately before it
  bout_id uuid references public.boxing_bouts(id) on delete restrict,
  effective_as_of date not null,
  bout_order int,
  raw_record text not null,
  wins int check (wins is null or wins >= 0),
  losses int check (losses is null or losses >= 0),
  draws int check (draws is null or draws >= 0),
  no_contests int check (no_contests is null or no_contests >= 0),
  ko_wins int check (ko_wins is null or ko_wins >= 0),
  parse_state text not null check (parse_state in ('parsed', 'held')),
  parse_note text,
  source_id uuid not null references public.boxing_sources(id) on delete restrict,
  source_url text not null check (source_url ~ '^https://'),
  source_external_id text not null,
  observation_id uuid references public.boxing_source_observations(id) on delete restrict,
  parser_version text not null,
  verification_state text not null default 'source_printed' check (verification_state in ('source_printed')),
  captured_at timestamptz not null default now(),
  check ((parse_state = 'parsed' and wins is not null and losses is not null)
      or (parse_state = 'held' and wins is null and losses is null and draws is null and no_contests is null and ko_wins is null))
);
-- rerun / reparse / same observation: one row per source appearance and printed text. A different print for the same
-- appearance (a corrected sheet) is a new row, and so is every later bout's claim.
create unique index if not exists boxing_fighter_record_claims_once
  on public.boxing_fighter_record_claims (source_id, source_external_id, raw_record);
create index if not exists boxing_fighter_record_claims_fighter on public.boxing_fighter_record_claims (fighter_id, effective_as_of desc);
select public.boxing_install_append_only('public.boxing_fighter_record_claims');

-- strict lane guard: only a lane explicitly covered by a rights review may write (not_declared fails closed)
create or replace function public.boxing_record_claim_lane_guard()
returns trigger language plpgsql set search_path = '' as $$
declare v_state text := public.boxing_lane_rights_state(new.source_id, 'record_entering');
begin
  if v_state <> 'covered_by_rights_review' then
    raise exception 'lane_not_rights_approved: record_entering is % for source %', v_state,
      (select source_key from public.boxing_sources where id = new.source_id) using errcode = 'BX140';
  end if;
  return new;
end $$;
drop trigger if exists boxing_record_claims_lane_gate on public.boxing_fighter_record_claims;
create trigger boxing_record_claims_lane_gate before insert on public.boxing_fighter_record_claims
  for each row execute function public.boxing_record_claim_lane_guard();

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
    no_contests, ko_wins, parse_state, parse_note, source_id, source_url, source_external_id, observation_id, parser_version)
  values (v_fighter, coalesce(p ->> 'record_type', 'RECORD_ENTERING'), nullif(p ->> 'bout_id', '')::uuid, (p ->> 'effective_as_of')::date,
    nullif(p ->> 'bout_order', '')::int, p ->> 'raw_record', nullif(p ->> 'wins', '')::int, nullif(p ->> 'losses', '')::int,
    nullif(p ->> 'draws', '')::int, nullif(p ->> 'no_contests', '')::int, nullif(p ->> 'ko_wins', '')::int, p ->> 'parse_state', p ->> 'parse_note',
    v_src, p ->> 'source_url', p ->> 'source_external_id', nullif(p ->> 'observation_id', '')::uuid, p ->> 'parser_version')
  on conflict (source_id, source_external_id, raw_record) do nothing
  returning id into v_id;
  return jsonb_build_object('status', case when v_id is null then 'duplicate' else 'created' end, 'claim_id', v_id);
end $$;

-- 3 -------------------------------------------------------------------------------------------------------------------
-- newest by what the claim REPRESENTS: the bout date, then bout order on that card, then (same appearance printed twice)
-- the later capture. A 2019 sheet ingested today stays a 2019 claim.
create or replace function public.boxing_fighter_current_record(p_fighter uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('record_type', c.record_type, 'wins', c.wins, 'losses', c.losses, 'draws', c.draws, 'no_contests', c.no_contests,
    'ko_wins', c.ko_wins, 'raw_record', c.raw_record, 'effective_as_of', c.effective_as_of, 'bout_id', c.bout_id, 'source_key', s.source_key,
    'source_url', c.source_url, 'parser_version', c.parser_version, 'captured_at', c.captured_at)
  from public.boxing_fighter_record_claims c join public.boxing_sources s on s.id = c.source_id
  where c.fighter_id = public.boxing_canonical_fighter_id(p_fighter) and c.parse_state = 'parsed'
  order by c.effective_as_of desc, c.bout_order desc nulls last, c.captured_at desc
  limit 1
$$;

-- 4 -------------------------------------------------------------------------------------------------------------------
-- the verified bout ledger of one boxer: canonical bouts with a current official result
create or replace function public.boxing_fighter_ledger(p_fighter uuid)
returns table (bout_id uuid, bout_date date, bout_order int, outcome text)
language sql stable set search_path = '' as $$
  select b.id, e.event_date, b.bout_order,
    case when r.outcome = 'win' and r.winner_id is not null and public.boxing_canonical_fighter_id(r.winner_id) = public.boxing_canonical_fighter_id(p_fighter) then 'W'
         when r.outcome = 'win' then 'L'
         when r.outcome = 'draw' then 'D'
         when r.outcome = 'no_contest' then 'NC' else null end
  from public.boxing_bout_participants p
  join public.boxing_bouts b on b.id = p.bout_id
  join public.boxing_events e on e.id = b.event_id
  join public.boxing_bout_results_current r on r.bout_id = b.id
  where public.boxing_canonical_fighter_id(p.fighter_id) = public.boxing_canonical_fighter_id(p_fighter)
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
  -- graph-derived record BEFORE the bout the claim was printed for (same day: earlier on the card only)
  select count(*) filter (where outcome = 'W'), count(*) filter (where outcome = 'L'), count(*) filter (where outcome = 'D'), count(*) filter (where outcome = 'NC')
    into v_bw, v_bl, v_bd, v_bn
  from public.boxing_fighter_ledger(p_fighter) l
  where l.bout_date < v_date or (l.bout_date = v_date and v_order is not null and l.bout_order < v_order);
  -- the claim bout's own result, if we hold it: gives a PBE-derived record after that bout (never a source claim)
  select jsonb_build_object('outcome', outcome) into v_at from public.boxing_fighter_ledger(p_fighter) l
  where l.bout_id = nullif(v_claim ->> 'bout_id', '')::uuid;
  v_class := case
    when v_bw > (v_claim ->> 'wins')::int or v_bl > (v_claim ->> 'losses')::int
      or (v_claim ->> 'draws' is not null and v_bd > (v_claim ->> 'draws')::int) then 'CONFLICT'
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
