// Model scope gate: historical/archive rows cannot enter the current model, its inputs or the product by default.
//
// The hard proof the owner asked for: 100,000 archive bouts (with participants and results on the SAME fighters, so an
// unfiltered read would certainly change) leave every current model input byte-identical. It also proves the gate itself:
// an archive row cannot be written while the flag is off, the flag cannot be enabled while any consumer of the bout graph
// is still pending review, the old unfiltered function signatures are gone, and a model must declare an archive opt-in.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshDatabase, expectPgError } from '../helpers/db.mjs';
import { testSource, fighter, official, event, bout, weightClass } from '../helpers/fixtures.mjs';

let db;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const CUTOFF = '2026-12-31T00:00:00Z';
const ARCHIVE_BOUTS = 100_000;
let src;
let fighters = [];
let officials = [];
let bouts = [];

// every current model input, hashed: fighter histories, opponent records, official histories and matchup inputs
async function modelInputDigest(scopes = null) {
  const h = createHash('sha256');
  const arg = scopes ? `, $2::text[]` : '';
  for (const f of fighters) {
    const r = await one(`select public.boxing_fighter_history_as_of($1, '${CUTOFF}'::timestamptz${arg})::text t`, scopes ? [f, scopes] : [f]);
    h.update(`fighter:${f}:${r.t}\n`);
    const g = await one(`select public.boxing_graph_record_before($1, '${CUTOFF}'::timestamptz, '${CUTOFF}'::timestamptz${scopes ? ', $2::text[]' : ''})::text t`,
      scopes ? [f, scopes] : [f]);
    h.update(`record:${f}:${g.t}\n`);
  }
  for (const o of officials) {
    const r = await one(`select public.boxing_official_history_as_of($1, '${CUTOFF}'::timestamptz${arg})::text t`, scopes ? [o, scopes] : [o]);
    h.update(`official:${o}:${r.t}\n`);
  }
  for (const b of bouts) {
    const r = await one(`select public.boxing_matchup_inputs($1${arg})::text t`, scopes ? [b, scopes] : [b]);
    h.update(`matchup:${b}:${r.t}\n`);
  }
  return h.digest('hex');
}

before(async () => {
  db = await freshDatabase('model_scope');
  const source = await testSource(db.client, 'scope_fixture_commission', { source_kind: 'commission' });
  src = source.id;
  const wc = await weightClass(db.client, 'welterweight');
  const rows = [];
  for (const name of ['Ada Vance', 'Bea Cortez', 'Cal Duarte', 'Dana Ek']) rows.push(await fighter(db.client, name));
  fighters = rows.map((r) => r.id);
  const judge = await official(db.client, 'Rae Salter', 'judge');
  const referee = await official(db.client, 'Ivo Marchetti', 'referee');
  officials = [judge.id, referee.id];
  // a small current-scope graph: three bouts with results, one refereed
  const ev = await event(db.client, source, 'Scope Fixture Card', '2026-05-09');
  for (const [a, b] of [[0, 1], [2, 3], [0, 2]]) {
    const row = await bout(db.client, source, ev, rows[a], rows[b], { scheduled_rounds: 10, weight_class_id: wc.id });
    bouts.push(row.id);
    await q(`insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, decision_type, result_state, source_url, revision)
      values ($1, $2, 'win', $3, 'DECISION', 'unanimous', 'official', 'https://example.invalid/r', 1)`, [row.id, src, fighters[a]]);
  }
  await q(`insert into public.boxing_bout_officials (bout_id, official_id, role, slot, source_id, source_url, assignment_state)
    values ($1, $2, 'referee', null, $3, 'https://example.invalid/r', 'worked')`, [bouts[0], officials[1], src]);
});
after(async () => { await db?.close(); });

test('the gate is closed by default: an archive bout cannot be written, and the flag cannot be enabled while consumers are pending', async () => {
  const check = (await one(`select public.boxing_model_scope_check() r`)).r;
  assert.equal(check.archive_scope_ingest_enabled, false);
  assert.equal(check.bouts_by_scope.archive ?? 0, 0);
  assert.equal(check.bouts_by_scope.current, 3);
  assert.ok(check.consumers_pending.includes('boxing_site_fighter_bouts'));
  assert.ok(check.consumers_pending.includes('boxing_emit_news_event'), 'the newsroom must not publish a historical row as news');
  assert.equal(check.violations.archive_bouts_while_gate_disabled, 0);

  await expectPgError(() => q(`update public.boxing_bouts set model_scope = 'archive' where id = $1`, [bouts[0]]), { code: 'BX132' });
  await expectPgError(() => q(`select public.boxing_set_runtime_flag($1)`,
    [{ flag: 'archive_scope_ingest', enabled: true, reason: 'attempt while product consumers are still unreviewed', decided_by: 'pbe_model_scope_test' }]), { code: 'BX131' });
  assert.equal((await one(`select public.boxing_flag_enabled('archive_scope_ingest') f`)).f, false);
});

test('no unfiltered model-input path exists: the original signatures are wrappers that pass current scope', async () => {
  const fns = await q(`select p.oid::regprocedure::text s, pg_get_functiondef(p.oid) def from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('boxing_fighter_history_as_of','boxing_official_history_as_of','boxing_matchup_inputs','boxing_graph_record_before') order by 1`);
  assert.deepEqual(fns.map((r) => r.s), [
    'boxing_fighter_history_as_of(uuid,timestamp with time zone)',
    'boxing_fighter_history_as_of(uuid,timestamp with time zone,text[])',
    'boxing_graph_record_before(uuid,timestamp with time zone,timestamp with time zone)',
    'boxing_graph_record_before(uuid,timestamp with time zone,timestamp with time zone,text[])',
    'boxing_matchup_inputs(uuid)',
    'boxing_matchup_inputs(uuid,text[])',
    'boxing_official_history_as_of(uuid,timestamp with time zone)',
    'boxing_official_history_as_of(uuid,timestamp with time zone,text[])',
  ], 'the original arity still exists (callers depend on it) and the scoped arity beside it');
  // every original-arity function is a wrapper that passes current scope; none reads boxing_bouts itself
  for (const f of fns.filter((x) => !x.s.includes('text[]'))) {
    assert.match(f.def, /array\['current'\]::text\[\]/, f.s);
    assert.doesNotMatch(f.def, /boxing_bouts/, `${f.s} must not read the bout graph directly`);
  }
  // the scoped versions take p_scopes without a default, so no call can be ambiguous or silently unfiltered
  for (const f of fns.filter((x) => x.s.includes('text[]'))) assert.doesNotMatch(f.def, /DEFAULT/i, f.s);
  const model = (await one(`select model_scopes from public.boxing_models where model_key = 'pbe_bout_winner'`));
  assert.deepEqual(model.model_scopes, ['current'], 'the registered model opts into current scope only');
  await expectPgError(() => q(`insert into public.boxing_models (model_key, version, name, description, target, feature_model_key, feature_model_version, status, model_scopes)
    values ('pbe_scope_probe', '0.1.0', 'probe', 'probe', 'bout_winner', 'pbe_matchup_dna', '1.0.0', 'untrained', array['historical'])`), { code: '23514' });
});

test(`${ARCHIVE_BOUTS.toLocaleString('en-US')} archive bouts on the same fighters change no current model input`, async () => {
  const before = await modelInputDigest();
  const beforeRecord = (await one(`select public.boxing_graph_record_before($1, '${CUTOFF}'::timestamptz, '${CUTOFF}'::timestamptz) r`, [fighters[0]])).r;
  assert.equal(beforeRecord.bouts, 2, 'the fixture record is real, so an unfiltered read would change it');

  // the future state: every consumer reviewed, then the owner-style flag decision
  await q(`update public.boxing_scope_consumers set classification = 'current_only_enforced', reviewed_by = 'pbe_model_scope_test', reviewed_at = now()
           where classification = 'pending_scope_review'`);
  const flag = (await one(`select public.boxing_set_runtime_flag($1) r`,
    [{ flag: 'archive_scope_ingest', enabled: true, reason: 'model scope acceptance test: prove archive rows cannot reach current model inputs', decided_by: 'pbe_model_scope_test' }])).r;
  assert.equal(flag.enabled, true);

  const t0 = Date.now();
  await q(`insert into public.boxing_events (source_id, external_event_id, name, event_date, status, source_url)
    select $1, 'archive-ev-' || g, 'Archive Card ' || g, (date '1950-01-01' + (g * 30)), 'complete', 'https://example.invalid/archive'
    from generate_series(1, 50) g`, [src]);
  // batched so the load stays inside a modest amount of memory on a laptop-class host
  const BATCH = 10_000;
  for (let from = 1; from <= ARCHIVE_BOUTS; from += BATCH) {
    const to = Math.min(from + BATCH - 1, ARCHIVE_BOUTS);
    await q(`with new_bouts as (
        insert into public.boxing_bouts (event_id, source_id, external_bout_id, scheduled_rounds, status, source_url, model_scope, competition_class)
        select e.id, $1, 'archive-bout-' || g, 10, 'complete', 'https://example.invalid/archive', 'archive', 'professional'
        from generate_series($2::int, $3::int) g
        join lateral (select id from public.boxing_events where external_event_id = 'archive-ev-' || ((g % 50) + 1) limit 1) e on true
        returning id, external_bout_id),
      corners as (
        insert into public.boxing_bout_participants (bout_id, fighter_id, side, source_id, source_url, participant_status)
        select b.id, case when (substring(b.external_bout_id from 14))::int % 2 = 0 then $4::uuid else $5::uuid end, 'a', $1, 'https://example.invalid/archive', 'confirmed'
        from new_bouts b
        union all
        select b.id, case when (substring(b.external_bout_id from 14))::int % 2 = 0 then $6::uuid else $7::uuid end, 'b', $1, 'https://example.invalid/archive', 'confirmed'
        from new_bouts b
        returning bout_id, fighter_id, side)
      insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, result_state, source_url, revision)
      select c.bout_id, $1, 'win', c.fighter_id, 'KO', 'official', 'https://example.invalid/archive', 1 from corners c where c.side = 'a'`,
      [src, from, to, fighters[0], fighters[2], fighters[1], fighters[3]]);
  }
  const counts = await one(`select (select count(*) from public.boxing_bouts where model_scope = 'archive') b,
    (select count(*) from public.boxing_bout_participants p join public.boxing_bouts x on x.id = p.bout_id where x.model_scope = 'archive') p,
    (select count(*) from public.boxing_bout_results r join public.boxing_bouts x on x.id = r.bout_id where x.model_scope = 'archive') r`);
  assert.deepEqual([Number(counts.b), Number(counts.p), Number(counts.r)], [ARCHIVE_BOUTS, ARCHIVE_BOUTS * 2, ARCHIVE_BOUTS]);
  console.log(`  loaded ${ARCHIVE_BOUTS} archive bouts + ${ARCHIVE_BOUTS * 2} participants + ${ARCHIVE_BOUTS} results in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const after = await modelInputDigest();
  console.log(`  current model input digest before: ${before}`);
  console.log(`  current model input digest after : ${after}`);
  assert.equal(after, before, 'every current model input is byte-identical after the archive load');
  assert.deepEqual((await one(`select public.boxing_graph_record_before($1, '${CUTOFF}'::timestamptz, '${CUTOFF}'::timestamptz) r`, [fighters[0]])).r, beforeRecord,
    'the fixture fighter, who now also has 50,000 archive bouts, still has exactly the record he had');
  const archiveBout = (await one(`select id from public.boxing_bouts where model_scope = 'archive' limit 1`)).id;
  assert.equal((await one(`select public.boxing_matchup_inputs($1) r`, [archiveBout])).r, null, 'a model may not read an archive bout without opting in');

  // the filter is real, not vacuous: with an explicit opt-in the same reads do change. A probe fighter with exactly three
  // archive bouts makes that exact rather than approximate (a full archive-scope history of a 50,000-bout fighter would be
  // a load test of the engine, not a test of the gate).
  const probe = (await one(`insert into public.boxing_fighters (display_name, identity_state) values ('Eli Novak', 'source_native') returning id`)).id;
  await q(`with b as (
      insert into public.boxing_bouts (event_id, source_id, external_bout_id, scheduled_rounds, status, source_url, model_scope, competition_class)
      select e.id, $1, 'probe-archive-' || g, 10, 'complete', 'https://example.invalid/archive', 'archive', 'professional'
      from generate_series(1, 3) g join lateral (select id from public.boxing_events where external_event_id = 'archive-ev-1' limit 1) e on true
      returning id),
    pa as (insert into public.boxing_bout_participants (bout_id, fighter_id, side, source_id, source_url, participant_status)
      select b.id, $2::uuid, 'a', $1, 'https://example.invalid/archive', 'confirmed' from b returning bout_id, fighter_id)
    insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, result_state, source_url, revision)
    select pa.bout_id, $1, 'win', pa.fighter_id, 'KO', 'official', 'https://example.invalid/archive', 1 from pa`, [src, probe]);
  const probeDefault = (await one(`select public.boxing_graph_record_before($1, '${CUTOFF}'::timestamptz, '${CUTOFF}'::timestamptz) r`, [probe])).r;
  assert.equal(probeDefault.bouts, 0, 'by default the archive is invisible');
  const optedRecord = (await one(`select public.boxing_graph_record_before($1, '${CUTOFF}'::timestamptz, '${CUTOFF}'::timestamptz, array['current','archive']) r`, [probe])).r;
  assert.equal(optedRecord.bouts, 3, 'an explicit archive opt-in sees exactly the archive bouts');
  assert.equal(optedRecord.wins, 3);
  assert.notEqual((await one(`select public.boxing_matchup_inputs($1, array['current','archive']) r`, [archiveBout])).r, null);

  const check = (await one(`select public.boxing_model_scope_check() r`)).r;
  assert.equal(check.archive_scope_ingest_enabled, true);
  assert.equal(Number(check.bouts_by_scope.archive), ARCHIVE_BOUTS + 3, 'the bulk load plus the three probe bouts');
  assert.equal(check.models_opted_into_archive, 0, 'no registered model opts into archive scope');
  assert.equal(check.violations.archive_bouts_while_gate_disabled, 0);
  assert.equal(check.flag_history[0].decided_by, 'pbe_model_scope_test');
});

test('archive rows stay out of the current graph assertions and are counted, not hidden', async () => {
  const a = (await one(`select public.boxing_archive_index() r`)).r;
  assert.ok(a.coverage.bouts > ARCHIVE_BOUTS, 'the history layer sees them on purpose');
  const scope = (await one(`select public.boxing_model_scope_check() r`)).r;
  assert.equal(Number(scope.bouts_by_scope.current), 3, 'the current-scope graph is unchanged');
});
