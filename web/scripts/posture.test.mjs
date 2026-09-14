// Posture model regression tests.
// BUILD MODE (LAUNCH_APPROVED=false): boxing.propbetedge.ai may be attached; discovery must be off.
// LAUNCH MODE (LAUNCH_APPROVED=true): discovery on, launch URLs on the public domain.
// Domain attachment is read only from the Vercel project domain list, never from VERCEL_PROJECT_PRODUCTION_URL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { domainPosture, LAUNCH_APPROVED, readLaunch, runPosture } from "./posture.mjs";

const STALE_ENV = { VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "boxing.propbetedge.ai", POSTURE_QUIET: "1" };
const GENERATED = ["boxing-alpha-beryl.vercel.app", "boxing-justins-projects-ad4f4bb7.vercel.app", "boxing-git-main-justins-projects-ad4f4bb7.vercel.app"];
const NOINDEX = '<html><head><meta name="robots" content="noindex, nofollow"/></head><body>Boxing</body></html>';
const BLOCK = "User-Agent: *\nDisallow: /\n";

function fixtureBuild({ html = NOINDEX, robots = BLOCK } = {}) {
  const web = mkdtempSync(join(tmpdir(), "posture-"));
  mkdirSync(join(web, ".next", "static", "chunks"), { recursive: true });
  mkdirSync(join(web, ".next", "server", "app"), { recursive: true });
  writeFileSync(join(web, ".next", "static", "chunks", "page.js"), "console.log('boxing')");
  writeFileSync(join(web, ".next", "server", "app", "index.html"), html);
  writeFileSync(join(web, ".next", "server", "app", "robots.txt.body"), robots);
  return web;
}
async function bundle(build, { env = {}, launchApproved = false } = {}) {
  const web = fixtureBuild(build);
  try { return await runPosture(["bundle"], undefined, { web, env: { ...STALE_ENV, ...env }, launchApproved }); }
  finally { rmSync(web, { recursive: true, force: true }); }
}
function fakeVercel(domains, envs = [], pagination = { next: null }) {
  return async (path) => {
    if (path.includes("/domains")) return { domains: domains.map((name) => ({ name })), pagination };
    if (path.includes("/env")) return { envs };
    return { name: "boxing", rootDirectory: "web" };
  };
}

test("the committed guard is in build mode and declares its switch in lib/posture.ts", () => {
  const launch = readLaunch();
  assert.equal(launch.declared, true);
  assert.equal(launch.publicUrl, "https://boxing.propbetedge.ai");
  assert.equal(LAUNCH_APPROVED, false);
});

test("build mode: boxing.propbetedge.ai attached is NOT a posture failure", async () => {
  const { failures, passes } = await runPosture(["vercel"], undefined, { api: fakeVercel([...GENERATED, "boxing.propbetedge.ai"]) });
  assert.deepEqual(failures, []);
  assert.ok(passes.some((p) => p.startsWith("attached domains are *.vercel.app or boxing.propbetedge.ai")));
  assert.equal(domainPosture([...GENERATED, "boxing.propbetedge.ai"]).customAttached, true);
});

test("stale VERCEL_PROJECT_PRODUCTION_URL with only *.vercel.app attached: bundle and vercel pass", async () => {
  assert.deepEqual((await bundle({})).failures, []);
  assert.deepEqual((await runPosture(["vercel"], undefined, { api: fakeVercel(GENERATED) })).failures, []);
});

test("an unexpected custom domain fails in any mode", () => {
  assert.equal(domainPosture([...GENERATED, "example.com"]).ok, false);
  assert.equal(domainPosture([...GENERATED, "www.boxing.propbetedge.ai"]).ok, false);
  assert.equal(domainPosture([...GENERATED, "Boxing.PropBetEdge.ai", "Boxing-Alpha-Beryl.VERCEL.APP"]).ok, true);
});

test("an empty or truncated domain list, or an API error, fails closed", async () => {
  assert.ok((await runPosture(["vercel"], undefined, { api: fakeVercel([]) })).failures.some((f) => f.startsWith("complete project domain list")));
  assert.ok((await runPosture(["vercel"], undefined, { api: fakeVercel(GENERATED, [], { next: 1 }) })).failures.some((f) => f.startsWith("complete project domain list")));
  const denied = await runPosture(["vercel"], undefined, { api: async () => { throw new Error("/v9/projects -> 403"); } });
  assert.ok(denied.failures.some((f) => f.startsWith("Vercel API reachable")));
});

test("an env indexing switch on the Vercel project fails (the switch is committed)", async () => {
  const { failures } = await runPosture(["vercel"], undefined, { api: fakeVercel(GENERATED, [{ key: "BOXING_ALLOW_INDEXING", target: ["production"] }]) });
  assert.ok(failures.some((f) => f.startsWith("no env indexing switch on Vercel")));
});

test("build mode bundle fails on any discovery or leak", async () => {
  const cases = [
    [{ html: "<html><head></head><body>no robots meta</body></html>" }, {}, /prerendered pages carry meta robots noindex/],
    [{ html: '<html><head><meta name="robots" content="noindex"/><link rel="canonical" href="https://boxing.propbetedge.ai/"/></head></html>' }, {}, /boxing\.propbetedge\.ai launch URLs in built output/],
    [{ html: '<html><head><meta name="robots" content="noindex"/><link rel="canonical" href="https://boxing-alpha-beryl.vercel.app/x"/></head></html>' }, {}, /no canonical\/og:url in prerendered pages/],
    [{ html: '<html><head><meta name="robots" content="noindex"/><meta property="og:url" content="https://example.com/x"/></head></html>' }, {}, /no canonical\/og:url in prerendered pages/],
    [{ robots: "User-Agent: *\nAllow: /\n" }, {}, /robots\.txt blocks all crawlers/],
    [{ robots: `${BLOCK}\nSitemap: https://boxing.propbetedge.ai/sitemap.xml\n` }, {}, /robots\.txt blocks all crawlers, no sitemap/],
    [{}, { BOXING_ALLOW_INDEXING: "true" }, /no env indexing switch in the build environment/],
    [{}, { SUPABASE_SERVICE_ROLE_KEY: "x" }, /no Supabase\/database credential/],
    [{ html: '<html><head><meta name="robots" content="noindex"/></head><body>BOXING_GATEWAY_TOKEN</body></html>' }, {}, /no secrets in/],
  ];
  for (const [build, env, expected] of cases) {
    const { failures } = await bundle(build, { env });
    assert.ok(failures.some((f) => expected.test(f)), `expected ${expected} in ${JSON.stringify(failures)}`);
  }
});

test("launch mode bundle expects discovery on the public domain, and still refuses leaks", async () => {
  const launchHtml = '<html><head><link rel="canonical" href="https://boxing.propbetedge.ai/fights/x"/></head><body>Boxing</body></html>';
  const allow = "User-Agent: *\nAllow: /\n\nSitemap: https://boxing.propbetedge.ai/sitemap.xml\n";
  assert.deepEqual((await bundle({ html: launchHtml, robots: allow }, { launchApproved: true })).failures, []);
  const stillNoindex = await bundle({ html: NOINDEX, robots: allow }, { launchApproved: true });
  assert.ok(stillNoindex.failures.some((f) => /launch mode: prerendered pages are indexable/.test(f)));
  const blocked = await bundle({ html: launchHtml, robots: BLOCK }, { launchApproved: true });
  assert.ok(blocked.failures.some((f) => /launch mode: built robots\.txt allows crawlers/.test(f)));
  const foreign = await bundle({ html: '<html><head><link rel="canonical" href="https://boxing-alpha-beryl.vercel.app/x"/></head></html>', robots: allow }, { launchApproved: true });
  assert.ok(foreign.failures.some((f) => /canonical\/og:url only on https:\/\/boxing\.propbetedge\.ai/.test(f)));
  const leak = await bundle({ html: `${launchHtml}BOXING_GATEWAY_TOKEN`, robots: allow }, { launchApproved: true });
  assert.ok(leak.failures.some((f) => /no secrets in/.test(f)));
});

test("static posture passes on the committed source in build mode", async () => {
  const { failures } = await runPosture(["static"]);
  assert.deepEqual(failures, []);
});
