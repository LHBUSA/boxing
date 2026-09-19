// The dry-run plan must describe what an apply would actually do — on a first run AND on a repeat.
//
// Before this, planCanonicalization re-resolved every corner on display_name alone. That is fine the first time, when
// nobody is canonical yet. It is wrong the second time: a boxer written as minimum canonical identity (a name and
// nothing else, because the promoters' content lane is closed) cannot be confirmed by name alone, so the plan reported
// every already-written bout as held for identity review. The apply path meanwhile matched them, because it carries the
// source's own identifier and, failing that, short-circuits on the duplicate observation and returns last time's
// resolution.
//
// The plan now reads the same two pieces of established evidence, and falls back to scoring only when neither exists.
// What it must NOT do is auto-resolve anything a human was asked to decide.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';
import { applyCardDocument } from '../../shared/events/card.mjs';
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
const opts = (over = {}) => ({ fetchImpl: fetchFixture, now: NOW, windowDays: 45, maxEvents: 8, sleepImpl: async () => {}, ...over });

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const counts = async () => one(`select
  (select count(*)::int from public.boxing_events) events,
  (select count(*)::int from public.boxing_bouts) bouts,
  (select count(*)::int from public.boxing_fighters) fighters,
  (select count(*)::int from public.boxing_bout_participants) participants,
  (select count(*)::int from public.boxing_venues) venues,
  (select count(*)::int from public.boxing_bout_titles) bout_titles,
  (select count(*)::int from public.boxing_identity_review_queue) review_items`);
const tally = (receipt) => {
  const t = { matched: 0, review: 0, other: 0, already_present: 0, would_insert: 0, held: 0, bases: {} };
  for (const e of receipt.sources.flatMap((s) => s.events).filter((x) => x.plan)) {
    for (const f of e.plan.fighters) {
      t[f.outcome === 'matched' ? 'matched' : f.outcome === 'review' ? 'review' : 'other'] += 1;
      t.bases[f.basis ?? 'none'] = (t.bases[f.basis ?? 'none'] ?? 0) + 1;
    }
    for (const b of e.plan.bouts) {
      if (b.action === 'already_present') t.already_present += 1;
      else if (b.action === 'would_insert') t.would_insert += 1;
      else t.held += 1;
    }
  }
  return t;
};

let firstPlan;
before(async () => {
  db = await freshDatabase('plan_identity_replay');
  store = pgStore(db.client);
});
after(async () => { await db?.close(); });

test('a first dry run forecasts new canonical fighters and bouts, and writes nothing', async () => {
  const before = await counts();
  const r = await collectPromoterCards(store, opts({ dryRun: true }));
  firstPlan = tally(r);
  assert.deepEqual(await counts(), before, 'a dry run writes nothing');

  assert.equal(firstPlan.already_present, 0, 'nothing is present yet');
  assert.ok(firstPlan.would_insert > 0, 'the bouts are forecast as insertable');
  assert.ok(firstPlan.matched === 0, 'nobody is canonical yet, so nobody matches');
  assert.ok(firstPlan.bases.evidence > 0, 'with nothing established, every corner is scored on evidence');
  assert.equal(r.summary.actual_writes, 0);
});

test('after the apply, a repeat dry run recognises the same fighters and reports the bouts already present', async () => {
  const applied = await collectPromoterCards(store, opts({ dryRun: false }));
  const afterApply = await counts();
  assert.ok(afterApply.fighters > 0 && afterApply.bouts > 0, 'the apply wrote the cards');

  const repeat = await collectPromoterCards(store, opts({ dryRun: true }));
  assert.deepEqual(await counts(), afterApply, 'the repeat dry run writes nothing');
  const t = tally(repeat);

  // every corner the apply resolved is recognised again, and on established evidence rather than a fresh guess
  const corners = t.matched + t.review + t.other;
  assert.equal(corners, firstPlan.matched + firstPlan.review + firstPlan.other, 'the same corners are planned');
  assert.ok(t.matched > 0, `nothing was recognised: ${JSON.stringify(t)}`);
  assert.equal(t.other, 0, 'no corner is left unresolved-but-not-review on a replay');
  assert.equal(t.matched + t.review, corners, 'every corner is either recognised or explicitly under review');
  assert.equal(t.bases.evidence ?? 0, 0, 'nothing falls back to scoring once the mapping exists');
  assert.equal(t.bases.observation_replay + (t.bases.external_id ?? 0), t.matched,
    `recognition comes from established evidence: ${JSON.stringify(t.bases)}`);
  assert.equal(t.would_insert, 0, 'nothing is left to insert');
  assert.equal(t.already_present, firstPlan.would_insert, 'every bout the apply wrote now reports already_present');
  assert.equal(t.held, firstPlan.held, 'and the held bouts are exactly the ones held before');
  assert.equal(repeat.summary.actual_writes, 0);

  // the plan now agrees with what an apply actually does
  const second = await collectPromoterCards(store, opts({ dryRun: false }));
  assert.deepEqual(await counts(), afterApply, 'a second apply changes nothing');
  const applyUnresolved = second.sources.flatMap((s) => s.events).filter((e) => e.applied).reduce((n, e) => n + e.applied.unresolved, 0);
  assert.equal(applyUnresolved, t.review, 'the plan predicts exactly the corners the apply leaves unresolved');
  assert.equal(applied.summary.actual_writes > 0, true, 'the first apply did write');
});

test('an unresolved collision stays held on replay and is never auto-resolved', async () => {
  // seed a namesake so the next report of that name is ambiguous
  const existing = await one(`select display_name from public.boxing_fighters order by created_at limit 1`);
  const doc = {
    source_key: 'promoter_matchroom', namespace: 'matchroom', external_id: 'COLL-1', name: 'Collision Card',
    event_date: new Date(Date.now() + 864e5).toISOString().slice(0, 10), status: 'scheduled',
    source_url: 'https://www.matchroomboxing.com/events/collision/',
    venue: { name: 'Collision Hall', city: 'Hull', country_code: 'GB' },
    bouts: [{ external_id: 'COLL-1-b1', bout_order: 1,
      fighter_a: { display_name: existing.display_name },
      fighter_b: { display_name: 'Totally Distinct Opponent' } }],
  };
  const first = await applyCardDocument(store, doc, { now: new Date().toISOString() });
  assert.ok(first.unresolved?.length >= 1, 'the namesake is unresolved');
  const fightersAfter = (await counts()).fighters;

  // replaying the identical payload must return the same review, not quietly promote it to a match
  const again = await applyCardDocument(store, doc, { now: new Date().toISOString() });
  assert.equal((await counts()).fighters, fightersAfter, 'no fighter is created by the replay');
  assert.ok(again.unresolved?.length >= 1, 'and the corner is still unresolved');

  const prior = await one(`select public.boxing_prior_identity_resolutions(jsonb_build_object(
    'source_key', 'promoter_matchroom',
    'content_hashes', (select jsonb_agg(o.content_hash) from public.boxing_source_observations o
                       join public.boxing_sources s on s.id = o.source_id
                       where s.source_key = 'promoter_matchroom' and o.entity_type = 'fighter_identity'))) r`);
  const outcomes = Object.values(prior.r).map((v) => v.outcome);
  assert.ok(outcomes.includes('review'), 'the review decision is what the lookup reports back');
  assert.ok(Object.values(prior.r).every((v) => v.outcome !== 'review' || v.fighter_id === null),
    'a review carries no fighter id, so the plan cannot mistake it for a match');
});

test('an external id cannot attach to a different canonical fighter', async () => {
  const ns = 'idreuse.fighter';
  const a = await one(`insert into public.boxing_fighters (display_name, identity_state) values ('Reuse Boxer One', 'source_native') returning id`);
  const b = await one(`insert into public.boxing_fighters (display_name, identity_state) values ('Reuse Boxer Two', 'source_native') returning id`);
  const src = await one(`select id from public.boxing_sources where source_key = 'promoter_matchroom'`);
  await q(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, verification_state, confidence)
           values ($1, $2, $3, 'reuse-1', 'verified', 100)`, [a.id, src.id, ns]);

  // the map returns exactly one canonical fighter for the id, and it is the one the mapping names
  const map1 = (await one(`select public.boxing_fighter_identity_map($1, $2) r`, [ns, ['reuse-1']])).r;
  assert.equal(map1['reuse-1'], a.id);

  // the same external id cannot be claimed by a second person: the unique mapping refuses it
  await assert.rejects(
    () => q(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, verification_state, confidence)
             values ($1, $2, $3, 'reuse-1', 'verified', 100)`, [b.id, src.id, ns]),
    /duplicate key|unique/i, 'one external id, one canonical fighter');

  // and the map still resolves to the original, never to the challenger
  const map2 = (await one(`select public.boxing_fighter_identity_map($1, $2) r`, [ns, ['reuse-1']])).r;
  assert.equal(map2['reuse-1'], a.id, 'the established mapping wins');
  assert.notEqual(map2['reuse-1'], b.id);
  assert.equal(Object.keys(map2).length, 1, 'and exactly one mapping is returned');
});

test('no placeholder, profile, media or result content is ever planned', async () => {
  const r = await collectPromoterCards(store, opts({ dryRun: true }));
  const fighters = r.sources.flatMap((s) => s.events).filter((e) => e.plan).flatMap((e) => e.plan.fighters);
  assert.deepEqual(fighters.filter((f) => isPlaceholderName(f.name)), [], 'no placeholder is planned as a fighter');

  const bouts = r.sources.flatMap((s) => s.events).filter((e) => e.plan).flatMap((e) => e.plan.bouts);
  assert.deepEqual(bouts.filter((b) => b.pairing.split(' vs ').some((n) => isPlaceholderName(n))), []);

  // the plan carries schedule facts only: no key anywhere in it names profile, media or result content
  const forbidden = /"(dob|hometown|stance|height_cm|reach_cm|nationality|photo|image|media|biography|article|result|scorecard|official|weigh_in)"/;
  assert.equal(forbidden.test(JSON.stringify(r.sources.flatMap((s) => s.events).map((e) => e.plan))), false,
    'the plan contains no profile, media or result field');

  // and nothing of that kind exists in the database from this source either
  const written = await one(`select
    (select count(*)::int from public.boxing_fighter_attribute_claims c join public.boxing_sources s on s.id = c.source_id where s.source_key like 'promoter_%') claims,
    (select count(*)::int from public.boxing_bout_results x join public.boxing_sources s on s.id = x.source_id where s.source_key like 'promoter_%') results,
    (select count(*)::int from public.boxing_scorecards x join public.boxing_sources s on s.id = x.source_id where s.source_key like 'promoter_%') scorecards,
    (select count(*)::int from public.boxing_bout_officials x join public.boxing_sources s on s.id = x.source_id where s.source_key like 'promoter_%') officials,
    (select count(*)::int from public.boxing_weigh_ins x join public.boxing_sources s on s.id = x.source_id where s.source_key like 'promoter_%') weigh_ins`);
  assert.deepEqual(written, { claims: 0, results: 0, scorecards: 0, officials: 0, weigh_ins: 0 });
});
