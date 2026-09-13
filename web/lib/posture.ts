// Deployment posture: preview-only until the owner approves a public launch.
//
// Allowed preview posture: anonymous read-only access + staging data + noindex +
// no custom public domain. The site becomes indexable ONLY when all three hold:
// VERCEL_ENV=production, BOXING_ALLOW_INDEXING=true and BOXING_PUBLIC_URL set.
// Until then nothing advertises the custom domain (no canonical, no og:url,
// no metadataBase pointing at it), robots.txt blocks everything, every response
// carries X-Robots-Tag: noindex, nofollow and every page has a noindex meta tag.

export const INDEXABLE =
  process.env.VERCEL_ENV === "production" && process.env.BOXING_ALLOW_INDEXING === "true" && Boolean(process.env.BOXING_PUBLIC_URL);

export const BASE_URL = INDEXABLE
  ? (process.env.BOXING_PUBLIC_URL as string)
  : process.env.VERCEL_PROJECT_PRODUCTION_URL?.endsWith(".vercel.app")
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3400";

export const canonical = (path: string): { canonical: string } | undefined => (INDEXABLE ? { canonical: path } : undefined);
