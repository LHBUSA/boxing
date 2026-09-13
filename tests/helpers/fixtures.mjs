// Minimal graph builders for schema tests. Every row these create is test
// data inside a disposable database; none of it describes a real fight.

import { createHash, randomUUID } from 'node:crypto';

const one = async (client, sql, params) => (await client.query(sql, params)).rows[0];

export const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function testSource(client, key = `test_source_${randomUUID().slice(0, 8)}`, overrides = {}) {
  const o = {
    source_kind: 'data_provider',
    access_mode: 'approved_ingest',
    rights_state: 'approved',
    enabled: true,
    persistence_allowed: true,
    ...overrides,
  };
  return one(client,
    `insert into public.boxing_sources
       (source_key, source_name, source_kind, access_mode, rights_state, enabled, persistence_allowed, reviewed_at, reviewed_by)
     values ($1, $1, $2, $3, $4, $5, $6, now(), 'test harness')
     returning *`,
    [key, o.source_kind, o.access_mode, o.rights_state, o.enabled, o.persistence_allowed]);
}

export async function fighter(client, displayName, extra = {}) {
  return one(client,
    `insert into public.boxing_fighters (display_name, normalized_name, dob, nationality, sex, identity_state)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [displayName, extra.normalized_name ?? null, extra.dob ?? null, extra.nationality ?? null,
     extra.sex ?? null, extra.identity_state ?? 'source_native']);
}

export async function organization(client, slug, kind = 'sanctioning_body') {
  return one(client,
    `insert into public.boxing_organizations (slug, name, short_name, organization_kind)
     values ($1, upper($1), upper($1), $2) returning *`,
    [slug, kind]);
}

export async function weightClass(client, key) {
  return one(client, 'select * from public.boxing_weight_classes where class_key = $1', [key]);
}

export async function event(client, source, name = 'Test Card', eventDate = '2026-10-10') {
  return one(client,
    `insert into public.boxing_events (source_id, external_event_id, name, event_date, status)
     values ($1, $2, $3, $4, 'scheduled') returning *`,
    [source.id, randomUUID(), name, eventDate]);
}

export async function bout(client, source, evt, fighterA, fighterB, extra = {}) {
  const b = await one(client,
    `insert into public.boxing_bouts
       (event_id, source_id, external_bout_id, weight_class_id, contracted_weight_lb, scheduled_rounds, status)
     values ($1, $2, $3, $4, $5, $6, 'scheduled') returning *`,
    [evt.id, source.id, randomUUID(), extra.weight_class_id ?? null, extra.contracted_weight_lb ?? null,
     extra.scheduled_rounds ?? 12]);
  await client.query(
    `insert into public.boxing_bout_participants (bout_id, fighter_id, side, source_id) values ($1, $2, 'a', $4), ($1, $3, 'b', $4)`,
    [b.id, fighterA.id, fighterB.id, source.id]);
  return b;
}

export async function official(client, name, type = 'judge') {
  return one(client,
    `insert into public.boxing_officials (display_name, official_type, identity_state)
     values ($1, $2, 'source_native') returning *`,
    [name, type]);
}

export async function observation(client, source, entityType, externalKey, payload) {
  return one(client,
    `insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
     values ($1, $2, $3, $4, $5)
     on conflict on constraint boxing_observations_dedupe_key do nothing
     returning *`,
    [source.id, entityType, externalKey, payload, hash(payload)]);
}

// Builds a complete two-fighter bout for tests that just need "a bout".
export async function basicBout(client, label = 'basic') {
  const src = await testSource(client);
  const a = await fighter(client, `${label} Fighter A`);
  const b = await fighter(client, `${label} Fighter B`);
  const evt = await event(client, src, `${label} card`);
  const bt = await bout(client, src, evt, a, b);
  return { src, a, b, evt, bout: bt };
}
