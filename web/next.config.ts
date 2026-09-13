import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  // No remote images: licensed portraits are stored under public/media/boxers.
  images: { remotePatterns: [] },
  async redirects() {
    return [
      { source: "/judges", destination: "/officials", permanent: false },
      { source: "/referees", destination: "/officials?role=referee", permanent: false },
      { source: "/judges/:slug", destination: "/officials/:slug", permanent: false },
      { source: "/referees/:slug", destination: "/officials/:slug", permanent: false },
      { source: "/boxers", destination: "/fighters", permanent: false },
      { source: "/boxers/:slug", destination: "/fighters/:slug", permanent: false },
    ];
  },
  async headers() {
    // Mirrors lib/posture.ts INDEXABLE: noindex everywhere until a public launch is approved.
    const indexable = process.env.VERCEL_ENV === "production" && process.env.BOXING_ALLOW_INDEXING === "true" && Boolean(process.env.BOXING_PUBLIC_URL);
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          ...(process.env.VERCEL_GIT_COMMIT_SHA ? [{ key: "X-Boxing-Build", value: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12) }] : []),
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ...(indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
