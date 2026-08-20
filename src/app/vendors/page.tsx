import type { Metadata } from "next";
import { VendorsDirectory, type VendorDirectoryRow } from "@/components/vendors-directory";
import { listMarkets, listStalls, listVendors } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";

export const metadata: Metadata = { title: `${LAUNCH_CITY} vendors` };

export default async function VendorsIndexPage() {
  const [vendors, stalls, markets] = await Promise.all([
    listVendors(),
    listStalls(),
    listMarkets(),
  ]);
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const stallsByVendor = new Map<string, typeof stalls>();
  for (const stall of stalls) {
    const list = stallsByVendor.get(stall.id) ?? [];
    list.push(stall);
    stallsByVendor.set(stall.id, list);
  }
  const rows: VendorDirectoryRow[] = vendors.map((vendor) => {
    const at = stallsByVendor.get(vendor.id) ?? [];
    return {
      ...vendor,
      where: [
        ...new Set(
          at
            .map((stall) => marketById.get(stall.market_id)?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ],
      stalls: at.map((stall) => stall.stall).filter((stall): stall is string => Boolean(stall)),
      days: [...new Set(at.flatMap((stall) => stall.days))],
    };
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Vendors</h1>
      <p className="type-lede mt-2 mb-6 text-muted-foreground">
        Stalls in the {LAUNCH_CITY} directory. Tap a name for the menu and which markets they stand
        at. Save a stall to put it on your list.
      </p>
      <VendorsDirectory vendors={rows} />
    </div>
  );
}
