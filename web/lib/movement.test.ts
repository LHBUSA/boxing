import { test } from "node:test";
import assert from "node:assert/strict";
import { movement } from "./movement.ts";
import type { RankingEntry } from "./types.ts";

const e = (position: number, over: Partial<RankingEntry> & { sid?: string | null } = {}): RankingEntry => {
  const { sid = null, ...rest } = over;
  return { position, rank: position, rank_label: String(position), public_id: null, display_name: null, source_name: `NAME ${position}`, designation: null,
    mandatory: null, is_vacant: false, is_champion: false, metadata: { source_fighter_id: sid }, ...rest };
};

test("movement uses the body's own boxer id when no PropBetEdge fighter is resolved", () => {
  const prev = [e(1, { sid: "100" }), e(2, { sid: "200" }), e(3, { sid: "300" })];
  assert.deepEqual(movement(e(1, { sid: "200" }), prev), { kind: "up", n: 1 });
  assert.deepEqual(movement(e(3, { sid: "100" }), prev), { kind: "down", n: 2 });
  assert.deepEqual(movement(e(3, { sid: "300" }), prev), { kind: "same" });
  assert.deepEqual(movement(e(4, { sid: "999" }), prev), { kind: "new" });
});

test("no identity or no previous list gives no movement; printed names are never compared", () => {
  const prev = [e(1, { source_name: "SAME NAME" }), e(2)];
  assert.equal(movement(e(2, { source_name: "SAME NAME" }), prev), null, "same printed name, no id: never matched");
  assert.equal(movement(e(1, { sid: "100" }), []), null);
  assert.equal(movement(e(1, { sid: "100" }), undefined), null);
  // a resolved PropBetEdge fighter takes precedence over the body id
  assert.deepEqual(movement(e(2, { public_id: "pbe_boxer_x", sid: "1" }), [e(5, { public_id: "pbe_boxer_x", sid: "2" })]), { kind: "up", n: 3 });
});
