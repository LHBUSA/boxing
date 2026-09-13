// Career-graph identity resolution, re-apply of blocked bouts, upcoming cards,
// cross-source events, provider identities and the temporal news gate, against
// a real database. Official sites are faked; every document is synthetic.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { reapplyStoredDocuments, runCommissionIngest } from '../../shared/commissions/run.mjs';
import { applyCardDocument } from '../../shared/events/card.mjs';
import { upcomingCardDocument } from '../../shared/adapters/promoters/contract.mjs';
import { runCapture } from '../../shared/odds/capture.mjs';
import { reprocessStoredOdds } from '../../shared/odds/replay.mjs';
import { GRAPH_RESOLVER_VERSION } from '../../shared/identity/graph.mjs';
import { buildIdentityReviewReport } from '../../shared/identity/review-assist.mjs';
import { applyApprovedBatch, proposeReviewBatch } from '../../shared/identity/human-review.mjs';
import { manualProvenance } from '../../shared/provenance.mjs';
import { decodePages, encodePages, floridaPages } from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const count = async (from, params) => Number((await one(`select count(*)::int n from public.${from}`, params)).n);
const ENV = { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' };
const DOCS = 'https://www2.myfloridalicense.com/pro/sbc/documents/';
const site = new Map();
const requested = [];
const fakeFetch = async (url) => {
  requested.push(String(url));
  return site.has(String(url)) ? new Response(site.get(String(url)), { status: 200 }) : new Response('not found', { status: 404 });
};
const prov = (trigger = 'backfill') => manualProvenance({ workerName: 'tests/db/14', runtime: 'node test', trigger });
const ingestFlorida = (now) => runCommissionIngest(store, ENV, { adapterKey: 'florida', fetchImpl: fakeFetch, now, extract: decodePages, mode: 'backfill', years: [2026], provenance: prov() });

const officials = ['Judges: Juan Uno, Jo Dos, Jay Tres;', 'Referee: Ref Floridian'];
const fight = (n, a, b, winner = 'a') => ({ n, sport: ['Boxing'], rds: 6, decision: ['Unanimous', 'Decision'], officials,
  a: { ...a, result: winner === 'a' ? 'Win' : null }, b: { ...b, result: winner === 'b' ? 'Win' : null } });
const docs = [
  // A: first sightings create boxers
  { file: '03-14-2026-Graph_One-Results_without_med', label: 'March 14, 2026 – Graph One – Tampa', date: '03/14/2026', venue: 'Tampa, FL / Arena One', bouts: [
    fight(1, { name: 'Luis Graphtest', home: 'Miami, FL', weight: 140.2 }, { name: 'Pat Oneopp', home: 'Tampa, FL', weight: 141 }),
    fight(2, { name: 'Sam Samename', home: 'Orlando, FL', weight: 160 }, { name: 'Ray Twin', home: 'Tampa, FL', weight: 159 }),
    fight(3, { name: 'Kip Lightclue', home: 'Cuba', weight: 150 }, { name: 'Moe Filler', home: 'Tampa, FL', weight: 150 }),
  ] },
  // B: repeat appearances
  { file: '06-20-2026-Graph_Two-Results_without_med', label: 'June 20, 2026 – Graph Two – Miami', date: '06/20/2026', venue: 'Miami, FL / Dome Two', bouts: [
    fight(1, { name: 'Luis Graphtest', home: 'Miami, FL', weight: 139.8 }, { name: 'Nate Newopp', home: 'Miami, FL', weight: 140 }),
    fight(2, { name: 'Sam Samename', home: 'Jacksonville, FL', weight: 160 }, { name: 'Kim Newtwo', home: 'Miami, FL', weight: 160 }),
    fight(3, { name: 'Ray Twin', home: 'Tampa, FL', weight: 158.5 }, { name: 'Max Fiveopp', home: 'Miami, FL', weight: 159 }),
    fight(4, { name: 'Kip Lightclue', home: 'Cuba', weight: 150.5 }, { name: 'Lou Sixopp', home: 'Miami, FL', weight: 150 }),
  ] },
  // C: the same night, another city: a "Ray Twin" here cannot be the Miami one
  { file: '06-20-2026-Graph_Three-Results_without_med', label: 'June 20, 2026 – Graph Three – Orlando', date: '06/20/2026', venue: 'Orlando, FL / Hall Three', bouts: [
    fight(1, { name: 'Ray Twin', home: 'Tampa, FL', weight: 159 }, { name: 'Zed Sevenopp', home: 'Orlando, FL', weight: 158 }),
  ] },
  // D: two canonical Ray Twins now exist; a third sighting stays in review
  { file: '08-01-2026-Graph_Four-Results_without_med', label: 'August 1, 2026 – Graph Four – Tampa', date: '08/01/2026', venue: 'Tampa, FL / Arena One', bouts: [
    fight(1, { name: 'Ray Twin', home: 'Tampa, FL', weight: 159 }, { name: 'Opp Eightopp', home: 'Tampa, FL', weight: 159 }),
  ] },
];

before(async () => {
  db = await freshDatabase('identity_graph');
  store = pgStore(db.client);
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-upcoming-events-professional/', '<main><h1>Upcoming Events</h1></main>');
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/', docs.map((d) => `<a href="${DOCS}${d.file}.pdf">${d.label}</a>`).join('\n'));
  for (const d of docs) site.set(`${DOCS}${d.file}.pdf`, encodePages(floridaPages({ date: d.date, promoter: 'Graph Promotions', venue: d.venue, bouts: d.bouts })));
});
after(async () => { await db?.close(); });

const fightersNamed = (name) => count(`boxing_fighters where display_name = $1 and identity_state <> 'merged'`, [name]);
const boutsOn = (date) => count(`boxing_bouts b join public.boxing_events e on e.id = b.event_id where e.event_date = $1`, [date]);

test('graph evidence resolves a repeat appearance; same names stay distinct; impossible dates reject; one weak clue never resolves', async () => {
  const r = await ingestFlorida('2026-09-13T12:00:00Z');
  assert.equal(r.status, 'partial', JSON.stringify(r.metrics.apply));
  const decisions = await q(`select distinct on (appearance_key) appearance_key, observed_name, decision, tier, evidence from public.boxing_identity_appearance_decisions order by appearance_key, seq desc`);
  const byName = (n) => decisions.filter((d) => d.observed_name === n);

  // 4. graph evidence: same city + compatible weight + same commission, sole candidate
  assert.deepEqual(byName('Luis Graphtest').map((d) => [d.tier, d.decision]), [['B', 'matched']]);
  assert.equal(await fightersNamed('Luis Graphtest'), 1);
  assert.equal(await boutsOn('2026-06-20'), 3, 'Graph Two bouts 1 and 3 plus Graph Three bout 1');

  // 3. impossible date: the only candidate fought in Miami that night -> distinct boxer (Tier D)
  const rayC = byName('Ray Twin').find((d) => d.tier === 'D');
  assert.equal(rayC.decision, 'created');
  assert.ok(rayC.evidence.candidates[0].against.some((x) => /fought_2026-06-20_at_other_event/.test(x)));
  // 1. same-name boxers never auto-merge: the next Ray Twin sighting has two plausible candidates
  assert.equal(await fightersNamed('Ray Twin'), 2);
  const rayD = decisions.find((d) => d.observed_name === 'Ray Twin' && d.tier === 'C');
  assert.equal(rayD.evidence.decision_reason, 'more_than_one_plausible_candidate');
  assert.equal(await boutsOn('2026-08-01'), 0, 'a bout with one unresolved corner stays blocked');

  // 5. one weak clue: a country-level hometown is not a support family; a different city is a contradiction
  assert.deepEqual(byName('Kip Lightclue').map((d) => d.tier), ['C']);
  assert.deepEqual(byName('Sam Samename').map((d) => d.tier), ['C']);
  assert.match(byName('Sam Samename')[0].evidence.decision_reason, /hometown_different_city/);

  // the name-level review item for Luis closed only because every linked appearance is bound
  const luis = await one(`select status, resolution_kind, resolved_by from public.boxing_identity_review_queue where raw_name = 'Luis Graphtest'`);
  assert.deepEqual(luis, { status: 'resolved', resolution_kind: 'matched_existing', resolved_by: `resolver:${GRAPH_RESOLVER_VERSION}` });
  assert.equal(await count(`boxing_identity_review_queue where status = 'pending' and raw_name in ('Sam Samename', 'Kip Lightclue', 'Ray Twin')`), 3);

  // backfilled past facts are history, never news
  assert.equal(await count(`boxing_news_events where state in ('new','needs_review') and event_type not in ('RESULT_CORRECTED','RESULT_OVERTURNED')`), 0);
  assert.ok(await count(`boxing_news_events where state = 'skipped' and payload #>> '{temporal,mode}' = 'backfill'`) > 0);
});

test('review decisions are versioned, evidenced and append-only; the assistant report carries no private fields', async () => {
  const row = await one(`select tier, decision, confidence, resolver_version, evidence, evidence_hash, decided_at, decided_by from public.boxing_identity_appearance_decisions where observed_name = 'Luis Graphtest'`);
  assert.equal(row.resolver_version, GRAPH_RESOLVER_VERSION);
  assert.equal(row.decided_by, 'resolver');
  assert.ok(row.decided_at && row.evidence_hash.length === 64 && row.confidence >= 85);
  const c = row.evidence.candidates[0];
  assert.ok(c.for.includes('hometown_same_city:miami, fl') && c.for.some((x) => x.startsWith('weight_')) && c.for.includes('same_commission:fl-athletic-commission'));
  await assert.rejects(q(`update public.boxing_identity_appearance_decisions set tier = 'A' where observed_name = 'Luis Graphtest'`), /append-only|not allowed|immutable/i);

  const report = await buildIdentityReviewReport(store, { sourceKeys: ['florida_athletic_commission'] });
  assert.equal(report.summary.pending_items, 3);
  const sam = report.items.find((i) => i.raw_name === 'Sam Samename');
  assert.equal(sam.appearances[0].context.weight_lb, 160);
  assert.equal(sam.appearances[0].context.opponent, 'Kim Newtwo');
  assert.ok(sam.appearances[0].candidates[0].prior_opponents.some((p) => p.opponent === 'Ray Twin'));
  assert.doesNotMatch(JSON.stringify(report), /FL-1000000|01\/02\/1990|Doc Synthetic|dob/i);
});

test('a human decision unlocks a blocked bout on re-apply: no refetch, no bogus fighter news', async () => {
  const blocked = await boutsOn('2026-06-20');
  const sam = await one(`select id from public.boxing_fighters where display_name = 'Sam Samename'`);
  const report = await buildIdentityReviewReport(store, { sourceKeys: ['florida_athletic_commission'] });
  const proposal = await proposeReviewBatch(store, report, { batchId: 'test-001', size: 20 });
  const entry = proposal.batch.find((e) => e.appearance.display_name === 'Sam Samename');
  assert.ok(entry, 'Sam Samename is in the batch');
  assert.equal(entry.proposed_boxer.fighter_id, sam.id);
  assert.ok(entry.evidence.contradictions.some((c) => c.startsWith('hometown_different_city')));
  assert.equal(entry.recommendation, 'hold', 'a contradiction is never recommended as a match');
  assert.ok(entry.evidence.resolver_stop_reason && entry.appearance.latest_decision_seq, 'stop reason and the latest seq the reviewer saw');
  const rayTwin = proposal.batch.concat(proposal.remaining).find((e) => (e.appearance?.display_name ?? e.name) === 'Ray Twin');
  assert.ok((rayTwin.danger ?? []).some((d) => (d.kind ?? d) === 'same_name_multiple_canonical_boxers'), 'same-name danger flagged');
  const seenBefore = await count(`boxing_identity_appearance_decisions where observed_name = 'Sam Samename'`);

  // nothing is applied without a named human, a decision and a note
  await assert.rejects(applyApprovedBatch(store, { ...proposal, batch: [{ ...entry, reviewer_decision: 'approve_match', reviewer_note: 'same licence holder; moved from Orlando' }] }, { reviewer: 'claude-review-bot' }), /human reviewer/);
  await assert.rejects(applyApprovedBatch(store, { ...proposal, batch: [{ ...entry, reviewer_decision: 'approve_match', reviewer_note: 'ok' }] }, { reviewer: 'Test Reviewer' }), /reviewer_note/);
  assert.deepEqual((await applyApprovedBatch(store, proposal, { reviewer: 'Test Reviewer' })).map((x) => x.status).filter((x) => x !== 'not_reviewed'), [], 'unreviewed entries record nothing');
  await assert.rejects(store.recordAppearanceDecision({ source_key: 'florida_athletic_commission', namespace: entry.appearance.namespace, bout_external_id: entry.appearance.bout_external_id,
    side: entry.appearance.side, observed_name: 'Sam Samename', decision: 'matched', tier: 'C', fighter_id: sam.id, confidence: 100, evidence: {}, evidence_hash: 'x',
    resolver_version: 'manual', decided_by: 'reviewer:Script Runner', reviewer: 'Script Runner', review_note: 'a long enough note for the rule', review_batch: 'x', supersedes_seq: entry.appearance.latest_decision_seq }), /check|constraint|violat/i);
  await assert.rejects(store.recordAppearanceDecision({ source_key: 'florida_athletic_commission', namespace: entry.appearance.namespace, bout_external_id: entry.appearance.bout_external_id,
    side: entry.appearance.side, observed_name: 'Sam Samename', decision: 'matched', tier: 'C', fighter_id: sam.id, confidence: 100, evidence: {}, evidence_hash: 'x',
    resolver_version: 'manual', decided_by: 'reviewer:Test Reviewer', reviewer: 'Test Reviewer', review_note: 'a long enough note for the rule', review_batch: 'x', supersedes_seq: 1 }), /stale_review/);

  // a named reviewer approves: a new immutable row; earlier resolver evidence untouched
  const applied = await applyApprovedBatch(store, { ...proposal, batch: [{ ...entry, reviewer_decision: 'approve_match', reviewer_note: 'Same licence holder per commission roster; moved from Orlando to Jacksonville.' }] },
    { reviewer: 'Test Reviewer', reviewedAt: '2026-09-14T09:00:00Z' });
  assert.equal(applied[0].status, 'recorded');
  assert.equal(await count(`boxing_identity_appearance_decisions where observed_name = 'Sam Samename'`), seenBefore + 1);
  const human = await one(`select reviewer, reviewed_at, review_note, review_batch, decided_by, supersedes_seq, evidence from public.boxing_identity_appearance_decisions where observed_name = 'Sam Samename' and decided_by <> 'resolver'`);
  assert.equal(human.reviewer, 'Test Reviewer');
  assert.equal(human.decided_by, 'reviewer:Test Reviewer');
  assert.equal(new Date(human.reviewed_at).toISOString(), '2026-09-14T09:00:00.000Z');
  assert.equal(String(human.supersedes_seq), String(entry.appearance.latest_decision_seq));
  assert.ok(human.evidence.shown_to_reviewer.contradictions.length > 0, 'the evidence shown to the reviewer is stored with the decision');
  assert.equal(await count(`boxing_identity_appearance_decisions where observed_name = 'Sam Samename' and decided_by = 'resolver' and decision = 'review'`), seenBefore, 'earlier unresolved evidence kept');
  await assert.rejects(applyApprovedBatch(store, { ...proposal, batch: [{ ...entry, reviewer_decision: 'approve_match', reviewer_note: 'Same licence holder per commission roster; second attempt.' }] },
    { reviewer: 'Test Reviewer' }), /stale_review/, 'a second decision on the same stale evidence is refused');

  const fetchesBefore = requested.length;
  // apply exactly the reviewed binding: only its document, no new automatic identity decision
  const seqBefore = Number((await one(`select max(seq) m from public.boxing_identity_appearance_decisions`)).m);
  const resolutionsBefore = await count(`boxing_identity_resolutions`);
  const r = await reapplyStoredDocuments(store, { adapterKey: 'florida', now: '2026-09-14T12:00:00Z', provenance: prov(), graphResolve: false, docKeys: [entry.appearance.document] });
  assert.equal(r.status, 'ok', JSON.stringify(r.passes));
  assert.equal(r.documents, 1, 'only the reviewed document is re-applied');
  assert.equal(r.passes.length, 1);
  assert.deepEqual(r.passes[0].graph_decisions, {}, 'the graph resolver made no decision');
  assert.equal(await count(`boxing_identity_appearance_decisions where seq > $1`, [seqBefore]), 0, 'no automatic binding or review row written');
  assert.equal(await count(`boxing_identity_resolutions`), resolutionsBefore, 'no new automatic name-resolver decision');
  assert.equal(requested.length, fetchesBefore, 're-apply reads stored observations only');
  assert.equal(await boutsOn('2026-06-20'), blocked + 1);
  const bout = await one(`select b.id from public.boxing_bouts b join public.boxing_bout_participants p on p.bout_id = b.id join public.boxing_fighters f on f.id = p.fighter_id
    join public.boxing_events e on e.id = b.event_id where f.display_name = 'Kim Newtwo' and e.event_date = '2026-06-20'`);
  assert.ok(bout, 'the unlocked bout exists');
  assert.equal(await count(`boxing_bout_results where bout_id = $1`, [bout.id]), 1);
  const news = await q(`select event_type, state, payload #>> '{temporal,mode}' mode from public.boxing_news_events where bout_id = $1`, [bout.id]);
  assert.ok(news.length > 0 && news.every((n) => n.state === 'skipped' && n.mode === 'reapply'), JSON.stringify(news));
  const run = await one(`select trigger_type from public.boxing_ingest_runs where id = $1`, [r.runId]);
  assert.equal(run.trigger_type, 'backfill');
});

test('upcoming cards: an event schedule creates no bout; a promoter card goes through the resolver, attaches to the commission event, keeps replaced and cancelled history', async () => {
  const commission = await testSource(db.client, 'test_commission_upcoming', { source_kind: 'commission' });
  const promoter = await testSource(db.client, 'test_promoter_approved', { source_kind: 'promotion' });
  const sched = await applyCardDocument(store, { source_key: commission.source_key, namespace: 'test-commission', external_id: '2026-10-17|grand-hall|newark',
    name: 'Scheduled Card', event_date: '2026-10-17', status: 'scheduled', commission: { slug: 'test-commission', name: 'Test Commission' },
    venue: { name: 'Grand Hall', city: 'Newark', region: 'NJ', country_code: 'US' }, bouts: [] }, { now: '2026-09-13T12:00:00Z' });
  assert.equal(await count(`boxing_bouts where event_id = $1`, [sched.event_id]), 0, '7. an official schedule entry is not a bout');

  const card = (bouts, over = {}) => upcomingCardDocument({ source_key: promoter.source_key, source_event_id: 'promo-evt-1', event_name: 'Promoter Night', scheduled_date: '2026-10-17',
    venue: { name: 'Grand Hall Arena', city: 'Newark', region: 'NJ' }, source_url: 'https://promoter.example/events/1', captured_at: '2026-09-13T12:00:00Z', status: 'scheduled', bouts, ...over }, { namespace: 'test-promoter' });
  const v1 = await applyCardDocument(store, card([
    { source_bout_id: 'pb-1', fighter_a: { name: 'Una Known', source_id: 'una-1' }, fighter_b: { name: 'Vic Known', source_id: 'vic-1' }, scheduled_rounds: 10, status: 'announced' },
    // 8. an existing name on a promoter card is not an identity decision
    { source_bout_id: 'pb-2', fighter_a: { name: 'Luis Graphtest' }, fighter_b: { name: 'Wes Newname' }, scheduled_rounds: 8 },
  ]), { now: '2026-09-13T12:00:00Z' });
  assert.equal(v1.cross_source.status, 'attached', JSON.stringify(v1.cross_source));
  assert.equal(v1.event_id, sched.event_id, 'one canonical event, two source identities');
  assert.equal(await count(`boxing_event_identities where event_id = $1`, [sched.event_id]), 2);
  assert.ok(v1.unresolved.some((u) => u.name === 'Luis Graphtest'), 'resolver not bypassed');
  assert.equal(await count(`boxing_bouts where event_id = $1`, [sched.event_id]), 1);

  // 9. replacement keeps the prior pairing; a cancellation keeps the history; the commission owns event facts
  const v2 = await applyCardDocument(store, card([{ source_bout_id: 'pb-1', fighter_a: { name: 'Una Known', source_id: 'una-1' }, fighter_b: { name: 'Xan Replacement', source_id: 'xan-1' }, scheduled_rounds: 10, status: 'replaced' }],
    { status: 'postponed' }), { now: '2026-09-20T12:00:00Z' });
  assert.ok(v2.review.some((x) => x.reason === 'event_field_disagreement' && x.field === 'status'), 'disagreement surfaced');
  assert.equal((await one(`select status from public.boxing_events where id = $1`, [sched.event_id])).status, 'scheduled', 'promoter never rewrites commission event facts');
  await applyCardDocument(store, card([{ source_bout_id: 'pb-1', fighter_a: { name: 'Una Known', source_id: 'una-1' }, fighter_b: { name: 'Xan Replacement', source_id: 'xan-1' }, scheduled_rounds: 10, status: 'cancelled' }]), { now: '2026-09-25T12:00:00Z' });
  const participants = await q(`select f.display_name, p.participant_status from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id
    join public.boxing_bouts b on b.id = p.bout_id where b.event_id = $1 order by f.display_name`, [sched.event_id]);
  assert.deepEqual(participants.map((p) => [p.display_name, p.participant_status]), [['Una Known', 'scheduled'], ['Vic Known', 'replaced'], ['Xan Replacement', 'scheduled']]);
  const changes = (await q(`select change_type from public.boxing_card_changes where event_id = $1 order by effective_at, id`, [sched.event_id])).map((c) => c.change_type);
  for (const t of ['bout_added', 'opponent_replaced', 'bout_cancelled']) assert.ok(changes.includes(t), `${t} in history ${changes}`);
  assert.equal((await one(`select status from public.boxing_bouts b where event_id = $1`, [sched.event_id])).status, 'cancelled');
});

test('13/14. a new event venue is not a change; a later venue change is', async () => {
  const src = await testSource(db.client, 'test_commission_venue', { source_kind: 'commission' });
  const doc = (venue) => ({ source_key: src.source_key, namespace: 'test-venue', external_id: 'venue-evt', name: 'Venue Card', event_date: '2026-11-21', status: 'scheduled', venue, bouts: [] });
  const first = await applyCardDocument(store, doc({ name: 'First Arena', city: 'Camden', region: 'NJ', country_code: 'US' }), { now: '2026-09-13T12:00:00Z' });
  assert.equal(await count(`boxing_news_events where boxing_event_id = $1 and event_type = 'VENUE_CHANGED'`, [first.event_id]), 0);
  await applyCardDocument(store, doc({ name: 'Second Arena', city: 'Trenton', region: 'NJ', country_code: 'US' }), { now: '2026-09-14T12:00:00Z' });
  const moved = await q(`select state from public.boxing_news_events where boxing_event_id = $1 and event_type = 'VENUE_CHANGED'`, [first.event_id]);
  assert.deepEqual(moved.map((m) => m.state), ['new'], 'an actual move of an upcoming event is news');
});

test('10/11/12. a provider participant becomes an identity only after an authoritative match; late odds are never known in the past', async () => {
  const bout = await one(`select b.id, b.event_id from public.boxing_bouts b join public.boxing_bout_participants p on p.bout_id = b.id join public.boxing_fighters f on f.id = p.fighter_id
    where f.display_name = 'Una Known'`);
  // reopen the promoter bout for this test (a new card pairs Una Known with Vic Known on another date)
  const promoter = await one(`select source_key from public.boxing_sources where source_key = 'test_promoter_approved'`);
  const v = await applyCardDocument(store, upcomingCardDocument({ source_key: promoter.source_key, source_event_id: 'promo-evt-2', event_name: 'Rebooked Night', scheduled_date: '2026-12-05',
    venue: { name: 'Coast Arena', city: 'Atlantic City', region: 'NJ' }, source_url: 'https://promoter.example/events/2', captured_at: '2026-09-13T12:00:00Z', status: 'scheduled',
    // the promoter's own stable fighter ids (mapped on first sighting) identify the boxers; names alone would go to review
    bouts: [{ source_bout_id: 'pb-9', fighter_a: { name: 'Una Known', source_id: 'una-1' }, fighter_b: { name: 'Vic Known', source_id: 'vic-1' }, scheduled_rounds: 10 }] }, { namespace: 'test-promoter' }), { now: '2026-09-13T12:00:00Z' });
  const rebooked = await one(`select b.id from public.boxing_bouts b where b.event_id = $1`, [v.event_id]);
  assert.ok(bout && rebooked);

  const nowIso = new Date().toISOString();
  const book = (a, b) => ({ key: 'synbook', title: 'synbook', last_update: nowIso, markets: [{ key: 'h2h', last_update: nowIso, outcomes: [{ name: a, price: -150 }, { name: b, price: 130 }] }] });
  const payload = [
    { id: 'odds-una-vic', sport_key: 'boxing_boxing', commence_time: '2026-12-05T02:00:00Z', home_team: 'Una Known', away_team: 'Vic Known', bookmakers: [book('Una Known', 'Vic Known')] },
    { id: 'odds-una-nobody', sport_key: 'boxing_boxing', commence_time: '2026-12-05T02:00:00Z', home_team: 'Una Known', away_team: 'Nobody Seenbefore', bookmakers: [book('Una Known', 'Nobody Seenbefore')] },
  ];
  const env = { ODDS_CAPTURE_ENABLED: 'true', ODDS_API_KEY: 'k'.repeat(32), ODDS_REGION_PLAN: 'us=h2h', ODDS_MIN_REMAINING: '1' };
  const provider = async (url) => (String(url).includes('/sports/?')
    ? new Response(JSON.stringify([{ key: 'boxing_boxing', active: true }]), { status: 200, headers: { 'x-requests-remaining': '9000' } })
    : new Response(JSON.stringify(payload), { status: 200, headers: { 'x-requests-remaining': '8999', 'x-requests-last': '1' } }));
  const cap = await runCapture(store, env, { fetchImpl: provider, now: nowIso, force: true });
  assert.equal(cap.metrics.events_matched, 1, JSON.stringify(cap.metrics));
  const ids = await q(`select participant_name, verification_state, bout_id, resolver_version from public.boxing_provider_participant_identities order by participant_name`);
  assert.deepEqual(ids.map((i) => [i.participant_name, i.verification_state, i.bout_id]), [['Una Known', 'verified', rebooked.id], ['Vic Known', 'verified', rebooked.id]]);
  assert.equal(ids[0].resolver_version, 'boxing-odds-event-matcher@1.1.0');
  assert.equal(await count(`boxing_fighters where display_name = 'Nobody Seenbefore'`), 0, 'a sportsbook name never creates a boxer');
  assert.equal(await count(`boxing_provider_participant_identities where participant_name = 'Nobody Seenbefore'`), 0);
  await assert.rejects(store.recordProviderParticipantIdentity({ provider_slug: 'the_odds_api', participant_name: 'Nobody Seenbefore', normalized_name: 'nobody seenbefore',
    fighter_id: (await one(`select id from public.boxing_fighters where display_name = 'Vic Known'`)).id, bout_id: rebooked.id, provider_event_id: 'odds-una-nobody', resolver_version: 'x', evidence: {} }), /requires/);

  // replay without refetching keeps capture times; news detected before the prices existed never shows them
  const replay = await reprocessStoredOdds(store, { provenance: prov() });
  assert.equal(replay.status, 'ok');
  const tick = await one(`select captured_at from public.boxing_market_ticks order by captured_at limit 1`);
  assert.equal(new Date(tick.captured_at).toISOString(), nowIso, 'original capture time unchanged');
  const announced = await one(`select id, detected_at from public.boxing_news_events where bout_id = $1 and event_type = 'FIGHT_ANNOUNCED'`, [rebooked.id]);
  const ctx = await store.newsContext(announced.id);
  assert.deepEqual(ctx.market, [], 'odds captured after the announcement are not in its fact context');
  const later = await one(`select public.boxing_market_consensus_as_of($1, now() + interval '1 minute') r`, [rebooked.id]);
  assert.ok(later.r.length > 0, 'the same prices are known as of now');
});
