// Current professional fight week: promoter schedule lanes, discovery candidates and operational priority.
//
// Proves the rules that let a publicly announced professional card reach the product without letting anything else in:
// the schedule lane writes, every other lane from the same promoter fails closed, a discovered card is a candidate and
// never a fight, a candidate that matches an existing event does not duplicate it, professional beats amateur in the
// operational priority, a title card and an imminent card escalate, and a missing major card raises an alert.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase, expectPgError, setSourceLane } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCardDocument } from '../../shared/events/card.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const f = (id, name) => ({ external_id: id, display_name: name });
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const card = (over = {}) => ({
  source_key: 'promoter_matchroom', namespace: 'matchroom', external_id: 'MR-1', name: 'Matchroom Boxing at Co-op Live',
  event_date: day(1), status: 'scheduled', source_url: 'https://www.matchroomboxing.com/events/example/',
  venue: { name: 'Co-op Live', city: 'Manchester', country_code: 'GB' },
  bouts: [{ external_id: 'MR-1-m1', bout_order: 1, scheduled_rounds: 12, fighter_a: f('mr-a', 'Card Headliner'), fighter_b: f('mr-b', 'Card Challenger') }],
  ...over,
});

before(async () => {
  db = await freshDatabase('promoter_schedule');
  store = pgStore(db.client);
});
after(async () => { await db?.close(); });

test('the schedule lane is approved for both promoters; every other lane from them is refused', async () => {
  for (const key of ['promoter_pbc', 'promoter_matchroom']) {
    const [s] = (await one(`select public.boxing_source_registry_json($1) r`, [key])).r;
    assert.equal(s.enabled, true, key);
    assert.equal(s.access_mode, 'approved_ingest', key);
    const lane = (k) => s.lanes.find((l) => l.lane === k);
    for (const k of ['events', 'upcoming_cards', 'bouts', 'venues', 'promoters', 'broadcasters', 'titles_at_stake']) {
      assert.equal(lane(k)?.rights_scope, 'covered_by_rights_review', `${key} ${k}`);
    }
    for (const k of ['results', 'scorecard_totals', 'judges', 'referees', 'weigh_ins', 'photos', 'video', 'article_text']) {
      assert.equal(lane(k)?.rights_scope, 'not_permitted', `${key} ${k}`);
      assert.equal(lane(k)?.redistribution_allowed, 'prohibited', `${key} ${k}`);
    }
    // schedule permission is not image permission
    assert.equal(lane('photos').availability, 'not_permitted', key);
    const review = s.latest_rights_review;
    assert.equal(review.decision, 'approved_with_restrictions', key);
    assert.ok(review.prohibited_uses.some((u) => /photograph/i.test(u)), key);
  }
});

test('an announced card writes through the schedule lane; a result from the same promoter fails closed', async () => {
  const applied = await applyCardDocument(store, card(), { now: new Date().toISOString() });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.changes.filter((c) => c.change_type === 'bout_added').length, 1, 'the announced bout is canonical');
  assert.equal(applied.lane_refusals ?? undefined, undefined, 'nothing in an announced card is outside the schedule lane');
  const bout = await one(`select b.id, b.competition_class from public.boxing_bouts b limit 1`);
  assert.equal(bout.competition_class, 'professional');

  const winner = (await one(`select fighter_id from public.boxing_bout_participants where bout_id = $1 and side = 'a'`, [bout.id])).fighter_id;
  await expectPgError(() => q(`insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, result_state, source_url, revision)
    values ($1, (select id from public.boxing_sources where source_key = 'promoter_matchroom'), 'win', $2, 'KO', 'official', 'https://www.matchroomboxing.com/x/', 1)`,
    [bout.id, winner]), { code: 'BX140', match: /lane_not_rights_approved: results/ });
});

test('replaying the rights-lane scope note does not append it twice', async () => {
  // Migration 0045 appends a scope sentence to nj_sacb.rights_note. Appending is the one shape in the chain that
  // silently drifts on a rerun, so the statement carries its own guard and this pins it.
  const note = async () => (await one(`select rights_note from public.boxing_sources where source_key = 'nj_sacb'`)).rights_note;
  const sentence = 'Scope 2026-09-15: schedule facts only.';
  const first = await note();
  assert.equal(first.split(sentence).length - 1, 1, 'the sentence is present exactly once after the chain runs');

  const replay = `update public.boxing_sources set rights_note = coalesce(rights_note || ' | ', '')
    || 'Scope 2026-09-15: schedule facts only. Result, official, scorecard, weigh-in and suspension lanes are unresolved and fail closed until re-reviewed.'
    where source_key = 'nj_sacb' and coalesce(rights_note, '') not like '%Scope 2026-09-15: schedule facts only.%'`;
  await q(replay);
  await q(replay);
  assert.equal(await note(), first, 'replaying the statement changes nothing');
});

test('the lane gate charges an official to the lane that actually covers them', async () => {
  // boxing_lane_rights_guard takes (default_lane, column, value, lane_when_equal). The officials trigger is declared
  // ('referees','role','judge','judges'), so a judge must be charged to the JUDGES lane and everyone else to REFEREES.
  // Getting this backwards is invisible while both lanes sit in the same state, and silently mis-gates the moment they
  // do not — so it is pinned here with one lane open and the other closed.
  const src = await one(`select id from public.boxing_sources where source_key = 'promoter_matchroom'`);
  const open = async (lane, scope) => {
    const prior = await one(`select id from public.boxing_source_capabilities_current where source_id = $1 and lane = $2`, [src.id, lane]);
    await q(`insert into public.boxing_source_capabilities (source_id, lane, availability, rights_scope, coverage_basis,
      acquisition_method, cadence, completeness, confidence, notes, evidence, recorded_by, supersedes_id)
      values ($1, $2, 'provided', $3, 'source_index_documented', 'html', 'daily', 'partial', 'high', 'test: lane state', '{}'::jsonb, 'test', $4)`,
    [src.id, lane, scope, prior?.id ?? null]);
  };
  await open('judges', 'covered_by_rights_review');   // judges permitted
  await open('referees', 'not_permitted');            // referees refused

  const bout = await one(`select id from public.boxing_bouts limit 1`);
  const official = await one(`insert into public.boxing_officials (display_name, official_type) values ('Lane Test Official', 'judge') returning id`);
  const insert = (role) => q(`insert into public.boxing_bout_officials (bout_id, official_id, role, source_id, source_url)
    values ($1, $2, $3, $4, 'https://www.matchroomboxing.com/x/')`, [bout.id, official.id, role, src.id]);

  await insert('judge');  // charged to the open judges lane -> permitted
  await expectPgError(() => insert('referee'), { code: 'BX140', match: /lane_not_rights_approved: referees/ });

  // put both lanes back where the rights review left them
  await open('judges', 'not_permitted');
  await open('referees', 'not_permitted');
  await q(`delete from public.boxing_bout_officials where official_id = $1`, [official.id]);
});

test('a discovered card is a candidate, never a fight; a match to an existing event does not duplicate it', async () => {
  const eventsBefore = (await one(`select count(*)::int c from public.boxing_events`)).c;
  const r = (await one(`select public.boxing_record_event_candidate($1) r`, [{
    source_key: 'promoter_pbc', external_key: 'pbc/san-diego-example', discovered_name: 'PBC at Pechanga Arena',
    probable_date: day(1), probable_city: 'San Diego', probable_country: 'US', probable_promoter: 'Premier Boxing Champions',
    probable_broadcaster: 'DAZN', source_url: 'https://www.premierboxingchampions.com/events/example', confidence: 'high',
  }])).r;
  assert.equal(r.state, 'open', 'nothing matched it yet');
  assert.equal(r.matched_event, null);
  assert.equal((await one(`select count(*)::int c from public.boxing_events`)).c, eventsBefore, 'a candidate creates no event');
  assert.equal((await one(`select count(*)::int c from public.boxing_bouts`)).c, 1, 'and no bout');

  // the same card discovered again, once the canonical event exists, matches instead of duplicating
  const known = await one(`select e.id, e.event_date, v.city from public.boxing_events e join public.boxing_venues v on v.id = e.venue_id limit 1`);
  const again = (await one(`select public.boxing_record_event_candidate($1) r`, [{
    source_key: 'promoter_matchroom', external_key: 'matchroom/co-op-live-example', discovered_name: 'Matchroom Boxing at Co-op Live',
    probable_date: known.event_date, probable_city: known.city, source_url: 'https://www.matchroomboxing.com/events/example/', confidence: 'high',
  }])).r;
  assert.equal(again.state, 'matched');
  assert.equal(again.matched_event, known.id);
  assert.equal((await one(`select count(*)::int c from public.boxing_events`)).c, eventsBefore, 'still no new event');
});

test('operational priority: professional beats amateur, a title bout and an imminent date escalate', async () => {
  const pro = (await one(`select e.id from public.boxing_events e limit 1`)).id;
  const proPriority = (await one(`select public.boxing_event_priority($1) r`, [pro])).r;
  assert.ok(proPriority.score >= 40, JSON.stringify(proPriority));
  assert.ok(['P0_major_broadcast', 'P1_world_title', 'P2_other_title', 'P3_professional'].includes(proPriority.tier), proPriority.tier);
  assert.equal(proPriority.facts.professional, true);

  // the same shape of card, amateur and further out, must rank below it
  const am = await applyCardDocument(store, card({ external_id: 'MR-2', name: 'Development Show', event_date: day(9),
    source_url: 'https://www.matchroomboxing.com/events/dev/',
    venue: { name: 'Small Hall', city: 'Leeds', country_code: 'GB' },
    bouts: [{ external_id: 'MR-2-m1', bout_order: 1, scheduled_rounds: 4, fighter_a: f('mr-c', 'Novice One'), fighter_b: f('mr-d', 'Novice Two') }] }),
  { now: new Date().toISOString() });
  assert.equal(am.status, 'applied');
  const amId = (await one(`select id from public.boxing_events where name = 'Development Show'`)).id;
  await q(`update public.boxing_bouts set competition_class = 'amateur' where event_id = $1`, [amId]);
  const amPriority = (await one(`select public.boxing_event_priority($1) r`, [amId])).r;
  assert.equal(amPriority.tier, 'P5_amateur_or_exhibition');
  assert.ok(amPriority.score < proPriority.score, `amateur ${amPriority.score} must rank below professional ${proPriority.score}`);
});

test('coverage health lists every upcoming event with its gaps and raises MAJOR_PRO_CARD_MISSING for an unmatched card', async () => {
  const h = (await one(`select public.boxing_pro_coverage_health(14) r`)).r;
  assert.equal(h.rule, 'pbe_pro_coverage_health@1');
  assert.ok(h.canonical_events >= 2, JSON.stringify(h.canonical_events));
  assert.equal(h.open_discovery_candidates, 1, 'the PBC card is discovered but not canonical');
  assert.equal(h.alerts.length, 1);
  assert.equal(h.alerts[0].alert, 'MAJOR_PRO_CARD_MISSING');
  assert.equal(h.alerts[0].probable_city, 'San Diego');
  assert.match(h.alerts[0].source_url, /^https:\/\/www\.premierboxingchampions\.com/);
  const headline = h.events[0];
  assert.ok(headline.gaps.includes('no matched market'), JSON.stringify(headline.gaps));
  assert.ok(headline.gaps.includes('no portrait for any fighter'), JSON.stringify(headline.gaps));
  // events are ordered by operational score, so the professional card leads the amateur one
  assert.ok(h.events.findIndex((e) => e.tier === 'P5_amateur_or_exhibition') > 0);
});

test('the history gates are untouched by this lane', async () => {
  const scope = (await one(`select public.boxing_model_scope_check() r`)).r;
  assert.equal(scope.archive_scope_ingest_enabled, false);
  assert.equal(Number(scope.bouts_by_scope.archive ?? 0), 0);
  assert.equal(scope.models_opted_into_archive, 0);
  const bouts = await q(`select competition_class, model_scope from public.boxing_bouts`);
  assert.ok(bouts.every((b) => b.model_scope === 'current'), 'a promoter card is current scope');
});
