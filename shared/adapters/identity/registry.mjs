// Identity source adapters.
//
// An adapter is { key, sourceKey, namespace, version, sourceUrl(record),
// omitFromHash, fetchPage({ fetchImpl, afterQid|cursor, limit }) ->
// { records: [{ record, payload }], rejected, lastQid|cursor } }.
//
// Registration here is NOT permission to collect. runSeed() re-reads the
// source row from boxing_sources before every run and refuses unless it is
// enabled + approved_ingest/identity_only + persistence_allowed, and the
// database gate refuses the write regardless of what the code believes.

import { wikidataAdapter } from './wikidata.mjs';

function disabledAdapter(key, sourceKey, why) {
  return {
    key,
    sourceKey,
    namespace: key,
    version: `${key}-identity@0.0.0-disabled`,
    disabled: why,
    sourceUrl: () => null,
    omitFromHash: [],
    async fetchPage() {
      throw new Error(`adapter_disabled: ${key} — ${why}`);
    },
  };
}

export const identityAdapters = {
  wikidata: wikidataAdapter,
  boxrec: disabledAdapter('boxrec', 'boxrec',
    'Source is review_required: BoxRec terms/licensing have not been reviewed. No code may fetch it until a licence or API agreement is recorded on the source row.'),
  commission: disabledAdapter('commission', 'commission_official',
    'Placeholder source row. Each athletic commission needs its own source row, terms review and document-format parser.'),
  promotion: disabledAdapter('promotion', 'promotion_official',
    'Placeholder source row. Each promoter needs its own source row and terms review.'),
};
