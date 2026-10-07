import { FIND_PAGES } from "@/data/find-pages";
import { CATEGORIES, DAY_SLUGS } from "@/lib/landing";
import { isRobotsDisallowed } from "@/lib/robots-policy";

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SitemapEntry = {
  path: string;
  lastModified?: string;
  changeFrequency?: SitemapChangeFrequency;
  priority?: number;
};

export type SitemapListing = {
  slug: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SitemapPost = {
  slug: string;
  date: string;
};

function listingStamp(row: SitemapListing) {
  return row.updated_at ?? row.created_at ?? undefined;
}

/**
 * Public URLs only. Private portal paths never belong here, and anything
 * robots.txt would block is dropped so Search Console cannot see a sitemap
 * URL that Googlebot is forbidden to fetch.
 */
export function publicSitemapEntries({
  markets,
  vendors,
  posts,
}: {
  markets: SitemapListing[];
  vendors: SitemapListing[];
  posts: SitemapPost[];
}): SitemapEntry[] {
  const newestMarket = markets
    .map(listingStamp)
    .filter((stamp): stamp is string => Boolean(stamp))
    .sort()
    .at(-1);

  const entries: SitemapEntry[] = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/markets", lastModified: newestMarket, changeFrequency: "daily", priority: 0.9 },
    { path: "/products", changeFrequency: "weekly", priority: 0.8 },
    { path: "/markets/day", changeFrequency: "weekly", priority: 0.8 },
    { path: "/markets/open-today", changeFrequency: "daily", priority: 0.8 },
    ...DAY_SLUGS.map((day) => ({
      path: `/markets/day/${day}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...CATEGORIES.map((category) => ({
      path: `/markets/tag/${category.tag}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...FIND_PAGES.map((page) => ({
      path: `/find/${page.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    { path: "/events", changeFrequency: "daily", priority: 0.6 },
    { path: "/feed", changeFrequency: "daily", priority: 0.5 },
    { path: "/about", changeFrequency: "yearly", priority: 0.3 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: post.date,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    ...markets
      .filter((market) => market.slug)
      .map((market) => ({
        path: `/markets/${market.slug}`,
        lastModified: listingStamp(market),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...vendors
      .filter((vendor) => vendor.slug)
      .map((vendor) => ({
        path: `/vendors/${vendor.slug}`,
        lastModified: listingStamp(vendor),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
  ];

  return entries.filter((entry) => !isRobotsDisallowed(entry.path));
}
