// Issue #2 acceptance against a real database. All boxers, bouts, titles and
// ranking lists here are synthetic.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { testSource } from '../helpers/fixtures.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { ingestIdentity } from '../../shared/identity/pipeline.mjs';
import { recordTitleEvent } from '../../shared/titles/events.mjs';
import { buildTitleMap } from '../../shared/titles/title-map.mjs';
import { importRankingDocument } from '../../shared/rankings/import.mjs';

let db;
let store;
const F = {};
const SRC = 'titles_fixture_source';

async function boxer(key, name, dob, nationality = 'US') {
  const { result } = await ingestIdentity(store, {
    sourceKey: SRC, accessMode: 'approved_ingest', namespace: 'titles_fixture',
    record: { external_id: key, display_name: name, dob, nationality: [nationality] }, payload: { key },
  });
  F[key] = result.fighter_id;
}

const title = (org, wc, tier, label = null, gender = 'male') =>
  store.ensureTitle({ organizationSlug: org, weightClassKey: wc, gender, tier, sourceNativeLabel: label });

async function boutFor(a, b, date, titleIds = [], winner = null) {
  const src = (await db.client.query('select id from public.boxing_sources where source_key = $1', [SRC])).rows[0];
  const evt = (await db.client.query(`insert into public.boxing_events (source_id, name, event_date, status) values ($1, 'Synthetic', $2, 'complete') returning id`, [src.id, date])).rows[0];
  const bt = (await db.client.query(`insert into public.boxing_bouts (event_id, source_id, status) values ($1, $2, 'complete') returning id`, [evt.id, src.id])).rows[0];
  await db.client.query(`insert into public.boxing_bout_participants (bout_id, fighter_id, side) values ($1, $2, 'a'), ($1, $3, 'b')`, [bt.id, F[a], F[b]]);
  for (const t of titleIds) await db.client.query(`insert into public.boxing_bout_titles (bout_id, title_id, source_id) values ($1, $2, $3)`, [bt.id, t, src.id]);
  if (winner) {
    await db.client.query(`insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, decision_type) values ($1, $2, 'win', $3, 'DECISION', 'unanimous')`,
      [bt.id, src.id, F[winner]]);
  }
  return bt.id;
}

const ev = (titleId, eventType, extra = {}) => recordTitleEvent(store, { title_id: titleId, event_type: eventType, source_key: SRC, ...extra });
const holderOn = async (titleId, date) => (await db.client.query(
  `select fighter_id from public.boxing_title_reigns_derived($1) where started_on <= $2 and (ended_on is null or ended_on > $2)`, [titleId, date])).rows.map((r) => r.fighter_id);

before(async () => {
  db = await freshDatabase('titles');
  store = pgStore(db.client);
  await testSource(db.client, SRC);
  for (const [k, n, d] of [
    ['king', 'Victor Kane', '1990-01-01'], ['rival', 'Sam Rowe', '1991-02-02'], ['interim', 'Ike Tolan', '1992-03-03'],
    ['mover', 'Leo Marsh', '1993-04-04'], ['regular', 'Rex Bayo', '1994-05-05'], ['contender', 'Cody Fenn', '1995-06-06'],
    ['prospect', 'Paul Ekwe', '1996-07-07'],
  ]) await boxer(k, n, d);
});
after(async () => { await db?.close(); });

test('the four first-class sanctioning bodies exist and are typed', async () => {
  const { rows } = await db.client.query(`select slug, organization_kind, sanctioning_scope from public.boxing_organizations where slug in ('wbc','wba','ibf','wbo') order by slug`);
  assert.deepEqual(rows.map((r) => `${r.slug}:${r.organization_kind}:${r.sanctioning_scope}`),
    ['wba:sanctioning_body:world', 'wbc:sanctioning_body:world', 'ibf:sanctioning_body:world', 'wbo:sanctioning_body:world'].sort());
});

test('title won via bout; simultaneous belts; loses one belt but keeps others', async () => {
  const wbc = await title('wbc', 'welterweight', 'world');
  const ibf = await title('ibf', 'welterweight', 'world');
  const wbo = await title('wbo', 'welterweight', 'world');
  const unification = await boutFor('king', 'rival', '2025-03-01', [wbc, ibf], 'king');
  const r1 = await ev(wbc, 'won', { fighter_id: F.king, effective_on: '2025-03-01', bout_id: unification });
  const r2 = await ev(ibf, 'won', { fighter_id: F.king, effective_on: '2025-03-01', bout_id: unification });
  assert.equal(r1.news.event_type, 'TITLE_WON');
  assert.equal(r2.news.inserted, true);
  await ev(wbo, 'awarded', { fighter_id: F.king, effective_on: '2025-06-01', reason_public: 'elevated from interim (synthetic)' });
  assert.deepEqual([await holderOn(wbc, '2025-07-01'), await holderOn(ibf, '2025-07-01'), await holderOn(wbo, '2025-07-01')].flat(), [F.king, F.king, F.king]);

  // loses only the WBO belt in a bout where just that belt was on the line
  const wboDefense = await boutFor('rival', 'king', '2025-11-01', [wbo], 'rival');
  await ev(wbo, 'won', { fighter_id: F.rival, effective_on: '2025-11-01', bout_id: wboDefense });
  assert.deepEqual(await holderOn(wbo, '2025-12-01'), [F.rival]);
  assert.deepEqual(await holderOn(wbc, '2025-12-01'), [F.king]);
  assert.deepEqual(await holderOn(ibf, '2025-12-01'), [F.king]);
  const reigns = await store.titleReigns(wbo);
  assert.deepEqual(reigns.map((r) => [r.fighter_id, r.ended_on?.toISOString?.().slice(0, 10) ?? null, r.end_type]),
    [[F.king, '2025-11-01', 'won'], [F.rival, null, null]]);
});

test('a bout-based title event must match the bout and its official result', async () => {
  const wbc = await title('wbc', 'lightweight', 'world');
  const other = await title('wbo', 'lightweight', 'world');
  const bout = await boutFor('contender', 'prospect', '2025-04-04', [wbc], 'contender');
  await expectPgError(() => ev(other, 'won', { fighter_id: F.contender, effective_on: '2025-04-04', bout_id: bout }), { code: 'BX061' });
  await expectPgError(() => ev(wbc, 'won', { fighter_id: F.prospect, effective_on: '2025-04-04', bout_id: bout }), { code: 'BX062' });
  await expectPgError(() => ev(wbc, 'won', { fighter_id: F.king, effective_on: '2025-04-04', bout_id: bout }), { code: 'BX080' });
});

test('interim and full champion coexist as separate lineages', async () => {
  const full = await title('wbc', 'middleweight', 'world');
  const interim = await title('wbc', 'middleweight', 'interim', 'Interim');
  await ev(full, 'awarded', { fighter_id: F.king, effective_on: '2024-01-01' });
  await ev(interim, 'awarded', { fighter_id: F.interim, effective_on: '2024-06-01', reason_public: 'champion inactive (synthetic)' });
  const map = buildTitleMap(await store.titleMapFacts('middleweight', 'male', '2024-07-01'));
  const wbc = map.organizations.find((o) => o.organization_slug === 'wbc');
  assert.equal(wbc.primary_champion.fighter_id, F.king, 'interim never counts as the primary champion');
  assert.deepEqual(wbc.overlapping_champions.map((x) => x.tier).sort(), ['interim', 'world']);
});

test('vacancy; title awarded and vacated without a bout', async () => {
  const t = await title('ibf', 'cruiserweight', 'world');
  await ev(t, 'awarded', { fighter_id: F.mover, effective_on: '2024-02-02' });
  const v = await ev(t, 'vacated', { fighter_id: F.mover, effective_on: '2024-09-09', reason_public: 'relinquished to move up (synthetic)' });
  assert.equal(v.news.event_type, 'TITLE_VACATED');
  assert.deepEqual(await holderOn(t, '2024-10-01'), []);
  const map = buildTitleMap(await store.titleMapFacts('cruiserweight', 'male', '2024-10-01'));
  const ibf = map.organizations.find((o) => o.organization_slug === 'ibf');
  assert.deepEqual(ibf.vacancies, [{ title_id: t, tier: 'world', since: '2024-09-09' }]);
});

test('fighter changes division: relinquishes one lineage, wins another', async () => {
  const low = await title('wbo', 'super_middleweight', 'world');
  const high = await title('wbo', 'light_heavyweight', 'world');
  await ev(low, 'awarded', { fighter_id: F.mover, effective_on: '2023-01-01' });
  await ev(low, 'relinquished', { fighter_id: F.mover, effective_on: '2024-01-15' });
  const b = await boutFor('mover', 'contender', '2024-05-05', [high], 'mover');
  await ev(high, 'won', { fighter_id: F.mover, effective_on: '2024-05-05', bout_id: b });
  assert.deepEqual(await holderOn(low, '2024-06-01'), []);
  assert.deepEqual(await holderOn(high, '2024-06-01'), [F.mover]);
  const hist = await holderOn(low, '2023-06-01');
  assert.deepEqual(hist, [F.mover], 'historical state is reconstructable for any date');
});

test('stripping emits TITLE_STRIPPED and requires review; same fact from a second source is not duplicated', async () => {
  const t = await title('wba', 'featherweight', 'regular', 'World');
  await ev(t, 'awarded', { fighter_id: F.contender, effective_on: '2024-03-03' });
  const s = await ev(t, 'stripped', { fighter_id: F.contender, effective_on: '2025-01-10', reason_public: 'failed to make weight (synthetic)' });
  assert.equal(s.news.event_type, 'TITLE_STRIPPED');
  assert.equal(s.news.requires_human_review, true);
  await testSource(db.client, 'titles_second_source');
  const again = await recordTitleEvent(store, { title_id: t, event_type: 'stripped', fighter_id: F.contender, effective_on: '2025-01-10', source_key: 'titles_second_source' });
  assert.equal(again.inserted, false);
  assert.equal(again.news, null);
  const n = (await db.client.query(`select count(*)::int n from public.boxing_news_events where event_type = 'TITLE_STRIPPED'`)).rows[0].n;
  assert.equal(n, 1);
});

test('organization-specific statuses: WBA Super, World (regular) and interim coexist; labels preserved', async () => {
  const sup = await title('wba', 'heavyweight', 'super', 'Super Champion');
  const reg = await title('wba', 'heavyweight', 'regular', 'World Champion');
  const inter = await title('wba', 'heavyweight', 'interim', 'Interim Champion');
  const franchise = await title('wbc', 'heavyweight', 'franchise', 'Franchise Champion');
  await ev(sup, 'elevated', { fighter_id: F.king, effective_on: '2024-01-01', source_native_status: 'Super Champion' });
  await ev(reg, 'awarded', { fighter_id: F.regular, effective_on: '2024-01-01', source_native_status: 'World Champion' });
  await ev(inter, 'awarded', { fighter_id: F.interim, effective_on: '2024-02-01' });
  await ev(franchise, 'awarded', { fighter_id: F.rival, effective_on: '2024-02-01', source_native_status: 'Franchise Champion' });
  const map = buildTitleMap(await store.titleMapFacts('heavyweight', 'male', '2024-03-01'));
  const wba = map.organizations.find((o) => o.organization_slug === 'wba');
  assert.equal(wba.primary_champion.fighter_id, F.king);
  assert.deepEqual(wba.belts.map((b) => b.source_native_label).sort(), ['Interim Champion', 'Super Champion', 'World Champion']);
  const wbc = map.organizations.find((o) => o.organization_slug === 'wbc');
  assert.equal(wbc.primary_champion, null, 'a franchise designation does not count toward undisputed by default');
  const { rows } = await db.client.query('select source_native_status from public.boxing_title_events where title_id = $1', [sup]);
  assert.equal(rows[0].source_native_status, 'Super Champion');
});

test('undisputed is derived from simultaneous ownership and changes when a belt is vacated', async () => {
  const belts = {};
  for (const org of ['wbc', 'wba', 'ibf', 'wbo']) {
    belts[org] = await title(org, 'super_bantamweight', org === 'wba' ? 'super' : 'world');
    await ev(belts[org], 'awarded', { fighter_id: F.prospect, effective_on: '2025-02-01' });
  }
  const before = buildTitleMap(await store.titleMapFacts('super_bantamweight', 'male', '2025-03-01'));
  assert.equal(before.derived.undisputed_champion.fighter_id, F.prospect);
  assert.equal(before.derived.version, 'pbe_undisputed@1');
  await ev(belts.ibf, 'vacated', { fighter_id: F.prospect, effective_on: '2025-04-01' });
  const after = buildTitleMap(await store.titleMapFacts('super_bantamweight', 'male', '2025-05-01'));
  assert.equal(after.derived.undisputed_champion, null);
  assert.equal(after.derived.unification[0].state, 'unified');
  // history is intact: as of March the boxer is still undisputed
  const replay = buildTitleMap(await store.titleMapFacts('super_bantamweight', 'male', '2025-03-01'));
  assert.equal(replay.derived.undisputed_champion.fighter_id, F.prospect);
});

test('a corrected title event supersedes the wrong one without deleting it', async () => {
  const t = await title('wbo', 'flyweight', 'world');
  const wrong = await ev(t, 'awarded', { fighter_id: F.rival, effective_on: '2024-08-08' });
  const fixed = await ev(t, 'awarded', { fighter_id: F.contender, effective_on: '2024-08-08', supersedes_id: wrong.id });
  assert.equal(fixed.news.requires_human_review, true);
  assert.ok(fixed.news.supersedes_dedupe_key);
  assert.deepEqual(await holderOn(t, '2024-09-01'), [F.contender]);
  const all = (await db.client.query('select count(*)::int n from public.boxing_title_events where title_id = $1', [t])).rows[0].n;
  assert.equal(all, 2, 'the original event is retained');
  await expectPgError(() => db.client.query('delete from public.boxing_title_events where id = $1', [wrong.id]), { code: 'BX001' });
});

const doc = (published, entries, extra = {}) => ({
  source_key: SRC, organization_slug: 'wbc', division_label: 'Super Welterweight (154 lbs)', published_on: published,
  source_url: `https://example.invalid/wbc/${published}`, entries, ...extra,
});
const entry = (position, rank_label, source_name, extra = {}) => ({ position, rank_label, source_name, ...extra });
const SEPTEMBER = [
  { position: 1, rank_label: 'C', is_vacant: true },
  entry(2, '1', 'Cody Fenn', { source_fighter_id: 'w-3', mandatory: true, designation: 'Mandatory' }),
  entry(3, '2', 'Victor Kane', { source_fighter_id: 'w-1' }),
  entry(4, '3', 'Paul Ekwe', { source_fighter_id: 'w-4' }),
];

test('ranking snapshots over time: history preserved, changes detected, RANKING_CHANGED emitted once', async () => {
  // seed identities for the ranking org namespace so entries resolve deterministically
  for (const [k, id] of [['king', 'w-1'], ['rival', 'w-2'], ['contender', 'w-3'], ['prospect', 'w-4']]) {
    await db.client.query(`insert into public.boxing_fighter_identities (fighter_id, source_id, namespace, external_id, verification_state, confidence)
      values ($1, (select id from public.boxing_sources where source_key = $2), 'wbc.ranking_entry', $3, 'verified', 100)`, [F[k], SRC, id]);
  }
  const aug = await importRankingDocument(store, doc('2026-08-01', [
    entry(1, 'C', 'Victor Kane', { source_fighter_id: 'w-1', is_champion: true }),
    entry(2, '1', 'Sam Rowe', { source_fighter_id: 'w-2' }),
    entry(3, '2', 'Cody Fenn', { source_fighter_id: 'w-3', mandatory: false }),
    entry(4, '3', 'Nobody Resolvable'),
  ]));
  assert.equal(aug.status, 'created');
  assert.equal(aug.event, null, 'first list has nothing to compare against');
  assert.deepEqual(aug.unresolved.map((u) => u.source_name), ['Nobody Resolvable']);

  const sep = await importRankingDocument(store, doc('2026-09-01', SEPTEMBER));
  const types = sep.changes.map((c) => c.type);
  for (const t of ['title_vacant_in_ranking', 'no_longer_champion', 'moved_up', 'new_entrant', 'removed', 'designation_changed', 'mandatory_changed']) {
    assert.ok(types.includes(t), `missing ${t} in ${types}`);
  }
  assert.equal(sep.event.event_type, 'RANKING_CHANGED');
  assert.equal(sep.event.inserted, true);
  assert.equal(sep.event.requires_human_review, true, 'an unresolved boxer left the list');

  const again = await importRankingDocument(store, doc('2026-09-01', SEPTEMBER));
  assert.equal(again.status, 'duplicate');
  assert.equal((await db.client.query(`select count(*)::int n from public.boxing_news_events where event_type = 'RANKING_CHANGED'`)).rows[0].n, 1);

  const august = await store.rankingSnapshotAsOf('wbc', 'super_welterweight', 'male', '2026-08-15');
  assert.equal(august.entries[0].display_name, 'Victor Kane');
  assert.equal(august.entries[0].is_champion, true, 'August is still readable exactly as published');
});

test('source correction creates a revision; the original snapshot survives', async () => {
  const fix = await importRankingDocument(store, doc('2026-09-01', [
    { position: 1, rank_label: 'C', is_vacant: true },
    entry(2, '1', 'Victor Kane', { source_fighter_id: 'w-1' }),
    entry(3, '2', 'Cody Fenn', { source_fighter_id: 'w-3', mandatory: true, designation: 'Mandatory' }),
    entry(4, '3', 'Paul Ekwe', { source_fighter_id: 'w-4' }),
  ], { correction_note: 'WBC republished #1/#2 (synthetic)' }));
  assert.equal(fix.status, 'revised');
  assert.equal(fix.revision, 2);
  assert.ok(fix.event.supersedes_dedupe_key);
  assert.equal(fix.event.payload.facts.is_correction, true);
  const snaps = (await db.client.query(`select published_on::text, revision, supersedes_id is not null sup, correction_note from public.boxing_ranking_snapshots s
    join public.boxing_organizations o on o.id = s.organization_id where o.slug = 'wbc' order by published_on, revision`)).rows;
  assert.deepEqual(snaps.map((r) => `${r.published_on}#${r.revision}`), ['2026-08-01#1', '2026-09-01#1', '2026-09-01#2']);
  const current = await store.rankingSnapshotAsOf('wbc', 'super_welterweight', 'male', '2026-09-15');
  assert.equal(current.revision, 2);
  assert.equal(current.entries[1].display_name, 'Victor Kane');
  const supersededEvent = (await db.client.query(`select n2.dedupe_key from public.boxing_news_events n1 join public.boxing_news_events n2 on n2.id = n1.supersedes_id where n1.id = $1`, [fix.event.id])).rows;
  assert.equal(supersededEvent.length, 1, 'the corrected RANKING_CHANGED links to the one it supersedes');
});

test('title map for a division/date: champions, rankings, mandatories, vacancies, recent changes', async () => {
  const t = await title('wbc', 'super_welterweight', 'world');
  await ev(t, 'awarded', { fighter_id: F.king, effective_on: '2026-01-01' });
  await ev(t, 'vacated', { fighter_id: F.king, effective_on: '2026-08-20' });
  const map = buildTitleMap(await store.titleMapFacts('super_welterweight', 'male', '2026-09-15'));
  const wbc = map.organizations.find((o) => o.organization_slug === 'wbc');
  assert.equal(wbc.belts[0].status, 'vacant');
  const ranking = map.rankings.find((r) => r.organization_slug === 'wbc');
  assert.equal(ranking.snapshot.revision, 2);
  assert.deepEqual(ranking.mandatory_challengers.map((m) => m.name), ['Cody Fenn']);
  assert.ok(map.recent_changes.title_events.some((e) => e.event_type === 'vacated'));
  assert.ok(map.recent_changes.ranking_changes.length === 1);
});

test('ranking import from an unapproved source is refused by the database', async () => {
  await expectPgError(() => importRankingDocument(store, { ...doc('2026-10-01', [entry(1, '1', 'Sam Rowe')]), source_key: 'boxrec' }),
    { code: 'BX010', match: /boxrec/ });
});
