// Sanctioning-body ranking / title collectors (owner approvals 2026-09-14).
//
// wba, ibf, wbo: approved; collection runs through shared/titles/sanctioning-ingest.mjs (runSanctioningCollection).
// wbc: NOT LICENSED. No collector exists: no crawling, downloading or automated collection until the WBC grants written
// permission, and no workaround through search engines, mirrors or other sites' copies.

export const rankingAdapters = Object.freeze({
  wbc: Object.freeze({ key: 'wbc', organizationSlug: 'wbc', sourceKey: 'wbc_official', state: 'not_licensed',
    disabled: 'wbc_official is not licensed (owner decision 2026-09-14): no collection until written WBC permission exists',
    async fetchDocuments() { throw new Error('adapter_disabled: wbc — not licensed'); } }),
  wba: Object.freeze({ key: 'wba', organizationSlug: 'wba', sourceKey: 'wba_official', state: 'approved', collector: 'runSanctioningCollection' }),
  ibf: Object.freeze({ key: 'ibf', organizationSlug: 'ibf', sourceKey: 'ibf_official', state: 'approved', collector: 'runSanctioningCollection' }),
  wbo: Object.freeze({ key: 'wbo', organizationSlug: 'wbo', sourceKey: 'wbo_official', state: 'approved', collector: 'runSanctioningCollection' }),
});

export const COLLECTED_BODIES = Object.freeze(['wba', 'wbo', 'ibf']);
