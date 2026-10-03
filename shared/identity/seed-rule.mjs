// P0 identity seed rule (owner decision 2026-10-03). Decides, for one subject (a boxer printed by one or more
// sanctioning bodies with no PropBetEdge fighter yet), whether a Wikidata item may seed a canonical HUMAN identity.
//
// Wikidata establishes a person, never a record: nothing here reads or writes wins, titles, rankings or bouts.
//
// The canonical name is the Wikidata label when it agrees with a printed name, otherwise the Wikidata alias that did.
//
// AUTO_SEEDED needs ALL of:
//   * exactly one Wikidata human boxer whose label/alias agrees with a printed name (name alone is never enough)
//   * citizenship or sport country agrees with a country the body printed (a mismatch, or no printed country, is REVIEW)
//   * a single date of birth (conflicting DOBs are a hard HOLD) that puts the boxer at a plausible fighting age on the
//     body's status date (no DOB means the era cannot be checked: REVIEW)
//   * not recorded as deceased
//   * Wikidata's competition class, when present, does not contradict every division the bodies printed
// Two plausible candidates is REVIEW. No name-agreeing human boxer is NO_CANDIDATE.

export const RULE_VERSION = 'p0-identity-seed@1.0.0';
const MIN_AGE = 18;
const MAX_AGE = 45;

// letters that NFD does not decompose (ł, ø, ß ...) are folded first, then diacritics are dropped
const FOLD = { 'ł': 'l', 'Ł': 'L', 'ø': 'o', 'Ø': 'O', 'đ': 'd', 'Đ': 'D', 'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE', 'ı': 'i', 'þ': 'th' };
const fold = (s) => String(s ?? '').replace(/[łŁøØđĐßæÆœŒıþ]/g, (c) => FOLD[c]).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// letters-only key
export const nameKey = (s) => fold(s).replace(/[^a-z]/g, '');
const tokens = (s) => fold(s).replace(/[^a-z\s'’-]/g, ' ').split(/[\s'’-]+/).filter(Boolean);
const tokenSetKey = (s) => tokens(s).sort().join(' ');
const dropInitials = (s) => tokens(s).filter((t) => t.length > 1).join('');
const SUFFIX = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);
export const dropSuffix = (s) => tokens(s).filter((t) => !SUFFIX.has(t)).join(' ');

// how a printed name agrees with a Wikidata name: exact > initial_dropped > suffix_dropped > token_order; null = none
export function nameAgreement(printed, wikidataName) {
  if (!printed || !wikidataName) return null;
  if (nameKey(printed) === nameKey(wikidataName)) return 'exact';
  if (dropInitials(printed) && dropInitials(printed) === nameKey(wikidataName)) return 'initial_dropped';
  const a = dropSuffix(printed); const b = dropSuffix(wikidataName);
  if (a.split(' ').length >= 2 && nameKey(a) === nameKey(b)) return 'suffix_dropped';
  if (tokens(printed).length >= 2 && tokenSetKey(printed) === tokenSetKey(wikidataName)) return 'token_order';
  return null;
}
const LEVEL_RANK = { exact: 4, initial_dropped: 3, suffix_dropped: 2, token_order: 1 };

// printed country (as any body prints it) -> set of ISO 3166-1 alpha-3. A slash means the body printed two.
const COUNTRY = {
  usa: 'USA', us: 'USA', unitedstates: 'USA', unitedstatesofamerica: 'USA',
  gb: 'GBR', gbr: 'GBR', uk: 'GBR', eng: 'GBR', england: 'GBR', unitedkingdom: 'GBR', greatbritain: 'GBR', sco: 'GBR', scotland: 'GBR', wal: 'GBR', wales: 'GBR', nir: 'GBR',
  irl: 'IRL', ireland: 'IRL', mex: 'MEX', mexico: 'MEX', jpn: 'JPN', japan: 'JPN', rus: 'RUS', russia: 'RUS',
  pur: 'PRI', pri: 'PRI', puertorico: 'PRI', ven: 'VEN', venezuela: 'VEN', aus: 'AUS', australia: 'AUS',
  cub: 'CUB', cuba: 'CUB', crc: 'CRI', cri: 'CRI', costarica: 'CRI', phl: 'PHL', phi: 'PHL', philippines: 'PHL',
  tha: 'THA', thailand: 'THA', hrv: 'HRV', cro: 'HRV', croatia: 'HRV', kgz: 'KGZ', kyrgyzstan: 'KGZ',
  ger: 'DEU', deu: 'DEU', germany: 'DEU', pol: 'POL', poland: 'POL', bel: 'BEL', belgium: 'BEL',
  gua: 'GTM', gtm: 'GTM', guatemala: 'GTM', rsa: 'ZAF', zaf: 'ZAF', southafrica: 'ZAF', sa: 'ZAF',
  cmr: 'CMR', cameroon: 'CMR', can: 'CAN', canada: 'CAN', kaz: 'KAZ', kazakhstan: 'KAZ', uzb: 'UZB', uzbekistan: 'UZB',
  arg: 'ARG', argentina: 'ARG', dom: 'DOM', dominicanrepublic: 'DOM', domr: 'DOM', col: 'COL', colombia: 'COL',
  nic: 'NIC', nicaragua: 'NIC', pan: 'PAN', panama: 'PAN', ukr: 'UKR', ukraine: 'UKR', fra: 'FRA', france: 'FRA',
  esp: 'ESP', spain: 'ESP', ita: 'ITA', italy: 'ITA', chn: 'CHN', china: 'CHN', kor: 'KOR', korea: 'KOR', southkorea: 'KOR',
  gha: 'GHA', ghana: 'GHA', nga: 'NGA', nigeria: 'NGA', nzl: 'NZL', newzealand: 'NZL', bra: 'BRA', brazil: 'BRA',
};
// Puerto Rico competes as itself but its citizens hold US citizenship: either agrees with the other
const EQUIVALENT = { PRI: ['USA'], USA: ['PRI'] };

export function printedCountries(values) {
  const out = new Set();
  const unknown = [];
  for (const v of values ?? []) for (const part of String(v).split('/')) {
    const code = COUNTRY[part.toLowerCase().replace(/[^a-z]/g, '')];
    if (code) out.add(code); else if (part.trim()) unknown.push(part.trim());
  }
  return { codes: [...out].sort(), unknown };
}

// weight classes in order, with every alias a body or Wikidata uses
const DIVISIONS = [
  ['minimumweight', 'strawweight', 'miniflyweight', 'minimum', 'atomweight'],
  ['light_flyweight', 'lightflyweight', 'juniorflyweight'],
  ['flyweight'],
  ['super_flyweight', 'superflyweight', 'juniorbantamweight'],
  ['bantamweight'],
  ['super_bantamweight', 'superbantamweight', 'juniorfeatherweight'],
  ['featherweight'],
  ['super_featherweight', 'superfeatherweight', 'juniorlightweight'],
  ['lightweight'],
  ['super_lightweight', 'superlightweight', 'juniorwelterweight', 'lightwelterweight'],
  ['welterweight'],
  ['super_welterweight', 'superwelterweight', 'juniormiddleweight', 'lightmiddleweight'],
  ['middleweight'],
  ['super_middleweight', 'supermiddleweight'],
  ['light_heavyweight', 'lightheavyweight'],
  ['cruiserweight', 'juniorheavyweight'],
  ['bridgerweight'],
  ['heavyweight'],
];
export function divisionIndex(name) {
  const k = String(name ?? '').toLowerCase().replace(/^(men'?s|women'?s)\s+/, '').replace(/\s*boxing$/, '').replace(/[^a-z_]/g, '');
  const kk = k.replace(/_/g, '');
  return DIVISIONS.findIndex((aliases) => aliases.some((a) => a.replace(/_/g, '') === kk));
}

const ageOn = (dob, on) => {
  const b = new Date(`${dob}T00:00:00Z`); const d = new Date(`${on}T00:00:00Z`);
  let a = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) a -= 1;
  return a;
};

// subject: { person_key, names_as_printed[], countries_as_printed[], divisions[], status_date, entries[] }
// candidates: Wikidata human boxers [{ qid, label, names[], citizenship_iso3[], sport_country_iso3[], dobs[{date,precision}],
//   deceased, competition_classes[], sex, revision }]
export function decideSeed(subject, candidates) {
  const printed = subject.names_as_printed ?? [];
  const scored = [];
  for (const c of candidates ?? []) {
    let best = null;
    for (const p of printed) for (const n of [c.label, ...(c.names ?? [])]) {
      const level = nameAgreement(p, n);
      if (level && (!best || LEVEL_RANK[level] > LEVEL_RANK[best.level])) best = { level, printed: p, wikidata: n };
    }
    if (best) scored.push({ ...c, name: best });
  }
  const searched = (candidates ?? []).map((c) => ({ qid: c.qid, label: c.label }));
  if (scored.length === 0) {
    return { decision: 'NO_CANDIDATE', reasons: ['no_wikidata_human_boxer_agrees_with_printed_name'], evidence: { searched }, candidates: searched };
  }
  const candidateSummary = scored.map((c) => ({ qid: c.qid, label: c.label, name_agreement: c.name.level,
    citizenship: c.citizenship_iso3, sport_country: c.sport_country_iso3, dobs: c.dobs, deceased: !!c.deceased }));

  // name agreement narrows, it never decides: when several name-agree, the country separates them only if exactly one
  // agrees; otherwise two plausible people survive and the subject is held
  const country = printedCountries(subject.countries_as_printed);
  const countryAgrees = (c) => {
    const theirs = new Set([...(c.citizenship_iso3 ?? []), ...(c.sport_country_iso3 ?? [])]);
    return country.codes.some((x) => theirs.has(x) || (EQUIVALENT[x] ?? []).some((y) => theirs.has(y)));
  };
  let pool = scored;
  if (scored.length > 1) {
    const agreeing = scored.filter(countryAgrees);
    if (agreeing.length !== 1) {
      return { decision: 'REVIEW_REQUIRED', reasons: ['several_plausible_wikidata_candidates'],
        evidence: { name_agreeing: scored.length, country_agreeing: agreeing.length, printed_countries: country }, candidates: candidateSummary };
    }
    pool = agreeing;
  }
  const c = pool[0];
  const reasons = [];
  const checks = {};

  checks.name = { result: 'agrees', level: c.name.level, printed: c.name.printed, wikidata: c.name.wikidata };

  if (country.codes.length === 0) {
    checks.country = { result: 'not_printed', printed: subject.countries_as_printed ?? [], unrecognised: country.unknown };
    reasons.push('no_printed_country_to_corroborate');
  } else if (countryAgrees(c)) {
    checks.country = { result: 'agrees', printed: country.codes, citizenship: c.citizenship_iso3, sport_country: c.sport_country_iso3 };
  } else if ((c.citizenship_iso3 ?? []).length === 0 && (c.sport_country_iso3 ?? []).length === 0) {
    checks.country = { result: 'wikidata_has_no_country', printed: country.codes };
    reasons.push('no_wikidata_country_to_corroborate');
  } else {
    checks.country = { result: 'disagrees', printed: country.codes, citizenship: c.citizenship_iso3, sport_country: c.sport_country_iso3 };
    reasons.push('country_mismatch_needs_more_evidence');
  }

  const days = [...new Set((c.dobs ?? []).filter((d) => d.precision === 'day').map((d) => d.date))];
  const years = [...new Set((c.dobs ?? []).map((d) => d.date.slice(0, 4)))];
  let dob = null;
  if (days.length > 1 || years.length > 1) {
    checks.dob = { result: 'conflict', values: c.dobs };
    reasons.push('dob_conflict_hard_hold');
  } else if ((c.dobs ?? []).length === 0) {
    checks.dob = { result: 'absent' };
    reasons.push('no_dob_era_unverifiable');
  } else {
    dob = (c.dobs.find((d) => d.precision === 'day') ?? c.dobs[0]);
    const on = subject.status_date ?? new Date().toISOString().slice(0, 10);
    const age = ageOn(dob.precision === 'day' ? dob.date : `${dob.date.slice(0, 4)}-07-01`, on);
    const plausible = age >= MIN_AGE && age <= MAX_AGE;
    checks.era = { result: plausible ? 'plausible' : 'implausible', age_on_status_date: age, status_date: on, range: [MIN_AGE, MAX_AGE] };
    checks.dob = { result: 'single', value: dob.date, precision: dob.precision };
    if (!plausible) reasons.push('age_implausible_for_current_champion');
  }

  if (c.deceased) { checks.alive = { result: 'deceased' }; reasons.push('recorded_deceased'); } else checks.alive = { result: 'no_death_recorded' };

  const printedDiv = (subject.divisions ?? []).map(divisionIndex).filter((i) => i >= 0);
  const wdDiv = (c.competition_classes ?? []).map(divisionIndex).filter((i) => i >= 0);
  if (wdDiv.length === 0) {
    checks.division = { result: 'not_on_wikidata', printed: subject.divisions };
  } else {
    const near = wdDiv.some((w) => printedDiv.some((p) => Math.abs(w - p) <= 2));
    checks.division = { result: near ? 'compatible' : 'contradicts', printed: subject.divisions, wikidata: c.competition_classes };
    if (!near) reasons.push('division_contradicts_wikidata_class');
  }

  const bodies = [...new Set((subject.entries ?? []).map((e) => e.body))];
  checks.sanctioning_bodies = { bodies, org_boxer_ids: (subject.entries ?? []).filter((e) => e.org_boxer_id).map((e) => `${e.body}:${e.org_boxer_id}`) };

  const evidence = { checks, entity_revision: c.revision ?? null, candidates_considered: scored.length };
  const labelAgrees = printed.some((p) => nameAgreement(p, c.label));
  const base = { wikidata_qid: c.qid, canonical_name: labelAgrees ? c.label : c.name.wikidata, dob: dob?.date ?? null, dob_precision: dob?.precision ?? null, candidates: candidateSummary, evidence };
  return reasons.length === 0 ? { decision: 'AUTO_SEEDED', reasons: [], ...base } : { decision: 'REVIEW_REQUIRED', reasons, ...base };
}
