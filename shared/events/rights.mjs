// Rights lane gate (database error BX140, migration 0045).
//
// A fact may only be written for a (source, lane) the source's recorded rights review covers. When it does not, the
// database refuses the write and the pipeline records the refusal instead of failing the run: nothing is written, nothing
// already stored is touched, and the parser keeps working — the lane simply stays closed until the terms are reviewed.

const REFUSAL = /lane_not_rights_approved:\s*(\w+)\s+is\s+(\w+)\s+for source\s+(\S+)/;

// Returns { status, reason, lane, rights_scope, source_key } for a rights refusal, or null for any other error.
export function laneRefusal(err) {
  const m = REFUSAL.exec(err?.message ?? '');
  if (!m && !/lane_not_rights_approved/.test(err?.message ?? '')) return null;
  return { status: 'refused', reason: 'lane_not_rights_approved', lane: m?.[1] ?? null, rights_scope: m?.[2] ?? null, source_key: m?.[3] ?? null };
}

// Runs a write and converts a rights refusal into a value; any other error still throws.
export async function withLaneGate(fn) {
  try {
    return await fn();
  } catch (err) {
    const refusal = laneRefusal(err);
    if (!refusal) throw err;
    return refusal;
  }
}
