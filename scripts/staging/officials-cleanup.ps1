# Officials cleanup against Boxing STAGING only.
#
#   pwsh scripts/staging/officials-cleanup.ps1 -Evidence -OutDir <dir>                     # READ ONLY: evidence.json
#   pwsh scripts/staging/officials-cleanup.ps1 -Plan -OutDir <dir> [-SimulateParse]        # READ ONLY: evidence + plan (.json/.md)
#   pwsh scripts/staging/officials-cleanup.ps1 -ApplyCategoryA -Actor "<name>" -OutDir <dir>  # Category A only; needs migration 0024
#
# -Evidence/-Plan run a single SELECT through the Management API (works before migration 0024 is applied).
# -SimulateParse re-fetches the same official Nevada/New Jersey PDFs and parses them in memory; nothing is stored.
# -ApplyCategoryA reads the service-role key into THIS process only, recomputes the plan from live evidence and
# applies only deterministic parser artifacts; B/C/D are written as a human review batch.

param([switch]$Evidence, [switch]$Plan, [switch]$SimulateParse, [switch]$ApplyCategoryA, [string]$Actor = '', [string]$OutDir = '.')
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"
New-Item -ItemType Directory -Force $OutDir | Out-Null
$evidencePath = Join-Path $OutDir 'officials-evidence.json'

if ($Evidence -or $Plan) {
  $body = (Get-Content (Join-Path $root 'scripts/officials/cleanup-evidence.sql') -Raw) -replace '(?m)^--.*$', ''
  $body = $body.Trim().TrimEnd(';')
  $rows = Invoke-BoxingStagingSql -Ref $ref -Sql ("select ((" + $body + "))::text as evidence")
  [IO.File]::WriteAllText($evidencePath, $rows[0].evidence, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "evidence: $evidencePath"
}
if ($Plan) {
  $nodeArgs = @((Join-Path $root 'scripts/officials/cleanup-plan.mjs'), "--evidence=$evidencePath", "--out=$OutDir")
  if ($SimulateParse) { $nodeArgs += '--simulate-parse' }
  node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "cleanup-plan exited $LASTEXITCODE" }
}
if ($ApplyCategoryA) {
  if (-not $Actor) { throw '-Actor "<name>" is required with -ApplyCategoryA' }
  $keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
  $service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
  if (-not $service) { throw 'service_role key not available' }
  try {
    $env:SUPABASE_URL = "https://$ref.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = $service
    $env:BOXING_ENVIRONMENT = 'staging'
    $env:BOXING_SUPABASE_REF = $ref
    node (Join-Path $root 'scripts/officials/cleanup-apply.mjs') "--actor=$Actor" '--confirm-staging' "--out=$OutDir"
    if ($LASTEXITCODE -ne 0) { throw "cleanup-apply exited $LASTEXITCODE" }
  } finally {
    Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
    Remove-Variable service, keys -ErrorAction SilentlyContinue
  }
}
