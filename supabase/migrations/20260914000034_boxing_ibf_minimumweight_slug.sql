-- IBF minimumweight slug correction (2026-09-14).
-- 0033 seeded the IBF minimumweight division as 'minimumweight'. The IBF ratings page's own weight selector uses
-- 'mini-flyweight' (it also lists 'jr-mini-flyweight', which maps to no canonical male division and is NOT seeded:
-- it stays unrequested until reviewed). The live endpoint answered an empty array for 'minimumweight', and the
-- collector failed closed. The 0033 row is left in place (no snapshot references it); this adds the real label.

begin;

insert into public.boxing_org_divisions (organization_id, gender_scope, native_label, weight_class_id)
select o.id, 'male', 'mini-flyweight', wc.id
from public.boxing_organizations o join public.boxing_weight_classes wc on wc.class_key = 'minimumweight'
where o.slug = 'ibf'
on conflict (organization_id, gender_scope, native_label) do nothing;

select public.boxing_lockdown();

commit;
