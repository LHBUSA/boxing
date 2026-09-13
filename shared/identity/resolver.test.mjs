import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveIdentity } from './resolver.mjs';
import { probes, REGISTRY, seeds } from '../../tests/fixtures/identity-cases.mjs';

// Candidate objects in the shape boxing_identity_candidates() returns.
const candidates = seeds.map((s) => ({
  id: s.key,
  public_id: `pbe_boxer_${s.key}`,
  display_name: s.display_name,
  dob: s.dob,
  sex: s.sex,
  nationalities: s.nationality,
  division_keys: s.division_keys,
  aliases: (s.names ?? []).map((n) => ({ alias: n.text, kind: n.kind, verification_state: 'verified' })),
  identities: [
    { namespace: REGISTRY, external_id: s.external_id, verification_state: 'verified' },
    ...(s.extra_identities ?? []).map((i) => ({ ...i, verification_state: 'verified' })),
  ],
  bouts: [],
}));

for (const p of probes) {
  test(`resolver: ${p.id}`, () => {
    const mapped = candidates.find((c) => c.identities.some((i) => i.namespace === p.ns && i.external_id === p.obs.external_id)) ?? null;
    const d = resolveIdentity(p.obs, { mapped, candidates }, {
      namespace: p.ns,
      allowCreate: p.allowCreate ?? true,
      scope: p.scope ?? null,
    });
    const summary = { outcome: d.outcome, reason: d.reason, fighter: d.fighter_id, verification: d.verification_state };
    assert.equal(d.outcome, p.expect.outcome, JSON.stringify({ summary, top: d.candidates?.slice(0, 3) }));
    if (p.expect.reason) assert.equal(d.reason, p.expect.reason, JSON.stringify(summary));
    if (p.expect.fighter) assert.equal(d.fighter_id, p.expect.fighter);
    if (p.expect.verification) assert.equal(d.verification_state, p.expect.verification);
    if (d.outcome === 'review') assert.ok(d.candidates.length >= 1, 'a review item must carry its candidates');
  });
}

test('resolver: a weak name match never auto-merges, whatever the medium evidence', () => {
  const cand = { ...candidates.find((c) => c.id === 'wieczorek') };
  const d = resolveIdentity(
    { display_name: 'Tomas Wieczorek', nationality: ['PL'], division_keys: ['middleweight'], stance: 'orthodox', hometown: 'Lodz' },
    { candidates: [{ ...cand, stance: 'orthodox', hometown: 'Lodz' }] },
    { namespace: 'fixture_feed', allowCreate: true });
  assert.equal(d.outcome, 'review');
});

test('resolver: decisions are deterministic', () => {
  const p = probes.find((x) => x.id === 'same_name_no_evidence');
  const a = resolveIdentity(p.obs, { candidates }, { namespace: p.ns, allowCreate: true });
  const b = resolveIdentity(p.obs, { candidates: [...candidates].reverse() }, { namespace: p.ns, allowCreate: true });
  assert.deepEqual(a, b);
});
