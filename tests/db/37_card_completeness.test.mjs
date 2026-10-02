// Card completeness (pbe_card_completeness@1) and placeholder hardening (0049) against a real database.
// A 1-2 bout record is never a complete card; TBC slots never become people; repair removes only unattached placeholders.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';
import { PBC } from '../../shared/adapters/promoters/pbc.mjs';
import { MATCHROOM } from '../../shared/adapters/promoters/matchroom.mjs';
import { isPlaceholderName } from '../../shared/adapters/promoters/names.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/promoters');
const FIXTURE = {
  [PBC.scheduleUrl]: 'pbc-schedule.html',
  'https://www.premierboxingchampions.com/fight-night-september-19-2026': 'pbc-event.html',
  [MATCHROOM.eventsUrl]: 'matchroom-events.html',
  'https://www.matchroomboxing.com/events/hedges-vs-brown/': 'matchroom-event.html',
};
const fetchFixture = async (url) => (FIXTURE[url]
  ? { ok: true, status: 200, text: async () => readFileSync(join(dir, FIXTURE[url]), 'utf8') }
  : { ok: false, status: 404, text: async () => '' });
const NOW = '2026-09-18T20:00:00Z';

let db;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const completeness = async (where, today = '2026-09-18') =>
  (await one(`select public.boxing_event_card_completeness(e.id, $1::date) c from public.boxing_events e ${where} limit 1`, [today])).c;

before(async () => {
  db = await freshDatabase('card_completeness');
  await collectPromoterCards(pgStore(db.client), { fetchImpl: fetchFixture, now: NOW, windowDays: 45, maxEvents: 8, sleepImpl: async () => {}, dryRun: false });
});
after(async () => { await db?.close(); });

test('a fully held advertised card is COMPLETE_CARD and its TBC slot is excluded, not counted as a bout', async () => {
  const mr = await completeness(`join public.boxing_venues v on v.id = e.venue_id where v.city = 'Manchester'`);
  assert.equal(mr.state, 'COMPLETE_CARD');
  assert.equal(mr.known_expected_bouts, 8);
  assert.equal(mr.tbc_slots, 1, 'the TBD slot is recorded as a slot');
  assert.equal(mr.stored_bouts, 8);
  assert.equal(mr.held_bouts, 0);
  assert.equal(Number(mr.completeness_pct), 100);
  const sd = await completeness(`join public.boxing_venues v on v.id = e.venue_id where v.city = 'San Diego'`);
  assert.equal(sd.state, 'COMPLETE_CARD');
  assert.equal(sd.known_expected_bouts, 4);
});

test('an advertised bout missing from the record makes the card PARTIAL, never complete', async () => {
  const ev = await one(`select e.id from public.boxing_events e join public.boxing_venues v on v.id = e.venue_id where v.city = 'Manchester'`);
  const b = await one(`select id from public.boxing_bouts where event_id = $1 order by bout_order desc limit 1`, [ev.id]);
  await q(`update public.boxing_bouts set status = 'cancelled' where id = $1`, [b.id]);
  const c = await completeness(`where e.id = '${ev.id}'`);
  assert.equal(c.state, 'PARTIAL_CARD');
  assert.equal(c.held_bouts, 1);
  assert.equal(Number(c.completeness_pct), 88);
  await q(`update public.boxing_bouts set status = 'scheduled' where id = $1`, [b.id]);
});

test('a 1-2 bout record with no advertised card is HEADLINER_ONLY near fight night and CARD_DEVELOPING far out', async () => {
  const ev = await one(`insert into public.boxing_events (name, event_date, status, source_id) select 'Test Fight Night', '2026-09-26', 'scheduled', source_id from public.boxing_events limit 1 returning id`);
  const empty = await completeness(`where e.id = '${ev.id}'`);
  assert.equal(empty.state, 'CARD_DEVELOPING', 'nothing announced is developing, not complete');
  assert.equal(empty.known_expected_bouts, null);
  const src = await one(`select b.id from public.boxing_bouts b limit 1`);
  await q(`insert into public.boxing_bouts (event_id, status, bout_order, scheduled_rounds, weight_class_id, competition_class, source_id)
           select $1, 'scheduled', 1, b.scheduled_rounds, b.weight_class_id, b.competition_class, b.source_id from public.boxing_bouts b where b.id = $2`, [ev.id, src.id]);
  const one_bout = await completeness(`where e.id = '${ev.id}'`);
  assert.equal(one_bout.state, 'HEADLINER_ONLY');
  assert.notEqual(one_bout.state, 'COMPLETE_CARD');
  const far = await completeness(`where e.id = '${ev.id}'`, '2026-08-01');
  assert.equal(far.state, 'CARD_DEVELOPING');
});

test('placeholder vocabulary: SQL and JS agree, including "TBC TBC"', async () => {
  const names = ['TBC', 'TBC TBC', 'Tba Tbc', 'TBD TBD', 'T.B.C.', 'To Be Confirmed', 'Opponent TBC', 'Tba Ndiaye', 'Tbarek Ali', "D'Angelo Tbc", 'Jean-Pierre Tbc'];
  for (const n of names) {
    const sql = (await one(`select (public.boxing_identity_name_quality($1) ->> 'placeholder')::boolean p`, [n])).p;
    assert.equal(sql, isPlaceholderName(n), `${n}: SQL and JS must agree`);
  }
  assert.equal(isPlaceholderName('TBC TBC'), true);
  assert.equal(isPlaceholderName('Tba Ndiaye'), false);
});

test('placeholder repair voids an unattached placeholder (ledger kept, keys removed); attached ones are kept; dry run writes nothing', async () => {
  const loose = await one(`insert into public.boxing_fighters (display_name) values ('TBC TBC') returning id, public_id`);
  // the real incident: the resolver had already appended a 'created' resolution (append-only) for it
  await q(`insert into public.boxing_identity_resolutions (source_id, outcome, reason, fighter_id, decided_by, resolver_version) select id, 'created', 'test', $1, 'test', 'test' from public.boxing_sources where source_key = 'promoter_matchroom'`, [loose.id]);
  await q(`insert into public.boxing_fighter_search_names (fighter_id, search_name) select $1, 'tbc tbc' where exists (select 1 from information_schema.columns where table_name = 'boxing_fighter_search_names' and column_name = 'search_name')`, [loose.id]).catch(() => {});
  const dry = (await one(`select public.boxing_repair_placeholder_fighters(false) r`)).r;
  assert.equal(dry.applied, false);
  assert.ok(dry.voided.some((x) => x.public_id === loose.public_id));
  assert.equal((await one(`select identity_state from public.boxing_fighters where id = $1`, [loose.id])).identity_state, 'review_required', 'dry run changes nothing');
  const applied = (await one(`select public.boxing_repair_placeholder_fighters(true) r`)).r;
  assert.ok(applied.voided.some((x) => x.public_id === loose.public_id));
  assert.equal((await one(`select identity_state from public.boxing_fighters where id = $1`, [loose.id])).identity_state, 'void');
  assert.equal((await one(`select count(*)::int n from public.boxing_fighter_name_keys where fighter_id = $1`, [loose.id])).n, 0, 'no key can match it again');
  const corr = await one(`select outcome, reason from public.boxing_identity_resolutions where evidence ->> 'voided_fighter' = $1`, [loose.public_id]);
  assert.deepEqual(corr, { outcome: 'rejected', reason: 'placeholder_not_a_person' }, 'the correction is appended to the immutable ledger');
  const again = (await one(`select public.boxing_repair_placeholder_fighters(true) r`)).r;
  assert.equal(again.voided.length, 0, 'idempotent');
});
