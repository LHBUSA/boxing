# Event display-name repair against Boxing STAGING only (naming rule commission-event-name@2).
#
#   pwsh scripts/staging/refresh-event-names.ps1 -Adapter pennsylvania -OutDir <dir>          # READ ONLY: derived names + diff
#   pwsh scripts/staging/refresh-event-names.ps1 -Adapter pennsylvania -OutDir <dir> -Write   # rename the differing events
#
# The diff compares derived names with stored names by the event's source identity. -Write sends ONLY the differing
# events; the database renames only events the adapter's source owns and records boxing_event_name_revisions rows.

param([Parameter(Mandatory = $true)][string]$Adapter, [string]$OutDir = '.', [switch]$Write)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"
New-Item -ItemType Directory -Force $OutDir | Out-Null
$derivedPath = Join-Path $OutDir "event-names-$Adapter-derived.json"
$diffPath = Join-Path $OutDir "event-names-$Adapter-diff.json"

$keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
$service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
if (-not $service) { throw 'service_role key not available' }
try {
  $env:SUPABASE_URL = "https://$ref.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY = $service
  $env:BOXING_ENVIRONMENT = 'staging'
  $env:BOXING_SUPABASE_REF = $ref
  node (Join-Path $root 'scripts/commissions/refresh-event-names.mjs') $Adapter "--out=$derivedPath"
  if ($LASTEXITCODE -ne 0) { throw "derive exited $LASTEXITCODE" }

  $json = [IO.File]::ReadAllText($derivedPath).Replace("'", "''")
  $sql = @"
select coalesce(jsonb_agg(jsonb_build_object('source_key', d->>'source_key', 'namespace', d->>'namespace', 'external_id', d->>'external_id',
  'name', d->>'name', 'name_rule', d->>'name_rule', 'stored_name', e.name, 'event_public_id', e.public_id, 'owned_by_source', e.source_id = s.id) order by e.event_date), '[]'::jsonb)::text as diff
from jsonb_array_elements('$json'::jsonb) d
join public.boxing_event_identities i on i.namespace = d->>'namespace' and i.external_id = d->>'external_id' and i.verification_state <> 'rejected'
join public.boxing_events e on e.id = i.event_id
join public.boxing_sources s on s.source_key = d->>'source_key'
where e.name is distinct from d->>'name'
"@
  $rows = Invoke-BoxingStagingSql -Ref $ref -Sql $sql
  [IO.File]::WriteAllText($diffPath, $rows[0].diff, (New-Object System.Text.UTF8Encoding $false))
  $diff = $rows[0].diff | ConvertFrom-Json
  Write-Host "differing names: $($diff.Count) -> $diffPath"
  foreach ($d in $diff) { Write-Host ("  {0}  '{1}' -> '{2}'  owned={3}" -f $d.external_id, $d.stored_name, $d.name, $d.owned_by_source) }

  if ($Write -and $diff.Count -gt 0) {
    node (Join-Path $root 'scripts/commissions/refresh-event-names.mjs') $Adapter "--in=$diffPath" '--write'
    if ($LASTEXITCODE -ne 0) { throw "write exited $LASTEXITCODE" }
  }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys -ErrorAction SilentlyContinue
}
