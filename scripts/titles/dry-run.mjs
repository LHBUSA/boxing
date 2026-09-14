#!/usr/bin/env node
// Titles + rankings DRY RUN over sanctioning-body documents already saved locally (no network, no database).
//
//   node scripts/titles/dry-run.mjs --raw=<dir with the saved files> --out=<dir>
//
// Expected files in --raw (saved read-only during source research; not committed):
//   wba-wba-ranking.html, wba-current-wba-champions.html, ibf-<slug>.json (current), ibf-heavyweight-all.json (history),
//   wbo-male.txt (text of the male ratings PDF), wbo-male-champions.html, wbo-male.pdf (for its hash)
// WBC is not inspected (robots.txt content signals + disallowed AI crawlers; no approved rights).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseWbaChampionsPage, parseWbaRankingPage } from '../../shared/adapters/sanctioning/wba.mjs';
import { parseIbfResponse } from '../../shared/adapters/sanctioning/ibf.mjs';
import { parseWboChampionsPage, parseWboRatingsText } from '../../shared/adapters/sanctioning/wbo.mjs';
import { divisionLanes, ibfSnapshot, intraBodyConflicts, titleStatusChanges, toRankingDocument, wbaChampionsSnapshot, wbaRankingSnapshots,
  wboChampionsSnapshot, wboRatingsSnapshots } from '../../shared/titles/sanctioning-snapshot.mjs';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? '').slice(k.length + 3) || null;
const RAW = arg('raw');
const OUT = arg('out');
if (!RAW || !OUT) { console.error('usage: dry-run.mjs --raw=<dir> --out=<dir>'); process.exit(2); }
const file = (f) => join(RAW, f);
const sha = (f) => createHash('sha256').update(readFileSync(file(f))).digest('hex');
const at = (f) => statSync(file(f)).mtime.toISOString();
const DIVISIONS = ['heavyweight', 'light_heavyweight', 'super_middleweight', 'middleweight', 'welterweight', 'lightweight'];
const IBF_SLUG = { heavyweight: 'heavyweight', light_heavyweight: 'light-heavyweight', super_middleweight: 'super-middleweight', middleweight: 'middleweight', welterweight: 'welterweight', lightweight: 'lightweight' };

const wbaRanking = wbaRankingSnapshots(parseWbaRankingPage(readFileSync(file('wba-wba-ranking.html'), 'utf8')),
  { sourceUrl: 'https://www.wbaboxing.com/wba-ranking', retrievedAt: at('wba-wba-ranking.html'), contentSha256: sha('wba-wba-ranking.html') });
const wbaChampParsed = parseWbaChampionsPage(readFileSync(file('wba-current-wba-champions.html'), 'utf8'));
const wbaChampMeta = { sourceUrl: 'https://www.wbaboxing.com/current-wba-champions', retrievedAt: at('wba-current-wba-champions.html'), contentSha256: sha('wba-current-wba-champions.html') };
const wboRatings = wboRatingsSnapshots(parseWboRatingsText(readFileSync(file('wbo-male.txt'), 'utf8')),
  { sourceUrl: 'https://wboboxing.com/rankings/ (male world ratings PDF)', retrievedAt: at('wbo-male.pdf'), contentSha256: sha('wbo-male.pdf') });
const wboChampParsed = parseWboChampionsPage(readFileSync(file('wbo-male-champions.html'), 'utf8'));
const wboChampMeta = { sourceUrl: 'https://wboboxing.com/male-champions/', retrievedAt: at('wbo-male-champions.html'), contentSha256: sha('wbo-male-champions.html') };

const out = { generated_at: new Date().toISOString(), mode: 'dry-run: nothing written to any database', wbc: 'not inspected (see source matrix)', divisions: {} };
for (const key of DIVISIONS) {
  const ibfFile = `ibf-${IBF_SLUG[key]}.json`;
  const ibf = existsSync(file(ibfFile)) ? parseIbfResponse(JSON.parse(readFileSync(file(ibfFile), 'utf8')), { weightSlug: IBF_SLUG[key] })
    .map((r) => ibfSnapshot(r, { sourceUrl: `https://www.ibf-usba-boxing.com/wp-json/ratings/v1/filter?weight=${IBF_SLUG[key]}&org=ibf`, retrievedAt: at(ibfFile), contentSha256: sha(ibfFile) })) : [];
  const own = {
    wba: [wbaRanking.find((s) => s.division.key === key), wbaChampionsSnapshot(wbaChampParsed, wbaChampMeta, key)].filter(Boolean),
    ibf,
    wbo: [wboRatings.find((s) => s.division.key === key), wboChampionsSnapshot(wboChampParsed, wboChampMeta, key)].filter(Boolean),
  };
  out.divisions[key] = {
    lanes: divisionLanes(key, own, { reasons: { wbc: 'WBC source not inspected: robots.txt content signals (ai-train=no, use=reference) and disallowed AI crawlers; rights not approved' } }),
    intra_body_conflicts: {
      wba_ranking_vs_champions: own.wba.length === 2 ? intraBodyConflicts(own.wba[0], own.wba[1]) : null,
      wbo_ratings_vs_champions: own.wbo.length === 2 ? intraBodyConflicts(own.wbo[0], own.wbo[1]) : null,
    },
    rankings: Object.fromEntries(['wba', 'ibf', 'wbo'].map((b) => [b, own[b].filter((s) => s.ranking).map((s) => ({ snapshot: s.snapshot, ranking: s.ranking, as_import_document: toRankingDocument(s, { sourceKey: `${b}_official` }) }))])),
  };
}
// every division: the same body's two documents compared (not only the six sample divisions)
out.intra_body_conflicts_all_divisions = {
  wba: wbaRanking.map((r) => ({ division: r.division.key, ...intraBodyConflicts(r, wbaChampionsSnapshot(wbaChampParsed, wbaChampMeta, r.division.key)) })).filter((x) => x.conflicts.length),
  wbo: wboRatings.map((r) => ({ division: r.division.key, ...intraBodyConflicts(r, wboChampionsSnapshot(wboChampParsed, wboChampMeta, r.division.key)) })).filter((x) => x.conflicts.length),
};
// snapshots over time: the IBF heavyweight history (monthly records)
if (existsSync(file('ibf-heavyweight-all.json'))) {
  const hist = parseIbfResponse(JSON.parse(readFileSync(file('ibf-heavyweight-all.json'), 'utf8')), { weightSlug: 'heavyweight' })
    .map((r) => ibfSnapshot(r, { sourceUrl: 'https://www.ibf-usba-boxing.com/wp-json/ratings/v1/filter?weight=heavyweight&org=ibf&ppp=-1', retrievedAt: at('ibf-heavyweight-all.json'), contentSha256: sha('ibf-heavyweight-all.json') }))
    .sort((a, b) => a.snapshot.as_of.localeCompare(b.snapshot.as_of));
  const recent = hist.slice(-5);
  out.ibf_heavyweight_history = {
    snapshots_available: hist.length, first_results_month: hist[0]?.snapshot.as_of, last_results_month: hist.at(-1)?.snapshot.as_of,
    steps: recent.slice(1).map((s, i) => ({ from: recent[i].snapshot.as_of, to: s.snapshot.as_of, published_on: s.snapshot.published_on, ...titleStatusChanges(recent[i], s), warnings: s.warnings })),
  };
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'titles-rankings-dry-run.json'), JSON.stringify(out, null, 1));
console.log(`wrote ${join(OUT, 'titles-rankings-dry-run.json')}`);
