"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRightMark, CrateMark, TagMark } from "@/components/marks";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import type { ProductPhoto } from "@/lib/data/product-photos";
import { productsBrowseHref, type CatalogueSort } from "@/lib/product-browse-href";
import { BREAKFAST_ID, splitAisles, type CatalogueAisle } from "@/lib/product-catalogue";
import type { ProductsAtlasStallPreview } from "@/lib/products-atlas-data";
import { cn } from "@/lib/utils";

function directPublicImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.includes("/storage/v1/render/image/") || src.startsWith("/_next/image")) {
    return null;
  }
  return src;
}

function ProductThumb({
  src,
  size = "xs",
  className,
}: {
  src: string | null | undefined;
  size?: "xs" | "sm";
  className?: string;
}) {
  const safeSrc = directPublicImageSrc(src);
  const [failed, setFailed] = useState(false);
  const show = Boolean(safeSrc && !failed);

  const spec = {
    xs: { box: "size-5", px: 20, icon: "size-3" },
    sm: { box: "size-7", px: 28, icon: "size-3.5" },
  }[size];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-secondary text-primary",
        spec.box,
        className,
      )}
    >
      {show && safeSrc ? (
        <img
          src={safeSrc}
          alt=""
          width={spec.px}
          height={spec.px}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <TagMark className={spec.icon} />
      )}
    </span>
  );
}

export function ProductAisles({
  aisles,
  aisle,
  sort,
  photos,
  stallsByAisle,
}: {
  aisles: CatalogueAisle[];
  aisle: string | null;
  sort: CatalogueSort;
  photos: Record<string, ProductPhoto>;
  stallsByAisle?: Record<string, ProductsAtlasStallPreview[]>;
}) {
  const { featured, rest } = splitAisles(aisles);
  const breakfastOn = aisle === BREAKFAST_ID;

  return (
    <section
      id="aisles"
      aria-label="Market aisles and categories"
      className="scroll-mt-header mt-8 bg-card ring-1 ring-board"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-board bg-secondary px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="stall-chip-sm flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <CrateMark className="size-5" />
          </span>
          <div>
            <p className="type-kicker text-muted-foreground">
              Shop farmers&apos; markets by product crate — fuelled by your cravings
            </p>
            <h2>Market Aisles &amp; Crates</h2>
          </div>
        </div>

        {aisle != null ? (
          <Link
            href={productsBrowseHref(null, sort)}
            className="stall-chip-sm inline-flex items-center bg-card px-3 py-1.5 text-sm font-medium text-stamp ring-1 ring-border hover:bg-secondary"
          >
            Show all aisles
          </Link>
        ) : null}
      </div>

      {/* 6 Featured Aisle Crates */}
      <div className="p-4 sm:p-5">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => {
            const active = aisle === item.id;
            const photo = photos[item.id] ?? null;
            const totalStallListings = item.pages.reduce((sum, p) => sum + p.vendors, 0);
            const sampleStalls = stallsByAisle?.[item.id] ?? [];

            return (
              <li
                key={item.id}
                className={cn(
                  "flex flex-col justify-between bg-card ring-1 transition-colors",
                  active ? "ring-2 ring-primary" : "ring-board",
                )}
              >
                <div>
                  <Link
                    href={productsBrowseHref(item.id, sort)}
                    aria-current={active ? "true" : undefined}
                    className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    <div className="relative">
                      <ProductPhotoFrame
                        name={item.label}
                        photo={photo}
                        decorative
                        className="aspect-[16/9] w-full border-b border-border"
                      />
                      <span
                        className={cn(
                          "stall-chip-sm type-nums absolute top-2.5 right-2.5 px-2.5 py-0.5 text-sm font-medium",
                          active
                            ? "bg-stamp text-chalk"
                            : "bg-board/90 text-chalk ring-1 ring-black/20",
                        )}
                      >
                        {item.pages.length} {item.pages.length === 1 ? "guide" : "guides"}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="group-hover:text-primary group-hover:underline">
                          {item.label}
                        </h3>
                        <span className="type-nums text-sm font-medium text-primary">
                          {totalStallListings} stall listings
                        </span>
                      </div>
                      {item.line && item.line !== item.label ? (
                        <p className="mt-1 text-sm text-muted-foreground">{item.line}</p>
                      ) : null}
                    </div>
                  </Link>

                  {/* Top Product Links Inside This Aisle Crate */}
                  <div className="border-t border-dashed border-border bg-receipt px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {item.pages.slice(0, 4).map((page) => (
                        <Link
                          key={page.slug}
                          href={`/find/${page.slug}`}
                          className="inline-flex items-center gap-1 rounded bg-card px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                        >
                          <span>{page.term.replace(/^General\s+/i, "")}</span>
                          <span className="type-nums text-muted-foreground">
                            ({page.vendors})
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sample Stalls or Browse Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/45 px-4 py-2.5 text-sm">
                  {sampleStalls.length > 0 ? (
                    <span className="text-muted-foreground">
                      Stalls:{" "}
                      <Link
                        href={`/vendors/${sampleStalls[0]!.slug}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {sampleStalls[0]!.name}
                      </Link>
                      {sampleStalls.length > 1 ? ` +${sampleStalls.length - 1}` : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Toronto market stalls</span>
                  )}
                  <Link
                    href={productsBrowseHref(item.id, sort)}
                    className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span>Open crate</span>
                    <CaretRightMark className="size-3" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Full Category & Aisle Filter Strip */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="type-kicker mr-1 font-medium text-foreground">All aisles:</span>
            <Link
              href={productsBrowseHref(null, sort)}
              aria-current={aisle == null ? "true" : undefined}
              className={cn(
                "stall-chip-sm inline-flex h-8 items-center px-3 text-sm font-medium transition-colors",
                aisle == null
                  ? "bg-primary text-primary-foreground"
                  : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              All products
            </Link>
            <Link
              href={productsBrowseHref(BREAKFAST_ID, sort)}
              aria-current={breakfastOn ? "true" : undefined}
              className={cn(
                "stall-chip-sm inline-flex h-8 items-center gap-1.5 px-3 text-sm font-medium transition-colors",
                breakfastOn
                  ? "bg-stamp text-chalk"
                  : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              <span>Breakfast staples</span>
            </Link>
            {featured.map((item) => {
              const active = aisle === item.id;
              const photo = photos[item.id] ?? null;
              return (
                <Link
                  key={`chip-${item.id}`}
                  href={productsBrowseHref(item.id, sort)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "stall-chip-sm inline-flex h-8 items-center gap-1.5 py-1 pr-3 pl-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                  )}
                >
                  <ProductThumb src={photo?.url} size="xs" />
                  <span>{item.label}</span>
                  <span
                    className={cn(
                      "type-nums",
                      active ? "text-primary-foreground/85" : "text-muted-foreground",
                    )}
                  >
                    ({item.pages.length})
                  </span>
                </Link>
              );
            })}
            {rest.map((item) => {
              const active = aisle === item.id;
              const photo = photos[item.id] ?? null;
              return (
                <Link
                  key={item.id}
                  href={productsBrowseHref(item.id, sort)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "stall-chip-sm inline-flex h-8 items-center gap-1.5 py-1 pr-3 pl-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                  )}
                >
                  <ProductThumb src={photo?.url} size="xs" />
                  <span>{item.label}</span>
                  <span
                    className={cn(
                      "type-nums",
                      active ? "text-primary-foreground/85" : "text-muted-foreground",
                    )}
                  >
                    ({item.pages.length})
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
