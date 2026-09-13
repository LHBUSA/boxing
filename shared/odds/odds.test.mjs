import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  americanToDecimal, decimalToAmerican, devig, impliedFromAmerican, impliedFromDecimal, normalizePrice, probabilityToAmerican,
} from './price.mjs';
import { marketKey, validSelection } from './markets.mjs';
import { freshness } from './freshness.mjs';
import { matchEvent } from './match.mjs';
import { buildMarketMovedEvent, evaluateMarketMove } from './movement.mjs';
import { normalizeEvent, validatePayload } from '../adapters/odds/the-odds-api.mjs';

test('american / decimal / implied conversions', () => {
  assert.equal(americanToDecimal(-150), 1.666667);
  assert.equal(americanToDecimal(130), 2.3);
  assert.equal(americanToDecimal(-110), 1.909091);
  assert.equal(americanToDecimal(100), 2);
  assert.equal(decimalToAmerican(1.5), -200);
  assert.equal(decimalToAmerican(3.25), 225);
  assert.equal(decimalToAmerican(2), 100);
  assert.equal(decimalToAmerican(1.909091), -110);
  assert.equal(impliedFromAmerican(-150), 0.6);
  assert.equal(impliedFromAmerican(130), 0.43478261);
  assert.equal(impliedFromDecimal(2.5), 0.4);
  assert.equal(probabilityToAmerican(0.6), -150);
  assert.equal(probabilityToAmerican(0.4), 150);
  for (const a of [-1000, -250, -101, 100, 101, 275, 1200]) {
    assert.equal(decimalToAmerican(americanToDecimal(a)), a, `round trip ${a}`);
  }
  assert.deepEqual(normalizePrice({ decimal: 1.8 }), { american: -125, decimal: 1.8, implied: 0.55555556, source_format: 'decimal' });
});

test('impossible prices are rejected, never coerced', () => {
  assert.throws(() => americanToDecimal(50), /invalid american/);
  assert.throws(() => americanToDecimal(-99), /invalid american/);
  assert.throws(() => americanToDecimal(110.5), /invalid american/);
  assert.throws(() => impliedFromDecimal(1), /invalid decimal/);
  assert.throws(() => normalizePrice({}), /price missing/);
});

test('de-vig requires a complete market', () => {
  const d = devig([impliedFromAmerican(-150), impliedFromAmerican(130)]);
  assert.ok(d.overround > 1);
  assert.ok(Math.abs(d.fair[0] + d.fair[1] - 1) < 1e-6);
  assert.equal(devig([0.6]), null);
  assert.equal(devig([0.6, null]), null);
});

test('market keys and selection validation per market type', () => {
  assert.equal(marketKey({ marketType: 'moneyline' }), 'moneyline|fight|-|pre');
  assert.equal(marketKey({ marketType: 'total_rounds', line: 9.5, isLive: true }), 'total_rounds|fight|9.50|live');
  assert.throws(() => marketKey({ marketType: 'total_rounds' }), /requires a line/);
  assert.ok(validSelection('method_of_victory', 'fighter_a:ko_tko'));
  assert.ok(validSelection('exact_round', 'fighter_b:r12'));
  assert.ok(validSelection('round_group', 'fighter_a:r1-3'));
  assert.ok(validSelection('moneyline_3way', 'draw'));
  assert.ok(!validSelection('moneyline', 'draw'));
  assert.ok(!validSelection('exact_round', 'fighter_a:r46'));
});

test('freshness windows tighten toward the fight; live and closed are distinct', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const ago = (h) => new Date(+now - h * 3600_000).toISOString();
  const ahead = (h) => new Date(+now + h * 3600_000).toISOString();
  assert.equal(freshness({ lastSeenAt: ago(20), startsAt: ahead(24 * 10), isLive: false, now }), 'fresh');
  assert.equal(freshness({ lastSeenAt: ago(40), startsAt: ahead(24 * 10), isLive: false, now }), 'stale');
  assert.equal(freshness({ lastSeenAt: ago(10), startsAt: ahead(48), isLive: false, now }), 'fresh');
  assert.equal(freshness({ lastSeenAt: ago(13), startsAt: ahead(48), isLive: false, now }), 'stale');
  assert.equal(freshness({ lastSeenAt: ago(1), startsAt: ahead(2), isLive: false, now }), 'stale');
  assert.equal(freshness({ lastSeenAt: ago(0.25), startsAt: ahead(2), isLive: false, now }), 'fresh');
  assert.equal(freshness({ lastSeenAt: ago(1), startsAt: ago(0.5), isLive: false, now }), 'closed');
  assert.equal(freshness({ lastSeenAt: ago(0.01), startsAt: ago(0.5), isLive: true, now }), 'live');
  assert.equal(freshness({ lastSeenAt: ago(0.1), startsAt: ago(0.5), isLive: true, now }), 'stale');
  assert.equal(freshness({ lastSeenAt: null, startsAt: ahead(1), isLive: false, now }), 'unknown');
});

// ---- provider normalization -------------------------------------------------

const event = (overrides = {}) => ({
  id: 'evt-1', sport_key: 'boxing_boxing', commence_time: '2026-10-10T03:00:00Z',
  home_team: 'Dmitri Volkov', away_team: 'Jonas Berg',
  bookmakers: [{
    key: 'book_one', title: 'Book One', last_update: '2026-10-08T10:00:00Z',
    markets: [
      { key: 'h2h', last_update: '2026-10-08T10:00:00Z', outcomes: [{ name: 'Jonas Berg', price: 130 }, { name: 'Dmitri Volkov', price: -150 }] },
      { key: 'totals', last_update: '2026-10-08T10:00:00Z', outcomes: [{ name: 'Over', price: -120, point: 9.5 }, { name: 'Under', price: -105, point: 9.5 }] },
      { key: 'h2h_lay', outcomes: [] },
    ],
  }],
  ...overrides,
});

test('normalization maps provider names to canonical sides, not home/away', () => {
  // canonical: Berg is side a, Volkov side b — the provider lists Volkov as home
  const n = normalizeEvent(event(), { sides: { 'Jonas Berg': 'a', 'Dmitri Volkov': 'b' }, fighters: { a: 'F-BERG', b: 'F-VOLKOV' } });
  const ml = n.bookmakers[0].markets.find((m) => m.market_type === 'moneyline');
  assert.deepEqual(ml.outcomes.map((o) => [o.selection_key, o.fighter_id, o.american]), [['fighter_a', 'F-BERG', 130], ['fighter_b', 'F-VOLKOV', -150]]);
  const tot = n.bookmakers[0].markets.find((m) => m.market_type === 'total_rounds');
  assert.equal(tot.market_key, 'total_rounds|fight|9.50|pre');
  assert.deepEqual(n.unsupported, [{ bookmaker: 'book_one', market: 'h2h_lay' }], 'unsupported markets are counted, never faked');
});

test('draw outcome makes a three-way moneyline; unexpected outcomes reject the market', () => {
  const e = event();
  e.bookmakers[0].markets = [{ key: 'h2h', outcomes: [{ name: 'Dmitri Volkov', price: -150 }, { name: 'Jonas Berg', price: 140 }, { name: 'Draw', price: 2000 }] }];
  const n = normalizeEvent(e, { sides: { 'Jonas Berg': 'a', 'Dmitri Volkov': 'b' }, fighters: { a: 'A', b: 'B' } });
  assert.equal(n.bookmakers[0].markets[0].market_type, 'moneyline_3way');
  assert.equal(n.bookmakers[0].markets[0].outcomes.find((o) => o.selection_key === 'draw').fighter_id, null);

  const bad = event();
  bad.bookmakers[0].markets = [{ key: 'h2h', outcomes: [{ name: 'Somebody Else', price: -150 }, { name: 'Jonas Berg', price: 140 }] }];
  const nb = normalizeEvent(bad, { sides: { 'Jonas Berg': 'a', 'Dmitri Volkov': 'b' }, fighters: { a: 'A', b: 'B' } });
  assert.equal(nb.bookmakers.length, 0);
  assert.match(nb.rejected[0].reason, /unexpected_outcome/);
  assert.throws(() => validatePayload([{ id: 'x' }]), /missing/);
});

// ---- matching ---------------------------------------------------------------

const cand = (id, name) => ({ id, display_name: name, aliases: [], identities: [], bouts: [] });
const candidatesById = new Map([
  ['volkov', cand('volkov', 'Dmitri Volkov')], ['berg', cand('berg', 'Jonas Berg')],
  ['okafor', cand('okafor', 'Emmanuel Okafor')], ['nunez', cand('nunez', 'José Ramón Núñez')],
  ['dan', cand('dan', 'Daniel Volkov')], ['stone', cand('stone', 'Aaron Stone')],
]);
const bout = (id, startsAt, a, b) => ({ bout_id: id, starts_at: startsAt, participants: [{ fighter_id: a, side: 'a' }, { fighter_id: b, side: 'b' }] });

test('matching requires both corners of one bout; date is only a filter', () => {
  const bouts = [bout('b1', '2026-10-10T02:00:00Z', 'berg', 'volkov'), bout('b2', '2026-10-10T02:00:00Z', 'okafor', 'nunez')];
  const ok = matchEvent({ commence_time: '2026-10-10T03:00:00Z', home_team: 'D. Volkov', away_team: 'Berg' }, { bouts, candidatesById });
  assert.equal(ok.matched, true);
  assert.equal(ok.bout_id, 'b1');
  assert.deepEqual(ok.sides, { 'D. Volkov': 'b', Berg: 'a' });

  const crossCard = matchEvent({ commence_time: '2026-10-10T03:00:00Z', home_team: 'Dmitri Volkov', away_team: 'Emmanuel Okafor' }, { bouts, candidatesById });
  assert.equal(crossCard.matched, false);
  assert.equal(crossCard.reason, 'no_bout_with_both_fighters');

  const outsideWindow = matchEvent({ commence_time: '2026-10-20T03:00:00Z', home_team: 'Dmitri Volkov', away_team: 'Jonas Berg' }, { bouts, candidatesById });
  assert.equal(outsideWindow.reason, 'no_candidate_bout_in_window');
});

test('participant ambiguity fails closed', () => {
  const bouts = [bout('b3', '2026-10-10T02:00:00Z', 'volkov', 'dan')];
  const r = matchEvent({ commence_time: '2026-10-10T03:00:00Z', home_team: 'D. Volkov', away_team: 'Volkov' }, { bouts, candidatesById });
  assert.equal(r.matched, false);
});

test('two plausible bouts for the same pairing fail closed', () => {
  const bouts = [bout('b1', '2026-10-10T02:00:00Z', 'berg', 'volkov'), bout('b9', '2026-10-11T02:00:00Z', 'volkov', 'berg')];
  const r = matchEvent({ commence_time: '2026-10-10T20:00:00Z', home_team: 'Dmitri Volkov', away_team: 'Jonas Berg' }, { bouts, candidatesById });
  assert.equal(r.reason, 'ambiguous_multiple_bouts');
});

test('an existing provider mapping is re-verified: a replaced opponent does not inherit the bout', () => {
  const bouts = [bout('b1', '2026-10-10T02:00:00Z', 'berg', 'volkov')];
  const r = matchEvent({ commence_time: '2026-10-10T03:00:00Z', home_team: 'Dmitri Volkov', away_team: 'Aaron Stone' }, { bouts, candidatesById, mappedBoutId: 'b1' });
  assert.equal(r.matched, false);
  assert.equal(r.reason, 'mapped_bout_participant_mismatch');
});

// ---- movement ---------------------------------------------------------------

const tick = (id, bookmaker, selection, american, at) => ({
  tick_id: id, bookmaker, selection_key: selection, american, implied: impliedFromAmerican(american), observed_at: at, status: 'open',
});
const NOW = '2026-10-09T12:00:00Z';

test('market movement: thresholded over the same books, no causal claim', async () => {
  const ticks = [
    tick(1, 'b1', 'fighter_a', -110, '2026-10-08T08:00:00Z'), tick(2, 'b2', 'fighter_a', -115, '2026-10-08T09:00:00Z'),
    tick(3, 'b1', 'fighter_a', -200, '2026-10-09T10:00:00Z'), tick(4, 'b2', 'fighter_a', -190, '2026-10-09T11:00:00Z'),
    tick(5, 'b3', 'fighter_a', 150, '2026-10-09T11:30:00Z'), // joined inside the window: excluded from the comparison
  ];
  const ev = evaluateMarketMove({ boutId: 'B', marketKey: 'moneyline|fight|-|pre', selectionKey: 'fighter_a', ticks, now: NOW, provider: 'p' });
  assert.equal(ev.emit, true);
  assert.equal(ev.direction, 'shortened');
  assert.equal(ev.facts.books_participating, 2);
  assert.equal(ev.facts.cause, null);
  assert.equal(ev.facts.causal_claim_allowed, false);
  assert.ok(ev.facts.move_probability_points > 0.1);
  const built = await buildMarketMovedEvent(ev, { sourceKey: 'the_odds_api', detectedAt: NOW });
  const again = await buildMarketMovedEvent(evaluateMarketMove({ boutId: 'B', marketKey: 'moneyline|fight|-|pre', selectionKey: 'fighter_a', ticks: [...ticks].reverse(), now: NOW, provider: 'p' }), { sourceKey: 'the_odds_api', detectedAt: NOW });
  assert.equal(built.dedupe_key, again.dedupe_key, 'same state -> same dedupe key');
  assert.ok(built.sources.length === 1 && built.sources[0].external_key.startsWith('ticks:'));

  const small = [tick(1, 'b1', 'fighter_a', -110, '2026-10-08T08:00:00Z'), tick(2, 'b2', 'fighter_a', -110, '2026-10-08T08:00:00Z'),
    tick(3, 'b1', 'fighter_a', -120, '2026-10-09T10:00:00Z'), tick(4, 'b2', 'fighter_a', -115, '2026-10-09T10:00:00Z')];
  assert.equal(evaluateMarketMove({ boutId: 'B', marketKey: 'm', selectionKey: 'fighter_a', ticks: small, now: NOW }).reason, 'below_threshold');

  const oneBook = ticks.filter((t) => t.bookmaker === 'b1');
  assert.equal(evaluateMarketMove({ boutId: 'B', marketKey: 'm', selectionKey: 'fighter_a', ticks: oneBook, now: NOW }).reason, 'insufficient_books');

  const lastEvent = { detected_at: '2026-10-09T09:00:00Z', payload: { facts: { new_consensus_implied: ev.facts.new_consensus_implied - 0.01 } } };
  assert.equal(evaluateMarketMove({ boutId: 'B', marketKey: 'm', selectionKey: 'fighter_a', ticks, now: NOW, lastEvent }).reason, 'cooldown');
});

test('matcher 1.1.0: a different given name never matches in bout scope (Jermall vs Jermell)', () => {
  const byId = new Map([...candidatesById, ['jermall', cand('jermall', 'Jermall Charlo')], ['koen', cand('koen', 'Koen Mazoudier')]]);
  const bouts = [bout('b-charlo', '2026-10-17T03:00:00Z', 'jermall', 'koen')];
  const r = matchEvent({ commence_time: '2026-10-17T04:00:00Z', home_team: 'Jermell Charlo', away_team: 'Koen Mazoudier' }, { bouts, candidatesById: byId });
  assert.equal(r.matched, false);
  const ok = matchEvent({ commence_time: '2026-10-17T04:00:00Z', home_team: 'Jermall Charlo', away_team: 'Koen Mazoudier' }, { bouts, candidatesById: byId });
  assert.equal(ok.matched, true);
});

test('a verified provider identity confirms its own boxer and refuses any other corner', () => {
  const bouts = [bout('b1', '2026-10-10T02:00:00Z', 'berg', 'volkov')];
  // the provider's "D. Volkov" was verified as Daniel Volkov (dan) on an earlier authoritative match
  const providerIdentities = new Map([['d volkov', ['dan']]]);
  const refused = matchEvent({ commence_time: '2026-10-10T03:00:00Z', home_team: 'D. Volkov', away_team: 'Berg' }, { bouts, candidatesById, providerIdentities });
  assert.equal(refused.matched, false, 'name similarity to Dmitri cannot override a verified identity pointing elsewhere');
  const confirmed = matchEvent({ commence_time: '2026-10-10T03:00:00Z', home_team: 'D. Volkov', away_team: 'Berg' },
    { bouts: [bout('b2', '2026-10-10T02:00:00Z', 'berg', 'dan')], candidatesById, providerIdentities });
  assert.equal(confirmed.matched, true);
  assert.equal(confirmed.evidence.home.level, 'provider_identity_verified');
});
