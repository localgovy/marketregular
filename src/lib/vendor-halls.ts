import type { Market, StallRef, Vendor, VendorHall } from "@/types/database";

export type DirectoryVendor = Vendor & { halls: VendorHall[] };

export function groupVendorHalls(
  stalls: StallRef[],
  markets: Pick<Market, "id" | "slug" | "name">[],
): Map<string, VendorHall[]> {
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const out = new Map<string, VendorHall[]>();
  for (const stall of stalls) {
    const market = marketById.get(stall.market_id);
    if (!market) continue;
    const list = out.get(stall.id) ?? [];
    if (!list.some((hall) => hall.slug === market.slug)) {
      list.push({ slug: market.slug, name: market.name });
      out.set(stall.id, list);
    }
  }
  for (const list of out.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
}

export function withVendorHalls<T extends { id: string }>(
  vendors: T[],
  halls: Map<string, VendorHall[]>,
): Array<T & { halls: VendorHall[] }> {
  return vendors.map((vendor) => ({
    ...vendor,
    halls: halls.get(vendor.id) ?? [],
  }));
}
