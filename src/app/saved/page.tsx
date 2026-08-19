import type { Metadata } from "next";
import { SavedDesk } from "@/components/saved-rail";
import { listMarkets, listVendors } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Saved markets and stalls" };

export default async function SavedPage() {
  const [markets, vendors] = await Promise.all([listMarkets(), listVendors()]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Saved</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        Your list of halls and stalls. Saved on this device so Saturday is already decided.
      </p>
      <SavedDesk markets={markets} vendors={vendors} />
    </div>
  );
}
