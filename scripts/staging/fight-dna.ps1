# Fight DNA backfill against Boxing STAGING only.
#
#   pwsh scripts/staging/fight-dna.ps1 [-CoverageOnly]
#
# Lists fighters and officials with canonical bouts through the verified
# Management API, derives snapshots via scripts/intel/dna-once.mjs (guarded
# store, service-role key in this process only), then prints coverage.

param([switch]$CoverageOnly)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"

if (-not $CoverageOnly) {
  $fighters = @(Invoke-BoxingStagingSql -Ref $ref -Sql "select distinct public.boxing_canonical_fighter_id(p.fighter_id)::text id from public.boxing_bout_participants p where p.participant_status in ('scheduled','confirmed')" | ForEach-Object { $_.id })
  $officials = @(Invoke-BoxingStagingSql -Ref $ref -Sql "select distinct bo.official_id::text id from public.boxing_bout_officials bo" | ForEach-Object { $_.id })
  $tmp = [System.IO.Path]::GetTempFileName()
  @{ fighters = $fighters; officials = $officials } | ConvertTo-Json -Depth 3 | Set-Content -Path $tmp -Encoding utf8
  $keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
  $service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
  if (-not $service) { throw 'service_role key not available' }
  try {
    $env:SUPABASE_URL = "https://$ref.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = $service
    $env:BOXING_ENVIRONMENT = 'staging'
    $env:BOXING_SUPABASE_REF = $ref
    node (Join-Path $root 'scripts/intel/dna-once.mjs') $tmp
    if ($LASTEXITCODE -ne 0) { throw "dna-once exited $LASTEXITCODE" }
  } finally {
    Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
    Remove-Variable service, keys -ErrorAction SilentlyContinue
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

$coverage = @"
with latest as (
  select distinct on (s.fighter_id, s.metric_key) s.fighter_id, s.metric_key, s.status, s.sample_size, s.value_number
  from public.boxing_fighter_metric_snapshots s order by s.fighter_id, s.metric_key, s.as_of desc)
select jsonb_build_object(
  'fighters_with_bouts', (select count(distinct p.fighter_id) from public.boxing_bout_participants p where p.participant_status in ('scheduled','confirmed')),
  'fighters_with_any_dna', (select count(distinct fighter_id) from latest where status = 'available'),
  'fighters_sufficiently_sampled_3plus_bouts', (select count(*) from latest where metric_key = 'activity.pro_bouts' and status = 'available' and value_number >= 3),
  'metrics_by_status', (select jsonb_object_agg(status, n) from (select status, count(distinct metric_key) n from latest group by 1) x),
  'metrics_available_for_any_fighter', (select coalesce(jsonb_agg(distinct metric_key order by metric_key), '[]'::jsonb) from latest where status = 'available'),
  'metrics_never_available', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from (select metric_key k from latest group by 1 having bool_and(status <> 'available')) x),
  'source_unavailable_metrics', (select coalesce(jsonb_agg(distinct metric_key order by metric_key), '[]'::jsonb) from latest where status = 'source_unavailable')
)::text as c
"@
(Invoke-BoxingStagingSql -Ref $ref -Sql $coverage).c
