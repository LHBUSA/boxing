// Synthetic sanctioning-body documents. Layouts reproduce the WBA, IBF and WBO sources reviewed on 2026-09-14; every
// name and value is invented. No sanctioning-body page is committed.

export const champRow = (name, country, id, designation) => `<tr><td class="text-center"><img alt="${name}"></td><td colspan="2"><p> ${id ? `<a href="https://www.wbaboxing.com/wba-boxer-profile/?id=${id}">${name}</a> <br><span class="text-muted small">${country}</span>` : name} </p></td><td><p>${designation}</p></td></tr>`;
export const rankRow = (n, name, id, regional, country) => `<tr><td class="text-center"><p>${n}</p></td><td><p> <a href="https://www.wbaboxing.com/wba-boxer-profile/?id=${id}">${name}</a> </p></td><td>${regional ? `<p>${regional}</p>` : ''}</td><td class="text-center"><p>${country}</p></td></tr>`;
export const wbaDivision = (n, label, limit, champs, others, rows) => `
  <div class="row custom-widget-header"><div class="col-12 col-sm-6 hidden-xs text-left"> <a role="button" href="#division${n}"> <i class="glyphicon"></i> <span>
  ${label} </span> </a> </div>
  <div class="col-12 col-sm-6 hidden-xs"> <span class="text-center">${limit}</span> </div></div>
  <div class="collapse" id="division${n}"><div class="panel"><table class="table">${champs}</table></div>
  <div class="panel"><table class="table"><tr><td class="otherorgs text-center" colspan="4">${others}</td></tr>${rows}</table></div></div>`;

const fifteen = (prefix, idBase, extra = {}) => Array.from({ length: 15 }, (_, i) => rankRow(i + 1, `${prefix} ${String.fromCharCode(65 + i)}`, idBase + i, extra[i + 1] ?? '', 'USA')).join('');

// WBA ranking page: light heavyweight (three WBA belts), lightweight (vacant world belt, a commented recess row),
// plus filler divisions so the page passes the structure check (>= 10 divisions)
export function wbaRankingHtml({ label = 'AUGUST 2026', date = 'August 31st, 2026', lhwRegular = 'SYNTH BRAVO', extraDesignation = null, extraDivision = null } = {}) {
  const fillers = ['HEAVYWEIGHT', 'CRUISERWEIGHT', 'SUPER MIDDLEWEIGHT', 'MIDDLEWEIGHT', 'SUPER WELTERWEIGHT', 'WELTERWEIGHT', 'SUPER LIGHTWEIGHT', 'FEATHERWEIGHT', 'BANTAMWEIGHT']
    .map((d, k) => wbaDivision(10 + k, d, '— Lbs', champRow(`SYNTH FILL${k}`, 'USA', 900 + k, extraDesignation && k === 0 ? extraDesignation : 'WBA WORLD CHAMPION'), '', fifteen(`FILLER${k}`, 1000 + k * 20)));
  return `<h2 class="post-title"> World Boxing Association Ranking as of ${label} </h2><a>Download WBA Rankings</a><p>${date}</p>`
    + wbaDivision(1, 'LIGHT HEAVYWEIGHT', '175 Lbs / 79,379 Kgs',
      champRow('SYNTH ALPHA', 'RUS', 11, 'WBA SUPER CHAMPION <br>WBO-IBF CHAMPION') + champRow(lhwRegular, 'USA', 12, 'WBA WORLD CHAMPION') + champRow('SYNTH CHARLIE', 'VEN', 13, 'WBA INTERIM CHAMPION'),
      '<span>WBC</span> <span>SYNTH BRAVO</span> &nbsp;', fifteen('SYNTH RANKED', 100, { 2: 'C/LA' }))
    + wbaDivision(2, 'LIGHTWEIGHT', '135 Lbs / 61,235 Kgs',
      champRow('VACANT', null, null, 'WBA WORLD CHAMPION') + `<!--${champRow('SYNTH RECESS', 'USA', 14, 'CHAMPION IN RECESS')}-->`,
      '<span>WBC</span> <span>VACANT</span> &nbsp; <span>IBF</span> <span>SYNTH FOXTROT</span> &nbsp; <span>WBO</span> <span>SYNTH GOLF</span> &nbsp;', fifteen('SYNTH LIGHT', 200))
    + fillers.join('')
    + (extraDivision ? wbaDivision(40, extraDivision, '— Lbs', champRow('SYNTH UNKNOWN', 'USA', 990, 'WBA WORLD CHAMPION'), '', fifteen('UNKNOWNDIV', 3000)) : '');
}

export function wbaChampionsHtml({ lhwRegular = 'SYNTH BRAVO' } = {}) {
  const rows = [['light heavyweight', 'SYNTH ALPHA', 'Russia', 'WBA Super World'], ['light heavyweight', lhwRegular, 'United States', 'WBA World'], ['light heavyweight', 'SYNTH CHARLIE', 'Venezuela', 'Interim WBA']];
  const fillers = ['heavyweight', 'cruiserweight', 'super middleweight', 'middleweight', 'super welterweight', 'welterweight', 'super lightweight', 'featherweight', 'bantamweight'].map((d, k) => [d, `SYNTH FILL${k}`, 'United States', 'WBA World']);
  let html = '<li>IBEROAMERICAN &amp; MEDITERRANEAN</li>';
  let lastDivision = null;
  for (const [d, n, c, des] of [...fillers.slice(0, 1), ...rows, ...fillers.slice(1)]) {
    if (d !== lastDivision) { html += `<div>${d}</div>`; lastDivision = d; }
    html += `<div>${n}</div><div>${c}</div><div>20-0-0 (10 KO's)</div><div>${des}</div>`;
  }
  return `${html}<div>lightweight</div><div>VACANT</div><div>WBA World</div><div>SYNTH RECESS</div><div>United States</div><div>30-0-1 (28 KO's)</div><div>Champion in recess</div><div>heavyweight</div>`;
}

export const IBF_SLUGS = ['heavyweight', 'cruiserweight', 'light-heavyweight', 'super-middleweight', 'middleweight', 'jr-middleweight', 'welterweight', 'jr-welterweight', 'lightweight', 'jr-lightweight', 'featherweight', 'jr-featherweight', 'bantamweight', 'jr-bantamweight', 'flyweight', 'jr-flyweight', 'mini-flyweight'];
export const ibfRecord = (over = {}) => ({
  title: 'IBF: LT. HEAVYWEIGHT (175 LBS) &#8211; 08/2026', desc: '', rating_month: '20260831', post_date: '09/08/2026',
  ratings: ';Synth Delta,Australia (AUS);Synth Echo,United States (USA),Nevada (NV)', champ: 'Synth Alpha,Kyrgyzstan (KGZ),;11/11/2017;10/28/2024;01/28/2023;',
  interim_champ: '', wba: 'Synth Alpha,Kyrgyzstan (KGZ),', wbc: 'TITLE VACANT,,', wbo: 'Synth Alpha,Kyrgyzstan (KGZ),', wc: 'Light Heavyweight (175 LBS)', sort_weight: 175, ...over,
});
// heavyweight monthly history: champion, vacancy with a stale date, new champion who leaves the list
export const IBF_HEAVYWEIGHT_HISTORY = [
  ibfRecord({ title: 'IBF: HEAVYWEIGHT (OVER 200LBS) &#8211; 05/2026', rating_month: '20260531', post_date: '06/08/2026', champ: 'Synth King,Ukraine (UKR),;06/01/2024;;;', ratings: 'Synth Next,Cuba (CUB);;Synth Other,England (ENG)' }),
  ibfRecord({ title: 'IBF: HEAVYWEIGHT (OVER 200LBS) &#8211; 06/2026', rating_month: '20260630', post_date: '07/09/2026', champ: 'TITLE VACANT,,;06/01/2024;;;', ratings: 'Synth Next,Cuba (CUB);;Synth Other,England (ENG)' }),
  ibfRecord({ title: 'IBF: HEAVYWEIGHT (OVER 200LBS) &#8211; 08/2026', rating_month: '20260831', post_date: '09/08/2026', champ: 'Synth Next,Cuba (CUB),;08/29/2026;;;', ratings: ';Synth Other,England (ENG);Synth New,Croatia (HRV)' }),
];

export const wboRankingsPage = ({ token = 'cmFua2luZw==/bWFsZQ==/0123456789abcdef0123456789abcdef' } = {}) =>
  `<form id="ranking-search-form"></form><a href="https://wboboxing.com/wborankings/report/${token}/RankingReportMale">Male</a><a href="https://wboboxing.com/wborankings/report/${token.replace('bWFsZQ==', 'ZmVtYWxl')}/RankingReportFemale">Female</a>`;

const WBO_LABELS = ['HEAVYWEIGHT', 'JR. HEAVYWEIGHT', 'LT. HEAVYWEIGHT', 'SUP. MIDDLEWEIGHT', 'MIDDLEWEIGHT', 'JR. MIDDLEWEIGHT', 'WELTERWEIGHT', 'JR. WELTERWEIGHT', 'LIGHTWEIGHT', 'JR. LIGHTWEIGHT', 'FEATHERWEIGHT', 'JR. FEATHERWEIGHT', 'BANTAMWEIGHT', 'JR. BANTAMWEIGHT', 'FLYWEIGHT', 'JR. FLYWEIGHT', 'MINI-FLYWEIGHT'];
export function wboRatingsText({ asOf = 'August 28, 2026', lhwChampion = 'SYNTH ALPHA' } = {}) {
  return `WBO MALE\nWORLD\nRATINGS\nAs of ${asOf}\n=====PAGE=====\n` + WBO_LABELS.map((label, k) => [label, '(100 lbs) (45.36 kgs)',
    ...Array.from({ length: 15 }, (_, i) => `${i + 1}. Synth Wbo${k}x${i} (USA)`),
    ...(label === 'LT. HEAVYWEIGHT' ? ['** Synth Regional (WBO Africa) (TZA)', 'SYNTH ALPHA WBA', 'IBF', 'VACANT WBC', 'CHAMPIONS', `${lhwChampion} (RUS)`, 'SYNTH INTERIM (Interim) (GBR)'] : ['CHAMPIONS', `SYNTH WBOCHAMP${k} (USA)`])].join('\n')).join('\n');
}
export function wboChampionsHtml({ lhwChampion = 'Synth Alpha' } = {}) {
  const card = (interim, limit, division, name, fields) => `${interim ? '<div>INTERIM</div>' : ''}${limit ? `<span>${limit}</span>` : ''}<span>${division}</span>${name.split(' ').map((p) => `<span>${p}</span>`).join('')}<a>Fighter Profile</a>`
    + Object.entries(fields).map(([k, v]) => `<p>${k}: ${v}</p>`).join('') + '<div>United Kingdom</div><div>22</div><div>W</div>';
  const base = { 'Last WBO Title Defense': '', 'Next Mandatory': 'TBD', 'Champion since': 'May 9, 2026', 'Previous champion': 'Synth Before', 'Number of Defenses': '0' };
  return [card(false, '175 LBS', 'LT. HEAVYWEIGHT', lhwChampion, { ...base, 'Next Mandatory': 'Mandatory vs Synth Interim', 'WBO History': 'The Undisputed Super Champion prose is narrative.' }),
    card(true, '175 LBS', 'LT. HEAVYWEIGHT', 'Synth Interim', base),
    ...WBO_LABELS.filter((l) => l !== 'LT. HEAVYWEIGHT' && l !== 'MINI-FLYWEIGHT').map((l, k) => card(false, '100 LBS', l, `Synth Wbochamp${k < 2 ? k : k + 1}`, base))].join('');
}
export function wboHistoryHtml({ month = 'JULY', year = 2026 } = {}) {
  const table = (label) => `<table class="ranking table"><thead><tr><td colspan="4" class="title-weight text-center">${label} (100 lbs) (45.36 kgs)</td></tr></thead>`
    + '<tr><td><b>Title</b></td><td><b>Name</b></td><td><b>Country</b></td></tr><tr><td><b>CHAMPION</b></td><td><b>SYNTH OLDCHAMP</b></td><td><b>USA</b></td></tr>'
    + Array.from({ length: 15 }, (_, i) => `<tr><td>${i + 1}</td><td>Synth Hist${i}</td><td>USA</td></tr>`).join('') + '</table>'
    + '<table class="ranking other-org table table-sm"><tr><td>WBA</td><td>SYNTH ALPHA</td></tr><tr><td>IBF</td><td></td></tr><tr><td>WBC</td><td>VACANT</td></tr></table>';
  return `<h1>WORLD BOXING ORGANIZATION MALE RANKING ${month} ${year}</h1>${WBO_LABELS.map(table).join('')}`;
}
