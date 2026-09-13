// Derived-intelligence engine: registry -> point-in-time history -> metrics ->
// append-only snapshots. Reads canonical facts; writes ONLY derived tables.

import { canonicalJson, sha256Hex } from '../canonical.mjs';
import { ENGINE_VERSION } from './common.mjs';
import { FIGHTER_METRICS, computeFighterMetrics, definitionPayload } from './fighter-metrics.mjs';
import { OFFICIAL_METRICS, computeOfficialMetrics } from './official-metrics.mjs';
import { buildMatchupFeatures } from './matchup.mjs';

export async function registerDefinitions(store) {
  const out = { registered: 0, unchanged: 0 };
  for (const m of [...FIGHTER_METRICS, ...OFFICIAL_METRICS]) {
    const r = await store.registerMetricDefinition(definitionPayload(m));
    out[r.status] += 1;
  }
  return out;
}

const iso = (t) => new Date(t).toISOString();

export async function computeFighterDna(store, fighterId, cutoff, { runId = null } = {}) {
  const history = await store.fighterHistoryAsOf(fighterId, iso(cutoff));
  if (!history?.fighter) throw new Error(`fighter not found: ${fighterId}`);
  const rows = computeFighterMetrics(history);
  const inputsHash = await sha256Hex(canonicalJson(history));
  const w = await store.writeMetricSnapshots({
    subject_kind: 'fighter', subject_id: history.fighter.id, input_cutoff: iso(cutoff), inputs_hash: inputsHash,
    engine_version: ENGINE_VERSION, run_id: runId, inputs_digest: { bouts: history.bouts.length, history_hash: inputsHash }, rows,
  });
  return { fighter_id: history.fighter.id, inputs_hash: inputsHash, rows, written: w.written };
}

export async function computeOfficialDna(store, officialId, cutoff, { runId = null } = {}) {
  const history = await store.officialHistoryAsOf(officialId, iso(cutoff));
  if (!history?.official) throw new Error(`official not found: ${officialId}`);
  const rows = computeOfficialMetrics(history);
  const inputsHash = await sha256Hex(canonicalJson(history));
  const w = await store.writeMetricSnapshots({
    subject_kind: 'official', subject_id: history.official.id, input_cutoff: iso(cutoff), inputs_hash: inputsHash,
    engine_version: ENGINE_VERSION, run_id: runId, inputs_digest: { bouts: history.bouts.length, history_hash: inputsHash }, rows,
  });
  return { official_id: history.official.id, inputs_hash: inputsHash, rows, written: w.written };
}

// Snapshot of what was knowable about a bout at `cutoff` (must be <= bout start).
export async function buildMatchupSnapshot(store, boutId, cutoff, { runId = null } = {}) {
  const bout = await store.matchupInputs(boutId);
  if (!bout) throw new Error(`bout not found: ${boutId}`);
  const sides = Object.fromEntries((bout.participants ?? []).map((p) => [p.side, p.fighter_id]));
  if (!sides.a || !sides.b) throw new Error(`bout ${boutId} does not have two active corners`);
  if (bout.starts_at && +new Date(cutoff) > +new Date(bout.starts_at)) {
    throw Object.assign(new Error(`cutoff ${iso(cutoff)} is after bout start ${bout.starts_at}`), { code: 'BX120' });
  }
  const [historyA, historyB] = await Promise.all([store.fighterHistoryAsOf(sides.a, iso(cutoff)), store.fighterHistoryAsOf(sides.b, iso(cutoff))]);
  const built = buildMatchupFeatures({ bout, historyA, historyB, cutoff });
  const inputsHash = await sha256Hex(canonicalJson(built.features));
  const r = await store.writeMatchupSnapshot({
    bout_id: boutId, model_key: built.model_key, model_version: built.model_version, input_cutoff: iso(cutoff),
    fighter_a_id: sides.a, fighter_b_id: sides.b, features: built.features, metric_versions: built.metric_versions,
    inputs_hash: inputsHash, engine_version: ENGINE_VERSION, run_id: runId,
    inputs_digest: { history_a_bouts: historyA.bouts.length, history_b_bouts: historyB.bouts.length },
  });
  return { ...r, inputs_hash: inputsHash, features: built.features };
}

export async function runFighterDna(store, fighterIds, cutoff) {
  const runId = await store.startIntelRun('fighter_dna', ENGINE_VERSION, iso(cutoff));
  let written = 0;
  try {
    for (const id of fighterIds) written += (await computeFighterDna(store, id, cutoff, { runId })).written;
    await store.finishIntelRun(runId, 'ok', fighterIds.length, written, {});
  } catch (err) {
    await store.finishIntelRun(runId, 'failed', fighterIds.length, written, { error: String(err.message).slice(0, 300) });
    throw err;
  }
  return { run_id: runId, written };
}
