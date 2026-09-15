# Global Boxing History V1 — export the first vertical slice's stored FACTS from Boxing STAGING (read-only).
#
#   pwsh scripts/staging/history-slice-export.ps1
#
# Writes tests/fixtures/history/:
#   nsac-2026-03-28.json            the NSAC results sheet for 2026-03-28 (MGM Grand Garden Arena) as the stored parse:
#                                   events + bouts only. The positional PDF text layer ("document") is NOT exported.
#   wikidata-identities.json        verified wikidata.item identities already bound to fighters on that card (QID, label,
#                                   matching rule, opponent, bout date). The Wikipedia row excerpt is NOT exported.
#   super-welterweight-bodies.json  every stored WBA/IBF/WBO/WBC document statement for the male super welterweight
#                                   division, as boxing_import_title_status_snapshot payloads (belts/holders as printed).
# Nothing is written to staging: every statement is a SELECT.

$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified (read-only): $($project.name) ($ref)"
$out = Join-Path $root 'tests/fixtures/history'
New-Item -ItemType Directory -Force $out | Out-Null
$sheetUrl = 'https://boxing.nv.gov/uploadedFiles/boxingnvgov/content/results/2026_Results/03-28-26_Boxing_REDACTED.pdf'

function Save($name, $sql) {
  $r = Invoke-BoxingStagingSql -Ref $ref -Sql $sql
  $json = $r[0].r | ConvertTo-Json -Depth 30 -Compress
  Set-Content -Path (Join-Path $out $name) -Value $json -Encoding UTF8
  Write-Host "wrote tests/fixtures/history/$name ($((Get-Item (Join-Path $out $name)).Length) bytes)"
}

Save 'nsac-2026-03-28.json' @"
select jsonb_build_object('doc_key', d.doc_key, 'url', d.url, 'parser_version', r.parser_version, 'sha256', o.payload ->> 'sha256',
  'exported_from', 'boxing_source_observations (staging)', 'events', o.payload -> 'events', 'bouts', o.payload -> 'bouts') r
from public.boxing_source_documents d
join public.boxing_source_document_revisions r on r.document_id = d.id and r.revision = d.current_revision
join public.boxing_source_observations o on o.id = r.observation_id
where d.url = '$sheetUrl'
"@

Save 'wikidata-identities.json' @"
select coalesce(jsonb_agg(jsonb_build_object('commission_name', f.display_name, 'qid', i.external_id, 'label', i.source_display_name,
  'wiki_title', i.evidence ->> 'title', 'rule', i.evidence ->> 'rule', 'opponent', i.evidence ->> 'opponent', 'bout_date', i.evidence ->> 'bout_date',
  'confidence', i.confidence) order by f.display_name), '[]'::jsonb) r
from public.boxing_fighter_identities i
join public.boxing_fighters f on f.id = i.fighter_id
where i.namespace = 'wikidata.item' and i.verification_state = 'verified'
  and f.id in (select p.fighter_id from public.boxing_bout_participants p join public.boxing_bouts b on b.id = p.bout_id
               where b.source_url = '$sheetUrl')
"@

Save 'super-welterweight-bodies.json' @"
select coalesce(jsonb_agg(x.p order by x.at, x.kind, x.captured), '[]'::jsonb) r from (
  select coalesce(s.as_of, s.published_on) at, s.document_kind kind, s.captured_at captured, jsonb_strip_nulls(jsonb_build_object(
    'source_key', src.source_key, 'organization_slug', o.slug, 'gender_scope', s.gender_scope, 'document_kind', s.document_kind,
    'division_native_label', d.native_label, 'source_url', s.source_url, 'published_on', s.published_on, 'as_of', s.as_of, 'as_of_label', s.as_of_label,
    'retrieved_at', s.retrieved_at, 'content_hash', s.content_hash, 'document_sha256', s.document_sha256, 'parser_version', s.parser_version,
    'normalized', jsonb_build_object('fixture', 'facts exported from staging'),
    'entries', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('designation_native', e.designation_native, 'holder_status', e.holder_status,
        'honorific_as_printed', e.honorific, 'holder_source_name', e.holder_source_name, 'holder_country', e.holder_country, 'holder_org_boxer_id', e.holder_org_boxer_id,
        'reign_start_on', e.reign_start_on, 'reign_start_basis', e.reign_start_basis, 'last_defense_on', e.last_defense_on,
        'previous_holder_as_printed', e.previous_holder_as_printed)) order by e.seq), '[]'::jsonb)
      from public.boxing_title_status_entries e where e.snapshot_id = s.id),
    'claims', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('about', ao.slug, 'source_name', c.claimed_holder_source_name, 'vacant', c.claimed_vacant,
        'blank', c.claimed_blank, 'native_text', c.native_text, 'where', c.location_in_document))), '[]'::jsonb)
      from public.boxing_title_claims c left join public.boxing_organizations ao on ao.id = c.about_organization_id where c.snapshot_id = s.id))) p
  from public.boxing_title_status_snapshots s
  join public.boxing_organizations o on o.id = s.organization_id
  join public.boxing_sources src on src.id = s.source_id
  join public.boxing_org_divisions d on d.id = s.org_division_id
  join public.boxing_weight_classes w on w.id = s.weight_class_id
  where w.class_key = 'super_welterweight' and s.gender_scope = 'male'
) x
"@
