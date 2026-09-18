#!/usr/bin/env node
// Cut a captured PBC event page down to the parts the parser actually reads, so fixtures stay small, reproducible and
// free of article text and photography.
//
// Kept: the first schema.org SportsEvent block, the printed header line (date / start times / venue), and each
// fight-row block. Everything else — stylesheets, scripts, images, promotional copy, navigation — is dropped.
//
//   node scripts/promoters/make-fixture.mjs <captured.html> <tests/fixtures/promoters/pbc-event-*.html>

import { readFileSync, writeFileSync } from 'node:fs';

const [, , src, dest] = process.argv;
if (!src || !dest) { console.error('usage: make-fixture.mjs <captured.html> <fixture.html>'); process.exit(2); }

const html = readFileSync(src, 'utf8');
const bare = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '');

// the one SportsEvent block the parser reads, with the performer array's personal data dropped: we never store DOB
let jsonLd = null;
for (const m of bare.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi)) {
  let parsed;
  try { parsed = JSON.parse(m[1]); } catch { continue; }
  const node = (Array.isArray(parsed) ? parsed : [parsed]).find((n) => n?.['@type'] === 'SportsEvent');
  if (!node) continue;
  jsonLd = { '@context': 'http://schema.org', '@type': 'SportsEvent', name: node.name, url: node.url, startDate: node.startDate, location: node.location?.name ? { '@type': 'Place', name: node.location.name } : undefined };
  break;
}
if (!jsonLd) { console.error(`${src}: no schema.org SportsEvent block`); process.exit(1); }

const header = /<div class="fight-night-header[\s\S]*?<\/p>/.exec(bare)?.[0] ?? null;
if (!header) console.error(`${src}: warning — no printed header line found`);

const rows = [...bare.matchAll(/<div class="fight-row row (?:field_bouts|field_co_billed_bouts)-\d+"[\s\S]*?<!--END: Fight Row-->/g)].map((m) => m[0]);
if (!rows.length) { console.error(`${src}: no fight rows`); process.exit(1); }

const broadcaster = /dazn\.com|dazn-station/i.test(bare) ? '<a href="https://www.dazn.com/">Watch on DAZN</a>' : /prime ?video/i.test(bare) ? '<a href="https://www.primevideo.com/">Watch on Prime Video</a>' : '';

writeFileSync(dest, [
  '<!doctype html><html><head><title>Fight Night</title>',
  '<script type="application/ld+json">',
  JSON.stringify([jsonLd], null, 2),
  '</script>',
  '</head><body>',
  header ?? '',
  header ? '</div></div>' : '',
  broadcaster,
  ...rows,
  '</body></html>',
  '',
].join('\n'));

console.log(`${dest}: ${jsonLd.startDate} · ${rows.length} fight rows · header ${header ? 'kept' : 'MISSING'}`);
