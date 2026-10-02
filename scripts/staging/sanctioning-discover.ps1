# One sanctioning-schedule DISCOVERY run against Boxing STAGING only.
#
#   pwsh scripts/staging/sanctioning-discover.ps1            # dry run: fetch and parse, write nothing
#   pwsh scripts/staging/sanctioning-discover.ps1 -Apply -Out reviews/promoters/<date>-wbc-discovery.json
#
# Records boxing_event_discovery_candidates only (matched = corroboration of a card a schedule lane holds; open = a card
# we may be missing). It never writes an event, bout or fighter, so it needs no schedule lane.

param([switch]$Apply, [int]$WindowDays = 120, [string]$Out = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'production/boxing-production.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"

$keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
$service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
if (-not $service) { throw 'service_role key not available' }
try {
  $env:SUPABASE_URL = "https://$ref.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY = $service
  $env:BOXING_ENVIRONMENT = 'staging'
  $env:BOXING_SUPABASE_REF = $ref
  $nodeArgs = @((Join-Path $root 'scripts/sanctioning/discover-once.mjs'), "--window=$WindowDays")
  if ($Apply) { $nodeArgs += '--apply' }
  if ($Out) { $nodeArgs += "--out=$(Join-Path $root $Out)" }
  node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "discover-once exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys -ErrorAction SilentlyContinue
}
