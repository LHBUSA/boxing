# Natural cron verification for boxing-commissions-staging (read-only; never invokes the Worker).
#
#   pwsh scripts/staging/natural-run-check.ps1 -Snapshot -Out <file.json>                     # counts before the slot
#   pwsh scripts/staging/natural-run-check.ps1 -Check -Baseline <file.json> -Slot 2026-09-15T11:40:00Z -Out <file.json>
#
# -Check reads the invocation ledger and ingest runs written at the slot, takes a fresh snapshot and compares it with
# the baseline. Checklist: docs/COMMISSION_NATURAL_RUN_2026-09-15.md.

param([switch]$Snapshot, [switch]$Check, [string]$Baseline = '', [string]$Slot = '', [string]$Out = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified: $($project.name) ($ref)"

function Get-Snapshot {
  $sql = Get-Content (Join-Path $PSScriptRoot 'natural-run-snapshot.sql') -Raw -Encoding UTF8
  (Invoke-BoxingStagingSql -Ref $ref -Sql $sql).snapshot
}

if ($Snapshot) {
  $s = Get-Snapshot
  $json = $s | ConvertTo-Json -Depth 20
  if ($Out) { $json | Set-Content -Path $Out -Encoding UTF8; Write-Host "wrote $Out" } else { $json }
}

if ($Check) {
  if (-not $Baseline -or -not $Slot) { throw '-Check needs -Baseline <file> and -Slot <ISO time of the cron slot>' }
  $since = ([datetime]::Parse($Slot).ToUniversalTime().AddMinutes(-1)).ToString('yyyy-MM-ddTHH:mm:ssZ')
  $before = Get-Content $Baseline -Raw | ConvertFrom-Json
  $baselineAt = ([datetime]$before.taken_at).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  $invocations = Invoke-BoxingStagingSql -Ref $ref -Sql @"
select invocation_id, worker_name, worker_version, trigger_type, cron, scheduled_for, runtime, outcome, ingest_run_id, detail, started_at, completed_at
from public.boxing_worker_invocations
where worker = 'boxing-commissions' and trigger_type = 'scheduled' and scheduled_for >= '$since' and scheduled_for < '$since'::timestamptz + interval '10 minutes'
order by started_at
"@
  $runs = Invoke-BoxingStagingSql -Ref $ref -Sql @"
select r.id, s.source_key, r.trigger_type, r.worker_name, r.worker_version, r.invocation_id, r.scheduled_for, r.source_version, r.status,
  r.started_at, r.completed_at, r.metrics
from public.boxing_ingest_runs r join public.boxing_sources s on s.id = r.source_id
where r.worker = 'boxing-commissions' and r.trigger_type = 'scheduled' and r.scheduled_for >= '$since' and r.scheduled_for < '$since'::timestamptz + interval '10 minutes'
order by r.started_at
"@
  $other = Invoke-BoxingStagingSql -Ref $ref -Sql @"
select jsonb_build_object(
  'non_scheduled_runs_since_baseline', (select count(*) from public.boxing_ingest_runs r where r.worker = 'boxing-commissions' and r.started_at >= '$baselineAt' and coalesce(r.trigger_type, '') <> 'scheduled'),
  'texas_runs', (select count(*) from public.boxing_ingest_runs r join public.boxing_sources s on s.id = r.source_id where s.source_key = 'tdlr_texas'),
  'human_decisions_since_slot', (select count(*) from public.boxing_identity_appearance_decisions where decided_by <> 'resolver' and decided_at >= '$since'),
  'decisions_since_slot_by_version', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select coalesce(resolver_version, '-') || ':' || decision v, count(*) n from public.boxing_identity_appearance_decisions where decided_at >= '$since' group by 1) x),
  'queue_items_since_slot', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select s.source_key || ':' || q.reason k, count(*) n from public.boxing_identity_review_queue q join public.boxing_sources s on s.id = q.source_id where q.created_at >= '$since' group by 1) x),
  'event_identities_first_seen_since_slot', (select coalesce(jsonb_agg(jsonb_build_object('source', s.source_key, 'date', e.event_date, 'name', e.name)), '[]'::jsonb) from public.boxing_event_identities i join public.boxing_events e on e.id = i.event_id join public.boxing_sources s on s.id = i.source_id where i.first_observed_at >= '$since'),
  'revisions_since_slot', (select coalesce(jsonb_agg(jsonb_build_object('doc', d.doc_key, 'revision', r.revision, 'parser', r.parser_version)), '[]'::jsonb) from public.boxing_source_document_revisions r join public.boxing_source_documents d on d.id = r.document_id where r.created_at >= '$since')
) as x
"@
  $after = Get-Snapshot
  $deltas = [ordered]@{}
  foreach ($p in $after.sources.PSObject.Properties) {
    $b = $before.sources.($p.Name); $d = [ordered]@{}
    foreach ($k in $p.Value.PSObject.Properties) {
      if ($k.Value -is [System.Management.Automation.PSCustomObject]) { $d[$k.Name] = @{ before = $b.($k.Name); after = $k.Value } }
      elseif ($null -ne $b.($k.Name)) { $d[$k.Name] = [int64]$k.Value - [int64]$b.($k.Name) }
    }
    $deltas[$p.Name] = $d
  }
  $result = [ordered]@{ slot = $Slot; invocations = $invocations; runs = $runs; other = $other.x; baseline_taken_at = $before.taken_at; snapshot = $after; deltas = $deltas;
    global_before = $before.global; global_after = $after.global }
  $json = $result | ConvertTo-Json -Depth 30
  if ($Out) { $json | Set-Content -Path $Out -Encoding UTF8; Write-Host "wrote $Out" }
  Write-Host ("invocations: {0}  runs: {1}" -f @($invocations).Count, @($runs).Count)
  foreach ($r in @($runs)) {
    $m = $r.metrics; if ($m -is [string]) { $m = $m | ConvertFrom-Json }
    Write-Host ("{0,-30} {1,-8} listed={2} fetched={3} changed={4} unchanged={5} rejected={6} http={7} parse_fail={8} fetch_errors={9} unplaced={10} empty_indexes={11} error={12}" -f `
      $r.source_key, $r.status, $m.documents_listed, $m.documents_fetched, $m.documents_changed, $m.documents_unchanged, $m.documents_rejected, $m.http_errors, $m.parse_failures,
      $(if ($m.fetch_errors) { @($m.fetch_errors).Count } else { 0 }), $(if ($m.index_links_unplaced) { @($m.index_links_unplaced).Count } else { 0 }), $(if ($m.empty_indexes) { @($m.empty_indexes) -join ',' } else { '-' }), $m.error)
  }
}
