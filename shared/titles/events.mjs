// Title event recording and news emission.

import { dedupeKey } from '../canonical.mjs';

const NEWS_TYPE = {
  won: 'TITLE_WON', awarded: 'TITLE_WON', elevated: 'TITLE_WON',
  vacated: 'TITLE_VACATED', relinquished: 'TITLE_VACATED',
  stripped: 'TITLE_STRIPPED',
  lost: 'TITLE_STATUS_CHANGED', downgraded: 'TITLE_STATUS_CHANGED', status_changed: 'TITLE_STATUS_CHANGED',
  reinstated: 'TITLE_STATUS_CHANGED', retraction: 'TITLE_STATUS_CHANGED',
  defended: null,
};

// The fact identity of a title event deliberately excludes the source: the
// same fact reported by a second source supports the existing event instead
// of creating a duplicate reign change.
export async function titleEventKey(ev) {
  return dedupeKey('title_event', ev.title_id, ev.event_type, ev.fighter_id ?? null, ev.effective_on, ev.bout_id ?? null, ev.supersedes_id ?? null);
}

// ev: { title_id, event_type, fighter_id?, effective_on, sequence?, bout_id?, source_native_status?,
//       reason_public?, source_key, source_url?, supersedes_id?, observation?: {entity_type, external_key, payload, content_hash} }
export async function recordTitleEvent(store, ev, { now = new Date().toISOString() } = {}) {
  const eventKey = await titleEventKey(ev);
  const r = await store.recordTitleEvent({ ...ev, event_key: eventKey });
  const newsType = NEWS_TYPE[ev.event_type];
  if (!r.inserted || !newsType) return { ...r, event_key: eventKey, news: null };

  const title = await store.titleSummary(ev.title_id);
  const superseded = ev.supersedes_id ? await store.titleEventById(ev.supersedes_id) : null;
  const news = {
    contract_version: '1.1.0',
    event_type: newsType,
    dedupe_key: `title_event:${eventKey.split(':')[1]}`,
    supersedes_dedupe_key: superseded ? `title_event:${superseded.event_key.split(':')[1]}` : null,
    fighter_ids: ev.fighter_id ? [ev.fighter_id] : [],
    bout_id: ev.bout_id ?? null,
    organization_id: title.organization_id,
    source_key: ev.source_key,
    occurred_at: `${ev.effective_on}T00:00:00Z`,
    detected_at: now,
    confidence: 100,
    // corrections, retractions and non-bout changes to a champion's status get a human look
    requires_human_review: Boolean(ev.supersedes_id) || ['stripped', 'retraction', 'downgraded'].includes(ev.event_type),
    payload: {
      facts: {
        title: { id: title.id, public_id: title.public_id, organization: title.organization_slug, tier: title.tier,
          source_native_label: title.source_native_label, weight_class_key: title.weight_class_key, gender_scope: title.gender_scope },
        title_event_id: r.id,
        title_event_type: ev.event_type,
        effective_on: ev.effective_on,
        fighter_id: ev.fighter_id ?? null,
        bout_id: ev.bout_id ?? null,
        source_native_status: ev.source_native_status ?? null,
        reason_public: ev.reason_public ?? null,
        corrects_title_event_id: ev.supersedes_id ?? null,
      },
    },
    sources: [{ source_key: ev.source_key, source_url: ev.source_url ?? null, observed_at: now, external_key: `title_event:${r.id}` }],
  };
  const emitted = await store.emitNewsEvent(news);
  return { ...r, event_key: eventKey, news: { ...news, id: emitted.id, inserted: emitted.inserted } };
}
