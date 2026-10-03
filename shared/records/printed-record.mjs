// Strict parser for a professional record printed on an official document (Fight Record V1, 2026-10-03).
//
// The exact printed string is always kept. Only components the text states are parsed:
//   "18-9"        -> wins 18, losses 9, draws null (a missing draw component is NOT 0), no_contests null
//   "13-7-1"      -> wins 13, losses 7, draws 1, no_contests null
//   "9-1-2-1"     -> wins 9, losses 1, draws 2, no_contests 1 (only when a fourth component is printed)
//   "12-3-1 (8 KO)" / "12-3-1, 8 KOs" -> ko_wins 8 only because the KO count is printed
//   "0-0"         -> a debut record as printed (0 wins, 0 losses)
// Anything else (blank, "N/A", "Debut", letters, a date-like shape, more than four components): held, every count null.

export const PRINTED_RECORD_PARSER = 'printed-record@1.0.0';

export function parsePrintedRecord(raw) {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const held = (note) => ({ raw: text, parse_state: 'held', parse_note: note, wins: null, losses: null, draws: null, no_contests: null, ko_wins: null });
  const m = text.match(/^(\d{1,3})-(\d{1,3})(?:-(\d{1,3}))?(?:-(\d{1,3}))?(?:\s*[,(]?\s*(\d{1,3})\s*KOs?\s*\)?)?$/i);
  if (!m) return held('not a W-L[-D[-NC]] record as printed');
  const [, w, l, d, nc, ko] = m;
  const n = (x) => (x == null ? null : Number(x));
  if (n(ko) != null && n(ko) > n(w)) return held('KO count larger than wins');
  return { raw: text, parse_state: 'parsed', parse_note: null, wins: n(w), losses: n(l), draws: n(d), no_contests: n(nc), ko_wins: n(ko) };
}
