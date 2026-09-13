// Issue #3 acceptance against a real database. Every person, promoter,
// commission, venue and bout here is synthetic.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCardDocument } from '../../shared/events/card.mjs';
import { recordRegulatoryAction, recordResult, recordScorecards, recordWeighIn } from '../../shared/events/outcomes.mjs';
import { recordTitleEvent } from '../../shared/titles/events.mjs';

let db;
let store;
const SRC = 'promo_feed_fixture';
const q = async (sql, params) => (await db.client.query(sql, params)).rows;

// Distinct synthetic names per bout: near-identical names would (correctly) be
// held for review by the officials resolver.
const OFFICIAL_NAMES = {
  b1: ['Harold Vance', 'Miriam Castellanos', 'Theo Brandt', 'Yusuf Karim'],
  b2: ['Clara Holm', 'Desmond Oyelaran', 'Ingrid Salo', 'Pavel Novak'],
  b5: ['Rosa Delgado', 'Kenji Arai', 'Fiona Blake', 'Samuel Achebe'],
};
const officials = (bout) => [
  { role: 'referee', display_name: OFFICIAL_NAMES[bout][0], external_id: `ref-${bout}`, country_code: 'US' },
  { role: 'judge', slot: 1, display_name: OFFICIAL_NAMES[bout][1], external_id: `j1-${bout}`, country_code: 'US' },
  { role: 'judge', slot: 2, display_name: OFFICIAL_NAMES[bout][2], external_id: `j2-${bout}`, country_code: 'US' },
  { role: 'judge', slot: 3, display_name: OFFICIAL_NAMES[bout][3], external_id: `j3-${bout}`, country_code: 'GB' },
];
const f = (id, name) => ({ external_id: id, display_name: name });

const cardV1 = () => ({
  source_key: SRC, namespace: 'promo', external_id: 'E1', name: 'Synthetic Fight Night', event_date: '2026-11-07', status: 'scheduled',
  source_url: 'https://example.invalid/card/E1',
  commission: { slug: 'test_state_ac', name: 'Test State Athletic Commission', country_code: 'US' },
  venue: { name: 'Harbor Arena', city: 'Testville', country_code: 'US' },
  organizations: [
    { slug: 'apex_promotions', name: 'Apex Promotions', kind: 'promoter', role: 'promoter' },
    { slug: 'streamco', name: 'StreamCo', kind: 'broadcaster', role: 'broadcaster' },
    { slug: 'wbc', role: 'sanctioning_body' },
  ],
  bouts: [
    { external_id: 'b1', bout_order: 1, card_segment: 'main_event', weight_class_key: 'welterweight', contracted_weight_lb: 147, scheduled_rounds: 12,
      fighter_a: f('f-ruiz', 'Marco Ruiz'), fighter_b: f('f-patel', 'Dev Patel'),
      titles: [{ organization_slug: 'wbc', tier: 'world' }, { organization_slug: 'ibf', tier: 'world' }], officials: officials('b1') },
    { external_id: 'b2', bout_order: 2, card_segment: 'co_main', weight_class_key: 'super_lightweight', contracted_weight_lb: 142, is_catchweight: true, scheduled_rounds: 10,
      fighter_a: f('f-hassan', 'Tariq Hassan'), fighter_b: f('f-price', 'Owen Price'), officials: officials('b2') },
    { external_id: 'b3', bout_order: 3, weight_class_key: 'bantamweight', scheduled_rounds: 8, fighter_a: f('f-lima', 'Ana Lima'), fighter_b: f('f-obi', 'Joy Obi') },
    { external_id: 'b4', bout_order: 4, weight_class_key: 'middleweight', scheduled_rounds: 6, fighter_a: f('f-stone', 'Rick Stone'), fighter_b: f('f-vega', 'Hugo Vega') },
    { external_id: 'b5', bout_order: 5, weight_class_key: 'lightweight', scheduled_rounds: 10, contracted_weight_lb: 135,
      fighter_a: f('f-cole', 'Nate Cole'), fighter_b: f('f-ash', 'Ben Ash'), officials: officials('b5') },
  ],
});

let v1;
const bout = async (ext) => (await q(`select bout_id from public.boxing_bout_identities where namespace = 'promo.bout' and external_id = $1`, [ext]))[0].bout_id;
const fighter = async (ext) => (await q(`select fighter_id from public.boxing_fighter_identities where namespace = 'promo.fighter' and external_id = $1`, [ext]))[0].fighter_id;
const official = async (ext) => (await q(`select official_id from public.boxing_official_identities where namespace = 'promo.official' and external_id = $1`, [ext]))[0].official_id;

before(async () => {
  db = await freshDatabase('events');
  store = pgStore(db.client);
  await testSource(db.client, SRC, { source_kind: 'promotion' });
  v1 = await applyCardDocument(store, cardV1());
});
after(async () => { await db?.close(); });

test('announcement: event, roles, bouts, titles, officials; FIGHT_ANNOUNCED per bout', async () => {
  assert.equal(v1.status, 'applied');
  assert.deepEqual(v1.unresolved, []);
  const types = v1.news.map((n) => n.event_type).sort();
  assert.equal(types.filter((t) => t === 'FIGHT_ANNOUNCED').length, 5);
  assert.equal(types.filter((t) => t === 'OFFICIALS_ASSIGNED').length, 3);
  const roles = await q(`select o.slug, o.organization_kind, eo.role from public.boxing_event_organizations eo join public.boxing_organizations o on o.id = eo.organization_id order by eo.role`);
  assert.deepEqual(roles.map((r) => `${r.role}:${r.slug}:${r.organization_kind}`), ['broadcaster:streamco:broadcaster', 'promoter:apex_promotions:promoter', 'sanctioning_body:wbc:sanctioning_body']);
  const [evt] = await q(`select e.status, c.slug commission, v.name venue from public.boxing_events e join public.boxing_commissions c on c.id = e.commission_id join public.boxing_venues v on v.id = e.venue_id`);
  assert.deepEqual(evt, { status: 'scheduled', commission: 'test_state_ac', venue: 'Harbor Arena' }, 'commission is its own entity, not an organization role');
  const titles = await q(`select count(*)::int n from public.boxing_bout_titles where bout_id = $1 and at_stake`, [await bout('b1')]);
  assert.equal(titles[0].n, 2, 'one bout contests multiple titles');
  const [b2] = await q(`select is_catchweight, contracted_weight_lb::text from public.boxing_bouts where id = $1`, [await bout('b2')]);
  assert.deepEqual(b2, { is_catchweight: true, contracted_weight_lb: '142.00' });
});

test('re-applying the same card is a no-op', async () => {
  const before = await q(`select (select count(*) from public.boxing_card_changes)::int c, (select count(*) from public.boxing_news_events)::int n, (select count(*) from public.boxing_bouts)::int b`);
  const again = await applyCardDocument(store, cardV1());
  assert.equal(again.changes.length, 0);
  assert.deepEqual(await q(`select (select count(*) from public.boxing_card_changes)::int c, (select count(*) from public.boxing_news_events)::int n, (select count(*) from public.boxing_bouts)::int b`), before);
});

test('card changes: replacement, date moved, commission correction, judge replacement, title removed — history retained', async () => {
  const v2 = cardV1();
  v2.event_date = '2026-11-14';
  v2.commission = { slug: 'test_state_ac_2', name: 'Test State Boxing Commission' };
  v2.bouts[1].fighter_b = f('f-ferri', 'Luca Ferri');
  v2.bouts[0].officials = officials('b1').map((o) => (o.slot === 3 ? { role: 'judge', slot: 3, display_name: 'Lena Fischer', external_id: 'j4-b1', country_code: 'CA' } : o));
  v2.bouts[0].titles = [{ organization_slug: 'wbc', tier: 'world' }];
  const r = await applyCardDocument(store, v2);
  const types = r.changes.map((c) => c.change_type).sort();
  assert.deepEqual(types, ['commission_changed', 'event_postponed', 'official_replaced', 'opponent_replaced', 'title_removed']);
  assert.deepEqual(r.news.map((n) => n.event_type).sort(), ['EVENT_POSTPONED', 'OFFICIALS_ASSIGNED', 'OPPONENT_REPLACED', 'TITLE_STATUS_CHANGED']);

  const b2 = await bout('b2');
  const parts = await q(`select f.display_name, p.side, p.participant_status from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id where p.bout_id = $1 order by p.side, p.participant_status`, [b2]);
  assert.deepEqual(parts.map((p) => `${p.side}:${p.display_name}:${p.participant_status}`), ['a:Tariq Hassan:scheduled', 'b:Owen Price:replaced', 'b:Luca Ferri:scheduled']);

  const log = await q(`select change_type, before_state, after_state from public.boxing_card_changes where change_type in ('event_postponed','commission_changed','opponent_replaced') and before_state is not null and (change_type <> 'commission_changed' or before_state ->> 'commission_id' is not null) order by change_type`);
  assert.equal(log.find((l) => l.change_type === 'event_postponed').before_state.event_date, '2026-11-07');
  assert.equal(log.find((l) => l.change_type === 'commission_changed').before_state.commission_slug, 'test_state_ac');
  assert.equal(log.find((l) => l.change_type === 'opponent_replaced').before_state.fighter_id, await fighter('f-price'));
  const [evt] = await q(`select e.event_date::text, c.slug from public.boxing_events e join public.boxing_commissions c on c.id = e.commission_id`);
  assert.deepEqual(evt, { event_date: '2026-11-14', slug: 'test_state_ac_2' });

  const judges = await q(`select o.display_name, bo.assignment_state from public.boxing_bout_officials bo join public.boxing_officials o on o.id = bo.official_id where bo.bout_id = $1 and bo.role = 'judge' order by bo.slot, bo.assignment_state`, [await bout('b1')]);
  assert.deepEqual(judges.map((j) => `${j.display_name}:${j.assignment_state}`), ['Miriam Castellanos:assigned', 'Theo Brandt:assigned', 'Lena Fischer:assigned', 'Yusuf Karim:replaced']);
  await expectPgError(() => q('delete from public.boxing_card_changes'), { code: 'BX001' });
});

test('odds matching only sees active corners after a replacement', async () => {
  const bouts = await store.boutsInWindow('2026-11-01T00:00:00Z', '2026-11-30T00:00:00Z');
  const b2 = bouts.find((b) => b.bout_id === v1.changes.find((c) => c.change_type === 'bout_added' && c.after_state.external_id === 'b2').bout_id);
  assert.deepEqual(b2.participants.map((p) => p.display_name).sort(), ['Luca Ferri', 'Tariq Hassan']);
});

test('title fight changed to non-title: the removed belt cannot be won in that bout', async () => {
  const b1 = await bout('b1');
  const ibf = (await q(`select t.id from public.boxing_titles t join public.boxing_organizations o on o.id = t.organization_id where o.slug = 'ibf' and t.tier = 'world'`))[0].id;
  const [row] = await q(`select at_stake from public.boxing_bout_titles where bout_id = $1 and title_id = $2`, [b1, ibf]);
  assert.equal(row.at_stake, false);
  await expectPgError(() => recordTitleEvent(store, { title_id: ibf, event_type: 'won', fighter_id: v1Fighter.ruiz, effective_on: '2026-11-14', bout_id: b1, source_key: SRC }), { code: 'BX081' });
});
const v1Fighter = {};

test('weigh-ins: verified miss emits WEIGHT_MISSED; unverified does not; catchweight measured against contract', async () => {
  v1Fighter.ruiz = await fighter('f-ruiz');
  v1Fighter.patel = await fighter('f-patel');
  const b1 = await bout('b1');
  const made = await recordWeighIn(store, { bout_id: b1, fighter_id: v1Fighter.ruiz, official_weight_lb: 146.8, verification_state: 'verified', source_key: SRC, source_url: 'https://example.invalid/w' });
  assert.equal(made.news.event_type, 'WEIGH_IN_RESULT');
  const rumour = await recordWeighIn(store, { bout_id: b1, fighter_id: v1Fighter.patel, official_weight_lb: 149, verification_state: 'unverified', source_key: SRC });
  assert.equal(rumour.news, null, 'an unverified report is stored but not announced');
  const miss = await recordWeighIn(store, { bout_id: b1, fighter_id: v1Fighter.patel, official_weight_lb: 148.2, verification_state: 'verified', source_key: SRC, source_url: 'https://example.invalid/w' });
  assert.equal(miss.news.event_type, 'WEIGHT_MISSED');
  assert.equal(miss.news.payload.facts.miss_lb, 1.2);
  assert.equal(miss.news.payload.facts.title_consequence, null, 'title consequences are not inferred');
  const [rows] = await q(`select count(*)::int n from public.boxing_weigh_ins where bout_id = $1 and fighter_id = $2`, [b1, v1Fighter.patel]);
  assert.equal(rows.n, 2, 'the unverified reading is kept as history, superseded by the verified one');
  const second = await recordWeighIn(store, { bout_id: b1, fighter_id: v1Fighter.patel, attempt_no: 2, official_weight_lb: 147, verification_state: 'verified', source_key: SRC });
  assert.equal(second.news.event_type, 'WEIGH_IN_RESULT');

  const b2 = await bout('b2');
  const ferri = await recordWeighIn(store, { bout_id: b2, fighter_id: await fighter('f-ferri'), official_weight_lb: 141.8, verification_state: 'verified', source_key: SRC });
  assert.equal(ferri.news.payload.facts.status, 'made_weight', '141.8 is over the 140 division limit but under the 142 contract');
  assert.equal(ferri.news.payload.facts.is_catchweight, true);
  const rehyd = await recordWeighIn(store, { bout_id: b1, fighter_id: v1Fighter.ruiz, weigh_in_kind: 'rehydration_check', official_weight_lb: 158, contracted_weight_lb: 157, verification_state: 'verified', source_key: SRC });
  assert.equal(rehyd.news.event_type, 'WEIGH_IN_RESULT', 'rehydration check is reported, not WEIGHT_MISSED');
});

test('sourced title eligibility after a weight miss', async () => {
  const v3 = cardV1();
  v3.event_date = '2026-11-14';
  v3.commission = { slug: 'test_state_ac_2' };
  v3.bouts[1].fighter_b = f('f-ferri', 'Luca Ferri');
  v3.bouts[0].officials = officials('b1').map((o) => (o.slot === 3 ? { role: 'judge', slot: 3, display_name: 'Lena Fischer', external_id: 'j4-b1', country_code: 'CA' } : o));
  v3.bouts[0].titles = [{ organization_slug: 'wbc', tier: 'world', eligible_side: 'a' }];
  const r = await applyCardDocument(store, v3);
  assert.deepEqual(r.changes.map((c) => c.change_type), ['title_eligibility_changed']);
  assert.equal(r.news[0].requires_human_review, true);
  const wbc = (await q(`select t.id from public.boxing_titles t join public.boxing_organizations o on o.id = t.organization_id where o.slug = 'wbc' and t.tier = 'world' and t.weight_class_id = (select id from public.boxing_weight_classes where class_key = 'welterweight')`))[0].id;
  const b1 = await bout('b1');
  await expectPgError(() => recordTitleEvent(store, { title_id: wbc, event_type: 'won', fighter_id: v1Fighter.patel, effective_on: '2026-11-14', bout_id: b1, source_key: SRC }), { code: 'BX082' });
});

const rounds12 = (aWins) => Array.from({ length: 12 }, (_, i) => ({ round: i + 1, a: i < aWins ? 10 : 9, b: i < aWins ? 9 : 10 }));

test('split decision with three judges, round by round; the replaced judge cannot score', async () => {
  const b1 = await bout('b1');
  const [j1, j2, j4, j3] = [await official('j1-b1'), await official('j2-b1'), await official('j4-b1'), await official('j3-b1')];
  await expectPgError(() => recordScorecards(store, { bout_id: b1, source_key: SRC, cards: [{ judge_id: j3, a_total: 115, b_total: 113, rounds: rounds12(7) }] }), { code: 'BX083' });
  const s = await recordScorecards(store, { bout_id: b1, source_key: SRC, source_url: 'https://example.invalid/cards', cards: [
    { judge_id: j1, slot: 1, a_total: 115, b_total: 113, rounds: rounds12(7), score_basis: 'after_deductions' },
    { judge_id: j2, slot: 2, a_total: 113, b_total: 115, rounds: rounds12(5), score_basis: 'after_deductions' },
    { judge_id: j4, slot: 3, a_total: 116, b_total: 112, rounds: rounds12(8), score_basis: 'after_deductions' },
  ] });
  assert.deepEqual(s.problems, []);
  assert.equal(s.news.event_type, 'SCORECARD_POSTED');
  assert.equal(s.news.payload.facts.classification.decision_type, 'split');
  const r = await recordResult(store, { bout_id: b1, outcome: 'win', winner_id: v1Fighter.ruiz, method: 'DECISION', decision_type: 'split', round: 12, source_key: SRC, source_url: 'https://example.invalid/result' });
  assert.equal(r.news.event_type, 'RESULT_OFFICIAL');
  assert.deepEqual(r.problems, []);
  assert.equal(r.news.requires_human_review, false);
});

test('scorecard correction by the commission: new revision, original kept, superseding news', async () => {
  const b1 = await bout('b1');
  const j2 = await official('j2-b1');
  const fixed = await recordScorecards(store, { bout_id: b1, source_key: SRC, change_reason: 'commission corrected an addition error (synthetic)', cards: [
    { judge_id: j2, slot: 2, a_total: 112, b_total: 116, rounds: rounds12(4), score_basis: 'after_deductions' },
  ] });
  assert.equal(fixed.written[0].status, 'revised');
  assert.equal(fixed.news.payload.facts.is_correction, true);
  assert.ok(fixed.news.supersedes_dedupe_key);
  const cards = await q(`select revision, card_state, fighter_b_total::text from public.boxing_scorecards where bout_id = $1 and judge_id = $2 order by revision`, [b1, j2]);
  assert.deepEqual(cards, [{ revision: 1, card_state: 'official', fighter_b_total: '115.0' }, { revision: 2, card_state: 'corrected', fighter_b_total: '116.0' }]);
  const again = await recordScorecards(store, { bout_id: b1, source_key: SRC, cards: [{ judge_id: j2, slot: 2, a_total: 112, b_total: 116, rounds: rounds12(4) }] });
  assert.equal(again.news, null, 'identical re-delivery is a no-op');
});

test('a result that contradicts the cards is stored for review, not silently fixed', async () => {
  const b5 = await bout('b5');
  const [k1, k2, k3] = [await official('j1-b5'), await official('j2-b5'), await official('j3-b5')];
  const r10 = (aRounds, draws = 0) => Array.from({ length: 10 }, (_, i) => (i < draws ? { round: i + 1, a: 10, b: 10 } : { round: i + 1, a: i < aRounds + draws ? 10 : 9, b: i < aRounds + draws ? 9 : 10 }));
  await recordScorecards(store, { bout_id: b5, source_key: SRC, cards: [
    { judge_id: k1, slot: 1, a_total: 95, b_total: 95, rounds: r10(0, 10).map((r, i) => (i < 5 ? { ...r, a: 10, b: 9 } : { ...r, a: 9, b: 10 })) },
    { judge_id: k2, slot: 2, a_total: 95, b_total: 95, rounds: r10(0, 10).map((r, i) => (i < 5 ? { ...r, a: 10, b: 9 } : { ...r, a: 9, b: 10 })) },
    { judge_id: k3, slot: 3, a_total: 96, b_total: 94, rounds: r10(0, 10).map((r, i) => (i < 6 ? { ...r, a: 10, b: 9 } : { ...r, a: 9, b: 10 })) },
  ] });
  const wrong = await recordResult(store, { bout_id: b5, outcome: 'win', winner_id: await fighter('f-cole'), method: 'DECISION', decision_type: 'majority', source_key: SRC });
  assert.ok(wrong.problems.length > 0);
  assert.equal(wrong.news.requires_human_review, true);
  const right = await recordResult(store, { bout_id: b5, outcome: 'draw', method: 'DECISION', decision_type: 'majority', result_state: 'amended', change_reason: 'result entry corrected (synthetic)', source_key: SRC });
  assert.equal(right.revision, 2);
  assert.equal(right.news.event_type, 'RESULT_OVERTURNED');
  assert.deepEqual(right.problems, []);
});

test('technical decision, disqualification and no contest', async () => {
  const b2 = await bout('b2');
  const [k1, k2, k3] = [await official('j1-b2'), await official('j2-b2'), await official('j3-b2')];
  const five = (a) => Array.from({ length: 5 }, (_, i) => ({ round: i + 1, a: i < a ? 10 : 9, b: i < a ? 9 : 10 }));
  const even = Array.from({ length: 5 }, (_, i) => ({ round: i + 1, ...(i === 0 ? { a: 10, b: 10 } : i < 3 ? { a: 10, b: 9 } : { a: 9, b: 10 }) }));
  const cards = await recordScorecards(store, { bout_id: b2, source_key: SRC, stopped_round: 5, cards: [
    { judge_id: k1, slot: 1, a_total: 49, b_total: 46, rounds: five(4).map((r) => (r.round === 5 ? { ...r, a: 10, b: 8 } : r)).map((r, i) => (i === 4 ? { ...r, a: 9, b: 10 } : r)) },
    { judge_id: k2, slot: 2, a_total: 48, b_total: 47, rounds: five(4) },
    { judge_id: k3, slot: 3, a_total: 47, b_total: 47, rounds: even },
  ] });
  assert.ok(cards.problems.some((p) => /do not equal/.test(p)), 'an inconsistent card is flagged');
  const td = await recordResult(store, { bout_id: b2, outcome: 'win', winner_id: await fighter('f-hassan'), method: 'TECHNICAL_DECISION', decision_type: 'majority', round: 5, time_sec: 95, source_key: SRC });
  assert.equal(td.status, 'created');

  const b3 = await bout('b3');
  const dq = await recordResult(store, { bout_id: b3, outcome: 'win', winner_id: await fighter('f-obi'), method: 'DQ', round: 7, time_sec: 30, change_reason: null, source_key: SRC });
  assert.equal(dq.news.event_type, 'RESULT_OFFICIAL');
  const b4 = await bout('b4');
  const nc = await recordResult(store, { bout_id: b4, outcome: 'no_contest', method: 'NO_CONTEST', round: 2, source_key: SRC });
  assert.equal(nc.status, 'created');
  const price = await fighter('f-price');
  await expectPgError(() => recordResult(store, { bout_id: b4, outcome: 'win', winner_id: price, method: 'KO', source_key: SRC }), { code: 'BX080' });
});

test('overturned result (e.g. commission ruling) appends a revision and needs review', async () => {
  const b1 = await bout('b1');
  const r = await recordResult(store, { bout_id: b1, outcome: 'no_contest', method: 'NO_CONTEST', result_state: 'overturned', change_reason: 'commission ruling (synthetic)', source_key: SRC, source_url: 'https://example.invalid/ruling' });
  assert.equal(r.news.event_type, 'RESULT_OVERTURNED');
  assert.equal(r.news.requires_human_review, true);
  const history = await q(`select revision, outcome, result_state from public.boxing_bout_results where bout_id = $1 order by revision`, [b1]);
  assert.deepEqual(history, [{ revision: 1, outcome: 'win', result_state: 'official' }, { revision: 2, outcome: 'no_contest', result_state: 'overturned' }]);
});

test('public suspensions only: a public source is required, detail is bounded, news needs review', async () => {
  const patel = v1Fighter.patel;
  await expectPgError(() => recordRegulatoryAction(store, { action_key: 'susp-1', fighter_id: patel, action_type: 'suspension', status: 'active', source_key: SRC, commission_slug: 'test_state_ac_2' }), { code: '23514' });
  await expectPgError(() => recordRegulatoryAction(store, { action_key: 'susp-1', fighter_id: patel, action_type: 'suspension', status: 'active', source_key: SRC,
    source_url: 'https://example.invalid/susp', reason_public: 'x'.repeat(400) }), { code: '23514' });
  const s = await recordRegulatoryAction(store, { action_key: 'susp-1', fighter_id: patel, action_type: 'suspension', status: 'active', effective_from: '2026-11-14T00:00:00Z',
    effective_to: '2026-12-14T00:00:00Z', reason_public: 'mandatory post-fight suspension (synthetic)', source_key: SRC, source_url: 'https://example.invalid/susp', commission_slug: 'test_state_ac_2' });
  assert.equal(s.news.event_type, 'SUSPENSION_POSTED');
  assert.equal(s.news.requires_human_review, true);
  const lifted = await recordRegulatoryAction(store, { action_key: 'susp-1', fighter_id: patel, action_type: 'suspension', status: 'cleared', effective_from: '2026-11-14T00:00:00Z',
    effective_to: '2026-12-14T00:00:00Z', reason_public: 'mandatory post-fight suspension (synthetic)', source_key: SRC, source_url: 'https://example.invalid/susp2', commission_slug: 'test_state_ac_2' });
  assert.equal(lifted.status, 'revised');
  const rows = await q(`select revision, status from public.boxing_regulatory_actions where fighter_id = $1 order by revision`, [patel]);
  assert.deepEqual(rows, [{ revision: 1, status: 'active' }, { revision: 2, status: 'cleared' }]);
});

test('official identities are canonical and not created twice for the same external id', async () => {
  const [row] = await q(`select count(*)::int n from public.boxing_officials where display_name = 'Miriam Castellanos'`);
  assert.equal(row.n, 1);
  const [idRow] = await q(`select count(*)::int n from public.boxing_official_identities where namespace = 'promo.official'`);
  assert.equal(idRow.n, 13, '3 bouts x 4 officials + 1 replacement judge');
});
