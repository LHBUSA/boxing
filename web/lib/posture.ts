// Boxing launch posture. ONE switch, committed here by owner decision (never an env flag).
//
// BUILD MODE (LAUNCH_APPROVED = false): boxing.propbetedge.ai is the build surface. Every main push is
// visible there, anonymously and read-only, but nothing invites discovery: noindex, nofollow on every
// page and response, robots.txt blocks every crawler, no sitemap, no IndexNow, no canonical or og:url,
// and metadata URLs never name the public domain.
//
// LAUNCH MODE (LAUNCH_APPROVED = true, production deployments only): index/follow, sitemap, IndexNow and
// canonical/OG URLs on PUBLIC_URL.
//
// The switch controls indexing and public discovery. It does not control which domains are attached.
// scripts/posture.mjs reads these declarations from this file and enforces the matching mode.

export const LAUNCH_APPROVED: boolean = false;
export const PUBLIC_URL = "https://boxing.propbetedge.ai";

export const INDEXABLE = LAUNCH_APPROVED && process.env.VERCEL_ENV === "production";

// Absolute base for metadata (OG images). Build mode never uses the public domain.
export const BASE_URL = INDEXABLE
  ? PUBLIC_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3400";

export const canonical = (path: string): { canonical: string } | undefined => (INDEXABLE ? { canonical: path } : undefined);
