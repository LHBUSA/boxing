// Network source-brand standard (DATA · PropSports): customer-rendered boxing pages carry no upstream branding.
import test from "node:test";
import assert from "node:assert/strict";
import { scan } from "../../scripts/guard-source-brand.mjs";

test("source-brand guard: web/app, web/components and web/lib are clean", () => {
  assert.deepEqual(scan(), []);
});
