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
import { activeOccupant, ingestOfficial, slotContinuity } from './officials.mjs';
import { normalizedAlias } from '../identity/normalize.mjs';
import { resolveAndRecordAppearance } from '../identity/appearance.mjs';
import { laneRefusal } from './rights.mjs';

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
  // a first-party card attached to an event a commission owns never rewrites the
  // commission's event-level facts: disagreements are surfaced, not collapsed
  const disagreements = [];
  if (state.defer_event_fields) {
    if (doc.event_date && !same(doc.event_date, state.event_date)) disagreements.push({ field: 'event_date', owner: state.event_date, source: doc.event_date });
    if (doc.status && doc.status !== state.status) disagreements.push({ field: 'status', owner: state.status, source: doc.status });
    if (doc.venue_id && state.venue_id && doc.venue_id !== state.venue_id) disagreements.push({ field: 'venue_id', owner: state.venue_id, source: doc.venue_id });
    if (doc.commission_id && state.commission_id && doc.commission_id !== state.commission_id) disagreements.push({ field: 'commission_id', owner: state.commission_id, source: doc.commission_id });
  }
  const eventFields = !state.defer_event_fields;
  if (!state.existed) add('event_announced', null, null, { name: doc.name, event_date: doc.event_date, start_at: doc.start_at ?? null });
  if (eventFields && state.existed && doc.event_date && (!same(doc.event_date, state.event_date) || (doc.start_at && !same(new Date(doc.start_at).toISOString(), state.start_at && new Date(state.start_at).toISOString())))) {
    const later = Date.parse(doc.start_at ?? doc.event_date) > Date.parse(state.start_at ?? state.event_date);
    add(later ? 'event_postponed' : 'event_date_changed', null,
      { event_date: state.event_date, start_at: state.start_at },
      { event_date: doc.event_date, start_at: doc.start_at ?? null, status: doc.status ?? state.status });
  }
  if (eventFields && state.existed && doc.status && doc.status !== state.status) {
    add(doc.status === 'cancelled' ? 'event_cancelled' : 'event_status_changed', null, { status: state.status }, { status: doc.status });
  }
  if (eventFields && doc.venue_id && doc.venue_id !== state.venue_id) add('venue_changed', null, { venue_id: state.venue_id }, { venue_id: doc.venue_id });
  if (eventFields && doc.commission_id && doc.commission_id !== state.commission_id) {
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
  const review = disagreements.map((d) => ({ reason: 'event_field_disagreement', ...d }));
  const claimed = new Set();
  const matches = [];
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
    if (sb && b.external_id) matches.push({ external_id: b.external_id, bout_id: sb.bout_id, matched_by: byExternal ? 'external_id' : 'pair' });
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
    // a source that explicitly contradicts its own class label clears a class set from that label earlier
    else if (b.weight_class_contradicted === true && sb.weight_class_key) add('weight_class_changed', boutRef, { weight_class_key: sb.weight_class_key }, { weight_class_key: null, reason: 'label_contradicts_contracted_weight' });

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
  return { changes, review, matches };
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

// graphResolve: false reuses recorded appearance bindings (human or resolver) but lets the graph
// resolver make no new decision; used to apply a human review batch with no side effects.
export async function applyCardDocument(store, doc, { now = new Date().toISOString(), graphResolve = true } = {}) {
  const problems = validateCardDocument(doc);
  if (problems.length) return { status: 'rejected', problems };
  const src = await store.source(doc.source_key);
  if (!src) return { status: 'rejected', problems: [`source ${doc.source_key} not registered`] };

  const observation = await store.recordObservation({
    source_key: doc.source_key, entity_type: 'event_card', external_key: `${doc.namespace}:${doc.external_id}`,
    payload: doc, content_hash: await contentHash(doc), source_url: doc.source_url ?? null,
  });

  // a first-party card for an event another source already holds: attach only on the
  // same date in the same venue city with exactly one candidate; otherwise a separate event
  let crossSource = null;
  if (doc.cross_source_events === true && doc.event_date && doc.venue?.city && store.eventCrossSourceCandidates) {
    const known = await store.sourceEventIds(`${doc.namespace}.event`, [doc.external_id]);
    if (!known[doc.external_id]) {
      const cands = await store.eventCrossSourceCandidates({ event_date: doc.event_date, city: doc.venue.city, namespace: `${doc.namespace}.event` });
      const sameDay = cands.filter((c) => Number(c.date_gap_days) === 0);
      if (cands.length === 1 && sameDay.length === 1) {
        const r = await store.attachEventIdentity({ event_id: sameDay[0].event_id, namespace: `${doc.namespace}.event`, external_id: doc.external_id,
          source_key: doc.source_key, confidence: 80, evidence: { method: 'same_date_same_venue_city_single_candidate', candidate: sameDay[0], venue: doc.venue } });
        crossSource = { status: r.status, event_id: r.event_id, owner_source_key: sameDay[0].owner_source_key };
      } else if (cands.length) {
        crossSource = { status: 'not_attached', reason: sameDay.length > 1 ? 'more_than_one_same_day_event' : cands.length > 1 ? 'more_than_one_candidate' : 'date_disagreement',
          candidates: cands.map((c) => ({ event_id: c.event_id, event_date: c.event_date, owner_source_key: c.owner_source_key })) };
      }
    }
  }
  const ev = await store.upsertEvent({ source_key: doc.source_key, namespace: `${doc.namespace}.event`, external_id: doc.external_id,
    name: doc.name, event_date: doc.event_date ?? null, start_at: doc.start_at ?? null, status: doc.status ?? 'scheduled', source_url: doc.source_url ?? null,
    // a declared naming rule lets the owning source correct a stored derived name (audited in boxing_event_name_revisions)
    ...(doc.name_rule ? { name_rule: doc.name_rule } : {}) });
  const eventId = ev.event_id;
  const state = { ...(await store.cardState(eventId)), existed: !ev.created };
  if (doc.cross_source_events === true && !ev.created && store.eventOwner) {
    const owner = await store.eventOwner(eventId);
    state.defer_event_fields = Boolean(owner && owner.source_key !== doc.source_key && owner.source_kind === 'commission');
  }
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
  const officialContinuity = [];
  const officialsInDocument = new Map();
  const fightersInDocument = new Map();
  const fighterNamespace = `${doc.namespace}.fighter`;
  // official sheets carry per-corner context (weight, debut): unresolved corners get
  // career-graph resolution, and every recorded appearance binding is reused first
  const graphEnabled = doc.identity_graph === true;
  const graphKeys = graphEnabled ? doc.bouts.filter((b) => b.external_id).flatMap((b) => [`${b.external_id}|a`, `${b.external_id}|b`]) : [];
  const bindings = graphKeys.length ? await store.appearanceBindings(fighterNamespace, graphKeys) : {};
  const identityGraph = { bindings_used: 0, decisions: {} };
  const docKeyOf = (f) => (f.external_id ? `id:${f.external_id}` : f.hometown ? `name:${normalizedAlias(f.display_name)}|${normalizedAlias(f.hometown)}` : null);
  for (const b of doc.bouts) {
    const corners = {};
    const pending = [];
    for (const side of ['a', 'b']) {
      const f = b[`fighter_${side}`];
      const binding = b.external_id ? bindings[`${b.external_id}|${side}`] : null;
      if (binding?.fighter_id) {
        corners[side] = binding.fighter_id;
        identityGraph.bindings_used += 1;
        continue;
      }
      // within ONE card document, the same external id, or the same name with the same
      // stated hometown, is the same boxer (repeat pairings); across documents the
      // resolver decides as always
      const docKey = docKeyOf(f);
      const cached = docKey ? fightersInDocument.get(docKey) : null;
      const { result } = cached ?? await ingestIdentity(store, {
        sourceKey: doc.source_key, accessMode: src.access_mode, namespace: fighterNamespace,
        record: { external_id: f.external_id ?? null, display_name: f.display_name, dob: f.dob ?? null, nationality: f.nationality ?? [], hometown: f.hometown ?? null },
        payload: { event: doc.external_id, bout: b.external_id ?? null, side, ...f },
        // provenance: every identity observation carries the page the name was reported on, which is
        // what the evidence gate traces back to when it decides whether a person may become canonical
        sourceUrl: doc.source_url ?? null,
      });
      if (docKey && !cached && ['matched', 'created'].includes(result.outcome)) fightersInDocument.set(docKey, { result });
      if (['matched', 'created'].includes(result.outcome)) corners[side] = result.fighter_id;
      else pending.push({ side, f, result });
    }
    if (graphEnabled && graphResolve && b.external_id && pending.length) {
      // second round only when the first round resolved the opponent (new graph evidence)
      for (let round = 0, progress = true; round < 2 && progress; round++) {
        progress = false;
        for (const p of pending) {
          if (corners[p.side]) continue;
          const other = p.side === 'a' ? 'b' : 'a';
          if (round === 1 && !corners[other]) continue;
          const ctx = b.corner_context?.[p.side] ?? {};
          const d = await resolveAndRecordAppearance(store, {
            source_key: doc.source_key, namespace: fighterNamespace, bout_external_id: b.external_id, bout_order: b.bout_order ?? null, side: p.side,
            display_name: p.f.display_name, hometown: p.f.hometown ?? null, weight_lb: ctx.weight_lb ?? null, debut: ctx.debut ?? null,
            event: { event_id: eventId, date: doc.event_date ?? null, commission: doc.commission?.slug ?? null, venue_id: resolved.venue_id ?? null },
            opponent: { display_name: b[`fighter_${other}`].display_name, fighter_id: corners[other] ?? null },
          }, { allowCreate: src.access_mode === 'approved_ingest' });
          const k = `${d.tier ?? '-'}:${d.decision}`;
          identityGraph.decisions[k] = (identityGraph.decisions[k] ?? 0) + 1;
          if (['matched', 'created'].includes(d.decision) && d.fighter_id) {
            corners[p.side] = d.fighter_id;
            progress = true;
            const docKey = docKeyOf(p.f);
            if (docKey) fightersInDocument.set(docKey, { result: { outcome: 'matched', fighter_id: d.fighter_id } });
          }
        }
      }
    }
    for (const p of pending) {
      if (!corners[p.side]) unresolved.push({ bout: b.external_id ?? null, side: p.side, name: p.f.display_name, outcome: p.result.outcome, reason: p.result.reason, review_item_id: p.result.review_item_id ?? null });
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
        // the commission's own sheet, re-parsed: officials already holding a role/slot on this bout
        const stateBout = doc.officials_authority === 'commission' && b.external_id
          ? state.bouts?.find((s) => s.external_ids.includes(`${doc.namespace}.bout:${b.external_id}`)) : null;
        for (const o of b.officials) {
          const continuity = slotContinuity(o, activeOccupant(stateBout, o));
          if (continuity.action === 'keep') {
            rb.resolvedOfficials.push({ official_id: continuity.official_id, role: o.role, slot: o.slot ?? null });
            officialContinuity.push({ bout_id: stateBout.bout_id, role: o.role, slot: o.slot ?? null, name: o.display_name, ...continuity });
            continue;
          }
          if (continuity.action === 'hold') {
            const occupant = activeOccupant(stateBout, o);
            rb.resolvedOfficials.push({ official_id: continuity.official_id, role: o.role, slot: o.slot ?? null });
            const r = await store.applyOfficialDecision({
              source_key: doc.source_key,
              identity: { display_name: o.display_name, namespace: `${doc.namespace}.official`, official_type: o.role === 'referee' ? 'referee' : 'judge', commission_id: resolved.commission_id ?? state.commission_id ?? null },
              decision: { outcome: 'review', reason: continuity.reason, candidates: [{ id: occupant.official_id, display_name: occupant.display_name, bout_id: stateBout.bout_id, bout_external_id: b.external_id, role: o.role, slot: o.slot ?? null }] },
              normalized_name: normalizedAlias(o.display_name), keys: [],
            });
            officialContinuity.push({ bout_id: stateBout.bout_id, role: o.role, slot: o.slot ?? null, name: o.display_name, occupant: occupant.display_name, review_item_id: r.review_item_id ?? null, ...continuity });
            continue;
          }
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

  const { changes, review, matches } = diffCard(state, resolved);
  const boutIds = new Map();
  const applied = [];
  const news = [];
  const laneRefusals = [];
  for (const c of changes) {
    let boutId = c.bout_ref && !String(c.bout_ref).startsWith('ext:') && !String(c.bout_ref).startsWith('pair:') ? c.bout_ref : boutIds.get(c.bout_ref) ?? null;
    if (c.change_type === 'bout_added') {
      try {
        boutId = await store.addBout({ source_key: doc.source_key, event_id: eventId, source_url: doc.source_url ?? null,
          ...c.after_state, external_namespace: c.after_state.external_id ? `${doc.namespace}.bout` : null });
      } catch (err) {
        // the source's rights review does not cover this lane: skip the bout, keep the rest of the card, write nothing
        const refusal = laneRefusal(err);
        if (!refusal) throw err;
        laneRefusals.push({ ...refusal, bout: c.after_state?.external_id ?? c.bout_ref });
        continue;
      }
      boutIds.set(c.bout_ref, boutId);
    }
    const changeKey = await dedupeKey('card_change', eventId, c.change_type === 'bout_added' ? c.bout_ref : boutId, c.change_type, c.before_state, c.after_state);
    let r;
    try {
      r = await store.applyCardChange({
        source_key: doc.source_key, event_id: eventId, bout_id: boutId, change_type: c.change_type, before_state: c.before_state,
        after_state: c.after_state, effective_at: now, source_url: doc.source_url ?? null, observation_id: observation.id, change_key: changeKey,
      });
    } catch (err) {
      // an official, title or bout lane the source's rights review does not cover: skip this change, keep the card
      const refusal = laneRefusal(err);
      if (!refusal) throw err;
      laneRefusals.push({ ...refusal, change_type: c.change_type, bout: boutId ?? c.bout_ref });
      continue;
    }
    if (!r.applied) continue;
    applied.push({ ...c, bout_id: boutId, change_id: r.change_id });

    const newsType = NEWS[c.change_type] ?? (['official_assigned', 'official_replaced'].includes(c.change_type) ? 'OFFICIALS_ASSIGNED' : null);
    // a new event's first venue is part of EVENT_ADDED, not a change
    if (c.change_type === 'venue_changed' && !state.existed) continue;
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

  // source bout ids for this card: added bouts, and bouts matched by id or by exact pairing
  const bout_links = [...matches, ...[...boutIds].filter(([ref]) => String(ref).startsWith('ext:')).map(([ref, bout_id]) => ({ external_id: String(ref).slice(4), bout_id, matched_by: 'added' }))];
  if (crossSource?.status === 'not_attached') review.push({ reason: `cross_source_event_${crossSource.reason}`, candidates: crossSource.candidates });
  return { status: 'applied', event_id: eventId, event_created: ev.created, changes: applied, news, unresolved, review, bout_links, identity_graph: identityGraph, official_continuity: officialContinuity,
    cross_source: crossSource, event_fields_deferred: Boolean(state.defer_event_fields), observation_id: observation.id,
    ...(laneRefusals.length ? { lane_refusals: laneRefusals } : {}) };
}
