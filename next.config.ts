import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  flattenListingRedirects,
  LISTING_REDIRECTS,
} from "./src/data/listing-redirects";

type LiveAlias = { kind?: string; from_slug?: string; to_slug?: string };

async function liveListingRedirects() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(
    /\/$/,
    "",
  );
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/listing_slug_aliases?select=kind,from_slug,to_slug`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    const rows: { source: string; destination: string }[] = [];
    for (const row of data as LiveAlias[]) {
      if (row.kind !== "vendor" && row.kind !== "market") continue;
      if (!row.from_slug || !row.to_slug || row.from_slug === row.to_slug) continue;
      const prefix = row.kind === "vendor" ? "/vendors" : "/markets";
      rows.push({
        source: `${prefix}/${row.from_slug}`,
        destination: `${prefix}/${row.to_slug}`,
      });
    }
    return rows;
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  experimental: {
    // Tailwind + next/font CSS is ~21 KiB gzipped. Inlining it removes the
    // render-blocking stylesheet round-trips PageSpeed flags on mobile.
    inlineCss: true,
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  // Markdown lives outside `src/`. Include it so /blog and sitemap can read it
  // after the serverless trace, not only during `next build` on the builder.
  outputFileTracingIncludes: {
    "/blog": ["./content/blog/**/*"],
    "/blog/[slug]": ["./content/blog/**/*"],
    "/sitemap.xml": ["./content/blog/**/*"],
  },
  images: {
    // Hobby Image Optimization is at the cap; serve originals so logos do not 402.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async redirects() {
    const listing = flattenListingRedirects([...LISTING_REDIRECTS, ...(await liveListingRedirects())]).map(
      (row) => ({ ...row, permanent: true as const }),
    );
    return [
      { source: "/contact", destination: "/", permanent: true },
      { source: "/admin/claims", destination: "/admin/applications", permanent: false },
      ...listing,
      { source: "/find/matcha-toronto", destination: "/find/tea-toronto", permanent: true },
      { source: "/find/cheesecake-toronto", destination: "/find/cakes-toronto", permanent: true },
      { source: "/find/corn-toronto", destination: "/find/sweet-corn-toronto", permanent: true },
      { source: "/find/almond-croissant-toronto", destination: "/find/croissants-toronto", permanent: true },
      { source: "/find/chocolate-chip-cookies-toronto", destination: "/find/cookies-toronto", permanent: true },
      { source: "/find/cupcakes-toronto", destination: "/find/cakes-toronto", permanent: true },
      { source: "/find/apple-pie-toronto", destination: "/find/pies-toronto", permanent: true },
      { source: "/find/pumpkin-pie-toronto", destination: "/find/pies-toronto", permanent: true },
      { source: "/find/cherry-tomatoes-toronto", destination: "/find/tomatoes-toronto", permanent: true },
      { source: "/find/heirloom-tomatoes-toronto", destination: "/find/tomatoes-toronto", permanent: true },
      { source: "/find/green-beans-toronto", destination: "/find/beans-toronto", permanent: true },
      { source: "/find/romaine-lettuce-toronto", destination: "/find/lettuce-toronto", permanent: true },
      { source: "/find/green-onions-toronto", destination: "/find/onions-toronto", permanent: true },
      { source: "/find/basil-toronto", destination: "/find/herbs-toronto", permanent: true },
      { source: "/find/dill-toronto", destination: "/find/herbs-toronto", permanent: true },
      { source: "/find/parsley-toronto", destination: "/find/herbs-toronto", permanent: true },
      { source: "/find/rosemary-toronto", destination: "/find/herbs-toronto", permanent: true },
      { source: "/find/thyme-toronto", destination: "/find/herbs-toronto", permanent: true },
      { source: "/find/broccoli-microgreens-toronto", destination: "/find/microgreens-toronto", permanent: true },
      { source: "/find/nectarines-toronto", destination: "/find/peaches-toronto", permanent: true },
      { source: "/find/comb-honey-toronto", destination: "/find/honey-toronto", permanent: true },
      { source: "/find/honeycomb-toronto", destination: "/find/honey-toronto", permanent: true },
      { source: "/find/jellies-toronto", destination: "/find/jams-toronto", permanent: true },
      { source: "/find/free-range-chicken-toronto", destination: "/find/chicken-toronto", permanent: true },
      { source: "/find/grass-fed-beef-toronto", destination: "/find/beef-toronto", permanent: true },
      { source: "/find/breakfast-sausage-toronto", destination: "/find/sausages-toronto", permanent: true },
      { source: "/find/summer-sausage-toronto", destination: "/find/sausages-toronto", permanent: true },
      { source: "/find/riesling-toronto", destination: "/find/wine-toronto", permanent: true },
      { source: "/find/lemon-toronto", destination: "/products", permanent: true },
      { source: "/find/lemons-toronto", destination: "/products", permanent: true },
      { source: "/find/oranges-toronto", destination: "/products", permanent: true },
      { source: "/find/mango-toronto", destination: "/products", permanent: true },
      { source: "/find/mangoes-toronto", destination: "/products", permanent: true },
      { source: "/find/pineapple-toronto", destination: "/products", permanent: true },
      { source: "/find/pineapples-toronto", destination: "/products", permanent: true },
      { source: "/find/bananas-toronto", destination: "/products", permanent: true },
      { source: "/find/turnips-toronto", destination: "/products", permanent: true },
      { source: "/find/celery-toronto", destination: "/products", permanent: true },
      { source: "/find/vegetables-toronto", destination: "/products", permanent: true },
      { source: "/find/fruit-toronto", destination: "/products", permanent: true },
      { source: "/find/meats-toronto", destination: "/products", permanent: true },
      { source: "/find/poultry-toronto", destination: "/products", permanent: true },
      { source: "/find/baked-goods-toronto", destination: "/products", permanent: true },
      { source: "/find/desserts-toronto", destination: "/products", permanent: true },
      { source: "/find/salads-toronto", destination: "/products", permanent: true },
      { source: "/find/greens-toronto", destination: "/products", permanent: true },
      { source: "/find/sauces-toronto", destination: "/products", permanent: true },
      { source: "/find/spices-toronto", destination: "/products", permanent: true },
      { source: "/find/citrus-toronto", destination: "/products", permanent: true },
      { source: "/find/tropical-fruit-toronto", destination: "/products", permanent: true },
      { source: "/find/grapes-toronto", destination: "/products", permanent: true },
      { source: "/find/melons-toronto", destination: "/products", permanent: true },
      { source: "/find/milk-toronto", destination: "/products", permanent: true },
      { source: "/find/bee-pollen-toronto", destination: "/products", permanent: true },
      { source: "/find/ice-cream-toronto", destination: "/products", permanent: true },
      { source: "/find/apple-fritter-toronto", destination: "/products", permanent: true },
      { source: "/find/burgers-toronto", destination: "/products", permanent: true },
      { source: "/find/tacos-toronto", destination: "/products", permanent: true },
      { source: "/find/caesar-salad-toronto", destination: "/products", permanent: true },
      { source: "/find/greek-salad-toronto", destination: "/products", permanent: true },
      { source: "/find/sausage-roll-toronto", destination: "/products", permanent: true },
      { source: "/find/juices-toronto", destination: "/products", permanent: true },
      { source: "/find/lemonade-toronto", destination: "/products", permanent: true },
      { source: "/find/smoothies-toronto", destination: "/products", permanent: true },
      { source: "/find/hot-sauce-toronto", destination: "/products", permanent: true },
      { source: "/find/olive-oil-toronto", destination: "/products", permanent: true },
      { source: "/find/chutneys-toronto", destination: "/products", permanent: true },
      { source: "/find/garlic-powder-toronto", destination: "/products", permanent: true },
      { source: "/find/black-garlic-toronto", destination: "/products", permanent: true },
      { source: "/find/garlic-scapes-toronto", destination: "/products", permanent: true },
      { source: "/find/turnip-toronto", destination: "/products", permanent: true },
      { source: "/find/parsnips-toronto", destination: "/products", permanent: true },
      { source: "/find/peas-toronto", destination: "/products", permanent: true },
      { source: "/find/cabbage-toronto", destination: "/products", permanent: true },
      { source: "/find/cauliflower-toronto", destination: "/products", permanent: true },
      { source: "/find/radishes-toronto", destination: "/products", permanent: true },
      { source: "/find/arugula-toronto", destination: "/products", permanent: true },
      { source: "/find/leeks-toronto", destination: "/products", permanent: true },
      { source: "/find/fish-toronto", destination: "/products", permanent: true },
      { source: "/find/pastries-toronto", destination: "/products", permanent: true },
      { source: "/find/sweet-potatoes-toronto", destination: "/products", permanent: true },
      { source: "/search", destination: "/products", permanent: true },
      // Stall pages stay at /vendors/[slug]. The A–Z index cannibalized market
      // queries (title was too close to /markets). Query strings pass through.
      { source: "/vendors", destination: "/markets", permanent: true },
    ];
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const dev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' stays. Nonces would make the root layout dynamic and
      // drop force-static / ISR on every market and vendor page. Next's own
      // bootstrap is inline, so a hash list cannot replace this either.
      // React reconstructs call stacks with eval() in development only.
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com https://*.googletagmanager.com https://js.stripe.com https://*.js.stripe.com https://connect-js.stripe.com${dev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.openfreemap.org https://*.googleusercontent.com https://*.google-analytics.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com https://*.google.ca https://*.stripe.com",
      "font-src 'self' data: https://*.openfreemap.org",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openfreemap.org https://va.vercel-scripts.com https://*.google-analytics.com https://*.analytics.google.com https://analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com https://*.google.ca https://api.stripe.com https://*.stripe.com https://connect-js.stripe.com",
      "frame-src 'self' https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://connect-js.stripe.com https://*.stripe.com",
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
      { source: "/vendor", headers: noindex },
      { source: "/vendor/:path*", headers: noindex },
      { source: "/login", headers: noindex },
      { source: "/signup", headers: noindex },
      { source: "/onboarding", headers: noindex },
      { source: "/auth/:path*", headers: noindex },
      { source: "/saved", headers: noindex },
      { source: "/kept", headers: noindex },
    ];
  },
};

export default withBotId(nextConfig);
