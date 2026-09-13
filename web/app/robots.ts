import type { MetadataRoute } from "next";

// Preview and staging builds are never indexed. Production indexing is a
// deliberate change made when a production Boxing environment is approved.
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "production" && process.env.BOXING_ALLOW_INDEXING === "true") {
    return { rules: [{ userAgent: "*", allow: "/" }] };
  }
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
