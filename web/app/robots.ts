import type { MetadataRoute } from "next";
import { INDEXABLE } from "@/lib/posture";

// Preview and staging builds are never indexed. Production indexing is a
// deliberate change made when a production Boxing environment is approved.
export default function robots(): MetadataRoute.Robots {
  if (INDEXABLE) {
    return { rules: [{ userAgent: "*", allow: "/" }] };
  }
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
