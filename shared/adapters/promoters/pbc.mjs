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
import { isPlaceholderName, placeholderRefusal } from './names.mjs';

export const PBC = Object.freeze({
  sourceKey: 'promoter_pbc',
  namespace: 'pbc',
  version: 'pbc-schedule@1.1.0',
  // site rebuilt (observed 2026-10-02): the schedule moved to /events/schedule and event pages to /events/<id>
  scheduleUrl: 'https://www.premierboxingchampions.com/events/schedule',
  origin: 'https://www.premierboxingchampions.com',
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
  if (/class="pbc-schedule__card"/.test(html)) return parsePbcScheduleV11(html);
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
  if (/class="pbc-event__matchup"/.test(html)) return parsePbcEventV11(html, { url, capturedAt });
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
    if (isPlaceholderName(nameA) || isPlaceholderName(nameB)) {
      problems.push(placeholderRefusal(order, nameA, nameB));
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
      // card size as advertised: named pairings plus slots printed without a named opponent (TBC)
      placeholder_slots: problems.filter((p) => /opponent not announced/.test(p)).length,
      announced_slots: bouts.length + problems.filter((p) => /opponent not announced|pairing not stated/.test(p)).length,
    },
    problems,
    parser_version: PBC.version,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// v1.1.0 layout (observed 2026-10-02)
//   /events/schedule  .pbc-schedule__card: h2 > a[href=/bouts/<id>] "<span>A</span> vs <span>B</span>" per fight,
//                     li.pbc-schedule__arena "Venue, City, ST", a[href=/events/<id>] "View Fight Night"
//   /events/<id>      JSON-LD SportsEvent (location.name, location.address "City, ST", startDate = UTC instant);
//                     p.pbc-event__meta "SAT, OCT 17, 2026 · 8pm ET / 5pm PT · Venue, City, ST" = the LOCAL date and the
//                     printed start; h2.pbc-event__matchup > a[href=/bouts/<id>] in card order, p.pbc-event__summary each

const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

// "SAT, OCT 17, 2026" -> "2026-10-17": the printed LOCAL date, never derived from the UTC instant
export function parsePbcVisibleDate(line) {
  const m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})\b/i.exec(line ?? '');
  return m ? `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}` : null;
}

const pairingFromAnchor = (inner) => [...inner.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((x) => text(x[1])).filter(Boolean);
const slugPart = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function parsePbcScheduleV11(html) {
  const doc = strip(html);
  const out = [];
  for (const m of doc.matchAll(/<div class="pbc-schedule__card">([\s\S]*?)<\/ul>/g)) {
    const card = m[1];
    const id = /href="\/events\/(\d+)"/.exec(card)?.[1];
    if (!id) continue;
    const pairs = [...card.matchAll(/<h2><a href="\/bouts\/\d+">([\s\S]*?)<\/a><\/h2>/g)]
      .map((x) => pairingFromAnchor(x[1])).filter((p) => p.length === 2).map((p) => `${p[0]} vs ${p[1]}`);
    const parts = text(/<li class="pbc-schedule__arena">([\s\S]*?)<\/li>/.exec(card)?.[1] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    // the date printed in this schedule row, just before the card block
    const row = text(doc.slice(Math.max(0, m.index - 4000), m.index));
    const dates = [...row.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})\b/gi)];
    const d = dates.at(-1);
    out.push({
      url: `${PBC.origin}/events/${id}`,
      headline: pairs[0] ?? null,
      announced_pairings: pairs,
      probable_date: d ? `${d[3]}-${MONTHS[d[1].toLowerCase()]}-${d[2].padStart(2, '0')}` : null,
      local_time: null,
      venue: parts[0] ?? null,
      city: parts[1] ?? null,
      region: parts[2] ?? null,
    });
  }
  return out;
}

function parsePbcEventV11(html, { url, capturedAt }) {
  const doc = strip(html);
  const problems = [];
  const node = jsonLdEvents(doc)[0] ?? null;
  const metaLine = text(/<p class="pbc-event__meta">([\s\S]*?)<\/p>/.exec(doc)?.[1] ?? '').replace(/\s+,/g, ',');
  const date = parsePbcVisibleDate(metaLine);
  if (!date) problems.push('no event date printed on the page');
  const instant = /Z$/.test(node?.startDate ?? '') && !Number.isNaN(Date.parse(node.startDate)) ? new Date(node.startDate).toISOString() : null;
  const announced = resolveAnnouncedStart({ date, jsonLdValue: node?.startDate ?? null, jsonLdInstant: instant, visibleLine: metaLine || null });
  if (announced.conflict) problems.push(`start time: ${announced.conflict.reason}`);
  const addr = String(node?.location?.address ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const venueName = typeof node?.location?.name === 'string' ? node.location.name.trim() : null;
  const bouts = [];
  const blocks = [...doc.matchAll(/<h2 class="pbc-event__matchup"><a href="\/bouts\/(\d+)">([\s\S]*?)<\/a><\/h2>(?:\s*<p class="pbc-event__summary">([\s\S]*?)<\/p>)?/g)];
  blocks.forEach((m, i) => {
    const order = i + 1;
    const names = pairingFromAnchor(m[2]);
    if (names.length !== 2) { problems.push(`bout ${order}: pairing not stated as "A vs B"`); return; }
    const [nameA, nameB] = names;
    if (isPlaceholderName(nameA) || isPlaceholderName(nameB)) { problems.push(placeholderRefusal(order, nameA, nameB)); return; }
    // the one-line summary is read only for distance, division and title; its prose is never stored
    const line = text(m[3] ?? '');
    const parsedTitle = parseTitleLine(/\b(interim\s+)?\b(wbc|wba|ibf|wbo)\b[^.]*?\b(champion|title)\b/i.test(line)
      ? (/\b((?:interim\s+)?(?:wbc|wba|ibf|wbo)\s+[a-z ]*?(?:champion|title))\b/i.exec(line)?.[1] ?? '')
      : '');
    bouts.push({
      source_bout_id: `${url.split('/').filter(Boolean).pop()}|${order}|${slugPart(nameA)}|${slugPart(nameB)}`,
      fighter_a: { name: nameA },
      fighter_b: { name: nameB },
      division: parsedTitle.titles[0]?.weight_class_key ?? divisionFromText(line),
      scheduled_rounds: roundsFromText(line),
      titles: parsedTitle.titles,
      titles_unresolved: parsedTitle.unresolved,
      status: 'scheduled',
      bout_order: order,
      card_segment: order === 1 ? 'main_event' : order === 2 ? 'co_main' : 'undercard',
    });
  });
  if (!blocks.length) problems.push('no announced bouts on the event page');
  const network = /<span class="pbc-event__network-label">Live on<\/span>[\s\S]*?alt="([^"]+)"/.exec(doc)?.[1] ?? null;
  return {
    observation: {
      source_key: PBC.sourceKey,
      source_event_id: url.split('/').filter(Boolean).pop(),
      event_name: bouts[0] ? `${bouts[0].fighter_a.name.split(' ').pop()} vs ${bouts[0].fighter_b.name.split(' ').pop()}` : `Premier Boxing Champions at ${venueName ?? 'venue to be confirmed'}`,
      scheduled_date: date,
      scheduled_start_at: announced.scheduled_start_at,
      published_start_local: null,
      published_utc_offset: null,
      published_start_line: metaLine || null,
      start_basis: announced.scheduled_start_at ? `broadcast start published by the promoter (${announced.basis})` : null,
      start_assertions: announced.assertions,
      source_time_conflict: announced.conflict,
      venue: venueName ? { name: venueName, city: addr[0] ?? null, region: addr[1] ?? null, country_code: /^[A-Z]{2}$/.test(addr[1] ?? '') ? 'US' : null } : null,
      broadcaster: network ? text(network) : null,
      promoter: PBC.promoter,
      source_url: url,
      captured_at: capturedAt,
      status: 'scheduled',
      bouts,
      placeholder_slots: problems.filter((p) => /opponent not announced/.test(p)).length,
      announced_slots: bouts.length + problems.filter((p) => /opponent not announced|pairing not stated/.test(p)).length,
    },
    problems,
    parser_version: PBC.version,
  };
}
