// Newsroom pipeline for one structured news event:
//   context -> immutable fact block -> template article -> validator -> state -> store
//
// State decision (fail closed):
//   validator problems                         -> rejected (kept for inspection, never publishable)
//   any review reason (sensitive type, correction, unresolved identity,
//   conflicting sources, low confidence, unverified reading, source without
//   display rights, news event flagged)        -> review_required
//   otherwise                                  -> approved (still not published)
// Publication is a separate, explicit step.

import { BUILDER_VERSION, FactBlockError, buildFactBlock } from './fact-block.mjs';
import { GENERATOR_VERSION, generateArticle, slugFor } from './templates.mjs';
import { VALIDATOR_VERSION, validateArticle } from './validate.mjs';

export async function processNewsEvent(store, newsEventId) {
  const ctx = await store.newsContext(newsEventId);
  if (!ctx?.news_event) return { status: 'missing' };

  let built;
  try {
    built = await buildFactBlock(ctx);
  } catch (err) {
    if (err instanceof FactBlockError) {
      await store.setNewsEventState(newsEventId, 'needs_review');
      return { status: 'blocked', reason: err.reason, detail: err.message };
    }
    throw err;
  }
  const { block, hash } = built;
  const draft = generateArticle(block);
  if (!draft.ok) {
    await store.setNewsEventState(newsEventId, 'skipped');
    return { status: 'not_generated', reason: draft.reason, fact_block_hash: hash };
  }

  const validation = validateArticle(draft, block);
  const reviewReasons = [...block.review_reasons];
  const state = !validation.ok ? 'rejected' : reviewReasons.length ? 'review_required' : 'approved';
  const modelVersions = Object.fromEntries(block.facts.filter((f) => f.label === 'pbe_derived').map((f) => [f.topic, f.version]));

  const stored = await store.storeArticle({
    news_event_id: newsEventId,
    fact_block: block,
    fact_block_hash: hash,
    builder_version: BUILDER_VERSION,
    sensitivity: block.sensitivity,
    review_reasons: reviewReasons,
    slug: slugFor(block, draft.headline),
    headline: draft.headline,
    dek: draft.dek,
    body_md: draft.body_md,
    claims: draft.sentences,
    sources: block.sources,
    generator_version: GENERATOR_VERSION,
    validator_version: VALIDATOR_VERSION,
    model_versions: modelVersions,
    validation,
    state,
    event_type: block.news_event.event_type,
  });
  return { status: stored.status, article_id: stored.article_id, state: stored.status === 'duplicate' ? null : state, validation, review_reasons: reviewReasons, superseded_article_id: stored.superseded_article_id ?? null, block };
}

export async function processPending(store, { limit = 25 } = {}) {
  const pending = await store.pendingNewsEvents(limit);
  const results = [];
  for (const ev of pending) results.push({ news_event_id: ev.id, event_type: ev.event_type, ...(await processNewsEvent(store, ev.id)) });
  return results;
}
