// Fact-block builder. Deterministic and pure over boxing_news_context().
//
// A fact block is the COMPLETE set of statements an article may make. Every
// fact carries:
//   id       stable within the block (F1, F2, ...)
//   label    canonical_fact | attributed_statement | pbe_derived
//   topic    what it is about (drives which claim categories prose may use)
//   value    machine value;  text: the exact display string prose may use
//   source   provenance (source_key, observation id / url)
//   version  required for pbe_derived facts
// Anything not in the block does not exist as far as prose is concerned.
// `absent_topics` records categories we deliberately have no facts for, so a
// missing odds/ranking/injury fact can never be "filled in".

import { canonicalJson, sha256Hex } from '../canonical.mjs';
import { assertMinimized } from '../adapters/commissions/minimize.mjs';

export const FACT_BLOCK_SCHEMA = 'boxing-fact-block@1';
export const BUILDER_VERSION = 'boxing-fact-block-builder@1.0.0';

export class FactBlockError extends Error {
  constructor(reason, detail) {
    super(`${reason}${detail ? `: ${detail}` : ''}`);
    this.reason = reason;
  }
}

export const LABELS = new Set(['canonical_fact', 'attributed_statement', 'pbe_derived']);
const SENSITIVE_TYPES = new Set(['SUSPENSION_POSTED', 'TITLE_STRIPPED', 'RESULT_OVERTURNED', 'RESULT_CORRECTED']);
const ALL_TOPICS = ['odds', 'ranking', 'title', 'weight', 'result', 'scorecard', 'officials', 'regulatory', 'fight_dna', 'record', 'injury', 'purse', 'quote', 'previous_meeting'];

// Names are data, never instructions: they must look like names.
// Entity names: letters, marks, digits ("2300 Arena", "TBL 12"), spaces and . ' ’ -, at least one letter, no markup.
// Numbers inside a name are not claims: the validator masks known names before checking numbers.
const NAME_RE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’. -]{0,79}$/u;
export function safeName(name, what) {
  const n = String(name ?? '').trim();
  if (!NAME_RE.test(n) || !/\p{L}/u.test(n) || /\b(ignore|instruction|prompt|system|assistant)\b/i.test(n)) {
    throw new FactBlockError('unsafe_entity_name', `${what}: ${JSON.stringify(n).slice(0, 60)}`);
  }
  return n;
}

const fmtDate = (d) => {
  if (!d) return null;
  const x = new Date(`${String(d).slice(0, 10)}T00:00:00Z`);
  return x.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};
const fmtLb = (v) => (v == null ? null : `${Number(v).toFixed(Number(v) % 1 ? 1 : 0)} lb`);
const fmtAmerican = (a) => (a == null ? null : a > 0 ? `+${a}` : String(a));
const METHOD_TEXT = {
  KO: 'knockout', TKO: 'technical knockout', RTD: 'corner retirement', DQ: 'disqualification',
  DECISION: 'decision', TECHNICAL_DECISION: 'technical decision', NO_CONTEST: 'no contest', NO_DECISION: 'no decision',
};

export async function buildFactBlock(ctx) {
  const ev = ctx.news_event;
  if (!ev) throw new FactBlockError('news_event_missing');
  const payload = ev.payload?.facts ?? {};
  const facts = [];
  const reviewReasons = [];
  const conflicts = [];
  const primarySource = ev.sources?.[0] ?? {};
  const src = (extra = {}) => ({ source_key: primarySource.source_key ?? null, observation_id: primarySource.observation_id ?? null, source_url: primarySource.source_url ?? null, ...extra });
  const add = (label, topic, value, text, extra = {}) => {
    if (value == null || text == null || text === '') return null;
    if (!LABELS.has(label)) throw new FactBlockError('invalid_label', label);
    if (label === 'pbe_derived' && !extra.version) throw new FactBlockError('derived_fact_without_version', topic);
    const id = `F${facts.length + 1}`;
    facts.push({ id, label, topic, value, text: String(text), source: extra.source ?? src(), ...(extra.version ? { version: extra.version } : {}), ...(extra.refs ? { refs: extra.refs } : {}), ...(extra.attribution ? { attribution: extra.attribution } : {}) });
    return id;
  };

  // ---- entities (names allowed in prose come only from here)
  const fighters = (ctx.fighters ?? []).map((f) => ({ ref: `fighter:${f.id}`, id: f.id, public_id: f.public_id, name: safeName(f.display_name, 'fighter'), identity_state: f.identity_state }));
  const byFighter = new Map(fighters.map((f) => [f.id, f]));
  for (const id of ev.fighter_ids ?? []) {
    if (!byFighter.has(id)) reviewReasons.push('fighter_not_found');
  }
  if (fighters.some((f) => f.identity_state === 'review_required')) reviewReasons.push('fighter_identity_unresolved');
  const officials = (ctx.bout?.officials ?? []).map((o) => ({ ref: `official:${o.official_id}`, id: o.official_id, name: safeName(o.display_name, 'official'), role: o.role }));
  const organizations = (ctx.bout?.titles ?? []).map((t) => ({ ref: `org:${t.organization}`, name: safeName(t.organization, 'organization') }));
  const event = ctx.event ? { ref: 'event', id: ctx.event.id, name: safeName(ctx.event.name, 'event'),
    venue: ctx.event.venue ? { name: safeName(ctx.event.venue.name, 'venue'), city: ctx.event.venue.city ? safeName(ctx.event.venue.city, 'city') : null } : null,
    commission: ctx.event.commission ? { name: safeName(ctx.event.commission.name, 'commission') } : null } : null;
  const nameOf = (id) => byFighter.get(id)?.name ?? null;

  // ---- shared bout/event context
  const bout = ctx.bout;
  if (event) {
    add('canonical_fact', 'event.name', event.name, event.name, { refs: ['event'] });
    add('canonical_fact', 'event.date', ctx.event.event_date, fmtDate(ctx.event.event_date));
    if (event.venue) add('canonical_fact', 'event.venue', event.venue.name, event.venue.city ? `${event.venue.name} in ${event.venue.city}` : event.venue.name);
  }
  if (bout) {
    const [a, b] = ['a', 'b'].map((side) => bout.participants.find((p) => p.side === side));
    if (a && b) add('canonical_fact', 'bout.participants', [a.fighter_id, b.fighter_id], `${nameOf(a.fighter_id)} vs. ${nameOf(b.fighter_id)}`, { refs: [`fighter:${a.fighter_id}`, `fighter:${b.fighter_id}`] });
    if (bout.weight_class) add('canonical_fact', 'bout.weight_class', bout.weight_class.key, bout.weight_class.name.toLowerCase());
    if (bout.scheduled_rounds) add('canonical_fact', 'bout.scheduled_rounds', bout.scheduled_rounds, `${bout.scheduled_rounds} rounds`);
    if (bout.contracted_weight_lb) add('canonical_fact', 'weight.contracted', Number(bout.contracted_weight_lb), fmtLb(bout.contracted_weight_lb));
    if (bout.is_catchweight) add('canonical_fact', 'weight.catchweight', true, 'catchweight');
    for (const t of bout.titles ?? []) {
      add('canonical_fact', 'title.at_stake', t.title_id, `${t.organization} ${t.source_native_label ?? `${t.tier} title`}`.replace(/\bworld title\b/, 'world title'), { refs: [`org:${t.organization}`] });
      if (t.eligible_fighter_id) add('canonical_fact', 'title.eligibility', t.eligible_fighter_id, `only ${nameOf(t.eligible_fighter_id)} can win the ${t.organization} title`);
    }
    for (const p of bout.participants) {
      if (p.record_wins != null && p.record_losses != null && p.record_draws != null && p.record_source_id) {
        add('canonical_fact', 'record', p.fighter_id, `${nameOf(p.fighter_id)} (${p.record_wins}-${p.record_losses}-${p.record_draws})`, { refs: [`fighter:${p.fighter_id}`] });
      }
    }
  }

  // ---- event-type specific facts, all from structured payloads
  switch (ev.event_type) {
    case 'OPPONENT_REPLACED': {
      if (payload.before?.fighter_id) add('canonical_fact', 'change.replaced_out', payload.before.fighter_id, payload.before.display_name ? safeName(payload.before.display_name, 'replaced fighter') : null);
      if (payload.after?.fighter_id) add('canonical_fact', 'change.replaced_in', payload.after.fighter_id, nameOf(payload.after.fighter_id));
      break;
    }
    case 'EVENT_POSTPONED':
      add('canonical_fact', 'change.previous_date', payload.before?.event_date, fmtDate(payload.before?.event_date));
      add('canonical_fact', 'change.new_date', payload.after?.event_date, fmtDate(payload.after?.event_date));
      break;
    case 'WEIGH_IN_RESULT':
    case 'WEIGHT_MISSED': {
      // Conflicting sources: another source recorded a different weight for
      // the same boxer / kind / attempt. Keep both on record, state neither as
      // canonical, and send the story to a human.
      const readings = (ctx.weigh_in_history ?? []).filter((w) => w.fighter_id === payload.fighter_id
        && w.weigh_in_kind === (payload.weigh_in_kind ?? 'official') && w.attempt_no === (payload.attempt_no ?? 1) && w.official_weight_lb != null);
      const disagreeing = readings.filter((w) => Number(w.official_weight_lb) !== Number(payload.official_weight_lb));
      if (disagreeing.some((w) => readings.some((r) => r.source_key !== w.source_key))) {
        conflicts.push({ topic: 'weight.official', readings: readings.map((r) => ({ source_key: r.source_key, official_weight_lb: Number(r.official_weight_lb), verification_state: r.verification_state, revision: r.revision })) });
        reviewReasons.push('conflicting_sources');
      }
      const label = payload.verification_state === 'verified' && !conflicts.length ? 'canonical_fact' : 'attributed_statement';
      if (payload.verification_state !== 'verified') reviewReasons.push('weigh_in_not_verified');
      const attribution = label === 'attributed_statement' ? { attribution: { publisher: primarySource.source_key } } : {};
      add(label, 'weight.official', payload.official_weight_lb, `${nameOf(payload.fighter_id)} weighed ${fmtLb(payload.official_weight_lb)}`, { refs: [`fighter:${payload.fighter_id}`], ...attribution });
      add('canonical_fact', 'weight.contracted', payload.contracted_weight_lb, fmtLb(payload.contracted_weight_lb));
      if (payload.status === 'missed_weight' && payload.miss_lb > 0) add(label, 'weight.miss', payload.miss_lb, `${fmtLb(payload.miss_lb)} over the contracted limit`, attribution);
      if (payload.status === 'made_weight') add(label, 'weight.made', true, 'made weight', attribution);
      if ((payload.attempt_no ?? 1) > 1) add('canonical_fact', 'weight.attempt', payload.attempt_no, `attempt ${payload.attempt_no}`);
      if (payload.weigh_in_kind && payload.weigh_in_kind !== 'official') add('canonical_fact', 'weight.kind', payload.weigh_in_kind, payload.weigh_in_kind.replace(/_/g, ' '));
      break;
    }
    case 'RESULT_OFFICIAL':
    case 'RESULT_CORRECTED':
    case 'RESULT_OVERTURNED': {
      const result = payload;
      if (result.outcome === 'win') add('canonical_fact', 'result.winner', result.winner_id, `${nameOf(result.winner_id)} won`);
      if (result.outcome === 'draw') add('canonical_fact', 'result.draw', true, 'a draw');
      if (result.outcome === 'no_contest') add('canonical_fact', 'result.no_contest', true, 'a no contest');
      add('canonical_fact', 'result.method', result.method, METHOD_TEXT[result.method] ?? null);
      if (result.decision_type && ['DECISION', 'TECHNICAL_DECISION'].includes(result.method)) add('canonical_fact', 'result.decision_type', result.decision_type, `${result.decision_type} ${result.method === 'TECHNICAL_DECISION' ? 'technical decision' : 'decision'}`);
      if (result.round) add('canonical_fact', 'result.round', result.round, `round ${result.round}`);
      if (result.previous) add('canonical_fact', 'result.previous', result.previous.outcome, `previously recorded as ${result.previous.outcome === 'win' ? `a win for ${nameOf(result.previous.winner_id)}` : result.previous.outcome.replace('_', ' ')}`);
      if (result.scorecard_consistency?.consistent === false) reviewReasons.push('result_contradicts_scorecards');
      break;
    }
    case 'SCORECARD_POSTED':
      for (const c of payload.cards ?? []) {
        const judge = officials.find((o) => o.id === c.judge_id);
        add('canonical_fact', 'scorecard.card', `${c.fighter_a_total}-${c.fighter_b_total}`, `${judge ? `${judge.name} scored it ` : ''}${Number(c.fighter_a_total)}-${Number(c.fighter_b_total)}`, { refs: judge ? [judge.ref] : [] });
      }
      if (payload.is_correction) add('canonical_fact', 'scorecard.corrected', true, 'a corrected scorecard');
      if (payload.validation_problems?.length) reviewReasons.push('scorecard_validation_problems');
      break;
    case 'TITLE_WON':
    case 'TITLE_VACATED':
    case 'TITLE_STRIPPED':
    case 'TITLE_STATUS_CHANGED': {
      const t = payload.title;
      if (t) {
        const org = safeName(t.organization?.toUpperCase?.() ?? t.organization, 'title organization');
        organizations.push({ ref: `org:${org}`, name: org });
        add('canonical_fact', 'title.name', t.id, `${org} ${t.weight_class_key ? `${t.weight_class_key.replace(/_/g, ' ')} ` : ''}${t.source_native_label ?? `${t.tier} title`}`);
      }
      const STATUS_TEXT = { won: 'holder', awarded: 'holder', elevated: 'holder (elevated)', vacated: 'vacant', relinquished: 'vacant (relinquished)',
        stripped: 'stripped from the champion', downgraded: 'downgraded', lost: 'lost', reinstated: 'reinstated', status_changed: 'status changed', retraction: 'retracted' };
      add('canonical_fact', 'title.status', payload.title_event_type, STATUS_TEXT[payload.title_event_type] ?? null);
      if (payload.fighter_id) add('canonical_fact', 'title.fighter', payload.fighter_id, nameOf(payload.fighter_id));
      add('canonical_fact', 'title.effective_on', payload.effective_on, fmtDate(payload.effective_on));
      if (payload.reason_public) add('attributed_statement', 'title.reason', payload.reason_public, payload.reason_public, { attribution: { publisher: primarySource.source_key } });
      break;
    }
    case 'RANKING_CHANGED':
      for (const c of (payload.changes ?? []).slice(0, 12)) {
        if (!c.fighter_id) continue;
        const text = c.type === 'moved_up' || c.type === 'moved_down'
          ? `${nameOf(c.fighter_id)} ${c.type === 'moved_up' ? 'moved up' : 'moved down'} from No. ${c.previous_rank} to No. ${c.rank}`
          : c.type === 'new_entrant' ? `${nameOf(c.fighter_id)} entered at No. ${c.rank ?? c.rank_label}`
            : c.type === 'removed' ? `${nameOf(c.fighter_id)} is no longer listed` : null;
        add('canonical_fact', 'ranking.change', c.type, text);
      }
      if ((payload.changes ?? []).some((c) => c.identity_unresolved)) reviewReasons.push('ranking_identity_unresolved');
      break;
    case 'MARKET_MOVED': {
      const books = payload.books_participating;
      add('pbe_derived', 'odds.consensus_previous', payload.previous_consensus_american, fmtAmerican(payload.previous_consensus_american), { version: 'pbe_market_consensus@1' });
      add('pbe_derived', 'odds.consensus_new', payload.new_consensus_american, fmtAmerican(payload.new_consensus_american), { version: 'pbe_market_consensus@1' });
      add('pbe_derived', 'odds.books', books, `${books} sportsbooks`, { version: 'pbe_market_consensus@1' });
      add('canonical_fact', 'odds.window_end', payload.window?.to, fmtDate(payload.window?.to));
      const side = payload.selection_key?.endsWith('_a') ? 'a' : payload.selection_key?.endsWith('_b') ? 'b' : null;
      const fighter = side && bout ? bout.participants.find((p) => p.side === side)?.fighter_id : null;
      if (fighter) add('canonical_fact', 'odds.selection', fighter, nameOf(fighter));
      // payload.cause is null: no cause fact is added, so prose cannot state one
      break;
    }
    case 'SUSPENSION_POSTED':
      add('canonical_fact', 'regulatory.status', payload.status, `suspension status: ${payload.status}`);
      add('canonical_fact', 'regulatory.from', payload.effective_from, fmtDate(payload.effective_from));
      add('canonical_fact', 'regulatory.to', payload.effective_to, fmtDate(payload.effective_to));
      if (payload.reason_public) add('attributed_statement', 'regulatory.reason', payload.reason_public, payload.reason_public, { attribution: { publisher: primarySource.source_key } });
      break;
    case 'OFFICIALS_ASSIGNED':
      for (const o of officials) add('canonical_fact', 'officials.assignment', o.id, `${o.name} (${o.role})`, { refs: [o.ref] });
      break;
    default:
      break;
  }

  // ---- PBE context: only what exists, labelled
  for (const m of ctx.fight_dna ?? []) {
    if (m.value_number == null || !m.sample_size) continue;
    add('pbe_derived', 'fight_dna.metric', Number(m.value_number), `${nameOf(m.fighter_id)} ${m.metric_name}: ${Number(m.value_number)} (sample ${m.sample_size})`, { version: `${m.metric_key}@${m.metric_version}`, refs: [`fighter:${m.fighter_id}`] });
  }
  if (ev.event_type !== 'MARKET_MOVED') {
    for (const c of ctx.market ?? []) {
      if (c.consensus_implied == null) continue;
      const side = c.selection_key === 'fighter_a' ? 'a' : c.selection_key === 'fighter_b' ? 'b' : null;
      const fighter = side && bout ? bout.participants.find((p) => p.side === side)?.fighter_id : null;
      if (!fighter) continue;
      add('pbe_derived', 'odds.consensus_current', Number(c.consensus_implied), `${nameOf(fighter)} ${Math.round(Number(c.consensus_implied) * 100)}% implied (median of ${c.bookmaker_count} sportsbooks)`, { version: 'pbe_market_consensus@1', refs: [`fighter:${fighter}`] });
    }
  }
  for (const m of ctx.previous_meetings ?? []) {
    add('canonical_fact', 'previous_meeting', m.bout_id, `they previously met on ${fmtDate(m.event_date)}${m.outcome === 'win' && m.winner_id ? `, won by ${nameOf(m.winner_id)}` : m.outcome ? ` (${m.outcome.replace('_', ' ')})` : ''}`);
  }

  // ---- sensitivity, rights, conflicts
  if (SENSITIVE_TYPES.has(ev.event_type)) reviewReasons.push(`sensitive_event_type:${ev.event_type}`);
  if (ev.state === 'needs_review') reviewReasons.push('news_event_requires_review');
  if ((ev.confidence ?? 100) < 90) reviewReasons.push('low_confidence');
  if (ev.supersedes_id) reviewReasons.push('correction');
  for (const s of ctx.sources ?? []) {
    if (!s.display_allowed) reviewReasons.push(`source_display_not_approved:${s.source_key}`);
  }
  if (!(ctx.sources ?? []).length) reviewReasons.push('no_registered_source');

  const presentTopics = new Set(facts.map((f) => topicCategory(f.topic)));
  const block = {
    schema: FACT_BLOCK_SCHEMA,
    builder_version: BUILDER_VERSION,
    news_event: { id: ev.id, event_type: ev.event_type, dedupe_key: ev.dedupe_key, detected_at: ev.detected_at, confidence: ev.confidence, supersedes_id: ev.supersedes_id ?? null },
    entities: { fighters, officials, organizations, event },
    facts,
    absent_topics: ALL_TOPICS.filter((t) => !presentTopics.has(t)),
    conflicts,
    sources: ev.sources ?? [],
    sensitivity: reviewReasons.some((r) => r.startsWith('sensitive_event_type')) ? 'sensitive' : 'normal',
    review_reasons: [...new Set(reviewReasons)],
  };
  // private identifiers / medical details from source documents can never reach prose
  try { assertMinimized(block); } catch (err) { throw new FactBlockError('sensitive_source_field', err.message); }
  const hash = await sha256Hex(canonicalJson({ ...block, news_event: { ...block.news_event, detected_at: null } }));
  return { block, hash };
}

export function topicCategory(topic) {
  if (topic.startsWith('odds.')) return 'odds';
  if (topic.startsWith('ranking.')) return 'ranking';
  if (topic.startsWith('title.')) return 'title';
  if (topic.startsWith('weight.')) return 'weight';
  if (topic.startsWith('result.')) return 'result';
  if (topic.startsWith('scorecard.')) return 'scorecard';
  if (topic.startsWith('officials.')) return 'officials';
  if (topic.startsWith('regulatory.')) return 'regulatory';
  if (topic.startsWith('fight_dna.')) return 'fight_dna';
  if (topic === 'record') return 'record';
  if (topic === 'previous_meeting') return 'previous_meeting';
  return topic.split('.')[0];
}
