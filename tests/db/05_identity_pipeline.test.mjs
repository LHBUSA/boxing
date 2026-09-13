// Issue #1 acceptance against a real database: retrieval keys, persistence,
// idempotency, review queue, provenance and the internal read interface.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { asRole, expectPgError, freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { ingestIdentity, resolveOnly, summarize } from '../../shared/identity/pipeline.mjs';
import { FEED, FEED_B, ODDS, REGISTRY, probes, seeds } from '../fixtures/identity-cases.mjs';

let db;
let store;
const ids = {}; // seed key -> canonical fighter uuid
const probeResults = {};

before(async () => {
  db = await freshDatabase('identity_pipeline');
  store = pgStore(db.client);
  for (const key of [REGISTRY, FEED, FEED_B, ODDS]) await testSource(db.client, key);

  for (const s of seeds) {
    const { result } = await ingestIdentity(store, {
      sourceKey: REGISTRY, accessMode: 'approved_ingest', namespace: REGISTRY,
      record: s, payload: { ...s, key: undefined },
    });
    assert.ok(['created', 'matched'].includes(result.outcome), `seed ${s.key}: ${JSON.stringify(result)}`);
    ids[s.key] = result.fighter_id;
    for (const extra of s.extra_identities ?? []) {
      await db.client.query(
        `insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, verification_state, confidence)
         values ($1, (select id from public.boxing_sources where source_key = $2), $2, $3, 'verified', 100)`,
        [result.fighter_id, extra.namespace, extra.external_id]);
    }
  }
});
after(async () => { await db?.close(); });

test('seeding: same-name fixtures create distinct canonical boxers', async () => {
  assert.equal(Object.keys(ids).length, seeds.length);
  assert.equal(new Set(Object.values(ids)).size, seeds.length, 'every seed is its own canonical boxer');
  const { rows } = await db.client.query(`select count(*)::int n from public.boxing_fighters where display_name = 'Luis Ortega'`);
  assert.equal(rows[0].n, 2);
});

for (const p of probes) {
  test(`pipeline: ${p.id}`, async () => {
    const expect = p.dbExpect ?? p.expect;
    const scope = p.scope ? p.scope.map((k) => ids[k]) : null;
    if (scope || p.allowCreate === false) {
      // lookup-only resolution (odds/card path): nothing is persisted
      const { decision } = await resolveOnly(store, p.obs, { namespace: p.ns, scope, allowCreate: false });
      assert.equal(decision.outcome, expect.outcome, JSON.stringify({ reason: decision.reason, c: decision.candidates?.slice(0, 2) }));
      if (expect.reason) assert.equal(decision.reason, expect.reason);
      if (expect.fighter) assert.equal(decision.fighter_id, ids[expect.fighter]);
      probeResults[p.id] = { decision };
      return;
    }
    const out = await ingestIdentity(store, {
      sourceKey: p.ns, accessMode: 'approved_ingest', namespace: p.ns, record: p.obs, payload: p.obs,
    });
    probeResults[p.id] = out;
    const { result, decision } = out;
    assert.equal(result.outcome, expect.outcome, JSON.stringify({ result, reason: decision.reason, c: decision.candidates?.slice(0, 2) }));
    if (expect.reason) assert.equal(result.reason, expect.reason);
    if (expect.fighter) assert.equal(result.fighter_id, ids[expect.fighter]);
    if (result.outcome === 'review') assert.ok(result.review_item_id, 'review outcome must create a queue item');
  });
}

test('repeat observation is idempotent: no new boxer, no new queue item, no new resolution', async () => {
  const counts = async () => (await db.client.query(`select
      (select count(*) from public.boxing_fighters)::int f,
      (select count(*) from public.boxing_identity_review_queue)::int q,
      (select count(*) from public.boxing_identity_resolutions)::int r,
      (select count(*) from public.boxing_source_observations)::int o`)).rows[0];
  const before = await counts();
  for (const id of ['same_name_dob_decides', 'same_name_third_person', 'same_name_no_evidence']) {
    const p = probes.find((x) => x.id === id);
    const { result } = await ingestIdentity(store, { sourceKey: p.ns, accessMode: 'approved_ingest', namespace: p.ns, record: p.obs, payload: p.obs });
    assert.equal(result.status, 'duplicate_observation');
    assert.equal(result.outcome, probeResults[id].result.outcome);
  }
  assert.deepEqual(await counts(), before);
});

test('a changed payload for an unresolved identity does not duplicate the pending review item', async () => {
  const p = probes.find((x) => x.id === 'same_name_no_evidence');
  const { result } = await ingestIdentity(store, {
    sourceKey: p.ns, accessMode: 'approved_ingest', namespace: p.ns, record: p.obs, payload: { ...p.obs, fetched_page: 2 },
  });
  assert.equal(result.outcome, 'review');
  assert.equal(result.review_item_id, probeResults.same_name_no_evidence.result.review_item_id);
});

test('an identity_only source can map but never create a canonical boxer', async () => {
  await testSource(db.client, 'identity_only_feed', { access_mode: 'identity_only' });
  const { result } = await ingestIdentity(store, {
    sourceKey: 'identity_only_feed', accessMode: 'identity_only', namespace: 'identity_only_feed',
    record: { external_id: 'io-1', display_name: 'Brand New Person', dob: '2000-01-01' }, payload: { id: 'io-1' },
  });
  assert.notEqual(result.outcome, 'created');
  // even a caller that lies about access mode is stopped by the database
  const lie = await ingestIdentity(store, {
    sourceKey: 'identity_only_feed', accessMode: 'approved_ingest', namespace: 'identity_only_feed',
    record: { external_id: 'io-2', display_name: 'Another New Person', dob: '2001-01-01' }, payload: { id: 'io-2' },
  });
  assert.equal(lie.result.outcome, 'review');
  assert.equal(lie.result.reason, 'source_cannot_create');
});

test('external ids stay unique per namespace even if a caller submits a conflicting match', async () => {
  const { identity, decision } = await resolveOnly(store, { external_id: 'lo-1', display_name: 'Luis Ortega', dob: '1994-02-03' }, { namespace: REGISTRY });
  assert.equal(decision.fighter_id, ids.luis_a);
  const forged = { ...decision, fighter_id: ids.luis_b, method: 'forged' };
  const r = await store.applyDecision({
    source_key: REGISTRY, resolver_version: 'test', identity, decision: forged, index: { aliases: [] },
    observation: { entity_type: 'fighter_identity', external_key: 'forged', payload: { forged: true }, content_hash: 'forged-1' },
  });
  assert.equal(r.outcome, 'review');
  assert.equal(r.reason, 'external_id_conflict');
});

test('every canonical boxer traces to the observations that created or matched it', async () => {
  const { rows } = await db.client.query(`
    select f.id from public.boxing_fighters f
    where f.identity_state <> 'merged' and not exists (
      select 1 from public.boxing_observation_links l
      where l.entity_type = 'fighter' and l.entity_id = f.id::text and l.link_role in ('created','matched'))`);
  assert.deepEqual(rows, []);
});

test('why do we believe this? fighter lookup returns identities, aliases, claims and resolution evidence', async () => {
  const f = await store.getFighter(ids.hvozdenko);
  assert.equal(f.fighter.display_name, 'Oleksandr Hvozdenko');
  const aliases = f.aliases.map((a) => a.alias);
  assert.ok(aliases.includes('Олександр Гвозденко'));
  // same normalized form as the Cyrillic alias, so no second alias row; the
  // verbatim source spelling lives on the identity and the raw observation
  assert.ok(f.identities.some((i) => i.namespace === FEED && i.source_display_name === 'Oleksandr Gvozdenko'));
  assert.ok(!aliases.includes('Aleksandr Gvozdenko'), 'a spelling held for review teaches nothing');
  const viaAlias = f.resolutions.find((r) => r.source_key === FEED && r.method === 'name_exact+dob_exact');
  assert.ok(viaAlias, 'the alias match is explained');
  assert.ok(viaAlias.evidence.reasons.some((x) => x.includes('Олександр Гвозденко')), JSON.stringify(viaAlias.evidence.reasons));
  assert.equal(viaAlias.evidence.strong[0], 'dob_exact');
  assert.ok(f.attribute_claims.some((c) => c.attribute === 'dob' && c.source_key === FEED));

  const byPublic = await store.getFighter(f.fighter.public_id);
  assert.equal(byPublic.fighter.id, ids.hvozdenko);
  const byExternal = await store.getFighter(`${REGISTRY}:oh-1`);
  assert.equal(byExternal.fighter.id, ids.hvozdenko);
  assert.ok(f.identities.some((i) => i.namespace === FEED && i.verification_state === 'verified'));
});

test('a display-name change via external id keeps the canonical name and records the new alias', async () => {
  const f = await store.getFighter(ids.kowalczyk);
  assert.equal(f.fighter.display_name, 'Maria Kowalczyk');
  assert.ok(f.aliases.some((a) => a.alias === 'Maria Nowak'));
});

test('conflicting attribute claims coexist; canonical values are never overwritten', async () => {
  const f = await store.getFighter(ids.adeyemi);
  assert.equal(f.fighter.nationality, 'NG');
  // the GB claim came from a review outcome, so it is on the queue item, not on the boxer
  const q = await store.listUnresolved({ limit: 500 });
  const item = q.find((x) => x.reason === 'nationality_conflict');
  assert.ok(item);
  assert.equal(item.candidates[0].fighter_id, ids.adeyemi);
  assert.ok(item.candidates[0].soft.includes('nationality_conflict'));
});

test('unresolved identities list carries raw identity, candidates, confidence, reasons, provenance and time', async () => {
  const q = await store.listUnresolved({ limit: 500 });
  assert.ok(q.length >= 8);
  for (const item of q) {
    assert.ok(item.source_key && item.raw_name !== undefined && item.created_at && item.observation_id, JSON.stringify(item));
    assert.ok(Array.isArray(item.candidates), 'candidates array');
    // only policy stops (not evidence) may carry zero candidates
    if (!['source_cannot_create', 'concurrent_mapping', 'external_id_conflict'].includes(item.reason)) {
      assert.ok(item.candidates.length >= 1, `${item.reason} has candidates`);
    }
    assert.equal(typeof item.confidence, 'number');
  }
});

test('manual review resolution records the decision and teaches the resolver', async () => {
  const q = await store.listUnresolved({ limit: 500 });
  const item = q.find((x) => x.reason === 'dob_mismatch');
  await expectPgError(() => store.resolveReview({ itemId: item.id, kind: 'matched_existing', fighterId: ids.mensah, note: '', actor: '' }), { code: '22023' });
  const r = await store.resolveReview({ itemId: item.id, kind: 'matched_existing', fighterId: ids.mensah, note: 'commission licence shows a typo in feed DOB (test)', actor: 'test-reviewer' });
  assert.equal(r.fighter_id, ids.mensah);
  await expectPgError(() => store.resolveReview({ itemId: item.id, kind: 'rejected', note: 'x', actor: 'y' }), { code: 'BX040' });
  const again = await resolveOnly(store, { external_id: 'f-13', display_name: 'Kwame Mensah', dob: '1996-07-15' }, { namespace: FEED });
  assert.equal(again.decision.outcome, 'matched');
  assert.equal(again.decision.method, 'external_id');
  const f = await store.getFighter(ids.mensah);
  assert.ok(f.resolutions.some((x) => x.decision_kind === 'manual' && x.decided_by === 'test-reviewer'));
});

test('coverage metrics by source', async () => {
  const rows = await store.coverage();
  const by = Object.fromEntries(rows.map((r) => [r.source_key, r]));
  assert.equal(Number(by[REGISTRY].created), seeds.length);
  const feeds = [by[FEED], by[FEED_B]];
  const sum = (k) => feeds.reduce((acc, r) => acc + Number(r[k]), 0);
  const persisted = probes.filter((p) => !p.scope && p.allowCreate !== false && p.ns !== REGISTRY);
  const expected = (o) => persisted.filter((p) => (p.dbExpect ?? p.expect).outcome === o).length;
  assert.equal(sum('matched'), expected('matched'));
  assert.equal(sum('created'), expected('created'));
  // +1: the changed-payload test adds a second observation (and resolution) for
  // an identity whose review item already exists. Coverage counts decisions
  // per observation; the queue item itself is not duplicated (asserted above).
  assert.equal(sum('review'), expected('review') + 1);
  assert.equal(sum('pending_review_items'), expected('review') - 1, 'one FEED review item was resolved manually');
  assert.equal(sum('rejected'), expected('rejected'));
  assert.equal(sum('duplicates_prevented'), sum('review') + sum('matched') - sum('matched_by_external_id'));
  const all = Object.values(probeResults).filter((x) => x.result).map((x) => x);
  const m = summarize(all);
  assert.equal(m.raw_identities_observed, all.length);
  assert.ok(m.identities_rejected >= 1);
});

test('identity RPCs are not callable by anon', async () => {
  await asRole(db.client, 'anon', async () => {
    await expectPgError(() => db.client.query(`select public.boxing_get_fighter('x')`), { code: '42501' });
  });
});

test('resolution log and attribute claims are append-only', async () => {
  await expectPgError(() => db.client.query(`update public.boxing_identity_resolutions set outcome = 'matched'`), { code: 'BX001' });
  await expectPgError(() => db.client.query(`delete from public.boxing_fighter_attribute_claims`), { code: 'BX001' });
});
