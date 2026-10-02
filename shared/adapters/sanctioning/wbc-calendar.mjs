// WBC fight calendar (https://wbcboxing.com/en/events/) -> DISCOVERY evidence only.
//
// wbc_official is approved for rankings and title status, not for schedule ingest. Its public calendar is used the way
// migration 0046 defines discovery: "we may be missing this card" is a candidate, never a canonical event, and a
// candidate needs only a registered source, not a writing lane. Each calendar entry either matches an event a schedule
// lane already holds (same date + same event name or city) or stays an OPEN candidate that a schedule source has to
// confirm. Nothing here creates an event, a bout or a fighter.
//
// Observed layout (2026-10-02):
//   list   article.cartel > a.cartel__link[href=/en/events/<slug>/] > time.cartel__fecha[datetime=YYYY-MM-DD],
//          h3.cartel__combate > span.cartel__boxeador "Name <span class=cartel__pais>(flag Country)</span>" x2,
//          span.cartel__peso "WBC Super Middleweight Title", p.cartel__lugar "Riyadh, Saudi Arabia"
//   event  dl.evento__datos: Date / Time / Promoter / Venue (city, country; no venue name)

export const WBC_CALENDAR = Object.freeze({
  sourceKey: 'wbc_official',
  version: 'wbc-calendar@1.0.0',
  listUrl: 'https://wbcboxing.com/en/events/',
  origin: 'https://wbcboxing.com',
  minIntervalMs: 3_000,
});

const ENTITIES = { amp: '&', nbsp: ' ', quot: '"', apos: "'", '#8217': '’', '#8216': '‘', '#038': '&', '#039': "'" };
const decode = (s) => s.replace(/&(#?\w+);/g, (m, k) => ENTITIES[k] ?? (k.startsWith('#') ? String.fromCodePoint(Number(k.slice(1))) : m));
const text = (s) => decode(String(s ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// "O’Shaquie Foster" -> "Foster"; event names follow the house rule "Surname vs Surname"
const surname = (n) => n.split(' ').filter(Boolean).pop();

// a WBC location prints "San Antonio Texas, USA" / "Carson, California USA" / "Hermosillo Sonora, Mexico": the city is
// the first comma part with a trailing state or province name removed, so it compares with the city a promoter states
const REGIONS = ['texas', 'california', 'nevada', 'new york', 'florida', 'arizona', 'new jersey', 'illinois', 'sonora', 'jalisco',
  'nuevo leon', 'baja california', 'quebec', 'ontario'];
export function wbcLocation(line) {
  const parts = text(line).split(',').map((x) => x.trim()).filter(Boolean);
  let city = parts[0] ?? null;
  let region = null;
  if (city) {
    for (const r of REGIONS) {
      const m = new RegExp(`^(.+?)\\s+(${r})$`, 'i').exec(city);
      if (m) { city = m[1]; region = m[2]; break; }
    }
  }
  const tail = (parts.slice(1).join(' ') || '').replace(/\b(california|texas|nevada|new york|florida|arizona|new jersey|illinois)\b/i, (x) => { region ??= x; return ''; }).trim();
  const country = /^(usa|united states)$/i.test(tail) ? 'US' : /^(uk|united kingdom|great britain|england)$/i.test(tail) ? 'GB' : tail || null;
  return { city, region, country };
}

export function parseWbcCalendar(html) {
  const out = [];
  for (const m of String(html).matchAll(/<article class="cartel">([\s\S]*?)<\/article>/g)) {
    const card = m[1];
    const url = /<a href="(https:\/\/wbcboxing\.com\/en\/events\/[^"]+)"/.exec(card)?.[1];
    const date = /<time class="cartel__fecha" datetime="(\d{4}-\d{2}-\d{2})"/.exec(card)?.[1] ?? null;
    const names = [...card.matchAll(/<span class="cartel__boxeador">([\s\S]*?)<span class="cartel__pais">/g)].map((x) => text(x[1])).filter(Boolean);
    if (!url || names.length !== 2) continue;
    const title = text(/<span class="cartel__peso">([\s\S]*?)<\/span>/.exec(card)?.[1] ?? '') || null;
    const where = wbcLocation(/<p class="cartel__lugar">([\s\S]*?)<\/p>/.exec(card)?.[1] ?? '');
    out.push({ url, date, fighters: names, title_as_published: title, ...where });
  }
  return out;
}

// event page: only the promoter it states (and its own date, which must agree with the list)
export function parseWbcEventPage(html) {
  const dl = /<dl class="evento__datos">([\s\S]*?)<\/dl>/.exec(String(html))?.[1] ?? '';
  const facts = {};
  for (const m of dl.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) facts[text(m[1]).toLowerCase()] = text(m[2]);
  return { promoter: facts.promoter || null, date_line: facts.date || null, time_line: facts.time || null, location_line: facts.venue || null };
}

// calendar entry (+ optional event page) -> boxing_record_event_candidate payload
export function wbcCandidate(entry, page = null) {
  const [a, b] = entry.fighters;
  return {
    source_key: WBC_CALENDAR.sourceKey,
    external_key: entry.url,
    discovered_name: `${surname(a)} vs ${surname(b)}`,
    probable_date: entry.date,
    probable_city: entry.city,
    probable_country: entry.country,
    probable_promoter: page?.promoter ?? null,
    probable_broadcaster: null,
    headline: `${a} vs ${b}${entry.title_as_published ? ` (${entry.title_as_published})` : ''}`,
    source_url: entry.url,
    // the date and pairing come from the sanctioning body that sanctions the bout; the card around it is not stated
    confidence: entry.date ? 'high' : 'low',
  };
}
