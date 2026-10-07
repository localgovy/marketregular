"use client";

import Link from "next/link";
import { Hours } from "@/components/hours";
import { ListingMark } from "@/components/listing-mark";
import { ListingScore } from "@/components/listing-score";
import { ProductSaveButton } from "@/components/save-button";
import { WEEKDAYS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import type { SavedProduct } from "@/lib/product-saves";
import type { Market, Vendor } from "@/types/database";

function shortDays(days: number[]) {
  const names = [...new Set(days.filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
  if (!names.length) return null;
  return names.map((day) => WEEKDAYS[day].slice(0, 3)).join(", ");
}

function SavedProductCard({
  product,
  vendor,
  markets,
}: {
  product: SavedProduct;
  vendor?: Vendor;
  markets: Map<string, Market>;
}) {
  const vendorName = vendor?.name ?? product.vendorName;
  const ratingAvg = vendor ? vendor.rating_avg : product.ratingAvg;
  const reviewCount = vendor ? vendor.review_count : product.reviewCount;

  return (
    <li className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-t-xl border-b border-black/10 bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex min-w-[min(100%,12rem)] max-w-full flex-1 items-center gap-2">
          <ListingMark src={vendor?.logo_url} className="h-8 w-12 bg-primary-foreground" />
          <p className="min-w-0">
            <Link href={`/vendors/${product.vendorSlug}`} className="text-base font-medium hover:underline">
              {vendorName}
            </Link>
            <ListingScore parens ratingAvg={ratingAvg} reviewCount={reviewCount} className="ml-2" />
          </p>
        </div>
        <ProductSaveButton product={product} />
      </div>
      <ul>
        {product.items.map((item, index) => {
          const price = formatPrice(item.priceCents);
          return (
            <li
              key={`${product.slug}-item-${index}`}
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
      {product.markets.length ? (
        <ul>
          {product.markets.map((market) => {
            const live = markets.get(market.slug);
            const name = live?.name ?? market.name;
            const scoreAvg = live ? live.rating_avg : market.ratingAvg;
            const scoreCount = live ? live.review_count : market.reviewCount;
            const days = shortDays(market.days);
            return (
              <li key={market.slug} className="border-b border-border px-4 py-3 last:border-b-0">
                <p className="min-w-0">
                  <Link href={`/markets/${market.slug}`} className="text-base font-medium hover:underline">
                    {name}
                  </Link>
                  <ListingScore
                    parens
                    ratingAvg={scoreAvg}
                    reviewCount={scoreCount}
                    className="ml-2 text-stamp"
                  />
                </p>
                {market.hours.length ? (
                  <p className="mt-1 grid grid-cols-[auto_auto] justify-start gap-x-3 gap-y-0.5">
                    {market.hours.map((row) => (
                      <span key={`${market.slug}-${row.day}-${row.hours}`} className="contents">
                        <span className="text-sm text-muted-foreground">{row.day}</span>
                        <Hours value={row.hours} className="text-muted-foreground" />
                      </span>
                    ))}
                  </p>
                ) : days ? (
                  <p className="type-nums mt-1 text-sm">{days}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

export function SavedProductsSection({
  products,
  markets,
  vendors,
  heading: Heading,
  className,
}: {
  products: SavedProduct[];
  markets: Market[];
  vendors: Vendor[];
  heading: "h2" | "h3";
  className?: string;
}) {
  const vendorBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor]));
  const marketBySlug = new Map(markets.map((market) => [market.slug, market]));
  const rows = [...products].reverse();

  return (
    <section className={className}>
      <Heading>Products</Heading>
      {rows.length ? (
        <ul className="mt-3 grid gap-4">
          {rows.map((product) => (
            <SavedProductCard
              key={product.slug}
              product={product}
              vendor={vendorBySlug.get(product.vendorSlug)}
              markets={marketBySlug}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No products on the list.</p>
      )}
    </section>
  );
}
