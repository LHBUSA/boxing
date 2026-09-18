// Announced-slot placeholders, shared by every promoter adapter.
//
// A card often prints a slot before the opponent is signed. Promoters spell that several ways — Matchroom writes "TBC",
// PBC writes "TBD", others spell it out — and each spelling means the same thing: there is no second fighter yet. A
// placeholder must never become a canonical fighter, so the test lives in one place rather than being re-guessed per
// adapter. A pairing is a bout only when BOTH corners are actual named people.
//
// The test is an exact match on a normalised string, never a substring: a real fighter whose name merely contains these
// letters ("Tbarek", "Abatba") is a name and is left alone.

const normalise = (name) => String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const PLACEHOLDER = /^(?:opponent\s+)?(?:tbd|tba|tbc|to be (?:announced|confirmed|determined))(?:\s+opponent)?$/;

export function isPlaceholderName(name) {
  const n = normalise(name);
  if (!n) return true;                 // an empty corner is not a fighter either
  if (n === 'opponent') return true;   // the slot itself, with nothing else said about it
  // "T.B.C." normalises to "t b c": a string that is nothing but single letters is an abbreviation, not a name
  if (/^[a-z]( [a-z])*$/.test(n) && PLACEHOLDER.test(n.replace(/ /g, ''))) return true;
  return PLACEHOLDER.test(n);
}

// "bout 5: opponent not announced (TBC)" — the refusal quotes what the source actually printed
export function placeholderRefusal(order, nameA, nameB) {
  const printed = isPlaceholderName(nameA) ? nameA : nameB;
  const shown = String(printed ?? '').trim();
  return `bout ${order}: opponent not announced${shown ? ` (${shown})` : ''}`;
}
