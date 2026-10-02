import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postgrestStore } from './postgrest.mjs';

test('strings sent to PostgREST never carry U+0000 (Postgres rejects it); other text is unchanged', async () => {
  let sent = null;
  const store = postgrestStore({ url: 'https://x.supabase.co', serviceKey: 'k', fetchImpl: async (u, init) => { sent = init.body; return new Response('null', { status: 200 }); } });
  await store.recordObservation({ text: 'SMITH\u0000 JR', nested: { a: ['x\u0000y'] }, n: 1, accent: 'Núñez' });
  assert.ok(!sent.includes('\u0000'));
  assert.deepEqual(JSON.parse(sent), { p: { text: 'SMITH JR', nested: { a: ['xy'] }, n: 1, accent: 'Núñez' } });
});
