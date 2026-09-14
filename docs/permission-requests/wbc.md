# WBC ratings and title status: permission request. SUPERSEDED, NOT SENT

**Status (2026-09-14, later the same day): superseded.** The owner decided the WBC does not require separate permission for this project; `wbc_official` is `approved_ingest` (migration 20260914000036). This draft is kept only as a record. It is not a blocker and is not required.
- Nothing was sent.
- Collection still uses only normally accessible official WBC sources and never circumvents a technical access control.

## Before sending (owner)

1. Fill in the sender name, title and a reply address you monitor. Do not use a no-reply address.
2. Find the WBC's own contact channel for data or media requests on wbcboxing.com, and confirm it on the day you send. None has been verified for this draft.
3. Keep the crawler identity in the request identical to the one the adapter would send: `PropBetEdge-Boxing/1.0 (+https://propbetedge.ai)`.
4. When a reply arrives:
   1. Store it (PDF or email export) outside Git, with its date.
   2. Record a `boxing_source_rights_reviews` row through a migration: decision, permitted uses, limits, reviewer.
   3. Build the WBC adapter only within what the reply permits.
   4. Enable the source only then.
5. A "no", or no answer, changes nothing. The lane stays not licensed.

## Draft

**Subject:** Permission request: citing WBC ratings and champion status on PropBetEdge Boxing

Dear WBC team,

I am [NAME], [TITLE] at PropBetEdge. We are building a boxing reference site at boxing.propbetedge.ai, currently not public. It shows each sanctioning body's world champions and ratings separately. We never merge the four bodies into one ranking, and we do not call a champion "undisputed" unless each body's own records support it.

We would like your permission to show WBC facts in the WBC section of the site. Specifically:

1. **What we would use:** the facts in the WBC's monthly ratings and "Status by Division" and mandatory-status publications. That means division, rating position, boxer name, country, champion designation, and mandatory status exactly as the WBC publishes them.
2. **How we would collect them:** one automated check per month, or a different schedule you set, at a low request rate, identified as `PropBetEdge-Boxing/1.0 (+https://propbetedge.ai)`. If you prefer, we can use a file or feed you provide instead.
3. **What we would publish:** the facts only, credited to the World Boxing Council with a link back to wbcboxing.com and the date of the WBC document. We would not republish your PDFs, page text, logos or belt images.
4. **What we would store:** the extracted facts, with the source address, retrieval time and a checksum of each document, so every fact can be traced to its WBC publication. We would not redistribute the original files.
5. **AI and automated use:** we note that your site signals `use=reference` and disallows AI crawlers. We will collect nothing without your written agreement. We would not use WBC material to train AI models. Please tell us whether this use fits your policy, or what conditions would.

If you agree, please tell us about any conditions on attribution, frequency, retention or display. If you do not agree, we will keep the WBC section marked "not licensed", as it is today.

Thank you for considering this.

Kind regards,
[NAME]
[TITLE], PropBetEdge
[REPLY ADDRESS]
