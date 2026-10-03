// SQL for International Boxing Hall of Fame inductions (Wikidata, CC0; source 'wikidata', approved_ingest).
// Shared by ibhof-wikidata.mjs (fresh read) and ibhof-load.mjs (the committed, reviewed dataset). Idempotent: the
// institution, a person per Wikidata QID and one induction per (institution, person) row; on conflict do nothing.

export const HALL_QID = 'Q572227';

const lit = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const norm = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function buildIbhofSql(inductions) {
  const sql = [`begin;
insert into public.boxing_organizations (slug, name, short_name, organization_kind, country_code, website_url, source_url)
select 'international-boxing-hall-of-fame', 'International Boxing Hall of Fame', 'IBHOF', 'hall_of_fame', 'US', 'http://www.ibhof.com/', 'https://www.wikidata.org/wiki/${HALL_QID}'
where not exists (select 1 from public.boxing_organizations where slug = 'international-boxing-hall-of-fame');
insert into public.boxing_organization_facts (organization_id, attribute, value_text, source_id, source_url)
select o.id, 'wikidata_qid', '${HALL_QID}', s.id, 'https://www.wikidata.org/wiki/${HALL_QID}'
from public.boxing_organizations o, public.boxing_sources s where o.slug = 'international-boxing-hall-of-fame' and s.source_key = 'wikidata'
  and not exists (select 1 from public.boxing_organization_facts f where f.organization_id = o.id and f.attribute = 'wikidata_qid');`];
  for (const r of inductions) {
    const evidence = `Wikidata ${r.qid} award received (P166) International Boxing Hall of Fame (${HALL_QID}) point in time ${r.induction_year}; IBHOF id ${r.ibhof_id}.`;
    sql.push(`-- ${r.label}
with existing as (select pi.person_id as id from public.boxing_person_identities pi where pi.namespace = 'wikidata.item' and pi.external_id = ${lit(r.qid)} and pi.verification_state <> 'rejected' limit 1),
new_person as (
  insert into public.boxing_persons (display_name, normalized_name, fighter_id, identity_state)
  select ${lit(r.label)}, ${lit(norm(r.label))},
    (select public.boxing_canonical_fighter_id(fi.fighter_id) from public.boxing_fighter_identities fi where fi.namespace = 'wikidata.item' and fi.external_id = ${lit(r.qid)} and fi.verification_state <> 'rejected' limit 1), 'verified'
  where not exists (select 1 from existing) returning id),
new_identity as (
  insert into public.boxing_person_identities (person_id, source_id, namespace, external_id, external_url, verification_state, evidence)
  select np.id, s.id, 'wikidata.item', ${lit(r.qid)}, ${lit(r.source_url)}, 'verified', ${lit(`Wikidata item ${r.qid} (${r.label}) with IBHOF id ${r.ibhof_id}.`)}
  from new_person np, public.boxing_sources s where s.source_key = 'wikidata' returning person_id),
pid as (select id from existing union all select id from new_person)
insert into public.boxing_hall_inductions (institution_id, person_id, induction_year, category_source_label, category_key, source_id, source_url, evidence)
select o.id, (select id from pid limit 1), ${r.induction_year}, ${lit(r.category_source_label)}, ${lit(r.category_key)}, s.id, ${lit(r.source_url)}, ${lit(evidence)}
from public.boxing_organizations o, public.boxing_sources s
where o.slug = 'international-boxing-hall-of-fame' and s.source_key = 'wikidata'
on conflict do nothing;`);
    // a person first stored before a label existed in the requested languages keeps its QID as a name: repair it
    if (!/^Q\d+$/.test(r.label)) {
      sql.push(`update public.boxing_persons p set display_name = ${lit(r.label)}, normalized_name = ${lit(norm(r.label))}
from public.boxing_person_identities i where i.person_id = p.id and i.namespace = 'wikidata.item' and i.external_id = ${lit(r.qid)} and p.display_name ~ '^Q[0-9]+$';`);
    }
  }
  sql.push('commit;');
  return sql;
}
