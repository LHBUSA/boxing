# Applies supabase/migrations to the Boxing STAGING project only.
#
#   pwsh scripts/staging/apply-migrations.ps1 -Mode proof   # pending migrations in BEGIN ... ROLLBACK
#   pwsh scripts/staging/apply-migrations.ps1 -Mode proof -FullChain   # whole chain (only valid while no
#        later data depends on a later constraint; early migrations re-create older checks)
#   pwsh scripts/staging/apply-migrations.ps1 -Mode apply   # each pending migration in its own transaction
#
# The target ref comes from staging/boxing-staging.json and is re-verified by
# name before every request (BoxingSupabase.psm1). Applied versions are
# recorded in supabase_migrations.schema_migrations so the Supabase CLI agrees.

param([ValidateSet('proof', 'apply')][string]$Mode = 'proof', [switch]$FullChain)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target: $($project.name) ($ref, $($project.region))"

$files = Get-ChildItem (Join-Path $root 'supabase/migrations') -Filter '*.sql' | Where-Object { $_.Name -match '^\d{14}_[a-z0-9_]+\.sql$' } | Sort-Object Name
$strip = { param($sql) ($sql -split "`n" | Where-Object { $_ -notmatch '^\s*(begin|commit)\s*;\s*$' }) -join "`n" }

$null = Invoke-BoxingStagingSql -Ref $ref -Sql @"
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
"@
$applied = @((Invoke-BoxingStagingSql -Ref $ref -Sql 'select version from supabase_migrations.schema_migrations') | ForEach-Object { $_.version })

if ($Mode -eq 'proof') {
  $proofFiles = if ($FullChain) { $files } else { @($files | Where-Object { $applied -notcontains $_.Name.Substring(0, 14) }) }
  if (-not $proofFiles.Count) { Write-Host 'PROOF OK: nothing pending'; exit 0 }
  $body = ($proofFiles | ForEach-Object { & $strip (Get-Content $_.FullName -Raw -Encoding UTF8) }) -join "`n`n"
  $null = Invoke-BoxingStagingSql -Ref $ref -Sql "begin;`n$body`nrollback;"
  Write-Host "PROOF OK: $($proofFiles.Count) migration(s) [$(($proofFiles | ForEach-Object Name) -join ', ')] applied and rolled back in one transaction"
  exit 0
}

foreach ($f in $files) {
  $version = $f.Name.Substring(0, 14)
  $name = $f.BaseName.Substring(15)
  if ($applied -contains $version) { Write-Host "skip $($f.Name) (already applied)"; continue }
  $sql = & $strip (Get-Content $f.FullName -Raw -Encoding UTF8)
  $record = "insert into supabase_migrations.schema_migrations (version, name, statements) values ('$version', '$name', array[]::text[]);"
  $null = Invoke-BoxingStagingSql -Ref $ref -Sql "begin;`n$sql`n$record`ncommit;"
  Write-Host "applied $($f.Name)"
}
