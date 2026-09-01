import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * `/login` and `/signup` are linked from crawlable pages, so blocking them here
 * would hide their own noindex and land them in "Blocked by robots.txt".
 * They stay crawlable and carry noindex instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/account",
        "/auth/",
        "/onboarding",
        "/saved",
        "/kept",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
