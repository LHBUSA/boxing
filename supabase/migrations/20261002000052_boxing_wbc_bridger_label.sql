-- Owner decision 2026-10-02: WBC champions-grid label "Bridger" -> canonical bridgerweight.
--
-- Since the 2026-10 redesign of https://wbcboxing.com/ratings/ the WBC's men's champions card prints the division as
-- "Bridger" (before it was "bridger", seeded in 0040). The WBC's own ratings call the division Bridgerweight,
-- 224 lb / 101.605 kg. This maps exactly that one native label (male, WBC). No case folding, no other alias; any other
-- new label still goes to pending_review.
--
-- On a database where the collector already met the label (staging, 2026-10-02 run 149310b8) the pending row is
-- resolved in place; on a fresh database (production) it is inserted.

begin;

update public.boxing_org_divisions d set weight_class_id = wc.id, review_state = 'seeded'
from public.boxing_organizations o, public.boxing_weight_classes wc
where d.organization_id = o.id and o.slug = 'wbc' and d.gender_scope = 'male' and d.native_label = 'Bridger'
  and wc.class_key = 'bridgerweight' and d.weight_class_id is null;

insert into public.boxing_org_divisions (organization_id, gender_scope, native_label, weight_class_id)
select o.id, 'male', 'Bridger', wc.id
from public.boxing_organizations o join public.boxing_weight_classes wc on wc.class_key = 'bridgerweight'
where o.slug = 'wbc'
on conflict (organization_id, gender_scope, native_label) do nothing;

select public.boxing_lockdown();

commit;
