// Data minimization for official commission documents.
//
// Commission result sheets carry fields Boxing Core must never retain or
// expose: federal boxer identification numbers, dates of birth, medical and
// physician details, addresses, phone numbers, SSNs. Adapters drop those
// COLUMNS by position before any text leaves the parser, and every string that
// is persisted or published passes assertMinimized() as a second line of
// defence. DOB is not used, not even transiently, for identity resolution.

export const SENSITIVE_PATTERNS = Object.freeze([
  { kind: 'federal_id', re: /\b[A-Z]{2}-?\d{5,8}\b/ },
  // New Jersey prints "ID# PA 869206": anything after "ID#", or a spaced state + long number
  { kind: 'federal_id', re: /ID\s*#\s*[A-Z]{2}\s*\d{4,9}|\b[A-Z]{2}\s\d{6,8}\b/ },
  { kind: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { kind: 'phone', re: /\(\d{3}\)\s*\d{3}[-.\s]\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b/ },
  { kind: 'date_of_birth', re: /\b(?:DOB|D\.O\.B\.|date of birth)\b/i },
  { kind: 'medical', re: /\b(?:ringside physicians?|ringside doctors?|physicians?|medical|concussion|cat ?scan|mri|eye exam|ophthalm|hiv|hepatitis|blood test|hospital\w*|trauma|no contact|(?:neck|head|hand|eye|shoulder|back|knee|rib)\s+(?:pain|injur\w*)|injur(?:y|ies|ed)\s+(?:experienced|sustained|suffered|to))\b/i },
]);

// Scrubs a free-text line: removes identifier-shaped tokens and phone numbers.
export function scrubText(text) {
  return String(text ?? '')
    .replace(/\b[A-Z]{2}-?\d{5,8}\b/g, '')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '')
    .replace(/\(\d{3}\)\s*\d{3}[-.\s]\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function findSensitive(value, path = '$', hits = []) {
  if (value == null) return hits;
  if (typeof value === 'string') {
    for (const p of SENSITIVE_PATTERNS) if (p.re.test(value)) hits.push({ path, kind: p.kind });
    return hits;
  }
  if (Array.isArray(value)) { value.forEach((v, i) => findSensitive(v, `${path}[${i}]`, hits)); return hits; }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (/^(dob|date_of_birth|federal_?id|fed_?id|ssn|phone|telephone|address|medical|physician)/i.test(k)) hits.push({ path: `${path}.${k}`, kind: 'sensitive_key' });
      findSensitive(v, `${path}.${k}`, hits);
    }
  }
  return hits;
}

export class SensitiveDataError extends Error {
  constructor(hits) { super(`sensitive data refused: ${hits.slice(0, 5).map((h) => `${h.kind}@${h.path}`).join(', ')}`); this.code = 'sensitive_data'; this.hits = hits; }
}

export function assertMinimized(value) {
  const hits = findSensitive(value);
  if (hits.length) throw new SensitiveDataError(hits);
  return value;
}
