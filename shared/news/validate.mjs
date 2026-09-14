// Prose validator. Pure. Fails CLOSED: any unverifiable claim is a problem.
//
// It checks the final text (headline + dek + body), so it gates template
// output and any future LLM rewrite identically, and — when the generator
// supplies them — each sentence's declared fact bindings.
//
// Checks
//   numbers      every numeric token, INCLUDING number words ("twelve",
//                "two-time", "third") and ordinals, must come from the block
//   names        every capitalized name-like span must be a known entity,
//                a fact display string, or a fixed allow-listed term
//   quotes       quoted text must be an attributed_statement verbatim
//   categories   odds / ranking / title / weight / result / scorecard /
//                officials / regulatory / Fight DNA / record language needs
//                a fact of that category; injury, purse and quote language
//                needs an attributed fact; prediction language is never allowed
//   causality    no causal connectives for MARKET_MOVED (cause is never known)
//   relative time "yesterday", "last month", "tonight" are never allowed
//   characterization  no unsupported evaluative words (esp. about officials)
//   derived      a sentence using a pbe_derived value must say "PropBetEdge"
//   bindings     each sentence's numbers must come from ITS declared facts

import { topicCategory } from './fact-block.mjs';

export const VALIDATOR_VERSION = 'boxing-prose-validator@1.1.0';

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, hundred: 100, thousand: 1000, million: 1000000,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
  once: 1, twice: 2, thrice: 3, double: 2, triple: 3, single: 1, dozen: 12, half: 0.5,
};
// "second" also means a unit of time and "one" is a pronoun; they are still
// counted — a template never needs them, and an LLM using them must be precise.
const NUMBER_WORD_RE = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})(?:-time|-round|-fight|-year)?\\b`, 'gi');
const DIGIT_RE = /[-+]?\d+(?:[.,:]\d+)*/g;

const CATEGORY_LANGUAGE = {
  // no leading \b before a sign: "\b-150" can never match after a space
  odds: /\b(odds|favou?rites?|underdogs?|moneyline|betting|bettors?|sportsbooks?|bookmakers?|lines?|priced at|implied|probability|consensus|market|chalk|juice|vig|minus|plus|pick'?em|even money|wager\w*|parlay)\b|(^|[\s(])[-+]\d{3,4}\b/i,
  ranking: /\b(ranked|ranking|rankings|No\.\s?\d+|#\d+|contender|mandatory|top-rated)\b/i,
  title: /\b(title|titles|belt|belts|champion|champions|championship|undisputed|unified|interim|vacant|vacated|stripped|franchise)\b/i,
  weight: /\b(weigh-?ins?|weighed|lbs?|pounds|kilograms?|kg|missed weight|made weight|catchweight|scale)\b/i,
  result: /\b(won|wins|beat|defeated|stopped|knock(?:ed)? ?out|knockout|KO|TKO|decision|draw|no contest|disqualif\w*|retired on the stool)\b/i,
  scorecard: /\b(scorecards?|scored|judges? had|\d{2,3}-\d{2,3})\b/i,
  officials: /\b(referee|judges?|ringside|officiat\w*)\b/i,
  regulatory: /\b(suspend\w*|suspension|commission ruled|licen[cs]e revoked|banned|fined|sanction(?:ed)?)\b/i,
  fight_dna: /\b(fight dna|output rate|punch rate|accuracy|ko rate|knockout rate|durability)\b/i,
  record: /\b(record|records)\b|\(\d+-\d+-\d+\)/i,
  previous_meeting: /\b(rematch|trilogy|previously met|first fight|second fight|third fight)\b/i,
};
// Loaded words are allowed only when a fact states them verbatim: having odds
// facts does not license "favorite"; having title facts does not license
// "undisputed" (a PBE derivation that needs its own fact).
const VERBATIM_ONLY = /\b(favou?rites?|underdogs?|chalk|undisputed|unified|mandatory|undefeated|unbeaten|pound[- ]for[- ]pound|former|two-division|three-division|four-division|stripped|vacated|vacant|relinquish\w*|interim|franchise|emeritus|elevated|overturned)\b/gi;
const ATTRIBUTION_ONLY = {
  injury: /\b(injur\w*|hurt|broken|fractur\w*|torn|sprain\w*|concussion|medical(?:ly)?|hospital\w*|surgery|illness|sick)\b/i,
  purse: /\b(purse|paid|payday|guarantee|earn(?:s|ed|ings)?|\$\s?\d|million dollars|pay-per-view buys)\b/i,
};
const ALWAYS_BANNED = [
  [/\b(will win|should win|expected to win|likely to|predict\w*|our pick|lock of|best bet|value play|smart money|sharp money|can'?t lose|guarantee[ds]? (?:a|the) win)\b/i, 'prediction or betting advice'],
  [/\b(yesterday|today|tonight|tomorrow|last (?:week|month|year|night)|next (?:week|month|year)|earlier this (?:week|month|year)|recently|soon)\b/i, 'relative time (dates must be explicit facts)'],
  [/\b(robbery|robbed|controversial|corrupt|biased|incompetent|shocking|stunning|dominant|dominated|brutal|destroyed|embarrass\w*|disgrace\w*|legendary|elite|superstar|best in the world|pound[- ]for[- ]pound)\b/i, 'unsupported characterization'],
  [/\b(sources say|reportedly|rumou?r\w*|allegedly|is said to|insiders?)\b/i, 'unattributed reporting'],
];
const CAUSAL = /\b(because|due to|after (?:news|reports?|word)|following (?:news|reports?|the news)|amid|on the back of|driven by|as a result of|in response to|prompted by|sparked by|reacting to)\b/i;

const ALLOWED_CAPITALIZED = new Set([
  'PropBetEdge', 'PBE', 'Fight', 'DNA', 'The', 'A', 'An', 'At', 'On', 'In', 'It', 'This', 'Per', 'Records', 'Assigned', 'Stated', 'Weigh-in', 'Previous',
  'Market', 'Scorecards', 'Ranking', 'Title', 'Officials', 'Commission', 'Official', 'Result', 'No', 'Vs', 'vs',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]);

const normNumber = (s) => String(s).replace(/,/g, '').replace(/^\+/, '');

function numberTokens(text) {
  const out = [];
  for (const m of String(text).matchAll(DIGIT_RE)) {
    const raw = m[0];
    // split composites: 23-4-0, 115-113, 2:35
    for (const part of raw.replace(/^[-+]/, (s) => (s === '-' && /\d{3}/.test(raw) ? '-' : '')).split(/(?<=\d)[-:](?=\d)/)) {
      out.push(normNumber(part));
    }
    out.push(normNumber(raw));
  }
  return out;
}

function wordNumbers(text) {
  return [...String(text).matchAll(NUMBER_WORD_RE)].map((m) => String(NUMBER_WORDS[m[1].toLowerCase()]));
}

// Digits inside a known entity name ("2300 Arena", "TBL 12") belong to the name, not to a numeric claim: every
// occurrence of such a name is masked (digits -> '#') in the prose AND in fact texts before numbers are read. A bare
// "2300" anywhere else still needs a fact that states it.
export function entityNamesOf(block) {
  return [
    ...(block?.entities?.fighters ?? []).map((e) => e.name),
    ...(block?.entities?.officials ?? []).map((e) => e.name),
    ...(block?.entities?.organizations ?? []).map((e) => e.name),
    block?.entities?.event?.name, block?.entities?.event?.venue?.name, block?.entities?.event?.venue?.city, block?.entities?.event?.commission?.name,
  ].filter(Boolean);
}
export function maskEntityNumbers(text, names) {
  let out = String(text ?? '');
  for (const n of [...new Set(names.filter((x) => /\d/.test(x)))].sort((a, b) => b.length - a.length)) out = out.split(n).join(n.replace(/\d/g, '#'));
  return out;
}

function allowedNumbersFrom(facts, mask = (t) => t) {
  const set = new Set();
  for (const f of facts) {
    for (const s of [mask(f.text), mask(JSON.stringify(f.value)), f.version ?? '']) {
      for (const n of numberTokens(s)) set.add(n);
    }
    // dates like "November 14, 2026" also allow their ISO parts and vice versa
    if (/^\d{4}-\d{2}-\d{2}/.test(String(f.value))) {
      const [y, mo, d] = String(f.value).slice(0, 10).split('-');
      [y, String(Number(mo)), String(Number(d))].forEach((x) => set.add(x));
    }
  }
  return set;
}

function nameSpans(text) {
  // capitalized word sequences, including particles and diacritics
  const re = /(?:\b|^)(\p{Lu}[\p{L}\p{M}'’.-]*(?:\s+(?:(?:de|del|la|van|von|da|dos|di|le|al|el|bin)\s+)?\p{Lu}[\p{L}\p{M}'’.-]*)*)/gu;
  return [...String(text).matchAll(re)].map((m) => m[1]);
}

export function validateArticle({ headline, dek = null, body_md: body, sentences = null }, block) {
  const problems = [];
  const facts = block?.facts ?? [];
  if (!block || block.schema !== 'boxing-fact-block@1') return { ok: false, problems: ['fact block missing or unknown schema'], validator_version: VALIDATOR_VERSION };
  const fullText = [headline, dek, body].filter(Boolean).join('\n');
  const factById = new Map(facts.map((f) => [f.id, f]));
  const categories = new Set(facts.map((f) => topicCategory(f.topic)));
  const attributed = facts.filter((f) => f.label === 'attributed_statement');

  // ---- numbers (digits and words) must come from the block
  const mask = (t) => maskEntityNumbers(t, entityNamesOf(block));
  const allowed = allowedNumbersFrom(facts, mask);
  for (const n of [...numberTokens(mask(fullText)), ...wordNumbers(fullText)]) {
    if (!allowed.has(n)) problems.push(`number not in fact block: ${n}`);
  }

  // ---- names
  const knownNames = [
    ...(block.entities?.fighters ?? []).map((e) => e.name),
    ...(block.entities?.officials ?? []).map((e) => e.name),
    ...(block.entities?.organizations ?? []).map((e) => e.name),
    block.entities?.event?.name, block.entities?.event?.venue?.name, block.entities?.event?.venue?.city, block.entities?.event?.commission?.name,
    ...facts.map((f) => f.text),
  ].filter(Boolean);
  const knownText = knownNames.join(' | ');
  for (const span of nameSpans(fullText)) {
    const words = span.split(/\s+/);
    const unexplained = words.filter((w) => !ALLOWED_CAPITALIZED.has(w.replace(/[.'’]$/, '')) && !knownText.includes(w.replace(/[.,]$/, '')));
    if (unexplained.length) problems.push(`name or proper noun not in fact block: ${span}`);
  }

  // ---- quotes (any style, any length >= 2 chars) must be verbatim attributed
  // statements. Single quotes need whitespace/punctuation around them so an
  // apostrophe in O'Neil or D'Angelo is not read as a quote.
  const quoteRes = [/["“”]([^"“”]{2,})["“”]/g, /[‘’]([^‘’]{2,})[‘’]/g, /(?:^|[\s(])'([^']{2,})'(?=[\s.,;:!?)]|$)/g];
  for (const re of quoteRes) {
    for (const m of fullText.matchAll(re)) {
      if (!attributed.some((f) => f.text === m[1].trim())) problems.push(`quote not in an attributed statement: "${m[1].slice(0, 60)}"`);
    }
  }

  // ---- ordered tuples: a record (W-L-D) or card (115-113) must match a fact
  // exactly, in order — "5-25" is not "25-5"
  const factTuples = new Set(facts.flatMap((f) => [...mask(f.text).matchAll(/\b\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)+\b/g)].map((m) => m[0])));
  for (const m of mask(fullText).matchAll(/(?<![\w.-])\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)+(?![\w.-]*\d)/g)) {
    if (!factTuples.has(m[0])) problems.push(`record or score tuple not in fact block (order matters): ${m[0]}`);
  }

  // ---- category language needs facts of that category
  for (const [category, re] of Object.entries(CATEGORY_LANGUAGE)) {
    const hit = fullText.match(re);
    if (hit && !categories.has(category) && !facts.some((f) => re.test(f.text))) {
      problems.push(`${category} claim without a ${category} fact ("${hit[0].trim()}")`);
    }
  }
  for (const m of fullText.matchAll(VERBATIM_ONLY)) {
    if (!facts.some((f) => f.text.toLowerCase().includes(m[0].toLowerCase()))) problems.push(`loaded term not stated by any fact ("${m[0]}")`);
  }
  for (const [category, re] of Object.entries(ATTRIBUTION_ONLY)) {
    const hit = fullText.match(re);
    if (hit && !attributed.some((f) => re.test(f.text))) problems.push(`${category} claim without an attributed statement ("${hit[0].trim()}")`);
  }
  for (const [re, why] of ALWAYS_BANNED) {
    const hit = fullText.match(re);
    if (hit && !attributed.some((f) => re.test(f.text))) problems.push(`${why} ("${hit[0].trim()}")`);
  }
  if (block.news_event?.event_type === 'MARKET_MOVED' || categories.has('odds')) {
    const hit = fullText.match(CAUSAL);
    if (hit) problems.push(`causal claim about the market ("${hit[0]}")`);
  }

  // ---- per-sentence checks
  const sentenceList = sentences ?? String(body).split(/(?<=[.!?])\s+/).map((text) => ({ text, fact_ids: null }));
  const fighterEntities = block.entities?.fighters ?? [];
  for (const s of sentenceList) {
    // ownership: a number that only a fact about boxer B contains may not
    // appear in a sentence that names boxer A but not B
    const named = fighterEntities.filter((e) => s.text.includes(e.name)).map((e) => `fighter:${e.id}`);
    if (named.length) {
      for (const n of numberTokens(mask(s.text))) {
        const owners = facts.filter((f) => numberTokens(mask(f.text)).includes(n));
        const owned = owners.filter((f) => (f.refs ?? []).some((r) => r.startsWith('fighter:')));
        if (owners.length && owned.length === owners.length && !owned.some((f) => f.refs.some((r) => named.includes(r)))) {
          problems.push(`number ${n} belongs to a different boxer than the one named: "${s.text.slice(0, 80)}"`);
        }
      }
    }
    // attribution: a value only an attributed statement contains needs the
    // exact publisher string in the same sentence
    for (const n of numberTokens(mask(s.text))) {
      const owners = facts.filter((f) => numberTokens(mask(f.text)).includes(n));
      if (owners.length && owners.every((f) => f.label === 'attributed_statement')
          && !owners.some((f) => f.attribution?.publisher && s.text.includes(f.attribution.publisher))
          && !/per the commission notice|per the sanctioning update/.test(s.text)) {
        problems.push(`attributed value ${n} without its publisher in the sentence: "${s.text.slice(0, 80)}"`);
      }
    }
    const derivedNumbers = new Set(facts.filter((f) => f.label === 'pbe_derived').flatMap((f) => numberTokens(mask(f.text))));
    const canonicalNumbers = new Set(facts.filter((f) => f.label !== 'pbe_derived').flatMap((f) => numberTokens(mask(f.text))));
    const nums = numberTokens(mask(s.text));
    if (nums.some((n) => derivedNumbers.has(n) && !canonicalNumbers.has(n)) && !/PropBetEdge/.test(s.text)) {
      problems.push(`derived value not labelled as PropBetEdge-derived: "${s.text.slice(0, 80)}"`);
    }
    if (s.fact_ids) {
      const bound = s.fact_ids.map((id) => factById.get(id));
      if (bound.some((f) => !f)) problems.push(`sentence cites unknown fact id: ${s.fact_ids.join(',')}`);
      const boundAllowed = allowedNumbersFrom(bound.filter(Boolean));
      for (const n of [...nums, ...wordNumbers(s.text)]) {
        if (!boundAllowed.has(n)) problems.push(`sentence number ${n} is not in its cited facts: "${s.text.slice(0, 80)}"`);
      }
    }
  }
  if (!sentences && !String(body).trim()) problems.push('empty body');

  return { ok: problems.length === 0, problems: [...new Set(problems)], validator_version: VALIDATOR_VERSION };
}
