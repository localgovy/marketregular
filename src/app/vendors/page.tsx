import type { Metadata } from "next";
import Link from "next/link";
import { VendorRow } from "@/components/vendor-row";
import { listVendors } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";

export const metadata: Metadata = { title: `${LAUNCH_CITY} vendors` };

export default async function VendorsIndexPage() {
  const vendors = await listVendors();

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
      <h1 className="font-heading text-4xl">Vendors</h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        Stalls in the {LAUNCH_CITY} directory. Tap a name for the menu and which markets they stand
        at. Save a stall to put it on your list.
      </p>
      <p className="mb-6 text-sm">
        <Link href="/search" className="font-medium text-primary hover:underline">
          Search by food or neighbourhood
        </Link>
      </p>
      <p className="mb-3 text-sm text-muted-foreground">{vendors.length} listed</p>
      <div className="overflow-hidden rounded-md bg-card ring-1 ring-border">
        {vendors.map((vendor) => (
          <VendorRow key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  );
}
