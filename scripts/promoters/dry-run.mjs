#!/usr/bin/env node
// Professional card collector — LOCAL dry run. Fetches nothing remote by default: it replays the committed fixtures
// against a disposable local database, resolves identities, exercises the rights lane and prints the write plan.
//
//   node scripts/promoters/dry-run.mjs                      # fixtures -> receipt on stdout
//   node scripts/promoters/dry-run.mjs --out=<file.json>    # and save it
//   node scripts/promoters/dry-run.mjs --live               # fetch the real pages instead (still writes nothing)
//
// Nothing here writes to staging or production. The same collector runs for real, without --dry-run, once the
// natural-run gate opens and migrations 0042-0047 are applied.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshDatabase } from '../../tests/helpers/db.mjs';
import { pgStore } from '../lib/pg-store.mjs';
import { collectPromoterCards } from '../../shared/promoters/collect.mjs';
import { PBC } from '../../shared/adapters/promoters/pbc.mjs';
import { MATCHROOM } from '../../shared/adapters/promoters/matchroom.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const live = process.argv.includes('--live');
const fixtures = join(ROOT, 'tests/fixtures/promoters');
const FIXTURE = {
  [PBC.scheduleUrl]: 'pbc-schedule.html',
  'https://www.premierboxingchampions.com/fight-night-september-19-2026': 'pbc-event.html',
  // a second, later card: its UTC instant has to be resolved from its own date, not copied from the September one
  'https://www.premierboxingchampions.com/fight-night-october-17-2026': 'pbc-event-october.html',
  [MATCHROOM.eventsUrl]: 'matchroom-events.html',
  'https://www.matchroomboxing.com/events/hedges-vs-brown/': 'matchroom-event.html',
};
const fixtureFetch = async (url) => {
  const file = FIXTURE[url];
  if (!file) return { ok: false, status: 404, text: async () => '' };
  return { ok: true, status: 200, text: async () => readFileSync(join(fixtures, file), 'utf8') };
};

const db = await freshDatabase('promoter_dry_run');
try {
  const store = pgStore(db.client);
  const receipt = await collectPromoterCards(store, {
    fetchImpl: live ? fetch : fixtureFetch,
    dryRun: true,
    now: new Date().toISOString(),
    windowDays: 45,
    maxEvents: live ? 4 : 8,
    sleepImpl: live ? undefined : async () => {},
  });
  const out = arg('out');
  if (out) { mkdirSync(dirname(join(ROOT, out)), { recursive: true }); writeFileSync(join(ROOT, out), `${JSON.stringify(receipt, null, 1)}\n`); }
  for (const s of receipt.sources) {
    console.log(`\n=== ${s.source_key} (${s.parser_version}) lane=${s.lane} discovered=${s.discovered ?? 0}${s.error ? ` ERROR ${s.error}` : ''}`);
    for (const e of s.events) {
      if (e.skipped || e.error) { console.log(`  - ${e.url}: ${e.skipped ?? e.error}${e.date ? ` (${e.date})` : ''}`); continue; }
      console.log(`  * ${e.date} ${e.event_name} — ${e.venue ?? 'venue not stated'}${e.city ? `, ${e.city}` : ''} ${e.country ?? ''} | ${e.broadcaster ?? 'no broadcaster'} | ${e.announced_bouts} announced bouts`);
      if (e.published_start_local) console.log(`    start: ${e.published_start_local} ${e.published_utc_offset ?? ''} -> ${e.scheduled_start_at} (${e.start_basis})`);
      console.log(`    event: ${e.plan.event.action}  venue: ${e.plan.venue.action}  fingerprint: ${e.fingerprint.slice(0, 16)}`);
      const f = e.plan.fighters;
      console.log(`    fighters: ${f.length} (${f.filter((x) => x.outcome === 'matched').length} matched, ${f.filter((x) => x.outcome === 'created' || x.outcome === 'unresolved').length} new, ${f.filter((x) => x.outcome === 'review').length} review)`);
      console.log(`    titles: ${e.plan.titles.resolved} canonical, ${e.plan.titles.unresolved} kept unresolved`);
      for (const b of e.plan.bouts) console.log(`      ${String(b.order).padStart(2)} ${b.segment.padEnd(10)} ${b.pairing} | ${b.division ?? 'division not stated'} | ${b.scheduled_rounds ?? '?'} rds | ${b.titles.join(',') || '-'} | ${b.action}`);
      if (e.parser_problems.length) console.log(`    refused: ${e.parser_problems.join(' ; ')}`);
    }
  }
  const s = receipt.summary;
  console.log(`\n--- receipt summary -----------------------------------------------`);
  console.log(`cards      discovered ${s.cards_discovered}  accepted ${s.cards_accepted}  rejected ${s.cards_rejected}  unreachable ${s.cards_unreachable}  outside window ${s.cards_skipped}`);
  console.log(`bouts      accepted ${s.bouts_accepted}  refused ${s.bouts_refused}  (unannounced slots ${s.placeholder_slots_refused})`);
  console.log(`fighters   ${s.fighters} planned`);
  console.log(`duplicates suppressed: ${s.duplicates_suppressed.events} events, ${s.duplicates_suppressed.bouts} bouts, ${s.duplicates_suppressed.fighters} fighters`);
  console.log(`start time corroborated ${s.start_times.corroborated}  structured ${s.start_times.structured}  printed-preferred ${s.start_times.visible_preferred}  unresolved ${s.start_times.unresolved}  none published ${s.start_times.none}  conflicts recorded ${s.start_times.conflicts_recorded}`);
  console.log(`content    profile content (bios, physicals) refused for: ${s.content.sources_that_may_not_store_profiles.join(", ") || "no source"}  — names are facts and are not gated by this`);
  console.log(`rights     lane refusals ${s.rights.lane_refusals}${s.rights.sources_failed.length ? `  source failures: ${s.rights.sources_failed.join('; ')}` : ''}`);
  console.log(`identity   ${s.identity_reviews_predicted} corner(s) would go to the identity review queue`);
  console.log(`writes     planned ${s.planned_writes}  ACTUAL ${s.actual_writes}`);
  console.log(`\ndry run: ${receipt.dry_run}; nothing was written anywhere.`);
} finally {
  await db.close();
}
