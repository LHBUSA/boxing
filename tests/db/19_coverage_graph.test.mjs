// Coverage graph guards (migration 0025): nothing renders without a recorded rights basis, Hall inductions only
// belong to Hall of Fame institutions and keep the institution's own category label, sourced facts are append-only.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';

let db;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
let src;

before(async () => {
  db = await freshDatabase('coverage_graph');
  src = (await one("select id from public.boxing_sources where source_key = 'wikidata'")).id;
});
after(async () => { await db?.close(); });

test('promoter logos: editorial-identification only, approval needs a stored asset, a rights basis and evidence', async () => {
  const org = await one("insert into public.boxing_organizations (slug, name, organization_kind) values ('synthetic-promotions', 'Synthetic Promotions', 'promoter') returning id");
  const base = [org.id, 'https://example.org/press', 'https://example.org/logo.png'];
  await expectPgError(() => q("insert into public.boxing_organization_media (organization_id, asset_type, source_page_url, source_asset_url, rights_basis, review_state) values ($1, 'primary_logo', $2, $3, 'unresolved', 'approved_editorial')", base), { code: '23514' });
  await expectPgError(() => q("insert into public.boxing_organization_media (organization_id, asset_type, source_page_url, source_asset_url, rights_basis, rights_evidence, review_state, review_rule) values ($1, 'primary_logo', $2, $3, 'press_kit_terms', 'Press kit page grants editorial use of logos.', 'approved_editorial', 'rule@1')", base), { code: '23514' }, 'no stored asset');
  await expectPgError(() => q("insert into public.boxing_organization_media (organization_id, asset_type, source_page_url, source_asset_url, rights_basis, intended_usage) values ($1, 'primary_logo', $2, $3, 'unresolved', 'affiliation')", base), { code: '23514' });
  await expectPgError(() => q("insert into public.boxing_organization_media (organization_id, asset_type, source_page_url, source_asset_url, rights_basis, rights_evidence, asset_url, review_state, reviewer) values ($1, 'primary_logo', $2, $3, 'permission', 'Written permission from the promotion for editorial use.', '/media/orgs/x.png', 'permission_granted', 'Owner')", base), { code: '23514' }, 'permission needs a reference');
  const ok = await one("insert into public.boxing_organization_media (organization_id, asset_type, source_page_url, source_asset_url, rights_basis, rights_evidence, asset_url, review_state, review_rule) values ($1, 'primary_logo', $2, $3, 'press_kit_terms', 'Press kit page grants editorial use of logos.', '/media/orgs/x.png', 'approved_editorial', 'rule@1') returning intended_usage, trademark_note", base);
  assert.equal(ok.intended_usage, 'editorial_identification_not_affiliation');
  assert.match(ok.trademark_note, /No affiliation/);
  await expectPgError(() => q("insert into public.boxing_organization_media (organization_id, asset_type, source_page_url, source_asset_url, rights_basis, rights_evidence, asset_url, review_state, review_rule) values ($1, 'primary_logo', $2, $3, 'press_kit_terms', 'Press kit page grants editorial use of logos.', '/media/orgs/y.png', 'approved_editorial', 'rule@1')", base), { code: '23505' }, 'one approved primary logo');
  await q("insert into public.boxing_organization_facts (organization_id, attribute, value_text, source_id, source_url) values ($1, 'official_site', 'https://example.org', $2, 'https://www.wikidata.org/wiki/Q1')", [org.id, src]);
  await expectPgError(() => q("update public.boxing_organization_facts set value_text = 'x'"), { match: /append/i });
  await expectPgError(() => q("insert into public.boxing_organization_facts (organization_id, attribute, source_id, source_url) values ($1, 'founded_on', $2, 'https://www.wikidata.org/wiki/Q1')", [org.id, src]), { code: '23514' }, 'a fact needs a value');
});

test('Hall of Fame: inductions only for hall_of_fame institutions, source-native category kept, append-only', async () => {
  const hall = await one("insert into public.boxing_organizations (slug, name, organization_kind) values ('synthetic-hall', 'Synthetic Boxing Hall of Fame', 'hall_of_fame') returning id");
  const promoter = await one("select id from public.boxing_organizations where slug = 'synthetic-promotions'");
  const person = await one("insert into public.boxing_persons (display_name, normalized_name, identity_state) values ('Jane Synthetic', 'jane synthetic', 'source_native') returning id");
  const row = [hall.id, person.id, src];
  await expectPgError(() => q("insert into public.boxing_hall_inductions (institution_id, person_id, induction_year, category_source_label, source_id, source_url, evidence) values ($1, $2, 2020, 'Modern', $3, 'https://example.org/inductees', 'Institution inductee list, class of 2020.')", [promoter.id, person.id, src]), { code: 'BX070' });
  await expectPgError(() => q("insert into public.boxing_hall_inductions (institution_id, person_id, induction_year, source_id, source_url, evidence) values ($1, $2, 2020, $3, 'https://example.org/inductees', 'Institution inductee list, class of 2020.')", row), { code: '23502' }, 'category label required');
  await q("insert into public.boxing_hall_inductions (institution_id, person_id, induction_year, category_source_label, category_key, source_id, source_url, evidence) values ($1, $2, 2020, 'Women''s Modern', 'womens', $3, 'https://example.org/inductees', 'Institution inductee list, class of 2020.')", row);
  const r = await one('select category_source_label from public.boxing_hall_inductions where person_id = $1', [person.id]);
  assert.equal(r.category_source_label, "Women's Modern");
  await expectPgError(() => q("update public.boxing_hall_inductions set induction_year = 2021"), { match: /append/i });
  await expectPgError(() => q("insert into public.boxing_hall_inductions (institution_id, person_id, induction_year, category_source_label, source_id, source_url, evidence) values ($1, $2, 2020, 'Women''s Modern', $3, 'https://example.org/inductees', 'Institution inductee list, class of 2020.')", row), { code: '23505' });
});

test('historical assets and person portraits: age is not a rights basis; approval needs evidence', async () => {
  const person = await one("select id from public.boxing_persons where normalized_name = 'jane synthetic'");
  const insertAsset = (extra) => q(`insert into public.boxing_historical_assets (asset_type, subject_person_id, archive_name, archive_item_url, rights_statement, rights_basis, asset_url, review_state, review_rule, identity_evidence)
    values ('historic_photo', $1, 'Synthetic Archive', 'https://example.org/item/1', $2, $3, $4, $5, $6, $7)`, [person.id, ...extra]);
  await expectPgError(() => insertAsset(['Photograph from 1910', 'unresolved', '/media/history/1.jpg', 'approved', 'rule@1', 'Archive caption names the subject in full.']), { code: '23514' });
  await expectPgError(() => insertAsset(['No known restrictions on publication.', 'no_known_restrictions_statement', null, 'approved', 'rule@1', 'Archive caption names the subject in full.']), { code: '23514' });
  await insertAsset(['No known restrictions on publication.', 'no_known_restrictions_statement', '/media/history/1.jpg', 'approved', 'rule@1', 'Archive caption names the subject in full.']);
  await expectPgError(() => q(`insert into public.boxing_historical_assets (asset_type, archive_name, archive_item_url, rights_statement, rights_basis) values ('event_poster', 'A', 'https://example.org/p', 'unknown', 'unresolved')`), { code: '23514' }, 'an asset needs a subject');
  await expectPgError(() => q(`insert into public.boxing_person_media (person_id, asset_url, source_kind, source_url, license, author, credit, identity_evidence, image_identity_evidence, review_state)
    values ($1, '/media/people/1.jpg', 'wikimedia_commons', 'https://commons.wikimedia.org/wiki/File:X.jpg', 'CC BY 4.0', 'A', 'A', 'short', 'p18', 'approved')`, [person.id]), { code: '23514' });
});

test('event distribution and venue aliases are append-only observations; source health view reads', async () => {
  const ev = await one("insert into public.boxing_events (source_id, name, event_date, status) values ($1, 'Synthetic Card', '2026-10-10', 'scheduled') returning id", [src]);
  await q("insert into public.boxing_event_distribution (event_id, platform_name_source_native, geography, mode, source_id, source_url, observed_at) values ($1, 'Synthetic TV', 'US', 'live', $2, 'https://example.org/watch', now())", [ev.id, src]);
  await expectPgError(() => q("delete from public.boxing_event_distribution"), { match: /append/i });
  const health = await q('select source_key, failures_last_5_runs from public.boxing_source_health');
  assert.ok(health.some((h) => h.source_key === 'nsac_nevada'));
});
