# Sets boxing-odds-staging Worker secrets without writing any secret to disk
# or printing it. Staging project is verified first.
#
#   pwsh scripts/staging/set-odds-worker-secrets.ps1
#
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: propbetedge-boxing-staging only.
# ODDS_API_KEY: the existing PropBetEdge key (no second key is created).
# BOXING_INTERNAL_TOKEN: generated once into D:\Workers\secrets\boxing-odds-staging-internal-token.

$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"

$tokenFile = 'D:\Workers\secrets\boxing-odds-staging-internal-token'
if (-not (Test-Path $tokenFile)) {
  $bytes = [byte[]]::new(36); [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [IO.File]::WriteAllText($tokenFile, [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('='))
}
$keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
$service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
$line = Get-Content 'D:\Workers\secrets\ufc-propbetedge.env' | Where-Object { $_ -match '^ODDS_API_KEY=' } | Select-Object -First 1
$odds = ($line -replace '^ODDS_API_KEY=', '').Trim().Trim('"')
if (-not $service -or -not $odds) { throw 'missing service_role key or ODDS_API_KEY' }
$payload = @{
  SUPABASE_URL = "https://$ref.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY = $service
  ODDS_API_KEY = $odds
  BOXING_INTERNAL_TOKEN = (Get-Content $tokenFile -Raw).Trim()
} | ConvertTo-Json -Compress
try {
  Push-Location (Join-Path $root 'workers/boxing-odds')
  $out = $payload | npx --yes wrangler@4 secret bulk --env staging 2>&1 | Out-String
  foreach ($s in @($service, $odds)) { $out = $out.Replace($s, '<redacted>') }
  Write-Host ($out -split "`n" | Where-Object { $_ -match 'secret|Success|✨|ERROR|error' } | Out-String)
  if ($LASTEXITCODE -ne 0) { throw "wrangler secret bulk exited $LASTEXITCODE" }
} finally {
  Pop-Location
  Remove-Variable payload, service, odds, keys, line -ErrorAction SilentlyContinue
}
