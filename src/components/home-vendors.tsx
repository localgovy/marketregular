"use client";

import { useState } from "react";
import Link from "next/link";
import { HomePanel } from "@/components/home-panel";
import { Hours } from "@/components/hours";
import { CrateMark, TallyMark } from "@/components/marks";
import { SaveButton } from "@/components/save-button";
import { tagLabel } from "@/lib/find-paths";
import type { VendorTodayRow, VendorWeekPick } from "@/lib/vendor-week";

const TODAY_STALL_CAP = 20;

function SellingNowMark() {
  return (
    <span className="bg-ticket px-1.5 py-0.5 text-sm text-receipt">
      Selling now
    </span>
  );
}

export function VendorsTodayPanel({ rows }: { rows: VendorTodayRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const capped = rows.length > TODAY_STALL_CAP && !showAll;
  const visible = capped ? rows.slice(0, TODAY_STALL_CAP) : rows;

  return (
    <HomePanel
      id="vendors-today"
      place="rail"
      tone="vendors"
      icon={CrateMark}
      kicker="On a stall today"
      title="Selling today"
      how={
        <>
          Tap a name for the menu.
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <SellingNowMark />
            <span>At the stall this minute.</span>
          </span>
        </>
      }
      action={<span>{rows.length}</span>}
    >
      {rows.length ? (
        <ul className="ring-1 ring-border">
          {visible.map((row) => (
            <li
              key={`${row.vendorSlug}-${row.marketSlug}`}
              className="flex items-start gap-2 border-b border-border px-3 py-3 last:border-b-0"
            >
              <Link
                href={`/vendors/${row.vendorSlug}`}
                className="grid min-w-0 flex-1 gap-1 hover:text-primary"
              >
                <span className="text-base font-medium">{row.vendorName}</span>
                <span className="text-sm text-muted-foreground">
                  {row.marketName}
                  {row.stall ? ` · ${row.stall}` : null}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {row.open ? <SellingNowMark /> : null}
                  <Hours value={row.hours} className="text-muted-foreground" />
                </span>
                {row.tags.length ? (
                  <ul className="flex flex-wrap gap-1">
                    {row.tags.slice(0, 2).map((tag) => (
                      <li
                        key={tag}
                        className="bg-secondary px-1.5 py-0.5 text-sm text-muted-foreground"
                      >
                        {tagLabel(tag)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Link>
              <span className="shrink-0 pt-0.5">
                <SaveButton kind="vendor" slug={row.vendorSlug} name={row.vendorName} />
              </span>
            </li>
          ))}
          {capped ? (
            <li className="border-border">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full px-3 py-3 text-left text-base font-medium text-primary hover:bg-muted"
              >
                See all {rows.length}
              </button>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
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
      place="rail"
      tone="menus"
      icon={TallyMark}
      kicker="This week's stalls"
      title="Top 5 this week"
      how="The five vendors in the Toronto market game this week. Tap a name to learn more about them."
    >
      {picks.length ? (
        <ol className="ring-1 ring-border">
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
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {pick.where.map((place, i) => (
                    <span key={`${place.when}-${place.marketSlug}`}>
                      {i > 0 ? " · " : null}
                      {place.when} at{" "}
                      <Link
                        href={`/markets/${place.marketSlug}`}
                        className="font-medium text-ticket underline underline-offset-2 hover:text-ticket/80"
                      >
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
