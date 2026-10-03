-- P0 identity seed (owner decision 2026-10-03): build the canonical real person first, then let commission records,
-- sanctioning-body entries, bouts and rankings attach to it.
--
-- Wikidata may establish that a canonical HUMAN exists (QID, name, aliases, citizenship). It may NOT establish a
-- professional record, a win/loss, a title, a current championship, a ranking, a bout result or a pro debut: those keep
-- coming only from commission records, sanctioning-body evidence and verified bouts. A seeded fighter with no verified
-- bouts is expected and is shown as IDENTITY_SEEDED, never as a record.
--
-- 1. public.boxing_identity_seed_decisions (append-only): one row per (rule version, subject). Every decision keeps the
--    exact evidence that produced it, the candidate list, and every sanctioning-body entry AS PRINTED (source claims are
--    never flattened into the identity). AUTO_SEEDED rows point to the fighter they created; REVIEW_REQUIRED and
--    NO_CANDIDATE rows create nothing.
-- 2. public.boxing_apply_identity_seed(p jsonb): idempotent on (rule_version, subject_key). AUTO_SEEDED creates the
--    fighter only through boxing_apply_identity_decision (source 'wikidata', namespace 'wikidata.item'), so the 0047
--    evidence gate, the QID uniqueness guard and the name index all still apply. If that path does not create (QID
--    already mapped, evidence insufficient) the seed is recorded as REVIEW_REQUIRED with the path's own reason.
--    Date of birth is kept here as decision evidence only: it is never sent into the fighter profile.
-- 3. public.boxing_fighter_identity_status: per fighter, how the identity was established and whether a verified bout
--    record exists. RECORD_VERIFIED = at least one canonical bout with a current official result; otherwise
--    IDENTITY_SEEDED (seeded or sourced person, no verified bout yet).

-- 1 -------------------------------------------------------------------------------------------------------------------
create table if not exists public.boxing_identity_seed_decisions (
  id uuid primary key default gen_random_uuid(),
  rule_version text not null check (rule_version ~ '^[a-z0-9-]+@[0-9]+\.[0-9]+\.[0-9]+$'),
  batch text not null,
  subject_key text not null check (subject_key ~ '^[a-z]+$'),
  decision text not null check (decision in ('AUTO_SEEDED', 'REVIEW_REQUIRED', 'NO_CANDIDATE')),
  wikidata_qid text check (wikidata_qid ~ '^Q[0-9]+$'),
  fighter_id uuid references public.boxing_fighters (id),
  canonical_name text,
  aliases jsonb not null default '[]'::jsonb check (jsonb_typeof(aliases) = 'array'),
  nationality_evidence jsonb not null default '{}'::jsonb,
  dob date,
  dob_precision text check (dob_precision in ('day', 'month', 'year')),
  division_evidence jsonb not null default '{}'::jsonb,
  source_claims jsonb not null check (jsonb_typeof(source_claims) = 'array' and jsonb_array_length(source_claims) >= 1),
  identity_sources jsonb not null default '[]'::jsonb,
  creation_basis text not null,
  reasons text[] not null default '{}',
  evidence jsonb not null check (evidence <> '{}'::jsonb),
  candidates jsonb not null default '[]'::jsonb,
  decided_at timestamptz not null default now(),
  unique (rule_version, subject_key),
  check ((decision = 'AUTO_SEEDED') = (fighter_id is not null)),
  check (decision <> 'AUTO_SEEDED' or (wikidata_qid is not null and canonical_name is not null)),
  check (decision = 'AUTO_SEEDED' or cardinality(reasons) >= 1)
);
create index if not exists boxing_identity_seed_decisions_fighter on public.boxing_identity_seed_decisions (fighter_id) where fighter_id is not null;
select public.boxing_install_append_only('public.boxing_identity_seed_decisions');

comment on table public.boxing_identity_seed_decisions is
  'P0 identity seed decisions (Wikidata establishes a human, never a record). Append-only; source claims kept as printed.';

-- 2 -------------------------------------------------------------------------------------------------------------------
create or replace function public.boxing_apply_identity_seed(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_existing public.boxing_identity_seed_decisions%rowtype;
  v_decision text := p ->> 'decision';
  v_reasons text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'reasons', '[]'::jsonb)) x), '{}');
  v_fighter uuid;
  v_result jsonb;
  v_id uuid;
begin
  select * into v_existing from public.boxing_identity_seed_decisions
  where rule_version = p ->> 'rule_version' and subject_key = p ->> 'subject_key';
  if found then
    return jsonb_build_object('status', 'duplicate', 'id', v_existing.id, 'decision', v_existing.decision, 'fighter_id', v_existing.fighter_id);
  end if;
  if v_decision not in ('AUTO_SEEDED', 'REVIEW_REQUIRED', 'NO_CANDIDATE') then
    raise exception 'invalid_seed_decision: %', v_decision using errcode = '22023';
  end if;

  -- a QID already mapped to a fighter is never seeded again from another subject: that subject is the same person only
  -- if a human says so (an accepted fighter in one lane never validates a different entry in another)
  if v_decision = 'AUTO_SEEDED' and exists (select 1 from public.boxing_fighter_identities fi
      where fi.namespace = 'wikidata.item' and fi.external_id = p ->> 'wikidata_qid' and fi.verification_state <> 'rejected') then
    v_decision := 'REVIEW_REQUIRED';
    v_reasons := array_append(v_reasons, 'qid_already_mapped_to_a_fighter');
  end if;

  if v_decision = 'AUTO_SEEDED' then
    -- the identity carries the name and citizenship only: never a dob, a record or a title
    v_result := public.boxing_apply_identity_decision(jsonb_build_object(
      'source_key', 'wikidata',
      'resolver_version', p ->> 'rule_version',
      'observation', jsonb_build_object('entity_type', 'fighter_identity', 'external_key', p ->> 'wikidata_qid',
        'source_url', 'https://www.wikidata.org/wiki/' || (p ->> 'wikidata_qid'),
        'payload', jsonb_build_object('display_name', p ->> 'canonical_name', 'qid', p ->> 'wikidata_qid',
          'entity_revision', p #> '{evidence,entity_revision}', 'seed_subject', p ->> 'subject_key'),
        'content_hash', encode(sha256(convert_to((p ->> 'wikidata_qid') || '|' || coalesce(p #>> '{evidence,entity_revision}', ''), 'UTF8')), 'hex'),
        'parser_version', p ->> 'rule_version'),
      'identity', jsonb_build_object('namespace', 'wikidata.item', 'external_id', p ->> 'wikidata_qid',
        'external_url', 'https://www.wikidata.org/wiki/' || (p ->> 'wikidata_qid'), 'display_name', p ->> 'canonical_name',
        'nationality', coalesce(p #> '{nationality_evidence,wikidata_citizenship_iso2}', '[]'::jsonb)),
      'index', p -> 'index',
      'decision', jsonb_build_object('outcome', 'created', 'method', 'p0_identity_seed', 'confidence', 90,
        'verification_state', 'verified', 'evidence', p -> 'evidence')));
    if v_result ->> 'status' = 'applied' and v_result ->> 'outcome' = 'created' then
      v_fighter := (v_result ->> 'fighter_id')::uuid;
    else
      v_decision := 'REVIEW_REQUIRED';
      v_reasons := array_append(v_reasons, 'creation_path_' || coalesce(v_result ->> 'outcome', 'unknown') || ':' || coalesce(v_result ->> 'reason', 'none'));
    end if;
  end if;

  insert into public.boxing_identity_seed_decisions
    (rule_version, batch, subject_key, decision, wikidata_qid, fighter_id, canonical_name, aliases, nationality_evidence,
     dob, dob_precision, division_evidence, source_claims, identity_sources, creation_basis, reasons, evidence, candidates)
  values (p ->> 'rule_version', p ->> 'batch', p ->> 'subject_key', v_decision, p ->> 'wikidata_qid', v_fighter,
     p ->> 'canonical_name', coalesce(p -> 'aliases', '[]'::jsonb), coalesce(p -> 'nationality_evidence', '{}'::jsonb),
     nullif(p ->> 'dob', '')::date, p ->> 'dob_precision', coalesce(p -> 'division_evidence', '{}'::jsonb),
     p -> 'source_claims', coalesce(p -> 'identity_sources', '[]'::jsonb), p ->> 'creation_basis', v_reasons,
     p -> 'evidence', coalesce(p -> 'candidates', '[]'::jsonb))
  returning id into v_id;
  return jsonb_build_object('status', 'created', 'id', v_id, 'decision', v_decision, 'fighter_id', v_fighter,
    'creation', v_result);
end $$;

-- 3 -------------------------------------------------------------------------------------------------------------------
create or replace view public.boxing_fighter_identity_status with (security_invoker = true) as
select f.id fighter_id, f.display_name,
  case when s.id is not null then 'p0_identity_seed' else 'source_native' end identity_basis,
  s.wikidata_qid, s.decided_at seeded_at,
  case when exists (
    select 1 from public.boxing_bout_participants bp
    join public.boxing_bout_results_current r on r.bout_id = bp.bout_id
    where public.boxing_canonical_fighter_id(bp.fighter_id) = f.id
  ) then 'RECORD_VERIFIED' else 'IDENTITY_SEEDED' end record_status
from public.boxing_fighters f
left join lateral (select d.id, d.wikidata_qid, d.decided_at from public.boxing_identity_seed_decisions d
                   where d.fighter_id = f.id and d.decision = 'AUTO_SEEDED' order by d.decided_at limit 1) s on true
where f.merged_into_id is null;

comment on view public.boxing_fighter_identity_status is
  'IDENTITY_SEEDED = a canonical person with no verified bout yet; RECORD_VERIFIED = at least one canonical bout with a current official result.';

select public.boxing_lockdown();
