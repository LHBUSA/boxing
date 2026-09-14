import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCHEDULED_ADAPTERS, createWorker } from './index.mjs';
import { runCommissionIngest } from '../../../shared/commissions/run.mjs';

const TOKEN = 'c'.repeat(40);
const APPROVED = { enabled: true, access_mode: 'approved_ingest', rights_state: 'approved', persistence_allowed: true, latest_rights_review_id: 'r' };
const neverFetch = async () => { throw new Error('network must not be touched'); };

test('texas is never scheduled and its remote gate refuses', async () => {
  assert.deepEqual(SCHEDULED_ADAPTERS, ['nevada', 'florida', 'new_jersey', 'missouri', 'pennsylvania']);
  const store = { writeTarget: { verified: true }, source: async () => APPROVED };
  const r = await runCommissionIngest(store, { COMMISSION_INGEST_ENABLED: 'true' }, { adapterKey: 'texas', fetchImpl: neverFetch });
  assert.equal(r.status, 'blocked');
  assert.match(r.assertions.remote, /robots/);
});

test('ingestion is disabled by default, needs a verified target and an approved source', async () => {
  assert.equal((await runCommissionIngest({}, {}, { adapterKey: 'nevada', fetchImpl: neverFetch })).status, 'disabled');
  const on = { COMMISSION_INGEST_ENABLED: 'true' };
  assert.match((await runCommissionIngest({ writeTarget: { verified: false } }, on, { adapterKey: 'nevada', fetchImpl: neverFetch })).assertions.write_target, /no verified/);
  const unapproved = { writeTarget: { verified: true }, source: async () => ({ ...APPROVED, access_mode: 'review_required' }) };
  assert.match((await runCommissionIngest(unapproved, on, { adapterKey: 'nevada', fetchImpl: neverFetch })).assertions.source_policy, /not approved/);
});

test('worker refuses non-boxing Supabase targets and requires the token', async () => {
  const worker = createWorker({ fetchImpl: neverFetch });
  const env = { BOXING_INTERNAL_TOKEN: TOKEN, COMMISSION_INGEST_ENABLED: 'true', SUPABASE_URL: 'https://tkmlnhmylqnttmnsnief.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's',
    BOXING_ENVIRONMENT: 'staging', BOXING_SUPABASE_REF: 'tkmlnhmylqnttmnsnief' };
  assert.equal((await worker.fetch(new Request('https://c.internal/internal/v1/commissions/nevada/run', { method: 'POST' }), env)).status, 401);
  const res = await worker.fetch(new Request('https://c.internal/internal/v1/commissions/nevada/run', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } }), env);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'write_target_refused');
});

test('staging wrangler config: daily cron, staging-only target, default environment off', () => {
  const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const split = toml.search(/^\[env\.staging\]$/m);
  assert.match(toml.slice(0, split), /COMMISSION_INGEST_ENABLED = "false"/);
  assert.match(toml.slice(0, split), /crons = \[\]/);
  const staging = toml.slice(split);
  assert.match(staging, /crons = \["40 11 \* \* \*"\]/);
  assert.match(staging, /BOXING_SUPABASE_REF = "wpaxofilvbsjyrxrwjhg"/);
  assert.doesNotMatch(toml, /tkmlnhmylqnttmnsnief|rlfyavnhbngwbldebrid|boxrec|compubox/i);
});
