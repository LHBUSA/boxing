# Chronological title-status diff/proposal pass on Boxing STAGING (records diffs and proposals only).
#
#   pwsh scripts/staging/titles-diff-pass.ps1 [-Bodies ibf,wba,wbo] [-Batch 40] [-MaxBatches 0]
#
# Verifies the project is propbetedge-boxing-staging, reads the service-role key from the Management API into THIS
# process only, runs scripts/titles/diff-pass.mjs, then clears it.

param([string]$Bodies = 'ibf,wba,wbo', [int]$Batch = 40, [int]$MaxBatches = 0)
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
  $nodeArgs = @((Join-Path $root 'scripts/titles/diff-pass.mjs'), $Bodies, "--batch=$Batch")
  if ($MaxBatches -gt 0) { $nodeArgs += "--max-batches=$MaxBatches" }
  node @nodeArgs
  if ($LASTEXITCODE -ne 0) { throw "diff-pass exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys -ErrorAction SilentlyContinue
}
