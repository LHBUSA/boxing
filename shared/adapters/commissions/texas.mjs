// Texas Department of Licensing and Regulation — Combative Sports.
//
// Access review (2026-09-13): the public "Results of Past Events" table at
// https://www.tdlr.texas.gov/sports/events/results/ is populated in the
// browser from /sports/_events-list.csv, and https://www.tdlr.texas.gov/robots.txt
// declares "Disallow: /*.csv". Automated collection is therefore NOT
// permitted: the source is reference_only and this adapter never fetches.
//
// What exists is the classifier the adapter will use if TDLR provides a
// permitted feed: TDLR regulates boxing, kickboxing, MMA, muay thai, bare
// knuckle, slap fighting and amateur events, so every row is classified and
// only professional boxing is accepted. Texas state championships are a
// separate title context (organization 'tdlr-texas', tier 'state'), never
// WBC/WBA/IBF/WBO lineage.

import { SPORT, classifySportLabel } from './contract.mjs';

export const TEXAS = Object.freeze({
  key: 'texas',
  sourceKey: 'tdlr_texas',
  version: 'tdlr-texas@0.1.0',
  jurisdiction: { code: 'US-TX', name: 'Texas' },
  commission: { slug: 'tdlr', name: 'Texas Department of Licensing and Regulation — Combative Sports', jurisdiction: 'Texas', country_code: 'US' },
  remote: { enabled: false, reason: 'robots.txt disallows /*.csv (the results data file); reference_only until TDLR provides a permitted feed' },
  stateTitleOrganization: { slug: 'tdlr-texas', name: 'Texas State Championship (TDLR)', kind: 'governing_body', tier: 'state' },
});

// Row from the TDLR results table: [date, promoter, category, location, results]
export function classifyTexasRow(row) {
  const category = String(row?.[2] ?? '').trim();
  const lc = category.toLowerCase();
  const amateur = /\bamateur\b|\bamma\b/.test(lc);
  const sport = classifySportLabel(category === 'Box' || lc === 'box' ? 'boxing' : category);
  return { sport, professional: !amateur, accepted: sport === SPORT.BOXING && !amateur, category_raw: category };
}

export async function discoverTexas() {
  throw Object.assign(new Error(`texas remote collection disabled: ${TEXAS.remote.reason}`), { code: 'remote_disabled' });
}
