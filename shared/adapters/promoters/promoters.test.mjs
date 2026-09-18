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
import { resolveAnnouncedStart, wallClockToUtc, parseVisibleStarts, ianaZone } from './time.mjs';
import { isPlaceholderName } from './names.mjs';
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
  // the published broadcast start — never a ring walk. The page asserts it twice and the two assertions disagree; the
  // contradiction rule is tested on its own below, this just pins what the card resolves to.
  assert.equal(o.published_start_local, '20:00');
  assert.equal(o.published_utc_offset, '-05:00');
  assert.equal(o.scheduled_start_at, '2026-09-20T00:00:00.000Z');
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
  assert.ok(problems.filter((p) => /^bout /.test(p)).every((p) => p.length < 120), 'a refusal quotes the phrase, never the article text');
});

test('named zones resolve through the IANA database, so the announced date decides the offset', () => {
  // Nothing here is arithmetic on a fixed table: the same wall clock in the same zone lands on a different instant
  // either side of a daylight saving change, because the platform applies that zone's rules for that calendar date.
  assert.equal(wallClockToUtc('2026-09-19', 20, 0, 'America/New_York'), '2026-09-20T00:00:00.000Z', 'September ET is daylight time');
  assert.equal(wallClockToUtc('2026-09-19', 17, 0, 'America/Los_Angeles'), '2026-09-20T00:00:00.000Z', 'September PT is daylight time');
  assert.equal(wallClockToUtc('2026-10-17', 20, 0, 'America/New_York'), '2026-10-18T00:00:00.000Z', 'US daylight saving is still running in October');
  assert.equal(wallClockToUtc('2026-10-17', 17, 0, 'America/Los_Angeles'), '2026-10-18T00:00:00.000Z');
  // 1 November 2026 is the day US daylight saving ends: the same 8pm is an hour later in UTC than it was in October
  assert.equal(wallClockToUtc('2026-11-01', 20, 0, 'America/New_York'), '2026-11-02T01:00:00.000Z');
  assert.equal(wallClockToUtc('2027-01-16', 20, 0, 'America/New_York'), '2027-01-17T01:00:00.000Z', 'winter ET is standard time');
  assert.equal(wallClockToUtc('2027-01-16', 17, 0, 'America/Los_Angeles'), '2027-01-17T01:00:00.000Z', 'winter PT is standard time');
  assert.notEqual(wallClockToUtc('2026-10-17', 20, 0, 'America/New_York').slice(11), wallClockToUtc('2026-11-01', 20, 0, 'America/New_York').slice(11),
    'the October offset must not be reused once the clocks have gone back');
  // the UK moves on its own dates, and a card there is resolved in its own zone
  assert.equal(wallClockToUtc('2026-09-19', 20, 0, 'Europe/London'), '2026-09-19T19:00:00.000Z');
  assert.equal(wallClockToUtc('2027-01-16', 20, 0, 'Europe/London'), '2027-01-16T20:00:00.000Z');

  assert.equal(ianaZone('ET'), 'America/New_York');
  assert.equal(ianaZone('Pacific'), 'America/Los_Angeles');
  assert.equal(ianaZone('AEST'), null, 'a zone we do not model is not guessed at');
  assert.deepEqual(parseVisibleStarts('8pm ET/5pm PT').map((p) => [p.printed, p.hour, p.zone]),
    [['8pm ET', 20, 'America/New_York'], ['5pm PT', 17, 'America/Los_Angeles']]);
  assert.deepEqual(parseVisibleStarts('first bell 7.30pm GMT').map((p) => [p.hour, p.minute, p.zone]), [[19, 30, 'Europe/London']]);
});

test('a source that contradicts itself: the printed times win, and the disagreement is recorded', () => {
  // PBC publishes this September card twice. Its JSON-LD carries "2026-09-19T20:00:00-05:00", which is 01:00Z — but
  // -05:00 is not Eastern on 19 September. The page also prints "8pm ET / 5pm PT", two independent representations that
  // resolve to the same instant, 00:00Z. Malformed metadata is not privileged over the clearer published evidence.
  const r = resolveAnnouncedStart({ date: '2026-09-19', jsonLdValue: '2026-09-19T20:00:00-05:00', jsonLdInstant: '2026-09-20T01:00:00.000Z',
    visibleLine: 'SAT, SEP 19, 2026 8pm ET Eastern Time / 5pm PT Pacific Time' });
  assert.equal(r.basis, 'visible_preferred');
  assert.equal(r.scheduled_start_at, '2026-09-20T00:00:00.000Z');
  assert.notEqual(r.scheduled_start_at, '2026-09-20T01:00:00.000Z', 'the malformed instant is not what gets stored');
  assert.equal(r.conflict.code, 'source_time_conflict');
  assert.equal(r.conflict.json_ld, '2026-09-19T20:00:00-05:00', 'the raw assertion is kept, not discarded');
  assert.equal(r.conflict.json_ld_instant, '2026-09-20T01:00:00.000Z');
  assert.equal(r.conflict.visible_instant, '2026-09-20T00:00:00.000Z');
  assert.equal(r.conflict.chosen, 'visible');
  assert.equal(r.conflict.corroborating_representations.length, 2, 'ET and PT corroborate each other');
  // both readings survive on the observation as separate assertions
  assert.deepEqual(r.assertions.map((a) => a.kind), ['structured', 'visible', 'visible']);
  assert.equal(r.assertions.filter((a) => a.kind === 'visible').every((a) => a.instant === '2026-09-20T00:00:00.000Z'), true);

  const { observation: o, problems } = parsePbcEvent(fixture('pbc-event.html'), { url: 'https://www.premierboxingchampions.com/isaac-cruz-vs-nestor-bravo', capturedAt: NOW });
  assert.equal(o.scheduled_date, '2026-09-19', 'the announced calendar date is unaffected');
  assert.equal(o.scheduled_start_at, '2026-09-20T00:00:00.000Z');
  assert.match(o.published_start_line, /8pm ET.*5pm PT/, 'the printed line is retained verbatim');
  assert.equal(o.source_time_conflict.json_ld, '2026-09-19T20:00:00-05:00');
  assert.ok(problems.some((p) => /^start time:/.test(p)));
});

test('the same code resolves a different card on a different date with that date\'s own offset', () => {
  // October: US daylight saving has not ended, so 8pm ET is still -04:00. Nothing about September is carried over.
  const { observation: o } = parsePbcEvent(fixture('pbc-event-october.html'), { url: 'https://www.premierboxingchampions.com/fight-night-october-17-2026', capturedAt: NOW });
  assert.equal(o.scheduled_date, '2026-10-17');
  assert.equal(o.published_utc_offset, '-05:00', 'the same malformed structured offset');
  assert.equal(o.scheduled_start_at, '2026-10-18T00:00:00.000Z');
  assert.equal(o.source_time_conflict.json_ld_instant, '2026-10-18T01:00:00.000Z');
  assert.equal(o.venue.city, 'Las Vegas');
  assert.equal(o.bouts[0].fighter_a.name, 'Sebastian Fundora');
  assert.equal(o.bouts[0].division, 'super_welterweight');
});

test('when the source does not contradict itself, the structured time is used unchanged', () => {
  const only = resolveAnnouncedStart({ date: '2026-09-19', jsonLdValue: '2026-09-19T20:00:00-04:00', jsonLdInstant: '2026-09-20T00:00:00.000Z', visibleLine: null });
  assert.equal(only.basis, 'structured');
  assert.equal(only.scheduled_start_at, '2026-09-20T00:00:00.000Z');
  assert.equal(only.conflict, null);

  const agreeing = resolveAnnouncedStart({ date: '2026-09-19', jsonLdValue: '2026-09-19T20:00:00-04:00', jsonLdInstant: '2026-09-20T00:00:00.000Z', visibleLine: '8pm ET / 5pm PT' });
  assert.equal(agreeing.basis, 'corroborated');
  assert.equal(agreeing.scheduled_start_at, '2026-09-20T00:00:00.000Z');
  assert.equal(agreeing.conflict, null, 'agreement is not a conflict');

  const printedOnly = resolveAnnouncedStart({ date: '2026-09-19', jsonLdValue: null, jsonLdInstant: null, visibleLine: 'first bell 7.30pm GMT' });
  assert.equal(printedOnly.basis, 'visible');
  assert.equal(printedOnly.scheduled_start_at, '2026-09-19T18:30:00.000Z');

  assert.equal(resolveAnnouncedStart({ date: '2026-09-19' }).scheduled_start_at, null, 'no published start means none is invented');
});

test('an unresolvable contradiction fails closed on the instant, and keeps everything the source said', () => {
  // the structured timestamp is contradicted but nothing corroborates a replacement: no canonical instant is claimed
  const unknown = resolveAnnouncedStart({ date: '2026-09-19', jsonLdValue: '2026-09-19T20:00:00-05:00', jsonLdInstant: '2026-09-20T01:00:00.000Z',
    visibleLine: 'SAT, SEP 19, 2026 8:00 PM AEST' });
  assert.equal(unknown.scheduled_start_at, null);
  assert.equal(unknown.basis, 'unresolved');
  assert.match(unknown.conflict.reason, /timezone is not recognised/);
  assert.equal(unknown.conflict.visible_line, 'SAT, SEP 19, 2026 8:00 PM AEST', 'the printed line is still kept');
  assert.equal(unknown.conflict.json_ld, '2026-09-19T20:00:00-05:00', 'so is the structured one');

  // the printed representations disagree with EACH OTHER: neither is corroborated, so neither is chosen
  const disagreeing = resolveAnnouncedStart({ date: '2026-09-19', jsonLdValue: '2026-09-19T20:00:00-05:00', jsonLdInstant: '2026-09-20T01:00:00.000Z',
    visibleLine: '8pm ET / 6pm PT' });
  assert.equal(disagreeing.scheduled_start_at, null);
  assert.equal(disagreeing.basis, 'unresolved');
  assert.equal(disagreeing.conflict.derived.length, 2);

  // the card, its date and its bouts survive: only the exact UTC instant is withheld
  const { observation: o } = parsePbcEvent(fixture('pbc-event.html').replace(/8pm[\s\S]*?Pacific Time<\/span>/, '8:00 PM AEST'),
    { url: 'https://www.premierboxingchampions.com/isaac-cruz-vs-nestor-bravo', capturedAt: NOW });
  assert.equal(o.scheduled_start_at, null);
  assert.equal(o.scheduled_date, '2026-09-19', 'the announced date still stands');
  assert.equal(o.published_start_local, '20:00', 'the raw published time is still stored');
  assert.equal(o.bouts.length, 4, 'the announced card is unaffected');
  assert.ok(o.published_start_line.includes('AEST'), 'and the source receipt still shows what was printed');
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

test('an announced slot is never a fighter, however the promoter spells it', () => {
  // Matchroom writes "TBC", PBC writes "TBD", others spell it out. All of them mean the opponent is not signed.
  for (const p of ['TBD', 'TBA', 'TBC', 'tbc', 'T.B.C.', 'To Be Announced', 'To Be Confirmed', 'To Be Determined',
    'Opponent TBC', 'Opponent TBD', 'Opponent TBA', 'opponent to be confirmed', 'TBC Opponent', 'Opponent', '  ', '']) {
    assert.equal(isPlaceholderName(p), true, `${JSON.stringify(p)} is an announced slot, not a fighter`);
  }
  // a name is a name, even when those letters appear inside it
  for (const n of ['Harley Burrows', 'Tbarek Ali', 'Atba Mensah', 'Tba Ndiaye', 'Tomoki Kameda', "Cory O'Regan", 'Jean-Pierre Tbc']) {
    assert.equal(isPlaceholderName(n), false, `${n} is a real name`);
  }
});

test('every placeholder spelling is refused by both adapters, and creates no fighter', () => {
  const variants = ['TBD', 'TBA', 'TBC', 'To Be Announced', 'To Be Confirmed', 'To Be Determined', 'Opponent TBC'];

  for (const v of variants) {
    // PBC: the last bout's opponent is replaced with the placeholder
    const { observation: o, problems } = parsePbcEvent(fixture('pbc-event.html').replaceAll('Guillermo Hernandez', v),
      { url: 'https://www.premierboxingchampions.com/isaac-cruz-vs-nestor-bravo', capturedAt: NOW });
    assert.equal(o.bouts.length, 3, `PBC "${v}": the incomplete slot is not a bout`);
    assert.ok(!o.bouts.some((b) => [b.fighter_a.name, b.fighter_b.name].some((n) => isPlaceholderName(n))), `PBC "${v}": no placeholder fighter`);
    assert.ok(problems.some((p) => /opponent not announced/.test(p)), `PBC "${v}": the refusal is recorded`);
    assert.ok(o.bouts.some((b) => b.fighter_a.name === 'Isaac Cruz'), `PBC "${v}": the rest of the card stands`);

    // Matchroom: the fixture's own unsigned slot, spelled every way the promoters spell it
    const tiles = parseMatchroomEvents(fixture('matchroom-events.html'));
    const m = parseMatchroomEvent(fixture('matchroom-event.html').replace('>TBD<', `>${v}<`),
      { url: 'https://www.matchroomboxing.com/events/hedges-vs-brown/', capturedAt: NOW, venueHint: tiles.find((t) => t.slug === 'hedges-vs-brown').venue });
    assert.equal(m.observation.bouts.length, 8, `Matchroom "${v}": eight real pairings, and the slot is not one`);
    assert.ok(!m.observation.bouts.some((b) => [b.fighter_a.name, b.fighter_b.name].some((n) => isPlaceholderName(n))), `Matchroom "${v}": no placeholder fighter`);
    assert.ok(m.problems.some((p) => /opponent not announced/.test(p)), `Matchroom "${v}": the refusal is recorded`);
    // the named corner of the incomplete slot is not smuggled in on its own either
    assert.ok(!m.observation.bouts.some((b) => b.fighter_a.name === 'Alfie Middlemiss'), `Matchroom "${v}": the half-announced bout is dropped whole`);
  }

  // and a real name in that slot is a real bout: the rule refuses slots, not fighters
  const tiles = parseMatchroomEvents(fixture('matchroom-events.html'));
  const named = parseMatchroomEvent(fixture('matchroom-event.html').replace('>TBD<', '>Tbarek Ali<'),
    { url: 'https://www.matchroomboxing.com/events/hedges-vs-brown/', capturedAt: NOW, venueHint: tiles.find((t) => t.slug === 'hedges-vs-brown').venue });
  assert.equal(named.observation.bouts.length, 9);
  assert.ok(named.observation.bouts.some((b) => b.fighter_b.name === 'Tbarek Ali'));
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
