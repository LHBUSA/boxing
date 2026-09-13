import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  // No remote images: there is no licensed boxer photography yet. Portraits are
  // our own deterministic compositions (components/Portrait.tsx).
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
    const preview = process.env.VERCEL_ENV !== "production";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ...(preview ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
