#!/usr/bin/env node
// After a push to main: wait for Vercel's native deployment to serve this commit on boxing.propbetedge.ai
// (X-Boxing-Build header), then run the anonymous live posture probe against it.
//
//   node scripts/verify-live.mjs [baseUrl]        (npm run verify:live)

import { execFileSync } from "node:child_process";
import { LAUNCH_APPROVED, LIVE_BASE, runPosture } from "./posture.mjs";

const base = (process.argv[2] ?? LIVE_BASE).replace(/\/$/, "");
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const want = head.slice(0, 12);
let got = null;
for (let i = 0; i < 60; i++) {
  const res = await fetch(`${base}/`, { method: "HEAD", redirect: "manual" }).catch(() => null);
  got = res?.headers.get("x-boxing-build") ?? null;
  if (got === want) break;
  if (i === 0) console.log(`waiting for ${base} to serve ${want} (now ${got ?? "unknown"})…`);
  await new Promise((r) => setTimeout(r, 15_000));
}
if (got !== want) {
  console.error(`${base} still serves ${got ?? "unknown"}, not ${want}: a newer push, or the Vercel build failed (posture failures fail the build)`);
  process.exit(1);
}
console.log(`${base} serves ${want}; live posture (${LAUNCH_APPROVED ? "launch" : "build"} mode)`);
const { passes, failures } = await runPosture(["live"], base);
for (const f of failures) console.error(`  FAIL  ${f}`);
console.log(`posture live: ${passes.length} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
