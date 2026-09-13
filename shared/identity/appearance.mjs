// Store glue for career-graph resolution of one source appearance: retrieve
// name candidates, load their career graph, decide (graph.mjs), persist the
// decision with its evidence (boxing_record_appearance_decision).

import { contentHash } from '../canonical.mjs';
import { assertMinimized } from '../adapters/commissions/minimize.mjs';
import { GRAPH_RESOLVER_VERSION, resolveAppearance } from './graph.mjs';
import { buildIndex, lookupKeys, toIdentity } from './pipeline.mjs';
import { parseName } from './normalize.mjs';

export async function loadGraphCandidates(store, displayName, namespace) {
  const identity = toIdentity({ display_name: displayName }, namespace);
  const retrieved = await store.candidates({ keys: lookupKeys(identity), searchName: parseName(displayName).full || null });
  const byId = new Map([retrieved.mapped, ...(retrieved.candidates ?? [])].filter(Boolean).map((c) => [c.id, c]));
  if (!byId.size) return [];
  const graph = await store.identityGraphContext([...byId.keys()]);
  return graph.map((g) => ({ ...(byId.get(g.id) ?? {}), ...g }));
}

// Evidence stored with every decision: observation context and, per candidate,
// the exact reasons for and against. No DOB, no private identifiers.
export function decisionEvidence(app, result) {
  return assertMinimized({
    resolver_version: GRAPH_RESOLVER_VERSION,
    decision_reason: result.reason,
    observation: { display_name: app.display_name, hometown: app.hometown ?? null, weight_lb: app.weight_lb ?? null, debut: app.debut ?? null,
      event_date: app.event?.date ?? null, commission: app.event?.commission ?? null, venue_id: app.event?.venue_id ?? null,
      opponent: app.opponent?.display_name ?? null, opponent_fighter_id: app.opponent?.fighter_id ?? null },
    candidates: (result.candidates ?? []).map((c) => ({ fighter_id: c.fighter_id, display_name: c.display_name, tier: c.tier, confidence: c.confidence,
      name_level: c.name_level, families: c.families, for: c.support, against: c.against, career: c.career })),
  });
}

// app: see graph.mjs; plus { source_key, namespace, bout_external_id, side }
export async function resolveAndRecordAppearance(store, app, { allowCreate = false, runId = null, dryRun = false } = {}) {
  const candidates = await loadGraphCandidates(store, app.display_name, app.namespace);
  const result = resolveAppearance(app, candidates, { allowCreate });
  if (result.decision === 'none' || dryRun) return { ...result, recorded: null };
  const evidence = decisionEvidence(app, result);
  const recorded = await store.recordAppearanceDecision({
    source_key: app.source_key, namespace: app.namespace, bout_external_id: app.bout_external_id, side: app.side,
    observed_name: app.display_name, hometown: app.hometown ?? null, decision: result.decision, tier: result.tier,
    fighter_id: result.fighter_id ?? null, confidence: result.confidence, evidence, evidence_hash: await contentHash(evidence),
    resolver_version: GRAPH_RESOLVER_VERSION, ingest_run_id: runId,
    index: buildIndex(toIdentity({ display_name: app.display_name }, app.namespace), { evidence: { nameLevel: result.decision === 'created' ? 'exact' : result.candidates?.find((c) => c.fighter_id === result.fighter_id)?.name_level } }),
  });
  // an existing binding always wins over a new resolver opinion
  if (recorded.status === 'already_bound') return { ...result, decision: recorded.decision, tier: recorded.tier, fighter_id: recorded.fighter_id, recorded };
  return { ...result, fighter_id: recorded.fighter_id ?? result.fighter_id ?? null, recorded };
}
