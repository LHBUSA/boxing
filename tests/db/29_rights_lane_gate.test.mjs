// Rights lane gate: a fact may only be written for a (source, lane) the source's recorded rights review covers.
//
// Owner decision 2026-09-15: the New Jersey review covers schedule facts only, so results, judges' totals, suspensions and
// the other expanded lanes fail closed until the terms are re-reviewed. This proves the gate refuses those writes, that the
// refusal is counted rather than crashing a run, that nothing already stored is deleted, that an approved commission is
// unaffected, and that the archival and amateur sources are registered without being approved for anything.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase, expectPgError } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCardDocument } from '../../shared/events/card.mjs';
import { recordResult, recordWeighIn, recordRegulatoryAction, recordScorecards } from '../../shared/events/outcomes.mjs';
import { laneRefusal } from '../../shared/events/rights.mjs';

let db;
let store;
const NOW = '2026-09-18T12:00:00Z';
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const f = (id, name) => ({ external_id: id, display_name: name });
// each card carries its own fighters: two cards naming the same people would (correctly) fail closed on identity, which
// would hide what this file is testing
const card = (sourceKey, ns, id, a, b) => ({
  source_key: sourceKey, namespace: ns, external_id: id, name: `Lane Gate Card ${id}`, event_date: '2026-06-06', status: 'complete',
  source_url: 'https://example.invalid/sheet.pdf', venue: { name: `Gate Arena ${id}`, city: 'Trenton', country_code: 'US' },
  bouts: [{ external_id: `${id}-m1`, bout_order: 1, scheduled_rounds: 10, fighter_a: f(`${id}-a`, a), fighter_b: f(`${id}-b`, b) }],
});

before(async () => {
  db = await freshDatabase('rights_lane_gate');
  store = pgStore(db.client);
});
after(async () => { await db?.close(); });

test('New Jersey: the expanded lanes are unresolved and marked review_scope_gap, the schedule lanes are not', async () => {
  const [nj] = (await one(`select public.boxing_source_registry_json('nj_sacb') r`)).r;
  const lane = (k) => nj.lanes.find((l) => l.lane === k);
  for (const k of ['bouts', 'results', 'scorecard_totals', 'judges', 'referees', 'weigh_ins', 'suspensions', 'titles_at_stake']) {
    assert.equal(lane(k).rights_scope, 'review_scope_gap', k);
    assert.equal(lane(k).availability, 'unresolved', k);
  }
  for (const k of ['events', 'upcoming_cards', 'venues', 'promoters']) assert.equal(lane(k).rights_scope, 'covered_by_rights_review', k);
  assert.match(nj.lanes.find((l) => l.lane === 'results').notes, /schedule facts only/);
  // superseded rows are kept: the registry is append-only history, not an edit
  assert.ok((await one(`select count(*)::int c from public.boxing_source_capabilities where supersedes_id is not null`)).c >= 8);
  assert.equal((await one(`select public.boxing_lane_rights_state((select id from public.boxing_sources where source_key = 'nj_sacb'), 'results') s`)).s, 'review_scope_gap');
  assert.equal((await one(`select public.boxing_lane_rights_state((select id from public.boxing_sources where source_key = 'nsac_nevada'), 'results') s`)).s, 'covered_by_rights_review');
});

test('a closed lane fails closed at write time, and the pipeline counts the refusal instead of failing the run', async () => {
  // the NJ schedule lane still works: the event is created
  const applied = await applyCardDocument(store, card('nj_sacb', 'nj-sacb', 'NJ-1', 'Nina Alvarez', 'Robin Feld'), { now: NOW });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.changes.filter((c) => c.change_type === 'bout_added').length, 0, 'the bout lane is closed, so no bout is written');
  assert.deepEqual(applied.lane_refusals.map((r) => [r.lane, r.rights_scope]), [['bouts', 'review_scope_gap']]);
  assert.equal((await one(`select count(*)::int c from public.boxing_events`)).c, 1, 'the approved schedule lane still wrote the event');
  assert.equal((await one(`select count(*)::int c from public.boxing_bouts`)).c, 0);

  // a bout that already exists (written before the lane was closed) still refuses new NJ facts
  const nv = await applyCardDocument(store, card('nsac_nevada', 'nsac', 'NV-1', 'Owen Petrakis', 'Sami Oduya'), { now: NOW });
  assert.equal(nv.changes.filter((c) => c.change_type === 'bout_added').length, 1, 'an approved commission is unaffected');
  const boutId = (await one(`select id from public.boxing_bouts limit 1`)).id;
  const winner = (await one(`select fighter_id from public.boxing_bout_participants where bout_id = $1 and side = 'a'`, [boutId])).fighter_id;

  const r = await recordResult(store, { bout_id: boutId, source_key: 'nj_sacb', source_url: 'https://example.invalid/sheet.pdf', outcome: 'win',
    winner_id: winner, method: 'KO', round: 3, result_state: 'official' }, { now: NOW });
  assert.equal(r.status, 'refused');
  assert.equal(r.reason, 'lane_not_rights_approved');
  assert.equal(r.lane, 'results');
  assert.equal(r.news, null, 'a refused lane emits no news');
  assert.equal((await one(`select count(*)::int c from public.boxing_bout_results`)).c, 0);

  const w = await recordWeighIn(store, { bout_id: boutId, fighter_id: winner, source_key: 'nj_sacb', source_url: 'https://example.invalid/sheet.pdf',
    weigh_in_kind: 'official', attempt_no: 1, official_weight_lb: 147, source_unit: 'lb', source_weight_raw: '147', verification_state: 'verified' }, { now: NOW });
  assert.equal(w.status, 'refused');
  const s = await recordRegulatoryAction(store, { source_key: 'nj_sacb', action_key: 'nj|susp|1', action_type: 'suspension', status: 'active',
    fighter_id: winner, bout_id: boutId, commission_slug: 'nj', effective_from: '2026-06-06', effective_to: null, source_url: 'https://example.invalid/sheet.pdf' }, { now: NOW });
  assert.equal(s.status, 'refused');
  assert.equal((await one(`select count(*)::int c from public.boxing_weigh_ins`)).c, 0);
  assert.equal((await one(`select count(*)::int c from public.boxing_regulatory_actions`)).c, 0);

  // the same writes from the approved commission succeed
  const ok = await recordResult(store, { bout_id: boutId, source_key: 'nsac_nevada', source_url: 'https://example.invalid/nv.pdf', outcome: 'win',
    winner_id: winner, method: 'KO', round: 3, result_state: 'official' }, { now: NOW });
  assert.equal(ok.status, 'created');
  await expectPgError(() => q(`insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, result_state, source_url, revision)
    values ($1, (select id from public.boxing_sources where source_key = 'nj_sacb'), 'win', $2, 'KO', 'official', 'https://example.invalid/x', 2)`, [boutId, winner]),
    { code: 'BX140', match: /lane_not_rights_approved: results/ });
});

test('rows stored before a lane closed are kept and counted, never deleted or hidden', async () => {
  const report = (await one(`select public.boxing_rights_gate_report() r`)).r;
  const gated = report.gated_lanes.filter((g) => g.source_key === 'nj_sacb').map((g) => g.lane).sort();
  assert.deepEqual(gated, ['bouts', 'judges', 'point_deductions', 'referees', 'results', 'scorecard_totals', 'stoppage_round_time', 'suspensions', 'titles_at_stake', 'weigh_ins']);
  assert.ok(report.gated_lanes.every((g) => g.commercial_use !== 'allowed'));
  assert.equal(typeof report.rows_stored_in_closed_lanes, 'object', 'pre-existing rows are reported per source and lane');
  assert.ok(report.registered_not_approved.some((s) => s.source_key === 'loc_gov'));
});

test('archival and amateur sources are registered, fail closed on every lane, and can write nothing', async () => {
  const registry = (await one(`select public.boxing_source_registry_json() r`)).r;
  const byKey = Object.fromEntries(registry.map((s) => [s.source_key, s]));
  for (const key of ['loc_gov', 'chronicling_america', 'wikimedia_commons', 'smithsonian_open_access', 'internet_archive', 'dpla', 'nara']) {
    const s = byKey[key];
    assert.ok(s, key);
    assert.equal(s.enabled, false, key);
    assert.ok(['review_required', 'reference_only'].includes(s.access_mode), key);
    assert.ok(s.lanes.length > 0, key);
    assert.ok(s.lanes.every((l) => l.availability === 'unresolved' && l.rights_scope === 'not_permitted'), key);
    assert.ok(s.lanes.every((l) => l.redistribution_allowed === 'prohibited' && l.commercial_use === 'unresolved'), key);
    assert.ok(s.lanes.every((l) => l.verification_state === 'unverified'), key);
  }
  for (const key of ['ioc_olympics', 'world_boxing', 'iba_boxing', 'usa_boxing']) {
    const s = byKey[key];
    assert.equal(s.access_mode, 'review_required', key);
    assert.equal(s.enabled, false, key);
    assert.ok(s.lanes.every((l) => l.rights_scope === 'not_permitted'), key);
  }
  // registration is not ingestion: the observation gate still refuses them outright
  await expectPgError(() => q(`select public.boxing_record_observation($1)`,
    [{ source_key: 'loc_gov', entity_type: 'commission_results_document', external_key: 'x', payload: {}, content_hash: 'a'.repeat(64) }]),
    { match: /source_not_ingestable: loc_gov/ });
});

test('laneRefusal parses only rights refusals', () => {
  assert.equal(laneRefusal(new Error('boom')), null);
  assert.deepEqual(laneRefusal(new Error('lane_not_rights_approved: results is review_scope_gap for source nj_sacb')),
    { status: 'refused', reason: 'lane_not_rights_approved', lane: 'results', rights_scope: 'review_scope_gap', source_key: 'nj_sacb' });
});
