import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  experimental: {
    // Tailwind + next/font CSS is ~21 KiB gzipped. Inlining it removes the
    // render-blocking stylesheet round-trips PageSpeed flags on mobile.
    inlineCss: true,
  },
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  images: {
    // Hobby Image Optimization is at the cap; serve originals so logos do not 402.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/vendors/the-agrarian-kitchen-the-strong-earth-company",
        destination: "/vendors/agrarian-kitchen",
        permanent: true,
      },
      {
        source: "/markets/sickkids-market-indoor-winter",
        destination: "/markets/sickkids-market",
        permanent: true,
      },
      { source: "/search", destination: "/markets", permanent: true },
      { source: "/vendors", destination: "/markets", permanent: true },
    ];
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const dev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      // React reconstructs call stacks with eval() in development only.
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com${dev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.openfreemap.org https://*.googleusercontent.com",
      "font-src 'self' data: https://*.openfreemap.org",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openfreemap.org https://va.vercel-scripts.com",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(dev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "Content-Security-Policy", value: csp },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
      },
    ];
    return [
      { source: "/", headers: security },
      { source: "/:path*", headers: security },
      { source: "/admin", headers: noindex },
      { source: "/admin/:path*", headers: noindex },
      { source: "/account", headers: noindex },
      { source: "/account/:path*", headers: noindex },
      { source: "/login", headers: noindex },
      { source: "/signup", headers: noindex },
      { source: "/onboarding", headers: noindex },
      { source: "/auth/:path*", headers: noindex },
      { source: "/saved", headers: noindex },
      { source: "/kept", headers: noindex },
    ];
  },
};

export default nextConfig;
