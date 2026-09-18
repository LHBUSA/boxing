// Promoter schedule-lane parsers, against fixtures captured from the real published structures.
//
// The point of these tests is that the parsers read the CARD, not the prose: a pairing comes from the card's own
// headline element, a distance is taken only when the source states one distance, a title is canonical only when the
// announcement names an organization, tier and division we model, and anything else is kept verbatim as unresolved.
// Fixtures cover two different PBC events so nothing can be hardcoded to one night's fighters.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parsePbcSchedule, parsePbcEvent, parsePbcStart, parsePbcLocation } from './pbc.mjs';
import { parseMatchroomEvents, parseMatchroomEvent, parseMatchroomDate, parseMatchroomLocation } from './matchroom.mjs';
import { parseTitleLine, roundsFromText, divisionFromText } from './titles.mjs';
import { cardFingerprint, cardDelta } from '../../promoters/collect.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../../tests/fixtures/promoters');
const fixture = (n) => readFileSync(join(dir, n), 'utf8');
const NOW = '2026-09-18T20:00:00Z';

test('PBC schedule: every announced card becomes a discovery candidate with its own venue and pairings', () => {
  const rows = parsePbcSchedule(fixture('pbc-schedule.html'));
  assert.ok(rows.length >= 2, `${rows.length} candidates`);
  const sd = rows.find((r) => r.city === 'San Diego');
  assert.equal(sd.venue, 'Pechanga Arena');
  assert.equal(sd.region, 'California');
  assert.equal(sd.probable_date, '2026-09-19');
  assert.ok(sd.announced_pairings.includes('Isaac Cruz vs Nestor Bravo'));
  // a second, different event proves the parser is not written around one card
  const other = rows.find((r) => r.city !== 'San Diego');
  assert.ok(other.probable_date > sd.probable_date, 'the later card parses too');
  assert.ok(other.announced_pairings.length >= 1);
});

test('PBC event: the announced card, its distances, its titles, and what it refuses', () => {
  const { observation: o, problems } = parsePbcEvent(fixture('pbc-event.html'), { url: 'https://www.premierboxingchampions.com/fight-night-september-19-2026', capturedAt: NOW });
  assert.equal(o.scheduled_date, '2026-09-19');
  assert.equal(o.venue.name, 'Pechanga Arena');
  assert.equal(o.venue.city, 'San Diego');
  assert.equal(o.venue.country_code, 'US');
  assert.equal(o.broadcaster, 'DAZN');
  assert.equal(o.promoter, 'Premier Boxing Champions');
  // the published broadcast start, its offset, and the instant that follows from them — never a ring walk
  assert.equal(o.published_start_local, '20:00');
  assert.equal(o.published_utc_offset, '-05:00');
  assert.equal(o.scheduled_start_at, '2026-09-20T01:00:00.000Z');
  assert.match(o.start_basis, /broadcast start/);

  assert.equal(o.bouts.length, 4);
  const [main, co] = o.bouts;
  assert.equal(main.fighter_a.name, 'Isaac Cruz');
  assert.equal(main.fighter_b.name, 'Nestor Bravo');
  assert.equal(main.card_segment, 'main_event');
  assert.equal(main.scheduled_rounds, 12);
  assert.equal(main.division, 'super_lightweight');
  assert.deepEqual(main.titles.map((t) => `${t.organization_slug}:${t.tier}:${t.weight_class_key}`), ['wbc:interim:super_lightweight']);
  assert.equal(co.card_segment, 'co_main');
  assert.deepEqual(co.titles.map((t) => `${t.organization_slug}:${t.tier}`), ['wbc:interim']);
  assert.equal(co.scheduled_rounds, null, 'the co-main states no distance, so none is invented');

  // "an eight or 10-round showdown" is two possibilities: the distance is refused, the bout still stands
  const ambiguous = o.bouts.find((b) => b.fighter_a.name === 'Daniel Blancas');
  assert.equal(ambiguous.scheduled_rounds, null);
  assert.ok(problems.some((p) => /distance announced ambiguously/.test(p)));
  assert.ok(problems.every((p) => p.length < 120), 'a refusal quotes the phrase, never the article text');
});

test('Matchroom listing: each tile keeps its own date, pairing and venue', () => {
  const tiles = parseMatchroomEvents(fixture('matchroom-events.html'));
  assert.ok(tiles.length >= 4);
  const hedges = tiles.find((t) => t.slug === 'hedges-vs-brown');
  assert.equal(hedges.day_text, '19 Sep');
  assert.equal(hedges.headline, 'Hedges vs Brown');
  assert.equal(hedges.venue.name, 'Co-op Live');
  assert.equal(hedges.venue.city, 'Manchester');
  assert.equal(hedges.venue.country_code, 'GB');
  // tiles must not borrow a neighbour's fighters
  const others = tiles.filter((t) => t.slug !== 'hedges-vs-brown');
  assert.ok(others.every((t) => t.headline !== 'Hedges vs Brown'), JSON.stringify(others.map((t) => t.headline)));
});

test('Matchroom event: the whole announced card, with the unannounced opponent refused', () => {
  const tiles = parseMatchroomEvents(fixture('matchroom-events.html'));
  const { observation: o, problems } = parseMatchroomEvent(fixture('matchroom-event.html'), {
    url: 'https://www.matchroomboxing.com/events/hedges-vs-brown/', capturedAt: NOW, venueHint: tiles.find((t) => t.slug === 'hedges-vs-brown').venue });
  assert.equal(o.scheduled_date, '2026-09-19');
  assert.equal(o.venue.name, 'Co-op Live');
  assert.equal(o.venue.city, 'Manchester');
  assert.equal(o.venue.country_code, 'GB');
  assert.equal(o.broadcaster, 'DAZN');
  assert.equal(o.scheduled_start_at, null, 'Matchroom publishes no start time on the card page, so none is invented');

  const main = o.bouts.find((b) => b.card_segment === 'main_event');
  assert.equal(main.fighter_a.name, 'John Hedges');
  assert.equal(main.fighter_b.name, 'Pat Brown');
  assert.equal(main.division, 'cruiserweight');
  // a name is a name: the record printed beside it is the promoter's, not our verified record
  assert.ok(o.bouts.every((b) => !/\d/.test(b.fighter_a.name) && !/\bW\b|\bKO\b/.test(b.fighter_b.name)), JSON.stringify(o.bouts.map((b) => b.fighter_b.name)));
  assert.equal(o.bouts.length, 8, 'eight announced pairings; the TBD slot is not one');
  assert.ok(problems.some((p) => /opponent not announced/i.test(p)));
  assert.ok(!o.bouts.some((b) => /tbd/i.test(b.fighter_b.name)));
});

test('titles: a world lane resolves, a regional or national belt stays unresolved with its exact wording', () => {
  const world = parseTitleLine('Interim WBC Super Lightweight Champion');
  assert.deepEqual(world.titles.map((t) => [t.organization_slug, t.tier, t.weight_class_key]), [['wbc', 'interim', 'super_lightweight']]);

  const uk = parseTitleLine('British, Commonwealth, WBA International & IBF Intercontinental Cruiserweight Titles');
  assert.equal(uk.titles.length, 0, 'none of these is a world title lane we model');
  assert.equal(uk.unresolved.length, 4);
  assert.ok(uk.unresolved.some((u) => u.source_native_label === 'British'));
  assert.ok(uk.unresolved.some((u) => /WBA International/.test(u.source_native_label) && /secondary/.test(u.reason)));
  assert.equal(uk.division, 'cruiserweight');

  const elim = parseTitleLine('British Super Middleweight Title Eliminator');
  assert.equal(elim.titles.length, 0);
  assert.equal(elim.eliminator, true);
  assert.ok(elim.unresolved[0].reason.includes('no title is at stake'));

  assert.equal(divisionFromText('super welterweight title'), 'super_welterweight', 'longest division label wins');
  assert.equal(roundsFromText('in a 12-round main event'), 12);
  assert.equal(roundsFromText('in an eight-round middleweight opening bout'), 8);
  assert.equal(roundsFromText('in an eight or 10-round showdown'), null, 'two possibilities is not a distance');
  assert.equal(roundsFromText('a high-stakes co-main event'), null);
});

test('dates and locations', () => {
  assert.equal(parseMatchroomDate('Saturday 19 September 2026'), '2026-09-19');
  assert.equal(parseMatchroomDate('nonsense'), null);
  assert.deepEqual(parsePbcLocation('Pechanga Arena, San Diego, California'), { name: 'Pechanga Arena', city: 'San Diego', region: 'California' });
  // a UK card on the same calendar day as a US card keeps its own date: no timezone shifts the announced day
  assert.equal(parsePbcStart('2026-09-19T20:00:00-05:00').date, '2026-09-19');
  assert.equal(parsePbcStart('2026-09-19T20:00:00-05:00').start_utc, '2026-09-20T01:00:00.000Z');
  assert.equal(parsePbcStart('nonsense').date, null);
  assert.equal(parsePbcStart('2026-09-19T20:00:00').start_utc, null, 'no offset published means no UTC instant is claimed');
  assert.deepEqual(parseMatchroomLocation('<span class="location">Co-op Live, Manchester, UK</span>'),
    { name: 'Co-op Live', city: 'Manchester', country_code: 'GB', as_stated: 'Co-op Live, Manchester, UK' });
});

test('a changed card is detected fact by fact, and the fingerprint moves with it', () => {
  const tiles = parseMatchroomEvents(fixture('matchroom-events.html'));
  const before = parseMatchroomEvent(fixture('matchroom-event.html'), { url: 'https://www.matchroomboxing.com/events/hedges-vs-brown/', capturedAt: NOW, venueHint: tiles[0].venue }).observation;
  const after = structuredClone(before);
  after.bouts[1].fighter_b.name = 'Late Replacement';          // opponent change
  after.bouts[2].scheduled_rounds = 10;                         // distance announced
  after.bouts.push({ ...before.bouts[3], source_bout_id: 'new-bout', bout_order: 10, fighter_a: { name: 'Fresh Debutant' }, fighter_b: { name: 'Opponent Two' } });
  after.bouts.splice(4, 1);                                     // a bout comes off the card

  const changes = cardDelta(before, after);
  const kinds = changes.map((c) => c.change);
  assert.ok(kinds.includes('CHANGED_OPPONENT'), JSON.stringify(changes));
  assert.ok(kinds.includes('CHANGED_ROUNDS'));
  assert.ok(kinds.includes('NEW_BOUT'));
  assert.ok(kinds.includes('REMOVED_BOUT'));
  assert.notEqual(cardFingerprint(before), cardFingerprint(after));
  assert.equal(cardFingerprint(before), cardFingerprint(structuredClone(before)), 'the same card fingerprints the same');
});

test('a malformed source is refused rather than half-read', () => {
  const empty = parsePbcEvent('<html><body><p>nothing structured here</p></body></html>', { url: 'https://www.premierboxingchampions.com/x', capturedAt: NOW });
  assert.equal(empty.observation.bouts.length, 0);
  assert.ok(empty.problems.some((p) => /no event date/.test(p)));
  const broken = parseMatchroomEvent('<html><body><section class="single-event-hero"></section></body></html>', { url: 'https://www.matchroomboxing.com/events/x/', capturedAt: NOW });
  assert.equal(broken.observation.scheduled_date, null);
  assert.ok(broken.problems.some((p) => /no event date/.test(p)));
});
