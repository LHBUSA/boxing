# Fighter photo coverage and the media priority queue (READ ONLY against Boxing STAGING).
#
#   pwsh scripts/staging/media-coverage.ps1 [-Out reviews/media/<date>-coverage.json]
#
# Coverage is reported two ways, because a raw percentage of 1,700 canonical fighters is not the number that matters:
# overall, and weighted by product visibility (main-event fighters, fighters on recent cards, identity-proven fighters).
# The priority queue ranks who should be photographed next; the score is operational and never displayed publicly.

param([string]$Out = "")
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Import-Module (Join-Path $PSScriptRoot 'BoxingSupabase.psm1') -Force
$cfg = Get-Content (Join-Path $root 'staging/boxing-staging.json') -Raw | ConvertFrom-Json
$ref = $cfg.project_ref
$project = Assert-BoxingStagingProject -Ref $ref
Write-Host "target verified (read-only): $($project.name) ($ref)"
if (-not $Out) { $Out = Join-Path $root "reviews/media/$(Get-Date -Format 'yyyy-MM-dd')-coverage.json" }

$sql = @"
with f as (select * from public.boxing_fighters where merged_into_id is null),
app as (
  select public.boxing_canonical_fighter_id(p.fighter_id) fid, b.id bout_id, b.bout_order, e.event_date
  from public.boxing_bout_participants p join public.boxing_bouts b on b.id = p.bout_id join public.boxing_events e on e.id = b.event_id
  where p.participant_status in ('scheduled','confirmed') and b.status <> 'cancelled'),
agg as (
  select fid, count(distinct bout_id) bouts, max(event_date) last_bout,
         count(*) filter (where bout_order = 1) main_events,
         count(*) filter (where bout_order = 1 and event_date >= current_date - 365) recent_main_events,
         count(*) filter (where event_date >= current_date) upcoming
  from app group by fid),
portrait as (select fighter_id, review_state from public.boxing_fighter_media where kind = 'portrait' and review_state = 'approved'),
wd as (select fighter_id, external_id qid from public.boxing_fighter_identities where namespace = 'wikidata.item' and verification_state = 'verified'),
scored as (
  select f.id, f.display_name name, left(replace(f.public_id, 'pbe_boxer_', ''), 12) ref, f.identity_state,
    coalesce(a.bouts, 0) bouts, coalesce(a.main_events, 0) main_events, coalesce(a.recent_main_events, 0) recent_main_events,
    coalesce(a.upcoming, 0) upcoming, a.last_bout, (p.fighter_id is not null) has_portrait, w.qid,
    coalesce(a.upcoming, 0) * 40 + coalesce(a.recent_main_events, 0) * 12 + coalesce(a.main_events, 0) * 8 + coalesce(a.bouts, 0) * 2
      + case when a.last_bout >= current_date - 365 then 10 else 0 end
      + case when w.qid is not null then 6 else 0 end score
  from f left join agg a on a.fid = f.id left join portrait p on p.fighter_id = f.id left join wd w on w.fighter_id = f.id)
select jsonb_build_object(
  'generated_at', now(),
  'overall', jsonb_build_object(
    'canonical_fighters', (select count(*) from f),
    'approved_portraits', (select count(*) from portrait),
    'approved_pct', round(100.0 * (select count(*) from portrait) / nullif((select count(*) from f), 0), 2),
    'fighters_with_bouts', (select count(*) from agg),
    'identity_proven_wikidata', (select count(*) from wd)),
  'by_visibility', jsonb_build_object(
    'main_event_fighters', (select count(*) from scored where main_events > 0),
    'main_event_with_portrait', (select count(*) from scored where main_events > 0 and has_portrait),
    'recent_main_event_fighters', (select count(*) from scored where recent_main_events > 0),
    'recent_main_event_with_portrait', (select count(*) from scored where recent_main_events > 0 and has_portrait),
    'upcoming_fighters', (select count(*) from scored where upcoming > 0),
    'upcoming_with_portrait', (select count(*) from scored where upcoming > 0 and has_portrait),
    'identity_proven_fighters', (select count(*) from scored where qid is not null),
    'identity_proven_with_portrait', (select count(*) from scored where qid is not null and has_portrait),
    'multi_bout_fighters', (select count(*) from scored where bouts >= 2),
    'multi_bout_with_portrait', (select count(*) from scored where bouts >= 2 and has_portrait)),
  'gaps', jsonb_build_object(
    'identity_proven_no_portrait', (select count(*) from scored where qid is not null and not has_portrait),
    'main_event_no_portrait', (select count(*) from scored where main_events > 0 and not has_portrait),
    'no_identity_no_portrait', (select count(*) from scored where qid is null and not has_portrait)),
  'queue', (select jsonb_agg(jsonb_build_object('name', name, 'ref', ref, 'score', score, 'bouts', bouts, 'main_events', main_events,
      'recent_main_events', recent_main_events, 'upcoming', upcoming, 'last_bout', last_bout, 'wikidata', qid,
      'identity_state', identity_state, 'portrait_state', case when has_portrait then 'approved' else 'none' end) order by score desc, last_bout desc nulls last)
    from (select * from scored where not has_portrait and bouts > 0 order by score desc, last_bout desc nulls last limit 60) q),
  'covered', (select jsonb_agg(jsonb_build_object('name', name, 'ref', ref, 'bouts', bouts, 'main_events', main_events) order by score desc)
    from scored where has_portrait)
) r
"@

$data = (Invoke-BoxingStagingSql -Ref $ref -Sql $sql)[0].r
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
$data | ConvertTo-Json -Depth 10 | Set-Content -Path $Out -Encoding UTF8
$o = $data.overall; $v = $data.by_visibility; $g = $data.gaps
Write-Host ""
Write-Host ("overall:      {0} of {1} canonical fighters have an approved portrait ({2}%)" -f $o.approved_portraits, $o.canonical_fighters, $o.approved_pct)
Write-Host ("visibility:   main-event {0}/{1} · recent main-event {2}/{3} · upcoming {4}/{5} · identity-proven {6}/{7} · multi-bout {8}/{9}" -f `
  $v.main_event_with_portrait, $v.main_event_fighters, $v.recent_main_event_with_portrait, $v.recent_main_event_fighters, `
  $v.upcoming_with_portrait, $v.upcoming_fighters, $v.identity_proven_with_portrait, $v.identity_proven_fighters, `
  $v.multi_bout_with_portrait, $v.multi_bout_fighters)
Write-Host ("gaps:         identity-proven without a photo {0} · main-event without a photo {1} · no identity and no photo {2}" -f `
  $g.identity_proven_no_portrait, $g.main_event_no_portrait, $g.no_identity_no_portrait)
Write-Host ("queue:        {0} ranked targets; top: {1}" -f $data.queue.Count, (($data.queue | Select-Object -First 5 | ForEach-Object { $_.name }) -join ', '))
Write-Host "wrote $Out"
