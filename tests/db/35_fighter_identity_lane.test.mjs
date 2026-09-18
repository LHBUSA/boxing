// Minting a canonical fighter is a rights decision (migration 0047).
//
// The 0045 write gate is a deny-list: it refuses declared-and-forbidden lanes and lets everything else through, so an
// UNDECLARED lane silently authorized the write. Identity creation is the one place that is unacceptable — a promoter's
// promotional page could mint a person into the canonical graph. 0047 makes identity creation an ALLOW-list: only an
// explicit 'covered_by_rights_review' may create, and undeclared refuses exactly like forbidden.
//
// Refusal is a downgrade to review, not a loss: the observation is kept, the corner goes to the identity queue, and a
// human can approve it. Matching an existing fighter is untouched throughout — recognising someone we already hold is
// not the same act as creating them.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase, setSourceLane } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCardDocument } from '../../shared/events/card.mjs';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const fighters = async () => (await one('select count(*)::int c from public.boxing_fighters')).c;
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

let seq = 0;
let approved = null;   // the card from (c), whose fighters the source has mapped
const card = (over = {}) => {
  seq += 1;
  return {
    source_key: 'promoter_matchroom', namespace: 'matchroom', external_id: `ID-${seq}`, name: `Identity Lane Card ${seq}`,
    event_date: day(1), status: 'scheduled', source_url: 'https://www.matchroomboxing.com/events/identity/',
    venue: { name: 'Co-op Live', city: 'Manchester', country_code: 'GB' },
    bouts: [{
      external_id: `ID-${seq}-b1`, bout_order: 1, scheduled_rounds: 12,
      fighter_a: { external_id: `id-a-${seq}`, display_name: `Announced Boxer A${seq}` },
      fighter_b: { external_id: `id-b-${seq}`, display_name: `Announced Boxer B${seq}` },
    }],
    ...over,
  };
};

before(async () => {
  db = await freshDatabase('fighter_identity_lane');
  store = pgStore(db.client);
});
after(async () => { await db?.close(); });

test('0047 declares fighter_identity for every ingesting source, and no one is left undeclared', async () => {
  const rows = await q(`select s.source_key, public.boxing_lane_rights_state(s.id, 'fighter_identity') scope,
      public.boxing_fighter_identity_lane_allows_create(s.id) may_create
    from public.boxing_sources s where s.access_mode = 'approved_ingest' order by s.source_key`);
  assert.ok(rows.length >= 15, `${rows.length} ingesting sources`);
  assert.deepEqual(rows.filter((r) => r.scope === 'not_declared'), [],
    'no source that may ingest is left with an undeclared identity lane');

  // the promoters are declared, and declared closed: the schedule review never covered minting a person
  for (const key of ['promoter_pbc', 'promoter_matchroom']) {
    const r = rows.find((x) => x.source_key === key);
    assert.equal(r.scope, 'review_scope_gap', key);
    assert.equal(r.may_create, false, `${key} must not be able to mint a fighter`);
  }
  // the sources that already created fighters still can
  for (const key of ['nsac_nevada', 'tn_athletic_commission', 'pa_state_athletic_commission', 'nj_sacb', 'pbe_manual_review']) {
    assert.equal(rows.find((x) => x.source_key === key).may_create, true, `${key} keeps its existing behaviour`);
  }
});

test('(a) schedule approved but fighter_identity not declared: creation is refused', async () => {
  // withdraw the declaration entirely — the pre-0047 state, where the deny-list waved it through
  await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', null);
  assert.equal((await one(`select public.boxing_lane_rights_state(
    (select id from public.boxing_sources where source_key = 'promoter_matchroom'), 'fighter_identity') s`)).s, 'not_applicable');

  const before = await fighters();
  const applied = await applyCardDocument(store, card(), { now: new Date().toISOString() });
  assert.equal(await fighters(), before, 'an undeclared identity lane mints nobody');
  assert.ok(applied.unresolved?.length >= 2, 'both corners are unresolved');
  assert.ok(applied.unresolved.every((u) => /fighter_identity_lane_not_approved/.test(JSON.stringify(u))),
    `the reason is stated: ${JSON.stringify(applied.unresolved)}`);
  // the card itself still lands: the event is real, only the people are withheld
  assert.equal(applied.status, 'applied');
  assert.ok((await one(`select count(*)::int c from public.boxing_events`)).c > 0);
});

test('(b) fighter_identity declared but not permitted: creation is refused', async () => {
  await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', 'not_permitted');
  const before = await fighters();
  const applied = await applyCardDocument(store, card(), { now: new Date().toISOString() });
  assert.equal(await fighters(), before, 'a forbidden identity lane mints nobody');
  assert.ok(applied.unresolved?.length >= 2);

  // and the scope gap the migration actually ships with behaves the same way
  await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', 'review_scope_gap');
  const applied2 = await applyCardDocument(store, card(), { now: new Date().toISOString() });
  assert.equal(await fighters(), before, 'a scope gap mints nobody either');
  assert.ok(applied2.unresolved?.length >= 2);
});

test('(c) fighter_identity explicitly approved: creation is allowed', async () => {
  await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', 'covered_by_rights_review');
  const before = await fighters();
  const doc = card();
  const applied = await applyCardDocument(store, doc, { now: new Date().toISOString() });
  approved = doc;
  assert.equal(await fighters(), before + 2, 'an approved identity lane creates both boxers');
  assert.equal(applied.unresolved?.length ?? 0, 0);
  assert.equal(applied.changes.filter((c) => c.change_type === 'bout_added').length, 1, 'and the bout is written');
});

test('(e) an existing fighter still resolves without creating anything, whatever the lane says', async () => {
  assert.ok(approved, 'the approved card from (c) created the two boxers');
  const [a, b] = approved.bouts[0] ? [approved.bouts[0].fighter_a, approved.bouts[0].fighter_b] : [];

  for (const scope of [null, 'not_permitted', 'review_scope_gap', 'covered_by_rights_review']) {
    await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', scope);
    const before = await fighters();
    // the same two people the source already mapped: this is what every rerun and every rematch looks like
    const doc = card({ bouts: [{ external_id: `rematch-${scope ?? 'none'}`, bout_order: 1, scheduled_rounds: 10, fighter_a: a, fighter_b: b }] });
    const applied = await applyCardDocument(store, doc, { now: new Date().toISOString() });
    assert.equal(await fighters(), before, `lane ${scope}: matching an existing boxer creates nobody`);
    assert.equal(applied.unresolved?.length ?? 0, 0,
      `lane ${scope}: a boxer the source already mapped resolves regardless of the create gate — ${JSON.stringify(applied.unresolved)}`);
    assert.equal(applied.changes.filter((c) => c.change_type === 'bout_added').length, 1,
      `lane ${scope}: the rematch is written from matched identities`);
  }
});

test('a bare name with no other evidence goes to review, and still creates nobody', async () => {
  // This is the identity resolver's own policy, not the rights gate: a name alone is not proof of a person. It matters
  // here because it is the other way a promoter corner fails closed — and it must never fall through to creation.
  for (const scope of [null, 'review_scope_gap', 'covered_by_rights_review']) {
    await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', scope);
    const before = await fighters();
    const known = await one(`select display_name from public.boxing_fighters order by created_at limit 1`);
    const doc = card({ bouts: [{ external_id: `nameonly-${scope ?? 'none'}`, bout_order: 1,
      fighter_a: { display_name: known.display_name }, fighter_b: { display_name: 'Someone Else Entirely' } }] });
    const applied = await applyCardDocument(store, doc, { now: new Date().toISOString() });
    if (scope === 'covered_by_rights_review') {
      assert.ok(await fighters() >= before, 'an approved lane may create the genuinely new corner');
    } else {
      assert.equal(await fighters(), before, `lane ${scope}: neither corner is minted`);
      assert.ok(applied.unresolved?.length >= 1, `lane ${scope}: the corner is queued for review`);
    }
  }
  await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', 'review_scope_gap');
});

test('(d) a dry run writes nothing, whatever the identity lane says', async () => {
  for (const scope of [null, 'review_scope_gap', 'covered_by_rights_review']) {
    await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', scope);
    const before = await fighters();
    const r = await collectPromoterCards(store, {
      sources: ['promoter_matchroom'], dryRun: true, now: '2026-09-18T20:00:00Z', sleepImpl: async () => {},
      fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }),
    });
    assert.equal(await fighters(), before, `lane ${scope}: a dry run creates no fighter`);
    assert.equal(r.summary.actual_writes, 0);
  }
  await setSourceLane(db.client, 'promoter_matchroom', 'fighter_identity', 'review_scope_gap');
});

test('half-applied 0046 is detected, and an apply is refused while a dry run is not', async () => {
  const ready = await one(`select public.boxing_promoter_lane_ready() r`);
  assert.equal(ready.r.ready, true, JSON.stringify(ready.r));
  assert.equal(ready.r.schema_half_complete, true);
  assert.equal(ready.r.data_half_complete, true);
  assert.equal(ready.r.data_half.promoter_pbc.schedule_lanes_covered, 7);
  assert.equal(ready.r.data_half.promoter_pbc.non_schedule_lanes_open, 0);
  assert.equal(ready.r.data_half.promoter_pbc.may_create_fighters, false, 'declared, and declared closed');

  // the data half alone going missing must fail the check, even though every schema object is present
  await setSourceLane(db.client, 'promoter_pbc', 'bouts', 'review_scope_gap');
  const half = (await one(`select public.boxing_promoter_lane_ready() r`)).r;
  assert.equal(half.ready, false, 'a half-applied lane is not ready');
  assert.equal(half.schema_half_complete, true, 'the schema half is still complete — that is the whole trap');
  assert.equal(half.data_half_complete, false);

  // an apply is refused outright; a dry run still runs and reports the state
  const apply = await collectPromoterCards(store, { sources: ['promoter_pbc'], dryRun: false, now: '2026-09-18T20:00:00Z',
    sleepImpl: async () => {}, fetchImpl: async () => { throw new Error('must not be fetched'); } });
  assert.match(apply.error, /promoter lane is not ready/);
  assert.equal(apply.summary.actual_writes, 0);

  const dry = await collectPromoterCards(store, { sources: ['promoter_pbc'], dryRun: true, now: '2026-09-18T20:00:00Z',
    sleepImpl: async () => {}, fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }) });
  assert.equal(dry.error, undefined, 'a dry run is allowed to inspect a half-applied database');
  assert.equal(dry.lane_ready.ready, false, 'and reports what it found');

  await setSourceLane(db.client, 'promoter_pbc', 'bouts', 'covered_by_rights_review');
  assert.equal((await one(`select public.boxing_promoter_lane_ready() r`)).r.ready, true, 'restored');
});

test('a dismissed discovery candidate is not resurrected by rediscovering the same page', async () => {
  const candidate = {
    source_key: 'promoter_pbc', external_key: 'https://www.premierboxingchampions.com/dismissed-card',
    discovered_name: 'Dismissed Card', probable_date: day(2), probable_city: 'Manchester',
    source_url: 'https://www.premierboxingchampions.com/dismissed-card', confidence: 'high',
  };
  const first = await store.recordEventCandidate(candidate);
  assert.equal(first.state, 'open');

  await q(`update public.boxing_event_discovery_candidates set state = 'dismissed',
    dismissed_reason = 'not a professional card' where id = $1`, [first.id]);

  // now a same-day event in the same city exists — exactly the situation that used to flip it back
  const src = await one(`select id from public.boxing_sources where source_key = 'promoter_pbc'`);
  const venue = await one(`insert into public.boxing_venues (name, city, country_code) values ('Resurrection Arena', 'Manchester', 'GB') returning id`);
  await q(`insert into public.boxing_events (source_id, external_event_id, name, event_date, status, source_url, venue_id)
    values ($1, 'resurrection', 'Some Other Card', $2, 'scheduled', 'https://www.premierboxingchampions.com/x', $3)`,
  [src.id, candidate.probable_date, venue.id]);

  const again = await store.recordEventCandidate(candidate);
  assert.equal(again.state, 'dismissed', 'a dismissal is a human decision; rediscovery does not undo it');
  const row = await one(`select state, canonical_event_id, dismissed_reason from public.boxing_event_discovery_candidates where id = $1`, [first.id]);
  assert.equal(row.state, 'dismissed');
  assert.equal(row.canonical_event_id, null, 'and it holds no canonical event, which the table check requires');
  assert.equal(row.dismissed_reason, 'not a professional card');
});
