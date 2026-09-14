// Event display names: the owning source may correct a derived name under a declared naming rule; every change is an
// append-only revision; other sources never rename; cards without a rule never rename.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCommissionParsed, EVENT_NAME_RULE } from '../../shared/commissions/apply.mjs';
import { PENNSYLVANIA } from '../../shared/adapters/commissions/pennsylvania.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const ev = { source_key: PENNSYLVANIA.sourceKey, jurisdiction: 'US-PA', source_event_id: '2026-08-29|philadelphia|2300-arena', event_date: '2026-08-29', start_at: null,
  venue: { name: '2300 Arena', city: 'Philadelphia', region: 'PA', country_code: 'US' }, promoters: ['Marshall Kauffman'], event_type_raw: 'BOXING', sport: 'boxing',
  professional: true, status: 'complete', broadcast: null, source_url: 'https://www.pa.gov/x.pdf', document_key: 'pa-results:2026:x', source_revision: null, captured_at: '2026-09-14T00:00:00Z' };

before(async () => { db = await freshDatabase('eventnames'); store = pgStore(db.client); });
after(async () => { await db?.close(); });

test('a stored name from the old digit-stripping rule is corrected by the owning source, with an append-only revision', async () => {
  // what rule @1 stored
  await store.upsertEvent({ source_key: PENNSYLVANIA.sourceKey, namespace: 'pa-state-athletic-commission.event', external_id: ev.source_event_id, name: 'Marshall Kauffman at Arena',
    event_date: ev.event_date, status: 'complete', source_url: ev.source_url });
  const noRule = await store.upsertEvent({ source_key: PENNSYLVANIA.sourceKey, namespace: 'pa-state-athletic-commission.event', external_id: ev.source_event_id, name: 'Something Else' });
  assert.equal(noRule.renamed, false, 'a card without a naming rule never renames');
  const other = await store.upsertEvent({ source_key: 'nsac_nevada', namespace: 'pa-state-athletic-commission.event', external_id: ev.source_event_id, name: 'Hijack', name_rule: EVENT_NAME_RULE });
  assert.equal(other.renamed, false, 'a source that does not own the event never renames it');

  await applyCommissionParsed(store, PENNSYLVANIA, { events: [ev], bouts: [] }, { now: '2026-09-14T12:00:00Z' });
  const [row] = await q(`select name from public.boxing_events where external_event_id = $1`, [ev.source_event_id]);
  assert.equal(row.name, 'Marshall Kauffman at 2300 Arena');
  const revs = await q(`select previous_name, name, name_rule from public.boxing_event_name_revisions`);
  assert.deepEqual(revs, [{ previous_name: 'Marshall Kauffman at Arena', name: 'Marshall Kauffman at 2300 Arena', name_rule: EVENT_NAME_RULE }]);
  await applyCommissionParsed(store, PENNSYLVANIA, { events: [ev], bouts: [] }, { now: '2026-09-14T12:05:00Z' });
  assert.equal((await q(`select count(*)::int n from public.boxing_event_name_revisions`))[0].n, 1, 'an unchanged name records nothing');
  await assert.rejects(() => q(`update public.boxing_event_name_revisions set name = 'x'`), /append|BX00/i);

  // a different derived promoter list (or venue) is not what the rule changed: the stored name stays
  const unrelated = await store.upsertEvent({ source_key: PENNSYLVANIA.sourceKey, namespace: 'pa-state-athletic-commission.event', external_id: ev.source_event_id,
    name: 'Marshall Kauffman and ProBox TV at 2300 Arena', name_rule: EVENT_NAME_RULE });
  assert.equal(unrelated.renamed, false);
  const [kept] = await q(`select name from public.boxing_events where external_event_id = $1`, [ev.source_event_id]);
  assert.equal(kept.name, 'Marshall Kauffman at 2300 Arena');
  assert.deepEqual((await q(`select public.boxing_event_name_rule_correction('Count Promotions at St. Ann Community Center', '8 Count Promotions at St. Ann Community Center', $1) ok`, [EVENT_NAME_RULE]))[0], { ok: true });
  assert.deepEqual((await q(`select public.boxing_event_name_rule_correction('RNB Promotions at Showboat Hotel', 'RDR Promotions at Showboat Hotel', $1) ok`, [EVENT_NAME_RULE]))[0], { ok: false });
});
