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
