"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { countLabel } from "@/lib/format";
import { productsBrowseHref, type CatalogueSort } from "@/lib/product-browse-href";
import { cn } from "@/lib/utils";

const FIRST = 6;
const MORE = 9;

export type CatalogueCard = {
  term: string;
  slug: string;
  categoryLabel: string;
  imageUrl: string | null;
  imageAlt: string | null;
};

export type AisleChoice = {
  id: string | null;
  label: string;
};

const SORTS: { id: CatalogueSort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "name", label: "A to Z" },
];

export function ProductCatalogue({
  pages,
  choices,
  aisle,
  sort,
  title,
  blurb,
}: {
  pages: CatalogueCard[];
  choices: AisleChoice[];
  aisle: string | null;
  sort: CatalogueSort;
  title: string;
  blurb: string;
}) {
  const [limit, setLimit] = useState(FIRST);
  const shown = pages.slice(0, limit);

  return (
    <section id="products" className="scroll-mt-header mt-12 border-t border-border pt-6">
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav aria-label="Browse by category" className="flex flex-wrap gap-x-4 gap-y-2 lg:flex-col lg:gap-1">
          {choices.map((choice) => {
            const active = aisle === choice.id;
            return (
              <Link
                key={choice.id ?? "all"}
                href={productsBrowseHref(choice.id, sort)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "text-base hover:underline",
                  active ? "font-medium" : "text-muted-foreground",
                )}
              >
                {choice.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 min-w-0 lg:mt-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2>{title}</h2>
            <form action="/products" className="inline-flex items-baseline gap-1.5 text-sm text-muted-foreground">
              {aisle ? <input type="hidden" name="aisle" value={aisle} /> : null}
              <label>
                <span>Sort by</span>{" "}
                <select
                  name="sort"
                  aria-label="Sort by"
                  defaultValue={sort}
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  className="bg-transparent font-medium text-foreground"
                >
                  {SORTS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </form>
          </div>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">{blurb}</p>
          {shown.length ? (
            <ul className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
              {shown.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/find/${page.slug}`}
                    className="block h-full border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    <ProductPhotoFrame
                      name={page.term}
                      decorative
                      photo={
                        page.imageUrl
                          ? { url: page.imageUrl, alt: page.imageAlt ?? "" }
                          : null
                      }
                    />
                    <span className="block p-3">
                      {page.categoryLabel !== page.term ? (
                        <span className="block text-sm text-muted-foreground">{page.categoryLabel}</span>
                      ) : null}
                      <h3 className="sr-only">{page.term}</h3>
                      <span
                        aria-hidden
                        className={cn(
                          "block text-base font-medium",
                          page.categoryLabel !== page.term ? "mt-2" : undefined,
                        )}
                      >
                        {page.term}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-base text-muted-foreground">No products in that category.</p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {countLabel(pages.length, "product", "products")}
          </p>
          {limit < pages.length ? (
            <button
              type="button"
              onClick={() => setLimit((current) => current + MORE)}
              className="mt-3 text-base font-medium hover:underline"
            >
              Show more
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
