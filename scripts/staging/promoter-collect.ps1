# One guarded promoter card collection run against Boxing STAGING only.
#
#   pwsh scripts/staging/promoter-collect.ps1                 # dry run: fetch, parse, plan, write nothing
#   pwsh scripts/staging/promoter-collect.ps1 -Apply          # canonicalize the announced cards
#   pwsh scripts/staging/promoter-collect.ps1 -Apply -Out reviews/promoters/2026-09-19-applied.json
#
# Verifies the project is propbetedge-boxing-staging, reads the service-role key from the Management API into THIS
# process only, runs the same collector the dry run and the tests exercise, then clears it.
#
# The schedule lane is the only lane these sources hold: migration 0045's gate refuses results, officials, scorecards,
# weigh-ins, photos, video and article text from them at write time, and a refusal is counted, never fatal.

param([switch]$Apply, [string]$Sources = 'promoter_pbc,promoter_matchroom', [int]$WindowDays = 21, [int]$MaxEvents = 6, [string]$Out = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"

# ---- source registry gate: the collector never forces itself past the state migration 0046 actually left behind.
# Before any write we assert, for every source we are about to collect, that it is enabled, approved for ingest, and
# holds the schedule lane under a rights scope that permits it. If it does not, we STOP: the fix is the migration or
# the rights review, never a flag on the collector.
$wanted = ($Sources -split ',' | ForEach-Object { "'" + $_.Trim() + "'" }) -join ','
# the schedule lane's own objects must exist before the lane can be asserted at all
$shape = Invoke-BoxingStagingSql -Ref $ref -Sql @'
select to_regclass('public.boxing_sources')::text as sources,
       to_regclass('public.boxing_source_capabilities_current')::text as capabilities,
       to_regclass('public.boxing_event_discovery_candidates')::text as candidates
'@
$missing = @('sources','capabilities','candidates') | Where-Object { -not $shape[0].$_ }
if ($missing) {
  Write-Host ''
  Write-Host 'STOP: the promoter schedule lane is not installed on this database.' -ForegroundColor Red
  Write-Host ("  missing: {0}" -f ($missing -join ', ')) -ForegroundColor Red
  Write-Host '  apply migrations 0042-0046 first, then re-run this gate. Do not force the collector past it.' -ForegroundColor Red
  throw 'promoter source/lane gate failed: schema not present'
}
$gateSql = @"
select s.source_key,
       s.enabled::text as enabled,
       s.access_mode,
       s.rights_state,
       coalesce((select count(*) from public.boxing_source_capabilities_current c
                  where c.source_id = s.id and c.lane in ('events','upcoming_cards','bouts')
                    and c.rights_scope = 'covered_by_rights_review'), 0)::text as schedule_lanes,
       coalesce((select count(*) from public.boxing_source_capabilities_current c
                  where c.source_id = s.id and c.lane in ('results','photos','video','article_text')
                    and c.rights_scope <> 'not_permitted'), 0)::text as leaked_lanes
from public.boxing_sources s where s.source_key in ($wanted) order by s.source_key
"@
$gate = Invoke-BoxingStagingSql -Ref $ref -Sql $gateSql
$expected = ($Sources -split ',' | ForEach-Object { $_.Trim() })
$failures = @()
foreach ($key in $expected) {
  $row = $gate | Where-Object { $_.source_key -eq $key }
  if (-not $row) { $failures += "$key : not registered in boxing_sources (is migration 0046 applied?)"; continue }
  Write-Host ("source {0}: enabled={1} access={2} rights={3} schedule_lanes={4} non_schedule_leaks={5}" -f `
    $row.source_key, $row.enabled, $row.access_mode, $row.rights_state, $row.schedule_lanes, $row.leaked_lanes)
  if ($row.enabled -ne 'true') { $failures += "$key : disabled" }
  if ($row.access_mode -ne 'approved_ingest') { $failures += "$key : access_mode=$($row.access_mode), expected approved_ingest" }
  if ($row.rights_state -ne 'approved') { $failures += "$key : rights_state=$($row.rights_state), expected approved" }
  if ([int]$row.schedule_lanes -lt 3) { $failures += "$key : only $($row.schedule_lanes)/3 schedule lanes covered by the rights review" }
  if ([int]$row.leaked_lanes -gt 0) { $failures += "$key : $($row.leaked_lanes) non-schedule lane(s) are not marked not_permitted" }
}
if ($failures.Count) {
  Write-Host ''
  Write-Host 'STOP: the promoter source registry is not in the expected state. Do not force the collector past it.' -ForegroundColor Red
  foreach ($f in $failures) { Write-Host "  - $f" -ForegroundColor Red }
  throw 'promoter source/lane gate failed'
}
Write-Host 'source/lane gate: PASS'
if (-not $Apply) { Write-Host 'mode: dry run (no writes)' }

$keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
$service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
if (-not $service) { throw 'service_role key not available' }
try {
  $env:SUPABASE_URL = "https://$ref.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY = $service
  $env:BOXING_ENVIRONMENT = 'staging'
  $env:BOXING_SUPABASE_REF = $ref
  $nodeArgs = @((Join-Path $root 'scripts/promoters/collect-once.mjs'), "--sources=$Sources", "--window=$WindowDays", "--max=$MaxEvents")
  if ($Apply) { $nodeArgs += '--apply' }
  if ($Out) { $nodeArgs += "--out=$(Join-Path $root $Out)" }
  node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "collect-once exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys -ErrorAction SilentlyContinue
}
