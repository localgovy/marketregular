import Link from "next/link";
import { findPagesByCategory } from "@/data/find-pages";

const chip =
  "stall-chip-sm inline-flex h-8 items-center bg-secondary px-2.5 text-sm font-medium text-foreground hover:bg-foreground/10";

export function ProductBrowse() {
  const groups = findPagesByCategory();
  return (
    <section id="products" className="mt-12 scroll-mt-28 border-t border-border pt-6">
      <h2 className="type-column">Browse by product</h2>
      {groups.map((group) => (
        <div key={group.id} className="mt-4">
          <p className="type-kicker text-muted-foreground">{group.label}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {group.pages.map((page) => (
              <Link key={page.slug} href={`/find/${page.slug}`} className={chip}>
                {page.term}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
