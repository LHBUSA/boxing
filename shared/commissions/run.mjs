// Commission ingestion runs (Nevada, Florida, New Jersey, Missouri, Pennsylvania, Tennessee; Texas is disabled).
//
// Gates (fail closed): COMMISSION_INGEST_ENABLED="true"; verified boxing write
// target; adapter.remote.enabled; source row approved_ingest + enabled +
// persistence + recorded rights review.
//
// Politeness: one request at a time, a fixed delay between document fetches,
// a per-run document cap, identifying User-Agent, and documents re-fetched
// only when new, recently dated (revision watch) or in backfill mode.
// A changed document (new sha256) is a NEW revision + observation; the prior
// revision and observation are never overwritten.

import { configHash } from '../provenance.mjs';
import { sha256Hex } from '../canonical.mjs';
import { withTemporalMode } from '../news/temporal.mjs';
import { assignBoutIds } from '../adapters/commissions/contract.mjs';
import { sourceApprovalFor } from './gates.mjs';
import { applyCommissionParsed } from './apply.mjs';
import { NEVADA, parseCalendar, parseNevadaResults, parseResultsIndex, resultsIndexUrl } from '../adapters/commissions/nevada.mjs';
import { FLORIDA, parseFloridaResults, parseResultsListing, parseUpcoming } from '../adapters/commissions/florida.mjs';
import { NEW_JERSEY, isOfficialNjUrl, parseNjResults, parseNjSchedule } from '../adapters/commissions/new-jersey.mjs';
import { TEXAS } from '../adapters/commissions/texas.mjs';
import { MISSOURI, parseMissouriIndex, parseMissouriResults } from '../adapters/commissions/missouri.mjs';
import { PENNSYLVANIA, parsePennsylvaniaIndex, parsePennsylvaniaResults } from '../adapters/commissions/pennsylvania.mjs';
import { TENNESSEE, parseTennesseeIndex, parseTennesseeResults } from '../adapters/commissions/tennessee.mjs';
import { SPORT } from '../adapters/commissions/contract.mjs';
import { extractPositionedText, sha256Bytes } from '../adapters/commissions/pdf.mjs';
import { assertMinimized } from '../adapters/commissions/minimize.mjs';

export const COMMISSION_ADAPTERS = Object.freeze({ nevada: NEVADA, florida: FLORIDA, new_jersey: NEW_JERSEY, missouri: MISSOURI, pennsylvania: PENNSYLVANIA, tennessee: TENNESSEE, texas: TEXAS });
export const USER_AGENT = 'PropBetEdge-Boxing/1.0 (+https://propbetedge.ai; official commission records; low-rate)';
const DAY = 86_400_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// true when the document's current stored parse came from a parser version the adapter lists in
// supersedesParserVersions (null = a revision recorded before parser versions were stored)
export function parseSuperseded(adapter, state) {
  if (!(state?.current_revision > 0)) return false;
  const stored = state.parser_version ?? null;
  return stored !== adapter.version && (adapter.supersedesParserVersions ?? []).includes(stored);
}

// A connection reset before any response (tn.gov drops reused connections: "fetch failed") is retried twice, a few
// seconds apart; an HTTP error status is an answer and is never retried.
export async function fetchWithRetry(fetchImpl, url, init, { retryDelaysMs = [2000, 5000] } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await fetchImpl(url, init); } catch (err) {
      if (attempt >= retryDelaysMs.length) throw err;
      await sleep(retryDelaysMs[attempt]);
    }
  }
}

async function fetchOk(fetchImpl, url, { binary = false } = {}) {
  const res = await fetchWithRetry(fetchImpl, url, { headers: { 'user-agent': USER_AGENT, accept: binary ? 'application/pdf,*/*' : 'text/html,text/calendar,*/*' } });
  if (!res.ok) throw Object.assign(new Error(`http_${res.status} ${url}`), { httpStatus: res.status });
  return { body: binary ? new Uint8Array(await res.arrayBuffer()) : await res.text(), lastModified: res.headers.get('last-modified'), contentType: res.headers.get('content-type') };
}

const summarize = (parsed) => ({ classification: parsed.classification, events: parsed.events.length, bouts: parsed.bouts.length,
  rejected: parsed.rejected.map((r) => r.reason), problems: parsed.problems?.slice(0, 5) ?? [] });

// extract: PDF bytes -> positioned pages (injectable for tests)
export async function runCommissionIngest(store, env, { adapterKey, fetchImpl = fetch, now = new Date().toISOString(), provenance = null,
  mode = 'forward', years = null, maxDocuments = null, delayMs = null, extract = extractPositionedText, changeReason = null } = {}) {
  const adapter = COMMISSION_ADAPTERS[adapterKey];
  if (!adapter) return { status: 'blocked', assertions: { adapter: `unknown adapter ${adapterKey}` } };
  if (env.COMMISSION_INGEST_ENABLED !== 'true') return { status: 'disabled', reason: 'COMMISSION_INGEST_ENABLED is not "true"' };
  if (!store?.writeTarget?.verified) return { status: 'blocked', assertions: { write_target: 'store has no verified boxing write target' } };
  // backfilled past facts are history, not news (payload.temporal, state skipped)
  if (mode === 'backfill') store = withTemporalMode(store, 'backfill');
  if (!adapter.remote.enabled) return { status: 'blocked', assertions: { remote: adapter.remote.reason } };
  const src = await store.source(adapter.sourceKey);
  const refusal = sourceApprovalFor(adapter.sourceKey, src);
  if (refusal) return { status: 'blocked', assertions: { source_policy: refusal } };

  // the real extractor may be adapter-specific (Tennessee reads drawn radio marks); tests inject their own extractor
  const realExtractor = extract === extractPositionedText;
  const extractor = realExtractor && adapter.extractDocument ? adapter.extractDocument : extract;
  const cap = maxDocuments ?? Number(env.COMMISSION_MAX_DOCUMENTS ?? (mode === 'backfill' ? 80 : 12));
  const pause = delayMs ?? Number(env.COMMISSION_FETCH_DELAY_MS ?? 1500);
  const nowMs = Date.parse(now);
  const cfg = { adapter: adapter.version, mode, cap, pause, years };
  const prov = provenance ? { ...provenance, source_version: adapter.version, config_hash: await configHash(cfg) } : null;
  const runId = await store.startRun({ worker: 'boxing-commissions', sourceKey: adapter.sourceKey, adapterVersion: adapter.version, provenance: prov });
  const metrics = { adapter: adapterKey, mode, documents_listed: 0, documents_fetched: 0, documents_changed: 0, documents_unchanged: 0, documents_rejected: 0,
    documents_skipped: 0, documents_parser_pending: 0, parse_failures: 0, http_errors: 0, events_observed: 0, bouts_observed: 0, rejected_reasons: {}, apply: {} };
  const merge = (s) => {
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === 'number') metrics.apply[k] = (metrics.apply[k] ?? 0) + v;
      else if (k === 'news') for (const [t, n] of Object.entries(v)) { metrics.apply.news ??= {}; metrics.apply.news[t] = (metrics.apply.news[t] ?? 0) + n; }
      else if (k === 'review_items') { metrics.apply.review_items ??= []; metrics.apply.review_items.push(...v); }
      else if (k === 'graph_decisions') for (const [t, n] of Object.entries(v)) { metrics.apply.graph_decisions ??= {}; metrics.apply.graph_decisions[t] = (metrics.apply.graph_decisions[t] ?? 0) + n; }
      else if (k === 'skipped') { metrics.apply.skipped_reasons ??= {}; for (const x of v) metrics.apply.skipped_reasons[x.reason] = (metrics.apply.skipped_reasons[x.reason] ?? 0) + 1; }
    }
  };
  // an official index that parses to zero result documents is never a quiet success (2026-09-14: the Nevada 2026
  // index answered 200 with a page carrying no result links, and the run reported ok with nothing listed)
  const noteEmptyIndex = (docKey) => { (metrics.empty_indexes ??= []).push(docKey); };
  const reject = (reasons) => { for (const r of reasons) metrics.rejected_reasons[r] = (metrics.rejected_reasons[r] ?? 0) + 1; };

  // Records a listing/feed fetch as a document revision (changed only when content hash differs).
  const recordListing = async (docKey, url, kind, text, lastModified) => {
    // volatile generation stamps (iCal DTSTAMP, WordPress nonces) are not content changes
    const stable = String(text).replace(/^DTSTAMP:.*$/gm, '').replace(/nonce["'=:\s]+[a-f0-9]{8,}/gi, '');
    const sha = await sha256Bytes(new TextEncoder().encode(stable));
    return store.recordDocumentFetch({ source_key: adapter.sourceKey, doc_key: docKey, url, kind, sha256: sha, http_last_modified: lastModified, fetched_at: now, ingest_run_id: runId, status: 'parsed' });
  };

  // Fetches, versions and applies one result document.
  const processDocument = async (ref, parse) => {
    const state = (await store.documentState(adapter.sourceKey, [ref.doc_key]))[ref.doc_key];
    const recent = ref.event_date && Math.abs(nowMs - Date.parse(`${ref.event_date}T00:00:00Z`)) <= 45 * DAY;
    const staleCheck = !state?.last_checked_at || nowMs - Date.parse(state.last_checked_at) >= 7 * DAY;
    // a stored parse the adapter explicitly declares superseded (a reviewed parser fix) is re-checked and
    // re-parsed in forward mode too, still within the per-run cap; undeclared older versions are left alone
    const parserOutdated = parseSuperseded(adapter, state);
    if (mode !== 'backfill' && state?.current_revision > 0 && state.status !== 'error' && !(recent && staleCheck) && !parserOutdated) { metrics.documents_skipped += 1; return; }
    if (metrics.documents_fetched >= cap) { metrics.documents_skipped += 1; return; }
    if (parserOutdated) metrics.documents_parser_superseded = (metrics.documents_parser_superseded ?? 0) + 1;
    if (metrics.documents_fetched > 0 && pause > 0) await sleep(pause);
    let fetched;
    try { fetched = await fetchOk(fetchImpl, ref.url, { binary: true }); } catch (err) {
      metrics.http_errors += 1;
      await store.recordDocumentFetch({ source_key: adapter.sourceKey, doc_key: ref.doc_key, url: ref.url, kind: 'results', sport_hint: ref.sport_hint, status: 'error', error: String(err.message).slice(0, 200), fetched_at: now });
      return;
    }
    metrics.documents_fetched += 1;
    // a listed document that is not a PDF (a site error page served with 200) is a source-side fault, not a parse failure
    // (checked for the real PDF extractor; tests inject a synthetic extractor and synthetic bytes)
    const magic = String.fromCharCode(...fetched.body.slice(0, 5));
    if (realExtractor && magic !== '%PDF-') {
      metrics.documents_not_pdf = (metrics.documents_not_pdf ?? 0) + 1;
      await store.recordDocumentFetch({ source_key: adapter.sourceKey, doc_key: ref.doc_key, url: ref.url, kind: 'results', sport_hint: ref.sport_hint, status: 'error',
        error: `not_a_pdf: ${String(fetched.contentType ?? 'unknown content type').slice(0, 60)}`, fetched_at: now });
      return;
    }
    const sha = await sha256Bytes(fetched.body);
    // unchanged content is not re-parsed, unless the previous attempt failed (fixed parser)
    if (state?.current_sha256 === sha && state.status !== 'error' && !parserOutdated && (!state.parser_version || state.parser_version === adapter.version)) {
      metrics.documents_unchanged += 1;
      await store.recordDocumentFetch({ source_key: adapter.sourceKey, doc_key: ref.doc_key, url: ref.url, kind: 'results', sport_hint: ref.sport_hint, sha256: sha, http_last_modified: fetched.lastModified, fetched_at: now, ingest_run_id: runId });
      return;
    }
    let parsed;
    try {
      parsed = parse(ref, await extractor(fetched.body), { sourceRevision: `sha256:${sha.slice(0, 16)}` });
    } catch (err) {
      metrics.parse_failures += 1;
      // no revision for a failed parse: the document stays retryable when the parser is fixed
      await store.recordDocumentFetch({ source_key: adapter.sourceKey, doc_key: ref.doc_key, url: ref.url, kind: 'results', sport_hint: ref.sport_hint,
        fetched_at: now, status: 'error', error: `parse: ${String(err.message).slice(0, 180)}` });
      return;
    }
    reject(parsed.rejected.map((r) => r.reason));
    const accepted = parsed.classification.accepted;
    const observation = await store.recordObservation({
      source_key: adapter.sourceKey, ingest_run_id: runId, entity_type: accepted ? 'commission_results_document' : 'commission_document_rejected',
      // a re-parse of the same bytes by a newer parser is a new observation (the stored parse must match its parser)
      external_key: ref.doc_key, source_url: ref.url, content_hash: await sha256Hex(`${sha}|${adapter.version}`), parser_version: adapter.version, source_published_at: now,
      payload: assertMinimized({ doc_key: ref.doc_key, url: ref.url, sha256: sha, http_last_modified: fetched.lastModified, summary: summarize(parsed),
        document: accepted ? parsed.minimized : null, events: accepted ? parsed.events : [], bouts: accepted ? parsed.bouts : [] }),
    });
    const rev = await store.recordDocumentFetch({ source_key: adapter.sourceKey, doc_key: ref.doc_key, url: ref.url, kind: 'results', sport_hint: ref.sport_hint, sha256: sha,
      http_last_modified: fetched.lastModified, fetched_at: now, ingest_run_id: runId, observation_id: observation.id, parser_version: adapter.version,
      status: accepted ? 'parsed' : 'rejected', classification: parsed.classification, parse_summary: summarize(parsed) });
    metrics.documents_changed += 1;
    if (rev.revision > 1) metrics.revisions_observed = (metrics.revisions_observed ?? 0) + 1;
    if (!accepted) { metrics.documents_rejected += 1; reject([`document:${parsed.classification.sport}`]); return; }
    metrics.events_observed += parsed.events.length;
    metrics.bouts_observed += parsed.bouts.length;
    merge(await applyCommissionParsed(store, adapter, parsed, { now, changeReason: rev.changed ? null : changeReason ?? `reparsed_with_${adapter.version}` }));
  };

  let status = 'ok';
  try {
    if (adapterKey === 'nevada') {
      const cal = await fetchOk(fetchImpl, NEVADA.calendarUrl);
      const calendar = parseCalendar(cal.body, { now, capturedAt: now });
      const calRev = await recordListing('nv-calendar:professional', NEVADA.calendarUrl, 'calendar', cal.body, cal.lastModified);
      reject(calendar.rejected.map((r) => r.reason.split(':')[0]));
      const window = (e) => (mode === 'backfill' ? (years ?? [new Date(now).getUTCFullYear()]).includes(Number(e.event_date.slice(0, 4))) : Date.parse(`${e.event_date}T00:00:00Z`) >= nowMs - 45 * DAY);
      const calendarEvents = calendar.events.filter(window);
      if (calRev.changed || mode === 'backfill') {
        metrics.events_observed += calendarEvents.length;
        merge(await applyCommissionParsed(store, NEVADA, { events: calendarEvents.filter((e) => Date.parse(`${e.event_date}T00:00:00Z`) >= nowMs - DAY), bouts: [] }, { now }));
      }
      const yearList = years ?? [new Date(now).getUTCFullYear()];
      for (const y of yearList) {
        const idx = await fetchOk(fetchImpl, resultsIndexUrl(y));
        await recordListing(`nv-results-index:${y}`, resultsIndexUrl(y), 'listing', idx.body, idx.lastModified);
        const refs = parseResultsIndex(idx.body, { year: y });
        if (!refs.length) noteEmptyIndex(`nv-results-index:${y}`);
        metrics.documents_listed += refs.length;
        for (const ref of refs) {
          if (ref.sport_hint !== SPORT.BOXING) { metrics.documents_skipped += 1; reject([`listing_not_boxing:${ref.sport_hint}`]); continue; }
          await processDocument(ref, (r, pages, o) => parseNevadaResults(r, pages, { capturedAt: now, calendarEvents: calendar.events, ...o }));
        }
      }
    } else if (adapterKey === 'florida') {
      const up = await fetchOk(fetchImpl, FLORIDA.upcomingUrl);
      const upcoming = parseUpcoming(up.body, { capturedAt: now });
      const upRev = await recordListing('fl-upcoming:professional', FLORIDA.upcomingUrl, 'listing', up.body, up.lastModified);
      reject(upcoming.rejected.map((r) => r.reason));
      if (upRev.changed || mode === 'backfill') {
        metrics.events_observed += upcoming.events.length;
        merge(await applyCommissionParsed(store, FLORIDA, { events: upcoming.events, bouts: [] }, { now }));
      }
      const listing = await fetchOk(fetchImpl, FLORIDA.resultsUrl);
      await recordListing('fl-results:listing', FLORIDA.resultsUrl, 'listing', listing.body, listing.lastModified);
      const listed = parseResultsListing(listing.body);
      if (!listed.length) noteEmptyIndex('fl-results:listing');
      const refs = listed.filter((r) => r.event_date && (mode === 'backfill'
        ? (years ?? [new Date(now).getUTCFullYear()]).includes(Number(r.event_date.slice(0, 4)))
        : Date.parse(`${r.event_date}T00:00:00Z`) >= nowMs - 60 * DAY));
      metrics.documents_listed += refs.length;
      for (const ref of refs) {
        if (![SPORT.UNKNOWN, SPORT.BOXING].includes(ref.sport_hint)) { metrics.documents_skipped += 1; reject([`listing_not_boxing:${ref.sport_hint}`]); continue; }
        await processDocument(ref, (r, pages, o) => parseFloridaResults(r, pages, { capturedAt: now, upcomingEvents: upcoming.events, ...o }));
      }
    } else if (adapterKey === 'new_jersey') {
      const page = await fetchOk(fetchImpl, NEW_JERSEY.scheduleUrl);
      const rev = await recordListing('nj-schedule', NEW_JERSEY.scheduleUrl, 'schedule', page.body, page.lastModified);
      const parsed = parseNjSchedule(page.body, { capturedAt: now });
      if (!parsed.documents.length) noteEmptyIndex('nj-schedule');
      reject(parsed.rejected.map((r) => r.reason.split(':').slice(0, 2).join(':')));
      const events = parsed.events.filter((e) => (mode === 'backfill' ? (years ?? [new Date(now).getUTCFullYear()]).includes(Number(e.event_date.slice(0, 4))) : Date.parse(`${e.event_date}T00:00:00Z`) >= nowMs - 60 * DAY));
      metrics.events_observed += events.length;
      if (rev.changed || mode === 'backfill') merge(await applyCommissionParsed(store, NEW_JERSEY, { events, bouts: [] }, { now }));
      // official SACB result documents only (third-party links were rejected by the schedule parser)
      for (const d of parsed.documents.filter((x) => events.some((e) => e.source_event_id === x.source_event_id))) {
        metrics.documents_listed += 1;
        if (!isOfficialNjUrl(d.url)) { metrics.documents_skipped += 1; reject(['third_party_document_ignored']); continue; }
        await processDocument(d, (r, pages, o) => parseNjResults(r, pages, { capturedAt: now, scheduleEvents: events, ...o }));
      }
    } else if (adapterKey === 'missouri') {
      const index = await fetchOk(fetchImpl, MISSOURI.resultsUrl);
      await recordListing('mo-results:index', MISSOURI.resultsUrl, 'listing', index.body, index.lastModified);
      const indexed = parseMissouriIndex(index.body);
      if (!indexed.length) noteEmptyIndex('mo-results:index');
      const refs = indexed.filter((r) => r.event_date && (mode === 'backfill'
        ? (years ?? [new Date(now).getUTCFullYear()]).includes(Number(r.event_date.slice(0, 4)))
        : Date.parse(`${r.event_date}T00:00:00Z`) >= nowMs - 60 * DAY));
      metrics.documents_listed += refs.length;
      for (const ref of refs) {
        // file-name codes name the sports on the sheet; a boxing code (or none) lets the document decide
        if (![SPORT.UNKNOWN, SPORT.BOXING].includes(ref.sport_hint)) { metrics.documents_skipped += 1; reject([`listing_not_boxing:${ref.sport_hint}`]); continue; }
        await processDocument(ref, (r, pages, o) => parseMissouriResults(r, pages, { capturedAt: now, ...o }));
      }
    } else if (adapterKey === 'pennsylvania') {
      const index = await fetchOk(fetchImpl, PENNSYLVANIA.resultsUrl);
      await recordListing('pa-results:index', PENNSYLVANIA.resultsUrl, 'listing', index.body, index.lastModified);
      const indexed = parsePennsylvaniaIndex(index.body);
      if (!indexed.length) noteEmptyIndex('pa-results:index');
      const refs = indexed.filter((r) => r.event_date && (mode === 'backfill'
        ? (years ?? [new Date(now).getUTCFullYear()]).includes(Number(r.event_date.slice(0, 4)))
        : Date.parse(`${r.event_date}T00:00:00Z`) >= nowMs - 60 * DAY));
      metrics.documents_listed += refs.length;
      for (const ref of refs) {
        if (![SPORT.UNKNOWN, SPORT.BOXING].includes(ref.sport_hint)) { metrics.documents_skipped += 1; reject([`listing_not_boxing:${ref.sport_hint}`]); continue; }
        await processDocument(ref, (r, pages, o) => parsePennsylvaniaResults(r, pages, { capturedAt: now, ...o }));
      }
    } else if (adapterKey === 'tennessee') {
      // current-year page plus the archive page (earlier years): the archive is read for a backfill of earlier years, and
      // in January-February when the forward window reaches back into last year
      const pages = [['tn-results:events', TENNESSEE.resultsUrl]];
      const currentYear = new Date(now).getUTCFullYear();
      if (mode === 'backfill' ? (years ?? [currentYear]).some((y) => y < currentYear) : new Date(now).getUTCMonth() < 2) pages.push(['tn-results:archive', TENNESSEE.archiveUrl]);
      const indexed = [];
      for (const [docKey, url] of pages) {
        const index = await fetchOk(fetchImpl, url);
        await recordListing(docKey, url, 'listing', index.body, index.lastModified);
        const refs = parseTennesseeIndex(index.body);
        if (!refs.length) noteEmptyIndex(docKey);
        for (const r of refs) if (!indexed.some((x) => x.url === r.url)) indexed.push(r);
      }
      const refs = indexed.filter((r) => r.event_date && (mode === 'backfill'
        ? (years ?? [currentYear]).includes(Number(r.event_date.slice(0, 4)))
        : Date.parse(`${r.event_date}T00:00:00Z`) >= nowMs - 60 * DAY));
      metrics.documents_listed += refs.length;
      for (const ref of refs) {
        // the index row names the event type and each link's sport; only boxing links are fetched, the sheet decides the rest
        if (ref.sport_hint !== SPORT.BOXING) { metrics.documents_skipped += 1; reject([`listing_not_boxing:${ref.sport_hint}`]); continue; }
        await processDocument(ref, (r, pages, o) => parseTennesseeResults(r, pages, { capturedAt: now, ...o }));
      }
    }
  } catch (err) {
    status = 'failed';
    metrics.error = String(err?.message ?? err).slice(0, 300);
  }
  if (status === 'ok' && (metrics.http_errors || metrics.parse_failures || metrics.documents_not_pdf || metrics.empty_indexes?.length || metrics.apply.identity_unresolved)) status = 'partial';
  await store.finishRun(runId, { status, metrics, observed: metrics.events_observed + metrics.bouts_observed, canonicalWrites: (metrics.apply.results_created ?? 0) + (metrics.apply.events_created ?? 0),
    reviewItems: metrics.apply.identity_unresolved ?? 0, errors: metrics.http_errors + metrics.parse_failures + (status === 'failed' ? 1 : 0), assertions: status === 'failed' ? { error: metrics.error } : {} });
  if (prov?.invocation_id && store.recordWorkerInvocation) {
    await store.recordWorkerInvocation({ worker: 'boxing-commissions', worker_name: prov.worker_name, worker_version: prov.worker_version, deployment_id: prov.deployment_id,
      invocation_id: `${prov.invocation_id}:${adapterKey}`, trigger_type: prov.trigger_type, cron: prov.cron ?? null, scheduled_for: prov.scheduled_for, runtime: prov.runtime,
      started_at: now, outcome: status === 'failed' ? 'failed' : 'ran', ingest_run_id: runId, config_hash: prov.config_hash, detail: { adapter: adapterKey, status } }).catch(() => {});
  }
  return { runId, status, metrics };
}

// Re-applies the latest STORED parse of every accepted official result document
// (no refetch), e.g. after identity resolution improved. Passes repeat while new
// appearance bindings keep unlocking bouts. News from a re-apply is history.
// graphResolve: false + docKeys applies recorded (e.g. human-reviewed) bindings to exactly those documents,
// with no new automatic identity decision and one pass.
export async function reapplyStoredDocuments(store, { adapterKey, now = new Date().toISOString(), provenance = null, maxPasses = 4, pageSize = 8, graphResolve = true, docKeys = null } = {}) {
  const adapter = COMMISSION_ADAPTERS[adapterKey];
  if (!adapter) throw new Error(`unknown commission adapter ${adapterKey}`);
  if (!store?.writeTarget?.verified) return { status: 'blocked', assertions: { write_target: 'store has no verified boxing write target' } };
  const writer = withTemporalMode(store, 'reapply');
  const prov = provenance ? { ...provenance, source_version: adapter.version, config_hash: await configHash({ adapter: adapter.version, mode: 'reapply', maxPasses, graphResolve, docKeys }) } : null;
  const runId = await store.startRun({ worker: 'boxing-commissions', sourceKey: adapter.sourceKey, adapterVersion: adapter.version, provenance: prov });
  const docs = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await store.commissionParsedDocuments(adapter.sourceKey, offset, pageSize);
    docs.push(...(docKeys ? page.filter((d) => docKeys.includes(d.doc_key)) : page));
    if (page.length < pageSize) break;
  }
  // chronological: earlier cards build the career graph later cards are resolved against
  const firstDate = (d) => (d.events ?? []).map((e) => e.event_date).filter(Boolean).sort()[0] ?? '9999';
  docs.sort((x, y) => firstDate(x).localeCompare(firstDate(y)) || x.doc_key.localeCompare(y.doc_key));
  const passes = [];
  let status = 'ok';
  try {
    for (let pass = 1; pass <= (graphResolve ? maxPasses : 1); pass++) {
      const m = { pass, documents: 0, bouts_linked: 0, bout_ids_attached: 0, results_created: 0, graph_decisions: {}, graph_bindings_used: 0, identity_unresolved: 0, skipped_reasons: {} };
      for (const d of docs) {
        // stored parses from older parser versions predate distinct repeat-pairing ids
        const bouts = assignBoutIds((d.bouts ?? []).map((b) => ({ ...b })));
        const s = await applyCommissionParsed(writer, adapter, { events: d.events ?? [], bouts, rejected: [] }, { now, changeReason: 'identity_graph_reapply', graphResolve });
        m.documents += 1;
        for (const k of ['bouts_linked', 'bout_ids_attached', 'results_created', 'graph_bindings_used', 'identity_unresolved']) m[k] += s[k] ?? 0;
        for (const [k, n] of Object.entries(s.graph_decisions ?? {})) m.graph_decisions[k] = (m.graph_decisions[k] ?? 0) + n;
        for (const x of s.skipped ?? []) m.skipped_reasons[x.reason] = (m.skipped_reasons[x.reason] ?? 0) + 1;
      }
      passes.push(m);
      const newBindings = Object.entries(m.graph_decisions).filter(([k]) => /:(matched|created)$/.test(k)).reduce((a, [, n]) => a + n, 0);
      if (!newBindings) break;
    }
  } catch (err) {
    status = 'failed';
    passes.push({ error: String(err?.message ?? err).slice(0, 300) });
  }
  const last = passes.filter((p) => !p.error).at(-1) ?? {};
  await store.finishRun(runId, { status, metrics: { adapter: adapterKey, mode: 'reapply', graph_resolve: graphResolve, doc_keys: docKeys, documents: docs.length, passes }, observed: 0,
    canonicalWrites: passes.reduce((a, p) => a + (p.results_created ?? 0), 0), error: passes.find((p) => p.error)?.error ?? null });
  if (prov?.invocation_id && store.recordWorkerInvocation) {
    await store.recordWorkerInvocation({ worker: 'boxing-commissions', worker_name: prov.worker_name, worker_version: prov.worker_version, deployment_id: prov.deployment_id,
      invocation_id: `${prov.invocation_id}:${adapterKey}:reapply`, trigger_type: prov.trigger_type, cron: prov.cron ?? null, scheduled_for: prov.scheduled_for ?? null,
      runtime: prov.runtime, started_at: prov.started_at ?? now, completed_at: new Date().toISOString(), outcome: status === 'failed' ? 'failed' : 'ran', ingest_run_id: runId,
      config_hash: prov.config_hash, detail: { adapter: adapterKey, mode: 'reapply', status } });
  }
  return { status, runId, documents: docs.length, passes, final: last };
}
