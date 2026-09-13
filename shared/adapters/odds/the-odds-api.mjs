// The Odds API v4 adapter for sport key boxing_boxing.
//
// Rights (review 2026-09-13, docs/SOURCE_POLICY.md): approved for ingestion,
// indefinite storage, first-party display, derived analytics and model
// training; raw redistribution (our own API/feed/downloadable files of the
// provider's data) is prohibited. The capture worker additionally refuses to
// fetch unless the source row is approved AND ODDS_CAPTURE_ENABLED AND the
// Supabase target is on the boxing allow-list.
//
// Two normalizations:
//   providerQuoteEvents(): EVERY returned market/outcome, keyed only by provider
//     ids and verbatim names, for the provider ledger (no canonical resolution)
//   normalizeEvent(): canonical markets for a MATCHED bout only
//     h2h    -> moneyline (2 outcomes) or moneyline_3way (fighter, fighter, Draw)
//     totals -> total_rounds (Over/Under with a single point)
//   Anything else is counted as unsupported and NOT stored as a guessed market.

import { normalizePrice } from '../../odds/price.mjs';
import { marketKey } from '../../odds/markets.mjs';

export const ADAPTER_VERSION = 'the-odds-api-boxing@1.0.0';
export const PROVIDER_SLUG = 'the_odds_api';
export const SOURCE_KEY = 'the_odds_api';
export const EVENT_NAMESPACE = 'the_odds_api.event';
export const SPORT_KEY = 'boxing_boxing';
const API = 'https://api.the-odds-api.com/v4';

const DRAW_NAMES = new Set(['draw', 'tie']);

export function validatePayload(payload) {
  if (!Array.isArray(payload)) throw new Error('odds_api_schema: payload is not an array of events');
  for (const e of payload) {
    for (const k of ['id', 'commence_time', 'home_team', 'away_team', 'bookmakers']) {
      if (!(k in e)) throw new Error(`odds_api_schema: event missing ${k}`);
    }
    if (e.sport_key && e.sport_key !== SPORT_KEY) throw new Error(`odds_api_schema: unexpected sport_key ${e.sport_key}`);
  }
  return payload;
}

// Normalizes one provider event for a matched bout.
//   sides: { [providerName]: 'a' | 'b' } from the matcher
//   fighters: { a: fighterId, b: fighterId }
export function normalizeEvent(event, { sides, fighters, region = null }) {
  const unsupported = [];
  const rejected = [];
  const bookmakers = [];
  const commence = event.commence_time;

  for (const bk of event.bookmakers ?? []) {
    const markets = [];
    for (const mk of bk.markets ?? []) {
      const providerTs = mk.last_update ?? bk.last_update ?? null;
      const isLive = Boolean(providerTs && commence && Date.parse(providerTs) >= Date.parse(commence));
      try {
        if (mk.key === 'h2h') {
          const outcomes = mk.outcomes.map((o) => {
            const draw = DRAW_NAMES.has(String(o.name).trim().toLowerCase());
            const side = sides[o.name];
            if (!draw && !side) throw new Error(`unexpected_outcome:${o.name}`);
            const price = normalizePrice({ american: o.price });
            return {
              selection_key: draw ? 'draw' : `fighter_${side}`,
              fighter_id: draw ? null : fighters[side],
              label: o.name,
              outcome_name: o.name,
              american: price.american, decimal: price.decimal, implied: price.implied,
              provider_timestamp: providerTs,
              raw: o,
            };
          });
          const keys = new Set(outcomes.map((o) => o.selection_key));
          if (keys.size !== outcomes.length) throw new Error('duplicate_outcome');
          const type = keys.has('draw') ? 'moneyline_3way' : 'moneyline';
          if (!keys.has('fighter_a') || !keys.has('fighter_b')) throw new Error('incomplete_moneyline');
          markets.push({ market_type: type, market_key: marketKey({ marketType: type, isLive }), provider_market_key: mk.key, is_live: isLive, status: 'open', outcomes });
        } else if (mk.key === 'totals') {
          const points = new Set(mk.outcomes.map((o) => Number(o.point)));
          if (points.size !== 1 || !Number.isFinite([...points][0])) throw new Error('mixed_or_missing_total_line');
          const line = [...points][0];
          const outcomes = mk.outcomes.map((o) => {
            const name = String(o.name).toLowerCase();
            if (name !== 'over' && name !== 'under') throw new Error(`unexpected_outcome:${o.name}`);
            const price = normalizePrice({ american: o.price });
            return {
              selection_key: name, fighter_id: null, label: `${o.name} ${line}`, outcome_name: o.name, line,
              american: price.american, decimal: price.decimal, implied: price.implied, provider_timestamp: providerTs, raw: o,
            };
          });
          markets.push({ market_type: 'total_rounds', market_key: marketKey({ marketType: 'total_rounds', line, isLive }), provider_market_key: mk.key, line, is_live: isLive, status: 'open', outcomes });
        } else {
          unsupported.push({ bookmaker: bk.key, market: mk.key });
        }
      } catch (err) {
        rejected.push({ bookmaker: bk.key, market: mk.key, reason: err.message });
      }
    }
    if (markets.length) bookmakers.push({ key: bk.key, title: bk.title, region, markets });
  }
  return { bookmakers, unsupported, rejected };
}

// Unmetered preflight (/v4/sports costs 0 credits).
export async function preflight({ apiKey, fetchImpl = fetch, minRemaining = 1000 }) {
  const res = await fetchImpl(`${API}/sports/?apiKey=${encodeURIComponent(apiKey)}`);
  const quota = {
    used: Number(res.headers.get('x-requests-used')),
    remaining: Number(res.headers.get('x-requests-remaining')),
  };
  if (!res.ok) return { ok: false, reason: `sports_http_${res.status}`, quota };
  const sports = await res.json();
  const boxing = sports.find((s) => s.key === SPORT_KEY);
  if (!boxing) return { ok: false, reason: 'sport_not_listed', quota };
  if (!boxing.active) return { ok: false, reason: 'sport_inactive', quota };
  if (Number.isFinite(quota.remaining) && quota.remaining < minRemaining) return { ok: false, reason: 'quota_below_floor', quota };
  return { ok: true, quota };
}

const REGION = /^[a-z0-9]{2,8}$/;
const MARKET = /^[a-z0-9_]{2,40}$/;
const headerNumber = (res, name) => { const v = res.headers.get(name); return v == null || v === '' ? null : Number(v); };

// One bulk call. Cost = regions x markets. The key never appears in errors.
export async function fetchOdds({ apiKey, fetchImpl = fetch, regions = ['us'], markets = ['h2h'] }) {
  if (!regions.length || !regions.every((r) => REGION.test(r))) throw new Error('odds_api_bad_regions');
  if (!markets.length || !markets.every((m) => MARKET.test(m))) throw new Error('odds_api_bad_markets');
  const url = `${API}/sports/${SPORT_KEY}/odds/?regions=${regions.join(',')}&markets=${markets.join(',')}&oddsFormat=american&dateFormat=iso&apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetchImpl(url);
  const quota = { used: headerNumber(res, 'x-requests-used'), remaining: headerNumber(res, 'x-requests-remaining'), last_cost: headerNumber(res, 'x-requests-last') };
  if (!res.ok) throw Object.assign(new Error(`odds_http_${res.status}`), { quota, httpStatus: res.status });
  return { payload: validatePayload(await res.json()), quota, regions, markets, httpStatus: res.status };
}

// Every market and outcome the provider returned, keyed by provider ids and
// verbatim names only. Prices that are not valid American odds are counted,
// never coerced.
export function providerQuoteEvents(payload) {
  const events = [];
  let rejected = 0;
  for (const e of payload) {
    const quotes = [];
    for (const bk of e.bookmakers ?? []) {
      for (const mk of bk.markets ?? []) {
        const providerTs = mk.last_update ?? bk.last_update ?? null;
        const isLive = Boolean(providerTs && e.commence_time && Date.parse(providerTs) >= Date.parse(e.commence_time));
        for (const o of mk.outcomes ?? []) {
          try {
            const price = normalizePrice({ american: o.price });
            quotes.push({
              bookmaker_key: bk.key, bookmaker_title: bk.title ?? null, market_key: mk.key, outcome_name: String(o.name),
              point: o.point ?? null, american: price.american, decimal: price.decimal, implied: price.implied,
              provider_last_update: providerTs, is_live: isLive,
            });
          } catch { rejected++; }
        }
      }
    }
    events.push({
      provider_event_id: String(e.id), sport_key: e.sport_key ?? SPORT_KEY, commence_time: e.commence_time,
      home_name: String(e.home_team), away_name: String(e.away_team), quotes,
    });
  }
  return { events, rejected };
}
