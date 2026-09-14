import type { MetadataRoute } from "next";
import { INDEXABLE, PUBLIC_URL } from "@/lib/posture";

// Build mode (LAUNCH_APPROVED = false): every crawler is disallowed and no sitemap is advertised.
// Launch mode: crawlers allowed and pointed at the production sitemap on the public domain.
export default function robots(): MetadataRoute.Robots {
  if (INDEXABLE) {
    return { rules: [{ userAgent: "*", allow: "/" }], sitemap: `${PUBLIC_URL}/sitemap.xml` };
  }
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
