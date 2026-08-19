import type { Metadata } from "next";
import Link from "next/link";
import { KeptDesk } from "@/components/kept-rail";
import { listMarkets, listVendors } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";

export const metadata: Metadata = { title: "Kept markets and stalls" };

export default async function KeptPage() {
  const [markets, vendors] = await Promise.all([listMarkets(), listVendors()]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="mb-4">
        <Link
          href="/"
          className="text-base font-medium text-primary underline-offset-4 hover:underline"
        >
          ← {LAUNCH_CITY} farmers&apos; markets
        </Link>
      </p>
      <h1 className="font-heading text-4xl">Kept</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Your list of halls and stalls. Kept on this device so Saturday is already decided.
      </p>
      <KeptDesk markets={markets} vendors={vendors} />
    </div>
  );
}
