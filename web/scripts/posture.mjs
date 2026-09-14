#!/usr/bin/env node
// Boxing deployment posture guard.
//
// Allowed posture until the owner approves a public launch:
//   anonymous read-only access + staging data + noindex + no custom public domain.
// Anonymous HTTP 200 on the *.vercel.app alias is PERMITTED. What is refused:
//   - boxing.propbetedge.ai (or any non-*.vercel.app domain) attached to project `boxing`
//   - robots.txt that does not block every crawler, or a sitemap
//   - pages without <meta name="robots" content="noindex, nofollow">, or responses without X-Robots-Tag
//   - canonical / og:url / metadata advertising boxing.propbetedge.ai
//   - BOXING_GATEWAY_TOKEN (name or value) or any secret pattern in client JS, HTML or responses
//   - a Supabase URL/key in the web runtime, or web code reaching Supabase instead of the gateway
//   - a mutation surface: route handlers exporting POST/PUT/PATCH/DELETE, server actions,
//     or a write endpoint that answers anonymously
//
//   node scripts/posture.mjs static            source checks (run before every build)
//   node scripts/posture.mjs bundle            scan .next output after `next build`
//   node scripts/posture.mjs live <baseUrl>    probe a running deployment (anonymous)
//   node scripts/posture.mjs vercel            project domains + env key names via the Vercel API
//
// Every mode exits 1 on any failure. `npm run build` runs static + bundle, so a Vercel build
// that breaks posture fails and is never promoted.
//
// Authority: whether a domain is ATTACHED is answered only by the Vercel project domain list
// (`vercel` mode, /v9/projects/:id/domains). The build-time system variable
// VERCEL_PROJECT_PRODUCTION_URL is not evidence: Vercel kept injecting boxing.propbetedge.ai
// after the domain was detached (2026-09-14). The bundle mode checks what a build can know:
// its own output (no custom domain, noindex on every prerendered page, robots blocking, no
// foreign canonical/og:url, no secrets) and that indexing is not switched on in its environment.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WEB = fileURLToPath(new URL("..", import.meta.url));
const PROJECT_ID = "prj_E9VN82i77FdGzL5fB8lWuTX0y7Jw";
const TEAM_ID = "team_fNvGcQj9hijhsrIMDZbv0DJQ";
const GATEWAY = "https://boxing-gateway-staging.sales-fd3.workers.dev";
const CUSTOM_DOMAIN = "boxing.propbetedge.ai";
// Public launch is an owner decision recorded here in a reviewed commit (never an env flag a build
// could inherit). Until then any non-*.vercel.app domain attached to the project fails `vercel`.
export const LAUNCH_APPROVED = false;

const failures = [];
const passes = [];
const check = (ok, label, detail = "") => { (ok ? passes : failures).push(detail ? `${label}: ${detail}` : label); return ok; };

// Secret patterns that must never reach a browser. Names are included: a client bundle that
// even mentions the token variable means server-only code leaked into it.
const SECRET_PATTERNS = [
  [/BOXING_GATEWAY_TOKEN/, "BOXING_GATEWAY_TOKEN name"],
  [/BOXING_GATEWAY_URL/, "BOXING_GATEWAY_URL name"],
  [/boxing-gateway-staging/, "gateway host"],
  [/service_role/i, "service_role"],
  [/SUPABASE_[A-Z_]*KEY/, "Supabase key variable"],
  [/[a-z0-9]{20}\.supabase\.co/, "Supabase project URL"],
  [/wpaxofilvbsjyrxrwjhg/, "staging Supabase ref"],
  [/sb_secret_[A-Za-z0-9_-]{10,}/, "Supabase secret key"],
  [/eyJhbGciOi[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/, "JWT"],
  [/VERCEL_OIDC_TOKEN/, "Vercel OIDC token name"],
];

function secretValues() {
  const values = new Set();
  if (process.env.BOXING_GATEWAY_TOKEN) values.add(process.env.BOXING_GATEWAY_TOKEN.trim());
  const file = "D:/Workers/secrets/boxing-gateway-staging-internal-token";
  try { if (existsSync(file)) values.add(readFileSync(file, "utf8").trim()); } catch { /* not on this machine */ }
  try {
    const env = readFileSync(join(WEB, ".env.local"), "utf8");
    for (const m of env.matchAll(/^(BOXING_GATEWAY_TOKEN|VERCEL_OIDC_TOKEN)=["']?([^"'\r\n]+)/gm)) values.add(m[2].trim());
  } catch { /* no local env */ }
  return [...values].filter((v) => v.length >= 16);
}

function scanText(text, where, values) {
  const hits = SECRET_PATTERNS.filter(([re]) => re.test(text)).map(([, name]) => name);
  if (values.some((v) => text.includes(v))) hits.push("secret VALUE");
  return hits.map((h) => `${h} in ${where}`);
}

function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!["node_modules", ".next", "qa"].includes(name)) walk(p, filter, out); }
    else if (filter(p)) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------- static
function staticChecks() {
  const src = (p) => readFileSync(join(WEB, p), "utf8");
  const code = [...walk(join(WEB, "app"), (p) => /\.(tsx?|mjs|js)$/.test(p)), ...walk(join(WEB, "components"), (p) => /\.(tsx?|mjs|js)$/.test(p)), ...walk(join(WEB, "lib"), (p) => /\.(tsx?|mjs|js)$/.test(p))];
  const rel = (p) => relative(WEB, p).replaceAll("\\", "/");

  const posture = src("lib/posture.ts");
  check(/VERCEL_ENV === "production" && process\.env\.BOXING_ALLOW_INDEXING === "true" && Boolean\(process\.env\.BOXING_PUBLIC_URL\)/.test(posture), "indexing requires production + BOXING_ALLOW_INDEXING=true + BOXING_PUBLIC_URL");
  check(!/propbetedge\.ai/.test(posture), "posture has no hardcoded public domain");
  check(/robots: INDEXABLE \? undefined : \{ index: false, follow: false \}/.test(src("app/layout.tsx")), "layout sets noindex, nofollow unless indexable");
  check(/if \(INDEXABLE\)/.test(src("app/robots.ts")) && /disallow: "\/"/.test(src("app/robots.ts")), "robots.ts disallows all unless indexable");
  const nextConfig = src("next.config.ts");
  check(/indexable \? \[\] : \[\{ key: "X-Robots-Tag", value: "noindex, nofollow" \}\]/.test(nextConfig), "next.config sends X-Robots-Tag unless indexable");
  check(!code.some((p) => /(^|\/)sitemap\.(ts|tsx|js|xml)$/.test(rel(p))), "no sitemap route");

  const customRefs = code.filter((p) => !rel(p).endsWith("lib/posture.ts") && src(rel(p)).includes(CUSTOM_DOMAIN)).map(rel);
  check(!customRefs.length, `no source references ${CUSTOM_DOMAIN}`, customRefs.join(", "));
  const rawCanonical = code.filter((p) => /canonical:\s*[a-zA-Z`"]/.test(src(rel(p))) && !rel(p).endsWith("lib/posture.ts")).map(rel);
  check(!rawCanonical.length, "canonical URLs only through lib/posture canonical()", rawCanonical.join(", "));
  const ogUrl = code.filter((p) => /openGraph:\s*\{[^}]*\burl:/.test(src(rel(p)))).map(rel);
  check(!ogUrl.length, "no hardcoded og:url", ogUrl.join(", "));

  const gateway = src("lib/gateway.ts");
  check(/^import "server-only";/m.test(gateway), "lib/gateway.ts is server-only");
  const tokenUsers = code.filter((p) => src(rel(p)).includes("BOXING_GATEWAY_TOKEN")).map(rel);
  check(tokenUsers.length === 1 && tokenUsers[0] === "lib/gateway.ts", "BOXING_GATEWAY_TOKEN read only in lib/gateway.ts", tokenUsers.join(", "));
  const clientGateway = code.filter((p) => /^["']use client["']/m.test(src(rel(p))) && /@\/lib\/gateway|from "\.\.?\/.*gateway"/.test(src(rel(p)))).map(rel);
  check(!clientGateway.length, "no client component imports the gateway", clientGateway.join(", "));
  check(!/\bmethod\s*:/.test(gateway) && (gateway.match(/\bfetch\(/g) ?? []).length === 1 && !/\bbody\s*:/.test(gateway), "gateway client has one fetch, GET only (no method, no body)");
  const gatewayPaths = [...gateway.matchAll(/\bread<[^>]+>\(\s*[`"]([^`"$?]+)/g)].map((m) => m[1]);
  check(gatewayPaths.length > 0 && gatewayPaths.every((p) => p.startsWith("site/")), `gateway client calls only /internal/v1/site/* read routes (${gatewayPaths.length})`, gatewayPaths.filter((p) => !p.startsWith("site/")).join(", "));
  const fetchers = code.filter((p) => !rel(p).endsWith("lib/gateway.ts") && /\bfetch\(/.test(src(rel(p)))).map(rel);
  check(!fetchers.length, "no other server or client fetch in app code", fetchers.join(", "));

  const publicEnv = code.flatMap((p) => [...src(rel(p)).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)].map((m) => `${m[0]} (${rel(p)})`));
  check(!publicEnv.some((e) => /TOKEN|KEY|SECRET|SUPABASE|GATEWAY/.test(e)), "no NEXT_PUBLIC_ secret or gateway variables", publicEnv.join(", "));
  const supa = code.filter((p) => /supabase/i.test(src(rel(p)).replace(/\/\/.*$/gm, ""))).map(rel);
  const pkg = src("package.json");
  check(!supa.length && !/supabase/i.test(pkg), "web has no Supabase client or reference (gateway only)", supa.join(", "));

  const handlers = code.filter((p) => /(^|\/)route\.(ts|js|mjs)$/.test(rel(p)) && /export\s+(async\s+)?(function|const)\s+(POST|PUT|PATCH|DELETE)\b/.test(src(rel(p)))).map(rel);
  check(!handlers.length, "no mutation route handlers", handlers.join(", "));
  const actions = code.filter((p) => /^\s*["']use server["']/m.test(src(rel(p)))).map(rel);
  check(!actions.length, "no server actions", actions.join(", "));
  const vercelIgnore = existsSync(join(WEB, ".vercelignore")) ? src(".vercelignore") : "";
  check(/\.env\*\.local/.test(vercelIgnore) && /^\.env$/m.test(vercelIgnore), ".vercelignore excludes local env files");
}

// ---------------------------------------------------------------- bundle
function bundleChecks({ web = WEB, env = process.env } = {}) {
  const next = join(web, ".next");
  if (!check(existsSync(join(next, "static")), ".next/static exists (run after next build)")) return;
  const values = secretValues();
  const clientFiles = walk(join(next, "static"), (p) => /\.(js|css|json|txt|html)$/.test(p));
  // Prerendered HTML / RSC payloads are served to browsers too.
  const served = walk(join(next, "server", "app"), (p) => /\.(html|rsc|body|meta)$/.test(p));
  const hits = [];
  for (const f of [...clientFiles, ...served]) hits.push(...scanText(readFileSync(f, "utf8"), relative(web, f).replaceAll("\\", "/"), values));
  check(!hits.length, `no secrets in ${clientFiles.length} client assets + ${served.length} prerendered payloads${values.length ? " (token value checked)" : ""}`, hits.slice(0, 20).join("; "));
  const custom = [...clientFiles, ...served].filter((f) => readFileSync(f, "utf8").includes(CUSTOM_DOMAIN)).map((f) => relative(web, f));
  check(!custom.length, `no ${CUSTOM_DOMAIN} in built output`, custom.slice(0, 10).join(", "));

  // Prerendered pages carry the robots policy, and advertise no URL outside *.vercel.app.
  const html = served.filter((f) => f.endsWith(".html"));
  const unindexed = html.filter((f) => {
    const metas = [...readFileSync(f, "utf8").matchAll(/<meta name="robots" content="([^"]+)"/g)].map((m) => m[1]);
    return !metas.length || !metas.every((c) => /noindex/.test(c));
  }).map((f) => relative(web, f));
  check(html.length > 0 && !unindexed.length, `${html.length} prerendered pages carry meta robots noindex`, unindexed.slice(0, 10).join(", "));
  const foreign = html.flatMap((f) => [...readFileSync(f, "utf8").matchAll(/<(?:link rel="canonical" href|meta property="og:url" content)="(https?:\/\/[^/"]+)/g)]
    .map((m) => m[1]).filter((u) => !/\.vercel\.app$/.test(u) && !/^https?:\/\/localhost(:\d+)?$/.test(u)).map((u) => `${u} (${relative(web, f)})`));
  check(!foreign.length, "no canonical/og:url outside *.vercel.app in prerendered pages", foreign.slice(0, 10).join(", "));
  const robotsBody = join(next, "server", "app", "robots.txt.body");
  const robots = existsSync(robotsBody) ? readFileSync(robotsBody, "utf8").replace(/\r/g, "") : "";
  check(/User-Agent: \*\nDisallow: \/\n?/i.test(robots) && !/^Allow:/im.test(robots) && !/Sitemap:/i.test(robots), "built robots.txt blocks all crawlers, no sitemap", JSON.stringify(robots.slice(0, 80)));

  const envNames = Object.keys(env).filter((k) => /SUPABASE|SERVICE_ROLE|DATABASE_URL|POSTGRES/i.test(k));
  check(!envNames.length, "no Supabase/database credential in the build/runtime environment", envNames.join(", "));
  const indexing = ["BOXING_ALLOW_INDEXING", "BOXING_PUBLIC_URL"].filter((k) => env[k]);
  check(!indexing.length, "indexing is not enabled in the build environment (BOXING_ALLOW_INDEXING / BOXING_PUBLIC_URL unset)", indexing.join(", "));
  // VERCEL_PROJECT_PRODUCTION_URL is reported, never trusted: domain attachment is decided by `vercel` mode.
  if (env.VERCEL && env.VERCEL_PROJECT_PRODUCTION_URL && !env.POSTURE_QUIET) console.log(`  note  VERCEL_PROJECT_PRODUCTION_URL=${env.VERCEL_PROJECT_PRODUCTION_URL} (informational; attachment is checked against the Vercel project domain list)`);
}

// ---------------------------------------------------------------- live
async function liveChecks(base) {
  base = base.replace(/\/$/, "");
  const values = secretValues();
  const get = async (path, init = {}) => {
    const res = await fetch(base + path, { redirect: "manual", ...init, headers: { "user-agent": "boxing-posture-check", ...(init.headers ?? {}) } });
    return { res, body: await res.text() };
  };

  const robots = await get("/robots.txt");
  const rb = robots.body.replace(/\r/g, "");
  check(robots.res.status === 200 && /User-Agent: \*\nDisallow: \/\n?/i.test(rb) && !/^Allow:/im.test(rb) && !/Sitemap:/i.test(rb), "robots.txt blocks all crawlers, no sitemap", JSON.stringify(rb.slice(0, 120)));
  const sitemap = await get("/sitemap.xml");
  check(sitemap.res.status === 404 || /noindex/.test(sitemap.res.headers.get("x-robots-tag") ?? ""), "sitemap.xml absent or noindex", `status ${sitemap.res.status}`);

  const home = await get("/");
  const discovered = [...new Set([...home.body.matchAll(/href="(\/(?:fights|events|fighters|scorecards|officials|promoters)\/[a-z0-9-]+)"/g)].map((m) => m[1]))];
  const pick = (prefix) => discovered.find((h) => h.startsWith(prefix));
  const pages = ["/", "/fight-week", "/events", "/fighters", "/scorecards", "/officials", "/titles", "/rankings", "/promoters", "/methodology", "/this-page-does-not-exist",
    pick("/fights/"), pick("/events/"), pick("/fighters/"), pick("/scorecards/"), pick("/officials/")].filter(Boolean);
  const assets = new Set();
  for (const path of pages) {
    const { res, body } = path === "/" ? home : await get(path);
    const robotsMeta = [...body.matchAll(/<meta name="robots" content="([^"]+)"/g)].map((m) => m[1]);
    check(robotsMeta.length > 0 && robotsMeta.every((c) => /noindex/.test(c)) && robotsMeta.some((c) => /nofollow/.test(c)), `${path} ${res.status} meta robots noindex, nofollow`, robotsMeta.join(" | ") || "missing");
    check(/noindex/.test(res.headers.get("x-robots-tag") ?? "") && /nofollow/.test(res.headers.get("x-robots-tag") ?? ""), `${path} X-Robots-Tag noindex, nofollow`, res.headers.get("x-robots-tag") ?? "missing");
    check(!body.includes(CUSTOM_DOMAIN), `${path} does not mention ${CUSTOM_DOMAIN}`, (body.match(new RegExp(`.{60}${CUSTOM_DOMAIN.replace(/\./g, "\\.")}.{20}`)) ?? [""])[0]);
    const canon = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    check(!canon || /\.vercel\.app\//.test(canon), `${path} canonical absent or *.vercel.app`, canon ?? "");
    const hits = scanText(body + JSON.stringify([...res.headers]), `${path} response`, values);
    check(!hits.length, `${path} response has no secrets`, hits.join("; "));
    for (const m of body.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+\.(?:js|css))(?:\?[^"]*)?"/g)) assets.add(m[1]);
  }

  const assetHits = [];
  for (const a of assets) { const { body } = await get(a); assetHits.push(...scanText(body, a, values)); if (body.includes(CUSTOM_DOMAIN)) assetHits.push(`${CUSTOM_DOMAIN} in ${a}`); }
  check(assets.size > 0 && !assetHits.length, `${assets.size} browser JS/CSS bundles have no secrets or gateway references${values.length ? " (token value checked)" : ""}`, assetHits.slice(0, 10).join("; "));

  // Read-only: nothing on the site answers a write, and no API surface exists.
  const writeTargets = ["/", "/api", "/api/admin", "/api/reviews", "/admin", pick("/fights/") ?? "/fights/x"];
  for (const path of writeTargets) for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const { res, body } = await get(path, { method, body: method === "DELETE" ? undefined : "{}", headers: { "content-type": "application/json" } });
    // Next renders a dynamic page for any method when no route handler or server action exists: the
    // same read-only HTML as GET, with nothing written. A write endpoint would answer with anything else.
    const readOnlyRender = /^\/(fights|events|fighters)\//.test(path) && res.status === 200 && /text\/html/.test(res.headers.get("content-type") ?? "") && /<meta name="robots" content="noindex/.test(body);
    check(res.status >= 400 || readOnlyRender, `${method} ${path} is not a write endpoint`, `status ${res.status}${readOnlyRender ? " (page render)" : ""}`);
  }
  const action = await get("/", { method: "POST", headers: { "next-action": "0".repeat(40), "content-type": "text/plain;charset=UTF-8" }, body: "[]" });
  check(action.res.status >= 400 || !/^0:/.test(action.body), "no server action accepts an anonymous call", `status ${action.res.status}`);

  // The browser cannot reach staging data or admin functions directly: the gateway demands a bearer token.
  for (const [method, path] of [["GET", "/internal/v1/site/home"], ["GET", "/internal/v1/reviews"], ["POST", "/internal/v1/reviews/decide"], ["POST", "/internal/v1/identity/decisions"]]) {
    const res = await fetch(GATEWAY + path, { method, redirect: "manual", headers: { "content-type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    check([401, 403].includes(res.status), `gateway ${method} ${path} refuses anonymous`, `status ${res.status}`);
  }
  return base;
}

// ---------------------------------------------------------------- vercel
// Pure decision over the project's CURRENT domain list (the only authority for attachment).
export function domainAttachment(names, launchApproved = LAUNCH_APPROVED) {
  const custom = names.filter((n) => !String(n).toLowerCase().endsWith(".vercel.app"));
  const unapproved = custom.filter((n) => !(launchApproved && n === CUSTOM_DOMAIN));
  return { custom, unapproved, ok: unapproved.length === 0 };
}

function vercelApi() {
  let token = process.env.VERCEL_TOKEN;
  if (!token) {
    const auth = join(process.env.APPDATA ?? "", "com.vercel.cli", "Data", "auth.json");
    try { token = JSON.parse(readFileSync(auth, "utf8")).token; } catch { /* none */ }
  }
  if (!token) return null;
  return async (path) => {
    const res = await fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return res.json();
  };
}

async function vercelChecks({ api = vercelApi(), launchApproved = LAUNCH_APPROVED } = {}) {
  if (!check(Boolean(api), "Vercel API token available (VERCEL_TOKEN or CLI login)")) return;
  const project = await api(`/v9/projects/${PROJECT_ID}`);
  check(project.name === "boxing" && project.rootDirectory === "web", "project is boxing with root web", `${project.name} root=${project.rootDirectory}`);
  const page = await api(`/v9/projects/${PROJECT_ID}/domains?limit=100`);
  const names = (page.domains ?? []).map((d) => d.name);
  // Fail closed when the list is empty or truncated: an unread page could hold a custom domain.
  check(names.length > 0 && !page.pagination?.next, "complete project domain list read from the Vercel API", `${names.length} domains${page.pagination?.next ? ", more pages" : ""}`);
  const attach = domainAttachment(names, launchApproved);
  check(attach.ok, `no custom domain attached to project boxing${launchApproved ? " (launch approved for " + CUSTOM_DOMAIN + ")" : " (launch not approved)"}`, `domains: ${names.join(", ")}`);
  const { envs } = await api(`/v10/projects/${PROJECT_ID}/env`);
  const keys = envs.map((e) => e.key); // names only; values are never requested
  const bad = keys.filter((k) => /SUPABASE|SERVICE_ROLE|DATABASE_URL|POSTGRES/i.test(k) || (/^NEXT_PUBLIC_/.test(k) && /TOKEN|KEY|SECRET|GATEWAY/.test(k)));
  check(!bad.length, "Vercel env has no Supabase/database credential and no public secret", `keys: ${[...new Set(keys)].join(", ")}`);
  const indexing = envs.filter((e) => e.key === "BOXING_ALLOW_INDEXING" || e.key === "BOXING_PUBLIC_URL").map((e) => `${e.key}[${e.target}]`);
  check(!indexing.length, "indexing is not enabled on Vercel (BOXING_ALLOW_INDEXING / BOXING_PUBLIC_URL unset)", indexing.join(", "));
}

// ---------------------------------------------------------------- main
// opts (tests): { web, env } for bundle, { api, launchApproved } for vercel.
export async function runPosture(modes, base, opts = {}) {
  failures.length = 0; passes.length = 0;
  for (const mode of modes) {
    if (mode === "static") staticChecks();
    else if (mode === "bundle") bundleChecks(opts);
    else if (mode === "live") await liveChecks(base);
    else if (mode === "vercel") await vercelChecks(opts);
  }
  return { passes: [...passes], failures: [...failures] };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [mode, base] = process.argv.slice(2);
  const modes = mode === "all" ? ["static", "vercel", "live"] : [mode];
  if (!["static", "bundle", "live", "vercel", "all"].includes(mode) || ((mode === "live" || mode === "all") && !base)) {
    console.error("usage: node scripts/posture.mjs static | bundle | vercel | live <baseUrl> | all <baseUrl>");
    process.exit(2);
  }
  const { passes: ok, failures: bad } = await runPosture(modes, base);
  if (!process.env.POSTURE_QUIET) for (const p of ok) console.log(`  pass  ${p}`);
  for (const f of bad) console.error(`  FAIL  ${f}`);
  console.log(`posture ${modes.join("+")}: ${ok.length} passed, ${bad.length} failed`);
  process.exit(bad.length ? 1 : 0);
}
