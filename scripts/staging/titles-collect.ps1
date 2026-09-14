# One guarded sanctioning-body collection against Boxing STAGING only (WBA, IBF, WBO; WBC is not licensed).
#
#   pwsh scripts/staging/titles-collect.ps1 -Body wba
#   pwsh scripts/staging/titles-collect.ps1 -Body ibf -Backfill
#   pwsh scripts/staging/titles-collect.ps1 -Body wbo -Backfill -From 2000-01 -To 2026-08 [-MaxRequests 60]
#
# Verifies the project is propbetedge-boxing-staging, reads the service-role key from the Management API into THIS
# process only, runs scripts/titles/collect-once.mjs (same code path as the boxing-rankings Worker), then clears it.

param([Parameter(Mandatory = $true)][ValidateSet('wba', 'ibf', 'wbo')][string]$Body, [switch]$Backfill, [string]$From = '', [string]$To = '', [int]$MaxRequests = 0)
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
  $nodeArgs = @((Join-Path $root 'scripts/titles/collect-once.mjs'), $Body)
  if ($Backfill) { $nodeArgs += '--backfill' }
  if ($From) { $nodeArgs += "--from=$From" }
  if ($To) { $nodeArgs += "--to=$To" }
  if ($MaxRequests -gt 0) { $nodeArgs += "--max-requests=$MaxRequests" }
  node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "collect-once exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys -ErrorAction SilentlyContinue
}
