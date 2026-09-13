// Boxer name normalization.
//
// The source-native string is NEVER replaced: parseName() returns it verbatim
// as `raw` next to every derived form. Derived forms exist only to compare and
// retrieve candidates; they are not display values and not identity.

const LATIN_SPECIAL = {
  ł: 'l', Ł: 'l', ø: 'o', Ø: 'o', đ: 'd', Đ: 'd', ð: 'd', Ð: 'd', þ: 'th', Þ: 'th', ß: 'ss',
  æ: 'ae', Æ: 'ae', œ: 'oe', Œ: 'oe', ı: 'i', ŋ: 'n', ħ: 'h', ŧ: 't', ĸ: 'k', ſ: 's',
};

// Cyrillic -> Latin (English-style). Covers Russian, Ukrainian, Belarusian,
// Bulgarian, Serbian/Macedonian and Kazakh letters common in boxing rosters.
// Variants between national systems (Ukrainian г=h vs Russian г=g) are
// reconciled later by skeleton(), not here.
const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'e', ё: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'i', і: 'i',
  ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'u',
  қ: 'k', ғ: 'g', ң: 'n', ү: 'u', ұ: 'u', һ: 'h', ә: 'a', ө: 'o', ђ: 'dj', ј: 'j', љ: 'lj', њ: 'nj',
  ћ: 'c', џ: 'dz', ѓ: 'gj', ќ: 'kj', ѕ: 'dz',
};

const SUFFIXES = new Map([
  ['jr', 'jr'], ['junior', 'jr'], ['jnr', 'jr'], ['hijo', 'jr'], ['filho', 'jr'],
  ['sr', 'sr'], ['senior', 'sr'], ['snr', 'sr'],
  ['ii', 'ii'], ['2nd', 'ii'], ['iii', 'iii'], ['3rd', 'iii'], ['iv', 'iv'], ['4th', 'iv'],
]);

// Lower-case connective particles that belong to a surname but are routinely
// dropped or merged by other sources (De La Hoya / Delahoya, dos Santos).
const PARTICLES = new Set([
  'de', 'del', 'della', 'der', 'di', 'da', 'das', 'do', 'dos', 'du', 'la', 'las', 'le', 'los',
  'van', 'von', 'den', 'ten', 'ter', 'y', 'e', 'bin', 'ibn', 'al', 'el', 'st',
]);

const QUOTED_NICKNAME = /["“”«»„]([^"“”«»„]{1,40})["“”«»„]|(?:^|\s)'([^']{2,40})'(?=\s|$)|\(([^)]{1,40})\)/g;

const cyrillicRe = new RegExp(`[${Object.keys(CYRILLIC).join('')}]`, 'giu');
const latinSpecialRe = new RegExp(`[${Object.keys(LATIN_SPECIAL).join('')}]`, 'gu');

export function transliterate(text) {
  return String(text)
    .replace(cyrillicRe, (ch) => {
      const lower = CYRILLIC[ch.toLowerCase()];
      return lower === undefined ? ch : lower;
    })
    .replace(latinSpecialRe, (ch) => LATIN_SPECIAL[ch]);
}

// NFKD, strip combining marks, transliterate, lower-case. Letters from other
// scripts (CJK, Arabic, Thai...) are preserved as-is: we cannot romanize them
// reliably, so they only match via explicit aliases.
export function foldText(text) {
  return transliterate(String(text).normalize('NFKC'))
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

function tokenize(folded) {
  return folded
    .replace(/[’'`´ʼ]/g, '') // O'Neil -> oneil
    .replace(/[.]/g, ' ') // J.R. -> j r ; Jr. -> jr
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // hyphens, commas, slashes -> space
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Consonant skeleton used ONLY to nominate transliteration variants
// (Oleksandr/Aleksandr/Alexander, Hvozdyk/Gvozdik, Mykhailo/Mikhail/Michail,
// Kowalski/Kovalski, Petroff/Petrov). Deliberately lossy; never proof.
export function skeleton(token) {
  let t = token.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();
  if (!/^[a-z0-9]+$/.test(t)) return t; // non-Latin script: no skeleton
  t = t
    .replace(/^ye/, 'e').replace(/^yu/, 'u').replace(/^ya/, 'a')
    .replace(/shch|sch/g, 's')
    .replace(/dzh|dj/g, 'j')
    .replace(/zh/g, 'z')
    .replace(/sh/g, 's')
    .replace(/tch/g, 'c')
    .replace(/(?<=.)ch/g, 'h')
    .replace(/^ch/, 'c')
    .replace(/kh/g, 'h')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/q/g, 'k')
    .replace(/ts|tz|cz/g, 'c')
    .replace(/w/g, 'v')
    .replace(/ff$/, 'v')
    .replace(/h/g, 'g');
  const first = /[aeiouy]/.test(t[0]) ? 'a' : t[0];
  const rest = t.slice(1).replace(/[aeiouy]/g, '');
  return (first + rest).replace(/(.)\1+/g, '$1');
}

// parseName("Julio César Chávez Jr.") ->
//   { raw, nicknames, suffix: 'jr', tokens: ['julio','cesar','chavez'], ... }
export function parseName(raw) {
  const original = raw == null ? '' : String(raw);
  let text = original.normalize('NFKC').trim();

  const nicknames = [];
  text = text.replace(QUOTED_NICKNAME, (m, a, b, c) => {
    const nick = (a ?? b ?? c ?? '').trim();
    if (nick) nicknames.push(nick);
    return ' ';
  });

  // "Surname, Given" (common in commission and odds exports).
  let reorderedFromComma = false;
  const commaParts = text.split(',').map((s) => s.trim()).filter(Boolean);
  if (commaParts.length === 2 && !SUFFIXES.has(foldText(commaParts[1]).replace(/[.\s]/g, ''))) {
    text = `${commaParts[1]} ${commaParts[0]}`;
    reorderedFromComma = true;
  } else if (commaParts.length > 1) {
    text = commaParts.join(' ');
  }

  const folded = foldText(text);
  let tokens = tokenize(folded);

  let suffix = null;
  while (tokens.length > 1 && SUFFIXES.has(tokens[tokens.length - 1])) {
    suffix = suffix ?? SUFFIXES.get(tokens[tokens.length - 1]);
    tokens = tokens.slice(0, -1);
  }

  const core = tokens.filter((t, i) => i === 0 || !PARTICLES.has(t));
  const particles = tokens.filter((t, i) => i > 0 && PARTICLES.has(t));
  const initials = core.length > 1 && core[0].length === 1 ? core[0] : null;

  return {
    raw: original,
    nicknames,
    reorderedFromComma,
    suffix,
    tokens, // in source order, particles kept, suffix removed
    core, // particles removed
    particles,
    initial: initials,
    given: core[0] ?? null,
    last: core.length > 1 ? core[core.length - 1] : null,
    full: core.join(' '),
    sorted: [...core].sort().join(' '),
    joined: tokens.join(''),
    skeletonSorted: core.map(skeleton).sort().join(' '),
    script: /[a-z]/.test(folded) ? 'latin' : folded ? 'other' : 'empty',
  };
}

export function normalizedAlias(raw) {
  const p = parseName(raw);
  return [p.full, p.suffix].filter(Boolean).join(' ');
}

// Retrieval keys. The same function indexes canonical aliases and builds
// lookup keys for an incoming observation, so the two always agree.
// `lookup: true` adds keys that let an observed name hit nickname aliases
// ("The Hammer" observed as a whole name).
export function nameKeys(raw, { kind = 'name', lookup = false } = {}) {
  const p = parseName(raw);
  const keys = new Set();
  if (!p.core.length) return [];

  if (kind === 'nickname' || p.core.length === 1 || lookup) {
    keys.add(`nick:${p.core.map(skeleton).join(' ')}`);
    if (kind === 'nickname') return [...keys];
  }
  keys.add(`full:${p.full}`);
  keys.add(`sorted:${p.sorted}`);
  keys.add(`skel:${p.skeletonSorted}`);
  keys.add(`joined:${p.joined}`);
  if (p.core.length >= 2) {
    const core = p.core.slice(0, 6);
    for (let i = 0; i < core.length; i++) {
      for (let j = i + 1; j < core.length; j++) {
        keys.add(`part:${[core[i], core[j]].sort().join(' ')}`);
      }
    }
    keys.add(`init:${p.core[0][0]} ${skeleton(p.core[p.core.length - 1])}`);
  }
  for (const nick of p.nicknames) {
    for (const k of nameKeys(nick, { kind: 'nickname' })) keys.add(k);
  }
  return [...keys];
}

// Normalized Levenshtein similarity on the sorted token string (0..1).
export function similarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}
