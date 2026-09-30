import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { daysLabel } from "@/lib/product-visit";
import type { FindVendor } from "@/lib/data/product-search";
import type { ProductHit, VendorHit } from "@/lib/product-hits";

function Badge({ children }: { children: string }) {
  return <p className="text-sm font-medium text-ticket">{children}</p>;
}

export function ClaimProfileLink({ slug }: { slug: string }) {
  return (
    <p className="mt-3 text-sm">
      <Link href={`/vendors/${slug}#claim`} className="font-medium hover:underline">
        Claim this profile to add prices and items
      </Link>
    </p>
  );
}

/**
 * TODO: Reserve for Pickup. Show the button only when the vendor is on the
 * Pickup program. There is no such column yet, so do not render it.
 * If pickup ever applies to alcohol, the line is:
 * reserve on MarketRegular, pay and show ID at the stall.
 */
export function ProductVendorActions({ slug }: { slug: string }) {
  return <ClaimProfileLink slug={slug} />;
}

function MarketLines({
  markets,
}: {
  markets: Array<{ name: string; slug: string; daysLabel: string | null }>;
}) {
  if (!markets.length) return null;
  return (
    <ul className="mt-3 grid gap-2">
      {markets.map((market) => (
        <li key={market.slug} className="grid gap-0.5">
          <Link href={`/markets/${market.slug}`} className="text-base font-medium hover:underline">
            {market.name}
          </Link>
          {market.daysLabel ? <p className="type-nums text-sm">{market.daysLabel}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function FindVendorList({ vendors }: { vendors: FindVendor[] }) {
  if (!vendors.length) {
    return <p className="mt-6 text-base text-muted-foreground">No published stalls list this yet.</p>;
  }
  return (
    <ul className="mt-6 grid gap-4">
      {vendors.map((vendor) => (
        <li key={vendor.slug} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Link href={`/vendors/${vendor.slug}`} className="text-base font-medium hover:underline">
              {vendor.name}
            </Link>
            {vendor.badge ? <Badge>{vendor.badge}</Badge> : null}
          </div>
          <ul className="mt-3 grid gap-1">
            {vendor.items.map((item, index) => {
              const price = formatPrice(item.priceCents);
              return (
                <li
                  key={`${vendor.slug}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
                >
                  <span>{item.name}</span>
                  {price ? <span className="type-nums whitespace-nowrap">{price}</span> : null}
                </li>
              );
            })}
          </ul>
          <MarketLines markets={vendor.markets} />
          <ProductVendorActions slug={vendor.slug} />
        </li>
      ))}
    </ul>
  );
}

export function ProductHitList({ hits }: { hits: ProductHit[] }) {
  if (!hits.length) return null;
  return (
    <ul className="grid gap-4">
      {hits.map((hit, index) => {
        const price = formatPrice(hit.priceCents);
        return (
          <li key={`${hit.vendorSlug}-${index}`} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Link href={hit.href} className="text-base font-medium hover:underline">
                {hit.itemName}
              </Link>
              {price ? <span className="type-nums whitespace-nowrap">{price}</span> : null}
            </div>
            <p className="mt-1 text-sm">
              <Link href={`/vendors/${hit.vendorSlug}`} className="font-medium hover:underline">
                {hit.vendorName}
              </Link>
            </p>
            {hit.openToday ? (
              <div className="mt-2">
                <Badge>Open today</Badge>
              </div>
            ) : null}
            <MarketLines
              markets={hit.markets.map((market) => ({
                name: market.name,
                slug: market.slug,
                daysLabel: daysLabel(market.days),
              }))}
            />
            <ProductVendorActions slug={hit.vendorSlug} />
          </li>
        );
      })}
    </ul>
  );
}

export function VendorHitList({ vendors }: { vendors: VendorHit[] }) {
  if (!vendors.length) return null;
  return (
    <ul className="grid gap-2">
      {vendors.map((vendor) => (
        <li key={vendor.slug} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <Link href={vendor.href} className="text-base font-medium hover:underline">
            {vendor.name}
          </Link>
          <ProductVendorActions slug={vendor.slug} />
        </li>
      ))}
    </ul>
  );
}
