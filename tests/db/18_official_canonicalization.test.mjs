// Officials cleanup safety: a corrected parse of the same commission document never creates an
// uncontrolled duplicate official, a surname never merges, and Category A parser artifacts are
// canonicalized without deleting or re-pointing history. Synthetic documents only.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { expectPgError, freshDatabase } from '../helpers/db.mjs';
import { pgStore } from '../../scripts/lib/pg-store.mjs';
import { applyCommissionParsed } from '../../shared/commissions/apply.mjs';
import { NEVADA, parseNevadaResults } from '../../shared/adapters/commissions/nevada.mjs';
import { SPORT } from '../../shared/adapters/commissions/contract.mjs';
import { assertMinimized } from '../../shared/adapters/commissions/minimize.mjs';
import { sha256Hex } from '../../shared/canonical.mjs';
import { buildCleanupPlan, OFFICIAL_CLEANUP_VERSION } from '../../shared/identity/official-cleanup.mjs';
import { NEVADA_BOUTS, nevadaPages } from '../fixtures/commissions/synthetic.mjs';

let db;
let store;
const q = async (sql, params) => (await db.client.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const count = async (sql, params) => Number((await one(sql, params)).n);
const OLD = { ...NEVADA, version: 'nsac-nevada@1.0.0' };
const NEW = NEVADA; // nsac-nevada@1.0.2

before(async () => {
  db = await freshDatabase('official_canon');
  store = pgStore(db.client);
});
after(async () => { await db?.close(); });

// Fighter name words per card, so no boxer on one card resembles a boxer on another (identity review never blocks a bout).
const WORDS = {
  A: [['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT'], 'SYNTHETIC', ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX']],
  B: [['HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE'], 'HERON', ['OAK', 'ELM', 'ASH', 'YEW', 'FIR', 'BAY']],
  C: [['NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA'], 'OSPREY', ['RED', 'TAN', 'JET', 'ICE', 'SKY', 'SUN']],
  D: [['TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'XRAY', 'YANKEE'], 'PLOVER', ['CUP', 'BOX', 'HAT', 'KEY', 'PEN', 'MAP']],
};
const title = (w) => w[0] + w.slice(1).toLowerCase();
function boutsFor(tag) {
  let text = JSON.stringify(NEVADA_BOUTS);
  const [firsts, middle, lasts] = WORDS[tag];
  WORDS.A[0].forEach((w, i) => { text = text.replaceAll(w, firsts[i]).replaceAll(title(w), title(firsts[i])); });
  text = text.replaceAll('SYNTHETIC', middle);
  WORDS.A[2].forEach((w, i) => { text = text.replace(new RegExp(`\b${w}\b`, 'g'), lasts[i]).replace(new RegExp(`\b${title(w)}\b`, 'g'), title(lasts[i])); });
  return JSON.parse(text);
}

// One synthetic Nevada result document per event; fighters are unique per event.
function parsedDoc({ tag, day, venue, judges }) {
  const bouts = boutsFor(tag);
  const file = `09-${day}-26_Boxing_REDACTED`;
  const ref = { doc_key: `nv-results:2026:${file}`, url: `https://boxing.nv.gov/uploadedFiles/boxingnvgov/content/results/2026_Results/${file}.pdf`, title: file, sport_hint: SPORT.BOXING };
  const parsed = parseNevadaResults(ref, nevadaPages({ date: [`September ${Number(day)}`, 'th', ', 2026,'], location: `${venue}, Las Vegas`, bouts }), { capturedAt: `2026-09-${day}T12:00:00Z` });
  assert.equal(parsed.classification.accepted, true, JSON.stringify(parsed.problems));
  // bouts 1 and 3 carry three judges with totals; name them explicitly per scenario
  parsed.bouts.forEach((b, i) => { if (judges[i]) b.judges = b.judges.map((j, k) => ({ ...j, name: judges[i][k], source_name: judges[i][k].split(' ').pop() })); });
  return { ref, parsed };
}

// Exactly what runCommissionIngest does for one fetched document: store the parse, then apply it.
async function ingestParsed({ ref, parsed }, adapter, now) {
  const sha = await sha256Hex(`${ref.doc_key}|bytes`);
  const observation = await store.recordObservation({
    source_key: adapter.sourceKey, entity_type: 'commission_results_document', external_key: ref.doc_key, source_url: ref.url,
    content_hash: await sha256Hex(`${sha}|${adapter.version}`), parser_version: adapter.version, source_published_at: now,
    payload: assertMinimized({ doc_key: ref.doc_key, url: ref.url, sha256: sha, document: parsed.minimized, events: parsed.events, bouts: parsed.bouts }),
  });
  const summary = await applyCommissionParsed(store, adapter, parsed, { now, changeReason: `reparsed_with_${adapter.version}` });
  return { observation, summary };
}

const officialNamed = (name) => one('select * from public.boxing_officials where display_name = $1', [name]);
const snapshot = async () => ({
  officials: await count('select count(*) n from public.boxing_officials'),
  bout_officials: await count('select count(*) n from public.boxing_bout_officials'),
  active: await count("select count(*) n from public.boxing_bout_officials where assignment_state in ('assigned','worked')"),
  scorecards: await count('select count(*) n from public.boxing_scorecards'),
  card_changes: await count('select count(*) n from public.boxing_card_changes'),
  duplicate_slots: await count("select count(*) n from (select 1 from public.boxing_bout_officials where assignment_state in ('assigned','worked') and role = 'judge' group by bout_id, slot having count(*) > 1) d"),
});

const buggyE1 = () => parsedDoc({ tag: 'A', day: '05', venue: 'Synthetic Garden Arena', judges: [['Jane Alpha', 'Joe Bravo', '& Cory Santos'], null, ['& Cory Santos', 'Jane Alpha', 'Joe Bravo']] });
const fixedE1 = () => parsedDoc({ tag: 'A', day: '05', venue: 'Synthetic Garden Arena', judges: [['Jane Alpha', 'Joe Bravo', 'Cory Santos'], null, ['Cory Santos', 'Jane Alpha', 'Joe Bravo']] });

test('"& Cory Santos" from the buggy parser keeps resolving to the same official when the corrected parse names "Cory Santos" in the same bout and slot', async () => {
  const first = await ingestParsed(buggyE1(), OLD, '2026-09-06T00:00:00Z');
  assert.equal(first.summary.scorecards_written, 6);
  const artifact = await officialNamed('& Cory Santos');
  assert.ok(artifact, 'the buggy parser created the artifact official');
  const before = await snapshot();
  const cardsBefore = await q('select id, judge_id, bout_id, slot from public.boxing_scorecards order by id');

  const second = await ingestParsed(fixedE1(), NEW, '2026-09-14T11:40:00Z');
  const after = await snapshot();
  assert.equal(second.summary.officials_kept_on_reparse, 9, 'every official of the three bouts (6 judges, 3 referees) kept its slot without a resolver call');
  assert.equal(second.summary.officials_held_for_review ?? 0, 0);
  assert.equal(await officialNamed('Cory Santos'), undefined, 'no second canonical official was created');
  assert.equal(after.officials, before.officials);
  assert.equal(after.bout_officials, before.bout_officials, 'bout-official history intact');
  assert.equal(after.active, before.active);
  assert.equal(after.duplicate_slots, 0, 'no second active judge in a slot');
  assert.equal(after.scorecards, before.scorecards, 'no new scorecards');
  assert.deepEqual(await q('select id, judge_id, bout_id, slot from public.boxing_scorecards order by id'), cardsBefore, 'scorecards unchanged');
  assert.equal(after.card_changes, before.card_changes, 'no card change (no official assigned, replaced or removed)');

  // rerunning the same corrected document is idempotent
  const third = await ingestParsed(fixedE1(), NEW, '2026-09-15T11:40:00Z');
  assert.equal(third.summary.scorecards_written, 0);
  assert.deepEqual(await snapshot(), after);

  // original source observations remain preserved
  const obs = await q("select parser_version, payload from public.boxing_source_observations where entity_type = 'commission_results_document' and external_key = 'nv-results:2026:09-05-26_Boxing_REDACTED' order by observed_at");
  assert.deepEqual(obs.map((o) => o.parser_version), ['nsac-nevada@1.0.0', 'nsac-nevada@1.0.2']);
  assert.ok(JSON.stringify(obs[0].payload).includes('& Cory Santos'), 'the buggy parse is still stored verbatim');
  assert.ok(!JSON.stringify(obs[1].payload).includes('& Cory Santos'));
});

test('Category A canonicalization renames the artifact, keeps an alias and leaves every scorecard and assignment attached', async () => {
  const artifact = await officialNamed('& Cory Santos');
  const before = await snapshot();
  const plan = buildCleanupPlan(await store.officialCleanupEvidence());
  const item = plan.A.find((a) => a.candidate_a.id === artifact.id);
  assert.ok(item, JSON.stringify({ A: plan.A.length, B: plan.B.map((b) => b.reason) }));
  assert.equal(item.apply.action, 'rename_parser_artifact');
  assert.equal(item.apply.evidence.continuity.length, 2);
  assert.deepEqual(item.would_change, { officials_renamed: 1, aliases_recorded: 1, officials_merged: 0, assignments_repointed: 0, scorecards_repointed: 0, rows_deleted: 0, assignments_keep_resolving: 2, scorecards_keep_resolving: 2 });

  // the database re-verifies the evidence: tampered or non-A requests are refused
  const tampered = { ...item.apply, actor: 'db test', evidence: { ...item.apply.evidence, continuity: item.apply.evidence.continuity.map((c) => ({ ...c, slot: c.slot === 3 ? 2 : 3 })) } };
  await expectPgError(() => store.applyOfficialCanonicalization(tampered), { code: 'BX063' });
  await expectPgError(() => store.applyOfficialCanonicalization({ ...item.apply, actor: 'db test', category: 'B' }), { code: 'BX060' });
  await expectPgError(() => store.applyOfficialCanonicalization({ ...item.apply, actor: 'db test', after_display_name: 'Cory Santos Jr' }), { code: 'BX062' });
  await expectPgError(() => store.applyOfficialCanonicalization({ ...item.apply, actor: '' }), { code: 'BX060' });

  const r = await store.applyOfficialCanonicalization({ ...item.apply, actor: 'db test' });
  assert.equal(r.status, 'applied');
  assert.equal(r.continuity_verified, 2);
  const renamed = await one('select * from public.boxing_officials where id = $1', [artifact.id]);
  assert.equal(renamed.display_name, 'Cory Santos');
  assert.equal(renamed.public_id, artifact.public_id, 'same canonical official, same public id');
  assert.deepEqual((await q('select alias_name, reason from public.boxing_official_aliases where official_id = $1', [artifact.id])).map((a) => [a.alias_name, a.reason]), [['& Cory Santos', 'parser_artifact_display_name']]);
  assert.deepEqual(await snapshot(), { ...before }, 'no assignment, scorecard or official row added or removed');
  assert.equal(await count('select count(*) n from public.boxing_scorecards where judge_id = $1', [artifact.id]), 2);
  assert.equal((await store.applyOfficialCanonicalization({ ...item.apply, actor: 'db test' })).status, 'already_applied', 'idempotent');
  await expectPgError(() => q("update public.boxing_official_canonicalizations set actor = 'x'"), { match: /append-only|append_only/i });
  await expectPgError(() => q('delete from public.boxing_official_aliases'), { match: /append-only|append_only/i });

  // the corrected document applied again after the rename is still a no-op
  const s = await snapshot();
  await ingestParsed(fixedE1(), NEW, '2026-09-16T11:40:00Z');
  assert.deepEqual(await snapshot(), s);
});

test('"Cheek" does NOT merge with "Eric Cheek": a corrected parse naming the full name holds the slot for review', async () => {
  // a card where Eric Cheek and Mark Cheek both judge: two distinct officials sharing a surname
  await ingestParsed(parsedDoc({ tag: 'B', day: '12', venue: 'Synthetic Palace', judges: [['Eric Cheek', 'Mark Cheek', 'Joe Bravo'], null, ['Jane Alpha', 'Joe Bravo', 'Kim Charlie']] }), NEW, '2026-09-13T00:00:00Z');
  const eric = await officialNamed('Eric Cheek');
  const mark = await officialNamed('Mark Cheek');
  assert.ok(eric && mark && eric.id !== mark.id, 'two different officials sharing a surname stay separate');

  // an older sheet whose header omitted the full name: the parser kept the surname "Cheek"
  const buggy = () => parsedDoc({ tag: 'C', day: '19', venue: 'Synthetic Dome', judges: [['Cheek', 'Joe Bravo', 'Jane Alpha'], null, ['Jane Alpha', 'Joe Bravo', 'Kim Charlie']] });
  await ingestParsed(buggy(), OLD, '2026-09-20T00:00:00Z');
  const cheek = await officialNamed('Cheek');
  assert.ok(cheek && cheek.id !== eric.id, 'surname-only official exists separately');
  const before = await snapshot();
  const cheekCards = await q('select id, judge_id, slot from public.boxing_scorecards where judge_id = $1 order by id', [cheek.id]);

  const fixed = await ingestParsed(parsedDoc({ tag: 'C', day: '19', venue: 'Synthetic Dome', judges: [['Eric Cheek', 'Joe Bravo', 'Jane Alpha'], null, ['Jane Alpha', 'Joe Bravo', 'Kim Charlie']] }), NEW, '2026-09-21T00:00:00Z');
  assert.equal(fixed.summary.officials_held_for_review, 1);
  const after = await snapshot();
  assert.equal(after.officials, before.officials, 'no official created');
  assert.equal(after.bout_officials, before.bout_officials);
  assert.equal(after.duplicate_slots, 0);
  assert.equal(after.scorecards, before.scorecards, 'no scorecard for Eric Cheek was added to that bout');
  assert.deepEqual(await q('select id, judge_id, slot from public.boxing_scorecards where judge_id = $1 order by id', [cheek.id]), cheekCards, 'Cheek keeps its scorecards');
  assert.equal(await count("select count(*) n from public.boxing_card_changes where change_type = 'official_replaced'"), 0, 'nothing was re-pointed');
  const item = await one("select * from public.boxing_official_review_queue where raw_name = 'Eric Cheek' and status = 'pending'");
  assert.equal(item.reason, 'reparse_names_a_different_official_in_held_slot');
  assert.equal(item.candidates[0].display_name, 'Cheek');

  const plan = buildCleanupPlan(await store.officialCleanupEvidence());
  const c = plan.C.filter((x) => x.candidate_a.name === 'Cheek');
  assert.deepEqual(c.map((x) => x.candidate_b.name).sort(), ['Eric Cheek', 'Mark Cheek'], 'surname-only pairs are ambiguous (C)');
  assert.ok(!plan.A.some((x) => [x.candidate_a.name, x.candidate_b?.name].includes('Cheek')));
  assert.ok(plan.D.some((x) => [x.candidate_a.name, x.candidate_b.name].sort().join() === 'Eric Cheek,Mark Cheek'), 'Eric and Mark Cheek are distinct (D)');
  assert.equal(plan.review_queue.find((r) => r.raw_name === 'Eric Cheek').classification, 'C');

  // and the database refuses to treat a surname as a parser artifact
  const cheekBout = (await one('select bout_id from public.boxing_scorecards where id = $1', [cheekCards[0].id])).bout_id;
  await expectPgError(() => store.applyOfficialCanonicalization({ action: 'merge_parser_artifact', category: 'A', official_id: eric.id, from_official_id: cheek.id,
    after_display_name: 'Eric Cheek', tool_version: OFFICIAL_CLEANUP_VERSION, actor: 'db test',
    evidence: { continuity: [{ doc_key: 'nv-results:2026:09-19-26_Boxing_REDACTED', bout_id: cheekBout, role: 'judge', slot: 1, old_parser_version: OLD.version, new_parser_version: NEW.version }] } }), { code: 'BX062' });
});

test('merge path: an artifact official and a separate corrected-name official become one canonical official; history resolves through it', async () => {
  // legacy state before the correction-aware ingest: "& Ann Echo" (buggy parse) and a separate "Ann Echo"
  const buggy = () => parsedDoc({ tag: 'D', day: '26', venue: 'Synthetic Hall', judges: [['& Ann Echo', 'Joe Bravo', 'Jane Alpha'], null, ['Jane Alpha', '& Ann Echo', 'Joe Bravo']] });
  await ingestParsed(buggy(), OLD, '2026-09-27T00:00:00Z');
  const artifact = await officialNamed('& Ann Echo');
  const src = await one("select id from public.boxing_sources where source_key = 'nsac_nevada'");
  const twin = await one("insert into public.boxing_officials (display_name, normalized_name, official_type, identity_state) values ('Ann Echo', 'ann echo', 'judge', 'source_native') returning *");
  const otherBout = await one(`select b.id from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id where e.event_date = '2026-09-12'
    and not exists (select 1 from public.boxing_bout_officials bo where bo.bout_id = b.id and bo.role = 'judge' and bo.slot = 3) limit 1`);
  await q("insert into public.boxing_bout_officials (bout_id, official_id, role, slot, source_id) values ($1, $2, 'judge', 3, $3)", [otherBout.id, twin.id, src.id]);

  await ingestParsed(parsedDoc({ tag: 'D', day: '26', venue: 'Synthetic Hall', judges: [['Ann Echo', 'Joe Bravo', 'Jane Alpha'], null, ['Jane Alpha', 'Ann Echo', 'Joe Bravo']] }), NEW, '2026-09-28T00:00:00Z');
  assert.equal(await count("select count(*) n from public.boxing_bout_officials bo where bo.official_id = $1 and assignment_state in ('assigned','worked')", [artifact.id]), 2, 'corrected parse kept the artifact official in its slots');
  const before = await snapshot();
  const artifactCards = await count('select count(*) n from public.boxing_scorecards where judge_id = $1', [artifact.id]);

  const plan = buildCleanupPlan(await store.officialCleanupEvidence());
  const item = plan.A.find((a) => a.candidate_a.id === artifact.id);
  assert.ok(item, JSON.stringify(plan.B.map((b) => [b.candidate_a.name, b.reason])));
  assert.equal(item.apply.action, 'merge_parser_artifact');
  assert.equal(item.apply.official_id, twin.id);
  const r = await store.applyOfficialCanonicalization({ ...item.apply, actor: 'db test' });
  assert.equal(r.status, 'applied');

  const merged = await one('select * from public.boxing_officials where id = $1', [artifact.id]);
  assert.equal(merged.identity_state, 'merged');
  assert.equal(merged.merged_into_id, twin.id);
  assert.deepEqual(await snapshot(), before, 'nothing deleted or re-pointed');
  assert.equal(await count('select count(*) n from public.boxing_scorecards where judge_id = $1', [artifact.id]), artifactCards, 'scorecards still reference their original row');
  assert.equal(await count('select count(*) n from public.boxing_scorecards_current s where public.boxing_canonical_official_id(s.judge_id) = $1', [twin.id]), artifactCards, 'and resolve to the canonical official');
  const site = await one("select public.boxing_site_officials('judge', 'Ann Echo', 10, 0) as r");
  assert.equal(site.r.rows.length, 1, 'one canonical official on the site');
  assert.equal(site.r.rows[0].assignments, 3, 'with the history of both rows');
  assert.equal(site.r.rows[0].cards, artifactCards);
  const resolved = await one("select public.boxing_official_candidates(array['full:ann echo'], 'nsac.official', null) as r");
  assert.deepEqual(resolved.r.candidates.map((c) => c.display_name), ['Ann Echo'], 'the merged row is no longer a resolver candidate');
  assert.equal((await store.applyOfficialCanonicalization({ ...item.apply, actor: 'db test' })).status, 'already_applied');

  const s = await snapshot();
  await ingestParsed(parsedDoc({ tag: 'D', day: '26', venue: 'Synthetic Hall', judges: [['Ann Echo', 'Joe Bravo', 'Jane Alpha'], null, ['Jane Alpha', 'Ann Echo', 'Joe Bravo']] }), NEW, '2026-09-29T00:00:00Z');
  assert.deepEqual(await snapshot(), s, 'the corrected document stays idempotent after the merge');
});
