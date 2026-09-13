// Identity ingestion pipeline: raw record -> candidates -> decision -> persist.
// Runtime-agnostic: `store` is either the pg store (local/tests) or the
// PostgREST store (Workers). Both call the same SQL functions.

import { contentHash } from '../canonical.mjs';
import { nameKeys, normalizedAlias, parseName } from './normalize.mjs';
import { RESOLVER_VERSION, resolveIdentity } from './resolver.mjs';

const ALIAS_KINDS = new Set(['name', 'nickname', 'transliteration', 'former_name', 'other']);

// Adapter records -> the identity shape the resolver and SQL expect.
export function toIdentity(record, namespace) {
  const nationality = [record.nationality].flat().filter(Boolean).map((n) => String(n).toUpperCase());
  return {
    namespace,
    external_id: record.external_id == null ? null : String(record.external_id),
    external_url: record.external_url ?? null,
    display_name: record.display_name,
    names: (record.names ?? []).filter((n) => n?.text).map((n) => ({ text: n.text, kind: ALIAS_KINDS.has(n.kind) ? n.kind : 'other' })),
    dob: record.dob ?? null,
    dob_precision: record.dob_precision ?? (record.dob ? 'day' : null),
    sex: record.sex ?? null,
    nationality,
    stance: record.stance ?? null,
    height_cm: record.height_cm ?? null,
    reach_cm: record.reach_cm ?? null,
    hometown: record.hometown ?? null,
    promoter: record.promoter ?? null,
    division_keys: record.division_keys ?? [],
    opponents: record.opponents ?? [],
    bout: record.bout ?? null,
  };
}

export function lookupKeys(identity) {
  const keys = new Set();
  for (const n of [{ text: identity.display_name, kind: 'name' }, ...identity.names]) {
    for (const k of nameKeys(n.text, { lookup: true, kind: n.kind === 'nickname' ? 'nickname' : 'name' })) keys.add(k);
  }
  return [...keys].sort();
}

// Aliases + retrieval keys to index when a decision attaches this record.
//
// The alias kind follows HOW the record matched: a display name that only
// matched as a nickname is indexed as a nickname, and initial/surname-only
// matches ("D. Volkov", "Berg") teach no alias at all. Otherwise a weak
// spelling would become an exact name for every later observation.
export function buildIndex(identity, decision = null) {
  const aliases = [];
  const seen = new Set();
  const level = decision?.evidence?.nameLevel;
  const displayKind = level === 'nickname' ? 'nickname' : 'name';
  const names = ['initial', 'surname'].includes(level) ? identity.names : [{ text: identity.display_name, kind: displayKind }, ...identity.names];
  for (const n of names) {
    const normalized = n.kind === 'nickname' ? parseName(n.text).full : normalizedAlias(n.text);
    if (!normalized || seen.has(`${n.kind}|${normalized}`)) continue;
    seen.add(`${n.kind}|${normalized}`);
    aliases.push({
      alias: n.text,
      normalized,
      kind: n.kind,
      keys: nameKeys(n.text, { kind: n.kind === 'nickname' ? 'nickname' : 'name' }),
      search_name: n.kind === 'nickname' ? null : parseName(n.text).full,
    });
  }
  return { normalized_name: normalizedAlias(identity.display_name), aliases };
}

// Resolve without persisting (used by odds/card resolution and dry runs).
export async function resolveOnly(store, record, { namespace, scope = null, allowCreate = false } = {}) {
  const identity = toIdentity(record, namespace);
  const retrieved = await store.candidates({
    keys: lookupKeys(identity),
    searchName: parseName(identity.display_name).full || null,
    dob: identity.dob_precision === 'day' ? identity.dob : null,
    namespace,
    externalId: identity.external_id,
    scope,
  });
  const decision = resolveIdentity(identity, retrieved, { namespace, allowCreate, scope });
  return { identity, decision };
}

// Full ingest of one source record. `payload` is the raw source record exactly
// as received; `omit` lists volatile payload keys (fetch timestamps) excluded
// from the content hash so an unchanged record is recognised as a repeat.
export async function ingestIdentity(store, {
  sourceKey, accessMode, namespace, record, payload, sourceUrl = null, runId = null, parserVersion = null, omit = [],
}) {
  const raw = payload ?? record;
  const { identity, decision } = await resolveOnly(store, record, {
    namespace,
    allowCreate: accessMode === 'approved_ingest',
  });
  const hash = await contentHash(raw, { omit });
  const result = await store.applyDecision({
    source_key: sourceKey,
    ingest_run_id: runId,
    resolver_version: RESOLVER_VERSION,
    observation: {
      entity_type: 'fighter_identity',
      external_key: identity.external_id ? `${namespace}:${identity.external_id}` : null,
      source_url: sourceUrl,
      payload: raw,
      content_hash: hash,
      parser_version: parserVersion,
    },
    identity,
    decision,
    index: buildIndex(identity, decision),
  });
  return { identity, decision, result };
}

// Aggregates per-record results into run metrics.
export function summarize(results) {
  const m = {
    raw_identities_observed: results.length,
    duplicate_observations: 0,
    canonical_fighters_created: 0,
    identities_matched: 0,
    matched_by_external_id: 0,
    identities_unresolved: 0,
    identities_rejected: 0,
    duplicates_prevented: 0,
    review_reasons: {},
  };
  for (const { decision, result } of results) {
    if (result?.status === 'duplicate_observation') {
      m.duplicate_observations++;
      continue;
    }
    const outcome = result?.outcome ?? decision.outcome;
    if (outcome === 'created') m.canonical_fighters_created++;
    if (outcome === 'matched') {
      m.identities_matched++;
      if (decision.method === 'external_id') m.matched_by_external_id++;
      else m.duplicates_prevented++;
    }
    if (outcome === 'review' || outcome === 'unresolved') {
      m.identities_unresolved++;
      m.duplicates_prevented += outcome === 'review' ? 1 : 0;
      const reason = result?.reason ?? decision.reason;
      m.review_reasons[reason] = (m.review_reasons[reason] ?? 0) + 1;
    }
    if (outcome === 'rejected') m.identities_rejected++;
  }
  return m;
}
