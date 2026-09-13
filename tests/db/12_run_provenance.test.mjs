// Run provenance: manual vs scheduled (and retry/backfill/test) is provable
// from the database alone, and write-once.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runCapture } from '../../shared/odds/capture.mjs';
import { manualProvenance, scheduledProvenance } from '../../shared/provenance.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const KEY = 'provkey'.padEnd(32, 'p');
const ENV = { ODDS_CAPTURE_ENABLED: 'true', ODDS_API_KEY: KEY, ODDS_REGION_PLAN: 'us=h2h', ODDS_MIN_REMAINING: '1000' };
const provider = async (url) => {
  const u = new URL(url);
  if (u.pathname.endsWith('/sports/')) return new Response(JSON.stringify([{ key: 'boxing_boxing', active: true }]), { status: 200, headers: { 'x-requests-remaining': '90000', 'x-requests-used': '1', 'x-requests-last': '0' } });
  return new Response('[]', { status: 200, headers: { 'x-requests-remaining': '89999', 'x-requests-used': '2', 'x-requests-last': '0' } });
};

before(async () => { db = await freshDatabase('run_provenance'); store = pgStore(db.client); });
after(async () => { await db?.close(); });

test('scheduled and manual runs are distinguishable from the database alone', async () => {
  const controller = { scheduledTime: Date.parse('2026-09-13T15:15:00Z'), cron: '*/15 * * * *' };
  const cfEnv = { ...ENV, BOXING_WORKER_NAME: 'boxing-odds-staging', CF_VERSION_METADATA: { id: 'ver-123', tag: '' } };
  const sched = await runCapture(store, cfEnv, { fetchImpl: provider, now: '2026-09-13T15:15:02Z', provenance: scheduledProvenance(controller, cfEnv, { workerName: 'boxing-odds' }) });
  const manual = await runCapture(store, ENV, { fetchImpl: provider, now: '2026-09-13T15:16:00Z', force: true,
    provenance: manualProvenance({ workerName: 'scripts/staging/capture-odds.ps1', workerVersion: 'git:abc', runtime: 'node test' }) });
  const legacy = await runCapture(store, ENV, { fetchImpl: provider, now: '2026-09-13T15:17:00Z', force: true });

  const rows = await q(`select id, trigger_type, worker_name, worker_version, invocation_id is not null has_inv, scheduled_for, runtime, source_version, config_hash, completed_at is not null done
    from public.boxing_ingest_runs order by started_at`);
  assert.deepEqual(rows.map((r) => [r.id, r.trigger_type, r.worker_name, r.worker_version, r.has_inv, r.runtime, r.done]), [
    [sched.runId, 'scheduled', 'boxing-odds-staging', 'ver-123', true, 'cloudflare-workers', true],
    [manual.runId, 'manual', 'scripts/staging/capture-odds.ps1', 'git:abc', true, 'node test', true],
    [legacy.runId, 'unknown', null, null, false, null, true],
  ]);
  assert.equal(new Date(rows[0].scheduled_for).toISOString(), '2026-09-13T15:15:00.000Z');
  assert.equal(rows[1].scheduled_for, null);
  assert.ok(rows.slice(0, 2).every((r) => /^[0-9a-f]{64}$/.test(r.config_hash) && r.source_version === 'the-odds-api-boxing@1.0.0'));
  assert.ok(!JSON.stringify(rows).includes(KEY), 'no secret in provenance');

  const ev = await store.schedulerEvidence('boxing-odds', '2026-01-01T00:00:00Z');
  assert.equal(ev.scheduled_runs.length, 1);
  assert.equal(ev.scheduled_runs[0].worker_version, 'ver-123');
  assert.equal(ev.manual_runs, 1);
});

test('cron invocations that are not due are still recorded; scheduled provenance is enforced and write-once', async () => {
  const controller = { scheduledTime: Date.parse('2026-09-13T15:30:00Z'), cron: '*/15 * * * *' };
  const cfEnv = { ...ENV, CF_VERSION_METADATA: { id: 'ver-123' } };
  // a capture just happened, far tier -> not due
  const r = await runCapture(store, cfEnv, { fetchImpl: async () => { throw new Error('no provider call when not due'); }, now: '2026-09-13T15:30:01Z',
    provenance: scheduledProvenance(controller, cfEnv, { workerName: 'boxing-odds-staging' }) });
  assert.equal(r.status, 'not_due');
  const inv = await q(`select trigger_type, outcome, cron, scheduled_for, worker_version, ingest_run_id from public.boxing_worker_invocations order by started_at`);
  assert.deepEqual(inv.map((i) => [i.trigger_type, i.outcome, i.ingest_run_id != null]), [['scheduled', 'ran', true], ['manual', 'ran', true], ['scheduled', 'not_due', false]]);
  assert.equal(inv[2].cron, '*/15 * * * *');

  await expectPgError(() => q(`insert into public.boxing_ingest_runs (worker, trigger_type) values ('boxing-odds', 'scheduled')`), { code: '23514' });
  await expectPgError(() => q(`insert into public.boxing_ingest_runs (worker, trigger_type, scheduled_for) values ('boxing-odds', 'manual', now())`), { code: '23514' });
  await expectPgError(() => q(`update public.boxing_ingest_runs set trigger_type = 'manual' where trigger_type = 'scheduled'`), { code: 'BX003' });
  await expectPgError(() => q(`update public.boxing_ingest_runs set worker_version = 'other' where trigger_type = 'scheduled'`), { code: 'BX003' });
  await expectPgError(() => q(`update public.boxing_worker_invocations set outcome = 'ran'`), { code: 'BX001' });
  // an unknown legacy row may be classified once, then it is frozen
  await q(`update public.boxing_ingest_runs set trigger_type = 'backfill' where trigger_type = 'unknown'`);
  await expectPgError(() => q(`update public.boxing_ingest_runs set trigger_type = 'test' where trigger_type = 'backfill'`), { code: 'BX003' });
});
