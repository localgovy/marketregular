import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/account",
        "/auth/",
        "/login",
        "/signup",
        "/onboarding",
        "/saved",
        "/kept",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
