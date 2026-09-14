// IBF dry-run parser: the JSON the public ratings page reads itself,
// https://www.ibf-usba-boxing.com/wp-json/ratings/v1/filter?weight=<slug>&org=ibf[&ppp=-1] (one record per monthly list).
// Pure functions; no fetch, no storage. robots.txt asks for Crawl-delay: 10.
//
// Record fields as published: title "IBF: HEAVYWEIGHT (OVER 200LBS) – 08/2026", rating_month "YYYYMMDD" (last day of the
// results month), post_date "MM/DD/YYYY", ratings "name,country[,state];..." (15 slots; an empty slot is shown as
// NOT RATED), champ / interim_champ "name,country,state;title won;mandatory;defended;", wba / wbc / wbo "name,country,".

import { countryCode, designationOf, divisionOf, VACANT_WORDS } from './vocabulary.mjs';

const decode = (s) => String(s ?? '').replace(/&#8211;/g, '-').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const mdy = (s) => { const m = String(s ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; };

function person(field) {
  const [name, country, state] = String(field ?? '').split(',').map((x) => decode(x));
  if (!name) return { source_name: null, vacant: false, empty: true };
  if (VACANT_WORDS.test(name)) return { source_name: null, vacant: true, empty: false };
  return { source_name: name, country: countryCode(country) ?? (country || null), country_label: country || null, state: state || null, vacant: false, empty: false };
}

// champ / interim_champ: "name,country,state;title won;mandatory;defended;"
export function ibfChampionField(field, designationLabel) {
  const parts = String(field ?? '').split(';');
  if (!parts[0]?.trim()) return null;
  const p = person(parts[0]);
  const [won, mandatory, defended] = [mdy(parts[1]), mdy(parts[2]), mdy(parts[3])];
  return {
    ...p, designation: designationOf('ibf', designationLabel),
    // on a vacant record the IBF keeps the previous holder's dates: they describe no current reign and are not used
    title_won_on: p.vacant ? null : won, mandatory_due_on: p.vacant ? null : mandatory, last_defended_on: p.vacant ? null : defended,
    ignored_fields: p.vacant && (won || mandatory || defended) ? { title_won: won, mandatory, defended, why: 'dates printed on a TITLE VACANT record' } : null,
  };
}

export function parseIbfRecord(record, { weightSlug }) {
  const title = decode(record.title);
  const label = title.replace(/^IBF:\s*/, '').replace(/\s*-\s*\d{2}\/\d{4}$/, '');
  const month = String(record.rating_month ?? '');
  const slots = String(record.ratings ?? '').split(';').slice(0, 15);
  const entries = slots.map((slot, i) => {
    const p = person(slot);
    return p.empty ? { position: i + 1, rank_label: String(i + 1), source_name: null, not_rated: true }
      : { position: i + 1, rank_label: String(i + 1), source_name: p.source_name, country: p.country, country_label: p.country_label, state: p.state };
  });
  const champions = [ibfChampionField(record.champ, 'CHAMPION'), ibfChampionField(record.interim_champ, 'INTERIM CHAMPION')].filter(Boolean);
  return {
    body: 'ibf', document: 'rating', title_as_printed: title,
    division: { ...divisionOf('ibf', weightSlug), label_as_printed: label, weight_class_label: decode(record.wc) || null },
    results_month_end: /^\d{8}$/.test(month) ? `${month.slice(0, 4)}-${month.slice(4, 6)}-${month.slice(6, 8)}` : null,
    published_on: mdy(record.post_date),
    champions,
    // the IBF's own statement of the other bodies' champions: kept as a claim, never as their title
    claims_about_other_bodies: ['wba', 'wbc', 'wbo'].map((org) => ({ about: org, ...person(record[org]), native_text: decode(record[org]) })).map(({ empty, ...c }) => c),
    entries,
  };
}

export const parseIbfResponse = (json, { weightSlug }) => (Array.isArray(json) ? json : []).map((r) => parseIbfRecord(r, { weightSlug }));
