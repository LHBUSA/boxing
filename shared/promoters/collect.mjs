// Professional card collector: one job, one adapter per approved promoter source.
//
//   discover (schedule page) -> candidate -> fetch event page -> parse -> normalize -> plan -> [apply]
//
// Every fact is schedule-lane only and carries the official event page as its source. A discovery candidate says "we may
// be missing this card"; it never becomes a fight. --dry-run performs the whole pipeline, including identity resolution
// and the rights check, and writes NOTHING: the same code runs for real once the gate opens.

import { createHash } from 'node:crypto';
import { upcomingCardDocument, validateUpcomingCard } from '../adapters/promoters/contract.mjs';
import { applyCardDocument } from '../events/card.mjs';
import { resolveOnly } from '../identity/pipeline.mjs';
import { PBC, parsePbcSchedule, parsePbcEvent } from '../adapters/promoters/pbc.mjs';
import { MATCHROOM, parseMatchroomEvents, parseMatchroomEvent, matchroomTileDate } from '../adapters/promoters/matchroom.mjs';

const UA = 'PropBetEdge-Boxing-schedule/1.0 (https://propbetedge.ai; announced card facts; low rate)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const ADAPTERS = Object.freeze({
  [PBC.sourceKey]: {
    descriptor: PBC,
    // PBC publishes Crawl-delay: 10
    minIntervalMs: 10_000,
    listUrl: PBC.scheduleUrl,
    discover: (html) => parsePbcSchedule(html).map((e) => ({
      external_key: e.url, url: e.url, discovered_name: e.headline ?? e.venue ?? e.url, probable_date: e.probable_date,
      probable_city: e.city, probable_country: e.region ? 'US' : null, probable_broadcaster: null,
      headline: e.announced_pairings.join(' · ') || null, confidence: e.probable_date ? 'high' : 'low', venue: { name: e.venue, city: e.city, region: e.region },
    })),
    parseEvent: (html, ctx) => parsePbcEvent(html, ctx),
  },
  [MATCHROOM.sourceKey]: {
    descriptor: MATCHROOM,
    minIntervalMs: 3_000,
    listUrl: MATCHROOM.eventsUrl,
    // the tile prints "19 Sep" with no year; the inferred date is probable only, and the event page still decides
    discover: (html, { now } = {}) => parseMatchroomEvents(html).map((t) => ({
      external_key: t.url, url: t.url, discovered_name: t.headline ?? t.slug, probable_date: matchroomTileDate(t.day_text, now),
      probable_city: t.venue?.city ?? null,
      probable_country: t.venue?.country_code ?? null, probable_broadcaster: null, headline: t.headline,
      confidence: 'medium', venue: t.venue, day_text: t.day_text,
    })),
    parseEvent: (html, ctx) => parseMatchroomEvent(html, ctx),
  },
});

// A deterministic fingerprint of the announced card. If a pairing, order, distance or title changes tomorrow, this
// changes with it, and the delta below names exactly what moved.
export function cardFingerprint(observation) {
  const parts = (observation.bouts ?? []).map((b) => [b.bout_order, b.fighter_a.name, b.fighter_b.name, b.division ?? '', b.scheduled_rounds ?? '',
    (b.titles ?? []).map((t) => `${t.organization_slug}:${t.tier}`).join('+'), b.card_segment ?? ''].join('|'));
  return createHash('sha256').update(JSON.stringify({ date: observation.scheduled_date, venue: observation.venue?.name ?? null, bouts: parts })).digest('hex');
}

// what changed between the card we last saw and the card the source publishes now
export function cardDelta(previous, current) {
  const key = (b) => `${b.fighter_a.name.toLowerCase()}|${b.fighter_b.name.toLowerCase()}`;
  const prev = new Map((previous?.bouts ?? []).map((b) => [key(b), b]));
  const now = new Map((current.bouts ?? []).map((b) => [key(b), b]));
  const changes = [];
  for (const [k, b] of now) {
    const before = prev.get(k);
    if (!before) {
      const opponentSwap = [...prev.values()].find((p) => p.fighter_a.name.toLowerCase() === b.fighter_a.name.toLowerCase() || p.fighter_b.name.toLowerCase() === b.fighter_b.name.toLowerCase());
      changes.push(opponentSwap
        ? { change: 'CHANGED_OPPONENT', bout: b.source_bout_id, from: `${opponentSwap.fighter_a.name} vs ${opponentSwap.fighter_b.name}`, to: `${b.fighter_a.name} vs ${b.fighter_b.name}` }
        : { change: 'NEW_BOUT', bout: b.source_bout_id, pairing: `${b.fighter_a.name} vs ${b.fighter_b.name}` });
      continue;
    }
    if ((before.scheduled_rounds ?? null) !== (b.scheduled_rounds ?? null)) changes.push({ change: 'CHANGED_ROUNDS', bout: b.source_bout_id, from: before.scheduled_rounds, to: b.scheduled_rounds });
    if (JSON.stringify(before.titles ?? []) !== JSON.stringify(b.titles ?? [])) changes.push({ change: 'CHANGED_TITLE', bout: b.source_bout_id });
    if ((before.bout_order ?? null) !== (b.bout_order ?? null)) changes.push({ change: 'CHANGED_CARD_POSITION', bout: b.source_bout_id, from: before.bout_order, to: b.bout_order });
  }
  for (const [k, b] of prev) {
    if (now.has(k)) continue;
    const stillThere = [...now.values()].find((n) => n.fighter_a.name.toLowerCase() === b.fighter_a.name.toLowerCase() || n.fighter_b.name.toLowerCase() === b.fighter_b.name.toLowerCase());
    if (!stillThere) changes.push({ change: 'REMOVED_BOUT', bout: b.source_bout_id, pairing: `${b.fighter_a.name} vs ${b.fighter_b.name}` });
  }
  return changes;
}

// The write plan: what canonicalization WOULD do, resolved against the live graph, writing nothing.
export async function planCanonicalization(store, observation, { namespace }) {
  const doc = upcomingCardDocument(observation, { namespace });
  const plan = { event: null, venue: null, fighters: [], bouts: [], titles: { resolved: 0, unresolved: 0 }, broadcaster: observation.broadcaster ?? null, problems: [] };

  // Does this exact source event id already exist, and is there a same-date, same-city event to attach to?
  // A lookup that FAILS is not the same answer as "nothing found": treating a dead connection as "we have never seen
  // this card" is how a duplicate event gets written. The card is abandoned instead, and the caller records why.
  const known = await store.sourceEventIds(`${namespace}.event`, [doc.external_id])
    .catch((err) => { throw new Error(`existing-event lookup failed, so the card cannot be deduplicated: ${err.message}`); });
  const crossSource = doc.venue?.city
    ? await store.eventCrossSourceCandidates({ event_date: doc.event_date, city: doc.venue.city, source_key: doc.source_key })
      .catch((err) => { throw new Error(`cross-source event lookup failed, so the card cannot be attached safely: ${err.message}`); })
    : [];
  plan.event = known?.[doc.external_id]
    ? { action: 'would_match', reason: 'same source event id', event_id: known[doc.external_id] }
    : crossSource.length === 1
      ? { action: 'would_attach', reason: 'one event on the same date in the same city', event_id: crossSource[0].event_id ?? crossSource[0].id ?? null }
      : { action: 'would_insert', name: doc.name, date: doc.event_date, cross_source_candidates: crossSource.length };
  plan.venue = doc.venue ? { action: 'would_match_or_insert', name: doc.venue.name, city: doc.venue.city, country: doc.venue.country_code } : { action: 'unavailable', reason: 'venue not stated by the source' };

  const seen = new Map();
  for (const b of doc.bouts) {
    const corners = [];
    for (const side of ['fighter_a', 'fighter_b']) {
      const name = b[side].display_name;
      if (seen.has(name)) { corners.push(seen.get(name)); continue; }
      const r = await resolveOnly(store, { display_name: name }, { namespace: `${namespace}.fighter` })
        .catch((err) => ({ decision: { outcome: 'error', reason: err.message } }));
      const d = r.decision ?? {};
      const entry = { name, outcome: d.outcome ?? 'unresolved', fighter_id: d.fighter_id ?? null, reason: d.reason ?? null, candidates: d.candidates?.length ?? 0 };
      seen.set(name, entry);
      plan.fighters.push(entry);
      corners.push(entry);
    }
    const blocked = corners.some((c) => c.outcome === 'review' || c.outcome === 'error');
    plan.bouts.push({
      source_bout_id: b.external_id, order: b.bout_order, segment: b.card_segment, pairing: `${b[`fighter_a`].display_name} vs ${b.fighter_b.display_name}`,
      division: b.weight_class_key ?? null, scheduled_rounds: b.scheduled_rounds ?? null,
      titles: (b.titles ?? []).map((t) => `${t.organization_slug}:${t.tier}`),
      action: blocked ? 'would_hold_for_identity_review' : 'would_insert',
    });
    plan.titles.resolved += (b.titles ?? []).length;
  }
  for (const b of observation.bouts ?? []) plan.titles.unresolved += (b.titles_unresolved ?? []).length;
  plan.problems = validateUpcomingCard(observation);
  return { doc, plan };
}

// One collection pass. dryRun performs every read and no write.
export async function collectPromoterCards(store, {
  sources = Object.keys(ADAPTERS), fetchImpl = fetch, now = new Date().toISOString(), dryRun = true, windowDays = 21, maxEvents = 6, sleepImpl = sleep,
} = {}) {
  const today = now.slice(0, 10);
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + windowDays);
  const receipt = { rule: 'pbe_promoter_collect@1', generated_at: now, dry_run: dryRun, sources: [] };

  // Migration 0046 has two halves and a half-applied database fails OPEN: the code binds to the schema half while the
  // lane state stays 'not_declared', which 0045's deny-list waves through. Before any write, both halves must be
  // present. A dry run is allowed to proceed on a half-applied database — it writes nothing and the receipt reports the
  // state — but an apply is refused outright.
  const known = sources.filter((k) => ADAPTERS[k]);
  if (known.length && typeof store.promoterLaneReady === 'function') {
    const ready = await store.promoterLaneReady(known).catch((err) => ({ error: err.message }));
    receipt.lane_ready = ready;
    // Only the half-apply question is answered here: are the schema objects present, and were the lane declarations
    // actually written? Whether an individual source is enabled and approved is the registry gate's job below, which
    // reports it per source with a reason — folding the two together would hide which of them refused.
    const declarationsMissing = Object.entries(ready?.data_half ?? {})
      .filter(([, d]) => d.schedule_lanes_covered !== 7 || d.non_schedule_lanes_open > 0)
      .map(([k]) => k);
    const halfApplied = ready?.error || !ready?.schema_half_complete || declarationsMissing.length > 0;
    if (!dryRun && halfApplied) {
      receipt.error = ready?.error
        ? `promoter lane readiness could not be established: ${ready.error}`
        : !ready.schema_half_complete
          ? `promoter lane is not ready: the schema half of migration 0046/0047 is incomplete — ${JSON.stringify(ready.schema_half)}`
          : `promoter lane is not ready: the data half is incomplete for ${declarationsMissing.join(', ')} — lane declarations are missing, so the rights gate would fail open`;
      receipt.summary = summarizeReceipt(receipt);
      return receipt;
    }
  }

  for (const key of sources) {
    const adapter = ADAPTERS[key];
    if (!adapter) { receipt.sources.push({ source_key: key, error: 'no adapter' }); continue; }
    // whether this source may contribute profile CONTENT (bios, physicals). Creating the person is not gated on it:
    // a name on a traceable card is a fact, and migration 0047 judges it on evidence.
    const mayStoreProfile = receipt.lane_ready?.data_half?.[key]?.may_store_profile_content ?? null;
    const out = { source_key: key, may_store_profile_content: mayStoreProfile, lane: adapter.descriptor.lane, parser_version: adapter.descriptor.version, list_url: adapter.listUrl, candidates: [], events: [] };

    // The registry decides whether a source may be collected at all, and it is asked BEFORE the first request. A source
    // that is disabled, not approved for ingest, or whose rights review is not approved costs us nothing: no fetch, no
    // discovery candidate, no row. This holds in dry runs too — whether we may read a promoter's pages is a rights
    // question, not a write question, and a lookup that fails is treated as "not permitted", never as permission.
    if (typeof store.source === 'function') {
      const src = await store.source(key).catch((err) => ({ lookup_error: err.message }));
      const refusal = src?.lookup_error ? `registry lookup failed: ${src.lookup_error}`
        : !src ? 'not registered'
        : !src.enabled ? 'disabled in the source registry'
        : src.access_mode !== 'approved_ingest' ? `access_mode is ${src.access_mode}, not approved_ingest`
        : src.rights_state !== 'approved' ? `rights_state is ${src.rights_state}, not approved`
        : null;
      if (refusal) { out.error = `source not collectable: ${refusal}`; receipt.sources.push(out); continue; }
    }

    const listRes = await fetchImpl(adapter.listUrl, { headers: { 'user-agent': UA } });
    if (!listRes.ok) { out.error = `list fetch ${listRes.status}`; receipt.sources.push(out); continue; }
    const discovered = adapter.discover(await listRes.text(), { now });
    out.discovered = discovered.length;

    for (const c of discovered.slice(0, maxEvents)) {
      const candidate = {
        source_key: key, external_key: c.external_key, discovered_name: c.discovered_name, probable_date: c.probable_date,
        probable_city: c.probable_city, probable_country: c.probable_country, probable_promoter: adapter.descriptor.promoter,
        probable_broadcaster: c.probable_broadcaster, headline: c.headline, source_url: c.url, confidence: c.confidence,
      };
      out.candidates.push(candidate);
      // a candidate says "we may be missing this card"; it never becomes a fight
      if (!dryRun && store.recordEventCandidate) {
        candidate.recorded = await store.recordEventCandidate(candidate).catch((err) => ({ error: err.message }));
      }
      await sleepImpl(adapter.minIntervalMs);
      // One card cannot take down the pass. A page that fails to fetch, fails to parse, or violates the card contract is
      // recorded as a rejected card and the run moves on to the next one: a broken October page must never cost us
      // tomorrow's card. Nothing is written for a card that lands here.
      try {
        const evRes = await fetchImpl(c.url, { headers: { 'user-agent': UA } });
        if (!evRes.ok) { out.events.push({ url: c.url, error: `event fetch ${evRes.status}` }); continue; }
        const parsed = adapter.parseEvent(await evRes.text(), { url: c.url, capturedAt: now, venueHint: c.venue ?? null });
        const obs = parsed.observation;
        if (!obs.scheduled_date || obs.scheduled_date < today || obs.scheduled_date > horizon.toISOString().slice(0, 10)) {
          out.events.push({ url: c.url, skipped: obs.scheduled_date ? 'outside the window' : 'no date on the page', date: obs.scheduled_date ?? null });
          continue;
        }
        const fingerprint = cardFingerprint(obs);
        const { plan } = await planCanonicalization(store, obs, { namespace: adapter.descriptor.namespace });
        const event = {
          url: c.url, event_name: obs.event_name, date: obs.scheduled_date, venue: obs.venue?.name ?? null, city: obs.venue?.city ?? null,
          country: obs.venue?.country_code ?? null, broadcaster: obs.broadcaster, promoter: obs.promoter,
          published_start_local: obs.published_start_local ?? null, published_utc_offset: obs.published_utc_offset ?? null,
          scheduled_start_at: obs.scheduled_start_at ?? null, start_basis: obs.start_basis ?? null,
          // every assertion the page made about the start, and the disagreement if it made two that differ
          published_start_line: obs.published_start_line ?? null, start_assertions: obs.start_assertions ?? null,
          source_time_conflict: obs.source_time_conflict ?? null,
          announced_bouts: obs.bouts.length, fingerprint, parser_problems: parsed.problems, plan,
        };
        if (!dryRun) {
          const doc = upcomingCardDocument(obs, { namespace: adapter.descriptor.namespace });
          const applied = await applyCardDocument(store, doc, { now });
          event.applied = { status: applied.status, changes: applied.changes?.map((x) => x.change_type) ?? [], unresolved: applied.unresolved?.length ?? 0, lane_refusals: applied.lane_refusals ?? [] };
        }
        out.events.push(event);
      } catch (err) {
        out.events.push({ url: c.url, rejected: true, error: err.message, date: null });
      }
    }
    receipt.sources.push(out);
  }
  receipt.summary = summarizeReceipt(receipt);
  return receipt;
}

// What the run actually did, in the terms the gate is judged on. Every number here is derived from the receipt itself,
// so it cannot claim something the events do not show — and actual_writes is 0 for a dry run by construction.
export function summarizeReceipt(receipt) {
  const s = {
    cards_discovered: 0, cards_accepted: 0, cards_rejected: 0, cards_unreachable: 0, cards_skipped: 0,
    bouts_accepted: 0, bouts_refused: 0, placeholder_slots_refused: 0, fighters: 0,
    duplicates_suppressed: { events: 0, bouts: 0, fighters: 0 },
    start_times: { corroborated: 0, structured: 0, visible_preferred: 0, unresolved: 0, none: 0, conflicts_recorded: 0 },
    content: { sources_that_may_not_store_profiles: [] },
    rights: { lane_refusals: 0, sources_failed: [] },
    planned_writes: 0, actual_writes: 0,
  };
  for (const src of receipt.sources ?? []) {
    if (src.error) s.rights.sources_failed.push(`${src.source_key}: ${src.error}`);
    if (src.may_store_profile_content === false) s.content.sources_that_may_not_store_profiles.push(src.source_key);
    s.cards_discovered += src.discovered ?? 0;
    for (const e of src.events ?? []) {
      // a card the contract refused is a rejection; a page we could not fetch is an upstream outage, not our verdict
      if (e.rejected) { s.cards_rejected++; continue; }
      if (e.error) { s.cards_unreachable++; continue; }
      if (e.skipped) { s.cards_skipped++; continue; }
      s.cards_accepted++;
      s.bouts_accepted += e.plan?.bouts?.length ?? 0;
      for (const p of e.parser_problems ?? []) {
        if (/^bout /.test(p)) s.bouts_refused++;
        if (/opponent not announced|corner is not named/.test(p)) s.placeholder_slots_refused++;
      }
      s.fighters += e.plan?.fighters?.length ?? 0;
      if (e.plan?.event?.action === 'would_match') s.duplicates_suppressed.events++;
      s.duplicates_suppressed.bouts += (e.plan?.bouts ?? []).filter((b) => b.action === 'would_match').length;
      s.duplicates_suppressed.fighters += (e.plan?.fighters ?? []).filter((f) => f.outcome === 'matched').length;
      const basis = /\(([a-z_]+)\)\s*$/.exec(e.start_basis ?? '')?.[1] ?? (e.scheduled_start_at ? 'structured' : 'none');
      if (basis in s.start_times) s.start_times[basis]++;
      if (e.source_time_conflict) s.start_times.conflicts_recorded++;
      s.planned_writes += (e.plan?.bouts ?? []).filter((b) => b.action === 'would_insert').length
        + (e.plan?.fighters ?? []).filter((f) => f.outcome !== 'matched').length
        + (e.plan?.event?.action === 'would_insert' ? 1 : 0);
      s.actual_writes += e.applied?.changes?.length ?? 0;
      s.rights.lane_refusals += e.applied?.lane_refusals?.length ?? 0;
    }
  }
  if (receipt.dry_run) s.actual_writes = 0;
  return s;
}
