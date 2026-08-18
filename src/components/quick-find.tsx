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
  const chips: Array<{ href: string; label: string; tone?: "open" | "day" }> = [
    { href: "/search?openNow=1", label: "Open now", tone: "open" },
    { href: "/search?weekday=6", label: "Saturday", tone: "day" },
  ];
  if (today >= 0 && today !== 6) {
    chips.splice(1, 0, {
      href: `/search?weekday=${today}`,
      label: `Today (${WEEKDAYS[today]})`,
      tone: "day",
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
      <form
        action="/search"
        className="flex flex-col gap-2 rounded-md bg-card p-3 ring-1 ring-primary/20 sm:flex-row sm:items-stretch"
      >
        <label className="sr-only" htmlFor="home-search">
          Search for a market, vendor, or city
        </label>
        <Input
          id="home-search"
          name="q"
          type="search"
          placeholder="Example: Halifax, peaches, or St. Lawrence"
          className="h-12 bg-background text-base"
          autoComplete="off"
        />
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 px-6 text-base")}>
          Search
        </button>
      </form>
      <p className="mt-3 text-base text-muted-foreground">Shortcuts — gold means open right now</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.href + chip.label}
            href={chip.href}
            className={cn(
              buttonVariants({ variant: chip.tone === "open" ? "default" : "outline" }),
              "h-10 px-3 text-base",
              chip.tone === "open" && "bg-ticket text-[#fbf8ef] hover:bg-ticket/90",
              chip.tone === "day" && "border-ticket/50 bg-panel-open text-foreground hover:bg-panel-open"
            )}
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
