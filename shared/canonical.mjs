// Canonical JSON + content hashing shared by every adapter and worker.
//
// content_hash on raw observations, fact-block hashes and dedupe keys must be
// stable across runtimes (Node scripts, Cloudflare Workers). Postgres jsonb
// orders keys by length-then-bytes, so hashes are ALWAYS computed here, on the
// client, from canonicalJson — never from payload::text in SQL.

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function canonicalJson(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new TypeError(`canonicalJson: non-finite number ${value}`);
    }
    if (typeof value === 'bigint') throw new TypeError('canonicalJson: bigint is not JSON');
    return JSON.stringify(value);
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (!isPlainObject(value)) throw new TypeError('canonicalJson: unsupported value');
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

// Works in Node (>=20) and Workers: both expose Web Crypto as globalThis.crypto.
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function contentHash(value, { omit = [] } = {}) {
  let v = value;
  if (omit.length && isPlainObject(value)) {
    v = { ...value };
    for (const k of omit) delete v[k];
  }
  return sha256Hex(canonicalJson(v));
}

// Deterministic dedupe key from ordered parts. Parts are canonicalized so
// `{a:1,b:2}` and `{b:2,a:1}` produce the same key.
export async function dedupeKey(prefix, ...parts) {
  if (!/^[a-z][a-z0-9_]*$/.test(prefix)) throw new TypeError(`dedupeKey: bad prefix "${prefix}"`);
  return `${prefix}:${(await sha256Hex(canonicalJson(parts))).slice(0, 40)}`;
}
