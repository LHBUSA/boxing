// Regression: domain attachment is decided by the Vercel project domain list, never by the
// build-time VERCEL_PROJECT_PRODUCTION_URL system variable (which Vercel kept pointing at
// boxing.propbetedge.ai after the domain was detached on 2026-09-14).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { domainAttachment, LAUNCH_APPROVED, runPosture } from "./posture.mjs";

const STALE_ENV = { VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "boxing.propbetedge.ai", POSTURE_QUIET: "1" };
const GENERATED = ["boxing-alpha-beryl.vercel.app", "boxing-justins-projects-ad4f4bb7.vercel.app", "boxing-git-main-justins-projects-ad4f4bb7.vercel.app"];

function fixtureBuild({ html = '<html><head><meta name="robots" content="noindex, nofollow"/></head><body>Boxing</body></html>', robots = "User-Agent: *\nDisallow: /\n" } = {}) {
  const web = mkdtempSync(join(tmpdir(), "posture-"));
  mkdirSync(join(web, ".next", "static", "chunks"), { recursive: true });
  mkdirSync(join(web, ".next", "server", "app"), { recursive: true });
  writeFileSync(join(web, ".next", "static", "chunks", "page.js"), "console.log('boxing')");
  writeFileSync(join(web, ".next", "server", "app", "index.html"), html);
  writeFileSync(join(web, ".next", "server", "app", "robots.txt.body"), robots);
  return web;
}

function fakeVercel(domains, envs = []) {
  return async (path) => {
    if (path.includes("/domains")) return { domains: domains.map((name) => ({ name })), pagination: { next: null } };
    if (path.includes("/env")) return { envs };
    return { name: "boxing", rootDirectory: "web" };
  };
}

test("launch is not approved in the committed guard", () => {
  assert.equal(LAUNCH_APPROVED, false);
});

test("stale VERCEL_PROJECT_PRODUCTION_URL with only *.vercel.app attached: bundle passes", async () => {
  const web = fixtureBuild();
  try {
    const { failures } = await runPosture(["bundle"], undefined, { web, env: STALE_ENV });
    assert.deepEqual(failures, []);
  } finally { rmSync(web, { recursive: true, force: true }); }
});

test("stale VERCEL_PROJECT_PRODUCTION_URL with only *.vercel.app attached: vercel posture passes", async () => {
  const { failures, passes } = await runPosture(["vercel"], undefined, { api: fakeVercel(GENERATED), launchApproved: false });
  assert.deepEqual(failures, []);
  assert.ok(passes.some((p) => p.startsWith("no custom domain attached")));
});

test("boxing.propbetedge.ai actually attached without launch approval: vercel posture fails", async () => {
  const { failures } = await runPosture(["vercel"], undefined, { api: fakeVercel([...GENERATED, "boxing.propbetedge.ai"]), launchApproved: false });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /no custom domain attached.*boxing\.propbetedge\.ai/);
});

test("any other non-*.vercel.app domain fails, even with launch approval for boxing.propbetedge.ai", () => {
  assert.equal(domainAttachment([...GENERATED, "example.com"], false).ok, false);
  assert.equal(domainAttachment([...GENERATED, "www.boxing.propbetedge.ai"], true).ok, false);
  assert.equal(domainAttachment([...GENERATED, "Boxing-Alpha-Beryl.VERCEL.APP"], false).ok, true);
});

test("an empty or truncated domain list fails closed", async () => {
  const empty = await runPosture(["vercel"], undefined, { api: fakeVercel([]) });
  assert.ok(empty.failures.some((f) => f.startsWith("complete project domain list")));
  const truncated = await runPosture(["vercel"], undefined, {
    api: async (path) => (path.includes("/domains") ? { domains: GENERATED.map((name) => ({ name })), pagination: { next: 1 } } : path.includes("/env") ? { envs: [] } : { name: "boxing", rootDirectory: "web" }),
  });
  assert.ok(truncated.failures.some((f) => f.startsWith("complete project domain list")));
});

test("indexing env on the Vercel project fails vercel posture", async () => {
  const { failures } = await runPosture(["vercel"], undefined, { api: fakeVercel(GENERATED, [{ key: "BOXING_ALLOW_INDEXING", target: ["production"] }]) });
  assert.ok(failures.some((f) => f.startsWith("indexing is not enabled on Vercel")));
});

test("bundle still fails on build-knowable posture breaks", async () => {
  const cases = [
    [{ html: '<html><head></head><body>no robots meta</body></html>' }, {}, /prerendered pages carry meta robots noindex/],
    [{ html: '<html><head><meta name="robots" content="noindex"/><link rel="canonical" href="https://boxing.propbetedge.ai/"/></head></html>' }, {}, /boxing\.propbetedge\.ai in built output/],
    [{ html: '<html><head><meta name="robots" content="noindex"/><meta property="og:url" content="https://example.com/x"/></head></html>' }, {}, /no canonical\/og:url outside/],
    [{ robots: "User-Agent: *\nAllow: /\n" }, {}, /built robots\.txt blocks all crawlers/],
    [{}, { BOXING_ALLOW_INDEXING: "true" }, /indexing is not enabled in the build environment/],
    [{}, { SUPABASE_SERVICE_ROLE_KEY: "x" }, /no Supabase\/database credential/],
    [{ html: '<html><head><meta name="robots" content="noindex"/></head><body>BOXING_GATEWAY_TOKEN</body></html>' }, {}, /no secrets in/],
  ];
  for (const [build, env, expected] of cases) {
    const web = fixtureBuild(build);
    try {
      const { failures } = await runPosture(["bundle"], undefined, { web, env: { ...STALE_ENV, ...env } });
      assert.ok(failures.some((f) => expected.test(f)), `expected ${expected} in ${JSON.stringify(failures)}`);
    } finally { rmSync(web, { recursive: true, force: true }); }
  }
});
