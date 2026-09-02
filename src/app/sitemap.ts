import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { listMarkets, listSitemapVendors } from "@/lib/data/catalog";
import { CATEGORIES, DAY_SLUGS } from "@/lib/landing";

export const revalidate = 3600;

function loc(
  path: string,
  options?: { lastModified?: string; changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]; priority?: number },
): MetadataRoute.Sitemap[number] {
  return {
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    ...(options?.lastModified ? { lastModified: options.lastModified } : {}),
    ...(options?.changeFrequency ? { changeFrequency: options.changeFrequency } : {}),
    ...(options?.priority != null ? { priority: options.priority } : {}),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [markets, vendors] = await Promise.all([listMarkets(), listSitemapVendors()]);

  // Hours move, so the directory and the day pages are the ones worth recrawling often.
  const newestMarket = markets
    .map((market) => market.updated_at ?? market.created_at)
    .filter((stamp): stamp is string => Boolean(stamp))
    .sort()
    .at(-1);

  return [
    loc("/", { changeFrequency: "daily", priority: 1 }),
    loc("/markets", { lastModified: newestMarket, changeFrequency: "daily", priority: 0.9 }),
    loc("/markets/day", { changeFrequency: "weekly", priority: 0.8 }),
    loc("/markets/open-today", { changeFrequency: "daily", priority: 0.8 }),
    ...DAY_SLUGS.map((day) =>
      loc(`/markets/day/${day}`, { changeFrequency: "weekly", priority: 0.8 }),
    ),
    ...CATEGORIES.map((category) =>
      loc(`/markets/tag/${category.tag}`, { changeFrequency: "weekly", priority: 0.7 }),
    ),
    loc("/events", { changeFrequency: "daily", priority: 0.6 }),
    loc("/feed", { changeFrequency: "daily", priority: 0.5 }),
    loc("/about", { changeFrequency: "yearly", priority: 0.3 }),
    loc("/contact", { changeFrequency: "yearly", priority: 0.3 }),
    ...markets.map((market) =>
      loc(`/markets/${market.slug}`, {
        lastModified: market.updated_at ?? market.created_at,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...vendors.map((vendor) =>
      loc(`/vendors/${vendor.slug}`, {
        lastModified: vendor.updated_at ?? vendor.created_at,
        changeFrequency: "monthly",
        priority: 0.5,
      }),
    ),
  ];
}
