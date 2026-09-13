// Sanctioning-body ranking / title adapters.
//
// ALL DISABLED. The wbc_official / wba_official / ibf_official / wbo_official
// source rows are review_required: their site terms have not been reviewed for
// automated collection, persistence or display. No code here fetches them.
//
// When a body's rights are approved, its adapter's job is only to turn a
// published list into a ranking DOCUMENT (shared/rankings/import.mjs) — the
// import, identity resolution, revisioning and change detection already exist
// and are tested. Until then, documents can be produced by an operator from an
// approved source and posted to boxing-rankings.

const disabled = (org, sourceKey) => ({
  key: org,
  organizationSlug: org,
  sourceKey,
  disabled: `${sourceKey} is review_required: terms for automated collection/persistence/display not reviewed`,
  async fetchDocuments() {
    throw new Error(`adapter_disabled: ${org} — ${sourceKey} not approved`);
  },
});

export const rankingAdapters = {
  wbc: disabled('wbc', 'wbc_official'),
  wba: disabled('wba', 'wba_official'),
  ibf: disabled('ibf', 'ibf_official'),
  wbo: disabled('wbo', 'wbo_official'),
};
