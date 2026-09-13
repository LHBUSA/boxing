import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, contentHash, dedupeKey, sha256Hex } from './canonical.mjs';

test('canonicalJson sorts keys recursively and drops undefined', () => {
  assert.equal(canonicalJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: undefined } }), '{"a":{"d":[3,{"y":2,"z":1}]},"b":1}');
});

test('canonicalJson rejects values that would hash unstably', () => {
  assert.throws(() => canonicalJson({ x: Number.NaN }), /non-finite/);
  assert.throws(() => canonicalJson({ x: 10n }), /bigint/);
});

test('sha256Hex matches a known vector', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('contentHash is key-order independent and honours omit', async () => {
  const a = await contentHash({ price: -150, book: 'x', fetched_at: '2026-09-12T00:00:00Z' }, { omit: ['fetched_at'] });
  const b = await contentHash({ book: 'x', price: -150, fetched_at: '2026-09-13T00:00:00Z' }, { omit: ['fetched_at'] });
  assert.equal(a, b);
  assert.notEqual(a, await contentHash({ book: 'x', price: -155 }));
});

test('dedupeKey is deterministic and prefixed', async () => {
  const k1 = await dedupeKey('market_moved', 'bout-1', { sel: 'a', window: 60 });
  const k2 = await dedupeKey('market_moved', 'bout-1', { window: 60, sel: 'a' });
  assert.equal(k1, k2);
  assert.match(k1, /^market_moved:[0-9a-f]{40}$/);
  await assert.rejects(() => dedupeKey('Bad Prefix', 1), /bad prefix/);
});
