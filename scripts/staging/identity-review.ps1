# Human identity review batches against Boxing STAGING only.
#
#   pwsh scripts/staging/identity-review.ps1 -Propose -Batch 001 -Size 10 -OutDir <dir>   # read-only
#   pwsh scripts/staging/identity-review.ps1 -Apply <batch.json> -Reviewer "<human name>" # records approved entries, re-applies, reports
#   pwsh scripts/staging/identity-review.ps1 -DryRun -Batch 002 -OutDir <dir>             # read-only: what the resolver WOULD bind now
#   pwsh scripts/staging/identity-review.ps1 -Metrics                                     # queue, blocked bouts, counts, DNA coverage, stored-odds replay
#
# Verifies the project is propbetedge-boxing-staging; the service-role key lives in
# THIS process only. No external source is contacted (stored observations only).

param([switch]$DryRun, [switch]$Propose, [string]$Batch = '001', [int]$Size = 10, [string]$OutDir = '', [string]$Apply = '', [string]$Reviewer = '', [switch]$Metrics)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"
if ($Apply -and -not $Reviewer) { throw '-Reviewer "<human name>" is required with -Apply' }
$keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
$service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
if (-not $service) { throw 'service_role key not available' }
try {
  $env:SUPABASE_URL = "https://$ref.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY = $service
  $env:BOXING_ENVIRONMENT = 'staging'
  $env:BOXING_SUPABASE_REF = $ref
  $script = Join-Path $root 'scripts/identity/review-once.mjs'
  if ($Propose) {
    $nodeArgs = @($script, 'propose', "--batch=$Batch", "--size=$Size")
    if ($OutDir) { $nodeArgs += "--out=$OutDir" }
    node @nodeArgs
  }
  if ($Apply) { node $script apply "--file=$Apply" "--reviewer=$Reviewer" }
  if ($DryRun) {
    $nodeArgs = @($script, 'dryrun', "--batch=$Batch")
    if ($OutDir) { $nodeArgs += "--out=$OutDir" }
    node @nodeArgs
  }
  if ($Metrics) { node $script metrics }
  if ($LASTEXITCODE -ne 0) { throw "review-once exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY, Env:SUPABASE_URL, Env:BOXING_ENVIRONMENT, Env:BOXING_SUPABASE_REF -ErrorAction SilentlyContinue
  Remove-Variable service, keys -ErrorAction SilentlyContinue
}
if ($Metrics -or $Apply) {
  $sql = @"
with latest as (select distinct on (s.fighter_id, s.metric_key) s.fighter_id, s.metric_key, s.status, s.value_number
                from public.boxing_fighter_metric_snapshots s order by s.fighter_id, s.metric_key, s.as_of desc)
select jsonb_build_object(
  'canonical_boxers', (select count(*) from public.boxing_fighters where identity_state <> 'merged'),
  'canonical_bouts', (select count(*) from public.boxing_bouts),
  'review_pending_by_source', (select jsonb_object_agg(s.source_key, x.n) from (select q.source_id, count(*) n from public.boxing_identity_review_queue q where q.status = 'pending' group by 1) x join public.boxing_sources s on s.id = x.source_id),
  'human_decisions', (select count(*) from public.boxing_identity_appearance_decisions where decided_by <> 'resolver'),
  'fight_dna', jsonb_build_object(
    'fighters_with_bouts', (select count(distinct p.fighter_id) from public.boxing_bout_participants p where p.participant_status in ('scheduled','confirmed')),
    'fighters_with_dna', (select count(distinct fighter_id) from latest where status = 'available'),
    'fighters_3plus_bouts', (select count(*) from latest where metric_key = 'activity.pro_bouts' and status = 'available' and value_number >= 3),
    'metrics_available', (select count(distinct metric_key) from latest where status = 'available'),
    'metrics_source_unavailable', (select count(distinct metric_key) from latest where status = 'source_unavailable'))
)::text as m
"@
  (Invoke-BoxingStagingSql -Ref $ref -Sql $sql).m
}
