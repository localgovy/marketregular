import { unstable_cache } from "next/cache";
import { getVendorBySlug } from "@/lib/data/catalog";
import { DIRECTORY_TAG } from "@/lib/directory-cache";
import { LAUNCH_CITY } from "@/lib/launch";
import { sellsLine } from "@/lib/listing-copy";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

/** One card a day. Sharing a stall does not render it again on every crawl. */
export const revalidate = 86400;

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Vendor on MarketRegular";

const loadVendorOg = unstable_cache(
  async (slug: string) => {
    const vendor = await getVendorBySlug(slug);
    if (!vendor) return null;
    const halls = vendor.markets;
    const first = halls[0];
    const sells = sellsLine(vendor.tags, 3);
    return {
      kicker: `${LAUNCH_CITY} farmers' market vendor`,
      title: vendor.name,
      plate: sells || undefined,
      lines: [
        first
          ? halls.length > 1
            ? `${first.name} and ${halls.length - 1} more`
            : first.name
          : "",
        vendor.menus.length
          ? `${vendor.menus.length} menu ${vendor.menus.length === 1 ? "item" : "items"}`
          : "",
      ].filter(Boolean),
    };
  },
  ["vendor-og-v1"],
  { revalidate: 86400, tags: [DIRECTORY_TAG] },
);

export default async function VendorOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await loadVendorOg(slug);
  if (!card) {
    return await ogCard({
      kicker: `${LAUNCH_CITY} market vendors`,
      title: "Vendor",
      lines: [],
    });
  }
  return await ogCard(card);
}
