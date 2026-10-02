// Sanctioning-schedule discovery: a calendar entry is a candidate, never an event; the parser reads the listing as published.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseWbcCalendar, parseWbcEventPage, wbcCandidate, wbcLocation, WBC_CALENDAR } from '../adapters/sanctioning/wbc-calendar.mjs';
import { discoverSanctioningSchedules } from './discover.mjs';

const fx = (f) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures/sanctioning', f), 'utf8');

test('WBC calendar: every listed title fight with its ISO date, both names, title and city', () => {
  const l = parseWbcCalendar(fx('wbc-calendar.html'));
  assert.equal(l.length, 7);
  const m = l.find((e) => /mbilli/.test(e.url));
  assert.deepEqual([m.date, m.fighters, m.title_as_published, m.city, m.country], ['2026-10-31', ['Christian Mbilli', 'Saul Alvarez'], 'WBC Super Middleweight Title', 'Riyadh', 'Saudi Arabia']);
  assert.equal(parseWbcEventPage(fx('wbc-event.html')).promoter, 'Sela Promotions');
});

test('WBC location: state names are stripped from the city so it compares with a promoter city', () => {
  assert.deepEqual(wbcLocation('San Antonio Texas, USA'), { city: 'San Antonio', region: 'Texas', country: 'US' });
  assert.deepEqual(wbcLocation('Carson, California USA'), { city: 'Carson', region: 'California', country: 'US' });
  assert.equal(wbcLocation('Sheffield, UK').country, 'GB');
});

test('discovery records candidates only, skips past entries, and refuses an unapproved source without fetching', async () => {
  const pages = { [WBC_CALENDAR.listUrl]: fx('wbc-calendar.html') };
  let fetched = 0;
  const fetchImpl = async (u) => { fetched++; return pages[u] ? { ok: true, text: async () => pages[u] } : { ok: true, text: async () => fx('wbc-event.html') }; };
  const recorded = [];
  const store = { source: async () => ({ enabled: true, rights_state: 'approved' }), recordEventCandidate: async (c) => { recorded.push(c); return { state: 'open' }; } };
  const r = await discoverSanctioningSchedules(store, { fetchImpl, sleepImpl: async () => {}, now: '2026-10-10T00:00:00Z', dryRun: false });
  assert.equal(r.summary.listed, 5, 'the two Oct 3 entries are past');
  assert.equal(recorded.length, 5);
  assert.ok(recorded.every((c) => c.source_key === 'wbc_official' && !('bouts' in c)));
  assert.equal(wbcCandidate({ url: 'https://wbcboxing.com/en/events/x/', date: null, fighters: ['A B', 'C D'] }).confidence, 'low');
  fetched = 0;
  const off = await discoverSanctioningSchedules({ source: async () => ({ enabled: false }) }, { fetchImpl, sleepImpl: async () => {} });
  assert.match(off.sources[0].error, /disabled/);
  assert.equal(fetched, 0);
});
