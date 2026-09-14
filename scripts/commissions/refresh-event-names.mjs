#!/usr/bin/env node
// Re-derives commission event display names from the STORED latest parse of each official document, with the current
// naming rule (shared/commissions/apply.mjs EVENT_NAME_RULE). Run via scripts/staging/refresh-event-names.ps1.
//
//   node scripts/commissions/refresh-event-names.mjs <adapter> --out=<file>            READ ONLY: derived names -> JSON
//   node scripts/commissions/refresh-event-names.mjs <adapter> --in=<file> --write     rename only the listed events
//
// --write sends each listed event through boxing_upsert_event with name_rule: the database renames only events the
// adapter's source owns, only when the name differs, and records every change in boxing_event_name_revisions.
// Nothing else is written: no bouts, results, officials, identities or news.

import { readFileSync, writeFileSync } from 'node:fs';
import { COMMISSION_ADAPTERS } from '../../shared/commissions/run.mjs';
import { COMMISSION_NAMESPACES, EVENT_NAME_RULE, eventName } from '../../shared/commissions/apply.mjs';
import { guardedPostgrestStore } from '../../shared/store/target-guard.mjs';

const args = process.argv.slice(2);
const adapterKey = args.find((a) => !a.startsWith('--'));
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const adapter = COMMISSION_ADAPTERS[adapterKey];
if (!adapter) { console.error(`unknown adapter ${adapterKey}`); process.exit(2); }
const store = guardedPostgrestStore(process.env);
console.log(`target: ${store.writeTarget.projectName} (${store.writeTarget.ref}, ${store.writeTarget.environment})`);
const namespace = `${COMMISSION_NAMESPACES[adapter.sourceKey]}.event`;

if (!args.includes('--write')) {
  const derived = new Map();
  for (let offset = 0; ; offset += 20) {
    const page = await store.commissionParsedDocuments(adapter.sourceKey, offset, 20);
    for (const d of page) for (const ev of d.events ?? []) derived.set(ev.source_event_id, { source_key: adapter.sourceKey, namespace, external_id: ev.source_event_id, name: eventName(ev, adapter), name_rule: EVENT_NAME_RULE, doc_key: d.doc_key });
    if (page.length < 20) break;
  }
  const out = opt('out');
  writeFileSync(out, `${JSON.stringify([...derived.values()], null, 1)}\n`);
  console.log(JSON.stringify({ adapter: adapterKey, rule: EVENT_NAME_RULE, events_derived: derived.size, out }));
} else {
  const rows = JSON.parse(readFileSync(opt('in'), 'utf8'));
  let renamed = 0;
  const changes = [];
  for (const r of rows) {
    if (r.source_key !== adapter.sourceKey || r.namespace !== namespace || r.name_rule !== EVENT_NAME_RULE) throw new Error(`row does not belong to ${adapterKey} under ${EVENT_NAME_RULE}: ${r.external_id}`);
    const res = await store.upsertEvent({ source_key: r.source_key, namespace: r.namespace, external_id: r.external_id, name: r.name, name_rule: r.name_rule });
    if (res.created) throw new Error(`refresh created an event for ${r.external_id}: stop`);
    if (res.renamed) { renamed += 1; changes.push({ external_id: r.external_id, from: res.previous_name, to: r.name }); }
  }
  console.log(JSON.stringify({ adapter: adapterKey, rule: EVENT_NAME_RULE, listed: rows.length, renamed, changes }, null, 1));
}
