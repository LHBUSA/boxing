// Idempotency and partial cards.
//
// Two questions the natural-run gate turns on:
//   1. Does collecting the same unchanged card twice create a second copy of anything? (It must not.)
//   2. When one slot on a card is unusable, does the rest of the card survive? (It must — and the unusable slot must
//      not be smuggled in as a fighter.)
//
// Row counts are printed at each stage so the receipt in the run log shows the answer, not just the assertion.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';
import { parsePbcEvent } from '../../shared/adapters/promoters/pbc.mjs';
import { isPlaceholderName } from '../../shared/adapters/promoters/names.mjs';
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
const fetchFixture = async (url) => (FIXTURE[url]
  ? { ok: true, status: 200, text: async () => read(FIXTURE[url]) }
  : { ok: false, status: 404, text: async () => '' });
const NOW = '2026-09-18T20:00:00Z';
const opts = (over = {}) => ({ fetchImpl: fetchFixture, now: NOW, windowDays: 45, maxEvents: 8, sleepImpl: async () => {}, dryRun: false, ...over });

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const counts = async () => one(`select
  (select count(*)::int from public.boxing_events) events,
  (select count(*)::int from public.boxing_bouts) bouts,
  (select count(*)::int from public.boxing_fighters) fighters,
  (select count(*)::int from public.boxing_bout_participants) participants,
  (select count(*)::int from public.boxing_source_observations) observations,
  (select count(*)::int from public.boxing_event_discovery_candidates) candidates,
  (select count(*)::int from public.boxing_venues) venues,
  (select count(*)::int from public.boxing_bout_titles) bout_titles`);

before(async () => {
  db = await freshDatabase('promoter_idempotency');
  store = pgStore(db.client);
});
after(async () => { await db?.close(); });

test('the same valid cards collected twice create nothing a second time', async () => {
  const before = await counts();
  const first = await collectPromoterCards(store, opts());
  const afterFirst = await counts();
  const second = await collectPromoterCards(store, opts());
  const afterSecond = await counts();

  console.log('  before run 1 :', JSON.stringify(before));
  console.log('  after  run 1 :', JSON.stringify(afterFirst));
  console.log('  after  run 2 :', JSON.stringify(afterSecond));

  assert.deepEqual(before, { events: 0, bouts: 0, fighters: 0, participants: 0, observations: 0, candidates: 0, venues: 0, bout_titles: 0 },
    'the database starts empty');
  assert.ok(afterFirst.events > 0 && afterFirst.bouts > 0 && afterFirst.fighters > 0, 'the first run actually wrote the cards');
  assert.deepEqual(afterSecond, afterFirst, 'the second run created nothing: not an event, bout, fighter, participant, observation, candidate, venue or title');

  // and the plan itself says so, rather than the counts merely happening to agree
  for (const e of second.sources.flatMap((s) => s.events).filter((e) => e.plan)) {
    assert.equal(e.plan.event.action, 'would_match', `${e.event_name} should match its own source event id on a rerun`);
    assert.ok(e.plan.fighters.every((f) => f.outcome !== 'created'),
      `${e.event_name}: no fighter should be created a second time — ${JSON.stringify(e.plan.fighters.map((f) => [f.name, f.outcome]))}`);
  }
  assert.equal(second.summary.actual_writes, 0, 'a rerun over unchanged cards writes nothing');
  assert.ok(second.summary.duplicates_suppressed.events >= first.summary.cards_accepted);
  assert.equal((await one(`select coalesce(jsonb_array_length(public.boxing_possible_duplicate_bouts()), 0) c`)).c, 0,
    'and the database agrees there are no duplicate bouts');
});

// A card built to be awkward on purpose: one good bout, one unsigned slot, one pairing the page never states properly,
// one exact repeat of the good bout, and no published start time at all.
function mixedCard() {
  const row = (idx, html) => `<div class="fight-row row ${idx === 0 ? 'field_bouts-0' : `field_co_billed_bouts-${idx - 1}`}">
    <div class="fight-headline"><h2>${html.headline}</h2></div><p>${html.line}</p><!--END: Fight Row-->`;
  return [
    '<!doctype html><html><head><title>Fight Night</title>',
    '<script type="application/ld+json">',
    JSON.stringify([{ '@context': 'http://schema.org', '@type': 'SportsEvent', name: 'Mixed Card',
      url: 'https://www.premierboxingchampions.com/mixed', startDate: '09/25/2026',
      location: { '@type': 'Place', name: 'Test Arena, Las Vegas, Nevada' } }]),
    '</script></head><body>',
    row(0, { headline: 'Real Fighter One vs Real Fighter Two', line: 'in a 12-round welterweight main event.' }),
    row(1, { headline: 'Harley Burrows vs TBC', line: 'in a 10-round bout.' }),
    row(2, { headline: 'A card position with no pairing stated', line: 'more to be announced.' }),
    row(3, { headline: 'Real Fighter One vs Real Fighter Two', line: 'in a 12-round welterweight main event.' }),
    '</body></html>',
  ].join('\n');
}

test('a mixed card keeps every valid bout and refuses only the slots that are unusable', async () => {
  const { observation: o, problems } = parsePbcEvent(mixedCard(), { url: 'https://www.premierboxingchampions.com/mixed', capturedAt: NOW });

  // the event itself survives: a bad slot is not a reason to lose a card
  assert.equal(o.scheduled_date, '2026-09-25');
  assert.equal(o.venue.city, 'Las Vegas');
  // the page publishes a date with no time, so no instant is invented
  assert.equal(o.scheduled_start_at, null, 'a date-only card gets no start time');

  // the unsigned slot and the unstated pairing are refused by name; the duplicate is kept by the parser and
  // deduplicated downstream by its source bout id, which is identical for an identical pairing at the same position
  assert.ok(problems.some((p) => /opponent not announced \(TBC\)/.test(p)));
  assert.ok(problems.some((p) => /pairing not stated as "A vs B"/.test(p)));
  assert.ok(!o.bouts.some((b) => isPlaceholderName(b.fighter_a.name) || isPlaceholderName(b.fighter_b.name)),
    'no placeholder reached the observation');
  assert.ok(o.bouts.some((b) => b.fighter_a.name === 'Real Fighter One'), 'the valid bout is kept');

  // through the whole collector: the card is written, the good bouts land, the bad slots do not
  const before = await counts();
  const receipt = await collectPromoterCards(store, opts({
    sources: ['promoter_pbc'],
    fetchImpl: async (u) => (u === PBC.scheduleUrl
      ? { ok: true, status: 200, text: async () => `<script type="application/ld+json">${JSON.stringify([{ '@context': 'http://schema.org', '@type': 'SportsEvent', name: 'Mixed Card', url: 'https://www.premierboxingchampions.com/mixed', startDate: '09/25/2026', location: { '@type': 'Place', name: 'Test Arena, Las Vegas, Nevada' } }])}</script>` }
      : u === 'https://www.premierboxingchampions.com/mixed'
        ? { ok: true, status: 200, text: async () => mixedCard() }
        : { ok: false, status: 404, text: async () => '' }),
  }));
  const after = await counts();
  console.log('  mixed card, before:', JSON.stringify(before));
  console.log('  mixed card, after :', JSON.stringify(after));

  assert.equal(receipt.summary.cards_accepted, 1, 'the card is accepted, not rejected');
  assert.equal(after.events, before.events + 1, 'exactly one new event');
  assert.equal(receipt.summary.placeholder_slots_refused, 1);
  assert.ok(receipt.summary.bouts_refused >= 2, 'the unsigned slot and the unstated pairing are both refused');

  // no placeholder became a fighter, here or anywhere
  const bad = await q(`select display_name from public.boxing_fighters`);
  assert.deepEqual(bad.filter((f) => isPlaceholderName(f.display_name)), [], 'no placeholder fighter exists');
  // the repeated pairing is one bout, not two
  const dupes = await q(`select count(*)::int c from public.boxing_bouts b
    join public.boxing_events e on e.id = b.event_id where e.name = 'Mixed Card'`);
  assert.equal(dupes[0].c, 1, 'the repeated pairing was written once');
  assert.equal((await one(`select coalesce(jsonb_array_length(public.boxing_possible_duplicate_bouts()), 0) c`)).c, 0);
});

test('a card that violates the contract is rejected whole, and only that card', async () => {
  // a page whose event has no https source_url cannot be a card at all; the run must survive it
  const before = await counts();
  const receipt = await collectPromoterCards(store, opts({
    sources: ['promoter_pbc'],
    fetchImpl: async (u) => (u === PBC.scheduleUrl
      ? fetchFixture(u)
      : u === PBC_EVENT
        ? { ok: true, status: 200, text: async () => read('pbc-event.html') }
        : u === 'https://www.premierboxingchampions.com/fight-night-october-17-2026'
          // a card whose bouts carry no usable pairing at all: nothing to write, and the event is skipped
          ? { ok: true, status: 200, text: async () => read('pbc-event-october.html').replace(/<h2>[\s\S]*?<\/h2>/g, '<h2>nothing stated</h2>') }
          : { ok: false, status: 404, text: async () => '' }),
  }));
  const after = await counts();
  assert.ok(!receipt.error, 'the run completed');
  assert.equal(receipt.summary.cards_accepted, 2, 'both cards are still processed');
  const october = receipt.sources[0].events.find((e) => e.date === '2026-10-17');
  assert.equal(october.announced_bouts, 0, 'an October card with no stated pairing announces no bouts');
  assert.ok(october.parser_problems.every((p) => /pairing not stated/.test(p) || /start time/.test(p)));
  assert.equal(after.bouts, before.bouts, 'and it writes no bouts');
});
