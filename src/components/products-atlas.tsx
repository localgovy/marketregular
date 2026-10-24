import Link from "next/link";
import {
  BlocksMark,
  CaretRightMark,
  CrateMark,
  PlateMark,
  RulesMark,
  TagMark,
  WeekMark,
} from "@/components/marks";
import { ProductAisles } from "@/components/product-aisles";
import {
  ProductCatalogue,
  type AisleChoice,
  type CatalogueCard,
} from "@/components/product-catalogue";
import { ProductDirectory } from "@/components/product-directory";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { StallEmblem, VendorHitList } from "@/components/product-results";
import { ProductSearchForm } from "@/components/product-search-form";
import { SortableProductHits } from "@/components/product-sort-list";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { VerifiedName } from "@/components/verified-stamp";
import type { DirectoryCensus } from "@/lib/data/catalog";
import type { ProductPhoto } from "@/lib/data/product-photos";
import { formatPrice } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import { productsBrowseHref, type CatalogueSort } from "@/lib/product-browse-href";
import type { CatalogueAisle } from "@/lib/product-catalogue";
import type { ProductHit, VendorHit } from "@/lib/product-hits";
import type {
  ProductsAtlasSpotlight,
  ProductsAtlasStallPreview,
} from "@/lib/products-atlas-data";
import { cn } from "@/lib/utils";

function formatCensus(n: number) {
  return n.toLocaleString("en-CA");
}

export function ProductsAtlas({
  q,
  openToday,
  marketSlug,
  day,
  aisle,
  sort,
  filtersNeedQuery,
  today,
  halls,
  products,
  shops,
  aisles,
  cards,
  choices,
  heading,
  aislePhotos,
  census,
  openNowCount,
  sellingTodayCount,
  spotlight,
  stallsByAisle,
  featuredStalls,
}: {
  q: string;
  openToday: boolean;
  marketSlug: string | null;
  day: number | null;
  aisle: string | null;
  sort: CatalogueSort;
  filtersNeedQuery: boolean;
  today: number;
  halls: { slug: string; name: string }[];
  products: ProductHit[];
  shops: VendorHit[];
  aisles: CatalogueAisle[];
  cards: CatalogueCard[];
  choices: AisleChoice[];
  heading: { title: string; blurb: string };
  aislePhotos: Record<string, ProductPhoto>;
  census: DirectoryCensus;
  openNowCount: number;
  sellingTodayCount: number;
  spotlight: ProductsAtlasSpotlight;
  stallsByAisle: Record<string, ProductsAtlasStallPreview[]>;
  featuredStalls: ProductsAtlasStallPreview[];
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
      {/* Top Category & Live Market Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={productsBrowseHref(null, sort)}
            className={cn(
              "stall-chip-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              !q && aisle == null
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
            )}
          >
            <TagMark
              className={cn(
                "size-3.5",
                !q && aisle == null ? "text-primary-foreground" : "text-primary",
              )}
            />
            <span>All products</span>
          </Link>
          {aisles.slice(0, 4).map((item) => {
            const active = !q && aisle === item.id;
            return (
              <Link
                key={item.id}
                href={productsBrowseHref(item.id, sort)}
                className={cn(
                  "stall-chip-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                )}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {openNowCount > 0 ? (
            <Link href="/markets/open-today" className="inline-flex items-center hover:underline">
              <NowLabel>
                <span>
                  <span className="type-nums">{openNowCount}</span>{" "}
                  {openNowCount === 1 ? "market open now" : "markets open now"}
                </span>
              </NowLabel>
            </Link>
          ) : sellingTodayCount > 0 ? (
            <Link
              href="/markets/open-today"
              className="stall-chip-sm inline-flex items-center gap-1.5 bg-card px-3 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <WeekMark className="size-3.5 text-primary" />
              <span>{sellingTodayCount} stalls active today</span>
            </Link>
          ) : null}
          <Link
            href="/markets"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>See this week&apos;s markets</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Above-the-Fold Dual-Plate Masthead */}
      <section className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* Left 7 Cols: Forest-Green Product Search & Census Plate */}
        <div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground ring-1 ring-board lg:col-span-7">
          <div>
            <p className="type-kicker text-primary-foreground/90">
              {LAUNCH_CITY} market catalogue · Stalls, prices &amp; weekly hours
            </p>
            <h1 className="mt-1 text-primary-foreground">
              {q ? `${q} at ${LAUNCH_CITY} farmers' markets` : "Products"}
            </h1>
            <p className="type-lede mt-2 max-w-2xl text-primary-foreground/95">
              Search what the stalls sell, or start from a category. Each product opens the
              vendors who list it and the markets where they set up.
            </p>

            <ProductSearchForm
              q={q}
              openToday={openToday}
              marketSlug={marketSlug}
              day={day}
              markets={halls}
              tone="plate"
            />

            {filtersNeedQuery ? (
              <p className="mt-3 rounded bg-primary-foreground/15 px-3 py-2 text-base text-primary-foreground">
                Add a product name to use selling today, a market, or a day.
              </p>
            ) : null}
          </div>

          {/* 3-Stamp Directory Census Strip */}
          <div className="mt-6 border-t border-primary-foreground/15 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(census.menus)}
                </p>
                <p className="text-sm text-primary-foreground/85">Menu items</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(census.vendors)}
                </p>
                <p className="text-sm text-primary-foreground/85">Market stalls</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(census.markets)}
                </p>
                <p className="text-sm text-primary-foreground/85">Toronto markets</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Active Aisle / Craving Spotlight Plate */}
        <div className="flex flex-col justify-between bg-card ring-1 ring-board lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-receipt px-5 py-3">
              <div className="flex items-center gap-2">
                <PlateMark className="size-4 text-primary" />
                <p className="type-kicker font-medium text-foreground">{spotlight.label}</p>
              </div>
              <span className="stall-chip-sm type-nums bg-stamp px-2.5 py-0.5 text-sm font-medium text-chalk">
                {spotlight.guideCount} {spotlight.guideCount === 1 ? "guide" : "guides"}
              </span>
            </div>

            <div className="p-5">
              <ProductPhotoFrame
                name={spotlight.label}
                photo={spotlight.photo}
                className="aspect-[16/9] w-full border border-border"
              />

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {spotlight.blurb}
              </p>

              {/* Top Product Guides in This Spotlight */}
              {spotlight.topGuides.length > 0 ? (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {spotlight.topGuides.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/find/${g.slug}`}
                      className="inline-flex items-center gap-1 rounded bg-receipt px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                    >
                      <span>{g.term}</span>
                      <span className="type-nums text-muted-foreground">({g.vendors})</span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {/* Featured Stalls Preview */}
              {spotlight.featuredStalls.length > 0 ? (
                <div className="mt-4 bg-receipt p-3.5 ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]">
                  <p className="type-kicker text-primary">Stalls selling these items</p>
                  <ul className="mt-2 divide-y divide-dashed divide-border">
                    {spotlight.featuredStalls.slice(0, 2).map((stall) => {
                      const price = formatPrice(stall.priceCents);
                      return (
                        <li
                          key={stall.slug}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 first:pt-0 last:pb-0"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <StallEmblem
                              src={stall.logoUrl}
                              name={stall.name}
                              kind="vendor"
                              size="sm"
                              tone="paper"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/vendors/${stall.slug}`}
                                className="block text-sm font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {stall.name}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {stall.itemName}
                                {stall.marketName ? ` · ${stall.marketName}` : ""}
                              </p>
                            </div>
                          </div>
                          {price ? (
                            <span className="stall-chip-sm type-nums bg-stamp px-2 py-0.5 text-sm font-medium text-chalk">
                              {price}
                            </span>
                          ) : (
                            <Link
                              href={`/vendors/${stall.slug}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              Menu →
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-receipt px-5 py-3 text-sm">
            <span className="font-medium text-muted-foreground">Ready to browse:</span>
            <a
              href={q ? "#search-results" : "#products"}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <span>{q ? "Jump to search results" : "Jump to product catalogue"}</span>
              <CaretRightMark className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      {q ? (
        /* Search Results Mode: 12-Col Split Workspace */
        <div
          id="search-results"
          className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start"
        >
          {/* Left 8 Columns: Matching Product Items */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-card px-5 py-3.5 ring-1 ring-board">
              <div className="flex items-center gap-2.5">
                <CrateMark className="size-5 text-primary" />
                <h2>Products matching &ldquo;{q}&rdquo;</h2>
              </div>
              <Link
                href="/products"
                className="stall-chip-sm inline-flex items-center bg-secondary px-3 py-1.5 text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground"
              >
                Browse categories
              </Link>
            </div>

            {products.length ? (
              <SortableProductHits
                hits={products}
                today={today}
                page={{ q, openToday, marketSlug, day }}
              />
            ) : (
              <div className="bg-card p-6 ring-1 ring-board">
                <p className="text-base font-medium text-foreground">
                  No products match that search.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a broader term or jump directly to one of our popular product guides below.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {spotlight.topGuides.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/find/${g.slug}`}
                      className="stall-chip-sm inline-flex items-center gap-1.5 bg-receipt px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                    >
                      <span>{g.term}</span>
                      <span className="type-nums text-muted-foreground">({g.vendors})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Columns: Matching Vendors & Category Guides Rail */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-4">
            <section className="bg-card ring-1 ring-board">
              <div className="flex items-center justify-between gap-2 border-b border-black/15 bg-primary px-5 py-3.5 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <RulesMark className="size-4 text-primary-foreground" />
                  <h2 className="text-xl text-primary-foreground">Vendors</h2>
                </div>
                <span className="stall-chip-sm type-nums bg-board/80 px-2.5 py-0.5 text-sm font-medium text-chalk">
                  {shops.length}
                </span>
              </div>

              <div className="p-4">
                {shops.length ? (
                  <VendorHitList vendors={shops} />
                ) : (
                  <p className="text-base text-muted-foreground">
                    No other vendors match that name.
                  </p>
                )}
              </div>
            </section>

            {/* Popular Product Guides Card */}
            <div className="bg-card p-5 ring-1 ring-board">
              <p className="type-kicker text-primary">Curated product guides</p>
              <h3 className="mt-0.5">Browse by category</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Compare every stall that lists a staple across {LAUNCH_CITY} farmers&apos; markets.
              </p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {aisles.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    href={productsBrowseHref(item.id, sort)}
                    className="inline-flex items-center gap-1 rounded bg-receipt px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                  >
                    <span>{item.label}</span>
                    <span className="type-nums text-muted-foreground">
                      ({item.pages.length})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* Catalogue Browse Mode */
        <>
          <ProductAisles
            aisles={aisles}
            aisle={aisle}
            sort={sort}
            photos={aislePhotos}
            stallsByAisle={stallsByAisle}
          />

          <ProductCatalogue
            key={`${aisle ?? "all"}-${sort}`}
            pages={cards}
            choices={choices}
            aisle={aisle}
            sort={sort}
            title={heading.title}
            blurb={heading.blurb}
          />

          {/* Featured Stalls With Published Menus Band */}
          {featuredStalls.length > 0 ? (
            <section
              aria-label="Featured stalls with published menus"
              className="mt-8 bg-card p-5 ring-1 ring-board sm:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
                <div>
                  <p className="type-kicker text-primary">Stalls &amp; signature items</p>
                  <h2 className="mt-0.5">Stalls with published menus &amp; prices</h2>
                </div>
                <Link
                  href="/markets#directory-vendors"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <span>Browse all {formatCensus(census.vendors)} stalls</span>
                  <CaretRightMark className="size-3.5" />
                </Link>
              </div>

              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredStalls.slice(0, 6).map((stall) => {
                  const price = formatPrice(stall.priceCents);
                  return (
                    <li
                      key={stall.slug}
                      className="flex flex-col justify-between bg-receipt p-4 ring-1 ring-board shadow-[inset_3px_0_0_var(--primary)]"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex min-w-0 items-start gap-3">
                            <StallEmblem
                              src={stall.logoUrl}
                              name={stall.name}
                              kind="vendor"
                              size="md"
                              tone="paper"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/vendors/${stall.slug}`}
                                className="block text-base font-medium text-foreground hover:text-primary hover:underline"
                              >
                                <VerifiedName slug={stall.slug} name={stall.name} />
                              </Link>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {stall.badge}
                              </p>
                            </div>
                          </div>
                          <SaveButton
                            kind="vendor"
                            slug={stall.slug}
                            name={stall.name}
                            size="sm"
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border pt-3">
                          <Link
                            href={stall.itemHref}
                            className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {stall.itemName}
                          </Link>
                          {price ? (
                            <span className="stall-chip-sm type-nums bg-stamp px-2.5 py-0.5 text-sm font-medium text-chalk">
                              {price}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {stall.marketName && stall.marketSlug ? (
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-sm">
                          <Link
                            href={`/markets/${stall.marketSlug}`}
                            className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-primary hover:underline"
                          >
                            <BlocksMark className="size-3.5 text-primary" />
                            <span>{stall.marketName}</span>
                          </Link>
                          <Link
                            href={`/vendors/${stall.slug}#menu`}
                            className="font-medium text-primary hover:underline"
                          >
                            Stall menu →
                          </Link>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <ProductDirectory aisles={aisles} />

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-4 ring-1 ring-board">
            <p className="text-base text-muted-foreground">
              Planning a market visit this week? Inspect every hall&apos;s hours, map, and vendor
              roster.
            </p>
            <Link
              href="/markets"
              className="stall-chip inline-flex h-10 items-center gap-2 bg-primary px-5 text-base font-medium text-primary-foreground hover:brightness-110"
            >
              <span>See this week&apos;s markets</span>
              <CaretRightMark className="size-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
