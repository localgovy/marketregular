import Link from "next/link";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRODUCT_TAGS, WEEKDAYS, provinceName } from "@/lib/constants";

function weekdayInToronto() {
  const name = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    timeZone: "America/Toronto",
  }).format(new Date());
  return WEEKDAYS.findIndex((d) => d === name);
}

export function QuickFind({
  cities,
  provinces,
  tags,
}: {
  cities: string[];
  provinces: string[];
  tags: string[];
}) {
  const today = weekdayInToronto();
  const chips: Array<{ href: string; label: string }> = [
    { href: "/search?openNow=1", label: "Open now" },
    { href: "/search?weekday=6", label: "Saturday" },
  ];
  if (today >= 0 && today !== 6) {
    chips.splice(1, 0, {
      href: `/search?weekday=${today}`,
      label: `Today · ${WEEKDAYS[today]}`,
    });
  }
  for (const code of provinces.slice(0, 4)) {
    chips.push({ href: `/search?province=${code}`, label: provinceName(code) });
  }
  for (const city of cities.slice(0, 5)) {
    chips.push({ href: `/search?city=${encodeURIComponent(city)}`, label: city });
  }
  const preferred = PRODUCT_TAGS.filter((t) => tags.includes(t));
  const shownTags = (preferred.length ? preferred : PRODUCT_TAGS).slice(0, 8);
  for (const tag of shownTags) {
    chips.push({
      href: `/search?tag=${encodeURIComponent(tag)}`,
      label: tag.replaceAll("-", " "),
    });
  }

  return (
    <div>
      <form action="/search" className="flex gap-2">
        <Input
          name="q"
          type="search"
          placeholder="Market, vendor, city, tomato…"
          className="bg-card"
          autoComplete="off"
        />
        <button type="submit" className={cn(buttonVariants(), "shrink-0")}>
          Find
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <Link
            key={chip.href + chip.label}
            href={chip.href}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 capitalize",
            )}
          >
            {chip.label}
          </Link>
        ))}
        <Link
          href="/search"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7")}
        >
          All filters
        </Link>
      </div>
    </div>
  );
}
