import Link from "next/link";
import { CATEGORIES, DAY_SLUGS, dayName } from "@/lib/landing";
import { tagLabel } from "@/lib/tag-label";
import { cn } from "@/lib/utils";

const CATEGORY_TAGS = new Set(CATEGORIES.map((category) => category.tag));

const link = "text-base font-medium hover:underline";

/**
 * Contextual links out of a listing: the days this hall or stall actually works, and the
 * categories it actually carries. Narrower than a chip wall, and it gives the day and
 * category pages a relevant inbound link from every listing in the directory.
 */
export function ListingAlsoLinks({
  weekdays,
  tags,
  className,
  heading = "More like this",
}: {
  weekdays: number[];
  tags: string[];
  className?: string;
  heading?: string;
}) {
  const days = [...new Set(weekdays)]
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  const categories = tags.filter((tag) => CATEGORY_TAGS.has(tag)).slice(0, 6);

  if (!days.length && !categories.length) return null;

  return (
    <section className={cn("border-t border-border pt-6", className)}>
      <h2 className="type-column">{heading}</h2>
      {days.length ? (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {days.map((day) => (
            <Link key={day} href={`/markets/day/${DAY_SLUGS[day]}`} className={link}>
              {dayName(day)} markets
            </Link>
          ))}
          <Link href="/markets/open-today" className={link}>
            Open today
          </Link>
        </p>
      ) : null}
      {categories.length ? (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {categories.map((tag) => (
            <Link key={tag} href={`/markets/tag/${tag}`} className={link}>
              {tagLabel(tag)}
            </Link>
          ))}
        </p>
      ) : null}
    </section>
  );
}
