// Premier Boxing Champions — announced card, SCHEDULE LANE ONLY (rights review 2026-09-18, migration 0046).
//
// Permitted: event name, date, published start time, venue, city, state, promoter, broadcaster, announced pairings with
// division, rounds, title stake and card position, each linked to the official event page.
// Refused by the rights lane and never parsed here: results, method, scorecards, officials, weigh-ins, photographs,
// video and article/promotional body text. The fight description is read ONLY for the four facts the card itself states
// (division, distance, title, card position); its prose is never stored.
//
// Structure (observed 2026-09-18):
//   /schedule/                script[type=application/ld+json] -> schema.org SportsEvent: name (the announced pairings),
//                             startDate "MM/DD/YYYY HH:mm", url, location.name "Venue, City, State"
//   /<event-slug>            div.fight-row.field_bouts-0          the main event
//                             div.fight-row.field_co_billed_bouts-N  the rest of the announced card, in order
//                             .fight-headline "A vs B", a broadcast link, and one description line per bout

import { parseTitleLine, roundsFromText, divisionFromText } from './titles.mjs';
import { resolveAnnouncedStart } from './time.mjs';

export const PBC = Object.freeze({
  sourceKey: 'promoter_pbc',
  namespace: 'pbc',
  version: 'pbc-schedule@1.0.0',
  scheduleUrl: 'https://www.premierboxingchampions.com/schedule/',
  promoter: 'Premier Boxing Champions',
  lane: 'schedule',
});

const strip = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '');
const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

// "2026-09-19T20:00:00-05:00" -> { date, local_time, utc_offset, start_utc }. This is the BROADCAST START the source
// publishes, never a ring walk. The offset is the source's own, so the UTC instant is arithmetic on a published value
// rather than an invented timezone; when no offset is published, start_utc stays null.
export function parsePbcStart(value) {
  const v = (value ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?(Z|[+-]\d{2}:\d{2})?/.exec(v);
  if (iso) {
    const offset = iso[6] ?? null;
    const date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    const local = `${iso[4]}:${iso[5]}`;
    const startUtc = offset ? new Date(`${date}T${local}:00${offset === "Z" ? "Z" : offset}`).toISOString() : null;
    return { date, local_time: local, utc_offset: offset, start_utc: startUtc };
  }
  const us = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(v);
  if (us) return { date: `${us[3]}-${us[1]}-${us[2]}`, local_time: us[4] ? `${us[4]}:${us[5]}` : null, utc_offset: null, start_utc: null };
  return { date: null, local_time: null, utc_offset: null, start_utc: null };
}

// "Pechanga Arena, San Diego, California" -> venue / city / region
export function parsePbcLocation(name) {
  const parts = (name ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { name: null, city: null, region: null };
  return { name: parts[0] ?? null, city: parts[1] ?? null, region: parts[2] ?? null };
}

// The human-facing start line the event page prints in its header. Screen-reader spans repeat the zone in words
// ("ET" then "Eastern Time"), so both forms end up in the text and either resolves to the same zone.
export function parsePbcVisibleLine(html) {
  const header = /<div class="fight-night-header[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/.exec(html)?.[1]
    ?? /<h1[^>]*>[\s\S]{0,200}?<\/h1>([\s\S]{0,600})/.exec(html)?.[1] ?? null;
  const line = text(header ?? "");
  return /\d\s*(a\.?m\.?|p\.?m\.?|:\d{2})/i.test(line) ? line : null;
}

function jsonLdEvents(html) {
  const out = [];
  for (const m of strip(html).matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi)) {
    let parsed;
    try { parsed = JSON.parse(m[1]); } catch { continue; }
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (node?.["@type"] === "SportsEvent") out.push(node);
    }
  }
  return out;
}

// /schedule/ -> discovery candidates. The JSON-LD name lists the announced pairings; the card itself comes from the
// event page, so a candidate never becomes bouts on its own.
export function parsePbcSchedule(html) {
  return jsonLdEvents(html).map((node) => {
    const start = parsePbcStart(node.startDate);
    const loc = parsePbcLocation(node.location?.name);
    return {
      url: node.url ?? null,
      headline: typeof node.name === "string" ? node.name.split(",")[0].trim() : null,
      announced_pairings: typeof node.name === "string" ? node.name.split(",").map((s) => s.trim()).filter((s) => /\svs\s/i.test(s)) : [],
      probable_date: start.date,
      local_time: start.local_time,
      venue: loc.name,
      city: loc.city,
      region: loc.region,
    };
  });
}

// /<event-slug> -> one announced card in the promoter contract's shape
export function parsePbcEvent(html, { url, capturedAt, visibleStartHint = null }) {
  const doc = strip(html);
  const problems = [];
  const node = jsonLdEvents(doc)[0] ?? null;
  const start = parsePbcStart(node?.startDate);
  const loc = parsePbcLocation(node?.location?.name);
  if (!start.date) problems.push("no event date in the page's structured data");
  // the page's own header line: "SAT, SEP 19, 2026 · 8pm ET / 5pm PT · Pechanga Arena, San Diego, California"
  const visibleLine = parsePbcVisibleLine(doc) ?? visibleStartHint;
  const announced = resolveAnnouncedStart({ date: start.date, jsonLdValue: node?.startDate ?? null, jsonLdInstant: start.start_utc, visibleLine });
  if (announced.conflict) problems.push(`start time: ${announced.conflict.reason}`);

  const bouts = [];
  for (const m of doc.matchAll(/<div class="fight-row row (field_bouts|field_co_billed_bouts)-(\d+)"([\s\S]*?)(?=<!--END: Fight Row-->)/g)) {
    const main = m[1] === "field_bouts";
    const index = Number(m[2]);
    const block = m[3];
    // the pairing is the card's own headline element, not prose
    const headline = text(/<div class="[^"]*fight-headline[^"]*"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/.exec(block)?.[1]
      ?? /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(block)?.[1] ?? "");
    const pair = /^(.+?)\s+vs\.?\s+(.+?)$/i.exec(headline.replace(/\s*\|\s*.*$/, "").trim());
    const order = main ? 1 : index + 2;
    if (!pair) { problems.push(`bout ${order}: pairing not stated as "A vs B"`); continue; }
    const nameA = pair[1].trim();
    const nameB = pair[2].trim();
    if (/^(tbd|tba|to be announced)$/i.test(nameA) || /^(tbd|tba|to be announced)$/i.test(nameB)) {
      problems.push(`bout ${order}: opponent not announced`);
      continue;
    }
    // the single description line the card prints for this bout: read for distance, division and title only
    const line = text(block.replace(/<div class="fight-headline"[^>]*>[\s\S]*?<\/div>/, " ")).replace(/Fight Details.*$/i, "").trim();
    const parsedTitle = parseTitleLine(/\b(interim\s+)?\b(wbc|wba|ibf|wbo)\b[^.]*?\b(champion|title)\b/i.test(line)
      ? (/\b((?:interim\s+)?(?:wbc|wba|ibf|wbo)\s+[a-z ]*?(?:champion|title))\b/i.exec(line)?.[1] ?? "")
      : "");
    const rounds = roundsFromText(line);
    // quote only the distance phrase itself: the description is article text and is never stored
    if (rounds === null && /round/i.test(line)) {
      const phrase = /\b(?:\d{1,2}|four|six|eight|ten|twelve)(?:\s+or\s+(?:\d{1,2}|four|six|eight|ten|twelve))?[-\s]round\b/i.exec(line)?.[0] ?? "distance";
      problems.push(`bout ${order}: distance announced ambiguously ("${phrase.trim()}")`);
    }
    const division = divisionFromText(line);
    bouts.push({
      source_bout_id: `${url.split("/").filter(Boolean).pop()}|${order}|${nameA.toLowerCase().replace(/[^a-z0-9]+/g, "-")}|${nameB.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      fighter_a: { name: nameA },
      fighter_b: { name: nameB },
      division: parsedTitle.titles[0]?.weight_class_key ?? division,
      scheduled_rounds: rounds,
      titles: parsedTitle.titles,
      titles_unresolved: parsedTitle.unresolved,
      status: "scheduled",
      bout_order: order,
      card_segment: main ? "main_event" : order === 2 ? "co_main" : "undercard",
    });
  }
  const broadcaster = /dazn\.com|dazn-station/i.test(doc) ? "DAZN" : /prime ?video/i.test(doc) ? "Prime Video" : null;

  return {
    observation: {
      source_key: PBC.sourceKey,
      source_event_id: url.split("/").filter(Boolean).pop(),
      event_name: text(node?.name ?? "").split(",")[0].trim() || `Premier Boxing Champions at ${loc.name ?? "venue to be confirmed"}`,
      scheduled_date: start.date,
      // The published BROADCAST START, never a ring walk. Every assertion the page makes is kept, and when the machine
      // timestamp disagrees with the printed times the disagreement is recorded rather than silently corrected.
      scheduled_start_at: announced.scheduled_start_at,
      published_start_local: start.local_time,
      published_utc_offset: start.utc_offset,
      published_start_line: visibleLine,
      start_basis: announced.scheduled_start_at ? `broadcast start published by the promoter (${announced.basis})` : null,
      start_assertions: announced.assertions,
      source_time_conflict: announced.conflict,
      venue: loc.name ? { name: loc.name, city: loc.city, region: loc.region, country_code: loc.region ? "US" : null } : null,
      broadcaster,
      promoter: PBC.promoter,
      source_url: url,
      captured_at: capturedAt,
      status: "scheduled",
      bouts,
    },
    problems,
    parser_version: PBC.version,
  };
}
