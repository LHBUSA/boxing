// Commission year coverage (migration 0061): replaced bouts stay stored and visible but never inflate live coverage;
// bouts held in identity review keep a card honest about what is missing.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { bout, event, fighter, testSource } from '../helpers/fixtures.mjs';

let db;
let src;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const coverage = async () => (await q('select public.boxing_commission_year_coverage($1, 2024) c', [src.source_key]))[0].c;

before(async () => {
  db = await freshDatabase('commission_coverage');
  src = await testSource(db.client, 'test_commission_cov', { source_kind: 'commission' });
});
after(async () => { await db?.close(); });

test('live coverage excludes replaced rows; the replaced row stays stored; held printed bouts are counted per event', async () => {
  const evt = await event(db.client, src, 'Synthetic Card', '2024-12-11');
  const [a, b, c, d, x] = await Promise.all(['Alpha One', 'Bravo Two', 'Charlie Three', 'Delta Four', 'Fused Artifact'].map((n) => fighter(db.client, n)));
  const done = await bout(db.client, src, evt, a, b);
  await q(`update public.boxing_bouts set status = 'complete' where id = $1`, [done.id]);
  const corrected = await bout(db.client, src, evt, c, d);
  await q(`update public.boxing_bouts set status = 'complete' where id = $1`, [corrected.id]);
  const fused = await bout(db.client, src, evt, c, x);
  await q(`update public.boxing_bouts set status = 'replaced' where id = $1`, [fused.id]);
  await q(`insert into public.boxing_bout_identities (bout_id, source_id, namespace, external_id, verification_state, confidence)
           values ($1, $2, 'test.bout', '2024-12-11|synthetic|alpha-one|bravo-two', 'verified', 100)`, [done.id, src.id]);
  // a printed bout whose corner is held in review (no bout row carries its source id) and one already bound
  for (const [key, decision, fighterId] of [['2024-12-11|synthetic|echo-five|foxtrot-six', 'review', null], ['2024-12-11|synthetic|alpha-one|bravo-two', 'matched', a.id]]) {
    await q('select public.boxing_record_appearance_decision($1)', [{ source_key: src.source_key, namespace: 'test.fighter', bout_external_id: key, side: 'a',
      observed_name: 'Someone Printed', decision, tier: decision === 'review' ? 'C' : 'A', fighter_id: fighterId, confidence: 50, evidence: {}, evidence_hash: key,
      resolver_version: 'test' }]);
  }
  const cov = await coverage();
  assert.equal(cov.live_bouts, 2, 'complete rows count; the replaced row does not');
  assert.equal(cov.replaced_bouts, 1);
  assert.equal(cov.total_bout_rows, 3, 'the replaced row stays stored');
  assert.equal(cov.held_bouts, 1, 'the held printed bout is counted; the bound one is not');
  assert.deepEqual(cov.events_with_held_bouts, [{ event_date: '2024-12-11', held: 1 }]);
  assert.equal(cov.fighters_linked_live, 4, 'a fighter only on the replaced row is not live coverage');
  assert.equal((await q(`select count(*)::int n from public.boxing_bouts where id = $1 and status = 'replaced'`, [fused.id]))[0].n, 1, 'still queryable');
});

test('a replaced row stays visible in the event truth ledger through its card change', async () => {
  const [evt] = await q(`select e.id from public.boxing_events e where e.name = 'Synthetic Card'`);
  const [fused] = await q(`select b.id, b.public_id from public.boxing_bouts b where b.event_id = $1 and b.status = 'replaced'`, [evt.id]);
  await q(`insert into public.boxing_card_changes (event_id, bout_id, change_type, before_state, after_state, effective_at, source_id, change_key)
           values ($1, $2, 'bout_status_changed', '{"status":"complete"}', '{"status":"replaced"}', now(), $3, 'test:replaced')`, [evt.id, fused.id, src.id]);
  const [{ j }] = await q('select public.boxing_event_truth_ledger_json($1, null, 200)::text j', [evt.id]);
  assert.ok(j.includes(fused.public_id), 'the replaced bout appears in the truth ledger');
  assert.ok(j.includes('replaced'));
});
