-- Reviewed duplicate HOLD ledger (owner decision 2026-10-03).
--
-- A pair the graph proof reports as identity-equivalent (0058 routes) that a named human has REVIEWED and deliberately
-- HELD, because evidence the merge guard requires is still missing. A HOLD row is NOT permission to merge and NOT an
-- identity assertion beyond "known possible duplicate under review". It only lets the integrity proof tell a reviewed
-- hold from an unexpected duplicate: the proof still lists every held pair and fails on any pair without a HOLD.
--
-- Append-only. When the missing evidence arrives the pair is merged through boxing_merge_fighters() and the merge
-- decision is appended; nothing here is deleted, the hold resolves through lineage (the merged fighter stops being a
-- canonical row, so the pair drops out of the duplicate scan while both records remain).

create table if not exists public.boxing_duplicate_hold_decisions (
  id uuid primary key default gen_random_uuid(),
  seeded_fighter_id uuid not null references public.boxing_fighters (id),
  survivor_fighter_id uuid not null references public.boxing_fighters (id),
  seeded_display_name text not null,
  survivor_display_name text not null,
  status text not null default 'HOLD' check (status = 'HOLD'),
  reviewer text not null check (reviewer !~* '(resolver|claude|gpt|openai|anthropic|\mbot\M|automat|script|system)'),
  reason text not null check (length(btrim(reason)) >= 20),
  equivalence_evidence jsonb not null check (equivalence_evidence <> '{}'::jsonb),
  missing_evidence text not null check (length(btrim(missing_evidence)) >= 5),
  decided_at timestamptz not null default now(),
  check (seeded_fighter_id <> survivor_fighter_id),
  unique (seeded_fighter_id, survivor_fighter_id, status)
);
select public.boxing_install_append_only('public.boxing_duplicate_hold_decisions');

comment on table public.boxing_duplicate_hold_decisions is
  'Reviewed duplicate HOLDs: known possible duplicates a human held for missing evidence. Not merge permission; the graph proof lists them and fails on any duplicate without one.';

select public.boxing_lockdown();
