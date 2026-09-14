// Source-native title status + ranking snapshots for the four sanctioning bodies, and the division view built from
// them. Pure; dry-run only (nothing here writes). Rules:
//   * a body's lane is built ONLY from that body's own published statement about its own belts;
//   * what a body prints about OTHER bodies is a claim, shown for disagreement, never a title;
//   * a vacancy's cause, a mandatory challenger, a reign start or lineage is never inferred;
//   * "undisputed" / "unified" is PropBetEdge-derived from the four own statements, labelled, and not computed when a
//     body's own statement is unavailable.

import { normalizedAlias } from '../identity/normalize.mjs';
import { diffRankings } from '../rankings/diff.mjs';
import { BODIES } from '../adapters/sanctioning/vocabulary.mjs';

export const SNAPSHOT_RULE = 'pbe-sanctioning-snapshot@0.1.0-dryrun';
export const DERIVED_UNIFICATION_RULE = 'pbe_undisputed@1';
const PRIMARY_TIER = { wba: ['super', 'regular'], wbc: ['world'], ibf: ['world'], wbo: ['world'] };
const norm = (name) => (name ? normalizedAlias(name) : null);

// "Mandatory vs Moses Itauma" / "Callum Smith" -> named challenger; "Voluntary Period" / "TBD" / "Suspension Period" -> status only
export function mandatoryStatement(asPrinted, { dueOn = null, basis }) {
  const text = asPrinted?.trim() || null;
  if (!text && !dueOn) return null;
  const status = /^(voluntary period|tbd|suspension period|n\/?a|none)$/i.test(text ?? '') ? text : null;
  const challenger = text && !status ? text.replace(/^mandatory\s+vs\.?\s+/i, '').trim() : null;
  return { as_printed: text, challenger_source_name: challenger, status_as_printed: status, due_on: dueOn, basis };
}

function titleFrom(body, divisionKey, c, extra = {}) {
  const d = c.designation ?? {};
  const vacant = Boolean(c.vacant);
  const unknown = Boolean(c.holder_unknown);
  return {
    lineage: { body, division_key: divisionKey, tier: d.tier ?? null },
    native_designation: d.native ?? null,
    designation_known: Boolean(d.known),
    status: vacant ? 'vacant' : unknown ? 'unknown' : d.status === 'in_recess' ? 'in_recess' : d.status === 'champion' ? 'held' : 'unknown',
    honorific: d.honorific ?? null,
    holder: vacant || unknown ? null : { source_name: c.source_name, country: c.country ?? null, source_fighter_id: c.wba_id ?? null },
    reign_start: extra.reign_start ?? null,
    mandatory: extra.mandatory ?? null,
    last_defense_on: extra.last_defense_on ?? null,
    previous_holder_as_printed: extra.previous_holder_as_printed ?? null,
  };
}

const snapshotHeader = (body, document, { sourceUrl, retrievedAt, contentSha256, publishedOn = null, asOf = null, asOfLabel = null }) => ({
  body, document, source_url: sourceUrl, published_on: publishedOn, as_of: asOf, as_of_label: asOfLabel, retrieved_at: retrievedAt, content_sha256: contentSha256, rule: SNAPSHOT_RULE,
});

// ---- per body ------------------------------------------------------------------------------------------------------

export function wbaRankingSnapshots(parsed, meta) {
  return parsed.divisions.map((d) => ({
    snapshot: snapshotHeader('wba', 'ranking', { ...meta, publishedOn: parsed.published_on, asOfLabel: parsed.as_of_label }),
    division: { key: d.division.weight_class_key, native_label: d.division.native_label, limit_text: d.division.limit_text },
    titles: d.champions.flatMap((c) => (c.designations.length ? c.designations : [{ native: null, tier: null, status: 'unknown', known: false }])
      .map((des) => titleFrom('wba', d.division.weight_class_key, { ...c, designation: des }))),
    ranking: { entries: d.entries.map((e) => ({ ...e, is_vacant: false })), outside_numbered_list: [], champions_listed_outside_numbers: true },
    claims_about_other_bodies: [...d.champions.flatMap((c) => c.claims_about_other_bodies.map((x) => ({ ...x, source_name: c.source_name, vacant: false, where: 'champion row' }))),
      ...d.claims_about_other_bodies.map((x) => ({ ...x, where: 'other organizations line' }))],
  }));
}

export function wbaChampionsSnapshot(parsed, meta, divisionKey) {
  return {
    snapshot: snapshotHeader('wba', 'champions', meta),
    division: { key: divisionKey },
    titles: parsed.rows.filter((r) => r.division.weight_class_key === divisionKey).map((r) => titleFrom('wba', divisionKey, r)),
  };
}

export function ibfSnapshot(record, meta) {
  const key = record.division.weight_class_key;
  return {
    snapshot: snapshotHeader('ibf', 'rating', { ...meta, publishedOn: record.published_on, asOf: record.results_month_end }),
    division: { key, native_label: record.division.label_as_printed },
    titles: record.champions.map((c) => titleFrom('ibf', key, c, {
      reign_start: c.title_won_on ? { on: c.title_won_on, basis: 'IBF champion record "Title won"' } : null,
      mandatory: c.mandatory_due_on ? mandatoryStatement(null, { dueOn: c.mandatory_due_on, basis: 'IBF champion record "Mandatory" (a due date, no challenger named)' }) : null,
      last_defense_on: c.last_defended_on,
    })),
    ranking: { entries: record.entries.map((e) => ({ ...e, is_vacant: Boolean(e.not_rated) })), outside_numbered_list: [], champions_listed_outside_numbers: true },
    claims_about_other_bodies: record.claims_about_other_bodies.map((x) => ({ ...x, where: 'rating record wba/wbc/wbo fields' })),
    warnings: [...record.champions.filter((c) => c.ignored_fields).map((c) => `ignored ${JSON.stringify(c.ignored_fields)}`),
      ...(record.slots_not_shown ? [`slots past 15, not shown by the IBF page: ${JSON.stringify(record.slots_not_shown)}`] : [])],
  };
}

export function wboRatingsSnapshots(parsed, meta) {
  return parsed.divisions.map((d) => ({
    snapshot: snapshotHeader('wbo', 'ratings', { ...meta, asOf: parsed.as_of }),
    division: { key: d.division.weight_class_key, native_label: d.division.native_label, limit_text: d.division.limit_text },
    titles: d.champions.map((c) => titleFrom('wbo', d.division.weight_class_key, c)),
    ranking: { entries: d.entries.map((e) => ({ ...e, is_vacant: false })), outside_numbered_list: d.outside_numbered_list, champions_listed_outside_numbers: true },
    claims_about_other_bodies: d.claims_about_other_bodies.map((x) => ({ ...x, where: 'ratings champions footer' })),
  }));
}

export function wboChampionsSnapshot(parsed, meta, divisionKey) {
  return {
    snapshot: snapshotHeader('wbo', 'champions', meta),
    division: { key: divisionKey },
    titles: parsed.cards.filter((c) => c.division.weight_class_key === divisionKey).map((c) => titleFrom('wbo', divisionKey, c, {
      reign_start: c.champion_since_on ? { on: c.champion_since_on, basis: 'WBO champions page "Champion since"' } : null,
      mandatory: mandatoryStatement(c.next_mandatory_as_printed, { basis: 'WBO champions page "Next Mandatory"' }),
      last_defense_on: c.last_defense_on, previous_holder_as_printed: c.previous_champion_as_printed,
    })),
  };
}

// ---- comparisons -----------------------------------------------------------------------------------------------------

const held = (titles) => (titles ?? []).filter((t) => t.status === 'held' || t.status === 'in_recess');

// Two documents of the SAME body about the same division (e.g. WBA ranking page vs WBA champions page). Only belts both
// documents cover are compared; a belt one document does not list at all (the WBA ranking page shows no Gold belts) is
// reported as not listed, not as a conflict.
export function intraBodyConflicts(a, b) {
  const belts = (s) => new Map((s.titles ?? []).map((t) => [`${t.lineage.tier ?? t.native_designation}|${t.status === 'in_recess' ? 'in_recess' : 'belt'}`, t.status === 'vacant' ? 'VACANT' : norm(t.holder?.source_name)]));
  const [x, y] = [belts(a), belts(b)];
  const conflicts = [];
  const notListed = [];
  for (const k of new Set([...x.keys(), ...y.keys()])) {
    if (!x.has(k) || !y.has(k)) { notListed.push({ belt: k, only_in: x.has(k) ? a.snapshot.document : b.snapshot.document }); continue; }
    if (x.get(k) !== y.get(k)) conflicts.push({ belt: k, [a.snapshot.document]: x.get(k), [b.snapshot.document]: y.get(k), same_surname: sameSurname(x.get(k), y.get(k)) });
  }
  return { conflicts, not_listed_in_both: notListed };
}

const sameSurname = (x, y) => Boolean(x && y && x !== 'VACANT' && y !== 'VACANT' && x.split(' ').at(-1) === y.split(' ').at(-1));

// Division view: four lanes, each only from its own body's statements; claims by the others listed per lane.
export function divisionLanes(divisionKey, ownByBody, { reasons = {} } = {}) {
  const all = Object.values(ownByBody).flat().filter(Boolean);
  const lanes = {};
  for (const body of BODIES) {
    const own = (ownByBody[body] ?? []).filter((s) => s.division.key === divisionKey);
    const claims = all.filter((s) => s.snapshot.body !== body && s.division.key === divisionKey)
      .flatMap((s) => (s.claims_about_other_bodies ?? []).filter((c) => c.about === body).map((c) => ({ by: s.snapshot.body, document: s.snapshot.document, as_of: s.snapshot.as_of ?? s.snapshot.published_on, says: c.vacant ? 'VACANT' : c.source_name ?? '(blank)', native_text: c.native_text })));
    const ownHolders = new Set(own.flatMap((s) => held(s.titles).map((t) => norm(t.holder.source_name))));
    const ownVacant = own.some((s) => s.titles.some((t) => t.status === 'vacant'));
    lanes[body] = {
      state: own.length ? 'own_source' : 'no_own_source',
      reason: own.length ? null : reasons[body] ?? 'not inspected',
      documents: own.map((s) => ({ document: s.snapshot.document, source_url: s.snapshot.source_url, published_on: s.snapshot.published_on, as_of: s.snapshot.as_of, as_of_label: s.snapshot.as_of_label, retrieved_at: s.snapshot.retrieved_at })),
      titles: own.flatMap((s) => s.titles.map((t) => ({ ...t, from_document: s.snapshot.document }))),
      claims_by_other_bodies: claims.map((c) => ({ ...c,
        agreement: !own.length ? 'no_own_statement_to_compare' : c.says === 'VACANT' ? (ownVacant && !ownHolders.size ? 'agrees' : 'differs')
          : c.says === '(blank)' ? 'blank' : ownHolders.has(norm(c.says)) ? 'agrees' : [...ownHolders].some((h) => sameSurname(h, norm(c.says))) ? 'differs_name_form_same_surname' : 'differs' })),
    };
  }
  // PropBetEdge-derived, never a sanctioning-body claim
  const primary = BODIES.map((b) => {
    const titles = lanes[b].titles.filter((t) => t.status === 'held' && t.from_document);
    const tier = PRIMARY_TIER[b].find((tr) => titles.some((t) => t.lineage.tier === tr));
    return { body: b, holder: tier ? norm(titles.find((t) => t.lineage.tier === tier).holder.source_name) : null, available: lanes[b].state === 'own_source' };
  });
  const missing = primary.filter((p) => !p.available).map((p) => p.body);
  lanes.pbe_derived = {
    rule: DERIVED_UNIFICATION_RULE,
    label: 'PropBetEdge-derived from each body\'s own published title holdings; not a sanctioning-body designation',
    status: missing.length ? 'not_derivable' : (() => {
      const counts = primary.reduce((m, p) => (p.holder ? m.set(p.holder, (m.get(p.holder) ?? 0) + 1) : m), new Map());
      const top = [...counts.entries()].sort((x, y) => y[1] - x[1])[0];
      return !top ? 'no_holders' : top[1] === 4 ? 'undisputed' : top[1] >= 2 ? 'unified' : 'fragmented';
    })(),
    why: missing.length ? `own statement unavailable for: ${missing.join(', ')}` : null,
  };
  return lanes;
}

// Title status changes between two snapshots of the same body/document/division. A vacancy's cause is never stated here.
export function titleStatusChanges(prev, cur) {
  const idx = (s) => new Map((s?.titles ?? []).map((t) => [`${t.lineage.tier}`, t]));
  const [p, c] = [idx(prev), idx(cur)];
  const changes = [];
  for (const k of new Set([...p.keys(), ...c.keys()])) {
    const a = p.get(k); const b = c.get(k);
    const an = norm(a?.holder?.source_name); const bn = norm(b?.holder?.source_name);
    if (a?.status === 'held' && b?.status === 'vacant') changes.push({ type: 'became_vacant', tier: k, previous_holder: a.holder.source_name, cause: 'not stated in this document' });
    else if (a?.status === 'vacant' && b?.status === 'held') changes.push({ type: 'filled', tier: k, holder: b.holder.source_name, reign_start: b.reign_start });
    else if (a?.status === 'held' && b?.status === 'held' && an !== bn) changes.push({ type: 'holder_changed', tier: k, previous_holder: a.holder.source_name, holder: b.holder.source_name, reign_start: b.reign_start });
    else if (!a && b) changes.push({ type: 'belt_listed', tier: k, status: b.status, holder: b.holder?.source_name ?? null });
    else if (a && !b) changes.push({ type: 'belt_no_longer_listed', tier: k, previous_status: a.status });
  }
  return { title_changes: changes, ranking_changes: diffRankings({ entries: prev?.ranking?.entries ?? [] }, { entries: cur?.ranking?.entries ?? [] }) };
}

// The existing ranking import contract (shared/rankings/import.mjs), for when a body's source is approved.
export function toRankingDocument(s, { sourceKey }) {
  return {
    source_key: sourceKey, organization_slug: s.snapshot.body, division_label: s.division.native_label ?? s.division.key, gender_scope: 'male',
    published_on: s.snapshot.published_on, effective_on: s.snapshot.as_of, source_url: s.snapshot.source_url,
    entries: s.ranking.entries.map((e) => (e.is_vacant ? { position: e.position, rank_label: e.rank_label, is_vacant: true }
      : { position: e.position, rank_label: e.rank_label, source_name: e.source_name, nationality: e.country ?? null, source_fighter_id: e.wba_id ?? null, designation: e.regional_label ?? null })),
  };
}
