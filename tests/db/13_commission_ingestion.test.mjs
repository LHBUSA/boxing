// Official commission ingestion acceptance against a real database. Official
// sites are faked; every document is synthetic (tests/fixtures/commissions).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runCommissionIngest } from '../../shared/commissions/run.mjs';
import { runCapture } from '../../shared/odds/capture.mjs';
import { reprocessStoredOdds } from '../../shared/odds/replay.mjs';
import { ingestIdentity } from '../../shared/identity/pipeline.mjs';
import { processPending } from '../../shared/news/pipeline.mjs';
import { manualProvenance } from '../../shared/provenance.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import {
  FLORIDA_BOUTS, FLORIDA_RESULTS_HTML, FLORIDA_UPCOMING_HTML, NEVADA_BOUTS, NEVADA_INDEX_HTML, NJ_SCHEDULE_HTML,
  decodePages, encodePages, floridaPages, nevadaCalendarIcs, nevadaPages,
} from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const ENV = { COMMISSION_INGEST_ENABLED: 'true', COMMISSION_FETCH_DELAY_MS: '0' };
const FED = '[A-Z]{2}-?[0-9]{5,8}';
const NOW = '2026-09-13T12:00:00Z';

// A mutable fake of the official sites.
const site = new Map();
const requested = [];
const fakeFetch = async (url) => {
  requested.push(String(url));
  if (!site.has(String(url))) return new Response('not found', { status: 404 });
  const body = site.get(String(url));
  return new Response(body, { status: 200, headers: { 'last-modified': 'Mon, 07 Sep 2026 00:00:00 GMT' } });
};
const NV_BASE = 'https://boxing.nv.gov/uploadedFiles/boxingnvgov/content/results/2026_Results/';

before(async () => {
  db = await freshDatabase('commissions');
  store = pgStore(db.client);
  site.set('https://calendar.google.com/calendar/ical/kmvuar97kvumm2l7t9m6t4rpr0%40group.calendar.google.com/public/basic.ics', nevadaCalendarIcs([
    { uid: 'nv-1', dtstart: '20260906T030000Z', summary: 'PRO Boxing Event', location: 'Synthetic Garden Arena, 1 Synthetic Blvd, Las Vegas, NV 89109, USA', description: 'Synthetic Promotions will promote a professional boxing event.' },
    { uid: 'nv-2', dtstart: '20260926T030000Z', summary: 'PRO Boxing Event', location: 'Synthetic Palace, 2 Synthetic Blvd, Las Vegas, NV 89109, USA', description: 'Future Promotions will promote a professional boxing event.' },
    { uid: 'nv-3', dtstart: '20260927T030000Z', summary: 'PRO MMA Event', location: 'Synthetic Apex, Las Vegas, NV 89118, USA', description: 'Cage will promote a professional MMA event.' },
  ]));
  site.set('https://boxing.nv.gov/results/2026_Results/', NEVADA_INDEX_HTML);
  site.set(`${NV_BASE}09-05-26_Boxing_REDACTED.pdf`, encodePages(nevadaPages({ bouts: NEVADA_BOUTS })));
  site.set(`${NV_BASE}09-06-26_MMA_REDACTED.pdf`, encodePages(nevadaPages({ title: 'MIXED MARTIAL ARTS SHOW RESULTS', bouts: NEVADA_BOUTS })));
  site.set(`${NV_BASE}09-07-26_SLAP_REDACTED.pdf`, encodePages(nevadaPages({ title: 'MIXED MARTIAL ARTS SHOW RESULTS', bouts: NEVADA_BOUTS })));
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-upcoming-events-professional/', FLORIDA_UPCOMING_HTML);
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/', FLORIDA_RESULTS_HTML);
  site.set('https://www2.myfloridalicense.com/pro/sbc/documents/09-05-2026-Synthetic_Sunshine-Results_without_med.pdf', encodePages(floridaPages({ bouts: FLORIDA_BOUTS })));
  site.set('https://www2.myfloridalicense.com/pro/sbc/documents/09-06-2026-Synthetic_MMA-Results_without_med.pdf', encodePages(floridaPages({ eventType: 'MMA Mixed Martial Arts', bouts: FLORIDA_BOUTS })));
  site.set('https://www2.myfloridalicense.com/pro/sbc/documents/09-07-2026-Synthetic_Knuckle-results_without_med.pdf', encodePages(floridaPages({ eventType: 'Bare -Knuckle Boxing', bouts: FLORIDA_BOUTS })));
  site.set('https://www.njoag.gov/about/divisions-and-offices/state-athletic-control-board-home/event-schedule/', NJ_SCHEDULE_HTML);
});
after(async () => { await db?.close(); });

const ingest = (adapterKey, opts = {}) => runCommissionIngest(store, ENV, { adapterKey, fetchImpl: fakeFetch, now: opts.now ?? NOW, extract: decodePages, mode: opts.mode ?? 'backfill', years: [2026],
  provenance: manualProvenance({ workerName: 'tests/db/13', runtime: 'node test', trigger: opts.trigger ?? 'backfill' }) });

test('Nevada boxing is ingested; MMA and PowerSlap never enter Boxing Core', async () => {
  const r = await ingest('nevada');
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  assert.ok(!requested.some((u) => /MMA|SLAP/.test(u)), 'non-boxing documents are not even downloaded');
  assert.equal(r.metrics.rejected_reasons['listing_not_boxing:mma'], 1);
  assert.equal(r.metrics.rejected_reasons['listing_not_boxing:power_slap'], 1);
  const events = await q(`select e.name, e.event_date::text, e.status, e.start_at from public.boxing_events e join public.boxing_sources s on s.id = e.source_id where s.source_key = 'nsac_nevada' order by e.event_date`);
  assert.deepEqual(events.map((e) => [e.event_date, e.status]), [['2026-09-05', 'complete'], ['2026-09-25', 'scheduled']], 'past card from results, future card from the calendar; MMA calendar entry absent');
  assert.equal(new Date(events[0].start_at).toISOString(), '2026-09-06T03:00:00.000Z', 'results document linked to its calendar event');
  const bouts = await q(`select b.id, b.status from public.boxing_bouts b join public.boxing_sources s on s.id = b.source_id where s.source_key = 'nsac_nevada'`);
  assert.equal(bouts.length, 3);
  assert.equal(r.metrics.apply.results_created, 3);
  assert.equal(r.metrics.apply.scorecards_written, 6, 'bout 1 and bout 3 have three judges with totals');
  const res = await q(`select r.method, r.decision_type, r.round, r.outcome from public.boxing_bout_results_current r join public.boxing_sources s on s.id = r.source_id where s.source_key = 'nsac_nevada' order by r.method, r.outcome`);
  assert.deepEqual(res.map((x) => [x.method, x.outcome, x.decision_type, x.round]), [['DECISION', 'draw', 'majority', null], ['DECISION', 'win', 'unanimous', null], ['TKO', 'win', null, 6]]);
  const judge = await one(`select o.display_name from public.boxing_scorecards c join public.boxing_officials o on o.id = c.judge_id where c.fighter_a_total = 111`);
  assert.equal(judge.display_name, 'Lee Delta Deluca', 'short judge name resolved to the header full name');
  const ded = await one(`select points, round from public.boxing_point_deductions`);
  assert.deepEqual([Number(ded.points), ded.round], [1, 4]);
  const run = await one(`select trigger_type, worker, source_version from public.boxing_ingest_runs where id = $1`, [r.runId]);
  assert.deepEqual(run, { trigger_type: 'backfill', worker: 'boxing-commissions', source_version: 'nsac-nevada@1.0.1' });
});

test('Florida boxing is ingested; MMA, bare-knuckle documents and bouts do not enter pro boxing', async () => {
  const r = await ingest('florida');
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  assert.ok(!requested.some((u) => /Synthetic_MMA|Synthetic_Knuckle/.test(u)), 'listing brand hints skip non-boxing documents');
  const events = await q(`select e.event_date::text, e.status, e.name from public.boxing_events e join public.boxing_sources s on s.id = e.source_id where s.source_key = 'florida_athletic_commission' order by 1`);
  assert.deepEqual(events.map((e) => [e.event_date, e.status]), [['2026-09-05', 'complete'], ['2026-09-26', 'scheduled']]);
  assert.ok(!events.some((e) => /BKFC|Knuckle|Cage/i.test(e.name)));
  assert.equal(r.metrics.rejected_reasons['bout_sport_not_boxing:bare_knuckle'], 1, 'bare-knuckle bout inside a boxing sheet rejected');
  assert.equal(await count(`boxing_fighters where display_name like 'Kilo%' or display_name like 'Lima%'`), 0);
  const susp = await one(`select action_type, effective_from::date::text as effective_from, effective_to::date::text as effective_to, reason_public from public.boxing_regulatory_actions`);
  assert.deepEqual(susp, { action_type: 'suspension', effective_from: '2026-09-05', effective_to: '2026-10-05', reason_public: null });

  // a bare-knuckle document that slips past the listing is still rejected by its content
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/',
    `${FLORIDA_RESULTS_HTML}<a href="https://www2.myfloridalicense.com/pro/sbc/documents/09-08-2026-Neutral_Name-Results_without_med.pdf">September 8, 2026 – Neutral – Miami</a>`);
  site.set('https://www2.myfloridalicense.com/pro/sbc/documents/09-08-2026-Neutral_Name-Results_without_med.pdf', encodePages(floridaPages({ eventType: 'Bare -Knuckle Boxing', date: '09/08/2026', bouts: FLORIDA_BOUTS })));
  const r2 = await ingest('florida');
  assert.equal(r2.metrics.documents_rejected, 1);
  assert.equal(await count(`boxing_events e join public.boxing_sources s on s.id = e.source_id where s.source_key = 'florida_athletic_commission' and e.event_date = '2026-09-08'`), 0);
});

test('New Jersey: official schedule only; third-party linked sites never become sources', async () => {
  const sourcesBefore = await q(`select source_key, enabled from public.boxing_sources order by 1`);
  const r = await ingest('new_jersey');
  assert.equal(r.status, 'ok');
  assert.deepEqual(await q(`select source_key, enabled from public.boxing_sources order by 1`), sourcesBefore, 'no source added or enabled');
  assert.equal(await count(`boxing_source_documents where url like '%boxrec%'`), 0);
  assert.equal(await count(`boxing_source_documents d join public.boxing_sources s on s.id = d.source_id where s.source_key = 'nj_sacb' and d.status = 'parser_pending'`), 1);
  const ev = await q(`select e.event_date::text, e.status from public.boxing_events e join public.boxing_sources s on s.id = e.source_id where s.source_key = 'nj_sacb' order by 1`);
  assert.deepEqual(ev.map((e) => [e.event_date, e.status]), [['2026-09-04', 'complete'], ['2026-09-12', 'scheduled'], ['2026-11-07', 'cancelled']]);
  assert.equal(await count(`boxing_events where name ilike '%knuckle%' or name ilike '%cage%'`), 0);
});

test('federal boxer IDs, DOBs and medical data appear nowhere: tables, gateway output, fact blocks', async () => {
  const processed = await processPending(store, { limit: 200 });
  const outcomes = processed.reduce((m, p) => ({ ...m, [`${p.event_type}:${p.status}:${p.reason ?? ''}`]: (m[`${p.event_type}:${p.status}:${p.reason ?? ''}`] ?? 0) + 1 }), {});
  const hits = await q(`select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'boxing\\_%'`);
  for (const { t } of hits) {
    const row = await one(`select count(*)::int n from public.${t} x where to_jsonb(x)::text ~ $1 or to_jsonb(x)::text ~* '(ringside physician|doc synthetic|01/02/1990)'`, [`\\m${FED}\\M`]);
    assert.equal(row.n, 0, `${t} contains a private identifier or medical detail`);
  }
  const { createWorker } = await import('../../workers/boxing-gateway/src/index.mjs');
  const worker = createWorker({ makeStore: () => store });
  const token = 'g'.repeat(40);
  const bouts = await q(`select id, event_id from public.boxing_bouts`);
  for (const b of bouts) {
    for (const path of [`/internal/v1/bouts/${b.id}`, `/internal/v1/events/${b.event_id}`]) {
      const res = await worker.fetch(new Request(`https://g.internal${path}`, { headers: { authorization: `Bearer ${token}` } }), { BOXING_INTERNAL_TOKEN: token });
      assert.doesNotMatch(await res.text(), new RegExp(FED), path);
    }
  }
  assert.ok(await count(`boxing_fact_blocks`) > 0, `commission news produced fact blocks ${JSON.stringify(outcomes)}`);
  assert.ok(!Object.keys(outcomes).some((k) => k.includes('sensitive_source_field')), 'no commission fact was refused as sensitive');
});

test('an official revision creates a new document revision and a RESULT_CORRECTED event; prior observation and result are kept', async () => {
  const revised = NEVADA_BOUTS.map((b, i) => (i === 1 ? { ...b, result: ['Three won by TKO 1:10 of round 6'] } : b));
  site.set(`${NV_BASE}09-05-26_Boxing_REDACTED.pdf`, encodePages(nevadaPages({ bouts: revised })));
  const r = await ingest('nevada', { now: '2026-09-14T12:00:00Z' });
  assert.equal(r.metrics.revisions_observed, 1);
  const revs = await q(`select r.revision, r.observation_id from public.boxing_source_document_revisions r join public.boxing_source_documents d on d.id = r.document_id where d.doc_key = 'nv-results:2026:09-05-26_Boxing_REDACTED' order by 1`);
  assert.deepEqual(revs.map((x) => x.revision), [1, 2]);
  assert.notEqual(revs[0].observation_id, revs[1].observation_id);
  assert.equal(await count(`boxing_source_observations where id = '${revs[0].observation_id}'`), 1, 'prior observation retained');
  const results = await q(`select r.revision, r.time_sec from public.boxing_bout_results r join public.boxing_sources s on s.id = r.source_id where s.source_key = 'nsac_nevada' and r.method = 'TKO' order by r.revision`);
  assert.deepEqual(results.map((x) => [x.revision, x.time_sec]), [[1, null], [2, 70]]);
  assert.equal(await count(`boxing_news_events where event_type = 'RESULT_CORRECTED'`), 1);
  const unchanged = await ingest('nevada', { now: '2026-09-15T12:00:00Z' });
  assert.equal(unchanged.metrics.documents_changed, 0);
});

test('same-name fighters stay distinct and ambiguous identity goes to review', async () => {
  // two existing canonical boxers share a name -> a commission observation of that name cannot pick one
  const src = await testSource(db.client, 'identity_fixture_registry');
  for (const k of ['m1', 'm2']) {
    await ingestIdentity(store, { sourceKey: src.source_key, accessMode: 'approved_ingest', namespace: 'identity_fixture_registry',
      record: { external_id: k, display_name: 'Mike Samename', dob: k === 'm1' ? '1990-01-01' : '1995-05-05' }, payload: { k } });
  }
  const fightersBefore = await count(`boxing_fighters where display_name = 'Mike Samename'`);
  const bouts = [{ ...NEVADA_BOUTS[0], a: ['MIKE SAMENAME'], aHome: 'Somewhere, NV', b: ['NEW PERSON UNIQUE'], bHome: 'Elsewhere, CA' }];
  site.set('https://boxing.nv.gov/results/2026_Results/', `${NEVADA_INDEX_HTML}<a href="/uploadedFiles/boxingnvgov/content/results/2026_Results/09-10-26_Boxing_REDACTED.pdf">b</a>`);
  site.set(`${NV_BASE}09-10-26_Boxing_REDACTED.pdf`, encodePages(nevadaPages({ date: ['September 10', 'th', ', 2026,'], bouts })));
  const r = await ingest('nevada', { now: '2026-09-16T12:00:00Z' });
  assert.equal(await count(`boxing_fighters where display_name = 'Mike Samename'`), fightersBefore, 'no third Mike Samename and no merge');
  assert.ok(r.metrics.apply.identity_unresolved >= 1);
  assert.ok(await count(`boxing_identity_review_queue where raw_name ilike 'Mike Samename' and status = 'pending'`) >= 1);
  assert.equal(await count(`boxing_bouts b join public.boxing_events e on e.id = b.event_id where e.event_date = '2026-09-10'`), 0, 'no bout without two resolved corners');
});

test('stored odds resolve later without refetching; both canonical participants required; original timestamps unchanged', async () => {
  // odds captured BEFORE the commission result existed, for three provider events
  const commence = '2026-09-06T03:00:00Z';
  const capturedAt = '2026-09-04T12:00:00Z';
  const book = (a, b, pa, pb) => ({ key: 'synbook', title: 'synbook', last_update: capturedAt, markets: [{ key: 'h2h', last_update: capturedAt, outcomes: [{ name: a, price: pa }, { name: b, price: pb }] }] });
  const payload = [
    { id: 'odds-both', sport_key: 'boxing_boxing', commence_time: commence, home_team: 'Alpha Synthetic One', away_team: 'Bravo Synthetic Two', bookmakers: [book('Alpha Synthetic One', 'Bravo Synthetic Two', 150, -180)] },
    { id: 'odds-one-corner', sport_key: 'boxing_boxing', commence_time: commence, home_team: 'Charlie Synthetic Three', away_team: 'Nobody Known Here', bookmakers: [book('Charlie Synthetic Three', 'Nobody Known Here', -120, 100)] },
    // same event/venue/date wording, unknown fighters: event similarity alone cannot link
    { id: 'odds-title-only', sport_key: 'boxing_boxing', commence_time: commence, home_team: 'Synthetic Promotions', away_team: 'Synthetic Garden Arena', bookmakers: [book('Synthetic Promotions', 'Synthetic Garden Arena', -110, -110)] },
  ];
  const oddsEnv = { ODDS_CAPTURE_ENABLED: 'true', ODDS_API_KEY: 'k'.repeat(32), ODDS_REGION_PLAN: 'us=h2h', ODDS_MIN_REMAINING: '1' };
  const provider = async (url) => (String(url).includes('/sports/?')
    ? new Response(JSON.stringify([{ key: 'boxing_boxing', active: true }]), { status: 200, headers: { 'x-requests-remaining': '9000' } })
    : new Response(JSON.stringify(payload), { status: 200, headers: { 'x-requests-remaining': '8999', 'x-requests-last': '1' } }));
  // capture happens in an isolated DB state where the Nevada bouts exist but were complete -> live capture must NOT match completed bouts
  const cap = await runCapture(store, oddsEnv, { fetchImpl: provider, now: capturedAt, force: true });
  assert.equal(cap.metrics.events_matched, 0, 'live capture never attaches to completed bouts');
  const quotesBefore = await q(`select id, captured_at, provider_last_update, price_american from public.boxing_provider_quotes order by id`);

  let providerCalls = 0;
  const replay = await reprocessStoredOdds(store, { provenance: manualProvenance({ workerName: 'tests/db/13', runtime: 'node test', trigger: 'backfill' }) });
  providerCalls += requested.filter((u) => u.includes('the-odds-api')).length;
  assert.equal(providerCalls, 0, 'replay makes no provider request');
  assert.deepEqual(replay.metrics.newly_linked_events, ['odds-both']);
  const map = await one(`select resolved_at, resolver_version, resolution_run_id, evidence from public.boxing_bout_identities where external_id = 'odds-both'`);
  assert.equal(map.resolver_version, 'boxing-odds-event-matcher@1.0.0');
  assert.equal(map.resolution_run_id, replay.runId);
  assert.equal(new Date(map.evidence.original_captured_at).toISOString(), new Date(capturedAt).toISOString());
  const ticks = await q(`select captured_at, provider_timestamp, recorded_at from public.boxing_market_ticks`);
  assert.equal(ticks.length, 2);
  for (const t of ticks) {
    assert.equal(new Date(t.captured_at).toISOString(), '2026-09-04T12:00:00.000Z', 'original capture time preserved');
    assert.equal(new Date(t.provider_timestamp).toISOString(), '2026-09-04T12:00:00.000Z');
    assert.ok(new Date(t.recorded_at) > new Date(t.captured_at), 'late resolution is visible');
  }
  assert.deepEqual(await q(`select id, captured_at, provider_last_update, price_american from public.boxing_provider_quotes order by id`), quotesBefore, 'provider ledger untouched');
  assert.equal(await count(`boxing_bout_identities where external_id in ('odds-one-corner', 'odds-title-only')`), 0);
  const cov = await store.commissionCoverage();
  assert.ok(cov.events.nsac_nevada >= 2 && cov.bouts.nsac_nevada === 3);
});

async function count(from) { return Number((await one(`select count(*)::int n from public.${from}`)).n); }

test('repeat pairings on one card stay separate bouts; a parser upgrade re-parses unchanged documents without faking corrections', async () => {
  // team-league style: the same two boxers meet twice on one card with different winners
  const twice = [
    { n: 1, sport: ['Boxing'], rds: 3, decision: ['Unanimous', 'Decision'], officials: ['Judges: Juan Uno, Jo Dos, Jay Tres;', 'Referee: Ref Floridian'],
      a: { name: 'Mike Rematch', home: 'Miami, FL', weight: 150, result: 'Win' }, b: { name: 'Nate Rematch', home: 'Tampa, FL', weight: 150, result: null } },
    { n: 2, sport: ['Boxing'], rds: 3, decision: ['Split', 'Decision'], officials: ['Judges: Juan Uno, Jo Dos, Jay Tres;', 'Referee: Ref Floridian'],
      a: { name: 'Mike Rematch', home: 'Miami, FL', weight: 150, result: null }, b: { name: 'Nate Rematch', home: 'Tampa, FL', weight: 150, result: 'Win' } },
  ];
  site.set('https://www2.myfloridalicense.com/athletic-commission/commission-event-results-professional/',
    `${FLORIDA_RESULTS_HTML}<a href="https://www2.myfloridalicense.com/pro/sbc/documents/09-09-2026-Team_League-Results_without_med.pdf">September 9, 2026 – Team League – Miami</a>`);
  site.set('https://www2.myfloridalicense.com/pro/sbc/documents/09-09-2026-Team_League-Results_without_med.pdf', encodePages(floridaPages({ date: '09/09/2026', promoter: 'Team League', venue: 'Miami, FL / Synthetic Dome', bouts: twice })));
  await ingest('florida', { now: '2026-09-17T12:00:00Z' });
  const rows = await q(`select b.id, r.revision, fw.display_name winner, r.decision_type from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
    join public.boxing_bout_results r on r.bout_id = b.id left join public.boxing_fighters fw on fw.id = r.winner_id where e.event_date = '2026-09-09' order by b.bout_order`);
  assert.equal(new Set(rows.map((r) => r.id)).size, 2, 'two canonical bouts');
  assert.deepEqual(rows.map((r) => [r.revision, r.winner, r.decision_type]), [[1, 'Mike Rematch', 'unanimous'], [1, 'Nate Rematch', 'split']]);
  assert.equal(await count(`boxing_news_events where event_type in ('RESULT_OVERTURNED','RESULT_CORRECTED') and payload #>> '{facts,change_reason}' is null and detected_at >= '2026-09-17'`), 0);
  const again = await ingest('florida', { now: '2026-09-18T12:00:00Z' });
  assert.equal(again.metrics.documents_changed, 0, 'same parser version and content: not re-parsed');
});
