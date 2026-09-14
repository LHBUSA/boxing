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

// ---------------------------------------------------------------- Pennsylvania
// Geometry mirrors the Pennsylvania State Athletic Commission "BoxResults" sheets reviewed on 2026-09-14. Every
// name, date of birth and federal id below is FAKE.
// bouts: [{ rds, marker, a: { name, result, state, weight, remarks }, b: {...} }]
export function pennsylvaniaPages({ event = 'BOXING', promoter = 'SYNTHETIC, PAT', location = 'Synthetic Arena-Philadelphia', date = '9/5/2026',
  referees = [['REFONE, REX', '1'], ['REFTWO, RAY', '2']], judges = ['ALPHA, JAN', 'BRAVO, JOE', 'CHARLIE, KIM'], bouts = [] } = {}) {
  const header = [
    it('PENNSYLVANIA DEPARTMENT OF STATE', 259, 527), it('STATE ATHLETIC COMMISSION', 300, 509),
    it('Promoter:', 87, 492), it(promoter, 138, 492), it('Synthetic Director, Executive Director', 315, 492), it('Commissioner:', 492, 492), it('SYN COMMISH', 573, 492),
    it('Location:', 89, 475), it(location, 138, 479), it('2525 North 7th Street,', 337, 479), it('Physician:', 511, 479), it('DOC, SYN', 573, 479),
    it('Date:', 105, 461), it(date, 138, 464), it('Harrisburg, Pennsylvania 17110', 320, 464), it('Timekeeper:', 503, 461), it('KEEPER, TIM', 573, 464),
    it('Referees:', 89, 447), it('Judges:', 520, 447), it('Fax: (717) 555-0101', 340, 437), it('Event:', 101, 417), it(event, 138, 417),
    it('Sch', 93, 349), it('Rounds Contestants', 77, 338), it('Result', 275, 338), it('State', 338, 338), it('Weight', 380, 338), it('Birth Date', 423, 338), it('Fed Id', 478, 338), it('Remarks', 549, 338),
  ];
  let ry = 450;
  for (const [name, n] of referees) { header.push(it(name, 138, ry)); if (n) header.push(it(n, 212, ry)); ry -= 17; }
  let jy = 450;
  for (const name of judges) { header.push(it(name, 573, jy)); jy -= 13; }
  const items = [...header];
  let y = 323;
  for (const b of bouts) {
    items.push(it(`${b.rds} ${b.a.name}`, 108, y), it(b.a.result, 256, y), it(b.a.state, 328, y), it(b.a.weight.toFixed(2), 384, y), it('1/1/1995 PA-123456', 424, y));
    if (b.a.remarks) items.push(it(b.a.remarks, 544, y));
    if (b.marker) items.push(it(b.marker, 57, y - 12));
    const by = y - 15;
    items.push(it(b.b.name, 118, by), it(b.b.result, 256, by), it(b.b.state, 328, by), it(b.b.weight.toFixed(2), 384, by), it('2/2/1996', 424, by), it('NJ-654321', 478, by));
    if (b.b.remarks) items.push(it(b.b.remarks, 544, by));
    y -= 34;
  }
  return [{ page: 1, width: 792, height: 612, items }];
}

export const PENNSYLVANIA_BOUTS = [
  { rds: 4, marker: '1', a: { name: 'ALPHA, SYNTH', result: 'W UNA 4RD', state: 'PA', weight: 146.2 }, b: { name: 'BRAVO, SYNTH', result: 'L UNA 4RD', state: 'NJ', weight: 147 } },
  { rds: 6, marker: '2', a: { name: 'Charlie, Synth', result: 'L Ko 1RD', state: 'MEXICO', weight: 118.6, remarks: 'IND SUSP - ORTHO LEFT HAND' }, b: { name: "O'DELTA JR., SYNTH", result: 'W Ko 1RD', state: 'AZ', weight: 121, remarks: '1:21 rd-1 KO' } },
  { rds: 8, marker: 'REFONE', a: { name: 'ECHO, SYNTH', result: 'D MAJ 8RD', state: 'PA', weight: 160 }, b: { name: 'FOXTROT, SYNTH', result: 'D MAJ 8RD', state: 'NY', weight: 159.4, remarks: '45 DAY SUSPENSION-LEFT EYE' } },
];

export const PENNSYLVANIA_INDEX_HTML = '<div><a href="/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/09-05-26%20box%20synthetic%20-%20synthetic%20arena%20-%20phila.%20pa%20-%20results.pdf">Boxing</a>'
  + '<a href="/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/09-06-26%20mma%20synthetic%20-%20synthetic%20arena%20-%20phila.%20pa%20-%20results.pdf">MMA</a>'
  + '<a href="/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2026/09-07-26%20grant%20amateur%20k-bx%20-%20parkview%20inn%20-%20allentown%20pa%20-%20results.pdf">KB</a>'
  + '<a href="/content/dam/copapwp-pagov/en/dos/programs/state-athletics/results/2024/2024-01-12-Boxing-Results.pdf">2024</a></div>';

// ---------------------------------------------------------------- Tennessee
// Device-space pages (the shape extractDeviceText() returns: y up, drawn radio dots as marks). Geometry mirrors the
// Tennessee Athletic Commission "BOXING MATCH RESULTS" form reviewed on 2026-09-14, upright (612 wide) or landscape
// with /Rotate 90 (792 wide: x scaled by 1.294). Every name, federal ID and birth date below is FAKE.
// bouts: [{ n, rds, status: 'pro'|'am', a: { name, weight }, b: { name, weight }, winner: 'a'|'b'|'both'|null,
//           rd, time, method: [lines], susp: { a: [[days, text]], b: [[days, text]] } }]
export function tennesseePages({ title = 'BOXING MATCH RESULTS', city = 'NASHVILLE', date = '09 / 05 / 2026', venue = 'SYNTHETIC HALL', eventName = 'SYNTHETIC FIGHT NIGHT',
  promoter = 'SYNTHETIC PROMOTIONS', judges = ['Jan Alpha', 'Joe Bravo', 'Kim Charlie', 'Lou Delta'], referees = ['Rex Refone', 'Ray Reftwo'], rotate = false, bouts = [] } = {}) {
  const kx = rotate ? 1.294 : 1;
  const dy = rotate ? -84 : 0;
  const t = (s, x, y) => ({ s, x: Math.round(x * kx), y: y + dy, w: Math.round(s.length * 4.5 * kx) });
  const mark = (x, y) => ({ x: Math.round(x * kx * 10) / 10, y: Math.round((y + dy) * 10) / 10, w: 2.9, h: 2.9 });
  const items = [
    t('* Information circled in red is required', 467, 610), t(title, 15, 606),
    t('STATE OF TENNESSEE ATHLETIC COMMISSION', 62, 589), t('CITY :', 275, 589), t(city, 344, 589), t('DATE:', 473, 589), t(date, 520, 589),
    t('DAVY CROCKETT TOWERS', 18, 575), t('STATE/PROVINCE :', 275, 575), t('TENNESSEE', 344, 575), t('VENUE :', 473, 575), t(venue, 520, 575),
    t('P: 615 555 0100', 16, 563), t('synthetic@example.test', 171, 563), t('EVENT NAME :', 275, 563), t(eventName, 344, 563), t('PROMOTER :', 473, 563), t(promoter, 520, 563),
    t('EXECUTIVE DIRECTOR:', 19, 542), t('Syn Director', 88, 542), t('JUDGE(s):', 274, 542),
    t('NAME: Ina Inspector', 18, 518), t('TITLE:', 129, 518), t('Inspector', 151, 518), t('REFEREE(s):', 274, 514),
    t('RINGSIDE DOCTOR(s):', 274, 486), t('1.', 343, 486), t('Dr. Syn Physician', 352, 486), t('ANNOUNCER:', 273, 472), t('Ann Announcer', 345, 472),
    t('TIMEKEEPER:', 273, 459), t('Tim Keeper', 345, 459),
    t('BOUT # RDS.', 15, 415), t('STATUS', 66, 415), t('FIGHTER NAME', 106, 415), t('FED ID AND/OR DOB', 172, 415), t('WEIGHT', 233, 415), t('WINNER', 267, 415),
    t('RD.', 304, 415), t('TIME', 322, 415), t('METHOD', 375, 415), t('SUSPENSIONS', 494, 415),
  ];
  const slots = [[343, 352], [426, 435], [510, 518]];
  const numbered = (names, y) => names.forEach((name, i) => { const [nx, vx] = slots[i % 3]; const ry = y - 14 * Math.floor(i / 3); items.push(t(`${i + 1}.`, nx, ry), t(name, vx, ry)); });
  numbered(judges, 542);
  numbered(referees, 514);
  const marks = [];
  bouts.forEach((b, k) => {
    const y0 = 397 - 49 * k;
    items.push(t('Pro', 79, y0), t(b.a.name, 100, y0), t('TN 1234567', 184, y0 + 5), t(b.a.weight.toFixed(1), 240, y0));
    items.push(t(String(b.n), 26, y0 - 10), t(String(b.rds), 51, y0 - 10));
    if (b.rd) items.push(t(String(b.rd), 308, y0 - 10));
    if (b.time) items.push(t(b.time, 325, y0 - 10));
    items.push(t('Am', 79, y0 - 18), t('1/1/1995', 183, y0 - 18), t(b.b.name, 100, y0 - 24), t(b.b.weight.toFixed(1), 240, y0 - 24));
    marks.push(mark(69.9, b.status === 'am' ? y0 - 17.6 : y0 + 0.4));
    if (b.winner === 'a' || b.winner === 'both') marks.push(mark(280.8, y0 + 1));
    if (b.winner === 'b' || b.winner === 'both') marks.push(mark(280.8, y0 - 17.5));
    (b.method ?? []).forEach((line, i) => items.push(t(line, 344, y0 + 5 - 8.5 * i)));
    for (const [side, base] of [['a', y0 - 2], ['b', y0 - 22]]) {
      (b.susp?.[side] ?? []).forEach(([days, text], i) => items.push(t(String(days), 445, base - 9 * i), t(text, 475, base - 9 * i)));
    }
  });
  return [{ page: 1, width: rotate ? 792 : 612, height: rotate ? 612 : 792, rotate: rotate ? 90 : 0, items, marks }];
}

export const TENNESSEE_BOUTS = [
  { n: 1, rds: 4, a: { name: 'Synth Alpha', weight: 146.2 }, b: { name: 'Synth Bravo', weight: 147 }, winner: 'a',
    method: ['UNANIMOUS DECISION', 'REF: Rex Refone', 'Jan Alpha 40-36', 'Joe Bravo 39-37', 'Kim Charlie 39-37'] },
  { n: 2, rds: 6, a: { name: 'Synth Charlie', weight: 118.6 }, b: { name: "Synth O'Delta Jr", weight: 121 }, winner: 'b', rd: 2, time: '1:21',
    method: ['TKO', 'REF: Ray Reftwo'], susp: { a: [[30, 'MANDATORY - TKO'], [60, 'OR CLEARED BY OPHTHALMOLOGIST']] } },
  { n: 3, rds: 6, a: { name: 'Synth Echo', weight: 160 }, b: { name: 'Synth Foxtrot', weight: 159.4 }, winner: 'b',
    method: ['SPLIT DECISION', 'REF: Rex Refone', 'Jan Alpha 58-56', 'Joe Bravo 56-58', 'Lou Delta 55-59'] },
  { n: 4, rds: 4, status: 'am', a: { name: 'Synth Amateur', weight: 150 }, b: { name: 'Synth Novice', weight: 151 }, winner: 'a',
    method: ['UNANIMOUS DECISION', 'REF: Rex Refone'] },
  { n: 5, rds: 8, a: { name: 'Synth Golf', weight: 175 }, b: { name: 'Synth Hotel', weight: 174.2 }, winner: null,
    method: ['MAJORITY DRAW', 'REF: Ray Reftwo', 'Jan Alpha 77-75', 'Kim Charlie 76-76', 'Lou Delta 76-76'] },
  { n: 6, rds: 4, a: { name: 'Synth India', weight: 200 }, b: { name: 'Synth Juliet', weight: 201 }, winner: 'both',
    method: ['UNANIMOUS DECISION', 'REF: Rex Refone', 'Jan Alpha 40-36', 'Joe Bravo 40-36', 'Kim Charlie 40-36'], susp: { b: [[14, '14 days by Dr.']] } },
];

export const TENNESSEE_ROTATED_BOUTS = [
  { n: 1, rds: 4, a: { name: 'Synth Kilo', weight: 130 }, b: { name: 'Synth Lima', weight: 131.4 }, winner: 'b', rd: 1, time: '2.47',
    method: ['REF: Rex Refone', 'KO'], susp: { a: [[30, '30 Days by Commission']] } },
  // the WINNER mark is on A but every line, read A first, gives the fight to B
  { n: 2, rds: 4, a: { name: 'Synth Mike', weight: 119.4 }, b: { name: 'Synth November', weight: 122.6 }, winner: 'a',
    method: ['UNANIMOUS DECISION', 'Jan Alpha - 36-40', 'Joe Bravo - 36-40', 'Kim Charlie - 37-39'] },
];

const tnRow = (date, type, city, name, links) => `</tr><tr><td>${date}</td>\n<td>${type}</td>\n<td>${city}</td>\n<td>${name}</td>\n<td>${links}</td>\n`;
const tnLink = (path, label) => `<a title="${label}" href="/content/dam/tn/commerce/documents/regboards/athletic/results/${path}">${label}</a>`;
export const TENNESSEE_EVENTS_HTML = '<table><tbody><tr><th>Date</th><th>Event Type</th><th>Location</th><th>Event Name/Venue</th><th>Results</th>'
  + tnRow('9/5/2026', 'Pro Boxing', 'Nashville', 'Synthetic Fight Night', tnLink('2026/SYNTHETIC-BOXING_9-5.pdf', 'Results'))
  + tnRow('9/6/2026', 'Pro-Am MMA', 'Memphis', 'Synthetic Cage', tnLink('2026/SYNTHETIC-MMA_9-6.pdf', 'Results'))
  + tnRow('9/12/2026', 'Pro-Am Boxing', 'Knoxville', 'Synthetic Brawl', `${tnLink('2026/SYNTHETIC_9-12_Boxing.pdf', 'Boxing Results')}<br />\n${tnLink('2026/SYNTHETIC_9-12_Bare-Knuckle.pdf', 'Bare-Knuckle Results')}`)
  + tnRow('9/13/2026', 'Pro Boxing', 'Chattanooga', 'Synthetic Scan', tnLink('2026/SYNTHETIC-SCAN_9-13.pdf', 'Results'))
  + '</tr></tbody></table>';
export const TENNESSEE_ARCHIVE_HTML = '<table><tbody><tr><th>Date</th><th>Event Type</th><th>Location</th><th>Event Name/Venue</th><th>Results</th>'
  + tnRow('12/20/2025', 'Pro Boxing', 'Nashville', 'Synthetic Archive Night', tnLink('2025/SYNTHETIC-ARCHIVE_12-20.pdf', 'Results'))
  // real archive quirks: markup inside cells, and a mistyped year
  + tnRow('12/6/2025<br />\n', 'All Pro Boxing<br />\n', 'Memphis', 'Synthetic Markup Night<br />\n', tnLink('2025/SYNTHETIC-MARKUP_12-6.pdf', 'Results'))
  + tnRow('11/2/202', 'Pro Boxing', 'Nashville', 'Synthetic Typo Night', tnLink('2025/SYNTHETIC-TYPO_11-2.pdf', 'Results'))
  + '</tr></tbody></table>';
