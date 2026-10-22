import Link from "next/link";
import { CaretDownMark } from "@/components/marks";
import { countLabel } from "@/lib/format";
import type { CatalogueAisle } from "@/lib/product-catalogue";

export function ProductDirectory({ aisles }: { aisles: CatalogueAisle[] }) {
  return (
    <section id="directory" className="scroll-mt-header mt-12 border-t border-border pt-6">
      <h2>Every product</h2>
      <p className="mt-2 text-base text-muted-foreground">The full list. Open a category.</p>
      <div className="mt-4 border-t border-border">
        {aisles.map((aisle) => (
          <details key={aisle.id} className="border-b border-border">
            <summary className="cursor-pointer list-none py-3 text-base font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex items-baseline justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <CaretDownMark className="directory-caret size-3.5 shrink-0 text-muted-foreground transition-transform" />
                  {aisle.label}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {countLabel(aisle.pages.length, "product", "products")}
                </span>
              </span>
            </summary>
            <ul className="grid gap-x-6 pb-4 sm:grid-cols-2 lg:grid-cols-3">
              {aisle.pages.map((page) => (
                <li key={page.slug} className="py-1">
                  <Link href={`/find/${page.slug}`} className="text-base hover:underline">
                    {page.term}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
