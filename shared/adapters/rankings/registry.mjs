// Sanctioning-body ranking / title collectors (owner approvals 2026-09-14).
//
// wba, ibf, wbo: approved; collection runs through shared/titles/sanctioning-ingest.mjs (runSanctioningCollection).
// wbc: approved (owner decisions 2026-09-14/15); the current month's public ratings PDF and champions grid through the
// same runner. Normally accessible public pages only; a blocked or missing document is a source-access gap.

export const rankingAdapters = Object.freeze({
  wbc: Object.freeze({ key: 'wbc', organizationSlug: 'wbc', sourceKey: 'wbc_official', state: 'approved', collector: 'runSanctioningCollection' }),
  wba: Object.freeze({ key: 'wba', organizationSlug: 'wba', sourceKey: 'wba_official', state: 'approved', collector: 'runSanctioningCollection' }),
  ibf: Object.freeze({ key: 'ibf', organizationSlug: 'ibf', sourceKey: 'ibf_official', state: 'approved', collector: 'runSanctioningCollection' }),
  wbo: Object.freeze({ key: 'wbo', organizationSlug: 'wbo', sourceKey: 'wbo_official', state: 'approved', collector: 'runSanctioningCollection' }),
});

export const COLLECTED_BODIES = Object.freeze(['wba', 'wbo', 'ibf', 'wbc']);

// One cron slot per body (the 20th, 10 minutes apart), so each body runs in its own invocation with its own CPU budget.
// On 2026-09-20 the single shared slot ran WBA, WBO and IBF and then died inside WBC (run left 'running', no metrics).
// A cron string not listed here runs every body in order.
export const BODY_BY_CRON = Object.freeze({ '25 14 20 * *': 'wba', '35 14 20 * *': 'wbo', '45 14 20 * *': 'ibf', '55 14 20 * *': 'wbc' });
export const bodiesForCron = (cron) => (BODY_BY_CRON[cron] ? [BODY_BY_CRON[cron]] : COLLECTED_BODIES);
