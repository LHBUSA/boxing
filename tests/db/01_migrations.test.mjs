// Requirements 1-2: the chain applies to a fresh database and reruns cleanly.
// Also proves the Supabase lockdown, the no-cascade rule and source gating.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMigrations, asRole, expectPgError, freshDatabase, schemaFingerprint } from '../helpers/db.mjs';
import { hash, testSource } from '../helpers/fixtures.mjs';

let db;
before(async () => { db = await freshDatabase('migrations'); });
after(async () => { await db?.close(); });

test('1. migrations apply cleanly to a fresh PostgreSQL database', async () => {
  const { rows } = await db.client.query(
    `select count(*)::int as n from pg_tables where schemaname = 'public' and tablename like 'boxing\\_%'`);
  assert.ok(rows[0].n >= 45, `expected the full boxing schema, found ${rows[0].n} tables`);
  const v = await db.client.query('show server_version_num');
  assert.ok(Number(v.rows[0].server_version_num) >= 150000, 'schema requires PostgreSQL 15+ (NULLS NOT DISTINCT)');
});

test('2. rerunning the whole migration chain is a no-op', async () => {
  const beforeFp = await schemaFingerprint(db.client);
  await applyMigrations(db.client);
  await applyMigrations(db.client);
  const afterFp = await schemaFingerprint(db.client);
  for (const key of Object.keys(beforeFp)) {
    assert.deepEqual(afterFp[key], beforeFp[key], `schema drifted on rerun: ${key}`);
  }
});

test('reference seeds exist exactly once', async () => {
  const { rows } = await db.client.query(
    `select class_key, max_weight_lb from public.boxing_weight_classes order by max_weight_lb nulls last`);
  assert.equal(rows.length, 19);
  assert.equal(rows.at(-1).class_key, 'heavyweight');
  assert.equal(rows.at(-1).max_weight_lb, null, 'heavyweight has no limit; never fabricate one');
});

test('news event contract and database accept exactly the same event types', async () => {
  const { readFileSync } = await import('node:fs');
  const contract = JSON.parse(readFileSync(new URL('../../contracts/boxing-news-event.schema.json', import.meta.url), 'utf8'));
  const { rows } = await db.client.query(`
    select pg_get_constraintdef(oid) as def from pg_constraint
    where conname = 'boxing_news_events_event_type_check'`);
  const dbTypes = [...rows[0].def.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(dbTypes, [...contract.properties.event_type.enum].sort());
});

test('no foreign key cascades or nulls on delete anywhere in the boxing graph', async () => {
  const { rows } = await db.client.query(`
    select conrelid::regclass::text as rel, conname, confdeltype
    from pg_constraint
    where contype = 'f' and connamespace = 'public'::regnamespace and confdeltype <> 'r' and confdeltype <> 'a'`);
  assert.deepEqual(rows, []);
});

test('every boxing table has RLS enabled and anon/authenticated cannot read or write', async () => {
  const { rows } = await db.client.query(`
    select relname from pg_class
    where relnamespace = 'public'::regnamespace and relkind = 'r' and relname like 'boxing\\_%' and not relrowsecurity`);
  assert.deepEqual(rows, [], 'tables without RLS');

  for (const role of ['anon', 'authenticated']) {
    await asRole(db.client, role, async () => {
      await expectPgError(() => db.client.query('select * from public.boxing_fighters limit 1'), { code: '42501' });
    });
    await asRole(db.client, role, async () => {
      await expectPgError(
        () => db.client.query(`insert into public.boxing_fighters (display_name) values ('x')`), { code: '42501' });
    });
    await asRole(db.client, role, async () => {
      await expectPgError(() => db.client.query('select * from public.boxing_bout_results_current'), { code: '42501' });
    });
  }
});

test('service_role keeps write access (workers use it)', async () => {
  await asRole(db.client, 'service_role', async () => {
    const { rows } = await db.client.query(
      `insert into public.boxing_fighters (display_name) values ('Service Role Probe') returning id`);
    assert.equal(rows.length, 1);
  });
});

test('a source cannot be enabled before rights review', async () => {
  await expectPgError(() => db.client.query(`
    insert into public.boxing_sources (source_key, source_name, source_kind, access_mode, rights_state, enabled)
    values ('unreviewed_scraper', 'x', 'reference', 'review_required', 'unknown', true)`),
  { code: '23514', match: /enable_requires_review/ });

  await expectPgError(() => db.client.query(`
    update public.boxing_sources set enabled = true where source_key = 'boxrec'`),
  { code: '23514', match: /enable_requires_review/ });
});

test('raw observations are refused from disabled or reference-only sources', async () => {
  const { rows } = await db.client.query(`select id from public.boxing_sources where source_key = 'boxrec'`);
  await expectPgError(() => db.client.query(
    `insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
     values ($1, 'fighter', '123', '{}', 'h')`, [rows[0].id]),
  { code: 'BX010', match: /source_not_ingestable: boxrec/ });
});

test('identity_only sources may only write identity observations', async () => {
  const src = await testSource(db.client, 'identity_only_probe', { access_mode: 'identity_only' });
  await db.client.query(
    `insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
     values ($1, 'fighter_identity', 'x1', '{}', 'h1')`, [src.id]);
  await expectPgError(() => db.client.query(
    `insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
     values ($1, 'bout_result', 'x1', '{}', 'h2')`, [src.id]),
  { code: 'BX011' });
});

test('raw observations are deduplicated and immutable', async () => {
  const src = await testSource(db.client);
  const payload = { name: 'Test Boxer', id: 'p-1' };
  const insert = () => db.client.query(
    `insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
     values ($1, 'fighter_identity', 'p-1', $2, $3)
     on conflict on constraint boxing_observations_dedupe_key do nothing returning id`,
    [src.id, payload, hash(payload)]);
  assert.equal((await insert()).rowCount, 1);
  assert.equal((await insert()).rowCount, 0, 'identical payload must not create a second raw row');

  await expectPgError(() => db.client.query(
    `update public.boxing_source_observations set payload = '{}' where source_id = $1`, [src.id]), { code: 'BX001' });
  await expectPgError(() => db.client.query(
    `delete from public.boxing_source_observations where source_id = $1`, [src.id]), { code: 'BX001' });
  await expectPgError(() => db.client.query('truncate public.boxing_source_observations cascade'), { code: 'BX001' });
});

test('history override is explicit and audited', async () => {
  const src = await testSource(db.client);
  const payload = { probe: 'override' };
  await db.client.query(
    `insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
     values ($1, 'fighter_identity', 'ov-1', $2, $3)`, [src.id, payload, hash(payload)]);
  await db.client.query('begin');
  await db.client.query(`set local boxing.history_override = 'test: remove mistaken row'`);
  await db.client.query(`delete from public.boxing_source_observations where external_key = 'ov-1'`);
  await db.client.query('commit');
  const { rows } = await db.client.query(
    `select table_name, operation, reason from public.boxing_history_override_log where reason like 'test:%'`);
  assert.deepEqual(rows, [{ table_name: 'boxing_source_observations', operation: 'DELETE', reason: 'test: remove mistaken row' }]);
  await expectPgError(() => db.client.query('delete from public.boxing_history_override_log'), { code: 'BX001' });
});
