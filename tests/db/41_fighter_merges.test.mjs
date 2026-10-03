// Owner-reviewed fighter merges (2026-10-03): a seeded short-name fighter merges INTO the commission fighter that owns
// the bouts, with lineage; every required check is computed from stored rows and a failing check refuses the merge.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { bout, event, fighter, testSource } from '../helpers/fixtures.mjs';

let db;
let commission;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const merge = async (p) => (await q('select public.boxing_merge_fighters($1) r', [{ reviewer: 'Justin Erickson', review_note: 'Owner approved merge of a seeded duplicate into the commission fighter.', ...p }]))[0].r;
const card = async (a, b, date = '2026-03-08') => bout(db.client, commission, await event(db.client, commission, 'Card', date), a, b);

before(async () => {
  db = await freshDatabase('fighter_merges');
  commission = await testSource(db.client, 'test_commission_merge', { source_kind: 'commission' });
});
after(async () => { await db?.close(); });

test('a seeded short name merges into the commission fighter; lineage and identities are kept, bouts are not duplicated', async () => {
  const survivor = await fighter(db.client, 'Jai Tapu Opetaia');
  const opp = await fighter(db.client, 'Brandon Glanton');
  await card(survivor, opp);
  const seeded = await fighter(db.client, 'Jai Opetaia', { nationality: 'AU' });
  await q(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, verification_state, confidence)
           values ($1, $2, 'wikidata.item', 'Q2029085', 'verified', 90)`, [seeded.id, commission.id]);
  const r = await merge({ merged_fighter_id: seeded.id, survivor_fighter_id: survivor.id });
  assert.equal(r.status, 'merged');
  for (const k of ['first_last', 'dob', 'nationality', 'era', 'commission', 'external_ids']) assert.equal(r.checks[k].pass, true, k);
  const [row] = await q('select identity_state, merged_into_id from public.boxing_fighters where id = $1', [seeded.id]);
  assert.deepEqual([row.identity_state, row.merged_into_id], ['merged', survivor.id], 'merged row kept with lineage, never deleted');
  const [canon] = await q(`select public.boxing_canonical_fighter_id(fighter_id) c from public.boxing_fighter_identities where external_id = 'Q2029085'`);
  assert.equal(canon.c, survivor.id, 'the QID now resolves to the commission fighter');
  assert.equal((await q('select count(*)::int n from public.boxing_bout_participants where fighter_id in ($1, $2)', [seeded.id, survivor.id]))[0].n, 1);
  assert.equal((await merge({ merged_fighter_id: seeded.id, survivor_fighter_id: survivor.id })).status, 'duplicate');
  await expectPgError(() => q('delete from public.boxing_fighter_merge_decisions'), {});
});

test('each required check refuses a merge it fails', async () => {
  const a = await fighter(db.client, 'Sebastian Alexander Fundora');
  await card(a, await fighter(db.client, 'Keith Thurman'), '2026-03-28');
  await expectPgError(async () => merge({ merged_fighter_id: (await fighter(db.client, 'Sebastian Garcia')).id, survivor_fighter_id: a.id }), { match: /first_last/ });
  await expectPgError(async () => merge({ merged_fighter_id: (await fighter(db.client, 'Sebastian Fundora', { dob: '1997-12-28' })).id, survivor_fighter_id: (await fighter(db.client, 'Sebastian Fundora', { dob: '1990-01-01' })).id }), { match: /dob/ });
  await expectPgError(async () => merge({ merged_fighter_id: (await fighter(db.client, 'Sebastian Fundora', { nationality: 'MX' })).id, survivor_fighter_id: (await fighter(db.client, 'Sebastian A Fundora', { nationality: 'US' })).id }), { match: /nationality/ });
  await expectPgError(async () => merge({ merged_fighter_id: (await fighter(db.client, 'Sebastian Fundora')).id, survivor_fighter_id: (await fighter(db.client, 'Sebastian J Fundora')).id }), { match: /commission/ });
  await expectPgError(async () => merge({ merged_fighter_id: (await fighter(db.client, 'Sebastian Fundora', { dob: '1940-01-01' })).id, survivor_fighter_id: a.id }), { match: /era/ });
  const x = await fighter(db.client, 'Sebastian Fundora');
  await q(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, verification_state, confidence) values ($1, $3, 'wikidata.item', 'Q1', 'verified', 90), ($2, $3, 'wikidata.item', 'Q2', 'verified', 90)`, [x.id, a.id, commission.id]);
  await expectPgError(() => merge({ merged_fighter_id: x.id, survivor_fighter_id: a.id }), { match: /external_ids/ });
  await expectPgError(async () => merge({ merged_fighter_id: (await fighter(db.client, 'Sebastian Fundora')).id, survivor_fighter_id: a.id, reviewer: 'claude' }), {});
});

test('the seed accepts EXISTING_LINK and POSSIBLE_EXISTING_FIGHTER and neither creates a fighter', async () => {
  const before = (await q('select count(*)::int n from public.boxing_fighters'))[0].n;
  for (const decision of ['EXISTING_LINK', 'POSSIBLE_EXISTING_FIGHTER']) {
    const [{ r }] = await q('select public.boxing_apply_identity_seed($1) r', [{ rule_version: 'p0-identity-seed@1.2.0', batch: 'test', subject_key: decision.toLowerCase().replace(/[^a-z]/g, ''),
      decision, reasons: ['existing_fighter_may_be_same_person'], source_claims: [{ body: 'wbo', printed: 'X Y' }], creation_basis: 'none', evidence: { existing_fighters: [] } }]);
    assert.equal(r.decision, decision);
    assert.equal(r.fighter_id, null);
  }
  assert.equal((await q('select count(*)::int n from public.boxing_fighters'))[0].n, before);
});
