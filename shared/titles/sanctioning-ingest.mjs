// Sanctioning-body collection (owner approvals 2026-09-14): WBA, IBF, WBO. WBC is not licensed and has no collector.
//
//   runSanctioningCollection(store, env, { body: 'wba'|'ibf'|'wbo', mode: 'current'|'backfill', months?, maxRequests? })
//
// Every run: gate (TITLES_INGEST_ENABLED, verified target, approved source), polite fetching (IBF >= 10 s apart, WBA/WBO
// >= 5 s; a dropped connection is retried twice and recorded in metrics.fetch_errors), fail-closed structure checks,
// normalized title status snapshots + ranking snapshots + claims, identity only through reviewed decisions (every other
// name is held for review, never matched by name), snapshot diffs -> title-event PROPOSALS, conflicts between two
// documents of the same body. Nothing here writes title lineage (boxing_title_events).
// Backfill is checkpointed in boxing_source_backfill_checkpoints and resumes where it stopped.

import { contentHash, sha256Hex } from '../canonical.mjs';
import { normalizedAlias } from '../identity/normalize.mjs';
import { withTemporalMode } from '../news/temporal.mjs';
import { importRankingDocument } from '../rankings/import.mjs';
import { parseWbaChampionsPage, parseWbaRankingPage } from '../adapters/sanctioning/wba.mjs';
import { parseIbfResponse } from '../adapters/sanctioning/ibf.mjs';
import { parseWboChampionsPage, parseWboHistoryHtml, parseWboRatingsText } from '../adapters/sanctioning/wbo.mjs';
import { DIVISIONS } from '../adapters/sanctioning/vocabulary.mjs';
import { ibfSnapshot, intraBodyConflicts, titleStatusChanges, toRankingDocument, wbaChampionsSnapshot, wbaRankingSnapshots, wboChampionsSnapshot,
  wboRatingsSnapshots } from './sanctioning-snapshot.mjs';

export const TITLES_WORKER = 'boxing-rankings';
export const USER_AGENT = 'PropBetEdge-Boxing/1.0 (+https://propbetedge.ai; official sanctioning-body records; low-rate)';
export const PARSER_VERSIONS = Object.freeze({ wba_ranking: 'wba-ranking@1.0.0', wba_champions: 'wba-champions@1.0.0', ibf_rating: 'ibf-rating@1.0.0', wbo_ratings: 'wbo-ratings@1.0.0', wbo_champions: 'wbo-champions@1.0.0' });
export const MIN_INTERVAL_MS = Object.freeze({ wba: 5000, ibf: 11000, wbo: 5000 });
export const URLS = Object.freeze({
  wbaRanking: 'https://www.wbaboxing.com/wba-ranking', wbaChampions: 'https://www.wbaboxing.com/current-wba-champions',
  ibfFilter: 'https://www.ibf-usba-boxing.com/wp-json/ratings/v1/filter', wboRankings: 'https://wboboxing.com/rankings/', wboChampions: 'https://wboboxing.com/male-champions/',
});
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export class StructureError extends Error {
  constructor(message) { super(message); this.code = 'unexpected_structure'; }
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256Bytes(bytes) { return hex(await crypto.subtle.digest('SHA-256', bytes)); }

// One request at a time, a minimum interval between requests, two retries on a dropped connection (never on an HTTP
// status), every thrown attempt recorded.
export function politeClient(fetchImpl, { minIntervalMs, metrics, sleep = defaultSleep, retryDelaysMs = [2000, 5000], now = () => Date.now() }) {
  let last = 0;
  return async function request(url, { method = 'GET', body = null, accept = 'text/html,*/*', binary = false } = {}) {
    for (let attempt = 0; ; attempt++) {
      const wait = last + minIntervalMs - now();
      if (wait > 0) await sleep(wait);
      last = now();
      metrics.requests = (metrics.requests ?? 0) + 1;
      try {
        const res = await fetchImpl(url, { method, body, headers: { 'user-agent': USER_AGENT, accept, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) } });
        if (!res.ok) throw Object.assign(new Error(`http_${res.status} ${url}`), { httpStatus: res.status });
        const bytes = new Uint8Array(await res.arrayBuffer());
        return { bytes, text: binary ? null : new TextDecoder().decode(bytes), contentType: res.headers.get('content-type'), retrievedAt: new Date().toISOString() };
      } catch (err) {
        if (err.httpStatus) { metrics.http_errors = (metrics.http_errors ?? 0) + 1; throw err; }
        (metrics.fetch_errors ??= []).push({ url: String(url).slice(0, 200), error: String(err?.message ?? err).slice(0, 120) });
        if (attempt >= retryDelaysMs.length) throw err;
        await sleep(retryDelaysMs[attempt]);
      }
    }
  };
}

// ---- fail-closed structure checks ------------------------------------------------------------------------------------

export function checkWbaRanking(parsed, { expectLabel = null } = {}) {
  if (!parsed.as_of_label) throw new StructureError('wba ranking: no "Ranking as of" label');
  if (expectLabel && parsed.as_of_label !== expectLabel) throw new StructureError(`wba ranking: asked for ${expectLabel}, page says ${parsed.as_of_label}`);
  if (parsed.divisions.length < 10) throw new StructureError(`wba ranking: ${parsed.divisions.length} divisions`);
  const empty = parsed.divisions.filter((d) => !d.entries.length || d.entries.some((e, i) => e.position !== i + 1));
  if (empty.length > 2) throw new StructureError(`wba ranking: ${empty.length} divisions without a clean numbered list`);
  return parsed;
}
export function checkWbaChampions(parsed) {
  if (parsed.rows.length < 10) throw new StructureError(`wba champions: ${parsed.rows.length} rows`);
  return parsed;
}
export function checkIbfResponse(json, { slug }) {
  if (!Array.isArray(json) || !json.length) throw new StructureError(`ibf ${slug}: not a non-empty array`);
  for (const r of json) {
    for (const k of ['title', 'rating_month', 'post_date', 'ratings', 'champ', 'wba', 'wbc', 'wbo']) if (!(k in r)) throw new StructureError(`ibf ${slug}: record without ${k}`);
    if (!/^\d{8}$/.test(String(r.rating_month))) throw new StructureError(`ibf ${slug}: rating_month ${r.rating_month}`);
  }
  return json;
}
export function checkWboRatings(parsed) {
  if (!parsed.as_of && !parsed.month) throw new StructureError('wbo ratings: no date');
  if (parsed.divisions.length < 15) throw new StructureError(`wbo ratings: ${parsed.divisions.length} divisions`);
  if (parsed.divisions.some((d) => d.entries.length === 0)) throw new StructureError('wbo ratings: a division without a numbered list');
  return parsed;
}
export function checkWboChampions(parsed) {
  if (parsed.cards.length < 10) throw new StructureError(`wbo champions: ${parsed.cards.length} cards`);
  return parsed;
}
// the only link accepted is the one the rankings page publishes; a token is never built or guessed
export function wboPdfLink(html) {
  const links = [...new Set([...String(html).matchAll(/(?:https:\/\/wboboxing\.com\/)?(wborankings\/report\/[A-Za-z0-9=+/]+\/RankingReportMale)/g)].map((m) => m[1]))];
  if (links.length !== 1) throw new StructureError(`wbo rankings page: ${links.length} male report links`);
  return `https://wboboxing.com/${links[0]}`;
}

async function pdfText(bytes) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  await pdf.destroy?.();
  return text.join('\n=====PAGE=====\n');
}

// ---- persistence of one normalized document ----------------------------------------------------------------------------

const monthEnd = (y, m) => new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
const titlesFromJson = (j) => ({ titles: (j?.belts ?? []).map((b) => ({ lineage: { tier: b.tier }, native_designation: b.designation, status: b.status, holder: b.holder ? { source_name: b.holder.name } : null, reign_start: b.reign_start })),
  snapshot: { document: j?.document_kind } });

function identityCache(store, org) {
  const resolved = new Map();
  const held = new Set();
  return {
    async resolve({ name, country, orgBoxerId, kind, metrics }) {
      const normalized = normalizedAlias(name);
      const key = `${normalized}|${country ?? ''}|${orgBoxerId ?? ''}`;
      if (!resolved.has(key)) resolved.set(key, await store.orgIdentityResolution(org, normalized, country ?? null, orgBoxerId ?? null));
      const fighter = resolved.get(key);
      if (fighter) { metrics.identities_resolved = (metrics.identities_resolved ?? 0) + 1; return { fighter_id: fighter, normalized }; }
      metrics.identities_held = (metrics.identities_held ?? 0) + 1;
      if (!held.has(key)) { held.add(key); await store.holdOrgIdentity({ organization_slug: org, source_name: name, normalized_name: normalized, country, org_boxer_id: orgBoxerId, document_kind: kind }); }
      return { fighter_id: null, normalized };
    },
  };
}

// A division label the vocabulary does not know is written as a pending_review org division (the database refuses the
// document in the same call), so it reaches review instead of living only in run metrics. Nothing else is stored.
export async function holdUnknownDivision(store, { body, kind, sourceKey, nativeLabel, limitText, metrics }) {
  const r = await store.importTitleStatusSnapshot({ source_key: sourceKey, organization_slug: body, gender_scope: 'male', document_kind: kind,
    division_native_label: nativeLabel, division_limit_text: limitText ?? null, entries: [], claims: [] });
  (metrics.refused ??= []).push({ kind, division: nativeLabel, reason: r.reason ?? 'unknown_division' });
  return r;
}

export async function persistSnapshot(store, snap, { body, kind, sourceKey, runId, retrievedAt, documentSha256, identities, metrics, divisionNativeLabel, asOf, publishedOn, asOfLabel, pairWith = [] }) {
  const entries = [];
  for (const t of snap.titles) {
    const id = t.status === 'vacant' ? { fighter_id: null, normalized: null } : await identities.resolve({ name: t.holder.source_name, country: t.holder.country, orgBoxerId: t.holder.source_fighter_id, kind, metrics });
    entries.push({
      designation_native: t.native_designation, holder_status: t.status, holder_source_name: t.holder?.source_name ?? null, holder_normalized_name: id.normalized,
      holder_country: t.holder?.country ?? null, holder_org_boxer_id: t.holder?.source_fighter_id ?? null, fighter_id: id.fighter_id,
      reign_start_on: t.reign_start?.on ?? null, reign_start_basis: t.reign_start?.basis ?? null, last_defense_on: t.last_defense_on ?? null,
      previous_holder_as_printed: t.previous_holder_as_printed ?? null, ignored_fields: null, mandatory: t.mandatory ?? null,
    });
  }
  const claims = (snap.claims_about_other_bodies ?? []).filter((c) => ['wbc', 'wba', 'ibf', 'wbo'].includes(c.about) && c.about !== body)
    .map((c) => ({ about: c.about, source_name: c.source_name ?? null, vacant: Boolean(c.vacant), blank: Boolean(c.blank) || (!c.source_name && !c.vacant), native_text: c.native_text, where: c.where ?? null }));
  const normalized = { body, kind, division: divisionNativeLabel, as_of: asOf, published_on: publishedOn, as_of_label: asOfLabel,
    titles: entries.map(({ fighter_id, holder_normalized_name, ...e }) => e), claims, warnings: snap.warnings ?? [] };
  const payload = {
    source_key: sourceKey, organization_slug: body, gender_scope: 'male', document_kind: kind, division_native_label: divisionNativeLabel,
    division_limit_text: snap.division.limit_text ?? null, source_url: snap.snapshot.source_url, published_on: publishedOn, as_of: asOf, as_of_label: asOfLabel,
    retrieved_at: retrievedAt, document_sha256: documentSha256, parser_version: PARSER_VERSIONS[kind], ingest_run_id: runId,
    content_hash: await contentHash(normalized), normalized, entries, claims,
  };
  const r = await store.importTitleStatusSnapshot(payload);
  metrics.status_snapshots ??= {};
  metrics.status_snapshots[r.status] = (metrics.status_snapshots[r.status] ?? 0) + 1;
  if (r.status === 'refused') { (metrics.refused ??= []).push({ kind, division: divisionNativeLabel, reason: r.reason, labels: r.designations ?? r.division ?? null }); return r; }
  if (r.status !== 'created') return r;
  const current = await store.titleSnapshotJson(r.snapshot_id);
  const previous = r.previous_snapshot_id ? await store.titleSnapshotJson(r.previous_snapshot_id) : null;
  const changes = previous ? titleStatusChanges(titlesFromJson(previous), titlesFromJson(current)).title_changes : [];
  const holderIds = new Map(entries.filter((e) => e.fighter_id).map((e) => [normalizedAlias(e.holder_source_name), e.fighter_id]));
  const conflicts = [];
  for (const other of pairWith) {
    const otherId = await store.latestTitleSnapshot(body, snap.division.key, 'male', other.kind);
    if (!otherId || otherId === r.snapshot_id) continue;
    const o = await store.titleSnapshotJson(otherId);
    // documents far apart in time describe different moments, not a conflict
    const at = (j) => Date.parse(j.as_of ?? j.published_on ?? j.retrieved_at);
    if (Math.abs(at(o) - at(current)) > 45 * 86_400_000) continue;
    const a = { ...titlesFromJson(current), snapshot: { document: kind } };
    const b = { ...titlesFromJson(o), snapshot: { document: other.kind } };
    for (const c of intraBodyConflicts(a, b).conflicts) conflicts.push({ belt: c.belt, left_snapshot_id: r.snapshot_id, right_snapshot_id: otherId, left_value: c[kind], right_value: c[other.kind], same_surname: c.same_surname });
  }
  const analysis = await store.recordTitleAnalysis({ current_snapshot_id: r.snapshot_id, previous_snapshot_id: r.previous_snapshot_id,
    title_changes: changes.map((c) => ({ ...c, holder_fighter_id: c.holder ? holderIds.get(normalizedAlias(c.holder)) ?? null : null })), conflicts });
  metrics.proposals = (metrics.proposals ?? 0) + (r.previous_snapshot_id ? changes.length : 0);
  metrics.conflicts = (metrics.conflicts ?? 0) + conflicts.length;
  return { ...r, analysis };
}

export async function persistRanking(store, snap, { body, kind, sourceKey, retrievedAt, documentSha256, identities, metrics, asOf, publishedOn, asOfLabel }) {
  const doc = toRankingDocument(snap, { sourceKey });
  const last = doc.entries.length;
  const outside = (snap.ranking.outside_numbered_list ?? []).map((e, i) => ({ position: last + i + 1, rank_label: '**', source_name: e.source_name, nationality: e.country ?? null, designation: e.regional_label ?? null, outside: true }));
  const byPosition = new Map([...snap.ranking.entries, ...(snap.ranking.outside_numbered_list ?? []).map((e, i) => ({ ...e, position: last + i + 1 }))].map((e) => [e.position, e]));
  const r = await importRankingDocument(store, { ...doc, entries: [...doc.entries, ...outside], published_on: publishedOn, effective_on: asOf }, {
    weightClassKey: snap.division.key,
    resolveEntry: async (e) => {
      const id = await identities.resolve({ name: e.source_name, country: e.nationality, orgBoxerId: e.source_fighter_id, kind, metrics });
      return id.fighter_id ? { fighter_id: id.fighter_id, method: 'org_identity_review' } : null;
    },
    entryMetadata: (e) => {
      const src = byPosition.get(e.position) ?? {};
      return { regional_label: src.regional_label ?? null, country: src.country ?? null, country_label: src.country_label ?? null, org_boxer_id: src.wba_id ?? null,
        not_rated: Boolean(src.not_rated), outside_numbered_list: e.rank_label === '**' };
    },
    sourceRecord: { document_kind: kind, as_of_label: asOfLabel, division_native_label: snap.division.native_label, division_limit_text: snap.division.limit_text ?? null,
      retrieved_at: retrievedAt, document_sha256: documentSha256, parser_version: PARSER_VERSIONS[kind], champions_listed_outside_numbers: true, attribution: body.toUpperCase() },
  });
  metrics.ranking_snapshots ??= {};
  metrics.ranking_snapshots[r.status] = (metrics.ranking_snapshots[r.status] ?? 0) + 1;
  if (r.status === 'rejected') (metrics.refused ??= []).push({ kind, division: snap.division.native_label, reason: r.problems?.join('; ') });
  return r;
}

// ---- per body --------------------------------------------------------------------------------------------------------

async function collectWba(ctx, { month = null }) {
  const { request, store, sourceKey, runId, identities, metrics } = ctx;
  const res = month ? await request(URLS.wbaRanking, { method: 'POST', body: `dates=${month.y}:${month.m}:` }) : await request(URLS.wbaRanking);
  const expectLabel = month ? `${MONTH_NAMES[month.m - 1].toUpperCase()} ${month.y}` : null;
  const parsed = checkWbaRanking(parseWbaRankingPage(res.text), { expectLabel });
  const [labelMonth, labelYear] = parsed.as_of_label.split(' ');
  const asOf = monthEnd(Number(labelYear), MONTH_NAMES.findIndex((n) => n.toUpperCase() === labelMonth) + 1);
  const sha = await sha256Bytes(res.bytes);
  const meta = { sourceUrl: month ? `${URLS.wbaRanking} (month ${month.y}-${String(month.m).padStart(2, '0')})` : URLS.wbaRanking, retrievedAt: res.retrievedAt, contentSha256: sha };
  const snaps = wbaRankingSnapshots(parsed, meta);
  let champions = null;
  if (!month) {
    const cres = await request(URLS.wbaChampions);
    champions = { parsed: checkWbaChampions(parseWbaChampionsPage(cres.text)), meta: { sourceUrl: URLS.wbaChampions, retrievedAt: cres.retrievedAt, contentSha256: await sha256Bytes(cres.bytes) } };
  }
  for (const s of snaps) {
    if (!s.division.key) { await holdUnknownDivision(store, { body: 'wba', kind: 'wba_ranking', sourceKey, nativeLabel: s.division.native_label, limitText: s.division.limit_text, metrics }); continue; }
    const common = { body: 'wba', sourceKey, runId, retrievedAt: res.retrievedAt, documentSha256: sha, identities, metrics, asOf, publishedOn: parsed.published_on, asOfLabel: parsed.as_of_label };
    await persistSnapshot(store, s, { ...common, kind: 'wba_ranking', divisionNativeLabel: s.division.native_label, pairWith: [{ kind: 'wba_champions' }] });
    await persistRanking(store, s, { ...common, kind: 'wba_ranking' });
  }
  if (champions) {
    const keys = [...new Set(champions.parsed.rows.map((r) => r.division.weight_class_key).filter(Boolean))];
    const label = Object.fromEntries(Object.entries(DIVISIONS.wba).map(([k, v]) => [v, k]));
    for (const key of keys) {
      const s = { ...wbaChampionsSnapshot(champions.parsed, champions.meta, key), division: { key, native_label: label[key], limit_text: null } };
      await persistSnapshot(store, s, { body: 'wba', sourceKey, runId, retrievedAt: champions.meta.retrievedAt, documentSha256: champions.meta.contentSha256, identities, metrics,
        asOf: champions.meta.retrievedAt.slice(0, 10), publishedOn: null, asOfLabel: null, kind: 'wba_champions', divisionNativeLabel: label[key], pairWith: [{ kind: 'wba_ranking' }] });
    }
  }
  metrics.documents = (metrics.documents ?? 0) + (champions ? 2 : 1);
  return parsed.as_of_label;
}

async function processIbfRecords(ctx, slug, json, { latestOnly }) {
  const { store, sourceKey, runId, identities, metrics } = ctx;
  const records = parseIbfResponse(checkIbfResponse(json, { slug }), { weightSlug: slug }).sort((a, b) => a.results_month_end.localeCompare(b.results_month_end));
  const pick = latestOnly ? records.slice(-1) : records;
  for (const rec of pick) {
    if (!rec.division.weight_class_key) { await holdUnknownDivision(store, { body: 'ibf', kind: 'ibf_rating', sourceKey, nativeLabel: slug, limitText: rec.division.label_as_printed, metrics }); continue; }
    const s = ibfSnapshot(rec, { sourceUrl: `${URLS.ibfFilter}?weight=${slug}&org=ibf`, retrievedAt: ctx.retrievedAt, contentSha256: ctx.sha });
    s.division = { ...s.division, native_label: slug, limit_text: rec.division.label_as_printed };
    const common = { body: 'ibf', kind: 'ibf_rating', sourceKey, runId, retrievedAt: ctx.retrievedAt, documentSha256: ctx.sha, identities, metrics, asOf: rec.results_month_end, publishedOn: rec.published_on, asOfLabel: rec.title_as_printed };
    await persistSnapshot(store, s, { ...common, divisionNativeLabel: slug });
    await persistRanking(store, s, common);
    metrics.months ??= {};
    metrics.months[rec.results_month_end.slice(0, 7)] = (metrics.months[rec.results_month_end.slice(0, 7)] ?? 0) + 1;
  }
  metrics.documents = (metrics.documents ?? 0) + pick.length;
}

async function collectWbo(ctx, { month = null }) {
  const { request, store, sourceKey, runId, identities, metrics } = ctx;
  let parsed; let res; let sourceUrl; let asOf; let asOfLabel = null;
  if (month) {
    const body = new URLSearchParams({ req_ORG: 'World Boxing Organization', req_year: String(month.y), req_month: MONTH_NAMES[month.m - 1], req_category: 'ALL', req_genre: 'M', submit: 'VIEW RANKING' }).toString();
    res = await request(URLS.wboRankings, { method: 'POST', body });
    parsed = parseWboHistoryHtml(res.text);
    if (parsed.month !== `${month.y}-${String(month.m).padStart(2, '0')}`) throw new StructureError(`wbo history: asked for ${month.y}-${month.m}, page says ${parsed.month}`);
    checkWboRatings(parsed);
    sourceUrl = `${URLS.wboRankings} (month ${parsed.month})`;
    asOf = monthEnd(month.y, month.m);
    asOfLabel = parsed.as_of_label;
  } else {
    const page = await request(URLS.wboRankings);
    const link = wboPdfLink(page.text);
    res = await request(link, { accept: 'application/pdf,*/*', binary: true });
    if (String.fromCharCode(...res.bytes.slice(0, 5)) !== '%PDF-') throw new StructureError(`wbo ratings: not a PDF (${res.contentType})`);
    parsed = checkWboRatings(parseWboRatingsText(await ctx.extractPdfText(res.bytes)));
    sourceUrl = `${URLS.wboRankings} (male world ratings PDF)`;
    asOf = parsed.as_of;
  }
  const sha = await sha256Bytes(res.bytes);
  const snaps = wboRatingsSnapshots({ ...parsed, as_of: asOf }, { sourceUrl, retrievedAt: res.retrievedAt, contentSha256: sha });
  for (const s of snaps) {
    if (!s.division.key) { await holdUnknownDivision(store, { body: 'wbo', kind: 'wbo_ratings', sourceKey, nativeLabel: s.division.native_label, limitText: s.division.limit_text, metrics }); continue; }
    const common = { body: 'wbo', kind: 'wbo_ratings', sourceKey, runId, retrievedAt: res.retrievedAt, documentSha256: sha, identities, metrics, asOf, publishedOn: null, asOfLabel };
    await persistSnapshot(store, s, { ...common, divisionNativeLabel: s.division.native_label, pairWith: [{ kind: 'wbo_champions' }] });
    await persistRanking(store, s, common);
  }
  if (!month) {
    const cres = await request(URLS.wboChampions);
    const cparsed = checkWboChampions(parseWboChampionsPage(cres.text));
    const meta = { sourceUrl: URLS.wboChampions, retrievedAt: cres.retrievedAt, contentSha256: await sha256Bytes(cres.bytes) };
    const label = Object.fromEntries(Object.entries(DIVISIONS.wbo).filter(([k]) => k !== 'MINIMUMWEIGHT').map(([k, v]) => [v, k]));
    for (const key of [...new Set(cparsed.cards.map((c) => c.division.weight_class_key).filter(Boolean))]) {
      const s = { ...wboChampionsSnapshot(cparsed, meta, key), division: { key, native_label: label[key], limit_text: null } };
      await persistSnapshot(store, s, { body: 'wbo', kind: 'wbo_champions', sourceKey, runId, retrievedAt: meta.retrievedAt, documentSha256: meta.contentSha256, identities, metrics,
        asOf: meta.retrievedAt.slice(0, 10), publishedOn: null, asOfLabel: null, divisionNativeLabel: label[key], pairWith: [{ kind: 'wbo_ratings' }] });
    }
  }
  metrics.documents = (metrics.documents ?? 0) + (month ? 1 : 2);
}

// ---- run ------------------------------------------------------------------------------------------------------------

export function monthsBetween(from, to) {
  const out = [];
  for (let y = from.y, m = from.m; y < to.y || (y === to.y && m <= to.m); m === 12 ? (y += 1, m = 1) : (m += 1)) out.push({ y, m });
  return out;
}

// extractPdfText is injectable for tests (synthetic documents); the default reads the PDF text layer with unpdf
export async function runSanctioningCollection(store, env, { body, mode = 'current', fetchImpl = fetch, sleep = defaultSleep, months = null, maxRequests = null, now = new Date().toISOString(), provenance = null, extractPdfText = pdfText } = {}) {
  if (!['wba', 'ibf', 'wbo'].includes(body)) return { status: 'blocked', reason: `${body}: no approved collector (WBC is not licensed)` };
  if (env.TITLES_INGEST_ENABLED !== 'true') return { status: 'disabled', reason: 'TITLES_INGEST_ENABLED is not "true"' };
  if (!store?.writeTarget?.verified) return { status: 'blocked', reason: 'store has no verified boxing write target' };
  const sourceKey = `${body}_official`;
  const src = await store.source(sourceKey);
  if (!src?.enabled || src.access_mode !== 'approved_ingest' || !src.latest_rights_review_id) return { status: 'blocked', reason: `${sourceKey} not approved` };
  const writer = mode === 'backfill' ? withTemporalMode(store, 'backfill') : store;
  const metrics = { body, mode, requests: 0, documents: 0 };
  const runId = await store.startRun({ worker: TITLES_WORKER, sourceKey, adapterVersion: PARSER_VERSIONS[`${body}_${body === 'wba' ? 'ranking' : body === 'ibf' ? 'rating' : 'ratings'}`], provenance });
  const request = politeClient(fetchImpl, { minIntervalMs: MIN_INTERVAL_MS[body], metrics, sleep });
  const ctx = { request, store: writer, sourceKey, runId, identities: identityCache(writer, body), metrics, extractPdfText };
  const budget = () => maxRequests != null && metrics.requests >= maxRequests;
  let status = 'ok';
  try {
    if (body === 'ibf') {
      const job = mode === 'backfill' ? 'ibf-history-2005-2026' : null;
      const done = job ? new Set((await store.backfillCheckpoint(sourceKey, job)).completed ?? []) : new Set();
      for (const slug of Object.keys(DIVISIONS.ibf)) {
        if (done.has(slug)) continue;
        if (budget()) { status = 'partial'; metrics.stopped = 'request budget'; break; }
        const res = await request(`${URLS.ibfFilter}?weight=${slug}&org=ibf${mode === 'backfill' ? '&ppp=-1' : ''}`, { accept: 'application/json' });
        let json;
        try { json = JSON.parse(res.text); } catch { throw new StructureError(`ibf ${slug}: not JSON (${res.contentType})`); }
        const refusedBefore = metrics.refused?.length ?? 0;
        await processIbfRecords({ ...ctx, retrievedAt: res.retrievedAt, sha: await sha256Bytes(res.bytes) }, slug, json, { latestOnly: mode !== 'backfill' });
        // a division with refused documents stays open, so a resume after review re-reads it (stored months are duplicates)
        const refused = (metrics.refused ?? []).slice(refusedBefore);
        if (job && refused.length) await store.backfillCheckpoint(sourceKey, job, { failure: [{ slug, refused: refused.length, reasons: [...new Set(refused.map((x) => x.reason))] }] });
        else if (job) await store.backfillCheckpoint(sourceKey, job, { completed: slug, cursor: { last_slug: slug, at: new Date().toISOString() } });
      }
    } else if (mode === 'current') {
      if (body === 'wba') await collectWba(ctx, {});
      else await collectWbo(ctx, {});
    } else {
      const job = `${body}-history`;
      const list = months ?? [];
      const done = new Set((await store.backfillCheckpoint(sourceKey, job)).completed ?? []);
      for (const month of list) {
        const key = `${month.y}-${String(month.m).padStart(2, '0')}`;
        if (done.has(key)) continue;
        if (budget()) { status = 'partial'; metrics.stopped = 'request budget'; break; }
        try {
          const refusedBefore = metrics.refused?.length ?? 0;
          if (body === 'wba') await collectWba(ctx, { month });
          else await collectWbo(ctx, { month });
          metrics.months ??= {};
          metrics.months[key] = 1;
          // a month with a refused division or designation stays open for a resume after review
          const refused = (metrics.refused ?? []).slice(refusedBefore);
          if (refused.length) await store.backfillCheckpoint(sourceKey, job, { failure: [{ month: key, refused: refused.length, reasons: [...new Set(refused.map((x) => x.reason))] }] });
          else await store.backfillCheckpoint(sourceKey, job, { completed: key, cursor: { last_month: key, at: new Date().toISOString() } });
        } catch (err) {
          if (!(err instanceof StructureError) && !err.httpStatus) throw err;
          // a month the source cannot serve in the expected shape is recorded and skipped, never guessed
          await store.backfillCheckpoint(sourceKey, job, { failure: [{ month: key, error: String(err.message).slice(0, 200) }] });
          (metrics.month_failures ??= []).push({ month: key, error: String(err.message).slice(0, 120) });
        }
      }
    }
  } catch (err) {
    status = 'failed';
    metrics.error = String(err?.message ?? err).slice(0, 300);
    metrics.error_code = err?.code ?? null;
  }
  if (status === 'ok' && (metrics.refused?.length || metrics.month_failures?.length || metrics.http_errors)) status = 'partial';
  await store.finishRun(runId, { status, metrics, observed: metrics.documents, canonicalWrites: 0, reviewItems: metrics.identities_held ?? 0, errors: (metrics.http_errors ?? 0) + (status === 'failed' ? 1 : 0),
    assertions: status === 'failed' ? { error: metrics.error } : {} });
  return { runId, status, metrics };
}
