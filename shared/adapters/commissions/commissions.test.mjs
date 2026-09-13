import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPORT, classifySportLabel } from './contract.mjs';
import { assertMinimized, findSensitive, scrubText } from './minimize.mjs';
import { parseCalendar, parseNevadaResults, parseResultsIndex, splitPromoters } from './nevada.mjs';
import { parseFloridaResults, parseResultsListing, parseUpcoming } from './florida.mjs';
import { isOfficialNjUrl, judgesOf, parseNjResults, parseNjSchedule } from './new-jersey.mjs';
import { TEXAS, classifyTexasRow, discoverTexas } from './texas.mjs';
import { cardDocumentFor, divisionFacts, eventName } from '../../commissions/apply.mjs';
import { NEVADA } from './nevada.mjs';
import {
  FLORIDA_BOUTS, FLORIDA_RESULTS_HTML, FLORIDA_UPCOMING_HTML, NEVADA_BOUTS, NEVADA_INDEX_HTML, NJ_BOUTS, NJ_SCHEDULE_HTML, floridaPages, nevadaCalendarIcs, nevadaPages, njResultPages,
} from '../../../tests/fixtures/commissions/synthetic.mjs';

const nvRef = (file, hint) => ({ doc_key: `nv-results:2026:${file}`, url: `https://boxing.nv.gov/uploadedFiles/boxingnvgov/content/results/2026_Results/${file}.pdf`, title: file, sport_hint: hint });
const flRef = (file) => ({ doc_key: `fl-results:${file}`, url: `https://www2.myfloridalicense.com/pro/sbc/documents/${file}.pdf` });
const FED = /\b[A-Z]{2}-?\d{5,8}\b/;

test('Nevada promoters: "d/b/a" stays inside one promoter; I, | and / still separate', () => {
  assert.deepEqual(splitPromoters('TKO Productions LLC d/b/a Zuffa Boxing'), ['TKO Productions LLC d/b/a Zuffa Boxing']);
  assert.deepEqual(splitPromoters('A Promotions LLC D / B / A Alpha Boxing I Beta Promotions / Gamma | Delta'), ['A Promotions LLC d/b/a Alpha Boxing', 'Beta Promotions', 'Gamma', 'Delta']);
  assert.deepEqual(splitPromoters(null), []);
  assert.equal(eventName({ promoters: ['TKO Productions LLC d/b/a Zuffa Boxing'], venue: { name: 'The Cosmopolitan' } }, NEVADA), 'TKO Productions LLC dba Zuffa Boxing at The Cosmopolitan');
});

test('New Jersey judges: "&" separates judges, suffixes stay with their name, totals stay with their judge', () => {
  const rows = (t) => judgesOf(t).map((j) => [j.name, j.a_total, j.b_total]);
  assert.deepEqual(rows('Judges: Ann Alpha (60-54), Bob Bravo (59-55) & Cy Charlie (58-56)'), [['Ann Alpha', 60, 54], ['Bob Bravo', 59, 55], ['Cy Charlie', 58, 56]]);
  assert.deepEqual(rows('Judges: Ann Alpha, Bob Bravo, & Cy Charlie'), [['Ann Alpha', null, null], ['Bob Bravo', null, null], ['Cy Charlie', null, null]]);
  assert.deepEqual(rows('Judges: Dan Delta, Jr. (57-57), Eve Echo (58-56), Flo Fox (56-58)'), [['Dan Delta, Jr.', 57, 57], ['Eve Echo', 58, 56], ['Flo Fox', 56, 58]]);
});

test('sport labels: bare knuckle, slap, kickboxing and MMA are never boxing', () => {
  for (const [label, sport] of [['Boxing', SPORT.BOXING], ['PRO Boxing Event', SPORT.BOXING], ['Bare -Knuckle Boxing', SPORT.BARE_KNUCKLE], ['pro boxing bare knuckle', SPORT.BARE_KNUCKLE],
    ['Kickboxing', SPORT.KICKBOXING], ['MMA Mixed Martial Arts', SPORT.MMA], ['PowerSlap Event', SPORT.POWER_SLAP], ['Karate Combat', SPORT.KARATE_COMBAT], ['', SPORT.UNKNOWN]]) {
    assert.equal(classifySportLabel(label), sport, label);
  }
});

test('minimization: identifier, phone and medical strings are refused', () => {
  assert.equal(scrubText('JOHN DOE NV781366 146.6'), 'JOHN DOE 146.6');
  assert.deepEqual(findSensitive({ ok: 'Referee: X', bad: 'FL-1234567', dob: '1990-01-01', note: 'ringside physicians' }).map((h) => h.kind).sort(),
    ['federal_id', 'medical', 'sensitive_key']);
  assert.throws(() => assertMinimized({ remarks: ['(702) 555-0100'] }), /sensitive data refused/);
});

test('Nevada: boxing document parsed; federal ID column dropped; revision-safe ids; officials resolved from header', () => {
  const r = parseNevadaResults(nvRef('09-05-26_Boxing_REDACTED', SPORT.BOXING), nevadaPages({ bouts: NEVADA_BOUTS }), { capturedAt: '2026-09-06T00:00:00Z' });
  assert.equal(r.classification.accepted, true);
  assert.deepEqual(r.problems, []);
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].event_date, '2026-09-05');
  assert.deepEqual(r.events[0].venue, { name: 'Synthetic Garden Arena', city: 'Las Vegas', region: 'NV', country_code: 'US' });
  assert.deepEqual(r.events[0].promoters, ['Synthetic Promotions', 'Other Promotions']);
  assert.equal(r.bouts.length, 3);
  const [b1, b2, b3] = r.bouts;
  assert.equal(b1.fighter_a.display_name, 'Alpha Synthetic One');
  assert.deepEqual([b1.fighter_a.weight_lb, b1.fighter_b.weight_lb, b1.scheduled_rounds], [146.6, 147, 12]);
  assert.deepEqual(pick(b1.result), { outcome: 'win', winner_side: 'b', method: 'DECISION', decision_type: 'unanimous', round: null });
  assert.deepEqual(b1.judges.map((j) => [j.name, j.a_total, j.b_total]), [['Jane Alpha', 110, 118], ['Lee Delta Deluca', 111, 117], ['Kim Charlie', 112, 116]]);
  assert.deepEqual(b1.title_remarks, ['Two wins Synthetic Welterweight Title']);
  assert.deepEqual(pick(b2.result), { outcome: 'win', winner_side: 'a', method: 'TKO', decision_type: null, round: 6 });
  assert.deepEqual(b2.deductions.map((d) => [d.side, d.points, d.round]), [['b', 1, 4]]);
  assert.equal(b2.referee, 'Alan Reftwo');
  assert.deepEqual(pick(b3.result), { outcome: 'draw', winner_side: null, method: 'DECISION', decision_type: 'majority', round: null });
  const text = JSON.stringify(r);
  assert.doesNotMatch(text, FED, 'no federal id anywhere in parser output');
  assert.doesNotMatch(text, /Ringside|Doc Tor|555-0100/, 'no physician or phone data');
});

test('Nevada: MMA and PowerSlap are rejected at the listing and again by document title', () => {
  const refs = parseResultsIndex(NEVADA_INDEX_HTML, { year: 2026 });
  assert.deepEqual(refs.map((x) => x.sport_hint), [SPORT.BOXING, SPORT.MMA, SPORT.POWER_SLAP]);
  const mma = parseNevadaResults(nvRef('09-06-26_MMA_REDACTED', SPORT.MMA), nevadaPages({ title: 'MIXED MARTIAL ARTS SHOW RESULTS', bouts: NEVADA_BOUTS }));
  const slap = parseNevadaResults(nvRef('09-07-26_SLAP_REDACTED', SPORT.POWER_SLAP), nevadaPages({ title: 'MIXED MARTIAL ARTS SHOW RESULTS', bouts: NEVADA_BOUTS }));
  // a mislabelled file whose TITLE is not boxing is still rejected
  const mislabelled = parseNevadaResults(nvRef('09-08-26_Boxing_REDACTED', SPORT.BOXING), nevadaPages({ title: 'MIXED MARTIAL ARTS SHOW RESULTS', bouts: NEVADA_BOUTS }));
  for (const [r, sport] of [[mma, SPORT.MMA], [slap, SPORT.POWER_SLAP], [mislabelled, SPORT.MMA]]) {
    assert.equal(r.classification.accepted, false);
    assert.equal(r.classification.sport, sport);
    assert.deepEqual([r.events.length, r.bouts.length], [0, 0]);
  }
});

test('Nevada calendar: only professional boxing events; venue without street address', () => {
  const ics = nevadaCalendarIcs([
    { uid: 'a1', dtstart: '20260926T030000Z', summary: 'PRO Boxing Event', location: 'Synthetic Garden Arena, 3780 S Synthetic Blvd, Las Vegas, NV 89109, USA', description: 'Synthetic Promotions will promote a professional boxing event.' },
    { uid: 'a2', dtstart: '20260927T030000Z', summary: 'PRO MMA Event', location: 'Synthetic Apex, Las Vegas, NV 89118, USA', description: 'Cage will promote a professional MMA event.' },
    { uid: 'a3', dtstart: '20260928T030000Z', summary: 'PowerSlap Event', location: 'Synthetic Hotel, Las Vegas, NV 89109, USA', description: 'Slap will promote.' },
    { uid: 'a4', dtstart: '20260929T030000Z', summary: 'PRO/AM MMA Event', location: 'Synthetic Palms, Las Vegas, NV 89103, USA', description: 'x' },
  ]);
  const { events, rejected } = parseCalendar(ics, { capturedAt: '2026-09-13T00:00:00Z' });
  assert.equal(events.length, 1);
  assert.equal(events[0].event_date, '2026-09-25', 'local Las Vegas date of 03:00Z');
  assert.equal(events[0].start_at, '2026-09-26T03:00:00.000Z');
  assert.deepEqual(events[0].venue, { name: 'Synthetic Garden Arena', city: 'Las Vegas', region: 'NV', country_code: 'US' });
  assert.doesNotMatch(JSON.stringify(events), /3780|89109/);
  assert.deepEqual(rejected.map((x) => x.reason).sort(), ['not_professional_boxing:mma', 'not_professional_boxing:mma', 'not_professional_boxing:power_slap']);
});

test('Florida: boxing parsed; DOB and federal ID dropped; bare-knuckle bout and non-boxing documents rejected', () => {
  const upcoming = parseUpcoming(FLORIDA_UPCOMING_HTML, { capturedAt: '2026-09-13T00:00:00Z' });
  assert.deepEqual(upcoming.events.map((e) => e.source_event_id), ['2026-09-26|tampa|synthetic-sunshine-promotions']);
  assert.deepEqual(upcoming.rejected.map((x) => x.reason), ['not_professional_boxing:bare_knuckle', 'not_professional_boxing:mma'], 'BKFC is listed as "Box" and still rejected');

  const r = parseFloridaResults(flRef('09-05-2026-Synthetic_Sunshine-Results_without_med'), floridaPages({ bouts: FLORIDA_BOUTS }), { capturedAt: '2026-09-13T00:00:00Z' });
  assert.equal(r.classification.accepted, true);
  assert.deepEqual(r.problems, []);
  assert.equal(r.bouts.length, 2);
  assert.deepEqual(r.rejected.map((x) => x.reason), ['bout_sport_not_boxing:bare_knuckle']);
  const [b1, b2] = r.bouts;
  assert.deepEqual([b1.fighter_a.corner, b1.fighter_b.corner, b1.scheduled_rounds], ['blue', 'red', 6]);
  assert.deepEqual(pick(b1.result), { outcome: 'win', winner_side: 'b', method: 'DECISION', decision_type: 'unanimous', round: null });
  assert.deepEqual(b1.judges.map((j) => j.name), ['Juan Uno', 'Jo Dos', 'Jay Tres']);
  assert.equal(b1.referee, 'Ref Floridian');
  assert.deepEqual(pick(b2.result), { outcome: 'win', winner_side: 'a', method: 'TKO', decision_type: null, round: 2 });
  assert.equal(b2.result.time_sec, 75);
  assert.deepEqual(b2.suspensions.map((s) => [s.side, s.duration_days]), [['b', 30]]);
  const text = JSON.stringify(r);
  assert.doesNotMatch(text, FED);
  assert.doesNotMatch(text, /01\/02\/1990|Doc Synthetic|PHYSICIAN/i);

  for (const eventType of ['MMA Mixed Martial Arts', 'Bare -Knuckle Boxing', 'Kickboxing', 'Karate Combat']) {
    const rej = parseFloridaResults(flRef('x'), floridaPages({ eventType, bouts: FLORIDA_BOUTS }));
    assert.equal(rej.classification.accepted, false, eventType);
    assert.deepEqual([rej.events.length, rej.bouts.length], [0, 0]);
  }
  assert.deepEqual(parseResultsListing(FLORIDA_RESULTS_HTML).map((x) => x.sport_hint), [SPORT.UNKNOWN, SPORT.MMA, SPORT.BARE_KNUCKLE]);
});

test('New Jersey: third-party links never become sources; non-boxing entries rejected; contact persons not stored', () => {
  const r = parseNjSchedule(NJ_SCHEDULE_HTML, { capturedAt: '2026-09-13T00:00:00Z' });
  assert.deepEqual(r.events.map((e) => [e.event_date, e.status]), [['2026-09-04', 'complete'], ['2026-09-12', 'scheduled'], ['2026-11-07', 'cancelled']]);
  assert.deepEqual(r.documents.map((d) => new URL(d.url).hostname), ['nj.gov'], 'only official SACB documents are registered');
  assert.ok(r.rejected.some((x) => x.reason === 'third_party_link_ignored' && x.detail.host === 'boxrec.com'));
  assert.ok(r.rejected.some((x) => x.reason === 'not_professional_boxing:bare_knuckle'));
  assert.ok(r.rejected.some((x) => x.reason === 'not_professional_boxing:mma'));
  assert.doesNotMatch(JSON.stringify(r.events), /Contact|boxrec/i);
});

test('Texas: remote collection disabled (robots); non-boxing combat rejected; state titles are their own context', async () => {
  assert.equal(TEXAS.remote.enabled, false);
  await assert.rejects(() => discoverTexas(), /remote collection disabled/);
  for (const [cat, accepted] of [['Boxing', true], ['Box', true], ['Amateur Boxing', false], ['MMA', false], ['Kickboxing', false], ['Bare Knuckle', false], ['Slap Fighting', false], ['Muay Thai', false], ['Combination', false]]) {
    assert.equal(classifyTexasRow(['2026-09-01', 'P', cat, 'Houston', '']).accepted, accepted, cat);
  }
  assert.equal(TEXAS.stateTitleOrganization.slug, 'tdlr-texas');
  assert.ok(!['wbc', 'wba', 'ibf', 'wbo'].includes(TEXAS.stateTitleOrganization.slug));
});

test('card documents built from commission observations carry no sensitive data and keep source ids', () => {
  const r = parseNevadaResults(nvRef('09-05-26_Boxing_REDACTED', SPORT.BOXING), nevadaPages({ bouts: NEVADA_BOUTS }));
  const doc = cardDocumentFor(NEVADA, r.events[0], r.bouts);
  assert.equal(doc.namespace, 'nsac');
  assert.equal(doc.bouts.length, 3);
  assert.deepEqual(doc.bouts[0].officials.map((o) => o.role), ['referee', 'judge', 'judge', 'judge']);
  assert.doesNotMatch(JSON.stringify(doc), FED);
});

const pick = (x) => ({ outcome: x.outcome, winner_side: x.winner_side, method: x.method, decision_type: x.decision_type, round: x.round });

test('New Jersey result document: facts only; federal IDs, injury notes, no-contact periods, reasons and the officials page are dropped', () => {
  const ref = { doc_key: 'nj-results:2026-0904_Synthetic', url: 'https://nj.gov/oag/sacb/results/2026-0904_Synthetic_Pro_Boxing.pdf', source_event_id: '2026-09-04|synthetic-center|newark' };
  const r = parseNjResults(ref, njResultPages({ bouts: NJ_BOUTS }), { capturedAt: '2026-09-13T12:00:00Z' });
  assert.equal(r.classification.accepted, true);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.events[0].venue, { name: 'Synthetic Center', city: 'Newark', region: 'NJ', country_code: 'US' });
  const [b1, b2, b3] = r.bouts;
  assert.deepEqual([b1.fighter_a.display_name, b1.fighter_a.hometown, b1.fighter_a.weight_lb, b1.scheduled_rounds], ['Nolan Jersey', 'Pottstown, PA', 146.8, 6]);
  assert.deepEqual([b1.result.outcome, b1.result.winner_side, b1.result.decision_type], ['win', 'a', 'split']);
  assert.deepEqual(b1.judges.map((j) => [j.name, j.a_total, j.b_total]), [['Judge Ajersey', 58, 56], ['Judge Bjersey', 55, 59], ['Judge Cjersey', 60, 54]], 'cards agree with the decision: order kept');
  assert.deepEqual([b2.result.method, b2.result.round, b2.result.time_sec], ['TKO', 3, 48]);
  assert.deepEqual(b2.suspensions, [{ side: 'b', duration_days: 30, indefinite: false, raw: '30 Days' }], 'duration only');
  assert.deepEqual(b2.title_remarks, ['Synthetic Regional Championship Title']);
  assert.equal(b3.result.resolved, false, 'a winner name that is not exactly one corner is never guessed');
  assert.equal(b3.judges.every((j) => j.a_total == null), true, 'score order unverifiable without a resolved winner');
  const text = JSON.stringify(r);
  assert.doesNotMatch(text, /999\d{3}|ID#|hospital|injur|neck pain|no contact|trauma|physician|Synthetic Medic|Inspector/i);
  assert.deepEqual(findSensitive(r), []);
});

test('New Jersey: non-boxing result documents are rejected; only official SACB URLs are documents', () => {
  const mma = parseNjResults({ doc_key: 'nj-results:x', url: 'https://nj.gov/oag/sacb/results/x.pdf' }, njResultPages({ title: 'Show Results - Pro MMA', bouts: NJ_BOUTS }));
  assert.equal(mma.classification.accepted, false);
  assert.equal(mma.bouts.length, 0);
  const knuckle = parseNjResults({ doc_key: 'nj-results:y', url: 'https://nj.gov/oag/sacb/results/y.pdf' }, njResultPages({ title: 'Show Results - Pro Boxing Bare Knuckle', bouts: NJ_BOUTS }));
  assert.equal(knuckle.classification.accepted, false);
  assert.equal(isOfficialNjUrl('https://boxrec.com/en/event/1'), false);
  assert.equal(isOfficialNjUrl('https://nj.gov/oag/secure-pdf/x.pdf'), false, 'robots-disallowed path');
  assert.equal(isOfficialNjUrl('https://nj.gov/oag/sacb/results/x.pdf'), true);
  // spaced federal-ID form is caught by the second line of defence
  assert.throws(() => assertMinimized({ note: 'Name ID# PA 123456' }));
  assert.throws(() => assertMinimized({ note: 'transported to the hospital' }));
});

test('printed division labels: the number is the contract; a contradictory label yields no class', () => {
  assert.deepEqual(divisionFacts('Middleweight (158 lbs.)'), { weight_class_key: 'middleweight', contracted_weight_lb: 158, is_catchweight: true });
  assert.deepEqual(divisionFacts('Welterweight (147 lbs)'), { weight_class_key: 'welterweight', contracted_weight_lb: 147, is_catchweight: false });
  assert.deepEqual(divisionFacts('Middleweight (165 lbs.)'), { contracted_weight_lb: 165, weight_class_contradicted: true });
  assert.deepEqual(divisionFacts('Heavyweight (147 lbs.)'), { contracted_weight_lb: 147, weight_class_contradicted: true });
  assert.deepEqual(divisionFacts('Heavyweight - (201+ lbs.)'), { weight_class_key: 'heavyweight' });
  assert.deepEqual(divisionFacts('Catchweight'), {});
});
