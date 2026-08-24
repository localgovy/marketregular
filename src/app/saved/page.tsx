import type { Metadata } from "next";
import { SavedDesk } from "@/components/saved-rail";
import { listMarkets, listVendors } from "@/lib/data/catalog";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Saved markets and stalls",
  path: "/saved",
  description: "Your list of halls and stalls, saved on this device.",
  index: false,
});

export default async function SavedPage() {
  const [markets, vendors] = await Promise.all([listMarkets(), listVendors()]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Saved</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        Your list of halls and stalls. Saved on this device; sign in to keep it with your account.
      </p>
      <SavedDesk markets={markets} vendors={vendors} />
    </div>
  );
}
