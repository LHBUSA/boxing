// P0 identity seed (owner decision 2026-10-03): Wikidata establishes a canonical human, never a record. AUTO_SEEDED
// creates the fighter only through the evidence-gated identity path; REVIEW_REQUIRED and NO_CANDIDATE create nothing.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';

let db;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const seed = async (p) => (await q('select public.boxing_apply_identity_seed($1) r', [p]))[0].r;
const claims = [{ body: 'wbo', cluster_key: 'name:test champion', printed: 'TEST CHAMPION', country: 'IRL', division: 'middleweight', tier: 'world' },
  { body: 'ibf', cluster_key: 'name:test champion', printed: 'Test Champion', country: 'IRL', division: 'middleweight', tier: 'world' }];
const auto = (over = {}) => ({
  rule_version: 'p0-identity-seed@1.0.0', batch: 'test', subject_key: 'testchampion', decision: 'AUTO_SEEDED', reasons: [],
  wikidata_qid: 'Q999000111', canonical_name: 'Test Champion', dob: '1996-04-02', dob_precision: 'day',
  aliases: [{ name: 'Test Champion', source: 'wikidata' }, { name: 'TEST CHAMPION', source: 'sanctioning_body' }],
  nationality_evidence: { printed: ['IRL'], wikidata_citizenship_iso3: ['IRL'], wikidata_citizenship_iso2: ['IE'] },
  division_evidence: { printed: ['middleweight'] }, source_claims: claims,
  identity_sources: [{ source: 'wikidata', qid: 'Q999000111', license: 'CC0' }], creation_basis: 'wikidata_identity_corroborated_by_sanctioning_body',
  evidence: { checks: { name: { result: 'agrees' }, country: { result: 'agrees' } }, entity_revision: 1 },
  index: { normalized_name: 'test champion', aliases: [{ alias: 'Test Champion', normalized: 'test champion', kind: 'name', keys: ['full:test champion'], search_name: 'test champion' }] },
  ...over });

before(async () => { db = await freshDatabase('identity_seed'); });
after(async () => { await db?.close(); });

test('AUTO_SEEDED creates one canonical fighter through the Wikidata identity path, with no DOB and no record', async () => {
  const r = await seed(auto());
  assert.equal(r.status, 'created');
  assert.equal(r.decision, 'AUTO_SEEDED', JSON.stringify(r.creation));
  const [f] = await q('select display_name, dob, identity_state from public.boxing_fighters where id = $1', [r.fighter_id]);
  assert.equal(f.display_name, 'Test Champion');
  assert.equal(f.dob, null, 'Wikidata DOB is decision evidence only, never the profile');
  const [i] = await q('select namespace, external_id, verification_state from public.boxing_fighter_identities where fighter_id = $1', [r.fighter_id]);
  assert.deepEqual([i.namespace, i.external_id, i.verification_state], ['wikidata.item', 'Q999000111', 'verified']);
  const [s] = await q('select dob::text, jsonb_array_length(source_claims) n from public.boxing_identity_seed_decisions where id = $1', [r.id]);
  assert.equal(s.dob, '1996-04-02');
  assert.equal(s.n, 2, 'every body entry kept as printed, not flattened');
  assert.equal((await q('select count(*)::int n from public.boxing_bout_participants where fighter_id = $1', [r.fighter_id]))[0].n, 0);
  assert.equal((await q('select count(*)::int n from public.boxing_fighter_record_claims where fighter_id = $1', [r.fighter_id]))[0].n, 0);
  const [st] = await q('select identity_basis, record_status from public.boxing_fighter_identity_status where fighter_id = $1', [r.fighter_id]);
  assert.deepEqual([st.identity_basis, st.record_status], ['p0_identity_seed', 'IDENTITY_SEEDED']);
});

test('a rerun is a duplicate; a second subject with an already-mapped QID becomes REVIEW_REQUIRED, never a second fighter', async () => {
  const before = (await q('select count(*)::int n from public.boxing_fighters'))[0].n;
  assert.equal((await seed(auto())).status, 'duplicate');
  const other = await seed(auto({ subject_key: 'testchampionjr', canonical_name: 'Test Champion' }));
  assert.equal(other.decision, 'REVIEW_REQUIRED');
  assert.equal(other.fighter_id, null);
  const [row] = await q('select reasons from public.boxing_identity_seed_decisions where id = $1', [other.id]);
  assert.deepEqual(row.reasons, ['qid_already_mapped_to_a_fighter']);
  assert.equal((await q('select count(*)::int n from public.boxing_fighters'))[0].n, before);
});

test('REVIEW_REQUIRED and NO_CANDIDATE create nothing and must say why; seed decisions are append-only', async () => {
  const before = (await q('select count(*)::int n from public.boxing_fighters'))[0].n;
  const rv = await seed(auto({ subject_key: 'reviewme', decision: 'REVIEW_REQUIRED', reasons: ['country_mismatch_needs_more_evidence'], wikidata_qid: 'Q999000222' }));
  const nc = await seed(auto({ subject_key: 'nobody', decision: 'NO_CANDIDATE', reasons: ['no_wikidata_human_boxer_agrees_with_printed_name'], wikidata_qid: null, canonical_name: null }));
  assert.equal(rv.fighter_id, null);
  assert.equal(nc.fighter_id, null);
  assert.equal((await q('select count(*)::int n from public.boxing_fighters'))[0].n, before);
  await expectPgError(() => seed(auto({ subject_key: 'noreason', decision: 'REVIEW_REQUIRED', reasons: [] })), { code: '23514' });
  await expectPgError(() => q(`update public.boxing_identity_seed_decisions set decision = 'AUTO_SEEDED' where subject_key = 'reviewme'`), {});
  await expectPgError(() => q(`delete from public.boxing_identity_seed_decisions where subject_key = 'nobody'`), {});
});
