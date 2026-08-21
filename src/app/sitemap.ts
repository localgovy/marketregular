import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { listMarkets, listVendors } from "@/lib/data/catalog";

export const revalidate = 3600;

function loc(path: string, lastModified?: string) {
  return {
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [markets, vendors] = await Promise.all([listMarkets(), listVendors()]);
  return [
    loc("/"),
    loc("/markets"),
    loc("/feed"),
    loc("/events"),
    loc("/vendors"),
    ...markets.map((market) =>
      loc(`/markets/${market.slug}`, market.updated_at ?? market.created_at),
    ),
    ...vendors.map((vendor) => loc(`/vendors/${vendor.slug}`, vendor.created_at)),
  ];
}
