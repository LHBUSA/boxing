// Ranking document import.
//
// A ranking document is the structured, source-native form of ONE published
// list (produced by an approved adapter or an operator from an approved
// source):
//   { source_key, organization_slug, division_label, gender_scope?, published_on, effective_on?,
//     source_url?, correction_note?,
//     entries: [{ position, rank_label, source_name, source_fighter_id?, nationality?,
//                 designation?, mandatory?, is_champion?, is_vacant? }] }
//
// Entry identity, in order: (1) org namespace id already mapped, (2) the same
// normalized source name at this org/division in the previous snapshot,
// (3) the identity resolver (lookup only, never creates). Otherwise the entry
// keeps its source name with fighter_id null — never a guessed boxer.

import { contentHash, dedupeKey } from '../canonical.mjs';
import { parseName } from '../identity/normalize.mjs';
import { resolveOnly } from '../identity/pipeline.mjs';
import { diffRankings } from './diff.mjs';

const DIVISION_WORDS = [
  ['atomweight', ['atomweight']],
  // sanctioning bodies abbreviate: IBF "LT. HEAVYWEIGHT", "S. MIDDLEWEIGHT", "JR. MIDDLEWEIGHT"; WBO "SUP. MIDDLEWEIGHT",
  // "MINI-FLYWEIGHT". Abbreviated forms must be listed or the bare word ("heavyweight") would match first.
  ['minimumweight', ['minimumweight', 'strawweight', 'mini flyweight', 'mini fly']],
  ['light_flyweight', ['light flyweight', 'lt flyweight', 'junior flyweight', 'jr flyweight']],
  ['super_flyweight', ['super flyweight', 's flyweight', 'sup flyweight', 'junior bantamweight', 'jr bantamweight']],
  ['flyweight', ['flyweight']],
  ['super_bantamweight', ['super bantamweight', 's bantamweight', 'sup bantamweight', 'junior featherweight', 'jr featherweight']],
  ['bantamweight', ['bantamweight']],
  ['super_featherweight', ['super featherweight', 's featherweight', 'sup featherweight', 'junior lightweight', 'jr lightweight']],
  ['featherweight', ['featherweight']],
  ['super_lightweight', ['super lightweight', 's lightweight', 'sup lightweight', 'junior welterweight', 'jr welterweight', 'light welterweight', 'lt welterweight']],
  ['lightweight', ['lightweight']],
  ['super_welterweight', ['super welterweight', 's welterweight', 'sup welterweight', 'junior middleweight', 'jr middleweight', 'light middleweight', 'lt middleweight']],
  ['welterweight', ['welterweight']],
  ['super_middleweight', ['super middleweight', 's middleweight', 'sup middleweight']],
  ['light_heavyweight', ['light heavyweight', 'lt heavyweight']],
  ['middleweight', ['middleweight']],
  ['bridgerweight', ['bridgerweight']],
  ['cruiserweight', ['cruiserweight', 'junior heavyweight', 'jr heavyweight']],
  ['heavyweight', ['heavyweight']],
];

// "Women's Super Welterweight (154 lbs)" -> { weight_class_key: 'super_welterweight', gender: 'female' }
export function parseDivisionLabel(label) {
  const text = parseName(String(label ?? '')).tokens.join(' ').replace(/\b\d+(\s*(lbs?|kg|pounds))?\b/g, '').replace(/\s+/g, ' ').trim();
  const gender = /\b(women|womens|female|ladies)\b/.test(text) ? 'female' : null;
  for (const [key, words] of DIVISION_WORDS) {
    if (words.some((w) => new RegExp(`\\b${w}\\b`).test(text))) return { weight_class_key: key, gender };
  }
  return { weight_class_key: null, gender };
}

export function validateRankingDocument(doc) {
  const problems = [];
  for (const k of ['source_key', 'organization_slug', 'division_label']) if (!doc?.[k]) problems.push(`missing ${k}`);
  if (!doc?.published_on && !doc?.effective_on) problems.push('published_on or effective_on required');
  if (!Array.isArray(doc?.entries)) problems.push('entries must be an array');
  const positions = new Set();
  for (const [i, e] of (doc?.entries ?? []).entries()) {
    if (!Number.isInteger(e.position) || e.position < 1) problems.push(`entry ${i}: position must be a positive integer`);
    if (positions.has(e.position)) problems.push(`entry ${i}: duplicate position ${e.position}`);
    positions.add(e.position);
    if (!e.is_vacant && !e.source_name) problems.push(`entry ${i}: source_name required unless is_vacant`);
    if (e.is_vacant && e.source_name) problems.push(`entry ${i}: vacant entry cannot name a boxer`);
    if (e.mandatory != null && typeof e.mandatory !== 'boolean') problems.push(`entry ${i}: mandatory must be boolean or absent (never inferred)`);
  }
  return problems;
}

const numericRank = (label) => (/^\d+$/.test(String(label ?? '').trim()) ? Number(label) : null);

// options.weightClassKey: the division already mapped by an organization-native vocabulary (sanctioning adapters)
// options.resolveEntry(e): replaces the default identity steps entirely; returns { fighter_id, method } or null.
//   Sanctioning-body ingestion passes one that only accepts reviewed identities (never a name match).
// options.sourceRecord / options.entryMetadata(e): source-native extras stored with the snapshot / each entry
export async function importRankingDocument(store, doc, { now = new Date().toISOString(), weightClassKey = null, resolveEntry = null, sourceRecord = null, entryMetadata = null } = {}) {
  const problems = validateRankingDocument(doc);
  if (problems.length) return { status: 'rejected', problems };
  const division = weightClassKey ? { weight_class_key: weightClassKey, gender: doc.gender_scope ?? null } : parseDivisionLabel(doc.division_label);
  if (!division.weight_class_key) return { status: 'rejected', problems: [`unrecognised division label "${doc.division_label}"`] };
  const gender = doc.gender_scope ?? division.gender ?? 'male';
  const namespace = `${doc.organization_slug}.ranking_entry`;

  const prior = await store.rankingSnapshotAsOf(doc.organization_slug, division.weight_class_key, gender, doc.effective_on ?? doc.published_on);
  const priorByName = new Map((prior?.entries ?? []).filter((e) => e.fighter_id && e.source_name).map((e) => [parseName(e.source_name).full, e.fighter_id]));

  const entries = [];
  const unresolved = [];
  for (const e of doc.entries) {
    let fighterId = null;
    let method = null;
    if (!e.is_vacant && resolveEntry) {
      const r = await resolveEntry(e);
      if (r?.fighter_id) { fighterId = r.fighter_id; method = r.method; } else unresolved.push({ position: e.position, source_name: e.source_name, reason: 'held_for_identity_review' });
    } else if (!e.is_vacant) {
      if (e.source_fighter_id) {
        const r = await resolveOnly(store, { external_id: e.source_fighter_id, display_name: e.source_name, nationality: e.nationality },
          { namespace, allowCreate: false });
        if (r.decision.outcome === 'matched' && r.decision.method === 'external_id') { fighterId = r.decision.fighter_id; method = 'org_id'; }
      }
      if (!fighterId && priorByName.has(parseName(e.source_name).full)) {
        fighterId = priorByName.get(parseName(e.source_name).full);
        method = 'prior_snapshot_same_name';
      }
      if (!fighterId) {
        const r = await resolveOnly(store, { display_name: e.source_name, nationality: e.nationality, division_keys: [division.weight_class_key] },
          { namespace, allowCreate: false });
        if (r.decision.outcome === 'matched') { fighterId = r.decision.fighter_id; method = r.decision.method; }
        else unresolved.push({ position: e.position, source_name: e.source_name, reason: r.decision.reason });
      }
    }
    entries.push({
      position: e.position,
      rank: numericRank(e.rank_label),
      rank_label: e.rank_label ?? null,
      fighter_id: fighterId,
      source_name: e.is_vacant ? null : e.source_name,
      designation: e.designation ?? null,
      mandatory: e.mandatory ?? null,
      is_vacant: Boolean(e.is_vacant),
      is_champion: Boolean(e.is_champion),
      metadata: { resolution: method, nationality: e.nationality ?? null, source_fighter_id: e.source_fighter_id ?? null, ...(entryMetadata ? entryMetadata(e) : {}) },
    });
  }

  const raw = { ...doc };
  const hash = await contentHash(raw);
  const r = await store.importRankingSnapshot({
    source_key: doc.source_key,
    organization_slug: doc.organization_slug,
    weight_class_key: division.weight_class_key,
    gender_scope: gender,
    division_label: doc.division_label,
    published_on: doc.published_on ?? null,
    effective_on: doc.effective_on ?? null,
    source_url: doc.source_url ?? null,
    correction_note: doc.correction_note ?? null,
    ...(sourceRecord ? { source_record: sourceRecord } : {}),
    content_hash: hash,
    raw,
    entries,
  });
  if (r.status === 'duplicate') return { status: 'duplicate', snapshot_id: r.snapshot_id, unresolved, changes: [], event: null };

  const current = await store.rankingEntries(r.snapshot_id);
  const previous = r.previous_snapshot_id ? await store.rankingEntries(r.previous_snapshot_id) : null;
  const changes = previous ? diffRankings(previous, current) : [];
  let event = null;
  if (changes.length) {
    const key = await dedupeKey('ranking_changed', doc.organization_slug, division.weight_class_key, gender, r.previous_snapshot_id, r.snapshot_id);
    const supersedes = r.superseded_snapshot_id
      ? await dedupeKey('ranking_changed', doc.organization_slug, division.weight_class_key, gender, r.previous_snapshot_id, r.superseded_snapshot_id)
      : null;
    const fighterIds = [...new Set(changes.map((c) => c.fighter_id).filter(Boolean))];
    event = {
      contract_version: '1.1.0',
      event_type: 'RANKING_CHANGED',
      dedupe_key: key,
      supersedes_dedupe_key: supersedes,
      fighter_ids: fighterIds,
      source_key: doc.source_key,
      occurred_at: `${doc.effective_on ?? doc.published_on}T00:00:00Z`,
      detected_at: now,
      confidence: changes.some((c) => c.identity_unresolved) ? 60 : 100,
      requires_human_review: changes.some((c) => c.identity_unresolved) || Boolean(r.superseded_snapshot_id),
      payload: {
        facts: {
          organization_slug: doc.organization_slug,
          weight_class_key: division.weight_class_key,
          gender_scope: gender,
          division_label_source: doc.division_label,
          previous_snapshot: { id: previous.snapshot_id, published_on: previous.published_on, effective_on: previous.effective_on, revision: previous.revision },
          current_snapshot: { id: current.snapshot_id, published_on: current.published_on, effective_on: current.effective_on, revision: current.revision },
          is_correction: Boolean(r.superseded_snapshot_id),
          changes,
        },
      },
      sources: [{ source_key: doc.source_key, source_url: doc.source_url ?? null, observed_at: now, external_key: `ranking_snapshot:${r.snapshot_id}` }],
    };
    const emitted = await store.emitNewsEvent(event);
    event = { ...event, id: emitted.id, inserted: emitted.inserted };
  }
  return { status: r.status, snapshot_id: r.snapshot_id, revision: r.revision, previous_snapshot_id: r.previous_snapshot_id, unresolved, changes, event };
}
