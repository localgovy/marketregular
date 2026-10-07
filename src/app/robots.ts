import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { ROBOTS_ALLOW, ROBOTS_DISALLOW } from "@/lib/robots-policy";

/**
 * `/login` and `/signup` are linked from crawlable pages, so blocking them here
 * would hide their own noindex and land them in "Blocked by robots.txt".
 * They stay crawlable and carry noindex instead.
 *
 * Google prefix-matches Disallow. `/vendor` also matched `/vendors` and every
 * stall URL in the sitemap. `/market` vs `/markets` already used `$` plus a
 * trailing slash; the vendor portal uses the same split.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [...ROBOTS_ALLOW],
      disallow: [...ROBOTS_DISALLOW],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
