// Evidence comparison between an incoming identity observation and one
// canonical candidate. Pure functions; no I/O.

import { parseName, similarity, skeleton } from './normalize.mjs';

// Division order used for "plausibly the same fighter" distance checks.
export const DIVISION_ORDER = [
  'atomweight', 'minimumweight', 'light_flyweight', 'flyweight', 'super_flyweight', 'bantamweight',
  'super_bantamweight', 'featherweight', 'super_featherweight', 'lightweight', 'super_lightweight',
  'welterweight', 'super_welterweight', 'middleweight', 'super_middleweight', 'light_heavyweight',
  'cruiserweight', 'bridgerweight', 'heavyweight',
];

export const NAME_LEVELS = ['exact', 'reordered', 'joined', 'transliteration', 'containment', 'fuzzy', 'initial', 'surname', 'nickname', 'none'];
export const STRONG_NAME = new Set(['exact', 'reordered', 'joined', 'transliteration', 'containment']);
export const WEAK_NAME = new Set(['fuzzy', 'initial', 'nickname']);

const NAME_BASE_SCORE = {
  exact: 60, reordered: 55, joined: 55, transliteration: 45, containment: 40,
  fuzzy: 30, initial: 25, surname: 20, nickname: 20, none: 0,
};

function subset(small, large) {
  const pool = [...large];
  for (const t of small) {
    const i = pool.indexOf(t);
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

// Compare one observed name string against one candidate name string.
export function compareNames(observedRaw, candidateRaw, { candidateKind = 'name' } = {}) {
  const o = parseName(observedRaw);
  const c = parseName(candidateRaw);
  const flags = [];
  if (!o.core.length || !c.core.length) return { level: 'none', flags };

  if (o.suffix && c.suffix && o.suffix !== c.suffix) {
    return { level: 'none', flags: ['suffix_conflict'], detail: `${o.suffix} vs ${c.suffix}` };
  }
  const suffixMissing = Boolean(o.suffix) !== Boolean(c.suffix);
  if (suffixMissing) flags.push('suffix_missing');

  if (candidateKind === 'nickname') {
    const oNick = [o.full, ...o.nicknames.map((n) => parseName(n).full)];
    const cSkel = c.core.map(skeleton).join(' ');
    const hit = oNick.some((n) => n && parseName(n).core.map(skeleton).join(' ') === cSkel);
    return { level: hit ? 'nickname' : 'none', flags };
  }

  let level = 'none';
  if (o.full === c.full) level = 'exact';
  else if (o.sorted === c.sorted) level = 'reordered';
  else if (o.joined === c.joined) level = 'joined';
  else if (o.core.length === c.core.length && o.skeletonSorted === c.skeletonSorted) level = 'transliteration';
  else {
    const [small, large] = o.core.length <= c.core.length ? [o, c] : [c, o];
    const smallSkel = small.core.map(skeleton);
    const largeSkel = large.core.map(skeleton);
    if (small.core.length >= 2 && small.core.length < large.core.length
        && (subset(small.core, large.core) || subset(smallSkel, largeSkel))
        && (small.core[0] === large.core[0] || skeleton(small.core[0]) === skeleton(large.core[0]))) {
      level = 'containment';
    } else if (o.initial && c.core.length >= 2 && o.initial === c.core[0][0]
               && skeleton(o.core[o.core.length - 1]) === skeleton(c.core[c.core.length - 1])) {
      level = 'initial';
    } else if (similarity(o.sorted, c.sorted) >= 0.88 && o.core.length >= 2 && c.core.length >= 2) {
      level = 'fuzzy';
    } else if (o.core.length === 1 && c.core.length >= 2 && skeleton(o.core[0]) === skeleton(c.core[c.core.length - 1])) {
      level = 'surname';
    }
  }
  // A missing Jr/Sr never counts as an exact name: father and son share it.
  if (suffixMissing && ['exact', 'reordered', 'joined', 'transliteration'].includes(level)) level = 'containment';
  // Twin signature: same surname, near-identical but DIFFERENT given names
  // (Antonio/Antuanne, Jermall/Jermell). Siblings and twins share a surname,
  // often a DOB, nationality and division, so those cannot decide the match.
  // Compares every token before the surname (given AND middle names:
  // "Gary Antonio Russell" vs "Gary Antuanne Russell" are brothers).
  if (['transliteration', 'fuzzy'].includes(level) && o.core.length >= 2 && c.core.length >= 2) {
    const n = Math.min(o.core.length, c.core.length);
    const sameLength = o.core.length === c.core.length;
    const leading = sameLength ? n - 1 : 1;
    for (let i = 0; i < leading; i++) {
      if (o.core[i].length > 1 && c.core[i].length > 1 && o.core[i] !== c.core[i]) {
        flags.push('given_name_differs');
        break;
      }
    }
  }
  return { level, flags };
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function compareDob(observed, candidate, { observedPrecision = 'day' } = {}) {
  if (!observed || !candidate) return 'unknown';
  if (observedPrecision === 'year') {
    return observed.slice(0, 4) === candidate.slice(0, 4) ? 'year_match' : 'conflict';
  }
  if (observed === candidate) return 'exact';
  const o = DATE_RE.exec(observed);
  const c = DATE_RE.exec(candidate);
  if (!o || !c) return 'unknown';
  // day/month transposition (04-07 vs 07-04)
  if (o[1] === c[1] && o[2] === c[3] && o[3] === c[2]) return 'typo_like';
  const days = Math.abs(Date.parse(observed) - Date.parse(candidate)) / 86_400_000;
  if (days <= 1) return 'typo_like';
  // exactly one digit differs
  const a = observed.replace(/-/g, '');
  const b = candidate.replace(/-/g, '');
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  if (diff === 1) return 'typo_like';
  return 'conflict';
}

const asSet = (v) => new Set((Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).toUpperCase()));

// Full evidence for one candidate. `obs` is the identity record; `cand` is the
// candidate object returned by boxing_identity_candidates().
export function scoreCandidate(obs, cand, { namespace } = {}) {
  const reasons = [];
  const hard = [];
  const soft = [];
  const strong = [];
  const medium = [];

  // --- name: best level across the candidate's display name and aliases
  const observedNames = [obs.display_name, ...(obs.names ?? []).map((n) => n.text)].filter(Boolean);
  const candidateNames = [
    { text: cand.display_name, kind: 'name' },
    ...(cand.aliases ?? []).filter((a) => a.verification_state !== 'rejected').map((a) => ({ text: a.alias, kind: a.kind })),
  ];
  let best = { level: 'none', flags: [] };
  let bestPair = null;
  for (const on of observedNames) {
    for (const cn of candidateNames) {
      const r = compareNames(on, cn.text, { candidateKind: cn.kind === 'nickname' ? 'nickname' : 'name' });
      if (r.flags.includes('suffix_conflict')) {
        if (!hard.includes('suffix_conflict')) hard.push('suffix_conflict');
        continue;
      }
      if (NAME_LEVELS.indexOf(r.level) < NAME_LEVELS.indexOf(best.level)) {
        best = r;
        bestPair = [on, cn.text];
      }
    }
  }
  const nameLevel = best.level;
  if (nameLevel !== 'none') reasons.push(`name:${nameLevel} (${bestPair[0]} ~ ${bestPair[1]})`);
  if (best.flags.includes('suffix_missing')) soft.push('suffix_missing');
  const givenNameDiffers = best.flags.includes('given_name_differs');

  // --- date of birth
  const dob = compareDob(obs.dob, cand.dob, { observedPrecision: obs.dob_precision ?? 'day' });
  if (dob === 'exact') strong.push('dob_exact');
  else if (dob === 'year_match') medium.push('dob_year_match');
  else if (dob === 'typo_like') soft.push('dob_typo_like');
  else if (dob === 'conflict') hard.push('dob_conflict');

  // --- sex
  if (obs.sex && cand.sex && obs.sex !== 'unknown' && cand.sex !== 'unknown' && obs.sex !== cand.sex) hard.push('sex_conflict');

  // --- same-namespace id conflict. SOFT, not hard: sources carry duplicate
  // records, and one of our own probable matches may already have attached an
  // id. A hard conflict would let a seed run create a duplicate boxer.
  if (namespace && obs.external_id) {
    const other = (cand.identities ?? []).find((i) => i.namespace === namespace
      && i.verification_state !== 'rejected' && i.external_id !== String(obs.external_id));
    if (other) soft.push('namespace_id_conflict');
  }
  if ((cand.identities ?? []).some((i) => i.namespace === namespace && i.verification_state === 'rejected'
      && i.external_id === String(obs.external_id))) {
    hard.push('previously_rejected');
  }

  // --- nationality (a list: dual citizenship is common)
  const on = asSet(obs.nationality);
  const cn = asSet(cand.nationalities ?? cand.nationality);
  if (on.size && cn.size) {
    if ([...on].some((x) => cn.has(x))) medium.push('nationality_match');
    else soft.push('nationality_conflict');
  }

  // --- stance
  if (obs.stance && cand.stance && obs.stance !== 'unknown' && cand.stance !== 'unknown') {
    if (obs.stance === cand.stance) medium.push('stance_match');
    else if (obs.stance !== 'switch' && cand.stance !== 'switch') soft.push('stance_conflict');
  }

  // --- physical
  const within = (a, b, tol) => a != null && b != null && Math.abs(Number(a) - Number(b)) <= tol;
  const beyond = (a, b, tol) => a != null && b != null && Math.abs(Number(a) - Number(b)) > tol;
  if (within(obs.height_cm, cand.height_cm, 3) && within(obs.reach_cm, cand.reach_cm, 4)) medium.push('physical_match');
  if (beyond(obs.height_cm, cand.height_cm, 8) || beyond(obs.reach_cm, cand.reach_cm, 10)) soft.push('physical_conflict');

  // --- divisions
  const od = (obs.division_keys ?? []).map((k) => DIVISION_ORDER.indexOf(k)).filter((i) => i >= 0);
  const cd = (cand.division_keys ?? []).map((k) => DIVISION_ORDER.indexOf(k)).filter((i) => i >= 0);
  if (od.length && cd.length) {
    const minGap = Math.min(...od.flatMap((a) => cd.map((b) => Math.abs(a - b))));
    if (minGap <= 2) medium.push('division_match');
    else if (minGap >= 5) soft.push('division_conflict');
  }

  // --- hometown / promoter
  if (obs.hometown && cand.hometown && parseName(obs.hometown).full === parseName(cand.hometown).full) medium.push('hometown_match');
  if (obs.promoter && cand.promoter && parseName(obs.promoter).full === parseName(cand.promoter).full) medium.push('promoter_match');

  // --- known opponents (canonical ids or names)
  const candOppIds = new Set((cand.bouts ?? []).map((b) => b.opponent_id).filter(Boolean));
  const candOppNames = new Set((cand.bouts ?? []).map((b) => b.opponent_name && parseName(b.opponent_name).full).filter(Boolean));
  const overlap = (obs.opponents ?? []).filter((op) =>
    (op.fighter_id && candOppIds.has(op.fighter_id)) || (op.name && candOppNames.has(parseName(op.name).full))).length;
  if (overlap >= 1) medium.push(`opponents_overlap:${overlap}`);
  if (overlap >= 2) strong.push('opponents_overlap_2plus');

  // --- bout context: same opponent within +-3 days
  if (obs.bout && (cand.bouts ?? []).some((b) => b.opponent_id && b.opponent_id === obs.bout.opponent_fighter_id
      && b.date && obs.bout.date && Math.abs(Date.parse(b.date) - Date.parse(obs.bout.date)) <= 3 * 86_400_000)) {
    strong.push('bout_context');
  }

  let confidence = NAME_BASE_SCORE[nameLevel] + strong.length * 25 + medium.length * 4 - soft.length * 15;
  if (hard.length) confidence = 0;
  confidence = Math.max(0, Math.min(99, confidence));

  return { fighter_id: cand.id, public_id: cand.public_id, nameLevel, givenNameDiffers, hard, soft, strong, medium, reasons, confidence };
}
