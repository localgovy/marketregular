"use client";

import Link from "next/link";
import { Hours } from "@/components/hours";
import { ListingMark } from "@/components/listing-mark";
import { ListingScore } from "@/components/listing-score";
import { ProductSaveButton } from "@/components/save-button";
import { formatPrice } from "@/lib/format";
import { productFromInput } from "@/lib/product-saves";
import { WEEKDAYS } from "@/lib/constants";
import type { FindVendor } from "@/lib/data/product-search";
import type { ProductHit, VendorHit } from "@/lib/product-hits";

function Badge({ children }: { children: string }) {
  return <p className="text-sm font-medium whitespace-nowrap">{children}</p>;
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
  ratingAvg: number | null;
  reviewCount: number;
};

function ProductListing({
  vendorName,
  vendorSlug,
  logoUrl,
  ratingAvg,
  reviewCount,
  badge,
  items,
  markets,
}: {
  vendorName: string;
  vendorSlug: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  badge: string | null;
  items: ListingItem[];
  markets: ListingMarket[];
}) {
  const product = productFromInput({
    vendorSlug,
    vendorName,
    ratingAvg,
    reviewCount,
    items,
    markets,
  });

  return (
    <li className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-t-xl border-b border-black/10 bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex min-w-[min(100%,12rem)] max-w-full flex-1 items-center gap-2">
          <ListingMark src={logoUrl} plate />
          <p className="min-w-0">
            <Link href={`/vendors/${vendorSlug}`} className="text-base font-medium hover:underline">
              {vendorName}
            </Link>
            <ListingScore
              parens
              ratingAvg={ratingAvg}
              reviewCount={reviewCount}
              className="ml-2"
            />
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {badge ? <Badge>{badge}</Badge> : null}
          {product ? <ProductSaveButton product={product} /> : null}
        </span>
      </div>
      {items.length ? (
        <ul>
          {items.map((item, index) => {
            const price = formatPrice(item.priceCents);
            return (
              <li
                key={`${vendorSlug}-item-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-dashed border-border bg-secondary px-4 py-2.5 text-foreground"
              >
                <p className="min-w-0 text-base font-medium">
                  {item.href ? (
                    <Link href={item.href} className="hover:underline">
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </p>
                {price ? (
                  <span className="type-nums shrink-0 self-start whitespace-nowrap text-sm text-foreground">
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
                <p className="min-w-0">
                  <Link
                    href={`/markets/${market.slug}`}
                    className="text-base font-medium hover:underline"
                  >
                    {market.name}
                  </Link>
                  <ListingScore
                    parens
                    ratingAvg={market.ratingAvg}
                    reviewCount={market.reviewCount}
                    className="ml-2 text-stamp"
                  />
                </p>
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
          logoUrl={vendor.logoUrl}
          ratingAvg={vendor.ratingAvg}
          reviewCount={vendor.reviewCount}
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
          logoUrl={hit.logoUrl}
          ratingAvg={hit.ratingAvg}
          reviewCount={hit.reviewCount}
          badge={hit.badge}
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
            <div className="flex min-w-0 items-center gap-2">
              <ListingMark src={vendor.logoUrl} plate className="bg-transparent" />
              <p className="min-w-0">
                <Link href={vendor.href} className="text-base font-medium hover:underline">
                  {vendor.name}
                </Link>
                <ListingScore
                  parens
                  ratingAvg={vendor.ratingAvg}
                  reviewCount={vendor.reviewCount}
                  className="ml-2 text-stamp"
                />
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
