// Requirements 3-5: identities cannot silently collide, aliases carry kinds,
// same-name fighters stay distinct.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { fighter, testSource } from '../helpers/fixtures.mjs';

let db;
let src;
before(async () => {
  db = await freshDatabase('identity');
  src = await testSource(db.client, 'identity_provider');
});
after(async () => { await db?.close(); });

const mapIdentity = (fighterId, externalId, state = 'verified', namespace = 'test_provider') =>
  db.client.query(
    `insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, verification_state, confidence)
     values ($1, $2, $3, $4, $5, 100) returning *`,
    [fighterId, src.id, namespace, externalId, state]);

test('3. one external id cannot attach to two canonical fighters', async () => {
  const a = await fighter(db.client, 'Collision Probe One');
  const b = await fighter(db.client, 'Collision Probe Two');
  await mapIdentity(a.id, 'ext-100');
  await expectPgError(() => mapIdentity(b.id, 'ext-100'), { code: '23505', match: /identities_live_key/ });
  await expectPgError(() => mapIdentity(b.id, 'ext-100', 'probable'), { code: '23505' });
  // the same external id in a DIFFERENT namespace is a different identity
  await mapIdentity(b.id, 'ext-100', 'verified', 'other_provider');
});

test('3. a rejected mapping does not block the correct mapping', async () => {
  const wrong = await fighter(db.client, 'Rejected Candidate');
  const right = await fighter(db.client, 'Correct Candidate');
  await mapIdentity(wrong.id, 'ext-200', 'rejected');
  await mapIdentity(right.id, 'ext-200', 'verified');
  const { rows } = await db.client.query(
    `select verification_state from public.boxing_fighter_identities where external_id = 'ext-200' order by 1`);
  assert.deepEqual(rows.map((r) => r.verification_state), ['rejected', 'verified']);
});

test('3. public ids are unique and can never be rewritten', async () => {
  const a = await fighter(db.client, 'Public Id Probe');
  assert.match(a.public_id, /^pbe_boxer_[0-9a-f]{32}$/);
  await expectPgError(() => db.client.query(
    `update public.boxing_fighters set public_id = 'pbe_boxer_hijack' where id = $1`, [a.id]), { code: 'BX002' });
  const b = await fighter(db.client, 'Public Id Probe Two');
  await expectPgError(() => db.client.query(
    `insert into public.boxing_fighters (public_id, display_name) values ($1, 'dup')`, [b.public_id]), { code: '23505' });
});

test('3. merges cannot chain or be silently reversed', async () => {
  const keep = await fighter(db.client, 'Merge Keep');
  const dup = await fighter(db.client, 'Merge Duplicate');
  const third = await fighter(db.client, 'Merge Third');
  await db.client.query(
    `update public.boxing_fighters set identity_state = 'merged', merged_into_id = $1 where id = $2`, [keep.id, dup.id]);
  await expectPgError(() => db.client.query(
    `update public.boxing_fighters set identity_state = 'merged', merged_into_id = $1 where id = $2`, [dup.id, third.id]),
  { code: 'BX020', match: /itself merged/ });
  await expectPgError(() => db.client.query(
    `update public.boxing_fighters set identity_state = 'merged', merged_into_id = $1 where id = $2`, [third.id, keep.id]),
  { code: 'BX020', match: /merge target/ });
  await expectPgError(() => db.client.query(
    `update public.boxing_fighters set identity_state = 'verified', merged_into_id = null where id = $1`, [dup.id]),
  { code: 'BX020', match: /merge_irreversible/ });
});

test('3. deleting a fighter never cascades away its identity mappings', async () => {
  const a = await fighter(db.client, 'Delete Probe');
  await mapIdentity(a.id, 'ext-300');
  await expectPgError(() => db.client.query('delete from public.boxing_fighters where id = $1', [a.id]), { code: '23503' });
});

test('4. aliases represent transliterations, nicknames and former names', async () => {
  const f = await fighter(db.client, 'Oleksandr Test', { nationality: 'UA' });
  const rows = [
    ['Олександр Тест', 'олександр тест', 'name'],
    ['Aleksandr Test', 'aleksandr test', 'transliteration'],
    ['Alexander Test', 'alexander test', 'transliteration'],
    ['The Probe', 'the probe', 'nickname'],
    ['Sasha Oldname', 'sasha oldname', 'former_name'],
  ];
  for (const [alias, normalized, kind] of rows) {
    await db.client.query(
      `insert into public.boxing_fighter_aliases (fighter_id, source_id, alias, normalized, kind) values ($1, $2, $3, $4, $5)`,
      [f.id, src.id, alias, normalized, kind]);
  }
  const { rows: stored } = await db.client.query(
    `select kind, count(*)::int as n from public.boxing_fighter_aliases where fighter_id = $1 group by kind order by kind`, [f.id]);
  assert.deepEqual(stored, [
    { kind: 'former_name', n: 1 }, { kind: 'name', n: 1 }, { kind: 'nickname', n: 1 }, { kind: 'transliteration', n: 2 },
  ]);
  // the same normalized text may be both a name and a nickname, but not twice as the same kind
  await expectPgError(() => db.client.query(
    `insert into public.boxing_fighter_aliases (fighter_id, alias, normalized, kind) values ($1, 'Aleksandr TEST', 'aleksandr test', 'transliteration')`,
    [f.id]), { code: '23505' });
});

test('5. two different boxers with the exact same name remain distinct', async () => {
  const one = await fighter(db.client, 'Jose Ramirez', { dob: '1992-08-01', nationality: 'US' });
  const two = await fighter(db.client, 'Jose Ramirez', { dob: '1985-03-14', nationality: 'MX' });
  assert.notEqual(one.id, two.id);
  assert.notEqual(one.public_id, two.public_id);
  await mapIdentity(one.id, 'jr-1');
  await mapIdentity(two.id, 'jr-2');
  const { rows } = await db.client.query(`
    select f.dob::text, i.external_id from public.boxing_fighters f
    join public.boxing_fighter_identities i on i.fighter_id = f.id
    where f.display_name = 'Jose Ramirez' order by f.dob`);
  assert.deepEqual(rows, [{ dob: '1985-03-14', external_id: 'jr-2' }, { dob: '1992-08-01', external_id: 'jr-1' }]);
  // and nothing in the schema keys a fighter by name
  const { rows: nameKeys } = await db.client.query(`
    select conname from pg_constraint
    where conrelid = 'public.boxing_fighters'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) ~ '(display_name|normalized_name)'`);
  assert.deepEqual(nameKeys, []);
});
