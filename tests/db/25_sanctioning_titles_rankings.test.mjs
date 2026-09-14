// Sanctioning-body titles + rankings against a real database (migration 0033). The official sites are faked; every
// document is synthetic (tests/fixtures/sanctioning).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runSanctioningCollection } from '../../shared/titles/sanctioning-ingest.mjs';
import { IBF_HEAVYWEIGHT_HISTORY, IBF_SLUGS, ibfRecord, wbaChampionsHtml, wbaRankingHtml, wboChampionsHtml, wboHistoryHtml, wboRankingsPage, wboRatingsText } from '../fixtures/sanctioning/synthetic.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const n = async (sql, params) => Number((await q(`select count(*)::int n from ${sql}`, params))[0].n);
const ENV = { TITLES_INGEST_ENABLED: 'true' };
const site = new Map();
const noSleep = async () => {};
const respond = (body, type = 'text/html') => new Response(body, { status: 200, headers: { 'content-type': type } });
const fakeFetch = async (url, init = {}) => {
  const key = init.method === 'POST' ? `POST ${url} ${init.body}` : String(url);
  const v = site.get(key);
  if (v === undefined) return new Response('not found', { status: 404 });
  return typeof v === 'function' ? v() : respond(v.body ?? v, v.type);
};
const run = (body, opts = {}) => runSanctioningCollection(store, ENV, { body, fetchImpl: fakeFetch, sleep: noSleep, extractPdfText: async () => site.get('pdf-text'), ...opts });

before(async () => {
  db = await freshDatabase('sanctioning');
  store = pgStore(db.client);
  site.set('https://www.wbaboxing.com/wba-ranking', wbaRankingHtml());
  site.set('https://www.wbaboxing.com/current-wba-champions', wbaChampionsHtml({ lhwRegular: 'SYNTH DIFFERENT' }));
  for (const slug of IBF_SLUGS) {
    const cur = slug === 'heavyweight' ? [IBF_HEAVYWEIGHT_HISTORY.at(-1)] : [ibfRecord({ title: `IBF: ${slug.toUpperCase()} &#8211; 08/2026` })];
    site.set(`https://www.ibf-usba-boxing.com/wp-json/ratings/v1/filter?weight=${slug}&org=ibf`, { body: JSON.stringify(cur), type: 'application/json' });
    site.set(`https://www.ibf-usba-boxing.com/wp-json/ratings/v1/filter?weight=${slug}&org=ibf&ppp=-1`,
      { body: JSON.stringify(slug === 'heavyweight' ? IBF_HEAVYWEIGHT_HISTORY : [ibfRecord({ title: `IBF: ${slug.toUpperCase()} &#8211; 08/2026` })]), type: 'application/json' });
  }
  site.set('https://wboboxing.com/rankings/', wboRankingsPage());
  site.set('https://wboboxing.com/wborankings/report/cmFua2luZw==/bWFsZQ==/0123456789abcdef0123456789abcdef/RankingReportMale', { body: '%PDF-1.7 synthetic', type: 'application/pdf' });
  site.set('pdf-text', wboRatingsText());
  site.set('https://wboboxing.com/male-champions/', wboChampionsHtml({ lhwChampion: 'Synth Someone Else' }));
});
after(async () => { await db?.close(); });

test('sources: WBA, IBF, WBO approved with recorded reviews; WBC not licensed; vocabulary seeded', async () => {
  const rows = await q(`select source_key, enabled, access_mode, redistribution_allowed from public.boxing_sources where source_key in ('wbc_official','wba_official','ibf_official','wbo_official') order by 1`);
  assert.deepEqual(rows.map((r) => [r.source_key, r.enabled, r.access_mode, r.redistribution_allowed]),
    [['ibf_official', true, 'approved_ingest', false], ['wba_official', true, 'approved_ingest', false], ['wbc_official', false, 'review_required', false], ['wbo_official', true, 'approved_ingest', false]]);
  assert.equal((await run('wbc')).status, 'blocked', 'no WBC collector exists');
  assert.ok(await n(`public.boxing_org_designations where review_state = 'seeded'`) >= 15);
  await assert.rejects(q(`select public.boxing_import_title_status_snapshot('{"source_key":"wbc_official","organization_slug":"wbc","division_native_label":"x"}'::jsonb)`), /source_not_approved/);
});

test('WBA current: own belts per division, rankings with regional tags, claims about other bodies, conflicts between WBA pages kept', async () => {
  const r = await run('wba');
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  assert.equal(r.metrics.requests, 2);
  const snaps = await q(`select document_kind, count(*)::int n from public.boxing_title_status_snapshots group by 1 order by 1`);
  assert.deepEqual(snaps, [{ document_kind: 'wba_champions', n: 11 }, { document_kind: 'wba_ranking', n: 11 }]);
  const lhw = (await q(`select e.designation_native, e.tier, e.holder_status, e.holder_source_name, e.identity_state from public.boxing_title_status_entries e
    join public.boxing_title_status_snapshots s on s.id = e.snapshot_id join public.boxing_weight_classes wc on wc.id = s.weight_class_id
    where s.document_kind = 'wba_ranking' and wc.class_key = 'light_heavyweight' order by e.seq`));
  assert.deepEqual(lhw.map((e) => [e.tier, e.holder_status, e.holder_source_name, e.identity_state]), [['super', 'held', 'SYNTH ALPHA', 'held'], ['regular', 'held', 'SYNTH BRAVO', 'held'], ['interim', 'held', 'SYNTH CHARLIE', 'held']]);
  assert.equal(await n(`public.boxing_title_status_entries where fighter_id is not null`), 0, 'nobody is matched by name');
  assert.ok(await n(`public.boxing_org_identity_reviews`) >= 15 * 11, 'every ranked and champion name is held for review');
  const claims = await q(`select ao.slug about, c.claimed_holder_source_name, c.claimed_vacant from public.boxing_title_claims c join public.boxing_organizations ao on ao.id = c.about_organization_id order by 1, 2`);
  assert.ok(claims.some((c) => c.about === 'wbc' && c.claimed_holder_source_name === 'SYNTH BRAVO') && claims.some((c) => c.about === 'wbc' && c.claimed_vacant));
  const conflicts = await q(`select belt_key, left_value, right_value from public.boxing_title_conflicts`);
  assert.deepEqual(conflicts.map((c) => [c.belt_key, c.left_value, c.right_value].sort()), [['regular|belt', 'synth bravo', 'synth different'].sort()], 'the two WBA pages disagree and both stay recorded');
  const entries = await q(`select e.position, e.rank_label, e.designation, e.metadata from public.boxing_ranking_entries e join public.boxing_ranking_snapshots s on s.id = e.snapshot_id
    join public.boxing_weight_classes wc on wc.id = s.weight_class_id join public.boxing_organizations o on o.id = s.organization_id where o.slug = 'wba' and wc.class_key = 'light_heavyweight' order by e.position`);
  assert.equal(entries.length, 15);
  assert.deepEqual([entries[1].designation, entries[1].metadata.regional_label, entries[1].metadata.org_boxer_id], ['C/LA', 'C/LA', '101']);
  assert.equal(entries.filter((e) => e.metadata.resolution).length, 0);

  const again = await run('wba');
  assert.deepEqual([again.metrics.status_snapshots, again.metrics.ranking_snapshots], [{ duplicate: 22 }, { duplicate: 11 }], 'the same documents change nothing');
  await assert.rejects(q(`update public.boxing_title_status_snapshots set source_url = 'x'`), /append-only|not allowed|immutable/i);
});

test('lanes read: WBC not licensed with labelled claims; WBA current with freshness and its own conflict; undisputed not derivable', async () => {
  const lanes = await store.siteTitleLanes('light_heavyweight', 'male');
  const byBody = Object.fromEntries(lanes.lanes.map((l) => [l.body, l]));
  assert.deepEqual([byBody.wbc.state, byBody.wbc.documents.length], ['not_licensed', 0]);
  assert.match(byBody.wbc.note, /not licensed/i);
  assert.ok(byBody.wbc.claims_by_other_bodies.every((c) => c.by !== 'wbc' && c.by));
  assert.equal(byBody.wba.state, 'current');
  assert.ok(byBody.wba.documents.every((d) => d.retrieved_at));
  assert.equal(byBody.wba.freshness.last_run_status, 'ok');
  assert.ok(byBody.wba.freshness.last_ok_at);
  assert.equal(byBody.wbc.freshness, null);
  assert.equal(byBody.wba.conflicts_within_body.length, 1);
  assert.deepEqual([lanes.derived.status, lanes.derived.rule], ['not_derivable', 'pbe_undisputed@1']);
  assert.match(lanes.derived.reason, /WBC/);
  const wbcRankings = await store.siteBodyRankings('wbc', 'light_heavyweight', 'male', null);
  assert.equal(wbcRankings.state, 'not_licensed');
});

test('fail closed: unexpected WBA structure writes nothing; an unknown designation goes to review and refuses the document', async () => {
  const before = await n('public.boxing_title_status_snapshots');
  site.set('https://www.wbaboxing.com/wba-ranking', '<html><body>maintenance</body></html>');
  const broken = await run('wba');
  assert.deepEqual([broken.status, broken.metrics.error_code], ['failed', 'unexpected_structure']);
  assert.equal(await n('public.boxing_title_status_snapshots'), before);
  site.set('https://www.wbaboxing.com/wba-ranking', wbaRankingHtml({ label: 'SEPTEMBER 2026', date: 'September 30th, 2026', extraDesignation: 'WBA DIAMOND EMPEROR' }));
  const odd = await run('wba');
  assert.equal(odd.status, 'partial');
  assert.ok(odd.metrics.refused.some((x) => x.reason === 'unknown_designation_pending_review'));
  assert.equal(await n(`public.boxing_org_designations where review_state = 'pending_review' and native_label = 'WBA DIAMOND EMPEROR'`), 1);
});

test('IBF backfill: every monthly record kept, vacancy without a cause, new holder proposed; checkpoint resumes; NOT RATED visible', async () => {
  const r = await run('ibf', { mode: 'backfill' });
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  assert.equal(r.metrics.requests, 17);
  const hw = await q(`select s.as_of::text, e.holder_status, e.holder_source_name, e.reign_start_on::text, e.ignored_fields from public.boxing_title_status_snapshots s
    join public.boxing_title_status_entries e on e.snapshot_id = s.id join public.boxing_organizations o on o.id = s.organization_id join public.boxing_weight_classes wc on wc.id = s.weight_class_id
    where o.slug = 'ibf' and wc.class_key = 'heavyweight' order by s.as_of`);
  assert.deepEqual(hw.map((x) => [x.as_of, x.holder_status, x.holder_source_name, x.reign_start_on]),
    [['2026-05-31', 'held', 'Synth King', '2024-06-01'], ['2026-06-30', 'vacant', null, null], ['2026-08-31', 'held', 'Synth Next', '2026-08-29']]);
  const proposals = await q(`select p.change_type, p.previous_holder_source_name, p.holder_source_name, p.cause_as_stated from public.boxing_title_event_proposals p
    join public.boxing_organizations o on o.id = p.organization_id join public.boxing_weight_classes wc on wc.id = p.weight_class_id where o.slug = 'ibf' and wc.class_key = 'heavyweight' order by p.created_at`);
  assert.deepEqual(proposals.map((p) => [p.change_type, p.previous_holder_source_name, p.holder_source_name, p.cause_as_stated]),
    [['became_vacant', 'Synth King', null, null], ['filled', null, 'Synth Next', null]]);
  assert.equal(await n('public.boxing_title_events'), 0, 'a proposal never writes title lineage');
  const rank = await store.siteBodyRankings('ibf', 'heavyweight', 'male', '2026-09-14');
  assert.equal(rank.state, 'current');
  assert.deepEqual(rank.snapshot.entries.slice(0, 2).map((e) => [e.position, e.source_name, e.is_vacant, e.metadata.not_rated]), [[1, null, true, true], [2, 'Synth Other', false, false]]);
  assert.equal(rank.champions.belts[0].holder.name, 'Synth Next', 'champion shown above the list');
  assert.equal(rank.history.length, 3);
  const checkpoint = (await q(`select completed from public.boxing_source_backfill_checkpoints where source_key = 'ibf_official'`))[0];
  assert.equal(checkpoint.completed.length, 17);
  const resumed = await run('ibf', { mode: 'backfill' });
  assert.equal(resumed.metrics.requests, 0, 'a finished backfill does not hit the endpoint again');
});

test('proposal decisions: automated reviewers refused; automatic confirmation refused without commission result and body snapshot', async () => {
  const [p] = await q(`select id from public.boxing_title_event_proposals where change_type = 'filled' limit 1`);
  await assert.rejects(store.decideTitleEventProposal({ proposal_id: p.id, decision: 'confirmed_by_review', reviewer: 'claude-bot', review_note: 'looks right to the automated checker' }), /check|violat/i);
  await assert.rejects(store.autoConfirmTitleEventProposal(p.id, null, null), /cannot be auto-confirmed/, 'no resolved holder, no commission bout');
  const ok = await store.decideTitleEventProposal({ proposal_id: p.id, decision: 'rejected_by_review', reviewer: 'Pat Reviewer', review_note: 'Holding until the commission result for the vacant title bout is ingested.' });
  assert.equal(ok.status, 'recorded');
  await assert.rejects(q(`delete from public.boxing_title_event_proposal_decisions`), /append-only|not allowed|immutable/i);
});

test('reviewed identity resolves on the next document; nothing else does', async () => {
  const [rev] = await q(`select r.id from public.boxing_org_identity_reviews r join public.boxing_organizations o on o.id = r.organization_id where o.slug = 'wba' and r.org_boxer_id = '11'`);
  const [f] = await q(`insert into public.boxing_fighters (display_name, normalized_name, identity_state) values ('Synth Alpha', 'synth alpha', 'verified') returning id`);
  await assert.rejects(q(`insert into public.boxing_org_identity_decisions (review_id, decision, fighter_id, reviewer, review_note) values ($1, 'matched', $2, 'automation script', 'matched by the ranking importer run')`, [rev.id, f.id]), /check|violat/i);
  await q(`insert into public.boxing_org_identity_decisions (review_id, decision, fighter_id, reviewer, review_note) values ($1, 'matched', $2, 'Pat Reviewer', 'Same WBA boxer id 11 as the reviewed dossier.')`, [rev.id, f.id]);
  site.set('https://www.wbaboxing.com/wba-ranking', wbaRankingHtml({ label: 'OCTOBER 2026', date: 'October 31st, 2026' }));
  const r = await run('wba');
  assert.ok(['ok', 'partial'].includes(r.status), JSON.stringify(r.metrics));
  const alpha = await q(`select e.fighter_id, e.identity_state from public.boxing_title_status_entries e join public.boxing_title_status_snapshots s on s.id = e.snapshot_id
    where s.as_of = '2026-10-31' and e.holder_org_boxer_id = '11'`);
  assert.deepEqual(alpha.map((a) => [a.fighter_id, a.identity_state]), [[f.id, 'resolved']]);
  assert.equal(await n(`public.boxing_title_status_entries where fighter_id is not null and holder_org_boxer_id is distinct from '11'`), 0);
});

test('WBO current: token read from the rankings page, PDF + champions page conflict kept, narrative not a designation; WBO history month by month', async () => {
  const r = await run('wbo');
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  assert.equal(r.metrics.requests, 3);
  const conflicts = await q(`select c.belt_key, c.left_value, c.right_value from public.boxing_title_conflicts c join public.boxing_organizations o on o.id = c.organization_id where o.slug = 'wbo'`);
  assert.deepEqual(conflicts.map((c) => [c.belt_key, [c.left_value, c.right_value].sort()]), [['world|belt', ['synth alpha', 'synth someone else']]]);
  assert.equal(await n(`public.boxing_org_designations where native_label ilike '%undisputed%'`), 0);
  const mand = await q(`select m.as_printed, m.challenger_source_name from public.boxing_title_mandatory_statements m join public.boxing_title_status_snapshots s on s.id = m.snapshot_id where s.document_kind = 'wbo_champions' and m.challenger_source_name is not null`);
  assert.deepEqual(mand.map((m) => [m.as_printed, m.challenger_source_name]), [['Mandatory vs Synth Interim', 'Synth Interim']]);
  const outside = await q(`select e.rank_label, e.metadata from public.boxing_ranking_entries e join public.boxing_ranking_snapshots s on s.id = e.snapshot_id join public.boxing_organizations o on o.id = s.organization_id
    join public.boxing_weight_classes wc on wc.id = s.weight_class_id where o.slug = 'wbo' and wc.class_key = 'light_heavyweight' and e.rank_label = '**'`);
  assert.deepEqual(outside.map((e) => [e.metadata.outside_numbered_list, e.metadata.regional_label]), [[true, 'WBO Africa']]);

  site.set('https://wboboxing.com/rankings/', '<p>no report link today</p>');
  const noToken = await run('wbo');
  assert.deepEqual([noToken.status, noToken.metrics.error_code], ['failed', 'unexpected_structure'], 'a missing token is never guessed');

  const body = (m, y) => new URLSearchParams({ req_ORG: 'World Boxing Organization', req_year: String(y), req_month: m, req_category: 'ALL', req_genre: 'M', submit: 'VIEW RANKING' }).toString();
  site.set(`POST https://wboboxing.com/rankings/ ${body('July', 2026)}`, wboHistoryHtml({ month: 'JULY', year: 2026 }));
  site.set(`POST https://wboboxing.com/rankings/ ${body('June', 2026)}`, wboHistoryHtml({ month: 'MAY', year: 2026 }));
  const hist = await run('wbo', { mode: 'backfill', months: [{ y: 2026, m: 6 }, { y: 2026, m: 7 }] });
  assert.equal(hist.status, 'partial');
  assert.deepEqual(Object.keys(hist.metrics.months), ['2026-07']);
  assert.match(hist.metrics.month_failures[0].error, /asked for 2026-6, page says 2026-05/, 'a page for the wrong month is refused, not stored');
});
