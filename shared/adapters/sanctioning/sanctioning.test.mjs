// Sanctioning-body dry-run parsers and the source-native title model. Every document below is SYNTHETIC: it reproduces
// the layout reviewed on 2026-09-14 with invented names; no sanctioning-body page is committed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWbaChampionsPage, parseWbaRankingPage } from './wba.mjs';
import { parseIbfRecord } from './ibf.mjs';
import { parseWboChampionsPage, parseWboHistoryHtml, parseWboRatingsText } from './wbo.mjs';
import { designationOf, divisionOf } from './vocabulary.mjs';
import { parseDivisionLabel } from '../../rankings/import.mjs';
import { divisionLanes, ibfSnapshot, intraBodyConflicts, mandatoryStatement, titleStatusChanges, toRankingDocument, wbaChampionsSnapshot, wbaRankingSnapshots,
  wboChampionsSnapshot, wboRatingsSnapshots } from '../../titles/sanctioning-snapshot.mjs';

const meta = { sourceUrl: 'https://example.test/doc', retrievedAt: '2026-09-14T16:00:00Z', contentSha256: 'a'.repeat(64) };
const champRow = (name, country, id, designation) => `<tr><td class="text-center"><img alt="${name}"></td><td colspan="2"><p> ${id ? `<a href="https://www.wbaboxing.com/wba-boxer-profile/?id=${id}">${name}</a> <br><span class="text-muted small">${country}</span>` : name} </p></td><td><p>${designation}</p></td></tr>`;
const rankRow = (n, name, id, regional, country) => `<tr><td class="text-center"><p>${n}</p></td><td><p> <a href="https://www.wbaboxing.com/wba-boxer-profile/?id=${id}">${name}</a> </p></td><td>${regional ? `<p>${regional}</p>` : ''}</td><td class="text-center"><p>${country}</p></td></tr>`;
const wbaDivision = (n, label, limit, champs, others, rows) => `
  <div class="row custom-widget-header"><div class="col-12 col-sm-6 hidden-xs text-left"> <a role="button" href="#division${n}"> <i class="glyphicon"></i> <span>
  ${label} </span> </a> </div>
  <div class="col-12 col-sm-6 hidden-xs"> <span class="text-center">${limit}</span> </div></div>
  <div class="collapse" id="division${n}"><div class="panel"><table class="table">${champs}</table></div>
  <div class="panel"><table class="table"><tr><td class="otherorgs text-center" colspan="4">${others}</td></tr>${rows}</table></div></div>`;
const WBA_RANKING = `<h2 class="post-title"> World Boxing Association Ranking as of AUGUST 2026 </h2><a>Download WBA Rankings</a><p>August 31st, 2026</p>`
  + wbaDivision(1, 'LIGHT HEAVYWEIGHT', '175 Lbs / 79,379 Kgs',
    champRow('SYNTH ALPHA', 'RUS', 11, 'WBA SUPER CHAMPION <br>WBO-IBF CHAMPION') + champRow('SYNTH BRAVO', 'USA', 12, 'WBA WORLD CHAMPION') + champRow('SYNTH CHARLIE', 'VEN', 13, 'WBA INTERIM CHAMPION'),
    '<span>WBC</span> <span>SYNTH BRAVO</span> &nbsp;',
    rankRow(1, 'SYNTH DELTA', 21, '', 'RUS') + rankRow(2, 'SYNTH ECHO', 22, 'C/LA', 'CUB'))
  + wbaDivision(2, 'LIGHTWEIGHT', '135 Lbs / 61,235 Kgs',
    champRow('VACANT', null, null, 'WBA WORLD CHAMPION') + `<!--${champRow('SYNTH RECESS', 'USA', 14, 'CHAMPION IN RECESS')}-->`,
    '<span>WBC</span> <span>VACANT</span> &nbsp; <span>IBF</span> <span>SYNTH FOXTROT</span> &nbsp; <span>WBO</span> <span>SYNTH GOLF</span> &nbsp;',
    rankRow(1, 'SYNTH HOTEL', 31, '', 'USA'));

test('WBA ranking page: its own belts per division, claims about other bodies kept apart, commented rows ignored', () => {
  const r = parseWbaRankingPage(WBA_RANKING);
  assert.deepEqual([r.as_of_label, r.published_on, r.divisions.length], ['AUGUST 2026', '2026-08-31', 2]);
  const [lhw, lw] = r.divisions;
  assert.equal(lhw.division.weight_class_key, 'light_heavyweight');
  assert.deepEqual(lhw.champions.map((c) => [c.source_name, c.wba_id, c.designations.map((d) => d.tier)]), [['SYNTH ALPHA', '11', ['super']], ['SYNTH BRAVO', '12', ['regular']], ['SYNTH CHARLIE', '13', ['interim']]]);
  assert.deepEqual(lhw.champions[0].claims_about_other_bodies.map((c) => c.about), ['wbo', 'ibf'], '"WBO-IBF CHAMPION" is a claim about two other bodies, not a WBA belt');
  assert.deepEqual(lhw.entries.map((e) => [e.position, e.source_name, e.regional_label, e.country]), [[1, 'SYNTH DELTA', null, 'RUS'], [2, 'SYNTH ECHO', 'C/LA', 'CUB']]);
  assert.deepEqual(lw.champions.map((c) => [c.vacant, c.source_name]), [[true, null]], 'the commented-out recess row is not published content');
  assert.deepEqual(lw.claims_about_other_bodies.map((c) => [c.about, c.source_name, c.vacant]), [['wbc', null, true], ['ibf', 'SYNTH FOXTROT', false], ['wbo', 'SYNTH GOLF', false]]);
});

const WBA_CHAMPIONS = `<li>IBEROAMERICAN &amp; MEDITERRANEAN</li><div>lightweight</div><div>VACANT</div><div>WBA World</div>
  <div>SYNTH RECESS</div><div>United States</div><div>30-0-1 (28 KO's)</div><div>Champion in recess</div>
  <div>light heavyweight</div><div>SYNTH ALPHA</div><div>Russia</div><div>23-1-0 (12 KO's)</div><div>WBA Super World</div>
  <div>heavyweight</div><div>SYNTH FEMALE</div><div>Mexico</div><div>10-0-0 (1 KO's)</div><div>WBA World</div>`;

test('WBA champions page: vacant belt, champion in recess with no belt tier assumed; the next tab is not read', () => {
  const rows = parseWbaChampionsPage(`${WBA_CHAMPIONS}<div>heavyweight</div>`).rows;
  assert.deepEqual(rows.map((r) => [r.division.weight_class_key, r.source_name, r.designation.tier, r.designation.status]),
    [['lightweight', null, 'regular', 'champion'], ['lightweight', 'SYNTH RECESS', null, 'in_recess'], ['light_heavyweight', 'SYNTH ALPHA', 'super', 'champion'], ['heavyweight', 'SYNTH FEMALE', 'regular', 'champion']]);
  assert.equal(rows[0].vacant, true);
});

const ibfRecord = (over = {}) => ({
  title: 'IBF: LT. HEAVYWEIGHT (175 LBS) &#8211; 08/2026', rating_month: '20260831', post_date: '09/08/2026',
  ratings: ';Synth Delta,Australia (AUS);Synth Echo,United States (USA),Nevada (NV)', champ: 'Synth Alpha,Kyrgyzstan (KGZ),;11/11/2017;10/28/2024;01/28/2023;',
  interim_champ: '', wba: 'Synth Alpha,Kyrgyzstan (KGZ),', wbc: 'TITLE VACANT,,', wbo: 'Synth Alpha,Kyrgyzstan (KGZ),', wc: 'Light Heavyweight (175 LBS)', ...over,
});

test('IBF record: dates as published, NOT RATED slots, dates on a vacant record ignored, other bodies as claims', () => {
  const r = parseIbfRecord(ibfRecord(), { weightSlug: 'light-heavyweight' });
  assert.deepEqual([r.division.weight_class_key, r.results_month_end, r.published_on], ['light_heavyweight', '2026-08-31', '2026-09-08']);
  assert.deepEqual(r.champions.map((c) => [c.source_name, c.title_won_on, c.mandatory_due_on, c.last_defended_on]), [['Synth Alpha', '2017-11-11', '2024-10-28', '2023-01-28']]);
  assert.deepEqual(r.entries.slice(0, 3).map((e) => [e.position, e.source_name, e.not_rated ?? false]), [[1, null, true], [2, 'Synth Delta', false], [3, 'Synth Echo', false]]);
  assert.deepEqual(r.claims_about_other_bodies.map((c) => [c.about, c.source_name, c.vacant]), [['wba', 'Synth Alpha', false], ['wbc', null, true], ['wbo', 'Synth Alpha', false]]);
  const vacant = parseIbfRecord(ibfRecord({ champ: 'TITLE VACANT,,;06/07/2025;;;' }), { weightSlug: 'light-heavyweight' });
  assert.deepEqual([vacant.champions[0].vacant, vacant.champions[0].title_won_on, vacant.champions[0].ignored_fields.title_won], [true, null, '2025-06-07']);
});

test('IBF older records follow the IBF page: printed NOT RATED, only 15 slots shown, a nameless champion is not stated (not vacant)', () => {
  const names = Array.from({ length: 16 }, (_, i) => `Synth Old${i},United States (USA)`);
  const r = parseIbfRecord(ibfRecord({ title: 'IBF: HEAVYWEIGHT &#8211; 01/2006', rating_month: '20060101', champ: ',,;;;;',
    ratings: ['NOT RATED', ...names.slice(1, 15), names[15], 'NOT RATED', ''].join(';') }), { weightSlug: 'heavyweight' });
  assert.equal(r.entries.length, 15);
  assert.deepEqual([r.entries[0].source_name, r.entries[0].not_rated], [null, true], 'the words NOT RATED are never a boxer');
  assert.deepEqual(r.slots_not_shown, ['Synth Old15'], 'a named slot past 15 is noted, never ranked');
  assert.deepEqual(r.champions.map((c) => [c.source_name, c.vacant, c.holder_unknown]), [[null, false, true]]);
  const snap = ibfSnapshot(r, { sourceUrl: 'x', retrievedAt: '2026-09-14T00:00:00Z', contentSha256: 'x' });
  assert.deepEqual(snap.titles.map((t) => [t.status, t.holder]), [['unknown', null]]);
  assert.ok(snap.warnings.some((w) => /slots past 15/.test(w)));
  assert.deepEqual(titleStatusChanges({ titles: snap.titles }, { titles: [{ ...snap.titles[0], status: 'held', holder: { source_name: 'Synth Later' } }] }).title_changes, [], 'not stated -> held proposes nothing');
});

test('WBA prints an unfilled position as one wide "NOT RATED" cell; WBO history ends a list with an empty ** row', () => {
  const html = WBA_RANKING.replace(rankRow(1, 'SYNTH DELTA', 21, '', 'RUS'), '<tr><td class="text-center"><p>\n1 </p></td><td colspan="3"><p>\nNOT RATED </p></td></tr>');
  assert.notEqual(html, WBA_RANKING, 'fixture row 1 replaced');
  const d = parseWbaRankingPage(html).divisions[0];
  assert.deepEqual(d.entries.map((e) => [e.position, e.source_name, Boolean(e.not_rated)]), [[1, null, true], [2, 'SYNTH ECHO', false]]);
  assert.equal(wbaRankingSnapshots(parseWbaRankingPage(html), { sourceUrl: 'x', retrievedAt: 'x', contentSha256: 'x' })[0].ranking.entries[0].is_vacant, true);
  const older = parseWbaRankingPage(WBA_RANKING.replace(rankRow(1, 'SYNTH DELTA', 21, '', 'RUS'), '<tr><td class="text-center"><p>1</p></td><td colspan="3"><p> OFFICIAL CHALLENGER VACANT </p></td></tr>')).divisions[0];
  assert.deepEqual([older.entries[0].not_rated, older.entries[0].slot_text], [true, 'OFFICIAL CHALLENGER VACANT'], 'kept as printed; no challenger is inferred');
  const other = parseWbaRankingPage(WBA_RANKING.replace(rankRow(1, 'SYNTH DELTA', 21, '', 'RUS'), '<tr><td class="text-center"><p>1</p></td><td colspan="3"><p> SEE NOTE </p></td></tr>')).divisions[0];
  assert.equal(other.entries[0].position, 2, 'unrecognised wide-cell text is not read (the structure check then fails closed)');
  const wbo = parseWboHistoryHtml('<h1>WORLD BOXING ORGANIZATION MALE RANKING AUGUST 2026</h1><table class="ranking table"><tr><td class="title-weight text-center">BANTAMWEIGHT (118 lbs)</td></tr>'
    + '<tr><td>1</td><td>SYNTH ONE</td><td>USA</td></tr><tr><td>**</td><td></td><td></td></tr></table>');
  assert.deepEqual([wbo.divisions[0].entries.length, wbo.divisions[0].outside_numbered_list.length], [1, 0]);
});

const WBO_TEXT = `WBO MALE\nWORLD\nRATINGS\nAs of August 28, 2026\n=====PAGE=====\nLT. HEAVYWEIGHT\n(175 lbs) (79.38 kgs)\n1. Synth Delta (RUS)\n2. Synth Echo (Int-Cont) (AUS)
** Synth Regional (WBO Africa) (TZA)\nSYNTH ALPHA WBA\nIBF\nVACANT WBC\nCHAMPIONS\nSYNTH ALPHA (RUS)\nSYNTH INTERIM (Interim) (GBR)
MYSTERYWEIGHT\n(99 lbs) (44.91 kgs)\n1. Synth Mystery (JPN)\nCHAMPIONS\nSYNTH SUPER (Sup. Champion) (MEX)`;

test('WBO ratings text: numbered list, regional champions outside it, claims, interim and Sup. Champion; an unknown division never merges', () => {
  const r = parseWboRatingsText(WBO_TEXT);
  assert.equal(r.as_of, '2026-08-28');
  const [lhw, unknown] = r.divisions;
  assert.deepEqual(lhw.entries.map((e) => [e.position, e.source_name, e.regional_label, e.country]), [[1, 'Synth Delta', null, 'RUS'], [2, 'Synth Echo', 'Int-Cont', 'AUS']]);
  assert.deepEqual(lhw.outside_numbered_list.map((e) => [e.rank_label, e.source_name, e.regional_label]), [['**', 'Synth Regional', 'WBO Africa']]);
  assert.deepEqual(lhw.claims_about_other_bodies.map((c) => [c.about, c.source_name, c.vacant, c.blank]), [['wba', 'SYNTH ALPHA', false, false], ['ibf', null, false, true], ['wbc', null, true, false]]);
  assert.deepEqual(lhw.champions.map((c) => [c.source_name, c.designation.tier]), [['SYNTH ALPHA', 'world'], ['SYNTH INTERIM', 'interim']]);
  assert.deepEqual([unknown.division.native_label, unknown.division.weight_class_key, unknown.entries.length], ['MYSTERYWEIGHT', null, 1], 'flagged, not merged into light heavyweight');
  assert.deepEqual([unknown.champions[0].designation.tier, unknown.champions[0].designation.honorific], ['world', 'super_champion'], 'Super Champion is an honorific on the WBO world belt');
});

const card = (interim, limit, division, first, last, fields) => `${interim ? '<div>INTERIM</div>' : ''}${limit ? `<span>${limit}</span>` : ''}<span>${division}</span><span>${first}</span><span>${last}</span><a>Fighter Profile</a>`
  + Object.entries(fields).map(([k, v]) => `<p>${k}: ${v}</p>`).join('') + '<div>United Kingdom</div><div>22</div><div>W</div>';
const WBO_CHAMPIONS = card(false, '160 LBS', 'MIDDLEWEIGHT', 'Synth', 'Holder', { 'Last WBO Title Defense': 'April 5, 2025', 'Next Mandatory': 'Suspension Period', 'Champion since': 'November 12, 2022', 'Previous champion': '', 'Number of Defenses': '2' })
  + card(true, '160 LBS', 'MIDDLEWEIGHT', 'Synth', 'Interim', { 'Last WBO Title Defense': '', 'Next Mandatory': 'Mandatory vs Synth Challenger', 'Champion since': 'April 4, 2026', 'Previous champion': 'NA', 'Number of Defenses': '' });

test('WBO champions page: reign start and next mandatory only as printed; interim cards recognised', () => {
  const { cards } = parseWboChampionsPage(WBO_CHAMPIONS);
  assert.deepEqual(cards.map((c) => [c.division.weight_class_key, c.source_name, c.designation.tier, c.champion_since_on, c.next_mandatory_as_printed]),
    [['middleweight', 'Synth Holder', 'world', '2022-11-12', 'Suspension Period'], ['middleweight', 'Synth Interim', 'interim', '2026-04-04', 'Mandatory vs Synth Challenger']]);
  assert.deepEqual(mandatoryStatement('Mandatory vs Synth Challenger', { basis: 'x' }).challenger_source_name, 'Synth Challenger');
  assert.deepEqual([mandatoryStatement('Voluntary Period', { basis: 'x' }).challenger_source_name, mandatoryStatement('TBD', { basis: 'x' }).status_as_printed], [null, 'TBD']);
  assert.equal(mandatoryStatement(null, { basis: 'x' }), null, 'no statement, no mandatory');
});

test('division lanes: each lane from its own body only; claims compared, never adopted; undisputed not derived without all four', () => {
  const wba = wbaRankingSnapshots(parseWbaRankingPage(WBA_RANKING), meta);
  const ibf = [ibfSnapshot(parseIbfRecord(ibfRecord(), { weightSlug: 'light-heavyweight' }), meta)];
  const wbo = wboRatingsSnapshots(parseWboRatingsText(WBO_TEXT), meta);
  const lanes = divisionLanes('light_heavyweight', { wba, ibf, wbo }, { reasons: { wbc: 'not approved' } });
  assert.deepEqual([lanes.wbc.state, lanes.wbc.titles.length, lanes.wbc.reason], ['no_own_source', 0, 'not approved']);
  assert.deepEqual(lanes.wbc.claims_by_other_bodies.map((c) => [c.by, c.says, c.agreement]), [['wba', 'SYNTH BRAVO', 'no_own_statement_to_compare'], ['ibf', 'VACANT', 'no_own_statement_to_compare'], ['wbo', 'VACANT', 'no_own_statement_to_compare']],
    'what the others say about the WBC is shown as disagreement data, never as the WBC lane');
  assert.deepEqual(lanes.wba.titles.map((t) => [t.lineage.tier, t.status, t.holder?.source_name]), [['super', 'held', 'SYNTH ALPHA'], ['regular', 'held', 'SYNTH BRAVO'], ['interim', 'held', 'SYNTH CHARLIE']], 'three coexisting WBA belts');
  assert.deepEqual(lanes.ibf.titles.map((t) => [t.status, t.reign_start?.on]), [['held', '2017-11-11']]);
  assert.deepEqual(lanes.wbo.claims_by_other_bodies.map((c) => [c.by, c.agreement]), [['wba', 'agrees'], ['ibf', 'agrees']]);
  assert.deepEqual([lanes.pbe_derived.status, lanes.pbe_derived.rule], ['not_derivable', 'pbe_undisputed@1']);
  assert.match(lanes.pbe_derived.label, /PropBetEdge-derived/);
  assert.deepEqual(toRankingDocument(wba[0], { sourceKey: 'wba_official' }).entries[1], { position: 2, rank_label: '2', source_name: 'SYNTH ECHO', nationality: 'CUB', source_fighter_id: '22', designation: 'C/LA' });
});

test('same body, two documents: a belt only one lists is not a conflict; a different holder is', () => {
  const ranking = wbaRankingSnapshots(parseWbaRankingPage(WBA_RANKING), meta)[1];
  const champions = wbaChampionsSnapshot(parseWbaChampionsPage(`${WBA_CHAMPIONS}<div>heavyweight</div>`), meta, 'lightweight');
  const r = intraBodyConflicts(ranking, champions);
  assert.deepEqual(r.conflicts, []);
  assert.deepEqual(r.not_listed_in_both, [{ belt: 'Champion in recess|in_recess', only_in: 'champions' }]);
  const wboRatings = wboRatingsSnapshots(parseWboRatingsText(WBO_TEXT.replace('SYNTH ALPHA (RUS)', 'SYNTH OTHER (RUS)')), meta)[0];
  const wboCh = wboChampionsSnapshot(parseWboChampionsPage(WBO_CHAMPIONS.replace(/MIDDLEWEIGHT/g, 'LT. HEAVYWEIGHT').replace('160 LBS', '175 LBS')), meta, 'light_heavyweight');
  assert.ok(intraBodyConflicts(wboRatings, wboCh).conflicts.some((c) => c.belt === 'world|belt'));
});

test('snapshots over time: a vacancy is recorded without a cause; a new holder carries only the printed reign start', () => {
  const s = (champ, ratings) => ibfSnapshot(parseIbfRecord(ibfRecord({ champ, ratings }), { weightSlug: 'light-heavyweight' }), meta);
  const may = s('Synth Alpha,Kyrgyzstan (KGZ),;11/11/2017;;;', 'Synth Delta,Australia (AUS);Synth Echo,United States (USA)');
  const june = s('TITLE VACANT,,;11/11/2017;;;', 'Synth Delta,Australia (AUS);Synth Echo,United States (USA)');
  const aug = s('Synth Delta,Australia (AUS),;08/29/2026;;;', 'Synth Echo,United States (USA);Synth New,Cuba (CUB)');
  assert.deepEqual(titleStatusChanges(may, june).title_changes, [{ type: 'became_vacant', tier: 'world', previous_holder: 'Synth Alpha', cause: 'not stated in this document' }]);
  const step = titleStatusChanges(june, aug);
  assert.deepEqual(step.title_changes.map((c) => [c.type, c.holder, c.reign_start?.on]), [['filled', 'Synth Delta', '2026-08-29']]);
  assert.ok(step.ranking_changes.some((c) => c.type === 'removed' && c.source_name === 'Synth Delta'), 'the new champion leaves the numbered list');
  assert.ok(step.ranking_changes.some((c) => c.type === 'new_entrant' && c.source_name === 'Synth New'));
});

test('vocabulary: bodies stay distinct; unknown labels are kept and flagged; abbreviated division labels parse', () => {
  assert.deepEqual([designationOf('wba', 'WBA Super World').tier, designationOf('wbo', 'Sup. Champion').tier, designationOf('ibf', 'Franchise Champion').known], ['super', 'world', false]);
  assert.deepEqual([divisionOf('ibf', 'jr-middleweight').weight_class_key, divisionOf('wbo', 'JR. HEAVYWEIGHT').weight_class_key, divisionOf('wba', 'BRIDGERWEIGHT').weight_class_key], ['super_welterweight', 'cruiserweight', 'bridgerweight']);
  for (const [label, key] of [['LT. HEAVYWEIGHT', 'light_heavyweight'], ['S. MIDDLEWEIGHT (168 LBS)', 'super_middleweight'], ['SUP. MIDDLEWEIGHT', 'super_middleweight'], ['Lt. Flyweight', 'light_flyweight'], ['JR. MIDDLEWEIGHT', 'super_welterweight'], ['MINI-FLYWEIGHT', 'minimumweight'], ['HEAVYWEIGHT (OVER 200LBS)', 'heavyweight']]) {
    assert.equal(parseDivisionLabel(label).weight_class_key, key, label);
  }
});
