import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPORT } from './contract.mjs';
import { findSensitive } from './minimize.mjs';
import { extractDeviceText } from './pdf-device.mjs';
import { decodeShiftedText, parseTennesseeIndex, parseTennesseeMethod, parseTennesseeResults, parseTennesseeTime, scoreOrder, tennesseeResultLinks } from './tennessee.mjs';
import { TENNESSEE_ARCHIVE_HTML, TENNESSEE_BOUTS, TENNESSEE_EVENTS_HTML, TENNESSEE_ROTATED_BOUTS, tennesseePages } from '../../../tests/fixtures/commissions/synthetic.mjs';

const ref = { doc_key: 'tn-results:2026/SYNTHETIC-BOXING_9-5', url: 'https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2026/SYNTHETIC-BOXING_9-5.pdf',
  event_date: '2026-09-05', city: 'Nashville', sport_hint: SPORT.BOXING, professional_hint: true, event_type_raw: 'Pro Boxing' };

test('Tennessee index: every result link with the row date, event type and the link sport', () => {
  const refs = [...parseTennesseeIndex(TENNESSEE_EVENTS_HTML), ...parseTennesseeIndex(TENNESSEE_ARCHIVE_HTML)];
  assert.deepEqual(refs.map((r) => [r.event_date, r.event_type_raw, r.sport_hint, r.link_label]), [
    ['2026-09-05', 'Pro Boxing', SPORT.BOXING, 'Results'], ['2026-09-06', 'Pro-Am MMA', SPORT.MMA, 'Results'],
    ['2026-09-12', 'Pro-Am Boxing', SPORT.BOXING, 'Boxing Results'], ['2026-09-12', 'Pro-Am Boxing', SPORT.BARE_KNUCKLE, 'Bare-Knuckle Results'],
    ['2026-09-13', 'Pro Boxing', SPORT.BOXING, 'Results'], ['2025-12-20', 'Pro Boxing', SPORT.BOXING, 'Results'],
    ['2025-12-06', 'All Pro Boxing', SPORT.BOXING, 'Results'], [null, 'Pro Boxing', SPORT.BOXING, 'Results'],
  ]);
  // no link is dropped: cells with markup parse, a mistyped date keeps its link with the raw text and the folder year
  const typo = refs.at(-1);
  assert.deepEqual([typo.index_date_raw, typo.url_year, typo.listed_name], ['11/2/202', 2025, 'Synthetic Typo Night']);
  assert.equal(refs[6].listed_name, 'Synthetic Markup Night');
  for (const html of [TENNESSEE_EVENTS_HTML, TENNESSEE_ARCHIVE_HTML]) assert.deepEqual(tennesseeResultLinks(html).sort(), parseTennesseeIndex(html).map((r) => r.url).sort());
  assert.equal(refs[0].doc_key, 'tn-results:2026/SYNTHETIC-BOXING_9-5');
  assert.ok(refs.every((r) => r.url.startsWith('https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/')));
});

test('Tennessee form: winner and status from drawn marks, referee per bout, judges by listed name, totals only when the cards fix the order', () => {
  const r = parseTennesseeResults(ref, tennesseePages({ bouts: TENNESSEE_BOUTS }), { capturedAt: '2026-09-14T00:00:00Z' });
  assert.equal(r.classification.accepted, true, r.classification.reason);
  assert.deepEqual(r.problems, []);
  assert.equal(r.events[0].source_event_id, '2026-09-05|nashville|synthetic-hall');
  assert.deepEqual([r.events[0].venue.name, r.events[0].venue.city, r.events[0].promoters], ['Synthetic Hall', 'Nashville', ['Synthetic Promotions']]);
  // the amateur bout (status mark on "Am") never becomes a bout
  assert.deepEqual(r.bouts.map((b) => b.bout_order), [1, 2, 3, 5, 6]);
  assert.deepEqual(r.rejected.map((x) => x.reason), ['amateur_bout', 'ambiguous_winner_marks']);
  const [ud, tko, split, draw, ambiguous] = r.bouts;
  assert.deepEqual([ud.fighter_a.display_name, ud.fighter_a.weight_lb, ud.fighter_b.display_name, ud.scheduled_rounds], ['Synth Alpha', 146.2, 'Synth Bravo', 4]);
  assert.deepEqual([ud.result.outcome, ud.result.winner_side, ud.result.method, ud.result.decision_type, ud.result.round, ud.result.time_sec], ['win', 'a', 'DECISION', 'unanimous', null, null]);
  assert.deepEqual(ud.judges.map((j) => [j.slot, j.name, j.a_total, j.b_total]), [[1, 'Jan Alpha', 40, 36], [2, 'Joe Bravo', 39, 37], [3, 'Kim Charlie', 39, 37]]);
  assert.deepEqual([tko.result.winner_side, tko.result.method, tko.result.round, tko.result.time_sec], ['b', 'TKO', 2, 81]);
  assert.deepEqual(tko.suspensions, [{ side: 'a', duration_days: 30, indefinite: false, raw: '30 days; 60 days' }]);
  // a split: only "first number is A" gives the marked winner (B) two cards to one
  assert.deepEqual([split.result.outcome, split.result.winner_side, split.result.decision_type, split.score_order_raw], ['win', 'b', 'split', 'a_first']);
  assert.deepEqual(split.judges.map((j) => [j.name, j.a_total, j.b_total]), [['Jan Alpha', 58, 56], ['Joe Bravo', 56, 58], ['Lou Delta', 55, 59]]);
  assert.equal(split.score_totals_unattributed, null);
  assert.deepEqual([draw.result.outcome, draw.result.winner_side, draw.result.decision_type], ['draw', null, 'majority']);
  assert.deepEqual(draw.judges.map((j) => [j.name, j.a_total, j.b_total]), [['Jan Alpha', null, null], ['Kim Charlie', null, null], ['Lou Delta', null, null]]);
  assert.deepEqual(draw.score_lines_unresolved.map((c) => [c.judge, c.first, c.second]), [['Jan Alpha', 77, 75], ['Kim Charlie', 76, 76], ['Lou Delta', 76, 76]]);
  // both WINNER radios marked: a result method but no outcome, never a guessed winner
  assert.deepEqual([ambiguous.result.outcome, ambiguous.result.winner_side, ambiguous.result.resolved], [null, null, false]);
  assert.ok(ambiguous.judges.every((j) => j.a_total == null));
  assert.equal(ambiguous.score_lines_unresolved.length, 3);
  assert.deepEqual(r.bouts.map((b) => b.referee), ['Rex Refone', 'Ray Reftwo', 'Rex Refone', 'Ray Reftwo', 'Rex Refone']);
  const serialized = JSON.stringify(r);
  for (const s of ['1/1/1995', 'TN 1234567', 'OPHTHALMOLOGIST', 'by Dr', 'Syn Physician', 'Syn Director', 'Ina Inspector', 'Tim Keeper', 'Ann Announcer', '555 0100', 'synthetic@example.test']) {
    assert.ok(!serialized.includes(s), `${s} must not leave the parser`);
  }
  assert.deepEqual(findSensitive({ events: r.events, bouts: r.bouts, minimized: r.minimized }), []);
});

test('Tennessee form: a /Rotate 90 landscape sheet reads the same; image-only, OCR and non-boxing forms are refused', () => {
  const rotated = parseTennesseeResults({ ...ref, event_date: '2026-09-12' }, tennesseePages({ rotate: true, date: '09 / 12 / 2026', venue: 'SYNTHETIC ARENA', bouts: TENNESSEE_ROTATED_BOUTS }), {});
  assert.equal(rotated.classification.accepted, true, rotated.classification.reason);
  const [ko] = rotated.bouts;
  assert.deepEqual([ko.result.outcome, ko.result.winner_side, ko.result.method, ko.result.round, ko.result.time_sec, ko.referee], ['win', 'b', 'KO', 1, 167, 'Rex Refone']);
  assert.deepEqual(ko.suspensions, [{ side: 'a', duration_days: 30, indefinite: false, raw: '30 days' }]);
  const [, conflict] = rotated.bouts;
  assert.deepEqual([conflict.result.method, conflict.result.outcome, conflict.result.resolved, conflict.score_order_raw], ['DECISION', null, false, 'conflict_b_first']);
  assert.deepEqual(conflict.judges.map((j) => [j.name, j.source_name, j.a_total, j.b_total]), [['Jan Alpha', 'Jan Alpha', null, null], ['Joe Bravo', 'Joe Bravo', null, null], ['Kim Charlie', 'Kim Charlie', null, null]]);
  assert.deepEqual(rotated.rejected.map((x) => x.reason), ['winner_mark_contradicts_score_lines']);

  const imageOnly = parseTennesseeResults(ref, [{ page: 1, width: 612, height: 792, items: [], marks: [] }], {});
  assert.match(imageOnly.classification.reason, /^image_only_document/);
  const ocr = tennesseePages({ bouts: TENNESSEE_BOUTS });
  ocr[0].marks = [];
  for (let i = 0; i < 20; i++) ocr[0].items.push({ s: i % 2 ? 'I' : "(i'", x: 164 + i, y: 300 - i, w: 2 });
  assert.match(parseTennesseeResults(ref, ocr, {}).classification.reason, /^ocr_scan_quarantined/);
  for (const title of ['BARE-KNUCKLE MATCH RESULTS', 'KICKBOXING BOUT RESULTS', 'MIXED MARTIAL ARTS BOUT RESULTS (boxing, kickboxing, grappling, etc)']) {
    const x = parseTennesseeResults(ref, tennesseePages({ title, bouts: TENNESSEE_BOUTS }), {});
    assert.equal(x.classification.accepted, false, title);
    assert.equal(x.bouts.length, 0);
  }
  const bkfc = parseTennesseeResults(ref, tennesseePages({ eventName: 'BARE KNUCKLE FIGHTING CHAMPIONSHIP', bouts: TENNESSEE_BOUTS }), {});
  assert.equal(bkfc.classification.sport, SPORT.BARE_KNUCKLE);
  // a form title with no sport word falls back to the Commission's index label
  const league = parseTennesseeResults(ref, tennesseePages({ title: 'TEAM COMBAT LEAGUE RESULTS', bouts: TENNESSEE_BOUTS }), {});
  assert.equal(league.classification.accepted, true);
  assert.equal(parseTennesseeResults({ ...ref, sport_hint: SPORT.UNKNOWN }, tennesseePages({ title: 'TEAM COMBAT LEAGUE RESULTS', bouts: TENNESSEE_BOUTS }), {}).classification.accepted, false);
});

test('Tennessee helpers: methods, times, score order and the shifted-glyph font', () => {
  assert.deepEqual(parseTennesseeMethod('Unanimous decsion.'), { method: 'DECISION', decision_type: 'unanimous' });
  assert.deepEqual(parseTennesseeMethod('SPILT DECISION'), { method: 'DECISION', decision_type: 'split' });
  assert.deepEqual(parseTennesseeMethod('UNANIMOUS'), { method: 'DECISION', decision_type: 'unanimous' });
  assert.deepEqual(parseTennesseeMethod('TKO - Ref Stop'), { method: 'TKO', decision_type: null });
  assert.equal(parseTennesseeMethod('REF: Rex Refone'), null);
  assert.deepEqual([parseTennesseeTime('2.47'), parseTennesseeTime('0:36'), parseTennesseeTime('3:00'), parseTennesseeTime('9:99')], [167, 36, 180, null]);
  const cards = (...xs) => xs.map(([first, second]) => ({ first, second }));
  assert.equal(scoreOrder(cards([40, 36], [39, 37]), 'a', 'unanimous'), 'a_first');
  assert.equal(scoreOrder(cards([40, 36], [39, 37]), 'b', 'unanimous'), 'b_first');
  assert.equal(scoreOrder(cards([36, 40], [37, 39], [38, 38]), 'b', 'majority'), 'a_first');
  assert.equal(scoreOrder(cards([38, 37], [37, 38], [38, 37]), 'a', 'split'), 'a_first');
  assert.equal(scoreOrder(cards([38, 37], [37, 38], [38, 37]), 'b', 'split'), 'b_first');
  // a line that contradicts the written decision type fixes nothing
  assert.equal(scoreOrder(cards([38, 37], [37, 38], [38, 37]), 'a', 'unanimous'), null);
  assert.equal(scoreOrder(cards([36, 40], [37, 39], [38, 38]), 'b', 'unanimous'), null);
  assert.equal(scoreOrder(cards([38, 37], [37, 38], [38, 37]), 'a'), null);
  assert.equal(scoreOrder(cards([38, 38]), 'a', 'majority'), null);
  assert.equal(scoreOrder(cards([40, 36]), null, 'unanimous'), null);
  const shift = (s) => [...s].map((c) => String.fromCharCode(c.charCodeAt(0) - 0x1f)).join('');
  assert.equal(decodeShiftedText(shift('123.2')), '123.2');
  assert.equal(decodeShiftedText(shift('UNANIMOUS DECISION')), 'UNANIMOUS DECISION');
  assert.equal(decodeShiftedText('5,0', { methodCell: true }), 'TKO');
  assert.equal(decodeShiftedText('5,0'), null, 'outside the METHOD cell nothing without control characters is decoded');
  assert.equal(decodeShiftedText('Rex Refone', { methodCell: true }), null);
});

// a minimal flattened form: one text run and one filled 2.9pt box, optionally stored with /Rotate 90
function tinyPdf({ rotate = 0 } = {}) {
  const content = 'BT /F1 10 Tf 100 700 Td (Pro) Tj ET 0 0 0 rg 70 698.5 2.9 2.9 re f 60 600 20 20 re S';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ${rotate ? `/Rotate ${rotate} ` : ''}/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = objects.map((o, i) => { const at = body.length; body += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

test('device extraction: text and small drawn boxes in viewport space; a rotated page is turned upright', async () => {
  const [upright] = await extractDeviceText(tinyPdf());
  assert.deepEqual([upright.width, upright.height, upright.rotate], [612, 792, 0]);
  assert.deepEqual(upright.items.map((i) => [i.s, i.x, i.y]), [['Pro', 100, 700]]);
  assert.equal(upright.marks.length, 1, 'the 20pt box is not a mark');
  assert.deepEqual([upright.marks[0].x, upright.marks[0].y, upright.marks[0].w], [71.5, 700, 2.9]);
  const [rotated] = await extractDeviceText(tinyPdf({ rotate: 90 }));
  assert.deepEqual([rotated.width, rotated.height, rotated.rotate], [792, 612, 90]);
  // /Rotate 90 turns the page clockwise: user (x, y) lands at device (y, x) with y up
  assert.deepEqual(rotated.items.map((i) => [i.s, i.x, i.y]), [['Pro', 700, 512]]);
  assert.deepEqual([rotated.marks[0].x, rotated.marks[0].y], [700, 540.5]);
});
