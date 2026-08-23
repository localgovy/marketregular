"use client";

import Link from "next/link";
import { Hours } from "@/components/hours";
import { NowLabel } from "@/components/now-label";
import { ProductTag } from "@/components/product-tag";
import { SaveButton } from "@/components/save-button";
import type { VendorTodayRow, VendorWeekPick } from "@/lib/vendor-week";

type WeekPlace = VendorWeekPick["where"][number];

function groupWhereByDay(where: WeekPlace[]) {
  const groups: Array<{ when: string; places: WeekPlace[] }> = [];
  for (const place of where) {
    const last = groups.at(-1);
    if (last?.when === place.when) last.places.push(place);
    else groups.push({ when: place.when, places: [place] });
  }
  return groups;
}

function andSep(index: number, total: number) {
  if (index === 0) return null;
  if (index === total - 1) return total > 2 ? ", and " : " and ";
  return ", ";
}

function MarketAndList({ places }: { places: WeekPlace[] }) {
  return places.map((place, i) => (
    <span key={place.marketSlug}>
      {andSep(i, places.length)}
      <Link
        href={`/markets/${place.marketSlug}`}
        className="font-medium text-ticket-ink underline underline-offset-2 hover:text-foreground"
      >
        {place.marketName}
      </Link>
    </span>
  ));
}

export function VendorTodayItem({ row }: { row: VendorTodayRow }) {
  return (
    <li className="flex items-start gap-2 border-b border-border px-3 py-3 last:border-b-0">
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
          {row.open ? <NowLabel>Selling now</NowLabel> : null}
          <Hours value={row.hours} className="text-muted-foreground" />
        </span>
        {row.tags.length ? (
          <ul className="flex flex-wrap gap-1">
            {row.tags.slice(0, 2).map((tag) => (
              <ProductTag key={tag} tag={tag} />
            ))}
          </ul>
        ) : null}
      </Link>
      <span className="shrink-0 pt-0.5">
        <SaveButton kind="vendor" slug={row.vendorSlug} name={row.vendorName} />
      </span>
    </li>
  );
}

export function VendorWeekItem({
  pick,
  index,
}: {
  pick: VendorWeekPick;
  index: number;
}) {
  return (
    <li className="flex gap-3 border-b border-border px-3 py-3 last:border-b-0">
      <span className="w-5 shrink-0 pt-0.5 font-mono text-sm text-muted-foreground">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <Link href={`/vendors/${pick.vendorSlug}`} className="text-base font-medium hover:underline">
          {pick.vendorName}
        </Link>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
          {groupWhereByDay(pick.where).map((group, gi) => (
            <span key={group.when}>
              {gi > 0 ? " · " : null}
              {group.when} at <MarketAndList places={group.places} />
            </span>
          ))}
        </span>
      </span>
      <span className="shrink-0 self-start">
        <SaveButton kind="vendor" slug={pick.vendorSlug} name={pick.vendorName} />
      </span>
    </li>
  );
}
