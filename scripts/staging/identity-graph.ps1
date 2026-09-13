# Identity-graph operations against Boxing STAGING only.
#
#   pwsh scripts/staging/identity-graph.ps1 -Summary
#   pwsh scripts/staging/identity-graph.ps1 -Report -OutDir <dir>
#   pwsh scripts/staging/identity-graph.ps1 -Reapply nevada,florida
#
# Verifies the project is propbetedge-boxing-staging, reads the service-role key
# into THIS process only, runs scripts/identity/graph-once.mjs, then clears it.
# No external source is contacted: stored official observations only.

param([switch]$Summary, [switch]$Report, [string]$OutDir = '', [string[]]$Reapply = @())
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
  $script = Join-Path $root 'scripts/identity/graph-once.mjs'
  if ($Summary) { node $script summary }
  if ($Report) { if ($OutDir) { node $script report "--out=$OutDir" } else { node $script report } }
  if ($Reapply.Count) { node $script reapply @($Reapply | ForEach-Object { $_ -split ',' }) }
  if ($LASTEXITCODE -ne 0) { throw "graph-once exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys -ErrorAction SilentlyContinue
}
