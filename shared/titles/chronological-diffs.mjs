// Chronological title-status diff pass (migration 0039): each body's snapshots oldest -> newest per division and
// document kind. Uses the collectors' own change detection; records diffs and proposals only. Never creates a title
// event, never rewrites a stored snapshot or an earlier diff.

import { diffRankings } from '../rankings/diff.mjs';
import { titleStatusChanges } from './sanctioning-snapshot.mjs';

const titles = (j) => ({ titles: (j?.belts ?? []).map((b) => ({ lineage: { tier: b.tier }, native_designation: b.designation, status: b.status,
  holder: b.holder ? { source_name: b.holder.name } : null, reign_start: b.reign_start })) });

export function analysePair(pair) {
  const title_changes = titleStatusChanges(titles(pair.previous), titles(pair.current)).title_changes;
  const ranking_changes = pair.current_ranking ? diffRankings({ entries: pair.previous_ranking ?? [] }, { entries: pair.current_ranking }) : [];
  return { previous_snapshot_id: pair.previous_snapshot_id, current_snapshot_id: pair.current_snapshot_id, title_changes, ranking_changes, conflicts: [] };
}

export async function runChronologicalDiffs(store, { bodies = ['ibf', 'wba', 'wbo', 'wbc'], batch = 40, maxBatches = 100000, log = () => {} } = {}) {
  const out = {};
  for (const body of bodies) {
    const m = { pairs: 0, diffs: 0, proposals: 0, batches: 0 };
    for (let i = 0; i < maxBatches; i++) {
      const pairs = await store.titleChainPairs(body, batch);
      if (!pairs?.length) break;
      const r = await store.recordTitleAnalyses({ items: pairs.map(analysePair) });
      m.pairs += pairs.length; m.diffs += r.diffs; m.proposals += r.proposals; m.batches += 1;
      // pairs that record no diff would be returned again forever
      if (!r.diffs) { m.stalled = pairs.slice(0, 3).map((p) => [p.previous_snapshot_id, p.current_snapshot_id]); break; }
      if (m.batches % 25 === 0) log(`${body}: ${m.pairs} pairs, ${m.proposals} proposals`);
    }
    out[body] = m;
  }
  return out;
}
