// Official outcomes: result, scorecards, weigh-ins, public regulatory actions.
// Each write is idempotent; changed content becomes a revision; each change
// emits at most one structured news event.

import { dedupeKey } from '../canonical.mjs';
import { checkResultAgainstCards, classifyDecision, validateScorecard } from './decisions.mjs';
import { assessWeighIn, isCatchweight, weighInNewsType } from './weighins.mjs';

const newsBase = (type, { key, boutId, eventId, fighterIds = [], sourceKey, sourceUrl, now, review = false, facts, supersedes = null, observedKey }) => ({
  contract_version: '1.1.0', event_type: type, dedupe_key: key, supersedes_dedupe_key: supersedes, bout_id: boutId, event_id: eventId,
  fighter_ids: fighterIds.filter(Boolean), source_key: sourceKey, occurred_at: now, detected_at: now, confidence: review ? 70 : 100,
  requires_human_review: review, payload: { facts },
  sources: [{ source_key: sourceKey, source_url: sourceUrl ?? null, observed_at: now, external_key: observedKey }],
});

export async function recordResult(store, input, { now = new Date().toISOString() } = {}) {
  const state = await store.boutOutcomeState(input.bout_id);
  const sides = Object.fromEntries(state.participants.map((p) => [p.fighter_id, p.side]));
  const cardProblems = checkResultAgainstCards(
    { outcome: input.outcome, winner_side: input.winner_id ? sides[input.winner_id] : null, method: input.method, decision_type: input.decision_type },
    state.scorecards);
  const r = await store.recordResult(input);
  if (r.status === 'duplicate') return { ...r, problems: cardProblems, news: null };

  const prev = r.previous;
  const overturned = Boolean(prev) && (input.result_state === 'overturned' || prev.outcome !== input.outcome || prev.winner_id !== (input.winner_id ?? null));
  const type = overturned ? 'RESULT_OVERTURNED' : 'RESULT_OFFICIAL';
  const key = await dedupeKey('result', input.bout_id, r.revision);
  const news = newsBase(type, {
    key, boutId: input.bout_id, eventId: state.event_id, fighterIds: state.participants.map((p) => p.fighter_id), sourceKey: input.source_key,
    sourceUrl: input.source_url, now, review: overturned || cardProblems.length > 0 || input.result_state === 'provisional',
    supersedes: prev ? await dedupeKey('result', input.bout_id, r.revision - 1) : null,
    observedKey: `bout_result:${r.result_id}`,
    facts: { bout_id: input.bout_id, outcome: input.outcome, winner_id: input.winner_id ?? null, method: input.method ?? null,
      decision_type: input.decision_type ?? null, round: input.round ?? null, time_sec: input.time_sec ?? null,
      result_state: input.result_state ?? 'official', revision: r.revision, previous: prev ?? null, change_reason: input.change_reason ?? null,
      scorecard_consistency: cardProblems.length ? { consistent: false, problems: cardProblems } : { consistent: state.scorecards.length ? true : null } },
  });
  const emitted = await store.emitNewsEvent(news);
  return { ...r, problems: cardProblems, news: { ...news, id: emitted.id, inserted: emitted.inserted } };
}

// cards: [{ judge_id, scorer_role?, slot?, a_total, b_total, rounds: [{round,a,b,deduction?}], score_basis? }]
export async function recordScorecards(store, { bout_id: boutId, source_key: sourceKey, source_url: sourceUrl, cards, deductions = [], stopped_round: stoppedRound = null, change_reason: changeReason = null }, { now = new Date().toISOString() } = {}) {
  const state = await store.boutOutcomeState(boutId);
  const a = state.participants.find((p) => p.side === 'a')?.fighter_id;
  const b = state.participants.find((p) => p.side === 'b')?.fighter_id;
  const problems = cards.flatMap((c) => validateScorecard(c, { scheduledRounds: state.scheduled_rounds, stoppedRound }).map((p) => `judge ${c.judge_id}: ${p}`));

  const written = [];
  for (const c of cards) {
    const decisionFor = Number(c.a_total) > Number(c.b_total) ? a : Number(c.b_total) > Number(c.a_total) ? b : null;
    const r = await store.recordScorecard({
      bout_id: boutId, judge_id: c.judge_id, fighter_a_id: a, fighter_b_id: b, fighter_a_total: c.a_total, fighter_b_total: c.b_total,
      decision_for_id: decisionFor, source_key: sourceKey, source_url: sourceUrl, scorer_role: c.scorer_role ?? 'judge', slot: c.slot ?? null,
      score_basis: c.score_basis ?? 'unknown', rounds: c.rounds ?? [], change_reason: changeReason,
    });
    written.push({ judge_id: c.judge_id, ...r });
  }
  for (const d of deductions) await store.recordPointDeduction({ ...d, bout_id: boutId, source_key: sourceKey, source_url: sourceUrl });

  const changed = written.filter((w) => w.status !== 'duplicate');
  if (!changed.length) return { written, problems, news: null };
  const current = (await store.boutOutcomeState(boutId)).scorecards;
  const key = await dedupeKey('scorecards', boutId, current.map((s) => s.scorecard_id).sort());
  const revised = changed.some((w) => w.status === 'revised');
  const news = newsBase('SCORECARD_POSTED', {
    key, boutId, eventId: state.event_id, fighterIds: [a, b], sourceKey, sourceUrl, now, review: revised || problems.length > 0,
    observedKey: `scorecards:${changed.map((w) => w.scorecard_id).join(',')}`,
    facts: { bout_id: boutId, cards: current.map((s) => ({ judge_id: s.judge_id, fighter_a_total: s.a_total, fighter_b_total: s.b_total, revision: s.revision })),
      classification: classifyDecision(current), is_correction: revised, change_reason: changeReason, validation_problems: problems },
  });
  if (revised) {
    const prior = await store.recentNewsEvents('SCORECARD_POSTED', boutId, '1900-01-01T00:00:00Z');
    news.supersedes_dedupe_key = prior[0]?.dedupe_key ?? null;
  }
  const emitted = await store.emitNewsEvent(news);
  return { written, problems, news: { ...news, id: emitted.id, inserted: emitted.inserted } };
}

export async function recordWeighIn(store, input, { now = new Date().toISOString() } = {}) {
  const state = await store.boutOutcomeState(input.bout_id);
  const contracted = input.contracted_weight_lb ?? state.contracted_weight_lb ?? state.weight_class_limit_lb;
  const assessed = assessWeighIn({ officialLb: input.official_weight_lb, contractedLb: contracted });
  const problems = [];
  if (input.status && input.status !== assessed.status && assessed.status !== 'recorded') {
    problems.push(`source status ${input.status} disagrees with arithmetic ${assessed.status}`);
  }
  const row = { ...input, contracted_weight_lb: contracted, status: assessed.status, miss_lb: assessed.miss_lb };
  const r = await store.recordWeighIn(row);
  if (r.status === 'duplicate') return { ...r, problems, news: null };
  const type = weighInNewsType({ weigh_in_kind: row.weigh_in_kind ?? 'official', verification_state: row.verification_state ?? 'unverified', status: row.status });
  if (!type) return { ...r, problems, news: null };
  const key = await dedupeKey('weigh_in', input.bout_id, input.fighter_id, row.weigh_in_kind ?? 'official', row.attempt_no ?? 1, type, row.official_weight_lb, row.verification_state);
  const titles = state.titles.filter((t) => t.at_stake);
  const news = newsBase(type, {
    key, boutId: input.bout_id, eventId: state.event_id, fighterIds: [input.fighter_id], sourceKey: input.source_key, sourceUrl: input.source_url,
    now, review: problems.length > 0, observedKey: `weigh_in:${r.weigh_in_id}`,
    facts: { bout_id: input.bout_id, fighter_id: input.fighter_id, weigh_in_kind: row.weigh_in_kind ?? 'official', attempt_no: row.attempt_no ?? 1,
      official_weight_lb: row.official_weight_lb ?? null, source_weight_raw: row.source_weight_raw ?? null, source_unit: row.source_unit ?? null,
      contracted_weight_lb: contracted, miss_lb: row.miss_lb, status: row.status, verification_state: row.verification_state,
      is_catchweight: isCatchweight(state.contracted_weight_lb, state.weight_class_limit_lb),
      // titles at stake are listed as facts; consequences are NOT inferred here
      titles_at_stake: titles.map((t) => t.title_id), title_consequence: null },
  });
  const emitted = await store.emitNewsEvent(news);
  return { ...r, problems, news: { ...news, id: emitted.id, inserted: emitted.inserted } };
}

export async function recordRegulatoryAction(store, input, { now = new Date().toISOString() } = {}) {
  const r = await store.recordRegulatoryAction(input);
  if (r.status === 'duplicate' || input.action_type !== 'suspension') return { ...r, news: null };
  const key = await dedupeKey('regulatory', input.action_key, r.action_id);
  const news = newsBase('SUSPENSION_POSTED', {
    key, boutId: input.bout_id ?? null, eventId: null, fighterIds: [input.fighter_id], sourceKey: input.source_key, sourceUrl: input.source_url,
    now, review: true, observedKey: `regulatory_action:${r.action_id}`,
    facts: { action_type: input.action_type, status: input.status, commission_slug: input.commission_slug ?? null,
      effective_from: input.effective_from ?? null, effective_to: input.effective_to ?? null, reason_public: input.reason_public ?? null,
      revision_of: r.superseded_action_id ?? null },
  });
  const emitted = await store.emitNewsEvent(news);
  return { ...r, news: { ...news, id: emitted.id, inserted: emitted.inserted } };
}
