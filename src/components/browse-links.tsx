import Link from "next/link";
import { siteCopy } from "@/content/site-copy";
import { CATEGORIES, DAY_SLUGS, dayName } from "@/lib/landing";
import { tagLabel } from "@/lib/tag-label";
import { cn } from "@/lib/utils";

const chip =
  "stall-chip-sm inline-flex h-8 items-center bg-secondary px-2.5 text-sm font-medium text-foreground hover:bg-foreground/10";

/**
 * The day and category pages only rank if the directory links to them. This block is
 * that link, on `/markets` and on every market listing.
 */
export function BrowseLinks({
  className,
  exceptDay,
  exceptTag,
}: {
  className?: string;
  exceptDay?: number;
  exceptTag?: string;
}) {
  const days = DAY_SLUGS.map((slug, weekday) => ({ slug, weekday })).filter(
    (day) => day.weekday !== exceptDay,
  );
  const categories = CATEGORIES.filter((category) => category.tag !== exceptTag);

  return (
    <section className={cn("border-t border-border pt-6", className)}>
      <h2 className="type-column">{siteCopy["/markets"].browseAnotherWay}</h2>
      <p className="type-kicker mt-1 text-muted-foreground">{siteCopy["/markets"].byDay}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Link href="/markets/open-today" className={chip}>
          {siteCopy["/markets"].openToday}
        </Link>
        {days.map((day) => (
          <Link key={day.slug} href={`/markets/day/${day.slug}`} className={chip}>
            {dayName(day.weekday)}
          </Link>
        ))}
      </div>
      <p className="type-kicker mt-4 text-muted-foreground">{siteCopy["/markets"].byWhatTheySell}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {categories.map((category) => (
          <Link key={category.tag} href={`/markets/tag/${category.tag}`} className={chip}>
            {tagLabel(category.tag)}
          </Link>
        ))}
      </div>
    </section>
  );
}
