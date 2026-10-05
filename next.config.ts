import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    return [
      { source: "/contact", destination: "/", permanent: true },
      { source: "/admin/claims", destination: "/admin/applications", permanent: false },
      {
        source: "/vendors/the-agrarian-kitchen-the-strong-earth-company",
        destination: "/vendors/agrarian-kitchen",
        permanent: true,
      },
      {
        source: "/vendors/thames-river-farms",
        destination: "/vendors/thames-river-melons",
        permanent: true,
      },
      {
        source: "/vendors/bitter-better-canda",
        destination: "/vendors/bitter-better",
        permanent: true,
      },
      {
        source: "/vendors/molly-b-s-gluten-free",
        destination: "/vendors/molly-b-s-gluten-free-kitchen",
        permanent: true,
      },
      {
        source: "/vendors/nemophillist-creations",
        destination: "/vendors/nemophilist-creations",
        permanent: true,
      },
      // Dropped by the vendor merges. The keeper page is the one that stayed published.
      { source: "/vendors/bitter-better-canada", destination: "/vendors/bitter-better", permanent: true },
      { source: "/vendors/cosmos-baking", destination: "/vendors/cosmos-baking-studio", permanent: true },
      { source: "/vendors/don-grilled-tacos-brunch", destination: "/vendors/don-grilled-steak-tacos-and-brunch", permanent: true },
      { source: "/vendors/first-fish-distribution", destination: "/vendors/first-fish", permanent: true },
      { source: "/vendors/fish-tree-farms", destination: "/vendors/fish-tree-farm", permanent: true },
      { source: "/vendors/gebeta-ethiopian-bbq", destination: "/vendors/gebeta", permanent: true },
      { source: "/vendors/gebeta-toronto", destination: "/vendors/gebeta", permanent: true },
      { source: "/vendors/goodlot-farm-brewing", destination: "/vendors/goodlot-farmstead-brewing-company", permanent: true },
      { source: "/vendors/kindred-folk", destination: "/vendors/kindred-folk-flowers", permanent: true },
      { source: "/vendors/kinsip", destination: "/vendors/kinsip-house-of-fine-spirits", permanent: true },
      { source: "/vendors/link-haus-fine-sausage", destination: "/vendors/link-haus", permanent: true },
      { source: "/vendors/many-roads-purveyors-of-eggs-meat-cheese", destination: "/vendors/many-roads-purveyors", permanent: true },
      { source: "/vendors/meui-kimchi", destination: "/vendors/meui", permanent: true },
      { source: "/vendors/nepali-momos", destination: "/vendors/nepali-momo", permanent: true },
      { source: "/vendors/ostrich-land-the-power-of-ostrich", destination: "/vendors/ostrich-land", permanent: true },
      { source: "/vendors/potager-dukanada", destination: "/vendors/potager-du-kanada", permanent: true },
      { source: "/vendors/red-tape", destination: "/vendors/red-tape-brewery", permanent: true },
      { source: "/vendors/sarah-nicole-artistry", destination: "/vendors/sarah-nicole-s-artistry", permanent: true },
      { source: "/vendors/sun-ray-farms", destination: "/vendors/sun-ray-orchards", permanent: true },
      { source: "/vendors/hooked-stouffville", destination: "/vendors/hooked", permanent: true },
      { source: "/vendors/pv-s-fresh-fruits-veg", destination: "/vendors/pv-s-fresh-fruits-vegetables", permanent: true },
      { source: "/vendors/bruem-design-media", destination: "/vendors/bruem-designs", permanent: true },
      { source: "/vendors/the-east-olive-supply-co-choose-to-infuse", destination: "/vendors/the-east-olive-supply-company", permanent: true },
      { source: "/vendors/thorganic-farm", destination: "/vendors/thorganic-farms", permanent: true },
      {
        source: "/markets/sickkids-market-indoor-winter",
        destination: "/markets/sickkids-market",
        permanent: true,
      },
      // Retired hall with no successor listing. Answered at the edge so the
      // crawler never sees the 404 Search Console picked up.
      { source: "/markets/gould-street-tmu", destination: "/markets", permanent: true },
      { source: "/markets/trinity-bellwoods-farmers-market", destination: "/markets", permanent: true },
      { source: "/find/lemon-toronto", destination: "/find/citrus-toronto", permanent: true },
      { source: "/find/lemons-toronto", destination: "/find/citrus-toronto", permanent: true },
      { source: "/find/oranges-toronto", destination: "/find/citrus-toronto", permanent: true },
      { source: "/find/mango-toronto", destination: "/find/tropical-fruit-toronto", permanent: true },
      { source: "/find/mangoes-toronto", destination: "/find/tropical-fruit-toronto", permanent: true },
      { source: "/find/pineapple-toronto", destination: "/find/tropical-fruit-toronto", permanent: true },
      { source: "/find/pineapples-toronto", destination: "/find/tropical-fruit-toronto", permanent: true },
      { source: "/find/bananas-toronto", destination: "/find/tropical-fruit-toronto", permanent: true },
      { source: "/find/matcha-toronto", destination: "/find/tea-toronto", permanent: true },
      { source: "/find/cheesecake-toronto", destination: "/find/cakes-toronto", permanent: true },
      { source: "/find/corn-toronto", destination: "/find/sweet-corn-toronto", permanent: true },
      { source: "/find/turnips-toronto", destination: "/find/turnip-toronto", permanent: true },
      { source: "/find/celery-toronto", destination: "/find/vegetables-toronto", permanent: true },
      { source: "/markets/leslieville-farmers-market-east-end-food-hub", destination: "/markets/the-leslieville-farmers-market", permanent: true },
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
