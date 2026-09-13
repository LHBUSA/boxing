#!/usr/bin/env node
// Guarded CLI deploy for the Boxing site (manual fallback; the normal path is Git integration:
// a push to main deploys production, any other branch deploys a preview).
//
//   node scripts/deploy.mjs preview       # preview deployment of the current commit
//   node scripts/deploy.mjs production    # production deployment of project `boxing`
//
// Posture (scripts/posture.mjs): anonymous read-only access + staging data + noindex + no custom
// public domain. Anonymous HTTP 200 on boxing-alpha-beryl.vercel.app is PERMITTED and is not a
// failure. The deploy is refused, or its promotion undone, when posture breaks:
//  before upload  clean tree, HEAD == origin/main, linked project is boxing, static source checks,
//                 no custom domain attached, no Supabase/public-secret env on the project
//  during build   `npm run build` re-runs the static checks and scans the build output for secrets
//  production     deployed with --skip-domain (staged, not serving), then promoted, then the live
//                 alias is probed anonymously; any failure rolls the alias back to the previous
//                 production deployment and exits 1
// Deployments are never deleted by this script.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runPosture } from "./posture.mjs";

const mode = process.argv[2];
if (!["preview", "production"].includes(mode)) { console.error("usage: node scripts/deploy.mjs preview|production"); process.exit(2); }
const SCOPE = "justins-projects-ad4f4bb7";
const ALIAS = "https://boxing-alpha-beryl.vercel.app";
const CLI = ["--yes", "vercel@59.16.0"];
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const vercel = (args) => spawnSync("npx", [...CLI, ...args, "--scope", SCOPE], { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });
const fail = (msg) => { console.error(`\n  DEPLOY REFUSED: ${msg}\n`); process.exit(1); };
const report = (label, { passes, failures }) => {
  console.log(`${label}: ${passes.length} passed, ${failures.length} failed`);
  for (const f of failures) console.error(`  FAIL  ${f}`);
  return failures.length === 0;
};

const project = JSON.parse(readFileSync(new URL("../.vercel/project.json", import.meta.url), "utf8"));
if (project.projectId !== "prj_E9VN82i77FdGzL5fB8lWuTX0y7Jw") fail(`linked project is ${project.projectName} (${project.projectId}), expected boxing (prj_E9VN82i77FdGzL5fB8lWuTX0y7Jw)`);
if (sh("git", ["status", "--porcelain"])) fail("working tree has uncommitted changes");
sh("git", ["fetch", "-q", "origin", "main"]);
const head = sh("git", ["rev-parse", "HEAD"]);
const origin = sh("git", ["rev-parse", "origin/main"]);
if (head !== origin) fail(`HEAD ${head.slice(0, 7)} is not origin/main ${origin.slice(0, 7)}; push first`);
if (!report("preflight posture (static + vercel)", await runPosture(["static", "vercel"]))) fail("posture preflight failed");

const args = ["deploy", "--yes", ...(mode === "production" ? ["--prod", "--skip-domain"] : ["--target", "preview"])];
console.log(`deploying ${head.slice(0, 7)} (${mode})…`);
const run = vercel(args);
const out = `${run.stdout}\n${run.stderr}`;
const url = (out.match(/https:\/\/boxing-[a-z0-9-]+\.vercel\.app/g) ?? [])[0];
if (run.status !== 0 || !url) { console.error(out.slice(-2000)); fail("vercel deploy failed (a posture failure inside `npm run build` also lands here)"); }

if (mode === "preview") {
  // Preview deployment URLs sit behind Vercel Authentication, so the anonymous live probe runs
  // against the production alias only. The build itself already ran static + bundle checks.
  if (!report("post-deploy posture (vercel)", await runPosture(["vercel"]))) fail(`posture failed after preview deploy ${url}`);
  console.log(`ok: ${url} (preview, commit ${head.slice(0, 7)})`);
  process.exit(0);
}

const promote = vercel(["promote", url, "--yes"]);
if (promote.status !== 0) { console.error(`${promote.stdout}\n${promote.stderr}`.slice(-1500)); fail(`staged ${url} but promotion failed; production alias unchanged`); }
let live = false;
for (let i = 0; i < 12 && !live; i++) {
  const res = await fetch(ALIAS, { method: "HEAD" }).catch(() => null);
  live = res?.headers.get("x-boxing-build") === head.slice(0, 12);
  if (!live) await new Promise((r) => setTimeout(r, 10_000));
}
const posture = live ? await runPosture(["vercel", "live"], ALIAS) : { passes: [], failures: [`${ALIAS} never served build ${head.slice(0, 12)}`] };
if (!report("post-promotion posture (vercel + live)", posture)) {
  console.error(`  rolling ${ALIAS} back to the previous production deployment`);
  const rollback = vercel(["rollback", "--yes"]);
  console.error(`${rollback.stdout}\n${rollback.stderr}`.slice(-800));
  fail(`production posture failed for ${url}; alias rolled back (deployment kept for inspection)`);
}
console.log(`ok: ${ALIAS} serves ${head.slice(0, 7)} via ${url}; anonymous read-only, noindex, no custom domain`);
