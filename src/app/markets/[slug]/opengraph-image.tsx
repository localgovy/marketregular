import { getMarketBySlug } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";
import { marketPlaceLine, scheduleDaysLine, sellsLine } from "@/lib/listing-copy";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og-card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Market on MarketRegular";

export default async function MarketOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const market = await getMarketBySlug(slug);
  if (!market) {
    return ogCard({
      kicker: `${LAUNCH_CITY} farmers' markets`,
      title: "Market",
      lines: [],
    });
  }

  const stalls = market.vendors.length;
  const sells = sellsLine(market.tags, 3);

  return ogCard({
    kicker: `${market.city} farmers' market`,
    title: market.name,
    plate: scheduleDaysLine(market.schedules, 1) || undefined,
    lines: [
      marketPlaceLine(market.address, market.city),
      stalls
        ? `${stalls} ${stalls === 1 ? "stall" : "stalls"}${sells ? ` · ${sells}` : ""}`
        : sells,
    ].filter(Boolean),
  });
}
