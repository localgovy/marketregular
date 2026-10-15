import Link from "next/link";
import { countLabel } from "@/lib/format";
import type { CatalogueAisle } from "@/lib/product-catalogue";

export function ProductDirectory({ aisles }: { aisles: CatalogueAisle[] }) {
  return (
    <section id="directory" className="scroll-mt-header mt-12 border-t border-border pt-6">
      <h2>Every product</h2>
      <p className="mt-2 text-base text-muted-foreground">The full list. Open an aisle.</p>
      <div className="mt-4 border-t border-border">
        {aisles.map((aisle) => (
          <details key={aisle.id} className="border-b border-border">
            <summary className="flex cursor-pointer items-baseline justify-between gap-3 py-3 text-base font-medium">
              <span>{aisle.label}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {countLabel(aisle.pages.length, "product", "products")}
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
