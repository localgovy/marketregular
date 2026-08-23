import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async redirects() {
    return [
      { source: "/search", destination: "/markets", permanent: true },
      { source: "/vendors", destination: "/markets", permanent: true },
      { source: "/login", destination: "/", permanent: false },
    ];
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/admin", headers: noindex },
      { source: "/admin/:path*", headers: noindex },
      { source: "/account", headers: noindex },
      { source: "/auth/:path*", headers: noindex },
      { source: "/saved", headers: noindex },
      { source: "/kept", headers: noindex },
    ];
  },
};

export default nextConfig;
