import Link from "next/link";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { productsBrowseHref, type CatalogueSort } from "@/lib/product-browse-href";
import { BREAKFAST_ID, splitAisles, type CatalogueAisle } from "@/lib/product-catalogue";
import type { ProductPhoto } from "@/lib/data/product-photos";
import { cn } from "@/lib/utils";

const chip = "stall-chip-sm inline-flex h-8 items-center px-2.5 text-sm font-medium";

function tileClass(active: boolean) {
  return cn(
    "block h-full border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
    active ? "border-primary" : "border-border",
  );
}

export function ProductAisles({
  aisles,
  aisle,
  sort,
  photos,
}: {
  aisles: CatalogueAisle[];
  aisle: string | null;
  sort: CatalogueSort;
  photos: Record<string, ProductPhoto>;
}) {
  const { featured, rest } = splitAisles(aisles);
  const breakfastOn = aisle === BREAKFAST_ID;

  return (
    <section id="aisles" className="scroll-mt-header mt-12 border-t border-border pt-6">
      <h2>Aisles</h2>
      <p className="mt-2 text-base text-muted-foreground">
        Shop farmers&apos; markets by product instead, fuelled by your cravings
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {featured.map((item) => {
          const active = aisle === item.id;
          const photo = photos[item.id] ?? null;
          return (
            <li key={item.id}>
              <Link
                href={productsBrowseHref(item.id, sort)}
                aria-current={active ? "true" : undefined}
                className={tileClass(active)}
              >
                {photo ? null : <span className="sr-only">{item.label}</span>}
                <ProductPhotoFrame name={item.label} photo={photo} decorative />
                {photo || (item.line && item.line !== item.label) ? (
                  <span className="block p-2.5">
                    {photo ? <span className="type-column block">{item.label}</span> : null}
                    {item.line && item.line !== item.label ? (
                      <span className={cn("block text-sm text-muted-foreground", photo && "mt-1")}>
                        {item.line}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link
          href={productsBrowseHref(null, sort)}
          aria-current={aisle == null ? "true" : undefined}
          className={cn(
            chip,
            aisle == null ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-foreground/10",
          )}
        >
          All products
        </Link>
        <Link
          href={productsBrowseHref(BREAKFAST_ID, sort)}
          aria-current={breakfastOn ? "true" : undefined}
          className={cn(
            chip,
            breakfastOn ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-foreground/10",
          )}
        >
          Breakfast
        </Link>
        {rest.map((item) => {
          const active = aisle === item.id;
          return (
            <Link
              key={item.id}
              href={productsBrowseHref(item.id, sort)}
              aria-current={active ? "true" : undefined}
              className={cn(
                chip,
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-foreground/10",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
