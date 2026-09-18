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
import { MATCHROOM, parseMatchroomEvents, parseMatchroomEvent } from '../adapters/promoters/matchroom.mjs';

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
    discover: (html) => parseMatchroomEvents(html).map((t) => ({
      external_key: t.url, url: t.url, discovered_name: t.headline ?? t.slug, probable_date: null, probable_city: t.venue?.city ?? null,
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

  // does this exact source event id already exist, and is there a same-date, same-city event to attach to?
  const known = await store.sourceEventIds(`${namespace}.event`, [doc.external_id]).catch(() => ({}));
  const crossSource = doc.venue?.city
    ? await store.eventCrossSourceCandidates({ event_date: doc.event_date, city: doc.venue.city, source_key: doc.source_key }).catch(() => [])
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

  for (const key of sources) {
    const adapter = ADAPTERS[key];
    if (!adapter) { receipt.sources.push({ source_key: key, error: 'no adapter' }); continue; }
    const out = { source_key: key, lane: adapter.descriptor.lane, parser_version: adapter.descriptor.version, list_url: adapter.listUrl, candidates: [], events: [] };
    const listRes = await fetchImpl(adapter.listUrl, { headers: { 'user-agent': UA } });
    if (!listRes.ok) { out.error = `list fetch ${listRes.status}`; receipt.sources.push(out); continue; }
    const discovered = adapter.discover(await listRes.text());
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
    }
    receipt.sources.push(out);
  }
  return receipt;
}
