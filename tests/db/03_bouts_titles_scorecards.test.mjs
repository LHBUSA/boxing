// Requirements 6 and 9: multi-title bouts; three-judge round-by-round cards.
// Plus the result/scorecard/weigh-in semantics fixed by the audit.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { basicBout, fighter, official, organization, weightClass } from '../helpers/fixtures.mjs';

let db;
before(async () => { db = await freshDatabase('bouts'); });
after(async () => { await db?.close(); });

async function title(org, wc, key, name) {
  return (await db.client.query(
    `insert into public.boxing_titles (organization_id, weight_class_id, title_key, name, title_type)
     values ($1, $2, $3, $4, 'world') returning *`, [org.id, wc.id, key, name])).rows[0];
}

test('6. one bout can contest multiple titles from different organizations', async () => {
  const { bout, src } = await basicBout(db.client, 'unification');
  const wc = await weightClass(db.client, 'super_middleweight');
  const titles = [];
  for (const slug of ['wbc_t', 'wba_t', 'ibf_t', 'wbo_t']) {
    const org = await organization(db.client, slug);
    titles.push(await title(org, wc, 'world_super_middleweight', `${slug} world title`));
  }
  for (const t of titles) {
    await db.client.query(
      `insert into public.boxing_bout_titles (bout_id, title_id, status, source_id) values ($1, $2, 'unification', $3)`,
      [bout.id, t.id, src.id]);
  }
  const { rows } = await db.client.query(
    `select count(*)::int as n from public.boxing_bout_titles where bout_id = $1`, [bout.id]);
  assert.equal(rows[0].n, 4);
});

test('titles and rankings refuse promoters and broadcasters as issuing bodies', async () => {
  const promoter = await organization(db.client, 'promo_probe', 'promoter');
  const tv = await organization(db.client, 'tv_probe', 'broadcaster');
  const wc = await weightClass(db.client, 'lightweight');
  await expectPgError(() => title(promoter, wc, 'fake', 'Promoter belt'), { code: 'BX030' });
  const { src, evt } = await basicBout(db.client, 'roles');
  await expectPgError(() => db.client.query(
    `insert into public.boxing_ranking_snapshots (organization_id, weight_class_id, source_id, published_on)
     values ($1, $2, $3, '2026-09-01')`, [tv.id, wc.id, src.id]), { code: 'BX030' });
  await expectPgError(() => db.client.query(
    `insert into public.boxing_event_organizations (event_id, organization_id, role) values ($1, $2, 'sanctioning_body')`,
    [evt.id, tv.id]), { code: 'BX030' });
  await db.client.query(
    `insert into public.boxing_event_organizations (event_id, organization_id, role) values ($1, $2, 'promoter'), ($1, $3, 'broadcaster')`,
    [evt.id, promoter.id, tv.id]);
  await expectPgError(() => db.client.query(
    `update public.boxing_organizations set organization_kind = 'sanctioning_body' where id = $1`, [promoter.id]),
  { code: 'BX002' });
});

async function scorecard(boutRow, judge, a, b, totals, extra = {}) {
  return (await db.client.query(
    `insert into public.boxing_scorecards
       (bout_id, judge_id, fighter_a_id, fighter_b_id, fighter_a_total, fighter_b_total, decision_for_id, source_id,
        revision, supersedes_id, card_state, slot, score_basis)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'after_deductions') returning *`,
    [boutRow.bout.id, judge.id, a.id, b.id, totals[0], totals[1], extra.decision_for ?? null, boutRow.src.id,
     extra.revision ?? 1, extra.supersedes_id ?? null, extra.card_state ?? 'official', extra.slot ?? null])).rows[0];
}

test('9. scorecards hold three judges with round-by-round scores', async () => {
  const g = await basicBout(db.client, 'three judges');
  const judges = [await official(db.client, 'Judge One'), await official(db.client, 'Judge Two'), await official(db.client, 'Judge Three')];
  // 12 rounds; judge 3 has a 10-8 knockdown round and a split verdict
  const plans = [
    { totals: [116, 112], winner: g.a, rounds: (r) => (r <= 10 ? [10, 9] : [9, 10]) },
    { totals: [115, 113], winner: g.a, rounds: (r) => (r <= 9 ? [10, 9] : [9, 10]) },
    { totals: [112, 115], winner: g.b, rounds: (r) => (r === 1 ? [8, 10] : r <= 6 ? [10, 9] : [9, 10]) },
  ];
  for (const [i, judge] of judges.entries()) {
    const card = await scorecard(g, judge, g.a, g.b, plans[i].totals, { decision_for: plans[i].winner.id, slot: i + 1 });
    for (let r = 1; r <= 12; r++) {
      const [pa, pb] = plans[i].rounds(r);
      await db.client.query(
        `insert into public.boxing_scorecard_rounds (scorecard_id, round, fighter_a_points, fighter_b_points) values ($1, $2, $3, $4)`,
        [card.id, r, pa, pb]);
    }
  }
  const { rows } = await db.client.query(`
    select s.slot, count(r.*)::int as rounds, sum(r.fighter_a_points)::text as a_sum
    from public.boxing_scorecards_current s join public.boxing_scorecard_rounds r on r.scorecard_id = s.id
    where s.bout_id = $1 group by s.slot order by s.slot`, [g.bout.id]);
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.rounds === 12));
  assert.equal(rows[2].a_sum, '112.0', 'a 10-8 round is stored exactly, not normalized');
});

test('9. a corrected scorecard is a new revision; the original survives', async () => {
  const g = await basicBout(db.client, 'correction');
  const judge = await official(db.client, 'Correction Judge');
  const original = await scorecard(g, judge, g.a, g.b, [114, 114], { slot: 1 });
  await expectPgError(() => db.client.query(
    `update public.boxing_scorecards set fighter_a_total = 115 where id = $1`, [original.id]), { code: 'BX001' });
  await expectPgError(() => scorecard(g, judge, g.a, g.b, [115, 113], { slot: 1 }), { code: '23505' });
  const fixed = await scorecard(g, judge, g.a, g.b, [115, 113],
    { revision: 2, supersedes_id: original.id, card_state: 'corrected', decision_for: g.a.id, slot: 1 });
  const all = await db.client.query('select id from public.boxing_scorecards where bout_id = $1', [g.bout.id]);
  const cur = await db.client.query('select id from public.boxing_scorecards_current where bout_id = $1', [g.bout.id]);
  assert.equal(all.rowCount, 2);
  assert.deepEqual(cur.rows.map((r) => r.id), [fixed.id]);
});

test('scorecards and results cannot reference fighters outside the bout', async () => {
  const g = await basicBout(db.client, 'crosswire');
  const outsider = await fighter(db.client, 'Not In This Bout');
  const judge = await official(db.client, 'Crosswire Judge');
  await expectPgError(() => scorecard(g, judge, g.a, outsider, [10, 9]), { code: '23503' });
  await expectPgError(() => db.client.query(
    `insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method) values ($1, $2, 'win', $3, 'KO')`,
    [g.bout.id, g.src.id, outsider.id]), { code: '23503' });
});

test('result semantics: decisions carry agreement type; stoppages require a winner', async () => {
  const g = await basicBout(db.client, 'semantics');
  const ins = (outcome, winner, method, decisionType) => db.client.query(
    `insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, decision_type, revision, supersedes_id)
     values ($1, $2, $3, $4, $5, $6, 1, null)`, [g.bout.id, g.src.id, outcome, winner, method, decisionType]);
  await expectPgError(() => ins('draw', null, 'KO', null), { code: '23514' });
  await expectPgError(() => ins('win', g.a.id, 'KO', 'split'), { code: '23514' });
  await expectPgError(() => ins('no_contest', null, 'DECISION', null), { code: '23514' });
  await expectPgError(() => ins('win', null, 'TKO', null), { code: '23514' });
  // majority draw and technical draw are both expressible
  const g2 = await basicBout(db.client, 'draws');
  await db.client.query(
    `insert into public.boxing_bout_results (bout_id, source_id, outcome, method, decision_type) values ($1, $2, 'draw', 'DECISION', 'majority')`,
    [g2.bout.id, g2.src.id]);
  const g3 = await basicBout(db.client, 'tech draw');
  await db.client.query(
    `insert into public.boxing_bout_results (bout_id, source_id, outcome, method, round) values ($1, $2, 'draw', 'TECHNICAL_DECISION', 3)`,
    [g3.bout.id, g3.src.id]);
});

test('an overturned result is appended, never overwritten', async () => {
  const g = await basicBout(db.client, 'overturn');
  const first = (await db.client.query(
    `insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, decision_type)
     values ($1, $2, 'win', $3, 'DECISION', 'majority') returning *`, [g.bout.id, g.src.id, g.a.id])).rows[0];
  await expectPgError(() => db.client.query(
    `update public.boxing_bout_results set outcome = 'no_contest', winner_id = null where id = $1`, [first.id]), { code: 'BX001' });
  await db.client.query(
    `insert into public.boxing_bout_results (bout_id, source_id, outcome, method, result_state, revision, supersedes_id, change_reason)
     values ($1, $2, 'no_contest', 'NO_CONTEST', 'overturned', 2, $3, 'commission ruling (test)')`, [g.bout.id, g.src.id, first.id]);
  const cur = await db.client.query('select outcome, result_state from public.boxing_bout_results_current where bout_id = $1', [g.bout.id]);
  assert.deepEqual(cur.rows, [{ outcome: 'no_contest', result_state: 'overturned' }]);
  // a revision cannot fork: only one successor per result
  await expectPgError(() => db.client.query(
    `insert into public.boxing_bout_results (bout_id, source_id, outcome, method, revision, supersedes_id)
     values ($1, $2, 'draw', 'DECISION', 3, $3)`, [g.bout.id, g.src.id, first.id]), { code: '23505' });
});

test('historical round counts above 15 are accepted', async () => {
  const g = await basicBout(db.client, 'long bout');
  await db.client.query('update public.boxing_bouts set scheduled_rounds = 45 where id = $1', [g.bout.id]);
  await db.client.query(
    `insert into public.boxing_bout_results (bout_id, source_id, outcome, winner_id, method, round) values ($1, $2, 'win', $3, 'KO', 26)`,
    [g.bout.id, g.src.id, g.b.id]);
});

test('weigh-ins distinguish the official weigh-in from a rehydration check', async () => {
  const g = await basicBout(db.client, 'weigh');
  const ins = (kind, attempt, weight, status, miss) => db.client.query(
    `insert into public.boxing_weigh_ins
       (bout_id, fighter_id, weigh_in_kind, attempt_no, official_weight_lb, contracted_weight_lb, miss_lb, status, source_id, verification_state)
     values ($1, $2, $3, $4, $5, 147, $6, $7, $8, 'verified')`,
    [g.bout.id, g.a.id, kind, attempt, weight, miss, status, g.src.id]);
  await ins('official', 1, 147.6, 'missed_weight', 0.6);
  await ins('official', 2, 147.0, 'made_weight', 0);
  await ins('rehydration_check', 1, 156.8, 'recorded', null);
  await expectPgError(() => ins('official', 3, 146, 'made_weight', 1.0), { code: '23514' });
  await expectPgError(() => db.client.query(
    `update public.boxing_weigh_ins set official_weight_lb = 147 where bout_id = $1`, [g.bout.id]), { code: 'BX001' });
});
