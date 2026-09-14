// Sanctioning-body identity review by source identity (migration 0037). The database clusters review rows into
// candidates; this module fills the printed-name map for entries stored before the map existed, using the same
// normalizedAlias() the collectors use, then refreshes the candidates. Nothing here decides or matches an identity.

import { normalizedAlias } from '../identity/normalize.mjs';

export const IDENTITY_BODIES = Object.freeze(['wba', 'ibf', 'wbo', 'wbc']);

export async function backfillIdentityNames(store, { bodies = IDENTITY_BODIES, batch = 2000, maxBatches = 1000 } = {}) {
  const out = {};
  for (const body of bodies) {
    let inserted = 0;
    let seen = 0;
    for (let i = 0; i < maxBatches; i++) {
      const rows = await store.orgIdentityUnmappedNames(body, batch);
      if (!rows?.length) break;
      const names = rows.map((r) => ({ organization_slug: body, source_name: r.source_name, country: r.country, org_boxer_id: r.org_boxer_id, normalized_name: normalizedAlias(r.source_name) }))
        .filter((r) => r.normalized_name);
      seen += rows.length;
      const res = await store.recordOrgIdentityNames({ names });
      inserted += res.inserted;
      // a batch that inserts nothing would repeat forever (names that normalize to nothing): stop
      if (!res.inserted) break;
    }
    out[body] = { seen, inserted };
  }
  return out;
}

export async function refreshIdentityCandidates(store, opts = {}) {
  const names = await backfillIdentityNames(store, opts);
  const refreshed = await store.refreshOrgIdentityCandidates({ full: Boolean(opts.full) });
  const summary = await store.orgIdentityReviewSummary();
  return { names, refreshed, summary };
}
