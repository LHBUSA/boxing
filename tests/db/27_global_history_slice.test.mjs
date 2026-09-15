// Global Boxing History V1: the first vertical slice against a real database.
//
// Unlike the synthetic suites, this one replays REAL stored facts exported read-only from Boxing staging
// (scripts/staging/history-slice-export.ps1): the Nevada State Athletic Commission results sheet for 2026-03-28 at MGM
// Grand Garden Arena (parsed events and bouts only), the Wikidata identities already bound to that card by the
// bout-context rule, and every WBA/IBF/WBO/WBC document statement for the male super welterweight division. It proves the
// card -> fighter -> division path end to end: canonical ids, aliases without name merges, the full card in sheet order,
// weights against a time-aware class limit, the result ontology with the source string kept, stoppage round and time,
// judges' cards checked against the stated decision, officials, titles (linked and as printed), body statements collapsed
// into runs, venue / commission jurisdiction, provenance on every lane, derived card statistics, the as-of passport, and
// the registry and assertions. Every read is shown to write nothing and to stay away from Fight DNA and model objects.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshDatabase, rolledBack } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCommissionParsed } from '../../shared/commissions/apply.mjs';
import { NEVADA } from '../../shared/adapters/commissions/nevada.mjs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/history/${name}`, import.meta.url), 'utf8').replace(/^﻿/, ''));
const SHEET = fixture('nsac-2026-03-28.json');
const WIKIDATA = fixture('wikidata-identities.json');
const BODIES = fixture('super-welterweight-bodies.json');
const NOW = '2026-09-15T12:00:00Z';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const ref = (publicId) => publicId.replace(/^pbe_[a-z]+_/, '');
let card;
let eventRef;
const bout = (n) => card.bouts.find((b) => b.listed_order === n);

before(async () => {
  db = await freshDatabase('global_history');
  store = pgStore(db.client);
  // the document observation the collector stores for every fetched sheet (facts only; the PDF text layer is not exported)
  await store.recordObservation({ source_key: 'nsac_nevada', entity_type: 'commission_results_document', external_key: SHEET.doc_key, source_url: SHEET.url,
    payload: { url: SHEET.url, doc_key: SHEET.doc_key, events: SHEET.events, bouts: SHEET.bouts }, content_hash: SHEET.sha256.replace(/^sha256:/, '').padEnd(64, '0').slice(0, 64),
    parser_version: SHEET.parser_version });
  const summary = await applyCommissionParsed(store, NEVADA, { events: SHEET.events, bouts: SHEET.bouts }, { now: NOW });
  assert.equal(summary.bouts_linked, 10, 'every bout on the sheet becomes a canonical bout in an empty graph');

  // replay the identity bindings staging already holds (made by wikidata_boxer_item_with_wikipedia_record_row_of_our_bout@1);
  // the fixture locates each corner among THIS card's participants, the way the enrichment did, never by a global name search
  for (const w of WIKIDATA) {
    const { fighter_id: fighterId } = await one(`select p.fighter_id from public.boxing_bout_participants p
      join public.boxing_fighters f on f.id = p.fighter_id join public.boxing_bout_identities bi on bi.bout_id = p.bout_id
      where f.display_name = $1 and bi.external_id like '2026-03-28|grand-garden|%' limit 1`, [w.commission_name]);
    await q(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, external_url, source_display_name, verification_state, confidence, evidence)
      values ($1, (select id from public.boxing_sources where source_key = 'wikidata'), 'wikidata.item', $2, $3, $4, 'verified', $5, $6)`,
      [fighterId, w.qid, `https://www.wikidata.org/wiki/${w.qid}`, w.label, w.confidence, { rule: w.rule, qid: w.qid, title: w.wiki_title, opponent: w.opponent, bout_date: w.bout_date }]);
  }

  const key = (s) => s?.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() ?? null;
  const statuses = {};
  for (const p of BODIES) {
    const r = await store.importTitleStatusSnapshot({ ...p, entries: p.entries.map((e) => ({ ...e, holder_normalized_name: key(e.holder_source_name) })) });
    statuses[r.status] = (statuses[r.status] ?? 0) + 1;
  }
  assert.deepEqual(Object.keys(statuses).sort(), ['created'], `every body statement imports: ${JSON.stringify(statuses)}`);

  const ev = await one(`select public_id from public.boxing_events`);
  eventRef = ref(ev.public_id);
  card = await one(`select public.boxing_archive_card($1) r`, [eventRef]).then((x) => x.r);
});
after(async () => { await db?.close(); });

test('registry: every enabled source declares its lanes; stored coverage and parser lineage are live; assertions hold', async () => {
  const [nv] = (await one(`select public.boxing_source_registry_json('nsac_nevada') r`)).r;
  const lane = (k) => nv.lanes.find((l) => l.lane === k);
  assert.equal(lane('results').availability, 'provided');
  assert.equal(lane('knockdowns').availability, 'not_provided');
  assert.equal(lane('scorecard_rounds').availability, 'not_provided');
  assert.equal(lane('results').jurisdiction, 'US-NV');
  assert.equal(nv.stored.events, 1);
  assert.equal(nv.stored.bouts, 10);
  const [nj] = (await one(`select public.boxing_source_registry_json('nj_sacb') r`)).r;
  assert.equal(nj.lanes.find((l) => l.lane === 'results').rights_scope, 'review_scope_gap', 'NJ results run beyond the recorded rights review scope');
  const [boxrec] = (await one(`select public.boxing_source_registry_json('boxrec') r`)).r;
  assert.ok(boxrec.lanes.every((l) => l.availability === 'not_permitted'));
  const [wbc] = (await one(`select public.boxing_source_registry_json('wbc_official') r`)).r;
  assert.ok(wbc.stored.title_documents >= 2, 'the WBC ratings PDF and champions grid for this division');
  assert.ok(wbc.parser_lineage.some((p) => p.parser_version === 'wbc-ratings-pdf@1.0.0'), 'parser versions come from the stored observations');

  const a = (await one(`select public.boxing_archive_assertions() r`)).r;
  assert.equal(a.failures, 0, JSON.stringify(a.checks.filter((c) => c.severity === 'failure' && c.count > 0)));
  const info = Object.fromEntries(a.checks.map((c) => [c.assertion, c.count]));
  assert.equal(info.stoppage_round_not_stated, 1, 'the one sheet line printed without a round is counted, not repaired');
  assert.ok(info.lanes_with_rights_review_scope_gap >= 1);
  await assert.rejects(q(`update public.boxing_source_capabilities set availability = 'provided'`), /append_only_violation/i);
});

test('card: the whole NSAC sheet in order with venue, commission jurisdiction, officials, weights, results, cards and provenance', async () => {
  assert.equal(card.event.event_date, '2026-03-28');
  assert.match(card.event.global_event_id, /^pbe_boxevent_[0-9a-f]{32}$/);
  assert.equal(card.event.venue.name, 'MGM Grand Garden Arena');
  assert.equal(card.event.venue.jurisdiction.code, 'US-NV');
  assert.equal(card.event.commission.slug, 'nsac');
  assert.equal(card.event.commission.jurisdiction.code, 'US-NV', 'the commission row stores only "Nevada"; the exact subdivision name resolves it');
  assert.deepEqual(card.event.promoters_as_printed, ['TGB Promotions & Sampson Boxing']);
  assert.equal(card.event.broadcast.lane, 'no_approved_source_states_it');
  assert.deepEqual(card.bouts.map((b) => b.listed_order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const main = bout(1);
  assert.match(main.global_bout_id, /^pbe_boxbout_[0-9a-f]{32}$/);
  assert.deepEqual(main.corners.map((c) => c.display_name), ['Sebastian Alexander Fundora', 'Keith Fitzgerald Thurman']);
  assert.equal(main.corners[0].name_as_printed, 'SEBASTIAN ALEXANDER FUNDORA', 'the name exactly as the sheet prints it');
  assert.equal(main.corners[0].hometown_as_printed, 'Tehachapi, CA');
  assert.equal(main.scheduled_rounds, 12);
  assert.equal(main.result.classification.code, 'TKO');
  assert.equal(main.result.classification.source_text, 'Fundora won by TKO 1:17 of round 6');
  assert.deepEqual(main.result.classification.flags, []);
  assert.equal(main.result.round, 6);
  assert.equal(main.result.time, '1:17');
  assert.equal(main.result.winner_side, 'a');
  assert.equal(main.decision_check.status, 'not_a_decision');
  assert.deepEqual(main.officials.map((o) => `${o.role}:${o.name}`), ['referee:Thomas Taylor']);
  assert.deepEqual(main.scorecards, []);
  assert.equal(main.knockdowns.lane, 'source_does_not_publish');
  assert.equal(main.weights.weight_class, 'super_welterweight');
  assert.equal(main.weights.weight_class_basis, 'title_at_stake');
  assert.equal(Number(main.weights.class_limit.limit_lb), 154);
  assert.equal(main.weights.class_limit.verified_for_date, false, 'the present-day reference is never presented as the limit in force on the date');
  assert.deepEqual(main.weights.corners.map((c) => [Number(c.official_weight_lb), c.over_class_limit_lb]), [[153.6, null], [152.6, null]]);
  assert.deepEqual(main.titles.linked.map((t) => `${t.organization}:${t.tier}:${t.weight_class}`), ['wbc:world:super_welterweight']);
  const [remark] = main.titles.remarks_as_printed;
  assert.equal(remark.action, 'retained');
  assert.equal(remark.division, 'super_welterweight');
  assert.deepEqual(remark.belts.map((b) => [b.bodies_named, b.scope]), [[['WBC'], 'world']]);

  const co = bout(2);
  assert.equal(co.result.classification.code, 'UD');
  assert.deepEqual(co.scorecards.map((s) => [s.judge, Number(s.fighter_a_total), Number(s.fighter_b_total)]),
    [['Eric Cheek', 98, 92], ['Patricia Morse Jarman', 97, 93], ['David Sutherland', 97, 93]]);
  assert.equal(co.decision_check.status, 'consistent');
  assert.equal(co.titles.linked.length, 0, 'a regional belt is never linked as a world title');
  assert.deepEqual(co.titles.remarks_as_printed[0].belts.map((b) => [b.bodies_named, b.scope, b.qualifiers]), [[['WBA'], 'continental', ['gold']]]);
  assert.ok(co.weights.observations.includes('weight_class_not_stated_by_source'));

  const third = bout(3);
  const r3 = third.titles.remarks_as_printed[0];
  assert.equal(r3.action, 'won');
  assert.equal(r3.division, 'middleweight');
  assert.deepEqual(r3.belts.map((b) => [b.bodies_named, b.scope]), [[['WBA'], 'continental'], [['NABO'], 'regional']]);
  assert.equal(third.weights.weight_class_basis, 'title_remark_as_printed');
  assert.deepEqual(third.weights.corners.map((c) => c.over_class_limit_lb == null ? null : Number(c.over_class_limit_lb)), [null, 0.8]);
  assert.ok(third.weights.observations.includes('official_weight_above_class_limit_without_stated_contract'), 'Gausha 160.8 at a 160 limit is shown, not reinterpreted');

  const hov = bout(4);
  assert.equal(hov.result.classification.code, 'TKO');
  assert.equal(hov.result.round, null);
  assert.deepEqual(hov.result.classification.flags.sort(), ['source_text_incomplete', 'stoppage_round_not_stated']);

  const md = card.bouts.find((b) => b.result?.classification.code === 'MD');
  assert.equal(md.result.winner_side, 'b');
  assert.equal(md.corners[1].display_name, 'Kevin Darryl Newman II');
  const draw = card.bouts.find((b) => b.corners.some((c) => c.display_name === 'Cristian Cangelosi'));
  assert.equal(draw.result.classification.code, 'SPLIT_DRAW');
  assert.equal(draw.result.winner_global_fighter_id, null);

  // provenance on every factual lane
  for (const b of card.bouts) {
    assert.equal(b.source.source_key, 'nsac_nevada');
    assert.equal(b.result.source.source_key, 'nsac_nevada');
    assert.ok(b.result.source.observation, 'the result links the observation it came from');
    assert.equal(b.source_document.document_key, 'nv-results:2026:03-28-26_Boxing_REDACTED');
    for (const lane of [...b.scorecards, ...b.officials]) assert.equal(lane.source.source_key, 'nsac_nevada');
    for (const c of b.weights.corners) if (c.official_weight_lb != null) assert.ok(c.source.observation, 'weigh-ins carry their observation (0042 recorders)');
  }

  assert.deepEqual(card.derived.by_result_code, { MD: 1, SPLIT_DRAW: 1, TKO: 5, UD: 3 });
  assert.equal(card.derived.stoppage_rate, 0.5);
  assert.equal(card.derived.rounds_scheduled, 86);
  assert.equal(card.derived.rounds_fought, 58.6, '44 decision rounds + 14.60 completed stoppage rounds; the stoppage printed without a round is left out');
  assert.equal(card.derived.stoppages_without_round_or_time, 1);
  assert.equal(card.coverage.lanes.knockdowns, 'not_provided');
});

test('identity: one canonical fighter carries the licensed name, the Wikidata label and its source id; body documents are never joined by name', async () => {
  const fundora = bout(1).corners[0].global_fighter_id;
  const p = (await one(`select public.boxing_fighter_passport($1) r`, [ref(fundora)])).r;
  assert.equal(p.global_fighter_id, fundora);
  const names = p.names.map((n) => `${n.kind}|${n.name}`);
  assert.ok(names.includes('alias:name|Sebastian Alexander Fundora'));
  assert.ok(names.includes('source_label:wikidata.item|Sebastian Fundora'), 'the common name comes from the proven identity, not from a name match');
  assert.deepEqual(p.source_ids.map((i) => [i.namespace, i.id, i.rule]), [['wikidata.item', 'Q110977051', 'wikidata_boxer_item_with_wikipedia_record_row_of_our_bout@1']]);
  assert.deepEqual(p.attributes.date_of_birth, { value: null, policy: 'not stored (owner rule)' });
  assert.equal(p.nickname.basis, 'no approved source states one');
  assert.deepEqual(p.career.professional.record_on_file, { W: 1, L: 0, D: 0, NC: 0, ND: 0 });
  assert.deepEqual(p.career.professional.wins_by_code, { TKO: 1 });
  assert.equal(p.career.amateur.status, 'not_modeled');
  assert.equal(p.bouts[0].opponent.display_name, 'Keith Fitzgerald Thurman');
  assert.deepEqual(p.bouts[0].titles.map((t) => `${t.organization}:${t.tier}`), ['wbc:world']);
  assert.equal(p.bouts[0].venue.jurisdiction.code, 'US-NV');
  assert.deepEqual(p.divisions.map((d) => d.weight_class), ['super_welterweight']);
  assert.deepEqual(p.officials_faced.map((o) => `${o.role}:${o.name}`), ['referee:Thomas Taylor']);
  // the WBC prints "SEBASTIAN FUNDORA" as champion: that statement stays unlinked until an identity decision proves it
  assert.equal(p.body_statements_resolved_to_fighter, 0);

  const before = (await one(`select public.boxing_fighter_passport($1, '2026-03-28') r`, [ref(fundora)])).r;
  assert.equal(before.bouts.length, 0, 'as of fight day, the fight itself is not yet known');
  assert.deepEqual(before.career.professional.record_on_file, { W: 0, L: 0, D: 0, NC: 0, ND: 0 });

  const thurman = bout(1).corners[1].global_fighter_id;
  const m = (await one(`select public.boxing_archive_meetings($1, $2) r`, [ref(fundora), ref(thurman)])).r;
  assert.deepEqual(m.meetings.map((x) => [x.event_date, x.result_for_a, x.code]), [['2026-03-28', 'W', 'TKO']]);
  assert.deepEqual(m.common_opponents, []);
  assert.equal(await one(`select count(*)::int c from public.boxing_fighters where merged_into_id is not null`).then((x) => x.c), 0, 'nothing was merged');
});

test('titles: the WBC runs corroborate the commission remark; three bodies give 2000-2026 division history from their own documents', async () => {
  const wbc = (await one(`select public.boxing_archive_title_runs('wbc', 'super_welterweight') r`)).r;
  const world = wbc.runs.filter((r) => r.tier === 'world');
  const fundoraRun = world.find((r) => r.holder_as_printed?.toUpperCase() === 'SEBASTIAN FUNDORA');
  assert.ok(fundoraRun, JSON.stringify(world));
  assert.equal(fundoraRun.reign_start_as_printed, '2024-03-30');
  assert.equal(fundoraRun.last_defense_as_printed, '2026-03-28', "the WBC's own last-defense date is the date of the NSAC card");
  assert.equal(fundoraRun.identity, 'unresolved_name_as_printed');
  assert.equal(bout(1).titles.remarks_as_printed[0].action, 'retained');

  const division = (await one(`select public.boxing_archive_division('super_welterweight') r`)).r;
  const body = (slug) => division.bodies.find((b) => b.organization === slug);
  assert.equal(body('ibf').first_document_on, '2005-12-01');
  assert.equal(body('wbo').first_document_on, '2000-01-31');
  assert.equal(body('wba').first_document_on, '2000-01-31');
  for (const slug of ['wba', 'ibf', 'wbo']) {
    assert.ok(body(slug).runs.length > 5, `${slug} lineage runs`);
    for (const r of body(slug).runs) assert.match(r.first_source_url, /^https:\/\//);
  }
  assert.equal(division.title_bouts_on_record.length, 1);
  assert.equal(division.title_bouts_on_record[0].global_bout_id, bout(1).global_bout_id);
  assert.ok(division.native_labels.some((l) => l.organization === 'wbc'));
  assert.equal(await one(`select count(*)::int c from public.boxing_title_events`).then((x) => x.c), 0, 'no title event is created by any archive read');
});

test('result ontology is deterministic: every stored combination maps to one code and ambiguity is flagged, never reinterpreted', async () => {
  const c = async (...args) => (await one(`select public.boxing_classify_result($1, $2, $3, $4, $5, $6, $7, $8) r`, args)).r;
  const cases = [
    [['win', 'DECISION', 'unanimous', 'official', 'x', 'professional', null, null], 'UD', []],
    [['win', 'DECISION', 'split', 'official', 'x', 'professional', null, null], 'SD', []],
    [['win', 'DECISION', 'majority', 'official', 'x', 'professional', null, null], 'MD', []],
    [['win', 'DECISION', null, 'official', 'won by decision', 'professional', null, null], 'DEC', ['decision_type_not_stated']],
    [['win', 'TECHNICAL_DECISION', 'unanimous', 'official', 'x', 'professional', 8, 60], 'TD', []],
    [['draw', 'TECHNICAL_DECISION', null, 'official', 'x', 'professional', 4, 30], 'TECHNICAL_DRAW', []],
    [['draw', 'DECISION', 'majority', 'official', 'x', 'professional', null, null], 'MAJORITY_DRAW', []],
    [['draw', 'DECISION', null, 'official', 'draw', 'professional', null, null], 'DRAW_UNSPECIFIED', ['decision_type_not_stated']],
    [['win', 'RTD', null, 'official', 'x', 'professional', 7, 180], 'RTD', []],
    [['win', 'DQ', null, 'official', 'x', 'professional', null, null], 'DQ', ['stoppage_round_not_stated']],
    [['no_contest', 'NO_CONTEST', null, 'overturned', 'x', 'professional', 3, 10], 'NC', ['overturned']],
    [['no_decision', 'NO_DECISION', null, 'official', 'x', 'professional', null, null], 'ND', []],
    [['win', 'DECISION', 'newspaper', 'official', 'x', 'professional', null, null], 'NWS', []],
    [['win', 'OTHER', null, 'official', 'walkover', 'professional', null, null], 'WALKOVER', []],
    [['win', 'OTHER', null, 'official', 'forfeit', 'professional', null, null], 'UNCLASSIFIED', ['not_interpreted']],
    [['win', 'KO', null, 'official', 'x', 'exhibition', 2, 40], 'EXHIBITION', []],
  ];
  for (const [args, code, flags] of cases) {
    const r = await c(...args);
    assert.equal(r.code, code, JSON.stringify(args));
    assert.deepEqual(r.flags.sort(), flags.sort(), JSON.stringify(args));
    assert.equal(r.rule, 'pbe_result_ontology@1');
  }
  const exh = await c('win', 'KO', null, 'official', 'x', 'exhibition', 2, 40);
  assert.equal(exh.underlying_code, 'KO');
  assert.equal(exh.counts_in_professional_record, false);
  assert.equal((await c('win', 'DECISION', 'newspaper', 'official', 'x', 'professional', null, null)).counts_in_professional_record, false);
});

test('weight classes are time-aware: a sourced definition governs its dates; the present-day reference never claims history', async () => {
  await rolledBack(db.client, async () => {
    await q(`insert into public.boxing_sources (source_key, source_name, source_kind, access_mode, rights_state, enabled)
      values ('history_fixture_source', 'Synthetic historical rulebook', 'reference', 'reference_only', 'reference_only', false)`);
    const cw = (await one(`select id from public.boxing_weight_classes where class_key = 'cruiserweight'`)).id;
    await q(`insert into public.boxing_weight_class_definitions (weight_class_id, native_label, limit_lb, valid_from, valid_to, basis, source_id, source_url, note)
      values ($1, 'Synthetic cruiser', 188, '1980-01-01', '1989-12-31', 'source_statement', (select id from public.boxing_sources where source_key = 'history_fixture_source'),
              'https://example.invalid/rulebook', 'synthetic fixture, not a historical claim')`, [cw]);
    const old = (await one(`select public.boxing_weight_class_as_of($1, '1985-06-01') r`, [cw])).r;
    assert.equal(Number(old.limit_lb), 188);
    assert.equal(old.verified_for_date, true);
    const now = (await one(`select public.boxing_weight_class_as_of($1, '2026-03-28') r`, [cw])).r;
    assert.equal(Number(now.limit_lb), 200);
    assert.equal(now.basis, 'pbe_modern_reference');
    assert.equal(now.verified_for_date, false);
    await q(`insert into public.boxing_weight_class_definitions (weight_class_id, native_label, limit_lb, valid_from, valid_to, basis, source_id, source_url)
      values ($1, 'Synthetic overlap', 190, '1989-01-01', null, 'source_statement', (select id from public.boxing_sources where source_key = 'history_fixture_source'), 'https://example.invalid/r2')`, [cw]);
    const a = (await one(`select public.boxing_archive_assertions() r`)).r;
    assert.equal(a.checks.find((x) => x.assertion === 'weight_definition_overlap').count, 1, 'overlapping sourced limits fail the assertions');
  });
});

test('isolation: archive reads write nothing, are not volatile and never touch Fight DNA or model objects', async () => {
  const counts = async () => (await q(`select relname, n_tup_ins + n_tup_upd + n_tup_del w from pg_stat_user_tables where schemaname = 'public' order by relname`));
  const snapshot = async () => (await q(`select (select count(*) from public.boxing_bout_results) r, (select count(*) from public.boxing_title_events) t,
    (select count(*) from public.boxing_fighter_identities) i, (select count(*) from public.boxing_source_observations) o, (select count(*) from public.boxing_fighter_metric_snapshots) m`))[0];
  const before = await snapshot();
  await counts();
  const fundora = ref(bout(1).corners[0].global_fighter_id);
  await q(`select public.boxing_archive_card($1), public.boxing_fighter_passport($2), public.boxing_archive_division('super_welterweight'), public.boxing_archive_index(),
    public.boxing_source_registry_json(), public.boxing_archive_meetings($2, $2)`, [eventRef, fundora]);
  assert.deepEqual(await snapshot(), before);
  const fns = await q(`select p.proname, p.provolatile, pg_get_functiondef(p.oid) def from pg_proc p where p.pronamespace = 'public'::regnamespace
    and (p.proname like 'boxing_archive%' or p.proname in ('boxing_fighter_passport','boxing_source_registry_json','boxing_classify_result','boxing_classify_title_remark',
      'boxing_weight_class_as_of','boxing_jurisdiction_json'))`);
  assert.ok(fns.length >= 14);
  for (const f of fns) {
    assert.notEqual(f.provolatile, 'v', `${f.proname} must not be volatile`);
    assert.doesNotMatch(f.def, /boxing_(models|model_outputs|fighter_metric_snapshots|official_metric_snapshots|matchup_snapshots|intel_runs)\b/, `${f.proname} stays out of model lineage`);
    assert.doesNotMatch(f.def, /\b(insert|update|delete)\s+(into\s+)?public\./i, `${f.proname} writes nothing`);
  }
  const idx = (await one(`select public.boxing_archive_index() r`)).r;
  assert.equal(idx.assertions.failures, 0);
  assert.deepEqual(idx.results_by_code, { MD: 1, SPLIT_DRAW: 1, TKO: 5, UD: 3 });
  assert.ok(idx.jurisdictions.some((j) => j.code === 'US-NV'));
});
