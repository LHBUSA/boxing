# Source classification review queue

Documents whose official index classification may disagree with the document itself. The queue is reviewed **after**
the six-commission natural-run proof (2026-09-15 11:40Z). Until a reviewer decides, the source label stands: nothing is
overridden, fetched specially or backfilled.

Each entry states the evidence both ways and the possible outcomes. It is resolved only by reading the document and
recording the decision here, with any adapter change reviewed normally. A decision to ingest never bypasses the
sheet-level checks (the form title, Pro/Am status per bout, bare-knuckle/kickboxing/MMA refusal).

## Open

### TNQ-001: `tn-results:2021/STRIKEFEST-BOXING-OFFICIAL-RESULTS_7-03-21`

| | |
|---|---|
| Commission | Tennessee Athletic Commission (`tn_athletic_commission`) |
| Document | https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/2021/STRIKEFEST-BOXING-OFFICIAL-RESULTS_7-03-21.pdf |
| Index | https://www.tn.gov/commerce/regboards/athletic/events/archive.html, row `7/3/2021 \| Pro-Am MMA \| Gray \| Strikefest \| Results` (link title "Results for 7/3/2021 event") |
| Current state | skipped at the index as `listing_not_boxing:mma` (row event type "Pro-Am MMA", generic link label). Never fetched, so there is no staging document row. |
| Evidence the label may be wrong | the file name says BOXING; Strikefest also runs pro boxing cards in Tennessee (for example `2021/STRIKE-FEST_OFFICIAL-RESULTS_9-11-21` under "Pro Boxing", `2022/Strike-Fest_12-3`). |
| Evidence the label may be right | the Commission typed the row "Pro-Am MMA"; the same date and city appear again in a separate archive table as "Pro-Am MMA / Strikefest / GAMMA" (an amateur MMA sanctioning body). |
| Possible outcomes | (a) source-label error: the sheet is a boxing results form, so the index rule needs an evidence-based exception; (b) mixed card: MMA and boxing on one night, so only professional boxing bouts on a boxing form would ever be kept; (c) correctly excluded: the sheet is MMA (or amateur), and it stays skipped. |
| How to decide | one read-only fetch of the PDF (low rate, identifying User-Agent). Record the form title, the sport per bout and Pro/Am status. Do not store facts from it until the decision is recorded. |
| Queued | 2026-09-14 |
| Decision | pending |

## Resolved

(none)
