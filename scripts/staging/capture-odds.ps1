# One guarded boxing odds capture against Boxing STAGING only.
#
#   pwsh scripts/staging/capture-odds.ps1 [-Force] [-CoverageOnly]
#
# Verifies the project is propbetedge-boxing-staging (never UFC/NFL/MLB), reads
# the service-role key from the Management API and ODDS_API_KEY from
# D:\Workers\secrets\ufc-propbetedge.env into THIS process environment only,
# runs scripts/odds/capture-once.mjs (same code path as the Worker), then
# clears them. Nothing secret is printed or written.

param([switch]$Force, [switch]$CoverageOnly)
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
$oddsKey = $null
if (-not $CoverageOnly) {
  $line = Get-Content 'D:\Workers\secrets\ufc-propbetedge.env' | Where-Object { $_ -match '^ODDS_API_KEY=' } | Select-Object -First 1
  if (-not $line) { throw 'ODDS_API_KEY not found in D:\Workers\secrets\ufc-propbetedge.env' }
  $oddsKey = ($line -replace '^ODDS_API_KEY=', '').Trim().Trim('"')
  Write-Host "provider key present (length $($oddsKey.Length))"
}
try {
  $env:SUPABASE_URL = "https://$ref.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY = $service
  $env:BOXING_ENVIRONMENT = 'staging'
  $env:BOXING_SUPABASE_REF = $ref
  if ($oddsKey) { $env:ODDS_API_KEY = $oddsKey }
  $nodeArgs = @((Join-Path $root 'scripts/odds/capture-once.mjs'))
  if ($Force) { $nodeArgs += '--force' }
  if ($CoverageOnly) { $nodeArgs += '--coverage-only' }
  node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "capture-once exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:ODDS_API_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys, oddsKey -ErrorAction SilentlyContinue
}
