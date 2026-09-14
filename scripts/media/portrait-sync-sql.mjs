#!/usr/bin/env node
// Emits idempotent SQL that records every APPROVED registry portrait (scripts/media/portraits.json) in
// public.boxing_fighter_media on Boxing STAGING. Existing approved rows are left as they are; a fighter that
// already has an approved portrait is skipped (one approved portrait per fighter). Nothing is deleted.
//
//   node scripts/media/portrait-sync-sql.mjs > sync.sql      (apply through the Management API wrapper)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const registry = JSON.parse(readFileSync(fileURLToPath(new URL('./portraits.json', import.meta.url)), 'utf8'));
const lit = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const rows = registry.approved.map((p) => `(${lit(p.public_id)}, ${lit(p.asset_url)}, ${p.width ?? 'null'}, ${p.height ?? 'null'}, ${lit(p.focus)}, ${lit(p.source_url)}, ${lit(p.license)}, ${lit(p.license_url)}, ${lit(p.author)}, ${lit(p.credit)}, ${lit(p.image_identity_evidence)}, ${lit(p.identity_evidence)}, ${lit(p.rule ?? 'commons_free_license_identity_evidence@1')}, ${lit(p.wikidata_qid ? `wikidata ${p.wikidata_qid}` : null)})`);
process.stdout.write(`with v(public_id, asset_url, width, height, focus, source_url, license, license_url, author, credit, identity_method, identity_evidence, review_rule, review_note) as (values
${rows.join(',\n')}
), ins as (
  insert into public.boxing_fighter_media (fighter_id, kind, asset_url, width, height, focus, source_kind, source_url, license, license_url, author, credit, identity_method, identity_evidence, usage, review_state, review_rule, review_note)
  select f.id, 'portrait', v.asset_url, v.width, v.height, v.focus, 'wikimedia_commons', v.source_url, v.license, v.license_url, v.author, v.credit, v.identity_method, v.identity_evidence, 'editorial_identification', 'approved', v.review_rule, v.review_note
  from v join public.boxing_fighters f on f.public_id = v.public_id
  where not exists (select 1 from public.boxing_fighter_media m where m.fighter_id = public.boxing_canonical_fighter_id(f.id) and m.kind = 'portrait' and m.review_state = 'approved')
  returning fighter_id)
select jsonb_build_object('inserted', (select count(*) from ins), 'registry_approved', (select count(*) from v),
  'unknown_public_ids', (select coalesce(jsonb_agg(v.public_id), '[]'::jsonb) from v where not exists (select 1 from public.boxing_fighters f where f.public_id = v.public_id))) as result;
`);
