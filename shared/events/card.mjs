// Card documents: the structured, source-native form of one event card as
// published by an approved source (promoter, commission, broadcaster feed).
//
//   { source_key, namespace, external_id, name, event_date, start_at?, status?, source_url?,
//     commission?: { slug, name, jurisdiction?, country_code? },
//     venue?: { name, city?, region?, country_code? },
//     organizations?: [{ slug, name?, kind?, role }], organizations_complete?: bool,
//     bouts: [{ external_id?, bout_order?, card_segment?, weight_class_key?, contracted_weight_lb?,
//               scheduled_rounds?, round_minutes?, status?,
//               fighter_a: { external_id?, display_name, dob?, nationality? }, fighter_b: {...},
//               titles?: [{ organization_slug, tier, gender?, source_native_label?, eligible_side?: 'a'|'b' }],
//               officials?: [{ role, slot?, display_name, external_id?, country_code? }], officials_complete?: bool }] }
//
// Rules:
//   * absence is not cancellation: a bout missing from a partial card is left
//     alone; only an explicit status changes it
//   * a replacement is detected only for a bout matched by its external id
//     (without one, a new pairing is a new bout and is flagged for review)
//   * a `titles` array, when present, is the complete list of belts at stake
//   * every change is applied AND appended to boxing_card_changes, and emits
//     at most one structured news event

import { contentHash, dedupeKey } from '../canonical.mjs';
import { ingestIdentity } from '../identity/pipeline.mjs';
import { ingestOfficial } from './officials.mjs';
import { normalizedAlias } from '../identity/normalize.mjs';

const ACTIVE = new Set(['scheduled', 'confirmed']);

export function validateCardDocument(doc) {
  const problems = [];
  for (const k of ['source_key', 'namespace', 'external_id', 'name']) if (!doc?.[k]) problems.push(`missing ${k}`);
  if (doc?.event_date && !/^\d{4}-\d{2}-\d{2}$/.test(doc.event_date)) problems.push('event_date must be YYYY-MM-DD');
  if (!Array.isArray(doc?.bouts)) problems.push('bouts must be an array');
  for (const [i, b] of (doc?.bouts ?? []).entries()) {
    if (!b.fighter_a?.display_name || !b.fighter_b?.display_name) problems.push(`bout ${i}: both fighters need a display_name`);
    if (b.scheduled_rounds != null && !(Number.isInteger(b.scheduled_rounds) && b.scheduled_rounds >= 1 && b.scheduled_rounds <= 45)) problems.push(`bout ${i}: scheduled_rounds out of range`);
    for (const t of b.titles ?? []) if (!t.organization_slug || !t.tier) problems.push(`bout ${i}: title needs organization_slug and tier`);
  }
  return problems;
}

const same = (a, b) => (a ?? null) === (b ?? null) || (a != null && b != null && String(a) === String(b));

// state: boxing_card_state(); doc: resolved card (fighter/title/official ids).
export function diffCard(state, doc) {
  const changes = [];
  const add = (change_type, boutRef, before_state, after_state, extra = {}) => changes.push({ change_type, bout_ref: boutRef, before_state, after_state, ...extra });

  // ---- event
  if (!state.existed) add('event_announced', null, null, { name: doc.name, event_date: doc.event_date, start_at: doc.start_at ?? null });
  if (state.existed && doc.event_date && (!same(doc.event_date, state.event_date) || (doc.start_at && !same(new Date(doc.start_at).toISOString(), state.start_at && new Date(state.start_at).toISOString())))) {
    const later = Date.parse(doc.start_at ?? doc.event_date) > Date.parse(state.start_at ?? state.event_date);
    add(later ? 'event_postponed' : 'event_date_changed', null,
      { event_date: state.event_date, start_at: state.start_at },
      { event_date: doc.event_date, start_at: doc.start_at ?? null, status: doc.status ?? state.status });
  }
  if (state.existed && doc.status && doc.status !== state.status) {
    add(doc.status === 'cancelled' ? 'event_cancelled' : 'event_status_changed', null, { status: state.status }, { status: doc.status });
  }
  if (doc.venue_id && doc.venue_id !== state.venue_id) add('venue_changed', null, { venue_id: state.venue_id }, { venue_id: doc.venue_id });
  if (doc.commission_id && doc.commission_id !== state.commission_id) {
    add('commission_changed', null, { commission_id: state.commission_id, commission_slug: state.commission_slug }, { commission_id: doc.commission_id, commission_slug: doc.commission?.slug });
  }
  const stateRoles = new Set((state.organizations ?? []).map((o) => `${o.organization_id}|${o.role}`));
  const docRoles = new Set((doc.resolvedOrganizations ?? []).map((o) => `${o.organization_id}|${o.role}`));
  for (const o of doc.resolvedOrganizations ?? []) {
    if (!stateRoles.has(`${o.organization_id}|${o.role}`)) add('organization_role_added', null, null, { organization_id: o.organization_id, slug: o.slug, role: o.role });
  }
  if (doc.organizations_complete) {
    for (const o of state.organizations ?? []) {
      if (!docRoles.has(`${o.organization_id}|${o.role}`)) add('organization_role_removed', null, { organization_id: o.organization_id, slug: o.slug, role: o.role }, { organization_id: o.organization_id, role: o.role });
    }
  }

  // ---- bouts
  const review = [];
  const claimed = new Set();
  for (const b of doc.bouts) {
    if (!b.resolved) continue;
    const { a: fa, b: fb } = b.resolved;
    const byExternal = b.external_id ? state.bouts.find((s) => s.external_ids.includes(`${doc.namespace}.bout:${b.external_id}`)) : null;
    // pair matching never reuses a bout that carries a DIFFERENT external id from this
    // source, or one already claimed by another bout in this document (repeat pairings)
    const byPair = byExternal ? null : state.bouts.find((s) => {
      if (claimed.has(s.bout_id)) return false;
      if (b.external_id && s.external_ids.some((x) => x.startsWith(`${doc.namespace}.bout:`))) return false;
      const active = s.participants.filter((p) => ACTIVE.has(p.status)).map((p) => p.fighter_id).sort();
      return active.length === 2 && active.join() === [fa, fb].sort().join();
    });
    const sb = byExternal ?? byPair;
    if (sb) claimed.add(sb.bout_id);
    const ref = b.external_id ? `ext:${b.external_id}` : `pair:${[fa, fb].sort().join('|')}`;

    if (!sb) {
      add('bout_added', ref, null, {
        fighter_a_id: fa, fighter_b_id: fb, weight_class_key: b.weight_class_key ?? null, contracted_weight_lb: b.contracted_weight_lb ?? null,
        is_catchweight: b.is_catchweight ?? null, scheduled_rounds: b.scheduled_rounds ?? null, round_minutes: b.round_minutes ?? null,
        bout_order: b.bout_order ?? null, card_segment: b.card_segment ?? null, status: b.status ?? 'scheduled', external_id: b.external_id ?? null,
      });
      for (const t of b.resolvedTitles ?? []) add('title_added', ref, null, { title_id: t.title_id, eligible_fighter_id: t.eligible_fighter_id ?? null });
      for (const o of b.resolvedOfficials ?? []) add('official_assigned', ref, null, { official_id: o.official_id, role: o.role, slot: o.slot ?? null });
      if (!b.external_id) {
        const overlapping = state.bouts.filter((s) => s.participants.some((p) => ACTIVE.has(p.status) && [fa, fb].includes(p.fighter_id)) && !['cancelled', 'complete'].includes(s.status));
        if (overlapping.length) review.push({ reason: 'possible_replacement_without_external_id', bout_ref: ref, existing_bout_ids: overlapping.map((s) => s.bout_id) });
      }
      continue;
    }

    const boutRef = sb.bout_id;
    const active = sb.participants.filter((p) => ACTIVE.has(p.status));
    const activeIds = active.map((p) => p.fighter_id);
    const incoming = [fa, fb].filter((id) => !activeIds.includes(id));
    const outgoing = active.filter((p) => ![fa, fb].includes(p.fighter_id));
    if (incoming.length && byExternal) {
      incoming.forEach((newId, i) => {
        const old = outgoing[i];
        if (old) add('opponent_replaced', boutRef, { fighter_id: old.fighter_id, side: old.side, display_name: old.display_name }, { fighter_id: newId, side: old.side });
      });
    }

    if (b.status && b.status !== sb.status) {
      const type = b.status === 'cancelled' ? 'bout_cancelled' : b.status === 'postponed' ? 'bout_postponed' : 'bout_status_changed';
      add(type, boutRef, { status: sb.status }, { status: b.status });
    }
    if (b.bout_order != null && !same(b.bout_order, sb.bout_order)) add('card_order_changed', boutRef, { bout_order: sb.bout_order }, { bout_order: b.bout_order });
    if (b.card_segment && b.card_segment !== sb.card_segment) add('card_segment_changed', boutRef, { card_segment: sb.card_segment }, { card_segment: b.card_segment });
    if (b.scheduled_rounds != null && !same(b.scheduled_rounds, sb.scheduled_rounds)) add('scheduled_rounds_changed', boutRef, { scheduled_rounds: sb.scheduled_rounds }, { scheduled_rounds: b.scheduled_rounds });
    if (b.contracted_weight_lb != null && Number(b.contracted_weight_lb) !== Number(sb.contracted_weight_lb)) {
      add('contracted_weight_changed', boutRef, { contracted_weight_lb: sb.contracted_weight_lb, is_catchweight: sb.is_catchweight },
        { contracted_weight_lb: b.contracted_weight_lb, is_catchweight: b.is_catchweight ?? null });
    }
    if (b.weight_class_key && b.weight_class_key !== sb.weight_class_key) add('weight_class_changed', boutRef, { weight_class_key: sb.weight_class_key }, { weight_class_key: b.weight_class_key });

    if (Array.isArray(b.resolvedTitles)) {
      const atStake = new Map(sb.titles.filter((t) => t.at_stake).map((t) => [t.title_id, t]));
      const docTitles = new Map(b.resolvedTitles.map((t) => [t.title_id, t]));
      for (const [id, t] of docTitles) {
        if (!atStake.has(id)) add('title_added', boutRef, null, { title_id: id, eligible_fighter_id: t.eligible_fighter_id ?? null });
        else if ((t.eligible_fighter_id ?? null) !== (atStake.get(id).eligible_fighter_id ?? null)) {
          add('title_eligibility_changed', boutRef, { title_id: id, eligible_fighter_id: atStake.get(id).eligible_fighter_id }, { title_id: id, eligible_fighter_id: t.eligible_fighter_id ?? null });
        }
      }
      for (const [id] of atStake) if (!docTitles.has(id)) add('title_removed', boutRef, { title_id: id, at_stake: true }, { title_id: id, at_stake: false });
    }

    if (Array.isArray(b.resolvedOfficials)) {
      const current = sb.officials.filter((o) => ['assigned', 'worked'].includes(o.state));
      for (const o of b.resolvedOfficials) {
        const slotKey = (x) => `${x.role}|${x.slot ?? ''}`;
        const occupant = current.find((c) => slotKey(c) === slotKey(o));
        if (occupant?.official_id === o.official_id) continue;
        if (current.some((c) => c.official_id === o.official_id && c.role === o.role)) continue;
        if (occupant) add('official_replaced', boutRef, { official_id: occupant.official_id, role: occupant.role, slot: occupant.slot, display_name: occupant.display_name }, { official_id: o.official_id, role: o.role, slot: o.slot ?? null });
        else add('official_assigned', boutRef, null, { official_id: o.official_id, role: o.role, slot: o.slot ?? null });
      }
      if (b.officials_complete) {
        for (const c of current) {
          if (!b.resolvedOfficials.some((o) => o.official_id === c.official_id && o.role === c.role)) {
            add('official_removed', boutRef, { official_id: c.official_id, role: c.role, slot: c.slot }, { official_id: c.official_id, role: c.role, state: 'withdrawn' });
          }
        }
      }
    }
  }
  return { changes, review };
}

const NEWS = {
  event_announced: 'EVENT_ADDED',
  event_date_changed: 'EVENT_CHANGED',
  event_status_changed: 'EVENT_CHANGED',
  bout_added: 'FIGHT_ANNOUNCED',
  opponent_replaced: 'OPPONENT_REPLACED',
  bout_cancelled: 'FIGHT_CANCELLED',
  bout_postponed: 'FIGHT_POSTPONED',
  event_postponed: 'EVENT_POSTPONED',
  event_cancelled: 'EVENT_CANCELLED',
  venue_changed: 'VENUE_CHANGED',
  title_removed: 'TITLE_STATUS_CHANGED',
  title_eligibility_changed: 'TITLE_STATUS_CHANGED',
};

export async function applyCardDocument(store, doc, { now = new Date().toISOString() } = {}) {
  const problems = validateCardDocument(doc);
  if (problems.length) return { status: 'rejected', problems };
  const src = await store.source(doc.source_key);
  if (!src) return { status: 'rejected', problems: [`source ${doc.source_key} not registered`] };

  const observation = await store.recordObservation({
    source_key: doc.source_key, entity_type: 'event_card', external_key: `${doc.namespace}:${doc.external_id}`,
    payload: doc, content_hash: await contentHash(doc), source_url: doc.source_url ?? null,
  });

  const ev = await store.upsertEvent({ source_key: doc.source_key, namespace: `${doc.namespace}.event`, external_id: doc.external_id,
    name: doc.name, event_date: doc.event_date ?? null, start_at: doc.start_at ?? null, status: doc.status ?? 'scheduled', source_url: doc.source_url ?? null });
  const eventId = ev.event_id;
  const state = { ...(await store.cardState(eventId)), existed: !ev.created };
  if (ev.created) {
    // freshly created rows already hold the announced values: diff against them, not against nothing
    Object.assign(state, { event_date: doc.event_date ?? null, start_at: doc.start_at ?? null, status: doc.status ?? 'scheduled' });
  }

  const resolved = { ...doc, bouts: [] };
  if (doc.commission) resolved.commission_id = await store.ensureCommission({ ...doc.commission, source_key: doc.source_key, source_url: doc.source_url ?? null });
  if (doc.venue) resolved.venue_id = await store.ensureVenue({ ...doc.venue, source_key: doc.source_key, source_url: doc.source_url ?? null });
  resolved.resolvedOrganizations = [];
  for (const o of doc.organizations ?? []) {
    resolved.resolvedOrganizations.push({ ...o, organization_id: await store.ensureOrganization({ ...o, source_key: doc.source_key, source_url: doc.source_url ?? null }) });
  }

  const unresolved = [];
  const officialsInDocument = new Map();
  const fightersInDocument = new Map();
  for (const b of doc.bouts) {
    const corners = {};
    for (const side of ['a', 'b']) {
      const f = b[`fighter_${side}`];
      // within ONE card document, the same external id, or the same name with the same
      // stated hometown, is the same boxer (repeat pairings); across documents the
      // resolver decides as always
      const docKey = f.external_id ? `id:${f.external_id}` : f.hometown ? `name:${normalizedAlias(f.display_name)}|${normalizedAlias(f.hometown)}` : null;
      const cached = docKey ? fightersInDocument.get(docKey) : null;
      const { result } = cached ?? await ingestIdentity(store, {
        sourceKey: doc.source_key, accessMode: src.access_mode, namespace: `${doc.namespace}.fighter`,
        record: { external_id: f.external_id ?? null, display_name: f.display_name, dob: f.dob ?? null, nationality: f.nationality ?? [], hometown: f.hometown ?? null },
        payload: { event: doc.external_id, bout: b.external_id ?? null, side, ...f },
      });
      if (docKey && !cached && ['matched', 'created'].includes(result.outcome)) fightersInDocument.set(docKey, { result });
      if (['matched', 'created'].includes(result.outcome)) corners[side] = result.fighter_id;
      else unresolved.push({ bout: b.external_id ?? null, side, name: f.display_name, outcome: result.outcome, reason: result.reason, review_item_id: result.review_item_id ?? null });
    }
    const rb = { ...b };
    if (corners.a && corners.b && corners.a !== corners.b) {
      rb.resolved = corners;
      if (Array.isArray(b.titles)) {
        rb.resolvedTitles = [];
        for (const t of b.titles) {
          rb.resolvedTitles.push({
            title_id: await store.ensureTitle({ organizationSlug: t.organization_slug, weightClassKey: t.weight_class_key ?? b.weight_class_key,
              gender: t.gender ?? 'male', tier: t.tier, sourceNativeLabel: t.source_native_label ?? null }),
            eligible_fighter_id: t.eligible_side ? corners[t.eligible_side] : null,
          });
        }
      }
      if (Array.isArray(b.officials)) {
        rb.resolvedOfficials = [];
        for (const o of b.officials) {
          // within ONE card document the same official name is the same person (assignments are written after resolution)
          const cacheKey = `${o.role === 'referee' ? 'referee' : 'judge'}|${o.external_id ?? normalizedAlias(o.display_name)}`;
          const { result } = officialsInDocument.get(cacheKey) ?? await ingestOfficial(store, { sourceKey: doc.source_key, namespace: `${doc.namespace}.official`,
            official: { ...o, official_type: o.role === 'referee' ? 'referee' : 'judge' }, commissionId: resolved.commission_id ?? state.commission_id ?? null,
            commissionAuthoritative: doc.officials_authority === 'commission' });
          if (result.official_id) officialsInDocument.set(cacheKey, { result });
          if (result.official_id) rb.resolvedOfficials.push({ official_id: result.official_id, role: o.role, slot: o.slot ?? null });
          else unresolved.push({ bout: b.external_id ?? null, official: o.display_name, outcome: 'review', review_item_id: result.review_item_id ?? null });
        }
        if (rb.resolvedOfficials.length !== b.officials.length) rb.officials_complete = false;
      }
    }
    resolved.bouts.push(rb);
  }

  const { changes, review } = diffCard(state, resolved);
  const boutIds = new Map();
  const applied = [];
  const news = [];
  for (const c of changes) {
    let boutId = c.bout_ref && !String(c.bout_ref).startsWith('ext:') && !String(c.bout_ref).startsWith('pair:') ? c.bout_ref : boutIds.get(c.bout_ref) ?? null;
    if (c.change_type === 'bout_added') {
      boutId = await store.addBout({ source_key: doc.source_key, event_id: eventId, source_url: doc.source_url ?? null,
        ...c.after_state, external_namespace: c.after_state.external_id ? `${doc.namespace}.bout` : null });
      boutIds.set(c.bout_ref, boutId);
    }
    const changeKey = await dedupeKey('card_change', eventId, c.change_type === 'bout_added' ? c.bout_ref : boutId, c.change_type, c.before_state, c.after_state);
    const r = await store.applyCardChange({
      source_key: doc.source_key, event_id: eventId, bout_id: boutId, change_type: c.change_type, before_state: c.before_state,
      after_state: c.after_state, effective_at: now, source_url: doc.source_url ?? null, observation_id: observation.id, change_key: changeKey,
    });
    if (!r.applied) continue;
    applied.push({ ...c, bout_id: boutId, change_id: r.change_id });

    const newsType = NEWS[c.change_type] ?? (['official_assigned', 'official_replaced'].includes(c.change_type) ? 'OFFICIALS_ASSIGNED' : null);
    if (!newsType || (newsType === 'OFFICIALS_ASSIGNED' && news.some((n) => n.event_type === 'OFFICIALS_ASSIGNED' && n.bout_id === boutId))) continue;
    const fighters = c.change_type === 'bout_added' ? [c.after_state.fighter_a_id, c.after_state.fighter_b_id]
      : c.change_type === 'opponent_replaced' ? [c.before_state.fighter_id, c.after_state.fighter_id] : [];
    const event = {
      contract_version: '1.1.0',
      event_type: newsType,
      dedupe_key: `card_change:${changeKey.split(':')[1]}`,
      bout_id: boutId, event_id: eventId, fighter_ids: fighters.filter(Boolean),
      source_key: doc.source_key, occurred_at: now, detected_at: now, confidence: 100,
      requires_human_review: ['title_eligibility_changed', 'title_removed'].includes(c.change_type),
      payload: { facts: { event: { id: eventId, name: doc.name, event_date: doc.event_date ?? null }, change_type: c.change_type,
        before: c.before_state, after: c.after_state, card_change_id: r.change_id } },
      sources: [{ source_key: doc.source_key, source_url: doc.source_url ?? null, observed_at: now, observation_id: observation.id, external_key: `card_change:${r.change_id}` }],
    };
    const emitted = await store.emitNewsEvent(event);
    news.push({ ...event, id: emitted.id, inserted: emitted.inserted });
  }

  return { status: 'applied', event_id: eventId, event_created: ev.created, changes: applied, news, unresolved, review, observation_id: observation.id };
}
