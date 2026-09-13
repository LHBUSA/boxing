// Deterministic article generator (PBE Wire templates).
//
// Every sentence is composed ONLY from fact `text` strings and a small fixed
// vocabulary of connective words, and declares the fact ids it relies on. A
// template never has a fallback phrase for a missing fact: if a fact is
// absent, its sentence is not written. No adjectives, no speculation, no
// causes, no predictions.
//
// Any future LLM rewriter must emit the same { headline, dek, sentences[] }
// shape and pass the same validator; it gets no extra facts.

export const GENERATOR_VERSION = 'pbe-wire-templates@1.0.0';

const byTopic = (block, topic) => block.facts.filter((f) => f.topic === topic);
const one = (block, topic) => byTopic(block, topic)[0] ?? null;

function sentence(parts) {
  const used = parts.filter((p) => p && typeof p === 'object');
  if (parts.some((p) => p === null)) return null; // a required fact is missing: no sentence
  const text = parts.map((p) => (typeof p === 'object' ? p.text : p)).join('').replace(/\s+/g, ' ').trim();
  const cap = text.charAt(0).toUpperCase() + text.slice(1);
  return { text: /[.!?]$/.test(cap) ? cap : `${cap}.`, fact_ids: used.map((f) => f.id) };
}
const opt = (fact, before = '', after = '') => (fact ? [before, fact, after] : []);
// An attributed statement is always introduced with its exact publisher.
const per = (fact) => (fact?.label === 'attributed_statement' && fact.attribution?.publisher ? [`Per ${fact.attribution.publisher}, `] : []);

function contextSentences(block) {
  const out = [];
  const record = byTopic(block, 'record');
  if (record.length === 2) out.push(sentence(['Records: ', record[0], ' and ', record[1]]));
  for (const f of byTopic(block, 'previous_meeting')) out.push(sentence(['Previous meeting: ', f]));
  for (const f of byTopic(block, 'odds.consensus_current')) out.push(sentence(['PropBetEdge market consensus (', f.version, '): ', f]));
  for (const f of byTopic(block, 'fight_dna.metric')) out.push(sentence(['PropBetEdge Fight DNA (', f.version, '): ', f]));
  return out;
}

const TEMPLATES = {
  FIGHT_ANNOUNCED(b) {
    const p = one(b, 'bout.participants');
    return {
      headline: p ? `${p.text} announced` : null,
      sentences: [
        sentence([p, ...opt(one(b, 'event.name'), ' is scheduled for ') , ...opt(one(b, 'event.date'), ' on ')]),
        ...(one(b, 'event.venue') ? [sentence(['The card takes place at ', one(b, 'event.venue')])] : []),
        ...(one(b, 'bout.scheduled_rounds') || one(b, 'bout.weight_class') ? [sentence(['The bout is ', ...opt(one(b, 'bout.scheduled_rounds')), ...(one(b, 'bout.weight_class') ? [one(b, 'bout.scheduled_rounds') ? ' at ' : 'at ', one(b, 'bout.weight_class')] : [])])] : []),
        ...(one(b, 'weight.contracted') ? [sentence(['The contracted weight is ', one(b, 'weight.contracted')])] : []),
        ...byTopic(b, 'title.at_stake').map((t) => sentence(['At stake: the ', t])),
        ...contextSentences(b),
      ],
    };
  },
  OPPONENT_REPLACED(b) {
    const out = one(b, 'change.replaced_out');
    const inn = one(b, 'change.replaced_in');
    return {
      headline: inn && out ? `${inn.text} replaces ${out.text}` : null,
      sentences: [
        sentence([inn, ' replaces ', out, ...opt(one(b, 'event.name'), ' on ')]),
        ...(one(b, 'bout.participants') ? [sentence(['The bout is now ', one(b, 'bout.participants')])] : []),
        ...(one(b, 'event.date') ? [sentence(['The event is scheduled for ', one(b, 'event.date')])] : []),
        ...contextSentences(b),
      ],
    };
  },
  EVENT_POSTPONED(b) {
    const name = one(b, 'event.name');
    return {
      headline: name ? `${name.text} moved to a new date` : null,
      sentences: [sentence([name, ' has moved from ', one(b, 'change.previous_date'), ' to ', one(b, 'change.new_date')])],
    };
  },
  WEIGHT_MISSED(b) {
    const w = one(b, 'weight.official');
    return {
      headline: w ? `${w.text.replace(/ weighed .*/, '')} misses weight` : null,
      sentences: [
        sentence([...per(w), w, ...opt(one(b, 'weight.attempt'), ' on '), ', ', one(b, 'weight.miss')]),
        sentence(['The contracted limit is ', one(b, 'weight.contracted')]),
        ...(one(b, 'bout.participants') ? [sentence(['The bout: ', one(b, 'bout.participants')])] : []),
        ...byTopic(b, 'title.at_stake').map((t) => sentence(['The ', t, ' is listed as at stake'])),
        ...byTopic(b, 'title.eligibility').map((t) => sentence(['Per the sanctioning update, ', t])),
      ],
    };
  },
  WEIGH_IN_RESULT(b) {
    const w = one(b, 'weight.official');
    return {
      headline: w ? `Weigh-in: ${w.text}` : null,
      sentences: [
        sentence([...per(w), w, ...opt(one(b, 'weight.kind'), ' at the '), ...opt(one(b, 'weight.attempt'), ' on ')]),
        ...(one(b, 'weight.contracted') ? [sentence(['The contracted limit is ', one(b, 'weight.contracted')])] : []),
        ...(one(b, 'weight.made') ? [sentence([...per(one(b, 'weight.made')), 'Result: ', one(b, 'weight.made')])] : []),
      ],
    };
  },
  RESULT_OFFICIAL(b) {
    const p = one(b, 'bout.participants');
    const winner = one(b, 'result.winner');
    const outcome = winner ?? one(b, 'result.draw') ?? one(b, 'result.no_contest');
    return {
      headline: p && outcome ? `${p.text}: official result` : null,
      sentences: [
        winner ? sentence([winner, ' by ', one(b, 'result.decision_type') ?? one(b, 'result.method'), ...opt(one(b, 'result.round'), ' in ')])
          : sentence([p, ' ended in ', outcome, ...opt(one(b, 'result.method'), ' by ')]),
        ...byTopic(b, 'scorecard.card').map((c) => sentence([c])),
        ...contextSentences(b),
      ],
    };
  },
  RESULT_OVERTURNED(b) {
    const base = TEMPLATES.RESULT_OFFICIAL(b);
    const prev = one(b, 'result.previous');
    return { headline: base.headline ? base.headline.replace('official result', 'result changed') : null, sentences: [...(prev ? [sentence(['The bout was ', prev])] : []), ...base.sentences] };
  },
  SCORECARD_POSTED(b) {
    const p = one(b, 'bout.participants');
    return {
      headline: p ? `Scorecards: ${p.text}` : null,
      sentences: [
        ...(one(b, 'scorecard.corrected') ? [sentence(['This includes ', one(b, 'scorecard.corrected')])] : []),
        ...byTopic(b, 'scorecard.card').map((c) => sentence([c])),
      ],
    };
  },
  TITLE_WON(b) {
    const t = one(b, 'title.name');
    const f = one(b, 'title.fighter');
    return { headline: t && f ? `${f.text} recorded as holder of the ${t.text}` : null, sentences: [sentence([f, ' is recorded as holder of the ', t, ...opt(one(b, 'title.effective_on'), ' effective ')])] };
  },
  TITLE_VACATED(b) {
    const t = one(b, 'title.name');
    const status = one(b, 'title.status');
    return {
      headline: t && status ? `${t.text} now ${status.text.replace(/ (.*)$/, '')}` : null,
      sentences: [
        sentence(['The ', t, ' is recorded as ', status, ...opt(one(b, 'title.effective_on'), ' effective ')]),
        ...(one(b, 'title.fighter') ? [sentence(['It was held by ', one(b, 'title.fighter')])] : []),
        ...(one(b, 'title.reason') ? [sentence(['Stated reason, per ', one(b, 'title.reason').attribution.publisher, ': "', one(b, 'title.reason'), '"'])] : []),
      ],
    };
  },
  TITLE_STRIPPED(b) {
    const t = one(b, 'title.name');
    const status = one(b, 'title.status');
    return {
      headline: t && status ? `${t.text}: ${status.text}` : null,
      sentences: [
        sentence(['The ', t, ' was ', status, ...opt(one(b, 'title.effective_on'), ' effective ')]),
        ...(one(b, 'title.fighter') ? [sentence(['The recorded holder was ', one(b, 'title.fighter')])] : []),
        ...(one(b, 'title.reason') ? [sentence(['Stated reason, per ', one(b, 'title.reason').attribution.publisher, ': "', one(b, 'title.reason'), '"'])] : []),
      ],
    };
  },
  TITLE_STATUS_CHANGED(b) {
    const t = one(b, 'title.name') ?? one(b, 'title.at_stake');
    return { headline: t ? `Title status update: ${t.text}` : null, sentences: [sentence(['A status change was recorded for the ', t, ...opt(one(b, 'title.effective_on'), ' effective ')]), ...byTopic(b, 'title.eligibility').map((e) => sentence([e]))] };
  },
  RANKING_CHANGED(b) {
    const changes = byTopic(b, 'ranking.change');
    return { headline: changes.length ? 'Ranking update' : null, sentences: changes.map((c) => sentence([c])) };
  },
  MARKET_MOVED(b) {
    const sel = one(b, 'odds.selection');
    const prev = one(b, 'odds.consensus_previous');
    const next = one(b, 'odds.consensus_new');
    return {
      headline: sel ? `Market move: ${sel.text}` : null,
      sentences: [
        sentence(['PropBetEdge market consensus (', prev?.version ?? '', ') for ', sel, ' moved from ', prev, ' to ', next, ' across ', one(b, 'odds.books')]),
        ...(one(b, 'bout.participants') ? [sentence(['The bout: ', one(b, 'bout.participants')])] : []),
        sentence(['PropBetEdge has no sourced explanation for this move']),
      ],
    };
  },
  SUSPENSION_POSTED(b) {
    const f = one(b, 'title.fighter');
    return {
      headline: 'Commission action posted',
      sentences: [
        sentence(['A public commission notice lists ', one(b, 'regulatory.status'), ...opt(one(b, 'regulatory.from'), ' from '), ...opt(one(b, 'regulatory.to'), ' to ')]),
        ...(one(b, 'regulatory.reason') ? [sentence(['Stated reason, per the commission notice: "', one(b, 'regulatory.reason'), '"'])] : []),
        ...(f ? [sentence([f])] : []),
      ],
    };
  },
  OFFICIALS_ASSIGNED(b) {
    const p = one(b, 'bout.participants');
    const officials = byTopic(b, 'officials.assignment');
    return { headline: p ? `Officials named for ${p.text}` : null, sentences: officials.length ? [sentence(['Assigned officials: ', ...officials.flatMap((o, i) => (i ? [', ', o] : [o]))])] : [] };
  },
};

export function generateArticle(block) {
  const t = TEMPLATES[block.news_event.event_type];
  if (!t) return { ok: false, reason: 'no_template_for_event_type' };
  const draft = t(block);
  const sentences = (draft.sentences ?? []).filter(Boolean);
  if (!draft.headline || !sentences.length) return { ok: false, reason: 'required_facts_missing' };
  return {
    ok: true,
    headline: draft.headline,
    dek: null,
    sentences,
    body_md: sentences.map((s) => s.text).join(' '),
    generator_version: GENERATOR_VERSION,
  };
}

export function slugFor(block, headline) {
  const base = headline.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return `${base}-${block.news_event.id.slice(0, 8)}`;
}
