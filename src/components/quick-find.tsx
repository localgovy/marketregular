import Link from "next/link";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WEEKDAYS } from "@/lib/constants";

function weekdayInToronto() {
  const name = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    timeZone: "America/Toronto",
  }).format(new Date());
  return WEEKDAYS.findIndex((d) => d === name);
}

export function QuickFind({ tags = [] }: { tags?: string[] }) {
  const today = weekdayInToronto();
  const tomorrow = (today + 1) % 7;
  const chips: Array<{ href: string; label: string; tone?: "open" | "day" }> = [
    { href: "/search?openNow=1", label: "Open now", tone: "open" },
  ];
  if (today >= 0) {
    chips.push({
      href: `/search?weekday=${today}`,
      label: `Today (${WEEKDAYS[today]})`,
      tone: "day",
    });
    chips.push({
      href: `/search?weekday=${tomorrow}`,
      label: `Tomorrow (${WEEKDAYS[tomorrow]})`,
      tone: "day",
    });
  }
  if (today !== 6) {
    chips.push({ href: "/search?weekday=6", label: "Saturday", tone: "day" });
  }
  if (today !== 0) {
    chips.push({ href: "/search?weekday=0", label: "Sunday", tone: "day" });
  }
  for (const tag of tags.slice(0, 4)) {
    chips.push({
      href: `/search?tag=${encodeURIComponent(tag)}`,
      label: tag.replaceAll("-", " "),
    });
  }

  return (
    <div>
      <form
        action="/search"
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
      >
        <label className="sr-only" htmlFor="home-search">
          Search for a Toronto market, vendor, or neighbourhood
        </label>
        <Input
          id="home-search"
          name="q"
          type="search"
          placeholder="Example: Wychwood, peaches, or St. Lawrence"
          className="h-12 bg-background text-base"
          autoComplete="off"
        />
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 px-6 text-base")}>
          Search
        </button>
      </form>
      <p className="mt-3 text-base text-muted-foreground">Shortcuts</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.href + chip.label}
            href={chip.href}
            className={cn(
              buttonVariants({ variant: chip.tone === "open" ? "default" : "outline" }),
              "h-10 px-3 text-base",
              chip.tone === "open" && "bg-ticket text-receipt hover:bg-ticket/90"
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
