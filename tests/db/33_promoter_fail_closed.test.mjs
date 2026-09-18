// Every way the promoter collector can fail, and the proof that each one writes nothing.
//
// The collector is allowed to be wrong about a card. It is not allowed to be wrong about whether it wrote. Each test
// here breaks one thing — the source registry, the rights lane, the page, the parser, the card itself — and asserts the
// row counts are byte-identical before and after. Where a failure SHOULD still let the rest of the run through, that is
// asserted too: one broken card must never cost us tomorrow's card.
//
// The tests run in order against one database and every refusal case comes BEFORE the positive control, so "nothing was
// written" is proved against a genuinely empty canonical state rather than against rows an earlier test already made.
// boxing_source_observations is append-only by design (BX001), so this file never truncates: it compares counts.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { freshDatabase, setSourceLane, expectPgError } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';
import { validateUpcomingCard } from '../../shared/adapters/promoters/contract.mjs';
import { PBC } from '../../shared/adapters/promoters/pbc.mjs';
import { MATCHROOM } from '../../shared/adapters/promoters/matchroom.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/promoters');
const read = (n) => readFileSync(join(dir, n), 'utf8');
const PBC_EVENT = 'https://www.premierboxingchampions.com/fight-night-september-19-2026';
const FIXTURE = {
  [PBC.scheduleUrl]: 'pbc-schedule.html',
  [PBC_EVENT]: 'pbc-event.html',
  'https://www.premierboxingchampions.com/fight-night-october-17-2026': 'pbc-event-october.html',
  [MATCHROOM.eventsUrl]: 'matchroom-events.html',
  'https://www.matchroomboxing.com/events/hedges-vs-brown/': 'matchroom-event.html',
};
const ok = (body) => ({ ok: true, status: 200, text: async () => body });
const notFound = { ok: false, status: 404, text: async () => '' };
const fetchFixture = async (url) => (FIXTURE[url] ? ok(read(FIXTURE[url])) : notFound);

const NOW = '2026-09-18T20:00:00Z';
const opts = (over = {}) => ({ fetchImpl: fetchFixture, now: NOW, windowDays: 45, maxEvents: 8, sleepImpl: async () => {}, dryRun: false, sources: ['promoter_pbc'], ...over });

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];

// everything a promoter run is capable of touching
const counts = async () => one(`select
  (select count(*)::int from public.boxing_events) events,
  (select count(*)::int from public.boxing_bouts) bouts,
  (select count(*)::int from public.boxing_fighters) fighters,
  (select count(*)::int from public.boxing_bout_participants) participants,
  (select count(*)::int from public.boxing_source_observations) observations,
  (select count(*)::int from public.boxing_event_discovery_candidates) candidates,
  (select count(*)::int from public.boxing_venues) venues,
  (select count(*)::int from public.boxing_bout_titles) bout_titles,
  (select count(*)::int from public.boxing_news_events) news`);

// run something and prove not one row moved
async function writesNothing(label, run) {
  const before = await counts();
  const result = await run();
  assert.deepEqual(await counts(), before, `${label}: wrote to the database`);
  return result;
}

const pbcSource = async () => one(`select id, enabled, access_mode, rights_state from public.boxing_sources where source_key = 'promoter_pbc'`);
const setSource = async (id, patch) => q(`update public.boxing_sources set enabled = coalesce($2, enabled),
  access_mode = coalesce($3, access_mode), rights_state = coalesce($4, rights_state) where id = $1`,
[id, patch.enabled ?? null, patch.access_mode ?? null, patch.rights_state ?? null]);

before(async () => {
  db = await freshDatabase('promoter_fail_closed');
  store = pgStore(db.client);
});
after(async () => { await db?.close(); });

// ---------------------------------------------------------------- refusals, against an empty canonical state

test('an unknown source key is refused before a single fetch, let alone a write', async () => {
  const receipt = await writesNothing('unknown source', () => collectPromoterCards(store, opts({ sources: ['promoter_does_not_exist'] })));
  assert.equal(receipt.sources[0].error, 'no adapter');
  assert.equal(receipt.summary.cards_discovered, 0);
  assert.equal(receipt.summary.actual_writes, 0);
});

test('a dry run writes nothing and still plans the writes it would make', async () => {
  const r = await writesNothing('dry run', () => collectPromoterCards(store, opts({ dryRun: true, sources: ['promoter_pbc', 'promoter_matchroom'] })));
  assert.equal(r.dry_run, true);
  assert.equal(r.summary.actual_writes, 0, 'a dry run reports zero actual writes by construction');
  assert.ok(r.summary.planned_writes > 0, 'and still plans what it would have written');
});

test('a source the registry does not permit is not even fetched, in dry run or apply', async () => {
  const src = await pbcSource();
  for (const [label, patch, expect] of [
    ['disabled', { enabled: false }, /disabled in the source registry/],
    ['disabled and blocked', { enabled: false, access_mode: 'blocked' }, /disabled in the source registry/],
  ]) {
    await setSource(src.id, patch);
    for (const dryRun of [true, false]) {
      let fetched = 0;
      const r = await writesNothing(`${label} (dryRun=${dryRun})`, () => collectPromoterCards(store,
        opts({ dryRun, fetchImpl: async (u) => { fetched++; return fetchFixture(u); } })).catch((e) => ({ threw: e.message })));
      assert.ok(!r.threw, `${label}: refusal must be reported, not thrown — ${r.threw}`);
      assert.equal(fetched, 0, `${label}: a source we may not collect must not be requested at all`);
      assert.match(r.sources[0].error, expect);
      assert.equal(r.summary.actual_writes, 0);
      assert.equal(r.summary.cards_discovered, 0);
    }
    await setSource(src.id, { enabled: src.enabled, access_mode: src.access_mode, rights_state: src.rights_state });
  }
  // An unapproved review or a non-ingest access_mode cannot coexist with enabled=true: the database itself refuses the
  // combination (boxing_sources_enable_requires_review). That is the strongest possible guarantee for those two states,
  // and it means the collector's own checks on them can only be proved against a stubbed registry row.
  for (const [row, expect] of [
    [{ enabled: true, access_mode: 'approved_ingest', rights_state: 'review_required' }, /rights_state is review_required/],
    [{ enabled: true, access_mode: 'blocked', rights_state: 'approved' }, /access_mode is blocked/],
    [{ enabled: true, access_mode: 'identity_only', rights_state: 'approved' }, /access_mode is identity_only/],
  ]) {
    const stub = { ...store, source: async () => row };
    const r = await writesNothing(`registry says ${JSON.stringify(row)}`, () => collectPromoterCards(stub, opts()));
    assert.match(r.sources[0].error, expect);
  }

  // a registry lookup that fails is a refusal, never permission
  const blind = { ...store, source: async () => { throw new Error('connection reset'); } };
  const r = await writesNothing('registry lookup failure', () => collectPromoterCards(blind, opts()));
  assert.match(r.sources[0].error, /registry lookup failed/);
  // and a source that is registered nowhere is refused too
  const empty = { ...store, source: async () => null };
  assert.match((await writesNothing('unregistered', () => collectPromoterCards(empty, opts()))).sources[0].error, /not registered/);
});

test('the schedule lane must be covered, every other lane must stay refused, and a withdrawn lane stops the write', async () => {
  const src = await pbcSource();
  const lanes = await q(`select lane, rights_scope from public.boxing_source_capabilities_current where source_id = $1`, [src.id]);
  const covered = lanes.filter((l) => l.rights_scope === 'covered_by_rights_review').map((l) => l.lane);
  for (const need of ['events', 'upcoming_cards', 'bouts', 'venues', 'promoters', 'broadcasters', 'titles_at_stake']) {
    assert.ok(covered.includes(need), `${need} must be covered for the collector to run: ${JSON.stringify(covered.sort())}`);
  }
  // schedule permission is not permission for anything else
  for (const refused of ['results', 'photos', 'video', 'article_text', 'judges', 'referees', 'scorecard_totals']) {
    const row = lanes.find((l) => l.lane === refused);
    assert.ok(row, `${refused} must be explicitly recorded, not merely absent`);
    assert.equal(row.rights_scope, 'not_permitted', `${refused} must stay refused`);
  }

  // Withdraw the bouts lane. A capability row is current until another row SUPERSEDES it, so the withdrawal has to
  // point at the row it replaces — inserting without supersedes_id would leave both rows current and withdraw nothing.
  const priorBouts = await one(`select id from public.boxing_source_capabilities_current where source_id = $1 and lane = 'bouts'`, [src.id]);
  const withdrawn = await one(`insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, coverage_basis,
    acquisition_method, cadence, completeness, confidence, notes, evidence, recorded_by, supersedes_id)
    values ($1, 'bouts', 'provided', 'not_permitted', 'none', 'html', 'daily', 'partial', 'high', 'test: lane withdrawn', '{}'::jsonb, 'test', $2)
    returning id`, [src.id, priorBouts.id]);
  assert.equal((await q(`select id from public.boxing_source_capabilities_current where source_id = $1 and lane = 'bouts'`, [src.id])).length, 1,
    'exactly one capability row may be current for a lane, or the gate has nothing definite to read');
  // Two independent defences, and both must hold.
  //
  // First: the readiness check sees a schedule lane that is no longer covered and refuses the apply before a single
  // fetch. That is the half-apply guard doing its job — an incomplete data half is exactly what it exists to catch.
  const receipt = await writesNothing('withdrawn bouts lane', () => collectPromoterCards(store, opts()).catch((e) => ({ threw: e.message })));
  assert.ok(!receipt.threw, `a lane refusal must not abort the run: ${receipt.threw}`);
  assert.match(receipt.error, /data half is incomplete for promoter_pbc/);
  assert.equal(receipt.summary.actual_writes, 0);
  assert.equal(receipt.lane_ready.data_half.promoter_pbc.schedule_lanes_covered, 6, 'six of seven schedule lanes remain');

  // Second, and independently: even if a run somehow got past that, the BX140 write-time trigger refuses the insert
  // itself. Proved directly against the table, so it does not depend on the collector reaching it.
  const evt = await one(`insert into public.boxing_events (source_id, external_event_id, name, event_date, status, source_url)
    values ($1, 'lane-gate-probe', 'Lane Gate Probe', current_date + 5, 'scheduled', 'https://www.premierboxingchampions.com/x') returning id`, [src.id]);
  await expectPgError(() => q(`insert into public.boxing_bouts (event_id, source_id, external_bout_id, scheduled_rounds, status)
    values ($1, $2, 'lane-gate-bout', 10, 'scheduled')`, [evt.id, src.id]),
  { code: 'BX140', match: /lane_not_rights_approved: bouts/ });

  // restore the lane by superseding the withdrawal
  await q(`insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, coverage_basis,
    acquisition_method, cadence, completeness, confidence, notes, evidence, recorded_by, supersedes_id)
    values ($1, 'bouts', 'provided', 'covered_by_rights_review', 'source_index_documented', 'html', 'daily', 'partial', 'high', 'test: lane restored', '{}'::jsonb, 'test', $2)`,
  [src.id, withdrawn.id]);
});

test('a lookup failure inside the store never leaves a half-written card behind', async () => {
  // A failed dedupe lookup must not read as "we have never seen this card" — that is how a duplicate event is written.
  // A discovery candidate IS still recorded, and that is deliberate: a candidate says "we may be missing this card" and
  // needs the source to be registered, not to hold any writing lane. Nothing canonical may appear.
  const canonical = async () => one(`select
    (select count(*)::int from public.boxing_events) events,
    (select count(*)::int from public.boxing_bouts) bouts,
    (select count(*)::int from public.boxing_fighters) fighters,
    (select count(*)::int from public.boxing_bout_participants) participants,
    (select count(*)::int from public.boxing_venues) venues`);
  for (const method of ['sourceEventIds', 'eventCrossSourceCandidates']) {
    const broken = { ...store, [method]: async () => { throw new Error('connection reset'); } };
    const before = await canonical();
    const r = await collectPromoterCards(broken, opts()).catch((e) => ({ threw: e.message }));
    assert.deepEqual(await canonical(), before, `${method}: a failed read wrote canonical data`);
    assert.ok(!r.threw, `${method}: the run must survive — ${r.threw}`);
    assert.equal(r.summary.actual_writes, 0);
    assert.equal(r.summary.cards_rejected, 2, `${method}: both cards are abandoned rather than written blind`);
    assert.ok(r.sources[0].events.every((e) => /lookup failed/.test(e.error)), JSON.stringify(r.sources[0].events));
  }
});

test('an unparseable page is a skipped card, not a partial write', async () => {
  await writesNothing('unparseable page', () => collectPromoterCards(store, opts({
    fetchImpl: async (u) => (u === PBC_EVENT ? ok('<html><body><p>nothing structured here</p></body></html>') : fetchFixture(u)),
    sources: ['promoter_pbc'], maxEvents: 1 })));
});

test('the card contract refuses a placeholder corner and a missing corner, and accepts two named fighters', () => {
  const card = {
    source_key: 'promoter_pbc', source_event_id: 'x', event_name: 'X', scheduled_date: '2026-09-19',
    source_url: 'https://www.premierboxingchampions.com/x', captured_at: NOW, status: 'scheduled',
    bouts: [{ source_bout_id: 'b1', fighter_a: { name: 'Real Fighter' }, fighter_b: { name: 'TBC' } }],
  };
  assert.ok(validateUpcomingCard(card).some((p) => /unannounced opponent is not a fighter/.test(p)));
  card.bouts[0].fighter_b.name = '';
  assert.ok(validateUpcomingCard(card).some((p) => /both fighters must be named/.test(p)));
  card.bouts[0].fighter_b.name = 'Real Opponent';
  assert.deepEqual(validateUpcomingCard(card), [], 'two named corners is a valid bout');
  // and the event-level rules still bite
  assert.ok(validateUpcomingCard({ ...card, source_url: 'http://insecure' }).some((p) => /source_url must be https/.test(p)));
  assert.ok(validateUpcomingCard({ ...card, scheduled_date: '19/09/2026' }).some((p) => /YYYY-MM-DD/.test(p)));
});

// ---------------------------------------------------------------- the positive control, and containment around it

test('with the registry approved and the lanes covered, the same run does write', async () => {
  const before = await counts();
  const r = await collectPromoterCards(store, opts());
  assert.ok((await counts()).bouts > before.bouts, 'an approved source in a covered lane collects');
  assert.ok(r.summary.actual_writes > 0);
  assert.equal(r.summary.cards_accepted, 2, 'both PBC cards');
});

test('one broken card never costs us the others', async () => {
  // the listing itself is down: the source fails, nothing is written
  const listDown = await writesNothing('list fetch 500', () => collectPromoterCards(store, opts({
    fetchImpl: async (u) => (u === PBC.scheduleUrl ? { ok: false, status: 500, text: async () => '' } : fetchFixture(u)) })));
  assert.match(listDown.sources[0].error, /list fetch 500/);
  assert.equal(listDown.summary.cards_discovered, 0);

  // one event page 404s: it is counted as unreachable and the other card still collects
  const outage = await collectPromoterCards(store, opts({
    fetchImpl: async (u) => (u === PBC_EVENT ? notFound : fetchFixture(u)) }));
  assert.equal(outage.summary.cards_unreachable, 1);
  assert.equal(outage.summary.cards_accepted, 1, 'the October card is unaffected by the September outage');

  // the socket dies mid-body: the exception is contained to that card, the run survives
  const hangup = await collectPromoterCards(store, opts({
    fetchImpl: async (u) => (u === PBC_EVENT
      ? { ok: true, status: 200, text: async () => { throw new Error('socket hang up mid-body'); } }
      : fetchFixture(u)) })).catch((e) => ({ threw: e.message }));
  assert.ok(!hangup.threw, `a dead socket must not abort the run: ${hangup.threw}`);
  assert.equal(hangup.summary.cards_rejected, 1);
  assert.equal(hangup.summary.cards_accepted, 1, 'the other card still collects');
});
