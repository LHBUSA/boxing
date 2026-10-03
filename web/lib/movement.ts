// Ranking movement between two consecutive lists of the SAME sanctioning body. Pure.
//
// Entries are matched only on an identity that is not a name: the PropBetEdge fighter (public_id, once identity is
// resolved) or the body's own boxer id printed in both lists (metadata.source_fighter_id, e.g. the WBA's). Printed
// names are never compared. No previous list, or an entry with neither identity, gives null: no movement is shown
// rather than a guessed one.

import type { RankingEntry } from "./types.ts";

export type Move = { kind: "up" | "down"; n: number } | { kind: "same" } | { kind: "new" } | null;

export const numberedEntries = (entries: RankingEntry[] | undefined) =>
  (entries ?? []).filter((e) => !e.metadata?.outside_numbered_list && e.rank_label !== "**");

const identityKey = (x: RankingEntry) => (x.public_id ? `p:${x.public_id}` : x.metadata?.source_fighter_id ? `s:${x.metadata.source_fighter_id}` : null);

export function movement(e: RankingEntry, previous: RankingEntry[] | undefined): Move {
  if (!previous?.length) return null;
  const k = identityKey(e);
  if (!k) return null;
  const was = numberedEntries(previous).find((p) => identityKey(p) === k);
  if (!was) return { kind: "new" };
  const d = was.position - e.position;
  return d > 0 ? { kind: "up", n: d } : d < 0 ? { kind: "down", n: -d } : { kind: "same" };
}
