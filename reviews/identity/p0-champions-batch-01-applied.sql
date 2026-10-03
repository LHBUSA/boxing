-- P0 champion identity batch 01: owner decisions 2026-10-03 (Justin Erickson). Identity links only.
-- Approved MATCH: WBC Ryan Garcia, WBC Dalton Smith (identity only), WBA Gary Antuanne Russell (id 10627),
-- WBA Jaron Ennis (id 10548), WBO Jaron Ennis (same canonical fighter), WBA Murat Gassiev (id 4439).
-- HOLD (no row written): IBF Angelo Leo, WBC Carlos Adames. The ambiguous WBO "ryan garcia" / "murat gassiev" name
-- clusters are not touched: an accepted link in one body never validates another body's entry.
begin;
insert into public.boxing_org_identity_candidate_decisions (candidate_id, decision, fighter_id, member_review_ids, reviewer, review_note, evidence)
select c.id, 'matched', f.id, '{}'::uuid[], 'Justin Erickson', v.note,
  jsonb_build_object('batch', 'p0-champions-01', 'approved', '2026-10-03', 'basis', v.basis)
from (values
  ('wbc', 'name:ryan garcia', 'Ryan Garcia', 'tier A title-at-stake',
   'Owner approved 2026-10-03: won the 2026-02-21 Nevada bout for the WBC world welterweight title at 146.5 lb; WBC prints him as welterweight champion.'),
  ('wbc', 'name:dalton smith', 'Dalton Smith', 'identity only (announced card)',
   'Owner approved 2026-10-03 as an IDENTITY link only: the 2026-10-24 booking for the WBC super lightweight title is not evidence that any bout happened or any title was won.'),
  ('wba', 'id:10627', 'Gary Antuanne Russell', 'tier B',
   'Owner approved 2026-10-03: WBA boxer id 10627; distinctive three-part name; 12-round Nevada win 2026-02-21 at the 140 lb super lightweight limit.'),
  ('wba', 'id:10548', 'Jaron Ennis', 'tier B',
   'Owner approved 2026-10-03: WBA boxer id 10548; distinctive name; 12-round Pennsylvania win 2024-07-13 at 146.4 lb before moving up.'),
  ('wbo', 'name:jaron ennis', 'Jaron Ennis', 'tier B, same canonical fighter as WBA id 10548',
   'Owner approved 2026-10-03: the same canonical Jaron Ennis as the WBA id 10548 link; WBO prints him as super welterweight champion.'),
  ('wba', 'id:4439', 'Murat Gassiev', 'tier B',
   'Owner approved 2026-10-03: WBA boxer id 4439; distinctive name; Russia; 10-round Florida win 2025-08-23 at 233 lb (heavyweight).')
) as v(body, cluster_key, fighter_name, basis, note)
join public.boxing_organizations o on o.slug = v.body
join public.boxing_org_identity_candidates c on c.organization_id = o.id and c.cluster_key = v.cluster_key
join public.boxing_fighters f on lower(f.display_name) = lower(v.fighter_name) and f.merged_into_id is null;
commit;
