// Global Boxing History V1 — build the first vertical slice's proof artifact on a LOCAL disposable database.
//
//   node scripts/history/slice-proof.mjs [out.json]
//
// Replays the fixtures exported read-only from staging (scripts/staging/history-slice-export.ps1) through the normal
// pipeline, then writes what the archive reads return: the card, one fighter passport (current and as-of), the division's
// four body lanes, the source registry and the archive assertions. Touches no hosted project; the test database is dropped.

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshDatabase } from '../../tests/helpers/db.mjs';
import { pgStore } from '../lib/pg-store.mjs';
import { applyCommissionParsed } from '../../shared/commissions/apply.mjs';
import { NEVADA } from '../../shared/adapters/commissions/nevada.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixture = (n) => JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/history', n), 'utf8').replace(/^﻿/, ''));
const SHEET = fixture('nsac-2026-03-28.json');
const WIKIDATA = fixture('wikidata-identities.json');
const BODIES = fixture('super-welterweight-bodies.json');
const out = process.argv[2] ?? join(ROOT, 'reviews/history/2026-09-15-slice-proof.json');
const NOW = '2026-09-15T12:00:00Z';
const key = (s) => s?.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() ?? null;
const ref = (id) => id.replace(/^pbe_[a-z]+_/, '');

const db = await freshDatabase('history_slice_proof');
try {
  const store = pgStore(db.client);
  const q = async (sql, params) => (await db.client.query(sql, params)).rows;
  await store.recordObservation({ source_key: 'nsac_nevada', entity_type: 'commission_results_document', external_key: SHEET.doc_key, source_url: SHEET.url,
    payload: { url: SHEET.url, doc_key: SHEET.doc_key, events: SHEET.events, bouts: SHEET.bouts }, content_hash: SHEET.sha256.replace(/^sha256:/, '').padEnd(64, '0').slice(0, 64),
    parser_version: SHEET.parser_version });
  const ingest = await applyCommissionParsed(store, NEVADA, { events: SHEET.events, bouts: SHEET.bouts }, { now: NOW });
  for (const w of WIKIDATA) {
    const [row] = await q(`select p.fighter_id from public.boxing_bout_participants p join public.boxing_fighters f on f.id = p.fighter_id
      join public.boxing_bout_identities bi on bi.bout_id = p.bout_id where f.display_name = $1 and bi.external_id like '2026-03-28|grand-garden|%' limit 1`, [w.commission_name]);
    await q(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, external_url, source_display_name, verification_state, confidence, evidence)
      values ($1, (select id from public.boxing_sources where source_key = 'wikidata'), 'wikidata.item', $2, $3, $4, 'verified', $5, $6)`,
      [row.fighter_id, w.qid, `https://www.wikidata.org/wiki/${w.qid}`, w.label, w.confidence, { rule: w.rule, qid: w.qid, title: w.wiki_title }]);
  }
  const imports = {};
  for (const p of BODIES) {
    const r = await store.importTitleStatusSnapshot({ ...p, entries: p.entries.map((e) => ({ ...e, holder_normalized_name: key(e.holder_source_name) })) });
    imports[r.status] = (imports[r.status] ?? 0) + 1;
  }

  const [{ public_id: eventId }] = await q(`select public_id from public.boxing_events`);
  const card = await store.archiveCard(ref(eventId));
  const main = card.bouts.find((b) => b.listed_order === 1);
  const fundora = ref(main.corners[0].global_fighter_id);
  const division = await store.archiveDivision('super_welterweight');
  const registry = await store.sourceRegistry();

  const proof = {
    generated_at: new Date().toISOString(),
    basis: 'Local disposable PostgreSQL, full migration chain (0001-0043). Facts exported read-only from Boxing staging; no hosted project was written.',
    ingest: { bouts_linked: ingest.bouts_linked, results_created: ingest.results_created, scorecards_written: ingest.scorecards_written, weigh_ins: ingest.weigh_ins,
      identity_unresolved: ingest.identity_unresolved, body_documents: imports },
    card: {
      event: card.event,
      derived: card.derived,
      bouts: card.bouts.map((b) => ({ order: b.listed_order, corners: b.corners.map((c) => `${c.side}: ${c.display_name} (${c.global_fighter_id})`),
        scheduled_rounds: b.scheduled_rounds, result: b.result?.classification.code, flags: b.result?.classification.flags, source_text: b.result?.classification.source_text,
        round: b.result?.round, time: b.result?.time, decision_check: b.decision_check?.status, judges: b.scorecards.map((s) => `${s.judge} ${s.fighter_a_total}-${s.fighter_b_total}`),
        referee: b.officials.find((o) => o.role === 'referee')?.name ?? null, weight_class: b.weights.weight_class, weight_class_basis: b.weights.weight_class_basis,
        weights: b.weights.corners.map((c) => `${c.side}: ${c.official_weight_lb ?? '-'}${c.over_class_limit_lb ? ` (+${c.over_class_limit_lb} over)` : ''}`),
        weight_observations: b.weights.observations, titles_linked: b.titles.linked.map((t) => `${t.organization}:${t.tier}:${t.weight_class}`),
        title_remarks: b.titles.remarks_as_printed.map((r) => ({ as_printed: r.as_printed, action: r.action, division: r.division,
          belts: r.belts.map((x) => `${x.bodies_named.join('+')}/${x.scope}${x.qualifiers.length ? `/${x.qualifiers.join('+')}` : ''}`) })),
        knockdowns: b.knockdowns.lane, provenance: { source: b.source.source_key, document: b.source_document?.document_key, result_observation: b.result?.source.observation } })),
      coverage: card.coverage,
    },
    passport: (() => null)(),
    division: {
      weight_class: division.weight_class,
      definitions: division.definitions,
      title_bouts_on_record: division.title_bouts_on_record.map((b) => ({ date: b.event_date, bout: b.global_bout_id, result: b.result?.classification.code })),
      bodies: division.bodies.map((b) => ({ organization: b.organization, documents: b.documents, first_document_on: b.first_document_on, last_document_on: b.last_document_on,
        runs: b.runs.length, distinct_holders: new Set(b.runs.filter((r) => r.holder_as_printed).map((r) => r.holder_as_printed.toUpperCase())).size,
        primary_runs_sample: b.runs.filter((r) => ['world', 'super'].includes(r.tier)).slice(-6)
          .map((r) => `${r.first_statement_on}..${r.last_statement_on} ${r.holder_as_printed ?? r.holder_status} [${r.tier}] (${r.statements} statements)`) })),
    },
    registry: registry.map((s) => ({ source_key: s.source_key, access_mode: s.access_mode, enabled: s.enabled, lanes: s.lanes.length,
      lanes_by_availability: s.lanes.reduce((a, l) => ({ ...a, [l.availability]: (a[l.availability] ?? 0) + 1 }), {}),
      rights_scope_gaps: s.lanes.filter((l) => l.rights_scope === 'review_scope_gap').map((l) => l.lane),
      stored: s.stored, parser_lineage: s.parser_lineage.map((p) => p.parser_version) })).filter((s) => s.lanes > 0 || s.stored.events > 0 || s.stored.title_documents > 0),
    index: await store.archiveIndex(),
  };
  proof.passport = {
    current: await store.fighterPassport(fundora),
    as_of_fight_day: await store.fighterPassport(fundora, '2026-03-28'),
  };
  proof.passport.current.bouts = proof.passport.current.bouts.map((b) => ({ ...b, classification: b.classification?.code }));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`wrote ${out}`);
  console.log(`assertions: ${proof.index.assertions.failures} failures; card ${proof.card.bouts.length} bouts; division bodies ${proof.division.bodies.map((b) => `${b.organization}:${b.runs} runs/${b.documents} docs`).join(' ')}`);
} finally {
  await db.close();
}
