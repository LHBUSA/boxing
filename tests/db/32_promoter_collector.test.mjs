// The professional card collector end to end against a real database: dry run writes nothing, the real run canonicalizes
// both 2026-09-19 cards from the committed fixtures, a rerun changes nothing, and the rights lane holds throughout.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { freshDatabase, setSourceLane } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';
import { PBC } from '../../shared/adapters/promoters/pbc.mjs';
import { MATCHROOM } from '../../shared/adapters/promoters/matchroom.mjs';

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
const opts = (over = {}) => ({ fetchImpl: fetchFixture, now: NOW, windowDays: 45, maxEvents: 8, sleepImpl: async () => {}, ...over });

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const counts = async () => one(`select (select count(*)::int from public.boxing_events) events, (select count(*)::int from public.boxing_bouts) bouts,
  (select count(*)::int from public.boxing_fighters) fighters, (select count(*)::int from public.boxing_source_observations) observations,
  (select count(*)::int from public.boxing_venues) venues`);

before(async () => {
  db = await freshDatabase('promoter_collector');
  store = pgStore(db.client);
  // 0047 makes creating a fighter an approved-lane decision, and the promoters ship as a scope gap: that gate has its
  // own suite (35_fighter_identity_lane). These tests are about the COLLECTOR, so the lane is opened here exactly as
  // the owner would open it, and the collector is then measured against an approved source.
  for (const k of ['promoter_pbc', 'promoter_matchroom']) await setSourceLane(db.client, k, 'fighter_identity', 'covered_by_rights_review');
});
after(async () => { await db?.close(); });

test('dry run: both cards are fully planned and nothing at all is written', async () => {
  const before = await counts();
  const receipt = await collectPromoterCards(store, opts({ dryRun: true }));
  assert.equal(receipt.dry_run, true);
  assert.deepEqual(await counts(), before, 'a dry run writes nothing');

  const pbc = receipt.sources.find((s) => s.source_key === 'promoter_pbc').events.find((e) => e.date === '2026-09-19');
  assert.equal(pbc.venue, 'Pechanga Arena');
  assert.equal(pbc.city, 'San Diego');
  assert.equal(pbc.broadcaster, 'DAZN');
  assert.equal(pbc.announced_bouts, 4);
  assert.equal(pbc.plan.event.action, 'would_insert');
  assert.equal(pbc.plan.titles.resolved, 2, 'two interim WBC titles are canonical');
  assert.equal(pbc.plan.fighters.length, 8);
  assert.ok(pbc.plan.bouts.every((b) => b.action === 'would_insert'));

  const mr = receipt.sources.find((s) => s.source_key === 'promoter_matchroom').events.find((e) => e.date === '2026-09-19');
  assert.equal(mr.venue, 'Co-op Live');
  assert.equal(mr.country, 'GB');
  assert.equal(mr.announced_bouts, 8);
  assert.equal(mr.plan.titles.resolved, 0, 'British and Commonwealth belts are not canonical titles here');
  assert.ok(mr.plan.titles.unresolved >= 4, 'and they are kept, not dropped');
});

test('real run: both cards canonicalize, with the source as the provenance of every fact', async () => {
  const receipt = await collectPromoterCards(store, opts({ dryRun: false }));
  for (const s of receipt.sources) {
    for (const e of s.events.filter((x) => x.plan)) {
      assert.equal(e.applied.status, 'applied', `${e.event_name}: ${JSON.stringify(e.applied)}`);
      assert.deepEqual(e.applied.lane_refusals, [], 'an announced card is entirely inside the schedule lane');
    }
  }
  const c = await counts();
  assert.equal(c.events, 2);
  assert.equal(c.bouts, 12, 'four in San Diego, eight in Manchester; the TBD slot is not a bout');
  assert.equal(c.fighters, 24);

  const sd = await one(`select e.name, e.event_date::text, e.start_at, v.name venue, v.city, v.country_code
    from public.boxing_events e join public.boxing_venues v on v.id = e.venue_id where v.city = 'San Diego'`);
  assert.equal(sd.venue, 'Pechanga Arena');
  assert.equal(sd.country_code, 'US');
  assert.equal(sd.event_date, '2026-09-19');
  // the instant that is actually persisted is the corroborated one (8pm ET = 5pm PT), not the page's malformed -05:00
  assert.equal(new Date(sd.start_at).toISOString(), '2026-09-20T00:00:00.000Z');
  const mr = await one(`select e.event_date::text, v.name venue, v.country_code from public.boxing_events e join public.boxing_venues v on v.id = e.venue_id where v.city = 'Manchester'`);
  assert.equal(mr.venue, 'Co-op Live');
  assert.equal(mr.country_code, 'GB');
  assert.equal(mr.event_date, '2026-09-19', 'a UK card and a US card on the same day keep the same announced date');

  // the main event, its distance and its title
  const main = await one(`select b.scheduled_rounds, b.card_segment, w.class_key, o.slug org, t.tier
    from public.boxing_bouts b join public.boxing_bout_titles bt on bt.bout_id = b.id join public.boxing_titles t on t.id = bt.title_id
    join public.boxing_organizations o on o.id = t.organization_id join public.boxing_weight_classes w on w.id = t.weight_class_id
    where b.card_segment = 'main_event' and b.scheduled_rounds = 12`);
  assert.deepEqual([main.org, main.tier, main.class_key], ['wbc', 'interim', 'super_lightweight']);

  // every bout is professional, current scope, and attributed to the promoter page it came from
  const bouts = await q(`select b.competition_class, b.model_scope, b.source_url, s.source_key from public.boxing_bouts b join public.boxing_sources s on s.id = b.source_id`);
  assert.ok(bouts.every((b) => b.competition_class === 'professional' && b.model_scope === 'current'), 'announced pro cards are current scope');
  assert.ok(bouts.every((b) => /^https:\/\/(www\.premierboxingchampions\.com|www\.matchroomboxing\.com)/.test(b.source_url)), 'every bout links to the official page');
  assert.ok(bouts.every((b) => ['promoter_pbc', 'promoter_matchroom'].includes(b.source_key)));
});

test('rerunning the same cards changes nothing: no duplicate event, bout, fighter or observation', async () => {
  const before = await counts();
  const receipt = await collectPromoterCards(store, opts({ dryRun: false }));
  assert.deepEqual(await counts(), before, 'a second pass over an unchanged card writes nothing new');
  for (const s of receipt.sources) for (const e of s.events.filter((x) => x.plan)) {
    assert.equal(e.plan.event.action, 'would_match', `${e.event_name} should now match its own source event id`);
  }
  assert.equal((await one(`select coalesce(jsonb_array_length(public.boxing_possible_duplicate_bouts()), 0) c`)).c, 0);
});

test('operational priority: a televised professional card is P0 even when it carries a world title', async () => {
  const sd = await one(`select e.id from public.boxing_events e join public.boxing_venues v on v.id = e.venue_id where v.city = 'San Diego'`);
  // the broadcaster is a fact of the card; record it the way the event read expects
  await q(`update public.boxing_events set broadcast_notes = 'DAZN' where id = $1`, [sd.id]);
  const p = (await one(`select public.boxing_event_priority($1) r`, [sd.id])).r;
  assert.equal(p.tier, 'P0_major_broadcast', JSON.stringify(p));
  assert.equal(p.world_title, false, 'an interim title is not a world title bout');
  assert.ok(p.score >= 70, JSON.stringify(p.score));

  // strip the broadcaster and the same card falls back to its title tier, keeping the title weight in the score
  await q(`update public.boxing_events set broadcast_notes = null where id = $1`, [sd.id]);
  const noTv = (await one(`select public.boxing_event_priority($1) r`, [sd.id])).r;
  assert.equal(noTv.tier, 'P2_other_title', 'an interim title is a title, not a world title');
  assert.ok(noTv.score < p.score, 'losing the broadcast costs score but keeps the title weight');
  assert.ok(noTv.score >= 60, JSON.stringify(noTv.score));
  await q(`update public.boxing_events set broadcast_notes = 'DAZN' where id = $1`, [sd.id]);

  // a card with no title and no broadcaster ranks below both
  const mr = await one(`select e.id from public.boxing_events e join public.boxing_venues v on v.id = e.venue_id where v.city = 'Manchester'`);
  const q2 = (await one(`select public.boxing_event_priority($1) r`, [mr.id])).r;
  assert.equal(q2.tier, 'P3_professional');
  assert.ok(q2.score < p.score);
});

test('an event with no bouts is never presumed professional', async () => {
  const src = await one(`select id from public.boxing_sources where source_key = 'promoter_pbc'`);
  const ev = await one(`insert into public.boxing_events (source_id, external_event_id, name, event_date, status, source_url)
    values ($1, 'empty-shell', 'Announced, card to follow', current_date + 3, 'announced', 'https://www.premierboxingchampions.com/x') returning id`, [src.id]);
  const p = (await one(`select public.boxing_event_priority($1) r`, [ev.id])).r;
  assert.equal(p.tier, 'P4_unclassified', 'no bouts means no classification evidence');
  assert.equal(p.facts.professional, null);
  assert.ok(p.score <= 30, `an unclassified shell must not score like a professional card: ${p.score}`);

  const health = (await one(`select public.boxing_pro_coverage_health(30) r`)).r;
  const shell = health.events.find((e) => e.name === 'Announced, card to follow');
  assert.ok(shell.gaps.includes('no announced bouts'));
  assert.ok(health.events[0].tier === 'P0_major_broadcast', 'the televised card leads the queue');
});
