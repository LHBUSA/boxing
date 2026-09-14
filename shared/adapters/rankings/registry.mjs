// Sanctioning-body ranking / title collectors (owner approvals 2026-09-14).
//
// wba, ibf, wbo: approved; collection runs through shared/titles/sanctioning-ingest.mjs (runSanctioningCollection).
// wbc: approved (owner decision 2026-09-14). No collector yet: the official public WBC documents have not been inspected
// for this build, so there is no parser. Collection must use normally accessible official WBC sources (or operator-supplied
// official documents) and never circumvent a technical access control.

export const rankingAdapters = Object.freeze({
  wbc: Object.freeze({ key: 'wbc', organizationSlug: 'wbc', sourceKey: 'wbc_official', state: 'approved_no_collector',
    disabled: 'wbc_official is approved; no WBC collector or parser has been built yet',
    async fetchDocuments() { throw new Error('adapter_disabled: wbc — approved source, no collector yet'); } }),
  wba: Object.freeze({ key: 'wba', organizationSlug: 'wba', sourceKey: 'wba_official', state: 'approved', collector: 'runSanctioningCollection' }),
  ibf: Object.freeze({ key: 'ibf', organizationSlug: 'ibf', sourceKey: 'ibf_official', state: 'approved', collector: 'runSanctioningCollection' }),
  wbo: Object.freeze({ key: 'wbo', organizationSlug: 'wbo', sourceKey: 'wbo_official', state: 'approved', collector: 'runSanctioningCollection' }),
});

export const COLLECTED_BODIES = Object.freeze(['wba', 'wbo', 'ibf']);
