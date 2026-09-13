# Sets boxing-commissions-staging Worker secrets without writing any secret to
# disk or printing it. Staging project is verified first. No provider key.
#
#   pwsh scripts/staging/set-commissions-worker-secrets.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"

$tokenFile = 'D:\Workers\secrets\boxing-commissions-staging-internal-token'
if (-not (Test-Path $tokenFile)) {
  $bytes = [byte[]]::new(36); [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [IO.File]::WriteAllText($tokenFile, [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('='))
}
$keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
$service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
if (-not $service) { throw 'missing service_role key' }
$payload = @{
  SUPABASE_URL = "https://$ref.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY = $service
  BOXING_INTERNAL_TOKEN = (Get-Content $tokenFile -Raw).Trim()
} | ConvertTo-Json -Compress
try {
  Push-Location (Join-Path $root 'workers/boxing-commissions')
  $out = $payload | npx --yes wrangler@4 secret bulk --env staging 2>&1 | Out-String
  $out = $out.Replace($service, '<redacted>')
  Write-Host ($out -split "`n" | Where-Object { $_ -match 'secret|Success|✨|ERROR|error' } | Out-String)
  if ($LASTEXITCODE -ne 0) { throw "wrangler secret bulk exited $LASTEXITCODE" }
} finally {
  Pop-Location
  Remove-Variable payload, service, keys -ErrorAction SilentlyContinue
}
