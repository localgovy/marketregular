import { unstable_cache } from "next/cache";
import { getMarketBySlug } from "@/lib/data/catalog";
import { DIRECTORY_TAG } from "@/lib/directory-cache";
import { LAUNCH_CITY } from "@/lib/launch";
import { marketPlaceLine, scheduleDaysLine, sellsLine } from "@/lib/listing-copy";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

/** One card a day. Sharing a market does not render it again on every crawl. */
export const revalidate = 86400;

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Market on MarketRegular";

const loadMarketOg = unstable_cache(
  async (slug: string) => {
    const market = await getMarketBySlug(slug);
    if (!market) return null;
    const stalls = market.vendors.length;
    const sells = sellsLine(market.tags, 3);
    return {
      kicker: `${market.city} farmers' market`,
      title: market.name,
      plate: scheduleDaysLine(market.schedules, 1) || undefined,
      lines: [
        marketPlaceLine(market.address, market.city),
        stalls
          ? `${stalls} ${stalls === 1 ? "vendor" : "vendors"}${sells ? ` · ${sells}` : ""}`
          : sells,
      ].filter(Boolean),
    };
  },
  ["market-og-v1"],
  { revalidate: 86400, tags: [DIRECTORY_TAG] },
);

export default async function MarketOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await loadMarketOg(slug);
  if (!card) {
    return ogCard({
      kicker: `${LAUNCH_CITY} farmers' markets`,
      title: "Market",
      lines: [],
    });
  }
  return ogCard(card);
}
