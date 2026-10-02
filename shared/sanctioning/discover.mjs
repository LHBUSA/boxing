// Sanctioning-body schedules -> discovery candidates (never events, bouts or fighters).
//
// One list fetch per body, then each entry's own page for the promoter it states, at the body's rate. A candidate that
// boxing_record_event_candidate matches to an event a schedule lane already holds is corroboration (state 'matched');
// one it cannot match stays 'open' and shows up in boxing_pro_coverage_health as a card we may be missing.

import { WBC_CALENDAR, parseWbcCalendar, parseWbcEventPage, wbcCandidate } from '../adapters/sanctioning/wbc-calendar.mjs';

const UA = 'PropBetEdge-Boxing/1.0 (+https://boxing.propbetedge.ai)';

export const SANCTIONING_SCHEDULES = Object.freeze({
  [WBC_CALENDAR.sourceKey]: { descriptor: WBC_CALENDAR, list: parseWbcCalendar, page: parseWbcEventPage, candidate: wbcCandidate },
});

export async function discoverSanctioningSchedules(store, { sources = Object.keys(SANCTIONING_SCHEDULES), fetchImpl = fetch, sleepImpl = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = new Date().toISOString(), dryRun = true, windowDays = 120 } = {}) {
  const receipt = { kind: 'sanctioning_schedule_discovery', dry_run: dryRun, captured_at: now, sources: [] };
  const today = now.slice(0, 10);
  const until = new Date(Date.parse(now) + windowDays * 86_400_000).toISOString().slice(0, 10);
  for (const key of sources) {
    const lane = SANCTIONING_SCHEDULES[key];
    const out = { source_key: key, parser_version: lane?.descriptor.version ?? null, listed: 0, candidates: [], error: null };
    receipt.sources.push(out);
    if (!lane) { out.error = 'no schedule parser for this source'; continue; }
    // same registry gate as every collector: a disabled or unapproved source is not read at all
    const src = store?.source ? await store.source(key).catch((err) => ({ lookup_error: err.message })) : null;
    const refusal = !store?.source ? null : src?.lookup_error ? `registry lookup failed: ${src.lookup_error}` : !src ? 'not registered'
      : !src.enabled ? 'disabled in the source registry' : src.rights_state !== 'approved' ? `rights_state is ${src.rights_state}` : null;
    if (refusal) { out.error = `source not readable: ${refusal}`; continue; }

    const res = await fetchImpl(lane.descriptor.listUrl, { headers: { 'user-agent': UA } });
    if (!res.ok) { out.error = `list fetch ${res.status}`; continue; }
    const entries = lane.list(await res.text()).filter((e) => e.date && e.date >= today && e.date <= until);
    out.listed = entries.length;
    for (const e of entries) {
      await sleepImpl(lane.descriptor.minIntervalMs);
      let page = null;
      const pr = await fetchImpl(e.url, { headers: { 'user-agent': UA } }).catch(() => null);
      if (pr?.ok) page = lane.page(await pr.text());
      const c = lane.candidate(e, page);
      const row = { ...c, page_fetched: Boolean(page) };
      if (!dryRun && store?.recordEventCandidate) row.recorded = await store.recordEventCandidate(c).catch((err) => ({ error: err.message }));
      out.candidates.push(row);
    }
  }
  receipt.summary = {
    listed: receipt.sources.reduce((n, s) => n + s.listed, 0),
    matched: receipt.sources.flatMap((s) => s.candidates).filter((c) => c.recorded?.state === 'matched').length,
    open: receipt.sources.flatMap((s) => s.candidates).filter((c) => c.recorded?.state === 'open').length,
    failed: receipt.sources.filter((s) => s.error).map((s) => `${s.source_key}: ${s.error}`),
  };
  return receipt;
}
