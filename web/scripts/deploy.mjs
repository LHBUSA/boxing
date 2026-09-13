#!/usr/bin/env node
// Guarded Vercel deploy for the Boxing site.
//
//   node scripts/deploy.mjs preview      # a preview deployment of the current commit
//   node scripts/deploy.mjs protected    # the project's production target (propbetedge-boxing-web.vercel.app)
//
// Rules enforced before anything is uploaded:
//  - the working tree is clean and HEAD equals origin/main (GitHub is the source of truth)
//  - the Vercel project is the Boxing project
// And after the deploy:
//  - every alias is a *.vercel.app host (no custom domain such as boxing.propbetedge.ai)
//  - the deployment answers anonymous requests with 401/403 or an SSO redirect, never 200
// A failed post-check prints a loud error and removes the deployment it just created.
// Gateway env (BOXING_GATEWAY_URL / BOXING_GATEWAY_TOKEN) is stored on the Vercel project
// for Preview and Production; nothing is passed on the command line.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const mode = process.argv[2];
if (!["preview", "protected"].includes(mode)) { console.error("usage: node scripts/deploy.mjs preview|protected"); process.exit(2); }
const SCOPE = "justins-projects-ad4f4bb7";
const CLI = ["--yes", "vercel@59.16.0"];
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const fail = (msg) => { console.error(`\n  DEPLOY REFUSED: ${msg}\n`); process.exit(1); };

const project = JSON.parse(readFileSync(new URL("../.vercel/project.json", import.meta.url), "utf8"));
if (project.projectName !== "propbetedge-boxing-web") fail(`linked project is ${project.projectName}, expected propbetedge-boxing-web`);
if (sh("git", ["status", "--porcelain"])) fail("working tree has uncommitted changes");
sh("git", ["fetch", "-q", "origin", "main"]);
const head = sh("git", ["rev-parse", "HEAD"]);
const origin = sh("git", ["rev-parse", "origin/main"]);
if (head !== origin) fail(`HEAD ${head.slice(0, 7)} is not origin/main ${origin.slice(0, 7)}; push first`);

const args = ["deploy", "--yes", "--scope", SCOPE, ...(mode === "protected" ? ["--prod"] : ["--target", "preview"])];
console.log(`deploying ${head.slice(0, 7)} (${mode})…`);
const run = spawnSync("npx", [...CLI, ...args], { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });
const out = `${run.stdout}\n${run.stderr}`;
const url = (out.match(/https:\/\/propbetedge-boxing-[a-z0-9-]+\.vercel\.app/g) ?? [])[0];
if (run.status !== 0 || !url) { console.error(out.slice(-2000)); fail("vercel deploy failed"); }

const inspect = spawnSync("npx", [...CLI, "inspect", url, "--scope", SCOPE], { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });
const aliases = [...`${inspect.stdout}\n${inspect.stderr}`.matchAll(/https:\/\/([a-z0-9.-]+)/g)].map((m) => m[1]);
const custom = aliases.filter((h) => !h.endsWith(".vercel.app"));
const res = await fetch(url, { redirect: "manual" });
const isProtected = [401, 403].includes(res.status) || (res.status >= 300 && res.status < 400 && /vercel\.com\/(login|sso)|_vercel_sso/.test(res.headers.get("location") ?? ""));
if (custom.length || !isProtected) {
  console.error(`  post-check failed: status=${res.status} custom=${custom.join(",") || "none"}; removing ${url}`);
  spawnSync("npx", [...CLI, "remove", url, "--yes", "--scope", SCOPE], { shell: true, stdio: "inherit" });
  fail("deployment was reachable publicly or carried a custom domain");
}
console.log(`ok: ${url}\n  commit ${head.slice(0, 7)} · anonymous status ${res.status} (protected) · aliases ${aliases.filter((h) => h.endsWith(".vercel.app")).join(", ")}`);
