// Matchroom Boxing — announced card, SCHEDULE LANE ONLY (rights review 2026-09-18, migration 0046).
//
// Permitted: event name, date, venue, city, country, promoter, broadcaster, announced pairings with division, rounds,
// title stake and card position, each linked to the official event page.
// Refused by the rights lane and never parsed here: results, method, scorecards, officials, weigh-ins, photographs,
// video and article/promotional body text. Fighter records printed beside a name are NOT taken: our records come from
// official commission results, and a promoter's W-L-D is not that record.
//
// Structure (observed 2026-09-18):
//   /events/                  tiles: a.button[href=/events/<slug>/], span.day "19 Sep", span.boxer-1, span.boxer-2
//   /events/<slug>/           section.single-event-hero  p.date "Saturday 19 September 2026", div.boxer-1 / div.boxer-2
//                             with span.first-name + span.last-name, p.championship (title line)
//                             section.undercard         div.fight * N, each with div.boxer-1 / div.boxer-2 and an
//                             .additional-information title line when the bout carries one
// A pairing is only a bout when BOTH sides are named: "TBC" is an announced slot, not a fight.

import { parseTitleLine } from './titles.mjs';
import { isPlaceholderName, placeholderRefusal } from './names.mjs';

export const MATCHROOM = Object.freeze({
  sourceKey: 'promoter_matchroom',
  namespace: 'matchroom',
  version: 'matchroom-events@1.0.0',
  eventsUrl: 'https://www.matchroomboxing.com/events/',
  promoter: 'Matchroom Boxing',
  lane: 'schedule',
});

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '');
const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

// "Shabaz Masoud W 15 KO 4 L 0 D 0" -> "Shabaz Masoud" (the printed record is not ours to take)
function boxerName(block) {
  const named = /<span class="first-name">([^<]*)<\/span>\s*<span class="last-name">([^<]*)<\/span>/.exec(block);
  if (named) return text(`${named[1]} ${named[2]}`);
  const t = text(block.replace(/<div class="record">[\s\S]*?<\/div>/g, " "));
  return t.split(/\s+(?:W|L|D|KO)\s+\d|\s+W\s*$/)[0].trim();
}

// the event page date line: "Saturday 19 September 2026"
export function parseMatchroomDate(line) {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(line ?? "");
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

// The listing tile states the venue structurally: <span class="location">Co-op Live, Manchester, UK</span>.
// The event page itself states it only inside promotional headlines, which are not ours to read as data.
const COUNTRY = { uk: "GB", "united kingdom": "GB", england: "GB", scotland: "GB", wales: "GB", ireland: "IE", usa: "US", us: "US", "united states": "US",
  monaco: "MC", "saudi arabia": "SA", uae: "AE", australia: "AU", canada: "CA", mexico: "MX", italy: "IT", spain: "ES", germany: "DE", japan: "JP" };
export function parseMatchroomLocation(block) {
  const raw = /<span class="location">([^<]+)<\/span>/.exec(block ?? "")?.[1];
  if (!raw) return null;
  const parts = text(raw).split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const last = parts.at(-1).toLowerCase();
  const country = COUNTRY[last] ?? null;
  return { name: parts[0], city: parts.length > 2 ? parts[1] : country ? null : parts[1] ?? null, country_code: country, as_stated: text(raw) };
}

// /events/ listing -> discovery candidates. A tile proves a card exists; it never proves its card.
export function parseMatchroomEvents(html) {
  const doc = strip(html);
  const out = [];
  // each tile is one .fight-card block: read inside the block so a tile never borrows its neighbour's names
  for (const m of doc.matchAll(/<div class="fight-card">([\s\S]*?)(?=<div class="fight-card">|<\/section>)/g)) {
    const block = m[1];
    const link = /href="(https:\/\/www\.matchroomboxing\.com\/events\/([a-z0-9-]+)\/)"/i.exec(block);
    if (!link) continue;
    if (out.some((x) => x.slug === link[2])) continue;
    const day = /<span class="day">([^<]+)<\/span>/.exec(block)?.[1]?.trim() ?? null;
    const a = /<span class="boxer-1">([^<]+)<\/span>/.exec(block)?.[1]?.trim() ?? null;
    const b = /<span class="boxer-2">([^<]+)<\/span>/.exec(block)?.[1]?.trim() ?? null;
    out.push({ slug: link[2], url: link[1], day_text: day, headline: a && b ? `${a} vs ${b}` : null, venue: parseMatchroomLocation(block) });
  }
  return out;
}

// /events/<slug>/ -> one announced card in the promoter contract's shape
export function parseMatchroomEvent(html, { url, capturedAt, venueHint = null }) {
  const doc = strip(html);
  const problems = [];
  const hero = doc.slice(doc.indexOf("single-event-hero"), doc.indexOf('<section class="undercard"') + 1 || undefined);
  const date = parseMatchroomDate(/<p class="date">([^<]+)<\/p>/.exec(hero)?.[1] ?? "");
  if (!date) problems.push("no event date on the page");

  const title = text(/<title>([\s\S]*?)<\/title>/.exec(doc)?.[1] ?? "").replace(/\s*[-|]\s*Matchroom.*$/i, "").trim();
  // the venue comes from the listing tile's structured location, never from a promotional headline
  const venueName = venueHint?.name ?? null;
  const city = venueHint?.city ?? null;
  const country = venueHint?.country_code ?? null;
  if (!venueName) problems.push("venue not stated in structured card data");
  // the broadcaster as the official event page states it
  const broadcaster = /\bDAZN\b/i.test(text(doc)) ? "DAZN" : null;

  const bouts = [];
  const push = (block, { order, segment, titleLine }) => {
    const a = /<div class="boxer-1">([\s\S]*?)(?=<div class="(?:vs|boxer-2|record)")/.exec(block)?.[1] ?? block;
    // stop at the title line: it belongs to the bout, not to the boxer's name
    const b = (/<div class="boxer-2">([\s\S]*?)$/.exec(block)?.[1] ?? "").split(/<p class="(?:additional-information|championship)/)[0];
    const nameA = boxerName(a);
    const nameB = boxerName(b);
    if (!nameA || !nameB) { problems.push(`bout ${order}: a corner is not named`); return; }
    if (isPlaceholderName(nameA) || isPlaceholderName(nameB)) { problems.push(placeholderRefusal(order, nameA, nameB)); return; }
    const parsed = parseTitleLine(titleLine);
    if (titleLine && !parsed.titles.length && !parsed.unresolved.length) problems.push(`bout ${order}: title line not understood: ${titleLine}`);
    bouts.push({
      source_bout_id: `${url.replace(/^https:\/\/www\.matchroomboxing\.com\/events\//, "").replace(/\/$/, "")}|${order}|${nameA.toLowerCase().replace(/[^a-z0-9]+/g, "-")}|${nameB.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      fighter_a: { name: nameA },
      fighter_b: { name: nameB },
      division: parsed.division,
      scheduled_rounds: null, // Matchroom does not publish the distance on the card page; never guessed
      titles: parsed.titles,
      titles_unresolved: parsed.unresolved,
      status: "scheduled",
      bout_order: order,
      card_segment: segment,
    });
  };

  const heroTitleLine = text(/<p class="championship[^"]*">([\s\S]*?)<\/p>/.exec(hero)?.[1] ?? "") || null;
  const heroDetails = /<div class="event-details">([\s\S]*?)<div class="background-image">/.exec(hero)?.[1] ?? hero;
  push(heroDetails, { order: 1, segment: "main_event", titleLine: heroTitleLine });

  const under = doc.slice(doc.indexOf('<section class="undercard"'));
  const fights = [...under.matchAll(/<div class="fight">([\s\S]*?)(?=<div class="fight">|<\/section>)/g)].map((m) => m[1]);
  for (const [i, f] of fights.entries()) {
    const line = text(/<p class="additional-information[^"]*">([\s\S]*?)<\/p>/.exec(f)?.[1] ?? "") || null;
    push(f, { order: i + 2, segment: "undercard", titleLine: line });
  }

  return {
    observation: {
      source_key: MATCHROOM.sourceKey,
      source_event_id: url.replace(/^https:\/\/www\.matchroomboxing\.com\/events\//, "").replace(/\/$/, ""),
      event_name: title || `Matchroom Boxing at ${venueName ?? "venue to be confirmed"}`,
      scheduled_date: date,
      scheduled_start_at: null, // no ring-walk or start time is published on the card page: never invented
      venue: venueName ? { name: venueName, city, region: null, country_code: country } : null,
      broadcaster,
      promoter: MATCHROOM.promoter,
      source_url: url,
      captured_at: capturedAt,
      status: "scheduled",
      bouts,
    },
    problems,
    parser_version: MATCHROOM.version,
  };
}
