import Link from "next/link";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WEEKDAYS, provinceName } from "@/lib/constants";

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
}: {
  cities: string[];
  provinces: string[];
  tags?: string[];
}) {
  const today = weekdayInToronto();
  const chips: Array<{ href: string; label: string }> = [
    { href: "/search?openNow=1", label: "Open now" },
    { href: "/search?weekday=6", label: "Saturday" },
  ];
  if (today >= 0 && today !== 6) {
    chips.splice(1, 0, {
      href: `/search?weekday=${today}`,
      label: `Today (${WEEKDAYS[today]})`,
    });
  }
  for (const city of cities.slice(0, 5)) {
    chips.push({ href: `/search?city=${encodeURIComponent(city)}`, label: city });
  }
  for (const code of provinces.slice(0, 3)) {
    chips.push({ href: `/search?province=${code}`, label: provinceName(code) });
  }

  return (
    <div>
      <form action="/search" className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="home-search">
          Search for a market, vendor, or city
        </label>
        <Input
          id="home-search"
          name="q"
          type="search"
          placeholder="Example: Halifax, peaches, or St. Lawrence"
          className="h-11 bg-card text-base"
          autoComplete="off"
        />
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "shrink-0")}>
          Search
        </button>
      </form>
      <p className="mt-3 text-base text-muted-foreground">Shortcuts</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.href + chip.label}
            href={chip.href}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 px-3 text-base")}
          >
            {chip.label}
          </Link>
        ))}
        <Link href="/search" className={cn(buttonVariants({ variant: "ghost" }), "h-10 px-3 text-base")}>
          More search options
        </Link>
      </div>
    </div>
  );
}
