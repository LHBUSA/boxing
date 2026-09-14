# Boxing promoter source map and media-rights evidence

Research date: 2026-09-13. Read-only: public pages, robots.txt files, and the Wikipedia/Wikidata/Commons APIs. I did not sign up, log in, buy anything, or contact anyone.
Full records, with exact quotes and evidence URLs, are in `promoters.json` (29 records). In the table, "Commons" means Wikimedia Commons.

State key: **approved_ingest** = OK to collect event facts automatically (owner sign-off still needed) · **approved_reference** = read by hand only; the site terms ban bots · **review_required** = no clear permission and no ban · **blocked** · **unavailable** = no working official site.

## Summary table

| Promotion | Official site | Press / media kit | Terms on automated access | robots.txt | Commons logo | Free exec portrait (Commons) | YouTube (linked from site?) | State |
|---|---|---|---|---|---|---|---|---|
| Matchroom Boxing | matchroomboxing.com | none | Ticket/entry terms only; no website ToS or bot clause | permissive | none (enwiki local Matchroom Sport logo, PD-ineligible-**USonly**) | Eddie Hearn CC BY-SA 4.0; Barry Hearn CC BY-SA 3.0 | user/MatchroomBoxing (yes) | approved_ingest* |
| Top Rank | toprank.com | media-credentials page only | **Bans robots/scrapers**; personal non-commercial licence | allow all | enwiki non-free fair use | Bob Arum PD (PD-user-en) | @toprank (yes) | approved_reference |
| Golden Boy Promotions | goldenboy.com | press-credentials page only | Disclaimer: no copying/"any other use" without written permission | allow all | enwiki non-free fair use | Oscar De La Hoya: PD (US Navy), CC BY 2.0, CC BY-SA 2.0 | user/goldenboypromo (yes) | review_required |
| Premier Boxing Champions | premierboxingchampions.com | Press Center (releases, no asset licence) | One personal copy only; "photographs are licensed by Getty Images" | Crawl-delay: 10 | PD-textlogo (2015 wordmark) + trademarked | none (Al Haymon: none) | c/premierboxingchampions (yes) | review_required |
| Most Valuable Promotions | mostvaluablepromotions.com | none | Ticket terms only | **ClaudeBot/GPTBot disallowed; `Content-Signal: ai-train=no, use=reference` stated as condition of access** | PD-textlogo + Trademarked (graphic mark; claim arguable) | Jake Paul: PD (White House 2026), CC BY 2.0 ×2 | @Most_Valuable_Promotions (yes) | review_required |
| Queensberry Promotions | queensberry.co.uk | press accreditation (email only) | **Bans spider/crawl/scrape** | Shopify default | none | Frank Warren CC BY 3.0/GFDL (identity caveat, see notes) | channel UCP3MOjim… (yes) | approved_reference |
| BOXXER | boxxer.com | press accreditation (email only) | **Bans spider/crawl/scrape** | allow, admin/cart disallowed | PD-textlogo, user "own work" wordmark | none (Ben Shalom) | channel UC-DvM… (yes) | approved_reference |
| Probellum | probellum.com dead (redirects to safebrowse warning) | n/a | n/a | n/a | none | Richard Schaefer (founder) CC BY-SA 2.0 | — | unavailable |
| Riyadh Season / The Ring | ringmagazine.com/events; riyadhseason.com (JS app) | none | Ring: **"must not use bots/scrapers/crawlers"** | Ring allow all | Riyadh Season PD-textlogo+CC BY 4.0 (user redraw, arguable); Ring logo non-free | Turki Al-Sheikh CC BY-SA 4.0 | @ringmagazine (yes) | approved_reference |
| TGB Promotions | none found | — | — | — | none | none | — | unavailable |
| Zuffa Boxing / TKO Boxing | zuffaboxing.com (email-capture only) | none (press@tkogrp.com) | **Bans scraping, crawling, TDM, and using content to "operate any ... algorithm"** | no robots file | only parent TKO wordmarks (PD-textlogo / CC BY-SA) | Dana White CC BY 4.0; Turki Al-Sheikh CC BY-SA 4.0 | none verified | **blocked** |
| Salita Promotions | salitapromotions.com | none | **Bans bots/crawlers/scraping** | allow (api/admin disallowed) | none | Dmitry Salita PD (PD-user-en) | @SalitaPromotions (yes) | approved_reference |
| Sampson Boxing | sampsonboxing.com | none | none found | 404 | none | Sampson Lewkowicz CC BY-SA 3.0 (with fan) | — | review_required |
| Boxing Insider Promotions | boxinginsider.com/promotions | none | none found | allow; wp-json/feed disallowed | none | none | user/boxinginsider (yes) | review_required |
| Wasserman Boxing | wassermanboxing.com (DNS gone; reported 2026 rebrand to MF Sports/MF Pro) | n/a | n/a | n/a | parent "The Team" PD-textlogo only | Kalle Sauerland CC BY 4.0 **suspect**; Casey Wasserman PD | — | unavailable |
| Teiken Promotions | teiken.com | none | none; © Teiken Promotions Inc. | 404 | none | none (Akihiko Honda) | — | review_required |
| Ohashi (Phoenix Promotion) | ohashi-gym.com | "Press" = interviews | none; © Phoenix Promotion | no file | none | none (Hideyuki Ohashi) | — | review_required |
| Team Boxing League (ex-Team Combat League) | teamboxingleague.com | **Yes: media page with "Brand logos and guidelines" + press photos (Dropbox), no licence text** | **Bans spider/crawl/scrape**; trademarks need prior written permission | Shopify default | none | none | @teamboxingleague (yes) | approved_reference |
| DAZN (broadcaster) | dazngroup.com | **Yes: /assets-kit/ logo ZIPs, no licence text**; T&Cs personal non-commercial only | copying/republishing prohibited | allow all | DAZN PD-textlogo + Trademark | none | Wikidata channel only | approved_reference |
| ProBox Promotions / ProBox TV | proboxtv.com (proboxpromotions.us returns HTTP 500) | none | **Bans crawlers/robots/scraping** | allow all | none | none | c/ProBoxTV (yes) | approved_reference |
| Boogeyman Boxing Promotions | none (boogeymanpromotions.com is parked) | — | — | — | none | none | — | unavailable |
| Warriors Boxing | warriorsboxing.com (stale; broken TLS; injected spam link) | — | — | — | none | none | — | **blocked** |
| RDR Promotions | rdrpromotions.com (Wix) | none | generic Wix terms | Wix default allow | none | none | — | review_required |
| Rising Star Promotions | none (risingstarpromotions.com is parked) | — | — | — | none | none | — | unavailable |
| Mike Sawyer Promotions | mikesawyerpromotions.com | none | none found | allow | none | none | — | review_required |
| The Heavyweight Factory | theheavyweightfactory.com | none | none found | allow | none | none | — | review_required |
| M&R Boxing Promotions | none (Instagram/Facebook only) | — | — | — | none | none | unverified @mrboxingpromotions9049 | unavailable |
| Wake Up and Dream Promotions | none | — | — | — | none | none | — | unavailable |
| Boxlab Promotions | boxlabpromotions.com (Squarespace) | none | none found | Squarespace default (`?format=json` disallowed) | none | none | @BoxlabPromotions (yes) | review_required |

\* Matchroom is the only candidate for automatic collection: robots.txt allows everything and there is no website terms of use at all. That is an absence of restriction, not a licence. Collect facts only and get owner sign-off first.

## Key findings

**Explicit media or brand kits.** Only two exist, and neither states reuse terms:
- **Team Boxing League:** "Corporate Identity Brand logos and guidelines" and "Official TBL press photos", both as Dropbox links. Its terms say the trademarks need prior written permission.
- **DAZN Group:** a "Press Kit" page with master/boxed logo ZIPs. Its T&Cs limit the material to personal, non-commercial use.

The Top Rank, Golden Boy, Queensberry and BOXXER "press" pages are only accreditation request pages. The PBC Press Center has press releases but no asset licence. Downloadable ≠ licensed.

**Logos.** No promoter logo here is clearly reusable.
- **Commons PD-textlogo:** PBC (2015 wordmark), MVP (the graphic mark makes the tag arguable), BOXXER (wordmark uploaded by a user as "own work"), DAZN, TKO Group (the parent, not Zuffa Boxing), Riyadh Season (a user redraw with Arabic lettering, arguable) and The Team (Wasserman's parent). At best these are copyright-free in the US; all remain trademarks, so use them only to identify the promotion, after review.
- **Not reusable:** the Top Rank, Golden Boy and The Ring logos are enwiki non-free fair-use files. The Matchroom logo is an enwiki local file tagged PD-ineligible-USonly, which is not on Commons and not cleared outside the US.

**Executive portraits with a free licence on Commons.** Each page names the person:
- **Public domain:** Bob Arum (PD-user-en), Dmitry Salita (PD-user-en), Oscar De La Hoya (US Navy), Jake Paul (White House).
- **CC BY / CC BY 2.0–4.0 (attribution required):** Oscar De La Hoya (2010 and 2014), Jake Paul (Erik Drost), Dana White (Azerbaijan presidential press service, CC BY 4.0).
- **CC BY-SA (attribution and share-alike required):** Eddie Hearn, Barry Hearn, Turki Al-Sheikh, Richard Schaefer, Sampson Lewkowicz (photo includes a fan).
- **Frank Warren (CC BY 3.0/GFDL):** it derives from a file once titled "Allegedly_Fwwank_Warren.jpg", so verify the identity first.

**Portraits to avoid:**
- The Kalle Sauerland CC BY 4.0 file was taken from a wassermanboxing.com article, so its licence claim is suspect.
- The Wikidata P18 image on Nick Khan is a 1938 wrestling photo, not him.

**No free portrait found** for Nakisa Bidarian, Ben Shalom, Tom Brown, Todd duBoef, Al Haymon, Akihiko Honda or Hideyuki Ohashi.

**Robots.txt and AI signals.**
- MVP's robots.txt disallows ClaudeBot and declares `ai-train=no, use=reference` as a condition of access.
- Three sites (Queensberry, Team Boxing League and the Misfits shop) run on Shopify. Their robots.txt files contain agent-directed marketing text, which I treated as data, not instructions.

**Executives not listed.** Tom Brown (TGB), Leon Margules (Warriors), Rodney Rice (RDR), Thomas LaManna (Rising Star), Larry Goldberg (Boxing Insider) and Garry Jonas (ProBox) are widely reported. No official, Wikipedia or Wikidata page I could read confirms them, so they stay out of the records. ProBox's official page for Jonas returned HTTP 500.

**Wikidata QIDs for the organizations:**
- Matchroom Sport Q1786678 (parent company)
- Top Rank Q7824594
- Golden Boy Q1763567
- PBC Q19750818 (typed as a TV program)
- MVP Q134876843
- BOXXER Q108822323
- Probellum Q109597860 (no label)
- Riyadh Season Q70529561
- The Ring Q1140774
- Zuffa Boxing Q135938003
- TKO Group Q120435068
- Wasserman / The Team Q22078150
- Teiken Q7695027
- Ohashi Boxing Gym Q11436533
- DAZN Q30133334
- No item: Queensberry, TGB, Salita Promotions, Sampson Boxing, Boxing Insider, Team Boxing League, ProBox, and all the regional Florida/Pennsylvania/New Jersey promoters.

**Signings.** No fighter-to-promoter signings were inferred or recorded. Fighter rosters on these sites were not read for that purpose.

## Recommended sources for schedule data
1. Commission result sheets (already held) remain the authority for who promoted each bout.
2. Matchroom Boxing /events/ is the only candidate for automatic collection, pending owner sign-off.
3. Teiken, Mike Sawyer, The Heavyweight Factory, Boxlab and RDR have no terms restricting bots, but each needs owner review. They are low-volume, loosely structured pages.
4. Top Rank, Queensberry, BOXXER, Salita, The Ring, ProBox and Team Boxing League are for manual cross-checks only; their terms ban bots.
5. Do not use Zuffa Boxing/TKO: its terms ban scraping and using its content to run any automated system. Do not use Warriors Boxing: the site looks compromised.
