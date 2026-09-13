# One guarded commission ingestion run against Boxing STAGING only.
#
#   pwsh scripts/staging/commissions-ingest.ps1 -Adapter nevada [-Backfill -Year 2026] [-ReplayOdds] [-CoverageOnly]
#
# Verifies the project is propbetedge-boxing-staging, reads the service-role
# key from the Management API into THIS process only, runs
# scripts/commissions/ingest-once.mjs (same code path as the Worker), then
# clears it. No provider key is involved; official commission sites only.

param([string]$Adapter = '', [switch]$Backfill, [int]$Year = 0, [switch]$ReplayOdds, [switch]$CoverageOnly)
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
  $nodeArgs = @((Join-Path $root 'scripts/commissions/ingest-once.mjs'))
  if ($Adapter) { $nodeArgs += $Adapter }
  if ($Backfill) { $nodeArgs += '--backfill' }
  if ($Year -gt 0) { $nodeArgs += "--year=$Year" }
  if ($ReplayOdds) { $nodeArgs += '--replay-odds' }
  if ($CoverageOnly) { $nodeArgs += '--coverage-only' }
  node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "ingest-once exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys -ErrorAction SilentlyContinue
}
