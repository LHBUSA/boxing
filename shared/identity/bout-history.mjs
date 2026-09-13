// Candidate bout history for identity review (issue #10). Pure.
//
// A reviewer must be able to tell apart:
//   * a legitimate repeat pairing: the same two boxers twice on one official card,
//     distinct source bout ids ("<pair>", "<pair>|2") and distinct sheet orders
//   * a possible duplicate canonical bout: the same fight recorded twice
//     (no distinguishing source id or sheet order, or on different event rows
//     within a day)
//   * the current canonical result vs preserved earlier revisions, including
//     revisions superseded by a parser correction (change_reason reparsed_with_*)
//
// Input: graph-context bouts (boxing_identity_graph_context, migration 0018).

const DAY = 86_400_000;

export function describeResultHistory(revisions = []) {
  const sorted = [...revisions].sort((a, b) => a.revision - b.revision);
  const current = sorted.at(-1) ?? null;
  const preserved = sorted.slice(0, -1).map((r) => {
    const correctedBy = sorted.find((x) => x.revision > r.revision && /^reparsed_with_/.test(x.change_reason ?? ''));
    return {
      revision: r.revision, result: r.result, method: r.method ?? null, change_reason: r.change_reason ?? null,
      kind: correctedBy ? 'superseded_by_parser_correction' : 'superseded_by_later_official_revision',
      corrected_by_revision: correctedBy?.revision ?? null, corrected_by_reason: correctedBy?.change_reason ?? null,
    };
  });
  return {
    current: current ? { revision: current.revision, result: current.result, method: current.method ?? null, change_reason: current.change_reason ?? null,
      // a correction needs something to correct: the first recorded result is never a correction, whatever run wrote it
      is_parser_correction: sorted.length > 1 && /^reparsed_with_/.test(current.change_reason ?? '') } : null,
    preserved_history: preserved,
  };
}

export function classifyCandidateBouts(bouts = []) {
  const withIds = bouts.map((b) => {
    const ids = (b.source_bout_ids ?? []).map((x) => x.external_id);
    const repeat = Math.max(1, ...(b.source_bout_ids ?? []).map((x) => x.repeat_index ?? 1));
    return { ...b, _ids: ids, _repeat: repeat };
  });
  return withIds.map((b) => {
    const sameOpponent = withIds.filter((o) => o !== b && o.opponent_id && o.opponent_id === b.opponent_id && o.date && b.date
      && Math.abs(Date.parse(o.date) - Date.parse(b.date)) <= DAY);
    let pairing = 'single';
    let detail = null;
    if (sameOpponent.length) {
      const distinct = (o) => o.event_id === b.event_id
        && ((o._ids.length && b._ids.length && !o._ids.some((id) => b._ids.includes(id)) && (o._repeat !== b._repeat))
          || (o.bout_order != null && b.bout_order != null && Number(o.bout_order) !== Number(b.bout_order)));
      if (sameOpponent.every(distinct)) {
        const group = [b, ...sameOpponent].sort((x, y) => x._repeat - y._repeat || (x.bout_order ?? 0) - (y.bout_order ?? 0));
        pairing = 'repeat_pairing';
        detail = `meeting ${group.indexOf(b) + 1} of ${group.length} on the same card`;
      } else {
        pairing = 'possible_duplicate_canonical_bout';
        detail = sameOpponent.map((o) => `${o.bout_id} (${o.event_id === b.event_id ? 'same event row' : 'different event row'}, order ${o.bout_order ?? '?'})`).join('; ');
      }
    }
    const history = describeResultHistory(b.result_revisions ?? []);
    return {
      date: b.date, event_id: b.event_id, bout_id: b.bout_id, bout_order: b.bout_order ?? null, opponent: b.opponent_name, opponent_id: b.opponent_id,
      source_bout_ids: b._ids, repeat_index: b._repeat, pairing, pairing_detail: detail,
      weight_lb: b.weight_lb ?? null, current_result: history.current ?? (b.result ? { result: b.result } : null), preserved_history: history.preserved_history,
    };
  });
}

export function historyLine(h) {
  const repeat = h.repeat_index > 1 ? ` |${h.repeat_index}` : '';
  const pairing = h.pairing === 'single' ? '' : ` [${h.pairing}: ${h.pairing_detail}]`;
  const current = h.current_result ? ` current: ${h.current_result.result}${h.current_result.revision ? ` (rev${h.current_result.revision}${h.current_result.change_reason ? `, ${h.current_result.change_reason}` : ''})` : ''}` : '';
  const preserved = h.preserved_history?.length ? `; preserved: ${h.preserved_history.map((p) => `rev${p.revision} ${p.result} (${p.kind}${p.corrected_by_revision ? ` by rev${p.corrected_by_revision}` : ''})`).join(', ')}` : '';
  return `${h.date} vs ${h.opponent}, order ${h.bout_order ?? '?'}${repeat}${pairing};${current}${preserved}`;
}
