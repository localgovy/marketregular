import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { listPublicBlogPosts } from "@/lib/blog";
import { listMarkets, listSitemapVendors } from "@/lib/data/catalog";
import { publicSitemapEntries, type SitemapEntry } from "@/lib/sitemap-entries";

export const revalidate = 3600;
/** Directory reads can miss on a cold cache after revalidatePath; give them time. */
export const maxDuration = 60;

function loc(entry: SitemapEntry): MetadataRoute.Sitemap[number] {
  return {
    url: entry.path === "/" ? SITE_URL : `${SITE_URL}${entry.path}`,
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
    ...(entry.changeFrequency ? { changeFrequency: entry.changeFrequency } : {}),
    ...(entry.priority != null ? { priority: entry.priority } : {}),
  };
}

async function directoryListings() {
  const [markets, vendors] = await Promise.allSettled([listMarkets(), listSitemapVendors()]);
  if (markets.status === "rejected") {
    console.error("sitemap markets", markets.reason instanceof Error ? markets.reason.message : "failed");
  }
  if (vendors.status === "rejected") {
    console.error("sitemap vendors", vendors.reason instanceof Error ? vendors.reason.message : "failed");
  }
  return {
    markets: markets.status === "fulfilled" ? markets.value : [],
    vendors: vendors.status === "fulfilled" ? vendors.value : [],
  };
}

function publicPosts() {
  try {
    return listPublicBlogPosts();
  } catch (error) {
    console.error("sitemap blog", error instanceof Error ? error.message : "failed");
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { markets, vendors } = await directoryListings();
  return publicSitemapEntries({
    markets,
    vendors,
    posts: publicPosts(),
  }).map(loc);
}
