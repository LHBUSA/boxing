// Boxing Event Truth V1 acceptance against a real database. Every person, promoter, commission document and bout is
// synthetic. Proves: canonical ids, no display-name joins, temporal card history (replacement, cancellation,
// postponement), append-only result and scorecard revisions, commission title remarks linked across WBC/WBA/IBF/WBO with
// each body's own statement alongside, identity ambiguity failing closed, provenance on every factual lane, idempotent
// repeat ingest, fail-closed document shapes, the deterministic change ledger and the graph assertions.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCardDocument } from '../../shared/events/card.mjs';
import { recordResult, recordScorecards } from '../../shared/events/outcomes.mjs';
import { applyCommissionParsed } from '../../shared/commissions/apply.mjs';
import { ingestIdentity } from '../../shared/identity/pipeline.mjs';
import { NEVADA, parseNevadaResults } from '../../shared/adapters/commissions/nevada.mjs';
import { NEVADA_BOUTS, nevadaPages } from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
const SRC = 'truth_promo_fixture';
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const n = async (sql, params) => Number((await q(`select count(*)::int c from ${sql}`, params))[0].c);
const f = (id, name) => ({ external_id: id, display_name: name });
const NOW = '2026-09-15T12:00:00Z';

const card = (over = {}) => ({
  source_key: SRC, namespace: 'truthpromo', external_id: 'T1', name: 'Synthetic Truth Night', event_date: '2026-11-21', status: 'scheduled',
  source_url: 'https://example.invalid/card/T1', venue: { name: 'Pier Arena', city: 'Harbor City', country_code: 'US' },
  bouts: [
    { external_id: 'm1', bout_order: 1, weight_class_key: 'welterweight', scheduled_rounds: 12, fighter_a: f('t-alpha', 'Tomas Alder'), fighter_b: f('t-bravo', 'Rui Barros'),
      titles: [{ organization_slug: 'wbc', tier: 'world' }] },
    { external_id: 'm2', bout_order: 2, weight_class_key: 'lightweight', scheduled_rounds: 10, fighter_a: f('t-cole', 'Iker Colado'), fighter_b: f('t-dune', 'Sami Dunne') },
    { external_id: 'm3', bout_order: 3, weight_class_key: 'flyweight', scheduled_rounds: 8, fighter_a: f('t-eron', 'Pau Eron'), fighter_b: f('t-fitz', 'Liam Fitzroy') },
  ],
  ...over,
});
const boutId = async (ns, ext) => (await q(`select bout_id from public.boxing_bout_identities where namespace = $1 and external_id = $2`, [`${ns}.bout`, ext]))[0]?.bout_id;
const publicRef = async (table, id) => (await q(`select public_id from public.${table} where id = $1`, [id]))[0].public_id.replace(/^pbe_[a-z]+_/, '');

before(async () => {
  db = await freshDatabase('event_truth');
  store = pgStore(db.client);
  await testSource(db.client, SRC, { source_kind: 'promotion' });
});
after(async () => { await db?.close(); });

test('forward card: canonical ids, announcement in the ledger, repeat ingest idempotent, a bad document shape writes nothing', async () => {
  const v1 = await applyCardDocument(store, card(), { now: NOW });
  assert.equal(v1.status, 'applied');
  const m1 = await boutId('truthpromo', 'm1');
  const [bout] = await q(`select public_id from public.boxing_bouts where id = $1`, [m1]);
  assert.match(bout.public_id, /^pbe_boxbout_[0-9a-f]{32}$/);
  assert.equal(await n(`public.boxing_event_truth_ledger where change_type = 'FIGHT_ANNOUNCED'`), 3);
  const ledgerBefore = await n('public.boxing_event_truth_ledger');
  const again = await applyCardDocument(store, card(), { now: NOW });
  assert.equal(again.changes.length, 0);
  assert.equal(await n('public.boxing_event_truth_ledger'), ledgerBefore, 'a repeat of the same document adds nothing');
  const bad = card(); delete bad.bouts[1].fighter_b;
  const rejected = await applyCardDocument(store, bad, { now: NOW });
  assert.equal(rejected.status, 'rejected');
  assert.equal(await n('public.boxing_event_truth_ledger'), ledgerBefore, 'a document with an unexpected shape writes nothing');
});

test('temporal card history: replacement, cancellation and postponement are appended, never rewritten', async () => {
  const v2 = card({ event_date: '2026-11-28' });
  v2.bouts[1].fighter_b = f('t-gale', 'Hugo Galeano');
  v2.bouts[2].status = 'cancelled';
  const r = await applyCardDocument(store, v2, { now: '2026-09-20T12:00:00Z' });
  assert.deepEqual(r.changes.map((c) => c.change_type).sort(), ['bout_cancelled', 'event_postponed', 'opponent_replaced']);
  const ledger = (await q(`select change_type from public.boxing_event_truth_ledger where source_change_type in ('opponent_replaced','bout_cancelled','event_postponed')`)).map((x) => x.change_type).sort();
  assert.deepEqual(ledger, ['EVENT_POSTPONED', 'FIGHT_CANCELLED', 'OPPONENT_REPLACED']);
  const m2 = await boutId('truthpromo', 'm2');
  const truth = await store.truthBout(await publicRef('boxing_bouts', m2));
  const corners = truth.corners.map((c) => `${c.side}:${c.display_name}:${c.participant_status}`).sort();
  assert.deepEqual(corners, ['a:Iker Colado:scheduled', 'b:Hugo Galeano:scheduled', 'b:Sami Dunne:replaced'], 'the earlier opponent is kept as the earlier card state');
  assert.equal(truth.corners.find((c) => c.display_name === 'Sami Dunne').replaced_by_name, 'Hugo Galeano');
  assert.ok(truth.card_history.some((h) => h.change_type === 'opponent_replaced' && h.source.source_key === SRC));
  const ev = await store.truthEvent(await publicRef('boxing_events', (await q(`select event_id from public.boxing_bouts where id = $1`, [m2]))[0].event_id));
  const postponed = ev.card_history.find((h) => h.change_type === 'event_postponed');
  assert.equal(postponed.before.event_date, '2026-11-21', 'the original date stays readable');
  const m3Ref = await publicRef('boxing_bouts', await boutId('truthpromo', 'm3'));
  assert.equal(ev.bouts.find((x) => x.public_id.endsWith(m3Ref)).status, 'cancelled');
});

test('result and scorecard revisions append; the ledger shows official, corrected and overturned', async () => {
  const m1 = await boutId('truthpromo', 'm1');
  const [a, b] = (await q(`select fighter_id, side from public.boxing_bout_participants where bout_id = $1 and participant_status = 'scheduled' order by side`, [m1])).map((x) => x.fighter_id);
  const officials = [];
  for (const [slot, name] of [[1, 'Vera Quill'], [2, 'Otto Brisk'], [3, 'Nadia Crane']]) {
    const [o] = await q(`insert into public.boxing_officials (display_name, official_type, identity_state) values ($1, 'judge', 'verified') returning id`, [name]);
    await q(`insert into public.boxing_bout_officials (bout_id, official_id, role, slot, source_id, source_url, assignment_state)
      values ($1, $2, 'judge', $3, (select id from public.boxing_sources where source_key = $4), 'https://example.invalid/card/T1', 'assigned')`, [m1, o.id, slot, SRC]);
    officials.push(o.id);
  }
  const cards = (t) => officials.map((id, i) => ({ judge_id: id, slot: i + 1, a_total: t[i][0], b_total: t[i][1], rounds: [] }));
  await recordScorecards(store, { bout_id: m1, source_key: SRC, source_url: 'https://example.invalid/r/1', cards: cards([[116, 112], [115, 113], [114, 114]]) }, { now: NOW });
  await recordResult(store, { bout_id: m1, source_key: SRC, source_url: 'https://example.invalid/r/1', outcome: 'win', winner_id: a, method: 'DECISION', decision_type: 'majority', result_state: 'official' }, { now: NOW });
  await recordScorecards(store, { bout_id: m1, source_key: SRC, source_url: 'https://example.invalid/r/2', cards: cards([[116, 112], [115, 113], [115, 113]]), change_reason: 'tabulation corrected' }, { now: NOW });
  await recordResult(store, { bout_id: m1, source_key: SRC, source_url: 'https://example.invalid/r/3', outcome: 'no_contest', winner_id: null, method: 'NO_CONTEST', result_state: 'overturned',
    change_reason: 'commission ruling' }, { now: NOW });
  const truth = await store.truthBout(await publicRef('boxing_bouts', m1));
  assert.deepEqual(truth.results.map((r) => [r.revision, r.result_state, r.current]), [[1, 'official', false], [2, 'overturned', true]], 'the first official result stays readable');
  assert.equal(truth.scorecards.filter((s) => s.revision === 2).length, 1);
  assert.ok(truth.scorecards.some((s) => s.revision === 1 && !s.current && s.fighter_b_total === 114));
  const types = truth.ledger.map((l) => l.change_type);
  for (const t of ['RESULT_OFFICIAL', 'RESULT_OVERTURNED', 'SCORECARD_POSTED', 'SCORECARD_CORRECTED']) assert.ok(types.includes(t), t);
  assert.ok(b);
});

test('commission sheet: provenance on every lane, title remark linked across the four bodies, body statements alongside, re-apply idempotent', async () => {
  const bouts = NEVADA_BOUTS.map((x, i) => (i === 0 ? { ...x, result: [...x.result.slice(0, 4), '*Two wins WBA Super & WBC & IBF & WBO Welterweight Titles'] } : x));
  const ref = { doc_key: 'nv-truth-09-05', url: 'https://boxing.nv.gov/uploadedFiles/boxingnvgov/content/results/2026_Results/09-05-26_Boxing_REDACTED.pdf', title: '09-05-26_Boxing_REDACTED.pdf' };
  const parsed = parseNevadaResults(ref, nevadaPages({ bouts }), { capturedAt: NOW, sourceRevision: 'sha256:truth' });
  // the WBC's own statement for the division shortly before the fight
  await store.importTitleStatusSnapshot({ source_key: 'wbc_official', organization_slug: 'wbc', gender_scope: 'male', document_kind: 'wbc_ratings', division_native_label: 'WELTERWEIGHT',
    source_url: 'https://wbcboxing.com/mailing/2026/WBC_RATINGS_AUGUST_2026.pdf', as_of: '2026-08-31', as_of_label: 'AUGUST 2026', retrieved_at: NOW, content_hash: 'a'.repeat(64),
    parser_version: 'wbc-ratings-pdf@1.0.0', normalized: { note: 'synthetic' }, claims: [],
    entries: [{ designation_native: 'CHAMPION', holder_status: 'held', holder_source_name: 'SYNTH CURRENTCHAMP', holder_normalized_name: 'synth currentchamp' }] });
  const s1 = await applyCommissionParsed(store, NEVADA, parsed, { now: NOW });
  assert.ok(s1.bouts_linked >= 2, JSON.stringify(s1.skipped));
  const nb = (await q(`select b.id from public.boxing_bouts b join public.boxing_bout_identities i on i.bout_id = b.id where i.namespace like 'nsac%' order by b.bout_order nulls last, b.public_id`)).map((x) => x.id);
  const titled = await q(`select b.id, o.slug, t.tier from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id join public.boxing_organizations o on o.id = t.organization_id
    join public.boxing_bouts b on b.id = bt.bout_id where b.id = any($1) order by o.slug`, [nb]);
  assert.deepEqual(titled.map((t) => `${t.slug}:${t.tier}`), ['ibf:world', 'wba:super', 'wbc:world', 'wbo:world'], 'one commission remark links all four bodies');
  const truth = await store.truthBout(await publicRef('boxing_bouts', titled[0].id));
  assert.equal(truth.titles.length, 4);
  const wbcStatement = truth.sanctioning_bodies.find((x) => x.body === 'wbc');
  assert.ok(wbcStatement, JSON.stringify(truth.sanctioning_bodies));
  assert.equal(wbcStatement.before.belts[0].holder.name, 'SYNTH CURRENTCHAMP', "the WBC's own statement sits beside the bout, not merged into it");
  for (const lane of ['results', 'scorecards', 'weigh_ins']) {
    assert.ok(truth[lane].length > 0, lane);
    assert.ok(truth[lane].every((x) => x.source.source_key === 'nsac_nevada' && x.source.url && x.source.observation), `${lane} carries source, url and observation`);
  }
  const deduction = await q(`select observation_id from public.boxing_point_deductions d join public.boxing_bouts b on b.id = d.bout_id where b.id = any($1)`, [nb]);
  assert.ok(deduction.length && deduction.every((d) => d.observation_id), 'point deductions carry the observation');
  const ledgerBefore = await n('public.boxing_event_truth_ledger');
  const s2 = await applyCommissionParsed(store, NEVADA, parsed, { now: NOW });
  assert.equal(s2.results_created + s2.results_revised + s2.scorecards_written + s2.weigh_ins, 0);
  assert.equal(await n('public.boxing_event_truth_ledger'), ledgerBefore, 're-applying the same official sheet changes nothing');
});

test('identity ambiguity fails closed: two existing boxers share a printed name, the sheet bout is held for review and no bout is created', async () => {
  // two real, distinct boxers with the same printed name, created through the identity pipeline (so the resolver can see them)
  for (const [ext, dob] of [['amb-1', '1994-02-02'], ['amb-2', '1999-07-07']]) {
    const r = await ingestIdentity(store, { sourceKey: SRC, accessMode: 'approved_ingest', namespace: 'otherfeed.fighter', record: { external_id: ext, display_name: 'Kilo Synthetic Nine', dob } });
    assert.equal(r.result.outcome, 'created');
  }
  const bouts = [{ a: ['KILO SYNTHETIC NINE'], aHome: 'Reno, NV', b: ['LIMA SYNTHETIC TEN'], bHome: 'Elko, NV', rds: 6, weights: [150.0, 149.5], fed: ['NV000009', 'NV000010'],
    result: ['Nine won by unanimous decision', 'NINE – TEN', '60-54; 60-54; 59-55', 'Alpha, Deluca, Charlie'], remarks: ['Referee: Robert Refone'] }];
  const ref = { doc_key: 'nv-truth-09-12', url: 'https://boxing.nv.gov/uploadedFiles/boxingnvgov/content/results/2026_Results/09-12-26_Boxing_REDACTED.pdf', title: '09-12-26_Boxing_REDACTED.pdf' };
  const parsed = parseNevadaResults(ref, nevadaPages({ bouts, date: ['September 12', 'th', ', 2026,'] }), { capturedAt: NOW });
  const boutsBefore = await n('public.boxing_bouts');
  const s = await applyCommissionParsed(store, NEVADA, parsed, { now: NOW });
  assert.equal(await n('public.boxing_bouts'), boutsBefore, 'no bout from a corner the resolver cannot name with certainty');
  assert.ok(s.skipped.some((x) => x.reason === 'bout_not_created_identity_unresolved'));
  assert.ok(await n(`public.boxing_identity_review_queue where status = 'pending'`) >= 1);
  assert.equal(await n(`public.boxing_fighters where normalized_name = 'kilo synthetic nine'`), 2, 'no merge and no third boxer from the shared name');
});

test('graph assertions hold; truth index counts the graph', async () => {
  const idx = await store.truthIndex(20);
  const failing = idx.assertions.checks.filter((c) => c.severity === 'failure' && Number(c.count) > 0);
  assert.deepEqual(failing, [], JSON.stringify(failing));
  assert.equal(Number(idx.assertions.failures), 0);
  assert.ok(Number(idx.counts.bout_titles) >= 5);
  assert.ok(idx.counts.ledger_by_type.RESULT_OVERTURNED >= 1 && idx.counts.ledger_by_type.OPPONENT_REPLACED >= 1);
});
