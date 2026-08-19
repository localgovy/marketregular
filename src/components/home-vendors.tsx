import Link from "next/link";
import { Award, Store } from "lucide-react";
import { HomePanel } from "@/components/home-panel";
import { SaveButton } from "@/components/save-button";
import type { VendorTodayRow, VendorWeekPick } from "@/lib/vendor-week";

function tagLine(tags: string[]) {
  return tags
    .slice(0, 2)
    .map((tag) => tag.replaceAll("-", " "))
    .join(" · ");
}

function SellingNowMark() {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle stall-chip-sm bg-ticket px-2 py-1 text-sm text-receipt">
      <span className="live-dot size-1.5 rounded-full bg-receipt" aria-hidden />
      Selling now
    </span>
  );
}

export function VendorsTodayPanel({ rows }: { rows: VendorTodayRow[] }) {
  return (
    <HomePanel
      id="vendors-today"
      tone="vendors"
      icon={Store}
      kicker="On a stall today"
      title="Vendors selling today"
      how={
        <>
          Who is on a Toronto stall today.{" "}
          <SellingNowMark /> is what you see when they are at their stall this minute. Tap a
          name for the menu.
        </>
      }
      action={<span>{rows.length} today</span>}
    >
      {rows.length ? (
        <ul className="rounded-md ring-1 ring-border">
          {rows.map((row) => (
            <li
              key={`${row.vendorSlug}-${row.marketSlug}`}
              className="flex items-stretch border-b border-border last:border-b-0"
            >
              <Link
                href={`/vendors/${row.vendorSlug}`}
                className="grid min-w-0 flex-1 grid-cols-1 items-start gap-x-3 gap-y-1 px-3 py-3 hover:bg-primary/[0.045] sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <span className="min-w-0">
                  <span className="block text-base font-medium">{row.vendorName}</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="text-foreground/80">{row.marketName}</span>
                    {row.stall ? ` · ${row.stall}` : null}
                    {tagLine(row.tags) ? ` · ${tagLine(row.tags)}` : null}
                  </span>
                </span>
                <span className="shrink-0 text-left sm:text-right">
                  {row.open ? (
                    <span className="flex flex-col items-start gap-1 sm:items-end">
                      <SellingNowMark />
                      <span className="font-mono text-sm whitespace-nowrap tabular-nums text-muted-foreground">
                        {row.hours}
                      </span>
                    </span>
                  ) : (
                    <span className="font-mono text-sm whitespace-nowrap tabular-nums text-muted-foreground">
                      {row.hours}
                    </span>
                  )}
                </span>
              </Link>
              <span className="flex items-center pr-2">
                <SaveButton kind="vendor" slug={row.vendorSlug} name={row.vendorName} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">
          No vendors are on the calendar for today. See this week&apos;s markets above.
        </p>
      )}
    </HomePanel>
  );
}

export function VendorsWeekPanel({ picks }: { picks: VendorWeekPick[] }) {
  return (
    <HomePanel
      id="vendors-week"
      tone="menus"
      icon={Award}
      kicker="This week's stalls"
      title="Top 5 vendors this week"
      how="The five vendors in the Toronto market game this week. Tap a name to learn more about them."
    >
      {picks.length ? (
        <ol className="overflow-hidden rounded-md ring-1 ring-border">
          {picks.map((pick, index) => (
            <li
              key={pick.vendorSlug}
              className="flex gap-3 border-b border-border px-3 py-3 last:border-b-0"
            >
              <span className="w-5 shrink-0 pt-0.5 font-mono text-sm text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <Link href={`/vendors/${pick.vendorSlug}`} className="text-base font-medium hover:underline">
                  {pick.vendorName}
                </Link>
                {pick.about ? (
                  <span className="mt-0.5 line-clamp-1 block text-sm text-muted-foreground">
                    {pick.about}
                  </span>
                ) : null}
                <span className="mt-1 block text-sm text-muted-foreground">
                  {pick.where.map((place, i) => (
                    <span key={`${place.when}-${place.marketSlug}`}>
                      {i > 0 ? " · " : null}
                      {place.when} at{" "}
                      <Link href={`/markets/${place.marketSlug}`} className="hover:underline">
                        {place.marketName}
                      </Link>
                    </span>
                  ))}
                </span>
              </span>
              <span className="shrink-0 self-start">
                <SaveButton kind="vendor" slug={pick.vendorSlug} name={pick.vendorName} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-base text-muted-foreground">
          We do not have vendor days for this week yet.
        </p>
      )}
    </HomePanel>
  );
}
