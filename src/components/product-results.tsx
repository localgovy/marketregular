import Link from "next/link";
import { Hours } from "@/components/hours";
import { formatPrice } from "@/lib/format";
import { WEEKDAYS } from "@/lib/constants";
import type { FindVendor } from "@/lib/data/product-search";
import type { ProductHit, VendorHit } from "@/lib/product-hits";

function Badge({ children }: { children: string }) {
  return <p className="text-sm font-medium whitespace-nowrap">{children}</p>;
}

export function ClaimProfileLink({ slug }: { slug: string }) {
  return (
    <p className="text-sm">
      <Link href={`/vendors/${slug}#claim`} className="font-medium hover:underline">
        Claim this profile to add prices and items
      </Link>
    </p>
  );
}

/**
 * Turns on only when a vendor is actually on the Pickup program.
 * There is no such column yet, so callers omit `pickup` and this renders nothing.
 * When it does show: "Reserve for pickup".
 * Alcohol uses "reserve on MarketRegular, pay and show ID at the stall".
 */
export function ReserveForPickup({
  pickup = false,
  alcohol = false,
}: {
  pickup?: boolean;
  alcohol?: boolean;
}) {
  if (!pickup) return null;
  return (
    <p className="text-sm font-medium">
      {alcohol
        ? "Reserve on MarketRegular, pay and show ID at the stall"
        : "Reserve for pickup"}
    </p>
  );
}

export function ProductVendorActions({ slug }: { slug: string }) {
  return (
    <div className="grid gap-2">
      <ReserveForPickup />
      <ClaimProfileLink slug={slug} />
    </div>
  );
}

/** Same short days as a vendor card, so the hours column stays one line. */
function shortDays(days: number[]) {
  const names = [...new Set(days.filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
  if (!names.length) return null;
  return names.map((day) => WEEKDAYS[day].slice(0, 3)).join(", ");
}

type ListingItem = {
  name: string;
  href?: string;
  priceCents: number | null;
};

type ListingMarket = {
  name: string;
  slug: string;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
};

function ProductListing({
  vendorName,
  vendorSlug,
  badge,
  items,
  markets,
}: {
  vendorName: string;
  vendorSlug: string;
  badge: string | null;
  items: ListingItem[];
  markets: ListingMarket[];
}) {
  return (
    <li className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-t-xl border-b border-black/10 bg-primary px-4 py-3 text-primary-foreground">
        <Link href={`/vendors/${vendorSlug}`} className="min-w-0 text-base font-medium hover:underline">
          {vendorName}
        </Link>
        {badge ? <Badge>{badge}</Badge> : <span />}
      </div>
      {items.length ? (
        <ul>
          {items.map((item, index) => {
            const price = formatPrice(item.priceCents);
            return (
              <li
                key={`${vendorSlug}-item-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-dashed border-border px-4 py-2.5"
              >
                <p className="min-w-0 text-base">
                  {item.href ? (
                    <Link href={item.href} className="hover:underline">
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </p>
                {price ? (
                  <span className="type-nums shrink-0 self-start whitespace-nowrap bg-stamp px-1.5 py-0.5 text-sm text-chalk">
                    {price}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {markets.length ? (
        <ul>
          {markets.map((market) => {
            const days = shortDays(market.days);
            return (
              <li key={market.slug} className="border-b border-border px-4 py-2.5">
                <Link
                  href={`/markets/${market.slug}`}
                  className="min-w-0 text-base font-medium hover:underline"
                >
                  {market.name}
                </Link>
                {market.hours.length ? (
                  <p className="mt-0.5 grid grid-cols-[auto_auto] justify-start gap-x-3 gap-y-0.5">
                    {market.hours.map((row) => (
                      <span key={`${market.slug}-${row.day}`} className="contents">
                        <span className="text-sm text-muted-foreground">{row.day}</span>
                        <Hours value={row.hours} className="text-muted-foreground" />
                      </span>
                    ))}
                  </p>
                ) : days ? (
                  <p className="type-nums mt-0.5 text-sm">{days}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="px-4 py-3">
        <ProductVendorActions slug={vendorSlug} />
      </div>
    </li>
  );
}

export function FindVendorList({ vendors }: { vendors: FindVendor[] }) {
  if (!vendors.length) {
    return <p className="mt-6 text-base text-muted-foreground">No published stalls list this yet.</p>;
  }
  return (
    <ul className="mt-4 grid gap-4">
      {vendors.map((vendor) => (
        <ProductListing
          key={vendor.slug}
          vendorName={vendor.name}
          vendorSlug={vendor.slug}
          badge={vendor.badge}
          items={vendor.items}
          markets={vendor.markets}
        />
      ))}
    </ul>
  );
}

export function ProductHitList({ hits }: { hits: ProductHit[] }) {
  if (!hits.length) return null;
  return (
    <ul className="grid gap-4">
      {hits.map((hit, index) => (
        <ProductListing
          key={`${hit.vendorSlug}-${index}`}
          vendorName={hit.vendorName}
          vendorSlug={hit.vendorSlug}
          badge={hit.openToday ? "Open today" : null}
          items={[{ name: hit.itemName, href: hit.href, priceCents: hit.priceCents }]}
          markets={hit.markets}
        />
      ))}
    </ul>
  );
}

export function VendorHitList({ vendors }: { vendors: VendorHit[] }) {
  if (!vendors.length) return null;
  return (
    <ul className="grid gap-2">
      {vendors.map((vendor) => (
        <li key={vendor.slug} className="rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="border-b border-border px-4 py-3">
            <Link href={vendor.href} className="text-base font-medium hover:underline">
              {vendor.name}
            </Link>
          </div>
          <div className="px-4 py-3">
            <ProductVendorActions slug={vendor.slug} />
          </div>
        </li>
      ))}
    </ul>
  );
}
