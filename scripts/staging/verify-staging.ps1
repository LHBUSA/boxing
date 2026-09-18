# Verifies the Boxing STAGING database after migration.
#
#   pwsh scripts/staging/verify-staging.ps1
#
# Layer 1 (SQL, scripts/staging/verify.sql): schema shape, RLS, grants,
#   append-only guards, source gates, history behaviour. All writes are rolled
#   back inside the checks.
# Layer 2 (HTTP): the real attack surface. Uses the project's anon key against
#   PostgREST to try to read, insert and call RPCs, then confirms the
#   service-role key still works. Keys are fetched at run time and never
#   printed or stored.
#
# The expected table list is derived from a LOCAL replay of exactly the
# migration versions recorded in STAGING's own ledger
# (supabase_migrations.schema_migrations), so the verifier answers "does
# staging match the chain it has applied?", not "does staging already match
# every migration committed to the repo?". A migration that is committed but
# deliberately not yet applied is a pending rollout, reported separately, and
# never counted as drift. Migration-ledger drift itself fails the run before a
# single check is evaluated.

$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target: $($project.name) ($ref)"

# ---- migration ledger: what this database has actually applied
$ledgerRows = @(Invoke-BoxingStagingSql -Ref $ref -Sql 'select version, name from supabase_migrations.schema_migrations order by version')
$applied = @($ledgerRows | ForEach-Object { $_.version })
if (-not $applied.Count) { throw 'migration ledger drift: staging records no applied migration, so there is nothing to verify against' }
$repoFiles = @(Get-ChildItem (Join-Path $root 'supabase/migrations') -Filter '*.sql' |
  Where-Object { $_.Name -match '^\d{14}_[a-z0-9_]+\.sql$' } | Sort-Object Name)
$repoVersions = @($repoFiles | ForEach-Object { $_.Name.Substring(0, 14) })
$pending = @($repoVersions | Where-Object { $applied -notcontains $_ })
# a version recorded under a different name than the repo file is a swapped or renamed migration
foreach ($row in $ledgerRows) {
  $file = $repoFiles | Where-Object { $_.Name.Substring(0, 14) -eq $row.version } | Select-Object -First 1
  if ($file -and $row.name -and $file.BaseName.Substring(15) -ne $row.name) {
    throw "migration ledger drift: version $($row.version) is recorded as '$($row.name)' but the repo has '$($file.BaseName.Substring(15))'"
  }
}

# ---- expected schema: replay EXACTLY that applied set on a disposable local database
$expectedJson = & node (Join-Path $PSScriptRoot 'expected-tables.mjs') "--versions=$($applied -join ',')"
if ($LASTEXITCODE -ne 0) { throw "expected-schema replay failed (exit $LASTEXITCODE): see the message above" }
$expected = $expectedJson | ConvertFrom-Json
$tables = @($expected.tables)
if ($tables.Count -lt 40) { throw 'could not derive expected table list from the local replay' }
Write-Host ("repo_head: {0}  staging_applied_through: {1}  pending: [{2}]" -f $expected.head, ($applied | Select-Object -Last 1), ($pending -join ', '))
Write-Host ("expected schema replayed from {0} applied migration(s): {1} boxing_* tables" -f $applied.Count, $tables.Count)
$arrayLiteral = "array[" + (($tables | ForEach-Object { "'$_'" }) -join ',') + "]::text[]"
$sql = (Get-Content (Join-Path $PSScriptRoot 'verify.sql') -Raw -Encoding UTF8).Replace(':expected_tables', $arrayLiteral)
$sqlResults = (Invoke-BoxingStagingSql -Ref $ref -Sql $sql).results
if ($sqlResults -is [string]) { $sqlResults = $sqlResults | ConvertFrom-Json }

# ---- HTTP layer
$keys = Invoke-SbApi -Path "/projects/$ref/api-keys?reveal=true"
$anon = ($keys | Where-Object { $_.name -eq 'anon' }).api_key
$service = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
if (-not $anon -or -not $service) { throw 'anon/service_role keys not available' }
$rest = "https://$ref.supabase.co/rest/v1"
function Try-Rest([string]$method, [string]$path, [string]$key, $body = $null) {
  $h = @{ apikey = $key; Authorization = "Bearer $key"; 'Content-Type' = 'application/json'; Prefer = 'return=minimal' }
  try {
    $p = @{ Method = $method; Uri = "$rest$path"; Headers = $h }
    if ($null -ne $body) { $p.Body = ($body | ConvertTo-Json -Compress) }
    $r = Invoke-WebRequest @p -SkipHttpErrorCheck
    return [pscustomobject]@{ status = [int]$r.StatusCode; body = [string]$r.Content }
  } catch { return [pscustomobject]@{ status = -1; body = $_.Exception.Message } }
}
$http = @()
# Denied means PostgreSQL said so (42501). A bad key or an outage must never
# count as "access denied".
$denied = { param($r) $r.status -in 401, 403 -and $r.body -match '"code":"42501"' }
$r = Try-Rest GET '/boxing_fighters?select=id&limit=1' $anon
$http += [pscustomobject]@{ check = 'http_anon_cannot_read_fighters'; ok = (& $denied $r); detail = "HTTP $($r.status)" }
$r = Try-Rest POST '/boxing_fighters' $anon @{ display_name = 'anon http probe' }
$http += [pscustomobject]@{ check = 'http_anon_cannot_insert_fighters'; ok = (& $denied $r); detail = "HTTP $($r.status)" }
$r = Try-Rest PATCH '/boxing_sources?source_key=eq.boxrec' $anon @{ enabled = $true }
$http += [pscustomobject]@{ check = 'http_anon_cannot_update_sources'; ok = (& $denied $r); detail = "HTTP $($r.status)" }
$r = Try-Rest DELETE '/boxing_market_ticks?id=gt.0' $anon
$http += [pscustomobject]@{ check = 'http_anon_cannot_delete_ticks'; ok = (& $denied $r); detail = "HTTP $($r.status)" }
$r = Try-Rest POST '/rpc/boxing_get_fighter' $anon @{ p_ref = 'x' }
$http += [pscustomobject]@{ check = 'http_anon_cannot_call_rpc'; ok = (& $denied $r); detail = "HTTP $($r.status)" }
$r = Try-Rest GET '/boxing_fighter_metric_snapshots?select=id&limit=1' $anon
$http += [pscustomobject]@{ check = 'http_anon_cannot_read_fight_dna'; ok = (& $denied $r); detail = "HTTP $($r.status)" }
$r = Try-Rest POST '/rpc/boxing_gateway_models' $anon @{}
$http += [pscustomobject]@{ check = 'http_anon_cannot_call_gateway_rpc'; ok = (& $denied $r); detail = "HTTP $($r.status)" }
$r = Try-Rest POST '/rpc/boxing_gateway_models' $service @{}
$http += [pscustomobject]@{ check = 'http_service_role_gateway_rpc_works'; ok = ($r.status -eq 200 -and $r.body -match 'pbe_bout_winner' -and $r.body -match 'untrained'); detail = "HTTP $($r.status)" }
$r = Try-Rest POST '/rpc/boxing_identity_coverage' $service @{}
$http += [pscustomobject]@{ check = 'http_service_role_rpc_works'; ok = ($r.status -eq 200); detail = "HTTP $($r.status)" }
$r = Try-Rest GET '/boxing_sources?select=source_key&source_key=eq.the_odds_api' $service
$http += [pscustomobject]@{ check = 'http_service_role_read_works'; ok = ($r.status -eq 200 -and $r.body -match 'the_odds_api'); detail = "HTTP $($r.status)" }
Remove-Variable anon, service, keys

$all = @($sqlResults | ForEach-Object { [pscustomobject]@{ check = $_.check; ok = [bool]$_.ok; detail = ($_.detail | ConvertTo-Json -Compress -Depth 5) } }) + $http
$all | Format-Table -AutoSize -Wrap | Out-String -Width 220 | Write-Host
$failed = @($all | Where-Object { -not $_.ok })
Write-Host "checks: $($all.Count)  passed: $($all.Count - $failed.Count)  failed: $($failed.Count)"
if ($failed.Count) { exit 1 }
