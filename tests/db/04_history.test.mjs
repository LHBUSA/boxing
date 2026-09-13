// Requirements 7, 8, 10, 11, 12: ranking snapshots, append-only ticks,
// versioned derived intelligence, news provenance, immutable fight state.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { basicBout, event, fighter, organization, testSource, weightClass } from '../helpers/fixtures.mjs';

let db;
before(async () => { db = await freshDatabase('history'); });
after(async () => { await db?.close(); });

async function snapshot(org, wc, src, publishedOn, entries, extra = {}) {
  const snap = (await db.client.query(
    `insert into public.boxing_ranking_snapshots
       (organization_id, weight_class_id, source_id, published_on, revision, supersedes_id, correction_note)
     values ($1, $2, $3, $4, $5, $6, $7) returning *`,
    [org.id, wc.id, src.id, publishedOn, extra.revision ?? 1, extra.supersedes_id ?? null, extra.note ?? null])).rows[0];
  for (const [position, e] of entries.entries()) {
    await db.client.query(
      `insert into public.boxing_ranking_entries
         (snapshot_id, position, rank, rank_label, fighter_id, source_name, is_vacant, is_champion)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [snap.id, position + 1, e.rank ?? null, e.label, e.fighter?.id ?? null, e.name ?? null, e.vacant ?? false, e.champion ?? false]);
  }
  return snap;
}

test('7. rankings preserve historical snapshots and corrections', async () => {
  const src = await testSource(db.client);
  const org = await organization(db.client, 'rank_body');
  const wc = await weightClass(db.client, 'welterweight');
  const [c, x, y] = [await fighter(db.client, 'Champ'), await fighter(db.client, 'Contender X'), await fighter(db.client, 'Contender Y')];

  const aug = await snapshot(org, wc, src, '2026-08-01', [
    { label: 'C', fighter: c, champion: true }, { rank: 1, label: '1', vacant: true }, { rank: 2, label: '2', fighter: x },
    { rank: 3, label: '3', fighter: y },
  ]);
  const sep = await snapshot(org, wc, src, '2026-09-01', [
    { label: 'C', fighter: c, champion: true }, { rank: 1, label: '1', fighter: y }, { rank: 2, label: '2', fighter: x },
  ]);
  // same org/division/date re-ingested: refused rather than duplicated
  await expectPgError(() => snapshot(org, wc, src, '2026-09-01', []), { code: '23505' });
  // a source correction of September is a new revision; the original remains
  await snapshot(org, wc, src, '2026-09-01', [
    { label: 'C', fighter: c, champion: true }, { rank: 1, label: '1', fighter: x }, { rank: 2, label: '2', fighter: y },
  ], { revision: 2, supersedes_id: sep.id, note: 'source corrected #1/#2 (test)' });

  await expectPgError(() => db.client.query(
    'update public.boxing_ranking_entries set fighter_id = $1 where snapshot_id = $2 and position = 3', [c.id, aug.id]), { code: 'BX001' });
  await expectPgError(() => db.client.query('delete from public.boxing_ranking_snapshots where id = $1', [aug.id]), { code: 'BX001' });

  const { rows } = await db.client.query(`
    select s.published_on::text, s.revision, e.rank_label, f.display_name
    from public.boxing_ranking_snapshots s
    join public.boxing_ranking_entries e on e.snapshot_id = s.id
    left join public.boxing_fighters f on f.id = e.fighter_id
    where s.organization_id = $1 and e.rank = 1 order by s.published_on, s.revision`, [org.id]);
  assert.deepEqual(rows, [
    { published_on: '2026-08-01', revision: 1, rank_label: '1', display_name: null },
    { published_on: '2026-09-01', revision: 1, rank_label: '1', display_name: 'Contender Y' },
    { published_on: '2026-09-01', revision: 2, rank_label: '1', display_name: 'Contender X' },
  ]);
  // undated snapshots are refused (they could never be deduplicated)
  await expectPgError(() => db.client.query(
    `insert into public.boxing_ranking_snapshots (organization_id, weight_class_id, source_id) values ($1, $2, $3)`,
    [org.id, wc.id, src.id]), { code: '23514' });
});

async function marketFixture(label) {
  const g = await basicBout(db.client, label);
  const prov = (await db.client.query(
    `insert into public.boxing_odds_providers (slug, name, source_id) values ($1, $1, $2) returning *`, [`prov_${label}`, g.src.id])).rows[0];
  const book = (await db.client.query(
    `insert into public.boxing_bookmakers (slug, name) values ($1, $1) returning *`, [`book_${label}`])).rows[0];
  const market = (await db.client.query(
    `insert into public.boxing_markets (bout_id, provider_id, bookmaker_id, market_type, market_key)
     values ($1, $2, $3, 'moneyline', 'moneyline|fight|-') returning *`, [g.bout.id, prov.id, book.id])).rows[0];
  const sel = (await db.client.query(
    `insert into public.boxing_market_selections (market_id, selection_key, fighter_id, label)
     values ($1, 'fighter_a', $2, 'A') returning *`, [market.id, g.a.id])).rows[0];
  return { ...g, prov, book, market, sel };
}

test('8. odds ticks are append-only', async () => {
  const m = await marketFixture('ticks');
  const tick = (american, decimal, ts) => db.client.query(
    `insert into public.boxing_market_ticks (selection_id, american_odds, decimal_odds, implied_probability, provider_timestamp)
     values ($1, $2, $3, $4, $5) returning id`, [m.sel.id, american, decimal, 1 / decimal, ts]);
  const t1 = (await tick(-150, 1.666667, '2026-09-10T10:00:00Z')).rows[0];
  await tick(-175, 1.571429, '2026-09-11T10:00:00Z');
  await expectPgError(() => db.client.query('update public.boxing_market_ticks set american_odds = -110 where id = $1', [t1.id]), { code: 'BX001' });
  await expectPgError(() => db.client.query('delete from public.boxing_market_ticks where id = $1', [t1.id]), { code: 'BX001' });
  await expectPgError(() => db.client.query('truncate public.boxing_market_ticks'), { code: 'BX001' });
  await expectPgError(() => db.client.query('delete from public.boxing_bouts where id = $1', [m.bout.id]), { code: '23503' });
  await expectPgError(() => tick(50, 1.5, '2026-09-12T10:00:00Z'), { code: '23514', match: /american_check/ });
  const { rows } = await db.client.query(
    'select american_odds from public.boxing_market_ticks where selection_id = $1 order by provider_timestamp', [m.sel.id]);
  assert.deepEqual(rows.map((r) => r.american_odds), [-150, -175]);
});

test('10. derived intelligence is versioned independently of source facts', async () => {
  const g = await basicBout(db.client, 'intel');
  await db.client.query(`
    insert into public.boxing_metric_definitions (metric_key, version, name, description, formula_text, value_kind, minimum_sample)
    values ('ko_rate', '1.0.0', 'KO rate', 'Share of wins by KO/TKO/RTD', 'stoppage_wins / wins', 'rate', '{"wins": 5}'),
           ('ko_rate', '2.0.0', 'KO rate', 'Share of pro bouts ended by stoppage win', 'stoppage_wins / bouts', 'rate', '{"bouts": 8}')`);
  await expectPgError(() => db.client.query(
    `update public.boxing_metric_definitions set formula_text = 'x' where metric_key = 'ko_rate' and version = '1.0.0'`), { code: 'BX002' });
  await db.client.query(`update public.boxing_metric_definitions set retired_at = now() where metric_key = 'ko_rate' and version = '1.0.0'`);

  const snap = (v, value) => db.client.query(
    `insert into public.boxing_fighter_metric_snapshots (fighter_id, metric_key, metric_version, as_of, value_number, sample_size)
     values ($1, 'ko_rate', $2, '2026-09-01T00:00:00Z', $3, 10) returning id`, [g.a.id, v, value]);
  const s1 = (await snap('1.0.0', 0.8)).rows[0];
  await snap('2.0.0', 0.5);
  await expectPgError(() => snap('3.0.0', 0.1), { code: '23503' });
  await expectPgError(() => db.client.query('update public.boxing_fighter_metric_snapshots set value_number = 1 where id = $1', [s1.id]), { code: 'BX001' });

  const { rows } = await db.client.query(
    `select metric_version, value_number::text from public.boxing_fighter_metric_snapshots where fighter_id = $1 order by 1`, [g.a.id]);
  assert.deepEqual(rows, [{ metric_version: '1.0.0', value_number: '0.8' }, { metric_version: '2.0.0', value_number: '0.5' }]);

  // no canonical fact table references derived tables, so derived writes cannot alter facts
  const { rows: back } = await db.client.query(`
    select conrelid::regclass::text as rel from pg_constraint
    where contype = 'f' and confrelid in ('public.boxing_fighter_metric_snapshots'::regclass,
      'public.boxing_matchup_snapshots'::regclass, 'public.boxing_official_metric_snapshots'::regclass,
      'public.boxing_metric_definitions'::regclass)
      -- derived tables may reference each other (model outputs -> matchup snapshots)
      and conrelid not in ('public.boxing_fighter_metric_snapshots'::regclass, 'public.boxing_official_metric_snapshots'::regclass,
        'public.boxing_model_outputs'::regclass)`);
  assert.deepEqual(back, []);

  // an official tendency without a sample size is refused
  const judge = (await db.client.query(
    `insert into public.boxing_officials (display_name, official_type) values ('Sample Probe', 'judge') returning id`)).rows[0];
  await expectPgError(() => db.client.query(
    `insert into public.boxing_official_metric_snapshots (official_id, metric_key, metric_version, as_of)
     values ($1, 'ko_rate', '2.0.0', now())`, [judge.id]), { code: '23502', match: /sample_size/ });
});

test('11. structured news events retain provenance and are immutable', async () => {
  const g = await basicBout(db.client, 'news');
  const insert = (sources, key) => db.client.query(
    `insert into public.boxing_news_events (event_type, dedupe_key, bout_id, fighter_ids, source_id, payload, sources, confidence)
     values ('FIGHT_ANNOUNCED', $1, $2, $3, $4, $5, $6, 90) returning *`,
    [key, g.bout.id, [g.a.id, g.b.id], g.src.id, { facts: { scheduled_rounds: 12 } }, JSON.stringify(sources)]);
  await expectPgError(() => insert([], 'no-sources'), { code: '23514', match: /sources_check/ });
  const evt = (await insert([{ source_key: g.src.source_key, observed_at: '2026-09-12T00:00:00Z' }], 'fa:1')).rows[0];
  await expectPgError(() => insert([{ source_key: g.src.source_key, observed_at: '2026-09-12T00:00:00Z' }], 'fa:1'), { code: '23505' });

  await expectPgError(() => db.client.query(
    `update public.boxing_news_events set payload = '{"facts":{"scheduled_rounds":10}}' where id = $1`, [evt.id]), { code: 'BX002' });
  await expectPgError(() => db.client.query(
    `update public.boxing_news_events set sources = '[{"source_key":"forged"}]' where id = $1`, [evt.id]), { code: 'BX002' });
  await db.client.query(`update public.boxing_news_events set state = 'needs_review', state_changed_at = now() where id = $1`, [evt.id]);
  await expectPgError(() => db.client.query('delete from public.boxing_news_events where id = $1', [evt.id]), { code: 'BX001' });

  await expectPgError(() => db.client.query(
    `insert into public.boxing_news_events (event_type, dedupe_key, payload, sources) values ('BOUT_CANCELLED', 'legacy', '{}', '[{"source_key":"x"}]')`),
  { code: '23514', match: /event_type_check/ });
});

test('12. fight-state snapshots are immutable and cannot cross-wire events', async () => {
  const g = await basicBout(db.client, 'ledger');
  const otherEvent = await event(db.client, g.src, 'Other card');
  const insert = (eventId, marketState) => db.client.query(
    `insert into public.boxing_fight_state_ledger (bout_id, boxing_event_id, checkpoint, bout_state, market_state)
     values ($1, $2, 't_minus_24h', '{"status":"scheduled"}', $3)
     on conflict on constraint boxing_fight_state_ledger_dedupe_key do nothing returning id`,
    [g.bout.id, eventId, marketState]);

  await expectPgError(() => insert(otherEvent.id, {}), { code: '23503', match: /bout_event_fkey/ });
  const first = (await insert(g.evt.id, { status: 'unavailable' })).rows[0];
  assert.equal((await insert(g.evt.id, { status: 'unavailable' })).rowCount, 0, 'identical checkpoint state is not re-inserted');
  assert.equal((await insert(g.evt.id, { status: 'available', a: -150 })).rowCount, 1, 'changed state appends');

  await expectPgError(() => db.client.query(
    `update public.boxing_fight_state_ledger set market_state = '{}' where id = $1`, [first.id]), { code: 'BX001' });
  await expectPgError(() => db.client.query('delete from public.boxing_fight_state_ledger where id = $1', [first.id]), { code: 'BX001' });
  await expectPgError(() => db.client.query('delete from public.boxing_events where id = $1', [g.evt.id]), { code: '23503' });
});
