import { getVendorBySlug } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";
import { sellsLine } from "@/lib/listing-copy";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Market stall on MarketRegular";

export default async function VendorOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) {
    return ogCard({
      kicker: `${LAUNCH_CITY} market stalls`,
      title: "Stall",
      lines: [],
    });
  }

  const halls = vendor.markets;
  const first = halls[0];
  const sells = sellsLine(vendor.tags, 3);

  return ogCard({
    kicker: `${LAUNCH_CITY} farmers' market stall`,
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
  });
}
