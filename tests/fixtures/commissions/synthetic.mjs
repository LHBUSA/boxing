// Synthetic commission documents as positioned-text pages (the shape
// extractPositionedText() returns). Layout coordinates mirror the real Nevada
// and Florida result sheets reviewed on 2026-09-13; every name, identifier and
// date of birth below is FAKE. Real documents (which contain federal IDs) are
// never committed.

const it = (s, x, y, w = s.length * 5) => ({ s, x, y, w });

// ---------------------------------------------------------------- Nevada
// bouts: [{ a: [lines], aHome, b: [lines], bHome, result: [lines], fed: [a,b], rds, weights: [a,b], remarks: [lines] }]
export function nevadaPages({ title = 'BOXING SHOW RESULTS', date = ['September 5', 'th', ', 2026,'], location = 'Synthetic Garden Arena, Las Vegas',
  judges = 'Jane Alpha, Joe Bravo, Kim Charlie', visitingJudges = 'Lee Delta Deluca', referees = 'Robert Refone, Alan Reftwo', bouts = [] } = {}) {
  const items = [
    it('STATE OF NEVADA', 118, 558), it('ATHLETIC COMMISSION', 105, 547), it('Telephone (702) 555-0100 Fax (702) 555-0101', 60, 530),
    it('Chairman: Synthetic Chair', 42, 500), it(title, 470, 558),
    it('DATE:', 299, 541), it(date[0], 346, 541), it(date[1], 394, 545), it(date[2], 402, 541), it('LOCATION:', 559, 541), it(location, 623, 541),
    it(`Referees: ${referees} I Review Officials: Rev Iewer`, 299, 524),
    it(`Judges: ${judges}`, 299, 489), it(`Visiting Judges: ${visitingJudges}`, 299, 472),
    it('Ringside Doctors: Doc Tor, Med Ic', 299, 420), it('Promoters: Synthetic Promotions I Other Promotions', 299, 386), it('Matchmakers: Match Maker', 587, 386),
    it('Contestants', 105, 364), it('Results', 297, 364), it('Federal ID', 421, 364), it('Number', 425, 354), it('Rds', 480, 364), it('Weight', 562, 364), it('Remarks', 667, 364),
  ];
  let top = 338;
  for (const b of bouts) {
    let y = top;
    for (const l of b.a) { items.push(it(l, 42, y)); y -= 11; }
    if (b.aHome) { items.push(it(b.aHome, 42, y)); y -= 10; }
    const vsY = y; items.push(it('----- vs. -----', 105, vsY)); y -= 10;
    const bTop = y;
    for (const l of b.b) { items.push(it(l, 42, y)); y -= 11; }
    if (b.bHome) { items.push(it(b.bHome, 42, y)); y -= 10; }
    let ry = top;
    for (const l of b.result) { items.push(it(l, 222, ry)); ry -= 12; }
    if (b.fed) { items.push(it(b.fed[0], 416, top)); items.push(it(b.fed[1], 416, bTop)); }
    items.push(it(String(b.rds), 481, top));
    if (b.weights) { items.push(it(String(b.weights[0]), 562, top)); items.push(it(String(b.weights[1]), 562, bTop)); }
    let my = bTop + 4;
    for (const l of b.remarks ?? []) { items.push(it(l, 601, my)); my -= 9; }
    top = Math.min(y, ry, my) - 12;
  }
  return [{ page: 1, width: 792, height: 612, items }];
}

export const NEVADA_BOUTS = [
  { a: ['ALPHA SYNTHETIC ONE'], aHome: 'Las Vegas, NV', b: ['BRAVO SYNTHETIC TWO'], bHome: 'Reno, NV', rds: 12, weights: [146.6, 147.0], fed: ['NV000001', 'NV000002'],
    result: ['Two won by unanimous decision', 'ONE – TWO', '110-118; 111-117; 112-116', 'Alpha, Deluca, Charlie', '*Two wins Synthetic Welterweight Title'], remarks: ['Referee: Robert Refone'] },
  { a: ['CHARLIE SYNTHETIC THREE'], aHome: 'Henderson, NV', b: ['DELTA SYNTHETIC FOUR'], bHome: 'Phoenix, AZ', rds: 10, weights: [160.2, 159.8], fed: ['NV000003', 'AZ000004'],
    result: ['Three won by TKO at the end of round', '6'], remarks: ['Four – 1 Point for Holding – R4', 'Referee: Alan Reftwo'] },
  { a: ['ECHO SYNTHETIC FIVE'], aHome: 'Denver, CO', b: ['FOXTROT SYNTHETIC SIX'], bHome: 'Austin, TX', rds: 8, weights: [135.0, 134.5], fed: ['CO000005', 'TX000006'],
    result: ['Majority draw', 'FIVE – SIX', '76-76; 77-75; 76-76', 'Bravo, Charlie, Alpha'], remarks: ['Referee: Robert Refone'] },
];

export const NEVADA_INDEX_HTML = `
<h3>2026 Results</h3><p>Boxing Results</p>
<a href="/uploadedFiles/boxingnvgov/content/results/2026_Results/09-05-26_Boxing_REDACTED.pdf">Boxing 09-05</a>
<p>MMA Results</p><a href="/uploadedFiles/boxingnvgov/content/results/2026_Results/09-06-26_MMA_REDACTED.pdf">MMA</a>
<p>PowerSlap Results</p><a href="/uploadedFiles/boxingnvgov/content/results/2026_Results/09-07-26_SLAP_REDACTED.pdf">SLAP</a>`;

export function nevadaCalendarIcs(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0'];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTART:${e.dtstart}`, `SUMMARY:${e.summary}`, `LOCATION:${e.location.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${e.description}`, 'LAST-MODIFIED:20260901T000000Z', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ---------------------------------------------------------------- Florida
const FL_HEAD = [['Bout', 36], ['Corner', 52], ['Sport', 76], ['Participant Name', 139], ['Hometown', 241], ['DOB', 296], ['Weight', 393], ['Schd', 418],
  ['Result', 438], ['Decision', 468], ['Round &', 502], ['Officials', 587], ['Notes', 691], ['Suspension', 731]];

// bouts: [{ n, sport: [lines], a: {name, home, weight, result, susp}, b: {...}, rds, decision: [lines], round: [lines], officials: [lines] }]
export function floridaPages({ eventType = 'Boxing', date = '09/05/2026', promoter = 'Synthetic Sunshine Promotions', venue = 'Tampa, FL / Synthetic Hall', bouts = [] } = {}) {
  const items = [
    it('MATCH RESULTS', 34, 575), it(`Event Date: ${date}`, 236, 575), it(`Event Type: ${eventType}`, 498, 575),
    it('FLORIDA ATHLETIC COMMISSION', 34, 566), it(`Promoter: ${promoter}`, 236, 566), it(`Location / Venue: ${venue}`, 498, 566),
    it('JUDGES:', 236, 558), it('REFEREES:', 392, 558), it('RINGSIDE PHYSICIANS:', 498, 558), it('Doc Synthetic', 506, 551),
    ...FL_HEAD.map(([s, x]) => it(s, x, 473)),
  ];
  let top = 440;
  for (const b of bouts) {
    const ay = top; const by = top - 26; const mid = top - 4;
    items.push(it(String(b.n), 40, mid), it('Blue', 54, ay), it('Red', 55, by));
    b.sport.forEach((l, i) => items.push(it(l, 75, mid - i * 7)));
    for (const [row, c] of [[ay, b.a], [by, b.b]]) {
      items.push(it(c.name, 95, row), it(c.home, 236, row), it(c.dob ?? '01/02/1990', 286, row), it(c.fed ?? 'FL-1000000', 331, row), it(String(c.weight), 396, row));
      if (c.result) items.push(it(c.result, 440, row));
      if (c.susp) items.push(it(c.susp, 732, row));
    }
    items.push(it(String(b.rds), 422, mid));
    b.decision.forEach((l, i) => items.push(it(l, 463, mid - i * 8)));
    (b.round ?? []).forEach((l, i) => items.push(it(l, 502, mid - i * 8)));
    b.officials.forEach((l, i) => items.push(it(l, 529, ay + 1 - i * 10)));
    top -= 54;
  }
  return [{ page: 1, width: 792, height: 612, items }];
}

export const FLORIDA_BOUTS = [
  { n: 1, sport: ['Boxing'], rds: 6, decision: ['Unanimous', 'Decision'], officials: ['Judges: Juan Uno, Jo Dos, Jay Tres;', 'Referee: Ref Floridian'],
    a: { name: 'Golf Synthetic Seven', home: 'Miami, FL', weight: 150.5, result: null }, b: { name: 'Hotel Synthetic Eight', home: 'Orlando, FL', weight: 151.0, result: 'Win' } },
  { n: 2, sport: ['Boxing'], rds: 4, decision: ['Technical', 'Knockout'], round: ['Rnd 2 at', '1:15'], officials: ['Judges: Juan Uno, Jo Dos, Jay Tres;', 'Referee: Ref Floridian'],
    a: { name: 'India Synthetic Nine', home: 'Tampa, FL', weight: 130.0, result: 'Win' }, b: { name: 'Juliet Synthetic Ten', home: 'Ocala, FL', weight: 129.5, result: null, susp: '30 days' } },
  { n: 3, sport: ['Bare', 'Knuckle'], rds: 5, decision: ['Knockout'], round: ['Rnd 1 at', '0:40'], officials: ['Judges: Juan Uno;', 'Referee: Ref Floridian'],
    a: { name: 'Kilo Synthetic Eleven', home: 'Miami, FL', weight: 170.0, result: 'Win' }, b: { name: 'Lima Synthetic Twelve', home: 'Miami, FL', weight: 171.0, result: null } },
];

export const FLORIDA_UPCOMING_HTML = `<main><h1>Upcoming Events</h1>
| 09/26/2026 | Sat | Tampa, FL | Box | Synthetic Sunshine Promotions |
| 10/03/2026 | Sat | Miami, FL | Box | BKFC (DBA of Bare Knuckle Fighting Championships, Inc.) |
| 10/10/2026 | Sat | Doral, FL | MMA | Synthetic Cage LLC |</main>`
  .replace(/\|/g, '</td><td>');

export const FLORIDA_RESULTS_HTML = `
<a href="https://www2.myfloridalicense.com/pro/sbc/documents/09-05-2026-Synthetic_Sunshine-Results_without_med.pdf">September 5, 2026 – Synthetic Sunshine – Tampa</a>
<a href="https://www2.myfloridalicense.com/pro/sbc/documents/09-06-2026-Synthetic_MMA-Results_without_med.pdf">September 6, 2026 – Synthetic Cage – Doral</a>
<a href="https://www2.myfloridalicense.com/pro/sbc/documents/09-07-2026-Synthetic_Knuckle-results_without_med.pdf">September 7, 2026 – Synthetic Fist – Miami</a>`;

// ---------------------------------------------------------------- New Jersey
export const NJ_SCHEDULE_HTML = `<h3>2026</h3>
<p><strong>09.04.26 <a href="https://nj.gov/oag/sacb/results/2026-0904_Synthetic_Pro_Boxing.pdf">RESULTS</a></strong><br />(pro boxing)<br />Synthetic Garden Promotions<br />Contact Person Name<br />Synthetic Center<br />Newark</p>
<p><strong>09.12.26 <a href="https://boxrec.com/en/event/123456">RESULTS</a></strong><br />(pro boxing)<br />Third Party Linked Promotions<br />Other Contact<br />Synthetic Theater<br />Trenton</p>
<p><strong>10.17.26</strong><br />(pro boxing bare knuckle)<br />Synthetic Knuckle Championships<br />Knuckle Contact<br />Synthetic Arena<br />Newark</p>
<p><strong>10.31.26</strong><br />(pro mma)<br />Synthetic Cage<br />Cage Contact<br />Synthetic Hall<br />Atlantic City</p>
<p><strong>11.07.26 <span>CANCELED</span></strong><br />(pro boxing)<br />Cancelled Synthetic Promotions<br />Cancel Contact<br />Synthetic Casino<br />Atlantic City</p>`;

export const encodePages = (pages) => new TextEncoder().encode(JSON.stringify(pages));
export const decodePages = async (bytes) => JSON.parse(new TextDecoder().decode(bytes));

// ---------------------------------------------------------------- New Jersey
// Line layout of an SACB "Show Results - Pro Boxing" document. Every name and
// ID is FAKE; the NOTE paragraph and the officials page (physicians) exist to
// prove they are dropped.
// bouts: [{ n, rds, division, title?, a: { name, id, home, weight }, b: {...}, result: [lines], referee, judges }]
export function njResultPages({ title = 'Show Results - Pro Boxing', date = 'September 4, 2026', venueLine = 'Synthetic Center, Newark, NJ',
  promoter = 'Synthetic Garden Promotions', bouts = [], note = null, officials = true } = {}) {
  const page = [];
  let y = 707;
  const line = (s) => { page.push(it(s, 71, y)); y -= 15; };
  line(title); line(date); line(venueLine); line(`Promoter – ${promoter}`);
  for (const b of bouts) {
    y -= 10;
    line(`Bout #${b.n} – ${b.rds} Rounds – ${b.division}${b.title ? ` *${b.title}` : ''}`);
    line(`${b.a.name} – ID# ${b.a.id}`); line(`${b.a.home} – ${b.a.weight} lbs.`); line('VS');
    line(`${b.b.name} - ID# ${b.b.id} –`); line(`${b.b.home} – ${b.b.weight} lbs.`);
    for (const r of b.result) line(r);
    line(`Referee: ${b.referee}   Timekeeper: Time Keeper`);
    line(`Judges: ${b.judges}`);
    if (b.note) { line(`NOTE: ${b.note}`); line('transported to the hospital for further evaluation.'); }
  }
  const pages = [{ page: 1, items: page }];
  if (officials) {
    const p2 = [];
    let y2 = 645;
    for (const s of ['Officials', 'Judges: Jud Geone, Jud Getwo', 'Referees: Ref Eree', 'Physicians: Dr. Synthetic Medic', 'Inspectors: In Spector']) { p2.push(it(s, 71, y2)); y2 -= 15; }
    pages.push({ page: 2, items: p2 });
  }
  return pages;
}

export const NJ_BOUTS = [
  { n: 1, rds: 6, division: 'Welterweight (147 lbs.)', a: { name: 'Nolan Jersey', id: 'PA 999001', home: 'Pottstown, PA', weight: 146.8 }, b: { name: 'Owen Shore', id: 'NJ 999002', home: 'Dover, DE', weight: 146.6 },
    result: ['Nolan Jersey – Winner Split Decision'], referee: 'Referee Jerseyone', judges: 'Judge Ajersey (58-56), Judge Bjersey (55-59), Judge Cjersey (60-54)' },
  { n: 2, rds: 4, division: 'Middleweight (158 lbs.)', title: 'Synthetic Regional Championship Title', a: { name: 'Pete Garden', id: 'NJ 999003', home: 'Middlesex, NJ', weight: 157.3 }, b: { name: 'Quinn Harbor', id: 'MO 999004', home: 'Branson, MO', weight: 157.1 },
    result: ['Pete Garden – Winner TKO-3 0:48', 'Quinn Harbor – Suspension – 30 Days (30 Days No Contact) Excessive Head Trauma'], referee: 'Referee Jerseytwo', judges: 'Judge Ajersey, Judge Bjersey, Judge Cjersey',
    note: 'Quinn Harbor unable to continue with neck pain injury after a fall to canvas.' },
  // the printed division word contradicts the contracted 165 lb: a catchweight, never a missed middleweight limit
  { n: 3, rds: 6, division: 'Middleweight (165 lbs.)', a: { name: 'Rae Typo', id: 'PA 999005', home: 'Camden, NJ', weight: 165 }, b: { name: 'Sid Other', id: 'PA 999006', home: 'Trenton, NJ', weight: 164.5 },
    result: ['Ray Typoe – Winner Unanimous Decision'], referee: 'Referee Jerseyone', judges: 'Judge Ajersey (60-54), Judge Bjersey (60-54), Judge Cjersey (59-55)' },
];

// ---------------------------------------------------------------- Missouri
// Geometry mirrors the Missouri Office of Athletics Word-export sheets reviewed on 2026-09-14. Every name,
// federal id, date of birth and record below is FAKE.
// bouts: [{ n, section, rds, a: { name, from, wgt, rslt, comment }, b: {...} }]
export function missouriPages({ title = 'MISSOURI PROFESSIONAL BOXING AND AMATEUR KICKBOXING SHOW RESULTS', date = '9/5/26', venue = 'Synthetic Hall', city = 'CITY: Synthetic City, MO',
  promoter = 'Synthetic Boxing Promotions', eventNo = '26-999', referees = [['Rex Refone', '1 3'], ['Ray Reftwo', '2 4']], judges = [['Jan Alpha', ''], ['Joe Bravo', ''], ['Kim Charlie', '']], bouts = [] } = {}) {
  const items = [
    it('BOUTS', 692, 532), it(title, 61, 528),
    it('MISSOURI OFFICE OF ATHLETICS', 84, 517), it('PROMOTER', 242, 517), it(promoter, 306, 517),
    it('3605 MISSOURI BOULEVARD', 93, 506), it('ANNOUNCER', 242, 506), it('Ann Ouncer', 306, 506),
    it('(573) 555-0100 OFFICE', 102, 486), it('TIMEKEEPER', 242, 486), it('DOCTOR', 242, 476), it('Dr. Syn Thetic', 306, 476),
    it('DATE', 58, 466), it('LOCATION', 148, 466), it(date, 58, 456), it(venue, 104, 456), it('EXECUTIVE DIRECTOR', 242, 456), it('Ex Director', 391, 456),
    it('ATTENDANCE', 58, 446), it('321', 126, 446), it('EVENT #', 242, 446), it(eventNo, 409, 446), it(city, 58, 435), it('INSPECTORS: In Spector, Two Spector', 158, 435),
    it('BOUT', 60, 425), it('AGE', 98, 425), it('NAME', 153, 425), it('FROM', 241, 425), it('WGT', 303, 425), it('FED ID', 340, 425), it('RDS', 385, 425),
    it('DOB', 423, 425), it('RECORD', 463, 425), it('RSLT', 510, 425), it('COMMENTS', 611, 425),
  ];
  let ry = 517;
  for (const [name, list] of referees) { items.push(it('REFEREE', 504, ry), it(name, 549, ry)); if (list) items.push(it(list, 689, ry)); ry -= 10; }
  let jy = 486;
  for (const [name, list] of judges) { items.push(it('JUDGE', 504, jy), it(name, 549, jy)); if (list) items.push(it(list, 689, jy)); jy -= 10; }
  const pages = [{ page: 1, width: 792, height: 612, items }];
  let y = 405;
  for (const b of bouts) {
    if (y < 80) { pages.push({ page: pages.length + 1, width: 792, height: 612, items: [] }); y = 532; }
    const target = pages.at(-1).items;
    const row = (c, rowY, first) => {
      if (first) target.push(it(String(b.n), 69, rowY), it(String(b.rds), 383, rowY));
      target.push(it('31', 95, rowY), it(c.name, 126, rowY), it(c.from, 212, rowY), it(String(c.wgt), 302, rowY), it('123456', 333, rowY), it('1/1/95', 414, rowY), it('3-1', 459, rowY));
      if (c.rslt) target.push(it(c.rslt, 509, rowY));
      if (c.comment) target.push(it(c.comment, 540, rowY));
    };
    if (b.section) target.push(it(b.section, 58, y));
    row(b.a, y - 10, true);
    if (b.section) target.push(it(b.section, 58, y - 20));
    row(b.b, y - (b.section ? 30 : 20), false);
    y -= b.section ? 52 : 40;
  }
  return pages;
}

export const MISSOURI_BOUTS = [
  { n: 1, section: 'AMATEUR KICKBOXING', rds: 3, a: { name: 'Kick Syntheticone', from: 'Columbia, MO', wgt: 160.2, rslt: 'Lost', comment: '30 Days Susp Concussion' }, b: { name: 'Kick Synthetictwo', from: 'Sedalia, MO', wgt: 166.8, rslt: 'Won', comment: 'By Unanimous Decision 30 30 30' } },
  { n: 2, section: 'PROFESSIONAL BOXING', rds: 4, a: { name: 'Alpha Synthetic', from: 'St. Louis, MO', wgt: 156.9, rslt: 'Lost', comment: '36 39 37, 30 Days Suspension Cut Over Eye' }, b: { name: 'Bravo Synthetic', from: 'Independence, MO', wgt: 153.9, rslt: 'Won', comment: 'By Split Decision 40 37 39' } },
  { n: 3, section: 'PROFESSIONAL BOXING', rds: 6, a: { name: 'Charlie Synthetic', from: 'Columbia, MO', wgt: 157.8, rslt: 'Won', comment: 'By TKO 1:56 of the 4 round' }, b: { name: 'Delta Synthetic', from: 'Macon, MO', wgt: 167.8, rslt: 'Lost', comment: 'Indefinite Susp, No Skills' } },
  { n: 4, section: 'PROFESSIONAL BOXING EXHIBITION', rds: 3, a: { name: 'Echo Synthetic', from: 'Rolla, MO', wgt: 181.2, rslt: '', comment: 'Exhibition Only' }, b: { name: 'Foxtrot Synthetic', from: 'Hannibal, MO', wgt: 201, rslt: '', comment: 'Exhibition Only' } },
];

export const MISSOURI_INDEX_HTML = "<Table width='100%'><tr><th scope='col'>Date</td><th scope='col'>Last Modified</th></tr>"
  + "<TR><td><a target='_blank' href='boards/athletics/boxingresults/2026-09-05%20BOXAKICKRES%20Synthetic%20City%20Synthetic%20Boxing.pdf'>2026-09-05 BOXAKICKRES Synthetic City Synthetic Boxing</a></td><td><font size='-2'><i>9/7/2026</i></font></td></TR>"
  + "<TR><td><a target='_blank' href='boards/athletics/boxingresults/2026-09-04%20KICKBOXRES%20Synthetic%20City%20Kick.pdf'>2026-09-04 KICKBOXRES Synthetic City Kick</a></td><td><font size='-2'><i>9/6/2026</i></font></td></TR>"
  + "<TR><td><a target='_blank' href='boards/athletics/boxingresults/2026-09-03%20AKICKRES%20Synthetic%20City%20Am.pdf'>2026-09-03 AKICKRES Synthetic City Am</a></td><td><font size='-2'><i>9/5/2026</i></font></td></TR></Table>";
