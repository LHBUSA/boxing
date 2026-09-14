# Tennessee Athletic Commission: source review (2026-09-14)

Adapter: `shared/adapters/commissions/tennessee.mjs` (`tn-athletic@1.0.0`), source `tn_athletic_commission`
(migration `20260914000032`). Research copies of the PDFs stayed outside Git: they print federal IDs and birth dates.

## Where the records are

| | |
|---|---|
| Current year | https://www.tn.gov/commerce/regboards/athletic/events.html (2026 rows) |
| Archive | https://www.tn.gov/commerce/regboards/athletic/events/archive.html (2020-2025 rows) |
| Documents | `https://www.tn.gov/content/dam/tn/commerce/documents/regboards/athletic/results/<year>/<name>.pdf` |
| Index structure | one static HTML table per page, no pagination: Date, Event Type (`Pro Boxing`, `Pro-Am Boxing`, `Pro-Am MMA`, `Pro-Am Kickboxing`, ...), Location (city), Event Name/Venue, Results (one or more PDF links; mixed cards label each link, e.g. `Boxing Results` / `Bare-Knuckle Results`) |
| Depth | 204 result links on 2026-09-14: 27 current, 177 archive; 2020-01 to 2026-09 |
| Boxing links | 112 links whose row or label names boxing (Pro Boxing, Pro-Am Boxing, All Pro Boxing, Team Combat League) |
| robots.txt | `User-agent: *` / `Allow: /` |
| Terms | https://www.tn.gov/web-policies.html: linking policy (do not frame, misattribute or misrepresent TN.gov content, do not hotlink graphics), DMCA agent, privacy and security statements. No restriction on using facts from public records. Facts only, with attribution; PDFs are not redistributed. |
| Cost | none; no account |

## Document types (118 boxing-labelled PDFs read)

| Class | Docs | Treatment |
|---|---:|---|
| `BOXING MATCH RESULTS` form, upright 612x792 | most 2020-2025 | parsed |
| same form stored landscape with `/Rotate 90` | 2025-2026 | parsed (device-space extraction turns it upright) |
| same form with a subset font whose text map is shifted by 0x1F (method and weight cells) | 10 bouts, 2021-2024 | decoded only when the decoding is printable text or exactly a result word; flagged `text_decoding` |
| `BOXING` / `TEAM COMBAT LEAGUE RESULTS` title variants of the form | 2025 | parsed; a title with no sport word falls back to the index label |
| scanned image, no text layer | 10 | refused `image_only_document` |
| scanned image with an OCR text layer (table rules read as `I`, radio rings as `r-` / `(i'`) | 8 | refused `ocr_scan_quarantined`: bout numbers, marks and scores cannot be trusted |
| bare-knuckle, kickboxing, MMA and the multi-sport `(boxing, kickboxing, grappling, etc)` forms | 9 | refused as not boxing |

91 documents parsed: 580 professional bouts (2020: 15, 2021: 21, 2022: 71, 2023: 86, 2024: 105, 2025: 233, 2026: 49).
2026 is thin: 14 of its 19 boxing-labelled documents are scans or other sports.

## What the form states, and how it is read

* Header: CITY, STATE, EVENT NAME, DATE, VENUE, PROMOTER; numbered JUDGE(s) and REFEREE(s) lists. Also executive
  director, inspectors, ringside doctors, announcer, timekeeper, matchmaker and the office's contact block: never read.
* Table, two rows per bout: BOUT #, RDS., STATUS (Pro/Am), FIGHTER NAME, FED ID AND/OR DOB (dropped by column), WEIGHT,
  WINNER, RD., TIME, METHOD (method words, `REF: name`, one `<judge> x-y` line per judge), SUSPENSIONS (day count and
  origin text such as `MANDATORY - TKO` or `14 days by Dr.`: only the count is kept).
* STATUS and WINNER exist only as drawn radio buttons; the selected one carries a small filled dot. The parser reads
  those dots (`pdf-device.mjs`). A bout needs its status dot on `Pro`; amateur bouts on Pro-Am cards are refused.
* Identity fields: the printed name and weight only. No hometown, record, stance, reach or date of birth is kept.
* Officials: the referee named on the bout's REF line (or the only listed referee); judges whose score line names a
  listed judge. Judge names are never synthesized.

Checks on the 580 parsed bouts:

* Winner dots: in all 276 stoppages that list one suspension, the suspended fighter is the one without the winner dot.
* Score lines carry no fighter label. Totals are tied to fighters only when the winner dot and the written decision type
  (unanimous / majority / split) fit exactly one reading of the numbers. That happened in 246 decisions, always with
  fighter A's number first. One sheet (2020-11-07, bout 5) only fits with B first: its outcome is held
  (`winner_mark_contradicts_score_lines`) and nothing is attributed. Draws and bouts without a readable winner get no
  judge totals; their printed lines are kept for review (`score_lines_unresolved`), never published.
* 6 bouts have no or two winner dots: no outcome is recorded (`ambiguous_winner_marks`).

## Completeness limits

* A referee is named for 551 of the 580 bouts; some 2020 sheets list referees and judges but name no official per bout.
* Weights look implausible on a few sheets (for example 403.0 lb); they are stored as printed.
* Scanned 2025-2026 documents are not parsed. Nothing is inferred for them.
