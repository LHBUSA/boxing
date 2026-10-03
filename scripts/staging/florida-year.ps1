# One Florida history year into the Boxing database, then its Fight Record report (owner direction 2026-10-03).
#
#   pwsh scripts/staging/florida-year.ps1 -Year 2023 [-Out reviews/records/florida-2023.json]
#
# Runs commissions-ingest.ps1 -Adapter florida -Backfill -Year <y> (serial, checkpointed by the document registry,
# COMMISSION_FETCH_DELAY_MS apart) until the year is covered (a pass under the 80-document cap, or no new result), then
# reports (-ReportOnly: report without fetching), for that
# year's Florida events: documents, professional bouts, fighters linked / unresolved, new canonical bouts this run,
# duplicates, Pro Debut markers, debut claims, conflicts, sensitive fields retained, earliest/latest event.
param([Parameter(Mandatory = $true)][int]$Year, [string]$Out = '', [int]$MaxPasses = 4, [switch]$ReportOnly)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'production/boxing-production.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$null = Assert-BoxingProject -Ref $ref
$countSql = "select count(*)::int n from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id join public.boxing_sources s on s.id = b.source_id where s.source_key = 'florida_athletic_commission' and extract(year from e.event_date) = $Year"
$before = (Invoke-BoxingSql -Ref $ref -Sql $countSql).n
$runs = @()
for ($pass = 1; -not $ReportOnly -and $pass -le $MaxPasses; $pass++) {
  $text = (pwsh -NoProfile -File (Join-Path $PSScriptRoot 'commissions-ingest.ps1') -Adapter florida -Backfill -Year $Year 2>&1 | ForEach-Object { "$_" }) -join "`n"
  $m = @{}
  foreach ($k in 'status', 'documents_listed', 'documents_fetched', 'documents_changed', 'documents_unchanged', 'parse_failures', 'results_created', 'results_duplicate', 'identity_unresolved') {
    if ($text -match "`"$k`":\s*`"?([a-z0-9_]+)`"?") { $m[$k] = $Matches[1] }
  }
  $runs += $m
  Write-Host "pass $pass : $($m | ConvertTo-Json -Compress)"
  # a year is finished when a pass fetched under the per-run cap (80), or changed no document: backfill order puts
  # documents not yet processed by this parser first, so a pass that changed nothing left only current documents
  if (-not $m['documents_fetched'] -or [int]$m['documents_fetched'] -lt 80 -or [int]$m['documents_changed'] -eq 0) { break }
}
$report = Invoke-BoxingSql -Ref $ref -Sql @"
with ev as (select e.id, e.event_date from public.boxing_events e join public.boxing_sources s on s.id = e.source_id
            where s.source_key = 'florida_athletic_commission' and extract(year from e.event_date) = $Year),
bt as (select b.id from public.boxing_bouts b join ev on ev.id = b.event_id),
docs as (select d.id from public.boxing_source_documents d join public.boxing_sources s on s.id = d.source_id
         where s.source_key = 'florida_athletic_commission' and d.doc_key ~ '(^|[^0-9])$Year' and d.current_revision > 0),
fl as (select c.* from public.boxing_fighter_record_claims c join public.boxing_sources s on s.id = c.source_id
       where s.source_key = 'florida_athletic_commission' and extract(year from c.effective_as_of) = $Year),
obs as (select o.payload from public.boxing_source_observations o join public.boxing_sources s on s.id = o.source_id
        where s.source_key = 'florida_athletic_commission' and o.entity_type = 'commission_bout_result' and o.payload ->> 'document_key' ~ '(^|[^0-9])$Year')
select jsonb_build_object(
  'year', $Year,
  'documents_parsed', (select count(*) from docs),
  'events', (select count(*) from ev),
  'earliest_event', (select min(event_date)::text from ev), 'latest_event', (select max(event_date)::text from ev),
  -- live vs stored (migration 0061): a replaced row stays stored and in the truth ledger but is not a live bout
  'live_professional_bouts', (cov.c ->> 'live_bouts')::int,
  'historical_replaced_bouts', (cov.c ->> 'replaced_bouts')::int,
  'total_stored_bout_rows', (cov.c ->> 'total_bout_rows')::int,
  'held_bouts_identity_review', (cov.c ->> 'held_bouts')::int,
  'new_canonical_bouts_this_run', (select count(*) from bt) - $before,
  'fighters_linked', (cov.c ->> 'fighters_linked_live')::int,
  -- each stored claim is one printed "Pro Debut" marker (a re-parse of identical content writes no new observation)
  'pro_debut_markers_stored_as_claims', (select count(*) from fl where claim_basis = 'explicit_pro_debut_marker'),
  'debut_conflicts', (select count(*) from (select distinct fighter_id from fl) f where public.boxing_fighter_record_reconciliation(f.fighter_id) ->> 'classification' = 'CONFLICT'),
  'sensitive_retained', (select count(*) from obs o where o.payload::text ~* '"(dob|date_of_birth|fed_id|federal_id)"\s*:' or o.payload::text ~ '\m\d{2}/\d{2}/\d{4}\M' or o.payload::text ~ '\mFL-\d{5,}')
) as r
from (select public.boxing_commission_year_coverage('florida_athletic_commission', $Year) c) cov
"@
$result = [pscustomobject]@{ report = $report.r; passes = $runs }
$json = $result | ConvertTo-Json -Depth 6
if ($Out) { Set-Content -Path (Join-Path $root $Out) -Value $json -Encoding utf8 }
$json
