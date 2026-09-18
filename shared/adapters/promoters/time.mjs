// Announced start times, resolved from what a source actually publishes.
//
// A promoter can publish the same start twice: once as a machine timestamp with a numeric offset, once as a human line
// like "8pm ET / 5pm PT". Those are two independent assertions and they can disagree — PBC's JSON-LD carries -05:00 for a
// 19 September card whose printed ET/PT times resolve to -04:00/-07:00. We never silently prefer malformed metadata, and
// we never hardcode an offset: a named zone is resolved through the IANA database for the announced calendar date, so
// daylight saving is applied by the platform rather than by us.

const ZONES = Object.freeze({
  et: 'America/New_York', edt: 'America/New_York', est: 'America/New_York', eastern: 'America/New_York',
  ct: 'America/Chicago', cdt: 'America/Chicago', cst: 'America/Chicago', central: 'America/Chicago',
  mt: 'America/Denver', mdt: 'America/Denver', mst: 'America/Denver', mountain: 'America/Denver',
  pt: 'America/Los_Angeles', pdt: 'America/Los_Angeles', pst: 'America/Los_Angeles', pacific: 'America/Los_Angeles',
  gmt: 'Europe/London', bst: 'Europe/London', uk: 'Europe/London',
});

export function ianaZone(label) {
  return ZONES[String(label ?? '').toLowerCase().replace(/[^a-z]/g, '')] ?? null;
}

// How far the zone is from UTC at a given instant, from the IANA rules the platform ships.
function zoneOffsetMs(instant, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(dtf.formatToParts(instant).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return asUtc - instant.getTime();
}

// "2026-09-19" 20:00 in America/New_York -> the UTC instant, with DST applied for that date.
export function wallClockToUtc(date, hour, minute, timeZone) {
  const [y, m, d] = String(date).split('-').map(Number);
  if (!y || !m || !d || !timeZone) return null;
  const naive = Date.UTC(y, m - 1, d, hour, minute, 0);
  let ts = naive - zoneOffsetMs(new Date(naive), timeZone);
  const corrected = naive - zoneOffsetMs(new Date(ts), timeZone);
  if (corrected !== ts) ts = corrected; // the first guess landed on the other side of a DST change
  return new Date(ts).toISOString();
}

// "8pm ET/5pm PT", "8:00 PM ET", "7.30pm GMT" -> one entry per printed representation
export function parseVisibleStarts(line) {
  const out = [];
  const text = String(line ?? '').replace(/ /g, ' ');
  for (const m of text.matchAll(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*([A-Za-z]{2,8})\b/gi)) {
    const zone = ianaZone(m[4]);
    if (!zone) continue;
    let hour = Number(m[1]);
    if (hour > 23) continue;
    const meridiem = (m[3] ?? '').toLowerCase().replace(/\./g, '');
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    out.push({ printed: m[0].trim(), hour, minute: Number(m[2] ?? 0), zone_label: m[4].toUpperCase(), zone });
  }
  return out;
}

// Decide the canonical instant from every assertion the source makes.
//
//   structured        only the JSON-LD timestamp is present -> use it
//   corroborated      the printed representations agree with each other and with the timestamp -> use it
//   visible_preferred the printed representations agree with each other but not with the timestamp -> use them, and
//                     record the conflict so the disagreement is auditable rather than invisibly corrected
//   unresolved        the printed representations disagree, or one carries a zone we do not recognise while a
//                     timestamp also exists -> no canonical instant; the date and the raw strings are still kept
export function resolveAnnouncedStart({ date, jsonLdValue = null, jsonLdInstant = null, visibleLine = null }) {
  const assertions = [];
  if (jsonLdInstant) assertions.push({ kind: 'structured', raw: jsonLdValue, instant: jsonLdInstant });

  const printed = parseVisibleStarts(visibleLine);
  const resolved = printed.map((p) => ({ kind: 'visible', raw: p.printed, zone: p.zone, zone_label: p.zone_label, instant: wallClockToUtc(date, p.hour, p.minute, p.zone) })).filter((p) => p.instant);
  for (const r of resolved) assertions.push(r);

  const unrecognised = visibleLine && /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i.test(visibleLine) && resolved.length === 0;
  const instants = [...new Set(resolved.map((r) => r.instant))];

  if (!resolved.length) {
    if (unrecognised && jsonLdInstant) {
      return { scheduled_start_at: null, basis: 'unresolved', assertions,
        conflict: { reason: 'a start time is printed but its timezone is not recognised, and the structured timestamp cannot be corroborated', visible_line: visibleLine, json_ld: jsonLdValue } };
    }
    return { scheduled_start_at: jsonLdInstant, basis: jsonLdInstant ? 'structured' : 'none', assertions, conflict: null };
  }
  if (instants.length > 1) {
    return { scheduled_start_at: null, basis: 'unresolved', assertions,
      conflict: { reason: 'the printed start times do not resolve to the same instant', visible_line: visibleLine, derived: instants, json_ld: jsonLdValue } };
  }
  const visible = instants[0];
  if (!jsonLdInstant) return { scheduled_start_at: visible, basis: 'visible', assertions, conflict: null };
  if (visible === jsonLdInstant) return { scheduled_start_at: visible, basis: 'corroborated', assertions, conflict: null };
  return {
    scheduled_start_at: visible,
    basis: 'visible_preferred',
    assertions,
    conflict: {
      code: 'source_time_conflict',
      reason: resolved.length > 1
        ? `the structured timestamp disagrees with the printed times; ${resolved.map((r) => r.zone_label).join(' and ')} independently resolve to the same instant, so the printed times were used`
        : 'the structured timestamp disagrees with the printed time; the printed time was used',
      json_ld: jsonLdValue,
      json_ld_instant: jsonLdInstant,
      visible_line: visibleLine,
      visible_instant: visible,
      corroborating_representations: resolved.map((r) => `${r.raw} (${r.zone})`),
      chosen: 'visible',
    },
  };
}
