import Link from "next/link";
import { Award, Store } from "lucide-react";
import { HomePanel } from "@/components/home-panel";
import { KeepButton } from "@/components/keep-button";
import type { VendorTodayRow, VendorWeekPick } from "@/lib/vendor-week";

function tagLine(tags: string[]) {
  return tags
    .slice(0, 2)
    .map((tag) => tag.replaceAll("-", " "))
    .join(" · ");
}

export function VendorsTodayPanel({ rows }: { rows: VendorTodayRow[] }) {
  return (
    <HomePanel
      id="vendors-today"
      tone="vendors"
      icon={Store}
      kicker="On a stall today"
      title="Vendors selling today"
      how="Who is on a Toronto stall today. Gold means they are selling right now. Tap a name for the menu."
      action={<span>{rows.length} today</span>}
    >
      {rows.length ? (
        <ul className="overflow-hidden rounded-md ring-1 ring-border">
          {rows.map((row) => (
            <li
              key={`${row.vendorSlug}-${row.marketSlug}`}
              className="flex items-stretch border-b border-border last:border-b-0"
            >
              <Link
                href={`/vendors/${row.vendorSlug}`}
                className="flex min-w-0 flex-1 items-start justify-between gap-3 px-3 py-3 hover:bg-primary/[0.045]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium">{row.vendorName}</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="text-foreground/80">{row.marketName}</span>
                    {row.stall ? ` · ${row.stall}` : null}
                    {tagLine(row.tags) ? ` · ${tagLine(row.tags)}` : null}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {row.open ? (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-ticket px-2 py-1 text-xs font-semibold tracking-wide text-receipt uppercase">
                      <span className="live-dot size-1.5 rounded-full bg-receipt" />
                      Selling now
                    </span>
                  ) : (
                    <span className="font-mono text-sm text-muted-foreground">{row.hours}</span>
                  )}
                </span>
              </Link>
              <span className="flex items-center pr-2">
                <KeepButton kind="vendor" slug={row.vendorSlug} name={row.vendorName} />
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
      how="The five vendors on the most Toronto stall days in the next seven days. Tap a name for what they sell."
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
                <KeepButton kind="vendor" slug={pick.vendorSlug} name={pick.vendorName} />
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
