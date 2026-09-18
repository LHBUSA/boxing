// Upcoming bout-card observation contract for APPROVED first-party promoter /
// event sources. No promoter source is approved today (review 2026-09-13,
// docs/BOXING_SOURCE_ACQUISITION.md section G); this contract exists so an
// adapter can be added the day one is, without inventing a second path.
//
// Observation:
//   { source_key, source_event_id, event_name, scheduled_date (YYYY-MM-DD), scheduled_start_at?,
//     venue: { name, city, region?, country_code? }, jurisdiction?, broadcaster?, source_url,
//     announced_at?, updated_at?, captured_at, status: announced|scheduled|postponed|cancelled|complete,
//     bouts: [{ source_bout_id, fighter_a: { source_id?, name }, fighter_b: {...},
//               division?, contracted_weight_lb?, scheduled_rounds?, titles?: [{ organization_slug, tier, source_native_label }],
//               status: announced|scheduled|replaced|cancelled|postponed|complete, bout_order?, card_segment? }] }
//
// Rules:
//   * an event schedule alone is never a bout: bouts come only from explicit pairings
//   * participants go through the identity resolver like every other source
//     (card.mjs); a promoter name is an observation, never an identity decision
//   * a replacement is the SAME source bout id with a new opponent: the prior
//     pairing is kept as a 'replaced' participant, never erased
//   * titles only when explicitly stated; no inference from event names
//   * the event attaches to an existing commission event only on the same date
//     in the same venue city with one candidate; commission event facts win

import { assertMinimized } from '../commissions/minimize.mjs';
import { isPlaceholderName } from './names.mjs';

export const UPCOMING_EVENT_STATUSES = Object.freeze(['announced', 'scheduled', 'postponed', 'cancelled', 'complete']);
export const UPCOMING_BOUT_STATUSES = Object.freeze(['announced', 'scheduled', 'replaced', 'cancelled', 'postponed', 'complete']);

export function validateUpcomingCard(obs) {
  const problems = [];
  for (const k of ['source_key', 'source_event_id', 'event_name', 'scheduled_date', 'source_url', 'captured_at', 'status']) if (!obs?.[k]) problems.push(`missing ${k}`);
  if (obs?.scheduled_date && !/^\d{4}-\d{2}-\d{2}$/.test(obs.scheduled_date)) problems.push('scheduled_date must be YYYY-MM-DD');
  if (obs?.status && !UPCOMING_EVENT_STATUSES.includes(obs.status)) problems.push(`event status ${obs.status} not allowed`);
  if (obs?.source_url && !/^https:\/\//.test(obs.source_url)) problems.push('source_url must be https');
  for (const [i, b] of (obs?.bouts ?? []).entries()) {
    if (!b.source_bout_id) problems.push(`bout ${i}: missing source_bout_id`);
    // an announced slot is not a name: an adapter must drop the bout, never pass "TBC" down as a fighter
    if (!b.fighter_a?.name || !b.fighter_b?.name) problems.push(`bout ${i}: both fighters must be named explicitly`);
    else if (isPlaceholderName(b.fighter_a.name) || isPlaceholderName(b.fighter_b.name)) problems.push(`bout ${i}: an unannounced opponent is not a fighter`);
    if (b.status && !UPCOMING_BOUT_STATUSES.includes(b.status)) problems.push(`bout ${i}: status ${b.status} not allowed`);
    for (const t of b.titles ?? []) if (!t.organization_slug || !t.tier || !t.source_native_label) problems.push(`bout ${i}: a title needs organization, tier and the source's own label`);
  }
  return problems;
}

// -> card document for applyCardDocument (namespace is the source's registry namespace)
export function upcomingCardDocument(obs, { namespace }) {
  const problems = validateUpcomingCard(obs);
  if (problems.length) throw new Error(`invalid upcoming card: ${problems.join('; ')}`);
  return assertMinimized({
    source_key: obs.source_key, namespace, external_id: obs.source_event_id, name: obs.event_name,
    event_date: obs.scheduled_date, start_at: obs.scheduled_start_at ?? null, status: obs.status === 'announced' ? 'announced' : obs.status,
    source_url: obs.source_url, cross_source_events: true,
    ...(obs.venue?.name ? { venue: { name: obs.venue.name, city: obs.venue.city ?? null, region: obs.venue.region ?? null, country_code: obs.venue.country_code ?? null } } : {}),
    observed: { announced_at: obs.announced_at ?? null, updated_at: obs.updated_at ?? null, captured_at: obs.captured_at, broadcaster: obs.broadcaster ?? null, jurisdiction: obs.jurisdiction ?? null },
    bouts: (obs.bouts ?? []).map((b) => ({
      external_id: b.source_bout_id, bout_order: b.bout_order ?? null, card_segment: b.card_segment ?? null,
      weight_class_key: b.division ?? null, contracted_weight_lb: b.contracted_weight_lb ?? null, scheduled_rounds: b.scheduled_rounds ?? null,
      status: b.status === 'replaced' ? 'scheduled' : (b.status ?? 'scheduled'),
      fighter_a: { external_id: b.fighter_a.source_id ?? null, display_name: b.fighter_a.name },
      fighter_b: { external_id: b.fighter_b.source_id ?? null, display_name: b.fighter_b.name },
      ...(Array.isArray(b.titles) ? { titles: b.titles.map((t) => ({ organization_slug: t.organization_slug, tier: t.tier, source_native_label: t.source_native_label })) } : {}),
    })),
  });
}
