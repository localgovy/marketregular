import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { listMarkets, listVendors } from "@/lib/data/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [markets, vendors] = await Promise.all([listMarkets(), listVendors()]);
  const staticRoutes = ["", "/search", "/login"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));
  return [
    ...staticRoutes,
    ...markets.map((m) => ({
      url: `${SITE_URL}/markets/${m.slug}`,
      lastModified: new Date(),
    })),
    ...vendors.map((v) => ({
      url: `${SITE_URL}/vendors/${v.slug}`,
      lastModified: new Date(),
    })),
  ];
}
