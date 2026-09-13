// Temporal mode for structured news. Facts written by a backfill or by a late
// re-apply (for example an identity resolved months after the fight) are
// history, not news: boxing_emit_news_event stamps payload.temporal and stores
// them as 'skipped'. Forward runs keep mode 'forward' (the database still treats
// anything more than 45 days after its event as history).

export const TEMPORAL_MODES = Object.freeze(['forward', 'backfill', 'reapply']);

export function withTemporalMode(store, mode) {
  if (!TEMPORAL_MODES.includes(mode)) throw new Error(`unknown temporal mode ${mode}`);
  if (mode === 'forward') return store;
  return new Proxy(store, {
    get(target, prop, receiver) {
      if (prop === 'emitNewsEvent') return (event) => target.emitNewsEvent({ ...event, temporal_mode: mode });
      if (prop === 'temporalMode') return mode;
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}
