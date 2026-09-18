// Facts enter on evidence; content stays gated (migration 0047).
//
// Owner decision 2026-09-18 (revised): public factual information may enter the canonical truth system when it has
// sufficient source evidence and provenance. Rights restrictions apply to expressive or licensed material, not to the
// underlying facts. So this file proves two things at once:
//
//   1. A publicly reported person CAN become a canonical identity — from a traceable card, an official record or a
//      credible news report — judged on evidence, never on what kind of source it is and never on a rights lane.
//   2. Nothing about that grants permission to store their biography, their photograph or an article body. Those stay
//      behind the content lanes, and a source whose attribute lane is closed creates a NAME and nothing else.
//
// Insufficient evidence is a downgrade to review, not an invention and not a silent drop.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase, setSourceLane, expectPgError } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCardDocument } from '../../shared/events/card.mjs';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';
import { isPlaceholderName } from '../../shared/adapters/promoters/names.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const fighters = async () => (await one('select count(*)::int c from public.boxing_fighters')).c;
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const evidence = async (p) => (await one('select public.boxing_identity_evidence($1) r', [p])).r;

let seq = 0;
// a card as a promoter publishes it: a real event page, a stable per-source id per corner
const card = (over = {}) => {
  seq += 1;
  return {
    source_key: 'promoter_matchroom', namespace: 'matchroom', external_id: `EV-${seq}`, name: `Evidence Card ${seq}`,
    event_date: day(1), status: 'scheduled', source_url: 'https://www.matchroomboxing.com/events/evidence/',
    venue: { name: 'Co-op Live', city: 'Manchester', country_code: 'GB' },
    bouts: [{
      external_id: `EV-${seq}-b1`, bout_order: 1, scheduled_rounds: 12,
      fighter_a: { external_id: `ev-a-${seq}`, display_name: `Wendell Okoro ${seq}` },
      fighter_b: { external_id: `ev-b-${seq}`, display_name: `Ivo Marchetti ${seq}` },
    }],
    ...over,
  };
};

before(async () => {
  db = await freshDatabase('identity_evidence');
  store = pgStore(db.client);
});
after(async () => { await db?.close(); });

// ---------------------------------------------------------------- the facts side

test('a fighter named on a traceable public card is created, with no rights lane involved', async () => {
  const before = await fighters();
  const doc = card();
  const applied = await applyCardDocument(store, doc, { now: new Date().toISOString() });
  assert.equal(await fighters(), before + 2, `both corners of a traceable announced card become canonical: ${JSON.stringify(applied.unresolved)}`);
  assert.equal(applied.unresolved?.length ?? 0, 0);
  assert.equal(applied.changes.filter((c) => c.change_type === 'bout_added').length, 1, 'and the bout is a fact too');

  // the promoter holds NO fighter_identity lane, and that is now irrelevant: facts are judged on evidence
  const lane = await one(`select public.boxing_lane_rights_state(
    (select id from public.boxing_sources where source_key = 'promoter_matchroom'), 'fighter_identity') s`);
  assert.equal(lane.s, 'not_declared', 'no identity rights lane exists, and the fact still landed');

  // provenance survives on every created person
  const prov = await q(`select f.display_name, o.source_url, o.observed_at, o.parser_version, s.source_key
    from public.boxing_fighters f
    join public.boxing_fighter_identities fi on fi.fighter_id = f.id
    join public.boxing_sources s on s.id = fi.source_id
    left join public.boxing_source_observations o on o.id = (fi.evidence ->> 'observation_id')::uuid
    where f.display_name in ('Wendell Okoro 1', 'Ivo Marchetti 1')`);
  assert.equal(prov.length, 2);
  assert.ok(prov.every((r) => r.source_key === 'promoter_matchroom' && r.observed_at), JSON.stringify(prov));
});

test('a fighter named in credible sourced news, tied to a specific event, is created or reconciled', async () => {
  // a news source: no schedule lane, no identity lane, nothing but an approved access mode and real evidence
  const news = await testSource(db.client, 'news_wire_test', { source_kind: 'media' });
  const before = await fighters();

  const doc = {
    source_key: 'news_wire_test', namespace: 'newswire', external_id: 'NW-1', name: 'Reported Card',
    event_date: day(3), status: 'scheduled', source_url: 'https://example-wire.test/report',
    venue: { name: 'Reported Arena', city: 'Leeds', country_code: 'GB' },
    bouts: [{ external_id: 'NW-1-b1', bout_order: 1, scheduled_rounds: 10,
      fighter_a: { external_id: 'nw-a', display_name: 'Newly Reported Fighter' },
      fighter_b: { external_id: 'nw-b', display_name: 'Wendell Okoro 1' } }],
  };
  const applied = await applyCardDocument(store, doc, { now: new Date().toISOString() });
  assert.equal(applied.status, 'applied');
  assert.ok(await fighters() > before, 'the newly reported fighter is created');
  assert.ok(news.id);

  // the already-known boxer is reconciled to the same person, not duplicated
  const dupes = await one(`select count(*)::int c from public.boxing_fighters where display_name = 'Wendell Okoro 1'`);
  assert.equal(dupes.c, 1, 'the boxer both sources report is one person');
});

// ---------------------------------------------------------------- the evidence gate itself

test('the evidence gate weighs traceability, event association, name quality, collision and corroboration', async () => {
  const obs = await one(`select id from public.boxing_source_observations where entity_type = 'fighter_identity' limit 1`);

  // no observation at all: nothing to trace back to
  const bare = await evidence({ display_name: 'Someone Unsourced' });
  assert.equal(bare.sufficient, false);
  assert.equal(bare.reason, 'no_traceable_source_evidence');

  // a placeholder is refused before anything else is considered
  for (const n of ['TBC', 'TBD', 'To Be Announced', 'Opponent', 'T.B.C.', '']) {
    const r = await evidence({ display_name: n, observation_id: obs.id, external_id: 'x' });
    assert.equal(r.sufficient, false, n);
    assert.equal(r.reason, 'placeholder_is_not_a_person', n);
    assert.equal(r.signals.name.placeholder, true, n);
  }

  // a one-word fragment with no id is not a name
  const frag = await evidence({ display_name: 'Solo', observation_id: obs.id });
  assert.equal(frag.sufficient, false);
  assert.equal(frag.reason, 'name_evidence_insufficient');

  // a name that already belongs to somebody canonical is an ambiguous collision, not a second person
  const clash = await evidence({ display_name: 'Wendell Okoro 1', observation_id: obs.id, external_id: 'other-source-id' });
  assert.equal(clash.sufficient, false);
  assert.equal(clash.reason, 'name_collision_requires_review');
  assert.ok(clash.signals.collisions >= 1);

  // a well-formed new name, traceable and tied to an event, is sufficient
  const good = await evidence({ display_name: 'Brand New Contender', observation_id: obs.id, external_id: 'card-id-1' });
  assert.equal(good.sufficient, true, JSON.stringify(good));
  assert.equal(good.signals.traceable, true);
  assert.equal(good.signals.event_associated, true);
  assert.equal(good.signals.source_linked, true, 'and the stronger per-fact link is reported when present');
  assert.ok(good.signals.source_url.startsWith('https://'), 'the receipt carries the link we can return to');
  assert.ok(good.signals.observed_at, 'and the observation timestamp');
});

test('the SQL placeholder vocabulary and the parser agree, name for name', async () => {
  // two implementations of one rule drift silently; this runs a single vocabulary through both
  const vocabulary = ['TBD', 'TBA', 'TBC', 'tbc', 'T.B.C.', 'To Be Announced', 'To Be Confirmed', 'To Be Determined',
    'Opponent TBC', 'Opponent TBD', 'TBC Opponent', 'Opponent', '  ', '',
    'Harley Burrows', 'Tbarek Ali', 'Atba Mensah', "Cory O'Regan", 'Jean-Pierre Mbeki', 'Julio César Chávez Jr.'];
  for (const n of vocabulary) {
    const sql = (await one('select public.boxing_identity_name_quality($1) r', [n])).r;
    assert.equal(sql.placeholder, isPlaceholderName(n), `${JSON.stringify(n)}: SQL says ${sql.placeholder}, parser says ${isPlaceholderName(n)}`);
  }
});

test('a bare or ambiguous name cannot become a person: it goes to review, with the reason recorded', async () => {
  const before = await fighters();
  const doc = card({ bouts: [{ external_id: 'bare-1', bout_order: 1,
    fighter_a: { display_name: 'TBC' }, fighter_b: { display_name: 'Solo' } }] });
  const applied = await applyCardDocument(store, doc, { now: new Date().toISOString() });
  assert.equal(await fighters(), before, 'neither corner is minted');
  assert.equal(applied.unresolved?.length, 2, JSON.stringify(applied.unresolved));
  const reasons = applied.unresolved.map((u) => u.reason).sort();
  assert.deepEqual(reasons, ['name_evidence_insufficient', 'placeholder_is_not_a_person']);
  assert.ok(applied.unresolved.every((u) => u.review_item_id), 'and both are queued for a human, not dropped');
});

test('a conflicting identity goes to review rather than creating a second person', async () => {
  const before = await fighters();
  // a different source reports a name that already belongs to somebody canonical
  const wire = await testSource(db.client, 'conflict_wire_test', { source_kind: 'media' });
  assert.ok(wire.id);
  const doc = {
    source_key: 'conflict_wire_test', namespace: 'conflictwire', external_id: 'CW-1', name: 'Conflicting Report',
    event_date: day(4), status: 'scheduled', source_url: 'https://example-wire.test/conflict',
    venue: { name: 'Conflict Hall', city: 'Hull', country_code: 'GB' },
    bouts: [{ external_id: 'CW-1-b1', bout_order: 1,
      fighter_a: { external_id: 'cw-a', display_name: 'Ivo Marchetti 1' },
      fighter_b: { external_id: 'cw-b', display_name: 'Another Fresh Name' } }],
  };
  const applied = await applyCardDocument(store, doc, { now: new Date().toISOString() });
  const after = await fighters();
  assert.equal((await one(`select count(*)::int c from public.boxing_fighters where display_name = 'Ivo Marchetti 1'`)).c, 1,
    'the contested name still names exactly one person');
  assert.ok(after <= before + 1, 'at most the genuinely new corner was created');
  assert.equal(applied.status, 'applied');
});

// ---------------------------------------------------------------- the content side

test('a source that may not store profile content creates a name and nothing else', async () => {
  // the promoters' fighter_attributes lane is not_permitted (0046): the person is a fact, the profile is content
  assert.equal((await one(`select public.boxing_attributes_permitted(
    (select id from public.boxing_sources where source_key = 'promoter_matchroom')) p`)).p, false);

  const doc = card({ bouts: [{ external_id: 'profile-1', bout_order: 1,
    fighter_a: { external_id: 'prof-a', display_name: 'Profile Test Boxer',
      dob: '1995-03-04', nationality: ['GB'], hometown: 'Sheffield', stance: 'orthodox', height_cm: 180, reach_cm: 183, sex: 'male' },
    fighter_b: { external_id: 'prof-b', display_name: 'Profile Test Opponent' } }] });
  await applyCardDocument(store, doc, { now: new Date().toISOString() });

  const f = await one(`select display_name, dob, nationality, hometown from public.boxing_fighters where display_name = 'Profile Test Boxer'`);
  assert.ok(f, 'the person was recorded');
  for (const [k, v] of Object.entries(f)) {
    if (k === 'display_name') continue;
    assert.equal(v, null, `${k} is profile content and must not be stored from a closed lane`);
  }
  const claims = await q(`select attribute from public.boxing_fighter_attribute_claims c
    join public.boxing_fighters x on x.id = c.fighter_id where x.display_name = 'Profile Test Boxer'`);
  assert.deepEqual(claims, [], 'and no attribute claim was recorded either');
});

test('an open attribute lane still fills the profile, so the gate is the lane and not an accident', async () => {
  await setSourceLane(db.client, 'promoter_matchroom', 'fighter_attributes', 'covered_by_rights_review');
  const doc = card({ bouts: [{ external_id: 'profile-2', bout_order: 1,
    fighter_a: { external_id: 'prof-c', display_name: 'Open Lane Boxer', hometown: 'Leeds', nationality: ['GB'], dob: '1993-07-02' },
    fighter_b: { external_id: 'prof-d', display_name: 'Open Lane Opponent' } }] });
  await applyCardDocument(store, doc, { now: new Date().toISOString() });
  const f = await one(`select hometown, nationality from public.boxing_fighters where display_name = 'Open Lane Boxer'`);
  assert.equal(f.hometown, 'Leeds', 'the profile fields the card contract carries are now stored');
  assert.equal(f.nationality, 'GB');
  const claims = await q(`select attribute from public.boxing_fighter_attribute_claims c
    join public.boxing_fighters x on x.id = c.fighter_id where x.display_name = 'Open Lane Boxer' order by attribute`);
  assert.ok(claims.length >= 2, JSON.stringify(claims));
  await setSourceLane(db.client, 'promoter_matchroom', 'fighter_attributes', 'not_permitted');
});

test('no source gained permission to ingest expressive or licensed content', async () => {
  // the content lanes are untouched by this migration and still refuse at write time
  for (const key of ['promoter_pbc', 'promoter_matchroom']) {
    const lanes = await q(`select lane, rights_scope from public.boxing_source_capabilities_current c
      join public.boxing_sources s on s.id = c.source_id
      where s.source_key = $1 and c.lane in ('photos','video','article_text','fighter_attributes','results','judges','referees','scorecard_totals')`, [key]);
    assert.equal(lanes.length, 8, key);
    assert.ok(lanes.every((l) => l.rights_scope === 'not_permitted'), `${key}: ${JSON.stringify(lanes)}`);
  }

  // and the 0045 write gate still refuses a result from a promoter, which is the same enforcement path
  const bout = await one(`select id from public.boxing_bouts limit 1`);
  const winner = await one(`select fighter_id from public.boxing_bout_participants where bout_id = $1 and side = 'a'`, [bout.id]);
  await expectPgError(() => q(`insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, result_state, source_url, revision)
    values ($1, (select id from public.boxing_sources where source_key = 'promoter_matchroom'), 'win', $2, 'KO', 'official', 'https://www.matchroomboxing.com/x/', 1)`,
  [bout.id, winner.fighter_id]), { code: 'BX140', match: /lane_not_rights_approved: results/ });
});

// ---------------------------------------------------------------- protections that must survive the policy change

test('a dry run still writes nothing, and the half-apply guard still holds', async () => {
  const before = await fighters();
  const r = await collectPromoterCards(store, {
    sources: ['promoter_matchroom'], dryRun: true, now: '2026-09-18T20:00:00Z', sleepImpl: async () => {},
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }),
  });
  assert.equal(await fighters(), before, 'a dry run creates no fighter');
  assert.equal(r.summary.actual_writes, 0);

  const ready = (await one('select public.boxing_promoter_lane_ready() r')).r;
  assert.equal(ready.ready, true, JSON.stringify(ready));
  assert.equal(ready.schema_half.identity_evidence_gate, true, 'the evidence gate is part of the schema half');
  assert.equal(ready.data_half.promoter_pbc.may_store_profile_content, false, 'and profile content stays closed');

  // withdraw a schedule lane: the data half is incomplete and an apply is refused before any fetch
  await setSourceLane(db.client, 'promoter_pbc', 'bouts', 'review_scope_gap');
  const half = (await one('select public.boxing_promoter_lane_ready() r')).r;
  assert.equal(half.ready, false);
  assert.equal(half.schema_half_complete, true, 'the schema half alone is not enough — that is the trap');
  const apply = await collectPromoterCards(store, { sources: ['promoter_pbc'], dryRun: false, now: '2026-09-18T20:00:00Z',
    sleepImpl: async () => {}, fetchImpl: async () => { throw new Error('must not be fetched'); } });
  assert.match(apply.error, /data half is incomplete/);
  assert.equal(apply.summary.actual_writes, 0);
  await setSourceLane(db.client, 'promoter_pbc', 'bouts', 'covered_by_rights_review');
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

  const src = await one(`select id from public.boxing_sources where source_key = 'promoter_pbc'`);
  const venue = await one(`insert into public.boxing_venues (name, city, country_code) values ('Resurrection Arena', 'Manchester', 'GB') returning id`);
  await q(`insert into public.boxing_events (source_id, external_event_id, name, event_date, status, source_url, venue_id)
    values ($1, 'resurrection', 'Some Other Card', $2, 'scheduled', 'https://www.premierboxingchampions.com/x', $3)`,
  [src.id, candidate.probable_date, venue.id]);

  const again = await store.recordEventCandidate(candidate);
  assert.equal(again.state, 'dismissed', 'a dismissal is a human decision; rediscovery does not undo it');
  const row = await one(`select state, canonical_event_id, dismissed_reason from public.boxing_event_discovery_candidates where id = $1`, [first.id]);
  assert.equal(row.canonical_event_id, null, 'and it holds no canonical event, which the table check requires');
  assert.equal(row.dismissed_reason, 'not a professional card');
});
