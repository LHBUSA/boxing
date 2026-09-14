// Sanctioning-body titles + rankings against a real database (migration 0033). The official sites are faked; every
// document is synthetic (tests/fixtures/sanctioning).

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { runSanctioningCollection } from '../../shared/titles/sanctioning-ingest.mjs';
import { IBF_HEAVYWEIGHT_HISTORY, IBF_SLUGS, champRow, fifteen, ibfRecord, wbaDivision, wbaChampionsHtml, wbaRankingHtml, wboChampionsHtml, wboHistoryHtml, wboRankingsPage, wboRatingsText } from '../fixtures/sanctioning/synthetic.mjs';

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

test('sources: WBC, WBA, IBF, WBO approved with recorded reviews; WBC has no collector yet; vocabulary seeded', async () => {
  const rows = await q(`select source_key, enabled, access_mode, redistribution_allowed from public.boxing_sources where source_key in ('wbc_official','wba_official','ibf_official','wbo_official') order by 1`);
  assert.deepEqual(rows.map((r) => [r.source_key, r.enabled, r.access_mode, r.redistribution_allowed]),
    [['ibf_official', true, 'approved_ingest', false], ['wba_official', true, 'approved_ingest', false], ['wbc_official', true, 'approved_ingest', false], ['wbo_official', true, 'approved_ingest', false]]);
  const wbc = await run('wbc');
  assert.deepEqual([wbc.status, /no collector/.test(wbc.reason)], ['blocked', true], 'approved, but nothing is fetched without a built collector');
  assert.equal(await n(`public.boxing_source_rights_reviews r join public.boxing_sources s on s.id = r.source_id where s.source_key = 'wbc_official' and r.decision = 'approved_with_restrictions'`), 1);
  assert.ok(await n(`public.boxing_org_designations where review_state = 'seeded'`) >= 15);
  // the ordinary source gate now admits WBC; an unknown WBC division still goes to review instead of being stored
  const [odd] = await q(`select public.boxing_import_title_status_snapshot('{"source_key":"wbc_official","organization_slug":"wbc","division_native_label":"x","document_kind":"wbc_ratings"}'::jsonb) as r`);
  assert.equal(odd.r.reason, 'unknown_division_pending_review');
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

test('lanes read: WBC approved with no snapshot and labelled claims; WBA current with freshness and its own conflict; derived pending', async () => {
  const lanes = await store.siteTitleLanes('light_heavyweight', 'male');
  const byBody = Object.fromEntries(lanes.lanes.map((l) => [l.body, l]));
  assert.deepEqual([byBody.wbc.state, byBody.wbc.documents.length, byBody.wbc.note], ['no_snapshot', 0, null]);
  assert.ok(byBody.wbc.claims_by_other_bodies.every((c) => c.by !== 'wbc' && c.by));
  assert.equal(byBody.wba.state, 'current');
  assert.ok(byBody.wba.documents.every((d) => d.retrieved_at));
  assert.equal(byBody.wba.freshness.last_run_status, 'ok');
  assert.ok(byBody.wba.freshness.last_ok_at);
  assert.equal(byBody.wbc.freshness, null);
  assert.equal(byBody.wba.conflicts_within_body.length, 1);
  assert.equal(lanes.derived.rule, 'pbe_undisputed@1');
  assert.notEqual(lanes.derived.status, 'undisputed');
  const wbcRankings = await store.siteBodyRankings('wbc', 'light_heavyweight', 'male', null);
  assert.equal(wbcRankings.state, 'no_snapshot');
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
  // an unknown division label is queued for review in the database, not only noted in run metrics, and stores nothing
  const snapsBefore = await n('public.boxing_title_status_snapshots');
  const rankingsBefore = await n('public.boxing_ranking_snapshots');
  site.set('https://www.wbaboxing.com/wba-ranking', wbaRankingHtml({ label: 'SEPTEMBER 2026', date: 'September 30th, 2026', extraDivision: 'EMPEROR WEIGHT' }));
  const div = await run('wba');
  assert.ok(div.metrics.refused.some((x) => x.division === 'EMPEROR WEIGHT' && x.reason === 'unknown_division_pending_review'), JSON.stringify(div.metrics.refused));
  assert.equal(await n(`public.boxing_org_divisions where review_state = 'pending_review' and native_label = 'EMPEROR WEIGHT' and weight_class_id is null`), 1);
  assert.equal(await n(`public.boxing_title_status_snapshots s join public.boxing_org_divisions d on d.id = s.org_division_id where d.native_label = 'EMPEROR WEIGHT'`), 0);
  assert.ok(await n('public.boxing_title_status_snapshots') >= snapsBefore);
  assert.ok(await n('public.boxing_ranking_snapshots') >= rankingsBefore);
});

test('WBA owner decisions: MINIMUM stored as minimumweight with its native label; GOLD; phrase as honorific only; nameless entry keeps its position', async () => {
  const mar = 'POST https://www.wbaboxing.com/wba-ranking dates=2026:3:';
  site.set(mar, wbaRankingHtml({ label: 'MARCH 2026', date: 'March 31st, 2026', extraDivision: 'MINIMUM', namelessLhwAt: 6,
    fillerDesignations: { 0: 'WBA SUPER CHAMPION <br>WBA UNDISPUTED CHAMPION', 2: 'WBA GOLD CHAMPION' } }));
  const reviewsBefore = await n('public.boxing_org_identity_reviews');
  const r = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 3 }] });
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics.refused));
  const [mini] = await q(`select d.native_label, wc.class_key, (select division_label from public.boxing_ranking_snapshots x where x.organization_id = s.organization_id and x.weight_class_id = s.weight_class_id and x.effective_on = '2026-03-31') ranking_label
    from public.boxing_title_status_snapshots s join public.boxing_org_divisions d on d.id = s.org_division_id join public.boxing_weight_classes wc on wc.id = s.weight_class_id
    join public.boxing_organizations o on o.id = s.organization_id where o.slug = 'wba' and s.as_of = '2026-03-31' and wc.class_key = 'minimumweight'`);
  assert.deepEqual([mini.native_label, mini.class_key, mini.ranking_label], ['MINIMUM', 'minimumweight', 'MINIMUM']);
  const belts = await q(`select wc.class_key, e.tier, e.designation_native, e.honorific from public.boxing_title_status_entries e join public.boxing_title_status_snapshots s on s.id = e.snapshot_id
    join public.boxing_weight_classes wc on wc.id = s.weight_class_id join public.boxing_organizations o on o.id = s.organization_id
    where o.slug = 'wba' and s.as_of = '2026-03-31' and wc.class_key in ('heavyweight', 'super_middleweight') order by 1`);
  assert.deepEqual(belts.map((b) => [b.class_key, b.tier, b.designation_native, b.honorific]),
    [['heavyweight', 'super', 'WBA SUPER CHAMPION', 'WBA UNDISPUTED CHAMPION'], ['super_middleweight', 'gold', 'WBA GOLD CHAMPION', null]]);
  const lanes = await store.siteTitleLanes('heavyweight', 'male');
  assert.notEqual(lanes.derived.status, 'undisputed', 'a WBA phrase never produces PropBetEdge undisputed');
  const [row] = await q(`select e.position, e.source_name, e.fighter_id, e.metadata ->> 'name_not_printed' np, e.metadata ->> 'source_fighter_id' wba_id, e.metadata ->> 'regional_label' reg
    from public.boxing_ranking_entries e join public.boxing_ranking_snapshots x on x.id = e.snapshot_id join public.boxing_weight_classes wc on wc.id = x.weight_class_id
    join public.boxing_organizations o on o.id = x.organization_id where o.slug = 'wba' and x.effective_on = '2026-03-31' and wc.class_key = 'light_heavyweight' and e.position = 6`);
  assert.deepEqual([row.position, row.source_name, row.fighter_id, row.np, row.wba_id, row.reg], [6, null, null, 'true', '4060', 'CON']);
  assert.equal(await n(`public.boxing_org_identity_reviews where org_boxer_id = '4060'`), 0, 'a missing name never becomes an identity');
  assert.ok(await n('public.boxing_org_identity_reviews') >= reviewsBefore);
  // alone, the phrase still refuses its division's title status for review
  site.set('POST https://www.wbaboxing.com/wba-ranking dates=2026:2:', wbaRankingHtml({ label: 'FEBRUARY 2026', date: 'February 28th, 2026', fillerDesignations: { 1: 'WBA -WBC UNIFIED CHAMPION' } }));
  const lone = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 2 }] });
  assert.ok(lone.metrics.refused.some((x) => x.reason === 'unknown_designation_pending_review' && x.division === 'CRUISERWEIGHT'), JSON.stringify(lone.metrics.refused));
});

test('WBA: a division whose numbered list is not 1..n stores its title status but never a ranking', async () => {
  const may = 'POST https://www.wbaboxing.com/wba-ranking dates=2026:5:';
  site.set(may, wbaRankingHtml({ label: 'MAY 2026', date: 'May 31st, 2026' }).replace(/<tr><td class="text-center"><p>1<\/p><\/td>[\s\S]*?<\/tr>/, ''));
  const before = await n(`public.boxing_ranking_snapshots r join public.boxing_organizations o on o.id = r.organization_id where o.slug = 'wba' and r.effective_on = '2026-05-31'`);
  const r = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 5 }] });
  assert.ok(r.metrics.refused.some((x) => x.reason === 'ranking_positions_not_contiguous'), JSON.stringify(r.metrics));
  const after = await n(`public.boxing_ranking_snapshots r join public.boxing_organizations o on o.id = r.organization_id where o.slug = 'wba' and r.effective_on = '2026-05-31'`);
  assert.equal(after - before, r.metrics.ranking_snapshots.created, 'only clean lists stored');
  assert.ok(r.metrics.status_snapshots.created >= r.metrics.ranking_snapshots.created + 1, 'title status of the broken division still stored');
});

test('WBA: a document that lists one division twice stores nothing for that division', async () => {
  const apr = 'POST https://www.wbaboxing.com/wba-ranking dates=2026:4:';
  const page = wbaRankingHtml({ label: 'APRIL 2026', date: 'April 30th, 2026' });
  site.set(apr, page + wbaDivision(90, 'WELTERWEIGHT', '147 Lbs', champRow('SYNTH SECOND', 'USA', 991, 'WBA WORLD CHAMPION'), '', fifteen('SECONDLIST', 4000)));
  const q2 = `public.boxing_title_status_snapshots s join public.boxing_organizations o on o.id = s.organization_id join public.boxing_weight_classes wc on wc.id = s.weight_class_id
    where o.slug = 'wba' and wc.class_key = 'welterweight' and s.as_of = '2026-04-30'`;
  const r = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 4 }], retryFailed: true });
  assert.ok(r.metrics.refused.some((x) => x.division === 'welterweight' && x.reason === 'division_listed_twice_in_document'), JSON.stringify(r.metrics.refused));
  assert.equal(await n(q2), 0);
  assert.equal(await n(`public.boxing_ranking_snapshots r join public.boxing_organizations o on o.id = r.organization_id join public.boxing_weight_classes wc on wc.id = r.weight_class_id
    where o.slug = 'wba' and wc.class_key = 'welterweight' and r.effective_on = '2026-04-30'`), 0);
});

test('backfill: a month with a refused division stays open in the checkpoint and is re-read on resume', async () => {
  const june = 'POST https://www.wbaboxing.com/wba-ranking dates=2026:6:';
  site.set(june, wbaRankingHtml({ label: 'JUNE 2026', date: 'June 30th, 2026', extraDivision: 'EMPEROR WEIGHT' }));
  const first = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 6 }] });
  assert.equal(first.status, 'partial');
  const cp = await store.backfillCheckpoint('wba_official', 'wba-history');
  assert.ok(!(cp.completed ?? []).includes('2026-06'));
  assert.ok((cp.failures ?? []).some((f) => f.month === "2026-06" && f.refused >= 1), JSON.stringify({ cp, m: first.metrics }));
  const pass = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 6 }] });
  assert.equal(pass.metrics.requests, 0, 'a normal pass moves on from a month that already recorded a refusal');
  const again = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 6 }], retryFailed: true });
  assert.equal(again.metrics.requests, 2, 'retryFailed: the month selector, then the open month again');
  const unlisted = await run('wba', { mode: 'backfill', months: [{ y: 1999, m: 12 }] });
  assert.deepEqual([unlisted.metrics.requests, unlisted.metrics.months_not_listed_by_source], [1, ['1999-12']], 'a month the WBA does not list is never requested');
  site.set(june, wbaRankingHtml({ label: 'JUNE 2026', date: 'June 30th, 2026' }));
  const clean = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 6 }], retryFailed: true });
  assert.equal(clean.status, 'ok', JSON.stringify(clean.metrics));
  assert.ok((await store.backfillCheckpoint('wba_official', 'wba-history')).completed.includes('2026-06'));
  // a chunked retry pass reads each failure recorded before the pass once, not again on the next chunk
  site.set(june, wbaRankingHtml({ label: 'JUNE 2026', date: 'June 30th, 2026', extraDivision: 'EMPEROR WEIGHT' }));
  const july = 'POST https://www.wbaboxing.com/wba-ranking dates=2026:7:';
  site.set(july, wbaRankingHtml({ label: 'JULY 2026', date: 'July 31st, 2026', extraDivision: 'EMPEROR WEIGHT' }));
  await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 7 }] });
  const passStart = new Date().toISOString();
  const r1 = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 7 }], retryFailed: passStart });
  const r2 = await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 7 }], retryFailed: passStart });
  assert.deepEqual([r1.metrics.requests, r2.metrics.requests], [2, 0]);
  assert.equal((await run('wba', { mode: 'backfill', months: [{ y: 2026, m: 6 }] })).metrics.requests, 0, 'a completed month is not requested again');
});

test('IBF backfill: every monthly record kept, vacancy without a cause, new holder proposed; checkpoint resumes; NOT RATED visible', async () => {
  const r = await run('ibf', { mode: 'backfill' });
  assert.equal(r.status, 'ok', JSON.stringify(r.metrics));
  assert.equal(r.metrics.requests, 17);
  const hw = await q(`select s.as_of::text, e.holder_status, e.holder_source_name, e.reign_start_on::text, e.ignored_fields from public.boxing_title_status_snapshots s
    join public.boxing_title_status_entries e on e.snapshot_id = s.id join public.boxing_organizations o on o.id = s.organization_id join public.boxing_weight_classes wc on wc.id = s.weight_class_id
    where o.slug = 'ibf' and wc.class_key = 'heavyweight' order by s.as_of`);
  assert.deepEqual(hw.map((x) => [x.as_of, x.holder_status, x.holder_source_name, x.reign_start_on]),
    [['2026-04-30', 'unknown', null, null], ['2026-05-31', 'held', 'Synth King', '2024-06-01'], ['2026-06-30', 'vacant', null, null], ['2026-08-31', 'held', 'Synth Next', '2026-08-29']]);
  assert.equal(await n(`public.boxing_org_identity_reviews where source_name is null or upper(source_name) = 'NOT RATED' or source_name = 'Synth Hidden'`), 0, 'no identity hold for a missing name, printed NOT RATED, or a slot the IBF does not show');
  const april = await store.siteBodyRankings('ibf', 'heavyweight', 'male', '2026-04-30');
  assert.deepEqual([april.snapshot.entries.length, april.snapshot.entries.filter((e) => e.metadata.not_rated).length], [15, 14]);
  const proposals = await q(`select p.change_type, p.previous_holder_source_name, p.holder_source_name, p.cause_as_stated from public.boxing_title_event_proposals p
    join public.boxing_organizations o on o.id = p.organization_id join public.boxing_weight_classes wc on wc.id = p.weight_class_id where o.slug = 'ibf' and wc.class_key = 'heavyweight' order by p.created_at`);
  assert.deepEqual(proposals.map((p) => [p.change_type, p.previous_holder_source_name, p.holder_source_name, p.cause_as_stated]),
    [['became_vacant', 'Synth King', null, null], ['filled', null, 'Synth Next', null]]);
  assert.equal(await n('public.boxing_title_events'), 0, 'a proposal never writes title lineage');
  const rank = await store.siteBodyRankings('ibf', 'heavyweight', 'male', '2026-09-14');
  assert.equal(rank.state, 'current');
  assert.deepEqual(rank.snapshot.entries.slice(0, 2).map((e) => [e.position, e.source_name, e.is_vacant, e.metadata.not_rated]), [[1, null, true, true], [2, 'Synth Other', false, false]]);
  assert.equal(rank.champions.belts[0].holder.name, 'Synth Next', 'champion shown above the list');
  assert.equal(rank.history.length, 4);
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
